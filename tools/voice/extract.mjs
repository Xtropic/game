// Lists the voiced lines as tools/voice/lines.json ([{who, text}]), using the same rule as voicedLines in
// src/story/story.ts: what characters say in the plot-point scripts each story file lists under "voiced".
// Everyday talk, signs, narration and map lines are read, not heard (a unit test checks every voiced line is recorded).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const lines = [];
const walk = (steps) => {
  for (const st of steps ?? []) {
    if ("say" in st && st.say && st.say !== "narrator") lines.push({ who: st.say, text: st.text });
    if ("choose" in st) for (const o of st.options) walk(o.do);
    if ("if" in st) { walk(st.then); walk(st.else); }
    if ("battle" in st) walk(st.win);
  }
};
const stories = new URL("../../data/story/", import.meta.url);
for (const f of readdirSync(stories).filter((f) => f.endsWith(".json"))) {
  const s = JSON.parse(readFileSync(new URL(f, stories), "utf8"));
  for (const id of s.voiced ?? []) walk(s.scripts[id]);
}
const seen = new Set();
const out = lines.filter((l) => { const k = `${l.who}|${l.text}`; if (seen.has(k)) return false; seen.add(k); return true; });
writeFileSync(new URL("lines.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(out.length, "lines");
