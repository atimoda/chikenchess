"""Rio de Janeiro 1910 · choro (original material).

A regional of the Cidade Nova: the flute sings the melody in running sixteenths,
the cavaquinho chops the centre, the seven-string guitar walks the bass and
answers each phrase with a baixaria, the bandolim plays a counter-line and the
pandeiro holds the 2/4 with its thumb, slap and jingles. A salon piano in the
spirit of Ernesto Nazareth comps on the king. D harmonic minor, so the dominant
A7 and the diminished C#°7 that choro loves are in the scale.
Form: Intro on the dominant · A · baixaria interlude · B (Bb) · bandolim solo on A · A with everyone.
Degrees (D harmonic minor): 0 D · 1 E · 2 F · 3 G · 4 A · 5 Bb · 6 C# · 7 D'.
"""
from brkit import act, arrangement, bars, brasil, comp, hits, line, over, part, reactions, recorded, rule, samba, lasting_safe, write

S = 8  # sixteenths per 2/4 bar
A = ('Dm', 'Dm', 'A7', 'A7', 'Gm', 'Dm', 'A7', 'Dm')
B = ('Bb', 'Bb', 'Gm', 'Gm', 'C#o', 'Dm', 'A7', 'Dm')
INTRO = ('A7', 'A7', 'Dm', 'A7')
CAVACO = {'Dm': '0,2,4', 'A7': '1,3,4,6', 'Gm': '3,5,7', 'Bb': '2,5,7', 'C#o': '1,3,5,6'}
PIANO = {'Dm': '0,2,4,7', 'A7': '-1,1,3,4', 'Gm': '-4,-2,0,3', 'Bb': '-2,0,2,5', 'C#o': '-1,1,3,5'}
ROOT = {'Dm': 0, 'A7': -3, 'Gm': -4, 'Bb': -2, 'C#o': -1}
FIFTH = {'Dm': -3, 'A7': 1, 'Gm': 0, 'Bb': 2, 'C#o': 3}
BAIXARIA = {'Dm': '4 3 2 1 0 -1 -2 -3', 'A7': '1 0 -1 -2 -3 -4 -5 -4', 'Gm': '0 -1 -2 -3 -4 -3 -2 -1',
            'Bb': '2 1 0 -1 -2 -1 0 1', 'C#o': '-1 1 3 1 -1 -2 -3 -4'}

MEL_A = ['7 6 7 4 2 4 0 2', '4 2 0 -1 0 2 4 7', '6 4 3 1 -1 1 3 4', '6 . 7 6 4 . 3 .',
         '3 5 7 10 9 7 5 3', '9 7 4 2 0 2 4 2', '1 -1 1 3 6 4 3 1', '0 . 4 . 0 . . .']
MEL_B = ['5 . 7 9 12 9 7 5', '4 5 7 . 9 . 7 .', '3 5 7 10 . 7 5 3', '2 3 5 . 3 . 2 1',
         '6 8 10 12 10 8 6 3', '4 2 0 2 4 7 9 7', '6 4 3 1 -1 1 3 6', '7 . . . 0 . . .']
# The bandolim's own improvised A: arpeggios and tremolo-like repeated notes.
SOLO = ['4 4 7 7 9 9 7 4', '2 4 7 4 2 0 2 4', '6 6 8 8 6 4 3 1', '4 . 3 . 1 . -1 .',
        '5 5 7 7 10 7 5 3', '4 7 9 11 9 7 4 2', '3 1 -1 1 3 4 6 8', '7 . 7 . 0 . . .']
COUNTER_A = ['. . . . 2 . 4 .', '7 . . . 6 . 4 .', '. . . . 3 . 4 .', '6 . . . 4 . 3 .',
             '. . . . 5 . 7 .', '4 . . . 2 . 0 .', '. . . . 1 . 3 .', '2 . . . . . . .']
COUNTER_B = ['. . . . 7 . 9 .', '9 . . . 7 . 5 .', '. . . . 5 . 7 .', '5 . . . 3 . 2 .',
             '. . . . 8 . 6 .', '4 . . . 2 . 4 .', '. . . . 3 . 1 .', '4 . . . . . . .']


def mel(lines):
    return bars(*(line(text, S) for text in lines))


def bass(chord, run=False):
    if run:
        return BAIXARIA[chord]
    return f'{ROOT[chord]}! . . . {FIFTH[chord]} . . {ROOT[chord]}\''


def walk(chords):
    """Root and fifth, with the baixaria on every fourth bar (the phrase ends)."""
    return bars(*(bass(c, run=(i % 4 == 3)) for i, c in enumerate(chords)))


