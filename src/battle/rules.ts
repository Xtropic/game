// Battle rules: pure state and functions, no drawing or timing, so every rule is unit-tested.
// The scene animates a move, collects the timing grade(s) from the player, then calls act() / foeAct()
// and plays back the returned events.
//
// Rules carried over from the prototype:
// - Hits and braces are timed: perfect x1.5 / good x1.2 damage dealt, perfect x0.3 / good x0.6 damage taken.
// - Foes show their next move (intent) a round ahead.
// - The patrol has a nerve (resolve). Damage wears it down; at zero the survivors run (a non-lethal win).
// - Bonded kith don't take a turn of their own: they follow their partner's good hits, cover the partner
//   once a round, and answer a Call when the bond meter is full. Kith never die in party fights; they bolt.
// - The foal song takes three timed notes: it calms a wild kith (it leaves) or steadies an ally kith (next hit x1.5).
// - A blinded (smoked) foe loses its next move, and hits on it land as an ambush (x1.4).

export type Side = "ally" | "foe";
export type Row = "front" | "back";
export type Grade = "perfect" | "good" | "early" | "late" | "none";
export type SkillKind = "melee" | "ranged" | "pounce" | "heal" | "stun" | "guard" | "song" | "call";

export interface SkillDef { name: string; note: string; kind: SkillKind; dmg?: [number, number]; amt?: number; ally?: boolean; proj?: string; icon?: string; }
export type SkillBook = Record<string, SkillDef>;

export interface UnitDef { id: string; name: string; look: string; side: Side; row: Row; hp: number; skills: string[]; kith?: boolean; bonded?: string; at: [number, number]; }
export interface BattleDef { id: string; name: string; backdrop: string; intro: string[]; units: UnitDef[]; }

export interface Intent { skill: string; target: string; }
export interface Unit extends UnitDef {
  maxHp: number;
  stunned: boolean;
  guardedBy: string | null;
  covered: boolean; // a bonded kith has already covered its partner this round
  calm: number; // 0..100, wild kith only
  gone: boolean; // left the field (fled, calmed, bolted)
  steady: boolean;
  intent: Intent | null;
}

export type Phase = "ally" | "foe" | "won" | "lost";
export interface BattleState {
  def: BattleDef;
  units: Unit[];
  phase: Phase;
  turn: number; // index into allyFighters() while phase is "ally"
  round: number;
  bond: number; // 0..100; full means the Call is ready
  resolve: number; // foes' nerve, 0..100
  routed: boolean; // won by breaking their nerve, with foes still standing
  log: string[];
}

export type BattleEvent =
  | { t: "hit"; by: string; target: string; amt: number; tags: string[]; redirected?: "cover" | "guard"; was?: string }
  | { t: "down"; id: string }
  | { t: "bolt"; id: string } // a bonded kith at 0 HP runs off
  | { t: "follow"; by: string; target: string } // marks the start of a kith follow-up; a hit event follows
  | { t: "heal"; by: string; target: string; amt: number }
  | { t: "stun"; by: string; target: string }
  | { t: "guard"; by: string; target: string }
  | { t: "calm"; by: string; target: string; calm: number; left: boolean }
  | { t: "steady"; by: string; target: string; amt: number }
  | { t: "call"; by: string; kith: string }
  | { t: "stumble"; id: string }
  | { t: "bondReady" }
  | { t: "rout"; ids: string[] }
  | { t: "end"; result: "won" | "lost" };

export type Rng = () => number;
export const roll = (rng: Rng, [a, b]: [number, number]): number => a + Math.floor(rng() * (b - a + 1));

export const gradeMult = (g: Grade): number => (g === "perfect" ? 1.5 : g === "good" ? 1.2 : 1);
export const braceMult = (g: Grade): number => (g === "perfect" ? 0.3 : g === "good" ? 0.6 : 1);
const isGood = (g: Grade) => g === "perfect" || g === "good";

/** Timing window in seconds from the moment of impact. */
export function gradePress(offset: number): Grade {
  const a = Math.abs(offset);
  return a < 0.075 ? "perfect" : a < 0.17 ? "good" : offset < 0 ? "early" : "late";
}

