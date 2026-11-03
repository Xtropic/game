// Exploring: the pixel-art world at 320 x 180 scaled by a whole number, with the dialogue box and HUD drawn in
// HD on top. What happens here comes from the story data: who is where, what they say, what stepping on a door
// or singing near a kith does. The scene only moves people about and shows things; StoryRunner decides.
import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import type { Game } from "../core/game";
import type { Scene } from "../core/scene";
import { TILE, WorldMap, type MapFile } from "./map";
import { bakeMap } from "../art/tiles";
import { pixelTexture } from "../art/pixel";
import { LOOKS, SMALL, beastSheet, isBeast, noteTexture, personSheet, type Facing } from "../art/people";
import { BattleScene } from "../battle/battleScene";
import { BATTLES, SKILLS } from "../battle/data";
import { xpForFoe } from "../cast/attributes";
import { DialogueBox } from "../ui/dialogueBox";
import { StoryRunner, holds, type Actor, type Story, type StoryHost, type Where } from "../story/story";

export const VIEW_W = 320, VIEW_H = 180;
const WALK = 60, RUN = 104; // pixels per second
const BOX = { w: 10, h: 6, ox: 1, oy: 11 }; // player's collision box at the feet, relative to the sprite's top-left
const FOLLOW_GAP = 16; // pixels of trail between each follower

export interface ExploreState { map: string; x: number; y: number; facing: Facing; }

/** Colour laid over the world for the time of day and what has happened. Indoors keeps its own light. */
const LIGHT: Record<string, { color: number; alpha: number }> = {
  day: { color: 0, alpha: 0 },
  dusk: { color: 0x6a2a3a, alpha: 0.28 },
  night: { color: 0x0a1030, alpha: 0.5 },
  fire: { color: 0x3a0c04, alpha: 0.42 },
  ash: { color: 0x2a2624, alpha: 0.12 },
  evening: { color: 0x1a1008, alpha: 0.4 },
  steam: { color: 0x0a0806, alpha: 0.2 },
};
const INDOORS = new Set(["home", "caves", "surgery", "rooms", "hatchery"]);

interface Shown { a: Actor; sprite: Sprite; frames: Record<Facing, Texture[]>; }

