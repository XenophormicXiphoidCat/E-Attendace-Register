import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AttendanceCard } from '../components/attendance/AttendanceCard'
import { AttendanceFooter } from '../components/attendance/AttendanceFooter'
import { AttendanceHeader } from '../components/attendance/AttendanceHeader'
import { getStatusLabel } from '../lib/utils'
import { ensureBrowserNotificationPermission, notifyBrowser } from '../services/notificationService'
import { useAuthStore } from '../store/authStore'
import { useAttendanceStore } from '../store/attendanceStore'
import { useUiStore } from '../store/uiStore'
import type { AttendanceStatus } from '../types/domain'

type FilterMode = 'all' | 'issues' | AttendanceStatus

export function AttendancePage() {
  const { classId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const date = searchParams.get('date') ?? undefined
  const currentUser = useAuthStore((state) => state.currentUser)
  const pushToast = useUiStore((state) => state.pushToast)
  const { data, counts, load, toggleStatus, setManyStatuses, resetDraft, submit, unlock, error, loading, dirty } =
    useAttendanceStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const sentReminderKeys = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!currentUser) {
      return
    }
    void load(classId, currentUser.id, date)
  }, [classId, currentUser, load, date])

  useEffect(() => {
    if (!currentUser) {
      return
    }
    void ensureBrowserNotificationPermission()
  }, [currentUser])

  useEffect(() => {
    if (!error) {
      return
    }
    pushToast({ title: 'Attendance action failed', description: error, tone: 'error' })
  }, [error, pushToast])

  useEffect(() => {
    if (!data || data.attendance.locked) {
      return
    }

    const now = Date.now()
    const reminderTimers: number[] = []
    const reminderKeyBase = `${data.schoolClass.id}-${data.attendance.date}`

    function sendReminder(reminderKey: string, title: string, description: string, tone: 'warning' | 'info') {
      if (sentReminderKeys.current.has(reminderKey)) {
        return
      }
      sentReminderKeys.current.add(reminderKey)
      pushToast({ title, description, tone })
      void notifyBrowser(title, description, reminderKey)
    }

    if (dirty && !data.attendance.submitted_at) {
      reminderTimers.push(
        window.setTimeout(() => {
          const description = `Draft for class ${data.schoolClass.name} has changes that are not submitted yet.`
          sendReminder(`${reminderKeyBase}-draft-pending`, 'Draft not submitted', description, 'warning')
        }, 2 * 60 * 1000),
      )
    }

    if (!data.attendance.submitted_at) {
      const assemblyDue = new Date(`${data.attendance.date}T08:15:00`).getTime()
      const delay = assemblyDue - now
      if (delay <= 0) {
        const description = `Attendance for ${data.schoolClass.name} is still not submitted after assembly.`
        sendReminder(`${reminderKeyBase}-assembly-due`, 'Attendance pending', description, 'warning')
      } else {
        reminderTimers.push(
          window.setTimeout(() => {
            const description = `Attendance for ${data.schoolClass.name} is still not submitted after assembly.`
            sendReminder(`${reminderKeyBase}-assembly-due`, 'Attendance pending', description, 'warning')
          }, delay),
        )
      }
    }

    if (data.attendance.editable_until) {
      const beforeLock = new Date(data.attendance.editable_until).getTime() - 5 * 60 * 1000
      const delay = beforeLock - now
      if (delay > 0) {
        reminderTimers.push(
          window.setTimeout(() => {
            const description = `Class ${data.schoolClass.name} locks in 5 minutes.`
            sendReminder(`${reminderKeyBase}-before-lock`, 'Attendance lock reminder', description, 'info')
          }, delay),
        )
      }
    }

    return () => {
      reminderTimers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [data, dirty, pushToast])

  const visibleStudents = useMemo(() => {
    const students = data?.students ?? []
    const statuses = data?.attendance.statuses ?? {}

    return students.filter((student) => {
      const status = statuses[student.id] ?? 'P'
      const matchesQuery =
        query.trim().length === 0 ||
        student.name.toLowerCase().includes(query.toLowerCase()) ||
        String(student.roll_number).includes(query.trim())

      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'issues'
            ? status === 'A' || status === 'L' || status === 'LV'
            : status === filter

      return matchesQuery && matchesFilter
    })
  }, [data, filter, query])

  const studentGrid = useMemo(
    () => Array.from({ length: 40 }, (_, index) => visibleStudents[index] ?? null),
    [visibleStudents],
  )

  if (!currentUser) {
    return null
  }

  if (currentUser.role === 'teacher' && currentUser.assigned_class_id !== classId) {
    return <Navigate to={`/attendance/${currentUser.assigned_class_id}`} replace />
  }

  if (!data) {
    return <main className="flex-1 rounded-3xl bg-white/85 p-6 shadow-card">Loading attendance...</main>
  }

  const disabled = data.attendance.locked
  const actingRole = currentUser.role === 'admin' ? 'substitute' : 'teacher'
  const safeUser = currentUser
  const safeData = data

  function applyBulkStatus(status: AttendanceStatus) {
    const ids = visibleStudents.filter((student) => student.active).map((student) => student.id)
    if (ids.length === 0) {
      pushToast({ title: 'No matching students', description: 'Change the filter or search to apply a bulk action.', tone: 'info' })
      return
    }
    setManyStatuses(ids, status, safeUser.id)
    pushToast({
      title: `${getStatusLabel(status)} applied`,
      description: `Updated ${ids.length} visible students.`,
      tone: 'success',
    })
  }

  async function handleSubmit() {
    const success = await submit(safeUser.id, actingRole)
    if (success) {
      pushToast({
        title: safeData.attendance.submitted_at ? 'Attendance updated' : 'Attendance submitted',
        description: `${safeData.schoolClass.name} attendance is now saved.`,
        tone: 'success',
      })
    }
  }

  async function handleUnlock() {
    const success = await unlock(safeUser.id)
    if (success) {
      pushToast({
        title: 'Attendance unlocked',
        description: `${safeData.schoolClass.name} is editable again for 90 minutes.`,
        tone: 'success',
      })
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4">
      <AttendanceHeader data={safeData} dirty={dirty} loading={loading} />
      <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-card">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="w-full md:max-w-sm">
              <span className="mb-2 block text-sm font-medium text-slate-700">Search student or roll</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or roll number"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {(['all', 'issues', 'A', 'L', 'LV'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    filter === option ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {option === 'all'
                    ? 'All'
                    : option === 'issues'
                      ? 'Issues'
                      : getStatusLabel(option)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyBulkStatus('P')}
              className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800"
            >
              Mark visible present
            </button>
            <button
              type="button"
              onClick={() => applyBulkStatus('A')}
              className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-800"
            >
              Mark visible absent
            </button>
            <button
              type="button"
              onClick={() => resetDraft()}
              disabled={!dirty}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Reset unsaved changes
            </button>
            <span className="rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800">
              Showing {visibleStudents.length} of {safeData.students.length} students
            </span>
          </div>
        </div>
      </section>
      <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-card">
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
          {studentGrid.map((student, index) => (
            <AttendanceCard
              key={student?.id ?? `empty-${index}`}
              student={student}
              status={student ? safeData.attendance.statuses[student.id] : undefined}
              disabled={disabled}
              onClick={student ? () => void toggleStatus(student, safeUser.id) : undefined}
            />
          ))}
        </div>
      </section>
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {safeUser.role === 'admin' && safeData.attendance.locked && (
        <button
          type="button"
          onClick={() => void handleUnlock()}
          className="self-start rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-900"
        >
          Unlock Attendance
        </button>
      )}
      <AttendanceFooter
        counts={counts}
        attendance={safeData.attendance}
        disabled={disabled || loading}
        loading={loading}
        dirty={dirty}
        onSubmit={() => void handleSubmit()}
      />
    </main>
  )
}
