"use client"

import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react"
import type { Square } from "chess.js"

export interface WidgetConnection {
  x1: number
  y1: number
  x2: number
  y2: number
  anchorX1: number
  anchorY1: number
  anchorX2: number
  anchorY2: number
  sourceSide?: 'left' | 'right' | 'top' | 'bottom'
  targetSide?: 'left' | 'right' | 'top' | 'bottom'
}

export interface GameWidgetPosition { x: number; y: number }
export interface GameWidgetLayoutItem {
  ref: RefObject<HTMLDivElement | null>
  on: boolean
  position: GameWidgetPosition | null
  setPosition: Dispatch<SetStateAction<GameWidgetPosition | null>>
}
export interface GameWidgetLayoutOptions {
  rootRef: RefObject<HTMLDivElement | null>
  boardAreaRef: RefObject<HTMLDivElement | null>
  boardScale: number
  musicEngineOn: boolean
  selectedSquare: Square | string | null
  orientation?: 'white' | 'black'
  introPhase: number
  activeWidgetOrder: readonly string[]
  /** Piece row hovered in the Song & Instruments list, with its on/off dot. */
  hoveredPiece?: { square: Square; anchor: HTMLElement } | null
  /** Board pan offset: a pan moves the board without resizing it, so connectors follow it here. */
  boardOffset?: { x: number; y: number }
  widgets: Partial<Record<'knobs' | 'pieceDebug' | 'globalPanel' | 'mixer' | 'spectrogram' | 'liveCode' | 'botControl', GameWidgetLayoutItem>>
}

export { connectRects, squareRect }
export type { ConnectionRect }

const ignorePosition: Dispatch<SetStateAction<GameWidgetPosition | null>> = () => {}

type ConnectionRect = { left: number; right: number; top: number; bottom: number; width: number; height: number }
type ConnectionSide = NonNullable<WidgetConnection['sourceSide']>

function squareRect(square: Square, boardRect: ConnectionRect, orientation: 'white' | 'black'): ConnectionRect | null {
  const fileIndex = 'abcdefgh'.indexOf(square[0])
  const rank = Number.parseInt(square[1], 10)
  if (fileIndex < 0 || !Number.isFinite(rank)) return null
  const width = boardRect.width / 8, height = boardRect.height / 8
  const rowFromTop = orientation === 'black' ? rank - 1 : 8 - rank
  const column = orientation === 'black' ? 7 - fileIndex : fileIndex
  const left = boardRect.left + column * width
  const top = boardRect.top + rowFromTop * height
  return { left, top, right: left + width, bottom: top + height, width, height }
}

/** Straight-side connection from one rect to another, relative to the container. */
function connectRects(sourceRect: ConnectionRect, targetRect: ConnectionRect, containerRect: ConnectionRect): WidgetConnection {
  const dx = targetRect.left + targetRect.width / 2 - sourceRect.left - sourceRect.width / 2
  const dy = targetRect.top + targetRect.height / 2 - sourceRect.top - sourceRect.height / 2
  const horizontal = Math.abs(dx) >= Math.abs(dy)
  const sourceSide: ConnectionSide = horizontal ? dx >= 0 ? 'right' : 'left' : dy >= 0 ? 'bottom' : 'top'
  const targetSide: ConnectionSide = horizontal ? dx >= 0 ? 'left' : 'right' : dy >= 0 ? 'top' : 'bottom'
  const point = (rect: ConnectionRect, side: ConnectionSide) => {
    switch (side) {
      case 'left': return { anchorX: rect.left, anchorY: rect.top + rect.height / 2, x: rect.left - 5, y: rect.top + rect.height / 2 }
      case 'right': return { anchorX: rect.right, anchorY: rect.top + rect.height / 2, x: rect.right + 5, y: rect.top + rect.height / 2 }
      case 'top': return { anchorX: rect.left + rect.width / 2, anchorY: rect.top, x: rect.left + rect.width / 2, y: rect.top - 5 }
      case 'bottom': return { anchorX: rect.left + rect.width / 2, anchorY: rect.bottom, x: rect.left + rect.width / 2, y: rect.bottom + 5 }
    }
  }
  const source = point(sourceRect, sourceSide)
  const target = point(targetRect, targetSide)
  return {
    x1: source.x - containerRect.left,
    y1: source.y - containerRect.top,
    x2: target.x - containerRect.left,
    y2: target.y - containerRect.top,
    anchorX1: source.anchorX - containerRect.left,
    anchorY1: source.anchorY - containerRect.top,
    anchorX2: target.anchorX - containerRect.left,
    anchorY2: target.anchorY - containerRect.top,
    sourceSide,
    targetSide,
  }
}

