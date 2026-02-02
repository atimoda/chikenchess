"use client"

import { useState, useEffect, useRef } from "react"
import { cities, type CityData } from "@/lib/cities-data"
import { getCampaignState, resetCampaign } from "@/lib/game-progression"
import { cn } from "@/lib/utils"
import { Draggable } from "@/components/ui/draggable"

interface CityPopupProps {
  city: CityData
  popup: {
    x: number
    y: number
    zIndex: number
    isClosing?: boolean
    isFalling?: boolean
    enterX: number
    enterRot: number
  }
  isUnlocked: boolean
  isPressed: boolean
  rotation: number
  bringToFront: (id: string) => void
  closePopup: (id: string) => void
  updatePopupPosition: (id: string, x: number, y: number) => void
  playMapSound: (type: string, forceResume?: boolean) => void
  startWhistleLoop: () => void
  stopWhistleLoop: () => void
  setPressedPopupState: (state: { id: string, rotation: number } | null) => void
  onCitySelect: (city: CityData) => void
  handleSmartPadSound: (e: React.MouseEvent<HTMLButtonElement>) => void
  handleSmartPadLeave: (e: React.MouseEvent<HTMLButtonElement>) => void
  stopPadSound: () => void
  isEntering: boolean
  onEnter: () => void
  scale: number
  onDragMove: () => void
}

