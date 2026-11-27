// Army battles: companies on a field, real time with pause. Pure rules; the scene (armyScene.ts) draws and takes orders.
//
//   Companies   each is led by an officer whose attributes (cast/attributes `command`) set its size, morale,
//               attack, tactics, volleys and endurance; its kind (foot, pikes, bows, riders) sets speed and reach
//   Orders      move, attack, hold. They take time to arrive: further from your own company and a slower-witted
//               officer means a longer delay (command delay)
//   Fighting    companies in contact fight; a blow to the flank or rear counts double, and breaks nerve faster;
//               woods and walls shelter, high ground helps; pikes stop riders, riders smash anyone caught in the open;
//               bows loose at anyone in range
//   Morale      losses, flanking and friends running drain it; at nothing a company breaks and runs. Battles are
//               won by breaking the other side, not by killing it
//   The enemy   has a plan: phases of orders for its companies, set going by time or by what you do. Your sharpest
//               officer's wits against its commander's decide how much of the plan you can see (intelligence)
//   The council before the battle picks one stratagem, which changes the ground, the plan, or where you start
import data from "../../data/army/battles.json";
import { attrsAt, command, type Attrs } from "../cast/attributes";

export type Kind = "foot" | "pike" | "bow" | "horse";
export type Terrain = "open" | "woods" | "hill" | "water" | "ford" | "road" | "wall" | "gate" | "yard";
export const KINDS: Record<Kind, { name: string; speed: number; melee: number; defence: number; range: number; men: number }> = {
  foot: { name: "Foot", speed: 1.0, melee: 1.0, defence: 1.0, range: 0, men: 1 },
  pike: { name: "Pikes", speed: 0.8, melee: 0.8, defence: 1.3, range: 0, men: 1 },
  bow: { name: "Bows", speed: 1.0, melee: 0.5, defence: 0.7, range: 7, men: 0.8 },
  horse: { name: "Riders", speed: 2.0, melee: 1.3, defence: 0.9, range: 0, men: 0.5 },
};
const TER: Record<Terrain, { move: number; shelter: number; pass: boolean }> = {
  open: { move: 1, shelter: 1, pass: true }, road: { move: 1.2, shelter: 1, pass: true }, woods: { move: 0.55, shelter: 0.7, pass: true },
  hill: { move: 0.75, shelter: 0.85, pass: true }, water: { move: 0, shelter: 1, pass: false }, ford: { move: 0.45, shelter: 1.25, pass: true },
  wall: { move: 0, shelter: 1, pass: false }, gate: { move: 0.6, shelter: 0.5, pass: true }, yard: { move: 1, shelter: 0.6, pass: true },
};

export interface CompanyDef { id: string; name: string; kind: Kind; at: [number, number]; facing?: number; officer?: string; level?: number; /** Left out of the field when this story flag is set. */ unless?: string; }
export interface PlanStep { at?: number; when?: "contact" | "half"; orders: { company: string; to: [number, number]; via?: [number, number] }[]; note: string; }
export interface Stratagem { id: string; name: string; text: string; /** Who says what about it in council: archetype -> line. */ opinions?: Record<string, string>; effect: { hide?: string[]; move?: Record<string, [number, number]>; stakes?: [number, number, number, number]; skipPlan?: number; enemyMorale?: number; /** Cells whose ground changes (a bridge raised): [x, y, legend char]. */ terrain?: [number, number, string][]; }; }
export interface ArmyDef {
  id: string; name: string; intro: string[]; terrain: string[]; legend: Record<string, Terrain>;
  /** Seconds the player must hold, if holding wins; otherwise break them. */ hold?: number;
  /** We are the ones attacking: they hold their ground, and if they aren't broken by the limit (seconds), the day is lost. */
  attack?: boolean; limit?: number;
  ours: CompanyDef[]; theirs: CompanyDef[]; commander: { name: string; cast: string; level: number };
  plan: PlanStep[]; stratagems: Stratagem[]; won: string; lost: string; /** The line under the result, when the default (a Warden road fight) doesn't fit. */ wonNote?: string; lostNote?: string;
}
export const ARMY_BATTLES = data.battles as unknown as Record<string, ArmyDef>;

