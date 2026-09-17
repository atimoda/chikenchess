// Finite pattern inspection, validation and conversion for the editor.
import { compileVoice } from './pattern-compiler'
import { voiceSpecs } from './voice-spec'
import { loadLibrary } from './strudel-loader'
import type { PianoRoll } from './piano-roll'
import type { NoteEvent } from './monitor'
import type { Strudel, MusicSnapshot, VoiceSpec } from './runtime-types'

// Only the inspected voice gets a variation preview. Compile once per edit and
// cache four-cycle windows; UI clock ticks never rebuild these patterns.
export function compileVoiceVariations(api: Strudel, voice: VoiceSpec, limit=24) {
  const banks = [voice.phrases.length, voice.groove?.rhythms.length ?? 1, voice.groove?.accents.length ?? 1,
    ...Object.values(voice.automations ?? {}).map(a => a.kind === 'pattern' ? a.patterns.length : 1)]
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a
  const count = Math.min(limit, banks.reduce((a, b) => a * b / gcd(a, b), 1))
  const timeline = api.mini(voice.sectionPattern)
  const patterns = Array.from({ length: count }, (_, index) => compileVoice(api, { ...voice, performance:undefined, sectionPattern: String(index), mask: undefined }))
  const actual = compileVoice(api, { ...voice, mask: undefined })
  const cache = new Map<number, { key: string; events: NoteEvent[] }>()
  let cachedCycle = -1, sectionEvents: any[] = []
  return (cycle: number) => {
    if (Math.floor(cycle) !== cachedCycle) {
      cachedCycle = Math.floor(cycle)
      sectionEvents = timeline.queryArc(cachedCycle, cachedCycle + 1)
    }
    const section = sectionEvents.find(h => Number(h.part.begin) <= cycle && Number(h.part.end) > cycle)
    const index = ((Number(section?.value ?? 0) % count) + count) % count
    const banked = voice.performance ? voice.performance.restart : !/^\d+$/.test(voice.sectionPattern) && !voice.pianoRolls?.some(Boolean) && banks.some(n => n > 1)
    const sectionStart = banked ? Number(section?.whole?.begin ?? 0) : 0
    const phase = Math.max(0, cycle - sectionStart)
    return patterns.map((pattern, i) => {
      const start = i === index ? Math.floor(phase / 4) * 4 : 0
      const queryStart = i === index ? sectionStart + start : 0
      const queryEnd = i === index && banked ? Math.min(queryStart + 4, Number(section?.whole?.end ?? queryStart + 4)) : queryStart + 4
      const key = `${i === index}:${queryStart}:${queryEnd}`
      let window = cache.get(i)
      if (!window || window.key !== key) {
        const events = (i === index ? actual : pattern).queryArc(queryStart, queryEnd).slice(0, 512).map((hap: any) => ({
          start: Math.max(0, Number(hap.whole?.begin ?? hap.part.begin) - queryStart),
          end: Math.min(queryEnd - queryStart, Number(hap.whole?.end ?? hap.part.end) - queryStart),
          note: voice.unpitched ? null : Number(hap.value.note),
          gain: Number(hap.value.gain ?? 1) * Number(hap.value.velocity ?? 1),
        }))
        window = { key, events }; cache.set(i, window)
      }
      return { index: i, active: i === index, cursor: phase - start, start, events: window.events,
        phrase: voice.instrument.phrases?.[i % voice.phrases.length] ?? voice.instrument.notes,
        rhythm: voice.groove?.rhythms[i % voice.groove.rhythms.length] }
    })
  }
}

export async function prepareVoiceVariations(state: MusicSnapshot, id: string, limit=24) {
  const api = await loadLibrary()
  const voice = voiceSpecs({ ...state, playing: true, pieces: state.pieces.filter(p => p.id === id).map(p => ({ ...p, active: true })) }, null)[0]
  return voice ? compileVoiceVariations(api, voice, limit) : null
}

// Validate inactive tracks too, without opening an AudioContext or playing sound.
export async function validateMusicSnapshot(state: MusicSnapshot) {
  const api = await loadLibrary()
  for (const voice of voiceSpecs({ ...state, playing: true, pieces: state.pieces.map(p => ({ ...p, active: true })) }, null)) {
    // Audit all sections without entry masks hiding invalid or very dense parts.
    for (let section = 0; section < Math.max(voice.phrases.length,4); section++) {
      const pattern = compileVoice(api, { ...voice, performance: undefined, mask: undefined, sectionPattern: String(section) })
      for (let cycle = 0; cycle < 8; cycle++) {
        if (pattern.queryArc(cycle, cycle + 1).length > 128) throw new Error(`${voice.instrument.name}: reduza a densidade do padrão.`)
      }
    }
  }
}

/** Convert a bounded window of a source variation to editable scale degrees. */
export async function preparePianoRoll(state:MusicSnapshot,id:string,index:number,bars=4):Promise<PianoRoll> {
  const api=await loadLibrary()
  const voice=voiceSpecs({...state,playing:true,pieces:state.pieces.map(p=>({...p,active:true}))},null).find(v=>v.piece.id===id)
  if(!voice)throw new Error('Peça inexistente.')
  const phrases=voice.instrument.phrases?.length?voice.instrument.phrases:[voice.instrument.notes]
  const raw={...voice,performance:undefined,phrases,notes:phrases[0],pianoRolls:undefined,unpitched:false,mask:undefined,sectionPattern:String(index)}
  const haps=compileVoice(api,raw).queryArc(0,bars)
  if(haps.length>128)throw new Error('Mais de 128 notas nesta janela. Reduza a duração antes de converter.')
  return {bars,notes:haps.map((h:any)=>({start:Math.max(0,Number(h.whole.begin)),duration:Math.min(bars,Number(h.whole.end))-Math.max(0,Number(h.whole.begin)),degree:Number(h.value.note),velocity:Math.max(0,Math.min(1,Number(h.value.velocity??1)))})).filter((n:{duration:number})=>n.duration>=1/48)}
}
