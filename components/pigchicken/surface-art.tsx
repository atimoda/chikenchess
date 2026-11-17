"use client"

// The art of the Chãos (7 biomes) and Paredes (3 styles): the element's outline filled with its texture, shaded
// towards the back, and the walkable top (the edges facing up) drawn with the biome's cap.
import { memo, useId, useMemo } from "react"
import { surfaceTopEdges, type SurfaceParams, type SurfacePoint } from "@/lib/pigchicken/surfaces"

type Look = {
  fill: string; shade: string; outline: string
  // the cap over the walkable top: widths and colours, back to front
  cap: [width: number, color: string][]
  pattern: { w: number; h: number; body: React.ReactNode }
}

const LOOKS: Record<SurfaceParams["style"], Look> = {
  village: {
    fill: "#77707a", shade: "#3d3846", outline: "#34303c", cap: [[8, "#34303c"], [3, "#e2cbab"]],
    pattern: { w: 97, h: 81, body: <>
      <path d="M0 15l21 3 13-3 23 3 16-6 24 2M0 57l20-3 22 6 17-8 38 2M21 18l-4 20 3 16m51-40-8 23-4 15m-18 8-3 21m47-26-8 26" fill="none" stroke="#413b48" strokeWidth="1.4" opacity=".41" />
      <path d="M4 17l16 3 14-2m38 38 18-1m-64-1 13 4" fill="none" stroke="#b3a29a" strokeWidth="1.4" opacity=".41" />
    </> },
  },
  meadow: {
    fill: "#6b4a2e", shade: "#2e1f14", outline: "#2a1c12", cap: [[16, "#2f4a1c"], [11, "#5e9b35"], [3, "#9bd45a"]],
    pattern: { w: 60, h: 46, body: <>
      <ellipse cx="12" cy="14" rx="5" ry="3" fill="#8a6542" opacity=".55" />
      <ellipse cx="42" cy="31" rx="7" ry="4" fill="#4c3320" opacity=".5" />
      <path d="M28 6l6 2M5 36l8-1M50 12l5 3" stroke="#9b7550" strokeWidth="2" strokeLinecap="round" opacity=".45" />
    </> },
  },
  desert: {
    fill: "#d4a35f", shade: "#8d5f31", outline: "#7a5129", cap: [[9, "#9c6b37"], [5, "#f3d79e"]],
    pattern: { w: 80, h: 34, body: <>
      <path d="M0 10q10-6 20 0t20 0 20 0 20 0M0 27q10-6 20 0t20 0 20 0 20 0" fill="none" stroke="#b9854a" strokeWidth="2" opacity=".45" />
    </> },
  },
  snow: {
    fill: "#6f7b88", shade: "#38414c", outline: "#2f3740", cap: [[20, "#8c9bab"], [16, "#f4f8fb"], [4, "#ffffff"]],
    pattern: { w: 90, h: 70, body: <>
      <path d="M0 18l24 4 18-5 22 6 26-4M10 50l22-6 20 7 38-3M30 22l-5 22m40-21-6 24" fill="none" stroke="#4d5763" strokeWidth="1.6" opacity=".5" />
      <path d="M6 20l14 2m40 30 16-2" fill="none" stroke="#c8d4e0" strokeWidth="1.6" opacity=".5" />
    </> },
  },
  volcanic: {
    fill: "#2b2426", shade: "#120d0e", outline: "#0c0809", cap: [[9, "#4a3b39"], [2.5, "#ff8a3d"]],
    pattern: { w: 110, h: 84, body: <>
      <path d="M0 30l18 6 14-10 20 8 18-4 22 9 18-5M40 34l-6 22 10 14m36-31 4 20-12 18" fill="none" stroke="#ff6a2b" strokeWidth="2" opacity=".55" />
      <path d="M8 62l20-4 16 6" fill="none" stroke="#5a4744" strokeWidth="2" opacity=".6" />
    </> },
  },
  moon: {
    fill: "#9a9aa1", shade: "#3b3b44", outline: "#2b2b32", cap: [[8, "#5f5f68"], [3, "#e4e4e8"]],
    pattern: { w: 132, h: 96, body: <>
      <ellipse cx="30" cy="24" rx="17" ry="7" fill="#6c6c75" opacity=".6" />
      <path d="M13 24a17 7 0 0 0 34 0" fill="none" stroke="#d2d2d8" strokeWidth="1.6" opacity=".7" />
      <ellipse cx="96" cy="62" rx="24" ry="9" fill="#686871" opacity=".55" />
      <path d="M72 62a24 9 0 0 0 48 0" fill="none" stroke="#d2d2d8" strokeWidth="1.8" opacity=".65" />
      <ellipse cx="22" cy="78" rx="7" ry="3" fill="#71717a" opacity=".6" />
      <ellipse cx="78" cy="14" rx="5" ry="2.2" fill="#71717a" opacity=".6" />
      <circle cx="58" cy="44" r="1.6" fill="#c8c8ce" opacity=".6" /><circle cx="118" cy="30" r="1.3" fill="#c8c8ce" opacity=".6" />
    </> },
  },
  mars: {
    fill: "#b0532f", shade: "#4d1c0e", outline: "#3a1409", cap: [[9, "#7d311a"], [4, "#e39a68"]],
    pattern: { w: 116, h: 80, body: <>
      <path d="M0 16q14-5 29 0t29 0 29 0 29 0M0 52q14-5 29 0t29 0 29 0 29 0" fill="none" stroke="#c97a4f" strokeWidth="1.8" opacity=".4" />
      <ellipse cx="34" cy="34" rx="7" ry="4" fill="#6e2a16" opacity=".55" />
      <ellipse cx="88" cy="68" rx="9" ry="4.5" fill="#6e2a16" opacity=".5" />
      <ellipse cx="74" cy="30" rx="12" ry="4.5" fill="#8a3a1f" opacity=".55" />
      <path d="M62 30a12 4.5 0 0 0 24 0" fill="none" stroke="#e7a77a" strokeWidth="1.4" opacity=".55" />
      <circle cx="14" cy="66" r="2.2" fill="#5a2212" opacity=".6" /><circle cx="104" cy="40" r="1.8" fill="#5a2212" opacity=".6" />
    </> },
  },
  brick: {
    fill: "#9c4f3a", shade: "#4c2219", outline: "#3b2019", cap: [[6, "#3b2019"], [3, "#d9a789"]],
    pattern: { w: 48, h: 32, body: <>
      <path d="M0 0.75h48M0 16.75h48M24 0v16M0 16v16M48 16v16" fill="none" stroke="#d8c2a2" strokeWidth="1.5" opacity=".75" />
      <path d="M3 4h18M27 20h18" stroke="#c0705a" strokeWidth="2" opacity=".5" />
    </> },
  },
  stone: {
    fill: "#80838c", shade: "#3c3e46", outline: "#2c2e34", cap: [[6, "#2c2e34"], [3, "#c9ccd4"]],
    pattern: { w: 96, h: 72, body: <>
      <path d="M0 1h96M0 37h96M38 1v36M80 1v36M18 37v35M62 37v35" fill="none" stroke="#545862" strokeWidth="2.5" />
      <path d="M4 5h30M42 5h34M22 41h36M66 41h26" stroke="#a3a7b1" strokeWidth="2" opacity=".6" />
    </> },
  },
  wood: {
    fill: "#8a5a34", shade: "#3f2715", outline: "#2e1c0f", cap: [[6, "#2e1c0f"], [3, "#c99560"]],
    pattern: { w: 26, h: 120, body: <>
      <path d="M1 0v120" stroke="#5b3a20" strokeWidth="2.5" />
      <path d="M9 18q3 10 0 22M17 66q-3 12 0 26" fill="none" stroke="#6f4627" strokeWidth="1.5" opacity=".7" />
      <circle cx="6" cy="10" r="1.6" fill="#3a2414" /><circle cx="6" cy="110" r="1.6" fill="#3a2414" />
    </> },
  },
}

