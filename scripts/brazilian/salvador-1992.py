"""Salvador 1992 · samba-reggae (original material).

A bloco-afro in the Pelourinho: the surdos interlock (fundo on one and three,
meio on two and four, the dobra and the viradeira turning between them), the
caixas play the samba-reggae's clave-like rimshot figure, the repique calls the
entries and breaks, timbau and chocalho fill, an electric bass and a reggae
guitar sit on the groove, the trumpets call and the trombones reply, and the
crowd sings the refrain. G Mixolydian, the I–bVII sway of the genre.
Form: repique call intro · verse (horns) · repique break · refrain (coro) ·
bateria alone · refrain with everyone.
Degrees (G Mixolydian): 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F · 7 G'.
"""
from brkit import act, arrangement, bars, brasil, comp, hits, line, over, part, reactions, recorded, rule, samba, shift, lasting_safe, write

S = 16
VERSE = ('G', 'F', 'G', 'F')
REFRAIN = ('C', 'G', 'F', 'G')
CHORD = {'G': '0,2,4', 'F': '-1,1,3', 'C': '-4,-2,0'}
ROOT = {'G': 0, 'F': -1, 'C': -4}
REST = ' '.join(['.'] * S)
HORN_VERSE = ['. . . . . . . . 7 . 7 . 6 4 . .', '2 . . 4 . . 6 . 4 . . . . . . .', '. . . . . . . . 7 . 7 . 9 7 . .', '6 . . 4 . . 3 . 1 . . . . . . .']
TROMBONE = ['0 . . . . . . . . . . . . . . .', '. . . . -1 . -1 . -3 . . . . . . .', '0 . . . . . . . . . . . . . . .', '. . . . -1 . -3 . -5 . . . . . . .']
COROS = ['4 . . 4 . . 4 . 5 . 4 . 2 . . .', '1 . . 1 . . 1 . 2 . 1 . 0 . . .', '4 . . 4 . . 4 . 5 . 7 . 6 . . .', '4 . . 2 . . 1 . 0 . . . . . . .']


def mel(lines):
    return bars(*(line(text, S) for text in lines))


def bass(chords, shape='R... ..R. ..R. R..r'):
    return over(chords, lambda c: ' '.join('.' if ch == '.' else (f'{ROOT[c]}!' if ch == 'R' else f"{ROOT[c] + 4}'") for ch in shape.replace(' ', '')))


def skank(chords, rhythm='..x. ..x. ..x. ..x.'):
    return over(chords, lambda c: comp(CHORD[c], rhythm))


def drum(pattern):
    return hits(pattern, steps=S)


