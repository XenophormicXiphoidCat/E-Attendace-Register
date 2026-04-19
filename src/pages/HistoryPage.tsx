import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { displayDate, downloadCsv, summarizeStatuses } from '../lib/utils'
import { loadHistory } from '../services/attendanceService'
import { useUiStore } from '../store/uiStore'
import type { AttendanceRecord } from '../types/domain'

export function HistoryPage() {
  const { classId = '' } = useParams()
  const pushToast = useUiStore((state) => state.pushToast)
  const [records, setRecords] = useState<AttendanceRecord[]>([])

  useEffect(() => {
    void loadHistory(classId).then(setRecords)
  }, [classId])

  function downloadHistory() {
    const rows: string[][] = [
      ['Date', 'Locked', 'Present', 'Absent', 'Late', 'Leave'],
      ...records.map((record) => {
        const summary = summarizeStatuses(record.statuses)
        return [
          record.date,
          record.locked ? 'Yes' : 'No',
          String(summary.P),
          String(summary.A),
          String(summary.L),
          String(summary.LV),
        ]
      }),
    ]

    downloadCsv(`attendance-history-${classId}.csv`, rows)
    pushToast({
      title: 'History exported',
      description: `Downloaded ${records.length} attendance records as CSV.`,
      tone: 'success',
    })
  }

  return (
    <main className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">History</h1>
        <button
          type="button"
          onClick={downloadHistory}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        >
          Export CSV
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {records.map((record) => (
          <Link
            key={record.id}
            to={`/attendance/${record.class_id}?date=${record.date}`}
            className="rounded-2xl bg-slate-50 px-4 py-4 text-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{displayDate(record.date)}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${record.locked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {record.locked ? 'Locked' : 'Open'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
              {Object.entries(summarizeStatuses(record.statuses)).map(([key, value]) => (
                <span key={key} className="rounded-full bg-white px-3 py-1">
                  {key} {value}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
