"""Original CC0 drum-machine palette for the Electronic World kits (chicken-machines-v1).

Analog-style models of the classic machines, written from their published
circuit behaviour (no sampled recordings):
  808  bridged-T kick with long boom, two-tone snare, clap, rim, cowbell, clave,
       six-square cymbal bank, toms and congas      (electro, early house, Detroit, YMO)
  909  pitch-swept kick with click, snappy snare, hats/ride from metal partials
                                                      (house, acid, techno)
  linn LinnDrum-style acoustic hits with gated room   (balearic, synth-pop)
  brk  breakbeat kit: round kick, cracking snare, ghost, hat and ride (rave, jungle)
  dst  dusty versions of the break kit: 12-bit, low-passed, vinyl noise (trip-hop)
  syn  Kling Klang-style synth drums: sine kick, noise snare, blip, metallic tick
Run: python3 scripts/generate-machine-samples.py && node scripts/encode-samples.mjs public/samples/chicken-machines-v1
"""
import math
import random

from synthkit import TAU, TR808_METAL, OnePole, Room, Svf, crush, env, metal, write

BANK = 'chicken-machines-v1'
R = 32000


def frames(seconds, rate=R):
    return [i / rate for i in range(round(seconds * rate))]


# ---------------------------------------------------------------- TR-808 style
def k808(decay=.55, tune=50, click=.25, seed='k808'):
    rng, out, phase = random.Random(seed), [], 0.0
    lp = OnePole(R, 3000)
    for t in frames(decay * 3.2):
        freq = tune * (1 + .45 * math.exp(-t * 38))
        phase += freq / R
        body = math.sin(TAU * phase) * math.exp(-t / decay)
        tick = lp(rng.uniform(-1, 1)) * math.exp(-t * 600) * click + math.sin(TAU * 1400 * t) * math.exp(-t * 300) * click * .6
        out.append(math.tanh(1.3 * (body + tick)))
    return out


def s808(tone=.55, snappy=.7, seed='s808'):
    rng, out, flt = random.Random(seed), [], Svf(R)
    for t in frames(.42):
        tones = math.sin(TAU * 238 * t) * math.exp(-t * 26) + .6 * math.sin(TAU * 476 * t) * math.exp(-t * 34)
        _, _, hp = flt(rng.uniform(-1, 1), 1800, .1)
        out.append(tone * tones + snappy * hp * math.exp(-t * 15))
    return out


def clap(seconds=.45, centre=1100, tail=12, seed='clap', room=.0):
    rng, out, flt = random.Random(seed), [], Svf(R)
    rv = Room(R, .6, .55, .5) if room else None
    for t in frames(seconds):
        bursts = sum(math.exp(-(t - d) * 230) for d in (0, .010, .021, .031) if t >= d)
        decay = math.exp(-max(0, t - .031) * tail) * (t >= .031)
        _, band, _ = flt(rng.uniform(-1, 1), centre, .55)
        value = band * (1.1 * bursts + .7 * decay)
        if rv:
            value += room * rv(value)
        out.append(value)
    return out


def rim808():
    out = []
    flt = Svf(R)
    for t in frames(.06):
        value = (math.sin(TAU * 1667 * t) + .5 * math.sin(TAU * 455 * t)) * math.exp(-t * 110)
        _, band, _ = flt(value, 1700, .3)
        out.append(math.tanh(3 * band))
    return out


def cowbell():
    out, flt = [], Svf(R)
    for t in frames(.45):
        value = (1 if math.sin(TAU * 540 * t) > 0 else -1) + (1 if math.sin(TAU * 800 * t) > 0 else -1)
        _, band, _ = flt(value, 2640 / 3, .55)
        out.append(band * (.6 * math.exp(-t * 45) + .4 * math.exp(-t * 8)))
    return out


def clave():
    return [math.sin(TAU * 2500 * t) * math.exp(-t * 60) for t in frames(.08)]


def hat808(seconds, decay, seed='h808'):
    rng, out = random.Random(seed), []
    f1, f2 = Svf(R), Svf(R)
    for t in frames(seconds):
        _, band, _ = f1(metal(t, TR808_METAL, 1.0), 10000, .4)
        _, _, high = f2(band + .05 * rng.uniform(-1, 1), 7000, .1)
        out.append(high * math.exp(-t / decay))
    return out


