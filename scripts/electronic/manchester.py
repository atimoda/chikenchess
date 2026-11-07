"""Manchester 1988 · acid house at the Haçienda (original material).

128 BPM on a TR-909 with 808 congas and claves. The queen is the TB-303: a
sixteenth-note acid line with accents, slides and an envelope that opens as the
game heats up; a second 303 answers on the knight. Sparse organ stabs, rim
answers and low toms leave room for the acid sequencer. A G minor pedal keeps
the sequencer in front; the new bridge and turnaround open toward Eb and F.
Degrees: 0 G · 1 A · 2 Bb · 3 C · 4 D · 5 Eb · 6 F · 7 G'.
"""
from kit import (expanded_form, act, arrangement, bar, bars, drums, electronic, machine, part, reactions, rule, synth, write)

LOOP = ('Gm', 'Gm', 'Gm', 'Gm')
BREAK = ('Gm', 'Gm', 'Gm', 'Gm')
ROOT = {'Gm': 0, 'Eb': -2, 'F': -1}
VOICING = {'Gm': '2,4,7', 'Eb': '2,5,7', 'F': '1,3,6'}
PAD = {'Gm': '0,2,4', 'Eb': '-2,0,2', 'F': '-1,1,3'}

# A four-bar question/answer on one pedal; accents, rests and slides change the contour.
ACID = [
    bar('0! . 0 7~-7 . 0 2! . 0 . 0 . 5~2 . 3 0'),
    bar('0! 0 . . 7! . 5 . 0 . 3! . 0 . 7~-7 .'),
    bar('0! . 0 7~-7 . 0 2! . 0 . 0 . 5~2 . 3 0'),
    bar('0! . . 0 7! . 5 . . 3 2! . 0 . . .'),
]


def acid(chords, variant=0):
    phrase = [list(cell) for cell in ACID]
    if variant == 1:
        phrase[1] = bar('0! . 7~-7 . 0 . 2! 0 . 5 . 3 . 0 . .')
        phrase[3] = bar('0! . 0 . 7! . 5~2 . 3 . 2! . 0 . 7~-7 .')
    return bars(*phrase)


