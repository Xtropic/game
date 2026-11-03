// How much of Ostrel Rhea can reach. The map is closed except for the places that matter now: story places for
// the current stage, places where a recruit can be found, and rare finds that are there to be found at this point.
// Each open place opens the ground around it and the road to it from Larkfold. Everything else is solid ground
// to walk into, with a reason given at its edge. A whole region can still be opened with the flag open.<region>.
import gates from "../../data/world/gates.json";
import { holds, type Cond, type Flags } from "../story/story";
import type { WorldMap } from "./map";

export type AccessKind = "story" | "recruit" | "find";
export interface Gate { kind: AccessKind; from?: string; until?: string; when?: Cond; recruits?: string[]; note?: string; }
export interface Find { id: string; place: string; x: number; y: number; from?: string; until?: string; when?: Cond; fitting: string; text: string; }

interface Gates { reach: number; hub: string; order: string[]; places: Record<string, Gate>; finds: Find[]; why: Record<string, string>; }
export const GATES = gates as unknown as Gates;
const ROAD = new Set(["road", "pass", "bridge", "townground"]);

/** Where a stage falls in the story; stages not listed come before everything. */
const at = (stage: string): number => GATES.order.indexOf(stage);

/** Whether a gate's stage window and condition hold for these flags. */
export function gateHolds(g: { from?: string; until?: string; when?: Cond }, flags: Flags): boolean {
  const now = at(String(flags.stage ?? ""));
  if (g.from !== undefined && now < at(g.from)) return false;
  if (g.until !== undefined && now > at(g.until)) return false;
  return holds(g.when, { flags, map: "ostrel" });
}

/** The places Rhea can reach now. */
export function openPlaces(flags: Flags): string[] {
  return Object.entries(GATES.places).filter(([, g]) => gateHolds(g, flags)).map(([id]) => id);
}

/** The rare finds lying about now that haven't been picked up. */
export function findsNow(flags: Flags): Find[] {
  return GATES.finds.filter((f) => !flags[`found.${f.id}`] && GATES.places[f.place] && gateHolds(GATES.places[f.place], flags) && gateHolds(f, flags));
}

export function regionOpen(region: string | null, flags: Flags): boolean { return !!region && !!flags[`open.${region}`]; }

export function closedWhy(region: string | null): string { return (region && GATES.why[region]) || "There's nothing for Rhea out there yet."; }

/** Road tiles on the shortest road path from the hub to a place. */
function road(map: WorldMap, from: { x: number; y: number }, to: { x: number; y: number }): number[] {
  const key = (x: number, y: number) => y * map.width + x;
  const prev = new Map<number, number>([[key(from.x, from.y), -1]]), q: [number, number][] = [[from.x, from.y]];
  let found = false;
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    if (x === to.x && y === to.y) { found = true; break; }
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const k = map.kindAt(nx, ny);
      if (k && ROAD.has(k) && !prev.has(key(nx, ny))) { prev.set(key(nx, ny), key(x, y)); q.push([nx, ny]); }
    }
  }
  const out: number[] = [];
  if (found) for (let k = key(to.x, to.y); k !== -1; k = prev.get(k)!) out.push(k);
  return out;
}

const cache = new WeakMap<WorldMap, { key: string; open: Set<number> }>();

/** Every tile Rhea can stand on now: around each open place, and the roads to them. */
export function reachable(map: WorldMap, flags: Flags): Set<number> {
  const places = openPlaces(flags);
  const regions = Object.keys(flags).filter((f) => f.startsWith("open.") && flags[f]);
  const key = [...places, ...regions].join();
  const c = cache.get(map);
  if (c && c.key === key) return c.open;
  const open = new Set<number>();
  const byId = (id: string) => map.file.places?.find((p) => p.id === id);
  const hub = byId(GATES.hub);
  const r = GATES.reach;
  for (const id of places) {
    const p = byId(id); if (!p) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = p.x + dx, y = p.y + dy;
      if (x >= 0 && y >= 0 && x < map.width && y < map.height && dx * dx + dy * dy <= r * r + 1) open.add(y * map.width + x);
    }
    if (hub && id !== hub.id) for (const k of road(map, hub, p)) open.add(k);
  }
  cache.set(map, { key, open });
  return open;
}

/** True where Rhea can't go yet. */
export function closedAt(map: WorldMap, tx: number, ty: number, flags: Flags): boolean {
  if (!map.file.world) return false;
  if (reachable(map, flags).has(ty * map.width + tx)) return false;
  return !regionOpen(map.regionAt(tx, ty), flags);
}
