"""Tokyo · Minimal: soft timbral cells and displaced accents, original material.
The 1991 scene date is not a claim that later Japanese microsound existed then.
130 BPM remains the clock, but sparse kick and interlocking 5-step/7-step cells
make the phrasing less square. E major, mostly a pedal, with brief C#m/A detours.
"""
from kit import (act, arrangement, bar, bars, drums, expanded_form, machine, part, reactions, recorded, rule, synth, write)

R = ' '.join(['.']*64)


def points(events):
    cells = ['.']*64
    for step, note in events.items():
        cells[step] = str(note)
    return ' '.join(cells)


def cell(interval, phase=0, notes=('0',)):
    return points({step:notes[i%len(notes)] for i,step in enumerate(range(phase,64,interval))})


def make(role,name,behavior,source,patterns,**kw):
    return part(role,name,behavior,source,[p or R for p in patterns],[4]*6,
                arrangement=arrangement(tuple(p is not None for p in patterns)),**kw)


AIR = points({0:'0,4_ ',12:'0?0',32:'0,4_',44:'0?0'})
SUB = points({0:'0',11:'0',26:'0',35:'4',48:'0',59:'0'})
KICK = drums('X... .... ..x. .... .... x... .... x... X... .... ...x .... .... x... ..x. ....')
TICK = cell(7,3,("0'", '0?70'))
PINGS = cell(5,1,('0', "4'", '2', "4'"))
parts = [
 make('texture','Tiques de papel','pulse',machine('synth-tick'),[TICK,TICK,None,cell(7,1),None,cell(7,5)],gain=.12,clip=.3,lpf=4200,hpf=1800,effects={'pan':-.35,'reverb':.04}),
 make('rhythm','Grãos de maraca','pulse',machine('808-maracas'),[None,None,None,cell(5,2,("0'",)),cell(11,6,("0'",)),cell(5,4,("0'",))],gain=.12,clip=.3,lpf=5000,hpf=1800,effects={'pan':.3}),
 make('response','Pontos em cinco','phrase',synth('triangle'),[None,PINGS,None,PINGS,cell(7,2,('0','4')),cell(5,3,('0','2','4'))],octave=3,gain=.13,attack=.008,decay=.12,sustain=.1,release=.07,gate=.35,lpf=1800,hpf=200,mapping={'fileDegrees':0},effects={'delay':.12,'pan':.25}),
 make('rhythm','Caixa de bolso','pulse',machine('808-rim'),[None,points({12:'0',31:"0'",44:'0',61:"0'"}),None,points({8:'0',28:'0',40:'0',60:'0'}),None,points({8:'0',27:'0',40:'0',59:'0'})],gain=.18,clip=.4,lpf=2800,hpf=300,effects={'reverb':.07}),
 make('harmony','Vidro fosco','phrase',recorded('synths','fm-bell'),[points({0:'0',37:'4'}),None,points({5:'0',41:'2'}),None,points({0:'0',27:'4',50:'2'}),None],octave=3,gain=.035,attack=.02,decay=.3,release=.18,lpf=2200,hpf=250,mapping={'fileDegrees':0},effects={'reverb':.24}),
 make('rhythm','Chimbal de tecido','pulse',machine('808-hat'),[None,cell(8,2,("0'",)),None,cell(8,2,('0',"0'")),cell(16,6,("0'",)),cell(8,2,('0',"0'"))],gain=.16,clip=.3,lpf=5500,hpf=2000,effects={'pan':.15}),
 make('melody','Gotas senoidais','phrase',synth('sine'),[None,None,points({4:'4_',8:'0?0',39:'2_',43:'0?0'}),points({0:'4',13:'2',29:'0',47:'4',58:'2'}),None,points({3:'4',18:'2',31:'0',46:'2',60:'4'})],octave=4,gain=.12,attack=.015,decay=.15,sustain=.2,release=.1,gate=.5,lpf=2000,hpf=250,mapping={'fileDegrees':0},effects={'delay':.16,'reverb':.18}),
 make('bass','Sub pontilhado','phrase',synth('sine'),[points({0:'0',32:'0'}),SUB,points({0:'0_',8:'0?0',32:'0_',40:'0?0'}),SUB,points({3:'0',35:'0'}),points({0:'0',10:'0',27:'0',35:'4',48:'0',61:'0'})],octave=2,gain=.42,attack=.005,decay=.22,sustain=.2,release=.08,gate=.6,lpf=450,hpf=30,design={'role':'bass'},mapping={'fileDegrees':0,'panWidth':0}),
 make('texture','Ar entre notas','sustain',synth('triangle'),[AIR,None,AIR,None,AIR,None],octave=3,gain=.035,attack=.4,release=.4,lpf=1300,hpf=220,effects={'reverb':.3}),
 make('rhythm','Bumbo macio','pulse',machine('808-kick'),[points({0:'0',32:'0'}),KICK,None,KICK,points({0:'0',32:'0'}),KICK],gain=.46,clip=.45,lpf=3500,hpf=25,mapping={'panWidth':0}),
 make('response','Madeira afinada','phrase',recorded('guitars','muted'),[None,None,points({11:'0',29:'4',53:'2'}),None,points({3:'0',26:'2',55:'4'}),points({7:'2',38:'4',57:'0'})],octave=3,gain=.16,gate=.35,lpf=2200,hpf=300,mapping={'fileDegrees':0},effects={'pan':-.25,'reverb':.12}),
 make('rhythm','Sopro de chimbal','pulse',machine('808-open-hat'),[None,None,None,points({30:"0'",62:"0'"}),None,points({14:"0'",46:"0'"})],gain=.09,clip=.3,lpf=4500,hpf=2000),
 make('response','Blips velados','pulse',machine('synth-blip'),[None,points({23:'0',54:"0'"}),None,None,points({17:"0'",51:'0'}),points({22:'0',53:"0'"})],gain=.08,clip=.3,lpf=1800,hpf=300,effects={'pan':.35,'delay':.12}),
 make('rhythm','Clave em sete','pulse',machine('808-clave'),[None,None,None,cell(7,4,("0'",)),None,cell(7,6,("0'",))],gain=.1,clip=.4,lpf=2600,hpf=500,effects={'pan':-.3}),
 make('texture','Respiração curta','sustain',synth('pink'),[points({48:'0_',52:'0?0'}),None,points({48:'0_',56:'0?0'}),None,None,None],gain=.012,attack=.2,release=.15,lpf=1200,hpf=400,effects={'reverb':.15}),
 make('rhythm','Tom deslocado','pulse',machine('808-tom-low'),[None,None,None,points({21:'0',54:"0'"}),points({47:'0'}),points({19:'0',51:"0'",61:'0'})],gain=.12,clip=.5,lpf=1800,hpf=90,effects={'pan':.2}),
]

