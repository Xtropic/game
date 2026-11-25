// A duel on the battle stage: the foe shows his stance, a ring closes while it's readable, and you answer.
//   Up      parry high          Down    parry low
//   Left    step aside (thrust) Right / Space / Enter   strike into him
// Every third exchange there's a pause to speak (each word once). Rules in duel.ts. All answers are tappable.
import { device } from "../core/device";
import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import type { Game } from "../core/game";
import type { Scene } from "../core/scene";
import { sfx } from "../audio/music";
import { openGuide, teach } from "../guide/guideScene";
import { CH, CW, HUD_FONT, backdrop, barFX, drawLook, ringFX, setScale, slashFX, sparkFX, textFX, withFlash } from "./art";
import { paintedLook } from "./painted";
import { createDuel, exchange, nextMove, pauseNow, readTime, seeFeint, speak, wordsLeft, type Answer, type DuelDef, type DuelState, type Move, type Rng } from "./duel";
import type { Attrs } from "../cast/attributes";

export type DuelResult = "won" | "yielded" | "lost";
type Phase = "intro" | "read" | "strike" | "pause" | "over";
const ANSWERS: { a: Answer; label: string; key: string }[] = [
  { a: "high", label: "Parry high", key: "↑" }, { a: "low", label: "Parry low", key: "↓" }, { a: "side", label: "Step aside", key: "←" }, { a: "strike", label: "Strike", key: "→" },
];
const TELL: Record<Move, string> = { high: "HIGH", low: "LOW", thrust: "THRUST" };

export class DuelScene implements Scene {
  readonly id = "duel";
  readonly view = new Container();
  private game!: Game;
  s: DuelState;
  private cv = document.createElement("canvas");
  private g = this.cv.getContext("2d")!;
  private bg = document.createElement("canvas");
  private tex: Texture | null = null;
  private stage = new Sprite();
  private back = new Graphics();
  private hud = new Container();
  private sx = 0; private sy = 0; private sw = 1; private sh = 1; private k = 4; private W = 800; private H = 600;
  private time = 0;
  phase: Phase = "intro";
  private introAt = 0;
  private t = 0; // into the current phase
  private move: Move = "high";
  private shown: Move = "high";
  private spotted = false;
  private lead = 1;
  private answer: Answer | null = null;
  private result: { text: string; good: boolean } | null = null;
  private fx: { kind: string; x: number; y: number; t: number; text?: string; col?: string }[] = [];
  private flash = { hero: 0, foe: 0 };
  private lunge = { hero: 0, foe: 0 };
  private pick = 0;
  private log = "";

  constructor(private def: DuelDef, private hero: { name: string; look: string; attrs: Attrs }, private onDone: (r: DuelResult, s: DuelState) => void, private rng: Rng = Math.random) {
    this.s = createDuel(def, hero);
  }

  enter(game: Game): void {
    this.game = game; this.back.eventMode = "static";
    this.view.addChild(this.back, this.stage, this.hud);
    this.stage.eventMode = "static"; this.stage.on("pointertap", () => { if (this.phase === "intro" || this.phase === "over") this.confirm(); });
    this.log = this.def.intro[0];
  }
  exit(): void { this.tex?.destroy(true); }

  resize(w: number, h: number): void {
    this.W = w; this.H = h;
    const hudH = Math.round(Math.max(130, Math.min(190, h * 0.26))), ah = h - hudH;
    this.sw = Math.min(w, (ah * 16) / 9); this.sh = (this.sw * 9) / 16; this.sx = Math.round((w - this.sw) / 2); this.sy = Math.round(Math.max(0, (ah - this.sh) / 2));
    const res = Math.min(2, window.devicePixelRatio || 1), pw = Math.min(1800, Math.round(this.sw * res)), ph = Math.round((pw * 9) / 16);
    this.cv.width = pw; this.cv.height = ph; this.k = pw / CW; this.bg.width = pw; this.bg.height = ph;
    const bgg = this.bg.getContext("2d")!; bgg.imageSmoothingEnabled = false; bgg.drawImage(backdrop(this.def.backdrop), 0, 0, pw, ph);
    this.tex?.destroy(true); this.tex = Texture.from(this.cv); this.stage.texture = this.tex;
    this.stage.x = this.sx; this.stage.y = this.sy; this.stage.width = this.sw; this.stage.height = this.sh;
    this.back.clear().rect(0, 0, w, h).fill({ color: 0x07080d });
    this.drawHud();
  }

