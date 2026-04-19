import { describe, expect, it } from 'vitest'
import { buildDefaultStatuses, countStatuses, nextStatus } from './utils'
import type { Student } from '../types/domain'

const students: Student[] = [
  {
    id: '1',
    class_id: 'class',
    roll_number: 1,
    name: 'Student 1',
    parent_phone: '',
    active: true,
    created_at: '',
  },
  {
    id: '2',
    class_id: 'class',
    roll_number: 2,
    name: 'Student 2',
    parent_phone: '',
    active: true,
    created_at: '',
  },
]

describe('attendance utils', () => {
  it('cycles status in required order', () => {
    expect(nextStatus('P')).toBe('A')
    expect(nextStatus('A')).toBe('L')
    expect(nextStatus('L')).toBe('LV')
    expect(nextStatus('LV')).toBe('P')
  })

  it('counts default present statuses', () => {
    const statuses = buildDefaultStatuses(students)
    expect(countStatuses(students, statuses)).toEqual({ P: 2, A: 0, L: 0, LV: 0 })
  })
})
