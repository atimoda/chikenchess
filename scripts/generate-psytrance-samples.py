"""Deterministic original CC0 psytrance palette for Goa 1994.

One mono bank, no external recordings or Python dependencies. Low or noisy
long sounds use 16 kHz to keep the lazy-loaded catalog small; percussive and
melodic attacks use 24 kHz.
Run: python3 scripts/generate-psytrance-samples.py
"""
import math
import pathlib
import random
import struct
import wave

DEST = pathlib.Path(__file__).resolve().parents[1] / 'public' / 'samples' / 'chicken-psytrance-v1'
C2, C3, C4, C5 = 65.406391, 130.812783, 261.625565, 523.251131
TAU = 2 * math.pi


class Svf:
    """Topology-preserving state-variable filter (stable at any cutoff); resonance near 1 squelches like a 303."""
    def __init__(self, rate):
        self.rate, self.ic1, self.ic2 = rate, 0.0, 0.0

    def __call__(self, value, cutoff, resonance):
        g = math.tan(math.pi * min(cutoff, self.rate * .45) / self.rate)
        k = 2 * (1 - min(.97, resonance))
        a1 = 1 / (1 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = value - self.ic2
        v1 = a1 * self.ic1 + a2 * v3
        v2 = self.ic2 + a2 * self.ic1 + a3 * v3
        self.ic1, self.ic2 = 2 * v1 - self.ic1, 2 * v2 - self.ic2
        return v2, v1, value - k * v1 - v2


def saw(phase):
    return 2 * (phase % 1) - 1


def metal(t, rng_noise, base=1.0):
    # Six detuned square partials (TR-808 style ratios) under a noise sheen.
    partials = (205.3, 304.4, 369.6, 522.7, 540.0, 800.0)
    value = sum(1 if math.sin(TAU * f * 7.3 * base * t) > 0 else -1 for f in partials) / 6
    return .62 * value + .38 * rng_noise


def render(asset, seconds, rate, rng):
    count = round(seconds * rate)
    out = []
    filt, filt2 = Svf(rate), Svf(rate)
    phases = [0.0] * 8
    previous = 0.0
    # Karplus-Strong strings for the sitar: main string plus a sympathetic fifth below.
    strings = {}
    if asset == 'sitar':
        for key, freq in (('main', C4), ('sym', C4 * 2 / 3), ('drone', C3)):
            strings[key] = [rng.uniform(-1, 1) for _ in range(round(rate / freq))]
        indexes = {key: 0 for key in strings}
    for i in range(count):
        t = i / rate
        noise = rng.uniform(-1, 1)
        bright = noise - previous
        previous = noise
        if asset in ('kick-punch', 'kick-tight'):
            # Fast pitch drop leaves room between kick and the rolling bass.
            fall, body = (34, 8.5) if asset == 'kick-punch' else (46, 13)
            freq = 47 + 205 * math.exp(-t * fall)
            phases[0] += freq / rate
            hold = 1 if t < .045 else math.exp(-(t - .045) * body)
            value = math.sin(TAU * phases[0]) * hold
            value += .55 * bright * math.exp(-t * 900)
            value = math.tanh(value * 1.9)
        elif asset in ('bass-roll', 'bass-knock'):
            phases[0] += C2 / rate
            phases[1] += C2 * 1.004 / rate
            source = .6 * saw(phases[0]) + .4 * saw(phases[1])
            top = 2600 if asset == 'bass-roll' else 4200
            low, _, _ = filt(source, 110 + top * math.exp(-t * 30), .42)
            amp = min(1, t / .002) * math.exp(-t * (15 if asset == 'bass-roll' else 22))
            value = math.tanh(1.6 * (low + .5 * math.sin(TAU * phases[0]))) * amp
        elif asset in ('acid-squelch', 'acid-rubber'):
            phases[0] += C3 / rate
            source = saw(phases[0]) if asset == 'acid-squelch' else (1 if phases[0] % 1 < .5 else -1)
            cutoff = 260 + 4300 * math.exp(-t * 8.5)
            low, _, _ = filt(source, cutoff, .93 if asset == 'acid-squelch' else .82)
            amp = min(1, t / .003) * (1 if t < .3 else math.exp(-(t - .3) * 18))
            value = math.tanh(2.3 * low) * amp
        elif asset == 'lead-hallucinogen':
            vibrato = 1 + .0065 * min(1, max(0, t - .22) / .35) * math.sin(TAU * 5.6 * t)
            value = 0.0
            for voice, detune in enumerate((1, 1.0071, .9932, 2.0018)):
                phases[voice] += C4 * detune * vibrato / rate
                value += saw(phases[voice]) * (.45 if voice == 3 else 1)
            low, _, _ = filt(value / 3.4, 3800 + 1400 * math.sin(TAU * .9 * t), .28)
            low2, _, _ = filt2(low, 5200, .1)
            value = math.tanh(1.4 * low2) * min(1, t / .012)
        elif asset == 'fm-pluck':
            index = .4 + 5.2 * math.exp(-t * 20)
            phases[0] += 2 * C4 / rate
            phases[1] += C4 / rate
            value = math.sin(TAU * phases[1] + index * math.sin(TAU * phases[0])) * math.exp(-t * 7.5)
        elif asset == 'sitar':
            value = 0.0
            for key, gain in (('main', 1.0), ('sym', .34), ('drone', .2)):
                line = strings[key]
                j = indexes[key] % len(line)
                k = (j + 1) % len(line)
                sample = line[j]
                # The curved jawari bridge: a soft rectifying buzz that keeps upper partials alive.
                line[j] = (line[j] + line[k]) * .5 * (.9985 if key == 'main' else .997) + .012 * math.tanh(6 * line[j]) * abs(line[j])
                indexes[key] += 1
                value += gain * sample * (1 if key == 'main' else min(1, t / .04))
            buzz = math.tanh(3.2 * value) - .6 * value
            value = (.7 * value + .55 * buzz) * math.exp(-t * 1.6) + .18 * bright * math.exp(-t * 160)
        elif asset == 'om-drone':
            # Low "Om": pulse source through drifting O formants that close toward M.
            value = 0.0
            for voice, (ratio, gain) in enumerate(((1, 1), (1.5, .42), (2, .3), (1.0042, .7))):
                phases[voice] += C3 * ratio / rate
                value += gain * (saw(phases[voice]) * .6 + math.sin(TAU * phases[voice]) * .4)
            closing = min(1, t / (seconds * .8))
            f1 = 470 - 170 * closing + 22 * math.sin(TAU * .23 * t)
            _, band1, _ = filt(value, f1, .9)
            _, band2, _ = filt2(value, 820 - 330 * closing, .86)
            value = (band1 + (.55 - .35 * closing) * band2) * .5 + .02 * noise
            value *= min(1, t / .45)
        elif asset == 'laser-zap':
            freq = 70 + 3400 * math.exp(-t * 11)
            phases[0] += freq / rate
            phases[1] += freq * 1.5 / rate
            value = math.sin(TAU * phases[0] + 2.2 * math.sin(TAU * phases[1])) * math.exp(-t * 6)
        elif asset == 'noise-riser':
            progress = t / seconds
            _, band, _ = filt(noise, 280 * (22 ** progress), .72)
            value = (band * 1.6 + .25 * bright * progress) * progress ** 1.6
        elif asset == 'hat-closed':
            value = metal(t, bright) * math.exp(-t * 95)
            _, _, value = filt(value, 7000, .1)
        elif asset == 'hat-soft':
            value = metal(t, bright, 1.03) * math.exp(-t * 130) * .7
            _, _, value = filt(value, 8000, .1)
        elif asset == 'hat-open':
            value = metal(t, bright) * math.exp(-t * 15)
            _, _, value = filt(value, 6500, .15)
        elif asset == 'clap':
            bursts = sum(math.exp(-(t - delay) * 140) for delay in (0, .011, .023) if t >= delay)
            tail = math.exp(-max(0, t - .023) * 19) * (t >= .023)
            _, band, _ = filt(noise, 1350, .6)
            value = band * (1.2 * bursts + .55 * tail)
        elif asset == 'tick':
            _, band, _ = filt(bright, 3200, .8)
            value = band * math.exp(-t * 140) + .3 * math.sin(TAU * 1900 * t) * math.exp(-t * 90)
        elif asset == 'tabla-na':
            # Dayan: near-harmonic modes from the black syahi, bright ring.
            strike = .25 * bright * math.exp(-t * 220)
            value = strike + sum(g * math.sin(TAU * C5 * h * t) * math.exp(-t * d)
                for h, g, d in ((1, 1, 7), (2, .55, 9), (3, .32, 12), (4, .18, 16), (5.02, .1, 22)))
        elif asset == 'tabla-ge':
            # Bayan: the palm slides on the head, so pitch rises after the stroke.
            freq = 82 + 34 * (1 - math.exp(-t * 7))
            phases[0] += freq / rate
            value = math.sin(TAU * phases[0]) * math.exp(-t * 4.8) + .18 * noise * math.exp(-t * 80)
        elif asset == 'reverse-crash':
            progress = t / seconds
            _, _, high = filt(metal(t, noise, .8), 3000, .2)
            value = high * (math.exp(-(1 - progress) * 4.5)) * min(1, (seconds - t) / .02)
        else:
            raise ValueError(asset)
        edge = min(1, i / 12, (count - i) / max(1, round(rate * .012)))
        out.append(value * edge)
    # DC blocker: saturated saws and the buzzing bridge leave an offset.
    last_in = last_out = 0.0
    for index, value in enumerate(out):
        last_out = value - last_in + .997 * last_out
        last_in, out[index] = value, last_out
    peak = max(abs(value) for value in out) or 1
    DEST.mkdir(parents=True, exist_ok=True)
    with wave.open(str(DEST / f'{asset}-0.wav'), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(b''.join(struct.pack('<h', round(value / peak * .72 * 32767)) for value in out))
    return count * 2 + 44


SPECS = [
    ('kick-punch', .34, 24000), ('kick-tight', .26, 24000),
    ('bass-roll', .24, 24000), ('bass-knock', .2, 24000),
    ('acid-squelch', .46, 24000), ('acid-rubber', .46, 24000),
    ('lead-hallucinogen', 1.45, 24000), ('fm-pluck', .45, 24000),
    ('sitar', 1.5, 24000), ('om-drone', 4.0, 16000),
    ('laser-zap', .6, 24000), ('noise-riser', 2.8, 16000),
    ('hat-closed', .07, 24000), ('hat-soft', .05, 24000), ('hat-open', .22, 24000),
    ('clap', .3, 24000), ('tick', .05, 24000),
    ('tabla-na', .5, 24000), ('tabla-ge', .7, 16000),
    ('reverse-crash', 1.6, 16000),
]

if __name__ == '__main__':
    total = sum(render(asset, seconds, rate, random.Random(f'psytrance:{asset}')) for asset, seconds, rate in SPECS)
    print('chicken-psytrance-v1', len(SPECS), 'assets', total, 'bytes')
