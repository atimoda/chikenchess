"""Recife 1950 · baião pé de serra (original material).

The northeastern trio as Luiz Gonzaga shaped it: the sanfona sings the tune and
works its bass buttons, the zabumba plays the baião cell (maceta on the one and
the last sixteenth of the beat, the bacalhau whipping the offbeats) and the
triangle keeps the sixteenths, choked and open. An aboio — the sung cattle call —
opens the song, a pífano answers like the bands of Caruaru. G Mixolydian: the
flat seventh (F) is the sertão's colour.
Form: aboio intro · A · zabumba break · B · pífano interlude · B with everyone.
Degrees (G Mixolydian): 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F · 7 G'.
"""
from brkit import act, arrangement, bars, brasil, comp, hits, line, over, part, reactions, recorded, rule, samba, shift, lasting_safe, write

S = 8
A = ('G', 'G', 'C', 'G', 'G', 'G', 'F', 'G')
B = ('C', 'C', 'G', 'G', 'F', 'F', 'G', 'G')
VAMP = ('G', 'F', 'G', 'G')
CHORD = {'G': '0,2,4', 'C': '-4,-2,0', 'F': '-1,1,3'}
ROOT = {'G': 0, 'C': 3, 'F': 6}
FIFTH = {'G': 4, 'C': 0, 'F': 3}
REST = ' '.join(['.'] * S)
MEL_A = ['4 . 4 . 2 4 . 6', '. 4 . 2 0 . . .', '3 . 3 . 5 3 . 2', '. 0 . 2 4 . . .',
         '7 . 7 . 6 4 . 2', '. 4 . 6 7 . 6 .', '5 . 6 . 5 3 . 1', '. 0 . . 0 . . .']
MEL_B = ['7 . 7 . 8 7 . 5', '3 . 5 . 7 . . .', '6 . 6 . 7 6 . 4', '2 . 4 . 6 . . .',
         '5 . 5 . 6 5 . 3', '1 . 3 . 5 . 6 .', '7 6 4 2 4 . 2 1', '0 . . . . . . .']
FIFE = ['7 9 7 6 4 . . .', '4 6 7 9 . . . .', '8 7 5 3 . . . .', '4 . 2 . 0 . . .',
        '9 11 9 7 6 . . .', '6 7 9 11 . . . .', '10 9 8 6 . . . .', '7 . . . 7 . . .']
ABOIO = ['7_ . . . . . . .', '. . . . 6 . 4 .', '4_ . . . . . . .', '. . . . . . . .']


def mel(lines):
    return bars(*(line(text, S) for text in lines))


def baixos(chords, rhythm='X..x ..x.'):
    """Sanfona bass buttons: root on the zabumba cell, fifth on the second beat's offbeat."""
    return over(chords, lambda c: ' '.join('.' if ch == '.' else (f'{ROOT[c]}!' if ch == 'X' else str(ROOT[c] if i < 4 else FIFTH[c]))
                                           for i, ch in enumerate(rhythm.replace(' ', ''))))


def chords(progression, rhythm):
    return over(progression, lambda c: comp(CHORD[c], rhythm))


def drum(pattern):
    return hits(pattern, steps=S)


