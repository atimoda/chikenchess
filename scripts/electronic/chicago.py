"""Chicago 1984 · early house from the Warehouse and the first drum machines (original material).

120 BPM, TR-808 everything: four-on-the-floor kick, claps on two and four, open hat
on the offbeats, cowbell and rim syncopations; a square-wave SH-style bassline,
house piano stabs, an organ riff and an 'oh' vocal on the queen. F natural minor,
the Fm7–Dbmaj7–Eb–Cm7 loop.
Degrees: 0 F · 1 G · 2 Ab · 3 Bb · 4 C · 5 Db · 6 Eb · 7 F'.
"""
from kit import (act, arrangement, bar, bars, drums, electronic, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Fm7', 'Db', 'Eb', 'Cm7')
VAMP = ('Fm7', 'Fm7', 'Eb', 'Eb')
ROOT = {'Fm7': 0, 'Db': -2, 'Eb': -1, 'Cm7': -3}
VOICING = {'Fm7': '2,4,6', 'Db': '2,4,5', 'Eb': '1,3,6', 'Cm7': '1,3,4'}
PAD = {'Fm7': '0,2,4,6', 'Db': '-2,0,2,4', 'Eb': '-1,1,3,5', 'Cm7': '-3,-1,1,3'}


def bassline(chord, variant=0):
    r = ROOT[chord]
    patterns = [
        [r, '.', '.', r, '.', '.', r, '.', '.', r, '.', '.', r, '.', r + 7, '.'],
        [r, '.', r + 7, '.', '.', r, '.', r, '.', '.', r + 7, '.', r, '.', r + 2, r + 4],
        [r, '.', '.', '.', '.', '.', '.', '.', r, '.', '.', '.', '.', '.', '.', '.'],
    ]
    return bar(' '.join(str(c) for c in patterns[variant]))


def stabs(chord, variant=0):
    c = VOICING[chord]
    rhythms = [f'. . {c} . . {c} . . . . {c} . . {c} . .', f'{c} . . {c} . . {c} . . . {c} . . {c} . {c}', f'{c}_ . . . . . . . . . . . . . . .']
    return bar(rhythms[variant])


def pad(chord):
    return bar(f'{PAD[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


KICK = drums('X... X... X... X...')
CLAP = drums('.... X... .... X...')
parts = [
    # a1 · rook: shouted 'hey!' — the jack-your-body call.
    part('response', 'Grito "hey!"', 'pulse', electronic('hey'), [
        drums('.... .... .... .... .... .... .... ..X.'), drums('.... .... .... .... .... .... .... ..X.'),
        drums('.... .... .... .... .... .... .... ....'), drums('.... .... ..X. .... .... .... ..X. ....'),
        drums('.... .... .... .... .... .... .... ..X.'), drums('.... .... ..X. .... .... .... ..X. ..X.'),
    ], [2] * 6, gain=.35, clip=.9, lpf=9000, hpf=200, design={'role': 'fx'}, effects={'reverb': .25, 'delay': .2, 'pan': -.2},
        arrangement=arrangement((False, True, False, True, True, True), restart=True)),
    # a2 · pawn: 808 cowbell syncopation.
    part('rhythm', 'Cowbell 808', 'pulse', machine('808-cowbell'), [
        drums('.... .... .... ....'), drums('..x. ...x ..x. ....'), drums('.... .... .... ....'),
        drums('..x. ...x ..x. ..x.'), drums('..x. .... ..x. ....'), drums('..x. ...x ..x. ..xx'),
    ], [1] * 6, gain=.14, clip=.6, lpf=8000, hpf=400, effects={'reverb': .06, 'pan': -.35}),
    # b1 · knight: the square-wave 'jack' riff with a resonant filter.
    part('response', 'Riff do armazém', 'phrase', synth('square'), [
        bars(bar('7 . . 7 . . 6 . . . 4 . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7 . . 7 . . 6 . . . 4 . . 2 . .'), bar('7 . . 7 . . 9 . . . 7 . 6 . 4 .')),
        bars(bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7 . . 7 . . 6 . . . 4 . . 2 . .'), bar('7 . . 7 . . 9 . . . 7 . 6 . 4 .')),
        bars(bar('7 . . . . . 6 . . . . . 4 . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7 . . 7 . . 6 . . . 4 . . 2 . .'), bar('7 . . 7 . . 9 . . . 7 . 6 . 4 .')),
    ], [2] * 6, octave=4, gain=0.22, attack=.002, decay=.12, sustain=.3, release=.06, gate=.45, clip=.9, lpf=1400, hpf=250,
        design={'resonance': 10, 'filterEnv': 2.4, 'filterDecay': .1, 'role': 'lead'}, mapping={'fileDegrees': 0},
        arrangement=arrangement((False, True, True, True, True, True)), effects={'delay': .18, 'reverb': .12, 'pan': .3}),
    # b2 · pawn: 808 claps on two and four.
    part('rhythm', 'Palmas 808', 'pulse', machine('808-clap'), [
        drums('.... .... .... ....'), CLAP, drums('.... .... .... X...'), CLAP, CLAP, drums('.... X... .... X... .... X... .... X.XX'),
    ], [1, 1, 1, 1, 1, 2], gain=0.4, clip=.9, lpf=9000, hpf=400, effects={'reverb': .14, 'pan': .05},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: house piano stabs.
    part('harmony', 'Piano house', 'phrase', recorded('band', 'piano', 1), [
        prog(stabs, LOOP, 2), prog(stabs, LOOP, 0), prog(stabs, LOOP, 2), prog(stabs, LOOP, 1), prog(stabs, VAMP, 0), prog(stabs, LOOP, 1),
    ], [4] * 6, octave=3, gain=0.17, attack=.003, decay=.4, sustain=.3, release=.2, gate=.45, clip=.95, lpf=8000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .18, 'pan': -.15}),
    # c2 · pawn: 808 closed hats in sixteenths.
    part('rhythm', 'Chimbal 808', 'pulse', machine('808-hat'), [
        drums('x.x. x.x. x.x. x.x.'), drums('xgxg xgxg xgxg xgxg'), drums('..x. ..x. ..x. ..x.'),
        drums('xgXg xgXg xgXg xgXg'), drums('xgxg xgxg xgxg xgxg'), drums('xgXg xgXg xgXg xgXr'),
    ], [1] * 6, gain=0.5, clip=.6, lpf=14000, hpf=4000, effects={'reverb': .03, 'pan': .2}),
    # d1 · queen: the vocal 'oh' line — the diva over the machines.
    part('melody', 'Vocal "oh"', 'phrase', electronic('oh-chant', True), [
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . 4 . . . 6 . . .')),
        bars(bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . 9 . 7 . 6 . 4 .'), bar('6_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . 4 . . . 2 . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('9_ . . . . . . . 7 . . . 9 . . .'), bar('11_ . . . . . . . 9 . 7 . 6 . 4 .'), bar('6_ . . . . . . . 7 . . . 9 . . .'), bar('7_ . . . . . . . . . . . . . . .')),
        bars(bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('6_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('9_ . . . . . . . 7 . . . 9 . . .'), bar('11_ . . . . . . . 9 . 7 . 6 . 4 .'), bar('6_ . . . . . . . 7 . . . 9 . . .'), bar('7_ . . . . . . . . . . . . . . .')),
    ], [4] * 6, octave=3, gain=.3, attack=.02, decay=.4, sustain=.8, release=.2, gate=.9, clip=.95, lpf=6000, hpf=180,
        mapping={'fileDegrees': 0, 'panWidth': .1}, arrangement=arrangement((False, True, True, True, True, True), restart=True),
        effects={'reverb': .3, 'delay': .15, 'pan': 0}),
    # d2 · pawn: SH-style square bassline.
    part('bass', 'Baixo SH', 'phrase', synth('square'), [
        prog(bassline, LOOP, 2), prog(bassline, LOOP, 0), prog(bassline, LOOP, 2), prog(bassline, LOOP, 1), prog(bassline, VAMP, 0), prog(bassline, LOOP, 1),
    ], [4] * 6, octave=2, gain=.35, attack=.002, decay=.16, sustain=.5, release=.05, gate=.55, clip=.95, lpf=500, hpf=30,
        design={'resonance': 5, 'filterEnv': 2, 'filterDecay': .12, 'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .05},
        effects={'reverb': 0, 'pan': 0}),
    # e1 · king: Juno string pad, arrives with castling.
    part('texture', 'Pad Juno', 'sustain', synth('supersaw'), [
        prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP),
    ], [4] * 6, octave=3, gain=.06, attack=.4, decay=1, sustain=.85, release=.8, gate=.97, clip=1, lpf=2400, hpf=200,
        design={'unison': 3, 'detune': .15, 'spread': .7, 'lfoTarget': 'lpf', 'lfoRate': 8, 'lfoUnit': 'bars', 'lfoDepth': .3, 'role': 'pad'},
        arrangement=arrangement((True, False, True, True, False, True), restart=False), effects={'reverb': .35, 'pan': .15}),
    # e2 · pawn: 808 kick four to the floor.
    part('rhythm', 'Bumbo 808', 'pulse', machine('808-kick'), [
        KICK, KICK, drums('X... .... .... ....'), KICK, KICK, KICK,
    ], [1] * 6, gain=0.55, clip=.5, lpf=8000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: a simple polysynth lead melody.
    part('melody', 'Lead Poly-61', 'phrase', synth('sawtooth'), [
        bars(bar('4 . . . 6 . . . 7 . . . 6 . 4 .'), bar('2_ . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('4 . . . 6 . . . 7 . . . 9 . 7 .'), bar('6_ . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . 11 . 9 .'), bar('. . . . . . . . . . . . 7 . 6 .')),
        bars(bar('4 . . . 6 . . . 7 . . . 6 . 4 .'), bar('2_ . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . 11 . 9 .'), bar('. . . . . . . . . . . . 7 . 6 .')),
    ], [2] * 6, octave=4, gain=0.32, attack=.01, decay=.3, sustain=.6, release=.2, gate=.8, clip=.9, lpf=2600, hpf=250,
        design={'unison': 1, 'vibrato': 5, 'vibratoDepth': .08}, mapping={'fileDegrees': 0},
        arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .25, 'delay': .25, 'pan': -.3}),
    # f2 · pawn: 808 open hat on the offbeats.
    part('rhythm', 'Chimbal aberto 808', 'pulse', machine('808-open-hat'), [
        drums('..x. ..x. ..x. ..x.'), drums('..x. ..x. ..x. ..x.'), drums('.... .... .... ..x.'),
        drums('..X. ..X. ..X. ..X.'), drums('..x. ..x. ..x. ..x.'), drums('..X. ..X. ..X. ..X.'),
    ], [1] * 6, gain=0.35, clip=.6, lpf=14000, hpf=3500, effects={'reverb': .05, 'pan': -.2}),
    # g1 · knight: house organ stabs.
    part('harmony', 'Órgão house', 'phrase', electronic('organ-stab', True), [
        prog(stabs, LOOP, 2), prog(stabs, LOOP, 1), prog(stabs, LOOP, 2), prog(stabs, LOOP, 0), prog(stabs, VAMP, 1), prog(stabs, LOOP, 0),
    ], [4] * 6, octave=3, gain=0.11, attack=.002, decay=.25, sustain=.2, release=.1, gate=.4, clip=.9, lpf=6000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .15, 'pan': .35}),
    # g2 · pawn: 808 rimshot.
    part('rhythm', 'Rim 808', 'pulse', machine('808-rim'), [
        drums('.... .... .... ....'), drums('...x ..x. .x.. ..x.'), drums('.... .... .... ....'),
        drums('...x ..x. .x.. ..x.'), drums('...x .... .x.. ....'), drums('...x ..x. .x.. .xx.'),
    ], [1] * 6, gain=.14, clip=.6, lpf=9000, hpf=600, effects={'reverb': .08, 'pan': .4}),
    # h1 · rook: 808 cymbal marks each section.
    part('texture', 'Prato 808', 'pulse', machine('808-cymbal'), [
        drums('X' + '.' * 63), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 31 + 'X' + '.' * 31), drums('X' + '.' * 63), drums('X' + '.' * 31 + 'X' + '.' * 31),
    ], [4] * 6, gain=0.4, clip=1, lpf=12000, hpf=600, design={'role': 'fx'}, effects={'reverb': .2, 'pan': .25}),
    # h2 · pawn: 808 toms rolling into the next section.
    part('rhythm', 'Tons 808', 'pulse', machine('808-tom-low'), [
        drums('.... .... .... ....'), drums('.... .... .... ....'), drums('.... .... ..x. x.x.'),
        drums('.... .... .... ....'), drums('.... .... .... ..x.'), drums('.... .... x.x. xxxx'),
    ], [1] * 6, gain=.3, clip=.8, lpf=6000, hpf=50, effects={'reverb': .15, 'pan': -.3},
        arrangement=arrangement(fills=(5, 5, None, 5, 5, None))),
]

profile = {
    'name': 'Warehouse · house 1984', 'bpm': 120, 'root': 'F', 'scale': 'Menor natural', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions([
        rule('chi-opening', 'opening', 'both', 1, True, [act('variation', 0)]),
        rule('chi-middle', 'middle', 'both', 1, True, [act('variation', 1)]),
        rule('chi-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 6)]),
        rule('chi-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # Jack your body: a check throws the shout and the full groove at the attacker.
        rule('chi-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 3)]),
        rule('chi-capture', 'capture', 'actor', 1, False, [act('gain', 5)], 'drums'),
        rule('chi-queen', 'queenCapture', 'both', 2, True, [act('variation', 2), act('lpf', 1200, rampBars=1)]),
        rule('chi-quiet', 'quiet', 'both', 2, True, [act('variation', 2)]),
        rule('chi-drought', 'captureDrought', 'both', 1, True, [act('variation', 4), act('delay', .3)], 'lead'),
        rule('chi-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('gain', 6)]),
        rule('chi-tension', 'tension', 'both', 1, True, [act('lpf', 900, rampBars=8), act('resonance', 14)], 'lead'),
    ]),
    'reference': 'House de Chicago de 1984 (Jesse Saunders, Farley "Jackmaster" Funk, The Warehouse): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Chicago_house',
}
write('chicago', profile)
