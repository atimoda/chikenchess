// The Pátio's camera as it is right now (ParquinhoPlay moves it every frame): x is the world x at the screen's
// left edge, y the screen y of world y = 0. Layers drawn above the chicken (the foreground, the editor's handles)
// register their world element here and follow it, so they line up with the world underneath.
export const liveCamera = { x: 0, y: 0 }
const followers = new Set<HTMLElement>()
const place = (el: HTMLElement) => { el.style.transform = `translate3d(${-liveCamera.x}px,${liveCamera.y}px,0)` }

export function followCamera(el: HTMLElement) {
  followers.add(el); place(el)
  return () => { followers.delete(el) }
}

export function moveLiveCamera(x: number, y: number) {
  if (x === liveCamera.x && y === liveCamera.y) return
  liveCamera.x = x; liveCamera.y = y
  followers.forEach(place)
}

// a screen point in world units
export const screenToWorld = (sx: number, sy: number) => ({ x: sx + liveCamera.x, y: sy - liveCamera.y })
