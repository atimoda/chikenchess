"""Düsseldorf 1970 · original early-70s Krautrock study, not late-70s synth-pop.
Organic motorik drums, bass pedal, interlocking guitar, low flute and organ.
The date is the scene setting; the composition draws on the early-70s continuum.
"""
from kit import (act, arrangement, bar, bars, drums, expanded_form, part, reactions, recorded, rule, synth, write)

S = drums('.' * 16)
R = bars(*[S] * 4)
PEDAL = (0, 0, 0, 0)
OPEN = (0, 0, -1, 0)
FLOAT = (-2, -2, -1, -1)
PLANS = [PEDAL, PEDAL, FLOAT, OPEN, PEDAL, OPEN]


def progression(roots, shape):
    return bars(*(bar(shape(r)) for r in roots))


def drone(roots):
    return progression(roots, lambda r: f'{r},{r+4}_ . . . . . . . . . . . 0?0 . . .')


def bass(roots, sparse=False):
    return progression(roots, lambda r: f'{r} . . . {r} . . . {r+4} . . . {r+7} . {r+4} .' if sparse else f'{r} . {r} . {r} . {r+4} . {r} . {r} . {r+7} . {r+4} .')


def guitar(roots):
    return progression(roots, lambda r: f'{r+7} . . {r+4} . . {r+7} . . . {r+9} . {r+7} . . .')


LEAD = bars(bar('4_ . . . 7 . 6 . 4_ . . . 0?0 . . .'), S,
            bar('3_ . . . 4 . 6 . 7_ . . . 0?0 . . .'), bar('. . . . . . . . 4 . 2 . 0_ . 0?0 .'))
FLUTE = bars(S, bar('4_ . . . 2 . 0 . 0?0 . . . . . . .'), S, bar('3_ . . . 2 . 0 . 0?0 . . . . . . .'))
K = drums('X... x... X... x...' * 3 + 'X... x... X... ..x.')
SN = drums('.... X... .... X...' * 3 + '.... X... ..g. X...')
HAT = drums('x.x. x.x. x.x. x.x.' * 3 + 'x.x. x.x. x.x. x..g')
parts = [
    part('texture', 'Órgão de horizonte', 'sustain', synth('triangle'), [drone(p) for p in PLANS], [4]*6,
         octave=3, gain=.055, attack=.35, release=.6, lpf=1800, hpf=180, arrangement=arrangement((True,False,True,False,True,False)), effects={'reverb':.25,'pan':-.2}),
    part('rhythm', 'Percussão de madeira', 'pulse', recorded('percussion','conga',pitched=False),
         [R, drums('.... ..x. .... x...' * 4), R, drums('...x ..x. .... x.x.' * 4), drums('.... .... .... x...' * 4), drums('...x ..x. .x.. x.x.' * 4)], [4]*6,
         gain=.16, lpf=4500, hpf=130, effects={'reverb':.1,'pan':-.35}),
    part('response', 'Guitarra circular', 'phrase', recorded('guitars','muted'), [guitar(p) for p in PLANS], [4]*6,
         octave=3, gain=.24, gate=.5, lpf=3300, hpf=200, mapping={'fileDegrees':0}, arrangement=arrangement((False,True,False,True,True,False)), effects={'delay':.12,'pan':.3}),
    part('rhythm', 'Pandeirola de estrada', 'pulse', recorded('percussion','tambourine',pitched=False),
         [R,R,R,drums('.... x... .... x...' * 4),R,drums('.... x... .... x...' * 4)], [4]*6, gain=.16,lpf=6500,hpf=1500,effects={'pan':.2}),
    part('harmony', 'Órgão em pulsos', 'phrase', recorded('keys','organ'),
         [progression(p,lambda r:f'{r},{r+2},{r+4}_ . . . 0?0 . . . . . {r},{r+4} . . . . .') for p in PLANS], [4]*6,
         octave=3,gain=.07,lpf=2000,hpf=150,arrangement=arrangement((False,False,True,True,False,True)),effects={'reverb':.2,'pan':-.2}),
    part('rhythm','Caixa motorik','pulse',recorded('percussion','snare',pitched=False),
         [R,SN,drums('.... .... X... ....'*4),SN,drums('.... x... .... x...'*4),SN], [4]*6,gain=.52,lpf=7500,hpf=140,effects={'reverb':.09}),
    part('melody','Guitarra do Reno','phrase',recorded('guitars','clean'),[R,LEAD,R,LEAD,R,bars(bar('7_ . . . 6 . 4 . 7_ . 9 . 0?0 . . .'),S,bar('6_ . . . 4 . 3 . 4_ . . . 0?0 . . .'),bar('. . . . 2 . 3 . 4 . 2 . 0_ . 0?0 .'))],[4]*6,
         octave=3,gain=.32,attack=.008,release=.22,lpf=3800,hpf=160,mapping={'fileDegrees':0},arrangement=arrangement((False,True,False,True,False,True)),effects={'reverb':.25,'delay':.16}),
    part('bass','Baixo motorik','phrase',recorded('guitars','bass'),[bass(p,i in (0,2,4)) for i,p in enumerate(PLANS)],[4]*6,
         octave=2,gain=.55,gate=.65,lpf=1800,hpf=30,design={'role':'bass'},mapping={'fileDegrees':0,'panWidth':0}),
    part('texture','Bordão de cordas','sustain',recorded('classical','cello-sustain'),[drone(p) for p in PLANS],[4]*6,
         octave=3,gain=.1,attack=.4,release=.6,lpf=2300,hpf=100,arrangement=arrangement((False,False,True,False,True,False)),effects={'reverb':.3,'pan':.15}),
    part('rhythm','Bumbo motorik','pulse',recorded('percussion','kick',pitched=False),
         [drums('X... .... X... ....'*4),K,drums('X... .... .... ....'*4),K,K,K],[4]*6,gain=.68,lpf=6500,hpf=25,mapping={'panWidth':0}),
    part('response','Flauta de estúdio','phrase',recorded('classical','flute-sustain'),[FLUTE,R,FLUTE,R,FLUTE,R],[4]*6,
         octave=4,gain=.15,attack=.04,release=.15,lpf=3400,hpf=250,mapping={'fileDegrees':0},effects={'reverb':.24,'pan':-.3}),
    part('rhythm','Chimbal aberto suave','pulse',recorded('percussion','open-hat',pitched=False),
         [R,R,R,drums('.... .... .... ..x.'*4),R,drums('.... ..x. .... ..x.'*4)],[4]*6,gain=.12,lpf=7000,hpf=2200),
    part('harmony','Guitarra de eco','phrase',recorded('guitars','clean'),
         [progression(p,lambda r:f'. . . . . . . . {r+4}_ . . . 0?0 . . .') for p in PLANS],[4]*6,
         octave=3,gain=.13,lpf=2600,hpf=250,arrangement=arrangement((False,False,True,False,True,True)),effects={'delay':.3,'reverb':.25,'pan':.35}),
    part('rhythm','Chimbal motorik','pulse',recorded('percussion','hat',pitched=False),[drums('x... x... x... x...'*4),HAT,R,HAT,drums('x.x. .... x.x. ....'*4),HAT],[4]*6,
         gain=.23,lpf=7000,hpf=2200,effects={'pan':.18}),
    part('texture','Ar de fita','sustain',synth('pink'),[bars(*[S]*3,bar('0_ . . . . . . . 0?0 . . . . . . .'))]*6,[4]*6,
         gain=.018,attack=.5,release=.3,lpf=1100,hpf=400,arrangement=arrangement((True,False,True,False,False,False)),effects={'reverb':.2}),
    part('rhythm','Tons de estúdio','pulse',recorded('percussion','conga',pitched=False),
         [R,drums('.'*56+'x...x...'),R,drums('.'*48+'....x...x.x.xx..'),R,drums('.'*48+'....x...xx.x.x..')],[4]*6,gain=.22,lpf=3500,hpf=90,effects={'pan':-.15}),
]

