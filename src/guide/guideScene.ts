// The Guide on screen. Two ways in:
//   card    the first time a system turns up: a big gold "How it works" card that pauses whatever is underneath
//           (the scene stack only updates the top scene), one page at a time. Several new topics queue up.
//   browse  G (or Menu > Guide) from anywhere: every topic met so far, grouped, to read again at leisure.
// Topics are unlocked by flags guide.<id>; guide.read.<id> marks one as read (no "New" badge).
import { Container, Graphics, Text } from "pixi.js";
import type { Game } from "../core/game";
import type { Scene } from "../core/scene";
import { keyFor } from "../core/input";
import { device } from "../core/device";
import { DragScroll } from "../ui/scroll";
import { settings } from "../core/settings";
import { sfx } from "../audio/music";
import { GROUPS, TOPICS, topic, type GuideTopic } from "./topics";

type Flags = Record<string, boolean | number | string>;
const GOLD = 0xe0c070, INK = 0x14100c, SEL = 0x3a2c18;
const serif = (size: number, fill: string, bold = false, wrap = 0) => ({ fontFamily: "Georgia, serif", fontSize: size, fill, fontWeight: bold ? ("bold" as const) : ("normal" as const), wordWrap: wrap > 0, wordWrapWidth: wrap, lineHeight: Math.round(size * 1.35) });

/** Puts the real keys into a page's text. */
export function keys(text: string): string {
  if (device.taps) text = text // a phone or tablet: say taps where a keyboard has keys
    .replace(/choose a move with Up and Down and press \{confirm\}/g, "tap a move")
    .replace(/Up and Down choose, \{confirm\} buys/g, "Tap one to choose it, tap it again to buy")
    .replace(/Press \{space\} \(or tap\)/g, "Tap").replace(/press \{space\} \(or tap\)/g, "tap")
    .replace(/Press \{confirm\}/g, "Tap").replace(/press \{confirm\}/g, "tap").replace(/with \{confirm\}/g, "with a tap");
  // a placeholder that starts a sentence starts with a capital ("the Guide button" -> "The Guide button")
  return text.replace(/\{(\w+)\}/g, (_, a: string, at: number) => { const k = keyFor(a); return at === 0 || /(^|[.!?:]\s|\n)$/.test(text.slice(Math.max(0, at - 2), at)) ? k[0].toUpperCase() + k.slice(1) : k; });
}

export const met = (f: Flags, id: string): boolean => !!f[`guide.${id}`];
export const unreadCount = (f: Flags): number => TOPICS.filter((t) => f[`guide.${t.id}`] && !f[`guide.read.${t.id}`]).length;

/** Cards show unless the player turned them off. Browser tests skip them unless the page asks (?guide). */
export function cardsOn(): boolean {
  if (typeof navigator !== "undefined" && navigator.webdriver && !(typeof location !== "undefined" && location.search.includes("guide"))) return false;
  return settings.get("tutorials");
}

/**
 * The player has just met these systems. Each one not met before is unlocked in the Guide and, unless cards are
 * off, shown now as a "How it works" card over whatever is on screen. True when a card went up (the caller should
 * hold off whatever it was about to do this frame).
 */
export function teach(game: Game, ...ids: string[]): boolean {
  const fresh = ids.filter((id) => topic(id) && !met(game.flags, id));
  for (const id of fresh) game.flags[`guide.${id}`] = 1;
  if (!fresh.length || !cardsOn()) return false;
  const top = game.scenes.top;
  if (top instanceof GuideScene) { top.enqueue(fresh); return true; }
  game.scenes.push(new GuideScene(game.flags, { kind: "card", ids: fresh }));
  return true;
}

/** Opens the Guide to read, at a topic if given (and met). */
export function openGuide(game: Game, at?: string): void {
  if (game.scenes.top instanceof GuideScene) return;
  sfx.next();
  game.scenes.push(new GuideScene(game.flags, { kind: "browse", at }));
}

type Mode = { kind: "card"; ids: string[] } | { kind: "browse"; at?: string };
type Row = { group: string } | { t: GuideTopic };

