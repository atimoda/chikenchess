"""Rio de Janeiro 1984 · ensaio na quadra da Estação Primeira de Mangueira (original material).

A rehearsal night in the Mangueira quadra the year the Sambódromo opened: the
mestre's apito and the repique's chamada start the bateria, and the whole
quadra sings the samba-enredo over it. The bateria leads: surdo de primeira
open on the second beat and muted on the first — no surdo de segunda answering,
the marking the Mangueira bateria takes its name from (Surdo Um) — and the surdo
de terceira cutting between them; caixas de guerra and tarol in sixteenths,
tamborins in teleco-teco and carreteiro, chocalhos, agogô, reco-reco and two
cuícas 'talking'. The cavaquinho is the only harmony. The paradinha (a check)
stops the bateria for the repiques' and tamborins' convenção. G major.
Form: esquenta (apito and chamada) · samba (verse) · paradinha · refrão ·
bateria alone · refrão with everyone.
Degrees (G major): 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F# · 7 G'.
"""
from brkit import act, arrangement, bars, brasil, comp, hits, line, over, part, reactions, rule, samba, lasting_safe, write

S = 8
VERSE = ('G', 'Em', 'Am', 'D7', 'G', 'Em', 'Am', 'D7', 'C', 'C', 'G', 'Em', 'Am', 'D7', 'G', 'G')
REFRAIN = ('C', 'C', 'G', 'G', 'Am', 'D7', 'G', 'G')
CHORD = {'G': '0,2,4', 'Em': '-2,0,2', 'Am': '1,3,5', 'D7': '-3,-1,1,3', 'C': '-4,-2,0'}
REST = ' '.join(['.'] * S)
SAMBA = ['4 . 4 . 4 5 . 4', '. 2 . 0 2 . . .', '1 . 1 . 1 2 . 3', '. 4 . 3 1 . . .',
         '4 . 4 . 7 . 6 5', '4 . 2 . . 0 2 .', '3 . 3 . 5 . 3 1', '. 0 . -1 -3 . . .',
         '3 . 3 . 3 4 . 5', '. 7 . 5 3 . . .', '2 . 2 . 2 4 . 6', '. 7 . 6 4 . . .',
         '5 . 5 . 4 3 . 1', '. 3 . 1 -1 . . .', '0 . . . . . . .', '. . . . 4 . 6 .']
REFRAO = ['7 . 7 . 7 . 8 .', '7 . 5 . 3 . . .', '6 . 6 . 6 . 7 .', '6 . 4 . 2 . . .',
          '5 . 5 . 5 . 6 .', '5 . 3 . 1 . . .', '2 . 2 . 4 . 2 .', '0 . . . . . . .']


def mel(lines):
    return bars(*(line(text, S) for text in lines))


def cavaco(progression, rhythm='X.xx .x.x'):
    return over(progression, lambda c: comp(CHORD[c], rhythm))


def drum(pattern):
    return hits(pattern, steps=S)


