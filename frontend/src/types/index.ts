export type Profile = {
  id: string
  display_code: string
  display_name: string
  status: 'active' | 'archived' | 'restricted'
  created_at: string
}

export type Measurement = {
  id: string
  profile_id: string
  metric_code: string
  value: number
  unit: string
  method: 'manual' | 'device' | 'visual_estimate'
  measured_at: string
  created_by: string
  notes?: string
}