export function createBattle(def: BattleDef, book: SkillBook, rng: Rng): BattleState {
  const units: Unit[] = def.units.map((u) => ({ ...u, maxHp: u.hp, stunned: false, guardedBy: null, covered: false, calm: 0, gone: false, steady: false, intent: null }));
  const s: BattleState = { def, units, phase: "ally", turn: 0, round: 1, bond: 0, resolve: 100, routed: false, log: [...def.intro] };
  planIntents(s, book, rng);
  return s;
}

export const unit = (s: BattleState, id: string): Unit => { const u = s.units.find((x) => x.id === id); if (!u) throw new Error(`no unit ${id}`); return u; };
export const alive = (u: Unit): boolean => u.hp > 0 && !u.gone;
export const sideOf = (s: BattleState, side: Side): Unit[] => s.units.filter((u) => u.side === side);
/** Units that take their own turns: bonded kith act off their partner's turns instead. */
export const fighters = (s: BattleState, side: Side): Unit[] => sideOf(s, side).filter((u) => alive(u) && !u.bonded);
export const kithOf = (s: BattleState, u: Unit): Unit | undefined => s.units.find((k) => k.bonded === u.id && alive(k));
const frontUp = (s: BattleState, side: Side) => sideOf(s, side).some((u) => alive(u) && u.row === "front");

/** The ally whose turn it is, if any. */
export function acting(s: BattleState): Unit | null { return s.phase === "ally" ? fighters(s, "ally")[s.turn] ?? null : null; }

export function skillsFor(s: BattleState, u: Unit): string[] {
  const ks = u.skills.slice();
  if (s.bond >= 100 && kithOf(s, u)) ks.unshift("call");
  return ks;
}

export function targetsFor(s: BattleState, book: SkillBook, u: Unit, k: string): Unit[] {
  const sk = book[k];
  if (sk.kind === "song") return s.units.filter((x) => alive(x) && x.kith);
  if (sk.kind === "call") { const pool = sideOf(s, "foe").filter(alive); return frontUp(s, "foe") ? pool.filter((x) => x.row === "front") : pool; }
  if (sk.ally) return sideOf(s, u.side).filter((x) => alive(x) && (sk.kind !== "guard" || x.id !== u.id) && !(sk.kind === "guard" && x.bonded));
  const es: Side = u.side === "ally" ? "foe" : "ally";
  const pool = sideOf(s, es).filter((x) => alive(x) && !x.bonded);
  if (sk.kind === "melee") return frontUp(s, es) ? pool.filter((x) => x.row === "front") : pool;
  if (sk.kind === "pounce") return pool.slice().sort((a, b) => (a.row === "back" ? 0 : 1) - (b.row === "back" ? 0 : 1));
  return pool;
}

/** How many timed presses a move asks for (0 means it just happens). */
export function pressesFor(book: SkillBook, k: string): number {
  const kind = book[k].kind;
  return kind === "song" ? 3 : kind === "melee" || kind === "ranged" || kind === "pounce" || kind === "call" ? 1 : 0;
}

export function planIntents(s: BattleState, book: SkillBook, rng: Rng): void {
  for (const f of sideOf(s, "foe")) {
    f.intent = null;
    if (!alive(f) || !f.skills.length || !book[f.skills[0]]) continue;
    const k = f.skills[0], pool = targetsFor(s, book, f, k);
    if (!pool.length) continue;
    const t = book[k].kind === "pounce" ? pool[0] : pool[Math.floor(rng() * pool.length)];
    f.intent = { skill: k, target: t.id };
  }
}

function addBond(s: BattleState, n: number, ev: BattleEvent[]): void {
  if (n <= 0) return;
  const was = s.bond; s.bond = Math.min(100, s.bond + n);
  if (was < 100 && s.bond >= 100) ev.push({ t: "bondReady" });
}

function damage(book: SkillBook, u: Unit, k: string, t: Unit, g: Grade, rng: Rng): { amt: number; tags: string[] } {
  let m = gradeMult(g); const tags: string[] = [];
  if (t.stunned) { m *= 1.4; tags.push("Ambush"); }
  if (u.steady) { m *= 1.5; u.steady = false; tags.push("Steadied"); }
  return { amt: Math.round(roll(rng, book[k].dmg ?? [1, 1]) * m), tags };
}

