// Character attributes. Seven attributes grow with level and decide how a character does in every system:
// party battles, army battles, duels, jobs at Thornwick, and checks in talk and diplomacy.
//
//   might     strength: melee damage, charges, hauling and building work
//   grit      toughness: health, damage taken, marching, holding out in the raw
//   finesse   precision: ranged damage, a wider timing window, crafting, cards and locks
//   nerve     composure: braces, holding the line, morale under fire, resisting fear
//   wits      cunning: ambushes, tactics, research and records, seeing through lies
//   heart     care: healing, song, kith bonds, calming wild kith, comforting people
//   presence  command: breaking enemy nerve, unit size and morale, persuasion, trade
//
// Growth is deterministic: an archetype gives base values and a fractional gain per level, and each
// character leans a little away from it. No lucky or unlucky level-ups, so a level always means the same.
import data from "../../data/cast/attributes.json";

export const ATTRS = ["might", "grit", "finesse", "nerve", "wits", "heart", "presence"] as const;
export type Attr = (typeof ATTRS)[number];
export type Attrs = Record<Attr, number>;

interface Archetype { base: number[]; growth: number[]; }
export interface Person { arch: string; up: Attr[]; down: Attr[]; level: number; note?: string; }
export type Mod = Partial<Record<Attr, number>> & { note?: string };

const ARCH = data.archetypes as Record<string, Archetype>;
export const PEOPLE = data.people as Record<string, Person>;
export const MODS = data.mods as Record<string, Mod>;
export const MAX_LEVEL = data.maxLevel;

const LEAN_BASE = 2, LEAN_GROWTH = 0.15;
/** What an unknown or stat-less unit counts as (an average level 1 to 3 person). */
export const NEUTRAL: Attrs = { might: 7, grit: 7, finesse: 7, nerve: 7, wits: 7, heart: 7, presence: 7 };

export const person = (id: string): Person | undefined => PEOPLE[id];

/** Attribute values for a character at a level, with any modifiers (a fresh lull, the raw...) applied. */
export function attrsAt(id: string, level: number, mods: string[] = []): Attrs {
  const p = PEOPLE[id]; if (!p) throw new Error(`no attributes for ${id}`);
  const a = ARCH[p.arch]; if (!a) throw new Error(`no archetype ${p.arch}`);
  const L = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  const out = {} as Attrs;
  ATTRS.forEach((k, i) => {
    const lean = (p.up.includes(k) ? 1 : 0) - (p.down.includes(k) ? 1 : 0);
    const base = Math.max(2, a.base[i] + lean * LEAN_BASE), growth = Math.max(0.12, a.growth[i] + lean * LEAN_GROWTH);
    let v = base + Math.floor(growth * (L - 1) + 1e-9);
    for (const m of mods) v += MODS[m]?.[k] ?? 0;
    out[k] = Math.max(1, v);
  });
  return out;
}

/** Which attributes went up between two levels, and by how much. */
export function gains(id: string, from: number, to: number): Partial<Attrs> {
  const a = attrsAt(id, from), b = attrsAt(id, to), out: Partial<Attrs> = {};
  for (const k of ATTRS) if (b[k] > a[k]) out[k] = b[k] - a[k];
  return out;
}

// ---- Levels and experience -------------------------------------------------------------------------------

/** Experience needed to go from `level` to the next. */
export const xpToNext = (level: number): number => 40 + 20 * level;

export interface Progress { level: number; xp: number; }

/** Adds experience; returns the new progress and every level reached on the way. */
export function addXp(p: Progress, amount: number): { progress: Progress; levels: number[] } {
  let { level, xp } = p; xp += Math.max(0, Math.round(amount)); const levels: number[] = [];
  while (level < MAX_LEVEL && xp >= xpToNext(level)) { xp -= xpToNext(level); level++; levels.push(level); }
  if (level >= MAX_LEVEL) xp = 0;
  return { progress: { level, xp }, levels };
}

/** Experience for defeating a foe of a level; unlevelled foes (wild kith) count as level 2. */
export const xpForFoe = (level = 2): number => 12 * level;

// ---- What attributes do in each system ---------------------------------------------------------------------
// Ratios, not differences: (attacker + 12) / (defender + 12), so a gap matters less as both sides grow and
// nothing ever one-shots or becomes untouchable. Every system reads from these, so balance lives in one place.

