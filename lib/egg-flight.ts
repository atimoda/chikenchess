import type { Square } from "chess.js"

export interface EggFlight {
  id: number
  amount: number
  direction: 'earn' | 'spend'
  owner?: 'w' | 'b'
  sourceSquare?: Square
  from?: { left: number; top: number; width: number; height: number }
  to?: { left: number; top: number; width: number; height: number }
}

/**
 * Flies golden eggs between a board square or a button and an egg counter.
 * Each egg is a fixed-position element animated outside React; its cleanup is
 * registered in `cleanups` so the match can cancel flights in progress.
 */
export function launchEggFlight(flight: EggFlight, counterEl: HTMLElement | null, board: HTMLElement | null, cleanups: Set<() => void>) {
  const source = flight.direction === 'earn' && flight.sourceSquare
    ? board?.querySelector<HTMLButtonElement>(`[data-square="${flight.sourceSquare}"]`)
    : counterEl
  const target = flight.direction === 'earn' ? counterEl : null
  const rectPoint = (rect: { left: number; top: number; width: number; height: number }) => ({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  })
  const fromRect = flight.direction === 'spend' ? flight.from : source?.getBoundingClientRect()
  const toRect = flight.direction === 'spend' ? flight.to : target?.getBoundingClientRect()
  const finishEgg = () => {
    counterEl?.animate([
      { transform: 'scale(1)', boxShadow: '0 0 0 rgba(251,191,36,0)' },
      { transform: `scale(${flight.direction === 'earn' ? 1.24 : .88})`, boxShadow: `0 0 22px rgba(${flight.direction === 'earn' ? '251,191,36' : '248,113,113'},.8)` },
      { transform: 'scale(1)', boxShadow: '0 0 0 rgba(251,191,36,0)' },
    ], { duration: 370, easing: 'ease-out' })
  }
  if ((!source && flight.direction === 'earn') || !fromRect || !toRect || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < flight.amount; i++) finishEgg()
    return
  }
  const { x: x0, y: y0 } = rectPoint(fromRect)
  const { x: x1, y: y1 } = rectPoint(toRect)
  const arc = Math.max(70, Math.abs(x1 - x0) * .18)
  const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

  for (let index = 0; index < flight.amount; index++) {
    const egg = document.createElement('span')
    egg.setAttribute('aria-hidden', 'true')
    egg.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:28px;border-radius:50% 50% 45% 45% / 60% 60% 40% 40%;background:radial-gradient(circle at 32% 25%,#fff8c4 0%,#facc15 43%,#b45309 100%);box-shadow:0 0 14px #fbbf24;pointer-events:none;z-index:100;will-change:transform;'
    document.body.appendChild(egg)
    let frame = 0
    let timer = 0
    let startTime = 0
    let done = false
    const rotation = Math.random() * 720
    const cleanup = () => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      window.cancelAnimationFrame(frame)
      egg.remove()
      cleanups.delete(cleanup)
    }
    cleanups.add(cleanup)

    if (flight.direction === 'earn') {
      const floatDuration = 500
      const pauseDuration = 700
      const flightDuration = 720
      const spacing = flight.amount > 1 ? Math.min(18, 70 / (flight.amount - 1)) : 0
      const spreadX = (index - (flight.amount - 1) / 2) * spacing
      const xFloat = x0 + spreadX
      const yFloat = y0 - 50
      const flightStart = floatDuration + pauseDuration + index * 90

      const tick = (time: number) => {
        if (!startTime) startTime = time
        const elapsed = time - startTime

        if (elapsed < floatDuration) {
          const p = Math.min(1, elapsed / floatDuration)
          const e = easeInOut(p)
          const curX = x0 + spreadX * e
          const curY = y0 - 50 * e
          egg.style.transform = `translate3d(${curX - 11}px,${curY - 14}px,0)`
          frame = window.requestAnimationFrame(tick)
          return
        }

        if (elapsed < flightStart) {
          egg.style.transform = `translate3d(${xFloat - 11}px,${yFloat - 14}px,0)`
          frame = window.requestAnimationFrame(tick)
          return
        }

        const flightElapsed = elapsed - flightStart
        const p = Math.min(1, flightElapsed / flightDuration)
        const e = easeInOut(p)
        const targetRect = target?.getBoundingClientRect() ?? toRect
        const { x: curX1, y: curY1 } = rectPoint(targetRect)
        const flightArc = Math.max(60, Math.abs(curX1 - xFloat) * 0.16)
        const curX = xFloat + (curX1 - xFloat) * e
        const curY = yFloat + (curY1 - yFloat) * e - flightArc * 4 * e * (1 - e)
        egg.style.transform = `translate3d(${curX - 11}px,${curY - 14}px,0) scale(${1 - 0.3 * e}) rotate(-${rotation * e}deg)`

        if (p < 1) {
          frame = window.requestAnimationFrame(tick)
        } else {
          cleanup()
          finishEgg()
        }
      }

      egg.style.transform = `translate3d(${x0 - 11}px,${y0 - 14}px,0)`
      frame = window.requestAnimationFrame(tick)
    } else {
      const tick = (time: number) => {
        if (!startTime) startTime = time
        const progress = Math.min(1, (time - startTime) / 780)
        const eased = Math.pow(progress, 3)
        const x = x0 + (x1 - x0) * eased
        const y = y0 + (y1 - y0) * eased - arc * 4 * eased * (1 - eased)
        egg.style.transform = `translate3d(${x - 11}px,${y - 14}px,0) scale(${1 - .3 * eased}) rotate(-${rotation * eased}deg)`
        if (progress < 1) frame = window.requestAnimationFrame(tick)
        else { cleanup(); finishEgg() }
      }
      egg.style.transform = `translate3d(${x0 - 11}px,${y0 - 14}px,0)`
      timer = window.setTimeout(() => { frame = window.requestAnimationFrame(tick) }, index * 110)
    }
  }
}
