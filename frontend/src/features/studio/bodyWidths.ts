type Point = { x: number; y: number; visibility: number }
export type BodyWidth = { label: string; frontCm: number; cm: number; left: number; right: number; y: number }

function visible(p?: Point) {
  return !!p && p.visibility >= 0.55 && p.x > 0.01 && p.x < 0.99 && p.y > 0.01 && p.y < 0.99
}

function missingRegion(points?: Point[]) {
  if (!points?.length) return 'el cuerpo'
  if (!visible(points[0])) return 'el rostro'
  if (![11,12].every(i=>visible(points[i]))) return 'ambos hombros'
  if (![23,24].every(i=>visible(points[i]))) return 'ambas caderas'
  if (![25,26].every(i=>visible(points[i]))) return 'ambas rodillas'
  if (![27,28].every(i=>visible(points[i])) ||
      ![29,31].some(i=>visible(points[i])) || ![30,32].some(i=>visible(points[i]))) return 'ambos pies y tobillos'
  return ''
}

export function isFullPose(points?: Point[]) {
  return !missingRegion(points)
}

export function poseGuidance(points?: Point[]) {
  const missing = missingRegion(points)
  return missing ? 'El detector aún necesita ver '+missing+'. Ajusta el encuadre y deja margen alrededor del cuerpo.'
    : 'Cuerpo detectado. Mantén la pose frontal y pulsa Capturar.'
}

// Only the component containing the torso can calibrate the person's height.
export function isolateTorsoMask(mask: Uint8Array, w: number, h: number, points: Point[]) {
  const center = (axis: 'x'|'y') => [11,12,23,24].reduce((sum,i) => sum + points[i][axis], 0) / 4
  const seed = Math.floor(center('y') * h) * w + Math.floor(center('x') * w)
  if (!mask[seed]) throw Error('El tronco se confunde con el fondo. Busca luz uniforme y contraste con la ropa.')
  const person = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  let next = 0, total = 0
  function visit(index: number) {
    if (mask[index] && !person[index]) {
      person[index] = 1
      queue[total++] = index
    }
  }
  visit(seed)
  while (next < total) {
    const index = queue[next++]
    if (index % w) visit(index-1)
    if (index % w !== w-1) visit(index+1)
    if (index >= w) visit(index-w)
    if (index+w < mask.length) visit(index+w)
  }
  return person
}

function uprightLeg(hip: Point, knee: Point, ankle: Point, aspect: number) {
  const dx1 = (knee.x-hip.x)*aspect, dy1 = knee.y-hip.y
  const dx2 = (ankle.x-knee.x)*aspect, dy2 = ankle.y-knee.y
  const alignment = (dx1*dx2 + dy1*dy2)/(Math.hypot(dx1,dy1)*Math.hypot(dx2,dy2))
  return dy1>0 && dy2>0 && alignment>=0.87 && Math.abs(ankle.x-hip.x)*aspect < (ankle.y-hip.y)*0.55
}

export function bodyWidths(mask: Uint8Array, w: number, h: number, aspect: number, heightCm: number, points: Point[]): BodyWidth[] {
  const rows = mask.length === w*h && w>0 && h>0
  if (!rows || !Number.isFinite(heightCm) || heightCm<=0 || !Number.isFinite(aspect) || aspect<=0) throw Error('Revisa la altura y la fotografía.')
  if (!isFullPose(points)) throw Error('Incluye la cabeza, ambas rodillas y los dos pies dentro de la foto.')
  if (!uprightLeg(points[23],points[25],points[27],aspect) || !uprightLeg(points[24],points[26],points[28],aspect))
    throw Error('Para calibrar la altura, ponte de pie con ambas piernas estiradas y los pies bajo las caderas.')
  if ([15,16].some(i => visible(points[i]) && points[i].y < points[0].y))
    throw Error('Baja las manos por debajo de la cabeza para calibrar la altura.')
  let top=h, bottom=-1
  for (let y=0;y<h;y++) {
    let count=0
    for (let x=0;x<w;x++) count+=mask[y*w+x]
    if (count>=Math.max(2,w*0.008)) {top=Math.min(top,y);bottom=y}
  }
  if (top<1 || bottom>=h-1 || bottom-top<h*0.4) throw Error('Deja un margen por encima de la cabeza y debajo de los pies. Acércate si el cuerpo ocupa menos de la mitad del encuadre.')
  const shoulders=(points[11].y+points[12].y)/2
  const hips=(points[23].y+points[24].y)/2
  if (hips-shoulders<0.10 || Math.abs(points[11].y-points[12].y)>(hips-shoulders)*0.25) throw Error('Usa una foto frontal de pie con la cámara nivelada.')
  const shoulderWidth=Math.abs(points[11].x-points[12].x)*aspect
  if (shoulderWidth < (hips-shoulders)*0.45)
    throw Error('Gira el torso hacia la cámara hasta que ambos hombros se vean de frente.')
  const cmPerCol=heightCm/(bottom-top+1)*aspect*h/w
  const output: BodyWidth[]=[]
  for (const [label,level] of [['Pecho',0.30],['Cintura',0.70],['Cadera',1]] as const) {
    const middleY=shoulders+(hips-shoulders)*level
    const middleX=((points[11].x+points[12].x)*(1-level)+(points[23].x+points[24].x)*level)/2
    const spans: {left:number;right:number;y:number}[]=[]
    const step = Math.max(1, Math.round((hips-shoulders)*h*0.018))
    for (const offset of [-2,-1,0,1,2]) {
      const y=Math.floor(middleY*h)+offset*step
      const x=Math.floor(middleX*w)
      if (!mask[y*w+x]) continue
      let left=x, right=x
      while(left>0 && mask[y*w+left-1]) left--
      while(right<w-1 && mask[y*w+right+1]) right++
      if (left===0 || right===w-1 || right-left<3) continue
      // Reject a torso section crossed by a visible arm segment.
      const overlaps=[[11,13],[13,15],[15,19],[12,14],[14,16],[16,20]].some(([a,b])=>{
        const p=points[a], q=points[b]
        if (!p || !q || Math.min(p.visibility,q.visibility)<0.55) return false
        if (Math.abs(p.y-q.y)*h < 2) return Math.abs(y-p.y*h)<=2 && Math.max(p.x,q.x)*w>=left && Math.min(p.x,q.x)*w<=right
        const t=(y/h-p.y)/(q.y-p.y)
        const px=(p.x+(q.x-p.x)*t)*w
        return t>=0 && t<=1 && px>=left && px<=right
      })
      if (!overlaps) spans.push({left,right,y})
    }
    if (spans.length<3) continue
    spans.sort((a,b)=>(a.right-a.left)-(b.right-b.left))
    const {left,right,y}=spans[Math.floor(spans.length/2)]
    const typical=right-left+1
    if (spans.filter(s => Math.abs((s.right-s.left+1)-typical)<=typical*0.10).length<3) continue
    const frontWidth=(right-left+1)*cmPerCol
    const radius=frontWidth/2
    const depth=radius*0.65
    const perimeter=Math.PI*(3*(radius+depth)-Math.sqrt((3*radius+depth)*(radius+3*depth)))
    output.push({label,frontCm:frontWidth,cm:perimeter,left:left/w,right:(right+1)/w,y:y/h})
  }
  if (!output.length) throw Error('No se pudo separar el tronco. Repite la captura con los brazos apartados y ropa ajustada.')
  return output
}
