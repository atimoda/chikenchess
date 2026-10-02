"""CC0 nylon guitar, drum-kit kick and ride. Requires soundfile for source FLAC.

Run with a Python environment containing soundfile. Output is ordinary WAV;
no Python or FLAC decoder is used by the browser at playback time.
"""
import concurrent.futures
import json
import pathlib
import runpy

ROOT = pathlib.Path(__file__).resolve().parents[1]
PREPARE = runpy.run_path(str(ROOT / "scripts/prepare-band-recordings.py"))["prepare"]
NYLON = ("freepats/spanish-classical-guitar", "6f4eb1b092acc88f5448cea1a0001bd07b971af8")
DRUMS = ("sfzinstruments/virtuosity_drums", "9f04cf9a734527edfbb0a4eee1f674e45bbf71bc")
RECORDINGS = []
for note in ("e2", "g2", "c3", "e3", "g3", "c4"):
    RECORDINGS.append(("chicken-guitars-v1", "nylon-0-{}.wav".format(note), "samples/{}.flac".format(note.upper()), 1.6, 20500, *NYLON))
for variant, rr in enumerate((1, 2)):
    RECORDINGS.append(("chicken-percussion-v1", "kick-{}.wav".format(variant),
        "Samples/kickmic/kick/kickmic_kick_snoff_vl3_rr{}.flac".format(rr), .55, 23500, *DRUMS))
    RECORDINGS.append(("chicken-percussion-v1", "ride-{}.wav".format(variant),
        "Samples/oh/ride/oh_ride_ride_vl2_rr{}.flac".format(rr), 1.3, 20500, *DRUMS))

if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        entries = list(pool.map(PREPARE, RECORDINGS))
    for bank in ("chicken-guitars-v1", "chicken-percussion-v1"):
        (ROOT / "public/samples" / bank / "extras-manifest.json").write_text(json.dumps({"sources": [NYLON, DRUMS],
            "recordings": [entry for entry in entries if entry["bank"] == bank]}, indent=2) + "\n")
