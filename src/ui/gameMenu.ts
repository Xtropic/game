// The menu (Tab or M, or the Menu button): five pages.
//   Party     everyone in the company: level, experience, health, the seven attributes, weapon; kith too
//   Gear      each keepsake weapon: its tier and techniques, and the two fittings in it, which can be changed
//   Items     bandages, salves and teas carried, used on whoever needs them
//   Settings  sound, music, effects and voice levels, text speed, battle speed, auto timing, always run
//   Save      save to a slot, or load one
// Keys: Left/Right change page (or a setting), Up/Down move, Enter picks, Esc steps back, Tab/M closes.
// Everything can also be tapped.
import { Container, Graphics, Text } from "pixi.js";
import type { Game } from "../core/game";
import type { Input } from "../core/input";
import { ATTRS, PEOPLE, attrsAt, party as battle, xpToNext, MAX_LEVEL, type Attr, type Attrs } from "../cast/attributes";
import { FITTINGS, KEEPSAKES, TIERS, equip, fittingSummary, fittingsFor, keepsake, spare, techniques, weaponName, weaponPower, withGear, type Loadout } from "../gear/weapons";
import { ITEMS, itemsOwned, owned, useItem } from "../gear/items";
import { SPECIES, kithAttrs } from "../kith/kith";
import { readKith } from "../kith/upbringing";
import { audio, sfx } from "../audio/music";
import { BATTLE_SPEEDS, TEXT_SPEEDS, settings } from "../core/settings";
import { joinerFor, portrait } from "./joinCard";
import { unitIdOf } from "../battle/encounters";
import type { Slot } from "../core/save";

export interface MenuHost {
  game: Game;
  /** Display names by id. */
  names: Record<string, string>;
  /** The hero and whoever is travelling with them now, by story id. */
  travelling(): string[];
  /** Everyone who has joined, by story id. */
  company(): string[];
  health(): Record<string, number>;
  setHealth(h: Record<string, number>): void;
  save(slot: Slot): void;
  /** Loads a slot: the game starts again from it. */
  load(slot: Slot): void;
}

interface Member { id: string; name: string; kith: boolean; unit: string; travelling: boolean; }

const TABS = ["Party", "Gear", "Items", "Settings", "Save"] as const;
type Focus = "tabs" | "list" | "slots" | "pick" | "target" | "confirm";

/** What each attribute does, in a few plain words. */
export const ATTR_NOTES: Record<Attr, string> = {
  might: "Strength: blows, charges, heavy work",
  grit: "Toughness: health, taking a hit",
  finesse: "Precision: shots, timing, slipping blows",
  nerve: "Composure: braces, holding firm",
  wits: "Cunning: acting first, reading foes",
  heart: "Care: healing, song, bonds with kith",
  presence: "Bearing: shaking a foe's nerve, persuading",
};
const KITH_NOTES: Partial<Record<Attr, string>> = { heart: "Loyalty: its bond with you", presence: "Bearing: how it carries itself" };

const SLOT_NAME = { work: "Working part", charm: "Charm" } as const;
const SLOTS = ["work", "charm"] as const;
const TEXT_LABEL: Record<number, string> = { 0.6: "Slow", 1: "Normal", 1.6: "Fast", 3: "Very fast" };
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
const pct = (x: number): string => `${Math.round(x * 100)}%`;

const serif = (size: number, fill: string, bold = false) => ({ fontFamily: "Georgia, serif", fontSize: size, fill, fontWeight: bold ? ("bold" as const) : ("normal" as const) });
const GOLD = 0xe0c070, INK = 0x14100c, SEL = 0x3a2c18;

interface SettingRow { label: string; value: () => string; change: (dir: number) => void; }

export class GameMenu {
  readonly view = new Container();
  open = false;
  private host!: MenuHost;
  private tab = 0;
  private focus: Focus = "list";
  private i = 0; // list cursor
  private slot = 0; // gear slot cursor
  private pick = 0; // fitting or target cursor
  private msg = "";
  private confirm: { text: string; yes: () => void } | null = null;
  private w = 800;
  private h = 600;

