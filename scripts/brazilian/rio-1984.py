"""Rio de Janeiro 1984 · ensaio da bateria da Estação Primeira de Mangueira (original material).

A rehearsal night in the Mangueira quadra the year the Sambódromo opened, bateria only:
the mestre's apito and the repique's chamada start it, and the surdos carry the samba in
2/4. Mangueira's own marking: one surdo de primeira, muted by the hand on the first beat
and open and heavy on the second (no surdo de segunda answering), with the surdo de
terceira cutting between them. Over it the caixas de guerra play sixteenths with the
accent on the second and fourth, the tarol fills the sixteenths, the tamborins play
teleco-teco and, in the refrão, their 'desenhos', chocalhos of platinelas shimmer on the
off-sixteenths, the agogô and reco-reco ride on top, two repiques talk and the cuícas sing.
Form: esquenta (apito, chamada, entrada) · samba · paradinha (convenção) · refrão ·
bossa da bateria (surdos and caixas drop out, tamborins and repiques in front) · refrão.
All drums come from chicken-bateria-v1 (recorded) and the Salvador recordings (repique,
tarol, agogô); only the cuícas are synthesized.
"""
from brkit import act, arrangement, bateria, brasil, hits, part, reactions, rule, samba, lasting_safe, write

S = 8


def drum(*bars_):
    """Bars of 8 sixteenths (2/4) written as 'xxxx xxxx'; several bars play in sequence."""
    return hits(' '.join(bars_), steps=S)


REST = '.... ....'


# Esquenta: bars 1–4 the apito and the repique call the bateria, bars 5–8 it plays.
def enters(groove, n=4):
    return drum(*([REST] * n + [groove] * (8 - n)))


# Paradinha (convenção): the whole bateria stops and plays the same figure, the repiques answer.
CONV_A = ('X... X.X.', '..X. X...', 'X.X. X.X.', 'X... ....')
CONV_B = (REST, REST, REST, '.... ..X.')
PARADINHA = CONV_A + CONV_A
PARADINHA_REPIQUE = ('X... X.X.', '..X. X...', 'X.X. X.X.', 'X... XxXx', 'X.xX .xX.', 'x.xX .xX.', 'X.xX .XXX', 'X... ....')

TELECO = ('X.x. .x.x', '.x.x x.x.')
DESENHO = ('X.X. X.XX', '.XX. X.X.', 'X.X. X.XX', 'X.XX X...')
CARRETEIRO = ('xXxx xXxx', 'xXxx xXxX')

