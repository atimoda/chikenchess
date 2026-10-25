"""London 1992 · rave breakbeat turning into jungle (original material).

165 BPM chopped breakbeat: a two-bar break pattern split across kick, snare,
ghost notes, hats, open hat and ride, so each pawn carries one slice and fills
ratchet the snare. A sine sub bass with long slides, a detuned Reese, hardcore
piano and rave stabs, a hoover hook on the queen, vinyl scratches and a dub
siren. D natural minor, Dm–Dm–Bb–C.
Degrees: 0 D · 1 E · 2 F · 3 G · 4 A · 5 Bb · 6 C · 7 D'.
"""
from kit import (act, arrangement, bar, bars, drums, electronic, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Dm', 'Dm', 'Bb', 'C')
DRONE = ('Dm', 'Dm', 'Dm', 'Dm')
ROOT = {'Dm': 0, 'Bb': -2, 'C': -1}
VOICING = {'Dm': '2,4,7', 'Bb': '2,5,7', 'C': '1,4,6'}
PAD = {'Dm': '0,2,4', 'Bb': '-2,0,2', 'C': '-1,1,4'}


def sub(chord, variant=0):
    r = ROOT[chord]
    shapes = [f'{r}_ . . . . . . . . . . . . . . .', f'{r}_ . . . . . . . . . {r}~-5 . . . . .', f'{r} . . . . . . . . . {r + 7}~-7 . {r} . . .']
    return bar(shapes[variant])


def stabs(chord, variant=0):
    c = VOICING[chord]
    shapes = [f'{c}! . . . . . . . . . . . . . . .', f'{c}! . . {c} . . . . . . {c} . . . . .', f'. . . . . . {c} . . . {c} . . . {c} .']
    return bar(shapes[variant])


def pad(chord):
    return bar(f'{PAD[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


# The two-bar break, sliced per drum (kick / snare / ghost / hats).
KICK = drums('X.x. .... ..x. .... ..x. .... x.x. ....')
KICK_B = drums('X.x. .... ..x. .x.. ..x. .... x... ..x.')
SNARE = drums('.... X... .... X... .... X... .... X...')
SNARE_FILL = drums('.... X... .... X... .... X... ..X. rrRR')
GHOST = drums('.... ...g .g.. ...g .g.. ...g .g.. g..g')
HATS = drums('x.x. x.x. x.x. x.x. x.x. x.x. x.x. x.x.')
SILENT2 = drums('.' * 32)
SILENT = drums('.' * 16)
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: the dub siren.
    part('texture', 'Sirene dub', 'pulse', electronic('dub-siren'), [
        drums('.' * 64), drums('X' + '.' * 63), drums('.' * 32 + 'X' + '.' * 31), drums('X' + '.' * 31 + 'X' + '.' * 31), drums('.' * 64), drums('X' + '.' * 31 + 'X' + '.' * 31),
    ], [4] * 6, gain=0.4, clip=1, lpf=8000, hpf=300, design={'role': 'fx'}, effects={'reverb': .35, 'delay': .35, 'pan': -.3}),
    # a2 · pawn: break ride slice.
    part('rhythm', 'Ride do break', 'pulse', machine('break-ride'), [
        SILENT2, drums('x... x... x... x... x... x... x... x...'), SILENT2, drums('x.x. x.x. x.x. x.x. x.x. x.x. x.x. x.x.'),
        drums('x... .... x... .... x... .... x... ....'), drums('x.x. x.x. x.x. x.x. x.x. x.x. x.x. x.x.'),
    ], [2] * 6, gain=.2, clip=.7, lpf=13000, hpf=2500, effects={'reverb': .1, 'pan': .3}),
    # b1 · knight: hardcore rave stabs.
    part('response', 'Rave stab', 'phrase', electronic('rave-stab', True), [
        REST4, prog(stabs, LOOP, 0), prog(stabs, DRONE, 0), prog(stabs, LOOP, 1), REST4, prog(stabs, LOOP, 2),
    ], [4] * 6, octave=3, gain=.12, attack=.002, decay=.25, sustain=.2, release=.1, gate=.4, clip=.9, lpf=8000, hpf=250,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, True, True)), effects={'reverb': .25, 'delay': .2, 'pan': .3}),
    # b2 · pawn: break snare slice.
    part('rhythm', 'Caixa do break', 'pulse', machine('break-snare'), [
        SILENT2, SNARE, drums('.' * 24 + '..x. rrRR'), SNARE, SNARE, SNARE_FILL,
    ], [2] * 6, gain=.5, clip=.8, lpf=11000, hpf=150, effects={'reverb': .12, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: hardcore piano.
    part('harmony', 'Piano hardcore', 'phrase', recorded('band', 'piano', 1), [
        prog(stabs, LOOP, 0), prog(stabs, LOOP, 2), prog(stabs, DRONE, 0), prog(stabs, LOOP, 2), prog(stabs, LOOP, 0), prog(stabs, LOOP, 1),
    ], [4] * 6, octave=3, gain=.15, attack=.003, decay=.5, sustain=.3, release=.3, gate=.5, clip=.95, lpf=8000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, False)), effects={'reverb': .3, 'pan': -.15}),
    # c2 · pawn: break hats slice.
    part('rhythm', 'Chimbal do break', 'pulse', machine('break-hat'), [
        drums('..x. ..x. ..x. ..x. ..x. ..x. ..x. ..x.'), HATS, SILENT2, HATS, HATS, drums('xgxg xgxg xgxg xgxg xgxg xgxg xgxg xgxr'),
    ], [2] * 6, gain=.5, clip=.6, lpf=14000, hpf=4000, effects={'reverb': .04, 'pan': .15}),
    # d1 · queen: the hoover hook.
    part('melody', 'Hoover', 'phrase', electronic('hoover', True), [
        REST4,
        bars(bar('7_ . . . . . 9 . . . 7 . . . 5 .'), bar('4_ . . . . . . . . . . . . . . .'), bar('5_ . . . . . 4 . . . 2 . . . 1 .'), bar('0_ . . . . . . . . . . . . . . .')),
        bars(bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('7~-12 . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7! . . 7 . . 9 . . 7 . . 5 . 4 .'), bar('4_ . . . . . . . 2 . . . 4 . . .'), bar('5! . . 5 . . 7 . . 5 . . 4 . 2 .'), bar('1_ . . . . . . . 2 . 4 . 6 . 7 .')),
        REST4,
        bars(bar('7! . . 7 . . 9 . . 7 . . 5 . 4 .'), bar('4_ . . . . . . . 2 . . . 4 . . .'), bar('5! . . 5 . . 7 . . 5 . . 4 . 2 .'), bar('7~-12 . . . . . . . 9 . 11 . 12 . 14 .')),
    ], [4] * 6, octave=3, gain=0.13, attack=.01, decay=.5, sustain=.7, release=.3, gate=.85, clip=.95, lpf=6000, hpf=150,
        mapping={'fileDegrees': 0, 'panWidth': .1}, arrangement=arrangement((False, True, True, True, False, True), restart=True),
        effects={'reverb': .25, 'delay': .15, 'pan': 0}),
    # d2 · pawn: sine sub with long slides.
    part('bass', 'Sub jungle', 'phrase', synth('sine'), [
        REST4, prog(sub, LOOP, 0), prog(sub, DRONE, 1), prog(sub, LOOP, 2), prog(sub, LOOP, 1), prog(sub, LOOP, 2),
    ], [4] * 6, octave=1, gain=0.45, attack=.005, decay=.6, sustain=.8, release=.2, gate=.9, clip=.95, lpf=250, hpf=25,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # e1 · king: breathy atmosphere pad.
    part('texture', 'Pad atmosférico', 'sustain', electronic('vox-pad', True), [
        prog(pad, LOOP), prog(pad, LOOP), prog(pad, DRONE), prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP),
    ], [4] * 6, octave=4, gain=.07, attack=.8, decay=1, sustain=.85, release=1.2, gate=.97, clip=1, lpf=4000, hpf=250,
        design={'role': 'pad'}, arrangement=arrangement((True, False, True, True, True, True), restart=False), effects={'reverb': .5, 'pan': .2}),
    # e2 · pawn: break kick slice.
    part('rhythm', 'Bumbo do break', 'pulse', machine('break-kick'), [
        drums('X' + '.' * 31), KICK, SILENT2, KICK, KICK_B, KICK_B,
    ], [2] * 6, gain=.6, clip=.6, lpf=9000, hpf=30, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: detuned Reese bass, mid layer over the sub.
    part('harmony', 'Reese', 'phrase', synth('sawtooth'), [
        REST4, REST4, prog(sub, DRONE, 0), prog(sub, LOOP, 1), prog(sub, LOOP, 0), prog(sub, LOOP, 1),
    ], [4] * 6, octave=2, gain=0.25, attack=.01, decay=.6, sustain=.8, release=.2, gate=.9, clip=.95, lpf=700, hpf=80,
        design={'unison': 3, 'detune': .25, 'spread': .5, 'lfoTarget': 'lpf', 'lfoRate': 2, 'lfoUnit': 'bars', 'lfoDepth': .4},
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, True, True)), effects={'reverb': .05, 'pan': 0}),
    # f2 · pawn: break ghost notes.
    part('rhythm', 'Ghost notes', 'pulse', machine('break-ghost'), [
        SILENT2, GHOST, SILENT2, GHOST, GHOST, drums('..g. ...g .g.g ...g .g.. g..g .g.g g.gg'),
    ], [2] * 6, gain=0.55, clip=.6, lpf=10000, hpf=300, effects={'reverb': .06, 'pan': -.15}),
    # g1 · knight: vinyl scratches.
    part('response', 'Scratch', 'pulse', electronic('scratch'), [
        SILENT2, drums('.' * 28 + 'x.x.'), SILENT2, drums('.' * 12 + 'x... ' + '.' * 12 + 'x.xx'), drums('.' * 28 + 'x...'), drums('.' * 12 + 'x.x. ' + '.' * 12 + 'xxxx'),
    ], [2] * 6, gain=.25, clip=.8, lpf=9000, hpf=400, design={'role': 'fx'}, effects={'reverb': .1, 'pan': -.4}),
    # g2 · pawn: break open hat.
    part('rhythm', 'Chimbal aberto do break', 'pulse', machine('break-open-hat'), [
        SILENT2, drums('.' * 14 + 'x.' + '.' * 14 + 'x.'), SILENT2, drums('......x. ......x. ......x. ......x.'), drums('.' * 30 + 'x.'), drums('......x. ......x. ......x. ....x.x.'),
    ], [2] * 6, gain=0.5, clip=.7, lpf=13000, hpf=3000, effects={'reverb': .08, 'pan': .35}),
    # h1 · rook: reverse cymbal into each section.
    part('texture', 'Prato reverso', 'pulse', electronic('reverse-cymbal'), [
        drums('.' * 48 + 'X' + '.' * 15), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 64), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 64),
    ], [4] * 6, gain=.25, clip=1, lpf=12000, hpf=500, design={'role': 'fx'}, effects={'reverb': .2, 'pan': .2}),
    # h2 · pawn: snare rolls that close each section.
    part('rhythm', 'Rufo de caixa', 'pulse', machine('break-snare'), [
        SILENT, SILENT, drums('x.x. xxxx rrrr RRRR'), SILENT, drums('.... .... x.x. rrrr'), drums('x.x. xxxx rrrr RRRR'),
    ], [1] * 6, gain=.25, clip=.8, lpf=10000, hpf=200, effects={'reverb': .15, 'pan': -.1},
        arrangement=arrangement(fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Rave · jungle 1992', 'bpm': 165, 'root': 'D', 'scale': 'Menor natural', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 64, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Drop', 'Interlude', 'Drop'],
    'parts': parts,
    'reactions': reactions([
        rule('ldn-opening', 'opening', 'both', 1, True, [act('variation', 0)]),
        rule('ldn-middle', 'middle', 'both', 1, True, [act('variation', 1)]),
        rule('ldn-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 4)]),
        rule('ldn-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # 'Rewind!': a check spins the record back to the drop.
        rule('ldn-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 3)]),
        rule('ldn-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('ldn-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('lpf', 900, rampBars=2)]),
        rule('ldn-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('ldn-tension', 'tension', 'both', 1, True, [act('lpf', 400, rampBars=8)], 'bass'),
        rule('ldn-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('delay', .4)], 'fx'),
        rule('ldn-drought', 'captureDrought', 'both', 2, True, [act('variation', 2)]),
    ]),
    'reference': 'Rave/breakbeat hardcore de Londres em 1992 na passagem para o jungle (The Prodigy, Shut Up and Dance, Rufige Kru): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Jungle_music',
}
write('london', profile)
