import { RHYTHM_STAGES } from './rhythm-stages'
import { scaleForCreativeSession } from './music/scales'
import { cityCoordinates } from "./city-coordinates"
import { placePinsOnGrid } from './globe-pin-grid'
import type { Meter } from './music/meter'
import type { CampaignId } from './campaigns'
import cityIntros from '../data/ui/city-intros.json'
import cityDescriptions from '../data/ui/city-descriptions.json'

export interface CityData {
  id: string
  campaigns: CampaignId[]
  meter?: Meter
  name: string
  country: string
  year: number
  genre: string
  description: string
  bpm: number
  scale: string[]
  coordinates: { x: number; y: number }
  geoCoordinates: { lat: number; lng: number }
  pinCoordinates: { lat: number; lng: number }
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

const harmonicStageIntros: Record<string, string[]> = {
  'san-diego-1999': ['Chords crack the door.', 'Three rough shapes.', 'Skate wheels rattle.', 'A private shout.', 'Sing it loud.'],
  'london-1970': ['One piano fills space.', 'A plain line opens.', 'Quiet verse breathes.', 'Voices find unity.', 'Let it rise.'],
  'berkeley-2004': ['A low note opens.', 'Distortion gathers.', 'Unease turns to motion.', 'Doubt finds sound.', 'Enter the noise.'],
  'new-york-1961': ['Bass circles the block.', 'Street corner harmonies.', 'One shared promise.', 'Longing turns to song.', 'Answer the lead.'],
  'san-francisco-1993': ['Wood remembers road.', 'Stories take shape.', 'Crowds carry lines.', 'Wandering voices meet.', 'Keep the tale.'],
  'paris-1945': ['A voice leans close.', 'Blue chords wander.', 'Confession turns sweet.', 'Night opens slowly.', 'Let it stray.'],
  'columbus-2013': ['Small room glows.', 'Soft hook travels far.', 'Handmade melodies linger.', 'Strangers lean in.', 'Keep it close.'],
  'new-york-1930': ['Brass sparks aloft.', 'Floors answer riffs.', 'Solos take flight.', 'Precision turns wild.', 'Join the dance.'],
  'jacksonville-1974': ['Slide draws the highway.', 'Guitars trade dirt.', 'Rough harmony breathes.', 'Open road calls.', 'Take the road.'],
  'chicago-1958': ['Bent wires cry.', 'City lights blaze.', 'Hard times walking.', 'Amps cut through.', 'Hear the string.'],
}


const rawCities: Omit<CityData, "coordinates" | "campaigns" | "pinCoordinates">[] = [
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
    image: "https://unsplash.com/photos/qpWvN7L0t7I/download?force=true&w=1600",
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
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=85&w=1600&auto=format&fit=crop",
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
    image: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?q=85&w=1600&auto=format&fit=crop",
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
    image: "https://unsplash.com/photos/1SmpGvlKq2U/download?force=true&w=1600",
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
    image: "https://unsplash.com/photos/sqgDlmZM8sc/download?force=true&w=1600",
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
    image: "https://unsplash.com/photos/pRc34iEHRmo/download?force=true&w=1600",
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
    genre: "Jazz / Breaks",
    description: "British club culture turned record collecting into a living collage: jazz, funk and hip-hop breaks meet as DJs reshape the dance floor with every mix.",
    bpm: 123, scale: ["G4", "A4", "Bb4", "C4", "D4", "E4", "F4"],
    geoCoordinates: { lat: 53.4808, lng: -2.2426 }, color: "#ffb65c",
    image: "https://images.unsplash.com/photo-1495366819608-9e926b56f8ad?q=85&w=1600&auto=format&fit=crop",
    samples: { kick: "bd:2", snare: "sd:2", hihat: "hh:2", bass: "bass:2", pad: "pad:2", lead: "synth:1" },
    introPhrases: ["A record remembers another room.", "Brass slips through the break.", "A low pulse keeps its secret.", "Every loop leaves room for an answer.", "Let the night turn."],
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
    image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?q=85&w=1600&auto=format&fit=crop",
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
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=85&w=1600&auto=format&fit=crop",
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
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=85&w=1600&auto=format&fit=crop",
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
    image: "https://unsplash.com/photos/X1PncKPKDQI/download?force=true&w=1600",
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
    description: "Kwaito grew from South African township life, blending slowed house with local rhythms, slang and praise poetry; its groove turned township identity into a source of pride for a new generation.",
    bpm: 108,
    scale: ["F#4", "A4", "B4", "C#4", "E4"],
    geoCoordinates: { lat: -26.2041, lng: 28.0473 },
    color: "#ff7a45",
    image: "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?auto=format&fit=crop&fm=jpg&q=85&w=1600",
    samples: {
      kick: "bd:4",
      snare: "sd:3",
      hihat: "hh:4",
      bass: "bass:4",
      pad: "piano:0",
      lead: "synth:3",
    },
    introPhrases: [
      "The bass walks slowly.",
      "A new freedom finds a voice.",
      "Piano answers the pavement.",
      "The groove rises from the township.",
      "Move when the chorus calls."
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
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=85&w=1600&auto=format&fit=crop",
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
  // Goa (1994): Anjuna beach parties, psychedelic trance
  {
    id: "goa",
    name: "Goa",
    country: "India",
    year: 1994,
    genre: "Goa trance / Psytrance",
    description: "Beach parties in Anjuna fused acid squelch, rolling basslines and Eastern scales into all-night psychedelic trance.",
    bpm: 145,
    scale: ["E4", "F4", "G#4", "A4", "B4", "C5", "D5"], // Phrygian dominant
    geoCoordinates: { lat: 15.5736, lng: 73.7407 },
    color: "#b6ff3b", // Ultraviolet-lit fluoro lime
    image: "/cities/goa.svg",
    samples: { kick: "bd:0", snare: "sd:0", hihat: "hh:0", bass: "bass:0", pad: "pad:0", lead: "synth:0" },
    introPhrases: [
        "The sun is not up yet.",
        "The bass keeps rolling.",
        "Every piece is a layer.",
        "Lose the thread, lose the trance.",
        "Find the peak."
    ]
  },
  // Bristol (1994): Trip-hop
  {
    id: "bristol",
    name: "Bristol",
    country: "UK",
    year: 1994,
    genre: "Trip-hop",
    description: "Bristol's sound-system crews slowed hip-hop breaks under dub bass, film-score strings and smoky vinyl, turning the club into a late-night cinema.",
    bpm: 90,
    scale: ["G3", "A3", "Bb3", "C4", "D4", "Eb4", "F4"], // G natural minor
    geoCoordinates: { lat: 51.4545, lng: -2.5879 },
    color: "#8fa3b8", // Rain-washed slate
    // Photo: Clifton Suspension Bridge illuminated, 1994, by Rodhullandemu, CC BY-SA 3.0 (https://commons.wikimedia.org/wiki/File:CliftonSupensionLit.jpg)
    image: "/cities/bristol.jpg",
    samples: { kick: "bd:0", snare: "sd:0", hihat: "hh:0", bass: "bass:0", pad: "pad:0", lead: "synth:0" },
    introPhrases: [
        "It is raining again.",
        "Slow down the break.",
        "Every move leaves a crackle.",
        "Play it like a film.",
        "Fade to grey."
    ]
  },
  // Croydon (2006): Dubstep
  {
    id: "croydon",
    name: "Croydon",
    country: "UK",
    year: 2006,
    genre: "Dubstep",
    description: "In South London's record shops and pirate radio, producers stripped UK garage down to half-time drums and sub-bass you feel in the chest, built for the sound system.",
    bpm: 140,
    scale: ["F3", "Gb3", "Ab3", "Bb3", "C4", "Db4", "Eb4"], // F Phrygian
    geoCoordinates: { lat: 51.3762, lng: -0.0982 },
    color: "#39ff88", // Sub-bass green
    // Photo: Tram 2536 at East Croydon, 2014, by train_photos, CC BY-SA 2.0 (https://commons.wikimedia.org/wiki/File:2536_at_East_Croydon_-_14918603355.jpg)
    image: "/cities/croydon.jpg",
    samples: { kick: "bd:0", snare: "sd:0", hihat: "hh:0", bass: "bass:0", pad: "pad:0", lead: "synth:0" },
    introPhrases: [
        "Half the tempo, twice the weight.",
        "Wait for the drop.",
        "Feel it in the chest.",
        "Space is part of the riddim.",
        "Wobble."
    ]
  },
  // Durban (2016): Gqom
  {
    id: "durban",
    name: "Durban",
    country: "South Africa",
    year: 2016,
    genre: "Gqom",
    description: "Teenage producers in Durban's townships built gqom on cracked software: broken, kickless house rhythms, hammering toms and ominous chants for taxi stereos and street parties.",
    bpm: 126,
    scale: ["C4", "Db4", "Eb4", "F4", "G4", "Ab4", "Bb4"], // C Phrygian
    geoCoordinates: { lat: -29.8587, lng: 31.0218 },
    color: "#ff6a2b", // Indian Ocean sunrise
    // Photo: Durban Beachfront At Night, 2009, by Marc Forrest, CC BY 2.0 (https://commons.wikimedia.org/wiki/File:Durban_Beachfront_At_Night.jpg)
    image: "/cities/durban.jpg",
    samples: { kick: "bd:0", snare: "sd:0", hihat: "hh:0", bass: "bass:0", pad: "pad:0", lead: "synth:0" },
    introPhrases: [
        "No kick on the one.",
        "The toms do the talking.",
        "Hear the taxi coming.",
        "Break the grid.",
        "Gqom!"
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
    image: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?q=85&w=1600&auto=format&fit=crop",
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
  {
    id: 'buenos-aires-1940', name: 'Buenos Aires', country: 'Argentina', year: 1940,
    genre: 'Vals criollo', description: 'In the Río de la Plata, vals criollo carried tango’s immigrant mix into neighborhood dance halls, where longing and elegance could share the floor.',
    bpm: 132, meter: '3/4', scale: ['A3','B3','C4','D4','E4','F4','G4'],
    geoCoordinates: { lat: -34.6037, lng: -58.3816 }, color: '#ef8979',
    image: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?q=85&w=1600&auto=format&fit=crop',
    samples: { kick: 'bd:0', snare: 'sd:0', hihat: 'hh:0', bass: 'bass:0', pad: 'pad:0', lead: 'synth:0' },
    introPhrases: ['An embrace turns in the dark.', 'A reed carries a sigh.', 'Each step returns changed.', 'Old longing keeps the room awake.', 'Follow the turning phrase.']
  },
  {
    id: 'dublin-1990', name: 'Dublin', country: 'Ireland', year: 1990,
    genre: 'Folk ballad / double jig', description: 'Irish traditional music keeps its dance tunes alive through open sessions, where musicians pass jigs between generations and newcomers learn by listening in.',
    bpm: 96, meter: '6/8', scale: ['D4','E4','F#4','G4','A4','B4','C#5'],
    geoCoordinates: { lat: 53.3498, lng: -6.2603 }, color: '#85d0a2',
    image: 'https://images.unsplash.com/photo-1549918864-48ac978761a4?q=85&w=1600&auto=format&fit=crop',
    samples: { kick: 'bd:0', snare: 'sd:0', hihat: 'hh:0', bass: 'bass:0', pad: 'pad:0', lead: 'synth:0' },
    introPhrases: ['A tune passes hand to hand.', 'The fiddle runs ahead of the foot.', 'Bright turns lift the room.', 'Old steps gather new voices.', 'Answer the dancing bow.']
  },
  {
    id: 'new-orleans-1953', name: 'New Orleans', country: 'USA', year: 1953,
    genre: 'Slow blues ballad', description: 'Black New Orleans musicians wove blues, gospel and brass-band traditions into communal rhythm and blues, where a rolling piano turns private ache into a call for the whole room.',
    bpm: 76, meter: '12/8', scale: ['C4','Eb4','F4','Gb4','G4','Bb4'],
    geoCoordinates: { lat: 29.9511, lng: -90.0715 }, color: '#e8b779',
    image: 'https://images.unsplash.com/photo-1635284225771-b6b35e18f7ad?q=85&w=1600&auto=format&fit=crop',
    samples: { kick: 'bd:0', snare: 'sd:0', hihat: 'hh:0', bass: 'bass:0', pad: 'pad:0', lead: 'synth:0' },
    introPhrases: ['Blue notes bend the lamplight.', 'The piano rolls like a river.', 'A trumpet answers the room.', 'Sorrow finds its dancing feet.', 'Let the backbeat speak.']
  },
  // Harmonic songbook: one original, editable kit for each new progression.
  ...([
    ['san-diego-1999', 'San Diego', 'USA', 1999, 'Pop punk', 'Pop punk grew from independent punk and skate culture: compact, melodic songs turn frustration into hooks built for a loud communal singalong.', 148, 'C', 32.7157, -117.1611, '#ff8b65', 'https://images.unsplash.com/photo-1756828791052-5cd529e650b5?q=85&w=1600&auto=format&fit=crop'],
    ['london-1970', 'London', 'UK', 1970, 'Piano pop', 'Piano-led pop gives the singer-songwriter’s intimate confession a wide, memorable chorus that audiences can claim as their own.', 72, 'C', 51.5074, -0.1278, '#e5c69d', 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?q=85&w=1600&auto=format&fit=crop'],
    ['berkeley-2004', 'Berkeley', 'USA', 2004, 'Alternative rock', 'Independent guitar scenes made distortion a way to question polish and convention; quiet tension grows into a release shared by the room.', 84, 'E', 37.8715, -122.2730, '#8da1c7', 'https://images.unsplash.com/photo-1694391579944-b9162db8162e?q=85&w=1600&auto=format&fit=crop'],
    ['new-york-1961', 'New York City', 'USA', 1961, 'Soul / doo-wop', 'Doo-wop grew from Black vocal groups harmonizing on neighborhood street corners; call and response turned private devotion into shared urban expression.', 116, 'A', 40.7128, -74.0060, '#d99fc5', 'https://commons.wikimedia.org/wiki/Special:FilePath/Apollo_Theater_Harlem,_NYC.jpg?width=1600'],
    ['san-francisco-1993', 'San Francisco', 'USA', 1993, 'Folk rock', 'Folk rock carries oral storytelling into amplified song, joining individual witness with a countercultural call for change and community.', 132, 'C', 37.7749, -122.4194, '#c9a46b', 'https://images.unsplash.com/photo-1568685002001-9bce359d5c25?q=85&w=1600&auto=format&fit=crop'],
    ['paris-1945', 'Paris', 'France', 1945, 'Jazz / chanson', 'Chanson places an intimate writer’s voice at the heart of popular song, while jazz improvisation brings risk and freedom into the late-night club conversation.', 112, 'C', 48.8566, 2.3522, '#a0b8aa', 'https://commons.wikimedia.org/wiki/Special:FilePath/Cafe_de_Flore_Paris_France.jpg?width=1600'],
    ['columbus-2013', 'Columbus', 'USA', 2013, 'Indie pop', 'Independent pop prizes handmade recordings, intimate lyrics and local venues; its fragile melodies invite listeners into a community without spectacle.', 124, 'C', 39.9612, -82.9988, '#f0cc77', 'https://images.unsplash.com/photo-1494303110424-f25a258d2e4b?q=85&w=1600&auto=format&fit=crop'],
    ['new-york-1930', 'New York City', 'USA', 1930, 'Swing jazz', 'Harlem swing grew through Black bandleaders, arrangers and dancers; interlocking riffs turn improvisation into a shared urban dance.', 144, 'C', 40.7128, -74.0060, '#b4abdb', 'https://commons.wikimedia.org/wiki/Special:FilePath/New_York_City_Skyline,_New_York,_photographed_by_Irving_Underhill,_1930_(25164176879).jpg?width=1600'],
    ['jacksonville-1974', 'Jacksonville', 'USA', 1974, 'Southern rock', 'Southern rock braids blues, country and rock into a regional voice; rough guitars and open-road songs turn local identity into collective pride.', 98, 'C', 30.3322, -81.6557, '#d2a571', 'https://images.unsplash.com/photo-1553567559-dc9e78245b21?q=85&w=1600&auto=format&fit=crop'],
    ['chicago-1958', 'Chicago', 'USA', 1958, 'Electric blues', 'Chicago electric blues carried Delta traditions north with Black migration, amplifying guitar and harmonica for urban clubs and making displacement audible as force.', 164, 'C', 41.8781, -87.6298, '#83b8d5', 'https://images.unsplash.com/photo-1495366819608-9e926b56f8ad?q=85&w=1600&auto=format&fit=crop'],
  ] as const).map(([id, name, country, year, genre, description, bpm, root, lat, lng, color, image]) => ({
    id, name, country, year, genre, description, bpm,
    scale: (root === 'E' ? ['E4','F#4','G#4','A4','B4','C#5','D#5'] : root === 'A' ? ['A3','B3','C#4','D4','E4','F#4','G#4'] : ['C4','D4','E4','F4','G4','A4','B4']),
    geoCoordinates: { lat, lng }, color, image,
    samples: { kick: 'bd:0', snare: 'sd:0', hihat: 'hh:0', bass: 'bass:0', pad: 'pad:0', lead: 'synth:0' },
    introPhrases: harmonicStageIntros[id],
  })),
]

const campaignMembership: Record<string, CampaignId[]> = {
  dusseldorf: ['electronic-history'], nyc: ['electronic-history'], chicago: ['electronic-history'],
  detroit: ['electronic-history'], ibiza: ['electronic-history'], manchester: ['electronic-history'],
  berlin: ['electronic-history'], tokyo: ['electronic-history'], london: ['electronic-history'],
  saopaulo: ['electronic-history'], johannesburg: ['electronic-history'], paris: ['electronic-history'],
  goa: ['electronic-history'], bristol: ['electronic-history'], croydon: ['electronic-history'], durban: ['electronic-history'],
  'manchester-1999': ['world-ballads'], 'buenos-aires-1940': ['world-ballads'],
  'dublin-1990': ['world-ballads'], 'new-orleans-1953': ['world-ballads'],
  vienna: ['classical'],
  'san-diego-1999': ['harmonic-songbook'], 'london-1970': ['harmonic-songbook'],
  'berkeley-2004': ['harmonic-songbook'], 'new-york-1961': ['harmonic-songbook'],
  'san-francisco-1993': ['harmonic-songbook'], 'paris-1945': ['harmonic-songbook'],
  'columbus-2013': ['harmonic-songbook'], 'new-york-1930': ['harmonic-songbook'],
  'jacksonville-1974': ['harmonic-songbook'], 'chicago-1958': ['harmonic-songbook'],
}

// Resolve every rhythm kit by ID so related eras can have distinct imagery.
// Each kit resolves to its own large photo from the period or musical setting.
const rhythmCityPhotos: Record<string, string> = {
  'rio-1910': 'https://commons.wikimedia.org/wiki/Special:FilePath/Rio_de_Janeiro_ca1910s_photo_from_USA_Library_of_Congress_19301u.jpg?width=1600',
  'rio-1930': 'https://commons.wikimedia.org/wiki/Special:FilePath/Revolu%C3%A7%C3%A3o_de_1930%3B_populares_e_revolucion%C3%A1rios_na_avenida_Rio_Branco_%28002080RJ3602%29.jpg?width=1600',
  'rio-1960': 'https://commons.wikimedia.org/wiki/Special:FilePath/Rio_ipanema.jpg?width=1600',
  'salvador-1992': 'https://commons.wikimedia.org/wiki/Special:FilePath/Largo_do_Pelourinho_Salvador_2018-0919.jpg?width=1600',
  'rio-1984': 'https://commons.wikimedia.org/wiki/Special:FilePath/Desfile_da_Escola_de_Samba_Mangueira_%281957%29.jpg?width=1600',
  'recife-1975': 'https://commons.wikimedia.org/wiki/Special:FilePath/Maracatu_Na%C3%A7%C3%A3o_-_Recife,_Pernambuco,_Brazil.jpg?width=1600',
  'rio-1995': 'https://commons.wikimedia.org/wiki/Special:FilePath/Rocinha_rio_de_janeiro_panorama_2010.jpg?width=1600',
  'recife-1935': 'https://commons.wikimedia.org/wiki/Special:FilePath/Frevo_no_Carnaval_do_Recife.jpg?width=1600',
  'recife-1950': 'https://commons.wikimedia.org/wiki/Special:FilePath/Statue_of_Luiz_Gonzaga_in_Recife_-_Brazil.jpg?width=1600',
  'piracicaba-1940': 'https://www.miranteppp.com.br/wp-content/uploads/2024/04/Rio-Piracicaba-e-um-atrativo-turistico-cartao-postal-e-motivo-de-orgulho-para-a-cidade-scaled.jpg',
  'memphis-1967': 'https://images.unsplash.com/photo-1543372742-e7d0b9947a2b?auto=format&fit=crop&w=1600&q=85',
  'kingston-1973': 'https://commons.wikimedia.org/wiki/Special:FilePath/Kingston,_Jamaica.JPG?width=1600',
  'leipzig-1723': 'https://images.unsplash.com/photo-1554207529-d031f1588081?auto=format&fit=crop&w=1600&q=85',
  'oakland-1959': 'https://images.unsplash.com/photo-1761697222046-29a9d3d5d864?auto=format&fit=crop&w=1600&q=85',
  'canterbury-1972': 'https://images.unsplash.com/photo-1503623190251-09e94b303ef2?auto=format&fit=crop&w=1600&q=85',
  'cambridge-1973': 'https://a.cdn-hotels.com/gdcs/production122/d1368/1ecd1184-2b25-4fa6-877c-320dc8a0f1e5.jpg?h=1200&impolicy=fcrop&q=high&w=1600',
  'istanbul-1970': 'https://images.unsplash.com/photo-1719938321625-fb8bcbfa2153?auto=format&fit=crop&w=1600&q=85',
  'kalamata-1930': 'https://images.unsplash.com/photo-1679431850495-ad0e03988976?auto=format&fit=crop&w=1600&q=85',
  'new-york-1962': 'https://commons.wikimedia.org/wiki/Special:FilePath/Village_Vanguard_at_night_1976.jpg?width=1600',
  'london-1977': 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?q=85&w=1600&auto=format&fit=crop',
  'vienna-1825': 'https://www.beethoven.de/file/download/cGhzOGNrSm5IYzdHUi9zb3VyY2UvMDAwMDQ0NTJfMDAwMV9nYWwuanBnADAA?sig=3b49c61408997ef1b0bb9462a9cf65a9bf52ffb03d1b18d7e396b5f722e4f893cef0c4de890e08f2a93043c4523b52a2',
  'santiago-del-estero-1960': 'https://www.tripin.travel/wp-content/uploads/2016/07/a0583abdeb.jpg',
  'luanda-1982': 'https://commons.wikimedia.org/wiki/Special:FilePath/Kizomba_dancers_by_Debarshi_Ray_07.jpg?width=1600',
  'luanda-1965': 'https://commons.wikimedia.org/wiki/Special:FilePath/Traditional_Dancers_(19300973109).jpg?width=1600',
  'lagos-1975': 'https://commons.wikimedia.org/wiki/Special:FilePath/The_New_Afrika_Shrine.jpg?width=1600',
  'essaouira-1980': 'https://commons.wikimedia.org/wiki/Special:FilePath/Gnaoua_(Gnawa)_musicians_performing_during_the_2010_Gnaoua_festival_in_the_city_of_Essaouira%2C_Morocco.jpg?width=1600',
  'maputo-1978': 'https://commons.wikimedia.org/wiki/Special:FilePath/Festival_da_Marrabenta_(5401171284).jpg?width=1600',
  'dakar-1985': 'https://commons.wikimedia.org/wiki/Special:FilePath/Une_sabar_%C3%A0_la_plage_de_Toubab-dialaw_04.jpg?width=1600',
  'luanda-1996': 'https://commons.wikimedia.org/wiki/Special:FilePath/Kuduro_Tarian.JPG?width=1600',
  'harare-1981': 'https://commons.wikimedia.org/wiki/Special:FilePath/AFRO_BREEZE_MBIRA_AND_HOSHO_POSE.jpg?width=1600',
  'kinshasa-1978': 'https://commons.wikimedia.org/wiki/Special:FilePath/La_danse_dans_les_bars_de_rumba_congolaise.jpg?width=1600',
  'lagos-1982': 'https://commons.wikimedia.org/wiki/Special:FilePath/Three_Talking_Drummers%2C_One_Dancer.jpg?width=1600',
  'gaza-1987': 'https://commons.wikimedia.org/wiki/Special:FilePath/Traditional-dance_8701496228_o.jpg?width=1600',
  'kisumu-1980': 'https://commons.wikimedia.org/wiki/Special:FilePath/Kenyan_music_producer_Brian_Robin_in_studio_with_Nyatiti.jpg?width=1600',
}
const rhythmCities: Omit<CityData, 'coordinates' | 'campaigns' | 'pinCoordinates'>[] = RHYTHM_STAGES.map(stage => ({
  id: stage.id, name: stage.name, country: stage.country, year: stage.year, genre: stage.genre,
  description: stage.description, bpm: stage.bpm, meter: stage.meter, color: stage.color,
  geoCoordinates: { lat: stage.lat, lng: stage.lng }, scale: scaleForCreativeSession(stage),
  image: rhythmCityPhotos[stage.id]
    ?? rawCities.find(city => city.name === stage.name && city.country === stage.country)?.image
    ?? `/cities/rhythm/${stage.id}.svg`,
  samples: { kick: 'bd:0', snare: 'sd:0', hihat: 'hh:0', bass: 'bass:0', pad: 'pad:0', lead: 'synth:0' },
  introPhrases: ['A new pulse circles.', 'The accent returns.', 'An answer waits.', 'Every piece joins.', 'Find the pulse.'],
}))


const citySources = [...rawCities, ...rhythmCities].map(city => ({
  ...city,
  description: cityDescriptions[city.id as keyof typeof cityDescriptions] ?? city.description,
  introPhrases: cityIntros[city.id as keyof typeof cityIntros] ?? city.introPhrases,
}))
const pinCoordinates = placePinsOnGrid(citySources)

export const cities: CityData[] = citySources.map(city => ({
  ...city,
  pinCoordinates: pinCoordinates[city.id],
  campaigns: campaignMembership[city.id] ?? RHYTHM_STAGES.filter(stage => stage.id === city.id).map(stage => stage.campaign),
  coordinates: cityCoordinates[city.id] || { x: (city.geoCoordinates.lng + 180) / 3.6, y: (90 - city.geoCoordinates.lat) / 1.8 } // Fallback
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
