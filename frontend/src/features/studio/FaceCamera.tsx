import { useEffect, useRef, useState } from 'react'
import type { FaceLandmarker } from '@mediapipe/tasks-vision'

export default function FaceCamera() {
  const video = useRef<HTMLVideoElement>(null),
    overlay = useRef<HTMLCanvasElement>(null)
  const [running, setRunning] = useState(false),
    [status, setStatus] = useState('Cámara apagada')
  const [ready, setReady] = useState(false),
    [snapshot, setSnapshot] = useState('')
  useEffect(() => {
    if (!running) return
    let active = true,
      frame = 0,
      stream: MediaStream | undefined,
      model: FaceLandmarker | undefined
    const camera = video.current!,
      canvas = overlay.current!
    function release() {
      active = false
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((t) => t.stop())
      camera.srcObject = null
      model?.close()
      model = undefined
    }
    async function start() {
      const [{ FaceLandmarker: Face }, { visionFiles, faceAsset }] =
        await Promise.all([
          import('@mediapipe/tasks-vision'),
          import('./vision'),
        ])
      if (!active) return
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error(
          'Abre la aplicación mediante HTTPS o localhost para activar la cámara.',
        )
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 960 } },
      })
      if (!active) {
        media.getTracks().forEach((t) => t.stop())
        return
      }
      stream = media
      camera.srcObject = stream
      await camera.play()
      if (!active) return
      const detector = await Face.createFromOptions(await visionFiles(), {
        baseOptions: { modelAssetPath: faceAsset },
        runningMode: 'VIDEO',
        numFaces: 2,
      })
      if (!active) {
        detector.close()
        return
      }
      model = detector
      let last = -1,
        time = 0
      function track(now: number) {
        if (!active) return
        try {
          if (
            now - time >= 85 &&
            camera.readyState >= 2 &&
            camera.currentTime !== last
          ) {
            last = camera.currentTime
            time = now
            canvas.width = camera.videoWidth
            canvas.height = camera.videoHeight
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(camera, 0, 0)
            const faces = detector.detectForVideo(camera, now).faceLandmarks
            const points = faces[0]
            const complete =
              faces.length === 1 &&
              points.every(
                (p) => p.x > 0.02 && p.x < 0.98 && p.y > 0.02 && p.y < 0.98,
              )
            setReady(complete)
            setStatus(
              complete
                ? 'Rostro encuadrado · ' + points.length + ' puntos'
                : 'Centra un solo rostro completo en la cámara.',
            )
            if (faces.length === 1) {
              ctx.strokeStyle = '#53eed488'
              ctx.lineWidth = 0.8
              ctx.beginPath()
              for (const edge of Face.FACE_LANDMARKS_TESSELATION) {
                const a = points[edge.start],
                  b = points[edge.end]
                ctx.moveTo(a.x * canvas.width, a.y * canvas.height)
                ctx.lineTo(b.x * canvas.width, b.y * canvas.height)
              }
              ctx.stroke()
            }
          }
          frame = requestAnimationFrame(track)
        } catch {
          setStatus('La cámara se interrumpió. Vuelve a activarla.')
          setRunning(false)
          setReady(false)
        }
      }
      frame = requestAnimationFrame(track)
    }
    start().catch((err) => {
      if (active) {
        setStatus(err instanceof Error ? err.message : 'Cámara no disponible')
        setRunning(false)
        setReady(false)
      }
    })
    return release
  }, [running])
  return (
    <section className="studio-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">VISIÓN EN DIRECTO</p>
          <h1>Captura facial</h1>
        </div>
      </header>
      <article className="panel studio-card">
        <p>
          Activa la cámara para encuadrar un rostro y capturar su malla frontal
          en este dispositivo.
        </p>
        <video ref={video} muted playsInline hidden />
        <canvas ref={overlay} hidden={!running} className="face-preview" />
        <p role="status">{status}</p>
        <div className="form-actions">
          <button
            className="button primary"
            onClick={() => {
              setReady(false)
              setSnapshot('')
              setStatus(
                running ? 'Cámara apagada' : 'Iniciando cámara y modelo…',
              )
              setRunning(!running)
            }}
          >
            {running ? 'Apagar cámara' : 'Activar cámara'}
          </button>
          {running && (
            <button
              className="button"
              disabled={!ready}
              onClick={() => {
                setSnapshot(overlay.current!.toDataURL('image/jpeg'))
                setRunning(false)
                setReady(false)
                setStatus('Captura lista · cámara apagada')
              }}
            >
              Capturar rostro
            </button>
          )}
        </div>
        {snapshot && (
          <figure>
            <img
              className="face-preview"
              src={snapshot}
              alt="Captura local con malla facial"
            />
            <figcaption>
              <button
                className="button"
                onClick={() => {
                  setSnapshot('')
                  setStatus('Cámara apagada')
                }}
              >
                Descartar captura
              </button>
            </figcaption>
          </figure>
        )}
      </article>
    </section>
  )
}
