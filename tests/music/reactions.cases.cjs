const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const model = loadTs('lib/music/model.ts')
const { voiceSpecs, compileVoice } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')
const state = (history = []) => ({ pieces: model.piecesFromHistory(history), scale: ['C4','Eb4','F4','G4','Bb4'], bpm: 118, volume: 0.8, playing: true, effects: {} })

test('check activates only the attacking team temporarily and restores moved voices on escape', () => {
  const history = ['e4', 'd5', 'Bb5+']
  const checked = model.gameMusicStateFromHistory(history)
  assert.equal(checked.attackingColor, 'w')
  assert.equal(checked.pieces.filter(p => p.color === 'w' && p.active).length, 16)
  assert.equal(checked.pieces.filter(p => p.color === 'b' && p.active).length, 1)
  assert.equal(checked.pieces.find(p => p.id === 'w:e1').activation, 'check')
  assert.equal(model.piecesFromHistory(history).find(p => p.id === 'w:e1').active, false)
  const escaped = model.gameMusicStateFromHistory([...history, 'c6'])
  assert.equal(escaped.attackingColor, null)
  assert.equal(escaped.pieces.filter(p => p.color === 'w' && p.active).length, 2)
  assert.equal(escaped.pieces.find(p => p.id === 'w:e1').active, false)
  assert.deepEqual(model.gameMusicStateFromHistory(history), checked) // Undo/redo reconstruct the overlay.
})

test('black check does not resurrect captured voices and mate still obeys transport pause', () => {
  const checked = model.gameMusicStateFromHistory(['d4', 'e5', 'dxe5', 'Bb4+'])
  assert.equal(checked.attackingColor, 'b')
  assert.equal(checked.pieces.filter(p => p.color === 'b' && p.active).length, 15)
  assert.equal(checked.pieces.some(p => p.id === 'b:e7'), false)
  const mate = model.gameMusicStateFromHistory(['f3', 'e5', 'g4', 'Qh4#'])
  assert.equal(mate.checkmate, true)
  assert.equal(voiceSpecs({ ...state(), pieces: mate.pieces, playing: false }, null).length, 0)
})

test('check activates attackers while preserving authored section silence and the saved kit', async () => {
  const api = await strudel()
  const kit = creative.createDusseldorfSession()
  for (const id of ['w:e2', 'w:e1']) for(const step of Object.values(kit.instruments[id].arrangement.sections))step.active=false
  const before = JSON.stringify(kit)
  const during = model.gameMusicStateFromHistory(['e4', 'd5', 'Bb5+'])
  const snapshot = { ...creative.creativeSnapshot(kit, true), pieces: during.pieces }
  for (const id of ['w:e2', 'w:e1']) {
    const voice = voiceSpecs(snapshot, null).find(v => v.piece.id === id)
    assert.ok(voice)
    assert.deepEqual(voice.performance.steps.map(step=>[step.beats,step.active]),kit.arrangement.sections.map(section=>[section.beats,false]))
    assert.equal(compileVoice(api, voice).queryArc(0, 4).length, 0)
    const manual = voiceSpecs(snapshot, { id, square: voice.piece.square, mode: 'manual' }).find(v => v.manual)
    assert.ok(compileVoice(api, manual).queryArc(0, 1).some(h => h.hasOnset()))
  }
  assert.equal(JSON.stringify(kit), before)
  const escaped = { ...snapshot, pieces: model.gameMusicStateFromHistory(['e4', 'd5', 'Bb5+', 'c6']).pieces }
  assert.equal(voiceSpecs(escaped, null).some(v => v.piece.id === 'w:e1'), false)
})