  // ---------------- flow ----------------
  private begin(): void {
    const m = nextMove(this.s, this.rng); this.move = m.move; this.shown = m.shown;
    this.spotted = m.move !== m.shown && this.rng() < seeFeint(this.s);
    this.lead = readTime(this.s) + 0.35; this.answer = null; this.result = null; this.t = 0; this.phase = "read";
    this.log = this.s.def.foe.mount && !this.s.calmed ? "The grey gathers itself. Watch him." : `${this.s.foe.name} sets ${this.s.foe.attrs.might > this.s.foe.attrs.finesse ? "his feet" : "himself"}. Watch.`;
    this.drawHud();
  }
  /** The stance his body shows now: a feint turns at 55% of the read. */
  private showing(): Move { return this.move !== this.shown && this.t < this.lead * 0.55 ? this.shown : this.move; }

  answerWith(a: Answer): void {
    if (this.phase !== "read" || this.answer) return;
    this.answer = a; sfx.swing(); this.resolve();
  }
  private resolve(): void {
    const ex = exchange(this.s, this.move, this.answer, this.rng), F = this.s.def.foe;
    this.phase = "strike"; this.t = 0;
    if (ex.toFoe) { this.flash.foe = 1; this.lunge.hero = 1; this.fx.push({ kind: "slash", x: 168, y: 84, t: 0 }, { kind: "num", x: 168, y: 70, t: 0, text: `${ex.toFoe}`, col: "#ffe39a" }); }
    if (ex.toHero) { this.flash.hero = 1; this.lunge.foe = 1; this.fx.push({ kind: "spark", x: 92, y: 82, t: 0 }, { kind: "num", x: 92, y: 68, t: 0, text: `${ex.toHero}`, col: "#ff9a7a" }); }
    if (ex.kind === "turned") this.fx.push({ kind: "spark", x: 130, y: 80, t: 0 });
    sfx.hit();
    const extra = ex.toHero ? ` ${F.lines.hit[this.s.round % F.lines.hit.length]}` : ex.toFoe ? ` ${F.lines.hurt[this.s.round % F.lines.hurt.length]}` : "";
    this.result = { text: ex.kind === "turned" ? "Turned" : ex.kind === "trade" ? "Traded" : this.answer ? "Misread" : "Too slow", good: ex.kind === "turned" };
    this.log = ex.line + extra; this.drawHud();
  }
  private after(): void {
    if (this.s.over) { this.end(); return; }
    if (pauseNow(this.s)) { this.s.pausedAt = this.s.round; this.phase = "pause"; this.pick = 0; this.log = "You both step back, breathing. A moment to say something, or press on."; this.drawHud(); return; }
    this.begin();
  }
  private say(i: number): void {
    const ws = wordsLeft(this.s);
    if (i >= ws.length) { this.begin(); return; }
    const w = ws[i], r = speak(this.s, w.id, this.rng);
    if (r.ok) sfx.heal(); else sfx.bump();
    if (w.effect === "calm") sfx.sing();
    this.log = `${w.line} ${r.line}`; this.result = { text: r.ok ? "It lands" : "It doesn't land", good: r.ok };
    if (this.s.over) { this.end(); return; }
    this.phase = "strike"; this.t = 0.2; this.drawHud();
  }
  private end(): void {
    const o = this.s.over!, F = this.s.def.foe;
    this.phase = "over"; this.t = 0;
    this.log = o === "lost" ? `You go down. ${this.def.mustWin ? "Get up. Again." : "The crowd loses interest."}` : o === "yielded" ? F.lines.yield : F.lines.down;
    this.result = { text: o === "lost" ? this.def.lost : this.def.won, good: o !== "lost" };
    if (o !== "lost") sfx.join();
    this.drawHud();
  }
  private confirm(): void {
    if (this.phase === "intro") { this.introAt++; if (this.introAt < this.def.intro.length) { this.log = this.def.intro[this.introAt]; this.drawHud(); } else this.begin(); return; }
    if (this.phase === "pause") { this.say(this.pick); return; }
    if (this.phase === "over" && this.t > 0.6) {
      if (this.s.over === "lost" && this.def.mustWin) { this.s = createDuel(this.def, this.hero); this.introAt = this.def.intro.length; this.begin(); return; }
      this.game.scenes.pop(); this.onDone(this.s.over as DuelResult, this.s);
    }
  }