export interface Order { kind: "move" | "attack" | "hold"; to?: [number, number]; via?: [number, number]; target?: string; }
export interface Company {
  id: string; name: string; side: "ours" | "theirs"; kind: Kind; officer?: string; attrs: Attrs;
  x: number; y: number; facing: number; men: number; max: number; morale: number; maxMorale: number; fatigue: number;
  order: Order; pending: { order: Order; in: number } | null; state: "ok" | "routing" | "gone"; hidden: boolean; engaged: number; firstBlow: boolean; flanked: number; kills: number;
}
export interface ArmyState { def: ArmyDef; t: number; cos: Company[]; planDone: number[]; stakes?: [number, number, number, number]; log: string[]; over: null | "won" | "lost"; intel: 0 | 1 | 2; }

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
export const terrainAt = (s: ArmyState, x: number, y: number): Terrain => { const r = s.def.terrain[Math.floor(y)]; return r ? s.def.legend[r[Math.floor(x)]] ?? "open" : "water"; };

/** Officers in council: the companies of our side, each with whoever leads it. Unled companies have a sergeant (level 6 warden). */
export function createArmy(def: ArmyDef, officers: Record<string, { attrs: Attrs } | undefined>, stratagem?: string | string[], heroWits = 10): ArmyState {
  const picked = (Array.isArray(stratagem) ? stratagem : stratagem ? [stratagem] : []).map((id) => def.stratagems.find((x) => x.id === id)).filter((x): x is Stratagem => !!x);
  for (const chosen of picked) if (chosen.effect.terrain) { const rows = def.terrain.map((r) => [...r]); for (const [x, y, ch] of chosen.effect.terrain) rows[y][x] = ch; def = { ...def, terrain: rows.map((r) => r.join("")) }; }
  const make = (c: CompanyDef, side: "ours" | "theirs"): Company => {
    const a = officers[c.id]?.attrs ?? attrsAt(c.officer ?? "warden", c.level ?? 6), k = KINDS[c.kind];
    const men = Math.round(command.unitSize(a) * k.men), mor = command.morale(a);
    return { id: c.id, name: c.name, side, kind: c.kind, officer: c.officer, attrs: a, x: c.at[0], y: c.at[1], facing: c.facing ?? (side === "ours" ? Math.PI / 2 : -Math.PI / 2), men, max: men, morale: mor, maxMorale: mor, fatigue: 0, order: { kind: "hold" }, pending: null, state: "ok", hidden: false, engaged: 0, firstBlow: false, flanked: 0, kills: 0 };
  };
  const s: ArmyState = { def, t: 0, cos: [...def.ours.map((c) => make(c, "ours")), ...def.theirs.map((c) => make(c, "theirs"))], planDone: [], log: [], over: null, intel: 0 };
  const cmd = attrsAt(def.commander.cast, def.commander.level);
  const wits = Math.max(heroWits, ...s.cos.filter((c) => c.side === "ours").map((c) => c.attrs.wits));
  s.intel = wits >= cmd.wits + 2 ? 2 : wits >= cmd.wits - 3 ? 1 : 0;
  for (const st of picked) {
    for (const id of st.effect.hide ?? []) { const c = s.cos.find((q) => q.id === id); if (c) { c.hidden = true; c.firstBlow = true; } }
    for (const [id, at] of Object.entries(st.effect.move ?? {})) { const c = s.cos.find((q) => q.id === id); if (c) { c.x = at[0]; c.y = at[1]; } }
    if (st.effect.stakes) s.stakes = st.effect.stakes;
    if (st.effect.skipPlan != null) s.planDone.push(st.effect.skipPlan);
    if (st.effect.enemyMorale) for (const c of s.cos) if (c.side === "theirs") { c.morale = Math.max(10, c.morale - st.effect.enemyMorale); }
  }
  return s;
}

export const live = (s: ArmyState, side?: "ours" | "theirs"): Company[] => s.cos.filter((c) => c.state === "ok" && (!side || c.side === side));
/** Seconds before an order reaches a company: distance from your own company, and the officer's wits. */
export function orderDelay(s: ArmyState, c: Company): number {
  const hq = s.cos.find((q) => q.id === s.def.ours[0].id);
  const d = hq && hq !== c && hq.state === "ok" ? Math.hypot(hq.x - c.x, hq.y - c.y) : 0;
  return clamp(0.3 + d * 0.12 / command.tactics(c.attrs), 0.3, 6);
}
export function give(s: ArmyState, id: string, order: Order): number {
  const c = s.cos.find((q) => q.id === id); if (!c || c.state !== "ok") return 0;
  const d = orderDelay(s, c); c.pending = { order, in: d }; return d;
}

