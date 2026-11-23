// An army battle: first the war council (who leads which company, which stratagem, what is known of their plan),
// then the field in real time. Click one of your companies, then the ground to move or one of theirs to attack.
// Space pauses, Tab picks the next company, T changes speed, H tells the chosen company to hold.
import { Container, Graphics, Text, type FederatedPointerEvent } from "pixi.js";
import type { Game } from "../core/game";
import type { Scene } from "../core/scene";
import { sfx } from "../audio/music";
import { PEOPLE, type Attrs } from "../cast/attributes";
import { KINDS, createArmy, give, live, orderDelay, planAhead, suggestOfficers, terrainAt, tick, type ArmyDef, type ArmyState, type Company, type Terrain } from "./army";

export interface Officer { id: string; name: string; attrs: Attrs; }
type Phase = "intro" | "council" | "field" | "over";
const serif = (size: number, fill: string, bold = false) => ({ fontFamily: "Georgia, serif", fontSize: size, fill, fontWeight: bold ? ("bold" as const) : ("normal" as const) });
const GROUND: Record<Terrain, number> = { open: 0x6f8a4a, road: 0xb09a6a, woods: 0x3d5a32, hill: 0x8c9a5a, water: 0x3a6a9a, ford: 0x6a9ab8, wall: 0x8a8478, gate: 0x7a5a3a, yard: 0x9a9284 };
const OURS = 0x4a7ad0, THEIRS = 0xc04a3a;

export class ArmyScene implements Scene {
  readonly id = "army";
  readonly view = new Container();
  private game!: Game;
  s!: ArmyState;
  phase: Phase = "intro";
  private introAt = 0;
  private officerOf: Record<string, string>;
  private stratagem: string;
  private field = new Container();
  private ground = new Graphics();
  private marks = new Graphics();
  private labels = new Container();
  private hud = new Container();
  private W = 800; private H = 600; private cell = 20; private ox = 0; private oy = 0;
  private sel: string | null = null;
  paused = false;
  private speed = 1;
  private logShown = "";
  private hudDirty = true;
  private keys = (e: KeyboardEvent) => { if (this.phase !== "field") return; if (e.key === "+" || e.key === "=") this.setSpeed(Math.min(3, this.speed + 1)); else if (e.key === "-") this.setSpeed(Math.max(1, this.speed - 1)); else if (e.key === "h" || e.key === "H") this.hold(); };

  constructor(private def: ArmyDef, private pool: Officer[], private hero: Officer, private onDone: (won: boolean, s: ArmyState) => void, private rng: () => number = Math.random) {
    this.officerOf = suggestOfficers(def, pool, hero.id);
    this.stratagem = def.stratagems[0]?.id ?? "";
  }

  enter(game: Game): void {
    this.game = game;
    const back = new Graphics(); back.eventMode = "static"; back.rect(0, 0, 4000, 4000).fill({ color: 0x0b0d10 });
    this.view.addChild(back, this.field, this.hud);
    this.field.addChild(this.ground, this.marks, this.labels);
    this.field.eventMode = "static"; this.field.on("pointertap", (e: FederatedPointerEvent) => this.tap(e));
    window.addEventListener("keydown", this.keys);
    this.s = this.build();
  }
  exit(): void { window.removeEventListener("keydown", this.keys); }

  private officers(): Record<string, { attrs: Attrs } | undefined> {
    const by = new Map([this.hero, ...this.pool].map((o) => [o.id, o]));
    return Object.fromEntries(Object.entries(this.officerOf).map(([c, id]) => [c, by.get(id)]));
  }
  private build(): ArmyState {
    const s = createArmy(this.def, this.officers(), this.stratagem, this.hero.attrs.wits);
    for (const c of s.cos) if (c.side === "ours") c.officer = this.officerOf[c.id];
    return s;
  }
  private nameOf(id?: string): string { return id ? [this.hero, ...this.pool].find((o) => o.id === id)?.name ?? id : "a sergeant"; }

