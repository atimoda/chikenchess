"""Amplified guitars for the Blues, Jazz & Rock kits (bank chicken-amps-v1).

The Web Audio engine distorts each note on its own, so a chord never intermodulates the way it
does in a guitar amplifier, and one waveshaper cannot stand for a whole amp. This script renders
the amplifiers offline instead: CC0 direct recordings of two electric guitars (Karoryfer Black and
Green Guitars: a Gretsch Anniversary and a Hofner Club) and of a bass (Big Little Bass) go through
models of the rigs each style is known for (pre-EQ, cascaded asymmetric tube stages at 4x
oversampling, tone stack, power stage and speaker cabinet). Power chords are mixed before the amp,
as on a real guitar, so the fifth and the octave beat inside the distortion.

Run: python3 scripts/prepare-amp-recordings.py   (Python 3.9+, numpy, scipy, soundfile, ffmpeg)
Sources are cached in AMP_SOURCE_CACHE (default: the system temp folder). Output: Ogg Opus 64 kbps
and AAC 80 kbps, mono 24 kHz, plus manifest.json with URLs and SHA256 of every source and result.
"""
import hashlib
import json
import os
import pathlib
import subprocess
import tempfile
import urllib.request

import numpy as np
import scipy.signal as sg
import soundfile as sf

ROOT = pathlib.Path(__file__).resolve().parents[1]
BANK = "chicken-amps-v1"
OUT = ROOT / "public/samples" / BANK
CACHE = pathlib.Path(os.environ.get("AMP_SOURCE_CACHE", pathlib.Path(tempfile.gettempdir()) / "chicken-amp-sources"))
GUITARS = ("sfzinstruments/karoryfer.black-and-green-guitars", "b3b3249d37dc977a1a297bd2dc053e6d9b6b805c")
BASS = ("sfzinstruments/karoryfer.big-little-bass", "4e92bdf54dcd2d6cfad968cc90542d5461c9b9fc")
SR, OS, RATE = 44100, 4, 24000
NAMES = ["c", "db", "d", "eb", "e", "f", "gb", "g", "ab", "a", "bb", "b"]
SOURCES = {}


def midi(note):
    name, octave = note[:-1], int(note[-1])
    return 12 * (octave + 1) + {"c": 0, "c#": 1, "d": 2, "d#": 3, "e": 4, "f": 5, "f#": 6, "g": 7, "g#": 8, "a": 9, "a#": 10, "b": 11}[name]


def fetch(repository, revision, source):
    CACHE.mkdir(parents=True, exist_ok=True)
    cached = CACHE / (hashlib.sha1("{}/{}/{}".format(repository, revision, source).encode()).hexdigest() + ".wav")
    url = "https://raw.githubusercontent.com/{}/{}/{}".format(repository, revision, source)
    if not cached.exists():
        with urllib.request.urlopen(url, timeout=60) as response:
            cached.write_bytes(response.read())
    SOURCES[url] = hashlib.sha256(cached.read_bytes()).hexdigest()
    values, rate = sf.read(cached, always_2d=True)
    values = values.mean(axis=1)
    return values if rate == SR else sg.resample_poly(values, SR, rate)