/** The plan steps not yet set going, in order. */
export const planAhead = (s: ArmyState): PlanStep[] => s.def.plan.filter((_, i) => !s.planDone.includes(i));

/** True if nothing impassable lies on the straight way between two points. */
function clear(s: ArmyState, x0: number, y0: number, x1: number, y1: number): boolean {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3);
  for (let i = 1; i <= n; i++) { const t = i / n; if (!TER[terrainAt(s, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)].pass) return false; }
  return true;
}
const fields = new WeakMap<ArmyState, Map<string, Int16Array>>();
/** Steps from every cell to the target cell over ground that can be crossed (a flow field, cached per target). */
function flow(s: ArmyState, tx: number, ty: number): Int16Array {
  const W = s.def.terrain[0].length, H = s.def.terrain.length, gx = Math.floor(tx), gy = Math.floor(ty), key = `${gx},${gy}`;
  let m = fields.get(s); if (!m) { m = new Map(); fields.set(s, m); }
  const hit = m.get(key); if (hit) return hit;
  const d = new Int16Array(W * H).fill(-1), q: number[] = [];
  if (gx >= 0 && gy >= 0 && gx < W && gy < H) { d[gy * W + gx] = 0; q.push(gy * W + gx); }
  for (let i = 0; i < q.length; i++) {
    const x = q[i] % W, y = Math.floor(q[i] / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || d[ny * W + nx] >= 0) continue;
      if (!TER[terrainAt(s, nx + 0.5, ny + 0.5)].pass) continue;
      d[ny * W + nx] = d[q[i]] + 1; q.push(ny * W + nx);
    }
  }
  m.set(key, d); return d;
}
/** The centre of the next cell on the shortest way round whatever blocks the straight line. */
function nextCell(s: ArmyState, x: number, y: number, tx: number, ty: number): [number, number] | undefined {
  const W = s.def.terrain[0].length, H = s.def.terrain.length, d = flow(s, tx, ty), cx = Math.floor(x), cy = Math.floor(y);
  let best: [number, number] | undefined, bd = cx >= 0 && cy >= 0 && cx < W && cy < H && d[cy * W + cx] >= 0 ? d[cy * W + cx] : 1e9;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const v = d[ny * W + nx]; if (v >= 0 && v < bd) { bd = v; best = [nx + 0.5, ny + 0.5]; }
  }
  return best;
}

const dist = (a: Company, b: Company): number => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a: number, b: number): number => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };

