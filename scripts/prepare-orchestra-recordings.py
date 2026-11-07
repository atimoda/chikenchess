"""Add CC0 orchestral multisamples without changing the existing Classical sounds.

Run with Python 3.8–3.12 and ffmpeg on PATH (or FFMPEG_BINARY).
The manifest records immutable sources, sounding roots and both encoded hashes.
"""
import audioop
import concurrent.futures
import hashlib
import io
import json
import math
import os
from pathlib import Path
import shutil
import struct
import subprocess
import urllib.parse
import urllib.request
import wave

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/samples/chicken-classical-v1'
REVISION = '440300901dfe9275fd84e0b7763af1f8443ae62e'
RATE = 24000
# source-note names keep the library's own octave convention.
ASSETS = [
 ('orchestra-violin', ['g3','c4','g4','c5'], [('p','Piano'),('f','Forte')], 'Strings/Solo Violin/Arco Vib/LLVln_ArcoVib_{note}_{layer}.wav', 0),
 ('orchestra-viola', ['c2','g2','d3','a3'], [('1','Dolce')], 'Strings/Viola Section/susvib/ViolaEns_susvib_{note}_v{layer}_1.wav', 1),
 ('orchestra-cello', ['c1','g1','d2','a2'], [('1','Dolce')], 'Strings/Cello Section/susvib/susvib_{note}_v{layer}_1.wav', 1),
 ('orchestra-cello-pizz', ['c1','g1','d2'], [('1','Pizzicato')], 'Strings/Cello Section/pizzT/pizzT_{note}_v{layer}_RR1.wav', 1),
 ('orchestra-bass', ['e0','c1','a1'], [('1','Arco')], 'Strings/Solo Contrabass/SusNV/BKCtbss_SusNV_{note}_v{layer}_rr1.wav', 1),
 ('orchestra-oboe', ['d3','a#3','f4'], [('1','Dolce')], 'Woodwinds/Oboe/Sus/Oboe_Sus_{note}_v{layer}_Main.wav', 1),
 ('orchestra-clarinet', ['d2','a#2','f3','d4'], [('1','Dolce')], 'Woodwinds/Clarinet/susLong/DCClar_susLong_{note}_v{layer}_rr1_sum.wav', 1),
 ('orchestra-bassoon', ['c2','g2','c3'], [('1','Dolce')], 'Woodwinds/Bassoon/sus/PSBassoon_{note}_v{layer}_1.wav', 1),
 ('orchestra-trumpet', ['c3','a#3','d4'], [('1','Dolce')], 'Brass/Trumpet/sus/Sum_SHTrumpet_sus_{note}_v{layer}_rr1.wav', 1),
 ('orchestra-horn', ['g1','c3','f4'], [('1','Dolce')], 'Brass/F Horn/sus/MOHorn_sus_{note}_v{layer}_1.wav', 1),
 ('orchestra-flute', ['c4','e4','a4','c5'], [('1','Senza vibrato')], 'Woodwinds/Flute/susNV/LDFlute_susNV_{note}_v{layer}_1.wav', 1),
]


def prepare(item):
    asset, note, layer, source, shift = item
    url = 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/{}/{}'.format(REVISION, urllib.parse.quote(source))
    data = urllib.request.urlopen(url, timeout=60).read()
    with wave.open(io.BytesIO(data),'rb') as wav:
        channels, width, rate, frames, _, _ = wav.getparams()
        pcm = wav.readframes(frames)
    if channels == 2:
        pcm = audioop.tomono(pcm, width, .5, .5)
    pcm, _ = audioop.ratecv(pcm, width, 1, rate, RATE, None)
    if width != 2:
        pcm = audioop.lin2lin(pcm, width, 2)
    values = struct.unpack('<{}h'.format(len(pcm)//2), pcm)
    threshold = max(60, max(map(abs,values))*.005)
    onset = next((i for i,v in enumerate(values) if abs(v)>threshold),0)
    values = values[max(0,onset-120):][:int(RATE*4.5)]
    gain = min(3, 19000/(max(map(abs,values)) or 1))
    pcm = b''.join(struct.pack('<h',int(v*gain*min(1,(i+1)/120,(len(values)-i)/2400))) for i,v in enumerate(values))
    stem = '{}-{}-{}'.format(asset,layer,note)
    target = DEST / (stem+'.wav')
    with wave.open(str(target),'wb') as wav:
        wav.setparams((1,2,RATE,0,'NONE','not compressed')); wav.writeframes(pcm)
    encoder = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
    if not encoder:
        raise RuntimeError('ffmpeg is required')
    for extension, options in [('ogg',['-c:a','libopus','-b:a','64k','-application','audio']),('m4a',['-c:a','aac','-b:a','80k','-movflags','+faststart'])]:
        subprocess.run([encoder,'-nostdin','-loglevel','error','-y','-i',str(target),'-map_metadata','-1']+options+[str(DEST/(stem+'.'+extension))],check=True)
    target.unlink()
    sounding = note[:-1]+str(int(note[-1])+shift)
    print(stem, 'root', sounding, flush=True)
    return dict(asset=asset, source=url, sourceSha256=hashlib.sha256(data).hexdigest(), root=sounding,
                seconds=len(values)/RATE, files={ext:dict(path=stem+'.'+ext,sha256=hashlib.sha256((DEST/(stem+'.'+ext)).read_bytes()).hexdigest()) for ext in ['ogg','m4a']})


if __name__ == '__main__':
    DEST.mkdir(parents=True,exist_ok=True)
    expected = {f'{asset}-{layer}-{note}.{ext}' for asset,notes,layers,_,_ in ASSETS for layer,_ in layers for note in notes for ext in ['ogg','m4a']}
    for stale in DEST.glob('orchestra-*'):
        if stale.suffix in ['.ogg','.m4a','.wav'] and stale.name not in expected:
            stale.unlink()
    jobs=[(asset,note,layer,template.format(note=note.upper(),layer=layer),shift) for asset,notes,layers,template,shift in ASSETS for layer,_ in layers for note in notes]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        recordings=list(pool.map(prepare,jobs))
    (DEST/'orchestra-manifest.json').write_text(json.dumps(dict(license='CC0-1.0',revision=REVISION,recordings=recordings),indent=2)+'\n')
