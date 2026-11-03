// Battle art. The backdrop is pixel art (256 x 144, scaled up crisp); the fighters and effects are drawn
// at full resolution as clean cel-shaded figures (about 6 heads tall, small heads, equal realistic eyes, fine outlines).
// Everything is laid out in 256 x 144 "stage units"; setScale() sets how many screen pixels one unit is.
import { BAYER4, dither, hash2, makeCanvas, px } from "../art/pixel";
import { EVEN, type Build } from "../art/build";

export const CW = 256, CH = 144;
let K = 4;
export const setScale = (k: number): void => { K = k; };
const U = (v: number) => v * K;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const INK = "#1a1420";
export const HUD_FONT = '"Alegreya Sans SC", "Gill Sans", "Trebuchet MS", sans-serif';

export function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(clamp(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt, 0, 255));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// ---------------- Pixel backdrops ----------------
const backdrops: Record<string, HTMLCanvasElement> = {};
export function backdrop(id: string): HTMLCanvasElement {
  if (backdrops[id]) return backdrops[id];
  const [cv, g] = makeCanvas(CW, CH);
  // night trail: dithered sky, stars, moon with a halo, two ridges, a moonlit trail, rocks, tufts, dead pines framing the stage
  dither(g, 0, 0, CW, 64, ["#0e1024", "#161a36", "#232848", "#34355a", "#4a4568"], (_x, y) => y / 64);
  for (let i = 0; i < 70; i++) { const sx = (hash2(i, 11) * CW) | 0, sy = (hash2(11, i) * 50) | 0; px(g, sx, sy, hash2(i, i) > 0.8 ? "#fff6d8" : "#9aa0c8"); }
  for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) { const d = Math.hypot(x, y); if (d > 5 && d < 14 && (BAYER4[(y + 16) & 3][(x + 16) & 3] + 0.5) / 16 > (d - 5) / 9 + 0.35) px(g, 200 + x, 18 + y, "#5a5880"); }
  for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y); if (d <= 5.2) px(g, 200 + x, 18 + y, d > 4.2 ? "#cfc8b0" : (x - 1) * (x - 1) + (y + 1) * (y + 1) < 3 ? "#d8d0b8" : "#f2ecd6"); }
  const ridge = (base: number, amp: number, f: number, ph: number, cols: [string, string]) => { for (let x = 0; x < CW; x++) { const top = Math.round(base - amp * (Math.sin(x * f + ph) * 0.6 + Math.sin(x * f * 2.7 + ph * 2) * 0.4)); for (let y = top; y < CH; y++) px(g, x, y, y === top ? cols[0] : cols[1]); } };
  ridge(52, 10, 0.035, 1, ["#3e3c62", "#2c2c4c"]);
  ridge(62, 7, 0.06, 4, ["#2e3a40", "#222c32"]);
  dither(g, 0, 66, CW, CH - 66, ["#1f2a28", "#28362f", "#33443a", "#3d4f40"], (x, y) => clamp(((y - 66) / 78) * 0.85 + Math.sin(x * 0.05) * 0.08));
  for (let y = 78; y < CH; y++) { const w0 = 40 + (y - 78) * 1.4, cx = 128 + Math.sin(y * 0.05) * 6; for (let x = Math.round(cx - w0); x < cx + w0; x++) if ((BAYER4[y & 3][x & 3] + 0.5) / 16 < 0.55 + (y - 78) / 140) px(g, x, y, (x + y) % 7 ? "#4a5446" : "#555e4e"); }
  for (let i = 0; i < 26; i++) { const rx = (hash2(i, 3) * CW) | 0, ry = 70 + ((hash2(3, i) * 72) | 0); if (Math.abs(rx - 128) < 60 && ry > 80) continue; px(g, rx, ry, "#56604f", 3, 2); px(g, rx, ry + 2, "#1a221e", 3, 1); px(g, rx + 1, ry - 1, "#6a7460", 1, 1); }
  for (let i = 0; i < 40; i++) { const tx = (hash2(i, 5) * CW) | 0, ty = 70 + ((hash2(5, i) * 72) | 0); px(g, tx, ty, "#4f6a44"); px(g, tx + 1, ty - 1, "#5e7c50"); px(g, tx + 2, ty, "#4f6a44"); }
  for (const [x0, flip] of [[8, 0], [246, 1]]) { for (let y = 20; y < 100; y++) px(g, x0, y, "#14161c", 2, 1); for (let k2 = 0; k2 < 7; k2++) { const by = 28 + k2 * 9, len = 4 + k2; for (let i = 0; i < len; i++) px(g, flip ? x0 - i : x0 + 2 + i, by + (i >> 1), "#14161c"); for (let i = 0; i < len - 2; i++) px(g, flip ? x0 + 2 + i : x0 - i, by + 3 + (i >> 1), "#14161c"); } }
  return (backdrops[id] = cv);
}

// ---------------- HD figures ----------------
interface CastLook { skin: string; skinS: string; hair: string; hairL: string; coat: string; coatS: string; pants: string; boot: string; eye: string; style: "braid" | "bun" | "helm"; scarf?: string; weapon: "staff" | "dart" | "spear" | "bow" | "none"; lash?: boolean; rope?: boolean; lantern?: boolean; long?: boolean; }
export const CAST: Record<string, CastLook> = {
  rhea: { skin: "#f2d2b6", skinS: "#d6a98c", hair: "#3a2418", hairL: "#7a4c32", coat: "#7a5444", coatS: "#5a3c30", pants: "#3b2e26", boot: "#2a1d16", eye: "#5f8a3a", style: "braid", scarf: "#c8402c", weapon: "staff", lash: true },
  tamsin: { skin: "#e3b896", skinS: "#c0916f", hair: "#1e1915", hairL: "#4e463e", coat: "#4f6b5c", coatS: "#3a5246", pants: "#2e3a33", boot: "#1e2420", eye: "#8a5a32", style: "bun", rope: true, weapon: "dart", lash: true },
  warden: { skin: "#ecc8a8", skinS: "#c99f80", hair: "#2b2b2b", hairL: "#555555", coat: "#7c8389", coatS: "#5c6268", pants: "#3a3d40", boot: "#1e1e1e", eye: "#5a6470", style: "helm", weapon: "spear", lantern: true, long: true },
  maren: { skin: "#e6c4a4", skinS: "#c29c7c", hair: "#d8d2c6", hairL: "#f2eee6", coat: "#6d5f4e", coatS: "#504538", pants: "#3e352c", boot: "#2a221c", eye: "#6a6458", style: "bun", scarf: "#8a6a4a", weapon: "none", long: true },
  archer: { skin: "#ecc8a8", skinS: "#c99f80", hair: "#2b2b2b", hairL: "#555555", coat: "#6f7a72", coatS: "#525c55", pants: "#3a3d40", boot: "#1e1e1e", eye: "#5a6470", style: "helm", weapon: "bow", long: true },
};
/** Height of each look above its feet, in stage units: where to put intent badges and the turn marker. */
export const LOOK_TOP: Record<string, number> = { maren: 51, rhea: 51, tamsin: 51, warden: 51, archer: 51, ash: 32, reedcat: 22 };

