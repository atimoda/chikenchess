"""Prepare the recorded Bateria bank (chicken-drumkit-v1) from the CC0 Virtuosity Drums library.

Run: python3 scripts/prepare-drumkit-recordings.py   (requires ffmpeg and numpy), then
     node scripts/encode-samples.mjs public/samples/chicken-drumkit-v1
Source: Virtuosity Drums (Versilian Studios, CC0-1.0), sfzinstruments/virtuosity_drums at the immutable
revision below: a jazz club "house kit" played with sticks by Austin McMahon, recorded with six mics. Each
sample here is one stroke summed to mono from the mics a listener would hear it through (the kick and snare
close mics under the overheads; toms and cymbals from the overheads and the room), trimmed, faded and kept
at its own dynamic layer (soft, medium, hard), two takes each where the library has them. The pieces the
library lacks are made from its own strokes and written down here: Tom 2 is the high tom 4 semitones lower
(between the high and the low tom), the Splash is the crash raised 8 semitones and damped, and the China is
the sizzle crash lowered 2 semitones and clipped (the upturned edge's dirt). The manifest.json written next
to the samples records each source path, URL and SHA-256.
Pass asset stems to prepare only those: python3 scripts/prepare-drumkit-recordings.py kick-2-0
"""
import concurrent.futures
import hashlib
import json
import pathlib
import subprocess
import sys
import urllib.parse
import urllib.request

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / "public/samples/chicken-drumkit-v1"
REPOSITORY = "sfzinstruments/virtuosity_drums"
REVISION = "9f04cf9a734527edfbb0a4eee1f674e45bbf71bc"
BASE = f"https://raw.githubusercontent.com/{REPOSITORY}/{REVISION}/Samples/"
RATE = 32000

# the mics each kind of piece is heard through, with their level in the mono sum
KICK = (("kickmic", 1), ("oh", .55), ("room", .3))
SNARE = (("snaremic", 1), ("oh", .55), ("room", .3))
TOMS = (("oh", 1), ("mid", .5), ("room", .35))
HATS = (("oh", 1), ("snaremic", .25), ("room", .25))
CYMBALS = (("oh", 1), ("room", .35))

# layer: 0 soft, 1 medium, 2 hard (each layer peaks at LEVEL[layer] of full scale: a softer stroke is softer and
# darker, as recorded, but never so soft the game cannot be heard)
LEVEL = (.42, .66, .92)


def asset(stem, mics, name, semitones=0, seconds=1.0, decay=None, layer=2, drive=0.0, highpass=30):
    return stem, {"mics": mics, "name": name, "semitones": semitones, "seconds": seconds, "decay": decay,
                  "layer": layer, "drive": drive, "highpass": highpass}


def layers(piece, mics, folder, art, picks, **kw):
    """picks: per layer, the source names of its takes (vl/rr suffixes)."""
    out = []
    for layer, takes in enumerate(picks):
        if takes is None:
            continue
        for take, suffix in enumerate(takes):
            out.append(asset(f"{piece}-{layer}-{take}", mics, f"{folder}/{{mic}}_{folder}_{art}_{suffix}", layer=layer, **kw))
    return out


ASSETS = dict([
    *layers("kick", KICK, "kick", "snoff", (("vl2_rr1", "vl2_rr2"), ("vl3_rr1", "vl3_rr2"), ("vl4_rr1", "vl4_rr2")), seconds=.7, decay=.25),
    *layers("snare", SNARE, "snare", "center", (("vl13", "vl14"), ("vl24", "vl25"), ("vl34", "vl35")), seconds=.7, decay=.3),
    *layers("tom1", TOMS, "htom", "center", (("vl5", "vl6"), ("vl10", "vl11"), ("vl15", "vl16")), seconds=1.1, decay=.45),
    *layers("tom2", TOMS, "htom", "center", (("vl5", "vl6"), ("vl10", "vl11"), ("vl15", "vl16")), semitones=-4, seconds=1.2, decay=.5),
    *layers("floor", TOMS, "ltom", "center", (("vl5", "vl6"), ("vl10", "vl11"), ("vl15", "vl16")), seconds=1.4, decay=.6),
    *layers("hat", HATS, "hh", "closed", (("vl2_rr1", "vl2_rr2"), ("vl3_rr1", "vl3_rr2"), ("vl4_rr1", "vl4_rr2")), seconds=.35, highpass=250),
    # the open Chimbal, by how far the pedal is open: half, three quarters, wide (one layer each, two takes)
    *layers("hat-half", HATS, "hh", "half", (None, None, ("vl3_rr1", "vl3_rr2")), seconds=1.2, decay=.5, highpass=250),
    *layers("hat-34", HATS, "hh", "34", (None, None, ("vl3_rr1", "vl3_rr2")), seconds=1.6, decay=.7, highpass=250),
    *layers("hat-open", HATS, "hh", "open", (None, None, ("vl3_rr1", "vl3_rr2")), seconds=2.2, decay=1.0, highpass=250),
    *layers("ride", CYMBALS, "ride", "ride", (None, ("vl2_rr1", "vl2_rr2"), ("vl3_rr1", "vl3_rr2")), seconds=2.6, decay=1.2, highpass=120),
    *layers("bell", CYMBALS, "ride", "bell", (None, ("vl2_rr1", "vl2_rr2"), ("vl3_rr1", "vl3_rr2")), seconds=2.4, decay=1.1, highpass=150),
    *layers("crash", CYMBALS, "crash", "crash", (None, ("vl2_rr1", "vl2_rr2"), ("vl3_rr1", "vl3_rr2")), seconds=3.2, decay=1.4, highpass=120),
    *layers("splash", CYMBALS, "crash", "crash", (None, None, ("vl2_rr3", "vl3_rr3")), semitones=8, seconds=1.1, decay=.35, highpass=300),
    *layers("china", CYMBALS, "crash", "sizzle", (None, None, ("vl3_rr1", "vl3_rr2")), semitones=-2, seconds=2.6, decay=1.0, drive=2.4, highpass=200),
])


