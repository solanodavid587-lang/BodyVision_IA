type CaptureRequest = {
  width: number
  height: number
  heightCm: number
  weightKg: number
}

type WorkerWidth = { label: string; cm: number; left: number; right: number; y: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

self.onmessage = (event: MessageEvent<CaptureRequest>) => {
  const { width, height, heightCm, weightKg } = event.data
  if (
    width < 1 ||
    height < 1 ||
    !Number.isFinite(heightCm) ||
    heightCm <= 0 ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0
  ) {
    self.postMessage({ error: 'Revisa la altura y el peso ingresados.' })
    return
  }

  const bmi = weightKg / ((heightCm / 100) ** 2)
  const shapeScale = clamp(1 + (bmi - 22) * 0.012, 0.82, 1.32)
  const mask = new Uint8Array(width * height)
  const aspect = width / height
  const bodyHeightFraction = 0.9
  const bodyTop = 0.05
  const bandWidths = [
    { start: 0.02, end: 0.13, width: 0.115 },
    { start: 0.13, end: 0.18, width: 0.07 },
    { start: 0.18, end: 0.29, width: 0.32 },
    { start: 0.29, end: 0.43, width: 0.235 },
    { start: 0.43, end: 0.55, width: 0.19 },
    { start: 0.55, end: 0.68, width: 0.265 },
  ]

  for (let y = 0; y < height; y++) {
    const bodyY = (y / height - bodyTop) / bodyHeightFraction
    if (bodyY < 0 || bodyY > 1) continue

    let band = bandWidths.find(({ start, end }) => bodyY >= start && bodyY < end)
    if (!band && bodyY >= 0.68) {
      const legWidth = clamp(0.09 * shapeScale / aspect, 0.015, 0.16)
      const legCenterOffset = clamp(0.075 / aspect, 0.012, 0.12)
      for (let x = 0; x < width; x++) {
        const xFraction = x / width
        const inLeftLeg = Math.abs(xFraction - (0.5 - legCenterOffset)) <= legWidth / 2
        const inRightLeg = Math.abs(xFraction - (0.5 + legCenterOffset)) <= legWidth / 2
        if (inLeftLeg || inRightLeg) mask[y * width + x] = 1
      }
      continue
    }
    if (!band) continue

    let bodyWidth = band.width * shapeScale
    if (bodyY < 0.13) bodyWidth *= Math.sin((bodyY / 0.13) * Math.PI)
    const halfWidth = clamp((bodyWidth * bodyHeightFraction) / (2 * aspect), 0.005, 0.48)
    for (let x = 0; x < width; x++) {
      if (Math.abs(x / width - 0.5) <= halfWidth) mask[y * width + x] = 1
    }
  }

  const cmPerPixel = heightCm / (height * bodyHeightFraction)
  const simulatedWidths = [
    { label: 'Pecho', widthRatio: 0.235 + (bmi - 22) * 0.003 },
    { label: 'Cintura', widthRatio: 0.19 + (bmi - 22) * 0.004 },
    { label: 'Cadera', widthRatio: 0.265 + (bmi - 22) * 0.003 },
  ]
  const widths: WorkerWidth[] = simulatedWidths.map(({ label, widthRatio }, index) => {
    const bodyY = [0.35, 0.49, 0.615][index]
    const y = bodyTop + bodyY * bodyHeightFraction
    const pixelWidth = clamp(widthRatio * shapeScale * height * bodyHeightFraction, 2, width)
    const halfWidth = pixelWidth / (2 * width)
    return {
      label,
      cm: pixelWidth * cmPerPixel,
      left: 0.5 - halfWidth,
      right: 0.5 + halfWidth,
      y,
    }
  })

  self.postMessage({ mask: mask.buffer, width, height, widths, simulated: true })
}

export {}
