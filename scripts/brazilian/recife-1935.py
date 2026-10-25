"""Recife 1935 · frevo de rua (original material).

A street frevo band: the trumpets throw the call, the saxophones answer with
running sixteenths (the metals-against-reeds dialogue of frevo de rua), the
trombones punch syncopated riffs, a tuba-like low trombone keeps the oom-pah, and
the percussion drives at 152 BPM: tarol sixteenths, caixa, surdo on both beats
and the hand cymbals. F major.
Form: Intro (trombone riff over the percussion) · A (metals call, reeds answer) ·
percussion break · B · reeds' interlude · B with every horn.
Degrees (F major): 0 F · 1 G · 2 A · 3 Bb · 4 C · 5 D · 6 E · 7 F'.
"""
from brkit import act, arrangement, bars, comp, hits, line, over, part, reactions, recorded, rule, samba, shift, lasting_safe, write

S = 8
A = ('F', 'F', 'C7', 'C7', 'C7', 'C7', 'F', 'F')
B = ('Bb', 'Bb', 'F', 'F', 'Gm', 'C7', 'F', 'F')
CHORD = {'F': '0,2,4', 'C7': '-1,1,3', 'Bb': '-4,-2,0', 'Gm': '-6,-4,-2'}
ROOT = {'F': 0, 'C7': -3, 'Bb': -4, 'Gm': -6}
FIFTH = {'F': -3, 'C7': 1, 'Bb': 0, 'Gm': -2}
REST = ' '.join(['.'] * S)
# The metals' call (bars 1–2 and 5–6) and the reeds' answer (bars 3–4 and 7–8).
CALL_A = ['0 2 4 7 . 7 6 7', '9 . 7 . 4 . 2 .', REST, REST, '-1 1 3 6 . 6 8 6', '3 . 1 . -1 . -3 .', REST, REST]
ANSWER_A = [REST, REST, '-1 1 3 4 6 4 3 1', '-1 0 1 3 4 3 1 -1', REST, REST, '0 2 4 2 0 2 4 7', '9 7 4 2 0 . . .']
CALL_B = ['3 5 7 10 . 10 9 7', '10 . 7 . 5 . 3 .', REST, REST, '1 3 5 8 . 8 7 5', '6 . 4 . 3 . 1 .', REST, REST]
ANSWER_B = [REST, REST, '2 4 7 4 2 4 7 9', '7 4 2 0 -1 0 2 4', REST, REST, '4 2 0 2 4 7 9 7', '7 . . . . . . .']
FULL_A = ['0 2 4 7 . 7 6 7', '9 . 7 . 4 . 2 .', '6 4 1 -1 . -1 1 3', '4 . 3 . 1 . -1 .',
          '-1 1 3 6 . 6 8 6', '3 . 1 . -1 . -3 .', '0 2 4 7 9 7 4 2', '0! . . . . . . .']


def mel(lines):
    return bars(*(line(text, S) for text in lines))


def riff(chords, rhythm='X..x .X..'):
    return over(chords, lambda c: hits(rhythm, str(ROOT[c])))


def oompah(chords):
    return over(chords, lambda c: f'{ROOT[c]}! . . . {FIFTH[c]} . . .')


def stabs(chords, rhythm):
    return over(chords, lambda c: comp(CHORD[c], rhythm))


def drum(pattern):
    return hits(pattern, steps=S)