  constructor() { this.view.visible = false; }

  show(host: MenuHost, w: number, h: number): void {
    this.host = host; this.w = w; this.h = h;
    this.open = true; this.view.visible = true; this.focus = "list"; this.i = 0; this.msg = ""; this.confirm = null;
    sfx.bump();
    this.draw();
  }
  close(): void { this.open = false; this.view.visible = false; this.clear(); }
  resize(w: number, h: number): void { this.w = w; this.h = h; if (this.open) this.draw(); }

  /** Handles a frame's input. Returns true while the menu stays open. */
  update(inp: Input): boolean {
    if (!this.open) return false;
    if (inp.wasPressed("menu")) { this.close(); return false; }
    const up = inp.wasPressed("up"), down = inp.wasPressed("down"), left = inp.wasPressed("left"), right = inp.wasPressed("right");
    const ok = inp.wasPressed("confirm"), back = inp.wasPressed("cancel");
    if (!(up || down || left || right || ok || back)) return true;
    this.msg = "";
    const f = this.focus, n = this.rowCount();
    if (f === "tabs") {
      if (left || right) this.goTab(this.tab + (right ? 1 : -1));
      else if (down || ok) { this.focus = "list"; this.i = 0; }
      else if (back) { this.close(); return false; }
    } else if (f === "list") {
      if (up) { if (this.i === 0) this.focus = "tabs"; else this.i--; }
      else if (down) this.i = Math.min(Math.max(0, n - 1), this.i + 1);
      else if (TABS[this.tab] === "Settings" && (left || right)) this.settingRows()[this.i]?.change(right ? 1 : -1);
      else if (left || right) this.goTab(this.tab + (right ? 1 : -1));
      else if (ok) this.choose();
      else if (back) { this.close(); return false; }
    } else if (f === "slots") {
      if (up || down) this.slot = 1 - this.slot;
      else if (ok) { this.focus = "pick"; this.pick = 0; }
      else if (back) this.focus = "list";
    } else if (f === "pick" || f === "target") {
      const m = f === "pick" ? this.pickOptions().length : this.travellers().length;
      if (up) this.pick = (this.pick + m - 1) % Math.max(1, m);
      else if (down) this.pick = (this.pick + 1) % Math.max(1, m);
      else if (ok) f === "pick" ? this.fit(this.pick) : this.useOn(this.pick);
      else if (back) this.focus = f === "pick" ? "slots" : "list";
    } else if (f === "confirm") {
      if (ok && this.confirm) { const c = this.confirm; this.confirm = null; this.focus = "list"; c.yes(); }
      else if (back || up || down || left || right) { this.confirm = null; this.focus = "list"; }
    }
    if (this.open) this.draw();
    return this.open;
  }

  private goTab(t: number): void { this.tab = (t + TABS.length) % TABS.length; this.i = 0; this.focus = this.focus === "tabs" ? "tabs" : "list"; sfx.bump(); }

  // ---- who and what ----

  private members(): Member[] {
    const g = this.host.game, trav = this.host.travelling(), seen = new Set<string>(), out: Member[] = [];
    for (const id of [...trav, ...this.host.company()]) {
      if (seen.has(id)) continue; seen.add(id);
      const k = g.kith[id];
      if (!k && !PEOPLE[id]) continue;
      out.push({ id, name: k ? k.name : this.host.names[id] ?? cap(id), kith: !!k, unit: unitIdOf(id), travelling: trav.includes(id) });
    }
    return out;
  }
  private armed(): Member[] { return this.members().filter((m) => !m.kith && keepsake(m.id)); }
  private travellers(): Member[] { return this.members().filter((m) => m.travelling); }
  private loadout(id: string): Loadout { return this.host.game.gear[id] ?? { tier: 0 }; }

  private attrsOf(m: Member, l?: Loadout): Attrs {
    const g = this.host.game, k = g.kith[m.id];
    if (k) return kithAttrs(k);
    const a = attrsAt(m.id, g.progress(m.id).level, g.modsOf(m.id));
    return withGear(a, l ?? this.loadout(m.id));
  }

