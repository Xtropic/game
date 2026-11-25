// Attending a kith's training in person: each drill is its own small game on the battle stage (data/kith/
// training.json, rules in kith/training.ts). The kith's own attribute for the drill makes it a little easier
// (aptitude); the player's play decides the score, the score the grade, the grade the gains.
//   heave   Might     a needle swings on a gauge: press in the gold to heave the stone sledge
//   carry   Grit      hold to push the pace, release to ease: keep inside the drover's moving band
//   ledges  Finesse   three tracks down the scree: Up/Down change track, press to leap gaps
//   drums   Nerve     frights shove its nerve: Left/Right steady the needle back into the calm band
//   cups    Wits      follow the cup with the berry; Left/Right and press to lift
//   call    Heart     Rhea hums a phrase on four notes; hum it back with the arrows
//   show    Presence  cues slide to the line on the drum: press the matching arrow as each crosses
// Keys: arrows / WASD, Enter or Space to press (held for the carry). Every control has an on-screen button.
import { device } from "../core/device";
import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import type { Game } from "../core/game";
import type { Scene } from "../core/scene";
import { sfx } from "../audio/music";
import { CH, CW, HUD_FONT, backdrop, barFX, drawLook, getScale, ringFX, setScale, sparkFX, textFX, dustFX } from "../battle/art";
import { paintedLook } from "../battle/painted";
import { familiesOf, type Kith } from "../kith/kith";
import { aptitude, type Drill, type Outcome } from "../kith/training";

type Btn = "up" | "down" | "left" | "right" | "press";
interface Ctl { pressed: Set<Btn>; held: Set<Btn>; }
interface Fig { draw(g: CanvasRenderingContext2D, x: number, y: number, o: { t: number; run?: number; lunge?: boolean; brace?: boolean; fall?: number; flip?: boolean; stride?: number; bow?: number }): void; }
interface Mini {
  update(dt: number, c: Ctl): void;
  draw(g: CanvasRenderingContext2D, T: number, kith: Fig, rhea: Fig): void;
  /** 0..1 so far. */
  score(): number;
  done(): boolean;
  /** One short line for the top of the stage: progress. */
  status(): string;
  /** Which buttons this game uses, for the touch row. */
  buttons: Btn[];
}

const U = (v: number): number => v * getScale();
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const COAT: Record<string, string> = { reedcat: "#b8a868", loftbuck: "#9a8a70" };

function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, r = 0): void {
  g.fillStyle = fill; g.beginPath(); if (r) g.roundRect(U(x), U(y), U(w), U(h), U(r)); else g.rect(U(x), U(y), U(w), U(h)); g.fill();
}
function circ(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string): void {
  g.beginPath(); g.arc(U(x), U(y), U(r), 0, 7); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = U(0.6); g.strokeStyle = stroke; g.stroke(); }
}
function line(g: CanvasRenderingContext2D, pts: number[], col: string, w = 0.6): void {
  g.beginPath(); g.moveTo(U(pts[0]), U(pts[1])); for (let i = 2; i < pts.length; i += 2) g.lineTo(U(pts[i]), U(pts[i + 1])); g.lineWidth = U(w); g.strokeStyle = col; g.lineCap = "round"; g.stroke();
}
const ARROW: Record<string, string> = { up: "▲", down: "▼", left: "◀", right: "▶" };

// ---------------------------------------------------------------- Might: heave the sledge
class Heave implements Mini {
  buttons: Btn[] = ["press"];
  private p = 0; private dir = 1; private n = 0; private total = 0; private band = 0.5; private cool = 0; private slip = 0; private pull = 0; private dist = 0; private streak = 0;
  private marks: { q: number; t: number }[] = [];
  readonly heaves = 10;
  constructor(private apt: number, private rng: () => number) { this.newBand(); }
  private width(): number { return 0.09 + this.apt * 0.06 - this.n * 0.003; }
  private newBand(): void { const w = this.width() * 2.6; this.band = w / 2 + this.rng() * (1 - w); }
  update(dt: number, c: Ctl): void {
    this.slip = Math.max(0, this.slip - dt); this.pull = Math.max(0, this.pull - dt * 1.5);
    for (const m of this.marks) m.t += dt;
    if (this.cool > 0) { this.cool -= dt; if (this.cool <= 0) this.newBand(); return; }
    const speed = (0.75 + this.n * 0.07) * (1.15 - this.apt * 0.3);
    this.p += this.dir * speed * dt; if (this.p > 1) { this.p = 1; this.dir = -1; } if (this.p < 0) { this.p = 0; this.dir = 1; }
    if (c.pressed.has("press")) {
      const d = Math.abs(this.p - this.band), w = this.width(), q = d < w / 2 ? 1 : d < w * 1.3 ? 0.5 : 0;
      this.total += q; this.n++; this.cool = 0.55; this.marks.push({ q, t: 0 });
      if (q === 1) { this.streak++; sfx.good(this.streak); this.pull = 1; this.dist += 9; }
      else if (q) { this.streak = 0; sfx.hit(); this.pull = 0.6; this.dist += 4; }
      else { this.streak = 0; sfx.miss(); this.slip = 0.6; }
    }
  }
  draw(g: CanvasRenderingContext2D, T: number, kith: Fig): void {
    // gauge
    const gx = 70, gw = 116, gy = 26, w = this.width();
    rect(g, gx - 2, gy - 4, gw + 4, 10, "rgba(20,14,10,.8)", 2);
    rect(g, gx + (this.band - w * 1.3) * gw, gy - 2, w * 2.6 * gw, 6, "#8a6a2a");
    rect(g, gx + (this.band - w / 2) * gw, gy - 2, w * gw, 6, "#ffd860");
    line(g, [gx + this.p * gw, gy - 5, gx + this.p * gw, gy + 6], "#fff6e0", 1);
    this.marks.slice(-10).forEach((m, i) => circ(g, 98 + i * 6, gy + 12, 1.6, m.q === 1 ? "#ffd860" : m.q ? "#c8a060" : "#7a4a3a"));
    // sledge and rope: the kith hauls left to right, the sledge follows
    const kx = 150 + this.dist * 0.25, sx = kx - 62, gyd = 112;
    rect(g, sx - 14, gyd - 10, 30, 8, "#6a4a2a", 1.5); rect(g, sx - 12, gyd - 18, 10, 9, "#8a8a80", 2); rect(g, sx, gyd - 16, 12, 7, "#9a988a", 2); rect(g, sx - 6, gyd - 24, 9, 7, "#7a7a70", 2);
    line(g, [sx + 16, gyd - 7, kx - 12, gyd - 14], "#c8b080", 0.7);
    if (this.pull > 0.3) dustFX(g, sx - 14, gyd - 1, 1 - this.pull);
    kith.draw(g, kx, gyd, { t: T, run: this.pull > 0.1 ? T * 1.4 : undefined, lunge: this.pull > 0.5, brace: this.cool > 0 && this.pull < 0.1 && !this.slip, fall: this.slip > 0 ? Math.min(0.35, this.slip) : 0, stride: 0.6 });
    if (this.marks.length && this.marks[this.marks.length - 1].t < 0.7) {
      const m = this.marks[this.marks.length - 1];
      textFX(g, m.q === 1 ? (this.streak > 2 ? `HEAVE! x${this.streak}` : "HEAVE!") : m.q ? "Pull" : "Slipped", kx, gyd - 52 - m.t * 10, m.q === 1 ? "#ffe39a" : m.q ? "#e8d8b8" : "#f2a48a", 9);
      if (m.q === 1) sparkFX(g, gx + this.p * gw, gy + 1, m.t / 0.7);
    }
  }
  score(): number { return this.total / this.heaves; }
  done(): boolean { return this.n >= this.heaves && this.cool <= 0; }
  status(): string { return `Heave ${Math.min(this.n + 1, this.heaves)} of ${this.heaves}`; }
}

