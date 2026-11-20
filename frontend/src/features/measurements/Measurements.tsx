import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { apiRequest } from '../../services/api'
import type { Measurement, Profile } from '../../types'

export default function Measurements() {
  const { id = '' } = useParams()
  const [items, setItems] = useState<Measurement[]>([])
  const [metric, setMetric] = useState('waist')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('cm')
  const [method, setMethod] = useState<'manual' | 'device' | 'visual_estimate'>('manual')
  const [message, setMessage] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState(id)
  const metricOptions = [
    { code: 'waist', label: 'Cintura', unit: 'cm' },
    { code: 'hip', label: 'Cadera', unit: 'cm' },
    { code: 'chest', label: 'Pecho', unit: 'cm' },
    { code: 'height', label: 'Altura', unit: 'cm' },
    { code: 'weight', label: 'Peso', unit: 'kg' },
    { code: 'body_fat_pct', label: 'Grasa corporal medida', unit: '%' },
    { code: 'muscle_mass_pct', label: 'Masa muscular medida', unit: '%' },
  ]

  async function load() {
    if (selectedProfile) apiRequest<Measurement[]>(`/profiles/${selectedProfile}/measurements`).then(setItems).catch((e) => setMessage(e.message))
  }
  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then((items) => {
      setProfiles(items)
      if (!selectedProfile && items.length) setSelectedProfile(items[0].id)
    }).catch((e) => setMessage(e.message))
  }, [])
  useEffect(() => { void load() }, [selectedProfile])

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      if (!selectedProfile) {
        setMessage('Selecciona un expediente antes de registrar una medición.')
        return
      }
      await apiRequest(`/profiles/${selectedProfile}/measurements`, {
        method: 'POST',
        body: JSON.stringify({ metric_code: metric, value: Number(value), unit, method, measured_at: new Date().toISOString(), notes: 'Registro creado desde la interfaz' }),
      })
      setValue('')
      setMessage('Medición registrada. El historial conservado no fue reemplazado.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar la medición.')
    }
  }

  const chartData = items.map((item) => ({ date: new Date(item.measured_at).toLocaleDateString(), value: item.value }))

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">EXPEDIENTE / MEDICIONES</p><h1>Mediciones</h1></div>
        <label className="profile-selector">Expediente
          <select value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)}>
            <option value="">Seleccionar expediente</option>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_code} · {profile.display_name}</option>)}
          </select>
        </label>
      </header>
      {message && <div className="alert" role="status">{message}</div>}
      <section className="split-layout">
        <div className="panel">
          <h2>Registrar medición observada</h2>
          <form onSubmit={submit}>
            <label>Métrica<select value={metric} onChange={(e) => {
              const nextMetric = metricOptions.find((option) => option.code === e.target.value)
              setMetric(e.target.value)
              if (nextMetric) setUnit(nextMetric.unit)
            }}>{metricOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>
            <label>Valor<input type="number" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} required /></label>
            <label>Unidad<select value={unit} onChange={(e) => setUnit(e.target.value)}>{(metric === 'height' ? ['cm', 'm'] : [metricOptions.find((option) => option.code === metric)?.unit || unit]).map((option) => <option key={option}>{option}</option>)}</select></label>
            <label>Método<select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}><option value="manual">Manual</option><option value="device">Instrumental</option><option value="visual_estimate">Estimación visual</option></select></label>
            {metric.endsWith('_pct') && <p className="warning">Registra porcentajes únicamente si provienen de un instrumento o protocolo de medición; no se estiman desde una fotografía.</p>}
            {method === 'visual_estimate' && <p className="warning">Esta medición será presentada como estimación visual y no como dato observado.</p>}
            <button className="button primary" type="submit">Guardar medición</button>
          </form>
        </div>
        <div className="panel chart-panel"><h2>Tendencia</h2>
          {chartData.length ? <ResponsiveContainer width="100%" height={260}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" stroke="#35c4dd" strokeWidth={3} /></LineChart></ResponsiveContainer> : <div className="empty-state"><p>No hay mediciones para comparar.</p></div>}
        </div>
      </section>
      <section className="panel"><h2>Historial</h2>
        {items.length ? <table><thead><tr><th>Métrica</th><th>Valor</th><th>Método</th><th>Fecha</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.metric_code}</td><td>{item.value} {item.unit}</td><td>{item.method}</td><td>{new Date(item.measured_at).toLocaleString()}</td></tr>)}</tbody></table> : <div className="empty-state"><p>Sin registros.</p></div>}
      </section>
    </div>
  )
}
