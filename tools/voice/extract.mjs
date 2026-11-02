// Lists every spoken line in data/maps as tools/voice/lines.json ([{who, text}]), using the same rules as src/world/lines.ts.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const dir = new URL("../../data/maps/", import.meta.url);
const lines = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const m = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
  for (const e of m.entities) {
    const p = e.props ?? {};
    if (e.kind === "npc" && p.line) lines.push({ who: String(p.voice ?? e.id), text: String(p.line) });
    if (e.kind === "npc" && p.after) lines.push({ who: "narrator", text: String(p.after) });
    if (e.kind === "sign" && p.text) lines.push({ who: "narrator", text: String(p.text) });
  }
}
writeFileSync(new URL("lines.json", import.meta.url), JSON.stringify(lines, null, 1));
console.log(lines.length, "lines");
