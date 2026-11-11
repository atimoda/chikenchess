// The Pátio's camera as it is right now (ParquinhoPlay moves it every frame): x is the world x at the screen's
// left edge, y the screen y of world y = 0. Layers drawn above the chicken (the foreground, the editor's handles)
// register their world element here and follow it, so they line up with the world underneath.
import { intersectsView, zoomedView, type ViewRect } from './viewport'
import { stageWidth } from "../stage-size"

export const liveCamera = { x: 0, y: 0, zoom: 1 }
const followers = new Set<HTMLElement>()
const parallaxLayers = new Map<SVGElement, number>()
const regions = new Set<{ el: HTMLElement | SVGElement; bounds: ViewRect; depth: number }>()
const cameraTransform = () => {
  const z = liveCamera.zoom, cx = stageWidth() / 2, cy = window.innerHeight / 2
  if (z === 1) return `translate(${-liveCamera.x}px, ${liveCamera.y}px)`
  return `translate3d(${cx * (1 - z) - liveCamera.x * z}px,${cy * (1 - z) + liveCamera.y * z}px,0) scale(${z})`
}
const place = (el: HTMLElement) => { el.style.transformOrigin = '0 0'; el.style.transform = cameraTransform() }
// A parallax layer lives inside the world element, which already carries the zoom and the camera: it only gives
// back depth × the camera's travel (x and y alike), never a second zoom.
const parallaxTransform = (depth: number) => `translate3d(${liveCamera.x * depth}px,${-liveCamera.y * depth}px,0)`

function updateRegions() {
  const screenView = zoomedView(stageWidth(), window.innerHeight, liveCamera.zoom)
  const view = { ...screenView, x: screenView.x + liveCamera.x, y: screenView.y - liveCamera.y }
  regions.forEach(({ el, bounds, depth }) => {
    const visible = String(intersectsView({ ...bounds, x: bounds.x + liveCamera.x * depth }, view, 192))
    if (el.getAttribute('data-patio-visible') !== visible) el.setAttribute('data-patio-visible', visible)
  })
}

// The zoom pivots on the stage's centre: when the stage changes size (window resize, the editor's dock opening or
// being dragged) with the camera standing still, the followers are placed again (or they drift from the world) and
// the visible regions are measured again. One listener while anything is registered.
const onResize = () => { followers.forEach(place); updateRegions() }
const listening = () => followers.size + regions.size > 0
function register(add: () => void) {
  const was = listening(); add()
  if (!was && listening()) window.addEventListener('resize', onResize)
}
function unregister(remove: () => void) {
  remove()
  if (!listening()) window.removeEventListener('resize', onResize)
}

// Numeric world bounds: no getBoundingClientRect in the camera's visibility pass.
export function watchCameraRegion(el: HTMLElement | SVGElement, bounds: ViewRect, depth = 0) {
  const region = { el, bounds, depth }
  register(() => regions.add(region)); updateRegions()
  return () => unregister(() => regions.delete(region))
}

export function followCamera(el: HTMLElement) {
  register(() => followers.add(el)); place(el)
  return () => unregister(() => followers.delete(el))
}

export function followParallax(el: SVGElement, depth: number) {
  parallaxLayers.set(el, depth)
  el.style.transformOrigin = '0 0'; el.style.transform = parallaxTransform(depth)
  return () => { parallaxLayers.delete(el) }
}

// Scenery in a parallax depth of its own (LayoutElement.depth), inside a layer that already follows the camera (the
// world, a FollowLayer, the editor's overlay): it slides d × camX right and d × camY up, so on the screen it moves
// (1 - d) as fast as the ground. Zoom is the parent's.
// Vertically they slide from the camera's resting height (the floor near the screen's bottom), so a far thing
// placed on the horizon stays there on any screen size and only rises when the camera climbs.
const depthFollowers = new Map<HTMLElement | SVGElement, number>()
let restY = 0
const placeDepth = (depth: number, el: HTMLElement | SVGElement) => {
  el.style.transform = depth ? `translate3d(${(liveCamera.x * depth).toFixed(2)}px,${(-(liveCamera.y - restY) * depth).toFixed(2)}px,0)` : ''
}
// the camera's y at rest (ParquinhoPlay sets it when the screen or the Pátio's height changes)
export function setCameraRestY(y: number) {
  if (y === restY) return
  restY = y
  depthFollowers.forEach(placeDepth)
  cameraListeners.forEach(fn => fn(liveCamera.x, liveCamera.y - restY))
}
export function followDepth(el: HTMLElement | SVGElement, depth: number) {
  depthFollowers.set(el, depth); placeDepth(depth, el)
  return () => { depthFollowers.delete(el) }
}
// a world x of something at `depth` under the current camera, and back (for placing and dragging it)
export const depthOffset = (depth: number) => ({ x: liveCamera.x * depth, y: -(liveCamera.y - restY) * depth })

// called with the camera after each move, its y from the resting height (the wires between poles of different
// depths are redrawn with it)
const cameraListeners = new Set<(x: number, y: number) => void>()
export function onCameraMove(fn: (x: number, y: number) => void) {
  cameraListeners.add(fn); fn(liveCamera.x, liveCamera.y - restY)
  return () => { cameraListeners.delete(fn) }
}

export function moveLiveCamera(x: number, y: number, zoom = liveCamera.zoom) {
  if (x === liveCamera.x && y === liveCamera.y && zoom === liveCamera.zoom) return
  liveCamera.x = x; liveCamera.y = y; liveCamera.zoom = zoom
  depthFollowers.forEach(placeDepth)
  cameraListeners.forEach(fn => fn(x, y - restY))
  followers.forEach(place)
  parallaxLayers.forEach((depth, el) => { el.style.transformOrigin = '0 0'; el.style.transform = parallaxTransform(depth) })
  updateRegions()
}

// a screen point in world units
export const screenToWorld = (sx: number, sy: number) => {
  const cx = stageWidth() / 2, cy = window.innerHeight / 2, z = liveCamera.zoom
  const x = (sx - cx) / z + cx, y = (sy - cy) / z + cy
  return { x: x + liveCamera.x, y: y - liveCamera.y }
}
