"use client"

import { useRef, useState, useEffect, useMemo, Suspense, type ComponentRef, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Html, Sphere, Stars, TrackballControls } from '@react-three/drei'
import { TextureLoader, FileLoader, Color, Mesh, Group, Vector3, MathUtils, DoubleSide, Quaternion, AdditiveBlending, SRGBColorSpace, Float32BufferAttribute, type BufferAttribute } from 'three'
import { CityData, getCityEras } from '@/lib/cities-data'
import { CityPopup } from './city-popup'
import { cityDirection, cityFlightPose, popupStandbyCompensation } from '@/lib/globe-navigation'
import { cityFlagColor, createCityFlagTexture } from '@/lib/globe-flags'
import { isConstrainedDevice } from '@/lib/performance'
import { clampPopupToGlobe, coastlineSegments, globeGridSegments, nearestGlobeSilhouettePoint, pinIsBehindGlobe } from '@/lib/globe-geography'

function GlobeGeography() {
  const svg = useLoader(FileLoader, '/world_map_contours.svg') as string
  const coast = useMemo(() => coastlineSegments(svg), [svg])
  const grid = useMemo(() => globeGridSegments(), [])
  const uniforms = useMemo(() => ({ color: { value: new Color('#39ff14') }, sun: { value: new Vector3(-6.2, 3.3, -10) } }), [])
  return <>
    <lineSegments raycast={() => {}}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[grid, 3]} /></bufferGeometry>
      <lineBasicMaterial color="#587466" transparent opacity={.18} depthWrite={false} />
    </lineSegments>
    <lineSegments raycast={() => {}}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[coast, 3]} /></bufferGeometry>
      <shaderMaterial transparent depthWrite={false} uniforms={uniforms}
        vertexShader="varying vec3 worldPoint; void main() { vec4 p = modelMatrix * vec4(position, 1.0); worldPoint = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }"
        fragmentShader="uniform vec3 color; uniform vec3 sun; varying vec3 worldPoint; void main() { float light = max(0.0, dot(normalize(worldPoint), normalize(sun - worldPoint))); gl_FragColor = vec4(color, .7 * (.4 + .6 * light)); }" />
    </lineSegments>
  </>
}

interface GlobeProps {
  cities: CityData[]
  conqueredCities?: string[]
  unlockedCities?: string[]
  openPopups: Record<string, any>
  onCityClick: (city: CityData, position?: { x: number; y: number }) => void
  onPopupClose: (cityId: string) => void
  bringToFront: (id: string) => void
  updatePopupPosition: (id: string, x: number, y: number) => void
  playMapSound: (type: string, forceResume?: boolean) => void
  startWhistleLoop: () => void
  stopWhistleLoop: () => void
  setPressedPopupState: (state: { id: string } | null) => void
  onCitySelect: (city: CityData) => void
  handleSmartPadSound: (e: React.MouseEvent<HTMLButtonElement>) => void
  handleSmartPadLeave: (e: React.MouseEvent<HTMLButtonElement>) => void
  stopPadSound: () => void
  pressedPopupState: { id: string } | null
  enteringCityId: string | null
  setEnteringCityId: (id: string | null) => void
  zoomRef?: React.MutableRefObject<{ zoomIn: () => void, zoomOut: () => void, resetZoom: () => void, zoomToPercent: (percent: number) => void, centerCity: (city: CityData) => void } | null>
  onZoomChange?: (zoom: number) => void
  focusedCityId?: string | null
  setFocusedCityId?: (cityId: string | null) => void
  onPinHover?: (cityId: string | null) => void
  popupLayerRef?: RefObject<HTMLDivElement | null>
}

const GLOBE_RADIUS = 2
const SUN_POSITION: [number, number, number] = [-6.2, 3.3, -10]

type PopupLineState = { startX: number; startY: number; cpX: number; cpY: number; endX: number; endY: number; handlePath: string }

function popupLineState(position: { x: number; y: number }, jitter: number, dragging: boolean, dragAnchor: { x: number; y: number }, start = { x: 0, y: 0 }): PopupLineState {
  const startX = start.x, startY = start.y, width = 288, height = 450
  const left = { x: position.x, y: position.y + height / 2 }
  const right = { x: position.x + width, y: position.y + height / 2 }
  const top = { x: position.x + width / 2, y: position.y }
  const distance = (point: { x: number; y: number }) => (point.x - startX) ** 2 + (point.y - startY) ** 2
  const minimum = Math.min(distance(left), distance(right), distance(top))
  const side: 'left' | 'right' | 'top' = minimum === distance(top) ? 'top' : minimum === distance(left) ? 'left' : 'right'
  let endX = side === 'left' ? left.x : side === 'right' ? right.x : top.x
  let endY = side === 'top' ? top.y : (side === 'left' ? left.y : right.y) - 40
  let cpX = side === 'top' ? jitter : (startX + endX) / 2
  let cpY = side === 'top' ? (startY + endY) / 2 : (startY + endY) / 2 + (endY < 0 ? 50 : -50)
  if (dragging) {
    endX = position.x + dragAnchor.x
    endY = position.y + dragAnchor.y
    cpX = (startX + endX) / 2
    const arc = Math.min(Math.hypot(endX - startX, endY - startY) * .266, 66)
    cpY = (startY + endY) / 2 + (endY < 0 ? arc : -arc)
  }
  const r = 4
  const handlePath = dragging ? '' : side === 'left'
    ? `M ${endX} ${endY - r} A ${r} ${r} 0 0 0 ${endX} ${endY + r}`
    : side === 'right'
      ? `M ${endX} ${endY - r} A ${r} ${r} 0 0 1 ${endX} ${endY + r}`
      : `M ${endX - r} ${endY} A ${r} ${r} 0 0 1 ${endX + r} ${endY}`
  return { startX, startY, cpX, cpY, endX, endY, handlePath }
}

// Separate component to handle Popup state locally and avoid full re-renders during drag
const PulsingRing = ({ city, isOpen, isHoveredProp }: { city: CityData, isOpen: boolean, isHoveredProp: boolean }) => {
    const meshRef = useRef<Mesh>(null)
    
    useFrame((state) => {
        if (meshRef.current) {
            // Pulse animation
            if (isOpen || isHoveredProp) {
                const t = state.clock.getElapsedTime()
                const scale = 1.0 + Math.abs(Math.sin(t * 3)) * 0.5 // Pulse from 1.0 to 1.5
                meshRef.current.scale.set(scale, scale, scale)
                const opacity = 1.0 - Math.abs(Math.sin(t * 3)) * 0.8 // Pulse opacity
                if (Array.isArray(meshRef.current.material)) {
                    // handle array
                } else {
                    (meshRef.current.material as any).opacity = opacity
                }
            } else {
                meshRef.current.scale.set(1, 1, 1)
                if (!Array.isArray(meshRef.current.material)) {
                     (meshRef.current.material as any).opacity = 0
                }
            }
            
            // Look at camera
            meshRef.current.lookAt(state.camera.position)
        }
    })

    return (
        <mesh 
            ref={meshRef}
        >
            <ringGeometry args={[0.05, 0.06, 32]} />
            <meshBasicMaterial color={city.color} transparent opacity={0} side={2} />
        </mesh>
    )
}

