// Pixel people for the explore view: a shared body recoloured per character, standing plus a 4-step walk, 4 facings.
import { drawRows, makeCanvas, pixelTexture } from "./pixel";
import { Rectangle, Texture } from "pixi.js";
import { bodyOf, type BodyKind } from "./bodies";

export type Facing = "down" | "up" | "left" | "right";
export const FACINGS: Facing[] = ["down", "up", "left", "right"];

export interface Look {
  hair: string; hairLight: string; skin: string; skinShade: string; coat: string; coatShade: string; accent: string; legs: string; boots: string;
  /** Matches the portrait: short (default), braid, bun, bald or a knitted cap; a full beard or a moustache in `beard`'s colour. */
  style?: "short" | "braid" | "bun" | "bald" | "cap"; beardStyle?: "full" | "moustache"; beard?: string; cap?: string;
}

export const LOOKS: Record<string, Look> = {
  rhea: { hair: "#3a2418", hairLight: "#5c3a26", skin: "#e8c0a0", skinShade: "#c09272", coat: "#6b4a3a", coatShade: "#4f3428", accent: "#b03a2a", legs: "#3b2e26", boots: "#221a15", style: "braid" },
  warden: { hair: "#2b2b2b", hairLight: "#8e959b", skin: "#e0b896", skinShade: "#b88e6c", coat: "#7c8389", coatShade: "#5c6268", accent: "#3a3d40", legs: "#3a3d40", boots: "#1e1e1e" },
  elder: { hair: "#dcd6ca", hairLight: "#b9b2a4", skin: "#d7ad88", skinShade: "#ae8462", coat: "#6d5f4e", coatShade: "#504538", accent: "#7a5a48", legs: "#3e352c", boots: "#2a221c" },
  elder2: { hair: "#9a948a", hairLight: "#bdb6aa", skin: "#d4a882", skinShade: "#a87e5e", coat: "#4a5a6a", coatShade: "#38444f", accent: "#7a6a58", legs: "#3e352c", boots: "#2a221c" },
  corran: { hair: "#2a221c", hairLight: "#463a30", skin: "#dcb38e", skinShade: "#b0886a", coat: "#5d6266", coatShade: "#44484b", accent: "#3a3e42", legs: "#2f3235", boots: "#1c1c1c" },
  tamsin: { hair: "#1a1512", hairLight: "#3a3029", skin: "#c99f7a", skinShade: "#a07a58", coat: "#3e5a46", coatShade: "#2e4434", accent: "#a88a5a", legs: "#2e3a33", boots: "#1f1a16", style: "bun" },
  halloran: { hair: "#9a9a98", hairLight: "#c8c8c6", skin: "#cfa985", skinShade: "#a6805f", coat: "#26282c", coatShade: "#1a1c20", accent: "#3a3d42", legs: "#222428", boots: "#121214", beardStyle: "moustache", beard: "#8a8a88" },
  lisle: { hair: "#6a4a32", hairLight: "#8a6648", skin: "#e8c4a4", skinShade: "#c09c80", coat: "#e4e0d8", coatShade: "#bab4a8", accent: "#d0ccc2", legs: "#4a4540", boots: "#2a2622", style: "bun" },
  finch: { hair: "#8a5a26", hairLight: "#b07a38", skin: "#e8c39c", skinShade: "#c09772", coat: "#c09a3a", coatShade: "#9a7a2a", accent: "#e8dcc0", legs: "#4a3a2a", boots: "#2a2018" },
  kid: { hair: "#4a3020", hairLight: "#6a4630", skin: "#e0bb94", skinShade: "#b8916c", coat: "#7d6aa0", coatShade: "#5f4f80", accent: "#c9b98a", legs: "#3e352c", boots: "#2a221c" },
  kid2: { hair: "#c0904a", hairLight: "#d8aa62", skin: "#e8c8a8", skinShade: "#c0a080", coat: "#a05a4a", coatShade: "#7e4538", accent: "#e0d0a8", legs: "#3e352c", boots: "#2a221c" },
  // the prologue's named villagers, matched to their portraits
  maren: { hair: "#e0dcd4", hairLight: "#f4f0ea", skin: "#e6c4a4", skinShade: "#c29c7c", coat: "#6a4a36", coatShade: "#4e3628", accent: "#5a4030", legs: "#3e352c", boots: "#2a221c", style: "bun" },
  rook: { hair: "#c8c4bc", hairLight: "#e8e4dc", skin: "#d4a882", skinShade: "#a87e5e", coat: "#5e4632", coatShade: "#463424", accent: "#4a3a2c", legs: "#3e352c", boots: "#2a221c", style: "bald", beardStyle: "full", beard: "#e8e4dc" },
  oda: { hair: "#e8e4dc", hairLight: "#ffffff", skin: "#a87450", skinShade: "#86583a", coat: "#5a4838", coatShade: "#44362a", accent: "#7a6a52", legs: "#3e352c", boots: "#2a221c", style: "braid" },
  pell: { hair: "#c8a868", hairLight: "#e0c488", skin: "#e8c8a8", skinShade: "#c0a080", coat: "#7a7870", coatShade: "#5e5c56", accent: "#8a8880", legs: "#3e3a34", boots: "#2a221c" },
  sela: { hair: "#2a201a", hairLight: "#443428", skin: "#e8c8a8", skinShade: "#c0a080", coat: "#6a4a30", coatShade: "#4e3624", accent: "#7a5a3a", legs: "#3e352c", boots: "#2a221c" },
  // Hessa, the pilgrim from Millbridge: eight lull rings, a town coat, her hair pinned up
  hessa: { hair: "#6a4a3a", hairLight: "#8a6a52", skin: "#e2bc9a", skinShade: "#ba9476", coat: "#5a6a7a", coatShade: "#44505e", accent: "#a89a80", legs: "#3a3a3a", boots: "#222", style: "bun" },
  // Act I
  brannoc: { hair: "#6a6560", hairLight: "#8a8580", skin: "#d4a888", skinShade: "#ac8466", coat: "#5a4a38", coatShade: "#42362a", accent: "#4a3e30", legs: "#3a3028", boots: "#221a14", style: "bald", beardStyle: "full", beard: "#8a8580" },
  kane: { hair: "#3e3c3a", hairLight: "#8a8886", skin: "#d8b08a", skinShade: "#b08866", coat: "#2e4434", coatShade: "#22332a", accent: "#9a2a24", legs: "#2a2e2a", boots: "#1a1614", beardStyle: "full", beard: "#3e3c3a" },
  ketti: { hair: "#8a3a1e", hairLight: "#b4562e", skin: "#f0cfb2", skinShade: "#d2a88a", coat: "#5a5a36", coatShade: "#44442a", accent: "#9a8a6a", legs: "#3a3228", boots: "#241c16", style: "braid" },
  ferris: { hair: "#1e1a18", hairLight: "#3a3430", skin: "#d8aa80", skinShade: "#b08460", coat: "#3e5a32", coatShade: "#2e4426", accent: "#5a6a3a", legs: "#3a3a2a", boots: "#24221a", style: "cap", cap: "#4a5a34" },
  oren: { hair: "#7a746c", hairLight: "#9a948a", skin: "#d0a884", skinShade: "#a88262", coat: "#5e4a3a", coatShade: "#46382c", accent: "#2a2420", legs: "#4a4238", boots: "#2a241e", beardStyle: "full", beard: "#8a847a" },
  folk: { hair: "#5a3a2a", hairLight: "#7a5a42", skin: "#dcb090", skinShade: "#b48a6c", coat: "#7a6a4a", coatShade: "#5e5038", accent: "#d8ccb0", legs: "#4a3e30", boots: "#2a221a" },
  folk2: { hair: "#c8b890", hairLight: "#e0d4b0", skin: "#e8c4a4", skinShade: "#c09c80", coat: "#4a6a7a", coatShade: "#38525e", accent: "#a84a3a", legs: "#3a3a3a", boots: "#222" },
  reeve: { hair: "#3a3a3a", hairLight: "#5a5a5a", skin: "#d4aa86", skinShade: "#ac8464", coat: "#2a3a5a", coatShade: "#1e2a44", accent: "#c9a86a", legs: "#2a2a30", boots: "#18181c" },
  soldier: { hair: "#4a3020", hairLight: "#6a4630", skin: "#d8b08c", skinShade: "#b08866", coat: "#6a4a3a", coatShade: "#4e362a", accent: "#7a2a2a", legs: "#3a3028", boots: "#221a14" },
  cartwarden: { hair: "#2b2b2b", hairLight: "#8e959b", skin: "#e0b896", skinShade: "#b88e6c", coat: "#6a7076", coatShade: "#4c5258", accent: "#8a2a24", legs: "#34373a", boots: "#1a1a1a" },
  // townsfolk of the open towns (tools/world/towns.py)
  vil1: { hair: "#4a3424", hairLight: "#6a4c34", skin: "#d4a886", skinShade: "#ac8264", coat: "#5a6a3a", coatShade: "#44502c", accent: "#c8b080", legs: "#3a3428", boots: "#241c16", style: "cap", cap: "#8a4a2a" },
  vil2: { hair: "#7a5a3a", hairLight: "#9a7a52", skin: "#e8c4a4", skinShade: "#c09c80", coat: "#8a5a6a", coatShade: "#6a4452", accent: "#e0d0b0", legs: "#3e3430", boots: "#241c16", style: "bun" },
  vil3: { hair: "#2a1e16", hairLight: "#4a3626", skin: "#b88a62", skinShade: "#94684a", coat: "#4a5a7a", coatShade: "#38445e", accent: "#c0a060", legs: "#34302a", boots: "#201812" },
  vil4: { hair: "#5a5550", hairLight: "#7a7570", skin: "#d0a07a", skinShade: "#a87c5a", coat: "#6a4a2e", coatShade: "#4e3622", accent: "#3a2a1e", legs: "#3a3028", boots: "#1e1610", style: "bald", beardStyle: "full", beard: "#6a645e" },
  vil5: { hair: "#a87a3a", hairLight: "#c89a52", skin: "#e8c8a8", skinShade: "#c0a080", coat: "#3a5a5a", coatShade: "#2a4444", accent: "#b84a3a", legs: "#3a3a34", boots: "#221a14", style: "braid" },
  vil6: { hair: "#1e1a18", hairLight: "#3a3430", skin: "#a87450", skinShade: "#86583a", coat: "#7a6a4a", coatShade: "#5e5038", accent: "#d8ccb0", legs: "#3e352c", boots: "#221a14", beardStyle: "moustache", beard: "#1e1a18" },
  vil7: { hair: "#d8d4cc", hairLight: "#f0ece4", skin: "#dcb090", skinShade: "#b48a6c", coat: "#5a3a3a", coatShade: "#442c2c", accent: "#c8b890", legs: "#3a3028", boots: "#201812", style: "short", beardStyle: "full", beard: "#d8d4cc" },
  kid3: { hair: "#2a1a10", hairLight: "#4a3020", skin: "#c8a07a", skinShade: "#a07c5a", coat: "#8a8a7a", coatShade: "#6a6a5c", accent: "#5a5a50", legs: "#3e352c", boots: "#2a221c" },
};
/** Characters you can recruit (and Rhea) are drawn in clear, bright colours; everyone else a little muted,
 *  so the people who can join you stand out in a crowd. */
