"use client"

/* global Event, CustomEvent */

import { useRef, useState, useEffect, useMemo, Suspense, type ComponentRef, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Html, Sphere, Stars, TrackballControls } from '@react-three/drei'
import { TextureLoader, FileLoader, Color, Mesh, Group, Vector3, MathUtils, DoubleSide, Quaternion, AdditiveBlending, type PerspectiveCamera, SRGBColorSpace, Float32BufferAttribute, type BufferAttribute, type Points, type LineSegments } from 'three'
import { CityData, getCityEras } from '@/lib/cities-data'
import { CityPopup, type PopupExitMotion } from './city-popup'
import { cityDirection, cityFlightPose, popupStandbyCompensation, sphereFillDistance } from '@/lib/globe-navigation'
import { cityFlagColor, createCityFlagTexture } from '@/lib/globe-flags'
import { isConstrainedDevice } from '@/lib/performance'
import { RealisticEarth } from './globe-realistic'
import { constrainPopupPosition, coastlineSegments, globeGridPoints, nearestGlobeSilhouettePoint, pinIsBehindGlobe } from '@/lib/globe-geography'


function GlobeGeography({ realisticMixRef }: { realisticMixRef: RefObject<number> }) {
  const svg = useLoader(FileLoader, '/world_map_contours.svg') as string
  const coast = useMemo(() => coastlineSegments(svg), [svg])
  const grid = useMemo(() => globeGridPoints(), [])
  const uniforms = useMemo(() => ({ color: { value: new Color('#39ff14') }, sun: { value: new Vector3(-6.2, 3.3, -10) }, fade: { value: 1 } }), [])
  const gridUniforms = useMemo(() => ({ color: { value: new Color('#789386') }, sun: { value: new Vector3(-6.2, 3.3, -10) }, fade: { value: 1 } }), [])
  const pointsRef = useRef<Points>(null)
  const linesRef = useRef<LineSegments>(null)
  // The neon drawing gives way while the realistic Earth fades in.
  useFrame(() => {
    const mix = realisticMixRef.current ?? 0
    const fade = 1 - mix * mix * (3 - 2 * mix)
    uniforms.fade.value = fade
    gridUniforms.fade.value = fade
    if (pointsRef.current) pointsRef.current.visible = fade > 0
    if (linesRef.current) linesRef.current.visible = fade > 0
  })
  return <>
    <points ref={pointsRef} raycast={() => {}}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[grid, 3]} /></bufferGeometry>
      <shaderMaterial transparent depthWrite={false} uniforms={gridUniforms}
        vertexShader="uniform vec3 sun; varying float lightAmount; void main() { vec4 worldPosition = modelMatrix * vec4(position, 1.0); vec3 worldPoint = worldPosition.xyz; lightAmount = max(0.0, dot(normalize(worldPoint), normalize(sun - worldPoint))); gl_Position = projectionMatrix * viewMatrix * worldPosition; gl_PointSize = 2.4; }"
        fragmentShader="uniform vec3 color; uniform float fade; varying float lightAmount; void main() { vec2 point = gl_PointCoord - vec2(0.5); if (dot(point, point) > 0.25) discard; float brightness = 0.5 + 0.5 * lightAmount; gl_FragColor = vec4(color * brightness, 0.55 * fade); }" />
    </points>
    <lineSegments ref={linesRef} raycast={() => {}}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[coast, 3]} /></bufferGeometry>
      <shaderMaterial transparent depthWrite={false} uniforms={uniforms}
        vertexShader="varying vec3 worldPoint; void main() { vec4 p = modelMatrix * vec4(position, 1.0); worldPoint = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }"
        fragmentShader="uniform vec3 color; uniform vec3 sun; uniform float fade; varying vec3 worldPoint; void main() { float light = max(0.0, dot(normalize(worldPoint), normalize(sun - worldPoint))); gl_FragColor = vec4(color, .7 * (.532 + .468 * light) * fade); }" />
    </lineSegments>
  </>
}

