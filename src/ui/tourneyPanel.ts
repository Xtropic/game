// The entry table at a kith tournament (data/kith/tournaments.json): the event, its rounds, and which of your
// kith may go in. Up/Down move, Enter picks a kith (or takes the team into the ring on the last row), Esc closes.
import { Container, Graphics, Text } from "pixi.js";
import type { Game } from "../core/game";
import { keyFor, type Input } from "../core/input";
import { SPECIES, type Kith } from "../kith/kith";
import { cannotEnter, entrants, kithRank, rankName, tourney, type Tourney } from "../kith/tourney";
import { sfx } from "../audio/music";

const serif = (size: number, fill: string, bold = false) => ({ fontFamily: "Georgia, serif", fontSize: size, fill, fontWeight: bold ? ("bold" as const) : ("normal" as const) });
const GOLD = 0xe0c070, INK = 0x14100c, SEL = 0x3a2c18;

export class TourneyPanel {
  readonly view = new Container();
  open = false;
  private game!: Game;
  private t!: Tourney;
  private away: (id: string) => boolean = () => false;
  private go: (t: Tourney, team: Kith[]) => void = () => {};
  private team: string[] = [];
  private i = 0;
  private msg = "";
  private w = 800;
  private h = 600;

  constructor() { this.view.visible = false; }
  show(game: Game, id: string, w: number, h: number, away: (id: string) => boolean, go: (t: Tourney, team: Kith[]) => void): void {
    const t = tourney(id); if (!t) return;
    this.game = game; this.t = t; this.away = away; this.go = go; this.w = w; this.h = h; this.i = 0; this.msg = ""; this.team = [];
    this.open = true; this.view.visible = true; sfx.bump(); this.draw();
  }
  close(): void { this.open = false; this.view.visible = false; this.view.removeChildren().forEach((c) => c.destroy({ children: true })); }
  resize(w: number, h: number): void { this.w = w; this.h = h; if (this.open) this.draw(); }

  private able(): Kith[] { return entrants(this.game.flags, this.game.kith, this.t, this.away); }

  update(inp: Input): boolean {
    if (!this.open) return false;
    if (inp.wasPressed("menu") || inp.wasPressed("cancel")) { this.close(); return false; }
    const n = this.able().length + 1;
    if (inp.wasPressed("up")) this.i = (this.i + n - 1) % n;
    else if (inp.wasPressed("down")) this.i = (this.i + 1) % n;
    else if (inp.wasPressed("confirm")) this.pick(this.i);
    else return true;
    if (this.open) this.draw(); return this.open;
  }

  private pick(i: number): void {
    const able = this.able();
    if (i < able.length) {
      const id = able[i].id;
      if (this.team.includes(id)) this.team = this.team.filter((x) => x !== id);
      else if (this.team.length >= this.t.size) { this.msg = `${this.t.size} kith at most in this ring.`; sfx.bump(); return; }
      else this.team.push(id);
      sfx.bump(); this.msg = ""; return;
    }
    const team = this.team.map((id) => this.game.kith[id]).filter(Boolean);
    const no = cannotEnter(this.game.flags, this.game.coin, this.t, team);
    if (no) { this.msg = no; sfx.bump(); return; }
    this.close(); this.go(this.t, team);
  }

  private text(s: string, x: number, y: number, size: number, fill: string, bold = false, wrap = 0): Text {
    const t = new Text({ text: s, style: { ...serif(size, fill, bold), ...(wrap ? { wordWrap: true, wordWrapWidth: wrap, lineHeight: Math.round(size * 1.35) } : {}) } });
    t.x = Math.round(x); t.y = Math.round(y); this.view.addChild(t); return t;
  }
  private row(x: number, y: number, w: number, h: number, on: boolean, tap: () => void): void {
    const g = new Graphics().roundRect(x, y, w, h, 6).fill({ color: on ? SEL : 0x1c1610, alpha: on ? 1 : 0.6 });
    if (on) g.roundRect(x, y, w, h, 6).stroke({ color: GOLD, width: 1 });
    g.eventMode = "static"; g.cursor = "pointer"; g.on("pointertap", tap); this.view.addChild(g);
  }