test('reaction ledger detects castling, captures, depleted families, thresholds, promotions and undo', () => {
  const { reactionContext }=loadTs('lib/music/reactions.ts')
  const ids=c=>c.events.map(e=>e.trigger)
  const castling=reactionContext(['O-O','O-O-O'],4,'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
  assert.deepEqual(ids(castling),['firstCastle','secondCastle'])
  for(const [symbol,event] of [['q','queenCapture'],['n','noKnights'],['r','noRooks'],['b','noBishops']]){
    const c=reactionContext(['Rxa8+'],2,`${symbol}6k/1p6/8/8/8/8/8/R6K w - - 0 1`)
    for(const name of ['firstCapture','capture',event,'minimumOne','minimumBoth'])assert.ok(ids(c).includes(name),name)
    assert.equal(c.events.find(e=>e.trigger==='minimumOne').color,'b')
    if(symbol==='q')assert.ok(ids(c).includes('noQueens'))
  }
  const fen='7k/P7/8/8/8/8/8/7K w - - 0 1'
  assert.ok(ids(reactionContext(['a8=Q+'],4,fen)).includes('promotion'))
  assert.ok(ids(reactionContext(['a8=N'],4,fen)).includes('underpromotion'))
  const ep=['e4','a6','e5','d5','exd6']
  assert.ok(ids(reactionContext(ep)).includes('enPassant'))
  assert.ok(!ids(reactionContext(ep.slice(0,-1))).includes('enPassant'))
  const mate=reactionContext(['f3','e5','g4','Qh4#'])
  assert.ok(mate.states.some(e=>e.trigger==='mate'&&e.color==='b'))
  const repeat=['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8','Nf3','Nf6']
  assert.ok(ids(reactionContext(repeat)).includes('quiet'))
  assert.ok(reactionContext(repeat).states.some(e=>e.trigger==='repetition'))
})

test('factory reaction preset covers every trigger and every implemented influence', () => {
  const { ACTIONS, TRIGGERS, defaultReactions }=loadTs('lib/music/reactions.ts')
  const rules=defaultReactions()
  assert.equal(rules.length,Object.keys(TRIGGERS).length)
  assert.deepEqual(new Set(rules.map(rule=>rule.trigger)),new Set(Object.keys(TRIGGERS)))
  assert.deepEqual(new Set(rules.flatMap(rule=>rule.actions.map(action=>action.type))),new Set(Object.keys(ACTIONS)))
  assert.deepEqual(rules.find(rule=>rule.trigger==='capture').actions.map(action=>[action.type,action.value]),[['gain',3]])
  assert.equal(rules.find(rule=>rule.trigger==='noQueens').duration,0)
  assert.ok(rules.find(rule=>rule.trigger==='promotion').actions.some(action=>action.type==='transpose'&&action.value===12))
  assert.equal(rules.find(rule=>rule.trigger==='endgame').actions.find(action=>action.type==='harmony').harmony,'cadence')
})

test('harmony reactions replace and restore the shared plan without rewriting the kit', () => {
  const { applyReactions, reactionsSchema }=loadTs('lib/music/reactions.ts')
  const kit=creative.createCreativeSession(),base=creative.creativeSnapshot(kit,true)
  base.arrangement=structuredClone(base.arrangement)
  base.arrangement.sections[0].harmony = [0, 3, 4, 0]
  const config=reactionsSchema.parse({rules:[{id:'harmony',trigger:'endgame',enabled:true,quantize:false,target:'both',duration:1,actions:[{type:'harmony',harmony:'descent'}]}]})
  const active=applyReactions(base,config,{ply:30,states:[{trigger:'endgame',color:'w',ply:30}],events:[]})
  assert.equal(active.snapshot.harmony,'descent')
  assert.deepEqual(active.snapshot.arrangement.sections[0].harmony, [0, 3, 4, 0])
  assert.deepEqual(active.snapshot.arrangement.sections.map(({harmony,...section})=>section),base.arrangement.sections.map(({harmony,...section})=>section))
  assert.deepEqual(base.arrangement.sections[0].harmony, [0, 3, 4, 0])
  assert.ok(active.descriptions[0].includes('Descendente'))
  assert.equal(applyReactions(base,config,{ply:30,states:[],events:[]}).snapshot.harmony,'kit')
  assert.deepEqual(applyReactions(base,config,{ply:30,states:[],events:[]}).snapshot.arrangement, base.arrangement)
  assert.equal(kit.harmony,'kit')
  assert.throws(()=>reactionsSchema.parse({rules:[{...config.rules[0],actions:[{type:'harmony',harmony:'unknown'}]}]}))
})

test('resolved global and team values can drive the game controls while reactions are active', () => {
  const { applyReactions, reactionsSchema }=loadTs('lib/music/reactions.ts')
  const { identifyPitchCollection }=loadTs('lib/music/scales.ts')
  const kit=creative.createCreativeSession()
  kit.root='C'; kit.scale='Maior'
  const base=creative.creativeSnapshot(kit,true)
  const config=reactionsSchema.parse({rules:[{id:'controls',trigger:'opening',enabled:true,target:'both',duration:1,actions:[
    {type:'bpm',value:10},{type:'mode',value:1},{type:'harmony',harmony:'circle'},{type:'gain',value:30},{type:'lpf',value:9000},
  ]}]})
  const activeContext={ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]}
  const active=applyReactions(base,config,activeContext).snapshot
  assert.equal(active.bpm,base.bpm*1.1)
  assert.deepEqual(identifyPitchCollection(active.scale),{root:'D',scale:'Dórica',label:'Dórica',notes:['D','E','F','G','A','B','C']})
  assert.equal(active.harmony,'circle')
  assert.equal(active.effects['w:e2'].gain,base.effects['w:e2'].gain*1.3)
  assert.equal(active.effects['w:e2'].lpf,9000)
  const expired=applyReactions(base,config,{...activeContext,states:[]}).snapshot
  assert.equal(expired.bpm,base.bpm)
  assert.deepEqual(identifyPitchCollection(expired.scale),{root:'C',scale:'Maior',label:'Maior',notes:['C','D','E','F','G','A','B']})
  assert.equal(expired.harmony,base.harmony)
  assert.equal(expired.effects['w:e2'].gain,base.effects['w:e2'].gain)
  const aeolianKit={...kit,root:'G',scale:'Aeolian'}
  assert.equal(identifyPitchCollection(creative.creativeSnapshot(aeolianKit,true).scale,aeolianKit.scale).scale,'Aeolian')
})

