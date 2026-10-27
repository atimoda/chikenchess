// Movement and animation tuning for the player chicken, from the "Leve" class saved in the
// "Pátio da Caipira" prototype. Distances are in screen pixels at full size; the engine scales the
// ones marked in CHICKEN_PX_PARAMS on small screens so the chicken keeps the same feel.
export const CHICKEN_PARAMS = {
  // Movimento
  walkSpeed: 255,
  runMultiplier: 2,
  acceleration: 1200,
  deceleration: 1600,
  airSpeed: 1.6,
  jumpPush: 120,
  // Agarrar
  climbSpeed: 495,
  clingTilt: 60,
  clingTurnTime: 0.16,
  clingBend: 10,
  wallJump: 0.8,
  // Movimento
  maxSpeed: 1950,
  fallSideSpeed: 0.5,
  airControl: 0.55,
  // Corrida
  runBoost: 60,
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
  crouchDepth: 22,
  crouchSpeed: 0.35,
  crouchSwing: 0.5,
  slideFriction: 450,
  slideTurnBoost: 3,
  slideMinSpeed: 60,
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
  // Voo
  flyFallDivisor: 3,
  flapRate: 9,
  jumpFlaps: 2,
  jumpFlapRate: 14,
  // Idle
  idleMin: 1,
  idleMax: 3.5,
  blinkMin: 1.5,
  blinkMax: 5,
  runCluck: true,
  choke: true,
  // Visual
  scale: 0.95,
  // Cacarejo
  pitchJitter: 4,
  volJitter: 0,

}

export type ChickenParams = typeof CHICKEN_PARAMS

export const CHICKEN_PX_PARAMS: (keyof ChickenParams)[] = ['walkSpeed', 'acceleration', 'deceleration', 'jumpPush', 'climbSpeed', 'maxSpeed', 'runBoost', 'slideFriction', 'slideMinSpeed', 'jumpHeight', 'gravity', 'terminalVelocity']

// Cluck samples in public/audio/chicken, by type
export const CHICKEN_CLUCKS: Record<string, string[]> = {
  cot_forte: ['cot_forte_01', 'cot_forte_20', 'cot_forte_21', 'cot_forte_22', 'cot_forte_24', 'cot_forte_25', 'cot_forte_26', 'cot_forte_28'],
  cot_suave: ['cot_suave_02', 'cot_suave_26', 'cot_suave_27', 'cot_suave_35', 'cot_suave_36', 'cot_suave_59', 'cot_suave_60', 'cot_suave_62'],
  medio: ['medio_02', 'medio_08', 'medio_11', 'medio_12', 'medio_13', 'medio_14'],
  grito: ['grito_04', 'grito_10', 'grito_12', 'grito_17', 'grito_19', 'grito_20'],
}