profile = {
    'name': 'Shibaura · Minimal 1991', 'bpm': 130, 'root': 'E', 'scale': 'Maior', 'harmony': 'static',
    'swing': 0, 'sections': [32, 64, 32, 64, 32, 64], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Hook', 'Interlude', 'Hook'],
    'parts': parts,
    'reactions': reactions([
        rule('tyo-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('tyo-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        rule('tyo-endgame', 'endgame', 'both', 1, True, [act('variation', 5)]),
        rule('tyo-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        rule('tyo-check', 'check', 'actor', 1, True, [act('activate'), act('gain', 3)]),
        # Precision: every capture is a glitch — the ticks and blips stutter for the capturer.
        rule('tyo-capture', 'capture', 'actor', 1, False, [act('delay', .2), act('gain', 1)], 'fx'),
        rule('tyo-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('invert')]),
        rule('tyo-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('tyo-tension', 'tension', 'both', 1, True, [act('lpf', 1200, rampBars=8)], 'lead'),
        rule('tyo-swing', 'evalSwing', 'actor', 2, True, [act('variation', 5), act('transpose', 2)]),
        rule('tyo-promo', 'promotion', 'actor', 4, True, [act('mode', 3)]),
    ]),
    'reference': 'Minimal eletrônico: espaço negativo, células deslocadas e introdução gradual de timbres; estudo original ambientado em Tokyo, não reconstrução histórica de 1991',
    'url': 'https://en.wikipedia.org/wiki/Japanese_electronic_music',
}
expanded_form(profile,order=[0,1,6,3,2,7,4,5],labels=profile['sectionLabels']+['Turnaround','Bridge'],
 lengths=profile['sections']+[16,32], roots=[[0]*4]*6+[[0]*4,[-2]*4], additions={
 'a1':(cell(5,2,("0'",)),None), 'a2':(cell(7,4,("0'",)),None),
 'b1':(cell(3,0,('0','4','2')),None), 'b2':(points({11:'0',24:'0',39:'0',58:'0'}),None),
 'c1':(None,points({0:'0',23:'2',49:'5'})), 'c2':(cell(8,6,("0'",)),None),
 'd1':(None,points({8:'5_',16:'0?0',40:'4_',48:'0?0'})),
 'd2':(points({0:'0',9:'0',23:'4',32:'0',42:'0',57:'4'}),points({0:'-2_',12:'0?0',32:'-2_',44:'0?0'})),
 'e1':(None,points({0:'-2,2_',24:'0?0',32:'-2,4_',56:'0?0'})),
 'e2':(drums('X... ..x. .... x... X... .... x..x .... X... ..x. .... x... X... .... .... ....'),None),
 'f1':(None,points({19:'0',45:'2',60:'4'})), 'f2':(None,None), 'g1':(None,None),
 'g2':(cell(7,3,("0'",)),None), 'h1':(None,None), 'h2':(points({26:'0',55:'0'}),points({31:'0'})),
})
write('tokyo', profile)
