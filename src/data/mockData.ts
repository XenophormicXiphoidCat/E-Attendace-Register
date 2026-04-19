import { buildDefaultStatuses } from '../lib/utils'
import type {
  AttendanceRecord,
  AuditLog,
  SchoolClass,
  Student,
  UserProfile,
} from '../types/domain'

const today = new Date().toISOString().slice(0, 10)
const now = new Date().toISOString()

export const mockUsers: UserProfile[] = [
  {
    id: 'admin-1',
    name: 'Admin One',
    role: 'admin',
    assigned_class_id: null,
    phone: '+910000000001',
    created_at: now,
  },
  {
    id: 'teacher-1',
    name: 'Vivaswan Pandey',
    role: 'teacher',
    assigned_class_id: 'class-9a',
    phone: '+910000000002',
    created_at: now,
  },
]

export const mockClasses: SchoolClass[] = [
  {
    id: 'class-9a',
    name: '10M',
    teacher_id: 'teacher-1',
    roll_count: 40,
    active: true,
    created_at: now,
  },
  {
    id: 'class-9b',
    name: '9B',
    teacher_id: 'teacher-1',
    roll_count: 40,
    active: true,
    created_at: now,
  },
]

const firstNames = ['Rahul', 'Anita', 'Kiran', 'Meera', 'Rohan', 'Sneha', 'Vivek', 'Asha', 'Nikhil', 'Pooja']

function createStudents(prefix: string, classId: string) {
  return Array.from({ length: 40 }, (_, index) => {
    const roll = index + 1
    return {
      id: `student-${prefix}-${roll}`,
      class_id: classId,
      roll_number: roll,
      name: `${prefix === '9a' ? firstNames[index % firstNames.length] : 'Student'} ${roll}`,
      parent_phone: `+919999999${String(roll).padStart(2, '0')}`,
      active: prefix === '9a' ? roll !== 40 : true,
      created_at: now,
    } satisfies Student
  })
}

export const mockStudents = createStudents('9a', 'class-9a')
export const mockStudents9B = createStudents('9b', 'class-9b')

export const initialAttendance: AttendanceRecord[] = [
  {
    id: 'attendance-9a-today',
    class_id: 'class-9a',
    date: today,
    statuses: buildDefaultStatuses(mockStudents),
    submitted_at: null,
    editable_until: null,
    locked: false,
    marked_by: 'teacher-1',
    role: 'teacher',
    created_at: now,
    sms_sent_at: null,
  },
]

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'audit-seed-1',
    attendance_id: 'attendance-9a-today',
    timestamp: now,
    user_id: 'teacher-1',
    change: 'Initial attendance draft created',
  },
]

export function cloneAttendanceRecord(attendance: AttendanceRecord) {
  return {
    ...attendance,
    statuses: { ...attendance.statuses },
  }
}

export function createAttendanceForClass(classId: string, students: Student[], markedBy: string): AttendanceRecord {
  const createdAt = new Date().toISOString()
  return {
    id: `attendance-${classId}-${today}`,
    class_id: classId,
    date: today,
    statuses: buildDefaultStatuses(students),
    submitted_at: null,
    editable_until: null,
    locked: false,
    marked_by: markedBy,
    role: 'teacher',
    created_at: createdAt,
    sms_sent_at: null,
  }
}
