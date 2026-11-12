"""A doo-wop vocal group for the Blues, Jazz & Rock kits (bank chicken-voices-v1).

No CC0 recording of a street-corner group was at hand, so the voices are synthesized with a source-
filter model in the manner of the Klatt synthesizer: a glottal pulse (Rosenberg shape, with jitter,
shimmer, a scooped attack and late vibrato) plus aspiration noise, through a cascade of formant
resonators. Every note is sampled every few semitones so the formants stay where a human vocal tract
puts them (a single sample stretched across the keyboard would turn the group into chipmunks), and
each group sound mixes several singers with their own pitch, timing and vocal tract length.

Assets: the group's "ooh" and "aah" pads, the rhythmic "doo" and "wah", the bass singer's "bom" and a
falsetto lead "oo". Run: python3 scripts/generate-vocal-group.py   (numpy, scipy, soundfile, ffmpeg)
Output: Ogg Opus 64 kbps and AAC 80 kbps, mono 24 kHz, plus manifest.json.
"""
import hashlib
import json
import os
import pathlib
import subprocess

import numpy as np
import scipy.signal as sg
import soundfile as sf

ROOT = pathlib.Path(__file__).resolve().parents[1]
BANK = "chicken-voices-v1"
OUT = ROOT / "public/samples" / BANK
SR, RATE = 48000, 24000
NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"]

# Formant frequencies and bandwidths (Hz): adult male averages after Peterson & Barney and Klatt.
MALE = {
    "u": ([300, 870, 2240, 3300, 3750], [60, 90, 120, 200, 250]),
    "o": ([500, 800, 2450, 3300, 3750], [70, 90, 120, 200, 250]),
    "a": ([730, 1090, 2440, 3300, 3750], [90, 110, 140, 200, 250]),
    "m": ([250, 1100, 2200, 3300, 3750], [120, 300, 300, 400, 400]),
    "d": ([250, 1700, 2600, 3300, 3750], [80, 120, 160, 250, 250]),
    "w": ([290, 610, 2150, 3300, 3750], [60, 80, 120, 200, 250]),
}
# The falsetto keeps a shorter tract and lets the first formant follow a high fundamental.
FALSETTO = {"u": ([380, 950, 2650, 3700, 4300], [70, 100, 140, 220, 260])}


def midi(note):
    name, octave = note[:-1], int(note[-1])
    return 12 * (octave + 1) + NAMES.index(name)


def hz(note):
    return 440 * 2 ** ((midi(note) - 69) / 12)


def glottis(f0, seconds, rng, *, vibrato=(5.4, 18, .45), scoop=-35, open_quotient=.6, breath=.08, jitter=.004, tilt=None):
    """Glottal flow derivative with aspiration: f0 in Hz; vibrato (rate Hz, depth cents, onset s)."""
    n = int(seconds * SR)
    t = np.arange(n) / SR
    rate, depth, onset = vibrato
    drift = np.cumsum(rng.standard_normal(n)) / np.sqrt(SR) * 3            # slow random pitch wander (cents)
    cents = scoop * np.exp(-t / .06) + depth * np.clip((t - onset) / .4, 0, 1) * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6.28)) + drift
    freq = f0 * 2 ** (cents / 1200) * (1 + jitter * sg.lfilter([1], [1, -.97], rng.standard_normal(n)) * .03)
    phase = np.cumsum(freq) / SR % 1
    rise, fall = open_quotient * .66, open_quotient * .34
    flow = np.where(phase < rise, .5 * (1 - np.cos(np.pi * phase / rise)),
                    np.where(phase < rise + fall, np.cos(np.pi * (phase - rise) / (2 * fall)), 0.0))
    source = np.diff(flow, prepend=0.0) * SR / f0 / 6
    shimmer = 1 + .04 * sg.lfilter([1], [1, -.995], rng.standard_normal(n)) * .07
    noise = sg.lfilter(*sg.butter(2, [500, 6000], "bandpass", fs=SR), rng.standard_normal(n)) * (.4 + flow)
    x = source * shimmer + breath * noise
    return x if tilt is None else sg.lfilter(*sg.butter(1, tilt, fs=SR), x) + .25 * x