const ConqueredFlag = ({ city, idleRotationRef }: { city: CityData; idleRotationRef: RefObject<boolean> }) => {
  const flagRef = useRef<Group>(null)
  const clothRef = useRef<Group>(null)
  const clothMeshRef = useRef<Mesh>(null)
  const originalX = useRef<Float32Array | null>(null)
  const cycle = useRef({ elapsed: 0, duration: 4.2 + Math.random() * 1.2, ease: 1.5 + Math.random() * .6 })
  const motionScale = useRef({ pole: 1, cloth: 1 })
  const reduceMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const texture = useMemo(() => typeof document === 'undefined' ? null : createCityFlagTexture(city), [city])
  useEffect(() => () => texture?.dispose(), [texture])
  const normal = cityDirection(city.geoCoordinates.lat, city.geoCoordinates.lng, 1).normalize()
  const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal)
  useFrame((_, delta) => {
    if (!flagRef.current || !clothRef.current || reduceMotion) return
    const motion = cycle.current
    motion.elapsed += delta
    if (motion.elapsed >= motion.duration) {
      motion.elapsed %= motion.duration
      motion.duration = 4.2 + Math.random() * 1.2
      motion.ease = 1.5 + Math.random() * .6
    }
    const progress = motion.elapsed / motion.duration
    const leading = progress ** motion.ease
    const trailing = (1 - progress) ** motion.ease
    const phase = 2 * Math.PI * leading / (leading + trailing)
    const blend = 1 - Math.exp(-delta * 4)
    motionScale.current.pole = MathUtils.lerp(motionScale.current.pole, idleRotationRef.current ? 1.5 : 1, blend)
    motionScale.current.cloth = MathUtils.lerp(motionScale.current.cloth, idleRotationRef.current ? .56 : 1, blend)
    // The whole flag pivots at the pin; the upper end traces a small figure eight.
    flagRef.current.rotation.set(Math.sin(phase) * .17 * motionScale.current.pole, 0, Math.sin(phase * 2) * .12 * motionScale.current.pole)
    clothRef.current.rotation.y = Math.sin(phase * 2 + .5) * .11 * motionScale.current.cloth
    const geometry = clothMeshRef.current?.geometry
    if (geometry) {
      const positions = geometry.getAttribute('position') as BufferAttribute
      if (!originalX.current) originalX.current = Float32Array.from({ length: positions.count }, (_, i) => positions.getX(i))
      let shades = geometry.getAttribute('color') as BufferAttribute | undefined
      if (!shades) {
        shades = new Float32BufferAttribute(new Float32Array(positions.count * 3).fill(1), 3)
        geometry.setAttribute('color', shades)
      }
      for (let i = 0; i < positions.count; i++) {
        const distanceFromPole = (originalX.current[i] + .06) / .12
        const ripple = phase * 2 + distanceFromPole * Math.PI * 2.4
        positions.setX(i, originalX.current[i] - distanceFromPole * .012 * motionScale.current.cloth * (1 - Math.cos(ripple)))
        positions.setZ(i, distanceFromPole ** 1.1 * .032 * motionScale.current.cloth * Math.sin(ripple))
        const light = .76 + .24 * (.5 + .5 * Math.cos(ripple + .7))
        shades.setXYZ(i, light, light, light)
      }
      positions.needsUpdate = true
      shades.needsUpdate = true
    }
  })
  return <group quaternion={orientation}>
    <group ref={flagRef}>
      <mesh position={[0, .135, 0]}>
        <cylinderGeometry args={[.008, .008, .27, 6]} />
        <meshBasicMaterial color="#b9ffd1" />
      </mesh>
      <group ref={clothRef} position={[0, .27, .004]}>
        <mesh ref={clothMeshRef} position={[.06, -.05, 0]}>
          <planeGeometry args={[.12, .07, 8, 3]} />
          <meshBasicMaterial color={texture ? '#ffffff' : cityFlagColor(city.color)} map={texture ?? undefined} side={DoubleSide} vertexColors toneMapped={false} />
        </mesh>
      </group>
    </group>
  </group>
}