parts = [
    # a1 · rook: the surdo de primeira, open and heavy on the second beat.
    part('rhythm', 'Surdo de primeira', 'pulse', bateria('surdo-primeira'), [
        enters('.... X...'), drum('.... X...'), drum(*PARADINHA), drum('.... X...'), drum('.... X...', '.... X..x'), drum('.... X...', '.... X.x.'),
    ], [8, 1, 8, 1, 2, 2], gain=.5, clip=1, lpf=3000, hpf=30, mapping={'panWidth': 0}, effects={'reverb': .08, 'pan': 0}),
    # a2 · pawn: the same surdos muted by the hand on the first beat.
    part('rhythm', 'Surdo abafado', 'pulse', bateria('surdo-mao'), [
        enters('X... ....'), drum('X... ....'), drum(*CONV_B, *CONV_B), drum('X... ....'), drum('X... ....', 'X... ..x.'), drum('X... ....', 'X..x ....'),
    ], [8, 1, 8, 1, 2, 2], gain=0.413, clip=1, lpf=2500, hpf=30, mapping={'panWidth': 0}, effects={'reverb': .05, 'pan': 0},
        arrangement=arrangement((True, True, True, True, False, True))),
    # b1 · knight: repique de marcação, the groove between surdos and caixas.
    part('rhythm', 'Repique', 'pulse', samba('repinique'), [
        enters('x.xX .xX.'), drum('x.xX .xX.', 'x.xX .xXx'), drum(*PARADINHA_REPIQUE), drum('x.xX .xX.', 'x.xX .xXx'), drum('X.xX .xX.', 'x.XX .xX.'), drum('x.xX .xX.', 'X.xX .xXX'),
    ], [8, 2, 8, 2, 2, 2], gain=0.336, clip=.8, lpf=10000, hpf=200, effects={'reverb': .08, 'pan': -.2}),
    # b2 · pawn: tamborins, teleco-teco in the samba and carreteiro in the refrão.
    part('rhythm', 'Tamborim', 'pulse', bateria('tamborim'), [
        enters('X.x. .x.x'), drum(*TELECO), drum(*PARADINHA), drum(*CARRETEIRO), drum(*TELECO), drum(*CARRETEIRO),
    ], [8, 2, 8, 2, 2, 2], gain=0.489, clip=.8, lpf=12000, hpf=300, effects={'reverb': .07, 'pan': .2}),
    # c1 · bishop: the high cuíca.
    part('response', 'Cuíca aguda', 'pulse', brasil('cuica-aguda'), [
        enters('..x. .x.x'), drum('..x. .x.x', '..x. ..xx'), drum(*CONV_B, *CONV_B), drum('..x. .x.x', '.xx. .x.x'), drum('..xx .x.x', '..x. .xxx'), drum('.xx. .x.x', '..xx .x.x'),
    ], [8, 2, 8, 2, 2, 2], gain=0.129, clip=.9, lpf=6000, hpf=250, effects={'reverb': .12, 'pan': .4},
        arrangement=arrangement((False, True, False, True, True, True))),
    # c2 · pawn: caixas de guerra played em cima, sixteenths accented on the second and fourth.
    part('rhythm', 'Caixa de guerra', 'pulse', bateria('caixa'), [
        enters('gXgX gXgX'), drum('gXgX gXgX'), drum(*PARADINHA), drum('gXgX gXgX', 'gXgX gXrX'), drum('g.g. g.g.'), drum('gXgX gXgX', 'gXgX rXrX'),
    ], [8, 1, 8, 2, 1, 2], gain=.24, clip=.8, lpf=12000, hpf=180, effects={'reverb': .07, 'pan': -.1}),
    # d1 · queen: the repique de chamada — the calls, the answers in the paradinha, the solo in the bossa.
    part('rhythm', 'Repique de chamada', 'phrase', samba('repinique'), [
        drum('X.X. X.X.', 'XxXx X...', 'X.X. X.X.', 'XxXx X.X.', REST, REST, REST, '.... XXXX'),
        drum(REST, REST, REST, REST, REST, REST, REST, 'XxXx X.X.'),
        drum(*PARADINHA_REPIQUE),
        drum(REST, REST, REST, REST, REST, REST, 'X.X. X.X.', 'XxXx XXXX'),
        drum('X.xX .xX.', 'XxXX .XxX', '.XxX .xX.', 'XxXx X.X.', 'x.xX .xX.', 'X.XX .X.X', 'XxXx XxXx', 'X... ....'),
        drum(REST, REST, REST, 'XxXx X.X.'),
    ], [8, 8, 8, 8, 8, 4], gain=0.355, clip=.8, gate=.6, lpf=11000, hpf=200, effects={'reverb': .1, 'pan': .25}),
    # d2 · pawn: tarol, filling every sixteenth under the caixas.
    part('rhythm', 'Tarol', 'pulse', samba('tarol'), [
        enters('xgxx xgxx'), drum('xgxx xgxx'), drum(*PARADINHA), drum('xgxx xgxx'), drum('x... x...'), drum('Xgxx Xgxx'),
    ], [8, 1, 8, 1, 1, 1], gain=0.242, clip=.7, lpf=11000, hpf=250, effects={'reverb': .07, 'pan': .15},
        arrangement=arrangement((True, True, True, True, False, True))),
    # e1 · king: the mestre's apito — it starts the esquenta, calls the paradinha and the bossa.
    part('response', 'Apito do mestre', 'pulse', bateria('apito'), [
        drum('X... X...', 'X.X. X...', REST, REST, REST, REST, REST, REST),
        drum('X... ....', *([REST] * 15)),
        drum('X... X...', REST, REST, REST, REST, REST, REST, REST),
        drum('X... ....', *([REST] * 15)),
        drum('X... X.X.', REST, REST, REST, REST, REST, REST, REST),
        drum('X... ....', *([REST] * 15)),
    ], [8, 16, 8, 16, 8, 16], gain=0.179, clip=1, lpf=9000, hpf=900, effects={'reverb': .25, 'pan': .3}),
    # e2 · pawn: chocalhos de platinelas on the off-sixteenths.
    part('rhythm', 'Chocalho', 'pulse', bateria('chocalho'), [
        enters('gXgX gXgX'), drum('gXgX gXgX'), drum(*PARADINHA), drum('gXgX gXgX'), drum('g.g. g.g.'), drum('gXgX gXgX'),
    ], [8, 1, 8, 1, 1, 1], gain=0.332, clip=.8, lpf=12000, hpf=2500, effects={'reverb': .05, 'pan': -.3}),
    # f1 · bishop: the low cuíca answering.
    part('response', 'Cuíca grave', 'sustain', brasil('cuica-grave'), [
        enters('x... ..x.'), drum('x... ..x.', 'x..x ..x.'), drum(*CONV_B, *CONV_B), drum('x... ..x.', 'x.x. ..x.'), drum('x..x ..x.', 'x... .xx.'), drum('x..x ..x.', 'x.x. ..xx'),
    ], [8, 2, 8, 2, 2, 2], gain=0.133, clip=.9, lpf=5000, hpf=150, effects={'reverb': .12, 'pan': -.4},
        arrangement=arrangement((False, False, False, True, True, True))),
    # f2 · pawn: agogô, two bars of bell.
    part('rhythm', 'Agogô', 'pulse', samba('agogo-agudo'), [
        enters('x.x. .x.x'), drum('x.x. .x.x', '.x.x x.x.'), drum(*CONV_B, *CONV_B), drum('x.x. .x.x', '.x.x x.x.'), drum('x.xx .x.x', '.x.x x.xx'), drum('x.x. .x.x', '.x.x x.xx'),
    ], [8, 2, 8, 2, 2, 2], gain=0.155, clip=.6, lpf=10000, hpf=800, effects={'reverb': .08, 'pan': .35},
        arrangement=arrangement((False, True, False, True, True, True))),
    # g1 · knight: the second tamborim wing, drawing the 'desenhos' in the refrão.
    part('rhythm', 'Tamborim · desenho', 'pulse', bateria('tamborim'), [
        enters('X.X. .X.X'), drum('X.X. .X.X', '.X.X X.X.'), drum(*PARADINHA), drum(*DESENHO), drum(*DESENHO), drum(*DESENHO),
    ], [8, 2, 8, 4, 4, 4], gain=0.358, clip=.8, lpf=12000, hpf=300, effects={'reverb': .08, 'pan': -.25},
        arrangement=arrangement((False, False, True, True, True, True))),
    # g2 · pawn: reco-reco.
    part('rhythm', 'Reco-reco', 'pulse', bateria('reco-reco'), [
        enters('x.xx x.xx'), drum('x.xx x.xx'), drum(*CONV_B, *CONV_B), drum('x.xx x.xx'), drum('xxxx x.xx'), drum('xxxx xxxx'),
    ], [8, 1, 8, 1, 1, 1], gain=0.144, clip=.7, lpf=11000, hpf=1200, effects={'reverb': .05, 'pan': .3},
        arrangement=arrangement((False, True, False, True, True, True))),
    # h1 · rook: surdo de terceira, cutting between the primeira's strokes.
    part('rhythm', 'Surdo de terceira', 'pulse', bateria('surdo-terceira'), [
        enters('..x. .xX.'), drum('..x. .xX.', '..x. x.X.'), drum(*PARADINHA), drum('..x. .xX.', '..x. x.X.'), drum('.xx. .xX.', '..xx x.X.'), drum('.xX. .xX.', '..x. xxX.'),
    ], [8, 2, 8, 2, 2, 2], gain=0.253, clip=1, lpf=4000, hpf=40, effects={'reverb': .06, 'pan': .1}),
    # h2 · pawn: tamborim viradas into each section.
    part('rhythm', 'Tamborim · virada', 'pulse', bateria('tamborim-abafado'), [
        drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('XxXx XXXX'),
    ], [1] * 6, gain=0.379, clip=.8, lpf=12000, hpf=300, effects={'reverb': .06, 'pan': -.3},
        arrangement=arrangement((True, True, True, True, True, False), fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Rio de Janeiro 1984 · Ensaio da Mangueira', 'bpm': 140, 'meter': '2/4', 'root': 'G', 'scale': 'Maior', 'harmony': 'static',
    'swing': .06, 'sections': [8, 32, 8, 32, 32, 32], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions(lasting_safe([
        rule('mng-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('mng-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        # The endgame is the last refrão at full bateria, the tempo pushing like the end of the ensaio.
        rule('mng-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('bpm', 4, rampBars=8), act('gain', 4)]),
        # Castling brings the whole bateria into the refrão.
        rule('mng-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # A check is the mestre's apito: paradinha, the bateria plays the convenção together.
        rule('mng-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 2)]),
        # Every capture hits the drums harder for the capturer.
        rule('mng-capture', 'capture', 'actor', 1, False, [act('gain', 5)], 'drums'),
        rule('mng-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('reverb', .3)]),
        # Quiet manoeuvring: the bossa, surdos and caixas out, tamborins and repiques in front.
        rule('mng-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('mng-tension', 'tension', 'both', 1, True, [act('lpf', 3000, rampBars=4)], 'drums'),
        rule('mng-swing', 'evalSwing', 'actor', 2, True, [act('variation', 4), act('drive', 2)], 'drums'),
        rule('mng-promotion', 'promotion', 'actor', 2, True, [act('variation', 5), act('gain', 4)]),
        rule('mng-drought', 'captureDrought', 'both', 1, True, [act('reverb', .3), act('gain', -2)]),
    ])),
    'reference': 'Ensaio da bateria da Estação Primeira de Mangueira (surdo de primeira sem surdo de segunda, paradinha, bossa); 1984 é ambientação (inauguração do Sambódromo): referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/Esta%C3%A7%C3%A3o_Primeira_de_Mangueira',
}
write('rio-1984', profile)
