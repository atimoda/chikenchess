"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { cities, type CityData } from "@/lib/cities-data"
import { getCampaignState, resetCampaign } from "@/lib/game-progression"
import { cn } from "@/lib/utils"

interface WorldMapProps {
  onCitySelect: (city: CityData) => void
}

const CITY_OFFSETS: Record<string, { dx: number; dy: number }> = {}

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
    timestamp: number
    enterX: number
    enterRot: number
  }

  const [openPopups, setOpenPopups] = useState<Record<string, PopupState>>({})
  const [nextZIndex, setNextZIndex] = useState(100)
  const [showTitle, setShowTitle] = useState(false)

  const [pressedPopupState, setPressedPopupState] = useState<{ id: string, rotation: number } | null>(null)
  const [hoveredCityId, setHoveredCityId] = useState<string | null>(null)

  // --- AUDIO LOGIC ---
  const audioContextRef = useRef<AudioContext | null>(null)
  const buffersRef = useRef<Record<string, AudioBuffer>>({})

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

  const startWhistleLoop = () => {
    const ctx = audioContextRef.current
    if (!ctx || whistleLoopRef.current) return

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
    gain.gain.linearRampToValueAtTime(0.0125, t + 0.1) // Reduced volume (50% of previous 0.025)

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
    gain.gain.linearRampToValueAtTime(0.00625, t + 0.1) // Reduced volume (25% of original)

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
          gain.gain.setValueAtTime(0.5, t)
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

  const closePopup = (cityId: string) => {
    playMapSound("d110_sh", true)
    setOpenPopups(prev => ({
      ...prev,
      [cityId]: { ...prev[cityId], isClosing: true }
    }))

    setTimeout(() => {
      setOpenPopups(prev => {
        const next = { ...prev }
        delete next[cityId]
        return next
      })
    }, 700)
  }

  const handleCityClick = (city: CityData) => {
    playMapSound("bossdr220_lt", true)
    if (openPopups[city.id] && !openPopups[city.id].isClosing) {
      bringToFront(city.id)
      return
    }

    // Play entry sound
    playMapSound("gm_reverse_cymbal", true)

    const w = typeof window !== 'undefined' ? window.innerWidth : 1024
    const h = typeof window !== 'undefined' ? window.innerHeight : 768
    
    // X: centered random distribution
    let x = (w / 2) - 150 + (Math.random() - 0.5) * (w * 0.4)
      
    // Y: random offset from bottom (concentrated near bottom)
    // Random between 50 and 350 pixels variation from a base offset
    const baseOffset = 150
    const variation = 50 + Math.random() * 300 
    let y = h - baseOffset - variation

    // Constrain to screen boundaries (assuming popup width ~300px, height ~400px)
    const popupWidth = 300
    const popupHeight = 450
    x = Math.max(20, Math.min(x, w - popupWidth - 20))
    y = Math.max(80, Math.min(y, h - popupHeight - 20)) // Top 80 to avoid header
    
    setOpenPopups(prev => ({
      ...prev,
      [city.id]: { 
        x, 
        y, 
        zIndex: nextZIndex,
        timestamp: Date.now(),
        enterX: (Math.random() - 0.5) * 400, // -200 to 200
        enterRot: (Math.random() - 0.5) * 40 // -20 to 20 deg
      }
    }))
    setNextZIndex(n => n + 1)
  }

  const [isMobile, setIsMobile] = useState(false)
  const [isIntro, setIsIntro] = useState(true)

  // Initial Zoom Animation
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const t1 = setTimeout(() => setScale(window.innerWidth < 768 ? 1.2 : 1.44), 100)
    const t2 = setTimeout(() => setTransitionDuration(75), 3400)
    const t3 = setTimeout(() => setShowTitle(true), 3000)
    const t4 = setTimeout(() => setIsIntro(false), 100)
    
    return () => { 
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Load campaign state
  useEffect(() => {
    const state = getCampaignState()
    setUnlockedCities(state.unlockedCityIds)
  }, [])

  // Mouse event handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setTransitionDuration(0) // Remove easing for instant drag response
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
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
    setTransitionDuration(300) // Restore smoothing
  }

  // Wheel handler for zooming with mouse focus
  const handleWheel = (e: React.WheelEvent) => {
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
        let hasChanges = false

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

  const updatePopupPosition = (cityId: string, x: number, y: number) => {
    setOpenPopups(prev => ({
      ...prev,
      [cityId]: { ...prev[cityId], x, y }
    }))

    // Audio Feedback for dragging
    if (whistleLoopRef.current && typeof window !== 'undefined') {
        const { osc, panner } = whistleLoopRef.current
        const w = window.innerWidth
        const h = window.innerHeight
        
        // Pan: Left (-1) to Right (1)
        const panVal = Math.max(-1, Math.min(1, (x / w) * 2 - 1))
        panner.pan.setTargetAtTime(panVal, audioContextRef.current!.currentTime, 0.1)

        // Pitch: Top (+3 tones) to Bottom (-3 tones)
        // +3 tones = +6 semitones, -3 tones = -6 semitones
        // y=0 -> +6 semitones
        // y=h -> -6 semitones
        const semitones = 6 - 12 * (y / h)
        const baseFreq = 300
        const freq = baseFreq * Math.pow(2, semitones / 12)
        
        osc.frequency.setTargetAtTime(freq, audioContextRef.current!.currentTime, 0.1)
    }
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
          animation: drawLineReverse 0.3s ease-in forwards;
        }
        @keyframes popupEnter {
          0% { opacity: 0; transform: perspective(1000px) rotateX(10deg) translate(var(--enter-x), 100vh) rotate(var(--enter-rot)) scale(0.5); }
          60% { opacity: 1; transform: perspective(1000px) rotateX(-5deg) translate(0, -20px) rotate(0) scale(1.05); }
          80% { transform: perspective(1000px) rotateX(2deg) translate(0, 5px) scale(0.98); }
          100% { opacity: 1; transform: perspective(1000px) rotateX(0) translate(0, 0) rotate(0) scale(1); }
        }
        @keyframes popupExit {
          0% { opacity: 1; transform: translateY(0) rotate(0); }
          100% { opacity: 1; transform: translateY(100vh) rotate(15deg); }
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
          animation: popupExit 0.64s cubic-bezier(0.8, 0, 1, 0.5) forwards;
        }
        @keyframes contentFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-content-1 { opacity: 0; animation: contentFade 0.5s ease-out 0.5s forwards; }
        .animate-content-2 { opacity: 0; animation: contentFade 0.5s ease-out 0.6s forwards; }
        .animate-content-3 { opacity: 0; animation: contentFade 0.5s ease-out 0.7s forwards; }
        .animate-content-4 { opacity: 0; animation: contentFade 0.5s ease-out 0.8s forwards; }
      `}</style>

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)",
          backgroundSize: "5% 10%",
        }}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-20 flex flex-col md:flex-row items-center md:justify-between px-8 py-6 pointer-events-none gap-2">
        {/* Placeholder for layout */}
        <div className="hidden md:block w-[280px] h-10" />

        <div className="flex items-center gap-4 pointer-events-none transition-all duration-1000 ease-out z-50"
             style={{
                position: 'absolute',
                top: '24px',
                left: isMobile ? '50%' : '32px',
                transform: isIntro 
                  ? (isMobile ? 'translate(-150%, 0)' : 'translate(-150%, 0)') 
                  : (isMobile 
                      ? `translateX(-50%) ${scale >= 2.8 ? 'scale(0.5)' : 'scale(1)'}` 
                      : 'none'),
                transformOrigin: 'top center',
                opacity: isIntro ? 0 : 1,
             }}
        >
          <div className="flex items-center gap-2">
            <img 
              src="/images/logo-chikenchess-border-darker.png" 
              alt="ChiKenChess Logo" 
              className="w-[80vw] max-w-[200px] md:w-10 md:h-10 md:max-w-none object-contain pointer-events-none transition-transform duration-1000"
              style={{
                 transform: (!isIntro && !isMobile) ? 'scaleX(-1)' : 'scaleX(1)'
              }}
            />
            <h1 
              className={cn(
                "hidden md:block text-[33px] font-mono font-bold tracking-wider text-foreground transition-opacity duration-1000",
                (isMobile && scale >= 2.8) && "absolute left-full ml-2 w-max animate-content-1"
              )}
              style={{ 
                textShadow: "rgb(0, 0, 0) 0px 3px 1px, rgb(0, 0, 0) 3px 3px 0px, rgb(0, 0, 0) 3px 3px 0px, rgb(0, 0, 0) -3px -3px 0px, rgb(0, 0, 0) 0px 0px 0px"
              }}
            >
              ChiKen<span className="text-primary">Chess</span>
            </h1>
          </div>
        </div>
        
        <div 
          className="font-mono font-bold text-xl text-white uppercase tracking-widest transition-opacity duration-500 text-center md:text-right"
          style={{ 
            textShadow: "2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            opacity: (showTitle && scale <= (typeof window !== 'undefined' && window.innerWidth >= 768 ? 1.5 : 1.33)) ? 1 : 0,
            position: isMobile ? 'absolute' : 'relative',
            top: isMobile ? '220px' : 'auto',
            left: isMobile ? '50%' : 'auto',
            transform: isMobile ? 'translateX(-50%)' : 'none',
            width: isMobile ? '100%' : 'auto',
            zIndex: 10
          }}
        >
          Select your stage
        </div>
      </header>

      {/* Map Container */}
      <div 
        className="absolute inset-0 flex items-center justify-center p-0 overflow-hidden z-10 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
          {/* World Map SVG Background */}
          <img
            src="/world_map_tech.svg"
            alt="World Map"
            className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none opacity-50"
            draggable={false}
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
                  handleCityClick(city);
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

      {/* UI OVERLAY LAYER - Fixed elements that don't scale */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        
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

             const isPressed = pressedPopupState?.id === cityId
             const endX = popup.x + 144
             const endY = popup.y + (isPressed ? 10 : 0)
             
             // Organic curve calculation (Quadratic Bezier)
             const dist = Math.sqrt(Math.pow(endX - start.x, 2) + Math.pow(endY - start.y, 2))
             const arcHeight = Math.min(50, dist * 0.2)
             const midX = (start.x + endX) / 2
             const midY = (start.y + endY) / 2
             const cpX = midX
             const cpY = midY + arcHeight * 0.5

             return (
               <g key={`line-${cityId}-${popup.timestamp || 0}`}>
                 <path 
                   d={`M ${start.x} ${start.y} Q ${cpX} ${cpY} ${endX} ${endY}`}
                   stroke={city.color} 
                   strokeWidth="2" 
                   strokeDasharray="4 4"
                   fill="none"
                   className={cn("opacity-80", popup.isClosing ? "animate-line-exit" : "animate-line")}
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
            <div 
              key={cityId} 
              className={cn(
                "absolute w-72 pointer-events-auto flex flex-col",
                popup.isClosing ? "animate-popup-exit" : "animate-popup"
              )}
              style={{ 
                left: popup.x, 
                top: popup.y, 
                zIndex: popup.zIndex,
                // @ts-ignore
                '--enter-x': `${popup.enterX || 0}px`,
                // @ts-ignore
                '--enter-rot': `${popup.enterRot || 0}deg`
              }}
              onMouseDown={() => bringToFront(cityId)}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="relative p-5 rounded-lg border bg-card/95 backdrop-blur-md shadow-2xl transition-all"
                style={{
                  boxShadow: isUnlocked ? `0 0 40px ${city.color}20` : 'none',
                  borderColor: isUnlocked ? city.color : '#444',
                  backgroundColor: !isUnlocked ? `color-mix(in srgb, ${city.color}, black 95%)` : undefined,
                  transform: isPressed ? `scale(0.9) rotate(${rotation}deg)` : 'scale(1) rotate(0deg)',
                  transition: isPressed ? 'transform 0.2s ease-out' : 'transform 0.1s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                }}
              >
                {/* Close Button */}
                <button 
                  className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-background border rounded-full flex items-center justify-center text-muted-foreground transition-all z-50 shadow-md group hover:cursor-pointer hover:text-black"
                  style={{ borderColor: city.color }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = city.color;
                    playMapSound("kr55_hh");
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}
                  onClick={(e) => { e.stopPropagation(); closePopup(cityId); }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={cn("transition-transform duration-500", popup.isClosing && "rotate-180")}
                  >
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>

                {/* Decorative Header Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" style={{ backgroundColor: city.color }} />
                
                {/* City Image (Draggable Handle) */}
                <div 
                  className="w-full h-32 mb-4 rounded-md overflow-hidden relative animate-content-1 cursor-grab active:cursor-grabbing group"
                  onMouseDown={(e) => {
                     e.stopPropagation()
                     bringToFront(cityId)
                     startWhistleLoop()
                     const rot = (Math.random() * 6) - 3
                     setPressedPopupState({ id: cityId, rotation: rot })
                     const startX = e.clientX
                     const startY = e.clientY
                     const startLeft = popup.x
                     const startTop = popup.y
                     
                     const onMove = (mv: MouseEvent) => {
                       updatePopupPosition(cityId, startLeft + (mv.clientX - startX), startTop + (mv.clientY - startY))
                     }
                     const onUp = () => {
                       stopWhistleLoop()
                       setPressedPopupState(null)
                       window.removeEventListener('mousemove', onMove)
                       window.removeEventListener('mouseup', onUp)
                     }
                     window.addEventListener('mousemove', onMove)
                     window.addEventListener('mouseup', onUp)
                  }}
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
                        className="px-3 py-1.5 rounded border transition-all cursor-pointer" 
                        style={{ borderColor: city.color, color: city.color }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.boxShadow = `0 0 15px ${city.color}`;
                            startPadSound();
                        }}
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            updatePadSound(e.clientX - rect.left, rect.width);
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = city.color;
                            e.currentTarget.style.boxShadow = 'none';
                            stopPadSound();
                        }}
                        onClick={() => {
                          stopPadSound();
                          playMapSound("tubularbells2", true);
                          onCitySelect(city);
                        }}
                      >
                        ENTER ARENA
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
            </div>
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
        <div className="hidden md:flex absolute bottom-4 right-4 items-center gap-4 pointer-events-auto z-50 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-mono text-muted-foreground">v0.2.3 "World Map Popups"</span>
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
