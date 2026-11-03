// Winning a wild kith over. Rhea doesn't trap kith; the Guild does that. Most wild kith are won in a fight:
// the foal song calms one until it stops and stays at the edge of the field, then Rhea offers it food and its
// temperament decides whether it trusts her. A few shy kith never fight at all: they bolt when anyone comes
// near, and only come to bait they like, left by someone who then keeps still.
import { SPECIES, type Temperament } from "./kith";

/** What each family will come to. The right food matters far more than anything else on offer. */
export const FOOD: Record<string, string> = {
  loftbuck: "salt lick", reedcat: "dried fish", mistwing: "beetle cake", ironback: "root mash", delver: "grubs",
  wadeskin: "pond weed", strider: "dates", hearthling: "honey bread", treeloper: "cloudfruit", brineback: "kelp",
  gloamer: "cave moss", bellower: "sweet hay",
};
/** The foods Rhea carries, in the order she offers them. */
export const OFFERS = ["salt lick", "dried fish", "honey bread", "cave moss"];

export const familyOf = (species: string): string => SPECIES[species]?.family ?? species;
export const foodFor = (species: string): string => FOOD[familyOf(species)] ?? "honey bread";

/**
 * How well the song reaches a kith of this temperament (a multiplier on calm), or 0 when it won't listen yet:
 * a proud kith ignores a song while it is winning, and only listens once it has been beaten down below half.
 */
export function songReach(t: Temperament | undefined, hpLeft: number): number {
  switch (t) {
    case "gentle": return 1.3;
    case "curious": return 1.15;
    case "skittish": return 0.7;
    case "stubborn": return 0.8;
    case "proud": return hpLeft <= 0.5 ? 1.1 : 0;
    default: return 1;
  }
}

const BASE: Record<Temperament, number> = { gentle: 0.55, curious: 0.5, bold: 0.4, skittish: 0.3, stubborn: 0.25, proud: 0.35 };

/** The chance a calmed kith trusts Rhea when she offers `food`. `heart` is her heart attribute; `perfects` the song's perfect notes. */
export function trustChance(species: string, t: Temperament | undefined, food: string, heart: number, perfects: number): number {
  const right = food === foodFor(species);
  const p = (BASE[t ?? "bold"] ?? 0.4) + (right ? 0.35 : -0.25) + Math.min(0.15, perfects * 0.04) + Math.max(-0.1, Math.min(0.15, (heart - 10) * 0.015));
  return Math.max(0.03, Math.min(0.95, p));
}

/** What Rhea sees when a calmed kith hasn't gone far: a hint about what it wants, without saying it outright. */
export function lingerLine(species: string): string {
  const name = SPECIES[species]?.name.toLowerCase() ?? "kith";
  const hint: Record<string, string> = {
    "salt lick": "It keeps licking at the bare rock, where salt has dried.",
    "dried fish": "Its nose goes up whenever the wind comes off the water.",
    "beetle cake": "It snaps at the beetles in the grass.",
    "root mash": "It roots at the ground with its snout.",
    grubs: "It scratches at a rotten log.",
    "pond weed": "It keeps looking back at the water.",
    dates: "It noses at the dry palm husks.",
    "honey bread": "It sniffs at your pack, where the bread is.",
    cloudfruit: "It reaches up into the branches.",
    kelp: "It chews at the wrack on the stones.",
    "cave moss": "It edges towards the shade under the rocks.",
    "sweet hay": "It tears at a tuft of dry grass and spits it out.",
  };
  return `The ${name} hasn't gone far. It watches you from the edge of the field. ${hint[foodFor(species)] ?? ""}`.trim();
}
