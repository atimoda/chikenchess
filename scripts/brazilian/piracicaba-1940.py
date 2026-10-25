"""Piracicaba 1940 · moda caipira and cateretê (original material).

Música caipira of the São Paulo interior: a dupla sings in parallel thirds (the
first voice over the second), the ten-string viola caipira opens with its
ponteio and strums the cateretê rasqueado, the violão holds the bass, and in the
catira the dancers answer with palmas and sapateado (hand claps and foot stomps)
instead of drums. G major, I–V7 in the verse and a refrain that opens on the IV.
Form: viola ponteio intro · A (the dupla) · catira of palmas and sapateado · B ·
viola solo · B with everyone.
Degrees (G major): 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F# · 7 G'.
"""
from brkit import act, arrangement, bars, brasil, comp, hits, line, over, part, reactions, recorded, rule, samba, shift, lasting_safe, write

S = 8
A = ('G', 'G', 'D7', 'D7', 'D7', 'D7', 'G', 'G')
B = ('C', 'C', 'G', 'G', 'D7', 'D7', 'G', 'G')
VAMP = ('G', 'D7', 'G', 'G')
CHORD = {'G': '0,2,4', 'D7': '-3,-1,1,3', 'C': '-4,-2,0'}
ROOT = {'G': 0, 'D7': 4, 'C': 3}
FIFTH = {'G': 4, 'D7': 1, 'C': 0}
REST = ' '.join(['.'] * S)
MEL_A = ['. 4 4 4 . 2 4 .', '5 4 2 . 0 . . .', '. 3 3 3 . 1 3 .', '4 3 1 . -1 . . .',
         '. 1 1 1 . 3 4 .', '6 . 4 . 3 . 1 .', '. 2 2 2 . 1 0 .', '2 . . . . . . .']
MEL_B = ['. 5 5 5 . 3 5 .', '7 5 3 . 2 . . .', '. 4 4 4 . 2 4 .', '7 . 6 . 4 . . .',
         '. 3 3 3 . 4 6 .', '7 . 6 . 4 . 3 .', '. 2 2 2 . 1 0 .', '0 . . . . . . .']
PONTEIO = ['4 7 4 2 0 2 4 7', '9 7 4 7 2 4 0 2', '3 6 3 1 -1 1 3 6', '8 6 3 6 1 3 -1 1',
           '1 3 6 8 6 3 1 -1', '3 1 -1 -3 -1 1 3 4', '4 7 9 11 9 7 4 2', '0 4 2 0 . . . .']


def mel(lines):
    return bars(*(line(text, S) for text in lines))


def bass(chords):
    return over(chords, lambda c: f'{ROOT[c]}! . . . {FIFTH[c]} . . .')


def strum(progression, rhythm):
    return over(progression, lambda c: comp(CHORD[c], rhythm))


def drum(pattern):
    return hits(pattern, steps=S)


