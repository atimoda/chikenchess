import { z } from "zod";
import { instrumentSchema, effectsSchema } from "../music/creative";
import { defaultCityKit } from "../music/city-kits";

const effectSchema = effectsSchema.extend({
  lpf: z.number().finite().min(20).max(20000).optional(),
  hpf: z.number().finite().min(0).max(20000).optional(),
});
const paramsSchema = z
  .object({
    pieceId: z.string().regex(/^(w:[a-h][12]|b:[a-h][78])$/),
    instrument: instrumentSchema,
    effects: effectSchema.optional(),
  })
  .strict();

const citySections = new Map<string, string[]>();

export function parsePieceParams(value: unknown, contextCityId?: string) {
  if (JSON.stringify(value).length > 120000)
    throw new Error("Piece parameters are too large");
  const params = paramsSchema.parse(value);
  const instrument = params.instrument;
  if (Object.values(instrument.arrangement.sections).some(section => section.variation >= instrument.pianoRolls.length)
    || (instrument.selectedVariation ?? 0) >= instrument.pianoRolls.length)
    throw new Error("Unknown MIDI variation");
  if (contextCityId) {
    let sections = citySections.get(contextCityId);
    if (!sections) {
      const context = defaultCityKit(contextCityId);
      if (!context) throw new Error("Unknown musical context");
      sections = context.arrangement.sections.map(section => section.id);
      citySections.set(contextCityId, sections);
    }
    const assignments = instrument.arrangement.sections;
    if (Object.keys(assignments).length !== sections.length || sections.some(id => !Object.hasOwn(assignments, id)))
      throw new Error("Piece arrangement does not match the shared context");
  }
  return params;
}
