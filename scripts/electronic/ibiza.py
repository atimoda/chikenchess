"""Ibiza 1986 · Balearic Beat: an original warm, spacious club arrangement.

110 BPM: Linn kick/snare, hand percussion and a syncopated round bass carry the
floor. Nylon phrases trade places with a filtered synth; piano ninths, muted
guitar and a slow pad enter in separate scenes. No continuous marimba/flute
ostinato. Eight scenes follow the Dubstep kit's contrast, not its half-time beat.
D major: Dmaj9–Bm7–Gmaj7–Aadd9. Degrees 0 D, 1 E, 2 F#, 3 G, 4 A, 5 B, 6 C#.
"""
from kit import (expanded_form, act, arrangement, bar, bars, drums, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('D', 'Bm', 'G', 'A')
VAMP = ('D', 'D', 'G', 'G')
BRIDGE = ('Bm', 'G', 'D', 'A')
ROOT = {'D': 0, 'Bm': -2, 'G': -4, 'A': -3}
CHORD = {'D': '2,4,6,8', 'Bm': '0,2,4,5', 'G': '0,2,3,5', 'A': '1,4,6,8'}
PAD = {'D': '0,4,6', 'Bm': '-2,2,4', 'G': '-4,0,2', 'A': '-3,1,4'}
SILENT = drums('.' * 16)
REST4 = bars(*[SILENT] * 4)


def bass(chord, variant=0):
    r = ROOT[chord]
    return bar([
        f'{r}_ . . . 0?0 . . . . . {r + 4} . {r}_ . 0?0 .',
        f'{r} . . {r} . . {r + 4} . . . {r + 7} . {r} . . .',
        f'{r}_ . . . . . . . 0?0 . . . . . . .',
    ][variant])


def keys(chord, variant=0):
    c = CHORD[chord]
    return bar([
        f'{c}_ . . . . . . . 0?0 . . . . . . .',
        f'. . {c} . . . . . . . {c} . . . . .',
        f'{c} . . . . . {c} . . . . . . {c} . .',
    ][variant])


def pad(chord):
    return bar(f'{PAD[chord]}_ . . . . . . . . . . . 0?0 . . .')


def guitar(chord):
    c = CHORD[chord]
    return bar(f". . . {c}' . . {c} . . . . . . {c}' . .")


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


HOOK = bars(bar('4_ . . . 2 . 1 . 0_ . . . 0?0 . . .'), SILENT,
            bar('2_ . . . 3 . 5 . 4_ . . . 0?0 . . .'), SILENT)
LIFT = bars(bar('4_ . . . 6 . 7 . 9_ . 7 . 0?0 . . .'), SILENT,
            bar('5_ . . . 4 . 3 . 2_ . . . 0?0 . . .'), bar('. . . . . . . . 1 . 2 . 4_ . 0?0 .'))
ANSWER = bars(SILENT, bar('. . . . . . . . 2_ . . . 0_ . 0?0 .'),
              SILENT, bar('. . . . . . . . 4_ . 2 . 1_ . 0?0 .'))
KICK = drums('X... x... X... x... X... x... X... x..g')
SNARE = drums('.... X... .... X... .... X... ...g X...')
parts = [
    # a1 · rook: low choir appears only in the spacious scenes.
    part('texture', 'Coro da brisa', 'sustain', recorded('synths', 'analog-pad'), [
        prog(pad, VAMP), REST4, prog(pad, BRIDGE), REST4, prog(pad, VAMP), REST4,
    ], [4] * 6, octave=3, gain=.035, attack=.6, decay=.8, sustain=.7, release=.7, lpf=1800, hpf=300,
        design={'role': 'pad'}, arrangement=arrangement((True, False, True, False, True, False)), effects={'reverb': .35, 'pan': -.25}),
    # a2 · pawn: cabasa leaves the offbeat hat its own space.
    part('rhythm', 'Cabasa Linn', 'pulse', machine('linn-cabasa'), [
        drums('x... .g.. x... .g..'), drums('xg.. xg.. xg.. xg.g'), SILENT,
        drums('xg.. xg.g xg.. xg..'), drums('x... .... x... ....'), drums('xg.. xg.g xg.. xg.g'),
    ], [1] * 6, gain=.3, clip=.5, lpf=8500, hpf=2500, effects={'reverb': .04, 'pan': .3}),
    # b1 · knight: muted electric guitar, not an uninterrupted arpeggio.
    part('response', 'Guitarra no contratempo', 'phrase', recorded('guitars', 'muted'), [
        REST4, prog(guitar, LOOP), REST4, prog(guitar, LOOP), prog(guitar, VAMP), prog(guitar, LOOP),
    ], [4] * 6, octave=3, gain=.18, gate=.4, attack=.003, release=.08, lpf=3500, hpf=250,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True)), effects={'reverb': .12, 'pan': .35}),
    # b2 · pawn: a dry backbeat with one small pickup in two bars.
    part('rhythm', 'Caixa Linn', 'pulse', machine('linn-snare'), [
        drums('.' * 32), SNARE, drums('.' * 32), SNARE, drums('.... .... .... X... .... .... .... X...'),
        drums('.... X... .... X... .... X... .... X.gx'),
    ], [2] * 6, gain=.34, clip=.8, lpf=7200, hpf=200, effects={'reverb': .16, 'pan': 0}),
    # c1 · bishop: ninths and sevenths, with one answer per half-bar.
    part('harmony', 'Piano de horizonte', 'phrase', recorded('band', 'piano'), [
        prog(keys, VAMP), prog(keys, LOOP, 1), prog(keys, BRIDGE), prog(keys, LOOP, 2), prog(keys, VAMP), prog(keys, LOOP, 2),
    ], [4] * 6, octave=3, gain=.15, attack=.005, decay=.5, sustain=.3, release=.25, gate=.7, lpf=4800, hpf=180,
        mapping={'fileDegrees': 0}, effects={'reverb': .24, 'delay': .12, 'pan': -.15}),
    # c2 · pawn: a light offbeat tambourine opens the chorus.
    part('rhythm', 'Pandeirola Linn', 'pulse', machine('linn-tambourine'), [
        SILENT, SILENT, SILENT, drums('..x. .... ..x. ....'), SILENT, drums('..x. ..g. ..x. ..g.'),
    ], [1] * 6, gain=.18, clip=.5, lpf=8500, hpf=2500, effects={'reverb': .08, 'pan': -.3}),
    # d1 · queen: a singable nylon hook with a full bar reserved for each answer.
    part('melody', 'Violão de Amnesia', 'phrase', recorded('guitars', 'nylon'), [
        REST4, HOOK, REST4, LIFT, HOOK, bars(
            bar('4_ . . . 6 . 7 . 9_ . 7 . 0?0 . . .'), SILENT,
            bar('5_ . . . 4 . 3 . 2_ . . . 0?0 . . .'), bar('. . . . . . 1 . 2 . 4 . 7_ . 0?0 .')),
    ], [4] * 6, octave=3, gain=.36, attack=.004, decay=.5, sustain=.35, release=.2, gate=.8, lpf=5200, hpf=150,
        mapping={'fileDegrees': 0, 'panWidth': .08}, arrangement=arrangement((False, True, False, True, True, True)),
        effects={'reverb': .24, 'delay': .14, 'pan': 0}),
    # d2 · pawn: warm syncopation locks with the Linn kick.
    part('bass', 'Baixo balearic', 'phrase', recorded('strings', 'bass-round'), [
        prog(bass, VAMP, 2), prog(bass, LOOP), prog(bass, BRIDGE, 2), prog(bass, LOOP, 1), prog(bass, VAMP), prog(bass, LOOP, 1),
    ], [4] * 6, octave=2, gain=.6, attack=.005, decay=.35, sustain=.6, release=.1, gate=.7, lpf=1000, hpf=30,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # e1 · king: sustained harmony belongs to the lift, not every scene.
    part('texture', 'Pad do amanhecer', 'sustain', synth('triangle'), [
        REST4, REST4, prog(pad, BRIDGE), prog(pad, LOOP), REST4, prog(pad, LOOP),
    ], [4] * 6, octave=3, gain=.07, attack=.4, decay=.8, sustain=.65, release=.6, lpf=1600, hpf=220,
        design={'role': 'pad'}, arrangement=arrangement((False, False, True, True, False, True)), effects={'reverb': .35, 'pan': .2}),
    # e2 · pawn: straight dance pulse, removed for the break.
    part('rhythm', 'Bumbo Linn', 'pulse', machine('linn-kick'), [
        drums('X... .... x... .... X... .... x... ....'), KICK, drums('.' * 32), KICK,
        drums('X... .... x... .... X... .... x... ....'), KICK,
    ], [2] * 6, gain=.68, clip=.6, lpf=7500, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: warm filtered synth replies only when the guitar rests.
    part('response', 'Resposta do horizonte', 'phrase', synth('triangle'), [
        ANSWER, ANSWER, HOOK, ANSWER, REST4, ANSWER,
    ], [4] * 6, octave=4, gain=.14, attack=.025, decay=.3, sustain=.4, release=.16, gate=.8, lpf=2200, hpf=300,
        design={'role': 'lead'}, mapping={'fileDegrees': 0}, effects={'reverb': .25, 'delay': .22, 'pan': -.3}),
    # f2 · pawn: open hat; cabasa occupies the intervening beats.
    part('rhythm', 'Chimbal aberto', 'pulse', recorded('percussion', 'open-hat', pitched=False), [
        SILENT, drums('..x. ..x. ..x. ..x.'), SILENT, drums('..x. ..x. ..x. ..x.'), SILENT, drums('..x. ..x. ..x. ..x.'),
    ], [1] * 6, gain=.22, clip=.5, lpf=8000, hpf=2500, effects={'reverb': .06, 'pan': .2}),
    # g1 · knight: a low nylon figure bridges the percussion-only passages.
    part('harmony', 'Nylon dedilhado', 'phrase', recorded('guitars', 'nylon'), [
        bars(bar('0 . . . 4 . . . 6 . . . 4 . . .'), SILENT, bar('3 . . . 5 . . . 7 . . . 5 . . .'), SILENT),
        REST4, prog(guitar, BRIDGE), REST4, prog(guitar, VAMP), REST4,
    ], [4] * 6, octave=3, gain=.2, gate=.7, lpf=4000, hpf=200, mapping={'fileDegrees': 0}, effects={'reverb': .2, 'pan': .3}),
    # g2 · pawn: congas alternate a question and a small closing variation.
    part('rhythm', 'Congas da ilha', 'pulse', recorded('percussion', 'conga', pitched=False), [
        drums('.... ..x. .... x... .... ..x. .... ..x.'), drums('...g ..x. ...g x... ...g ..x. .... x.x.'), drums('.' * 32),
        drums('...g ..x. .x.g x... ...g ..x. .x.. x.x.'), drums('.... ..x. .... x... .... ..x. .... ..x.'),
        drums('...g ..x. .x.g x... ...g ..x. .x.. x.xx'),
    ], [2] * 6, gain=.25, clip=.75, lpf=6500, hpf=120, effects={'reverb': .12, 'pan': -.4}),
    # h1 · rook: a soft transition breath once per eight bars.
    part('texture', 'Brisa de transição', 'sustain', synth('pink'), [
        bars(*[SILENT] * 7, bar('0_ . . . . . . . 0?0 . . . . . . .')),
    ] * 6, [8] * 6, gain=.025, attack=.7, decay=.6, sustain=.3, release=.5, lpf=1200, hpf=400,
        design={'role': 'fx'}, arrangement=arrangement((True, False, True, False, True, False)), effects={'reverb': .2, 'pan': -.15}),
    # h2 · pawn: bongo turnaround at the end of four bars.
    part('rhythm', 'Bongôs de virada', 'pulse', recorded('percussion', 'bongo', pitched=False), [
        REST4, drums('.' * 56 + '..x.x...'), REST4, drums('.' * 56 + 'x..xx.x.'), REST4, drums('.' * 56 + 'x.xx..xx'),
    ], [4] * 6, gain=.23, clip=.7, lpf=6000, hpf=180, effects={'reverb': .12, 'pan': .35}),
]
profile = {
    'name': 'Amnesia · Balearic Beat 1986', 'bpm': 110, 'root': 'D', 'scale': 'Maior', 'harmony': 'static',
    'swing': .04, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions([
        rule('ibz-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('ibz-middle', 'middle', 'both', 1, True, [act('gain', 1)]),
        rule('ibz-endgame', 'endgame', 'both', 1, True, [act('gain', 2)]),
        rule('ibz-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('ibz-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 3)]),
        rule('ibz-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('ibz-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('delay', .25)]),
        rule('ibz-capture', 'capture', 'actor', 1, False, [act('gain', 2)], 'drums'),
        rule('ibz-tension', 'tension', 'both', 1, True, [act('lpf', 1300, rampBars=8)], 'pad'),
        rule('ibz-drought', 'captureDrought', 'both', 2, True, [act('delay', .22)], 'lead'),
        rule('ibz-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5)]),
    ]),
    'reference': 'Balearic beat de Ibiza (Alfredo no Amnesia, 1986–87): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Balearic_beat',
}

