// Kith tournaments (data/kith/tournaments.json). A kith's rank, Yearling to Crown, is earned only by winning an
// event, and each event takes kith of the rank just below its own, so a kith climbs one rung per win. The
// handler doesn't fight: up to two or three of Rhea's kith go into the ring together, round after round, and
// what's left of their health carries from one round to the next. Lose a round and you're out; win the final
// and every kith that went in takes the rank, with the purse and the prize (a second win pays a smaller purse).
// Flags: krank.<kith id> (0..5), won.tourney.<id>.
import data from "../../data/kith/tournaments.json";
import speciesData from "../../data/kith/species.json";
import { TEMPERAMENTS, type Kith, type Temperament } from "./kith";
import type { BattleDef, UnitDef } from "../battle/rules";
import { FITTINGS } from "../gear/weapons";
import { ITEMS } from "../gear/items";

type Flags = Record<string, boolean | number | string>;
export interface Foe { species: string; level: number; name: string; }
export interface Tourney {
  id: string; name: string; where: string; land: string; needs: number; gives: number; fee: number; size: number; blurb: string;
  prize: { coin: number; fitting?: string; item?: string };
  rounds: { name: string; foes: Foe[] }[];
}
export const KITH_RANKS = data.ranks as string[];
export const TOURNEYS = data.events as Tourney[];
export const tourney = (id: string): Tourney | undefined => TOURNEYS.find((t) => t.id === id);

const SPECIES = (speciesData as unknown as { species: { id: string; name: string; family: string }[] }).species;
const familyOf = (sp: string): string => SPECIES.find((s) => s.id === sp)?.family ?? "reedcat";
const COAT: Record<string, string> = { reedcat: "#b8a868", loftbuck: "#9a8a70" };

export const kithRank = (f: Flags, id: string): number => (typeof f[`krank.${id}`] === "number" ? (f[`krank.${id}`] as number) : 0);
export const rankName = (r: number): string => KITH_RANKS[r] ?? KITH_RANKS[0];

/** Which of these kith may enter: the rank just below the event's (higher ranks have outgrown it). */
export function entrants(f: Flags, kith: Record<string, Kith>, t: Tourney, away: (id: string) => boolean = () => false): Kith[] {
  return Object.values(kith).filter((k) => kithRank(f, k.id) === t.needs && !away(k.id) && !k.traits.includes("bone-sickness"));
}

/** Why this team can't go in, or null. */
export function cannotEnter(f: Flags, coin: number, t: Tourney, team: Kith[]): string | null {
  if (!team.length) return "Choose at least one kith to go into the ring.";
  if (team.length > t.size) return `${t.size} kith at most in this ring.`;
  const wrong = team.find((k) => kithRank(f, k.id) !== t.needs);
  if (wrong) return kithRank(f, wrong.id) > t.needs ? `${wrong.name} is ${rankName(kithRank(f, wrong.id))}-ranked: too high for this event.` : `${wrong.name} needs to be ${rankName(t.needs)}-ranked first.`;
  if (coin < t.fee) return `The entry fee is ${t.fee} coin; you have ${coin}.`;
  return null;
}

/** One kith of the team as a battle unit: it fights for itself, the handler only calls from the rope. */
export function kithUnit(k: Kith, at: [number, number]): UnitDef {
  const fam = familyOf(k.species);
  return { id: k.id, name: k.name, look: k.id === "ash" ? "ash" : `${fam}:${COAT[fam] ?? "#9a8a70"}`, side: "ally", row: "front", kith: true, species: k.species, skills: [fam === "loftbuck" ? "horns" : "pounce"], at };
}

const ALLY_AT: [number, number][] = [[86, 94], [100, 122], [112, 104]];
const FOE_AT: [number, number][] = [[168, 92], [160, 126], [194, 110]];

/** The battle for one round. */
export function roundBattle(t: Tourney, round: number, team: Kith[], rng: () => number): BattleDef {
  const r = t.rounds[round];
  const foes: UnitDef[] = r.foes.map((fo, i) => {
    const fam = familyOf(fo.species);
    return { id: `t${i}`, name: fo.name, look: `${fam}:${COAT[fam] ?? "#9a8a70"}`, side: "foe", row: "front", hp: (fam === "loftbuck" ? 26 : 16) + fo.level * 2, level: fo.level, kith: true,
      skills: [fam === "loftbuck" ? "horns" : "pounce"], at: FOE_AT[i], species: fo.species, temperament: TEMPERAMENTS[Math.floor(rng() * TEMPERAMENTS.length)] as Temperament,
 };
  });
  const last = round === t.rounds.length - 1;
  return {
    id: `tourney-${t.id}-${round}`, name: `${t.name}: ${r.name.toLowerCase()}`, backdrop: t.land === "millcities" ? "road" : t.land === "north" ? "snow" : "meadow",
    intro: [`${t.name}, ${r.name.toLowerCase()}. ${r.foes.map((x) => x.name).join(" and ")} come${r.foes.length > 1 ? "" : "s"} into the ring.`,
      round === 0 ? "Your kith fight for themselves here; no handler steps over the rope. Run, and you forfeit." : last ? "Win this and the rank is yours." : "What's left of their strength carries into the next round."],
    units: [...team.slice(0, 3).map((k, i) => kithUnit(k, ALLY_AT[i])), ...foes],
    won: last ? "Champions" : `Through the ${r.name.toLowerCase()}`, lost: "Out of the ring",
  };
}

/** The final is won: ranks, purse and prize. Returns what to say. */
export function champions(f: Flags, t: Tourney, team: Kith[]): { coin: number; lines: string[] } {
  const first = !f[`won.tourney.${t.id}`];
  f[`won.tourney.${t.id}`] = true;
  const lines: string[] = [];
  for (const k of team) { f[`krank.${k.id}`] = Math.max(kithRank(f, k.id), t.gives); }
  lines.push(`${team.map((k) => k.name).join(" and ")} ${team.length > 1 ? "are" : "is"} ${rankName(t.gives)}-ranked now.`);
  const coin = first ? t.prize.coin : Math.round(t.prize.coin / 3);
  lines.push(`The purse: ${coin} coin.`);
  const thing = first ? t.prize.fitting ?? t.prize.item : undefined;
  if (thing) {
    f[`have.${thing}`] = (typeof f[`have.${thing}`] === "number" ? (f[`have.${thing}`] as number) : 0) + 1;
    lines.push(`And the prize, for your pack: ${(FITTINGS[thing]?.name ?? ITEMS[thing]?.name ?? thing).toLowerCase()}.`);
  }
  return { coin, lines };
}
