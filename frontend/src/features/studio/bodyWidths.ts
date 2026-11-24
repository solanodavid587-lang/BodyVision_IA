type Point = { x: number; y: number; visibility: number }
export type BodyWidth = { label: string; cm: number; left: number; right: number; y: number }

export function bodyWidths(mask: Uint8Array, w: number, h: number, aspect: number, heightCm: number, points: Point[]): BodyWidth[] {
  const rows = mask.length === w*h && w>0 && h>0
  if (!rows || !Number.isFinite(heightCm) || heightCm<=0 || !Number.isFinite(aspect) || aspect<=0) throw Error('Revisa la altura y la fotografía.')
  const anchors = [11,12,23,24,27,28,29,30,31,32].map(i=>points[i])
  if (anchors.some(p=>!p || p.visibility<0.55 || p.x<=0 || p.x>=1 || p.y<=0 || p.y>=1)) throw Error('Incluye ambos pies, hombros y caderas dentro de la foto.')
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
  const cmPerCol=heightCm/(bottom-top+1)*aspect*h/w
  const output: BodyWidth[]=[]
  for (const [label,level] of [['Pecho',0.30],['Cintura',0.70],['Cadera',1]] as const) {
    const middleY=shoulders+(hips-shoulders)*level
    const middleX=((points[11].x+points[12].x)*(1-level)+(points[23].x+points[24].x)*level)/2
    const spans: {left:number;right:number;y:number}[]=[]
    for (const offset of [-1,0,1]) {
      const y=Math.floor(middleY*h)+offset
      const x=Math.floor(middleX*w)
      if (!mask[y*w+x]) continue
      let left=x, right=x
      while(left>0 && mask[y*w+left-1]) left--
      while(right<w-1 && mask[y*w+right+1]) right++
      if (left===0 || right===w-1 || right-left<3) continue
      // Reject a torso section crossed by a visible arm segment.
      const overlaps=[[11,13],[13,15],[12,14],[14,16]].some(([a,b])=>{
        const p=points[a], q=points[b]
        if (!p || !q || Math.min(p.visibility,q.visibility)<0.55 || p.y===q.y) return false
        const t=(y/h-p.y)/(q.y-p.y)
        const px=(p.x+(q.x-p.x)*t)*w
        return t>=0 && t<=1 && px>=left && px<=right
      })
      if (!overlaps) spans.push({left,right,y})
    }
    if (spans.length<2) continue
    spans.sort((a,b)=>(a.right-a.left)-(b.right-b.left))
    const {left,right,y}=spans[1]
    const frontWidth=(right-left+1)*cmPerCol
    const radius=frontWidth/2
    const depth=radius*0.65
    const perimeter=Math.PI*(3*(radius+depth)-Math.sqrt((3*radius+depth)*(radius+3*depth)))
    output.push({label,cm:perimeter,left:left/w,right:(right+1)/w,y:y/h})
  }
  if (!output.length) throw Error('No se pudo separar el tronco. Repite la captura con los brazos apartados y ropa ajustada.')
  return output
}
