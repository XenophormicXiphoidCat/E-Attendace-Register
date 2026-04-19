import { format } from 'date-fns'
import { displayTime } from '../../lib/utils'
import type { AttendanceViewModel } from '../../types/domain'

const legend = [
  { code: 'P', label: 'Present', color: 'bg-status-present' },
  { code: 'A', label: 'Absent', color: 'bg-status-absent' },
  { code: 'L', label: 'Late', color: 'bg-status-late' },
  { code: 'LV', label: 'Leave', color: 'bg-status-leave' },
] as const

export function AttendanceHeader({
  data,
  dirty,
  loading,
}: {
  data: AttendanceViewModel
  dirty: boolean
  loading: boolean
}) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-card backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Class {data.schoolClass.name}</p>
            <StatusPill label={data.attendance.locked ? 'Locked' : 'Editable'} tone={data.attendance.locked ? 'rose' : 'emerald'} />
            <StatusPill label={loading ? 'Saving...' : dirty ? 'Unsaved changes' : 'Saved'} tone={loading ? 'amber' : dirty ? 'amber' : 'sky'} />
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            {data.schoolClass.name} attendance register
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Teacher: {data.markedBy.name} · Marked by {data.markedBy.role === 'admin' ? 'Admin' : 'Teacher'}
          </p>
        </div>
        {data.attendance.locked ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            Attendance locked at {displayTime(data.attendance.editable_until)}
          </div>
        ) : null}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock label="Current Date" value={format(new Date(), 'dd MMM')} />
        <StatBlock label="Editable Until" value={displayTime(data.attendance.editable_until)} />
        <StatBlock label="Teacher" value={data.markedBy.name} />
        <StatBlock label="Mode" value={data.attendance.submitted_at ? 'Update window' : 'Draft'} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {legend.map((item) => (
          <div key={item.code} className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-semibold text-slate-900 ${item.color}`}>
              {item.code}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function StatusPill({
  label,
  tone,
}: {
  label: string
  tone: 'rose' | 'emerald' | 'amber' | 'sky'
}) {
  const styles = {
    rose: 'bg-rose-100 text-rose-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
  }
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[tone]}`}>{label}</span>
}
