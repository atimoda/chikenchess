"""Prepare two compact, recorded CC0 banks. No commercial recording is sampled.

Run: python3 scripts/prepare-band-recordings.py
The immutable revision, original filenames and SHA256 hashes form provenance.
"""
import audioop
import concurrent.futures
import hashlib
import json
import pathlib
import struct
import urllib.parse
import urllib.request
import wave
import io

ROOT = pathlib.Path(__file__).resolve().parents[1]
REVISION = "c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e"
RATE = 24000
RECORDINGS = []


def add(bank, output, source, duration, peak=21000):
    RECORDINGS.append((bank, output, source, duration, peak))


for variant, velocity in enumerate((2, 4)):
    for note in ("c2", "c3", "c4", "c5"):
        add("chicken-band-v1", "piano-{}-{}.wav".format(variant, note),
            "Chordophones/Zithers/Grand Piano, Steinway B/NoSus/JHPiano_NoSus_Close_{}_vl{}_rr1.wav".format(note.upper(), velocity),
            1.8, 17000 if variant == 0 else 24000)
for variant, velocity in enumerate((2, 3)):
    for note in ("c3", "e3", "f#3", "c4", "e4", "f#4"):
        add("chicken-band-v1", "tenor-sax-{}-{}.wav".format(variant, note),
            "Aerophones/Reed Aerophones/Tenor Saxophone/Non-Vibrato/BrettTenor_NV_Main_{}_vl{}_rr1.wav".format(note.upper(), velocity),
            1.4, 17000 if variant == 0 else 23000)
for variant, dynamic in enumerate(("soft", "loud")):
    for note in ("c2", "c4", "c6"):
        add("chicken-band-v1", "marimba-{}-{}.wav".format(variant, note),
            "Idiophones/Struck Idiophones/Marimba/Marimba_hit_Outrigger_{}_{}_01.wav".format(note.upper(), dynamic),
            1.0, 17000 if variant == 0 else 23500)

M = "Membranophones/Struck Membranophones/"
I = "Idiophones/Struck Idiophones/"
for variant, rr in enumerate((1, 2)):
    for asset, source, duration, peak in (
        ("snare", M + "Snare Drum, Modern 1/Snare2_HitSN_v5_rr{}_Mid.wav".format(rr), .55, 23000),
        ("ghost-snare", M + "Snare Drum, Modern 1/Snare2_HitSN_v3_rr{}_Mid.wav".format(rr), .45, 13000),
        ("hat", I + "Hi-Hat Cymbal/HiHat_HitC_v2_rr{}_Mid.wav".format(rr), .28, 18000),
        ("open-hat", I + "Hi-Hat Cymbal/HiHat_HitO_rr{}_Mid.wav".format(rr), .85, 18500),
        ("tom", M + "Tom 1/Stick/TomH_HitS_v3_rr{}_Mid.wav".format(rr), .65, 20000),
        ("conga", M + "Conga/Conga_HitN_v2_rr{}_Sum.wav".format(rr), .48, 22000),
        ("muted-conga", M + "Conga/Conga_HitFM_v2_rr{}_Sum.wav".format(rr), .32, 18000),
        ("bongo", M + "Bongos/BongoH_Hit1_v2_rr{}_Mid.wav".format(rr), .38, 19000),
        ("shaker", I + "Shaker, Large/LShaker_Hit_rr{}_Mid.wav".format(rr), .32, 17000),
        ("tambourine", I + "Tambourine 1/Tamb1_Shake_rr{}_Mid.wav".format(rr), .42, 19000),
        ("cymbal-tip", I + "Suspended Cymbal {}/susCymb{}_hit_stick_{}1.wav".format(rr, rr, "mp"), 1.0, 18000),
        ("crash", I + "Suspended Cymbal {}/susCymb{}_hit_{}1.wav".format(rr, rr, "f"), 1.6, 20000),
    ):
        add("chicken-percussion-v1", "{}-{}.wav".format(asset, variant), source, duration, peak)


def prepare(recording):
    bank, output, source, duration, target_peak = recording[:5]
    repository, revision = recording[5:] if len(recording) == 7 else ("sgossner/VCSL", REVISION)
    url = "https://raw.githubusercontent.com/{}/{}/{}".format(repository, revision, urllib.parse.quote(source, safe="/"))
    with urllib.request.urlopen(url, timeout=45) as response:
        raw = response.read()
    decoded = bytearray(raw)
    if raw.startswith(b"fLaC"):
        import soundfile
        values, source_rate = soundfile.read(io.BytesIO(raw), dtype="int16", always_2d=True)
        stream = io.BytesIO()
        soundfile.write(stream, values, source_rate, format="WAV", subtype="PCM_16")
        decoded = bytearray(stream.getvalue())
    # Python <3.12 does not accept WAVE_FORMAT_EXTENSIBLE, even for integer
    # PCM. Validate its subtype before adapting the header for wave.open.
    cursor = 12
    while cursor + 8 <= len(decoded):
        size = struct.unpack_from("<I", decoded, cursor + 4)[0]
        if decoded[cursor:cursor + 4] == b"fmt " and struct.unpack_from("<H", decoded, cursor + 8)[0] == 65534:
            if size < 40 or decoded[cursor + 32:cursor + 48] != bytes.fromhex("0100000000001000800000aa00389b71"):
                raise ValueError("Extensible source is not integer PCM: " + source)
            struct.pack_into("<H", decoded, cursor + 8, 1)
        cursor += 8 + size + size % 2
    with wave.open(io.BytesIO(decoded), "rb") as recording:
        channels, width, source_rate, count, encoding, _ = recording.getparams()
        if encoding != "NONE" or channels not in (1, 2) or width not in (2, 3):
            raise ValueError("Unsupported PCM source: " + source)
        pcm = recording.readframes(count)
    if channels == 2:
        pcm = audioop.tomono(pcm, width, .5, .5)
    pcm, _ = audioop.ratecv(pcm, width, 1, source_rate, RATE, None)
    if width != 2:
        pcm = audioop.lin2lin(pcm, width, 2)
    values = list(struct.unpack("<{}h".format(len(pcm) // 2), pcm))
    threshold = max(70, max(map(abs, values)) * .006)
    onset = next((index for index, value in enumerate(values) if abs(value) >= threshold), 0)
    values = values[max(0, onset - int(RATE * .004)):][:int(duration * RATE)]
    # Preserve take/dynamic differences; do not compress or synthesize replacements.
    gain = min(4, target_peak / max(1, max(map(abs, values))))
    fade_in, fade_out = int(RATE * .002), int(RATE * .035)
    pcm = b"".join(struct.pack("<h", max(-32768, min(32767, round(value * gain * min(1, (index + 1) / fade_in, (len(values) - index) / fade_out))))) for index, value in enumerate(values))
    destination = ROOT / "public/samples" / bank / output
    destination.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(destination), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(pcm)
    print("{} / {}: {} bytes".format(bank, output, len(pcm)), flush=True)
    return {"bank": bank, "file": output, "source": source, "url": url, "source_sha256": hashlib.sha256(raw).hexdigest(),
            "output_sha256": hashlib.sha256(destination.read_bytes()).hexdigest(), "license": "CC0-1.0"}


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        manifest = list(pool.map(prepare, RECORDINGS))
    for bank in ("chicken-band-v1", "chicken-percussion-v1"):
        (ROOT / "public/samples" / bank / "manifest.json").write_text(json.dumps({"repository": "sgossner/VCSL", "revision": REVISION,
            "recordings": [entry for entry in manifest if entry["bank"] == bank]}, indent=2) + "\n")
