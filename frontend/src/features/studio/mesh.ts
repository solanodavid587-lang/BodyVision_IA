import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { BodyShape } from './bodyShape'

export type BodyShapeAnchors = {
  headY: number
  shoulderY: number
  waistY: number
  hipY: number
  kneeY: number
}

function gaussian(value: number, center: number, radius: number) {
  return Math.exp(-0.5 * ((value - center) / radius) ** 2)
}

// Sample the foreground on a regular grid. Give each continuous span an
// elliptical cross section so separated arms and legs keep their own outline.
export function photoGeometry(
  mask: Uint8Array,
  w: number,
  h: number,
  aspect: number,
  bodyShape?: BodyShape,
  anchors?: BodyShapeAnchors,
) {
  const rows = Math.min(180, h),
    cols = Math.max(2, Math.min(180, Math.round(rows * aspect)))
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = []
  const ids = new Int32Array((cols + 1) * (rows + 1)).fill(-1)
  for (let y = 0; y <= rows; y++) {
    const sourceY = Math.min(h - 1, Math.floor((y * h) / rows))
    const inside = (x: number) =>
      x <= cols &&
      mask[sourceY * w + Math.min(w - 1, Math.floor((x * w) / cols))] === 1
    for (let x = 0; x <= cols;) {
      if (!inside(x)) {
        x++
        continue
      }
      const start = x
      while (inside(x)) x++
      const end = x - 1
      const height = 1 - sourceY / h
      const torsoLength = Math.max(0.08, anchors ? anchors.hipY - anchors.shoulderY : 0.3)
      const abdomen = gaussian(
        height,
        anchors ? 1 - anchors.waistY : 0.57,
        torsoLength * 0.22,
      )
      const hips = gaussian(height, anchors ? 1 - anchors.hipY : 0.47, torsoLength * 0.25)
      const face = gaussian(height, anchors ? 1 - anchors.headY : 0.9, 0.035)
      const jawY = anchors ? anchors.headY + (anchors.shoulderY - anchors.headY) * 0.42 : 0.15
      const jaw = gaussian(height, 1 - jawY, 0.028)
      const limbs = gaussian(height, anchors ? 1 - (anchors.shoulderY + anchors.kneeY) / 2 : 0.53, 0.3)
      const scale = bodyShape
        ? Math.max(0.65, Math.min(1.8,
          1 + bodyShape.weight * (0.95 * abdomen + 0.4 * hips + 0.18 * limbs + 0.28 * face + 0.48 * jaw)
            + bodyShape.waist * abdomen * 0.8
            + bodyShape.hip * hips * 0.65))
        : 1
      const centerX = (start + end) / 2
      for (let i = start; i <= end; i++) {
        const u = i / cols,
          v = 1 - y / rows
        const depth =
          ((Math.sqrt((i - start) * (end - i)) * aspect) / cols) * 0.65
        const scaledX = (centerX + (i - centerX) * scale) / cols * aspect
        ids[y * (cols + 1) + i] = positions.length / 3
        positions.push(
          scaledX,
          v,
          depth * scale + 0.002,
          scaledX,
          v,
          -depth * scale - 0.002,
        )
        uvs.push(u, v, u, v)
      }
    }
  }
  const stride = cols + 1
  const cell = (x: number, y: number) =>
    x >= 0 &&
    x < cols &&
    y >= 0 &&
    y < rows &&
    [0, 1, stride, stride + 1].every((k) => ids[y * stride + x + k] >= 0)
  const rear: number[] = []
  function side(a: number, b: number) {
    rear.push(a, b, b + 1, a, b + 1, a + 1)
  }
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (!cell(x, y)) continue
      const k = y * stride + x,
        a = ids[k],
        b = ids[k + 1],
        c = ids[k + stride],
        d = ids[k + stride + 1]
      indices.push(a, c, b, b, c, d)
      rear.push(a + 1, b + 1, c + 1, b + 1, d + 1, c + 1)
      if (!cell(x, y - 1)) side(a, b)
      if (!cell(x, y + 1)) side(d, c)
      if (!cell(x - 1, y)) side(c, a)
      if (!cell(x + 1, y)) side(b, d)
    }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices.concat(rear))
  geometry.addGroup(0, indices.length, 0)
  geometry.addGroup(indices.length, rear.length, 1)
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const scale = 1.8 / Math.max(0.01, box.max.y - box.min.y)
  geometry.translate(-(box.min.x + box.max.x) / 2, -box.min.y, 0)
  geometry.scale(scale, scale, scale)
  geometry.computeVertexNormals()
  return geometry
}