export interface Pose { t: number; run?: number; lunge?: boolean; brace?: boolean; bow?: number; shout?: boolean; cast?: boolean; flash?: number; flip?: boolean; fall?: number; /** 0..1 mouth opening while speaking */ talk?: number; }

function inkPath(g: CanvasRenderingContext2D, fill: string, lw = 0.28) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
function limb(g: CanvasRenderingContext2D, pts: number[], w: number, col: string) {
  g.lineCap = "round"; g.lineJoin = "round";
  for (const [lw, c2] of [[w + 0.5, INK], [w, col]] as const) { g.lineWidth = lw; g.strokeStyle = c2; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); }
}
function ell(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, col: string, rot = 0) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, 7); g.fill(); }

const grey = (hex: string, amt: number): string => { const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255, m = (r + gg + b) / 3; const f = (c: number) => Math.round(c + (m - c) * amt).toString(16).padStart(2, "0"); return `#${f(r)}${f(gg)}${f(b)}`; };

/** A person, feet at (x, y) in stage units, facing right unless flipped. `b` is the build their attributes give. */
export function drawFig(g: CanvasRenderingContext2D, id: string, x: number, y: number, o: Pose, b: Build = EVEN): void {
  const base = CAST[id], t = o.t;
  const P0 = b.raw ? { ...base, skin: shadeHex(grey(base.skin, 0.45), 0.04), skinS: grey(base.skinS, 0.45) } : base;
  const run = o.run ? Math.sin(o.run) : 0, lean = (o.run ? 0.14 : o.lunge ? 0.22 : o.brace ? -0.08 : 0) - 0.05 * b.bearing + (b.raw ? 0.09 : 0);
  const bob = o.run ? -Math.abs(Math.cos(o.run)) * 1.2 : Math.sin(t * 2.2) * 0.25 * (1 - 0.6 * Math.max(0, b.poise)) + (b.raw ? Math.sin(t * 13) * 0.06 : 0);
  const wx = 1 + 0.11 * b.bulk, tallY = 1 + 0.035 * b.bearing - (b.raw ? 0.025 : 0), thick = 1 + 0.22 * b.brawn - 0.1 * b.reach;
  g.save(); g.translate(U(x), U(y)); g.scale(K * (o.flip ? -1 : 1) * 1.22, K * 1.22);
  ell(g, 0, 0, 6, 1.4, "rgba(5,5,15,.45)");
  if (o.fall) { g.rotate(-o.fall * 1.45); g.globalAlpha = 1 - o.fall * 0.25; }
  g.translate(0, bob); g.rotate(lean);
  const hipY = -13, sh = -21.5;
  g.scale(0.9 * wx, 1.4 * tallY);
  const leg = (sw: number, near: boolean) => {
    const kx = Math.sin(sw) * 6, fx = Math.sin(sw) * 7.5 + (o.brace ? (near ? 3 : -3) : 0), knee = [kx * 0.55 + (near ? 0.8 : -0.6), hipY + 6.5 - Math.abs(sw) * 0.6], foot = [fx * 0.8 + (near ? 0.8 : -0.6), -1.3 - (sw < 0 && o.run ? 1.5 : 0)];
    limb(g, [near ? 0.8 : -0.6, hipY, knee[0], knee[1], foot[0], foot[1]], 2.5 * thick, near ? P0.pants : shadeHex(P0.pants, -0.25));
    g.save(); g.translate(foot[0], foot[1] + 0.6); ell(g, 0.8, 0, 2, 1.05, INK); ell(g, 0.8, -0.15, 1.6, 0.8, near ? P0.boot : shadeHex(P0.boot, -0.3)); g.restore();
  };
  leg(-run * 0.9 - (o.lunge ? 0.5 : 0), false); leg(run * 0.9 + (o.lunge ? 0.7 : 0), true);
  if (P0.style === "braid") { const sway = Math.sin(t * 2) * 0.4 + (o.run ? -1.5 : 0); for (let i = 0; i < 6; i++) { const bx = -3.6 - i * 0.25 + sway * i * 0.15, byy = -24 + i * 1.7; ell(g, bx, byy, 1.15, 1.05, INK); ell(g, bx, byy - 0.1, 0.95, 0.85, i % 2 ? P0.hair : P0.hairL); } ell(g, -3.8 + sway, -13.6, 0.7, 0.5, P0.scarf || "#c8402c"); }
  const arm = (near: boolean): [number, number] => {
    let el: number[], hd: [number, number];
    if (o.lunge) { el = near ? [5, -19.5] : [-1, -17.5]; hd = near ? [9, -19.5] : [1.5, -15]; }
    else if (o.brace) { el = near ? [4.5, -21] : [3.4, -19]; hd = near ? [4.2, -25.5] : [5.6, -23.5]; }
    else if (o.cast) { el = near ? [4, -20.5] : [-1.6, -18]; hd = near ? [6.5, -23.5] : [0.4, -15.8]; }
    else if (o.bow != null) { el = near ? [5.5, -20] : [-0.8, -19.6]; hd = near ? [9, -20.5] : [2.2 - o.bow * 2, -20.4]; }
    else if (o.run) { const a = (near ? 1 : -1) * Math.sin(o.run) * 3; el = [a * 0.6 + (near ? 1 : -1), -17.5]; hd = [a + 1.2, -14.5]; }
    else { el = near ? [2.6, -16.8] : [-2, -16.8]; hd = near ? [3.6, -13.3] : [-1.6, -13.2]; }
    const shx = near ? 1.8 : -1.4, col = near ? P0.coat : P0.coatS;
    limb(g, [shx, sh + 0.8, el[0], el[1], hd[0], hd[1]], 2.1 * thick, col);
    ell(g, hd[0], hd[1], 1.05, 1.05, INK); ell(g, hd[0], hd[1], 0.8, 0.8, near ? P0.skin : P0.skinS);
    return hd;
  };
  const backHand = arm(false);
  if (P0.weapon === "bow") {
    const drawn = o.bow != null, bx = drawn ? 9.2 : 4.4, byy = drawn ? -20.5 : -15;
    g.lineWidth = 0.9; g.strokeStyle = INK; g.beginPath(); g.arc(bx - 3, byy, 7, -1, 1); g.stroke(); g.lineWidth = 0.55; g.strokeStyle = "#8a6438"; g.stroke();
    g.lineWidth = 0.18; g.strokeStyle = "#e8e0d0"; g.beginPath(); g.moveTo(bx - 3 + 7 * Math.cos(-1), byy + 7 * Math.sin(-1)); g.lineTo(drawn ? backHand[0] : bx - 1, byy); g.lineTo(bx - 3 + 7 * Math.cos(1), byy + 7 * Math.sin(1)); g.stroke();
  }
  g.beginPath(); g.moveTo(-3.4, sh); g.quadraticCurveTo(0, sh - 1.2, 3.6, sh); g.lineTo(3.1, -15); g.lineTo(P0.long ? 5.2 : 4, P0.long ? -6 : -11.5); g.quadraticCurveTo(0, P0.long ? -5 : -10.8, P0.long ? -5 : -4, P0.long ? -6.4 : -11.5); g.lineTo(-2.9, -15); g.closePath(); inkPath(g, P0.coat);
  g.save(); g.clip(); g.fillStyle = P0.coatS; g.fillRect(-7, -24, 6, 20); g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(2.2, -22, 1.1, 8); g.restore();
  g.lineWidth = 0.9; g.strokeStyle = "#2a1d16"; g.beginPath(); g.moveTo(-2.9, -14.7); g.lineTo(3.1, -14.7); g.stroke(); ell(g, 1.6, -14.7, 0.55, 0.45, "#c9a86a");
  if (P0.rope) { g.lineWidth = 0.7; g.strokeStyle = "#a88a5a"; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(-0.6 + i * 0.25, -18.5, 2.6, 3.4, 0.5, 0, 7); g.stroke(); } }
  if (P0.lantern) { const lx = 3.8, ly = -12; const lg = g.createRadialGradient(lx, ly, 0.3, lx, ly, 7); lg.addColorStop(0, "rgba(255,210,120,.55)"); lg.addColorStop(1, "rgba(255,210,120,0)"); g.fillStyle = lg; g.fillRect(lx - 7, ly - 7, 14, 14); g.fillStyle = INK; g.fillRect(lx - 0.9, ly - 1.4, 1.8, 2.8); g.fillStyle = "#ffd27a"; g.fillRect(lx - 0.6, ly - 1, 1.2, 2); }
  g.fillStyle = P0.skinS; g.fillRect(-0.9, -23.4, 2, 2.4);
  if (P0.scarf) { const fl = Math.sin(t * 5) * 0.8 + (o.run ? 1.5 : 0); g.beginPath(); g.moveTo(-2.6, -22); g.quadraticCurveTo(-5 - fl, -21, -7.5 - fl, -18.5 + Math.sin(t * 6)); g.lineTo(-6.6 - fl, -17.6); g.quadraticCurveTo(-4.4, -19.6, -2.4, -20.4); g.closePath(); inkPath(g, shadeHex(P0.scarf, -0.15), 0.35); g.beginPath(); g.ellipse(0, -21.6, 3.3, 1.35, 0, 0, 7); inkPath(g, P0.scarf, 0.4); }
  if (b.rings > 0) { g.lineWidth = 0.22; g.strokeStyle = "rgba(150,60,60,.75)"; for (let i = 0; i < Math.min(6, b.rings); i++) { g.beginPath(); g.ellipse(0.1, -21.9 - i * 0.42, 1.15, 0.26, 0, 0.15, Math.PI - 0.15); g.stroke(); } }
  // head: smaller and undistorted, on top of the neck
  g.save(); g.translate(0, -23); g.scale(0.62 / (0.9 * wx), 0.62 / (1.4 * tallY)); g.translate(0, 23.6);
  const hx = 0.6, hy = -28;
  if (P0.style === "bun") { g.beginPath(); g.arc(-2.6, -32.6, 2.2, 0, 7); inkPath(g, P0.hair); ell(g, -3.2, -33.4, 0.9, 0.5, P0.hairL, -0.5); }
  g.beginPath(); g.moveTo(hx - 4.3, hy - 0.5); g.bezierCurveTo(hx - 4.6, hy - 6.4, hx + 4.8, hy - 6.4, hx + 4.4, hy - 0.5); g.quadraticCurveTo(hx + 4.3, hy + 2.6, hx + 2.2, hy + 4.6); g.quadraticCurveTo(hx + 0.9, hy + 5.3, hx - 0.6, hy + 4.2); g.quadraticCurveTo(hx - 3.8, hy + 2.4, hx - 4.3, hy - 0.5); g.closePath(); inkPath(g, P0.skin, 0.4);
  g.save(); g.clip(); g.fillStyle = P0.skinS; g.beginPath(); g.ellipse(hx - 4.3, hy + 1, 2.1, 5, 0, 0, 7); g.fill(); g.restore();
  ell(g, hx - 3.7, hy + 1.2, 0.8, 1.1, P0.skinS); ell(g, hx - 3.7, hy + 1.2, 0.38, 0.6, shadeHex(P0.skinS, -0.2));
  const eyeY = hy + 1.5, blink = t % 4.1 < 0.12, hurt = (o.flash ?? 0) > 0.2 || (o.fall ?? 0) > 0.5;
  const eye = (ex: number, w: number, h: number) => {
    if (blink || hurt) { g.lineWidth = 0.45; g.strokeStyle = INK; g.beginPath(); g.moveTo(ex - w, eyeY + 0.2); g.quadraticCurveTo(ex, eyeY + (hurt ? -0.6 : 0.8), ex + w, eyeY + 0.2); g.stroke(); return; }
    g.save(); g.beginPath(); g.moveTo(ex - w, eyeY - h * 0.55); g.quadraticCurveTo(ex, eyeY - h * 1.15, ex + w, eyeY - h * 0.7); g.quadraticCurveTo(ex + w * 1.05, eyeY + h * 0.6, ex + w * 0.1, eyeY + h * 0.95); g.quadraticCurveTo(ex - w * 0.9, eyeY + h * 0.7, ex - w, eyeY - h * 0.55); g.closePath(); g.fillStyle = "#fbf6ee"; g.fill(); g.clip();
    const ix = ex + w * 0.06, ig = g.createLinearGradient(0, eyeY - h, 0, eyeY + h); ig.addColorStop(0, shadeHex(P0.eye, -0.55)); ig.addColorStop(0.55, P0.eye); ig.addColorStop(1, shadeHex(P0.eye, 0.35)); g.fillStyle = ig; g.beginPath(); g.ellipse(ix, eyeY + h * 0.1, w * 0.5, h * 0.9, 0, 0, 7); g.fill();
    g.lineWidth = 0.14; g.strokeStyle = shadeHex(P0.eye, -0.6); g.stroke();
    ell(g, ix, eyeY + h * 0.05, w * 0.2, h * 0.3, "#120c10");
    g.fillStyle = "rgba(20,10,20,.28)"; g.fillRect(ex - w * 1.2, eyeY - h * 1.2, w * 2.4, h * 0.55);
    ell(g, ix - w * 0.2, eyeY - h * 0.3, w * 0.13, h * 0.14, "rgba(255,255,255,.9)");
    g.restore();
    g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 0.55; g.beginPath(); g.moveTo(ex - w * 1.05, eyeY - h * 0.5); g.quadraticCurveTo(ex, eyeY - h * 1.25, ex + w * 1.08, eyeY - h * 0.72); g.stroke();
    if (P0.lash) { const sd = ex > hx ? 1 : -1, ox = ex + sd * w * 1.02; g.lineWidth = 0.3; g.beginPath(); g.moveTo(ox, eyeY - h * (sd > 0 ? 0.74 : 0.5)); g.lineTo(ox + sd * w * 0.38, eyeY - h * (sd > 0 ? 0.98 : 0.78)); g.stroke(); }
    g.lineWidth = 0.16; g.strokeStyle = shadeHex(P0.skinS, -0.35); g.beginPath(); g.moveTo(ex - w * 0.4, eyeY + h * 0.92); g.quadraticCurveTo(ex + w * 0.3, eyeY + h * 1.02, ex + w * 0.85, eyeY + h * 0.55); g.stroke();
  };
  const eh = 0.78 * (1 - 0.15 * b.keen);
  if (b.raw) { ell(g, hx + 1.9, eyeY + 1.05, 1.1, 0.42, "rgba(70,50,80,.32)"); ell(g, hx - 1.7, eyeY + 1.05, 1.1, 0.42, "rgba(70,50,80,.32)"); }
  eye(hx + 1.85, 0.98, eh); eye(hx - 1.75, 0.98, eh);
  const angry = id === "warden" || id === "archer" || o.lunge;
  g.strokeStyle = shadeHex(P0.hair, -0.2); g.lineWidth = 0.32;
  const browY = eyeY + 0.3 * b.keen - 0.2 * b.warmth;
  for (const bx of [hx + 1.85, hx - 1.75]) { g.beginPath(); g.moveTo(bx - 1, browY - 2.5 + (angry ? -0.3 : 0)); g.quadraticCurveTo(bx, browY - 2.9 - 0.15 * b.warmth, bx + 1, browY - 2.4 + (angry ? 0.5 : -0.1)); g.stroke(); }
  g.lineWidth = 0.3; g.strokeStyle = shadeHex(P0.skinS, -0.25); g.beginPath(); g.moveTo(hx + 0.15, eyeY + 1.2); g.lineTo(hx + 0.4, eyeY + 1.8); g.lineTo(hx - 0.05, eyeY + 1.95); g.stroke();
  g.lineWidth = 0.35; g.strokeStyle = "#7a3a30"; g.beginPath();
  if (o.talk && o.talk > 0.05) { const op = 0.15 + o.talk * 0.55; g.ellipse(hx + 0.1, eyeY + 3.05 + op * 0.3, 0.55 + (1 - o.talk) * 0.1, op * 0.55, 0, 0, 7); g.fillStyle = "#5a2020"; g.fill(); }
  else if (o.lunge || o.brace || o.shout || o.cast) { g.ellipse(hx + 0.1, eyeY + 3.05, 0.6, 0.45, 0, 0, 7); g.fillStyle = "#5a2020"; g.fill(); } else { g.moveTo(hx - 0.5, eyeY + 3.05); g.quadraticCurveTo(hx + 0.1, eyeY + 3.25, hx + 0.7, eyeY + 3); }
  g.stroke();
  if (id === "maren") { g.lineWidth = 0.18; g.strokeStyle = "rgba(90,60,50,.45)"; for (const d of [1, -1]) { const bx = hx + d * 1.8; g.beginPath(); g.moveTo(bx + d * 1.1, eyeY + 0.1); g.lineTo(bx + d * 1.6, eyeY + 0.5); g.stroke(); } g.beginPath(); g.moveTo(hx - 0.9, eyeY + 2.4); g.quadraticCurveTo(hx - 1.4, eyeY + 3, hx - 1.1, eyeY + 3.6); g.moveTo(hx + 1.1, eyeY + 2.4); g.quadraticCurveTo(hx + 1.6, eyeY + 3, hx + 1.3, eyeY + 3.6); g.stroke(); }
  const blush = b.raw ? 0 : (id === "rhea" || id === "tamsin" ? 0.12 : 0) + Math.max(0, b.warmth) * 0.1;
  if (blush > 0.01) { ell(g, hx + 2.3, eyeY + 1.9, 0.7, 0.28, `rgba(220,120,110,${blush.toFixed(3)})`); ell(g, hx - 2.2, eyeY + 1.9, 0.7, 0.28, `rgba(220,120,110,${blush.toFixed(3)})`); }
  if (b.worn > 0.4) { g.lineWidth = 0.2; g.strokeStyle = `rgba(120,70,60,${(0.25 + b.worn * 0.4).toFixed(2)})`; g.beginPath(); g.moveTo(hx + 3.1, eyeY + 0.4); g.lineTo(hx + 2.5, eyeY + 2.4); g.stroke(); }
  if (P0.style === "helm") {
    g.beginPath(); g.moveTo(hx - 5, hy - 1); g.bezierCurveTo(hx - 5.2, hy - 7.6, hx + 5.4, hy - 7.6, hx + 5.2, hy - 1); g.lineTo(hx + 6.4, hy - 0.4); g.lineTo(hx - 5.8, hy - 0.4); g.closePath(); inkPath(g, "#8e959b");
    g.save(); g.clip(); g.fillStyle = "#6a7076"; g.fillRect(hx - 6, hy - 8, 4.2, 8); g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.ellipse(hx + 1.6, hy - 5.2, 2.2, 0.6, -0.3, 0, 7); g.fill(); g.restore();
    g.fillStyle = "rgba(10,10,20,.25)"; g.fillRect(hx - 4, hy - 0.4, 8.6, 1.4);
  } else {
    g.beginPath(); g.moveTo(hx - 4.9, hy + 1.6); g.bezierCurveTo(hx - 5.6, hy - 7.6, hx + 5.8, hy - 7.8, hx + 5, hy - 0.6);
    for (const [fx, fy] of [[4.3, -1.4], [3.7, 0.1], [2.9, -1.9], [2, -0.3], [1, -2], [0, -0.6], [-1, -2.2], [-2.2, -0.6], [-3.4, -2], [-4.2, 0.6]]) g.lineTo(hx + fx, hy + fy);
    g.closePath(); inkPath(g, P0.hair, 0.45);
    g.save(); g.clip(); g.strokeStyle = P0.hairL; g.lineWidth = 0.6; g.beginPath(); g.ellipse(hx + 0.2, hy - 3.2, 3.6, 1.6, -0.15, Math.PI * 1.1, Math.PI * 1.75); g.stroke(); g.restore();
    if (P0.style === "braid") { g.beginPath(); g.moveTo(hx - 4.4, hy - 1); g.quadraticCurveTo(hx - 5.4, hy + 3, hx - 4.6, hy + 5); g.lineTo(hx - 3.6, hy + 2); g.closePath(); inkPath(g, P0.hair, 0.35); }
    if (P0.style === "bun") { g.beginPath(); g.moveTo(hx + 4.4, hy - 1); g.quadraticCurveTo(hx + 5, hy + 2.5, hx + 4.1, hy + 3.6); g.lineTo(hx + 3.9, hy); g.closePath(); inkPath(g, P0.hair, 0.35); }
  }
  g.restore();
  const hd = arm(true);
  if (P0.weapon === "staff") { const a = o.lunge ? 0 : -1.25, len = 15; limb(g, [hd[0] - Math.cos(a) * 4, hd[1] - Math.sin(a) * 4, hd[0] + Math.cos(a) * (len - 4), hd[1] + Math.sin(a) * (len - 4)], 0.7, "#8a6440"); }
  if (P0.weapon === "spear") { const a = o.lunge ? 0.15 : 0; if (o.lunge) { limb(g, [hd[0] - 6, hd[1] + 0.5, hd[0] + 9, hd[1] - 1], 0.55, "#6a5038"); g.beginPath(); g.moveTo(hd[0] + 12, hd[1] - 1.3); g.lineTo(hd[0] + 8.6, hd[1] - 2.2); g.lineTo(hd[0] + 8.6, hd[1] - 0.2); g.closePath(); inkPath(g, "#cfd6dc", 0.3); } else { limb(g, [hd[0] - 0.5, hd[1] + 5, hd[0] + 1.4 + a, hd[1] - 16], 0.55, "#6a5038"); g.beginPath(); g.moveTo(hd[0] + 1.4, hd[1] - 19); g.lineTo(hd[0] + 2.2, hd[1] - 15.8); g.lineTo(hd[0] + 0.7, hd[1] - 15.8); g.closePath(); inkPath(g, "#cfd6dc", 0.3); } }
  if (P0.weapon === "dart" && !o.brace) { g.lineWidth = 0.3; g.strokeStyle = "#a88a5a"; g.beginPath(); g.moveTo(hd[0], hd[1]); g.quadraticCurveTo(hd[0] + 2, hd[1] + 4, hd[0] + 1, hd[1] + 6); g.stroke(); g.beginPath(); g.moveTo(hd[0] + 1, hd[1] + 6); g.lineTo(hd[0] + 1.6, hd[1] + 8); g.lineTo(hd[0] + 0.4, hd[1] + 7.6); g.closePath(); inkPath(g, "#cfd6dc", 0.25); }
  g.restore();
}