// ---------------------------------------------------------------- Grit: the long carry
class Carry implements Mini {
  buttons: Btn[] = ["press"];
  private p = 0.3; private v = 0; private sta = 1; private t = 0; private inBand = 0; private posts = 0; private tired = 0;
  readonly length = 30;
  constructor(private apt: number, private seed: number) {}
  private band(t: number): number { return 0.5 + 0.28 * Math.sin(t * 0.37 + this.seed) + 0.12 * Math.sin(t * 1.13 + this.seed * 2); }
  private half(): number { return 0.11 + this.apt * 0.04; }
  update(dt: number, c: Ctl): void {
    if (this.done()) return;
    this.t += dt;
    const push = c.held.has("press") && this.sta > 0.02;
    this.v += (push ? 1.25 : -1.0) * dt; this.v *= Math.pow(0.12, dt); this.p = clamp(this.p + this.v * dt, 0, 1);
    if (this.p <= 0 || this.p >= 1) this.v = 0;
    this.sta = clamp(this.sta + (push ? -(0.16 - this.apt * 0.06) : 0.12) * dt, 0, 1);
    if (c.held.has("press") && this.sta <= 0.02) { this.tired += dt; if (this.tired > 0.6) { sfx.miss(); this.tired = -1.5; } }
    if (Math.abs(this.p - this.band(this.t)) < this.half()) this.inBand += dt;
    this.posts += this.p * dt * 22;
  }
  draw(g: CanvasRenderingContext2D, T: number, kith: Fig): void {
    // mile posts rolling by
    for (let i = 0; i < 6; i++) { const x = ((i * 56 - this.posts) % 336 + 336) % 336 - 40; rect(g, x, 98, 3, 14, "#6a5a40"); rect(g, x - 1, 96, 5, 3, "#8a7a58"); }
    const inb = Math.abs(this.p - this.band(this.t)) < this.half();
    kith.draw(g, 112, 114, { t: T, run: T * (0.6 + this.p * 1.6), stride: 0.3 + this.p * 0.7, brace: this.sta < 0.15 });
    rect(g, 104, 93, 15, 6, "#7a6a48", 2); rect(g, 104, 93, 15, 1.5, "#9a8a60"); // panniers
    // the drover's band, a meter on the right
    const mx = 222, top = 24, h = 92, b = this.band(this.t), hf = this.half();
    rect(g, mx - 6, top - 3, 16, h + 6, "rgba(20,14,10,.8)", 3);
    rect(g, mx - 3, top + (1 - b - hf) * h, 10, hf * 2 * h, inb ? "#ffd860" : "#a88a3a", 2);
    const my = top + (1 - this.p) * h; g.fillStyle = "#fff6e0"; g.beginPath(); g.moveTo(U(mx - 9), U(my)); g.lineTo(U(mx - 3), U(my - 3)); g.lineTo(U(mx - 3), U(my + 3)); g.fill();
    textFX(g, "PACE", mx + 2, top - 9, "#f2e3c4", 5);
    textFX(g, "WIND", 32, 14, "#f2e3c4", 5); barFX(g, 14, 18, 40, this.sta, this.sta < 0.2 ? "#d06a5a" : "#8ad07a", 2);
    if (!inb) textFX(g, this.p > b ? "Too fast" : "Too slow", 112, 50, "#f2c4b4", 7);
    else if (this.inBand > 1) textFX(g, "Steady", 112, 50, "#ffe39a", 7, 0.7);
  }
  score(): number { return clamp(this.inBand / (this.length * 0.85), 0, 1); }
  done(): boolean { return this.t >= this.length; }
  status(): string { return `${Math.max(0, Math.ceil(this.length - this.t))}s left · in step ${Math.round((this.inBand / Math.max(0.01, this.t)) * 100)}%`; }
}