/** Advances the battle by dt seconds. */
export function tick(s: ArmyState, dt: number, rng: () => number): void {
  if (s.over) return;
  s.t += dt;
  // the enemy plan
  s.def.plan.forEach((p, i) => {
    if (s.planDone.includes(i)) return;
    const go = p.at != null ? s.t >= p.at : p.when === "contact" ? live(s, "theirs").some((c) => c.engaged > 0) : p.when === "half" ? live(s, "theirs").length <= s.def.theirs.length / 2 : false;
    if (!go) return;
    s.planDone.push(i);
    for (const o of p.orders) { const c = s.cos.find((q) => q.id === o.company); if (c && c.state === "ok") c.order = { kind: "move", to: o.to, via: o.via }; }
  });
  for (const c of s.cos) {
    if (c.state === "gone") continue;
    if (c.pending) { c.pending.in -= dt; if (c.pending.in <= 0) { c.order = c.pending.order; c.pending = null; } }
    c.engaged = Math.max(0, c.engaged - dt); c.flanked = Math.max(0, c.flanked - dt);
  }
  // the enemy: anyone of theirs not on a march takes on the nearest of ours in reach
  for (const c of live(s, "theirs")) {
    if (c.order.kind === "move") continue;
    const near = live(s, "ours").filter((o) => !o.hidden).sort((a, b) => dist(a, c) - dist(b, c))[0];
    if (near && dist(near, c) < (c.kind === "bow" ? 9 : 6) * (s.def.attack ? 0.6 : 1)) c.order = { kind: "attack", target: near.id };
  }
  // the hidden show themselves when they attack, or when the enemy blunders into them
  for (const c of live(s, "ours")) if (c.hidden && (c.order.kind === "attack" || live(s, "theirs").some((o) => dist(o, c) < 2.5))) c.hidden = false;
  // movement
  for (const c of live(s)) {
    let tx: number | undefined, ty: number | undefined;
    const tgt = c.order.target ? s.cos.find((q) => q.id === c.order.target && q.state === "ok") : undefined;
    if (c.order.kind === "attack" && !tgt) c.order = { kind: "hold" };
    if (tgt) { const reach = c.kind === "bow" ? KINDS.bow.range - 1 : 1.1; if (dist(c, tgt) > reach) { tx = tgt.x; ty = tgt.y; } else c.facing = Math.atan2(tgt.y - c.y, tgt.x - c.x); }
    else if (c.order.kind === "move" && c.order.to) {
      const via = c.order.via; if (via && Math.hypot(via[0] - c.x, via[1] - c.y) < 0.6) c.order.via = undefined;
      [tx, ty] = c.order.via ?? c.order.to;
      if (!c.order.via && Math.hypot(tx - c.x, ty - c.y) < 0.3) { c.order = { kind: "hold" }; tx = undefined; }
    }
    if (tx == null || ty == null) { c.fatigue = Math.max(0, c.fatigue - dt * 0.02); continue; }
    // stop to fight anyone of theirs in contact (melee companies)
    if (c.kind !== "bow" && live(s).some((o) => o.side !== c.side && !o.hidden && dist(o, c) < 1.15)) continue;
    // a wall or a stream in the way: make for the gate or ford that gives the shortest way round
    if (!clear(s, c.x, c.y, tx, ty)) { const w = nextCell(s, c.x, c.y, tx, ty); if (w) [tx, ty] = w; }
    const ang = Math.atan2(ty - c.y, tx - c.x), here = TER[terrainAt(s, c.x, c.y)];
    const sp = KINDS[c.kind].speed * here.move * (1 - c.fatigue * 0.4) * clamp(command.endurance(c.attrs), 0.7, 1.4) * 0.9;
    const step = Math.min(Math.hypot(tx - c.x, ty - c.y), sp * dt);
    const nx = c.x + Math.cos(ang) * step, ny = c.y + Math.sin(ang) * step;
    if (TER[terrainAt(s, nx, ny)].pass) { c.x = nx; c.y = ny; }
    else { // slide along whatever blocks the way
      if (TER[terrainAt(s, nx, c.y)].pass) c.x = nx; else if (TER[terrainAt(s, c.x, ny)].pass) c.y = ny;
    }
    c.facing = ang; c.fatigue = Math.min(1, c.fatigue + dt * (c.kind === "horse" ? 0.012 : 0.008));
  }
  // fighting
  const loss = new Map<Company, number>();
  const hurt = (who: Company, n: number, by: Company) => { loss.set(who, (loss.get(who) ?? 0) + n); by.kills += n; };
  for (const a of live(s)) {
    if (a.hidden) continue;
    for (const b of live(s)) {
      if (b.side === a.side || b.hidden) continue;
      const d = dist(a, b);
      const melee = d < 1.2, shoot = a.kind === "bow" && !melee && d <= KINDS.bow.range && (!a.order.target || a.order.target === b.id) && (a.engaged <= 0 || a.order.target === b.id);
      if (!melee && !shoot) continue;
      const ka = KINDS[a.kind], kb = KINDS[b.kind], terB = TER[terrainAt(s, b.x, b.y)];
      const hill = terrainAt(s, b.x, b.y) === "hill" && terrainAt(s, a.x, a.y) !== "hill" ? 0.8 : 1;
      if (melee) {
        // which side of b is a coming from? front 1, flank 1.5, rear 2
        const side = angDiff(Math.atan2(a.y - b.y, a.x - b.x), b.facing), mult = side > 2.2 ? 2 : side > 1.1 ? 1.5 : 1;
        if (mult > 1) b.flanked = 1.5;
        let k = ka.melee * command.attack(a.attrs) * mult * terB.shelter * hill / kb.defence;
        if (a.kind === "horse" && b.kind === "pike" && mult === 1) k *= 0.35;
        if (b.kind === "horse" && a.kind === "pike") k *= 1.8;
        if (a.kind === "horse" && a.engaged <= 0) k *= 2.2; // the charge
        if (a.firstBlow) { k *= 1.8; a.firstBlow = false; s.log.push(`${a.name} come out of hiding into ${b.name}'s flank.`); b.flanked = 3; }
        if (s.stakes && b.side === "ours" && a.side === "theirs") { const [x0, y0, x1, y1] = s.stakes; if (a.x >= x0 && a.x <= x1 && a.y >= y0 && a.y <= y1) { k *= 0.6; hurt(a, a.men * 0.02 * dt * 10 * (a.kind === "horse" ? 2 : 1), b); } }
        hurt(b, a.men * 0.012 * k * dt * (0.85 + rng() * 0.3), a);
        a.engaged = 1; b.engaged = 1;
      } else {
        const k = command.volley(a.attrs) * terB.shelter * (terrainAt(s, b.x, b.y) === "woods" ? 0.6 : 1) * (1 - a.fatigue * 0.3);
        hurt(b, a.men * 0.006 * k * dt * (0.85 + rng() * 0.3), a);
        a.facing = Math.atan2(b.y - a.y, b.x - a.x);
      }
    }
  }
  for (const [c, n] of loss) {
    const before = c.men; c.men = Math.max(0, c.men - n);
    const end = clamp(command.endurance(c.attrs), 0.7, 1.5);
    c.morale -= ((before - c.men) / c.max) * 140 / end;
  }
  for (const c of live(s)) {
    if (c.flanked > 0) c.morale -= dt * 2.5;
    else if (c.engaged <= 0) c.morale = Math.min(c.maxMorale, c.morale + dt * 1.2);
    // your own company steadies those near it
    const hq = s.cos.find((q) => q.id === s.def.ours[0].id);
    if (c.side === "ours" && hq && hq !== c && hq.state === "ok" && dist(hq, c) < 5) c.morale = Math.min(c.maxMorale, c.morale + dt * 0.6);
    if (c.men < c.max * 0.12 || c.morale <= 0) {
      c.state = "routing";
      s.log.push(`${c.name} break and run.`);
      for (const o of live(s, c.side)) if (dist(o, c) < 6) o.morale -= 12;
    }
  }
  // the routed run for their own edge and leave the field
  for (const c of s.cos.filter((q) => q.state === "routing")) {
    // our side holds the top of the field, theirs comes from the bottom
    const ty = c.side === "ours" ? -3 : s.def.terrain.length + 2, dir = Math.sign(ty - c.y);
    c.y += dir * KINDS[c.kind].speed * 1.3 * dt; c.facing = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (c.y < -1 || c.y > s.def.terrain.length + 1) c.state = "gone";
  }
  if (!live(s, "theirs").length) s.over = "won";
  else if (!live(s, "ours").length || s.cos.find((q) => q.id === s.def.ours[0].id)?.state !== "ok") s.over = "lost";
  else if (s.def.hold && s.t >= s.def.hold) s.over = "won";
  else if (s.def.attack && s.t >= attackLimit(s.def)) s.over = "lost";
}
export const attackLimit = (d: ArmyDef): number => d.limit ?? 420;

