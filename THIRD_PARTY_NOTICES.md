# Licensing and attribution

ChickenChess application code on this branch is licensed under AGPL-3.0-or-later; see LICENSE. The Strudel integration was added on 2026-09-10.

- Strudel (@strudel/web 1.3.0 and its dependencies): AGPL-3.0-or-later. Authors and copyright notices remain in the packages. Project: https://strudel.cc and https://codeberg.org/uzu/strudel.
- The Düsseldorf prototype uses Strudel's synthesized sounds. It does not redistribute the example song “A Certain Buzz” or download an external sample bank.
- Realistic globe textures in `public/globe/`: NASA Earth Observatory imagery, public domain. Surface from Blue Marble Next Generation (July 2004, topography and bathymetry, Reto Stöckli, NASA Earth Observatory); city lights from Black Marble 2016 (NASA Earth Observatory / Suomi NPP VIIRS). Both were resized and the night map converted to grayscale; `earth-water-2k.png` is a water mask derived from the Blue Marble image. Clouds are generated procedurally in the browser.
- Bird songs in `public/samples/birds-v1/`: short excerpts (cut, high-pass filtered and levelled) of recordings shared on https://xeno-canto.org by their recordists, used non-commercially. Each clip's recordist, catalogue number, licence (mostly CC BY-NC-SA 4.0) and link are listed in `data/pigchicken/bird-songs.json` and shown in the game's About, tab Credits. A commercial release must drop the NC-licensed clips. They are prepared by `scripts/prepare-bird-songs.py`.
- Other dependencies retain their respective licenses. Existing images, recordings, fonts, chess artwork and other third-party assets require their own provenance/license review; this notice does not relicense those assets.

Before publishing a deployed build, provide users a prominent source link to the corresponding version, including build instructions and required source. A LICENSE file alone does not complete that publication step. Production credentials and user data must never be included.