/** Ash, the bonded kith: a sturdy horned grazer with a pack. Its build follows how it has been raised. */
export function drawAsh(g: CanvasRenderingContext2D, x: number, y: number, o: Pose, b: Build = EVEN): void {
  const t = o.t, gait = o.run || 0, bob = o.run ? -Math.abs(Math.sin(gait)) * 1.4 : Math.sin(t * 1.8) * 0.2 * (1 - 0.6 * Math.max(0, b.poise));
  const lift = 2.6 * b.reach, bw = 1 + 0.2 * b.bulk, bh = 1 + 0.32 * b.bulk, lw = 1.7 * (1 + 0.55 * b.brawn - 0.22 * b.reach), horn = 1 + 0.7 * b.bearing;
  g.save(); g.translate(U(x), U(y)); g.scale(K * 1.3 * (o.flip ? -1 : 1), K * 1.3);
  ell(g, 0, 0, 10, 1.6, "rgba(5,5,15,.45)");
  g.translate(0, bob); if (o.run) g.rotate(Math.sin(gait) * 0.04); if (o.lunge) g.rotate(0.12);
  const coat = b.rings ? -0.12 : 0.1 * b.warmth, body = shadeHex("#a8988a", coat), bodyS = shadeHex("#7a6c60", coat), mane = shadeHex("#e2d6c0", coat);
  const legs = (near: boolean) => { for (const [lx, ph] of [[-6, 0], [5.5, Math.PI]]) { const s = o.run ? Math.sin(gait + ph + (near ? Math.PI / 2 : 0)) : 0, n = near ? 0.6 : -0.6; limb(g, [lx * bw + n, -8 - lift, lx * bw + s * 2.2 + n, -4.2 - lift / 2, lx * bw + s * 3.5 + n, -0.6], lw, near ? body : bodyS); ell(g, lx * bw + s * 3.5 + n, -0.4, 1.1, 0.7, "#2a221c"); } };
  legs(false);
  g.save(); g.translate(0, -lift); // everything above the legs rides higher on long legs
  g.beginPath(); g.moveTo(-9, -11); g.quadraticCurveTo(-13 - Math.sin(t * 3) * 0.8, -10, -12.5, -6.5); g.quadraticCurveTo(-11, -9, -8.6, -9.8); g.closePath(); inkPath(g, mane, 0.35);
  g.beginPath(); g.ellipse(0, -10.5, 10 * bw, 4.8 * bh, 0, 0, 7); inkPath(g, body);
  g.save(); g.clip(); g.fillStyle = bodyS; g.fillRect(-11, -8.6, 22, 4); g.fillStyle = `rgba(255,255,255,${(0.18 * (1 + Math.max(-0.8, b.warmth))).toFixed(3)})`; g.beginPath(); g.ellipse(-1, -10.5 - 3.5 * bh, 7, 1.2, 0, 0, 7); g.fill();
  if (b.worn > 0.35) { g.lineWidth = 0.3; g.strokeStyle = "rgba(70,50,40,.55)"; for (const [sx, sy] of [[-4, -11], [2, -9.5], [-1, -8]].slice(0, b.worn > 0.6 ? 3 : 1)) { g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 2.2, sy + 1); g.stroke(); } }
  g.restore();
  g.beginPath(); g.roundRect(-5.5, -10.5 - 4.8 * bh - 1.9, 8, 5, 1.2); inkPath(g, "#7a5638", 0.4); g.fillStyle = "#5a3e28"; g.fillRect(-5.2, -13.6, 7.4, 1); g.lineWidth = 0.6; g.strokeStyle = "#5a3e28"; g.beginPath(); g.moveTo(-1.5, -12.2); g.lineTo(-1.5, -6.2); g.stroke(); ell(g, -1.5, -15, 0.7, 0.7, "#c9a86a");
  g.beginPath(); g.moveTo(5.6, -13.4); g.quadraticCurveTo(9, -18, 11.6, -20); g.lineTo(13.4, -17.2); g.quadraticCurveTo(10.6, -13.6, 8.6, -8.4); g.closePath(); inkPath(g, body);
  for (let i = 0; i < 5 + Math.round(2 * Math.max(0, b.warmth)); i++) { g.beginPath(); g.moveTo(5.4 + i * 1.4, -13.6 - i * 1.4); g.quadraticCurveTo(4.2 + i * 1.4, -16.6 - i * 1.3, 6.4 + i * 1.5, -15.8 - i * 1.4); g.closePath(); inkPath(g, mane, 0.3); }
  const hx = 13.4, hy = -20;
  g.beginPath(); g.moveTo(hx - 2.6, hy - 1.4); g.quadraticCurveTo(hx + 1.6, hy - 3, hx + 5.4, hy + 1.6); g.quadraticCurveTo(hx + 5.6, hy + 3.4, hx + 3.6, hy + 3.2); g.quadraticCurveTo(hx, hy + 3.4, hx - 2.4, hy + 1.8); g.closePath(); inkPath(g, body);
  ell(g, hx + 4.4, hy + 2.2, 0.5, 0.35, "#2a221c");
  for (const d of [0, 1]) { g.beginPath(); g.moveTo(hx - 0.6 + d, hy - 1.6); g.quadraticCurveTo(hx + (-4 + d + 0.6) * horn - 0.6, hy - 5.6 * horn, hx + (-6.6 + d + 0.6) * horn - 0.6, hy - 4.2 * horn); g.quadraticCurveTo(hx + (-3.6 + d) * horn, hy - 4 * horn, hx + 0.6 + d, hy - 1.4); g.closePath(); inkPath(g, d ? "#e8dfc8" : "#bcb19a", 0.3); }
  if ((o.flash ?? 0) > 0.2) { g.lineWidth = 0.3; g.strokeStyle = INK; g.beginPath(); g.moveTo(hx + 0.8, hy - 0.2); g.lineTo(hx + 2, hy - 0.3); g.stroke(); }
  else { ell(g, hx + 1.4, hy - 0.2, 0.62, 0.58, INK); ell(g, hx + 1.45, hy - 0.22, 0.45, 0.42, "#2a1e14"); ell(g, hx + 1.3, hy - 0.4, 0.12 + 0.08 * Math.max(0, b.keen), 0.12 + 0.08 * Math.max(0, b.keen), `rgba(255,255,255,${b.rings ? 0.35 : 0.8})`); }
  if (b.rings > 0) { // a wild lull clamped under the jaw, and the ring scars it leaves
    g.lineWidth = 0.25; g.strokeStyle = "rgba(120,60,60,.6)"; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(9.2 + i * 0.9, -14.6 - i * 1.2); g.lineTo(10.8 + i * 0.9, -16 - i * 1.2); g.stroke(); }
    g.beginPath(); g.ellipse(hx - 1.2, hy + 2.6, 1.5, 0.75, 0.5, 0, 7); inkPath(g, "#4a5848", 0.3); ell(g, hx - 1.6, hy + 2.3, 0.5, 0.18, "rgba(200,220,190,.35)", 0.5);
  }
  ell(g, hx - 1.6, hy - 1.6, 0.7, 1.2, bodyS, -0.6);
  g.restore();
  legs(true);
  g.restore();
}

