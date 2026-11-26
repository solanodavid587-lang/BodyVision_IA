import test from 'node:test'
import assert from 'node:assert/strict'
import { bodyWidths, isolateTorsoMask } from '../src/features/studio/bodyWidths.ts'

function standing() {
  const point = (x,y) => ({x,y,visibility:1})
  const points = Array.from({length:33}, () => ({x:0,y:0,visibility:0}))
  for(const [i,x,y] of [[0,.5,.14],[11,.40,.25],[12,.60,.25],[23,.42,.54],[24,.58,.54],
    [25,.42,.70],[26,.58,.70],[27,.42,.86],[28,.58,.86],[31,.42,.89],[32,.58,.89]]) {
    points[i]=point(x,y)
  }
  const w=100,h=100,mask=new Uint8Array(w*h)
  for(let y=10;y<90;y++) mask.fill(1,y*w+40,y*w+60)
  return {w,h,mask,points}
}

test('la calibración conserva el ancho conocido y descarta ruido desconectado', () => {
  const {w,h,mask,points}=standing()
  mask.fill(1,0,15)
  const clean=isolateTorsoMask(mask,w,h,points)
  assert.equal(clean[5],0)
  const widths=bodyWidths(clean,w,h,1,160,points)
  assert.equal(widths.length,3)
  assert.ok(widths.every(row => row.frontCm===40))
})

test('una rodilla flexionada invalida la escala por altura', () => {
  const {w,h,mask,points}=standing()
  points[25].x=.70
  assert.throws(()=>bodyWidths(mask,w,h,1,160,points),/piernas estiradas/)
})
