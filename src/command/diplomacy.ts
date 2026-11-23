// Diplomacy: the nations of Ostrel (data/diplomacy/nations.json) and where the Commons stands with each.
//   Standing   -100..100 (flags standing.<id>), from the nation's start, plus any story trust it follows
//   Envoy      (Lieutenant) someone of the company carries a letter: their presence and wits against the nation's
//              temper. Once each time the story moves on, per nation. Costs 10 coin for the road.
//   Gift       (Lieutenant) coin or supplies, whichever they value; once per stage too
//   Demand     (Captain) lean on them for tribute: coin now, standing lost. If they refuse, it costs more standing
//   Pact       (Captain) when their whole price is met and the way to their land is open: they join the cause;
//              the perk (supplies, coin, shop discount, an allied company for army battles) holds from then on
//   March      (Captain) on a nation at -40 or worse whose land is open: an army battle; won, they're held by force,
//              and give half their perk (no company: an occupied people doesn't send its sons)
// Flags: standing.<id>, envoy.<id> / gift.<id> = stage of the last one, nation.<id> = "pact" | "held" | "".
import data from "../../data/diplomacy/nations.json";
import { wayOpen, GATES } from "../world/gates";
import type { Attrs } from "../cast/attributes";
import type { CompanyDef } from "../army/army";
import { atLeast } from "./ranks";

type Flags = Record<string, boolean | number | string>;

export interface Nation {
  id: string; name: string; seat: string; land: string; known: string; blurb: string;
  start: number; temper: number; likes: "coin" | "supplies";
  /** A story flag whose value adds to the standing (millbridgeTrust). */
  trust?: string;
  enemy?: boolean;
  price: { standing: number; coin?: number; supplies?: number; flags?: { flag: string; text: string }[]; text: string; or?: { flag: string; eq: string | number | boolean; text: string } };
  perk?: { supplies?: number; coin?: number; discount?: { shops: string[]; pct: number }; company?: { name: string; kind: CompanyDef["kind"]; level: number }; text: string };
  march?: string;
}
export const NATIONS = data.nations as unknown as Nation[];
export const nation = (id: string): Nation | undefined => NATIONS.find((n) => n.id === id);

const num = (f: Flags, k: string): number => (typeof f[k] === "number" ? (f[k] as number) : 0);
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const stageAt = (s: string): number => GATES.order.indexOf(s);
export const ENVOY_COST = 10;
export const GIFT = { coin: 40, supplies: 15 } as const;
export const HOSTILE = -40;

export function known(f: Flags, n: Nation): boolean { return stageAt(String(f.stage ?? "")) >= stageAt(n.known); }
export function knownNations(f: Flags): Nation[] { return NATIONS.filter((n) => known(f, n)); }
export function standing(f: Flags, n: Nation): number {
  if (n.enemy) return -100;
  const base = typeof f[`standing.${n.id}`] === "number" ? (f[`standing.${n.id}`] as number) : n.start;
  return clamp(Math.round(base + (n.trust ? num(f, n.trust) : 0)), -100, 100);
}
function shift(f: Flags, n: Nation, by: number): number {
  const base = typeof f[`standing.${n.id}`] === "number" ? (f[`standing.${n.id}`] as number) : n.start;
  f[`standing.${n.id}`] = clamp(base + by, -100 - (n.trust ? num(f, n.trust) : 0), 100 - (n.trust ? num(f, n.trust) : 0));
  return standing(f, n);
}
export const fate = (f: Flags, n: Nation): "pact" | "held" | "" => (f[`nation.${n.id}`] === "pact" ? "pact" : f[`nation.${n.id}`] === "held" ? "held" : "");
export function mood(v: number): string {
  return v >= 60 ? "Friends" : v >= 30 ? "Warm" : v >= 5 ? "Listening" : v > -20 ? "Wary" : v > HOSTILE ? "Cold" : "Hostile";
}

/** Their land is one the Commons can reach: the Cloudline always; any other once a way into it is open. */
export function reachable(f: Flags, land: string): boolean {
  if (land === "cloudline") return true;
  return Object.keys(GATES.ways).some((w) => w.split("-").includes(land) && wayOpen(w, f));
}

