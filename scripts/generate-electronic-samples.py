"""Original CC0 special sounds for the Electronic World kits (chicken-electronic-v1).

Voices are formant synthesis (no recordings); stabs, hoovers and sirens are
analogue-style models. Pitched assets are rendered at the root note named in
lib/music/sample-banks.ts.
Run: python3 scripts/generate-electronic-samples.py && node scripts/encode-samples.mjs public/samples/chicken-electronic-v1
"""
import math
import random

from synthkit import TAU, OnePole, Room, Svf, env, metal, note, saw, square, write

BANK = 'chicken-electronic-v1'
R = 32000
VOWELS = {  # F1, F2, F3 (Hz) and relative gains
    'ah': ((800, 1150, 2900), (1, .5, .25)),
    'oh': ((450, 800, 2830), (1, .35, .12)),
    'eh': ((480, 1720, 2520), (1, .45, .2)),
    'ee': ((300, 2300, 3000), (1, .3, .2)),
    'oo': ((330, 720, 2530), (1, .25, .08)),
}


def frames(seconds, rate=R):
    return [i / rate for i in range(round(seconds * rate))]


def blend(a, b, x):
    return tuple(p + (q - p) * x for p, q in zip(a, b))


def voice(f0, seconds, vowel_at, breath=.04, vibrato=(5.2, .012), seed='v', attack=.03, release=.12, source='glottal'):
    """Glottal-ish pulse through three resonant formants. vowel_at(t) -> (formants, gains)."""
    rng, out = random.Random(seed), []
    filters = [Svf(R) for _ in range(3)]
    phase = 0.0
    for t in frames(seconds):
        depth = vibrato[1] * min(1, t / .3)
        phase += f0 * (1 + depth * math.sin(TAU * vibrato[0] * t)) / R
        p = phase % 1
        pulse = (math.sin(math.pi * p / .6) ** 2 if p < .6 else 0) - .36 if source == 'glottal' else saw(phase)
        excitation = pulse + breath * rng.uniform(-1, 1)
        freqs, gains = vowel_at(t)
        value = 0.0
        for flt, f, g in zip(filters, freqs, gains):
            _, band, _ = flt(excitation, f, .9)
            value += g * band
        amp = min(1, t / attack) * min(1, max(0, seconds - t) / release)
        out.append(value * amp)
    return out


def robot_voice():
    """Vocoder-style robot voice: buzzy saw carrier, steady 'ah' opening to 'oh', no vibrato."""
    def vowel(t):
        x = min(1, max(0, (t - .35) / .4))
        return blend(VOWELS['ah'][0], VOWELS['oh'][0], x), blend(VOWELS['ah'][1], VOWELS['oh'][1], x)
    return voice(note('c4'), 1.2, vowel, breath=.08, vibrato=(0, 0), seed='robot', attack=.02, source='saw')


def vox_pad():
    """Fairlight-style breathy choir: three detuned 'ah' voices with slow attack."""
    layers = [voice(note('c4') * d, 3.0, lambda t: VOWELS['ah'], breath=.12, vibrato=(4.6 + i * .7, .008), seed=f'pad{i}', attack=.5, release=.6)
              for i, d in enumerate((1, 1.006, .995))]
    return [sum(values) for values in zip(*layers)]


def oh_chant():
    """A crowd 'oh!' shout for gqom and kwaito: breathy, slightly sharp onset, falling pitch."""
    rng = random.Random('oh')
    layers = []
    for i in range(4):
        detune = 1 + rng.uniform(-.015, .015)
        layers.append(voice(note('c4') * detune, .55, lambda t: VOWELS['oh'], breath=.18, vibrato=(6, .02), seed=f'oh{i}', attack=.012, release=.2))
    return [sum(values) for values in zip(*layers)]


def hey():
    """'Hey!': aspirated onset, 'eh' gliding to 'ee', short."""
    rng, out = random.Random('hey'), []
    body = voice(note('a3'), .32, lambda t: (blend(VOWELS['eh'][0], VOWELS['ee'][0], min(1, t / .25)), VOWELS['eh'][1]), breath=.2, vibrato=(0, 0), seed='hey', attack=.03, release=.08)
    flt = Svf(R)
    for i, t in enumerate(frames(.32)):
        _, band, _ = flt(rng.uniform(-1, 1), 1700, .5)
        out.append(body[i] + .6 * band * math.exp(-t * 35))
    return out


