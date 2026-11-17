#!/usr/bin/env python3
"""Prepares the real bird songs of the Guia de pássaros (lib/pigchicken/bird-guide.ts).

For each bird of BIRDS below it asks xeno-canto.org for its best recordings (quality A, then B), keeps the ones that
may be cut and shared (no "no derivatives" licence) and have no other species singing, picks up to SONGS songs and
CALLS calls from different recordists, cuts the loudest stretch of each, cleans and levels it, and writes

  public/samples/birds-v1/<bird>-<n>.ogg (Opus) and .m4a (AAC), mono
  data/pigchicken/bird-songs.json: every clip with its recordist, catalogue number, licence and link (the credits)

Most of xeno-canto is CC BY-NC-SA: these clips are for non-commercial use, and each one keeps its licence in the
manifest. A commercial release has to drop the NC ones (the manifest says which).

Usage: python3 scripts/prepare-bird-songs.py [--only id,id] [--cache DIR]     (needs ffmpeg and numpy)
Running it again keeps the clips a bird already has in the manifest unless --only names it.
"""
import argparse, html, json, os, re, subprocess, sys, time, urllib.parse, urllib.request
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'samples', 'birds-v1')
MANIFEST = os.path.join(ROOT, 'data', 'pigchicken', 'bird-songs.json')
AGENT = 'bird-guide-builder/1.0'
SONGS, CALLS = 3, 1
SONG_S, CALL_S = 7.0, 4.0  # the longest cut of each kind
RATE = 22050  # the rate the stretch is chosen at

# the guide's id of each bird and the name xeno-canto knows it by (keep in step with lib/pigchicken/bird-guide.ts)
BIRDS = {
    'turdus-rufiventris': 'Turdus rufiventris',
    'pitangus-sulphuratus': 'Pitangus sulphuratus',
    'passer-domesticus': 'Passer domesticus',
    'sicalis-flaveola': 'Sicalis flaveola',
    'athene-cunicularia': 'Athene cunicularia',
    'eupetomena-macroura': 'Eupetomena macroura',
    'furnarius-rufus': 'Furnarius rufus',
    'vanellus-chilensis': 'Vanellus chilensis',
    'zonotrichia-capensis': 'Zonotrichia capensis',
    'thraupis-sayaca': 'Thraupis sayaca',
    'columbina-talpacoti': 'Columbina talpacoti',
    'crotophaga-ani': 'Crotophaga ani',
    'troglodytes-musculus': 'Troglodytes aedon musculus',  # xeno-canto still keeps it under the House Wren
    'colaptes-campestris': 'Colaptes campestris',
    'rupornis-magnirostris': 'Rupornis magnirostris',
    'coragyps-atratus': 'Coragyps atratus',
    'ramphastos-toco': 'Ramphastos toco',
    'pionus-maximiliani': 'Pionus maximiliani',
    'pygochelidon-cyanoleuca': 'Pygochelidon cyanoleuca',
    'ardea-alba': 'Ardea alba',
    'nyctibius-griseus': 'Nyctibius griseus',
    'procnias-nudicollis': 'Procnias nudicollis',
    'cyphorhinus-arada': 'Cyphorhinus arada',
    'tangara-seledon': 'Tangara seledon',
    'cariama-cristata': 'Cariama cristata',
    'gallus-gallus': 'Gallus gallus',
    'tyto-furcata': 'Tyto furcata',
    'caracara-plancus': 'Caracara plancus',
    'nyctidromus-albicollis': 'Nyctidromus albicollis',
    'mimus-saturninus': 'Mimus saturninus',
}


def fetch(url, binary=False, tries=3):
    for k in range(tries):
        try:
            req = urllib.request.Request(urllib.parse.quote(url, safe=':/?&=%+~,;@'), headers={'User-Agent': AGENT})  # (a file's name may have accents)
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            return data if binary else data.decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            if k == tries - 1:
                raise
            time.sleep(2 * (k + 1))
            print('  retry', url, e, file=sys.stderr)


def text(cell):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', cell))).strip()


def search(sci, quality):
    """the recordings of one page of results, best first as xeno-canto lists them"""
    q = urllib.parse.quote_plus(f'{sci} q:{quality} len:4-60')
    page = fetch(f'https://xeno-canto.org/explore?query={q}')
    rows = []
    for row in re.findall(r'<tr\s*>(.*?)</tr>', page, flags=re.S):
        if 'xc-mini-player' not in row:
            continue
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, flags=re.S)
        src = re.search(r"<audio[^>]*src='([^']+)'", row)
        xc = re.search(r'xeno-canto\.org/(\d+)/download', row)
        lic = re.search(r'creativecommons\.org/(licenses|publicdomain)/([a-z-]+)/([0-9.]+)', row)
        name = re.search(r"<span class='sci-name'>([^<]+)</span>", row)
        if not (src and xc and lic and name and len(cells) >= 10):
            continue
        m, s = text(cells[2]).split(':')[-2:]
        rows.append({
            'xc': int(xc.group(1)), 'src': src.group(1), 'sci': text(name.group(1)), 'seconds': int(m) * 60 + int(s),
            'by': text(cells[3]), 'country': text(cells[6]), 'type': text(cells[9]).lower(), 'also': '[also]' in row,
            'license': ('CC0 ' if lic.group(2) == 'zero' else 'CC ' + lic.group(2).upper() + ' ') + lic.group(3),
            'licenseUrl': f'https://creativecommons.org/{lic.group(1)}/{lic.group(2)}/{lic.group(3)}/',
        })
    return rows


