// The Thornwick ledger (L, the gold button, or the quartermaster's crates at Thornwick): Rhea's home base.
//   Party     who travels with Rhea and who stays at Thornwick; Enter takes someone along or leaves them here
//   Works     the buildings: what each does now, what the next level costs and gives; Enter starts building it
//   People    everyone staying at Thornwick and their job; Enter cycles the job (their best is marked)
//   Forge     each keepsake weapon and what reforging it costs; Enter reforges (Masterwork asks which way)
//   Pens      kith staying at Thornwick: Enter steps through feed, pen and work for each
//   Train     kith care and drills: spend time with a kith, attend a drill in person (a mini game, ui/trainingScene),
//             or set it as the kith's daily drill for the keeper to run
//   Make      what the workshop and the infirmary make each day
//   Roads     kith expeditions: send a kith staying here off after one goal (a rare thing, or a technique)
// Keys as in the menu: Left/Right change page, Up/Down move, Enter picks, Esc steps back or closes. All tappable.
import { Container, Graphics, Text } from "pixi.js";
import type { Game } from "../core/game";
import { keyFor, padState, type Input } from "../core/input";
import { attrsAt, jobSkill, type Attrs, type Job } from "../cast/attributes";
import { KEEPSAKES, TIERS, canReforge, keepsake, reforge, weaponName, type Loadout } from "../gear/weapons";
import { ITEMS } from "../gear/items";
import { teach } from "../guide/guideScene";
import { SPECIES, breedLitter, canBreed, familiesOf, foalToKith, type Kith } from "../kith/kith";
import { SOURCES, readKith } from "../kith/upbringing";
import { sfx } from "../audio/music";
import { EXPEDITIONS, away, awayIds, cannotSend, odds, send } from "../kith/expedition";
import { reachable } from "../command/diplomacy";
import { DRILLS, cannotTrain, drillOf, drilledToday, energyOf, energyWord, hadTimeToday, keeperWarning, setDrill, spendTime, spiritsOf, spiritsWord, type Drill, type Outcome } from "../kith/training";
import {
  PENS, ALL_JOBS, BUILDINGS, BUILDING_IDS, JOB_NAMES, RECIPES, bestJob, buildingFor, canRaise, forgeLevel, jobOf, levelOf, penChoices, penPlan,
  penSlots, recipesAt, setPenPlan, startRaise, supplies,
} from "../base/base";

export interface BaseHost {
  game: Game;
  names: Record<string, string>;
  /** People staying at Thornwick (recruited, not travelling). */
  staying(): string[];
  /** Kith staying at Thornwick. */
  kithHere(): string[];
  /** Everyone with a keepsake weapon who has joined. */
  armed(): string[];
  /** A foal born in the pens joins the company. */
  addFoal(k: Kith): void;
  rng(): number;
  /** Lets a day pass at Thornwick; returns what happened. */
  passDay(): string;
  /** Everyone recruited, in the order they joined. */
  company(): string[];
  /** Who the player has picked to travel. */
  inParty(): string[];
  /** Takes someone along or leaves them at Thornwick; says what happened. */
  setTravelling(id: string): string;
  /** How many may travel with Rhea at her rank (Ash not counted). */
  partyRoom(): number;
  /** Rhea attends a kith's drill in person: the drill's mini game plays, then `done` gets what came of it. */
  attend(k: Kith, d: Drill, done: (o: Outcome) => void): void;
}

const TABS = ["Party", "Works", "People", "Forge", "Pens", "Train", "Make", "Roads"] as const;
/** What each page is called on screen, and what it is for, in plain words. */
const TAB_NAMES: Record<(typeof TABS)[number], string> = { Party: "Party", Works: "Buildings", People: "Jobs", Forge: "Forge", Pens: "Kith pens", Train: "Training", Make: "Workshop", Roads: "Expeditions" };
const TAB_HELP: Record<(typeof TABS)[number], string> = {
  Party: "Choose who travels with Rhea. Everyone you leave behind waits at Thornwick, where you can give them a job.",
  Works: "Build and improve Thornwick's buildings. Each one opens new jobs and new things to make.",
  People: "Give work to the people staying at Thornwick. The work gets done each day that passes.",
  Forge: "Spend coin to reforge keepsake weapons so they hit harder.",
  Pens: "Decide how the kith staying at Thornwick are fed, penned and worked, and breed them.",
  Train: "Look after the kith staying here and train them. Attend a drill yourself to play it, or set a daily drill for the keeper.",
  Make: "Choose what the workshop and the infirmary make each day from supplies.",
  Roads: "Send a kith staying at Thornwick off alone to find something rare or learn a new move.",
};
const serif = (size: number, fill: string, bold = false) => ({ fontFamily: "Georgia, serif", fontSize: size, fill, fontWeight: bold ? ("bold" as const) : ("normal" as const) });
const GOLD = 0xe0c070, INK = 0x14100c, SEL = 0x3a2c18;
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
const PEN_PARTS = ["feed", "pen", "work"] as const;

export class BasePanel {
  readonly view = new Container();
  open = false;
  private host!: BaseHost;
  private tab = 0;
  private i = 0;
  private part = 0; // pens: which of feed/pen/work; forge: branch choice
  private sub: "list" | "part" | "branch" | "road" | "train" = "list";
  private mate = 0; // pens: index among the other kith here
  private msg = "";
  private w = 800;
  private h = 600;

  constructor() { this.view.visible = false; }

  show(host: BaseHost, w: number, h: number): void {
    this.host = host; this.w = w; this.h = h; this.open = true; this.view.visible = true; this.i = 0; this.sub = "list"; this.msg = ""; sfx.bump(); this.draw();
  }
  close(): void { this.open = false; this.view.visible = false; this.view.removeChildren().forEach((c) => c.destroy({ children: true })); }
  resize(w: number, h: number): void { this.w = w; this.h = h; if (this.open) this.draw(); }