def cymbal808():
    rng, out = random.Random('cy808'), []
    f1, f2 = Svf(R), Svf(R)
    for t in frames(1.6):
        source = metal(t, TR808_METAL, 1.0)
        _, low_band, _ = f1(source, 3400, .4)
        _, _, high = f2(source + .1 * rng.uniform(-1, 1), 7800, .1)
        out.append(.5 * low_band * math.exp(-t * 9) + high * math.exp(-t * 2.2))
    return out


def tom(freq, decay, noise=.08, seed='tom'):
    rng, out, phase = random.Random(seed), [], 0.0
    for t in frames(decay * 4):
        phase += freq * (1 + .25 * math.exp(-t * 18)) / R
        out.append(math.sin(TAU * phase) * math.exp(-t / decay) + noise * rng.uniform(-1, 1) * math.exp(-t * 60))
    return out


def conga(freq, decay):
    out, phase = [], 0.0
    for t in frames(decay * 4):
        phase += freq * (1 + .08 * math.exp(-t * 40)) / R
        out.append(math.sin(TAU * phase) * math.exp(-t / decay) + .3 * math.sin(TAU * phase * 2.01) * math.exp(-t / (decay * .4)))
    return out


def maracas():
    rng, out, flt = random.Random('mar'), [], Svf(R)
    for t in frames(.07):
        _, _, high = flt(rng.uniform(-1, 1), 6000, .2)
        out.append(high * env(t, .004, .018))
    return out


# ---------------------------------------------------------------- TR-909 style
def k909(decay=.32, hard=False, seed='k909'):
    rng, out, phase = random.Random(seed), [], 0.0
    lp = OnePole(R, 5000)
    for t in frames(decay * 3 + .05):
        freq = 52 + 190 * math.exp(-t * 32) + 60 * math.exp(-t * 180)
        phase += freq / R
        body = math.sin(TAU * phase) * (1 if t < .02 else math.exp(-(t - .02) / decay))
        click = lp(rng.uniform(-1, 1)) * math.exp(-t * 350) * .55
        value = body + click
        out.append(math.tanh((4.2 if hard else 1.7) * value) * (1.0 if not hard else .9))
    return out


def s909(seed='s909', tight=False):
    rng, out = random.Random(seed), []
    hp, lp = Svf(R), Svf(R)
    for t in frames(.32 if not tight else .2):
        tones = math.sin(TAU * 180 * t * (1 + .1 * math.exp(-t * 60))) * math.exp(-t * 28) + .45 * math.sin(TAU * 330 * t) * math.exp(-t * 40)
        noise = rng.uniform(-1, 1)
        _, _, high = hp(noise, 2200, .05)
        low, _, _ = lp(noise, 7000, .1)
        snappy = (.55 * high + .45 * low) * math.exp(-t * (18 if not tight else 30))
        out.append(.85 * tones + snappy)
    return out


def hat909(seconds, decay, seed='h909'):
    rng, out = random.Random(seed), []
    f1, f2 = Svf(R), Svf(R)
    partials = (263, 400, 421, 474, 587, 845)
    for t in frames(seconds):
        source = .6 * metal(t, partials, 1.92) + .4 * rng.uniform(-1, 1)
        _, band, _ = f1(source, 11000, .25)
        _, _, high = f2(band, 8000, .1)
        out.append(high * math.exp(-t / decay))
    return out


def ride909():
    rng, out = random.Random('ride'), []
    f1, f2 = Svf(R), Svf(R)
    partials = (321, 487, 529, 619, 811, 1031)
    for t in frames(1.8):
        source = metal(t, partials, 1.6) + .15 * rng.uniform(-1, 1)
        _, band, _ = f1(source, 6800, .45)
        _, _, high = f2(band, 4200, .1)
        ping = math.sin(TAU * 3720 * t) * math.exp(-t * 6) * .25
        out.append((high + ping) * (.35 * math.exp(-t * 40) + .65 * math.exp(-t * 1.6)))
    return out


def crash909():
    rng, out = random.Random('crash'), []
    f1 = Svf(R)
    for t in frames(2.2):
        source = .55 * metal(t, (311, 457, 563, 677, 853, 1123), 1.4) + .45 * rng.uniform(-1, 1)
        _, _, high = f1(source, 4500, .15)
        out.append(high * env(t, .002, .55))
    return out


