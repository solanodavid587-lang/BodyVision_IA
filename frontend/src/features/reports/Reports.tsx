import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'
import type { Measurement, Profile } from '../../types'

function methodLabel(method: Measurement['method']) {
  if (method === 'simulated') return 'Simulado'
  if (method === 'visual_estimate') return 'Estimación visual'
  if (method === 'device') return 'Instrumental'
  return 'Manual'
}

export default function Reports() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState('')
  const [records, setItems] = useState<Measurement[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then((list) => {
      setProfiles(list)
      if (list.length) setSelected(list[0].id)
    }).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    let active = true
    setItems([])
    if (!selected) return
    apiRequest<Measurement[]>(`/profiles/${selected}/measurements`)
      .then((records) => { if (active) setItems(records) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las mediciones.') })
    return () => { active = false }
  }, [selected])

  function generateReport() {
    window.print()
  }

  const profile = profiles.find((item) => item.id === selected)
  const items = records.filter(item => item.profile_id === selected)
  const isSynthetic = items.some((item) => item.method === 'simulated')
  const measuredRange = items.length
    ? `${new Date(items[0].measured_at).toLocaleDateString('es')} – ${new Date(items[items.length - 1].measured_at).toLocaleDateString('es')}`
    : 'Sin mediciones'

  return (
    <div className="report-page">
      <header className="page-header"><div><p className="eyebrow">DOCUMENTOS TRAZABLES</p><h1>Reportes</h1></div>
        <label className="profile-selector">Expediente<select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Seleccionar expediente</option>{profiles.map((item) => <option key={item.id} value={item.id}>{item.display_code} · {item.display_name}</option>)}</select></label>
      </header>
      {error && <div className="alert error" role="alert">{error}</div>}
      <section className="panel report-document">
        {profile ? <>
          <div className="report-heading"><div><strong>BODYVISION AI</strong><span>{isSynthetic ? 'Informe de datos sintéticos' : 'Informe de mediciones'}</span></div><span>Generado: {new Date().toLocaleString('es')}</span></div>
          <dl><div><dt>Expediente</dt><dd>{profile.display_code} · {profile.display_name}</dd></div><div><dt>Estado</dt><dd>{profile.status}</dd></div></dl>
          <p className="report-data-range">Periodo de medición: {measuredRange} · Fuente: historial del expediente</p>
          {items.length ? <table><thead><tr><th>Métrica</th><th>Valor</th><th>Método</th><th>Fecha</th><th>Fuente / observaciones</th><th>Versión</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.metric_code}</td><td>{item.value} {item.unit}</td><td>{methodLabel(item.method)}</td><td>{new Date(item.measured_at).toLocaleString('es')}</td><td>{item.notes || 'No especificada'}</td><td>{item.supersedes_id ? `Corrige ${item.supersedes_id}` : 'Original'}</td></tr>)}</tbody></table> : <div className="empty-state"><p>No existen mediciones registradas.</p></div>}
          <p className="warning">{isSynthetic ? 'Todos los valores de este informe son sintéticos y no describen a una persona real. ' : 'Documento basado únicamente en datos observados o estimaciones identificadas. '}No constituye diagnóstico médico.</p>
          <button className="button primary" disabled={!profile} onClick={generateReport}>Imprimir o guardar PDF</button>
        </> : <div className="empty-state"><h3>No hay expedientes disponibles</h3><p>Crea un expediente para generar el reporte.</p></div>}
      </section>
    </div>
  )
}
