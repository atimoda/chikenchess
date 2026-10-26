"""Authoring helpers for the Brazilian campaign profiles (data/music/profiles/<stage>.json).

Builds on scripts/electronic/kit.py (same token marks, parts, rules and writer) and adds
what the Brazilian kits need: bars of any length (2/4 bars are 8 sixteenths), chords
and bass lines written from a progression, and the chicken-brasil-v1 bank.
Every part carries six patterns, one per section of the shared plan:
  0 Intro · 1 Verse (A) · 2 Break / Interlude · 3 Chorus (B) · 4 Interlude / Solo · 5 Peak
Run a stage: python3 scripts/brazilian/<stage>.py, then node scripts/electronic/check.cjs <stage>.
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'electronic'))
import kit  # noqa: E402
from kit import act, arrangement, bar, bars, machine, part, reactions, recorded, rep, rule, sample, synth  # noqa: E402,F401

HITS = {'x': '', 'X': '!', 'g': "'", 'o': '?70', 'h': '?40', 'r': '*2', 'R': '*3'}


def hits(pattern, token='0', steps=None):
    """'x' hit, 'X' accent, 'g' ghost, 'o' 70% / 'h' 40% chance, 'r'/'R' ratchet, '.' rest -> tokens of `token`."""
    compact = pattern.replace(' ', '').replace('|', '')
    if steps:
        assert len(compact) % steps == 0, (len(compact), steps, pattern)
    return ' '.join('.' if c == '.' else token + HITS[c] for c in compact)


def silent(steps):
    return ' '.join(['.'] * steps)


def over(chords, fn):
    """Apply fn(chord) to each chord of a progression and join the bars."""
    return bars(*(fn(chord) for chord in chords))


def comp(chord, rhythm):
    """A chord (token like '0,2,4') played on the rhythm's hits."""
    return hits(rhythm, chord)


def line(text, steps):
    """A melodic bar written as tokens; asserts the step count."""
    return ' '.join(bar(text, steps))


def brasil(asset, pitched=False):
    return sample('brasil', asset, pitched)


def bateria(asset):
    """Recorded escola de samba bank (chicken-bateria-v1): surdos, caixa, tamborim, chocalho, reco-reco, apito."""
    return sample('bateria', asset, False)


def samba(asset, pitched=False):
    """Recorded Salvador bank (surdos, caixa, tarol, repinique, timbau, agogôs, chocalho, pandeiro, metais)."""
    return sample('sambaReggae', asset, pitched)


def lasting_safe(rules):
    """Phase states last many moves: they must never force a variation (the silent-kit bug of PR #79)."""
    lasting = {'opening', 'middle', 'captureDrought', 'tension', 'advantage', 'oppositeCastling'}
    for item in rules:
        assert not (item['trigger'] in lasting and any(a['type'] == 'variation' for a in item['actions'])), item['id']
    return rules


def shift(text, amount):
    """Move every degree of a token line by `amount` scale steps (thirds, octaves), keeping the marks."""
    out = []
    for token in text.split():
        match = re.match(r'^(-?\d+(?:,-?\d+)*)(.*)$', token)
        out.append(token if not match else ','.join(str(int(d) + amount) for d in match.group(1).split(',')) + match.group(2))
    return ' '.join(out)


# Winds, voices, strings, pads and the sanfona sing through the rests a phrase writes as dots.
SUSTAINING = {'flute-sustain', 'viola-sustain', 'coro-laia', 'analog-pad', 'tenor-sax', 'trompete', 'trombone', 'sanfona'}


def held(pattern, bar_count):
    """Ties every note to the next one (legato `_`), at most one bar: a longer rest gets a
    silent 0%-chance note one bar later, which ends the held note there."""
    tokens = pattern.split()
    per = len(tokens) // bar_count
    notes = [i for i, token in enumerate(tokens) if token != '.']
    out = list(tokens)
    for at, following in zip(notes, notes[1:] + [None]):
        if '_' not in out[at]:
            out[at] += '_'
        end = following if following is not None else len(tokens)
        if end - at > per and at + per < len(tokens):
            out[at + per] = re.match(r'^-?\d+', tokens[at]).group(0) + '?0'
    return ' '.join(out)


def write(city, profile):
    """Writes the profile; sustaining parts (gate 0.75 or more) hold their notes, the rest stay as gated."""
    for entry in profile['parts']:
        if entry['source'].get('asset') in SUSTAINING and entry.get('gate', 0) >= .75:
            entry['patterns'] = [held(pattern, count) for pattern, count in zip(entry['patterns'], entry['bars'])]
    kit.write(city, profile)
