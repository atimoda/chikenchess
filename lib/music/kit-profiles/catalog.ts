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

export const STYLE_PROFILES: Record<string, StyleProfile> = {
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
}
