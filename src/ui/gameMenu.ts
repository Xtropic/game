// The menu (Tab or M, or the Menu button): six pages.
//   Party     everyone in the company: level, experience, health, the seven attributes, weapon; kith too.
//             Enter picks who travels with Rhea (the party picker); the rest wait at camp
//   Gear      each keepsake weapon: its tier and techniques, and the two fittings in it, which can be changed
//   Items     bandages, salves and teas carried, used on whoever needs them
//   Command   Rhea's rank and what it opens; the nations: standing, their price, and envoys, gifts, demands, pacts, marches
//   Settings  sound, music, effects and voice levels, text speed, battle speed, auto timing, always run
//   Save      save to a slot, or load one
// Keys: Left/Right change page (or a setting), Up/Down move, Enter picks, Esc steps back, Tab/M closes.
// Everything can also be tapped.
import { device, say } from "../core/device";
import { DragScroll, type Rect } from "./scroll";
import { Container, Graphics, Text } from "pixi.js";
import type { Game } from "../core/game";
import { TOPICS, type GuideTopic } from "../guide/topics";
import { keys, met, teach } from "../guide/guideScene";
import { keyFor, padState, type Input } from "../core/input";
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
import { RANKS, rankIndex, rankOf } from "../command/ranks";
import { kithRank, rankName } from "../kith/tourney";
import { ENVOY_COST, GIFT, bestEnvoy, canMarch, canTalk, demand, fate, knownNations, mood, owed, sealPact, sendEnvoy, sendGift, standing, type Nation, type Result } from "../command/diplomacy";

export interface MenuHost {
  game: Game;
  /** Display names by id. */
  names: Record<string, string>;
  /** The hero and whoever is travelling with them now, by story id. */
  travelling(): string[];
  /** Everyone who has joined, by story id. */
  company(): string[];
  /** Who the party is meant to be, by story id: the picker's choice, even while a scene has the hero alone. */
  inParty(): string[];
  /** Puts someone into the travelling party or leaves them at camp; says what happened. */
  setTravelling(id: string): string;
  health(): Record<string, number>;
  setHealth(h: Record<string, number>): void;
  save(slot: Slot): void;
  /** Loads a slot: the game starts again from it. */
  load(slot: Slot): void;
  /** The hero now (only Rhea commands). */
  hero(): string;
  /** Leads the Commons against a nation (closes the menu; the army battle follows). */
  march(nation: string): void;
  /** Opens Thornwick's ledger (closes the menu); says why not when it can't. */
  ledger(): string | undefined;
  /** Opens the Guide (over the menu), at a topic if given. */
  guide(at?: string): void;
}

interface Member { id: string; name: string; kith: boolean; unit: string; travelling: boolean; /** In the party the player picked (may be waiting at camp while a scene has Rhea alone). */ party: boolean; }

