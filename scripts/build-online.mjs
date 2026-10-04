import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const [source, output] of [
  ["lib/online/domain.ts", "supabase/functions/match-command/domain.js"],
  ["lib/online/piece-params.ts", "supabase/functions/piece-params/params.js"],
]) {
  await build({
    entryPoints: [resolve(root, source)],
    outfile: resolve(root, output),
    bundle: true,
    format: "esm",
    platform: "neutral",
    mainFields: ["module", "main"],
    target: "es2022",
    minify: true,
    legalComments: "none",
  });
  process.stdout.write(`Built ${output}\n`);
}
