"""Prepare the recorded Pátio percussion bank (chicken-patio-v1) from CC0 recordings.

Run: python3 scripts/prepare-patio-recordings.py   (requires ffmpeg and numpy), then
     node scripts/encode-samples.mjs public/samples/chicken-patio-v1
Source: Versilian Community Sample Library (CC0-1.0) at the immutable revision below; the
manifest.json written next to the samples records each source path, URL and SHA-256.
Kit instruments (clap, side stick, rim shot, hi-hat, triangle, cowbell, cabasa, clave,
woodblock, ganza) are the recordings trimmed and filtered. The zabumba heads are the concert
bass drum raised a fifth and damped; the bacalhau is a muted frame drum stick dried out; the
pandeiro thumb is a frame drum hand stroke and the platinelas are tambourine jingles.
Pass asset stems to prepare only those: python3 scripts/prepare-patio-recordings.py clap-0
"""
import hashlib
import json
import pathlib
import subprocess
import sys
import urllib.parse
import urllib.request

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / "public/samples/chicken-patio-v1"
REVISION = "c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e"
VCSL = f"https://raw.githubusercontent.com/sgossner/VCSL/{REVISION}/"
RATE = 24000
ID = "Idiophones/Struck Idiophones/"
ME = "Membranophones/Struck Membranophones/"
SNARE2 = ME + "Snare Drum, Modern 2/"
SNARE3 = ME + "Snare Drum, Modern 3/"
TRI = ID + "Triangles/"
BD = ME + "Bass Drum 1/BDrumNew_hit_v5_rr1_Sum.wav"
FRAME = ME + "Frame Drum/"
SHAKER = ID + "Shaker, Small/"

# stem: (source, semitones, seconds kept, extra decay time constant or None, highpass Hz, lowpass Hz, peak)
ASSETS = {
    "clap-0": (ID + "Claps/Clap_rr1.wav", 0, .25, None, 250, 12000, .9),
    "clap-1": (ID + "Claps/Clap_rr2.wav", 0, .25, None, 250, 12000, .9),
    "sidestick-0": (SNARE2 + "Snare3M_Xstick_v2_rr1_Mid.wav", 0, .18, None, 200, 12000, .9),
    "sidestick-1": (SNARE2 + "Snare3M_Xstick_v2_rr2_Mid.wav", 0, .18, None, 200, 12000, .9),
    "rimshot-0": (SNARE3 + "Snare4_rimshot_v2_rr1_Mid.wav", 0, .3, None, 120, 12000, .9),
    "rimshot-1": (SNARE3 + "Snare4_rimshot_v2_rr2_Mid.wav", 0, .3, None, 120, 12000, .9),
    "hat-foot-0": (ID + "Hi-Hat Cymbal/HiHat_Close_rr1_Mid.wav", 0, .15, None, 500, 12000, .9),
    "hat-foot-1": (ID + "Hi-Hat Cymbal/HiHat_Close_rr2_Mid.wav", 0, .15, None, 500, 12000, .9),
    "triangle-open-0": (TRI + "Triangle1_Hit_v2_rr1_Mid.wav", 0, .9, .3, 1500, 12000, .9),
    "triangle-closed-0": (TRI + "Triangle1_HitM_v1_rr2_Mid.wav", 0, .12, .035, 1500, 12000, .9),
    "triangle-closed-1": (TRI + "Triangle1_HitM_v1_rr4_Mid.wav", 0, .12, .035, 1500, 12000, .9),
    "cowbell-0": (ID + "Cowbells/Cowbell1_Normal_v3_rr1_Mid.wav", 0, .35, .12, 100, 12000, .9),
    "cowbell-muted-0": (ID + "Cowbells/Cowbell1_Muted_v3_rr1_Mid.wav", 0, .15, None, 100, 12000, .9),
    "cabasa-0": (ID + "Cabasa/Cabasa1_Hit_rr1_Mid.wav", 0, .14, None, 1500, 12000, .9),
    "cabasa-1": (ID + "Cabasa/Cabasa1_Hit_rr2_Mid.wav", 0, .14, None, 1500, 12000, .9),
    "clave-0": (ID + "Claves/Claves1_Hit_v2_rr1_Mid.wav", 0, .15, None, 300, 12000, .9),
    "woodblock-0": (ID + "Woodblock/wood_click_f_rr1.wav", 0, .12, None, 200, 12000, .9),
    "ganza-0": (SHAKER + "Mid_ShakerHighFaster_Down_rr1.wav", 0, .16, None, 2000, 12000, .9),
    "ganza-1": (SHAKER + "Mid_ShakerHighFaster_Up_rr1.wav", 0, .16, None, 2000, 12000, .9),
    "zabumba-0": (BD, 7, .4, .11, 40, 3500, .9),
    "zabumba-aberta-0": (BD, 7, .7, .25, 40, 3500, .9),
    "bacalhau-0": (FRAME + "HDrumS_HitMuted_v3_rr1_Sum.wav", 7, .09, .025, 400, 12000, .9),
    "pandeiro-grave-0": (FRAME + "HDrumS_Hand_v1_rr1_Sum.wav", 3, .3, .1, 60, 12000, .9),
    "platinela-0": (ID + "Tambourine 2/Tamb2_Shake_rr3_Mid.wav", 0, .14, .05, 2500, 12000, .9),
    "platinela-1": (ID + "Tambourine 2/Tamb2_Shake_rr4_Mid.wav", 0, .14, .05, 2500, 12000, .9),
}


