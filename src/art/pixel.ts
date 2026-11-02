// Pixel-art helpers: deterministic noise, ordered dithering, and sprites written as rows of palette letters.
import { Texture } from "pixi.js";

export const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

export function hash2(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!; g.imageSmoothingEnabled = false;
  return [c, g];
}

export function px(g: CanvasRenderingContext2D, x: number, y: number, col: string, w = 1, h = 1): void { g.fillStyle = col; g.fillRect(x | 0, y | 0, w, h); }

/** Fill a rect choosing along a colour ramp by fn(x, y) in 0..1, with 4x4 ordered dithering. */
export function dither(g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, ramp: string[], fn: (x: number, y: number) => number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const v = Math.max(0, Math.min(1, fn(x, y))) * (ramp.length - 1), i = Math.floor(v), f = v - i;
    px(g, x, y, ramp[Math.min(ramp.length - 1, f > (BAYER4[y & 3][x & 3] + 0.5) / 16 ? i + 1 : i)]);
  }
}

/** Draw a sprite written as rows of letters; '.' is transparent. */
export function drawRows(g: CanvasRenderingContext2D, rows: string[], pal: Record<string, string>, x: number, y: number, flip = false): void {
  const w = Math.max(...rows.map((r) => r.length));
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = pal[r[i]]; if (c) px(g, flip ? x + (w - 1 - i) : x + i, y + j, c); } });
}

export function pixelTexture(c: HTMLCanvasElement): Texture {
  const t = Texture.from(c);
  t.source.scaleMode = "nearest";
  return t;
}
