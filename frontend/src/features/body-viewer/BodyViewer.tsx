import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AnatomyCanvas,
  anatomyLayers,
  bodyLayerIds,
  defaultLayerOpacity,
  initialVisibleLayers,
  skeletonLayerIds,
  type AnatomyLayerId,
} from './AnatomyCanvas'

export default function BodyViewer() {
  const { profileId } = useParams()
  const [wireframe, setWireframe] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState(initialVisibleLayers)
  const [layerOpacity, setLayerOpacity] = useState(defaultLayerOpacity)

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">{profileId === 'demo' ? 'ATLAS ANATÓMICO LOCAL' : `EXPEDIENTE ${profileId}`}</p><h1>Anatomía humana 3D</h1></div></header>
      <section className="anatomy-viewer-layout">
        <div className="anatomy-stage">
          <section className="anatomy-viewport">
            <header className="anatomy-viewport-header">
              <div><span>01</span><div><h2>Cuerpo</h2><p>Vista externa y capas internas</p></div></div>
              <span className="anatomy-status">MODELO 3D</span>
            </header>
            <AnatomyCanvas
              layerIds={bodyLayerIds}
              visibleLayers={visibleLayers}
              layerOpacity={layerOpacity}
              wireframe={wireframe}
              autoRotate={autoRotate}
            />
          </section>
          <section className="anatomy-viewport">
            <header className="anatomy-viewport-header">
              <div><span>02</span><div><h2>Esqueleto</h2><p>Vista ósea interactiva</p></div></div>
              <span className="anatomy-status">360°</span>
            </header>
            <AnatomyCanvas
              layerIds={skeletonLayerIds}
              visibleLayers={visibleLayers}
              layerOpacity={layerOpacity}
              wireframe={wireframe}
              autoRotate={autoRotate}
            />
          </section>
        </div>
        <aside className="panel viewer-tools">
          <h2>Exploración anatómica</h2>
          <p className="viewer-hint">Explora el cuerpo y el esqueleto por separado. Arrastra los modelos para girarlos.</p>
          <div className="viewer-feature-list">
            <div><span>360°</span><strong>Rotación interactiva</strong></div>
            <div><span>3D</span><strong>Análisis por capas</strong></div>
          </div>
          <button className={autoRotate ? 'button primary' : 'button'} onClick={() => setAutoRotate((current) => !current)}>
            {autoRotate ? 'Pausar rotación' : 'Rotación 360°'}
          </button>
          <h3 className="viewer-layer-heading">Capas visibles</h3>
          {anatomyLayers.map((layer) => (
            <div className="anatomy-layer-control" key={layer.id}>
              <label className="switch-row">
                <span>{layer.label}</span>
                <input
                  type="checkbox"
                  checked={visibleLayers[layer.id]}
                  onChange={(event) => setVisibleLayers((current) => ({ ...current, [layer.id]: event.target.checked }))}
                />
              </label>
              {visibleLayers[layer.id] && <label className="anatomy-layer-opacity">
                <span>Opacidad <span>{layerOpacity[layer.id]}%</span></span>
                <input
                  type="range"
                  min="15"
                  max="100"
                  step="5"
                  value={layerOpacity[layer.id]}
                  aria-label={`Opacidad de ${layer.label}`}
                  onChange={(event) => setLayerOpacity((current) => ({ ...current, [layer.id]: Number(event.target.value) }))}
                />
              </label>}
            </div>
          ))}
          <label className="switch-row"><span>Wireframe</span><input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.target.checked)} /></label>
          <button className="button" onClick={() => {
            setVisibleLayers(initialVisibleLayers)
            setLayerOpacity(defaultLayerOpacity)
            setWireframe(false)
            setAutoRotate(false)
          }}>Restablecer capas</button>
          <div className="model-info">
            <strong>Procedencia y uso</strong>
            <p>Modelos de Z-Anatomy, derivados de BodyParts3D. Licencia CC BY-SA 4.0.</p>
            <p>La capa de órganos incluye un riñón de Lissie Cowley con licencia CC BY-NC 4.0. Esta versión es solo demostrativa y no comercial.</p>
            <a href="https://github.com/SeemaBansal1/3d-human-body-anatomy" target="_blank" rel="noreferrer">Repositorio de referencia</a>
          </div>
        </aside>
      </section>
    </div>
  )
}
