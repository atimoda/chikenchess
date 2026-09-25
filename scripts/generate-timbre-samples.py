"""Deterministic original CC0 instrument sketches for the city kits.

Four small mono banks. No external recordings or Python dependencies.
Run: python3 scripts/generate-timbre-samples.py
"""
import math
import pathlib
import random
import struct
import wave

RATE = 24000
ROOT_C4 = 261.625565
ROOT_C2 = 65.406391
DEST = pathlib.Path(__file__).resolve().parents[1] / 'public' / 'samples'

SPECS = {
    'chicken-strings-v1': [
        ('steel', .72, ROOT_C4), ('nylon', .72, ROOT_C4),
        ('muted-electric', .49, ROOT_C4), ('crunch-electric', .86, ROOT_C4),
        ('slide-electric', .92, ROOT_C4), ('bass-pick', .78, ROOT_C2),
        ('bass-round', .88, ROOT_C2), ('violin', 3.10, ROOT_C4),
        ('cello', 3.10, ROOT_C2 * 2), ('pizzicato', .62, ROOT_C4),
    ],
    'chicken-keys-v1': [
        ('grand', 1.02, ROOT_C4), ('upright', .87, ROOT_C4),
        ('rhodes', 1.08, ROOT_C4), ('organ', 3.50, ROOT_C4),
        ('clav', .57, ROOT_C4), ('celesta', 1.0, ROOT_C4),
        ('accordion', 3.10, ROOT_C4),
    ],
    'chicken-synths-v1': [
        ('acid', .74, ROOT_C2), ('analog-pad', 3.60, ROOT_C4),
        ('fm-bell', 1.23, ROOT_C4), ('wavetable', 1.13, ROOT_C4),
        ('sub', .94, ROOT_C2), ('choir', 3.20, ROOT_C4),
        ('digital-pluck', .67, ROOT_C4),
    ],
    'chicken-drums-v1': [
        ('rock-kick', .42, 0), ('rock-snare', .40, 0),
        ('brush', .39, 0), ('room-clap', .43, 0),
        ('wood-rim', .24, 0), ('tambourine', .35, 0),
        ('ride', .55, 0),
    ],
}


def envelope(t, seconds, attack=.003, fall=3):
    return min(1, t / attack) * math.exp(-fall * t) * min(1, max(0, (seconds - t) / .025))