def decode(data, semitones):
    """Mono PCM at RATE; raising the playback rate tunes the sound up (and shortens it)."""
    ratio = 2 ** (semitones / 12)
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-ac", "1",
                          "-af", f"aresample=44100,asetrate=44100*{ratio},aresample={RATE}", "-f", "s16le", "-"],
                         input=data, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def filtered(x, highpass, lowpass):
    spectrum = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / RATE)
    gain = 1 / np.sqrt(1 + (highpass / np.maximum(freqs, 1)) ** 4) / np.sqrt(1 + (freqs / lowpass) ** 4)
    return np.fft.irfft(spectrum * gain, len(x))


def prepare(stem, source, semitones, seconds, decay, highpass, lowpass, peak):
    url = VCSL + urllib.parse.quote(source, safe="/")
    with urllib.request.urlopen(url, timeout=60) as response:
        data = response.read()
    x = filtered(decode(data, semitones), highpass, lowpass)
    onset = int(np.argmax(np.abs(x) > np.abs(x).max() * .05))
    x = x[max(0, onset - int(RATE * .002)):][:int(seconds * RATE)]
    t = np.arange(len(x)) / RATE
    if decay:
        x = x * np.exp(-t / decay)
    fade = min(len(x) // 6, int(RATE * .02))
    x[-fade:] *= np.linspace(1, 0, fade)
    x = x / np.abs(x).max() * peak
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "pipe:0",
                    str(DEST / f"{stem}.wav")], input=pcm, check=True)
    print(f"{stem}: {source} {semitones:+d} st, {len(x) / RATE:.2f} s")
    return {"file": f"{stem}.wav", "source": source, "url": url,
            "source_sha256": hashlib.sha256(data).hexdigest(), "semitones": semitones,
            "seconds": round(len(x) / RATE, 3)}


if __name__ == "__main__":
    DEST.mkdir(parents=True, exist_ok=True)
    chosen = set(sys.argv[1:])
    manifest_path = DEST / "manifest.json"
    done = {}
    if chosen and manifest_path.exists():
        done = {r["file"]: r for r in json.loads(manifest_path.read_text())["recordings"]}
    for stem, spec in ASSETS.items():
        if not chosen or stem in chosen:
            record = prepare(stem, *spec)
            done[record["file"]] = record
    order = [f"{s}.wav" for s in ASSETS]
    manifest = {"repository": "sgossner/VCSL", "revision": REVISION, "license": "CC0-1.0",
                "recordings": [done[f] for f in order if f in done]}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
