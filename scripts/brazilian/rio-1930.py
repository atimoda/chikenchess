"""Rio de Janeiro 1930 · samba do Estácio (original material).

The new samba of the Estácio sambistas: the surdos split the 2/4 (the second
marks the first beat muted, the first answers open on the second beat), the
tamborim plays the teleco-teco, the cuíca 'talks', pandeiro, chocalho and the
roda's palmas fill the sixteenths. Over it the cavaquinho chops, the
seven-string guitar walks with its baixarias, the flute states the verse and the
roda's chorus sings the refrain. C major, I–vi–ii–V in the verse and a refrain
that opens on the IV.
Form: Intro · A (verse) · batucada break · B (refrain, sung) · cavaquinho solo · B with everyone.
Degrees (C major): 0 C · 1 D · 2 E · 3 F · 4 G · 5 A · 6 B · 7 C'.
"""
from brkit import act, arrangement, bars, brasil, comp, hits, line, over, part, reactions, recorded, rule, samba, lasting_safe, write

S = 8
A = ('C', 'Am', 'Dm', 'G7', 'C', 'Am', 'Dm', 'G7')
B = ('F', 'F', 'C', 'Am', 'Dm', 'G7', 'C', 'C')
INTRO = ('Dm', 'G7', 'C', 'G7')
CHORD = {'C': '0,2,4', 'Am': '0,2,5', 'Dm': '1,3,5', 'G7': '-1,1,3,4', 'F': '0,3,5'}
ROOT = {'C': 0, 'Am': 5, 'Dm': 1, 'G7': 4, 'F': 3}
FIFTH = {'C': 4, 'Am': 2, 'Dm': 5, 'G7': 1, 'F': 0}
BAIXARIA = {'C': '7 6 5 4 3 2 1 0', 'G7': '4 3 2 1 0 -1 -2 -3', 'Am': '5 4 3 2 1 0 -1 -2', 'Dm': '1 2 3 4 5 4 3 2', 'F': '3 2 1 0 -1 0 1 2'}
MEL_A = ['. 4 . 4 5 . 4 .', '2 . 0 . . 2 4 .', '. 3 . 3 5 . 3 .', '1 . -1 . . 1 3 .',
         '. 4 . 7 . 6 5 4', '5 . 2 . 0 . 2 .', '3 . 1 . 5 . 3 .', '1 . . 2 . . . .']
MEL_B = ['. 5 . 7 . 5 3 .', '0 . 3 . 5 . . .', '. 4 . 7 . 4 2 .', '0 . 2 . 5 . . .',
         '. 3 . 5 . 8 7 5', '6 . 4 . 3 . 1 .', '0 . 2 . 4 . 7 .', '7 . . . . . . .']
# Cavaquinho 'ponteado' solo on the verse harmony: repeated notes and thirds.
SOLO = ['4 4 . 4 5 4 2 4', '5 5 . 5 7 5 2 0', '3 3 . 3 5 3 1 3', '4 . 3 . 1 . -1 .',
        '7 7 . 7 9 7 4 7', '9 7 5 2 0 2 5 7', '8 . 5 . 3 . 1 .', '4 . 6 . 8 . . .']
REST = ' '.join(['.'] * S)


def mel(lines):
    return bars(*(line(text, S) for text in lines))


def walk(chords):
    return bars(*(BAIXARIA[c] if i % 4 == 3 else f'{ROOT[c]}! . . . {FIFTH[c]} . . {ROOT[c]}\'' for i, c in enumerate(chords)))


def chords(progression, rhythm):
    return over(progression, lambda c: comp(CHORD[c], rhythm))


def drum(pattern, n=1):
    return hits(pattern * n, steps=S)


