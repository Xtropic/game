// Upbringing: how the player steers a kith without spending points. What it eats, where it sleeps, what
// work it does, who tends it and how it fights all pull on its attributes. Pulls build up as habits, and at
// each level up a share of its growth follows them (shapeLevel in kith.ts). The player sees the direction
// in words and in the kith's body (src/art/build.ts), never as numbers to assign.
import data from "../../data/kith/upbringing.json";
import { ATTRS, type Attr, type Attrs } from "../cast/attributes";
import { kithAttrs, movesAt, shapeCap, SHAPE_FLOOR, type Kith } from "./kith";

export type SourceKind = "feed" | "work" | "pen" | "battle" | "lull";
export interface Source { kind: SourceKind; name: string; pull: number[]; hint: string; }

export const SOURCES = data.sources as Record<string, Source>;
const TEMPER = data.temperament as Record<string, number>;
const HINTS = data.hints as Record<Attr, [string, string]>;
const zero = (): number[] => ATTRS.map(() => 0);

export const sourcesOf = (kind: SourceKind): string[] => Object.keys(SOURCES).filter((id) => SOURCES[id].kind === kind);

/** Adds a pull to the kith's habits. A stubborn kith takes less of it, a curious one more. */
export function nurture(k: Kith, source: string, amount = 1): void {
  const s = SOURCES[source]; if (!s) throw new Error(`no upbringing source ${source}`);
  const f = (TEMPER[k.temperament] ?? 1) * amount, h = k.habits ?? zero();
  k.habits = h.map((x, i) => x + s.pull[i] * f);
}

/** The pull of a handler: their two strongest attributes rub off. Their heart builds bond. */
export function handlerPull(a: Attrs): number[] {
  const top = [...ATTRS].sort((x, y) => a[y] - a[x]).slice(0, 2);
  return ATTRS.map((k) => (top.includes(k) ? data.handler.pull : 0));
}

export interface Day { feed?: string; pen?: string; work?: string; handler?: Attrs; }

/** One day at Thornwick or on the road: the feed, pen and work chosen for this kith, and who tended it. */
export function raiseDay(k: Kith, d: Day): void {
  if (d.feed) nurture(k, d.feed, 0.5);
  if (d.pen) nurture(k, d.pen, 0.3);
  if (d.work) nurture(k, d.work, 0.5);
  if (d.handler) {
    const p = handlerPull(d.handler), f = TEMPER[k.temperament] ?? 1;
    k.habits = (k.habits ?? zero()).map((x, i) => x + p[i] * f * 0.5);
    k.bond = Math.min(100, k.bond + Math.max(0, d.handler.heart - 4) / 12);
  }
}

/** What a battle taught each kith that fought in it, from the deeds the battle tallied. */
export function learnFromBattle(k: Kith, deeds: Record<string, number> = {}): void {
  for (const [deed, n] of Object.entries(deeds)) if (SOURCES[`battle:${deed}`]) nurture(k, `battle:${deed}`, Math.min(4, n) * 0.6);
}

/**
 * How the kith is changing, in words: the strongest pulls in its habits, plus where its upbringing has
 * already taken it as far as it can. This is what the pen screen and a handler say about it.
 */
export function readKith(k: Kith): string[] {
  const out: string[] = [], h = k.habits ?? zero();
  const order = ATTRS.map((a, i) => ({ a, i, v: h[i] })).sort((x, y) => Math.abs(y.v) - Math.abs(x.v));
  for (const { a, i, v } of order.slice(0, 2)) {
    if (Math.abs(v) < 0.6) continue;
    const s = k.shaped?.[i] ?? 0;
    if (v > 0 && s >= shapeCap(k.potential[i]) - 0.01) out.push(`${k.name} has gone as far that way as it can (${a}).`);
    else if (v < 0 && s <= SHAPE_FLOOR + 0.01) continue;
    else out.push(`${k.name} ${HINTS[a][v > 0 ? 0 : 1]}.`);
  }
  if (!out.length) out.push(`${k.name} is growing the way its kind does.`);
  return out;
}

/** The kith's attributes now, for the build and for battle. */
export const attrsOfKith = (k: Kith): Attrs => kithAttrs(k);

/** Ash: Rhea's bonded loftbuck at the start of the game. */
export const starterAsh = (): Kith => ({
  id: "ash", name: "Ash", species: "loftbuck", level: 5, xp: 0, potential: [3, 4, 3, 3, 2, 4, 3], trained: zero(),
  traits: ["sure-footed", "loyal"], moves: movesAt("loftbuck", 5), temperament: "stubborn", strain: "grey", bond: 60, generation: 0,
});
