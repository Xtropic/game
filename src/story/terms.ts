// Words a new player can't be expected to know. The first time one turns up in a line, a short note explains it
// under the dialogue box, and it goes into the notes (J) for later. A note only says what Rhea knows at that
// point: nothing about where the story goes.
export interface Term { id: string; name: string; match: RegExp; note: string; }

export const TERMS: Term[] = [
  { id: "lull", name: "Lull", match: /\blulls?\b/i, note: "A small leech-like creature worn on the side of the neck. While it feeds, it numbs pain. The Guild sells them, and each one dies after about a month, so you need another." },
  { id: "raw", name: "The raw", match: /\bthe raw\b/i, note: "The sickness that comes when a lull drops off and isn't replaced: shaking, sweats and pain, for days." },
  { id: "rings", name: "Rings", match: /\b(round scars|lull rings?|rings on (his|her|the|your) neck|ring scars?|leaves its ring|(eight|nine|ten|eleven|twelve|\d+) rings)\b/i, note: "Each lull leaves a small round scar on the neck when it falls off. People can tell how long someone has worn lulls by counting them." },
  { id: "greenling", name: "Greenling", match: /\bgreenlings?\b/i, note: "A lull bred in Larkfold's warm caves to be weaker than a Guild lull. Wearing weaker and weaker ones lets someone come off lulls without the raw." },
  { id: "guild", name: "The Guild", match: /\bGuild\b/, note: "The trading house that breeds and sells lulls. It owns the lull shops, the carts on the roads and the hatcheries." },
  { id: "warden", name: "Wardens", match: /\bWardens?\b/, note: "The Guild's armed guards, in grey coats." },
  { id: "kith", name: "Kith", match: /\bkith\b/i, note: "The animals of this world. People ride, herd and keep them, and some can be raised to fight beside you." },
  { id: "loftbuck", name: "Loftbuck", match: /\bloftbucks?\b/i, note: "A sure-footed, horned kith that climbs the mountain terraces and carries loads." },
  { id: "reedcat", name: "Reedcat", match: /\breedcats?\b/i, note: "A lean, striped hunting kith with tall ears." },
  { id: "larkfold", name: "Larkfold", match: /\bLarkfold\b/, note: "Rhea's village: terraces and caves high on a mountain, above the clouds, hidden from the valleys below." },
  { id: "cloudpath", name: "The cloud path", match: /\bcloud path\b/i, note: "The hidden trail up through the clouds to Larkfold. Only people from the village know the way." },
  { id: "millbridge", name: "Millbridge", match: /\bMillbridge\b/, note: "A market town in the valley below the mountains, built round a bridge." },
  { id: "brood", name: "Brood", match: /\bbrood\b/i, note: "Young lulls, raised in trays of damp moss." },
  { id: "hatchery", name: "Hatchery", match: /\bhatcher(y|ies)\b/i, note: "A Guild breeding house where lulls are raised. Children work there." },
  { id: "indenture", name: "Indenture", match: /\bindentur(e|es|ed)\b/i, note: "A debt contract. The Guild buys a child's indenture from a family in debt, and the child works for the Guild until it's paid off." },
  { id: "foalsong", name: "The foal song", match: /\bfoal song\b|\bsing for (him|her|it)\b/i, note: "An old Larkfold lullaby. Kith calm down when they hear it. Press Q to sing." },
  { id: "vantry", name: "Vantry", match: /\bVantry\b/, note: "The Guild's city, far down in the lowlands." },
  { id: "commons", name: "The Commons", match: /\bCommons\b/, note: "An army of ordinary people fighting the Guild: miners, farmers, and children taken out of the hatcheries." },
  { id: "section", name: "Section", match: /\bsection\b/i, note: "A squad of eight or nine soldiers in the Commons. A section chooses its own leader." },
  { id: "lorne", name: "Lorne", match: /\bLorne\b/, note: "A country on the far side of the mountain passes." },
  { id: "ostrel", name: "Ostrel", match: /\bOstrel\b/, note: "The country this story takes place in." },
  { id: "sorting", name: "Sorting house", match: /\bsorting house\b/i, note: "Where the Guild decides which work each indentured child is sent to." },
  { id: "reeve", name: "Reeve", match: /\breeve\b/i, note: "The elected head of a town." },
  { id: "drying", name: "Drying house", match: /\bdrying house\b/i, note: "Where Larkfold dries the moss its greenlings are raised on." },
];

/** The first term in `text` the player hasn't been told about yet. */
export function newTerm(text: string, seen: (id: string) => boolean): Term | undefined {
  let best: { t: Term; at: number } | undefined;
  for (const t of TERMS) {
    if (seen(t.id)) continue;
    const m = t.match.exec(text);
    if (m && (!best || m.index < best.at)) best = { t, at: m.index };
  }
  return best?.t;
}
