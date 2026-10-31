import type { Square } from "chess.js"

export interface EggFlight {
  id: number
  amount: number
  /** The last `overflow` eggs of an earn flight hit a full counter: they puff away and only add historic points. */
  overflow?: number
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
  const overflow = flight.direction === 'earn' ? Math.max(0, Math.min(flight.amount, flight.overflow ?? 0)) : 0
  const firstOverflow = flight.amount - overflow
  let labelShown = false
  const showLabel = () => {
    if (labelShown || overflow <= 0) return
    labelShown = true
    showHistoricPointsLabel(counterEl, overflow, cleanups)
  }
  if ((!source && flight.direction === 'earn') || !fromRect || !toRect || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < firstOverflow; i++) finishEgg()
    showLabel()
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
          egg.style.transform = `translate3d(${curX - 11}px,${curY - 14}px,0) rotate(${360 * e}deg)`
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
        } else if (index >= firstOverflow) {
          // The counter is full: the egg vanishes in a puff, turns grey and drops away.
          showLabel()
          puffAt(curX, curY, cleanups)
          dropGreyEgg(egg, curX, curY, rotation, cleanup)
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

/** Grey egg left after the puff: falls 30 px, turning a random 0–50°, and fades out. */
function dropGreyEgg(egg: HTMLElement, x: number, y: number, rotation: number, cleanup: () => void) {
  egg.style.background = 'radial-gradient(circle at 32% 25%,#f4f4f5 0%,#a1a1aa 43%,#52525b 100%)'
  egg.style.boxShadow = 'none'
  const start = `translate3d(${x - 11}px,${y - 14}px,0) scale(.7) rotate(-${rotation}deg)`
  const turn = Math.random() * 50 * (Math.random() < .5 ? -1 : 1)
  const end = `translate3d(${x - 11}px,${y + 16}px,0) scale(.7) rotate(${-rotation + turn}deg)`
  const animation = egg.animate([
    { transform: start, opacity: 1 },
    { transform: end, opacity: 0 },
  ], { duration: 650, easing: 'cubic-bezier(.45,0,.75,.6)', fill: 'forwards' })
  animation.onfinish = cleanup
  animation.oncancel = cleanup
}

/** Small cloud of grey-white puffs where an overflow egg touched the counter. */
function puffAt(x: number, y: number, cleanups: Set<() => void>) {
  const cloud = document.createElement('span')
  cloud.setAttribute('aria-hidden', 'true')
  cloud.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;pointer-events:none;z-index:101;`
  const puffs = 7
  for (let i = 0; i < puffs; i++) {
    const puff = document.createElement('span')
    const size = 10 + Math.random() * 8
    const angle = (i / puffs) * Math.PI * 2 + Math.random() * .5
    const distance = 12 + Math.random() * 8
    puff.style.cssText = `position:absolute;left:${-size / 2}px;top:${-size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#ffffff 0%,#e4e4e7 55%,rgba(212,212,216,.6) 100%);`
    puff.animate([
      { transform: 'translate(0,0) scale(.3)', opacity: .95 },
      { transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px) scale(1.15)`, opacity: 0 },
    ], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' })
    cloud.appendChild(puff)
  }
  document.body.appendChild(cloud)
  let timer = 0
  const cleanup = () => {
    window.clearTimeout(timer)
    cloud.remove()
    cleanups.delete(cleanup)
  }
  cleanups.add(cleanup)
  timer = window.setTimeout(cleanup, 520)
}

/** Grey "+X historic points" under an egg counter for 2 s; a newer label replaces the one shown there. */
export function showHistoricPointsLabel(counterEl: HTMLElement | null, amount: number, cleanups: Set<() => void>) {
  if (!counterEl || amount <= 0) return
  const rect = counterEl.getBoundingClientRect()
  document.querySelectorAll<HTMLElement>('[data-historic-points-label]').forEach(label => {
    if (label.dataset.historicPointsLabel === `${Math.round(rect.left)}:${Math.round(rect.top)}`) label.remove()
  })
  const label = document.createElement('span')
  label.dataset.historicPointsLabel = `${Math.round(rect.left)}:${Math.round(rect.top)}`
  label.textContent = `+${amount} historic ${amount === 1 ? 'point' : 'points'}`
  label.setAttribute('role', 'status')
  label.style.cssText = `position:fixed;left:${rect.left + rect.width / 2}px;top:${rect.bottom + 4}px;transform:translateX(-50%);white-space:nowrap;font:700 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:#a1a1aa;text-shadow:1px 1px 1px #000;pointer-events:none;z-index:101;`
  document.body.appendChild(label)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduced) label.animate([
    { opacity: 0, offset: 0 },
    { opacity: 1, offset: .1 },
    { opacity: 1, offset: .85 },
    { opacity: 0, offset: 1 },
  ], { duration: 2000, fill: 'forwards' })
  let timer = 0
  const cleanup = () => {
    window.clearTimeout(timer)
    label.remove()
    cleanups.delete(cleanup)
  }
  cleanups.add(cleanup)
  timer = window.setTimeout(cleanup, 2000)
}
