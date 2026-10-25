"""Original CC0 sounds for the Brazilian campaign kits (chicken-brasil-v1).

Models, not recordings: plucked courses are Karplus-Strong strings with body
resonances (cavaquinho, bandolim, viola caipira), drums are modal membranes
with a stick or mallet transient (tamborim, zabumba, alfaia, surdo de
Mangueira), bells are inharmonic partials (gonguê, triângulo), shakers and
scrapers are shaped noise (ganzá, reco-reco), the cuíca is a rubbed pulse
through a vocal-like resonance with its pitch glide, and the sanfona and the
quadra choir are reed and formant syntheses. Pitched assets are rendered at the
root note named in lib/music/sample-banks.ts.
Run: python3 scripts/generate-brazilian-samples.py && node scripts/encode-samples.mjs public/samples/chicken-brasil-v1
"""
import math
import random

from synthkit import TAU, OnePole, Room, Svf, env, note, saw, write

BANK = 'chicken-brasil-v1'
R = 32000


def frames(seconds, rate=R):
    return [i / rate for i in range(round(seconds * rate))]


def mix(*layers):
    size = max(len(layer) for layer in layers)
    return [sum(layer[i] for layer in layers if i < len(layer)) for i in range(size)]


def scale(values, amount):
    return [value * amount for value in values]


# ---------------------------------------------------------------- plucked courses

def string(freq, seconds, seed, damping=.996, bright=.5, pluck=.18, rate=R):
    """Karplus-Strong string: noise burst shaped by the pick position, a one-pole loop filter."""
    rng = random.Random(seed)
    period = rate / freq
    size = max(2, int(period))
    frac = period - size
    burst = [rng.uniform(-1, 1) for _ in range(size)]
    # Pick position: comb out the harmonics with a node at the plucking point.
    offset = max(1, round(size * pluck))
    line = [burst[i] - .9 * burst[(i - offset) % size] for i in range(size)]
    out, index, last = [], 0, 0.0
    for _ in range(round(seconds * rate)):
        a = line[index]
        b = line[(index + 1) % size]
        value = a + (b - a) * frac
        filtered = damping * (bright * value + (1 - bright) * last)
        last = value
        line[index] = filtered
        index = (index + 1) % size
        out.append(value)
    return out


def body(samples, resonances, rate=R, dry=.6):
    """A few band-pass body modes added under the string (wooden top and air cavity)."""
    filters = [(Svf(rate), f, q, g) for f, q, g in resonances]
    out = []
    for value in samples:
        wet = 0.0
        for flt, f, q, g in filters:
            _, band, _ = flt(value, f, q)
            wet += g * band
        out.append(dry * value + wet)
    return out


def course(freq, seconds, seed, detune_cents=0.0, octave=False, **kw):
    """Paired strings in unison (with a slight detune) or in octaves, as on the viola caipira."""
    layers = [string(freq, seconds, seed + 'a', **kw)]
    if detune_cents:
        layers.append(string(freq * 2 ** (detune_cents / 1200), seconds, seed + 'b', **kw))
    if octave:
        layers.append(scale(string(freq * 2, seconds, seed + 'o', **kw), .55))
    return mix(*layers)


def cavaquinho():
    """Four steel strings, small bright body, short sustain: the samba and choro centre."""
    s = course(note('c5'), .9, 'cavaco', damping=.991, bright=.62, pluck=.14)
    return body(s, [(560, .6, .5), (1250, .55, .35), (3100, .45, .2)])


def bandolim():
    """Brazilian mandolin: paired steel courses a few cents apart, nasal and singing."""
    s = course(note('c5'), 1.1, 'bandolim', detune_cents=5, damping=.993, bright=.58, pluck=.12)
    return body(s, [(480, .6, .45), (1600, .6, .4), (3400, .5, .2)])


def viola_caipira():
    """Ten-string viola: octave-paired courses give the bright, ringing 'ponteio'."""
    s = course(note('c4'), 1.6, 'viola', detune_cents=3, octave=True, damping=.995, bright=.6, pluck=.16)
    return body(s, [(220, .55, .45), (900, .5, .3), (2400, .5, .25)])


# ---------------------------------------------------------------- drums

