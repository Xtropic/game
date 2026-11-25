// Kith care and training at Thornwick (data/kith/training.json).
//
//   Care      every kith has energy (0..100) and spirits (0..100). Drills and hard pen work tire it; a rest day, or a
//             night in the pens, brings energy back. Spirits drift back toward content, rise with good sessions and
//             time spent with it, and fall with poor ones. Low spirits shrink what a session teaches.
//   Time      once a day the player can spend time with a kith staying at Thornwick: bond and spirits.
//   Drills    one per attribute. A drill set for a kith is a standing order: it runs each day the kith has the
//             energy, resolved by the keeper (autoScore, which tops out at Good). The player can attend instead and
//             play it (ui/trainingScene.ts): the score from the mini game decides the grade, and only an attended
//             session reaches Great or Perfect. A first Perfect in a drill teaches its technique (a trait).
//   Bone sickness  a carrier driven hard while tired may wake it. A good keeper sees the signs first.
//
// Flags: drill.<kith id> = drill id (standing order), drilled.<kith id> = the base day it last trained,
// time.<kith id> = the base day the player last spent time with it, perfect.<drill>.<kith id> once taught.
import data from "../../data/kith/training.json";
import { ATTRS, type Attr } from "../cast/attributes";
import { TRAITS, addKithXp, kithAttrs, trainCap, type Kith } from "./kith";

type Flags = Record<string, boolean | number | string>;
export type GameKind = "heave" | "carry" | "ledges" | "drums" | "cups" | "call" | "show";
export interface Drill { id: string; name: string; game: GameKind; attr: Attr; side: Attr; pens: number; energy: number; trait: string; mood: string; backdrop: string; text: string; how: string; }
export interface Grade { id: "poor" | "fair" | "good" | "great" | "perfect"; name: string; min: number; points: number; spirits: number; }

export const DRILLS = data.drills as Drill[];
export const GRADES = data.grades as Grade[];
export const CARE = data.care;
export const drill = (id: string): Drill | undefined => DRILLS.find((d) => d.id === id);

const num = (f: Flags, k: string): number => { const v = f[k]; return typeof v === "number" ? v : 0; };
const today = (f: Flags): number => num(f, "base.day");
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
/** Physical drills: what a carrier of the bone sickness must not be driven through while tired. */
const HARD = new Set<Attr>(["might", "grit", "finesse"]);

// ---- care ---------------------------------------------------------------------------------------------------

export const energyOf = (k: Kith): number => k.energy ?? 100;
export const spiritsOf = (k: Kith): number => k.spirits ?? 60;
export const spiritsWord = (s: number): string => (s >= 80 ? "bright" : s >= 60 ? "content" : s >= 40 ? "flat" : s >= 20 ? "low" : "miserable");
export const energyWord = (e: number): string => (e >= 80 ? "fresh" : e >= 55 ? "ready" : e >= 30 ? "tired" : "spent");

/** Has the player spent time with this kith today? */
export const hadTimeToday = (f: Flags, id: string): boolean => f[`time.${id}`] === today(f) && f[`time.${id}`] !== undefined;

/** The player spends time with a kith: brushing, walking, play. Once a day. Returns what happened, or why not. */
export function spendTime(f: Flags, k: Kith): { ok: boolean; line: string } {
  if (hadTimeToday(f, k.id)) return { ok: false, line: `You've already spent time with ${k.name} today.` };
  f[`time.${k.id}`] = today(f);
  const gentle = k.traits.includes("gentle") ? 1.5 : 1;
  k.bond = Math.min(100, k.bond + CARE.timeBond * gentle);
  k.spirits = Math.min(100, spiritsOf(k) + CARE.timeSpirits);
  const how: Record<string, string> = {
    bold: `${k.name} wants to wrestle more than be brushed. You let it win, mostly.`,
    gentle: `${k.name} leans its whole weight into the brush and closes its eyes.`,
    stubborn: `${k.name} pretends not to care, then follows you to the gate.`,
    skittish: `${k.name} takes a long while to come close. When it does, it stays.`,
    proud: `${k.name} stands to be brushed like it's owed. Its coat comes up gleaming.`,
    curious: `${k.name} goes through your pockets, finds the dried berry, looks pleased with itself.`,
  };
  return { ok: true, line: how[k.temperament] ?? `${k.name} settles beside you for a while.` };
}

