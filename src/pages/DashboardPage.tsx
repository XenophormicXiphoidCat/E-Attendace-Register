import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { summarizeStatuses } from '../lib/utils'
import { loadDashboard } from '../services/attendanceService'
import { useAuthStore } from '../store/authStore'
import type { DashboardBundle } from '../types/domain'

export function DashboardPage() {
  const currentUser = useAuthStore((state) => state.currentUser)
  const [bundle, setBundle] = useState<DashboardBundle>({ classes: [], users: [], todayAttendance: [] })

  useEffect(() => {
    void loadDashboard().then(setBundle)
  }, [])

  if (!currentUser) {
    return null
  }

  if (currentUser.role === 'teacher' && currentUser.assigned_class_id) {
    return <Navigate to={`/attendance/${currentUser.assigned_class_id}`} replace />
  }

  return (
    <main className="flex flex-1 flex-col gap-5">
      <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">Today, students, and history for every class.</p>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        {bundle.classes.map((schoolClass) => {
          const teacher = bundle.users.find((user) => user.id === schoolClass.teacher_id)
          const todayRecord = bundle.todayAttendance.find((entry) => entry.class_id === schoolClass.id)
          const counts = todayRecord ? summarizeStatuses(todayRecord.statuses) : null
          return (
            <section
              key={schoolClass.id}
              className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Class</p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-900">{schoolClass.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Teacher: {teacher?.name ?? 'Unassigned'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    todayRecord
                      ? todayRecord.locked
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {todayRecord ? (todayRecord.locked ? 'Locked today' : 'Marked today') : 'Ready to mark'}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <MiniStat label="Present" value={counts?.P ?? 0} />
                <MiniStat label="Absent" value={counts?.A ?? 0} />
                <MiniStat label="Late" value={counts?.L ?? 0} />
                <MiniStat label="Leave" value={counts?.LV ?? 0} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Link to={`/attendance/${schoolClass.id}`} className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white">
                  Open Today
                </Link>
                <Link to={`/students/${schoolClass.id}`} className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-900">
                  Students
                </Link>
                <Link to={`/history/${schoolClass.id}`} className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-900">
                  History
                </Link>
              </div>
            </section>
          )
        })}
      </section>
    </main>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
