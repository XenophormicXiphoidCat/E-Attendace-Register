import { addMinutes, format, isAfter, parseISO } from 'date-fns'
import type { AttendanceRecord, AttendanceStatus, Student } from '../types/domain'
import { EDIT_WINDOW_MINUTES, GLOBAL_ASSEMBLY_TIME } from '../config/app'

const statusLabels: Record<AttendanceStatus, string> = {
  P: 'Present',
  A: 'Absent',
  L: 'Late',
  LV: 'Leave',
}

const statusCycle: AttendanceStatus[] = ['P', 'A', 'L', 'LV']

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function getStatusLabel(status: AttendanceStatus) {
  return statusLabels[status]
}

export function nextStatus(status: AttendanceStatus): AttendanceStatus {
  const index = statusCycle.indexOf(status)
  return statusCycle[(index + 1) % statusCycle.length]
}

export function buildDefaultStatuses(students: Student[]) {
  return students.reduce<Record<string, AttendanceStatus>>((acc, student) => {
    if (student.active) {
      acc[student.id] = 'P'
    }
    return acc
  }, {})
}

export function countStatuses(
  students: Student[],
  statuses: Record<string, AttendanceStatus>,
) {
  return students.reduce(
    (acc, student) => {
      if (!student.active) {
        return acc
      }
      const status = statuses[student.id] ?? 'P'
      acc[status] += 1
      return acc
    },
    { P: 0, A: 0, L: 0, LV: 0 },
  )
}

export function displayDate(date: string) {
  return format(parseISO(`${date}T00:00:00`), 'dd MMM')
}

export function displayTime(value: string | null) {
  if (!value) {
    return '--:--'
  }
  return format(parseISO(value), 'HH:mm')
}

export function ensureLockState(attendance: AttendanceRecord) {
  if (!attendance.editable_until) {
    return attendance
  }
  return {
    ...attendance,
    locked: attendance.locked || isAfter(new Date(), parseISO(attendance.editable_until)),
  }
}

export function computeEditableUntil(baseIso: string) {
  return addMinutes(parseISO(baseIso), EDIT_WINDOW_MINUTES).toISOString()
}

export function getAssemblyDueMoment(referenceDate: string) {
  return parseISO(`${referenceDate}T${GLOBAL_ASSEMBLY_TIME}:00`)
}

export function formatSmsStatus(status: AttendanceStatus) {
  if (status === 'LV') {
    return 'leave'
  }
  return statusLabels[status].toLowerCase()
}

export function summarizeStatuses(statuses: Record<string, AttendanceStatus>) {
  return Object.values(statuses).reduce(
    (acc, status) => {
      acc[status] += 1
      return acc
    },
    { P: 0, A: 0, L: 0, LV: 0 } as Record<AttendanceStatus, number>,
  )
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(','),
    )
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