export const SurfaceArt = memo(function SurfaceArt({ surface, w, h }: { surface: SurfaceParams; w: number; h: number }) {
  const id = useId()
  const look = LOOKS[surface.style] ?? LOOKS.village
  const { points, cap } = useMemo(() => {
    const poly: SurfacePoint[] = surface.points.map(([x, y]) => [(x * w) / 100, (y * h) / 100])
    return {
      points: poly.map(p => p.join(",")).join(" "),
      cap: surfaceTopEdges(poly).map(([a, b]) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`).join(""),
    }
  }, [surface.points, w, h])
  return (
    <svg aria-hidden="true" data-surface-style={surface.style} width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 overflow-visible">
      <defs>
        <pattern id={`${id}p`} patternUnits="userSpaceOnUse" width={look.pattern.w} height={look.pattern.h}>{look.pattern.body}</pattern>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.shade} stopOpacity="0" />
          <stop offset="1" stopColor={look.shade} stopOpacity=".55" />
        </linearGradient>
      </defs>
      <polygon points={points} fill={look.fill} />
      <polygon points={points} fill={`url(#${id}p)`} />
      <polygon points={points} fill={`url(#${id}g)`} stroke={look.outline} strokeWidth="3" strokeLinejoin="round" />
      {cap && look.cap.map(([width, color], i) => <path key={i} d={cap} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
  )
})