def di(sounding, guitar="green", layer=None, rr=1):
    """Direct guitar recording by sounding pitch. The library names notes one octave above (e3 is MIDI 40).
    The Hofner's forte layer rings near 3.4 kHz on the upper frets, so it is read at mezzo-forte."""
    layer = layer or ("f" if guitar == "green" else "mf")
    number = midi(sounding) + 12
    name = "{}{}".format(NAMES[number % 12], number // 12 - 1)
    return onset(fetch(*GUITARS, "Samples/{}/ord/twang_{}_{}_rr{}.wav".format(guitar, name, layer, rr)))


def onset(x, threshold=.02):
    start = np.argmax(np.abs(x) > threshold * np.abs(x).max())
    return x[max(0, start - 40):]


# ---------- filters ----------
def hp(x, f, order=1, sr=SR):
    return sg.sosfilt(sg.butter(order, f, "hp", fs=sr, output="sos"), x)


def lp(x, f, order=1, sr=SR):
    return sg.sosfilt(sg.butter(order, f, "lp", fs=sr, output="sos"), x)


def peak(x, f, db, q=1.0, sr=SR):
    a = 10 ** (db / 40)
    w = 2 * np.pi * f / sr
    alpha = np.sin(w) / (2 * q)
    b = [1 + alpha * a, -2 * np.cos(w), 1 - alpha * a]
    den = [1 + alpha / a, -2 * np.cos(w), 1 - alpha / a]
    return sg.lfilter(np.array(b) / den[0], np.array(den) / den[0], x)


def shelf(x, f, db, high=True, sr=SR):
    a = 10 ** (db / 40)
    w = 2 * np.pi * f / sr
    cos, alpha = np.cos(w), np.sin(w) / 2 * np.sqrt(2)
    s = 2 * np.sqrt(a) * alpha
    if high:
        b = [a * ((a + 1) + (a - 1) * cos + s), -2 * a * ((a - 1) + (a + 1) * cos), a * ((a + 1) + (a - 1) * cos - s)]
        den = [(a + 1) - (a - 1) * cos + s, 2 * ((a - 1) - (a + 1) * cos), (a + 1) - (a - 1) * cos - s]
    else:
        b = [a * ((a + 1) - (a - 1) * cos + s), 2 * a * ((a - 1) - (a + 1) * cos), a * ((a + 1) - (a - 1) * cos - s)]
        den = [(a + 1) + (a - 1) * cos + s, -2 * ((a - 1) + (a + 1) * cos), (a + 1) + (a - 1) * cos - s]
    return sg.lfilter(np.array(b) / den[0], np.array(den) / den[0], x)


def tube(x, gain, bias=0.0):
    """One triode-like stage: asymmetric soft clipping, DC removed by the next coupling capacitor."""
    return np.tanh(gain * x + bias) - np.tanh(bias)


def compress(x, threshold=.1, ratio=4.0, attack=.004, release=.14, sr=SR):
    env = np.empty_like(x)
    a, r, level = np.exp(-1 / (attack * sr)), np.exp(-1 / (release * sr)), 0.0
    for i, value in enumerate(np.abs(x)):
        level = (a if value > level else r) * (level - value) + value
        env[i] = level
    gain = np.where(env > threshold, (np.maximum(env, 1e-9) / threshold) ** (1 / ratio - 1), 1.0)
    return x * gain


def sustain(x, floor=.004, target=.12, sr=SR):
    """A sustainer/compressor pedal: holds the note near one level while the string still rings."""
    window = int(.03 * sr)
    env = np.sqrt(sg.lfilter(np.ones(window) / window, [1], x * x))
    return x * target / np.maximum(env, floor)


def normal(x, level=.25):
    return x * level / (np.abs(x).max() + 1e-9)


def pickup(x, amount=1.0):
    """The direct recordings are dark (hollow bodies, tone rolled off). This restores the resonant
    peak and the thin low end of a bridge single-coil before the amplifier."""
    return peak(shelf(hp(x, 100, 1), 1100, 9.0 * amount), 3300, 5.0 * amount, 1.2)


def exciter(x, amount=.5):
    """Upper harmonics regenerated from the string's own top, where the recording has none left."""
    top = hp(x, 1400, 2)
    return x + amount * hp(np.tanh(8 * top / (np.abs(top).max() + 1e-9)), 1800, 2) * np.abs(x).max() * .5


def oversampled(process):
    def run(x, *args, **kwargs):
        return sg.resample_poly(process(sg.resample_poly(x, OS, 1), *args, **kwargs), 1, OS)
    return run


HI = SR * OS


# ---------- amplifiers (input around ±0.25) ----------
@oversampled
def tweed_stages(x, gain):
    # Late-50s Fender tweed (Bassman/Deluxe) turned up: two 12AX7 stages into 6L6s that sag and round off.
    x = tube(x, gain, .18)
    x = lp(hp(x, 35, 1, HI), 9000, 1, HI)
    x = tube(x, 2.4, -.12)
    x = hp(x, 30, 1, HI)
    return np.tanh(1.25 * x)


def tweed(x, gain=7.0):
    x = peak(hp(normal(pickup(x, .8)), 75, 1), 750, 3.5, .7)
    x = tweed_stages(x, gain)
    # Open-back cabinet with Jensen alnico 10s: soft top, forward upper mids.
    x = peak(peak(peak(hp(x, 85, 2), 125, 2.5, 1.0), 450, -1.5, 1.0), 2400, 4.5, 1.2)
    return lp(x, 4700, 3)


@oversampled
def plexi_stages(x, gain):
    # Marshall "Plexi"/JCM800: bright cap, three stages, a tone stack that keeps the mids.
    x = tube(x, gain, .22)
    x = lp(hp(x, 45, 1, HI), 8500, 1, HI)
    x = tube(x, 3.2, -.16)
    x = peak(hp(x, 45, 1, HI), 600, -2.5, .8, HI)
    x = tube(x, 1.6, .06)
    return np.tanh(1.15 * hp(x, 30, 1, HI))


def greenback(x, top=5200):
    # Closed 4x12 with Celestion G12M: low thump, 400 Hz dip, a 2.7 kHz bark and a steep roll-off.
    x = peak(peak(peak(hp(x, 95, 2), 112, 3.0, 1.2), 380, -2.5, 1.2), 2700, 3.5, 1.4)
    return lp(x, top, 4)


def plexi(x, gain=18.0, top=5000):
    x = shelf(hp(normal(pickup(x, .6)), 110, 1), 1300, 3.0)
    return greenback(plexi_stages(x, gain), top)


def lead_amp(x, gain=34.0):
    # Humbucker into an overdrive pedal (mid hump, no bass) into the cranked Marshall: the singing lead.
    x = normal(sustain(normal(pickup(x, .4)), floor=.012))
    x = .5 * x + hp(x, 220, 1)
    x = peak(x, 760, 4.0, .9)
    x = plexi_stages(x, gain)
    return peak(peak(greenback(x, 4200), 1100, 2.5, .8), 2700, -2.0, 1.4)


@oversampled
def recto_stages(x, gain):
    # 90s high gain (Mesa Dual Rectifier, Marshall JCM900): four tight stages.
    x = tube(x, gain, .12)
    x = lp(hp(x, 70, 1, HI), 9000, 1, HI)
    x = tube(x, 5.5, -.2)
    x = lp(hp(x, 70, 1, HI), 7500, 1, HI)
    x = tube(x, 3.8, .1)
    x = hp(x, 50, 1, HI)
    x = shelf(peak(peak(x, 700, -6.0, .7, HI), 3200, 4.0, 1.0, HI), 120, 3.0, False, HI)
    return np.tanh(1.2 * x)


def recto(x, gain=60.0):
    # A tightened low end and a mid push in front keep palm mutes clear under that much gain.
    x = peak(hp(normal(x), 135, 2), 900, 4.0, .8)
    x = recto_stages(x, gain)
    # Closed 4x12 with Vintage 30s: more low thump and a harder upper-mid edge than the greenback.
    x = peak(peak(peak(peak(hp(x, 100, 2), 120, 4.0, 1.4), 450, -3.0, 1.0), 2500, 4.0, 1.5), 3800, 3.0, 2.0)
    return lp(x, 5800, 4)


@oversampled
def muff_stages(x, gain):
    # Big Muff: two diode-clipping stages and a tone control that scoops 1 kHz.
    x = tube(x, gain, .05)
    x = lp(hp(x, 100, 1, HI), 2600, 1, HI)
    x = tube(x, 22.0, -.05)
    x = lp(hp(x, 90, 1, HI), 3400, 2, HI)
    return peak(x, 1000, -9.0, .6, HI)


def muff(x, gain=42.0):
    x = muff_stages(hp(normal(x), 60, 1), gain)
    # Into a loud clean combo (Twin-style 2x12): wide and woolly, little speaker break-up.
    x = peak(peak(hp(x, 80, 2), 110, 3.0, 1.0), 2500, 3.0, 1.2)
    return lp(x, 5000, 3)


@oversampled
def fuzzface_stages(x, gain):
    # Germanium Fuzz Face: one soft and one hard transistor, lopsided, rolling its own highs off.
    x = tube(x, gain, .45)
    x = hp(x, 40, 1, HI)
    x = np.clip(1.6 * x, -.7, 1.0)
    x = np.tanh(1.4 * lp(x, 4200, 1, HI))
    return x


def fuzzface(x, gain=30.0):
    x = normal(sustain(normal(x), floor=.01))
    x = fuzzface_stages(hp(x, 70, 1), gain)
    # Hiwatt stack with Fane speakers: clean headroom, full mids, smooth top.
    x = peak(peak(peak(hp(x, 85, 2), 130, 2.5, 1.0), 900, 2.0, .8), 2100, 3.5, 1.2)
    return lp(x, 4600, 4)


@oversampled
def chime_stages(x, gain):
    return np.tanh(1.1 * hp(tube(x, gain, .1), 30, 1, HI))


def chime(x, gain=2.4, top=6500, bright=1.0):
    # Vox AC30 top boost on the edge: compressed, glassy, alnico blues.
    x = shelf(hp(normal(exciter(pickup(x, bright), .3 * bright)), 110, 1), 2500, 2.5)
    x = chime_stages(x, gain)
    x = peak(peak(hp(x, 105, 2), 420, -1.5, 1.0), 3200, 4.0, 1.5)
    return lp(x, top, 3)


def retune(x, cents):
    ratio = 2 ** (cents / 1200)
    return np.interp(np.arange(0, len(x) - 1, ratio), np.arange(len(x)), x)


def mix(parts):
    """parts: [(signal, delay seconds, level)] mixed like strings picked one after another."""
    length = max(len(x) + int(delay * SR) for x, delay, _ in parts)
    out = np.zeros(length)
    for x, delay, level in parts:
        start = int(delay * SR)
        out[start:start + len(x)] += x * level
    return out


def chorus(x, rate=.85, depth=.0032, base=.013, wet=.55):
    n = np.arange(len(x))
    delay = (base + depth * np.sin(2 * np.pi * rate * n / SR)) * SR
    return x + wet * np.interp(n - delay, n, x, left=0)


def palm_mute(x):
    """Edge of the picking hand on the bridge: the string dies in a tenth of a second and loses its top."""
    t = np.arange(len(x)) / SR
    bright = np.exp(-t / .012)
    return (x * bright + lp(x, 1400, 2) * (1 - bright)) * np.exp(-t / .085)


def harp_reed(note, seconds):
    """Blues harmonica: a free reed with a scooped attack, breath and hand vibrato, before the amp."""
    f0 = 440 * 2 ** ((midi(note) - 69) / 12)
    t = np.arange(int(seconds * SR)) / SR
    rng = np.random.default_rng(midi(note))
    bend = -55 * np.exp(-t / .045) + 9 * np.sin(2 * np.pi * 5.4 * t) * np.clip((t - .35) / .5, 0, 1)
    phase = 2 * np.pi * np.cumsum(f0 * 2 ** (bend / 1200)) / SR
    x = np.zeros_like(t)
    for k in range(1, int(9000 / f0) + 1):
        x += np.sin(k * phase + rng.uniform(0, 6.28)) * (1.0 if k == 1 else .9 / k ** 1.35) * (1.25 if k % 2 == 0 else 1.0)
    x = peak(peak(x, 1150, 4.0, 2.0), 2300, 3.0, 2.5)
    breath = lp(hp(rng.standard_normal(len(t)), 1800, 2), 5000, 2) * .05 * np.abs(x).max()
    envelope = np.minimum(1, t / .03) * (1 - .22 * np.clip((t - .35) / .5, 0, 1) * (1 + np.sin(2 * np.pi * 5.4 * t)) / 2)
    return (x + breath) * envelope


def bullet(x):
    """Cupped crystal microphone: a telephone-like band that drives the amp hard."""
    return peak(lp(hp(x, 180, 2), 3600, 2), 1200, 3.0, 1.0)


@oversampled
def svt_stages(x, gain):
    return np.tanh(1.3 * hp(tube(x, gain, .15), 25, 1, HI))


def svt(x, gain=7.0):
    # Picked rock bass into a tube head and a sealed 8x10: grind in the upper mids, no fizz.
    x = hp(normal(x), 35, 1)
    # Bi-amped like a rock bass rig: the lows stay clean, everything above them is driven.
    grind = svt_stages(shelf(x, 180, 11.0), gain)
    x = lp(x, 110, 2) * 2.2 + hp(grind, 110, 2)
    x = peak(peak(hp(x, 38, 2), 80, 3.0, 1.0), 1700, 3.0, 1.2)
    return lp(x, 3400, 3)


# ---------- the bank ----------
def render(name, signal, seconds, level=.2, fade=.09):
    x = signal[:int(seconds * SR)]
    n = int(fade * SR)
    x[-n:] *= np.cos(np.linspace(0, np.pi / 2, n)) ** 2
    x[:16] *= np.linspace(0, 1, 16)
    x = sg.resample_poly(x, RATE, SR)
    # Even loudness across the keymap: the first 0.6 s set the level, peaks stay below full scale.
    x = x * level / (np.sqrt(np.mean(x[:int(.6 * RATE)] ** 2)) + 1e-9)
    x = x * min(1.0, .95 / np.abs(x).max())
    wav = OUT / (name + ".wav")
    sf.write(wav, x, RATE, subtype="PCM_16")
    run = lambda *args: subprocess.run([os.environ.get("FFMPEG_BINARY", "ffmpeg"), "-nostdin", "-loglevel", "error", "-y", "-i", str(wav), "-map_metadata", "-1", *args], check=True)
    run("-c:a", "libopus", "-b:a", "64k", "-vbr", "on", "-application", "audio", str(wav.with_suffix(".ogg")))
    run("-c:a", "aac", "-b:a", "80k", "-movflags", "+faststart", str(wav.with_suffix(".m4a")))
    wav.unlink()
    rms = float(np.sqrt(np.mean(x[:int(.6 * RATE)] ** 2)))
    return {"file": name + ".ogg", "seconds": round(len(x) / RATE, 2), "rms": round(rms, 3),
            "sha256": hashlib.sha256(wav.with_suffix(".ogg").read_bytes()).hexdigest(),
            "sha256M4a": hashlib.sha256(wav.with_suffix(".m4a").read_bytes()).hexdigest()}


def power_chord(root, guitar, muted=False):
    """Root, fifth and octave picked downwards, mixed before the amplifier."""
    number = midi(root)
    names = ["{}{}".format(["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"][n % 12], n // 12 - 1) for n in (number, number + 7, number + 12)]
    strings = [di(n, guitar) for n in names]
    if muted:
        strings = [palm_mute(s) for s in strings]
    return mix([(strings[0], 0, 1.0), (strings[1], .006, .85), (strings[2], .012, .7)])


def twelve_string(note):
    """Rickenbacker 360/12: the four low courses pair each string with its octave, the two high ones with a unison."""
    low = di(note, "green")
    pair = di("{}{}".format(note[:-1], int(note[-1]) + 1), "green") if midi(note) < midi("b3") else retune(di(note, "green", rr=2), 7)
    return mix([(low, 0, 1.0), (pair, .011, .75)])


def brightness(note):
    """Low strings need more of the missing top than the high ones, which keep their own harmonics."""
    return float(np.clip(1.35 - (midi(note) - 40) / 28, .3, 1.35))


LEAD_NOTES = ["a2", "d3", "g3", "c4", "f4", "a4", "d5"]
WIDE_NOTES = ["e2", "a2", "d3", "g3", "c4", "f4", "a4", "d5"]
MID_NOTES = ["e2", "a2", "d3", "g3", "c4", "f4", "a4"]
CHORD_ROOTS = ["e2", "g2", "c3", "e3", "g3"]
ASSETS = [
    # asset, variant, notes, seconds, render(note)
    ("tweed", 0, WIDE_NOTES, 2.0, lambda n: tweed(di(n, "green"), 7.0)),
    ("crunch", 0, MID_NOTES, 2.2, lambda n: plexi(di(n, "black"), 18.0)),
    ("lead", 0, LEAD_NOTES, 3.2, lambda n: lead_amp(di(n, "black"))),
    ("power", 0, CHORD_ROOTS, 2.6, lambda n: recto(power_chord(n, "black"), 60.0)),
    ("power", 1, CHORD_ROOTS, 2.6, lambda n: muff(power_chord(n, "green"), 42.0)),
    ("chug", 0, CHORD_ROOTS, .42, lambda n: recto(power_chord(n, "black", True), 75.0)),
    ("fuzz", 0, LEAD_NOTES, 2.8, lambda n: fuzzface(di(n, "green"))),
    ("jangle", 0, MID_NOTES, 2.4, lambda n: chime(compress(normal(twelve_string(n)), .05, 6.0), 2.4, 6500, brightness(n)), .14),
    ("chorus", 0, MID_NOTES, 2.6, lambda n: chime(chorus(compress(normal(di(n, "green", "mf")), .06, 4.0)), 1.5, 6000, brightness(n)), .14),
    ("harp", 0, ["c4", "f4", "a4", "d5", "g5"], 1.8, lambda n: tweed(bullet(harp_reed(n, 2.0)), 5.0)),
]
BASS_NOTES = [("c1", "c2"), ("e1", "e2"), ("g1", "g2"), ("c2", "c3")]  # sounding pitch, source name

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    recordings = []
    for asset, variant, notes, seconds, make, *level in ASSETS:
        for note in notes:
            entry = render("{}-{}-{}".format(asset, variant, note.replace("#", "s")), make(note), seconds, *level)
            recordings.append({"asset": asset, "variant": variant, "note": note, **entry})
            print(entry["file"], entry["seconds"], entry["rms"])
    for sounding, source in BASS_NOTES:
        raw = onset(fetch(*BASS, "Samples/big_little_pluck_{}_f_rr1.wav".format(source)))
        entry = render("rock-bass-0-{}".format(sounding), svt(raw), 1.8)
        recordings.append({"asset": "rock-bass", "variant": 0, "note": sounding, **entry})
        print(entry["file"], entry["seconds"], entry["rms"])
    manifest = {"license": "CC0-1.0", "repositories": [GUITARS, BASS], "sources": SOURCES, "recordings": recordings}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    total = sum((OUT / r["file"]).stat().st_size for r in recordings)
    print("{} files, {:.0f} kB Opus".format(len(recordings), total / 1000))
