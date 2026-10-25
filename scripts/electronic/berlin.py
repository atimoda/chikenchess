"""Berlin 1991 · Tresor techno in the vault after the Wall (original material).

138 BPM, a hard driven 909 kick with a rumbling offbeat bass, sixteenth hats and
rides, industrial metal hits on the rooks. A hoover riff (the 1991 'mentasm'
sound) on the bishop, a nagging saw sequence on the queen and a dub-chord echo
from the Basic Channel side of the city. C Phrygian: drones on C with the dark
flat second (Db) as the only move.
Degrees: 0 C · 1 Db · 2 Eb · 3 F · 4 G · 5 Ab · 6 Bb · 7 C'.
"""
from kit import (act, arrangement, bar, bars, drums, electronic, machine, part, reactions, rule, synth, write)

LOOP = ('Cm', 'Cm', 'Cm', 'Db')
DRONE = ('Cm', 'Cm', 'Cm', 'Cm')
ROOT = {'Cm': 0, 'Db': 1}
CHORD = {'Cm': '0,2,4', 'Db': '1,3,5'}


def rumble(chord, variant=0):
    r = ROOT[chord]
    shapes = [f'. . {r} . . . {r} . . . {r} . . . {r} .', f". {r}' {r} . . {r}' {r} . . {r}' {r} . . {r}' {r} {r}'"]
    return bar(shapes[variant])


def dub(chord, variant=0):
    c = CHORD[chord]
    shapes = [f'. . . . . . {c} . . . . . . . . .', f'. . . {c} . . {c} . . . . . . . {c} .']
    return bar(shapes[variant])


def hoover(chord, variant=0):
    r = ROOT[chord]
    shapes = [f'{r}_ . . . . . . . . . . . {r + 1}~-2 . . .', f'{r}! . . {r} . . {r + 1}~-1 . . . {r} . . . {r - 1} .']
    return bar(shapes[variant])


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