# G is a percussive guitar hook; H shifts into a minor, half-time island bridge.
HOOK_CHORDS = ('G', 'A', 'Bm', 'A')
MINOR_BRIDGE = ('Bm', 'Bm', 'G', 'A')

def dancing_nylon(chord):
    r = ROOT[chord]
    return bar(f'{r + 7}! . {r + 9} . . {r + 11} . {r + 9} . . {r + 7} . {r + 4}_ . 0?0 .')

def bridge_nylon(chord):
    r = ROOT[chord]
    return bar(f'{r + 7}_ . . . . . {r + 9} . {r + 11}_ . . . 0?0 . . .')

expanded_form(profile, order=[0, 1, 6, 3, 2, 7, 4, 5],
    labels=profile['sectionLabels'] + ['Hook', 'Bridge'],
    lengths=profile['sections'] + [32, 32],
    roots=[[ROOT[c] for c in chords] for chords in [VAMP, LOOP, BRIDGE, LOOP, VAMP, LOOP, HOOK_CHORDS, MINOR_BRIDGE]],
    additions={
        'a1': (None, prog(pad, MINOR_BRIDGE)),
        'a2': (drums('xg.x .g.x xg.x .g.x' * 3 + 'xg.x .g.x xg.. ....'), drums('x... .... .... ....' * 4)),
        'b1': (prog(guitar, HOOK_CHORDS), None),
        'b2': (drums('.... X... .... X...' * 3 + '.... X... ..g. X..x'), drums('.... .... X... ....' * 4)),
        'c1': (prog(keys, HOOK_CHORDS, 2), prog(keys, MINOR_BRIDGE)),
        'c2': (drums('..x. ..g. ..x. ..g.' * 4), None),
        'd1': (prog(dancing_nylon, HOOK_CHORDS), prog(bridge_nylon, MINOR_BRIDGE)),
        'd2': (prog(bass, HOOK_CHORDS, 1), prog(bass, MINOR_BRIDGE, 2)),
        'e1': (None, None),
        'e2': (drums('X... x... X... x..g' * 3 + 'X... x... X.x. ....'), drums('X... .... .... ..x.' * 4)),
        'f1': (None, bars(SILENT, bar('. . . . . . . . 2_ . . . 0_ . 0?0 .'), SILENT, bar('. . . . . . . . 1_ . 4 . 6_ . 0?0 .'))),
        'f2': (drums('..x. ..x. ..x. ..x.' * 4), None),
        'g1': (None, None),
        'g2': (drums('...g ..x. .x.g x.x.' * 3 + '...g ..x. .x.x ..xx'), drums('.... ..x. .... ....' * 3 + '.... ..x. .... ..x.')),
        'h1': (None, None),
        'h2': (drums('.... .... .... ..x. .... .... ..x. x.x. .... .... .... ..x. .... .... x.x. xx.x'), None),
    })

write('ibiza', profile)
