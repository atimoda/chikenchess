"""Bristol 1994 · trip-hop: slow breakbeats, vinyl and cinema strings (original material).

90 BPM with a heavy swing: a dusty sampled kit (fat kick, cracking snare on two
and four, lazy hats and ghost notes) under vinyl crackle and scratches. A deep
sine sub, Rhodes and Hammond chords, a string section and a French horn give the
film-score gloom; the queen plays a theremin-like sine lead with vibrato and
slides, answered by a reverb-soaked spy guitar. G natural minor,
Gm7–Ebmaj7–Cm7–Dm7.
Degrees: 0 G · 1 A · 2 Bb · 3 C · 4 D · 5 Eb · 6 F · 7 G'.
"""
from kit import (expanded_form, act, arrangement, bar, bars, drums, electronic, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Gm7', 'Ebmaj7', 'Cm7', 'Dm7')
VAMP = ('Gm7', 'Gm7', 'Ebmaj7', 'Ebmaj7')
ROOT = {'Gm7': 0, 'Ebmaj7': -2, 'Cm7': -4, 'Dm7': -3}
VOICING = {'Gm7': '2,4,6,7', 'Ebmaj7': '2,4,5,6', 'Cm7': '2,3,5,6', 'Dm7': '1,3,4,6'}
PAD = {'Gm7': '0,2,4,6', 'Ebmaj7': '-2,0,2,4', 'Cm7': '-4,-2,0,2', 'Dm7': '-3,-1,1,3'}


def sub(chord, variant=0):
    r = ROOT[chord]
    shapes = [f'{r}_ . . . . . . . . . . . . . . .', f'{r}_ . . . . . . . . . . {r} . . {r + 7}~-7 .']
    return bar(shapes[variant])


def rhodes(chord, variant=0):
    c = VOICING[chord]
    shapes = [f'{c}_ . . . . . . . . . . . . . . .', f"{c}_ . . . . . . . . . {c}' . . . . ."]
    return bar(shapes[variant])


def pad(chord):
    return bar(f'{PAD[chord]}_ . . . . . . . . . . . . . . .')


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


# The slow two-bar break.
KICK = drums('X... .... ..x. .... X..x .... ..x. ....')
KICK_B = drums('X... .... ..x. ...x X... ..x. .x.. ....')
SNARE = drums('.... X... .... X... .... X... .... X...')
SILENT = drums('.' * 16)
SILENT2 = drums('.' * 32)
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: vinyl crackle under everything.
    part('texture', 'Chiado de vinil', 'pulse', electronic('vinyl'), [
        drums('X' + '.' * 15),
    ] * 6, [1] * 6, gain=1, clip=1, lpf=8000, hpf=400, design={'role': 'fx'}, effects={'reverb': 0, 'pan': -.15},
        arrangement=arrangement(restart=False)),
    # a2 · pawn: lazy dusty hats.
    part('rhythm', 'Chimbal empoeirado', 'pulse', machine('dusty-hat'), [
        SILENT2, drums('x.x. x.x. x.x. x.x. x.x. x.x. x.x. x.xx'), drums('..x. ..x. ..x. ..x. ..x. ..x. ..x. ..x.'),
        drums('x.xg x.x. x.xg x.x. x.xg x.x. x.xg x.xx'), drums('x.x. x.x. x.x. x.x. x.x. x.x. x.x. x.x.'), drums('x.xg x.x. x.xg x.x. x.xg x.x. x.xg x.xr'),
    ], [2] * 6, gain=.4, clip=.6, lpf=9000, hpf=2500, effects={'reverb': .05, 'pan': .25}),
    # b1 · knight: scratches answering the vocal line.
    part('response', 'Scratch', 'pulse', electronic('scratch'), [
        SILENT2, drums('.' * 28 + 'x.x.'), SILENT2, drums('.' * 12 + 'x... ' + '.' * 12 + 'x.xx'), drums('.' * 28 + 'x...'), drums('.' * 12 + 'x.x. ' + '.' * 12 + 'xxx.'),
    ], [2] * 6, gain=.2, clip=.8, lpf=8000, hpf=400, design={'role': 'fx'}, effects={'reverb': .15, 'pan': .4},
        arrangement=arrangement((False, True, False, True, True, True))),
    # b2 · pawn: the cracking snare.
    part('rhythm', 'Caixa empoeirada', 'pulse', machine('dusty-snare'), [
        SILENT2, SNARE, drums('.' * 28 + 'X...'), SNARE, SNARE, drums('.... X... .... X... .... X... ..g. X.g.'),
    ], [2] * 6, gain=.45, clip=.8, lpf=9000, hpf=150, effects={'reverb': .2, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True))),
    # c1 · bishop: Rhodes chords.
    part('harmony', 'Rhodes', 'phrase', recorded('keys', 'rhodes'), [
        prog(rhodes, LOOP, 0), prog(rhodes, LOOP, 1), prog(rhodes, VAMP, 0), prog(rhodes, LOOP, 1), prog(rhodes, VAMP, 0), prog(rhodes, LOOP, 1),
    ], [4] * 6, octave=3, gain=.08, attack=.005, decay=1, sustain=.5, release=.6, gate=.9, clip=.95, lpf=3500, hpf=120,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .35, 'delay': .1, 'pan': -.2}),
    # c2 · pawn: break ghost notes.
    part('rhythm', 'Ghost notes', 'pulse', machine('break-ghost'), [
        SILENT2, drums('.... ...g .g.. ...g .... ...g .g.. g...'), SILENT2, drums('.... ...g .g.. ...g .g.. ...g .g.. g..g'),
        drums('.... .... .g.. .... .... .... .g.. ....'), drums('..g. ...g .g.g ...g .g.. ...g .g.. g.gg'),
    ], [2] * 6, gain=0.6, clip=.6, lpf=8000, hpf=300, effects={'reverb': .08, 'pan': -.1}),
    # d1 · queen: theremin-like sine lead.
    part('melody', 'Teremim', 'phrase', synth('sine'), [
        REST4,
        bars(bar('4_ . . . . . . . 5~-1 . . . 4 . . .'), bar('2_ . . . . . . . . . . . . . . .'), bar('3_ . . . . . 2 . 0 . . . 2~-2 . . .'), bar('1_ . . . . . . . . . . . . . . .')),
        bars(bar('7~-12 . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .'), bar('5~-1 . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7_ . . . . . 9~-1 . 7 . . . 6 . . .'), bar('5_ . . . . . . . 4 . . . 2 . . .'), bar('3_ . . . . . 5 . 7 . . . 6~-1 . . .'), bar('4_ . . . . . . . . . . . . . . .')),
        bars(bar('4_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . 2 . . . . . . .'), bar('0_ . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('7_ . . . . . 9~-1 . 7 . . . 6 . . .'), bar('5_ . . . . . . . 4 . . . 2 . . .'), bar('3_ . . . . . 5 . 7 . . . 9~-2 . . .'), bar('11~-12 . . . . . . . . . . . . . . .')),
    ], [4] * 6, octave=4, gain=0.2, attack=.12, decay=.5, sustain=.9, release=.5, gate=.95, clip=.9, lpf=5000, hpf=200,
        design={'vibrato': 6, 'vibratoDepth': .25}, mapping={'fileDegrees': 0, 'panWidth': .1},
        arrangement=arrangement((False, True, True, True, True, True), restart=True), effects={'reverb': .45, 'delay': .25, 'pan': 0}),
    # d2 · pawn: deep sine sub.
    part('bass', 'Sub profundo', 'phrase', synth('sine'), [
        REST4, prog(sub, LOOP, 0), prog(sub, VAMP, 0), prog(sub, LOOP, 1), prog(sub, VAMP, 0), prog(sub, LOOP, 1),
    ], [4] * 6, octave=1, gain=0.25, attack=.01, decay=.6, sustain=.8, release=.3, gate=.9, clip=.95, lpf=220, hpf=25,
        design={'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # e1 · king: string section, arrives with castling.
    part('texture', 'Cordas de cinema', 'sustain', recorded('classical', 'cello-sustain'), [
        prog(pad, LOOP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP),
    ], [4] * 6, octave=3, gain=0.3, attack=.6, decay=1, sustain=.85, release=1, gate=.97, clip=1, lpf=4000, hpf=80,
        design={'role': 'pad'}, arrangement=arrangement((True, False, True, True, False, True), restart=False), effects={'reverb': .45, 'pan': .2}),
    # e2 · pawn: the fat dusty kick.
    part('rhythm', 'Bumbo empoeirado', 'pulse', machine('dusty-kick'), [
        drums('X' + '.' * 31), KICK, SILENT2, KICK, KICK_B, KICK_B,
    ], [2] * 6, gain=0.75, clip=.6, lpf=6000, hpf=30, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: reverb-soaked spy guitar.
    part('melody', 'Guitarra de espião', 'phrase', recorded('guitars', 'clean'), [
        bars(bar('0 . . 2 . . 3 . 4_ . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . 7 . 6 . 4_ . . .')),
        bars(bar('0 . . 2 . . 3 . 4_ . . . . . . .'), bar('5 . . 4 . . 2 . 1_ . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . . . . . 11 . 9 .')),
        bars(bar('0 . . 2 . . 3 . 4_ . . . . . . .'), bar('. . . . . . . . . . . . . . . .')),
        bars(bar('. . . . . . . . . . . . . . . .'), bar('. . . . . . . . 7 . 9 . 11_ . . .')),
    ], [2] * 6, octave=3, gain=0.8, attack=.003, decay=.6, sustain=.4, release=.5, gate=.8, clip=.9, lpf=5000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((True, False, True, True, True, True)), effects={'reverb': .55, 'delay': .3, 'pan': -.35}),
    # f2 · pawn: break ride.
    part('rhythm', 'Ride do break', 'pulse', machine('break-ride'), [
        SILENT2, SILENT2, drums('x... x... x... x... x... x... x... x...'), drums('x.x. x.x. x.x. x.x. x.x. x.x. x.x. x.x.'), SILENT2, drums('x.x. x.x. x.x. x.x. x.x. x.x. x.x. x.x.'),
    ], [2] * 6, gain=0.25, clip=.7, lpf=11000, hpf=2500, effects={'reverb': .12, 'pan': .3}),
    # g1 · knight: Hammond organ swells.
    part('harmony', 'Órgão Hammond', 'sustain', recorded('keys', 'organ'), [
        REST4, prog(pad, LOOP), prog(pad, VAMP), prog(pad, LOOP), REST4, prog(pad, LOOP),
    ], [4] * 6, octave=4, gain=.06, attack=.3, decay=1, sustain=.8, release=.6, gate=.95, clip=.95, lpf=3500, hpf=200,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, True, True)), effects={'reverb': .35, 'pan': .35}),
    # g2 · pawn: tambourine on the backbeat.
    part('rhythm', 'Pandeirola lenta', 'pulse', recorded('percussion', 'tambourine', pitched=False), [
        SILENT, drums('.... x... .... x...'), SILENT, drums('.... x... .... x..x'), drums('.... x... .... ....'), drums('.... x... .... x.xx'),
    ], [1] * 6, gain=1, clip=.6, lpf=12000, hpf=2500, effects={'reverb': .12, 'pan': -.3}),
    # h1 · rook: French horn — the film-score swell.
    part('texture', 'Trompa', 'sustain', recorded('classical', 'horn-sustain'), [
        bars(bar('0_ . . . . . . . . . . . . . . .'), SILENT, SILENT, SILENT),
        REST4,
        bars(bar('4_ . . . . . . . . . . . . . . .'), SILENT, bar('3_ . . . . . . . . . . . . . . .'), SILENT),
        bars(SILENT, SILENT, SILENT, bar('1_ . . . . . . . . . . . . . . .')),
        bars(bar('4_ . . . . . . . . . . . . . . .'), SILENT, bar('2_ . . . . . . . . . . . . . . .'), SILENT),
        bars(SILENT, SILENT, SILENT, bar('1_ . . . . . . . . . . . . . . .')),
    ], [4] * 6, octave=3, gain=0.4, attack=.4, decay=1, sustain=.8, release=1, gate=.95, clip=.95, lpf=4000, hpf=80,
        mapping={'fileDegrees': 0}, design={'role': 'fx'}, effects={'reverb': .5, 'pan': .15}),
    # h2 · pawn: timpani rolls at the section ends.
    part('rhythm', 'Tímpano', 'pulse', recorded('world', 'timpani', pitched=False), [
        SILENT, SILENT, drums('.... .... x... rrrr'), SILENT, drums('.... .... .... x...'), drums('.... .... rrrr RRRR'),
    ], [1] * 6, gain=0.25, clip=.8, lpf=5000, hpf=40, effects={'reverb': .3, 'pan': -.1},
        arrangement=arrangement(fills=(5, 5, None, 5, 5, None))),
]

profile = {
    'name': 'Bristol · trip-hop 1994', 'bpm': 90, 'root': 'G', 'scale': 'Menor natural', 'harmony': 'static',
    'swing': .14, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions([
        rule('bri-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('bri-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('bri-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('reverb', .5)]),
        rule('bri-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('bri-check', 'check', 'actor', 1, True, [act('activate'), act('gain', 3)]),
        # Gloom deepens: tension slows the tape a touch and closes the filter.
        rule('bri-tension', 'tension', 'both', 1, True, [act('bpm', -4, rampBars=8), act('lpf', 1800, rampBars=8)], 'pad'),
        rule('bri-capture', 'capture', 'actor', 1, False, [act('gain', 3)], 'drums'),
        rule('bri-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('reverb', .7)]),
        rule('bri-quiet', 'quiet', 'both', 2, True, [act('variation', 4), act('delay', .45)]),
        rule('bri-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('delay', .4)], 'lead'),
        rule('bri-drought', 'captureDrought', 'both', 2, True, [act('lpf', 900, rampBars=4)], 'lead'),
    ]),
    'reference': 'Trip-hop de Bristol em 1994 (Portishead — Dummy, Massive Attack, Tricky): referência de estilo; material original',
    'url': 'https://en.wikipedia.org/wiki/Trip_hop',
}

# Keep the theremin's melody, slides, vibrato and effects. Soften everything around it.
parts[0].update(gain=.28,lpf=3300,patterns=[drums('x'+'.'*63)]*6,bars=[4]*6)
parts[0]['arrangement']=arrangement((True,True,True,False,True,False))
parts[1].update(gain=.16,clip=.35,lpf=4800,hpf=1600,patterns=[REST4,
 drums('x... ..g. x... ..g. x... .... ..x. .... x... ..g. x... .... x... .... ..g. ....'),REST4,
 drums('x... ..g. x... ..x. x... .... x... ..g. x... ..g. x... .... x... .... ..x. ....'),
 drums('x... .... .... ....'*4),drums('x... ..g. x... ..x. x... .... ..x. ....'*2)],bars=[4]*6)
parts[2].update(gain=.12,lpf=4200,patterns=[REST4,drums('.'*60+'x...'),REST4,REST4,REST4,drums('.'*60+'x...')],bars=[4]*6)
parts[3].update(gain=.35,lpf=6000)
parts[4].update(gain=.1)
parts[4]['arrangement']=arrangement((True,True,True,True,True,True))
parts[5].update(gain=.22,lpf=4800)
parts[5]['arrangement']=arrangement((False,True,False,True,False,True))
parts[8].update(gain=.16,lpf=3000)
parts[8]['arrangement']=arrangement((True,False,True,False,False,True),restart=False)
parts[10].update(gain=.3,lpf=3200,patterns=[
 bars(bar('0 . . 2 . . 3 . 4_ . . . 0?0 . . .'),SILENT,SILENT,SILENT),REST4,
 bars(bar('0 . . 2 . . 3 . 4_ . . . 0?0 . . .'),SILENT,bar('5 . . 4 . . 2 . 1_ . . . 0?0 . . .'),SILENT),REST4,
 bars(SILENT,bar('. . . . . . . . 2 . 0 . 0?0 . . .'),SILENT,bar('. . . . . . . . 4 . 2 . 0?0 . . .')),REST4],bars=[4]*6)
parts[10]['arrangement']=arrangement((True,False,True,False,True,False))
parts[11].update(gain=.1,lpf=6000,patterns=[REST4,REST4,REST4,drums('.'*30+'x.'+'.'*30+'x.'),REST4,drums('.'*14+'x.'+'.'*30+'x.'+'.'*16)],bars=[4]*6)
parts[13].update(gain=.16,lpf=6500)
parts[13]['arrangement']=arrangement((False,False,False,True,False,True))
parts[14].update(gain=.16,lpf=2600)
parts[14]['arrangement']=arrangement((False,False,True,False,True,False))
parts[15].update(gain=.13,lpf=2800,patterns=[REST4,REST4,drums('.'*56+'x...x...'),REST4,REST4,drums('.'*56+'x...x.x.')],bars=[4]*6)
parts[15]['arrangement']=arrangement(fills=(None,None,None,5,None,None))
OPEN = ('Ebmaj7','Cm7','Gm7','Dm7')
INTIMATE = ('Cm7','Cm7','Ebmaj7','Dm7')

def soft_keys(chord):
 c=VOICING[chord]
 return bar(f"{c}_ . . . . . . . 0?0 . . . {c}' . . .")

def half_sub(chord):
 r=ROOT[chord]
 return bar(f'{r}_ . . . . . . . 0?0 . . . {r+7}_ . 0?0 .')

expanded_form(profile,order=[0,1,6,3,2,7,4,5],labels=profile['sectionLabels']+['Pre-Chorus','Bridge'],
 lengths=profile['sections']+[32,32],roots=[[ROOT[c] for c in p] for p in [LOOP,LOOP,VAMP,LOOP,VAMP,LOOP,OPEN,INTIMATE]],additions={
 'a1':(None,drums('x'+'.'*63)), 'a2':(drums('x... ..g. x... ....'*4),None), 'b1':(None,None),
 'b2':(drums('.... X... .... X...'*3+'.... X... ..g. X...'),drums('.... .... x... ....'*4)),
 'c1':(prog(soft_keys,OPEN),prog(rhodes,INTIMATE,0)), 'c2':(drums('.... ...g .... ....'*4),None),
 'd1':(None,bars(bar('3_ . . . . . . . 2 . 0 . 0?0 . . .'),SILENT,bar('5_ . . . . . . . 4 . 2 . 0?0 . . .'),SILENT)),
 'd2':(prog(half_sub,OPEN),prog(half_sub,INTIMATE)), 'e1':(prog(pad,OPEN),None),
 'e2':(drums('X... .... ..x. .... X... ..x. .... ...x'*2),drums('X... .... .... ....'*4)),
 'f1':(bars(bar('5_ . . . 4 . 2 . 0?0 . . . . . . .'),SILENT,bar('4_ . . . 2 . 0 . 0?0 . . . . . . .'),SILENT),None),
 'f2':(None,None), 'g1':(None,prog(pad,INTIMATE)), 'g2':(None,None),
 'h1':(None,None), 'h2':(drums('.'*56+'x...x...'),None),
})

write('bristol', profile)
