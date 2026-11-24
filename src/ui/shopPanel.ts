// A stall in one of the larger towns (data/towns/shops.json): a list of wares, items and fittings, bought with coin.
// Up/Down move, Enter buys one, Esc closes. All tappable.
import { Container, Graphics, Text } from "pixi.js";
import type { Game } from "../core/game";
import { keyFor, type Input } from "../core/input";
import data from "../../data/towns/shops.json";
import { ITEMS, owned } from "../gear/items";
import { FITTINGS, fittingSummary } from "../gear/weapons";
import { sfx } from "../audio/music";
import { priceAt } from "../command/diplomacy";

export interface Shop { name: string; note: string; wares: [string, number][]; }
export const SHOPS = data.shops as unknown as Record<string, Shop>;

const serif = (size: number, fill: string, bold = false) => ({ fontFamily: "Georgia, serif", fontSize: size, fill, fontWeight: bold ? ("bold" as const) : ("normal" as const) });
const GOLD = 0xe0c070, INK = 0x14100c, SEL = 0x3a2c18;

/** What a ware is called and what it does. */
export function wareInfo(id: string): { name: string; text: string } {
  const it = ITEMS[id]; if (it) return { name: it.name, text: it.text };
  const f = FITTINGS[id]; if (f) return { name: f.name, text: `A fitting for a weapon: ${fittingSummary(f)}.${f.note ? ` ${f.note}` : ""}` };
  return { name: id, text: "" };
}

/** Buys one; returns false if the coin isn't there. */
export function buy(game: { coin: number; flags: Record<string, boolean | number | string> }, id: string, price: number): boolean {
  if (game.coin < price) return false;
  game.coin -= price; game.flags[`have.${id}`] = owned(game.flags, id) + 1; return true;
}

export class ShopPanel {
  readonly view = new Container();
  open = false;
  private game!: Game;
  private shop!: Shop;
  private id = "";
  private i = 0;
  private msg = "";
  private w = 800;
  private h = 600;

  constructor() { this.view.visible = false; }
  show(game: Game, id: string, w: number, h: number): void {
    const s = SHOPS[id]; if (!s) return;
    this.game = game; this.shop = s; this.id = id; this.w = w; this.h = h; this.i = 0; this.msg = ""; this.open = true; this.view.visible = true; sfx.bump(); this.draw();
  }
  close(): void { this.open = false; this.view.visible = false; this.view.removeChildren().forEach((c) => c.destroy({ children: true })); }
  resize(w: number, h: number): void { this.w = w; this.h = h; if (this.open) this.draw(); }

  update(inp: Input): boolean {
    if (!this.open) return false;
    if (inp.wasPressed("menu") || inp.wasPressed("cancel")) { this.close(); return false; }
    const n = this.shop.wares.length;
    if (inp.wasPressed("up")) this.i = (this.i + n - 1) % n;
    else if (inp.wasPressed("down")) this.i = (this.i + 1) % n;
    else if (inp.wasPressed("confirm")) this.buyNow();
    else return true;
    this.draw(); return true;
  }

  private buyNow(): void {
    const [id, list] = this.shop.wares[this.i], price = priceAt(this.game.flags, this.id, list);
    if (buy(this.game, id, price)) { this.msg = `Bought: ${wareInfo(id).name}. In the pack now.`; sfx.bump(); }
    else this.msg = `Not enough coin: it costs ${price}, you have ${this.game.coin}.`;
  }

  private text(s: string, x: number, y: number, size: number, fill: string, bold = false, wrap = 0): Text {
    const t = new Text({ text: s, style: { ...serif(size, fill, bold), ...(wrap ? { wordWrap: true, wordWrapWidth: wrap } : {}) } });
    t.x = Math.round(x); t.y = Math.round(y); this.view.addChild(t); return t;
  }

  private draw(): void {
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    const w = this.w, h = this.h, W = Math.min(720, w - 16), H = Math.min(520, h - 16), x0 = Math.round((w - W) / 2), y0 = Math.round((h - H) / 2);
    const small = W < 560, fs = small ? 13 : 15, s = this.shop, g = this.game;
    const dim = new Graphics().rect(0, 0, w, h).fill({ color: 0, alpha: 0.6 }); dim.eventMode = "static"; this.view.addChild(dim);
    this.view.addChild(new Graphics().roundRect(x0, y0, W, H, 10).fill({ color: INK, alpha: 0.97 }).roundRect(x0, y0, W, H, 10).stroke({ color: GOLD, width: 2 }));
    this.text(s.name, x0 + 16, y0 + 12, fs + 6, "#fff4dc", true);
    const coin = this.text(`Coin ${g.coin}`, 0, y0 + 16, fs + 1, "#e0c070", true); coin.x = x0 + W - coin.width - 16;
    let y = y0 + 16 + fs + 14;
    y += this.text(s.note, x0 + 16, y, fs - 1, "#bfae8e", false, W - 32).height + 10;
    const listW = Math.round(small ? W * 0.5 : W * 0.46), rowH = fs + 20, x = x0 + 14;
    s.wares.forEach(([id, list], k) => {
      const price = priceAt(g.flags, this.id, list);
      const on = k === this.i, ry = y + k * rowH, have = owned(g.flags, id);
      const box = new Graphics().roundRect(x, ry, listW, rowH - 4, 6).fill({ color: on ? SEL : 0x1c1610, alpha: on ? 1 : 0.6 });
      if (on) box.roundRect(x, ry, listW, rowH - 4, 6).stroke({ color: GOLD, width: 1 });
      box.eventMode = "static"; box.cursor = "pointer"; box.on("pointertap", () => { if (this.i === k) this.buyNow(); else this.i = k; this.draw(); });
      this.view.addChild(box);
      this.text(wareInfo(id).name, x + 10, ry + 7, fs, on ? "#fff4dc" : "#e8dcc0", on);
      const p = this.text(`${price}${have ? `  (have ${have})` : ""}`, 0, ry + 8, fs - 2, price > g.coin ? "#a07060" : "#e0c070"); p.x = x + listW - p.width - 10;
    });
    const [id, list] = s.wares[this.i], price = priceAt(g.flags, this.id, list), info = wareInfo(id), dx = x + listW + 18, dw = W - listW - 46;
    let dy = y;
    dy += this.text(info.name, dx, dy, fs + 3, "#fff4dc", true, dw).height + 6;
    dy += this.text(info.text, dx, dy, fs - 1, "#d8ccb4", false, dw).height + 10;
    this.text(g.coin >= price ? `${keyFor("confirm")} to buy one for ${price} coin.` : `Costs ${price} coin.`, dx, dy, fs - 1, g.coin >= price ? "#cfe8b0" : "#e8b8a0", false, dw);
    const fy = y0 + H - 42;
    this.view.addChild(new Graphics().rect(x0 + 12, fy - 4, W - 24, 1).fill({ color: GOLD, alpha: 0.4 }));
    if (this.msg) this.text(this.msg, x0 + 16, fy, fs, "#cfe8b0", false, W - 32);
    const keys = this.text(small ? `${keyFor("cancel")} closes` : `Up/Down choose · ${keyFor("confirm")} buys · ${keyFor("cancel")} closes`, 0, fy + 20, 12, "#8a7e68"); keys.x = x0 + W - keys.width - 16;
    const closeBtn = this.text("Close", x0 + 16, fy + 20, 12, "#e0c070", true); closeBtn.eventMode = "static"; closeBtn.cursor = "pointer"; closeBtn.on("pointertap", () => this.close());
  }
}