// ---------------------------------------------------------------- Finesse: the ledge run
class Ledges implements Mini {
  buttons: Btn[] = ["up", "down", "press"];
  private lane = 1; private ly = 1; private air = 0; private t = 0; private next = 1.2; private hurt = 0;
  private obs: { lane: number; x: number; kind: "rock" | "gap"; done: boolean }[] = [];
  private cleared = 0; private hits = 0; private spawned = 0;
  readonly total = 24;
  constructor(private apt: number, private rng: () => number) {}
  private laneY(l: number): number { return 84 + l * 16; }
  private speed(): number { return (70 + this.spawned * 2.6) * (1.1 - this.apt * 0.2); }
  update(dt: number, c: Ctl): void {
    this.t += dt; this.hurt = Math.max(0, this.hurt - dt); this.air = Math.max(0, this.air - dt);
    if (c.pressed.has("up") || c.pressed.has("left")) { if (this.lane > 0) { this.lane--; sfx.swing(); } }
    if (c.pressed.has("down") || c.pressed.has("right")) { if (this.lane < 2) { this.lane++; sfx.swing(); } }
    if (c.pressed.has("press") && this.air <= 0) { this.air = 0.6; sfx.swing(); }
    this.ly += (this.lane - this.ly) * Math.min(1, dt * 14);
    this.next -= dt;
    if (this.next <= 0 && this.spawned < this.total) {
      const lane = Math.floor(this.rng() * 3), kind = this.rng() < 0.45 ? "gap" : "rock";
      this.obs.push({ lane, x: 270, kind, done: false }); this.spawned++;
      if (this.spawned > 6 && this.rng() < 0.3 && this.spawned < this.total) { this.obs.push({ lane: (lane + 1 + Math.floor(this.rng() * 2)) % 3, x: 270, kind: this.rng() < 0.5 ? "gap" : "rock", done: false }); this.spawned++; }
      this.next = Math.max(0.55, 1.25 - this.spawned * 0.025) * (1.05 - this.apt * 0.1);
    }
    const sp = this.speed();
    for (const o of this.obs) {
      o.x -= sp * dt;
      if (!o.done && o.x < 74 && o.x > 52) {
        const here = Math.round(this.ly) === o.lane && Math.abs(this.ly - o.lane) < 0.45;
        if (here && (o.kind === "rock" || this.air <= 0)) { o.done = true; this.hits++; this.hurt = 0.6; sfx.miss(); }
      }
      if (!o.done && o.x <= 52) { o.done = true; this.cleared++; if (Math.round(this.ly) === o.lane) sfx.good(Math.min(5, this.cleared % 6)); }
    }
    this.obs = this.obs.filter((o) => o.x > -30);
  }
  draw(g: CanvasRenderingContext2D, T: number, kith: Fig): void {
    for (let l = 0; l < 3; l++) { const y = this.laneY(l); rect(g, 0, y - 2, CW, 3, "rgba(60,50,40,.35)"); }
    for (const o of this.obs) {
      const y = this.laneY(o.lane);
      if (o.kind === "gap") { rect(g, o.x - 10, y - 4, 20, 7, "#14100c", 2); rect(g, o.x - 10, y - 4, 20, 2, "#3a2c20"); }
      else { circ(g, o.x, y - 6, 7, "#7a7464", "#2a2620"); circ(g, o.x - 2, y - 8, 2.5, "#9a9484"); }
    }
    const y = this.laneY(this.ly) - (this.air > 0 ? Math.sin((1 - this.air / 0.6) * Math.PI) * 14 : 0);
    kith.draw(g, 62, y + 2, { t: T, run: T * 2.2, stride: 1, fall: this.hurt > 0.3 ? 0.3 : 0 });
    if (this.hurt > 0.2) textFX(g, "Stumbled", 62, y - 46, "#f2a48a", 7);
  }
  score(): number { const n = Math.max(1, this.spawned); return clamp((this.cleared - this.hits * 0.5) / n, 0, 1) * (this.spawned / this.total); }
  done(): boolean { return this.spawned >= this.total && this.obs.length === 0; }
  status(): string { return `Cleared ${this.cleared} · stumbled ${this.hits}`; }
}

// ---------------------------------------------------------------- Nerve: drums and smoke
class Drums implements Mini {
  buttons: Btn[] = ["left", "right"];
  private n = 0; private v = 0; private t = 0; private calm = 0; private next = 1.5;
  private warn: { side: number; t: number; kind: string } | null = null;
  private fx: { side: number; t: number; kind: string }[] = [];
  readonly length = 30;
  constructor(private apt: number, private rng: () => number) {}
  private half(): number { return 0.24 + this.apt * 0.1; }
  update(dt: number, c: Ctl): void {
    if (this.done()) return;
    this.t += dt; for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < 1);
    const steer = (c.held.has("left") ? 1 : 0) - (c.held.has("right") ? 1 : 0);
    this.v += (steer * 2.6 + Math.sin(this.t * 2.3) * 0.5 - this.n * 0.4) * dt;
    this.v *= Math.pow(0.3, dt); this.n = clamp(this.n + this.v * dt, -1.2, 1.2);
    this.next -= dt;
    if (!this.warn && this.next < 0.55) { const side = this.rng() < 0.5 ? -1 : 1; this.warn = { side, t: 0, kind: ["drum", "smoke", "sheet"][Math.floor(this.rng() * 3)] }; }
    if (this.warn) { this.warn.t += dt; if (this.next <= 0) {
      const w = this.warn; this.warn = null; this.fx.push({ side: w.side, t: 0, kind: w.kind });
      this.v += -w.side * (1.3 + this.rng() * 0.8 + this.t * 0.02) * (1.1 - this.apt * 0.3); // a fright on the left shoves it right
      if (w.kind === "drum") sfx.beat(true); else sfx.door();
      this.next = (1.3 + this.rng() * 1.1) * (1.05 - this.t / this.length * 0.35);
    } }
    if (Math.abs(this.n) < this.half()) this.calm += dt;
  }
  draw(g: CanvasRenderingContext2D, T: number, kith: Fig): void {
    const shy = Math.abs(this.n) > this.half();
    kith.draw(g, 128 + this.n * 18, 116, { t: T, brace: shy, flip: this.n > 0.4, lunge: Math.abs(this.n) > 0.85 });
    // the frights
    for (const s of [-1, 1]) { const x = 128 - s * 92; rect(g, x - 7, 98, 14, 14, "#6a3a2a", 2); rect(g, x - 7, 98, 14, 3, "#c8a878"); }
    for (const f of this.fx) {
      const x = 128 - f.side * 80, p = f.t;
      if (f.kind === "smoke") for (let i = 0; i < 6; i++) circ(g, x + Math.sin(i * 2.1) * (6 + p * 18), 96 - p * 30 - i * 3, 5 + p * 8, `rgba(200,200,190,${0.45 * (1 - p)})`);
      else if (f.kind === "sheet") { g.fillStyle = `rgba(236,230,214,${1 - p})`; g.beginPath(); g.moveTo(U(x - 12), U(54)); g.quadraticCurveTo(U(x + Math.sin(p * 30) * 10), U(70), U(x + 12), U(56)); g.lineTo(U(x + 12), U(82)); g.lineTo(U(x - 12), U(80)); g.fill(); }
      else ringFX(g, x, 100, 6 + p * 30, `rgba(255,220,160,${1 - p})`);
    }
    if (this.warn) textFX(g, "!", 128 - this.warn.side * 80, 76, "#ffb070", 12, 0.5 + 0.5 * Math.sin(T * 30));
    // the nerve gauge
    const cx = 128, y = 24, w = 80, hf = this.half();
    rect(g, cx - w / 2 - 3, y - 5, w + 6, 10, "rgba(20,14,10,.8)", 2);
    rect(g, cx - hf / 1.2 * w / 2, y - 3, hf / 1.2 * w, 6, shy ? "#a88a3a" : "#8ad07a", 2);
    line(g, [cx + (this.n / 1.2) * w / 2, y - 6, cx + (this.n / 1.2) * w / 2, y + 6], "#fff6e0", 1.2);
    textFX(g, "NERVE", cx, y - 10, "#f2e3c4", 5);
    if (shy) textFX(g, this.n < 0 ? "Steady it ▶" : "◀ Steady it", cx, y + 14, "#f2c4b4", 6);
  }
  score(): number { return clamp(this.calm / (this.length * 0.8), 0, 1); }
  done(): boolean { return this.t >= this.length; }
  status(): string { return `${Math.max(0, Math.ceil(this.length - this.t))}s left · held calm ${Math.round((this.calm / Math.max(0.01, this.t)) * 100)}%`; }
}