  private taught = false;
  update(dt: number): void {
    if (!this.taught) { this.taught = true; if (teach(this.game, "duels")) return; }
    if (this.phase !== "read" && this.game.input.wasPressed("guide")) { openGuide(this.game, "duels"); return; }
    this.time += dt; this.t += dt;
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < 0.8);
    for (const k of ["hero", "foe"] as const) { this.flash[k] = Math.max(0, this.flash[k] - dt * 3); this.lunge[k] = Math.max(0, this.lunge[k] - dt * 2.5); }
    const inp = this.game.input;
    if (this.phase === "read") {
      if (inp.wasPressed("up")) this.answerWith("high");
      else if (inp.wasPressed("down")) this.answerWith("low");
      else if (inp.wasPressed("left")) this.answerWith("side");
      else if (inp.wasPressed("right") || inp.wasPressed("confirm") || inp.wasPressed("timing")) this.answerWith("strike");
      else if (this.t >= this.lead) this.resolve();
    } else if (this.phase === "strike") { if (this.t > 1.1) this.after(); }
    else if (this.phase === "pause") {
      const n = wordsLeft(this.s).length + 1;
      if (inp.wasPressed("up")) { this.pick = (this.pick + n - 1) % n; this.drawHud(); }
      else if (inp.wasPressed("down")) { this.pick = (this.pick + 1) % n; this.drawHud(); }
      else if (inp.wasPressed("confirm")) this.confirm();
    } else if (inp.wasPressed("confirm") || inp.wasPressed("timing")) this.confirm();
  }

  // ---------------- drawing ----------------
  render(): void {
    if (!this.tex) return;
    const g = this.g, k = this.k, T = this.time, s = this.s; setScale(k);
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(this.bg, 0, 0);
    const F = s.def.foe, mounted = !!F.mount && !s.calmed, tell = this.phase === "read" ? this.showing() : null;
    // the hero, left, facing right
    const hx = 92 + this.lunge.hero * 14, fx = 168 - this.lunge.foe * 14, gy = 104;
    const heroDown = s.over === "lost", foeDown = s.over === "won" || s.over === "yielded";
    withFlash(g, hx, gy, this.flash.hero, (gg, x, y) => drawLook(gg, paintedLook(s.hero.look) ?? s.hero.look, x, y, { t: T, lunge: this.lunge.hero > 0.3, brace: this.answer === "high" || this.answer === "low", fall: heroDown ? Math.min(1, this.t * 2) : 0 }));
    // the foe, right, facing left; mounted, he rides the grey
    if (F.mount) {
      const mx = s.calmed ? fx + 34 : fx;
      drawLook(g, F.mount, mx, gy + 4, { t: T * 1.3, flip: true, lunge: mounted && tell === "low", brace: s.calmed });
    }
    const ry = mounted ? gy - 9 : gy;
    const pose = { t: T, flip: true, lunge: tell === "thrust" || this.lunge.foe > 0.3, brace: tell === "low", cast: tell === "high", fall: foeDown ? Math.min(1, this.t * 2) : 0 };
    withFlash(g, fx, ry, this.flash.foe, (gg, x, y) => drawLook(gg, paintedLook(F.look) ?? F.look, x, y, pose));
    // the tell, and the ring closing while it can be read
    if (this.phase === "read" && tell) {
      const rem = Math.max(0, this.lead - this.t), cy = ry - 48, col = tell === "high" ? "#ffb070" : tell === "low" ? "#9ad0ff" : "#ff8a8a";
      const wob = this.spotted && this.t < this.lead * 0.55 ? Math.sin(T * 40) * 1.2 : 0;
      textFX(g, TELL[tell], fx + wob, cy, col, 9);
      if (this.spotted && this.t < this.lead * 0.55) textFX(g, "his weight's wrong", fx, cy + 8, "#e8d8ff", 5);
      ringFX(g, 130, 60, 5, "#ffe39a", true); ringFX(g, 130, 60, 5 + (rem / this.lead) * 24, "#ffe39a");
      if (s.round < 2) textFX(g, device.taps ? "Answer with a button below before the ring closes" : "Answer before the ring closes: ↑ high · ↓ low · ← aside from a thrust · → strike   ·   G: guide", CW / 2, CH - 7, "#f2e3c4", 5);
    }
    for (const f of this.fx) {
      const p = f.t / 0.8;
      if (f.kind === "slash") slashFX(g, f.x, f.y, p, -1, true); else if (f.kind === "spark") sparkFX(g, f.x, f.y, p, true);
      else textFX(g, f.text ?? "", f.x, f.y - p * 10, f.col ?? "#fff", 9, p > 0.75 ? (1 - p) * 4 : 1);
    }
    if (this.result && this.phase !== "read") textFX(g, this.result.text, CW / 2, this.phase === "over" ? CH / 2 - 14 : 24, this.result.good ? "#ffe39a" : "#f2c4b4", this.phase === "over" ? 12 : 9);
    // guard, breath and resolve
    textFX(g, s.hero.name.toUpperCase(), 32, 7, "#f2e3c4", 5); barFX(g, 10, 10, 60, s.hero.guard / s.hero.max, "#8ad07a", 2.2); barFX(g, 10, 14, 60, s.hero.stamina / s.hero.maxSta, "#e0c070", 1.2);
    textFX(g, s.foe.name.toUpperCase(), CW - 32, 7, "#f2e3c4", 5); barFX(g, CW - 70, 10, 60, s.foe.guard / s.foe.max, "#d06a5a", 2.2); barFX(g, CW - 70, 14, 60, s.foe.resolve / 100, "#c8b8f0", 1.2);
    g.setTransform(1, 0, 0, 1, 0, 0); this.tex.source.update();
  }

  private drawHud(): void {
    this.hud.removeChildren().forEach((c) => c.destroy({ children: true }));
    const top = this.sy + this.sh + 6, w = this.W, small = w < 640, fs = small ? 14 : 16, pad = 16;
    const txt = (s: string, x: number, y: number, size: number, fill: string, bold = false, wrap = 0) => { const t = new Text({ text: s, style: { fontFamily: "Georgia, serif", fontSize: size, fill, fontWeight: bold ? "bold" : "normal", ...(wrap ? { wordWrap: true, wordWrapWidth: wrap, lineHeight: Math.round(size * 1.35) } : {}) } }); t.x = x; t.y = y; this.hud.addChild(t); return t; };
    const btn = (label: string, x: number, y: number, bw: number, bh: number, on: () => void, lit = false) => {
      const b = new Graphics().roundRect(x, y, bw, bh, 8).fill({ color: lit ? 0x3a2c18 : 0x1c1610, alpha: 0.95 }).roundRect(x, y, bw, bh, 8).stroke({ color: 0xe0c070, width: lit ? 2 : 1 });
      b.eventMode = "static"; b.cursor = "pointer"; b.on("pointertap", on); this.hud.addChild(b);
      const t = new Text({ text: label, style: { fontFamily: HUD_FONT, fontSize: fs, fill: "#f2e3c4", fontWeight: "700", align: "center", wordWrap: true, wordWrapWidth: bw - 8 } }); t.anchor.set(0.5); t.x = x + bw / 2; t.y = y + bh / 2; this.hud.addChild(t);
    };
    const logH = txt(this.log, pad, top, fs, "#d8cdb6", false, w - pad * 2).height;
    const by = top + logH + 10, room = this.H - by - 8;
    if (this.phase === "read" || this.phase === "strike") {
      const bw = Math.floor((w - pad * 2 - 18) / 4), bh = Math.max(36, Math.min(56, room));
      ANSWERS.forEach((A, i) => btn(`${A.key} ${A.label}`, pad + i * (bw + 6), by, bw, bh, () => this.answerWith(A.a), this.answer === A.a));
    } else if (this.phase === "pause") {
      const opts = [...wordsLeft(this.s).map((x) => x.label), "Press on"], bh = Math.max(30, Math.min(44, (room - 6) / opts.length - 6));
      opts.forEach((o, i) => btn(o, pad, by + i * (bh + 6), Math.min(560, w - pad * 2), bh, () => { this.pick = i; this.say(i); }, i === this.pick));
    } else btn(this.phase === "over" ? (this.s.over === "lost" && this.def.mustWin ? "Again" : "Done") : "Go on", pad, by, 160, 40, () => this.confirm());
  }
}
