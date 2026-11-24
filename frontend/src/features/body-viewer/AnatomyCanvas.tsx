import { Canvas } from '@react-three/fiber'
import { Bounds, Environment, OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'

useGLTF.setDecoderPath('/draco/')

export const anatomyLayers = [
  { id: 'skin', label: 'Piel', src: '/models/skin.glb' },
  { id: 'skeleton', label: 'Huesos', src: '/models/skeleton.glb' },
  { id: 'organs', label: 'Órganos', src: '/models/organs.glb' },
  { id: 'veins', label: 'Venas', src: '/models/veins.glb' },
] as const

export type AnatomyLayerId = (typeof anatomyLayers)[number]['id']

export const bodyLayerIds: AnatomyLayerId[] = ['skin', 'organs', 'veins']
export const skeletonLayerIds: AnatomyLayerId[] = ['skeleton']

export const initialVisibleLayers: Record<AnatomyLayerId, boolean> = {
  skin: true,
  skeleton: true,
  organs: false,
  veins: false,
}

export const defaultLayerOpacity: Record<AnatomyLayerId, number> = {
  skin: 100,
  skeleton: 100,
  organs: 85,
  veins: 100,
}

const skinColors: Record<string, string> = {
  Skin: '#d6a07e',
  Nail: '#efc6b8',
  Black: '#2b1d18',
  Eye: '#e6e0d8',
  Cornea: '#cfe8ff',
  Iris: '#5b4030',
  Garment: '#2c3a5a',
}

function useConfiguredScene(scene: THREE.Object3D, wireframe: boolean, opacity: number, colors?: Record<string, string>, scanMode = false) {
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materialName = String(object.userData.zmat ?? object.parent?.userData.zmat ?? '')
        const color = colors?.[materialName]
        const cloneMaterial = (material: THREE.Material) => {
          const cloned = material.clone()
          if ('color' in cloned && cloned.color instanceof THREE.Color) {
            if (scanMode) cloned.color.set('#55dfff')
            else if (color) cloned.color.set(color)
          }
          if (scanMode) {
            if ('emissive' in cloned) {
              ;(cloned as THREE.MeshStandardMaterial).emissive = new THREE.Color('#087fa6')
              ;(cloned as THREE.MeshStandardMaterial).emissiveIntensity = 1.15
            }
            cloned.transparent = true
            cloned.opacity = 0.74
            cloned.depthWrite = false
            if ('roughness' in cloned) (cloned as THREE.MeshStandardMaterial).roughness = 0.28
            if ('metalness' in cloned) (cloned as THREE.MeshStandardMaterial).metalness = 0.18
            cloned.needsUpdate = true
          }
          return cloned
        }
        object.material = Array.isArray(object.material)
          ? object.material.map(cloneMaterial)
          : cloneMaterial(object.material)
      }
    })
    return clone
  }, [scene, colors, scanMode])

  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        const transparent = opacity < 1
        if (material.transparent !== transparent) {
          material.transparent = transparent
          material.needsUpdate = true
        }
        material.opacity = opacity
        material.depthWrite = !transparent
        if ('wireframe' in material && material.wireframe !== wireframe) {
          material.wireframe = wireframe
          material.needsUpdate = true
        }
      })
    })
  }, [model, opacity, wireframe])

  return model
}

function AnatomyLayerModel({ src, opacity, wireframe, colors, scanMode }: {
  src: string
  opacity: number
  wireframe: boolean
  colors?: Record<string, string>
  scanMode: boolean
}) {
  const gltf = useGLTF(src)
  const model = useConfiguredScene(gltf.scene, wireframe, opacity, colors, scanMode)
  return <primitive object={model} dispose={null} />
}

export function AnatomyCanvas({
  layerIds,
  visibleLayers,
  layerOpacity,
  wireframe,
  autoRotate,
  scanMode = false,
  className = '',
}: {
  layerIds: AnatomyLayerId[]
  visibleLayers: Record<AnatomyLayerId, boolean>
  layerOpacity: Record<AnatomyLayerId, number>
  wireframe: boolean
  autoRotate: boolean
  scanMode?: boolean
  className?: string
}) {
  return (
    <div className={`anatomy-canvas ${className}`}>
      <Canvas camera={{ position: [0, 1.5, 4], fov: 36 }}>
        <color attach="background" args={scanMode ? ['#06182b'] : ['#071a33']} />
        <fog attach="fog" args={[scanMode ? '#06182b' : '#071a33', 4.5, 8]} />
        <ambientLight intensity={scanMode ? 1.6 : 1.2} />
        <directionalLight position={[3, 4, 5]} intensity={scanMode ? 2.6 : 2} color={scanMode ? '#88efff' : '#ffffff'} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.2}>
            {anatomyLayers.filter((layer) => layerIds.includes(layer.id) && visibleLayers[layer.id]).map((layer) => (
              <AnatomyLayerModel
                key={layer.id}
                src={layer.src}
                opacity={layerOpacity[layer.id] / 100}
                wireframe={wireframe}
                colors={layer.id === 'skin' ? skinColors : undefined}
                scanMode={scanMode && layer.id === 'skin'}
              />
            ))}
          </Bounds>
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls makeDefault enablePan={false} autoRotate={autoRotate} autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  )
}
