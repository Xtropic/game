// Dialogue portraits: a close-up bust of the same HD cel-shaded figure used in battle, so a character looks
// the same in both places. The mouth follows the recorded voice, eyes blink, the bust breathes.
// Painted art replaces the drawn bust per character: list it in public/portraits/index.json as
// { "rhea": ["rhea.jpg", "rhea-open.jpg"] } (closed mouth, then optional open mouth for speech; without
// one, a soft light swells with the voice). The cast's painted portraits come from Figma's image AI.
// Variants for how a face has changed are listed as "<id>@<variant>" (raw, ringed, hardened, heavy, lean;
// see portraitKeys in build.ts); the most specific one that exists is shown, else the plain portrait.
import { CAST, drawFig, setScale } from "../battle/art";
import { EVEN, pickPortrait, portraitKeys, type Build } from "./build";

const BG: Record<string, [string, string]> = {
  rhea: ["#3a2a22", "#8a5a40"],
  tamsin: ["#1f2e28", "#557a64"],
  maren: ["#2a2620", "#7a6c58"],
  warden: ["#1e2228", "#5c646e"],
  archer: ["#1e2228", "#5c646e"],
};

const painted: Record<string, HTMLImageElement[]> = {};

/** Loads painted portraits listed in the index. Missing or broken art falls back to the drawn bust. */
export async function loadPortraits(base = "portraits/"): Promise<void> {
  let index: Record<string, string[]> = {};
  try { const r = await fetch(base + "index.json"); if (r.ok) index = await r.json(); } catch { return; }
  await Promise.all(Object.entries(index).map(async ([id, files]) => {
    const imgs = await Promise.all(files.map((f) => new Promise<HTMLImageElement | null>((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = base + f; })));
    if (imgs[0]) painted[id] = imgs.filter((x): x is HTMLImageElement => !!x);
  }));
}

export const hasPortrait = (id: string): boolean => id in CAST || id in painted;
export const hasPainted = (id: string): boolean => id in painted;

/** Draws the bust of `id` filling a size x size square. talk is 0..1 mouth opening; `b` is their build now. */
export function drawPortrait(g: CanvasRenderingContext2D, id: string, size: number, t: number, talk: number, b: Build = EVEN): void {
  const [dark, light] = BG[id] ?? ["#222", "#555"];
  const bg = g.createRadialGradient(size * 0.4, size * 0.3, size * 0.05, size * 0.5, size * 0.55, size * 0.8);
  bg.addColorStop(0, light); bg.addColorStop(1, dark);
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = bg; g.fillRect(0, 0, size, size);
  const key = pickPortrait(portraitKeys(id, b), (k) => k in painted), art = key ? painted[key] : undefined;
  if (art) { // cover-fit, the open-mouth frame while the voice is loud, and a slight breath
    const im = talk > 0.35 && art[1] ? art[1] : art[0], sc = Math.max(size / im.width, size / im.height) * (1.02 + Math.sin(t * 1.6) * 0.004);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(im, (size - im.width * sc) / 2, (size - im.height * sc) / 2, im.width * sc, im.height * sc);
    if (talk > 0.02 && !art[1]) { // no open-mouth frame: a soft warm light swells with the voice instead
      const gl = g.createRadialGradient(size * 0.5, size * 1.05, size * 0.1, size * 0.5, size * 1.05, size * 0.9);
      gl.addColorStop(0, `rgba(255,214,150,${0.16 * talk})`); gl.addColorStop(1, "rgba(255,214,150,0)");
      g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = gl; g.fillRect(0, 0, size, size); g.restore();
    }
    if (b.raw && key === id) { // no painted raw variant yet: wash the colour out of the plain one
      g.save(); g.globalCompositeOperation = "saturation"; g.fillStyle = "rgba(128,128,128,.55)"; g.fillRect(0, 0, size, size); g.restore();
    }
    return;
  }
  if (!(id in CAST)) return;
  const K = size / 19; setScale(K);
  const breathe = Math.sin(t * 1.6) * 0.12;
  drawFig(g, id, (size * 0.5) / K + 0.6, (size * 0.44) / K + 42.6 + breathe, { t, talk }, b);
  // soft light from the upper left, and a vignette
  const v = g.createRadialGradient(size * 0.5, size * 0.45, size * 0.3, size * 0.5, size * 0.5, size * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(8,6,4,.55)");
  g.fillStyle = v; g.fillRect(0, 0, size, size);
}
