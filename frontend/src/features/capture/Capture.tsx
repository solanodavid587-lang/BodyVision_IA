import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { localId, useStudio } from '../studio/session'

export default function Capture() {
  const studio = useStudio()
  const navigate = useNavigate()
  const [file, setFile] = useState<File>()
  const [cm, setCm] = useState(String(studio.capture?.cm ?? ''))
  const [kg, setKg] = useState(String(studio.capture?.kg ?? ''))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!file || busy) return
    setMessage('')
    if (
      !['image/jpeg', 'image/png'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setMessage('Selecciona una imagen JPEG o PNG de hasta 10 MB.')
      return
    }
    setBusy(true)
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const factor = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.max(1, Math.round(bitmap.width * factor))
      canvas.height = Math.max(1, Math.round(bitmap.height * factor))
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const [{ PoseLandmarker }, { visionFiles, poseAsset }] =
        await Promise.all([
          import('@mediapipe/tasks-vision'),
          import('../studio/vision'),
        ])
      const model = await PoseLandmarker.createFromOptions(
        await visionFiles(),
        {
          baseOptions: { modelAssetPath: poseAsset },
          numPoses: 2,
          outputSegmentationMasks: true,
        },
      )
      try {
        if (!active.current) return
        model.detect(canvas, (result) => {
          const points = result.landmarks[0]
          const mask = result.segmentationMasks?.[0]
          if (
            result.landmarks.length !== 1 ||
            !mask ||
            ![0, 11, 12, 23, 24, 27, 28].every(
              (i) =>
                points[i]?.visibility >= 0.55 &&
                points[i].y > 0 &&
                points[i].y < 1,
            )
          ) {
            throw Error(
              'Incluye una sola persona, de frente, con cabeza y tobillos visibles.',
            )
          }
          const pixels = mask.getAsFloat32Array()
          const data = Uint8Array.from(pixels, (x) => (x >= 0.6 ? 1 : 0))
          if (!data.includes(1)) throw Error('No se pudo delimitar la silueta.')
          studio.register({
            image: canvas,
            mask: data,
            width: mask.width,
            height: mask.height,
            cm: Number(cm),
            kg: Number(kg),
          })
        })
        navigate('/simulations/' + localId)
      } finally {
        model.close()
      }
    } catch (err) {
      if (active.current)
        setMessage(
          err instanceof Error ? err.message : 'No se pudo procesar la imagen.',
        )
    } finally {
      if (active.current) setBusy(false)
    }
  }
  return (
    <div className="studio-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">ESTUDIO LOCAL</p>
          <h1>Registro corporal</h1>
        </div>
      </header>
      <section className="panel studio-card">
        <h2>{studio.capture ? 'Actualizar modelo de la sesión' : 'Crear modelo desde una foto'}</h2>
        {studio.records.length > 0 && <p>Esta sesión contiene mediciones. Para registrar a otra persona, borra primero la sesión local.</p>}
        <p>
          Usa una foto frontal de cuerpo entero, con los brazos ligeramente
          separados. La silueta y el color frontal personalizan una malla de
          relieve. El volumen posterior es aproximado.
        </p>
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <label>
              Fotografía frontal
              <input
                type="file"
                accept="image/png,image/jpeg"
                required
                onChange={(e) => setFile(e.target.files?.[0])}
              />
            </label>
            <label>
              Altura actual (cm)
              <input
                type="number"
                required
                min="1"
                max="300"
                step="0.1"
                value={cm}
                onChange={(e) => setCm(e.target.value)}
              />
            </label>
            <label>
              Peso actual (kg)
              <input
                type="number"
                required
                min="0.1"
                max="650"
                step="0.1"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
              />
            </label>
            <label>
              <input type="checkbox" required /> Tengo permiso para procesar
              esta foto en este dispositivo. La sesión se borra al recargar.
            </label>
            <button className="button primary">
              {busy ? 'Procesando silueta…' : 'Crear y abrir simulador'}
            </button>
          </fieldset>
        </form>
        {message && <p role="alert">{message}</p>}
        {(studio.capture || studio.records.length > 0) && (
          <button className="button" onClick={studio.clear} disabled={busy}>
            Borrar sesión local
          </button>
        )}
        <p>
          <Link to="/viewer/demo">Explorar atlas anatómico</Link> ·{' '}
          <Link to="/analytics/pose">Análisis de pose</Link>
        </p>
      </section>
    </div>
  )
}
