"""Compact CC0 hollowbody guitar and bass maps from Karoryfer recordings.

The guitar source uses a legacy octave convention: e3 is MIDI 40 (E2),
verified against Programs/modules/maps_green/ord.sfz, not guessed by filename.
"""
import concurrent.futures
import json
import pathlib
import runpy

ROOT = pathlib.Path(__file__).resolve().parents[1]
PREPARE = runpy.run_path(str(ROOT / "scripts/prepare-band-recordings.py"))["prepare"]
BANK = "chicken-guitars-v1"
GUITARS = ("sfzinstruments/karoryfer.black-and-green-guitars", "b3b3249d37dc977a1a297bd2dc053e6d9b6b805c")
BASS = ("sfzinstruments/karoryfer.big-little-bass", "4e92bdf54dcd2d6cfad968cc90542d5461c9b9fc")
RECORDINGS = []
for variant, rr in enumerate((1, 2)):
    for note, source_note in (("e2", "e3"), ("g2", "g3"), ("c3", "c4"), ("e3", "e4"), ("g3", "g4"), ("c4", "c5")):
        RECORDINGS.append((BANK, "clean-{}-{}.wav".format(variant, note),
            "Samples/green/ord/twang_{}_mf_rr{}.wav".format(source_note, rr), 1.5, 21000, *GUITARS))
        RECORDINGS.append((BANK, "muted-{}-{}.wav".format(variant, note),
            "Samples/green/stac/staccato_{}_rr{}.wav".format(source_note, rr), .45, 20000, *GUITARS))
    for note in ("c2", "e2", "g2", "c3"):
        RECORDINGS.append((BANK, "bass-{}-{}.wav".format(variant, note),
            "Samples/big_little_pluck_{}_f_rr{}.wav".format(note, rr), 1.25, 21500, *BASS))

if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        entries = list(pool.map(PREPARE, RECORDINGS))
    (ROOT / "public/samples" / BANK / "manifest.json").write_text(json.dumps({"sources": [GUITARS, BASS], "recordings": entries}, indent=2) + "\n")
