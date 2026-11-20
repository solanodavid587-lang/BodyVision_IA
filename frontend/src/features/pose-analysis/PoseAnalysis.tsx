import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { apiRequest } from '../../services/api'
import type { Measurement, Profile } from '../../types'

type Landmark = { x: number; y: number; visibility: number }

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm'
const POSE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [27, 29], [29, 31],
  [24, 26], [26, 28], [28, 30], [30, 32], [27, 31], [28, 32],
]
const REGIONS = [
  ['Hombros', [11, 12]],
  ['Codos', [13, 14]],
  ['Muñecas', [15, 16]],
  ['Caderas', [23, 24]],
  ['Rodillas', [25, 26]],
  ['Tobillos', [27, 28]],
] as const

function latest(items: Measurement[], metric: string) {
  return items.filter((item) => item.metric_code === metric).at(-1)
}

function getVisibility(landmarks: Landmark[], indices: readonly number[]) {
  const values = indices.map((index) => landmarks[index]?.visibility ?? 0)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

export default function PoseAnalysis() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState('')
  const [items, setItems] = useState<Measurement[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then((list) => {
      setProfiles(list)
      if (list.length) setSelected(list[0].id)
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los expedientes.'))
  }, [])

  useEffect(() => {
    setItems([])
    if (!selected) return
    apiRequest<Measurement[]>(`/profiles/${selected}/measurements`)
      .then(setItems)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las mediciones.'))
  }, [selected])

  useEffect(() => {
    if (!imageUrl || !authorized) return
    let cancelled = false
    let landmarker: PoseLandmarker | undefined
    const closeLandmarker = () => {
      landmarker?.close()
      landmarker = undefined
    }
    setProcessing(true)
    setError('')
    setLandmarks(null)

    async function processImage() {
      try {
        const image = new Image()
        image.src = imageUrl
        await image.decode()
        if (cancelled) return
        setImageSize({ width: image.naturalWidth, height: image.naturalHeight })

        const { FilesetResolver, PoseLandmarker: PoseLandmarkerClass } = await import('@mediapipe/tasks-vision')
        const vision = await FilesetResolver.forVisionTasks(WASM_URL)
        const options = {
          baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'GPU' as const },
          runningMode: 'IMAGE' as const,
          numPoses: 1,
          outputSegmentationMasks: false,
        }
        try {
          landmarker = await PoseLandmarkerClass.createFromOptions(vision, options)
        } catch {
          landmarker = await PoseLandmarkerClass.createFromOptions(vision, {
            ...options,
            baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'CPU' },
          })
        }
        if (cancelled) return
        const result = landmarker.detect(image)
        const pose = result.landmarks[0]
        if (!pose?.length) throw new Error('No se detectó una pose. Usa una imagen frontal con el cuerpo completo visible.')
        setLandmarks(pose.map((point) => ({ x: point.x, y: point.y, visibility: point.visibility ?? point.presence ?? 0 })))
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No se pudo analizar la pose.')
      } finally {
        closeLandmarker()
        if (!cancelled) setProcessing(false)
      }
    }

    void processImage()
    return () => {
      cancelled = true
      closeLandmarker()
    }
  }, [imageUrl, authorized])

  const meanVisibility = useMemo(() => {
    if (!landmarks?.length) return 0
    return landmarks.reduce((sum, point) => sum + point.visibility, 0) / landmarks.length
  }, [landmarks])

  const measurementCards = useMemo(() => {
    const weight = latest(items, 'weight')
    const height = latest(items, 'height')
    const waist = latest(items, 'waist')
    const hip = latest(items, 'hip')
    const bodyFat = latest(items, 'body_fat_pct')
    const muscle = latest(items, 'muscle_mass_pct')
    const heightMeters = height ? (height.unit === 'cm' ? height.value / 100 : height.value) : null
    const bmi = weight && heightMeters ? weight.value / (heightMeters * heightMeters) : null
    return [
      { label: 'Peso registrado', value: weight ? `${weight.value} ${weight.unit}` : 'Sin dato', method: weight?.method },
      { label: 'Cintura registrada', value: waist ? `${waist.value} ${waist.unit}` : 'Sin dato', method: waist?.method },
      { label: 'Cadera registrada', value: hip ? `${hip.value} ${hip.unit}` : 'Sin dato', method: hip?.method },
      { label: 'IMC de referencia', value: bmi ? bmi.toFixed(1) : 'Requiere peso y altura', method: 'Cálculo derivado; no diagnóstico' },
      { label: 'Grasa corporal', value: bodyFat ? `${bodyFat.value} ${bodyFat.unit}` : 'No medida', method: bodyFat?.method },
      { label: 'Masa muscular', value: muscle ? `${muscle.value} ${muscle.unit}` : 'No medida', method: muscle?.method },
    ]
  }, [items])

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen supera el límite local de 10 MB.')
      event.target.value = ''
      if (imageUrl) URL.revokeObjectURL(imageUrl)
      setImageUrl('')
      setLandmarks(null)
      setAuthorized(false)
      setProcessing(false)
      return
    }
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(URL.createObjectURL(file))
    setLandmarks(null)
    setAuthorized(false)
    setProcessing(false)
    setError('')
  }

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
  }, [imageUrl])

  const displayWidth = imageSize.width && imageSize.height
    ? Math.min(imageSize.width, Math.round(520 * imageSize.width / imageSize.height))
    : undefined

  return (
    <div>
      <header className="page-header">
        <div><p className="eyebrow">SEÑALES DE POSE Y MEDICIONES</p><h1>Análisis corporal</h1></div>
        <div className="analysis-header-actions">
          <label className="profile-selector">Expediente
            <select value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">Seleccionar expediente</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_code} · {profile.display_name}</option>)}
            </select>
          </label>
          <Link className="button" to="/analytics">Ver evolución</Link>
        </div>
      </header>
      <div className="analysis-disclaimer"><strong>Alcance del análisis.</strong> La pose se procesa en este navegador; no se sube la foto. Los puntos representan referencias visuales estimadas, no medidas anatómicas. Grasa y masa muscular aparecen solo si fueron registradas por un método independiente.</div>
      {error && <div className="alert error" role="alert">{error}</div>}
      <section className="analysis-layout">
        <article className="panel analysis-image-panel">
          <div className="analysis-panel-heading"><div><h2>Lectura de pose</h2><p>MediaPipe Pose · procesamiento local</p></div><span className={`analysis-pill ${landmarks ? 'complete' : ''}`}>{processing ? 'Procesando…' : landmarks ? 'Pose detectada' : 'Pendiente'}</span></div>
          {imageUrl ? <div className="pose-stage">
            <div className="pose-image-frame" style={displayWidth ? { width: `min(100%, ${displayWidth}px)`, aspectRatio: `${imageSize.width} / ${imageSize.height}` } : undefined}>
              <img src={imageUrl} alt="Imagen local para análisis de pose" />
              {landmarks && <svg className="pose-overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Landmarks detectados">
                {CONNECTIONS.map(([start, end]) => {
                  const first = landmarks[start]
                  const second = landmarks[end]
                  if (!first || !second || first.visibility < 0.45 || second.visibility < 0.45) return null
                  return <line key={`${start}-${end}`} x1={first.x} y1={first.y} x2={second.x} y2={second.y} />
                })}
                {landmarks.map((point, index) => point.visibility >= 0.45 ? <circle key={index} cx={point.x} cy={point.y} r=".006" className={point.visibility >= 0.75 ? 'high' : 'low'} /> : null)}
              </svg>}
            </div>
          </div> : <div className="pose-empty"><span>＋</span><strong>Selecciona una fotografía de cuerpo completo</strong><small>La imagen se procesa localmente y no se conserva en el servidor.</small></div>}
          <div className="analysis-image-controls">
            <label className="button">Seleccionar imagen<input type="file" accept="image/jpeg,image/png" onChange={chooseImage} hidden /></label>
            {imageUrl && <button className="button" onClick={() => { setImageUrl(''); setLandmarks(null); setAuthorized(false); setImageSize({ width: 0, height: 0 }); setProcessing(false) }}>Quitar imagen</button>}
            {landmarks && <span className="landmark-summary">{landmarks.filter((point) => point.visibility >= 0.5).length} / {landmarks.length} puntos visibles</span>}
          </div>
          {imageUrl && <label className="analysis-consent"><input type="checkbox" checked={authorized} disabled={processing} onChange={(event) => setAuthorized(event.target.checked)} /><span>Confirmo que cuento con autorización para analizar esta imagen en este dispositivo.</span></label>}
          {processing && <div className="local-processing"><span className="progress-track"><span /></span><small>Descargando el modelo de pose y analizando la imagen en este navegador…</small></div>}
        </article>
        <aside className="panel analysis-signals">
          <div className="analysis-panel-heading"><div><h2>Señales detectadas</h2><p>Visibilidad estimada por región</p></div></div>
          {landmarks ? <>
            <div className="visibility-score"><div><span>Visibilidad media de puntos</span><strong>{percent(meanVisibility)}</strong></div><div className="visibility-bar"><span style={{ width: percent(meanVisibility) }} /></div><small>No equivale a precisión de medición.</small></div>
            <div className="region-list">{REGIONS.map(([name, indices]) => {
              const score = getVisibility(landmarks, indices)
              return <div key={name}><span>{name}</span><strong>{percent(score)}</strong><i><span style={{ width: percent(score) }} /></i></div>
            })}</div>
          </> : <div className="signal-empty">{processing ? 'Esperando landmarks…' : 'Las señales aparecerán al analizar una imagen autorizada.'}</div>}
          <div className="signal-footnote">La oclusión, la postura, la ropa y la iluminación pueden afectar la detección.</div>
        </aside>
      </section>
      <section className="panel measured-summary">
        <div className="analysis-panel-heading"><div><h2>Mediciones del expediente</h2><p>Último valor registrado por métrica</p></div><Link to={selected ? `/profiles/${selected}/measurements` : '/measurements'}>Gestionar mediciones →</Link></div>
        <div className="analysis-metric-grid">{measurementCards.map((card) => <article key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.method || 'Sin método registrado'}</small></article>)}</div>
      </section>
    </div>
  )
}
