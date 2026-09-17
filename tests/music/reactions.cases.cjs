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

test('check bypasses entry masks for all attackers without altering the saved kit', () => {
  const kit = creative.createDusseldorfSession()
  kit.instruments['w:e2'].mask = '~'
  kit.instruments['w:e1'].mask = '~'
  const during = model.gameMusicStateFromHistory(['e4', 'd5', 'Bb5+'])
  const snapshot = { ...creative.creativeSnapshot(kit, true), pieces: during.pieces }
  for (const id of ['w:e2', 'w:e1']) assert.equal(voiceSpecs(snapshot, null).find(v => v.piece.id === id).mask, undefined)
  assert.equal(kit.instruments['w:e2'].mask, '~')
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
  const first=s=>Number(voiceSpecs(s,null).find(v=>v.piece.id==='w:b1').notes.match(/-?\d+(?:\.\d+)?/)[0])
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
