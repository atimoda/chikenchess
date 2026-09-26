import { CanvasTexture, SRGBColorSpace } from 'three'
import type { CityData } from './cities-data'

/** Bright green tinted by the city's pin color, shared by the globe and list. */
export function cityFlagColor(cityColor: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(cityColor)
  if (!match) return '#55e98e'
  const value = Number.parseInt(match[1], 16)
  const city = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  const green = [73, 242, 132]
  return `#${green.map((channel, index) => Math.round(channel * .65 + city[index] * .35).toString(16).padStart(2, '0')).join('')}`
}

function drawEmblem(ctx: CanvasRenderingContext2D, city: CityData) {
  const style = city.genre.toLowerCase()
  ctx.save()
  ctx.translate(96, 56)
  ctx.strokeStyle = '#f4fff5'
  ctx.fillStyle = '#f4fff5'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(13, 48, 31, .55)'
  ctx.shadowBlur = 4

  if (/disco|swing/.test(style)) {
    // Mirrored ball: club dance floors and big-band ballrooms.
    ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-23, -7); ctx.lineTo(23, -7); ctx.moveTo(-23, 8); ctx.lineTo(23, 8); ctx.moveTo(0, -24); ctx.lineTo(0, 24); ctx.stroke()
  } else if (/breaks|jungle|drum/.test(style)) {
    // Off-beat blocks around an open center.
    for (const [x, y, h] of [[-28, 2, 27], [-9, -8, 38], [10, 5, 23], [29, -13, 35]]) {
      ctx.fillRect(x - 4, y, 8, h)
    }
  } else if (/techno|house|electro|kraut|synth|minimal/.test(style)) {
    // A record groove crossed by a modular signal.
    ctx.beginPath(); ctx.arc(0, 0, 25, -.85, Math.PI * 1.6); ctx.stroke()
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-35, 16); ctx.lineTo(-23, 16); ctx.lineTo(-16, -17); ctx.lineTo(-7, 20); ctx.lineTo(4, 20); ctx.stroke()
  } else if (/jazz|blues|chanson/.test(style)) {
    // Bent brass phrase ending in a bell.
    ctx.beginPath(); ctx.moveTo(-31, 19); ctx.bezierCurveTo(-12, 22, -12, -17, 8, -9); ctx.lineTo(25, -9); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(23, -19); ctx.lineTo(36, -8); ctx.lineTo(23, 3); ctx.closePath(); ctx.fill()
  } else if (/ballad|folk|vals|jig/.test(style)) {
    // Two interlaced strings suggest a sung, handed-down melody.
    ctx.beginPath(); ctx.moveTo(-32, -15); ctx.bezierCurveTo(-4, -37, 4, 20, 32, 14); ctx.moveTo(-32, 15); ctx.bezierCurveTo(-4, 37, 4, -20, 32, -14); ctx.stroke()
  } else if (/classical|symphony|piano/.test(style)) {
    // A compact keyboard motif.
    ctx.strokeRect(-31, -20, 62, 40)
    for (const x of [-17, -3, 11, 25]) { ctx.beginPath(); ctx.moveTo(x, -19); ctx.lineTo(x, 19); ctx.stroke() }
  } else if (/rock|punk/.test(style)) {
    // Angled pick and electric stroke.
    ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(-27, -18); ctx.quadraticCurveTo(0, -33, 27, -18); ctx.closePath(); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(6, -22); ctx.lineTo(-7, 2); ctx.lineTo(6, 2); ctx.lineTo(-5, 22); ctx.stroke()
  } else if (/soul|doo-wop/.test(style)) {
    // Overlapping voices.
    for (const x of [-15, 0, 15]) { ctx.beginPath(); ctx.arc(x, 0, 17, 0, Math.PI * 2); ctx.stroke() }
  } else {
    // A simple rising phrase for the remaining styles.
    ctx.beginPath(); ctx.moveTo(-32, 13); ctx.lineTo(-20, 13); ctx.lineTo(-11, -10); ctx.lineTo(0, 23); ctx.lineTo(13, -20); ctx.lineTo(24, 4); ctx.lineTo(33, 4); ctx.stroke()
  }
  ctx.restore()
}

export function createCityFlagTexture(city: CityData) {
  const canvas = document.createElement('canvas')
  canvas.width = 192
  canvas.height = 112
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = cityFlagColor(city.color)
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const foldTint = ctx.createLinearGradient(0, 0, canvas.width, 0)
  foldTint.addColorStop(0, 'rgba(255,255,255,.16)')
  foldTint.addColorStop(.36, 'rgba(0,38,20,.10)')
  foldTint.addColorStop(.68, 'rgba(255,255,255,.12)')
  foldTint.addColorStop(1, 'rgba(0,38,20,.13)')
  ctx.fillStyle = foldTint
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  drawEmblem(ctx, city)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