def render(bank, kind, seconds, root):
    count = round(seconds * RATE)
    rng = random.Random(f'{bank}:{kind}')
    values = []
    phase = mod_phase = previous_noise = low_noise = 0.0
    string = [rng.uniform(-1, 1) for _ in range(max(2, round(RATE / root)))] if root and kind in ('steel', 'nylon', 'pizzicato', 'bass-pick', 'bass-round') else None
    string_index = 0
    for i in range(count):
        t = i / RATE
        noise = rng.uniform(-1, 1)
        high_noise = noise - previous_noise
        previous_noise = noise
        low_noise += .08 * (noise - low_noise)
        if string is not None:
            j = string_index % len(string)
            next_j = (j + 1) % len(string)
            damp = {'steel': .997, 'nylon': .994, 'pizzicato': .988, 'bass-pick': .996, 'bass-round': .998}[kind]
            pluck = string[j]
            string[j] = (string[j] + string[next_j]) * .5 * damp
            string_index += 1
            brightness = .13 if kind in ('steel', 'bass-pick') else .04
            value = pluck * envelope(t, seconds, .002, 1.5 if kind == 'bass-round' else 2.4)
            value += brightness * high_noise * math.exp(-70 * t)
        elif kind in ('muted-electric', 'crunch-electric', 'slide-electric'):
            glide = 1 - (.12 * math.exp(-t * 24) if kind == 'slide-electric' else 0)
            phase += 2 * math.pi * root * glide / RATE
            harmonic = sum(math.sin(phase * h + .08 * h) / h ** 1.08 for h in range(1, 13))
            second = sum(math.sin(phase * h * 1.004) / h ** 1.4 for h in range(1, 9))
            drive = 1.8 if kind == 'muted-electric' else 4.6
            value = math.tanh((harmonic + .27 * second) * drive) * envelope(t, seconds, .0015, 7 if kind == 'muted-electric' else 2.0)
            value += .10 * high_noise * math.exp(-95 * t)
        elif kind in ('violin', 'cello'):
            phase += 2 * math.pi * root * (1 + .0025 * math.sin(2 * math.pi * 5.4 * t)) / RATE
            value = sum(math.sin(phase * h) / h ** (1.15 if kind == 'violin' else 1.38) for h in range(1, 15))
            value *= envelope(t, seconds, .13 if kind == 'violin' else .10, .7)
            value += .025 * low_noise * envelope(t, seconds, .04, 1.0)
        elif kind in ('grand', 'upright'):
            fundamental = root * (1 + .0008 * math.sin(2 * math.pi * 1.8 * t))
            phase += 2 * math.pi * fundamental / RATE
            value = sum(math.sin(phase * h) * math.exp(-t * (2.0 + h * .65)) / h ** 1.18 for h in range(1, 14))
            value += .28 * math.sin(phase * 1.003) * math.exp(-t * 2.8)
            if kind == 'upright':
                value = math.tanh(value * 1.4) * .78 + .09 * low_noise * math.exp(-t * 25)
            value *= envelope(t, seconds, .001, .65)
        elif kind == 'rhodes':
            phase += 2 * math.pi * root / RATE
            mod_phase += 2 * math.pi * root * 3.01 / RATE
            value = math.sin(phase + 2.8 * math.exp(-t * 10) * math.sin(mod_phase))
            value += .26 * math.sin(phase * 2.003) * math.exp(-t * 5)
            value *= envelope(t, seconds, .003, 1.4)
        elif kind == 'organ':
            phase += 2 * math.pi * root / RATE
            drawbars = [(1, .68), (2, .46), (3, .20), (4, .24), (6, .12), (8, .09)]
            value = sum(a * math.sin(phase * h + .06 * math.sin(2 * math.pi * 5.8 * t)) for h, a in drawbars)
            value *= envelope(t, seconds, .025, .45)
        elif kind == 'clav':
            phase += 2 * math.pi * root / RATE
            value = sum(math.sin(phase * h) * math.exp(-t * (9 + h * 2)) / h ** .7 for h in range(1, 14))
            value = math.tanh(value * 2.1) * envelope(t, seconds, .001, 2)
        elif kind == 'celesta':
            phase += 2 * math.pi * root / RATE
            value = sum(a * math.sin(phase * ratio) * math.exp(-t * decay) for ratio, a, decay in [(1, 1, 3), (2.756, .38, 5), (5.405, .18, 8)])
            value *= envelope(t, seconds, .001, .8)
        elif kind == 'accordion':
            phase += 2 * math.pi * root / RATE
            value = sum(math.sin(phase * h + .03 * math.sin(2 * math.pi * (4 + h * .3) * t)) / h ** 1.15 for h in range(1, 11))
            value *= envelope(t, seconds, .045, .65)
        elif kind == 'acid':
            phase += 2 * math.pi * root / RATE
            cutoff = 1.7 + 9 * math.exp(-t * 7)
            value = sum(math.sin(phase * h) * math.exp(-h / cutoff) / h ** .58 for h in range(1, 19))
            value = math.tanh(value * 2.8) * envelope(t, seconds, .001, 2.3)
        elif kind == 'analog-pad':
            phase += 2 * math.pi * root / RATE
            value = sum((math.sin(phase * h) + math.sin(phase * h * 1.003)) / h ** 1.35 for h in range(1, 12))
            value *= (.6 + .4 * math.sin(2 * math.pi * .36 * t) ** 2) * envelope(t, seconds, .22, .32)
        elif kind == 'fm-bell':
            phase += 2 * math.pi * root / RATE
            mod_phase += 2 * math.pi * root * 2.72 / RATE
            value = math.sin(phase + 4.2 * math.exp(-t * 5) * math.sin(mod_phase)) * envelope(t, seconds, .001, 1.65)
        elif kind == 'wavetable':
            phase += 2 * math.pi * root / RATE
            sweep = 1.0 + 4.0 * (math.sin(2 * math.pi * .7 * t) ** 2)
            value = sum(math.sin(phase * h + .18 * h * math.sin(2 * math.pi * 1.7 * t)) * math.exp(-h / sweep) / h for h in range(1, 16))
            value = math.tanh(value * 1.7) * envelope(t, seconds, .015, 1.2)
        elif kind == 'sub':
            phase += 2 * math.pi * root / RATE
            value = (math.sin(phase) + .24 * math.sin(phase * 2)) * envelope(t, seconds, .002, 1.3)
        elif kind == 'choir':
            phase += 2 * math.pi * root * (1 + .002 * math.sin(2 * math.pi * 4.7 * t)) / RATE
            value = sum((.1 + 1.5 * math.exp(-((root * h - 650) / 210) ** 2) + math.exp(-((root * h - 1150) / 310) ** 2)) * math.sin(phase * h) / h for h in range(1, 16))
            value *= envelope(t, seconds, .15, .55)
        elif kind == 'digital-pluck':
            phase += 2 * math.pi * root / RATE
            mod_phase += 2 * math.pi * root * 5 / RATE
            value = math.sin(phase + 3.2 * math.exp(-t * 13) * math.sin(mod_phase)) * envelope(t, seconds, .001, 4)
        elif kind == 'rock-kick':
            phase += 2 * math.pi * (52 + 118 * math.exp(-t * 40)) / RATE
            value = math.sin(phase) * math.exp(-t * 13) + .19 * high_noise * math.exp(-t * 125)
        elif kind == 'rock-snare':
            value = .4 * math.sin(2 * math.pi * 190 * t) * math.exp(-t * 21) + .65 * high_noise * math.exp(-t * 15)
            value += .08 * low_noise * math.exp(-t * 7)
        elif kind == 'brush':
            value = (.45 * high_noise + .55 * low_noise) * math.exp(-t * 10) * min(1, t / .012)
        elif kind == 'room-clap':
            bursts = sum(math.exp(-max(0, t - delay) * 90) if t >= delay else 0 for delay in (0, .017, .035))
            value = high_noise * bursts * math.exp(-t * 7) * .32
        elif kind == 'wood-rim':
            value = (.7 * math.sin(2 * math.pi * 810 * t) + .27 * high_noise) * math.exp(-t * 48)
        elif kind == 'tambourine':
            value = (sum(math.sin(2 * math.pi * f * t) for f in (3127, 4211, 5681, 7741)) / 4 + .4 * high_noise) * math.exp(-t * 18)
        elif kind == 'ride':
            value = sum(math.sin(2 * math.pi * f * t) for f in (2311, 3737, 5419, 7103, 9581)) / 5 * math.exp(-t * 6)
            value += .16 * high_noise * math.exp(-t * 9)
        else:
            raise ValueError(kind)
        edge = min(1, i / 20, (count - i) / 180)
        values.append(math.tanh(value * .75) * edge)
    peak = max(abs(value) for value in values) or 1
    folder = DEST / bank
    folder.mkdir(parents=True, exist_ok=True)
    with wave.open(str(folder / f'{kind}-0.wav'), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(b''.join(struct.pack('<h', round(value / peak * .72 * 32767)) for value in values))


for bank_name, assets in SPECS.items():
    for asset, duration, frequency in assets:
        render(bank_name, asset, duration, frequency)
    print(bank_name, len(assets), 'assets')