const CityPopup = ({
  city,
  popup,
  isUnlocked,
  isPressed,
  rotation,
  bringToFront,
  closePopup,
  updatePopupPosition,
  playMapSound,
  startWhistleLoop,
  stopWhistleLoop,
  setPressedPopupState,
  onCitySelect,
  handleSmartPadSound,
  handleSmartPadLeave,
  stopPadSound,
  isEntering,
  onEnter,
  scale,
  onDragMove
}: CityPopupProps) => {
  const dragHandleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    console.log('CityPopup mounted', { 
        cityId: city.id, 
        dragHandleRef: dragHandleRef.current,
        popupX: popup.x,
        popupY: popup.y
    })
  }, [city.id])

  return (
    <Draggable
      position={{ x: popup.x, y: popup.y }}
      scale={scale}
      onDrag={(pos) => {
        updatePopupPosition(city.id, pos.x, pos.y)
        onDragMove()
      }}
      onDragStart={() => {
        bringToFront(city.id)
        startWhistleLoop()
        const rot = (Math.random() * 6) - 3
        setPressedPopupState({ id: city.id, rotation: rot })
      }}
      onDragEnd={() => {
        stopWhistleLoop()
        setPressedPopupState(null)
        stopPadSound()
      }}
      handleRef={dragHandleRef}
      className={cn(
        "absolute w-72 pointer-events-auto flex flex-col select-none",
        popup.isClosing ? "animate-popup-exit" : "animate-popup"
      )}
      style={{
        zIndex: popup.zIndex,
        // @ts-expect-error - CSS custom property for popup enter offset
        '--enter-x': `${popup.enterX || 0}px`,
        // @ts-expect-error - CSS custom property for popup enter rotation
        '--enter-rot': `${popup.enterRot || 0}deg`
      }}
      onMouseDown={() => {
        console.log('CityPopup wrapper onMouseDown')
        bringToFront(city.id)
      }}
    >
      <div
        className="relative p-5 rounded-lg border bg-card/80 backdrop-blur-md shadow-2xl transition-all"
        onClick={(e) => {
            console.log('CityPopup inner div onClick')
            e.stopPropagation()
        }}
        onMouseDownCapture={(e) => {
            console.log('CityPopup inner div onMouseDownCapture', e.target)
        }}
        style={{
          boxShadow: isUnlocked ? `0 0 40px ${city.color}20` : 'none',
          borderColor: isUnlocked ? city.color : '#444',
          backgroundColor: !isUnlocked ? `color-mix(in srgb, color-mix(in srgb, ${city.color}, black 95%) 80%, transparent)` : undefined,
          transform: popup.isClosing 
            ? undefined 
            : (isPressed ? `scale(0.9) rotate(${rotation}deg)` : 'scale(1) rotate(0deg)'),
          transformOrigin: popup.isClosing 
            ? '0px 3px'
            : (isPressed ? '0px 40px' : 'center center'),
          transition: popup.isClosing 
            ? undefined 
            : (isPressed ? 'transform 0.2s ease-out' : 'transform 0.1s cubic-bezier(0.68, -0.55, 0.265, 1.55)')
        }}
      >
        {/* Close Button */}
        <button 
          className="absolute w-8 h-8 bg-background border rounded-full flex items-center justify-center text-muted-foreground transition-all z-50 shadow-md group hover:cursor-pointer hover:text-black"
          style={{ borderColor: city.color, top: -13, left: -16 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = city.color;
            playMapSound("kr55_hh");
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '';
          }}
          onClick={(e) => { 
            e.stopPropagation(); 
            playMapSound("alesissr16_oh");
            closePopup(city.id); 
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={cn("transition-transform duration-500 ease-out", popup.isClosing && "rotate-180")}
          >
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>

        {/* Drag Handle */}
        <button
          ref={dragHandleRef}
          type="button"
          data-drag-handle="true"
          className="absolute w-8 h-8 bg-background border rounded-full flex items-center justify-center text-muted-foreground shadow-md cursor-grab active:cursor-grabbing z-50 pointer-events-auto transition-colors hover:text-black"
          style={{ 
            borderColor: city.color, 
            top: 24, 
            left: -16,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = city.color
            playMapSound("bd", true)
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = ''
          }}
        >
          <div className="flex flex-col gap-[2px] pointer-events-none">
            <span className="w-4 h-px bg-current" />
            <span className="w-4 h-px bg-current" />
            <span className="w-4 h-px bg-current" />
          </div>
        </button>

        {/* Decorative Header Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" style={{ backgroundColor: city.color }} />
        
        {/* City Image */}
        <div 
          data-drag-handle="true"
          className="w-full h-32 mb-4 rounded-md overflow-hidden relative animate-content-1 group cursor-grab active:cursor-grabbing"
        >
          <img 
            src={city.image} 
            alt={`City of ${city.name}`} 
            className={cn(
              "w-full h-full object-cover pointer-events-none",
              !isUnlocked && "grayscale"
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          
        </div>

        <div className="flex items-center justify-between mb-3 animate-content-2">
          <h3 className="font-mono font-bold text-xl tracking-wide" style={{ color: isUnlocked ? city.color : '#aaa' }}>
            {city.name}
          </h3>
          <span className="text-xs text-muted-foreground font-mono border border-border px-1.5 py-0.5 rounded">{city.year}</span>
        </div>
        
        <div className="mb-4 animate-content-3">
          <p className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider">{city.genre}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{city.description}</p>
        </div>

        {isUnlocked ? (
          <div className="space-y-3 animate-content-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">
                TARGET BPM: <span style={{ color: city.color }}>{city.bpm}</span>
              </span>
              <button 
                className={cn(
                   "px-3 py-1.5 rounded border transition-all cursor-pointer relative z-[100] overflow-hidden group",
                   isEntering && "pointer-events-none"
                )}
                style={{ 
                    borderColor: city.color, 
                    color: city.color,
                    transform: isEntering ? 'scale(20)' : 'scale(1)', 
                    opacity: isEntering ? 0 : 1,
                    transition: 'transform 1.5s cubic-bezier(0.5, 0, 1, 1), opacity 1.4s ease-in 0.1s'
                }}
                onMouseEnter={(e) => {
                    if (isEntering) return
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.boxShadow = `0 0 15px ${city.color}`;
                    handleSmartPadSound(e)
                }}
                onMouseMove={(e) => {
                    if (isEntering) return
                    handleSmartPadSound(e)
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const y = e.clientY - rect.top
                    const centerX = rect.width / 2
                    const centerY = rect.height / 2
                    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI)
                    // Offset the rotation so it aligns with mouse direction if needed
                    e.currentTarget.style.setProperty('--mouse-angle', `${angle}deg`)
                    e.currentTarget.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`)
                    e.currentTarget.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`)
                }}
                onMouseLeave={(e) => {
                    if (isEntering) return
                    handleSmartPadLeave(e)
                    // Re-apply city color (handleSmartPadLeave clears it)
                    e.currentTarget.style.color = city.color;
                }}
                onClick={() => {
                  stopPadSound();
                  if (isEntering) return;
                  playMapSound("suction", true);
                  onEnter();
                  setTimeout(() => {
                     onCitySelect(city);
                  }, 1500);
                }}
              >
                <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mix-blend-screen overflow-hidden rounded-sm"
                    style={{ animation: "hue-rotate 3s linear infinite" }}
                >
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${city.color}, transparent 60%)`,
                            filter: "hue-rotate(calc(var(--mouse-angle, 0deg)))",
                        }}
                    />
                </div>
                <span className="relative z-10">ENTER BOARD</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-xs font-mono p-3 bg-neutral-900/50 rounded border border-dashed border-neutral-700 text-neutral-400 animate-content-4 cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            <span>LOCATION LOCKED</span>
          </div>
        )}
      </div>
    </Draggable>
  )
}



interface WorldMapProps {
  onCitySelect: (city: CityData) => void
}

// Helper to convert lat/long to x/y percentages (Equirectangular projection)
const getCityPosition = (city: CityData) => {
  // Always prefer manual coordinates from the visual editor
  return { x: city.coordinates.x, y: city.coordinates.y }
}

export function WorldMap({ onCitySelect }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const [unlockedCities, setUnlockedCities] = useState<string[]>([])

  // Zoom and Pan state
  const [scale, setScale] = useState(0.01)
  const [transitionDuration, setTransitionDuration] = useState(3300)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  interface PopupState {
    x: number
    y: number
    zIndex: number
    isClosing?: boolean
    isFalling?: boolean
    timestamp: number
    enterX: number
    enterRot: number
  }

  const [openPopups, setOpenPopups] = useState<Record<string, PopupState>>({})
  const [nextZIndex, setNextZIndex] = useState(100)
  const [showTitle, setShowTitle] = useState(false)
  const [isLogoCentered, setIsLogoCentered] = useState(true)
  const [introHeadlineVisible, setIntroHeadlineVisible] = useState(true)
  const [mapInteractionLocked, setMapInteractionLocked] = useState(true)

  const [pressedPopupState, setPressedPopupState] = useState<{ id: string, rotation: number } | null>(null)
  const [hoveredCityId, setHoveredCityId] = useState<string | null>(null)
  const [enteringCityId, setEnteringCityId] = useState<string | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const padSoundTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // --- AUDIO LOGIC ---
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    // Initialize AudioContext
    const initAudio = async () => {
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext
            if (!Ctx) return
            const ctx = new Ctx()
            audioContextRef.current = ctx
        } catch (e) {
            console.error("Audio init failed", e)
        }
    }
    initAudio()
    
    return () => {
        audioContextRef.current?.close()
    }
  }, [])

  // Audio refs for looping sounds
  const whistleLoopRef = useRef<{ osc: OscillatorNode, gain: GainNode, panner: StereoPannerNode, lfo: OscillatorNode } | null>(null)
  const padSoundRef = useRef<{ osc1: OscillatorNode, osc2: OscillatorNode, gain: GainNode, filter: BiquadFilterNode } | null>(null)

  const whistleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startWhistleLoop = () => {
    const ctx = audioContextRef.current
    if (!ctx) return
    // If already playing, just clear timeout
    if (whistleLoopRef.current) {
        if (whistleTimeoutRef.current) {
            clearTimeout(whistleTimeoutRef.current)
            whistleTimeoutRef.current = null
        }
        return
    }

    if (ctx.state === "suspended") ctx.resume()

    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const panner = ctx.createStereoPanner()
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()

    // Whistle FX: Sine wave with vibrato
    osc.type = "sine"
    osc.frequency.value = 75 // Lower pitch (approx 2 octaves down from 300)

    lfo.type = "sine"
    lfo.frequency.value = 6 // Vibrato speed
    lfoGain.gain.value = 15 // Vibrato depth

    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)

    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.01255, t + 0.1) // Reduced volume

    osc.connect(gain)
    gain.connect(panner)
    panner.connect(ctx.destination)

    osc.start(t)
    lfo.start(t)

    whistleLoopRef.current = { osc, gain, panner, lfo }
  }

  const stopWhistleLoop = () => {
    const ctx = audioContextRef.current
    if (!ctx || !whistleLoopRef.current) return
    
    const { osc, gain, lfo } = whistleLoopRef.current
    const t = ctx.currentTime
    
    // Fade out
    gain.gain.cancelScheduledValues(t)
    gain.gain.setValueAtTime(gain.gain.value, t)
    gain.gain.linearRampToValueAtTime(0, t + 0.1)
    
    osc.stop(t + 0.1)
    lfo.stop(t + 0.1)
    
    whistleLoopRef.current = null
    if (whistleTimeoutRef.current) {
        clearTimeout(whistleTimeoutRef.current)
        whistleTimeoutRef.current = null
    }
  }

  const startPadSound = () => {
    const ctx = audioContextRef.current
    if (!ctx || padSoundRef.current) return
    if (ctx.state === "suspended") ctx.resume()

    const t = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc1.type = "sawtooth"
    osc2.type = "square"
    osc2.detune.value = 10 

    filter.type = "lowpass"
    filter.Q.value = 5
    filter.frequency.value = 2000 // Initial cutoff

    osc1.frequency.value = 400
    osc2.frequency.value = 400

    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.0029, t + 0.1) // Reduced volume (25% of original) + 40% boost

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(t)
    osc2.start(t)

    padSoundRef.current = { osc1, osc2, gain, filter }
  }

  const updatePadSound = (x: number, width: number) => {
    const ctx = audioContextRef.current
    if (!ctx || !padSoundRef.current) return
    
    const ratio = Math.max(0, Math.min(1, x / width))
    // Pitch: 200Hz to 600Hz
    const freq = 200 + ratio * 400 
    // Filter: 500Hz to 4500Hz
    const cutoff = 500 + ratio * 4000

    const { osc1, osc2, filter } = padSoundRef.current
    const t = ctx.currentTime
    
    osc1.frequency.setTargetAtTime(freq, t, 0.1)
    osc2.frequency.setTargetAtTime(freq * 1.01, t, 0.1)
    filter.frequency.setTargetAtTime(cutoff, t, 0.1)
  }

  const stopPadSound = () => {
    const ctx = audioContextRef.current
    if (!ctx || !padSoundRef.current) return

    const { osc1, osc2, gain } = padSoundRef.current
    const t = ctx.currentTime

    gain.gain.cancelScheduledValues(t)
    gain.gain.setValueAtTime(gain.gain.value, t)
    gain.gain.linearRampToValueAtTime(0, t + 0.2)

    osc1.stop(t + 0.2)
    osc2.stop(t + 0.2)
    
    padSoundRef.current = null
  }

  const handleSmartPadSound = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (padSoundTimeoutRef.current) {
        clearTimeout(padSoundTimeoutRef.current)
        padSoundTimeoutRef.current = null
    }

    if (!padSoundRef.current) {
        startPadSound()
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    updatePadSound(x, rect.width)
    
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`)
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`)

    // Calculate hue rotation based on mouse position (angle from center)
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI)
    e.currentTarget.style.setProperty('--hue-rotation', `${angle}deg`)

    padSoundTimeoutRef.current = setTimeout(() => {
        stopPadSound()
    }, 100)
}

  const handleSmartPadLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (padSoundTimeoutRef.current) {
          clearTimeout(padSoundTimeoutRef.current)
          padSoundTimeoutRef.current = null
      }
      stopPadSound()
      e.currentTarget.style.color = '';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.backgroundColor = '';
  }

  const playMapSound = (type: string, forceResume = false) => {
      const ctx = audioContextRef.current
      if (!ctx) return

      if (ctx.state === "suspended") {
          if (forceResume) {
              ctx.resume().catch(() => {})
          } else {
              return
          }
      }
      
      const t = ctx.currentTime
      // Pitch variation: +/- 10%
      const pitchVar = 0.9 + Math.random() * 0.2

      if (type === "bd") {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.frequency.setValueAtTime(150 * pitchVar, t)
          osc.frequency.exponentialRampToValueAtTime(40 * pitchVar, t + 0.1)
          gain.gain.setValueAtTime(0.15, t)
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(t)
          osc.stop(t + 0.1)
      } else if (type === "bossdr220_lt") {
          // Low Tom
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.frequency.setValueAtTime(200 * pitchVar, t)
          osc.frequency.exponentialRampToValueAtTime(50 * pitchVar, t + 0.2)
          gain.gain.setValueAtTime(0.6, t)
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(t)
          osc.stop(t + 0.2)
      } else if (type === "trainwhistle") {
          // Train whistle
          const osc1 = ctx.createOscillator()
          const osc2 = ctx.createOscillator()
          const gain = ctx.createGain()
          
          osc1.type = "triangle"
          osc2.type = "triangle"
          
          osc1.frequency.value = 800 * pitchVar
          osc2.frequency.value = 950 * pitchVar 

          osc1.connect(gain)
          osc2.connect(gain)
          
          gain.gain.setValueAtTime(0, t)
          gain.gain.linearRampToValueAtTime(0.2, t + 0.1)
          gain.gain.linearRampToValueAtTime(0, t + 0.6)
          
          gain.connect(ctx.destination)
          
          osc1.start(t)
          osc2.start(t)
          osc1.stop(t + 0.6)
          osc2.stop(t + 0.6)
      } else if (type === "tubularbells2") {
          // FM Bell
          const carrier = ctx.createOscillator()
          const modulator = ctx.createOscillator()
          const modGain = ctx.createGain()
          const masterGain = ctx.createGain()

          const freq = 523.25 * pitchVar // C5
          carrier.frequency.value = freq
          modulator.frequency.value = freq * 1.414 

          modGain.gain.value = 1000 
          modGain.gain.exponentialRampToValueAtTime(1, t + 1.5)

          modulator.connect(modGain)
          modGain.connect(carrier.frequency)

          masterGain.gain.setValueAtTime(0, t)
          masterGain.gain.linearRampToValueAtTime(0.3, t + 0.02)
          masterGain.gain.exponentialRampToValueAtTime(0.01, t + 2.0)

          carrier.connect(masterGain)
          masterGain.connect(ctx.destination)

          carrier.start(t)
          modulator.start(t)
          carrier.stop(t + 2.0)
          modulator.stop(t + 2.0)
      } else if (type === "d110_sh") {
          // Roland D-110 Shaker style (Noise burst)
          const bufferSize = ctx.sampleRate * 0.1 // 100ms
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const data = buffer.getChannelData(0)
          
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2)) // Decay
          }
          
          const source = ctx.createBufferSource()
          source.buffer = buffer
          
          const filter = ctx.createBiquadFilter()
          filter.type = "highpass"
          filter.frequency.value = 6000
          
          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.3, t)
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1)
          
          source.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          
          source.start(t)
      } else if (type === "d110_sh_low") {
          const bufferSize = ctx.sampleRate * 0.1
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const data = buffer.getChannelData(0)
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2))
          }

          const source = ctx.createBufferSource()
          source.buffer = buffer

          const filter = ctx.createBiquadFilter()
          filter.type = "highpass"
          filter.frequency.value = 4000

          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.3, t)
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1)

          source.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)

          source.start(t)
      } else if (type === "kr55_hh") {
          // Hi-hat
          const bufferSize = ctx.sampleRate * 0.1
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const data = buffer.getChannelData(0)
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
          
          const noise = ctx.createBufferSource()
          noise.buffer = buffer
          
          const filter = ctx.createBiquadFilter()
          filter.type = "highpass"
          filter.frequency.value = 8000 * pitchVar

          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.2, t)
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05)

          noise.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          
          noise.start(t)
      } else if (type === "kr55_hh_low") {
          const bufferSize = ctx.sampleRate * 0.1
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const data = buffer.getChannelData(0)
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
          
          const noise = ctx.createBufferSource()
          noise.buffer = buffer
          
          const filter = ctx.createBiquadFilter()
          filter.type = "highpass"
          filter.frequency.value = 6000 * pitchVar

          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.2, t)
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05)

          noise.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          
          noise.start(t)
      } else if (type === "gm_reverse_cymbal") {
          // Reverse cymbal
          const dur = 1.0
          const bufferSize = ctx.sampleRate * dur
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const data = buffer.getChannelData(0)
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
          
          const noise = ctx.createBufferSource()
          noise.buffer = buffer
          
          const filter = ctx.createBiquadFilter()
          filter.type = "bandpass"
          filter.frequency.value = 4000 * pitchVar
          filter.Q.value = 1

          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.005, t)
          gain.gain.exponentialRampToValueAtTime(0.1, t + dur - 0.1)
          gain.gain.linearRampToValueAtTime(0, t + dur)

          noise.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          
          noise.start(t)
      } else if (type === "suction") {
          // Reverse suction effect
          const dur = 1.5
          const bufferSize = ctx.sampleRate * dur
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const data = buffer.getChannelData(0)
          // Pink/White noise with increasing amplitude
          for (let i = 0; i < bufferSize; i++) {
              data[i] = (Math.random() * 2 - 1) * Math.pow((i / bufferSize), 2)
          }
          
          const noise = ctx.createBufferSource()
          noise.buffer = buffer
          
          const filter = ctx.createBiquadFilter()
          filter.type = "lowpass"
          filter.frequency.setValueAtTime(100, t)
          filter.frequency.exponentialRampToValueAtTime(8000, t + dur)
          filter.Q.value = 5

          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0, t)
          gain.gain.linearRampToValueAtTime(0.196, t + dur - 0.1)
          gain.gain.linearRampToValueAtTime(0, t + dur)

          noise.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          
          noise.start(t)
      } else if (type === "alesissr16_oh") {
          // Alesis SR-16 Open Hi-Hat
          const bufferSize = ctx.sampleRate * 0.5
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const data = buffer.getChannelData(0)
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
          
          const noise = ctx.createBufferSource()
          noise.buffer = buffer
          
          const filter = ctx.createBiquadFilter()
          filter.type = "highpass"
          filter.frequency.value = 7000 * pitchVar

          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.3, t)
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3)

          noise.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          
          noise.start(t)
      } else {
          // Fallback / Noise for sd/cr
          const isSd = type === "sd"
          const dur = isSd ? 0.1 : 0.5
          const bufferSize = ctx.sampleRate * dur
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const data = buffer.getChannelData(0)
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
          
          const noise = ctx.createBufferSource()
          noise.buffer = buffer
          
          const noiseGain = ctx.createGain()
          noiseGain.gain.setValueAtTime(isSd ? 0.3 : 0.2, t)
          noiseGain.gain.exponentialRampToValueAtTime(0.01, t + dur)
          
          if (type === "cr") {
             // Highpass for cymbal
             const filter = ctx.createBiquadFilter()
             filter.type = "highpass"
             filter.frequency.value = 5000 * pitchVar
             noise.connect(filter)
             filter.connect(noiseGain)
          } else {
             noise.connect(noiseGain)
          }

          noiseGain.connect(ctx.destination)
          noise.start(t)
      }
  }

  const bringToFront = (cityId: string) => {
    setOpenPopups(prev => ({
      ...prev,
      [cityId]: { ...prev[cityId], zIndex: nextZIndex }
    }))
    setNextZIndex(n => n + 1)
  }



  const handleCityClick = (city: CityData, e?: React.MouseEvent) => {
    // Prevent multiple rapid clicks
    if (e) {
        e.stopPropagation()
        e.preventDefault()
    }
    
    playMapSound("bossdr220_lt", true)
    
    if (openPopups[city.id] && !openPopups[city.id].isClosing) {
      bringToFront(city.id)
      return
    }

    // Play entry sound
    playMapSound("gm_reverse_cymbal", true)

    const w = typeof window !== 'undefined' ? window.innerWidth : 1024
    const h = typeof window !== 'undefined' ? window.innerHeight : 768
    const popupWidth = 300
    const popupHeight = 450
    
    // Y Position: Bottom of screen with random variation (10-50px from lowest position)
    const bottomPadding = 40
    const maxTop = h - popupHeight - bottomPadding 
    const yVariation = 10 + Math.random() * 40
    let y = maxTop - yVariation

    // X Position
    let x: number
    
    if (e && !isMobile) {
        // Desktop: Position relative to click (Pin) to ensure line visibility
        const pinX = e.clientX
        const minGap = 100 // Minimum space between pin and popup
        
        if (pinX < w / 2) {
             // Pin is left -> Popup Right
             x = pinX + minGap
        } else {
             // Pin is right -> Popup Left
             x = pinX - popupWidth - minGap
        }
        
        // Add slight randomness to X (±20px)
        x += (Math.random() - 0.5) * 40
        
    } else {
        // Mobile or no event: Centered random
        x = (w / 2) - (popupWidth / 2) + (Math.random() - 0.5) * (w * 0.2)
    }

    // Constraints
    x = Math.max(20, Math.min(x, w - popupWidth - 20))
    y = Math.max(80, Math.min(y, h - popupHeight - 20))
    
    // Final check before state update
    setOpenPopups(prev => {
        if (prev[city.id] && !prev[city.id].isClosing) return prev
        return {
          ...prev,
          [city.id]: { 
            x, 
            y, 
            zIndex: nextZIndex,
            timestamp: Date.now(),
            enterX: (Math.random() - 0.5) * 400, // -200 to 200
            enterRot: (Math.random() - 0.5) * 40 // -20 to 20 deg
          }
        }
    })
    setNextZIndex(n => n + 1)
  }

  const [isMobile, setIsMobile] = useState(false)
  const [isIntro, setIsIntro] = useState(true)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)

    const tLogo = setTimeout(() => {
      setIsLogoCentered(false)
      setIsIntro(false)
    }, 3000)

    const tZoom = setTimeout(() => {
      setScale(window.innerWidth < 768 ? 1.2 : 1.44)
    }, 3200)

    const tZoomTransition = setTimeout(() => setTransitionDuration(75), 6500)
    const tShowTitle = setTimeout(() => setShowTitle(true), 7000)
    const tHeadline = setTimeout(() => setIntroHeadlineVisible(false), 6000)

    const tUnlockMap = setTimeout(() => {
      setMapInteractionLocked(false)
    }, 4000)

    return () => {
      clearTimeout(tLogo)
      clearTimeout(tZoom)
      clearTimeout(tZoomTransition)
      clearTimeout(tShowTitle)
      clearTimeout(tHeadline)
      clearTimeout(tUnlockMap)
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Load campaign state
  useEffect(() => {
    const state = getCampaignState()
    setUnlockedCities(state.unlockedCityIds)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mapInteractionLocked) return
    e.preventDefault()
    setIsDragging(true)
    setTransitionDuration(0)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    if (typeof document !== "undefined") {
      document.body.style.userSelect = "none"
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setTransitionDuration(300)
    if (typeof document !== "undefined") {
      document.body.style.userSelect = ""
    }
  }

  // Touch handlers for mobile (Pan & Pinch-to-Zoom)
  const lastTouchRef = useRef<{ x: number, y: number } | null>(null)
  const lastDistRef = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (mapInteractionLocked) return
    if (e.touches.length === 1) {
      // Pan start
      const touch = e.touches[0]
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY }
      setIsDragging(true)
      setTransitionDuration(0)
    } else if (e.touches.length === 2) {
      // Pinch start
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      lastDistRef.current = dist
      setTransitionDuration(0)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (mapInteractionLocked) return
    if (e.touches.length === 1 && lastTouchRef.current && isDragging) {
      // Pan move
      const touch = e.touches[0]
      const dx = touch.clientX - lastTouchRef.current.x
      const dy = touch.clientY - lastTouchRef.current.y
      
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY }
    } else if (e.touches.length === 2 && lastDistRef.current) {
      // Pinch zoom
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      
      // Calculate scale factor
      const scaleFactor = dist / lastDistRef.current
      
      // Calculate center of pinch
      const cx = (t1.clientX + t2.clientX) / 2
      const cy = (t1.clientY + t2.clientY) / 2
      
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      
      // Center relative to container
      const centerOffsetX = rect.width / 2
      const centerOffsetY = rect.height / 2
      const mouseX = cx - rect.left - centerOffsetX
      const mouseY = cy - rect.top - centerOffsetY

      const newScale = Math.min(Math.max(scale * scaleFactor, 0.5), 8)
      
      if (newScale !== scale) {
         const scaleRatio = newScale / scale
         const newX = mouseX - (mouseX - position.x) * scaleRatio
         const newY = mouseY - (mouseY - position.y) * scaleRatio
         
         setScale(newScale)
         setPosition({ x: newX, y: newY })
         lastDistRef.current = dist
      }
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    lastTouchRef.current = null
    lastDistRef.current = null
    setTransitionDuration(300)
  }

  // Wheel handler for zooming with mouse focus
  const handleWheel = (e: React.WheelEvent) => {
    if (mapInteractionLocked) return
    e.stopPropagation()
    if (!containerRef.current) return

    // Set short transition for responsive feel
    setTransitionDuration(50)

    // Calculate mouse position relative to container center
    const rect = containerRef.current.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    const mouseX = e.clientX - rect.left - cx
    const mouseY = e.clientY - rect.top - cy

    // Determine zoom factor
    // e.deltaY > 0 means scrolling down (zoom out)
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(scale * delta, 1), 8) // Limit zoom between 1x and 8x
    
    if (newScale === scale) return

    // Adjust position to keep mouse point stationary
    // Formula: new_pos = mouse - (mouse - old_pos) * (new_scale / old_scale)
    const scaleRatio = newScale / scale
    const newX = mouseX - (mouseX - position.x) * scaleRatio
    const newY = mouseY - (mouseY - position.y) * scaleRatio

    setScale(newScale)
    setPosition({ x: newX, y: newY })
    
    // Reset transition duration after a delay (debounce could be better but this works for single scroll)
    // Actually, keeping it low while scrolling is fine. We can reset it in a useEffect if needed, 
    // or just leave it low since we mostly pan/zoom via gestures now.
  }

  const [lineEnds, setLineEnds] = useState<Record<string, {x: number, y: number}>>({})

  // Zoom on popup open/close
  const hasOpenPopups = Object.keys(openPopups).length > 0
  
  useEffect(() => {
    if (isIntro) return

    const baseScale = isMobile ? 1.2 : 1.44
    let t: NodeJS.Timeout

    if (hasOpenPopups) {
        // Zoom out with delay
        t = setTimeout(() => {
            setTransitionDuration(800)
            setScale(baseScale * 0.85)
        }, 400)
    } else {
        // Restore immediately
        setTransitionDuration(800)
        setScale(baseScale)
    }
    return () => clearTimeout(t)
  }, [hasOpenPopups, isMobile, isIntro])

  // Continuous line update loop to handle zoom animations
  useEffect(() => {
    if (!hasOpenPopups) return

    let animationFrameId: number

    const updateLines = () => {
        if (!mapRef.current || !containerRef.current) return

        const nextEnds: Record<string, {x: number, y: number}> = {}

        Object.keys(openPopups).forEach(cityId => {
            const pinElement = document.getElementById(`city-pin-${cityId}`)
            if (pinElement && containerRef.current) {
                const pinRect = pinElement.getBoundingClientRect()
                const containerRect = containerRef.current.getBoundingClientRect()
                const newX = pinRect.left + pinRect.width / 2 - containerRect.left
                const newY = pinRect.top + pinRect.height / 2 - containerRect.top
                
                // Only update if changed significantly to avoid thrashing (though React handles equality check on state setter mostly)
                // Actually we just calculate and set. React batching is fine.
                nextEnds[cityId] = { x: newX, y: newY }
            }
        })

        // We set state every frame. This might be heavy but ensures stickiness.
        // Optimization: compare with previous values ref?
        setLineEnds(nextEnds)
        animationFrameId = requestAnimationFrame(updateLines)
    }

    updateLines()

    return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [hasOpenPopups, openPopups]) // Re-start loop if popups change structure 

  const updatePopupPosition = (id: string, x: number, y: number) => {
    setOpenPopups(prev => ({
      ...prev,
      [id]: { ...prev[id], x, y }
    }))
  }

  const closePopup = (id: string) => {
    playMapSound("alesissr16_oh", true)
    // Start closing animation (Rotate + Fall)
    setOpenPopups(prev => {
      if (!prev[id]) return prev
      return {
        ...prev,
        [id]: { ...prev[id], isClosing: true }
      }
    })

    // Remove after animation
    setTimeout(() => {
        setOpenPopups(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })
    }, 1000)

    if (pressedPopupState?.id === id) {
      setPressedPopupState(null)
    }
  }

  const handleDragMove = () => {
    if (padSoundTimeoutRef.current) {
        clearTimeout(padSoundTimeoutRef.current)
        padSoundTimeoutRef.current = null
    }

    if (!padSoundRef.current) {
        // Start sound if not playing (similar to smart pad logic but for drag)
        const ctx = audioContextRef.current
        if (!ctx) return
        if (ctx.state === "suspended") ctx.resume()

        const t = ctx.currentTime
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()
        const filter = ctx.createBiquadFilter()

        osc1.type = "sawtooth"
        osc1.frequency.value = 300
        osc2.type = "square"
        osc2.frequency.value = 303 // Detune
        
        filter.type = "lowpass"
        filter.frequency.value = 2000
        filter.Q.value = 5

        osc1.connect(filter)
        osc2.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)

        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.001, t + 0.1)

        osc1.start(t)
        osc2.start(t)

        padSoundRef.current = { osc1, osc2, gain, filter }
    } else {
        // Modulate existing sound
        const ctx = audioContextRef.current
        if (ctx) {
             const t = ctx.currentTime
             const { osc1, osc2, filter } = padSoundRef.current
             // Random modulation during drag
             osc1.frequency.setTargetAtTime(300 + Math.random() * 50, t, 0.1)
             osc2.frequency.setTargetAtTime(303 + Math.random() * 50, t, 0.1)
             filter.frequency.setTargetAtTime(2000 + Math.random() * 1000, t, 0.1)
        }
    }

    // Auto-stop timeout
    padSoundTimeoutRef.current = setTimeout(() => {
        stopPadSound()
    }, 100)
  }

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-neutral-900 overflow-hidden flex flex-col">
      <style jsx global>{`
        @keyframes drawLine {
          from { stroke-dashoffset: 4000; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes drawLineReverse {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 4000; }
        }
        .animate-line {
          stroke-dasharray: 4000;
          stroke-dashoffset: 4000;
          animation: drawLine 1.5s ease-out forwards;
        }
        .animate-line-exit {
          stroke-dasharray: 4000;
          stroke-dashoffset: 0;
          animation: drawLineReverse 0.6s ease-in forwards;
        }
        @keyframes popupEnter {
          0% { opacity: 0; transform: perspective(1000px) rotateX(10deg) translate(var(--enter-x), 100vh) rotate(var(--enter-rot)) scale(0.5); }
          60% { opacity: 1; transform: perspective(1000px) rotateX(-5deg) translate(0, -20px) rotate(0) scale(1.05); }
          80% { transform: perspective(1000px) rotateX(2deg) translate(0, 5px) scale(0.98); }
          100% { opacity: 1; transform: perspective(1000px) rotateX(0) translate(0, 0) rotate(0) scale(1); }
        }
        @keyframes popupExit {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 1; transform: translateY(120vh) rotate(45deg); }
        }
        @keyframes pulseSize {
          0% { transform: scale(1); }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }
        @keyframes pulseSizeOnce {
          0% { transform: scale(1); }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }
        .animate-popup {
          opacity: 0;
          animation: popupEnter 0.8s ease-out 0.3s forwards;
        }
        .animate-popup-exit {
          animation: popupExit 1s cubic-bezier(0.8, 0, 1, 0) forwards;
          transform-origin: 0px 3px;
        }
        @keyframes contentFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-content-1 { opacity: 0; animation: contentFade 0.5s ease-out 0.5s forwards; }
        .animate-content-2 { opacity: 0; animation: contentFade 0.5s ease-out 0.6s forwards; }
        .animate-content-3 { opacity: 0; animation: contentFade 0.5s ease-out 0.7s forwards; }
        .animate-content-4 { opacity: 0; animation: contentFade 0.5s ease-out 0.8s forwards; }
        @keyframes hue-rotate {
          from { filter: hue-rotate(0deg); }
          to { filter: hue-rotate(360deg); }
        }
      `}</style>

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)",
          backgroundSize: "5% 10%",
        }}
      />

      <header
        className="absolute top-0 left-0 w-full z-60 flex flex-col md:flex-row items-center md:justify-between px-8 py-6 pointer-events-none gap-2"
        style={{ height: isIntro ? "100vh" : "auto" }}
      >
        <div className="hidden md:block w-[280px] h-10" />


        <div
          className="flex items-center gap-4 pointer-events-none transition-all duration-1000 ease-out z-50"
          style={{
            position: "absolute",
            top: isLogoCentered ? "45%" : "24px",
            left: isLogoCentered ? "50%" : "32px",
            transform: isLogoCentered ? "translate(-50%, -50%) scale(1.15)" : "none",
            transformOrigin: "top center",
          }}
        >
          <div className="flex items-center gap-0.5">
            <img
              src="/images/logo-chikenchess-border-darker.png"
              alt="chiken'chess Logo"
              className={cn(
                "object-contain pointer-events-none transition-transform duration-1000",
                isLogoCentered ? "w-[80vw] max-w-[260px]" : "h-10 w-auto"
              )}
              style={{
                transform: isLogoCentered ? "scaleX(-1) scale(1)" : "scaleX(1)",
              }}
            />
            {!isLogoCentered && (
              <h1
                className={cn(
                  "text-xl md:text-[33px] font-mono font-bold tracking-wider text-foreground transition-all duration-700",
                  "translate-x-0 opacity-100",
                )}
                style={{
                  textShadow:
                    "rgb(0, 0, 0) 0px 3px 1px, rgb(0, 0, 0) 3px 3px 0px, rgb(0, 0, 0) 3px 3px 0px, rgb(0, 0, 0) -3px -3px 0px, rgb(0, 0, 0) 0px 0px 0px",
                }}
              >
                chicken<span className="text-primary">chess</span>
              </h1>
            )}
          </div>
        </div>

        <div className="absolute top-6 right-6 flex items-center gap-4 pointer-events-auto text-xs font-mono">
          <button
            onClick={(e) => {
                e.preventDefault()
                setShowAbout(true)
            }}
            className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4 bg-transparent border-none cursor-pointer"
          >
            About
          </button>
        </div>

        <div
          className="absolute left-1/2 -translate-x-1/2 text-center text-sm md:text-base font-mono text-white transition-opacity duration-700 pointer-events-none z-[70]"
          style={{
            opacity: introHeadlineVisible ? 1 : 0,
            bottom: isMobile ? "17rem" : "19rem",
            textShadow:
              "2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            width: isMobile ? "100%" : "min(90vw, 720px)",
            whiteSpace: isMobile ? "normal" : "nowrap",
          }}
        >
          Learn chess, compose music.
        </div>

        <div
          className="font-mono font-bold text-xl text-white uppercase tracking-widest transition-opacity duration-500 text-center"
          style={{
            textShadow:
              "2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            opacity:
              showTitle &&
              scale <= (typeof window !== "undefined" && window.innerWidth >= 768 ? 1.5 : 1.33)
                ? 1
                : 0,
            position: "absolute",
            bottom: isMobile ? "8rem" : "7rem",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            zIndex: 10,
          }}
        >
          Select your stage
        </div>
      </header>

      {/* Map Container */}
      <div 
        className="absolute inset-0 flex items-center justify-center p-0 overflow-hidden z-10 cursor-grab active:cursor-grabbing touch-none select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onClick={() => {
            if (audioContextRef.current?.state === "suspended") {
                audioContextRef.current.resume().catch(() => {})
            }
        }}
      >
        <div 
          ref={mapRef}
          className="relative w-full max-w-6xl mx-auto transition-transform ease-in-out"
          style={{ 
            aspectRatio: "201/97",
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transitionDuration: `${transitionDuration}ms`
          }}
        >
          {/* World Map SVG Background - Masked for custom color */}
          <div
            className="absolute inset-0 w-full h-full select-none pointer-events-none"
            style={{
                maskImage: `url(/world_map_tech.svg)`,
                maskRepeat: 'no-repeat',
                maskSize: '100% 100%',
                backgroundColor: '#0E6C4D',
                opacity: 1
            }}
          />

          {/* City Markers ONLY (No Popups here) */}
          {cities.map((city) => {
            const isUnlocked = unlockedCities.includes(city.id)
            const isSelected = !!openPopups[city.id]
            const pos = getCityPosition(city)

            return (
              <button
                key={city.id}
                id={`city-pin-${city.id}`}
                className={cn(
                  "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150 group focus:outline-none",
                  "cursor-pointer z-10"
                )}
                style={{
                  left: `${Math.round(pos.x * 10000) / 10000}%`,
                  top: `${Math.round(pos.y * 10000) / 10000}%`,
                  transform: `translate(-50%, -50%) scale(${1 / Math.sqrt(scale)})`
                }}
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCityClick(city, e);
                }}
                onMouseEnter={() => {
                  setHoveredCityId(city.id)
                  playMapSound("bd")
                }}
                onMouseLeave={() => setHoveredCityId(null)}
              >
                {/* Pulse ring */}
                {isUnlocked && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping pointer-events-none"
                    style={{
                      backgroundColor: city.color,
                      opacity: 0.3,
                      width: "24px",
                      height: "24px",
                      marginLeft: "-4px",
                      marginTop: "-4px",
                    }}
                  />
                )}

                {/* City dot */}
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center bg-background",
                    isSelected ? "scale-150" : "scale-100",
                  )}
                  style={{
                    borderColor: (isUnlocked || hoveredCityId === city.id || isSelected) ? city.color : "#666",
                    boxShadow: (isUnlocked || hoveredCityId === city.id || isSelected) ? `0 0 20px ${city.color}` : "none",
                    animation: isSelected 
                      ? "pulseSize 1s infinite ease-in-out" 
                      : (hoveredCityId === city.id ? "pulseSizeOnce 0.6s ease-out forwards" : "none")
                  }}
                >
                  <div 
                    className={cn("w-2 h-2 rounded-full", !(isUnlocked || hoveredCityId === city.id || isSelected) && "bg-neutral-600")}
                    style={{ backgroundColor: (isUnlocked || hoveredCityId === city.id || isSelected) ? city.color : undefined }} 
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* About Popup */}
      {showAbout && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="relative bg-card border border-border p-8 rounded-lg max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={() => setShowAbout(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>

                <h2 className="text-2xl font-mono font-bold mb-4 text-primary">About ChiKenChess</h2>
                
                <p className="text-sm text-muted-foreground mb-2 italic">Where strategy meets symphony.</p>
                <p className="text-sm text-foreground mb-6 leading-relaxed">
                    ChiKenChess reimagines the classic game by turning the board into a musical instrument. Every piece has a voice, and every move creates a melody.
                </p>

                <h3 className="text-lg font-mono font-bold mb-2 text-primary">Support Indie Development</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    This is an independent project built with love. If you enjoy the experience and want to help keep the servers running (and the developer caffeinated), consider making a donation. Every bit helps us create more features and sounds!
                </p>

                <a 
                    href="https://ko-fi.com/chickenchess" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF5E5B] text-white rounded font-bold hover:bg-[#ff4542] transition-colors"
                >
                    <span>☕</span> Buy me a Coffee
                </a>
            </div>
            
            {/* Backdrop click to close */}
            <div className="absolute inset-0 -z-10" onClick={() => setShowAbout(false)} />
        </div>
      )}

      {/* UI OVERLAY LAYER - Fixed elements that don't scale */}
      <div className="absolute inset-0 z-40 overflow-hidden pointer-events-none">
        
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <marker id="dot" markerWidth="8" markerHeight="8" refX="4" refY="4">
              <circle cx="4" cy="4" r="2" fill="var(--primary)" />
            </marker>
          </defs>
          {Object.entries(openPopups).map(([cityId, popup]) => {
            const city = cities.find(c => c.id === cityId)
            const start = lineEnds[cityId]
            if (!city || !start) return null

            const endX = popup.x
            const endY = popup.y + 40
            
            const dist = Math.sqrt(Math.pow(endX - start.x, 2) + Math.pow(endY - start.y, 2))
            const minArc = 30
            const maxArc = 260
            const t = Math.min(1, dist / 600)
            const ease = 1 - Math.pow(t, 0.7)
            const arcHeight = minArc + ease * (maxArc - minArc)
            const midX = (start.x + endX) / 2
            const midY = (start.y + endY) / 2
            const cpX = midX
            const cpY = midY + arcHeight

            return (
              <g key={`line-${cityId}-${popup.timestamp || 0}`}>
                <path 
                  d={`M ${start.x} ${start.y} Q ${cpX} ${cpY} ${endX} ${endY}`}
                  stroke={city.color} 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                  fill="none"
                  className={cn("opacity-80", popup.isFalling ? "animate-line-exit" : "animate-line")}
                />
                <circle cx={start.x} cy={start.y} r="3" fill={city.color} />
              </g>
            )
          })}
        </svg>

        {/* Popups */}
        {Object.entries(openPopups).map(([cityId, popup]) => {
          const city = cities.find(c => c.id === cityId)
          if (!city) return null
          const isUnlocked = unlockedCities.includes(city.id)
          const isPressed = pressedPopupState?.id === cityId
          const rotation = isPressed ? pressedPopupState.rotation : 0
          
          return (
            <CityPopup
              key={cityId}
              city={city}
              popup={popup}
              isUnlocked={isUnlocked}
              isPressed={isPressed}
              rotation={rotation}
              bringToFront={bringToFront}
              closePopup={closePopup}
              updatePopupPosition={updatePopupPosition}
              playMapSound={playMapSound}
              startWhistleLoop={startWhistleLoop}
              stopWhistleLoop={stopWhistleLoop}
              setPressedPopupState={setPressedPopupState}
              onCitySelect={onCitySelect}
              handleSmartPadSound={handleSmartPadSound}
              handleSmartPadLeave={handleSmartPadLeave}
              stopPadSound={stopPadSound}
              isEntering={enteringCityId === city.id}
              onEnter={() => setEnteringCityId(city.id)}
              scale={1}
              onDragMove={handleDragMove}
            />
          )
        })}

        {/* Legend (Fixed Bottom Left) */}
        <div 
          className="absolute bottom-4 left-4 p-4 rounded-lg border border-border bg-card/80 backdrop-blur-sm pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            <div className="text-xs font-mono text-muted-foreground">
              Campaign Progress: <span className="text-primary font-bold">{unlockedCities.length}</span> / {cities.length} cities unlocked
            </div>
            <div className="w-32 bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(unlockedCities.length / cities.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Zoom Controls (Fixed Bottom Right) */}
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 md:bottom-20 md:right-8 md:left-auto md:translate-x-0 flex flex-col gap-2 z-50 pointer-events-auto items-center md:items-end">
          <div className="flex flex-row md:flex-col gap-2">
            <button 
              className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:bg-accent text-xs"
              onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
            >
              R
            </button>
            <button 
              className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:bg-accent"
              onClick={() => setScale(s => Math.max(s / 1.2, 1))}
            >
              -
            </button>
            <button 
              className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:bg-accent"
              onClick={() => setScale(s => Math.min(s * 1.2, 8))}
            >
              +
            </button>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground bg-background/80 backdrop-blur px-1 rounded border border-border">
             {Math.round(scale * 100)}%
          </div>
        </div>

        {/* Bottom Right Info & Controls */}
        <div 
          className="hidden md:flex absolute bottom-4 right-4 items-center gap-4 pointer-events-auto z-50 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-mono text-muted-foreground">v0.2.5 "The Editor"</span>
          </div>

          <div className="h-4 w-px bg-border" />

          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm("Reset Campaign Progress?")) {
                resetCampaign()
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="px-3 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-white/10 border border-transparent hover:border-white/10 rounded transition-all"
          >
            RESET SAVE
          </button>
        </div>
      </div>
    </div>
  )
}