test('draw triggers distinguish stalemate from the fifty-move rule', () => {
  const { reactionContext }=loadTs('lib/music/reactions.ts')
  const stalemate=reactionContext([],4,'7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').states.map(state=>state.trigger)
  assert.ok(stalemate.includes('stalemate'))
  assert.ok(!stalemate.includes('draw'))
  const fifty=reactionContext([],4,'7k/8/8/8/8/8/R7/K7 w - - 100 51').states.map(state=>state.trigger)
  assert.ok(fifty.includes('draw'))
  assert.ok(!fifty.includes('stalemate'))
})

test('legacy factory reactions upgrade while authored reaction sets remain intact', () => {
  const { REACTION_PRESET_REVISION, defaultReactions }=loadTs('lib/music/reactions.ts')
  const kit=creative.createCreativeSession()
  const legacy={...kit,reactionPresetRevision:undefined,reactions:{minimumPieces:6,rules:[{id:'check-band',trigger:'check',enabled:true,quantize:false,target:'actor',duration:1,actions:[{type:'activate',value:0,scale:'Maior'}]}]}}
  const upgraded=creative.parseCreativeSession(JSON.stringify(legacy))
  assert.equal(upgraded.reactionPresetRevision,REACTION_PRESET_REVISION)
  assert.equal(upgraded.reactions.minimumPieces,6)
  assert.deepEqual(upgraded.reactions.rules,defaultReactions())
  const previousFactory={...kit,reactionPresetRevision:'reactions-2026-09-20-v1',reactions:{minimumPieces:4,rules:defaultReactions().map(rule=>({...rule,actions:rule.actions.filter(action=>action.type!=='harmony').map(({harmony,...action})=>action)}))}}
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(previousFactory)).reactions.rules,defaultReactions())
  const custom={...kit,reactionPresetRevision:undefined,reactions:{minimumPieces:4,rules:[{id:'mine',trigger:'capture',enabled:true,quantize:false,target:'actor',duration:3,actions:[{type:'gain',value:9,scale:'Maior',harmony:'static'}]}]}}
  const merged=creative.parseCreativeSession(JSON.stringify(custom)).reactions
  assert.deepEqual(merged.rules[0],custom.reactions.rules[0])
  assert.equal(merged.rules.length,Object.keys(loadTs('lib/music/reactions.ts').TRIGGERS).length)
  assert.equal(new Set(merged.rules.map(rule=>rule.trigger)).size,Object.keys(loadTs('lib/music/reactions.ts').TRIGGERS).length)
})

test('kit reactions round-trip, restore base, expire and never accumulate on rerender', () => {
  const { applyReactions, reactionsSchema }=loadTs('lib/music/reactions.ts')
  const kit=creative.createCreativeSession(), base=creative.creativeSnapshot(kit,true)
  const config=reactionsSchema.parse({minimumPieces:4,rules:[{id:'test',trigger:'queenCapture',enabled:true,target:'both',duration:2,actions:[{type:'bpm',value:10},{type:'transpose',value:2},{type:'variation',value:2},{type:'gain',value:-20}]}]})
  const context={ply:5,states:[],events:[{trigger:'queenCapture',color:'w',ply:5}]}
  const first=applyReactions(base,config,context)
  assert.equal(first.snapshot.bpm,base.bpm*1.1)
  assert.equal(first.snapshot.scale[0],'D4')
  assert.equal(first.snapshot.sectionOverrides['w:d1'],2)
  assert.deepEqual(first,applyReactions(base,config,context))
  assert.equal(applyReactions(base,config,{...context,ply:7}).snapshot.bpm,base.bpm)
  const infinite=reactionsSchema.parse({rules:[{...config.rules[0],duration:0}]})
  assert.equal(applyReactions(base,infinite,{...context,ply:999}).snapshot.bpm,base.bpm*1.1)
  assert.equal(base.scale[0],'C4')
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify({...kit,reactions:config})).reactions,config)
  assert.throws(()=>reactionsSchema.parse({...config,rules:[{...config.rules[0],actions:[{type:'bpm',value:500}]}]}))
})