// ---------------------------------------------------------------- Wits: scent cups
class Cups implements Mini {
  buttons: Btn[] = ["left", "right", "press"];
  private round = 0; private cups: number[] = []; private berry = 0; private pick = 0;
  private phase: "show" | "shuffle" | "choose" | "reveal" = "show"; private t = 0;
  private swaps: [number, number][] = []; private si = 0; private right = 0; private got: boolean | null = null;
  readonly rounds = 6;
  constructor(private apt: number, private rng: () => number) { this.setup(); }
  private count(): number { return this.round < 2 ? 3 : this.round < 4 ? 4 : 5; }
  private swapTime(): number { return Math.max(0.16, (0.5 - this.round * 0.06) * (0.85 + this.apt * 0.35)); }
  private setup(): void {
    const n = this.count(); this.cups = [...Array(n).keys()]; this.berry = Math.floor(this.rng() * n); this.pick = Math.floor(n / 2);
    this.swaps = []; for (let i = 0; i < 4 + this.round * 2; i++) { const a = Math.floor(this.rng() * n); let b = Math.floor(this.rng() * (n - 1)); if (b >= a) b++; this.swaps.push([a, b]); }
    this.si = 0; this.phase = "show"; this.t = 0; this.got = null;
  }
  private slotX(i: number): number { const n = this.count(); return 128 + (i - (n - 1) / 2) * 34; }
  update(dt: number, c: Ctl): void {
    this.t += dt;
    if (this.phase === "show" && this.t > 1.3) { this.phase = "shuffle"; this.t = 0; }
    else if (this.phase === "shuffle" && this.t >= this.swapTime()) {
      const [a, b] = this.swaps[this.si]; const ia = this.cups.indexOf(a), ib = this.cups.indexOf(b); this.cups[ia] = b; this.cups[ib] = a;
      this.si++; this.t = 0; sfx.bump(); if (this.si >= this.swaps.length) this.phase = "choose";
    } else if (this.phase === "choose") {
      const n = this.count();
      if (c.pressed.has("left")) { this.pick = (this.pick + n - 1) % n; sfx.bump(); }
      if (c.pressed.has("right")) { this.pick = (this.pick + 1) % n; sfx.bump(); }
      if (c.pressed.has("press")) { this.got = this.cups[this.pick] === this.berry; if (this.got) { this.right++; sfx.good(this.right); } else sfx.miss(); this.phase = "reveal"; this.t = 0; }
    } else if (this.phase === "reveal" && this.t > 1.3) { this.round++; if (this.round < this.rounds) this.setup(); }
  }
  /** Where a cup is drawn: its slot, or on its way between two slots while it swaps. */
  private cupPos(cup: number): [number, number] {
    const slot = this.cups.indexOf(cup);
    if (this.phase === "shuffle" && this.si < this.swaps.length) {
      const [a, b] = this.swaps[this.si], p = Math.min(1, this.t / this.swapTime());
      if (cup === a || cup === b) {
        const from = this.cups.indexOf(cup), to = this.cups.indexOf(cup === a ? b : a), x = this.slotX(from) + (this.slotX(to) - this.slotX(from)) * p;
        return [x, 100 + Math.sin(p * Math.PI) * (cup === a ? -8 : 8)];
      }
    }
    return [this.slotX(slot), 100];
  }
  draw(g: CanvasRenderingContext2D, T: number, kith: Fig): void {
    rect(g, 40, 104, 176, 6, "#5a4630", 2);
    const up = this.phase === "show" || this.phase === "reveal";
    for (let cup = 0; cup < this.count(); cup++) {
      const [x, y] = this.cupPos(cup), lift = up ? -10 : 0;
      if (up && cup === this.berry) circ(g, x, 102, 2.5, "#c8406a", "#4a1020");
      const sel = this.phase === "choose" && this.cups[this.pick] === cup;
      g.fillStyle = sel ? "#e8c890" : "#b89868"; g.beginPath(); g.moveTo(U(x - 8), U(y + lift + 2)); g.lineTo(U(x - 5), U(y + lift - 12)); g.lineTo(U(x + 5), U(y + lift - 12)); g.lineTo(U(x + 8), U(y + lift + 2)); g.fill();
      g.lineWidth = U(0.5); g.strokeStyle = "#3a2a18"; g.stroke();
      if (sel) textFX(g, "▼", x, y + lift - 20, "#ffe39a", 7);
    }
    kith.draw(g, 34, 118, { t: T, brace: this.phase === "shuffle", lunge: this.phase === "reveal" && !!this.got });
    if (this.phase === "reveal") textFX(g, this.got ? "Found it!" : "Not that one", 128, 60, this.got ? "#ffe39a" : "#f2c4b4", 10);
    if (this.phase === "show") textFX(g, "Watch the berry", 128, 60, "#f2e3c4", 8);
  }
  score(): number { return this.right / this.rounds; }
  done(): boolean { return this.round >= this.rounds; }
  status(): string { return `Round ${Math.min(this.round + 1, this.rounds)} of ${this.rounds} · found ${this.right}`; }
}