  private get f() { return this.host.game.flags; }
  private attrs(id: string): Attrs { const g = this.host.game; return attrsAt(id, g.progress(id).level, g.modsOf(id)); }
  private name(id: string): string { return this.host.game.kith[id]?.name ?? this.host.names[id] ?? cap(id); }

  update(inp: Input): boolean {
    if (!this.open) return false;
    if (inp.wasPressed("menu")) { this.close(); return false; }
    if (inp.wasPressed("notes") || inp.wasPressed("ledger")) { // LB / RB on a pad (J / L on keys): previous / next page
      this.tab = (this.tab + (inp.wasPressed("ledger") ? 1 : -1) + TABS.length) % TABS.length; this.i = 0; this.sub = "list"; this.msg = ""; sfx.bump(); this.draw(); return true;
    }
    const up = inp.wasPressed("up"), down = inp.wasPressed("down"), left = inp.wasPressed("left"), right = inp.wasPressed("right");
    const ok = inp.wasPressed("confirm"), back = inp.wasPressed("cancel");
    if (!(up || down || left || right || ok || back)) return true;
    this.msg = "";
    const n = this.rows();
    if (this.sub === "part") {
      const parts = this.canBreedHere() ? 5 : 3;
      if (up) this.part = (this.part + parts - 1) % parts; else if (down) this.part = (this.part + 1) % parts;
      else if (this.part === 4 && ok) this.breedNow();
      else if (this.part === 3 && (left || right || ok)) { const n = Math.max(1, this.others().length); this.mate = (this.mate + (left ? n - 1 : 1)) % n; }
      else if (this.part < 3 && (left || right || ok)) this.cyclePen(right || ok ? 1 : -1);
      else if (back) this.sub = "list";
    } else if (this.sub === "train") {
      const n = DRILLS.length + 1;
      if (up) this.part = (this.part + n - 1) % n; else if (down) this.part = (this.part + 1) % n;
      else if (ok) this.trainRow(false); else if ((left || right) && this.part > 0) this.trainRow(true);
      else if (back) this.sub = "list";
    } else if (this.sub === "road") {
      const n = Math.max(1, this.host.kithHere().length);
      if (up || left) this.part = (this.part + n - 1) % n; else if (down || right) this.part = (this.part + 1) % n;
      else if (ok) this.sendOff(); else if (back) this.sub = "list";
    } else if (this.sub === "branch") {
      const k = KEEPSAKES[this.host.armed()[this.i]]; const m = k?.branches.length ?? 0;
      if (up) this.part = (this.part + m - 1) % Math.max(1, m); else if (down) this.part = (this.part + 1) % Math.max(1, m);
      else if (ok) this.doForge(k?.branches[this.part]?.id); else if (back) this.sub = "list";
    } else {
      if (up) this.i = Math.max(0, this.i - 1);
      else if (down) this.i = Math.min(Math.max(0, n - 1), this.i + 1);
      else if (left || right) { this.tab = (this.tab + (right ? 1 : -1) + TABS.length) % TABS.length; this.i = 0; sfx.bump(); }
      else if (ok) this.choose();
      else if (back) { this.close(); return false; }
    }
    if (this.open) this.draw();
    return this.open;
  }

  private rows(): number {
    switch (TABS[this.tab]) {
      case "Party": return this.members().length;
      case "Works": return BUILDING_IDS.length + 1;
      case "People": return this.host.staying().length;
      case "Forge": return this.host.armed().length;
      case "Pens": return this.host.kithHere().length;
      case "Train": return this.host.kithHere().length;
      case "Roads": return EXPEDITIONS.length;
      default: return this.makeRows().length;
    }
  }

  private makeRows(): { where: string; recipe?: string }[] {
    const out: { where: string; recipe?: string }[] = [];
    for (const where of ["workshop", "infirmary"]) { out.push({ where }); for (const r of recipesAt(this.f, where)) out.push({ where, recipe: r }); }
    return out;
  }

  private choose(): void {
    const g = this.host.game, f = this.f;
    switch (TABS[this.tab]) {
      case "Party": {
        const id = this.members()[this.i]; if (!id) return;
        this.msg = this.host.setTravelling(id);
        return;
      }
      case "Works": {
        if (this.i === BUILDING_IDS.length) { this.msg = this.host.passDay(); sfx.bump(); return; }
        const b = BUILDING_IDS[this.i], c = canRaise(f, g.coin, b);
        if (!c.ok) { this.msg = c.why ?? ""; sfx.bump(); return; }
        g.coin = startRaise(f, g.coin, b); sfx.pickup();
        this.msg = `Building the ${c.level!.name.toLowerCase()}: ${c.level!.work} days of building work. Set people to Building on the People page.`;
        return;
      }
      case "People": {
        const id = this.host.staying()[this.i]; if (!id) return;
        const now = jobOf(f, id), list: (Job | undefined)[] = [undefined, ...ALL_JOBS], next = list[(list.indexOf(now) + 1) % list.length];
        if (next) f[`base.job.${id}`] = next; else delete f[`base.job.${id}`];
        this.msg = next ? `${this.name(id)}: ${JOB_NAMES[next].toLowerCase()}.` : `${this.name(id)} rests.`; sfx.bump();
        return;
      }
      case "Forge": {
        const id = this.host.armed()[this.i]; if (!id) return;
        const l = g.gear[id] ?? { tier: 0 };
        if (l.tier + 1 === TIERS.length - 2 && !l.branch) { this.sub = "branch"; this.part = 0; return; }
        this.doForge(undefined);
        return;
      }
      case "Pens": if (this.host.kithHere()[this.i]) { this.sub = "part"; this.part = 0; } return;
      case "Train": if (this.host.kithHere()[this.i]) { this.sub = "train"; this.part = 0; } return;
      case "Roads": {
        if (!this.host.kithHere().length) { this.msg = "No kith are staying at Thornwick to send."; sfx.bump(); return; }
        this.sub = "road"; this.part = 0; return;
      }
      default: {
        const r = this.makeRows()[this.i]; if (!r) return;
        f[`base.make.${r.where}`] = r.recipe ?? ""; f[`base.made.${r.where}`] = 0;
        this.msg = r.recipe ? `The ${BUILDINGS[r.where].name.toLowerCase()} will make ${ITEMS[r.recipe].name.toLowerCase()}.` : `The ${BUILDINGS[r.where].name.toLowerCase()} makes nothing for now.`;
        sfx.bump();
      }
    }
  }

