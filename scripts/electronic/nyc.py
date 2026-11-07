"""New York 1977 · disco in the Chic/Loft tradition (original material, no transcription).

120 BPM four-on-the-floor on a recorded kit, open hat on every offbeat, syncopated
octave bass, chicken-scratch guitar in 16ths, piano offbeats with space for answers,
a warm string section on the queen and brass stabs in the chorus. A Dorian: the i7–IV7 vamp
(Am7–D7) that disco borrowed from soul.
Degrees: 0 A · 1 B · 2 C · 3 D · 4 E · 5 F# · 6 G · 7 A'.
"""
from kit import (expanded_form, act, arrangement, bar, bars, drums, part, reactions, recorded, rule, write)

VERSE = ('Am7', 'D7', 'Am7', 'D7')
CHORUS = ('G', 'Am7', 'G', 'D7')
BRIDGE = ('Em7', 'D7', 'C', 'D7')
ROOT = {'Am7': 0, 'D7': -4, 'G': -1, 'Em7': -3, 'C': -5}
VOICING = {'Am7': '2,4,6', 'D7': '2,3,5', 'G': '1,3,6', 'Em7': '1,3,4', 'C': '2,4,6'}   # close voicings around middle C
LOW = {'Am7': '0,4', 'D7': '-4,0', 'G': '-1,3', 'Em7': '-3,1', 'C': '-5,-1'}


def bass(chord, push=False):
    r = ROOT[chord]
    cells = [r, '.', '.', r, '.', '.', r + 7, '.', '.', r + 6, '.', r + 4, '.', r + 2, '.', '.']
    if push:
        cells[14] = r + 1
    return bar(' '.join(str(c) for c in cells))


def scratch(chord):
    """Chicken-scratch: muted 16ths, the chord rings on the 'e' and 'a' accents."""
    c = VOICING[chord]
    return bar(f". {c}! . . . {c}' {c} . . {c}! . . . {c}' {c} .")


def piano(chord):
    c = VOICING[chord]
    return bar(f'{c} . . . . . {c} . . . . . . {c} . .')


def stabs(chord):
    c = VOICING[chord]
    return bar(f'. . {c}! . . . . . . . {c} . {c}! . . .')


