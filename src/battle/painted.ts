// Painted battle figures: a full-body painting (background cut away) brought to life in code. The picture is
// cut into a grid of small cells and each cell is nudged by a smooth "rig" field before it is drawn, so the
// figure breathes, sways with its feet planted, leans into a strike, squashes on a brace, swings its hair or
// tail and scissors its legs when it runs. Listed in public/battle/index.json as
//   { "rhea": { "file": "rhea.png", "rig": "person", "h": 51 } }
// where h is the height in stage units. A look with no painting falls back to the drawn figure.
import type { Pose } from "./art";

export type Rig = "person" | "beast";
interface Painted { img: HTMLImageElement; rig: Rig; h: number; }
const painted: Record<string, Painted> = {};

export async function loadBattleArt(base = "battle/"): Promise<void> {
  let index: Record<string, { file: string; rig: Rig; h: number }> = {};
  try { const r = await fetch(base + "index.json"); if (r.ok) index = await r.json(); } catch { return; }
  await Promise.all(Object.entries(index).map(([id, e]) => new Promise<void>((res) => {
    const img = new Image();
    img.onload = () => { painted[id] = { img, rig: e.rig, h: e.h }; res(); };
    img.onerror = () => res();
    img.src = base + e.file;
  })));
}

export const hasPaintedFig = (look: string): boolean => look in painted;

/** A painting recoloured towards a coat colour (for kith with no painting of their own), made once and kept. */
const tinted: Record<string, HTMLCanvasElement> = {};
function tintedImage(key: string, coat: string): CanvasImageSource {
  const id = key + coat;
  if (tinted[id]) return tinted[id];
  const img = painted[key].img, cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
  const g = cv.getContext("2d")!;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "color"; g.globalAlpha = 0.75; g.fillStyle = coat; g.fillRect(0, 0, cv.width, cv.height);
  g.globalCompositeOperation = "destination-in"; g.globalAlpha = 1; g.drawImage(img, 0, 0);
  return (tinted[id] = cv);
}

/**
 * What to paint a battle unit as: its own look when that has a painting, else its species' painting, else its
 * family's painting recoloured to its coat ("reedcat:#d8d6d0"); undefined when there is none.
 */
export function paintedLook(look: string, species?: string): string | undefined {
  const [kind, coat] = look.split(":");
  if (!coat && kind in painted) return kind;
  if (species && species in painted) return species;
  if (kind in painted) return look;
  return undefined;
}
export const paintedHeight = (look: string): number | undefined => painted[look]?.h;

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bump = (a: number, b: number, x: number) => smooth(a, (a + b) / 2, x) * (1 - smooth((a + b) / 2, b, x));

/**
 * How far the point (u, v) of the picture moves, as fractions of the figure's height. u runs 0..1 from the
 * back (left) to the front (right); v runs 0..1 from the feet up.
 */