  resize(w: number, h: number): void {
    this.W = w; this.H = h;
    const rows = this.def.terrain.length, cols = this.def.terrain[0].length, side = w > h * 1.25 ? Math.min(300, w * 0.28) : 0, bottom = side ? 0 : Math.min(220, h * 0.34);
    this.cell = Math.max(8, Math.floor(Math.min((w - side - 16) / cols, (h - bottom - 16) / rows)));
    this.ox = Math.round((w - side - cols * this.cell) / 2); this.oy = Math.round((h - bottom - rows * this.cell) / 2);
    this.field.x = this.ox; this.field.y = this.oy;
    this.drawGround(); this.hudDirty = true;
  }

  // ---------------- council ----------------
  private cycleOfficer(cid: string): void {
    if (cid === this.def.ours[0].id) return; // the hero leads their own company
    const taken = new Set(Object.entries(this.officerOf).filter(([c]) => c !== cid).map(([, id]) => id));
    const opts = [undefined, ...this.pool.map((o) => o.id).filter((id) => !taken.has(id))];
    const i = opts.indexOf(this.officerOf[cid]); const next = opts[(i + 1) % opts.length];
    if (next) this.officerOf[cid] = next; else delete this.officerOf[cid];
    sfx.bump(); this.s = this.build(); this.hudDirty = true;
  }
  /** What your officers say about a stratagem, by their archetype. */
  private opinions(stId: string): string[] {
    const st = this.def.stratagems.find((x) => x.id === stId); if (!st?.opinions) return [];
    const by = new Map<string, string[]>();
    for (const id of new Set(Object.values(this.officerOf))) {
      const arch = PEOPLE[id]?.arch, line = arch && st.opinions[arch];
      if (line && id !== this.hero.id) by.set(line, [...(by.get(line) ?? []), this.nameOf(id)]);
    }
    const names = (n: string[]) => n.length > 1 ? `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}` : n[0];
    return [...by].map(([line, n]) => `${names(n)}: ${line}`).slice(0, 3);
  }

  // ---------------- field ----------------
  private setSpeed(n: number): void { this.speed = n; this.hudDirty = true; }
  private hold(): void { if (this.sel) { give(this.s, this.sel, { kind: "hold" }); this.hudDirty = true; } }
  private at(e: FederatedPointerEvent): [number, number] { const p = this.field.toLocal(e.global); return [p.x / this.cell, p.y / this.cell]; }
  private tap(e: FederatedPointerEvent): void {
    if (this.phase !== "field") return;
    const [x, y] = this.at(e);
    const hit = live(this.s).filter((c) => Math.hypot(c.x - x, c.y - y) < 1.4 && !(c.side === "theirs" && c.hidden)).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (hit?.side === "ours") { this.sel = hit.id; sfx.bump(); }
    else if (this.sel && hit) { const d = give(this.s, this.sel, { kind: "attack", target: hit.id }); this.say(`Order sent: attack ${hit.name}. It reaches them in ${d.toFixed(1)}s.`); sfx.choose(); }
    else if (this.sel) { const d = give(this.s, this.sel, { kind: "move", to: [x, y] }); this.say(`Order sent: move. It reaches them in ${d.toFixed(1)}s.`); sfx.choose(); }
    this.hudDirty = true;
  }
  private say(t: string): void { this.logShown = t; this.hudDirty = true; }

  update(dt: number): void {
    const inp = this.game.input;
    if (this.phase === "intro") { if (inp.wasPressed("confirm")) this.next(); return; }
    if (this.phase === "council") { if (inp.wasPressed("confirm")) this.toField(); return; }
    if (this.phase === "over") { if (inp.wasPressed("confirm")) this.finish(); return; }
    if (inp.wasPressed("confirm")) { this.paused = !this.paused; this.hudDirty = true; }
    if (inp.wasPressed("menu")) { const ours = live(this.s, "ours"); const i = ours.findIndex((c) => c.id === this.sel); this.sel = ours[(i + 1) % ours.length]?.id ?? null; this.hudDirty = true; }
    if (inp.wasPressed("timing")) this.setSpeed(this.speed % 3 + 1);
    if (inp.wasPressed("cancel")) { this.sel = null; this.hudDirty = true; }
    if (this.paused) return;
    const n = this.s.log.length;
    for (let i = 0; i < this.speed; i++) tick(this.s, dt, this.rng);
    if (this.s.log.length > n) { this.say(this.s.log[this.s.log.length - 1]); sfx.hit(); }
    if (this.s.over) { this.phase = "over"; this.hudDirty = true; if (this.s.over === "won") sfx.join(); }
    if (Math.floor(this.s.t * 4) !== Math.floor((this.s.t - dt * this.speed) * 4)) this.hudDirty = true;
  }
  private next(): void { this.introAt++; if (this.introAt >= this.def.intro.length) this.phase = "council"; this.hudDirty = true; sfx.bump(); }
  private toField(): void { this.s = this.build(); this.phase = "field"; this.sel = this.def.ours[0].id; this.logShown = "Space pauses. Click a company of yours, then where it should go."; this.hudDirty = true; sfx.choose(); }
  private finish(): void { this.game.scenes.pop(); this.onDone(this.s.over === "won", this.s); }