def hoover():
    """The 'hoover' rave lead: detuned pulse waves with width modulation and a downward-then-up pitch scoop."""
    out, phases = [], [0.0] * 6
    lp = Svf(R)
    f0 = note('c3')
    for t in frames(1.3):
        bend = 2 ** ((-5 * math.exp(-t * 9)) / 12)
        value = 0.0
        for i, d in enumerate((1, 1.012, .988, 2.004, .5, 1.5)):
            phases[i] += f0 * d * bend / R
            width = .5 + .35 * math.sin(TAU * (1.6 + .3 * i) * t + i)
            value += square(phases[i], width) * (.45 if i >= 3 else 1)
        low, _, _ = lp(value / 4, 3200, .2)
        out.append(math.tanh(1.6 * low) * min(1, t / .01))
    return out


def chord_stab(freqs, seconds, decay, cutoff, seed, organ=False):
    out, phases = [], [0.0] * (len(freqs) * 2)
    lp = Svf(R)
    for t in frames(seconds):
        value = 0.0
        for i, f in enumerate(freqs):
            for j, d in enumerate((1, 1.007)):
                k = 2 * i + j
                phases[k] += f * d / R
                value += (math.sin(TAU * phases[k]) + .5 * math.sin(TAU * 2 * phases[k]) + .3 * math.sin(TAU * 4 * phases[k])) if organ else saw(phases[k])
        low, _, _ = lp(value / (len(freqs) * 2), cutoff * (.35 + .65 * math.exp(-t * 14)), .3)
        out.append(math.tanh(1.5 * low) * env(t, .003, decay))
    return out


def rave_stab():
    """Minor-seventh stab (c-eb-g-bb) with a snapping filter."""
    return chord_stab([note(n) for n in ('c3', 'd#4', 'g4', 'a#4', 'c4')], .7, .18, 5200, 'stab')


def organ_stab():
    """House 'M1-style' organ stab (c-eb-g with octave), percussive."""
    return chord_stab([note(n) for n in ('c3', 'c4', 'd#4', 'g4')], .6, .16, 6000, 'organ', organ=True)


def orch_hit():
    """Orchestral hit: brass-like saws plus timpani thump and noise burst, all in one chord."""
    rng, out, phases = random.Random('orch'), [], [0.0] * 8
    lp, room = Svf(R), Room(R, 1.4, .8, .3)
    freqs = [note(n) * d for n in ('c3', 'c4', 'g4', 'c5') for d in (1, 1.008)]
    for t in frames(1.0):
        value = 0.0
        for i, f in enumerate(freqs):
            phases[i] += f / R
            value += saw(phases[i])
        low, _, _ = lp(value / 8, 900 + 4500 * math.exp(-t * 9), .15)
        thump = math.sin(TAU * note('c2') * t) * math.exp(-t * 7)
        dry = (low + .3 * thump + .3 * rng.uniform(-1, 1) * math.exp(-t * 60)) * env(t, .002, .14)
        out.append(dry + .5 * room(dry))
    return out


def siren(seconds=2.0, low=500, high=1250, rate_hz=.6, seed='siren'):
    out, phase = [], 0.0
    for t in frames(seconds):
        freq = low + (high - low) * (.5 + .5 * math.sin(TAU * rate_hz * t - math.pi / 2))
        phase += freq / R
        out.append(math.tanh(2 * math.sin(TAU * phase)) * min(1, t / .05))
    return out


def dub_siren():
    """Dub siren: square oscillator swept by a falling saw LFO, through a spring-like echo."""
    out, phase = [], 0.0
    room = Room(R, 1.2, .82, .2)
    for t in frames(2.4):
        lfo = 1 - ((t * 4.5) % 1)
        freq = 400 + 900 * lfo * math.exp(-t * .6)
        phase += freq / R
        dry = square(phase) * (1 if t < 1.4 else math.exp(-(t - 1.4) * 4)) * .5
        out.append(dry + .7 * room(dry))
    return out


def whistle():
    """Referee/samba whistle with the pea's trill: tone plus fast amplitude and pitch flutter."""
    rng, out, phase = random.Random('whistle'), [], 0.0
    flt = Svf(R)
    for t in frames(.5):
        trill = .5 + .5 * math.sin(TAU * 34 * t)
        phase += note('c7') * (1 + .02 * trill) / R
        _, band, _ = flt(rng.uniform(-1, 1), 3300, .7)
        out.append((math.sin(TAU * phase) * (.6 + .4 * trill) + .15 * band) * env(t, .01, .2))
    return out


