"""Düsseldorf 1978 · Kling Klang synth-pop in the spirit of Kraftwerk's "The Model".

Sound and form follow the record's world: 125 BPM, analogue sequencer bass in
octave eighths, sine-and-noise synth drums, string-machine chords, a bright
mono lead hook and a robotic voice on the queen. Every melody and the chord
plan here are original; nothing is transcribed from the recording.
C natural minor. Degrees: 0 C · 1 D · 2 Eb · 3 F · 4 G · 5 Ab · 6 Bb · 7 C'.
"""
from kit import (act, arrangement, bar, bars, drums, electronic, machine, part, reactions, rule, synth, write)

# Verse plan: Cm | Ab | Bb | Cm ; chorus plan: Ab | Bb | Cm | Cm.
VERSE_ROOTS, CHORUS_ROOTS = (0, -2, -1, 0), (-2, -1, 0, 0)
CHORD = {0: '0,2,4', -2: '-2,0,2', -1: '-1,1,3', 3: '-4,-2,0'}


def octaves(root, variant=0):
    """Minimoog sequence: root and octave in eighths; variant 1 adds the 16th push into the bar."""
    r, o = str(root), str(root + 7)
    cells = [r, '.', o, '.', r, '.', o, '.', r, '.', o, '.', r, '.', o, '.']
    if variant == 1:
        cells[15] = o + "'"
    if variant == 2:
        cells = [r, '.', '.', '.', '.', '.', '.', '.', r, '.', '.', '.', '.', '.', o, '.']
    return bar(' '.join(cells))


def chords(roots, rhythm='whole'):
    out = []
    for root in roots:
        c = CHORD[root]
        out.append(bar(f'{c}_ . . . . . . . . . . . . . . .') if rhythm == 'whole' else bar(f'. . {c} . . . {c} . . . {c} . . . {c} .'))
    return bars(*out)


def arp(roots):
    """Sequencer arpeggio in 16ths: root, third, fifth, octave, fifth, third…"""
    out = []
    for root in roots:
        shape = [0, 2, 4, 7, 4, 2, 4, 7, 0, 2, 4, 7, 9, 7, 4, 2]
        out.append(bar(' '.join(str(root + s) for s in shape)))
    return bars(*out)