/**
 * A night at Thornwick: energy comes back (most on a rest day), spirits drift back toward content. The work in its
 * pen plan tires it a little; a kith that trained today recovers less.
 */
export function careNight(f: Flags, k: Kith, work: string): void {
  const trained = f[`drilled.${k.id}`] === today(f);
  const gain = work === "work:rest" ? CARE.restEnergy : CARE.workEnergy;
  k.energy = clamp(energyOf(k) + (trained ? gain * 0.6 : gain), 0, 100);
  const s = spiritsOf(k);
  k.spirits = clamp(s + (CARE.spiritsRest - s) * CARE.drift + (work === "work:rest" ? 2 : 0), 0, 100);
}

/** What a good keeper says about a carrier before the sickness shows. */
export function keeperWarning(k: Kith, keeperSkill: number): string | undefined {
  if (!k.carrier || k.traits.includes("bone-sickness") || keeperSkill < CARE.keeperSees) return undefined;
  return `Something in how ${k.name} moves worries the keeper. Don't drive it hard while it's tired.`;
}

// ---- drills -------------------------------------------------------------------------------------------------

export const drillOf = (f: Flags, id: string): Drill | undefined => { const v = f[`drill.${id}`]; return typeof v === "string" && v ? drill(v) : undefined; };
export function setDrill(f: Flags, id: string, d: string | null): void { if (d) f[`drill.${id}`] = d; else delete f[`drill.${id}`]; }
export const drilledToday = (f: Flags, id: string): boolean => f[`drilled.${id}`] === today(f) && f[`drilled.${id}`] !== undefined;
/** Drills open at a pens level. */
export const drillsAt = (pensLevel: number): Drill[] => DRILLS.filter((d) => d.pens <= pensLevel);

/** Why this kith can't train this drill now, or null. */
export function cannotTrain(f: Flags, k: Kith, d: Drill, pensLevel: number): string | null {
  if (d.pens > pensLevel) return `The pens need building up first (${["the rope corral", "the pens", "the breeding wing"][d.pens]}).`;
  if (drilledToday(f, k.id)) return `${k.name} has trained today. Let a day pass.`;
  if (k.traits.includes("bone-sickness") && HARD.has(d.attr)) return `${k.name} can't take hard drills now. Gentle ones only.`;
  if (energyOf(k) < d.energy) return `${k.name} is too tired (${energyWord(energyOf(k))}). Let it rest.`;
  return null;
}

/** The grade a score earns. */
export const gradeOf = (score: number): Grade => [...GRADES].reverse().find((g) => score >= g.min) ?? GRADES[0];

/** How well a session goes with only the keeper watching: the kith's attribute against its level, the keeper's skill
 *  and its spirits. Never better than Good: the big gains need Rhea there. */
export function autoScore(k: Kith, d: Drill, keeperSkill: number, roll: number): number {
  const a = kithAttrs(k)[d.attr], par = 6 + k.level * 0.9;
  const s = 0.38 + (a - par) * 0.02 + keeperSkill * 0.08 + (spiritsOf(k) - 50) / 600 + (roll - 0.5) * 0.12;
  return clamp(s, 0.15, 0.62);
}

/** How much the player's skill is helped by the kith itself: a strong kith makes its drill a little easier.
 *  0 (struggling) to 1 (well beyond its level). The mini games widen windows and slow things with it. */
export function aptitude(k: Kith, d: Drill): number {
  const a = kithAttrs(k)[d.attr], par = 6 + k.level * 0.9;
  return clamp(0.5 + (a - par) * 0.05, 0, 1);
}

export interface Outcome {
  grade: Grade; score: number; attended: boolean;
  /** Attribute points from drilling, by attribute. */
  gains: Partial<Record<Attr, number>>;
  xp: number; levels: number[]; bond: number;
  /** A technique learned (first Perfect in this drill). */
  trait?: string;
  /** The bone sickness woke. */
  sick?: boolean;
  /** An attribute already as far as drills can take it. */
  capped?: Attr;
  lines: string[];
}