  /** Everyone recruited, Ash first, in the order they joined. */
  private members(): string[] { const c = this.host.company(); return [...new Set([...(c.includes("ash") ? ["ash"] : []), ...c])].filter((id) => id !== "rhea"); }
  private travels(id: string): boolean { return this.host.inParty().includes(id); }

  private smith(): Attrs | undefined {
    const smiths = this.host.staying().filter((id) => jobOf(this.f, id) === "forge").map((id) => this.attrs(id));
    return smiths.sort((a, b) => jobSkill(b, "forge") - jobSkill(a, "forge"))[0];
  }

  private doForge(branch: string | undefined): void {
    const g = this.host.game, id = this.host.armed()[this.i]; if (!id) return;
    const l: Loadout = g.gear[id] ?? { tier: 0 };
    const opts = { forgeLevel: forgeLevel(this.f), coin: g.coin, smith: this.smith(), named: !!this.f[`named.${id}`], branch };
    const c = canReforge(l, opts);
    if (!c.ok) { this.msg = c.why ?? ""; this.sub = "list"; sfx.bump(); return; }
    const out = reforge(l, opts); g.gear = { ...g.gear, [id]: out.loadout }; g.coin -= out.cost; this.sub = "list";
    this.msg = `Reforged for ${out.cost} coin: ${weaponName(id, out.loadout)}.`; sfx.pickup();
  }

  private sendOff(): void {
    const e = EXPEDITIONS[this.i], id = this.host.kithHere()[this.part], k = id ? this.host.game.kith[id] : undefined; if (!e || !k) return;
    const no = cannotSend(this.f, k, e, reachable(this.f, e.land));
    if (no) { this.msg = no; sfx.bump(); return; }
    send(this.f, k, e); this.sub = "list"; this.part = 0; sfx.pickup();
    this.msg = `${k.name} sets off: ${e.name.toLowerCase()}. Back in ${e.days} day${e.days > 1 ? "s" : ""}.`;
  }

  /** The best kith keeper's skill at Thornwick (0 with nobody on the job). */
  private keeperSkill(): number {
    return Math.max(0, ...this.host.staying().filter((id) => jobOf(this.f, id) === "kith").map((id) => jobSkill(this.attrs(id), "kith")));
  }
  /** A row on the Training page: 0 spends time with the kith; a drill row attends it (Enter) or sets it as the daily drill (Left/Right). */
  private trainRow(daily: boolean): void {
    const g = this.host.game, id = this.host.kithHere()[this.i], k = id ? g.kith[id] : undefined; if (!k) return;
    if (this.part === 0) { const r = spendTime(this.f, k); this.msg = r.line; if (r.ok) sfx.heal(); else sfx.bump(); return; }
    const d = DRILLS[this.part - 1], lv = levelOf(this.f, "pens");
    if (daily) {
      if (d.pens > lv) { this.msg = cannotTrain(this.f, k, d, lv) ?? ""; sfx.bump(); return; }
      const now = drillOf(this.f, k.id)?.id === d.id; setDrill(this.f, k.id, now ? null : d.id); sfx.bump();
      this.msg = now ? `${k.name} has no daily drill now.` : `${k.name}'s daily drill: ${d.name.toLowerCase()}. The keeper runs it each day it has the energy.`;
      return;
    }
    const no = cannotTrain(this.f, k, d, lv);
    if (no) { this.msg = no; sfx.bump(); return; }
    sfx.choose();
    this.host.attend(k, d, (o) => { this.msg = o.lines.join(" "); if (this.open) this.draw(); });
  }

  private canBreedHere(): boolean { return levelOf(this.f, "pens") >= PENS.breedAt && this.host.kithHere().length >= 2; }
  private others(): string[] { const id = this.host.kithHere()[this.i]; return this.host.kithHere().filter((x) => x !== id); }
  private breedNow(): void {
    const g = this.host.game, a = g.kith[this.host.kithHere()[this.i]], b = g.kith[this.others()[this.mate % Math.max(1, this.others().length)]];
    if (!a || !b) return;
    const c = canBreed(a, b); if (!c.ok) { this.msg = c.why ?? ""; sfx.bump(); return; }
    const done = Number(this.f["base.bred.day"] ?? -1) === Number(this.f["base.day"] ?? 0);
    if (done) { this.msg = "The pens have had one litter today. Let a day pass."; return; }
    const foals = breedLitter(a, b, { rng: () => this.host.rng(), place: "thornwick", wing: levelOf(this.f, "pens") });
    if (!foals.length) { this.msg = "They won't take to each other."; return; }
    this.f["base.bred.day"] = Number(this.f["base.day"] ?? 0);
    const n = Object.keys(g.kith).length, had = new Set(Object.values(g.kith).map((x) => x.species));
    const fresh = !had.has(foals[0].species) && SPECIES[foals[0].species]?.kind === "hybrid"; // a cross nobody in the company has raised yet
    foals.forEach((fo, i) => { const sp = SPECIES[fo.species]?.name ?? fo.species, k = foalToKith(fo, `foal-${fo.species}-${n + i + 1}`, `${sp} foal`); this.host.addFoal(k); });
    const sp = SPECIES[foals[0].species]?.name ?? foals[0].species;
    this.msg = `${foals.length > 1 ? "Twins" : "A foal"}: ${sp.toLowerCase()}${foals[0].unseen ? " (never seen before!)" : fresh ? " (a new kind of kith, a cross of both families!)" : foals[0].throwback ? " (a throwback)" : ""}. ${foals.length > 1 ? "They join" : "It joins"} the company.`;
    if (foals[0].unseen || fresh) sfx.join(); else sfx.pickup();
    this.sub = "list";
  }

