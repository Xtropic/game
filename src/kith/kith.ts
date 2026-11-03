// Kith: species, growth, breeding. Pure data and functions; the pens, fairs and battle screens use these.
// Kith share people's seven attributes (for kith, heart is loyalty and bond, presence is bearing), so the same
// battle, army and check formulas in src/cast/attributes.ts work for both.
import data from "../../data/kith/species.json";
import raising from "../../data/kith/upbringing.json";
import world from "../../data/kith/regions.json";
import { ATTRS, type Attrs } from "../cast/attributes";

export type Kind = "base" | "regional" | "hybrid" | "unseen" | "legend";
export interface Family { name: string; field: string; army: string; growth: number[]; moves: string[]; look?: string; }
export interface Recipe { parents: [string, string]; needs: string[]; hint: string; }
/** `region` is where a base or regional species lives wild (regions.json); a regional form lives nowhere else. */
export interface Species { id: string; name: string; family?: string; kind: Kind; home?: string; region?: string; look?: string; parents?: [string, string]; recipe?: Recipe; moves: string[]; }
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
  /** Coat genes, two of each (one from each parent); the more dominant one shows. Missing: plain, its strain. */
  coat?: Coat;
  /** Its parents' species, which a throwback foal can return to. */
  lineage?: string[];
  /** Generations bred same-species back to back: a pure line. */
  line?: number;
}

// ---- Coats: colour and pattern genes ---------------------------------------------------------------------
// Each kith carries two colour genes and two pattern genes. Earlier entries in regions.json's lists are more
// dominant, so two grey parents can hide cream between them and throw a cream foal. Regions add colours of
// their own: wild kith caught there carry them.

export interface Coat { colour: [string, string]; pattern: [string, string]; }
export const COLOURS = world.colours as string[];
export const PATTERNS = world.patterns as string[];
const dominant = (list: string[], [a, b]: [string, string]): string => (list.indexOf(a) <= list.indexOf(b) ? a : b);
export const coatOf = (k: Kith): Coat => k.coat ?? { colour: [k.strain, k.strain], pattern: ["plain", "plain"] };
/** What shows: the dominant colour and pattern. */
export const shownCoat = (c: Coat): { colour: string; pattern: string } => ({ colour: dominant(COLOURS, c.colour), pattern: dominant(PATTERNS, c.pattern) });

/** The families a species belongs to (two for a hybrid). */
export function familiesOf(id: string): string[] {
  const s = SPECIES[id]; if (!s) throw new Error(`no kith species ${id}`);
  if (s.family) return [s.family];
  return (s.parents ?? []).map((f) => f);
}