def choose(sci):
    seen, rows = set(), []
    for quality in ('A', 'B'):
        for r in search(sci, quality):
            if r['xc'] in seen or not r['sci'].lower().startswith(sci.lower()) or '-nd' in r['licenseUrl'] or r['also']:
                continue
            seen.add(r['xc']); rows.append(r)
        time.sleep(1)
        if len(rows) >= 12:
            break
    is_song = lambda r: 'song' in r['type'] or 'duet' in r['type'] or 'drumming' in r['type']  # noqa: E731
    picked, people = [], set()

    def take(pool, kind, n):
        for fresh in (True, False):  # different recordists first
            for r in pool:
                if n <= 0:
                    return
                if r in picked or (fresh and r['by'] in people):
                    continue
                picked.append({**r, 'kind': kind}); people.add(r['by']); n -= 1

    take([r for r in rows if is_song(r)], 'song', SONGS)
    take([r for r in rows if not is_song(r)], 'call', CALLS)
    # a bird that hardly sings (or hardly calls): whatever it has, up to the same number of clips
    take(rows, 'call', SONGS + CALLS - len(picked))
    return picked


def stretch(path, longest):
    """where the loudest stretch of a recording starts and how long it is (s)"""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(RATE), '-af', 'highpass=f=600', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
    hop = RATE // 20  # 50 ms
    n = len(x) // hop
    if n < 10:
        return 0.0, len(x) / RATE
    rms = np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(axis=1))
    win = min(n, int(longest * 20))
    energy = np.convolve(rms ** 2, np.ones(win), 'valid')
    start = int(energy.argmax())
    loud = np.percentile(rms, 95) * 0.2
    # back to where the phrase begins (a quiet frame within the second before), on to where it ends
    lo = max(0, start - 20)
    quiet = [i for i in range(start, lo - 1, -1) if rms[i] < loud]
    start = quiet[0] if quiet else start
    end = min(n, start + win)
    tail = [i for i in range(end - 1, max(start + win // 2, end - 30), -1) if rms[i] < loud]
    end = tail[0] + 1 if tail else end
    return max(0.0, start / 20 - 0.05), max(1.0, (end - start) / 20 + 0.1)


def cut(src, dst, start, seconds):
    fade = max(0.0, seconds - 0.3)
    af = f'highpass=f=500,afade=t=in:d=0.04,afade=t=out:st={fade:.2f}:d=0.3,loudnorm=I=-19:TP=-2:LRA=11'
    base = ['ffmpeg', '-v', 'error', '-y', '-ss', f'{start:.2f}', '-t', f'{seconds:.2f}', '-i', src, '-af', af, '-ac', '1']
    subprocess.run(base + ['-ar', '48000', '-c:a', 'libopus', '-b:a', '48k', dst + '.ogg'], check=True)
    subprocess.run(base + ['-ar', '44100', '-c:a', 'aac', '-b:a', '64k', dst + '.m4a'], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--cache', default=os.path.join(ROOT, '.bird-songs-cache'))
    a = ap.parse_args()
    only = [s for s in a.only.split(',') if s]
    os.makedirs(OUT, exist_ok=True); os.makedirs(a.cache, exist_ok=True)
    manifest = {'birds': {}}
    if os.path.exists(MANIFEST):
        manifest = json.load(open(MANIFEST, encoding='utf-8'))
    birds = manifest.setdefault('birds', {})
    for bird, sci in BIRDS.items():
        if (only and bird not in only) or (not only and birds.get(bird)):
            continue
        print(bird, flush=True)
        clips = []
        for r in choose(sci):
            mp3 = os.path.join(a.cache, f"XC{r['xc']}.mp3")
            if not os.path.exists(mp3):
                open(mp3, 'wb').write(fetch(r['src'], binary=True)); time.sleep(1)
            try:
                start, seconds = stretch(mp3, SONG_S if r['kind'] == 'song' else CALL_S)
                name = f'{bird}-{len(clips) + 1}'
                cut(mp3, os.path.join(OUT, name), start, seconds)
            except subprocess.CalledProcessError as e:
                print('  skipped', r['xc'], e, file=sys.stderr); continue
            clips.append({'file': name, 'kind': r['kind'], 'seconds': round(seconds, 1), 'xc': r['xc'], 'by': r['by'], 'country': r['country'],
                          'license': r['license'], 'licenseUrl': r['licenseUrl'], 'url': f"https://xeno-canto.org/{r['xc']}"})
            print(f"  {name} {r['kind']} {seconds:.1f}s XC{r['xc']} {r['by']} ({r['license']})", flush=True)
        birds[bird] = clips
        out = {'version': 1, 'source': 'xeno-canto.org', 'folder': 'samples/birds-v1', 'birds': {k: birds[k] for k in BIRDS if k in birds}}
        json.dump(out, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); open(MANIFEST, 'a').write('\n')
    missing = [b for b in BIRDS if not birds.get(b)]
    print('without a clip:', ', '.join(missing) or 'none')


if __name__ == '__main__':
    main()