  // ---------------- drawing ----------------
  private drawGround(): void {
    const g = this.ground.clear(), c = this.cell, rows = this.def.terrain;
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      const k = this.def.legend[ch] ?? "open", n = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      g.rect(x * c, y * c, c + 0.5, c + 0.5).fill({ color: GROUND[k] });
      if (k === "woods") for (let i = 0; i < 2; i++) g.circle(x * c + c * (0.25 + 0.5 * ((n >> (i * 4)) & 1)), y * c + c * (0.3 + 0.4 * ((n >> (i * 4 + 2)) & 1)), c * 0.28).fill({ color: 0x2c4626 });
      else if (k === "hill") g.rect(x * c, y * c + c * 0.45, c, 1).fill({ color: 0xa8b070, alpha: 0.6 });
      else if (k === "wall") g.rect(x * c, y * c, c, c * 0.3).fill({ color: 0xa8a294 });
      else if (k === "ford") g.rect(x * c, y * c + c * 0.4, c, c * 0.2).fill({ color: 0xc8b890, alpha: 0.6 });
      else if (k === "open" && (n & 7) === 0) g.circle(x * c + (n % c), y * c + ((n >> 5) % c), 1).fill({ color: 0x8aa060 });
    }));
    if (this.s?.stakes) { const [x0, y0, x1, y1] = this.s.stakes; for (let x = x0; x <= x1; x += 0.7) for (let y = y0; y <= y1; y += 0.9) g.moveTo(x * c, y * c + 3).lineTo(x * c + 3, y * c - 2).stroke({ color: 0x5a3a20, width: 1.5 }); }
  }

  render(): void {
    if (!this.s) return;
    const m = this.marks.clear(), c = this.cell, s = this.s;
    this.labels.removeChildren().forEach((x) => x.destroy());
    // what is known of their plan: arrows for the steps still to come
    if (this.phase === "council" || this.phase === "field") {
      const ahead = planAhead(s), show = s.intel === 2 ? ahead : s.intel === 1 ? ahead.slice(0, 1) : [];
      for (const p of show) for (const o of p.orders) {
        const co = s.cos.find((q) => q.id === o.company); if (!co || co.state !== "ok") continue;
        const pts = [[co.x, co.y], ...(o.via ? [o.via] : []), o.to];
        m.moveTo(pts[0][0] * c, pts[0][1] * c); for (const q of pts.slice(1)) m.lineTo(q[0] * c, q[1] * c);
        m.stroke({ color: 0xff8a6a, width: 2, alpha: 0.45 });
        const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 2], a = Math.atan2(ay - by, ax - bx);
        m.moveTo(ax * c, ay * c).lineTo(ax * c - Math.cos(a - 0.5) * 8, ay * c - Math.sin(a - 0.5) * 8).moveTo(ax * c, ay * c).lineTo(ax * c - Math.cos(a + 0.5) * 8, ay * c - Math.sin(a + 0.5) * 8).stroke({ color: 0xff8a6a, width: 2, alpha: 0.6 });
      }
    }
    for (const co of s.cos) {
      if (co.state === "gone" || (co.side === "theirs" && co.hidden)) continue;
      this.drawCompany(m, co);
    }
    // orders: where the chosen company is going, and orders still on their way
    for (const co of live(s, "ours")) {
      const o = co.pending?.order ?? co.order, tgt = o.target ? s.cos.find((q) => q.id === o.target) : undefined, to = tgt ? [tgt.x, tgt.y] : o.to;
      if (!to || (co.id !== this.sel && !co.pending)) continue;
      m.moveTo(co.x * c, co.y * c).lineTo(to[0] * c, to[1] * c).stroke({ color: co.pending ? 0xffe39a : 0x9ad0ff, width: co.pending ? 1.5 : 2, alpha: 0.8 });
      m.circle(to[0] * c, to[1] * c, 4).stroke({ color: tgt ? 0xff8a6a : 0x9ad0ff, width: 2 });
      if (co.pending) this.tag(`${co.pending.in.toFixed(1)}s`, co.x * c, co.y * c - c * 1.9, 0xffe39a);
    }
    if (this.hudDirty) { this.drawHud(); this.hudDirty = false; }
  }
  private tag(t: string, x: number, y: number, col: number): void {
    const l = new Text({ text: t, style: { fontFamily: "Georgia, serif", fontSize: Math.max(10, this.cell * 0.55), fill: col, fontWeight: "bold", stroke: { color: 0x000000, width: 3 } } });
    l.anchor.set(0.5); l.x = x; l.y = y; this.labels.addChild(l);
  }
  private drawCompany(m: Graphics, co: Company): void {
    const c = this.cell, col = co.side === "ours" ? OURS : THEIRS, k = KINDS[co.kind];
    const alpha = co.hidden ? 0.45 : co.state === "routing" ? 0.55 : 1;
    // little soldiers in ranks, turned to face the way the company faces
    const n = Math.max(1, Math.round(co.men / 3)), perRow = co.kind === "horse" ? 4 : 6, gap = c * (co.kind === "horse" ? 0.42 : 0.3);
    const fx = Math.cos(co.facing), fy = Math.sin(co.facing), sx = -fy, sy = fx;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / perRow), q = (i % perRow) - (Math.min(n, perRow) - 1) / 2;
      const jit = co.state === "routing" ? Math.sin(i * 7.1 + this.s.t * 9) * c * 0.25 : 0;
      const px = (co.x + (sx * q * gap - fx * r * gap) / c) * c + jit, py = (co.y + (sy * q * gap - fy * r * gap) / c) * c + jit * 0.5;
      m.circle(px, py, co.kind === "horse" ? c * 0.15 : c * 0.1).fill({ color: col, alpha });
      if (co.kind === "pike") m.moveTo(px, py).lineTo(px + fx * c * 0.4, py + fy * c * 0.4).stroke({ color: 0xd8d0b8, width: 1, alpha });
    }
    // banner
    const bx = co.x * c - fx * c * 0.9, by = co.y * c - fy * c * 0.9 - c * 0.6;
    m.moveTo(bx, by + c * 0.6).lineTo(bx, by - c * 0.4).stroke({ color: 0x2a2018, width: 1.5, alpha });
    m.rect(bx, by - c * 0.4, c * 0.55, c * 0.35).fill({ color: col, alpha });
    if (co.id === this.sel) m.circle(co.x * c, co.y * c, c * 1.3).stroke({ color: 0xffe39a, width: 2 });
    // morale and strength under the company
    const w = c * 1.6, y = co.y * c + c * 0.9;
    m.rect(co.x * c - w / 2, y, w, 3).fill({ color: 0x1a1410, alpha: 0.8 }).rect(co.x * c - w / 2, y, w * Math.max(0, co.morale / co.maxMorale), 3).fill({ color: co.side === "ours" ? 0xc8d8f0 : 0xf0c8b8, alpha });
    if (this.cell >= 14 || co.id === this.sel) this.tag(`${k.name[0]} ${Math.round(co.men)}`, co.x * c, y + c * 0.55, co.side === "ours" ? 0xd8e8ff : 0xffd8c8);
  }

  private drawHud(): void {
    this.hud.removeChildren().forEach((x) => x.destroy({ children: true }));
    const w = this.W, h = this.H, s = this.s, wide = w > h * 1.25;
    const px = wide ? w - Math.min(300, w * 0.28) + 8 : 12, py = wide ? 12 : this.oy + this.def.terrain.length * this.cell + 8, pw = wide ? Math.min(300, w * 0.28) - 20 : w - 24;
    const fs = w < 640 ? 13 : 15;
    const txt = (t: string, x: number, y: number, size = fs, fill = "#d8cdb6", bold = false, wrap = pw) => { const o = new Text({ text: t, style: { ...serif(size, fill, bold), wordWrap: true, wordWrapWidth: wrap, lineHeight: Math.round(size * 1.3) } }); o.x = x; o.y = y; this.hud.addChild(o); return o; };
    const btn = (label: string, x: number, y: number, bw: number, bh: number, on: () => void, lit = false) => {
      const b = new Graphics().roundRect(x, y, bw, bh, 7).fill({ color: lit ? 0x3a2c18 : 0x1c1610, alpha: 0.95 }).roundRect(x, y, bw, bh, 7).stroke({ color: 0xe0c070, width: lit ? 2 : 1 });
      b.eventMode = "static"; b.cursor = "pointer"; b.on("pointertap", (e) => { e.stopPropagation(); on(); this.hudDirty = true; }); this.hud.addChild(b);
      const t = new Text({ text: label, style: { ...serif(fs, "#f2e3c4", true), align: "center", wordWrap: true, wordWrapWidth: bw - 10 } }); t.anchor.set(0.5); t.x = x + bw / 2; t.y = y + bh / 2; this.hud.addChild(t);
    };
    const panel = (x: number, y: number, pw2: number, ph: number) => this.hud.addChild(new Graphics().roundRect(x, y, pw2, ph, 10).fill({ color: 0x14100c, alpha: 0.94 }).roundRect(x, y, pw2, ph, 10).stroke({ color: 0xe0c070, width: 2 }));

    if (this.phase === "intro") {
      const bw = Math.min(640, w - 32), bx = (w - bw) / 2, by = h / 2 - 90;
      panel(bx, by, bw, 180);
      txt(this.def.name, bx + 18, by + 14, fs + 6, "#fff4dc", true, bw - 36);
      txt(this.def.intro[this.introAt], bx + 18, by + 50, fs, "#d8cdb6", false, bw - 36);
      btn("Go on", bx + bw - 130, by + 132, 112, 34, () => this.next());
      return;
    }
    if (this.phase === "council") {
      const bw = Math.min(900, w - 16), bh = Math.min(h - 16, 600), bx = (w - bw) / 2, by = (h - bh) / 2;
      panel(bx, by, bw, bh);
      txt("War council", bx + 18, by + 12, fs + 6, "#fff4dc", true);
      const col = Math.min(400, bw * 0.48);
      let y = by + 50;
      txt("Who leads what (tap to change)", bx + 18, y, fs - 1, "#e0c070", true); y += fs + 10;
      for (const cd of this.def.ours) {
        const co = s.cos.find((q) => q.id === cd.id)!, who = this.officerOf[cd.id];
        btn(`${cd.name} (${KINDS[cd.kind].name}): ${cd.id === this.def.ours[0].id ? this.hero.name : this.nameOf(who)}  ·  ${co.men} strong`, bx + 18, y, col, fs + 18, () => this.cycleOfficer(cd.id));
        y += fs + 24;
      }
      y += 6;
      txt("What we know of their plan", bx + 18, y, fs - 1, "#e0c070", true); y += fs + 8;
      const notes = s.intel === 2 ? this.def.plan.map((p) => `• ${p.note}`) : s.intel === 1 ? [`• ${this.def.plan[0].note}`, "• More than that, nobody can tell. Someone sharper might read it."] : ["Nothing. Their captain is cleverer than anyone you have. A sharper officer would see more."];
      txt(notes.join("\n"), bx + 18, y, fs - 1, "#d8cdb6", false, col);
      // stratagems
      const sx = bx + col + 40, sw = bw - col - 58; let sy = by + 50;
      txt("Stratagem (pick one)", sx, sy, fs - 1, "#e0c070", true); sy += fs + 10;
      for (const st of this.def.stratagems) {
        const on = st.id === this.stratagem;
        btn(st.name, sx, sy, sw, fs + 18, () => { this.stratagem = st.id; this.s = this.build(); this.drawGround(); }, on); sy += fs + 22;
        if (on) {
          sy += txt(st.text, sx + 6, sy, fs - 1, "#d8cdb6", false, sw - 12).height + 6;
          for (const o of this.opinions(st.id)) sy += txt(o, sx + 6, sy, fs - 2, "#bfae8e", false, sw - 12).height + 4;
          sy += 6;
        }
      }
      btn("To the field", bx + bw - 170, by + bh - 52, 150, 38, () => this.toField(), true);
      return;
    }
    // the field
    if (wide) panel(px - 8, 4, pw + 16, h - 8);
    let y = py;
    const ours = live(s, "ours").length, theirs = live(s, "theirs").length;
    y += txt(`${this.def.name}`, px, y, fs + 2, "#fff4dc", true).height + 4;
    y += txt(`${this.def.hold ? `Dark in ${Math.max(0, Math.ceil(this.def.hold - s.t))}s  ·  ` : ""}Yours ${ours}  ·  Theirs ${theirs}${this.paused ? "  ·  PAUSED" : ""}  ·  x${this.speed}`, px, y, fs - 1, "#e0c070").height + 8;
    const sel = this.sel ? s.cos.find((q) => q.id === this.sel && q.state === "ok") : undefined;
    if (sel) {
      y += txt(`${sel.name}: ${KINDS[sel.kind].name}, led by ${sel.id === this.def.ours[0].id ? this.hero.name : this.nameOf(this.officerOf[sel.id])}`, px, y, fs, "#fff4dc", true).height + 2;
      y += txt(`${Math.round(sel.men)} of ${sel.max} on their feet · nerve ${Math.max(0, Math.round(sel.morale))} · orders reach them in ${orderDelay(s, sel).toFixed(1)}s${sel.hidden ? " · hidden" : ""}${sel.flanked > 0 ? " · FLANKED" : ""}`, px, y, fs - 2, "#bfae8e").height + 8;
    } else y += txt("Click one of your companies (blue) to give it orders.", px, y, fs - 1, "#bfae8e").height + 8;
    if (this.logShown) y += txt(this.logShown, px, y, fs - 1, "#cfe8b0").height + 8;
    const bw = wide ? (pw - 8) / 2 : Math.min(140, (pw - 18) / 4), bh = 34;
    const row = (items: [string, () => void, boolean?][]) => { items.forEach(([l, f, lit], i) => btn(l, px + (wide ? (i % 2) * (bw + 8) : i * (bw + 6)), y + (wide ? Math.floor(i / 2) * (bh + 6) : 0), bw, bh, f, lit)); y += (wide ? Math.ceil(items.length / 2) : 1) * (bh + 6); };
    row([[this.paused ? "Resume" : "Pause", () => { this.paused = !this.paused; }, this.paused], [`Speed x${this.speed}`, () => this.setSpeed(this.speed % 3 + 1)], ["Hold", () => this.hold()], ["Next company", () => { const o = live(s, "ours"); const i = o.findIndex((c) => c.id === this.sel); this.sel = o[(i + 1) % o.length]?.id ?? null; }]]);
    if (wide && y < h - 120) txt("Click ground to move, a red company to attack. Space pauses, Tab next, T speed, H hold. The faint red arrows are what you know of their plan.", px, y + 6, fs - 3, "#8a7e68");
    if (this.phase === "over") {
      const bw2 = Math.min(520, w - 32), bx = (this.ox + (this.def.terrain[0].length * this.cell) / 2) - bw2 / 2, by2 = h / 2 - 70;
      panel(Math.max(8, bx), by2, bw2, 140);
      txt(s.over === "won" ? this.def.won : this.def.lost, Math.max(8, bx) + 18, by2 + 16, fs + 8, s.over === "won" ? "#ffe39a" : "#f2c4b4", true, bw2 - 36);
      txt(s.over === "won" ? (live(s, "theirs").length ? "Dark comes down. The Wardens pull back down the road." : "The last of them break and run for the ford.") : "Your company breaks. The yard is theirs for the night.", Math.max(8, bx) + 18, by2 + 56, fs, "#d8cdb6", false, bw2 - 36);
      btn("Done", Math.max(8, bx) + bw2 - 120, by2 + 94, 100, 34, () => this.finish(), true);
    }
  }
  /** For tests: the terrain under a point. */
  terrain(x: number, y: number): Terrain { return terrainAt(this.s, x, y); }
}
