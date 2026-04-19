import { cn, getStatusLabel } from '../../lib/utils'
import type { AttendanceStatus, Student } from '../../types/domain'

const cardColor: Record<AttendanceStatus, string> = {
  P: 'bg-status-present',
  A: 'bg-status-absent',
  L: 'bg-status-late',
  LV: 'bg-status-leave',
}

export function AttendanceCard({
  student,
  status,
  onClick,
  disabled,
}: {
  student: Student | null
  status?: AttendanceStatus
  onClick?: () => void
  disabled?: boolean
}) {
  if (!student) {
    return <div className="aspect-square rounded-3xl bg-status-empty/80" />
  }

  const inactive = !student.active
  const displayStatus = inactive ? null : status ?? 'P'
  const activeColor = displayStatus ? cardColor[displayStatus] : 'bg-status-empty'
  return (
    <button
      type="button"
      disabled={disabled || inactive}
      onClick={onClick}
      className={cn(
        'flex aspect-square min-h-[84px] flex-col items-center justify-between rounded-3xl border border-white/70 p-3 text-center shadow-sm transition duration-200',
        inactive ? 'cursor-not-allowed bg-status-empty text-slate-400' : `${activeColor} active:scale-[0.98]`,
        disabled && !inactive ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <span className="line-clamp-1 text-[11px] font-medium sm:text-xs">{student.name}</span>
      <div className="flex flex-col items-center gap-1">
        <span className="text-3xl font-bold leading-none">{String(student.roll_number).padStart(2, '0')}</span>
        <span className="text-lg font-black tracking-[0.2em] text-slate-900">{displayStatus ?? '--'}</span>
      </div>
      <span className="text-xs font-semibold">{displayStatus ? getStatusLabel(displayStatus) : 'Inactive'}</span>
    </button>
  )
}
