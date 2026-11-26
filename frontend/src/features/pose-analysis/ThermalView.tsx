import { CanvasTexture, DoubleSide, SRGBColorSpace } from 'three'
import { Canvas } from '@react-three/fiber'
import { Bounds, OrbitControls } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { photoGeometry } from '../studio/mesh'
import type { CaptureData } from '../studio/session'

const palette = ['#172f87', '#64409d', '#d03e78', '#ef783d', '#ffe38b'].map((value) => {
  const hex = Number.parseInt(value.slice(1), 16)
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
})

function colorAt(value: number) {
  const position = Math.max(0, Math.min(1, value)) * (palette.length - 1)
  const index = Math.min(palette.length - 2, Math.floor(position))
  const fraction = position - index
  return palette[index].map((channel, i) =>
    Math.round(channel + (palette[index + 1][i] - channel) * fraction),
  )
}

function gaussian(x: number, y: number, centerX: number, centerY: number, radiusX: number, radiusY: number) {
  const dx = (x - centerX) / Math.max(radiusX, 0.001)
  const dy = (y - centerY) / Math.max(radiusY, 0.001)
  return Math.exp(-0.5 * (dx * dx + dy * dy))
}

function segmentDistance(x: number, y: number, start: number, end: number, data: CaptureData) {
  const first = data.landmarks[start]
  const last = data.landmarks[end]
  if (!first || !last || first.visibility < 0.35 || last.visibility < 0.35) return Infinity

  const aspect = data.width / data.height
  const px = x * aspect
  const ax = first.x * aspect
  const ay = first.y
  const dx = last.x * aspect - ax
  const dy = last.y - ay
  const lengthSquared = dx * dx + dy * dy
  const position = lengthSquared
    ? Math.max(0, Math.min(1, ((px - ax) * dx + (y - ay) * dy) / lengthSquared))
    : 0
  return Math.hypot(px - (ax + position * dx), y - (ay + position * dy))
}

function thermalIntensity(x: number, y: number, data: CaptureData) {
  const point = (index: number) => data.landmarks[index]
  const centerX = (first: number, second: number) => {
    const a = point(first)
    const b = point(second)
    return a && b ? (a.x + b.x) / 2 : 0.5
  }
  const centerY = (first: number, second: number) => {
    const a = point(first)
    const b = point(second)
    return a && b ? (a.y + b.y) / 2 : 0.5
  }
  const shouldersY = centerY(11, 12)
  const hipsY = centerY(23, 24)
  const shouldersWidth = Math.max(0.04, Math.abs((point(11)?.x ?? 0.45) - (point(12)?.x ?? 0.55)))
  const torsoLength = Math.max(0.08, hipsY - shouldersY)
  const head = point(0)
  const headX = head?.x ?? centerX(11, 12)
  const headY = head?.y ?? Math.max(0, shouldersY - torsoLength * 0.35)
  const shoulderX = centerX(11, 12)
  const hipX = centerX(23, 24)

  const warm = Math.max(
    gaussian(x, y, headX, headY, shouldersWidth * 0.21, torsoLength * 0.2),
    0.92 * gaussian(x, y, shoulderX, (headY + shouldersY) / 2, shouldersWidth * 0.19, torsoLength * 0.14),
    0.98 * gaussian(x, y, shoulderX, shouldersY + torsoLength * 0.24, shouldersWidth * 0.48, torsoLength * 0.19),
    0.88 * gaussian(x, y, hipX, shouldersY + torsoLength * 0.66, shouldersWidth * 0.4, torsoLength * 0.25),
    0.55 * gaussian(x, y, hipX, hipsY, shouldersWidth * 0.43, torsoLength * 0.15),
  )

  const aspect = data.width / data.height
  const limbRadius = Math.max(0.008, shouldersWidth * aspect * 0.12)
  const limbSegments = [[11, 13], [13, 15], [12, 14], [14, 16], [23, 25], [25, 27], [24, 26], [26, 28]] as const
  const limbDistance = Math.min(...limbSegments.map(([start, end]) => segmentDistance(x, y, start, end, data)))
  const limbCool = Number.isFinite(limbDistance)
    ? Math.exp(-0.5 * (limbDistance / limbRadius) ** 2)
    : 0
  const extremityCool = Math.max(
    ...[15, 16, 19, 20, 27, 28, 29, 30, 31, 32].map((index) => {
      const extremity = point(index)
      return extremity
        ? gaussian(x, y, extremity.x, extremity.y, shouldersWidth * 0.12, torsoLength * 0.11)
        : 0
    }),
  )

  return Math.max(0.03, warm * (1 - 0.76 * limbCool) * (1 - 0.62 * extremityCool))
}

