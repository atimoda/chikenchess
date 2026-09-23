import { cityCoordinates } from "./city-coordinates"

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
  geoCoordinates: { lat: number; lng: number }
  color: string
  image: string
  samples: {
    kick: string
    snare: string
    hihat: string
    bass: string
    pad: string
    lead: string
  }
  introPhrases: string[]
  aiDepth?: number
}

const rawCities: Omit<CityData, "coordinates">[] = [
  // 1. Düsseldorf (1970)
  {
    id: "dusseldorf",
    name: "Düsseldorf",
    country: "Germany",
    year: 1970,
    genre: "Krautrock / Electro Pop",
    description: "Robotic rhythms, synthesized vocoders, the blueprint of electronic music.",
    bpm: 122,
    scale: ["C#4", "D#4", "E4", "F#4", "G#4", "A4", "B4"],
    aiDepth: 15,
    geoCoordinates: { lat: 51.2277, lng: 6.7735 },
    color: "#ff3333",
    image: "https://unsplash.com/photos/qpWvN7L0t7I/download?force=true&w=800",
    samples: {
      kick: "bd:0", // Kraftwerk style tightly gated
      snare: "sd:5", // Electronic snap
      hihat: "hh:5", // Ticked machine hat
      bass: "bass:6", // Sine bass
      pad: "pad:6", // Synth strings
      lead: "synth:5", // Sine/Square lead
    },
    introPhrases: [
        "She is an AI.",
        "Can you beat her?",
        "Unlimited mulligans for you.",
        "Still, it won't be easy.",
        "Good luck."
    ]
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
    geoCoordinates: { lat: 40.7128, lng: -74.0060 },
    color: "#a020f0", // Purple (Studio 54 / Nightclub)
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=800&auto=format&fit=crop",
    samples: {
      kick: "bd:5", // Acoust-electric disco kick
      snare: "sd:4", // Clap/Snare layered
      hihat: "hh:2", // Open hats
      bass: "bass:5", // Funk bass
      pad: "pad:4", // Strings
      lead: "piano:0", // Electric Piano
    },
    introPhrases: [
        "The city that never sleeps.",
        "The rhythm is in the concrete.",
        "Can you keep up with the groove?",
        "Studio 54 is waiting.",
        "Don't lose the beat."
    ]
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
    geoCoordinates: { lat: 41.8781, lng: -87.6298 },
    color: "#00ffaa", // Neon Green/Cyan (Acid/House vibe)
    image: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?q=80&w=800&auto=format&fit=crop",
    samples: {
      kick: "bd:0", // 909 Kick
      snare: "sd:1", // 909 Snare/Clap
      hihat: "hh:0", // 909 Hats
      bass: "bass:0", // FM Bass
      pad: "pad:0", // Deep Pad
      lead: "piano:0", // House Piano
    },
    introPhrases: [
        "Jack your body.",
        "The warehouse is open.",
        "The 909 is relentless.",
        "House music all night long.",
        "Move."
    ]
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
    geoCoordinates: { lat: 42.3314, lng: -83.0458 },
    color: "#ff6600",
    image: "https://unsplash.com/photos/1SmpGvlKq2U/download?force=true&w=800",
    samples: {
      kick: "bd:1", // 909 Distorted
      snare: "cp:0", // 909 Clap
      hihat: "hh:1", // Metallic Hats
      bass: "bass:1", // Analog Bass
      pad: "pad:1", // Cold Strings
      lead: "synth:0", // Detroit Stabs
    },
    introPhrases: [
        "Motor City machines.",
        "Future music from the past.",
        "Cold steel and warm soul.",
        "Techno is the logic.",
        "Calculate your next move."
    ]
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
    geoCoordinates: { lat: 38.9067, lng: 1.4206 },
    color: "#ffaa00",
    image: "https://unsplash.com/photos/sqgDlmZM8sc/download?force=true&w=800",
    samples: {
      kick: "bd:4", // Softer kick
      snare: "sd:3",
      hihat: "hh:4", // Shaker
      bass: "bass:4",
      pad: "pad:4", // Warm Pad
      lead: "synth:3", // Flute/Synth
    },
    introPhrases: [
        "The sun sets on the island.",
        "A spiritual awakening.",
        "Relax your mind.",
        "But keep your eyes open.",
        "The night is young."
    ]
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
    geoCoordinates: { lat: 53.4808, lng: -2.2426 },
    color: "#ffff00",
    image: "https://unsplash.com/photos/pRc34iEHRmo/download?force=true&w=800",
    samples: {
      kick: "bd:2", // Rave Kick
      snare: "sd:2", // Breakbeat Snare
      hihat: "hh:2",
      bass: "bass:2", // 303 Bass
      pad: "pad:2", // Rave Hoover
      lead: "synth:1", // 303 Acid Lead
    },
    introPhrases: [
        "Madchester calls.",
        "The siren sounds.",
        "Acid in the veins.",
        "Can you handle the rush?",
        "Rave on."
    ]
  },
  // A second Manchester era, preserving the existing Haçienda chapter.
  {
    id: "manchester-1999", name: "Manchester", country: "UK", year: 1999,
    genre: "Jazz / Breaks · sample collage",
    description: "Manchester, 1999: Mr. Scruff, Keep It Unreal e a mistura de jazz, funk e breaks. Kit Northern Jazz Breaks inspirado em Get a Move On!: motivos de palheta, baixo sincopado e respostas curtas.",
    bpm: 123, scale: ["G4", "A4", "Bb4", "C4", "D4", "E4", "F4"],
    geoCoordinates: { lat: 53.4808, lng: -2.2426 }, color: "#ffb65c",
    image: "https://unsplash.com/photos/pRc34iEHRmo/download?force=true&w=800",
    samples: { kick: "bd:2", snare: "sd:2", hihat: "hh:2", bass: "bass:2", pad: "pad:2", lead: "synth:1" },
    introPhrases: ["Manchester, 1999.", "Jazz finds the breakbeat.", "A short phrase. A new reply.", "Leave room for the next player.", "Keep the band moving."],
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
    geoCoordinates: { lat: 52.5200, lng: 13.4050 },
    color: "#00ccff", // Cold Blue
    image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?q=80&w=800&auto=format&fit=crop",
    samples: {
      kick: "bd:3", // Rumble Kick
      snare: "rim:0", // Industrial Rim
      hihat: "hh:3", // Fast 909 Hats
      bass: "bass:3", // Sub Rumble
      pad: "pad:3", // Dark Drone
      lead: "synth:2", // Metallic Stab
    },
    introPhrases: [
        "The wall is down.",
        "But the darkness remains.",
        "Concrete and steel.",
        "The beat is your heartbeat.",
        "Don't get lost in the bunker."
    ]
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
    geoCoordinates: { lat: 35.6762, lng: 139.6503 },
    color: "#ff00ff", // Neon Pink/Cyberpunk
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=800&auto=format&fit=crop",
    samples: {
      kick: "bd:6", // Clicky Kick
      snare: "sd:5", // Glitch Snare
      hihat: "hh:6", // Glitch Hats
      bass: "bass:6", // Sine Bass
      pad: "pad:6", // Sine Pad
      lead: "synth:5", // Pure Wave
    },
    introPhrases: [
        "Neon lights and digital dreams.",
        "Precision is key.",
        "A glitch in the system.",
        "Or a calculated move?",
        "Focus."
    ]
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
    geoCoordinates: { lat: 51.5074, lng: -0.1278 },
    color: "#33ff00", // Jungle Green
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=800&auto=format&fit=crop",
    samples: {
      kick: "bd:7", // Jungle Kick
      snare: "sd:6", // Amen Snare
      hihat: "hh:7", // Amen Hats
      bass: "bass:7", // Reese Bass
      pad: "pad:7", // Dark Pad
      lead: "synth:6", // Siren/Dub
    },
    introPhrases: [
        "The underground is calling.",
        "Breakneck speed.",
        "Deep bass pressure.",
        "Keep your head up.",
        "It's a jungle out there."
    ]
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
    geoCoordinates: { lat: -23.5505, lng: -46.6333 },
    color: "#ccff00",
    image: "https://unsplash.com/photos/X1PncKPKDQI/download?force=true&w=800",
    samples: {
      kick: "bd:3",
      snare: "sd:2",
      hihat: "hh:3",
      bass: "bass:3",
      pad: "pad:3",
      lead: "synth:2",
    },
    introPhrases: [
        "Concrete jungle fever.",
        "The heat is rising.",
        "Hard and heavy.",
        "No time to rest.",
        "Survive."
    ]
  },
  // 11. Johannesburg (1994)
  {
    id: "johannesburg",
    name: "Johannesburg",
    country: "South Africa",
    year: 1994,
    genre: "Kwaito / Township House",
    description: "House desacelerado e reinventado em Soweto: baixo profundo, piano, percussão e vozes da nova África do Sul.",
    bpm: 108,
    scale: ["F#4", "A4", "B4", "C#4", "E4"],
    geoCoordinates: { lat: -26.2041, lng: 28.0473 },
    color: "#ff7a45",
    image: "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?auto=format&fit=crop&fm=jpg&q=80&w=800",
    samples: {
      kick: "bd:4",
      snare: "sd:3",
      hihat: "hh:4",
      bass: "bass:4",
      pad: "piano:0",
      lead: "synth:3",
    },
    introPhrases: [
      "Jozi, 1994.",
      "Slow the house down.",
      "Let the township answer.",
      "A new country finds its pulse.",
      "Yebo. Make your move."
    ]
  },
  // 12. Paris (1995)
  {
    id: "paris",
    name: "Paris",
    country: "France",
    year: 1995,
    genre: "French House",
    description: "Filtered loops, phasers, disco samples. The French Touch.",
    bpm: 126,
    scale: ["C4", "D4", "E4", "F#4", "G4", "A4"],
    geoCoordinates: { lat: 48.8566, lng: 2.3522 },
    color: "#3366ff", // French Blue
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop",
    samples: {
      kick: "bd:0",
      snare: "cp:0",
      hihat: "hh:0",
      bass: "bass:5", // Funk/Filter Bass
      pad: "pad:4", // Filtered Strings
      lead: "synth:4", // Filtered Lead
    },
    introPhrases: [
        "La vie en rose?",
        "Not on this board.",
        "Filtered reality.",
        "Touch of class.",
        "Allez."
    ]
  },
  // 13. Vienna (1780)
  {
    id: "vienna",
    name: "Vienna",
    country: "Austria",
    year: 1780,
    genre: "Classical / Symphony",
    description: "The Imperial Capital. Strings, Woodwinds, Brass. The Grand Orchestra.",
    bpm: 100, // Moderato
    scale: ["C4", "D4", "E4", "F4", "G4", "A4", "B4"], // C Major (Classical)
    geoCoordinates: { lat: 48.2082, lng: 16.3738 },
    color: "#d4af37", // Gold
    image: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?q=80&w=800&auto=format&fit=crop",
    samples: {
      kick: "bd:0", // Timpani (mapped in engine)
      snare: "sd:0",
      hihat: "hh:0",
      bass: "bass:0", // Double Bass
      pad: "pad:0", // String Ensemble
      lead: "synth:0", // Violin Solo
    },
    introPhrases: [
        "A timeless classic.",
        "The grandmaster watches.",
        "Symphony of logic.",
        "Every move a note.",
        "Compose your victory."
    ]
  },
]

export const cities: CityData[] = rawCities.map(city => ({
  ...city,
  coordinates: cityCoordinates[city.id] || { x: 50, y: 50 } // Fallback
}))

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

export function getCityEras(city: CityData): CityData[] {
  return cities.filter(c => c.geoCoordinates.lat === city.geoCoordinates.lat && c.geoCoordinates.lng === city.geoCoordinates.lng).sort((a, b) => a.year - b.year)
}