def membrane(seconds, base, ratios, decays, gains, drop=0.0, drop_time=.02, click=None, seed='m', noise=0.0, noise_cut=3000,
             noise_decay=.03, rate=R):
    """Modal drum head: sine modes with a short pitch drop; optional stick click and skin noise."""
    rng = random.Random(seed)
    phases = [0.0] * len(ratios)
    flt = Svf(rate)
    out = []
    for t in frames(seconds, rate):
        bend = 1 + drop * math.exp(-t / drop_time)
        value = 0.0
        for i, (ratio, decay, gain) in enumerate(zip(ratios, decays, gains)):
            phases[i] += base * ratio * bend / rate
            value += gain * math.sin(TAU * phases[i]) * math.exp(-t / decay)
        if noise:
            _, band, _ = flt(rng.uniform(-1, 1), noise_cut, .5)
            value += noise * band * math.exp(-t / noise_decay)
        if click and t < click[1]:
            value += click[0] * rng.uniform(-1, 1) * (1 - t / click[1])
        out.append(value * min(1, t / .0008))
    return out


DRUM_RATIOS = (1, 1.59, 2.14, 2.30, 2.65, 2.92)


def tamborim():
    """Small tight frame drum hit with a stick: a high crack and almost no ring."""
    return membrane(.16, 720, DRUM_RATIOS, (.03, .018, .012, .01, .008, .006), (1, .6, .45, .3, .25, .15),
                    drop=.12, drop_time=.004, click=(.9, .003), seed='tamb', noise=.5, noise_cut=4500, noise_decay=.012)


def tamborim_abafado():
    """The same tamborim muted by the finger underneath: drier, rounder, used in the carreteiro."""
    return membrane(.09, 640, DRUM_RATIOS, (.014, .01, .007, .006, .005, .004), (1, .5, .3, .2, .15, .1),
                    drop=.08, drop_time=.003, click=(.5, .002), seed='tambm', noise=.25, noise_cut=3000, noise_decay=.008)


def surdo_mangueira():
    """Big surdo de primeira struck with a padded mallet: deep, open and long, the Mangueira 'surdo um'."""
    return membrane(1.2, 58, (1, 1.52, 2.0, 2.45), (.55, .25, .12, .08), (1, .35, .18, .1),
                    drop=.25, drop_time=.03, click=(.18, .006), seed='surdo', noise=.15, noise_cut=900, noise_decay=.03, rate=24000)


def surdo_abafado():
    """Surdo stroke muted by the free hand: the short 'tum' between the open beats."""
    return membrane(.32, 62, (1, 1.52, 2.0), (.09, .05, .03), (1, .3, .12),
                    drop=.2, drop_time=.02, click=(.2, .005), seed='surdom', noise=.2, noise_cut=800, noise_decay=.02, rate=24000)


def zabumba_bumbo():
    """Zabumba's batter head hit with the maceta: round low boom with felt."""
    return membrane(.6, 82, (1, 1.5, 1.98, 2.44), (.22, .12, .06, .04), (1, .4, .2, .1),
                    drop=.3, drop_time=.02, click=(.12, .004), seed='zab', noise=.12, noise_cut=1200, noise_decay=.02, rate=24000)


def zabumba_bacalhau():
    """The bacalhau: a thin rod whipped on the bottom head, a high slapping click with skin buzz."""
    return membrane(.12, 420, DRUM_RATIOS, (.025, .015, .01, .008, .006, .005), (.6, .4, .35, .25, .2, .15),
                    drop=.05, drop_time=.003, click=(1, .004), seed='bac', noise=.8, noise_cut=3800, noise_decay=.02)


def alfaia():
    """Rope-tuned maracatu alfaia hit with a thick stick: deep, woody, with a strong attack."""
    return membrane(.9, 70, (1, 1.55, 2.1, 2.6), (.32, .16, .08, .05), (1, .45, .25, .12),
                    drop=.35, drop_time=.015, click=(.45, .006), seed='alf', noise=.25, noise_cut=1500, noise_decay=.025, rate=24000)


def pandeiro(kind):
    """Pandeiro strokes: open thumb bass (grave), the slap (tapa) and the jingles alone (platinela)."""
    rng = random.Random('pand' + kind)
    jingles = [(f, rng.uniform(.03, .07)) for f in (5200, 6100, 6900, 7700, 8600, 9400)]
    flt = Svf(R)
    out = []
    seconds = {'grave': .45, 'tapa': .22, 'platinela': .2}[kind]
    head = {'grave': membrane(seconds, 180, (1, 1.6, 2.2), (.12, .05, .03), (1, .3, .15), drop=.15, drop_time=.01, seed='pg'),
            'tapa': membrane(seconds, 330, DRUM_RATIOS, (.03, .02, .012, .01, .008, .006), (.7, .5, .4, .3, .2, .1),
                             click=(.9, .004), seed='pt', noise=.7, noise_cut=2500, noise_decay=.015),
            'platinela': [0.0] * round(seconds * R)}[kind]
    jingle_gain = {'grave': .25, 'tapa': .5, 'platinela': 1}[kind]
    for i, t in enumerate(frames(seconds)):
        _, band, _ = flt(rng.uniform(-1, 1), 7500, .3)
        metal = sum(math.sin(TAU * f * t) * math.exp(-t / d) for f, d in jingles) / len(jingles)
        shimmer = (band * .7 + metal * .5) * math.exp(-t / .06) * (1 + .4 * math.sin(TAU * 38 * t))
        out.append(head[i] + jingle_gain * shimmer)
    return out


