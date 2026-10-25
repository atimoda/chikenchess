"""Johannesburg 1994 · kwaito from Soweto at the dawn of democracy (original material).

108 BPM: house slowed down to a swagger. A deep, loud, melodic bass under an 808
kick, claps on two and four, the open hat on every offbeat and a rimshot pattern;
township piano chords, bubblegum synth strings, a short synth riff, marimba and
organ stabs, with chanted call-and-response vocals on the queen and 'hey!'
shouts on the rook. D Dorian, the Dm7–G–Am7–G loop, with a light swing.
Degrees: 0 D · 1 E · 2 F · 3 G · 4 A · 5 B · 6 C · 7 D'.
"""
from kit import (act, arrangement, bar, bars, drums, electronic, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Dm7', 'G', 'Am7', 'G')
VAMP = ('Dm7', 'Dm7', 'G', 'G')
ROOT = {'Dm7': 0, 'G': -4, 'Am7': -3}
VOICING = {'Dm7': '2,4,6,7', 'G': '1,3,5', 'Am7': '2,4,6,8'}
PAD = {'Dm7': '0,2,4,6', 'G': '-4,-2,0', 'Am7': '-3,-1,1,3'}


def bassline(chord, variant=0):
    r = ROOT[chord]
    shapes = [
        [r, '.', '.', r, '.', '.', r + 4, '.', '.', '.', r + 7, '.', r + 4, '.', '.', '.'],
        [r, '.', '.', r, '.', '.', r + 4, '.', '.', r + 6, r + 7, '.', r + 4, '.', r + 2, '.'],
        [f'{r}_', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ]
    return bar(' '.join(str(n) for n in shapes[variant]))


def piano(chord, variant=0):
    c = VOICING[chord]
    shapes = [f'. . {c} . . . {c} . . . {c} . . . {c} .', f'{c} . . {c} . . {c} . . . {c} . . {c} . .', f'{c}_ . . . . . . . . . . . . . . .']
    return bar(shapes[variant])


def pad(chord):
    return bar(f'{PAD[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


KICK = drums('X... X... X... X...')
CLAP = drums('.... X... .... X...')
SILENT = drums('.... .... .... ....')
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: crowd 'hey!' shouts.
    part('response', 'Grito da rua', 'pulse', electronic('hey'), [
        drums('.' * 32), drums('.' * 28 + 'X...'), drums('.' * 32), drums('.... .... X... .... .... .... X... ....'), drums('.' * 28 + 'X...'), drums('.... .... X... .... .... .... X... X...'),
    ], [2] * 6, gain=.35, clip=.9, lpf=9000, hpf=200, design={'role': 'fx'}, effects={'reverb': .2, 'delay': .15, 'pan': -.25},
        arrangement=arrangement((False, True, False, True, True, True))),
    # a2 · pawn: 808 rimshot pattern.
    part('rhythm', 'Rim 808', 'pulse', machine('808-rim'), [
        SILENT, drums('..x. .x.. ..x. ...x'), SILENT, drums('..x. .x.. ..x. .x.x'), drums('..x. .... ..x. ....'), drums('..x. .x.. ..x. .xxx'),
    ], [1] * 6, gain=.15, clip=.6, lpf=9000, hpf=600, effects={'reverb': .08, 'pan': .35}),
    # b1 · knight: the short synth riff.
    part('response', 'Riff de táxi', 'phrase', synth('square'), [
        REST4,
        bars(bar('7 . . 7 . . 6 . . . 4 . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('7 . . 7 . . 9 . . . 7 . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        REST4,
        bars(bar('7 . . 7 . . 6 . . . 4 . 6 . 7 .'), bar('. . . . . . . . . . . . . . . .'), bar('7 . . 7 . . 9 . . . 7 . 6 . 4 .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7 . . 7 . . 6 . . . 4 . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7 . . 7 . . 6 . . . 4 . 6 . 7 .'), bar('. . . . . . . . . . . . . . . .'), bar('7 . . 7 . . 9 . . . 7 . 6 . 4 .'), bar('. . . . . . . . . . . . 9 . 11 .')),
    ], [4] * 6, octave=4, gain=0.25, attack=.003, decay=.15, sustain=.3, release=.08, gate=.45, clip=.9, lpf=2600, hpf=300,
        design={'resonance': 3, 'filterEnv': 1.4, 'filterDecay': .1}, mapping={'fileDegrees': 0},
        arrangement=arrangement((False, True, False, True, True, True)), effects={'delay': .15, 'reverb': .15, 'pan': .3}),
    # b2 · pawn: 808 claps.
    part('rhythm', 'Palmas comunitárias', 'pulse', machine('808-clap'), [
        SILENT, CLAP, drums('.... .... .... X...'), CLAP, CLAP, drums('.... X... .... X... .... X... .... X.XX'),
    ], [1, 1, 1, 1, 1, 2], gain=.4, clip=.9, lpf=9000, hpf=400, effects={'reverb': .15, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: township piano.
    part('harmony', 'Piano township', 'phrase', recorded('band', 'piano', 1), [
        prog(piano, LOOP, 2), prog(piano, LOOP, 0), prog(piano, LOOP, 2), prog(piano, LOOP, 1), prog(piano, VAMP, 0), prog(piano, LOOP, 1),
    ], [4] * 6, octave=3, gain=.15, attack=.003, decay=.4, sustain=.3, release=.25, gate=.5, clip=.95, lpf=8000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .2, 'pan': -.15}),
    # c2 · pawn: 808 closed hats.
    part('rhythm', 'Chimbal 808', 'pulse', machine('808-hat'), [
        SILENT, drums('x.x. x.x. x.x. x.x.'), SILENT, drums('x.xx x.x. x.xx x.x.'), drums('x.x. x.x. x.x. x.x.'), drums('x.xx x.x. x.xx x.xr'),
    ], [1] * 6, gain=1, clip=.5, lpf=15000, hpf=4500, effects={'reverb': .02, 'pan': .15}),
    # d1 · queen: the chanted vocal line (call and response).
    part('melody', 'Voz de chamada', 'phrase', electronic('oh-chant', True), [
        REST4,
        bars(bar('4 . . 4 . . 3 . 2 . . . 0 . . .'), bar('. . . . . . . . . . . . . . . .'), bar('4 . . 4 . . 6 . 4 . . . 3 . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('4_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('3_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7 . . 7 . . 6 . 4 . . . 3 . . .'), bar('4_ . . . . . . . 2 . 3 . 4 . . .'), bar('7 . . 7 . . 9 . 7 . . . 6 . . .'), bar('4_ . . . . . . . 3 . 2 . 0 . . .')),
        bars(bar('4 . . 4 . . 3 . 2 . . . 0 . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7 . . 7 . . 6 . 4 . . . 3 . . .'), bar('4_ . . . . . . . 2 . 3 . 4 . . .'), bar('7 . . 7 . . 9 . 7 . . . 6 . . .'), bar('11_ . . . . . . . 9 . 7 . 6 . 4 .')),
    ], [4] * 6, octave=3, gain=.3, attack=.02, decay=.4, sustain=.7, release=.2, gate=.8, clip=.95, lpf=6000, hpf=180,
        mapping={'fileDegrees': 0, 'panWidth': .1}, arrangement=arrangement((False, True, True, True, True, True), restart=True),
        effects={'reverb': .25, 'delay': .15, 'pan': 0}),
    # d2 · pawn: deep melodic kwaito bass.
    part('bass', 'Baixo de Soweto', 'phrase', synth('square'), [
        prog(bassline, LOOP, 2), prog(bassline, LOOP, 0), prog(bassline, LOOP, 2), prog(bassline, LOOP, 1), prog(bassline, VAMP, 0), prog(bassline, LOOP, 1),
    ], [4] * 6, octave=1, gain=.4, attack=.003, decay=.3, sustain=.6, release=.1, gate=.7, clip=.95, lpf=400, hpf=25,
        design={'resonance': 2, 'filterEnv': 1.2, 'filterDecay': .15, 'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0},
        effects={'reverb': 0, 'pan': 0}),
    # e1 · king: bubblegum synth strings, arrive with castling.
    part('texture', 'Cordas bubblegum', 'sustain', synth('supersaw'), [
        prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP),
    ], [4] * 6, octave=3, gain=.05, attack=.4, decay=1, sustain=.85, release=.8, gate=.97, clip=1, lpf=3000, hpf=200,
        design={'unison': 3, 'detune': .12, 'spread': .6, 'role': 'pad'},
        arrangement=arrangement((True, False, True, True, False, True), restart=False), effects={'reverb': .35, 'pan': .2}),
    # e2 · pawn: 808 kick.
    part('rhythm', 'Bumbo kwaito', 'pulse', machine('808-kick'), [
        drums('X... .... X... ....'), KICK, SILENT, KICK, KICK, KICK,
    ], [1] * 6, gain=.55, clip=.5, lpf=8000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: marimba counter-melody.
    part('melody', 'Marimba de Soweto', 'phrase', recorded('band', 'marimba', 1), [
        bars(bar('0 . 2 . 4 . . . 3 . 2 . 0 . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('7 . 6 . 4 . . . 3 . 4 . . . . .')),
        bars(bar('0 . 2 . 4 . . . 3 . 2 . 0 . . .'), bar('-1 . 0 . 2 . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . 7 . 6 .'), bar('. . . . . . . . . . . . 4 . 3 .')),
        bars(bar('0 . 2 . 4 . . . 3 . 2 . 0 . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . 7 . 9 . 7 . 6 .'), bar('. . . . . . . . . . . . 4 . 3 .')),
    ], [2] * 6, octave=4, gain=0.5, attack=.002, decay=.4, sustain=.2, release=.3, gate=.5, clip=.9, lpf=8000, hpf=300,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .25, 'delay': .15, 'pan': -.35}),
    # f2 · pawn: the offbeat open hat.
    part('rhythm', 'Chimbal aberto', 'pulse', machine('808-open-hat'), [
        drums('..x. ..x. ..x. ..x.'), drums('..x. ..x. ..x. ..x.'), drums('.... .... .... ..x.'),
        drums('..X. ..X. ..X. ..X.'), drums('..x. ..x. ..x. ..x.'), drums('..X. ..X. ..X. ..X.'),
    ], [1] * 6, gain=0.7, clip=.6, lpf=14000, hpf=3500, effects={'reverb': .05, 'pan': -.2}),
    # g1 · knight: organ stabs on the offbeats.
    part('harmony', 'Órgão de igreja', 'phrase', electronic('organ-stab', True), [
        REST4, prog(piano, LOOP, 0), prog(piano, LOOP, 2), prog(piano, LOOP, 0), prog(piano, VAMP, 2), prog(piano, LOOP, 0),
    ], [4] * 6, octave=3, gain=.08, attack=.002, decay=.25, sustain=.2, release=.1, gate=.4, clip=.9, lpf=6000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .2, 'pan': .35}),
    # g2 · pawn: shaker.
    part('rhythm', 'Shaker de rua', 'pulse', recorded('percussion', 'shaker', pitched=False), [
        SILENT, drums('gxgx gxgx gxgx gxgx'), drums('gxgx gxgx gxgx gxgx'), drums('gxgX gxgX gxgX gxgX'), drums('..x. ..x. ..x. ..x.'), drums('gxgX gxgX gxgX gxgX'),
    ], [1] * 6, gain=.3, clip=.6, lpf=13000, hpf=3000, effects={'reverb': .06, 'pan': .25}),
    # h1 · rook: 808 cowbell marking the loop.
    part('rhythm', 'Sino de encontro', 'pulse', machine('808-cowbell'), [
        SILENT, drums('x... .... .... ....'), SILENT, drums('x... ..x. .... ..x.'), drums('x... .... .... ....'), drums('x... ..x. x... ..x.'),
    ], [1] * 6, gain=0.2, clip=.6, lpf=8000, hpf=400, effects={'reverb': .1, 'pan': -.35}),
    # h2 · pawn: 808 conga fills.
    part('rhythm', 'Congas de virada', 'pulse', machine('808-conga-low'), [
        SILENT, SILENT, drums('.... .... x.x. xxxx'), SILENT, drums('.... .... .... ..xx'), drums('.... .... xxxx xxxx'),
    ], [1] * 6, gain=.25, clip=.7, lpf=8000, hpf=100, effects={'reverb': .12, 'pan': .3},
        arrangement=arrangement(fills=(5, 5, None, 5, 5, None))),
]

profile = {
    'name': 'Soweto · kwaito 1994', 'bpm': 108, 'root': 'D', 'scale': 'Dórica', 'harmony': 'static',
    'swing': .1, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions([
        rule('jhb-opening', 'opening', 'both', 1, True, [act('variation', 0)]),
        rule('jhb-middle', 'middle', 'both', 1, True, [act('variation', 1)]),
        rule('jhb-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 4)]),
        rule('jhb-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # Call and response: a check brings the crowd and the chant in for the attacker.
        rule('jhb-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 3)]),
        rule('jhb-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('jhb-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('reverb', .45)]),
        rule('jhb-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('jhb-tension', 'tension', 'both', 1, True, [act('lpf', 250, rampBars=8)], 'bass'),
        rule('jhb-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('transpose', 2)]),
        rule('jhb-promo', 'promotion', 'actor', 4, True, [act('variation', 5), act('relative')]),
    ]),
    'reference': 'Kwaito de Johannesburg/Soweto em 1994 (Arthur Mafokate, Boom Shaka, M’Du): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Kwaito',
}
write('johannesburg', profile)