  private cyclePen(d: number): void {
    const id = this.host.kithHere()[this.i]; if (!id) return;
    const lv = levelOf(this.f, "pens"), part = PEN_PARTS[this.part], list = penChoices(lv)[part], now = penPlan(this.f, id, lv)[part];
    setPenPlan(this.f, id, part, list[(list.indexOf(now) + d + list.length) % list.length]); sfx.bump();
  }

  // ---- drawing ----

  private text(t: string, x: number, y: number, size: number, fill: string, bold = false, wrap = 0): Text {
    const o = new Text({ text: t, style: { ...serif(size, fill, bold), ...(wrap ? { wordWrap: true, wordWrapWidth: wrap, lineHeight: Math.round(size * 1.35) } : {}) } });
    o.x = x; o.y = y; this.view.addChild(o); return o;
  }
  private hit(x: number, y: number, w: number, h: number, on: () => void, selected = false): void {
    const g = new Graphics().roundRect(x, y, w, h, 5).fill({ color: selected ? SEL : 0, alpha: selected ? 0.95 : 0.001 });
    if (selected) g.roundRect(x, y, w, h, 5).stroke({ color: GOLD, width: 1 });
    g.eventMode = "static"; g.cursor = "pointer"; g.on("pointertap", () => { this.msg = ""; on(); if (this.open) this.draw(); });
    this.view.addChild(g);
  }
  private bar(x: number, y: number, w: number, frac: number, color: number): void {
    this.view.addChild(new Graphics().roundRect(x, y, w, 8, 4).fill(0x2a201a).roundRect(x, y, Math.max(0, Math.min(1, frac)) * w, 8, 4).fill(color));
  }
  private list(items: { label: string; sub?: string }[], b: { x: number; y: number; w: number; h: number }, listW: number, fs: number, empty: string): void {
    if (!items.length) { this.text(empty, b.x + 4, b.y + 6, fs, "#a89a80", false, b.w - 8); return; }
    const rowH = fs * 2 + 18, max = Math.max(1, Math.floor(b.h / rowH)), from = Math.max(0, Math.min(this.i - max + 1, items.length - max));
    items.slice(from, from + max).forEach((r, k) => {
      const idx = from + k, y = b.y + k * rowH, on = idx === this.i;
      this.hit(b.x, y, listW, rowH - 4, () => { if (this.i === idx) this.choose(); else { this.i = idx; this.sub = "list"; } }, on);
      this.text(r.label, b.x + 10, y + 6, fs + 1, on ? "#fff4dc" : "#e8dcc0", on);
      if (r.sub) this.text(r.sub, b.x + 10, y + 8 + fs + 2, fs - 2, "#a89a80");
    });
  }

  private draw(): void {
    // the first look at a page that runs on its own rules gets its "How it works" card (over the ledger)
    const teachTab: Partial<Record<(typeof TABS)[number], string>> = { Forge: "gear", Pens: "pens", Train: "training", Roads: "roads" };
    const lesson = teachTab[TABS[this.tab]]; if (lesson) teach(this.host.game, lesson);
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    const w = this.w, h = this.h, W = Math.min(940, w - 16), H = Math.min(620, h - 16), x0 = Math.round((w - W) / 2), y0 = Math.round((h - H) / 2);
    const small = W < 620, fs = small ? 13 : 15, g = this.host.game;
    const dim = new Graphics().rect(0, 0, w, h).fill({ color: 0, alpha: 0.6 }); dim.eventMode = "static"; this.view.addChild(dim);
    this.view.addChild(new Graphics().roundRect(x0, y0, W, H, 10).fill({ color: INK, alpha: 0.97 }).roundRect(x0, y0, W, H, 10).stroke({ color: GOLD, width: 2 }));
    // title: what this is
    this.text("\u{1F4D6}  Thornwick ledger", x0 + 16, y0 + 10, small ? 18 : 22, "#f0c060", true);
    const sub = this.text(small ? "Your home base" : "Your home base: party, buildings, jobs, weapons and kith", 0, y0 + (small ? 14 : 16), small ? 11 : 13, "#a89a80"); sub.x = x0 + W - sub.width - 16;
    const perRow = small ? 4 : TABS.length, tw = (W - 24) / perRow, rowsH = Math.ceil(TABS.length / perRow) * 40 - 6;
    TABS.forEach((t, i) => {
      const tx = x0 + 12 + (i % perRow) * tw, ty = y0 + 44 + Math.floor(i / perRow) * 40, on = i === this.tab;
      this.view.addChild(new Graphics().roundRect(tx, ty, tw - 6, 34, 5).fill({ color: on ? 0x5a4018 : 0x221a12, alpha: 0.95 }).roundRect(tx, ty, tw - 6, 34, 5).stroke({ color: on ? GOLD : 0x4a3c28, width: on ? 2 : 1 }));
      this.hit(tx, ty, tw - 6, 34, () => { this.tab = i; this.i = 0; this.sub = "list"; });
      const label = new Text({ text: TAB_NAMES[t], style: serif(small ? 13 : 16, on ? "#fff4dc" : "#c8b898", on) }); label.anchor.set(0.5, 0.5); label.x = tx + (tw - 6) / 2; label.y = ty + 17; this.view.addChild(label);
    });
    const help = this.text(`${TAB_HELP[TABS[this.tab]]}  (${keyFor("guide")}: how it all works)`, x0 + 16, y0 + 44 + rowsH + 8, fs, "#fff4dc", false, W - 32);
    // what Thornwick holds
    const building = this.f["base.build"];
    const status = `Coin ${g.coin}   ·   Supplies ${supplies(this.f)}   ·   Day ${Number(this.f["base.day"] ?? 0)}${building ? `   ·   Building: ${BUILDINGS[String(building)].name} (${Number(this.f["base.work"] ?? 0)} / ${BUILDINGS[String(building)].levels[levelOf(this.f, String(building)) + 1]?.work ?? 0})` : ""}`;
    const st = this.text(status, x0 + 16, help.y + help.height + 6, fs - 2, "#e0c070", true, W - 32);
    const top = st.y + st.height + 12;
    this.view.addChild(new Graphics().rect(x0 + 12, top - 6, W - 24, 1).fill({ color: GOLD, alpha: 0.4 }));
    const body = { x: x0 + 14, y: top, w: W - 28, h: y0 + H - 46 - top };
    const listW = Math.round(small ? Math.min(160, body.w * 0.42) : Math.min(260, body.w * 0.33));
    switch (TABS[this.tab]) {
      case "Party": this.drawParty(body, listW, fs); break;
      case "Works": this.drawWorks(body, listW, fs); break;
      case "People": this.drawPeople(body, listW, fs); break;
      case "Forge": this.drawForge(body, listW, fs); break;
      case "Pens": this.drawPens(body, listW, fs); break;
      case "Train": this.drawTrain(body, listW, fs); break;
      case "Roads": this.drawRoads(body, listW, fs); break;
      default: this.drawMake(body, listW, fs);
    }
    const fy = y0 + H - 42;
    this.view.addChild(new Graphics().rect(x0 + 12, fy - 4, W - 24, 1).fill({ color: GOLD, alpha: 0.4 }));
    if (this.msg) this.text(this.msg, x0 + 16, fy, fs, "#cfe8b0", false, W - 32);
    const keys = this.text(padState.used ? "LB/RB or D-pad Left/Right: page · Up/Down: move · A: choose · B: close" : small ? "Tap a page, tap a row" : "Left/Right: change page · Up/Down: move · Enter: choose · Esc: close", 0, fy + 22, 12, "#8a7e68"); keys.x = x0 + W - keys.width - 16;
    const close = new Container(); close.x = x0 + W - (small ? 70 : 96); close.y = y0 + 8;
    if (!small) { sub.y = y0 + 16; sub.x = close.x - sub.width - 14; } else sub.visible = false;
    const cbg = new Graphics().roundRect(0, 0, small ? 58 : 82, 28, 6).fill(0x3a2c18).stroke({ color: GOLD, width: 1 }); const ct = new Text({ text: "Close ✕", style: serif(13, "#f0c060", true) }); ct.x = ((small ? 58 : 82) - ct.width) / 2; ct.y = 6;
    close.addChild(cbg, ct); close.eventMode = "static"; close.cursor = "pointer"; close.on("pointertap", () => this.close()); this.view.addChild(close);
  }

