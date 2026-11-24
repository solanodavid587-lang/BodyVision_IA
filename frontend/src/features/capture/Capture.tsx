import { Link } from 'react-router-dom'
import {
  AnatomyCanvas,
  defaultLayerOpacity,
  initialVisibleLayers,
  type AnatomyLayerId,
} from '../body-viewer/AnatomyCanvas'

const previewLayers: AnatomyLayerId[] = ['skin']

export default function Capture() {
  return (
    <div>
      <header className="page-header">
        <div><p className="eyebrow">ATLAS ANATÓMICO LOCAL</p><h1>Captura corporal</h1></div>
      </header>
      <div className="warning">
        <strong>Modelo genérico.</strong> Esta vista usa un atlas anatómico de referencia; no crea un cuerpo personalizado ni estima medidas desde una fotografía.
      </div>
      <section className="capture-demo-status" aria-label="Datos simulados de captura">
        <article><span>Sesión demo</span><strong>SCAN-004</strong><small>Perfil sintético</small></article>
        <article><span>Calidad del encuadre</span><strong>96%</strong><small>Simulada</small></article>
        <article><span>Landmarks visibles</span><strong>30 / 33</strong><small>Estimación demo</small></article>
        <article><span>Estado</span><strong>Completa</strong><small>Sin archivo real</small></article>
      </section>
      <section className="capture-grid local-atlas-grid">
        <div className="capture-preview capture-anatomy-preview">
          <AnatomyCanvas
            className="capture-anatomy-canvas"
            layerIds={previewLayers}
            visibleLayers={initialVisibleLayers}
            layerOpacity={defaultLayerOpacity}
            wireframe={false}
            autoRotate
          />
          <div className="capture-atlas-caption"><strong>Atlas anatómico 3D</strong><span>Modelo local · Z-Anatomy</span></div>
        </div>
        <div className="panel capture-form">
          <h2>Explorar el modelo</h2>
          <p>Los modelos de piel, huesos, órganos y venas están incluidos en el proyecto. No se necesita una API de generación ni se solicita una fotografía para abrirlos.</p>
          <div className="capture-guidance">
            <strong>Qué puedes hacer</strong>
            <ul>
              <li>Girar el cuerpo y el esqueleto en el visor 3D.</li>
              <li>Activar capas anatómicas y ajustar su opacidad.</li>
              <li>Usar el análisis de pose local por separado, sin enviar la foto al servidor.</li>
            </ul>
          </div>
          <Link className="button primary" to="/viewer/demo">Abrir visor anatómico</Link>
          <Link className="button" to="/analytics/pose">Ir a análisis de pose local</Link>
          <p className="privacy-note">La capa de órganos incluye un modelo con licencia no comercial. Este atlas es demostrativo y no debe usarse en una distribución comercial sin sustituir ese activo.</p>
        </div>
      </section>
    </div>
  )
}