// ---------------------------------------------------------------- Heart: call and answer
const NOTES: Record<"up" | "left" | "right" | "down", number> = { up: 81, left: 74, right: 77, down: 69 };
const NOTE_KEYS = ["up", "left", "right", "down"] as const;
class Call implements Mini {
  buttons: Btn[] = ["up", "left", "right", "down"];
  private phrase: (typeof NOTE_KEYS)[number][] = []; private round = 0; private i = 0; private t = 0;
  private phase: "hum" | "answer" | "after" = "hum"; private lit: string | null = null; private litT = 0;
  private right = 0; private asked = 0; private miss = false; private near = 0;
  readonly rounds = 5;
  constructor(private apt: number, private rng: () => number) { this.setup(); }
  private gap(): number { return (0.62 - this.round * 0.04) * (0.9 + this.apt * 0.3); }
  private setup(): void { this.phrase = []; for (let i = 0; i < 3 + this.round; i++) this.phrase.push(NOTE_KEYS[Math.floor(this.rng() * 4)]); this.i = 0; this.t = -0.4; this.phase = "hum"; this.miss = false; }
  update(dt: number, c: Ctl): void {
    this.t += dt; this.litT = Math.max(0, this.litT - dt); if (!this.litT) this.lit = null;
    if (this.phase === "hum") {
      if (this.t >= this.gap()) { const k = this.phrase[this.i]; this.lit = k; this.litT = this.gap() * 0.7; sfx.note(NOTES[k]); this.i++; this.t = 0; if (this.i >= this.phrase.length) { this.phase = "answer"; this.i = 0; } }
    } else if (this.phase === "answer") {
      for (const k of NOTE_KEYS) if (c.pressed.has(k)) {
        this.lit = k; this.litT = 0.25; this.asked++;
        if (k === this.phrase[this.i]) { sfx.note(NOTES[k]); this.right++; this.i++; }
        else { sfx.miss(); this.miss = true; this.asked += this.phrase.length - this.i - 1; this.i = this.phrase.length; }
        if (this.i >= this.phrase.length) { this.phase = "after"; this.t = 0; if (!this.miss) { this.near++; sfx.heal(); } }
        break;
      }
    } else if (this.phase === "after" && this.t > 1.2) { this.round++; if (this.round < this.rounds) this.setup(); }
  }
  draw(g: CanvasRenderingContext2D, T: number, kith: Fig, rhea: Fig): void {
    rhea.draw(g, 44, 118, { t: T });
    const kx = 214 - this.near * 26;
    kith.draw(g, kx, 118, { t: T, flip: true, run: this.phase === "after" && !this.miss ? T * 1.2 : undefined, stride: 0.5 });
    // four notes in a diamond
    const cx = 128, cy = 46, pos: Record<string, [number, number]> = { up: [0, -16], down: [0, 16], left: [-22, 0], right: [22, 0] };
    for (const k of NOTE_KEYS) { const [dx, dy] = pos[k], on = this.lit === k; circ(g, cx + dx, cy + dy, on ? 8 : 6.5, on ? "#ffe39a" : "rgba(30,24,18,.75)", "#e0c070"); textFX(g, ARROW[k], cx + dx, cy + dy, on ? "#3a2a10" : "#f2e3c4", 6); }
    if (this.lit && this.phase === "hum") for (let i = 0; i < 3; i++) textFX(g, "♪", 60 + i * 8 + (1 - this.litT) * 20, 76 - i * 6 - (1 - this.litT) * 10, "#f2e3c4", 7, this.litT * 2);
    textFX(g, this.phase === "hum" ? "Listen" : this.phase === "answer" ? `Your turn: ${this.i}/${this.phrase.length}` : this.miss ? "It loses the tune" : "It answers you", cx, 76, this.phase === "after" && this.miss ? "#f2c4b4" : "#ffe39a", 8);
  }
  score(): number { const total = [...Array(this.rounds).keys()].reduce((a, r) => a + 3 + r, 0); return this.right / total; }
  done(): boolean { return this.round >= this.rounds; }
  status(): string { return `Phrase ${Math.min(this.round + 1, this.rounds)} of ${this.rounds}`; }
}