test('check reaction is removable and side actions preserve the opponent; relative preserves pitch classes', () => {
  const { applyReactions, reactionsSchema, defaultReactions }=loadTs('lib/music/reactions.ts')
  const kit=creative.createCreativeSession(), base=creative.creativeSnapshot(kit,true)
  const context={ply:0,states:[{trigger:'check',color:'b',ply:0}],events:[]}
  const result=applyReactions(base,{minimumPieces:4,rules:defaultReactions()},context)
  assert.equal(result.snapshot.pieces.filter(p=>p.active).length,16)
  assert.ok(result.snapshot.pieces.filter(p=>p.active).every(p=>p.color==='b'))
  assert.equal(applyReactions(base,{minimumPieces:4,rules:[]},context).snapshot.pieces.filter(p=>p.active).length,0)
  const config=reactionsSchema.parse({rules:[{...defaultReactions()[0],actions:[{type:'gain',value:50},{type:'variation',value:1}]}]})
  const scoped=applyReactions(base,config,context).snapshot
  assert.equal(scoped.effects['w:d1'].gain,base.effects['w:d1'].gain)
  assert.equal(scoped.effects['b:d8'].gain,base.effects['b:d8'].gain*1.5)
  const major={...base,scale:['C4','D4','E4','F4','G4','A4','B4']}
  const relative=reactionsSchema.parse({rules:[{...defaultReactions()[0],target:'both',actions:[{type:'relative'}]}]})
  const minor=applyReactions(major,relative,context).snapshot
  assert.equal(minor.scale[0],'A4')
  assert.deepEqual([...minor.scale].sort(),[...major.scale].sort())
})

test('transposition across C retains direction and octave and does not retune drum samples', () => {
  const {applyReactions,reactionsSchema}=loadTs('lib/music/reactions.ts')
  const kit=creative.createDusseldorfSession(),base=creative.creativeSnapshot(kit,true)
  base.scale=['C4','D4','E4','F4','G4','A4','B4']
  const context={ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]}
  const first=s=>voiceSpecs(s,null).find(v=>v.piece.id==='w:b1').pianoRolls[0].notes[0].degree
  for(const shift of [-12,-1,2,12]){
    const config=reactionsSchema.parse({rules:[{id:'transpose',trigger:'opening',target:'both',enabled:true,duration:1,actions:[{type:'transpose',value:shift}]}]})
    const result=applyReactions(base,config,context).snapshot
    assert.equal(first(result)-first(base),shift)
    assert.equal(result.effects['w:a2'].pitch,base.effects['w:a2'].pitch)
  }
})

test('expanded scales round-trip in kits and rules and produce bounded Strudel notes', async () => {
  const { SCALE_INTERVALS } = loadTs('lib/music/scales.ts')
  const { reactionsSchema, applyReactions } = loadTs('lib/music/reactions.ts')
  const engine = await strudel()
  assert.deepEqual(SCALE_INTERVALS.Aeolian, SCALE_INTERVALS['Menor natural'])
  for (const [scale, intervals] of Object.entries(SCALE_INTERVALS)) {
    assert.equal(intervals[0], 0)
    assert.ok(intervals.every((n,i)=>Number.isInteger(n)&&n<12&&(i===0||n>intervals[i-1])))
    const kit=creative.createDusseldorfSession(); kit.scale=scale
    assert.equal(creative.parseCreativeSession(JSON.stringify(kit)).scale,scale)
    const config=reactionsSchema.parse({rules:[{id:'scale',trigger:'opening',enabled:true,quantize:true,target:'both',duration:2,actions:[{type:'scale',scale}]}]})
    const snapshot=applyReactions(creative.creativeSnapshot(kit,true),config,{ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]}).snapshot
    assert.equal(snapshot.scale.length,intervals.length)
    const voice=voiceSpecs(snapshot,null).find(v=>v.piece.id==='w:b1')
    const haps=compileVoice(engine,voice).queryArc(0,4)
    assert.ok(haps.length>0,scale)
    assert.ok(haps.every(h=>Number.isFinite(Number(h.value.note))),scale)
  }
})

test('state inversion also transforms edited degrees without mutating the saved roll', () => {
 const {reactionsSchema,applyReactions}=loadTs('lib/music/reactions.ts')
 const kit=creative.createDusseldorfSession(),id='w:b1'
 kit.instruments[id].pianoRolls=[{bars:1,notes:[{start:0,duration:.25,degree:3,velocity:.8}]}]
 const config=reactionsSchema.parse({rules:[{id:'invert',trigger:'opening',enabled:true,target:'both',duration:1,actions:[{type:'invert'}]}]})
 const result=applyReactions(creative.creativeSnapshot(kit,true),config,{ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]})
 assert.equal(result.snapshot.instruments[id].pianoRolls[0].notes[0].degree,-3)
 assert.equal(kit.instruments[id].pianoRolls[0].notes[0].degree,3)
})
