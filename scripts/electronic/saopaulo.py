"""São Paulo 1993 · hard techno in the city's basements, with batucada (original material).

145 BPM: a distorted 909 kick, rumbling offbeat bass and sixteenth hats carry the
industrial side; the samba-reggae bank brings the city's percussion: surdo on two
and four, agogô bells, chocalho sixteenths, repinique calls and timbau, with
caixa rolls into each section. A distorted saw riff on the queen and an acid line
on the knight. E Phrygian, a drone on E with the dark F as the only move.
Degrees: 0 E · 1 F · 2 G · 3 A · 4 B · 5 C · 6 D · 7 E'.
"""
from kit import (expanded_form, act, arrangement, bar, bars, drums, electronic, machine, part, reactions, recorded, rule, synth, write)

LOOP = ('Em', 'Em', 'Em', 'F')
DRONE = ('Em', 'Em', 'Em', 'Em')
ROOT = {'Em': 0, 'F': 1}
CHORD = {'Em': '0,2,4', 'F': '1,3,5'}


def rumble(chord, variant=0):
    r = ROOT[chord]
    shapes = [f'. . {r} . . . {r} . . . {r} . . . {r} .', f". {r}' {r} . . {r}' {r} . . {r}' {r} . . {r}' {r} {r}'"]
    return bar(shapes[variant])


def stab(chord, variant=0):
    c = CHORD[chord]
    shapes = [f'{c}! . . . . . . . . . . . . . . .', f'{c}! . . {c} . . . . . . {c} . . . . .']
    return bar(shapes[variant])


def prog(fn, chords, *args):
    return bars(*(fn(c, *args) for c in chords))