// ---------------------------------------------------------------- Presence: the show ring
class Show implements Mini {
  buttons: Btn[] = ["up", "left", "right", "down"];
  private t = -1.2; private cues: { at: number; k: (typeof NOTE_KEYS)[number]; hit: number }[] = []; private beatN = -1;
  private lastPose = 0; private poseK: string = ""; private judge: { text: string; t: number; good: boolean } | null = null;
  private streak = 0;
  readonly beat = 60 / 100;
  constructor(private apt: number, rng: () => number) {
    let at = 2 * this.beat;
    for (let i = 0; i < 26; i++) { this.cues.push({ at, k: NOTE_KEYS[Math.floor(rng() * 4)], hit: -1 }); at += this.beat * (i > 14 && rng() < 0.35 ? 0.5 : i < 6 ? 2 : 1); }
  }
  private win(): [number, number] { return [0.09 + this.apt * 0.04, 0.2 + this.apt * 0.05]; }
  update(dt: number, c: Ctl): void {
    this.t += dt;
    const b = Math.floor(this.t / this.beat); if (b !== this.beatN && this.t >= 0) { this.beatN = b; sfx.beat(b % 4 === 0); }
    if (this.judge) { this.judge.t += dt; if (this.judge.t > 0.6) this.judge = null; }
    const [great, ok] = this.win();
    for (const k of NOTE_KEYS) if (c.pressed.has(k)) {
      const cand = this.cues.filter((q) => q.hit < 0 && Math.abs(q.at - this.t) < ok).sort((a, b2) => Math.abs(a.at - this.t) - Math.abs(b2.at - this.t))[0];
      if (cand && cand.k === k) { const d = Math.abs(cand.at - this.t); cand.hit = d < great ? 1 : 0.5; this.streak++; this.judge = { text: d < great ? "Perfect" : "Good", t: 0, good: true }; this.poseK = k; this.lastPose = this.t; if (d < great) sfx.good(Math.min(5, this.streak)); }
      else { this.streak = 0; this.judge = { text: "Off the beat", t: 0, good: false }; sfx.miss(); if (cand) cand.hit = 0; }
    }
    for (const q of this.cues) if (q.hit < 0 && this.t - q.at > ok) { q.hit = 0; this.streak = 0; this.judge = { text: "Missed", t: 0, good: false }; }
  }
  draw(g: CanvasRenderingContext2D, T: number, kith: Fig): void {
    // the crowd and the ring
    for (let i = 0; i < 26; i++) { const x = 6 + i * 10, bob = this.streak > 4 ? Math.abs(Math.sin(T * 6 + i)) * 2 : 0; circ(g, x, 76 - bob - (i % 2) * 2, 3, ["#5a4a3a", "#4a3a30", "#6a5040"][i % 3]); rect(g, x - 4, 78 - bob - (i % 2) * 2, 8, 8, ["#3a4a5a", "#5a3a3a", "#4a5a3a"][i % 3], 2); }
    rect(g, 0, 86, CW, 2, "#c8b080");
    const since = this.t - this.lastPose, posing = since < 0.4;
    kith.draw(g, 150, 120, { t: T, run: !posing ? T * 0.9 : undefined, stride: 0.4, flip: posing && this.poseK === "left", lunge: posing && this.poseK === "right", brace: posing && this.poseK === "down", bow: posing && this.poseK === "up" ? -0.3 : undefined });
    // the cue lane
    const y = 30, hitX = 40;
    rect(g, 10, y - 9, CW - 20, 18, "rgba(20,14,10,.75)", 4);
    ringFX(g, hitX, y, 8, "#ffe39a", true);
    for (const q of this.cues) {
      if (q.hit >= 0) continue;
      const x = hitX + (q.at - this.t) * 70; if (x < 4 || x > CW - 6) continue;
      circ(g, x, y, 6, "#e0c070", "#3a2a10"); textFX(g, ARROW[q.k], x, y, "#2a1a08", 6);
    }
    if (this.judge) textFX(g, this.judge.text + (this.judge.good && this.streak > 3 ? ` x${this.streak}` : ""), 150, 58 - this.judge.t * 10, this.judge.good ? "#ffe39a" : "#f2c4b4", 8);
  }
  score(): number { return this.cues.reduce((a, q) => a + Math.max(0, q.hit), 0) / this.cues.length; }
  done(): boolean { return this.cues.every((q) => q.hit >= 0) && this.t > this.cues[this.cues.length - 1].at + 0.6; }
  status(): string { return `Cues ${this.cues.filter((q) => q.hit >= 0).length} of ${this.cues.length}`; }
}

function makeMini(d: Drill, apt: number, rng: () => number): Mini {
  switch (d.game) {
    case "heave": return new Heave(apt, rng);
    case "carry": return new Carry(apt, rng() * 6);
    case "ledges": return new Ledges(apt, rng);
    case "drums": return new Drums(apt, rng);
    case "cups": return new Cups(apt, rng);
    case "call": return new Call(apt, rng);
    case "show": return new Show(apt, rng);
  }
}

// ---------------------------------------------------------------- the kith on the stage

const portraits: Record<string, HTMLImageElement | null> = {};
function portrait(species: string, family: string): HTMLImageElement | null {
  for (const key of [`kith-${species}`, `kith-${family}`]) {
    if (key in portraits) { if (portraits[key]) return portraits[key]; continue; }
    const img = new Image(); portraits[key] = null;
    img.onload = () => { portraits[key] = img; }; img.src = `portraits/${key}.jpg`;
  }
  return null;
}
/** How a kith is drawn in a drill: its painting, its family's drawn rig, or (for families with neither yet) its
 *  painted portrait in a frame that bobs and leans with the pose. */
export function kithFigure(k: Kith): Fig {
  const fam = familiesOf(k.species)[0] ?? "loftbuck", base = `${fam}:${COAT[fam] ?? "#9a8a70"}`;
  const look = k.id === "ash" ? "ash" : paintedLook(base, k.species) ?? (fam === "loftbuck" || fam === "reedcat" ? base : undefined);
  if (look) return { draw: (g, x, y, o) => drawLook(g, look, x, y, o) };
  return {
    draw: (g, x, y, o) => {
      const img = portrait(k.species, fam), bob = o.run !== undefined ? Math.abs(Math.sin(o.run * 6)) * 3 : Math.sin(o.t * 2) * 0.8;
      const r = 17, cy = y - r - 4 - bob + (o.brace ? 3 : 0) + (o.fall ?? 0) * 10, cx = x + (o.lunge ? 4 : 0) * (o.flip ? -1 : 1);
      g.save(); g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(U(x), U(y), U(13), U(3), 0, 0, 7); g.fill();
      g.translate(U(cx), U(cy)); g.rotate((o.lunge ? 0.12 : 0) * (o.flip ? -1 : 1) + (o.fall ?? 0) * 0.6);
      g.beginPath(); g.arc(0, 0, U(r), 0, 7); g.closePath(); g.fillStyle = "#d8d4cc"; g.fill(); g.save(); g.clip();
      if (img) { if (o.flip) g.scale(-1, 1); g.drawImage(img, -U(r), -U(r), U(r * 2), U(r * 2)); }
      g.restore(); g.lineWidth = U(1); g.strokeStyle = "#e0c070"; g.stroke(); g.restore();
    },
  };
}
const rheaFig: Fig = { draw: (g, x, y, o) => drawLook(g, paintedLook("rhea") ?? "rhea", x, y, o) };

