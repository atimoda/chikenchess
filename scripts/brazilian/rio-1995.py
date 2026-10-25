"""Rio de Janeiro 1995 · funk carioca dos bailes (original material).

The baile funk of the mid-nineties, still on the Miami-bass 'Volt Mix' grid
before the tamborzão: a booming TR-808 kick and sub, snare and claps on the
backbeat with a pickup, sixteenth hats and the 808 cowbell, the DJ's montagem of
orchestra hits, scratches and 'hey!' shouts, a bell-like melô and the whole
baile chanting the hook. F natural minor, i–VI–VII–i.
Form: DJ intro · verse (beat and melô) · montagem break · drop with the chant ·
the beat alone with the DJ · drop.
Degrees (F minor): 0 F · 1 G · 2 Ab · 3 Bb · 4 C · 5 Db · 6 Eb · 7 F'.
"""
from brkit import act, arrangement, bars, comp, hits, line, machine, over, part, reactions, recorded, rule, sample, shift, synth, lasting_safe, write

S = 16
LOOP = ('Fm', 'Db', 'Eb', 'Fm')
CHORD = {'Fm': '0,2,4', 'Db': '-2,0,2', 'Eb': '-1,1,3'}
ROOT = {'Fm': 0, 'Db': -2, 'Eb': -1}
REST = ' '.join(['.'] * S)
CHANT = ['7 . . 7 . . 7 . 6 . 4 . . . . .', '5 . . 5 . . 4 . 2 . . . . . . .', '6 . . 6 . . 6 . 7 . 6 . 4 . . .', '4 . . . 2 . . . 0 . . . . . . .']


def electronic(asset, pitched=False):
    return sample('electronic', asset, pitched)


def mel(lines):
    return bars(*(line(text, S) for text in lines))


def melo(chords, shape='0 . 2 . 4 . 7 . 4 . 2 . 0 . 2 .'):
    return over(chords, lambda c: shift(shape, ROOT[c]))


def sub(chords, shape='R... ..R. ..R. ....'):
    return over(chords, lambda c: ' '.join('.' if ch == '.' else f'{ROOT[c]}!' for ch in shape.replace(' ', '')))


def chords(progression, rhythm):
    return over(progression, lambda c: comp(CHORD[c], rhythm))


def drum(pattern):
    return hits(pattern, steps=S)


