// Plays a cut scene over whatever is underneath: a run of shots, each a stack of painted layers seen through a
// moving camera (layers further back move less, so the land has depth), with cinema bars, a colour grade, cuts,
// fades and flashes between shots, and sounds on cue. Esc (or the Skip button) ends it; Enter asks first,
// because Enter is also how the player reads on through dialogue.
import { Container, Sprite, Text, Texture, type FederatedPointerEvent } from "pixi.js";
import type { Game } from "../core/game";
import type { Scene } from "../core/scene";
import { device } from "../core/device";
import { keyFor } from "../core/input";
import { setScale } from "../battle/art";
import { VH, VW, clamp01, type G } from "./kit";

export interface Cam { x: number; y: number; z: number; r?: number; }
export interface Frame { /** seconds into the shot */ t: number; /** 0..1 through the shot */ p: number; /** seconds into the whole scene */ T: number; }
export type Draw = (g: G, f: Frame) => void;
/** pf: how much the camera moves this layer (0 = fixed sky, 1 = with the subject, >1 = foreground). */
export interface Layer { pf: number; draw: Draw; }
export interface Shot {
  dur: number;
  from: Cam; to?: Cam;
  ease?: "inout" | "out" | "in" | "linear";
  layers: Layer[];
  /** Drawn over everything in world units without the camera (light leaks, grades, focus lines). */
  over?: Draw;
  /** How this shot comes in. */
  into?: "cut" | "fade" | "white" | "black" | "dissolve";
  /** Screen shake strength (world units) over the shot. */
  shake?: (p: number) => number;
  /** Sounds and other things at a time into the shot. */
  cues?: [number, () => void][];
  /** Cinema bars, as a share of the height each (default 0.11). */
  bars?: number;
  vignette?: number;
  /** How strongly lights glow (default 0.7). */
  bloom?: number;
}
export interface CutDef { id: string; music?: string; shots: Shot[]; }

const EASE = { inout: (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2), out: (p: number) => 1 - (1 - p) ** 3, in: (p: number) => p * p * p, linear: (p: number) => p };

