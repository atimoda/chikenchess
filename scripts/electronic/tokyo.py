"""Tokyo 1991 · precise minimal techno in the yellow-magic lineage (original material).

130 BPM, a dry TR-808 locked to the grid: kick, gated snare, sixteenth hats and
maracas, cowbell syncopations and high toms. A square arpeggiator runs in
sixteenths, FM bells play the chords, a digital pluck sounds like a koto and the
queen sings a pentatonic lead. Glitch ticks and blips add the precision. E major,
the bright Emaj7–C#m7–Amaj7–B loop; the melodies keep to the pentatonic notes.
Degrees: 0 E · 1 F# · 2 G# · 3 A · 4 B · 5 C# · 6 D# · 7 E'.
"""
from kit import (act, arrangement, bar, bars, drums, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Emaj7', 'C#m7', 'Amaj7', 'B')
VAMP = ('Emaj7', 'Emaj7', 'Amaj7', 'Amaj7')
ROOT = {'Emaj7': 0, 'C#m7': -2, 'Amaj7': -4, 'B': -3}
VOICING = {'Emaj7': '2,4,6,7', 'C#m7': '2,4,5,7', 'Amaj7': '2,3,5,7', 'B': '1,4,6'}
PAD = {'Emaj7': '0,2,4,6', 'C#m7': '-2,0,2,4', 'Amaj7': '-4,-2,0,2', 'B': '-3,-1,1'}


def bassline(chord, variant=0):
    r = ROOT[chord]
    shapes = [[r, '.', r + 7, '.'] * 4, [r, r + 7, '.', r, r + 7, '.', r, r + 7, r, '.', r + 7, r, '.', r + 7, r, r + 7]]
    return bar(' '.join(str(n) for n in shapes[variant]))


def arp(chord, variant=0):
    c = [int(n) for n in VOICING[chord].split(',')]
    up = [c[0], c[1], c[2], c[-1]]
    shapes = [(up + [up[-1] + 7] + up[2:0:-1] + [up[0] + 7]) * 2, (up + [n + 7 for n in up]) * 2]
    return bar(' '.join(str(n) for n in shapes[variant][:16]))


def bells(chord, variant=0):
    c = VOICING[chord]
    shapes = [f'{c}_ . . . . . . . . . . . . . . .', f'{c} . . . . . {c} . . . {c} . . . . .']
    return bar(shapes[variant])


def pad(chord):
    return bar(f'{PAD[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


KICK = drums('X... X... X... X...')
SNARE = drums('.... X... .... X...')
SILENT = drums('.... .... .... ....')
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: glitch ticks — chance and ratchets on the grid.
    part('texture', 'Tiques glitch', 'pulse', machine('synth-tick'), [
        drums('o..o ..o. o... .o..'), drums('x.ro ..x. o.r. .o.x'), drums('o... o... o... o...'),
        drums('x.ro .rx. o.r. Ro.x'), drums('o..o ..o. o... .o..'), drums('xRro .rx. oRr. Ro.r'),
    ], [1] * 6, gain=0.9, clip=.5, lpf=16000, hpf=3000, design={'role': 'fx'}, effects={'reverb': .05, 'delay': .15, 'pan': -.45}),
    # a2 · pawn: 808 maracas.
    part('rhythm', 'Maracas 808', 'pulse', machine('808-maracas'), [
        SILENT, drums('xgxg xgxg xgxg xgxg'), SILENT, drums('xgXg xgXg xgXg xgXg'), drums('x.x. x.x. x.x. x.x.'), drums('xgXg xgXg xgXg xgXg'),
    ], [1] * 6, gain=0.5, clip=.6, lpf=14000, hpf=4000, effects={'reverb': .03, 'pan': .35}),
    # b1 · knight: the square arpeggiator.
    part('response', 'Arpejador', 'phrase', synth('square'), [
        prog(arp, LOOP, 0), prog(arp, LOOP, 0), prog(arp, VAMP, 0), prog(arp, LOOP, 1), prog(arp, VAMP, 0), prog(arp, LOOP, 1),
    ], [4] * 6, octave=4, gain=0.13, attack=.002, decay=.08, sustain=.15, release=.04, gate=.35, clip=.9, lpf=2400, hpf=300,
        design={'resonance': 6, 'filterEnv': 1.6, 'filterDecay': .05}, mapping={'fileDegrees': 0},
        arrangement=arrangement((True, True, False, True, True, True)), effects={'delay': .2, 'reverb': .12, 'pan': .3}),
    # b2 · pawn: gated 808 snare.
    part('rhythm', 'Caixa 808', 'pulse', machine('808-snare'), [
        SILENT, SNARE, SILENT, SNARE, SNARE, drums('.... X... .... X... .... X... ..X. X.XX'),
    ], [1, 1, 1, 1, 1, 2], gain=0.5, clip=.6, lpf=10000, hpf=250, effects={'reverb': .15, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: FM bell chords.
    part('harmony', 'Sinos FM', 'phrase', recorded('synths', 'fm-bell'), [
        prog(bells, LOOP, 0), prog(bells, LOOP, 1), prog(bells, VAMP, 0), prog(bells, LOOP, 1), prog(bells, VAMP, 0), prog(bells, LOOP, 1),
    ], [4] * 6, octave=3, gain=0.05, attack=.002, decay=.8, sustain=.3, release=.6, gate=.7, clip=.9, lpf=9000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .3, 'delay': .15, 'pan': -.2}),
    # c2 · pawn: 808 closed hats.
    part('rhythm', 'Chimbal 808', 'pulse', machine('808-hat'), [
        drums('x.x. x.x. x.x. x.x.'), drums('x.x. x.x. x.x. x.x.'), drums('..x. ..x. ..x. ..x.'),
        drums('x.X. x.X. x.X. x.X.'), drums('x.x. x.x. x.x. x.x.'), drums('xgXg xgXg xgXg xgXr'),
    ], [1] * 6, gain=0.9, clip=.5, lpf=15000, hpf=4500, effects={'reverb': .02, 'pan': .15}),
    # d1 · queen: pentatonic lead (E F# G# B C#).
    part('melody', 'Lead pentatônico', 'phrase', synth('sawtooth'), [
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . 4 . 5 . 7 . 8 .')),
        bars(bar('9 . . 8 . . 7 . . . 5 . 4 . . .'), bar('5_ . . . . . . . 4 . 2 . 1 . . .'), bar('2 . . 4 . . 5 . . . 4 . 2 . . .'), bar('4_ . . . . . . . . . . . . . . .')),
        bars(bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('8_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('11 . 9 . 8 . 7 . 8 . 9 . 11 . . .'), bar('12_ . . . . . 11 . 9 . . . 8 . . .'), bar('9 . 8 . 7 . 5 . 7 . 8 . 9 . . .'), bar('8_ . . . . . . . 7 . 5 . 4 . 2 .')),
        bars(bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . 5 . 4 . . . . .'), bar('4_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('11 . 9 . 8 . 7 . 8 . 9 . 11 . . .'), bar('12_ . . . . . 11 . 9 . . . 8 . . .'), bar('9 . 8 . 7 . 5 . 7 . 8 . 9 . . .'), bar('14_ . . . . . . . 12 . 11 . 9 . 8 .')),
    ], [4] * 6, octave=4, gain=0.35, attack=.01, decay=.3, sustain=.6, release=.25, gate=.8, clip=.9, lpf=3200, hpf=250,
        design={'unison': 2, 'detune': .08, 'vibrato': 5.5, 'vibratoDepth': .1}, mapping={'fileDegrees': 0, 'panWidth': .1},
        arrangement=arrangement((False, True, True, True, True, True), restart=True), effects={'reverb': .25, 'delay': .25, 'pan': 0}),
    # d2 · pawn: octave sequencer bass.
    part('bass', 'Baixo sequenciado', 'phrase', synth('square'), [
        REST4, prog(bassline, LOOP, 0), REST4, prog(bassline, LOOP, 1), prog(bassline, VAMP, 0), prog(bassline, LOOP, 1),
    ], [4] * 6, octave=2, gain=.3, attack=.002, decay=.12, sustain=.4, release=.04, gate=.5, clip=.95, lpf=600, hpf=30,
        design={'resonance': 4, 'filterEnv': 1.8, 'filterDecay': .08, 'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0},
        effects={'reverb': 0, 'pan': 0}),
    # e1 · king: synth choir, arrives with castling.
    part('texture', 'Coro sintético', 'sustain', recorded('synths', 'choir'), [
        prog(pad, LOOP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP),
    ], [4] * 6, octave=3, gain=0.04, attack=.6, decay=1, sustain=.85, release=1, gate=.97, clip=1, lpf=4000, hpf=200,
        design={'role': 'pad'}, arrangement=arrangement((True, False, True, True, False, True), restart=False), effects={'reverb': .4, 'pan': .2}),
    # e2 · pawn: 808 kick.
    part('rhythm', 'Bumbo 808', 'pulse', machine('808-kick'), [
        drums('X... .... X... ....'), KICK, SILENT, KICK, KICK, KICK,
    ], [1] * 6, gain=.55, clip=.5, lpf=8000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: koto-like digital pluck, pentatonic counter-line.
    part('melody', 'Pluck koto', 'phrase', recorded('synths', 'digital-pluck'), [
        bars(bar('7 . 5 . 4 . . . 2 . 4 . 5 . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . 9 . 8 . 7 . 5 .')),
        bars(bar('7 . 5 . 4 . . . 2 . 4 . 5 . . .'), bar('4 . 2 . 1 . . . 0 . . . . . . .')),
        bars(bar('. . . . . . . . . . . . 12 . 11 .'), bar('. . . . . . . . . . . . 9 . 8 .')),
        bars(bar('7 . 5 . 4 . . . 2 . 4 . 5 . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . 9*2 . 11 . 12 . 11 .'), bar('. . . . . . . . . . . . 9 . 8 .')),
    ], [2] * 6, octave=4, gain=0.22, attack=.002, decay=.3, sustain=.1, release=.2, gate=.4, clip=.9, lpf=8000, hpf=400,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .3, 'delay': .3, 'pan': -.35}),
    # f2 · pawn: 808 open hat.
    part('rhythm', 'Chimbal aberto 808', 'pulse', machine('808-open-hat'), [
        SILENT, drums('..x. ..x. ..x. ..x.'), SILENT, drums('..X. ..X. ..X. ..X.'), drums('.... ..x. .... ..x.'), drums('..X. ..X. ..X. ..X.'),
    ], [1] * 6, gain=0.5, clip=.6, lpf=14000, hpf=3500, effects={'reverb': .05, 'pan': -.2}),
    # g1 · knight: synth blips answering the arpeggio.
    part('response', 'Blips', 'pulse', machine('synth-blip'), [
        SILENT, drums('...x .... ..x. ....'), drums('.... ...x .... ....'), drums('...x ..x. ..x. .x..'), drums('...x .... .... ....'), drums('...x ..xr ..x. .xr.'),
    ], [1] * 6, gain=.2, clip=.6, lpf=12000, hpf=600, design={'role': 'fx'}, effects={'reverb': .15, 'delay': .25, 'pan': .45}),
    # g2 · pawn: 808 cowbell.
    part('rhythm', 'Cowbell 808', 'pulse', machine('808-cowbell'), [
        SILENT, drums('x..x ..x. .... ....'), SILENT, drums('x..x ..x. x... ..x.'), drums('x... .... .... ....'), drums('x..x ..x. x..x ..x.'),
    ], [1] * 6, gain=.12, clip=.6, lpf=8000, hpf=400, effects={'reverb': .06, 'pan': -.35}),
    # h1 · rook: 808 cymbal.
    part('texture', 'Prato 808', 'pulse', machine('808-cymbal'), [
        drums('.' * 64), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 31 + 'X' + '.' * 31), drums('X' + '.' * 63), drums('X' + '.' * 31 + 'X' + '.' * 31),
    ], [4] * 6, gain=.4, clip=1, lpf=12000, hpf=600, design={'role': 'fx'}, effects={'reverb': .2, 'pan': .25}),
    # h2 · pawn: high toms in descending fills.
    part('rhythm', 'Tons agudos', 'pulse', machine('808-tom-high'), [
        SILENT, SILENT, drums('.... .... x.x. xxxx'), SILENT, drums('.... .... .... ..xx'), drums('.... .... xxxx RRRR'),
    ], [1] * 6, gain=.25, clip=.7, lpf=8000, hpf=100, effects={'reverb': .15, 'pan': .3},
        arrangement=arrangement(fills=(5, 5, None, 5, 5, None))),
]

profile = {
    'name': 'Shibaura · techno minimal 1991', 'bpm': 130, 'root': 'E', 'scale': 'Maior', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Drop', 'Interlude', 'Drop'],
    'parts': parts,
    'reactions': reactions([
        rule('tyo-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('tyo-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('tyo-endgame', 'endgame', 'both', 1, True, [act('variation', 5)]),
        rule('tyo-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('tyo-check', 'check', 'actor', 1, True, [act('activate'), act('gain', 3)]),
        # Precision: every capture is a glitch — the ticks and blips stutter for the capturer.
        rule('tyo-capture', 'capture', 'actor', 1, False, [act('delay', .45), act('gain', 4)], 'fx'),
        rule('tyo-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('invert')]),
        rule('tyo-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('tyo-tension', 'tension', 'both', 1, True, [act('lpf', 1200, rampBars=8)], 'lead'),
        rule('tyo-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('transpose', 2)]),
        rule('tyo-promo', 'promotion', 'actor', 4, True, [act('mode', 3)]),
    ]),
    'reference': 'Techno japonês do início dos anos 90 na linhagem do Yellow Magic Orchestra (Ken Ishii, Susumu Yokota): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Japanese_electronic_music',
}
write('tokyo', profile)
