import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest } from '../../services/api'
import type { Measurement, Profile } from '../../types'
import ScenarioAvatar from './ScenarioAvatar'

import { localId, useStudio } from '../studio/session'
import { PhotoAvatar } from '../studio/PhotoAvatar'
import { series } from '../measurements/results'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function Simulations() {
  const studio=useStudio()
  const { profileId } = useParams()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState(profileId || (studio.capture ? localId : ''))
  const [items, setItems] = useState<Measurement[]>([])
  const [goalHeight,setGoalHeight]=useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [goalWaist, setGoalWaist] = useState('')
  const [goalHip, setGoalHip] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then((list) => {
      setProfiles(list)
      if (list.length) setSelected(current=>current || list[0].id)
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los expedientes.'))
  }, [])

  useEffect(() => {
    let active = true
    setItems([])
    if (!selected || selected===localId) return
    apiRequest<Measurement[]>(`/profiles/${selected}/measurements`)
      .then((records) => { if (active) setItems(records) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las mediciones.') })
    return () => { active = false }
  }, [selected])

  const records=selected===localId ? studio.records : items
  const baseline=useMemo(()=>{
    const active=records.filter(row=>row.profile_id===selected)
    const last=(metric:string)=>series(active,metric).filter(row=>row.method!=='visual_estimate').at(-1)?.value
    return {weight:last('weight'),height:last('height'),waist:last('waist'),hip:last('hip')}
  },[records,selected])
  const {weight:currentWeight,height:currentHeight,waist:currentWaist,hip:currentHip}=baseline
  useEffect(()=>{
    setGoalWeight(String(currentWeight ?? ''))
    setGoalHeight(String(currentHeight ?? ''))
    setGoalWaist(String(currentWaist ?? ''))
    setGoalHip(String(currentHip ?? ''))
  },[baseline])
  const targetHeight=Number(goalHeight)
  const targetWeight = Number(goalWeight)
  const targetWaist = Number(goalWaist)
  const targetHip = Number(goalHip)
  const hasBaseline=Boolean(currentWeight && currentHeight)
  const heightScale=currentHeight && targetHeight>0 ? targetHeight/currentHeight : 1
  const massScale=currentWeight && targetWeight>0 ? Math.sqrt(targetWeight/currentWeight/heightScale) : 1
  const waistScale = currentWaist && targetWaist > 0
    ? clamp(targetWaist / currentWaist, 0.75, 1.25)
    : 1
  const hipScale = currentHip && targetHip > 0
    ? clamp(targetHip / currentHip, 0.75, 1.25)
    : 1
  const modelScale=massScale*Math.sqrt(waistScale*hipScale)
  const modelScaleChange=Math.round((modelScale-1)*100)
  const photo=selected===localId ? studio.capture : null
  const validGoal=targetHeight>=1 && targetHeight<=300 && targetWeight>=0.1 && targetWeight<=650
  const selectedProfile = profiles.find((profile) => profile.id === selected)

  return (
    <div>
      <header className="page-header">
        <div><p className="eyebrow">PLANIFICACIÓN PERSONAL</p><h1>Escenario objetivo</h1></div>
        <label className="profile-selector">Expediente
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="">Seleccionar expediente</option>
            <option value={localId}>Sesión personal local</option>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_code} · {profile.display_name}</option>)}
          </select>
        </label>
      </header>
      {error && <div className="alert error" role="alert">{error}</div>}
      <div className="scenario-disclaimer"><strong>Visualización ilustrativa.</strong> La altura cambia el eje vertical. El peso ajusta el volumen aproximado de la silueta. El resultado ilustra un escenario y no predice la distribución de grasa o músculo. No sustituye una evaluación profesional y tus mediciones actuales no se modifican.</div>
      {!hasBaseline && selected && <div className="alert" role="status">Para una comparación personal, registra primero el peso y la altura actuales. <Link to={`/profiles/${selected}/measurements`}>Añadir mediciones</Link></div>}
      <p><Link to="/capture">{photo ? "Actualizar foto corporal" : "Registrar foto corporal"}</Link> · <Link to={`/profiles/${selected || localId}/measurements`}>Ver mediciones</Link></p>
      <section className="scenario-layout">
        <div className="panel scenario-stage">
          <div className="scenario-comparison">
            <figure className="scenario-figure">
              <figcaption><span className="scenario-status-dot"/> Actual <small>{currentWeight ? `${currentWeight} kg` : 'Sin peso registrado'}</small></figcaption>
              <div className="avatar-stage">{hasBaseline && (photo ? <PhotoAvatar data={photo} height={currentHeight!/photo.cm} width={Math.sqrt(currentWeight!/photo.kg/(currentHeight!/photo.cm))}/> : <ScenarioAvatar />)}</div>
            </figure>
            <div className="scenario-arrow" aria-hidden="true">→</div>
            <figure className="scenario-figure target">
              <figcaption><span className="scenario-status-dot target-dot"/> Objetivo <small>{targetWeight > 0 ? `${targetWeight} kg` : 'Define tus valores'}</small></figcaption>
              <div className="avatar-stage">{hasBaseline && validGoal && (photo ? <PhotoAvatar data={photo} height={targetHeight/photo.cm} width={modelScale*Math.sqrt(currentWeight!/photo.kg/(currentHeight!/photo.cm))}/> : <ScenarioAvatar modelScale={modelScale} heightScale={heightScale}/>)}</div>
              {hasBaseline && validGoal && <span className="scenario-scale-indicator">Escala visual {modelScaleChange > 0 ? '+' : ''}{modelScaleChange}%</span>}
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
          <label>Altura objetivo (cm)<input type="number" step="0.1" min="1" max="300" value={goalHeight} disabled={!hasBaseline} onChange={e=>setGoalHeight(e.target.value)}/></label>
          {hasBaseline && !validGoal && <p role="alert">Introduce una altura entre 1 y 300 cm y un peso entre 0,1 y 650 kg.</p>}
          <label>Peso objetivo <strong>{goalWeight || '—'} kg</strong>
            <input type="range" min={currentWeight ? Math.max(0.1, currentWeight - 20) : 30} max={currentWeight ? Math.min(650,currentWeight + 20) : 150} step="0.1" value={goalWeight || currentWeight || 60} disabled={!hasBaseline} onChange={(event) => setGoalWeight(event.target.value)} />
            <input type="number" min="0.1" max="650" step="0.1" value={goalWeight} disabled={!hasBaseline} onChange={(event) => setGoalWeight(event.target.value)} aria-label="Peso objetivo en kilogramos" />
          </label>
          {currentWaist != null && <label>Cintura objetivo <strong>{goalWaist || '—'} cm</strong>
            <input type="range" min={currentWaist ? Math.max(40, currentWaist - 25) : 40} max={currentWaist ? currentWaist + 25 : 160} step="0.5" value={goalWaist || currentWaist || 80} disabled={!hasBaseline} onChange={(event) => setGoalWaist(event.target.value)} />
            <input type="number" min="40" max="200" step="0.5" value={goalWaist} disabled={!hasBaseline} onChange={(event) => setGoalWaist(event.target.value)} aria-label="Cintura objetivo en centímetros" />
          </label>
          }
          {currentHip != null && <label>Cadera objetivo <strong>{goalHip || '—'} cm</strong>
            <input type="range" min={Math.max(50, currentHip - 25)} max={currentHip + 25} step="0.5" value={goalHip || currentHip} disabled={!hasBaseline} onChange={(event) => setGoalHip(event.target.value)} />
            <input type="number" min="50" max="200" step="0.5" value={goalHip} disabled={!hasBaseline} onChange={(event) => setGoalHip(event.target.value)} aria-label="Cadera objetivo en centímetros" />
          </label>}
          {!selectedProfile && selected!==localId && <p className="empty-note">Selecciona un expediente para configurar el escenario.</p>}
          <div className="scenario-controls-foot">Perfil: {selected===localId ? 'Sesión personal local' : selectedProfile?.display_name || '—'}<br/>Vista previa temporal · No se guarda como medición</div>
        </aside>
      </section>
    </div>
  )
}