  private rowCount(): number {
    switch (TABS[this.tab]) {
      case "Party": return this.members().length;
      case "Gear": return this.armed().length;
      case "Items": return itemsOwned(this.host.game.flags).length;
      case "Settings": return this.settingRows().length;
      default: return this.saveRows().length;
    }
  }

  private pickOptions(): (string | undefined)[] {
    const m = this.armed()[this.i]; if (!m) return [];
    const s = SLOTS[this.slot], g = this.host.game, cur = this.loadout(m.id)[s];
    const list: (string | undefined)[] = fittingsFor(g.flags, g.gear, m.id, s).filter((f) => f !== cur);
    if (cur) list.unshift(undefined);
    return list;
  }

  // ---- actions ----

  private choose(): void {
    const tab = TABS[this.tab];
    if (tab === "Gear") { if (this.armed()[this.i]) { this.focus = "slots"; this.slot = 0; } }
    else if (tab === "Items") {
      const id = itemsOwned(this.host.game.flags)[this.i]; if (!id) return;
      if (ITEMS[id].who === "all") this.useOn(-1); else { this.focus = "target"; this.pick = 0; }
    } else if (tab === "Settings") this.settingRows()[this.i]?.change(1);
    else if (tab === "Save") this.saveRows()[this.i]?.act();
  }

  private fit(p: number): void {
    const m = this.armed()[this.i], opts = this.pickOptions(); if (!m || p >= opts.length) return;
    const g = this.host.game, s = SLOTS[this.slot], f = opts[p];
    g.gear = equip(g.flags, g.gear, m.id, s, f);
    this.msg = f ? `${m.name} fits the ${FITTINGS[f].name.toLowerCase()}.` : `${m.name} takes off the ${SLOT_NAME[s].toLowerCase()}.`;
    sfx.pickup();
    this.focus = "slots";
  }

  private useOn(p: number): void {
    const g = this.host.game, id = itemsOwned(g.flags)[this.i]; if (!id) return;
    const item = ITEMS[id], trav = this.travellers(), on = p >= 0 ? trav[p] : undefined;
    const out = useItem(g.flags, id, this.host.health(), on?.unit ?? "", trav.map((t) => t.unit));
    if (!out) { this.msg = item.who === "all" ? "Nobody travelling with you is hurt." : `${on?.name ?? "They"} isn't hurt.`; sfx.bump(); return; }
    this.host.setHealth(out);
    this.msg = item.who === "all" ? `Everyone shares the ${item.name.toLowerCase()}.` : `${on!.name}: ${item.name.toLowerCase()}. Health ${pct(out[on!.unit] ?? 1)}.`;
    sfx.heal();
    this.focus = "list";
    this.i = Math.min(this.i, Math.max(0, itemsOwned(g.flags).length - 1));
  }

  private settingRows(): SettingRow[] {
    const level = (k: "music" | "effects" | "voices", label: string): SettingRow => ({
      label, value: () => (settings.get(k) <= 0 ? "Off" : `${Math.round(settings.get(k) * 10)} / 10`),
      change: (d) => { settings.set(k, Math.max(0, Math.min(1, Math.round(settings.get(k) * 10 + d) / 10))); sfx.bump(); },
    });
    const cycle = <T,>(list: T[], now: T, d: number): T => list[(list.indexOf(now) + d + list.length) % list.length];
    return [
      { label: "Sound", value: () => (audio.on ? "On" : "Off"), change: () => audio.setOn(!audio.on) },
      level("music", "Music"), level("effects", "Effects"), level("voices", "Voices"),
      { label: "Text speed", value: () => TEXT_LABEL[settings.get("textSpeed")] ?? "Normal", change: (d) => settings.set("textSpeed", cycle(TEXT_SPEEDS, settings.get("textSpeed"), d)) },
      { label: "Battle speed", value: () => `x${settings.get("battleSpeed")}`, change: (d) => settings.set("battleSpeed", cycle(BATTLE_SPEEDS, settings.get("battleSpeed"), d)) },
      { label: "Auto timing", value: () => (settings.get("autoTiming") ? "On" : "Off"), change: () => settings.set("autoTiming", !settings.get("autoTiming")) },
      { label: "Always run", value: () => (settings.get("alwaysRun") ? "On" : "Off"), change: () => settings.set("alwaysRun", !settings.get("alwaysRun")) },
    ];
  }
  private static SETTING_NOTES: Record<string, string> = {
    Sound: "Everything at once. N switches it any time.",
    Music: "How loud the music plays.",
    Effects: "Footsteps, blows, doors and the rest.",
    Voices: "Spoken lines. Off shows the words only.",
    "Text speed": "How fast words appear when a line isn't spoken.",
    "Battle speed": "Hurries fights along. Timing rings keep their pace.",
    "Auto timing": "Hits and braces land well without pressing. T in a fight.",
    "Always run": "Run without holding Shift.",
  };

