import { useEffect, useRef, useState } from 'react'
import { parseThermal } from './analysisData'

const colors = [[20, 11, 58], [95, 27, 125], [192, 54, 94], [244, 133, 60], [255, 241, 148]]
type Raster = ReturnType<typeof parseThermal>

export default function ThermalView() {
  const [authorized, setAuthorized] = useState(false)
  const [data, setData] = useState<Raster | null>(null)
  const [error, setError] = useState('')
  const [cell, setCell] = useState([0, 0])
  const canvas = useRef<HTMLCanvasElement>(null)
  const version = useRef(0)
  useEffect(() => () => { version.current++ }, [])
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!data || !ctx) return
    const image = ctx.createImageData(data.width, data.height)
    data.rows.forEach((row, y) => row.forEach((value, x) => {
      const fraction = data.max === data.min ? 0.5 : (value - data.min) / (data.max - data.min)
      const level = fraction * (colors.length - 1)
      const i = Math.min(colors.length - 2, Math.floor(level))
      const offset = (y * data.width + x) * 4
      for (let channel = 0; channel < 3; channel++) {
        image.data[offset + channel] = colors[i][channel] + (level - i) * (colors[i + 1][channel] - colors[i][channel])
      }
      image.data[offset + 3] = 255
    }))
    ctx.putImageData(image, 0, 0)
  }, [data])

  async function load(file?: File) {
    if (!file) return
    const current = ++version.current
    setData(null)
    setError('')
    try {
      if (file.size > 12 * 1024 * 1024) throw Error('El archivo supera los 12 MB.')
      const raster = parseThermal(await file.text())
      if (version.current === current) { setCell([0, 0]); setData(raster) }
    } catch (cause) {
      if (version.current === current) setError(cause instanceof Error ? cause.message : 'Archivo inválido.')
    }
  }
  return <section className="panel">
    <h2>Vista térmica corporal</h2>
    <p>Importa una matriz de temperaturas superficiales en °C exportada por una cámara térmica. Cada celda representa un píxel de la captura, incluido el fondo.</p>
    <label className="analysis-consent"><input type="checkbox" checked={authorized} onChange={event => {
      version.current++; setAuthorized(event.target.checked); setData(null); setError('')
    }} /> Tengo autorización para visualizar esta captura en el navegador.</label>
    {authorized && <label>Archivo CSV sin encabezado, separado por comas o punto y coma
      <input type="file" accept=".csv,text/csv" onChange={event => {
        void load(event.target.files?.[0]); event.target.value = ''
      }} />
    </label>}
    {error && <p role="alert">{error}</p>}
    {data && <>
      <p>Selecciona un píxel para consultar su temperatura.</p>
      <canvas ref={canvas} width={data.width} height={data.height} aria-label="Distribución térmica de la captura" style={{display:'block', width:'min(100%, 560px)', height:'auto', imageRendering:'pixelated'}} onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect()
        setCell([Math.min(data.width - 1, Math.max(0, Math.floor((event.clientX - rect.left) * data.width / rect.width))),
          Math.min(data.height - 1, Math.max(0, Math.floor((event.clientY - rect.top) * data.height / rect.height)))])
      }} />
      <div style={{width:'min(100%, 560px)', height:10, background:'linear-gradient(to right,' + colors.map(c => 'rgb(' + c.join(',') + ')').join(',') + ')'}} />
      <p>Escala de esta captura · {data.min} a {data.max} °C</p>
      {['Columna', 'Fila'].map((label, i) => <label key={label}>{label} {cell[i]+1}
        <input type="range" min={0} max={(i === 0 ? data.width : data.height)-1} value={cell[i]}
          onChange={event => setCell(cell.map((v, j) => i === j ? Number(event.target.value) : v))} />
      </label>)}
      <p aria-live="polite"><strong>{data.rows[cell[1]][cell[0]]} °C</strong> en el píxel seleccionado.</p>
    </>}
  </section>
}