export type Tone = "vivid" | "plain" | "muted";

// The frames are composed by tools/art/people.py: 16 x 24, [facing][stand, walk 1-4], drawn as palette letters.
import FRAMES from "./peopleFrames.json";

/** A colour moved toward black (f < 1) or white (f > 1). */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1).padEnd(6, hex.slice(1)), 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const out = ch.map((c) => Math.round(f < 1 ? c * f : c + (255 - c) * (f - 1)));
  return "#" + out.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("");
}
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const A = p(a), B = p(b);
  return "#" + A.map((c, i) => Math.round(c + (B[i] - c) * t).toString(16).padStart(2, "0")).join("");
}

/** A colour made more (amt > 0) or less (amt < 0) saturated, and a touch lighter when brightened. */
export function saturate(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1).padEnd(6, hex.slice(1)), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const m = (c[0] + c[1] + c[2]) / 3, lift = amt > 0 ? 1 + amt * 0.18 : 1;
  return "#" + c.map((v) => Math.max(0, Math.min(255, Math.round((m + (v - m) * (1 + amt)) * lift))).toString(16).padStart(2, "0")).join("");
}
const CLOTHES: (keyof Look)[] = ["coat", "coatShade", "accent", "legs", "hair", "hairLight", "cap", "beard"];
function toned(look: Look, tone: Tone): Look {
  if (tone === "plain") return look;
  const out = { ...look } as Record<string, string>;
  for (const k of CLOTHES) if (out[k]) out[k] = saturate(out[k], tone === "vivid" ? 0.85 : -0.4);
  if (tone === "vivid") { out.skin = saturate(look.skin, 0.15); out.skinShade = saturate(look.skinShade, 0.15); }
  return out as unknown as Look;
}
/** The tone a look is drawn in. */
export const toneOf = (id: string, recruitable: Set<string>): Tone => (recruitable.has(id) || id === "rhea" ? "vivid" : id in LOOKS ? "muted" : "plain");
export { bodyOf };