// ---------------------------------------------------------------- the scene

type Phase = "intro" | "count" | "play" | "over";
const GRADE_COL: Record<string, string> = { poor: "#c89a8a", fair: "#d8cdb6", good: "#b8e0a0", great: "#ffe39a", perfect: "#fff4b0" };

export class TrainingScene implements Scene {
  readonly id = "training";
  readonly view = new Container();
  /** Read by the music loop: the drill's mood. */
  music: string;
  private game!: Game;
  private cv = document.createElement("canvas");
  private g = this.cv.getContext("2d")!;
  private bg = document.createElement("canvas");
  private tex: Texture | null = null;
  private stage = new Sprite();
  private back = new Graphics();
  private hud = new Container();
  private sx = 0; private sy = 0; private sw = 1; private sh = 1; private W = 800; private H = 600;
  private T = 0; private t = 0;
  phase: Phase = "intro";
  private mini: Mini;
  private kith: Fig;
  private outcome: Outcome | null = null;
  private confetti: { x: number; y: number; vx: number; vy: number; c: string }[] = [];
  /** Touch buttons: pressed this frame and held. */
  private vPressed = new Set<Btn>(); private vHeld = new Set<Btn>();
  private lastStatus = "";

  constructor(private d: Drill, private k: Kith, private finish: (score: number) => Outcome, private rng: () => number = Math.random) {
    this.music = d.mood;
    this.mini = makeMini(d, aptitude(k, d), rng);
    this.kith = kithFigure(k);
  }

  enter(game: Game): void {
    this.game = game; this.back.eventMode = "static";
    this.view.addChild(this.back, this.stage, this.hud);
    this.stage.eventMode = "static";
    this.stage.on("pointerdown", () => { if (this.phase === "play") { this.vPressed.add("press"); this.vHeld.add("press"); } else this.confirm(); });
    const up = () => this.vHeld.delete("press");
    this.stage.on("pointerup", up); this.stage.on("pointerupoutside", up);
  }
  exit(): void { this.tex?.destroy(true); }

  resize(w: number, h: number): void {
    this.W = w; this.H = h;
    const hudH = Math.round(Math.max(130, Math.min(200, h * 0.28))), ah = h - hudH;
    this.sw = Math.min(w, (ah * 16) / 9); this.sh = (this.sw * 9) / 16; this.sx = Math.round((w - this.sw) / 2); this.sy = Math.round(Math.max(0, (ah - this.sh) / 2));
    const res = Math.min(2, window.devicePixelRatio || 1), pw = Math.min(1800, Math.round(this.sw * res)), ph = Math.round((pw * 9) / 16);
    this.cv.width = pw; this.cv.height = ph; this.bg.width = pw; this.bg.height = ph;
    const bgg = this.bg.getContext("2d")!; bgg.imageSmoothingEnabled = false; bgg.drawImage(backdrop(this.d.backdrop), 0, 0, pw, ph);
    this.tex?.destroy(true); this.tex = Texture.from(this.cv); this.stage.texture = this.tex;
    this.stage.x = this.sx; this.stage.y = this.sy; this.stage.width = this.sw; this.stage.height = this.sh;
    this.back.clear().rect(0, 0, w, h).fill({ color: 0x07080d });
    this.drawHud();
  }

  private ctl(): Ctl {
    const inp = this.game.input, pressed = new Set<Btn>(this.vPressed), held = new Set<Btn>(this.vHeld);
    for (const a of ["up", "down", "left", "right"] as const) { if (inp.wasPressed(a)) pressed.add(a); if (inp.isHeld(a)) held.add(a); }
    if (inp.wasPressed("confirm") || inp.wasPressed("timing")) pressed.add("press");
    if (inp.isHeld("confirm") || inp.isHeld("timing")) held.add("press");
    this.vPressed.clear();
    return { pressed, held };
  }

  private confirm(): void {
    if (this.phase === "intro") { this.phase = "count"; this.t = 0; this.drawHud(); return; }
    if (this.phase === "over" && this.t > 1.2) { this.game.scenes.pop(); }
  }