TELECO = 'X.x..x.x .x.xx.x.'
CARRETEIRO = 'XgxgXgxg XgxgXgxX'
# Paradinha (convenção): the bateria stops and answers together on fixed accents.
CONVENCAO = 'X... .... X.X. ..X. X... ..X. X.X. X...'
parts = [
    # a1 · rook: surdo de primeira, open on the second beat.
    part('rhythm', 'Surdo de primeira', 'pulse', brasil('surdo-mangueira'), [
        drum('.... X...'), drum('.... X...'), hits(CONVENCAO), drum('.... X...'), drum('.... X..x'), drum('.... X..x'),
    ], [1, 1, 4, 1, 1, 1], gain=.45, clip=1, lpf=2500, hpf=28, mapping={'panWidth': 0}, effects={'reverb': .08, 'pan': 0},
        arrangement=arrangement((False, True, True, True, True, True))),
    # a2 · pawn: the same surdos muted on the first beat.
    part('rhythm', 'Surdo · abafado', 'pulse', brasil('surdo-abafado'), [
        drum('X... ....'), drum('X... ....'), drum('X... ....'), drum('X... ....'), drum('X... ..x.'), drum('X... ..x.'),
    ], [1] * 6, gain=.38, clip=.8, lpf=2500, hpf=30, mapping={'panWidth': 0}, effects={'reverb': .06, 'pan': 0},
        arrangement=arrangement((False, True, False, True, True, True))),
    # b1 · knight: repique, the chamada and the convenção.
    part('rhythm', 'Repique · chamada', 'pulse', samba('repinique'), [
        hits('X.X. X.X. XxXx X... X.X. X.X. XXXX X...'), drum('x.xX .xx.'), hits('X.xx .xX. X.xx .XXX x.xX .xx. XXXX X...'), drum('x.xX .xx.'), drum('X.xX .xX.'), drum('x.xX .xxx'),
    ], [4, 1, 4, 1, 1, 1], gain=.22, clip=.8, lpf=9000, hpf=200, effects={'reverb': .1, 'pan': -.25}),
    # b2 · pawn: tamborins, teleco-teco and carreteiro.
    part('rhythm', 'Tamborim', 'pulse', brasil('tamborim'), [
        hits(TELECO), hits(TELECO), hits(CARRETEIRO), hits(TELECO), hits(CARRETEIRO), hits(CARRETEIRO),
    ], [2] * 6, gain=.24, clip=.7, lpf=9000, hpf=300, effects={'reverb': .06, 'pan': .25},
        arrangement=arrangement((False, True, True, True, True, True))),
    # c1 · bishop: the high cuíca.
    part('response', 'Cuíca aguda', 'pulse', brasil('cuica-aguda'), [
        drum('..x. .x.x'), drum('..x. .x.x'), drum('..x. ..x.'), drum('..xx .x.x'), drum('.xxx .x.x'), drum('..xx .xxx'),
    ], [1] * 6, gain=.2, clip=.9, lpf=6000, hpf=200, effects={'reverb': .1, 'pan': .4},
        arrangement=arrangement((False, True, False, True, True, True))),
    # c2 · pawn: caixas de guerra, in cima.
    part('rhythm', 'Caixa de guerra', 'pulse', samba('caixa'), [
        drum('.... ..xx'), drum('xXgx xXgx'), drum('X... ....'), drum('xXgx xXgx'), drum('xXgx xXgX'), drum('xXgX xXgX'),
    ], [1] * 6, gain=.2, clip=.6, lpf=10000, hpf=200, effects={'reverb': .08, 'pan': -.15},
        arrangement=arrangement((False, True, False, True, True, True))),
    # d1 · queen: the quadra singing the samba-enredo.
    part('melody', 'Coro da quadra', 'phrase', brasil('coro-laia', True), [
        mel(REFRAO[4:]), mel(SAMBA), mel(REFRAO[:4]), mel(REFRAO * 2), mel(REFRAO * 2), mel(REFRAO * 2),
    ], [4, 16, 4, 16, 16, 16], octave=4, gain=.24, attack=.03, decay=.4, sustain=.75, release=.2, gate=.9, lpf=6000, hpf=150,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, True, True, False, True)), effects={'reverb': .3, 'pan': 0}),
    # d2 · pawn: tarol.
    part('rhythm', 'Tarol', 'pulse', samba('tarol'), [
        drum('.... ..xx'), drum('x.xx x.xx'), drum('x... ....'), drum('x.xx x.xx'), drum('xxxx x.xx'), drum('xxxx xxxx'),
    ], [1] * 6, gain=.14, clip=.6, lpf=10000, hpf=300, effects={'reverb': .08, 'pan': .15},
        arrangement=arrangement((False, True, False, True, True, True))),
    # e1 · king: the cavaquinho, the samba's only harmony.
    part('harmony', 'Cavaquinho', 'phrase', brasil('cavaquinho', True), [
        cavaco(REFRAIN[4:]), cavaco(VERSE), cavaco(REFRAIN[:4], 'X... ....'), cavaco(REFRAIN * 2), cavaco(REFRAIN * 2, 'X... .x.x'), cavaco(REFRAIN * 2, 'X.xx .xxx'),
    ], [4, 16, 4, 16, 16, 16], octave=4, gain=.2, attack=.002, decay=.25, sustain=.1, release=.08, gate=.4, lpf=9000, hpf=300,
        mapping={'fileDegrees': 0}, arrangement=arrangement((False, True, False, True, False, True), restart=False), effects={'reverb': .1, 'pan': .2}),
    # e2 · pawn: chocalhos.
    part('rhythm', 'Chocalho', 'pulse', samba('chocalho'), [
        drum('x.x. x.x.'), drum('gxgX gxgX'), drum('x... x...'), drum('gxgX gxgX'), drum('gxgX gxgX'), drum('gXgX gXgX'),
    ], [1] * 6, gain=.12, clip=.6, lpf=12000, hpf=2500, effects={'reverb': .05, 'pan': -.3},
        arrangement=arrangement((False, True, False, True, True, True))),
    # f1 · bishop: the low cuíca answering.
    part('response', 'Cuíca grave', 'pulse', brasil('cuica-grave'), [
        drum('x... ..x.'), drum('x... ..x.'), drum('x... ....'), drum('x..x ..x.'), drum('x.x. ..x.'), drum('x..x ..xx'),
    ], [1] * 6, gain=.2, clip=.9, lpf=5000, hpf=120, effects={'reverb': .1, 'pan': -.4},
        arrangement=arrangement((False, False, False, True, True, True))),
    # f2 · pawn: agogô.
    part('rhythm', 'Agogô', 'pulse', samba('agogo-agudo'), [
        drum('x... ....'), hits('x.x..x.x x.x.x.x.'), drum('x... ....'), hits('x.x..x.x x.x.x.x.'), hits('x.x..x.x x.x.x.xx'), hits('x.x..x.x x.x.x.xx'),
    ], [1, 2, 1, 2, 2, 2], gain=.08, clip=.5, lpf=9000, hpf=800, effects={'reverb': .1, 'pan': .35},
        arrangement=arrangement((False, True, False, True, True, True))),
    # g1 · knight: the mestre's apito commanding the entries and the paradinha.
    part('response', 'Apito do mestre', 'pulse', brasil('apito'), [
        hits('X... X... X.X. X...' + ' ....' * 4), hits('X...' + ' ....' * 31), hits('X... .... .... .... X.X. .... .... ....'),
        hits('X...' + ' ....' * 31), hits('X... .... X... ....' + ' ....' * 28), hits('X...' + ' ....' * 31),
    ], [4, 16, 4, 16, 16, 16], gain=.12, clip=1, lpf=8000, hpf=800, effects={'reverb': .25, 'pan': .3}),
    # g2 · pawn: reco-reco.
    part('rhythm', 'Reco-reco', 'pulse', brasil('reco-reco'), [
        drum('.... x...'), drum('x.xx x.xx'), drum('.... x...'), drum('x.xx x.xx'), drum('x.xx x.xx'), drum('x.xx x.xx'),
    ], [1] * 6, gain=.1, clip=.6, lpf=9000, hpf=1500, effects={'reverb': .05, 'pan': .3},
        arrangement=arrangement((False, False, False, True, True, True))),
    # h1 · rook: surdo de terceira, the cutting surdo.
    part('rhythm', 'Surdo de terceira · corte', 'pulse', samba('surdo-viradeira'), [
        drum('.... ..x.'), drum('..x. ..xx'), drum('X... ..X.'), drum('..x. .xxx'), drum('.xx. ..xx'), drum('.xx. .xxx'),
    ], [1] * 6, gain=.26, clip=.8, lpf=3500, hpf=40, effects={'reverb': .06, 'pan': .1},
        arrangement=arrangement((False, True, True, True, True, True))),
    # h2 · pawn: tamborim viradas into each section.
    part('rhythm', 'Tamborim · virada', 'pulse', brasil('tamborim-abafado'), [
        drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('.... ...g'), drum('XxXx XXXX'),
    ], [1] * 6, gain=.2, clip=.6, lpf=9000, hpf=300, effects={'reverb': .06, 'pan': -.3},
        arrangement=arrangement(variations=(0, 1, 2, 3, 4, 0), fills=(5, 5, 5, 5, 5, None))),
]

