"""Prepare a compact CC0 sample bank for the Leipzig and Vienna campaigns.

Run: python3 scripts/prepare-classical-recordings.py
Sources: VCSL and VSCO 2 Community Edition. The repository revisions and
original paths below are the provenance manifest for every generated WAV.
"""
import audioop
import pathlib
import struct
import urllib.parse
import urllib.request
import wave

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / "public/samples/chicken-classical-v1"
RATE = 24000
SOURCE_REVISIONS = {
    "VCSL": "c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e",
    "VSCO": "440300901dfe9275fd84e0b7763af1f8443ae62e",
}
SOURCE_REPOSITORIES = {"VCSL": "VCSL", "VSCO": "VSCO-2-CE"}
RECORDINGS = []


def pitch(note):
    return note.upper()


def add_notes(asset, revision, notes, repository, path_for, duration, target_peak):
    for note in notes:
        source = path_for(pitch(note))
        output = "{}-{}-{}.wav".format(asset, revision, note)
        RECORDINGS.append((output, repository, source, duration, target_peak))


# Two recorded dynamics and a five-note map keep the solo violin natural over
# the lead's register. Short attacks are separately recorded with round robins.
for revision, dynamic, peak in (("piano", "p", 16000), ("forte", "f", 24500)):
    add_notes("violin-sustain", revision, ["g3", "c4", "e4", "g4", "c5"], "VSCO",
              lambda note: "Strings/Solo Violin/Arco Vib/LLVln_ArcoVib_{}_{}.wav".format(note, dynamic), 1.55, peak)
for rr in (1, 2):
    add_notes("violin-spiccato", "rr{}".format(rr), ["c3", "c4", "c5"], "VSCO",
              lambda note: "Strings/Solo Violin/spic/LLVln_spic_{}_v1_rr{}.wav".format(note, rr), .48, 21000)
for dynamic_name, dynamic in (("piano", "p"), ("forte", "f")):
    for rr in (1, 2):
        revision = "{}-rr{}".format(dynamic_name, rr)
        add_notes("violin-pizzicato", revision, ["a3", "c4", "e4", "c5"], "VSCO",
                  lambda note: "Strings/Solo Violin/Pizz/LLVln_Pizz_{}_{}_RR{}.wav".format(note, dynamic, rr), .62, 20500 if dynamic == "p" else 25000)

# The section cello has distinct warm/rich sustains plus two alternate attacks.
for revision, sample_revision in (("warm", 1), ("rich", 3)):
    add_notes("cello-sustain", revision, ["a2", "c3", "g3", "d4"], "VSCO",
              lambda note: "Strings/Cello Section/susvib/susvib_{}_v{}_1.wav".format(note, sample_revision), 1.65, 23000)
for asset, folder, stem in (("cello-spiccato", "spic", "spic"), ("cello-pizzicato", "pizzT", "pizzT")):
    for rr in (1, 2):
        add_notes(asset, "rr{}".format(rr), ["a2", "c3", "g3"], "VSCO",
                  lambda note: "Strings/Cello Section/{}/{}_{}_v1_RR{}.wav".format(folder, stem, note, rr), .58, 22000)

# Viola layers and two flute colors widen the Vienna orchestration.
for sample_revision in (1, 2):
    add_notes("viola-sustain", "v{}".format(sample_revision), ["c2", "c4", "e4", "g4"], "VSCO",
              lambda note: "Strings/Viola Section/susvib/ViolaEns_susvib_{}_v{}_1.wav".format(note, sample_revision), 1.55, 21500)
for sample_revision in (1, 3):
    add_notes("flute-sustain", "v{}".format(sample_revision), ["c3", "c4", "e4", "a4"], "VSCO",
              lambda note: "Woodwinds/Flute/susNV/LDFlute_susNV_{}_v{}_1.wav".format(note, sample_revision), 1.5, 22500)

# The alto recorder and Flemish harpsichord give the Leipzig arrangement a
# period-specific lead and continuo, with a short articulation for ornament.
for asset, folder, stem, duration, peak in (
    ("alto-recorder-sustain", "SusVib", "SusVib", 1.5, 22000),
    ("alto-recorder-staccato", "Staccato", "Stac", .34, 22000),
):
    add_notes(asset, "sus" if folder == "SusVib" else "stac", ["c4", "e4", "f#4", "a#4", "c5"], "VCSL",
              lambda note: "Aerophones/Edge-blown Aerophones/Baroque Alto Recorder/{}/AltRecorder_{}_{}_rr1_Main.wav".format(folder, stem, note), duration, peak)