profile = {
    'name': 'Rhein · Krautrock 1970', 'bpm': 125, 'root': 'C', 'scale': 'Menor natural', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Hook', 'Interlude', 'Hook'],
    'parts': parts,
    'reactions': reactions([
        # The song form follows the game: a thin intro, the verse in the middlegame, the chorus as the stakes rise.
        rule('dus-opening', 'opening', 'both', 1, True, [act('lpf', 2800, rampBars=4)]),
        rule('dus-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
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
    'reference': 'Krautrock alemão do início dos anos 70: pulso motorik, improvisação e timbres orgânicos; material original, sem reconstrução de 1970',
    'url': 'https://www.rockhall.com/wp-content/uploads/2024/03/Kraftwerk_26746_RNRHF_2021_Highres-11.pdf',
}
expanded_form(profile, order=[0,1,6,3,2,7,4,5], labels=profile['sectionLabels']+['Solo','Bridge'],
    lengths=profile['sections']+[32,32], roots=PLANS+[PEDAL,FLOAT], additions={
    'a1':(None,drone(FLOAT)), 'a2':(drums('...x ..x. .... x...' * 4),drums('.... .... x... ....'*4)),
    'b1':(guitar(PEDAL),None), 'b2':(None,None), 'c1':(None,drone(FLOAT)),
    'c2':(SN,drums('.... .... x... ....'*4)), 'd1':(None,None), 'd2':(bass(PEDAL),bass(FLOAT,True)),
    'e1':(None,drone(FLOAT)), 'e2':(K,drums('X... .... .... ....'*4)),
    'f1':(bars(bar('0_ . . . 2 . 4 . 3 . 2 . 0?0 . . .'),bar('4_ . . . 6 . 7 . 6 . 4 . 0?0 . . .'),bar('3_ . . . 4 . 6 . 4 . 2 . 0?0 . . .'),bar('2 . 3 . 4_ . . . 2 . 0 . 0?0 . . .')),None),
    'f2':(None,None), 'g1':(None,progression(FLOAT,lambda r:f'{r+7}_ . . . . . . . 0?0 . . . . . . .')),
    'g2':(drums('x.x. x.x. x.x. x.x.'*4),None), 'h1':(None,None),
    'h2':(drums('.'*48+'x...x...x.x.xx..'),drums('x... .... ..x. ....'*4)),
})
write('dusseldorf', profile)