export class GuideScene implements Scene {
  readonly id = "guide";
  readonly view = new Container();
  private game!: Game;
  private w = 800; private h = 600;
  private queue: string[] = [];
  private page = 0;
  private T = 0;
  private card = new Container();
  private glow = new Graphics();
  // browse
  private sel = 0;
  private focus: "list" | "text" = "list";
  private maxScroll = 0;
  /** Drag to scroll: the topic list and the page text each scroll on their own. */
  private listScroll = new DragScroll(); private textScroll = new DragScroll();
  private shownSel = -1;

  constructor(private f: Flags, private mode: Mode) {
    if (mode.kind === "card") this.queue = mode.ids.slice();
  }

  enqueue(ids: string[]): void { for (const id of ids) if (!this.queue.includes(id)) this.queue.push(id); if (this.mode.kind === "card") this.draw(); }

  private topics(): GuideTopic[] { return TOPICS.filter((t) => met(this.f, t.id)); }
  private rows(): Row[] {
    const out: Row[] = [];
    for (const g of GROUPS) { const ts = this.topics().filter((t) => t.group === g); if (ts.length) out.push({ group: g }, ...ts.map((t) => ({ t }))); }
    return out;
  }
  private picks(): GuideTopic[] { return this.rows().flatMap((r) => ("t" in r ? [r.t] : [])); }

  enter(game: Game): void {
    this.game = game;
    if (this.mode.kind === "browse") {
      const want = this.mode.at, ps = this.picks(), at = want ? ps.findIndex((t) => t.id === want) : -1;
      const unread = ps.findIndex((t) => !this.f[`guide.read.${t.id}`]);
      this.sel = Math.max(0, at >= 0 ? at : unread);
    } else sfx.join();
    this.view.eventMode = "static";
    this.draw();
  }
  exit(): void { this.listScroll.destroy(); this.textScroll.destroy(); }
  resize(w: number, h: number): void { this.w = w; this.h = h; if (this.game) this.draw(); }

  // ---------------------------------------------------------------- input
  update(dt: number): void {
    this.T += dt;
    const inp = this.game.input;
    if (this.mode.kind === "card") {
      const pulse = 0.5 + 0.5 * Math.sin(this.T * 3);
      this.glow.alpha = 0.35 + pulse * 0.45;
      const s = Math.min(1, this.T * 6); this.card.scale.set(0.92 + 0.08 * (1 - (1 - s) ** 3)); this.card.alpha = s;
      if (this.T < 0.25) return; // a stray press from whatever was underneath shouldn't skip the card
      if (inp.wasPressed("confirm") || inp.wasPressed("right")) this.next();
      else if (inp.wasPressed("left") || inp.wasPressed("up")) this.back();
      else if (inp.wasPressed("cancel") || inp.wasPressed("guide")) this.skip();
      return;
    }
    const ps = this.picks();
    if (inp.wasPressed("cancel")) { if (this.focus === "text") { this.focus = "list"; this.draw(); } else this.close(); return; }
    if (inp.wasPressed("guide") || inp.wasPressed("menu")) { this.close(); return; }
    if (this.focus === "list") {
      if (inp.wasPressed("up")) { this.sel = (this.sel + ps.length - 1) % Math.max(1, ps.length); sfx.bump(); this.draw(); }
      if (inp.wasPressed("down")) { this.sel = (this.sel + 1) % Math.max(1, ps.length); sfx.bump(); this.draw(); }
      if ((inp.wasPressed("confirm") || inp.wasPressed("right")) && this.maxScroll > 0) { this.focus = "text"; this.draw(); }
    } else {
      if (inp.wasPressed("up")) this.scrollBy(-80);
      if (inp.wasPressed("down") || inp.wasPressed("confirm")) this.scrollBy(80);
      if (inp.wasPressed("left")) { this.focus = "list"; this.draw(); }
    }
  }

  private scrollBy(d: number): void {
    this.textScroll.to(this.textScroll.scroll + d);
  }