def pad(chord):
    return bar(f'{LOW[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, **kw):
    return bars(*(fn(c, **kw) if kw else fn(c) for c in chords))


KICK = drums('X... x... X... x...')
SNARE = drums('.... X... .... X...')
parts = [
    # a1 · rook: a low, short flute answer; no sustained high ostinato.
    part('melody', 'Flauta do terraço', 'phrase', recorded('classical', 'flute-sustain'), [
        bars(bar('4_ . . . 2 . 0 . 0?0 . . . . . . .'), *[drums('.' * 16)] * 3),
        bars(*[drums('.' * 16)] * 3, bar('. . . . . . . . 4 . 2 . 0_ . 0?0 .')),
        bars(*[drums('.' * 16)] * 4),
        bars(*[drums('.' * 16)] * 3, bar('. . . . . . . . 5 . 4 . 2_ . 0?0 .')),
        bars(bar('4_ . . . 2 . 0 . 0?0 . . . . . . .'), drums('.' * 16), bar('3_ . . . 2 . 0 . 0?0 . . . . . . .'), drums('.' * 16)),
        bars(*[drums('.' * 16)] * 3, bar('. . . . . . . . 5 . 4 . 2_ . 0?0 .')),
    ], [4] * 6, octave=4, gain=.13, attack=.05, decay=.3, sustain=.65, release=.15, gate=.8, clip=.9, lpf=3800, hpf=300,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, False, False, True, True)), effects={'reverb': .22, 'pan': -.3}),
    # a2 · pawn: congas, the Latin heartbeat of the Loft.
    part('rhythm', 'Congas do Loft', 'pulse', recorded('percussion', 'conga', pitched=False), [
        drums('.... .... ..x. x...'), drums('..x. x.x. ..x. x..x'), drums('..x. .... ..x. ....'),
        drums('..x. x.xx ..x. x..x'), drums('..x. x.x. ..x. x..x'), drums('..xx x.xx ..xx x.xr'),
    ], [1] * 6, gain=0.25, clip=.9, lpf=9000, hpf=80, effects={'reverb': .1, 'pan': -.4}),
    # b1 · knight: string stabs in spiccato, the staccato answer.
    part('response', 'Cordas em staccato', 'phrase', recorded('classical', 'violin-spiccato'), [
        prog(stabs, VERSE), prog(stabs, VERSE), prog(stabs, BRIDGE), prog(stabs, CHORUS), prog(stabs, BRIDGE), prog(stabs, CHORUS),
    ], [4] * 6, octave=3, gain=.16, attack=.004, decay=.2, sustain=.3, release=.15, gate=.4, clip=.9, lpf=4800, hpf=250,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, False, False, True)), effects={'reverb': .25, 'pan': .3}),
    # b2 · pawn: snare on two and four, with ghost notes and fills.
    part('rhythm', 'Caixa da disco', 'pulse', recorded('percussion', 'snare', pitched=False), [
        drums('.... .... .... ....'), SNARE, drums('.... X... .... X..g'),
        drums('.... X... ...g X...'), SNARE, drums('.... X... .... X... .... X... ..g. XgXX'),
    ], [1, 1, 1, 1, 1, 2], gain=0.9, clip=.9, lpf=10000, hpf=120, effects={'reverb': .12, 'pan': .05},
        arrangement=arrangement((False, True, True, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: grand piano on the offbeats.
    part('harmony', 'Piano de salão', 'phrase', recorded('band', 'piano'), [
        prog(pad, VERSE), prog(piano, VERSE), prog(piano, BRIDGE), prog(piano, CHORUS), prog(piano, BRIDGE), prog(piano, CHORUS),
    ], [4] * 6, octave=3, gain=0.14, attack=.004, decay=.5, sustain=.4, release=.3, gate=.5, clip=.95, lpf=7000, hpf=120,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, True, False, True, True, True)), effects={'reverb': .2, 'pan': -.15}),
    # c2 · pawn: closed-hat pairs leave space for the offbeat open hat.
    part('rhythm', 'Chimbal de dezesseis', 'pulse', recorded('percussion', 'hat', pitched=False), [
        drums('x.x. x.x. x.x. x.x.'), drums('xg.. xg.. xg.. xg.g'), drums('x.x. x.x. x.x. x.x.'),
        drums('xg.. xg.. xg.. xg.g'), drums('xg.. xg.. xg.. xg.g'), drums('xg.. xg.. xg.. xg.g'),
    ], [1] * 6, gain=.3, clip=.8, lpf=9500, hpf=3000, effects={'reverb': .03, 'pan': .2}),
    # d1 · queen: the string section, the song's soaring hook.
    part('melody', 'Cordas Philadelphia', 'phrase', recorded('classical', 'violin-sustain', 1), [
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . 4 . 6 . 7 . 9 .')),
        bars(bar('7_ . . . . . . . . . . . 9 . 11 .'), bar('10_ . . . . . . . 9 . 7 . 5 . 4 .'), bar('7_ . . . . . . . 6 . 7 . 9 . 11 .'), bar('12_ . . . . . . . . . . . . . . .')),
        bars(bar('8_ . . . . . . . . . . . . . . .'), bar('7_ . . . . . . . . . . . . . . .'), bar('6_ . . . . . . . . . . . . . . .'), bar('5_ . . . . . . . 4 . 5 . 7 . 9 .')),
        bars(bar('8_ . . . . . . . 9 . 8 . 6 . 4 .'), bar('7_ . . . . . . . . . . . 4 . 6 .'), bar('8_ . . . 9 . . . 11 . . . 12 . . .'), bar('10_ . . . . . . . 9 . . . 7 . . .')),
        bars(bar('8_ . . . . . . . . . . . . . . .'), bar('7_ . . . . . . . . . . . . . . .'), bar('6_ . . . . . . . . . . . . . . .'), bar('5_ . . . . . . . 4 . 5 . 7 . 9 .')),
        bars(bar('11_ . . . . . . . 12 . 11 . 9 . 7 .'), bar('9_ . . . . . . . . . . . 7 . 9 .'), bar('11_ . . . 12 . . . 14 . . . 15 . . .'), bar('14_ . . . . . . . 12 . . . 10 . . .')),
    ], [4] * 6, octave=3, gain=.21, attack=.06, decay=.6, sustain=.85, release=.4, gate=.92, clip=.95, lpf=4300, hpf=200,
        mapping={'fileDegrees': 0, 'panWidth': .2}, arrangement=arrangement((False, True, False, True, False, True), restart=True),
        effects={'reverb': .32, 'pan': .1}),
    # d2 · pawn: the syncopated octave bass.
    part('bass', 'Baixo sincopado', 'phrase', recorded('guitars', 'bass'), [
        bars(*(bass(c) for c in VERSE)), bars(*(bass(c, True) for c in VERSE)), bars(*(bass(c) for c in BRIDGE)),
        bars(*(bass(c, True) for c in CHORUS)), bars(*(bass(c) for c in BRIDGE)), bars(*(bass(c, True) for c in CHORUS)),
    ], [4] * 6, octave=2, gain=.6, attack=.003, decay=.25, sustain=.6, release=.08, gate=.6, clip=.95, lpf=3000, hpf=35,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': .05}, effects={'reverb': 0, 'pan': 0}),
    # e1 · king: low strings sustain under the chorus; castling opens the string section.
    part('texture', 'Violoncelos sustentados', 'sustain', recorded('classical', 'cello-sustain'), [
        prog(pad, VERSE), prog(pad, VERSE), prog(pad, BRIDGE), prog(pad, CHORUS), prog(pad, BRIDGE), prog(pad, CHORUS),
    ], [4] * 6, octave=3, gain=.18, attack=.25, decay=.8, sustain=.9, release=.6, gate=.97, clip=1, lpf=5000, hpf=60,
        design={'role': 'pad'}, arrangement=arrangement((False, False, False, True, True, True), restart=False), effects={'reverb': .3, 'pan': -.1}),
    # e2 · pawn: four-on-the-floor kick.
    part('rhythm', 'Bumbo four-on-the-floor', 'pulse', recorded('percussion', 'kick', pitched=False), [
        drums('X... X... X... X...'), KICK, drums('X... .... X... ....'), KICK, KICK, KICK,
    ], [1] * 6, gain=.75, clip=1, lpf=8000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: trumpet stabs, the horn section in the chorus.
    part('response', 'Metais de pista', 'phrase', recorded('sambaReggae', 'trompete'), [
        prog(stabs, VERSE), prog(stabs, VERSE), prog(stabs, BRIDGE), prog(stabs, CHORUS), prog(stabs, BRIDGE), prog(stabs, CHORUS),
    ], [4] * 6, octave=3, gain=.14, attack=.005, decay=.2, sustain=.3, release=.1, gate=.45, clip=.9, lpf=4500, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, False, False, True, False, True)), effects={'reverb': .2, 'pan': -.3}),
    # f2 · pawn: the open hat on every offbeat, disco's signature 'tsss'.
    part('rhythm', 'Chimbal aberto', 'pulse', recorded('percussion', 'open-hat', pitched=False), [
        drums('..x. ..x. ..x. ..x.'), drums('..x. ..x. ..x. ..x.'), drums('.... .... .... ..x.'),
        drums('..X. ..X. ..X. ..X.'), drums('..x. ..x. ..x. ..x.'), drums('..X. ..X. ..X. ..X.'),
    ], [1] * 6, gain=.22, clip=.6, lpf=9500, hpf=2500, effects={'reverb': .06, 'pan': -.2}),
    # g1 · knight: chicken-scratch rhythm guitar.
    part('harmony', 'Guitarra chicken-scratch', 'phrase', recorded('guitars', 'muted'), [
        prog(scratch, VERSE), prog(scratch, VERSE), prog(scratch, BRIDGE), prog(scratch, CHORUS), prog(scratch, BRIDGE), prog(scratch, CHORUS),
    ], [4] * 6, octave=3, gain=0.3, attack=.002, decay=.12, sustain=.2, release=.05, gate=.35, clip=.9, lpf=6000, hpf=300,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, True, True, True, False, True)), effects={'reverb': .08, 'pan': .35}),
    # g2 · pawn: tambourine thins to offbeats when the chorus opens.
    part('rhythm', 'Pandeirola', 'pulse', recorded('percussion', 'tambourine', pitched=False), [
        drums('.... X... .... X...'), drums('x.x. x.x. x.x. x.x.'), drums('.... .... .... ....'),
        drums('..x. ..x. ..x. ..x.'), drums('x.x. x.x. x.x. x.x.'), drums('..x. ..x. ..x. ..x.'),
    ], [1] * 6, gain=.18, clip=.8, lpf=8500, hpf=1500, effects={'reverb': .08, 'pan': .4}),
    # h1 · rook: crash on the downbeat of each new section.
    part('texture', 'Prato de virada', 'pulse', recorded('percussion', 'crash', pitched=False), [
        drums('X... .... .... .... .... .... .... .... .... .... .... .... .... .... .... ....'),
        drums('X... .... .... .... .... .... .... .... .... .... .... .... .... .... .... ....'),
        drums('.... .... .... .... .... .... .... .... .... .... .... .... .... .... .... ....'),
        drums('X... .... .... .... .... .... .... .... X... .... .... .... .... .... .... ....'),
        drums('X... .... .... .... .... .... .... .... .... .... .... .... .... .... .... ....'),
        drums('X... .... .... .... .... .... .... .... X... .... .... .... .... .... .... ....'),
    ], [4] * 6, gain=.12, clip=1, lpf=12000, hpf=400, design={'role': 'fx'}, effects={'reverb': .2, 'pan': .25},
        arrangement=arrangement((True, False, False, True, False, True))),
    # h2 · pawn: handclaps with the snare in the chorus.
    part('rhythm', 'Palmas da pista', 'pulse', recorded('drums', 'room-clap', pitched=False), [
        drums('.... .... .... ....'), drums('.... .... .... ....'), drums('.... X... .... X...'),
        SNARE, drums('.... .... .... X...'), SNARE,
    ], [1] * 6, gain=0.45, clip=.8, lpf=9000, hpf=500, effects={'reverb': .15, 'pan': -.05}),
]