  update(dt: number): void {
    this.T += dt; this.t += dt;
    const c = this.ctl();
    if (this.phase === "intro") { if (c.pressed.has("press")) this.confirm(); return; }
    if (this.phase === "count") {
      const before = Math.floor((this.t - dt) / 0.6), now = Math.floor(this.t / 0.6);
      if (now !== before && now <= 3) sfx.count(now === 3);
      if (this.t >= 2.2) { this.phase = "play"; this.t = 0; this.drawHud(); }
      return;
    }
    if (this.phase === "play") {
      if (this.game.input.wasPressed("cancel")) { this.end(); return; } // Esc stops early: what was done so far counts
      this.mini.update(dt, c);
      const st = this.mini.status(); if (st !== this.lastStatus) { this.lastStatus = st; this.drawHud(); }
      if (this.mini.done()) this.end();
      return;
    }
    for (const p of this.confetti) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; }
    if (this.phase === "over" && (c.pressed.has("press") || this.game.input.wasPressed("cancel"))) this.confirm();
  }

  private end(): void {
    this.outcome = this.finish(this.mini.score());
    this.phase = "over"; this.t = 0;
    const gid = this.outcome.grade.id;
    if (gid === "great" || gid === "perfect" || this.outcome.trait) sfx.join(); else if (gid === "good") sfx.pickup(); else sfx.bump();
    if (gid === "great" || gid === "perfect") for (let i = 0; i < 90; i++) this.confetti.push({ x: 128, y: 56, vx: (this.rng() - 0.5) * 220, vy: -40 - this.rng() * 120, c: ["#ffe39a", "#fff4dc", "#e0c070", "#b8e0a0", "#ffb070"][i % 5] });
    this.drawHud();
  }

  render(): void {
    if (!this.tex) return;
    const g = this.g, k = this.cv.width / CW; setScale(k);
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(this.bg, 0, 0);
    if (this.phase !== "intro") this.mini.draw(g, this.T, this.kith, rheaFig);
    else this.kith.draw(g, 128, 118, { t: this.T });
    if (this.phase === "play" || this.phase === "count") textFX(g, this.mini.status(), CW / 2, 8, "#f2e3c4", 5);
    if (this.phase === "count") { const n = 3 - Math.floor(this.t / 0.6); textFX(g, n > 0 ? String(n) : "GO!", CW / 2, CH / 2 - 10, "#ffe39a", 22, 1 - (this.t % 0.6) / 1.2); }
    if (this.phase === "intro") { textFX(g, this.d.name.toUpperCase(), CW / 2, 22, "#ffe39a", 10); textFX(g, `${this.k.name} · trains ${this.d.attr}`, CW / 2, 36, "#f2e3c4", 6); }
    if (this.phase === "over" && this.outcome) {
      const o = this.outcome, p = Math.min(1, this.t / 0.5);
      g.fillStyle = `rgba(8,6,4,${0.8 * p})`; g.fillRect(0, 0, this.cv.width, this.cv.height);
      for (const c of this.confetti) rect(g, c.x, c.y, 1.6, 1.2, c.c);
      const big = 10 + 16 * (1 - Math.pow(1 - p, 3)) + (o.grade.id === "perfect" ? Math.sin(this.T * 8) : 0);
      textFX(g, o.grade.name.toUpperCase(), CW / 2, 46, GRADE_COL[o.grade.id], big);
      textFX(g, `${Math.round(o.score * 100)}%`, CW / 2, 66, "#f2e3c4", 7);
      const gains = Object.entries(o.gains).map(([a, n]) => `${a.toUpperCase()} +${n}`).join("    ");
      if (gains) textFX(g, gains, CW / 2, 80, "#b8e0a0", 8);
      if (o.trait && this.t > 0.8) { const q = Math.min(1, (this.t - 0.8) / 0.4); textFX(g, `NEW TECHNIQUE: ${o.trait.replace(/-/g, " ").toUpperCase()}`, CW / 2, 98, "#fff4b0", 7 + 3 * q); sparkFX(g, CW / 2 - 70, 98, (this.t * 1.3) % 1, true); sparkFX(g, CW / 2 + 70, 98, (this.t * 1.3 + 0.5) % 1, true); }
      if (o.sick) textFX(g, "Something is wrong", CW / 2, 112, "#f2a48a", 8);
    }
    g.setTransform(1, 0, 0, 1, 0, 0); this.tex.source.update();
  }

  private drawHud(): void {
    this.hud.removeChildren().forEach((c) => c.destroy({ children: true }));
    const top = this.sy + this.sh + 6, w = this.W, small = w < 640, fs = small ? 14 : 16, pad = 16;
    const txt = (s: string, x: number, y: number, size: number, fill: string, bold = false, wrap = 0) => { const t = new Text({ text: s, style: { fontFamily: "Georgia, serif", fontSize: size, fill, fontWeight: bold ? "bold" : "normal", ...(wrap ? { wordWrap: true, wordWrapWidth: wrap, lineHeight: Math.round(size * 1.35) } : {}) } }); t.x = x; t.y = y; this.hud.addChild(t); return t; };
    const btn = (label: string, x: number, y: number, bw: number, bh: number, down: () => void, up?: () => void) => {
      const b = new Graphics().roundRect(x, y, bw, bh, 8).fill({ color: 0x1c1610, alpha: 0.95 }).roundRect(x, y, bw, bh, 8).stroke({ color: 0xe0c070, width: 1 });
      b.eventMode = "static"; b.cursor = "pointer"; b.on("pointerdown", down); if (up) { b.on("pointerup", up); b.on("pointerupoutside", up); }
      this.hud.addChild(b);
      const t = new Text({ text: label, style: { fontFamily: HUD_FONT, fontSize: fs, fill: "#f2e3c4", fontWeight: "700", align: "center" } }); t.anchor.set(0.5); t.x = x + bw / 2; t.y = y + bh / 2; this.hud.addChild(t);
    };
    if (this.phase === "intro") {
      let y = top; y += txt(this.d.text, pad, y, fs, "#d8cdb6", false, w - pad * 2).height + 6;
      y += txt(this.d.how, pad, y, fs - 1, "#e0c070", false, w - pad * 2).height + 8;
      btn("Begin", pad, y, 150, Math.max(34, Math.min(44, this.H - y - 8)), () => this.confirm());
      return;
    }
    if (this.phase === "over" && this.outcome) {
      let y = top; for (const l of this.outcome.lines) y += txt(l, pad, y, fs - 1, "#d8cdb6", false, w - pad * 2).height + 2;
      btn("Done", pad, y + 6, 150, 40, () => this.confirm());
      return;
    }
    const y = top; txt(this.d.how, pad, y, fs - 2, "#a89a80", false, w - pad * 2 - (device.touch ? 90 : 0));
    if (device.touch) btn("Stop", w - pad - 80, y, 80, 36, () => { if (this.phase === "play") this.end(); }); // Esc on a keyboard: what was done so far counts
    // touch row: the buttons this drill uses
    const bs = this.mini.buttons, bh = Math.max(40, Math.min(64, this.H - y - 40)), by = this.H - bh - 8, bw = Math.min(130, Math.floor((w - pad * 2 - (bs.length - 1) * 8) / bs.length));
    const x0 = Math.round((w - (bs.length * bw + (bs.length - 1) * 8)) / 2);
    bs.forEach((b, i) => btn(b === "press" ? (this.d.game === "carry" ? "Hold: push" : this.d.game === "ledges" ? "Leap" : this.d.game === "heave" ? "Heave" : "Lift") : ARROW[b], x0 + i * (bw + 8), by, bw, bh,
      () => { this.vPressed.add(b); this.vHeld.add(b); }, () => this.vHeld.delete(b)));
  }
}