function createCaptureTexture(data: CaptureData) {
  const canvas = document.createElement('canvas')
  canvas.width = data.width
  canvas.height = data.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar la visualización de la captura.')

  const image = context.createImageData(data.width, data.height)
  for (let y = 0; y < data.height; y++) {
    for (let x = 0; x < data.width; x++) {
      const sourceIndex = y * data.width + x
      if (!data.mask[sourceIndex]) continue
      const color = colorAt(thermalIntensity((x + 0.5) / data.width, (y + 0.5) / data.height, data))
      const targetIndex = sourceIndex * 4
      image.data[targetIndex] = color[0]
      image.data[targetIndex + 1] = color[1]
      image.data[targetIndex + 2] = color[2]
      image.data[targetIndex + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function CapturedBody({ data }: { data: CaptureData }) {
  const geometry = useMemo(
    () => photoGeometry(data.mask, data.width, data.height, data.width / data.height),
    [data],
  )
  const texture = useMemo(() => createCaptureTexture(data), [data])

  useEffect(() => {
    return () => {
      geometry.dispose()
      texture.dispose()
    }
  }, [geometry, texture])

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        attach="material-0"
        map={texture}
        side={DoubleSide}
        transparent
        alphaTest={0.05}
      />
      <meshBasicMaterial attach="material-1" color="#251846" side={DoubleSide} />
    </mesh>
  )
}

export default function ThermalView({ capture }: { capture: CaptureData | null }) {
  return (
    <section className="panel analysis-thermal-panel">
      <div className="analysis-panel-heading">
        <div>
          <h2>Mapa corporal 3D</h2>
          <p>Patrón térmico ilustrativo sobre la silueta capturada</p>
        </div>
        <span className={`analysis-pill ${capture ? 'complete' : ''}`}>
          {capture ? 'CAPTURA LOCAL' : 'SIN CAPTURA'}
        </span>
      </div>
      <div className="analysis-thermal-viewport">
        {capture ? (
          <Canvas
            className="analysis-thermal-canvas"
            camera={{ position: [0, 1.05, 4], fov: 40 }}
            fallback={<p>La vista 3D requiere WebGL.</p>}
          >
            <color attach="background" args={['#101427']} />
            <ambientLight intensity={1.4} />
            <directionalLight position={[2, 4, 3]} intensity={1.4} />
            <Bounds fit clip observe margin={1.15}>
              <CapturedBody data={capture} />
            </Bounds>
            <OrbitControls
              makeDefault
              target={[0, 0.9, 0]}
              enablePan={false}
              minDistance={2}
              maxDistance={7}
              autoRotate
              autoRotateSpeed={0.45}
            />
          </Canvas>
        ) : (
          <div className="analysis-thermal-empty">
            <strong>El mapa aparecerá al guardar una captura corporal.</strong>
            <span>Se usará la silueta y los puntos detectados en esta sesión.</span>
            <Link className="button" to="/capture">Ir a Captura Corporal</Link>
          </div>
        )}
      </div>
      {capture && (
        <>
          <div className="analysis-thermal-legend" aria-label="Escala de color ilustrativa">
            <span>Extremidades más frías</span><i /><span>Tronco y cabeza más cálidos</span>
          </div>
          <div className="analysis-thermal-regions">
            {capture.widths.map((region) => (
              <div key={region.label}>
                <span>{region.label}</span>
                <strong>{region.frontCm.toFixed(1)} cm</strong>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="analysis-thermal-note">
        La silueta y la pose corresponden a esta captura; los colores son una simulación visual
        basada en regiones corporales, no temperaturas medidas ni termografía clínica.
      </p>
    </section>
  )
}
