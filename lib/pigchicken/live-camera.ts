// The Pátio's camera as it is right now (ParquinhoPlay moves it every frame): x is the world x at the screen's
// left edge, y the screen y of world y = 0. Layers drawn above the chicken (the foreground, the editor's handles)
// register their world element here and follow it, so they line up with the world underneath.
import { intersectsView, type ViewRect } from './viewport'

export const liveCamera = { x: 0, y: 0 }
const followers = new Set<HTMLElement>()
const parallaxLayers = new Map<SVGElement, number>()
const regions = new Set<{ el: HTMLElement | SVGElement; bounds: ViewRect; depth: number }>()
const place = (el: HTMLElement) => { el.style.transform = `translate3d(${-liveCamera.x}px,${liveCamera.y}px,0)` }

function updateRegions() {
  const view = { x: liveCamera.x, y: -liveCamera.y, w: window.innerWidth, h: window.innerHeight }
  regions.forEach(({ el, bounds, depth }) => {
    const visible = String(intersectsView({ ...bounds, x: bounds.x + liveCamera.x * depth }, view, 192))
    if (el.getAttribute('data-patio-visible') !== visible) el.setAttribute('data-patio-visible', visible)
  })
}

// Numeric world bounds: no getBoundingClientRect in the camera's visibility pass.
export function watchCameraRegion(el: HTMLElement | SVGElement, bounds: ViewRect, depth = 0) {
  const region = { el, bounds, depth }
  if (!regions.size) window.addEventListener('resize', updateRegions)
  regions.add(region); updateRegions()
  return () => {
    regions.delete(region)
    if (!regions.size) window.removeEventListener('resize', updateRegions)
  }
}

export function followCamera(el: HTMLElement) {
  followers.add(el); place(el)
  return () => { followers.delete(el) }
}

export function followParallax(el: SVGElement, depth: number) {
  parallaxLayers.set(el, depth)
  el.style.transform = `translate(${liveCamera.x * depth}px, 0px)`
  return () => { parallaxLayers.delete(el) }
}

export function moveLiveCamera(x: number, y: number) {
  if (x === liveCamera.x && y === liveCamera.y) return
  liveCamera.x = x; liveCamera.y = y
  followers.forEach(place)
  parallaxLayers.forEach((depth, el) => { el.style.transform = `translate(${x * depth}px, 0px)` })
  updateRegions()
}

// a screen point in world units
export const screenToWorld = (sx: number, sy: number) => ({ x: sx + liveCamera.x, y: sy - liveCamera.y })
