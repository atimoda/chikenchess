"""London 1992 · Jungle sound-system study (original material).

165 BPM chopped breakbeat: a two-bar break pattern split across kick, snare,
ghost notes, hats, open hat and ride, so each pawn carries one slice and fills
ratchet the snare. A sine sub bass with long slides, a restrained mid-bass, offbeat organ,
short dub calls and atmosphere. Four-bar break conversations leave room for
the bass, with edited turnarounds instead of an all-bar snare roll. D natural minor; a new half-time bridge opens on Bb–C.
Degrees: 0 D · 1 E · 2 F · 3 G · 4 A · 5 Bb · 6 C · 7 D'.
"""
from kit import (expanded_form, act, arrangement, bar, bars, drums, electronic, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Dm', 'Dm', 'C', 'Dm')
DRONE = ('Dm', 'Dm', 'Dm', 'Dm')
ROOT = {'Dm': 0, 'Bb': -2, 'C': -1}
VOICING = {'Dm': '2,4,7', 'Bb': '2,5,7', 'C': '1,4,6'}
PAD = {'Dm': '0,2,4', 'Bb': '-2,0,2', 'C': '-1,1,4'}


def sub(chord, variant=0):
    r = ROOT[chord]
    shapes = [
        f'{r}_ . . . . . 0?0 . . . {r + 7}_ . . . 0?0 .',
        f'{r}_ . . . . . . . 0?0 . . . {r}~-5 . . .',
        f'{r}_ . . . 0?0 . {r + 7} . . . {r}_ . . . 0?0 .',
    ]
    return bar(shapes[variant])


def stabs(chord, variant=0):
    c = VOICING[chord]
    shapes = [f'{c}! . . . . . . . . . . . . . . .', f'{c}! . . {c} . . . . . . {c} . . . . .', f'. . . . . . {c} . . . {c} . . . {c} .']
    return bar(shapes[variant])


def pad(chord):
    return bar(f'{PAD[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


# Four-bar break edits: snare displacement, ghost-note answers and one turnaround.
KICK = drums('X.x. .... ..x. .... ..x. .... x... ..x. X... ..x. ..x. .... ..x. .... x.x. ....')
KICK_B = drums('X.x. .... ..x. .... ..x. .... x.x. .... X... ..x. ..x. .x.. ..x. .... x... ...x')
SNARE = drums('.... X... .... X... .... X... ...X .... .... X... .... X... .... X..g ..X. X...')
SNARE_FILL = drums('.... X... .... X... .... X... ...X .... .... X... ..g. X... .... X... ..X. .rX.')
GHOST = drums('.... ...g .g.. .... .g.. ...g .g.. ..g. .... ...g .g.. ...g .g.. ..g. .... ...g')
HATS = drums('x.x. ..x. x.x. ..x. x.x. x... x.x. ..x. x.x. ..x. x.x. ..x. x.x. x... ..x. x..g')
SILENT2 = drums('.' * 32)
SILENT = drums('.' * 16)
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: one dub call in eight bars, saved for drops.
    part('texture', 'Sirene dub', 'pulse', electronic('dub-siren'), [
        drums('.' * 128), drums('.' * 128), drums('.' * 128), drums('x' + '.' * 127), drums('.' * 128), drums('.' * 64 + 'x' + '.' * 63),
    ], [8] * 6, gain=.17, clip=.8, lpf=3000, hpf=450, design={'role': 'fx'},
        arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .25, 'delay': .28, 'pan': -.3}),
    # a2 · pawn: break ride slice.
    part('rhythm', 'Ride do break', 'pulse', machine('break-ride'), [
        SILENT2, drums('x... x... x... x... x... x... x... x...'), SILENT2, drums('x... .... x... .... x... .... .... x...'),
        drums('x... .... x... .... x... .... x... ....'), drums('x... .... x... .... x... .... .... x...'),
    ], [2] * 6, gain=.12, clip=.7, lpf=8000, hpf=2500, effects={'reverb': .1, 'pan': .3}),
    # b1 · knight: short offbeat dub chords answer the sub; no rave wall.
    part('response', 'Órgão dub', 'phrase', synth('square'), [
        REST4, bars(SILENT, stabs('Dm', 2), SILENT, stabs('Dm', 2)), REST4,
        bars(stabs('Dm', 2), SILENT, stabs('C', 2), SILENT), REST4,
        bars(SILENT, stabs('Dm', 2), SILENT, stabs('Dm', 2)),
    ], [4] * 6, octave=3, gain=.1, attack=.004, decay=.16, sustain=.12, release=.1, gate=.35, lpf=1400, hpf=300,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True)),
        design={'delayTime': '3/16', 'delayFeedback': .3}, effects={'reverb': .18, 'delay': .25, 'pan': .3}),
    # b2 · pawn: the backbeat is cut/reordered over four bars, not doubled by a roll loop.
    part('rhythm', 'Caixa do break', 'pulse', machine('break-snare'), [
        REST4, SNARE, drums('.' * 56 + '....x..g'), SNARE, SNARE, SNARE_FILL,
    ], [4] * 6, gain=.54, clip=.75, lpf=9000, hpf=160, effects={'reverb': .08, 'pan': 0}),
    # c1 · bishop: soft piano recalls the opening only in the breakdown.
    part('harmony', 'Piano na neblina', 'phrase', recorded('band', 'piano', 1), [
        bars(stabs('Dm', 0), SILENT, stabs('C', 0), SILENT), REST4,
        bars(stabs('Dm', 0), SILENT, stabs('C', 0), SILENT), REST4, prog(stabs, DRONE, 0), REST4,
    ], [4] * 6, octave=3, gain=.12, attack=.005, decay=.4, sustain=.2, release=.3, gate=.5, lpf=3800, hpf=250,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, False, True, False)), effects={'reverb': .32, 'pan': -.2}),
    # c2 · pawn: gaps and unequal accents keep the break from sounding like a drum machine.
    part('rhythm', 'Chimbal do break', 'pulse', machine('break-hat'), [
        drums('..x. .... ..x. ....' * 4), HATS, REST4, HATS,
        drums('x... ..x. x... ..x.' * 4), drums('x.x. ..x. x.x. ..x. x.x. x... x.x. ..x. x.x. ..x. x.x. ..x. x.x. x..g ..x. xg..'),
    ], [4] * 6, gain=.4, clip=.5, lpf=10000, hpf=3500, effects={'reverb': .03, 'pan': .15}),
    # d1 · queen: a low, spaced sound-system call replaces the high hoover hook.
    part('melody', 'Chamada jungle', 'phrase', synth('triangle'), [
        REST4,
        bars(bar('4_ . . . 2 . 0 . 0?0 . . . . . . .'), SILENT, bar('6_ . . . 4 . 3 . 0?0 . . . . . . .'), SILENT),
        REST4,
        bars(bar('7_ . . . 4 . 2 . 0?0 . . . . . . .'), SILENT, bar('6_ . . . 4 . 3 . 0?0 . . . . . . .'), SILENT),
        bars(bar('4_ . . . . . . . 0?0 . . . . . . .'), *[SILENT] * 3),
        bars(bar('7_ . . . 4 . 2 . 0?0 . . . . . . .'), SILENT, bar('6_ . . . 4 . 3 . 0?0 . . . . . . .'), bar('. . . . . . . . 2 . 0 . 0?0 . . .')),
    ], [4] * 6, octave=3, gain=.16, attack=.01, decay=.3, sustain=.45, release=.18, gate=.8, lpf=2200, hpf=220,
        mapping={'fileDegrees': 0, 'panWidth': .05}, arrangement=arrangement((False, True, False, True, True,True)),
        design={'delayTime': '3/16', 'delayFeedback': .35}, effects={'reverb': .2, 'delay': .22, 'pan': 0}),
    # d2 · pawn: sine sub with long slides.
    part('bass', 'Sub jungle', 'phrase', synth('sine'), [
        REST4, prog(sub, LOOP, 0), prog(sub, DRONE, 1), prog(sub, LOOP, 2), prog(sub, LOOP, 1), prog(sub, LOOP, 2),
    ], [4] * 6, octave=1, gain=.42, attack=.005, decay=.6, sustain=.8, release=.12, gate=.9, clip=.95, lpf=250, hpf=25,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # e1 · king: breathy atmosphere pad.
    part('texture', 'Pad atmosférico', 'sustain', electronic('vox-pad', True), [
        prog(pad, LOOP), prog(pad, LOOP), prog(pad, DRONE), prog(pad, LOOP), prog(pad, LOOP), prog(pad, LOOP),
    ], [4] * 6, octave=3, gain=.045, attack=.8, decay=1, sustain=.85, release=1.2, gate=.97, clip=1, lpf=2600, hpf=250,
        design={'role': 'pad'}, arrangement=arrangement((True, False, True, False, True, True), restart=False), effects={'reverb': .5, 'pan': .2}),
    # e2 · pawn: the kick follows the edits while leaving space for the sub.
    part('rhythm', 'Bumbo do break', 'pulse', machine('break-kick'), [
        drums('X... .... .... ....' * 4), KICK, REST4, KICK_B, KICK, KICK_B,
    ], [4] * 6, gain=.62, clip=.6, lpf=8000, hpf=30, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: detuned Reese bass, mid layer over the sub.
    part('harmony', 'Reese', 'phrase', synth('sawtooth'), [
        REST4, REST4, prog(sub, DRONE, 0), prog(sub, LOOP, 1), prog(sub, LOOP, 0), prog(sub, LOOP, 1),
    ], [4] * 6, octave=2, gain=.12, attack=.01, decay=.6, sustain=.8, release=.2, gate=.9, clip=.95, lpf=700, hpf=150,
        design={'unison': 3, 'detune': .25, 'spread': .2, 'role': 'bass', 'lfoTarget': 'lpf', 'lfoRate': 2, 'lfoUnit': 'bars', 'lfoDepth': .4},
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .05, 'pan': 0}),
    # f2 · pawn: quiet snare detail in the gaps of the main edited break.
    part('rhythm', 'Ghost notes', 'pulse', machine('break-ghost'), [
        REST4, GHOST, REST4, GHOST, GHOST, drums('.... ...g .g.. .... .g.. ...g .g.. ..g. .... ...g .g.g ...g .g.. ..g. .... g...'),
    ], [4] * 6, gain=.35, clip=.5, lpf=7500, hpf=300, effects={'reverb': .04, 'pan': -.12}),
    # g1 · knight: a single vinyl response per four-bar phrase.
    part('response', 'Scratch de resposta', 'pulse', electronic('scratch'), [
        REST4, drums('.' * 60 + 'x...'), REST4, drums('.' * 60 + 'x.x.'), REST4, drums('.' * 60 + '.xx.'),
    ], [4] * 6, gain=.14, clip=.6, lpf=4500, hpf=500, design={'role': 'fx'}, effects={'reverb': .08, 'pan': -.35}),
    # g2 · pawn: break open hat.
    part('rhythm', 'Chimbal aberto do break', 'pulse', machine('break-open-hat'), [
        SILENT2, drums('.' * 14 + 'x.' + '.' * 14 + 'x.'), SILENT2, drums('......x. ......x. ......x. ......x.'), drums('.' * 30 + 'x.'), drums('......x. ......x. ......x. ....x.x.'),
    ], [2] * 6, gain=.3, clip=.7, lpf=9000, hpf=3000, effects={'reverb': .08, 'pan': .35}),
    # h1 · rook: reverse cymbal into each section.
    part('texture', 'Prato reverso', 'pulse', electronic('reverse-cymbal'), [
        drums('.' * 48 + 'X' + '.' * 15), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 64), drums('.' * 48 + 'X' + '.' * 15), drums('.' * 64),
    ], [4] * 6, gain=.12, clip=1, lpf=5500, hpf=500, design={'role': 'fx'}, effects={'reverb': .2, 'pan': .2}),
    # h2 · pawn: an isolated fill after three quiet bars, not relentless snare ratchets.
    part('rhythm', 'Recorte de caixa', 'pulse', machine('break-snare'), [
        REST4, REST4, drums('.' * 56 + 'x..g..r.'), REST4, REST4, drums('.' * 56 + '.g...r..'),
    ], [4] * 6, gain=.22, clip=.65, lpf=8000, hpf=250, effects={'reverb': .1, 'pan': -.1}),

]

