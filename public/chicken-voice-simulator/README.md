# Chicken voice simulator

A static build of [Chimera](https://github.com/jamesondh/chimera-vocal-synth), a physical-modelling
voice synthesizer, with a chicken added to its Bestiary: air sacs, a syrinx at the foot of a ringed
trachea, a larynx, a throat and a beak. The chicken clucks, cackles and crows, and sings typed lyrics
to a tune. Served at `/chicken-voice-simulator/?mode=bestiary&creature=chicken`.

- Source: [atimoda/chicken-vocal-synth](https://github.com/atimoda/chicken-vocal-synth), branch `chicken`, commit `d0632de`.
- License: MIT, Copyright (c) 2026 Jameson Hodge ([LICENSE.txt](LICENSE.txt)). The bundled
  dictionary and fonts keep their own licenses (`data/*-LICENSE.txt`, `fonts/OFL.txt`,
  `fonts/AVHERSHEY-LICENSE.txt`).

This folder is build output: don't edit it by hand. To rebuild it from the fork (needs Rust with the
`wasm32-unknown-unknown` target, and Bun):

```sh
bun install && bun run wasm
bunx vite build --base /chicken-voice-simulator/ --outDir dist-site
find dist-site -name '*.map' -delete
# then replace public/chicken-voice-simulator/ with dist-site/, keeping this README.md and LICENSE.txt
```
