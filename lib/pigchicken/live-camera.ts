// The Pátio's camera as it is right now (ParquinhoPlay moves it every frame): x is the world x at the screen's
// left edge, y the screen y of world y = 0. Layers drawn above the chicken (the foreground, the editor's handles)
// register their world element here and follow it, so they line up with the world underneath.
import { intersectsView, zoomedView, type ViewRect } from './viewport'

export const liveCamera = { x: 0, y: 0, zoom: 1 }
const followers = new Set<HTMLElement>()
const parallaxLayers = new Map<SVGElement, number>()
const regions = new Set<{ el: HTMLElement | SVGElement; bounds: ViewRect; depth: number }>()
const cameraTransform = (depth = 1) => {
  const z = liveCamera.zoom, cx = window.innerWidth / 2, cy = window.innerHeight / 2
  if (z === 1) return `translate(${-liveCamera.x * depth}px, ${liveCamera.y * depth}px)`
  return `translate3d(${cx * (1 - z) - liveCamera.x * depth * z}px,${cy * (1 - z) + liveCamera.y * z}px,0) scale(${z})`
}
const place = (el: HTMLElement) => { el.style.transformOrigin = '0 0'; el.style.transform = cameraTransform() }

function updateRegions() {
  const screenView = zoomedView(window.innerWidth, window.innerHeight, liveCamera.zoom)
  const view = { ...screenView, x: screenView.x + liveCamera.x, y: screenView.y - liveCamera.y }
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
  el.style.transformOrigin = '0 0'; el.style.transform = cameraTransform(-depth)
  return () => { parallaxLayers.delete(el) }
}

export function moveLiveCamera(x: number, y: number, zoom = liveCamera.zoom) {
  if (x === liveCamera.x && y === liveCamera.y && zoom === liveCamera.zoom) return
  liveCamera.x = x; liveCamera.y = y; liveCamera.zoom = zoom
  followers.forEach(place)
  parallaxLayers.forEach((depth, el) => { el.style.transformOrigin = '0 0'; el.style.transform = cameraTransform(-depth) })
  updateRegions()
}

// a screen point in world units
export const screenToWorld = (sx: number, sy: number) => {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2, z = liveCamera.zoom
  const x = (sx - cx) / z + cx, y = (sy - cy) / z + cy
  return { x: x + liveCamera.x, y: y - liveCamera.y }
}
