// The battle scene: a stage where every move is animated, timed presses (hits, braces, song notes) are graded,
// and the rules engine (rules.ts) decides the outcome. Flow is written as generator coroutines driven by the
// fixed-step update, so animations, waits and timing windows read top to bottom.
import { keyFor, padState } from "../core/input";
import { device } from "../core/device";
import type { Loadout } from "../gear/weapons";
import { sfx } from "../audio/music";
import { openGuide, teach } from "../guide/guideScene";
import { settings } from "../core/settings";
import { buildOf, type Build } from "../art/build";
import { kithBaseline, type Kith } from "../kith/kith";
import { attrsAt, person } from "../cast/attributes";
import { Container, Graphics, Sprite, Text, Texture, type FederatedPointerEvent } from "pixi.js";
import type { Game } from "../core/game";
import type { Scene } from "../core/scene";
import {
  ART_COST, FOCUS_FULL, act, acting, alive, createBattle, endRound, foeAct, foeMove, foeQueue, gradePress, intentRead, kithOf, pressesFor, skillsFor, targetsFor, timingOf, unit,
  type BattleDef, type BattleEvent, type BattleState, type Grade, type Rng, type SkillBook, type Unit,
  autoChoice, canRelease, fleeChance, release, tryFlee } from "./rules";
import { paintedHeight, paintedLook } from "./painted";
import {
  CH, CW, HUD_FONT, LOOK_TOP, lookKind, backdrop, barFX, drawLook, dustFX, healFX, intentFX, markerFX, noteFX, projFX, ringFX, setScale, shieldFX,
  slashFX, smokeFX, sparkFX, textFX, withFlash,
} from "./art";

/** After a loss and a retry, each ally starts no lower than this share of their health. */
const RETRY_FLOOR = 0.5;

type PoseName = "idle" | "run" | "lunge" | "brace" | "aim" | "cast" | "guard" | "down" | "cheer";
interface Vis { ox: number; oy: number; kx: number; hop: number; fall: number; flash: number; pose: PoseName; run: number; flee: boolean; out: boolean; fade: number; }
interface Fx { kind: string; x: number; y: number; x2?: number; y2?: number; t: number; dur: number; text?: string; col?: string; big?: boolean; dir?: number; size?: number; proj?: string; }
interface Qte { target: string; lead: number; t: number; mode: "hit" | "brace" | "note"; grade: Grade | null; }
type Co = Generator<number | Qte, void, unknown>;

export type BattleResult = "won" | "lost" | "fled" | "released";
export interface BattleOptions { rng?: Rng; autoTiming?: boolean; levels?: Record<string, number>; gear?: Record<string, Loadout>; /** Owned kith by unit id: their raised attributes, level and build. */ kith?: Record<string, Kith>; /** What is left of each ally's health from earlier fights (0..1, by unit id). */ health?: Record<string, number>; /** Crafted arts carried (item id -> count); what was thrown comes back in the state's `used`. */ pack?: Record<string, number>; onDone?: (result: BattleResult, s: BattleState) => void; /** A fight the story doesn't need: the party may run, or let much weaker foes go. */ escape?: boolean; }

const readAuto = (): boolean => settings.get("autoTiming");

export class BattleScene implements Scene {
  readonly id = "battle";
  readonly view = new Container();
  private builds: Record<string, Build> = {};
  private game!: Game;
  s: BattleState;
  private rng: Rng;
  autoTiming: boolean;

  // drawing
  private cv = document.createElement("canvas");
  private g = this.cv.getContext("2d")!;
  private bg = document.createElement("canvas");
  private tex: Texture | null = null;
  private stageSprite = new Sprite();
  private sx = 0; private sy = 0; private sw = 1; private sh = 1; private k = 4;
  private shake = 0;
  private time = 0;
  private vis = new Map<string, Vis>();
  private fx: Fx[] = [];
  private banner: { text: string; t: number; good?: boolean } | null = null;

  // flow
  private co: Co | null = null;
  private waitLeft = 0;
  private waitingQte: Qte | null = null;
  private dt = 0;
  qte: Qte | null = null;
  private pressesSeen = 0;
  mode: "busy" | "menu" | "target" | "over" = "busy";
  cursor = 0;
  tcursor = 0;
  private choice: { skill: string; target: string } | null = null;
  /** Auto battle: each ally's move is chosen for them (and timing is automatic). */
  private autoBattle = settings.get("autoBattle");