  private next(): void {
    const t = topic(this.queue[0]); if (!t) { this.skip(); return; }
    if (this.page < t.pages.length - 1) { this.page++; sfx.bump(); this.draw(); } else this.skip(true);
  }
  private back(): void { if (this.page > 0) { this.page--; sfx.bump(); this.draw(); } }
  /** Done with the topic on the card. Read to the end, it counts as read; skipped, it stays marked New in the Guide. */
  private skip(read = false): void {
    const id = this.queue.shift(); if (id && read) this.f[`guide.read.${id}`] = 1;
    this.page = 0;
    if (!this.queue.length) { sfx.next(); this.close(); return; }
    sfx.join(); this.T = 0.2; this.draw();
  }
  private close(): void { if (this.game.scenes.top === this) this.game.scenes.pop(); }

  // ---------------------------------------------------------------- drawing
  private clear(): void { this.view.removeChildren().forEach((c) => c.destroy({ children: true })); this.card = new Container(); this.glow = new Graphics(); }

  private draw(): void {
    this.clear();
    const dim = new Graphics().rect(0, 0, this.w, this.h).fill({ color: 0x000000, alpha: 0.62 });
    dim.eventMode = "static"; this.view.addChild(dim);
    if (this.mode.kind === "card") this.drawCard(); else this.drawBrowse();
  }

  private button(label: string, x: number, y: number, primary: boolean, act: () => void, fs: number): Container {
    const c = new Container(), t = new Text({ text: label, style: serif(fs, primary ? "#2a1a08" : "#f2e3c4", true) });
    const bw = t.width + 30, bh = t.height + 14;
    const bg = new Graphics().roundRect(0, 0, bw, bh, 8).fill(primary ? 0xf0c060 : 0x2a2016).stroke({ color: primary ? 0x6a4410 : GOLD, width: 2 });
    t.x = 15; t.y = 7; c.addChild(bg, t); c.x = x - bw; c.y = y;
    c.eventMode = "static"; c.cursor = "pointer"; c.on("pointertap", act);
    return c;
  }

  private drawCard(): void {
    const t = topic(this.queue[0]); if (!t) return;
    const small = this.w < 640, fs = small ? 15 : 18;
    const W = Math.min(760, this.w - 24);
    const pg = t.pages[this.page];
    // measure the body first, so the card fits its page
    const head = new Text({ text: (device.taps && pg.touchHead ? pg.touchHead : pg.head), style: serif(fs + 3, "#ffe39a", true, W - 64) });
    const body = new Text({ text: keys(device.taps && pg.touch ? pg.touch : pg.text), style: serif(fs, "#fff4dc", false, W - 64) });
    const H = Math.min(this.h - 24, 150 + head.height + body.height + 90);
    const x0 = Math.round((this.w - W) / 2), y0 = Math.round((this.h - H) / 2);
    this.card.pivot.set(W / 2, H / 2); this.card.x = x0 + W / 2; this.card.y = y0 + H / 2;
    this.glow.roundRect(-10, -10, W + 20, H + 20, 18).fill({ color: 0xffd070, alpha: 0.35 });
    const panel = new Graphics().roundRect(0, 0, W, H, 12).fill({ color: INK, alpha: 0.98 }).roundRect(0, 0, W, H, 12).stroke({ color: GOLD, width: 4 }).roundRect(8, 8, W - 16, H - 16, 8).stroke({ color: GOLD, width: 1, alpha: 0.5 });
    // ribbon
    const ribbonTxt = new Text({ text: this.queue.length > 1 ? `HOW IT WORKS  ·  ${this.queue.length} new` : "HOW IT WORKS", style: { ...serif(fs - 3, "#2a1a08", true), letterSpacing: 3 } });
    const rw = ribbonTxt.width + 36, ribbon = new Graphics().roundRect((W - rw) / 2, -16, rw, 32, 8).fill(0xf0c060).stroke({ color: 0x6a4410, width: 2 });
    ribbonTxt.x = (W - ribbonTxt.width) / 2; ribbonTxt.y = -16 + (32 - ribbonTxt.height) / 2;
    const title = new Text({ text: t.title, style: serif(small ? 24 : 30, "#fff4dc", true) }); title.x = (W - title.width) / 2; title.y = 30;
    const rule = new Graphics().rect(32, title.y + title.height + 10, W - 64, 1).fill({ color: GOLD, alpha: 0.5 });
    head.x = 32; head.y = title.y + title.height + 24; body.x = 32; body.y = head.y + head.height + 8;
    this.card.addChild(this.glow, panel, ribbon, ribbonTxt, title, rule, head, body);
    // page dots
    const n = t.pages.length, dots = new Graphics();
    for (let i = 0; i < n; i++) dots.circle(W / 2 - (n - 1) * 9 + i * 18, H - 64, i === this.page ? 5 : 3.5).fill(i === this.page ? 0xffd070 : 0x6a5a40);
    if (n > 1) this.card.addChild(dots);
    const last = this.page >= n - 1;
    const by = H - 50;
    this.card.addChild(this.button(last ? (this.queue.length > 1 ? "Next topic  ▶" : "Got it") : "Next  ▶", W - 28, by - 8, true, () => this.next(), fs - 1));
    if (this.page > 0) this.card.addChild(this.button("◀  Back", W - 28 - (last ? 140 : 120) - 20, by - 8, false, () => this.back(), fs - 1));
    const foot = new Text({ text: `${keyFor("confirm")}: next   ·   ${keyFor("cancel")}: skip   ·   Kept in the Guide (${keyFor("guide")})`, style: serif(fs - 4, "#a89a80", false, W - 300) });
    foot.x = 28; foot.y = by + 2; if (!small && !device.taps) this.card.addChild(foot); else foot.destroy();
    this.view.addChild(this.card);
  }

