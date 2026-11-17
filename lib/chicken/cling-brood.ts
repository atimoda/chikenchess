// Brooding while grabbed (Chocar on a wall or hanging from a ceiling). Pure: the engine (engine.ts) applies it.
// Brood held on a grab is the same brood as on the ground, in the grab's frame: the body settles onto the surface
// with the legs folded under it (broodDepth, broodSpeed), the eyes close (broodEyeDelay), she keeps looking the way
// she looked and moves along the surface at the brooding walk's share of the climbing speed (broodWalk; 0 keeps her
// still), which Run does not speed up. The grab keeps what is its own: the body's angle and lean (clingTilt), how
// fast she stops, and the gestures of Jump (wall jump, letting go, switching side). Brood is no longer a way down:
// only Down/Crouch climbs down a wall or stretches her head under a ceiling. There is no fixed brood on a grab:
// letting go of Brood ends it.
export function clingSpeedLimit(climbSpeed: number, broodWalk: number, brood: boolean, run: boolean) {
  return brood ? climbSpeed * Math.max(0, broodWalk) : climbSpeed * (run ? 1.5 : 1)
}

// the animation of a grabbed bird. hanging: under a ceiling (she walks, crouches and looks like on the ground, with
// Up and Down swapped); up/down: the controls held; brood wins over all of them
export function clingAnim(hanging: boolean, speed: number, climbSpeed: number, up: boolean, down: boolean, brood: boolean) {
  if (brood) return 'brood'
  if (!hanging) return 'cling'
  return speed > 5 ? (speed > climbSpeed * 1.2 ? 'run' : 'walk') : up ? 'crouch' : down ? 'lookUp' : 'idle'
}
