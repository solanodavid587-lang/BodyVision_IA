import type { Measurement } from '../../types'

export function series(items: Measurement[], metric: string, method = 'all') {
  const replaced = new Set(items.map((row) => row.supersedes_id))
  return items
    .filter(
      (row) =>
        row.metric_code === metric &&
        !replaced.has(row.id) &&
        (method === 'all' || row.method === method),
    )
    .map((row) => ({
      time: Date.parse(row.measured_at),
      value: row.value * (row.unit === 'm' ? 100 : 1),
      method: row.method,
    }))
    .filter((row) => Number.isFinite(row.time) && Number.isFinite(row.value))
    .sort((a, b) => a.time - b.time)
}
export function validateValue(metric: string, value: number, method: string) {
  if (!Number.isFinite(value)) return 'Introduce un número válido.'
  if (metric.endsWith('_pct')) {
    if (value < 0 || value > 100)
      return 'El porcentaje debe estar entre 0 y 100.'
    if (method === 'visual_estimate')
      return 'Registra un porcentaje obtenido mediante un instrumento o protocolo.'
  } else if (value <= 0) return 'La medición debe ser mayor que cero.'
  return ''
}
