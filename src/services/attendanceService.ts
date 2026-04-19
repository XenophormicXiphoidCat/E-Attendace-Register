import { format } from 'date-fns'
import { APP_TIMEZONE, EDIT_WINDOW_MINUTES } from '../config/app'
import {
  cloneAttendanceRecord,
  createAttendanceForClass,
  initialAttendance,
  initialAuditLogs,
  mockClasses,
  mockStudents,
  mockStudents9B,
  mockUsers,
} from '../data/mockData'
import { hasSupabaseEnv, supabase } from '../lib/supabase'
import {
  buildDefaultStatuses,
  countStatuses,
  ensureLockState,
  formatSmsStatus,
} from '../lib/utils'
import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceViewModel,
  AuditLog,
  DashboardBundle,
  SchoolClass,
  Student,
  UserProfile,
} from '../types/domain'

type StudentPatch = Pick<Student, 'id' | 'name' | 'roll_number' | 'parent_phone' | 'active'>
type PublicUserRow = Omit<UserProfile, 'assigned_class_id'> & { assigned_class_id: string | null }

const memory = {
  classes: [...mockClasses],
  students: [...mockStudents, ...mockStudents9B],
  users: [...mockUsers],
  attendance: [...initialAttendance],
  auditLogs: [...initialAuditLogs],
}

async function simulate<T>(value: T, delay = 100) {
  await new Promise((resolve) => setTimeout(resolve, delay))
  return value
}

function getToday() {
  return format(new Date(), 'yyyy-MM-dd')
}

function getStudentsForClass(classId: string) {
  return memory.students
    .filter((student) => student.class_id === classId)
    .sort((a, b) => a.roll_number - b.roll_number)
}

function getUser(userId: string) {
  const user = memory.users.find((entry) => entry.id === userId)
  if (!user) {
    throw new Error('User not found')
  }
  return user
}

function upsertAudit(attendanceId: string, userId: string, change: string) {
  const entry: AuditLog = {
    id: crypto.randomUUID(),
    attendance_id: attendanceId,
    timestamp: new Date().toISOString(),
    user_id: userId,
    change,
  }
  memory.auditLogs.unshift(entry)
}

function normalizeUser(row: PublicUserRow) {
  return {
    ...row,
    assigned_class_id: row.assigned_class_id,
  } satisfies UserProfile
}

async function getCurrentProfile() {
  if (!hasSupabaseEnv || !supabase) {
    return null
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw authError
  }

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!data) {
    throw new Error('No profile found in public.users for the signed-in auth user.')
  }

  return normalizeUser(data as PublicUserRow)
}

async function maybeLockAndSendSms(attendance: AttendanceRecord) {
  const locked = ensureLockState(attendance)
  if (!locked.locked || locked.sms_sent_at) {
    return locked
  }

  const schoolClass = memory.classes.find((entry) => entry.id === locked.class_id)
  const students = getStudentsForClass(locked.class_id)
  if (!schoolClass) {
    return locked
  }

  for (const student of students) {
    const status = locked.statuses[student.id]
    if (status === 'A' || status === 'LV') {
      const message = [
        'School Attendance Alert',
        `${student.name} (${schoolClass.name}) is ${formatSmsStatus(status)} today.`,
        `Date: ${locked.date}`,
      ].join('\n')
      await sendSMS(student.parent_phone, message)
    }
  }

  const index = memory.attendance.findIndex((entry) => entry.id === locked.id)
  memory.attendance[index] = { ...locked, sms_sent_at: new Date().toISOString() }
  return memory.attendance[index]
}

async function lockAndSendSmsLive(attendance: AttendanceRecord, schoolClass: SchoolClass, students: Student[]) {
  if (!hasSupabaseEnv || !supabase) {
    return attendance
  }

  let nextRecord = attendance
  if (attendance.editable_until && ensureLockState(attendance).locked && !attendance.locked) {
    const { data: lockedRow, error: lockError } = await supabase
      .from('attendance')
      .update({ locked: true })
      .eq('id', attendance.id)
      .select('*')
      .single()

    if (lockError) {
      throw lockError
    }
    nextRecord = lockedRow as AttendanceRecord
  }

  if (nextRecord.locked && !nextRecord.sms_sent_at) {
    const targets = students.filter((student) => {
      const status = nextRecord.statuses[student.id]
      return status === 'A' || status === 'LV'
    })

    for (const student of targets) {
      const status = nextRecord.statuses[student.id]
      const message = [
        'School Attendance Alert',
        `${student.name} (${schoolClass.name}) is ${formatSmsStatus(status)} today.`,
        `Date: ${nextRecord.date}`,
      ].join('\n')
      await sendSMS(student.parent_phone, message)
    }

    const { data: smsUpdated, error: smsError } = await supabase
      .from('attendance')
      .update({ sms_sent_at: new Date().toISOString() })
      .eq('id', nextRecord.id)
      .select('*')
      .single()

    if (smsError) {
      throw smsError
    }
    nextRecord = smsUpdated as AttendanceRecord
  }

  return nextRecord
}