CAIXA = 'x..x ..x. ..x. x...'
parts = [
    # a1 · rook: trombone replies.
    part('response', 'Trombone · resposta', 'phrase', samba('trombone', True), [
        mel(TROMBONE), mel(TROMBONE), mel(TROMBONE[:2] * 2), mel([shift(x, 3) for x in TROMBONE]), mel(TROMBONE), mel([shift(x, 3) for x in TROMBONE]),
    ], [4] * 6, octave=3, gain=.2, attack=.006, decay=.3, sustain=.5, release=.1, gate=.6, lpf=4500, hpf=80,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True)), effects={'reverb': .18, 'pan': -.3}),
    # a2 · pawn: surdo fundo, one and three.
    part('rhythm', 'Surdo fundo', 'pulse', samba('surdo-fundo'), [
        drum('X... .... X... ....'), drum('X... .... X... ....'), drum('X... .... X... ....'), drum('X... .... X... ....'), drum('X... .... X... ....'), drum('X... .... X... ....'),
    ], [1] * 6, gain=.4, clip=.9, lpf=2500, hpf=30, mapping={'panWidth': 0}, effects={'reverb': .06, 'pan': -.05}),
    # b1 · knight: trumpets' call.
    part('melody', 'Trompete · chamada', 'phrase', samba('trompete', True), [
        mel(HORN_VERSE), mel(HORN_VERSE), mel(HORN_VERSE[:2] * 2), mel([REST, REST, REST, '. . . . . . . . 7 . 7 . 6 4 . .']), mel(HORN_VERSE), mel(HORN_VERSE),
    ], [4] * 6, octave=4, gain=.24, attack=.006, decay=.3, sustain=.6, release=.1, gate=.75, lpf=8000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True)), effects={'reverb': .18, 'pan': .2}),
    # b2 · pawn: surdo meio, two and four.
    part('rhythm', 'Surdo meio', 'pulse', samba('surdo-meio'), [
        drum('.... X... .... X...'), drum('.... X... .... X...'), drum('.... X... .... X...'), drum('.... X... .... X...'), drum('.... X... .... X...'), drum('.... X... .... X...'),
    ], [1] * 6, gain=.34, clip=.9, lpf=2800, hpf=35, mapping={'panWidth': 0}, effects={'reverb': .06, 'pan': .05}),
    # c1 · bishop: repique, calls and the break solo.
    part('rhythm', 'Repique · chamada', 'pulse', samba('repinique'), [
        drum('X.x. X.x. XxXx X...'), drum('.... .... .... x.xx'), drum('X.xx .xX. x.xX .XXX'), drum('.... .... ..x. x.xx'), drum('x.x. .x.x ..x. x.x.'), drum('..x. .x.. ..x. x.xx'),
    ], [1] * 6, gain=.2, clip=.8, lpf=9000, hpf=200, effects={'reverb': .1, 'pan': -.25}),
    # c2 · pawn: caixa, the samba-reggae rimshot figure.
    part('rhythm', 'Caixa', 'pulse', samba('caixa'), [
        drum('.... .... .... x.xx'), drum(CAIXA), drum('x... x... x... x...'), drum('x..x ..x. ..x. x.x.'), drum(CAIXA), drum('x..x ..x. ..x. x.xx'),
    ], [1] * 6, gain=.18, clip=.6, lpf=10000, hpf=250, effects={'reverb': .08, 'pan': .2},
        arrangement=arrangement((False, True, True, True, True, True))),
    # d1 · queen: the crowd's refrain.
    part('melody', 'Coro · refrão', 'phrase', brasil('coro-laia', True), [
        mel(COROS), mel(COROS), mel(COROS[:2] * 2), mel(COROS), mel(COROS), mel(COROS),
    ], [4] * 6, octave=4, gain=.24, attack=.03, decay=.4, sustain=.75, release=.2, gate=.9, lpf=6000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .3, 'pan': 0}),
    # d2 · pawn: surdo dobra between the two.
    part('rhythm', 'Surdo dobra', 'pulse', samba('surdo-viradeira'), [
        drum('.... .... .... ..xx'), drum('..x. ..xx ..x. ..x.'), drum('..x. ..xx ..x. ..xx'), drum('..x. ..xx ..x. ..x.'), drum('..x. ..xx ..x. ..xx'), drum('..x. ..xx ..x. ..xx'),
    ], [1] * 6, gain=.26, clip=.8, lpf=3500, hpf=40, effects={'reverb': .06, 'pan': .15}),
    # e1 · king: reggae guitar on the offbeats.
    part('harmony', 'Guitarra · contratempo', 'phrase', recorded('guitars', 'muted'), [
        skank(VERSE), skank(VERSE), skank(VERSE, '..x. .... ..x. ....'), skank(REFRAIN), skank(VERSE), skank(REFRAIN, '..x. ..xx ..x. ..x.'),
    ], [4] * 6, octave=3, gain=.14, attack=.003, decay=.2, sustain=.1, release=.08, gate=.3, lpf=5000, hpf=250,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True), restart=False), effects={'reverb': .15, 'pan': .3}),
    # e2 · pawn: timbau.
    part('rhythm', 'Timbau', 'pulse', samba('timbau'), [
        drum('x..x .x.. x..x .x..'), drum('x..x .x.. x..x .xxx'), drum('x..x .x.x x..x .xxx'), drum('x..x .x.. x..x .xxx'), drum('xx.x .x.x xx.x .xxx'), drum('x..x .x.x x..x .xxx'),
    ], [1] * 6, gain=.16, clip=.7, lpf=8000, hpf=150, effects={'reverb': .08, 'pan': -.15},
        arrangement=arrangement((False, True, False, True, True, True))),
    # f1 · bishop: electric bass.
    part('bass', 'Baixo elétrico', 'phrase', recorded('guitars', 'bass'), [
        bass(VERSE), bass(VERSE), bass(VERSE, 'R... .... R... ....'), bass(REFRAIN), bass(VERSE, 'R... .... R... ....'), bass(REFRAIN),
    ], [4] * 6, octave=2, gain=.36, attack=.005, decay=.4, sustain=.4, release=.15, gate=.7, lpf=1600, hpf=35,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .1}, effects={'reverb': .05, 'pan': 0},
        arrangement=arrangement((False, True, False, True, True, True))),
    # f2 · pawn: chocalho.
    part('rhythm', 'Chocalho', 'pulse', samba('chocalho'), [
        drum('x.x. x.x. x.x. x.x.'), drum('gxgX gxgX gxgX gxgX'), drum('x.x. x.x. x.x. x.x.'), drum('gxgX gxgX gxgX gxgX'), drum('gxgX gxgX gxgX gxgX'), drum('gXgX gXgX gXgX gXgX'),
    ], [1] * 6, gain=.1, clip=.6, lpf=12000, hpf=2500, effects={'reverb': .05, 'pan': .3},
        arrangement=arrangement((False, True, False, True, True, True))),
    # g1 · knight: second trumpet, a third under the call.
    part('response', 'Trompete · resposta', 'phrase', samba('trompete', True), [
        mel([shift(x, -2) for x in HORN_VERSE]), mel([shift(x, -2) for x in HORN_VERSE]), mel([shift(x, -2) for x in HORN_VERSE[:2]] * 2),
        mel([REST, REST, REST, shift('. . . . . . . . 7 . 7 . 6 4 . .', -2)]), mel([shift(x, -2) for x in HORN_VERSE]), mel([shift(x, -2) for x in HORN_VERSE]),
    ], [4] * 6, octave=4, gain=.15, attack=.006, decay=.3, sustain=.6, release=.1, gate=.75, lpf=7000, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .18, 'pan': -.2}),
    # g2 · pawn: agogô.
    part('rhythm', 'Agogô', 'pulse', samba('agogo-agudo'), [
        drum('x... x... x... x...'), drum('x.x. .x.x ..x. x...'), drum('x... x... x... x...'), drum('x.x. .x.x ..x. x...'), drum('x.x. .x.x ..x. x...'), drum('x.x. .x.x ..x. x.x.'),
    ], [1] * 6, gain=.07, clip=.5, lpf=9000, hpf=800, effects={'reverb': .1, 'pan': .35},
        arrangement=arrangement((False, False, False, True, True, True))),
    # h1 · rook: trombones' closing hits at the end of each phrase.
    part('harmony', 'Trombone · fecho', 'phrase', samba('trombone', True), [
        skank(VERSE, '.... .... .... X...'), skank(VERSE, '.... .... .... X...'), skank(VERSE, '.... .... .... X...'),
        skank(REFRAIN, '.... .... .... X.x.'), skank(VERSE, '.... .... .... X...'), skank(REFRAIN, '.... .... X... X.x.'),
    ], [4] * 6, octave=3, gain=.12, attack=.006, decay=.25, sustain=.4, release=.1, gate=.5, lpf=4000, hpf=120,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True)), effects={'reverb': .15, 'pan': .25}),
    # h2 · pawn: repique rolls into each section.
    part('rhythm', 'Repique · virada', 'pulse', samba('repinique'), [
        drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('x.x. x.x. xxxx XXXX'),
    ], [1] * 6, gain=.16, clip=.8, lpf=9000, hpf=200, effects={'reverb': .1, 'pan': -.1},
        arrangement=arrangement(variations=(0, 1, 2, 3, 4, 0), fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Salvador 1992 · Samba-reggae', 'bpm': 104, 'meter': '4/4', 'root': 'G', 'scale': 'Mixolídia', 'harmony': 'static',
    'swing': 0, 'sections': [16, 32, 16, 32, 32, 32], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions(lasting_safe([
        rule('ssr-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('ssr-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('ssr-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 5)]),
        rule('ssr-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # A check is the repique's call: the bateria stops for the break.
        rule('ssr-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 2)]),
        rule('ssr-capture', 'capture', 'actor', 1, False, [act('gain', 5)], 'drums'),
        rule('ssr-queen', 'queenCapture', 'both', 4, True, [act('variation', 4), act('gain', 3)]),
        # Quiet play: the bateria alone in the Pelourinho.
        rule('ssr-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('ssr-tension', 'tension', 'both', 1, True, [act('lpf', 2500, rampBars=4)], 'lead'),
        rule('ssr-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('drive', 2)], 'drums'),
        rule('ssr-promotion', 'promotion', 'actor', 2, True, [act('transpose', 12)], 'lead'),
        rule('ssr-drought', 'captureDrought', 'both', 1, True, [act('reverb', .3), act('gain', -2)]),
    ])),
    'reference': 'Samba-reggae dos blocos-afro de Salvador (Olodum, Ilê Aiyê, Muzenza, Neguinho do Samba): referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/Samba-reggae',
}
write('salvador-1992', profile)