RASQUEADO = 'X.xx X.x.'
parts = [
    # a1 · rook: the violão's bass.
    part('bass', 'Violão · baixo', 'phrase', recorded('guitars', 'nylon'), [
        bass(VAMP), bass(A), bass(VAMP), bass(B), bass(A), bass(B),
    ], [4, 8, 4, 8, 8, 8], octave=2, gain=.4, attack=.004, decay=.5, sustain=.3, release=.2, gate=.7, lpf=2400, hpf=40,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .1}, effects={'reverb': .12, 'pan': -.1},
        arrangement=arrangement((False, True, False, True, True, True))),
    # a2 · pawn: sapateado, the dancers' boots on the wooden floor.
    part('rhythm', 'Sapateado', 'pulse', brasil('surdo-abafado'), [
        drum('X... ....'), drum('X... ....'), drum('X.xx X.x.'), drum('X... ....'), drum('X... ....'), drum('X.xx X.x.'),
    ], [1] * 6, gain=.3, clip=.4, lpf=1400, hpf=50, mapping={'panWidth': 0}, effects={'reverb': .15, 'pan': 0},
        arrangement=arrangement((False, True, True, True, False, True))),
    # b1 · knight: the viola caipira's ponteio (intro, fills and solo).
    part('melody', 'Viola caipira · ponteio', 'phrase', brasil('viola-caipira', True), [
        mel(PONTEIO[4:]), mel([REST] * 7 + ['0 4 2 0 . . . .']), mel([REST] * 4), mel([REST] * 7 + ['7 4 2 0 . . . .']), mel(PONTEIO), mel([REST] * 7 + ['4 7 9 11 . . . .']),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=.3, attack=.002, decay=.5, sustain=.25, release=.2, gate=.8, lpf=8000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, True, False, True, True, True)), effects={'reverb': .18, 'pan': .2}),
    # b2 · pawn: palmas of the catira.
    part('rhythm', 'Palmas', 'pulse', brasil('palmas'), [
        drum('..x. ..x.'), drum('..x. ..x.'), drum('..xX ..xX'), drum('..x. ..x.'), drum('..x. ..x.'), drum('..xX ..xX'),
    ], [1] * 6, gain=.16, clip=.6, lpf=8000, hpf=400, effects={'reverb': .2, 'pan': -.2},
        arrangement=arrangement((False, False, True, True, False, True))),
    # c1 · bishop: the violão's chord strokes under the voices.
    part('harmony', 'Violão · batida', 'phrase', recorded('guitars', 'nylon'), [
        strum(VAMP, 'x... x...'), strum(A, '..x. ..x.'), strum(VAMP, 'x... ....'), strum(B, '..x. ..x.'), strum(A, '..x. ..x.'), strum(B, '..x. .xx.'),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=.16, attack=.004, decay=.3, sustain=.2, release=.15, gate=.45, lpf=5000, hpf=120,
        mapping={'fileDegrees': 0}, effects={'reverb': .12, 'pan': -.3}, arrangement=arrangement((False, True, False, True, True, True))),
    # c2 · pawn: second row of palmas on the offbeat sixteenths.
    part('rhythm', 'Palmas · contratempo', 'pulse', brasil('palmas'), [
        drum('...x ...x'), drum('...x ...x'), drum('.x.x .x.x'), drum('...x ...x'), drum('...x ...x'), drum('.x.x .x.x'),
    ], [1] * 6, gain=.1, clip=.5, lpf=8000, hpf=500, effects={'reverb': .25, 'pan': .25},
        arrangement=arrangement((False, False, True, False, False, True))),
    # d1 · queen: the dupla's first voice.
    part('melody', 'Primeira voz', 'phrase', brasil('coro-laia', True), [
        mel(MEL_A[4:]), mel(MEL_A), mel([REST] * 3 + ['. . . . . 1 0 .']), mel(MEL_B), mel(MEL_A), mel(MEL_B),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=.22, attack=.03, decay=.4, sustain=.7, release=.18, gate=.9, lpf=6000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True)), effects={'reverb': .22, 'pan': -.08}),
    # d2 · pawn: reco-reco of the cururu.
    part('rhythm', 'Reco-reco', 'pulse', brasil('reco-reco'), [
        drum('.... x...'), drum('.... x...'), drum('x... x...'), drum('..x. x...'), drum('.... x...'), drum('..x. x.x.'),
    ], [1] * 6, gain=.1, clip=.6, lpf=9000, hpf=1500, effects={'reverb': .05, 'pan': .3},
        arrangement=arrangement((False, True, False, True, True, True))),
    # e1 · king: the dupla's second voice, a third below.
    part('melody', 'Segunda voz', 'phrase', brasil('coro-laia', True), [
        mel([shift(x, -2) for x in MEL_A[4:]]), mel([shift(x, -2) for x in MEL_A]), mel([REST] * 3 + ['. . . . . -1 -2 .']),
        mel([shift(x, -2) for x in MEL_B]), mel([shift(x, -2) for x in MEL_A]), mel([shift(x, -2) for x in MEL_B]),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=.16, attack=.03, decay=.4, sustain=.7, release=.18, gate=.9, lpf=5000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True), restart=False), effects={'reverb': .22, 'pan': .08}),
    # e2 · pawn: the sapateado's brushing ('escova') rolls.
    part('rhythm', 'Sapateado · escova', 'pulse', brasil('tamborim-abafado'), [
        drum('.... ..rr'), drum('.... ..rr'), drum('rr.. rr.R'), drum('.... ..rr'), drum('.... ..rr'), drum('rr.. rr.R'),
    ], [1] * 6, gain=.12, clip=.5, lpf=3000, hpf=200, effects={'reverb': .15, 'pan': -.1},
        arrangement=arrangement((False, False, True, False, False, True))),
    # f1 · bishop: the viola's cateretê rasqueado.
    part('harmony', 'Viola · rasqueado', 'phrase', brasil('viola-caipira', True), [
        strum(VAMP, 'X... X...'), strum(A, RASQUEADO), strum(VAMP, RASQUEADO), strum(B, RASQUEADO), strum(A, 'X... X.x.'), strum(B, 'X.xx X.xx'),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=.14, attack=.003, decay=.3, sustain=.2, release=.12, gate=.4, lpf=7000, hpf=200,
        mapping={'fileDegrees': 0}, effects={'reverb': .12, 'pan': .3}, arrangement=arrangement((False, True, True, True, True, True))),
    # f2 · pawn: ganzá.
    part('rhythm', 'Ganzá', 'pulse', brasil('ganza'), [
        drum('x.x. x.x.'), drum('gxgx gxgx'), drum('x.x. x.x.'), drum('gxgx gxgx'), drum('gxgx gxgx'), drum('gXgx gXgx'),
    ], [1] * 6, gain=.08, clip=.6, lpf=12000, hpf=3500, effects={'reverb': .04, 'pan': -.3},
        arrangement=arrangement((False, True, False, True, True, True))),
    # g1 · knight: a sanfona holding the refrain's harmony.
    part('harmony', 'Sanfona · sustentação', 'sustain', brasil('sanfona', True), [
        strum(VAMP, 'x... ....'), strum(A, 'x... ....'), strum(VAMP, 'x... ....'), strum(B, 'x... ....'), strum(A, 'x... ....'), strum(B, 'x... ....'),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=.08, attack=.1, decay=.4, sustain=.8, release=.3, gate=.95, lpf=3500, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .2, 'pan': -.25}),
    # g2 · pawn: pandeiro jingles.
    part('rhythm', 'Pandeiro', 'pulse', brasil('pandeiro-platinela'), [
        drum('...x ...x'), drum('g..x g..x'), drum('...x ...x'), drum('g..x g..x'), drum('g..x g..x'), drum('gxgX gxgX'),
    ], [1] * 6, gain=.1, clip=.6, lpf=12000, hpf=2500, effects={'reverb': .05, 'pan': .2},
        arrangement=arrangement((False, False, False, True, True, True))),
    # h1 · rook: the viola's low drone on the open strings, the 'cebolão' tuning ringing.
    part('texture', 'Viola · bordão', 'sustain', brasil('viola-caipira', True), [
        bars('0! . . . . . . .'), bars(*['0! . . . . . . .'] * 2), bars('0 . . . . . . .'), bars(*['0! . . . . . . .'] * 2), bars('0 . . . . . . .'), bars(*['0! . . . 4 . . .'] * 2),
    ], [1, 2, 1, 2, 1, 2], octave=2, gain=.14, attack=.003, decay=.8, sustain=.4, release=.4, gate=.95, lpf=3000, hpf=50,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, False, True, False), restart=False), effects={'reverb': .25, 'pan': 0}),
    # h2 · pawn: palmas rolls into each section.
    part('rhythm', 'Palmas · virada', 'pulse', brasil('palmas'), [
        drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('x.x. XXXX'),
    ], [1] * 6, gain=.14, clip=.6, lpf=8000, hpf=400, effects={'reverb': .2, 'pan': -.1},
        arrangement=arrangement(variations=(0, 1, 2, 3, 4, 0), fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Piracicaba 1940 · Moda caipira e cateretê', 'bpm': 100, 'meter': '2/4', 'root': 'G', 'scale': 'Maior', 'harmony': 'static',
    'swing': 0, 'sections': [8, 32, 16, 32, 32, 32], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Solo', 'Chorus'],
    'parts': parts,
    'reactions': reactions(lasting_safe([
        rule('cai-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('cai-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('cai-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 4)]),
        rule('cai-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # A check calls the catira: palmas and sapateado answer alone.
        rule('cai-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 2)]),
        rule('cai-capture', 'capture', 'actor', 1, False, [act('gain', 5)], 'drums'),
        rule('cai-queen', 'queenCapture', 'both', 4, True, [act('variation', 4), act('reverb', .4)]),
        # Quiet play: the viola ponteia alone.
        rule('cai-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('cai-tension', 'tension', 'both', 1, True, [act('reverb', .45)], 'lead'),
        rule('cai-swing', 'evalSwing', 'actor', 2, True, [act('variation', 2)]),
        rule('cai-castle2', 'secondCastle', 'both', 2, True, [act('variation', 5)]),
        rule('cai-drought', 'captureDrought', 'both', 1, True, [act('lpf', 3000, rampBars=4), act('gain', -2)]),
    ])),
    'reference': 'Música caipira e cateretê do interior paulista (Cornélio Pires, Tonico e Tinoco, Raul Torres, a catira): referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/M%C3%BAsica_caipira',
}
write('piracicaba-1940', profile)