def vinyl():
    """Two seconds of record surface: hiss, crackle and a slow rumble, loopable."""
    rng, out = random.Random('vinyl'), []
    hiss, rumble = Svf(R), OnePole(R, 40)
    for t in frames(2.0):
        _, band, _ = hiss(rng.uniform(-1, 1), 3800, .1)
        crackle = rng.uniform(-1, 1) * (rng.random() < .0025) + rng.uniform(-.4, .4) * (rng.random() < .01)
        out.append(.12 * band + .7 * crackle + 1.5 * rumble(rng.uniform(-1, 1)))
    return out


def scratch():
    """Baby scratch: a tone sweeping forward and back, with the fader cutting the return."""
    rng, out, phase = random.Random('scr'), [], 0.0
    flt = Svf(R)
    for t in frames(.42):
        speed = math.sin(TAU * t / .42 * 2)
        phase += 380 * abs(speed) * 2.4 / R
        source = saw(phase) + .4 * rng.uniform(-1, 1)
        _, band, _ = flt(source, 600 + 2600 * abs(speed), .6)
        fader = 1 if (t % .21) < .16 else 0
        out.append(band * fader * min(1, t / .005))
    return out


def metal_hit():
    """Industrial metal sheet hit: inharmonic modes, hard transient."""
    rng, out = random.Random('metal'), []
    modes = ((187, 1, 2.2), (431, .7, 3), (689, .6, 4.5), (1247, .5, 6), (2131, .35, 9), (3311, .25, 12))
    for t in frames(1.4):
        value = sum(g * math.sin(TAU * f * t) * math.exp(-t * d) for f, g, d in modes)
        out.append(value + .5 * rng.uniform(-1, 1) * math.exp(-t * 80))
    return out


def gqom_tom():
    """Gqom's resonant 'bhenga' tom-kick: low tom with a long pitch fall and a little drive."""
    rng, out, phase = random.Random('gt'), [], 0.0
    for t in frames(.7):
        phase += (75 + 110 * math.exp(-t * 14)) / R
        value = math.sin(TAU * phase) * math.exp(-t * 5.5) + .2 * rng.uniform(-1, 1) * math.exp(-t * 120)
        out.append(math.tanh(2.2 * value))
    return out


def riser():
    rng, out, flt = random.Random('riser'), [], Svf(R)
    seconds = 3.6
    for t in frames(seconds):
        progress = t / seconds
        _, band, _ = flt(rng.uniform(-1, 1), 300 * (25 ** progress), .75)
        out.append(band * progress ** 1.5)
    return out


def reverse_cymbal():
    rng, out, flt = random.Random('rc'), [], Svf(R)
    seconds = 1.8
    for t in frames(seconds):
        progress = t / seconds
        _, _, high = flt(metal(t, (311, 457, 563, 677, 853, 1123), 1.4) + .4 * rng.uniform(-1, 1), 4000, .15)
        out.append(high * math.exp(-(1 - progress) * 4.5) * min(1, (seconds - t) / .02))
    return out


def tape_noise_sweep():
    """Downlifter: filtered noise falling for transitions into breakdowns."""
    rng, out, flt = random.Random('down'), [], Svf(R)
    seconds = 2.4
    for t in frames(seconds):
        progress = t / seconds
        _, band, _ = flt(rng.uniform(-1, 1), 6000 * (.04 ** progress), .7)
        out.append(band * (1 - progress) ** 1.2 * min(1, t / .02))
    return out


SPECS = [
    ('robot-voice', robot_voice), ('vox-pad', vox_pad), ('oh-chant', oh_chant), ('hey', hey),
    ('hoover', hoover), ('rave-stab', rave_stab), ('organ-stab', organ_stab), ('orch-hit', orch_hit),
    ('siren', siren), ('dub-siren', dub_siren), ('whistle', whistle), ('vinyl', vinyl), ('scratch', scratch),
    ('metal-hit', metal_hit), ('gqom-tom', gqom_tom), ('riser', riser), ('reverse-cymbal', reverse_cymbal),
    ('downlifter', tape_noise_sweep),
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
