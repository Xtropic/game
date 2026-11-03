// Kith: species, growth, breeding. Pure data and functions; the pens, fairs and battle screens use these.
// Kith share people's seven attributes (for kith, heart is loyalty and bond, presence is bearing), so the same
// battle, army and check formulas in src/cast/attributes.ts work for both.
import data from "../../data/kith/species.json";
import raising from "../../data/kith/upbringing.json";
import { ATTRS, type Attrs } from "../cast/attributes";

export type Kind = "base" | "hybrid" | "unseen" | "legend";
export interface Family { name: string; field: string; army: string; growth: number[]; moves: string[]; }
export interface Recipe { parents: [string, string]; needs: string[]; hint: string; }
export interface Species { id: string; name: string; family?: string; kind: Kind; home?: string; parents?: [string, string]; recipe?: Recipe; moves: string[]; }
export type Temperament = "bold" | "gentle" | "stubborn" | "skittish" | "proud" | "curious";

export const FAMILIES = data.families as Record<string, Family>;
export const SPECIES: Record<string, Species> = Object.fromEntries((data.species as Species[]).map((s) => [s.id, s]));
export const TRAITS = data.traits as Record<string, string>;
export const TEMPERAMENTS = data.temperaments as Temperament[];
export const STRAINS = data.strains as string[];
export const MAX_KITH_LEVEL = 50;

/** One kith the player owns. */
export interface Kith {
  id: string; name: string; species: string;
  level: number; xp: number;
  /** Potential for each attribute, 1 to 5 stars, in ATTRS order. Bred lines improve it over generations. */
  potential: number[];
  /** Extra points from drills at Thornwick, in ATTRS order, capped by potential. */
  trained: number[];
  traits: string[]; moves: string[]; temperament: Temperament; strain: string;
  /** 0..100 with its partner. */
  bond: number;
  /** Carries the bone sickness without showing it. */
  carrier?: boolean;
  /** Wearing a wild lull: calmer, dulled. */
  lull?: boolean;
  generation: number;
  /** How it has been raised lately (feed, work, pen, battles, handler), in ATTRS order. See upbringing.ts. */
  habits?: number[];
  /** Points its upbringing has added or taken away, in ATTRS order; whole points count. Capped by potential. */
  shaped?: number[];
}

/** The families a species belongs to (two for a hybrid). */
export function familiesOf(id: string): string[] {
  const s = SPECIES[id]; if (!s) throw new Error(`no kith species ${id}`);
  if (s.family) return [s.family];
  return (s.parents ?? []).map((f) => f);
}

/** Growth per level for a species: its family's (the average of both for a hybrid). */
export function growthOf(id: string): number[] {
  const fams = familiesOf(id).map((f) => FAMILIES[f].growth);
  const kindBoost = SPECIES[id].kind === "legend" ? 1.25 : SPECIES[id].kind === "unseen" ? 1.12 : SPECIES[id].kind === "hybrid" ? 1.05 : 1;
  return ATTRS.map((_, i) => (fams.reduce((n, g) => n + g[i], 0) / fams.length) * kindBoost);
}

export type Stage = "foal" | "yearling" | "adult" | "elder";
export const stageOf = (level: number): Stage => (level < 10 ? "foal" : level < 20 ? "yearling" : level < 40 ? "adult" : "elder");

/** Attributes at the kith's level: growth scaled by potential (3 stars = species normal), plus training. */
export function kithAttrs(k: Kith): Attrs {
  const g = growthOf(k.species), stage = stageOf(k.level), out = {} as Attrs;
  ATTRS.forEach((a, i) => {
    let v = 4 + Math.floor(g[i] * (0.7 + 0.1 * k.potential[i]) * (k.level - 1) + 1e-9) + (k.trained[i] ?? 0) + Math.trunc((k.shaped?.[i] ?? 0) + 1e-9);
    if (stage === "elder") v += a === "wits" || a === "heart" ? Math.floor((k.level - 39) / 3) : a === "might" || a === "finesse" ? -Math.floor((k.level - 39) / 4) : 0;
    if (k.traits.includes("heavy-frame")) v += a === "might" || a === "grit" ? 2 : a === "finesse" ? -2 : 0;
    if (k.traits.includes("deep-chest") && a === "grit") v += 2;
    if (k.traits.includes("bright-eyed") && a === "wits") v += 2;
    if (k.traits.includes("big-voice") && a === "presence") v += 2;
    if (k.lull) v += a === "nerve" ? 2 : a === "heart" ? 0 : -2; // a wild lull: calm and dull
    out[a] = Math.max(1, v);
  });
  return out;
}

/** What the kith would be at its level if nobody had steered or drilled it: the baseline its looks change from. */
export const kithBaseline = (k: Kith): Attrs => kithAttrs({ ...k, shaped: undefined, trained: ATTRS.map(() => 0), lull: false });

/** Training cap for an attribute: more stars, more room to train. */
export const trainCap = (stars: number): number => 2 + stars * 2;

