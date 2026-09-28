"""Prepare short acoustic recordings for Salvador's sample bank.

Run: python3 scripts/prepare-samba-reggae-recordings.py
Sources: VSCO 2 CE, VCSL and plotzki's Samba Percussion (all CC0-1.0).
The input filenames below are also the provenance manifest. No Olodum audio is used.
"""
import audioop
import pathlib
import re
import struct
import subprocess
import urllib.parse
import urllib.request
import wave

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / "public/samples/chicken-samba-reggae-v2"
RATE = 24000
VCSL = "https://raw.githubusercontent.com/sgossner/VCSL/master/"
VSCO = "https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/"

# These are played as hits. Quinto remains an approximation for timbau.
PERCUSSION = {
    "caixa": ("VCSL", "Membranophones/Struck Membranophones/Snare Drum, Modern 1/Snare2_HitNS_v5_rr1_Mid.wav", .48),
    "tarol": ("VCSL", "Membranophones/Struck Membranophones/Snare Drum, Rope Tension/Hi/RopeSnare_hi_sn_Main_vl3_rr1.wav", .43),
    "timbau": ("VCSL", "Membranophones/Struck Membranophones/Conga/Quinto_HitN_v2_rr1_Sum.wav", .55),
    "agogo-grave": ("VCSL", "Idiophones/Struck Idiophones/Agogo Bells/Agogo_Low_v1_rr1_Mid.wav", .58),
    "agogo-agudo": ("VCSL", "Idiophones/Struck Idiophones/Agogo Bells/Agogo_High_v1_rr1_Mid.wav", .53),
    "chocalho": ("VCSL", "Idiophones/Struck Idiophones/Shaker, Large/LShaker_Shake1D_rr2_Mid.wav", .35),
}

# Sound IDs point to the author's own CC0 recordings. A single isolated attack
# is cut from each public HQ preview, not a loop copied into the arrangement.
# (sound ID, start in seconds, duration in seconds)
FREESOUND = {
    "surdo-fundo": (36127, 1.60, .80),
    "surdo-meio": (36110, .55, .72),
    "surdo-viradeira": (36110, 2.70, .50),
    "repinique": (36108, .38, .27),
    "pandeiro": (36116, .55, .48),
}

# Several real notes keep the brass in its recorded register instead of shifting
# one synthetic or acoustic note by a full octave.
BRASS = {
    "trompete-g3": ("VSCO", "Brass/Trumpet/stac/Sum_SHTrumpet_stac_G3_v2_rr1.wav", .80),
    "trompete-f4": ("VSCO", "Brass/Trumpet/stac/Sum_SHTrumpet_stac_F4_v2_rr1.wav", .80),
    "trompete-c5": ("VSCO", "Brass/Trumpet/stac/Sum_SHTrumpet_stac_C5_v2_rr1.wav", .80),
    "trombone-as2": ("VSCO", "Brass/Tenor Trombone/stac/tenortbn_stac_A#2_v3_rr1.wav", .85),
    "trombone-d3": ("VSCO", "Brass/Tenor Trombone/stac/tenortbn_stac_D3_v3_rr1.wav", .85),
    "trombone-f3": ("VSCO", "Brass/Tenor Trombone/stac/tenortbn_stac_F3_v3_rr1.wav", .85),
}


def prepare(name, repository, path, seconds, offset=0):
    cached = DEST / "_source.wav"
    if repository == "FREESOUND":
        page = f"https://freesound.org/people/plotzki/sounds/{path}/"
        with urllib.request.urlopen(page, timeout=30) as response:
            listing = response.read().decode()
        if "Creative Commons 0" not in listing:
            raise ValueError(f"CC0 license missing from {page}")
        match = re.search(r'https://cdn\.freesound\.org/previews/[^\"]+-hq\.mp3', listing)
        if not match:
            raise ValueError(f"HQ preview missing from {page}")
        with urllib.request.urlopen(match.group(0), timeout=30) as response:
            source = response.read()
        preview = DEST / "_source.mp3"
        preview.write_bytes(source)
        subprocess.run(["node", str(ROOT / "scripts/decode-samba-preview.mjs"), str(preview), str(cached)], check=True)
        preview.unlink()
    else:
        url = (VCSL if repository == "VCSL" else VSCO) + urllib.parse.quote(path, safe="/")
        with urllib.request.urlopen(url, timeout=30) as response:
            source = response.read()
        cached.write_bytes(source)
    with wave.open(str(cached), "rb") as input_file:
        channels, width, source_rate, count, encoding, _ = input_file.getparams()
        if encoding != "NONE" or channels not in (1, 2) or width not in (2, 3):
            raise ValueError(f"Unsupported acoustic WAV: {name} {input_file.getparams()}")
        pcm = input_file.readframes(count)
    cached.unlink()
    if channels == 2:
        pcm = audioop.tomono(pcm, width, .5, .5)
    pcm, _ = audioop.ratecv(pcm, width, 1, source_rate, RATE, None)
    if width != 2:
        pcm = audioop.lin2lin(pcm, width, 2)
    values = list(struct.unpack(f"<{len(pcm) // 2}h", pcm))
    if offset:
        values = values[round(offset * RATE):round((offset + seconds) * RATE)]
    peak = max(map(abs, values)) or 1
    threshold = max(120, peak * .025)
    onset = next((index for index, value in enumerate(values) if abs(value) >= threshold), 0)
    values = values[max(0, onset - int(RATE * .005)):][:round(seconds * RATE)]
    if not values:
        raise ValueError(f"Empty recording: {name}")
    peak = max(map(abs, values)) or 1
    gain = 25000 / peak
    tail = min(320, len(values) // 8)
    result = bytearray()
    for index, value in enumerate(values):
        edge = min(1, (index + 1) / 80, (len(values) - index) / tail)
        result.extend(struct.pack("<h", max(-32768, min(32767, round(value * gain * edge)))))
    with wave.open(str(DEST / f"{name}-0.wav"), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(result)
    print(name, len(source), "->", len(result))


if __name__ == "__main__":
    DEST.mkdir(parents=True, exist_ok=True)
    for name, (repository, path, seconds) in {**PERCUSSION, **BRASS}.items():
        prepare(name, repository, path, seconds)
    for name, (sound_id, offset, seconds) in FREESOUND.items():
        prepare(name, "FREESOUND", sound_id, seconds, offset)