KICK = drums('X... .... X... ..x. X... .... X... ....')
SNARE = drums('.... X... .... X... .... X... .... X...')
parts = [
    # a1 · rook: string machine, the Orchestron/Solina wash under the whole song.
    part('harmony', 'String machine', 'sustain', synth('supersaw'), [
        chords(VERSE_ROOTS), chords(VERSE_ROOTS), chords(VERSE_ROOTS), chords(CHORUS_ROOTS), chords(VERSE_ROOTS), chords(CHORUS_ROOTS),
    ], [4] * 6, octave=3, gain=.045, attack=.35, decay=.8, sustain=.8, release=.9, gate=.97, clip=1, lpf=2600, hpf=160,
        design={'unison': 3, 'detune': .12, 'spread': .6, 'lfoTarget': 'lpf', 'lfoRate': 4, 'lfoUnit': 'bars', 'lfoDepth': .25, 'role': 'pad'},
        arrangement=arrangement((True, True, True, True, True, True), restart=False), effects={'reverb': .35, 'pan': -.2}),
    # a2 · pawn: low sequencer blip on the off-eighths, the machine ticking under the groove.
    part('rhythm', 'Blip de sequenciador', 'pulse', machine('synth-blip-low'), [
        drums('..x. ..x. ..x. ..x.'), drums('..x. ..x. ..x. ..x.'), drums('.... .... ..x. ....'),
        drums('..x. ..x. ..x. ..xx'), drums('..x. .... ..x. ....'), drums('..x. ..x. ..x. ..xx'),
    ], [1] * 6, gain=.09, clip=.6, lpf=4000, hpf=200, effects={'reverb': .05, 'pan': -.35, 'delay': .1}),
    # b1 · knight: arpeggiated sequencer, square wave with a resonant filter.
    part('response', 'Sequência Kling Klang', 'phrase', synth('square'), [
        arp(VERSE_ROOTS), arp(VERSE_ROOTS), bars(bar('0 . . . 4 . . . 7 . . . 4 . . .'), bar('-2 . . . 2 . . . 5 . . . 2 . . .'), bar('-1 . . . 3 . . . 6 . . . 3 . . .'), bar('0 . . . . . . . . . . . . . . .')),
        arp(CHORUS_ROOTS), arp(VERSE_ROOTS), arp(CHORUS_ROOTS),
    ], [4] * 6, octave=4, gain=0.11, attack=.002, decay=.09, sustain=.15, release=.05, gate=.5, clip=.9, lpf=1800, hpf=300,
        design={'resonance': 9, 'filterEnv': 2.2, 'filterDecay': .08, 'delayTime': '3/16', 'delayFeedback': .35},
        arrangement=arrangement((False, True, True, True, False, True), restart=True), effects={'delay': .25, 'reverb': .15, 'pan': .3}),
    # b2 · pawn: electronic hand-clap tick doubling the snare in the chorus.
    part('rhythm', 'Palma eletrônica', 'pulse', machine('808-clap'), [
        drums('.... .... .... ....'), drums('.... .... .... ....'), drums('.... .... .... ....'),
        SNARE, drums('.... .... .... ..x.'), SNARE,
    ], [1, 1, 1, 2, 1, 2], gain=.08, clip=.8, lpf=7000, hpf=600, effects={'reverb': .12, 'pan': .1},
        arrangement=arrangement((False, False, False, True, True, True))),
    # c1 · bishop: Polymoog-style brass stabs answering the chorus on the offbeats.
    part('harmony', 'Metais Polymoog', 'phrase', synth('sawtooth'), [
        chords(VERSE_ROOTS, 'stab'), chords(VERSE_ROOTS, 'stab'), chords(VERSE_ROOTS, 'stab'), chords(CHORUS_ROOTS, 'stab'), chords(VERSE_ROOTS, 'stab'), chords(CHORUS_ROOTS, 'stab'),
    ], [4] * 6, octave=4, gain=0.1, attack=.004, decay=.16, sustain=.2, release=.08, gate=.45, clip=.9, lpf=1600, hpf=250,
        design={'filterEnv': 2.5, 'filterDecay': .12, 'resonance': 3},
        arrangement=arrangement((False, False, False, True, False, True), restart=True), effects={'reverb': .2, 'pan': -.25}),
    # c2 · pawn: noise snare with the sine 'pang' on two and four.
    part('rhythm', 'Caixa de ruído', 'pulse', machine('synth-snare'), [
        drums('.... .... .... ....'), SNARE, drums('.... .... .... X...'), SNARE, SNARE, drums('.... X... .... X... .... X... ..x. X.x.'),
    ], [1, 2, 1, 2, 2, 2], gain=0.24, clip=.8, lpf=9000, hpf=180, effects={'reverb': .18, 'pan': .05},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # d1 · queen: the robotic voice, a talk-sung line that stays near one note, like a vocoder.
    part('melody', 'Voz robótica', 'phrase', electronic('robot-voice', True), [
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . 4 . 4 .')),
        bars(bar('4 . . . 4 . . . 4 . 3 . 2 . . .'), bar('2 . . . 2 . . . 2 . 1 . 0 . . .'), bar('1 . . . 1 . . . 3 . 2 . 1 . . .'), bar('0_ . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('7_ . . . . . . . . . . . . . . .')),
        bars(bar('5 . . . 5 . 4 . 2 . . . 0 . . .'), bar('6 . . . 6 . 5 . 3 . . . 1 . . .'), bar('7 . . . 7 . 6 . 4 . . . 2 . . .'), bar('4_ . . . . . . . 2 . . . 0 . . .')),
        bars(bar('4 . . . . . . . 4 . . . . . . .'), bar('2 . . . . . . . 0 . . . . . . .')),
        bars(bar('5 . . . 5 . 4 . 2 . . . 0 . . .'), bar('6 . . . 6 . 5 . 3 . . . 1 . . .'), bar('7 . . . 7 . 6 . 4 . . . 2 . . .'), bar('4_ . . . . . . . 2 . . . 0 . . .')),
    ], [2, 4, 2, 4, 2, 4], octave=3, gain=0.3, attack=.02, decay=.4, sustain=.75, release=.12, gate=.8, clip=.95, lpf=4200, hpf=150,
        mapping={'fileDegrees': 0, 'panWidth': .1}, arrangement=arrangement((False, True, False, True, True, True), restart=True),
        effects={'reverb': .22, 'delay': .12, 'pan': 0}),
    # d2 · pawn: Minimoog bass sequence in octave eighths.
    part('bass', 'Baixo Minimoog', 'phrase', synth('sawtooth'), [
        bars(*(octaves(r, 2) for r in VERSE_ROOTS)), bars(*(octaves(r) for r in VERSE_ROOTS)), bars(*(octaves(r, 2) for r in VERSE_ROOTS)),
        bars(*(octaves(r, 1) for r in CHORUS_ROOTS)), bars(*(octaves(r) for r in VERSE_ROOTS)), bars(*(octaves(r, 1) for r in CHORUS_ROOTS)),
    ], [4] * 6, octave=2, gain=0.5, attack=.003, decay=.18, sustain=.45, release=.06, gate=.7, clip=.95, lpf=650, hpf=30,
        design={'resonance': 7, 'filterEnv': 2.6, 'filterDecay': .16, 'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .05},
        effects={'reverb': 0, 'pan': 0}),
    # e1 · king: Orchestron choir; arrives with castling and carries the chorus.
    part('texture', 'Coro Orchestron', 'sustain', electronic('vox-pad', True), [
        chords(VERSE_ROOTS), chords(VERSE_ROOTS), chords(VERSE_ROOTS), chords(CHORUS_ROOTS), chords(VERSE_ROOTS), chords(CHORUS_ROOTS),
    ], [4] * 6, octave=3, gain=.06, attack=.5, decay=1, sustain=.9, release=1.1, gate=.98, clip=1, lpf=3600, hpf=220,
        arrangement=arrangement((True, False, True, True, False, True), restart=False), effects={'reverb': .45, 'pan': .2}),
    # e2 · pawn: sine synth kick on one and three, with the push into three.
    part('rhythm', 'Bumbo sintético', 'pulse', machine('synth-kick'), [
        drums('X... .... X... ....'), KICK, drums('X... .... .... ....'), KICK, KICK, drums('X... .... X... ..x. X... ..x. X... x.x.'),
    ], [1, 2, 1, 2, 2, 2], gain=0.65, clip=1, lpf=9000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: the mono lead hook, square wave with vibrato and a little glide.
    part('melody', 'Lead monofônico', 'phrase', synth('square'), [
        bars(bar('4 . 4 . 7 . 4 . 6 . 4 . 2 . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('4 . 4 . 7 . 4 . 6 . 4 . 2 . . .'), bar('2 . 2 . 5 . 2 . 4 . 2 . 0 . . .'), bar('1 . 1 . 3 . 1 . 6 . 5 . 3 . 1 .'), bar('2_ . . . . . . . 0 . . . . . . .')),
        bars(bar('7_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        # Chorus: the voice sings, so the lead only answers at the end of each bar.
        bars(bar('. . . . . . . . . . . . 9 . 11 .'), bar('. . . . . . . . . . . . 8 . 10 .'), bar('. . . . . . . . . . . . 7 . 9 .'), bar('. . . . . . . . 11~2 . 9 . 7 . 4 .')),
        bars(bar('4 . 4 . 7 . 4 . 6 . 4 . 2 . . .'), bar('2 . 2 . 5 . 2 . 4 . 2 . 0 . . .')),
        bars(bar('. . . . . . . . . . . . 9 . 11 .'), bar('. . . . . . . . . . . . 8 . 10 .'), bar('. . . . . . . . . . . . 7 . 9 .'), bar('. . . . . . . . 11~2 . 9 . 7 . 4 .')),
    ], [2, 4, 2, 4, 2, 4], octave=4, gain=0.25, attack=.006, decay=.25, sustain=.7, release=.1, gate=.7, clip=.95, lpf=3400, hpf=280,
        design={'vibrato': 5.5, 'vibratoDepth': .12, 'resonance': 2}, mapping={'fileDegrees': 0, 'panWidth': .15},
        arrangement=arrangement((True, False, True, True, True, True), restart=True), effects={'delay': .2, 'reverb': .2, 'pan': .15}),
    # f2 · pawn: high blip accents, the electronic 'ping' between phrases.
    part('rhythm', 'Blip agudo', 'pulse', machine('synth-blip'), [
        drums('.... .... .... ..x.'), drums('.... .... .... ..x. .... .... .... x.x.'), drums('.... .... .... ....'),
        drums('.... ..x. .... ..x.'), drums('.... .... ..x. ....'), drums('.... ..x. .... ..x. .... ..x. .... x.xx'),
    ], [1, 2, 1, 1, 1, 2], gain=.06, clip=.5, lpf=9000, hpf=500, effects={'delay': .3, 'reverb': .15, 'pan': .4}),
    # g1 · knight: glockenspiel-like triangle doubling the hook an octave up, sparse.
    part('response', 'Glockenspiel sintético', 'phrase', synth('triangle'), [
        bars(bar('7 . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . 4 . 6 .'), bar('. . . . . . . . . . . . 2 . 4 .'), bar('. . . . . . . . . . . . 3 . 6 .'), bar('7 . . . . . . . . . . . . . . .')),
        bars(bar('7 . . . 4 . . . 2 . . . 0 . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('9 . . . 7 . . . 9 . . . 11 . . .'), bar('8 . . . 6 . . . 8 . . . 10 . . .'), bar('7 . . . 4 . . . 7 . . . 9 . . .'), bar('11 . . . . . . . 7 . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . 4 . 2 . 0 . . .')),
        bars(bar('9 . . . 7 . . . 9 . . . 11 . . .'), bar('8 . . . 6 . . . 8 . . . 10 . . .'), bar('7 . . . 4 . . . 7 . . . 9 . . .'), bar('11 . . . . . . . 7 . . . . . . .')),
    ], [2, 4, 2, 4, 2, 4], octave=5, gain=0.16, attack=.002, decay=.35, sustain=.05, release=.4, gate=.3, clip=.9, lpf=7000, hpf=600,
        mapping={'fileDegrees': 0}, arrangement=arrangement(restart=True), effects={'reverb': .35, 'delay': .18, 'pan': -.4}),
    # g2 · pawn: closed synth tick in eighths, ghosted on the offbeats.
    part('rhythm', 'Tique metálico', 'pulse', machine('synth-tick'), [
        drums('.... .... x... ....'), drums('x.g. x.g. x.g. x.g.'), drums('x... x... x... x...'),
        drums('x.gx x.g. x.gx x.g.'), drums('x.g. x.g. x.g. x.g.'), drums('x.gx x.gx x.gx x.gx'),
    ], [1] * 6, gain=0.25, clip=.6, lpf=12000, hpf=3000, effects={'reverb': .04, 'pan': .3}),
    # h1 · rook: filtered white-noise 'wind' sweeping slowly; it marks breaks and transitions.
    part('texture', 'Vento de ruído', 'sustain', synth('white'), [
        bars(bar('0_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . 0_ . . . . . . .')),
        bars(bar('0_ . . . . . . . . . . . . . . .'), bar('0_ . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . 0_ . . .')),
        bars(bar('0_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . 0_ . . . . . . .')),
    ], [2] * 6, octave=3, gain=0.05, attack=.8, decay=1, sustain=.8, release=1.2, gate=.95, clip=1, lpf=1200, hpf=400,
        design={'lfoTarget': 'lpf', 'lfoRate': 2, 'lfoUnit': 'bars', 'lfoDepth': .8, 'lfoShape': 'sine', 'resonance': 8, 'role': 'fx'},
        arrangement=arrangement(restart=False), effects={'reverb': .4, 'pan': -.1}),
    # h2 · pawn: syndrum toms, falling pitch; they fill the end of each section.
    part('rhythm', 'Tom sintético', 'pulse', machine('808-tom-high'), [
        drums('.... .... .... ....'), drums('.... .... .... ....'), drums('.... .... .... x.x.'),
        drums('.... .... .... ....'), drums('.... .... .... ..x.'), drums('.... .... x.x. xxxx'),
    ], [1] * 6, gain=.12, clip=.8, lpf=6000, hpf=60, pitchEnvelope=-5, pitchAttack=.12, effects={'reverb': .25, 'pan': -.2},
        arrangement=arrangement(fills=(5, 5, None, 5, 5, None))),
]

profile = {
    'name': 'Kling Klang · synth-pop 1978', 'bpm': 125, 'root': 'C', 'scale': 'Menor natural', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions([
        # The song form follows the game: a thin intro, the verse in the middlegame, the chorus as the stakes rise.
        rule('dus-opening', 'opening', 'both', 1, True, [act('variation', 0), act('lpf', 2800, rampBars=4)]),
        rule('dus-middle', 'middle', 'both', 1, True, [act('variation', 1)]),
        rule('dus-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 6)]),
        rule('dus-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('dus-check', 'check', 'actor', 1, True, [act('variation', 3), act('activate')]),
        rule('dus-capture', 'capture', 'actor', 1, False, [act('gain', 4)], 'drums'),
        rule('dus-quiet', 'quiet', 'both', 2, True, [act('variation', 2), act('lpf', 1600, rampBars=2)]),
        # Machine precision: a hanging piece makes the lead echo, a swing shifts key like a modulation.
        rule('dus-hanging', 'hangingPiece', 'actor', 1, False, [act('delay', .45)], 'lead'),
        rule('dus-swing', 'evalSwing', 'both', 2, True, [act('transpose', 2)]),
        rule('dus-tension', 'tension', 'both', 1, True, [act('lpf', 1800, rampBars=8), act('resonance', 12)], 'lead'),
        rule('dus-promotion', 'promotion', 'both', 2, True, [act('scaleShift', 0, shift='lift'), act('variation', 5)]),
    ]),
    'reference': 'Kraftwerk — Die Mensch-Maschine (1978), "The Model": som e forma de referência; melodias e harmonias originais',
    'url': 'https://en.wikipedia.org/wiki/The_Model_(Kraftwerk_song)',
}
write('dusseldorf', profile)
