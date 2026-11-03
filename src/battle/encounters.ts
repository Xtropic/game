// Fights that aren't written into the story: wild kith on the world map, and Guild patrols on its roads.
// The party is whoever is travelling with the hero; the foes come from the region (its native kith, how
// dangerous it is) and the ground underfoot (which also picks the scenery behind the fight).
import type { BattleDef, UnitDef } from "./rules";
import { TEMPERAMENTS } from "../kith/kith";
import type { TileKind } from "../world/map";
import speciesData from "../../data/kith/species.json";

interface SpeciesRow { id: string; name: string; family: string; region?: string | null; kind: string; }
const SPECIES = (speciesData as unknown as { species: SpeciesRow[] }).species;

/** How tough each region's wild kith and patrols are: [lowest level, highest level]. Far lands are dangerous early. */
export const DANGER: Record<string, [number, number]> = {
  cloudline: [2, 3], "cloud-forest": [2, 4], millbridge: [2, 4], hollin: [3, 4], "kerrow-gorge": [3, 5], "old-drove-road": [3, 5],
  millcities: [4, 6], college: [4, 6], fens: [4, 6], corvane: [5, 7], guild: [6, 8], crown: [6, 8], ashby: [6, 8],
  "high-passes": [7, 9], lorne: [8, 10], drevka: [8, 11], tarsis: [9, 12], "storm-roost": [10, 13], ember: [10, 13], "deep-desert": [11, 14],
  vael: [9, 12], "low-water": [6, 8], osk: [12, 15], "salt-house": [8, 10], "wandering-herd": [10, 13],
};
/** Regions the Guild holds: patrols walk their roads. */
export const GUILD_HELD = new Set(["guild", "millcities", "crown"]);

const COATS: Record<string, string> = { reedcat: "#b8a868", loftbuck: "#9a8a70" };
const REGION_COAT: Record<string, string> = { "cloud-forest": "#8a9a94", "salt-house": "#d8d2c4", ashby: "#c8a050", tarsis: "#8a4a2a", corvane: "#6a6a7a", guild: "#d8d6d0", "old-drove-road": "#8a6a4a", cloudline: "#a8988a", "kerrow-gorge": "#7a6a5a", lorne: "#c8ccd4", "storm-roost": "#5a6070", millbridge: "#b8a868" };

/** The wild kith of a region that can be met in the field (the families with battle figures so far). */
export function wildKinds(region: string): SpeciesRow[] {
  const native = SPECIES.filter((s) => s.region === region && (s.family === "reedcat" || s.family === "loftbuck") && (s.kind === "base" || s.kind === "regional"));
  return native.length ? native : SPECIES.filter((s) => s.id === "reedcat" || s.id === "loftbuck");
}

/** The scenery behind a fight on this ground. */
export function sceneryFor(t: TileKind | null): string {
  switch (t) {
    case "forest": case "cloudwood": case "orchard": return "forest";
    case "snow": case "pines": case "pass": return "snow";
    case "steppe": return "steppe";
    case "sand": case "saltpan": return "sand";
    case "marsh": case "reeds": case "shoal": return "marsh";
    case "road": return "road";
    case "ashrock": return "fire";
    default: return "meadow";
  }
}

export interface Traveller { id: string; name: string; }

// Where each side stands, in stage units: allies on the left, foes on the right.
const ALLY_FRONT: [number, number][] = [[86, 94], [100, 122]], ALLY_BACK: [number, number][] = [[42, 104], [28, 128]];
const FOE_AT: [number, number][] = [[168, 92], [160, 126], [194, 110], [226, 98]];