/** How far upbringing can push an attribute: up to this many points, and down to SHAPE_FLOOR. */
export const shapeCap = (stars: number): number => 2 + stars * 2;
export const SHAPE_FLOOR = -4;
const R = raising as unknown as { shapePerLevel: number; decay: number; temperamentBias: Record<string, number[]> };

/**
 * One level of growth following the kith's habits: a share of growth goes where its upbringing pulls, a
 * little is taken from what it pulls against, then the habits fade so recent life matters most.
 * An unsteered kith (no habits) grows exactly as its species and potential say.
 */
export function shapeLevel(k: Kith): void {
  const h = (k.habits ?? ATTRS.map(() => 0)).map((x, i) => x + (R.temperamentBias[k.temperament]?.[i] ?? 0));
  const pos = h.map((x) => Math.max(0, x)), neg = h.map((x) => Math.max(0, -x));
  const sp = pos.reduce((a, b) => a + b, 0), sn = neg.reduce((a, b) => a + b, 0);
  const shaped = k.shaped ?? ATTRS.map(() => 0);
  if (sp + sn > 0.5) ATTRS.forEach((_, i) => {
    const d = R.shapePerLevel * (pos[i] / (sp || 1)) - 0.5 * R.shapePerLevel * (neg[i] / (sp + sn));
    shaped[i] = Math.max(SHAPE_FLOOR, Math.min(shapeCap(k.potential[i]), shaped[i] + d));
  });
  k.shaped = shaped;
  if (k.habits) k.habits = k.habits.map((x) => x * R.decay);
}

export const kithXpToNext = (level: number): number => 30 + 15 * level;
export function addKithXp(k: Kith, amount: number): number[] {
  const levels: number[] = []; k.xp += Math.max(0, Math.round(amount));
  while (k.level < MAX_KITH_LEVEL && k.xp >= kithXpToNext(k.level)) { k.xp -= kithXpToNext(k.level); k.level++; shapeLevel(k); levels.push(k.level); }
  if (k.level >= MAX_KITH_LEVEL) k.xp = 0;
  return levels;
}

/** Moves a species learns by level: one every 6 levels from 1. */
export const movesAt = (species: string, level: number): string[] => SPECIES[species].moves.filter((_, i) => level >= 1 + i * 6);

// ---- Breeding ---------------------------------------------------------------------------------------------

export interface BreedContext {
  rng: () => number;
  place?: string; // "thornwick", "hatchery", "osk", "greenling-caves"...
  season?: "spring" | "summer" | "autumn" | "winter";
  moonlit?: boolean;
  /** The breeder sang to the pair (Rhea's foal song). */
  song?: boolean;
  items?: string[];
  /** Thornwick's breeding wing level, 0..3: more stars and traits pass on. */
  wing?: number;
}

export interface Foal { species: string; potential: number[]; traits: string[]; moves: string[]; temperament: Temperament; strain: string; carrier: boolean; sport: boolean; unseen: boolean; generation: number; }

const pick = <T>(rng: () => number, xs: T[]): T => xs[Math.floor(rng() * xs.length) % xs.length];
const both = (a: string, b: string, x: string, y: string): boolean => (a === x && b === y) || (a === y && b === x);
/** Matches a recipe parent: a species id or, for a hybrid recipe, a family id. */
const isOf = (species: string, want: string): boolean => species === want || (SPECIES[species]?.family === want && !SPECIES[want]);

/** Which families can cross, and the hybrid each pair makes. */
export function hybridFor(famA: string, famB: string): string | undefined {
  return Object.values(SPECIES).find((s) => s.kind === "hybrid" && s.parents && both(famA, famB, s.parents[0], s.parents[1]))?.id;
}

/** Whether a pair can breed, and why not. */
export function canBreed(a: Kith, b: Kith): { ok: boolean; why?: string } {
  if (a.id === b.id) return { ok: false, why: "A kith can't breed with itself." };
  if (stageOf(a.level) === "foal" || stageOf(a.level) === "yearling" || stageOf(b.level) === "foal" || stageOf(b.level) === "yearling") return { ok: false, why: "Both need to be grown." };
  if (SPECIES[a.species].kind === "legend" || SPECIES[b.species].kind === "legend") return { ok: false, why: "Legends don't breed." };
  const fa = familiesOf(a.species), fb = familiesOf(b.species);
  if (fa.some((f) => fb.includes(f))) return { ok: true };
  if (fa.length === 1 && fb.length === 1 && hybridFor(fa[0], fb[0])) return { ok: true };
  return { ok: false, why: "These two won't take to each other." };
}

function meetsNeed(need: string, a: Kith, b: Kith, ctx: BreedContext): boolean {
  const [k, v] = need.split(":");
  switch (k) {
    case "moonlit": return !!ctx.moonlit;
    case "song": return !!ctx.song;
    case "elders": return stageOf(a.level) === "elder" && stageOf(b.level) === "elder";
    case "trait": return a.traits.includes(v) || b.traits.includes(v);
    case "item": return !!ctx.items?.includes(v);
    case "place": return ctx.place === v;
    case "season": return ctx.season === v;
    case "bond": return a.bond >= 100 && b.bond >= 100;
    case "sport": return false; // checked separately: a rare birth
    default: return false;
  }
}

