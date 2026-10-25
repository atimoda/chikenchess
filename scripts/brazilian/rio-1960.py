"""Rio de Janeiro 1960 · bossa nova (original material).

Zona Sul, late at night: the violão's batida (thumb on the bass, fingers on
syncopated, anticipated chords) is the heart, the drums whisper — cross-stick on
the bossa clave, brushes and shaker sixteenths, a soft bass drum doubling the
double bass's 'one … and-a three' — and the flute sings long, off-beat phrases
over seventh chords. A sparse piano, a marimba, a muted trumpet solo, trombones
and strings in the last refrain, in the manner of the orchestrations of the era.
F major with every chord as a seventh: Fmaj7, Gm7, Am7, Bbmaj7, C7, Dm7.
Form: violão intro · A · violão and bass interlude · B · trumpet solo on A · B with strings.
Degrees (F major): 0 F · 1 G · 2 A · 3 Bb · 4 C · 5 D · 6 E · 7 F'.
"""
from brkit import act, arrangement, bars, comp, sample, hits, line, over, part, reactions, recorded, rule, samba, lasting_safe, write

S = 16
A = ('Fmaj7', 'Fmaj7', 'Gm7', 'C7', 'Am7', 'Dm7', 'Gm7', 'C7')
B = ('Bbmaj7', 'Bbmaj7', 'Am7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'Fmaj7')
INTRO = ('Fmaj7', 'Dm7', 'Gm7', 'C7')
CHORD = {'Fmaj7': '0,2,4,6', 'Gm7': '1,3,5,7', 'Am7': '2,4,6,8', 'Bbmaj7': '-4,-2,0,2', 'C7': '-3,-1,1,3', 'Dm7': '-2,0,2,4'}
ROOT = {'Fmaj7': 0, 'Gm7': 1, 'Am7': 2, 'Bbmaj7': -4, 'C7': -3, 'Dm7': -2}
FIFTH = {'Fmaj7': 4, 'Gm7': 5, 'Am7': 6, 'Bbmaj7': 0, 'C7': 1, 'Dm7': 2}
REST = ' '.join(['.'] * S)
MEL_A = ['. . 2 . . . 4 . . . 6 . . . . .', '7_ . . . . . . . . . 6 . 4 . . .', '. . 3 . . . 5 . . . 7 . . . . .', '8_ . . . . . . . 7 . . . 6 . . .',
         '. . 4 . . . 6 . . . 8 . . . . .', '9_ . . . . . . . 7 . . . 5 . . .', '. . 5 . 4 . 3 . . . 1 . . . . .', '-1_ . . . . . . . . . . . . . . .']
MEL_B = ['. . 5 . . . 7 . . . 9 . . . . .', '8_ . . . . . . . . . 7 . 5 . . .', '. . 4 . . . 6 . . . 8 . . . . .', '7_ . . . . . . . . . 5 . 4 . . .',
         '. . 3 . . . 5 . . . 7 . . . 6 .', '. . 4 . . . 3 . . . 1 . . . -1 .', '0_ . . . . . . . . . 2 . 4 . . .', '6_ . . . . . . . . . . . . . . .']
SOLO = ['. . 4 . 6 . 7 . 9 . 7 . 6 . 4 .', '2 . . . . . 4 . . 6 . . 4 . . .', '. . 5 . 7 . 8 . 7 . 5 . 3 . . .', '1 . . 3 . . 4 . 6 . . . . . . .',
        '. . 6 . 8 . 9 . 11 . 9 . 8 . 6 .', '4 . . . 5 . . . 7 . . . 9 . . .', '8 . 7 . 5 . 3 . 1 . . . 3 . . .', '4_ . . . . . . . . . . . . . . .']
# João Gilberto's batida: thumb bass on one and three, the chord syncopated in two-bar cells.
BATIDA = ('x..x ..x. ..x. .x..', '..x. .x.. x..x ....')


def mel(lines):
    return bars(*(line(text, S) for text in lines))


def batida(progression, cells=BATIDA):
    return bars(*(comp(CHORD[c], cells[i % 2]) for i, c in enumerate(progression)))


def bass(progression, busy=False):
    shape = (lambda c: f'{ROOT[c]}! . . {ROOT[c]}\' . . . . {FIFTH[c]} . . {FIFTH[c]}\' . . . .') if busy else (lambda c: f'{ROOT[c]}! . . . . . . . {FIFTH[c]} . . . . . . .')
    return over(progression, shape)


def chords(progression, rhythm):
    return over(progression, lambda c: comp(CHORD[c], rhythm))


def drum(pattern, n=1):
    return hits(pattern * n, steps=S)


CLAVE = 'x..x ..x. ..x. .x.. ..x. .x.. x... x...'
parts = [
    # a1 · rook: the double bass.
    part('bass', 'Contrabaixo', 'phrase', recorded('guitars', 'bass'), [
        bass(INTRO), bass(A), bass(INTRO), bass(B), bass(A, busy=True), bass(B, busy=True),
    ], [4, 8, 4, 8, 8, 8], octave=2, gain=0.482, attack=.006, decay=.6, sustain=.35, release=.25, gate=.8, lpf=1800, hpf=35,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .1}, effects={'reverb': .1, 'pan': .05},
        arrangement=arrangement((False, True, True, True, True, True))),
    # a2 · pawn: soft bass drum doubling the bass.
    part('rhythm', 'Bumbo', 'pulse', recorded('percussion', 'kick', pitched=False), [
        drum('x... .... x... ....'), drum('x..x .... x..x ....'), drum('x... .... x... ....'), drum('x..x .... x..x ....'), drum('x..x .... x..x ....'), drum('x..x .... x..x ...x'),
    ], [1] * 6, gain=.2, clip=.5, lpf=2500, hpf=35, mapping={'panWidth': 0}, effects={'reverb': .05, 'pan': 0},
        arrangement=arrangement((False, True, False, True, True, True))),
    # b1 · knight: muted trumpet solo.
    part('melody', 'Trompete com surdina', 'phrase', samba('trompete', True), [
        mel(SOLO[4:]), mel(SOLO), mel(SOLO[:4]), mel(SOLO), mel(SOLO), mel(SOLO),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.328, attack=.015, decay=.3, sustain=.6, release=.12, gate=.8, lpf=3200, hpf=300,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, False, True, False), restart=False), effects={'reverb': .25, 'pan': .2}),
    # b2 · pawn: cross-stick on the bossa clave.
    part('rhythm', 'Aro · clave da bossa', 'pulse', sample('drums', 'wood-rim', False), [
        hits(CLAVE), hits(CLAVE), hits(CLAVE), hits(CLAVE), hits(CLAVE), hits(CLAVE),
    ], [2] * 6, gain=0.228, clip=.5, lpf=8000, hpf=300, effects={'reverb': .08, 'pan': -.2},
        arrangement=arrangement((False, True, True, True, True, True))),
    # c1 · bishop: marimba answers, like the vibraphone of the period's records.
    part('response', 'Marimba', 'phrase', recorded('band', 'marimba'), [
        over(INTRO, lambda c: hits('.... .... x.x. x...', CHORD[c].split(',')[-1])), over(A, lambda c: hits('.... .... .... x.x.', CHORD[c].split(',')[-1])),
        over(INTRO, lambda c: hits('.... .... x.x. x...', CHORD[c].split(',')[-1])), over(B, lambda c: hits('.... .... .... x.x.', CHORD[c].split(',')[-1])),
        over(A, lambda c: hits('.... .... .... x...', CHORD[c].split(',')[-1])), over(B, lambda c: hits('.... .... x.x. x.x.', CHORD[c].split(',')[-1])),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=1.0, attack=.002, decay=0.8, sustain=0.5, release=.2, gate=.6, lpf=7000, hpf=250,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, False, True)), effects={'reverb': .25, 'pan': .35}),
    # c2 · pawn: brushes on the snare, sixteenths with a swirl.
    part('rhythm', 'Vassourinha', 'pulse', sample('drums', 'brush', False), [
        drum('g.g. g.g. g.g. g.g.'), drum('gxgx gxgx gxgx gxgx'), drum('g.g. g.g. g.g. g.g.'), drum('gxgx gxgx gxgx gxgx'), drum('gxgx gxgx gxgx gxgx'), drum('gXgx gXgx gXgx gXgx'),
    ], [1] * 6, gain=0.237, clip=.5, lpf=9000, hpf=600, effects={'reverb': .08, 'pan': .15}),
    # d1 · queen: the flute melody.
    part('melody', 'Flauta', 'phrase', recorded('classical', 'flute-sustain'), [
        mel([REST, REST, REST, '. . . . . . . . 4 . 6 . 7 . 9 .']), mel(MEL_A), mel([REST] * 3 + ['. . . . . . . . . . . . . . 4 .']), mel(MEL_B), mel(MEL_A), mel(MEL_B),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.66, attack=.03, decay=.4, sustain=.75, release=.2, gate=.9, lpf=8000, hpf=250,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, True, False, True, False, True)), effects={'reverb': .25, 'pan': 0}),
    # d2 · pawn: shaker.
    part('rhythm', 'Shaker', 'pulse', recorded('percussion', 'shaker', pitched=False), [
        drum('x.x. x.x. x.x. x.x.'), drum('gxgx gxgx gxgx gxgx'), drum('x.x. x.x. x.x. x.x.'), drum('gxgx gxgx gxgx gxgx'), drum('gxgx gxgx gxgx gxgx'), drum('gxgx gxgx gxgx gxgx'),
    ], [1] * 6, gain=0.227, clip=.5, lpf=12000, hpf=3000, effects={'reverb': .05, 'pan': -.3},
        arrangement=arrangement((False, True, False, True, True, True))),
    # e1 · king: the violão's batida, the heart of bossa.
    part('harmony', 'Violão · batida', 'phrase', recorded('guitars', 'nylon'), [
        batida(INTRO), batida(A), batida(INTRO), batida(B), batida(A), batida(B),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=0.196, attack=.004, decay=.35, sustain=.25, release=.15, gate=.45, lpf=5000, hpf=120,
        mapping={'fileDegrees': 0}, effects={'reverb': .12, 'pan': -.15}),
    # e2 · pawn: hi-hat foot on two and four.
    part('rhythm', 'Chimbal de pé', 'pulse', recorded('percussion', 'hat', pitched=False), [
        drum('.... x... .... x...'), drum('.... x... .... x...'), drum('.... x... .... x...'), drum('.... x... .... x...'), drum('.... x... .... x...'), drum('.... x... .... x...'),
    ], [1] * 6, gain=0.4, clip=.4, lpf=10000, hpf=2500, effects={'reverb': .04, 'pan': .25},
        arrangement=arrangement((False, False, False, True, True, True))),
    # f1 · bishop: the trombones' soft chords in the refrains.
    part('harmony', 'Trombones', 'sustain', samba('trombone', True), [
        chords(INTRO, 'x... .... .... ....'), chords(A, 'x... .... .... ....'), chords(INTRO, 'x... .... .... ....'),
        chords(B, '..x. .... .... ....'), chords(A, 'x... .... .... ....'), chords(B, '..x. .... x... ....'),
    ], [4, 8, 4, 8, 8, 8], octave=3, gain=0.125, attack=.05, decay=.5, sustain=.6, release=.3, gate=.9, lpf=2500, hpf=100,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .3, 'pan': .25}),
    # f2 · pawn: ride cymbal under the solo.
    part('rhythm', 'Prato de condução', 'pulse', recorded('percussion', 'ride', pitched=False), [
        drum('x... x... x... x...'), drum('x..x x... x..x x...'), drum('x... x... x... x...'), drum('x..x x... x..x x...'), drum('x.xx x.xx x.xx x.xx'), drum('x..x x... x..x x...'),
    ], [1] * 6, gain=0.8, clip=.5, lpf=11000, hpf=1500, effects={'reverb': .1, 'pan': -.35},
        arrangement=arrangement((False, False, False, False, True, True))),
    # g1 · knight: strings in the last refrain.
    part('harmony', 'Cordas', 'sustain', recorded('classical', 'viola-sustain'), [
        chords(INTRO, 'x... .... .... ....'), chords(A, 'x... .... .... ....'), chords(INTRO, 'x... .... .... ....'),
        chords(B, 'x... .... .... ....'), chords(A, 'x... .... .... ....'), chords(B, 'x... .... .... ....'),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.5, attack=.4, decay=.5, sustain=.85, release=.6, gate=.97, lpf=5000, hpf=200,
        design={'role': 'pad'}, mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, False, False, True)), effects={'reverb': .35, 'pan': -.2}),
    # g2 · pawn: ganzá, very light.
    part('rhythm', 'Ganzá', 'pulse', sample('brasil', 'ganza', False), [
        drum('...x ...x ...x ...x'), drum('...x ...x ...x ...x'), drum('...x ...x ...x ...x'), drum('.x.x .x.x .x.x .x.x'), drum('...x ...x ...x ...x'), drum('.x.x .x.x .x.x .x.x'),
    ], [1] * 6, gain=0.174, clip=.5, lpf=12000, hpf=3500, effects={'reverb': .05, 'pan': .35},
        arrangement=arrangement((False, False, False, True, False, True))),
    # h1 · rook: sparse piano comping (Jobim at the keyboard).
    part('harmony', 'Piano', 'phrase', recorded('band', 'piano'), [
        chords(INTRO, '.... .... .... ..x.'), chords(A, '.... ...x .... ....'), chords(INTRO, '.... .... .... ..x.'),
        chords(B, '.... ...x .... ..x.'), chords(A, '.... ...x .... ....'), chords(B, '.... ...x .... ..x.'),
    ], [4, 8, 4, 8, 8, 8], octave=4, gain=0.153, attack=.003, decay=.7, sustain=.3, release=.3, gate=.6, lpf=6000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .2, 'pan': .2}),
    # h2 · pawn: brush sweeps into each section.
    part('rhythm', 'Vassourinha · virada', 'pulse', sample('drums', 'brush', False), [
        drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... x.xx xXxX'),
    ], [1] * 6, gain=0.207, clip=.5, lpf=9000, hpf=600, effects={'reverb': .1, 'pan': -.1},
        arrangement=arrangement((True, True, True, True, True, False), fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Rio de Janeiro 1960 · Bossa nova', 'bpm': 116, 'meter': '4/4', 'root': 'F', 'scale': 'Maior', 'harmony': 'static',
    'swing': 0, 'sections': [16, 32, 16, 32, 32, 32], 'sectionLabels': ['Intro', 'Verse', 'Interlude', 'Chorus', 'Solo', 'Chorus'],
    'parts': parts,
    'reactions': reactions(lasting_safe([
        rule('bos-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('bos-middle', 'middle', 'both', 1, True, [act('gain', 1)]),
        # Bossa never shouts: the endgame brings the strings in, not more volume.
        rule('bos-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('reverb', .3)]),
        rule('bos-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # A check leaves the violão and the bass alone, the way the song breathes.
        rule('bos-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 2)]),
        rule('bos-capture', 'capture', 'actor', 1, False, [act('gain', 3)], 'drums'),
        rule('bos-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('lpf', 2500)]),
        # Quiet play: the muted trumpet improvises.
        rule('bos-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('bos-tension', 'tension', 'both', 1, True, [act('reverb', .4), act('lpf', 3000, rampBars=4)], 'pad'),
        rule('bos-swing', 'evalSwing', 'actor', 2, True, [act('variation', 4)]),
        rule('bos-advantage', 'advantage', 'actor', 1, False, [act('gain', 3)], 'lead'),
        rule('bos-drought', 'captureDrought', 'both', 1, True, [act('delay', .2), act('gain', -2)]),
    ])),
    'reference': 'Bossa nova carioca de 1958–1963 (João Gilberto, Tom Jobim, Vinicius de Moraes, Carlos Lyra): referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/Bossa_nova',
}
write('rio-1960', profile)
