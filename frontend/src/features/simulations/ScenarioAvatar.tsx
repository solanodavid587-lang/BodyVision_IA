import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

type ScenarioAvatarProps = {
  massScale?: number
  waistScale?: number
  hipScale?: number
}

function AvatarModel({ massScale = 1, waistScale = 1, hipScale = 1 }: ScenarioAvatarProps) {
  const torso = useMemo(() => {
    const profile = [
      [0.11, 0],
      [0.22, 0.04],
      [0.31, 0.16],
      [0.34, 0.31],
      [0.29, 0.49],
      [0.26, 0.68],
      [0.3, 0.88],
      [0.37, 1.08],
      [0.43, 1.29],
      [0.36, 1.46],
      [0.17, 1.55],
      [0.12, 1.58],
    ]
    const points = profile.map(([radius, height]) => {
      const bodyRegion = height < 0.38 ? hipScale : height < 0.86 ? waistScale : 1
      return new THREE.Vector2(radius * massScale * bodyRegion, height)
    })
    return new THREE.LatheGeometry(points, 32)
  }, [hipScale, massScale, waistScale])

  const shorts = useMemo(() => {
    const profile = [[0.13, 0], [0.22, 0.04], [0.31, 0.16], [0.34, 0.31], [0.29, 0.49]]
    return new THREE.LatheGeometry(profile.map(([radius, height]) => {
      const bodyRegion = height < 0.38 ? hipScale : waistScale
      return new THREE.Vector2(radius * massScale * bodyRegion * 1.015, height)
    }), 32)
  }, [hipScale, massScale, waistScale])

  const arm = useMemo(() => new THREE.CapsuleGeometry(0.085, 0.55, 5, 12), [])
  const leg = useMemo(() => new THREE.CapsuleGeometry(0.12, 0.62, 5, 12), [])
  const skin = '#b98f77'

  return (
    <group scale={[1, 1, 1]} position={[0, -1.27, 0]}>
      <mesh geometry={torso} position={[0, 0.76, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1c5269" roughness={0.76} />
      </mesh>
      <mesh geometry={shorts} position={[0, 0.76, 0]} castShadow>
        <meshStandardMaterial color="#102b40" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.43, 0]} castShadow>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshStandardMaterial color={skin} roughness={0.72} />
      </mesh>
      <mesh position={[0, 2.22, 0]}>
        <cylinderGeometry args={[0.075, 0.09, 0.18, 16]} />
        <meshStandardMaterial color={skin} roughness={0.75} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh geometry={arm} position={[side * 0.49 * massScale, 1.69, 0]} rotation={[0, 0, side * -0.08]} castShadow>
            <meshStandardMaterial color={skin} roughness={0.78} />
          </mesh>
          <mesh position={[side * 0.54 * massScale, 1.34, 0]}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color={skin} roughness={0.78} />
          </mesh>
          <mesh geometry={leg} position={[side * 0.19 * massScale, 0.36, 0]} castShadow>
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
          <mesh position={[side * 0.19 * massScale, -0.06, 0.08]}>
            <capsuleGeometry args={[0.07, 0.18, 4, 8]} />
            <meshStandardMaterial color="#172d3a" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function ScenarioAvatar(props: ScenarioAvatarProps) {
  return (
    <Canvas camera={{ position: [0, 1.15, 6.5], fov: 34 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#0a1a2c']} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 5, 4]} intensity={2} castShadow />
      <pointLight position={[-3, 1, -2]} color="#27c4e6" intensity={1} />
      <AvatarModel {...props} />
    </Canvas>
  )
}
