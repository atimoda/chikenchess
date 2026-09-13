"""Numerical audio study; pulse aliases/chroma are evidence, not a transcription."""
import sys,json,hashlib
# Requires numpy, scipy and soundfile (analysis only; not app dependencies).
import argparse
parser=argparse.ArgumentParser()
parser.add_argument('audio')
parser.add_argument('output')
args=parser.parse_args()
import soundfile as sf
import numpy as np
from scipy import signal
p=args.audio
x,sr=sf.read(p); duration=len(x)/sr
mono=signal.resample_poly(x.mean(axis=1),1,4); rate=sr/4
f,t,z=signal.stft(mono,fs=rate,nperseg=2048,noverlap=1536); mag=np.abs(z)
flux=np.maximum(np.diff(np.log1p(mag*100),axis=1),0).sum(axis=0); ft=t[1:]; hz=rate/512
ac=signal.correlate(flux-flux.mean(),flux-flux.mean(),mode='full',method='fft')[len(flux)-1:]
peaks,_=signal.find_peaks(ac); peaks=[int(i) for i in peaks if 70<60*hz/i<180]
bpm_candidates=sorted([{'bpm':round(60*hz/i,2),'strength':round(float(ac[i]/ac[0]),3)} for i in peaks],key=lambda p:-p['strength'])[:8]
# Refine pulse periodicity by harmonic Fourier response of onset envelope.
bpms=np.arange(70,180,.01); scores=np.array([abs(np.sum(flux*np.exp(-2j*np.pi*(b/60)*ft))) for b in bpms]); bpm=float(bpms[scores.argmax()])
# Harmonic-rich bins, aggregate chroma as evidence rather than asserting a key.
chroma=np.zeros(12); valid=(f>80)&(f<2200); pitches=np.rint(69+12*np.log2(f[valid]/440)).astype(int)%12
for pc in range(12): chroma[pc]=np.square(mag[valid][pitches==pc]).sum()
chroma/=chroma.sum()
segments=[]
for start in range(0,int(duration),8):
 block=x[int(start*sr):int((start+8)*sr)]; mask=(t>=start)&(t<start+8)
 power=np.square(mag[:,mask]).mean(axis=1)
 segments.append({'start':start,'rms_db':round(float(20*np.log10(np.sqrt(np.mean(block**2))+1e-9)),2),'low_share':round(float(power[f<180].sum()/power.sum()),3),'high_share':round(float(power[f>2500].sum()/power.sum()),3)})
result={'source_sha256':hashlib.sha256(open(p,'rb').read()).hexdigest(),'duration_seconds':duration,'sample_rate':sr,'channels':x.shape[1],'peak_dbfs':round(float(20*np.log10(np.max(np.abs(x)))),2),'rms_dbfs':round(float(20*np.log10(np.sqrt(np.mean(x**2)))) ,2),'tempo_candidates':bpm_candidates,'spectral_pulse_candidate_bpm':round(bpm,2),'chroma_energy':dict(zip(['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],np.round(chroma,4).tolist())),'segments_8_seconds':segments}
open(args.output,'w').write(json.dumps(result,indent=2)+'\n'); print(json.dumps(result,indent=2))