export class ExploreScene implements Scene, StoryHost {
  readonly id = "explore";
  readonly view = new Container();
  private world = new Container();
  private ground = new Sprite();
  private people = new Container();
  private overlay = new Graphics();
  private steamLayer = new Graphics();
  private hud = new Container();
  private map!: WorldMap;
  private game!: Game;
  private zoom = 1;
  private player = { x: 0, y: 0, facing: "down" as Facing, step: 0, moving: false, sprite: new Sprite() };
  private sheets: Record<string, Record<Facing, Texture[]>> = {};
  private shown: Shown[] = [];
  private followers: { id: string; look: string; sprite: Sprite; facing: Facing }[] = [];
  private trail: { x: number; y: number; facing: Facing }[] = [];
  private dialog!: DialogueBox;
  private lineDone: (() => void) | null = null;
  private choiceDone: ((i: number) => void) | null = null;
  private runner!: StoryRunner;
  private toastLabel = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 16, fill: "#f2e3c4", dropShadow: { color: 0, distance: 1, blur: 2, alpha: 0.8 } } });
  private toastTime = 0;
  private objective = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 14, fill: "#e8dcc0", wordWrap: true, wordWrapWidth: 420, dropShadow: { color: 0, distance: 1, blur: 2, alpha: 0.9 } } });
  private chapter = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 13, fill: "#c8b48a", fontStyle: "italic", dropShadow: { color: 0, distance: 1, blur: 2, alpha: 0.9 } } });
  private meter = new Graphics();
  private cover = new Graphics();
  private caption = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 22, fill: "#efe6d2", fontStyle: "italic", align: "center", wordWrap: true, wordWrapWidth: 640 } });
  private fading: { t: number; done: (() => void) | null } | null = null;
  private ended: Text | null = null;
  private lastTile = "";
  private zonesIn = new Set<number>();
  private steam = new Set<string>();
  private steamT = 0;
  private hp = 100;
  private noteTex = noteTexture();
  /** After arriving somewhere, movement waits until the keys are let go, so holding a key doesn't walk straight back out. */
  private settle = false;

  constructor(private story: Story, private maps: Record<string, MapFile>, private start?: Partial<ExploreState>) {}

  private sheet(look: string): Record<Facing, Texture[]> {
    return (this.sheets[look] ??= isBeast(look) ? beastSheet(look) : personSheet(LOOKS[look] ?? LOOKS.elder, SMALL.has(look)));
  }

  get flags() { return this.game.flags; }
  where(): Where { return { flags: this.game.flags, map: this.map.file.id }; }
  private hero(): string { return String(this.flags.hero ?? "rhea"); }

  enter(game: Game): void {
    this.game = game;
    this.runner = new StoryRunner(this.story, this);
    if (!this.flags.stage) this.beginStory();
    this.world.addChild(this.ground, this.steamLayer, this.people, this.overlay);
    this.view.addChild(this.world, this.hud);
    this.dialog = new DialogueBox(game.voices, (id) => game.buildFor(id));
    this.hud.addChild(this.objective, this.chapter, this.meter, this.toastLabel, this.dialog.view, this.cover, this.caption);
    this.hud.eventMode = "static";
    this.dialog.view.eventMode = "static";
    this.dialog.view.on("pointertap", (e) => this.tapDialog(e.global.x, e.global.y));
    const s = this.start ?? {};
    const sp = this.story.start;
    this.load(s.map && this.maps[s.map] ? s.map : sp.map, s.x, s.y, s.facing ?? sp.facing);
    const fl = String(this.flags.follow ?? ""); if (fl) this.follow(fl.split(","));
    if (this.flags.ended) this.end("prologue"); else this.save("auto");
  }

  private beginStory(): void {
    const sp = this.story.start;
    for (const k of Object.keys(this.flags)) delete this.flags[k];
    Object.assign(this.flags, sp.set ?? {}, { stage: sp.stage, hero: sp.hero, chapter: this.story.title });
    this.start = { map: sp.map, x: sp.x * TILE + 2, y: sp.y * TILE - 2, facing: sp.facing };
  }

  exit(): void {}

  /** Puts the player on a map, at pixel x, y (or the map's spawn), and rebuilds what's shown. */
  private load(id: string, x?: number, y?: number, facing?: Facing): void {
    const file = this.maps[id]; if (!file) throw new Error(`no map ${id}`);
    this.map = new WorldMap(file);
    if (this.flags.gateOpen) this.map.open.add("gate");
    const sp = this.map.spawn();
    this.player.x = x ?? sp.x * TILE + 2; this.player.y = y ?? sp.y * TILE - 2;
    if (facing) this.player.facing = facing;
    this.ground.texture?.destroy(true);
    this.ground.texture = pixelTexture(bakeMap(this.map, { burnt: id === "larkfold" && !!this.flags.ash }));
    this.trail = []; this.steam.clear(); this.hp = 100; this.zonesIn.clear(); this.settle = true;
    this.lastTile = this.tileKey();
    for (const f of this.followers) { f.sprite.x = this.player.x; f.sprite.y = this.player.y; }
    this.refresh();
  }

  /** Re-reads the story: who is on this map now, the objective, the light, the HUD. */
  refresh(): void {
    for (const s of this.shown) s.sprite.destroy();
    this.shown = [];
    for (const a of this.story.actors) {
      if (a.map !== this.map.file.id || !holds(a.when, this.where())) continue;
      if (this.followers.some((f) => f.id === a.id)) continue;
      const frames = this.sheet(a.look);
      const sprite = new Sprite(a.look === "note" ? this.noteTex : frames.down[0]);
      this.placeActor(sprite, a);
      this.people.addChild(sprite); this.shown.push({ a, sprite, frames });
    }
    if (!this.player.sprite.parent) this.people.addChild(this.player.sprite);
    const stage = String(this.flags.stage ?? "");
    this.objective.text = this.story.objectives[stage] ?? "";
    this.chapter.text = String(this.flags.chapter ?? this.story.title);
    if (this.game.width) this.chapter.x = this.game.width - this.chapter.width - 16;
    const light = LIGHT[String(this.flags.light ?? "day")] ?? LIGHT.day;
    const indoor = INDOORS.has(this.map.file.id) && this.flags.light !== "evening" && this.flags.light !== "steam";
    this.overlay.clear();
    if (!indoor && light.alpha > 0) this.overlay.rect(0, 0, this.map.width * TILE, this.map.height * TILE).fill({ color: light.color, alpha: light.alpha });
    this.drawMeter();
  }

  private placeActor(sprite: Sprite, a: Actor): void {
    const beast = isBeast(a.look);
    sprite.x = a.x * TILE + (beast ? 0 : 2); sprite.y = a.y * TILE + (beast ? 4 : -2);
  }

  private drawMeter(): void {
    this.meter.clear();
    const w = 140;
    if (this.map.file.id === "hatchery" && (this.flags.stage === "i2" || this.flags.stage === "i2b")) {
      this.meter.roundRect(0, 0, w + 4, 12, 4).fill({ color: 0x14100c, alpha: 0.85 }).roundRect(2, 2, (w * this.hp) / 100, 8, 3).fill(0xd06a5a);
    } else if (this.flags.showHold) {
      const h = Number(this.flags.hold ?? 50);
      this.meter.roundRect(0, 0, w + 4, 12, 4).fill({ color: 0x14100c, alpha: 0.85 }).roundRect(2, 2, (w * h) / 100, 8, 3).fill(h >= 55 ? 0x9ac08a : h >= 40 ? 0xd0b060 : 0xc06050);
    }
  }

  resize(w: number, h: number): void {
    this.zoom = Math.max(1, Math.floor(Math.min(w / VIEW_W, h / VIEW_H)));
    this.world.scale.set(this.zoom);
    this.dialog.resize(w, h);
    this.objective.x = 16; this.objective.y = 12; this.objective.style.wordWrapWidth = Math.min(420, w - 180);
    this.chapter.x = w - this.chapter.width - 16; this.chapter.y = 12;
    this.meter.x = w - 160; this.meter.y = 34;
    this.toastLabel.x = 16; this.toastLabel.y = 56;
    this.cover.clear().rect(0, 0, w, h).fill(0x000000); this.cover.alpha = 0;
    this.caption.style.wordWrapWidth = Math.min(640, w - 40); this.caption.anchor.set(0.5); this.caption.x = w / 2; this.caption.y = h / 2; this.caption.alpha = 0;
    if (this.ended) { this.ended.x = w / 2; this.ended.y = h / 2; }
  }

  snapshot(): ExploreState { return { map: this.map.file.id, x: this.player.x, y: this.player.y, facing: this.player.facing }; }

  save(slot: "auto" | "1"): void {
    const s = this.snapshot();
    this.game.saves.write(slot, { playSeconds: this.game.playSeconds, place: { map: s.map, x: s.x, y: s.y, facing: s.facing }, flags: { ...this.game.flags, follow: this.followers.map((f) => f.id).join(",") }, party: { ...this.game.party }, gear: { ...this.game.gear }, coin: this.game.coin, kith: structuredClone(this.game.kith) });
  }

  // ---- StoryHost: what the story asks the scene to do ----

  line(who: string, name: string, text: string, done: () => void): void { this.lineDone = done; this.dialog.show({ who, name, text }); }
  choose(prompt: string, options: { label: string; hint?: string }[], done: (i: number) => void): void { this.choiceDone = done; this.dialog.choose({ who: "narrator", name: "", text: prompt }, options); }
  fade(caption: string, done: () => void): void { this.fading = { t: 0, done }; this.caption.text = caption; }
  goto(map: string, x: number, y: number, facing: Facing | undefined, done: () => void): void { this.load(map, x * TILE + 2, y * TILE - 2, facing); this.save("auto"); done(); }
  toast(t: string): void { this.toastLabel.text = t; this.toastTime = 2.6; }
  changed(): void { if (this.flags.gateOpen) this.map.open.add("gate"); this.refresh(); }

  follow(ids: string[]): void {
    for (const f of this.followers) f.sprite.destroy();
    this.followers = ids.map((id) => {
      const a = this.story.actors.find((x) => x.id === id);
      const look = a?.look ?? id;
      const sprite = new Sprite(this.sheet(look).down[0]); sprite.x = this.player.x; sprite.y = this.player.y;
      this.people.addChild(sprite);
      return { id, look, sprite, facing: "down" as Facing };
    });
    this.refresh();
  }

  battle(id: string, done: () => void): void { this.startBattle(id, done); }

  end(_id: string): void {
    const f = this.flags, hold = Number(f.hold ?? 50);
    const refusal: Record<string, string> = { duty: "for the three hundred in the lowlands", cold: "coldly, asking if he trusted a Warden over the elders", stay: "asking him to stay and fight with her" };
    const t = new Text({ text: [
      f.evening === "on" ? "You don't hear Finch knock." : "Finch looks up when you come in.",
      "",
      `Corran's hold: ${hold} of 100. ${hold >= 55 ? "He is holding on." : hold >= 40 ? "It's slipping." : "He is already sliding."}`,
      `Lull rings: ${Number(f["rings.corran"] ?? 0)}`,
      `Finch's trust in Rhea: ${Number(f.finchTrust ?? 50)} of 100`,
      `Rhea refused ${refusal[String(f.refusal)] ?? "-"}`,
      `Sela: ${f.sela ? "bought out. A future companion." : "left in the cart."}`,
      `Mother's notes: ${Number(f.notes ?? 0)} of 4 found`,
      "",
      "Act I starts here: Rhea joins the Commons Army as a Recruit, and these choices carry into every interlude.",
      "",
      "Press Enter to play again",
    ].join("\n"), style: { fontFamily: "Georgia, serif", fontSize: 18, fill: "#efe6d2", align: "center", lineHeight: 28, wordWrap: true, wordWrapWidth: Math.min(700, this.game.width - 40) } });
    t.anchor.set(0.5); t.x = this.game.width / 2; t.y = this.game.height / 2;
    this.cover.alpha = 0.92; this.ended = t; this.hud.addChild(t);
    f.ended = true;
    this.save("auto");
  }

  /** Starts a new run of the story from the top. */
  restart(): void {
    this.ended?.destroy(); this.ended = null; this.cover.alpha = 0;
    for (const f of this.followers) f.sprite.destroy(); this.followers = [];
    this.beginStory();
    const s = this.start!;
    this.load(s.map!, s.x, s.y, s.facing);
    this.save("auto");
  }

  /** Puts a battle over the map; on a win, records it, shares out experience, and continues the story. */
  startBattle(id: string, onWin?: () => void): void {
    const def = BATTLES[id]; if (!def) throw new Error(`no battle ${id}`);
    this.game.scenes.push(new BattleScene(def, SKILLS, {
      levels: this.game.levels(),
      gear: this.game.gear,
      kith: this.game.kith,
      onDone: (_r, s) => {
        this.game.flags[`won.${id}`] = true;
        // experience: every foe beaten, shared in full by each cast member who fought
        const xp = s.units.filter((u) => u.side === "foe").reduce((n, u) => n + xpForFoe(u.stats ? u.level : undefined), 0);
        const ups = s.units.filter((u) => u.side === "ally" && u.cast).flatMap((u) => this.game.giveXp(u.cast!, xp, u.name));
        // owned kith that fought learn from what they did, and grow
        for (const u of s.units) if (u.side === "ally" && u.kith && this.game.kith[u.id]) ups.push(...this.game.kithFought(u.id, s.deeds[u.id], xp));
        this.refresh();
        onWin?.();
        this.runner.run(ups.map((text) => ({ say: "", text })));
        this.save("auto");
      },
    }));
  }

  // ---- input and movement ----

  private tapDialog(x: number, y: number): void {
    if (this.dialog.choosing) { const i = this.dialog.pick(x, y); if (i >= 0) this.picked(i); return; }
    if (this.dialog.open && this.dialog.advance()) this.lineClosed();
  }

  private picked(i: number): void { const d = this.choiceDone; this.choiceDone = null; d?.(i); }
  private lineClosed(): void { const d = this.lineDone; this.lineDone = null; d?.(); }

  /** The actor on or next to the tile the player is facing, if any. */
  private facingActor(): Shown | undefined {
    const cx = this.player.x + BOX.ox + BOX.w / 2, cy = this.player.y + BOX.oy + BOX.h / 2;
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.player.facing];
    const fx = cx + d[0] * 10, fy = cy + d[1] * 10;
    let best: Shown | undefined, bd = 20;
    for (const s of this.shown) { if (!s.a.talk) continue; const ax = s.a.x * TILE + 8, ay = s.a.y * TILE + 8, dist = Math.min(Math.hypot(ax - fx, ay - fy), Math.hypot(ax - cx, ay - cy) + 4); if (dist < bd) { bd = dist; best = s; } }
    return best;
  }

  private facingTile(): { kind: string | null } {
    const cx = this.player.x + BOX.ox + BOX.w / 2, cy = this.player.y + BOX.oy + BOX.h / 2;
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.player.facing];
    return { kind: this.map.kindAt(Math.floor((cx + d[0] * 16) / TILE), Math.floor((cy + d[1] * 16) / TILE)) };
  }

  private interact(): void {
    const s = this.facingActor();
    if (s) { if (s.a.pickup) { s.sprite.destroy(); this.shown = this.shown.filter((x) => x !== s); } this.runner.run(s.a.talk!); return; }
    const k = this.facingTile().kind;
    const look = this.story.looks.find((l) => l.tile === k && (!l.map || l.map === this.map.file.id) && holds(l.when, this.where()));
    if (look) this.runner.run(look.do);
  }

  private sing(): void {
    const w = this.where(), px = this.player.x + 6, py = this.player.y + 12;
    for (const s of this.story.songs) {
      if (!holds(s.when, w)) continue;
      if (s.near) { const a = this.shown.find((x) => x.a.id === s.near); if (!a || Math.hypot(a.a.x * TILE + 8 - px, a.a.y * TILE + 8 - py) > (s.range ?? 3) * TILE) continue; }
      this.runner.run(s.do); return;
    }
    this.toast("Rhea sings the foal song.");
  }

  private tileKey(): string { const [tx, ty] = this.feetTile(); return `${this.map.file.id}:${tx},${ty}`; }
  private feetTile(): [number, number] { return [Math.floor((this.player.x + BOX.ox + BOX.w / 2) / TILE), Math.floor((this.player.y + BOX.oy + BOX.h / 2) / TILE)]; }

  /** After moving: doors and other step triggers, zones, and anyone the player has walked into. */
  private arrived(): void {
    const key = this.tileKey(), w = this.where(), [tx, ty] = this.feetTile();
    if (key !== this.lastTile) {
      this.lastTile = key;
      const st = this.story.steps.find((s) => s.map === w.map && s.at[0] === tx && s.at[1] === ty && holds(s.when, w));
      if (st) { this.runner.run(st.do); return; }
    }
    this.story.zones.forEach((z, i) => {
      if (z.map !== w.map) return;
      const inside = tx >= z.area[0] && ty >= z.area[1] && tx <= z.area[2] && ty <= z.area[3];
      if (inside && !this.zonesIn.has(i) && holds(z.when, w)) { this.zonesIn.add(i); this.runner.run(z.do); }
      if (!inside) this.zonesIn.delete(i);
    });
    const px = this.player.x + 6, py = this.player.y + 14;
    const hit = this.shown.find((s) => s.a.touch && Math.hypot(s.a.x * TILE + 8 - px, s.a.y * TILE + 8 - py) < 14);
    if (hit) this.runner.run(hit.a.touch!);
  }

  /** Actors block like walls, except notes lying on the ground. */
  private blockedByActor(x: number, y: number): boolean {
    return this.shown.some(({ a }) => { if (a.pickup) return false; const nx = a.x * TILE + 2 + BOX.ox, ny = a.y * TILE - 2 + BOX.oy; return x < nx + BOX.w && x + BOX.w > nx && y < ny + BOX.h && y + BOX.h > ny; });
  }

  private hazard(dt: number): void {
    const hz = this.story.hazards.find((h) => h.map === this.map.file.id && holds(h.when, this.where()));
    this.steamLayer.clear();
    if (!hz) return;
    if (!this.steam.size) for (const [x, y] of hz.sources) this.steam.add(`${x},${y}`);
    this.steamT += dt;
    if (this.steamT > hz.spreadEvery) {
      this.steamT = 0;
      const cells = [...this.steam];
      for (let n = 0; n < hz.spreadBy; n++) {
        const [x, y] = cells[Math.floor(Math.random() * cells.length)].split(",").map(Number);
        const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
        if (this.map.kindAt(x + dx, y + dy) === hz.on && this.steam.size < hz.max) this.steam.add(`${x + dx},${y + dy}`);
      }
    }
    const t = this.game.playSeconds;
    for (const c of this.steam) { const [x, y] = c.split(",").map(Number); this.steamLayer.rect(x * TILE, y * TILE, TILE, TILE).fill({ color: 0xeef2f4, alpha: 0.5 + 0.15 * Math.sin(t * 3 + x + y) }); }
    const [tx, ty] = this.feetTile();
    if (this.steam.has(`${tx},${ty}`)) {
      this.hp -= hz.burn * dt; this.drawMeter();
      if (this.hp <= 0) { this.hp = 100; this.steam.clear(); this.runner.run(hz.fail); }
    }
  }

  update(dt: number): void {
    const inp = this.game.input;
    if (this.toastTime > 0) { this.toastTime -= dt; if (this.toastTime <= 0) this.toastLabel.text = ""; }
    this.player.moving = false;
    if (this.fading) {
      const f = this.fading; f.t += dt;
      const a = f.t < 0.5 ? f.t / 0.5 : f.t < 2.0 ? 1 : Math.max(0, 1 - (f.t - 2.0) / 0.5);
      this.cover.alpha = a; this.caption.alpha = f.t < 0.6 ? 0 : f.t < 1.9 ? Math.min(1, (f.t - 0.6) / 0.3) : Math.max(0, 1 - (f.t - 1.9) / 0.3);
      if (f.t >= 1.8 && f.done) { const d = f.done; f.done = null; d(); }
      if (f.t >= 2.5) { this.fading = null; this.cover.alpha = 0; this.caption.alpha = 0; }
      return;
    }
    if (this.ended) { if (inp.wasPressed("confirm")) this.restart(); return; }
    if (this.dialog.open) {
      this.dialog.update(dt);
      if (this.dialog.choosing) {
        if (inp.wasPressed("up") || inp.wasPressed("left")) this.dialog.move(-1);
        if (inp.wasPressed("down") || inp.wasPressed("right")) this.dialog.move(1);
        if (inp.wasPressed("confirm")) this.picked(this.dialog.pick());
        return;
      }
      if ((inp.wasPressed("confirm") || inp.wasPressed("cancel")) && this.dialog.advance()) this.lineClosed();
      return;
    }
    if (this.runner.busy) return;
    this.hazard(dt);
    if (this.runner.busy) return;
    if (inp.wasPressed("confirm")) { this.interact(); return; }
    if (inp.wasPressed("sing")) { this.sing(); return; }
    if (inp.wasPressed("menu")) { this.save("1"); this.toast("Saved"); }
    const a = inp.axis();
    if (this.settle) { if (a.x || a.y) return; this.settle = false; }
    this.player.moving = a.x !== 0 || a.y !== 0;
    if (!this.player.moving) return;
    if (a.x) this.player.facing = a.x > 0 ? "right" : "left"; else this.player.facing = a.y > 0 ? "down" : "up";
    const len = Math.hypot(a.x, a.y), sp = (inp.isHeld("run") ? RUN : WALK) * dt;
    const bx = this.player.x + BOX.ox, by = this.player.y + BOX.oy;
    const moved = this.map.move(bx, by, BOX.w, BOX.h, (a.x / len) * sp, (a.y / len) * sp);
    let nx = moved.x, ny = moved.y;
    if (this.blockedByActor(nx, by)) nx = bx;
    if (this.blockedByActor(nx, ny)) ny = by;
    const was = { x: this.player.x, y: this.player.y };
    this.player.x = nx - BOX.ox; this.player.y = ny - BOX.oy;
    this.player.step += dt * (inp.isHeld("run") ? 12 : 8);
    if (this.player.x !== was.x || this.player.y !== was.y) {
      this.trail.unshift({ x: this.player.x, y: this.player.y, facing: this.player.facing });
      if (this.trail.length > 200) this.trail.length = 200;
    }
    this.arrived();
  }

  /** The trail point about `dist` pixels behind the player. */
  private behind(dist: number): { x: number; y: number; facing: Facing } | null {
    let d = 0, prev = { x: this.player.x, y: this.player.y };
    for (const p of this.trail) { d += Math.hypot(p.x - prev.x, p.y - prev.y); prev = p; if (d >= dist) return p; }
    return null;
  }

  render(): void {
    this.dialog.render();
    const p = this.player;
    p.sprite.texture = this.sheet(this.hero())[p.facing][p.moving ? Math.floor(p.step) % 4 : 0];
    p.sprite.x = Math.round(p.x); p.sprite.y = Math.round(p.y);
    this.followers.forEach((f, i) => {
      const at = this.behind(FOLLOW_GAP * (i + 1));
      const beast = isBeast(f.look);
      if (at) { f.sprite.x = Math.round(at.x) - (beast ? 2 : 0); f.sprite.y = Math.round(at.y) + (beast ? 6 : 0); f.facing = at.facing; }
      f.sprite.texture = this.sheet(f.look)[f.facing][p.moving ? Math.floor(p.step) % 4 : 0];
    });
    // idle actors breathe: kith shift their weight now and then
    const t = this.game.playSeconds;
    for (const s of this.shown) if (isBeast(s.a.look)) s.sprite.texture = s.frames.down[Math.floor(t * 1.5 + s.a.x) % 2];
    // depth: things lower on screen draw in front
    const kids = [p.sprite, ...this.shown.map((n) => n.sprite), ...this.followers.map((f) => f.sprite)].sort((s1, s2) => (s1.y + s1.height) - (s2.y + s2.height));
    kids.forEach((s, i) => this.people.setChildIndex(s, i));
    // camera: centre on the player, clamped to the map, whole pixels only
    const vw = this.game.width / this.zoom, vh = this.game.height / this.zoom;
    const mw = this.map.width * TILE, mh = this.map.height * TILE;
    const cx = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, p.x + 6 - vw / 2));
    const cy = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, p.y + 9 - vh / 2));
    this.world.x = -Math.round(cx) * this.zoom; this.world.y = -Math.round(cy) * this.zoom;
  }

  /** Read-only view for tests and debugging. */
  debug() {
    return { map: this.map.file.id, x: this.player.x, y: this.player.y, facing: this.player.facing, dialog: this.dialog.text, choosing: this.dialog.choosing, speaking: this.dialog.speaking, zoom: this.zoom,
      stage: String(this.flags.stage ?? ""), objective: this.objective.text, followers: this.followers.map((f) => f.id), busy: this.runner.busy, fading: !!this.fading, ended: !!this.ended, hp: this.hp };
  }
}
