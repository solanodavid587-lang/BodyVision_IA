import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { apiRequest } from '../services/api'
import Dashboard from '../features/dashboard/Dashboard'
import Profiles from '../features/profiles/Profiles'
import Measurements from '../features/measurements/Measurements'
import Capture from '../features/capture/Capture'
import PoseAnalysis from '../features/pose-analysis/PoseAnalysis'
import BodyViewer from '../features/body-viewer/BodyViewer'
import Analytics from '../features/analytics/Analytics'
import Simulations from '../features/simulations/Simulations'
import Reports from '../features/reports/Reports'
import Administration from '../features/admin/Administration'

const nav = [
  ['/', 'Dashboard', 'grid'],
  ['/profiles', 'Expedientes', 'folder'],
  ['/measurements', 'Mediciones', 'ruler'],
  ['/capture', 'Captura Corporal', 'camera'],
  ['/viewer/demo', 'Anatomía 3D', 'cube'],
  ['/analytics/pose', 'Analítica IA', 'chart'],
  ['/simulations', 'Simulador', 'pulse'],
  ['/reports', 'Reportes', 'report'],
  ['/admin', 'Administración', 'admin'],
]

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    folder: <path d="M3 7.5h7l2 2h9v9H3z"/>,
    camera: <><path d="M3 7h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="3"/></>,
    cube: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zm0 9 8-4.5M12 12 4 7.5M12 12v9"/>,
    chart: <><path d="M4 20V10m5 10V4m6 16v-7m5 7V7"/><path d="M2 20h20"/></>,
    pulse: <><path d="M3 12h4l2-5 4 10 3-7 2 4h3"/><circle cx="12" cy="12" r="9"/></>,
    report: <><path d="M5 3h11l3 3v15H5z"/><path d="M16 3v4h4M8 11h8M8 15h8M8 19h5"/></>,
    ruler: <><path d="M3 16 16 3l5 5L8 21z"/><path d="m6 16 2 2M9 13l2 2M12 10l2 2"/></>,
    admin: <><circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/><circle cx="18" cy="5" r="2"/></>,
  }
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>
}

export default function App() {
  const [demoMode, setDemoMode] = useState(true)
  const [modeError, setModeError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest<{ demo_mode: boolean }>('/health')
      .then(({ demo_mode }) => {
        if (typeof demo_mode !== 'boolean') throw new Error('La API no informó el modo de datos.')
        if (active) setDemoMode(demo_mode)
      })
      .catch(() => { if (active) setModeError('No se pudo confirmar el modo de la API; se mantiene la interfaz en modo seguro de demostración.') })
    return () => { active = false }
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">BV</span><strong>BODYVISION</strong></div>
        <nav aria-label="Navegación principal">
          {nav.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/'}><NavIcon name={icon}/><span>{label}</span></NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        {demoMode && <div className="demo-mode-banner" role="note"><strong>MODO DEMOSTRACIÓN ·</strong> Solo datos sintéticos de lectura. No introduzcas datos personales ni fotografías reales.</div>}
        {modeError && <div className="alert error" role="alert">{modeError}</div>}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profiles" element={<Profiles demoMode={demoMode} />} />
          <Route path="/profiles/:id" element={<Profiles demoMode={demoMode} />} />
          <Route path="/profiles/:id/measurements" element={<Measurements demoMode={demoMode} />} />
          <Route path="/measurements" element={<Measurements demoMode={demoMode} />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/capture/:profileId" element={<Capture />} />
          <Route path="/analyses/:id" element={<PoseAnalysis demoMode={demoMode} />} />
          <Route path="/viewer/:profileId" element={<BodyViewer />} />
          <Route path="/analytics/pose" element={<PoseAnalysis demoMode={demoMode} />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/analytics/:profileId" element={<Analytics />} />
          <Route path="/simulations" element={<Simulations />} />
          <Route path="/simulations/:profileId" element={<Simulations />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin" element={<Administration />} />
        </Routes>
      </main>
    </div>
  )
}