export async function loginAs(role: 'admin' | 'teacher') {
  if (hasSupabaseEnv && supabase) {
    throw new Error('Use email/password login when Supabase is configured.')
  }
  const user = memory.users.find((entry) => entry.role === role)
  if (!user) {
    throw new Error('No matching user')
  }
  return simulate(user)
}

export async function loginWithPassword(email: string, password: string) {
  if (!hasSupabaseEnv || !supabase) {
    throw new Error('Supabase env vars are not configured.')
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw error
  }

  return getCurrentProfile()
}

export async function restoreSession() {
  if (!hasSupabaseEnv || !supabase) {
    return null
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw error
  }
  if (!session) {
    return null
  }

  return getCurrentProfile()
}

export async function getProfileForActiveSession() {
  return getCurrentProfile()
}

export async function logoutUser() {
  if (hasSupabaseEnv && supabase) {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }
}

export async function loadDashboard(): Promise<DashboardBundle> {
  if (hasSupabaseEnv && supabase) {
    const today = getToday()
    const [
      { data: classes, error: classError },
      { data: users, error: userError },
      { data: todayAttendance, error: attendanceError },
    ] =
      await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('users').select('*').order('role').order('name'),
        supabase.from('attendance').select('*').eq('date', today),
      ])

    if (classError) {
      throw classError
    }
    if (userError) {
      throw userError
    }
    if (attendanceError) {
      throw attendanceError
    }

    return {
      classes: (classes ?? []) as SchoolClass[],
      users: (users ?? []).map((user) => normalizeUser(user as PublicUserRow)),
      todayAttendance: (todayAttendance ?? []) as AttendanceRecord[],
    }
  }

  return simulate({
    classes: memory.classes,
    users: memory.users,
    todayAttendance: memory.attendance.filter((entry) => entry.date === getToday()),
  })
}