# ------------------------------------------------------------ Linn-style kit
def linn_kick():
    rng, out, phase = random.Random('lk'), [], 0.0
    lp = OnePole(R, 2500)
    for t in frames(.35):
        phase += (62 + 70 * math.exp(-t * 45)) / R
        beater = lp(rng.uniform(-1, 1)) * math.exp(-t * 220)
        out.append(math.tanh(1.5 * (math.sin(TAU * phase) * math.exp(-t * 11) + .5 * beater)))
    return out


def gated_snare():
    """Linn snare through a big room cut off by a gate: the 1980s balearic/synth-pop snare."""
    rng, out = random.Random('gs'), []
    flt, room = Svf(R), Room(R, 1.6, .86, .3)
    gate_at = .26
    for t in frames(.36):
        tone = math.sin(TAU * 196 * t) * math.exp(-t * 22) + .5 * math.sin(TAU * 293 * t) * math.exp(-t * 30)
        _, band, _ = flt(rng.uniform(-1, 1), 3000, .2)
        dry = .7 * tone + band * math.exp(-t * 20)
        wet = room(dry)
        gate = 1 if t < gate_at else max(0, 1 - (t - gate_at) / .03)
        out.append(dry + 1.6 * wet * gate)
    return out


def cabasa():
    rng, out, flt = random.Random('cab'), [], Svf(R)
    for t in frames(.12):
        _, _, high = flt(rng.uniform(-1, 1), 7500, .3)
        out.append(high * env(t, .012, .035))
    return out


def tambourine():
    rng, out = random.Random('tamb'), []
    f1 = Svf(R)
    for t in frames(.35):
        jingles = metal(t, (2310, 3170, 4120, 5480), 1.0) * .6 + .4 * rng.uniform(-1, 1)
        _, band, _ = f1(jingles, 7200, .5)
        out.append(band * env(t, .003, .09))
    return out


# --------------------------------------------------------- breakbeat kit
def break_kick(dusty=False):
    rng, out, phase = random.Random('bk'), [], 0.0
    lp, room = OnePole(R, 1800), Room(R, .5, .4, .6)
    for t in frames(.4):
        phase += (58 + 45 * math.exp(-t * 30)) / R
        value = math.sin(TAU * phase) * math.exp(-t * 9) + .45 * lp(rng.uniform(-1, 1)) * math.exp(-t * 150)
        value += .18 * room(value)
        out.append(value)
    return dust(out, 'bk') if dusty else out


def break_snare(ghost=False, dusty=False):
    rng, out = random.Random('bs' + str(ghost)), []
    flt, room = Svf(R), Room(R, .8, .6, .45)
    for t in frames(.45):
        tone = math.sin(TAU * 205 * t) * math.exp(-t * 24) + .4 * math.sin(TAU * 410 * t) * math.exp(-t * 40)
        rattle = rng.uniform(-1, 1)
        _, band, high = flt(rattle, 4200, .15)
        value = (.6 * tone + (band + .5 * high) * math.exp(-t * (16 if not ghost else 40))) * (1 if not ghost else .5)
        value += .35 * room(value)
        out.append(value)
    return dust(out, 'bs') if dusty else out


def break_hat(open_=False, dusty=False):
    rng, out = random.Random('bh' + str(open_)), []
    flt = Svf(R)
    for t in frames(.5 if open_ else .09):
        source = .5 * metal(t, (340, 499, 571, 677, 911, 1247), 2.1) + .5 * rng.uniform(-1, 1)
        _, _, high = flt(source, 6200, .15)
        out.append(high * env(t, .002, .16 if open_ else .022))
    return dust(out, 'bh') if dusty else out


def break_ride():
    rng, out, flt = random.Random('br'), [], Svf(R)
    for t in frames(1.4):
        source = metal(t, (387, 523, 611, 733, 941, 1201), 1.5) + .12 * rng.uniform(-1, 1)
        _, band, _ = flt(source, 5600, .4)
        out.append(band * (.3 * math.exp(-t * 30) + .7 * math.exp(-t * 2)))
    return out


