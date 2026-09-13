import { Chess } from 'chess.js'
import { z } from 'zod'
import type { MusicSnapshot } from './runtime'

export const STATES = {
  opening: 'Abertura (até 20 meios-lances)', middle: 'Meio-jogo', endgame: 'Final (até 10 peças)',
  check: 'Cheque', mate: 'Xeque-mate', stalemate: 'Afogamento', repetition: 'Repetição tripla',
  insufficient: 'Material insuficiente', draw: 'Empate', advantage: 'Vantagem material (≥ 5 pontos)',
} as const
export const EVENTS = {
  firstCastle: 'Primeiro roque', secondCastle: 'Segundo roque', firstCapture: 'Primeira captura', capture: 'Captura',
  queenCapture: 'Captura de rainha', noQueens: 'Nenhuma rainha restante', noKnights: 'Todos os cavalos de um lado capturados',
  noRooks: 'Todas as torres de um lado capturadas', noBishops: 'Todos os bispos de um lado capturados',
  promotion: 'Promoção', underpromotion: 'Subpromoção', enPassant: 'En passant',
  minimumOne: 'Formação mínima de um lado', minimumBoth: 'Formação mínima dos dois lados',
  quiet: '10 meios-lances sem captura nem peão', checkEscape: 'Saída de cheque',
} as const
export const TRIGGERS = { ...STATES, ...EVENTS }
export type Trigger = keyof typeof TRIGGERS
export type Occurrence = { trigger: Trigger; color: 'w' | 'b'; ply: number }
export interface ReactionContext { ply: number; states: Occurrence[]; events: Occurrence[] }
export const ACTIONS = { transpose: 'Transpor (semitons; 2 = 1 tom)', bpm: 'Alterar BPM (%)', scale: 'Trocar escala paralela', relative: 'Relativa maior/menor', mode: 'Rotação modal (graus)', invert: 'Inverter contorno melódico', variation: 'Forçar variação (0=A, 1=B…)', gain: 'Alterar ganho (%)', lpf: 'Filtro passa-baixas (Hz)', activate: 'Ativar banda' } as const
export const SCALE_INTERVALS = {
  'Maior': [0, 2, 4, 5, 7, 9, 11], 'Menor natural': [0, 2, 3, 5, 7, 8, 10],
  'Dórica': [0, 2, 3, 5, 7, 9, 10], 'Mixolídia': [0, 2, 4, 5, 7, 9, 10],
  'Pentatônica menor': [0, 3, 5, 7, 10], 'Pentatônica maior': [0, 2, 4, 7, 9],
} as const
const keys = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]]
export const actionSchema = z.object({ type: z.enum(keys(ACTIONS)), value: z.number().finite().min(-100).max(20000).default(0), scale: z.enum(keys(SCALE_INTERVALS)).default('Maior') }).superRefine((a, ctx) => {
  const limits: Record<keyof typeof ACTIONS, [number, number]> = { transpose: [-12,12], bpm: [-30,30], scale: [0,0], relative:[0,0], mode:[0,6], invert:[0,0], variation:[0,3], gain:[-100,100], lpf:[20,20000], activate:[0,0] }
  const [lo,hi]=limits[a.type]
  if(a.value<lo || a.value>hi || (['transpose','mode','variation'].includes(a.type) && !Number.isInteger(a.value))) ctx.addIssue({code:'custom',message:'Valor fora do limite da ação.'})
})
export const reactionSchema = z.object({ id: z.string().min(1).max(80), trigger: z.enum(keys(TRIGGERS)), enabled: z.boolean(), target: z.enum(['both','w','b','actor','opponent']), duration: z.number().int().min(1).max(32), actions: z.array(actionSchema).max(12) })
export type Reaction = z.infer<typeof reactionSchema>
export const defaultReactions = (): Reaction[] => [{ id:'check-band',trigger:'check',enabled:true,target:'actor',duration:1,actions:[{type:'activate',value:0,scale:'Maior'}] }]
export const reactionsSchema = z.object({ minimumPieces: z.number().int().min(2).max(15).default(4), rules: z.array(reactionSchema).max(48).default(defaultReactions) }).default({ minimumPieces:4,rules:defaultReactions() })
export type Reactions = z.infer<typeof reactionsSchema>
const other = (c:'w'|'b') => c==='w'?'b':'w'