  private saveRows(): { label: string; sub: string; act: () => void }[] {
    const g = this.host.game, list = g.saves.list(), info = (s: Slot) => { const d = list.find((x) => x.slot === s); return d ? `${new Date(d.savedAt).toLocaleString()} · ${Math.floor(d.playSeconds / 3600)}h ${Math.floor((d.playSeconds % 3600) / 60)}m` : "Empty"; };
    const rows: { label: string; sub: string; act: () => void }[] = [];
    for (const s of ["1", "2", "3"] as Slot[]) rows.push({ label: `Save to slot ${s}`, sub: info(s), act: () => {
      const go = () => { this.host.save(s); this.msg = `Saved to slot ${s}.`; sfx.pickup(); };
      if (list.some((x) => x.slot === s)) { this.confirm = { text: `Save over slot ${s}? Enter to confirm, Esc to keep it.`, yes: go }; this.focus = "confirm"; } else go();
    } });
    for (const s of ["1", "2", "3", "auto"] as Slot[]) if (list.some((x) => x.slot === s)) rows.push({ label: s === "auto" ? "Load the last autosave" : `Load slot ${s}`, sub: info(s), act: () => {
      this.confirm = { text: `Load ${s === "auto" ? "the autosave" : `slot ${s}`}? Anything since your last save is lost. Enter to confirm.`, yes: () => this.host.load(s) }; this.focus = "confirm";
    } });
    return rows;
  }

  // ---- drawing ----

  private clear(): void { this.view.removeChildren().forEach((c) => c.destroy({ children: true })); }

  private text(t: string, x: number, y: number, size: number, fill: string, bold = false, wrap = 0): Text {
    const o = new Text({ text: t, style: { ...serif(size, fill, bold), ...(wrap ? { wordWrap: true, wordWrapWidth: wrap, lineHeight: Math.round(size * 1.35) } : {}) } });
    o.x = x; o.y = y; this.view.addChild(o); return o;
  }
  private hit(x: number, y: number, w: number, h: number, on: () => void, selected = false, fill = SEL): void {
    const g = new Graphics().roundRect(x, y, w, h, 5).fill({ color: selected ? fill : 0x000000, alpha: selected ? 0.95 : 0.001 });
    if (selected) g.roundRect(x, y, w, h, 5).stroke({ color: GOLD, width: 1 });
    g.eventMode = "static"; g.cursor = "pointer"; g.on("pointertap", () => { this.msg = ""; on(); if (this.open) this.draw(); });
    this.view.addChild(g);
  }

