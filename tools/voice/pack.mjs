// After a build: packs dist/vo/<hash>.mp3 into a few large files, so the published page stays well under the
// artifact's file-count limit. dist/vo/packs.json maps each line's hash to [pack, byte offset, byte length];
// src/audio/voice.ts slices the line back out of its pack. Dev builds (no packs.json) still load one file per line.
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const dir = new URL("../../dist/vo/", import.meta.url).pathname;
const PACK = 4 * 1024 * 1024;
const files = readdirSync(dir).filter((f) => /^[0-9a-f]{8}\.mp3$/.test(f)).sort();
const map = {}; let pack = 0, parts = [], size = 0;
const flush = () => { if (!parts.length) return; writeFileSync(join(dir, `pack-${pack}.mp3`), Buffer.concat(parts)); pack++; parts = []; size = 0; };
for (const f of files) {
  const b = readFileSync(join(dir, f));
  if (size + b.length > PACK) flush();
  map[f.slice(0, 8)] = [pack, size, b.length]; parts.push(b); size += b.length;
  unlinkSync(join(dir, f));
}
flush();
writeFileSync(join(dir, "packs.json"), JSON.stringify(map));
console.log(`packed ${files.length} voice lines into ${pack} files`);
