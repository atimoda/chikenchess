// Original concert studies: pitch names and eighth-note durations, one row/bar.
// These melodies are newly written; the references inform form and orchestration.
const phrase = text => text.trim().split('|').map(bar=>bar.trim())
const venice = {
  id:'venice-1725',name:'Marés de vidro · concerto da laguna',root:'D',bpm:116,meter:'4/4',ticks:8,
  url:'https://www.laphil.com/works/the-four-seasons',
  reference:'Vivaldi, The Four Seasons: ritornello, solo/tutti, lyrical refuge and storm. Original notes; Venice is the setting, not a claim about the publication city.',
  bars:[8,16,16,8,8,16,16,8],
  form:[[0,8,'Intro'],[1,16,'Hook'],[2,16,'Solo'],[1,8,'Chorus'],[3,8,'Interlude'],[2,8,'Solo'],[4,8,'Bridge'],[5,16,'Verse'],[3,8,'Break'],[6,16,'Chorus'],[2,8,'Solo'],[7,8,'Outro']],
  harmony:['Dm Dm Bb Gm Dm/F Eø A7 A7','Dm A7 Dm C7 F Gm A7 Dm','F C7 Dm Am Bb Gm A7 Dm','F C/E Dm Am Bb F/A Gm C7','Gm D7 Gm C7 F Eø A7 Dm','Dm Gm C7 F Bb Eø A7 Dm','Dm A7 Dm C7 F Gm A7 Dm','Bb Gm Dm/A A7 Dm Gm A7 Dm'],
  theme:phrase(`d5:2 a4:1 d5:1 f5:2 e5:1 d5:1 | c#5:1 e5:1 a5:2 g5:1 f5:1 e5:2 | f5:1 e5:1 d5:2 a4:1 c5:1 d5:2 | e5:2 g5:1 bb5:1 a5:1 g5:1 e5:2 | f5:3 a5:1 g5:1 f5:1 e5:1 d5:1 | bb4:2 d5:1 g5:1 f5:1 e5:1 d5:2 | c#5:1 d5:1 e5:1 f5:1 e5:2 c#5:2 | d5:4 a4:2 .:2 | a5:2 f5:1 d5:1 a4:2 d5:2 | e5:1 f5:1 g5:2 a5:1 g5:1 e5:2 | f5:2 a5:1 g5:1 f5:1 e5:1 d5:2 | g5:1 f5:1 e5:1 d5:1 c5:2 bb4:2 | a4:1 c5:1 f5:2 a5:1 g5:1 f5:2 | g5:2 bb5:1 a5:1 g5:2 d5:2 | e5:1 g5:1 f5:1 e5:1 d5:1 c#5:1 e5:2 | d5:3 a4:1 d5:2 .:2`),
  solo:phrase(`a5:1 g5:1 f5:1 e5:1 f5:1 a5:1 c6:1 a5:1 | g5:1 e5:1 c5:1 e5:1 g5:2 e5:1 c5:1 | f5:1 a5:1 d6:2 c6:1 bb5:1 a5:1 f5:1 | e5:2 c5:1 a4:1 c5:1 e5:1 a5:2 | f5:1 d5:1 bb4:1 d5:1 f5:1 bb5:1 a5:1 f5:1 | g5:2 d5:1 bb4:1 a4:1 bb4:1 d5:2 | e5:1 f5:1 e5:1 d5:1 c#5:1 b4:1 c#5:2 | d5:4 .:4 | c6:1 a5:1 f5:1 a5:1 c6:2 a5:2 | bb5:1 a5:1 g5:1 f5:1 e5:2 c5:2 | a5:1 f5:1 d5:1 f5:1 a5:1 d6:1 c6:1 a5:1 | a5:2 e5:1 c5:1 e5:2 .:2 | bb5:1 a5:1 f5:2 d5:1 f5:1 bb5:2 | a5:1 g5:1 f5:1 e5:1 d5:2 bb4:2 | c#5:1 e5:1 a5:1 g5:1 f5:1 e5:1 c#5:2 | d5:6 .:2`),
  lyric:phrase(`a4:4 c5:2 a4:2 | g4:3 e4:1 g4:2 c5:2 | f5:3 e5:1 d5:2 a4:2 | c5:4 b4:1 c5:1 e5:2 | d5:3 c5:1 bb4:2 f4:2 | a4:2 c5:2 f5:3 e5:1 | d5:3 c5:1 bb4:2 a4:2 | g4:2 e4:2 c5:2 .:2`),
  storm:phrase(`g5:1 d5:1 g5:1 a5:1 bb5:1 a5:1 g5:1 f5:1 | f#5:1 a5:1 c6:1 a5:1 f#5:1 e5:1 d5:2 | g5:1 bb5:1 a5:1 g5:1 d5:1 f5:1 g5:2 | e5:1 g5:1 bb5:1 g5:1 e5:1 d5:1 c5:2 | a5:1 g5:1 f5:1 e5:1 f5:2 c5:2 | g5:1 f5:1 e5:1 d5:1 bb4:2 g4:2 | a4:1 c#5:1 e5:1 g5:1 f5:1 e5:1 c#5:2 | d5:4 .:4`),
  counter:phrase(`f4:2 a4:2 d5:2 c5:2 | c#5:3 b4:1 a4:2 .:2 | a4:2 f4:1 e4:1 d4:2 a4:2 | bb4:2 g4:2 e4:3 .:1 | c5:2 a4:2 f4:2 a4:2 | bb4:1 a4:1 g4:2 d5:2 bb4:2 | a4:2 g4:2 e4:2 c#4:2 | d4:4 .:4 | f4:1 e4:1 d4:2 f4:2 a4:2 | g4:2 e4:2 c#4:2 e4:2 | a4:2 d5:2 c5:1 bb4:1 a4:2 | g4:3 e4:1 c4:2 .:2 | a4:2 c5:2 a4:1 g4:1 f4:2 | d5:2 bb4:2 g4:2 d4:2 | e4:1 g4:1 a4:2 g4:1 e4:1 c#4:2 | d4:6 .:2`),
}
const copenhagen = {
  id:'copenhagen-1869',name:'Aurora sobre o Øresund · concerto para piano',root:'A',bpm:88,meter:'4/4',ticks:8,
  url:'https://www.bso.org/works/grieg-piano-concerto',reference:'Grieg, Piano Concerto op.16: Nordic melodic inflections, dialogue, lyrical middle and dance character. Original notes; the 1869 Copenhagen premiere anchors the setting.',
  bars:[8,16,16,16,8,8,16,8],
  form:[[0,8,'Intro'],[1,16,'Verse'],[2,16,'Solo'],[1,8,'Chorus'],[3,16,'Interlude'],[4,8,'Bridge'],[5,8,'Solo'],[3,8,'Break'],[6,16,'Chorus'],[2,8,'Post-Chorus'],[6,8,'Hook'],[7,8,'Outro']],
  harmony:['Am E7 Am F Dm Bø E7 E7','Am G F C/E Dm Am/E E7 Am','C G/B Am Em F Dm G7 C','Db Ab/C Bbm Fm Gb Db/F Ebm Ab7','F#ø B7 Em A7 Dm Bø E7 Am','Am F Dm E7 C Bø E7 Am','A E7 F#m C#m D Bm E7 A','D Dm A/E E7 A D E7 A'],
  theme:phrase(`e5:3 c5:1 a4:2 b4:2 | d5:2 b4:1 a4:1 g4:2 b4:2 | c5:3 a4:1 f4:2 a4:2 | g4:4 e5:2 d5:2 | f5:3 e5:1 d5:2 a4:2 | c5:2 e5:2 a5:3 g5:1 | f5:2 e5:1 d5:1 b4:2 g#4:2 | a4:5 .:3 | c5:2 e5:1 a5:1 g5:2 e5:2 | d5:3 b4:1 g4:2 d5:2 | f5:3 e5:1 c5:2 a4:2 | g5:2 e5:2 c5:2 e5:2 | a5:3 g5:1 f5:2 d5:2 | e5:2 c5:2 b4:1 c5:1 e5:2 | d5:2 b4:1 a4:1 g#4:2 b4:2 | a4:6 .:2`),
  solo:phrase(`e5:1 g5:1 c6:2 b5:1 a5:1 g5:2 | d5:1 g5:1 b5:2 a5:1 g5:1 d5:2 | c5:1 e5:1 a5:1 c6:1 b5:1 a5:1 e5:2 | b4:1 e5:1 g5:2 f#5:1 e5:1 b4:2 | c5:1 f5:1 a5:1 c6:1 a5:2 f5:2 | d5:1 f5:1 a5:2 g5:1 f5:1 d5:2 | b4:1 d5:1 f5:1 g5:1 a5:1 g5:1 f5:1 d5:1 | e5:2 g5:2 c6:2 .:2 | g5:1 e5:1 c5:2 e5:1 g5:1 c6:2 | b5:1 a5:1 g5:1 f5:1 d5:2 b4:2 | e5:1 a5:1 c6:2 e6:1 d6:1 c6:2 | b5:1 g5:1 e5:2 g5:1 b5:1 e6:2 | c6:3 a5:1 f5:2 c5:2 | a5:1 f5:1 d5:2 f5:1 a5:1 d6:2 | b5:1 a5:1 g5:1 f5:1 d5:2 b4:2 | c5:3 e5:1 c6:2 .:2`),
  lyric:phrase(`f5:3 eb5:1 db5:2 ab4:2 | c5:4 eb5:2 ab5:2 | f5:4 db5:2 bb4:2 | c5:3 ab4:1 f4:2 ab4:2 | bb4:3 db5:1 gb5:2 f5:2 | eb5:2 db5:2 ab4:2 f4:2 | gb4:3 bb4:1 eb5:2 db5:2 | c5:4 ab4:2 .:2 | ab5:3 f5:1 db5:2 eb5:2 | eb5:3 c5:1 ab4:2 c5:2 | db5:2 f5:2 bb5:3 ab5:1 | g5:2 f5:2 c5:2 ab4:2 | gb5:3 f5:1 eb5:2 db5:2 | f5:2 eb5:2 db5:2 ab4:2 | bb4:3 gb4:1 eb4:2 gb4:2 | ab4:6 .:2`),
  storm:phrase(`c5:1 f#5:1 a5:2 g5:1 f#5:1 e5:2 | d#5:1 f#5:1 a5:2 b5:1 a5:1 f#5:2 | g5:1 b5:1 e6:2 d6:1 c6:1 b5:2 | g5:1 e5:1 c#5:2 e5:1 g5:1 a5:2 | f5:1 a5:1 d6:2 c6:1 bb5:1 a5:2 | f5:1 d5:1 b4:2 d5:1 f5:1 a5:2 | g#5:1 b5:1 d6:1 b5:1 g#5:1 f5:1 e5:2 | a5:4 .:4`),
  counter:phrase(`c4:3 e4:1 a4:2 g4:2 | b3:2 d4:2 g4:2 .:2 | a3:3 c4:1 f4:2 e4:2 | g3:2 c4:2 e4:3 .:1 | a3:2 d4:2 f4:2 e4:2 | e4:3 c4:1 a3:2 c4:2 | b3:2 d4:2 g#4:2 e4:2 | a3:5 .:3 | e4:3 c4:1 a3:2 c4:2 | d4:2 g4:2 b4:2 a4:2 | a4:3 g4:1 f4:2 c4:2 | e4:2 c4:2 g3:2 c4:2 | f4:3 e4:1 d4:2 a3:2 | c4:2 e4:2 a4:2 g4:2 | f4:2 e4:2 d4:1 b3:1 g#3:2 | a3:6 .:2`),
}
const paris = {
  id:'paris-1913',name:'A terra desperta · balé dos primeiros passos',root:'D',bpm:210,meter:'7/8',ticks:7,
  url:'https://www.laphil.com/works/the-rite-of-spring',reference:'Stravinsky, The Rite of Spring and The Firebird: displaced accents, octatonic color, orchestral blocks and luminous contrast. Original notes, fixed 7/8 study rather than the original changing meters.',
  bars:[8,8,8,8,8,8,8,8],
  form:[[0,4,'Intro'],[1,8,'Verse'],[2,4,'Hook'],[3,8,'Chorus'],[4,4,'Break'],[5,8,'Interlude'],[2,4,'Turnaround'],[6,8,'Bridge'],[5,8,'Solo'],[1,4,'Pre-Chorus'],[3,8,'Chorus'],[7,4,'Outro']],
  harmony:['Dm Dm Eb Dm Gm Eb A7 Dm','Dm Eb Dm F#dim Dm Ab Dm A7','Eb Dm Ab Dm Eb A7 Bb A7','Dm Eb F#dim A7 Bb Gm Eb Dm','Bbm Gb Dø F7 Bbm Ebm F7 Bbm','Dmaj7 A/C# Bm F#m Gmaj7 D/F# Em A7','Dm Ab Dm Eb F#dim A7 Eb Dm','D G/D D A7 D G D D'],
  theme:phrase(`d4:2 f4:1 eb4:1 d4:1 a3:2 | eb4:1 g4:2 bb4:1 a4:1 g4:2 | f4:1 d4:1 a3:2 d4:1 eb4:1 f4:1 | f#4:2 a4:1 c5:1 eb5:1 c5:2 | a4:1 f4:2 d4:1 eb4:1 f4:2 | ab4:2 c5:1 eb5:2 c5:1 ab4:1 | a4:1 f4:1 d4:1 a3:2 d4:2 | c#4:2 e4:1 g4:1 bb4:1 a4:2`),
  solo:phrase(`g5:2 bb5:1 ab5:1 g5:1 eb5:2 | f5:1 d5:1 a4:1 d5:2 f5:2 | c6:1 ab5:2 eb5:1 c5:1 eb5:2 | a4:2 d5:1 f5:1 eb5:1 d5:2 | bb5:1 g5:1 eb5:2 g5:1 ab5:1 bb5:1 | g5:2 e5:1 c#5:1 bb4:1 a4:2 | f5:1 d5:2 bb4:1 c5:1 d5:2 | e5:1 c#5:1 a4:2 g4:1 e4:2`),
  lyric:phrase(`f#5:3 e5:1 d5:3 | e5:2 c#5:1 a4:2 .:2 | d5:3 f#5:2 b5:2 | a5:2 f#5:1 c#5:2 .:2 | b4:2 d5:1 g5:2 f#5:2 | a5:3 f#5:1 d5:3 | e5:2 g5:1 b5:2 a5:2 | g5:2 e5:1 c#5:2 .:2`),
  storm:phrase(`d5:1 eb5:1 f5:1 a5:2 f5:1 d5:1 | eb5:2 bb5:1 g5:1 eb5:1 d5:2 | c6:1 a5:1 f#5:2 eb5:1 c5:2 | c#5:1 e5:1 g5:1 bb5:1 a5:1 g5:2 | f5:2 bb5:1 a5:1 f5:1 d5:2 | g5:1 bb5:1 d6:2 c6:1 bb5:2 | bb5:2 g5:1 eb5:1 d5:1 eb5:2 | a5:1 f5:1 d5:2 .:3`),
  counter:phrase(`a3:3 d4:1 f4:1 e4:2 | bb3:2 eb4:1 g4:2 .:2 | a3:1 d4:2 f4:1 eb4:1 d4:2 | c4:2 eb4:1 f#4:1 a4:1 c5:2 | d4:2 a3:1 f3:2 .:2 | eb4:1 c4:2 ab3:1 c4:1 eb4:2 | f4:2 eb4:1 d4:2 a3:2 | g4:2 e4:1 c#4:2 .:2`),
}
module.exports = {venice,copenhagen,paris}
