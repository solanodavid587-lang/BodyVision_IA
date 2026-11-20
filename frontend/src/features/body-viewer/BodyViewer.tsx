import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import { Suspense, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as THREE from 'three'

const API_URL = import.meta.env.VITE_API_URL || ''

function AuthorizedModel({ wireframe, generationId }: { wireframe: boolean; generationId?: string }) {
  const gltf = useGLTF(generationId ? `${API_URL}/api/v1/models/${generationId}/asset` : '/models/skeleton.glb')
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.material = Array.isArray(object.material) ? object.material.map((material) => material.clone()) : object.material.clone()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        if ('wireframe' in material) material.wireframe = wireframe
      })
    }
  })
  return <primitive object={gltf.scene} />
}

export default function BodyViewer() {
  const { profileId, generationId } = useParams()
  const [wireframe, setWireframe] = useState(false)
  const [error, setError] = useState('')

  async function downloadModel() {
    if (!generationId) return
    try {
      const response = await fetch(`${API_URL}/api/v1/models/${generationId}/asset`)
      if (!response.ok) throw new Error('No se pudo descargar el modelo.')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = 'bodyvision-model.glb'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo descargar el modelo.')
    }
  }

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">EXPEDIENTE {profileId}</p><h1>{generationId ? 'Modelo 3D generado' : 'Visor 3D demostrativo'}</h1></div>{generationId && <button className="button" onClick={downloadModel}>Descargar GLB</button>}</header>
      {error && <div className="alert error" role="alert">{error}</div>}
      <section className="viewer-layout">
        <div className="canvas-panel" aria-label="Modelo 3D autorizado">
          <Canvas camera={{ position: [0, 1.6, 4], fov: 38 }}>
            <color attach="background" args={['#071a33']} />
            <ambientLight intensity={1.2} />
            <directionalLight position={[3, 4, 5]} intensity={2} />
            <Suspense fallback={null}><AuthorizedModel wireframe={wireframe} generationId={generationId} /><Environment preset="studio" /></Suspense>
            <OrbitControls makeDefault enablePan={true} />
          </Canvas>
        </div>
        <aside className="panel viewer-tools">
          <h2>Herramientas</h2>
          <label className="switch-row"><span>Wireframe real</span><input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.target.checked)} /></label>
          <button className="button" onClick={() => setWireframe(false)}>Superficie</button>
          <button className="button" onClick={() => setWireframe(true)}>Wireframe</button>
          <div className="model-info"><strong>Procedencia</strong><p>{generationId ? 'Modelo generado mediante Hyper3D/Rodin.' : 'Activo demostrativo GLB/GLTF.'}</p><p>La forma es una aproximación visual desde una sola imagen; no es una reconstrucción anatómica ni una medición clínica validada.</p></div>
        </aside>
      </section>
    </div>
  )
}