/** Where a person's old 12 x 18 top-left sits inside the 16 x 24 frame, so positions and feet line up as before. */
export const PERSON_ANCHOR = { x: 2 / 16, y: 6 / 24 };

/** A sheet of 5 frames (stand, then a 4-step walk) x 4 facings, as Pixi textures [facing][frame]. */
export function personSheet(look: Look, body: BodyKind = "average", tone: Tone = "plain"): Record<Facing, Texture[]> {
  const W = FRAMES.w, H = FRAMES.h, sets = FRAMES.sets as Record<string, Record<Facing, string[][]>>;
  const set = sets[`${body}|${look.style ?? "short"}|${body === "small" ? "none" : look.beardStyle ?? "none"}`];
  look = toned(look, tone);
  const pal: Record<string, string> = {
    o: mix(shade(look.coatShade, 0.45), "#1a1210", 0.5), h: look.hair, H: look.hairLight, d: shade(look.hair, 0.72), s: look.skin, S: look.skinShade,
    n: mix(look.skinShade, "#a03a30", 0.35), e: "#1a1210", w: "#efe6dc", c: look.coat, C: look.coatShade, k: shade(look.coatShade, 0.8), r: look.accent, R: shade(look.accent, 0.72),
    l: look.legs, L: shade(look.legs, 0.75), b: look.boots, B: shade(look.boots, 1.25),
    f: look.beard ?? shade(look.hair, 0.9), p: look.cap ?? look.accent, P: shade(look.cap ?? look.accent, 0.75),
  };
  const [cv, g] = makeCanvas(W * 5, H * 4);
  FACINGS.forEach((f, fi) => { for (let fr = 0; fr < 5; fr++) drawRows(g, set[f][fr], pal, fr * W, fi * H); });
  const base = pixelTexture(cv);
  const out = {} as Record<Facing, Texture[]>;
  FACINGS.forEach((f, fi) => { out[f] = [0, 1, 2, 3, 4].map((fr) => new Texture({ source: base.source, frame: new Rectangle(fr * W, fi * H, W, H), defaultAnchor: PERSON_ANCHOR })); });
  return out;
}

