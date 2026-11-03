// Prints the Figma image-AI prompt for one recruit (or all), so every portrait shares the main cast's style.
//   node tools/portraits/prompt.mjs posy        node tools/portraits/prompt.mjs --all
// Paint with Figma generate_image (gpt-image-2.5-flare, 1024x1024) into "The Lull - portraits", fetch the
// result at 512px, save it as public/portraits/<id>.jpg and list it in public/portraits/index.json.
import { readFileSync } from "node:fs";

const cast = JSON.parse(readFileSync(new URL("../../data/cast/recruits.json", import.meta.url), "utf8"));
const todo = cast.filter((r) => r.look !== "done");

export const prompt = (r, i) =>
  `Detailed anime-style character portrait for a story-driven RPG dialogue box. Head and shoulders, three-quarter view facing slightly ${i % 2 ? "right" : "left"}, centered, mouth closed. ` +
  `${r.name}: ${r.look}, eyes of equal size with realistic proportions. ` +
  "Grounded, mature, semi-realistic anime look like a modern prestige anime film: fine clean linework, soft cel shading with subtle painted gradients, natural facial proportions, not chibi, not cartoonish, not glossy. " +
  `Soft warm lantern key light from the upper left, cool dusk fill. Plain softly painted dark ${r.bg} background. No text, no frame, no logo.`;

const arg = process.argv[2];
for (const [i, r] of todo.entries()) if (arg === "--all" || r.id === arg) console.log(`${r.id}\n${prompt(r, i)}\n`);
