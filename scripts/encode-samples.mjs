// Encode every WAV under public/samples to Ogg Opus (64 kbps) and AAC in M4A (80 kbps), then remove the WAV.
// Browsers that report Ogg Opus as "probably" load the .ogg; the others (older Safari) load the .m4a.
// Run after any sample generator: node scripts/encode-samples.mjs [folder]   (requires ffmpeg)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'samples')
const folder = process.argv[2] ? path.resolve(process.argv[2]) : root
const wavs = fs.readdirSync(folder, { recursive: true }).map(file => path.join(folder, String(file))).filter(file => file.endsWith('.wav'))
let before = 0, after = 0
for (const wav of wavs) {
  const base = wav.slice(0, -4)
  const run = (...args) => execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', wav, '-map_metadata', '-1', ...args], { stdio: 'inherit' })
  run('-c:a', 'libopus', '-b:a', '64k', '-vbr', 'on', '-application', 'audio', `${base}.ogg`)
  run('-c:a', 'aac', '-b:a', '80k', '-movflags', '+faststart', `${base}.m4a`)
  before += fs.statSync(wav).size
  after += fs.statSync(`${base}.ogg`).size
  fs.rmSync(wav)
}
console.log(`${wavs.length} samples: ${(before / 1e6).toFixed(2)} MB WAV → ${(after / 1e6).toFixed(2)} MB Opus (plus the M4A fallback)`)