interface GlobeProps {
  cities: CityData[]
  conqueredCities?: string[]
  unlockedCities?: string[]
  openPopups: Record<string, any>
  onCityClick: (city: CityData, position?: { x: number; y: number }) => void
  onPopupClose: (cityId: string, type?: 'open' | 'closed' | 'held' | 'era', motion?: PopupExitMotion) => void
  bringToFront: (id: string) => void
  updatePopupPosition: (id: string, x: number, y: number) => void
  playMapSound: (type: string, forceResume?: boolean) => void
  startWhistleLoop: () => void
  stopWhistleLoop: () => void
  setPressedPopupState: (state: { id: string } | null) => void
  onCitySelect: (city: CityData) => void
  onCreateRoom?: (city: CityData) => void
  creatingRoomCityId?: string | null
  handleSmartPadSound: (e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>, pitchMultiplier?: number) => void
  handleSmartPadLeave: (e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>) => void
  stopPadSound: () => void
  pressedPopupState: { id: string } | null
  enteringCityId: string | null
  setEnteringCityId: (id: string | null) => void
  zoomRef?: React.MutableRefObject<{ zoomIn: () => void, zoomOut: () => void, resetZoom: () => void, zoomToPercent: (percent: number) => void, centerCity: (city: CityData) => void } | null>
  onZoomChange?: (zoom: number) => void
  onIntroZoomScaleChange?: (scale: number) => void
  focusedCityId?: string | null
  setFocusedCityId?: (cityId: string | null) => void
  onPinHover?: (cityId: string | null) => void
  popupLayerRef?: RefObject<HTMLDivElement | null>
  onlineDisabled?: boolean
  /** Realistic Earth instead of the neon outline; fades in once the intro zoom ends. */
  realistic?: boolean
}

const GLOBE_RADIUS = 2
const PIN_RADIUS = .04
const CAMERA_NEAR = .1
const SUN_POSITION: [number, number, number] = [-6.2, 3.3, -10]

type PopupLineState = { startX: number; startY: number; cpX: number; cpY: number; endX: number; endY: number; handlePath: string }

