"""Original, deterministic synthetic one-shots for Manchester 1999.

No audio from the reference recording is sampled. Generated WAVs: CC0-1.0.
Python standard library only. Run python3 scripts/generate-jazz-samples.py.
"""
import math
import pathlib
import random
import struct
import wave

RATE = 32000
DEST = pathlib.Path(__file__).resolve().parents[1] / 'public/samples/chicken-jazz-v1'
DEST.mkdir(parents=True, exist_ok=True)


def render(kind, variant, seconds, fundamental=261.6255653):
    rng = random.Random(f'chicken-jazz-v1:{kind}:{variant}')
    samples = []
    phase = previous = smooth = 0
    for i in range(round(seconds * RATE)):
        t = i / RATE
        noise = rng.uniform(-1, 1)
        high = (noise - previous) * .5
        previous = noise
        smooth += .13 * (noise - smooth)
        if kind in ('reed', 'baritone', 'brass', 'formant'):
            fall = 1 - (.04 * max(0, t - .17) / seconds if kind == 'brass' else 0)
            breath = min(1, t / .012) * math.exp(-t * (5 if variant == 0 else 8))
            phase += 2 * math.pi * fundamental * fall * (1 + .003 * math.sin(2 * math.pi * 5.2 * t)) / RATE
            value = 0
            for h in range(1, 17):
                freq = fundamental * h
                if kind == 'formant':
                    amp = (.12 + 2 * math.exp(-((freq - 650) / 180) ** 2) + math.exp(-((freq - 1200) / 260) ** 2)) / h
                else:
                    center = 950 if kind == 'baritone' else 1500 if kind == 'reed' else 1900
                    amp = (1 + 1.6 * math.exp(-((freq - center) / 600) ** 2)) / h ** (1.15 if variant == 0 else 1.5)
                    if kind == 'baritone' and h % 2 == 0:
                        amp *= .55
                value += amp * math.sin(h * phase + .06 * h)
            value = (value + .09 * smooth) * breath
        elif kind == 'pluck':
            value = sum(math.sin(2 * math.pi * fundamental * h * t) / h ** 1.6 * math.exp(-t * (3 + 2 * h)) for h in range(1, 13))
            value += .13 * high * math.exp(-t * 100)
        elif kind == 'keys':
            value = sum(amp * math.sin(2 * math.pi * fundamental * h * t) * math.exp(-t * decay)
                        for h, amp, decay in [(1, 1, 4), (2, .35, 7), (3, .12, 10), (7, .05, 20)])
            value *= min(1, t * 450)
        elif kind == 'kick':
            phase += 2 * math.pi * (54 + 90 * math.exp(-t * 60)) / RATE
            value = math.sin(phase) * math.exp(-t * 14) + .16 * high * math.exp(-t * 200)
        elif kind == 'snare':
            value = (.4 * math.sin(2 * math.pi * 190 * t) + .17 * math.sin(2 * math.pi * 315 * t)) * math.exp(-t * 35)
            value += .65 * high * math.exp(-t * (24 if variant == 0 else 42))
        else:  # short ride, a metallic tick with a soft wash
            value = sum(math.sin(2 * math.pi * f * t) for f in [3127, 4351, 5767, 7933, 10007]) / 5 * math.exp(-t * 15)
            value += .25 * high * math.exp(-t * 9)
        fade = min(1, i / 16, (seconds * RATE - i) / 200)
        samples.append(math.tanh(value * .7) * fade)
    peak = max(abs(v) for v in samples)
    with wave.open(str(DEST / f'{kind}-{variant}.wav'), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(b''.join(struct.pack('<h', round(v / peak * .78 * 32767)) for v in samples))


for kind, count, length, root in [
    ('reed', 2, .45, 261.6255653), ('baritone', 1, .5, 130.81278265),
    ('brass', 1, .45, 261.6255653), ('formant', 1, .3, 261.6255653),
    ('pluck', 1, .65, 65.4063913), ('keys', 1, .65, 261.6255653),
    ('kick', 1, .35, 0), ('snare', 2, .23, 0), ('ride', 1, .38, 0),
]:
    for variant in range(count):
        render(kind, variant, length, root)
