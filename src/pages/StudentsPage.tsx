import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadAttendance, updateStudents } from '../services/attendanceService'
import { useUiStore } from '../store/uiStore'
import type { Student } from '../types/domain'

export function StudentsPage() {
  const { classId = '' } = useParams()
  const pushToast = useUiStore((state) => state.pushToast)
  const [students, setStudents] = useState<Student[]>([])
  const [savingId, setSavingId] = useState('')
  const [savedId, setSavedId] = useState('')

  useEffect(() => {
    void loadAttendance(classId, undefined, 'admin-1').then((data) => setStudents(data.students))
  }, [classId])

  async function handleChange(
    id: string,
    field: 'name' | 'roll_number' | 'parent_phone' | 'active',
    value: string | number | boolean,
  ) {
    const next = students.map((student) =>
      student.id === id ? { ...student, [field]: value } : student,
    )
    setStudents(next)
    const changed = next.find((student) => student.id === id)
    if (!changed) {
      return
    }
    setSavingId(id)
    await updateStudents(classId, [
      {
        id: changed.id,
        name: changed.name,
        roll_number: changed.roll_number,
        parent_phone: changed.parent_phone,
        active: changed.active,
      },
    ])
    setSavingId('')
    setSavedId(id)
    pushToast({
      title: 'Student updated',
      description: `${changed.name} was saved successfully.`,
      tone: 'success',
    })
    window.setTimeout(() => setSavedId((current) => (current === id ? '' : current)), 1600)
  }

  return (
    <main className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-card">
      <h1 className="text-2xl font-semibold text-slate-900">Students</h1>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="sticky top-0 bg-white/95 backdrop-blur">
            <tr className="text-left text-xs uppercase tracking-[0.24em] text-slate-400">
              <th className="px-3 py-2">Roll</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/70">
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={student.roll_number}
                    onChange={(event) =>
                      void handleChange(student.id, 'roll_number', Number(event.target.value))
                    }
                    className="w-20 rounded-xl border border-slate-200 px-3 py-2"
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    value={student.name}
                    onChange={(event) => void handleChange(student.id, 'name', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    value={student.parent_phone}
                    onChange={(event) =>
                      void handleChange(student.id, 'parent_phone', event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={student.active}
                    onChange={(event) => void handleChange(student.id, 'active', event.target.checked)}
                    className="h-5 w-5 rounded"
                  />
                </td>
                <td className="px-3 py-3">
                  {savingId === student.id ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Saving...</span>
                  ) : savedId === student.id ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Saved</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Idle</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
