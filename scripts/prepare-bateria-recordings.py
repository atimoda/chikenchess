"""Prepare the recorded escola de samba bateria bank (chicken-bateria-v1) from CC0 recordings.

Run: python3 scripts/prepare-bateria-recordings.py   (requires ffmpeg and numpy), then
     node scripts/encode-samples.mjs public/samples/chicken-bateria-v1
Source: Versilian Community Sample Library (CC0-1.0) at the immutable revision below; the
paths are the provenance manifest. No escola de samba recording is sampled.

None of these are the Brazilian instruments themselves, so each is tuned and shaped toward
one: the concert bass drum (felt mallet, a big shell like the surdo) is raised a fourth to
the surdo de primeira's ~60 Hz and cut to its ring, or damped by "the hand" for the
abafado; a stick on a small frame drum, raised an octave and dried out, is the tamborim
(a tamborim is a small frame drum played with a stick); tambourine jingles shaken in rows
are the chocalho de platinelas; a guiro is the reco-reco and a ball whistle the apito.

The surdo de marcação (heavy) layers the same bass drum with itself an octave up and
saturates the sum: the fundamental stays near 60 Hz and the added harmonics (120–1000 Hz)
keep the stroke loud and present on small speakers, where a bare 57 Hz ring disappears.
Pass asset names to prepare only those: python3 scripts/prepare-bateria-recordings.py surdo-marcacao
"""
import pathlib
import subprocess
import sys
import urllib.parse
import urllib.request

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / "public/samples/chicken-bateria-v1"
REVISION = "c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e"
VCSL = f"https://raw.githubusercontent.com/sgossner/VCSL/{REVISION}/"
RATE = 24000
BD = "Membranophones/Struck Membranophones/Bass Drum 2/"
FRAME = "Membranophones/Struck Membranophones/Frame Drum/"

# asset: (source, semitones, seconds kept, extra decay time constant or None, highpass Hz, lowpass Hz, peak)
ASSETS = {
    "surdo-primeira": (BD + "bassdrum_hit_ff.wav", 5, 1.4, .45, 30, 4000, .92),
    "surdo-primeira-leve": (BD + "bassdrum_hit_mf1.wav", 5, 1.1, .35, 30, 3500, .7),
    "surdo-mao": (BD + "bassdrum_hit_f.wav", 5, .3, .07, 35, 2500, .85),
    "surdo-terceira": ("Membranophones/Struck Membranophones/Bass Drum 1/BDrumNew_hit_v5_rr1_Sum.wav", 3, .6, .22, 45, 5000, .9),
    "caixa": ("Membranophones/Struck Membranophones/Snare Drum, Modern 2/Snare3M_HitSN_v4_rr1_Mid.wav", 3, .28, .09, 180, 12000, .9),
    "caixa-leve": ("Membranophones/Struck Membranophones/Snare Drum, Modern 2/Snare3M_HitSN_v2_rr1_Mid.wav", 3, .22, .07, 180, 12000, .55),
    "tamborim": (FRAME + "HDrumS_Hit_v3_rr1_Sum.wav", 14, .2, .045, 300, 12000, .92),
    "tamborim-abafado": (FRAME + "HDrumS_HitMuted_v3_rr1_Sum.wav", 10, .12, .03, 300, 11000, .8),
    "chocalho": ("Idiophones/Struck Idiophones/Tambourine 1/Tamb1_Shake_rr1_Mid.wav", 0, .22, .08, 2500, 12000, .85),
    "chocalho-acento": ("Idiophones/Struck Idiophones/Tambourine 1/Tamb1_Hit_v2_rr1_Mid.wav", 0, .25, .1, 2000, 12000, .9),
    "reco-reco": ("Idiophones/Struck Idiophones/Guiro/Guiro_Fast_rr1_Mid.wav", 2, .3, None, 1200, 11000, .85),
    "apito": ("Aerophones/Edge-blown Aerophones/Ball Whistle/Main_BallWhistle_Short-001.wav", 0, .45, None, 800, 11000, .8),
    "apito-longo": ("Aerophones/Edge-blown Aerophones/Ball Whistle/Main_BallWhistle_Long-001.wav", 0, 1.2, None, 800, 11000, .8),
}

# asset: (source, semitones, seconds kept, decay of the low layer, gain and decay of the octave layer, drive, peak)
STRONG = {
    "surdo-marcacao": (BD + "bassdrum_hit_ff.wav", 6, .95, .42, .6, .12, 2.6, .94),
    "surdo-marcacao-mao": (BD + "bassdrum_hit_ff.wav", 6, .32, .09, .7, .07, 2.6, .9),
}


def decode(data, semitones):
    """Mono PCM at RATE; raising the playback rate tunes the drum up (and shortens it, as a smaller head would)."""
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


def prepare(name, source, semitones, seconds, decay, highpass, lowpass, peak):
    with urllib.request.urlopen(VCSL + urllib.parse.quote(source, safe="/"), timeout=60) as response:
        data = response.read()
    x = filtered(decode(data, semitones), highpass, lowpass)
    onset = int(np.argmax(np.abs(x) > np.abs(x).max() * .05))
    x = x[max(0, onset - int(RATE * .002)):][:int(seconds * RATE)]
    t = np.arange(len(x)) / RATE
    if decay:
        x = x * np.exp(-t / decay)
    fade = min(len(x) // 6, int(RATE * .04))
    x[-fade:] *= np.linspace(1, 0, fade)
    x = x / np.abs(x).max() * peak
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "pipe:0",
                    str(DEST / f"{name}-0.wav")], input=pcm, check=True)
    print(f"{name}: {source} {semitones:+d} st, {len(x) / RATE:.2f} s")


def cut(x, seconds):
    onset = int(np.argmax(np.abs(x) > np.abs(x).max() * .05))
    x = x[max(0, onset - int(RATE * .002)):][:int(seconds * RATE)]
    return x / np.abs(x).max()


def prepare_strong(name, source, semitones, seconds, decay, octave_gain, octave_decay, drive, peak):
    with urllib.request.urlopen(VCSL + urllib.parse.quote(source, safe="/"), timeout=60) as response:
        data = response.read()
    low = cut(filtered(decode(data, semitones), 30, 4000), seconds)
    octave = cut(filtered(decode(data, semitones + 12), 60, 5000), seconds)
    size = min(len(low), len(octave))
    t = np.arange(size) / RATE
    x = low[:size] * np.exp(-t / decay) + octave_gain * octave[:size] * np.exp(-t / octave_decay)
    x = np.tanh(x / np.abs(x).max() * drive) / np.tanh(drive)
    x = filtered(x, 28, 6000)
    fade = min(len(x) // 6, int(RATE * .04))
    x[-fade:] *= np.linspace(1, 0, fade)
    x = x / np.abs(x).max() * peak
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "pipe:0",
                    str(DEST / f"{name}-0.wav")], input=pcm, check=True)
    print(f"{name}: {source} {semitones:+d} st with its octave, drive {drive}, {len(x) / RATE:.2f} s")


if __name__ == "__main__":
    DEST.mkdir(parents=True, exist_ok=True)
    chosen = set(sys.argv[1:])
    for name, spec in ASSETS.items():
        if not chosen or name in chosen:
            prepare(name, *spec)
    for name, spec in STRONG.items():
        if not chosen or name in chosen:
            prepare_strong(name, *spec)
