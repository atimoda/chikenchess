// The fases de notas playing in the Pátio: each one bound to the zone where it began (the Zona sonora of the map
// there, else the scene's own), at most one per zone, several at once in different zones. A request in a zone that
// already plays one is refused and nothing is interrupted (the editor's "Tocar daqui" takes the place of its own
// draft). Each stage hands back its result the frame it ends; the ended ones stay a few seconds for their banners.
import { BUILTIN_VARIANTS, type Catalog } from './alien-catalog'
import { createNoteStage, isStageSource, type NoteStage, type NoteStageIO, type StageRequest, type StageResult } from './note-stage'
import type { NoteShot } from './note-shots'

export type StageAsk = 'ok' | 'busy'

export function createNoteStages() {
  let catalog: Catalog = BUILTIN_VARIANTS
  const list: NoteStage[] = []
  const queued: StageRequest[] = []
  const results: StageResult[] = []
  const playing = () => list.filter(s => s.active)
  const at = (zone: string) => list.find(s => s.active && s.zone === zone) ?? null

  return {
    get all(): readonly NoteStage[] { return list },
    get playing() { return playing() },
    get any() { return list.some(s => s.active) || queued.length > 0 },
    // the stage playing in a zone (or about to)
    at,
    busy(zone: string) { return !!at(zone) || queued.some(r => r.zone === zone) },
    // whose stage it is: the one a player's fan belongs to
    ownedBy(player: string) { return list.find(s => s.active && s.owner === player) ?? null },
    // the stage a note shot belongs to
    bySource(source: string | undefined) { return isStageSource(source) ? list.find(s => s.source === source) ?? null : null },
    setCatalog(c: Catalog) { catalog = c },
    // a song asked for: it starts on the next step, unless its zone already plays one (or `blocked` says so: the
    // Templo's campaign in its scene)
    request(r: StageRequest, blocked = false): StageAsk {
      const there = at(r.zone)
      if (r.draft && there?.request?.draft) there.halt()
      else if (blocked || there || queued.some(q => q.zone === r.zone)) return 'busy'
      queued.push(r)
      return 'ok'
    },
    // stop what plays (in a zone, from a sequencer, the editor's draft; a bomb's song never stops from outside)
    halt(which: { zone?: string; device?: string; draft?: boolean }) {
      for (const s of playing()) {
        const r = s.request
        if (!r || r.by === 'bomba') continue
        if ((which.zone !== undefined && s.zone === which.zone) || (which.device !== undefined && r.device === which.device) || (which.draft && r.draft)) s.halt()
      }
    },
    // one frame: the queued ones start, every stage steps (io: what each one needs), the ended ones give their
    // results and go once their banner and lines are over
    step(dt: number, ioOf: (s: NoteStage | null, r?: StageRequest) => NoteStageIO) {
      for (const r of queued.splice(0)) {
        const old = at(r.zone)
        if (old) { old.reset(ioOf(old)); list.splice(list.indexOf(old), 1) }
        const s = createNoteStage(() => catalog)
        list.push(s)
        s.start(ioOf(s, r), r)
      }
      for (const s of [...list]) {
        s.step(dt, ioOf(s))
        const r = s.takeResult()
        if (r) results.push(r)
        if (!s.active && s.state.phase === 'idle' && !s.state.banner && !s.state.talk.length) list.splice(list.indexOf(s), 1)
      }
    },
    // the results since the last call
    takeResults() { return results.splice(0) },
    // the ambience of a note rebated in a stage (its fan, scale and rule)
    noteEnv(shot: NoteShot) { return this.bySource(shot.source)?.noteEnv(shot) ?? null },
    reset(io: Parameters<NoteStage['reset']>[0]) { list.forEach(s => s.reset(io)); list.length = 0; queued.length = 0 },
  }
}

export type NoteStages = ReturnType<typeof createNoteStages>