const ratio = (a: number, b: number): number => (a + 12) / (b + 12);
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/** Party battles. */
export const party = {
  /** Health in party battles. */
  maxHp: (a: Attrs, level: number): number => 24 + 2 * a.grit + level,
  /** Damage multiplier for an attack: melee uses might, ranged uses finesse, against the target's grit. */
  power: (by: Attrs, target: Attrs, kind: "melee" | "ranged"): number => clamp(ratio(kind === "ranged" ? by.finesse : by.might, target.grit), 0.5, 2.2),
  /** How much a timing window widens (or narrows) with finesse. 1 at finesse 7. */
  timing: (a: Attrs): number => clamp(1 + (a.finesse - 7) / 60, 0.85, 1.45),
  /** Damage taken on a brace: nerve makes a good brace better. 1 at nerve 7. */
  brace: (a: Attrs): number => clamp(ratio(7, a.nerve), 0.55, 1.2),
  /** Healing and song: heart. 1 at heart 7. */
  care: (a: Attrs): number => clamp(ratio(a.heart, 7), 0.7, 2.2),
  /** How much each blow shakes the enemy's nerve: presence. 1 at presence 7. */
  shake: (a: Attrs): number => clamp(ratio(a.presence, 7), 0.7, 2),
  /** Bonus on a blinded or ambushed target: wits. 1.4 at wits 7. */
  ambush: (a: Attrs): number => clamp(1.25 + a.wits / 48, 1.25, 2),
  /** Who acts first: quick hands and a quick mind. */
  initiative: (a: Attrs): number => a.finesse * 0.6 + a.wits * 0.4,
  /** Chance to slip a blow entirely: the target's finesse against the attacker's. 6% between equals. */
  dodge: (target: Attrs, by: Attrs): number => clamp(0.06 + ((target.finesse - by.finesse) / (target.finesse + by.finesse + 24)) * 0.6, 0.02, 0.25),
  /** How much of a foe's next move the party can read: 2 = move and target, 1 = the move only, 0 = nothing. */
  read: (partyWits: number, foe: Attrs): 0 | 1 | 2 => (partyWits >= foe.wits - 1 ? 2 : partyWits >= foe.wits - 5 ? 1 : 0),
};

/** Army battles: what an officer brings to the unit they lead. */
export const command = {
  /** Soldiers or riders the officer can lead. */
  unitSize: (a: Attrs): number => Math.round(30 + a.presence * 2.5),
  /** Starting morale out of 100, and how slowly it drains under fire. */
  morale: (a: Attrs): number => Math.round(clamp(40 + a.nerve * 1.5 + a.presence, 40, 100)),
  /** Charge and melee strength of the unit. */
  attack: (a: Attrs): number => ratio(a.might + a.presence / 2, 10),
  /** Flanking, ambush and terrain bonuses. */
  tactics: (a: Attrs): number => ratio(a.wits, 7),
  /** Ranged volleys. */
  volley: (a: Attrs): number => ratio(a.finesse, 7),
  /** March speed before fatigue, and how well the unit holds a garrison. */
  endurance: (a: Attrs): number => ratio(a.grit + a.nerve / 2, 10),
};

/** Duels: stance reading and stamina. */
export const duel = {
  /** Stamina: how many exchanges before the duellist tires. */
  stamina: (a: Attrs): number => Math.round(6 + a.grit / 3),
  /** Seconds the opponent's stance stays readable before they commit. */
  read: (a: Attrs): number => clamp(0.6 + a.wits / 40, 0.6, 2),
  /** Damage of a landed blow. */
  blow: (a: Attrs): number => ratio(Math.max(a.might, a.finesse), 7),
  /** Chance a taunt or plea lands mid-duel, before the other side's nerve. */
  sway: (a: Attrs, foe: Attrs): number => clamp(0.5 * ratio(a.presence, foe.nerve), 0.05, 0.95),
};

/** Jobs at Thornwick: how well someone does a kind of work, as a multiplier on output (1 = an average hand). */
export const JOBS = {
  build: ["might", "grit"], haul: ["might", "grit"], forge: ["might", "finesse"], craft: ["finesse", "wits"],
  brood: ["heart", "wits"], heal: ["heart", "wits"], kith: ["heart", "grit"], cook: ["heart", "finesse"],
  records: ["wits", "finesse"], research: ["wits", "heart"], trade: ["presence", "wits"], envoy: ["presence", "nerve"],
  scout: ["finesse", "wits"], guard: ["nerve", "grit"], teach: ["presence", "heart"], morale: ["presence", "heart"],
} as const satisfies Record<string, readonly [Attr, Attr]>;
export type Job = keyof typeof JOBS;
export const jobSkill = (a: Attrs, job: Job): number => { const [p, s] = JOBS[job]; return ratio(a[p] * 0.65 + a[s] * 0.35, 7); };

/** Checks in talk, diplomacy and exploring: the chance of passing, against a difficulty on the same scale. */
export function checkChance(a: Attrs, attr: Attr, difficulty: number): number {
  return clamp(0.5 * ratio(a[attr], difficulty) ** 2, 0.05, 0.95);
}
/** A check with a seeded roll. Story-critical checks should offer another way through if they fail. */
export const check = (a: Attrs, attr: Attr, difficulty: number, roll: number): boolean => roll < checkChance(a, attr, difficulty);
