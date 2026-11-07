"""CC0 concert additions, isolated from existing sample preparation.
Python 3.8–3.12; FFMPEG_BINARY or ffmpeg. Immutable source and output hashes
are recorded beside the assets. Modern acoustic recordings, not historical audio.
"""
import audioop
import concurrent.futures
import hashlib
import io
import json
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
REVISIONS = {'VCSL': 'c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e', 'VSCO-2-CE': '440300901dfe9275fd84e0b7763af1f8443ae62e'}
RATE = 24000
# asset, display name, repo, source-note names, variants, path, sounding-octave shift, maximum seconds
ASSETS = [
 ('concert-piano','Piano de cauda Steinway B · ressonância longa','VCSL', ['c1','f#1','c2','f#2','c3','f#3','c4','f#4','c5'], [('2','Dolce'),('4','Marcato')], 'Chordophones/Zithers/Grand Piano, Steinway B/NoSus/JHPiano_NoSus_Close_{note}_vl{layer}_rr1.wav', 0, 6),
 ('concert-bass-pizz','Contrabaixo · pizzicato','VSCO-2-CE', ['e0','c1','a1'], [('1','Pizzicato')], 'Strings/Solo Contrabass/Pizz/BKCtbss_Pizz_{note}_v{layer}_rr1.wav', 1, 3.5),
 ('concert-trombone','Trombone tenor · sustentado','VSCO-2-CE', ['a#0','f1','d2','c3'], [('1','Dolce')], 'Brass/Tenor Trombone/sus/tenortbn_sus_{note}_v{layer}_1.wav', 1, 4.5),
 ('concert-bass-drum','Bumbo sinfônico','VCSL', ['hit'], [('3','Médio'),('5','Forte')], 'Membranophones/Struck Membranophones/Bass Drum 1/BDrumNew_hit_v{layer}_rr1_Sum.wav', None, 5),
 ('concert-snare','Caixa orquestral','VCSL', ['hit'], [('p','Suave'),('mf','Mezzo forte')], 'Membranophones/Struck Membranophones/Legacy Snares/OldSnare/snare_{layer}1.wav', None, 2),
 ('concert-cymbal','Pratos de choque','VCSL', ['hit'], [('mf','Mezzo forte')], 'Idiophones/Struck Idiophones/Clash Cymbals 1/cymbal_crash1_{layer}1.wav', None, 5),
 ('concert-tam-tam','Tam-tam · ressonância grave','VCSL', ['hit'], [('p','Piano')], 'Idiophones/Struck Idiophones/Gong 1/gong_{layer}.wav', None, 6),
]

def prepare(job):
    asset, name, repo, note, layer, source, shift, seconds = job
    url = 'https://raw.githubusercontent.com/sgossner/{}/{}/{}'.format(repo,REVISIONS[repo],urllib.parse.quote(source))
    cache = Path('/tmp/chicken-concert-sources') / hashlib.sha256(url.encode()).hexdigest()
    cache.parent.mkdir(exist_ok=True)
    if not cache.exists(): cache.write_bytes(urllib.request.urlopen(url,timeout=60).read())
    data = cache.read_bytes()
    with wave.open(io.BytesIO(data),'rb') as wav:
        channels,width,rate,frames,_,_ = wav.getparams(); pcm = wav.readframes(frames)
    if channels == 2: pcm = audioop.tomono(pcm,width,.5,.5)
    pcm,_ = audioop.ratecv(pcm,width,1,rate,RATE,None)
    if width != 2: pcm = audioop.lin2lin(pcm,width,2)
    values = struct.unpack('<{}h'.format(len(pcm)//2),pcm)
    threshold = max(30,max(map(abs,values))*.002)
    onset = next((i for i,v in enumerate(values) if abs(v)>threshold),0)
    values = values[max(0,onset-96):][:int(RATE*seconds)]
    gain = min(4,21000/(max(map(abs,values)) or 1))
    pcm = b''.join(struct.pack('<h',int(v*gain*min(1,(i+1)/24,(len(values)-i)/2400))) for i,v in enumerate(values))
    stem = '{}-{}-{}'.format(asset,layer,note)
    wavfile = DEST/(stem+'.wav')
    with wave.open(str(wavfile),'wb') as wav:
        wav.setparams((1,2,RATE,0,'NONE','not compressed'));wav.writeframes(pcm)
    encoder = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
    if not encoder: raise RuntimeError('ffmpeg required')
    for ext,args in [('ogg',['-c:a','libopus','-b:a','64k','-application','audio']),('m4a',['-c:a','aac','-b:a','80k','-movflags','+faststart'])]:
        subprocess.run([encoder,'-nostdin','-v','error','-y','-i',str(wavfile),'-map_metadata','-1']+args+[str(DEST/(stem+'.'+ext))],check=True)
    wavfile.unlink()
    sounding = None if shift is None else note[:-1]+str(int(note[-1])+shift)
    return dict(asset=asset,variant=layer,source=url,sourceSha256=hashlib.sha256(data).hexdigest(),root=sounding,seconds=len(values)/RATE,files={ext:dict(path=stem+'.'+ext,sha256=hashlib.sha256((DEST/(stem+'.'+ext)).read_bytes()).hexdigest()) for ext in ['ogg','m4a']})

if __name__ == '__main__':
    DEST.mkdir(parents=True,exist_ok=True)
    jobs=[(asset,name,repo,note,layer,template.format(note=note.upper(),layer=layer),shift,seconds) for asset,name,repo,notes,layers,template,shift,seconds in ASSETS for layer,_ in layers for note in notes]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: recordings=list(pool.map(prepare,jobs))
    assets=[]
    for asset,name,repo,notes,layers,template,shift,seconds in ASSETS:
        variants=[]
        for layer,label in layers:
            rows=[row for row in recordings if row['asset']==asset and row['variant']==layer]
            paths=['/samples/chicken-classical-v1/'+row['files']['ogg']['path'] for row in rows]
            variants.append(dict(name=label,file=paths[0],**({'keymap':{row['root']:file for row,file in zip(rows,paths)}} if shift is not None else {})))
        assets.append(dict(id=asset,name=name,variants=variants))
    (ROOT/'data/music/concert-samples.json').write_text(json.dumps(assets,indent=2,ensure_ascii=False)+'\n')
    (DEST/'concert-manifest.json').write_text(json.dumps(dict(license='CC0-1.0',revisions=REVISIONS,recordings=recordings),indent=2)+'\n')
    print('{} acoustic recordings / {} assets'.format(len(recordings),len(assets)))
