// Decode a freely licensed Freesound preview into temporary PCM for the bank
// preparation script. The decoder is a development dependency only.
import fs from 'node:fs'
import decode from '@audio/decode-mp3'

const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('usage: node scripts/decode-samba-preview.mjs input.mp3 output.wav')
const { channelData, sampleRate } = await decode(fs.readFileSync(input))
const count = channelData[0].length
const pcm = Buffer.alloc(count * 2)
for (let index = 0; index < count; index++) {
  const value = channelData.reduce((sum, channel) => sum + channel[index], 0) / channelData.length
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value * 32767))), index * 2)
}
const wav = Buffer.alloc(44 + pcm.length)
wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28)
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36)
wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44)
fs.writeFileSync(output, wav)