/** The reedcat: a lean, striped prowler with tall reed ears and lamp-bright eyes. Faces left (towards the party). */
export function drawCat(g: CanvasRenderingContext2D, x: number, y: number, o: Pose, b: Build = EVEN): void {
  const t = o.t, gait = o.run || 0;
  g.save(); g.translate(U(x), U(y)); g.scale(-K * 1.25 * (o.flip ? -1 : 1), K * 1.25);
  ell(g, 0, 0, 6, 1.1, "rgba(5,5,15,.45)");
  if (o.fall) g.rotate(-o.fall * 0.5);
  const body = "#b8a868", bodyS = "#8a7c48";
  for (const [lx, ph, near] of [[-3.5, 0, 0], [3, Math.PI, 0], [-3, Math.PI / 2, 1], [3.6, Math.PI * 1.5, 1]]) { const s = o.run ? Math.sin(gait * 1.3 + ph) : 0; limb(g, [lx, -4.5, lx + s * 2, -0.4], 1, near ? body : bodyS); }
  limb(g, [-6, -5.5, -8.6 - Math.sin(t * 4) * 0.6, -9, -8, -11.6], 0.7, body);
  g.beginPath(); g.ellipse(0, -5.6, 6.2 * (1 + 0.12 * b.bulk), 2.6 * (1 + 0.22 * b.bulk), -0.05, 0, 7); inkPath(g, body, 0.4);
  g.save(); g.clip(); g.strokeStyle = bodyS; g.lineWidth = 0.7; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-4 + i * 2, -8.4); g.lineTo(-4.6 + i * 2, -5.4); g.stroke(); } g.restore();
  const hx = 6.4, hy = -7.6;
  g.beginPath(); g.moveTo(hx - 2.4, hy + 1.4); g.quadraticCurveTo(hx - 1.6, hy - 2.4, hx + 1.8, hy - 1.2); g.quadraticCurveTo(hx + 3.8, hy + 0.2, hx + 3, hy + 1.6); g.quadraticCurveTo(hx, hy + 3.2, hx - 2.4, hy + 1.4); g.closePath(); inkPath(g, body, 0.4);
  for (const d of [0, 1.4]) { g.beginPath(); g.moveTo(hx - 1.4 + d, hy - 1.4); g.lineTo(hx - 2.2 + d, hy - 7 * (1 + 0.3 * b.bearing)); g.lineTo(hx - 0.2 + d, hy - 1.6); g.closePath(); inkPath(g, d ? body : bodyS, 0.3); }
  const glow = g.createRadialGradient(hx + 1.2, hy - 0.2, 0.1, hx + 1.2, hy - 0.2, 2.4); glow.addColorStop(0, "rgba(255,240,120,.8)"); glow.addColorStop(1, "rgba(255,240,120,0)"); g.fillStyle = glow; g.fillRect(hx - 2, hy - 3, 6, 6);
  ell(g, hx + 1.2, hy - 0.2, 0.75, 0.45, "#fff6a0", -0.2); ell(g, hx + 1.35, hy - 0.2, 0.18, 0.4, INK);
  g.restore();
}