const PopupContainer = ({
    city,
    popup, // Initial/Global state
    popupLayerRef,
    isConquered,
    isUnlocked,
    pressedPopupState,
    bringToFront,
    onPopupClose,
    updatePopupPosition, // Global update
    playMapSound,
    startWhistleLoop,
    stopWhistleLoop,
    setPressedPopupState,
    handleSmartPadSound,
    handleSmartPadLeave,
    stopPadSound,
    isEntering,
    setEnteringCityId,
    setIsDraggingPopup,
    standbyRef,
    onEraSelect,
}: any) => {
    // Local state for smooth dragging
    const [localPos, setLocalPos] = useState({ x: popup.x, y: popup.y })
    const { gl } = useThree()
    const localPosRef = useRef({ x: popup.x, y: popup.y })
    const positionFrame = useRef<number | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const anchorRef = useRef<Group>(null)
    const lineRef = useRef<SVGSVGElement>(null)
    const cablePathRef = useRef<ComponentRef<'path'>>(null)
    const lineStartRef = useRef<ComponentRef<'circle'>>(null)
    const handlePathRef = useRef<ComponentRef<'path'>>(null)
    const worldPin = useMemo(() => new Vector3(), [])
    const projectedPin = useMemo(() => new Vector3(), [])
    const cameraPosition = useMemo(() => new Vector3(), [])
    const cameraUp = useMemo(() => new Vector3(), [])
    const projectedCenter = useMemo(() => new Vector3(), [])
    const projectedEdge = useMemo(() => new Vector3(), [])
    const previousProjectedPin = useRef<{ x: number; y: number } | null>(null)
    const globeCircle = useRef({ x: 0, y: 0, radius: 0 })
    const lineStartOffset = useRef({ x: 0, y: 0 })
    const slowOffset = useRef({ x: 0, y: 0 })
    const topCurveJitter = useRef((Math.random() - 0.5) * 20)

    // Track drag start position for anchor
    const dragAnchor = useRef({ x: 31, y: 8 }) // Default to handle center

    const lastLineState = useRef<PopupLineState>({ startX: 0, startY: 0, cpX: 0, cpY: 0, endX: 0, endY: 0, handlePath: '' })
    const [isDraggingLocal, setIsDraggingLocal] = useState(false)
    const draggingRef = useRef(false)

    useFrame(({ camera, size }) => {
      if (!anchorRef.current || !lineRef.current) return
      anchorRef.current.getWorldPosition(worldPin)
      const behind = pinIsBehindGlobe(worldPin, camera.position)
      const opacity = behind ? '0.5' : '1'
      if (lineRef.current.style.opacity !== opacity) {
        lineRef.current.style.opacity = opacity
        lineRef.current.dataset.pinHidden = String(behind)
      }

      projectedPin.copy(worldPin).project(camera)
      const screen = { x: (projectedPin.x + 1) * size.width / 2, y: (1 - projectedPin.y) * size.height / 2 }
      cameraPosition.setFromMatrixPosition(camera.matrixWorld)
      const cameraDistance = Math.max(cameraPosition.length(), GLOBE_RADIUS + 1e-4)
      cameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize()
      projectedCenter.set(0, 0, 0).project(camera)
      projectedEdge.copy(cameraPosition).normalize()
        .multiplyScalar(GLOBE_RADIUS * GLOBE_RADIUS / cameraDistance)
        .addScaledVector(cameraUp, GLOBE_RADIUS * Math.sqrt(Math.max(0, 1 - GLOBE_RADIUS * GLOBE_RADIUS / (cameraDistance * cameraDistance))))
        .project(camera)
      const centerX = (projectedCenter.x + 1) * size.width / 2
      const centerY = (1 - projectedCenter.y) * size.height / 2
      const edgeX = (projectedEdge.x + 1) * size.width / 2
      const edgeY = (1 - projectedEdge.y) * size.height / 2
      globeCircle.current = { x: centerX, y: centerY, radius: Math.hypot(edgeX - centerX, edgeY - centerY) }
      lineStartOffset.current = { x: 0, y: 0 }
      if (behind) {
        const silhouette = nearestGlobeSilhouettePoint(new Vector3(), worldPin, camera, GLOBE_RADIUS, size)
        if (silhouette) {
          const projectedSilhouette = silhouette.project(camera)
          lineStartOffset.current = {
            x: (projectedSilhouette.x - projectedPin.x) * size.width / 2,
            y: -(projectedSilhouette.y - projectedPin.y) * size.height / 2,
          }
        }
      }
      const previous = previousProjectedPin.current
      if (standbyRef.current && previous && !popup.isClosing) {
        slowOffset.current.x += popupStandbyCompensation(screen.x - previous.x)
        slowOffset.current.y += popupStandbyCompensation(screen.y - previous.y)
      }
      if (!popup.isClosing && !draggingRef.current && wrapperRef.current) {
        const panel = wrapperRef.current.querySelector<HTMLElement>('[data-popup-surface]')
        if (panel) {
          const rect = panel.getBoundingClientRect()
          const current = {
            x: screen.x + localPosRef.current.x + slowOffset.current.x,
            y: screen.y + localPosRef.current.y + slowOffset.current.y,
          }
          const constrained = clampPopupToGlobe(current, { width: rect.width, height: rect.height }, globeCircle.current)
          slowOffset.current.x += constrained.x - current.x
          slowOffset.current.y += constrained.y - current.y
        }
      }
      if (wrapperRef.current) wrapperRef.current.style.transform = `translate3d(${slowOffset.current.x}px, ${slowOffset.current.y}px, 0)`
      if (!popup.isClosing) {
        const visualPosition = { x: localPosRef.current.x + slowOffset.current.x, y: localPosRef.current.y + slowOffset.current.y }
        const nextLine = popupLineState(visualPosition, topCurveJitter.current, draggingRef.current, dragAnchor.current, lineStartOffset.current)
        lastLineState.current = nextLine
        cablePathRef.current?.setAttribute('d', `M ${nextLine.startX} ${nextLine.startY} Q ${nextLine.cpX} ${nextLine.cpY} ${nextLine.endX} ${nextLine.endY}`)
        lineStartRef.current?.setAttribute('cx', String(nextLine.startX))
        lineStartRef.current?.setAttribute('cy', String(nextLine.startY))
        handlePathRef.current?.setAttribute('d', nextLine.handlePath)
      }
      previousProjectedPin.current = screen
    })

    // Sync local state when global state changes (e.g. from other interactions or init)
    useEffect(() => {
        // Only sync if significant difference (to avoid jitter loop) or if not dragging?
        // Actually we need to sync if the popup is moved by other means or initialized
        setLocalPos({ x: popup.x, y: popup.y })
        localPosRef.current = { x: popup.x, y: popup.y }
    }, [popup.x, popup.y])

    useEffect(() => () => {
        if (positionFrame.current !== null) cancelAnimationFrame(positionFrame.current)
    }, [])

    const currentLine = popup.isClosing
      ? lastLineState.current
      : popupLineState({ x: localPos.x + slowOffset.current.x, y: localPos.y + slowOffset.current.y }, topCurveJitter.current, isDraggingLocal, dragAnchor.current, lineStartOffset.current)
    if (!popup.isClosing) lastLineState.current = currentLine
    const { cpX, cpY, endX, endY, handlePath } = currentLine

    const lineElement = (
        <svg ref={lineRef} aria-label="Conexão com o pin da cidade" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', width: 1, height: 1, transition: 'opacity .2s' }}>
            <path ref={cablePathRef}
              d={`M ${currentLine.startX} ${currentLine.startY} Q ${cpX} ${cpY} ${endX} ${endY}`}
              stroke={city.color} 
              strokeWidth="2" 
              strokeDasharray="4 4"
              fill="none"
              className={popup.isClosing ? "animate-line-exit" : (isDraggingLocal ? "" : "animate-line-slow")}
            />
            <circle ref={lineStartRef} cx={currentLine.startX} cy={currentLine.startY} r="3" fill={city.color} />
            <path ref={handlePathRef} d={handlePath} fill={city.color} />
        </svg>
    )

    return (
        <group ref={anchorRef}>
            <Html zIndexRange={[0, 0]} style={{ pointerEvents: 'none', zIndex: 0 }}>
                {lineElement}
            </Html>
            <Html portal={popupLayerRef} zIndexRange={[1000 + popup.zIndex, 1000 + popup.zIndex]} style={{ pointerEvents: 'none', zIndex: popup.zIndex }}>
                <div ref={wrapperRef} style={{ pointerEvents: 'auto', position: 'relative' }}
                    onPointerDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
                    onWheel={event => {
                      event.preventDefault()
                      gl.domElement.dispatchEvent(new window.WheelEvent('wheel', {
                        deltaX: event.deltaX,
                        deltaY: event.deltaY,
                        deltaZ: event.deltaZ,
                        deltaMode: event.deltaMode,
                        bubbles: true,
                        cancelable: true,
                      }))
                    }}>
                    <CityPopup
                        onEraSelect={(era: CityData) => onEraSelect(era, {
                          x: localPosRef.current.x + slowOffset.current.x,
                          y: localPosRef.current.y + slowOffset.current.y + 10,
                        })}
                        city={city}
                        popup={{ ...popup, x: localPos.x, y: localPos.y }} // Use local state
                        isConquered={isConquered}
                        isUnlocked={isUnlocked}
                        isPressed={pressedPopupState?.id === city.id}
                        bringToFront={bringToFront}
                        closePopup={onPopupClose}
                        updatePopupPosition={(id, x, y) => {
                            let next = { x, y }
                            const wrapper = wrapperRef.current
                            const panel = wrapper?.querySelector<HTMLElement>('[data-popup-surface]')
                            if (wrapper && panel && globeCircle.current.radius > 0) {
                                const anchor = wrapper.getBoundingClientRect()
                                const rect = panel.getBoundingClientRect()
                                const constrained = clampPopupToGlobe(
                                  { x: anchor.left + x, y: anchor.top + y },
                                  { width: rect.width, height: rect.height },
                                  globeCircle.current,
                                )
                                next = { x: constrained.x - anchor.left, y: constrained.y - anchor.top }
                            }
                            localPosRef.current = next
                            // Pointer events may arrive faster than the display. One
                            // React update per frame keeps the card and cable together
                            // without compiling the whole popup tree several times.
                            if (positionFrame.current === null) {
                                positionFrame.current = requestAnimationFrame(() => {
                                    positionFrame.current = null
                                    setLocalPos(localPosRef.current)
                                })
                            }
                        }}
                        playMapSound={playMapSound}
                        startWhistleLoop={startWhistleLoop}
                        stopWhistleLoop={stopWhistleLoop}
                        setPressedPopupState={setPressedPopupState}
                        handleSmartPadSound={handleSmartPadSound}
                        handleSmartPadLeave={handleSmartPadLeave}
                        stopPadSound={stopPadSound}
                        isEntering={isEntering}
                        onEnter={() => setEnteringCityId(city.id)}
                        scale={1}
                        transformOrigin={isDraggingLocal ? `${dragAnchor.current.x}px ${dragAnchor.current.y}px` : undefined}
                        onDragStart={(e) => {
                            setIsDraggingPopup(true)
                            setIsDraggingLocal(true)
                            draggingRef.current = true
                            
                            if (e && wrapperRef.current) {
                                const rect = wrapperRef.current.getBoundingClientRect()
                                let clientX, clientY
                                if ('touches' in e) {
                                     clientX = e.touches[0].clientX
                                     clientY = e.touches[0].clientY
                                } else {
                                     clientX = (e as React.MouseEvent).clientX
                                     clientY = (e as React.MouseEvent).clientY
                                }
        
                                const mouseX = clientX - rect.left
                                const mouseY = clientY - rect.top
                                
                                // Calculate anchor relative to popup top-left
                                // localPos is the current position of the popup relative to wrapper
                                dragAnchor.current = {
                                    x: mouseX - localPos.x,
                                    y: mouseY - localPos.y
                                }
                            } else {
                                // Fallback to handle center if event is missing (should not happen)
                                dragAnchor.current = { x: 31, y: 8 }
                            }
                            
                        }}
                        onDragEnd={() => {
                            setIsDraggingPopup(false)
                            setIsDraggingLocal(false)
                            draggingRef.current = false
                            // Sync to global state on drag end
                            updatePopupPosition(city.id, localPosRef.current.x, localPosRef.current.y)
                        }}
                    />
                </div>
            </Html>
        </group>
    )
}