/** Unseen kith whose recipe this pair and setting meet. */
export function unseenFor(a: Kith, b: Kith, ctx: BreedContext): Species[] {
  return Object.values(SPECIES).filter((s) => s.kind === "unseen" && s.recipe
    && ((isOf(a.species, s.recipe.parents[0]) && isOf(b.species, s.recipe.parents[1])) || (isOf(b.species, s.recipe.parents[0]) && isOf(a.species, s.recipe.parents[1])))
    && s.recipe.needs.every((n) => n === "sport" || meetsNeed(n, a, b, ctx)));
}

export const SPORT_CHANCE = 1 / 50;

/** Breeds two kith. Returns the foal, or null if they can't breed. */
export function breed(a: Kith, b: Kith, ctx: BreedContext): Foal | null {
  if (!canBreed(a, b).ok) return null;
  const { rng } = ctx, wing = ctx.wing ?? 0;
  const sport = rng() < SPORT_CHANCE;

  // species: an unseen recipe first (sport-only recipes need a sport), then a hybrid, then a parent's species
  const unseen = unseenFor(a, b, ctx).filter((s) => !s.recipe!.needs.includes("sport") || sport);
  let species: string;
  if (unseen.length) species = pick(rng, unseen).id;
  else {
    const fa = familiesOf(a.species), fb = familiesOf(b.species);
    const cross = fa.length === 1 && fb.length === 1 && fa[0] !== fb[0] ? hybridFor(fa[0], fb[0]) : undefined;
    if (cross) species = cross;
    else {
      const sa = a.potential.reduce((n, x) => n + x, 0), sb = b.potential.reduce((n, x) => n + x, 0);
      species = rng() < sa / (sa + sb) ? a.species : b.species; // the stronger parent's line is likelier
    }
  }

  // potential: the parents' average, nudged; a good breeding wing and a sport help
  const potential = ATTRS.map((_, i) => {
    let p = (a.potential[i] + b.potential[i]) / 2 + (rng() - 0.5) * 0.9 + wing * 0.12;
    if (rng() < 0.08 + wing * 0.03) p += 1;
    if (sport && rng() < 0.5) p += 1;
    return Math.max(1, Math.min(5, Math.round(p)));
  });

  // traits: up to three from the parents; the bone sickness shows only if both carry it
  const sick = (k: Kith) => k.traits.includes("bone-sickness") || !!k.carrier;
  const pool = [...new Set([...a.traits, ...b.traits])].filter((t) => t !== "bone-sickness");
  const traits: string[] = [];
  for (const t of pool) if (traits.length < 3 && rng() < 0.45 + wing * 0.1) traits.push(t);
  let carrier = false;
  if (sick(a) && sick(b)) { if (rng() < 0.5) traits.unshift("bone-sickness"); else carrier = true; }
  else if (sick(a) || sick(b)) carrier = rng() < 0.5;
  if (sport) { const rare = Object.keys(TRAITS).filter((t) => t !== "bone-sickness" && !traits.includes(t)); traits.push(pick(rng, rare)); }

  // moves: the species' first, plus one inherited from each parent that the species doesn't learn itself
  const own = movesAt(species, 1), inherit = (k: Kith) => k.moves.filter((m) => !SPECIES[species].moves.includes(m));
  const moves = [...own];
  for (const k of [a, b]) { const m = inherit(k); if (m.length) moves.push(pick(rng, m)); }

  const temperament = rng() < 0.7 ? (rng() < 0.5 ? a.temperament : b.temperament) : pick(rng, TEMPERAMENTS);
  const strain = sport ? pick(rng, STRAINS.filter((s) => s !== a.strain && s !== b.strain)) : rng() < 0.5 ? a.strain : b.strain;
  return { species, potential, traits: traits.slice(0, 4), moves: [...new Set(moves)], temperament, strain, carrier, sport, unseen: SPECIES[species].kind === "unseen", generation: Math.max(a.generation, b.generation) + 1 };
}

/** A new kith from a foal. */
export const foalToKith = (f: Foal, id: string, name: string): Kith => ({ id, name, species: f.species, level: 1, xp: 0, potential: f.potential, trained: ATTRS.map(() => 0), traits: f.traits, moves: f.moves, temperament: f.temperament, strain: f.strain, bond: 0, carrier: f.carrier, generation: f.generation });

/** A wild kith as caught: average potential, maybe wearing a lull. */
export function wildKith(species: string, level: number, rng: () => number, id = species): Kith {
  const potential = ATTRS.map(() => Math.max(1, Math.min(5, Math.round(3 + (rng() - 0.5) * 2))));
  return { id, name: SPECIES[species].name, species, level, xp: 0, potential, trained: ATTRS.map(() => 0), traits: rng() < 0.4 ? [pick(rng, Object.keys(TRAITS).filter((t) => t !== "bone-sickness"))] : [], moves: movesAt(species, level).slice(-4), temperament: pick(rng, TEMPERAMENTS), strain: pick(rng, STRAINS), bond: 0, lull: rng() < 0.35, generation: 0 };
}
