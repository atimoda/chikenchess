"""Paris 1995 · French touch: filtered disco loops pumping under the kick (original material).

124 BPM on a compressed 909. The 'sampled loop' is played live: chicken-scratch
guitar, Rhodes chords, disco strings and a funky bass, all ducked by the kick
(the sidechain pump) and swept by a low-pass filter that the game opens and
closes. A squelchy resonant lead on the bishop, a vocoder hook on the queen,
brass stabs, tambourine and vinyl crackle. B natural minor, Bm7–Em7–Gmaj7–A.
Degrees: 0 B · 1 C# · 2 D · 3 E · 4 F# · 5 G · 6 A · 7 B'.
"""
from kit import (act, arrangement, bar, bars, drums, electronic, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Bm7', 'Em7', 'Gmaj7', 'A')
VAMP = ('Bm7', 'Bm7', 'Em7', 'Em7')
ROOT = {'Bm7': 0, 'Em7': -4, 'Gmaj7': -2, 'A': -1}
VOICING = {'Bm7': '2,4,6,7', 'Em7': '2,3,5,7', 'Gmaj7': '2,4,5,7', 'A': '1,3,6'}
PAD = {'Bm7': '0,2,4,6', 'Em7': '-4,-2,0,2', 'Gmaj7': '-2,0,2,4', 'A': '-1,1,3'}
PUMP = {'duckSource': 'e2', 'duckDepth': .6, 'duckRelease': .2}


def bassline(chord, variant=0):
    r = ROOT[chord]
    shapes = [
        [r, '.', r + 7, '.', '.', r, '.', r + 7, '.', r, '.', r + 7, r + 6, '.', r + 4, '.'],
        [r, '.', r + 7, r, '.', r, r + 7, '.', r, '.', r + 7, '.', r + 6, r + 7, r + 4, r + 2],
        [f'{r}_', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ]
    return bar(' '.join(str(n) for n in shapes[variant]))


def scratch(chord):
    c = VOICING[chord]
    return bar(f". {c}' {c} {c}' . {c}' {c} {c}' . {c}' {c} {c}' . {c}' {c} {c}'")


def rhodes(chord, variant=0):
    c = VOICING[chord]
    shapes = [f'{c}_ . . . . . . . . . . . . . . .', f'. . {c} . . . {c} . . . {c} . . . {c} .']
    return bar(shapes[variant])


def brass(chord):
    c = VOICING[chord]
    return bar(f'. . . . . . {c}! . . . . . . . {c} .')


def pad(chord):
    return bar(f'{PAD[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


KICK = drums('X... X... X... X...')
CLAP = drums('.... X... .... X...')
SILENT = drums('.... .... .... ....')
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: vinyl crackle — the loop came from a record.
    part('texture', 'Chiado de vinil', 'pulse', electronic('vinyl'), [
        drums('X' + '.' * 15), drums('X' + '.' * 15), drums('X' + '.' * 15), drums('.' * 16), drums('X' + '.' * 15), drums('.' * 16),
    ], [1] * 6, gain=.3, clip=1, lpf=9000, hpf=500, design={'role': 'fx'}, effects={'reverb': 0, 'pan': -.2}),
    # a2 · pawn: studio shaker.
    part('rhythm', 'Shaker de estúdio', 'pulse', recorded('percussion', 'shaker', pitched=False), [
        SILENT, drums('gxgx gxgx gxgx gxgx'), drums('gxgx gxgx gxgx gxgx'), drums('gxgX gxgX gxgX gxgX'), drums('..x. ..x. ..x. ..x.'), drums('gxgX gxgX gxgX gxgX'),
    ], [1] * 6, gain=.25, clip=.6, lpf=13000, hpf=3000, effects={'reverb': .05, 'pan': .3}),
    # b1 · knight: filtered chicken-scratch guitar loop.
    part('response', 'Guitarra filtrada', 'phrase', recorded('guitars', 'muted'), [
        prog(scratch, LOOP), prog(scratch, LOOP), prog(scratch, VAMP), prog(scratch, LOOP), prog(scratch, VAMP), prog(scratch, LOOP),
    ], [4] * 6, octave=3, gain=.25, attack=.002, decay=.12, sustain=.2, release=.05, gate=.35, clip=.9, lpf=1800, hpf=250,
        design={**PUMP, 'lfoTarget': 'lpf', 'lfoRate': 8, 'lfoUnit': 'bars', 'lfoDepth': .5}, mapping={'fileDegrees': 0},
        arrangement=arrangement((True, True, True, True, True, True)), effects={'reverb': .1, 'pan': .3}),
    # b2 · pawn: 909 claps.
    part('rhythm', 'Palmas 909', 'pulse', machine('909-clap'), [
        SILENT, CLAP, SILENT, CLAP, CLAP, drums('.... X... .... X... .... X... .... X.XX'),
    ], [1, 1, 1, 1, 1, 2], gain=.45, clip=.9, lpf=10000, hpf=400, effects={'reverb': .12, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: Rhodes chords in the loop.
    part('harmony', 'Rhodes', 'phrase', recorded('keys', 'rhodes'), [
        prog(rhodes, LOOP, 0), prog(rhodes, LOOP, 1), prog(rhodes, VAMP, 0), prog(rhodes, LOOP, 1), prog(rhodes, VAMP, 0), prog(rhodes, LOOP, 1),
    ], [4] * 6, octave=3, gain=0.06, attack=.003, decay=.6, sustain=.4, release=.3, gate=.7, clip=.95, lpf=5000, hpf=150,
        design=dict(PUMP), mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .2, 'pan': -.2}),
    # c2 · pawn: 909 hats.
    part('rhythm', 'Chimbal 909', 'pulse', machine('909-hat'), [
        SILENT, drums('x.x. x.x. x.x. x.x.'), drums('..x. ..x. ..x. ..x.'), drums('xgxg xgxg xgxg xgxg'), drums('x.x. x.x. x.x. x.x.'), drums('xgXg xgXg xgXg xgXr'),
    ], [1] * 6, gain=1, clip=.6, lpf=15000, hpf=4500, effects={'reverb': .03, 'pan': .15}),
    # d1 · queen: the vocoder hook.
    part('melody', 'Vocoder', 'phrase', electronic('robot-voice', True), [
        REST4,
        bars(bar('7 . . 7 . . 6 . 4 . . . 6 . . .'), bar('. . . . . . . . . . . . . . . .'), bar('5 . . 5 . . 4 . 2 . . . 4 . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('5_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7 . . 7 . . 6 . 4 . . . 6 . 7 .'), bar('9_ . . . . . 7 . . . 6 . . . . .'), bar('5 . . 5 . . 4 . 2 . . . 4 . 5 .'), bar('6_ . . . . . . . 4 . . . 2 . 1 .')),
        REST4,
        bars(bar('7 . . 7 . . 6 . 4 . . . 6 . 7 .'), bar('9_ . . . . . 7 . . . 6 . . . . .'), bar('5 . . 5 . . 4 . 2 . . . 4 . 5 .'), bar('7_ . . . . . . . 9 . 11 . 9 . 7 .')),
    ], [4] * 6, octave=3, gain=.3, attack=.01, decay=.3, sustain=.7, release=.15, gate=.8, clip=.95, lpf=5000, hpf=200,
        mapping={'fileDegrees': 0, 'panWidth': .1}, arrangement=arrangement((False, True, True, True, False, True), restart=True),
        effects={'reverb': .2, 'delay': .2, 'pan': 0}),
    # d2 · pawn: funky octave bass, pumping.
    part('bass', 'Baixo funk', 'phrase', recorded('guitars', 'bass'), [
        prog(bassline, LOOP, 2), prog(bassline, LOOP, 0), prog(bassline, VAMP, 2), prog(bassline, LOOP, 1), prog(bassline, VAMP, 0), prog(bassline, LOOP, 1),
    ], [4] * 6, octave=2, gain=0.4, attack=.003, decay=.25, sustain=.5, release=.08, gate=.6, clip=.95, lpf=1500, hpf=30,
        design={**PUMP, 'duckDepth': .4, 'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # e1 · king: disco strings, pumping, arrive with castling.
    part('texture', 'Cordas da disco', 'sustain', recorded('classical', 'violin-sustain'), [
        prog(pad, LOOP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP),
    ], [4] * 6, octave=4, gain=.12, attack=.3, decay=1, sustain=.85, release=.6, gate=.97, clip=1, lpf=4500, hpf=250,
        design={**PUMP, 'role': 'pad'}, arrangement=arrangement((True, False, True, True, False, True), restart=False), effects={'reverb': .3, 'pan': .2}),
    # e2 · pawn: compressed 909 kick — the sidechain source.
    part('rhythm', 'Bumbo comprimido', 'pulse', machine('909-kick'), [
        drums('X... .... X... ....'), KICK, SILENT, KICK, KICK, KICK,
    ], [1] * 6, gain=0.6, clip=.5, lpf=9000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: squelchy resonant lead.
    part('melody', 'Lead squelch', 'phrase', synth('sawtooth'), [
        bars(bar('0 . . 0 . . 7~-7 . . 0 . . 5 . 3 .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('0 . . 0 . . 7~-7 . . 0 . . 5 . 3 .'), bar('2 . . 2 . . 0 . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . 7 . 9 .'), bar('. . . . . . . . . . . . 6 . 4 .')),
        bars(bar('0 . . 0 . . 7~-7 . . 0 . . 5 . 3 .'), bar('2 . . 2 . . 0 . . . . . . . . .')),
        bars(bar('. . . . . . . . 7 . 9 . 10 . 9 .'), bar('. . . . . . . . . . . . 6 . 4 .')),
    ], [2] * 6, octave=3, gain=0.3, attack=.003, decay=.2, sustain=.3, release=.08, gate=.6, clip=.95, lpf=900, hpf=120,
        design={'resonance': 14, 'filterEnv': 2.8, 'filterDecay': .15, 'role': 'lead'}, mapping={'fileDegrees': 0},
        arrangement=arrangement((True, False, True, True, True, True)), distortion=1.5, distortionMix=.35, effects={'reverb': .12, 'delay': .2, 'pan': -.3}),
    # f2 · pawn: 909 open hat.
    part('rhythm', 'Chimbal aberto 909', 'pulse', machine('909-open-hat'), [
        SILENT, drums('..x. ..x. ..x. ..x.'), SILENT, drums('..X. ..X. ..X. ..X.'), drums('..x. ..x. ..x. ..x.'), drums('..X. ..X. ..X. ..X.'),
    ], [1] * 6, gain=0.8, clip=.6, lpf=14000, hpf=3500, effects={'reverb': .05, 'pan': -.2}),
    # g1 · knight: disco brass stabs.
    part('response', 'Metais de disco', 'phrase', recorded('jazz', 'brass'), [
        REST4, prog(brass, LOOP), REST4, prog(brass, LOOP), prog(brass, VAMP), prog(brass, LOOP),
    ], [4] * 6, octave=3, gain=0.07, attack=.005, decay=.3, sustain=.4, release=.15, gate=.5, clip=.9, lpf=7000, hpf=200,
        design=dict(PUMP), mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .2, 'pan': .35}),
    # g2 · pawn: tambourine.
    part('rhythm', 'Pandeirola', 'pulse', recorded('percussion', 'tambourine', pitched=False), [
        SILENT, drums('.... x... .... x...'), SILENT, drums('..x. x.x. ..x. x.x.'), drums('.... x... .... x...'), drums('..x. x.x. ..x. x.xx'),
    ], [1] * 6, gain=0.8, clip=.6, lpf=13000, hpf=2500, effects={'reverb': .08, 'pan': -.3}),
    # h1 · rook: 909 crash.
    part('texture', 'Prato 909', 'pulse', machine('909-crash'), [
        drums('.' * 64), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 31 + 'X' + '.' * 31), drums('X' + '.' * 63), drums('X' + '.' * 31 + 'X' + '.' * 31),
    ], [4] * 6, gain=.3, clip=1, lpf=13000, hpf=500, design={'role': 'fx'}, effects={'reverb': .2, 'pan': .2}),
    # h2 · pawn: 909 snare rolls into each section.
    part('rhythm', 'Rufo 909', 'pulse', machine('909-snare-tight'), [
        SILENT, SILENT, drums('x.x. xxxx rrrr RRRR'), SILENT, drums('.... .... x.x. rrrr'), drums('x.x. xxxx rrrr RRRR'),
    ], [1] * 6, gain=.25, clip=.8, lpf=10000, hpf=200, effects={'reverb': .15, 'pan': -.1},
        arrangement=arrangement(fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'French touch · filter house 1995', 'bpm': 124, 'root': 'B', 'scale': 'Menor natural', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions([
        rule('par-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('par-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('par-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('lpf', 16000, rampBars=8)]),
        rule('par-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('par-check', 'check', 'actor', 1, True, [act('activate'), act('gain', 4)]),
        # The filter house move: tension closes the low-pass over the whole loop, a swing throws it open.
        rule('par-tension', 'tension', 'both', 1, True, [act('lpf', 500, rampBars=8)], 'pad'),
        rule('par-tension-lead', 'tension', 'both', 1, True, [act('lpf', 500, rampBars=8)], 'lead'),
        rule('par-swing', 'evalSwing', 'actor', 2, True, [act('lpf', 18000, rampBars=1), act('variation', 5)]),
        rule('par-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('par-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('hpf', 700, rampBars=2)]),
        rule('par-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
    ]),
    'reference': 'French touch de Paris em 1995–97 (Daft Punk, Cassius, Motorbass, Étienne de Crécy): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/French_house',
}
write('paris', profile)
