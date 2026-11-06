// Keepsake weapons: each character keeps one weapon and has it reforged at Thornwick through five tiers
// (Worn, Mended, Tempered, Masterwork, Named), choosing a branch at Masterwork. Two fitting slots, a working
// part and a charm, tune it. Fittings are what money, loot and prizes buy. See "The Lull: Weapons and Kith".
import data from "../../data/gear/weapons.json";
import { ATTRS, jobSkill, type Attr, type Attrs } from "../cast/attributes";

export interface Branch { id: string; name: string; note: string; }
export interface Keepsake { name: string; type: string; branches: Branch[]; techniques: string[]; }
export interface Fitting { slot: "work" | "charm"; name: string; mods: Partial<Record<Attr, number>>; timing?: number; bond?: number; vsWardens?: number; note?: string; /** Only this character can carry it. */ only?: string; }
export interface Tier { name: string; power: number; forge: number; cost: number; }
/** What a character carries: the tier their keepsake has reached, its branch, and its fittings. */
export interface Loadout { tier: number; branch?: string; work?: string; charm?: string; }

export const TYPES = data.types as Record<string, { name: string; drive: Attr }>;
export const TIERS = data.tiers as Tier[];
export const KEEPSAKES = data.keepsakes as Record<string, Keepsake>;
export const FITTINGS = data.fittings as Record<string, Fitting>;
export const NAMED = TIERS.length - 1, MASTERWORK = TIERS.length - 2;

export const keepsake = (id: string): Keepsake | undefined => KEEPSAKES[id];

/** The keepsake's name at its tier: the branch's name from Masterwork on. */
export function weaponName(id: string, l: Loadout): string {
  const k = KEEPSAKES[id]; if (!k) return "";
  const b = l.tier >= MASTERWORK ? k.branches.find((x) => x.id === l.branch) : undefined;
  return `${TIERS[l.tier].name} ${b ? b.name : k.name}`;
}

/** Battle techniques the keepsake has unlocked: one per tier above Worn. */
export const techniques = (id: string, l: Loadout): string[] => (KEEPSAKES[id]?.techniques ?? []).slice(0, l.tier);

const fittings = (l: Loadout): Fitting[] => [l.work, l.charm].filter((x): x is string => !!x).map((f) => { const x = FITTINGS[f]; if (!x) throw new Error(`no fitting ${f}`); return x; });

/** Attributes with the loadout's fittings applied. */
export function withGear(a: Attrs, l: Loadout): Attrs {
  const out = { ...a };
  for (const f of fittings(l)) for (const k of ATTRS) out[k] = Math.max(1, out[k] + (f.mods[k] ?? 0));
  return out;
}

/** Damage multiplier from the weapon's tier. */
export const weaponPower = (l: Loadout): number => TIERS[Math.max(0, Math.min(NAMED, l.tier))].power;
/** Extra timing window and kith bond gain from fittings. */
export const gearTiming = (l: Loadout): number => fittings(l).reduce((m, f) => m * (f.timing ?? 1), 1);
export const gearBond = (l: Loadout): number => fittings(l).reduce((m, f) => m * (f.bond ?? 1), 1);

/** Checks a fitting fits the slot it is put in. */
export function fits(fitting: string, slot: "work" | "charm"): boolean { return FITTINGS[fitting]?.slot === slot; }

export interface ReforgeCheck { ok: boolean; why?: string; cost: number; }
/**
 * Whether a keepsake can go up a tier: the forge must be built that far, the Named tier needs its story moment,
 * Masterwork needs a branch chosen. The smith's forge skill (might and finesse) lowers the cost.
 */
export function canReforge(l: Loadout, opts: { forgeLevel: number; coin: number; smith?: Attrs; named?: boolean; branch?: string }): ReforgeCheck {
  const next = l.tier + 1;
  if (next > NAMED) return { ok: false, why: "It can't be improved further.", cost: 0 };
  const t = TIERS[next], skill = opts.smith ? jobSkill(opts.smith, "forge") : 1;
  const cost = Math.round(t.cost / Math.max(0.6, Math.min(1.6, skill)));
  if (opts.forgeLevel < t.forge) return { ok: false, why: "Thornwick's forge isn't built up enough yet.", cost };
  if (next === MASTERWORK && !opts.branch && !l.branch) return { ok: false, why: "Choose which way the weapon goes.", cost };
  if (next === NAMED && !opts.named) return { ok: false, why: "A Named weapon needs its story first.", cost };
  if (opts.coin < cost) return { ok: false, why: "Not enough coin.", cost };
  return { ok: true, cost };
}

export function reforge(l: Loadout, opts: Parameters<typeof canReforge>[1]): { loadout: Loadout; cost: number } {
  const c = canReforge(l, opts); if (!c.ok) throw new Error(c.why);
  return { loadout: { ...l, tier: l.tier + 1, branch: l.branch ?? opts.branch }, cost: c.cost };
}

// ---- Changing fittings (the menu) ------------------------------------------------------------------------

type Flags = Record<string, boolean | number | string>;
const have = (flags: Flags, f: string): number => { const n = flags[`have.${f}`]; return typeof n === "number" ? n : 0; };

/** How many of a fitting are lying spare: owned (have.<id>) less those fitted to someone's weapon. */
export function spare(flags: Flags, gear: Record<string, Loadout>, fitting: string): number {
  const used = Object.values(gear).filter((l) => l.work === fitting || l.charm === fitting).length;
  return Math.max(0, have(flags, fitting) - used);
}

/** Fittings a character could put in a slot now: spare ones that fit the slot and that they are allowed to carry. */
export function fittingsFor(flags: Flags, gear: Record<string, Loadout>, id: string, slot: "work" | "charm"): string[] {
  return Object.keys(FITTINGS).filter((f) => fits(f, slot) && (!FITTINGS[f].only || FITTINGS[f].only === id) && spare(flags, gear, f) > 0);
}

/** Puts a fitting in a character's slot (or takes it off with undefined). The one it replaces goes back to the spares. */
export function equip(flags: Flags, gear: Record<string, Loadout>, id: string, slot: "work" | "charm", fitting: string | undefined): Record<string, Loadout> {
  const now: Loadout = { ...(gear[id] ?? { tier: 0 }) };
  if (fitting !== undefined) {
    if (!fits(fitting, slot)) throw new Error(`${fitting} doesn't fit the ${slot} slot`);
    if (FITTINGS[fitting].only && FITTINGS[fitting].only !== id) throw new Error(`${fitting} is not for ${id}`);
    if (now[slot] !== fitting && spare(flags, gear, fitting) < 1) throw new Error(`no spare ${fitting}`);
  }
  if (fitting === undefined) delete now[slot]; else now[slot] = fitting;
  return { ...gear, [id]: now };
}

/** What a fitting does, in a few words: "Might +3, timing +8%". */
export function fittingSummary(f: Fitting): string {
  const parts = Object.entries(f.mods).map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)} ${v! > 0 ? "+" : ""}${v}`);
  if (f.timing) parts.push(`timing window +${Math.round((f.timing - 1) * 100)}%`);
  if (f.bond) parts.push(`kith bond +${Math.round((f.bond - 1) * 100)}%`);
  if (f.vsWardens) parts.push(`+${Math.round((f.vsWardens - 1) * 100)}% against Wardens`);
  return parts.join(", ");
}
