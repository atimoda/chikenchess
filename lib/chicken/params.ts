// Default movement, animation and sound tuning for the player chicken: the "Leve" class saved in the
// "Pátio da Caipira" prototype (2026-10-29), retuned from the user's live Pátio settings on 2026-11-08.
// The game reads the central configuration (config.ts), saved in the Pátio da Galinha (/patio); these
// values are its fallback and fill any setting the saved version lacks.
// Distances are in screen pixels at full size; the engine scales the ones in CHICKEN_PX_PARAMS on small screens.
// sfx_* pick the cluck of each movement: '' none, 'all' any enabled type, or one type.
// the size the rig is drawn at when the Tamanho setting is 1 (the chicken's usual size)
export const SCALE_BASE = 0.5

export const CHICKEN_PARAMS = {
  // Movimento
  walkSpeed: 255,
  runMultiplier: 2,
  acceleration: 4500,
  deceleration: 900,
  airSpeed: 1.6,
  jumpPush: 0,
  // Agarrar
  climbSpeed: 495,
  clingTilt: 60,
  clingTurnTime: 0.16,
  clingBend: 10,
  wallJump: 0.8,
  clingDropDamage: 5,
  // Movimento
  maxSpeed: 1500,
  fallSideSpeed: 0.5,
  airControl: 0.55,
  backpedal: 50,
  // Arremesso
  throwAirStop: 80,
  throwGroundStop: 90,
  throwPoseAngle: 45,
  throwPoseSpeed: 1,
  // Corrida
  runBoost: 410,
  runBoostTime: 0.3,
  runHeadTilt: 18,
  runLean: 9,
  // Andar (rig das pernas)
  stepTime: 0.17,
  stepGap: 0.24,
  foldPortion: 0.5,
  foldAnkle: 166,
  reachAngle: 35,
  legBend: 0,
  femurAngle: 45,
  femurSwing: 0.3,
  toeCurl: 70,
  // Andar (corpo e cabeça)
  bodyBob: 0.5,
  bodyRock: 2.5,
  bodySway: 1.5,
  headLead: 1,
  headSnapTime: 0.06,
  // Agachar e slide
  crouchDepth: 20,
  crouchSpeed: 0.35,
  crouchSwing: 0.5,
  slideFriction: 450,
  slideTurnBoost: 3,
  slideMinSpeed: 60,
  standBoost: 1.3,
  standBoostTime: 0.4,
  // Chocar
  broodDepth: 60,
  broodSpeed: 10,
  broodEyeDelay: 1,
  // Pulo e queda
  superJump: 2,
  jumpHeight: 130,
  jumpDecay: 0.5,
  stableJump: 4,
  gravity: 2000,
  terminalVelocity: 1100,
  fastFall: 2,
  // Combinações
  broodWalk: 0.4,
  broodStandOnMove: false,
  crouchRunSpeed: 1.6,
  crouchJumpBoost: 0,
  broodJumpBoost: 255,
  airBroodJumpBoost: 570,
  broodJumpVerticalBoost: 570,
  shockingGroundStop: 100,
  shockingAirStop: 80,
  shockingAirMaxMultiplier: 4,
  shockingAirChargeTime: 2,
  shockingAirAfterTimeMultiplier: 2,
  shockingAirKneeBend: 90,
  shockingAirFlapRate: 4,
  shockingBodyDepth: 12,
  shockingLegBend: 12,
  broodJumpFlaps: 1,
  runBroodJumpBoost: 575,
  airRunBroodJumpBoost: 905,
  crouchRunJumpBoost: 0,
  crouchRunBroodJumpBoost: 0,
  // Voo
  flyFallDivisor: 3,
  flyUpFallAtten: 40,
  flyDownFallAtten: 69,
  flapRate: 9,
  jumpFlaps: 2,
  // how many jumps in the air before landing (the chicken's are not counted; Ken has 1, Pig 0)
  airJumps: 99,
  // how much a push (explosion, blow) moves her: 1 = all of it (Pig takes 0.35, Ken 0.8)
  knockbackTaken: 1,
  // health: how much she has (Pig 300, Ken 200 by their class), how long without damage until it comes back and how
  // fast (% of the whole per second); Guarda: how much less the damage from the front hurts Pig (%)
  maxHp: 100,
  regenDelay: 6,
  regenRate: 8,
  guardBlock: 60,
  heldFlapRate: 9,
  jumpFlapRate: 14,
  // Idle
  idleMin: 1,
  idleMax: 3.5,
  blinkMin: 1.5,
  blinkMax: 5,
  // Cacarejo
  volume: 0,
  choke: true,
  snd_cot_forte: true,
  snd_cot_suave: true,
  snd_medio: true,
  snd_grito: true,
  snd_murmurio: false,
  // Sorteio do cacarejo
  pitchJitter: 4,
  volJitter: 0,
  byType: false,
  avoidRepeat: true,
  // Som de cada movimento
  sfx_runStart: 'all',
  sfx_jump: 'all',
  sfx_airJump: 'all',
  sfx_superJump: 'all',
  sfx_broodJump: 'all',
  sfx_runBroodJump: 'all',
  sfx_crouchRunJump: 'all',
  sfx_crouchRunBroodJump: 'all',
  sfx_wallJump: 'all',
  sfx_slideTurn: 'all',
  sfx_pickUp: 'all',
  sfx_grab: '',
  sfx_land: '',
  sfx_dropThrough: '',
  sfx_st_idle: '',
  sfx_st_walk: '',
  sfx_st_lookUp: '',
  sfx_st_brood: '',
  sfx_st_crouch: '',
  sfx_st_slide: '',
  sfx_st_fly: '',
  sfx_st_fastFall: '',
  // Visual
  // 1 = the chicken's usual size: the engine draws her at SCALE_BASE of the rig (the old 0.5)
  scale: 1,
  // marks a saved configuration whose scale is already on that base (older ones are converted when read)
  scaleBase: SCALE_BASE,
}

