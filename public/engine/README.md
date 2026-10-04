# Stockfish.js 19.0.0 — Lite, single thread

Unmodified `stockfish-19-lite-single.js` and `.wasm` from the pinned npm
package `stockfish@19.0.0` (`node_modules/stockfish/bin`). Only these two
runtime assets are served to players, not the full engine variants.

Copyright Chess.com, LLC and Stockfish contributors. GPL-3.0; see Copying.txt.
Corresponding source and build instructions:
https://github.com/nmrugg/stockfish.js/tree/v19.0.0

To refresh the vendored assets after an intentional version update, copy the
matching JS, WASM and Copying.txt from the pinned package, preserving filenames.
The small network is embedded in the WASM. No CDN or additional download is used.

## ChickenChess powered analysis

`powered-analysis.js` is a generated JavaScript worker for Freeze/Shield positions,
separate from Stockfish. Sources: `lib/powered-analysis.worker.ts` and its pure
domain imports. `npm run build:powered-analysis` bundles it with esbuild;
`npm run dev` and `npm run build` run that step automatically. Do not edit the
generated file. Next/Turbopack must not serve the TypeScript entry as a raw asset.
