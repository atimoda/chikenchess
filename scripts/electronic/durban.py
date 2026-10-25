"""Durban 2016 · gqom from the townships (original material).

126 BPM, broken and kickless on the one: the groove is carried by hammering
tresillo toms, with the kick placed around them, a clap on four, shaker
sixteenths and a high tom answering. A booming 808-style sine bass, an ominous
choir drone, a dark square stab and metal hits; the queen chants a low,
repeated call, shouts and whistles answer from the crowd. C Phrygian, a drone on
C with the flat-second Db for menace.
Degrees: 0 C · 1 Db · 2 Eb · 3 F · 4 G · 5 Ab · 6 Bb · 7 C'.
"""
from kit import (act, arrangement, bar, bars, drums, electronic, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Cm', 'Cm', 'Cm', 'Db')
DRONE = ('Cm', 'Cm', 'Cm', 'Cm')
ROOT = {'Cm': 0, 'Db': 1}
CHORD = {'Cm': '0,2,4', 'Db': '1,3,5'}


def bass(chord, variant=0):
    r = ROOT[chord]
    shapes = [f'. . . {r}_ . . . . . . {r} . . . . .', f'. . . {r}_ . . {r} . . . {r} . . . {r - 1} .']
    return bar(shapes[variant])


def stab(chord, variant=0):
    c = CHORD[chord]
    shapes = [f'. . . . . . {c}! . . . . . . . . .', f'. . . {c}! . . {c} . . . . . . {c} . .']
    return bar(shapes[variant])


def drone(chord):
    return bar(f'{CHORD[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


TOMS = drums('X..x ..x. X..x ..x.')
TOMS_B = drums('X..x ..x. X.xx ..xr')
KICK = drums('.... ..x. ...x ....')
KICK_B = drums('.... ..x. ...x ..x.')
CLAP = drums('.... .... .... X...')
SILENT = drums('.' * 16)
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: the crowd's whistle.
    part('texture', 'Apito', 'pulse', electronic('whistle', True), [
        drums('.' * 32), drums('.' * 24 + 'x... x...'), drums('.' * 32), drums('x... x... .... .... x... x... x.x. x...'), drums('.' * 32), drums('x... x... .... .... x... x... x.x. x.x.'),
    ], [2] * 6, gain=.1, clip=.8, lpf=9000, hpf=1000, design={'role': 'fx'}, effects={'reverb': .3, 'pan': -.35},
        arrangement=arrangement((False, True, False, True, True, True))),
    # a2 · pawn: shaker sixteenths.
    part('rhythm', 'Shaker', 'pulse', recorded('percussion', 'shaker', pitched=False), [
        SILENT, drums('gxgx gxgx gxgx gxgx'), drums('..x. ..x. ..x. ..x.'), drums('gXgx gXgx gXgx gXgx'), drums('gxgx gxgx gxgx gxgx'), drums('gXgx gXgx gXgx gXgr'),
    ], [1] * 6, gain=.3, clip=.6, lpf=13000, hpf=3000, effects={'reverb': .05, 'pan': .3}),
    # b1 · knight: shouted 'hey!' calls.
    part('response', 'Grito', 'pulse', electronic('hey'), [
        drums('.' * 32), drums('.' * 28 + 'X...'), drums('.' * 32), drums('.... .... X... .... .... .... X... ....'), drums('.' * 28 + 'X...'), drums('.... .... X... .... .... .... X... X...'),
    ], [2] * 6, gain=.35, clip=.9, lpf=9000, hpf=200, design={'role': 'fx'}, effects={'reverb': .25, 'delay': .2, 'pan': .3},
        arrangement=arrangement((False, True, False, True, True, True))),
    # b2 · pawn: clap on four.
    part('rhythm', 'Palma', 'pulse', machine('909-clap'), [
        SILENT, CLAP, SILENT, drums('.... .... .... X..x'), CLAP, drums('.... .... ..x. X.xx'),
    ], [1] * 6, gain=.45, clip=.9, lpf=10000, hpf=400, effects={'reverb': .2, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True))),
    # c1 · bishop: metal hits.
    part('texture', 'Golpe de metal', 'pulse', electronic('metal-hit'), [
        drums('X' + '.' * 31), drums('.... .... .... ..x. .... .... .... ....'), drums('X' + '.' * 15 + 'x' + '.' * 15),
        drums('.... .... .... ..x. .... .... ..x. ....'), drums('X' + '.' * 31), drums('.... .... .... ..X. .... .... ..x. ..x.'),
    ], [2] * 6, gain=.2, clip=.9, lpf=9000, hpf=200, design={'role': 'fx'}, effects={'reverb': .45, 'delay': .25, 'pan': -.3}),
    # c2 · pawn: closed hats.
    part('rhythm', 'Chimbal', 'pulse', machine('808-hat'), [
        SILENT, drums('..x. ..x. ..x. ..x.'), SILENT, drums('x.x. x.xx x.x. x.xx'), drums('..x. ..x. ..x. ..x.'), drums('x.x. x.xx x.x. x.xr'),
    ], [1] * 6, gain=.8, clip=.5, lpf=15000, hpf=4500, effects={'reverb': .03, 'pan': .15}),
    # d1 · queen: the low chanted call.
    part('melody', 'Canto', 'phrase', electronic('oh-chant', True), [
        REST4,
        bars(bar('0 . . 0 . . 1 . . . 0 . . . . .'), SILENT, bar('0 . . 0 . . 2 . . . 1 . . . . .'), SILENT),
        bars(bar('0_ . . . . . . . . . . . . . . .'), SILENT, SILENT, SILENT),
        bars(bar('4 . . 4 . . 5 . . . 4 . . 2 . .'), bar('1_ . . . . . . . . . . . . . . .'), bar('4 . . 4 . . 5 . . . 7 . . 5 . .'), bar('4_ . . . . . . . 2 . . . 1 . . .')),
        bars(bar('0 . . 0 . . 1 . . . 0 . . . . .'), SILENT, SILENT, SILENT),
        bars(bar('4 . . 4 . . 5 . . . 4 . . 2 . .'), bar('1_ . . . . . . . . . . . . . . .'), bar('4 . . 4 . . 5 . . . 7 . . 5 . .'), bar('8_ . . . . . . . 7 . . . 5 . 4 .')),
    ], [4] * 6, octave=3, gain=.3, attack=.02, decay=.4, sustain=.7, release=.2, gate=.8, clip=.95, lpf=5000, hpf=150,
        mapping={'fileDegrees': 0, 'panWidth': .1}, arrangement=arrangement((False, True, True, True, True, True), restart=True),
        effects={'reverb': .35, 'delay': .2, 'pan': 0}),
    # d2 · pawn: booming sine bass.
    part('bass', 'Baixo 808', 'phrase', synth('sine'), [
        REST4, prog(bass, LOOP, 0), prog(bass, DRONE, 0), prog(bass, LOOP, 1), prog(bass, DRONE, 0), prog(bass, LOOP, 1),
    ], [4] * 6, octave=1, gain=0.5, attack=.003, decay=.7, sustain=.4, release=.2, gate=.8, clip=.95, lpf=220, hpf=25,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # e1 · king: ominous choir drone, arrives with castling.
    part('texture', 'Coro sombrio', 'sustain', electronic('vox-pad', True), [
        prog(drone, DRONE), prog(drone, LOOP), prog(drone, DRONE), prog(drone, LOOP), prog(drone, DRONE), prog(drone, LOOP),
    ], [4] * 6, octave=3, gain=.07, attack=1, decay=1, sustain=.85, release=1.5, gate=.97, clip=1, lpf=3000, hpf=150,
        design={'role': 'pad'}, arrangement=arrangement((True, False, True, True, True, True), restart=False), effects={'reverb': .5, 'pan': .2}),
    # e2 · pawn: the tresillo toms — the heartbeat of gqom.
    part('rhythm', 'Tambores gqom', 'pulse', electronic('gqom-tom'), [
        drums('X... .... X... ....'), TOMS, drums('X... .... .... ....'), TOMS_B, TOMS, TOMS_B,
    ], [1] * 6, gain=0.3, clip=.7, lpf=7000, hpf=40, mapping={'panWidth': 0}, effects={'reverb': .12, 'pan': 0}),
    # f1 · bishop: dark square stab.
    part('harmony', 'Stab sombrio', 'phrase', synth('square'), [
        REST4, prog(stab, DRONE, 0), prog(stab, DRONE, 0), prog(stab, LOOP, 1), prog(stab, DRONE, 0), prog(stab, LOOP, 1),
    ], [4] * 6, octave=3, gain=.12, attack=.003, decay=.2, sustain=.15, release=.15, gate=.35, clip=.9, lpf=1500, hpf=200,
        design={'filterEnv': 1.5, 'filterDecay': .1, 'delayTime': '3/16', 'delayFeedback': .45}, mapping={'fileDegrees': 0},
        arrangement=arrangement((False, True, True, True, True, True)), effects={'delay': .35, 'reverb': .3, 'pan': -.25}),
    # f2 · pawn: the broken kick, never on the one.
    part('rhythm', 'Bumbo quebrado', 'pulse', machine('808-kick-long'), [
        SILENT, KICK, SILENT, KICK_B, KICK, KICK_B,
    ], [1] * 6, gain=.5, clip=.6, lpf=6000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # g1 · knight: siren in the builds.
    part('response', 'Sirene', 'pulse', electronic('siren'), [
        drums('.' * 64), drums('.' * 64), drums('.' * 32 + 'X' + '.' * 31), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 31 + 'X' + '.' * 31),
    ], [4] * 6, gain=.2, clip=1, lpf=8000, hpf=300, design={'role': 'fx'}, effects={'reverb': .35, 'delay': .3, 'pan': .35}),
    # g2 · pawn: high tom answering the low toms.
    part('rhythm', 'Tom agudo', 'pulse', machine('808-tom-high'), [
        SILENT, drums('.x.. .x.. .x.. ...x'), SILENT, drums('.x.. .x.x .x.. .x.x'), drums('.x.. .... .x.. ....'), drums('.x.x .x.x .x.x .xxx'),
    ], [1] * 6, gain=0.12, clip=.7, lpf=8000, hpf=100, effects={'reverb': .15, 'pan': .4}),
    # h1 · rook: reverse cymbal into each section.
    part('texture', 'Prato reverso', 'pulse', electronic('reverse-cymbal'), [
        drums('.' * 48 + 'X' + '.' * 15), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 64), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 64),
    ], [4] * 6, gain=.25, clip=1, lpf=12000, hpf=500, design={'role': 'fx'}, effects={'reverb': .2, 'pan': -.2}),
    # h2 · pawn: rim rolls into each section.
    part('rhythm', 'Rufo de rim', 'pulse', machine('808-rim'), [
        SILENT, SILENT, drums('x.x. xxxx rrrr RRRR'), SILENT, drums('.... .... x.x. rrrr'), drums('x.x. xxxx rrrr RRRR'),
    ], [1] * 6, gain=.2, clip=.8, lpf=10000, hpf=300, effects={'reverb': .15, 'pan': -.1},
        arrangement=arrangement(fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Durban · gqom 2016', 'bpm': 126, 'root': 'C', 'scale': 'Phrygian', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Drop', 'Interlude', 'Drop'],
    'parts': parts,
    'reactions': reactions([
        rule('dbn-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('dbn-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('dbn-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 5)]),
        rule('dbn-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('dbn-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 3)]),
        # Every capture hits the toms harder for the capturer.
        rule('dbn-capture', 'capture', 'actor', 1, False, [act('gain', 5)], 'drums'),
        rule('dbn-tension', 'tension', 'both', 1, True, [act('reverb', .6), act('lpf', 1200, rampBars=8)], 'pad'),
        rule('dbn-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('drive', 4)], 'drums'),
        rule('dbn-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('delay', .5)]),
        rule('dbn-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('dbn-hanging', 'hangingPiece', 'actor', 1, True, [act('gain', 4)], 'fx'),
    ]),
    'reference': 'Gqom de Durban (DJ Lag, Citizen Boy, Distruction Boyz, coletânea Gqom Oh! de 2016): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Gqom',
}
write('durban', profile)