export type ChickenParams = typeof CHICKEN_PARAMS

export const CHICKEN_PX_PARAMS: (keyof ChickenParams)[] = ['walkSpeed', 'acceleration', 'deceleration', 'jumpPush', 'climbSpeed', 'maxSpeed', 'runBoost', 'slideFriction', 'slideMinSpeed', 'jumpHeight', 'gravity', 'terminalVelocity', 'crouchJumpBoost', 'broodJumpBoost', 'airBroodJumpBoost', 'broodJumpVerticalBoost', 'runBroodJumpBoost', 'airRunBroodJumpBoost', 'crouchRunJumpBoost', 'crouchRunBroodJumpBoost']

// Cluck samples in public/audio/chicken, by type (the ones switched on in the class)
export const CHICKEN_CLUCKS: Record<string, string[]> = {
  cot_forte: ['cot_forte_01', 'cot_forte_02', 'cot_forte_03', 'cot_forte_04', 'cot_forte_05', 'cot_forte_06', 'cot_forte_07', 'cot_forte_08', 'cot_forte_09', 'cot_forte_10', 'cot_forte_11', 'cot_forte_12', 'cot_forte_13', 'cot_forte_14', 'cot_forte_16', 'cot_forte_18', 'cot_forte_20', 'cot_forte_22', 'cot_forte_24', 'cot_forte_26', 'cot_forte_28'],
  cot_suave: ['cot_suave_01', 'cot_suave_02', 'cot_suave_03', 'cot_suave_04', 'cot_suave_05', 'cot_suave_06', 'cot_suave_07', 'cot_suave_08', 'cot_suave_09', 'cot_suave_10', 'cot_suave_11', 'cot_suave_12', 'cot_suave_13', 'cot_suave_14', 'cot_suave_15', 'cot_suave_16', 'cot_suave_17', 'cot_suave_18', 'cot_suave_19', 'cot_suave_20', 'cot_suave_22', 'cot_suave_23', 'cot_suave_24', 'cot_suave_25', 'cot_suave_43', 'cot_suave_45', 'cot_suave_47', 'cot_suave_49', 'cot_suave_51', 'cot_suave_53', 'cot_suave_55', 'cot_suave_57', 'cot_suave_59', 'cot_suave_60', 'cot_suave_61', 'cot_suave_63'],
  medio: ['medio_01', 'medio_02', 'medio_03', 'medio_05', 'medio_07', 'medio_09', 'medio_11', 'medio_12', 'medio_13', 'medio_14', 'medio_15', 'medio_17', 'medio_18'],
  grito: ['grito_04', 'grito_10', 'grito_12', 'grito_17', 'grito_19', 'grito_20'],
  murmurio: ['murmurio_01', 'murmurio_03', 'murmurio_05', 'murmurio_07', 'murmurio_08', 'murmurio_09', 'murmurio_10', 'murmurio_11', 'murmurio_15'],
}

// Breed voices: a breed with clucks of its own replaces the chicken's of every type. A chicken speaks with the
// breed of her beak; the types switched on and each movement's choice stay the class's.
export const CHICKEN_VOICES: Record<string, Record<string, string[]>> = {
  // guinea fowl: its "tô fraco" call is the grito; the soft little cackle covers suave, medio and murmurio; the loud rattle is forte
  angola: (() => {
    const n = (g: string, k: number) => Array.from({ length: k }, (_, i) => `angola_${g}_${String(i + 1).padStart(2, '0')}`)
    const suave = n('suave', 10)
    return { cot_suave: suave, medio: suave, murmurio: suave, cot_forte: n('forte', 13), grito: n('tofraco', 12) }
  })(),
}
// the samples of a type in a voice (a breed without its own clucks uses the chicken's)
export const chickenClucks = (voice: string, type: string): string[] => (CHICKEN_VOICES[voice] ?? CHICKEN_CLUCKS)[type] ?? []
