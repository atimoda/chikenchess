import { Chess } from 'chess.js'
import { z } from 'zod'
import type { MusicSnapshot } from './runtime-types'
import { HARMONY_PLANS, HARMONY_PLAN_IDS, type HarmonyPlanId } from './harmony'

export const STATES = {
  opening: 'Abertura (até 20 meios-lances)', middle: 'Meio-jogo', endgame: 'Final (até 10 peças)',
  check: 'Cheque', mate: 'Xeque-mate', stalemate: 'Afogamento', repetition: 'Repetição tripla',
  insufficient: 'Material insuficiente', draw: 'Regra dos 50 lances', advantage: 'Vantagem material (≥ 5 pontos)',
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
export const ACTIONS = { transpose: 'Transpor (semitons; 2 = 1 tom)', bpm: 'Alterar BPM (%)', scale: 'Trocar escala paralela', relative: 'Relativa maior/menor', mode: 'Rotação modal (graus)', harmony: 'Trocar plano harmônico', invert: 'Inverter contorno melódico', variation: 'Forçar variação (0=A, 1=B…)', gain: 'Alterar ganho (%)', lpf: 'Filtro passa-baixas (Hz)', activate: 'Ativar banda' } as const
export { SCALE_INTERVALS } from './scales'
import { SCALE_INTERVALS } from './scales'
const keys = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]]
export const actionSchema = z.object({ type: z.enum(keys(ACTIONS)), rampBars: z.number().int().min(0).max(16).optional(), value: z.number().finite().min(-100).max(20000).default(0), scale: z.enum(keys(SCALE_INTERVALS)).default('Maior'), harmony: z.enum(HARMONY_PLAN_IDS).default('static') }).superRefine((a, ctx) => {
  const limits: Record<keyof typeof ACTIONS, [number, number]> = { transpose: [-12,12], bpm: [-30,30], scale: [0,0], relative:[0,0], mode:[0,11], harmony:[0,0], invert:[0,0], variation:[0,7], gain:[-100,100], lpf:[20,20000], activate:[0,0] }
  const [lo,hi]=limits[a.type]
  if(a.value<lo || a.value>hi || (['transpose','mode','variation'].includes(a.type) && !Number.isInteger(a.value))) ctx.addIssue({code:'custom',message:'Valor fora do limite da ação.'})
})
export const reactionSchema = z.object({ id: z.string().min(1).max(80), trigger: z.enum(keys(TRIGGERS)), enabled: z.boolean(), quantize: z.boolean().default(false), target: z.enum(['both','w','b','actor','opponent']), duration: z.number().int().min(0).max(32), actions: z.array(actionSchema).max(12) })
export type Reaction = z.infer<typeof reactionSchema>
const action=(type:keyof typeof ACTIONS,value=0,scale:keyof typeof SCALE_INTERVALS='Maior',rampBars?:number,harmony:HarmonyPlanId='static')=>({type,value,scale,harmony,...(rampBars===undefined?{}:{rampBars})})
const legacyCheckRule=():Reaction=>({id:'check-band',trigger:'check',enabled:true,quantize:false,target:'actor',duration:1,actions:[action('activate')]})
export const REACTION_PRESET_REVISION='reactions-2026-09-20-v3'
export const defaultReactions = (): Reaction[] => [
  {id:'check-band',trigger:'check',enabled:true,quantize:false,target:'actor',duration:1,actions:[action('activate'),action('gain',6)]},
  {id:'phase-opening',trigger:'opening',enabled:true,quantize:true,target:'both',duration:1,actions:[action('gain',-8)]},
  {id:'phase-middle',trigger:'middle',enabled:true,quantize:true,target:'both',duration:1,actions:[action('gain',3)]},
  {id:'phase-endgame',trigger:'endgame',enabled:true,quantize:true,target:'both',duration:1,actions:[action('bpm',-6,'Maior',4),action('gain',8),action('harmony',0,'Maior',undefined,'cadence')]},
  {id:'state-mate',trigger:'mate',enabled:true,quantize:false,target:'actor',duration:1,actions:[action('activate'),action('gain',20),action('transpose',12),action('variation',3)]},
  {id:'state-stalemate',trigger:'stalemate',enabled:true,quantize:true,target:'both',duration:1,actions:[action('scale',0,'Whole tone'),action('gain',-18)]},
  {id:'state-repetition',trigger:'repetition',enabled:true,quantize:true,target:'both',duration:1,actions:[action('invert'),action('bpm',-6,'Maior',2)]},
  {id:'state-insufficient',trigger:'insufficient',enabled:true,quantize:true,target:'both',duration:1,actions:[action('lpf',1800),action('gain',-20)]},
  {id:'state-fifty-move',trigger:'draw',enabled:true,quantize:true,target:'both',duration:1,actions:[action('relative'),action('bpm',-8,'Maior',4)]},
  {id:'state-advantage',trigger:'advantage',enabled:true,quantize:false,target:'actor',duration:1,actions:[action('gain',8)]},
  {id:'event-first-castle',trigger:'firstCastle',enabled:true,quantize:true,target:'both',duration:2,actions:[action('bpm',2,'Maior',4)]},
  {id:'event-second-castle',trigger:'secondCastle',enabled:true,quantize:true,target:'both',duration:2,actions:[action('variation',1),action('gain',4)]},
  {id:'event-first-capture',trigger:'firstCapture',enabled:true,quantize:false,target:'actor',duration:2,actions:[action('variation',1),action('gain',5)]},
  {id:'event-capture',trigger:'capture',enabled:true,quantize:false,target:'actor',duration:1,actions:[action('gain',3)]},
  {id:'event-queen-capture',trigger:'queenCapture',enabled:true,quantize:true,target:'actor',duration:2,actions:[action('variation',2),action('gain',12)]},
  {id:'event-no-queens',trigger:'noQueens',enabled:true,quantize:true,target:'both',duration:0,actions:[action('mode',1),action('bpm',-3,'Maior',4),action('harmony',0,'Maior',undefined,'descent')]},
  {id:'event-no-knights',trigger:'noKnights',enabled:true,quantize:false,target:'actor',duration:2,actions:[action('transpose',-2)]},
  {id:'event-no-rooks',trigger:'noRooks',enabled:true,quantize:false,target:'actor',duration:2,actions:[action('gain',-12)]},
  {id:'event-no-bishops',trigger:'noBishops',enabled:true,quantize:false,target:'actor',duration:2,actions:[action('lpf',3200)]},
  {id:'event-promotion',trigger:'promotion',enabled:true,quantize:true,target:'actor',duration:2,actions:[action('transpose',12),action('variation',3),action('gain',15),action('harmony',0,'Maior',undefined,'ascent')]},
  {id:'event-underpromotion',trigger:'underpromotion',enabled:true,quantize:false,target:'actor',duration:2,actions:[action('invert'),action('variation',3)]},
  {id:'event-en-passant',trigger:'enPassant',enabled:true,quantize:false,target:'both',duration:1,actions:[action('mode',1)]},
  {id:'event-minimum-one',trigger:'minimumOne',enabled:true,quantize:true,target:'actor',duration:0,actions:[action('gain',15)]},
  {id:'event-minimum-both',trigger:'minimumBoth',enabled:true,quantize:true,target:'both',duration:0,actions:[action('bpm',-8,'Maior',4),action('variation',2),action('harmony',0,'Maior',undefined,'circle')]},
  {id:'event-quiet',trigger:'quiet',enabled:true,quantize:true,target:'both',duration:2,actions:[action('lpf',2400),action('gain',-10)]},
  {id:'event-check-escape',trigger:'checkEscape',enabled:true,quantize:false,target:'actor',duration:1,actions:[action('gain',5)]},
]
export const reactionsSchema = z.object({ minimumPieces: z.number().int().min(2).max(15).default(4), rules: z.array(reactionSchema).max(80).default(defaultReactions) }).default({ minimumPieces:4,rules:defaultReactions() })
export type Reactions = z.infer<typeof reactionsSchema>
export function isLegacyReactionPreset(value:unknown){
  const parsed=reactionsSchema.safeParse(value)
  if(!parsed.success)return false
  if(parsed.data.rules.length===1&&JSON.stringify(parsed.data.rules[0])===JSON.stringify(legacyCheckRule()))return true
  const withoutHarmony=(rules:Reaction[])=>rules.map(rule=>({id:rule.id,trigger:rule.trigger,enabled:rule.enabled,quantize:rule.quantize,target:rule.target,duration:rule.duration,actions:rule.actions.filter(action=>action.type!=='harmony').map(action=>({type:action.type,value:action.value,scale:action.scale,...(action.rampBars===undefined?{}:{rampBars:action.rampBars})}))}))
  return JSON.stringify(withoutHarmony(parsed.data.rules))===JSON.stringify(withoutHarmony(defaultReactions()))
}
const other = (c:'w'|'b') => c==='w'?'b':'w'

