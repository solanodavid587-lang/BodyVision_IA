import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'
import type { Profile } from '../../types'

export default function Administration() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [serviceStatus, setServiceStatus] = useState('Comprobando...')
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then(setProfiles).catch((e) => setError(e.message))
    apiRequest<{ status: string }>('/health').then((health) => setServiceStatus(health.status === 'ok' ? 'Operativo' : 'No disponible')).catch(() => setServiceStatus('No disponible'))
  }, [])

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">CONFIGURACIÓN DEL SISTEMA</p><h1>Administración</h1></div></header>
      {error && <div className="alert error" role="alert">{error}</div>}
      <section className="stats-grid" aria-label="Estado administrativo">
        <article><span>API</span><strong>{serviceStatus}</strong></article>
        <article><span>Expedientes</span><strong>{profiles.length}</strong></article>
        <article><span>Activos</span><strong>{profiles.filter((profile) => profile.status === 'active').length}</strong></article>
        <article><span>Modo</span><strong>Local</strong></article>
      </section>
      <section className="panel">
        <h2>Política operativa</h2>
        <div className="admin-grid">
          <div><strong>Protección de datos</strong><p>Usar únicamente datos autorizados y consentimientos vigentes.</p></div>
          <div><strong>Versionado</strong><p>Las mediciones conservan su método, unidad y fecha de registro.</p></div>
          <div><strong>Diagnóstico</strong><p>El sistema no emite diagnósticos médicos automáticos.</p></div>
          <div><strong>Activos 3D</strong><p>Los modelos demostrativos deben reemplazarse antes de producción.</p></div>
        </div>
      </section>
    </div>
  )
}