  private draw(): void {
    this.clear();
    const w = this.w, h = this.h, W = Math.min(900, w - 16), H = Math.min(600, h - 16), x0 = Math.round((w - W) / 2), y0 = Math.round((h - H) / 2);
    const small = W < 620, fs = small ? 13 : 15;
    const dim = new Graphics().rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.6 }); dim.eventMode = "static"; this.view.addChild(dim);
    this.view.addChild(new Graphics().roundRect(x0, y0, W, H, 10).fill({ color: INK, alpha: 0.97 }).roundRect(x0, y0, W, H, 10).stroke({ color: GOLD, width: 2 }));
    // tabs
    const tw = (W - 24) / TABS.length;
    TABS.forEach((t, i) => {
      const tx = x0 + 12 + i * tw, on = i === this.tab;
      this.hit(tx, y0 + 10, tw - 6, 34, () => { this.tab = i; this.i = 0; this.focus = "list"; }, on, on && this.focus === "tabs" ? 0x5a4422 : SEL);
      const label = new Text({ text: t, style: serif(small ? 14 : 18, on ? "#fff4dc" : "#a89a80", on) }); label.anchor.set(0.5, 0.5); label.x = tx + (tw - 6) / 2; label.y = y0 + 27; this.view.addChild(label);
    });
    const body = { x: x0 + 14, y: y0 + 56, w: W - 28, h: H - 56 - 46 };
    const listW = Math.round(small ? Math.min(150, body.w * 0.4) : Math.min(250, body.w * 0.32));
    switch (TABS[this.tab]) {
      case "Party": this.drawParty(body, listW, fs); break;
      case "Gear": this.drawGear(body, listW, fs); break;
      case "Items": this.drawItems(body, listW, fs); break;
      case "Settings": this.drawSettings(body, fs); break;
      default: this.drawSave(body, fs);
    }
    // footer: message or confirm, then the keys
    const fy = y0 + H - 42;
    this.view.addChild(new Graphics().rect(x0 + 12, fy - 4, W - 24, 1).fill({ color: GOLD, alpha: 0.4 }));
    if (this.confirm) this.text(this.confirm.text, x0 + 16, fy, fs, "#ffd890", true, W - 32);
    else if (this.msg) this.text(this.msg, x0 + 16, fy, fs, "#cfe8b0", false, W - 32);
    const keys = this.text(small ? "Tab/M close" : "Arrows move · Enter picks · Esc back · Tab or M closes", 0, fy + 20, 12, "#8a7e68");
    keys.x = x0 + W - keys.width - 16;
    const closeBtn = this.text("Close", x0 + 16, fy + 20, 12, "#e0c070", true); closeBtn.eventMode = "static"; closeBtn.cursor = "pointer"; closeBtn.on("pointertap", () => this.close());
  }

  private list(items: { label: string; sub?: string }[], b: { x: number; y: number; w: number; h: number }, listW: number, fs: number, empty: string): void {
    if (!items.length) { this.text(empty, b.x + 4, b.y + 6, fs, "#a89a80", false, b.w - 8); return; }
    const rowH = items.some((r) => r.sub) ? fs * 2 + 18 : fs + 18, max = Math.max(1, Math.floor(b.h / rowH)), from = Math.max(0, Math.min(this.i - max + 1, items.length - max));
    items.slice(from, from + max).forEach((r, k) => {
      const idx = from + k, y = b.y + k * rowH, on = idx === this.i && this.focus !== "tabs";
      this.hit(b.x, y, listW, rowH - 4, () => { if (this.i === idx && (this.focus === "list")) this.choose(); else { this.i = idx; this.focus = "list"; } }, on);
      this.text(r.label, b.x + 10, y + 6, fs + 1, on ? "#fff4dc" : "#e8dcc0", on);
      if (r.sub) this.text(r.sub, b.x + 10, y + 8 + fs + 2, fs - 2, "#a89a80");
    });
  }

  private bar(x: number, y: number, w: number, frac: number, color: number): void {
    this.view.addChild(new Graphics().roundRect(x, y, w, 8, 4).fill(0x2a201a).roundRect(x, y, Math.max(0, Math.min(1, frac)) * w, 8, 4).fill(color));
  }

  private drawAttrs(a: Attrs, x: number, y: number, w: number, fs: number, kith: boolean, before?: Attrs): number {
    const top = Math.max(30, ...ATTRS.map((k) => a[k]));
    const nameW = fs * 5.4, valW = fs * 3.6, barW = Math.max(40, Math.min(160, w - nameW - valW - 10)), noteX = x + nameW + valW + barW + 14;
    ATTRS.forEach((k, i) => {
      const yy = y + i * (fs + 9);
      this.text(cap(k), x, yy, fs, "#e8dcc0", true);
      const diff = before ? a[k] - before[k] : 0;
      this.text(`${a[k]}${diff ? (diff > 0 ? ` +${diff}` : ` ${diff}`) : ""}`, x + nameW, yy, fs, diff > 0 ? "#b8e0a0" : diff < 0 ? "#e8a090" : "#fff4dc", !!diff);
      this.bar(x + nameW + valW, yy + fs / 2 - 2, barW, a[k] / top, 0xc8a060);
      if (noteX + 120 < x + w) this.text((kith && KITH_NOTES[k]) || ATTR_NOTES[k], noteX, yy + 1, fs - 3, "#9a8e78", false, x + w - noteX);
    });
    return y + ATTRS.length * (fs + 9);
  }

  private drawParty(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const ms = this.members(), hl = this.host.health();
    this.list(ms.map((m) => ({ label: m.name, sub: `${m.kith ? "Kith · " : ""}Level ${m.kith ? this.host.game.kith[m.id].level : this.host.game.progress(m.id).level}${m.travelling ? "" : " · not with you"}` })), b, listW, fs, "Nobody yet.");
    const m = ms[this.i]; if (!m) return;
    const g = this.host.game, x = b.x + listW + 18, w = b.w - listW - 18, narrow = w < 380;
    const size = narrow ? Math.min(90, w) : Math.min(110, Math.round(b.h * 0.26));
    const pic = portrait(joinerFor(m.id, g.kith, this.host.names), size); pic.x = x; pic.y = b.y; this.view.addChild(pic, new Graphics().rect(x, b.y, size, size).stroke({ color: GOLD, width: 1 }));
    // beside the portrait, or under it on a narrow screen
    const tx = narrow ? x : x + size + 14, tw = narrow ? w : w - size - 14;
    let y = narrow ? b.y + size + 8 : b.y;
    const line = (t: string, size2: number, fill: string, bold = false, gap = 4) => { y += this.text(t, tx, y, size2, fill, bold, tw).height + gap; };
    line(m.name, fs + 7, "#fff4dc", true, 6);
    const life = hl[m.unit] ?? 1;
    if (m.kith) {
      const k = g.kith[m.id];
      line(`${SPECIES[k.species]?.name ?? k.species} · level ${k.level} · ${k.temperament}`, fs, "#d8ccb4");
      this.text(`Bond ${Math.round(k.bond)} / 100`, tx, y, fs, "#d8ccb4"); this.bar(tx + fs * 8, y + 5, Math.max(30, Math.min(140, tw - fs * 8)), k.bond / 100, 0xe0905a); y += fs + 8;
      line(`Health ${pct(life)}${life < 1 ? "  (rest in a town or camp, or use an item)" : ""}`, fs - 1, life < 1 ? "#e8b8a0" : "#b8d0a0");
      const end = this.drawAttrs(kithAttrs(k), x, Math.max(y, b.y + size) + 12, w, fs, true);
      this.text(readKith(k)[0], x, end + 6, fs - 1, "#bfae8e", false, w);
      return;
    }
    const p = g.progress(m.id), a = this.attrsOf(m), l = this.loadout(m.id), max = battle.maxHp(a, p.level);
    line(p.level >= MAX_LEVEL ? `Level ${p.level} (highest)` : `Level ${p.level} · ${p.xp} / ${xpToNext(p.level)} to the next`, fs, "#d8ccb4", false, 2);
    this.bar(tx, y + 2, Math.min(220, tw), p.level >= MAX_LEVEL ? 1 : p.xp / xpToNext(p.level), 0x8ab0d0); y += 14;
    line(`Health ${Math.round(max * life)} / ${max}${life < 1 ? "  (wounded)" : ""}`, fs, life < 1 ? "#e8b8a0" : "#b8d0a0");
    if (keepsake(m.id)) line(weaponName(m.id, l), fs - 1, "#e0c070");
    this.drawAttrs(a, x, Math.max(y, b.y + size) + 12, w, fs, false);
  }

  private drawGear(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const ms = this.armed(), g = this.host.game;
    this.list(ms.map((m) => ({ label: m.name, sub: weaponName(m.id, this.loadout(m.id)) })), b, listW, fs, "Nobody with a weapon of their own yet.");
    const m = ms[this.i]; if (!m) return;
    const x = b.x + listW + 18, w = b.w - listW - 18, l = this.loadout(m.id), k = KEEPSAKES[m.id];
    let y = b.y;
    y += this.text(weaponName(m.id, l), x, y, fs + 5, "#fff4dc", true, w).height + 6;
    y += this.text(`${k.name}. ${TIERS[l.tier].name}, ${l.tier + 1} of ${TIERS.length}. Blows x${weaponPower(l).toFixed(2)}.`, x, y, fs - 1, "#d8ccb4", false, w).height + 4;
    const tech = techniques(m.id, l);
    y += this.text(tech.length ? `Techniques: ${tech.join(", ")}` : "No techniques yet. A smith could reforge it.", x, y, fs - 1, "#bfae8e", false, w).height + 10;
    SLOTS.forEach((s, i) => {
      const f = l[s], on = (this.focus === "slots" || this.focus === "pick") && this.slot === i, rh = fs * (f && w < 400 ? 3.4 : 2) + 16;
      this.hit(x, y, w, rh, () => { this.slot = i; this.focus = this.focus === "slots" && this.slot === i ? "pick" : "slots"; this.pick = 0; }, on);
      this.text(SLOT_NAME[s], x + 10, y + 5, fs - 2, "#a89a80");
      this.text(f ? `${FITTINGS[f].name}  ·  ${fittingSummary(FITTINGS[f])}` : "Empty", x + 10, y + fs + 6, fs, f ? "#fff4dc" : "#8a7e68", !!f, w - 20);
      y += rh + 6;
    });
    if (this.focus === "pick") {
      const opts = this.pickOptions(), s = SLOTS[this.slot];
      y += this.text(opts.length ? `Fit to the ${SLOT_NAME[s].toLowerCase()}:` : "Nothing spare fits here. Fittings are found, won and bought on the way.", x, y + 4, fs - 1, "#e0c070", true, w).height + 8;
      opts.forEach((f, i) => {
        const on = i === this.pick, two = !!f && w < 420, rh = two ? fs * 2 + 14 : fs + 14;
        this.hit(x, y, w, rh, () => { this.pick = i; this.fit(i); }, on);
        this.text(f ? `${FITTINGS[f].name} (${spare(g.flags, g.gear, f)})${two ? "\n" : "  ·  "}${fittingSummary(FITTINGS[f])}` : "Take it off", x + 10, y + 5, fs - 1, on ? "#fff4dc" : "#e8dcc0", on, w - 20);
        y += rh + 2;
      });
      const f = opts[this.pick], note = f && FITTINGS[f].note;
      if (note) y += this.text(note, x, y + 4, fs - 2, "#bfae8e", false, w).height + 4;
      // what it would do to them
      const after = { ...l, [s]: f }; if (!f) delete after[s];
      const a0 = this.attrsOf(m), a1 = this.attrsOf(m, after);
      if (y + 7 * (fs + 9) < b.y + b.h) this.drawAttrs(a1, x, y + 10, w, fs - 1, false, a0);
    } else if (this.focus === "slots") this.text("Enter to change what's fitted.", x, y + 4, fs - 2, "#9a8e78");
    else this.text("Enter to change fittings.", x, y + 4, fs - 2, "#9a8e78");
  }

  private drawItems(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const g = this.host.game, ids = itemsOwned(g.flags);
    this.list(ids.map((id) => ({ label: `${ITEMS[id].name}  ×${owned(g.flags, id)}` })), b, listW, fs, "You carry nothing to use yet.");
    const id = ids[this.i]; if (!id) return;
    const it = ITEMS[id], x = b.x + listW + 18, w = b.w - listW - 18;
    let y = b.y;
    y += this.text(it.name, x, y, fs + 5, "#fff4dc", true, w).height + 6;
    y += this.text(it.text, x, y, fs, "#d8ccb4", false, w).height + 10;
    y += this.text(it.who === "all" ? `Gives back ${pct(it.heal)} of everyone's health. Enter to use.` : `Gives back ${pct(it.heal)} of one person's health. Enter, then choose who.`, x, y, fs - 1, "#bfae8e", false, w).height + 12;
    const hl = this.host.health(), trav = this.travellers();
    this.text(this.focus === "target" ? "Use it on:" : "Travelling with you:", x, y, fs - 1, "#e0c070", true); y += fs + 10;
    trav.forEach((m, i) => {
      const on = this.focus === "target" && i === this.pick, life = hl[m.unit] ?? 1, rh = fs + 14;
      this.hit(x, y, w, rh, () => { if (it.who === "all") this.useOn(-1); else { this.pick = i; this.useOn(i); } }, on);
      this.text(m.name, x + 10, y + 5, fs, on ? "#fff4dc" : "#e8dcc0", on);
      this.text(`Health ${pct(life)}`, x + w * 0.45, y + 5, fs - 1, life < 1 ? "#e8b8a0" : "#b8d0a0");
      this.bar(x + w * 0.45 + fs * 7, y + fs / 2 + 2, Math.max(30, w * 0.55 - fs * 7 - 14), life, life < 0.3 ? 0xd06a5a : 0x7fb069);
      y += rh + 2;
    });
  }

  private drawSettings(b: { x: number; y: number; w: number; h: number }, fs: number): void {
    const rows = this.settingRows(), rh = fs + 18, lw = Math.min(260, b.w * 0.4);
    rows.forEach((r, i) => {
      const y = b.y + i * rh, on = i === this.i && this.focus !== "tabs";
      this.hit(b.x, y, b.w, rh - 4, () => { this.i = i; this.focus = "list"; r.change(1); }, on);
      this.text(r.label, b.x + 10, y + 6, fs + 1, on ? "#fff4dc" : "#e8dcc0", on);
      const v = this.text(`◂  ${r.value()}  ▸`, b.x + lw, y + 6, fs + 1, "#e0c070", true);
      // tapping the arrows turns a level down or up
      const dn = new Graphics().rect(v.x - 6, y, 30, rh - 4).fill({ color: 0, alpha: 0.001 }); dn.eventMode = "static"; dn.cursor = "pointer"; dn.on("pointertap", (e) => { e.stopPropagation(); this.i = i; r.change(-1); this.draw(); });
      const upb = new Graphics().rect(v.x + v.width - 24, y, 30, rh - 4).fill({ color: 0, alpha: 0.001 }); upb.eventMode = "static"; upb.cursor = "pointer"; upb.on("pointertap", (e) => { e.stopPropagation(); this.i = i; r.change(1); this.draw(); });
      this.view.addChild(dn, upb);
    });
    const r = rows[this.i];
    if (r) this.text(GameMenu.SETTING_NOTES[r.label] ?? "", b.x + 10, b.y + rows.length * rh + 8, fs - 1, "#9a8e78", false, b.w - 20);
  }

  private drawSave(b: { x: number; y: number; w: number; h: number }, fs: number): void {
    const rows = this.saveRows(), rh = fs * 2 + 18;
    rows.forEach((r, i) => {
      const y = b.y + i * rh, on = i === this.i && this.focus !== "tabs";
      if (y + rh > b.y + b.h) return;
      this.hit(b.x, y, b.w, rh - 4, () => { this.i = i; this.focus = "list"; r.act(); }, on);
      this.text(r.label, b.x + 10, y + 5, fs + 1, on ? "#fff4dc" : "#e8dcc0", on);
      this.text(r.sub, b.x + 10, y + fs + 9, fs - 2, "#a89a80");
    });
  }
}