  // HUD
  private hud = new Container();
  private backFill = new Graphics();
  private panel = new Graphics();
  private cmdTitle = new Text({ text: "", style: { fontFamily: HUD_FONT, fontSize: 18, fill: "#f2e3c4", fontWeight: "700" } });
  private cmdItems: Text[] = [];
  private cmdNote = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 14, fill: "#bfae8e", fontStyle: "italic" } });
  private logText = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 15, fill: "#d8cdb6", wordWrap: true, wordWrapWidth: 300, lineHeight: 21 } });
  private party = new Graphics();
  private partyText: Text[] = [];
  private hint = new Text({ text: "", style: { fontFamily: HUD_FONT, fontSize: 14, fill: "#9a8e78" } });
  private hudRect = { x: 0, y: 0, w: 0, h: 0 };
  private narrow = false;
  private barW = 110;
  /** Touch screens: commands are framed buttons big enough for a thumb, and there are buttons for what keys do. */
  private touchHud = false;
  private cmdBgs: Graphics[] = [];
  private touchBar = new Container();
  /** Where the party's health goes on a touch screen: beside the stage when there's room, else in the panel. */
  private partyAt: { x: number; y: number; w: number } | null = null;

  constructor(private def: BattleDef, private book: SkillBook, private opts: BattleOptions = {}) {
    this.rng = opts.rng ?? Math.random;
    this.autoTiming = opts.autoTiming ?? readAuto();
    this.s = createBattle(def, book, this.rng, opts.levels, opts.gear, opts.kith, opts.health, opts.pack);
    // each fighter's look follows their attributes (cast and owned kith); the rest are drawn as designed
    for (const u of this.s.units) {
      const k = u.kith ? opts.kith?.[u.id] : undefined, start = u.cast ? person(u.cast)?.level : undefined;
      if (k) this.builds[u.id] = buildOf(u.stats!, { level: u.level, rings: k.lull ? 1 : 0, baseline: kithBaseline(k) });
      else if (u.stats && u.cast && start) this.builds[u.id] = buildOf(u.stats, { level: u.level, baseline: attrsAt(u.cast, start) });
    }
  }

  enter(game: Game): void {
    this.game = game;
    this.backFill.eventMode = "static"; // also stops taps reaching the map underneath
    this.view.addChild(this.backFill, this.stageSprite, this.hud);
    this.hud.addChild(this.panel, this.cmdTitle, this.cmdNote, this.logText, this.party, this.hint, this.touchBar);
    this.hint.eventMode = "static"; this.hint.cursor = "pointer"; this.hint.on("pointertap", (e: FederatedPointerEvent) => { const lx = e.global.x - this.hint.x; if (lx > this.hint.width / 2) this.toggleAutoBattle(); else this.toggleAuto(); });
    this.stageSprite.eventMode = "static";
    this.stageSprite.on("pointerdown", (e: FederatedPointerEvent) => this.tapStage(e.global.x, e.global.y));
    this.reset();
  }
  exit(): void { this.tex?.destroy(true); }

  private reset(): void {
    // after a loss the party falls back and binds its wounds: the retry starts as hurt as they came in, but never below half
    const back = Object.fromEntries(Object.entries(this.opts.health ?? {}).map(([k, v]) => [k, Math.max(RETRY_FLOOR, v)]));
    this.s = createBattle(this.def, this.book, this.rng, this.opts.levels, this.opts.gear, this.opts.kith, back, this.opts.pack);
    this.vis.clear(); this.fx = [];
    for (const u of this.s.units) this.vis.set(u.id, { ox: u.side === "ally" ? -70 : 80, oy: 0, kx: 0, hop: 0, fall: 0, flash: 0, pose: "run", run: 0, flee: false, out: false, fade: 1 });
    this.mode = "busy"; this.choice = null; this.qte = null;
    this.co = this.flow();
  }

  // ---------------- layout ----------------
  resize(w: number, h: number): void {
    this.touchHud = device.touch;
    let hudH = this.touchHud && w > h ? Math.round(Math.max(124, Math.min(170, h * 0.3))) : Math.round(Math.max(150, Math.min(210, h * 0.27)));
    const ah = h - hudH;
    this.sw = Math.min(w, (ah * 16) / 9); this.sh = (this.sw * 9) / 16;
    this.sx = Math.round((w - this.sw) / 2); this.sy = Math.round(Math.max(0, (ah - this.sh) / 2));
    if (h > w * 1.2) { // tall phone: stage near the top, the HUD takes the rest of the screen
      this.sy = Math.round(Math.min(h * (this.touchHud ? 0.06 : 0.12), this.touchHud ? 50 : 90)); hudH = Math.max(hudH, Math.round(h - this.sy - this.sh - 8));
    }
    const res = Math.min(2, window.devicePixelRatio || 1);
    const pw = Math.min(1800, Math.round(this.sw * res)), ph = Math.round((pw * 9) / 16);
    this.cv.width = pw; this.cv.height = ph; this.k = pw / CW;
    this.bg.width = pw; this.bg.height = ph;
    const bgg = this.bg.getContext("2d")!; bgg.imageSmoothingEnabled = false; bgg.drawImage(backdrop(this.def.backdrop), 0, 0, pw, ph);
    this.tex?.destroy(true);
    this.tex = Texture.from(this.cv); this.stageSprite.texture = this.tex;
    this.stageSprite.x = this.sx; this.stageSprite.y = this.sy; this.stageSprite.width = this.sw; this.stageSprite.height = this.sh;
    this.hudRect = { x: 0, y: h - hudH, w, h: hudH };
    this.backFill.clear().rect(0, 0, w, h).fill({ color: 0x07080d });
    this.layoutHud();
  }

  private layoutHud(): void {
    const { x, y, w, h } = this.hudRect;
    this.panel.clear().rect(x, y, w, h).fill({ color: 0x110d0b }).moveTo(x, y + 0.5).lineTo(x + w, y + 0.5).stroke({ color: 0x6b5236, width: 2 });
    const narrow = w < 720;
    this.narrow = narrow;
    const col1 = Math.max(220, Math.min(340, w * 0.34)), col3 = Math.max(170, Math.min(280, w * 0.3));
    this.cmdTitle.x = x + 20; this.cmdTitle.y = y + 12;
    this.cmdNote.x = x + 20; this.cmdNote.y = y + h - (narrow ? 58 : 28); this.cmdNote.style.wordWrap = true; this.cmdNote.style.wordWrapWidth = narrow ? w - 40 : col1 + 260;
    this.logText.visible = !narrow;
    this.logText.x = x + col1 + 24; this.logText.y = y + 14; this.logText.style.wordWrapWidth = Math.max(120, w - col1 - col3 - 60);
    this.party.x = narrow ? x + Math.round(w * 0.5) : x + w - col3 - 20; this.party.y = y + (narrow ? 44 : 14);
    this.barW = narrow ? Math.max(50, Math.min(110, w * 0.5 - 100)) : 110;
    this.hint.x = x + w - 20; this.hint.y = y + h - 24; this.hint.anchor.set(1, 0);
    this.partyAt = null;
    if (this.touchHud) {
      this.logText.visible = false;
      const gutter = this.sx - 8, tall = this.game.height > this.game.width * 1.2;
      if (!tall && gutter >= 150) this.partyAt = { x: this.sx + this.sw + 10, y: 12, w: Math.min(220, gutter - 4) }; // beside the stage, right
      this.cmdNote.style.wordWrapWidth = w - 40;
    }
  }

  // ---------------- positions ----------------
  private pos(u: Unit): [number, number] { const v = this.vis.get(u.id)!; return [u.at[0] + v.ox + v.kx, u.at[1] + v.oy - v.hop]; }
  private top(u: Unit): number { return this.pos(u)[1] - (paintedHeight(lookKind(paintedLook(u.look, u.species) ?? "")) ?? LOOK_TOP[lookKind(u.look)] ?? 40); }
  private dirOf(u: Unit): number { return u.side === "ally" ? 1 : -1; }

  // ---------------- coroutines ----------------
  private *frames(dur: number, step: (p: number) => void): Co {
    let e = 0; step(0);
    while (e < dur) { yield 0; e += this.dt; step(Math.min(1, e / dur)); }
  }
  private *moveTo(id: string, tx: number, ty: number, dur: number, hop = 0): Co {
    const u = unit(this.s, id), v = this.vis.get(id)!, fx0 = v.ox, fy0 = v.oy, gx = tx - u.at[0], gy = ty - u.at[1];
    v.pose = "run"; const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
    yield* this.frames(dur, (p) => { const e = ease(p); v.ox = fx0 + (gx - fx0) * e; v.oy = fy0 + (gy - fy0) * e; v.hop = hop ? Math.sin(p * Math.PI) * hop : 0; });
    v.hop = 0;
  }
  private *goHome(id: string): Co { const u = unit(this.s, id); yield* this.moveTo(id, u.at[0], u.at[1], 0.34); const v = this.vis.get(id)!; if (alive(u)) v.pose = "idle"; }
  /** Opens a timing ring on the target; resumes at the moment of impact with the grade. */
  private *timed(target: string, lead: number, mode: Qte["mode"]): Generator<number | Qte, Grade, unknown> {
    const q: Qte = { target, lead, t: 0, mode, grade: null };
    this.qte = q; yield q; this.qte = null;
    const g = q.grade ?? "none";
    const u = unit(this.s, target), [x] = this.pos(u), label = { perfect: mode === "brace" ? "Perfect brace!" : "Perfect!", good: mode === "brace" ? "Braced" : "Good", early: "Too early", late: "Late", none: "" }[g];
    if (label) this.addFx({ kind: "grade", x, y: this.top(u) - 4, dur: 0.9, text: label, col: g === "perfect" || g === "good" ? "#ffe39a" : "#c8b8a8", size: 6.5 });
    return g;
  }
  private addFx(f: Omit<Fx, "t">): void { this.fx.push({ ...f, t: 0 }); }

  private *flow(): Co {
    // everyone runs onto the stage
    yield* this.frames(0.7, (p) => { const e = 1 - (1 - p) * (1 - p); for (const u of this.s.units) { const v = this.vis.get(u.id)!; v.ox = (u.side === "ally" ? -70 : 80) * (1 - e); } });
    for (const v of this.vis.values()) v.pose = "idle";
    this.say(this.s.def.name, false);
    for (;;) {
      if (this.s.phase === "ally") {
        const u = acting(this.s)!;
        this.say(`${u.name}'s turn`, true);
        this.mode = "menu"; this.cursor = Math.min(this.cursor, this.cmds(u).length - 1); this.choice = null;
        let waited = 0;
        while (!this.choice) { if (this.autoBattle && (waited += this.dt) > 0.35) this.choice = autoChoice(this.s, this.book, u); yield 0; }
        this.mode = "busy";
        const c = this.choice as { skill: string; target: string };
        if (c.skill === "run" || c.skill === "release") { if (yield* this.leave(c.skill)) return; continue; }
        yield* this.allyMove(u, c.skill, c.target);
      } else if (this.s.phase === "foe") {
        this.say(this.s.firstStrike ? "They move first" : "Their move", false);
        yield 0.35;
        for (const f of foeQueue(this.s).slice()) {
          if (this.s.phase !== "foe") break;
          if (!alive(f)) continue;
          yield* this.foeMove(f);
          yield 0.18;
        }
        if (this.s.phase === "foe") {
          endRound(this.s, this.book, this.rng);
          const back = this.s.units.filter((u) => alive(u) && (this.vis.get(u.id)!.ox !== 0 || this.vis.get(u.id)!.oy !== 0));
          for (const u of back) this.co2.push(this.goHome(u.id));
          yield 0.36;
        }
      } else {
        yield* this.finish();
        return;
      }
    }
  }
  /** Running, or letting the foes go. True when the fight is over. */
  private *leave(how: "run" | "release"): Generator<number | Qte, boolean, unknown> {
    if (how === "release") {
      for (const id of release(this.s)) { const u = unit(this.s, id); this.vis.get(id)!.flee = true; this.co2.push(this.moveTo(id, u.at[0] + 160, u.at[1], 1.1)); }
      this.say("You let them go", true); yield 1.2;
    } else {
      if (!tryFlee(this.s, this.rng)) { this.say("No way out!", false); yield 0.6; return false; }
      for (const u of this.s.units) if (u.side === "ally" && alive(u)) { this.vis.get(u.id)!.pose = "run"; this.co2.push(this.moveTo(u.id, u.at[0] - 150, u.at[1], 0.8)); }
      this.say("You get away", false); yield 1;
    }
    this.mode = "over";
    return true;
  }

  /** What the acting ally can choose: their skills, then Run and Let them go in fights the story doesn't need. */
  private cmds(u: Unit): string[] {
    const ks = skillsFor(this.s, u, this.book);
    if (!this.opts.escape) return ks;
    return [...ks, "run", ...(canRelease(this.s) ? ["release"] : [])];
  }
  private entry(k: string): { name: string; note: string; kind?: string } {
    if (k === "run") return { name: "Run", note: `Try to get away (about ${Math.round(fleeChance(this.s) * 100)}% chance). If it fails, they get a free turn.` };
    if (k === "release") return { name: "Let them go", note: "They're no match for you. Stand aside and let them leave. No fight, and nothing learned from it." };
    return this.book[k];
  }
  private isCmd(k: string): boolean { return k === "run" || k === "release"; }

  /** Side coroutines that run alongside the main flow (e.g. everyone walking home at once). */
  private co2: Co[] = [];

  private *allyMove(u: Unit, k: string, tid: string): Co {
    const sk = this.book[k], t = unit(this.s, tid), dir = this.dirOf(u), v = this.vis.get(u.id)!;
    const run = (grades: Grade[]) => this.play(act(this.s, this.book, u.id, k, tid, grades, this.rng));
    if (sk.kind === "melee") {
      const [tx, ty] = this.pos(t);
      yield* this.moveTo(u.id, tx - dir * 17, ty + 1, 0.38);
      v.pose = "lunge";
      const g = yield* this.timed(tid, 0.46, "hit");
      const [hx, hy] = this.pos(t);
      this.addFx({ kind: "slash", x: hx, y: hy, dir, dur: 0.28, big: g === "perfect" });
      if (g === "perfect") yield 0.09;
      yield* run([g]);
      yield 0.26; yield* this.goHome(u.id);
    } else if (sk.kind === "ranged") {
      v.pose = "aim"; yield 0.24;
      const [ax, ay] = this.pos(u), [tx, ty] = this.pos(t);
      this.addFx({ kind: "proj", proj: sk.proj ?? "stone", x: ax + dir * 6, y: ay - 30, x2: tx, y2: ty - 22, dur: 0.5 });
      const g = yield* this.timed(tid, 0.5, "hit");
      if (g === "perfect") yield 0.09;
      yield* run([g]);
      v.pose = "idle"; yield 0.26;
    } else if (sk.kind === "stun") {
      v.pose = "aim"; yield 0.2;
      const [ax, ay] = this.pos(u), [tx, ty] = this.pos(t);
      this.addFx({ kind: "proj", proj: "pot", x: ax, y: ay - 30, x2: tx, y2: ty - 14, dur: 0.52 });
      yield 0.52;
      this.addFx({ kind: "smoke", x: tx, y: ty, dur: 1.3 });
      yield* run([]); v.pose = "idle"; yield 0.45;
    } else if (sk.kind === "heal") {
      v.pose = "cast"; const [ax, ay] = this.pos(u); this.addFx({ kind: "ring", x: ax, y: ay, dur: 0.6 }); yield 0.32;
      yield* run([]); yield 0.5; v.pose = "idle";
    } else if (sk.kind === "guard") {
      const [tx, ty] = this.pos(t); yield* this.moveTo(u.id, tx + dir * 18, ty + 2, 0.38);
      yield* run([]); v.pose = "guard"; yield 0.42;
    } else if (sk.kind === "song") {
      v.pose = "cast"; const grades: Grade[] = [];
      for (let i = 0; i < 3; i++) {
        const g = yield* this.timed(tid, i === 0 ? 0.56 : 0.42, "note"); grades.push(g);
        const [x, y] = this.pos(u), [tx, ty] = this.pos(t); this.addFx({ kind: "note", x: x + 5, y: y - 46, x2: tx, y2: ty - 24, dur: 0.9 });
      }
      v.pose = "idle";
      yield* run(grades); yield 0.5;
    } else if (sk.kind === "finisher" || sk.kind === "craft") {
      // a moment of stillness, a flash of the move's name, then the blow or the throw
      const [ux, uy] = this.pos(u);
      v.pose = sk.kind === "craft" || sk.proj ? "aim" : "cast";
      this.addFx({ kind: "ring", x: ux, y: uy, dur: 0.5 });
      this.addFx({ kind: "grade", x: ux, y: this.top(u) - 6, text: sk.name, col: "#ffd890", dur: 1, size: 7.5 });
      yield 0.34;
      if (sk.kind === "craft" || sk.proj) {
        const [tx, ty] = this.pos(t);
        this.addFx({ kind: "proj", proj: sk.proj ?? "pot", x: ux + dir * 6, y: uy - 30, x2: tx, y2: ty - 18, dur: 0.5 });
        const g = yield* this.timed(tid, 0.5, "hit");
        if (sk.kind === "craft" && sk.proj === "pot") this.addFx({ kind: sk.stun ? "smoke" : "spark", x: tx, y: ty - 10, dur: 0.8, big: true });
        yield* run([g]); v.pose = "idle"; yield 0.4;
      } else {
        const [tx, ty] = this.pos(t);
        yield* this.moveTo(u.id, tx - dir * 17, ty + 1, 0.28);
        v.pose = "lunge";
        const g = yield* this.timed(tid, 0.42, "hit");
        const [hx, hy] = this.pos(t); this.addFx({ kind: "slash", x: hx, y: hy, dir, dur: 0.32, big: true });
        if (g === "perfect") yield 0.12;
        yield* run([g]); yield 0.3; yield* this.goHome(u.id);
      }
    } else if (sk.kind === "art") {
      const kin = kithOf(this.s, u)!;
      v.pose = "cast"; const [ux, uy] = this.pos(u); this.addFx({ kind: "note", x: ux + 5, y: uy - 46, x2: this.pos(kin)[0], y2: this.pos(kin)[1] - 24, dur: 0.7 });
      this.addFx({ kind: "grade", x: ux, y: this.top(u) - 6, text: sk.name, col: "#ffd890", dur: 1, size: 7.5 });
      yield 0.38; v.pose = "idle";
      const [fx0, fy0] = this.pos(t); yield* this.moveTo(kin.id, fx0 - 30, fy0 + 4, 0.34);
      const g = yield* this.timed(tid, 0.42, "hit");
      this.charging = kin.id;
      yield* run([g]);
      this.charging = null;
      yield 0.3; yield* this.goHome(kin.id);
    } else if (sk.kind === "call") {
      const kin = kithOf(this.s, u)!, first = targetsFor(this.s, this.book, u, "call")[0];
      v.pose = "cast"; const [ux, uy] = this.pos(u); this.addFx({ kind: "note", x: ux + 5, y: uy - 46, x2: this.pos(kin)[0], y2: this.pos(kin)[1] - 24, dur: 0.7 });
      this.addFx({ kind: "grade", x: ux, y: this.top(u) - 6, text: "Ash!", col: "#ffd890", dur: 0.9, size: 8 });
      yield 0.38; v.pose = "idle";
      const [fx0, fy0] = this.pos(first); yield* this.moveTo(kin.id, fx0 - 30, fy0 + 4, 0.36);
      const g = yield* this.timed(first.id, 0.42, "hit");
      this.charging = kin.id;
      yield* run([g]);
      this.charging = null;
      yield 0.3; yield* this.goHome(kin.id);
    }
  }
  private charging: string | null = null;

  private *foeMove(f: Unit): Co {
    const mv = foeMove(this.s, this.book, f.id, this.rng), v = this.vis.get(f.id)!, dir = this.dirOf(f);
    if (mv === "stunned") {
      const [x] = this.pos(f); this.addFx({ kind: "grade", x, y: this.top(f) - 4, text: "Blinded: loses its move", col: "#c8b8a8", dur: 1, size: 6 });
      v.pose = "brace"; yield* this.play(foeAct(this.s, this.book, f.id, "none", this.rng)); yield 0.65; v.pose = "idle"; return;
    }
    if (!mv) return;
    const sk = this.book[mv.skill], t = unit(this.s, mv.target);
    const run = (g: Grade) => this.play(foeAct(this.s, this.book, f.id, g, this.rng));
    if (sk.kind === "melee" || sk.kind === "pounce") {
      const [tx, ty] = this.pos(t);
      yield* this.moveTo(f.id, tx - dir * 22, ty + 1, sk.kind === "pounce" ? 0.44 : 0.38, sk.kind === "pounce" ? 20 : 0);
      v.pose = "lunge";
      const g = yield* this.timed(t.id, 0.52, "brace");
      const [hx, hy] = this.pos(t); this.addFx({ kind: "slash", x: hx, y: hy, dir, dur: 0.28 });
      yield* run(g); f.intent = null;
      yield 0.26; if (alive(f)) yield* this.goHome(f.id);
    } else if (sk.kind === "ranged") {
      v.pose = "aim"; yield 0.24;
      const [ax, ay] = this.pos(f), [tx, ty] = this.pos(t);
      this.addFx({ kind: "proj", proj: sk.proj ?? "stone", x: ax + dir * 6, y: ay - 30, x2: tx, y2: ty - 22, dur: 0.56 });
      const g = yield* this.timed(t.id, 0.56, "brace");
      yield* run(g); v.pose = "idle"; yield 0.26;
    } else { yield* run("none"); }
  }

  /** Shows what the rules decided: numbers, flashes, knockback, falls, follow-ups, routs. */
  private *play(ev: BattleEvent[]): Co {
    for (const e of ev) {
      if (e.t === "hit") {
        const t = unit(this.s, e.target), by = unit(this.s, e.by), tv = this.vis.get(t.id)!;
        if (this.charging === by.id) { const [tx, ty] = this.pos(t); yield* this.moveTo(by.id, tx - 14, ty + 2, 0.15); this.vis.get(by.id)!.pose = "lunge"; this.addFx({ kind: "slash", x: tx, y: ty, dir: 1, dur: 0.28 }); }
        if (e.redirected) { const [cx] = this.pos(t); this.addFx({ kind: "shield", x: cx, y: this.pos(t)[1], dur: 0.5 }); this.addFx({ kind: "grade", x: cx, y: this.top(t) - 2, text: e.redirected === "cover" ? "Cover" : "Guard", col: "#a8d8ff", dur: 0.9, size: 6 }); }
        const [x, y] = this.pos(t);
        this.addFx({ kind: "num", x, y: this.top(t) + 8, text: String(e.amt), col: t.side === "ally" ? "#ff9a7a" : "#fff2c8", dur: 1, big: e.amt >= 12 });
        e.tags.forEach((tg, i) => this.addFx({ kind: "grade", x, y: this.top(t) - 2 - i * 6.5, text: tg, col: "#ffe39a", dur: 1, size: 5.5 }));
        this.addFx({ kind: "spark", x, y: y - 16, dur: 0.3, big: e.amt >= 12 });
        tv.flash = 1; tv.kx = this.dirOf(t) * -6; sfx.hit();
        this.shake = Math.min(3, 0.8 + e.amt * 0.12);
        yield 0.12;
      } else if (e.t === "dodge") {
        const t = unit(this.s, e.target), by = unit(this.s, e.by), tv = this.vis.get(t.id)!, [x] = this.pos(t);
        if (this.charging === by.id) { const [tx, ty] = this.pos(t); yield* this.moveTo(by.id, tx - 14, ty + 2, 0.15); this.vis.get(by.id)!.pose = "lunge"; }
        this.addFx({ kind: "grade", x, y: this.top(t) + 4, text: "Dodged", col: "#c8f0ff", dur: 1, size: 6 });
        this.co2.push(this.frames(0.3, (p) => { tv.kx = Math.sin(p * Math.PI) * this.dirOf(t) * -9; }));
        yield 0.12;
      } else if (e.t === "follow") {
        const kin = unit(this.s, e.by), t = unit(this.s, e.target), [tx, ty] = this.pos(t);
        yield* this.moveTo(kin.id, tx - 26, ty + 10, 0.3); this.vis.get(kin.id)!.pose = "lunge"; yield 0.14;
        this.co2.push((function* (self: BattleScene) { yield 0.35; yield* self.goHome(kin.id); })(this));
      } else if (e.t === "down") {
        // the fallen drop; beaten foes then fade from the field, allies stay down where they fell
        const v = this.vis.get(e.id)!, foe = unit(this.s, e.id).side === "foe"; v.pose = "down";
        this.co2.push((function* (self: BattleScene): Co { yield* self.frames(0.38, (p) => { v.fall = p; }); if (!foe) return; yield 0.35; yield* self.frames(0.6, (p) => { v.fade = 1 - p; }); v.out = true; })(this));
      } else if (e.t === "bolt") {
        const u = unit(this.s, e.id), v = this.vis.get(e.id)!; v.flee = true; this.co2.push(this.moveTo(u.id, u.at[0] - 140, u.at[1], 0.8));
        this.addFx({ kind: "grade", x: this.pos(u)[0], y: this.top(u), text: `${u.name} bolts`, col: "#c8b8a8", dur: 1.1, size: 6 });
      } else if (e.t === "heal" || e.t === "steady") {
        const t = unit(this.s, e.target), [x, y] = this.pos(t);
        if (e.amt) this.addFx({ kind: "num", x, y: this.top(t) + 8, text: "+" + e.amt, col: "#a8e89a", dur: 1 });
        this.addFx({ kind: "heal", x, y, dur: 0.9 }); sfx.heal();
        if (e.t === "steady") this.addFx({ kind: "grade", x, y: this.top(t) - 4, text: "Steadied: next hit x1.5", col: "#ffe39a", dur: 1.3, size: 5.5 });
      } else if (e.t === "stun") {
        const t = unit(this.s, e.target), [x] = this.pos(t); this.addFx({ kind: "grade", x, y: this.top(t) - 4, text: "Blinded", col: "#c8c8b8", dur: 1, size: 6 });
      } else if (e.t === "guard") {
        const g = unit(this.s, e.by), [x, y] = this.pos(g); this.addFx({ kind: "shield", x, y, dur: 0.7 });
      } else if (e.t === "calm") {
        const t = unit(this.s, e.target), [x] = this.pos(t);
        this.addFx({ kind: "grade", x, y: this.top(t) - 4, text: e.left ? "Calmed" : `Calming ${Math.round(e.calm)}%`, col: "#ffe6a8", dur: 1.3, size: 6 });
        if (e.left) { const v = this.vis.get(t.id)!; v.flee = true; this.co2.push(this.moveTo(t.id, t.at[0] + 150, t.at[1], 0.9)); }
      } else if (e.t === "bondReady") {
        const r = unit(this.s, "rhea"); this.addFx({ kind: "grade", x: this.pos(r)[0], y: this.top(r) - 10, text: "Call ready: Ash will come", col: "#ffd890", dur: 1.6, size: 6 });
      } else if (e.t === "rout") {
        this.addFx({ kind: "grade", x: CW / 2, y: 40, text: "NERVE BROKEN", col: "#ffd890", dur: 1.8, size: 10 });
        for (const id of e.ids) { const u = unit(this.s, id), v = this.vis.get(id)!; v.flee = true; this.co2.push(this.moveTo(id, u.at[0] + 160, u.at[1], 0.8)); }
      } else if (e.t === "stumble") {
        /* shown by foeMove */
      }
    }
  }

  private *finish(): Co {
    const won = this.s.phase === "won";
    yield 0.9;
    if (won) for (const u of this.s.units) if (u.side === "ally" && alive(u)) this.vis.get(u.id)!.pose = "cheer";
    this.say(won ? (this.s.routed ? "They break and run" : this.def.won ?? "The trail goes quiet") : this.def.lost ?? "Driven back up the trail", won);
    this.mode = "over";
  }

  private say(text: string, good: boolean): void { this.banner = { text, t: 0, good }; }

  // ---------------- input ----------------
  private press(): void {
    const q = this.qte; if (!q || q.grade) return;
    const presser = q.mode === "brace" ? unit(this.s, q.target) : acting(this.s); // finesse widens the window
    q.grade = gradePress(q.t - q.lead, presser ? timingOf(presser) : 1); this.pressesSeen++;
  }

  /** "How it works" cards: the basics before the first blow, the rest the first time each one is there to use,
   *  always between moves (never while a ring is closing). */
  private taughtStart = false;
  private teachNow(): boolean {
    const s = this.s, ids: string[] = [];
    if (!this.taughtStart) {
      this.taughtStart = true; ids.push("battles");
      if (this.opts.escape) ids.push("leaving");
      const sings = s.units.some((u) => u.side === "ally" && u.skills.some((k) => this.book[k]?.kind === "song"));
      if (sings && s.units.some((u) => u.side === "foe" && u.species)) ids.push("wild");
      if (Object.values(s.pack).some((n) => n > 0)) ids.push("thrown");
    } else if (this.mode === "menu") {
      const u = acting(s);
      if (u && (s.focus[u.id] ?? 0) >= FOCUS_FULL) ids.push("focus");
      if (u && kithOf(s, u) && s.bond >= ART_COST) ids.push("kithcall");
    }
    return ids.length > 0 && teach(this.game, ...ids);
  }

  private toggleAuto(): void {
    this.autoTiming = !this.autoTiming;
    settings.set("autoTiming", this.autoTiming);
    this.say(this.autoTiming ? "Auto timing on" : "Auto timing off", true);
  }

  private toggleAutoBattle(): void {
    this.autoBattle = !this.autoBattle;
    settings.set("autoBattle", this.autoBattle);
    this.say(this.autoBattle ? "Auto battle on" : "Auto battle off", true);
  }

  private tapStage(gx: number, gy: number): void {
    if (this.qte) { this.press(); return; }
    if (this.mode === "over") { this.done(); return; }
    if (this.mode !== "target" && this.mode !== "menu") return;
    const u = acting(this.s); if (!u) return;
    const k = this.cmds(u)[this.cursor]; if (this.isCmd(k)) return;
    const ts = targetsFor(this.s, this.book, u, k);
    const sx = ((gx - this.sx) / this.sw) * CW, sy = ((gy - this.sy) / this.sh) * CH;
    let best: Unit | null = null, bd = 30;
    for (const t of ts) { const [x, y] = this.pos(t), d = Math.hypot(x - sx, y - 18 - sy); if (d < bd) { bd = d; best = t; } }
    if (best) this.choice = { skill: k, target: best.id };
  }

  private done(): void {
    if (this.s.phase === "lost" && !this.s.escaped) { this.reset(); return; }
    const s = this.s, cb = this.opts.onDone;
    this.game.scenes.pop();
    cb?.(s.escaped ?? "won", s);
  }

  update(dt: number): void {
    const inp = this.game.input;
    if (!this.qte && this.teachNow()) return;
    if (inp.wasPressed("guide") && !this.qte) { openGuide(this.game, "battles"); return; }
    this.dt = dt; this.time += dt;
    if (inp.wasPressed("timing")) this.toggleAuto();
    if (inp.wasPressed("auto")) this.toggleAutoBattle();
    // timing window
    if (this.qte) {
      const q = this.qte; q.t += dt;
      if (inp.wasPressed("confirm")) this.press();
      if (!q.grade && (this.autoTiming || this.autoBattle) && q.t >= q.lead) q.grade = "good";
      if (!q.grade && q.t >= q.lead + 0.17) q.grade = "none";
    } else if (this.mode === "menu" || this.mode === "target") {
      const u = acting(this.s)!, ks = this.cmds(u);
      if (this.mode === "menu") {
        if (inp.wasPressed("up")) this.cursor = (this.cursor + ks.length - 1) % ks.length;
        if (inp.wasPressed("down")) this.cursor = (this.cursor + 1) % ks.length;
        if (inp.wasPressed("confirm") && this.isCmd(ks[this.cursor])) this.choice = { skill: ks[this.cursor], target: "" };
        else if (inp.wasPressed("confirm")) { this.mode = "target"; const ts = targetsFor(this.s, this.book, u, ks[this.cursor]); this.tcursor = Math.max(0, ts.findIndex((t) => t.side !== u.side)); }
      } else {
        const ts = targetsFor(this.s, this.book, u, ks[this.cursor]);
        if (inp.wasPressed("left") || inp.wasPressed("up")) this.tcursor = (this.tcursor + ts.length - 1) % ts.length;
        if (inp.wasPressed("right") || inp.wasPressed("down")) this.tcursor = (this.tcursor + 1) % ts.length;
        if (inp.wasPressed("cancel")) this.mode = "menu";
        else if (inp.wasPressed("confirm") && ts.length) this.choice = { skill: ks[this.cursor], target: ts[Math.min(this.tcursor, ts.length - 1)].id };
      }
    } else if (this.mode === "over" && inp.wasPressed("confirm")) { this.done(); return; }

    // the battle speed setting hurries the animations along, but never a timing ring
    if (!this.qte) { dt *= settings.get("battleSpeed"); this.dt = dt; }
    // coroutines
    this.co2 = this.co2.filter((c) => !c.next().done);
    if (this.co) {
      if (this.waitingQte) { if (this.waitingQte.grade && this.waitingQte.t >= this.waitingQte.lead) this.waitingQte = null; }
      else if (this.waitLeft > 0) this.waitLeft -= dt;
      if (!this.waitingQte && this.waitLeft <= 0) {
        const r = this.co.next();
        if (r.done) this.co = null;
        else if (typeof r.value === "number") this.waitLeft = r.value;
        else this.waitingQte = r.value;
      }
    }
    // decays
    for (const u of this.s.units) {
      const v = this.vis.get(u.id)!;
      v.flash = Math.max(0, v.flash - dt * 4); v.kx *= Math.pow(0.0005, dt);
      if (v.pose === "run") v.run += dt * 14;
      if (v.flee && Math.abs(v.ox) > 120) v.out = true;
    }
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.dur);
    this.shake = Math.max(0, this.shake - dt * 10);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.2 && this.mode !== "over") this.banner = null; }
  }

  // ---------------- drawing ----------------
  render(): void {
    if (!this.tex) return;
    const g = this.g, k = this.k; setScale(k);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.bg, 0, 0);
    if (this.shake > 0.05) g.translate((Math.random() - 0.5) * this.shake * k, (Math.random() - 0.5) * this.shake * k * 0.6);
    const s = this.s, T = this.time;
    const order = s.units.filter((u) => !this.vis.get(u.id)!.out).sort((a, b) => this.pos(a)[1] - this.pos(b)[1]);
    for (const u of order) {
      const v = this.vis.get(u.id)!, [x, y] = this.pos(u);
      const lk = lookKind(u.look);
      const paint = paintedLook(u.look, u.species);
      const flip = paint ? (u.side === "foe" ? !v.flee : v.flee) : lk === "ash" ? v.flee : lk === "loftbuck" ? (u.side === "foe" ? !v.flee : v.flee) : lk === "reedcat" ? v.flee : u.side === "foe" ? !v.flee : v.flee;
      const pose = { t: T + x * 0.1, run: v.pose === "run" ? v.run : 0, lunge: v.pose === "lunge", brace: v.pose === "brace" || v.pose === "guard" || (this.qte?.mode === "brace" && this.qte.target === u.id), bow: v.pose === "aim" && u.look === "archer" ? 1 : undefined, cast: v.pose === "cast" || v.pose === "aim" && u.look !== "archer" || v.pose === "cheer", shout: v.pose === "cheer", flash: v.flash, flip, fall: v.fall };
      g.save(); g.globalAlpha = v.fade;
      withFlash(g, x, y, v.flash, (gg, xx, yy) => drawLook(gg, paint ?? u.look, xx, yy, pose, this.builds[u.id]));
      g.restore();
    }
    // foe HP bars and intents
    for (const u of s.units) {
      if (u.side !== "foe" || !alive(u)) continue;
      const [x, y] = this.pos(u), v = this.vis.get(u.id)!; if (v.flee) continue;
      barFX(g, x - 7, y + 3, 14, u.hp / u.maxHp, "#d06a5a", 1.4);
      if (u.kith && u.calm > 0) barFX(g, x - 7, y + 5.6, 14, u.calm / 100, "#ffe6a8", 0.9);
      if (s.phase === "ally" && u.intent) {
        // how much the party can read depends on their sharpest wits against this foe's
        const sk = this.book[u.intent.skill], tgt = unit(s, u.intent.target), read = intentRead(s, u);
        if (u.stunned) intentFX(g, "smoke", x, this.top(u) - 3, "#b8b8a8");
        else if (read === 0) intentFX(g, "unknown", x, this.top(u) - 3, "#c8b8d8");
        else intentFX(g, sk.icon ?? "sword", x, this.top(u) - 3, sk.kind === "ranged" ? "#9ad0ff" : "#ff9a7a");
        if (!u.stunned && read === 2 && this.mode !== "busy") { const [tx] = this.pos(tgt); intentFX(g, "aim", tx + 0.01, this.top(tgt) - 3, "#ff7a6a"); }
      }
    }
    // turn marker / target cursor
    const u = acting(s);
    if (u && (this.mode === "menu" || this.mode === "target")) {
      const [ax] = this.pos(u); markerFX(g, ax, this.top(u) - 8 + Math.sin(T * 5) * 0.8);
      if (this.mode === "target") {
        const ts = targetsFor(s, this.book, u, skillsFor(s, u, this.book)[this.cursor]);
        ts.forEach((t, i) => { const [tx, ty] = this.pos(t); if (i === this.tcursor) { ringFX(g, tx, ty, 8 + Math.sin(T * 6) * 0.6, "#ffe39a"); markerFX(g, tx, this.top(t) - 8 + Math.sin(T * 5) * 0.8, "#fff2c8"); } else ringFX(g, tx, ty, 7, "rgba(255,227,154,.35)", true); });
      }
    }
    // effects
    for (const f of this.fx) {
      const p = f.t / f.dur;
      if (f.kind === "spark") sparkFX(g, f.x, f.y, p, f.big);
      else if (f.kind === "slash") slashFX(g, f.x, f.y, p, f.dir ?? 1, f.big);
      else if (f.kind === "heal") healFX(g, f.x, f.y, p);
      else if (f.kind === "smoke") smokeFX(g, f.x, f.y, p);
      else if (f.kind === "shield") shieldFX(g, f.x, f.y, p);
      else if (f.kind === "ring") ringFX(g, f.x, f.y, 6 + p * 10, `rgba(168,232,154,${1 - p})`);
      else if (f.kind === "dust") dustFX(g, f.x, f.y, p);
      else if (f.kind === "note") { const e = p; noteFX(g, f.x + ((f.x2 ?? f.x) - f.x) * e, f.y + ((f.y2 ?? f.y) - f.y) * e - Math.sin(e * Math.PI) * 10, p); }
      else if (f.kind === "proj") { const x2 = f.x2 ?? f.x, y2 = f.y2 ?? f.y, arc = f.proj === "pot" ? 16 : f.proj === "stone" ? 6 : 3, x = f.x + (x2 - f.x) * p, y = f.y + (y2 - f.y) * p - Math.sin(p * Math.PI) * arc; const dy = (y2 - f.y) / Math.max(1, x2 - f.x) - Math.cos(p * Math.PI) * arc * Math.PI / Math.max(1, Math.abs(x2 - f.x)); projFX(g, f.proj ?? "stone", x, y, x2 >= f.x ? Math.atan(dy) : Math.PI + Math.atan(-dy)); }
      else if (f.kind === "num") textFX(g, f.text ?? "", f.x, f.y - p * 10, f.col ?? "#fff", f.big ? 10 : 8, p > 0.75 ? (1 - p) * 4 : 1);
      else if (f.kind === "grade") textFX(g, f.text ?? "", f.x, f.y - p * 5, f.col ?? "#fff", f.size ?? 6, p > 0.8 ? (1 - p) * 5 : Math.min(1, p * 8));
    }
    // timing ring: closes on the target, press as it meets the inner ring
    if (this.qte) {
      const q = this.qte, t = unit(s, q.target), [x, y] = this.pos(t), cy = y - 16, rem = Math.max(0, q.lead - q.t);
      const col = q.mode === "brace" ? "#9ad0ff" : q.mode === "note" ? "#ffe6a8" : "#ffe39a";
      ringFX(g, x, cy, 6, col, true);
      ringFX(g, x, cy, 6 + (rem / q.lead) * 22, col);
      if (this.pressesSeen < 3 && !this.autoTiming) textFX(g, q.mode === "brace" ? (device.taps ? "Brace! Tap as the ring closes" : `Brace! Press ${keyFor("space")} or tap as the ring closes`) : device.taps ? "Tap as the ring closes" : `Press ${keyFor("space")} or tap as the ring closes`, CW / 2, CH - 8, "#f2e3c4", 5.5);
    }
    // meters along the top
    textFX(g, "CALL", 14, 7, s.bond >= 100 ? "#ffd890" : "#d8c8a0", 5); barFX(g, 24, 6, 44, s.bond / 100, s.bond >= 100 && ((T * 4) | 0) % 2 ? "#ffe0a0" : "#e0905a", 2);
    if (s.phase !== "won") { textFX(g, "NERVE", 198, 7, "#d8c8a0", 5); barFX(g, 210, 6, 40, s.resolve / 100, "#d06a5a", 2); }
    if (this.banner) { const b = this.banner, a = this.mode === "over" ? Math.min(1, b.t * 3) : b.t < 0.2 ? b.t * 5 : b.t > 1.8 ? Math.max(0, (2.2 - b.t) * 2.5) : 1; textFX(g, b.text, CW / 2, this.mode === "over" ? CH / 2 - 10 : 22, b.good ? "#ffe39a" : "#f2e3c4", this.mode === "over" ? 12 : 8, a); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    this.tex.source.update();
    this.drawHud();
  }

  private drawHud(): void {
    const s = this.s, u = acting(s), { x, y } = this.hudRect;
    // commands
    const ks = u && (this.mode === "menu" || this.mode === "target") ? this.cmds(u) : [];
    this.cmdTitle.text = this.mode === "over" ? (s.escaped === "fled" ? "Got away" : s.escaped === "released" ? "Let go" : s.phase === "won" ? "Victory" : "Defeat") : u && ks.length ? `${this.mode === "target" ? (this.narrow ? "Choose a target" : `${u.name}: choose a target`) : u.name}` : this.qte ? (this.qte.mode === "brace" ? "Brace!" : "Time it!") : s.phase === "foe" ? "Their move" : "";
    while (this.cmdItems.length < ks.length) {
      const i = this.cmdItems.length, t = new Text({ text: "", style: { fontFamily: HUD_FONT, fontSize: 17, fill: "#e8dcc2" } });
      t.eventMode = "static"; t.cursor = "pointer";
      t.on("pointertap", () => { if (this.mode !== "menu" && this.mode !== "target") return; if (this.cursor === i && this.mode === "target") return; this.cursor = i; const uu = acting(this.s); if (!uu) return; const kk = this.cmds(uu)[i]; if (this.isCmd(kk)) { this.choice = { skill: kk, target: "" }; return; } this.mode = "target"; const ts = targetsFor(this.s, this.book, uu, kk); this.tcursor = Math.max(0, ts.findIndex((tt) => tt.side !== uu.side)); });
      this.hud.addChild(t); this.cmdItems.push(t);
    }
    this.cmdItems.forEach((t, i) => {
      t.visible = i < ks.length; if (!t.visible) return;
      const sk = this.entry(ks[i]), on = i === this.cursor;
      const big = ks[i] === "call" || sk.kind === "finisher" || sk.kind === "art";
      t.text = `${on ? "▸ " : "   "}${sk.name}${sk.kind === "craft" ? ` ×${s.pack[ks[i]] ?? 0}` : ""}`; t.style.fill = big ? "#ffd890" : this.isCmd(ks[i]) ? (on ? "#bfe0ff" : "#9ab8d0") : on ? "#ffe39a" : "#cfc3aa";
      const per = Math.max(3, Math.floor((this.hudRect.h - 76) / 24)), col = Math.floor(i / per);
      t.x = x + 20 + col * (this.narrow ? 150 : 180); t.y = y + 42 + (i % per) * 24;
    });
    if (this.touchHud) this.touchCommands();
    this.cmdNote.text = this.mode === "over" ? (device.taps ? (s.phase === "won" || s.escaped ? "Tap to go on" : "Tap to try again") : s.phase === "won" || s.escaped ? `Press ${keyFor("confirm")} or tap to go on` : `Press ${keyFor("confirm")} or tap to try again`) : ks.length ? this.entry(ks[this.cursor]).note + (this.mode === "target" && !this.touchHud ? "   ·   Esc to go back" : "") : "";
    // log
    this.logText.text = s.log.slice(-4).join("\n");
    // party
    const p = this.party; p.clear();
    const rows = s.units.filter((a) => a.side === "ally");
    while (this.partyText.length < rows.length + 1) { const t = new Text({ text: "", style: { fontFamily: HUD_FONT, fontSize: 15, fill: "#e8dcc2" } }); this.hud.addChild(t); this.partyText.push(t); }
    let bw = this.barW, bx = this.narrow ? 80 : 96;
    if (this.touchHud) { const pa = this.partyAt ?? this.touchParty; p.x = pa.x; p.y = pa.y; this.party.x = pa.x; this.party.y = pa.y; bx = 84; bw = Math.max(50, Math.min(140, pa.w - bx - 4)); }
    rows.forEach((a, i) => {
      const t = this.partyText[i], yy = i * 26, on = a === u;
      t.text = `${a.name}${a.gone ? " (away)" : ""}`; t.style.fill = on ? "#ffe39a" : alive(a) ? "#e8dcc2" : "#7a7060"; t.x = this.party.x; t.y = this.party.y + yy;
      p.roundRect(bx, yy + 5, bw, 9, 4).fill({ color: 0x2a201a }); if (a.hp > 0) p.roundRect(bx, yy + 5, (bw * a.hp) / a.maxHp, 9, 4).fill({ color: a.hp / a.maxHp < 0.3 ? 0xd06a5a : 0x7fb069 });
      // focus: a thin bar under the health; gold when the finisher is ready
      if (!a.bonded) { const f = (s.focus[a.id] ?? 0) / FOCUS_FULL; p.roundRect(bx, yy + 16, bw, 3, 1.5).fill({ color: 0x2a201a }); if (f > 0) p.roundRect(bx, yy + 16, bw * f, 3, 1.5).fill({ color: f >= 1 ? 0xffd060 : 0x8ab0d0 }); }
    });
    const ct = this.partyText[rows.length]; ct.text = s.bond >= 100 ? "Call ready" : "Call"; ct.style.fill = s.bond >= 100 ? "#ffd890" : "#bfae8e"; ct.x = this.party.x; ct.y = this.party.y + rows.length * 26;
    p.roundRect(bx, rows.length * 26 + 5, bw, 9, 4).fill({ color: 0x2a201a }); if (s.bond > 0) p.roundRect(bx, rows.length * 26 + 5, (bw * s.bond) / 100, 9, 4).fill({ color: 0xe0905a });
    this.hint.visible = !this.touchHud;
    this.hint.text = `${this.narrow && !padState.used ? "Tap" : keyFor("timing")}: auto timing ${this.autoTiming ? "on" : "off"}   ·   ${this.narrow && !padState.used ? "" : `${keyFor("auto")}: `}auto battle ${this.autoBattle ? "on" : "off"}${this.narrow && !padState.used ? "" : `   ·   ${keyFor("guide")}: guide`}`;
  }

  /** Where the party list goes in the panel on a touch screen (set by touchCommands). */
  private touchParty = { x: 0, y: 0, w: 200 };

  /** Touch screens: each command is a framed button (two columns upright, a row across on its side), with buttons
   *  for Back, auto timing and auto battle, which a keyboard does with keys. */
  private touchCommands(): void {
    const { x, y, w, h } = this.hudRect, tall = this.game.height > this.game.width * 1.2;
    while (this.cmdBgs.length < this.cmdItems.length) {
      const i = this.cmdBgs.length, g = new Graphics();
      g.eventMode = "static"; g.cursor = "pointer"; g.on("pointertap", () => this.cmdItems[i].emit("pointertap", undefined as never));
      this.hud.addChildAt(g, this.hud.getChildIndex(this.cmdItems[i])); this.cmdBgs.push(g);
    }
    const bh = 42, gap = 8, fs = 17;
    let cx = x + 14, cy = y + (tall ? 40 : 46);
    const right = this.partyAt ? x + w - 14 : tall ? x + w - 14 : x + w - 224;
    const colW = tall ? Math.floor((w - 28 - gap) / 2) : 0;
    this.cmdItems.forEach((t, i) => {
      const g = this.cmdBgs[i]; g.clear();
      if (!t.visible) { g.visible = false; return; }
      g.visible = true; t.style.fontSize = fs; t.eventMode = "none";
      t.text = t.text.replace(/^(▸ | {3})/, "");
      const on = i === this.cursor, bw = tall ? colW : Math.max(104, Math.ceil(t.width) + 30);
      if (tall) { cx = x + 14 + (i % 2) * (colW + gap); cy = y + 40 + Math.floor(i / 2) * (bh + gap); }
      else if (cx + bw > right && cx > x + 14) { cx = x + 14; cy += bh + gap; }
      g.roundRect(cx, cy, bw, bh, 8).fill({ color: on ? 0x4a3418 : 0x1c1610, alpha: 0.96 }).roundRect(cx, cy, bw, bh, 8).stroke({ color: on ? 0xffd890 : 0x8a6a40, width: on ? 2 : 1 });
      t.x = cx + (bw - t.width) / 2; t.y = cy + (bh - t.height) / 2;
      if (!tall) cx += bw + gap;
    });
    const shown = this.cmdItems.filter((t) => t.visible).length;
    const lastY = shown ? (tall ? y + 40 + Math.ceil(shown / 2) * (bh + gap) : cy + bh + 4) : y + 46;
    // the note under the buttons (upright) or after the title (on its side)
    this.cmdNote.style.fontSize = 14; this.cmdNote.style.wordWrapWidth = w - 28;
    // touch buttons: Back while choosing a target, and the two auto switches
    this.touchBar.removeChildren().forEach((c) => c.destroy({ children: true }));
    const pill = (label: string, px: number, py: number, lit: boolean, on: () => void): number => {
      const t = new Text({ text: label, style: { fontFamily: HUD_FONT, fontSize: 14, fill: lit ? "#2a1a08" : "#e8dcc2", fontWeight: "700" } });
      const pw = t.width + 24, ph = 34, g = new Graphics().roundRect(px - pw, py, pw, ph, 17).fill({ color: lit ? 0xf0c060 : 0x2a2016, alpha: 0.95 }).roundRect(px - pw, py, pw, ph, 17).stroke({ color: 0xe0c070, width: 1 });
      g.eventMode = "static"; g.cursor = "pointer"; g.on("pointertap", on); t.x = px - pw + 12; t.y = py + (ph - t.height) / 2; t.eventMode = "none";
      this.touchBar.addChild(g, t); return pw;
    };
    let px = x + w - 12;
    const py = tall ? y + h - 46 : y + 6;
    px -= pill(`Auto battle ${this.autoBattle ? "on" : "off"}`, px, py, this.autoBattle, () => this.toggleAutoBattle()) + 8;
    px -= pill(`Auto timing ${this.autoTiming ? "on" : "off"}`, px, py, this.autoTiming, () => this.toggleAuto()) + 8;
    if (this.mode === "target") pill("◀ Back", px, py, false, () => { if (this.mode === "target") this.mode = "menu"; });
    if (tall) {
      this.cmdNote.x = x + 16; this.cmdNote.y = lastY + 2;
      this.touchParty = { x: x + 16, y: lastY + 10 + (this.cmdNote.text ? this.cmdNote.height + 6 : 0), w: Math.min(360, w - 32) };
      // an upright phone has room under the party for what just happened
      const rows = this.s.units.filter((a) => a.side === "ally").length + 1, logY = this.touchParty.y + rows * 26 + 14;
      this.logText.visible = logY + 60 < py; this.logText.x = x + 16; this.logText.y = logY; this.logText.style.wordWrapWidth = w - 32;
    } else {
      this.cmdNote.x = x + 16; this.cmdNote.y = Math.min(y + h - 22, lastY);
      this.touchParty = { x: x + w - 214, y: y + 46, w: 200 };
    }
  }

  /** Read-only view for tests and debugging. */
  debug() {
    const u = acting(this.s);
    return {
      phase: this.s.phase, mode: this.mode, round: this.s.round, bond: this.s.bond, resolve: this.s.resolve, routed: this.s.routed,
      acting: u?.id ?? null, skills: u ? this.cmds(u) : [], auto: this.autoBattle, escaped: this.s.escaped ?? null, cursor: this.cursor, qte: this.qte ? { target: this.qte.target, mode: this.qte.mode } : null,
      units: this.s.units.map((x) => ({ id: x.id, hp: x.hp, gone: x.gone })), log: this.s.log.slice(-3), presses: pressesFor(this.book, u ? skillsFor(this.s, u, this.book)[this.cursor] ?? "strike" : "strike"),
    };
  }
}