parts = [
    # a1 · rook: the trombones' syncopated riff (alone in the intro).
    part('response', 'Trombones · riff', 'phrase', samba('trombone', True), [
        riff(('F', 'F', 'C7', 'F')), riff(A), riff(('F', 'C7', 'F', 'C7'), 'X... X...'), riff(B), riff(A, 'X... .x..'), riff(B, 'X..x .X.x'),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=0.3, attack=.006, decay=.3, sustain=.5, release=.1, gate=.6, lpf=4500, hpf=80,
        mapping={'fileDegrees': 0}, effects={'reverb': .15, 'pan': -.25}),
    # a2 · pawn: surdo on both beats, the frevo's march.
    part('rhythm', 'Surdo · marcha', 'pulse', samba('surdo-fundo'), [
        drum('X... X...'), drum('X... X...'), drum('X..x X..x'), drum('X... X...'), drum('X... X...'), drum('X..x X..x'),
    ], [1] * 6, gain=.38, clip=.7, lpf=3000, hpf=30, mapping={'panWidth': 0}, effects={'reverb': .05, 'pan': 0}),
    # b1 · knight: tenor saxes, the reeds' answer and their own interlude.
    part('response', 'Saxofones · resposta', 'phrase', recorded('band', 'tenor-sax', 1), [
        mel([REST, REST, REST, '0 2 4 2 0 . . .']), mel(ANSWER_A), mel([REST] * 4), mel(ANSWER_B), mel(FULL_A), mel(ANSWER_B),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=0.265, attack=.01, decay=.3, sustain=.6, release=.1, gate=.8, lpf=6000, hpf=120,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .15, 'pan': .3}),
    # b2 · pawn: tarol, the frevo's sixteenth engine.
    part('rhythm', 'Tarol', 'pulse', samba('tarol'), [
        drum('X.gx X.gx'), drum('XgxX gxXg'), drum('XxxX xxXx'), drum('XgxX gxXg'), drum('X.gx X.gx'), drum('XxxX xXxX'),
    ], [1] * 6, gain=0.356, clip=.6, lpf=10000, hpf=300, effects={'reverb': .08, 'pan': -.2}),
    # c1 · bishop: alto voice of the saxes, a third over the answer.
    part('response', 'Sax alto · terças', 'phrase', recorded('band', 'tenor-sax', 0), [
        mel([REST, REST, REST, shift('0 2 4 2 0 . . .', 2)]), mel([shift(x, 2) for x in ANSWER_A]), mel([REST] * 4),
        mel([shift(x, 2) for x in ANSWER_B]), mel([shift(x, 2) for x in FULL_A]), mel([shift(x, 2) for x in ANSWER_B]),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.473, attack=.01, decay=.3, sustain=.6, release=.1, gate=.8, lpf=6500, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, True, True)), effects={'reverb': .15, 'pan': .4}),
    # c2 · pawn: snare backbeat.
    part('rhythm', 'Caixa', 'pulse', samba('caixa'), [
        drum('..x. ..x.'), drum('..x. X.x.'), drum('x.x. X.xx'), drum('..x. X.x.'), drum('..x. ..x.'), drum('x.x. X.xx'),
    ], [1] * 6, gain=0.143, clip=.6, lpf=10000, hpf=200, effects={'reverb': .1, 'pan': .15},
        arrangement=arrangement((False, True, True, True, True, True))),
    # d1 · queen: the lead trumpet, the call.
    part('melody', 'Trompete · chamada', 'phrase', samba('trompete', True), [
        mel(['0 2 4 7 . 7 6 7', '9 . 7 . 4 . 2 .', REST, REST]), mel(CALL_A), mel([REST, REST, REST, '. . . . 4 . 4 .']), mel(CALL_B), mel([REST] * 7 + ['. . . . 4 4 4 4']), mel(CALL_B),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.459, attack=.006, decay=.3, sustain=.6, release=.1, gate=.75, lpf=8000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, True, True)), effects={'reverb': .15, 'pan': 0}),
    # d2 · pawn: hand cymbals on the offbeats.
    part('rhythm', 'Pratos', 'pulse', recorded('percussion', 'crash', pitched=False), [
        drum('..x. ..x.'), drum('..x. ..x.'), drum('X... X...'), drum('..x. ..x.'), drum('..x. ..x.'), drum('X.x. X.x.'),
    ], [1] * 6, gain=.06, clip=.7, lpf=10000, hpf=2500, effects={'reverb': .1, 'pan': -.35},
        arrangement=arrangement((False, True, True, True, False, True))),
    # e1 · king: the high trumpet's long shouts in the refrains.
    part('melody', 'Trompete agudo · grito', 'phrase', samba('trompete', True), [
        mel(['7_ . . . . . . .', REST, REST, REST]), mel(['7_ . . . . . . .', REST, REST, REST, '6_ . . . . . . .', REST, REST, REST]), mel(['7! . . . . . . .', REST, REST, REST]),
        mel(['10_ . . . . . . .', REST, '9_ . . . . . . .', REST, '8_ . . . . . . .', REST, '7_ . . . . . . .', REST]),
        mel(['7_ . . . . . . .', REST, REST, REST, '6_ . . . . . . .', REST, REST, REST]),
        mel(['10_ . . . . . . .', REST, '9_ . . . . . . .', REST, '8_ . . . . . . .', REST, '7! . . . 7! . . .', REST]),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.304, attack=.02, decay=.4, sustain=.7, release=.15, gate=.9, lpf=8000, hpf=300,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True), restart=False), effects={'reverb': .25, 'pan': .1}),
    # e2 · pawn: pandeiro jingles of the bloco.
    part('rhythm', 'Pandeiro', 'pulse', samba('pandeiro'), [
        drum('x.x. x.x.'), drum('gxgx gxgx'), drum('xxxx xxxx'), drum('gxgx gxgx'), drum('gxgx gxgx'), drum('gXgx gXgx'),
    ], [1] * 6, gain=0.526, clip=.5, lpf=12000, hpf=1500, effects={'reverb': .06, 'pan': .25},
        arrangement=arrangement((False, True, True, True, True, True))),
    # f1 · bishop: second trombone's offbeat chord stabs.
    part('harmony', 'Trombone · contracanto', 'phrase', samba('trombone', True), [
        stabs(('F', 'F', 'C7', 'F'), '..x. ..x.'), stabs(A, '..x. ..x.'), stabs(('F', 'C7', 'F', 'C7'), '..x. ..x.'), stabs(B, '..x. .xx.'), stabs(A, '..x. ..x.'), stabs(B, '.xx. .xx.'),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=0.24, attack=.006, decay=.2, sustain=.3, release=.08, gate=.4, lpf=4500, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .12, 'pan': .2}),
    # f2 · pawn: second surdo answering on the last sixteenth.
    part('rhythm', 'Surdo · resposta', 'pulse', samba('surdo-meio'), [
        drum('.... ...x'), drum('...x ...x'), drum('..xx ..xx'), drum('...x ...x'), drum('...x ...x'), drum('..xx ..xx'),
    ], [1] * 6, gain=0.432, clip=.6, lpf=3000, hpf=40, effects={'reverb': .05, 'pan': .05},
        arrangement=arrangement((False, True, True, True, True, True))),
    # g1 · knight: second trumpet a third under the call.
    part('response', 'Trompete 2 · terças', 'phrase', samba('trompete', True), [
        mel([shift('0 2 4 7 . 7 6 7', -2), shift('9 . 7 . 4 . 2 .', -2), REST, REST]), mel([shift(x, -2) for x in CALL_A]), mel([REST] * 3 + ['. . . . 2 . 2 .']),
        mel([shift(x, -2) for x in CALL_B]), mel([REST] * 7 + ['. . . . 2 2 2 2']), mel([shift(x, -2) for x in CALL_B]),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.249, attack=.006, decay=.3, sustain=.6, release=.1, gate=.75, lpf=7000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .15, 'pan': -.15}),
    # g2 · pawn: hand cymbal choke on the 'a' of each beat.
    part('rhythm', 'Prato de choque', 'pulse', recorded('percussion', 'cymbal-tip', pitched=False), [
        drum('...x ...x'), drum('...x ...x'), drum('.x.x .x.x'), drum('...x ...x'), drum('...x ...x'), drum('.x.x .x.x'),
    ], [1] * 6, gain=.06, clip=.6, lpf=11000, hpf=3000, effects={'reverb': .08, 'pan': .35},
        arrangement=arrangement((False, False, True, True, True, True))),
    # h1 · rook: low trombone as the band's tuba.
    part('bass', 'Tuba', 'phrase', samba('trombone', True), [
        oompah(('F', 'F', 'C7', 'F')), oompah(A), oompah(('F', 'C7', 'F', 'C7')), oompah(B), oompah(A), oompah(B),
    ], [4, 8, 4, 8, 8, 8], octave=2, gain=0.667, attack=.008, decay=.3, sustain=.5, release=.1, gate=.6, lpf=1800, hpf=35,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .1}, effects={'reverb': .08, 'pan': 0},
        arrangement=arrangement((True, True, False, True, True, True))),
    # h2 · pawn: tarol rolls into each section.
    part('rhythm', 'Tarol · rufo', 'pulse', samba('tarol'), [
        drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('rrrr RRRX'),
    ], [1] * 6, gain=0.3, clip=.6, lpf=10000, hpf=300, effects={'reverb': .1, 'pan': -.1},
        arrangement=arrangement(variations=(0, 1, 2, 3, 4, 0), fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Recife 1935 · Frevo de rua', 'bpm': 152, 'meter': '2/4', 'root': 'F', 'scale': 'Maior', 'harmony': 'static',
    'swing': 0, 'sections': [8, 32, 16, 32, 32, 32], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions(lasting_safe([
        rule('frv-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('frv-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('frv-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('bpm', 6, rampBars=8), act('gain', 4)]),
        rule('frv-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # Check: the band stops and the percussion takes the street.
        rule('frv-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 2)]),
        # Every capture is a trombone punch for the capturer.
        rule('frv-capture', 'capture', 'actor', 1, False, [act('gain', 5)], 'lead'),
        rule('frv-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('gain', 4)]),
        rule('frv-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('frv-tension', 'tension', 'both', 1, True, [act('drive', 2)], 'drums'),
        rule('frv-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('bpm', 4, rampBars=2)]),
        rule('frv-promotion', 'promotion', 'actor', 2, True, [act('transpose', 12)], 'lead'),
        rule('frv-drought', 'captureDrought', 'both', 1, True, [act('lpf', 3500, rampBars=4)]),
    ])),
    'reference': 'Frevo de rua do Recife dos anos 1930 (Nelson Ferreira, Capiba, Zumba): referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/Frevo',
}
write('recife-1935', profile)
