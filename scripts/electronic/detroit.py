"""Detroit 1986 · second-wave techno from the Belleville Three (original material).

125 BPM on a TR-909: four-on-the-floor kick, claps on two and four, sixteenth hats,
offbeat open hat and ride; 808 congas over the top. Syncopated piano chords and
string-machine stabs carry the soul, a sequenced sawtooth line and an FM bell
arpeggio the future. A natural minor, the melancholic Am9–Fmaj7–G–Em7 loop; the
break drops the drums and leaves the strings alone, as the Detroit records did.
Degrees: 0 A · 1 B · 2 C · 3 D · 4 E · 5 F · 6 G · 7 A'.
"""
from kit import (act, arrangement, bar, bars, drums, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Am9', 'Fmaj7', 'G', 'Em7')
VAMP = ('Am9', 'Am9', 'Fmaj7', 'Fmaj7')
ROOT = {'Am9': 0, 'Fmaj7': -2, 'G': -1, 'Em7': -3}
VOICING = {'Am9': '2,4,6,8', 'Fmaj7': '2,4,5,7', 'G': '1,3,6', 'Em7': '1,3,4,6'}
PAD = {'Am9': '0,2,4,6', 'Fmaj7': '-2,0,2,4', 'G': '-1,1,3,6', 'Em7': '-3,-1,1,3'}


def bassline(chord, variant=0):
    r = ROOT[chord]
    patterns = [
        ['.', '.', r, '.', '.', '.', r, '.', '.', '.', r, '.', '.', '.', r, r + 7],
        [r, '.', r, '.', '.', r + 7, r, '.', '.', '.', r, '.', '.', r + 7, r, r + 4],
        [r, '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ]
    return bar(' '.join(f'{c}~-12' if c == r + 7 and variant == 1 and i == 5 else str(c) for i, c in enumerate(patterns[variant])))


def piano(chord, variant=0):
    c = VOICING[chord]
    rhythms = [
        f'{c}! . . {c} . . {c} . . . {c} . . {c} . .',
        f'{c}! . . {c} . . {c} . . {c} . . {c} . {c} .',
        f'{c}_ . . . . . . . . . . . . . . .',
    ]
    return bar(rhythms[variant])


def strings(chord, variant=0):
    c = VOICING[chord]
    rhythms = [
        f'. . . . . . . . . . . . . . {c}! .',
        f'{c}! . . {c} . . . . . . {c} . . . . .',
        f'{c}_ . . . . . . . . . . . . . . .',
    ]
    return bar(rhythms[variant])


def pad(chord):
    return bar(f'{PAD[chord]}_ . . . . . . . . . . . . . . .')


def arp(chord):
    c = [int(n) for n in VOICING[chord].split(',')]
    seq = [c[0], c[1], c[2], c[-1], c[1], c[2], c[-1] + 7 if len(c) > 3 else c[0] + 7, c[2]] * 2
    return bar(' '.join(str(n) for n in seq))


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


KICK = drums('X... X... X... X...')
CLAP = drums('.... X... .... X...')
SILENT = drums('.... .... .... ....')
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: string-machine swell — the 'strings of life' bed, carries the break.
    part('texture', 'Cordas sintéticas', 'sustain', recorded('classical', 'violin-sustain'), [
        prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP),
    ], [4] * 6, octave=4, gain=.16, attack=.35, decay=1, sustain=.85, release=.9, gate=.97, clip=1, lpf=5000, hpf=250,
        design={'role': 'pad', 'lfoTarget': 'lpf', 'lfoRate': 8, 'lfoUnit': 'bars', 'lfoDepth': .25},
        arrangement=arrangement((True, False, True, True, True, True), restart=False), effects={'reverb': .4, 'pan': -.25}),
    # a2 · pawn: 909 ride on the offbeats.
    part('rhythm', 'Ride 909', 'pulse', machine('909-ride'), [
        SILENT, drums('..x. ..x. ..x. ..x.'), SILENT, drums('..X. ..x. ..X. ..x.'), drums('..x. ..x. ..x. ..x.'), drums('x.X. x.X. x.X. x.X.'),
    ], [1] * 6, gain=0.25, clip=.7, lpf=14000, hpf=3000, effects={'reverb': .08, 'pan': .3}),
    # b1 · knight: string stabs answering the piano.
    part('response', 'Stabs de cordas', 'phrase', recorded('classical', 'violin-spiccato'), [
        prog(strings, LOOP, 0), prog(strings, LOOP, 0), prog(strings, LOOP, 2), prog(strings, LOOP, 1), prog(strings, VAMP, 0), prog(strings, LOOP, 1),
    ], [4] * 6, octave=4, gain=0.25, attack=.003, decay=.3, sustain=.3, release=.15, gate=.4, clip=.9, lpf=9000, hpf=300,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, True, True)), effects={'reverb': .3, 'pan': .25}),
    # b2 · pawn: 909 claps on two and four.
    part('rhythm', 'Palmas 909', 'pulse', machine('909-clap'), [
        SILENT, CLAP, SILENT, CLAP, CLAP, drums('.... X... .... X... .... X... .... X.XX'),
    ], [1, 1, 1, 1, 1, 2], gain=0.5, clip=.9, lpf=10000, hpf=400, effects={'reverb': .16, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: the syncopated piano chord riff.
    part('harmony', 'Piano de Detroit', 'phrase', recorded('band', 'piano', 1), [
        prog(piano, LOOP, 2), prog(piano, LOOP, 0), prog(piano, LOOP, 2), prog(piano, LOOP, 1), prog(piano, VAMP, 0), prog(piano, LOOP, 1),
    ], [4] * 6, octave=3, gain=.17, attack=.003, decay=.4, sustain=.3, release=.25, gate=.5, clip=.95, lpf=8000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .22, 'pan': -.1}),
    # c2 · pawn: 909 closed hats.
    part('rhythm', 'Chimbal 909', 'pulse', machine('909-hat'), [
        drums('..x. ..x. ..x. ..x.'), drums('xgxg xgxg xgxg xgxg'), SILENT,
        drums('xgXg xgXg xgXg xgXg'), drums('xgxg xgxg xgxg xgxg'), drums('xgXg xgXg xgXg xgXr'),
    ], [1] * 6, gain=0.8, clip=.6, lpf=15000, hpf=4500, effects={'reverb': .03, 'pan': .15}),
    # d1 · queen: sequenced sawtooth lead — the machine-soul melody.
    part('melody', 'Lead do futuro', 'phrase', synth('sawtooth'), [
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . 4 . 6 .')),
        bars(bar('7 . . 7 . . 6 . . . 4 . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('6 . . 6 . . 4 . . . 3 . . . . .'), bar('. . . . . . . . 1 . . . 3 . 4 .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('9 . . 9 . . 8 . . . 7 . . 6 . .'), bar('7_ . . . . . . . . . . . 4 . 6 .'), bar('8 . . 8 . . 7 . . . 6 . . 4 . .'), bar('6_ . . . . . . . 4 . . . 3 . 1 .')),
        bars(bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('5_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('9 . . 9 . . 8 . . . 7 . . 6 . .'), bar('7_ . . . . . . . . . . . 4 . 6 .'), bar('8 . . 8 . . 7 . . . 6 . . 4 . .'), bar('11_ . . . . . . . 9 . . . 8 . 7 .')),
    ], [4] * 6, octave=4, gain=0.4, attack=.005, decay=.3, sustain=.5, release=.25, gate=.7, clip=.9, lpf=3000, hpf=250,
        design={'unison': 2, 'detune': .1, 'resonance': 4, 'filterEnv': 1.6, 'filterDecay': .2, 'delayTime': '3/16', 'delayFeedback': .4},
        mapping={'fileDegrees': 0, 'panWidth': .1}, arrangement=arrangement((False, True, False, True, True, True), restart=True),
        effects={'reverb': .25, 'delay': .3, 'pan': 0}),
    # d2 · pawn: deep sawtooth bass, offbeat-led.
    part('bass', 'Baixo analógico', 'phrase', synth('sawtooth'), [
        prog(bassline, LOOP, 2), prog(bassline, LOOP, 0), prog(bassline, LOOP, 2), prog(bassline, LOOP, 1), prog(bassline, VAMP, 0), prog(bassline, LOOP, 1),
    ], [4] * 6, octave=2, gain=0.55, attack=.002, decay=.2, sustain=.5, release=.08, gate=.55, clip=.95, lpf=450, hpf=30,
        design={'resonance': 4, 'filterEnv': 1.8, 'filterDecay': .14, 'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .05},
        effects={'reverb': 0, 'pan': 0}),
    # e1 · king: warm analog pad, arrives with castling.
    part('texture', 'Pad analógico', 'sustain', recorded('synths', 'analog-pad'), [
        prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP),
    ], [4] * 6, octave=3, gain=0.03, attack=.5, decay=1, sustain=.85, release=1, gate=.97, clip=1, lpf=3000, hpf=180,
        design={'role': 'pad'}, arrangement=arrangement((True, False, True, True, False, True), restart=False), effects={'reverb': .4, 'pan': .2}),
    # e2 · pawn: 909 kick four to the floor.
    part('rhythm', 'Bumbo 909', 'pulse', machine('909-kick'), [
        drums('X... .... X... ....'), KICK, SILENT, KICK, KICK, KICK,
    ], [1] * 6, gain=.55, clip=.5, lpf=9000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: FM bell arpeggio — the Transmat shimmer.
    part('melody', 'Arpejo de sino FM', 'phrase', recorded('synths', 'fm-bell'), [
        prog(arp, LOOP), REST4, prog(arp, LOOP), prog(arp, LOOP), prog(arp, VAMP), prog(arp, LOOP),
    ], [4] * 6, octave=4, gain=0.05, attack=.002, decay=.3, sustain=.2, release=.3, gate=.4, clip=.9, lpf=9000, hpf=500,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, True)),
        effects={'reverb': .35, 'delay': .25, 'pan': -.35}),
    # f2 · pawn: 909 open hat on the offbeats.
    part('rhythm', 'Chimbal aberto 909', 'pulse', machine('909-open-hat'), [
        SILENT, drums('..x. ..x. ..x. ..x.'), SILENT, drums('..X. ..X. ..X. ..X.'), drums('..x. ..x. ..x. ..x.'), drums('..X. ..X. ..X. ..X.'),
    ], [1] * 6, gain=0.6, clip=.6, lpf=14000, hpf=3500, effects={'reverb': .05, 'pan': -.2}),
    # g1 · knight: square-wave sixteenth sequence with a resonant sweep.
    part('response', 'Sequência Cybotron', 'phrase', synth('square'), [
        prog(arp, LOOP), prog(arp, LOOP), REST4, prog(arp, LOOP), prog(arp, VAMP), prog(arp, LOOP),
    ], [4] * 6, octave=3, gain=.12, attack=.002, decay=.1, sustain=.2, release=.05, gate=.4, clip=.9, lpf=1600, hpf=200,
        design={'resonance': 10, 'filterEnv': 2, 'filterDecay': .08, 'lfoTarget': 'lpf', 'lfoRate': 16, 'lfoUnit': 'bars', 'lfoDepth': .5},
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'delay': .2, 'reverb': .12, 'pan': .35}),
    # g2 · pawn: 808 congas — the Detroit percussion layer.
    part('rhythm', 'Congas 808', 'pulse', machine('808-conga-high'), [
        SILENT, drums('...x ..x. .x.. x.x.'), SILENT, drums('...x ..x. .x.. x.x.'), drums('...x .... .x.. ....'), drums('...x ..x. .xx. x.xx'),
    ], [1] * 6, gain=0.15, clip=.7, lpf=8000, hpf=200, effects={'reverb': .12, 'pan': .4}),
    # h1 · rook: 909 crash marks each section.
    part('texture', 'Prato 909', 'pulse', machine('909-crash'), [
        drums('.' * 64), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 31 + 'X' + '.' * 31), drums('X' + '.' * 63), drums('X' + '.' * 31 + 'X' + '.' * 31),
    ], [4] * 6, gain=.3, clip=1, lpf=13000, hpf=500, design={'role': 'fx'}, effects={'reverb': .2, 'pan': .2}),
    # h2 · pawn: 909 toms rolling into the next section.
    part('rhythm', 'Tons 909', 'pulse', machine('909-tom'), [
        SILENT, SILENT, drums('.... .... ..x. x.x.'), SILENT, drums('.... .... .... ..x.'), drums('.... .... x.x. xxxx'),
    ], [1] * 6, gain=.3, clip=.8, lpf=7000, hpf=50, effects={'reverb': .15, 'pan': -.3},
        arrangement=arrangement(fills=(5, 5, None, 5, 5, None))),
]

profile = {
    'name': 'Transmat · techno 1986', 'bpm': 125, 'root': 'A', 'scale': 'Menor natural', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions([
        rule('det-opening', 'opening', 'both', 1, True, [act('variation', 0)]),
        rule('det-middle', 'middle', 'both', 1, True, [act('variation', 1)]),
        rule('det-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 5)]),
        rule('det-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('det-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 3)]),
        # Losing the queen is the breakdown: drums out, strings alone, filter closing.
        rule('det-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('reverb', .5)]),
        rule('det-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('det-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('det-tension', 'tension', 'both', 1, True, [act('lpf', 700, rampBars=8), act('resonance', 16)], 'lead'),
        rule('det-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('lpf', 4000, rampBars=4)], 'lead'),
        rule('det-promo', 'promotion', 'actor', 4, True, [act('variation', 5), act('transpose', 2)]),
    ]),
    'reference': 'Techno de Detroit de 1986–87 (Derrick May, Juan Atkins, Kevin Saunderson, selo Transmat): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Detroit_techno',
}
write('detroit', profile)
