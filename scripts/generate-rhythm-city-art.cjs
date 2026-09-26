// Original vector postcards, deliberately illustrations rather than stock photographs.
const fs = require('node:fs')
const { loadTs } = require('../tests/helpers/music.cjs')
const { RHYTHM_STAGES } = loadTs('lib/rhythm-stages.ts')
const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;')
fs.mkdirSync('public/cities/rhythm',{recursive:true})
for (const [index,stage] of RHYTHM_STAGES.entries()) {
 const bars = Array.from({length:18},(_,i)=>{const height=40+((i*37+index*19)%130);return `<rect x="${i*52}" y="${370-height}" width="${24+i%3*7}" height="${height}" fill="${stage.color}" opacity="${.10+i%4*.035}"/>`}).join('')
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#0c191e"/><stop offset="1" stop-color="#23372d"/></linearGradient></defs><rect width="960" height="600" fill="url(#sky)"/><circle cx="730" cy="140" r="82" fill="${stage.color}" opacity=".65"/><path d="M0 340 Q180 180 350 340 T700 320 T960 350 V600 H0Z" fill="${stage.color}" opacity=".08"/>${bars}<path d="M0 405 Q180 365 480 420 T960 410 M0 443 Q210 407 480 455 T960 445 M0 483 Q170 448 480 490 T960 480" fill="none" stroke="${stage.color}" stroke-opacity=".25" stroke-width="2"/><text x="52" y="85" font-family="sans-serif" font-size="16" letter-spacing="5" fill="${stage.color}">RHYTHM ATLAS · ${stage.year}</text><text x="52" y="150" font-family="sans-serif" font-size="${stage.name.length>18?38:52}" fill="#edf1e7">${escape(stage.name)}</text><text x="54" y="195" font-family="sans-serif" font-size="22" fill="${stage.color}">${escape(stage.genre)}</text><text x="52" y="548" font-family="monospace" font-size="46" fill="#edf1e7">${stage.meter}</text><text x="870" y="550" text-anchor="end" font-family="sans-serif" font-size="16" letter-spacing="3" fill="${stage.color}">${escape(stage.country.toUpperCase())}</text></svg>`
 fs.writeFileSync(`public/cities/rhythm/${stage.id}.svg`,svg+'\n')
}