/** What still stands between the Commons and a pact. Empty means it can be sealed. */
export function owed(f: Flags, coin: number, n: Nation): string[] {
  if (n.enemy) return [n.price.text];
  if (n.price.or && f[n.price.or.flag] === n.price.or.eq) return [];
  const out: string[] = [];
  if (!reachable(f, n.land)) out.push(`The way to ${n.seat} isn't open yet.`);
  const s = standing(f, n); if (s < n.price.standing) out.push(`Standing ${n.price.standing} (now ${s}).`);
  if (n.price.coin && coin < n.price.coin) out.push(`${n.price.coin} coin (you have ${coin}).`);
  if (n.price.supplies && num(f, "supplies") < n.price.supplies) out.push(`${n.price.supplies} supplies at Thornwick (the stores hold ${num(f, "supplies")}).`);
  for (const p of n.price.flags ?? []) if (!f[p.flag]) out.push(p.text);
  return out;
}

export interface Envoy { id: string; name: string; attrs: Attrs; }
/** The best of the company to send: presence first, then wits. */
export function bestEnvoy(pool: Envoy[]): Envoy | undefined {
  return [...pool].sort((a, b) => b.attrs.presence * 2 + b.attrs.wits - (a.attrs.presence * 2 + a.attrs.wits))[0];
}

export type Result = { ok: boolean; text: string; coin?: number };
const stage = (f: Flags): string => String(f.stage ?? "");

export function canTalk(f: Flags, n: Nation): string | null {
  if (n.enemy) return "No envoy of yours would come back from Vantry.";
  if (!atLeast(f, "Lieutenant")) return "Only an officer can send envoys: a lieutenant or above.";
  if (fate(f, n) === "held") return `${n.name} is held by force. Nobody there will talk to you.`;
  return null;
}

/** An envoy carries a letter. Presence and wits against their temper, with a little luck. */
export function sendEnvoy(f: Flags, coin: number, n: Nation, envoy: Envoy, rng: () => number): Result {
  const no = canTalk(f, n); if (no) return { ok: false, text: no };
  if (f[`envoy.${n.id}`] === stage(f)) return { ok: false, text: `Your last envoy to ${n.name} is barely back. Let the story move on first.` };
  if (coin < ENVOY_COST) return { ok: false, text: `The road costs ${ENVOY_COST} coin; you have ${coin}.` };
  f[`envoy.${n.id}`] = stage(f);
  const skill = envoy.attrs.presence * 0.7 + envoy.attrs.wits * 0.3;
  const d = Math.round(clamp(3 + (skill - n.temper) * 0.9 + (rng() - 0.5) * 8, -6, 15));
  const now = shift(f, n, d);
  const text = d >= 8 ? `${envoy.name} comes back from ${n.seat} pleased with the welcome. (+${d}, now ${now})`
    : d > 0 ? `${envoy.name} was heard out at ${n.seat}, politely. (+${d}, now ${now})`
    : d === 0 ? `${envoy.name} waited three days at ${n.seat} and was sent home with nothing. (now ${now})`
    : `${envoy.name} said the wrong thing at ${n.seat}, and they remember it. (${d}, now ${now})`;
  return { ok: true, text, coin: coin - ENVOY_COST };
}

/** A gift of what they value. Once a stage, or it starts to look like buying them. */
export function sendGift(f: Flags, coin: number, n: Nation): Result {
  const no = canTalk(f, n); if (no) return { ok: false, text: no };
  if (f[`gift.${n.id}`] === stage(f)) return { ok: false, text: `Another gift so soon would look like buying them.` };
  if (n.likes === "coin") {
    if (coin < GIFT.coin) return { ok: false, text: `A gift worth giving is ${GIFT.coin} coin; you have ${coin}.` };
    f[`gift.${n.id}`] = stage(f); const now = shift(f, n, 9);
    return { ok: true, text: `${GIFT.coin} coin goes to ${n.seat}, with your thanks. (+9, now ${now})`, coin: coin - GIFT.coin };
  }
  if (num(f, "supplies") < GIFT.supplies) return { ok: false, text: `A gift worth giving is ${GIFT.supplies} supplies; Thornwick's stores hold ${num(f, "supplies")}.` };
  f[`gift.${n.id}`] = stage(f); f.supplies = num(f, "supplies") - GIFT.supplies; const now = shift(f, n, 10);
  return { ok: true, text: `${GIFT.supplies} supplies go by cart to ${n.seat}. (+10, now ${now})`, coin };
}

