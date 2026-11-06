export type SceneryGust = { strength: number; durationMs: number; fromX?: number; toX?: number }

const MAX_WIND = 8
const clamp = (strength: number) => Math.max(-MAX_WIND, Math.min(MAX_WIND, strength))

export function createSceneryWind(schedule = setTimeout, cancel = clearTimeout) {
  const gusts = new Map<symbol, { gust: SceneryGust; timer: ReturnType<typeof setTimeout> }>()
  const receivers = new Map<(strength: number) => void, number>()
  const sample = (x: number) => {
    let strength = 0
    for (const { gust } of gusts.values()) {
      if (x >= (gust.fromX ?? -Infinity) && x <= (gust.toX ?? Infinity)) strength += gust.strength
    }
    return clamp(strength)
  }
  const publish = () => receivers.forEach((x, receive) => receive(sample(x)))
  return {
    watch(x: number, receive: (strength: number) => void) {
      receivers.set(receive, x)
      receive(sample(x))
      return () => { receivers.delete(receive) }
    },
    gust(gust: SceneryGust) {
      if (!Number.isFinite(gust.strength) || !gust.strength || !Number.isFinite(gust.durationMs) || gust.durationMs <= 0) return () => {}
      const key = Symbol()
      const stop = () => {
        const active = gusts.get(key)
        if (!active) return
        cancel(active.timer)
        gusts.delete(key)
        publish()
      }
      gusts.set(key, { gust: { ...gust, strength: clamp(gust.strength) }, timer: schedule(stop, Math.min(30_000, gust.durationMs)) })
      publish()
      return stop
    },
    clear() {
      if (!gusts.size) return
      gusts.forEach(({ timer }) => cancel(timer))
      gusts.clear()
      publish()
    },
  }
}

const sceneryWind = createSceneryWind()
export const gustSceneryWind = sceneryWind.gust
export const watchSceneryWind = sceneryWind.watch
export const clearSceneryWind = sceneryWind.clear
