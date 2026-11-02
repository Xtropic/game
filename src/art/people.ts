// Pixel people for the explore view: a shared body shape recoloured per character, 4 walk frames x 4 facings.
import { drawRows, makeCanvas, pixelTexture } from "./pixel";
import { Rectangle, Texture } from "pixi.js";

export type Facing = "down" | "up" | "left" | "right";
export const FACINGS: Facing[] = ["down", "up", "left", "right"];

export interface Look { hair: string; hairLight: string; skin: string; skinShade: string; coat: string; coatShade: string; accent: string; legs: string; boots: string; }

export const LOOKS: Record<string, Look> = {
  rhea: { hair: "#3a2418", hairLight: "#5c3a26", skin: "#e2b48c", skinShade: "#b8865f", coat: "#6b4a3a", coatShade: "#4f3428", accent: "#c0452f", legs: "#3b2e26", boots: "#221a15" },
  elder: { hair: "#dcd6ca", hairLight: "#b9b2a4", skin: "#d7ad88", skinShade: "#ae8462", coat: "#6d5f4e", coatShade: "#504538", accent: "#7a5a48", legs: "#3e352c", boots: "#2a221c" },
};

// 12 wide; o outline, h/H hair, s/S skin, e eye, c/C coat, r accent, l legs, b boots
const BODY: Record<Facing, string[]> = {
  down: ["...oooooo...", "..ohhhhhho..", ".ohhHhhHhho.", ".ohssssssho.", ".oseessesso.", ".ossssSsss..", "..oSsssSo...", ".orrrrrrro..", "occrrrrrcco.", "occcccccccso", "osccCccCccso", ".occcccccco.", "..oCccccCo..", "..oCccccCo..", "...oooooo..."],
  up: ["...oooooo...", "..ohhhhhho..", ".ohhhhhhhho.", ".ohhhHhhhho.", ".ohhhhhhhho.", ".ohhhhhhhho.", "..ohhhhho...", ".orrrrrrro..", "occrrrrrcco.", "occcccccccso", "osccCccCccso", ".occcccccco.", "..oCccccCo..", "..oCccccCo..", "...oooooo..."],
  right: ["...ooooo....", "..ohhhhhoo..", ".ohhHhhhhho.", ".ohhhhsssso.", ".ohhhssseso.", ".hohhssssso.", ".hoohSssso..", ".h.orrrrro..", ".hocrrRrcco.", "..occRcccso.", "..occcccc...", "..oCcccccCo.", "...oCcccCo..", "...oCcccCo..", "....ooooo..."],
  left: [],
};
BODY.left = BODY.right.map((r) => [...r.padEnd(12, ".")].reverse().join(""));
const LEGS: string[][] = [["...ol..lo...", "...ol..lo...", "...ob..bo..."], ["..ol....lo..", ".ol......lo.", ".ob......bo."], ["...ol..lo...", "...ollllo...", "...obbbbo..."], ["...ol...lo..", "..ol....lo..", "..ob....bo.."]];

/** A sheet of 4 frames x 4 facings, 12 x 18 each, as Pixi textures [facing][frame]. */
export function personSheet(look: Look): Record<Facing, Texture[]> {
  const W = 12, H = 18;
  const pal: Record<string, string> = { o: "#1d1612", h: look.hair, H: look.hairLight, s: look.skin, S: look.skinShade, e: "#1a1210", c: look.coat, C: look.coatShade, r: look.accent, R: look.accent, l: look.legs, b: look.boots };
  const [cv, g] = makeCanvas(W * 4, H * 4);
  FACINGS.forEach((f, fi) => { for (let fr = 0; fr < 4; fr++) drawRows(g, BODY[f].concat(LEGS[fr]), pal, fr * W, fi * H); });
  const base = pixelTexture(cv);
  const out = {} as Record<Facing, Texture[]>;
  FACINGS.forEach((f, fi) => { out[f] = [0, 1, 2, 3].map((fr) => new Texture({ source: base.source, frame: new Rectangle(fr * W, fi * H, W, H) })); });
  return out;
}
