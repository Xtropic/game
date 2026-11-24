// Kith expeditions from Thornwick (data/kith/expeditions.json). A kith staying at Thornwick can be sent off with
// a drover on one expedition at a time. Each has one stated goal: a rare thing to bring back (a fitting) or a
// technique to learn (a trait). It takes some days (each time the story moves on is a day), and the kith is away
// meanwhile. On its return its attribute is measured against the expedition: it gets better at that either way,
// and gains experience; the goal is met only on a pass, and only the first time.
// Flags: exp.<kith id> = "<expedition id>:<days left>", exp.done.<expedition id>.
import data from "../../data/kith/expeditions.json";
import { ATTRS, type Attr } from "../cast/attributes";
import { TRAITS, addKithXp, kithAttrs, trainCap, type Kith } from "./kith";

type Flags = Record<string, boolean | number | string>;
export interface Expedition { id: string; name: string; land: string; days: number; test: Attr; hard: number; minLevel: number; text: string; goal: { trait?: string; fitting?: string; text: string }; }
export const EXPEDITIONS = data.expeditions as Expedition[];
export const expedition = (id: string): Expedition | undefined => EXPEDITIONS.find((e) => e.id === id);

export function away(f: Flags, kithId: string): { exp: Expedition; left: number } | undefined {
  const v = f[`exp.${kithId}`]; if (typeof v !== "string" || !v) return undefined;
  const [id, left] = v.split(":"), exp = expedition(id);
  return exp ? { exp, left: Number(left) } : undefined;
}
export const awayIds = (f: Flags): string[] => Object.keys(f).filter((k) => k.startsWith("exp.") && !k.startsWith("exp.done.") && f[k]).map((k) => k.slice(4));

/** The odds of meeting the goal, from the tested attribute against how hard it is (and a curious kith finds more). */
export function odds(k: Kith, e: Expedition): number {
  const a = kithAttrs(k)[e.test] + (k.traits.includes("curious") ? 2 : 0);
  return Math.max(0.1, Math.min(0.95, 0.5 + (a - e.hard) * 0.08));
}

export function cannotSend(f: Flags, k: Kith, e: Expedition, reachable: boolean): string | null {
  if (away(f, k.id)) return `${k.name} is already away.`;
  if (!reachable) return `The way there isn't open yet.`;
  if (k.level < e.minLevel) return `${k.name} needs to be level ${e.minLevel} for this.`;
  if (k.traits.includes("bone-sickness")) return `${k.name} can't make a hard journey.`;
  if (e.goal.trait && k.traits.includes(e.goal.trait) && f[`exp.done.${e.id}`]) return `${k.name} already knows this.`;
  return null;
}
export function send(f: Flags, k: Kith, e: Expedition): void { f[`exp.${k.id}`] = `${e.id}:${e.days}`; }

/** A day passes: kith on the road come nearer home; those back report. */
export function expeditionDay(f: Flags, kith: Record<string, Kith>, rng: () => number): string[] {
  const out: string[] = [];
  for (const id of awayIds(f)) {
    const a = away(f, id), k = kith[id];
    if (!a || !k) { delete f[`exp.${id}`]; continue; }
    if (a.left > 1) { f[`exp.${id}`] = `${a.exp.id}:${a.left - 1}`; continue; }
    delete f[`exp.${id}`];
    const e = a.exp, pass = rng() < odds(k, e), i = ATTRS.indexOf(e.test);
    if (k.trained[i] < trainCap(k.potential[i])) k.trained[i] += 1;
    addKithXp(k, 40 + e.hard * 4);
    if (pass && e.goal.trait && !k.traits.includes(e.goal.trait)) {
      k.traits.push(e.goal.trait); f[`exp.done.${e.id}`] = true;
      out.push(`${k.name} is back from ${e.name.toLowerCase()}, and has learned something: ${e.goal.trait} (${TRAITS[e.goal.trait] ?? ""}). Its ${e.test} has grown.`);
    } else if (pass && e.goal.fitting) {
      f[`have.${e.goal.fitting}`] = (typeof f[`have.${e.goal.fitting}`] === "number" ? (f[`have.${e.goal.fitting}`] as number) : 0) + 1; f[`exp.done.${e.id}`] = true;
      out.push(`${k.name} is back from ${e.name.toLowerCase()} with what it went for. Its ${e.test} has grown.`);
    } else out.push(`${k.name} is back from ${e.name.toLowerCase()} empty-handed, but stronger for it: its ${e.test} has grown.`);
  }
  return out;
}
