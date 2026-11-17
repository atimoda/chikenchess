// The Bomba of the Grade de blocos, drawn once for the item (lib/pigchicken/art.ts: the wing, the inventory, the
// pickups) and for the bomb inside a block (components/pigchicken/mine-grid-layer.tsx): a bundle of dynamite sticks
// tied by two straps, a timer on it and the wires that go from the timer to the cap at the sticks' end.
// In rig units, pointing right, the grip at (0, 0).
export const MINE_BOMB_BOX: [number, number, number, number] = [-19, -15, 58, 30]

// the bars of a seven-segment display each character lights (a: top, then clockwise, g: the middle one)
const BARS: Record<string, string> = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abfgcd', '-': 'g' }
function digit(ch: string, x: number, y: number, w: number, h: number) {
  const m = y + h / 2
  const bar: Record<string, string> = { a: `M${x} ${y}h${w}`, b: `M${x + w} ${y}V${m}`, c: `M${x + w} ${m}V${y + h}`, d: `M${x} ${y + h}h${w}`, e: `M${x} ${m}V${y + h}`, f: `M${x} ${y}V${m}`, g: `M${x} ${m}h${w}` }
  return [...(BARS[ch] ?? '')].map(s => bar[s]).join('')
}
// seconds as the timer shows them: minutes and seconds, two digits each
export function mineBombTime(seconds: number) {
  const s = Math.max(0, Math.min(99 * 60 + 59, Math.ceil(seconds)))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}${String(s % 60).padStart(2, '0')}`
}

// `time`: the seconds on the timer, lit (an armed bomb); without it the timer is off, with four dim dashes, and one
// of the wires is cut (a disarmed one: the item)
export function mineBombSvg(o: { time?: number } = {}) {
  const live = o.time !== undefined, text = live ? mineBombTime(o.time!) : '----'
  // two sticks in front, the end of a third between them at the back
  const stick = (y: number) => `<rect x="-16" y="${y}" width="44" height="12" rx="3" fill="#d92b2b" stroke="#6e1016" stroke-width="1.2"/>
    <path d="M-13 ${y + 2.6}H24" stroke="#f26a62" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>
    <path d="M-13 ${y + 9.6}H24" stroke="#9c1a21" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
    <ellipse cx="27.4" cy="${y + 6}" rx="2.4" ry="5.4" fill="#b3202a" stroke="#6e1016" stroke-width="1"/>`
  const strap = (x: number) => `<rect x="${x}" y="-13.2" width="5.4" height="26.4" rx="1.2" fill="#23272d" stroke="#0c0e11" stroke-width="1"/>
    <path d="M${x + 1.4} -11V11" stroke="#59626e" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/>`
  const x0 = -2.9, w = 3, h = 6.4, y0 = -3.2
  const digits = [0, 4.4, 10.4, 14.8].map((dx, i) => digit(text[i], x0 + dx, y0, w, h)).join('')
  const wires = live
    ? `<path d="M17 1.5 C23 4 26 -9 33 -6" stroke="#f2c230"/><path d="M17 3.4 C24 9 28 -2 33 -4.6" stroke="#4d9bff"/>`
    : `<path d="M17 1.5 C21 3 23 -1 24.5 -4"/><path d="M28.5 -8.5 C30 -8.6 31.5 -7 33 -6" stroke="#f2c230"/><path d="M17 3.4 C24 9 28 -2 33 -4.6" stroke="#4d9bff"/>`
  return `<rect x="-11" y="-9" width="34" height="18" rx="3" fill="#a31c22" stroke="#6e1016" stroke-width="1.2"/>
    ${stick(-12)}${stick(0)}
    ${strap(-12.5)}${strap(18.5)}
    <rect x="-6.2" y="-6.6" width="23.4" height="13.2" rx="2" fill="#12151a" stroke="#9aa3ad" stroke-width="1.3"/>
    <g fill="none" stroke="${live ? '#ff3b30' : '#5a2326'}" stroke-width="1" stroke-linecap="round">
      <path d="${digits}"/><path d="M${x0 + 8.9} -1.4v0.01M${x0 + 8.9} 1.4v0.01"/>
    </g>
    <g fill="none" stroke="#f2c230" stroke-width="1.1" stroke-linecap="round">${wires}</g>
    <rect x="32.4" y="-7.4" width="5.2" height="3.6" rx="1" fill="#23272d" stroke="#0c0e11" stroke-width="0.8"/>`
}
