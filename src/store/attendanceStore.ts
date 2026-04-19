import { create } from 'zustand'
import {
  getAttendanceCounts,
  loadAttendance,
  submitAttendance,
  unlockAttendance,
} from '../services/attendanceService'
import { nextStatus } from '../lib/utils'
import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceViewModel,
  Student,
} from '../types/domain'

interface AttendanceState {
  data: AttendanceViewModel | null
  counts: Record<AttendanceStatus, number>
  loading: boolean
  dirty: boolean
  error: string
  baselineStatuses: Record<string, AttendanceStatus>
  load: (classId: string, actorId: string, date?: string) => Promise<void>
  toggleStatus: (student: Student, actorId: string) => void
  setManyStatuses: (studentIds: string[], status: AttendanceStatus, actorId: string) => void
  resetDraft: () => void
  submit: (actorId: string, role: AttendanceRecord['role']) => Promise<boolean>
  unlock: (actorId: string) => Promise<boolean>
}

const initialCounts: Record<AttendanceStatus, number> = {
  P: 0,
  A: 0,
  L: 0,
  LV: 0,
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  data: null,
  counts: initialCounts,
  loading: false,
  dirty: false,
  error: '',
  baselineStatuses: {},
  load: async (classId, actorId, date) => {
    set({ loading: true, error: '' })
    try {
      const data = await loadAttendance(classId, date, actorId)
      const counts = getAttendanceCounts(data.students, data.attendance.statuses)
      set({
        data,
        counts,
        loading: false,
        dirty: false,
        error: '',
        baselineStatuses: { ...data.attendance.statuses },
      })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load attendance.',
      })
    }
  },
  toggleStatus: (student, actorId) => {
    const state = get()
    if (!state.data || !student.active || state.data.attendance.locked) {
      return
    }

    const current = state.data.attendance.statuses[student.id] ?? 'P'
    const updated = nextStatus(current)
    const nextStatuses = { ...state.data.attendance.statuses, [student.id]: updated }
    const nextData = {
      ...state.data,
      attendance: { ...state.data.attendance, statuses: nextStatuses, marked_by: actorId },
    }
    const counts = getAttendanceCounts(state.data.students, nextStatuses)
    set({ data: nextData, counts, dirty: true })
  },
  setManyStatuses: (studentIds, status, actorId) => {
    const state = get()
    if (!state.data || state.data.attendance.locked) {
      return
    }

    const nextStatuses = { ...state.data.attendance.statuses }
    for (const id of studentIds) {
      nextStatuses[id] = status
    }

    const nextData = {
      ...state.data,
      attendance: { ...state.data.attendance, statuses: nextStatuses, marked_by: actorId },
    }

    set({
      data: nextData,
      counts: getAttendanceCounts(state.data.students, nextStatuses),
      dirty: true,
    })
  },
  resetDraft: () => {
    const state = get()
    if (!state.data) {
      return
    }
    const restoredStatuses = { ...state.baselineStatuses }
    set({
      data: {
        ...state.data,
        attendance: { ...state.data.attendance, statuses: restoredStatuses },
      },
      counts: getAttendanceCounts(state.data.students, restoredStatuses),
      dirty: false,
      error: '',
    })
  },
  submit: async (actorId, role) => {
    const state = get()
    if (!state.data) {
      return false
    }
    set({ loading: true, error: '' })
    try {
      const attendance = await submitAttendance(
        state.data.attendance,
        state.data.schoolClass.id,
        state.data.attendance.date,
        actorId,
        role,
      )
      set({
        data: { ...state.data, attendance },
        counts: getAttendanceCounts(state.data.students, attendance.statuses),
        dirty: false,
        loading: false,
        error: '',
        baselineStatuses: { ...attendance.statuses },
      })
      return true
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to save attendance.',
      })
      return false
    }
  },
  unlock: async (actorId) => {
    const state = get()
    if (!state.data) {
      return false
    }
    set({ loading: true, error: '' })
    try {
      const attendance = await unlockAttendance(state.data.attendance.id, actorId)
      set({
        data: { ...state.data, attendance },
        dirty: false,
        loading: false,
        error: '',
        baselineStatuses: { ...attendance.statuses },
      })
      return true
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to unlock attendance.',
      })
      return false
    }
  },
}))
