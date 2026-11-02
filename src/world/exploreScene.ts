// Exploring a map: pixel-art world at 320 x 180 scaled by a whole number, with the dialogue box drawn in HD on top.
import { Container, Graphics, Sprite, Text } from "pixi.js";
import type { Game } from "../core/game";
import type { Scene } from "../core/scene";
import { TILE, WorldMap, type MapEntity, type MapFile } from "./map";
import { bakeMap } from "../art/tiles";
import { pixelTexture } from "../art/pixel";
import { LOOKS, personSheet, type Facing } from "../art/people";
import { BattleScene } from "../battle/battleScene";
import { BATTLES, SKILLS } from "../battle/data";
import type { Texture } from "pixi.js";

export const VIEW_W = 320, VIEW_H = 180;
const WALK = 60, RUN = 104; // pixels per second
const BOX = { w: 10, h: 6, ox: 1, oy: 11 }; // player's collision box at the feet, relative to the sprite's top-left

export interface ExploreState { map: string; x: number; y: number; facing: Facing; }

export class ExploreScene implements Scene {
  readonly id = "explore";
  readonly view = new Container();
  private world = new Container();
  private hud = new Container();
  private map: WorldMap;
  private game!: Game;
  private zoom = 1;
  private player = { x: 0, y: 0, facing: "down" as Facing, step: 0, moving: false, sprite: new Sprite() };
  private sheets: Record<string, Record<Facing, Texture[]>> = {};
  private sheet(look: string): Record<Facing, Texture[]> { return (this.sheets[look] ??= personSheet(LOOKS[look] ?? LOOKS.elder)); }
  private pendingBattle: MapEntity | null = null;
  private npcs: { e: MapEntity; sprite: Sprite }[] = [];
  private dialog: { box: Graphics; text: Text; name: Text; open: boolean } ;
  private toast = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 16, fill: "#f2e3c4" } });
  private toastTime = 0;

  constructor(file: MapFile, start?: Partial<ExploreState>) {
    this.map = new WorldMap(file);
    const sp = this.map.spawn();
    this.player.x = start?.x ?? sp.x * TILE + 2;
    this.player.y = start?.y ?? sp.y * TILE - 2;
    this.player.facing = start?.facing ?? "down";
    this.dialog = { box: new Graphics(), text: new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 18, fill: "#efe6d2", wordWrap: true, wordWrapWidth: 600, lineHeight: 26 } }), name: new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 15, fill: "#e0c070", fontWeight: "bold" } }), open: false };
  }

  enter(game: Game): void {
    this.game = game;
    const ground = new Sprite(pixelTexture(bakeMap(this.map)));
    this.world.addChild(ground);
    for (const e of this.map.file.entities) if (e.kind === "npc") {
      if (e.props?.hideIf && game.flags[String(e.props.hideIf)]) continue;
      const sheet = this.sheet(String(e.props?.look ?? "elder"));
      const s = new Sprite(sheet[e.props?.facing === "up" ? "up" : "down"][0]); s.x = e.x * TILE + 2; s.y = e.y * TILE - 2; this.world.addChild(s); this.npcs.push({ e, sprite: s });
    }
    this.player.sprite.texture = this.sheet("rhea")[this.player.facing][0];
    this.world.addChild(this.player.sprite);
    this.view.addChild(this.world, this.hud);
    this.dialog.box.visible = this.dialog.text.visible = this.dialog.name.visible = false;
    this.hud.addChild(this.dialog.box, this.dialog.name, this.dialog.text, this.toast);
    this.save("auto");
  }

  exit(): void {}

  resize(w: number, h: number): void {
    this.zoom = Math.max(1, Math.floor(Math.min(w / VIEW_W, h / VIEW_H)));
    this.world.scale.set(this.zoom);
    const bw = Math.min(w - 32, 760), bh = 120;
    this.dialog.box.clear().roundRect(0, 0, bw, bh, 10).fill({ color: 0x14100c, alpha: 0.92 }).stroke({ color: 0x6b5236, width: 2 });
    this.dialog.box.x = (w - bw) / 2; this.dialog.box.y = h - bh - 16;
    this.dialog.name.x = this.dialog.box.x + 18; this.dialog.name.y = this.dialog.box.y + 12;
    this.dialog.text.x = this.dialog.box.x + 18; this.dialog.text.y = this.dialog.box.y + 36; this.dialog.text.style.wordWrapWidth = bw - 36;
    this.toast.x = 16; this.toast.y = 12;
  }

  snapshot(): ExploreState { return { map: this.map.file.id, x: this.player.x, y: this.player.y, facing: this.player.facing }; }

  save(slot: "auto" | "1"): void {
    const s = this.snapshot();
    this.game.saves.write(slot, { playSeconds: this.game.playSeconds, place: { map: s.map, x: s.x, y: s.y, facing: s.facing }, flags: { ...this.game.flags } });
  }

  private say(name: string, text: string): void {
    this.dialog.open = true; this.dialog.name.text = name; this.dialog.text.text = text;
    this.dialog.box.visible = this.dialog.text.visible = this.dialog.name.visible = true;
  }
  private closeDialog(): void {
    this.dialog.open = false; this.dialog.box.visible = this.dialog.text.visible = this.dialog.name.visible = false;
    const e = this.pendingBattle; this.pendingBattle = null;
    if (e) this.startBattle(String(e.props?.battle), e);
  }

  /** Puts a battle over the map; on a win, sets the entity's hideIf flag, removes it, and says its after line. */
  startBattle(id: string, e?: MapEntity): void {
    const def = BATTLES[id]; if (!def) throw new Error(`no battle ${id}`);
    this.game.scenes.push(new BattleScene(def, SKILLS, {
      onDone: () => {
        this.game.flags[`won.${id}`] = true;
        if (e) {
          const i = this.npcs.findIndex((n) => n.e === e);
          if (i >= 0) { this.npcs[i].sprite.destroy(); this.npcs.splice(i, 1); }
          if (e.props?.after) this.say("", String(e.props.after));
        }
        this.save("auto");
      },
    }));
  }

  /** The entity on the tile the player is facing, if any. */
  private facingEntity(): MapEntity | undefined {
    const cx = this.player.x + BOX.ox + BOX.w / 2, cy = this.player.y + BOX.oy + BOX.h / 2;
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.player.facing];
    const tx = Math.floor((cx + d[0] * 10) / TILE), ty = Math.floor((cy + d[1] * 10) / TILE);
    return this.map.file.entities.find((e) => (e.kind === "npc" || e.kind === "sign") && Math.abs(e.x - tx) + Math.abs(e.y - ty) === 0)
      ?? this.map.file.entities.find((e) => (e.kind === "npc") && Math.abs(e.x - tx) <= 1 && Math.abs(e.y - ty) <= 1 && Math.hypot(e.x * TILE + 8 - cx, e.y * TILE + 8 - cy) < 22);
  }

  /** NPCs block like walls. */
  private blockedByNpc(x: number, y: number): boolean {
    return this.npcs.some(({ e }) => { const nx = e.x * TILE + 2 + BOX.ox, ny = e.y * TILE - 2 + BOX.oy; return x < nx + BOX.w && x + BOX.w > nx && y < ny + BOX.h && y + BOX.h > ny; });
  }

  update(dt: number): void {
    const inp = this.game.input;
    if (this.toastTime > 0) { this.toastTime -= dt; if (this.toastTime <= 0) this.toast.text = ""; }
    if (this.dialog.open) { if (inp.wasPressed("confirm") || inp.wasPressed("cancel")) this.closeDialog(); this.player.moving = false; return; }
    if (inp.wasPressed("confirm")) {
      const e = this.facingEntity();
      if (e?.kind === "npc") {
        this.say(String(e.props?.name ?? (e.id === "maren" ? "Elder Maren" : e.id)), String(e.props?.line ?? "..."));
        if (e.props?.battle) this.pendingBattle = e;
        return;
      }
      if (e?.kind === "sign") { this.say("", String(e.props?.text ?? "")); return; }
    }
    if (inp.wasPressed("menu")) { this.save("1"); this.toast.text = "Saved"; this.toastTime = 1.5; }
    const a = inp.axis();
    this.player.moving = a.x !== 0 || a.y !== 0;
    if (!this.player.moving) return;
    if (a.x) this.player.facing = a.x > 0 ? "right" : "left"; else this.player.facing = a.y > 0 ? "down" : "up";
    const len = Math.hypot(a.x, a.y), sp = (inp.isHeld("run") ? RUN : WALK) * dt;
    const bx = this.player.x + BOX.ox, by = this.player.y + BOX.oy;
    const moved = this.map.move(bx, by, BOX.w, BOX.h, (a.x / len) * sp, (a.y / len) * sp);
    let nx = moved.x, ny = moved.y;
    if (this.blockedByNpc(nx, by)) nx = bx;
    if (this.blockedByNpc(nx, ny)) ny = by;
    this.player.x = nx - BOX.ox; this.player.y = ny - BOX.oy;
    this.player.step += dt * (inp.isHeld("run") ? 12 : 8);
  }

  render(): void {
    const p = this.player;
    p.sprite.texture = this.sheet("rhea")[p.facing][p.moving ? Math.floor(p.step) % 4 : 0];
    p.sprite.x = Math.round(p.x); p.sprite.y = Math.round(p.y);
    // depth: things lower on screen draw in front
    const kids = [p.sprite, ...this.npcs.map((n) => n.sprite)].sort((s1, s2) => s1.y - s2.y);
    kids.forEach((s, i) => this.world.setChildIndex(s, 1 + i));
    // camera: centre on the player, clamped to the map, whole pixels only
    const vw = this.game.width / this.zoom, vh = this.game.height / this.zoom;
    const mw = this.map.width * TILE, mh = this.map.height * TILE;
    const cx = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, p.x + 6 - vw / 2));
    const cy = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, p.y + 9 - vh / 2));
    this.world.x = -Math.round(cx) * this.zoom; this.world.y = -Math.round(cy) * this.zoom;
  }

  /** Read-only view for tests and debugging. */
  debug() { return { x: this.player.x, y: this.player.y, facing: this.player.facing, dialog: this.dialog.open ? this.dialog.text.text : null, zoom: this.zoom }; }
}