def fetch(path):
    url = BASE + urllib.parse.quote(path, safe="/")
    with urllib.request.urlopen(url, timeout=120) as response:
        return url, response.read()


def decode(data, semitones):
    """Mono PCM at RATE; raising the playback rate tunes the sound up (and shortens it)."""
    ratio = 2 ** (semitones / 12)
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-ac", "1",
                          "-af", f"aresample=48000,asetrate=48000*{ratio},aresample={RATE}", "-f", "s16le", "-"],
                         input=data, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def highpassed(x, hz):
    spectrum = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / RATE)
    return np.fft.irfft(spectrum / np.sqrt(1 + (hz / np.maximum(freqs, 1)) ** 4), len(x))


def prepare(stem, spec):
    sources, mixed = [], None
    for mic, gain in spec["mics"]:
        path = spec["name"].format(mic=mic) + ".flac"
        url, data = fetch(f"{mic}/{path}")
        x = decode(data, spec["semitones"]) * gain
        mixed = x if mixed is None else mixed[:len(x)] + x[:len(mixed)]
        sources.append({"source": f"Samples/{mic}/{path}", "url": url, "sha256": hashlib.sha256(data).hexdigest(), "gain": gain})
    x = highpassed(mixed, spec["highpass"])
    # from just before the stroke (the mics share one clock, so the sum keeps its attack)
    onset = int(np.argmax(np.abs(x) > np.abs(x).max() * .05))
    x = x[max(0, onset - int(RATE * .003)):][:int(spec["seconds"] * RATE)]
    if spec["drive"]:
        x = np.tanh(x / np.abs(x).max() * spec["drive"])
    t = np.arange(len(x)) / RATE
    if spec["decay"]:
        # the recording's own decay, shortened toward the end so the cut is never heard
        x = x * np.where(t < spec["seconds"] * .35, 1, np.exp(-(t - spec["seconds"] * .35) / spec["decay"]))
    fade = min(len(x) // 4, int(RATE * .12))
    x[-fade:] *= np.linspace(1, 0, fade) ** 2
    return stem, x, sources


def write(stem, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "pipe:0",
                    str(DEST / f"{stem}.wav")], input=pcm, check=True)


if __name__ == "__main__":
    DEST.mkdir(parents=True, exist_ok=True)
    chosen = set(sys.argv[1:])
    manifest_path = DEST / "manifest.json"
    done = {}
    if chosen and manifest_path.exists():
        done = {r["file"]: r for r in json.loads(manifest_path.read_text())["recordings"]}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        prepared = list(pool.map(lambda item: prepare(*item), [(s, a) for s, a in ASSETS.items() if not chosen or s in chosen]))
    # each take peaks at its layer's LEVEL: the softer layers keep their own recorded colour (darker, less crack)
    # a little lower, so the dynamics stay in the game's audible range
    for stem, x, sources in prepared:
        spec = ASSETS[stem]
        x = x / np.abs(x).max() * LEVEL[spec["layer"]]
        write(stem, x)
        print(f"{stem}: {spec['name'].format(mic='*')} {spec['semitones']:+d} st, {len(x) / RATE:.2f} s")
        done[f"{stem}.wav"] = {"file": f"{stem}.wav", "sources": sources, "semitones": spec["semitones"],
                               "layer": spec["layer"], "seconds": round(len(x) / RATE, 3)}
    order = [f"{s}.wav" for s in ASSETS]
    manifest = {"repository": REPOSITORY, "revision": REVISION, "license": "CC0-1.0",
                "recordings": [done[f] for f in order if f in done]}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
