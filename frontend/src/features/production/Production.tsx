import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { apiRequest, setTokenProvider } from '../../services/api'
import { loadSession, logout, session } from '../../services/identity'
import Profiles from '../profiles/Profiles'
import Measurements from '../measurements/Measurements'
import Reports from '../reports/Reports'
import Simulations from '../simulations/Simulations'
import Capture from '../capture/Capture'
import FaceCamera from '../studio/FaceCamera'
import { StudioProvider, useStudio } from '../studio/session'

import { ConsentGuard } from './ConsentGuard'

const purposes = { measurements: 'Registro de mediciones', body_capture: 'Captura corporal', face_capture: 'Captura facial' } as const
type Purpose = keyof typeof purposes
type Consent = { id:string; purpose:string; policy_version:string; revoked_at:string|null }

function ConsentPage() {
  const { id = '' } = useParams()
  const [items,setItems] = useState<Consent[]>([])
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  const studio = useStudio()
  const base = '/profiles/'+encodeURIComponent(id)+'/consents'
  useEffect(()=>{
    let active=true
    apiRequest<Consent[]>(base).then(rows=>{if(active)setItems(rows)}).catch(e=>{if(active)setError(e.message)})
    return ()=>{active=false}
  },[base])
  async function change(purpose:Purpose, current?:Consent) {
    setBusy(true);setError('')
    try {
      const row=await apiRequest<Consent>(current ? base+'/'+current.id+'/revoke' : base, {
        method:'POST', body:current ? undefined : JSON.stringify({purpose,policy_version:'1.0'})
      })
      setItems(list=>[...list.filter(item=>item.id!==row.id),row])
      if(current) studio.clear(id)
    } catch(e) {setError(e instanceof Error ? e.message : 'Error al guardar el consentimiento.')}
    finally {setBusy(false)}
  }
  return <section className="panel"><h1>Consentimientos del expediente</h1><p>Registra cada finalidad únicamente tras recibir la autorización de la persona. Versión 1.0.</p>
    {error && <p role="alert">{error}</p>}
    {Object.entries(purposes).map(([key,label])=>{
      const purpose=key as Purpose
      const last=items.filter(row=>row.purpose===purpose).at(-1)
      const current=last && !last.revoked_at && last.policy_version==='1.0' ? last : undefined
      return <article key={key}><h2>{label}</h2><button className="button" disabled={busy} onClick={()=>change(purpose,current)}>{current?'Revocar':'Registrar autorización'}</button>
        {current && <Link className="button" to={purpose==='measurements' ? '/profiles/'+id+'/measurements' : '/'+(purpose==='body_capture'?'capture':'face')+'/'+id}>Abrir módulo</Link>}
      </article>
    })}
  </section>
}

function AuthorizedCapture({face=false}: {face?:boolean}) {
  const {profileId=''} = useParams()
  const purpose = face ? 'face_capture' : 'body_capture'
  return <ConsentGuard key={purpose+profileId} purpose={purpose} id={profileId}>
    {face ? <FaceCamera enterprise/> : <Capture enterprise/>}
  </ConsentGuard>
}


function ProductionRoutes() {
  const {id=''}=useParams()
  return <ConsentPage key={id}/>
}

export default function Production() {
  const [signed,setSigned]=useState(false)
  const [pending,setPending]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{
    let active=true
    let cleanup: (()=>void) | undefined
    async function init() {
      const user=await loadSession()
      if (!active || !user || user.expired) return
      const expire=()=>{setTokenProvider(undefined);setSigned(false);setError('La sesión ha vencido.')}
      session().events.addAccessTokenExpired(expire)
      cleanup=()=>session().events.removeAccessTokenExpired(expire)
      setTokenProvider(async ()=>{
        const current=await session().getUser()
        if(!current || current.expired) {expire();throw Error('Inicia sesión nuevamente.')}
        return current.access_token
      })
      setSigned(true)
    }
    init().catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setPending(false)})
    return ()=>{active=false;cleanup?.();setTokenProvider(undefined)}
  },[])
  if(!signed) return <main className="panel"><h1>BodyVision · Acceso profesional</h1>{error && <p role="alert">{error}</p>}
    <button className="button primary" disabled={pending} onClick={async()=>{try {await session().signinRedirect()}catch(e){setError(e instanceof Error?e.message:'No se pudo iniciar sesión.')}}}>Iniciar sesión</button></main>
  return <StudioProvider><div className="app-shell"><aside className="sidebar"><div className="brand">BODYVISION</div><nav>
    <Link to="/">Expedientes</Link><Link to="/reports">Reportes</Link><Link to="/simulations">Simulador</Link>
    <button className="button" onClick={()=>{setSigned(false);setTokenProvider(undefined);void logout()}}>Cerrar sesión</button></nav></aside>
    <main className="main-content"><Routes>
      <Route path="/" element={<Profiles demoMode={false}/>}/>
      <Route path="/profiles" element={<Profiles demoMode={false}/>}/>
      <Route path="/profiles/:id/consents" element={<ProductionRoutes/>}/>
      <Route path="/profiles/:id/measurements" element={<Measurements demoMode={false}/>}/>
      <Route path="/capture/:profileId" element={<AuthorizedCapture/>}/>
      <Route path="/face/:profileId" element={<AuthorizedCapture face/>}/>
      <Route path="/simulations/:profileId?" element={<Simulations enterprise/>}/>
      <Route path="/reports" element={<Reports/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes></main></div></StudioProvider>
}
