import type { AttendanceRecord, AttendanceStatus } from '../../types/domain'

export function AttendanceFooter({
  counts,
  attendance,
  onSubmit,
  disabled,
  loading,
  dirty,
}: {
  counts: Record<AttendanceStatus, number>
  attendance: AttendanceRecord
  onSubmit: () => void
  disabled: boolean
  loading: boolean
  dirty: boolean
}) {
  return (
    <footer className="sticky bottom-3 mt-4 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-card backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Counter label="Present" value={counts.P} />
          <Counter label="Absent" value={counts.A} />
          <Counter label="Late" value={counts.L} />
          <Counter label="Leave" value={counts.LV} />
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onSubmit}
          className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? 'Saving...' : attendance.submitted_at ? 'Update' : 'Submit'}
        </button>
      </div>
      {dirty && !loading && (
        <p className="mt-3 text-sm text-amber-700">Unsaved changes. Press {attendance.submitted_at ? 'Update' : 'Submit'} to save.</p>
      )}
    </footer>
  )
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
