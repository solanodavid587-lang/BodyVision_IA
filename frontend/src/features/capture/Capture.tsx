import { ChangeEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest } from '../../services/api'
import type { Profile } from '../../types'

type ModelGeneration = {
  id: string
  profile_id: string
  provider: string
  status: 'Waiting' | 'Generating' | 'Done' | 'Failed'
  model_url: string | null
  error_message: string | null
}

export default function Capture() {
  const { profileId } = useParams()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState(profileId && profileId !== 'new' ? profileId : '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [consent, setConsent] = useState(false)
  const [generation, setGeneration] = useState<ModelGeneration | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [providerState, setProviderState] = useState<'checking' | 'ready' | 'missing' | 'error'>('checking')

  useEffect(() => {
    apiRequest<Profile[]>('/profiles').then((items) => {
      setProfiles(items)
      if (!selectedProfile && items.length) setSelectedProfile(items[0].id)
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'No se pudieron cargar los expedientes.'))
    apiRequest<{ configured: boolean }>('/models/provider-status').then((status) => {
      setProviderState(status.configured ? 'ready' : 'missing')
    }).catch((error: unknown) => {
      setProviderState('error')
      setMessage(error instanceof Error ? error.message : 'No se pudo verificar el proveedor 3D.')
    })
  }, [])

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (!generation || !['Waiting', 'Generating'].includes(generation.status)) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let attempt = 0

    async function poll() {
      timer = setTimeout(async () => {
        try {
          const current = await apiRequest<ModelGeneration>(`/models/${generation?.id}`)
          if (cancelled) return
          setGeneration(current)
          if (current.status === 'Done') setMessage('Modelo 3D generado y disponible para revisión.')
          else if (current.status === 'Failed') setMessage(current.error_message || 'Rodin no pudo generar el modelo.')
          else {
            attempt += 1
            void poll()
          }
        } catch (error) {
          if (cancelled) return
          setMessage(error instanceof Error ? error.message : 'No se pudo consultar el progreso.')
          attempt += 1
          void poll()
        }
      }, Math.min(5000 + attempt * 5000, 30000))
    }

    void poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [generation?.id, generation?.status])

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      event.target.value = ''
      setSelectedFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
      setMessage('La imagen supera el límite de 10 MB.')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setGeneration(null)
    setMessage('')
  }

  async function startGeneration() {
    if (!selectedProfile || !selectedFile || !consent || submitting) return
    setSubmitting(true)
    setMessage('')
    try {
      await apiRequest(`/profiles/${selectedProfile}/consents`, {
        method: 'POST',
        body: JSON.stringify({ purpose: 'captura_corporal_y_analisis_visual', policy_version: '1.0' }),
      })
      const form = new FormData()
      form.append('image', selectedFile)
      const created = await apiRequest<ModelGeneration>(`/profiles/${selectedProfile}/models`, {
        method: 'POST',
        body: form,
      })
      setGeneration(created)
      setMessage('Imagen enviada de forma segura. Rodin está generando el modelo 3D.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar la generación 3D.')
    } finally {
      setSubmitting(false)
    }
  }

  const canStart = Boolean(selectedFile && selectedProfile && consent && providerState === 'ready' && !submitting && !generation)

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">RECONSTRUCCIÓN 3D CON RODIN</p><h1>Captura corporal</h1></div></header>
      <div className="warning"><strong>Resultado orientativo.</strong> Una sola fotografía no permite recuperar con certeza el lado oculto ni obtener medidas clínicas. Rodin genera una reconstrucción visual, no un diagnóstico ni una medición corporal validada.</div>
      {providerState === 'missing' && <div className="alert" role="status">Rodin todavía no está configurado. Añade tu clave al valor <code>RODIN_API_KEY</code> en el archivo .env del servidor y reinicia Docker.</div>}
      {providerState === 'checking' && <div className="provider-status">Verificando conexión con Hyper3D/Rodin…</div>}
      {providerState === 'ready' && <div className="provider-status ready">Hyper3D/Rodin está listo para generar.</div>}
      {message && <div className={`alert ${generation?.status === 'Failed' ? 'error' : ''}`} role={generation?.status === 'Failed' ? 'alert' : 'status'}>{message}</div>}
      <section className="capture-grid">
        <div className="capture-preview">{previewUrl ? <img src={previewUrl} alt="Vista previa privada de la fotografía" /> : <div><span className="capture-placeholder-icon">＋</span><p>Vista previa privada</p><small>La imagen se envía al proveedor solo después de confirmar el consentimiento.</small></div>}</div>
        <div className="panel capture-form">
          <h2>Preparar modelo corporal</h2>
          <label>Expediente
            <select value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)} disabled={Boolean(generation)}>
              <option value="">Seleccionar expediente</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_code} · {profile.display_name}</option>)}
            </select>
          </label>
          <label>Fotografía de cuerpo completo
            <input type="file" accept="image/jpeg,image/png" onChange={selectFile} disabled={Boolean(generation)} />
          </label>
          {selectedFile && <p className="file-ready">{selectedFile.name} · {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>}
          <div className="capture-guidance">
            <strong>Para mejores resultados</strong>
            <ul><li>Cuerpo entero visible, de frente y centrado.</li><li>Fondo sencillo, iluminación uniforme y postura neutral.</li><li>Ropa ajustada; sin objetos ni personas que oculten el contorno.</li></ul>
          </div>
          <label className="consent-row">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={Boolean(generation)} />
            <span>Confirmo que cuento con autorización de la persona y acepto enviar esta imagen a Hyper3D/Rodin para crear el modelo 3D.</span>
          </label>
          <p className="privacy-note">Hyper3D indica que conserva entradas y resultados de API por 7 días y que no los usa para entrenar modelos. No subas imágenes sin autorización.</p>
          {!generation && <button className="button primary" disabled={!canStart} onClick={startGeneration}>{submitting ? 'Enviando...' : 'Generar modelo 3D'}</button>}
          {generation && <div className="generation-status">
            <strong>{generation.status === 'Waiting' ? 'En cola' : generation.status === 'Generating' ? 'Generando modelo 3D…' : generation.status === 'Done' ? 'Modelo listo' : 'Generación fallida'}</strong>
            {['Waiting', 'Generating'].includes(generation.status) && <div className="progress-track"><span /></div>}
            {generation.status === 'Done' && <Link className="button primary" to={`/viewer/${selectedProfile}/${generation.id}`}>Abrir modelo 3D</Link>}
            {(generation.status === 'Failed' || generation.status === 'Done') && <button className="button" onClick={() => { setGeneration(null); setConsent(false) }}>Crear otro modelo</button>}
          </div>}
        </div>
      </section>
    </div>
  )
}