export function drawLook(g: CanvasRenderingContext2D, look: string, x: number, y: number, o: Pose, b: Build = EVEN): void {
  if (look === "ash") drawAsh(g, x, y, o, b);
  else if (look === "reedcat") drawCat(g, x, y, o, b);
  else drawFig(g, look, x, y, o, b);
}

// A hit flash: draw the figure offscreen, wash it white with source-atop, then blit. (Canvas filters were far too slow.)
const [flashCv, flashG] = makeCanvas(8, 8);
export function withFlash(g: CanvasRenderingContext2D, x: number, y: number, flash: number, draw: (gg: CanvasRenderingContext2D, xx: number, yy: number) => void): void {
  if (!(flash > 0.02)) return draw(g, x, y);
  const w = Math.ceil(U(84)), h = Math.ceil(U(76));
  if (flashCv.width !== w || flashCv.height !== h) { flashCv.width = w; flashCv.height = h; } else flashG.clearRect(0, 0, w, h);
  draw(flashG, 42, 70);
  flashG.save(); flashG.globalCompositeOperation = "source-atop"; flashG.fillStyle = `rgba(255,252,240,${Math.min(0.9, flash * 1.1)})`; flashG.fillRect(0, 0, w, h); flashG.restore();
  g.drawImage(flashCv, U(x - 42), U(y - 70));
}

