// "Spawn de itens" of the Grade de blocos: which blocks are born with items, where their platform stands and which
// items lie on it. Every block draws from its own stream of the saved seed, so every browser draws the same, and a
// higher chance keeps the blocks that already had items (and their platforms and items). Pure; settings in
// mine-item-params.ts. The Pátio's screen turns the draw into layout elements of this round (a Plataforma and an
// Item solto for each item) that only the game sees: they are never saved and the Modo editor does not list them.
import { createElement, type LayoutElement } from './layout'
import type { ItemId } from './items'
import { mineCellRect, mineRandom, mineWallThickness, type MineGeo, type MineRect } from './mine-grid'
import { drawMineItem, type MineItemParams } from './mine-item-params'

export type MineItemSpot = { c: number; r: number; platform: MineRect; items: { item: ItemId; x: number }[] }

// the platform: this thick, this much room for each item, and kept this far inside the block's walls
export const MINE_ITEM_PLATFORM = { h: 18, perItem: 56, pad: 24, margin: 20, minW: 40 } as const
// how high its top stands over the block's floor, as a share of the room's height: somewhere in the middle
export const MINE_ITEM_HEIGHT = { min: 0.25, max: 0.55 } as const

// the stream of one block (mixes the seed with the block's index)
const blockSeed = (seed: number, index: number) => (Math.imul(seed ^ 0x5bd1e995, 0x9e3779b1) + Math.imul(index + 1, 0x85ebca6b)) >>> 0

export function mineItemSpots(geo: MineGeo, p: MineItemParams): MineItemSpot[] {
  const out: MineItemSpot[] = []
  const wall = mineWallThickness(geo), margin = wall + MINE_ITEM_PLATFORM.margin
  const roomW = Math.max(0, geo.cell - margin * 2), roomH = geo.cell - wall * 2
  for (let r = 0; r < geo.rows; r++) for (let c = 0; c < geo.cols; c++) {
    const rnd = mineRandom(blockSeed(p.seed, r * geo.cols + c))
    if (rnd() * 100 >= p.chance) continue
    const n = 1 + Math.floor(rnd() * p.max)
    const items: ItemId[] = []
    for (let k = 0; k < n; k++) { const id = drawMineItem(p, rnd); if (id) items.push(id) }
    const fx = rnd(), fy = rnd()
    if (!items.length) continue
    const b = mineCellRect(geo, c, r)
    const w = Math.max(Math.min(MINE_ITEM_PLATFORM.minW, roomW), Math.min(roomW, MINE_ITEM_PLATFORM.pad + items.length * MINE_ITEM_PLATFORM.perItem))
    const x = b.x + margin + fx * (roomW - w)
    const top = b.y + b.h - wall - (MINE_ITEM_HEIGHT.min + fy * (MINE_ITEM_HEIGHT.max - MINE_ITEM_HEIGHT.min)) * roomH
    const platform = { x: Math.round(x), y: Math.round(top), w: Math.round(w), h: MINE_ITEM_PLATFORM.h }
    out.push({ c, r, platform, items: items.map((item, k) => ({ item, x: platform.x + ((k + 0.5) * platform.w) / items.length })) })
  }
  return out
}

// the spots as layout elements. `tag` names the round: a new round brings new elements, so the items taken in the
// last one come back
export function mineItemElements(spots: MineItemSpot[], tag: string | number): LayoutElement[] {
  const out: LayoutElement[] = []
  for (const s of spots) {
    const key = `mine-items:${tag}:${s.c}-${s.r}`
    const { x, y, w, h } = s.platform
    out.push({ ...createElement('platform', x + w / 2, y + h / 2), id: key, x, y, w, h })
    s.items.forEach((it, k) => {
      const loose = createElement('loose', it.x, 0, { item: it.item })
      // standing on the platform: the item falls the little left onto it
      out.push({ ...loose, id: `${key}:${k}`, y: y - loose.h })
    })
  }
  return out
}
