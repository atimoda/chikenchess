"""Manchester 1988 · acid house at the Haçienda (original material).

128 BPM on a TR-909 with 808 congas and claves. The queen is the TB-303: a
sixteenth-note acid line with accents, slides and an envelope that opens as the
game heats up; a second 303 answers on the knight. Piano stabs, rave stabs,
whistles and a siren for the Second Summer of Love. G natural minor, the
Gm–Gm–Eb–F vamp.
Degrees: 0 G · 1 A · 2 Bb · 3 C · 4 D · 5 Eb · 6 F · 7 G'.
"""
from kit import (act, arrangement, bar, bars, drums, electronic, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Gm', 'Gm', 'Eb', 'F')
BREAK = ('Gm', 'Gm', 'Gm', 'Gm')
ROOT = {'Gm': 0, 'Eb': -2, 'F': -1}
VOICING = {'Gm': '2,4,7', 'Eb': '2,5,7', 'F': '1,3,6'}
PAD = {'Gm': '0,2,4', 'Eb': '-2,0,2', 'F': '-1,1,3'}

# The acid line: one bar per chord, accents (!) and slides (~) shape the squelch.
ACID = {
    'Gm': [bar("0! 0 7~-7 0 . 0 2! 0 . 0 7 5~2 0! . 3 0"), bar("0! 0 . 0 7! 0 5 . 0 0 3! . 0 7~-7 0 2")],
    'Eb': [bar("-2! -2 5~-7 -2 . -2 0! -2 . -2 5 3~2 -2! . 2 -2"), bar("-2! . -2 5 . -2 3! . -2 -2 5~-7 . -2 0 2 3")],
    'F': [bar("-1! -1 6~-7 -1 . -1 1! -1 . -1 6 4~2 -1! . 3 -1"), bar("-1! . -1 6 . -1 4! . 6~-7 -1 1! . 3 4 5~2 6")],
}


def acid(chords, variant=0):
    return bars(*(ACID[c][variant] for c in chords))


def bassline(chord):
    r = ROOT[chord]
    return bar(f'{r} . . . . . . {r} . . {r} . . . . .')


def stabs(chord, variant=0):
    c = VOICING[chord]
    rhythms = [f'{c}! . . {c} . . . . . . {c} . . . . .', f'. . {c} . . . {c} . . . {c} . . {c} . .', f'{c}_ . . . . . . . . . . . . . . .']
    return bar(rhythms[variant])


def pad(chord):
    return bar(f'{PAD[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


KICK = drums('X... X... X... X...')
CLAP = drums('.... X... .... X...')
SILENT = drums('.... .... .... ....')
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: the rave siren.
    part('texture', 'Sirene', 'pulse', electronic('siren'), [
        drums('.' * 64), drums('X' + '.' * 63), drums('.' * 48 + 'X' + '.' * 15), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 31 + 'X' + '.' * 31),
    ], [4] * 6, gain=.2, clip=1, lpf=9000, hpf=300, design={'role': 'fx'}, effects={'reverb': .3, 'delay': .2, 'pan': -.3}),
    # a2 · pawn: 808 clave syncopation.
    part('rhythm', 'Clave 808', 'pulse', machine('808-clave'), [
        SILENT, drums('x..x ..x. ..x. x...'), SILENT, drums('x..x ..x. ..x. x...'), drums('x... ..x. .... ....'), drums('x..x ..x. ..x. x.xx'),
    ], [1] * 6, gain=.15, clip=.6, lpf=9000, hpf=800, effects={'reverb': .08, 'pan': .4}),
    # b1 · knight: the second 303, an octave up, answering.
    part('response', 'Segunda 303', 'phrase', synth('square'), [
        REST4, REST4, REST4, acid(LOOP, 1), acid(BREAK, 1), acid(LOOP, 1),
    ], [4] * 6, octave=3, gain=.08, attack=.002, decay=.12, sustain=.2, release=.05, gate=.5, clip=.9, lpf=900, hpf=200,
        design={'resonance': 16, 'filterEnv': 3, 'filterDecay': .1, 'role': 'lead'}, mapping={'fileDegrees': 0},
        arrangement=arrangement((False, True, False, True, True, True)), effects={'delay': .25, 'reverb': .1, 'pan': .3}),
    # b2 · pawn: 909 claps.
    part('rhythm', 'Palmas 909', 'pulse', machine('909-clap'), [
        SILENT, CLAP, SILENT, CLAP, CLAP, drums('.... X... .... X... .... X... .... X.XX'),
    ], [1, 1, 1, 1, 1, 2], gain=.5, clip=.9, lpf=10000, hpf=400, effects={'reverb': .15, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: house piano stabs.
    part('harmony', 'Piano da Haçienda', 'phrase', recorded('band', 'piano', 1), [
        prog(stabs, LOOP, 2), prog(stabs, LOOP, 0), prog(stabs, BREAK, 2), prog(stabs, LOOP, 1), prog(stabs, BREAK, 0), prog(stabs, LOOP, 1),
    ], [4] * 6, octave=3, gain=.16, attack=.003, decay=.4, sustain=.3, release=.2, gate=.45, clip=.95, lpf=8000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, False, True)), effects={'reverb': .2, 'pan': -.15}),
    # c2 · pawn: 909 closed hats.
    part('rhythm', 'Chimbal 909', 'pulse', machine('909-hat'), [
        drums('..x. ..x. ..x. ..x.'), drums('xgxg xgxg xgxg xgxg'), SILENT,
        drums('xgXg xgXg xgXg xgXg'), drums('xgxg xgxg xgxg xgxg'), drums('xgXg xgXg xgXg xgXr'),
    ], [1] * 6, gain=.8, clip=.6, lpf=15000, hpf=4500, effects={'reverb': .03, 'pan': .15}),
    # d1 · queen: the TB-303 acid line.
    part('melody', 'TB-303', 'phrase', synth('sawtooth'), [
        acid(BREAK, 0), acid(LOOP, 0), acid(BREAK, 1), acid(LOOP, 0), acid(BREAK, 0), acid(LOOP, 1),
    ], [4] * 6, octave=2, gain=.3, attack=.002, decay=.15, sustain=.25, release=.04, gate=.55, clip=.95, lpf=700, hpf=40,
        design={'resonance': 18, 'filterEnv': 3.5, 'filterDecay': .12, 'lfoTarget': 'lpf', 'lfoRate': 16, 'lfoUnit': 'bars', 'lfoDepth': .6, 'role': 'lead'},
        mapping={'fileDegrees': 0, 'panWidth': .05}, arrangement=arrangement((True, True, True, True, True, True), restart=False),
        distortion=1.5, distortionMix=.4, effects={'reverb': .08, 'delay': .18, 'pan': 0}),
    # d2 · pawn: deep 808-style sine sub under the acid.
    part('bass', 'Sub 808', 'phrase', synth('sine'), [
        REST4, prog(bassline, LOOP), REST4, prog(bassline, LOOP), prog(bassline, BREAK), prog(bassline, LOOP),
    ], [4] * 6, octave=1, gain=.5, attack=.002, decay=.5, sustain=.6, release=.1, gate=.8, clip=.95, lpf=300, hpf=25,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # e1 · king: string pad, arrives with castling.
    part('texture', 'Pad de cordas', 'sustain', synth('supersaw'), [
        prog(pad, BREAK), prog(pad, LOOP), prog(pad, BREAK), prog(pad, LOOP), prog(pad, BREAK), prog(pad, LOOP),
    ], [4] * 6, octave=3, gain=.05, attack=.6, decay=1, sustain=.85, release=1, gate=.97, clip=1, lpf=2500, hpf=200,
        design={'unison': 3, 'detune': .15, 'spread': .7, 'role': 'pad'},
        arrangement=arrangement((False, False, True, True, True, True), restart=False), effects={'reverb': .4, 'pan': .2}),
    # e2 · pawn: 909 kick.
    part('rhythm', 'Bumbo 909', 'pulse', machine('909-kick-hard'), [
        drums('X... .... X... ....'), KICK, SILENT, KICK, KICK, KICK,
    ], [1] * 6, gain=.55, clip=.5, lpf=9000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: rave stabs.
    part('harmony', 'Rave stab', 'phrase', electronic('rave-stab', True), [
        REST4, prog(stabs, LOOP, 1), prog(stabs, BREAK, 2), prog(stabs, LOOP, 0), REST4, prog(stabs, LOOP, 0),
    ], [4] * 6, octave=3, gain=.12, attack=.002, decay=.25, sustain=.2, release=.1, gate=.4, clip=.9, lpf=7000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, True, True)), effects={'reverb': .25, 'delay': .15, 'pan': .3}),
    # f2 · pawn: 909 open hat.
    part('rhythm', 'Chimbal aberto 909', 'pulse', machine('909-open-hat'), [
        SILENT, drums('..x. ..x. ..x. ..x.'), SILENT, drums('..X. ..X. ..X. ..X.'), drums('..x. ..x. ..x. ..x.'), drums('..X. ..X. ..X. ..X.'),
    ], [1] * 6, gain=.6, clip=.6, lpf=14000, hpf=3500, effects={'reverb': .05, 'pan': -.2}),
    # g1 · knight: dancefloor whistles.
    part('response', 'Apito', 'pulse', electronic('whistle', True), [
        drums('.... .... .... .... .... .... .... ....'), drums('.... .... .... .... .... .... ..x. x...'),
        drums('.... .... .... .... .... .... .... ....'), drums('x... x... .... .... x... x... x.x. x...'),
        drums('.... .... .... .... .... .... .... ....'), drums('x... x... .... .... x... x... x.x. x.x.'),
    ], [2] * 6, gain=.12, clip=.8, lpf=9000, hpf=1000, design={'role': 'fx'}, effects={'reverb': .3, 'pan': -.35},
        arrangement=arrangement((False, True, False, True, True, True))),
    # g2 · pawn: 808 congas.
    part('rhythm', 'Congas 808', 'pulse', machine('808-conga-low'), [
        SILENT, drums('...x ..x. .x.. x.x.'), drums('.... ..x. .... ..x.'), drums('...x ..x. .x.. x.x.'), drums('...x .... .x.. ....'), drums('...x ..x. .xx. x.xx'),
    ], [1] * 6, gain=.15, clip=.7, lpf=8000, hpf=150, effects={'reverb': .12, 'pan': .4}),
    # h1 · rook: 909 crash.
    part('texture', 'Prato 909', 'pulse', machine('909-crash'), [
        drums('.' * 64), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 31 + 'X' + '.' * 31), drums('X' + '.' * 63), drums('X' + '.' * 31 + 'X' + '.' * 31),
    ], [4] * 6, gain=.3, clip=1, lpf=13000, hpf=500, design={'role': 'fx'}, effects={'reverb': .2, 'pan': .2}),
    # h2 · pawn: 909 snare rolls building into the drop.
    part('rhythm', 'Rufo de caixa', 'pulse', machine('909-snare'), [
        SILENT, SILENT, drums('x.x. x.x. xxxx rrrr'), SILENT, drums('.... .... x.x. xxxx'), drums('x.x. xxxx rrrr RRRR'),
    ], [1] * 6, gain=.3, clip=.8, lpf=10000, hpf=150, effects={'reverb': .2, 'pan': -.1},
        arrangement=arrangement(fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Haçienda · acid house 1988', 'bpm': 128, 'root': 'G', 'scale': 'Menor natural', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Drop', 'Interlude', 'Drop'],
    'parts': parts,
    'reactions': reactions([
        rule('mcr-opening', 'opening', 'both', 1, True, [act('variation', 0)]),
        rule('mcr-middle', 'middle', 'both', 1, True, [act('variation', 1)]),
        rule('mcr-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 5)]),
        rule('mcr-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('mcr-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 3)]),
        # The 303 tweak: tension slowly opens the cutoff and pushes the resonance.
        rule('mcr-tension', 'tension', 'both', 1, True, [act('lpf', 2600, rampBars=8), act('resonance', 24)], 'lead'),
        rule('mcr-swing', 'evalSwing', 'actor', 2, True, [act('lpf', 4000, rampBars=2), act('drive', 4)], 'lead'),
        rule('mcr-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('mcr-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('lpf', 400, rampBars=2)], 'lead'),
        rule('mcr-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('mcr-promo', 'promotion', 'actor', 4, True, [act('variation', 5), act('transpose', 5)]),
    ]),
    'reference': 'Acid house de Manchester (Haçienda, 808 State, A Guy Called Gerald, 1988): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Acid_house',
}
write('manchester', profile)