  private drawParty(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const g = this.host.game, f = this.f, ids = this.members();
    const lvl = (id: string) => g.kith[id]?.level ?? g.progress(id).level;
    this.list(ids.map((id) => ({ label: `${this.travels(id) ? "\u2714 " : "    "}${this.name(id)}`, sub: `Level ${lvl(id)} · ${this.travels(id) ? "with Rhea" : "at Thornwick"}` })), b, listW, fs, "Nobody has joined Rhea yet.");
    const x = b.x + listW + 18, w = b.w - listW - 18, going = this.host.inParty().filter((id) => id !== "ash");
    let y = b.y;
    y += this.text(`Travelling with Rhea: ${going.length} of ${this.host.partyRoom()}${this.host.inParty().includes("ash") ? " (plus Ash)" : ""}`, x, y, fs + 2, "#e0c070", true, w).height + 4;
    y += this.text(going.length ? going.map((id) => this.name(id)).join(", ") : "Nobody yet: Rhea goes alone.", x, y, fs - 1, "#d8ccb4", false, w).height + 14;
    const id = ids[this.i]; if (!id) return;
    y += this.text(this.name(id), x, y, fs + 5, "#fff4dc", true).height + 4;
    const job = jobOf(f, id);
    y += this.text(this.travels(id) ? `Travels with Rhea and fights at her side.` : `Waits at Thornwick${job ? `, working: ${JOB_NAMES[job].toLowerCase()}` : ""}.`, x, y, fs, "#d8ccb4", false, w).height + 12;
    const btnW = Math.min(w, 300), label = this.travels(id) ? "Leave at Thornwick" : "Take along";
    this.view.addChild(new Graphics().roundRect(x, y, btnW, fs + 22, 8).fill(this.travels(id) ? 0x4a2a1a : 0x2c4a1c).stroke({ color: GOLD, width: 2 }));
    this.hit(x, y, btnW, fs + 22, () => this.choose());
    const t = this.text(`${label}  (${keyFor("confirm")})`, x, y + 10, fs + 1, "#fff4dc", true); t.x = x + (btnW - t.width) / 2;
    y += fs + 34;
    this.text("Party changes take effect straight away when the party is with Rhea; otherwise the next time she sets out.", x, y, fs - 2, "#9a8e78", false, w);
  }

  private drawWorks(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const f = this.f, g = this.host.game;
    this.list([...BUILDING_IDS.map((id) => ({ label: BUILDINGS[id].name, sub: BUILDINGS[id].levels[levelOf(f, id)].name })), { label: "Let a day pass", sub: "Wait here while they work" }], b, listW, fs, "");
    const id = BUILDING_IDS[this.i];
    if (!id) { this.text("Stay a day at Thornwick: everyone at work does a day's work, and kith in the pens are raised. The story waits for you.", b.x + listW + 18, b.y, fs, "#d8ccb4", false, b.w - listW - 18); return; }
    const B = BUILDINGS[id], lv = levelOf(f, id), next = B.levels[lv + 1], x = b.x + listW + 18, w = b.w - listW - 18;
    let y = b.y;
    y += this.text(`${B.name}: ${B.levels[lv].name}`, x, y, fs + 5, "#fff4dc", true, w).height + 6;
    y += this.text(B.note, x, y, fs, "#d8ccb4", false, w).height + 8;
    y += this.text(`Now: ${B.levels[lv].gives}`, x, y, fs - 1, "#b8d0a0", false, w).height + 4;
    y += this.text(`Worked by: ${B.jobs.map((j) => JOB_NAMES[j].toLowerCase()).join(", ")}.`, x, y, fs - 1, "#bfae8e", false, w).height + 10;
    if (next) {
      y += this.text(`Next: ${next.name}`, x, y, fs + 1, "#e0c070", true, w).height + 4;
      y += this.text(next.gives, x, y, fs - 1, "#d8ccb4", false, w).height + 4;
      y += this.text(`Costs ${next.coin} coin and ${next.supplies} supplies, then ${next.work} days of building work.`, x, y, fs - 1, "#d8ccb4", false, w).height + 8;
      const c = canRaise(f, g.coin, id);
      this.text(c.ok ? "Enter to start building it." : c.why ?? "", x, y, fs - 1, c.ok ? "#cfe8b0" : "#e8b8a0", false, w);
    } else this.text("Built as far as it goes.", x, y, fs - 1, "#bfae8e");
  }

