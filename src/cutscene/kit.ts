// The cut scenes' paint box: skies, ridges, the cloud sea, terraces, houses, fire, smoke, fog, lamps, falling
// ash and embers, figures (the same painted and drawn people as in battle) and portrait close-ups cut out of
// their plain backgrounds. Everything draws in a 320 x 180 world, so a scene reads the same at any size.
import { drawLook, setScale, type Pose } from "../battle/art";
import { portraitImage } from "../art/portraits";

export const VW = 320, VH = 180;
export type G = CanvasRenderingContext2D;

/** A steady pseudo-random number in 0..1 for (a, b). */
export const rnd = (a: number, b = 0): number => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
export const smooth = (a: number, b: number, x: number): number => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// ------------------------------------------------------------------ sky and land
export function sky(g: G, stops: [number, string][], y0 = -60, y1 = VH + 20): void {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr; g.fillRect(-200, y0 - 200, VW + 400, y1 - y0 + 400);
}
export function stars(g: G, n: number, t: number, alpha = 1, maxY = 110): void {
  for (let i = 0; i < n; i++) {
    const x = rnd(i, 1) * (VW + 120) - 60, y = rnd(i, 2) * maxY - 50, tw = 0.6 + 0.4 * Math.sin(t * (1 + rnd(i, 3) * 2) + i);
    g.fillStyle = `rgba(255,248,226,${alpha * tw * (0.35 + rnd(i, 4) * 0.65)})`;
    const r = rnd(i, 5) > 0.93 ? 0.7 : 0.35; g.fillRect(x, y, r, r);
  }
}
/** A sun or moon with a soft halo. */
export function orb(g: G, x: number, y: number, r: number, core: string, halo: string, haloR = r * 6): void {
  const h = g.createRadialGradient(x, y, r * 0.5, x, y, haloR); h.addColorStop(0, halo); h.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = h; g.fillRect(x - haloR, y - haloR, haloR * 2, haloR * 2);
  g.fillStyle = core; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
}
/** A mountain ridge from x -120 to 440, filled to the bottom, with a lit rim along its top. */
export function ridge(g: G, seed: number, base: number, amp: number, top: string, bottom: string, rim?: string, jag = 1): void {
  const pts: [number, number][] = [];
  for (let x = -140; x <= VW + 140; x += 2) {
    const y = base - amp * (Math.sin(x * 0.021 + seed) * 0.5 + Math.sin(x * 0.053 + seed * 2.3) * 0.3 * jag + Math.sin(x * 0.13 + seed * 5.1) * 0.12 * jag + (rnd(Math.floor(x / 6), seed) - 0.5) * 0.08 * jag);
    pts.push([x, y]);
  }
  const gr = g.createLinearGradient(0, base - amp, 0, VH + 40); gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.beginPath(); g.moveTo(-140, VH + 200); for (const [x, y] of pts) g.lineTo(x, y); g.lineTo(VW + 140, VH + 200); g.closePath(); g.fill();
  if (rim) { g.strokeStyle = rim; g.lineWidth = 0.6; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
}
/** Value noise in 0..1 (smooth, tiling every `per` cells across). */
function vnoise(x: number, y: number, per: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (a: number, b: number) => rnd(((a % per) + per) % per, b);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}
const cloudCache: Record<string, HTMLCanvasElement> = {};
/** A strip of billowing cloud tops (tiles across), lit from above: made once per colouring and kept. */
function cloudStrip(lit: string, shade: string): HTMLCanvasElement {
  const key = lit + shade; if (cloudCache[key]) return cloudCache[key];
  const W = 512, H = 96, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d")!, im = c.createImageData(W, H), L = rgb(lit), S = rgb(shade);
  const fbm = (x: number, y: number) => { let a = 0, amp = 0.55, f = 1; for (let o = 0; o < 4; o++) { a += vnoise(x * f, y * f, 16 * f) * amp; amp *= 0.5; f *= 2; } return a; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = (x / W) * 16, ny = (y / H) * 3, n = fbm(nx, ny), up = fbm(nx, ny - 0.12);
    const edge = n - 0.36 - (1 - y / H) * 0.22; // thinner toward the top: the billows' tops
    const a = Math.max(0, Math.min(1, edge * 6)), light = Math.max(0, Math.min(1, 0.55 + (n - up) * 5 + (1 - y / H) * 0.3));
    const p = (y * W + x) * 4;
    im.data[p] = S[0] + (L[0] - S[0]) * light; im.data[p + 1] = S[1] + (L[1] - S[1]) * light; im.data[p + 2] = S[2] + (L[2] - S[2]) * light; im.data[p + 3] = a * 255;
  }
  c.putImageData(im, 0, 0);
  return (cloudCache[key] = cv);
}
function rgb(col: string): [number, number, number] {
  if (col.startsWith("#")) { const n = parseInt(col.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  const m = col.match(/\d+/g) ?? ["0", "0", "0"]; return [+m[0], +m[1], +m[2]];
}
/** The cloud sea: a soft surface with rows of billows drifting across it, lit on top. */
export function cloudSea(g: G, y: number, t: number, lit: string, shade: string, rows = 4, drift = 2): void {
  const base = g.createLinearGradient(0, y - 4, 0, VH + 30); base.addColorStop(0, lit); base.addColorStop(0.3, shade); base.addColorStop(1, shade);
  g.fillStyle = base; g.fillRect(-200, y, VW + 400, VH + 200);
  const strip = cloudStrip(lit, shade);
  g.imageSmoothingEnabled = true;
  for (let r = 0; r < rows; r++) {
    const sc = 0.35 + r * 0.32, w = strip.width * sc, h = strip.height * sc * 0.7, yy = y - h * 0.55 + r * (5 + r * 6), off = ((t * drift * (0.5 + r * 0.4) + r * 137) % w);
    for (let x = -200 - off; x < VW + 200; x += w) g.drawImage(strip, x, yy, w + 1, h);
  }
}
/** A band of haze (light caught in the air between ridges). */
export function haze(g: G, y: number, h: number, col: string): void {
  const gr = g.createLinearGradient(0, y - h, 0, y + h); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, col); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(-200, y - h, VW + 400, h * 2);
}
/** Shafts of light fanning out from a point (low sun through cloud). */
export function rays(g: G, x: number, y: number, t: number, col: string, n = 9, len = 260): void {
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.55 + (i / n) * 0.9) + Math.sin(t * 0.3 + i) * 0.02, w = 0.03 + rnd(i, 4) * 0.05;
    const gr = g.createRadialGradient(x, y, 0, x, y, len); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = 0.25 + 0.2 * Math.sin(t * 0.6 + i * 1.7);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a - w) * len, y + Math.sin(a - w) * len); g.lineTo(x + Math.cos(a + w) * len, y + Math.sin(a + w) * len); g.fill();
  }
  g.restore();
}
/** The height of a hill at x: rises from the left to a shoulder at `peak`, falls away to the right. */
export const hillY = (x: number, base: number, peak: [number, number]): number => {
  const [px, py] = peak, k = x < px ? smooth(px - 220, px, x) : 1 - smooth(px, px + 90, x) * 0.55;
  return base - (base - py) * k + Math.sin(x * 0.09) * 1.5;
};
/** Terraces cut into the hill: curved rows of moss beds with stone lips, following the slope. */
export function terraces(g: G, base: number, peak: [number, number], rows: number, x0: number, x1: number, moss: string, wall: string, burnt = false): void {
  for (let r = 0; r < rows; r++) {
    const step = (base - peak[1]) / (rows + 1), yTop = base - step * (r + 1);
    let a = x0, b = Math.min(x1, peak[0] + 34 - r * 3 + rnd(r, 5) * 10);
    while (a < b && hillY(a, base, peak) > yTop) a += 2;
    if (b - a < 8) continue;
    const bow = (x: number) => -Math.sin(((x - a) / (b - a)) * Math.PI) * step * 0.35;
    const edge = (x: number) => yTop + bow(x) + Math.sin(x * 0.2 + r) * 0.4;
    const gr = g.createLinearGradient(0, yTop - step * 0.4, 0, yTop + step); gr.addColorStop(0, burnt ? "#2a2522" : shade(moss, 0.12)); gr.addColorStop(1, burnt ? "#151110" : shade(moss, -0.35));
    g.fillStyle = gr; g.beginPath(); g.moveTo(a, yTop + step);
    for (let x = a; x <= b; x += 2) g.lineTo(x, edge(x));
    g.lineTo(b + 3, yTop + step * 0.6); g.lineTo(b, yTop + step); g.closePath(); g.fill();
    g.strokeStyle = wall; g.lineWidth = 1.3; g.beginPath(); for (let x = a; x <= b; x += 2) { const y = edge(x) + step - 0.6 + bow(x) * -0.2; if (x === a) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
    g.strokeStyle = burnt ? "rgba(255,150,90,.18)" : "rgba(255,240,200,.35)"; g.lineWidth = 0.45; g.beginPath(); for (let x = a; x <= b; x += 2) (x === a ? g.moveTo(x, edge(x)) : g.lineTo(x, edge(x))); g.stroke();
    for (let k = 0; k < (b - a) / 3.5; k++) {
      const px = a + 2 + k * 3.5 + rnd(k, r) * 2, py = edge(px) + 1 + rnd(r, k) * (step - 3);
      g.fillStyle = burnt ? `rgba(80,72,66,${0.4 + rnd(k, r + 3) * 0.4})` : shade(moss, 0.1 + rnd(k, r) * 0.3); g.fillRect(px, py, 1.2, 0.8);
    }
  }
}
/** Mixes a #rrggbb colour toward white (amt > 0) or black (amt < 0). */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16), f = (c: number) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
export interface House { x: number; y: number; w: number; h: number; roof?: number; }
/** Houses: lit windows and chimney smoke, or blackened frames when burnt. */
export function houses(g: G, list: House[], t: number, wall: string, roof: string, lit = 0, burnt = false): void {
  for (const [i, hs] of list.entries()) {
    const rh = hs.roof ?? hs.h * 0.8;
    if (burnt) {
      g.strokeStyle = "#140f0d"; g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(hs.x, hs.y); g.lineTo(hs.x, hs.y - hs.h); g.lineTo(hs.x + hs.w / 2, hs.y - hs.h - rh * 0.8); g.lineTo(hs.x + hs.w, hs.y - hs.h); g.lineTo(hs.x + hs.w, hs.y);
      g.moveTo(hs.x + hs.w * 0.3, hs.y - hs.h - rh * 0.3); g.lineTo(hs.x + hs.w * 0.7, hs.y - hs.h - rh * 0.3); g.stroke();
      g.fillStyle = "#1c1614"; g.fillRect(hs.x, hs.y - hs.h * 0.45, hs.w, hs.h * 0.45);
      continue;
    }
    g.fillStyle = wall; g.fillRect(hs.x, hs.y - hs.h, hs.w, hs.h);
    g.fillStyle = roof; g.beginPath(); g.moveTo(hs.x - 1.5, hs.y - hs.h); g.lineTo(hs.x + hs.w / 2, hs.y - hs.h - rh); g.lineTo(hs.x + hs.w + 1.5, hs.y - hs.h); g.fill();
    if (lit > 0) {
      const wx = hs.x + hs.w * 0.3, wy = hs.y - hs.h * 0.6, flick = 0.85 + Math.sin(t * 7 + i) * 0.08;
      glow(g, wx + 1, wy + 1, 6, `rgba(255,190,110,${0.35 * lit * flick})`);
      g.fillStyle = `rgba(255,${200 + i % 3 * 10},120,${lit * flick})`; g.fillRect(wx, wy, 2, 2);
    }
  }
}
export function glow(g: G, x: number, y: number, r: number, col: string): void {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

// ------------------------------------------------------------------ weather and fire
/** Flames along a line from x0 to x1 at ground y, up to `h` tall, with a glow behind. */
export function fire(g: G, x0: number, x1: number, y: number, h: number, t: number, heat = 1): void {
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, (x0 + x1) / 2, y - h * 0.4, Math.max(h * 2.2, (x1 - x0) * 0.75), `rgba(255,110,30,${0.3 * heat})`);
  const n = Math.max(2, Math.round((x1 - x0) / 7));
  for (const core of [false, true]) for (let i = 0; i < n; i++) {
    const x = x0 + (i + rnd(i, 9) * 0.6) * (x1 - x0) / n, ph = t * (3 + rnd(i, 7) * 3) + i * 1.7;
    const tall = (0.35 + rnd(i, 2) * 0.65) * (0.75 + 0.25 * Math.sin(ph) + 0.12 * Math.sin(ph * 2.7 + 1));
    const fh = h * tall * heat * (core ? 0.5 : 1), fw = ((x1 - x0) / n) * (core ? 1.4 : 2.6) * (0.7 + rnd(i, 3) * 0.6);
    const sway = Math.sin(ph * 0.8) * fw * 0.35, tip = Math.sin(ph * 1.3) * fw * 0.25;
    const gr = g.createLinearGradient(0, y, 0, y - fh);
    if (core) { gr.addColorStop(0, "rgba(255,250,220,0.9)"); gr.addColorStop(0.5, "rgba(255,210,120,0.6)"); gr.addColorStop(1, "rgba(255,160,60,0)"); }
    else { gr.addColorStop(0, "rgba(255,190,80,0.55)"); gr.addColorStop(0.4, "rgba(240,100,30,0.45)"); gr.addColorStop(0.8, "rgba(160,40,15,0.25)"); gr.addColorStop(1, "rgba(80,10,5,0)"); }
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - fw / 2, y);
    g.bezierCurveTo(x - fw * 0.55, y - fh * 0.45, x + sway - fw * 0.2, y - fh * 0.7, x + sway + tip, y - fh);
    g.bezierCurveTo(x + sway + fw * 0.2, y - fh * 0.7, x + fw * 0.55, y - fh * 0.45, x + fw / 2, y); g.fill();
  }
  g.restore();
}
/** Embers rising out of a band, drifting. */
export function embers(g: G, n: number, t: number, x0: number, x1: number, yBottom: number, rise = 90, wind = 8): void {
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const life = 3 + rnd(i, 3) * 3, age = (t + rnd(i, 4) * life) % life, a = age / life;
    const x = x0 + rnd(i, 1) * (x1 - x0) + Math.sin(age * 2 + i) * 3 + wind * a, y = yBottom - a * rise;
    g.fillStyle = `rgba(255,${150 + (i % 5) * 18},60,${(1 - a) * 0.9})`; g.fillRect(x, y, 0.8, 0.8);
  }
  g.restore();
}
/** Plumes of smoke rising from points, spreading and leaning with the wind. */
export function smoke(g: G, at: [number, number][], t: number, col: [number, number, number], alpha = 0.5, height = 120): void {
  for (const [k, [sx, sy]] of at.entries()) for (let i = 0; i < 22; i++) {
    const life = 9, age = (t * 0.8 + i * life / 22 + k * 1.3) % life, a = age / life, r = 3 + a * height * 0.28;
    const x = sx + Math.sin(age * 0.6 + k + i) * (2 + a * 6) + a * a * height * 0.35, y = sy - a * height;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.55 * Math.sin(Math.min(1, a * 1.4) * Math.PI * 0.9 + 0.1)})`); gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
/** Bands of fog drifting across. */
export function fog(g: G, t: number, y0: number, y1: number, col: string, alpha = 0.5, speed = 4): void {
  for (let i = 0; i < 14; i++) {
    const y = y0 + rnd(i, 8) * (y1 - y0), span = VW + 300, x = ((rnd(i, 9) * span + t * speed * (0.5 + rnd(i, 1))) % span) - 150, w = 60 + rnd(i, 2) * 90, h = 6 + rnd(i, 3) * 10;
    const gr = g.createRadialGradient(x, y, 0, x, y, w / 2);
    gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.scale(1, h / w); g.translate(-x, -y); g.fillStyle = gr; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
}
/** Falling flakes (ash or snow), seen through the whole frame. */
export function flakes(g: G, n: number, t: number, col: string, speed = 10, size = 0.8, wind = 4): void {
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const s = speed * (0.6 + rnd(i, 2) * 0.8), y = ((rnd(i, 1) * (VH + 40) + t * s) % (VH + 40)) - 20 - 20;
    const x = ((rnd(i, 3) * (VW + 80) + t * wind + Math.sin(t + i) * 3) % (VW + 80)) - 40;
    g.globalAlpha = 0.4 + rnd(i, 4) * 0.6; g.fillRect(x, y, size, size);
  }
  g.globalAlpha = 1;
}
/** Speed lines streaming toward or away from a point (anime-style focus lines). */
export function focusLines(g: G, cx: number, cy: number, t: number, col: string, n = 60, inner = 40): void {
  g.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    const a = rnd(i, 1) * Math.PI * 2, j = (t * 6 + rnd(i, 2)) % 1, r0 = inner + rnd(i, 3) * 30 + j * 10, r1 = r0 + 60 + rnd(i, 4) * 120;
    g.lineWidth = 0.3 + rnd(i, 5) * 1.2; g.globalAlpha = 0.3 + rnd(i, 6) * 0.5;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
  }
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------ people and faces
/** Draws a battle look at full resolution wherever the current transform puts (x, y), `scale` x battle size.
 *  (Painted figures are drawn cell by cell; drawing them small and scaling the canvas up would show the cells.) */
export function drawLookAt(g: G, look: string, x: number, y: number, scale: number, pose: Partial<Pose> & { t: number }): void {
  const m = g.getTransform(), k = Math.hypot(m.a, m.b) * scale, p = m.transformPoint(new DOMPoint(x, y));
  g.save(); g.setTransform(1, 0, 0, 1, p.x, p.y); setScale(k); drawLook(g, look, 0, 0, pose as Pose); g.restore(); setScale(1);
}
/** A figure (painted if they have a painting, else the drawn rig), feet at (x, y), `scale` x battle size. */
export function figure(g: G, look: string, x: number, y: number, scale: number, pose: Partial<Pose> & { t: number }, opts: { tint?: string; tintAmt?: number; alpha?: number } = {}): void {
  if (!opts.tint) { g.save(); if (opts.alpha !== undefined) g.globalAlpha = opts.alpha; drawLookAt(g, look, x, y, scale, pose); g.restore(); return; }
  // a tinted figure (silhouette against fire, cold under the moon): drawn offscreen at full size, then coloured
  const m = g.getTransform(), k = Math.hypot(m.a, m.b) * scale, w = Math.ceil(110 * k), h = Math.ceil(90 * k);
  if (w < 2 || h < 2) return;
  if (!tintCv) { tintCv = document.createElement("canvas"); tintCv.width = 4; tintCv.height = 4; tg = tintCv.getContext("2d")!; }
  if (tintCv.width < w || tintCv.height < h) { tintCv.width = Math.max(w, tintCv.width); tintCv.height = Math.max(h, tintCv.height); }
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, tintCv.width, tintCv.height);
  tg.setTransform(1, 0, 0, 1, w / 2, h - 6 * k); setScale(k); drawLook(tg, look, 0, 0, pose as Pose); setScale(1);
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = "source-atop"; tg.globalAlpha = opts.tintAmt ?? 1; tg.fillStyle = opts.tint; tg.fillRect(0, 0, w, h);
  tg.globalCompositeOperation = "source-over"; tg.globalAlpha = 1;
  g.save(); if (opts.alpha !== undefined) g.globalAlpha = opts.alpha;
  g.translate(x, y); g.scale(scale / k, scale / k); g.drawImage(tintCv, 0, 0, w, h, -w / 2, -(h - 6 * k), w, h); g.restore();
}
let tintCv: HTMLCanvasElement, tg: CanvasRenderingContext2D;

/** A portrait with its plain backdrop cut away (flood-filled from the edges), made once and kept. */
const cut: Record<string, HTMLCanvasElement | null> = {};
export function portraitCut(id: string): HTMLCanvasElement | null {
  if (id in cut) return cut[id];
  const im = portraitImage(id);
  if (!im || !im.width) return null;
  const w = im.width, h = im.height, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d", { willReadFrequently: true })!; c.drawImage(im, 0, 0);
  let data: ImageData;
  try { data = c.getImageData(0, 0, w, h); } catch { return (cut[id] = cv); }
  const d = data.data, seen = new Uint8Array(w * h), stack: number[] = [];
  const at = (i: number) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
  const [br, bg, bb] = at(2 * w + 2);
  const near = (i: number) => { const p = i * 4; return Math.abs(d[p] - br) + Math.abs(d[p + 1] - bg) + Math.abs(d[p + 2] - bb) < 42; };
  for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i] || !near(i)) continue;
    seen[i] = 1; d[i * 4 + 3] = 0;
    const x = i % w;
    if (x > 0) stack.push(i - 1); if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w); if (i < w * (h - 1)) stack.push(i + w);
  }
  // soften the cut edge a little
  for (let i = 0; i < w * h; i++) if (!seen[i] && ((i % w > 0 && seen[i - 1]) || (i % w < w - 1 && seen[i + 1]) || seen[i - w] || seen[i + w])) d[i * 4 + 3] = 150;
  c.putImageData(data, 0, 0);
  return (cut[id] = cv);
}

export interface FaceOpts { /** 0..1 where the eyes sit down the painting */ eyeY?: number; light?: string; lightAmt?: number; rim?: string; dark?: number; }
/** A close-up of a face, centred on the eyes at (cx, cy), `size` world units across the painting. */
export function face(g: G, id: string, cx: number, cy: number, size: number, o: FaceOpts = {}): boolean {
  const cv = lit(id, o); if (!cv) return false;
  const eye = o.eyeY ?? 0.33;
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(cv, cx - size / 2, cy - size * eye, size, size);
  g.restore();
  return true;
}
/** The cut-out portrait darkened and washed with a coloured key light (on the figure only), made once and kept. */
const litCache: Record<string, HTMLCanvasElement> = {};
function lit(id: string, o: FaceOpts): HTMLCanvasElement | null {
  const src = portraitCut(id); if (!src) return null;
  if (!o.dark && !o.light) return src;
  const key = `${id}|${o.dark ?? 0}|${o.light ?? ""}|${o.lightAmt ?? 0.5}`;
  if (litCache[key]) return litCache[key];
  const w = src.width, h = src.height, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d")!; c.drawImage(src, 0, 0); c.globalCompositeOperation = "source-atop";
  if (o.dark) { c.fillStyle = `rgba(6,6,12,${o.dark})`; c.fillRect(0, 0, w, h); }
  if (o.light) { const gr = c.createLinearGradient(0, 0, w, h * 0.6); gr.addColorStop(0, o.light); gr.addColorStop(1, "rgba(0,0,0,0)"); c.globalAlpha = o.lightAmt ?? 0.5; c.fillStyle = gr; c.fillRect(0, 0, w, h); }
  return (litCache[key] = cv);
}
