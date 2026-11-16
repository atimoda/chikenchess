// The drawing of a soul: a pixel-art bird in two flaps, with a shape for each family of instrument (a long tail,
// a crest, a belly of piano keys, a chubby one, an owl) and the chick's, in the colours of its look. The library's
// cards and the souls in the world (flying to a counter, flying free) are all drawn here.
import { entryLookFor, entryOf, soulCatalogVersion, SOUL_SHAPES, type SoulLook, type SoulShape } from "@/lib/pigchicken/soul-library"
import type { Soul } from "@/lib/pigchicken/souls"
import { pixelSprite, stampPixels } from "./pixel-sprite"

type Ctx = CanvasRenderingContext2D

// '#' body, 'w' wing, 'b' belly, 'k' a black key, 'o' eye, '>' beak. 13 x 8 each, wings up then wings down; the
// bird's middle is at column 7.5, row 4
export const SOUL_COLS = 13, SOUL_ROWS = 8
export const SOUL_FRAMES: Record<SoulShape, readonly [readonly string[], readonly string[]]> = {
  // a long pale tail
  wind: [[
    "....w......w.",
    "....ww....ww.",
    ".....ww..ww..",
    "b.....####...",
    ".bbb#####o#>>",
    "...#bbbbbb#..",
    ".....bbbb....",
    "......#.#....",
  ], [
    ".............",
    ".............",
    "b.....####...",
    ".bbb#####o#>>",
    "..wwwwbbbbb#.",
    "..w.#bbbb#...",
    ".....####....",
    "......#.#....",
  ]],
  // a crest swept back
  strings: [[
    "....w......w.",
    "....ww.b..ww.",
    ".....ww.bww..",
    "......####...",
    "....#####o#>>",
    "...#bbbbbb#..",
    ".....bbbb....",
    "......#.#....",
  ], [
    ".......b.....",
    "........b....",
    "......####...",
    "....#####o#>>",
    "..wwwwbbbbb#.",
    "..w.#bbbb#...",
    ".....####....",
    "......#.#....",
  ]],
  // a belly of piano keys
  keys: [[
    "....w......w.",
    "....ww....ww.",
    ".....ww..ww..",
    "......####...",
    "....#####o#>>",
    "...#bkbkbk#..",
    ".....kbkb....",
    "......#.#....",
  ], [
    ".............",
    ".............",
    "......####...",
    "....#####o#>>",
    "..wwwwbkbkb#.",
    "..w.#kbkb#...",
    ".....####....",
    "......#.#....",
  ]],
  // chubby, with a short beak
  percussion: [[
    "....w......w.",
    "....ww....ww.",
    ".....ww..ww..",
    ".....#####...",
    "...######o#>.",
    "..#bbbbbbb#..",
    "...bbbbbbb...",
    "......#.#....",
  ], [
    ".............",
    ".............",
    ".....#####...",
    "...######o#>.",
    ".wwwwwbbbbb#.",
    ".w.#bbbbb#...",
    "....#####....",
    "......#.#....",
  ]],
  // an owl: two tufts and two eyes
  rebate: [[
    "....w......w.",
    "....ww....ww.",
    ".....ww..ww..",
    "......#..#...",
    "....###obo#>.",
    "...#bbbbbb#..",
    ".....bbbb....",
    "......#.#....",
  ], [
    ".............",
    ".............",
    "......#..#...",
    "....###obo#>.",
    "..wwwwbbbbb#.",
    "..w.#bbbb#...",
    ".....####....",
    "......#.#....",
  ]],
  // small wings
  chick: [[
    ".............",
    ".............",
    ".....w....w..",
    "......####...",
    "....#####o#>>",
    "...#bbbbbb#..",
    ".....bbbb....",
    "......#.#....",
  ], [
    ".............",
    ".............",
    "......####...",
    "....#####o#>>",
    "...wwbbbbbb#.",
    "....#bbbb#...",
    ".....####....",
    "......#.#....",
  ]],
}
// The same birds resting (in a cage, or sitting on a wire, a tree, a platform or an object): the body of the
// wings-down flap with the wing folded on its side, inside its outline, instead of open behind it
const rest = (shape: SoulShape, wing: readonly [string, string]) => [...SOUL_FRAMES[shape][1].slice(0, 4), ...wing, ...SOUL_FRAMES[shape][1].slice(6)]
export const SOUL_REST: Record<SoulShape, readonly string[]> = {
  wind: rest("wind", ["...#wwwwbbb#.", "....#wwwb#..."]),
  strings: rest("strings", ["...#wwwwbbb#.", "....#wwwb#..."]),
  keys: rest("keys", ["...#wwwkbkb#.", "....#wwkb#..."]),
  percussion: rest("percussion", ["..#wwwwbbbb#.", "...#wwwbb#..."]),
  rebate: rest("rebate", ["...#wwwwbbb#.", "....#wwwb#..."]),
  chick: rest("chick", ["...#wwbbbbb#.", "....#wbbb#..."]),
}
const BLACK_KEY = "#14141c"
export const SOUL_SHADOW = "#000000"

// A soul centred at (x, y), facing `face`, at the moment t (s) of its wing beat. shadow: only its outline, in black
// (one never caught, in the library). still: resting, its wing folded on its body (in a cage, or sitting on a wire, a
// tree, a platform or an object).
export function drawSoulArt(ctx: Ctx, x: number, y: number, face: number, t: number, look: SoulLook, shadow = false, still = false) {
  const up = !still && Math.floor(t * SOUL_SHAPES[look.shape].flap) % 2 === 0
  const rows = still ? SOUL_REST[look.shape] : SOUL_FRAMES[look.shape][up ? 0 : 1], p = look.pixel
  ctx.save(); ctx.translate(x, y); ctx.scale(face < 0 ? -1 : 1, 1)
  const sprite = pixelSprite(rows, shadow ? "shadow" : `${look.eye}|${look.beak}|${look.wing}|${look.belly}|${look.body}`, () => shadow
    ? () => SOUL_SHADOW
    : ch => (ch === "o" ? look.eye : ch === ">" ? look.beak : ch === "w" ? look.wing : ch === "b" ? look.belly : ch === "k" ? BLACK_KEY : look.body))
  stampPixels(ctx, sprite, -SOUL_COLS / 2 * p, -SOUL_ROWS / 2 * p, p)
  // a glowing eye (the body sits a row lower with the wings up)
  if (look.halo && !shadow) { ctx.globalAlpha *= 0.5; ctx.fillStyle = look.eye; ctx.beginPath(); ctx.arc(3 * p, (up ? 0.5 : -0.5) * p, p * 1.4, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}

// How a soul in the world looks: the shape of its entry in the library; a rare one in its own colours, a living one
// in the colour of the alien it was, a dead one grey with its eye in the colour of the note that brought it back.
// Worked out once for each soul, and again when the catalogue changes (an admin editing the sheets).
const looks = new WeakMap<Soul, { v: number; look: SoulLook }>()
export function soulLook(s: Soul): SoulLook {
  const v = soulCatalogVersion()
  let at = looks.get(s)
  if (!at || at.v !== v) {
    at = { v, look: entryLookFor(entryOf(s), s.color) }
    looks.set(s, at)
  }
  return at.look
}
