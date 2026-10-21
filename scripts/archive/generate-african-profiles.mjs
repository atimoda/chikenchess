// Archived one-off generator: the African profiles it produced live in data/music/profiles/. Run from the repo root.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { styleProfileSchema } = require('../../tests/helpers/music.cjs').loadTs('lib/admin/validation.ts');

function makePart({
  role, name, behavior, bank, asset, variant = 0, pitched = true,
  patterns, bars = 1, octave = 3, gain = 0.2, attack = 0.005,
  decay = 0.18, sustain = 0.5, release = 0.12, clip = 0.9,
  lpf = 9000, hpf = 20, distortion, distortionMix, pitchEnvelope, pitchAttack,
  active = [true, true, true, true, true, true]
}) {
  const part = {
    role,
    name,
    behavior,
    source: {
      kind: 'sample',
      bank,
      asset,
      variant,
      pitched
    },
    patterns,
    bars,
    octave,
    gain,
    attack,
    decay,
    sustain,
    release,
    clip,
    lpf,
    hpf,
    arrangement: {
      active,
      restart: true,
      variations: [0, 1, 2, 3, 4, 5]
    }
  };
  if (distortion !== undefined) part.distortion = distortion;
  if (distortionMix !== undefined) part.distortionMix = distortionMix;
  if (pitchEnvelope !== undefined) part.pitchEnvelope = pitchEnvelope;
  if (pitchAttack !== undefined) part.pitchAttack = pitchAttack;
  return part;
}

const profiles = {};