TELECO = 'X.x..x.x .x.xx.x.'
CARRETEIRO = 'Xgxg Xgxg Xgxg XgxX'
parts = [
    # a1 · rook: seven-string bordão and baixarias.
    part('bass', 'Violão 7 cordas · bordão', 'phrase', recorded('guitars', 'nylon'), [
        walk(INTRO), walk(A), walk(('C', 'G7', 'C', 'G7')), walk(B), walk(A), walk(B),
    ], [4, 8, 4, 8, 8, 8], octave=2, gain=.42, attack=.004, decay=.5, sustain=.3, release=.2, gate=.7, lpf=2600, hpf=40,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .1}, effects={'reverb': .12, 'pan': -.1},
        arrangement=arrangement((True, True, False, True, True, True))),
    # a2 · pawn: surdo de segunda, the muted first beat.
    part('rhythm', 'Surdo de marcação · 1º tempo', 'pulse', brasil('surdo-abafado'), [
        drum('x... ....'), drum('X... ....'), drum('X... ..x.'), drum('X... ....'), drum('X... ....'), drum('X... ..x.'),
    ], [1] * 6, gain=.4, clip=.8, lpf=3000, hpf=30, mapping={'panWidth': 0}, effects={'reverb': .05, 'pan': 0}),
    # b1 · knight: the cuíca 'talking' between the phrases.
    part('response', 'Cuíca', 'pulse', brasil('cuica-aguda'), [
        drum('..x. ..x.'), drum('..x. .x.x', 1), drum('..x. .xxx'), drum('..xx .x.x'), drum('..x. .x.x'), drum('.xxx .x.x'),
    ], [1] * 6, gain=.2, clip=.9, lpf=6000, hpf=200, effects={'reverb': .1, 'pan': .35},
        arrangement=arrangement((False, True, True, True, True, True))),
    # b2 · pawn: tamborim teleco-teco (carreteiro in the break and the finale).
    part('rhythm', 'Tamborim · teleco-teco', 'pulse', brasil('tamborim'), [
        hits(TELECO), hits(TELECO), hits(CARRETEIRO), hits(TELECO), hits(TELECO), hits(CARRETEIRO),
    ], [2] * 6, gain=.24, clip=.7, lpf=9000, hpf=300, effects={'reverb': .06, 'pan': -.25},
        arrangement=arrangement((False, True, True, True, True, True))),
    # c1 · bishop: six-string chords.
    part('harmony', 'Violão 6 cordas · batida', 'phrase', recorded('guitars', 'nylon'), [
        chords(INTRO, 'x... x...'), chords(A, 'x..x ..x.'), chords(('C', 'G7', 'C', 'G7'), 'x... ....'), chords(B, 'x..x ..x.'), chords(A, 'x... ..x.'), chords(B, 'x.xx ..x.'),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=.2, attack=.004, decay=.35, sustain=.2, release=.15, gate=.5, lpf=5000, hpf=120,
        mapping={'fileDegrees': 0}, effects={'reverb': .14, 'pan': -.3}, arrangement=arrangement((True, True, False, True, True, True))),
    # c2 · pawn: pandeiro jingles.
    part('rhythm', 'Pandeiro · platinelas', 'pulse', brasil('pandeiro-platinela'), [
        drum('gxgX gxgX'), drum('gxgX gxgX'), drum('gxgX gxgX'), drum('gxgX gxgX'), drum('gxgX gxgX'), drum('gXgX gXgX'),
    ], [1] * 6, gain=.15, clip=.7, lpf=12000, hpf=2500, effects={'reverb': .06, 'pan': .12}),
    # d1 · queen: the flute states the verse, doubles the refrain an octave over the chorus.
    part('melody', 'Flauta · melodia', 'phrase', recorded('classical', 'flute-sustain'), [
        mel(MEL_A[4:]), mel(MEL_A), mel(['. . . . . . . .'] * 3 + ['. . . . 1 . 3 .']), mel(MEL_B), mel(MEL_A), mel(MEL_B),
    ], [4, 8, 4, 8, 8, 8], octave=5, gain=.24, attack=.012, decay=.3, sustain=.7, release=.12, gate=.85, lpf=9000, hpf=250,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True)), effects={'reverb': .2, 'pan': 0}),
    # d2 · pawn: pandeiro thumb and slap.
    part('rhythm', 'Pandeiro · grave', 'pulse', brasil('pandeiro-grave'), [
        drum('X... x...'), drum('X..x x...'), drum('X..x x..x'), drum('X..x x...'), drum('X..x x...'), drum('X..x x..x'),
    ], [1] * 6, gain=.24, clip=.8, lpf=4000, hpf=60, effects={'reverb': .06, 'pan': .05}),
    # e1 · king: cavaquinho ponteado, the solo voice of the fifth section.
    part('melody', 'Cavaquinho · ponteado', 'phrase', brasil('cavaquinho', True), [
        mel(SOLO[4:]), mel(SOLO), mel(SOLO[:4]), mel(SOLO), mel(SOLO), mel(SOLO),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=.24, attack=.002, decay=.3, sustain=.15, release=.1, gate=.6, lpf=9000, hpf=300,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, False, False, True, False), restart=False), effects={'reverb': .12, 'pan': .15}),
    # e2 · pawn: chocalho.
    part('rhythm', 'Chocalho', 'pulse', samba('chocalho'), [
        drum('x.x. x.x.'), drum('gxgx gxgX'), drum('gxgx gxgX'), drum('gxgx gxgX'), drum('gxgx gxgX'), drum('gXgx gXgX'),
    ], [1] * 6, gain=.1, clip=.6, lpf=12000, hpf=2500, effects={'reverb': .04, 'pan': -.2},
        arrangement=arrangement((False, True, True, True, True, True))),
    # f1 · bishop: cavaquinho centre.
    part('harmony', 'Cavaquinho · centro', 'phrase', brasil('cavaquinho', True), [
        chords(INTRO, 'X.x. X.x.'), chords(A, 'X.xx .x.x'), chords(('C', 'G7', 'C', 'G7'), 'X.xx .x.x'), chords(B, 'X.xx .x.x'), chords(A, 'X... .x.x'), chords(B, 'X.xx .xxx'),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=.2, attack=.002, decay=.25, sustain=.1, release=.08, gate=.4, lpf=9000, hpf=300,
        mapping={'fileDegrees': 0}, effects={'reverb': .1, 'pan': .25}, arrangement=arrangement((False, True, False, True, True, True))),
    # f2 · pawn: reco-reco.
    part('rhythm', 'Reco-reco', 'pulse', brasil('reco-reco'), [
        drum('.... x...'), drum('..x. x.x.'), drum('x.x. x.x.'), drum('..x. x.x.'), drum('.... x...'), drum('x.x. x.x.'),
    ], [1] * 6, gain=.12, clip=.6, lpf=9000, hpf=1500, effects={'reverb': .05, 'pan': .3},
        arrangement=arrangement((False, False, True, True, False, True))),
    # g1 · knight: the roda's chorus singing the refrain ('lá-laiá').
    part('melody', 'Coro da roda', 'phrase', brasil('coro-laia', True), [
        mel(MEL_B[4:]), mel(MEL_B), mel(MEL_B[4:]), mel(MEL_B), mel(MEL_B), mel(MEL_B),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=.2, attack=.03, decay=.4, sustain=.7, release=.18, gate=.9, lpf=6000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .25, 'pan': -.15}),
    # g2 · pawn: palmas of the roda on the offbeats.
    part('rhythm', 'Palmas da roda', 'pulse', brasil('palmas'), [
        drum('..x. ..x.'), drum('..x. ..x.'), drum('..x. ..x.'), drum('..x. ..x.'), drum('..x. ..x.'), drum('..x. .xx.'),
    ], [1] * 6, gain=.14, clip=.6, lpf=8000, hpf=400, effects={'reverb': .2, 'pan': .2},
        arrangement=arrangement((False, False, True, True, False, True))),
    # h1 · rook: surdo de primeira, open on the second beat (the Estácio 'marcação').
    part('rhythm', 'Surdo de primeira · 2º tempo', 'pulse', brasil('surdo-mangueira'), [
        drum('.... X...'), drum('.... X...'), drum('.... X..x'), drum('.... X...'), drum('.... X...'), drum('..x. X..x'),
    ], [1] * 6, gain=.42, clip=1, lpf=2500, hpf=30, mapping={'panWidth': 0}, effects={'reverb': .06, 'pan': 0}),
    # h2 · pawn: tamborim fills into each section.
    part('rhythm', 'Tamborim · virada', 'pulse', brasil('tamborim-abafado'), [
        drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('XxXx XXXX'),
    ], [1] * 6, gain=.2, clip=.6, lpf=9000, hpf=300, effects={'reverb': .06, 'pan': -.3},
        arrangement=arrangement(variations=(0, 1, 2, 3, 4, 0), fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Rio de Janeiro 1930 · Samba do Estácio', 'bpm': 104, 'meter': '2/4', 'root': 'C', 'scale': 'Maior', 'harmony': 'static',
    'swing': 0, 'sections': [8, 32, 8, 32, 32, 32], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Solo', 'Chorus'],
    'parts': parts,
    'reactions': reactions(lasting_safe([
        rule('sam-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('sam-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('sam-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 5)]),
        # Castling calls the refrain: the roda starts to sing.
        rule('sam-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # A check stops the harmony: the batucada break.
        rule('sam-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 2)]),
        rule('sam-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('sam-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('reverb', .3)]),
        # Quiet play: the cavaquinho solo.
        rule('sam-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('sam-tension', 'tension', 'both', 1, True, [act('lpf', 2200, rampBars=4)], 'lead'),
        rule('sam-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('gain', 3)]),
        rule('sam-hanging', 'hangingPiece', 'actor', 1, True, [act('gain', 5)], 'fx'),
        rule('sam-drought', 'captureDrought', 'both', 1, True, [act('gain', -3), act('reverb', .25)]),
    ])),
    'reference': 'Samba do Estácio dos anos 1930 (Ismael Silva, Bide, Noel Rosa, Cartola): referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/Samba',
}
write('rio-1930', profile)