/** One session of a drill, attended or not. Changes the kith and the flags; returns what happened. */
export function train(f: Flags, k: Kith, d: Drill, score: number, attended: boolean, rng: () => number): Outcome {
  score = clamp(score, 0, 1);
  if (!attended) score = Math.min(score, 0.62);
  const grade = gradeOf(score), lines: string[] = [], gains: Partial<Record<Attr, number>> = {};
  const before = energyOf(k), spirits = spiritsOf(k);
  // low spirits take a point off; it still learns something
  let points = grade.points - (spirits < 30 && grade.points > 0 ? 1 : 0);
  const give = (a: Attr, n: number): number => {
    const i = ATTRS.indexOf(a), room = trainCap(k.potential[i]) - (k.trained[i] ?? 0), got = Math.max(0, Math.min(room, n));
    k.trained[i] = (k.trained[i] ?? 0) + got; if (got) gains[a] = (gains[a] ?? 0) + got;
    return n > 0 && room <= 0 ? -1 : got;
  };
  let capped: Attr | undefined;
  if (give(d.attr, points) < 0) capped = d.attr;
  if (grade.points >= 2 && give(d.side, 1) < 0 && !capped) capped = d.side;
  points = Object.values(gains).reduce((a, b) => a + (b ?? 0), 0);
  // its habits lean the drill's way, so its next levels grow that way too
  const hi = ATTRS.indexOf(d.attr), h = k.habits ?? ATTRS.map(() => 0);
  h[hi] += 0.4 + score * 0.6; k.habits = h;
  const xp = Math.round((20 + 60 * score) * (0.6 + spirits / 125) * (attended ? 1.25 : 1));
  const levels = addKithXp(k, xp);
  const bond = attended ? Math.round((2 + score * 3) * 10) / 10 : 0;
  k.bond = Math.min(100, k.bond + bond);
  k.energy = clamp(before - d.energy, 0, 100);
  k.spirits = clamp(spirits + grade.spirits + (attended ? 3 : 0), 0, 100);
  f[`drilled.${k.id}`] = today(f);
  let trait: string | undefined;
  if (grade.id === "perfect" && attended && !f[`perfect.${d.id}.${k.id}`]) {
    f[`perfect.${d.id}.${k.id}`] = true;
    if (!k.traits.includes(d.trait)) { k.traits.push(d.trait); trait = d.trait; }
  }
  let sick = false;
  if (k.carrier && !k.traits.includes("bone-sickness") && HARD.has(d.attr) && before < CARE.sickBelow && rng() < CARE.sickRisk) {
    k.traits.push("bone-sickness"); sick = true;
  }
  // the words
  const g = Object.entries(gains).map(([a, n]) => `${a} +${n}`).join(", ");
  lines.push(`${k.name}: ${grade.name}. ${g ? `Drilled ${g}.` : grade.points ? "" : "It learned a little, no more."}`.trim());
  if (capped) lines.push(`${k.name}'s ${capped} is as far as drills can take it. Levels will do the rest.`);
  if (spirits < 30 && grade.points > 0) lines.push(`${k.name}'s spirits are low, and it showed.`);
  if (trait) lines.push(`${k.name} learned a technique: ${trait.replace(/-/g, " ")} (${TRAITS[trait] ?? ""}).`);
  if (levels.length) lines.push(`${k.name} reached level ${levels[levels.length - 1]}.`);
  if (sick) lines.push(`${k.name} comes up lame at the end of it and won't put its weight down. The bone sickness it carried has woken.`);
  return { grade, score, attended, gains, xp, levels, bond, trait, sick, capped, lines };
}

/**
 * A day at Thornwick: every kith with a standing drill that hasn't trained today trains under the keeper, if it has
 * the energy; then the night restores it. `work` is each kith's pen work. Returns report lines.
 */
export function trainingDay(f: Flags, kith: Kith[], work: (id: string) => string, pensLevel: number, keeperSkill: number, rng: () => number): string[] {
  const out: string[] = [];
  for (const k of kith) {
    const d = drillOf(f, k.id);
    if (d && !drilledToday(f, k.id)) {
      const no = cannotTrain(f, k, d, pensLevel);
      if (!no) { const o = train(f, k, d, autoScore(k, d, keeperSkill, rng()), false, rng); out.push(o.lines[0]); if (o.sick) out.push(o.lines[o.lines.length - 1]); }
      else if (energyOf(k) < d.energy) out.push(`${k.name} rested instead of drilling: too tired.`);
    }
    careNight(f, k, work(k.id));
  }
  return out;
}
