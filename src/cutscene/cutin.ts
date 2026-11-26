// Battle cut-ins: when a finisher, a kith art or Call Ash goes in, the fight holds its breath. The stage dims,
// a slanted band tears across it with speed lines streaming through, the fighter's face (or their kith) fills
// the band, and the move's name slams in from the other side. Then the blow lands on an impact frame: a beat of
// ink-black with the burst lines in white, a ring, and the stage shaking. The first time a move is used in a
// fight it gets the full cut-in; after that a short one, so a long fight doesn't drag.
import { drawLook, setScale } from "../battle/art";
import { HUD_FONT } from "../battle/art";
import { portraitCut, rnd } from "./kit";

export interface CutIn {
  /** Whose face fills the band (a portrait id), if they have one. */
  face?: string;
  /** A painted figure for the band instead (a kith), as a battle look. */
  fig?: string;
  name: string;
  /** Who is doing it, in small type under the name. */
  by: string;
  col: string;
  /** Which way the band runs: 1 left to right (an ally), -1 the other way. */
  dir: 1 | -1;
  full: boolean;
}
export const cutInLength = (c: CutIn): number => (c.full ? 1.25 : 0.55);

/** Colours of each finisher's weapon, each kith family's art, Call and the plain strike. */
const COL: Record<string, string> = {
  knife: "#c83a3a", blade: "#c8c8d8", sabre: "#3a6ac8", staff: "#c89a3a", sling: "#8a7a5a", bow: "#3a9a5a", spear: "#d8743a", lance: "#a83a6a", shield: "#5a7aa8",
  hook: "#6a5a8a", twin: "#d84a6a", rope: "#9a8a3a", cane: "#4aa8a8", fists: "#e05a2a", tools: "#8a8a5a",
  loftbuck: "#e0b040", mistwing: "#7ab0e0", ironback: "#8a8a9a", reedcat: "#c8a05a", delver: "#8a6a4a", wadeskin: "#5aa878", strider: "#d0904a", hearthling: "#e86a3a",
  treeloper: "#5a9a4a", brineback: "#3a8aa8", gloamer: "#8a5ac8", bellower: "#c85a5a", call: "#ffc040",
};
export const cutInColour = (skill: string): string => COL[skill.split(".")[1] ?? skill] ?? "#e0a040";

const ease = (p: number) => 1 - (1 - p) ** 3;

