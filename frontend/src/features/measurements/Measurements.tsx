import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { apiRequest } from '../../services/api'
import type { Measurement, Profile } from '../../types'

export default function Measurements({ demoMode }: { demoMode: boolean }) {
  const { id = '' } = useParams()
  const [items, setItems] = useState<Measurement[]>([])
  const [metric, setMetric] = useState('waist')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('cm')
  const [method, setMethod] = useState<'manual' | 'device' | 'visual_estimate'>('manual')
  const [correctionTarget, setCorrectionTarget] = useState<Measurement | null>(null)
  const [correctionValue, setCorrectionValue] = useState('')
  const [correctionUnit, setCorrectionUnit] = useState('cm')
  const [correctionMethod, setCorrectionMethod] = useState<'manual' | 'device' | 'visual_estimate'>('manual')
  const [correctionReason, setCorrectionReason] = useState('')
  const [message, setMessage] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState(id)
  const selectedProfileRef = useRef(selectedProfile)
  selectedProfileRef.current = selectedProfile
  const metricOptions = [
    { code: 'waist', label: 'Cintura', unit: 'cm' },
    { code: 'hip', label: 'Cadera', unit: 'cm' },
    { code: 'chest', label: 'Pecho', unit: 'cm' },
    { code: 'height', label: 'Altura', unit: 'cm' },
    { code: 'weight', label: 'Peso', unit: 'kg' },
    { code: 'body_fat_pct', label: 'Grasa corporal medida', unit: '%' },
    { code: 'muscle_mass_pct', label: 'Masa muscular medida', unit: '%' },
  ]

  async function load(profileId = selectedProfile) {
    if (!profileId) {
      setItems([])
      return
    }
    try {
      setItems(await apiRequest<Measurement[]>(`/profiles/${profileId}/measurements`))
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudieron cargar las mediciones.')
    }
  }
  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then((items) => {
      setProfiles(items)
      if (!selectedProfile && items.length) setSelectedProfile(items[0].id)
    }).catch((e) => setMessage(e.message))
  }, [])
  useEffect(() => {
    let active = true
    setItems([])
    if (!selectedProfile) return
    apiRequest<Measurement[]>(`/profiles/${selectedProfile}/measurements`)
      .then((records) => { if (active) setItems(records) })
      .catch((cause: unknown) => { if (active) setMessage(cause instanceof Error ? cause.message : 'No se pudieron cargar las mediciones.') })
    return () => { active = false }
  }, [selectedProfile])

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      if (!selectedProfile) {
        setMessage('Selecciona un expediente antes de registrar una medición.')
        return
      }
      const profileId = selectedProfile
      await apiRequest(`/profiles/${profileId}/measurements`, {
        method: 'POST',
        body: JSON.stringify({ metric_code: metric, value: Number(value), unit, method, measured_at: new Date().toISOString(), notes: 'Registro creado desde la interfaz' }),
      })
      setValue('')
      setMessage('Medición registrada. El historial conservado no fue reemplazado.')
      if (selectedProfileRef.current === profileId) await load(profileId)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar la medición.')
    }
  }

  function beginCorrection(item: Measurement) {
    setCorrectionTarget(item)
    setCorrectionValue(String(item.value))
    setCorrectionUnit(item.unit)
    setCorrectionMethod(item.method === 'device' ? 'device' : 'manual')
    setCorrectionReason('')
    setMessage('')
  }

  async function submitCorrection(event: FormEvent) {
    event.preventDefault()
    if (!selectedProfile || !correctionTarget) return
    try {
      const profileId = selectedProfile
      await apiRequest(
        `/profiles/${profileId}/measurements/${correctionTarget.id}/corrections`,
        {
          method: 'POST',
          body: JSON.stringify({
            metric_code: correctionTarget.metric_code,
            value: Number(correctionValue),
            unit: correctionUnit,
            method: correctionMethod,
            measured_at: correctionTarget.measured_at,
            notes: correctionReason.trim(),
          }),
        },
      )
      setCorrectionTarget(null)
      setMessage('Corrección registrada como nueva versión; el dato anterior se conserva.')
      if (selectedProfileRef.current === profileId) await load(profileId)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo corregir la medición.')
    }
  }

  const metricDefinition = metricOptions.find((option) => option.code === metric)
  const chartData = items
    .filter((item) => item.metric_code === metric)
    .map((item) => ({
      date: new Date(item.measured_at).toLocaleDateString('es'),
      value: item.unit === 'm' && ['height', 'waist', 'hip', 'chest'].includes(item.metric_code) ? item.value * 100 : item.value,
    }))

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
          {demoMode && <p className="warning">El modo de demostración es de solo lectura. Las mediciones visibles son sintéticas y no se pueden modificar.</p>}
          <form onSubmit={submit}>
            <fieldset className="demo-disabled-fieldset" disabled={demoMode}>
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
            </fieldset>
          </form>
        </div>
        <div className="panel chart-panel"><h2>Tendencia · {metricDefinition?.label} ({metricDefinition?.unit})</h2>
          {chartData.length ? <ResponsiveContainer width="100%" height={260}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis unit={` ${metricDefinition?.unit || ''}`} /><Tooltip formatter={(chartValue) => [`${Number(chartValue).toLocaleString('es')} ${metricDefinition?.unit || ''}`, metricDefinition?.label || 'Valor']} /><Line type="monotone" dataKey="value" stroke="#35c4dd" strokeWidth={3} /></LineChart></ResponsiveContainer> : <div className="empty-state"><p>No hay mediciones de esta métrica para comparar.</p></div>}
        </div>
      </section>
      {correctionTarget && <section className="panel">
        <h2>Corrección no destructiva · {correctionTarget.metric_code}</h2>
        <p>La medición original se conservará en el historial. Registra el motivo de la corrección.</p>
        <form onSubmit={submitCorrection}>
          <label>Valor corregido<input type="number" step="0.1" min="0" value={correctionValue} onChange={(event) => setCorrectionValue(event.target.value)} required /></label>
          <label>Unidad<select value={correctionUnit} onChange={(event) => setCorrectionUnit(event.target.value)}>{(correctionTarget.metric_code === 'height' || ['waist', 'hip', 'chest'].includes(correctionTarget.metric_code) ? ['cm', 'm'] : [correctionTarget.unit]).map((option) => <option key={option}>{option}</option>)}</select></label>
          <label>Método<select value={correctionMethod} onChange={(event) => setCorrectionMethod(event.target.value as typeof correctionMethod)}><option value="manual">Manual</option><option value="device">Instrumental</option><option value="visual_estimate">Estimación visual</option></select></label>
          <label>Motivo<input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} maxLength={2000} required /></label>
          <div className="form-actions"><button className="button primary" type="submit">Guardar corrección</button><button className="button" type="button" onClick={() => setCorrectionTarget(null)}>Cancelar</button></div>
        </form>
      </section>}
      <section className="panel"><h2>Historial</h2>
        {items.length ? <table><thead><tr><th>Métrica</th><th>Valor</th><th>Método</th><th>Fecha</th><th>Trazabilidad</th><th>Acción</th></tr></thead><tbody>{items.map((item) => {
          const alreadyCorrected = items.some((candidate) => candidate.supersedes_id === item.id)
          return <tr key={item.id}><td>{item.metric_code}</td><td>{item.value} {item.unit}</td><td>{item.method === 'simulated' ? 'Simulado' : item.method}</td><td>{new Date(item.measured_at).toLocaleString()}</td><td>{item.supersedes_id ? `Corrige ${item.supersedes_id.slice(0, 8)}` : 'Original'}</td><td><button className="button" type="button" disabled={demoMode || item.method === 'simulated' || alreadyCorrected} onClick={() => beginCorrection(item)}>Corregir</button></td></tr>
        })}</tbody></table> : <div className="empty-state"><p>Sin registros.</p></div>}
      </section>
    </div>
  )
}