/** Battle units for the hero and the party travelling with them, in the rows they fight from. */
export function partyUnits(hero: string, party: Traveller[]): UnitDef[] {
  const front = [...ALLY_FRONT], back = [...ALLY_BACK], out: UnitDef[] = [];
  const add = (u: Omit<UnitDef, "at">, row: "front" | "back") => { const at = (row === "front" ? front : back).shift() ?? (row === "front" ? back : front).shift(); if (at) out.push({ ...u, row, at }); };
  if (hero === "rhea") add({ id: "rhea", name: "Rhea", look: "rhea", side: "ally", row: "front", cast: "rhea", skills: ["strike", "sing", "rally"] }, "front");
  for (const p of party) {
    if (p.id === "ash") out.push({ id: "ash", name: "Ash", look: "ash", side: "ally", row: "front", hp: 30, skills: [], kith: true, bonded: "rhea", at: [62, 124] });
    if (p.id === "tamsin") add({ id: "tam", name: "Tamsin", look: "tamsin", side: "ally", row: "back", cast: "tamsin", skills: ["sling", "smoke"] }, "back");
    if (p.id === "brannoc") add({ id: "brannoc", name: "Brannoc", look: "brannoc", side: "ally", row: "front", cast: "brannoc", skills: ["strike", "guard"] }, "front");
    if (p.id === "ferris") add({ id: "ferris", name: "Ferris", look: "ferris", side: "ally", row: "back", cast: "ferris", skills: ["bow", "smoke"] }, "back");
    if (p.id === "ketti") add({ id: "ketti", name: "Ketti", look: "ketti", side: "ally", row: "back", cast: "ketti", skills: ["knife", "smoke"] }, "back");
  }
  return out;
}

/** A chance meeting on the world map: wild kith off the road, or a Guild patrol on a road in Guild country. */
export function encounter(region: string, ground: TileKind | null, hero: string, party: Traveller[], rng: () => number): BattleDef {
  const [lo, hi] = DANGER[region] ?? [3, 5];
  const level = () => lo + Math.floor(rng() * (hi - lo + 1));
  const scenery = sceneryFor(ground);
  const allies = partyUnits(hero, party);
  if (ground === "road" && GUILD_HELD.has(region)) {
    const n = 2 + (rng() < 0.5 ? 1 : 0);
    const foes: UnitDef[] = [];
    for (let i = 0; i < n; i++) { const archer = i === n - 1 && n > 2; const lv = level(); foes.push({ id: `p${i}`, name: archer ? "Warden archer" : "Warden", look: archer ? "archer" : "warden", side: "foe", row: archer ? "back" : "front", cast: archer ? "archer" : "warden", level: lv, skills: [archer ? "bow" : "wstrike"], at: FOE_AT[i] }); }
    return { id: `patrol-${region}`, name: "A Guild patrol", backdrop: scenery, intro: ["Grey coats on the road. A Guild patrol, checking indenture papers.", "They don't ask for yours."], units: [...allies, ...foes], won: "The road is clear", lost: "You get away, just" };
  }
  const kinds = wildKinds(region);
  const kind = kinds[Math.floor(rng() * kinds.length)];
  const n = kind.family === "loftbuck" ? 1 + (rng() < 0.4 ? 1 : 0) : 2 + (rng() < 0.35 ? 1 : 0);
  const coat = REGION_COAT[region] ?? COATS[kind.family];
  const foes: UnitDef[] = [];
  for (let i = 0; i < n; i++) {
    const lv = level();
    foes.push({ id: `k${i}`, name: kind.name, look: `${kind.family}:${coat}`, side: "foe", row: "front", hp: (kind.family === "loftbuck" ? 26 : 16) + lv * 2, level: lv, kith: true, skills: [kind.family === "loftbuck" ? "horns" : "pounce"], at: FOE_AT[i], species: kind.id, temperament: TEMPERAMENTS[Math.floor(rng() * TEMPERAMENTS.length)] });
  }
  const many = n > 1 ? `${n === 2 ? "Two" : "Three"} ${kind.name.toLowerCase()}s` : `A ${kind.name.toLowerCase()}`;
  return { id: `wild-${kind.id}`, name: kind.name, backdrop: scenery, intro: [`${many} ${n > 1 ? "come" : "comes"} out of the ${groundWord(ground)}, hackles up.`, "The foal song can calm a wild kith. Calmed, it may stay, and let you win it over."], units: [...allies, ...foes], won: "The way is clear", lost: "You back away and lose them" };
}

function groundWord(t: TileKind | null): string {
  switch (t) {
    case "forest": case "orchard": return "trees";
    case "cloudwood": return "cloud";
    case "snow": case "pines": return "snow";
    case "marsh": case "reeds": return "reeds";
    case "sand": case "saltpan": return "dunes";
    case "hills": return "hills";
    case "terraces": return "terraces";
    default: return "long grass";
  }
}