/** Deterministic ledger: undo/redo reconstructs events without applying them twice. */
export function reactionContext(history: readonly string[], minimum=4, initialFen?:string): ReactionContext {
  const chess=new Chess(initialFen), positions:Chess[]=[]
  for(const san of history){
    positions.push(new Chess(chess.fen()))
    chess.move(san)
  }
  return reactionContextFromGame(chess,minimum,positions)
}

/** Recorded FENs supply material; variant snapshots supply effective check states. */
export function reactionContextFromGame(chess:Chess, minimum=4, positions:readonly Chess[]=[]): ReactionContext {
  const moves=chess.history({verbose:true}), events:Occurrence[]=[]
  const counts=(position:Chess) => { const board=position.board().flat().filter(p=>p!==null); return { w:board.filter(p=>p.color==='w'), b:board.filter(p=>p.color==='b') } }
  let before=counts(new Chess(moves[0]?.before ?? chess.fen())), castles=0, captures=0, quiet=0
  moves.forEach((move,i)=>{
    const after=counts(new Chess(move.after)), ply=i+1
    const wasCheck=positions[i]?.isCheck() ?? (i>0 && /[+#]$/.test(moves[i-1].san))
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
    before=after
  })
  const ply=moves.length, states:Occurrence[]=[]
  const add=(trigger:Trigger,color:'w'|'b'=chess.turn())=>states.push({trigger,color,ply})
  add(before.w.length+before.b.length<=10?'endgame':ply<=20?'opening':'middle')
  if(chess.isCheck())add('check',other(chess.turn()))
  if(chess.isCheckmate())add('mate',other(chess.turn()))
  if(chess.isStalemate())add('stalemate')
  if(chess.isThreefoldRepetition())add('repetition')
  if(chess.isInsufficientMaterial())add('insufficient')
  if(chess.isDrawByFiftyMoves())add('draw')
  const values={p:1,n:3,b:3,r:5,q:9,k:0}
  const diff=before.w.reduce((s,p)=>s+values[p.type],0)-before.b.reduce((s,p)=>s+values[p.type],0)
  if(Math.abs(diff)>=5)add('advantage',diff>0?'w':'b')
  return {ply,states,events}
}
const pitchNames=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const pc=(note:string)=>{const m=/^([A-G])([#b]?)/i.exec(note)!; return (({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1].toUpperCase()]!)+(m[2]==='#'?1:m[2]==='b'?-1:0)+12)%12}
const note=(n:number)=>pitchNames[((n%12)+12)%12]+'4'

/** Recompute overlays from the base every time: no drift, no mutation of the kit. */
export function applyReactions(base:MusicSnapshot, config:Reactions, context:ReactionContext, timed?: ReadonlyMap<string, TimedReaction>) {
  const result={...base,pieces:base.pieces.map(p=>({...p})),effects:Object.fromEntries(Object.entries(base.effects).map(([id,fx])=>[id,{...fx}])),instruments:{...base.instruments},sectionOverrides:{...base.sectionOverrides}}
  const descriptions:string[]=[]
  for(const configured of config.rules){
    const entry=timed?.get(configured.id)
    const rule=entry?.rule ?? configured
    if(!rule.enabled)continue
    const hit=entry ? entry.hit : reactionHit(rule,context)
    if(!hit)continue
    const color=rule.target==='actor'?hit.color:rule.target==='opponent'?other(hit.color):rule.target
    const ids=result.pieces.filter(p=>color==='both'||p.color===color).map(p=>p.id)
    for(const action of rule.actions){
      const root=pc(result.scale[0])
      if(action.type==='bpm') result.bpm=Math.max(30,Math.min(240,result.bpm*(1+action.value/100)))
      else if(action.type==='scale')result.scale=SCALE_INTERVALS[action.scale].map(n=>note(root+n))
      else if(action.type==='harmony'){result.harmony=action.harmony}
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
        if(action.type==='lpf') {result.instruments[id]={...inst,lpf:action.value,lpfRange:undefined};if(fx)fx.lpf=action.value}
        if(action.type==='invert'&&inst.behavior!=='pulse'){result.instruments[id]={...inst,pianoRolls:inst.pianoRolls.map(roll=>({...roll,notes:roll.notes.map(n=>({...n,degree:-n.degree}))}))}}
      }
      descriptions.push(`${TRIGGERS[rule.trigger]} → ${ACTIONS[action.type]} ${action.type==='scale'?action.scale:action.type==='harmony'?HARMONY_PLANS[action.harmony].label:action.value || ''}`)
    }
  }
  for(const fx of Object.values(result.effects))fx.pitch=Math.max(.125,Math.min(8,fx.pitch))
  return {snapshot:result,descriptions}
}

export type TimedReaction = { rule: Reaction; hit: Occurrence | undefined }
export function reactionHit(rule: Reaction, context: ReactionContext) {
  const matches = rule.trigger in STATES ? context.states : context.events.filter(e => context.ply-e.ply>=0 && (rule.duration===0 || context.ply-e.ply<rule.duration))
  return matches.filter(e=>e.trigger===rule.trigger).at(-1)
}
/** Only active influences are queued; inactive edits need no transport work. */
export function reactionEntries(config: Reactions, context: ReactionContext) {
  return new Map(config.rules.map(rule => [rule.id, { rule, hit: rule.enabled ? reactionHit(rule,context) : undefined }]))
}