def dust(samples, seed):
    """12-bit sampler, a 6 kHz low-pass and a little vinyl surface noise."""
    rng, out = random.Random('dust' + seed), []
    lp, lp2 = OnePole(R, 5200), OnePole(R, 5200)
    for value in samples:
        crackle = (rng.random() < .0006) * rng.uniform(-.35, .35) + .004 * rng.uniform(-1, 1)
        out.append(crush(lp2(lp(math.tanh(1.4 * value))), 12) + crackle)
    return out


# ----------------------------------------------- Kling Klang-style synth drums
def synth_kick():
    out, phase = [], 0.0
    for t in frames(.3):
        phase += (55 + 95 * math.exp(-t * 25)) / R
        out.append(math.sin(TAU * phase) * math.exp(-t * 13))
    return out


def synth_snare():
    """White noise through a resonant band with a short sine 'pang' (analogue sequencer drums)."""
    rng, out, flt = random.Random('ss'), [], Svf(R)
    for t in frames(.24):
        _, band, high = flt(rng.uniform(-1, 1), 2400, .55)
        out.append((band + .4 * high) * math.exp(-t * 17) + .5 * math.sin(TAU * 260 * t) * math.exp(-t * 35))
    return out


def synth_blip(freq=1200):
    return [math.sin(TAU * freq * t) * math.exp(-t * 45) + .25 * math.sin(TAU * freq * 3 * t) * math.exp(-t * 90) for t in frames(.12)]


def synth_tick():
    rng, out, flt = random.Random('tick'), [], Svf(R)
    for t in frames(.05):
        _, _, high = flt(rng.uniform(-1, 1), 8500, .4)
        out.append(high * math.exp(-t * 120))
    return out


SPECS = [
    ('808-kick', lambda: k808()), ('808-kick-long', lambda: k808(1.1, 46, .15, 'k808l')),
    ('808-snare', lambda: s808()), ('808-clap', lambda: clap(seed='c808', room=.3)),
    ('808-rim', rim808), ('808-cowbell', cowbell), ('808-clave', clave),
    ('808-hat', lambda: hat808(.09, .018)), ('808-open-hat', lambda: hat808(.55, .14, 'o808')),
    ('808-cymbal', cymbal808),
    ('808-tom-low', lambda: tom(98, .2, seed='t1')), ('808-tom-high', lambda: tom(165, .16, seed='t2')),
    ('808-conga-low', lambda: conga(220, .12)), ('808-conga-high', lambda: conga(330, .09)),
    ('808-maracas', maracas),
    ('909-kick', lambda: k909()), ('909-kick-hard', lambda: k909(.38, True, 'k909h')),
    ('909-snare', lambda: s909()), ('909-snare-tight', lambda: s909('s909t', True)),
    ('909-clap', lambda: clap(.4, 1250, 14, 'c909')), ('909-rim', rim808),
    ('909-hat', lambda: hat909(.08, .02)), ('909-open-hat', lambda: hat909(.6, .16, 'o909')),
    ('909-ride', ride909), ('909-crash', crash909), ('909-tom', lambda: tom(120, .22, .2, 't909')),
    ('linn-kick', linn_kick), ('linn-snare', gated_snare), ('linn-clap', lambda: clap(.5, 1400, 9, 'lc', .5)),
    ('linn-cabasa', cabasa), ('linn-tambourine', tambourine), ('linn-conga', lambda: conga(260, .14)),
    ('break-kick', break_kick), ('break-snare', break_snare), ('break-ghost', lambda: break_snare(True)),
    ('break-hat', break_hat), ('break-open-hat', lambda: break_hat(True)), ('break-ride', break_ride),
    ('dusty-kick', lambda: break_kick(True)), ('dusty-snare', lambda: break_snare(dusty=True)),
    ('dusty-hat', lambda: break_hat(dusty=True)),
    ('synth-kick', synth_kick), ('synth-snare', synth_snare), ('synth-blip', synth_blip),
    ('synth-blip-low', lambda: synth_blip(660)), ('synth-tick', synth_tick),
]

if __name__ == '__main__':
    import sys
    only = set(sys.argv[1:])
    total = 0
    for asset, make in SPECS:
        if only and asset not in only:
            continue
        total += write(BANK, asset, make(), R)
    print(BANK, len(SPECS), 'assets', round(total / R, 1), 'seconds')
