import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiRequest } from '../../services/api'
import type { Measurement, Profile } from '../../types'

export default function Analytics() {
  const { profileId } = useParams()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState(profileId || '')
  const [items, setItems] = useState<Measurement[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then((list) => {
      setProfiles(list)
      if (!selected && list.length) setSelected(list[0].id)
    }).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!selected) return
    apiRequest<Measurement[]>(`/profiles/${selected}/measurements`).then(setItems).catch((e) => setError(e.message))
  }, [selected])

  const chartData = useMemo(() => items.map((item) => ({
    date: new Date(item.measured_at).toLocaleDateString(),
    [item.metric_code]: item.value,
  })), [items])

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">ANÁLISIS TEMPORAL</p><h1>Analítica IA</h1></div>
        <label className="profile-selector">Expediente<select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Seleccionar expediente</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_code} · {profile.display_name}</option>)}</select></label>
      </header>
      {error && <div className="alert error" role="alert">{error}</div>}
      <section className="panel chart-panel"><h2>Evolución registrada</h2>
        {chartData.length ? <ResponsiveContainer width="100%" height={300}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip />{['weight', 'waist', 'height'].filter((metric) => items.some((item) => item.metric_code === metric)).map((metric, index) => <Line key={metric} type="monotone" dataKey={metric} stroke={['#35c4dd', '#d9c05c', '#c75fe8'][index]} strokeWidth={3} />)}</LineChart></ResponsiveContainer> :
          <div className="empty-state"><h3>Sin series compatibles</h3><p>Registra mediciones observadas para generar una comparación temporal.</p></div>}
      </section>
    </div>
  )
}