def tract(x, path, scale=1.0, block=96):
    """Cascade of formant resonators following `path`: [(time s, vowel table entry)], interpolated."""
    times = np.array([p[0] for p in path])
    freqs = np.array([p[1][0] for p in path], float) * scale
    widths = np.array([p[1][1] for p in path], float)
    y = np.zeros_like(x)
    states = [np.zeros(2) for _ in range(5)]
    for start in range(0, len(x), block):
        t = start / SR
        chunk = x[start:start + block]
        for k in range(5):
            f = np.interp(t, times, freqs[:, k])
            bw = np.interp(t, times, widths[:, k])
            r = np.exp(-np.pi * bw / SR)
            a = [1, -2 * r * np.cos(2 * np.pi * f / SR), r * r]
            b = [sum(a)]                                                   # unity gain at DC
            chunk, states[k] = sg.lfilter(b, a, chunk, zi=states[k])
        y[start:start + block] = chunk
    return y


def envelope(seconds, attack, release_at=None, release=.25):
    t = np.arange(int(seconds * SR)) / SR
    env = np.minimum(1, t / attack) ** 1.5
    if release_at is not None:
        env *= np.clip(1 - (t - release_at) / release, 0, 1) ** 2
    return env


def peak(x, f, db, q):
    """RBJ peaking equalizer."""
    a, w = 10 ** (db / 40), 2 * np.pi * f / SR
    alpha = np.sin(w) / (2 * q)
    return sg.lfilter([1 + alpha * a, -2 * np.cos(w), 1 - alpha * a], [1 + alpha / a, -2 * np.cos(w), 1 - alpha / a], x)


def presence(x):
    """The singer's formant and a ribbon microphone's lift: the group cuts through the band."""
    return peak(peak(x, 3000, 11.0, .9), 5200, 5.0, .8)


def singer(f0, seconds, path, rng, scale=1.0, delay=0.0, **voice):
    x = presence(tract(glottis(f0, seconds, rng, **voice), path, scale))
    shift = int(delay * SR)
    return np.concatenate([np.zeros(shift), x[:len(x) - shift]])


def room(x):
    """A small rehearsal room: a few early reflections and a short diffuse tail."""
    y = x.copy()
    for ms, g in [(7, .32), (13, .24), (19, .18), (29, .12), (41, .08)]:
        y[int(ms * SR / 1000):] += g * x[:len(x) - int(ms * SR / 1000)]
    tail = sg.lfilter([1], [1, -.6], np.random.default_rng(1).standard_normal(int(.35 * SR)) * np.exp(-np.arange(int(.35 * SR)) / (.08 * SR)))
    return y + .012 * sg.fftconvolve(x, tail)[:len(x)]


def group(note, seconds, path, *, voices=4, attack=.12, seed=0, spread=8, timing=.018, **voice):
    """Several singers on one note: own detune (cents), timing, tract length and vibrato."""
    rng = np.random.default_rng(seed + midi(note))
    out = np.zeros(int(seconds * SR))
    for i in range(voices):
        f0 = hz(note) * 2 ** (rng.uniform(-spread, spread) / 1200)
        v = dict(voice, vibrato=(rng.uniform(4.8, 5.8), rng.uniform(10, 20), rng.uniform(.35, .6)))
        out += singer(f0, seconds, path, rng, scale=rng.uniform(.95, 1.06), delay=rng.uniform(0, timing), **v) * rng.uniform(.8, 1)
    return room(out * envelope(seconds, attack))


