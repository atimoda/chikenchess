"use client"

import { useEffect, useRef, type HTMLAttributes } from 'react'
import { watchCameraRegion } from '@/lib/pigchicken/live-camera'
import type { ViewRect } from '@/lib/pigchicken/viewport'

export function SceneryRegion({ bounds, children, ...props }: HTMLAttributes<HTMLDivElement> & { bounds: ViewRect }) {
  const ref = useRef<HTMLDivElement>(null)
  const { x, y, w, h } = bounds
  useEffect(() => ref.current ? watchCameraRegion(ref.current, { x, y, w, h }) : undefined, [x, y, w, h])
  return <div {...props} ref={ref}>{children}</div>
}

export function SceneryVisibilityStyles() {
  return <style>{`
    [data-patio-visible="false"] { visibility: hidden; content-visibility: hidden; }
    [data-patio-visible="false"] *, [data-patio-visible="false"] { animation-play-state: paused !important; }
  `}</style>
}