/** Campaign placement and connection geometry, also used by the online game. */
export function useGameWidgetLayout(options: GameWidgetLayoutOptions) {
  const latest = useRef(options)
  latest.current = options
  const emptyRef = useRef<HTMLDivElement | null>(null)
  const widgetLayoutRef = useRef<Record<string, number> | null>(null)
  const widgetJitterRef = useRef<Record<string, number>>({})
  const boardScaleRef = useRef(options.boardScale)
  boardScaleRef.current = options.boardScale
  const fallback: GameWidgetLayoutItem = { ref: emptyRef, on: false, position: null, setPosition: ignorePosition }
  const { rootRef, boardAreaRef, musicEngineOn, introPhase, activeWidgetOrder, orientation = 'white' } = options
  const selectedSquare = options.selectedSquare as Square | null
  const boardOffsetKey = options.boardOffset ? `${options.boardOffset.x},${options.boardOffset.y}` : ''
  const knobs = options.widgets.knobs ?? fallback
  const knobsRef = knobs.ref
  const knobsOn = knobs.on
  const knobsPosition = knobs.position
  const setKnobsPosition = knobs.setPosition
  const pieceDebug = options.widgets.pieceDebug ?? fallback
  const pieceDebugRef = pieceDebug.ref
  const pieceDebugOn = pieceDebug.on
  const pieceDebugPosition = pieceDebug.position
  const globalPanel = options.widgets.globalPanel ?? fallback
  const globalPanelRef = globalPanel.ref
  const globalPanelOn = globalPanel.on
  const globalPanelPosition = globalPanel.position
  const setGlobalPanelPosition = globalPanel.setPosition
  const mixer = options.widgets.mixer ?? fallback
  const mixerRef = mixer.ref
  const mixerOn = mixer.on
  const mixerPosition = mixer.position
  const setMixerPosition = mixer.setPosition
  const spectrogram = options.widgets.spectrogram ?? fallback
  const hasSpectrogramWidget = Boolean(options.widgets.spectrogram)
  const spectrogramHandleRef = spectrogram.ref
  const spectrogramOn = spectrogram.on
  const spectrogramPosition = spectrogram.position
  const setSpectrogramPosition = spectrogram.setPosition
  const liveCode = options.widgets.liveCode ?? fallback
  const liveCodeRef = liveCode.ref
  const liveCodeOn = liveCode.on
  const liveCodePosition = liveCode.position
  const setLiveCodePosition = liveCode.setPosition
  const botControl = options.widgets.botControl ?? fallback
  const botControlRef = botControl.ref
  const botControlOn = botControl.on
  const botControlPosition = botControl.position

  useEffect(() => {
    const { rootRef, boardAreaRef } = latest.current
    const widgets = latest.current.widgets
    if (rootRef.current) rootRef.current.scrollTop = 0
    let frame = 0
    let lastLayoutSize: { width: number; height: number } | null = null
    const layout = () => {
      const { innerWidth, innerHeight } = window
      const scaledBoardWidth = Math.min(Math.max(0, innerHeight - 270), 512) * boardScaleRef.current
      const mobileLayout = innerWidth <= scaledBoardWidth + 16 || (innerWidth <= 528 && innerHeight > innerWidth)
      if (mobileLayout) {
        widgetLayoutRef.current = null
        return
      }
      const board = boardAreaRef.current?.getBoundingClientRect()
      const root = rootRef.current?.getBoundingClientRect()
      if (!board || !root) return
      const firstLayout = !widgetLayoutRef.current
      const previous = widgetLayoutRef.current ?? {}
      const next: Record<string, number> = {}
      const panelSpecs = [
        { id: 'mixer', ref: mixerRef, set: setMixerPosition, side: 'left', width: 180, height: 450 },
        { id: 'spectrogram', ref: spectrogramHandleRef, set: setSpectrogramPosition, side: 'left', width: 180, height: 100 },
        { id: 'liveCode', ref: liveCodeRef, set: setLiveCodePosition, side: 'left', width: 300, height: 360 },
        { id: 'globalPanel', ref: globalPanelRef, set: setGlobalPanelPosition, side: 'left', width: 340, height: 420 },
        { id: 'knobs', ref: knobsRef, set: setKnobsPosition, side: 'right', width: 340, height: 520 },
      ].filter(panel => widgets[panel.id as keyof typeof widgets])
      const leftPanels = panelSpecs.filter(panel => panel.side === 'left' && panel.ref.current)
      const leftStackHeight = leftPanels.reduce((height, panel) => height + (panel.ref.current?.offsetHeight || panel.height), 0)
        + Math.max(0, leftPanels.length - 1) * 20
      let nextLeftY = (root.height - leftStackHeight) / 2
      const leftYById = new Map<string, number>()
      for (const panel of leftPanels) {
        const height = panel.ref.current?.offsetHeight || panel.height
        leftYById.set(panel.id, nextLeftY)
        nextLeftY += height + 20
      }
      for (const panel of panelSpecs.filter(item => item.side === 'left' && !item.ref.current)) {
        leftYById.set(panel.id, nextLeftY)
        nextLeftY += panel.height + 20
      }
      const panels = panelSpecs.map(panel => ({
        ...panel,
        y: panel.side === 'left'
          ? leftYById.get(panel.id) ?? (root.height - panel.height) / 2
          : (root.height - (panel.ref.current?.offsetHeight || panel.height)) / 2,
      }))
      const jitter = (key: string) => widgetJitterRef.current[key] ??= Math.round(Math.random() * 40 - 20)
      for (const panel of panels) {
        const width = panel.ref.current?.offsetWidth || panel.width
        const left = board.left - root.left
        const right = board.right - root.left
        const centered = panel.side === 'left'
          ? (left - width) / 2 + jitter(`${panel.id}:x`)
          : (right + root.width - width) / 2 + jitter(`${panel.id}:x`)
        const minimum = panel.side === 'left' ? left - width - 250 : right + 20
        const maximum = panel.side === 'left' ? left - width - 20 : right + 250
        const anchor = Math.max(minimum, Math.min(centered, maximum))
        const targetY = panel.y + jitter(`${panel.id}:y`)
        next[panel.id] = anchor
        next[`${panel.id}:y`] = targetY
        panel.set(current => {
          const desired = firstLayout || !current ? anchor : current.x + anchor - (previous[panel.id] ?? anchor)
          const x = Math.max(minimum, Math.min(desired, maximum))
          const y = firstLayout || !current ? targetY : current.y + targetY - (previous[`${panel.id}:y`] ?? targetY)
          return current?.x === x && current.y === y ? current : { x, y }
        })
      }
      widgetLayoutRef.current = next
    }
    const scheduleLayout = () => {
      // Only a viewport resize recalculates widget anchors; board resize leaves
      // floating panels where the user placed them, even when they overlap it.
      const layoutSize = { width: window.innerWidth, height: window.innerHeight }
      if (lastLayoutSize?.width === layoutSize.width && lastLayoutSize.height === layoutSize.height) return
      lastLayoutSize = layoutSize
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(layout)
    }
    scheduleLayout()
    window.addEventListener('resize', scheduleLayout)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', scheduleLayout)
    }
  }, [globalPanelRef, hasSpectrogramWidget, knobsRef, liveCodeRef, mixerRef, spectrogramHandleRef, setGlobalPanelPosition, setKnobsPosition, setLiveCodePosition, setMixerPosition, setSpectrogramPosition])

  const [pieceWidgetConnections, setPieceWidgetConnections] = useState<WidgetConnection[]>([])
  const [chainConnections, setChainConnections] = useState<WidgetConnection[]>([])

  // Force update for resize events
  const [resizeTick, forceUpdate] = useState(0)
  useEffect(() => {
      const observer = new window.ResizeObserver(() => {
          forceUpdate(n => n + 1)
      })
      
      if (globalPanelRef.current) observer.observe(globalPanelRef.current)
      if (mixerRef.current) observer.observe(mixerRef.current)
      if (spectrogramHandleRef.current) observer.observe(spectrogramHandleRef.current)
      if (liveCodeRef.current) observer.observe(liveCodeRef.current)
      if (knobsRef.current) observer.observe(knobsRef.current)
      if (pieceDebugRef.current) observer.observe(pieceDebugRef.current)
      if (botControlRef.current) observer.observe(botControlRef.current)
      if (boardAreaRef.current) observer.observe(boardAreaRef.current)
      
      return () => observer.disconnect()
  }, [globalPanelOn, hasSpectrogramWidget, mixerOn, spectrogramOn, liveCodeOn, knobsOn, pieceDebugOn, botControlOn, introPhase, globalPanelRef, mixerRef, spectrogramHandleRef, liveCodeRef, knobsRef, pieceDebugRef, botControlRef, boardAreaRef])


  useEffect(() => {
    if (!musicEngineOn || !rootRef.current || !boardAreaRef.current) {
      setPieceWidgetConnections([])
      setChainConnections([])
      return
    }

    const containerRect = rootRef.current.getBoundingClientRect()
    const boardRect = boardAreaRef.current.getBoundingClientRect()

    // --- CHAIN CONNECTIONS (MST) ---
    const widgets = {
        'globalPanel': { ref: globalPanelRef, on: globalPanelOn },
        'mixer': { ref: mixerRef, on: mixerOn },
        'spectrogram': { ref: spectrogramHandleRef, on: spectrogramOn },
        'liveCode': { ref: liveCodeRef, on: liveCodeOn },
        'botControl': { ref: botControlRef, on: botControlOn }
    }

    const activeWidgetIds = Object.keys(widgets).filter(id => widgets[id as keyof typeof widgets]?.on)
    
    // Nodes: 'board' is always index 0. Other widgets follow.
    const nodes = [{ id: 'board', rect: boardRect }]
    activeWidgetIds.forEach(id => {
        const widget = widgets[id as keyof typeof widgets]
        if (widget && widget.ref.current) {
            nodes.push({ id, rect: widget.ref.current.getBoundingClientRect() })
        }
    })

    const newConnections: {
        x1: number, y1: number, x2: number, y2: number, 
        anchorX1: number, anchorY1: number, anchorX2: number, anchorY2: number,
        sourceSide?: 'left'|'right'|'top'|'bottom', 
        targetSide?: 'left'|'right'|'top'|'bottom'
    }[] = []

    const occupiedSides: Record<string, Set<string>> = {}
    const occupy = (id: string, side: string) => {
        if (!occupiedSides[id]) occupiedSides[id] = new Set()
        occupiedSides[id].add(side)
    }
    const isOccupied = (id: string, side: string) => occupiedSides[id]?.has(side)

    // Prim's Algorithm to build MST
    // We want to connect all active widgets to the tree rooted at 'board'
    const connectedIndices = new Set([0]) // Start with board
    const unconnectedIndices = new Set(nodes.map((_, i) => i).filter(i => i !== 0))

    while (unconnectedIndices.size > 0) {
        let bestDist = Infinity
        let bestU = -1 // From connected
        let bestV = -1 // From unconnected

        // Find closest pair (u, v)
        for (const uIdx of connectedIndices) {
            const uNode = nodes[uIdx]
            const uCenter = { 
                x: uNode.rect.left + uNode.rect.width/2, 
                y: uNode.rect.top + uNode.rect.height/2 
            }

            for (const vIdx of unconnectedIndices) {
                const vNode = nodes[vIdx]
                const vCenter = { 
                    x: vNode.rect.left + vNode.rect.width/2, 
                    y: vNode.rect.top + vNode.rect.height/2 
                }
                
                const dist = Math.hypot(uCenter.x - vCenter.x, uCenter.y - vCenter.y)
                if (dist < bestDist) {
                    bestDist = dist
                    bestU = uIdx
                    bestV = vIdx
                }
            }
        }

        if (bestU !== -1 && bestV !== -1) {
            // Create connection U -> V
            const uNode = nodes[bestU]
            const vNode = nodes[bestV]
            
            const uCenter = { x: uNode.rect.left + uNode.rect.width/2, y: uNode.rect.top + uNode.rect.height/2 }
            const vCenter = { x: vNode.rect.left + vNode.rect.width/2, y: vNode.rect.top + vNode.rect.height/2 }

            // Determine sides
             const getBestSide = (rect: ReturnType<HTMLElement['getBoundingClientRect']>, otherCenter: {x:number, y:number}, id: string): 'left'|'right'|'bottom'|'top' => {
                const dx = rect.left + rect.width/2 - otherCenter.x
                const dy = rect.top + rect.height/2 - otherCenter.y
                
                // Allow top, bottom, left, right
                const sides: ('left'|'right'|'bottom'|'top')[] = []
                
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal preference
                    sides.push(dx > 0 ? 'left' : 'right') // Face the other object
                    sides.push(dy > 0 ? 'top' : 'bottom')
                    sides.push(dy > 0 ? 'bottom' : 'top')
                    sides.push(dx > 0 ? 'right' : 'left') // Back side
                } else {
                    // Vertical preference
                    sides.push(dy > 0 ? 'top' : 'bottom')
                    sides.push(dx > 0 ? 'left' : 'right')
                    sides.push(dx > 0 ? 'right' : 'left')
                    sides.push(dy > 0 ? 'bottom' : 'top')
                }

                for (const side of sides) {
                    if (!isOccupied(id, side)) return side
                }
                return sides[0] // Fallback
            }

            // Source (U)
            let sourceSide: 'left'|'right'|'bottom'|'top'
            if (uNode.id === 'board') {
                 // Board logic (simple)
                 const dx = uCenter.x - vCenter.x
                 const dy = uCenter.y - vCenter.y
                 if (Math.abs(dx) > Math.abs(dy)) {
                     sourceSide = dx > 0 ? 'left' : 'right'
                 } else {
                     sourceSide = dy > 0 ? 'top' : 'bottom'
                 }
            } else {
                sourceSide = getBestSide(uNode.rect, vCenter, uNode.id)
                occupy(uNode.id, sourceSide)
            }

            // Target (V)
            let targetSide: 'left'|'right'|'bottom'|'top'
            if (vNode.id === 'board') {
                 // Board logic (simple)
                 const dx = vCenter.x - uCenter.x
                 const dy = vCenter.y - uCenter.y
                 if (Math.abs(dx) > Math.abs(dy)) {
                     targetSide = dx > 0 ? 'left' : 'right'
                 } else {
                     targetSide = dy > 0 ? 'top' : 'bottom'
                 }
            } else {
                targetSide = getBestSide(vNode.rect, uCenter, vNode.id)
                occupy(vNode.id, targetSide)
            }

            // Calculate Coordinates with 5px offset for line, original for anchor
            const getPoint = (rect: ReturnType<HTMLElement['getBoundingClientRect']>, side: string) => {
                const offset = 5
                let anchor = { x: rect.left, y: rect.top }
                let line = { x: rect.left, y: rect.top }
                
                switch(side) {
                    case 'left': 
                        anchor = { x: rect.left, y: rect.top + rect.height/2 }
                        line = { x: rect.left - offset, y: rect.top + rect.height/2 }
                        break
                    case 'right': 
                        anchor = { x: rect.right, y: rect.top + rect.height/2 }
                        line = { x: rect.right + offset, y: rect.top + rect.height/2 }
                        break
                    case 'top': 
                        anchor = { x: rect.left + rect.width/2, y: rect.top }
                        line = { x: rect.left + rect.width/2, y: rect.top - offset }
                        break
                    case 'bottom': 
                        anchor = { x: rect.left + rect.width/2, y: rect.bottom }
                        line = { x: rect.left + rect.width/2, y: rect.bottom + offset }
                        break
                    default: 
                        anchor = { x: rect.left, y: rect.top }
                        line = { x: rect.left, y: rect.top }
                }
                return { anchor, line }
            }

            const p1 = getPoint(uNode.rect, sourceSide)
            const p2 = getPoint(vNode.rect, targetSide)

            newConnections.push({
                x1: p1.line.x - containerRect.left,
                y1: p1.line.y - containerRect.top,
                x2: p2.line.x - containerRect.left,
                y2: p2.line.y - containerRect.top,
                anchorX1: p1.anchor.x - containerRect.left,
                anchorY1: p1.anchor.y - containerRect.top,
                anchorX2: p2.anchor.x - containerRect.left,
                anchorY2: p2.anchor.y - containerRect.top,
                sourceSide,
                targetSide
            })

            // Update MST sets
            connectedIndices.add(bestV)
            unconnectedIndices.delete(bestV)
        } else {
            // Should not happen if graph is connected, but break to avoid infinite loop
            break
        }
    }

    setChainConnections(newConnections)

    // Piece Params connects to the selected square. Piece Debug chooses one nearby target.
    const directConnections: WidgetConnection[] = []
    const selectedSquareRect = selectedSquare ? squareRect(selectedSquare, boardRect, orientation) : null
    const connectWidgetToRect = (widgetRef: RefObject<HTMLDivElement | null>, targetRect: ConnectionRect) => {
      const widget = widgetRef.current
      if (widget) directConnections.push(connectRects(widget.getBoundingClientRect(), targetRect, containerRect))
    }

    if (knobsOn && selectedSquareRect) connectWidgetToRect(knobsRef, selectedSquareRect)
    if (pieceDebugOn) {
      const debugRect = pieceDebugRef.current?.getBoundingClientRect()
      const paramsRect = knobsOn ? knobsRef.current?.getBoundingClientRect() : undefined
      const candidates = [selectedSquareRect, paramsRect].filter((rect): rect is ConnectionRect => !!rect)
      if (debugRect && candidates.length > 0) {
        const distanceBetweenRects = (first: ConnectionRect, second: ConnectionRect) => {
          const dx = Math.max(first.left - second.right, second.left - first.right, 0)
          const dy = Math.max(first.top - second.bottom, second.top - first.bottom, 0)
          return Math.hypot(dx, dy)
        }
        const nearestTarget = candidates.reduce((nearest, candidate) =>
          distanceBetweenRects(debugRect, candidate) < distanceBetweenRects(debugRect, nearest) ? candidate : nearest,
        )
        connectWidgetToRect(pieceDebugRef, nearestTarget)
      }
    }
    setPieceWidgetConnections(directConnections)

  }, [musicEngineOn, selectedSquare, orientation, knobsPosition, pieceDebugPosition, botControlPosition, globalPanelPosition, mixerPosition, spectrogramPosition, liveCodePosition, knobsOn, pieceDebugOn, botControlOn, globalPanelOn, hasSpectrogramWidget, mixerOn, spectrogramOn, liveCodeOn, activeWidgetOrder, resizeTick, boardOffsetKey, rootRef, boardAreaRef, globalPanelRef, mixerRef, spectrogramHandleRef, liveCodeRef, knobsRef, pieceDebugRef, botControlRef])

  // Hovering a row of the Song & Instruments list links its on/off dot to the piece.
  const [hoverConnections, setHoverConnections] = useState<WidgetConnection[]>([])
  const hoveredPiece = options.hoveredPiece ?? null
  useEffect(() => {
    const root = rootRef.current, board = boardAreaRef.current
    const target = hoveredPiece && board ? squareRect(hoveredPiece.square, board.getBoundingClientRect(), orientation) : null
    if (!musicEngineOn || !root || !hoveredPiece?.anchor.isConnected || !target) { setHoverConnections([]); return }
    setHoverConnections([connectRects(hoveredPiece.anchor.getBoundingClientRect(), target, root.getBoundingClientRect())])
  }, [hoveredPiece, musicEngineOn, orientation, rootRef, boardAreaRef, resizeTick, boardOffsetKey, knobsPosition])

  return { pieceConnections: pieceWidgetConnections, chainConnections, hoverConnections, resizeTick }
}