/** Deals damage, applying a kith's cover or a guard. Returns the unit actually hit. */
function hit(s: BattleState, by: Unit, target: Unit, amt: number, tags: string[], ev: BattleEvent[]): Unit {
  let t = target, redirected: "cover" | "guard" | undefined;
  const k = t.side === "ally" && !t.bonded ? kithOf(s, t) : undefined;
  if (k && !k.covered && by.side === "foe") { k.covered = true; t = k; redirected = "cover"; s.log.push(`${k.name} shoulders in front of ${target.name} and takes the blow.`); }
  else if (t.guardedBy) { const gd = unit(s, t.guardedBy); if (alive(gd)) { t = gd; redirected = "guard"; s.log.push(`${gd.name} takes the blow for ${target.name}.`); } }
  t.hp = Math.max(0, t.hp - amt);
  ev.push({ t: "hit", by: by.id, target: t.id, amt, tags, redirected, was: redirected ? target.id : undefined });
  if (t.side === "foe") s.resolve = Math.max(0, s.resolve - amt * 1.05 - (t.hp === 0 ? 15 : 0));
  s.log.push(`${by.name} hits ${t.name} for ${amt}.${t.hp === 0 ? ` ${t.name} goes down.` : ""}`);
  if (t.hp === 0 && t.bonded) { t.gone = true; ev.push({ t: "bolt", id: t.id }); s.log.push(`${t.name} bolts back up the trail. He'll find you after.`); }
  else if (t.hp === 0) { t.intent = null; ev.push({ t: "down", id: t.id }); }
  return t;
}

/** An ally's move. grades holds one entry per press (see pressesFor). Advances the turn. */
export function act(s: BattleState, book: SkillBook, actorId: string, k: string, targetId: string, grades: Grade[], rng: Rng): BattleEvent[] {
  const u = unit(s, actorId), t = unit(s, targetId), ev: BattleEvent[] = [];
  if (s.phase !== "ally" || acting(s) !== u) throw new Error(`not ${actorId}'s turn`);
  if (!skillsFor(s, u).includes(k)) throw new Error(`${actorId} can't use ${k}`);
  if (!targetsFor(s, book, u, k).includes(t)) throw new Error(`${targetId} is not a target for ${k}`);
  perform(s, book, u, k, t, grades, rng, ev);
  if (!checkEnd(s, ev)) {
    s.turn++;
    if (s.turn >= fighters(s, "ally").length) { s.phase = "foe"; s.turn = 0; }
  }
  return ev;
}

function perform(s: BattleState, book: SkillBook, u: Unit, k: string, t: Unit, grades: Grade[], rng: Rng, ev: BattleEvent[]): void {
  const sk = book[k], g = grades[0] ?? "none", ally = u.side === "ally";
  switch (sk.kind) {
    case "melee": case "ranged": case "pounce": {
      if (ally) {
        const d = damage(book, u, k, t, g, rng);
        const landed = hit(s, u, t, d.amt, d.tags, ev);
        addBond(s, g === "perfect" ? 25 : g === "good" ? 10 : 0, ev);
        const kin = isGood(g) && alive(landed) && sk.kind === "melee" ? kithOf(s, u) : undefined;
        if (kin) { ev.push({ t: "follow", by: kin.id, target: landed.id }); const f = damage(book, kin, "follow", landed, "none", rng); hit(s, kin, landed, f.amt, ["Follow-up", ...f.tags], ev); }
      } else {
        hit(s, u, t, Math.max(1, Math.round(roll(rng, sk.dmg ?? [1, 1]) * braceMult(g))), [], ev);
        addBond(s, g === "perfect" ? 20 : g === "good" ? 8 : 0, ev);
      }
      break;
    }
    case "heal": { const n = Math.min(sk.amt ?? 0, t.maxHp - t.hp); t.hp += n; ev.push({ t: "heal", by: u.id, target: t.id, amt: n }); s.log.push(`${u.name} rallies ${t.name} (+${n}).`); break; }
    case "stun": { t.stunned = true; ev.push({ t: "stun", by: u.id, target: t.id }); s.log.push(`${u.name} throws a smoke pot. ${t.name} is blinded and loses its move.`); break; }
    case "guard": { for (const x of sideOf(s, u.side)) if (x.guardedBy === u.id) x.guardedBy = null; t.guardedBy = u.id; ev.push({ t: "guard", by: u.id, target: t.id }); s.log.push(`${u.name} stands in front of ${t.name}.`); break; }
    case "song": {
      const hits = grades.filter(isGood).length, perfects = grades.filter((x) => x === "perfect").length;
      if (t.side === u.side) {
        t.steady = true; const n = Math.min(4 + hits * 3, t.maxHp - t.hp); t.hp += n; addBond(s, 10 + perfects * 10, ev);
        ev.push({ t: "steady", by: u.id, target: t.id, amt: n }); s.log.push(`${u.name} sings. ${t.name} steadies.`);
      } else {
        t.calm = Math.min(100, t.calm + 18 + hits * 14 + perfects * 6); addBond(s, perfects * 8, ev);
        const left = t.calm >= 100;
        if (left) { t.intent = null; t.gone = true; s.resolve = Math.max(0, s.resolve - 15); }
        ev.push({ t: "calm", by: u.id, target: t.id, calm: t.calm, left });
        s.log.push(left ? `The ${t.name.toLowerCase()} stops, listening. It slinks away into the dark.` : `${u.name} sings. The ${t.name.toLowerCase()}'s ears go back, then forward.`);
      }
      break;
    }
    case "call": {
      const kin = kithOf(s, u); if (!kin) break;
      s.bond = 0; ev.push({ t: "call", by: u.id, kith: kin.id }); s.log.push(`${u.name} calls. ${kin.name} comes.`);
      const line = targetsFor(s, book, u, "call");
      line.forEach((t2, i) => { if (!alive(t2)) return; const d = damage(book, kin, "call", t2, g, rng); hit(s, kin, t2, d.amt, i === 0 ? ["Call", ...d.tags] : d.tags, ev); });
      break;
    }
  }
}

