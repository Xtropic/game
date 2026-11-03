// Lists every spoken line in data/maps and data/story as tools/voice/lines.json ([{who, text}]), using the same
// rules as src/world/lines.ts and storyLines in src/story/story.ts (a unit test checks they all have recordings).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const lines = [];
const maps = new URL("../../data/maps/", import.meta.url);
for (const f of readdirSync(maps).filter((f) => f.endsWith(".json"))) {
  const m = JSON.parse(readFileSync(new URL(f, maps), "utf8"));
  for (const e of m.entities) {
    const p = e.props ?? {};
    if (e.kind === "npc" && p.line) lines.push({ who: String(p.voice ?? e.id), text: String(p.line) });
    if (e.kind === "npc" && p.after) lines.push({ who: "narrator", text: String(p.after) });
    if (e.kind === "sign" && p.text) lines.push({ who: "narrator", text: String(p.text) });
  }
}
const walk = (steps) => {
  for (const st of steps ?? []) {
    if ("say" in st) lines.push({ who: st.say || "narrator", text: st.text });
    if ("choose" in st) { lines.push({ who: "narrator", text: st.choose }); for (const o of st.options) { if (o.by) lines.push({ who: o.by, text: o.label }); walk(o.do); } }
    if ("if" in st) { walk(st.then); walk(st.else); }
    if ("battle" in st) walk(st.win);
  }
};
const stories = new URL("../../data/story/", import.meta.url);
for (const f of readdirSync(stories).filter((f) => f.endsWith(".json"))) {
  const s = JSON.parse(readFileSync(new URL(f, stories), "utf8"));
  for (const a of s.actors) { walk(a.talk); walk(a.touch); }
  for (const g of [...s.steps, ...s.zones, ...s.looks, ...s.songs]) walk(g.do);
  for (const h of s.hazards) walk(h.fail);
  for (const sc of Object.values(s.scripts)) walk(sc);
}
const seen = new Set();
const out = lines.filter((l) => { const k = `${l.who}|${l.text}`; if (seen.has(k)) return false; seen.add(k); return true; });
writeFileSync(new URL("lines.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(out.length, "lines");
