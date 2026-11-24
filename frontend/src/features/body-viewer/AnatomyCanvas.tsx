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

const thermalPalette = ['#172f87', '#64409d', '#d03e78', '#ef783d', '#ffe38b'].map((color) => new THREE.Color(color))

function applyThermalColors(model: THREE.Object3D) {
  model.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(model)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const geometry = object.geometry.clone()
    const positions = geometry.getAttribute('position')
    const colors = new Float32Array(positions.count * 3)
    const point = new THREE.Vector3()

    for (let index = 0; index < positions.count; index++) {
      point.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld)
      const x = size.x ? (point.x - center.x) / (size.x / 2) : 0
      const y = size.y ? (point.y - bounds.min.y) / size.y : 0.5
      const torso = Math.exp(-((x / 0.47) ** 2 + ((y - 0.57) / 0.25) ** 2))
      const shoulders = 0.3 * Math.exp(-((x / 0.65) ** 2 + ((y - 0.73) / 0.1) ** 2))
      const head = 0.16 * Math.exp(-((x / 0.2) ** 2 + ((y - 0.91) / 0.07) ** 2))
      const heat = THREE.MathUtils.clamp(0.06 + torso * 0.72 + shoulders + head, 0, 1)
      const palettePosition = heat * (thermalPalette.length - 1)
      const paletteIndex = Math.min(thermalPalette.length - 2, Math.floor(palettePosition))
      const blend = palettePosition - paletteIndex
      const first = thermalPalette[paletteIndex]
      const second = thermalPalette[paletteIndex + 1]
      const offset = index * 3
      colors[offset] = first.r + (second.r - first.r) * blend
      colors[offset + 1] = first.g + (second.g - first.g) * blend
      colors[offset + 2] = first.b + (second.b - first.b) * blend
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    object.geometry = geometry
  })
}

function useConfiguredScene(scene: THREE.Object3D, wireframe: boolean, opacity: number, colors?: Record<string, string>, scanMode = false, thermalMode = false) {
  const model = useMemo(() => {
    const clone = scene.clone(true)
    if (thermalMode) applyThermalColors(clone)
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materialName = String(object.userData.zmat ?? object.parent?.userData.zmat ?? '')
        const color = colors?.[materialName]
        const cloneMaterial = (material: THREE.Material) => {
          const cloned = material.clone()
          if ('color' in cloned && cloned.color instanceof THREE.Color) {
            if (thermalMode) cloned.color.set('#ffffff')
            else if (scanMode) cloned.color.set('#55dfff')
            else if (color) cloned.color.set(color)
          }
          if (thermalMode && cloned instanceof THREE.MeshStandardMaterial) {
            cloned.map = null
            cloned.vertexColors = true
            cloned.emissive.set('#210b35')
            cloned.emissiveIntensity = 0.1
            cloned.needsUpdate = true
          } else if (scanMode) {
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
  }, [scene, colors, scanMode, thermalMode])

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

  useEffect(() => () => {
    if (!thermalMode) return
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => material.dispose())
    })
  }, [model, thermalMode])

  return model
}

function AnatomyLayerModel({ src, opacity, wireframe, colors, scanMode, thermalMode }: {
  src: string
  opacity: number
  wireframe: boolean
  colors?: Record<string, string>
  scanMode: boolean
  thermalMode: boolean
}) {
  const gltf = useGLTF(src)
  const model = useConfiguredScene(gltf.scene, wireframe, opacity, colors, scanMode, thermalMode)
  return <primitive object={model} dispose={null} />
}

export function AnatomyCanvas({
  layerIds,
  visibleLayers,
  layerOpacity,
  wireframe,
  autoRotate,
  scanMode = false,
  thermalMode = false,
  className = '',
  modelScale = 1,
  heightScale = 1,
}: {
  layerIds: AnatomyLayerId[]
  visibleLayers: Record<AnatomyLayerId, boolean>
  layerOpacity: Record<AnatomyLayerId, number>
  wireframe: boolean
  autoRotate: boolean
  scanMode?: boolean
  thermalMode?: boolean
  className?: string
  heightScale?: number
  modelScale?: number
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
            <group scale={[modelScale, heightScale, modelScale]}>
              {anatomyLayers.filter((layer) => layerIds.includes(layer.id) && visibleLayers[layer.id]).map((layer) => (
                <AnatomyLayerModel
                  key={layer.id}
                  src={layer.src}
                  opacity={layerOpacity[layer.id] / 100}
                  wireframe={wireframe}
                  colors={layer.id === 'skin' ? skinColors : undefined}
                  scanMode={scanMode && layer.id === 'skin'}
                  thermalMode={thermalMode && layer.id === 'skin'}
                />
              ))}
            </group>
          </Bounds>
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls makeDefault enablePan={false} autoRotate={autoRotate} autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  )
}
