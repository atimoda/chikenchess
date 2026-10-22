"use client"

/* global DynamicsCompressorNode */

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { cities, type CityData } from "@/lib/cities-data"
import { getPlayerProfile, type PlayerProfile } from "@/lib/game-progression"
import { cn } from "@/lib/utils"
import { GlobeComponent } from "./globe-component"
import type { PopupExitMotion } from "./city-popup"
import { CampaignCityList } from './campaign-city-list'
import { VersionChangelog } from './version-changelog'
import { OnlineHub } from './online/online-hub'
import OPENING_PHRASES from '@/data/ui/opening-phrases.json'
import { isAdminUser } from '@/lib/admin/access'
import { useOnline } from './online/online-provider'
import { AboutReleaseDialog } from './about-release-dialog'
import styles from './world-map.module.css'

import { Button } from "@/components/ui/button"
import { Plus, Minus, Maximize, Minimize } from "lucide-react"
import { useOnlineAvailability } from "@/hooks/use-online-availability"

interface WorldMapProps {
  onCitySelect: (city: CityData) => void
  onOnlineMatch?: (id: string) => void
  inviteCode?: string | null
}



export function WorldMap({ onCitySelect, onOnlineMatch, inviteCode }: WorldMapProps) {
  const online = useOnline()
  // Create lobby only appears in city popups while Supabase answers.
  const onlineAvailable = useOnlineAvailability() === "available"
  const [createRoomRequest, setCreateRoomRequest] = useState<{ id: number; cityId: string } | null>(null)
  const createRoomSequence = useRef(0)
  const [unlockedCities, setUnlockedCities] = useState<string[]>([])
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null)
  useEffect(() => {
    setPlayerProfile(online.profile?.profile ?? getPlayerProfile())
  }, [online.profile])

  interface PopupState {
    x: number
    y: number
    zIndex: number
    isClosing?: boolean
    isFalling?: boolean
    exitMotion?: PopupExitMotion
    timestamp: number
    centerOffsetY: number
    enterX: number
    enterRot: number
  }

  const [openPopups, setOpenPopups] = useState<Record<string, PopupState>>({})
  const [nextZIndex, setNextZIndex] = useState(100)
  const [showTitle, setShowTitle] = useState(false)
  const [logoPhase, setLogoPhase] = useState<'intro' | 'fading' | 'header'>('intro')
  const [introHeadlineVisible, setIntroHeadlineVisible] = useState(true)
  const [openingPhrase, setOpeningPhrase] = useState<string | null>(null)
  useEffect(() => {
    setOpeningPhrase(OPENING_PHRASES[Math.floor(Math.random() * OPENING_PHRASES.length)])
  }, [])

  const [pressedPopupState, setPressedPopupState] = useState<{ id: string } | null>(null)
  const [enteringCityId, setEnteringCityId] = useState<string | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const [aboutTab, setAboutTab] = useState<'about' | 'releases'>('about')
  const [profileTabRequested, setProfileTabRequested] = useState(false)
  const [eggLabelExpanded, setEggLabelExpanded] = useState(true)
  const eggLabelPointerHoveredRef = useRef(false)
  const eggLabelFocusedRef = useRef(false)
  const eggLabelAutoCollapsedRef = useRef(false)
  const [currentZoom, setCurrentZoom] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [focusedCityId, setFocusedCityId] = useState<string | null>(null)
  const [pinHoveredCityId, setPinHoveredCityId] = useState<string | null>(null)
  const popupLayerRef = useRef<HTMLDivElement>(null)
  const introLogoRef = useRef<HTMLDivElement>(null)

  const padSoundTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const collapseTimer = window.setTimeout(() => {
      eggLabelAutoCollapsedRef.current = true
      if (!eggLabelPointerHoveredRef.current && !eggLabelFocusedRef.current) setEggLabelExpanded(false)
    }, 5000)
    return () => {
      window.clearTimeout(collapseTimer)
    }
  }, [])

  const revealEggLabel = () => {
    setEggLabelExpanded(true)
  }
  const hideEggLabel = () => {
    if (eggLabelAutoCollapsedRef.current && !eggLabelPointerHoveredRef.current && !eggLabelFocusedRef.current) setEggLabelExpanded(false)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }
  
  const zoomRef = useRef<{ zoomIn: () => void, zoomOut: () => void, resetZoom: () => void, zoomToPercent: (percent: number) => void, centerCity: (city: CityData) => void } | null>(null)
  const popupZoomCycle = useRef<{ percent: number; direction: 1 | -1 } | null>(null)
  const closeAllTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => closeAllTimers.current.forEach(clearTimeout), [])
  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
      if (zoomRef.current) {
          if (direction === 'in') zoomRef.current.zoomIn()
          if (direction === 'out') zoomRef.current.zoomOut()
          if (direction === 'reset') zoomRef.current.resetZoom()
      }
  }

  // --- AUDIO LOGIC ---
  const audioContextRef = useRef<AudioContext | null>(null)
  const pinKickCompressorRef = useRef<DynamicsCompressorNode | null>(null)
  const popupHatCompressorRef = useRef<DynamicsCompressorNode | null>(null)
  const heldPopupCloseHatRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null)
  const pinKickBuffersRef = useRef<AudioBuffer[]>([])
  const popupOpenHatBuffersRef = useRef<AudioBuffer[]>([])

  useEffect(() => {
    const initAudio = async () => {
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext
            if (!Ctx) return
            const ctx = new Ctx()
            audioContextRef.current = ctx
            const compressor = ctx.createDynamicsCompressor()
            compressor.threshold.value = -12
            compressor.knee.value = 6
            compressor.ratio.value = 8
            compressor.attack.value = .002
            compressor.release.value = .12
            compressor.connect(ctx.destination)
            pinKickCompressorRef.current = compressor
            const hatCompressor = ctx.createDynamicsCompressor()
            hatCompressor.threshold.value = -10
            hatCompressor.knee.value = 4
            hatCompressor.ratio.value = 8
            hatCompressor.attack.value = .002
            hatCompressor.release.value = .09
            hatCompressor.connect(ctx.destination)
            popupHatCompressorRef.current = hatCompressor
            void Promise.all([
              '/samples/chicken-percussion-v1/kick-0.wav',
              '/samples/chicken-percussion-v1/kick-1.wav',
            ].map(async url => {
              const response = await fetch(url)
              if (!response.ok) throw new Error(`Failed to load ${url}`)
              return ctx.decodeAudioData(await response.arrayBuffer())
            })).then(buffers => {
              if (audioContextRef.current === ctx) pinKickBuffersRef.current = buffers
            }).catch(() => {})
            void Promise.all([
              '/samples/chicken-percussion-v1/open-hat-0.wav',
              '/samples/chicken-percussion-v1/open-hat-1.wav',
            ].map(async url => {
              const response = await fetch(url)
              if (!response.ok) throw new Error(`Failed to load ${url}`)
              return ctx.decodeAudioData(await response.arrayBuffer())
            })).then(buffers => {
              if (audioContextRef.current === ctx) popupOpenHatBuffersRef.current = buffers
            }).catch(() => {})
        } catch (e) {
            console.error("Audio init failed", e)
        }
    }
    initAudio()
    
    return () => {
        pinKickBuffersRef.current = []
        popupOpenHatBuffersRef.current = []
        audioContextRef.current?.close()
        audioContextRef.current = null
    }
  }, [])

  const whistleLoopRef = useRef<{ osc: OscillatorNode, gain: GainNode, panner: StereoPannerNode, lfo: OscillatorNode } | null>(null)
  const padSoundRef = useRef<{
    mode: 'campaign' | 'lobby'
    osc1: OscillatorNode
    osc2: OscillatorNode
    osc3?: OscillatorNode
    lfo?: OscillatorNode
    gain: GainNode
    filter: BiquadFilterNode
  } | null>(null)
  const whistleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startWhistleLoop = () => {
    const ctx = audioContextRef.current
    if (!ctx) return
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

    osc.type = "sine"
    osc.frequency.value = 75 

    lfo.type = "sine"
    lfo.frequency.value = 6 
    lfoGain.gain.value = 15 

    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)

    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.01255, t + 0.1)

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

  const startPadSound = (mode: 'campaign' | 'lobby' = 'campaign') => {
    const ctx = audioContextRef.current
    if (!ctx) return
    if (padSoundRef.current) {
      if (padSoundRef.current.mode === mode) return
      stopPadSound()
    }
    if (ctx.state === "suspended") ctx.resume()

    const t = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    if (mode === 'lobby') {
      const osc3 = ctx.createOscillator()
      const subGain = ctx.createGain()
      const fifthGain = ctx.createGain()
      const lfo = ctx.createOscillator()
      const lfoFilterGain = ctx.createGain()
      const lfoDetuneGain = ctx.createGain()

      osc1.type = "sawtooth"
      osc2.type = "triangle"
      osc3.type = "sawtooth"
      osc2.detune.value = -6
      osc3.detune.value = 12

      subGain.gain.value = 1.35
      fifthGain.gain.value = 0.55

      filter.type = "lowpass"
      filter.Q.value = 6.5
      filter.frequency.value = 600

      osc1.frequency.value = 95
      osc2.frequency.value = 47.5
      osc3.frequency.value = 142.3

      lfo.type = "sine"
      lfo.frequency.value = 4.2
      lfoFilterGain.gain.value = 210
      lfoDetuneGain.gain.value = 9

      lfo.connect(lfoFilterGain)
      lfoFilterGain.connect(filter.frequency)
      lfo.connect(lfoDetuneGain)
      lfoDetuneGain.connect(osc3.detune)

      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.0055, t + 0.1)

      osc1.connect(filter)
      osc2.connect(subGain)
      subGain.connect(filter)
      osc3.connect(fifthGain)
      fifthGain.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(t)
      osc2.start(t)
      osc3.start(t)
      lfo.start(t)

      padSoundRef.current = { mode, osc1, osc2, osc3, lfo, gain, filter }
      return
    }

    osc1.type = "sawtooth"
    osc2.type = "square"
    osc2.detune.value = 10 

    filter.type = "lowpass"
    filter.Q.value = 5
    filter.frequency.value = 2000 

    osc1.frequency.value = 400
    osc2.frequency.value = 400

    gain.gain.setValueAtTime(0, t)
    // Increased volume by ~30% (0.0029 * 1.3 ≈ 0.0038)
    gain.gain.linearRampToValueAtTime(0.0038, t + 0.1) 

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(t)
    osc2.start(t)

    padSoundRef.current = { mode, osc1, osc2, gain, filter }
  }

  const updatePadSound = (x: number, width: number, pitchMultiplier = 1) => {
    const ctx = audioContextRef.current
    if (!ctx || !padSoundRef.current) return
    
    const ratio = Math.max(0, Math.min(1, x / Math.max(1, width)))
    const { mode, osc1, osc2, osc3, lfo, filter } = padSoundRef.current
    const t = ctx.currentTime

    if (mode === 'lobby') {
      const freq = (72 + ratio * 118) * (pitchMultiplier / 0.7)
      const cutoff = 240 + ratio * 1650
      osc1.frequency.setTargetAtTime(freq, t, 0.09)
      osc2.frequency.setTargetAtTime(freq * 0.5, t, 0.09)
      osc3?.frequency.setTargetAtTime(freq * 1.498, t, 0.09)
      lfo?.frequency.setTargetAtTime(3.2 + ratio * 4.5, t, 0.1)
      filter.frequency.setTargetAtTime(cutoff, t, 0.09)
      return
    }

    const freq = (200 + ratio * 400) * pitchMultiplier
    const cutoff = 500 + ratio * 4000
    
    osc1.frequency.setTargetAtTime(freq, t, 0.1)
    osc2.frequency.setTargetAtTime(freq * 1.01, t, 0.1)
    filter.frequency.setTargetAtTime(cutoff, t, 0.1)
  }

  const stopPadSound = () => {
    const ctx = audioContextRef.current
    if (!ctx || !padSoundRef.current) return

    const { osc1, osc2, osc3, lfo, gain } = padSoundRef.current
    const t = ctx.currentTime

    gain.gain.cancelScheduledValues(t)
    gain.gain.setValueAtTime(gain.gain.value, t)
    gain.gain.linearRampToValueAtTime(0, t + 0.2)

    osc1.stop(t + 0.2)
    osc2.stop(t + 0.2)
    osc3?.stop(t + 0.2)
    lfo?.stop(t + 0.2)
    
    padSoundRef.current = null
  }

  const handleSmartPadSound = (e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>, pitchMultiplier = 1) => {
      if (padSoundTimeoutRef.current) {
        clearTimeout(padSoundTimeoutRef.current)
        padSoundTimeoutRef.current = null
    }

    const mode = pitchMultiplier < 1 ? 'lobby' : 'campaign'
    startPadSound(mode)

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    updatePadSound(x, rect.width, pitchMultiplier)
    
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`)
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`)

    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI)
    e.currentTarget.style.setProperty('--hue-rotation', `${angle}deg`)

    padSoundTimeoutRef.current = setTimeout(() => {
        stopPadSound()
    }, 100)
}

  const handleSmartPadLeave = (e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>) => {
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
      const pitchVar = 0.9 + Math.random() * 0.2

      if (type === 'popup_close_hold_start') {
          const previous = heldPopupCloseHatRef.current
          if (previous) {
              previous.gain.gain.cancelScheduledValues(t)
              previous.gain.gain.setValueAtTime(previous.gain.gain.value, t)
              previous.gain.gain.linearRampToValueAtTime(0, t + .01)
              try { previous.source.stop(t + .015) } catch { /* Already stopped. */ }
          }
          const buffers = popupOpenHatBuffersRef.current
          const source = ctx.createBufferSource()
          if (buffers.length) {
              source.buffer = buffers[Math.floor(Math.random() * buffers.length)]
          } else {
              const duration = .5
              const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
              const data = buffer.getChannelData(0)
              for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
              source.buffer = buffer
          }
          source.playbackRate.value = 0.98 + Math.random() * 0.04
          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.95, t)
          source.connect(gain)
          gain.connect(popupHatCompressorRef.current ?? ctx.destination)
          source.onended = () => {
              if (heldPopupCloseHatRef.current?.source === source) heldPopupCloseHatRef.current = null
          }
          heldPopupCloseHatRef.current = { source, gain }
          source.start(t)
      } else if (type === 'popup_close_hold_end') {
          const active = heldPopupCloseHatRef.current
          if (active) {
              active.gain.gain.cancelScheduledValues(t)
              active.gain.gain.setValueAtTime(active.gain.gain.value, t)
              active.gain.gain.linearRampToValueAtTime(0, t + .15)
              try { active.source.stop(t + .155) } catch { /* Already stopped. */ }
              heldPopupCloseHatRef.current = null
          }
      } else if (type === 'popup_down' || type === 'popup_up' || type === 'popup_drag') {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const filter = ctx.createBiquadFilter()
          const isPress = type === 'popup_down'
          const isRelease = type === 'popup_up'
          const duration = isRelease ? .13 : type === 'popup_drag' ? .055 : .09
          osc.type = isPress ? 'triangle' : 'sine'
          osc.frequency.setValueAtTime((isPress ? 190 : isRelease ? 360 : 520) * pitchVar, t)
          osc.frequency.exponentialRampToValueAtTime((isPress ? 108 : isRelease ? 620 : 390) * pitchVar, t + duration)
          filter.type = 'lowpass'
          filter.frequency.setValueAtTime(isPress ? 900 : 1800, t)
          gain.gain.setValueAtTime(isPress ? .075 : isRelease ? .055 : .018, t)
          gain.gain.exponentialRampToValueAtTime(.001, t + duration)
          osc.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          osc.start(t)
          osc.stop(t + duration)
      } else if (type === "pin_kick_hover") {
          const velocity = 0.18 + Math.pow(Math.random(), 1.8) * 0.62
          const buffers = pinKickBuffersRef.current
          if (buffers.length > 0) {
              const source = ctx.createBufferSource()
              const gain = ctx.createGain()
              source.buffer = buffers[Math.floor(Math.random() * buffers.length)]
              source.playbackRate.setValueAtTime(0.96 + Math.random() * 0.08, t)
              gain.gain.setValueAtTime(0.82 * velocity, t)
              source.connect(gain)
              gain.connect(pinKickCompressorRef.current ?? ctx.destination)
              source.start(t)
              return
          }
          const body = ctx.createOscillator()
          const bodyGain = ctx.createGain()
          const transient = ctx.createOscillator()
          const transientGain = ctx.createGain()
          const output = ctx.createGain()
          const variation = 0.93 + Math.random() * 0.14
          body.type = 'sine'
          body.frequency.setValueAtTime(132 * variation, t)
          body.frequency.exponentialRampToValueAtTime(43 * variation, t + .12)
          body.frequency.exponentialRampToValueAtTime(36 * variation, t + .23)
          bodyGain.gain.setValueAtTime(.001, t)
          bodyGain.gain.linearRampToValueAtTime(.24, t + .006)
          bodyGain.gain.exponentialRampToValueAtTime(.001, t + .24)
          transient.type = 'triangle'
          transient.frequency.setValueAtTime(320 * variation, t)
          transient.frequency.exponentialRampToValueAtTime(95 * variation, t + .025)
          transientGain.gain.setValueAtTime(.001, t)
          transientGain.gain.linearRampToValueAtTime(.045, t + .003)
          transientGain.gain.exponentialRampToValueAtTime(.001, t + .03)
          output.gain.value = .82 * .85 * velocity
          body.connect(bodyGain)
          transient.connect(transientGain)
          bodyGain.connect(output)
          transientGain.connect(output)
          output.connect(pinKickCompressorRef.current ?? ctx.destination)
          body.start(t)
          transient.start(t)
          body.stop(t + .25)
          transient.stop(t + .035)
      } else if (type === "pin_hover") {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const filter = ctx.createBiquadFilter()
          const delayA = ctx.createDelay(.2)
          const delayB = ctx.createDelay(.2)
          const echoGainA = ctx.createGain()
          const echoGainB = ctx.createGain()
          const level = (0.15 * 0.37) * (0.88 + Math.random() * 0.2)
          osc.type = 'sine'
          osc.frequency.setValueAtTime((148 + Math.random() * 28) * pitchVar, t)
          osc.frequency.exponentialRampToValueAtTime((68 + Math.random() * 12) * pitchVar, t + 0.11)
          filter.type = 'lowpass'
          filter.frequency.setValueAtTime(650, t)
          gain.gain.setValueAtTime(level, t)
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11)
          delayA.delayTime.value = .045
          delayB.delayTime.value = .092
          echoGainA.gain.setValueAtTime(.16, t)
          echoGainB.gain.setValueAtTime(.075, t)
          osc.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          gain.connect(delayA)
          gain.connect(delayB)
          delayA.connect(echoGainA)
          delayB.connect(echoGainB)
          echoGainA.connect(ctx.destination)
          echoGainB.connect(ctx.destination)
          osc.start(t)
          osc.stop(t + 0.11)
      } else if (type === "bd") {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.frequency.setValueAtTime(150 * pitchVar, t)
          osc.frequency.exponentialRampToValueAtTime(40 * pitchVar, t + 0.1)
          gain.gain.setValueAtTime(0.15 * .7, t)
          gain.gain.exponentialRampToValueAtTime(0.01 * .7, t + 0.1)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(t)
          osc.stop(t + 0.1)
      } else if (type === "bossdr220_lt") {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.frequency.setValueAtTime(200 * pitchVar, t)
          osc.frequency.exponentialRampToValueAtTime(50 * pitchVar, t + 0.2)
          gain.gain.setValueAtTime(0.6 * .3, t)
          gain.gain.exponentialRampToValueAtTime(0.01 * .3, t + 0.2)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(t)
          osc.stop(t + 0.2)
      } else if (type === "trainwhistle") {
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
          const carrier = ctx.createOscillator()
          const modulator = ctx.createOscillator()
          const modGain = ctx.createGain()
          const masterGain = ctx.createGain()
          const freq = 523.25 * pitchVar
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
          filter.frequency.value = 8000 * pitchVar
          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.14, t)
          gain.gain.exponentialRampToValueAtTime(0.007, t + 0.05)
          noise.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          noise.start(t)
      } else if (type === "gm_reverse_cymbal") {
          const dur = 0.5
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
          gain.gain.setValueAtTime(0.005 * .3, t)
          gain.gain.exponentialRampToValueAtTime(0.1 * .3, t + dur - 0.1)
          gain.gain.linearRampToValueAtTime(0, t + dur)
          noise.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          noise.start(t)
      } else if (type === "suction") {
          const dur = 1.5
          const bufferSize = ctx.sampleRate * dur
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const data = buffer.getChannelData(0)
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
          gain.gain.linearRampToValueAtTime(0.235 * 0.75, t + dur - 0.1)
          gain.gain.linearRampToValueAtTime(0, t + dur)
          noise.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          noise.start(t)
      } else if (type === "alesissr16_ch") {
          const duration = .075
          const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
          const data = buffer.getChannelData(0)
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
          const noise = ctx.createBufferSource()
          noise.buffer = buffer
          const filter = ctx.createBiquadFilter()
          filter.type = "highpass"
          filter.frequency.value = 8500 * pitchVar
          const gain = ctx.createGain()
          gain.gain.setValueAtTime(.001, t)
          gain.gain.linearRampToValueAtTime(.14, t + .003)
          gain.gain.exponentialRampToValueAtTime(.001, t + .065)
          noise.connect(filter)
          filter.connect(gain)
          gain.connect(popupHatCompressorRef.current ?? ctx.destination)
          noise.start(t)
          noise.stop(t + duration)
      } else if (type === "alesissr16_oh") {
          const buffers = popupOpenHatBuffersRef.current
          if (buffers.length) {
              const source = ctx.createBufferSource()
              source.buffer = buffers[Math.floor(Math.random() * buffers.length)]
              source.playbackRate.value = 0.98 + Math.random() * 0.04
              const gain = ctx.createGain()
              gain.gain.setValueAtTime(0.95, t)
              source.connect(gain)
              gain.connect(popupHatCompressorRef.current ?? ctx.destination)
              source.start(t)
          } else {
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
              gain.gain.setValueAtTime(0.24, t)
              gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3)
              noise.connect(filter)
              filter.connect(gain)
              gain.connect(popupHatCompressorRef.current ?? ctx.destination)
              noise.start(t)
          }
      } else {
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

  const handleCityClick = (city: CityData, position?: { x: number; y: number }) => {
    playMapSound("bossdr220_lt", true)
    
    if (openPopups[city.id] && !openPopups[city.id].isClosing) {
      closePopup(city.id)
      return
    }

    playMapSound("gm_reverse_cymbal", true)

    // Keep the side choice relative to the pin. The projected popup measures
    // its real height and centers itself in the viewport when it mounts.
    const viewport = window.visualViewport
    const distance = Math.min(viewport?.width ?? window.innerWidth, viewport?.height ?? window.innerHeight) * .35
    const x = position?.x ?? (Math.random() > .5 ? distance : -distance)
    const y = position?.y ?? 0

    setOpenPopups(prev => {
        if (prev[city.id] && !prev[city.id].isClosing) return prev
        return {
          ...prev,
          [city.id]: { 
            x, 
            y, 
            zIndex: nextZIndex,
            timestamp: Date.now(),
            centerOffsetY: (Math.random() - 0.5) * 40,
            enterX: (Math.random() - 0.5) * 50, 
            enterRot: (Math.random() - 0.5) * 10 
          }
        }
    })
    setNextZIndex(n => n + 1)
    const cycle = popupZoomCycle.current ?? { percent: currentZoom, direction: 1 as const }
    const percent = cycle.direction === 1 ? Math.min(150, cycle.percent + 25) : Math.max(69, cycle.percent - 15)
    popupZoomCycle.current = { percent, direction: percent >= 150 ? -1 : percent <= 69 ? 1 : cycle.direction }
    requestAnimationFrame(() => zoomRef.current?.zoomToPercent(percent))
  }

  const [isMobile, setIsMobile] = useState(false)
  const [isIntro, setIsIntro] = useState(true)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)

    // Logo Sequence:
    // 0-3.0s: Hold
    // 3.0s-6.5s: Zoom Out (Planet) + Logo/Slogan Shrink
    // 3.5s-4.5s: Fade Out Big Logo + Fade Out Slogan
    // 4.5s+: Slide In Header Logo

    const tFade = setTimeout(() => {
      setLogoPhase('fading')
      setIntroHeadlineVisible(false)
    }, 4500) // Increased by 1s (was 3500)

    const tHeader = setTimeout(() => {
      setLogoPhase('header')
      setIsIntro(false)
    }, 5500) // Increased by 1s (was 4500)

    const tShowTitle = setTimeout(() => setShowTitle(true), 7000)
    // const tHeadline = setTimeout(() => setIntroHeadlineVisible(false), 6000)

    return () => {
      clearTimeout(tFade)
      clearTimeout(tHeader)
      clearTimeout(tShowTitle)
      // clearTimeout(tHeadline)
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  useEffect(() => {
    const profile = getPlayerProfile()
    setPlayerProfile(profile)
    setUnlockedCities(cities.map(c => c.id))
  }, [])

  const updatePopupPosition = (id: string, x: number, y: number) => {
    setOpenPopups(prev => ({
      ...prev,
      [id]: { ...prev[id], x, y }
    }))
  }

  const closePopup = (id: string, hat: 'open' | 'closed' | 'held' = 'open', exitMotion?: PopupExitMotion) => {
    const active = openPopups[id]
    if (!active || active.isClosing) return
    if (hat !== 'held') playMapSound(hat === 'closed' ? "alesissr16_ch" : "alesissr16_oh", true)
    setOpenPopups(prev => {
      if (!prev[id] || prev[id].isClosing || prev[id].timestamp !== active.timestamp) return prev
      return {
        ...prev,
        [id]: { ...prev[id], isClosing: true, ...(exitMotion ? { exitMotion } : {}) }
      }
    })

    setTimeout(() => {
        setOpenPopups(prev => {
            const next = { ...prev }
            if (next[id]?.timestamp !== active.timestamp) return prev
            delete next[id]
            return next
        })
    }, 1000)

    if (pressedPopupState?.id === id) {
      setPressedPopupState(null)
    }
  }

  const closeAllPopups = () => {
    const ids = Object.keys(openPopups).filter(id => !openPopups[id].isClosing)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    let delay = 0
    ids.forEach((id, index) => {
      delay += 38 + Math.random() * 82
      closeAllTimers.current.push(setTimeout(() => closePopup(id, index % 2 === 0 ? 'closed' : 'open'), delay))
    })
  }

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col" style={{ background: 'radial-gradient(ellipse at 18% 30%, #22243d 0%, transparent 52%), radial-gradient(ellipse at 82% 62%, #142d36 0%, transparent 48%), radial-gradient(ellipse at 56% 90%, #2b1e32 0%, transparent 50%), #080b14' }}>
      <style jsx global>{`
        @keyframes drawLine {
          from { stroke-dashoffset: 4000; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes drawLineReverse {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 4000; }
        }
        .animate-line-slow {
          stroke-dasharray: 4000;
          stroke-dashoffset: 4000;
          animation: drawLine 4s ease-out forwards;
        }
        .animate-line-exit {
          stroke-dasharray: 4000;
          stroke-dashoffset: 0;
          animation: drawLineReverse 0.6s ease-in forwards;
        }
        @keyframes popupEnter {
          0% { opacity: 0; transform: perspective(1000px) rotateX(10deg) translate(var(--enter-x), 50px) rotate(var(--enter-rot)) scale(0.5); }
          60% { opacity: 1; transform: perspective(1000px) rotateX(-5deg) translate(0, -10px) rotate(0) scale(1.05); }
          80% { transform: perspective(1000px) rotateX(2deg) translate(0, 5px) scale(0.98); }
          100% { opacity: 1; transform: perspective(1000px) rotateX(0) translate(0, 0) rotate(0) scale(1); }
        }
        @keyframes popupExit {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(50px) rotate(15deg); }
        }
        @keyframes popupExitFromButton {
          0% {
            opacity: 1;
            transform: rotate(var(--close-held-rotation, 0deg)) translate(0, 0);
            transform-origin: var(--close-pivot-x, 6px) var(--close-pivot-y, 8px);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--exit-rot, 0deg)) translate(var(--exit-x, 0px), var(--exit-y, 0px));
            transform-origin: var(--exit-origin, 50% 50%);
          }
        }
        .popup-close-held {
          opacity: 1;
          transform-origin: var(--close-pivot-x, 6px) var(--close-pivot-y, 8px);
          will-change: transform;
          animation: popupCloseHeldPendulum 1.15s cubic-bezier(.2, .7, .25, 1) both;
        }
        .popup-close-resting {
          opacity: 1;
          transform: rotate(var(--close-rest-rotation, 0deg));
          transform-origin: var(--close-pivot-x, 6px) var(--close-pivot-y, 8px);
          transition: transform 420ms ease-out;
        }
        @keyframes popupCloseHeldPendulum {
          0% { transform: rotate(var(--close-held-rotation, 0deg)); }
          14% { transform: rotate(var(--close-rest-rotation, 0deg)); }
          30% { transform: rotate(var(--close-rest-minus-9, 0deg)); }
          46% { transform: rotate(var(--close-rest-plus-5, 0deg)); }
          60% { transform: rotate(var(--close-rest-minus-2_5, 0deg)); }
          72% { transform: rotate(var(--close-rest-plus-1, 0deg)); }
          82% { transform: rotate(var(--close-rest-minus-2_5, 0deg)); }
          91% { transform: rotate(var(--close-rest-rotation, 0deg)); }
          100% { transform: rotate(var(--close-rest-rotation, 0deg)); }
        }
        .popup-close-restored {
          opacity: 1;
          transform: none;
          transition: transform 120ms ease-out;
        }
        .animate-popup {
          opacity: 0;
          animation: popupEnter 0.5s ease-out forwards;
        }
        .popup-entered {
          opacity: 1;
          transform: none;
        }
        .animate-popup-exit {
          animation: popupExit 0.5s ease-in forwards;
        }
        .animate-popup-exit-from-button {
          animation: popupExitFromButton 0.6s ease-out forwards;
        }
        @keyframes contentFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-content-1 { opacity: 0; animation: contentFade 0.5s ease-out 0.2s forwards; }
        .animate-content-2 { opacity: 0; animation: contentFade 0.5s ease-out 0.3s forwards; }
        .animate-content-3 { opacity: 0; animation: contentFade 0.5s ease-out 0.4s forwards; }
        .animate-content-4 { opacity: 0; animation: contentFade 0.5s ease-out 0.5s forwards; }
        @keyframes hue-rotate {
          from { filter: hue-rotate(0deg); }
          to { filter: hue-rotate(360deg); }
        }
      `}</style>

      {/* 3D Globe Background */}
      <div className="absolute inset-0 z-0">
         <GlobeComponent 
            cities={cities}
            conqueredCities={playerProfile?.conqueredCityIds || []}
            unlockedCities={unlockedCities}
            openPopups={openPopups}
            onCityClick={handleCityClick}
            onPopupClose={closePopup}
            bringToFront={bringToFront}
            updatePopupPosition={updatePopupPosition}
            playMapSound={playMapSound}
            startWhistleLoop={startWhistleLoop}
            stopWhistleLoop={stopWhistleLoop}
            setPressedPopupState={setPressedPopupState}
            onCitySelect={onCitySelect}
            onCreateRoom={onOnlineMatch && onlineAvailable ? city => { if (!createRoomRequest) setCreateRoomRequest({ id: ++createRoomSequence.current, cityId: city.id }) } : undefined}
            creatingRoomCityId={createRoomRequest?.cityId ?? null}
            handleSmartPadSound={handleSmartPadSound}
            handleSmartPadLeave={handleSmartPadLeave}
            stopPadSound={stopPadSound}
            pressedPopupState={pressedPopupState}
            enteringCityId={enteringCityId}
            setEnteringCityId={setEnteringCityId}
            zoomRef={zoomRef}
            popupLayerRef={popupLayerRef}
            onZoomChange={setCurrentZoom}
            onIntroZoomScaleChange={scale => {
              introLogoRef.current?.style.setProperty("transform", `translate(-50%, -50%) scale(${1.15 * scale})`)
            }}
            focusedCityId={focusedCityId}
            setFocusedCityId={setFocusedCityId}
            onPinHover={setPinHoveredCityId}
         />
      </div>

      <div ref={popupLayerRef} className="absolute inset-0 z-[45] pointer-events-none" />

      {logoPhase === 'header' && <CampaignCityList cities={cities} conqueredCities={playerProfile?.conqueredCityIds || []} openCityIds={Object.keys(openPopups).filter(id => !openPopups[id].isClosing)} focusedCityId={focusedCityId} pinHoveredCityId={pinHoveredCityId} onFocus={setFocusedCityId} onOpen={city => { if (!openPopups[city.id] || openPopups[city.id].isClosing) zoomRef.current?.centerCity(city); handleCityClick(city) }} />}

      <header
        className="absolute top-0 left-0 w-full z-60 flex flex-col md:flex-row items-center md:justify-between px-8 py-6 pointer-events-none gap-2"
        style={{ height: isIntro ? "100vh" : "auto", position: 'relative' }}
      >
        <div className="hidden md:block w-[280px] h-10" />

        {/* Intro Logo (Big) */}
        <div
          className="flex flex-col items-center gap-4 pointer-events-none z-50"
          ref={introLogoRef}
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%) scale(1.15)",
            opacity: logoPhase === 'intro' ? 1 : 0,
            pointerEvents: 'none',
            transition: 'opacity 0.5s ease-out'
          }}
        >
             <img
              src="/images/logo-chikenchess-border-darker.png"
              alt="chiken'chess Logo"
              className="object-contain w-[80vw] max-w-[260px]"
              style={{ transform: "scaleX(-1) scale(1)" }}
            />
            
            <div
              className="text-center text-sm md:text-base font-mono text-white w-full"
              style={{
                opacity: (introHeadlineVisible && openingPhrase) ? 1 : 0,
                textShadow:
                  "2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                whiteSpace: isMobile ? "normal" : "nowrap",
                transition: 'opacity 0.5s ease-out'
              }}
            >
              {openingPhrase ?? '\u00A0'}
            </div>
        </div>

        {/* Header Logo (Small) */}
        <div
          className="flex items-center gap-4 pointer-events-none z-50 transition-all duration-1000 ease-out"
          style={{
            position: "absolute",
            top: logoPhase === 'header' ? "24px" : "-100px",
            left: "32px",
            opacity: logoPhase === 'header' ? 1 : 0,
          }}
        >
          <div className="flex items-center gap-0.5">
            {/* Removed Image Logo from Header as requested */}
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
          </div>
        </div>

        <div className="absolute top-6 right-6 flex items-center gap-3 pointer-events-auto text-xs font-mono">
          <button
            onClick={(e) => {
                e.preventDefault()
                setAboutTab('about')
                setShowAbout(true)
            }}
            className={cn(styles.aboutButton, "cursor-pointer rounded-md border border-transparent bg-transparent px-3 py-2 text-muted-foreground transition-colors hover:border-white/10 hover:bg-black/80 hover:text-foreground")}
          >
            About
          </button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullscreen} 
            className="group cursor-pointer border-white/10 bg-black/50 text-muted-foreground backdrop-blur-md transition-all hover:border-primary hover:bg-black/80 dark:hover:bg-black/80 hover:text-white hover:shadow-[0_0_10px_var(--primary)]"
          >
            {isFullscreen ? <Minimize className="w-4 h-4 transition-transform duration-200 group-hover:scale-125" /> : <Maximize className="w-4 h-4 transition-transform duration-200 group-hover:scale-125" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="default"
            aria-label={`Abrir perfil do jogador. ${playerProfile?.goldenEggs ?? 0} ovos dourados`}
            onClick={() => setProfileTabRequested(true)}
            onMouseEnter={() => { eggLabelPointerHoveredRef.current = true; revealEggLabel() }}
            onMouseLeave={() => { eggLabelPointerHoveredRef.current = false; hideEggLabel() }}
            onFocus={() => { eggLabelFocusedRef.current = true; revealEggLabel() }}
            onBlur={() => { eggLabelFocusedRef.current = false; hideEggLabel() }}
            className="h-9 cursor-pointer gap-[7px] border-white/10 bg-black/50 px-3 font-mono text-xs text-amber-300 backdrop-blur-md transition-all hover:border-primary hover:bg-black/80 dark:hover:bg-black/80 hover:text-white hover:shadow-[0_0_10px_var(--primary)]"
          >
            <span className="inline-flex min-w-0 items-center whitespace-nowrap">
              <span>{(playerProfile?.goldenEggs ?? 0).toLocaleString()}</span>
              <span aria-hidden={!eggLabelExpanded} className={cn("inline-block overflow-hidden whitespace-nowrap transition-[max-width,margin,opacity] duration-500 ease-in-out", eggLabelExpanded ? "ml-[6px] max-w-[90px] opacity-100" : "max-w-0 opacity-0")}>golden eggs</span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 16 20" className="h-5 w-4">
              <path d="M8 1.5c-3.2 0-6 6.3-6 11.3a6 6 0 0 0 12 0c0-5-2.8-11.3-6-11.3Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
              <path d="M5 6.5c-.9 1.7-1.5 3.8-1.5 5.5" fill="none" stroke="#fef08a" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </Button>
        </div>

        {/* Slogan moved to logo container */}

        <div
          className="font-mono font-bold text-xl text-white uppercase tracking-widest transition-opacity duration-500 text-center"
          style={{
            textShadow:
              "2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            opacity:
              showTitle ? 1 : 0,
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

      <AboutReleaseDialog open={showAbout} onOpenChange={setShowAbout} tab={aboutTab} onTabChange={setAboutTab} />

      {/* UI OVERLAY LAYER */}
      <div className="absolute inset-0 z-[70] overflow-hidden pointer-events-none">
        
        {/* Bottom Right Info & Controls */}
        <div 
          className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-wrap justify-end items-stretch gap-2 pointer-events-auto">
          {Object.values(openPopups).filter(popup => !popup.isClosing).length > 1 && <button type="button" onClick={closeAllPopups} className="inline-flex h-9 items-center rounded-md border border-white/50 bg-background/80 px-3 text-xs font-mono text-white/50 backdrop-blur-sm transition-colors hover:border-white hover:text-white">Fechar tudo</button>}
          {onOnlineMatch && <OnlineHub showMapRooms playerProfile={playerProfile} open={profileTabRequested || undefined} onOpenChange={open => { if (!open) setProfileTabRequested(false) }} initialTab={profileTabRequested ? 'profile' : undefined} onMatch={onOnlineMatch} onCampaignCity={onCitySelect} inviteCode={inviteCode} createRequest={createRoomRequest} onCreateRequestHandled={id => setCreateRoomRequest(current => current?.id === id ? null : current)} />}
          <Link href="/creative" className="inline-flex h-9 items-center rounded-md border border-primary/40 bg-background/80 px-3 text-xs font-mono text-primary backdrop-blur-sm transition-all hover:border-primary hover:bg-black/80 dark:hover:bg-black/80 hover:text-white hover:shadow-[0_0_10px_var(--primary)]">Creative</Link>
          {isAdminUser(online.user) && <Link href="/admin" className="inline-flex h-9 items-center rounded-md border border-primary/40 bg-background/80 px-3 text-xs font-mono text-primary backdrop-blur-sm transition-all hover:border-primary hover:bg-black/80 hover:text-white hover:shadow-[0_0_10px_var(--primary)]">Admin</Link>}
          <VersionChangelog mapButton onOpen={() => { setAboutTab('releases'); setShowAbout(true) }} />
        </div>
      </div>

      {/* Zoom Controls (Fixed Bottom Right) */}
      <div className="flex fixed bottom-24 right-4 z-50 flex-col gap-2 pointer-events-auto">
          <Button
              variant="outline"
              size="icon"
              onClick={() => handleZoom('in')}
              className="bg-black/50 backdrop-blur-md border-white/10 hover:bg-black/80 dark:hover:bg-black/80 hover:text-white hover:border-primary hover:shadow-[0_0_10px_var(--primary)] transition-all"
          >
              <Plus className="w-4 h-4" />
          </Button>
          <Button
              variant="outline"
              size="icon"
              onClick={() => handleZoom('out')}
              className="bg-black/50 backdrop-blur-md border-white/10 hover:bg-black/80 dark:hover:bg-black/80 hover:text-white hover:border-primary hover:shadow-[0_0_10px_var(--primary)] transition-all"
          >
              <Minus className="w-4 h-4" />
          </Button>
          <Button
              variant="outline"
              size="icon"
              onClick={() => handleZoom('reset')}
              className="bg-black/50 backdrop-blur-md border-white/10 hover:bg-black/80 dark:hover:bg-black/80 hover:text-white hover:border-primary hover:shadow-[0_0_10px_var(--primary)] transition-all text-[10px] font-mono"
          >
              100%
          </Button>
          <div className="text-center mt-1 pointer-events-none">
              <span className="text-[10px] font-mono text-white/33">
                  {currentZoom}%
              </span>
          </div>
      </div>
    </div>
  )
}