/** Growth per level for a species: its family's (the average of both for a hybrid). */
export function growthOf(id: string): number[] {
  const fams = familiesOf(id).map((f) => FAMILIES[f].growth);
  const kindBoost = { legend: 1.25, unseen: 1.12, regional: 1.06, hybrid: 1.05, base: 1 }[SPECIES[id].kind];
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

export interface Foal {
  species: string; potential: number[]; traits: string[]; moves: string[]; temperament: Temperament; strain: string; carrier: boolean; sport: boolean; unseen: boolean; generation: number;
  coat: Coat; lineage: string[];
  /** Born a regional form because it was bred in that region. */
  form: boolean;
  /** Took after a grandparent's species instead of either parent's. */
  throwback: boolean;
  /** Both parents the same species for generations: the line breeds true and potential rises. */
  trueBred: boolean;
  line: number;
}

interface Region { name: string; kind: string; biome: string; roaming: string[]; colours: string[]; breed: { attr?: string; trait?: string; clean?: boolean; lullScarred?: boolean; note: string }; }
export const REGIONS = world.regions as Record<string, Region>;
export const RULES = world.rules;
/** Species living wild in a region: its natives (found nowhere else if regional) and the kinds that roam there. */
export const nativesOf = (region: string): string[] => Object.values(SPECIES).filter((s) => s.region === region).map((s) => s.id);
export const wildIn = (region: string): string[] => [...new Set([...nativesOf(region), ...(REGIONS[region]?.roaming ?? [])])];
/** The regional forms of a family that a region can give. */
export const formsIn = (family: string, region: string): string[] => Object.values(SPECIES).filter((s) => s.kind === "regional" && s.family === family && s.region === region).map((s) => s.id);

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
    case "song": return !!ctx.song || ctx.place === "vael"; // the Spire Folk sing to every pairing
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
  const { rng } = ctx, wing = ctx.wing ?? 0, region = ctx.place ? REGIONS[ctx.place] : undefined;
  const sport = rng() < SPORT_CHANCE;
  let form = false, throwback = false;

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
    // bred in a region with a form of this family: the foal may take the local form
    const fam = SPECIES[species].family, forms = fam && ctx.place ? formsIn(fam, ctx.place) : [];
    if (forms.length && SPECIES[species].kind !== "regional") {
      const inForm = [a, b].filter((k) => forms.includes(k.species)).length;
      if (rng() < (inForm === 2 ? 1 : inForm === 1 ? RULES.formFromForm : RULES.formChance)) { species = forms.find((f) => f === a.species || f === b.species) ?? pick(rng, forms); form = true; }
    }
    // now and then a foal takes after a grandparent instead
    const back = [...(a.lineage ?? []), ...(b.lineage ?? [])].filter((x) => SPECIES[x] && SPECIES[x].kind !== "legend" && x !== a.species && x !== b.species);
    if (!form && back.length && rng() < RULES.throwbackChance) { species = pick(rng, back); throwback = true; }
  }

  // potential: the parents' average, nudged; a good breeding wing and a sport help, a true-bred line rises,
  // and a region's breeders favour one attribute
  const lineGen = RULES.trueBreedGeneration - (ctx.place === "salt-house" ? 1 : 0);
  const pure = a.species === b.species && a.species === species, line = pure ? Math.min(a.line ?? 0, b.line ?? 0) + 1 : 0;
  const trueBred = pure && line > lineGen;
  const lullNerve = !!region?.breed.lullScarred && [a, b].some((k) => k.lull || k.traits.includes("lull-scarred"));
  const potential = ATTRS.map((attr, i) => {
    let p = (a.potential[i] + b.potential[i]) / 2 + (rng() - 0.5) * 0.9 + wing * 0.12 + (trueBred ? RULES.trueBreedBonus : 0);
    if (rng() < 0.08 + wing * 0.03) p += 1;
    if (sport && rng() < 0.5) p += 1;
    if (region?.breed.attr === attr && rng() < RULES.bonusChance) p += 1;
    if (lullNerve && attr === "nerve" && rng() < 0.5) p += 1;
    return Math.max(1, Math.min(5, Math.round(p)));
  });

  // traits: up to three from the parents; the bone sickness shows only if both carry it
  const sick = (k: Kith) => k.traits.includes("bone-sickness") || !!k.carrier;
  const pool = [...new Set([...a.traits, ...b.traits])].filter((t) => t !== "bone-sickness" && !(lullNerve && t === "lull-scarred"));
  const traits: string[] = [];
  for (const t of pool) if (traits.length < 3 && rng() < 0.45 + wing * 0.1) traits.push(t);
  let carrier = false;
  if (sick(a) && sick(b)) { if (rng() < 0.5) traits.unshift("bone-sickness"); else carrier = true; }
  else if (sick(a) || sick(b)) carrier = rng() < 0.5;
  if (region?.breed.clean) { carrier = false; const i = traits.indexOf("bone-sickness"); if (i >= 0) traits.splice(i, 1); }
  if (sport) { const rare = Object.keys(TRAITS).filter((t) => t !== "bone-sickness" && !traits.includes(t)); traits.push(pick(rng, rare)); }
  const local = region?.breed.trait;
  if (local && !traits.includes(local) && rng() < 0.45) traits.unshift(local);

  // moves: the species' first, plus one inherited from each parent that the species doesn't learn itself
  const own = movesAt(species, 1), inherit = (k: Kith) => k.moves.filter((m) => !SPECIES[species].moves.includes(m));
  const moves = [...own];
  for (const k of [a, b]) { const m = inherit(k); if (m.length) moves.push(pick(rng, m)); }

  const temperament = rng() < 0.7 ? (rng() < 0.5 ? a.temperament : b.temperament) : pick(rng, TEMPERAMENTS);
  // coat: one colour gene and one pattern gene from each parent; a sport changes one of them
  const ca = coatOf(a), cb = coatOf(b), gene = (x: [string, string]) => x[rng() < 0.5 ? 0 : 1];
  const coat: Coat = { colour: [gene(ca.colour), gene(cb.colour)], pattern: [gene(ca.pattern), gene(cb.pattern)] };
  if (sport) { if (rng() < 0.5) coat.colour[rng() < 0.5 ? 0 : 1] = pick(rng, COLOURS); else coat.pattern[rng() < 0.5 ? 0 : 1] = pick(rng, PATTERNS.slice(3)); }
  const strain = shownCoat(coat).colour;
  return { species, potential, traits: traits.slice(0, 4), moves: [...new Set(moves)], temperament, strain, carrier, sport, unseen: SPECIES[species].kind === "unseen", generation: Math.max(a.generation, b.generation) + 1, coat, lineage: [a.species, b.species], form, throwback, trueBred, line };
}