function field(rig: Rig, u: number, v: number, o: Pose, lean: number): [number, number] {
  const t = o.t, run = o.run ? Math.sin(o.run) : 0;
  let dx = 0, dy = 0;
  if (rig === "person") {
    const w = smooth(0.04, 0.5, v); // feet stay planted; the body above them moves
    dx += w * (Math.sin(t * 1.3) * 0.006 + lean * v);
    dy -= smooth(0.45, 1, v) * Math.sin(t * 2.2) * 0.008; // breath lifts the chest and shoulders
    dx += smooth(0.8, 1, v) * Math.sin(t * 1.1 + 0.6) * 0.004; // the head settles on its own beat
    // the braid and loose hair trail behind, a beat late
    const hair = (1 - smooth(0.3, 0.48, u)) * bump(0.5, 0.95, v);
    dx += hair * (Math.sin(t * 2.4 - v * 4) * 0.007 - (o.run ? 0.02 : 0) - lean * 0.15);
    // running: the legs scissor; the body bobs
    if (o.run) { const legs = 1 - smooth(0.08, 0.45, v); dx += legs * run * 0.05 * (u < 0.5 ? -1 : 1); dy += legs * Math.abs(run) * 0.01 * (u < 0.5 ? 1 : -1); }
    // a brace: knees give, the body sinks and squares up
    if (o.brace) dy += smooth(0.1, 0.6, v) * 0.03 * v;
  } else {
    const w = smooth(0.03, 0.4, v);
    dx += w * (Math.sin(t * 1.1) * 0.004 + lean * v);
    // the barrel swells with each breath
    const barrel = bump(0.12, 0.85, u) * bump(0.35, 0.8, v);
    dy -= barrel * Math.sin(t * 1.8) * 0.012 * (v - 0.55) * 2;
    // the tail swishes
    const tail = (1 - smooth(0.06, 0.24, u)) * bump(0.3, 1.05, v);
    dy += tail * Math.sin(t * 3.1) * 0.022; dx += tail * Math.cos(t * 3.1) * 0.015 - tail * (o.run ? 0.03 : 0);
    // the head and neck nod and look about
    const head = smooth(0.6, 0.95, u) * smooth(0.55, 0.95, v);
    dy += head * (Math.sin(t * 1.4) * 0.018 + (o.lunge ? 0.06 : 0) - (o.brace ? 0.04 : 0)); dx += head * Math.sin(t * 0.7) * 0.01;
    // the mane spines ripple
    const mane = bump(0.5, 0.82, u) * bump(0.6, 0.9, v);
    dx += mane * Math.sin(t * 4 - u * 9) * 0.006;
    if (o.run) { // front and back legs swing in turn
      const legs = 1 - smooth(0.05, 0.42, v), ph = u > 0.5 ? 0 : Math.PI;
      dx += legs * Math.sin(o.run + ph + (u % 0.5 > 0.25 ? Math.PI / 2 : 0)) * 0.05;
    }
  }
  return [dx, dy];
}

const COLS = 12, ROWS = 18;

/** Draws painted figure `look` with its feet at (x, y) in stage units, facing right unless flipped. */
export function drawPainted(g: CanvasRenderingContext2D, look: string, x: number, y: number, o: Pose, K: number, coat?: string): void {
  const p = painted[look]; if (!p) return;
  const { rig } = p, img = coat ? tintedImage(look, coat) : p.img, iw = p.img.width, ih = p.img.height, H = p.h * K, W = H * iw / ih;
  const flash = o.flash ?? 0;
  const lean = (o.lunge ? 0.16 : 0) + (o.run ? 0.07 : 0) - (o.brace ? 0.05 : 0) - flash * 0.08;
  const squash = o.brace ? 0.95 : 1;
  g.save();
  g.translate(x * K, y * K);
  if (o.flip) g.scale(-1, 1);
  // ground shadow
  g.fillStyle = "rgba(5,5,15,.45)"; g.beginPath(); g.ellipse(0, 0, W * (rig === "beast" ? 0.42 : 0.3), H * 0.03, 0, 0, 7); g.fill();
  if (o.fall) { g.rotate(-o.fall * 1.45); g.globalAlpha *= 1 - o.fall * 0.25; }
  const bob = o.run ? -Math.abs(Math.cos(o.run)) * 0.02 : 0;
  g.translate((o.lunge ? 0.06 : 0) * H - flash * 0.03 * H, bob * H);
  g.scale(1, squash);
  const sw = iw / COLS, sh = ih / ROWS, cw = W / COLS, ch = H / ROWS;
  for (let r = 0; r < ROWS; r++) {
    const v = 1 - (r + 0.5) / ROWS;
    for (let c = 0; c < COLS; c++) {
      const u = (c + 0.5) / COLS, [dx, dy] = field(rig, u, v, o, lean);
      // cells overlap by a hair so no seams show between neighbours that moved apart
      g.drawImage(img, c * sw, r * sh, sw, sh, -W / 2 + c * cw + dx * H - 0.5, -H + r * ch + dy * H - 0.5, cw + 1, ch + 1);
    }
  }
  g.restore();
}
