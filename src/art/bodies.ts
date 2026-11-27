// Bodies: every character has their own shape, and it is the same on the map and in battle. The map frames
// for each body are composed by tools/art/people.py; the battle art scales its figure by the same shape.
// A body is how someone is made; their build (src/art/build.ts) is what their attributes have done to it since.
export type BodyKind = "average" | "slim" | "tall" | "broad" | "heavy" | "short" | "huge" | "small";

/** How the battle figure is scaled: width, height, limb thickness, and a rounded middle. */
export const BODY_SHAPE: Record<BodyKind, { w: number; h: number; limb: number; belly: number }> = {
  average: { w: 1, h: 1, limb: 1, belly: 0 },
  slim: { w: 0.86, h: 1.01, limb: 0.86, belly: 0 },
  tall: { w: 0.9, h: 1.1, limb: 0.92, belly: 0 },
  broad: { w: 1.18, h: 1, limb: 1.2, belly: 0 },
  heavy: { w: 1.2, h: 0.94, limb: 1.15, belly: 1 },
  short: { w: 1.02, h: 0.88, limb: 1, belly: 0 },
  huge: { w: 1.22, h: 1.1, limb: 1.28, belly: 0.3 },
  small: { w: 0.9, h: 0.82, limb: 0.85, belly: 0 },
};

/** Who is built how. Anyone not listed is of average build. */
export const BODIES: Record<string, BodyKind> = {
  rhea: "slim", corran: "tall", tamsin: "slim", finch: "small", halloran: "broad", lisle: "slim",
  maren: "short", rook: "heavy", oda: "short", pell: "tall", sela: "small", hessa: "slim",
  brannoc: "huge", kane: "broad", varro: "tall", ketti: "small", ferris: "tall", oren: "heavy",
  warden: "average", archer: "slim", cartwarden: "broad", reeve: "tall", soldier: "average",
  elder: "short", elder2: "slim", folk: "average", folk2: "heavy",
  vil1: "heavy", vil2: "average", vil3: "tall", vil4: "broad", vil5: "slim", vil6: "short", vil7: "average",
  kid: "small", kid2: "small", kid3: "small",
  "nurse": "short", "child": "small", "rider": "slim", "carter": "heavy", "innkeeper": "average", "factor": "slim", "smuggler": "average", "davin": "short", "warden2": "broad", "runner": "small", "camprunner": "slim", "hm-gatherer": "average", "hm-widow": "short", "hm-boy": "small", "ds-keeper": "average", "ds-seller": "slim", "ds-girl": "small", "mf-herder": "average", "mf-old": "short", "kr-smith": "huge", "kr-mother": "average", "kr-ferry": "average", "rb-ropemaker": "tall", "rb-girl": "small", "rb-lookout": "tall", "wb-miller": "heavy", "wb-fisher": "slim", "wb-child": "small", "dh-host": "huge", "dh-drover": "average", "lb-keeper": "tall", "lb-farmer": "broad", "lb-boy": "small", "woman": "slim",
  oakes: "broad", lyle: "slim", dorrit: "average", hesk: "average", ume: "small", posy: "small", tobin: "tall",
};
export const bodyOf = (id: string): BodyKind => BODIES[id] ?? "average";
