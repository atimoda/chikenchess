"""Croydon 2006 · early dubstep from South London (original material).

140 BPM in half-time: the kick on one, a big reverbed snare and clap on three,
skippy garage hats, rims and shakers in the gaps. The weight is in the bass: a
pure sine sub under a sawtooth wobble whose filter is swept by an LFO, with dub
sirens, delayed chord stabs and a dark pad. The queen plays an eerie square-wave
melody, an FM bell answers. F Phrygian, a drone on F with the flat-second Gb.
Degrees: 0 F · 1 Gb · 2 Ab · 3 Bb · 4 C · 5 Db · 6 Eb · 7 F'.
"""
from kit import (act, arrangement, bar, bars, drums, electronic, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Fm', 'Fm', 'Gb', 'Fm')
DRONE = ('Fm', 'Fm', 'Fm', 'Fm')
LOW = ('Fm', 'Db', 'Eb', 'Fm')
ROOT = {'Fm': 0, 'Gb': 1, 'Db': -2, 'Eb': -1}
CHORD = {'Fm': '0,2,4', 'Gb': '1,3,5', 'Db': '-2,0,2', 'Eb': '-1,1,3'}


def sub(chord, variant=0):
    r = ROOT[chord]
    shapes = [f'{r}_ . . . . . . . . . . . . . . .', f'{r}_ . . . . . . . . . {r} . . . . .', f'{r} . . . . . . . . . . . {r + 7}~-7 . . .']
    return bar(shapes[variant])


def wobble(chord, variant=0):
    r = ROOT[chord]
    shapes = [f'{r}_ . . . . . . . . . . . . . . .', f'{r}_ . . . . . {r} . . . {r}_ . . . . .', f'{r} . . {r} . . {r + 1} . . . {r}_ . . . {r - 1} .']
    return bar(shapes[variant])


def dub(chord):
    return bar(f'. . . . . . . . {CHORD[chord]}! . . . . . . .')


def pad(chord):
    return bar(f'{CHORD[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


KICK = drums('X... .... ..x. ....')
KICK_B = drums('X... .... ..x. ..x.')
SNARE = drums('.... .... X... ....')
HATS = drums('x..x ..x. x..x .xx.')
HATS_B = drums('x.gx ..xg x.gx .xxr')
SILENT = drums('.' * 16)
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: dub siren.
    part('texture', 'Sirene dub', 'pulse', electronic('dub-siren'), [
        drums('.' * 64), drums('X' + '.' * 63), drums('.' * 32 + 'X' + '.' * 31), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 31 + 'X' + '.' * 31),
    ], [4] * 6, gain=.4, clip=1, lpf=7000, hpf=300, design={'role': 'fx'}, effects={'reverb': .4, 'delay': .4, 'pan': -.3}),
    # a2 · pawn: shaker in the gaps.
    part('rhythm', 'Shaker', 'pulse', recorded('percussion', 'shaker', pitched=False), [
        SILENT, drums('.x.x .x.x .x.x .x.x'), SILENT, drums('gxgx gxgx gxgx gxgx'), drums('.x.. .x.. .x.. .x..'), drums('gxgx gxgx gxgx gxgx'),
    ], [1] * 6, gain=.25, clip=.6, lpf=13000, hpf=3000, effects={'reverb': .05, 'pan': .35}),
    # b1 · knight: delayed dub chord stabs.
    part('response', 'Stab dub', 'phrase', synth('square'), [
        prog(dub, DRONE), prog(dub, LOOP), prog(dub, DRONE), prog(dub, LOW), prog(dub, DRONE), prog(dub, LOW),
    ], [4] * 6, octave=3, gain=.15, attack=.003, decay=.18, sustain=.1, release=.15, gate=.3, clip=.9, lpf=1600, hpf=250,
        design={'filterEnv': 1.5, 'filterDecay': .1, 'delayTime': '3/16', 'delayFeedback': .6}, mapping={'fileDegrees': 0},
        arrangement=arrangement((True, True, True, False, True, False)), effects={'delay': .5, 'reverb': .35, 'pan': .3}),
    # b2 · pawn: the big snare on three.
    part('rhythm', 'Caixa no três', 'pulse', machine('909-snare'), [
        SILENT, SNARE, drums('.... .... .... ....'), SNARE, SNARE, drums('.... .... X... ..x.'),
    ], [1] * 6, gain=0.7, clip=.9, lpf=10000, hpf=200, effects={'reverb': .35, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: FM bell answer.
    part('melody', 'Sino FM', 'phrase', recorded('synths', 'fm-bell'), [
        bars(bar('7 . . . 8 . . . 7 . . . 4 . . .'), SILENT),
        bars(SILENT, bar('. . . . . . . . 7 . 6 . 4 . . .')),
        bars(bar('7 . . . 8 . . . 7 . . . 4 . . .'), bar('5 . . . 4 . . . 1 . . . . . . .')),
        bars(SILENT, bar('. . . . . . . . . . . . 11 . 8 .')),
        bars(bar('7 . . . 8 . . . 7 . . . 4 . . .'), SILENT),
        bars(SILENT, bar('. . . . . . . . 11 . 10 . 8 . 7 .')),
    ], [2] * 6, octave=4, gain=0.15, attack=.002, decay=.6, sustain=.2, release=.5, gate=.6, clip=.9, lpf=8000, hpf=400,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .45, 'delay': .35, 'pan': -.35}),
    # c2 · pawn: skippy garage hats.
    part('rhythm', 'Chimbal garage', 'pulse', machine('909-hat'), [
        drums('..x. ..x. ..x. ..x.'), HATS, drums('x... x... x... x...'), HATS_B, HATS, HATS_B,
    ], [1] * 6, gain=1, clip=.6, lpf=15000, hpf=4500, effects={'reverb': .04, 'pan': .15}),
    # d1 · queen: eerie square melody.
    part('melody', 'Melodia da meia-noite', 'phrase', synth('square'), [
        REST4,
        bars(bar('4_ . . . . . . . 5 . . . 4 . . .'), bar('2_ . . . . . . . . . . . . . . .'), bar('1_ . . . . . . . 2 . . . 1 . . .'), bar('0_ . . . . . . . . . . . . . . .')),
        bars(bar('7~-12 . . . . . . . . . . . . . . .'), SILENT, bar('8~-1 . . . . . . . . . . . . . . .'), SILENT),
        bars(bar('4_ . . . . . . . 5 . . . 7 . . .'), bar('8_ . . . . . . . 7 . . . 5 . . .'), bar('4_ . . . . . . . 2 . . . 1 . . .'), bar('0_ . . . . . . . 1~-1 . . . . . . .')),
        bars(bar('4_ . . . . . . . . . . . . . . .'), SILENT, bar('1_ . . . . . . . . . . . . . . .'), SILENT),
        bars(bar('4_ . . . . . . . 5 . . . 7 . . .'), bar('8_ . . . . . . . 7 . . . 5 . . .'), bar('4_ . . . . . . . 2 . . . 1 . . .'), bar('11~-12 . . . . . . . . . . . . . . .')),
    ], [4] * 6, octave=4, gain=0.16, attack=.01, decay=.4, sustain=.6, release=.3, gate=.9, clip=.9, lpf=2400, hpf=250,
        design={'vibrato': 4.5, 'vibratoDepth': .08}, mapping={'fileDegrees': 0, 'panWidth': .1},
        arrangement=arrangement((False, True, True, True, True, True), restart=True), effects={'reverb': .35, 'delay': .3, 'pan': 0}),
    # d2 · pawn: sine sub.
    part('bass', 'Sub-grave', 'phrase', synth('sine'), [
        REST4, prog(sub, LOOP, 0), prog(sub, DRONE, 0), prog(sub, LOW, 1), prog(sub, DRONE, 0), prog(sub, LOW, 2),
    ], [4] * 6, octave=1, gain=0.3, attack=.01, decay=.6, sustain=.85, release=.2, gate=.95, clip=.95, lpf=200, hpf=25,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # e1 · king: dark pad, arrives with castling.
    part('texture', 'Pad sombrio', 'sustain', recorded('synths', 'analog-pad'), [
        prog(pad, DRONE), prog(pad, LOOP), prog(pad, DRONE), prog(pad, LOW), prog(pad, DRONE), prog(pad, LOW),
    ], [4] * 6, octave=3, gain=.03, attack=1, decay=1, sustain=.85, release=1.5, gate=.97, clip=1, lpf=1800, hpf=150,
        design={'role': 'pad'}, arrangement=arrangement((True, False, True, True, True, True), restart=False), effects={'reverb': .5, 'pan': .2}),
    # e2 · pawn: half-time kick.
    part('rhythm', 'Bumbo meio-tempo', 'pulse', machine('909-kick'), [
        drums('X... .... .... ....'), KICK, SILENT, KICK, KICK, KICK_B,
    ], [1] * 6, gain=.65, clip=.5, lpf=8000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: the wobble bass.
    part('harmony', 'Wobble', 'phrase', synth('sawtooth'), [
        REST4, REST4, prog(wobble, DRONE, 0), prog(wobble, LOW, 2), prog(wobble, DRONE, 1), prog(wobble, LOW, 2),
    ], [4] * 6, octave=2, gain=0.5, attack=.005, decay=.5, sustain=.8, release=.1, gate=.9, clip=.95, lpf=900, hpf=60,
        design={'unison': 2, 'detune': .15, 'resonance': 8, 'lfoTarget': 'lpf', 'lfoRate': .25, 'lfoUnit': 'bars', 'lfoDepth': .85, 'lfoShape': 'sine', 'role': 'bass'},
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, True, True, True, True)), distortion=1, distortionMix=.25, effects={'reverb': .05, 'pan': 0}),
    # f2 · pawn: rimshots.
    part('rhythm', 'Rim', 'pulse', machine('909-rim'), [
        SILENT, drums('...x .... .x.. ...x'), SILENT, drums('...x ..x. .x.. ...x'), drums('...x .... .... ....'), drums('...x ..x. .x.x ..xx'),
    ], [1] * 6, gain=.15, clip=.6, lpf=9000, hpf=600, effects={'reverb': .2, 'pan': -.35}),
    # g1 · knight: riser into the drop.
    part('response', 'Riser', 'pulse', electronic('riser'), [
        drums('.' * 48 + 'X' + '.' * 15), drums('.' * 64), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 64), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 64),
    ], [4] * 6, gain=.3, clip=1, lpf=12000, hpf=400, design={'role': 'fx'}, effects={'reverb': .3, 'pan': .3}),
    # g2 · pawn: clap layered on the snare.
    part('rhythm', 'Palma', 'pulse', machine('909-clap'), [
        SILENT, SNARE, SILENT, SNARE, SNARE, SNARE,
    ], [1] * 6, gain=0.5, clip=.9, lpf=10000, hpf=500, effects={'reverb': .4, 'pan': .05},
        arrangement=arrangement((False, True, False, True, True, True))),
    # h1 · rook: downlifter after the drop.
    part('texture', 'Downlifter', 'pulse', electronic('downlifter'), [
        drums('.' * 64), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 63),
    ], [4] * 6, gain=.25, clip=1, lpf=10000, hpf=200, design={'role': 'fx'}, effects={'reverb': .3, 'pan': -.2}),
    # h2 · pawn: tom fills.
    part('rhythm', 'Tons', 'pulse', machine('909-tom'), [
        SILENT, SILENT, drums('.... .... x.x. xxxx'), SILENT, drums('.... .... .... ..xx'), drums('.... .... x.x. xxxx'),
    ], [1] * 6, gain=.3, clip=.8, lpf=7000, hpf=50, effects={'reverb': .25, 'pan': .25},
        arrangement=arrangement(fills=(5, 5, None, 5, 5, None))),
]

profile = {
    'name': 'Croydon · dubstep 2006', 'bpm': 140, 'root': 'F', 'scale': 'Phrygian', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Pre-Chorus', 'Drop', 'Interlude', 'Drop'],
    'parts': parts,
    'reactions': reactions([
        rule('cro-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('cro-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('cro-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 4)]),
        # Castling and checks are drops: the wobble comes in on the next bar.
        rule('cro-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('cro-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 3)]),
        rule('cro-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('cro-tension', 'tension', 'both', 1, True, [act('lpf', 350, rampBars=8), act('resonance', 14)], 'bass'),
        rule('cro-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('drive', 4)], 'bass'),
        rule('cro-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('delay', .55)]),
        rule('cro-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('cro-drought', 'captureDrought', 'both', 2, True, [act('delay', .35)]),
    ]),
    'reference': 'Dubstep de Croydon/South London em 2005–06 (Skream, Benga, Digital Mystikz, noites DMZ e loja Big Apple): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Dubstep',
}
write('croydon', profile)
