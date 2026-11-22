export type Point3D = { x: number; y: number; z: number; visibility: number }

export function visible(point?: Point3D) {
  return !!point && point.visibility >= 0.65 && [point.x, point.y, point.z].every(Number.isFinite)
}

export function jointAngle(points: Point3D[], a: number, b: number, c: number) {
  const [first, center, last] = [points[a], points[b], points[c]]
  if (![first, center, last].every(visible)) return null
  const u = [first.x - center.x, first.y - center.y, first.z - center.z]
  const v = [last.x - center.x, last.y - center.y, last.z - center.z]
  const length = Math.hypot(...u) * Math.hypot(...v)
  if (length < 1e-8) return null
  const cosine = u.reduce((sum, value, index) => sum + value * v[index], 0) / length
  return Math.round(Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI)
}

export function parseThermal(text: string) {
  const lines = text.trim().split(/\r?\n/)
  const separator = lines[0].includes(';') ? ';' : ','
  if (lines.length < 2 || lines.length > 1024) throw Error('La matriz debe tener entre 2 y 1024 filas.')
  let width = 0
  let min = Infinity
  let max = -Infinity
  const rows = lines.map((line, i) => {
    const cells = line.split(separator)
    if (i === 0) width = cells.length
    if (width < 2 || width > 1024 || cells.length !== width) throw Error('Se requiere una matriz rectangular de 2 a 1024 columnas.')
    return cells.map(cell => {
      const raw = cell.trim()
      const number = separator === ';' ? raw.replace(',', '.') : raw
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(number)) throw Error('Cada celda debe contener una temperatura en °C.')
      const value = Number(number)
      if (!Number.isFinite(value) || value < -273.15) throw Error('Temperatura fuera del rango físico.')
      min = Math.min(min, value)
      max = Math.max(max, value)
      return value
    })
  })
  return { rows, width, height: rows.length, min, max }
}
