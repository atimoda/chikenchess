"use client"

// Going into the Pátio's houses and out of them (docs/mechanics/patio/houses.md): once a frame, each of
// this browser's players standing at a house's door with Usar goes in, or out when inside; whoever is taken away
// from a room (a portal, the house moved or lost its door, the Modo editor) is outside again. Her engine reads only
// that room's floors and walls once they are in the page (components/pigchicken/patio-layout.tsx). The rules are in
// lib/pigchicken/house-rooms.ts, who is where in house-rooms-store.ts.
import { useEffect, useMemo, useRef } from "react"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { refreshChickenPlatforms } from "@/lib/chicken/platform-geometry"
import { cancelGameFrame, requestGameFrame } from "@/lib/game-frame"
import { atDoor, createDoorGate, doorAt, houseRooms, withinRoom, type HouseRoom } from "@/lib/pigchicken/house-rooms"
import { clearHouseRooms, houseRoomsStore, setHouseDoors, setHouseRoom } from "@/lib/pigchicken/house-rooms-store"
import { elementsInWorld, LAYOUT_VERSION, type LayoutElement } from "@/lib/pigchicken/layout"
import { liveCamera } from "@/lib/pigchicken/live-camera"

export function HouseDoors({ engine, extras, elements, screens, editing }: {
  engine: ChickenEngine | null
  extras: React.RefObject<Map<string, ChickenEngine>>
  elements?: LayoutElement[]
  screens: number
  editing: boolean
}) {
  const rooms = useMemo(() => houseRooms(elementsInWorld({ v: LAYOUT_VERSION, elements: elements ?? [] }, screens)), [elements, screens])
  const live = useRef({ rooms, editing })
  live.current = { rooms, editing }

  useEffect(() => {
    if (!engine) return
    const gates = new Map<string, ReturnType<typeof createDoorGate>>()
    // the room each engine reads now
    const applied = new Map<ChickenEngine, string | null>()
    let byId = new Map<string, HouseRoom>(), mapped: HouseRoom[] | null = null
    let raf = 0
    const frame = (now: number) => {
      raf = requestGameFrame(frame)
      const { rooms, editing } = live.current
      if (mapped !== rooms) { mapped = rooms; byId = new Map(rooms.map(room => [room.id, room])) }
      const actors: [string, ChickenEngine][] = [["p1", engine], ...extras.current.entries()]
      const doors: string[] = []
      for (const [who, eng] of actors) {
        const st = eng.getMotionState()
        const body = { x: st.x + liveCamera.x, y: st.y - liveCamera.y, scale: st.scale }
        const busy = st.state === "portal" || st.state === "portalArrival"
        let cur = houseRoomsStore.roomOf(who)
        let room = cur ? byId.get(cur) ?? null : null
        if (cur && (!room || editing || !withinRoom(room, body))) { setHouseRoom(who, null); cur = null; room = null }
        const at = editing || busy || !st.grounded ? null : room ? (atDoor(room, body) ? room : null) : doorAt(rooms, body)
        let gate = gates.get(who)
        if (!gate) { gate = createDoorGate(); gates.set(who, gate) }
        if (gate.update(at?.id ?? null, eng.peekUse(now)) && at) setHouseRoom(who, cur ? null : at.id)
        if (at) doors.push(at.id)
        const want = houseRoomsStore.roomOf(who)
        if (want !== (applied.get(eng) ?? null)) {
          // going in waits for the room's floors and walls to be in the page
          if (!want || document.querySelector(`[data-chicken-room="${CSS.escape(want)}"]`)) {
            eng.setRoom(want); applied.set(eng, want); refreshChickenPlatforms()
          }
        }
      }
      for (const who of [...houseRoomsStore.inside.keys()]) if (!actors.some(([id]) => id === who)) setHouseRoom(who, null)
      setHouseDoors(doors)
    }
    raf = requestGameFrame(frame)
    return () => {
      cancelGameFrame(raf)
      applied.forEach((_, eng) => eng.setRoom(null))
      clearHouseRooms()
    }
  }, [engine, extras])

  return null
}
