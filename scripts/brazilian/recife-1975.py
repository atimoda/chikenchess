"""Recife 1975 · maracatu de baque virado (original material).

A nação's batuque as it parades: three alfaia voices (the marcante's deep
marking, the meião's answer, the repique's turns), caixas de guerra rolling on
their snares, the tarol, the gonguê's iron bell as the guide, agbês and the
mineiro shaking the sixteenths, and the mestre's apito commanding the breaks.
No horns: the melody is the loa, called by the mestre and answered by the coro
of the nação. D Mixolydian.
Form: apito and gonguê intro · baque de marcação with the loa · parada (gonguê and
voices) · baque virado with the coro · alfaias' virada · everyone.
Degrees (D Mixolydian): 0 D · 1 E · 2 F# · 3 G · 4 A · 5 B · 6 C · 7 D'.
"""
from brkit import act, arrangement, bars, brasil, hits, line, part, reactions, rule, samba, lasting_safe, write

S = 16
REST = ' '.join(['.'] * S)
CALL = ['4 . . 4 . . 5 . 4 . . 2 . . 0 .', '2_ . . . . . . . . . . . . . . .']
CALL_B = ['7 . . 7 . . 6 . 4 . . 4 . . 5 .', '4_ . . . . . . . . . . . . . . .']
ANSWER = ['7 . . 7 . . 6 . 4 . . 2 . . 4 .', '0_ . . . . . . . . . . . . . . .']
ANSWER_B = ['4 . . 4 . . 5 . 7 . . 6 . . 4 .', '2_ . . . . . . . . . . . . . . .']


def mel(lines):
    return bars(*(line(text, S) for text in lines))


def drum(pattern, n=1):
    return hits(pattern * n, steps=S)


