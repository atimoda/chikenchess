// Text profile tokens: a degree (or a chord "0,2,4") followed by optional articulation marks.
//   !    accent (full velocity)        '    ghost (velocity .45)
//   ?    play chance .5, ?70 = 70 %    *2   ratchet (2–4 hits)
//   ~2   slide from 2 semitones below (~-12 falls from an octave above)
//   _    legato: holds until the next note        <  >   pan left / right
// A dot is a rest. Marks combine in any order: "4!~2", "0'?60", "2_>".
export interface TokenMarks { velocity?: number; chance?: number; ratchet?: number; slide?: number; legato?: boolean; pan?: number }
export interface ProfileToken { degrees: number[]; marks: TokenMarks }

const TOKEN = /^(-?\d+(?:,-?\d+)*)((?:!|'|\?\d{0,3}|\*[2-4]|~-?\d{1,2}|_|<|>)*)$/
const MARK = /!|'|\?\d{0,3}|\*[2-4]|~-?\d{1,2}|_|<|>/g

export const isProfileToken = (token: string) => token === '.' || TOKEN.test(token)

export function parseProfileToken(token: string): ProfileToken | null {
  if (token === '.') return null
  const match = TOKEN.exec(token)
  if (!match) throw new Error(`Invalid profile token "${token}".`)
  const marks: TokenMarks = {}
  for (const [mark] of match[2].matchAll(MARK)) {
    if (mark === '!') marks.velocity = 1
    else if (mark === "'") marks.velocity = .45
    else if (mark[0] === '?') marks.chance = mark.length > 1 ? Math.max(0, Math.min(100, Number(mark.slice(1)))) / 100 : .5
    else if (mark[0] === '*') marks.ratchet = Number(mark.slice(1))
    else if (mark[0] === '~') marks.slide = Math.max(-24, Math.min(24, Number(mark.slice(1))))
    else if (mark === '_') marks.legato = true
    else marks.pan = mark === '<' ? .2 : .8
  }
  return { degrees: match[1].split(',').map(Number), marks }
}