const GlobeContent = ({ 
  cities, 
  conqueredCities = [],
  unlockedCities: _unlockedCities = [],
  openPopups, 
  onCityClick, 
  onPopupClose,
  bringToFront,
  updatePopupPosition,
  playMapSound,
  startWhistleLoop,
  stopWhistleLoop,
  setPressedPopupState,
  onCitySelect,
  handleSmartPadSound,
  handleSmartPadLeave,
  stopPadSound,
  pressedPopupState,
  enteringCityId,
  setEnteringCityId,
  zoomRef,
  onZoomChange,
  focusedCityId,
  setFocusedCityId,
  onPinHover,
  popupLayerRef,
}: GlobeProps) => {
  const controlsRef = useRef<any>(null)
  const globeRef = useRef<Group>(null)
  const [isDraggingPopup, setIsDraggingPopup] = useState(false)
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null)
  const suppressedPinHoverId = useRef<string | null>(null)
  const isStandby = useRef(false)
  const idleFlagMotion = useRef(false)
  const isInteracting = useRef(false)
  const lastInteractionTime = useRef(Date.now())
  const [introZoomComplete, setIntroZoomComplete] = useState(false)
  const lastReportedZoom = useRef(100)
  
  // Standby Rotation State
  const standbyRotationAxis = useRef(new Vector3(0, 1, 0))
  const standbyRotationSpeed = useRef(0.05)
  const lastListHoverCityId = useRef<string | null>(null)
  const listHoverBoost = useRef<{ axis: Vector3; elapsed: number; duration: number; initialSpeed: number } | null>(null)
  const pinClickBoost = useRef<{ axis: Vector3; elapsed: number; duration: number; initialSpeed: number } | null>(null)
  const centeringCamera = useRef(false)
  const resumeStandbyAfterCenter = useRef(false)
  const centeringCityId = useRef<string | null>(null)

  // Only the sun halo uses a texture; geography is vector geometry.
  const sunGlow = useLoader(TextureLoader, '/sun-glow.svg')
  useEffect(() => { sunGlow.colorSpace = SRGBColorSpace }, [sunGlow])
  
  const { camera, gl } = useThree()
  const eventPin = useMemo(() => new Vector3(), [])
  const isHiddenPin = (object: { getWorldPosition: (target: Vector3) => Vector3 }) =>
    pinIsBehindGlobe(object.getWorldPosition(eventPin), camera.position)
  useEffect(() => {
    document.body.style.cursor = ''
    return () => { gl.domElement.style.cursor = ''; document.body.style.cursor = '' }
  }, [gl])
  useEffect(() => {
    const canvas = gl.domElement
    let angle: number | null = null
    const readAngle = (e: TouchEvent) => Math.atan2(e.touches[1].clientY - e.touches[0].clientY, e.touches[1].clientX - e.touches[0].clientX)
    const start = (e: TouchEvent) => {
      isInteracting.current = true
      angle = e.touches.length === 2 ? readAngle(e) : null
    }
    const move = (e: TouchEvent) => {
      if (enteringCityId || e.touches.length !== 2) { angle = null; return }
      const next = readAngle(e)
      if (angle !== null) {
        const delta = Math.atan2(Math.sin(next - angle), Math.cos(next - angle))
        camera.up.applyAxisAngle(camera.position.clone().normalize(), delta).normalize()
        camera.lookAt(0, 0, 0)
        lastInteractionTime.current = Date.now()
      }
      angle = next
    }
    const end = (e: TouchEvent) => {
      angle = e.touches.length === 2 ? readAngle(e) : null
      isInteracting.current = e.touches.length > 0
      lastInteractionTime.current = Date.now()
    }
    canvas.addEventListener('touchstart', start, { passive: true })
    canvas.addEventListener('touchmove', move, { passive: true })
    canvas.addEventListener('touchend', end)
    canvas.addEventListener('touchcancel', end)
    return () => {
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
      canvas.removeEventListener('touchcancel', end)
    }
  }, [gl, camera, enteringCityId])

  useEffect(() => {
    const onListCityHover = (event: Event) => {
      const cityId = (event as CustomEvent<{ cityId: string }>).detail?.cityId
      if (!cityId) return
      const city = cities.find(candidate => candidate.id === cityId)
      if (city) playMapSound('pin_hover', true)
    }
    window.addEventListener('map-city-hover', onListCityHover)
    return () => window.removeEventListener('map-city-hover', onListCityHover)
  }, [cities, playMapSound])

  const [targetCameraPos, setTargetCameraPos] = useState<Vector3 | null>(null)
  const entryFlight = useRef<{ city: CityData; from: Vector3; up: Vector3; pin: Vector3; elapsed: number; duration: number; done: boolean } | null>(null)
  useEffect(() => {
    const city = cities.find(candidate => candidate.id === enteringCityId)
    if (!city || !globeRef.current) { entryFlight.current = null; return }
    const pin = globeRef.current.localToWorld(cityDirection(city.geoCoordinates.lat, city.geoCoordinates.lng, GLOBE_RADIUS))
    entryFlight.current = { city, from: camera.position.clone(), up: camera.up.clone(), pin, elapsed: 0, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? .15 : 1.4, done: false }
    setTargetCameraPos(null)
    centeringCamera.current = false
    resumeStandbyAfterCenter.current = false
    isStandby.current = false
    idleFlagMotion.current = false
  }, [enteringCityId, cities, camera])

  // Initial Zoom Animation & Standby Logic
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime()
    const flight = entryFlight.current
    if (flight) {
      if (flight.done) return
      flight.elapsed += delta
      const progress = Math.min(1, flight.elapsed / flight.duration)
      const pose = cityFlightPose(flight.from, flight.up, flight.pin, progress)
      camera.position.copy(pose.position)
      camera.up.copy(pose.up)
      camera.lookAt(0, 0, 0)
      if (progress === 1) { flight.done = true; onCitySelect(flight.city) }
      return
    }
    
    let standbyDelta = delta
    // Camera Animation (Centering)
    if (targetCameraPos) {
        // Spherical Interpolation (Orbit) to target
        const currentPos = camera.position.clone()
        const targetPos = targetCameraPos.clone()
        
        // Distance check
        const dist = currentPos.length()
        const targetDist = targetPos.length()
        
        // Angle between vectors
        const angle = currentPos.angleTo(targetPos)
        
        const newDist = MathUtils.lerp(dist, targetDist, Math.min(5 * delta, 1))
        if (centeringCamera.current && angle > 1e-6) {
            // Camera orbit and globe rotation have opposite axes for the same
            // apparent pin motion. End the orbit at the idle angular speed.
            const axis = new Vector3().crossVectors(currentPos, targetPos)
            if (axis.lengthSq() < 1e-8) axis.crossVectors(currentPos, camera.up)
            if (axis.lengthSq() < 1e-8) axis.crossVectors(currentPos, Math.abs(currentPos.x / dist) < .9 ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1))
            axis.normalize()
            const angularSpeed = standbyRotationSpeed.current + 2.5 * angle
            const step = Math.min(angle, angularSpeed * delta)
            currentPos.normalize().applyAxisAngle(axis, step).multiplyScalar(newDist)
            if (step >= angle - 1e-6) {
                currentPos.copy(targetPos).normalize().multiplyScalar(newDist)
                centeringCamera.current = false
                resumeStandbyAfterCenter.current = true
                standbyRotationAxis.current.copy(axis).negate()
                lastListHoverCityId.current = centeringCityId.current
                isStandby.current = true
                lastInteractionTime.current = Date.now() - 1000
                standbyDelta = Math.max(0, delta - step / angularSpeed)
            }
        } else {
            currentPos.lerp(targetPos, Math.min(5 * delta, 1)).normalize().multiplyScalar(newDist)
        }
        camera.position.copy(currentPos)
        camera.lookAt(0, 0, 0)
        if (!centeringCamera.current && Math.abs(dist - targetDist) < 0.01 && camera.position.angleTo(targetPos) < 0.001) {
            camera.position.copy(targetPos)
            setTargetCameraPos(null)
        }
        
    }

    // Initial Zoom Out (Wait 3s, then zoom for 3.5s)
    if (time > 3.0 && time < 6.5) {
       // Lerp camera position or scale
       // We want "start occupying full screen" -> Zoom out
       // Start at z=2.5 (very close), End at z=5 (default)
       const progress = Math.min(Math.max((time - 3.0) / 3.5, 0), 1) 
       // Ease out cubic
       const ease = 1 - Math.pow(1 - progress, 3)
       
       const startZ = 2.5
       const endZ = 5 / 0.75 // Target 75% zoom (Distance ~6.66)
       
       camera.position.z = MathUtils.lerp(startZ, endZ, ease)
       
       if (progress >= 1 && !introZoomComplete) {
           setIntroZoomComplete(true)
           lastInteractionTime.current = Date.now() - 4000 // Start standby immediately
       }
    } else if (time >= 6.5 && !introZoomComplete) {
        // Ensure we finish
        camera.position.z = 5 / 0.75
        setIntroZoomComplete(true)
        lastInteractionTime.current = Date.now() - 4000 // Start standby immediately
    } else if (time <= 3.0) {
        // Hold start position
        camera.position.z = 2.5
    }

    // Standby Logic
    const now = Date.now()
    const timeSinceInteraction = now - lastInteractionTime.current

    // Report Zoom Level
    if (camera && onZoomChange) {
        const dist = camera.position.length()
        // Standard distance is 5.
        // Zoom % = (5 / dist) * 100
        const zoom = Math.round((5 / dist) * 100)
        
        if (Math.abs(zoom - lastReportedZoom.current) >= 1) {
            lastReportedZoom.current = zoom
            onZoomChange(zoom)
        }
    }
    
    // A city card does not stop the idle globe. A list hover steers its standby
    // rotation toward the selected pin without commanding camera movement.
    const hoveredListCity = focusedCityId && !hoveredPinId ? cities.find(city => city.id === focusedCityId) : null
    const canRotate = introZoomComplete && !isInteracting.current && !hoveredPinId && (!targetCameraPos || resumeStandbyAfterCenter.current) && (timeSinceInteraction > 800 || !!hoveredListCity || !!pinClickBoost.current)
    if (canRotate) {
        if (!isStandby.current) {
            isStandby.current = true
            if (!pinClickBoost.current) {
                standbyRotationAxis.current.set(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ).normalize()
                standbyRotationSpeed.current = (0.05 + Math.random() * 0.05) * 0.7 // Reduced by 30%
            }
        }

        if (hoveredListCity && !pinClickBoost.current && hoveredListCity.id !== lastListHoverCityId.current && globeRef.current) {
            // Choose the shortest arc once. Keeping this axis after the approach
            // lets the pin pass screen center at the normal standby speed.
            const pinDirection = globeRef.current.localToWorld(cityDirection(hoveredListCity.geoCoordinates.lat, hoveredListCity.geoCoordinates.lng, 1)).normalize()
            const screenCenterDirection = camera.position.clone().normalize()
            const axis = new Vector3().crossVectors(pinDirection, screenCenterDirection)
            if (axis.lengthSq() < 1e-8 && pinDirection.dot(screenCenterDirection) < 0) {
                // Antipodal pins have no unique shortest path; keep a stable
                // tangent axis for that singular case.
                axis.crossVectors(pinDirection, camera.up)
            }
            const angle = pinDirection.angleTo(screenCenterDirection)
            if (axis.lengthSq() > 1e-8) {
                axis.normalize()
                standbyRotationAxis.current.copy(axis)
                if (angle > .08) {
                    const distance = angle * .7
                    const duration = Math.min(MathUtils.clamp(.4 + angle * .9, .55, 2.5), distance / standbyRotationSpeed.current)
                    listHoverBoost.current = {
                        axis: axis.clone(), elapsed: 0, duration,
                        initialSpeed: 2 * distance / duration - standbyRotationSpeed.current,
                    }
                }
            }
            lastListHoverCityId.current = hoveredListCity.id
        } else if (!hoveredListCity && lastListHoverCityId.current) {
            lastListHoverCityId.current = null
            listHoverBoost.current = null
        }
        
        if (globeRef.current) {
            const boost = pinClickBoost.current ?? listHoverBoost.current
            if (boost) {
                const previousElapsed = boost.elapsed
                const nextElapsed = Math.min(previousElapsed + standbyDelta, boost.duration)
                const progress = (elapsed: number) => {
                    const u = elapsed / boost.duration
                    return standbyRotationSpeed.current * elapsed + (boost.initialSpeed - standbyRotationSpeed.current) * boost.duration * (u - u ** 3 + .5 * u ** 4)
                }
                globeRef.current.rotateOnWorldAxis(boost.axis, progress(nextElapsed) - progress(previousElapsed))
                boost.elapsed = nextElapsed
                if (nextElapsed >= boost.duration) {
                    if (pinClickBoost.current === boost) {
                        pinClickBoost.current = null
                        suppressedPinHoverId.current = null
                    } else listHoverBoost.current = null
                    const remaining = Math.max(0, standbyDelta - (nextElapsed - previousElapsed))
                    if (remaining) globeRef.current.rotateOnWorldAxis(boost.axis, standbyRotationSpeed.current * remaining)
                }
            } else {
                globeRef.current.rotateOnWorldAxis(standbyRotationAxis.current, standbyRotationSpeed.current * standbyDelta)
            }
        }
        idleFlagMotion.current = listHoverBoost.current === null && pinClickBoost.current === null
    } else {
        if (!pinClickBoost.current) isStandby.current = false
        idleFlagMotion.current = false
        listHoverBoost.current = null
        if (!centeringCamera.current && !introZoomComplete) pinClickBoost.current = null
        if (!centeringCamera.current) lastListHoverCityId.current = null
    }

  })

  const handleInteraction = () => {
      lastInteractionTime.current = Date.now()
      isStandby.current = false
      pinClickBoost.current = null
      suppressedPinHoverId.current = null
      centeringCamera.current = false
      resumeStandbyAfterCenter.current = false
  }

  const centerCity = (city: CityData) => {
      if (enteringCityId || !globeRef.current) return
      pinClickBoost.current = null
      suppressedPinHoverId.current = null
      const direction = globeRef.current.localToWorld(cityDirection(city.geoCoordinates.lat, city.geoCoordinates.lng, 1)).normalize()
      const angle = camera.position.angleTo(direction)
      if (angle < 1e-5) return
      if (!isStandby.current) standbyRotationSpeed.current = (0.05 + Math.random() * 0.05) * 0.7
      centeringCamera.current = true
      centeringCityId.current = city.id
      resumeStandbyAfterCenter.current = false
      setTargetCameraPos(direction.multiplyScalar(camera.position.length()))
      isStandby.current = false
  }

  const steerGlobeTowardCity = (city: CityData) => {
      if (!globeRef.current || enteringCityId) return
      const pinDirection = globeRef.current.localToWorld(cityDirection(city.geoCoordinates.lat, city.geoCoordinates.lng, 1)).normalize()
      const screenCenter = camera.position.clone().normalize()
      const angle = pinDirection.angleTo(screenCenter)
      const axis = new Vector3().crossVectors(pinDirection, screenCenter)
      if (axis.lengthSq() < 1e-8) axis.crossVectors(pinDirection, camera.up)
      if (axis.lengthSq() < 1e-8) axis.crossVectors(pinDirection, Math.abs(pinDirection.x) < .9 ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1))
      axis.normalize()
      standbyRotationAxis.current.copy(axis)
      listHoverBoost.current = null
      lastListHoverCityId.current = null
      centeringCamera.current = false
      resumeStandbyAfterCenter.current = true
      setTargetCameraPos(previous => previous ? camera.position.clone().normalize().multiplyScalar(previous.length()) : null)
      if (angle > .01) {
          const distance = angle * .3
          const duration = Math.min(MathUtils.clamp(.4 + angle * .9, .55, 2.5), distance / standbyRotationSpeed.current)
          pinClickBoost.current = {
              axis: axis.clone(), elapsed: 0, duration,
              initialSpeed: 2 * distance / duration - standbyRotationSpeed.current,
          }
      } else {
          pinClickBoost.current = null
      }
      isStandby.current = true
      lastInteractionTime.current = Date.now() - 1000
  }

  // Handle Zoom Ref
  useEffect(() => {
    if (zoomRef) {
        zoomRef.current = {
            zoomIn: () => {
                if (camera) {
                    const basePos = targetCameraPos ? targetCameraPos.clone() : camera.position.clone()
                    const currentDist = basePos.length()
                    // Zoom In = reduce distance (min 3.33 for 150%)
                    const newDist = Math.max(3.33, currentDist * 0.8)
                    
                    // Maintain direction, update distance
                    const newPos = basePos.normalize().multiplyScalar(newDist)
                    
                    setTargetCameraPos(newPos)
                    handleInteraction()
                }
            },
            zoomOut: () => {
                if (camera) {
                    const basePos = targetCameraPos ? targetCameraPos.clone() : camera.position.clone()
                    const currentDist = basePos.length()
                    // Zoom Out = increase distance (max 10)
                    const newDist = Math.min(10, currentDist * 1.2)
                    
                    // Maintain direction, update distance
                    const newPos = basePos.normalize().multiplyScalar(newDist)
                    
                    setTargetCameraPos(newPos)
                    handleInteraction()
                }
            },
            resetZoom: () => {
                if (camera) {
                    // Reset to default distance (5) and position (0,0,5)
                    setTargetCameraPos(new Vector3(0, 0, 5))
                    handleInteraction()
                }
            },
            zoomToPercent: (percent: number) => {
                const basePos = targetCameraPos ? targetCameraPos.clone() : camera.position.clone()
                setTargetCameraPos(basePos.normalize().multiplyScalar(500 / percent))
            },
            centerCity,
        }
    }
  }, [camera, zoomRef, targetCameraPos])

  // Hook up controls to interaction handler
  useEffect(() => {
    const controls = controlsRef.current
    if (controls) {
        const start = () => { isInteracting.current = true; setTargetCameraPos(null); handleInteraction() }
        const end = () => { isInteracting.current = false; handleInteraction() }
        const change = () => { if (isInteracting.current) handleInteraction() }
        controls.addEventListener('start', start)
        controls.addEventListener('end', end)
        controls.addEventListener('change', change)
        return () => {
            controls.removeEventListener('start', start)
            controls.removeEventListener('end', end)
            controls.removeEventListener('change', change)
        }
    }
  }, [])

  const getSphericalCoordinates = (lat: number, lng: number, radius: number) => {
    return cityDirection(lat, lng, radius).toArray() as [number, number, number]
  }

  const handleCityClickInternal = (city: CityData) => {
       if (enteringCityId) return
       suppressedPinHoverId.current = city.id
       setHoveredPinId(null)
       onPinHover?.(null)
       setFocusedCityId?.(null)
       steerGlobeTowardCity(city)
       onCityClick(city)
   }

  return (
    <>
      <ambientLight intensity={0.6} color="#bbc8da" />
      {/* Shared light source: both the Earth's terminator and lunar phase face the visible sun. */}
      <pointLight position={SUN_POSITION} intensity={160} decay={2} color="#ffe0b0" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <group position={SUN_POSITION}>
        <Sphere args={[.32, 32, 24]}><meshBasicMaterial color="#ffe7af" toneMapped={false} /></Sphere>
        <sprite scale={[2.8, 2.8, 1]} raycast={() => {}}>
          <spriteMaterial map={sunGlow} blending={AdditiveBlending} transparent opacity={.7} depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
      <group position={[6.4, -2.8, -10]}>
        <Sphere args={[.34, 32, 24]}><meshStandardMaterial color="#8c929d" roughness={1} metalness={0} /></Sphere>
      </group>
      
      {/* Group wrapper for standby rotation */}
      <group ref={globeRef}>
          {/* Occlusion Sphere (Black core) to block stars behind */}
          <Sphere args={[GLOBE_RADIUS - 0.05, 64, 64]}>
             <meshBasicMaterial color="#000000" />
          </Sphere>

          {/* Ambient fill preserves the night silhouette; direct light comes only from the sun. */}
          <Sphere 
            args={[GLOBE_RADIUS, 64, 64]} 
            onPointerDown={() => {
                gl.domElement.style.cursor = 'grabbing'
                handleInteraction()
            }}
            onPointerUp={() => {
                gl.domElement.style.cursor = 'grab'
            }}
            onPointerOver={() => { gl.domElement.style.cursor = 'grab' }}
            onPointerOut={() => { gl.domElement.style.cursor = '' }}
          >
            <meshStandardMaterial 
                color="#18332c"
                roughness={.88}
                metalness={.12}
                emissive="#06130f"
                emissiveIntensity={.22}
            />
          </Sphere>

          {/* Only coastlines: no borders or regional divisions. */}
          <GlobeGeography />

          {cities.map((city) => {
            const position = getSphericalCoordinates(city.geoCoordinates.lat, city.geoCoordinates.lng, GLOBE_RADIUS)
            const isOpen = !!openPopups[city.id]
            const isConquered = (conqueredCities || []).includes(city.id)
            const isUnlocked = true // All cities playable in v3.0!
            const popup = openPopups[city.id]
            const isHovered = hoveredPinId === city.id || focusedCityId === city.id
            const eras = getCityEras(city)
            const isLocationPin = eras[0]?.id === city.id
            const locationConquered = eras.some(era => conqueredCities.includes(era.id))
            const locationOpen = eras.some(era => !!openPopups[era.id])
            
            // Touch/Click handling state
            const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null)

            return (
              <group key={city.id} position={position}>
                {isLocationPin && <>
                {/* City Pin */}
                <mesh 
                    onClick={(e) => {
                        if (isHiddenPin(e.object)) return
                        // Keep onClick for desktop/mouse standard behavior if it works
                        if (("pointerType" in e.nativeEvent ? e.nativeEvent.pointerType : "mouse") === 'mouse') {
                            e.stopPropagation()
                            handleInteraction()
                            handleCityClickInternal(city) 
                            bringToFront(city.id)
                        }
                    }}
                    onPointerDown={(e) => {
                        if (isHiddenPin(e.object)) return
                        e.stopPropagation() // Prevent globe drag start
                        ;(e.target as Element).setPointerCapture(e.pointerId)
                        touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
                    }}
                    onPointerUp={(e) => {
                        if (isHiddenPin(e.object)) {
                            touchStartRef.current = null
                            return
                        }
                        e.stopPropagation()
                        ;(e.target as Element).releasePointerCapture(e.pointerId)
                        if (touchStartRef.current) {
                            const dx = e.clientX - touchStartRef.current.x
                            const dy = e.clientY - touchStartRef.current.y
                            const dist = Math.sqrt(dx * dx + dy * dy)
                            
                            // Tolerance for touch "tap" (allow slight movement)
                            if (dist < 10 && e.pointerType !== 'mouse') {
                                handleInteraction()
                                handleCityClickInternal(city) 
                                bringToFront(city.id)
                            }
                            touchStartRef.current = null
                        }
                    }}
                    onPointerEnter={(e) => {
                        if (isHiddenPin(e.object)) return
                        e.stopPropagation()
                        gl.domElement.style.cursor = 'pointer'
                        if (suppressedPinHoverId.current === city.id) return
                        if (e.pointerType === 'mouse') {
                            setHoveredPinId(city.id)
                            setFocusedCityId?.(city.id)
                            onPinHover?.(city.id)
                            playMapSound("pin_kick_hover", true)
                            handleInteraction()
                        }
                    }}
                    onPointerOut={() => {
                        if (suppressedPinHoverId.current === city.id && !pinClickBoost.current) suppressedPinHoverId.current = null
                        gl.domElement.style.cursor = ''
                        setHoveredPinId(current => current === city.id ? null : current)
                        setFocusedCityId?.(null)
                        onPinHover?.(null)
                    }}
                    scale={isHovered ? [1.15, 1.15, 1.15] : [1, 1, 1]}
                >
                  <sphereGeometry args={[0.04, 16, 16]} />
                  <mesh>
                    <sphereGeometry args={[.075, 12, 8]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
                  </mesh>
                  <meshStandardMaterial 
                    color={city.color} 
                    emissive={city.color}
                    emissiveIntensity={locationConquered ? 1.4 : 0.85}
                    toneMapped={false}
                    transparent
                    opacity={1}
                  />
                </mesh>
                
                {/* Glow effect */}
                <mesh scale={isHovered ? [1.725, 1.725, 1.725] : [1.5, 1.5, 1.5]}>
                    <sphereGeometry args={[0.04, 16, 16]} />
                    <meshBasicMaterial color={city.color} transparent opacity={locationConquered ? 0.45 : 0.25} />
                </mesh>

                {/* Conquered Golden Aura */}
                {locationConquered && (
                    <mesh scale={[2.1, 2.1, 2.1]}>
                        <sphereGeometry args={[0.04, 16, 16]} />
                        <meshBasicMaterial color="#eab308" transparent opacity={0.35} />
                    </mesh>
                )}

                {locationConquered && <ConqueredFlag city={city} idleRotationRef={idleFlagMotion} />}

                {/* Pulse Ring Effect (Hover/Selected) */}
                {(locationOpen || isHovered) && <PulsingRing city={city} isOpen={locationOpen} isHoveredProp={isHovered} />}
                </>}

                {isOpen && (
                      <PopupContainer
                          onEraSelect={(era: CityData, position: { x: number; y: number }) => { if (era.id !== city.id) { onPopupClose(city.id); centerCity(era); onCityClick(era, position) } }}
                          city={city}
                          popup={popup}
                          popupLayerRef={popupLayerRef}
                          isConquered={isConquered}
                          isUnlocked={isUnlocked}
                          pressedPopupState={pressedPopupState}
                          bringToFront={bringToFront}
                          onPopupClose={onPopupClose}
                          updatePopupPosition={updatePopupPosition}
                          playMapSound={playMapSound}
                          startWhistleLoop={startWhistleLoop}
                          stopWhistleLoop={stopWhistleLoop}
                          setPressedPopupState={setPressedPopupState}
                          handleSmartPadSound={handleSmartPadSound}
                          handleSmartPadLeave={handleSmartPadLeave}
                          stopPadSound={stopPadSound}
                          isEntering={enteringCityId === city.id}
                          setEnteringCityId={(id: string | null) => { if (!enteringCityId) setEnteringCityId(id) }}
                          setIsDraggingPopup={setIsDraggingPopup}
                          standbyRef={isStandby}
                      />
                )}
              </group>
            )
          })}
      </group>
      
      <TrackballControls 
        ref={controlsRef} 
        domElement={gl.domElement}
        // Keep the controller enabled so it always receives pointerup and clears
        // its internal drag state. Only rotation is suspended behind a popup.
        enabled={!enteringCityId}
        noRotate={isDraggingPopup || !!enteringCityId}
        noPan={true} 
        minDistance={enteringCityId ? 2.05 : 3.33}
        maxDistance={10} 
        rotateSpeed={(() => {
            if (isDraggingPopup) return 0.2
            
            // Calculate rotate speed based on zoom (camera distance)
            // Base distance (75% zoom) is approx 6.66 (since 5/0.75 = 6.66)
            // Max zoom (150%) distance is 3.33 (since 5/1.5 = 3.33)
            
            // We want base speed (1.7) at distance 6.66
            // We want speed 0.66 at distance 3.33
            
            // Let's use simpler lerp logic inside component
            const dist = camera.position.length()
            // Clamp distance between min and base
            const clampedDist = Math.min(Math.max(dist, 3.33), 6.66)
            
            // Map [3.33, 6.66] to [0.66, 1.7]
            const t = (clampedDist - 3.33) / (6.66 - 3.33) // 0 to 1
            const speed = 0.66 + t * (1.7 - 0.66)
            
            return speed
        })()}
        noZoom={!!enteringCityId}
        staticMoving={true}
        dynamicDampingFactor={0.1}
      />
    </>
  )
}

export const GlobeComponent = (props: GlobeProps) => {
    const [constrained] = useState(isConstrainedDevice)
    return (
        <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }} dpr={constrained ? 1 : [1, 1.5]} gl={{ alpha: true, powerPreference: 'high-performance' }} className="w-full h-full">
            <Suspense fallback={null}>
                <GlobeContent {...props} />
            </Suspense>
        </Canvas>
    )
}