V = MALE
SUSTAIN = 2.6
ASSETS = [
    # asset, variant, notes, seconds, make(note)
    ("ooh", 0, ["a2", "d3", "g3", "c4", "f4", "a4"], SUSTAIN,
     lambda n: group(n, SUSTAIN, [(0, V["u"])], breath=.12, tilt=None, seed=1)),
    ("aah", 0, ["a2", "d3", "g3", "c4", "f4", "a4"], SUSTAIN,
     lambda n: group(n, SUSTAIN, [(0, V["a"])], breath=.08, tilt=None, seed=2)),
    ("doo-wah", 0, ["a2", "d3", "g3", "c4", "f4", "a4"], .9,
     lambda n: group(n, .9, [(0, V["d"]), (.035, V["u"]), (.9, V["u"])], attack=.012, timing=.008, breath=.1, tilt=None, seed=3,
                     scoop=-20) * envelope(.9, .004, .45, .4)),
    ("doo-wah", 1, ["a2", "d3", "g3", "c4", "f4", "a4"], .9,
     lambda n: group(n, .9, [(0, V["w"]), (.03, V["u"]), (.16, V["a"]), (.9, V["a"])], attack=.02, timing=.008, breath=.08, tilt=None, seed=4,
                     scoop=-25) * envelope(.9, .004, .5, .38)),
    ("bass-bom", 0, ["e1", "a1", "d2", "g2", "c3"], 1.2,
     lambda n: room(singer(hz(n), 1.2, [(0, V["m"]), (.03, V["o"]), (.2, V["o"]), (.32, V["m"]), (1.2, V["m"])],
                           np.random.default_rng(midi(n)), scale=.92, vibrato=(5, 8, .5), scoop=-15, breath=.04, tilt=None)
                    * envelope(1.2, .01, .7, .5))),
    ("falsetto", 0, ["c4", "f4", "a4", "d5", "g5"], SUSTAIN,
     lambda n: room(singer(hz(n), SUSTAIN, [(0, FALSETTO["u"])], np.random.default_rng(midi(n) + 7), vibrato=(5.9, 28, .25),
                           scoop=-40, open_quotient=.75, breath=.16, tilt=None) * envelope(SUSTAIN, .06))),
]


def render(name, x, level=.2, fade=.12):
    n = int(fade * SR)
    x = x.copy()
    x[-n:] *= np.cos(np.linspace(0, np.pi / 2, n)) ** 2
    x = sg.resample_poly(x, RATE, SR)
    x = x * level / (np.sqrt(np.mean(x[:int(.5 * RATE)] ** 2)) + 1e-9)
    x = x * min(1.0, .95 / np.abs(x).max())
    wav = OUT / (name + ".wav")
    sf.write(wav, x, RATE, subtype="PCM_16")
    run = lambda *args: subprocess.run([os.environ.get("FFMPEG_BINARY", "ffmpeg"), "-nostdin", "-loglevel", "error", "-y", "-i", str(wav), "-map_metadata", "-1", *args], check=True)
    run("-c:a", "libopus", "-b:a", "64k", "-vbr", "on", "-application", "audio", str(wav.with_suffix(".ogg")))
    run("-c:a", "aac", "-b:a", "80k", "-movflags", "+faststart", str(wav.with_suffix(".m4a")))
    wav.unlink()
    return {"file": name + ".ogg", "seconds": round(len(x) / RATE, 2),
            "sha256": hashlib.sha256(wav.with_suffix(".ogg").read_bytes()).hexdigest(),
            "sha256M4a": hashlib.sha256(wav.with_suffix(".m4a").read_bytes()).hexdigest()}


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    recordings = []
    for asset, variant, notes, seconds, make in ASSETS:
        for note in notes:
            entry = render("{}-{}-{}".format(asset, variant, note.replace("#", "s")), make(note))
            recordings.append({"asset": asset, "variant": variant, "note": note, **entry})
            print(entry["file"], entry["seconds"])
    manifest = {"license": "CC0-1.0", "generator": "scripts/generate-vocal-group.py", "recordings": recordings}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    total = sum((OUT / r["file"]).stat().st_size for r in recordings)
    print("{} files, {:.0f} kB Opus".format(len(recordings), total / 1000))
