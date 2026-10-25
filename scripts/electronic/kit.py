"""Authoring helpers for the Electronic World style profiles (data/music/profiles/<city>.json).

Each city script composes 16 parts (white slots a1, a2, b1, b2 … h1, h2; black
mirrors them) with six variations that follow one shared plan:
  0 Intro · 1 Verse/groove · 2 Break · 3 Chorus/Drop · 4 Interlude · 5 Peak
Patterns are scale degrees on a 16th grid unless a part says otherwise;
'.' rests and the marks of lib/music/profile-tokens.ts add articulation:
  !  accent   '  ghost   ?70  chance   *2  ratchet   ~-12  slide from   _  legato   < >  pan
Run a city: python3 scripts/electronic/<city>.py   (writes the profile, then validate with
node scripts/electronic/check.cjs <city>).
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SLOTS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e1', 'e2', 'f1', 'f2', 'g1', 'g2', 'h1', 'h2']


def bar(text, steps=16):
    """One bar; asserts the step count so a typo cannot shift the groove."""
    tokens = text.split()
    assert len(tokens) == steps, (len(tokens), steps, text)
    return tokens


def bars(*items):
    """Join bars (lists of tokens or strings already checked)."""
    out = []
    for item in items:
        out.extend(item if isinstance(item, list) else item.split())
    return ' '.join(out)


def rep(text, times):
    return ' '.join([text] * times)


def drums(hits, steps=16):
    """'x' hit, 'X' accent, 'g' ghost, 'o' 70% chance, 'r' ratchet 2, '.' rest -> degree-0 tokens."""
    table = {'x': '0', 'X': '0!', 'g': "0'", 'o': '0?70', 'r': '0*2', 'R': '0*3', '.': '.'}
    compact = hits.replace(' ', '').replace('|', '')
    assert len(compact) % steps == 0, (len(compact), hits)
    return ' '.join(table[c] for c in compact)


def arrangement(active=(True,) * 6, variations=(0, 1, 2, 3, 4, 5), restart=True, fills=None, transpose=None):
    out = {'active': list(active), 'restart': restart, 'variations': list(variations), 'transpose': list(transpose or [0] * 6)}
    if fills:
        out['fills'] = list(fills)
    return out


def part(role, name, behavior, source, patterns, lengths, **extra):
    """lengths: bars per variation. Checks that every pattern divides into its bars."""
    patterns = [p if isinstance(p, str) else ' '.join(p) for p in patterns]
    assert 1 <= len(patterns) <= 8 and len(lengths) == len(patterns), (name, len(patterns), len(lengths))
    for pattern, length in zip(patterns, lengths):
        count = len(pattern.split())
        assert count % length == 0, (name, count, length, pattern[:60])
    entry = {'role': role, 'name': name, 'behavior': behavior, 'source': source, 'patterns': patterns, 'bars': list(lengths)}
    entry.update(extra)
    entry.setdefault('arrangement', arrangement())
    return entry


def sample(bank, asset, pitched, variant=0):
    return {'kind': 'sample', 'bank': bank, 'asset': asset, 'variant': variant, 'pitched': pitched}


def recorded(bank, asset, variant=0, pitched=True):
    """Recorded/multisampled banks: guitars, band, classical, percussion, keys, sambaReggae, synths…"""
    return sample(bank, asset, pitched, variant)


def machine(asset):
    return sample('machines', asset, False)


def electronic(asset, pitched=False):
    return sample('electronic', asset, pitched)


def synth(sound):
    return {'kind': 'synth', 'sound': sound}


def rule(rule_id, trigger, target, duration, quantize, actions, instruments=None):
    out = {'id': rule_id, 'trigger': trigger, 'enabled': True, 'quantize': quantize, 'target': target, 'duration': duration, 'actions': actions}
    if instruments:
        out['instruments'] = instruments
    return out


def act(kind, value=0, **extra):
    """Influence; scale/harmony defaults match the schema so the saved JSON stays canonical."""
    out = {'type': kind, 'value': value, 'scale': extra.pop('scale', 'Maior'), 'harmony': extra.pop('harmony', 'static')}
    out.update(extra)
    return out


def reactions(rules, thresholds=None):
    out = {'overrides': sorted({r['trigger'] for r in rules}), 'rules': rules}
    if thresholds:
        out['thresholds'] = thresholds
    return out


def write(city, profile):
    assert len(profile['parts']) == 16, len(profile['parts'])
    assert len(profile['sections']) == len(profile['sectionLabels'])
    path = ROOT / 'data' / 'music' / 'profiles' / f'{city}.json'
    path.write_text(json.dumps(profile, indent=2, ensure_ascii=False) + '\n')
    print('wrote', path.relative_to(ROOT))
