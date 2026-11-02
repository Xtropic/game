// Dialogue portraits: a close-up bust of the same HD cel-shaded figure used in battle, so a character looks
// the same in both places. The mouth follows the recorded voice, eyes blink, the bust breathes.
// Painted art replaces the drawn bust per character: list it in public/portraits/index.json as
// { "rhea": ["rhea.png", "rhea-open.png"] } (closed mouth, then optional open mouth for speech).
import { CAST, drawFig, setScale } from "../battle/art";

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

/** Draws the bust of `id` filling a size x size square. talk is 0..1 mouth opening. */
export function drawPortrait(g: CanvasRenderingContext2D, id: string, size: number, t: number, talk: number): void {
  const [dark, light] = BG[id] ?? ["#222", "#555"];
  const bg = g.createRadialGradient(size * 0.4, size * 0.3, size * 0.05, size * 0.5, size * 0.55, size * 0.8);
  bg.addColorStop(0, light); bg.addColorStop(1, dark);
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = bg; g.fillRect(0, 0, size, size);
  const art = painted[id];
  if (art) { // cover-fit, the open-mouth frame while the voice is loud, and a slight breath
    const im = talk > 0.35 && art[1] ? art[1] : art[0], sc = Math.max(size / im.width, size / im.height) * (1.02 + Math.sin(t * 1.6) * 0.004);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(im, (size - im.width * sc) / 2, (size - im.height * sc) / 2, im.width * sc, im.height * sc);
    return;
  }
  if (!(id in CAST)) return;
  const K = size / 19; setScale(K);
  const breathe = Math.sin(t * 1.6) * 0.12;
  drawFig(g, id, (size * 0.5) / K + 0.6, (size * 0.44) / K + 42.6 + breathe, { t, talk });
  // soft light from the upper left, and a vignette
  const v = g.createRadialGradient(size * 0.5, size * 0.45, size * 0.3, size * 0.5, size * 0.5, size * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(8,6,4,.55)");
  g.fillStyle = v; g.fillRect(0, 0, size, size);
}
