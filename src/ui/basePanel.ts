// The Thornwick ledger (talk to the quartermaster's crates at Thornwick): five pages.
//   Works     the buildings: what each does now, what the next level costs and gives; Enter starts building it
//   People    everyone staying at Thornwick and their job; Enter cycles the job (their best is marked)
//   Forge     each keepsake weapon and what reforging it costs; Enter reforges (Masterwork asks which way)
//   Pens      kith staying at Thornwick: Enter steps through feed, pen and work for each
//   Make      what the workshop and the infirmary make each day
// Keys as in the menu: Left/Right change page, Up/Down move, Enter picks, Esc steps back or closes. All tappable.
import { Container, Graphics, Text } from "pixi.js";
import type { Game } from "../core/game";
import type { Input } from "../core/input";
import { attrsAt, jobSkill, type Attrs, type Job } from "../cast/attributes";
import { KEEPSAKES, TIERS, canReforge, keepsake, reforge, weaponName, type Loadout } from "../gear/weapons";
import { ITEMS } from "../gear/items";
import { SPECIES, breedLitter, canBreed, foalToKith, type Kith } from "../kith/kith";
import { SOURCES, readKith } from "../kith/upbringing";
import { sfx } from "../audio/music";
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
}

const TABS = ["Works", "People", "Forge", "Pens", "Make"] as const;
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
  private sub: "list" | "part" | "branch" = "list";
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
      case "Works": return BUILDING_IDS.length + 1;
      case "People": return this.host.staying().length;
      case "Forge": return this.host.armed().length;
      case "Pens": return this.host.kithHere().length;
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
      default: {
        const r = this.makeRows()[this.i]; if (!r) return;
        f[`base.make.${r.where}`] = r.recipe ?? ""; f[`base.made.${r.where}`] = 0;
        this.msg = r.recipe ? `The ${BUILDINGS[r.where].name.toLowerCase()} will make ${ITEMS[r.recipe].name.toLowerCase()}.` : `The ${BUILDINGS[r.where].name.toLowerCase()} makes nothing for now.`;
        sfx.bump();
      }
    }
  }

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
    const n = Object.keys(g.kith).length;
    foals.forEach((fo, i) => { const sp = SPECIES[fo.species]?.name ?? fo.species, k = foalToKith(fo, `foal-${fo.species}-${n + i + 1}`, `${sp} foal`); this.host.addFoal(k); });
    const sp = SPECIES[foals[0].species]?.name ?? foals[0].species;
    this.msg = `${foals.length > 1 ? "Twins" : "A foal"}: ${sp.toLowerCase()}${foals[0].unseen ? " (never seen before!)" : foals[0].throwback ? " (a throwback)" : ""}. ${foals.length > 1 ? "They join" : "It joins"} the company.`;
    sfx.pickup(); this.sub = "list";
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
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    const w = this.w, h = this.h, W = Math.min(940, w - 16), H = Math.min(620, h - 16), x0 = Math.round((w - W) / 2), y0 = Math.round((h - H) / 2);
    const small = W < 620, fs = small ? 13 : 15, g = this.host.game;
    const dim = new Graphics().rect(0, 0, w, h).fill({ color: 0, alpha: 0.6 }); dim.eventMode = "static"; this.view.addChild(dim);
    this.view.addChild(new Graphics().roundRect(x0, y0, W, H, 10).fill({ color: INK, alpha: 0.97 }).roundRect(x0, y0, W, H, 10).stroke({ color: GOLD, width: 2 }));
    const tw = (W - 24) / TABS.length;
    TABS.forEach((t, i) => {
      const tx = x0 + 12 + i * tw, on = i === this.tab;
      this.hit(tx, y0 + 10, tw - 6, 34, () => { this.tab = i; this.i = 0; this.sub = "list"; }, on);
      const label = new Text({ text: t, style: serif(small ? 14 : 18, on ? "#fff4dc" : "#a89a80", on) }); label.anchor.set(0.5, 0.5); label.x = tx + (tw - 6) / 2; label.y = y0 + 27; this.view.addChild(label);
    });
    // what Thornwick holds
    const building = this.f["base.build"];
    const status = `Coin ${g.coin}   ·   Supplies ${supplies(this.f)}   ·   Day ${Number(this.f["base.day"] ?? 0)}${building ? `   ·   Building: ${BUILDINGS[String(building)].name} (${Number(this.f["base.work"] ?? 0)} / ${BUILDINGS[String(building)].levels[levelOf(this.f, String(building)) + 1]?.work ?? 0})` : ""}`;
    this.text(status, x0 + 16, y0 + 52, fs - 1, "#e0c070", true, W - 32);
    const body = { x: x0 + 14, y: y0 + 80, w: W - 28, h: H - 80 - 46 };
    const listW = Math.round(small ? Math.min(160, body.w * 0.42) : Math.min(260, body.w * 0.33));
    switch (TABS[this.tab]) {
      case "Works": this.drawWorks(body, listW, fs); break;
      case "People": this.drawPeople(body, listW, fs); break;
      case "Forge": this.drawForge(body, listW, fs); break;
      case "Pens": this.drawPens(body, listW, fs); break;
      default: this.drawMake(body, listW, fs);
    }
    const fy = y0 + H - 42;
    this.view.addChild(new Graphics().rect(x0 + 12, fy - 4, W - 24, 1).fill({ color: GOLD, alpha: 0.4 }));
    if (this.msg) this.text(this.msg, x0 + 16, fy, fs, "#cfe8b0", false, W - 32);
    const keys = this.text(small ? "Esc closes" : "Arrows move · Enter picks · Esc back or close", 0, fy + 20, 12, "#8a7e68"); keys.x = x0 + W - keys.width - 16;
    const closeBtn = this.text("Close", x0 + 16, fy + 20, 12, "#e0c070", true); closeBtn.eventMode = "static"; closeBtn.cursor = "pointer"; closeBtn.on("pointertap", () => this.close());
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
      const onB = this.sub === "part" && this.part === 4;
      this.hit(x, y, w, fs + 16, () => { this.sub = "part"; this.part = 4; this.breedNow(); }, onB);
      this.text(c.ok ? "Breed them (one litter a day)" : "Breed them (not this pair)", x + 10, y + 6, fs, c.ok ? (onB ? "#fff4dc" : "#e0c070") : "#8a7e68", onB);
      y += fs + 20;
    }
    this.text(this.sub === "part" ? "Up and Down choose, Left and Right change. Esc when done." : "Enter to change how it's raised, or to breed.", x, y + 4, fs - 2, "#9a8e78");
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