  private drawPeople(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const f = this.f, ids = this.host.staying();
    this.list(ids.map((id) => ({ label: this.name(id), sub: JOB_NAMES[jobOf(f, id) ?? ""] ?? "Resting" })), b, listW, fs, "Nobody is staying at Thornwick: everyone recruited is travelling with you.");
    const id = ids[this.i]; if (!id) return;
    const a = this.attrs(id), x = b.x + listW + 18, w = b.w - listW - 18, best = bestJob(a), now = jobOf(f, id);
    let y = b.y;
    y += this.text(this.name(id), x, y, fs + 5, "#fff4dc", true).height + 4;
    y += this.text(`Doing: ${now ? JOB_NAMES[now] : "Resting"}. Best at: ${JOB_NAMES[best]}. Enter to change.`, x, y, fs - 1, "#d8ccb4", false, w).height + 10;
    const jobs = [...ALL_JOBS].sort((p, q) => jobSkill(a, q) - jobSkill(a, p));
    const top = Math.max(...jobs.map((j) => jobSkill(a, j)));
    for (const j of jobs) {
      if (y + fs + 8 > b.y + b.h) break;
      const where = buildingFor(j), open = j === "build" || (where && (levelOf(f, where) > 0 || BUILDINGS[where].levels[0].coin === 0 && !["forge", "workshop", "infirmary", "school"].includes(where)));
      this.text(JOB_NAMES[j], x, y, fs - 1, j === now ? "#fff4dc" : "#e8dcc0", j === now);
      this.bar(x + fs * 9, y + fs / 2 - 2, Math.max(40, Math.min(160, w - fs * 9 - 120)), jobSkill(a, j) / top, j === best ? 0xe0c070 : 0x8ab0d0);
      this.text(`x${jobSkill(a, j).toFixed(2)}${open ? "" : "  (needs its building)"}`, x + fs * 9 + Math.min(170, w - fs * 9 - 110), y, fs - 2, "#a89a80");
      y += fs + 8;
    }
  }

  private drawForge(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const g = this.host.game, ids = this.host.armed();
    this.list(ids.map((id) => ({ label: this.name(id), sub: weaponName(id, g.gear[id] ?? { tier: 0 }) })), b, listW, fs, "Nobody with a keepsake weapon yet.");
    const id = ids[this.i]; if (!id) return;
    const l = g.gear[id] ?? { tier: 0 }, k = keepsake(id)!, x = b.x + listW + 18, w = b.w - listW - 18;
    let y = b.y;
    y += this.text(weaponName(id, l), x, y, fs + 5, "#fff4dc", true, w).height + 6;
    y += this.text(`${k.name}. ${TIERS[l.tier].name} now, ${l.tier + 1} of ${TIERS.length}.`, x, y, fs, "#d8ccb4", false, w).height + 8;
    const smith = this.smith();
    y += this.text(smith ? `At the forge: ${this.host.staying().filter((p) => jobOf(this.f, p) === "forge").map((p) => this.name(p)).join(", ")} (better smiths cost less).` : "Nobody is set to smithing: reforging costs full price.", x, y, fs - 1, "#bfae8e", false, w).height + 10;
    const next = TIERS[l.tier + 1];
    if (!next) { this.text("It can't be improved further.", x, y, fs, "#bfae8e"); return; }
    const c = canReforge(l, { forgeLevel: forgeLevel(this.f), coin: g.coin, smith, named: !!this.f[`named.${id}`], branch: l.branch ?? "?" });
    y += this.text(`Next: ${next.name}, blows x${next.power.toFixed(2)}, ${c.cost} coin.`, x, y, fs + 1, "#e0c070", true, w).height + 6;
    if (this.sub === "branch") {
      y += this.text("Which way does it go?", x, y, fs, "#e0c070", true).height + 6;
      k.branches.forEach((br, i) => {
        const on = i === this.part, rh = fs * 2 + 16;
        this.hit(x, y, w, rh, () => { this.part = i; this.doForge(br.id); }, on);
        this.text(br.name, x + 10, y + 4, fs, on ? "#fff4dc" : "#e8dcc0", on); this.text(br.note, x + 10, y + fs + 6, fs - 2, "#a89a80", false, w - 20);
        y += rh + 4;
      });
    } else this.text(c.ok || c.why === "Choose which way the weapon goes." ? "Enter to reforge." : c.why ?? "", x, y, fs - 1, c.ok ? "#cfe8b0" : "#e8b8a0", false, w);
  }