def cavaco(chords, rhythm='X.xg .x.x'):
    return over(chords, lambda c: comp(CAVACO[c], rhythm))


def piano(chords, rhythm):
    return over(chords, lambda c: comp(PIANO[c], rhythm))


def drum(pattern, n=1):
    return hits(pattern * n, steps=S)


ALL = (True,) * 6
parts = [
    # a1 · rook: the seven-string's low bass (rooted), the floor of the regional.
    part('bass', 'Violão 7 cordas · bordão', 'phrase', recorded('guitars', 'nylon'), [
        walk(INTRO), walk(A), walk(('Dm', 'A7', 'Dm', 'A7')), walk(B), walk(A), walk(A),
    ], [4, 8, 4, 8, 8, 8], octave=2, gain=0.458, attack=.004, decay=.5, sustain=.3, release=.2, gate=.7, lpf=2600, hpf=40,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .1}, effects={'reverb': .12, 'pan': -.1}),
    # a2 · pawn: pandeiro thumb (grave).
    part('rhythm', 'Pandeiro · grave', 'pulse', brasil('pandeiro-grave'), [
        drum('X... ....'), drum('X... x..x'), drum('X... ....'), drum('X... x..x'), drum('X..x x...'), drum('X..x x..x'),
    ], [1] * 6, gain=0.355, clip=.8, lpf=4000, hpf=60, effects={'reverb': .08, 'pan': 0}),
    # b1 · knight: bandolim counter-line, the solo in the fifth section.
    part('response', 'Bandolim · contracanto', 'phrase', brasil('bandolim', True), [
        mel(COUNTER_A[4:]), mel(COUNTER_A), mel(COUNTER_A[:4]), mel(COUNTER_B), mel(SOLO), mel(COUNTER_A),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.49, attack=.002, decay=.5, sustain=.2, release=.2, gate=.8, lpf=8000, hpf=180,
        arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .18, 'pan': .3}),
    # b2 · pawn: pandeiro slap.
    part('rhythm', 'Pandeiro · tapa', 'pulse', brasil('pandeiro-tapa'), [
        drum('.... ..x.'), drum('.... ..X.'), drum('.... ..x.'), drum('..x. ..X.'), drum('.... ..X.'), drum('..x. ..Xx'),
    ], [1] * 6, gain=0.204, clip=.8, lpf=9000, hpf=150, effects={'reverb': .08, 'pan': .05},
        arrangement=arrangement((False, True, True, True, True, True))),
    # c1 · bishop: six-string guitar chords, arpeggiated in the B part.
    part('harmony', 'Violão 6 cordas · harmonia', 'phrase', recorded('guitars', 'nylon'), [
        over(INTRO, lambda c: comp(CAVACO[c], 'x... x...')), over(A, lambda c: comp(CAVACO[c], '..x. ..x.')), over(('Dm', 'A7', 'Dm', 'A7'), lambda c: comp(CAVACO[c], 'x... ....')),
        over(B, lambda c: comp(CAVACO[c], 'x.x. ..x.')), over(A, lambda c: comp(CAVACO[c], '..x. ..x.')), over(A, lambda c: comp(CAVACO[c], 'x.x. ..x.')),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=0.174, attack=.004, decay=.4, sustain=.25, release=.2, gate=.55, lpf=5000, hpf=120,
        mapping={'fileDegrees': 0}, effects={'reverb': .15, 'pan': -.3}),
    # c2 · pawn: pandeiro jingles, the sixteenth motor with the accent on the last of each beat.
    part('rhythm', 'Pandeiro · platinelas', 'pulse', brasil('pandeiro-platinela'), [
        drum('gxgX gxgX'), drum('gxgX gxgX'), drum('g.gX g.gX'), drum('gxgX gxgX'), drum('gxgX gxgX'), drum('gxgX gxgX'),
    ], [1] * 6, gain=0.307, clip=.7, lpf=12000, hpf=2500, effects={'reverb': .06, 'pan': .12}),
    # d1 · queen: the flute melody.
    part('melody', 'Flauta · melodia', 'phrase', recorded('classical', 'flute-sustain'), [
        mel(MEL_A[4:]), mel(MEL_A), mel(['. . . . . . . .'] * 3 + ['. . . . 1 3 4 6']), mel(MEL_B), mel(MEL_A[:4] + MEL_A[4:]), mel(MEL_A),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.833, attack=.012, decay=.3, sustain=.7, release=.12, gate=.85, lpf=9000, hpf=250,
        arrangement=arrangement((False, True, True, True, False, True)), effects={'reverb': .2, 'pan': 0}),
    # d2 · pawn: cavaquinho centre.
    part('harmony', 'Cavaquinho · centro', 'phrase', brasil('cavaquinho', True), [
        cavaco(INTRO, 'X.x. X.x.'), cavaco(A), cavaco(('Dm', 'A7', 'Dm', 'A7'), 'X... ....'), cavaco(B, 'X.xx .x.x'), cavaco(A), cavaco(A, 'X.xx .xxx'),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.258, attack=.002, decay=.25, sustain=.1, release=.08, gate=.4, lpf=9000, hpf=300,
        mapping={'fileDegrees': 0}, effects={'reverb': .1, 'pan': .2}),
    # e1 · king: salon piano, Nazareth-style left-hand maxixe and chords.
    part('harmony', 'Piano de salão', 'phrase', recorded('band', 'piano'), [
        piano(INTRO, 'x... ....'), piano(A, '..x. x...'), piano(('Dm', 'A7', 'Dm', 'A7'), 'x... ....'), piano(B, '..x. x.x.'), piano(A, '..x. ....'), piano(A, '..x. x.x.'),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=.14, attack=.003, decay=.6, sustain=.3, release=.3, gate=.5, lpf=6000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, False, True), restart=False), effects={'reverb': .2, 'pan': -.2}),
    # e2 · pawn: ganzá sixteenths.
    part('rhythm', 'Ganzá', 'pulse', brasil('ganza'), [
        drum('x.x. x.x.'), drum('gxgx gxgX'), drum('x... x...'), drum('gxgx gxgX'), drum('gxgx gxgX'), drum('gXgx gXgX'),
    ], [1] * 6, gain=0.261, clip=.7, lpf=13000, hpf=3500, effects={'reverb': .04, 'pan': -.25},
        arrangement=arrangement((False, True, False, True, True, True))),
    # f1 · bishop: the seven-string baixaria answering the phrase ends (the interlude is its solo).
    part('response', 'Violão 7 cordas · baixaria', 'phrase', recorded('guitars', 'nylon'), [
        bars(*([' '.join(['.'] * S)] * 3), BAIXARIA['A7']),
        bars(*([' '.join(['.'] * S)] * 3), BAIXARIA['A7'], *([' '.join(['.'] * S)] * 3), BAIXARIA['Dm']),
        bars(BAIXARIA['Dm'], BAIXARIA['A7'], '0 2 4 2 0 -1 -3 -1', BAIXARIA['A7']),
        bars(*([' '.join(['.'] * S)] * 3), BAIXARIA['Gm'], *([' '.join(['.'] * S)] * 3), BAIXARIA['Dm']),
        bars(*([' '.join(['.'] * S)] * 3), BAIXARIA['A7'], *([' '.join(['.'] * S)] * 3), BAIXARIA['Dm']),
        bars(*([' '.join(['.'] * S)] * 3), BAIXARIA['A7'], ' '.join(['.'] * S), BAIXARIA['Dm'], ' '.join(['.'] * S), BAIXARIA['Dm']),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=.32, attack=.003, decay=.35, sustain=.3, release=.15, gate=.75, lpf=4500, hpf=70,
        mapping={'fileDegrees': 0}, effects={'reverb': .14, 'pan': -.15}),
    # f2 · pawn: reco-reco on the second beat.
    part('rhythm', 'Reco-reco', 'pulse', brasil('reco-reco'), [
        drum('.... x...'), drum('.... x.x.'), drum('.... x...'), drum('..x. x.x.'), drum('.... x...'), drum('..x. x.x.'),
    ], [1] * 6, gain=0.327, clip=.6, lpf=9000, hpf=1500, effects={'reverb': .05, 'pan': .3},
        arrangement=arrangement((False, False, True, True, True, True))),
    # g1 · knight: trombone counter-melody of the old choro bands, in the B part and the finale.
    part('response', 'Trombone · contraponto', 'sustain', samba('trombone', True), [
        mel(['-3 . . . . . . .', '. . . . . . . .', '0 . . . . . . .', '-1 . . . . . . .']),
        mel(['0 . . . . . . .', '-1 . . . . . . .', '-3 . . . . . . .', '-2 . -3 . -4 . . .', '-4 . . . . . . .', '0 . . . . . . .', '-3 . . . -1 . . .', '0 . . . . . . .']),
        mel(['0 . . . . . . .', '-3 . . . . . . .', '0 . . . . . . .', '-3 . . . . . . .']),
        mel(['-2 . . . 0 . . .', '2 . . . . . . .', '-4 . . . -2 . . .', '0 . -1 . -2 . -3 .', '-1 . . . 1 . . .', '0 . . . . . . .', '-3 . . . -1 . . .', '0 . . . . . . .']),
        mel(['0 . . . . . . .', '-1 . . . . . . .', '-3 . . . . . . .', '-2 . -3 . -4 . . .', '-4 . . . . . . .', '0 . . . . . . .', '-3 . . . -1 . . .', '0 . . . . . . .']),
        mel(['0 . . . 2 . . .', '-1 . . . 1 . . .', '-3 . . . -1 . . .', '-2 . -3 . -4 . . .', '-4 . . . -2 . . .', '0 . . . 2 . . .', '-3 . . . -1 . . .', '0 . . . . . . .']),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=0.269, attack=.01, decay=.4, sustain=.6, release=.15, gate=.9, lpf=4000, hpf=90,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .2, 'pan': .25}),
    # g2 · pawn: second guitar's offbeat chops (the 'batida' under the flute).
    part('harmony', 'Violão · batida', 'phrase', recorded('guitars', 'nylon'), [
        over(INTRO, lambda c: comp(CAVACO[c], '.... x...')), over(A, lambda c: comp(CAVACO[c], '.x.. .x.x')), over(('Dm', 'A7', 'Dm', 'A7'), lambda c: comp(CAVACO[c], '.... x...')),
        over(B, lambda c: comp(CAVACO[c], '.x.x .x.x')), over(A, lambda c: comp(CAVACO[c], '.x.. .x.x')), over(A, lambda c: comp(CAVACO[c], '.x.x .x.x')),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=0.204, attack=.004, decay=.2, sustain=.1, release=.1, gate=.3, lpf=4500, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .1, 'pan': .35}),
    # h1 · rook: second flute (the 'flautim' an octave up) doubling the peaks.
    part('melody', 'Flautim · dobra', 'phrase', recorded('classical', 'flute-sustain', 1), [
        mel(MEL_A[6:] + MEL_A[6:]), mel(MEL_A), mel(MEL_A[4:]), mel(MEL_B), mel(MEL_A), mel(MEL_A),
    ], [4, 8, 4, 8, 8, 8], octave=5, gain=0.256, attack=.012, decay=.3, sustain=.7, release=.12, gate=.8, lpf=10000, hpf=400,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .25, 'pan': -.3}),
    # h2 · pawn: jingle roll fills into each section (a soft ghost elsewhere, the roll on the last bar).
    part('rhythm', 'Pandeiro · rufo', 'pulse', brasil('pandeiro-platinela'), [
        drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('rrrr RRRR'),
    ], [1] * 6, gain=0.331, clip=.7, lpf=12000, hpf=2500, effects={'reverb': .1, 'pan': -.1},
        arrangement=arrangement((True, True, True, True, True, False), fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Rio de Janeiro 1910 · Choro da Cidade Nova', 'bpm': 112, 'meter': '2/4', 'root': 'D', 'scale': 'Harmônica menor', 'harmony': 'static',
    'swing': 0, 'sections': [8, 32, 8, 32, 32, 32], 'sectionLabels': ['Intro', 'Verse', 'Interlude', 'Chorus', 'Solo', 'Chorus'],
    'parts': parts,
    'reactions': reactions(lasting_safe([
        rule('cho-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('cho-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        # The endgame is the last A with the whole regional and a slight push.
        rule('cho-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('bpm', 4, rampBars=4), act('gain', 4)]),
        rule('cho-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # A check is answered like a phrase end: the seven-string's baixaria interlude.
        rule('cho-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 2)]),
        rule('cho-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('cho-queen', 'queenCapture', 'both', 4, True, [act('variation', 4), act('reverb', .35)]),
        # Quiet manoeuvring: the bandolim takes a chorus.
        rule('cho-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('cho-tension', 'tension', 'both', 1, True, [act('lpf', 2500, rampBars=4)], 'pad'),
        rule('cho-swing', 'evalSwing', 'actor', 2, True, [act('variation', 3), act('gain', 3)]),
        rule('cho-promotion', 'promotion', 'actor', 2, True, [act('transpose', 12), act('variation', 5)], 'lead'),
        rule('cho-drought', 'captureDrought', 'both', 1, True, [act('reverb', .3), act('gain', -2)]),
    ])),
    'reference': 'Choro carioca do início do século XX (Pixinguinha, Ernesto Nazareth, Chiquinha Gonzaga, Callado): referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/Choro',
}
write('rio-1910', profile)