export async function loadAttendance(
  classId: string,
  date = getToday(),
  actorId = 'teacher-1',
): Promise<AttendanceViewModel> {
  if (hasSupabaseEnv && supabase) {
    const actor = await getCurrentProfile()
    if (!actor) {
      throw new Error('No active session.')
    }

    const [{ data: schoolClass, error: classError }, { data: students, error: studentError }] =
      await Promise.all([
        supabase.from('classes').select('*').eq('id', classId).single(),
        supabase.from('students').select('*').eq('class_id', classId).order('roll_number'),
      ])

    if (classError) {
      throw classError
    }
    if (studentError) {
      throw studentError
    }

    let attendance: AttendanceRecord | null = null
    const { data: existing, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', classId)
      .eq('date', date)
      .maybeSingle()

    if (attendanceError) {
      throw attendanceError
    }

    if (existing) {
      attendance = existing as AttendanceRecord
    } else if (date === getToday()) {
      attendance = {
        id: `draft-${classId}-${date}`,
        class_id: classId,
        date,
        statuses: buildDefaultStatuses((students ?? []) as Student[]),
        submitted_at: null,
        editable_until: null,
        locked: false,
        marked_by: actor.id,
        role: actor.role === 'admin' ? 'substitute' : actor.role,
        created_at: new Date().toISOString(),
        sms_sent_at: null,
      }
    }

    if (!attendance) {
      throw new Error('Attendance does not exist for this class and date.')
    }

    attendance = await lockAndSendSmsLive(attendance, schoolClass as SchoolClass, (students ?? []) as Student[])

    const { data: markedBy, error: markedByError } = await supabase
      .from('users')
      .select('*')
      .eq('id', attendance.marked_by)
      .single()

    if (markedByError) {
      throw markedByError
    }

    return {
      schoolClass: schoolClass as SchoolClass,
      students: (students ?? []) as Student[],
      attendance,
      markedBy: normalizeUser(markedBy as PublicUserRow),
    }
  }

  const schoolClass = memory.classes.find((entry) => entry.id === classId)
  if (!schoolClass) {
    throw new Error('Class not found')
  }

  const students = getStudentsForClass(classId)
  let attendance = memory.attendance.find(
    (entry) => entry.class_id === classId && entry.date === date,
  )

  if (!attendance) {
    attendance = {
      ...createAttendanceForClass(classId, students, actorId),
      id: `draft-${classId}-${date}`,
    }
  }

  const normalized = await maybeLockAndSendSms(attendance)
  const markedBy = getUser(normalized.marked_by)
  return simulate({
    schoolClass,
    students,
    attendance: cloneAttendanceRecord(normalized),
    markedBy,
  })
}

export async function submitAttendance(
  attendance: AttendanceRecord,
  classId: string,
  date: string,
  userId: string,
  role: AttendanceRecord['role'],
) {
  if (hasSupabaseEnv && supabase) {
    const actor = await getCurrentProfile()
    if (!actor) {
      throw new Error('No active session.')
    }

    const { data: persistedData, error: persistedError } = await supabase.rpc('autosave_attendance', {
      target_class_id: classId,
      target_date: date,
      next_statuses: attendance.statuses,
      actor_id: userId,
      actor_role: actor.role === 'admin' ? 'substitute' : actor.role,
    })

    if (persistedError) {
      throw persistedError
    }

    const persisted = persistedData as AttendanceRecord

    const { data, error } = await supabase.rpc('submit_attendance', {
      target_attendance_id: persisted.id,
      actor_id: userId,
      actor_role: role,
    })

    if (error) {
      throw error
    }
    return data as AttendanceRecord
  }

  let record = memory.attendance.find((entry) => entry.id === attendance.id)
  if (!record) {
    record = {
      ...attendance,
      id: `attendance-${classId}-${date}`,
      class_id: classId,
      date,
    }
    memory.attendance.push(record)
  }
  const wasSubmitted = Boolean(record.submitted_at)
  const submittedAt = new Date().toISOString()
  record.submitted_at = record.submitted_at ?? submittedAt
  record.editable_until = new Date(
    new Date(submittedAt).getTime() + EDIT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString()
  record.statuses = { ...attendance.statuses }
  record.marked_by = userId
  record.role = role
  upsertAudit(record.id, userId, wasSubmitted ? 'Attendance updated' : 'Attendance submitted')
  return simulate(cloneAttendanceRecord(record), 120)
}

export async function unlockAttendance(attendanceId: string, userId: string) {
  if (hasSupabaseEnv && supabase) {
    const { data, error } = await supabase.rpc('unlock_attendance', {
      target_attendance_id: attendanceId,
      actor_id: userId,
    })

    if (error) {
      throw error
    }
    return data as AttendanceRecord
  }

  const record = memory.attendance.find((entry) => entry.id === attendanceId)
  if (!record) {
    throw new Error('Attendance record not found')
  }
  record.locked = false
  record.sms_sent_at = null
  const base = new Date().toISOString()
  record.editable_until = new Date(
    new Date(base).getTime() + EDIT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString()
  upsertAudit(attendanceId, userId, 'Attendance unlocked by admin')
  return simulate(cloneAttendanceRecord(record))
}

export async function updateStudents(classId: string, changes: StudentPatch[]) {
  if (hasSupabaseEnv && supabase) {
    const { data, error } = await supabase.rpc('update_students', {
      target_class_id: classId,
      payload: changes,
    })

    if (error) {
      throw error
    }
    return (data ?? []) as Student[]
  }

  for (const change of changes) {
    const student = memory.students.find((entry) => entry.id === change.id && entry.class_id === classId)
    if (!student) {
      continue
    }
    student.name = change.name
    student.roll_number = change.roll_number
    student.parent_phone = change.parent_phone
    student.active = change.active
  }
  return simulate(getStudentsForClass(classId))
}

export async function loadHistory(classId: string) {
  if (hasSupabaseEnv && supabase) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', classId)
      .order('date', { ascending: false })

    if (error) {
      throw error
    }
    return (data ?? []) as AttendanceRecord[]
  }

  return simulate(
    memory.attendance
      .filter((entry) => entry.class_id === classId)
      .sort((a, b) => b.date.localeCompare(a.date)),
  )
}

export async function loadAuditLogs(attendanceId: string) {
  if (hasSupabaseEnv && supabase) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('attendance_id', attendanceId)
      .order('timestamp', { ascending: false })

    if (error) {
      throw error
    }
    return (data ?? []) as AuditLog[]
  }

  return simulate(memory.auditLogs.filter((entry) => entry.attendance_id === attendanceId))
}

export async function sendSMS(phone: string, message: string) {
  if (hasSupabaseEnv && supabase) {
    await supabase.functions.invoke('send-sms', { body: { phone, message } })
    return
  }
  console.info('SMS', { phone, message, timezone: APP_TIMEZONE })
  await simulate(null, 40)
}

export async function savePushSubscription(subscription: PushSubscriptionJSON, userId: string) {
  if (hasSupabaseEnv && supabase) {
    await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh ?? '',
        auth: subscription.keys?.auth ?? '',
      },
      { onConflict: 'endpoint' },
    )
    return
  }
  await simulate(null, 50)
}

export function getAttendanceCounts(students: Student[], statuses: Record<string, AttendanceStatus>) {
  return countStatuses(students, statuses)
}

export function getDefaultStatuses(students: Student[]) {
  return buildDefaultStatuses(students)
}
