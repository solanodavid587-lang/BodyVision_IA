import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Measurement } from '../../types'

import type { BodyWidth } from './bodyWidths'

export type CaptureData = {
  image: HTMLCanvasElement
  mask: Uint8Array
  width: number
  height: number
  cm: number
  widths: BodyWidth[]
  kg: number
}
export const localId = 'local-session'

function useStudioState() {
  const [capture, setCapture] = useState<CaptureData | null>(null)
  const [records, setRecords] = useState<Measurement[]>([])
  function add(
    metric: string,
    value: number,
    unit: string,
    method: Measurement['method'],
    previous?: Measurement,
    notes?: string,
  ) {
    const now = new Date().toISOString()
    const row = {
      id: crypto.randomUUID(),
      metric_code: metric,
      profile_id: localId,
      value,
      unit,
      method,
      measured_at: previous?.measured_at ?? now,
      created_at: now,
      created_by: 'local',
      supersedes_id: previous?.id ?? null,
      notes,
    }
    setRecords((list) =>
      previous && list.some((item) => item.supersedes_id === previous.id)
        ? list
        : [...list, row],
    )
  }
  function register(data: CaptureData) {
    setCapture(data)
    add('height', data.cm, 'cm', 'manual')
    add('weight', data.kg, 'kg', 'manual')
  }
  return {
    capture,
    records,
    add,
    register,
    clear: () => {
      setCapture(null)
      setRecords([])
    },
  }
}
const Context = createContext<ReturnType<typeof useStudioState> | null>(null)
export function StudioProvider({ children }: { children: ReactNode }) {
  return (
    <Context.Provider value={useStudioState()}>{children}</Context.Provider>
  )
}
export function useStudio() {
  const state = useContext(Context)
  if (!state) throw new Error('Falta la sesión local.')
  return state
}
