# Strudel music engine and Creative lab

The `codex/music-engine` branch migrates Düsseldorf to `@strudel/web` 1.3.0. Other cities retain the existing audio engine during this migration. The existing native engine also continues to provide introductory/UI sound effects.

## Try it

Run `npm install` and `npm run dev`, then open `/?city=dusseldorf` on the printed local URL. Complete the existing introduction.

For immediate experiments, open `/creative` and choose **Düsseldorf original · samples**. This loads the factory `Düsseldorf · Electro 01` kit with all 16 white voices active. **Carregar kit de Düsseldorf** loads your saved city version instead. **Salvar kit da fase** associates the edited kit with Düsseldorf in this browser; the next game uses its instruments, grooves, timeline, scale, BPM and volume. In a game, each piece still activates only after its first legal move. Export JSON to transfer a kit between devices; there is no shared database yet.

- Hold/drag a piece to play individual notes before making a move. Its loop is suspended during the gesture; entering a new square triggers one attack. Holding still does not repeat the phrase. The Creative “Segure para ouvir” button still auditions the complete pattern.
- Release on an illegal destination, the original square, or outside the board to cancel. Escape, touch cancellation, and window blur also end the audition.
- Complete a legal move to activate that piece's pattern. AI pieces activate on their moves too. Captured pieces are removed from playback.
- Check temporarily activates all surviving attacker pieces and bypasses their entry masks. Resolving check restores history-based activation. This overlay never records an unmoved piece as moved. Checkmate/pausing stops the transport as before.
- Select a piece to inspect its instrument and adjust gain, pitch, pan, decay, filters, reverb, and delay. The inspector follows its identity after moves and stays selected when the AI moves.
- Piece Params contains note/rest feedback and envelope/octave/gate knobs. Board Params changes the shared root/scale. Strudel contains transport/status above the code. In-game edits stay local to that match; save city kits through Creative.

See `GAME_MECHANICS.md` for the maintained behavior inventory, gesture limitations and state priorities.
- The code widget is generated from the same voice specifications used to build the Strudel patterns. The spectrogram reads the new audio output.

## Modules

- `model.ts`: stable piece identity reconstructed from legal move history, shared scale conversion, initial electronic instrument definitions.
- `runtime.ts`: pattern compilation, one Cyclist transport, separate voice/audition orbits, cancellation, and timed visual events.
- `sample-banks.ts`: source registry independent of chess roles and playback behavior; bank, asset, articulation and optional root-note tuning. Assets load only when needed and buffers are shared. The original CC0 `Chicken Electro · 01` bank ships with 13 small WAV files (~447 KB total), including a tuned bell. It is not a TR-909 recording bank. Regenerate with `python3 scripts/generate-samples.py`.
- `automation.ts`: bounded patterns per section and sine/ramp curves for gain, low-pass, pan, reverb and delay. Gain multiplies the base value; other automated controls replace their fixed values. Values are sampled at note attacks, not continuously inside an already sounding note.
- `grooves.ts`: shared named grooves with rhythm/accent lanes. Any instrument can reference any lane; notes remain in the instrument's phrase bank. Editing a lane changes every linked voice, while disabling one piece leaves the other lanes intact.
- `creative.ts` and `city-kits.ts`: schema v4, migrations, factory kit, import validation and browser-local city persistence. Source, behavior and chess role are independent: a king can play an unpitched kick and a pawn a tuned bell sequence.
- `monitor.ts` and `components/music-playback.tsx`: shared section/beat, notes/rests and resolved control values. Queries use the same compiled Strudel patterns as audio, aligned to the transport clock. Small subscribers and cached per-cycle queries avoid rerendering the editor on every tick.
- `hooks/use-music.ts`: React state and controls. Piece parameter edits are keyed by identity; undo/redo restores board-derived activation and position while retaining manual edits.

## Checks

`npm run test:music` covers activation, audition rollback, captures, en passant, castling, history reconstruction, source independence, real Strudel groove/automation timing, timeline migration, sample files, city persistence, playback feedback and transport races. Pattern tests import the same `@strudel/web/dist/index.mjs` ESM bundle used by the browser; only browser event-listener globals are stubbed. `npx tsc --noEmit --incremental false` checks application types.

The factory timeline is `[0@4 1@4 2@4 1@4]/16`: A/B/C/B, four cycles each. The former `<0@4 1@4 2@4 1@4>/16` unintentionally held each section for 64 cycles. Imports repair that exact legacy factory string; custom timelines are preserved. Old kits retain their sources and masks; choose the factory button to audition the new unmasked arrangement.

## Deliberate scope of this prototype

The current editor combines synths, registered samples, phrases, grooves and automation through validated configuration; it does not evaluate arbitrary user JavaScript. A stopped transport restarts from the beginning when playback resumes. Editing or deactivating all loops while playing preserves its phase. Advanced tactical modulation, shared chord progressions, quantized structural updates, layers, user sample uploads and official kit publishing remain in MUSIC_ENGINE_PLAN.md. Network-free loading of the entire application has not yet been implemented. Musical quality and physical mobile performance still need listening/device validation.

Strudel references: [samples](https://strudel.cc/learn/samples/), [effects](https://strudel.cc/learn/effects/), [mini-notation](https://strudel.cc/learn/mini-notation/).
