#!/usr/bin/env bash
# Measures stems for several stages, three at a time: scripts/brazilian/measure.sh <out-dir> <stage> [stage ...]
# Each stage writes <out-dir>/<stage>.json (for balance.py) and <out-dir>/<stage>.txt.
set -u
out=$1; shift
mkdir -p "$out"
here=$(cd "$(dirname "$0")/../.." && pwd)
printf '%s\n' "$@" | xargs -P 3 -I{} sh -c "node '$here/scripts/brazilian/stems.cjs' {} --json '$out/{}.json' > '$out/{}.txt' 2>&1"
