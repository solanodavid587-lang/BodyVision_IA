import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../services/api'
import type { Profile } from '../../types'

export default function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then(setProfiles).catch((e) => setError(e.message))
  }, [])

  const activeProfiles = profiles.filter((p) => p.status === 'active').length

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">4. Dashboard General</p>
          <h1>Dashboard</h1>
        </div>
        <div className="dashboard-user">
          <span className="status-dot" />
          <div className="user-avatar">DM</div>
          <div><strong>Dr. Martínez</strong><small>Administrador</small></div>
        </div>
      </header>
      <section className="welcome-row">
        <div><h2>Bienvenido, Dr. Martínez</h2><p>Tu plataforma de análisis corporal inteligente</p></div>
        <Link className="button primary compact" to="/profiles">Nuevo expediente</Link>
      </section>
      {error && <div className="alert error" role="alert">{error}</div>}
      <section className="stats-grid" aria-label="Resumen">
        <article className="stat-card cyan"><div className="stat-icon">◉</div><div><strong>{activeProfiles}</strong><span>Expedientes activos</span></div></article>
        <article className="stat-card mint"><div className="stat-icon">▣</div><div><strong>{profiles.length}</strong><span>Mediciones</span></div></article>
        <article className="stat-card purple"><div className="stat-icon">♟</div><div><strong>0</strong><span>Análisis IA</span></div></article>
        <article className="stat-card blue"><div className="stat-icon">◎</div><div><strong>98.7%</strong><span>Precisión</span></div></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel body-panel">
          <div className="body-grid" aria-label="Modelo corporal">
            <div className="scan-rings"><div className="human-silhouette"><span className="head"/><span className="torso"/><span className="arm left"/><span className="arm right"/><span className="leg left"/><span className="leg right"/></div></div>
            <div className="platform platform-top"/><div className="platform platform-bottom"/>
          </div>
          <div className="body-controls"><span>‹</span><span>⌂</span><span>›</span></div>
        </article>
        <article className="panel evolution-panel">
          <div className="panel-title"><h2>Evolución Corporal</h2><span className="live-dot">En vivo</span></div>
          <div className="chart-wrap">
            <div className="chart-y"><span>100</span><span>80</span><span>60</span><span>40</span><span>20</span></div>
            <svg className="line-chart" viewBox="0 0 520 210" role="img" aria-label="Gráfico de evolución corporal">
              <g className="grid-lines"><line x1="0" y1="20" x2="520" y2="20"/><line x1="0" y1="65" x2="520" y2="65"/><line x1="0" y1="110" x2="520" y2="110"/><line x1="0" y1="155" x2="520" y2="155"/><line x1="0" y1="200" x2="520" y2="200"/></g>
              <polyline className="chart-blue" points="20,170 100,145 180,112 260,95 340,78 420,62 500,48"/>
              <polyline className="chart-yellow" points="20,164 100,150 180,125 260,118 340,92 420,76 500,58"/>
              <g className="chart-points"><circle cx="20" cy="170" r="4"/><circle cx="100" cy="145" r="4"/><circle cx="180" cy="112" r="4"/><circle cx="260" cy="95" r="4"/><circle cx="340" cy="78" r="4"/><circle cx="420" cy="62" r="4"/><circle cx="500" cy="48" r="4"/></g>
            </svg>
            <div className="chart-x"><span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span></div>
          </div>
          <div className="chart-legend"><span><i className="cyan-key"/>Peso</span><span><i className="yellow-key"/>Grasa %</span></div>
        </article>
        <article className="panel composition-panel">
          <h2>Composición Corporal</h2>
          <div className="composition-ring"><div><strong>68.4%</strong><span>Masa magra</span></div></div>
          <div className="composition-list"><div><span><i className="cyan-key"/> Masa Magra</span><strong>68.4%</strong></div><div><span><i className="yellow-key"/> Masa Grasa</span><strong>31.6%</strong></div></div>
        </article>
        <article className="panel activity-panel">
          <div className="panel-title"><h2>Actividad Reciente</h2><Link to="/profiles">Ver todos →</Link></div>
          {profiles.length === 0 ? (
            <div className="activity-empty"><span>＋</span><p>No hay actividad reciente</p></div>
          ) : (
            <div className="activity-list">{profiles.slice(0, 4).map((profile) => (
              <Link to={`/profiles/${profile.id}/measurements`} key={profile.id}>
                <span className="activity-icon">◉</span><div><strong>{profile.display_name}</strong><small>{profile.display_code} · Expediente actualizado</small></div>
              </Link>
            ))}</div>
          )}
        </article>
      </section>
    </div>
  )
}