// 1. Luanda 1982 · Kizomba (4/4, 94 BPM, D Natural Minor)
profiles['luanda-1982'] = {
  name: "Luanda 1982 · Kizomba",
  bpm: 94,
  meter: "4/4",
  root: "D",
  scale: "Menor natural",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 5, 3, 0],
    [3, 0],
    [0, 3, 5, 0],
    [5, 3, 4, 0],
    [0, 4, 5, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Original kizomba study inspired by the late-1970s and 1980s Luanda musseque fusion of Angolan semba, French Antillean zouk and Cabo Verde coladeira. Key reference: Eduardo Paim – Rosa Baila.",
  url: "https://en.wikipedia.org/wiki/Kizomba",
  parts: [
    makePart({ role: 'rhythm', name: 'Deep Kick Drum', behavior: 'pulse', bank: 'electro', asset: 'kick', variant: 0, pitched: false,
      gain: 0.32, attack: 0.002, decay: 0.22, release: 0.1, lpf: 4500,
      patterns: [
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . 0 . . . . . 0 .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . 0 . . . 0 . . .",
        "0 . . . . . . . 0 . . . . . 0 .",
        "0 . . . . . . . 0 . . . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Zouk Snare & Rim', behavior: 'pulse', bank: 'electro', asset: 'rim', variant: 0, pitched: false,
      gain: 0.26, attack: 0.002, decay: 0.15, release: 0.08, lpf: 8500,
      patterns: [
        ". . . 0 . . 0 . . . . 0 . . 0 .",
        ". . . 0 . . 0 . . . . 0 . 0 0 .",
        ". . . 0 . . 0 . . . . 0 . . 0 .",
        ". . . 0 . . 0 . . . 0 0 . . 0 .",
        ". . . 0 . . 0 . . . . 0 . . 0 0",
        ". . . 0 . . 0 . . . . 0 . . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Closed Hi-Hat', behavior: 'pulse', bank: 'percussion', asset: 'hat', variant: 0, pitched: false,
      gain: 0.18, attack: 0.002, decay: 0.08, release: 0.04, lpf: 11000,
      patterns: [
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 .",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 0 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Shaker Groove', behavior: 'pulse', bank: 'percussion', asset: 'shaker', variant: 0, pitched: false,
      gain: 0.19, attack: 0.003, decay: 0.1, release: 0.05,
      patterns: [
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0",
        ". 0 . 0 . 0 0 0 . 0 . 0 . 0 0 0",
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0",
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 0 0",
        ". 0 . 0 . 0 0 0 . 0 . 0 . 0 0 0",
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Electronic Clap', behavior: 'pulse', bank: 'electro', asset: 'clap', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.14, release: 0.06, active: [false, true, false, true, true, true],
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'bass', name: 'Sub Bass Anchor', behavior: 'pulse', bank: 'synths', asset: 'sub', octave: 2,
      gain: 0.28, attack: 0.005, decay: 0.25, sustain: 0.6, release: 0.15, lpf: 3000,
      patterns: [
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . 0 . . . . . 0 .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . 0 . . . 2 . . .",
        "0 . . . . . . . 0 . . . . . 0 .",
        "0 . . . . . . . 0 . . . . . . ."
      ] }),
    makePart({ role: 'bass', name: 'Warm Electric Bass', behavior: 'phrase', bank: 'strings', asset: 'bass-round', octave: 2,
      gain: 0.27, attack: 0.005, decay: 0.22, sustain: 0.6, release: 0.12, lpf: 4000,
      patterns: [
        "0 . . 0 . . 0 . . . 0 . 2 . . .",
        "0 . . 0 . . 0 . . . 0 . 2 . 3 .",
        "0 . . . . . 0 . . . . . 2 . . .",
        "0 . . 0 . . 0 . . . 2 . 3 . 2 .",
        "0 . . 0 . . 0 . . . 0 . 2 . 3 .",
        "0 . . 0 . . 0 . . . 0 . 2 . . ."
      ] }),
    makePart({ role: 'harmony', name: 'Nylon Guitar Arpeggios', behavior: 'phrase', bank: 'guitars', asset: 'nylon', octave: 3,
      gain: 0.24, attack: 0.004, decay: 0.24, sustain: 0.5, release: 0.16,
      patterns: [
        "0 . 2 . 4 . 2 . 0 . 2 . 4 . 2 .",
        "0 . 2 . 4 . 5 . 4 . 2 . 4 . 2 .",
        "0 . . . 4 . . . 0 . . . 4 . . .",
        "0 . 2 4 5 . 4 . 0 . 2 4 5 . 4 .",
        "0 . 2 . 4 . 5 . 7 . 5 . 4 . 2 .",
        "0 . 2 . 4 . 2 . 0 . 2 . 4 . 2 ."
      ] }),
    makePart({ role: 'harmony', name: 'Clean Guitar Chops', behavior: 'phrase', bank: 'guitars', asset: 'clean', octave: 3,
      gain: 0.21, attack: 0.003, decay: 0.15, sustain: 0.4, release: 0.1, active: [false, true, true, true, true, true],
      patterns: [
        ". . 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4 .",
        ". . 0,2,4 . . . 0,2,4 . . . 0,2,4 . . 0,2,4 . .",
        ". . 0,2,4 . . . . . . . . . 0,2,4 . . . . . . .",
        ". . 0,2,4 . . . 0,2,4 . . 0,2,4 . . . 0,2,4 . .",
        ". . 0,2,4 . . . 0,2,4 . . . 0,2,4 . . 0,2,4 . .",
        ". . 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4 ."
      ] }),
    makePart({ role: 'harmony', name: 'Rhodes Electric Piano', behavior: 'sustain', bank: 'keys', asset: 'rhodes', octave: 3,
      gain: 0.23, attack: 0.006, decay: 0.35, sustain: 0.65, release: 0.22,
      patterns: [
        "0,2,4 . . . . . . . 2,4,6 . . . . . . .",
        "0,2,4 . . . . . . . 3,5,7 . . . . . . .",
        "0,2,4 . . . . . . . . . . . . . . . . .",
        "0,2,4 . . . . . . 2,4,6 . . . . . . . .",
        "0,2,4 . . . . . . . 3,5,7 . . . . . . .",
        "0,2,4 . . . . . . . 2,4,6 . . . . . . ."
      ] }),
    makePart({ role: 'texture', name: 'Warm Analog Pad', behavior: 'sustain', bank: 'synths', asset: 'analog-pad', octave: 3,
      gain: 0.19, attack: 0.02, decay: 0.4, sustain: 0.75, release: 0.3,
      patterns: [
        "0,2,4 . . . . . . . . . . . . . . . . .",
        "0,2,4 . . . . . . . 2,4,6 . . . . . . .",
        "0,2,4 . . . . . . . . . . . . . . . . .",
        "0,2,4 . . . . . . . 3,5,7 . . . . . . .",
        "0,2,4 . . . . . . . 2,4,6 . . . . . . .",
        "0,2,4 . . . . . . . . . . . . . . . . ."
      ] }),
    makePart({ role: 'melody', name: 'Tenor Saxophone Lead', behavior: 'phrase', bank: 'band', asset: 'tenor-sax', octave: 3,
      gain: 0.24, attack: 0.006, decay: 0.3, sustain: 0.6, release: 0.2, active: [false, true, false, true, true, true],
      patterns: [
        "4 . . 5 . 4 . 2 . . . 0 . . . .",
        "4 . . 5 . 7 . 5 . . 4 . 2 . . .",
        "2 . . 3 . 2 . 0 . . . . . . . .",
        "4 . 5 7 . 5 . 4 . . 2 . 0 . . .",
        "5 . . 7 . 8 . 7 . . 5 . 4 . . .",
        "4 . . 5 . 4 . 2 . . . 0 . . . ."
      ] }),
    makePart({ role: 'response', name: 'Tenor Sax Echo', behavior: 'phrase', bank: 'band', asset: 'tenor-sax', octave: 3,
      gain: 0.21, attack: 0.008, decay: 0.26, sustain: 0.5, release: 0.18, active: [false, false, true, true, true, false],
      patterns: [
        ". . . . . . . . 2 . 4 . 5 . 4 .",
        ". . . . . . . . 4 . 5 . 7 . 5 .",
        ". . . . . . . . 0 . 2 . 3 . 2 .",
        ". . . . . . . . 2 . 4 . 5 . 4 .",
        ". . . . . . . . 5 . 7 . 8 . 7 .",
        ". . . . . . . . 2 . 4 . 5 . 4 ."
      ] }),
    makePart({ role: 'melody', name: 'FM Bell Tines', behavior: 'phrase', bank: 'synths', asset: 'fm-bell', octave: 4,
      gain: 0.18, attack: 0.002, decay: 0.2, sustain: 0.3, release: 0.15, active: [false, true, true, true, false, true],
      patterns: [
        ". . 7 . . . 6 . . . 5 . . . 4 .",
        ". . 7 . . 8 7 . . . 5 . . . 4 .",
        ". . 5 . . . 4 . . . 3 . . . 2 .",
        ". . 7 . . . 6 . . 5 4 . . . 2 .",
        ". . 8 . . . 7 . . . 5 . . . 4 .",
        ". . 7 . . . 6 . . . 5 . . . 4 ."
      ] }),
    makePart({ role: 'texture', name: 'Vocal Choir Ambient', behavior: 'sustain', bank: 'synths', asset: 'choir', octave: 3,
      gain: 0.17, attack: 0.03, decay: 0.4, sustain: 0.7, release: 0.35,
      patterns: [
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 2 . . . . . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 3 . . . . . . .",
        "2 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . . . . . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Percussion Tom Fill', behavior: 'pulse', bank: 'percussion', asset: 'tom', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.18, release: 0.08, active: [false, true, false, true, true, true],
      patterns: [
        ". . . . . . . 0 . . . . . . 0 0",
        ". . . . . . . 0 . . . . . 0 0 0",
        ". . . . . . . . . . . . . . 0 .",
        ". . . . . . 0 0 . . . . . . 0 0",
        ". . . . . . . 0 . . . 0 . 0 0 0",
        ". . . . . . . 0 . . . . . . 0 0"
      ] })
  ]
};

// 2. Luanda 1965 · Semba (4/4, 108 BPM, G Major)
profiles['luanda-1965'] = {
  name: "Luanda 1965 · Semba",
  bpm: 108,
  meter: "4/4",
  root: "G",
  scale: "Maior",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 3, 4, 0],
    [4, 0],
    [0, 4, 3, 0],
    [3, 4, 1, 0],
    [0, 1, 4, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Festive study of traditional Angolan semba, direct ancestor to Brazilian samba. Built on rattling bamboo dikanza scrapers, syncopated ngoma congas, cascading acoustic guitars and carnival brass. Reference: Bonga – Mariquinha.",
  url: "https://en.wikipedia.org/wiki/Semba",
  parts: [
    makePart({ role: 'rhythm', name: 'Surdo Fundo Bass Drum', behavior: 'pulse', bank: 'sambaReggae', asset: 'surdo-fundo', variant: 0, pitched: false,
      gain: 0.3, attack: 0.002, decay: 0.25, release: 0.1, lpf: 4500,
      patterns: [
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . 0 . 0 . . . . . . .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . 0 0 . . . . . 0 .",
        "0 . . . . . 0 . 0 . . . . . 0 .",
        "0 . . . . . . . 0 . . . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Dikanza Bamboo Scraper', behavior: 'pulse', bank: 'sambaReggae', asset: 'chocalho', variant: 0, pitched: false,
      gain: 0.23, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 0 . 0 0 0 . 0 0 0 . 0 0 0 . 0",
        "0 0 . 0 0 0 0 0 0 0 . 0 0 0 0 0",
        "0 . . 0 0 . . 0 0 . . 0 0 . . 0",
        "0 0 . 0 0 0 . 0 0 0 . 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 . 0",
        "0 0 . 0 0 0 . 0 0 0 . 0 0 0 . 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Ngoma Conga Open', behavior: 'pulse', bank: 'percussion', asset: 'conga', variant: 0, pitched: false,
      gain: 0.25, attack: 0.003, decay: 0.18, release: 0.08,
      patterns: [
        "0 . . 0 . 0 . . 0 . . 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 . .",
        "0 . . . . 0 . . 0 . . . . 0 . .",
        "0 . 0 0 . 0 . . 0 . 0 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 0 .",
        "0 . . 0 . 0 . . 0 . . 0 . 0 . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Ngoma Conga Slap', behavior: 'pulse', bank: 'percussion', asset: 'muted-conga', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.12, release: 0.05,
      patterns: [
        ". . 0 . . . 0 . . . 0 . . . 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 .",
        ". . 0 . . . . . . . 0 . . . . .",
        ". . 0 . . 0 0 . . . 0 . . 0 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 0",
        ". . 0 . . . 0 . . . 0 . . . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Snare Caixa Accent', behavior: 'pulse', bank: 'sambaReggae', asset: 'caixa', variant: 0, pitched: false,
      gain: 0.24, attack: 0.002, decay: 0.14, release: 0.06, active: [false, true, true, true, true, true],
      patterns: [
        "0 . 0 0 . 0 0 . 0 . 0 0 . 0 0 .",
        "0 . 0 0 . 0 0 . 0 0 0 0 . 0 0 .",
        "0 . . . . 0 0 . 0 . . . . 0 0 .",
        "0 . 0 0 . 0 0 0 0 . 0 0 . 0 0 0",
        "0 . 0 0 . 0 0 . 0 0 0 0 . 0 0 0",
        "0 . 0 0 . 0 0 . 0 . 0 0 . 0 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Carnival Tambourine', behavior: 'pulse', bank: 'percussion', asset: 'tambourine', variant: 0, pitched: false,
      gain: 0.19, attack: 0.003, decay: 0.1, release: 0.05,
      patterns: [
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0",
        ". 0 . 0 . 0 0 0 . 0 . 0 . 0 0 0",
        ". 0 . . . 0 . . . 0 . . . 0 . .",
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 0 0",
        ". 0 . 0 . 0 0 0 . 0 . 0 . 0 0 0",
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0"
      ] }),
    makePart({ role: 'bass', name: 'Agile Hollowbody Bass', behavior: 'phrase', bank: 'guitars', asset: 'bass', octave: 2,
      gain: 0.28, attack: 0.004, decay: 0.22, sustain: 0.55, release: 0.12,
      patterns: [
        "0 . . 0 . 4 . 0 . . 0 . 2 . 4 .",
        "0 . . 0 . 4 . 0 . 2 3 . 4 . 0 .",
        "0 . . . . 4 . . 0 . . . . 4 . .",
        "0 . 2 0 . 4 . 0 . 0 2 . 4 . 0 .",
        "0 . . 0 . 4 . 0 . 2 3 . 4 . 5 .",
        "0 . . 0 . 4 . 0 . . 0 . 2 . 4 ."
      ] }),
    makePart({ role: 'harmony', name: 'Classical Nylon Cascades', behavior: 'phrase', bank: 'guitars', asset: 'nylon', octave: 3,
      gain: 0.25, attack: 0.003, decay: 0.22, sustain: 0.5, release: 0.14,
      patterns: [
        "0 . 2 4 0 . 2 4 0 . 2 4 0 . 2 4",
        "0 . 2 4 5 . 4 2 0 . 2 4 5 . 4 2",
        "0 . . 4 . . 2 . 0 . . 4 . . 2 .",
        "0 2 4 5 4 2 4 2 0 2 4 5 4 2 4 2",
        "0 . 2 4 5 7 5 4 0 . 2 4 5 7 5 4",
        "0 . 2 4 0 . 2 4 0 . 2 4 0 . 2 4"
      ] }),
    makePart({ role: 'harmony', name: 'Clean Guitar Chops', behavior: 'phrase', bank: 'guitars', asset: 'clean', octave: 3,
      gain: 0.22, attack: 0.003, decay: 0.16, sustain: 0.4, release: 0.1, active: [false, true, true, true, true, true],
      patterns: [
        ". 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4",
        ". 0,2,4 . . . 0,2,4 . . 0,2,4 . . . 0,2,4 .",
        ". 0,2,4 . . . . . . . . 0,2,4 . . . . . . .",
        ". 0,2,4 . . 0,2,4 . . . 0,2,4 . . 0,2,4 . .",
        ". 0,2,4 . . . 0,2,4 . . 0,2,4 . . . 0,2,4 0",
        ". 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4"
      ] }),
    makePart({ role: 'harmony', name: 'Muted Guitar Chank', behavior: 'phrase', bank: 'guitars', asset: 'muted', octave: 3,
      gain: 0.2, attack: 0.002, decay: 0.12, sustain: 0.3, release: 0.08,
      patterns: [
        "0 . . 0 . . 0 . 0 . . 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 .",
        "0 . . . . . 0 . 0 . . . . . 0 .",
        "0 . 0 0 . . 0 . 0 . 0 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 0",
        "0 . . 0 . . 0 . 0 . . 0 . . 0 ."
      ] }),
    makePart({ role: 'melody', name: 'Staccato Trumpet Call', behavior: 'phrase', bank: 'sambaReggae', asset: 'trompete', octave: 4,
      gain: 0.25, attack: 0.004, decay: 0.25, sustain: 0.6, release: 0.15, active: [false, true, false, true, true, true],
      patterns: [
        "4 . . 4 . 5 . 6 . . . 4 . . . .",
        "4 . . 5 . 7 . 6 . . 5 . 4 . . .",
        "2 . . 4 . . . . 0 . . . . . . .",
        "4 . 5 6 . 5 . 4 . . 2 . 0 . . .",
        "5 . . 6 . 7 . 8 . . 7 . 5 . . .",
        "4 . . 4 . 5 . 6 . . . 4 . . . ."
      ] }),
    makePart({ role: 'response', name: 'Tenor Sax Reply', behavior: 'phrase', bank: 'band', asset: 'tenor-sax', octave: 3,
      gain: 0.22, attack: 0.006, decay: 0.24, sustain: 0.55, release: 0.16, active: [false, false, true, true, true, false],
      patterns: [
        ". . . . . . . . 6 . 5 . 4 . 2 .",
        ". . . . . . . . 7 . 6 . 5 . 4 .",
        ". . . . . . . . 4 . 2 . 0 . . .",
        ". . . . . . . . 5 . 4 . 2 . 0 .",
        ". . . . . . . . 8 . 7 . 5 . 4 .",
        ". . . . . . . . 6 . 5 . 4 . 2 ."
      ] }),
    makePart({ role: 'response', name: 'Trombone Tenor Accent', behavior: 'sustain', bank: 'sambaReggae', asset: 'trombone', octave: 3,
      gain: 0.23, attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.18, active: [false, true, false, true, false, true],
      patterns: [
        "0 . . . . . . . 4 . . . . . . .",
        "0 . . . 2 . . . 4 . . . 2 . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . 2 . . . . 4 . . 2 . . . .",
        "0 . . . 4 . . . 5 . . . 4 . . .",
        "0 . . . . . . . 4 . . . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Agogô Bell Pattern', behavior: 'pulse', bank: 'sambaReggae', asset: 'agogo-agudo', variant: 0, pitched: false,
      gain: 0.21, attack: 0.002, decay: 0.12, release: 0.06,
      patterns: [
        "0 . . 0 . . 0 . 0 . . 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 .",
        "0 . . . . . 0 . 0 . . . . . 0 .",
        "0 . 0 0 . . 0 . 0 . 0 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 0",
        "0 . . 0 . . 0 . 0 . . 0 . . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Acoustic Room Claps', behavior: 'pulse', bank: 'drums', asset: 'room-clap', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.14, release: 0.06, active: [false, true, false, true, true, true],
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . . . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'melody', name: 'High Flute Fill', behavior: 'phrase', bank: 'classical', asset: 'flute-sustain', octave: 4,
      gain: 0.2, attack: 0.01, decay: 0.25, sustain: 0.5, release: 0.16, active: [false, false, true, false, true, true],
      patterns: [
        ". . . . . . . . 7 . 6 . 5 . 4 .",
        ". . . . . . . . 8 . 7 . 6 . 5 .",
        ". . . . . . . . 5 . 4 . 2 . 0 .",
        ". . . . . . . . 7 . 5 . 4 . 2 .",
        ". . . . . . . . 9 . 8 . 7 . 5 .",
        ". . . . . . . . 7 . 6 . 5 . 4 ."
      ] })
  ]
};

// 3. Lagos 1975 · Afrobeat (4/4, 115 BPM, G Dorian)
profiles['lagos-1975'] = {
  name: "Lagos 1975 · Afrobeat",
  bpm: 115,
  meter: "4/4",
  root: "G",
  scale: "Dórica",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 3, 4, 0],
    [3, 0],
    [0, 4, 3, 0],
    [3, 4, 2, 0],
    [0, 2, 4, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Hypnotic polyrhythmic Afrobeat study forged at Fela Kuti's Afrika Shrine in Lagos. Built on Tony Allen's interlocking drums, dual chicken-scratch guitars, militant horn fanfares and continuous shekere. Reference: Fela Kuti & Africa 70 – Zombie.",
  url: "https://en.wikipedia.org/wiki/Afrobeat",
  parts: [
    makePart({ role: 'rhythm', name: 'Tony Allen Kick', behavior: 'pulse', bank: 'percussion', asset: 'kick', variant: 0, pitched: false,
      gain: 0.31, attack: 0.002, decay: 0.2, release: 0.09, lpf: 5000,
      patterns: [
        "0 . . . . . 0 . . . 0 . . . . .",
        "0 . . . . . 0 . . . 0 . . . 0 .",
        "0 . . . . . . . . . 0 . . . . .",
        "0 . . . 0 . 0 . . . 0 . . . 0 .",
        "0 . . . . . 0 . . . 0 . 0 . 0 .",
        "0 . . . . . 0 . . . 0 . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Crisp Snare Backbeat', behavior: 'pulse', bank: 'percussion', asset: 'snare', variant: 0, pitched: false,
      gain: 0.27, attack: 0.002, decay: 0.16, release: 0.07, lpf: 9000,
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Snare Ghost Notes', behavior: 'pulse', bank: 'percussion', asset: 'ghost-snare', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        ". 0 0 . . 0 . 0 . 0 0 . . 0 . 0",
        ". 0 0 . . 0 0 0 . 0 0 . . 0 0 0",
        ". . 0 . . . 0 . . . 0 . . . 0 .",
        ". 0 0 . 0 0 . 0 . 0 0 . 0 0 . 0",
        ". 0 0 . . 0 0 0 . 0 0 . . 0 0 0",
        ". 0 0 . . 0 . 0 . 0 0 . . 0 . 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Hi-Hat Groove', behavior: 'pulse', bank: 'percussion', asset: 'hat', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.08, release: 0.04,
      patterns: [
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 .",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 0 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Shekere Gourd Shaker', behavior: 'pulse', bank: 'percussion', asset: 'shaker', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 . 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Agogô Clave Bell', behavior: 'pulse', bank: 'sambaReggae', asset: 'agogo-agudo', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.14, release: 0.06,
      patterns: [
        "0 . . 0 . . 0 . . . 0 . 0 . . .",
        "0 . . 0 . . 0 . . . 0 . 0 . 0 .",
        "0 . . . . . 0 . . . 0 . . . . .",
        "0 . . 0 . 0 0 . . . 0 . 0 . . .",
        "0 . . 0 . . 0 . . . 0 . 0 . 0 0",
        "0 . . 0 . . 0 . . . 0 . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'African Congas', behavior: 'pulse', bank: 'percussion', asset: 'conga', variant: 0, pitched: false,
      gain: 0.25, attack: 0.003, decay: 0.18, release: 0.08,
      patterns: [
        "0 . . 0 . 0 . . 0 . . 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 . .",
        "0 . . . . 0 . . 0 . . . . 0 . .",
        "0 . 0 0 . 0 . . 0 . 0 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 0 .",
        "0 . . 0 . 0 . . 0 . . 0 . 0 . ."
      ] }),
    makePart({ role: 'harmony', name: 'Chicken-Scratch Guitar', behavior: 'phrase', bank: 'guitars', asset: 'muted', octave: 3,
      gain: 0.23, attack: 0.002, decay: 0.12, sustain: 0.3, release: 0.08,
      patterns: [
        "0 . 0 . . 0 0 . 0 . 0 . . 0 0 .",
        "0 . 0 . . 0 0 0 0 . 0 . . 0 0 0",
        "0 . . . . 0 . . 0 . . . . 0 . .",
        "0 . 0 . 0 0 0 . 0 . 0 . 0 0 0 .",
        "0 . 0 . . 0 0 0 0 . 0 . . 0 0 0",
        "0 . 0 . . 0 0 . 0 . 0 . . 0 0 ."
      ] }),
    makePart({ role: 'harmony', name: 'Rhythm Funk Guitar', behavior: 'phrase', bank: 'guitars', asset: 'clean', octave: 3,
      gain: 0.22, attack: 0.003, decay: 0.16, sustain: 0.4, release: 0.1, active: [false, true, true, true, true, true],
      patterns: [
        ". . 0,2,4 . . . . . . . 0,2,4 . . . . .",
        ". . 0,2,4 . . . 0,2,4 . . 0,2,4 . . . .",
        ". . 0,2,4 . . . . . . . . . . . . . . .",
        ". . 0,2,4 . . 0,2,4 . . . 0,2,4 . . . .",
        ". . 0,2,4 . . . 0,2,4 . . 0,2,4 . . 0,2,4",
        ". . 0,2,4 . . . . . . . 0,2,4 . . . . ."
      ] }),
    makePart({ role: 'bass', name: 'Driving Bass Pick', behavior: 'phrase', bank: 'strings', asset: 'bass-pick', octave: 2,
      gain: 0.29, attack: 0.003, decay: 0.22, sustain: 0.6, release: 0.12, lpf: 4500,
      patterns: [
        "0 . . 0 . . 2 . 3 . . 2 . 0 . .",
        "0 . . 0 . . 2 . 3 . 4 3 . 2 . 0",
        "0 . . . . . 2 . . . . . . 0 . .",
        "0 . 2 0 . . 2 . 3 . . 2 . 0 . .",
        "0 . . 0 . . 2 . 3 . 4 5 . 3 . 2",
        "0 . . 0 . . 2 . 3 . . 2 . 0 . ."
      ] }),
    makePart({ role: 'melody', name: 'Afrika 70 Trumpet Lead', behavior: 'phrase', bank: 'sambaReggae', asset: 'trompete', octave: 4,
      gain: 0.26, attack: 0.004, decay: 0.26, sustain: 0.6, release: 0.16, active: [false, true, false, true, true, true],
      patterns: [
        "4 . . 5 . 4 . 3 . . 2 . 0 . . .",
        "4 . . 5 . 7 . 5 . . 4 . 3 . . .",
        "2 . . 3 . 2 . 0 . . . . . . . .",
        "4 . 5 7 . 5 . 4 . . 3 . 2 . . .",
        "5 . . 7 . 8 . 7 . . 5 . 4 . . .",
        "4 . . 5 . 4 . 3 . . 2 . 0 . . ."
      ] }),
    makePart({ role: 'melody', name: 'Tenor Saxophone Rip', behavior: 'phrase', bank: 'band', asset: 'tenor-sax', octave: 3,
      gain: 0.25, attack: 0.005, decay: 0.28, sustain: 0.6, release: 0.18, active: [false, true, true, true, true, true],
      patterns: [
        "0 . . 2 . 3 . 4 . . . . . . . .",
        "0 . . 2 . 3 . 4 . . 5 . 4 . . .",
        "0 . . . . 2 . . . . . . . . . .",
        "0 . 2 3 . 4 . 5 . . 4 . 3 . . .",
        "0 . . 2 . 3 . 4 . 5 7 . 5 . . .",
        "0 . . 2 . 3 . 4 . . . . . . . ."
      ] }),
    makePart({ role: 'response', name: 'Tenor Trombone Counter', behavior: 'phrase', bank: 'sambaReggae', asset: 'trombone', octave: 3,
      gain: 0.23, attack: 0.006, decay: 0.26, sustain: 0.55, release: 0.16, active: [false, false, true, true, true, false],
      patterns: [
        ". . . . . . . . 3 . . 2 . 0 . .",
        ". . . . . . . . 4 . . 3 . 2 . 0",
        ". . . . . . . . 2 . . 0 . . . .",
        ". . . . . . . . 3 . 4 3 . 2 . 0",
        ". . . . . . . . 5 . . 4 . 3 . 2",
        ". . . . . . . . 3 . . 2 . 0 . ."
      ] }),
    makePart({ role: 'harmony', name: 'Drawbar Organ Pad', behavior: 'sustain', bank: 'keys', asset: 'organ', octave: 3,
      gain: 0.2, attack: 0.01, decay: 0.35, sustain: 0.7, release: 0.25,
      patterns: [
        "0,2,4 . . . . . . . . . . . . . . .",
        "0,2,4 . . . . . . . 2,4,6 . . . . . . .",
        "0,2,4 . . . . . . . . . . . . . . .",
        "0,2,4 . . . . . . . 3,5,7 . . . . . . .",
        "0,2,4 . . . . . . . 2,4,6 . . . . . . .",
        "0,2,4 . . . . . . . . . . . . . . ."
      ] }),
    makePart({ role: 'harmony', name: 'Rhodes Tines Solo', behavior: 'phrase', bank: 'keys', asset: 'rhodes', octave: 4,
      gain: 0.22, attack: 0.004, decay: 0.25, sustain: 0.5, release: 0.16, active: [false, false, true, true, false, true],
      patterns: [
        ". . . . 4 . 5 . 7 . 5 . 4 . . .",
        ". . . . 5 . 7 . 8 . 7 . 5 . . .",
        ". . . . 2 . 3 . 4 . 3 . 2 . . .",
        ". . . . 4 . 5 . 7 5 4 . 2 . . .",
        ". . . . 7 . 8 . 9 . 8 . 7 . . .",
        ". . . . 4 . 5 . 7 . 5 . 4 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Cymbal Ride Tip', behavior: 'pulse', bank: 'percussion', asset: 'ride', variant: 0, pitched: false,
      gain: 0.21, attack: 0.002, decay: 0.2, release: 0.1,
      patterns: [
        "0 . . 0 . . 0 . 0 . . 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 .",
        "0 . . . . . 0 . 0 . . . . . 0 .",
        "0 . 0 0 . . 0 . 0 . 0 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 0",
        "0 . . 0 . . 0 . 0 . . 0 . . 0 ."
      ] })
  ]
};

console.log('3 styles prepared. Adding remaining 9...');

// 4. Essaouira 1980 · Gnawa (12/8, 118 BPM, C Natural Minor)
profiles['essaouira-1980'] = {
  name: "Essaouira 1980 · Gnawa",
  bpm: 118,
  meter: "12/8",
  root: "C",
  scale: "Menor natural",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 5, 3, 0],
    [3, 0],
    [0, 3, 5, 0],
    [5, 3, 4, 0],
    [0, 4, 5, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Spiritual trance study rooted in Moroccan Gnawa lila ceremonies. Driven by the three-string camel-skin guembri (sintir) lute, clattering iron krakebs castanets and mystical call-and-response chants. Reference: Maâlem Mahmoud Guinia – La Ilaha Illa Allah.",
  url: "https://en.wikipedia.org/wiki/Gnawa_music",
  parts: [
    makePart({ role: 'rhythm', name: 'Tbal Bass Drum', behavior: 'pulse', bank: 'percussion', asset: 'kick', variant: 0, pitched: false,
      gain: 0.32, attack: 0.002, decay: 0.26, release: 0.12, lpf: 4500,
      patterns: [
        "0 . . . . . 0 . . . . .",
        "0 . . . . 0 0 . . . . .",
        "0 . . . . . 0 . . . . .",
        "0 . . 0 . . 0 . . . . .",
        "0 . . . . 0 0 . . 0 . .",
        "0 . . . . . 0 . . . . ."
      ] }),
    makePart({ role: 'bass', name: 'Guembri Sintir Pluck', behavior: 'phrase', bank: 'guitars', asset: 'bass', octave: 2,
      gain: 0.29, attack: 0.002, decay: 0.28, sustain: 0.45, release: 0.1, lpf: 2000,
      patterns: [
        "0 . . 0 . 2 3 . . 2 . 0",
        "0 . . 0 . 2 3 . 4 3 . 2",
        "0 . . . . . 3 . . . . .",
        "0 . 2 3 . 2 3 . . 2 . 0",
        "0 . . 0 . 2 3 . 4 5 . 3",
        "0 . . 0 . 2 3 . . 2 . 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Guembri Body Tap', behavior: 'pulse', bank: 'electro', asset: 'rim', variant: 0, pitched: false,
      gain: 0.24, attack: 0.002, decay: 0.12, release: 0.06, lpf: 6000,
      patterns: [
        "0 . . . . . 0 . . . . .",
        "0 . . . . 0 0 . . . . .",
        "0 . . . . . 0 . . . . .",
        "0 . . 0 . . 0 . . 0 . .",
        "0 . . . . 0 0 . . . 0 .",
        "0 . . . . . 0 . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Krakebs Iron Castanets', behavior: 'pulse', bank: 'percussion', asset: 'tambourine', variant: 0, pitched: false,
      gain: 0.25, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 . 0 0 . 0 0 . 0 0 . 0",
        "0 0 0 0 . 0 0 0 0 0 . 0",
        "0 . . 0 . . 0 . . 0 . .",
        "0 . 0 0 . 0 0 . 0 0 0 0",
        "0 0 0 0 . 0 0 0 0 0 0 0",
        "0 . 0 0 . 0 0 . 0 0 . 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Krakebs Counter Galop', behavior: 'pulse', bank: 'electro', asset: 'rim', variant: 0, pitched: false,
      gain: 0.21, attack: 0.002, decay: 0.08, release: 0.04, lpf: 8000,
      patterns: [
        ". 0 . . 0 . . 0 . . 0 .",
        ". 0 0 . 0 0 . 0 0 . 0 0",
        ". 0 . . . . . 0 . . . .",
        ". 0 . . 0 . . 0 0 . 0 .",
        ". 0 0 . 0 0 . 0 0 . 0 0",
        ". 0 . . 0 . . 0 . . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Ceremonial Shaker', behavior: 'pulse', bank: 'percussion', asset: 'shaker', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 0 0 0 0 0 0 0 0 0 0 0",
        "0 . 0 0 . 0 0 . 0 0 . 0",
        "0 . . 0 . . 0 . . 0 . .",
        "0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 . 0 0 0 0 0 . 0 0 0",
        "0 0 0 0 0 0 0 0 0 0 0 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Hand Claps Roda', behavior: 'pulse', bank: 'drums', asset: 'room-clap', variant: 0, pitched: false,
      gain: 0.21, attack: 0.002, decay: 0.14, release: 0.06, active: [false, true, false, true, true, true],
      patterns: [
        "0 . . 0 . . 0 . . 0 . .",
        "0 . . 0 . 0 0 . . 0 . 0",
        "0 . . . . . 0 . . . . .",
        "0 . 0 0 . . 0 . 0 0 . .",
        "0 . . 0 . 0 0 . . 0 . 0",
        "0 . . 0 . . 0 . . 0 . ."
      ] }),
    makePart({ role: 'harmony', name: 'Guembri High Drone', behavior: 'phrase', bank: 'guitars', asset: 'clean', octave: 3,
      gain: 0.22, attack: 0.003, decay: 0.2, sustain: 0.45, release: 0.12,
      patterns: [
        "4 . . . . . 4 . . . . .",
        "4 . . 5 . . 4 . . 2 . .",
        "4 . . . . . . . . . . .",
        "4 . . 5 . 4 2 . . 0 . .",
        "4 . . 5 . . 7 . . 5 . .",
        "4 . . . . . 4 . . . . ."
      ] }),
    makePart({ role: 'bass', name: 'Low Trance Drone', behavior: 'sustain', bank: 'synths', asset: 'sub', octave: 2,
      gain: 0.26, attack: 0.01, decay: 0.4, sustain: 0.7, release: 0.25, lpf: 2500,
      patterns: [
        "0 . . . . . . . . . . .",
        "0 . . . . . 2 . . . . .",
        "0 . . . . . . . . . . .",
        "0 . . . . . 3 . . . . .",
        "2 . . . . . 0 . . . . .",
        "0 . . . . . . . . . . ."
      ] }),
    makePart({ role: 'melody', name: 'Spiritual Choir Lead', behavior: 'phrase', bank: 'synths', asset: 'choir', octave: 3,
      gain: 0.23, attack: 0.01, decay: 0.35, sustain: 0.65, release: 0.22, active: [false, true, false, true, true, true],
      patterns: [
        "0 . . 2 . . 3 . . 2 . .",
        "0 . . 2 . 3 4 . . 3 . 2",
        "0 . . . . . 2 . . . . .",
        "0 . 2 3 . 4 3 . . 2 . 0",
        "2 . . 3 . 4 5 . . 4 . 3",
        "0 . . 2 . . 3 . . 2 . ."
      ] }),
    makePart({ role: 'melody', name: 'Sufi Flute Breath', behavior: 'phrase', bank: 'classical', asset: 'flute-sustain', octave: 4,
      gain: 0.22, attack: 0.008, decay: 0.3, sustain: 0.6, release: 0.2, active: [false, false, true, true, true, true],
      patterns: [
        "4 . . 5 . . 7 . . 5 . .",
        "4 . . 5 . 7 8 . . 7 . 5",
        "2 . . 3 . . 4 . . 3 . .",
        "4 . 5 7 . 8 7 . . 5 . 4",
        "5 . . 7 . 8 10 . . 8 . 7",
        "4 . . 5 . . 7 . . 5 . ."
      ] }),
    makePart({ role: 'response', name: 'Sufi Flute Echo', behavior: 'phrase', bank: 'classical', asset: 'flute-sustain', octave: 4,
      gain: 0.2, attack: 0.01, decay: 0.28, sustain: 0.5, release: 0.18, active: [false, false, false, true, true, false],
      patterns: [
        ". . . . . . 3 . . 2 . 0",
        ". . . . . . 4 . . 3 . 2",
        ". . . . . . 2 . . 0 . .",
        ". . . . . . 3 . 2 0 . .",
        ". . . . . . 5 . . 4 . 3",
        ". . . . . . 3 . . 2 . 0"
      ] }),
    makePart({ role: 'harmony', name: 'Pizzicato Resonance', behavior: 'phrase', bank: 'strings', asset: 'pizzicato', octave: 3,
      gain: 0.21, attack: 0.003, decay: 0.18, sustain: 0.4, release: 0.1,
      patterns: [
        "0 . 2 . . 3 . 2 . 0 . .",
        "0 . 2 . 3 4 . 3 . 2 . 0",
        "0 . . . . 2 . . . . . .",
        "0 . 2 . . 3 . 4 . 3 . 2",
        "2 . 3 . . 4 . 5 . 4 . 3",
        "0 . 2 . . 3 . 2 . 0 . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Deep Gong Stroke', behavior: 'pulse', bank: 'sambaReggae', asset: 'agogo-grave', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.2, release: 0.1,
      patterns: [
        "0 . . . . . . . . . . .",
        "0 . . . . . 0 . . . . .",
        "0 . . . . . . . . . . .",
        "0 . . 0 . . . . . . . .",
        "0 . . . . . 0 . . . . .",
        "0 . . . . . . . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Ceremonial Tom Pulse', behavior: 'pulse', bank: 'percussion', asset: 'tom', variant: 0, pitched: false,
      gain: 0.23, attack: 0.002, decay: 0.18, release: 0.08, active: [false, true, false, true, true, true],
      patterns: [
        ". . . . . 0 . . . . . 0",
        ". . . . . 0 . . . . 0 0",
        ". . . . . . . . . . . 0",
        ". . . . 0 0 . . . . . 0",
        ". . . . . 0 . . . 0 0 0",
        ". . . . . 0 . . . . . 0"
      ] }),
    makePart({ role: 'texture', name: 'Cymbal Shimmer Swell', behavior: 'sustain', bank: 'percussion', asset: 'cymbal-tip', variant: 0, pitched: false,
      gain: 0.19, attack: 0.01, decay: 0.35, sustain: 0.6, release: 0.25,
      patterns: [
        "0 . . . . . . . . . . .",
        "0 . . . . . 0 . . . . .",
        "0 . . . . . . . . . . .",
        "0 . . . . . . . . . . .",
        "0 . . . . . 0 . . . . .",
        "0 . . . . . . . . . . ."
      ] })
  ]
};

// 5. Maputo 1978 · Marrabenta (4/4, 124 BPM, C Major)
profiles['maputo-1978'] = {
  name: "Maputo 1978 · Marrabenta",
  bpm: 124,
  meter: "4/4",
  root: "C",
  scale: "Maior",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 3, 4, 0],
    [4, 0],
    [0, 4, 3, 0],
    [3, 4, 1, 0],
    [0, 1, 4, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Exuberant Mozambican urban dance study born in Maputo. Strummed nylon and steel guitars, bouncy syncopated bass, festive brass and infectious percussion. Reference: Fany Mpfumo – Loko Ni Mssungata.",
  url: "https://en.wikipedia.org/wiki/Marrabenta",
  parts: [
    makePart({ role: 'rhythm', name: 'Acoustic Kick', behavior: 'pulse', bank: 'percussion', asset: 'kick', variant: 0, pitched: false,
      gain: 0.3, attack: 0.002, decay: 0.2, release: 0.08, lpf: 5000,
      patterns: [
        "0 . . . . . 0 . . . 0 . . . . .",
        "0 . . . . . 0 . . . 0 . . . 0 .",
        "0 . . . . . . . . . 0 . . . . .",
        "0 . . . 0 . 0 . . . 0 . . . 0 .",
        "0 . . . . . 0 . . . 0 . 0 . 0 .",
        "0 . . . . . 0 . . . 0 . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Snare Backbeat', behavior: 'pulse', bank: 'percussion', asset: 'snare', variant: 0, pitched: false,
      gain: 0.26, attack: 0.002, decay: 0.15, release: 0.07, lpf: 9000,
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Hi-Hat Flow', behavior: 'pulse', bank: 'percussion', asset: 'hat', variant: 0, pitched: false,
      gain: 0.19, attack: 0.002, decay: 0.08, release: 0.04,
      patterns: [
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 .",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 0 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Tambourine Pulse', behavior: 'pulse', bank: 'percussion', asset: 'tambourine', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0",
        ". 0 . 0 . 0 0 0 . 0 . 0 . 0 0 0",
        ". 0 . . . 0 . . . 0 . . . 0 . .",
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 0 0",
        ". 0 . 0 . 0 0 0 . 0 . 0 . 0 0 0",
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Conga Drive', behavior: 'pulse', bank: 'percussion', asset: 'conga', variant: 0, pitched: false,
      gain: 0.24, attack: 0.003, decay: 0.16, release: 0.08,
      patterns: [
        "0 . . 0 . 0 . . 0 . . 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 . .",
        "0 . . . . 0 . . 0 . . . . 0 . .",
        "0 . 0 0 . 0 . . 0 . 0 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 0 .",
        "0 . . 0 . 0 . . 0 . . 0 . 0 . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Bongo Slap', behavior: 'pulse', bank: 'percussion', asset: 'bongo', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.12, release: 0.05,
      patterns: [
        ". . 0 . . . 0 . . . 0 . . . 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 .",
        ". . 0 . . . . . . . 0 . . . . .",
        ". . 0 . . 0 0 . . . 0 . . 0 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 0",
        ". . 0 . . . 0 . . . 0 . . . 0 ."
      ] }),
    makePart({ role: 'bass', name: 'Bouncy Hollowbody Bass', behavior: 'phrase', bank: 'guitars', asset: 'bass', octave: 2,
      gain: 0.28, attack: 0.004, decay: 0.2, sustain: 0.55, release: 0.12,
      patterns: [
        "0 . . 0 . 4 . 0 . . 2 . 4 . . .",
        "0 . . 0 . 4 . 0 . 2 3 . 4 . 0 .",
        "0 . . . . 4 . . 0 . . . . 4 . .",
        "0 . 2 0 . 4 . 0 . 0 2 . 4 . 0 .",
        "0 . . 0 . 4 . 0 . 2 3 . 4 . 5 .",
        "0 . . 0 . 4 . 0 . . 2 . 4 . . ."
      ] }),
    makePart({ role: 'harmony', name: 'Classical Nylon Strum', behavior: 'phrase', bank: 'guitars', asset: 'nylon', octave: 3,
      gain: 0.25, attack: 0.003, decay: 0.22, sustain: 0.5, release: 0.14,
      patterns: [
        "0 . 2,4 . 0 . 2,4 . 0 . 2,4 . 0 . 2,4 .",
        "0 . 2,4 . 0 . 2,4 5 . 4 . 2 . 0 .",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 2 4 5 4 2 4 2 0 2 4 5 4 2 4 2",
        "0 . 2,4 . 0 . 2,4 5 7 5 4 2 . 0",
        "0 . 2,4 . 0 . 2,4 . 0 . 2,4 . 0 . 2,4 ."
      ] }),
    makePart({ role: 'harmony', name: 'Steel Guitar Picking', behavior: 'phrase', bank: 'strings', asset: 'steel', octave: 3,
      gain: 0.23, attack: 0.003, decay: 0.2, sustain: 0.45, release: 0.12,
      patterns: [
        "0 2 4 5 4 2 0 2 0 2 4 5 4 2 0 2",
        "0 2 4 5 7 5 4 2 0 2 4 5 7 5 4 2",
        "0 . . 4 . . 2 . 0 . . 4 . . 2 .",
        "0 2 4 5 4 2 0 2 4 5 7 5 4 2 0 2",
        "0 2 4 5 7 9 7 5 4 2 4 5 7 5 4 2",
        "0 2 4 5 4 2 0 2 0 2 4 5 4 2 0 2"
      ] }),
    makePart({ role: 'harmony', name: 'Clean Guitar Chops', behavior: 'phrase', bank: 'guitars', asset: 'clean', octave: 3,
      gain: 0.22, attack: 0.003, decay: 0.15, sustain: 0.4, release: 0.1, active: [false, true, true, true, true, true],
      patterns: [
        ". . 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4 .",
        ". . 0,2,4 . . . 0,2,4 . . 0,2,4 . . . 0,2,4 . .",
        ". . 0,2,4 . . . . . . . . . 0,2,4 . . . . . . .",
        ". . 0,2,4 . . 0,2,4 . . . 0,2,4 . . 0,2,4 . .",
        ". . 0,2,4 . . . 0,2,4 . . 0,2,4 . . . 0,2,4 0",
        ". . 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4 ."
      ] }),
    makePart({ role: 'harmony', name: 'Muted Guitar Chank', behavior: 'phrase', bank: 'guitars', asset: 'muted', octave: 3,
      gain: 0.2, attack: 0.002, decay: 0.12, sustain: 0.3, release: 0.08,
      patterns: [
        "0 . . 0 . . 0 . 0 . . 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 .",
        "0 . . . . . 0 . 0 . . . . . 0 .",
        "0 . 0 0 . . 0 . 0 . 0 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 0",
        "0 . . 0 . . 0 . 0 . . 0 . . 0 ."
      ] }),
    makePart({ role: 'melody', name: 'Solo Trumpet Call', behavior: 'phrase', bank: 'sambaReggae', asset: 'trompete', octave: 4,
      gain: 0.25, attack: 0.004, decay: 0.25, sustain: 0.6, release: 0.15, active: [false, true, false, true, true, true],
      patterns: [
        "4 . . 5 . 4 . 2 . . 0 . . . . .",
        "4 . . 5 . 7 . 5 . . 4 . 2 . . .",
        "2 . . 4 . . . . 0 . . . . . . .",
        "4 . 5 7 . 5 . 4 . . 2 . 0 . . .",
        "5 . . 7 . 8 . 7 . . 5 . 4 . . .",
        "4 . . 5 . 4 . 2 . . 0 . . . . ."
      ] }),
    makePart({ role: 'response', name: 'Tenor Sax Reply', behavior: 'phrase', bank: 'band', asset: 'tenor-sax', octave: 3,
      gain: 0.22, attack: 0.006, decay: 0.24, sustain: 0.55, release: 0.16, active: [false, false, true, true, true, false],
      patterns: [
        ". . . . . . . . 2 . 4 . 5 . 4 .",
        ". . . . . . . . 4 . 5 . 7 . 5 .",
        ". . . . . . . . 0 . 2 . 4 . 2 .",
        ". . . . . . . . 2 . 4 . 5 . 4 .",
        ". . . . . . . . 5 . 7 . 8 . 7 .",
        ". . . . . . . . 2 . 4 . 5 . 4 ."
      ] }),
    makePart({ role: 'response', name: 'Tenor Trombone Fill', behavior: 'sustain', bank: 'sambaReggae', asset: 'trombone', octave: 3,
      gain: 0.23, attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.18, active: [false, true, false, true, false, true],
      patterns: [
        "0 . . . . . . . 4 . . . . . . .",
        "0 . . . 2 . . . 4 . . . 2 . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . 2 . . . . 4 . . 2 . . . .",
        "0 . . . 4 . . . 5 . . . 4 . . .",
        "0 . . . . . . . 4 . . . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Room Claps', behavior: 'pulse', bank: 'drums', asset: 'room-clap', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.14, release: 0.06, active: [false, true, false, true, true, true],
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . . . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'melody', name: 'High Marimba Tines', behavior: 'phrase', bank: 'band', asset: 'marimba', octave: 4,
      gain: 0.21, attack: 0.003, decay: 0.2, sustain: 0.35, release: 0.12, active: [false, false, true, false, true, true],
      patterns: [
        ". . 7 . . . 6 . . . 5 . . . 4 .",
        ". . 7 . . 8 7 . . . 5 . . . 4 .",
        ". . 5 . . . 4 . . . 3 . . . 2 .",
        ". . 7 . . . 6 . . 5 4 . . . 2 .",
        ". . 8 . . . 7 . . . 5 . . . 4 .",
        ". . 7 . . . 6 . . . 5 . . . 4 ."
      ] })
  ]
};

console.log('5 styles prepared. Generating remaining...');

// 6. Dakar 1985 · Mbalax (4/4, 112 BPM, E Natural Minor)
profiles['dakar-1985'] = {
  name: "Dakar 1985 · Mbalax",
  bpm: 112,
  meter: "4/4",
  root: "E",
  scale: "Menor natural",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 5, 3, 0],
    [3, 0],
    [0, 3, 5, 0],
    [5, 3, 4, 0],
    [0, 4, 5, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Modern Senegalese popular dance study pioneered by Youssou N'Dour and Le Super Étoile de Dakar. Fuses explosive Sabar drum bàkk stick rolls, talking tama pitch bends, funk bass and electric brass. Reference: Youssou N'Dour – Immigrés.",
  url: "https://en.wikipedia.org/wiki/Mbalax",
  parts: [
    makePart({ role: 'rhythm', name: 'Acoustic Kick', behavior: 'pulse', bank: 'percussion', asset: 'kick', variant: 0, pitched: false,
      gain: 0.31, attack: 0.002, decay: 0.2, release: 0.09, lpf: 5000,
      patterns: [
        "0 . . . . . 0 . . . 0 . . . . .",
        "0 . . . . . 0 . . . 0 . . . 0 .",
        "0 . . . . . . . . . 0 . . . . .",
        "0 . . . 0 . 0 . . . 0 . . . 0 .",
        "0 . . . . . 0 . . . 0 . 0 . 0 .",
        "0 . . . . . 0 . . . 0 . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Snare Backbeat', behavior: 'pulse', bank: 'percussion', asset: 'snare', variant: 0, pitched: false,
      gain: 0.26, attack: 0.002, decay: 0.15, release: 0.07, lpf: 9000,
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Sabar Bàkk Lead Roll', behavior: 'phrase', bank: 'sambaReggae', asset: 'repinique', variant: 0, pitched: false,
      gain: 0.26, attack: 0.002, decay: 0.12, release: 0.06,
      patterns: [
        "0 0 . 0 . 0 0 . 0 . 0 0 . 0 . 0",
        "0 0 0 0 . 0 0 0 0 . 0 0 . 0 0 0",
        "0 . . 0 . . 0 . 0 . . 0 . . 0 .",
        "0 0 . 0 0 0 0 . 0 0 . 0 0 0 0 .",
        "0 0 0 0 0 0 0 0 0 . 0 0 0 0 0 0",
        "0 0 . 0 . 0 0 . 0 . 0 0 . 0 . 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Sabar Support Drum', behavior: 'pulse', bank: 'sambaReggae', asset: 'tarol', variant: 0, pitched: false,
      gain: 0.23, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 . 0 . 0 . 0 0 . 0 . 0 . 0 0 .",
        "0 . 0 . 0 0 0 0 . 0 . 0 . 0 0 0",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . 0 0 . 0 . 0 . 0 0 . . 0 0 .",
        "0 . 0 . 0 0 0 0 . 0 . 0 0 0 0 0",
        "0 . 0 . 0 . 0 0 . 0 . 0 . 0 0 ."
      ] }),
    makePart({ role: 'melody', name: 'Tama Talking Drum', behavior: 'phrase', bank: 'percussion', asset: 'conga', octave: 3, pitchEnvelope: 3, pitchAttack: 0.1,
      gain: 0.24, attack: 0.003, decay: 0.2, sustain: 0.4, release: 0.1,
      patterns: [
        ". . 2 . . . 4 . . . 2 . . . 0 .",
        ". . 2 . . 3 4 . . . 3 . . 2 0 .",
        ". . . . . . 2 . . . . . . . 0 .",
        ". . 2 3 . 4 . . . . 3 . . 2 0 .",
        ". . 4 . . . 5 . . . 4 . . . 2 .",
        ". . 2 . . . 4 . . . 2 . . . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Closed Hi-Hat', behavior: 'pulse', bank: 'percussion', asset: 'hat', variant: 0, pitched: false,
      gain: 0.19, attack: 0.002, decay: 0.08, release: 0.04,
      patterns: [
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 .",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 0 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Shaker Groove', behavior: 'pulse', bank: 'percussion', asset: 'shaker', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 . 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"
      ] }),
    makePart({ role: 'bass', name: 'Syncopated Pick Bass', behavior: 'phrase', bank: 'strings', asset: 'bass-pick', octave: 2,
      gain: 0.28, attack: 0.003, decay: 0.22, sustain: 0.6, release: 0.12, lpf: 4500,
      patterns: [
        "0 . . 0 . . 2 . 3 . . 2 . 0 . .",
        "0 . . 0 . . 2 . 3 . 4 3 . 2 . 0",
        "0 . . . . . 2 . . . . . . 0 . .",
        "0 . 2 0 . . 2 . 3 . . 2 . 0 . .",
        "0 . . 0 . . 2 . 3 . 4 5 . 3 . 2",
        "0 . . 0 . . 2 . 3 . . 2 . 0 . ."
      ] }),
    makePart({ role: 'harmony', name: 'Clean Highlife Guitar', behavior: 'phrase', bank: 'guitars', asset: 'clean', octave: 3,
      gain: 0.23, attack: 0.003, decay: 0.18, sustain: 0.45, release: 0.12,
      patterns: [
        "0 . 2 . 3 . 2 . 0 . 2 . 3 . 2 .",
        "0 . 2 . 3 . 4 . 3 . 2 . 0 . 2 .",
        "0 . . . 3 . . . 0 . . . 3 . . .",
        "0 2 3 . 2 . 0 . 2 3 4 . 3 . 2 .",
        "0 . 2 . 3 . 5 . 7 . 5 . 3 . 2 .",
        "0 . 2 . 3 . 2 . 0 . 2 . 3 . 2 ."
      ] }),
    makePart({ role: 'harmony', name: 'Muted Funk Chank', behavior: 'phrase', bank: 'guitars', asset: 'muted', octave: 3,
      gain: 0.21, attack: 0.002, decay: 0.12, sustain: 0.3, release: 0.08,
      patterns: [
        ". 0 . . 0 . . 0 . 0 . . 0 . . 0",
        ". 0 . . 0 . 0 0 . 0 . . 0 . 0 0",
        ". 0 . . . . . 0 . 0 . . . . . 0",
        ". 0 . 0 0 . . 0 . 0 . 0 0 . . 0",
        ". 0 . . 0 . 0 0 . 0 . . 0 . 0 0",
        ". 0 . . 0 . . 0 . 0 . . 0 . . 0"
      ] }),
    makePart({ role: 'harmony', name: 'Rhodes Electric Piano', behavior: 'sustain', bank: 'keys', asset: 'rhodes', octave: 3,
      gain: 0.22, attack: 0.006, decay: 0.35, sustain: 0.65, release: 0.22,
      patterns: [
        "0,2,4 . . . . . . . 2,4,6 . . . . . . .",
        "0,2,4 . . . . . . . 3,5,7 . . . . . . .",
        "0,2,4 . . . . . . . . . . . . . . . . .",
        "0,2,4 . . . . . . 2,4,6 . . . . . . . .",
        "0,2,4 . . . . . . . 3,5,7 . . . . . . .",
        "0,2,4 . . . . . . . 2,4,6 . . . . . . ."
      ] }),
    makePart({ role: 'melody', name: 'Piercing Trumpet Hook', behavior: 'phrase', bank: 'sambaReggae', asset: 'trompete', octave: 4,
      gain: 0.25, attack: 0.004, decay: 0.26, sustain: 0.6, release: 0.16, active: [false, true, false, true, true, true],
      patterns: [
        "4 . . 5 . 7 . 5 . . 4 . 2 . . .",
        "4 . . 5 . 7 . 8 . . 7 . 5 . . .",
        "2 . . 3 . 2 . 0 . . . . . . . .",
        "4 . 5 7 . 5 . 4 . . 3 . 2 . . .",
        "5 . . 7 . 8 . 10 . . 8 . 7 . . .",
        "4 . . 5 . 7 . 5 . . 4 . 2 . . ."
      ] }),
    makePart({ role: 'response', name: 'Tenor Saxophone Voice', behavior: 'phrase', bank: 'band', asset: 'tenor-sax', octave: 3,
      gain: 0.23, attack: 0.006, decay: 0.26, sustain: 0.55, release: 0.16, active: [false, false, true, true, true, false],
      patterns: [
        ". . . . . . . . 4 . 3 . 2 . 0 .",
        ". . . . . . . . 5 . 4 . 3 . 2 .",
        ". . . . . . . . 2 . 0 . . . . .",
        ". . . . . . . . 4 . 3 . 2 . 0 .",
        ". . . . . . . . 7 . 5 . 4 . 3 .",
        ". . . . . . . . 4 . 3 . 2 . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Clave Wood Rim', behavior: 'pulse', bank: 'electro', asset: 'rim', variant: 0, pitched: false,
      gain: 0.21, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 . . 0 . . 0 . . . 0 . 0 . . .",
        "0 . . 0 . . 0 . . . 0 . 0 . 0 .",
        "0 . . . . . 0 . . . 0 . . . . .",
        "0 . . 0 . 0 0 . . . 0 . 0 . . .",
        "0 . . 0 . . 0 . . . 0 . 0 . 0 0",
        "0 . . 0 . . 0 . . . 0 . 0 . . ."
      ] }),
    makePart({ role: 'texture', name: 'Vocal Pad Atmosphere', behavior: 'sustain', bank: 'synths', asset: 'choir', octave: 3,
      gain: 0.18, attack: 0.02, decay: 0.4, sustain: 0.7, release: 0.3,
      patterns: [
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 2 . . . . . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 3 . . . . . . .",
        "2 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . . . . . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Crash Cymbal Hit', behavior: 'pulse', bank: 'percussion', asset: 'crash', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.3, release: 0.15, active: [true, false, true, false, true, false],
      patterns: [
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . . . . . . . . ."
      ] })
  ]
};

// 7. Luanda 1996 · Kuduro (4/4, 138 BPM, B Natural Minor)
profiles['luanda-1996'] = {
  name: "Luanda 1996 · Kuduro",
  bpm: 138,
  meter: "4/4",
  root: "B",
  scale: "Menor natural",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 5, 3, 0],
    [3, 0],
    [0, 3, 5, 0],
    [5, 3, 4, 0],
    [0, 4, 5, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Fierce, high-speed electronic Kuduro movement born in the musseques of Luanda during the 1990s civil war. Driven by four-on-the-floor 909 kicks, hard syncopated snare claps, acidic basslines and acrobatic dance urgency. Reference: Tony Amado – É Pra Dançar.",
  url: "https://en.wikipedia.org/wiki/Kuduro",
  parts: [
    makePart({ role: 'rhythm', name: 'Four-on-Floor Electronic Kick', behavior: 'pulse', bank: 'electro', asset: 'kick', variant: 0, pitched: false,
      gain: 0.34, attack: 0.002, decay: 0.2, release: 0.08, lpf: 5000,
      patterns: [
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . . . 0 . . . 0 . . . 0 . 0 .",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . . . 0 . . . 0 . . 0 0 . . .",
        "0 . . . 0 . . . 0 . . . 0 . 0 0",
        "0 . . . 0 . . . 0 . . . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Hard Snare Backbeat', behavior: 'pulse', bank: 'electro', asset: 'snare', variant: 0, pitched: false,
      gain: 0.28, attack: 0.002, decay: 0.16, release: 0.07,
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Kuduro Snare Syncopations', behavior: 'pulse', bank: 'electro', asset: 'snare', variant: 1, pitched: false,
      gain: 0.25, attack: 0.002, decay: 0.12, release: 0.05,
      patterns: [
        ". . 0 . . . 0 . . 0 . . 0 . . .",
        ". . 0 . . . 0 0 . 0 . . 0 . 0 .",
        ". . 0 . . . . . . 0 . . . . . .",
        ". . 0 . . 0 0 . . 0 . 0 0 . . .",
        ". . 0 . . . 0 0 . 0 . . 0 . 0 0",
        ". . 0 . . . 0 . . 0 . . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Metallic Claps', behavior: 'pulse', bank: 'electro', asset: 'clap', variant: 0, pitched: false,
      gain: 0.24, attack: 0.002, decay: 0.14, release: 0.06, active: [false, true, false, true, true, true],
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Open Hi-Hat Rush', behavior: 'pulse', bank: 'electro', asset: 'open-hat', variant: 0, pitched: false,
      gain: 0.21, attack: 0.002, decay: 0.12, release: 0.06,
      patterns: [
        ". . 0 . . . 0 . . . 0 . . . 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 .",
        ". . 0 . . . . . . . 0 . . . . .",
        ". . 0 . . 0 0 . . . 0 . . 0 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 0",
        ". . 0 . . . 0 . . . 0 . . . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Closed Hi-Hat 16ths', behavior: 'pulse', bank: 'electro', asset: 'hat', variant: 0, pitched: false,
      gain: 0.18, attack: 0.002, decay: 0.06, release: 0.03,
      patterns: [
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 . 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Electronic Shaker', behavior: 'pulse', bank: 'electro', asset: 'shaker', variant: 0, pitched: false,
      gain: 0.19, attack: 0.002, decay: 0.08, release: 0.04,
      patterns: [
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 .",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 0 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 ."
      ] }),
    makePart({ role: 'bass', name: 'Acid Synth Bass', behavior: 'phrase', bank: 'synths', asset: 'acid', octave: 2, distortion: 0.25, distortionMix: 0.3,
      gain: 0.29, attack: 0.003, decay: 0.18, sustain: 0.5, release: 0.1, lpf: 3500,
      patterns: [
        "0 . 0 . 2 . 0 . 3 . 0 . 2 . 0 .",
        "0 . 0 . 2 . 0 . 3 . 4 3 2 . 0 .",
        "0 . . . 2 . . . 3 . . . 2 . . .",
        "0 0 . 0 2 . 0 . 3 . 0 . 2 3 2 0",
        "0 . 0 . 2 . 0 . 3 . 4 5 3 . 2 .",
        "0 . 0 . 2 . 0 . 3 . 0 . 2 . 0 ."
      ] }),
    makePart({ role: 'bass', name: 'Sub Bass Impact', behavior: 'pulse', bank: 'synths', asset: 'sub', octave: 2,
      gain: 0.28, attack: 0.004, decay: 0.22, sustain: 0.6, release: 0.12, lpf: 2500,
      patterns: [
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . 0 . . . . . 0 .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . 0 . . . 2 . . .",
        "0 . . . . . . . 0 . . . . . 0 .",
        "0 . . . . . . . 0 . . . . . . ."
      ] }),
    makePart({ role: 'melody', name: 'FM Bell Alarm', behavior: 'phrase', bank: 'synths', asset: 'fm-bell', octave: 4,
      gain: 0.22, attack: 0.002, decay: 0.2, sustain: 0.3, release: 0.15, active: [false, true, true, true, false, true],
      patterns: [
        "7 . . 7 . . 6 . . 5 . . 4 . . .",
        "7 . . 7 . 8 7 . . 5 . . 4 . 0 .",
        "5 . . . . . 4 . . . . . 3 . . .",
        "7 . . 7 . . 6 . 5 4 . . 2 . . .",
        "8 . . 8 . . 7 . . 5 . . 4 . . .",
        "7 . . 7 . . 6 . . 5 . . 4 . . ."
      ] }),
    makePart({ role: 'melody', name: 'Vocal Formant Stabs', behavior: 'phrase', bank: 'jazz', asset: 'formant', octave: 4,
      gain: 0.24, attack: 0.005, decay: 0.2, sustain: 0.45, release: 0.12, active: [false, true, false, true, true, true],
      patterns: [
        ". . 0 . . . 0 . . . 2 . . . 0 .",
        ". . 0 . . . 0 0 . . 2 . . 3 2 0",
        ". . 0 . . . . . . . 0 . . . . .",
        ". . 0 2 . . 0 . . . 2 . . . 0 .",
        ". . 0 . . . 0 0 . . 2 . . 4 3 2",
        ". . 0 . . . 0 . . . 2 . . . 0 ."
      ] }),
    makePart({ role: 'harmony', name: 'Digital Synth Pluck', behavior: 'phrase', bank: 'synths', asset: 'digital-pluck', octave: 3,
      gain: 0.23, attack: 0.002, decay: 0.16, sustain: 0.4, release: 0.1, active: [false, true, true, true, true, true],
      patterns: [
        ". 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4",
        ". 0,2,4 . . . 0,2,4 . . 0,2,4 . . . 0,2,4 .",
        ". 0,2,4 . . . . . . . . 0,2,4 . . . . . . .",
        ". 0,2,4 . . 0,2,4 . . . 0,2,4 . . 0,2,4 . .",
        ". 0,2,4 . . . 0,2,4 . . 0,2,4 . . . 0,2,4 0",
        ". 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4"
      ] }),
    makePart({ role: 'rhythm', name: 'Electric Tom Roll', behavior: 'pulse', bank: 'electro', asset: 'tom', variant: 0, pitched: false,
      gain: 0.23, attack: 0.002, decay: 0.16, release: 0.08, active: [false, true, false, true, true, true],
      patterns: [
        ". . . . . . . . . . . . 0 0 0 0",
        ". . . . . . . 0 . . . . 0 0 0 0",
        ". . . . . . . . . . . . . . 0 0",
        ". . . . . . 0 0 . . . . 0 0 0 0",
        ". . . . . . . 0 . . . 0 0 0 0 0",
        ". . . . . . . . . . . . 0 0 0 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Rimshot Whistle', behavior: 'pulse', bank: 'electro', asset: 'rim', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 . . 0 . 0 . . 0 . . 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 . .",
        "0 . . . . 0 . . 0 . . . . 0 . .",
        "0 . 0 0 . 0 . . 0 . 0 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 0 .",
        "0 . . 0 . 0 . . 0 . . 0 . 0 . ."
      ] }),
    makePart({ role: 'texture', name: 'Aggressive Synth Pad', behavior: 'sustain', bank: 'synths', asset: 'analog-pad', octave: 3, distortion: 0.2, distortionMix: 0.25,
      gain: 0.2, attack: 0.015, decay: 0.35, sustain: 0.7, release: 0.25,
      patterns: [
        "0,2,4 . . . . . . . . . . . . . . .",
        "0,2,4 . . . . . . . 2,4,6 . . . . . . .",
        "0,2,4 . . . . . . . . . . . . . . .",
        "0,2,4 . . . . . . . 3,5,7 . . . . . . .",
        "0,2,4 . . . . . . . 2,4,6 . . . . . . .",
        "0,2,4 . . . . . . . . . . . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Crash Accent', behavior: 'pulse', bank: 'world', asset: 'crash', variant: 0, pitched: false,
      gain: 0.23, attack: 0.002, decay: 0.3, release: 0.15, active: [true, false, true, false, true, false],
      patterns: [
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . . . . . . . . ."
      ] })
  ]
};

// 8. Harare 1981 · Chimurenga (12/8, 118 BPM, G Major)
profiles['harare-1981'] = {
  name: "Harare 1981 · Chimurenga",
  bpm: 118,
  meter: "12/8",
  root: "G",
  scale: "Maior",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 3, 4, 0],
    [4, 0],
    [0, 4, 3, 0],
    [3, 4, 1, 0],
    [0, 1, 4, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Zimbabwean liberation study popularised by Thomas Mapfumo & The Blacks Unlimited. Transposes the sacred 22-key mbira thumb piano and hosho gourd rattles onto twin electric guitars and driving drums. Reference: Thomas Mapfumo – Mukadzi Wangu.",
  url: "https://en.wikipedia.org/wiki/Chimurenga_music",
  parts: [
    makePart({ role: 'rhythm', name: 'Drum Kit Kick', behavior: 'pulse', bank: 'percussion', asset: 'kick', variant: 0, pitched: false,
      gain: 0.31, attack: 0.002, decay: 0.22, release: 0.1, lpf: 4500,
      patterns: [
        "0 . . . . . 0 . . . . .",
        "0 . . . . 0 0 . . . . .",
        "0 . . . . . 0 . . . . .",
        "0 . . 0 . . 0 . . . . .",
        "0 . . . . 0 0 . . 0 . .",
        "0 . . . . . 0 . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Triplet Snare Backbeat', behavior: 'pulse', bank: 'percussion', asset: 'snare', variant: 0, pitched: false,
      gain: 0.27, attack: 0.002, decay: 0.16, release: 0.08,
      patterns: [
        ". . . 0 . . . . . 0 . .",
        ". . . 0 . . . . . 0 . 0",
        ". . . 0 . . . . . 0 . .",
        ". . 0 0 . . . . 0 0 . .",
        ". . . 0 . . . . . 0 0 0",
        ". . . 0 . . . . . 0 . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Hosho Gourd Rattle', behavior: 'pulse', bank: 'percussion', asset: 'shaker', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 0 0 0 0 0 0 0 0 0 0 0",
        "0 . 0 0 . 0 0 . 0 0 . 0",
        "0 . . 0 . . 0 . . 0 . .",
        "0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 . 0 0 0 0 0 . 0 0 0",
        "0 0 0 0 0 0 0 0 0 0 0 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Hi-Hat Triplet Flow', behavior: 'pulse', bank: 'percussion', asset: 'hat', variant: 0, pitched: false,
      gain: 0.19, attack: 0.002, decay: 0.08, release: 0.04,
      patterns: [
        "0 . 0 . 0 . 0 . 0 . 0 .",
        "0 0 0 . 0 . 0 0 0 . 0 .",
        "0 . . . . . 0 . . . . .",
        "0 . 0 . 0 0 0 . 0 . 0 0",
        "0 0 0 . 0 0 0 0 0 . 0 0",
        "0 . 0 . 0 . 0 . 0 . 0 ."
      ] }),
    makePart({ role: 'melody', name: 'Mbira Kushaura Lead', behavior: 'phrase', bank: 'band', asset: 'marimba', octave: 4,
      gain: 0.26, attack: 0.002, decay: 0.2, sustain: 0.4, release: 0.12,
      patterns: [
        "0 . 2 4 . 2 0 . 2 4 . 2",
        "0 . 2 4 . 5 4 . 2 0 . 2",
        "0 . . 4 . . 0 . . 4 . .",
        "0 2 4 5 . 4 2 . 4 2 . 0",
        "0 . 2 4 5 7 5 4 2 0 . 2",
        "0 . 2 4 . 2 0 . 2 4 . 2"
      ] }),
    makePart({ role: 'melody', name: 'Mbira Kutsinhira Reply', behavior: 'phrase', bank: 'keys', asset: 'celesta', octave: 4,
      gain: 0.23, attack: 0.002, decay: 0.2, sustain: 0.35, release: 0.14, active: [false, true, true, true, true, true],
      patterns: [
        ". 2 . . 4 . . 2 . . 4 .",
        ". 2 . . 4 . . 5 . . 4 .",
        ". 2 . . . . . 2 . . . .",
        ". 2 . 4 . 5 . 4 . 2 . 0",
        ". 4 . . 5 . . 7 . . 5 .",
        ". 2 . . 4 . . 2 . . 4 ."
      ] }),
    makePart({ role: 'texture', name: 'High Mbira Shimmer', behavior: 'sustain', bank: 'synths', asset: 'fm-bell', octave: 4,
      gain: 0.2, attack: 0.002, decay: 0.18, sustain: 0.3, release: 0.15,
      patterns: [
        "4 . . 5 . . 7 . . 5 . .",
        "4 . . 5 . 7 8 . . 7 . 5",
        "4 . . . . . 5 . . . . .",
        "4 . 5 7 . 8 7 . . 5 . 4",
        "5 . . 7 . 8 10 . . 8 . 7",
        "4 . . 5 . . 7 . . 5 . ."
      ] }),
    makePart({ role: 'harmony', name: 'Chimurenga Lead Guitar', behavior: 'phrase', bank: 'guitars', asset: 'clean', octave: 3,
      gain: 0.24, attack: 0.003, decay: 0.2, sustain: 0.45, release: 0.12,
      patterns: [
        "0 2 4 5 4 2 0 2 4 5 4 2",
        "0 2 4 5 7 5 4 2 0 2 4 2",
        "0 . . 4 . . 0 . . 4 . .",
        "0 2 4 5 4 2 4 2 0 2 4 2",
        "0 2 4 5 7 9 7 5 4 2 4 2",
        "0 2 4 5 4 2 0 2 4 5 4 2"
      ] }),
    makePart({ role: 'harmony', name: 'Chimurenga Rhythm Guitar', behavior: 'phrase', bank: 'guitars', asset: 'muted', octave: 3,
      gain: 0.21, attack: 0.002, decay: 0.12, sustain: 0.3, release: 0.08,
      patterns: [
        ". 0 . . 2 . . 0 . . 2 .",
        ". 0 . . 2 . . 3 . . 2 .",
        ". 0 . . . . . 0 . . . .",
        ". 0 . 2 . 0 . 2 . 0 . 2",
        ". 2 . . 3 . . 4 . . 3 .",
        ". 0 . . 2 . . 0 . . 2 ."
      ] }),
    makePart({ role: 'bass', name: 'Hollowbody Deep Bass', behavior: 'phrase', bank: 'guitars', asset: 'bass', octave: 2,
      gain: 0.29, attack: 0.004, decay: 0.22, sustain: 0.55, release: 0.12,
      patterns: [
        "0 . . 0 . 2 4 . . 2 . 0",
        "0 . . 0 . 2 4 . 5 4 . 2",
        "0 . . . . . 4 . . . . .",
        "0 . 2 4 . 2 0 . . 2 . 0",
        "0 . . 0 . 2 4 . 5 7 . 4",
        "0 . . 0 . 2 4 . . 2 . 0"
      ] }),
    makePart({ role: 'melody', name: 'Brass Trumpet Call', behavior: 'phrase', bank: 'sambaReggae', asset: 'trompete', octave: 4,
      gain: 0.25, attack: 0.004, decay: 0.25, sustain: 0.6, release: 0.15, active: [false, true, false, true, true, true],
      patterns: [
        "4 . . 5 . . 7 . . 5 . .",
        "4 . . 5 . 7 8 . . 7 . 5",
        "2 . . 4 . . . . . . . .",
        "4 . 5 7 . 5 4 . . 2 . 0",
        "5 . . 7 . 8 9 . . 7 . 5",
        "4 . . 5 . . 7 . . 5 . ."
      ] }),
    makePart({ role: 'response', name: 'Tenor Sax Echo', behavior: 'phrase', bank: 'band', asset: 'tenor-sax', octave: 3,
      gain: 0.22, attack: 0.006, decay: 0.24, sustain: 0.55, release: 0.16, active: [false, false, true, true, true, false],
      patterns: [
        ". . . . . . 4 . . 2 . 0",
        ". . . . . . 5 . . 4 . 2",
        ". . . . . . 2 . . 0 . .",
        ". . . . . . 4 . 2 0 . .",
        ". . . . . . 7 . . 5 . 4",
        ". . . . . . 4 . . 2 . 0"
      ] }),
    makePart({ role: 'response', name: 'Trombone Resonance', behavior: 'phrase', bank: 'sambaReggae', asset: 'trombone', octave: 3,
      gain: 0.23, attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.18, active: [false, true, false, true, false, true],
      patterns: [
        "0 . . . . . 4 . . . . .",
        "0 . . 2 . . 4 . . 2 . .",
        "0 . . . . . . . . . . .",
        "0 . . 2 . 0 4 . . 2 . 0",
        "0 . . . 4 . 5 . . 4 . .",
        "0 . . . . . 4 . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Hand Claps Roda', behavior: 'pulse', bank: 'drums', asset: 'room-clap', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.14, release: 0.06, active: [false, true, false, true, true, true],
      patterns: [
        "0 . . 0 . . 0 . . 0 . .",
        "0 . . 0 . 0 0 . . 0 . 0",
        "0 . . . . . 0 . . . . .",
        "0 . 0 0 . . 0 . 0 0 . .",
        "0 . . 0 . 0 0 . . 0 . 0",
        "0 . . 0 . . 0 . . 0 . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Tom Drum Accents', behavior: 'pulse', bank: 'percussion', asset: 'tom', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.18, release: 0.08, active: [false, true, false, true, true, true],
      patterns: [
        ". . . . . 0 . . . . . 0",
        ". . . . . 0 . . . . 0 0",
        ". . . . . . . . . . . 0",
        ". . . . 0 0 . . . . . 0",
        ". . . . . 0 . . . 0 0 0",
        ". . . . . 0 . . . . . 0"
      ] }),
    makePart({ role: 'melody', name: 'Pastoral Flute Ornament', behavior: 'phrase', bank: 'classical', asset: 'flute-sustain', octave: 4,
      gain: 0.2, attack: 0.01, decay: 0.25, sustain: 0.5, release: 0.16, active: [false, false, true, false, true, true],
      patterns: [
        ". . 7 . . . . . 5 . . .",
        ". . 8 . . 7 . . 5 . . 4",
        ". . 5 . . . . . 4 . . .",
        ". . 7 . 8 7 . . 5 . 4 2",
        ". . 9 . . 8 . . 7 . . 5",
        ". . 7 . . . . . 5 . . ."
      ] })
  ]
};

// 9. Kinshasa 1978 · Soukous (4/4, 126 BPM, C Major)
profiles['kinshasa-1978'] = {
  name: "Kinshasa 1978 · Soukous",
  bpm: 126,
  meter: "4/4",
  root: "C",
  scale: "Maior",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 3, 4, 0],
    [4, 0],
    [0, 4, 3, 0],
    [3, 4, 1, 0],
    [0, 1, 4, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Congolese soukous study inspired by Franco Luambo Makiadi (OK Jazz) and Papa Wemba. Celebrates the shimmering sebene instrumental climax: dazzling high-register guitar wizardry, skipping basslines, driving rumba congas and fanfare brass. Reference: Papa Wemba – Yolele.",
  url: "https://en.wikipedia.org/wiki/Soukous",
  parts: [
    makePart({ role: 'rhythm', name: 'Bass Drum Kick', behavior: 'pulse', bank: 'percussion', asset: 'kick', variant: 0, pitched: false,
      gain: 0.31, attack: 0.002, decay: 0.2, release: 0.08, lpf: 5000,
      patterns: [
        "0 . . . . . 0 . . . 0 . . . . .",
        "0 . . . . . 0 . . . 0 . . . 0 .",
        "0 . . . . . . . . . 0 . . . . .",
        "0 . . . 0 . 0 . . . 0 . . . 0 .",
        "0 . . . . . 0 . . . 0 . 0 . 0 .",
        "0 . . . . . 0 . . . 0 . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Crisp Snare Drum', behavior: 'pulse', bank: 'percussion', asset: 'snare', variant: 0, pitched: false,
      gain: 0.27, attack: 0.002, decay: 0.15, release: 0.07, lpf: 9000,
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Hi-Hat Running Beat', behavior: 'pulse', bank: 'percussion', asset: 'hat', variant: 0, pitched: false,
      gain: 0.19, attack: 0.002, decay: 0.08, release: 0.04,
      patterns: [
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 .",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 0 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Conga Congolaise', behavior: 'pulse', bank: 'percussion', asset: 'conga', variant: 0, pitched: false,
      gain: 0.25, attack: 0.003, decay: 0.16, release: 0.08,
      patterns: [
        "0 . . 0 . 0 . . 0 . . 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 . .",
        "0 . . . . 0 . . 0 . . . . 0 . .",
        "0 . 0 0 . 0 . . 0 . 0 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 0 .",
        "0 . . 0 . 0 . . 0 . . 0 . 0 . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Bongo Rumba Slap', behavior: 'pulse', bank: 'percussion', asset: 'bongo', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.12, release: 0.05,
      patterns: [
        ". . 0 . . . 0 . . . 0 . . . 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 .",
        ". . 0 . . . . . . . 0 . . . . .",
        ". . 0 . . 0 0 . . . 0 . . 0 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 0",
        ". . 0 . . . 0 . . . 0 . . . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Shaker Flow', behavior: 'pulse', bank: 'percussion', asset: 'shaker', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 . 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"
      ] }),
    makePart({ role: 'bass', name: 'Skipping Congolese Bass', behavior: 'phrase', bank: 'strings', asset: 'bass-round', octave: 2,
      gain: 0.29, attack: 0.004, decay: 0.22, sustain: 0.6, release: 0.12,
      patterns: [
        "0 . . 0 . 4 . 0 . . 2 . 4 . . .",
        "0 . . 0 . 4 . 0 . 2 3 . 4 . 0 .",
        "0 . . . . 4 . . 0 . . . . 4 . .",
        "0 . 2 0 . 4 . 0 . 0 2 . 4 . 0 .",
        "0 . . 0 . 4 . 0 . 2 3 . 4 . 5 .",
        "0 . . 0 . 4 . 0 . . 2 . 4 . . ."
      ] }),
    makePart({ role: 'melody', name: 'Sebene Lead Guitar', behavior: 'phrase', bank: 'guitars', asset: 'clean', octave: 4,
      gain: 0.26, attack: 0.002, decay: 0.2, sustain: 0.45, release: 0.12,
      patterns: [
        "7 6 5 4 5 6 7 6 7 6 5 4 5 6 7 6",
        "7 8 7 6 5 6 7 8 7 6 5 4 5 6 7 8",
        "5 . . 4 . . 2 . 0 . . 2 . . 4 .",
        "7 6 5 4 5 6 7 8 7 6 5 4 2 4 5 6",
        "9 8 7 6 7 8 9 8 9 8 7 6 7 8 9 8",
        "7 6 5 4 5 6 7 6 7 6 5 4 5 6 7 6"
      ] }),
    makePart({ role: 'harmony', name: 'Mi-Solo Answering Guitar', behavior: 'phrase', bank: 'guitars', asset: 'muted', octave: 3,
      gain: 0.22, attack: 0.002, decay: 0.14, sustain: 0.35, release: 0.08,
      patterns: [
        "0 . 2 4 . 2 0 . 0 . 2 4 . 2 0 .",
        "0 . 2 4 . 5 4 . 0 . 2 4 . 5 4 .",
        "0 . . 4 . . . . 0 . . 4 . . . .",
        "0 2 4 5 4 2 0 . 0 2 4 5 4 2 0 .",
        "0 . 2 4 . 5 7 . 0 . 2 4 . 5 7 .",
        "0 . 2 4 . 2 0 . 0 . 2 4 . 2 0 ."
      ] }),
    makePart({ role: 'harmony', name: 'Accompagnement Guitar', behavior: 'sustain', bank: 'strings', asset: 'crunch-electric', octave: 3,
      gain: 0.21, attack: 0.003, decay: 0.15, sustain: 0.4, release: 0.1, active: [false, true, true, true, true, true],
      patterns: [
        ". 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4",
        ". 0,2,4 . . . 0,2,4 . . 0,2,4 . . . 0,2,4 .",
        ". 0,2,4 . . . . . . . . 0,2,4 . . . . . . .",
        ". 0,2,4 . . 0,2,4 . . . 0,2,4 . . 0,2,4 . .",
        ". 0,2,4 . . . 0,2,4 . . 0,2,4 . . . 0,2,4 0",
        ". 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4"
      ] }),
    makePart({ role: 'harmony', name: 'Classical Nylon Color', behavior: 'phrase', bank: 'guitars', asset: 'nylon', octave: 3,
      gain: 0.22, attack: 0.003, decay: 0.22, sustain: 0.5, release: 0.14,
      patterns: [
        "0 . . 2 . 4 . 0 . . 2 . 4 . . .",
        "0 . . 2 . 4 . 5 . 4 . 2 . 0 . .",
        "0 . . . . 4 . . 0 . . . . 4 . .",
        "0 2 4 5 4 2 0 . 0 2 4 5 4 2 0 .",
        "0 . . 2 . 4 . 5 7 5 4 2 . 0 . .",
        "0 . . 2 . 4 . 0 . . 2 . 4 . . ."
      ] }),
    makePart({ role: 'melody', name: 'Joyful Trumpet Fanfare', behavior: 'phrase', bank: 'sambaReggae', asset: 'trompete', octave: 4,
      gain: 0.25, attack: 0.004, decay: 0.25, sustain: 0.6, release: 0.15, active: [false, true, false, true, true, true],
      patterns: [
        "4 . . 5 . 4 . 2 . . 0 . . . . .",
        "4 . . 5 . 7 . 5 . . 4 . 2 . . .",
        "2 . . 4 . . . . 0 . . . . . . .",
        "4 . 5 7 . 5 . 4 . . 2 . 0 . . .",
        "5 . . 7 . 8 . 7 . . 5 . 4 . . .",
        "4 . . 5 . 4 . 2 . . 0 . . . . ."
      ] }),
    makePart({ role: 'response', name: 'Tenor Sax Reply', behavior: 'phrase', bank: 'band', asset: 'tenor-sax', octave: 3,
      gain: 0.22, attack: 0.006, decay: 0.24, sustain: 0.55, release: 0.16, active: [false, false, true, true, true, false],
      patterns: [
        ". . . . . . . . 2 . 4 . 5 . 4 .",
        ". . . . . . . . 4 . 5 . 7 . 5 .",
        ". . . . . . . . 0 . 2 . 4 . 2 .",
        ". . . . . . . . 2 . 4 . 5 . 4 .",
        ". . . . . . . . 5 . 7 . 8 . 7 .",
        ". . . . . . . . 2 . 4 . 5 . 4 ."
      ] }),
    makePart({ role: 'response', name: 'Trombone Brass Punch', behavior: 'phrase', bank: 'sambaReggae', asset: 'trombone', octave: 3,
      gain: 0.23, attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.18, active: [false, true, false, true, false, true],
      patterns: [
        "0 . . . . . . . 4 . . . . . . .",
        "0 . . . 2 . . . 4 . . . 2 . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . 2 . . . . 4 . . 2 . . . .",
        "0 . . . 4 . . . 5 . . . 4 . . .",
        "0 . . . . . . . 4 . . . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Ride Cymbal Bell', behavior: 'pulse', bank: 'percussion', asset: 'ride', variant: 0, pitched: false,
      gain: 0.21, attack: 0.002, decay: 0.2, release: 0.1,
      patterns: [
        "0 . . 0 . . 0 . 0 . . 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 .",
        "0 . . . . . 0 . 0 . . . . . 0 .",
        "0 . 0 0 . . 0 . 0 . 0 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 0",
        "0 . . 0 . . 0 . 0 . . 0 . . 0 ."
      ] }),
    makePart({ role: 'melody', name: 'Atalaku Vocal Cry', behavior: 'phrase', bank: 'jazz', asset: 'formant', octave: 4,
      gain: 0.23, attack: 0.005, decay: 0.2, sustain: 0.45, release: 0.12, active: [false, true, false, true, true, true],
      patterns: [
        ". . 0 . . . 0 . . . 2 . . . 0 .",
        ". . 0 . . . 0 0 . . 2 . . 3 2 0",
        ". . 0 . . . . . . . 0 . . . . .",
        ". . 0 2 . . 0 . . . 2 . . . 0 .",
        ". . 0 . . . 0 0 . . 2 . . 4 3 2",
        ". . 0 . . . 0 . . . 2 . . . 0 ."
      ] })
  ]
};

// 10. Lagos 1982 · Jùjú (4/4, 110 BPM, G Major)
profiles['lagos-1982'] = {
  name: "Lagos 1982 · Jùjú",
  bpm: 110,
  meter: "4/4",
  root: "G",
  scale: "Maior",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 3, 4, 0],
    [4, 0],
    [0, 4, 3, 0],
    [3, 4, 1, 0],
    [0, 1, 4, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Electrified Yoruba praise singing study from Lagos pioneered by King Sunny Adé & His African Beats. Centered on pitch-bending dùndún talking drums, soaring pedal steel glides, sekere shakers and interlocking guitars. Reference: King Sunny Adé – Ja Funmi.",
  url: "https://en.wikipedia.org/wiki/J%C3%B9j%C3%BA_music",
  parts: [
    makePart({ role: 'rhythm', name: 'Acoustic Kick', behavior: 'pulse', bank: 'percussion', asset: 'kick', variant: 0, pitched: false,
      gain: 0.3, attack: 0.002, decay: 0.2, release: 0.09, lpf: 5000,
      patterns: [
        "0 . . . . . 0 . . . 0 . . . . .",
        "0 . . . . . 0 . . . 0 . . . 0 .",
        "0 . . . . . . . . . 0 . . . . .",
        "0 . . . 0 . 0 . . . 0 . . . 0 .",
        "0 . . . . . 0 . . . 0 . 0 . 0 .",
        "0 . . . . . 0 . . . 0 . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Snare Backbeat', behavior: 'pulse', bank: 'percussion', asset: 'snare', variant: 0, pitched: false,
      gain: 0.26, attack: 0.002, decay: 0.15, release: 0.07, lpf: 9000,
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'melody', name: 'Dùndún Talking Drum Lead', behavior: 'phrase', bank: 'percussion', asset: 'conga', octave: 3, pitchEnvelope: 3, pitchAttack: 0.1,
      gain: 0.26, attack: 0.003, decay: 0.22, sustain: 0.45, release: 0.12,
      patterns: [
        "0 . . 2 . . 4 . . 2 . 0 . . . .",
        "0 . . 2 . 4 5 . . 4 . 2 . 0 . .",
        "0 . . . . . 2 . . . . . . 0 . .",
        "0 . 2 4 . 5 4 . . 2 . 0 . . . .",
        "0 . . 2 . 4 5 . 7 5 . 4 . 2 . 0",
        "0 . . 2 . . 4 . . 2 . 0 . . . ."
      ] }),
    makePart({ role: 'response', name: 'Dùndún Answering Drum', behavior: 'phrase', bank: 'percussion', asset: 'tom', octave: 3, pitchEnvelope: 2, pitchAttack: 0.12,
      gain: 0.23, attack: 0.003, decay: 0.2, sustain: 0.4, release: 0.1, active: [false, true, true, true, true, false],
      patterns: [
        ". . . . . . . . 2 . . 4 . . 2 .",
        ". . . . . . . . 4 . . 5 . . 4 .",
        ". . . . . . . . 2 . . 0 . . . .",
        ". . . . . . . . 2 . 4 5 . 4 2 0",
        ". . . . . . . . 5 . . 7 . . 5 .",
        ". . . . . . . . 2 . . 4 . . 2 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Sekere Gourd Shaker', behavior: 'pulse', bank: 'percussion', asset: 'shaker', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 . 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Agogô Iron Bell', behavior: 'pulse', bank: 'sambaReggae', asset: 'agogo-agudo', variant: 0, pitched: false,
      gain: 0.21, attack: 0.002, decay: 0.12, release: 0.06,
      patterns: [
        "0 . . 0 . . 0 . . . 0 . 0 . . .",
        "0 . . 0 . . 0 . . . 0 . 0 . 0 .",
        "0 . . . . . 0 . . . 0 . . . . .",
        "0 . . 0 . 0 0 . . . 0 . 0 . . .",
        "0 . . 0 . . 0 . . . 0 . 0 . 0 0",
        "0 . . 0 . . 0 . . . 0 . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Closed Hi-Hat', behavior: 'pulse', bank: 'percussion', asset: 'hat', variant: 0, pitched: false,
      gain: 0.19, attack: 0.002, decay: 0.08, release: 0.04,
      patterns: [
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 .",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 0 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 ."
      ] }),
    makePart({ role: 'melody', name: 'Hawaiian Pedal Steel', behavior: 'sustain', bank: 'strings', asset: 'slide-electric', octave: 4,
      gain: 0.25, attack: 0.01, decay: 0.35, sustain: 0.7, release: 0.25,
      patterns: [
        "0 . . . 2 . . . 4 . . . 2 . . .",
        "0 . . . 2 . 4 . 5 . . . 4 . 2 .",
        "0 . . . . . . . 2 . . . . . . .",
        "0 . 2 . 4 . 5 . 4 . 2 . 0 . . .",
        "2 . . . 4 . 5 . 7 . . . 5 . 4 .",
        "0 . . . 2 . . . 4 . . . 2 . . ."
      ] }),
    makePart({ role: 'harmony', name: 'Interlocking Clean Guitar 1', behavior: 'phrase', bank: 'guitars', asset: 'clean', octave: 3,
      gain: 0.24, attack: 0.003, decay: 0.2, sustain: 0.45, release: 0.12,
      patterns: [
        "0 2 4 0 2 4 0 2 0 2 4 0 2 4 0 2",
        "0 2 4 5 4 2 0 2 0 2 4 5 4 2 0 2",
        "0 . . 4 . . 2 . 0 . . 4 . . 2 .",
        "0 2 4 5 4 2 4 2 0 2 4 5 4 2 4 2",
        "0 2 4 5 7 5 4 2 0 2 4 5 7 5 4 2",
        "0 2 4 0 2 4 0 2 0 2 4 0 2 4 0 2"
      ] }),
    makePart({ role: 'harmony', name: 'Interlocking Clean Guitar 2', behavior: 'phrase', bank: 'guitars', asset: 'muted', octave: 3,
      gain: 0.21, attack: 0.002, decay: 0.14, sustain: 0.35, release: 0.08,
      patterns: [
        ". 0 . . 2 . . 0 . 0 . . 2 . . 0",
        ". 0 . . 2 . . 3 . 0 . . 2 . . 3",
        ". 0 . . . . . 0 . 0 . . . . . 0",
        ". 0 . 2 . 0 . 2 . 0 . 2 . 0 . 2",
        ". 2 . . 3 . . 4 . 2 . . 3 . . 4",
        ". 0 . . 2 . . 0 . 0 . . 2 . . 0"
      ] }),
    makePart({ role: 'bass', name: 'Warm Walking Bass', behavior: 'phrase', bank: 'guitars', asset: 'bass', octave: 2,
      gain: 0.28, attack: 0.004, decay: 0.22, sustain: 0.55, release: 0.12,
      patterns: [
        "0 . . 0 . . 2 . 4 . . 2 . 0 . .",
        "0 . . 0 . . 2 . 4 . 5 4 . 2 . 0",
        "0 . . . . . 2 . . . . . . 0 . .",
        "0 . 2 0 . . 2 . 4 . . 2 . 0 . .",
        "0 . . 0 . . 2 . 4 . 5 7 . 5 . 4",
        "0 . . 0 . . 2 . 4 . . 2 . 0 . ."
      ] }),
    makePart({ role: 'harmony', name: 'Celesta Shimmer', behavior: 'phrase', bank: 'keys', asset: 'celesta', octave: 4,
      gain: 0.21, attack: 0.002, decay: 0.2, sustain: 0.35, release: 0.14, active: [false, true, true, true, false, true],
      patterns: [
        "4 . . 5 . 7 . 5 . . 4 . 2 . . .",
        "4 . . 5 . 7 . 8 . . 7 . 5 . . .",
        "2 . . 4 . . . . 0 . . . . . . .",
        "4 . 5 7 . 5 . 4 . . 2 . 0 . . .",
        "5 . . 7 . 8 . 9 . . 7 . 5 . . .",
        "4 . . 5 . 7 . 5 . . 4 . 2 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Acoustic Room Claps', behavior: 'pulse', bank: 'drums', asset: 'room-clap', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.14, release: 0.06, active: [false, true, false, true, true, true],
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . . . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Conga Mute Slap', behavior: 'pulse', bank: 'percussion', asset: 'muted-conga', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.12, release: 0.05,
      patterns: [
        ". . 0 . . . 0 . . . 0 . . . 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 .",
        ". . 0 . . . . . . . 0 . . . . .",
        ". . 0 . . 0 0 . . . 0 . . 0 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 0",
        ". . 0 . . . 0 . . . 0 . . . 0 ."
      ] }),
    makePart({ role: 'response', name: 'Tenor Sax Breath', behavior: 'phrase', bank: 'band', asset: 'tenor-sax', octave: 3,
      gain: 0.22, attack: 0.006, decay: 0.24, sustain: 0.55, release: 0.16, active: [false, false, true, true, true, false],
      patterns: [
        ". . . . . . . . 2 . 4 . 5 . 4 .",
        ". . . . . . . . 4 . 5 . 7 . 5 .",
        ". . . . . . . . 0 . 2 . 4 . 2 .",
        ". . . . . . . . 2 . 4 . 5 . 4 .",
        ". . . . . . . . 5 . 7 . 8 . 7 .",
        ". . . . . . . . 2 . 4 . 5 . 4 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Crash Cymbal', behavior: 'pulse', bank: 'percussion', asset: 'crash', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.3, release: 0.15, active: [true, false, true, false, true, false],
      patterns: [
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . . . . . . . . ."
      ] })
  ]
};

// 11. Gaza 1987 · Majika (4/4, 126 BPM, D Major)
profiles['gaza-1987'] = {
  name: "Gaza 1987 · Majika",
  bpm: 126,
  meter: "4/4",
  root: "D",
  scale: "Maior",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 3, 4, 0],
    [4, 0],
    [0, 4, 3, 0],
    [3, 4, 1, 0],
    [0, 1, 4, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Mozambican majika study created by the band Ghorwane (named after a rare lake in arid Gaza province). Combines traditional xigubu warrior rhythms, Chopi timbila marimbas and blazing rock-soukous guitars. Reference: Ghorwane – Majurugenta.",
  url: "https://realworldrecords.com/artists/ghorwane/",
  parts: [
    makePart({ role: 'rhythm', name: 'Acoustic Kick', behavior: 'pulse', bank: 'percussion', asset: 'kick', variant: 0, pitched: false,
      gain: 0.31, attack: 0.002, decay: 0.2, release: 0.08, lpf: 5000,
      patterns: [
        "0 . . . . . 0 . . . 0 . . . . .",
        "0 . . . . . 0 . . . 0 . . . 0 .",
        "0 . . . . . . . . . 0 . . . . .",
        "0 . . . 0 . 0 . . . 0 . . . 0 .",
        "0 . . . . . 0 . . . 0 . 0 . 0 .",
        "0 . . . . . 0 . . . 0 . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Snare Backbeat', behavior: 'pulse', bank: 'percussion', asset: 'snare', variant: 0, pitched: false,
      gain: 0.27, attack: 0.002, decay: 0.15, release: 0.07, lpf: 9000,
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Xigubu Warrior Tom Low', behavior: 'pulse', bank: 'percussion', asset: 'tom', variant: 0, pitched: false,
      gain: 0.26, attack: 0.002, decay: 0.18, release: 0.08,
      patterns: [
        "0 . . 0 . . 0 . 0 . . 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 .",
        "0 . . . . . 0 . 0 . . . . . 0 .",
        "0 . 0 0 . . 0 . 0 . 0 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 0",
        "0 . . 0 . . 0 . 0 . . 0 . . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Xigubu Warrior Tom High', behavior: 'pulse', bank: 'percussion', asset: 'tom', variant: 1, pitched: false,
      gain: 0.23, attack: 0.002, decay: 0.16, release: 0.07,
      patterns: [
        ". 0 . . 0 . . 0 . 0 . . 0 . . 0",
        ". 0 . . 0 . 0 0 . 0 . . 0 . 0 0",
        ". 0 . . . . . 0 . 0 . . . . . 0",
        ". 0 . 0 0 . . 0 . 0 . 0 0 . . 0",
        ". 0 . . 0 . 0 0 . 0 . . 0 . 0 0",
        ". 0 . . 0 . . 0 . 0 . . 0 . . 0"
      ] }),
    makePart({ role: 'rhythm', name: 'Hi-Hat Flow', behavior: 'pulse', bank: 'percussion', asset: 'hat', variant: 0, pitched: false,
      gain: 0.19, attack: 0.002, decay: 0.08, release: 0.04,
      patterns: [
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 .",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 0 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Tambourine Shimmer', behavior: 'pulse', bank: 'percussion', asset: 'tambourine', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0",
        ". 0 . 0 . 0 0 0 . 0 . 0 . 0 0 0",
        ". 0 . . . 0 . . . 0 . . . 0 . .",
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 0 0",
        ". 0 . 0 . 0 0 0 . 0 . 0 . 0 0 0",
        ". 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0"
      ] }),
    makePart({ role: 'melody', name: 'Chopi Timbila Marimba', behavior: 'phrase', bank: 'band', asset: 'marimba', octave: 4,
      gain: 0.25, attack: 0.002, decay: 0.2, sustain: 0.4, release: 0.12,
      patterns: [
        "0 2 4 5 4 2 0 2 0 2 4 5 4 2 0 2",
        "0 2 4 5 7 5 4 2 0 2 4 5 7 5 4 2",
        "0 . . 4 . . 2 . 0 . . 4 . . 2 .",
        "0 2 4 5 4 2 0 2 4 5 7 5 4 2 0 2",
        "0 2 4 5 7 9 7 5 4 2 4 5 7 5 4 2",
        "0 2 4 5 4 2 0 2 0 2 4 5 4 2 0 2"
      ] }),
    makePart({ role: 'melody', name: 'Rock-Soukous Lead Guitar', behavior: 'phrase', bank: 'guitars', asset: 'clean', octave: 4,
      gain: 0.26, attack: 0.002, decay: 0.2, sustain: 0.45, release: 0.12,
      patterns: [
        "4 . . 5 . 4 . 2 . . 0 . 2 . 4 .",
        "4 . . 5 . 7 . 5 . . 4 . 2 . 0 .",
        "2 . . 4 . . . . 0 . . . . . . .",
        "4 . 5 7 . 5 . 4 . . 2 . 0 . 2 .",
        "5 . . 7 . 8 . 7 . . 5 . 4 . 2 .",
        "4 . . 5 . 4 . 2 . . 0 . 2 . 4 ."
      ] }),
    makePart({ role: 'harmony', name: 'Rhythm Guitar Crunch', behavior: 'sustain', bank: 'strings', asset: 'crunch-electric', octave: 3,
      gain: 0.22, attack: 0.003, decay: 0.15, sustain: 0.4, release: 0.1, active: [false, true, true, true, true, true],
      patterns: [
        ". 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4",
        ". 0,2,4 . . . 0,2,4 . . 0,2,4 . . . 0,2,4 .",
        ". 0,2,4 . . . . . . . . 0,2,4 . . . . . . .",
        ". 0,2,4 . . 0,2,4 . . . 0,2,4 . . 0,2,4 . .",
        ". 0,2,4 . . . 0,2,4 . . 0,2,4 . . . 0,2,4 0",
        ". 0,2,4 . . . 0,2,4 . . . 0,2,4 . . . 0,2,4"
      ] }),
    makePart({ role: 'harmony', name: 'Muted Guitar Drive', behavior: 'phrase', bank: 'guitars', asset: 'muted', octave: 3,
      gain: 0.21, attack: 0.002, decay: 0.12, sustain: 0.3, release: 0.08,
      patterns: [
        "0 . . 0 . . 0 . 0 . . 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 .",
        "0 . . . . . 0 . 0 . . . . . 0 .",
        "0 . 0 0 . . 0 . 0 . 0 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 0",
        "0 . . 0 . . 0 . 0 . . 0 . . 0 ."
      ] }),
    makePart({ role: 'bass', name: 'Heavy Picked Bass', behavior: 'phrase', bank: 'strings', asset: 'bass-pick', octave: 2,
      gain: 0.29, attack: 0.003, decay: 0.22, sustain: 0.6, release: 0.12, lpf: 4500,
      patterns: [
        "0 . . 0 . 4 . 0 . . 2 . 4 . . .",
        "0 . . 0 . 4 . 0 . 2 3 . 4 . 0 .",
        "0 . . . . 4 . . 0 . . . . 4 . .",
        "0 . 2 0 . 4 . 0 . 0 2 . 4 . 0 .",
        "0 . . 0 . 4 . 0 . 2 3 . 4 . 5 .",
        "0 . . 0 . 4 . 0 . . 2 . 4 . . ."
      ] }),
    makePart({ role: 'melody', name: 'Horn Section Trumpet', behavior: 'phrase', bank: 'sambaReggae', asset: 'trompete', octave: 4,
      gain: 0.25, attack: 0.004, decay: 0.25, sustain: 0.6, release: 0.15, active: [false, true, false, true, true, true],
      patterns: [
        "4 . . 5 . 7 . 5 . . 4 . 2 . . .",
        "4 . . 5 . 7 . 8 . . 7 . 5 . . .",
        "2 . . 4 . . . . 0 . . . . . . .",
        "4 . 5 7 . 5 . 4 . . 2 . 0 . . .",
        "5 . . 7 . 8 . 9 . . 7 . 5 . . .",
        "4 . . 5 . 7 . 5 . . 4 . 2 . . ."
      ] }),
    makePart({ role: 'response', name: 'Horn Section Tenor Sax', behavior: 'phrase', bank: 'band', asset: 'tenor-sax', octave: 3,
      gain: 0.23, attack: 0.006, decay: 0.24, sustain: 0.55, release: 0.16, active: [false, false, true, true, true, false],
      patterns: [
        ". . . . . . . . 2 . 4 . 5 . 4 .",
        ". . . . . . . . 4 . 5 . 7 . 5 .",
        ". . . . . . . . 0 . 2 . 4 . 2 .",
        ". . . . . . . . 2 . 4 . 5 . 4 .",
        ". . . . . . . . 5 . 7 . 8 . 7 .",
        ". . . . . . . . 2 . 4 . 5 . 4 ."
      ] }),
    makePart({ role: 'response', name: 'Tenor Trombone Punch', behavior: 'phrase', bank: 'sambaReggae', asset: 'trombone', octave: 3,
      gain: 0.23, attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.18, active: [false, true, false, true, false, true],
      patterns: [
        "0 . . . . . . . 4 . . . . . . .",
        "0 . . . 2 . . . 4 . . . 2 . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . 2 . . . . 4 . . 2 . . . .",
        "0 . . . 4 . . . 5 . . . 4 . . .",
        "0 . . . . . . . 4 . . . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Conga Warrior Drive', behavior: 'pulse', bank: 'percussion', asset: 'conga', variant: 0, pitched: false,
      gain: 0.24, attack: 0.003, decay: 0.16, release: 0.08,
      patterns: [
        "0 . . 0 . 0 . . 0 . . 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 . .",
        "0 . . . . 0 . . 0 . . . . 0 . .",
        "0 . 0 0 . 0 . . 0 . 0 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 0 .",
        "0 . . 0 . 0 . . 0 . . 0 . 0 . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Ride Bell Cymbal', behavior: 'pulse', bank: 'percussion', asset: 'ride', variant: 0, pitched: false,
      gain: 0.21, attack: 0.002, decay: 0.2, release: 0.1,
      patterns: [
        "0 . . 0 . . 0 . 0 . . 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 .",
        "0 . . . . . 0 . 0 . . . . . 0 .",
        "0 . 0 0 . . 0 . 0 . 0 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 0",
        "0 . . 0 . . 0 . 0 . . 0 . . 0 ."
      ] })
  ]
};

// 12. Kisumu 1980 · Benga (4/4, 130 BPM, A Major)
profiles['kisumu-1980'] = {
  name: "Kisumu 1980 · Benga",
  bpm: 130,
  meter: "4/4",
  root: "A",
  scale: "Maior",
  harmony: "cadence",
  harmonicSequences: [
    [0],
    [0, 3, 4, 0],
    [4, 0],
    [0, 4, 3, 0],
    [3, 4, 1, 0],
    [0, 1, 4, 0]
  ],
  swing: 0,
  sections: [16, 32, 16, 32, 16, 32],
  reference: "Kenyan Benga study rooted in the Luo people around Lake Victoria. Transposes the sacred 8-string nyatiti lyre fingerpicking and oduong ankle bells onto twin electric guitars and hyperactive basslines. Reference: Ayub Ogada – Kothbiro.",
  url: "https://en.wikipedia.org/wiki/Benga_music",
  parts: [
    makePart({ role: 'rhythm', name: 'Acoustic Kick', behavior: 'pulse', bank: 'percussion', asset: 'kick', variant: 0, pitched: false,
      gain: 0.31, attack: 0.002, decay: 0.2, release: 0.08, lpf: 5000,
      patterns: [
        "0 . . . . . 0 . . . 0 . . . . .",
        "0 . . . . . 0 . . . 0 . . . 0 .",
        "0 . . . . . . . . . 0 . . . . .",
        "0 . . . 0 . 0 . . . 0 . . . 0 .",
        "0 . . . . . 0 . . . 0 . 0 . 0 .",
        "0 . . . . . 0 . . . 0 . . . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Snare Backbeat', behavior: 'pulse', bank: 'percussion', asset: 'snare', variant: 0, pitched: false,
      gain: 0.27, attack: 0.002, decay: 0.15, release: 0.07, lpf: 9000,
      patterns: [
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 .",
        ". . . . 0 . . . . . . . 0 . . .",
        ". . . . 0 . . 0 . . . . 0 . . .",
        ". . . . 0 . . . . . . . 0 . 0 0",
        ". . . . 0 . . . . . . . 0 . . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Hi-Hat Flow', behavior: 'pulse', bank: 'percussion', asset: 'hat', variant: 0, pitched: false,
      gain: 0.19, attack: 0.002, decay: 0.08, release: 0.04,
      patterns: [
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 .",
        "0 . . . 0 . . . 0 . . . 0 . . .",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 0 0 .",
        "0 . 0 . 0 . 0 0 0 . 0 . 0 . 0 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Oduong Ankle Bell', behavior: 'pulse', bank: 'sambaReggae', asset: 'agogo-agudo', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.12, release: 0.06,
      patterns: [
        "0 . . 0 . . 0 . 0 . . 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 .",
        "0 . . . . . 0 . 0 . . . . . 0 .",
        "0 . 0 0 . . 0 . 0 . 0 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 0",
        "0 . . 0 . . 0 . 0 . . 0 . . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Shaker Drive', behavior: 'pulse', bank: 'percussion', asset: 'shaker', variant: 0, pitched: false,
      gain: 0.2, attack: 0.002, decay: 0.1, release: 0.05,
      patterns: [
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 . 0",
        "0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 . 0 0 0 0 0 0 0 0 0",
        "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"
      ] }),
    makePart({ role: 'melody', name: 'Nyatiti Fingerpicked Guitar 1', behavior: 'phrase', bank: 'guitars', asset: 'clean', octave: 4,
      gain: 0.25, attack: 0.002, decay: 0.2, sustain: 0.45, release: 0.12,
      patterns: [
        "0 2 4 5 4 2 0 2 0 2 4 5 4 2 0 2",
        "0 2 4 5 7 5 4 2 0 2 4 5 7 5 4 2",
        "0 . . 4 . . 2 . 0 . . 4 . . 2 .",
        "0 2 4 5 4 2 0 2 4 5 7 5 4 2 0 2",
        "0 2 4 5 7 9 7 5 4 2 4 5 7 5 4 2",
        "0 2 4 5 4 2 0 2 0 2 4 5 4 2 0 2"
      ] }),
    makePart({ role: 'melody', name: 'Nyatiti Fingerpicked Guitar 2', behavior: 'phrase', bank: 'guitars', asset: 'nylon', octave: 3,
      gain: 0.23, attack: 0.003, decay: 0.22, sustain: 0.5, release: 0.14,
      patterns: [
        ". 0 . 2 . 4 . 2 . 0 . 2 . 4 . 2",
        ". 0 . 2 . 4 . 5 . 4 . 2 . 0 . 2",
        ". 0 . . . 4 . . . 0 . . . 4 . .",
        ". 0 . 2 4 5 . 4 . 2 . 4 . 2 . 0",
        ". 2 . 4 . 5 . 7 . 5 . 4 . 2 . 4",
        ". 0 . 2 . 4 . 2 . 0 . 2 . 4 . 2"
      ] }),
    makePart({ role: 'harmony', name: 'Muted Guitar Chank', behavior: 'phrase', bank: 'guitars', asset: 'muted', octave: 3,
      gain: 0.21, attack: 0.002, decay: 0.12, sustain: 0.3, release: 0.08,
      patterns: [
        "0 . . 0 . . 0 . 0 . . 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 .",
        "0 . . . . . 0 . 0 . . . . . 0 .",
        "0 . 0 0 . . 0 . 0 . 0 0 . . 0 .",
        "0 . . 0 . . 0 0 0 . . 0 . . 0 0",
        "0 . . 0 . . 0 . 0 . . 0 . . 0 ."
      ] }),
    makePart({ role: 'bass', name: 'Benga Hyperactive Bass', behavior: 'phrase', bank: 'guitars', asset: 'bass', octave: 2,
      gain: 0.29, attack: 0.003, decay: 0.22, sustain: 0.6, release: 0.12,
      patterns: [
        "0 . . 0 . 4 . 0 . . 2 . 4 . . .",
        "0 . . 0 . 4 . 0 . 2 3 . 4 . 0 .",
        "0 . . . . 4 . . 0 . . . . 4 . .",
        "0 . 2 0 . 4 . 0 . 0 2 . 4 . 0 .",
        "0 . . 0 . 4 . 0 . 2 3 . 4 . 5 .",
        "0 . . 0 . 4 . 0 . . 2 . 4 . . ."
      ] }),
    makePart({ role: 'melody', name: 'Sacred Nyatiti Marimba', behavior: 'phrase', bank: 'band', asset: 'marimba', octave: 4,
      gain: 0.24, attack: 0.002, decay: 0.2, sustain: 0.4, release: 0.12,
      patterns: [
        "4 . . 5 . . 7 . . 5 . . 4 . . .",
        "4 . . 5 . 7 8 . . 7 . 5 4 . . .",
        "2 . . 4 . . . . 0 . . . . . . .",
        "4 . 5 7 . 5 . 4 . . 2 . 0 . 2 .",
        "5 . . 7 . 8 . 9 . . 7 . 5 . 4 .",
        "4 . . 5 . . 7 . . 5 . . 4 . . ."
      ] }),
    makePart({ role: 'melody', name: 'Flute Pastoral Melody', behavior: 'sustain', bank: 'classical', asset: 'flute-sustain', octave: 4,
      gain: 0.22, attack: 0.008, decay: 0.3, sustain: 0.6, release: 0.2, active: [false, true, false, true, true, true],
      patterns: [
        "0 . . 2 . 4 . 5 . . 4 . 2 . . .",
        "0 . . 2 . 4 . 7 . . 5 . 4 . 2 .",
        "0 . . . . 2 . . . . . . . . . .",
        "0 . 2 4 . 5 . 7 . . 5 . 4 . 2 .",
        "2 . . 4 . 5 . 7 9 . 7 . 5 . 4 .",
        "0 . . 2 . 4 . 5 . . 4 . 2 . . ."
      ] }),
    makePart({ role: 'response', name: 'Alto Recorder Echo', behavior: 'phrase', bank: 'classical', asset: 'alto-recorder-sustain', octave: 4,
      gain: 0.2, attack: 0.01, decay: 0.25, sustain: 0.5, release: 0.16, active: [false, false, true, true, true, false],
      patterns: [
        ". . . . . . . . 4 . 2 . 0 . . .",
        ". . . . . . . . 5 . 4 . 2 . 0 .",
        ". . . . . . . . 2 . 0 . . . . .",
        ". . . . . . . . 4 . 2 0 . . . .",
        ". . . . . . . . 7 . 5 . 4 . 2 .",
        ". . . . . . . . 4 . 2 . 0 . . ."
      ] }),
    makePart({ role: 'harmony', name: 'Celesta Shimmer', behavior: 'phrase', bank: 'keys', asset: 'celesta', octave: 4,
      gain: 0.21, attack: 0.002, decay: 0.2, sustain: 0.35, release: 0.14, active: [false, true, true, true, false, true],
      patterns: [
        ". . 7 . . . 6 . . . 5 . . . 4 .",
        ". . 7 . . 8 7 . . . 5 . . . 4 .",
        ". . 5 . . . 4 . . . 3 . . . 2 .",
        ". . 7 . . . 6 . . 5 4 . . . 2 .",
        ". . 8 . . . 7 . . . 5 . . . 4 .",
        ". . 7 . . . 6 . . . 5 . . . 4 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Bongo Slap', behavior: 'pulse', bank: 'percussion', asset: 'bongo', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.12, release: 0.05,
      patterns: [
        ". . 0 . . . 0 . . . 0 . . . 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 .",
        ". . 0 . . . . . . . 0 . . . . .",
        ". . 0 . . 0 0 . . . 0 . . 0 0 .",
        ". . 0 . . . 0 0 . . 0 . . . 0 0",
        ". . 0 . . . 0 . . . 0 . . . 0 ."
      ] }),
    makePart({ role: 'rhythm', name: 'Conga Drive', behavior: 'pulse', bank: 'percussion', asset: 'conga', variant: 0, pitched: false,
      gain: 0.24, attack: 0.003, decay: 0.16, release: 0.08,
      patterns: [
        "0 . . 0 . 0 . . 0 . . 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 . .",
        "0 . . . . 0 . . 0 . . . . 0 . .",
        "0 . 0 0 . 0 . . 0 . 0 0 . 0 . .",
        "0 . . 0 . 0 . 0 0 . . 0 . 0 0 .",
        "0 . . 0 . 0 . . 0 . . 0 . 0 . ."
      ] }),
    makePart({ role: 'rhythm', name: 'Crash Cymbal Hit', behavior: 'pulse', bank: 'percussion', asset: 'crash', variant: 0, pitched: false,
      gain: 0.22, attack: 0.002, decay: 0.3, release: 0.15, active: [true, false, true, false, true, false],
      patterns: [
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . . . . . . . . .",
        "0 . . . . . . . 0 . . . . . . .",
        "0 . . . . . . . . . . . . . . ."
      ] })
  ]
};

console.log('All 12 profiles defined. Validating and saving...');

for (const [id, profile] of Object.entries(profiles)) {
  const result = styleProfileSchema.safeParse(profile);
  if (!result.success) {
    console.error(`Validation failed for ${id}:`, JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }
  const file = path.resolve(`data/music/profiles/${id}.json`);
  fs.writeFileSync(file, JSON.stringify(profile, null, 2) + '\n');
  console.log(`Validated and wrote ${id} (${profile.parts.length} parts)`);
}
console.log('All 12 African style profiles successfully generated and validated!');
