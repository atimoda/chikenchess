"""Original, deterministic CC0 sketches for Salvador 1992.

Run: python3 scripts/generate-samba-reggae-samples.py
Mono 24 kHz PCM. No recordings or third-party dependencies.
"""
import math
import pathlib
import random
import struct
import wave

RATE = 24000
DEST = pathlib.Path(__file__).resolve().parents[1] / "public/samples/chicken-samba-reggae-v1"
SPECS = {
    "surdo-fundo": .80,
    "surdo-meio": .64,
    "surdo-viradeira": .55,
    "caixa": .39,
    "tarol": .32,
    "repinique": .43,
    "timbau": .50,
    "agogo-grave": .52,
    "agogo-agudo": .43,
    "chocalho": .36,
    "pandeiro": .42,
    "trompete": 1.15,
    "trombone": 1.30,
}


def fall(t, rate):
    return math.exp(-t * rate)


def drum(t, fundamental, bend, decay, noise, low_noise):
    phase = 2 * math.pi * (fundamental * t + bend * (1 - fall(t, 26)) / 26)
    head = math.sin(phase) + .22 * math.sin(phase * 1.63) + .12 * math.sin(phase * 2.37)
    return .85 * head * fall(t, decay) + .12 * noise * fall(t, 65) + .07 * low_noise * fall(t, 24)


def brass(t, frequency, low=False):
    onset = 1 - fall(t, 32 if low else 45)
    release = fall(t, 1.5 if low else 2.0)
    vibrato = 1 + .0025 * math.sin(2 * math.pi * 5.2 * t)
    phase = 2 * math.pi * frequency * (t + .0015 * (1 - fall(t, 12))) * vibrato
    formant = 850 if low else 1450
    harmonics = sum(
        (1 / harmonic ** .85)
        * (.22 + 1.1 * math.exp(-((harmonic * frequency - formant) / (formant * .45)) ** 2))
        * math.sin(phase * harmonic)
        for harmonic in range(1, 15)
    )
    return math.tanh(harmonics * 1.65) * onset * release


def sample(kind, t, noise, bright, low_noise):
    if kind == "surdo-fundo":
        return drum(t, 62, 70, 5.2, noise, low_noise)
    if kind == "surdo-meio":
        return drum(t, 92, 92, 7.4, noise, low_noise)
    if kind == "surdo-viradeira":
        return drum(t, 134, 105, 9.0, noise, low_noise) + .14 * bright * fall(t, 35)
    if kind == "caixa":
        return .28 * math.sin(2 * math.pi * 210 * t) * fall(t, 24) + .60 * bright * fall(t, 14) + .13 * low_noise * fall(t, 11)
    if kind == "tarol":
        return .20 * math.sin(2 * math.pi * 325 * t) * fall(t, 34) + .68 * bright * fall(t, 22)
    if kind == "repinique":
        return drum(t, 225, 95, 18, noise, low_noise) + .24 * bright * fall(t, 32)
    if kind == "timbau":
        return drum(t, 185, 155, 12, noise, low_noise) + .17 * bright * fall(t, 29)
    if kind.startswith("agogo"):
        frequency = 615 if kind.endswith("grave") else 890
        metallic = sum(
            amplitude * math.sin(2 * math.pi * frequency * ratio * t) * fall(t, decay)
            for ratio, amplitude, decay in ((1, .65, 6), (2.13, .37, 8), (3.57, .17, 13))
        )
        return metallic + .09 * bright * fall(t, 90)
    if kind == "chocalho":
        pulses = sum(fall(t - hit, 95) for hit in (0, .037, .074, .112, .157, .205, .258) if t >= hit)
        return bright * pulses * fall(t, 3.5) * .44
    if kind == "pandeiro":
        jingles = sum(math.sin(2 * math.pi * f * t) for f in (3100, 4200, 5500, 7400)) / 4
        return (.5 * bright + .37 * jingles) * fall(t, 16) + .18 * math.sin(2 * math.pi * 185 * t) * fall(t, 27)
    if kind == "trompete":
        return brass(t, 261.625565)
    if kind == "trombone":
        return brass(t, 130.812783, low=True)
    raise ValueError(kind)


def render(kind, seconds):
    rng = random.Random(f"salvador-1992:{kind}")
    count = round(seconds * RATE)
    previous_noise = low_noise = 0.0
    values = []
    for index in range(count):
        t = index / RATE
        noise = rng.uniform(-1, 1)
        bright = noise - previous_noise
        previous_noise = noise
        low_noise += .09 * (noise - low_noise)
        edge = min(1, index / 28, (count - 1 - index) / 250)
        values.append(sample(kind, t, noise, bright, low_noise) * max(0, edge))
    peak = max(abs(value) for value in values) or 1
    DEST.mkdir(parents=True, exist_ok=True)
    with wave.open(str(DEST / f"{kind}-0.wav"), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(b"".join(struct.pack("<h", round(value / peak * .72 * 32767)) for value in values))


for name, duration in SPECS.items():
    render(name, duration)
print(f"{len(SPECS)} samples in {DEST}")
