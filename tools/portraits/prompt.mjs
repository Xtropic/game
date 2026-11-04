// Prints the Figma image-AI prompt for one character's portrait (or all), so every portrait shares one style:
// a bright, vibrant anime character on a plain flat background (Mathew, 2026-11-04; Rhea is the reference).
//   node tools/portraits/prompt.mjs posy        node tools/portraits/prompt.mjs --all
// Paint with Figma generate_image (gpt-image-2.5-flare, 1024x1024), download image.url, save it at 512px as
// public/portraits/<id>.jpg and list it in public/portraits/index.json. Looks live in data/cast/portrait-looks.json;
// keep a character's hair, clothes and colours there in step with their map sprite (tools/art/people.py).
import { readFileSync } from "node:fs";

const looks = JSON.parse(readFileSync(new URL("../../data/cast/portrait-looks.json", import.meta.url), "utf8"));

export const prompt = (name, look) =>
  `Anime character portrait for a story-driven RPG dialogue box. Head and shoulders, facing the viewer, centered, mouth closed. ` +
  `${name}: ${look}. Eyes of equal size with realistic proportions. ` +
  "Rich, detailed modern anime illustration: fine crisp linework, cel shading with soft painted gradients, glossy hair highlights, warm golden key light from the upper right. Bright, vibrant, saturated colours on the character. " +
  "Mature natural proportions, not chibi. The background is a completely plain flat light warm grey, with no scenery, gradient, sky, pattern or light effects. No text, no frame, no logo.";

const arg = process.argv[2];
for (const [id, look] of Object.entries(looks))
  if (arg === "--all" || id === arg) console.log(`${id}\n${prompt(id[0].toUpperCase() + id.slice(1), look)}\n`);
