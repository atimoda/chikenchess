# First Strudel integration

The `codex/music-engine` branch migrates Düsseldorf to `@strudel/web` 1.3.0. Other cities retain the existing audio engine during this migration. The existing native engine also continues to provide introductory/UI sound effects.

## Try it

Run `npm install` and `npm run dev`, then open `/?city=dusseldorf` on the printed local URL. Complete the existing introduction.

- Hold a piece to audition it before making a move. Drag across squares to vary pitch/register for melodic instruments, pan, and the temporary filter limit.
- Release on an illegal destination, the original square, or outside the board to cancel. Escape, touch cancellation, and window blur also end the audition.
- Complete a legal move to activate that piece's pattern. AI pieces activate on their moves too. Captured pieces are removed from playback.
- Select a piece to inspect its instrument and adjust gain, pitch, pan, decay, filters, reverb, and delay. The inspector follows its identity after moves and stays selected when the AI moves.
- The code widget is generated from the same voice specifications used to build the Strudel patterns. The spectrogram reads the new audio output.

## Modules

- `model.ts`: stable piece identity reconstructed from legal move history, shared scale conversion, initial electronic instrument definitions.
- `runtime.ts`: pattern compilation, one Cyclist transport, separate voice/audition orbits, cancellation, and timed visual events.
- `hooks/use-music.ts`: React state and controls. Piece parameter edits are keyed by identity; undo/redo restores board-derived activation and position while retaining manual edits.

## Checks

`npm run test:music` covers activation, audition rollback, captures, en passant, castling, history reconstruction, shared pitch mapping, and pause. `npx tsc --noEmit --incremental false` checks the application types.

## Deliberate scope of this prototype

The timbres are synthesized locally; there is no external sample bank. This is a technical and musical starting point awaiting listening feedback. The full kit authoring system, editable phrase/rhythm UI, arbitrary code evaluation, presets, tactical modulation, explicit board performance mode, and quantized structural updates remain in MUSIC_ENGINE_PLAN.md. Most per-piece sound edits affect subsequent attacks; continuous automation of existing sustained voices is a next integration step. A stopped transport restarts from the beginning when playback resumes. Network-free loading of the entire application has not yet been implemented.
