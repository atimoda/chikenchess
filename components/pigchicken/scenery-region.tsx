"use client"

import { useEffect, useRef, type HTMLAttributes } from 'react'
import { watchCameraRegion } from '@/lib/pigchicken/live-camera'
import type { ViewRect } from '@/lib/pigchicken/viewport'

// depth: the parallax depth it stands in (LayoutElement.depth), so it is seen where the camera shows it
export function SceneryRegion({ bounds, depth = 0, children, ...props }: HTMLAttributes<HTMLDivElement> & { bounds: ViewRect; depth?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { x, y, w, h } = bounds
  useEffect(() => ref.current ? watchCameraRegion(ref.current, { x, y, w, h }, depth) : undefined, [x, y, w, h, depth])
  return <div {...props} ref={ref}>{children}</div>
}

export function SceneryVisibilityStyles() {
  return <style>{`
    [data-patio-visible="false"] { visibility: hidden; content-visibility: hidden; }
    [data-patio-visible="false"] *, [data-patio-visible="false"] { animation-play-state: paused !important; }
  `}</style>
}