GONGUE = 'X.x. .x.x X.x. .x..'
MARCANTE = 'X... ..X. X... ..X.'
MARCANTE_VIRADO = 'X..x ..X. X..x .xX.'
MEIAO = '..x. x... ..x. x..x'
REPIQUE = 'x.xx .x.x x.xx .x.x'
AGBE = samba('chocalho')
parts = [
    # a1 · rook: alfaia marcante, the deep marking.
    part('rhythm', 'Alfaia marcante', 'pulse', brasil('alfaia'), [
        drum('X... .... X... ....'), drum(MARCANTE), drum('X... .... .... ....'), drum(MARCANTE_VIRADO), drum(MARCANTE_VIRADO), drum(MARCANTE_VIRADO),
    ], [1] * 6, gain=0.349, clip=.9, lpf=2500, hpf=30, mapping={'panWidth': 0}, effects={'reverb': .1, 'pan': 0},
        arrangement=arrangement((False, True, False, True, True, True))),
    # a2 · pawn: tarol.
    part('rhythm', 'Tarol', 'pulse', samba('tarol'), [
        drum('x.xx x.xx x.xx x.xx'), drum('x.xx x.xx x.xx x.xx'), drum('x... x... x... x...'), drum('xgxX xgxX xgxX xgxX'), drum('x.xx x.xx x.xx x.xx'), drum('xgxX xgxX xgxX xgxX'),
    ], [1] * 6, gain=0.357, clip=.6, lpf=10000, hpf=300, effects={'reverb': .08, 'pan': -.25},
        arrangement=arrangement((False, True, False, True, True, True))),
    # b1 · knight: the gonguê, guide of the baque.
    part('rhythm', 'Gonguê', 'pulse', brasil('gongue'), [
        drum(GONGUE), drum(GONGUE), drum(GONGUE), drum('X.x. .x.x X.x. .xxx'), drum(GONGUE), drum('X.x. .x.x X.x. .xxx'),
    ], [1] * 6, gain=0.137, clip=.7, lpf=7000, hpf=300, effects={'reverb': .12, 'pan': .35}),
    # b2 · pawn: agbê.
    part('rhythm', 'Agbê', 'pulse', AGBE, [
        drum('x... x... x... x...'), drum('x.x. x.xX x.x. x.xX'), drum('x... x... x... x...'), drum('x.x. x.xX x.x. x.xX'), drum('x.x. x.x. x.x. x.x.'), drum('x.xX x.xX x.xX x.xX'),
    ], [1] * 6, gain=0.151, clip=.6, lpf=11000, hpf=1500, effects={'reverb': .08, 'pan': .25},
        arrangement=arrangement((False, True, True, True, True, True))),
    # c1 · bishop: alfaia repique, the high turns.
    part('rhythm', 'Alfaia repique', 'pulse', samba('surdo-viradeira'), [
        drum('.... .... .... x.xx'), drum(REPIQUE), drum('.... .... .... x.xx'), drum('x.xx .xxx x.xx .xXX'), drum('xxxx .xxx xxxx .XXX'), drum('x.xx .xxx x.xx .xXX'),
    ], [1] * 6, gain=0.262, clip=.8, lpf=5000, hpf=60, effects={'reverb': .08, 'pan': -.2},
        arrangement=arrangement((False, True, False, True, True, True))),
    # c2 · pawn: mineiro (the nação's ganzá).
    part('rhythm', 'Mineiro', 'pulse', brasil('ganza'), [
        drum('x.x. x.x. x.x. x.x.'), drum('gxgx gxgx gxgx gxgx'), drum('x.x. x.x. x.x. x.x.'), drum('gxgX gxgX gxgX gxgX'), drum('gxgx gxgx gxgx gxgx'), drum('gXgX gXgX gXgX gXgX'),
    ], [1] * 6, gain=0.282, clip=.6, lpf=12000, hpf=3500, effects={'reverb': .05, 'pan': -.35},
        arrangement=arrangement((False, True, False, True, True, True))),
    # d1 · queen: the mestre's loa.
    part('melody', 'Loa · mestre', 'phrase', brasil('coro-laia', True), [
        mel(CALL + [REST, REST]), mel(CALL + [REST, REST] + CALL + [REST, REST]), mel(CALL + [REST, REST]),
        mel(CALL_B + [REST, REST] + CALL + [REST, REST]), mel(CALL + [REST, REST]), mel(CALL_B + [REST, REST] + CALL + [REST, REST]),
    ], [4, 8, 4, 8, 4, 8], octave=3, gain=0.323, attack=.03, decay=.4, sustain=.75, release=.2, gate=.9, lpf=5000, hpf=120,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, True, True, True, False, True)), effects={'reverb': .3, 'pan': -.05}),
    # d2 · pawn: caixa de guerra.
    part('rhythm', 'Caixa de guerra', 'pulse', samba('caixa'), [
        drum('.... .... .... x.xx'), drum('Xgxg xgXg xgxg Xgxg'), drum('.... .... .... ...x'), drum('XgxX xgXg xgxX Xgxr'), drum('Xgxg xgXg xgxg Xgxg'), drum('XgxX xgXg xgxX XgRr'),
    ], [1] * 6, gain=0.145, clip=.6, lpf=10000, hpf=200, effects={'reverb': .1, 'pan': .15},
        arrangement=arrangement((False, True, False, True, True, True))),
    # e1 · king: the coro of the nação answering the loa.
    part('melody', 'Coro da nação', 'sustain', brasil('coro-laia', True), [
        mel([REST, REST] + ANSWER), mel([REST, REST] + ANSWER + [REST, REST] + ANSWER), mel([REST, REST] + ANSWER),
        mel([REST, REST] + ANSWER_B + [REST, REST] + ANSWER), mel([REST, REST] + ANSWER), mel([REST, REST] + ANSWER_B + [REST, REST] + ANSWER),
    ], [4, 8, 4, 8, 4, 8], octave=4, gain=0.401, attack=.03, decay=.4, sustain=.75, release=.2, gate=.9, lpf=6000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, False, True), restart=False), effects={'reverb': .3, 'pan': .05}),
    # e2 · pawn: second agbê on the offbeats.
    part('rhythm', 'Agbê · contratempo', 'pulse', AGBE, [
        drum('..x. ..x. ..x. ..x.'), drum('..x. ..x. ..x. ..x.'), drum('..x. ..x. ..x. ..x.'), drum('.xx. .xx. .xx. .xx.'), drum('..x. ..x. ..x. ..x.'), drum('.xx. .xx. .xx. .xX.'),
    ], [1] * 6, gain=0.162, clip=.6, lpf=11000, hpf=1500, effects={'reverb': .08, 'pan': -.15},
        arrangement=arrangement((False, False, False, True, True, True))),
    # f1 · bishop: alfaia virada, the phrase-turning strokes.
    part('rhythm', 'Alfaia virada', 'pulse', brasil('alfaia'), [
        drum('.... .... ..x. x.xX'), drum('.... .... .... ..xX'), drum('.... .... ..x. x.xX'), drum('.... ..x. .... x.xX'), drum('..x. x.xX ..x. x.XX'), drum('.... ..x. ..x. x.xX'),
    ], [1] * 6, gain=.28, clip=.9, lpf=3500, hpf=40, effects={'reverb': .1, 'pan': .2}),
    # f2 · pawn: snare rolls (esteira) into each section.
    part('rhythm', 'Caixa · rufo', 'pulse', samba('caixa'), [
        drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('rrrr rrrr RRRR RRRX'),
    ], [1] * 6, gain=0.0749, clip=.6, lpf=10000, hpf=200, effects={'reverb': .12, 'pan': -.1},
        arrangement=arrangement((True, True, True, True, True, False), fills=(5, 5, 5, 5, 5, None))),
    # g1 · knight: the mestre's apito.
    part('response', 'Apito do mestre', 'pulse', brasil('apito'), [
        drum('X... X... X.X. X...'), drum('.... .... .... ...x'), drum('X... .... X... ....'), drum('.... .... .... ..X.'), drum('X... .... X.X. ....'), drum('.... .... .... ..X.'),
    ], [1] * 6, gain=0.196, clip=1, lpf=8000, hpf=800, effects={'reverb': .25, 'pan': .3},
        arrangement=arrangement((True, False, True, False, True, False), restart=False)),
    # g2 · pawn: second caixa, the off-snare ghost layer.
    part('rhythm', 'Caixa 2', 'pulse', samba('caixa'), [
        drum('.... x... .... x...'), drum('..x. x... ..x. x...'), drum('.... x... .... x...'), drum('..x. x.x. ..x. x.x.'), drum('..x. x... ..x. x...'), drum('..x. x.x. ..x. x.xx'),
    ], [1] * 6, gain=0.185, clip=.6, lpf=10000, hpf=300, effects={'reverb': .1, 'pan': .3},
        arrangement=arrangement((False, False, False, True, True, True))),
    # h1 · rook: alfaia meião, answering the marcante.
    part('rhythm', 'Alfaia meião', 'pulse', samba('surdo-meio'), [
        drum('.... ..x. .... ..x.'), drum(MEIAO), drum('.... .... .... ...x'), drum('..x. x..x ..x. x.xx'), drum('..x. x..x ..x. x.xx'), drum('..x. x..x ..x. x.xx'),
    ], [1] * 6, gain=.3, clip=.8, lpf=3000, hpf=40, mapping={'panWidth': 0}, effects={'reverb': .08, 'pan': -.05},
        arrangement=arrangement((False, True, False, True, True, True))),
    # h2 · pawn: the agbê's open shake on the one.
    part('rhythm', 'Agbê · balanço', 'pulse', AGBE, [
        drum('X... .... .... ....'), drum('X... .... X... ....'), drum('X... .... .... ....'), drum('X... .... X... ....'), drum('X... .... X... ....'), drum('X... X... X... X...'),
    ], [1] * 6, gain=0.144, clip=.9, lpf=9000, hpf=1000, effects={'reverb': .15, 'pan': .1},
        arrangement=arrangement((True, True, False, True, True, True))),
]

