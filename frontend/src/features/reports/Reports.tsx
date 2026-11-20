import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'
import type { Measurement, Profile } from '../../types'

export default function Reports() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState('')
  const [items, setItems] = useState<Measurement[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then((list) => {
      setProfiles(list)
      if (list.length) setSelected(list[0].id)
    }).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!selected) return
    apiRequest<Measurement[]>(`/profiles/${selected}/measurements`).then(setItems).catch((e) => setError(e.message))
  }, [selected])

  function generateReport() {
    window.print()
  }

  const profile = profiles.find((item) => item.id === selected)

  return (
    <div className="report-page">
      <header className="page-header"><div><p className="eyebrow">DOCUMENTOS TRAZABLES</p><h1>Reportes</h1></div>
        <label className="profile-selector">Expediente<select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Seleccionar expediente</option>{profiles.map((item) => <option key={item.id} value={item.id}>{item.display_code} · {item.display_name}</option>)}</select></label>
      </header>
      {error && <div className="alert error" role="alert">{error}</div>}
      <section className="panel report-document">
        {profile ? <>
          <div className="report-heading"><div><strong>BODYVISION AI</strong><span>Informe de mediciones</span></div><span>{new Date().toLocaleDateString()}</span></div>
          <dl><div><dt>Expediente</dt><dd>{profile.display_code} · {profile.display_name}</dd></div><div><dt>Estado</dt><dd>{profile.status}</dd></div></dl>
          {items.length ? <table><thead><tr><th>Métrica</th><th>Valor</th><th>Método</th><th>Fecha</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.metric_code}</td><td>{item.value} {item.unit}</td><td>{item.method}</td><td>{new Date(item.measured_at).toLocaleString()}</td></tr>)}</tbody></table> : <div className="empty-state"><p>No existen mediciones registradas.</p></div>}
          <p className="warning">Documento basado únicamente en datos observados o estimaciones identificadas. No constituye diagnóstico médico.</p>
          <button className="button primary" disabled={!profile} onClick={generateReport}>Imprimir o guardar PDF</button>
        </> : <div className="empty-state"><h3>No hay expedientes disponibles</h3><p>Crea un expediente para generar el reporte.</p></div>}
      </section>
    </div>
  )
}
