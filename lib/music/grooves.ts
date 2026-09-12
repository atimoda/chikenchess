export interface GrooveLane { name: string; rhythms: string[]; accents: string[] }
export interface Groove { name: string; lanes: Record<string, GrooveLane> }
export interface GrooveBinding { groove: string; lane: string }

// Lane names are musical roles, never chess types. Any identity can use any lane.
export function electronicGrooves(): Record<string, Groove> {
  return { motorik: { name: 'Motorik · pulso, resposta e virada', lanes: {
    kick: { name: 'Pulso grave', rhythms: ['x x x x', 'x x [x ~] [x x]', 'x [~ x] x [x ~]'], accents: ['1 .85 .95 .85', '1 .8 .95 .7', '1 .7 .9 .65'] },
    snare: { name: 'Contratempo', rhythms: ['~ x ~ x', '~ x [~ ~ ~ x] x', '~ x [~ x] [x x]'], accents: ['.9 1 .35 1', '.9 1 .35 1', '.9 1 .4 .75'] },
    hat: { name: 'Subdivisão', rhythms: ['x*8', 'x*8', '[x x] [x x] [x x] [x [x x]]'], accents: ['1 .4 .7 .4 1 .4 .7 .4', '.8 .4 1 .35 .8 .4 1 .35', '1 .4 .7 .4 1 .4 .7 .3'] },
    clap: { name: 'Resposta de palmas', rhythms: ['~ ~ ~ x', '~ x ~ ~', '~ ~ ~ [x ~]'], accents: ['.6', '.55', '.7'] },
    tom: { name: 'Virada grave', rhythms: ['~', '~ ~ ~ [x ~]', '~ ~ [x x] x'], accents: ['.5', '.6', '.65 .5 .6 .75'] },
    open: { name: 'Respiro aberto', rhythms: ['~ ~ ~ [~ x]', '~ [~ x] ~ ~', '~ ~ ~ [~ x]'], accents: ['.5', '.45', '.6'] },
    rim: { name: 'Resposta seca', rhythms: ['~ [~ x] ~ ~', '~ ~ [~ x] ~', '[~ x] ~ [~ x] ~'], accents: ['.5', '.6', '.5 .65'] },
    shaker: { name: 'Textura', rhythms: ['[~ x]*4', '[~ x]*4', '[~ x]*4'], accents: ['.35 .6 .35 .6', '.4 .6 .4 .7', '.35 .65 .4 .7'] },
  } } }
}