// Kith and small things on the map. Quadrupeds are 16 x 12, two frames per facing.
const BEAST: Record<string, { body: string; dark: string; light: string; horn?: string; small?: boolean }> = {
  loftbuck: { body: "#8a7a64", dark: "#5e5242", light: "#b8a88e", horn: "#d8ccb0" },
  foal: { body: "#9a8a72", dark: "#6a5e4c", light: "#c8b89e", small: true },
  reedcat: { body: "#6a6a48", dark: "#44442e", light: "#9a9a6a" },
};
const QUAD = {
  side: [["................", "...........hh...", "..........hbbh..", ".........obbebo.", ".oooooooobbbbo..", "obbbbbbbbbbbo...", "oLbbbbbbbbbbo...", "oLLLLLLLLLLbo...", ".oDoDooooDoDo...", ".oDoD....oDoD...", ".oDoD....oDoD...", "..o.o.....o.o..."],
         ["................", "...........hh...", "..........hbbh..", ".........obbebo.", ".oooooooobbbbo..", "obbbbbbbbbbbo...", "oLbbbbbbbbbbo...", "oLLLLLLLLLLbo...", ".ooDoDooDoDoo...", "..oDoD..oDoD....", "..oD.Do.oD.Do...", "..o...o.o...o..."]],
  down: [["................", "....h......h....", "....hoooooooh...", ".....obbbbbo....", ".....obebebo....", ".....obbbbbo....", "....obbLLbbbo...", "....obLLLLbbo...", "....obLLLLbbo...", "....oDo..oDo....", "....oDo..oDo....", ".....o....o....."],
         ["................", "....h......h....", "....hoooooooh...", ".....obbbbbo....", ".....obebebo....", ".....obbbbbo....", "....obbLLbbbo...", "....obLLLLbbo...", "....obLLLLbbo...", "....oDo..oDo....", ".....o...oDo....", "..........o....."]],
  up: [["................", "....h......h....", "....hoooooooh...", ".....obbbbbo....", ".....obbbbbo....", ".....obbbbbo....", "....obbbbbbbo...", "....obbbbbbbo...", "....obbbbbbbo...", "....oDo..oDo....", "....oDo..oDo....", ".....o....o....."],
       ["................", "....h......h....", "....hoooooooh...", ".....obbbbbo....", ".....obbbbbo....", ".....obbbbbo....", "....obbbbbbbo...", "....obbbbbbbo...", "....obbbbbbbo...", "....oDo..oDo....", "....oDo...o.....", ".....o.........."]],
};
export function beastSheet(kind: string): Record<Facing, Texture[]> {
  const b = BEAST[kind] ?? BEAST.loftbuck, W = 16, H = 12;
  const pal: Record<string, string> = { o: "#1d1612", b: b.body, D: b.dark, L: b.light, e: "#120c0a", h: b.horn ?? b.dark };
  const [cv, g] = makeCanvas(W * 2, H * 4);
  FACINGS.forEach((f, fi) => { for (let fr = 0; fr < 2; fr++) { const rows = f === "left" || f === "right" ? QUAD.side[fr] : QUAD[f][fr]; drawRows(g, rows, pal, fr * W, fi * H, f === "left"); } });
  const base = pixelTexture(cv);
  const out = {} as Record<Facing, Texture[]>;
  FACINGS.forEach((f, fi) => { const fr = [0, 1].map((i) => new Texture({ source: base.source, frame: new Rectangle(i * W, fi * H, W, H) })); out[f] = [fr[0], fr[1], fr[0], fr[1]]; });
  return out;
}
export const isBeast = (look: string): boolean => look in BEAST;
export const beastSmall = (look: string): boolean => !!BEAST[look]?.small;

/** Something small glinting in the grass: a rare find. */
export function glintTexture(): Texture {
  const [cv, g] = makeCanvas(12, 18);
  drawRows(g, ["", "", "", "", "", "", "", "", ".....w......", ".....w......", "...wwywww...", ".....w......", "....oyo.....", "...oyyyo....", "....oyo.....", ".....o......"], { o: "#4a3a1c", w: "#fffbe8", y: "#f0c850" }, 0, 0);
  return pixelTexture(cv);
}

/** A folded page lying on the ground, for the mother's notes. */
export function noteTexture(): Texture {
  const [cv, g] = makeCanvas(12, 18);
  drawRows(g, ["", "", "", "", "", "", "", "", "", "", "..oooooooo..", ".owwwwwwwwo.", ".owlllllwwo.", ".owwwwwwwwo.", ".owllllwwwo.", "..oooooooo.."], { o: "#3a2e24", w: "#efe4c8", l: "#9a8a70" }, 0, 0);
  return pixelTexture(cv);
}
