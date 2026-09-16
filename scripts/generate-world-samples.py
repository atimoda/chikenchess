"""Small original synthetic instrument sketches, CC0. No recordings sampled."""
import math,random,wave,struct,pathlib
out=pathlib.Path(__file__).resolve().parents[1]/'public/samples/chicken-world-v1';out.mkdir(parents=True,exist_ok=True)
rate=24000
for kind,seconds,root in [('guitar',1.2,130.8128),('strings',1.5,261.6256),('flute',1.1,523.2511),('marimba',.8,261.6256),('conga',.45,130.8128),('timpani',.9,65.4064),('tambourine',.3,0),('crash',1,0)]:
 rng=random.Random(kind);values=[];previous=0
 for i in range(int(rate*seconds)):
  t=i/rate;noise=rng.uniform(-1,1);high=noise-previous;previous=noise
  if kind=='guitar':
   value=sum(math.sin(2*math.pi*root*h*t)*math.exp(-t*(2+h*.8))/h**1.1 for h in range(1,24))+.18*high*math.exp(-100*t)
  elif kind=='strings':
   value=sum((math.sin(2*math.pi*root*h*t+.002*h*math.sin(32*t))+math.sin(2*math.pi*root*1.003*h*t))/h**1.3 for h in range(1,20))*min(1,t/.09)*math.exp(-t*1.8)
  elif kind=='flute':
   phase=2*math.pi*root*t+.018*math.sin(34*t);value=(math.sin(phase)+.18*math.sin(phase*2)+.04*noise)*min(1,t/.025)*math.exp(-2.8*t)
  elif kind=='marimba':
   value=sum(a*math.sin(2*math.pi*root*h*t)*math.exp(-t*d) for h,a,d in [(1,1,8),(4,.28,16),(9,.12,25)])
  elif kind=='conga':value=(math.sin(2*math.pi*root*t)+.38*math.sin(2*math.pi*root*1.59*t))*math.exp(-18*t)+.1*noise*math.exp(-80*t)
  elif kind=='timpani':value=sum(math.sin(2*math.pi*root*h*t)*a for h,a in [(1,1),(1.5,.3),(2.13,.18)])*math.exp(-5*t)+.05*high*math.exp(-30*t)
  else:value=(sum(math.sin(2*math.pi*f*t) for f in [2137,3547,5119,7039,10037])/5+.35*high)*math.exp(-t*(17 if kind=='tambourine' else 5))
  fade=min(1,i/24,(rate*seconds-i)/240);values.append(math.tanh(value*.6)*fade)
 peak=max(abs(v) for v in values)
 with wave.open(str(out/f'{kind}-0.wav'),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(b''.join(struct.pack('<h',round(v/peak*.72*32767)) for v in values))
 print(kind,len(values)*2)