  private drawBrowse(): void {
    const small = this.w < 640, fs = small ? 14 : 16;
    const W = Math.min(980, this.w - 16), H = this.h - 24, x0 = Math.round((this.w - W) / 2), y0 = 12;
    this.view.addChild(new Graphics().roundRect(x0, y0, W, H, 10).fill({ color: INK, alpha: 0.97 }).roundRect(x0, y0, W, H, 10).stroke({ color: GOLD, width: 2 }));
    const title = new Text({ text: "Guide", style: serif(small ? 22 : 26, "#fff4dc", true) }); title.x = x0 + 18; title.y = y0 + 12;
    const sub = new Text({ text: "How everything works", style: serif(fs - 2, "#a89a80") }); sub.x = title.x + title.width + 12; sub.y = title.y + title.height - sub.height - 3;
    this.view.addChild(title, sub);
    this.view.addChild(this.button("Close  ✕", x0 + W - 14, y0 + 12, false, () => this.close(), fs - 2));
    const ps = this.picks();
    this.sel = Math.min(this.sel, Math.max(0, ps.length - 1));
    const sel = ps[this.sel];
    if (sel) this.f[`guide.read.${sel.id}`] = 1;
    const top = y0 + 58, bottom = y0 + H - 34, stack = W < 520 && this.h > this.w;
    const listW = stack ? W - 24 : small ? Math.min(150, W * 0.36) : 240;
    const listH = stack ? Math.min(Math.round((bottom - top) * 0.34), 230) : bottom - top;
    this.view.addChild(new Graphics().rect(x0 + 12, top - 6, W - 24, 1).fill({ color: GOLD, alpha: 0.4 }));
    if (this.sel !== this.shownSel) { this.textScroll.reset(); }
    // the list of topics: all of them, scrolling with a drag when they don't fit
    let y = top, i = 0, selY = top, selH = 0;
    const listFrom = this.view.children.length;
    for (const r of this.rows()) {
      if ("group" in r) { const g = new Text({ text: r.group.toUpperCase(), style: { ...serif(fs - 4, "#c8a860", true), letterSpacing: 2 } }); g.x = x0 + 18; g.y = y + 4; this.view.addChild(g); y += g.height + 8; continue; }
      const idx = i++, on = idx === this.sel, fresh = !this.f[`guide.read.${r.t.id}`];
      const label = new Text({ text: r.t.title, style: serif(fs, on ? "#fff4dc" : "#d8ccb4", on, listW - (fresh && !on ? 62 : 24)) });
      const rowH = Math.max(label.height + 8, device.touch ? 40 : 0);
      if (on) { selY = y; selH = rowH; }
      const bg = new Graphics().roundRect(x0 + 12, y, listW, rowH, 6).fill({ color: on ? SEL : 0x000000, alpha: on ? 1 : 0.001 });
      if (on) bg.roundRect(x0 + 12, y, listW, rowH, 6).stroke({ color: this.focus === "list" ? GOLD : 0x6a5a40, width: 1.5 });
      bg.eventMode = "static"; bg.cursor = "pointer"; bg.on("pointertap", () => { if (this.listScroll.dragged) return; this.sel = idx; this.focus = "list"; sfx.bump(); this.draw(); });
      label.x = x0 + 24; label.y = y + (rowH - label.height) / 2; label.eventMode = "none";
      this.view.addChild(bg, label);
      if (fresh && !on) { const nb = new Text({ text: "NEW", style: serif(fs - 5, "#2a1a08", true) }); const nbg = new Graphics().roundRect(x0 + 12 + listW - nb.width - 16, y + (rowH - nb.height - 4) / 2, nb.width + 10, nb.height + 4, 4).fill(0xf0c060); nb.x = x0 + 12 + listW - nb.width - 11; nb.y = y + (rowH - nb.height) / 2; this.view.addChild(nbg, nb); }
      y += rowH + 2;
    }
    const left = TOPICS.length - ps.length;
    if (left > 0) { const more = new Text({ text: `${left} more page${left > 1 ? "s" : ""} open as you meet new things.`, style: serif(fs - 3, "#8a7e68", false, listW - 8) }); more.x = x0 + 18; more.y = y + 8; this.view.addChild(more); }
    this.listScroll.wrap(this.view, listFrom, { x: x0 + 8, y: top - 2, w: listW + 8, h: listH + 2 });
    if (this.sel !== this.shownSel) this.listScroll.show(selY, selH);
    this.shownSel = this.sel;
    // the chosen topic, all its pages, scrolling
    const tx = stack ? x0 + 20 : x0 + 12 + listW + 22, tw = x0 + W - 18 - tx, ttop = stack ? top + listH + 14 : top, th = bottom - ttop;
    if (stack) this.view.addChild(new Graphics().rect(x0 + 12, ttop - 7, W - 24, 1).fill({ color: GOLD, alpha: 0.3 }));
    else this.view.addChild(new Graphics().rect(tx - 12, top, 1, th).fill({ color: GOLD, alpha: 0.3 }));
    if (sel) {
      const from = this.view.children.length; let by = ttop;
      const add = (t: Text) => { t.x = tx; t.y = by; this.view.addChild(t); return t; };
      by += add(new Text({ text: sel.title, style: serif(fs + 8, "#fff4dc", true, tw) })).height + 12;
      for (const pg of sel.pages) {
        by += add(new Text({ text: (device.taps && pg.touchHead ? pg.touchHead : pg.head), style: serif(fs + 1, "#ffe39a", true, tw) })).height + 4;
        by += add(new Text({ text: keys(device.taps && pg.touch ? pg.touch : pg.text), style: serif(fs, "#e8dcc0", false, tw) })).height + 16;
      }
      this.textScroll.wrap(this.view, from, { x: tx - 4, y: ttop, w: tw + 12, h: th });
      this.maxScroll = this.textScroll.max;
    } else this.maxScroll = 0;
    const hint = new Text({ text: device.taps ? `Tap a topic${this.maxScroll > 0 ? "   ·   Drag the page to read on" : ""}` : `Up/Down: choose${this.maxScroll > 0 ? `   ·   ${this.focus === "list" ? `${keyFor("confirm")} or Right: read on` : "Up/Down: scroll   ·   Left: back to the list"}` : ""}   ·   ${keyFor("cancel")} or ${keyFor("guide")}: close`, style: serif(fs - 3, "#a89a80", false, W - 36) });
    hint.x = x0 + 18; hint.y = y0 + H - 26; this.view.addChild(hint);
  }
}
