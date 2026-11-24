// The Pátio's camera as it is right now (ParquinhoPlay moves it every frame): x is the world x at the screen's
// left edge, y the screen y of world y = 0. Layers drawn above the chicken (the foreground, the editor's handles)
// register their world element here and follow it, so they line up with the world underneath.
import { intersectsView, zoomedView, type ViewRect } from './viewport'
import { stageHeight, stageTop, stageWidth, stageY } from "../stage-size"

export const liveCamera = { x: 0, y: 0, zoom: 1 }
const followers = new Set<HTMLElement>()
const parallaxLayers = new Map<HTMLElement | SVGElement, number>()
const regions = new Set<{ el: HTMLElement | SVGElement; bounds: ViewRect; depth: number; pinned: boolean }>()
// The layers that move with the camera (the world, each parallax layer, the layers in front) carry the hint
// `will-change: transform` while the zoom is 100%. Without it the browser draws a moved layer again from scratch
// whenever the fraction of a screen pixel it sits on changes, so a camera moving by fractions redrew the whole visible
// part of the world, of each parallax layer and of each layer in front at every step (Chromium, Redmi screen: ~6000
// raster tasks in 3 s of walking, ~900 with the hint). A phone could not keep up and the scenery and the numbers of
// the Grade de blocos blinked while walking. With another zoom the hint is dropped, so the layers are drawn again
// at that zoom's sharpness (a hinted layer keeps the scale it was first drawn at).
export function holdLayer(el: HTMLElement | SVGElement, zoom = liveCamera.zoom) {
  const hint = zoom === 1 ? 'transform' : ''
  if (el.style.willChange !== hint) el.style.willChange = hint
}
// the world's own transform (ParquinhoPlay) and that of the layers that follow it: always a 3D translate, so the
// compositor moves the follower's layer, already painted (a 2D one at zoom 1 repainted it every frame)
export function worldTransform(camX: number, camY: number, z: number) {
  const cx = stageWidth() / 2, cy = stageHeight() / 2
  const t = `translate3d(${cx * (1 - z) - camX * z}px,${cy * (1 - z) + camY * z}px,0)`
  return z === 1 ? t : `${t} scale(${z})`
}
// a point of the world (x, y in its own px; box: the world's element on the screen now) in the chickens' coordinates:
// the stage's, before the camera's zoom around its middle
export function worldPointOnStage(box: DOMRect, x: number, y: number) {
  const z = liveCamera.zoom, W = stageWidth(), H = stageHeight()
  return { x: (box.left + x * z - W / 2) / z + W / 2, y: (box.top - stageTop() + y * z - H / 2) / z + H / 2 }
}
const cameraTransform = () => worldTransform(liveCamera.x, liveCamera.y, liveCamera.zoom)
const place = (el: HTMLElement) => { el.style.transformOrigin = '0 0'; el.style.transform = cameraTransform(); holdLayer(el) }
// A parallax layer lives inside the world element, which already carries the zoom and the camera: it only gives
// back depth × the camera's travel (x and y alike), never a second zoom.
const parallaxTransform = (depth: number) => `translate3d(${liveCamera.x * depth}px,${-liveCamera.y * depth}px,0)`

function updateRegions() {
  const screenView = zoomedView(stageWidth(), stageHeight(), liveCamera.zoom)
  const view = { ...screenView, x: screenView.x + liveCamera.x, y: screenView.y - liveCamera.y }
  regions.forEach(({ el, bounds, depth, pinned }) => {
    // where the region is now: its depth slides it on both axes (depthOffset), so a cloud or a far tree is tested
    // where the screen shows it, also with the camera up high
    const o = depthOffset(depth, pinned)
    const visible = String(intersectsView({ ...bounds, x: bounds.x + o.x, y: bounds.y + o.y }, view, 192))
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
// depth/pinned: how it slides with the camera, as followDepth (a parallax layer of the backdrop slides like a pinned
// one: from the camera at 0)
export function watchCameraRegion(el: HTMLElement | SVGElement, bounds: ViewRect, depth = 0, pinned = false) {
  const region = { el, bounds, depth, pinned }
  register(() => regions.add(region)); updateRegions()
  return () => unregister(() => regions.delete(region))
}

export function followCamera(el: HTMLElement) {
  register(() => followers.add(el)); place(el)
  return () => unregister(() => followers.delete(el))
}

export function followParallax(el: HTMLElement | SVGElement, depth: number) {
  parallaxLayers.set(el, depth)
  el.style.transformOrigin = '0 0'; el.style.transform = parallaxTransform(depth); holdLayer(el)
  return () => { parallaxLayers.delete(el) }
}

// Scenery in a parallax depth of its own (LayoutElement.depth), inside a layer that already follows the camera (the
// world, a FollowLayer, the editor's overlay): it slides d × camX right and d × camY up, so on the screen it moves
// (1 - d) as fast as the ground. Zoom is the parent's.
// Vertically they slide from the camera's resting height (the floor near the screen's bottom), so a far thing
// placed on the horizon stays there on any screen size and only rises when the camera climbs.
// Pinned to a layer of the scenery far behind (LayoutElement.backdrop), it slides vertically from the camera at 0
// like that layer, so it keeps its point of the layer on every screen.
const depthFollowers = new Map<HTMLElement | SVGElement, { depth: number; pinned: boolean }>()
let restY = 0
const placeDepth = ({ depth, pinned }: { depth: number; pinned: boolean }, el: HTMLElement | SVGElement) => {
  el.style.transform = depth ? `translate3d(${(liveCamera.x * depth).toFixed(2)}px,${(-(liveCamera.y - (pinned ? 0 : restY)) * depth).toFixed(2)}px,0)` : ''
  holdLayer(el, depth ? liveCamera.zoom : 0)
}
export const cameraRestY = () => restY
// the camera's y at rest (ParquinhoPlay sets it when the screen or the Pátio's height changes)
export function setCameraRestY(y: number) {
  if (y === restY) return
  restY = y
  depthFollowers.forEach(placeDepth)
  updateRegions()
  cameraListeners.forEach(fn => fn(liveCamera.x, liveCamera.y - restY))
}
export function followDepth(el: HTMLElement | SVGElement, depth: number, pinned = false) {
  const f = { depth, pinned }
  depthFollowers.set(el, f); placeDepth(f, el)
  return () => { depthFollowers.delete(el) }
}
// a world x of something at `depth` under the current camera, and back (for placing and dragging it)
export const depthOffset = (depth: number, pinned = false) => ({ x: liveCamera.x * depth, y: -(liveCamera.y - (pinned ? 0 : restY)) * depth })

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
  parallaxLayers.forEach((depth, el) => { el.style.transformOrigin = '0 0'; el.style.transform = parallaxTransform(depth); holdLayer(el) })
  updateRegions()
}

// a point on the window (a pointer's clientX/clientY) in world units
export const screenToWorld = (sx: number, clientY: number) => {
  const cx = stageWidth() / 2, cy = stageHeight() / 2, z = liveCamera.zoom, sy = stageY(clientY)
  const x = (sx - cx) / z + cx, y = (sy - cy) / z + cy
  return { x: x + liveCamera.x, y: y - liveCamera.y }
}

// a world point on the stage (not the window: the stage starts stageTop() below it)
export const worldToScreen = (wx: number, wy: number) => {
  const cx = stageWidth() / 2, cy = stageHeight() / 2, z = liveCamera.zoom
  return { x: (wx - liveCamera.x - cx) * z + cx, y: (wy + liveCamera.y - cy) * z + cy }
}
