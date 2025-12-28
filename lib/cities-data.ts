export interface CityData {
  id: string
  name: string
  country: string
  year: number
  genre: string
  description: string
  bpm: number
  scale: string[]
  coordinates: { x: number; y: number }
  color: string
  samples: {
    kick: string
    snare: string
    hihat: string
    bass: string
    pad: string
    lead: string
  }
}

export const cities: CityData[] = [
  {
    id: "chicago",
    name: "Chicago",
    country: "USA",
    year: 1984,
    genre: "Classic House",
    description: "Piano chords, Roland TR-909, Jacking grooves",
    bpm: 122,
    scale: ["C4", "D4", "E4", "G4", "A4"],
    coordinates: { x: 22, y: 38 },
    color: "#00ffaa",
    samples: {
      kick: "bd:0",
      snare: "sd:1",
      hihat: "hh:0",
      bass: "bass:0",
      pad: "pad:0",
      lead: "piano:0",
    },
  },
  {
    id: "detroit",
    name: "Detroit",
    country: "USA",
    year: 1985,
    genre: "Techno Origins",
    description: "Industrial sounds, TR-808, cold futuristic synths",
    bpm: 130,
    scale: ["C4", "Eb4", "F4", "G4", "Bb4"],
    coordinates: { x: 24, y: 36 },
    color: "#ff6600",
    samples: {
      kick: "bd:1",
      snare: "cp:0",
      hihat: "hh:1",
      bass: "bass:1",
      pad: "pad:1",
      lead: "synth:0",
    },
  },
  {
    id: "london",
    name: "London",
    country: "UK",
    year: 1992,
    genre: "Breakbeat / Jungle",
    description: "Broken beats, deep sub-bass, reggae/dub samples",
    bpm: 160,
    scale: ["C4", "D4", "F4", "G4", "Bb4"],
    coordinates: { x: 48, y: 32 },
    color: "#ff00ff",
    samples: {
      kick: "bd:2",
      snare: "sd:2",
      hihat: "hh:2",
      bass: "bass:2",
      pad: "pad:2",
      lead: "synth:1",
    },
  },
  {
    id: "berlin",
    name: "Berlin",
    country: "Germany",
    year: 1994,
    genre: "Minimal / Hard Techno",
    description: "Concrete aesthetics, hypnotic loops, metallic percussion",
    bpm: 138,
    scale: ["C4", "D4", "E4", "F#4", "A4"],
    coordinates: { x: 52, y: 30 },
    color: "#00ccff",
    samples: {
      kick: "bd:3",
      snare: "rim:0",
      hihat: "hh:3",
      bass: "bass:3",
      pad: "pad:3",
      lead: "synth:2",
    },
  },
  {
    id: "ibiza",
    name: "Ibiza",
    country: "Spain",
    year: 1998,
    genre: "Balearic / Trance",
    description: "Ethereal pads, solar atmospheres, rising synth melodies",
    bpm: 140,
    scale: ["C4", "E4", "F4", "G4", "B4"],
    coordinates: { x: 49, y: 42 },
    color: "#ffaa00",
    samples: {
      kick: "bd:4",
      snare: "sd:3",
      hihat: "hh:4",
      bass: "bass:4",
      pad: "pad:4",
      lead: "synth:3",
    },
  },
  {
    id: "miami",
    name: "Miami",
    country: "USA",
    year: 1988,
    genre: "Electro / Miami Bass",
    description: "Explosive 808 kicks, vocoders, fast party beats",
    bpm: 125,
    scale: ["C4", "D4", "F4", "G4", "A4"],
    coordinates: { x: 23, y: 48 },
    color: "#ff0066",
    samples: {
      kick: "bd:5",
      snare: "sd:4",
      hihat: "hh:5",
      bass: "bass:5",
      pad: "pad:5",
      lead: "synth:4",
    },
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    year: 2000,
    genre: "Minimal / Glitch",
    description: "Clean digital sounds, sine beeps, micro-surgical rhythm",
    bpm: 128,
    scale: ["C4", "D#4", "F4", "G#4", "A#4"],
    coordinates: { x: 85, y: 38 },
    color: "#ff3366",
    samples: {
      kick: "bd:6",
      snare: "sd:5",
      hihat: "hh:6",
      bass: "bass:6",
      pad: "pad:6",
      lead: "synth:5",
    },
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    year: 2010,
    genre: "Big Room / Hardstyle",
    description: "Distorted kicks, supersaw leads, festival energy",
    bpm: 150,
    scale: ["C4", "D4", "E4", "G4", "A4"],
    coordinates: { x: 50, y: 29 },
    color: "#ff6633",
    samples: {
      kick: "bd:7",
      snare: "sd:6",
      hihat: "hh:7",
      bass: "bass:7",
      pad: "pad:7",
      lead: "synth:6",
    },
  },
  {
    id: "losangeles",
    name: "Los Angeles",
    country: "USA",
    year: 2015,
    genre: "Synthwave / Future Bass",
    description: "Neon sunset aesthetics, bright modulated synth chords",
    bpm: 110,
    scale: ["C4", "D4", "E4", "F#4", "A4"],
    coordinates: { x: 12, y: 40 },
    color: "#ff00aa",
    samples: {
      kick: "bd:8",
      snare: "sd:7",
      hihat: "hh:8",
      bass: "bass:8",
      pad: "pad:8",
      lead: "synth:7",
    },
  },
  {
    id: "lasvegas",
    name: "Las Vegas",
    country: "USA",
    year: 2020,
    genre: "Commercial EDM",
    description: "Crystal-clear production, intense drops, cinematic FX",
    bpm: 128,
    scale: ["C4", "E4", "F4", "G4", "B4"],
    coordinates: { x: 15, y: 42 },
    color: "#ffcc00",
    samples: {
      kick: "bd:9",
      snare: "sd:8",
      hihat: "hh:9",
      bass: "bass:9",
      pad: "pad:9",
      lead: "synth:8",
    },
  },
]

export function getCitiesForDecade(year: number): CityData[] {
  return cities.filter((city) => city.year <= year)
}

export function getCityById(id: string): CityData | undefined {
  return cities.find((city) => city.id === id)
}