  private drawPens(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const g = this.host.game, f = this.f, ids = this.host.kithHere(), lv = levelOf(f, "pens");
    this.list(ids.map((id) => ({ label: g.kith[id].name, sub: `${SPECIES[g.kith[id].species]?.name ?? ""} · level ${g.kith[id].level}` })), b, listW, fs, "No kith are staying at Thornwick. Kith that don't travel with you stay here.");
    const x = b.x + listW + 18, w = b.w - listW - 18;
    let y = b.y;
    y += this.text(`${BUILDINGS.pens.levels[lv].name}: room for ${penSlots(f)}. ${ids.length > penSlots(f) ? "Too many: the extra ones are only fed." : ""}`, x, y, fs - 1, "#bfae8e", false, w).height + 8;
    const id = ids[this.i]; if (!id) return;
    const k = g.kith[id], plan = penPlan(f, id, lv);
    y += this.text(k.name, x, y, fs + 5, "#fff4dc", true).height + 4;
    y += this.text(readKith(k)[0], x, y, fs - 1, "#d8ccb4", false, w).height + 10;
    PEN_PARTS.forEach((p, i) => {
      const on = this.sub === "part" && this.part === i, rh = fs * 2 + 16;
      this.hit(x, y, w, rh, () => { this.sub = "part"; this.part = i; this.cyclePen(1); }, on);
      this.text(cap(p), x + 10, y + 4, fs - 2, "#a89a80");
      const src = SOURCES[plan[p]];
      this.text(`◂ ${src?.name ?? plan[p]} ▸`, x + 10, y + fs + 4, fs, on ? "#fff4dc" : "#e8dcc0", on);
      if (src?.hint) this.text(src.hint, x + 10 + fs * 12, y + fs + 5, fs - 3, "#9a8e78", false, w - fs * 12 - 20);
      y += rh + 4;
    });
    if (this.canBreedHere()) {
      const others = this.others(), mateId = others[this.mate % Math.max(1, others.length)], m = g.kith[mateId];
      const onM = this.sub === "part" && this.part === 3, rh = fs * 2 + 16;
      this.hit(x, y, w, rh, () => { this.sub = "part"; this.part = 3; this.mate = (this.mate + 1) % Math.max(1, others.length); }, onM);
      this.text("Breed with", x + 10, y + 4, fs - 2, "#a89a80");
      const c = m ? canBreed(k, m) : { ok: false, why: "" };
      this.text(`◂ ${m ? `${m.name} (${SPECIES[m.species]?.name ?? m.species})` : "nobody"} ▸   ${c.ok ? "" : c.why ?? ""}`, x + 10, y + fs + 4, fs, onM ? "#fff4dc" : "#e8dcc0", onM, w - 20);
      y += rh + 4;
      if (m && c.ok) { // say what kind of foal this pair makes: their own kind, or a cross that is neither
        const fa = familiesOf(k.species), fb = familiesOf(m.species), cross = !fa.some((x) => fb.includes(x));
        y += this.text(cross ? "Different families: their foal will be a cross, a new kind of kith that is neither parent." : "Same family: their foal will be one of their own kind.", x + 10, y, fs - 2, cross ? "#b8e0a0" : "#a89a80", cross, w - 20).height + 6;
      }
      const onB = this.sub === "part" && this.part === 4;
      this.hit(x, y, w, fs + 16, () => { this.sub = "part"; this.part = 4; this.breedNow(); }, onB);
      this.text(c.ok ? "Breed them (one litter a day)" : "Breed them (not this pair)", x + 10, y + 6, fs, c.ok ? (onB ? "#fff4dc" : "#e0c070") : "#8a7e68", onB);
      y += fs + 20;
    }
    this.text(this.sub === "part" ? "Up and Down choose, Left and Right change. Esc when done." : "Enter to change how it's raised, or to breed.", x, y + 4, fs - 2, "#9a8e78");
  }

  private drawTrain(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const g = this.host.game, f = this.f, ids = this.host.kithHere(), lv = levelOf(f, "pens");
    this.list(ids.map((id) => { const k = g.kith[id], d = drillOf(f, id); return { label: k.name, sub: `${energyWord(energyOf(k))} · ${spiritsWord(spiritsOf(k))}${d ? ` · daily: ${d.attr}` : ""}` }; }), b, listW, fs, "No kith are staying at Thornwick. Leave a kith here (Party page) to look after and train it.");
    const id = ids[this.i]; if (!id) return;
    const k = g.kith[id], x = b.x + listW + 18, w = b.w - listW - 18;
    let y = b.y;
    y += this.text(`${k.name} · level ${k.level} · bond ${Math.round(k.bond)}`, x, y, fs + 4, "#fff4dc", true, w).height + 6;
    const bw = Math.min(150, (w - 40) / 2);
    this.text("Energy", x, y, fs - 2, "#a89a80"); this.bar(x + 56, y + 5, bw, energyOf(k) / 100, energyOf(k) < 30 ? 0xd06a5a : 0x8ad07a);
    this.text(energyWord(energyOf(k)), x + 62 + bw, y, fs - 2, "#d8ccb4");
    y += fs + 4;
    this.text("Spirits", x, y, fs - 2, "#a89a80"); this.bar(x + 56, y + 5, bw, spiritsOf(k) / 100, spiritsOf(k) < 30 ? 0xd06a5a : 0xe0c070);
    this.text(spiritsWord(spiritsOf(k)), x + 62 + bw, y, fs - 2, "#d8ccb4");
    y += fs + 8;
    const warn = keeperWarning(k, this.keeperSkill());
    if (warn) y += this.text(warn, x, y, fs - 2, "#f2b090", false, w).height + 4;
    if (k.traits.includes("bone-sickness")) y += this.text(`${k.name} has the bone sickness: gentle drills only.`, x, y, fs - 2, "#f2b090", false, w).height + 4;
    const rows = [{ label: hadTimeToday(f, id) ? "Spent time together today" : "Spend time with it", sub: "Brush it, walk it, play. Bond and spirits. Once a day." },
      ...DRILLS.map((d) => {
        const no = cannotTrain(f, k, d, lv), daily = drillOf(f, id)?.id === d.id, star = f[`perfect.${d.id}.${id}`] ? " ★" : "";
        return { label: `${d.name}${star}`, sub: d.pens > lv ? no ?? "" : `${d.attr} · costs ${d.energy} energy${daily ? " · daily drill" : ""}${drilledToday(f, id) ? " · trained today" : ""}`, d, daily, dim: d.pens > lv };
      })];
    const rh = Math.max(fs * 2 + 8, Math.min(fs * 2 + 14, (b.y + b.h - y - fs - 10) / rows.length - 3));
    rows.forEach((r, i) => {
      const on = this.sub === "train" && this.part === i, dbw = 76;
      if (y + rh > b.y + b.h - fs - 6) return;
      this.hit(x, y, w - (i ? dbw + 6 : 0), rh, () => { this.sub = "train"; this.part = i; this.trainRow(false); }, on);
      this.text(r.label, x + 10, y + 3, fs - 1, "dim" in r && r.dim ? "#7a6e58" : on ? "#fff4dc" : "#e8dcc0", on);
      this.text(r.sub, x + 10, y + fs + 4, fs - 3, "#a89a80", false, w - dbw - 30);
      if (i) {
        const lit = "daily" in r && r.daily;
        this.view.addChild(new Graphics().roundRect(x + w - dbw, y + 4, dbw, rh - 8, 5).fill({ color: lit ? 0x3a4a1c : 0x1c1610, alpha: 0.95 }).roundRect(x + w - dbw, y + 4, dbw, rh - 8, 5).stroke({ color: lit ? 0xb8e0a0 : 0x4a3c28, width: 1 }));
        this.hit(x + w - dbw, y + 4, dbw, rh - 8, () => { this.sub = "train"; this.part = i; this.trainRow(true); });
        const t = this.text(lit ? "Daily ✔" : "Daily", x + w - dbw, y + rh / 2 - fs / 2 - 1, fs - 3, lit ? "#cfe8b0" : "#a89a80"); t.x = x + w - dbw + (dbw - t.width) / 2;
      }
      y += rh + 3;
    });
    this.text(this.sub === "train" ? `${keyFor("confirm")}: attend (play it) · Left/Right: set as daily drill · Esc: back` : `${keyFor("confirm")} to look after and train ${k.name}.`, x, b.y + b.h - fs, fs - 3, "#9a8e78", false, w);
  }