KICK = 'X... ..X. ..X. ....'
KICK_B = 'X... ..X. ..X. X..x'
SNARE = '.... X... .... X..x'
parts = [
    # a1 · rook: the 808 sub bass.
    part('bass', 'Baixo 808', 'phrase', synth('sine'), [
        sub(LOOP, 'R... .... .... ....'), sub(LOOP), sub(LOOP, 'R... .... .... ....'), sub(LOOP, 'R... ..R. ..R. R..R'), sub(LOOP), sub(LOOP, 'R... ..R. ..R. R..R'),
    ], [4] * 6, octave=1, gain=.5, attack=.003, decay=.6, sustain=.5, release=.2, gate=.8, clip=.95, lpf=200, hpf=25,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0}, effects={'reverb': 0, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True))),
    # a2 · pawn: 808 boom kick.
    part('rhythm', 'Bumbo 808', 'pulse', machine('808-kick-long'), [
        drum('X... .... X... ....'), drum(KICK), drum('X... .... .... ....'), drum(KICK_B), drum(KICK), drum(KICK_B),
    ], [1] * 6, gain=.5, clip=.7, lpf=6000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # b1 · knight: orchestra hits of the montagem.
    part('response', 'Orchestra hit', 'pulse', electronic('orch-hit'), [
        drum('X... .... .... ....'), drum('.... .... .... ..X.'), drum('X... ..X. ..X. ....'), drum('X... .... .... ..X.'), drum('.... .... .... ..X.'), drum('X... .... ..X. ..X.'),
    ], [1] * 6, gain=.2, clip=.9, lpf=9000, hpf=150, design={'role': 'fx'}, effects={'reverb': .25, 'pan': -.2},
        arrangement=arrangement((True, False, True, True, False, True))),
    # b2 · pawn: 808 snare on the backbeat with its pickup.
    part('rhythm', 'Caixa 808', 'pulse', machine('808-snare'), [
        drum('.... X... .... X...'), drum(SNARE), drum('.... .... .... X...'), drum(SNARE), drum(SNARE), drum('.... X..x .... X.xx'),
    ], [1] * 6, gain=.3, clip=.8, lpf=10000, hpf=150, effects={'reverb': .1, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True))),
    # c1 · bishop: the melô, a bell arpeggio.
    part('melody', 'Melô · sino FM', 'phrase', recorded('synths', 'fm-bell'), [
        melo(LOOP), melo(LOOP), melo(LOOP, '7 . . . . . . . . . . . . . . .'), melo(LOOP, '0 . 2 . 4 . 7 . 9 . 7 . 4 . 2 .'), melo(LOOP), melo(LOOP, '0 . 2 . 4 . 7 . 9 . 7 . 4 . 2 .'),
    ], [4] * 6, octave=4, gain=.12, attack=.002, decay=.4, sustain=.2, release=.2, gate=.6, lpf=8000, hpf=300,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True)), effects={'reverb': .2, 'delay': .15, 'pan': .25}),
    # c2 · pawn: 808 claps.
    part('rhythm', 'Palmas 808', 'pulse', machine('808-clap'), [
        drum('.... X... .... X...'), drum('.... X... .... X...'), drum('.... .... .... X...'), drum('.... X... .... X.x.'), drum('.... X... .... X...'), drum('.... X... .... X.xx'),
    ], [1] * 6, gain=.24, clip=.8, lpf=9000, hpf=300, effects={'reverb': .15, 'pan': .1},
        arrangement=arrangement((False, False, True, True, True, True))),
    # d1 · queen: the baile's chant, the hook.
    part('melody', 'Grito do baile', 'phrase', electronic('oh-chant', True), [
        mel(CHANT), mel(CHANT), mel(CHANT[:2] * 2), mel(CHANT), mel(CHANT), mel(CHANT),
    ], [4] * 6, octave=4, gain=.24, attack=.01, decay=.3, sustain=.6, release=.15, gate=.75, lpf=6000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, True, True, False, True)), effects={'reverb': .25, 'pan': 0}),
    # d2 · pawn: 808 closed hats.
    part('rhythm', 'Chimbal 808', 'pulse', machine('808-hat'), [
        drum('x.x. x.x. x.x. x.x.'), drum('xxxx xxxx xxxx xxxx'), drum('x.x. x.x. x.x. x.x.'), drum('xXxx xXxx xXxx xXxx'), drum('xxxx xxxx xxxx xxxx'), drum('xXxx xXxx xXxx xXxr'),
    ], [1] * 6, gain=.4, clip=.5, lpf=14000, hpf=5000, effects={'reverb': .02, 'pan': .2},
        arrangement=arrangement((True, True, False, True, True, True))),
    # e1 · king: string pad under the drop.
    part('harmony', 'Pad de cordas', 'sustain', recorded('synths', 'analog-pad'), [
        chords(LOOP, 'x... .... .... ....'), chords(LOOP, 'x... .... .... ....'), chords(LOOP, 'x... .... .... ....'), chords(LOOP, 'x... .... .... ....'), chords(LOOP, 'x... .... .... ....'), chords(LOOP, 'x... .... .... ....'),
    ], [4] * 6, octave=3, gain=.08, attack=.5, decay=.6, sustain=.85, release=.8, gate=.97, lpf=3500, hpf=150,
        design={'role': 'pad'}, mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, False, True, False, True), restart=False), effects={'reverb': .35, 'pan': -.15}),
    # e2 · pawn: 808 cowbell, the Miami signature.
    part('rhythm', 'Cowbell 808', 'pulse', machine('808-cowbell'), [
        drum('..x. ..x. ..x. ..x.'), drum('..x. ..x. ..x. ..x.'), drum('..x. ..x. ..x. ..x.'), drum('..x. .xx. ..x. .xx.'), drum('..x. ..x. ..x. ..x.'), drum('..x. .xx. ..x. .xx.'),
    ], [1] * 6, gain=.1, clip=.6, lpf=8000, hpf=500, effects={'reverb': .05, 'pan': -.3},
        arrangement=arrangement((False, True, False, True, True, True))),
    # f1 · bishop: square-wave stabs.
    part('harmony', 'Teclado · stab', 'phrase', synth('square'), [
        chords(LOOP, '.... .... .... ..x.'), chords(LOOP, '..x. .... ..x. ....'), chords(LOOP, 'x... .... .... ....'), chords(LOOP, '..x. ..x. ..x. ..x.'), chords(LOOP, '..x. .... ..x. ....'), chords(LOOP, '..x. ..x. ..x. ..x.'),
    ], [4] * 6, octave=3, gain=.1, attack=.003, decay=.15, sustain=.1, release=.1, gate=.3, clip=.9, lpf=2200, hpf=200,
        design={'filterEnv': 1.2, 'filterDecay': .12}, mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, True, True)), effects={'reverb': .2, 'delay': .2, 'pan': .3}),
    # f2 · pawn: 808 low tom.
    part('rhythm', 'Tom 808', 'pulse', machine('808-tom-low'), [
        drum('.... .... .... ..x.'), drum('.... .... ...x ..x.'), drum('x..x ..x. x..x ..x.'), drum('.... .... ...x ..x.'), drum('.... .... ...x ..x.'), drum('.... .x.. ...x .xx.'),
    ], [1] * 6, gain=.24, clip=.7, lpf=6000, hpf=40, effects={'reverb': .08, 'pan': -.15},
        arrangement=arrangement((False, True, True, True, True, True))),
    # g1 · knight: 'hey!' shouts.
    part('response', 'Hey!', 'pulse', electronic('hey'), [
        drum('.... .... .... X...'), drum('.... .... .... X...'), drum('X... .... X... ....'), drum('.... X... .... X...'), drum('.... .... .... X...'), drum('.... X... .... X...'),
    ], [1] * 6, gain=.2, clip=.9, lpf=9000, hpf=200, design={'role': 'fx'}, effects={'reverb': .2, 'delay': .15, 'pan': .3},
        arrangement=arrangement((True, False, True, True, False, True))),
    # g2 · pawn: 808 open hat on the offbeats of the drop.
    part('rhythm', 'Chimbal aberto 808', 'pulse', machine('808-open-hat'), [
        drum('..x. ..x. ..x. ..x.'), drum('..x. ..x. ..x. ..x.'), drum('..x. ..x. ..x. ..x.'), drum('..x. ..x. ..x. ..x.'), drum('..x. ..x. ..x. ..x.'), drum('..x. ..x. ..x. ..x.'),
    ], [1] * 6, gain=.12, clip=.5, lpf=12000, hpf=4000, effects={'reverb': .05, 'pan': -.2},
        arrangement=arrangement((False, False, False, True, False, True))),
    # h1 · rook: the DJ's scratches.
    part('texture', 'Scratch do DJ', 'pulse', electronic('scratch'), [
        drum('X... ..x. X... x.x.'), drum('.... .... .... ..x.'), drum('X..x ..x. X..x x.x.'), drum('.... .... .... ..x.'), drum('X... ..x. X..x x.x.'), drum('.... .... X... ..x.'),
    ], [1] * 6, gain=.2, clip=.9, lpf=9000, hpf=300, design={'role': 'fx'}, effects={'reverb': .1, 'pan': -.35},
        arrangement=arrangement((True, True, True, False, True, False), restart=False)),
    # h2 · pawn: 808 tom rolls into each section.
    part('rhythm', 'Virada 808', 'pulse', machine('808-tom-high'), [
        drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... .... ...g'), drum('.... .... x.x. xxxx'),
    ], [1] * 6, gain=.16, clip=.7, lpf=8000, hpf=100, effects={'reverb': .1, 'pan': .35},
        arrangement=arrangement(variations=(0, 1, 2, 3, 4, 0), fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Rio de Janeiro 1995 · Funk carioca', 'bpm': 128, 'meter': '4/4', 'root': 'F', 'scale': 'Menor natural', 'harmony': 'static',
    'swing': 0, 'sections': [16, 32, 16, 32, 32, 32], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Drop', 'Interlude', 'Drop'],
    'parts': parts,
    'reactions': reactions(lasting_safe([
        rule('fnk-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('fnk-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('fnk-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 5)]),
        rule('fnk-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # A check is the DJ's montagem: everything drops out but the kick, hits and the chant.
        rule('fnk-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 2)]),
        rule('fnk-capture', 'capture', 'actor', 1, False, [act('gain', 5)], 'fx'),
        rule('fnk-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('delay', .4)]),
        rule('fnk-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        # Tension: the sub swells and distorts like a sound system pushed to its limit.
        rule('fnk-tension', 'tension', 'both', 1, True, [act('drive', 3)], 'bass'),
        rule('fnk-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('drive', 2)], 'drums'),
        rule('fnk-hanging', 'hangingPiece', 'actor', 1, True, [act('gain', 5)], 'fx'),
        rule('fnk-drought', 'captureDrought', 'both', 1, True, [act('lpf', 1500, rampBars=4)]),
    ])),
    'reference': 'Funk carioca dos bailes de 1989–1996 (Volt Mix, DJ Marlboro, Cidinho & Doca, as montagens): referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/Funk_carioca',
}
write('rio-1995', profile)
