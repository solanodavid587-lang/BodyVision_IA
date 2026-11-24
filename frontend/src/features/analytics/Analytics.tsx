import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiRequest } from '../../services/api'
import type { Measurement, Profile } from '../../types'
import {
  AnatomyCanvas,
  defaultLayerOpacity,
  initialVisibleLayers,
  type AnatomyLayerId,
} from '../body-viewer/AnatomyCanvas'

const analyticsLayerIds: AnatomyLayerId[] = ['skin', 'skeleton']

const metricOptions = [
  { code: 'weight', label: 'Peso', unit: 'kg', color: '#35c4dd' },
  { code: 'waist', label: 'Cintura', unit: 'cm', color: '#d9c05c' },
  { code: 'hip', label: 'Cadera', unit: 'cm', color: '#c75fe8' },
  { code: 'height', label: 'Estatura', unit: 'cm', color: '#72d59a' },
  { code: 'body_fat_pct', label: 'Grasa corporal', unit: '%', color: '#ff9c6e' },
  { code: 'muscle_mass_pct', label: 'Masa muscular', unit: '%', color: '#8b9bff' },
]

function normalizeValue(item: Measurement) {
  if (['height', 'waist', 'hip'].includes(item.metric_code) && item.unit === 'm') return item.value * 100
  return item.value
}

export default function Analytics() {
  const { profileId } = useParams()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState(profileId || '')
  const [selectedMetric, setSelectedMetric] = useState('weight')
  const [items, setItems] = useState<Measurement[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then((list) => {
      setProfiles(list)
      if (!selected && list.length) setSelected(list[0].id)
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los expedientes.'))
  }, [])

  useEffect(() => {
    let active = true
    setItems([])
    if (!selected) return
    apiRequest<Measurement[]>(`/profiles/${selected}/measurements`)
      .then((records) => { if (active) setItems(records) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las mediciones.') })
    return () => { active = false }
  }, [selected])

  const availableMetrics = metricOptions.filter((option) => items.some((item) => item.metric_code === option.code))
  const activeMetric = availableMetrics.find((option) => option.code === selectedMetric)
  const chartData = useMemo(() => items
    .filter((item) => item.metric_code === selectedMetric)
    .map((item) => ({
      timestamp: new Date(item.measured_at).getTime(),
      date: new Date(item.measured_at).toLocaleDateString('es'),
      value: normalizeValue(item),
    }))
    .sort((a, b) => a.timestamp - b.timestamp), [items, selectedMetric])

  useEffect(() => {
    if (availableMetrics.length && !availableMetrics.some((option) => option.code === selectedMetric)) {
      setSelectedMetric(availableMetrics[0].code)
    }
  }, [availableMetrics, selectedMetric])

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">ANÁLISIS TEMPORAL</p><h1>Analítica IA</h1></div>
        <div className="analysis-header-actions">
          <label className="profile-selector">Expediente<select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Seleccionar expediente</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_code} · {profile.display_name}</option>)}</select></label>
          <label className="profile-selector">Métrica<select value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value)} disabled={!availableMetrics.length}>{availableMetrics.map((option) => <option key={option.code} value={option.code}>{option.label} ({option.unit})</option>)}</select></label>
        </div>
      </header>
      {error && <div className="alert error" role="alert">{error}</div>}
      <section className="analytics-view-grid">
        <article className="panel analytics-scan-panel">
          <div className="analysis-panel-heading"><div><h2>Modelo 3D del expediente</h2><p>Escaneo sintético · vista corporal</p></div><span className="analysis-pill complete">360°</span></div>
          <div className="analysis-scan-viewport">
            <div className="dashboard-scan-grid" aria-hidden="true" />
            <div className="dashboard-scan-rings" aria-hidden="true"><span /><span /><span /></div>
            <AnatomyCanvas className="analysis-model-canvas" layerIds={analyticsLayerIds} visibleLayers={initialVisibleLayers} layerOpacity={defaultLayerOpacity} wireframe={false} autoRotate scanMode />
            <div className="dashboard-scan-sweep" aria-hidden="true" />
            <span className="dashboard-scan-reticle" aria-hidden="true">{profiles.find((profile) => profile.id === selected)?.display_code || 'BODY'} · 3D</span>
            <span className="dashboard-scan-axis axis-x" aria-hidden="true">X</span>
            <span className="dashboard-scan-axis axis-y" aria-hidden="true">Y</span>
          </div>
          <p className="analytics-scan-note">Modelo demostrativo asociado al expediente seleccionado.</p>
        </article>
        <article className="panel chart-panel"><h2>Evolución registrada{activeMetric ? ` · ${activeMetric.label} (${activeMetric.unit})` : ''}</h2>
        {chartData.length && activeMetric ? <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis unit={` ${activeMetric.unit}`} />
            <Tooltip formatter={(value) => [`${Number(value).toLocaleString('es')} ${activeMetric.unit}`, activeMetric.label]} />
            <Line type="monotone" dataKey="value" name={activeMetric.label} stroke={activeMetric.color} strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer> : <div className="empty-state"><h3>Sin series compatibles</h3><p>Registra mediciones observadas para generar una comparación temporal.</p></div>}
        </article>
      </section>
    </div>
  )
}