def palmas():
    """A roda's hand clap: several hands a few milliseconds apart through a small room."""
    rng = random.Random('palmas')
    room, flt = Room(R, size=.6, feedback=.5, damp=.4), Svf(R)
    hits = [rng.uniform(0, .018) for _ in range(6)]
    out = []
    for t in frames(.3):
        value = 0.0
        for start in hits:
            if t >= start:
                value += math.exp(-(t - start) / .008)
        _, band, _ = flt(rng.uniform(-1, 1) * value, 1300, .4)
        out.append(band + .25 * room(band))
    return out


# ---------------------------------------------------------------- metals, shakers, scrapers

def bell(seconds, partials, seed, strike=.6, rate=R):
    """Inharmonic struck metal: (frequency, decay, gain) partials plus a short strike noise."""
    rng = random.Random(seed)
    flt = Svf(rate)
    out = []
    for t in frames(seconds, rate):
        value = sum(g * math.sin(TAU * f * t) * math.exp(-t / d) for f, d, g in partials)
        _, band, _ = flt(rng.uniform(-1, 1), 3000, .4)
        value += strike * band * math.exp(-t / .004)
        out.append(value)
    return out


def gongue():
    """Maracatu gonguê: one large iron bell beaten with a stick, low and dissonant."""
    return bell(.9, [(530, .35, 1), (1190, .22, .7), (1730, .15, .45), (2610, .09, .3), (3420, .06, .2)], 'gongue')


def triangulo(open_):
    """Forró triangle: high inharmonic steel; the closed stroke is choked by the hand."""
    damp = 1 if open_ else .12
    partials = [(1250, 1.4 * damp, .5), (3150, 1.1 * damp, .8), (4650, .9 * damp, .7), (6250, .7 * damp, .5), (8100, .5 * damp, .35)]
    return bell(1.2 if open_ else .18, partials, 'tri' + str(open_), strike=.35)


def ganza():
    """Metal tube shaker: one forward-and-back flick of grains, bright and grainy."""
    rng = random.Random('ganza')
    hp, bp = Svf(R), Svf(R)
    out = []
    for t in frames(.16):
        grains = rng.uniform(-1, 1) * (1 if rng.random() < .35 else .15)
        _, _, high = hp(grains, 4500, .2)
        _, band, _ = bp(high, 7500, .5)
        shape = (t / .02 if t < .02 else math.exp(-(t - .02) / .03))
        out.append((high * .6 + band) * shape)
    return out


def reco_reco():
    """Reco-reco: a stick dragged over a ridged spring, a fast train of rattling clicks."""
    rng = random.Random('reco')
    flt = Svf(R)
    out = []
    seconds, rate_hz = .2, 95
    for t in frames(seconds):
        cycle = (t * rate_hz) % 1
        tick = math.exp(-cycle / .07) * rng.uniform(.6, 1)
        _, band, _ = flt(rng.uniform(-1, 1) * tick, 3400, .55)
        out.append(band * min(1, t / .01) * min(1, (seconds - t) / .05))
    return out


def apito():
    """The mestre de bateria's three-tone apito: a short trilled blast with a breathy edge."""
    rng = random.Random('apito')
    flt = Svf(R)
    out, phase = [], 0.0
    for t in frames(.42):
        trill = .5 + .5 * math.sin(TAU * 28 * t)
        phase += 2900 * (1 + .035 * trill) / R
        _, band, _ = flt(rng.uniform(-1, 1), 2900, .75)
        tone = math.sin(TAU * phase) + .35 * math.sin(TAU * phase * 1.5)
        out.append((tone * (.55 + .45 * trill) + .25 * band) * min(1, t / .008) * min(1, (.42 - t) / .04))
    return out


def cuica(grave):
    """Cuíca: a wet cloth rubbing a stick inside the drum; a pitched, voice-like 'ui' or 'om' glide."""
    rng = random.Random('cuica' + str(grave))
    seconds = .3 if grave else .24
    lo, hi = (230, 180) if grave else (520, 860)
    formants = [(Svf(R), f, q, g) for f, q, g in ((700 if grave else 1200, .85, 1), (1600 if grave else 2600, .8, .35))]
    out, phase = [], 0.0
    for t in frames(seconds):
        x = t / seconds
        glide = lo + (hi - lo) * (1 - (1 - x) ** 2)
        phase += glide * (1 + .01 * rng.uniform(-1, 1)) / R
        source = saw(phase) + .25 * rng.uniform(-1, 1)
        value = 0.0
        for flt, f, q, g in formants:
            _, band, _ = flt(source, f * (glide / hi) ** .3, q)
            value += g * band
        shape = min(1, t / .015) * (1 - x) ** (.6 if grave else .9)
        out.append(value * shape)
    return out


