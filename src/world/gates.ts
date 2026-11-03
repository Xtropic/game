// How Ostrel opens up. The world is ten lands, each its own map, joined by ways: roads that leave one land at its
// edge and come into the next. A way stays shut, with something Rhea can see across the road (snow, a Guild
// checkpoint, a shut gate), until the story opens it. Everything inside a land she can reach is open, so there is
// never a greyed-out town in view: the places the story reaches late are lands away, behind shut ways.
import gates from "../../data/world/gates.json";
import { holds, type Cond, type Flags } from "../story/story";
import type { Way, WorldMap } from "./map";

export type Blocker = "none" | "snow" | "mist" | "riders" | "gate" | "toll" | "checkpoint" | "smugglers" | "desert" | "walls";
export interface WayGate { from?: string; until?: string; when?: Cond; blocker: Blocker; why: string; }
export interface Find { id: string; map: string; x: number; y: number; from?: string; until?: string; when?: Cond; fitting: string; text: string; }

interface Gates { order: string[]; ways: Record<string, WayGate>; finds: Find[]; }
export const GATES = gates as unknown as Gates;

/** Where a stage falls in the story; stages not listed come before everything. */
const at = (stage: string): number => GATES.order.indexOf(stage);

/** Whether a stage window and condition hold for these flags. */
export function gateHolds(g: { from?: string; until?: string; when?: Cond }, flags: Flags): boolean {
  const now = at(String(flags.stage ?? ""));
  if (g.from !== undefined && now < at(g.from)) return false;
  if (g.until !== undefined && now > at(g.until)) return false;
  return holds(g.when, { flags, map: "" });
}

/** A way is open from its stage, or once the story sets open.<way id>. A way with no stage stays shut until then. */
export function wayOpen(id: string, flags: Flags): boolean {
  if (flags[`open.${id}`]) return true;
  const g = GATES.ways[id];
  return !!g && (g.from !== undefined || g.when !== undefined) && gateHolds(g, flags);
}

export function wayWhy(id: string): string { return GATES.ways[id]?.why ?? "The road is shut."; }
export function wayBlocker(id: string): Blocker { return GATES.ways[id]?.blocker ?? "gate"; }

/** The way at a tile, if there is one. */
export function wayAt(map: WorldMap, tx: number, ty: number): Way | undefined { return map.file.ways?.find((w) => w.x === tx && w.y === ty); }

/** The rare finds lying on this map now that haven't been picked up. */
export function findsNow(flags: Flags, map?: string): Find[] {
  return GATES.finds.filter((f) => (!map || f.map === map) && !flags[`found.${f.id}`] && gateHolds(f, flags));
}

/** True where Rhea can't go yet: a way the story hasn't opened. */
export function closedAt(map: WorldMap, tx: number, ty: number, flags: Flags): boolean {
  if (!map.file.world) return false;
  const w = wayAt(map, tx, ty);
  return !!w && !wayOpen(w.id, flags);
}

/** Where a way comes out in the land it leads to: one step in from that land's end of the same way. */
export function arrival(maps: Record<string, { ways?: Way[]; id: string }>, way: Way): { map: string; x: number; y: number; facing: "up" | "down" | "left" | "right" } | null {
  const to = maps[`land-${way.to}`]; const end = to?.ways?.find((w) => w.id === way.id);
  if (!to || !end) return null;
  const step = { north: [0, 1, "down"], south: [0, -1, "up"], west: [1, 0, "right"], east: [-1, 0, "left"] }[end.side] as [number, number, "up" | "down" | "left" | "right"];
  return { map: to.id, x: end.x + step[0], y: end.y + step[1], facing: step[2] };
}