function popupLineState(position: { x: number; y: number }, jitter: number, dragging: boolean, dragAnchor: { x: number; y: number }, start = { x: 0, y: 0 }, size = { width: 317, height: 450 }): PopupLineState {
  const startX = start.x, startY = start.y, { width, height } = size
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
  // Rest X/Y of every cloth vertex, interleaved.
  const restXY = useRef<Float32Array | null>(null)
  // Each flag gets its own wind: phases, gust rhythm and pole stiffness differ,
  // so neighbouring pins never move in sync.
  const wind = useRef({
    time: Math.random() * 100,
    seeds: Array.from({ length: 6 }, () => Math.random() * Math.PI * 2),
    gustRate: .8 + Math.random() * .5,
    stiffness: (2 * Math.PI * (.55 + Math.random() * .2)) ** 2,
    nextImpulse: 1 + Math.random() * 3,
    wavePhase: Math.random() * Math.PI * 2,
  })
  // Pole lean (z: along the cloth, x: across it) driven by a damped spring.
  const pole = useRef({ x: 0, z: 0, vx: 0, vz: 0 })
  const motionScale = useRef({ pole: 1, cloth: 1 })
  const reduceMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const texture = useMemo(() => typeof document === 'undefined' ? null : createCityFlagTexture(city), [city])
  useEffect(() => () => texture?.dispose(), [texture])
  const normal = cityDirection(city.pinCoordinates.lat, city.pinCoordinates.lng, 1).normalize()
  const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal)
  useFrame((_, frameDelta) => {
    if (!flagRef.current || !clothRef.current || reduceMotion) return
    const delta = Math.min(frameDelta, 1 / 20)
    const air = wind.current
    air.time += delta
    const t = air.time * air.gustRate
    const [s0, s1, s2, s3, s4, s5] = air.seeds
    // Layered, incommensurate sines read as an irregular breeze: slow swells
    // carry quicker gusts, and strength stays within 0..1.
    const swell = Math.sin(t * .23 + s0) * .5 + Math.sin(t * .61 + s1) * .3 + Math.sin(t * 1.37 + s2) * .2
    const strength = MathUtils.clamp(.55 + swell * .45, 0, 1)
    const crossGust = Math.sin(t * .47 + s3) * .6 + Math.sin(t * 1.13 + s4) * .4

    const blend = 1 - Math.exp(-delta * 4)
    motionScale.current.pole = MathUtils.lerp(motionScale.current.pole, idleRotationRef.current ? 1.5 : 1, blend)
    motionScale.current.cloth = MathUtils.lerp(motionScale.current.cloth, idleRotationRef.current ? .56 : 1, blend)
    const poleScale = motionScale.current.pole
    const clothScale = motionScale.current.cloth

    // The pole leans with the wind and springs back, with an occasional random
    // knock, so the tip wanders instead of tracing a fixed loop.
    const spring = pole.current
    air.nextImpulse -= delta
    if (air.nextImpulse <= 0) {
      air.nextImpulse = 1.2 + Math.random() * 3.5
      spring.vz -= (.12 + Math.random() * .22) * strength
      spring.vx += (Math.random() - .5) * .3
    }
    const damping = 2 * .22 * Math.sqrt(air.stiffness)
    const leanTarget = -.07 * strength
    spring.vz += (air.stiffness * (leanTarget - spring.z) - damping * spring.vz) * delta
    spring.vx += (air.stiffness * (crossGust * .05 - spring.x) - damping * spring.vx) * delta
    spring.z += spring.vz * delta
    spring.x += spring.vx * delta
    flagRef.current.rotation.set(spring.x * poleScale, 0, spring.z * poleScale)
    // The cloth yaws a little around the pole as gusts change direction.
    clothRef.current.rotation.y = (crossGust * .07 + spring.vx * .04) * clothScale

    const geometry = clothMeshRef.current?.geometry
    if (geometry) {
      const positions = geometry.getAttribute('position') as BufferAttribute
      if (!restXY.current) {
        restXY.current = Float32Array.from({ length: positions.count * 2 }, (_, i) => i % 2 ? positions.getY(i >> 1) : positions.getX(i >> 1))
      }
      let shades = geometry.getAttribute('color') as BufferAttribute | undefined
      if (!shades) {
        shades = new Float32BufferAttribute(new Float32Array(positions.count * 3).fill(1), 3)
        geometry.setAttribute('color', shades)
      }
      // Waves travel from the pole to the free edge, faster and larger in
      // stronger wind; in a lull the cloth slackens and the free end droops.
      air.wavePhase += delta * (3.2 + strength * 5.5)
      const wave = air.wavePhase
      const amplitude = (.012 + strength * .022) * clothScale
      const slack = (1 - strength) ** 1.6
      for (let i = 0; i < positions.count; i++) {
        const baseX = restXY.current[i * 2]
        const baseY = restXY.current[i * 2 + 1]
        const u = (baseX + .06) / .12
        const v = baseY / .07
        // Wave fronts run slightly diagonal, like real cloth catching the air.
        const a = u * Math.PI * 2.3 - wave + v * .9
        const b = u * Math.PI * 4.1 - wave * 1.7 + s5 - v * .6
        const reach = u ** 1.25
        const z = amplitude * reach * (Math.sin(a) * .75 + Math.sin(b) * .25)
        const slope = Math.cos(a) * .75 + Math.cos(b) * .45
        positions.setX(i, baseX - u * (.003 + amplitude * .25 + slack * .01) - Math.abs(z) * .2)
        positions.setY(i, baseY - slack * u * u * .022 * clothScale + amplitude * reach * Math.sin(b + .8) * .12)
        positions.setZ(i, z)
        const light = .74 + .26 * MathUtils.clamp(.5 + slope * .4 * reach, 0, 1)
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
          <planeGeometry args={[.12, .07, 16, 5]} />
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
    onCreateRoom,
    creatingRoomCityId,
    onlineDisabled,
    driftAway,
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
    const lastCanvasSize = useRef<{ width: number; height: number } | null>(null)
    const hasDragged = useRef(false)
    useEffect(() => { hasDragged.current = false }, [popup.timestamp])
    const topCurveJitter = useRef((Math.random() - 0.5) * 20)

    // Track drag start position for anchor
    const dragAnchor = useRef({ x: 31, y: 8 }) // Default to handle center

    const lastLineState = useRef<PopupLineState>({ startX: 0, startY: 0, cpX: 0, cpY: 0, endX: 0, endY: 0, handlePath: '' })
    const [isDraggingLocal, setIsDraggingLocal] = useState(false)
    const draggingRef = useRef(false)
    // After a drop from the close button the card stays where and how it was
    // left (even partly off screen) and the cable stays on the button, until
    // the card is dragged by its body.
    const [hangingFromClose, setHangingFromClose] = useState(false)
    const hangingFromCloseRef = useRef(false)
    const setHanging = (value: boolean) => { hangingFromCloseRef.current = value; setHangingFromClose(value) }
    // A card held by its close button stays under the hand: no standby drift.
    const heldByCloseRef = useRef(false)
    const cardSize = useRef({ width: 317, height: 450 })
    // Entering another city cuts the card loose: it keeps its screen position
    // instead of following its pin during the camera dive, and the cable goes.
    const driftAwayRef = useRef(false)
    driftAwayRef.current = !!driftAway && !popup.isClosing
    const driftOrigin = useRef<{ x: number; y: number } | null>(null)

    useFrame(({ camera, size }) => {
      if (!anchorRef.current || !lineRef.current) return
      anchorRef.current.getWorldPosition(worldPin)
      const behind = pinIsBehindGlobe(worldPin, camera.position)
      const opacity = behind ? '0.5' : '1'
      if (lineRef.current.style.opacity !== opacity) {
        lineRef.current.style.opacity = opacity
        lineRef.current.dataset.pinHidden = String(behind)
      }

      const sizeChanged = !lastCanvasSize.current || lastCanvasSize.current.width !== size.width || lastCanvasSize.current.height !== size.height
      if (sizeChanged) {
        lastCanvasSize.current = { width: size.width, height: size.height }
        previousProjectedPin.current = null
      }

      projectedPin.copy(worldPin).project(camera)
      const screen = { x: (projectedPin.x + 1) * size.width / 2, y: (1 - projectedPin.y) * size.height / 2 }
      if (driftAwayRef.current) {
        if (!driftOrigin.current) driftOrigin.current = screen
        lineRef.current.style.opacity = '0'
        if (wrapperRef.current) wrapperRef.current.style.transform = `translate3d(${slowOffset.current.x + driftOrigin.current.x - screen.x}px, ${slowOffset.current.y + driftOrigin.current.y - screen.y}px, 0)`
        return
      }
      driftOrigin.current = null
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
      if (standbyRef.current && previous && !popup.isClosing && !heldByCloseRef.current) {
        slowOffset.current.x += popupStandbyCompensation(screen.x - previous.x)
        slowOffset.current.y += popupStandbyCompensation(screen.y - previous.y)
      }
      if (!popup.isClosing && !draggingRef.current && (!hangingFromCloseRef.current || sizeChanged) && wrapperRef.current) {
        const panel = wrapperRef.current.querySelector<HTMLElement>('[data-popup-surface]')
        if (panel) {
          const rect = panel.getBoundingClientRect()
          const current = {
            x: screen.x + localPosRef.current.x + slowOffset.current.x,
            y: screen.y + localPosRef.current.y + slowOffset.current.y,
          }
          const viewport = window.visualViewport
          const viewportLeft = viewport?.offsetLeft ?? 0
          const viewportTop = viewport?.offsetTop ?? 0
          const viewportRight = viewportLeft + (viewport?.width ?? window.innerWidth)
          const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight)
          const opening = !hasDragged.current && Date.now() - popup.timestamp < 1600
          const requested = opening ? {
            x: current.x,
            y: current.y + (viewportTop + (viewportBottom - viewportTop - rect.height) / 2 + popup.centerOffsetY - rect.top),
          } : current
          const visible = constrainPopupPosition(requested, { width: rect.width, height: rect.height }, globeCircle.current, {
            left: viewportLeft,
            top: viewportTop,
            right: viewportRight,
            bottom: viewportBottom,
          })
          if (opening) {
            const minX = viewportLeft + 12
            const maxX = Math.max(minX, viewportRight - rect.width - 12)
            visible.x = Math.max(minX, Math.min(maxX, visible.x))
          }
          if (sizeChanged) {
            const deltaX = visible.x - current.x
            const deltaY = visible.y - current.y
            if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
              const next = {
                x: localPosRef.current.x + deltaX,
                y: localPosRef.current.y + deltaY,
              }
              localPosRef.current = next
              setLocalPos(next)
              updatePopupPosition(city.id, next.x, next.y)
            }
          } else {
            slowOffset.current.x += visible.x - current.x
            slowOffset.current.y += visible.y - current.y
          }
        }
      }
      if (wrapperRef.current) wrapperRef.current.style.transform = `translate3d(${slowOffset.current.x}px, ${slowOffset.current.y}px, 0)`
      if (!popup.isClosing) {
        const visualPosition = { x: localPosRef.current.x + slowOffset.current.x, y: localPosRef.current.y + slowOffset.current.y }
        const surface = wrapperRef.current?.querySelector<HTMLElement>('[data-popup-surface]')
        if (surface) cardSize.current = { width: surface.offsetWidth, height: surface.offsetHeight }
        const nextLine = popupLineState(visualPosition, topCurveJitter.current, draggingRef.current || hangingFromCloseRef.current, dragAnchor.current, lineStartOffset.current, cardSize.current)
        lastLineState.current = nextLine
        cablePathRef.current?.setAttribute('d', `M ${nextLine.startX} ${nextLine.startY} Q ${nextLine.cpX} ${nextLine.cpY} ${nextLine.endX} ${nextLine.endY}`)
        lineStartRef.current?.setAttribute('cx', String(nextLine.startX))
        lineStartRef.current?.setAttribute('cy', String(nextLine.startY))
        handlePathRef.current?.setAttribute('d', nextLine.handlePath)
      }
      previousProjectedPin.current = screen
    })

    useEffect(() => {
      const handleWindowResize = () => {
        previousProjectedPin.current = null
        if (!popup.isClosing && !draggingRef.current && wrapperRef.current) {
          const panel = wrapperRef.current.querySelector<HTMLElement>('[data-popup-surface]')
          if (panel && globeCircle.current.radius > 0) {
            const rect = panel.getBoundingClientRect()
            const anchor = wrapperRef.current.getBoundingClientRect()
            const viewport = window.visualViewport
            const viewportLeft = viewport?.offsetLeft ?? 0
            const viewportTop = viewport?.offsetTop ?? 0
            const viewportRight = viewportLeft + (viewport?.width ?? window.innerWidth)
            const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight)
            const current = {
              x: anchor.left + localPosRef.current.x,
              y: anchor.top + localPosRef.current.y,
            }
            const visible = constrainPopupPosition(current, { width: rect.width, height: rect.height }, globeCircle.current, {
              left: viewportLeft,
              top: viewportTop,
              right: viewportRight,
              bottom: viewportBottom,
            })
            const deltaX = visible.x - current.x
            const deltaY = visible.y - current.y
            if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
              const next = {
                x: localPosRef.current.x + deltaX,
                y: localPosRef.current.y + deltaY,
              }
              localPosRef.current = next
              setLocalPos(next)
              updatePopupPosition(city.id, next.x, next.y)
            }
          }
        }
      }
      window.addEventListener('resize', handleWindowResize)
      window.visualViewport?.addEventListener('resize', handleWindowResize)
      return () => {
        window.removeEventListener('resize', handleWindowResize)
        window.visualViewport?.removeEventListener('resize', handleWindowResize)
      }
    }, [city.id, popup.isClosing, updatePopupPosition])

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
      : popupLineState({ x: localPos.x + slowOffset.current.x, y: localPos.y + slowOffset.current.y }, topCurveJitter.current, isDraggingLocal || hangingFromClose, dragAnchor.current, lineStartOffset.current, cardSize.current)
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
                        onCreateRoom={onCreateRoom}
                        onlineDisabled={onlineDisabled}
                        driftAway={driftAway}
                        isCreatingRoom={creatingRoomCityId === city.id}
                        popup={{ ...popup, x: localPos.x, y: localPos.y }} // Use local state
                        isConquered={isConquered}
                        isUnlocked={isUnlocked}
                        isPressed={pressedPopupState?.id === city.id}
                        bringToFront={bringToFront}
                        closePopup={onPopupClose}
                        updatePopupPosition={(id, x, y, preserveAnchor = false) => {
                            let next = { x, y }
                            const wrapper = wrapperRef.current
                            const panel = wrapper?.querySelector<HTMLElement>('[data-popup-surface]')
                            if (!preserveAnchor && wrapper && panel && globeCircle.current.radius > 0) {
                                const anchor = wrapper.getBoundingClientRect()
                                const rect = panel.getBoundingClientRect()
                                const position = { x: anchor.left + x, y: anchor.top + y }
                                const viewport = window.visualViewport
                                const viewportLeft = viewport?.offsetLeft ?? 0
                                const viewportTop = viewport?.offsetTop ?? 0
                                const constrained = constrainPopupPosition(position, { width: rect.width, height: rect.height }, globeCircle.current, {
                                  left: viewportLeft,
                                  top: viewportTop,
                                  right: viewportLeft + (viewport?.width ?? window.innerWidth),
                                  bottom: viewportTop + (viewport?.height ?? window.innerHeight),
                                })
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
                            hasDragged.current = true
                            setHanging(false)
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
                        onCloseButtonDragStart={(clientX, clientY) => {
                            hasDragged.current = true
                            heldByCloseRef.current = true
                            setHanging(false)
                            setIsDraggingPopup(true)
                            setIsDraggingLocal(true)
                            draggingRef.current = true
                            if (wrapperRef.current) {
                                const rect = wrapperRef.current.getBoundingClientRect()
                                dragAnchor.current = {
                                    x: clientX - rect.left - localPosRef.current.x,
                                    y: clientY - rect.top - localPosRef.current.y,
                                }
                            }
                        }}
                        onCloseButtonDragMove={(clientX, clientY, popupX, popupY) => {
                            if (wrapperRef.current) {
                                const rect = wrapperRef.current.getBoundingClientRect()
                                dragAnchor.current = {
                                    x: clientX - rect.left - popupX,
                                    y: clientY - rect.top - popupY,
                                }
                            }
                        }}
                        onCloseButtonDragEnd={() => {
                            heldByCloseRef.current = false
                            setHanging(true)
                            setIsDraggingPopup(false)
                            setIsDraggingLocal(false)
                            draggingRef.current = false
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
  onCreateRoom,
  creatingRoomCityId,
  onlineDisabled,
  handleSmartPadSound,
  handleSmartPadLeave,
  stopPadSound,
  pressedPopupState,
  enteringCityId,
  setEnteringCityId,
  zoomRef,
  onZoomChange,
  onIntroZoomScaleChange,
  focusedCityId,
  setFocusedCityId,
  onPinHover,
  popupLayerRef,
  realistic = false,
  constrained = false,
}: GlobeProps & { constrained?: boolean }) => {
  const controlsRef = useRef<any>(null)
  const globeRef = useRef<Group>(null)
  const [isDraggingPopup, setIsDraggingPopup] = useState(false)
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null)
  const hoveredPinIdRef = useRef<string | null>(null)
  const resumeStandbyAfterPinHover = useRef(false)
  const suppressedPinHoverId = useRef<string | null>(null)
  const isStandby = useRef(false)
  const idleFlagMotion = useRef(false)
  const isInteracting = useRef(false)
  const lastInteractionTime = useRef(Date.now())
  const [introZoomComplete, setIntroZoomComplete] = useState(false)
  const lastReportedZoom = useRef(100)
  const realisticMix = useRef(0)
  // Load the Earth maps only once realism has been asked for, then keep them.
  const [realisticLoaded, setRealisticLoaded] = useState(realistic)
  useEffect(() => { if (realistic) setRealisticLoaded(true) }, [realistic])
  
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
    const handleResize = () => {
      controlsRef.current?.handleResize?.()
    }
    window.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [])

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
  const entryFlight = useRef<{ city: CityData; from: Vector3; up: Vector3; pin: Vector3; endGap: number; elapsed: number; duration: number; done: boolean } | null>(null)
  useEffect(() => {
    const city = cities.find(candidate => candidate.id === enteringCityId)
    const perspective = camera as PerspectiveCamera
    if (!city || !globeRef.current) {
      entryFlight.current = null
      if (perspective.near !== CAMERA_NEAR) { perspective.near = CAMERA_NEAR; perspective.updateProjectionMatrix() }
      return
    }
    const pin = globeRef.current.localToWorld(cityDirection(city.pinCoordinates.lat, city.pinCoordinates.lng, GLOBE_RADIUS))
    // End the dive inside the pin's glow, close enough for the inner circle to fill the screen.
    const endGap = sphereFillDistance(PIN_RADIUS, perspective.fov, perspective.aspect)
    perspective.near = endGap / 5
    perspective.updateProjectionMatrix()
    entryFlight.current = { city, from: camera.position.clone(), up: camera.up.clone(), pin, endGap, elapsed: 0, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? .15 : 1.4, done: false }
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
      const pose = cityFlightPose(flight.from, flight.up, flight.pin, progress, flight.endGap)
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
       onIntroZoomScaleChange?.(startZ / camera.position.length())
       
       if (progress >= 1 && !introZoomComplete) {
           setIntroZoomComplete(true)
           lastInteractionTime.current = Date.now() - 4000 // Start standby immediately
       }
    } else if (time >= 6.5 && !introZoomComplete) {
        // Ensure we finish
        camera.position.z = 5 / 0.75
        onIntroZoomScaleChange?.(2.5 / camera.position.length())
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
    const canRotate = introZoomComplete && !isInteracting.current && !hoveredPinId && (!targetCameraPos || resumeStandbyAfterCenter.current) && (timeSinceInteraction > 800 || resumeStandbyAfterPinHover.current || !!hoveredListCity || !!pinClickBoost.current)
    if (canRotate) {
        resumeStandbyAfterPinHover.current = false
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
            const pinDirection = globeRef.current.localToWorld(cityDirection(hoveredListCity.pinCoordinates.lat, hoveredListCity.pinCoordinates.lng, 1)).normalize()
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
      resumeStandbyAfterPinHover.current = false
      pinClickBoost.current = null
      suppressedPinHoverId.current = null
      centeringCamera.current = false
      resumeStandbyAfterCenter.current = false
  }

  const centerCity = (city: CityData) => {
      if (enteringCityId || !globeRef.current) return
      pinClickBoost.current = null
      suppressedPinHoverId.current = null
      const direction = globeRef.current.localToWorld(cityDirection(city.pinCoordinates.lat, city.pinCoordinates.lng, 1)).normalize()
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
      const pinDirection = globeRef.current.localToWorld(cityDirection(city.pinCoordinates.lat, city.pinCoordinates.lng, 1)).normalize()
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
          <GlobeGeography realisticMixRef={realisticMix} />

          {realisticLoaded && <Suspense fallback={null}>
            <RealisticEarth radius={GLOBE_RADIUS} sunPosition={SUN_POSITION} target={realistic && introZoomComplete} mixRef={realisticMix} constrained={constrained} />
          </Suspense>}

          {cities.map((city) => {
            const position = getSphericalCoordinates(city.pinCoordinates.lat, city.pinCoordinates.lng, GLOBE_RADIUS)
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
                            hoveredPinIdRef.current = city.id
                            resumeStandbyAfterPinHover.current = false
                            setHoveredPinId(city.id)
                            setFocusedCityId?.(city.id)
                            onPinHover?.(city.id)
                            playMapSound("pin_kick_hover", true)
                            handleInteraction()
                        }
                    }}
                    onPointerOut={() => {
                        if (hoveredPinIdRef.current === city.id) {
                            hoveredPinIdRef.current = null
                            if (!isInteracting.current) resumeStandbyAfterPinHover.current = true
                        }
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

                {locationConquered && !eras.some(era => era.id === enteringCityId) && <ConqueredFlag city={city} idleRotationRef={idleFlagMotion} />}

                {/* Pulse Ring Effect (Hover/Selected) */}
                {(locationOpen || isHovered) && <PulsingRing city={city} isOpen={locationOpen} isHoveredProp={isHovered} />}
                </>}

                {isOpen && (
                      <PopupContainer
                          onEraSelect={(era: CityData, position: { x: number; y: number }) => { if (era.id !== city.id) { onPopupClose(city.id, 'era'); centerCity(era); onCityClick(era, position) } }}
                          city={city}
                          onCreateRoom={onCreateRoom}
                          creatingRoomCityId={creatingRoomCityId}
                          onlineDisabled={onlineDisabled}
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
                          driftAway={!!enteringCityId}
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
            
            // We want base speed (2.2) at distance 6.66
            // We want speed 0.66 at distance 3.33
            
            // Let's use simpler lerp logic inside component
            const dist = camera.position.length()
            // Clamp distance between min and base
            const clampedDist = Math.min(Math.max(dist, 3.33), 6.66)
            
            // Increase the angular speed as the globe appears smaller, so a
            // finger travels a similar screen distance at every zoom level.
            // Map [3.33, 6.66] to [0.66, 2.2]
            const t = (clampedDist - 3.33) / (6.66 - 3.33) // 0 to 1
            const speed = 0.66 + t * (2.2 - 0.66)
            
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
                <GlobeContent {...props} constrained={constrained} />
            </Suspense>
        </Canvas>
    )
}