/** Deterministic ledger: undo/redo reconstructs events without applying them twice. */
export function reactionContext(history: readonly string[], minimum=4, initialFen?:string): ReactionContext {
  const chess=new Chess(initialFen), events:Occurrence[]=[]
  const counts=() => { const board=chess.board().flat().filter(p=>p!==null); return { w:board.filter(p=>p.color==='w'), b:board.filter(p=>p.color==='b') } }
  let before=counts(), castles=0, captures=0, quiet=0, wasCheck=false
  history.forEach((san,i)=>{
    const move=chess.move(san), after=counts(), ply=i+1
    const emit=(trigger:Trigger,color=move.color)=>events.push({trigger,color,ply})
    if(move.isKingsideCastle() || move.isQueensideCastle()) emit(++castles===1?'firstCastle':'secondCastle')
    if(move.captured){ emit('capture'); if(++captures===1)emit('firstCapture'); if(move.captured==='q')emit('queenCapture') }
    if(move.promotion){emit('promotion');if(move.promotion!=='q')emit('underpromotion')}
    if(move.isEnPassant())emit('enPassant')
    if(wasCheck)emit('checkEscape')
    if(before.w.some(p=>p.type==='q') || before.b.some(p=>p.type==='q')) if(!after.w.some(p=>p.type==='q')&&!after.b.some(p=>p.type==='q'))emit('noQueens')
    for(const color of ['w','b'] as const){
      for(const [type,event] of [['n','noKnights'],['r','noRooks'],['b','noBishops']] as const) if(before[color].some(p=>p.type===type)&&!after[color].some(p=>p.type===type))emit(event,color)
      if(before[color].length>minimum && after[color].length<=minimum)emit('minimumOne',color)
    }
    if((before.w.length>minimum||before.b.length>minimum)&&after.w.length<=minimum&&after.b.length<=minimum)emit('minimumBoth')
    quiet=move.captured||move.piece==='p'?0:quiet+1
    if(quiet===10)emit('quiet')
    wasCheck=chess.isCheck(); before=after
  })
  const ply=history.length, states:Occurrence[]=[]
  const add=(trigger:Trigger,color:'w'|'b'=chess.turn())=>states.push({trigger,color,ply})
  add(before.w.length+before.b.length<=10?'endgame':ply<=20?'opening':'middle')
  if(chess.isCheck())add('check',other(chess.turn()))
  if(chess.isCheckmate())add('mate',other(chess.turn()))
  if(chess.isStalemate())add('stalemate')
  if(chess.isThreefoldRepetition())add('repetition')
  if(chess.isInsufficientMaterial())add('insufficient')
  if(chess.isDraw())add('draw')
  const values={p:1,n:3,b:3,r:5,q:9,k:0}
  const diff=before.w.reduce((s,p)=>s+values[p.type],0)-before.b.reduce((s,p)=>s+values[p.type],0)
  if(Math.abs(diff)>=5)add('advantage',diff>0?'w':'b')
  return {ply,states,events}
}
const pitchNames=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const pc=(note:string)=>{const m=/^([A-G])([#b]?)/i.exec(note)!; return (({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1].toUpperCase()]!)+(m[2]==='#'?1:m[2]==='b'?-1:0)+12)%12}
const note=(n:number)=>pitchNames[((n%12)+12)%12]+'4'

/** Recompute overlays from the base every time: no drift, no mutation of the kit. */
export function applyReactions(base:MusicSnapshot, config:Reactions, context:ReactionContext) {
  const result={...base,pieces:base.pieces.map(p=>({...p})),effects:Object.fromEntries(Object.entries(base.effects).map(([id,fx])=>[id,{...fx}])),instruments:{...base.instruments},sectionOverrides:{...base.sectionOverrides}}
  const descriptions:string[]=[]
  for(const rule of config.rules){
    if(!rule.enabled)continue
    const matches = rule.trigger in STATES ? context.states : context.events.filter(e=>context.ply-e.ply>=0 && context.ply-e.ply<rule.duration)
    const hit=matches.filter(e=>e.trigger===rule.trigger).at(-1)
    if(!hit)continue
    const color=rule.target==='actor'?hit.color:rule.target==='opponent'?other(hit.color):rule.target
    const ids=result.pieces.filter(p=>color==='both'||p.color===color).map(p=>p.id)
    for(const action of rule.actions){
      const root=pc(result.scale[0])
      if(action.type==='bpm') result.bpm=Math.max(30,Math.min(240,result.bpm*(1+action.value/100)))
      else if(action.type==='scale')result.scale=SCALE_INTERVALS[action.scale].map(n=>note(root+n))
      else if(action.type==='relative'){
        const intervals=result.scale.map(n=>(pc(n)-root+12)%12).join(',')
        if(intervals===SCALE_INTERVALS.Maior.join(','))result.scale=SCALE_INTERVALS['Menor natural'].map(n=>note(root+9+n))
        else if(intervals===SCALE_INTERVALS['Menor natural'].join(','))result.scale=SCALE_INTERVALS.Maior.map(n=>note(root+3+n))
        else {descriptions.push('Relativa ignorada: requer maior ou menor natural.');continue}
      } else if(action.type==='mode') {const offset=action.value%result.scale.length;result.scale=[...result.scale.slice(offset),...result.scale.slice(0,offset)]}
      else if(action.type==='transpose'&&color==='both'){
        result.scale=result.scale.map(n=>note(pc(n)+action.value))
        // Scale pitch classes wrap at C; compensate so -1 remains down one
        // semitone and +12 really raises an octave at the instrument register.
        const octaves=Math.floor((root+action.value)/12)
        if(octaves)for(const id of ids){const inst=result.instruments[id],fx=result.effects[id];if(inst&&fx&&!(inst.source?.kind==='sample'&&!inst.source.pitched))fx.pitch*=2**octaves}
      }
      else for(const id of ids){
        const piece=result.pieces.find(p=>p.id===id)!, inst=result.instruments[id]
        if(action.type==='activate'){piece.active=true;piece.checkEnsemble=true;continue}
        if(action.type==='variation'){result.sectionOverrides[id]=action.value;continue}
        if(!inst)continue
        const fx=result.effects[id]
        if(action.type==='gain'&&fx)fx.gain=Math.max(0,Math.min(2,fx.gain*(1+action.value/100)))
        if(action.type==='transpose'&&fx&&!(inst.source?.kind==='sample'&&!inst.source.pitched))fx.pitch*=2**(action.value/12)
        if(action.type==='lpf') {const automations={...inst.automations};delete automations.lpf;result.instruments[id]={...inst,lpf:action.value,automations};if(fx)fx.lpf=action.value}
        if(action.type==='invert'&&inst.behavior!=='pulse'){const flip=(s:string)=>s.replace(/(^|[\s[<,])(-?\d+)/g,(_,p,n)=>p+(-Number(n)));result.instruments[id]={...inst,notes:flip(inst.notes),phrases:inst.phrases?.map(flip)}}
      }
      descriptions.push(`${TRIGGERS[rule.trigger]} → ${ACTIONS[action.type]} ${action.type==='scale'?action.scale:action.value || ''}`)
    }
  }
  for(const fx of Object.values(result.effects))fx.pitch=Math.max(.125,Math.min(8,fx.pitch))
  return {snapshot:result,descriptions}
}
