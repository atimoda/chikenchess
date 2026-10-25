"""Ibiza 1986 · balearic beat at Amnesia's sunrise (original material).

110 BPM, a soft LinnDrum: round kick on every beat, gated snare on two and four,
cabasa sixteenths, tambourine offbeats and congas. A nylon-string Spanish guitar
sings on the queen, a flute answers, grand piano and marimba carry the chords and
a breathy choir pad floats over the sea. D major with a light swing: the
Dmaj7–Gmaj7–Em7–A loop of the island's sunset sets.
Degrees: 0 D · 1 E · 2 F# · 3 G · 4 A · 5 B · 6 C# · 7 D'.
"""
from kit import (act, arrangement, bar, bars, drums, electronic, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Dmaj7', 'Gmaj7', 'Em7', 'A')
VAMP = ('Dmaj7', 'Dmaj7', 'Gmaj7', 'Gmaj7')
ROOT = {'Dmaj7': 0, 'Gmaj7': -4, 'Em7': 1, 'A': -3}
VOICING = {'Dmaj7': '2,4,6,7', 'Gmaj7': '2,3,5,6', 'Em7': '1,3,5,7', 'A': '1,4,6'}
PAD = {'Dmaj7': '0,2,4,6', 'Gmaj7': '-4,-2,0,2', 'Em7': '-6,-4,-2,0', 'A': '-3,-1,1'}


def bassline(chord, variant=0):
    r = ROOT[chord]
    patterns = [
        [f'{r}_', '.', '.', '.', '.', '.', r + 4, '.', '.', '.', r, '.', '.', '.', r + 4, '.'],
        [r, '.', '.', r, '.', '.', r + 4, '.', r + 7, '.', '.', r + 4, '.', '.', r + 2, '.'],
        [f'{r}_', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ]
    return bar(' '.join(str(c) for c in patterns[variant]))


def piano(chord, variant=0):
    c = VOICING[chord]
    rhythms = [
        f'{c}_ . . . . . . . . . . . . . . .',
        f'{c} . . . . . {c} . . . . . {c} . . .',
        f'. . {c} . . . {c} . . . {c} . . . {c} .',
    ]
    return bar(rhythms[variant])


def arp(chord, variant=0):
    c = [int(n) for n in VOICING[chord].split(',')]
    shapes = [[c[0], '.', c[1], '.', c[2], '.', c[1], '.'] * 2, [c[0], c[1], c[2], c[1], c[-1], c[2], c[1], c[0]] * 2]
    return bar(' '.join(str(n) for n in shapes[variant]))


def strum(chord):
    c = VOICING[chord]
    return bar(f". . {c} . . . {c}' . . . {c} . . {c}' {c} .")


def pad(chord):
    return bar(f'{PAD[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


KICK = drums('x... x... x... x...')
SNARE = drums('.... X... .... X...')
SILENT = drums('.... .... .... ....')
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: breathy choir pad — the 'moments in love' haze.
    part('texture', 'Coro de brisa', 'sustain', electronic('vox-pad', True), [
        prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP),
    ], [4] * 6, octave=4, gain=.08, attack=.6, decay=1, sustain=.85, release=1.2, gate=.97, clip=1, lpf=4500, hpf=250,
        design={'role': 'pad'}, arrangement=arrangement((True, False, True, True, True, True), restart=False), effects={'reverb': .5, 'pan': -.3}),
    # a2 · pawn: LinnDrum cabasa sixteenths.
    part('rhythm', 'Cabasa Linn', 'pulse', machine('linn-cabasa'), [
        drums('x.x. x.x. x.x. x.x.'), drums('xgxg xgxg xgxg xgxg'), drums('..x. ..x. ..x. ..x.'),
        drums('xgxg xgxg xgxg xgxg'), drums('x.x. x.x. x.x. x.x.'), drums('xgxg xgxg xgxg xgxr'),
    ], [1] * 6, gain=0.6, clip=.6, lpf=14000, hpf=3000, effects={'reverb': .05, 'pan': .3}),
    # b1 · knight: marimba arpeggio answering the guitar.
    part('response', 'Marimba do pôr do sol', 'phrase', recorded('band', 'marimba', 1), [
        REST4, prog(arp, LOOP, 0), prog(arp, LOOP, 0), prog(arp, LOOP, 1), prog(arp, VAMP, 0), prog(arp, LOOP, 1),
    ], [4] * 6, octave=3, gain=0.25, attack=.002, decay=.4, sustain=.2, release=.3, gate=.5, clip=.9, lpf=8000, hpf=300,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, True, True)), effects={'reverb': .3, 'delay': .15, 'pan': .35}),
    # b2 · pawn: gated LinnDrum snare on two and four.
    part('rhythm', 'Caixa Linn', 'pulse', machine('linn-snare'), [
        SILENT, SNARE, SILENT, SNARE, drums('.... .... .... X...'), drums('.... X... .... X... .... X... .... X.gX'),
    ], [1, 1, 1, 1, 1, 2], gain=.3, clip=.9, lpf=9000, hpf=200, effects={'reverb': .25, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: grand piano chords.
    part('harmony', 'Piano de cauda', 'phrase', recorded('keys', 'grand'), [
        prog(piano, LOOP, 0), prog(piano, LOOP, 1), prog(piano, LOOP, 0), prog(piano, LOOP, 2), prog(piano, VAMP, 0), prog(piano, LOOP, 2),
    ], [4] * 6, octave=3, gain=0.07, attack=.003, decay=.8, sustain=.4, release=.5, gate=.8, clip=.95, lpf=7000, hpf=120,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .35, 'pan': -.1}),
    # c2 · pawn: tambourine on the offbeats.
    part('rhythm', 'Pandeirola Linn', 'pulse', machine('linn-tambourine'), [
        SILENT, drums('..x. ..x. ..x. ..x.'), SILENT, drums('..X. ..x. ..X. ..x.'), drums('..x. .... ..x. ....'), drums('..X. ..x. ..X. ..xx'),
    ], [1] * 6, gain=.25, clip=.6, lpf=13000, hpf=2500, effects={'reverb': .1, 'pan': -.25}),
    # d1 · queen: nylon-string Spanish guitar melody.
    part('melody', 'Violão espanhol', 'phrase', recorded('guitars', 'nylon'), [
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . 4 . 5 . 6 . 7 .')),
        bars(bar('9_ . . . . . 7 . . . 6 . 7 . . .'), bar('5_ . . . . . . . 4 . . . 2 . . .'), bar('3_ . . . . . 4 . 5 . . . 4 . 3 .'), bar('4_ . . . . . . . . . . . . . . .')),
        bars(bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('8_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('11 . 10 . 9 . . . 7 . . . 9 . . .'), bar('10_ . . . . . 9 . 7 . . . 6 . 5 .'), bar('8 . 7 . 6 . . . 5 . . . 6 . 7 .'), bar('8_ . . . . . . . 6*2 . 7 . 8 . 9 .')),
        bars(bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . 6 . 5 . 4 . . .'), bar('5_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('11 . 10 . 9 . . . 7 . . . 9 . . .'), bar('10_ . . . . . 9 . 7 . . . 6 . 5 .'), bar('8 . 7 . 6 . . . 5 . . . 6 . 7 .'), bar('14_ . . . . . . . 11 . 10 . 9 . 8 .')),
    ], [4] * 6, octave=3, gain=.4, attack=.003, decay=.6, sustain=.4, release=.4, gate=.85, clip=.95, lpf=8000, hpf=150,
        mapping={'fileDegrees': 0, 'panWidth': .1}, arrangement=arrangement((False, True, True, True, True, True), restart=True),
        effects={'reverb': .3, 'delay': .12, 'pan': 0}),
    # d2 · pawn: round fretless-style bass.
    part('bass', 'Baixo fretless', 'phrase', recorded('strings', 'bass-round'), [
        prog(bassline, LOOP, 2), prog(bassline, LOOP, 0), prog(bassline, LOOP, 2), prog(bassline, LOOP, 1), prog(bassline, VAMP, 0), prog(bassline, LOOP, 1),
    ], [4] * 6, octave=2, gain=0.65, attack=.005, decay=.4, sustain=.6, release=.15, gate=.75, clip=.95, lpf=1200, hpf=30,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .05}, effects={'reverb': .03, 'pan': 0}),
    # e1 · king: warm analog pad, arrives with castling.
    part('texture', 'Pad do horizonte', 'sustain', recorded('synths', 'analog-pad'), [
        prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP),
    ], [4] * 6, octave=3, gain=.03, attack=.8, decay=1, sustain=.85, release=1.2, gate=.97, clip=1, lpf=2600, hpf=180,
        design={'role': 'pad', 'lfoTarget': 'lpf', 'lfoRate': 8, 'lfoUnit': 'bars', 'lfoDepth': .3},
        arrangement=arrangement((True, False, True, True, False, True), restart=False), effects={'reverb': .45, 'pan': .2}),
    # e2 · pawn: soft LinnDrum kick on every beat.
    part('rhythm', 'Bumbo Linn', 'pulse', machine('linn-kick'), [
        drums('x... .... x... ....'), KICK, SILENT, KICK, drums('x... .... x... ....'), KICK,
    ], [1] * 6, gain=0.7, clip=.5, lpf=8000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: flute answering the guitar phrases.
    part('melody', 'Flauta de Formentera', 'phrase', recorded('classical', 'flute-sustain'), [
        bars(bar('. . . . . . . . 7 . . . 9_ . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . 9 . 8 . 7_ . . .')),
        bars(bar('9_ . . . . . . . . . . . . . . .'), bar('7_ . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . 11 . 9 .')),
        bars(bar('. . . . . . . . 7 . . . 9_ . . .'), bar('8_ . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . 11 . 12 .')),
    ], [2] * 6, octave=4, gain=0.4, attack=.05, decay=.4, sustain=.8, release=.4, gate=.9, clip=.9, lpf=9000, hpf=300,
        design={'vibrato': 5, 'vibratoDepth': .08}, mapping={'fileDegrees': 0},
        arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .4, 'delay': .2, 'pan': -.35}),
    # f2 · pawn: shaker.
    part('rhythm', 'Shaker', 'pulse', recorded('percussion', 'shaker', pitched=False), [
        SILENT, drums('gxgx gxgx gxgx gxgx'), drums('gxgx gxgx gxgx gxgx'), drums('gxgX gxgX gxgX gxgX'), drums('..x. ..x. ..x. ..x.'), drums('gxgX gxgX gxgX gxgX'),
    ], [1] * 6, gain=.25, clip=.6, lpf=13000, hpf=3000, effects={'reverb': .08, 'pan': .2}),
    # g1 · knight: steel-string strums.
    part('harmony', 'Violão de aço', 'phrase', recorded('strings', 'steel'), [
        REST4, prog(strum, LOOP), REST4, prog(strum, LOOP), prog(strum, VAMP), prog(strum, LOOP),
    ], [4] * 6, octave=3, gain=0.12, attack=.003, decay=.4, sustain=.3, release=.2, gate=.5, clip=.9, lpf=7000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .2, 'pan': .4}),
    # g2 · pawn: LinnDrum congas.
    part('rhythm', 'Congas Linn', 'pulse', machine('linn-conga'), [
        drums('.... ..x. .... x.x.'), drums('x..x ..x. x..x ..x.'), SILENT, drums('x..x ..x. x.xx ..x.'), drums('x..x .... x... ....'), drums('x..x ..x. x.xx .xx.'),
    ], [1] * 6, gain=.2, clip=.7, lpf=8000, hpf=150, effects={'reverb': .15, 'pan': -.4}),
    # h1 · rook: the sea — filtered pink noise breathing every two bars.
    part('texture', 'Ondas do mar', 'sustain', synth('pink'), [
        bars(bar('0_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
    ] * 6, [2] * 6, octave=3, gain=.05, attack=1.5, decay=1, sustain=.6, release=1.5, gate=.9, clip=1, lpf=1200, hpf=200,
        design={'role': 'fx', 'lfoTarget': 'lpf', 'lfoRate': 2, 'lfoUnit': 'bars', 'lfoDepth': .6},
        arrangement=arrangement((True, False, True, False, True, False), restart=False), effects={'reverb': .5, 'pan': -.15}),
    # h2 · pawn: bongo fills into the next section.
    part('rhythm', 'Bongôs', 'pulse', recorded('percussion', 'bongo', pitched=False), [
        SILENT, SILENT, drums('.... .... ..x. x.xx'), SILENT, drums('.... .... .... ..xx'), drums('.... .... x.xx xxxx'),
    ], [1] * 6, gain=.3, clip=.8, lpf=8000, hpf=100, effects={'reverb': .15, 'pan': .3},
        arrangement=arrangement(fills=(5, 5, None, 5, 5, None))),
]

profile = {
    'name': 'Amnesia · balearic 1986', 'bpm': 110, 'root': 'D', 'scale': 'Maior', 'harmony': 'static',
    'swing': .08, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions([
        rule('ibz-opening', 'opening', 'both', 1, True, [act('variation', 0)]),
        rule('ibz-middle', 'middle', 'both', 1, True, [act('variation', 1)]),
        # The sun comes up at the endgame: full band, a little brighter.
        rule('ibz-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('lpf', 9000, rampBars=8)]),
        rule('ibz-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('ibz-check', 'check', 'actor', 1, True, [act('activate'), act('gain', 3)]),
        rule('ibz-quiet', 'quiet', 'both', 2, True, [act('variation', 2), act('reverb', .6)]),
        rule('ibz-queen', 'queenCapture', 'both', 4, True, [act('variation', 4), act('delay', .35)]),
        rule('ibz-capture', 'capture', 'actor', 1, False, [act('gain', 3)], 'drums'),
        rule('ibz-tension', 'tension', 'both', 1, True, [act('reverb', .55), act('lpf', 2500, rampBars=8)], 'pad'),
        rule('ibz-drought', 'captureDrought', 'both', 2, True, [act('variation', 2)]),
        rule('ibz-swing', 'evalSwing', 'actor', 2, True, [act('variation', 3), act('transpose', 2)]),
    ]),
    'reference': 'Balearic beat de Ibiza (Alfredo no Amnesia, 1986–87): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Balearic_beat',
}
write('ibiza', profile)