/** Draws the cut-in over the whole battle canvas (pixels), `t` seconds in. */
export function drawCutIn(g: CanvasRenderingContext2D, W: number, H: number, c: CutIn, t: number): void {
  const dur = cutInLength(c), inT = c.full ? 0.16 : 0.1, outT = c.full ? 0.18 : 0.12;
  const pin = ease(Math.min(1, t / inT)), pout = t > dur - outT ? ease((t - (dur - outT)) / outT) : 0;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  // the stage dims and the colour drains a little
  g.fillStyle = `rgba(8,6,10,${0.55 * pin * (1 - pout)})`; g.fillRect(0, 0, W, H);
  const bh = H * (c.full ? 0.44 : 0.26), cy = H * 0.5, slant = H * 0.12, d = c.dir;
  const off = (1 - pin) * -W * 1.2 * d + pout * W * 1.2 * d;
  g.translate(off, 0);
  // the band: a slanted slab of the move's colour
  g.beginPath(); g.moveTo(-W * 0.2, cy - bh / 2 + slant); g.lineTo(W * 1.2, cy - bh / 2 - slant); g.lineTo(W * 1.2, cy + bh / 2 - slant); g.lineTo(-W * 0.2, cy + bh / 2 + slant); g.closePath();
  g.save(); g.clip();
  const gr = g.createLinearGradient(0, cy - bh, 0, cy + bh); gr.addColorStop(0, "#0a0810"); gr.addColorStop(0.5, c.col); gr.addColorStop(1, "#0a0810");
  g.fillStyle = gr; g.fillRect(-W, 0, W * 3, H);
  // speed lines streaming through
  for (let i = 0; i < 46; i++) {
    const y = cy - bh / 2 + rnd(i, 1) * bh, len = W * (0.1 + rnd(i, 2) * 0.35), sp = W * (2.5 + rnd(i, 3) * 2.5), x = (((rnd(i, 4) * W * 1.6 + t * sp) % (W * 1.6)) - W * 0.3) * d + (d < 0 ? W : 0);
    g.fillStyle = `rgba(255,255,255,${0.12 + rnd(i, 5) * 0.4})`; g.fillRect(x, y, len * d, Math.max(1, H * 0.004 * (0.5 + rnd(i, 6))));
  }
  // the face, or the kith, filling the band and drifting
  const drift = t * W * 0.04 * d;
  const faceCv = c.face ? portraitCut(c.face) : null;
  if (faceCv) {
    const size = bh * 2.3, fx = (d > 0 ? W * 0.27 : W * 0.73) + drift, fy = cy - size * 0.36 + (c.full ? 0 : bh * 0.1);
    g.globalAlpha = 0.95; g.imageSmoothingEnabled = true; g.drawImage(faceCv, fx - size / 2, fy, size, size); g.globalAlpha = 1;
  } else if (c.fig) {
    const k = bh / 40; g.save(); g.translate((d > 0 ? W * 0.28 : W * 0.72) + drift, cy + bh * 0.5); setScale(k); drawLook(g, c.fig, 0, 0, { t: t * 3, lunge: true, flip: d < 0 }); g.restore();
  }
  g.restore();
  // band edges
  g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = Math.max(2, H * 0.008);
  g.beginPath(); g.moveTo(-W * 0.2, cy - bh / 2 + slant); g.lineTo(W * 1.2, cy - bh / 2 - slant); g.moveTo(-W * 0.2, cy + bh / 2 + slant); g.lineTo(W * 1.2, cy + bh / 2 - slant); g.stroke();
  g.restore();
  // the name slams in from the other side
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const nt = Math.max(0, t - (c.full ? 0.12 : 0.04)), np = ease(Math.min(1, nt / 0.14)), slam = 1 + (1 - np) * 0.6;
  const nx = (d > 0 ? W * 0.66 : W * 0.34) - (1 - np) * W * 0.5 * d + pout * -W * 1.2 * d, ny = cy + (c.full ? bh * 0.05 : bh * 0.12);
  const fs = Math.round(H * (c.full ? 0.1 : 0.075) * slam);
  g.globalAlpha = np * (1 - pout); g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `italic 800 ${fs}px ${HUD_FONT}`;
  g.lineJoin = "round"; g.lineWidth = Math.max(3, fs * 0.16); g.strokeStyle = "#0a0810"; g.strokeText(c.name.toUpperCase(), nx, ny);
  g.fillStyle = "#fff6e0"; g.fillText(c.name.toUpperCase(), nx, ny);
  if (c.full) { g.font = `italic 600 ${Math.round(H * 0.04)}px ${HUD_FONT}`; g.lineWidth = Math.max(2, H * 0.008); g.strokeText(c.by, nx, ny - fs * 1.05); g.fillStyle = c.col; g.fillText(c.by, nx, ny - fs * 1.05); }
  g.restore();
}

export const IMPACT_LENGTH = 0.34;
/** The impact frame at (x, y) on the canvas (pixels), `t` seconds after the blow lands. */
export function drawImpact(g: CanvasRenderingContext2D, W: number, H: number, x: number, y: number, t: number, col = "#ffffff"): void {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  if (t < 0.07) { // a beat of ink: the frame goes black and the burst is drawn in white
    g.fillStyle = "rgba(6,4,8,.86)"; g.fillRect(0, 0, W, H);
  }
  const p = Math.min(1, t / IMPACT_LENGTH), a = 1 - p;
  g.strokeStyle = t < 0.07 ? "#ffffff" : col; g.lineCap = "round";
  for (let i = 0; i < 28; i++) {
    const ang = rnd(i, 7) * Math.PI * 2, r0 = H * (0.04 + p * 0.12 + rnd(i, 8) * 0.05), r1 = r0 + H * (0.12 + rnd(i, 9) * 0.4) * (1 - p * 0.5);
    g.globalAlpha = a; g.lineWidth = Math.max(1, H * 0.012 * (1 - p) * (0.4 + rnd(i, 10)));
    g.beginPath(); g.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0); g.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1); g.stroke();
  }
  g.globalAlpha = a; g.lineWidth = Math.max(2, H * 0.014 * a); g.strokeStyle = "#fff";
  g.beginPath(); g.ellipse(x, y, H * (0.05 + p * 0.3), H * (0.035 + p * 0.2), 0, 0, 7); g.stroke();
  g.restore();
}
