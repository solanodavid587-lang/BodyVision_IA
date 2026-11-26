import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import { localId, useStudio } from '../studio/session'
import { bodyWidths, isolateTorsoMask, isFullPose, poseGuidance } from '../studio/bodyWidths'
import { PhotoAvatar } from '../studio/PhotoAvatar'

// The CPU segmentation path needs four-byte-aligned rows. Keep square pixels
// and pad only the final columns instead of stretching the person's silhouette.
function scanFrame(source: CanvasImageSource, width: number, height: number, canvas = document.createElement('canvas')) {
  const scale = Math.min(1, 800 / Math.max(width, height))
  const contentWidth = Math.max(1, Math.round(width * scale))
  const paddedWidth = Math.ceil(contentWidth / 4) * 4
  const scaledHeight = Math.max(1, Math.round(height * scale))
  if (canvas.width !== paddedWidth) canvas.width = paddedWidth
  if (canvas.height !== scaledHeight) canvas.height = scaledHeight
  const context = canvas.getContext('2d')
  if (!context) throw Error('No se pudo preparar la fotografía.')
  context.drawImage(source, 0, 0, contentWidth, canvas.height)
  return canvas
}

import { apiRequest } from '../../services/api'

export default function Capture({enterprise=false}: {enterprise?:boolean}) {
  const { profileId } = useParams()
  const studio = useStudio()
  const targetId = profileId || localId
  const profile = studio.localProfiles.find((item) => item.id === targetId)
  const capture = studio.captureFor(targetId)
  const preview = useMemo(
    () => capture?.image.toDataURL('image/jpeg', 0.8),
    [capture],
  )
  const video = useRef<HTMLVideoElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const timestampRef = useRef(0)
  const [cm, setCm] = useState(String(capture?.cm ?? ''))
  const [kg, setKg] = useState(String(capture?.kg ?? ''))
  const [authorized, setAuthorized] = useState(false)
  const [running, setRunning] = useState(false)
  const [detectorReady, setDetectorReady] = useState(false)
  const [poseHint, setPoseHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setCm(String(capture?.cm ?? ''))
    setKg(String(capture?.kg ?? ''))
    setAuthorized(false)
    setRunning(false)
    setDetectorReady(false)
    setMessage('')
  }, [targetId])

  useEffect(() => {
    if (!running) return

    let active = true
    let frame = 0
    let stream: MediaStream | undefined
    let landmarker: PoseLandmarker | undefined
    const camera = video.current
    if (!camera) {
      setMessage('No se pudo iniciar la vista de cámara.')
      setRunning(false)
      return
    }

    async function start(camera: HTMLVideoElement) {
      if (enterprise) await apiRequest(`/profiles/${targetId}/processing/body_capture`, {method:"POST"})
      if (!active) return
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error('La cámara requiere HTTPS o una dirección localhost.')

      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 1280 } },
      })
      if (!active) {
        media.getTracks().forEach((track) => track.stop())
        return
      }
      stream = media
      camera.srcObject = media
      await camera.play()

      const [{ PoseLandmarker: Pose }, { visionFiles, poseAsset }] = await Promise.all([
        import('@mediapipe/tasks-vision'),
        import('../studio/vision'),
      ])
      if (!active) return
      const files = await visionFiles()
      if (!active) return
      const detector = await Pose.createFromOptions(files, {
        baseOptions: { modelAssetPath: poseAsset, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
        outputSegmentationMasks: true,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      }).catch(() =>
        Pose.createFromOptions(files, {
          baseOptions: { modelAssetPath: poseAsset, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          outputSegmentationMasks: true,
          minPoseDetectionConfidence: 0.55,
          minPosePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        }),
      )
      if (!active) {
        detector.close()
        return
      }
      landmarker = detector
      landmarkerRef.current = detector
      setDetectorReady(true)
      const trackingCanvas = document.createElement('canvas')
      let lastDetection = 0

      function track(now: number) {
        if (!active) return
        try {
          if (
            camera.readyState >= 2 &&
            camera.currentTime !== lastDetection &&
            now - timestampRef.current >= 120
          ) {
            lastDetection = camera.currentTime
            const timestamp = Math.max(now, timestampRef.current + 1)
            timestampRef.current = timestamp
            const frameImage = scanFrame(camera, camera.videoWidth, camera.videoHeight, trackingCanvas)
            const result = detector.detectForVideo(frameImage, timestamp)
            setPoseHint(poseGuidance(result.landmarks[0]))
            if (result.segmentationMasks) {
              for (const mask of result.segmentationMasks) mask.close()
            }
          }
        } catch (cause) {
          setMessage(
            cause instanceof Error
              ? cause.message
              : 'Se interrumpió el análisis de la cámara.',
          )
          setRunning(false)
          setDetectorReady(false)
          return
        }
        frame = requestAnimationFrame(track)
      }
      frame = requestAnimationFrame(track)
    }

    start(camera).catch((cause: unknown) => {
      if (!active) return
      setMessage(
        cause instanceof Error
          ? cause.message
          : 'No se pudo iniciar la cámara o cargar el modelo gratuito.',
      )
      setRunning(false)
    })

    return () => {
      active = false
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((track) => track.stop())
      if (camera) camera.srcObject = null
      landmarker?.close()
      if (landmarkerRef.current === landmarker) landmarkerRef.current = null
    }
  }, [running, enterprise, targetId])

  const validInputs =
    Number(cm) >= 1 &&
    Number(cm) <= 300 &&
    Number(kg) >= 0.1 &&
    Number(kg) <= 650

  const generation = useRef(0)
  useEffect(() => () => { generation.current += 1 }, [targetId])

  function registerDetection(scanCanvas: HTMLCanvasElement, detection: PoseLandmarkerResult) {
      const landmarks = detection.landmarks[0]
      const sourceMask = detection.segmentationMasks?.[0]
      if (!isFullPose(landmarks) || !sourceMask) {
        throw Error(!isFullPose(landmarks) ? poseGuidance(landmarks) : 'No se distingue la silueta. Prueba con luz frontal y un fondo que contraste con tu ropa.')
      }
      const source = sourceMask.getAsFloat32Array()
      const mask = new Uint8Array(scanCanvas.width * scanCanvas.height)
      for (let y = 0; y < scanCanvas.height; y++) {
        const sourceY = Math.min(
          sourceMask.height - 1,
          Math.floor((y * sourceMask.height) / scanCanvas.height),
        )
        for (let x = 0; x < scanCanvas.width; x++) {
          const sourceX = Math.min(
            sourceMask.width - 1,
            Math.floor((x * sourceMask.width) / scanCanvas.width),
          )
          mask[y * scanCanvas.width + x] =
            source[sourceY * sourceMask.width + sourceX] >= 0.5 ? 1 : 0
        }
      }
      const person = isolateTorsoMask(mask, scanCanvas.width, scanCanvas.height, landmarks)
      const widths = bodyWidths(
        person,
        scanCanvas.width,
        scanCanvas.height,
        scanCanvas.width / scanCanvas.height,
        Number(cm),
        landmarks.map((point) => ({
          x: point.x,
          y: point.y,
          visibility: point.visibility ?? point.presence ?? 0,
        })),
      )
      studio.register(targetId, {
        image: scanCanvas,
        mask: person,
        width: scanCanvas.width,
        height: scanCanvas.height,
        cm: Number(cm),
        kg: Number(kg),
        widths,
      })
  }

  async function importPhoto(file?: File) {
    if (!file || busy || !authorized || !validInputs) return
    setRunning(false)
    setDetectorReady(false)
    const request = generation.current
    let bitmap: ImageBitmap | undefined
    let detector: PoseLandmarker | undefined
    setBusy(true)
    setMessage('')
    try {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)
        throw Error('Selecciona una foto JPG, PNG o WebP de hasta 10 MB.')
      const authorization = '/profiles/'+targetId+'/processing/body_capture'
      if (enterprise) await apiRequest(authorization, {method:'POST'})
      if (generation.current !== request) return
      bitmap = await createImageBitmap(file)
      const canvas = scanFrame(bitmap, bitmap.width, bitmap.height)
      const [{PoseLandmarker}, {visionFiles, poseAsset}] = await Promise.all([
        import('@mediapipe/tasks-vision'), import('../studio/vision')
      ])
      detector = await PoseLandmarker.createFromOptions(await visionFiles(), {
        baseOptions:{modelAssetPath:poseAsset}, runningMode:'IMAGE',
        numPoses:2, outputSegmentationMasks:true,
      })
      if (enterprise) await apiRequest(authorization, {method:'POST'})
      if (generation.current !== request) return
      const result = detector.detect(canvas)
      try {
        if (result.landmarks.length > 1) throw Error('Usa una foto de una sola persona.')
        registerDetection(canvas, result)
      } finally {result.close()}
      setMessage('Foto procesada en esta sesión. Puedes abrirla en el simulador.')
    } catch (error) {
      if (generation.current === request) {
        const reason = error instanceof Error ? error.message : 'No se pudo analizar la foto.'
        setMessage(reason + (capture ? ' La vista inferior conserva el último escaneo aceptado.' : ''))
      }
    } finally {
      detector?.close()
      bitmap?.close()
      if (generation.current === request) setBusy(false)
    }
  }

  async function captureScan() {
    const camera = video.current
    const detector = landmarkerRef.current
    if (
      !camera ||
      !detector ||
      !running ||
      !detectorReady ||
      !authorized ||
      !validInputs ||
      busy
    )
      return
    setBusy(true)
    setMessage('')

    try {
      if (enterprise) await apiRequest(`/profiles/${targetId}/processing/body_capture`, {method:"POST"})
      if (camera !== video.current) return
      if (camera.readyState < 2)
        throw Error('Espera a que la cámara esté lista.')
      const scanCanvas = scanFrame(camera, camera.videoWidth, camera.videoHeight)
      const timestamp = Math.max(performance.now(), timestampRef.current + 1)
      timestampRef.current = timestamp
      const detection = detector.detectForVideo(scanCanvas, timestamp)
      try { registerDetection(scanCanvas, detection) }
      finally { detection.close() }
      setMessage(
        'Escaneo guardado solo en esta sesión. Las medidas son estimaciones visuales, no mediciones clínicas.',
      )
      setRunning(false)
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : 'No se pudo crear el escaneo.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="studio-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">ESCANEO CORPORAL LOCAL</p>
          <h1>{profile ? `Escaneo 3D · ${profile.display_name}` : 'Escaneo corporal 3D'}</h1>
        </div>
      </header>
      <section className="panel studio-card">
        <h2>{capture ? 'Actualizar escaneo' : 'Analizar el cuerpo con foto o cámara'}</h2>
        <p>
          MediaPipe detecta la pose y la silueta en este navegador. La malla 3D
          se reconstruye desde una vista frontal y supone profundidad: no es un
          escaneo volumétrico ni una medición clínica. Se requiere conexión a
          internet para cargar el modelo gratuito la primera vez.
        </p>
        <div className="capture-inputs">
          <label>
            Altura (cm)
            <input
              type="number"
              min="1"
              max="300"
              step="0.1"
              value={cm}
              onChange={(event) => setCm(event.target.value)}
            />
          </label>
          <label>
            Peso (kg)
            <input
              type="number"
              min="0.1"
              max="650"
              step="0.1"
              value={kg}
              onChange={(event) => setKg(event.target.value)}
            />
          </label>
        </div>
        <label className="capture-consent">
          <input
            type="checkbox"
            checked={authorized}
            disabled={running || busy}
            onChange={(event) => setAuthorized(event.target.checked)}
          />
          Autorizo el análisis de mi imagen en este dispositivo. No se envía al
          servidor.
        </label>
        <label><strong>Subir una foto de cuerpo completo</strong> · JPG, PNG o WebP, hasta 10 MB
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || !authorized || !validInputs}
            onChange={event => {const file=event.target.files?.[0]; event.target.value=''; void importPhoto(file)}} />
        </label>
        {(!authorized || !validInputs) && <p>Para analizar una foto, completa tu altura y peso y marca la autorización.</p>}
        <video
          ref={video}
          className="capture-video"
          muted
          playsInline
          hidden={!running}
        />
        {running && (
          <p role="status">
            {!validInputs ? 'Completa la altura en centímetros y el peso en kilogramos dentro de los límites indicados.'
              : !detectorReady ? 'Preparando la cámara y cargando el detector de pose…'
              : poseHint || 'Cámara lista. Puedes intentar la captura.'}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <div className="form-actions">
          <button
            className="button primary"
            type="button"
            disabled={!authorized || busy}
            onClick={() => {
              setMessage('')
              setDetectorReady(false)
              setPoseHint('')
              setRunning((active) => !active)
            }}
          >
            {running ? 'Apagar cámara' : 'Activar cámara'}
          </button>
          {running && (
            <button
              className="button"
              type="button"
              disabled={!detectorReady || !validInputs || busy}
              onClick={captureScan}
            >
              {busy ? 'Analizando…' : 'Capturar y crear escaneo 3D'}
            </button>
          )}
        </div>
        <p>De pie, mira a la cámara, estira las piernas y separa ligeramente los brazos del tronco. Deja visibles la cabeza y ambos pies.</p>
        {capture && (
          <section aria-label="Resultado del escaneo corporal">
            <h2>Último escaneo aceptado</h2>
            {preview && (
              <svg viewBox={`0 0 ${capture.width} ${capture.height}`} role="img"
                aria-label="Fotografía con las líneas de ancho frontal utilizadas" style={{display:'block', width:'100%', height:'min(46vh, 420px)'}}>
                <image href={preview} width={capture.width} height={capture.height}/>
                {capture.widths.map(row => <line key={row.label} x1={row.left*capture.width} x2={row.right*capture.width}
                  y1={row.y*capture.height} y2={row.y*capture.height} stroke="#25eddf" strokeWidth="3"><title>{row.label}</title></line>)}
              </svg>
            )}
            <div className="capture-3d">
              <PhotoAvatar
                data={capture}
                height={1}
                width={1}
              />
            </div>
            <p>
              Malla frontal girable con profundidad aproximada. Los perímetros
              se estiman con una forma elíptica y pueden variar con la postura,
              la ropa y la calibración.
            </p>
            <dl>
              {capture.widths.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>Ancho frontal ≈ {row.frontCm.toFixed(1)} cm · perímetro aproximado ≈ {row.cm.toFixed(0)} cm</dd>
                </div>
              ))}
            </dl>
            {capture.widths.length < 3 && (
              <p>No se pudieron estimar todas las zonas del tronco.</p>
            )}
            <Link
              className="button primary"
              to={`/profiles/${targetId}/measurements`}
            >
              Ver mediciones del expediente
            </Link>
          </section>
        )}
        {capture && (
          <button
            className="button"
            onClick={() => studio.clear(targetId)}
            disabled={busy}
          >
            Borrar escaneo local
          </button>
        )}
        <p>
          <Link to={`/simulations/${targetId}`}>Abrir simulador</Link> ·{' '}
          {enterprise ? <Link to={'/profiles/'+targetId+'/consents'}>Consentimientos</Link> : <Link to="/analytics/pose">Análisis de pose</Link>}
        </p>
      </section>
    </div>
  )
}
