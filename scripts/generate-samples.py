"""Original ChickenChess electronic samples. Deterministic, dependency-free.

The generated audio is dedicated to the public domain under CC0-1.0.
This is an original synthetic bank, not recordings of a branded drum machine.
Run: python3 scripts/generate-samples.py
"""
import math
import pathlib
import random
import struct
import wave

RATE = 32000
DEST = pathlib.Path(__file__).resolve().parents[1] / 'public/samples/chicken-electro-v1'
DEST.mkdir(parents=True, exist_ok=True)


def render(kind, variant, seconds):
    rng = random.Random(f'chicken-electro-v1:{kind}:{variant}')
    phase = 0
    previous = 0
    data = []
    for i in range(int(RATE * seconds)):
        t = i / RATE
        noise = rng.uniform(-1, 1)
        high = (noise - previous) * .5
        previous = noise
        if kind == 'kick':
            frequency = 48 + 125 * math.exp(-t * (40 if variant == 0 else 65))
            phase += 2 * math.pi * frequency / RATE
            v = math.sin(phase) * math.exp(-t * (8 if variant == 0 else 15)) + .12 * high * math.exp(-t * 280)
        elif kind == 'snare':
            v = (.44 * math.sin(2 * math.pi * 185 * t) + .16 * math.sin(2 * math.pi * 330 * t)) * math.exp(-t * 35)
            v += .68 * high * math.exp(-t * (19 if variant == 0 else 35))
        elif kind in ('hat', 'open-hat'):
            metallic = sum(math.copysign(1, math.sin(2 * math.pi * f * t)) for f in [4057, 5311, 6173, 7481]) / 4
            decay = 7 if kind == 'open-hat' else (65 if variant == 0 else 95)
            v = (.3 * metallic + .7 * high) * math.exp(-t * decay)
        elif kind == 'clap':
            envelope = sum(math.exp(-(t - onset) * 240) for onset in [0, .009, .019, .03] if t >= onset)
            envelope += .35 * math.exp(-max(0, t - .03) * 22) if t >= .03 else 0
            v = high * envelope
        elif kind == 'tom':
            phase += 2 * math.pi * (105 + 70 * math.exp(-t * 40)) / RATE
            v = (math.sin(phase) + .2 * math.sin(phase * 1.51)) * math.exp(-t * 11) + .06 * high * math.exp(-t * 100)
        elif kind == 'rim':
            v = sum(math.sin(2 * math.pi * f * t) for f in [760, 1220, 1910]) / 3 * math.exp(-t * 95) + .15 * high * math.exp(-t * 180)
        elif kind == 'shaker':
            v = high * min(1, t * 600) * math.exp(-t * 48)
        else:
            fundamental = 261.6255653
            v = sum(amp * math.sin(2 * math.pi * fundamental * partial * t) * math.exp(-t * decay)
                    for partial, amp, decay in [(1, .65, 3), (2, .25, 5), (3.01, .12 if variant == 0 else .03, 9), (4, .08, 14)])
        fade = min(1, i / 12, (RATE * seconds - i) / 160)
        data.append(v * fade)
    peak = max(abs(v) for v in data) or 1
    with wave.open(str(DEST / f'{kind}-{variant}.wav'), 'wb') as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes(b''.join(struct.pack('<h', round(v / peak * .88 * 32767)) for v in data))


for sound, count, duration in [('kick', 2, .6), ('snare', 2, .32), ('hat', 2, .12),
                               ('open-hat', 1, .75), ('clap', 1, .32), ('tom', 1, .55),
                               ('rim', 1, .12), ('shaker', 1, .16), ('bell', 2, 1.5)]:
    for index in range(count):
        render(sound, index, duration)
print(f'{len(list(DEST.glob("*.wav")))} samples · {sum(f.stat().st_size for f in DEST.glob("*.wav")):,} bytes')
