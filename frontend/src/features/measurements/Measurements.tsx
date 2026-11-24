import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { apiRequest } from '../../services/api'
import type { Measurement, Profile } from '../../types'

import { localId, useStudio } from '../studio/session'
import { series, validateValue } from './results'

export default function Measurements({ demoMode }: { demoMode: boolean }) {
  const { id = '' } = useParams()
  const studio = useStudio()
  const [filterMethod,setFilterMethod] = useState('all')
  const [remoteItems, setItems] = useState<Measurement[]>([])
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
  const [selectedProfile, setSelectedProfile] = useState(id || (studio.capture ? localId : ''))
  const local = selectedProfile === localId || studio.localProfiles.some((profile) => profile.id === selectedProfile)
  const localRecords = studio.records.filter((row) => row.profile_id === selectedProfile)
  const items = local ? localRecords : [...remoteItems.filter(row=>row.profile_id===selectedProfile), ...localRecords]
  const readOnly = demoMode && !local
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
      const records = await apiRequest<Measurement[]>(`/profiles/${profileId}/measurements`)
      if (selectedProfileRef.current === profileId) setItems(records)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudieron cargar las mediciones.')
    }
  }
  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then((items) => {
      setProfiles(items)
      if (items.length || studio.localProfiles.length) {
        setSelectedProfile(current => current || studio.localProfiles[0]?.id || items[0]?.id || '')
      }
    }).catch((e) => setMessage(e.message))
  }, [studio.localProfiles])
  useEffect(() => {
    let active = true
    setItems([])
    if (!selectedProfile || local) return
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
      const invalid = validateValue(metric, Number(value), method)
      if (invalid) {setMessage(invalid); return}
      if (local) {studio.add(metric,Number(value),unit,method,undefined,undefined,selectedProfile);setValue('');setMessage('Medición registrada en la sesión local.');return}
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
    const invalid = validateValue(correctionTarget.metric_code,Number(correctionValue),correctionMethod)
    if (invalid || !correctionReason.trim()) {setMessage(invalid || 'Indica el motivo.');return}
    if (local) {
      studio.add(correctionTarget.metric_code,Number(correctionValue),correctionUnit,correctionMethod,correctionTarget,correctionReason.trim(),selectedProfile)
      setCorrectionTarget(null);setMessage('Corrección registrada en la sesión local.');return
    }
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
  const chartData = series(items,metric,filterMethod)
  const last = chartData.at(-1)
  const delta = last && chartData.length>1 ? last.value-chartData[0].value : null
  const fmt = (value:number) => value.toLocaleString('es-PE',{maximumFractionDigits:2})
  const date = (value:number) => new Date(value).toLocaleDateString('es-PE',{day:'numeric',month:'short'})
  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">EXPEDIENTE / MEDICIONES</p><h1>Mediciones</h1></div>
        <label className="profile-selector">Expediente
          <select value={selectedProfile} onChange={(e) => {setSelectedProfile(e.target.value);setCorrectionTarget(null);setMessage('')}}>
            <option value="">Seleccionar expediente</option>
            <option value={localId}>Sesión personal local</option>
            {studio.localProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_code} · {profile.display_name} (local)</option>)}
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_code} · {profile.display_name}</option>)}
          </select>
        </label>
      </header>
      {message && <div className="alert" role="status">{message}</div>}
      <section className="split-layout">
        <div className="panel">
          <h2>Registrar medición observada</h2>
          {readOnly && <p className="warning">El modo de demostración es de solo lectura. Las mediciones visibles son sintéticas y no se pueden modificar.</p>}
          <form onSubmit={submit}>
            <fieldset className="demo-disabled-fieldset" disabled={readOnly}>
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
          <label>Métrica del gráfico<select value={metric} onChange={e=>{setMetric(e.target.value);setUnit(metricOptions.find(o=>o.code===e.target.value)!.unit)}}>{metricOptions.map(o=><option key={o.code} value={o.code}>{o.label}</option>)}</select></label>
          <label>Origen<select value={filterMethod} onChange={e=>setFilterMethod(e.target.value)}><option value="all">Todos los métodos</option><option value="manual">Manual</option><option value="device">Instrumental</option><option value="visual_estimate">Estimación visual</option><option value="simulated">Simulado</option></select></label>
          {last ? <><div className="trend-summary"><span>Último valor<strong>{fmt(last.value)} {metricDefinition?.unit}</strong></span><span>Cambio desde el primero<strong>{delta===null?'—':(delta>0?'+':'')+fmt(delta)+' '+(metricDefinition?.unit==='%'?'p.p.':metricDefinition?.unit)}</strong></span><span>Registros vigentes<strong>{chartData.length}</strong></span></div>
          <ResponsiveContainer width="100%" height={260}><LineChart data={chartData} margin={{top:12,right:20,bottom:10,left:8}}><CartesianGrid stroke="#29445b" vertical={false}/><XAxis dataKey="time" type="number" domain={['dataMin','dataMax']} tickFormatter={date} minTickGap={36}/><YAxis domain={['auto','auto']} width={65}/><Tooltip labelFormatter={v=>new Date(Number(v)).toLocaleString('es-PE')} formatter={v=>[fmt(Number(v))+' '+metricDefinition?.unit,metricDefinition?.label]}/><Line dataKey="value" type="linear" stroke="#39d7c4" strokeWidth={3} dot={{r:4}}/></LineChart></ResponsiveContainer></> : <p>Sin registros vigentes para este filtro.</p>}
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
          return <tr key={item.id}><td>{item.metric_code}{item.method === 'simulated' && item.notes && <small>{item.notes}</small>}</td><td>{item.value} {item.unit}</td><td>{item.method === 'simulated' ? 'Simulado' : item.method}</td><td>{new Date(item.measured_at).toLocaleString()}</td><td>{item.supersedes_id ? `Corrige ${item.supersedes_id.slice(0, 8)}` : 'Original'}</td><td><button className="button" type="button" disabled={readOnly || item.method === 'simulated' || alreadyCorrected} onClick={() => beginCorrection(item)}>Corregir</button></td></tr>
        })}</tbody></table> : <div className="empty-state"><p>Sin registros.</p></div>}
      </section>
    </div>
  )
}