profile = {
    'name': 'London · Jungle 1992', 'bpm': 165, 'root': 'D', 'scale': 'Menor natural', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Drop', 'Interlude', 'Drop'],
    'parts': parts,
    'reactions': reactions([
        rule('ldn-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('ldn-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('ldn-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 2)]),
        rule('ldn-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # 'Rewind!': a check spins the record back to the drop.
        rule('ldn-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 3)]),
        rule('ldn-capture', 'capture', 'actor', 1, False, [act('gain', 2)], 'drums'),
        rule('ldn-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('lpf', 900, rampBars=2)]),
        rule('ldn-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('ldn-tension', 'tension', 'both', 1, True, [act('lpf', 400, rampBars=8)], 'bass'),
        rule('ldn-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('delay', .25)], 'fx'),
        rule('ldn-drought', 'captureDrought', 'both', 2, True, [act('delay', .35)]),
    ]),
    'reference': 'Jungle londrino e cultura sound-system (Rufige Kru, Shut Up and Dance): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Jungle_music',
}

# G trades a new syncopated call with a stop/start break; H is half-time dub in Bb.
HOOK_CHORDS = ('Dm', 'Bb', 'C', 'Dm')
DUB_BRIDGE = ('Bb', 'Bb', 'C', 'C')

def hook_call(chord):
    r = ROOT[chord]
    return bar(f'{r + 7}! . . {r + 4} . . {r + 2} . . . {r + 4}! . {r}_ . 0?0 .')

def bridge_piano(chord):
    r = ROOT[chord]
    return bar(f'{r + 7}_ . . . {r + 9}_ . . . {r + 11}_ . . . 0?0 . . .')

expanded_form(profile, order=[0, 1, 6, 3, 2, 7, 4, 5],
    labels=profile['sectionLabels'] + ['Hook', 'Bridge'],
    lengths=profile['sections'] + [32, 32],
    roots=[[ROOT[c] for c in chords] for chords in [LOOP, LOOP, DRONE, LOOP, LOOP, LOOP, HOOK_CHORDS, DUB_BRIDGE]],
    additions={
        'a1': (None, None),
        'a2': (drums('x... .... .... x...' * 4), None),
        'b1': (bars(SILENT, stabs('Bb', 2), SILENT, stabs('Dm', 2)), prog(stabs, DUB_BRIDGE, 0)),
        'b2': (drums('.... X... ...X .... .... X..g ..X. X... .... X... .... X... .... ..X. X..r ....'), drums('.... .... X... ....' * 3 + '.... .... X... ..g.')),
        'c1': (None, prog(bridge_piano, DUB_BRIDGE)),
        'c2': (drums('x.x. ..x. x... ..x. x.x. x..g ..x. x... x.x. ..x. x.x. ..x. x.x. ..x. xg.. ....'), drums('x... .... ..x. ....' * 4)),
        'd1': (prog(hook_call, HOOK_CHORDS), None),
        'd2': (prog(sub, HOOK_CHORDS, 2), prog(sub, DUB_BRIDGE, 1)),
        'e1': (None, prog(pad, DUB_BRIDGE)),
        'e2': (drums('X..x .... ..x. .... ..x. .... X.x. .... X... ..x. ..x. ...x X.x. .... ..x. ....'), drums('X... .... .... ..x.' * 3 + 'X... .... .... ....')),
        'f1': (None, None),
        'f2': (drums('.... ...g .g.. .... .g.. .... .g.. ..g.' * 2), None),
        'g1': (drums('.' * 28 + 'x...' + '.' * 28 + 'x.x.'), None),
        'g2': (drums('......x. ......x.' * 3 + '......x. ........'), None),
        'h1': (None, drums('.' * 48 + 'X' + '.' * 15)),
        'h2': (drums('.' * 56 + '.g...r..'), None),
    })

write('london', profile)