SEQ = bar("0 0 7 0 0 5 0 1 0 0 7 0 6 0 1 0")
SEQ_B = bar("0 0 7 0 0 5 0 1 0 0 8! 0 7 6 5 1")
KICK = drums('X... X... X... X...')
CLAP = drums('.... X... .... X...')
SILENT = drums('.... .... .... ....')
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: industrial metal hits in the concrete.
    part('texture', 'Golpe de metal', 'pulse', electronic('metal-hit'), [
        drums('X' + '.' * 31), drums('.... .... .... ..x. .... .... .... ....'), drums('X' + '.' * 15 + 'x' + '.' * 15),
        drums('.... .... .... ..x. .... .... ..x. ....'), drums('X' + '.' * 31), drums('.... .... .... ..X. .... .... ..x. ..x.'),
    ], [2] * 6, gain=.25, clip=.9, lpf=9000, hpf=200, design={'role': 'fx'}, effects={'reverb': .45, 'delay': .25, 'pan': -.35}),
    # a2 · pawn: 909 ride on the offbeats.
    part('rhythm', 'Ride 909', 'pulse', machine('909-ride'), [
        SILENT, drums('..x. ..x. ..x. ..x.'), drums('..x. ..x. ..x. ..x.'), drums('x.X. x.X. x.X. x.X.'), drums('..x. ..x. ..x. ..x.'), drums('x.X. x.X. x.X. x.X.'),
    ], [1] * 6, gain=.25, clip=.7, lpf=14000, hpf=3000, effects={'reverb': .08, 'pan': .3}),
    # b1 · knight: the nagging second sequence, an octave up and filtered.
    part('response', 'Sequência do cofre', 'phrase', synth('square'), [
        REST4, REST4, bars(SEQ, SEQ, SEQ, SEQ_B), bars(SEQ, SEQ, SEQ, SEQ_B), bars(SEQ, SEQ, SEQ, SEQ), bars(SEQ, SEQ_B, SEQ, SEQ_B),
    ], [4] * 6, octave=4, gain=0.12, attack=.002, decay=.08, sustain=.1, release=.04, gate=.35, clip=.9, lpf=1200, hpf=300,
        design={'resonance': 12, 'filterEnv': 2, 'filterDecay': .06, 'lfoTarget': 'lpf', 'lfoRate': 8, 'lfoUnit': 'bars', 'lfoDepth': .5},
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, True, True)), effects={'delay': .3, 'reverb': .15, 'pan': .35}),
    # b2 · pawn: 909 claps.
    part('rhythm', 'Palmas 909', 'pulse', machine('909-clap'), [
        SILENT, CLAP, SILENT, CLAP, CLAP, drums('.... X... .... X... .... X... .... XXXX'),
    ], [1, 1, 1, 1, 1, 2], gain=.4, clip=.9, lpf=10000, hpf=500, effects={'reverb': .2, 'pan': 0},
        arrangement=arrangement((False, True, False, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: the hoover riff.
    part('harmony', 'Hoover', 'phrase', electronic('hoover', True), [
        REST4, REST4, prog(hoover, LOOP, 0), prog(hoover, LOOP, 1), prog(hoover, DRONE, 0), prog(hoover, LOOP, 1),
    ], [4] * 6, octave=3, gain=.15, attack=.01, decay=.5, sustain=.7, release=.3, gate=.85, clip=.95, lpf=5000, hpf=120,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, True, True)), effects={'reverb': .25, 'pan': -.1}),
    # c2 · pawn: 909 sixteenth hats.
    part('rhythm', 'Chimbal 909', 'pulse', machine('909-hat'), [
        drums('..x. ..x. ..x. ..x.'), drums('xgxg xgxg xgxg xgxg'), drums('xgxg xgxg xgxg xgxg'),
        drums('xgXg xgXg xgXg xgXg'), drums('xgxg xgxg xgxg xgxg'), drums('XgXg XgXg XgXg XgXr'),
    ], [1] * 6, gain=1, clip=.6, lpf=15000, hpf=4500, effects={'reverb': .03, 'pan': .15}),
    # d1 · queen: the saw sequence — the hypnotic loop that never lets go.
    part('melody', 'Serra hipnótica', 'phrase', synth('sawtooth'), [
        REST4, bars(SEQ, SEQ, SEQ, SEQ_B), bars(SEQ, SEQ, SEQ, SEQ), bars(SEQ, SEQ_B, SEQ, SEQ_B), bars(SEQ, SEQ, SEQ, SEQ), bars(SEQ_B, SEQ_B, SEQ_B, SEQ_B),
    ], [4] * 6, octave=3, gain=0.4, attack=.002, decay=.12, sustain=.2, release=.05, gate=.45, clip=.95, lpf=900, hpf=150,
        design={'resonance': 9, 'filterEnv': 2.4, 'filterDecay': .1, 'lfoTarget': 'lpf', 'lfoRate': 16, 'lfoUnit': 'bars', 'lfoDepth': .6, 'role': 'lead'},
        mapping={'fileDegrees': 0, 'panWidth': .1}, arrangement=arrangement((False, True, True, True, True, True), restart=False),
        distortion=1.2, distortionMix=.3, effects={'reverb': .12, 'delay': .2, 'pan': 0}),
    # d2 · pawn: offbeat rumble bass.
    part('bass', 'Baixo de concreto', 'phrase', synth('sawtooth'), [
        REST4, prog(rumble, LOOP, 0), REST4, prog(rumble, LOOP, 1), prog(rumble, DRONE, 0), prog(rumble, LOOP, 1),
    ], [4] * 6, octave=1, gain=.5, attack=.002, decay=.12, sustain=.4, release=.05, gate=.6, clip=.95, lpf=260, hpf=30,
        design={'resonance': 3, 'filterEnv': 1.4, 'filterDecay': .08, 'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0},
        effects={'reverb': 0, 'pan': 0}),
    # e1 · king: dark noise drone, arrives with castling.
    part('texture', 'Drone do bunker', 'sustain', synth('brown'), [
        bars(bar('0_ . . . . . . . . . . . . . . .'), *[SILENT] * 3),
    ] * 6, [4] * 6, octave=2, gain=0.8, attack=2, decay=1, sustain=.8, release=2, gate=.98, clip=1, lpf=600, hpf=60,
        design={'role': 'pad', 'lfoTarget': 'lpf', 'lfoRate': 4, 'lfoUnit': 'bars', 'lfoDepth': .5},
        arrangement=arrangement((True, False, True, True, True, True), restart=False), effects={'reverb': .5, 'pan': .1}),
    # e2 · pawn: hard 909 kick.
    part('rhythm', 'Bumbo 909', 'pulse', machine('909-kick-hard'), [
        KICK, KICK, drums('X... .... .... ....'), KICK, KICK, KICK,
    ], [1] * 6, gain=0.6, clip=.5, lpf=9000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: dub-techno chord echo.
    part('harmony', 'Acorde dub', 'phrase', synth('square'), [
        REST4, prog(dub, LOOP, 0), prog(dub, DRONE, 0), prog(dub, LOOP, 1), prog(dub, DRONE, 1), prog(dub, LOOP, 1),
    ], [4] * 6, octave=3, gain=0.15, attack=.003, decay=.18, sustain=.1, release=.15, gate=.3, clip=.9, lpf=1500, hpf=250,
        design={'filterEnv': 1.5, 'filterDecay': .1, 'delayTime': '3/16', 'delayFeedback': .55}, mapping={'fileDegrees': 0},
        arrangement=arrangement((True, True, True, True, True, True)), effects={'delay': .45, 'reverb': .35, 'pan': -.3}),
    # f2 · pawn: 909 open hat.
    part('rhythm', 'Chimbal aberto 909', 'pulse', machine('909-open-hat'), [
        SILENT, drums('..x. ..x. ..x. ..x.'), SILENT, drums('..X. ..X. ..X. ..X.'), drums('..x. ..x. ..x. ..x.'), drums('..X. ..X. ..X. ..X.'),
    ], [1] * 6, gain=0.8, clip=.6, lpf=14000, hpf=3500, effects={'reverb': .05, 'pan': -.2}),
    # g1 · knight: noise riser into the drops.
    part('response', 'Riser', 'pulse', electronic('riser'), [
        drums('.' * 64), drums('.' * 64), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 64), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 48 + 'X' + '.' * 15),
    ], [4] * 6, gain=.2, clip=1, lpf=12000, hpf=400, design={'role': 'fx'}, effects={'reverb': .3, 'pan': .3}),
    # g2 · pawn: 909 rim.
    part('rhythm', 'Rim 909', 'pulse', machine('909-rim'), [
        SILENT, drums('...x ..x. .x.. ..x.'), SILENT, drums('...x ..x. .x.. ..x.'), drums('...x .... .x.. ....'), drums('...x ..x. .x.x ..xx'),
    ], [1] * 6, gain=.15, clip=.6, lpf=9000, hpf=600, effects={'reverb': .1, 'pan': .4}),
    # h1 · rook: 909 crash.
    part('texture', 'Prato 909', 'pulse', machine('909-crash'), [
        drums('.' * 64), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 31 + 'X' + '.' * 31), drums('X' + '.' * 63), drums('X' + '.' * 31 + 'X' + '.' * 31),
    ], [4] * 6, gain=.3, clip=1, lpf=13000, hpf=500, design={'role': 'fx'}, effects={'reverb': .25, 'pan': .2}),
    # h2 · pawn: 909 tom fills.
    part('rhythm', 'Tons 909', 'pulse', machine('909-tom'), [
        SILENT, SILENT, drums('.... .... ..x. x.x.'), SILENT, drums('.... .... .... ..x.'), drums('.... .... x.x. xxxx'),
    ], [1] * 6, gain=.3, clip=.8, lpf=7000, hpf=50, effects={'reverb': .2, 'pan': -.3},
        arrangement=arrangement(fills=(5, 5, None, 5, 5, None))),
]

profile = {
    'name': 'Tresor · techno 1991', 'bpm': 138, 'root': 'C', 'scale': 'Phrygian', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Drop', 'Interlude', 'Drop'],
    'parts': parts,
    'reactions': reactions([
        rule('ber-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('ber-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('ber-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('bpm', 4, rampBars=8)]),
        rule('ber-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('ber-check', 'check', 'actor', 1, True, [act('activate'), act('drive', 3)]),
        rule('ber-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('ber-tension', 'tension', 'both', 1, True, [act('lpf', 2200, rampBars=16), act('resonance', 18)], 'lead'),
        rule('ber-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('hpf', 600, rampBars=2)]),
        rule('ber-quiet', 'quiet', 'both', 2, True, [act('variation', 4), act('delay', .5)]),
        rule('ber-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('drive', 4)], 'drums'),
        rule('ber-hanging', 'hangingPiece', 'actor', 1, True, [act('resonance', 22)], 'lead'),
    ]),
    'reference': 'Techno de Berlim no Tresor (1991–93: Tresor, Underground Resistance, X-101, Basic Channel): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Berlin_techno',
}
write('berlin', profile)
