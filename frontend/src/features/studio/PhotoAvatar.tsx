import { Suspense, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CanvasTexture, DoubleSide, SRGBColorSpace } from 'three'
import type { CaptureData } from './session'
import { photoGeometry } from './mesh'

function Figure({
  data,
  height,
  width,
}: {
  data: CaptureData
  height: number
  width: number
}) {
  const texture = useMemo(() => {
    const surface = new CanvasTexture(data.image)
    surface.colorSpace = SRGBColorSpace
    return surface
  }, [data])
  useEffect(() => () => texture.dispose(), [texture])
  const geometry = useMemo(
    () =>
      photoGeometry(
        data.mask,
        data.width,
        data.height,
        data.image.width / data.image.height,
      ),
    [data],
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
}: {
  data: CaptureData
  height: number
  width: number
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
        <Figure data={data} height={height} width={width} />
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
