import { Suspense, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CanvasTexture, DoubleSide, SRGBColorSpace } from 'three'
import type { CaptureData } from './session'
import type { BodyShape } from './bodyShape'
import { photoGeometry, type BodyShapeAnchors } from './mesh'

function Figure({
  data,
  height,
  width,
  bodyShape,
}: {
  data: CaptureData
  height: number
  width: number
  bodyShape?: BodyShape
}) {
  const texture = useMemo(() => {
    const surface = new CanvasTexture(data.image)
    surface.colorSpace = SRGBColorSpace
    return surface
  }, [data])
  useEffect(() => () => texture.dispose(), [texture])
  const anchors = useMemo<BodyShapeAnchors>(() => ({
    headY: data.landmarks[0]?.y ?? 0.1,
    shoulderY: ((data.landmarks[11]?.y ?? 0.28) + (data.landmarks[12]?.y ?? 0.28)) / 2,
    waistY: data.widths.find((region) => region.label === 'Cintura')?.y ?? 0.52,
    hipY: data.widths.find((region) => region.label === 'Cadera')?.y
      ?? ((data.landmarks[23]?.y ?? 0.55) + (data.landmarks[24]?.y ?? 0.55)) / 2,
    kneeY: ((data.landmarks[25]?.y ?? 0.72) + (data.landmarks[26]?.y ?? 0.72)) / 2,
  }), [data])
  const geometry = useMemo(
    () => photoGeometry(data.mask, data.width, data.height, data.image.width / data.image.height, bodyShape, anchors),
    [data, bodyShape, anchors],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} scale={[width, height, width]}>
      <meshBasicMaterial attach="material-0" map={texture} side={DoubleSide} />
      <meshStandardMaterial
        attach="material-1"
        color="#378695"
        side={DoubleSide}
      />
    </mesh>
  )
}
export function PhotoAvatar({
  data,
  height,
  width,
  bodyShape,
}: {
  data: CaptureData
  height: number
  width: number
  bodyShape?: BodyShape
}) {
  return (
    <Canvas
      camera={{ position: [0, 1.05, 4], fov: 40 }}
      fallback={<p>Activa WebGL para visualizar la malla.</p>}
    >
      <ambientLight intensity={1.3} />
      <directionalLight position={[2, 4, 3]} intensity={2} />
      <gridHelper args={[5, 20, '#288492', '#1c414c']} />
      <Suspense fallback={null}>
        <Figure data={data} height={height} width={width} bodyShape={bodyShape} />
      </Suspense>
      <OrbitControls
        target={[0, 0.95, 0]}
        enablePan={false}
        minDistance={1}
        maxDistance={8}
      />
    </Canvas>
  )
}