profile = {
    'name': 'Recife 1975 · Maracatu de baque virado', 'bpm': 108, 'meter': '4/4', 'root': 'D', 'scale': 'Mixolídia', 'harmony': 'static',
    'swing': 0, 'sections': [16, 32, 16, 32, 32, 32], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions(lasting_safe([
        rule('mar-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('mar-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('mar-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('bpm', 6, rampBars=8), act('gain', 4)]),
        # Castling brings the baque virado and the coro.
        rule('mar-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # A check is the mestre's apito: the parada, gonguê and voices only.
        rule('mar-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 2)]),
        # Each capture is an alfaia stroke for the capturer.
        rule('mar-capture', 'capture', 'actor', 1, False, [act('gain', 5)], 'drums'),
        rule('mar-queen', 'queenCapture', 'both', 4, True, [act('variation', 4), act('reverb', .35)]),
        rule('mar-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('mar-tension', 'tension', 'both', 1, True, [act('drive', 2), act('lpf', 4000, rampBars=4)], 'drums'),
        rule('mar-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5)]),
        rule('mar-hanging', 'hangingPiece', 'actor', 1, True, [act('gain', 5)], 'lead'),
        rule('mar-drought', 'captureDrought', 'both', 1, True, [act('reverb', .3), act('gain', -2)]),
    ])),
    'reference': 'Maracatu de baque virado das nações do Recife (Nação Porto Rico, Leão Coroado, Estrela Brilhante, Elefante): referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/Maracatu',
}
write('recife-1975', profile)
