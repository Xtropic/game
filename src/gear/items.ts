// Things the company carries: bandages, salves, teas. Used from the menu on the road, they give back part of the
// health lost in fights, so the party can go on between towns. Resting in a town or camp still heals everyone fully.
// Counts are kept in the story flags as have.<id> (fittings are counted the same way).
import data from "../../data/gear/items.json";

export interface Item { name: string; heal: number; who: "one" | "all"; text: string; /** Thrown in fights instead (a crafted art), not used from the menu. */ battle?: boolean; }
export const ITEMS = data.items as Record<string, Item>;

type Flags = Record<string, boolean | number | string>;

/** How many of an item (or fitting) the company has. */
export const owned = (flags: Flags, id: string): number => { const n = flags[`have.${id}`]; return typeof n === "number" ? Math.max(0, n) : 0; };

/** Items the company has at least one of, in the order the data lists them. */
export const itemsOwned = (flags: Flags): string[] => Object.keys(ITEMS).filter((id) => owned(flags, id) > 0);

/**
 * Health after using an item. `health` is what is left of each hurt ally (0..1 by battle unit id; missing means
 * unhurt); `on` is who it is used on (ignored for whole-party items, which reach everyone in `party`).
 * Returns null if nobody it could reach is hurt, so nothing is wasted.
 */
export function applyItem(health: Record<string, number>, item: Item, on: string, party: string[]): Record<string, number> | null {
  const who = item.who === "all" ? party : [on];
  const hurt = who.filter((u) => health[u] !== undefined && health[u] < 1);
  if (!hurt.length) return null;
  const out = { ...health };
  for (const u of hurt) { const v = Math.round(Math.min(1, out[u] + item.heal) * 100) / 100; if (v >= 0.995) delete out[u]; else out[u] = v; }
  return out;
}

/** Uses one of an item: takes it from the flags and returns the new health, or null (and keeps it) if it would do nothing. */
export function useItem(flags: Flags, id: string, health: Record<string, number>, on: string, party: string[]): Record<string, number> | null {
  const item = ITEMS[id]; if (!item || item.battle || owned(flags, id) < 1) return null;
  const out = applyItem(health, item, on, party); if (!out) return null;
  flags[`have.${id}`] = owned(flags, id) - 1;
  return out;
}
