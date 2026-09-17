const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTs, strudel } = require('../helpers/music.cjs')
const { voiceSpecs, renderMusicCode, compileVoice } = loadTs('lib/music/runtime.ts')
const patterns = loadTs('lib/music/pattern-library.ts')
const creative = loadTs('lib/music/creative.ts')
const fixtureDirectory = path.resolve(__dirname, '..')

test('Mouth Breather study preserves guitar layers, chromatic falls and drum-specific tracks',async()=>{
 const api=await strudel(),kit=creative.parseCreativeSession(fs.readFileSync(path.join(fixtureDirectory,'../public/presets/mouth-breather.json'),'utf8'))
 assert.equal(kit.bpm,215);assert.equal(kit.scale,'Chromatic');assert.equal(kit.pieces.filter(p=>p.active).length,6)
 const g=kit.instruments['w:d1'];assert.equal(g.performance.steps.length,17);assert.equal(g.performance.steps.reduce((n,s)=>n+s.beats,0),488)
 assert.ok(g.pianoRolls[0].notes.some(n=>n.pan===.49));assert.deepEqual(g.pianoRolls[1].notes.map(n=>n.degree).sort((a,b)=>a-b),[-8,-1,4])
 assert.ok(g.pianoRolls[1].notes.every(n=>n.slide===-3&&n.slideSeconds===.6))
 for(const voice of voiceSpecs(creative.creativeSnapshot(kit,true),null)){
  const pattern=compileVoice(api,voice)
  for(let cycle=0;cycle<122;cycle++)assert.ok(pattern.queryArc(cycle,cycle+1).length<=128)
 }
})

test('exported Strudel matches compiled note timing, slide and form through an entire study',async()=>{
 const api=await strudel(),kit=creative.parseCreativeSession(fs.readFileSync(path.join(fixtureDirectory,'../public/presets/mouth-breather.json'),'utf8'))
 const snapshot=creative.creativeSnapshot(kit,true),code=renderMusicCode(snapshot,null)
 const expression=code.slice(code.indexOf('\nstack(')+1)
 const exported=new Function(...Object.keys(api),`return ${expression}`)(...Object.values(api))
 const actual=api.stack(...voiceSpecs(snapshot,null).map(v=>compileVoice(api,v)))
 const normalize=hs=>hs.filter(h=>h.hasOnset()).map(h=>JSON.stringify([Number(h.whole.begin),Number(h.whole.end),h.value.note??null,h.value.s,h.value.penv??null,h.value.pattack??null,h.value.pan,h.value.velocity])).sort()
 for(let bar=0;bar<122;bar++)assert.deepEqual(normalize(exported.queryArc(bar,bar+1)),normalize(actual.queryArc(bar,bar+1)),`bar ${bar}`)
})

test('study arrangement matches the supplied G/B/D score timing and chromatic pitches',async()=>{
 const api=await strudel(),score=api.mini('<G@3 [G,D]@6 [G,D,B]@6 [G:1,D]@3 [G,D,B]@3 [G:1,D]@3 [G,D,B]@3 [G:0:-5,D,B:0:-5]@3 [G:0:-7,D,B:0:-7]@3 [D,B]@6 [G,D,B]@3 ~ [G,D,B]@6 [G:0:-5,D,B:0:-5]@3 [G:0:-7,D,B:0:-7]@3 D@3 ~@3>/16')
 const column=(pat,i)=>pat.withValue(v=>Array.isArray(v)?v[i]??0:i===0?v:0)
 const source=(part,patterns)=>{const selected=score.filterValues(v=>v[0]===part);return api.pickRestart(patterns,column(selected,1)).transpose(column(selected,2)).fast(8)}
 const structure=api.mini('<x!4 ~!2 x!9 x@3 x!6>')
 const g0=api.stack(api.note('<48@9 49 48@2>'),api.mini('<55 53@2 55@4 53 55 56 55 53>').add('<0,5>').note()).struct(structure)
 const g1=api.mini('<[48,55,60]@3 ~@45>').add(-8).note()
 const b=api.note('<36!3 36@2 ~ 36!3 <[37 41 37] [36 41 43]>@3>')
 const kit=creative.parseCreativeSession(fs.readFileSync(path.join(fixtureDirectory,'../public/presets/mouth-breather.json'),'utf8'))
 const voices=voiceSpecs(creative.creativeSnapshot(kit,true),null)
 const normalize=hs=>hs.filter(h=>h.hasOnset()).map(h=>JSON.stringify([Number(h.whole.begin),Number(h.whole.end),h.value.note])).sort()
 for(const [id,pattern] of [['w:d1',source('G',[g0,g1])],['w:b1',source('B',[b])]]){
  const actual=compileVoice(api,voices.find(v=>v.piece.id===id))
  for(let bar=0;bar<122;bar++)assert.deepEqual(normalize(actual.queryArc(bar,bar+1)),normalize(pattern.queryArc(bar,bar+1)),`${id} bar ${bar}`)
 }
})

test('study drum parts retain each onset from the supplied mixed drum pattern',async()=>{
 const api=await strudel(),kit=creative.parseCreativeSession(fs.readFileSync(path.join(fixtureDirectory,'../public/presets/mouth-breather.json'),'utf8'))
 const drumPattern=api.s('<[bd ~ bd sd ~ bd!2 ~!2 bd sd ~ bd ~!2 bd sd bd ~ bd sd ~ bd ~],oh*12,cr*2>/24').fast(8)
 for(const [id,sound] of [['w:a2','bd'],['w:b2','sd'],['w:c2','oh'],['w:d2','cr']]){
  const expected=drumPattern.queryArc(0,3).filter(h=>h.hasOnset()&&h.value.s===sound).map(h=>[Number(h.whole.begin),Number(h.whole.end)])
  assert.deepEqual(kit.instruments[id].pianoRolls[0].notes.map(n=>[n.start,n.start+n.duration]),expected)
 }
})
