// Pixel people for the explore view: a shared body shape recoloured per character, 4 walk frames x 4 facings.
import { drawRows, makeCanvas, pixelTexture } from "./pixel";
import { Rectangle, Texture } from "pixi.js";

export type Facing = "down" | "up" | "left" | "right";
export const FACINGS: Facing[] = ["down", "up", "left", "right"];

export interface Look { hair: string; hairLight: string; skin: string; skinShade: string; coat: string; coatShade: string; accent: string; legs: string; boots: string; }

export const LOOKS: Record<string, Look> = {
  rhea: { hair: "#3a2418", hairLight: "#5c3a26", skin: "#e2b48c", skinShade: "#b8865f", coat: "#6b4a3a", coatShade: "#4f3428", accent: "#c0452f", legs: "#3b2e26", boots: "#221a15" },
  warden: { hair: "#2b2b2b", hairLight: "#8e959b", skin: "#e0b896", skinShade: "#b88e6c", coat: "#7c8389", coatShade: "#5c6268", accent: "#3a3d40", legs: "#3a3d40", boots: "#1e1e1e" },
  elder: { hair: "#dcd6ca", hairLight: "#b9b2a4", skin: "#d7ad88", skinShade: "#ae8462", coat: "#6d5f4e", coatShade: "#504538", accent: "#7a5a48", legs: "#3e352c", boots: "#2a221c" },
  elder2: { hair: "#9a948a", hairLight: "#bdb6aa", skin: "#d4a882", skinShade: "#a87e5e", coat: "#4a5a6a", coatShade: "#38444f", accent: "#7a6a58", legs: "#3e352c", boots: "#2a221c" },
  corran: { hair: "#3b2d22", hairLight: "#56432f", skin: "#dcb38e", skinShade: "#b0886a", coat: "#5d6266", coatShade: "#44484b", accent: "#2f3235", legs: "#2f3235", boots: "#1c1c1c" },
  tamsin: { hair: "#1e1915", hairLight: "#3a3029", skin: "#c99f7a", skinShade: "#a07a58", coat: "#4f6b5c", coatShade: "#3a5045", accent: "#b89a5a", legs: "#2e3a33", boots: "#1f1a16" },
  halloran: { hair: "#a9a9a9", hairLight: "#c8c8c8", skin: "#cfa985", skinShade: "#a6805f", coat: "#4a4d51", coatShade: "#36393c", accent: "#9a8040", legs: "#2a2c2e", boots: "#151515" },
  lisle: { hair: "#5a4632", hairLight: "#7a6046", skin: "#dcb38e", skinShade: "#b0886a", coat: "#d8d4c8", coatShade: "#b4afa2", accent: "#6a7a8a", legs: "#4a4540", boots: "#2a2622" },
  finch: { hair: "#7a5326", hairLight: "#9c6d38", skin: "#e8c39c", skinShade: "#c09772", coat: "#b88b3b", coatShade: "#946d2c", accent: "#6a4a2a", legs: "#4a3a2a", boots: "#2a2018" },
  kid: { hair: "#4a3020", hairLight: "#6a4630", skin: "#e0bb94", skinShade: "#b8916c", coat: "#7d6aa0", coatShade: "#5f4f80", accent: "#c9b98a", legs: "#3e352c", boots: "#2a221c" },
  kid2: { hair: "#c0904a", hairLight: "#d8aa62", skin: "#e8c8a8", skinShade: "#c0a080", coat: "#a05a4a", coatShade: "#7e4538", accent: "#e0d0a8", legs: "#3e352c", boots: "#2a221c" },
};
/** Children are drawn shorter: the same body with fewer torso and leg rows. */
export const SMALL = new Set(["finch", "kid", "kid2"]);

// 12 wide; o outline, h/H hair, s/S skin, e eye, c/C coat, r accent, l legs, b boots
const BODY: Record<Facing, string[]> = {
  down: ["...oooooo...", "..ohhhhhho..", ".ohhHhhHhho.", ".ohssssssho.", ".oseessesso.", ".ossssSsss..", "..oSsssSo...", ".orrrrrrro..", "occrrrrrcco.", "occcccccccso", "osccCccCccso", ".occcccccco.", "..oCccccCo..", "..oCccccCo..", "...oooooo..."],
  up: ["...oooooo...", "..ohhhhhho..", ".ohhhhhhhho.", ".ohhhHhhhho.", ".ohhhhhhhho.", ".ohhhhhhhho.", "..ohhhhho...", ".orrrrrrro..", "occrrrrrcco.", "occcccccccso", "osccCccCccso", ".occcccccco.", "..oCccccCo..", "..oCccccCo..", "...oooooo..."],
  right: ["...ooooo....", "..ohhhhhoo..", ".ohhHhhhhho.", ".ohhhhsssso.", ".ohhhssseso.", ".hohhssssso.", ".hoohSssso..", ".h.orrrrro..", ".hocrrRrcco.", "..occRcccso.", "..occcccc...", "..oCcccccCo.", "...oCcccCo..", "...oCcccCo..", "....ooooo..."],
  left: [],
};
BODY.left = BODY.right.map((r) => [...r.padEnd(12, ".")].reverse().join(""));
const LEGS: string[][] = [["...ol..lo...", "...ol..lo...", "...ob..bo..."], ["..ol....lo..", ".ol......lo.", ".ob......bo."], ["...ol..lo...", "...ollllo...", "...obbbbo..."], ["...ol...lo..", "..ol....lo..", "..ob....bo.."]];

/** A sheet of 4 frames x 4 facings, 12 x 18 each, as Pixi textures [facing][frame]. Small bodies sit at the bottom. */
export function personSheet(look: Look, small = false): Record<Facing, Texture[]> {
  const W = 12, H = 18;
  const shrink = (rows: string[]): string[] => small ? ["", "", "", "", ...rows.filter((_, i) => i !== 9 && i !== 11 && i !== 13)] : rows;
  const pal: Record<string, string> = { o: "#1d1612", h: look.hair, H: look.hairLight, s: look.skin, S: look.skinShade, e: "#1a1210", c: look.coat, C: look.coatShade, r: look.accent, R: look.accent, l: look.legs, b: look.boots };
  const [cv, g] = makeCanvas(W * 4, H * 4);
  FACINGS.forEach((f, fi) => { for (let fr = 0; fr < 4; fr++) drawRows(g, shrink(BODY[f].concat(LEGS[fr].slice(small ? 1 : 0))), pal, fr * W, fi * H); });
  const base = pixelTexture(cv);
  const out = {} as Record<Facing, Texture[]>;
  FACINGS.forEach((f, fi) => { out[f] = [0, 1, 2, 3].map((fr) => new Texture({ source: base.source, frame: new Rectangle(fr * W, fi * H, W, H) })); });
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

/** A folded page lying on the ground, for the mother's notes. */
export function noteTexture(): Texture {
  const [cv, g] = makeCanvas(12, 18);
  drawRows(g, ["", "", "", "", "", "", "", "", "", "", "..oooooooo..", ".owwwwwwwwo.", ".owlllllwwo.", ".owwwwwwwwo.", ".owllllwwwo.", "..oooooooo.."], { o: "#3a2e24", w: "#efe4c8", l: "#9a8a70" }, 0, 0);
  return pixelTexture(cv);
}