  private drawRoads(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const f = this.f, g = this.host.game;
    this.list(EXPEDITIONS.map((e) => ({ label: e.name, sub: !reachable(f, e.land) ? "The way isn't open yet" : f[`exp.done.${e.id}`] ? `Done once · ${e.days} day${e.days > 1 ? "s" : ""}` : `${e.days} day${e.days > 1 ? "s" : ""} · tests ${e.test}` })), b, listW, fs, "");
    const e = EXPEDITIONS[this.i]; if (!e) return;
    const x = b.x + listW + 18, w = b.w - listW - 18;
    let y = b.y;
    y += this.text(e.name, x, y, fs + 5, "#fff4dc", true, w).height + 6;
    y += this.text(e.text, x, y, fs, "#d8ccb4", false, w).height + 6;
    y += this.text(`Goal: ${e.goal.text}${f[`exp.done.${e.id}`] ? " (already met once; going again still trains it)" : ""}`, x, y, fs - 1, "#e0c070", false, w).height + 4;
    y += this.text(`On the way it gets better at ${e.test}, pass or fail. Needs level ${e.minLevel}.`, x, y, fs - 2, "#bfae8e", false, w).height + 10;
    const gone = awayIds(f);
    if (gone.length) { y += this.text(`On the road now: ${gone.map((id) => { const a = away(f, id); return `${g.kith[id]?.name ?? id} (${a?.exp.name.toLowerCase()}, ${a?.left} day${a?.left === 1 ? "" : "s"} left)`; }).join("; ")}.`, x, y, fs - 2, "#a8c0d8", false, w).height + 8; }
    const here = this.host.kithHere();
    if (this.sub !== "road") { this.text(here.length ? "Enter to choose which kith goes." : "No kith staying at Thornwick to send.", x, y, fs - 2, "#9a8e78", false, w); return; }
    this.text("Who goes? (Enter sends, Esc back)", x, y, fs - 1, "#e0c070", true); y += fs + 8;
    here.forEach((id, i) => {
      const k = g.kith[id], on = i === this.part, rh = fs + 14, no = cannotSend(f, k, e, reachable(f, e.land));
      if (y + rh > b.y + b.h) return;
      this.hit(x, y, w, rh, () => { this.part = i; this.sendOff(); }, on);
      this.text(`${k.name} · level ${k.level}`, x + 10, y + 5, fs - 1, on ? "#fff4dc" : "#e8dcc0", on);
      this.text(no ?? `${Math.round(odds(k, e) * 100)}% to meet the goal`, x + w * 0.5, y + 6, fs - 3, no ? "#e8b8a0" : "#b8e0a0", false, w * 0.5 - 10);
      y += rh + 2;
    });
  }

  private drawMake(b: { x: number; y: number; w: number; h: number }, listW: number, fs: number): void {
    const f = this.f, rows = this.makeRows();
    this.list(rows.map((r) => ({ label: r.recipe ? `  ${ITEMS[r.recipe].name}` : BUILDINGS[r.where].name, sub: r.recipe ? `${RECIPES[r.recipe].work} work, ${RECIPES[r.recipe].supplies} supplies each` : levelOf(f, r.where) ? (f[`base.make.${r.where}`] ? `Making ${ITEMS[String(f[`base.make.${r.where}`])].name.toLowerCase()}` : "Making nothing") : "Not built yet" })), b, listW, fs, "");
    const r = rows[this.i]; if (!r) return;
    const x = b.x + listW + 18, w = b.w - listW - 18;
    let y = b.y;
    y += this.text(r.recipe ? ITEMS[r.recipe].name : BUILDINGS[r.where].name, x, y, fs + 5, "#fff4dc", true).height + 6;
    y += this.text(r.recipe ? ITEMS[r.recipe].text : BUILDINGS[r.where].note, x, y, fs, "#d8ccb4", false, w).height + 8;
    const who = BUILDINGS[r.where].jobs.map((j) => JOB_NAMES[j].toLowerCase()).join(" or ");
    this.text(r.recipe ? `Enter to set the ${BUILDINGS[r.where].name.toLowerCase()} to making these. People on ${who} make them each day from supplies.` : `Enter here to stop it making anything.`, x, y, fs - 1, "#bfae8e", false, w);
  }
}