// ---------------- Effects ----------------
export function ringFX(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, inner = false) { g.save(); g.lineWidth = U(inner ? 0.6 : 0.9); g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = U(3); g.beginPath(); g.ellipse(U(x), U(y), U(r), U(r * 0.62), 0, 0, 7); g.stroke(); g.restore(); }
export function sparkFX(g: CanvasRenderingContext2D, x: number, y: number, v: number, big = false) {
  g.save(); g.translate(U(x), U(y)); g.globalAlpha = 1 - v; const r = (2 + v * 9) * (big ? 1.4 : 1); g.strokeStyle = "#fff2c8"; g.lineCap = "round"; g.lineWidth = U(0.7 * (1 - v) + 0.2);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28 + 0.3; g.beginPath(); g.moveTo(Math.cos(a) * U(r * 0.4), Math.sin(a) * U(r * 0.4)); g.lineTo(Math.cos(a) * U(r), Math.sin(a) * U(r)); g.stroke(); }
  if (v < 0.3) { const fl = g.createRadialGradient(0, 0, 0, 0, 0, U(6)); fl.addColorStop(0, "rgba(255,255,240,.95)"); fl.addColorStop(1, "rgba(255,200,120,0)"); g.fillStyle = fl; g.fillRect(-U(6), -U(6), U(12), U(12)); }
  g.restore();
}
export function slashFX(g: CanvasRenderingContext2D, x: number, y: number, v: number, dir: number, big = false) {
  g.save(); g.translate(U(x), U(y - 14)); g.scale(dir, 1); g.globalAlpha = 1 - v; g.strokeStyle = "#fffbe8"; g.lineCap = "round"; g.shadowColor = "#ffe0a0"; g.shadowBlur = U(2);
  g.lineWidth = U((big ? 1.6 : 1.1) * (1 - v * 0.6)); g.beginPath(); g.arc(-U(4), U(2), U(big ? 13 : 10), -1.3 + v * 0.5, 0.2 + v * 0.9); g.stroke(); g.restore();
}
export function healFX(g: CanvasRenderingContext2D, x: number, y: number, v: number) {
  g.save(); for (let i = 0; i < 8; i++) { const a = hash2(i, 4), yy = y - 6 - v * 18 - a * 8, xx = x - 6 + hash2(4, i) * 12; g.globalAlpha = (1 - v) * 0.9; g.fillStyle = i % 2 ? "#b8f0a8" : "#e8ffd0"; g.beginPath(); g.arc(U(xx), U(yy), U(0.7 + a * 0.6), 0, 7); g.fill(); } g.restore();
}
export function smokeFX(g: CanvasRenderingContext2D, x: number, y: number, v: number) {
  g.save(); for (let i = 0; i < 9; i++) { const r = 3 + v * 7 + hash2(i, 2) * 3; g.fillStyle = `rgba(150,150,140,${0.55 * (1 - v)})`; g.beginPath(); g.arc(U(x - 8 + hash2(2, i) * 16), U(y - 6 - hash2(i, 7) * 14 - v * 4), U(r), 0, 7); g.fill(); } g.restore();
}
export function noteFX(g: CanvasRenderingContext2D, x: number, y: number, v: number) {
  g.save(); g.globalAlpha = 1 - v * v; g.fillStyle = "#ffe6a8"; g.strokeStyle = "#ffe6a8"; g.lineWidth = U(0.35); g.shadowColor = "#ffd27a"; g.shadowBlur = U(2);
  g.beginPath(); g.ellipse(U(x), U(y), U(1.3), U(0.95), -0.4, 0, 7); g.fill(); g.beginPath(); g.moveTo(U(x + 1.1), U(y - 0.3)); g.lineTo(U(x + 1.1), U(y - 5)); g.lineTo(U(x + 3), U(y - 4)); g.stroke(); g.restore();
}
export function shieldFX(g: CanvasRenderingContext2D, x: number, y: number, v: number) {
  g.save(); g.globalAlpha = 0.8 * (1 - v); g.strokeStyle = "#a8d8ff"; g.lineWidth = U(0.8); g.shadowColor = "#a8d8ff"; g.shadowBlur = U(3); g.beginPath(); g.ellipse(U(x), U(y - 16), U(10 + v * 3), U(18 + v * 3), 0, 0, 7); g.stroke(); g.restore();
}
export function textFX(g: CanvasRenderingContext2D, s: string, x: number, y: number, col: string, size = 7, alpha = 1) {
  g.save(); g.globalAlpha = alpha; g.font = `800 ${U(size)}px ${HUD_FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = U(1.2); g.strokeStyle = INK; g.strokeText(s, U(x), U(y)); g.fillStyle = col; g.fillText(s, U(x), U(y)); g.restore();
}
export function dustFX(g: CanvasRenderingContext2D, x: number, y: number, v: number) { for (let i = 0; i < 5; i++) { const r = 1 + v * 3 + hash2(i, 9) * 1.5; g.fillStyle = `rgba(170,165,150,${0.35 * (1 - v)})`; g.beginPath(); g.arc(U(x - i * 2.5 - v * 3), U(y - 1 - hash2(9, i) * 2 - v * 2), U(r), 0, 7); g.fill(); } }
export function projFX(g: CanvasRenderingContext2D, type: string, x: number, y: number, ang: number) {
  g.save(); g.translate(U(x), U(y)); g.rotate(ang);
  if (type === "arrow") { g.lineCap = "round"; g.strokeStyle = "#e8e0d0"; g.lineWidth = U(0.45); g.beginPath(); g.moveTo(-U(9), 0); g.lineTo(0, 0); g.stroke(); g.fillStyle = "#cfd6dc"; g.beginPath(); g.moveTo(U(1.6), 0); g.lineTo(-U(0.4), -U(0.8)); g.lineTo(-U(0.4), U(0.8)); g.closePath(); g.fill(); g.fillStyle = "#b05040"; g.fillRect(-U(9.6), -U(0.9), U(1.6), U(0.6)); g.fillRect(-U(9.6), U(0.3), U(1.6), U(0.6)); }
  else if (type === "pot") { ell(g, 0, 0, U(1.6), U(1.6), INK); ell(g, 0, 0, U(1.2), U(1.2), "#8a7a5a"); ell(g, -U(0.4), -U(0.4), U(0.4), U(0.4), "#c8b890"); }
  else { ell(g, 0, 0, U(1.1), U(1.1), INK); ell(g, 0, 0, U(0.8), U(0.8), "#9a9488"); g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = U(0.4); g.beginPath(); g.moveTo(-U(1.4), 0); g.lineTo(-U(7), 0); g.stroke(); }
  g.restore();
}
export function barFX(g: CanvasRenderingContext2D, x: number, y: number, w: number, v: number, col: string, h = 1.6) {
  g.fillStyle = "rgba(10,8,16,.75)"; g.beginPath(); g.roundRect(U(x - 0.5), U(y - 0.5), U(w + 1), U(h + 1), U(1)); g.fill();
  const ww = Math.max(0, w * clamp(v)); if (ww <= 0) return; g.fillStyle = col; g.beginPath(); g.roundRect(U(x), U(y), U(ww), U(h), U(0.8)); g.fill();
}
export function intentFX(g: CanvasRenderingContext2D, kind: string, x: number, y: number, col: string) {
  g.save(); g.translate(U(x), U(y)); g.fillStyle = "rgba(14,10,20,.8)"; g.strokeStyle = col; g.lineWidth = U(0.4); g.beginPath(); g.arc(0, 0, U(3.2), 0, 7); g.fill(); g.stroke();
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = U(0.55); g.lineCap = "round"; g.beginPath();
  if (kind === "sword") { g.moveTo(-U(1.6), U(1.6)); g.lineTo(U(1.6), -U(1.6)); g.moveTo(-U(1.8), U(0.4)); g.lineTo(-U(0.4), U(1.8)); }
  else if (kind === "arrow") { g.moveTo(-U(1.8), 0); g.lineTo(U(1.8), 0); g.moveTo(-U(1.8), 0); g.lineTo(-U(0.6), -U(1)); g.moveTo(-U(1.8), 0); g.lineTo(-U(0.6), U(1)); }
  else if (kind === "paw") { g.arc(0, U(0.7), U(1), 0, 7); g.fill(); g.beginPath(); for (const a of [-1.2, -0.4, 0.4, 1.2]) { const cx = Math.sin(a) * U(1.9), cy = -U(0.6) - Math.cos(a) * U(0.6); g.moveTo(cx + U(0.45), cy); g.arc(cx, cy, U(0.45), 0, 7); } g.fill(); g.beginPath(); }
  else if (kind === "aim") { g.arc(0, 0, U(1.5), 0, 7); g.moveTo(-U(2.6), 0); g.lineTo(-U(0.9), 0); g.moveTo(U(0.9), 0); g.lineTo(U(2.6), 0); g.moveTo(0, -U(2.6)); g.lineTo(0, -U(0.9)); g.moveTo(0, U(0.9)); g.lineTo(0, U(2.6)); }
  else if (kind === "smoke") { g.arc(-U(0.8), U(0.3), U(1), 0, 7); g.moveTo(U(1.8), 0); g.arc(U(0.8), 0, U(1), 0, 7); }
  g.stroke(); g.restore();
}
/** The small bouncing arrow over whoever's turn it is, or over the target being chosen. */
export function markerFX(g: CanvasRenderingContext2D, x: number, y: number, col = "#ffe39a") {
  g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = U(0.4); g.beginPath(); g.moveTo(U(x - 2), U(y)); g.lineTo(U(x + 2), U(y)); g.lineTo(U(x), U(y + 2.4)); g.closePath(); g.fill(); g.stroke();
}
