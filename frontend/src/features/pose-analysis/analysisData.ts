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
