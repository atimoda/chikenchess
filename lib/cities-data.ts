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
  // 1. Düsseldorf (1970)
  {
    id: "dusseldorf",
    name: "Düsseldorf",
    country: "Germany",
    year: 1970,
    genre: "Krautrock / Electro Pop",
    description: "Robotic rhythms, synthesized vocoders, the blueprint of electronic music.",
    bpm: 118,
    scale: ["C4", "D4", "E4", "G4", "A4"], // Major Pentatonic (Kraftwerk-ish)
    coordinates: { x: 48, y: 24 }, // Düsseldorf
    color: "#ff3333", // Red (Man Machine)
    samples: {
      kick: "bd:0", // Kraftwerk style tightly gated
      snare: "sd:5", // Electronic snap
      hihat: "hh:5", // Ticked machine hat
      bass: "bass:6", // Sine bass
      pad: "pad:6", // Synth strings
      lead: "synth:5", // Sine/Square lead
    },
  },
  // 2. New York City (1977)
  {
    id: "nyc",
    name: "New York City",
    country: "USA",
    year: 1977,
    genre: "Disco / Garage",
    description: "Four-on-the-floor, orchestral stabs, soul vocals, the birth of club culture.",
    bpm: 120,
    scale: ["C4", "Eb4", "F4", "G4", "Bb4"], // Minor Pentatonic (Funk/Soul roots)
    coordinates: { x: 29, y: 28 }, // NYC
    color: "#a020f0", // Purple (Studio 54 / Nightclub)
    samples: {
      kick: "bd:5", // Acoust-electric disco kick
      snare: "sd:4", // Clap/Snare layered
      hihat: "hh:2", // Open hats
      bass: "bass:5", // Funk bass
      pad: "pad:4", // Strings
      lead: "piano:0", // Electric Piano
    },
  },
  // 3. Chicago (1984)
  {
    id: "chicago",
    name: "Chicago",
    country: "USA",
    year: 1984,
    genre: "Classic House",
    description: "Jack your body. TR-909 rhythms, piano stabs, soulful vocals.",
    bpm: 124,
    scale: ["C4", "D4", "E4", "G4", "A4"],
    coordinates: { x: 25, y: 27 }, // Chicago
    color: "#00ffaa", // Neon Green/Cyan (Acid/House vibe)
    samples: {
      kick: "bd:0", // 909 Kick
      snare: "sd:1", // 909 Snare/Clap
      hihat: "hh:0", // 909 Hats
      bass: "bass:0", // FM Bass
      pad: "pad:0", // Deep Pad
      lead: "piano:0", // House Piano
    },
  },
  // 4. Detroit (1986)
  {
    id: "detroit",
    name: "Detroit",
    country: "USA",
    year: 1986,
    genre: "Techno",
    description: "Hi-tech jazz. Industrial soul. The Belleville Three.",
    bpm: 132,
    scale: ["C4", "Eb4", "F4", "G4", "Bb4"],
    coordinates: { x: 26, y: 27 }, // Detroit
    color: "#ff6600", // Industrial Orange
    samples: {
      kick: "bd:1", // 909 Distorted
      snare: "cp:0", // 909 Clap
      hihat: "hh:1", // Metallic Hats
      bass: "bass:1", // Analog Bass
      pad: "pad:1", // Cold Strings
      lead: "synth:0", // Detroit Stabs
    },
  },
  // 5. Ibiza (1986)
  {
    id: "ibiza",
    name: "Ibiza",
    country: "Spain",
    year: 1986,
    genre: "Balearic Beat",
    description: "Sunset moods, eclectic blends, psychedelic dance.",
    bpm: 110,
    scale: ["C4", "E4", "F4", "G4", "B4"], // Lydian (Dreamy)
    coordinates: { x: 50.5, y: 29 }, // Ibiza (South of Europe, North of Africa)
    color: "#ffaa00", // Sunset Gold
    samples: {
      kick: "bd:4", // Softer kick
      snare: "sd:3",
      hihat: "hh:4", // Shaker
      bass: "bass:4",
      pad: "pad:4", // Warm Pad
      lead: "synth:3", // Flute/Synth
    },
  },
  // 6. Manchester (1988)
  {
    id: "manchester",
    name: "Manchester",
    country: "UK",
    year: 1988,
    genre: "Acid House / Rave",
    description: "The Haçienda, smiley faces, TB-303 squelches, sirens.",
    bpm: 128,
    scale: ["C4", "Eb4", "F4", "Gb4", "Bb4"], // Blues/Acid scale
    coordinates: { x: 49, y: 21 }, // Manchester
    color: "#ffff00", // Acid Yellow (Smiley)
    samples: {
      kick: "bd:2", // Rave Kick
      snare: "sd:2", // Breakbeat Snare
      hihat: "hh:2",
      bass: "bass:2", // 303 Bass
      pad: "pad:2", // Rave Hoover
      lead: "synth:1", // 303 Acid Lead
    },
  },
  // 7. Berlin (1991)
  {
    id: "berlin",
    name: "Berlin",
    country: "Germany",
    year: 1991,
    genre: "Techno (Post-Wall)",
    description: "Tresor, E-Werk. Concrete, darkness, relentless strobe loops.",
    bpm: 140,
    scale: ["C4", "Db4", "E4", "F4", "G4", "Ab4", "B4"], // Phrygian Dominant (Dark/Tension)
    coordinates: { x: 53.7, y: 21 }, // Berlin
    color: "#00ccff", // Cold Blue
    samples: {
      kick: "bd:3", // Rumble Kick
      snare: "rim:0", // Industrial Rim
      hihat: "hh:3", // Fast 909 Hats
      bass: "bass:3", // Sub Rumble
      pad: "pad:3", // Dark Drone
      lead: "synth:2", // Metallic Stab
    },
  },
  // 8. Tokyo (1991)
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    year: 1991,
    genre: "Minimal / Experimental",
    description: "Precision, glitch aesthetics, yellow magic electronics.",
    bpm: 130,
    scale: ["C4", "Eb4", "F4", "G4", "Bb4"],
    coordinates: { x: 92, y: 32 }, // Tokyo (On the new Island path)
    color: "#ff00ff", // Neon Pink/Cyberpunk
    samples: {
      kick: "bd:6", // Clicky Kick
      snare: "sd:5", // Glitch Snare
      hihat: "hh:6", // Glitch Hats
      bass: "bass:6", // Sine Bass
      pad: "pad:6", // Sine Pad
      lead: "synth:5", // Pure Wave
    },
  },
  // 9. London (1992)
  {
    id: "london",
    name: "London",
    country: "UK",
    year: 1992,
    genre: "Jungle / DnB",
    description: "Amen breaks chopped at high speed, deep reggae basslines.",
    bpm: 165,
    scale: ["C4", "Eb4", "F4", "G4", "Bb4"],
    coordinates: { x: 45, y: 21 }, // London (On the new UK path)
    color: "#33ff00", // Jungle Green
    samples: {
      kick: "bd:7", // Jungle Kick
      snare: "sd:6", // Amen Snare
      hihat: "hh:7", // Amen Hats
      bass: "bass:7", // Reese Bass
      pad: "pad:7", // Dark Pad
      lead: "synth:6", // Siren/Dub
    },
  },
  // 10. São Paulo (1993)
  {
    id: "saopaulo",
    name: "São Paulo",
    country: "Brazil",
    year: 1993,
    genre: "Underground / Hard Techno",
    description: "Hell's Club, A Lôca. Intense, industrial, tropical concrete jungle.",
    bpm: 145,
    scale: ["C4", "Db4", "F4", "G4", "Ab4"],
    coordinates: { x: 37, y: 63 }, // São Paulo (South America)
    color: "#ccff00", // Lime/Electric Green
    samples: {
      kick: "bd:3",
      snare: "sd:2",
      hihat: "hh:3",
      bass: "bass:3",
      pad: "pad:3",
      lead: "synth:2",
    },
  },
  // 11. Paris (1995)
  {
    id: "paris",
    name: "Paris",
    country: "France",
    year: 1995,
    genre: "French House",
    description: "Filtered loops, phasers, disco samples. The French Touch.",
    bpm: 126,
    scale: ["C4", "D4", "E4", "F#4", "G4", "A4"],
    coordinates: { x: 47, y: 25 }, // Paris
    color: "#3366ff", // French Blue
    samples: {
      kick: "bd:0",
      snare: "cp:0",
      hihat: "hh:0",
      bass: "bass:5", // Funk/Filter Bass
      pad: "pad:4", // Filtered Strings
      lead: "synth:4", // Filtered Lead
    },
  },
]

export const FUTURE_CITIES = [
  "Frankfurt",
  "Amsterdam",
  "Rotterdam",
  "LosAngeles",
  "Miami",
  "Brussels",
  "Sheffield",
  "Reykjavik",
  "Melbourne",
  "Vienna",
  "Bristol",
]

export function getCitiesForDecade(year: number): CityData[] {
  return cities.filter((city) => city.year <= year)
}

export function getCityById(id: string): CityData | undefined {
  return cities.find((city) => city.id === id)
}
