import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest } from '../../services/api'
import type { Profile } from '../../types'

export default function Profiles({ demoMode }: { demoMode: boolean }) {
  const { id } = useParams()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [displayCode, setDisplayCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = () => apiRequest<Profile[]>('/profiles').then(setProfiles).catch((error: unknown) => {
    setMessage(error instanceof Error ? error.message : 'No se pudieron cargar los expedientes.')
    setMessageIsError(true)
  })
  useEffect(() => { void load() }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const code = displayCode.trim()
    const name = displayName.trim()
    if (code.length < 2 || name.length < 2) {
      setMessage('El código y el nombre deben tener al menos 2 caracteres.')
      setMessageIsError(true)
      return
    }

    setSubmitting(true)
    setMessageIsError(false)
    try {
      await apiRequest<Profile>('/profiles', { method: 'POST', body: JSON.stringify({ display_code: code, display_name: name }) })
      setDisplayCode('')
      setDisplayName('')
      setMessage('Expediente creado correctamente.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo crear el expediente.')
      setMessageIsError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">GESTIÓN DE DATOS</p><h1>{id ? 'Ficha de expediente' : 'Expedientes'}</h1></div></header>
      {message && <div className={`alert ${messageIsError ? 'error' : ''}`} role={messageIsError ? 'alert' : 'status'}>{message}</div>}
      <section className="split-layout">
        <div className="panel">
          <h2>Nuevo expediente</h2>
          {demoMode && <p className="warning">El modo de demostración es de solo lectura. No se pueden crear expedientes.</p>}
          <form onSubmit={submit}>
            <label>Código único<input value={displayCode} onChange={(e) => setDisplayCode(e.target.value)} minLength={2} maxLength={64} autoComplete="off" placeholder="Ej. BV-001" required disabled={demoMode} /></label>
            <label>Nombre visible<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} minLength={2} maxLength={255} required disabled={demoMode} /></label>
            <button className="button primary" type="submit" disabled={submitting || demoMode}>{submitting ? 'Creando…' : 'Crear expediente'}</button>
          </form>
        </div>
        <div className="panel">
          <h2>{demoMode ? 'Perfiles sintéticos' : 'Expedientes'}</h2>
          {profiles.length === 0 ? <div className="empty-state"><p>No existen expedientes disponibles.</p></div> :
            <div className="profile-list">{profiles.map((profile) => (
              <article key={profile.id}><div><strong>{profile.display_code}</strong><span>{profile.display_name}</span></div><Link className="button" to={`/profiles/${profile.id}/measurements`}>Mediciones</Link></article>
            ))}</div>}
        </div>
      </section>
    </div>
  )
}
