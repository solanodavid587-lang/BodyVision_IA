import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Measurement, Profile } from '../../types'

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
  const [captures, setCaptures] = useState<Record<string, CaptureData>>({})
  const [localProfiles, setLocalProfiles] = useState<Profile[]>([])
  const [records, setRecords] = useState<Measurement[]>([])
  function add(
    metric: string,
    value: number,
    unit: string,
    method: Measurement['method'],
    previous?: Measurement,
    notes?: string,
    profileId = localId,
  ) {
    const now = new Date().toISOString()
    const row = {
      id: crypto.randomUUID(),
      metric_code: metric,
      profile_id: profileId,
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
  function createLocalProfile(displayCode: string, displayName: string) {
    const profile: Profile = {
      id: `local-profile-${crypto.randomUUID()}`,
      display_code: displayCode,
      display_name: displayName,
      status: 'active',
      created_at: new Date().toISOString(),
    }
    setLocalProfiles((profiles) => [...profiles, profile])
    return profile
  }
  function register(profileId: string, data: CaptureData) {
    setCaptures((current) => ({ ...current, [profileId]: data }))
    add('height', data.cm, 'cm', 'manual', undefined, undefined, profileId)
    add('weight', data.kg, 'kg', 'manual', undefined, undefined, profileId)
    for (const width of data.widths) {
      const metric = width.label === 'Pecho' ? 'chest' : width.label === 'Cintura' ? 'waist' : 'hip'
      add(
        metric,
        width.cm,
        'cm',
        'visual_estimate',
        undefined,
        'Perímetro estimado desde la silueta frontal usando una profundidad corporal supuesta; no es una medición instrumental.',
        profileId,
      )
    }
  }
  return {
    capture: captures[localId] ?? null,
    captureFor: (profileId: string) => captures[profileId] ?? null,
    localProfiles,
    records,
    add,
    createLocalProfile,
    register,
    clear: (profileId = localId) => {
      setCaptures((current) => {
        const next = { ...current }
        delete next[profileId]
        return next
      })
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
