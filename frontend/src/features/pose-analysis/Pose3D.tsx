import { Canvas } from '@react-three/fiber'
import { Bounds, Line, OrbitControls } from '@react-three/drei'
import { jointAngle, visible, type Point3D } from './analysisData'

const joints = [
  ['Codo izquierdo', 11, 13, 15], ['Codo derecho', 12, 14, 16],
  ['Rodilla izquierda', 23, 25, 27], ['Rodilla derecha', 24, 26, 28],
] as const

export default function Pose3D({ points, connections }: { points: Point3D[]; connections: number[][] }) {
  const position = (index: number): [number, number, number] => [points[index].x, -points[index].y, -points[index].z]
  const segments = connections.filter(([a, b]) => visible(points[a]) && visible(points[b]))
  return <section className="panel">
    <h2>Pose en 3D</h2>
    {segments.length ? <>
      <p>Arrastra para girar la pose. Los segmentos visibles unen articulaciones estimadas de esta captura.</p>
      <div style={{ height: 360, background: '#102138' }}>
        <Canvas camera={{ position: [0, 0, 3] }} fallback={<p>La vista 3D requiere WebGL.</p>}>
          <Bounds fit clip observe margin={1.25}>
            {segments.map(([a, b]) => <Line key={a + '-' + b} points={[position(a), position(b)]} color="#a995ff" lineWidth={3} />)}
            {[...new Set(segments.flat())].map(index => <mesh key={index} position={position(index)}>
              <sphereGeometry args={[0.014, 12, 8]} /><meshBasicMaterial color="#ffc674" />
            </mesh>)}
          </Bounds>
          <OrbitControls makeDefault />
        </Canvas>
      </div>
    </> : <p>Faltan puntos 3D visibles. Repite la captura con el cuerpo completo en el encuadre.</p>}
    <h3>Ángulo interior entre segmentos</h3>
    <p>180° representa dos segmentos alineados. La estimación depende de los tres puntos de cada articulación.</p>
    <div className="analysis-metric-grid">{joints.map(([name, a, b, c]) => {
      const angle = jointAngle(points, a, b, c)
      return <article key={name}><span>{name}</span><strong>{angle === null ? 'Sin lectura' : angle + '°'}</strong></article>
    })}</div>
  </section>
}