# The low and high Flemish harpsichord registers use their own recorded maps.
add_notes("harpsichord", "low", ["c3", "d3", "e3", "f#3", "a#3", "c4", "d4", "e4", "f#4", "a#4", "c5"], "VCSL",
          lambda note: "Chordophones/Zithers/Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_{}_rr1.wav".format(note), 1.05, 19000)
for note in ["c#4", "d4", "e4", "f#4", "a#4", "c5", "d5"]:
    RECORDINGS.append(("harpsichord-high-{}.wav".format(note), "VCSL",
                       "Chordophones/Zithers/Harpsichord, Flemish/Sustains/High/HarpsiRH_High_Far_{}_rr1.wav".format(pitch(note)),
                       1.05, 19000))
# A3 is a separately recorded high-register anchor using its round-robin take.
RECORDINGS.append(("harpsichord-high-a3.wav", "VCSL",
                   "Chordophones/Zithers/Harpsichord, Flemish/Sustains/High/HarpsiRH_High_Far_A3_rr2.wav", 1.05, 19000))

# A restrained F-horn bed and two timpani registers add orchestral color.
for sample_revision in (1, 3):
    add_notes("horn-sustain", "v{}".format(sample_revision), ["a2", "c3", "d2", "f2"], "VSCO",
              lambda note: "Brass/F Horn/sus/MOHorn_sus_{}_v{}_1.wav".format(note, sample_revision), 1.5, 18000)
for asset, drum, peak in (("timpani-low", 1, 22000), ("timpani-high", 5, 19000)):
    for rr in (1, 2):
        output = "{}-rr{}.wav".format(asset, rr)
        source = "Percussion/Timpani/Timpani{}_Hit_v1_rr{}_Sum.wav".format(drum, rr)
        RECORDINGS.append((output, "VSCO", source, .95, peak))


def read_mono(path):
    with wave.open(str(path), "rb") as source:
        channels, width, source_rate, count, encoding, _ = source.getparams()
        if encoding != "NONE" or channels not in (1, 2) or width not in (2, 3):
            raise ValueError("Unsupported recording: {} {}".format(path.name, source.getparams()))
        pcm = source.readframes(count)
    if channels == 2:
        pcm = audioop.tomono(pcm, width, .5, .5)
    pcm, _ = audioop.ratecv(pcm, width, 1, source_rate, RATE, None)
    if width != 2:
        pcm = audioop.lin2lin(pcm, width, 2)
    return list(struct.unpack("<{}h".format(len(pcm) // 2), pcm))


def prepare(output, repository, source_path, duration, target_peak):
    url = "https://raw.githubusercontent.com/sgossner/{}/{}/{}".format(
        SOURCE_REPOSITORIES[repository], SOURCE_REVISIONS[repository], urllib.parse.quote(source_path, safe="/"))
    with urllib.request.urlopen(url, timeout=40) as response:
        source_data = response.read()
    source_file = DEST / "_source.wav"
    source_file.write_bytes(source_data)
    try:
        values = read_mono(source_file)
    finally:
        source_file.unlink()
    if not values:
        raise ValueError("Empty source recording: {}".format(source_path))

    source_peak = max(abs(value) for value in values) or 1
    threshold = max(90, source_peak * .008)
    onset = next((index for index in range(len(values) - 2)
                  if abs(values[index]) >= threshold and abs(values[index + 1]) >= threshold), 0)
    values = values[max(0, onset - int(RATE * .005)):][:int(duration * RATE)]
    peak = max(abs(value) for value in values) or 1
    gain = min(4.0, target_peak / float(peak))
    fade_in = max(1, int(RATE * .004))
    fade_out = min(int(RATE * .018), max(1, len(values) // 5))
    pcm = bytearray()
    for index, value in enumerate(values):
        edge = min(1.0, (index + 1) / float(fade_in), (len(values) - index) / float(fade_out))
        pcm.extend(struct.pack("<h", max(-32768, min(32767, int(round(value * gain * edge))))))
    destination = DEST / output
    with wave.open(str(destination), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(pcm)
    print("{}: {} → {} bytes".format(output, len(source_data), len(pcm)))


if __name__ == "__main__":
    DEST.mkdir(parents=True, exist_ok=True)
    for item in RECORDINGS:
        prepare(*item)