def acid_answer():
    return bars(SILENT, bar('. . . . . . . . 7! . 5~2 . 3 . 0 .'), SILENT,
                bar('. . . . . . . . 5! . 3 . 2~-2 . . .'))


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
    # a1 · rook: filtered noise marks the breakdown, away from the acid hook.
    part('texture', 'Sopro de transição', 'pulse', electronic('reverse-cymbal'), [
        REST4, REST4, drums('.' * 56 + 'x' + '.' * 7), REST4, drums('.' * 56 + 'x' + '.' * 7), REST4,
    ], [4] * 6, gain=.12, clip=.9, lpf=3500, hpf=500, design={'role': 'fx'}, effects={'reverb': .2, 'pan': -.3}),
    # a2 · pawn: 808 clave syncopation.
    part('rhythm', 'Clave 808', 'pulse', machine('808-clave'), [
        SILENT, drums('x..x ..x. ..x. x...'), SILENT, drums('x..x ..x. ..x. x...'), drums('x... ..x. .... ....'), drums('x..x ..x. ..x. x.xx'),
    ], [1] * 6, gain=.15, clip=.6, lpf=9000, hpf=800, effects={'reverb': .08, 'pan': .4}),
    # b1 · knight: a sparse square-wave 303 answer in the same bass register.
    part('response', 'Segunda 303', 'phrase', synth('square'), [
        REST4, REST4, REST4, REST4, acid_answer(), acid_answer(),
    ], [4] * 6, octave=2, gain=.09, attack=.002, decay=.12, sustain=.2, release=.05, gate=.5, clip=.9, lpf=900, hpf=200,
        design={'resonance': 9, 'filterEnv': 3, 'filterDecay': .1, 'role': 'lead'}, mapping={'fileDegrees': 0},
        arrangement=arrangement((False, False, False, False, True, True)), effects={'delay': .25, 'reverb': .1, 'pan': .3}),
    # b2 · pawn: 909 claps.
    part('rhythm', 'Palmas 909', 'pulse', machine('909-clap'), [
        SILENT, CLAP, SILENT, CLAP, CLAP, drums('.... X... .... X... .... X... .... X.XX'),
    ], [1, 1, 1, 1, 1, 2], gain=.5, clip=.9, lpf=10000, hpf=400, effects={'reverb': .15, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: brief organ offbeats in the spaces around the sequencer.
    part('harmony', 'Acordes de club', 'phrase', synth('triangle'), [
        REST4, bars(SILENT, stabs('Gm', 0), SILENT, SILENT), REST4,
        bars(SILENT, stabs('Gm', 0), SILENT, stabs('Gm', 0)), REST4,
        bars(SILENT, stabs('Gm', 1), SILENT, stabs('Gm', 0)),
    ], [4] * 6, octave=3, gain=.1, attack=.004, decay=.2, sustain=.15, release=.1, gate=.4, lpf=1700, hpf=250,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True)), effects={'reverb': .12, 'pan': -.2}),
    # c2 · pawn: 909 closed hats.
    part('rhythm', 'Chimbal 909', 'pulse', machine('909-hat'), [
        drums('..x. ..x. ..x. ..x.'), drums('xg.. xg.. xg.. xg.g'), SILENT,
        drums('xg.. xg.. xg.g xg..'), drums('xg.. xg.. xg.. xg.g'), drums('xg.. xg.g xg.. xg.r'),
    ], [1] * 6, gain=.65, clip=.6, lpf=10500, hpf=4500, effects={'reverb': .03, 'pan': .15}),
    # d1 · queen: the TB-303 acid line.
    part('melody', 'TB-303', 'phrase', synth('sawtooth'), [
        acid(BREAK, 0), acid(LOOP, 0), acid(BREAK, 1), acid(LOOP, 0), acid(BREAK, 0), acid(LOOP, 1),
    ], [4] * 6, octave=2, gain=.28, attack=.002, decay=.15, sustain=.25, release=.04, gate=.55, clip=.95, lpf=700, hpf=40,
        design={'resonance': 10, 'filterEnv': 2.5, 'filterDecay': .12, 'lfoTarget': 'lpf', 'lfoRate': 16, 'lfoUnit': 'bars', 'lfoDepth': .6, 'role': 'lead'},
        mapping={'fileDegrees': 0, 'panWidth': .05}, arrangement=arrangement((True, True, True, True, True, True), restart=True),
        distortion=.8, distortionMix=.22, effects={'reverb': .08, 'delay': .1, 'pan': 0}),
    # d2 · pawn: deep 808-style sine sub under the acid.
    part('bass', 'Sub 808', 'phrase', synth('sine'), [
        REST4, prog(bassline, LOOP), REST4, prog(bassline, LOOP), prog(bassline, BREAK), prog(bassline, LOOP),
    ], [4] * 6, octave=1, gain=.25, attack=.002, decay=.5, sustain=.6, release=.1, gate=.8, clip=.95, lpf=300, hpf=25,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # e1 · king: string pad, arrives with castling.
    part('texture', 'Pad de cordas', 'sustain', synth('supersaw'), [
        prog(pad, BREAK), prog(pad, LOOP), prog(pad, BREAK), prog(pad, LOOP), prog(pad, BREAK), prog(pad, LOOP),
    ], [4] * 6, octave=3, gain=.025, attack=.6, decay=1, sustain=.85, release=1, gate=.97, clip=1, lpf=2500, hpf=200,
        design={'unison': 3, 'detune': .15, 'spread': .7, 'role': 'pad'},
        arrangement=arrangement((False, False, True, False, True, False), restart=False), effects={'reverb': .4, 'pan': .2}),
    # e2 · pawn: 909 kick.
    part('rhythm', 'Bumbo 909', 'pulse', machine('909-kick-hard'), [
        drums('X... .... X... ....'), KICK, SILENT, KICK, KICK, KICK,
    ], [1] * 6, gain=.55, clip=.5, lpf=9000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: low square pulse reinforces only the drop, never another rave chord.
    part('bass', 'Pulso quadrado', 'phrase', synth('square'), [
        REST4, REST4, REST4, prog(bassline, LOOP), REST4, prog(bassline, LOOP),
    ], [4] * 6, octave=2, gain=.08, attack=.004, decay=.15, sustain=.15, release=.06, gate=.4, lpf=450, hpf=110,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0},
        arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': 0, 'pan': 0}),
    # f2 · pawn: 909 open hat.
    part('rhythm', 'Chimbal aberto 909', 'pulse', machine('909-open-hat'), [
        SILENT, drums('..x. ..x. ..x. ..x.'), SILENT, drums('..X. ..X. ..X. ..X.'), drums('..x. ..x. ..x. ..x.'), drums('..X. ..X. ..X. ..X.'),
    ], [1] * 6, gain=.42, clip=.6, lpf=10000, hpf=3500, effects={'reverb': .05, 'pan': -.2}),
    # g1 · knight: dry rim answers at the end of a four-bar phrase.
    part('response', 'Rim de resposta', 'pulse', machine('909-rim'), [
        REST4, drums('.' * 56 + 'x..x....'), REST4, drums('.' * 48 + '...x..x...x..x..'),
        drums('.' * 56 + 'x.......'), drums('.' * 48 + '...x..x..x...x..'),
    ], [4] * 6, gain=.18, clip=.6, lpf=4500, hpf=450, design={'role': 'drums'}, effects={'delay': .12, 'reverb': .06, 'pan': -.35}),
    # g2 · pawn: 808 congas.
    part('rhythm', 'Congas 808', 'pulse', machine('808-conga-low'), [
        SILENT, drums('...x ..x. .x.. x.x.'), drums('.... ..x. .... ..x.'), drums('...x ..x. .x.. x.x.'), drums('...x .... .x.. ....'), drums('...x ..x. .xx. x.xx'),
    ], [1] * 6, gain=.15, clip=.7, lpf=8000, hpf=150, effects={'reverb': .12, 'pan': .4}),
    # h1 · rook: 909 crash.
    part('texture', 'Prato 909', 'pulse', machine('909-crash'), [
        drums('.' * 64), drums('X' + '.' * 63), drums('.' * 64), drums('X' + '.' * 31 + 'X' + '.' * 31), drums('X' + '.' * 63), drums('X' + '.' * 31 + 'X' + '.' * 31),
    ], [4] * 6, gain=.16, clip=1, lpf=13000, hpf=500, design={'role': 'fx'}, effects={'reverb': .2, 'pan': .2}),
    # h2 · pawn: short 909 tom turnaround once in four bars.
    part('rhythm', 'Virada de tons 909', 'pulse', machine('909-tom'), [
        REST4, REST4, drums('.' * 56 + 'x...x.xx'), REST4, REST4, drums('.' * 56 + 'x.x.xx.x'),
    ], [4] * 6, gain=.24, clip=.8, lpf=5000, hpf=80, effects={'reverb': .12, 'pan': -.15}),

]

profile = {
    'name': 'Haçienda · Acid House 1988', 'bpm': 128, 'root': 'G', 'scale': 'Menor natural', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Drop', 'Interlude', 'Drop'],
    'parts': parts,
    'reactions': reactions([
        rule('mcr-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('mcr-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('mcr-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 5)]),
        rule('mcr-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('mcr-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 3)]),
        # The 303 tweak: tension slowly opens the cutoff and pushes the resonance.
        rule('mcr-tension', 'tension', 'both', 1, True, [act('lpf', 2600, rampBars=8), act('resonance', 14)], 'lead'),
        rule('mcr-swing', 'evalSwing', 'actor', 2, True, [act('lpf', 2800, rampBars=2), act('drive', 2)], 'lead'),
        rule('mcr-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('mcr-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('lpf', 400, rampBars=2)], 'lead'),
        rule('mcr-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('mcr-promo', 'promotion', 'actor', 4, True, [act('variation', 5), act('transpose', 5)]),
    ]),
    'reference': 'Acid house de Manchester (Haçienda, 808 State, A Guy Called Gerald, 1988): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Acid_house',
}

# A chordal suspension replaces the 303 in G; H rebuilds it over Eb–F–Gm.
SUSPEND = ('Eb', 'Eb', 'F', 'F')
RETURN = ('Eb', 'F', 'Gm', 'Gm')

def floating_sub(chord):
    r = ROOT[chord] + 7
    return bar(f'{r}_ . . . . . . . 0?0 . . . . . . .')

def rising_acid(chord):
    r = ROOT[chord]
    return bar(f'{r}! . {r + 7}~-7 . {r} . {r + 2}! . {r + 4} . {r + 7}~-7 . {r + 4} . {r + 2} {r}')

expanded_form(profile, order=[0, 1, 6, 3, 2, 4, 7, 5],
    labels=profile['sectionLabels'] + ['Bridge', 'Turnaround'],
    lengths=profile['sections'] + [32, 16],
    roots=[[ROOT[c] for c in chords] for chords in [LOOP, LOOP, BREAK, LOOP, BREAK, LOOP, SUSPEND, RETURN]],
    additions={
        'a1': (drums('.' * 56 + 'x' + '.' * 7), None),
        'a2': (drums('x... .... .... x...' * 4), drums('x..x ..x. ..x. x...' * 3 + 'x..x ..x. x.xx ....')),
        'b1': (None, bars(SILENT, SILENT, bar('. . . . . . . . 7! . 5~2 . 3 . 0 .'), SILENT)),
        'b2': (drums('.... .... X... ....' * 4), drums('.... X... .... X... .... X... .... X... .... X... X... X... X.X. X.X. XXXX ....')),
        'c1': (prog(stabs, SUSPEND, 2), prog(stabs, RETURN, 0)),
        'c2': (drums('x... .... x... ....' * 4), drums('x.x. x.x. x.x. x.x.' * 2 + 'xg.. xg.. xg.g xg..' + 'xgxg xgxg xgxg ....')),
        'd1': (None, prog(rising_acid, RETURN)),
        'd2': (prog(floating_sub, SUSPEND), prog(bassline, RETURN)),
        'e1': (prog(pad, SUSPEND), None),
        'e2': (drums('X... .... .... ....' * 3 + 'X... .... .... ..x.'), drums('X... X... X... X...' * 3 + 'X... X... X... ....')),
        'f1': (None, None),
        'f2': (None, drums('..x. ..x. ..x. ..x.' * 3 + '..x. ..x. ..x. ....')),
        'g1': (drums('.... ..x. .... ....' * 4), None),
        'g2': (drums('.... ..x. .... x...' * 4), drums('...x ..x. .x.. x.x.' * 3 + '...x ..x. .xxx ....')),
        'h1': (None, None),
        'h2': (None, drums('.' * 48 + '.... x.x. xx.x ....')),
    })

write('manchester', profile)
