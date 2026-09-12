"use client"

import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Html, Sphere, Stars, TrackballControls } from '@react-three/drei'
import { TextureLoader, Mesh, Group, Vector3, MathUtils, DoubleSide, Quaternion, AdditiveBlending, SRGBColorSpace } from 'three'
import { CityData } from '@/lib/cities-data'
import { CityPopup } from './city-popup'
import { cityDirection, cityFlightPose } from '@/lib/globe-navigation'

interface GlobeProps {
  cities: CityData[]
  conqueredCities?: string[]
  unlockedCities?: string[]
  openPopups: Record<string, any>
  onCityClick: (city: CityData) => void
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
  zoomRef?: React.MutableRefObject<{ zoomIn: () => void, zoomOut: () => void, resetZoom: () => void } | null>
  onZoomChange?: (zoom: number) => void
}

const GLOBE_RADIUS = 2
const SUN_POSITION: [number, number, number] = [-6.2, 3.3, -10]

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

const ConqueredFlag = ({ city }: { city: CityData }) => {
  const normal = cityDirection(city.geoCoordinates.lat, city.geoCoordinates.lng, 1).normalize()
  const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal)
  return <group quaternion={orientation}>
    <mesh position={[0, .105, 0]}>
      <cylinderGeometry args={[.008, .008, .21, 6]} />
      <meshBasicMaterial color="#b9ffd1" />
    </mesh>
    <mesh position={[.06, .155, .004]}>
      <planeGeometry args={[.12, .07]} />
      <meshBasicMaterial color="#62e88b" side={DoubleSide} transparent opacity={.96} />
    </mesh>
  </group>
}