# ---------------------------------------------------------------- reeds and voices

def sanfona():
    """Eight-bass sanfona: three reeds (one tuned up for the musette tremolo, one an octave below)."""
    rng = random.Random('sanfona')
    seconds, f = 1.4, note('c4')
    reeds = [(f, 1.0), (f * 2 ** (12 / 1200), .8), (f / 2, .28)]
    phases = [rng.random() for _ in reeds]
    lp, bp = OnePole(R, 3800), Svf(R)
    out = []
    for t in frames(seconds):
        value = 0.0
        for i, (freq, gain) in enumerate(reeds):
            phases[i] += freq / R
            p = phases[i] % 1
            value += gain * ((1 if p < .32 else -.47) + .4 * saw(phases[i]))
        _, band, _ = bp(value, 1400, .5)
        bellows = min(1, t / .045) * (1 - .06 * math.sin(TAU * 5.5 * t)) * min(1, (seconds - t) / .08)
        out.append((lp(value) * .7 + .5 * band) * bellows)
    return out


def coro_laia():
    """A quadra's chorus singing 'lá': pastoras and men an octave below, the 'l' opening into 'a'."""
    rng = random.Random('laia')
    seconds = 1.0
    singers = [(note('c4') * (1 + rng.uniform(-.012, .012)), .9) for _ in range(4)] + [(note('c3') * (1 + rng.uniform(-.01, .01)), .7) for _ in range(2)]
    voices = []
    for n, (f0, gain) in enumerate(singers):
        filters = [Svf(R) for _ in range(3)]
        phase, out = rng.random(), []
        vib_rate, onset = rng.uniform(4.8, 6.0), rng.uniform(0, .02)
        for t in frames(seconds):
            if t < onset:
                out.append(0.0)
                continue
            local = t - onset
            phase += f0 * (1 + .012 * min(1, local / .25) * math.sin(TAU * vib_rate * local)) / R
            p = phase % 1
            pulse = (math.sin(math.pi * p / .6) ** 2 if p < .6 else 0) - .36 + .05 * rng.uniform(-1, 1)
            x = min(1, local / .07)
            form = ((360 + 440 * x), (1250 - 100 * x), 2800)
            gains = (1, .5, .2)
            value = 0.0
            for flt, fr, g in zip(filters, form, gains):
                _, band, _ = flt(pulse, fr, .9)
                value += g * band
            out.append(gain * value * min(1, local / .04) * min(1, (seconds - t) / .15))
        voices.append(out)
    room = Room(R, size=1.2, feedback=.6, damp=.4)
    return [value + .3 * room(value) for value in mix(*voices)]


SPECS = [
    ('cavaquinho', cavaquinho, R), ('bandolim', bandolim, R), ('viola-caipira', viola_caipira, R),
    ('tamborim', tamborim, R), ('tamborim-abafado', tamborim_abafado, R),
    ('surdo-mangueira', surdo_mangueira, 24000), ('surdo-abafado', surdo_abafado, 24000),
    ('zabumba', zabumba_bumbo, 24000), ('bacalhau', zabumba_bacalhau, R), ('alfaia', alfaia, 24000),
    ('pandeiro-grave', lambda: pandeiro('grave'), R), ('pandeiro-tapa', lambda: pandeiro('tapa'), R),
    ('pandeiro-platinela', lambda: pandeiro('platinela'), R), ('palmas', palmas, R),
    ('gongue', gongue, R), ('triangulo-aberto', lambda: triangulo(True), R), ('triangulo-fechado', lambda: triangulo(False), R),
    ('ganza', ganza, R), ('reco-reco', reco_reco, R), ('apito', apito, R),
    ('cuica-aguda', lambda: cuica(False), R), ('cuica-grave', lambda: cuica(True), R),
    ('sanfona', sanfona, R), ('coro-laia', coro_laia, R),
]

if __name__ == '__main__':
    import sys
    only = set(sys.argv[1:])
    total = 0.0
    for asset, make, rate in SPECS:
        if only and asset not in only:
            continue
        total += write(BANK, asset, make(), rate) / rate
    print(BANK, len(SPECS), 'assets', round(total, 1), 'seconds')