const TABS = ["Party", "Gear", "Items", "Thornwick", "Command", "Guide", "Settings", "Save"] as const;
/** Pages with a list to pick from (they get the band on a narrow upright screen). */
const LISTED = new Set<string>(["Party", "Gear", "Items", "Thornwick", "Command", "Guide"]);
const ACTIONS = ["Send an envoy", "Send a gift", "Make demands", "Seal the pact", "March on them"] as const;
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
  /** The page body scrolls with a drag when it's taller than the screen. */
  private scroller = new DragScroll();
  private lastPage = "";
  /** On a narrow upright screen the list sits in a band above the page instead of beside it. */
  private band: Rect | null = null;
  /** How tall the band's list wants to be, by page (it shrinks to fit a short list). */
  private bandNeed: Record<string, number> = {}; private listNeed = 0; private bandMax = 0; private refitting = false;

  constructor() { this.view.visible = false; }

  show(host: MenuHost, w: number, h: number): void {
    this.host = host; this.w = w; this.h = h;
    this.open = true; this.view.visible = true; this.focus = "list"; this.i = 0; this.msg = ""; this.confirm = null;
    sfx.bump();
    this.draw();
  }
  close(): void { this.open = false; this.view.visible = false; this.clear(); this.scroller.off(); }
  resize(w: number, h: number): void { this.w = w; this.h = h; if (this.open) this.draw(); }

  /** Handles a frame's input. Returns true while the menu stays open. */
  update(inp: Input): boolean {
    if (!this.open) return false;
    if (inp.wasPressed("menu")) { this.close(); return false; }
    if ((inp.wasPressed("notes") || inp.wasPressed("ledger")) && (this.focus === "tabs" || this.focus === "list")) { this.msg = ""; this.goTab(this.tab + (inp.wasPressed("ledger") ? 1 : -1)); return true; } // LB / RB
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
    } else if (f === "pick" && TABS[this.tab] === "Command") {
      const m = ACTIONS.length;
      if (up) this.pick = (this.pick + m - 1) % m;
      else if (down) this.pick = (this.pick + 1) % m;
      else if (ok) this.act(this.pick);
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

  private goTab(t: number): void { this.tab = (t + TABS.length) % TABS.length; if (TABS[this.tab] === "Gear") teach(this.host.game, "gear"); this.i = 0; this.focus = this.focus === "tabs" ? "tabs" : "list"; sfx.bump(); }

  // ---- who and what ----

  private members(): Member[] {
    const g = this.host.game, trav = this.host.travelling(), party = new Set([...this.host.inParty(), trav[0]]), seen = new Set<string>(), out: Member[] = [];
    for (const id of [...trav, ...this.host.inParty(), ...this.host.company()]) {
      if (seen.has(id)) continue; seen.add(id);
      const k = g.kith[id];
      if (!k && !PEOPLE[id]) continue;
      out.push({ id, name: k ? k.name : this.host.names[id] ?? cap(id), kith: !!k, unit: unitIdOf(id), travelling: trav.includes(id), party: party.has(id) });
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
      case "Thornwick": return 1;
      case "Command": return 1 + knownNations(this.host.game.flags).length;
      case "Guide": return this.guideTopics().length;
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
    if (tab === "Party") { const m = this.members()[this.i]; if (m) this.msg = this.host.setTravelling(m.id); }
    else if (tab === "Gear") { if (this.armed()[this.i]) { this.focus = "slots"; this.slot = 0; } }
    else if (tab === "Items") {
      const id = itemsOwned(this.host.game.flags)[this.i]; if (!id) return;
      if (ITEMS[id].battle) { this.msg = "That one is for fights: choose it on someone's turn."; return; }
      if (ITEMS[id].who === "all") this.useOn(-1); else { this.focus = "target"; this.pick = 0; }
    } else if (tab === "Guide") { const t = this.guideTopics()[this.i]; this.host.guide(t?.id); }
    else if (tab === "Thornwick") { const why = this.host.ledger(); if (why) this.msg = why; }
    else if (tab === "Command") {
      if (this.i === 0) return;
      if (this.host.hero() !== "rhea") { this.msg = "Only Rhea deals with the nations."; return; }
      const n = this.nationAt(); if (n?.enemy) { this.msg = canTalk(this.host.game.flags, n) ?? ""; return; }
      this.focus = "pick"; this.pick = 0;
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

  // ---- command: rank and nations ----

  private nationAt(): Nation | undefined { return this.i > 0 ? knownNations(this.host.game.flags)[this.i - 1] : undefined; }
  private envoys() {
    const g = this.host.game, hero = this.host.hero();
    return this.host.company().filter((id) => id !== hero && !g.kith[id] && PEOPLE[id]).map((id) => ({ id, name: this.host.names[id] ?? cap(id), attrs: attrsAt(id, g.progress(id).level, g.modsOf(id)) }));
  }
  private act(k: number): void {
    const n = this.nationAt(); if (!n) return;
    const g = this.host.game, f = g.flags, a = ACTIONS[k];
    let r: Result;
    if (a === "Send an envoy") {
      const e = bestEnvoy(this.envoys());
      if (!e) { this.msg = "There's nobody in the company to send."; return; }
      r = sendEnvoy(f, g.coin, n, e, Math.random);
    } else if (a === "Send a gift") r = sendGift(f, g.coin, n);
    else if (a === "Make demands") { const h = this.host.hero(); r = demand(f, g.coin, n, attrsAt(h, g.progress(h).level, g.modsOf(h)), Math.random); }
    else if (a === "Seal the pact") r = sealPact(f, g.coin, n);
    else {
      const why = canMarch(f, n);
      if (why) { this.msg = why; sfx.bump(); return; }
      this.confirm = { text: `March the Commons on ${n.name}? This can't be taken back.${say(" Enter to march, Esc to think again.", "")}`, yes: () => { this.close(); this.host.march(n.id); } };
      this.focus = "confirm"; return;
    }
    if (r.coin !== undefined) g.coin = r.coin;
    this.msg = r.text;
    if (r.ok) { if (a === "Seal the pact") sfx.join(); else sfx.pickup(); this.host.save("auto"); } else sfx.bump();
  }

  private drawThornwick(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const f = this.host.game.flags, open = !!f["base.open"];
    this.list([{ label: "Open the ledger", sub: open ? "Works, people, forge, pens, roads" : "Not yet" }], b, listW, fs, "");
    const x = b.x + listW + 18, w = b.w - listW - 18;
    let y = b.y;
    const line = (t: string, size: number, fill: string, bold = false, gap = 6) => { y += this.text(t, x, y, size, fill, bold, w).height + gap; };
    line("Thornwick's ledger", fs + 6, "#fff4dc", true, 8);
    if (!open) { line("Once Thornwick is yours, Dorrit keeps a ledger of it: what it holds, who works where, what is being built.", fs - 1, "#d8ccb4"); return; }
    line("Dorrit's book of everything Thornwick holds: buildings and what they cost, who works where, the forge, the kith pens and breeding, things to make, and kith sent out on the roads.", fs - 1, "#d8ccb4");
    line(`Coin ${this.host.game.coin}  ·  Supplies ${Number(f.supplies ?? 0)}`, fs - 1, "#e0c070");
    line(`${say(`Press ${keyFor("confirm")} here, or ${keyFor("ledger")} anywhere,`, "Tap it again here, or tap the Ledger button,")} to open it. At Thornwick it also lies on the crates in the yard, marked with a sign.`, fs - 2, "#9a8e78");
    if (this.focus !== "tabs" && !this.msg) this.msg = say("Enter opens Thornwick's ledger.", "Tap it again to open Thornwick's ledger.");
  }

  private guideTopics(): GuideTopic[] { return TOPICS.filter((t) => met(this.host.game.flags, t.id)); }

  private drawGuide(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const f = this.host.game.flags, ts = this.guideTopics();
    this.list(ts.map((t) => ({ label: t.title, sub: f[`guide.read.${t.id}`] ? t.group : `${t.group}  ·  NEW` })), b, listW, fs, "Nothing yet.");
    const x = b.x + listW + 18, w = b.w - listW - 18;
    let y = b.y;
    const line = (t: string, size: number, fill: string, bold = false, gap = 6) => { y += this.text(t, x, y, size, fill, bold, w).height + gap; };
    const t = ts[this.i];
    if (!t || this.focus === "tabs") {
      line("The Guide", fs + 6, "#fff4dc", true, 8);
      line(`How every part of the game works: battles, wounds, levels, your company, Thornwick, kith, ranks, duels and armies. A page opens the first time you meet something new, and stays here. ${say(keyFor("guide"), "The Guide button")} opens the Guide from anywhere, even in the middle of a fight.`, fs - 1, "#d8ccb4");
      return;
    }
    line(t.title, fs + 6, "#fff4dc", true, 8);
    const p0 = t.pages[0], tp = device.taps;
    line(tp && p0.touchHead ? p0.touchHead : p0.head, fs, "#ffe39a", true, 4);
    line(keys(tp && p0.touch ? p0.touch : p0.text), fs - 1, "#d8ccb4", false, 10);
    if (t.pages.length > 1) line(`${t.pages.length - 1} more: ${t.pages.slice(1).map((p) => p.head).join(", ")}.`, fs - 2, "#9a8e78");
    if (!this.msg) this.msg = say(`${keyFor("confirm")} reads the whole page.`, "Tap it again to read the whole page.");
  }

  private drawCommand(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const g = this.host.game, f = g.flags, ns = knownNations(f), r = rankOf(f);
    const tag = (n: Nation): string => n.enemy ? "At war" : fate(f, n) === "pact" ? "Ally" : fate(f, n) === "held" ? "Held by force" : `${mood(standing(f, n))} (${standing(f, n)})`;
    this.list([{ label: `Rank: ${f.rank ? r.id : "None yet"}`, sub: `Pay ${r.pay} coin as the story moves on` }, ...ns.map((n) => ({ label: n.name, sub: tag(n) }))], b, listW, fs, "");
    const x = b.x + listW + 18, w = b.w - listW - 18;
    let y = b.y;
    const line = (t: string, size: number, fill: string, bold = false, gap = 4) => { y += this.text(t, x, y, size, fill, bold, w).height + gap; };
    if (this.i === 0) {
      line(f.rank ? r.id : "Not yet in the army", fs + 6, "#fff4dc", true, 8);
      const me = rankIndex(f);
      RANKS.forEach((rk, k) => {
        if (k > me + 1) return;
        const now = k === me && !!f.rank;
        line(k <= me && f.rank ? `${rk.id}${now ? " (now)" : ""}` : `${rk.id} (not yet)`, fs, now ? "#e0c070" : k <= me ? "#d8ccb4" : "#8a7e68", true, 2);
        for (const o of rk.opens) line(`  · ${o}`, fs - 2, k <= me && f.rank ? "#bfae8e" : "#7a705e", false, 1);
        y += 4;
      });
      line("Promotions come with the story: time served, deeds done, a place to fill, and the company's voice.", fs - 2, "#8a7e68");
      return;
    }
    const n = ns[this.i - 1]; if (!n) return;
    line(n.name, fs + 6, "#fff4dc", true, 2);
    line(`${n.seat}  ·  ${tag(n)}`, fs - 1, "#e0c070", false, 6);
    line(n.blurb, fs - 1, "#d8ccb4", false, 8);
    if (n.enemy) return;
    if (fate(f, n) === "pact") { line(`Ally. ${n.perk?.text ?? ""}`, fs - 1, "#b8e0a0", false, 8); }
    else if (fate(f, n) === "held") { line("Held by the Commons. Half their pact's worth comes in as tribute; nobody there will fight for you.", fs - 1, "#e8b8a0", false, 8); }
    else {
      line(`Their price: ${n.price.text}`, fs - 1, "#e8dcc0", false, 4);
      const left = owed(f, g.coin, n);
      if (n.price.or && f[n.price.or.flag] === n.price.or.eq) line(`  · Met: ${n.price.or.text}`, fs - 2, "#b8e0a0", false, 2);
      else if (!left.length) line("  · Everything they ask is met. Seal the pact.", fs - 2, "#b8e0a0", false, 2);
      else for (const o of left) line(`  · ${o}`, fs - 2, "#bfae8e", false, 2);
      if (n.perk) line(`A pact gives: ${n.perk.text}`, fs - 2, "#9a8e78", false, 8);
    }
    const no = canTalk(f, n), e = bestEnvoy(this.envoys());
    const notes: Record<(typeof ACTIONS)[number], string> = {
      "Send an envoy": no ?? (e ? `${e.name} goes (presence ${e.attrs.presence}, wits ${e.attrs.wits}); ${ENVOY_COST} coin for the road.` : "Nobody in the company to send."),
      "Send a gift": no ?? (n.likes === "coin" ? `${GIFT.coin} coin.` : `${GIFT.supplies} supplies from Thornwick.`),
      "Make demands": no ?? "Tribute now; they'll like you a good deal less.",
      "Seal the pact": no ?? (owed(f, g.coin, n).length ? "Not until their price is met." : "Their price is paid and they join the cause."),
      "March on them": canMarch(f, n) ?? "An army battle. Won, they're held by force.",
    };
    if (this.focus !== "pick" && this.focus !== "confirm") { if (!this.msg && this.focus !== "tabs") this.msg = say("Enter on a nation to deal with them.", "Tap a nation again to deal with them."); return; }
    ACTIONS.forEach((a, k) => {
      const on = k === this.pick, rh = fs * 2 + 14;
      this.hit(x, y, w, rh - 2, () => { this.pick = k; this.act(k); }, on);
      this.text(a, x + 10, y + 3, fs, on ? "#fff4dc" : "#e8dcc0", on);
      this.text(notes[a], x + 10, y + fs + 6, fs - 3, "#9a8e78", false, w - 20);
      y += rh;
    });
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
      { label: "Auto battle", value: () => (settings.get("autoBattle") ? "On" : "Off"), change: () => settings.set("autoBattle", !settings.get("autoBattle")) },
      { label: "How-it-works cards", value: () => (settings.get("tutorials") ? "On" : "Off"), change: () => settings.set("tutorials", !settings.get("tutorials")) },
      { label: "Cut scenes", value: () => (settings.get("cutscenes") ? "On" : "Off"), change: () => settings.set("cutscenes", !settings.get("cutscenes")) },
      { label: "Move cut-ins", value: () => (settings.get("moveCutIns") ? "On" : "Off"), change: () => settings.set("moveCutIns", !settings.get("moveCutIns")) },
      { label: "Always run", value: () => (settings.get("alwaysRun") ? "On" : "Off"), change: () => settings.set("alwaysRun", !settings.get("alwaysRun")) },
      { label: "3D world", value: () => (settings.get("world3d") ? "On" : "Off"), change: () => settings.set("world3d", !settings.get("world3d")) },
      { label: "Tilt to walk", value: () => (settings.get("tilt") ? "On" : "Off"), change: () => settings.set("tilt", !settings.get("tilt")) },
      { label: "Controller", value: () => (typeof navigator !== "undefined" && navigator.getGamepads && [...navigator.getGamepads()].some((p) => p?.connected) ? "Connected" : "None found"), change: () => undefined },
    ];
  }
  private static SETTING_NOTES: Record<string, string> = {
    Sound: "Everything at once. N switches it any time.",
    Music: "How loud the music plays.",
    Effects: "Footsteps, blows, doors and the rest.",
    Voices: "Spoken lines. Off shows the words only.",
    "Text speed": "How fast words appear when a line isn't spoken.",
    "How-it-works cards": "A card explaining each new system the first time you meet it. The Guide (G) keeps every page either way.",
    "Cut scenes": "Short wordless scenes at the story's big moments. Esc skips one.",
    "Move cut-ins": "The flash of the fighter and the move's name when a finisher, kith art or Call goes in.",
    "Battle speed": "Hurries fights along. Timing rings keep their pace.",
    "Auto timing": "Hits and braces land well without pressing. T in a fight.",
    "Always run": "Run without holding Shift (RT on a controller).",
    "Tilt to walk": "Phones and tablets: tilt the screen to walk, further to run. Off, or where tilt can't be read, drag on the left half of the screen instead.",
    Controller: "Xbox or other pad: left stick or D-pad walk and move through lists. A talk / choose / timed hits, B back, X sing, Y company, LB notes, RB ledger, LT auto timing, RT hold to run, left stick click run on/off, View auto battle, Menu opens this menu. The right stick moves a pointer; A then clicks where it points (army orders, any button).",
  };

  private saveRows(): { label: string; sub: string; act: () => void }[] {
    const g = this.host.game, list = g.saves.list(), info = (s: Slot) => { const d = list.find((x) => x.slot === s); return d ? `${new Date(d.savedAt).toLocaleString()} · ${Math.floor(d.playSeconds / 3600)}h ${Math.floor((d.playSeconds % 3600) / 60)}m` : "Empty"; };
    const rows: { label: string; sub: string; act: () => void }[] = [];
    for (const s of ["1", "2", "3"] as Slot[]) rows.push({ label: `Save to slot ${s}`, sub: info(s), act: () => {
      const go = () => { this.host.save(s); this.msg = `Saved to slot ${s}.`; sfx.pickup(); };
      if (list.some((x) => x.slot === s)) { this.confirm = { text: `Save over slot ${s}?${say(" Enter to confirm, Esc to keep it.", "")}`, yes: go }; this.focus = "confirm"; } else go();
    } });
    for (const s of ["1", "2", "3", "auto"] as Slot[]) if (list.some((x) => x.slot === s)) rows.push({ label: s === "auto" ? "Load the last autosave" : `Load slot ${s}`, sub: info(s), act: () => {
      this.confirm = { text: `Load ${s === "auto" ? "the autosave" : `slot ${s}`}? Anything since your last save is lost.${say(" Enter to confirm.", "")}`, yes: () => this.host.load(s) }; this.focus = "confirm";
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
    g.eventMode = "static"; g.cursor = "pointer"; g.on("pointertap", () => { if (this.scroller.dragged) return; this.msg = ""; on(); if (this.open) this.draw(); });
    this.view.addChild(g);
  }

  private draw(): void {
    this.clear();
    const w = this.w, h = this.h, tall = h > w, W = Math.min(900, w - 16), H = Math.min(tall ? 1100 : 600, h - 16), x0 = Math.round((w - W) / 2), y0 = Math.round((h - H) / 2);
    const small = W < 620, touch = device.touch, fs = small ? (touch ? 14 : 13) : 15;
    const dim = new Graphics().rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.6 }); dim.eventMode = "static"; this.view.addChild(dim);
    this.view.addChild(new Graphics().roundRect(x0, y0, W, H, 10).fill({ color: INK, alpha: 0.97 }).roundRect(x0, y0, W, H, 10).stroke({ color: GOLD, width: 2 }));
    // tabs: one row, or two rows of four on a narrow screen so each stays big enough to read and tap
    const perRow = W < 560 ? 4 : TABS.length, tw = (W - 24) / perRow, tabH = touch ? 38 : 34, rowsH = Math.ceil(TABS.length / perRow) * (tabH + 6) - 6;
    TABS.forEach((t, i) => {
      const tx = x0 + 12 + (i % perRow) * tw, ty = y0 + 10 + Math.floor(i / perRow) * (tabH + 6), on = i === this.tab;
      if (perRow < TABS.length && !on) this.view.addChild(new Graphics().roundRect(tx, ty, tw - 6, tabH, 5).fill({ color: 0x221a12, alpha: 0.95 }).roundRect(tx, ty, tw - 6, tabH, 5).stroke({ color: 0x4a3c28, width: 1 }));
      this.hit(tx, ty, tw - 6, tabH, () => { this.tab = i; this.i = 0; this.focus = "list"; }, on, on && this.focus === "tabs" ? 0x5a4422 : SEL);
      const label = new Text({ text: t, style: serif(small ? (perRow < TABS.length ? 14 : W < 420 ? 11 : 13) : 17, on ? "#fff4dc" : "#a89a80", on) }); label.anchor.set(0.5, 0.5); label.x = tx + (tw - 6) / 2; label.y = ty + tabH / 2; this.view.addChild(label);
    });
    const short = h < 520, footH = touch ? (short ? 46 : 74) : 46;
    let body = { x: x0 + 14, y: y0 + 22 + rowsH, w: W - 28, h: H - 22 - rowsH - footH };
    let listW = Math.round(small ? Math.min(150, body.w * 0.4) : Math.min(250, body.w * 0.32));
    const page = TABS[this.tab];
    if (page !== this.lastPage) { this.lastPage = page; this.scroller.reset(); }
    // narrow and upright: the list in a band on top, the page under it across the whole width
    this.band = null;
    if (body.w < 480 && tall && LISTED.has(page)) {
      const bandMax = Math.min(Math.round(body.h * 0.34), device.row * 4 + 8); this.bandMax = bandMax; const bandH = Math.min(bandMax, this.bandNeed[String(page)] ?? bandMax);
      this.band = { x: body.x, y: body.y, w: body.w, h: bandH };
      this.view.addChild(new Graphics().rect(body.x, body.y + bandH + 4, body.w, 1).fill({ color: GOLD, alpha: 0.3 }));
      body = { x: body.x, y: body.y + bandH + 12, w: body.w, h: body.h - bandH - 12 };
      listW = -18;
    }
    this.listNeed = 0;
    const from = this.view.children.length;
    switch (page) {
      case "Party": this.drawParty(body, listW, fs); break;
      case "Gear": this.drawGear(body, listW, fs); break;
      case "Items": this.drawItems(body, listW, fs); break;
      case "Thornwick": this.drawThornwick(body, listW, fs); break;
      case "Command": this.drawCommand(body, listW, fs); break;
      case "Guide": this.drawGuide(body, listW, fs); break;
      case "Settings": this.drawSettings(body, fs); break;
      default: this.drawSave(body, fs);
    }
    // whatever the page drew past the bottom scrolls (the list band keeps its own place)
    const listKids = this.view.children.filter((c) => c.label === "band");
    for (const k of listKids) this.view.removeChild(k);
    this.scroller.wrap(this.view, from, { x: body.x - 4, y: body.y - 4, w: body.w + 8, h: body.h + 6 });
    for (const k of listKids) this.view.addChild(k);
    // footer: message or confirm, then the keys
    const fy = y0 + H - footH + 4;
    this.view.addChild(new Graphics().rect(x0 + 12, fy - 4, W - 24, 1).fill({ color: GOLD, alpha: 0.4 }));
    // short touch screens: Close on the left, the message beside it, all on one line
    const mx = touch && short ? x0 + 124 : x0 + 16, mw = touch && short ? W - 140 - (this.confirm ? 200 : 0) : W - 32, my = touch && short ? fy + 4 : fy;
    if (this.confirm) this.text(this.confirm.text, mx, my, touch && short ? fs - 1 : fs, "#ffd890", true, mw);
    else if (this.msg) this.text(this.msg, mx, my, touch && short ? fs - 1 : fs, "#cfe8b0", false, mw);
    if (this.confirm && touch) { // a phone has no Enter: buttons to say yes or no
      const yes = this.confirm.yes, bw2 = 90, by2 = short ? fy : fy + 26;
      this.button("Yes", x0 + W - 2 * bw2 - 26, by2, bw2, 40, () => { this.confirm = null; this.focus = "list"; yes(); }, true);
      this.button("No", x0 + W - bw2 - 16, by2, bw2, 40, () => { this.confirm = null; this.focus = "list"; }, false);
    }
    const keys = this.text(padState.used ? "D-pad moves · LB/RB page · A picks · B back · Menu closes" : touch ? "Tap a row to choose it, again to use it · Drag to scroll" : small ? "Tab/M close" : "Arrows move · Enter picks · Esc back · Tab or M closes", 0, fy + 22, device.small(12), "#8a7e68");
    keys.x = x0 + W - keys.width - 16;
    if (touch) { keys.y = fy + 38; this.button("Close  ✕", x0 + 14, short ? fy : fy + 28, 96, 36, () => this.close(), false); if (short) keys.visible = false; }
    else { const closeBtn = this.text("Close", x0 + 16, fy + 20, 12, "#e0c070", true); closeBtn.eventMode = "static"; closeBtn.cursor = "pointer"; closeBtn.on("pointertap", () => this.close()); }
    if (touch && (keys.x < x0 + 120 || this.confirm)) keys.visible = false;
    // the band shrinks to fit a short list (or grows back for a longer one): draw once more at the right size
    if (this.band && this.listNeed > 0 && !this.refitting) { const want = Math.min(this.bandMax, this.listNeed); if (Math.abs(want - this.band.h) > 4) { this.bandNeed[page] = want; this.refitting = true; this.draw(); this.refitting = false; } }
  }

  /** A framed button (for touch screens, where a bare word is too small to hit). */
  private button(label: string, x: number, y: number, bw: number, bh: number, on: () => void, primary: boolean): void {
    const g = new Graphics().roundRect(x, y, bw, bh, 7).fill(primary ? 0x5a4018 : 0x2a2016).roundRect(x, y, bw, bh, 7).stroke({ color: GOLD, width: primary ? 2 : 1 });
    g.eventMode = "static"; g.cursor = "pointer"; g.on("pointertap", (e) => { e.stopPropagation(); on(); if (this.open) this.draw(); });
    const t = new Text({ text: label, style: serif(14, "#f2e3c4", true) }); t.anchor.set(0.5); t.x = x + bw / 2; t.y = y + bh / 2; t.eventMode = "none";
    this.view.addChild(g, t);
  }

  private list(items: { label: string; sub?: string }[], b: { x: number; y: number; w: number; h: number }, listW: number, fs: number, empty: string): void {
    const band = this.band;
    if (band) { b = band; listW = band.w; }
    const start = this.view.children.length;
    if (!items.length) { this.listNeed = this.text(empty, b.x + 4, b.y + 6, fs, "#a89a80", false, b.w - 8).height + 14; this.tagBand(start); return; }
    // in the band, a row is one line: the name, then the note after it
    const rowH = band ? device.row : Math.max(items.some((r) => r.sub) ? fs * 2 + 18 : fs + 18, device.touch ? device.row : 0);
    const max = Math.max(1, Math.floor(b.h / rowH)), from = Math.max(0, Math.min(this.i - max + 1, items.length - max));
    const paged = items.length > max && device.touch, arrowW = paged ? 40 : 0;
    this.listNeed = Math.max(2, items.length) * rowH + 4;
    items.slice(from, from + max).forEach((r, k) => {
      const idx = from + k, y = b.y + k * rowH, on = idx === this.i && this.focus !== "tabs";
      this.hit(b.x, y, listW - arrowW, rowH - 4, () => { if (this.i === idx && (this.focus === "list")) this.choose(); else { this.i = idx; this.focus = "list"; } }, on);
      if (band) {
        const l = this.text(r.label, b.x + 10, y + (rowH - 4 - fs - 1) / 2 - 1, fs + 1, on ? "#fff4dc" : "#e8dcc0", on);
        if (r.sub) { const st = this.text(r.sub, l.x + l.width + 10, y + (rowH - 4 - fs + 2) / 2, fs - 2, "#a89a80"); if (st.x + st.width > b.x + listW - arrowW - 6) st.text = st.text.slice(0, Math.max(0, Math.floor(((b.x + listW - arrowW - 6 - st.x) / st.width) * st.text.length) - 1)) + "…"; }
      } else {
        this.text(r.label, b.x + 10, y + (device.touch && !r.sub ? (rowH - 4 - fs - 1) / 2 : 6), fs + 1, on ? "#fff4dc" : "#e8dcc0", on);
        if (r.sub) this.text(r.sub, b.x + 10, y + 8 + fs + 2, fs - 2, "#a89a80");
      }
    });
    // on a touch screen, a long list pages with arrows (there are no Up and Down keys)
    if (paged) {
      const ax = b.x + listW - arrowW + 2, ah = Math.min(max, items.length) * rowH / 2 - 4;
      const arrow = (label: string, y: number, can: boolean, go: () => void) => {
        const g = new Graphics().roundRect(ax, y, arrowW - 4, ah, 6).fill({ color: 0x2a2016, alpha: can ? 0.95 : 0.4 }).roundRect(ax, y, arrowW - 4, ah, 6).stroke({ color: GOLD, width: 1, alpha: can ? 1 : 0.3 });
        if (can) { g.eventMode = "static"; g.cursor = "pointer"; g.on("pointertap", () => { if (this.scroller.dragged) return; go(); this.focus = "list"; this.draw(); }); }
        const t = new Text({ text: label, style: serif(16, can ? "#f0c060" : "#5a4e38", true) }); t.anchor.set(0.5); t.x = ax + (arrowW - 4) / 2; t.y = y + ah / 2; t.eventMode = "none";
        this.view.addChild(g, t);
      };
      arrow("▲", b.y, from > 0, () => { this.i = Math.max(0, from - max); });
      arrow("▼", b.y + ah + 4, from + max < items.length, () => { this.i = Math.min(items.length - 1, from + 2 * max - 1); });
    }
    this.tagBand(start);
  }
  /** Marks what the list drew in the band, so it stays put while the page under it scrolls. */
  private tagBand(start: number): void { if (this.band) for (const c of this.view.children.slice(start)) c.label = "band"; }

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
    this.list(ms.map((m) => ({ label: m.name, sub: `${m.kith ? `Kith${kithRank(this.host.game.flags, m.id) ? ` · ${rankName(kithRank(this.host.game.flags, m.id))}` : ""} · ` : ""}Level ${m.kith ? this.host.game.kith[m.id].level : this.host.game.progress(m.id).level}${m.party ? " · in the party" : " · at camp"}` })), b, listW, fs, "Nobody yet.");
    if (this.focus !== "tabs" && !this.msg) this.msg = say("Enter on someone: take them along, or leave them at camp.", "Tap someone again: take them along, or leave them at camp.");
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
    } else if (this.focus === "slots") this.text(say("Enter to change what's fitted.", "Tap a slot to change what's fitted."), x, y + 4, fs - 2, "#9a8e78");
    else this.text(say("Enter to change fittings.", "Tap a slot to change its fitting."), x, y + 4, fs - 2, "#9a8e78");
  }

  private drawItems(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const g = this.host.game, ids = itemsOwned(g.flags);
    this.list(ids.map((id) => ({ label: `${ITEMS[id].name}  ×${owned(g.flags, id)}` })), b, listW, fs, "You carry nothing to use yet.");
    const id = ids[this.i]; if (!id) return;
    const it = ITEMS[id], x = b.x + listW + 18, w = b.w - listW - 18;
    let y = b.y;
    y += this.text(it.name, x, y, fs + 5, "#fff4dc", true, w).height + 6;
    y += this.text(it.text, x, y, fs, "#d8ccb4", false, w).height + 10;
    y += this.text(it.battle ? "Used in fights: anyone can throw it on their turn, and the sharper their wits, the more it does." : it.who === "all" ? `Gives back ${pct(it.heal)} of everyone's health.${say(" Enter to use.", " Tap someone below to use it.")}` : `Gives back ${pct(it.heal)} of one person's health.${say(" Enter, then choose who.", " Tap who it's for below.")}`, x, y, fs - 1, "#bfae8e", false, w).height + 12;
    const hl = this.host.health(), trav = this.travellers();
    this.text(this.focus === "target" ? "Use it on:" : "Travelling with you:", x, y, fs - 1, "#e0c070", true); y += fs + 10;
    trav.forEach((m, i) => {
      const on = this.focus === "target" && i === this.pick, life = hl[m.unit] ?? 1, rh = Math.max(fs + 14, device.touch ? device.row - 4 : 0);
      this.hit(x, y, w, rh, () => { if (it.battle) return; if (it.who === "all") this.useOn(-1); else { this.pick = i; this.useOn(i); } }, on);
      this.text(m.name, x + 10, y + 5, fs, on ? "#fff4dc" : "#e8dcc0", on);
      this.text(`Health ${pct(life)}`, x + w * 0.45, y + 5, fs - 1, life < 1 ? "#e8b8a0" : "#b8d0a0");
      this.bar(x + w * 0.45 + fs * 7, y + fs / 2 + 2, Math.max(30, w * 0.55 - fs * 7 - 14), life, life < 0.3 ? 0xd06a5a : 0x7fb069);
      y += rh + 2;
    });
  }

  private drawSettings(b: { x: number; y: number; w: number; h: number }, fs: number): void {
    const rows = this.settingRows(), rh = Math.max(fs + 18, device.touch ? device.row : 0), lw = Math.min(260, b.w * 0.4);
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