/** Fair default officers: the best fit among those offered for each company's kind. */
export function suggestOfficers(def: ArmyDef, pool: { id: string; attrs: Attrs }[], heroId: string): Record<string, string> {
  const fit = (k: Kind, a: Attrs): number => k === "horse" ? a.might + a.finesse + a.nerve : k === "bow" ? a.finesse * 2 + a.wits : k === "pike" ? a.nerve * 2 + a.grit : a.might + a.grit + a.presence;
  const out: Record<string, string> = { [def.ours[0].id]: heroId }, used = new Set([heroId]);
  for (const c of def.ours.slice(1)) {
    if (c.id.startsWith("ally-")) continue; // allies come with their own captains
    const best = pool.filter((p) => !used.has(p.id)).sort((p, q) => fit(c.kind, q.attrs) - fit(c.kind, p.attrs))[0];
    if (best) { out[c.id] = best.id; used.add(best.id); }
  }
  return out;
}

/** Companies whose `unless` flag is set stay off the field, with any stratagem that moves or hides them. */
export function withoutAbsent(def: ArmyDef, flags: Record<string, unknown>): ArmyDef {
  const gone = new Set(def.ours.filter((c) => c.unless && flags[c.unless]).map((c) => c.id));
  if (!gone.size) return def;
  const uses = (st: ArmyDef["stratagems"][number]) => [...(st.effect.hide ?? []), ...Object.keys(st.effect.move ?? {})].some((id) => gone.has(id));
  return { ...def, ours: def.ours.filter((c) => !gone.has(c.id)), stratagems: def.stratagems.filter((st) => !uses(st)) };
}