/** Lean on them: tribute now, standing lost. A refusal costs more. */
export function demand(f: Flags, coin: number, n: Nation, hero: Attrs, rng: () => number): Result {
  const no = canTalk(f, n); if (no) return { ok: false, text: no };
  if (!atLeast(f, "Captain")) return { ok: false, text: "Only a captain can make demands of a nation." };
  if (fate(f, n) === "pact") return { ok: false, text: `${n.name} is your ally. Making demands of them now would break the pact.` };
  if (f[`demand.${n.id}`] === stage(f)) return { ok: false, text: `You've only just leaned on ${n.name}.` };
  f[`demand.${n.id}`] = stage(f);
  const odds = clamp(0.35 + (hero.presence + hero.nerve * 0.5 - n.temper * 1.2) * 0.03, 0.1, 0.85);
  if (rng() < odds) {
    const pay = 30 + Math.round(n.temper * 2), now = shift(f, n, -20);
    return { ok: true, text: `${n.name} pays, ${pay} coin, and hates you for it. (-20, now ${now})`, coin: coin + pay };
  }
  const now = shift(f, n, -30);
  return { ok: true, text: `${n.name} refuses, and sends your rider back on foot. (-30, now ${now})`, coin };
}

/** Seal a pact: the price is paid and they join the cause. */
export function sealPact(f: Flags, coin: number, n: Nation): Result {
  const no = canTalk(f, n); if (no) return { ok: false, text: no };
  if (!atLeast(f, "Captain")) return { ok: false, text: "A pact is made by a captain or above." };
  if (fate(f, n) === "pact") return { ok: false, text: `${n.name} is already your ally.` };
  const left = owed(f, coin, n); if (left.length) return { ok: false, text: `Not yet. Still owed: ${left.join(" ")}` };
  const viaStory = !!(n.price.or && f[n.price.or.flag] === n.price.or.eq);
  if (!viaStory && n.price.supplies) f.supplies = num(f, "supplies") - n.price.supplies;
  f[`nation.${n.id}`] = "pact";
  if (standing(f, n) < 60) shift(f, n, 60 - standing(f, n));
  return { ok: true, text: `${n.name} joins the cause. ${n.perk?.text ?? ""}`.trim(), coin: viaStory ? coin : coin - (n.price.coin ?? 0) };
}

/** Whether marching on them is open, and if not, why. */
export function canMarch(f: Flags, n: Nation): string | null {
  if (n.enemy) return "The war with the Guild is fought in the story, not from the war table.";
  if (!atLeast(f, "Captain")) return "Only a captain can lead the Commons against a nation.";
  if (fate(f, n) === "held") return `${n.name} is already held.`;
  if (fate(f, n) === "pact") return `${n.name} is your ally.`;
  if (!n.march) return `There's no way to bring an army to ${n.seat} yet.`;
  if (!reachable(f, n.land)) return `The way to ${n.seat} isn't open yet.`;
  if (standing(f, n) > HOSTILE) return `Nobody would follow you against ${n.name} while they're only ${mood(standing(f, n)).toLowerCase()}. It takes open hostility (${HOSTILE} or worse).`;
  return null;
}

/** After a march: won, they're held; lost, they're bolder and the Commons is poorer. */
export function marched(f: Flags, coin: number, n: Nation, won: boolean): Result {
  if (won) { f[`nation.${n.id}`] = "held"; shift(f, n, -20); return { ok: true, text: `${n.name} is held by the Commons now. They'll pay what they must, and no more.`, coin }; }
  shift(f, n, -10);
  const lost = Math.round(coin * 0.2);
  return { ok: true, text: `Thrown back from ${n.seat}. The dead have to be paid for: ${lost} coin.`, coin: coin - lost };
}

/** What every pact and every held nation gives each time the story moves on. */
export function tribute(f: Flags): { coin: number; supplies: number } {
  let coin = 0, supplies = 0;
  for (const n of NATIONS) {
    const fa = fate(f, n); if (!fa || !n.perk) continue;
    const k = fa === "pact" ? 1 : 0.5;
    coin += Math.floor((n.perk.coin ?? 0) * k) + (fa === "held" ? Math.floor(n.temper / 3) : 0);
    supplies += Math.floor((n.perk.supplies ?? 0) * k);
  }
  return { coin, supplies };
}

/** Price after any pact discount at this stall (whole coins, at least 1). */
export function priceAt(f: Flags, shop: string, price: number): number {
  let pct = 0;
  for (const n of NATIONS) if (fate(f, n) === "pact" && n.perk?.discount?.shops.includes(shop)) pct = Math.max(pct, n.perk.discount.pct);
  return Math.max(1, Math.round(price * (1 - pct / 100)));
}

/** Allied companies from pacts, strongest first, for an army battle. */
export function allies(f: Flags): { nation: string; name: string; kind: CompanyDef["kind"]; level: number }[] {
  return NATIONS.filter((n) => fate(f, n) === "pact" && n.perk?.company).map((n) => ({ nation: n.id, ...n.perk!.company! })).sort((a, b) => b.level - a.level);
}
