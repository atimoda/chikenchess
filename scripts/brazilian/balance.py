"""Balances part gains from measured stems: python3 scripts/brazilian/balance.py <stage> <stems.json> [--apply]

Each part gets a target active level (dBFS, mean power over its audible 100 ms windows,
measured by stems.cjs in the shipped renderer) from its job in the ensemble; the script
prints the correction and, with --apply, rewrites the part's first `gain=` in the stage
script so the composer keeps one source of truth. Rerun the stage and measure again:
reverb, filters and overlaps make one pass approximate. Targets are a mix decision, not
a substitute for listening.
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
# Target active level per job in the ensemble.
TARGETS = {
    'lead': -33.0,       # the tune (queen, voices, solo instruments)
    'bass': -33.5,       # bass line
    'harmony': -37.5,    # chord instruments
    'response': -38.0,   # counter-lines and answers
    'texture': -41.0,    # pads, drones, sung calls in the background
    'low': -33.0,        # surdos, zabumba, alfaias, bass drum, pandeiro thumb
    'mid': -39.0,        # tamborim, caixa, tarol, repique, palmas, slaps, cuíca
    'high': -44.0,       # jingles, shakers, ganzá, triangle, agogô, hats, cymbals
    'fill': -42.0,       # rolls into the sections
}
LOW = ('surdo', 'zabumba', 'alfaia', 'kick', 'pandeiro-grave', 'timbau')
HIGH = ('platinela', 'ganza', 'chocalho', 'shaker', 'triangulo', 'reco', 'agogo', 'hat', 'crash', 'cymbal', 'ride', 'pandeiro', 'gongue', 'cabasa', 'maracas', 'tambourine', 'cowbell', 'clave')


def job(part):
    asset = part['source'].get('asset', '')
    fills = part.get('arrangement', {}).get('fills')
    if fills and any(f is not None for f in fills):
        return 'fill'
    if part['role'] == 'rhythm':
        if any(key in asset for key in LOW) and asset not in ('pandeiro',):
            return 'low'
        if any(key in asset for key in HIGH):
            return 'high'
        return 'mid'
    return {'melody': 'lead', 'bass': 'bass', 'harmony': 'harmony', 'response': 'response', 'texture': 'texture'}[part['role']]


def main():
    stage, stems = sys.argv[1], json.loads(pathlib.Path(sys.argv[2]).read_text())
    overrides = json.loads(sys.argv[sys.argv.index('--targets') + 1]) if '--targets' in sys.argv else {}
    profile = json.loads((ROOT / 'data' / 'music' / 'profiles' / f'{stage}.json').read_text())
    slots = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e1', 'e2', 'f1', 'f2', 'g1', 'g2', 'h1', 'h2']
    measured = {item['key']: item for item in stems['results']}
    script = HERE / f'{stage}.py'
    text = script.read_text()
    for slot, part in zip(slots, profile['parts']):
        result = measured.get(f'w:{slot}')
        if not result or result['activeDb'] < -100:
            print(f'{slot} {part["name"]}: silent in the measurement, skipped')
            continue
        target = overrides.get(part['name'], TARGETS[job(part)])
        delta = target - result['activeDb']
        gain = part.get('gain', .18)
        new = max(.01, min(1.0, gain * 10 ** (delta / 20)))
        print(f'{slot} {part["name"]:<36} {job(part):<8} {result["activeDb"]:6.1f} → {target:6.1f} dB · gain {gain:.3g} → {new:.3g}')
        if '--apply' in sys.argv and abs(delta) > .5:
            at = text.index(f"'{part['name']}'")
            match = re.compile(r'gain=[0-9.]+').search(text, at)
            text = text[:match.start()] + f'gain={new:.3g}' + text[match.end():]
    mix = measured.get('mix')
    if mix:
        print(f'mix: active {mix["activeDb"]:.1f} dB · peak {mix["peakDb"]:.1f} dB')
    if '--apply' in sys.argv:
        script.write_text(text)


main()