export class CutsceneScene implements Scene {
  readonly id = "cutscene";
  readonly view = new Container();
  private cv = document.createElement("canvas");
  private g = this.cv.getContext("2d")!;
  private prev = document.createElement("canvas");
  private tex: Texture | null = null;
  private sprite = new Sprite();
  private skipText = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 15, fill: "#d8cdb6", fontStyle: "italic" } });
  private game!: Game;
  private T = 0;
  private shot = 0;
  private st = 0;
  private cued = new Set<string>();
  private asked = 0;
  private finished = false;
  /** Screenshots in tests freeze the scene on a frame. */
  hold = false;
  private w = 1; private h = 1;
  private bloom = document.createElement("canvas");
  private grain: HTMLCanvasElement | null = null;
  get music(): string | undefined { return this.def.music; }

  constructor(readonly def: CutDef, private onDone: () => void) {}

  enter(game: Game): void {
    this.game = game;
    this.sprite.eventMode = "static";
    this.sprite.on("pointertap", (e: FederatedPointerEvent) => { if (e.global.x > this.w - 140 && e.global.y > this.h - 70) this.end(); else this.ask(); });
    this.skipText.eventMode = "static"; this.skipText.cursor = "pointer"; this.skipText.on("pointertap", () => this.end());
    this.view.addChild(this.sprite, this.skipText);
  }
  exit(): void { this.tex?.destroy(true); }

  resize(w: number, h: number): void {
    this.w = w; this.h = h;
    const res = Math.min(2, window.devicePixelRatio || 1), pw = Math.min(2200, Math.round(w * res)), ph = Math.round((pw * h) / w);
    this.cv.width = pw; this.cv.height = ph; this.prev.width = pw; this.prev.height = ph;
    this.tex?.destroy(true); this.tex = Texture.from(this.cv); this.sprite.texture = this.tex;
    this.sprite.width = w; this.sprite.height = h;
    this.skipText.anchor.set(1, 1); this.skipText.x = w - 18; this.skipText.y = h - 14;
  }

  private ask(): void { if (this.asked > 0) { this.end(); return; } this.asked = 2.5; }
  private end(): void { if (this.finished) return; this.finished = true; this.onDone(); }

  update(dt: number): void {
    if (this.finished) return;
    const inp = this.game.input;
    if (inp.wasPressed("cancel")) { this.end(); return; }
    if (inp.wasPressed("confirm")) this.ask();
    this.asked = Math.max(0, this.asked - dt);
    if (this.hold) return;
    this.T += dt; this.st += dt;
    const s = this.def.shots[this.shot];
    for (const [i, [at, fn]] of (s.cues ?? []).entries()) { const k = `${this.shot}:${i}`; if (this.st >= at && !this.cued.has(k)) { this.cued.add(k); try { fn(); } catch { /* sound may be off */ } } }
    if (this.st >= s.dur) {
      // keep the last frame of this shot for the next one to dissolve from
      const pg = this.prev.getContext("2d")!; pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, this.prev.width, this.prev.height); pg.drawImage(this.cv, 0, 0);
      this.shot++; this.st = 0;
      if (this.shot >= this.def.shots.length) { this.shot = this.def.shots.length - 1; this.end(); }
    }
  }

  render(): void {
    if (!this.tex || this.finished) return;
    const g = this.g, W = this.cv.width, H = this.cv.height, s = this.def.shots[this.shot];
    const p = clamp01(this.st / s.dur), e = EASE[s.ease ?? "inout"](p), f: Frame = { t: this.st, p, T: this.T };
    const a = s.from, b = s.to ?? s.from, cam: Cam = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, z: a.z + (b.z - a.z) * e, r: (a.r ?? 0) + ((b.r ?? 0) - (a.r ?? 0)) * e };
    // the 320 x 180 world fits inside the screen; a tall phone sees a little more above and below
    const k = Math.min(W / VW, H / VH) * (H > W ? 1.25 : 1);
    const sh = s.shake ? s.shake(p) : 0, jx = sh ? (Math.random() - 0.5) * sh : 0, jy = sh ? (Math.random() - 0.5) * sh * 0.7 : 0;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    setScale(1);
    for (const L of s.layers) {
      const pf = L.pf, cx = VW / 2 + (cam.x - VW / 2) * pf + jx * pf, cy = VH / 2 + (cam.y - VH / 2) * pf + jy * pf, z = 1 + (cam.z - 1) * pf, kk = k * z;
      g.setTransform(kk, 0, 0, kk, W / 2 - cx * kk, H / 2 - cy * kk);
      if (cam.r) { g.translate(cx, cy); g.rotate(cam.r * pf); g.translate(-cx, -cy); }
      g.save(); L.draw(g, f); g.restore();
    }
    if (s.over) { g.setTransform(k, 0, 0, k, W / 2 - (VW / 2) * k, H / 2 - (VH / 2) * k); g.save(); s.over(g, f); g.restore(); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    // bloom: a tiny copy of the frame, scaled back up soft and screened over it, so lights glow
    const bw = Math.max(8, Math.round(W / 8)), bh = Math.max(8, Math.round(H / 8));
    if (this.bloom.width !== bw || this.bloom.height !== bh) { this.bloom.width = bw; this.bloom.height = bh; }
    const bg = this.bloom.getContext("2d")!; bg.imageSmoothingEnabled = true; bg.globalCompositeOperation = "source-over"; bg.drawImage(this.cv, 0, 0, bw, bh);
    // multiplied by itself twice: only the bright parts (lamps, fire, sun) are left to glow
    bg.globalCompositeOperation = "multiply"; bg.drawImage(this.bloom, 0, 0); bg.drawImage(this.bloom, 0, 0); bg.globalCompositeOperation = "source-over";
    g.imageSmoothingEnabled = true; g.globalCompositeOperation = "screen"; g.globalAlpha = s.bloom ?? 0.7; g.drawImage(this.bloom, 0, 0, W, H);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    // film grain
    if (!this.grain) this.grain = grainTile();
    g.globalAlpha = 0.06; g.fillStyle = g.createPattern(this.grain, "repeat")!; g.save(); g.translate(Math.random() * 64, Math.random() * 64); g.fillRect(-64, -64, W + 128, H + 128); g.restore(); g.globalAlpha = 1;
    // vignette
    const v = s.vignette ?? 0.55;
    if (v > 0) { const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, `rgba(0,0,0,${v})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    // into this shot
    const into = this.shot === 0 && !s.into ? "black" : s.into ?? "cut", it = this.st;
    if (into === "black" || into === "fade") { const o = 1 - clamp01(it / (into === "black" ? 1.1 : 0.6)); if (o > 0) { g.fillStyle = `rgba(0,0,0,${o})`; g.fillRect(0, 0, W, H); } }
    if (into === "white") { const o = 1 - clamp01(it / 0.5); if (o > 0) { g.fillStyle = `rgba(255,250,240,${o})`; g.fillRect(0, 0, W, H); } }
    if (into === "dissolve" && this.shot > 0) { const o = 1 - clamp01(it / 1); if (o > 0) { g.globalAlpha = o; g.drawImage(this.prev, 0, 0); g.globalAlpha = 1; } }
    // out of the last shot: to black
    if (this.shot === this.def.shots.length - 1) { const o = clamp01((this.st - (s.dur - 0.8)) / 0.8); if (o > 0) { g.fillStyle = `rgba(0,0,0,${o})`; g.fillRect(0, 0, W, H); } }
    // cinema bars slide in over the first second
    const bar = (s.bars ?? 0.11) * H * Math.min(1, this.T / 0.6);
    g.fillStyle = "#000"; g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar);
    this.tex.source.update();
    this.skipText.text = this.asked > 0 ? (device.taps ? "Tap again to skip" : `Press ${keyFor("confirm")} again to skip`) : device.taps ? "Skip ▸" : `${keyFor("cancel")} to skip`;
    this.skipText.alpha = this.asked > 0 ? 1 : Math.max(0.35, 1 - this.T / 3);
  }
}

function grainTile(): HTMLCanvasElement {
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 64;
  const c = cv.getContext("2d")!, im = c.createImageData(64, 64);
  for (let i = 0; i < 64 * 64; i++) { const v = Math.random() * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  c.putImageData(im, 0, 0); return cv;
}