RIFF = bar("0! . 0 . 7 . 0 . 5 . 0 . 6 . 1~-1 .")
RIFF_B = bar("0! . 0 . 7 . 0 . 8! . 7 . 6 . 5 1")
ACID = bar("0! 0 7~-7 0 . 0 1! 0 . 0 7 5~2 0! . 3 0")
ACID_B = bar("0! . 0 7 . 0 5! . 0 0 3! . 0 7~-7 1 0")
KICK = drums('X... X... X... X...')
CLAP = drums('.... X... .... X...')
SILENT = drums('.... .... .... ....')
REST4 = bars(*[SILENT] * 4)
parts = [
    # a1 · rook: industrial metal hits from the warehouse.
    part('texture', 'Golpe de galpão', 'pulse', electronic('metal-hit'), [
        drums('X' + '.' * 31), drums('.... .... .... ..x. .... .... .... ....'), drums('X' + '.' * 15 + 'x' + '.' * 15),
        drums('.... .... .... ..x. .... .... ..x. ....'), drums('X' + '.' * 31), drums('.... .... .... ..X. .... .... ..x. ..x.'),
    ], [2] * 6, gain=.25, clip=.9, lpf=9000, hpf=200, design={'role': 'fx'}, effects={'reverb': .4, 'delay': .2, 'pan': -.35}),
    # a2 · pawn: 909 ride.
    part('rhythm', 'Ride 909', 'pulse', machine('909-ride'), [
        SILENT, drums('..x. ..x. ..x. ..x.'), drums('..x. ..x. ..x. ..x.'), drums('x.X. x.X. x.X. x.X.'), drums('..x. ..x. ..x. ..x.'), drums('x.X. x.X. x.X. x.X.'),
    ], [1] * 6, gain=.25, clip=.7, lpf=14000, hpf=3000, effects={'reverb': .08, 'pan': .3}),
    # b1 · knight: hard acid line.
    part('response', 'Ácido da Augusta', 'phrase', synth('sawtooth'), [
        REST4, REST4, bars(ACID, ACID, ACID, ACID_B), bars(ACID, ACID_B, ACID, ACID_B), bars(ACID, ACID, ACID, ACID), bars(ACID_B, ACID_B, ACID, ACID_B),
    ], [4] * 6, octave=2, gain=.18, attack=.002, decay=.12, sustain=.2, release=.04, gate=.5, clip=.95, lpf=800, hpf=60,
        design={'resonance': 18, 'filterEnv': 3.2, 'filterDecay': .1, 'lfoTarget': 'lpf', 'lfoRate': 16, 'lfoUnit': 'bars', 'lfoDepth': .6, 'role': 'lead'},
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, True, True)), distortion=1.5, distortionMix=.35,
        effects={'delay': .2, 'reverb': .08, 'pan': .3}),
    # b2 · pawn: 909 claps.
    part('rhythm', 'Palmas 909', 'pulse', machine('909-clap'), [
        SILENT, CLAP, SILENT, CLAP, CLAP, drums('.... X... .... X... .... X... .... XXXX'),
    ], [1, 1, 1, 1, 1, 2], gain=.45, clip=.9, lpf=10000, hpf=500, effects={'reverb': .18, 'pan': 0},
        arrangement=arrangement((False, True, False, True, True, True), fills=(None, 5, None, 5, None, None))),
    # c1 · bishop: distorted chord stab.
    part('harmony', 'Stab de porão', 'phrase', synth('square'), [
        REST4, prog(stab, LOOP, 0), prog(stab, DRONE, 0), prog(stab, LOOP, 1), prog(stab, DRONE, 0), prog(stab, LOOP, 1),
    ], [4] * 6, octave=3, gain=0.15, attack=.003, decay=.2, sustain=.1, release=.15, gate=.3, clip=.9, lpf=2000, hpf=200,
        design={'filterEnv': 1.5, 'filterDecay': .1, 'delayTime': '3/16', 'delayFeedback': .45}, mapping={'fileDegrees': 0},
        arrangement=arrangement((False, True, True, True, True, True)), distortion=1, distortionMix=.3, effects={'delay': .35, 'reverb': .3, 'pan': -.25}),
    # c2 · pawn: 909 sixteenth hats.
    part('rhythm', 'Chimbal 909', 'pulse', machine('909-hat'), [
        drums('..x. ..x. ..x. ..x.'), drums('xgxg xgxg xgxg xgxg'), drums('xgxg xgxg xgxg xgxg'),
        drums('xgXg xgXg xgXg xgXg'), drums('xgxg xgxg xgxg xgxg'), drums('XgXg XgXg XgXg XgXr'),
    ], [1] * 6, gain=1, clip=.6, lpf=15000, hpf=4500, effects={'reverb': .03, 'pan': .15}),
    # d1 · queen: the distorted saw riff.
    part('melody', 'Serra distorcida', 'phrase', synth('sawtooth'), [
        REST4, bars(RIFF, RIFF, RIFF, RIFF_B), bars(RIFF, RIFF, RIFF, RIFF), bars(RIFF, RIFF_B, RIFF, RIFF_B), REST4, bars(RIFF_B, RIFF_B, RIFF, RIFF_B),
    ], [4] * 6, octave=3, gain=0.16, attack=.002, decay=.15, sustain=.3, release=.06, gate=.5, clip=.95, lpf=1800, hpf=150,
        design={'unison': 2, 'detune': .12, 'resonance': 6, 'filterEnv': 2, 'filterDecay': .12, 'role': 'lead'},
        mapping={'fileDegrees': 0, 'panWidth': .1}, arrangement=arrangement((False, True, True, True, False, True), restart=False),
        distortion=2, distortionMix=.45, effects={'reverb': .15, 'delay': .15, 'pan': 0}),
    # d2 · pawn: offbeat rumble bass.
    part('bass', 'Baixo de subsolo', 'phrase', synth('sawtooth'), [
        REST4, prog(rumble, LOOP, 0), REST4, prog(rumble, LOOP, 1), prog(rumble, DRONE, 0), prog(rumble, LOOP, 1),
    ], [4] * 6, octave=1, gain=.5, attack=.002, decay=.12, sustain=.4, release=.05, gate=.6, clip=.95, lpf=260, hpf=30,
        design={'resonance': 3, 'filterEnv': 1.4, 'filterDecay': .08, 'role': 'bass'}, mapping={'fileDegrees': 0, 'panWidth': 0},
        effects={'reverb': 0, 'pan': 0}),
    # e1 · king: concrete drone, arrives with castling.
    part('texture', 'Drone de concreto', 'sustain', synth('brown'), [
        bars(bar('0_ . . . . . . . . . . . . . . .'), *[SILENT] * 3),
    ] * 6, [4] * 6, octave=2, gain=0.6, attack=2, decay=1, sustain=.8, release=2, gate=.98, clip=1, lpf=700, hpf=60,
        design={'role': 'pad', 'lfoTarget': 'lpf', 'lfoRate': 4, 'lfoUnit': 'bars', 'lfoDepth': .5},
        arrangement=arrangement((True, False, True, True, True, True), restart=False), effects={'reverb': .5, 'pan': .1}),
    # e2 · pawn: hard 909 kick.
    part('rhythm', 'Bumbo 909', 'pulse', machine('909-kick-hard'), [
        KICK, KICK, drums('X... .... .... ....'), KICK, KICK, KICK,
    ], [1] * 6, gain=.6, clip=.5, lpf=9000, hpf=25, mapping={'panWidth': 0}, effects={'reverb': 0, 'pan': 0}),
    # f1 · bishop: agogô bells, high and low.
    part('rhythm', 'Agogô', 'pulse', recorded('sambaReggae', 'agogo-agudo', pitched=False), [
        SILENT, drums('x.x. ..x. x... x.x.'), drums('x... .... x... ....'), drums('x.x. ..x. x.x. ..x.'), drums('x... ..x. .... ....'), drums('x.x. ..x. x.x. xxx.'),
    ], [1] * 6, gain=0.3, clip=.7, lpf=9000, hpf=400, effects={'reverb': .12, 'pan': -.4},
        arrangement=arrangement((False, True, True, True, True, True))),
    # f2 · pawn: chocalho sixteenths.
    part('rhythm', 'Chocalho', 'pulse', recorded('sambaReggae', 'chocalho', pitched=False), [
        SILENT, drums('gxgx gxgx gxgx gxgx'), SILENT, drums('gXgx gXgx gXgx gXgx'), drums('gxgx gxgx gxgx gxgx'), drums('gXgx gXgx gXgx gXgr'),
    ], [1] * 6, gain=0.2, clip=.6, lpf=13000, hpf=2500, effects={'reverb': .05, 'pan': .25}),
    # g1 · knight: repinique calls answering the riff.
    part('response', 'Repique', 'pulse', recorded('sambaReggae', 'repinique', pitched=False), [
        SILENT, drums('.... .... .... x.xx'), SILENT, drums('...x ..x. .x.. x.xx'), drums('.... .... .... ..xx'), drums('...x ..x. .xx. rrrr'),
    ], [1] * 6, gain=.25, clip=.8, lpf=10000, hpf=200, effects={'reverb': .12, 'pan': .4},
        arrangement=arrangement((False, True, False, True, True, True))),
    # g2 · pawn: timbau on the offbeats.
    part('rhythm', 'Timbau', 'pulse', recorded('sambaReggae', 'timbau', pitched=False), [
        SILENT, drums('..x. ..x. ..x. ..xx'), SILENT, drums('..x. ..x. ..xx ..xx'), drums('..x. .... ..x. ....'), drums('..x. .xx. ..xx .xx.'),
    ], [1] * 6, gain=0.12, clip=.7, lpf=9000, hpf=150, effects={'reverb': .1, 'pan': -.25}),
    # h1 · rook: surdo marking two and four.
    part('rhythm', 'Surdo', 'pulse', recorded('sambaReggae', 'surdo-fundo', pitched=False), [
        SILENT, drums('.... x... .... x...'), drums('.... x... .... ....'), drums('.... X... .... X...'), drums('.... x... .... x...'), drums('.... X... ..x. X...'),
    ], [1] * 6, gain=.3, clip=.8, lpf=3000, hpf=40, effects={'reverb': .1, 'pan': 0}),
    # h2 · pawn: caixa rolls into each section.
    part('rhythm', 'Caixa de virada', 'pulse', recorded('sambaReggae', 'caixa', pitched=False), [
        SILENT, SILENT, drums('x.x. xxxx rrrr RRRR'), SILENT, drums('.... .... x.x. rrrr'), drums('x.x. xxxx rrrr RRRR'),
    ], [1] * 6, gain=.25, clip=.8, lpf=10000, hpf=200, effects={'reverb': .15, 'pan': -.1},
        arrangement=arrangement(fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Subsolo · hard techno 1993', 'bpm': 145, 'root': 'E', 'scale': 'Phrygian', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Drop', 'Interlude', 'Drop'],
    'parts': parts,
    'reactions': reactions([
        rule('sp-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('sp-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('sp-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('bpm', 5, rampBars=8)]),
        rule('sp-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('sp-check', 'check', 'actor', 1, True, [act('activate'), act('drive', 3)]),
        # The batucada answers captures: the percussion surges for the capturer.
        rule('sp-capture', 'capture', 'actor', 1, False, [act('gain', 5)], 'drums'),
        rule('sp-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('hpf', 500, rampBars=2)]),
        rule('sp-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('sp-tension', 'tension', 'both', 1, True, [act('lpf', 2400, rampBars=16), act('resonance', 22)], 'lead'),
        rule('sp-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('drive', 5)], 'lead'),
        rule('sp-hanging', 'hangingPiece', 'actor', 1, True, [act('resonance', 24)], 'lead'),
    ]),
    'reference': 'Techno underground de São Paulo no início dos anos 90 (cena pré-Hell’s Club: Krawitz, Mau Mau) com percussão brasileira: referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/Hell%27s_Club',
}

# Rides are accents in four-bar phrases; the 909 kick, not continuous treble, carries weight.
parts[1].update(gain=.11,lpf=6500,hpf=1800,clip=.4,patterns=[REST4,
 drums('..x. .... .... ..g. .... .... ..x. .... ..x. .... .... .... .... ..g. .... ..x.'),REST4,
 drums('..x. .... ..g. .... .... ..x. .... ..g. ..x. .... .... ..x. .... ..g. ..x. ....'),REST4,
 drums('..x. ..g. .... ..x. .... ..x. ..g. .... ..x. .... ..x. ..g. .... ..x. .... ....')],bars=[4]*6)
parts[1]['arrangement']=arrangement((False,True,False,True,False,True))
parts[2]['design'].update(resonance=12,filterEnv=2.5)
parts[2]['patterns'][2]=bars(bar('0! . . . 7~-7 . . . 0?0 . . . . . . .'),SILENT,bar('1! . . . 0 . . . 0?0 . . . . . . .'),SILENT)
parts[2]['arrangement']=arrangement((False,False,True,True,True,True))
parts[5].update(gain=.38,lpf=8500,hpf=2500,patterns=[drums('..x. .... ..x. ....'*4),drums('xg.. xg.. xg.. xg.g'*4),REST4,drums('xg.. xg.g xg.. xg..'*4),drums('x... x... x... x...'*4),drums('xg.. xg.g xg.. xg.g'*3+'xg.. xg.. xg.r ....')],bars=[4]*6)
parts[6]['arrangement']=arrangement((False,True,False,False,False,True))
parts[8].update(gain=.12)
parts[10].update(gain=.16,lpf=4500)
parts[10]['arrangement']=arrangement((False,False,False,True,True,False))
parts[11].update(gain=.12,lpf=7000)
parts[11]['arrangement']=arrangement((False,True,False,False,True,True))
parts[12].update(patterns=[REST4,drums('.'*56+'..x.x...'),REST4,drums('.'*48+'...x..x...x.x...'),REST4,drums('.'*48+'...x..x..x..xx..')],bars=[4]*6)
parts[15].update(patterns=[REST4,REST4,drums('.'*56+'x...x.xx'),REST4,REST4,drums('.'*48+'....x...x.x.x.r.')],bars=[4]*6,gain=.18,lpf=6500)
parts[15]['arrangement']=arrangement(fills=(None,5,None,5,None,None))
SUSPEND=('F','F','Em','Em')
RETURN=('Em','F','Em','Em')

def half_bass(chord):
 r=ROOT[chord]
 return bar(f'{r}_ . . . . . 0?0 . . . {r+7} . . . . .')

def turn_acid(chord):
 r=ROOT[chord]
 return bar(f'{r}! . . {r+7}~-7 . . {r} . {r+2}! . {r} . {r+4} . {r} .')

expanded_form(profile,order=[0,1,6,3,2,4,7,5],labels=profile['sectionLabels']+['Bridge','Turnaround'],
 lengths=profile['sections']+[32,16],roots=[[ROOT[c] for c in p] for p in [LOOP,LOOP,DRONE,LOOP,DRONE,LOOP,SUSPEND,RETURN]],additions={
 'a1':(drums('x'+'.'*63),None), 'a2':(None,drums('..x. .... .... ....'*3+'.... .... .... ....')),
 'b1':(None,prog(turn_acid,RETURN)), 'b2':(drums('.... .... X... ....'*4),drums('.... X... .... X...'*2+'.... X... X... X...'+'X.X. X.X. XXXX ....')),
 'c1':(prog(stab,SUSPEND,0),None), 'c2':(None,drums('xg.. xg.. xg.. xg..'*3+'xgxg xgxg xgxg ....')),
 'd1':(None,None), 'd2':(prog(half_bass,SUSPEND),prog(rumble,RETURN,0)),
 'e1':(bars(*(bar(f'{ROOT[c]},{ROOT[c]+4}_ . . . . . . . 0?0 . . . . . . .') for c in SUSPEND)),None),
 'e2':(drums('X... .... .... ..x.'*4),drums('X... X... X... X...'*3+'X... X... X... ....')),
 'f1':(drums('.... ..x. .... ....'*4),None), 'f2':(None,None),
 'g1':(drums('.'*48+'....x...x.x.....'),drums('.'*48+'....x...x.xx....')),
 'g2':(drums('.... ..x. .... x...'*4),drums('..x. .... ..x. ..x.'*3+'..x. ..x. ..xx ....')),
 'h1':(drums('.... .... x... ....'*4),None), 'h2':(None,drums('.'*48+'....x.x.xxxx....')),
})

write('saopaulo', profile)
