import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AnatomyCanvas,
  defaultLayerOpacity,
  initialVisibleLayers,
  type AnatomyLayerId,
} from '../body-viewer/AnatomyCanvas'
import { apiRequest } from '../../services/api'
import type { Measurement, Profile } from '../../types'

const dashboardLayerIds: AnatomyLayerId[] = ['skin', 'skeleton']

function latestMeasurement(items: Measurement[], metricCode?: string) {
  return [...items]
    .filter((item) => !metricCode || item.metric_code === metricCode)
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0]
}

function formatValue(item?: Measurement) {
  return item ? `${item.value.toLocaleString('es')} ${item.unit}` : 'Sin registro'
}

function methodLabel(item?: Measurement) {
  if (!item) return ''
  if (item.method === 'simulated') return 'Dato simulado · no clínico'
  return item.method === 'visual_estimate' ? 'Estimación visual' : 'Medición registrada'
}

export default function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadProfiles() {
      try {
        const items = await apiRequest<Profile[]>('/profiles')
        if (!active) return
        setProfiles(items)
        const profile = items.find((item) => item.status === 'active') || items[0]
        if (profile) {
          const records = await apiRequest<Measurement[]>(`/profiles/${profile.id}/measurements`)
          if (active) setMeasurements(records)
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los expedientes.')
      }
    }

    void loadProfiles()
    return () => { active = false }
  }, [])

  const activeProfiles = profiles.filter((profile) => profile.status === 'active').length
  const focusedProfile = profiles.find((profile) => profile.status === 'active') || profiles[0]
  const latestRecord = latestMeasurement(measurements)
  const bodyFat = latestMeasurement(measurements, 'body_fat_pct')
  const muscleMass = latestMeasurement(measurements, 'muscle_mass_pct')
  const bodyFatPercent = bodyFat ? Math.min(Math.max(bodyFat.value, 0), 100) : 0

  const chartData = useMemo(() => {
    const byDate = new Map<string, { date: string; weight?: number; bodyFat?: number }>()
    measurements.forEach((item) => {
      if (item.metric_code !== 'weight' && item.metric_code !== 'body_fat_pct') return
      const date = new Date(item.measured_at)
      const key = date.toISOString().slice(0, 10)
      const point = byDate.get(key) || { date: date.toLocaleDateString('es', { day: '2-digit', month: 'short' }) }
      if (item.metric_code === 'weight') point.weight = item.value
      if (item.metric_code === 'body_fat_pct') point.bodyFat = item.value
      byDate.set(key, point)
    })
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, point]) => point)
  }, [measurements])
  const hasWeight = chartData.some((point) => point.weight !== undefined)
  const hasBodyFat = chartData.some((point) => point.bodyFat !== undefined)

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">BODYVISION AI · PLATAFORMA DE ANÁLISIS CORPORAL 3D</p>
        </div>
        <div className="dashboard-user">
          <span className="status-dot" />
          <div className="user-avatar">DM</div>
          <div><strong>Dra. Martínez</strong><small>Analista corporal · SENATI</small></div>
        </div>
      </header>
      <section className="welcome-row">
        <div><h2>Bienvenida, Dra. Martínez</h2><p>Resumen general de expedientes y análisis corporales</p></div>
        <Link className="button primary compact" to="/profiles">Nuevo expediente</Link>
      </section>
      {error && <div className="alert error" role="alert">{error}</div>}

      <section className="stats-grid dashboard-stats" aria-label="Resumen">
        <article className="stat-card cyan"><div className="stat-icon">◉</div><div><strong>{activeProfiles}</strong><span>Expedientes activos</span></div></article>
        <article className="stat-card mint"><div className="stat-icon">▣</div><div><strong>{profiles.length}</strong><span>Expedientes totales</span></div></article>
        <article className="stat-card purple"><div className="stat-icon">⌁</div><div><strong>{measurements.length}</strong><span>Mediciones · {focusedProfile?.display_code || 'sin expediente'}</span></div></article>
        <article className="stat-card blue"><div className="stat-icon">◎</div><div><strong>Local</strong><span>Atlas anatómico 3D</span></div></article>
      </section>

      <section className="dashboard-main-grid">
        <article className="panel dashboard-model-panel">
          <div className="dashboard-panel-heading">
            <div><h2>Escaneo 3D corporal</h2><small>{focusedProfile ? `Expediente ${focusedProfile.display_code}` : 'Vista anatómica demostrativa'}</small></div>
            <span className="dashboard-tag">ESCÁNER CORPORAL · DEMO</span>
          </div>
          <div className="dashboard-scan-viewport">
            <div className="dashboard-scan-grid" aria-hidden="true" />
            <div className="dashboard-scan-rings" aria-hidden="true"><span /><span /><span /></div>
            <AnatomyCanvas
              className="dashboard-model-canvas"
              layerIds={dashboardLayerIds}
              visibleLayers={initialVisibleLayers}
              layerOpacity={defaultLayerOpacity}
              wireframe={false}
              autoRotate
              scanMode
            />
            <div className="dashboard-scan-sweep" aria-hidden="true" />
            <span className="dashboard-scan-reticle" aria-hidden="true">BODY · SCAN 04</span>
            <span className="dashboard-scan-axis axis-x" aria-hidden="true">X</span>
            <span className="dashboard-scan-axis axis-y" aria-hidden="true">Y</span>
          </div>
          <div className="dashboard-scan-status" aria-label="Estado del escaneo ilustrativo">
            <div><span className="dashboard-scan-dot" /><strong>CAPTURA 360°</strong></div>
            <div><strong>04</strong><span>VISTAS</span></div>
            <div><strong>32</strong><span>FPS</span></div>
          </div>
          <div className="dashboard-model-footer">
            <span>Visualización ilustrativa</span>
            <Link to="/viewer/demo">Explorar anatomía 3D →</Link>
          </div>
        </article>

        <article className="panel dashboard-composition-panel">
          <div className="dashboard-panel-heading"><div><h2>Composición corporal</h2><small>Datos del expediente reciente</small></div></div>
          {bodyFat && <div className="composition-ring" style={{
            background: `conic-gradient(#35c8e5 0 ${bodyFatPercent}%, #cbd05d ${bodyFatPercent}% 100%)`,
          }}>
            <div><strong>{bodyFat.value.toLocaleString('es')}%</strong><span>Grasa corporal</span></div>
          </div>}
          <div className="composition-list dashboard-composition-list">
            <div><span><i className="cyan-key" />Grasa corporal</span><strong>{bodyFat ? `${bodyFat.value.toLocaleString('es')}%` : 'Sin registro'}</strong></div>
            <div><span><i className="yellow-key" />Masa muscular</span><strong>{muscleMass ? `${muscleMass.value.toLocaleString('es')}%` : 'Sin registro'}</strong></div>
          </div>
          {bodyFat || muscleMass
            ? <p className="dashboard-data-note">{methodLabel(bodyFat || muscleMass)} · no se estiman valores faltantes.</p>
            : <Link className="dashboard-empty-link" to={focusedProfile ? `/profiles/${focusedProfile.id}/measurements` : '/measurements'}>Registrar una medición</Link>}
        </article>

        <article className="panel dashboard-analysis-panel">
          <div className="dashboard-panel-heading"><div><h2>Análisis corporal</h2><small>Accesos rápidos</small></div></div>
          <div className="dashboard-summary-item"><span>Último registro</span><strong>{latestRecord ? new Date(latestRecord.measured_at).toLocaleDateString('es') : 'Sin datos'}</strong></div>
          <div className="dashboard-summary-item"><span>Expediente destacado</span><strong>{focusedProfile?.display_code || 'Sin expedientes'}</strong></div>
          <nav className="dashboard-shortcuts" aria-label="Accesos de análisis">
            <Link to="/analytics/pose"><span>01</span>Analítica IA</Link>
            <Link to="/capture"><span>02</span>Captura corporal</Link>
            <Link to="/viewer/demo"><span>03</span>Visor anatómico 3D</Link>
          </nav>
          <p className="dashboard-data-note">Las mediciones clínicas dependen de datos observados; la visualización 3D es demostrativa.</p>
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="panel evolution-panel">
          <div className="dashboard-panel-heading">
            <div><h2>Evolución corporal</h2><small>{focusedProfile?.display_code || 'Selecciona un expediente'}</small></div>
            <Link to={focusedProfile ? `/profiles/${focusedProfile.id}/measurements` : '/measurements'}>Ver historial →</Link>
          </div>
          {chartData.length ? <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#1e4d6c" strokeDasharray="3 4" />
                <XAxis dataKey="date" tick={{ fill: '#819db3', fontSize: 10 }} />
                {hasWeight && <YAxis yAxisId="weight" tick={{ fill: '#819db3', fontSize: 9 }} />}
                {hasBodyFat && <YAxis yAxisId="bodyFat" orientation="right" tick={{ fill: '#819db3', fontSize: 9 }} />}
                <Tooltip contentStyle={{ background: '#09182c', borderColor: '#1f4565', color: '#dcecff' }} />
                {hasWeight && <Line yAxisId="weight" type="monotone" dataKey="weight" name="Peso (kg)" stroke="#35c4dd" strokeWidth={2} dot={false} connectNulls />}
                {hasBodyFat && <Line yAxisId="bodyFat" type="monotone" dataKey="bodyFat" name="Grasa corporal (%)" stroke="#d9c05c" strokeWidth={2} dot={false} connectNulls />}
              </LineChart>
            </ResponsiveContainer>
          </div> : <div className="dashboard-empty-state"><p>No hay mediciones de peso o grasa corporal para mostrar.</p><Link to={focusedProfile ? `/profiles/${focusedProfile.id}/measurements` : '/measurements'}>Añadir mediciones</Link></div>}
          <div className="chart-legend"><span><i className="cyan-key" />Peso (kg)</span><span><i className="yellow-key" />Grasa corporal (%)</span></div>
        </article>

        <article className="panel dashboard-layers-panel">
          <div className="dashboard-panel-heading"><div><h2>Modelo anatómico</h2><small>Capas disponibles</small></div></div>
          <div className="dashboard-layer-list">
            <div><span className="layer-mark skin-mark" />Piel<span>3D</span></div>
            <div><span className="layer-mark bone-mark" />Huesos<span>3D</span></div>
            <div><span className="layer-mark organ-mark" />Órganos<span>3D</span></div>
            <div><span className="layer-mark vein-mark" />Venas<span>3D</span></div>
          </div>
          <Link className="button dashboard-layer-link" to="/viewer/demo">Abrir visor anatómico</Link>
        </article>

        <article className="panel activity-panel">
          <div className="panel-title"><h2>Expedientes recientes</h2><Link to="/profiles">Ver todos →</Link></div>
          {profiles.length === 0 ? (
            <div className="activity-empty"><span>＋</span><p>No hay expedientes todavía</p></div>
          ) : (
            <div className="activity-list">{profiles.slice(0, 4).map((profile) => (
              <Link to={`/profiles/${profile.id}/measurements`} key={profile.id}>
                <span className="activity-icon">◉</span><div><strong>{profile.display_code}</strong><small>{profile.status === 'active' ? 'Activo' : 'Archivado'} · {new Date(profile.created_at).toLocaleDateString('es')}</small></div>
              </Link>
            ))}</div>
          )}
        </article>
      </section>
    </div>
  )
}
