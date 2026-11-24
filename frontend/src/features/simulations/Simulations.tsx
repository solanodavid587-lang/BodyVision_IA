import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest } from '../../services/api'
import type { Measurement, Profile } from '../../types'
import ScenarioAvatar from './ScenarioAvatar'

function latest(items: Measurement[], metric: string) {
  return items.filter((item) => item.metric_code === metric).at(-1)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function Simulations() {
  const { profileId } = useParams()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState(profileId || '')
  const [items, setItems] = useState<Measurement[]>([])
  const [goalWeight, setGoalWeight] = useState('')
  const [goalWaist, setGoalWaist] = useState('')
  const [goalHip, setGoalHip] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then((list) => {
      setProfiles(list)
      if (!selected && list.length) setSelected(list[0].id)
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los expedientes.'))
  }, [])

  useEffect(() => {
    let active = true
    setItems([])
    if (!selected) return
    apiRequest<Measurement[]>(`/profiles/${selected}/measurements`)
      .then((records) => { if (active) setItems(records) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las mediciones.') })
    return () => { active = false }
  }, [selected])

  const baseline = useMemo(() => ({
    weight: latest(items, 'weight'),
    waist: latest(items, 'waist'),
    hip: latest(items, 'hip'),
  }), [items])

  useEffect(() => {
    setGoalWeight(baseline.weight ? String(baseline.weight.value) : '')
    setGoalWaist(baseline.waist ? String(baseline.waist.value) : '')
    setGoalHip(baseline.hip ? String(baseline.hip.value) : '')
  }, [baseline.weight?.id, baseline.waist?.id, baseline.hip?.id])

  const currentWeight = baseline.weight?.value
  const currentWaist = baseline.waist?.value
  const currentHip = baseline.hip?.value
  const targetWeight = Number(goalWeight)
  const targetWaist = Number(goalWaist)
  const targetHip = Number(goalHip)
  const hasBaseline = Boolean(currentWeight && currentWaist)
  const massScale = currentWeight && targetWeight > 0
    ? clamp(Math.cbrt(targetWeight / currentWeight), 0.78, 1.25)
    : 1
  const waistScale = currentWaist && targetWaist > 0
    ? clamp(targetWaist / currentWaist, 0.75, 1.25)
    : 1
  const hipScale = currentHip && targetHip > 0
    ? clamp(targetHip / currentHip, 0.75, 1.25)
    : 1
  const modelScale = clamp(1 + ((massScale + waistScale + hipScale) / 3 - 1) * 2, 0.65, 1.45)
  const modelScaleChange = Math.round((modelScale - 1) * 100)
  const selectedProfile = profiles.find((profile) => profile.id === selected)

  return (
    <div>
      <header className="page-header">
        <div><p className="eyebrow">PLANIFICACIÓN PERSONAL</p><h1>Escenario objetivo</h1></div>
        <label className="profile-selector">Expediente
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="">Seleccionar expediente</option>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_code} · {profile.display_name}</option>)}
          </select>
        </label>
      </header>
      {error && <div className="alert error" role="alert">{error}</div>}
      <div className="scenario-disclaimer"><strong>Visualización ilustrativa.</strong> El atlas anatómico es genérico y la escala horizontal del objetivo se amplifica para que el cambio sea visible; no representa un cuerpo personalizado ni predice la distribución real de grasa o músculo. No sustituye una evaluación profesional y tus mediciones actuales no se modifican.</div>
      {!hasBaseline && selected && <div className="alert" role="status">Para una comparación personal, registra primero el peso y la cintura actuales. <Link to={`/profiles/${selected}/measurements`}>Añadir mediciones</Link></div>}
      <section className="scenario-layout">
        <div className="panel scenario-stage">
          <div className="scenario-comparison">
            <figure className="scenario-figure">
              <figcaption><span className="scenario-status-dot"/> Actual <small>{currentWeight ? `${currentWeight} kg` : 'Sin peso registrado'}</small></figcaption>
              <div className="avatar-stage">{hasBaseline && <ScenarioAvatar />}</div>
            </figure>
            <div className="scenario-arrow" aria-hidden="true">→</div>
            <figure className="scenario-figure target">
              <figcaption><span className="scenario-status-dot target-dot"/> Objetivo <small>{targetWeight > 0 ? `${targetWeight} kg` : 'Define tus valores'}</small></figcaption>
              <div className="avatar-stage">{hasBaseline && <ScenarioAvatar modelScale={modelScale} />}</div>
              {hasBaseline && <span className="scenario-scale-indicator">Escala visual {modelScaleChange > 0 ? '+' : ''}{modelScaleChange}%</span>}
            </figure>
          </div>
          <div className="scenario-metrics">
            <div><span>Peso actual</span><strong>{currentWeight ? `${currentWeight} kg` : '—'}</strong></div>
            <div><span>Peso objetivo</span><strong>{currentWeight && targetWeight > 0 ? `${targetWeight > currentWeight ? '+' : ''}${(targetWeight - currentWeight).toFixed(1)} kg` : '—'}</strong></div>
            <div><span>Cintura objetivo</span><strong>{currentWaist && targetWaist > 0 ? `${targetWaist} cm` : '—'}</strong></div>
          </div>
        </div>
        <aside className="panel scenario-controls">
          <div className="scenario-controls-heading"><span className="eyebrow">PARÁMETROS</span><span className="scenario-tag">Vista previa</span></div>
          <label>Peso objetivo <strong>{goalWeight || '—'} kg</strong>
            <input type="range" min={currentWeight ? Math.max(30, currentWeight - 20) : 30} max={currentWeight ? currentWeight + 20 : 150} step="0.1" value={goalWeight || currentWeight || 60} disabled={!hasBaseline} onChange={(event) => setGoalWeight(event.target.value)} />
            <input type="number" min="30" max="300" step="0.1" value={goalWeight} disabled={!hasBaseline} onChange={(event) => setGoalWeight(event.target.value)} aria-label="Peso objetivo en kilogramos" />
          </label>
          <label>Cintura objetivo <strong>{goalWaist || '—'} cm</strong>
            <input type="range" min={currentWaist ? Math.max(40, currentWaist - 25) : 40} max={currentWaist ? currentWaist + 25 : 160} step="0.5" value={goalWaist || currentWaist || 80} disabled={!hasBaseline} onChange={(event) => setGoalWaist(event.target.value)} />
            <input type="number" min="40" max="200" step="0.5" value={goalWaist} disabled={!hasBaseline} onChange={(event) => setGoalWaist(event.target.value)} aria-label="Cintura objetivo en centímetros" />
          </label>
          {currentHip != null && <label>Cadera objetivo <strong>{goalHip || '—'} cm</strong>
            <input type="range" min={Math.max(50, currentHip - 25)} max={currentHip + 25} step="0.5" value={goalHip || currentHip} disabled={!hasBaseline} onChange={(event) => setGoalHip(event.target.value)} />
            <input type="number" min="50" max="200" step="0.5" value={goalHip} disabled={!hasBaseline} onChange={(event) => setGoalHip(event.target.value)} aria-label="Cadera objetivo en centímetros" />
          </label>}
          {!selectedProfile && <p className="empty-note">Selecciona un expediente para configurar el escenario.</p>}
          <div className="scenario-controls-foot">Perfil: {selectedProfile?.display_name || '—'}<br/>Vista previa temporal · No se guarda como medición</div>
        </aside>
      </section>
    </div>
  )
}