/** A litter: usually one foal, sometimes twins, more often when both parents are deeply bonded. */
export function breedLitter(a: Kith, b: Kith, ctx: BreedContext): Foal[] {
  const first = breed(a, b, ctx); if (!first) return [];
  const twinChance = RULES.twinChance + (a.bond >= 80 && b.bond >= 80 ? RULES.twinBondBonus : 0);
  if (ctx.rng() >= twinChance) return [first];
  const second = breed(a, b, ctx)!;
  return [first, { ...second, species: first.species, form: first.form, throwback: first.throwback, unseen: first.unseen, moves: first.moves }];
}

/** A new kith from a foal. */
export const foalToKith = (f: Foal, id: string, name: string): Kith => ({ id, name, species: f.species, level: 1, xp: 0, potential: f.potential, trained: ATTRS.map(() => 0), traits: f.traits, moves: f.moves, temperament: f.temperament, strain: f.strain, bond: 0, carrier: f.carrier, generation: f.generation, coat: f.coat, lineage: f.lineage, line: f.line });

/** A wild kith as caught: average potential, maybe wearing a lull. Caught in a region, it carries local colours. */
export function wildKith(species: string, level: number, rng: () => number, id = species, region?: string): Kith {
  const local = region ? REGIONS[region]?.colours ?? [] : [];
  const colour = (): string => (local.length && rng() < 0.6 ? pick(rng, local) : pick(rng, STRAINS));
  const pattern = (): string => (rng() < 0.6 ? "plain" : pick(rng, PATTERNS.slice(1, 6)));
  const coat: Coat = { colour: [colour(), colour()], pattern: [pattern(), pattern()] };
  const potential = ATTRS.map(() => Math.max(1, Math.min(5, Math.round(3 + (rng() - 0.5) * 2))));
  return { id, name: SPECIES[species].name, species, level, xp: 0, potential, trained: ATTRS.map(() => 0), traits: rng() < 0.4 ? [pick(rng, Object.keys(TRAITS).filter((t) => t !== "bone-sickness"))] : [], moves: movesAt(species, level).slice(-4), temperament: pick(rng, TEMPERAMENTS), strain: shownCoat(coat).colour, bond: 0, lull: rng() < 0.35, generation: 0, coat };
}
