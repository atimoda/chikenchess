"""Rewrites part gains in a city script: python3 regain.py <city> 'Part name=0.3' ...
Each part's first `gain=` after its name is replaced, so the composer keeps one source of truth."""
import pathlib
import re
import sys

path = pathlib.Path(__file__).with_name(f'{sys.argv[1]}.py')
text = path.read_text()
for item in sys.argv[2:]:
    name, value = item.rsplit('=', 1)
    at = text.index(f"'{name}'")
    match = re.compile(r'gain=[0-9.]+').search(text, at)
    text = text[:match.start()] + f'gain={float(value):g}' + text[match.end():]
path.write_text(text)
