// Builds: how a body looks given its attributes. The same seven attributes that decide fights decide the
// shape the battle art draws and which portrait is shown, so a character or kith visibly becomes what it
// is turning into: a kith fed and worked heavy fills out, one raised for scouting goes lean and long-legged,
// a lull-wearer's neck rings climb, someone in the raw greys out.
//
// Each value says how far an attribute has moved against a baseline, relative to how far the whole body
// has moved: a kith against how its kind would have grown unsteered, a person against who they were when
// the story met them. So a level-40 kith is not simply bigger, and what shows is how it has been shaped.
// Values run -1..1 (0 = as designed); rings is a count.
import { ATTRS, type Attrs } from "../cast/attributes";

export interface Build {
  /** Weight and frame: grit and might. Wider torso and body. */
  bulk: number;
  /** Muscle: might. Thicker limbs and neck. */
  brawn: number;
  /** Reach and leanness: finesse. Longer, slimmer limbs. */
  reach: number;
  /** Steadiness: nerve. A planted stance, less fidgeting. */
  poise: number;
  /** Keenness: wits. Narrower, brighter eyes. */
  keen: number;
  /** Warmth: heart. Softer brows, colour in the face; a glossy coat on kith. */
  warmth: number;
  /** Bearing: presence. Taller carriage, chin up; bigger horns, crest or ears on kith. */
  bearing: number;
  /** Wear: scars and weathering, from grit and level. 0..1. */
  worn: number;
  /** Lull rings on the neck (people) or the lull's mark (kith): 0 = none. */
  rings: number;
  /** In the raw (withdrawal): pallor, shadows under the eyes, a hunch. */
  raw: boolean;
}

export const EVEN: Build = { bulk: 0, brawn: 0, reach: 0, poise: 0, keen: 0, warmth: 0, bearing: 0, worn: 0, rings: 0, raw: false };

const clamp = (x: number, lo = -1, hi = 1): number => Math.max(lo, Math.min(hi, x));

export interface BuildOptions { level?: number; mods?: string[]; rings?: number; /** What "as designed" is; without one, the body's own average. */ baseline?: Attrs; }

/** The build for a set of attributes. `mods` are the attribute mods in force (lull, raw...). */
export function buildOf(a: Attrs, o: BuildOptions = {}): Build {
  const mean = ATTRS.reduce((n, k) => n + a[k], 0) / ATTRS.length, base = o.baseline;
  const growth = base ? ATTRS.reduce((n, k) => n + a[k] + 4, 0) / ATTRS.reduce((n, k) => n + base[k] + 4, 0) : 1;
  const rel = (k: keyof Attrs): number => base ? clamp(((a[k] + 4) / (base[k] + 4) / growth - 1) * 3.2) : clamp(((a[k] - mean) / (mean + 4)) * 2.2);
  const mods = o.mods ?? [];
  return {
    bulk: clamp(rel("grit") * 0.6 + rel("might") * 0.4),
    brawn: rel("might"),
    reach: rel("finesse"),
    poise: rel("nerve"),
    keen: rel("wits"),
    warmth: rel("heart"),
    bearing: rel("presence"),
    worn: clamp(((o.level ?? 1) / 60) * 0.6 + Math.max(0, rel("grit")) * 0.4, 0, 1),
    rings: o.rings ?? (mods.includes("lull") || mods.includes("raw") ? 1 : 0),
    raw: mods.includes("raw"),
  };
}

/**
 * Painted portraits come in variants for the states that change a face most. The game asks for the most
 * specific one that exists and falls back to the plain portrait: e.g. ["corran@raw", "corran@ringed", "corran"].
 */
export function portraitKeys(id: string, b: Build): string[] {
  const keys: string[] = [];
  if (b.raw) keys.push(`${id}@raw`);
  if (b.rings >= 3) keys.push(`${id}@ringed`);
  if (b.worn >= 0.55) keys.push(`${id}@hardened`);
  if (b.bulk >= 0.45) keys.push(`${id}@heavy`);
  if (b.bulk <= -0.45 || b.reach >= 0.55) keys.push(`${id}@lean`);
  keys.push(id);
  return keys;
}

/** The first of `keys` that has art, or undefined. */
export const pickPortrait = (keys: string[], has: (k: string) => boolean): string | undefined => keys.find(has);