profile = {
    'name': 'Loft · disco 1977', 'bpm': 120, 'root': 'A', 'scale': 'Dórica', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions([
        rule('nyc-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('nyc-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('nyc-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('gain', 3)]),
        # Castling brings the strings in: the chorus of the night.
        rule('nyc-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('nyc-check', 'check', 'actor', 1, True, [act('variation', 3), act('activate')]),
        rule('nyc-capture', 'capture', 'actor', 1, False, [act('gain', 5)], 'drums'),
        # The disco breakdown: bass and drums alone, then the band crashes back.
        rule('nyc-queen', 'queenCapture', 'both', 2, True, [act('variation', 2)]),
        rule('nyc-quiet', 'quiet', 'both', 2, True, [act('variation', 2), act('lpf', 2200, rampBars=2)]),
        rule('nyc-drought', 'captureDrought', 'both', 1, True, [act('delay', .35)]),
        # The classic disco key change: a whole step up when the evaluation swings.
        rule('nyc-swing', 'evalSwing', 'both', 4, True, [act('transpose', 2)]),
        rule('nyc-promotion', 'promotion', 'both', 2, True, [act('scaleShift', 0, shift='lift'), act('variation', 5)]),
        rule('nyc-tension', 'tension', 'both', 1, True, [act('reverb', .5), act('gain', -3, rampBars=4)], 'lead'),
    ]),
    'reference': 'Disco nova-iorquino de 1977 (Chic, The Loft, Salsoul): referência de estilo; melodias e harmonias originais',
    'url': 'https://en.wikipedia.org/wiki/Disco',
}

# G builds toward the first chorus; H drops into a spacious soul half-time.
PRE = ('C', 'D7', 'Em7', 'D7')
SOUL = ('Em7', 'C', 'G', 'D7')

def climb(chord):
    r = ROOT[chord]
    return bar(f'{r} . . . {r + 2} . . . {r + 4} . {r + 5} . {r + 7}! . . .')

def soul_bass(chord):
    r = ROOT[chord]
    return bar(f'{r}_ . . . . . 0?0 . . . {r + 4} . {r + 7}_ . 0?0 .')

def soul_keys(chord):
    return bar(f'{VOICING[chord]}_ . . . . . . . 0?0 . . . . . . .')

expanded_form(profile, order=[0, 1, 6, 3, 2, 7, 4, 5],
    labels=profile['sectionLabels'] + ['Pre-Chorus', 'Bridge'],
    lengths=profile['sections'] + [32, 32],
    roots=[[ROOT[c] for c in chords] for chords in [VERSE, VERSE, BRIDGE, CHORUS, BRIDGE, CHORUS, PRE, SOUL]],
    additions={
        'a1': (None, bars(bar('1_ . . . 3 . 4 . 0?0 . . . . . . .'), drums('.' * 16),
                         bar('6_ . . . 4 . 3 . 0?0 . . . . . . .'), drums('.' * 16))),
        'a2': (drums('..x. x.x. ..x. x..x' * 3 + '..xx x.xx ..x. xxxx'), drums('.... ..x. .... x...' * 3 + '.... ..x. .... x.x.')),
        'b1': (prog(stabs, PRE), None),
        'b2': (drums('.... X... .... X...' * 3 + '.... X... ..g. XgX.'), drums('.... .... X... ....' * 3 + '.... .... X... ..g.')),
        'c1': (prog(piano, PRE), prog(soul_keys, SOUL)),
        'c2': (drums('xg.. xg.. xg.. xg.g' * 4), drums('x... .... x... ....' * 4)),
        'd1': (bars(bar('2_ . . . 4 . 6 . 0?0 . . . . . . .'), bar('3_ . . . 5 . 7 . 0?0 . . . . . . .'),
                    bar('4_ . . . 6 . 8 . 0?0 . . . . . . .'), bar('5_ . . . 7 . 9 . 7 . 5 . 3 . 0?0 .')), None),
        'd2': (prog(climb, PRE), prog(soul_bass, SOUL)),
        'e1': (None, prog(pad, SOUL)),
        'e2': (drums('X... X... X... X...' * 3 + 'X... X... X... ....'), drums('X... .... .... ..x.' * 4)),
        'f1': (None, None),
        'f2': (drums('..x. ..x. ..x. ..x.' * 3 + '..x. ..x. ..x. ....'), None),
        'g1': (prog(scratch, PRE), bars(*(bar(f'. . . . . . {VOICING[c]} . . . . . . . {VOICING[c]} .') for c in SOUL))),
        'g2': (drums('..x. ..x. ..x. ..x.' * 4), None),
        'h1': (None, None),
        'h2': (drums('.... X... .... X...' * 3 + '.... X... .... ....'), None),
    })

write('nyc', profile)
