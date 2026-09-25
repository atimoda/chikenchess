// City-specific authoring lives in the sibling profile files. Manchester 1999 has its own composer.
import type { StyleProfile } from './types'
import { profile as dusseldorf } from './dusseldorf'
import { profile as nyc } from './nyc'
import { profile as chicago } from './chicago'
import { profile as detroit } from './detroit'
import { profile as ibiza } from './ibiza'
import { profile as manchester } from './manchester'
import { profile as berlin } from './berlin'
import { profile as tokyo } from './tokyo'
import { profile as london } from './london'
import { profile as saopaulo } from './saopaulo'
import { profile as paris } from './paris'
import { profile as vienna } from './vienna'
import { profile as johannesburg } from './johannesburg'
import { profile as buenosAires1940 } from './buenos-aires-1940'
import { profile as dublin1990 } from './dublin-1990'
import { profile as newOrleans1953 } from './new-orleans-1953'
import { HARMONIC_STAGE_PROFILES } from './harmonic-stages'
import { curateTimbres } from './timbre-curation'

const authoredProfiles: Record<string, StyleProfile> = {
  dusseldorf,
  nyc,
  chicago,
  detroit,
  ibiza,
  manchester,
  berlin,
  tokyo,
  london,
  saopaulo,
  paris,
  vienna,
  johannesburg,
  'buenos-aires-1940': buenosAires1940,
  'dublin-1990': dublin1990,
  'new-orleans-1953': newOrleans1953,
  ...HARMONIC_STAGE_PROFILES,
}

export const STYLE_PROFILES: Record<string, StyleProfile> = Object.fromEntries(
  Object.entries(authoredProfiles).map(([id, profile]) => [id, curateTimbres(id, profile)]),
)