parts = [
    # a1 · rook: the sanfona's bass buttons.
    part('bass', 'Sanfona · baixos', 'phrase', brasil('sanfona', True), [
        baixos(VAMP), baixos(A), baixos(VAMP, 'X..x ....'), baixos(B), baixos(A), baixos(B),
    ], [4, 8, 4, 8, 8, 8], octave=2, gain=0.759, attack=.01, decay=.25, sustain=.4, release=.08, gate=.45, lpf=1600, hpf=40,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .1}, effects={'reverb': .1, 'pan': -.05},
        arrangement=arrangement((False, True, True, True, True, True))),
    # a2 · pawn: zabumba maceta, the baião cell.
    part('rhythm', 'Zabumba · maceta', 'pulse', brasil('zabumba'), [
        drum('X... ....'), drum('X..x ....'), drum('X..x ..X.'), drum('X..x ....'), drum('X..x ....'), drum('X..x ..x.'),
    ], [1] * 6, gain=0.356, clip=.8, lpf=3500, hpf=35, mapping={'panWidth': 0}, effects={'reverb': .06, 'pan': 0}),
    # b1 · knight: the aboio, sung over the intro and the break.
    part('texture', 'Aboio', 'phrase', brasil('coro-laia', True), [
        mel(ABOIO), mel(ABOIO * 2), mel(ABOIO), mel(ABOIO * 2), mel(ABOIO * 2), mel(ABOIO * 2),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=.16, attack=.08, decay=.5, sustain=.8, release=.4, gate=.95, lpf=5000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, False, False, False), restart=False), effects={'reverb': .45, 'pan': .2}),
    # b2 · pawn: bacalhau on the offbeats.
    part('rhythm', 'Zabumba · bacalhau', 'pulse', brasil('bacalhau'), [
        drum('..x. ..x.'), drum('..x. x.x.'), drum('.xx. x.xx'), drum('..x. x.x.'), drum('..x. x.x.'), drum('.xx. x.xx'),
    ], [1] * 6, gain=0.413, clip=.6, lpf=9000, hpf=300, effects={'reverb': .05, 'pan': .1},
        arrangement=arrangement((False, True, True, True, True, True))),
    # c1 · bishop: the pífano answering the sanfona.
    part('response', 'Pífano', 'phrase', recorded('classical', 'flute-sustain', 1), [
        mel(FIFE[4:]), mel([REST, REST, REST, '. . . . 4 6 7 .'] * 2), mel(FIFE[:4]), mel([REST, REST, REST, '. . . . 6 7 9 .'] * 2), mel(FIFE), mel(FIFE),
    ], [4, 8, 4, 8, 8, 8], octave=5, gain=0.34, attack=.01, decay=.3, sustain=.7, release=.1, gate=.8, lpf=10000, hpf=500,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .2, 'pan': .35}),
    # c2 · pawn: triangle, choked sixteenths.
    part('rhythm', 'Triângulo · fechado', 'pulse', brasil('triangulo-fechado'), [
        drum('x.x. x.x.'), drum('xx.x xx.x'), drum('xx.x xx.x'), drum('xx.x xx.x'), drum('xx.x xx.x'), drum('xX.x xX.x'),
    ], [1] * 6, gain=0.15, clip=.5, lpf=12000, hpf=2500, effects={'reverb': .05, 'pan': -.3}),
    # d1 · queen: the sanfona tune.
    part('melody', 'Sanfona · melodia', 'phrase', brasil('sanfona', True), [
        mel(MEL_A[4:]), mel(MEL_A), mel([REST] * 3 + ['. . . . 2 . 4 .']), mel(MEL_B), mel(MEL_A), mel(MEL_B),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.429, attack=.015, decay=.3, sustain=.7, release=.08, gate=.8, lpf=6000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, False, True)), effects={'reverb': .15, 'pan': 0}),
    # d2 · pawn: ganzá.
    part('rhythm', 'Ganzá', 'pulse', brasil('ganza'), [
        drum('x.x. x.x.'), drum('gxgx gxgx'), drum('gxgx gxgx'), drum('gxgx gxgx'), drum('gxgx gxgx'), drum('gXgx gXgx'),
    ], [1] * 6, gain=0.341, clip=.6, lpf=12000, hpf=3500, effects={'reverb': .04, 'pan': .3},
        arrangement=arrangement((False, False, True, True, True, True))),
    # e1 · king: the sanfona's right-hand chords between the phrases.
    part('harmony', 'Sanfona · acordes', 'phrase', brasil('sanfona', True), [
        chords(VAMP, '..x. ..x.'), chords(A, '..x. .x..'), chords(VAMP, 'x... ....'), chords(B, '..x. .x.x'), chords(A, '..x. .x..'), chords(B, '..x. .x.x'),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=0.258, attack=.01, decay=.2, sustain=.3, release=.06, gate=.35, lpf=4500, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True), restart=False), effects={'reverb': .12, 'pan': -.2}),
    # e2 · pawn: pandeiro of the forró floor.
    part('rhythm', 'Pandeiro', 'pulse', brasil('pandeiro-platinela'), [
        drum('...x ...x'), drum('g..x g..x'), drum('gxgX gxgX'), drum('g..x g..x'), drum('g..x g..x'), drum('gxgX gxgX'),
    ], [1] * 6, gain=0.317, clip=.6, lpf=12000, hpf=2500, effects={'reverb': .05, 'pan': .2},
        arrangement=arrangement((False, False, True, True, False, True))),
    # f1 · bishop: the triangle's open ring on the offbeats.
    part('rhythm', 'Triângulo · aberto', 'pulse', brasil('triangulo-aberto'), [
        drum('..x. ..x.'), drum('..x. ..x.'), drum('..x. ..x.'), drum('..x. ..x.'), drum('..x. ..x.'), drum('..X. ..X.'),
    ], [1] * 6, gain=0.132, clip=.35, lpf=12000, hpf=2500, effects={'reverb': .1, 'pan': -.35}),
    # f2 · pawn: palmas of the forró.
    part('rhythm', 'Palmas', 'pulse', brasil('palmas'), [
        drum('.... x...'), drum('.... x...'), drum('x... x...'), drum('.... x...'), drum('.... x...'), drum('x... x...'),
    ], [1] * 6, gain=0.356, clip=.6, lpf=8000, hpf=400, effects={'reverb': .2, 'pan': .25},
        arrangement=arrangement((False, False, True, True, False, True))),
    # g1 · knight: a second sanfona voice a third below in the refrains.
    part('response', 'Sanfona · segunda voz', 'phrase', brasil('sanfona', True), [
        mel([shift(x, -2) for x in MEL_A[4:]]), mel([shift(x, -2) for x in MEL_A]), mel([REST] * 3 + ['. . . . 0 . 2 .']),
        mel([shift(x, -2) for x in MEL_B]), mel([shift(x, -2) for x in MEL_A]), mel([shift(x, -2) for x in MEL_B]),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.227, attack=.015, decay=.3, sustain=.7, release=.08, gate=.8, lpf=5000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .15, 'pan': .2}),
    # g2 · pawn: agogô, a light metal tick of the city bands.
    part('rhythm', 'Agogô', 'pulse', samba('agogo-agudo'), [
        drum('x... ....'), drum('x..x ..x.'), drum('x..x ..x.'), drum('x..x ..x.'), drum('x... ..x.'), drum('x..x ..x.'),
    ], [1] * 6, gain=0.17, clip=.5, lpf=9000, hpf=800, effects={'reverb': .08, 'pan': -.15},
        arrangement=arrangement((False, False, False, True, True, True))),
    # h1 · rook: the zabumba's open second-beat boom in the refrains.
    part('rhythm', 'Zabumba · resposta', 'pulse', brasil('zabumba'), [
        drum('.... X...'), drum('.... ..x.'), drum('.... X.x.'), drum('.... ..x.'), drum('.... ..x.'), drum('.... X.x.'),
    ], [1] * 6, gain=0.354, clip=.8, lpf=3000, hpf=35, mapping={'panWidth': 0}, effects={'reverb': .08, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True))),
    # h2 · pawn: zabumba rolls into each section.
    part('rhythm', 'Zabumba · repique', 'pulse', brasil('bacalhau'), [
        drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('xxxx XXXX'),
    ], [1] * 6, gain=0.306, clip=.6, lpf=9000, hpf=300, effects={'reverb': .06, 'pan': -.1},
        arrangement=arrangement(variations=(0, 1, 2, 3, 4, 0), fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Recife 1950 · Baião pé de serra', 'bpm': 108, 'meter': '2/4', 'root': 'G', 'scale': 'Mixolídia', 'harmony': 'static',
    'swing': 0, 'sections': [8, 32, 8, 32, 32, 32], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions(lasting_safe([
        rule('bai-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('bai-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('bai-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('bpm', 6, rampBars=8), act('gain', 4)]),
        rule('bai-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # A check stops the sanfona: zabumba and triangle alone with the aboio.
        rule('bai-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 2)]),
        rule('bai-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('bai-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('reverb', .4)]),
        # Quiet play: the pífano takes the tune.
        rule('bai-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        # Tension: the sanfona's bellows close (the filter shuts on the reeds).
        rule('bai-tension', 'tension', 'both', 1, True, [act('lpf', 1800, rampBars=4)], 'lead'),
        rule('bai-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('gain', 3)]),
        rule('bai-pawn', 'advancedPawn', 'actor', 1, True, [act('transpose', 2)], 'lead'),
        rule('bai-drought', 'captureDrought', 'both', 1, True, [act('reverb', .3), act('gain', -2)]),
    ])),
    'reference': 'Baião pé de serra (Luiz Gonzaga, Humberto Teixeira, Jackson do Pandeiro, bandas de pífanos): referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/Bai%C3%A3o_(g%C3%AAnero_musical)',
}
write('recife-1950', profile)
