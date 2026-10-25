"""Small pure-Python synthesis toolkit shared by the sample generators.

No dependencies: filters, oscillators, envelopes, a tiny room reverb and a
WAV writer. Every generator seeds its own random.Random so the output is
deterministic. Encode the WAVs afterwards with scripts/encode-samples.mjs.
"""
import math
import pathlib
import struct
import wave

TAU = 2 * math.pi
SAMPLES = pathlib.Path(__file__).resolve().parents[1] / 'public' / 'samples'


class Svf:
    """Topology-preserving state-variable filter; returns (low, band, high)."""
    def __init__(self, rate):
        self.rate, self.ic1, self.ic2 = rate, 0.0, 0.0

    def __call__(self, value, cutoff, resonance=0.0):
        g = math.tan(math.pi * max(10.0, min(cutoff, self.rate * .45)) / self.rate)
        k = 2 * (1 - min(.97, resonance))
        a1 = 1 / (1 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = value - self.ic2
        v1 = a1 * self.ic1 + a2 * v3
        v2 = self.ic2 + a2 * self.ic1 + a3 * v3
        self.ic1, self.ic2 = 2 * v1 - self.ic1, 2 * v2 - self.ic2
        return v2, v1, value - k * v1 - v2


class OnePole:
    def __init__(self, rate, cutoff):
        self.a = math.exp(-TAU * cutoff / rate)
        self.y = 0.0

    def __call__(self, value):
        self.y = value + self.a * (self.y - value)
        return self.y


def saw(phase):
    return 2 * (phase % 1) - 1


def square(phase, width=.5):
    return 1.0 if phase % 1 < width else -1.0


def tri(phase):
    p = phase % 1
    return 4 * p - 1 if p < .5 else 3 - 4 * p


def env(t, attack, decay):
    """Linear attack, exponential decay (decay = time constant in seconds)."""
    if t < attack:
        return t / attack
    return math.exp(-(t - attack) / decay)


def metal(t, freqs, scale=1.0):
    """Sum of square partials (TR-808/909 style cymbal source)."""
    return sum(1 if math.sin(TAU * f * scale * t) > 0 else -1 for f in freqs) / len(freqs)


TR808_METAL = (205.3, 304.4, 369.6, 522.7, 540.0, 800.0)


class Room:
    """A few feedback combs and allpasses: enough for claps, gated snares and spring-ish tails."""
    def __init__(self, rate, size=1.0, feedback=.72, damp=.35):
        self.combs = [[0.0] * max(1, round(rate * d * size / 1000)) for d in (29.7, 37.1, 41.1, 43.7)]
        self.index = [0] * 4
        self.store = [0.0] * 4
        self.feedback, self.damp = feedback, damp
        self.allpasses = [[0.0] * max(1, round(rate * d * size / 1000)) for d in (5.0, 1.7)]
        self.ap_index = [0, 0]

    def __call__(self, value):
        out = 0.0
        for n, line in enumerate(self.combs):
            i = self.index[n]
            y = line[i]
            self.store[n] = y * (1 - self.damp) + self.store[n] * self.damp
            line[i] = value + self.store[n] * self.feedback
            self.index[n] = (i + 1) % len(line)
            out += y
        out *= .25
        for n, line in enumerate(self.allpasses):
            i = self.ap_index[n]
            buffered = line[i]
            line[i] = out + buffered * .5
            out = buffered - out * .5
            self.ap_index[n] = (i + 1) % len(line)
        return out


def crush(value, bits=8):
    steps = 2 ** (bits - 1)
    return round(value * steps) / steps


def write(bank, asset, samples, rate, variant=0, level=.72, dc=True, fade=.012):
    """Normalize to `level`, fade the edges and write public/samples/<bank>/<asset>-<variant>.wav."""
    out = list(samples)
    count = len(out)
    tail = max(1, round(rate * fade))
    for i in range(min(12, count)):
        out[i] *= i / 12
    for i in range(min(tail, count)):
        out[count - 1 - i] *= i / tail
    if dc:
        last_in = last_out = 0.0
        for index, value in enumerate(out):
            last_out = value - last_in + .997 * last_out
            last_in, out[index] = value, last_out
    peak = max(abs(value) for value in out) or 1
    folder = SAMPLES / bank
    folder.mkdir(parents=True, exist_ok=True)
    with wave.open(str(folder / f'{asset}-{variant}.wav'), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(b''.join(struct.pack('<h', max(-32767, min(32767, round(v / peak * level * 32767)))) for v in out))
    return count


def note(name):
    """'c4' / 'a#2' -> Hz (A4 = 440)."""
    names = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
    pitch, octave = name[:-1], int(name[-1])
    return 440 * 2 ** ((names.index(pitch) + 12 * (octave + 1) - 69) / 12)