profile = {
    'name': 'Rio de Janeiro 1984 · Ensaio da Mangueira', 'bpm': 138, 'meter': '2/4', 'root': 'G', 'scale': 'Maior', 'harmony': 'static',
    'swing': 0, 'sections': [8, 32, 8, 32, 32, 32], 'sectionLabels': ['Intro', 'Verse', 'Break', 'Chorus', 'Interlude', 'Chorus'],
    'parts': parts,
    'reactions': reactions(lasting_safe([
        rule('mng-opening', 'opening', 'both', 1, True, [act('gain', -3)]),
        rule('mng-middle', 'middle', 'both', 1, True, [act('gain', 2)]),
        # The endgame is the last refrão at full bateria, the tempo pushing like the end of the ensaio.
        rule('mng-endgame', 'endgame', 'both', 1, True, [act('variation', 5), act('bpm', 4, rampBars=8), act('gain', 4)]),
        # Castling brings the whole quadra into the refrão.
        rule('mng-castle', 'firstCastle', 'both', 4, True, [act('variation', 3)]),
        # A check is the mestre's apito: paradinha, the bateria answers the convenção.
        rule('mng-check', 'check', 'actor', 1, True, [act('activate'), act('variation', 2)]),
        # Every capture hits the surdos harder for the capturer.
        rule('mng-capture', 'capture', 'actor', 1, False, [act('gain', 5)], 'drums'),
        rule('mng-queen', 'queenCapture', 'both', 4, True, [act('variation', 2), act('reverb', .3)]),
        # Quiet manoeuvring: the bateria plays alone, cuícas and tamborins in front.
        rule('mng-quiet', 'quiet', 'both', 2, True, [act('variation', 4)]),
        rule('mng-tension', 'tension', 'both', 1, True, [act('lpf', 2500, rampBars=4)], 'lead'),
        rule('mng-swing', 'evalSwing', 'actor', 2, True, [act('variation', 4), act('drive', 2)], 'drums'),
        rule('mng-promotion', 'promotion', 'actor', 2, True, [act('transpose', 12)], 'lead'),
        rule('mng-drought', 'captureDrought', 'both', 1, True, [act('reverb', .3), act('gain', -2)]),
    ])),
    'reference': 'Ensaio da bateria Surdo Um e do samba-enredo na quadra da Estação Primeira de Mangueira; 1984 é ambientação (inauguração do Sambódromo): referência de estilo; material original',
    'url': 'https://pt.wikipedia.org/wiki/Esta%C3%A7%C3%A3o_Primeira_de_Mangueira',
}
write('rio-1984', profile)