  private draw(): void {
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    const w = this.w, h = this.h, W = Math.min(760, w - 16), H = Math.min(560, h - 16), x0 = Math.round((w - W) / 2), y0 = Math.round((h - H) / 2);
    const small = W < 560, fs = small ? 13 : 15, t = this.t, g = this.game, f = g.flags;
    const dim = new Graphics().rect(0, 0, w, h).fill({ color: 0, alpha: 0.6 }); dim.eventMode = "static"; this.view.addChild(dim);
    this.view.addChild(new Graphics().roundRect(x0, y0, W, H, 10).fill({ color: INK, alpha: 0.97 }).roundRect(x0, y0, W, H, 10).stroke({ color: GOLD, width: 2 }));
    this.text(t.name, x0 + 16, y0 + 12, fs + 6, "#fff4dc", true);
    const coin = this.text(`Coin ${g.coin}`, 0, y0 + 16, fs + 1, "#e0c070", true); coin.x = x0 + W - coin.width - 16;
    let y = y0 + 16 + fs + 14;
    y += this.text(t.blurb, x0 + 16, y, fs - 1, "#d8ccb4", false, W - 32).height + 6;
    y += this.text(`For ${rankName(t.needs) === "Unranked" ? "kith with no rank yet" : `${rankName(t.needs)}-ranked kith`}. Winners become ${rankName(t.gives)}. Up to ${t.size} go in together. Entry ${t.fee} coin. ${t.rounds.length} rounds. Purse ${f[`won.tourney.${t.id}`] ? Math.round(t.prize.coin / 3) : t.prize.coin} coin${f[`won.tourney.${t.id}`] ? " (you've won it before)" : " and a prize"}.`, x0 + 16, y, fs - 2, "#e0c070", false, W - 32).height + 12;
    const able = this.able(), rowH = fs + 20, x = x0 + 14, lw = W - 28;
    if (!able.length) y += this.text(`None of your kith can enter: this event is for ${rankName(t.needs) === "Unranked" ? "kith with no rank yet" : `${rankName(t.needs)}-ranked kith`}.`, x + 4, y, fs - 1, "#e8b8a0", false, lw).height + 8;
    able.forEach((k, i) => {
      const on = i === this.i, inTeam = this.team.includes(k.id);
      this.row(x, y, lw, rowH - 4, on, () => { this.i = i; this.pick(i); this.draw(); });
      this.text(`${inTeam ? "☑" : "☐"}  ${k.name}`, x + 10, y + 7, fs, on ? "#fff4dc" : "#e8dcc0", on);
      const r = this.text(`${SPECIES[k.species]?.name ?? k.species} · level ${k.level} · ${rankName(kithRank(f, k.id))}`, 0, y + 8, fs - 2, "#a89a80"); r.x = x + lw - r.width - 10;
      y += rowH;
    });
    const go = able.length, on = this.i === go;
    this.row(x, y + 6, lw, rowH, on, () => { this.i = go; this.pick(go); if (this.open) this.draw(); });
    this.text(this.team.length ? `Into the ring with ${this.team.map((id) => g.kith[id]?.name).join(" and ")} (${t.fee} coin)` : "Into the ring (choose kith first)", x + 10, y + 13, fs, on ? "#fff4dc" : "#e0c070", true);
    const fy = y0 + H - 42;
    this.view.addChild(new Graphics().rect(x0 + 12, fy - 4, W - 24, 1).fill({ color: GOLD, alpha: 0.4 }));
    if (this.msg) this.text(this.msg, x0 + 16, fy, fs, "#e8b8a0", false, W - 32);
    const keys = this.text(small ? `${keyFor("cancel")} closes` : `Up/Down choose · ${keyFor("confirm")} picks · ${keyFor("cancel")} closes`, 0, fy + 20, 12, "#8a7e68"); keys.x = x0 + W - keys.width - 16;
    const closeBtn = this.text("Close", x0 + 16, fy + 20, 12, "#e0c070", true); closeBtn.eventMode = "static"; closeBtn.cursor = "pointer"; closeBtn.on("pointertap", () => this.close());
  }
}
