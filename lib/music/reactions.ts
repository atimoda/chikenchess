import { Chess } from 'chess.js'
import { z } from 'zod'
import type { MusicSnapshot } from './runtime-types'
import { HARMONY_PLANS, HARMONY_PLAN_IDS, type HarmonyPlanId } from './harmony'
import officialGlobalReactions from '../../data/music/reactions.json'
import { SCALE_SHIFTS, SCALE_SHIFT_IDS, seededIndex, shiftScale } from './scale-shift'
import { instrumentRole } from './sound-design'
import { scaleSectionGain, withoutSectionParams, type SectionParamKey } from './section-params'

export const STATES = {
  opening: 'Opening (first 20 plies)', middle: 'Middlegame', endgame: 'Endgame (≤ 10 pieces)',
  check: 'Check', mate: 'Checkmate', stalemate: 'Stalemate', repetition: 'Threefold repetition',
  insufficient: 'Insufficient material', draw: '50-move rule', advantage: 'Material advantage (≥ 5)',
  tension: 'Tension (balanced evaluation)', captureDrought: 'Capture drought', oppositeCastling: 'Opposite-side castling',
} as const
export const BOARD_EVENTS = {
  firstCastle: 'First castle', secondCastle: 'Second castle', firstCapture: 'First capture', capture: 'Capture',
  queenCapture: 'Queen capture', noQueens: 'No queens left', noKnights: 'Side lost all knights',
  noRooks: 'Side lost all rooks', noBishops: 'Side lost all bishops',
  promotion: 'Promotion', underpromotion: 'Underpromotion', enPassant: 'En passant',
  minimumOne: 'Minimum force (one side)', minimumBoth: 'Minimum force (both sides)',
  quiet: '10 quiet plies', checkEscape: 'Check escape',
  evalSwing: 'Evaluation swing', hangingPiece: 'Undefended piece attacked', advancedPawn: 'Advanced pawn',
} as const
/** Game-dynamics triggers (added with the 2026-10 engine expansion); kits saved before them never authored them. */
export const DYNAMICS_TRIGGERS = ['tension', 'evalSwing', 'hangingPiece', 'advancedPawn', 'captureDrought', 'oppositeCastling'] as const
/** chickenchess actions: powers, Mulligan and Best/Worst hints, recorded by the match itself. */
export const POWER_EVENTS = {
  freeze: 'Freeze applied', shield: 'Shield applied', mulligan: 'Mulligan',
  seeBest: 'Best moves shown', seeWorst: 'Worst moves shown', playBest: 'Best move played', playWorst: 'Worst move played',
} as const
export const EVENTS = { ...BOARD_EVENTS, ...POWER_EVENTS }
export const TRIGGERS = { ...STATES, ...EVENTS }
export type Trigger = keyof typeof TRIGGERS
export type Occurrence = { trigger: Trigger; color: 'w' | 'b'; ply: number }
export interface ReactionContext { ply: number; states: Occurrence[]; events: Occurrence[]; evaluation?: number }
/** Limits of the game-dynamics triggers: centipawns for the evaluation, plies for the drought. */
export const thresholdsSchema = z.object({ tension: z.number().int().min(10).max(300), swing: z.number().int().min(50).max(1000), drought: z.number().int().min(6).max(60) }).partial()
export type Thresholds = z.infer<typeof thresholdsSchema>
export const DEFAULT_THRESHOLDS: Required<Thresholds> = { tension: 50, swing: 200, drought: 16 }
export const ACTIONS = { transpose: 'Transpose', bpm: 'Tempo', scale: 'Fixed scale', scaleShift: 'Scale change', relative: 'Relative major/minor', mode: 'Modal rotation', harmony: 'Harmony plan', invert: 'Invert melody', variation: 'Force variation', gain: 'Gain', lpf: 'Low-pass filter', activate: 'Activate band', hpf: 'High-pass filter', resonance: 'Resonance', reverb: 'Reverb', delay: 'Delay send', drive: 'Drive', pan: 'Pan' } as const
/** Influences that can glide over bars instead of jumping. */
export const RAMPED_ACTIONS = ['bpm', 'gain', 'lpf', 'hpf'] as const
export const INSTRUMENT_FILTERS = { all: 'All instruments', drums: 'Drums', bass: 'Bass', lead: 'Lead', pad: 'Pad / drone', fx: 'FX' } as const
export { SCALE_INTERVALS, SCALE_LABELS } from './scales'
import { SCALE_INTERVALS, SCALE_LABELS, identifyPitchCollection } from './scales'
const keys = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]]
export const actionSchema = z.object({ type: z.enum(keys(ACTIONS)), rampBars: z.number().int().min(0).max(16).optional(), value: z.number().finite().min(-100).max(20000).default(0), scale: z.enum(keys(SCALE_INTERVALS)).default('Maior'), harmony: z.enum([...HARMONY_PLAN_IDS, 'random'] as [HarmonyPlanId | 'random', ...(HarmonyPlanId | 'random')[]]).default('static'), shift: z.enum(SCALE_SHIFT_IDS).optional() }).superRefine((a, ctx) => {
  const limits: Record<keyof typeof ACTIONS, [number, number]> = { transpose: [-12,12], bpm: [-30,30], scale: [0,0], scaleShift: [0,0], relative:[0,0], mode:[0,11], harmony:[0,0], invert:[0,0], variation:[0,7], gain:[-100,100], lpf:[20,20000], activate:[0,0], hpf:[20,20000], resonance:[0,30], reverb:[0,1], delay:[0,1], drive:[0,10], pan:[-1,1] }
  const [lo,hi]=limits[a.type]
  if(a.value<lo || a.value>hi || (['transpose','mode','variation'].includes(a.type) && !Number.isInteger(a.value))) ctx.addIssue({code:'custom',message:'Value outside the action’s limit.'})
})
export const reactionSchema = z.object({ id: z.string().min(1).max(80), trigger: z.enum(keys(TRIGGERS)), enabled: z.boolean(), quantize: z.boolean().default(false), target: z.enum(['both','w','b','actor','opponent']), instruments: z.enum(keys(INSTRUMENT_FILTERS)).optional(), duration: z.number().int().min(0).max(32), actions: z.array(actionSchema).max(12) })
export type Reaction = z.infer<typeof reactionSchema>
const action=(type:keyof typeof ACTIONS,value=0,scale:keyof typeof SCALE_INTERVALS='Maior',rampBars?:number,harmony:HarmonyPlanId|'random'='static')=>({type,value,scale,harmony,...(rampBars===undefined?{}:{rampBars})})
const legacyCheckRule=():Reaction=>({id:'check-band',trigger:'check',enabled:true,quantize:false,target:'actor',duration:1,actions:[action('activate')]})
export const REACTION_PRESET_REVISION='reactions-2026-10-23-global-v2'
/** Frozen copy of the last per-kit factory preset; only migrations compare against it. */
export const legacyFactoryReactions = (): Reaction[] => [
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
const baseReactionsSchema = z.object({ minimumPieces: z.number().int().min(2).max(15).default(4), thresholds: thresholdsSchema.optional(), rules: z.array(reactionSchema).max(80) })
/** Official global set (data/music/reactions.json, editable in Admin). */
export const defaultReactions = (): Reaction[] => baseReactionsSchema.parse(officialGlobalReactions).rules
// Typed from the base schema: naming `Reactions` here would make reactionsSchema's default refer to itself.
export const defaultGlobalReactions = (): z.infer<typeof baseReactionsSchema> => baseReactionsSchema.parse(officialGlobalReactions)
export const reactionsSchema = z.object({ minimumPieces: z.number().int().min(2).max(15).default(4), thresholds: thresholdsSchema.optional(), rules: z.array(reactionSchema).max(80).default(defaultReactions) }).default(()=>defaultGlobalReactions())
/** Resolved rule set: the global set with the kit's overridden triggers swapped in. */
export type Reactions = z.infer<typeof reactionsSchema>

/** A kit stores only what differs from the global set: whole triggers it owns, plus an optional threshold. */
export const kitReactionsSchema = z.object({
  minimumPieces: z.number().int().min(2).max(15).optional(),
  thresholds: thresholdsSchema.optional(),
  overrides: z.array(z.enum(keys(TRIGGERS))).max(Object.keys(TRIGGERS).length).default([]),
  rules: z.array(reactionSchema).max(80).default([]),
}).transform(kit => {
  const overrides = [...new Set(kit.overrides)]
  return { ...kit, overrides, rules: kit.rules.filter(rule => overrides.includes(rule.trigger)) }
}).default({ overrides: [], rules: [] })
export type KitReactions = z.infer<typeof kitReactionsSchema>

/** Keeps the global order; an overridden trigger takes the slot of its first global rule. */
export function resolveReactions(global: Reactions, kit: KitReactions | undefined): Reactions {
  if (!kit) return global
  const owned = new Set(kit.overrides), placed = new Set<Trigger>(), rules: Reaction[] = []
  for (const rule of global.rules) {
    if (!owned.has(rule.trigger)) { rules.push(rule); continue }
    if (placed.has(rule.trigger)) continue
    placed.add(rule.trigger)
    rules.push(...kit.rules.filter(item => item.trigger === rule.trigger))
  }
  rules.push(...kit.rules.filter(rule => !placed.has(rule.trigger)))
  const thresholds = global.thresholds || kit.thresholds ? { ...global.thresholds, ...kit.thresholds } : undefined
  return { minimumPieces: kit.minimumPieces ?? global.minimumPieces, ...(thresholds ? { thresholds } : {}), rules }
}

/** Start a kit override from the current global rules, so editing begins from what plays now. */
export function overrideTrigger(kit: KitReactions, global: Reactions, trigger: Trigger): KitReactions {
  if (kit.overrides.includes(trigger)) return kit
  return { ...kit, overrides: [...kit.overrides, trigger], rules: [...kit.rules, ...global.rules.filter(rule => rule.trigger === trigger).map(rule => ({ ...rule, actions: rule.actions.map(action => ({ ...action })) }))] }
}
export function inheritTrigger(kit: KitReactions, trigger: Trigger): KitReactions {
  return { ...kit, overrides: kit.overrides.filter(item => item !== trigger), rules: kit.rules.filter(rule => rule.trigger !== trigger) }
}

const comparable = (rules: Reaction[], harmony = true) => JSON.stringify(rules.map(rule => ({ ...rule, actions: rule.actions.filter(action => harmony || action.type !== 'harmony').map(action => ({ type: action.type, value: action.value, scale: action.scale, ...(harmony ? { harmony: action.harmony } : {}), ...(action.rampBars === undefined ? {} : { rampBars: action.rampBars }) })) })))
/**
 * Kits saved before the global set carried a full rule list. Triggers still equal to
 * the old factory preset follow the global set; authored triggers become overrides.
 * A trigger missing from a current-revision kit was deleted on purpose (silenced).
 */
export function migrateKitReactions(raw: unknown, revision: unknown): KitReactions {
  const parsed = z.object({ minimumPieces: z.number().int().min(2).max(15).default(4), rules: z.array(reactionSchema).max(80).default([]) }).safeParse(raw)
  if (!parsed.success || isLegacyReactionPreset(parsed.data)) {
    const minimum = parsed.success ? parsed.data.minimumPieces : 4
    return { overrides: [], rules: [], ...(minimum === 4 ? {} : { minimumPieces: minimum }) }
  }
  const { minimumPieces, rules } = parsed.data
  const factory = legacyFactoryReactions(), overrides: Trigger[] = []
  // Power events did not exist before the global set, so old kits never authored them.
  for (const trigger of [...Object.keys(STATES), ...Object.keys(BOARD_EVENTS)].filter(id => !(DYNAMICS_TRIGGERS as readonly string[]).includes(id)) as Trigger[]) {
    const mine = rules.filter(rule => rule.trigger === trigger), stock = factory.filter(rule => rule.trigger === trigger)
    if (!mine.length) { if (revision === 'reactions-2026-09-20-v3') overrides.push(trigger); continue }
    if (comparable(mine) === comparable(stock) || comparable(mine, false) === comparable(stock, false)) continue
    overrides.push(trigger)
  }
  return { overrides, rules: rules.filter(rule => overrides.includes(rule.trigger)), ...(minimumPieces === 4 ? {} : { minimumPieces }) }
}
export function isLegacyReactionPreset(value:unknown){
  const parsed=reactionsSchema.safeParse(value)
  if(!parsed.success)return false
  if(parsed.data.rules.length===1&&JSON.stringify(parsed.data.rules[0])===JSON.stringify(legacyCheckRule()))return true
  const withoutHarmony=(rules:Reaction[])=>rules.map(rule=>({id:rule.id,trigger:rule.trigger,enabled:rule.enabled,quantize:rule.quantize,target:rule.target,duration:rule.duration,actions:rule.actions.filter(action=>action.type!=='harmony').map(action=>({type:action.type,value:action.value,scale:action.scale,...(action.rampBars===undefined?{}:{rampBars:action.rampBars})}))}))
  return JSON.stringify(withoutHarmony(parsed.data.rules))===JSON.stringify(withoutHarmony(legacyFactoryReactions()))
}
const signed=(n:number)=>`${n>0?'+':n<0?'−':'±'}${Math.abs(n)}`
const ramped=(action:{rampBars?:number})=>action.rampBars?` over ${action.rampBars} bar${action.rampBars===1?'':'s'}`:''
/** Short human summary shared by the editor rows and the active-influence list. */
export function actionSummary(action: Reaction['actions'][number]) {
  switch(action.type){
    case 'transpose': return `Transpose ${signed(action.value)} st`
    case 'bpm': return `Tempo ${signed(action.value)}%${action.rampBars?` over ${action.rampBars} bar${action.rampBars===1?'':'s'}`:''}`
    case 'scale': return `Scale → ${SCALE_LABELS[action.scale]} (fixed)`
    case 'harmony': return action.harmony==='random'?'Harmony → random plan':`Harmony → ${HARMONY_PLANS[action.harmony].label}`
    case 'scaleShift': return `Scale → ${SCALE_SHIFTS[action.shift??'relative'].replace(/ \(.*\)$/,'').toLowerCase()}`
    case 'mode': return `Modal rotation ${signed(action.value)}`
    case 'variation': return `Variation ${String.fromCharCode(65+action.value)}`
    case 'gain': return `Gain ${signed(action.value)}%${ramped(action)}`
    case 'lpf': return `Low-pass ${action.value} Hz${ramped(action)}`
    case 'hpf': return `High-pass ${action.value} Hz${ramped(action)}`
    case 'resonance': return `Resonance ${action.value}`
    case 'reverb': return `Reverb ${action.value}`
    case 'delay': return `Delay send ${action.value}`
    case 'drive': return `Drive ${action.value}`
    case 'pan': return `Pan ${action.value < 0 ? 'L' : action.value > 0 ? 'R' : 'C'} ${Math.abs(action.value)}`
    default: return ACTIONS[action.type]
  }
}
const other = (c:'w'|'b') => c==='w'?'b':'w'

/** Deterministic ledger: undo/redo reconstructs events without applying them twice. */
export function reactionContext(history: readonly string[], minimum=4, initialFen?:string, options:DynamicsOptions={}): ReactionContext {
  const chess=new Chess(initialFen), positions:Chess[]=[]
  for(const san of history){
    positions.push(new Chess(chess.fen()))
    chess.move(san)
  }
  return reactionContextFromGame(chess,minimum,positions,options)
}
/** White-side centipawn evaluations by ply (engine analysis); plies without one fall back to material. */
export interface DynamicsOptions { evaluations?: Readonly<Record<number, number>>; thresholds?: Thresholds }
const VALUES={p:1,n:3,b:3,r:5,q:9,k:0} as const
const NON_PAWNS=['n','b','r','q'] as const
/** Squares of non-pawn pieces of a side that the enemy attacks and nobody defends. */
function hangingSquares(position:Chess,color:'w'|'b'){
  const squares=new Set<string>()
  for(const row of position.board())for(const piece of row)if(piece&&piece.color===color&&(NON_PAWNS as readonly string[]).includes(piece.type)&&position.isAttacked(piece.square,other(color))&&!position.isAttacked(piece.square,color))squares.add(piece.square)
  return squares
}

/** Recorded FENs supply material; variant snapshots supply effective check states. */
export function reactionContextFromGame(chess:Chess, minimum=4, positions:readonly Chess[]=[], options:DynamicsOptions={}): ReactionContext {
  const moves=chess.history({verbose:true}), events:Occurrence[]=[]
  const limits={...DEFAULT_THRESHOLDS,...options.thresholds}
  const material=(position:Chess)=>position.board().flat().reduce((sum,p)=>sum+(p?(p.color==='w'?1:-1)*VALUES[p.type]*100:0),0)
  // An engine score and a material count are not comparable, so a swing needs two of the same kind.
  const evaluate=(ply:number,position:Chess)=>{const engine=options.evaluations?.[ply];return engine===undefined?{value:material(position),engine:false}:{value:Math.max(-1000,Math.min(1000,engine)),engine:true}}
  const start=new Chess(moves[0]?.before ?? chess.fen())
  let previousEval=evaluate(0,start), hanging={w:hangingSquares(start,'w'),b:hangingSquares(start,'b')}, lastCapture:number|undefined, castled:{w?:'k'|'q';b?:'k'|'q'}={}
  const counts=(position:Chess) => { const board=position.board().flat().filter(p=>p!==null); return { w:board.filter(p=>p.color==='w'), b:board.filter(p=>p.color==='b') } }
  let before=counts(new Chess(moves[0]?.before ?? chess.fen())), castles=0, captures=0, quiet=0
  moves.forEach((move,i)=>{
    const position=new Chess(move.after), after=counts(position), ply=i+1
    const wasCheck=positions[i]?.isCheck() ?? (i>0 && /[+#]$/.test(moves[i-1].san))
    const emit=(trigger:Trigger,color=move.color)=>events.push({trigger,color,ply})
    if(move.isKingsideCastle() || move.isQueensideCastle()) { emit(++castles===1?'firstCastle':'secondCastle'); castled[move.color]=move.isKingsideCastle()?'k':'q' }
    if(move.captured){ emit('capture'); if(++captures===1)emit('firstCapture'); if(move.captured==='q')emit('queenCapture'); lastCapture=ply }
    if(move.piece==='p'&&(move.color==='w'?['6','7']:['3','2']).includes(move.to[1]))emit('advancedPawn')
    for(const color of ['w','b'] as const){const now=hangingSquares(position,color);if([...now].some(square=>!hanging[color].has(square)))emit('hangingPiece',color);hanging[color]=now}
    const score=evaluate(ply,position)
    if(score.engine===previousEval.engine){
      const flipped=Math.min(previousEval.value,score.value)<=-limits.tension&&Math.max(previousEval.value,score.value)>=limits.tension
      if(flipped||Math.abs(score.value-previousEval.value)>=limits.swing)emit('evalSwing',score.value>previousEval.value?'w':'b')
    }
    previousEval=score
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
  const diff=before.w.reduce((s,p)=>s+VALUES[p.type],0)-before.b.reduce((s,p)=>s+VALUES[p.type],0)
  if(Math.abs(diff)>=5)add('advantage',diff>0?'w':'b')
  if(ply>=30&&Math.abs(previousEval.value)<=limits.tension&&!chess.isCheckmate()&&!chess.isStalemate())add('tension')
  if(lastCapture!==undefined&&ply-lastCapture>=limits.drought)add('captureDrought')
  if(castled.w&&castled.b&&castled.w!==castled.b)add('oppositeCastling')
  return {ply,states,events,evaluation:previousEval.value}
}
/** Merge recorded match actions into the board ledger; occurrences after the current ply (undone) are dropped. */
export function withActionEvents(context: ReactionContext, actions: readonly Occurrence[] = []): ReactionContext {
  const current = actions.filter(action => action.ply <= context.ply)
  return current.length ? { ...context, events: [...context.events, ...current].sort((a, b) => a.ply - b.ply) } : context
}
const pitchNames=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const pc=(note:string)=>{const m=/^([A-G])([#b]?)/i.exec(note)!; return (({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1].toUpperCase()]!)+(m[2]==='#'?1:m[2]==='b'?-1:0)+12)%12}
const note=(n:number)=>pitchNames[((n%12)+12)%12]+'4'

/** Recompute overlays from the base every time: no drift, no mutation of the kit. */
const SECTION_KEYS_BY_ACTION: Partial<Record<string, SectionParamKey[]>> = { lpf: ['lpfRange'], hpf: ['hpf'], resonance: ['resonance'], drive: ['driveRange'], reverb: ['reverbRange'], delay: ['delay'], pan: ['fxPan'] }
export function applyReactions(base:MusicSnapshot, config:Reactions, context:ReactionContext, timed?: ReadonlyMap<string, TimedReaction>, ramps?: ReadonlyMap<string, RampState>) {
  const result={...base,pieces:base.pieces.map(p=>({...p})),effects:Object.fromEntries(Object.entries(base.effects).map(([id,fx])=>[id,{...fx}])),instruments:{...base.instruments},sectionOverrides:{...base.sectionOverrides}}
  const descriptions:string[]=[]
  for(const configured of config.rules){
    const entry=timed?.get(configured.id)
    const rule=entry?.rule ?? configured
    if(!rule.enabled)continue
    const hit=entry ? entry.hit : reactionHit(rule,context)
    if(!hit)continue
    const color=rule.target==='actor'?hit.color:rule.target==='opponent'?other(hit.color):rule.target
    const filter=rule.instruments??'all'
    const ids=result.pieces.filter(p=>(color==='both'||p.color===color)&&(filter==='all'||(result.instruments[p.id]&&instrumentRole(result.instruments[p.id])===filter))).map(p=>p.id)
    const ramp=ramps?.get(rule.id)
    for(const [index,action] of rule.actions.entries()){
      const glides=(RAMPED_ACTIONS as readonly string[]).includes(action.type)&&action.type!=='bpm'&&!!action.rampBars
      // A leaving rule keeps only its gliding influences while they return; the rest left at once.
      if(ramp?.fading&&!glides)continue
      const amount=glides?ramp?.progress??1:1
      const root=pc(result.scale[0]), seed=`${rule.id}|${hit.trigger}|${hit.color}|${hit.ply}|${index}`
      // Tonic moves keep the register: compensate the octave when the pitch class wraps past C.
      const keepRegister=(move:number)=>{const octaves=Math.floor((root+move)/12);if(octaves)for(const piece of result.pieces){const inst=result.instruments[piece.id],fx=result.effects[piece.id];if(inst&&fx&&!(inst.source?.kind==='sample'&&!inst.source.pitched))fx.pitch*=2**octaves}}
      if(action.type==='bpm') result.bpm=Math.max(30,Math.min(240,result.bpm*(1+action.value/100)))
      else if(action.type==='scale')result.scale=SCALE_INTERVALS[action.scale].map(n=>note(root+n))
      else if(action.type==='scaleShift'){
        const shifted=shiftScale(result.scale,action.shift??'relative',seed)
        if(shifted.skipped){descriptions.push(`${TRIGGERS[rule.trigger]} → scale change skipped: ${shifted.skipped}.`);continue}
        result.scale=shifted.scale
        if(shifted.rootMove)keepRegister(shifted.rootMove)
        descriptions.push(`${TRIGGERS[rule.trigger]} → ${SCALE_SHIFTS[shifted.applied].replace(/ \(.*\)$/,'')}: ${identifyPitchCollection(result.scale).root} ${identifyPitchCollection(result.scale).label}`)
        continue
      }
      else if(action.type==='harmony'){
        if(action.harmony!=='random')result.harmony=action.harmony
        else{
          const options=HARMONY_PLAN_IDS.filter(id=>id!=='kit'&&id!=='static'&&id!==result.harmony)
          result.harmony=options[seededIndex(seed,options.length)]
          descriptions.push(`${TRIGGERS[rule.trigger]} → Harmony → ${HARMONY_PLANS[result.harmony].label} (random)`)
          continue
        }
      }
      else if(action.type==='relative'){
        const intervals=result.scale.map(n=>(pc(n)-root+12)%12).join(',')
        if(intervals===SCALE_INTERVALS.Maior.join(','))result.scale=SCALE_INTERVALS['Menor natural'].map(n=>note(root+9+n))
        else if(intervals===SCALE_INTERVALS['Menor natural'].join(','))result.scale=SCALE_INTERVALS.Maior.map(n=>note(root+3+n))
        else {descriptions.push('Relative skipped: needs a major or natural minor scale.');continue}
      } else if(action.type==='mode') {const offset=action.value%result.scale.length;result.scale=[...result.scale.slice(offset),...result.scale.slice(0,offset)]}
      else if(action.type==='transpose'&&color==='both'&&filter==='all'){
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
        const factor=1+action.value/100
        if(action.type==='gain'&&fx){const scale=(gain:number)=>Math.max(0,Math.min(2,gain*(factor>0?factor**amount:1-amount)));fx.gain=scale(fx.gain);result.instruments[id]=scaleSectionGain(result.instruments[id],scale)}
        // A rule's value wins over the sections' own value for the same parameter.
        const ruled=SECTION_KEYS_BY_ACTION[action.type]
        if(ruled&&result.instruments[id])result.instruments[id]=withoutSectionParams(result.instruments[id],ruled)
        if(action.type==='transpose'&&fx&&!(inst.source?.kind==='sample'&&!inst.source.pitched))fx.pitch*=2**(action.value/12)
        if(action.type==='lpf') {const lpf=glide(fx?.lpf??inst.lpf,action.value,amount);result.instruments[id]={...result.instruments[id],lpf,lpfRange:undefined};if(fx)fx.lpf=lpf}
        if(action.type==='hpf') {const hpf=glide(fx?.hpf??inst.hpf,action.value,amount);result.instruments[id]={...result.instruments[id],hpf};if(fx)fx.hpf=hpf}
        if(action.type==='resonance')result.instruments[id]={...result.instruments[id],resonance:action.value}
        if(action.type==='drive')result.instruments[id]={...result.instruments[id],distortion:action.value,driveRange:undefined}
        if(action.type==='reverb'&&fx){fx.reverb=action.value;result.instruments[id]={...result.instruments[id],reverbRange:undefined}}
        if(action.type==='delay'&&fx)fx.delay=action.value
        if(action.type==='pan'&&fx)fx.pan=action.value
        if(action.type==='invert'&&inst.behavior!=='pulse'){result.instruments[id]={...result.instruments[id],pianoRolls:inst.pianoRolls.map(roll=>({...roll,notes:roll.notes.map(n=>({...n,degree:-n.degree}))}))}}
      }
      descriptions.push(`${TRIGGERS[rule.trigger]} → ${actionSummary(action)}`)
    }
  }
  for(const fx of Object.values(result.effects))fx.pitch=Math.max(.125,Math.min(8,fx.pitch))
  return {snapshot:result,descriptions}
}

export type TimedReaction = { rule: Reaction; hit: Occurrence | undefined }
/** How far a rule's gliding influences have travelled (0–1); fading rules are returning to the base. */
export type RampState = { progress: number; fading: boolean }
/** Filter glides are exponential so each bar moves the same musical interval. */
const glide=(from:number,to:number,amount:number)=>amount>=1?to:Math.max(1,from)*(to/Math.max(1,from))**amount
export function reactionHit(rule: Reaction, context: ReactionContext) {
  const matches = rule.trigger in STATES ? context.states : context.events.filter(e => context.ply-e.ply>=0 && (rule.duration===0 || context.ply-e.ply<rule.duration))
  return matches.filter(e=>e.trigger===rule.trigger).at(-1)
}
/** Only active influences are queued; inactive edits need no transport work. */
export function reactionEntries(config: Reactions, context: ReactionContext) {
  return new Map(config.rules.map(rule => [rule.id, { rule, hit: rule.enabled ? reactionHit(rule,context) : undefined }]))
}
