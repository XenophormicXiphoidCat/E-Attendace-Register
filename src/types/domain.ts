export type UserRole = 'admin' | 'teacher'
export type AttendanceMarkRole = UserRole | 'substitute'
export type AttendanceStatus = 'P' | 'A' | 'L' | 'LV'

export interface SchoolClass {
  id: string
  name: string
  teacher_id: string
  roll_count: number
  active: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  name: string
  role: UserRole
  assigned_class_id: string | null
  phone: string
  created_at: string
}

export interface Student {
  id: string
  class_id: string
  roll_number: number
  name: string
  parent_phone: string
  active: boolean
  created_at: string
}

export interface AttendanceRecord {
  id: string
  class_id: string
  date: string
  statuses: Record<string, AttendanceStatus>
  submitted_at: string | null
  editable_until: string | null
  locked: boolean
  marked_by: string
  role: AttendanceMarkRole
  created_at: string
  sms_sent_at?: string | null
}

export interface AuditLog {
  id: string
  attendance_id: string
  timestamp: string
  user_id: string
  change: string
}

export interface PushSubscriptionRecord {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export interface ReminderLog {
  id: string
  attendance_id: string | null
  class_id: string
  reminder_type: 'assembly_due' | 'draft_pending' | 'before_lock'
  sent_to: string
  created_at: string
}

export interface DashboardBundle {
  classes: SchoolClass[]
  users: UserProfile[]
  todayAttendance: AttendanceRecord[]
}

export interface AttendanceViewModel {
  schoolClass: SchoolClass
  students: Student[]
  attendance: AttendanceRecord
  markedBy: UserProfile
}