const PopupContainer = ({
    city,
    popup, // Initial/Global state
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
    handleInteraction
}: any) => {
    // Local state for smooth dragging
    const [localPos, setLocalPos] = useState({ x: popup.x, y: popup.y })
    const localPosRef = useRef({ x: popup.x, y: popup.y })
    const positionFrame = useRef<number | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const topCurveJitter = useRef((Math.random() - 0.5) * 20)
    
    // Track drag start position for anchor
    const dragAnchor = useRef({ x: 31, y: 8 }) // Default to handle center
    
    // Store last calculated line state to freeze it during closing animation
    const lastLineState = useRef({ 
        startX: 0, startY: 0, cpX: 0, cpY: 0, endX: 0, endY: 0, handlePath: "" 
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

    const popupWidth = 288 // w-72
    const popupHeight = 450 // Approximate height of the card
    
    // Connection Logic
    // Pin is at 0,0 relative to this container
    let startX = 0
    let startY = 0
    
    // Find closest side connection point
    // Calculate distances to center of each side
    const leftCenter = { x: localPos.x, y: localPos.y + popupHeight/2 }
    const rightCenter = { x: localPos.x + popupWidth, y: localPos.y + popupHeight/2 }
    const topCenter = { x: localPos.x + popupWidth/2, y: localPos.y }
    
    // Distances squared
    const dLeft = Math.pow(leftCenter.x - startX, 2) + Math.pow(leftCenter.y - startY, 2)
    const dRight = Math.pow(rightCenter.x - startX, 2) + Math.pow(rightCenter.y - startY, 2)
    const dTop = Math.pow(topCenter.x - startX, 2) + Math.pow(topCenter.y - startY, 2)
    
    let endX, endY, side, cpX, cpY, handlePath = ""
    
    // We need to know if we are currently dragging.
    const [isDraggingLocal, setIsDraggingLocal] = useState(false)

    // Calculate line state only if NOT closing (freeze otherwise)
    if (!popup.isClosing) {
        // Determine closest side
        const minD = Math.min(dLeft, dRight, dTop)
        
        if (minD === dTop) {
            endX = topCenter.x
            endY = topCenter.y
            side = 'top'
            cpX = startX + topCurveJitter.current
            cpY = (startY + endY) / 2
        } else if (minD === dLeft) {
            endX = leftCenter.x
            endY = leftCenter.y - 40 // Adjust visual anchor
            side = 'left'
            cpX = (startX + endX) / 2
            
            // Curve based on vertical position
            if (endY < 0) cpY = (startY + endY) / 2 + 50
            else cpY = (startY + endY) / 2 - 50
        } else { // Right
            endX = rightCenter.x
            endY = rightCenter.y - 40 // Adjust visual anchor
            side = 'right'
            cpX = (startX + endX) / 2
            
            // Curve based on vertical position
            if (endY < 0) cpY = (startY + endY) / 2 + 50
            else cpY = (startY + endY) / 2 - 50
        }

        // Override connection point if dragging
        if (isDraggingLocal) {
            endX = localPos.x + dragAnchor.current.x
            endY = localPos.y + dragAnchor.current.y
            // Update control points for smooth line to handle
            // Simple quadratic to the handle
            const midX = (startX + endX) / 2
            const midY = (startY + endY) / 2
            cpX = midX
            const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
            let arcHeight = Math.min(dist * 0.266, 66)
            if (endY < 0) {
                 cpY = midY + arcHeight 
            } else {
                 cpY = midY - arcHeight 
            }
        }

        // Handle path
        const r = 4
        if (!isDraggingLocal) {
            if (side === 'left') {
                handlePath = `M ${endX} ${endY - r} A ${r} ${r} 0 0 0 ${endX} ${endY + r}`
            } else if (side === 'right') {
                handlePath = `M ${endX} ${endY - r} A ${r} ${r} 0 0 1 ${endX} ${endY + r}`
            } else if (side === 'top') {
                handlePath = `M ${endX - r} ${endY} A ${r} ${r} 0 0 1 ${endX + r} ${endY}`
            }
        }
        
        // Update ref
        lastLineState.current = { startX, startY, cpX, cpY, endX, endY, handlePath }
    } else {
        // Use frozen state
        ({ startX, startY, cpX, cpY, endX, endY, handlePath } = lastLineState.current)
    }

    const lineElement = (
        <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', width: 1, height: 1 }}>
            <path 
              d={`M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`}
              stroke={city.color} 
              strokeWidth="2" 
              strokeDasharray="4 4"
              fill="none"
              className={popup.isClosing ? "animate-line-exit" : (isDraggingLocal ? "" : "animate-line-slow")}
            />
            <circle cx={0} cy={0} r="3" fill={city.color} />
            {!isDraggingLocal && <path d={handlePath} fill={city.color} />}
        </svg>
    )

    return (
        <>
            <Html style={{ pointerEvents: 'none', zIndex: 10 }}>
                {lineElement}
            </Html>
            <Html style={{ pointerEvents: 'none', zIndex: popup.zIndex }}>
                <div ref={wrapperRef} style={{ pointerEvents: 'auto', position: 'relative' }}>
                    <CityPopup
                        city={city}
                        popup={{ ...popup, x: localPos.x, y: localPos.y }} // Use local state
                        isConquered={isConquered}
                        isUnlocked={isUnlocked}
                        isPressed={pressedPopupState?.id === city.id}
                        bringToFront={bringToFront}
                        closePopup={onPopupClose}
                        updatePopupPosition={(id, x, y) => {
                            localPosRef.current = { x, y }
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
                        onDragMove={() => {
                            handleInteraction()
                        }}
                        onDragStart={(e) => {
                            setIsDraggingPopup(true)
                            setIsDraggingLocal(true)
                            
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
                            
                            handleInteraction()
                        }}
                        onDragEnd={() => {
                            setIsDraggingPopup(false)
                            setIsDraggingLocal(false)
                            handleInteraction()
                            // Sync to global state on drag end
                            updatePopupPosition(city.id, localPosRef.current.x, localPosRef.current.y)
                        }}
                    />
                </div>
            </Html>
        </>
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
  onZoomChange
}: GlobeProps) => {
  const controlsRef = useRef<any>(null)
  const globeRef = useRef<Group>(null)
  const [isDraggingPopup, setIsDraggingPopup] = useState(false)
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null)
  const isStandby = useRef(false)
  const lastInteractionTime = useRef(Date.now())
  const [introZoomComplete, setIntroZoomComplete] = useState(false)
  const lastReportedZoom = useRef(100)
  
  // Standby Rotation State
  const standbyRotationAxis = useRef(new Vector3(0, 1, 0))
  const standbyRotationSpeed = useRef(0.1)

  // Transparent equirectangular contour texture; the surface keeps its own shading.
  const [contourTexture, sunGlow] = useLoader(TextureLoader, ['/world_map_contours.svg', '/sun-glow.svg'])
  useEffect(() => { sunGlow.colorSpace = SRGBColorSpace }, [sunGlow])
  
  const { camera } = useThree()

  const [targetCameraPos, setTargetCameraPos] = useState<Vector3 | null>(null)
  const entryFlight = useRef<{ city: CityData; from: Vector3; up: Vector3; pin: Vector3; elapsed: number; duration: number; done: boolean } | null>(null)
  useEffect(() => {
    const city = cities.find(candidate => candidate.id === enteringCityId)
    if (!city || !globeRef.current) { entryFlight.current = null; return }
    const pin = globeRef.current.localToWorld(cityDirection(city.geoCoordinates.lat, city.geoCoordinates.lng, GLOBE_RADIUS))
    entryFlight.current = { city, from: camera.position.clone(), up: camera.up.clone(), pin, elapsed: 0, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? .15 : 1.4, done: false }
    setTargetCameraPos(null)
    isStandby.current = false
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
        
        if (angle < 0.01 && Math.abs(dist - targetDist) < 0.01) {
            camera.position.copy(targetPos)
            setTargetCameraPos(null)
        } else {
            // Slerp direction
            // We use quaternion slerp or vector lerp+normalize?
            // Vector slerp:
            // vCurrent.lerp(vTarget, alpha).normalize().multiplyScalar(interpolatedDist)
            // But lerp is linear chord.
            // For small steps it's fine if we re-normalize.
            
            const speed = 5 * delta
            const alpha = Math.min(speed, 1)
            
            // Interpolate distance separately
            const newDist = MathUtils.lerp(dist, targetDist, alpha)
            
            // Interpolate direction
            currentPos.lerp(targetPos, alpha).normalize().multiplyScalar(newDist)
            
            camera.position.copy(currentPos)
            camera.lookAt(0, 0, 0) // Always look at center
        }
        
        if (controlsRef.current) controlsRef.current.update()
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
    const hasOpenPopups = Object.keys(openPopups).length > 0
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
    
    // A city card does not stop the idle globe. Only a direct gesture, flight or
    // pin hover pauses it; a just-opened card resumes as soon as centering ends.
    const canRotate = introZoomComplete && !isDraggingPopup && !hoveredPinId && !targetCameraPos && (hasOpenPopups || timeSinceInteraction > 3000)
    if (canRotate) {
        if (!isStandby.current) {
            isStandby.current = true
            // Initialize random rotation axis and speed
            standbyRotationAxis.current.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize()
            standbyRotationSpeed.current = (0.05 + Math.random() * 0.05) * 0.7 // Reduced by 30%
        }
        
        if (globeRef.current) {
            // Rotate around random axis
            globeRef.current.rotateOnWorldAxis(standbyRotationAxis.current, standbyRotationSpeed.current * delta)
        }
    } else {
        isStandby.current = false
    }

  })

  const handleInteraction = () => {
      lastInteractionTime.current = Date.now()
      isStandby.current = false
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
            }
        }
    }
  }, [camera, zoomRef, targetCameraPos])

  // Hook up controls to interaction handler
  useEffect(() => {
    const controls = controlsRef.current
    if (controls) {
        controls.addEventListener('start', handleInteraction)
        controls.addEventListener('change', handleInteraction)
        return () => {
            controls.removeEventListener('start', handleInteraction)
            controls.removeEventListener('change', handleInteraction)
        }
    }
  }, [])

  const getSphericalCoordinates = (lat: number, lng: number, radius: number) => {
    return cityDirection(lat, lng, radius).toArray() as [number, number, number]
  }

  const handleCityClickInternal = (city: CityData) => {
       if (enteringCityId) return
       // Center the globe on the city
       if (controlsRef.current && globeRef.current) {
           const phi = (90 - city.geoCoordinates.lat) * (Math.PI / 180)
           const theta = (city.geoCoordinates.lng + 180) * (Math.PI / 180)
           
           // Target position
           const radius = 5 // Camera distance
           const x = -(radius * Math.sin(phi) * Math.cos(theta))
           const z = (radius * Math.sin(phi) * Math.sin(theta))
           const y = (radius * Math.cos(phi))
           
           // Create vector and apply current globe rotation
           const targetVec = new Vector3(x, y, z)
           targetVec.applyQuaternion(globeRef.current.quaternion)
           
           setTargetCameraPos(targetVec)
           // We don't update controls immediately, loop handles it
       }
       
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
                document.body.style.cursor = 'grabbing'
                handleInteraction()
            }}
            onPointerUp={() => {
                document.body.style.cursor = 'grab'
            }}
            onPointerOver={() => { document.body.style.cursor = 'grab' }}
            onPointerOut={() => { document.body.style.cursor = 'auto' }}
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
          <Sphere args={[GLOBE_RADIUS + .012, 64, 64]}>
             <meshStandardMaterial map={contourTexture} color="#bed3c8" emissiveMap={contourTexture} emissive="#7b9588" emissiveIntensity={.07} roughness={1} metalness={0} transparent opacity={.7} depthWrite={false} />
          </Sphere>

          {cities.map((city) => {
            const position = getSphericalCoordinates(city.geoCoordinates.lat, city.geoCoordinates.lng, GLOBE_RADIUS)
            const isOpen = !!openPopups[city.id]
            const isConquered = (conqueredCities || []).includes(city.id)
            const isUnlocked = true // All cities playable in v3.0!
            const popup = openPopups[city.id]
            const isHovered = hoveredPinId === city.id
            
            // Touch/Click handling state
            const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null)

            return (
              <group key={city.id} position={position}>
                {/* City Pin */}
                <mesh 
                    onClick={(e) => {
                        // Keep onClick for desktop/mouse standard behavior if it works
                        if (("pointerType" in e.nativeEvent ? e.nativeEvent.pointerType : "mouse") === 'mouse') {
                            e.stopPropagation()
                            handleInteraction()
                            handleCityClickInternal(city) 
                            bringToFront(city.id)
                        }
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation() // Prevent globe drag start
                        touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
                    }}
                    onPointerUp={(e) => {
                        e.stopPropagation()
                        if (touchStartRef.current) {
                            const dx = e.clientX - touchStartRef.current.x
                            const dy = e.clientY - touchStartRef.current.y
                            const dist = Math.sqrt(dx * dx + dy * dy)
                            const timeDiff = Date.now() - touchStartRef.current.time
                            
                            // Tolerance for touch "tap" (allow slight movement)
                            if (dist < 10 && timeDiff < 500) {
                                handleInteraction()
                                handleCityClickInternal(city) 
                                bringToFront(city.id)
                            }
                            touchStartRef.current = null
                        }
                    }}
                    onPointerEnter={(e) => {
                        e.stopPropagation()
                        document.body.style.cursor = 'pointer'
                        playMapSound("bd", true)
                        setHoveredPinId(city.id)
                        handleInteraction()
                    }}
                    onPointerOut={() => {
                        document.body.style.cursor = 'auto'
                        setHoveredPinId(current => current === city.id ? null : current)
                    }}
                    scale={isHovered ? [1.15, 1.15, 1.15] : [1, 1, 1]}
                >
                  <sphereGeometry args={[0.04, 16, 16]} />
                  <meshStandardMaterial 
                    color={city.color} 
                    emissive={city.color}
                    emissiveIntensity={isConquered ? 1.4 : 0.85}
                    toneMapped={false}
                    transparent
                    opacity={1}
                  />
                </mesh>
                
                {/* Glow effect */}
                <mesh scale={isHovered ? [1.725, 1.725, 1.725] : [1.5, 1.5, 1.5]}>
                    <sphereGeometry args={[0.04, 16, 16]} />
                    <meshBasicMaterial color={city.color} transparent opacity={isConquered ? 0.45 : 0.25} />
                </mesh>

                {/* Conquered Golden Aura */}
                {isConquered && (
                    <mesh scale={[2.1, 2.1, 2.1]}>
                        <sphereGeometry args={[0.04, 16, 16]} />
                        <meshBasicMaterial color="#eab308" transparent opacity={0.35} />
                    </mesh>
                )}

                {isConquered && <ConqueredFlag city={city} />}

                {/* Pulse Ring Effect (Hover/Selected) */}
                {(isOpen || isHovered) && <PulsingRing city={city} isOpen={isOpen} isHoveredProp={isHovered} />}

                {isOpen && (
                      <PopupContainer
                          city={city}
                          popup={popup}
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
                          handleInteraction={handleInteraction}
                      />
                )}
              </group>
            )
          })}
      </group>
      
      <TrackballControls 
        ref={controlsRef} 
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
        staticMoving={false} // Enable damping/inertia
        dynamicDampingFactor={0.1}
      />
    </>
  )
}

export const GlobeComponent = (props: GlobeProps) => {
    return (
        <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }} dpr={[1, 1.5]} gl={{ alpha: true, powerPreference: 'high-performance' }} className="w-full h-full">
            <Suspense fallback={null}>
                <GlobeContent {...props} />
            </Suspense>
        </Canvas>
    )
}
