export type BodyShape = {
  weight: number
  waist: number
  hip: number
}

const neutralShape: BodyShape = { weight: 0, waist: 0, hip: 0 }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function bodyShapeFromMeasurements(
  weight?: number,
  heightCm?: number,
  waistCm?: number,
  hipCm?: number,
): BodyShape {
  if (!weight || !heightCm || heightCm <= 0) return neutralShape
  const bmi = weight / ((heightCm / 100) ** 2)
  const weightShape = clamp(bmi / 22 - 1, -0.35, 1.2)
  return {
    weight: weightShape,
    waist: waistCm
      ? clamp(waistCm / (heightCm * 0.45) - 1, -0.3, 0.85)
      : weightShape * 0.7,
    hip: hipCm
      ? clamp(hipCm / (heightCm * 0.53) - 1, -0.3, 0.85)
      : weightShape * 0.4,
  }
}

export function bodyShapeDifference(target: BodyShape, current: BodyShape): BodyShape {
  return {
    weight: target.weight - current.weight,
    waist: target.waist - current.waist,
    hip: target.hip - current.hip,
  }
}

export function bodyRegionScale(shape: BodyShape, region: string) {
  const scale = 1 + shape.weight * 0.55
    + (region === 'Cintura' ? shape.waist * 0.65 : 0)
    + (region === 'Cadera' ? shape.hip * 0.55 : 0)
  return clamp(scale, 0.65, 1.8)
}