/** Foes that will still act this foe phase, in order. */
export const foeQueue = (s: BattleState): Unit[] => sideOf(s, "foe").filter(alive);

/** What a foe is about to do: refreshes a stale intent (dead or gone target). null = no move. */
export function foeMove(s: BattleState, book: SkillBook, foeId: string, rng: Rng): Intent | "stunned" | null {
  const f = unit(s, foeId);
  if (!alive(f)) return null;
  if (f.stunned) return "stunned";
  if (!f.intent || !alive(unit(s, f.intent.target))) { planIntents(s, book, rng); }
  return f.intent;
}

/** One foe acts. grade is the player's brace for the attack. */
export function foeAct(s: BattleState, book: SkillBook, foeId: string, grade: Grade, rng: Rng): BattleEvent[] {
  const f = unit(s, foeId), ev: BattleEvent[] = [];
  if (s.phase !== "foe") throw new Error("not the foes' turn");
  const mv = foeMove(s, book, foeId, rng);
  if (mv === "stunned") { f.stunned = false; ev.push({ t: "stumble", id: f.id }); s.log.push(`${f.name} stumbles in the smoke.`); return ev; }
  if (!mv) return ev;
  perform(s, book, f, mv.skill, unit(s, mv.target), [grade], rng, ev);
  f.intent = null;
  checkEnd(s, ev);
  return ev;
}

/** After every foe has acted: guards and covers reset, next round's intents are shown. */
export function endRound(s: BattleState, book: SkillBook, rng: Rng): void {
  if (s.phase === "won" || s.phase === "lost") return;
  for (const u of s.units) { u.guardedBy = null; u.covered = false; }
  s.round++; s.turn = 0; s.phase = "ally"; s.log.push(`Round ${s.round}.`);
  planIntents(s, book, rng);
}

export function checkEnd(s: BattleState, ev: BattleEvent[]): boolean {
  if (s.phase === "won" || s.phase === "lost") return true;
  const standing = sideOf(s, "foe").filter(alive);
  if (!standing.length || s.resolve <= 0) {
    s.phase = "won"; s.routed = standing.length > 0;
    if (s.routed) { for (const f of standing) { f.gone = true; f.intent = null; } ev.push({ t: "rout", ids: standing.map((f) => f.id) }); }
    s.log.push(s.routed ? "The patrol's nerve breaks. They run." : "The trail goes quiet.");
    ev.push({ t: "end", result: "won" }); return true;
  }
  if (!fighters(s, "ally").length) { s.phase = "lost"; s.log.push("You're driven back up the trail."); ev.push({ t: "end", result: "lost" }); return true; }
  return false;
}

/** Small seeded generator so fights replay exactly in tests. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
