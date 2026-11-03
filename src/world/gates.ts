// How much of Ostrel is open: most regions are closed until the story reaches them, so the world map can't all be
// walked on day one. A closed region is solid ground to walk into, with a reason given at its border. The roads the
// story's own journeys take stay open where they cut across a closed region's corner.
import gates from "../../data/world/gates.json";
import type { WorldMap } from "./map";

const G = gates as unknown as { open: string[]; routes: [string, string][]; why: Record<string, string> };
const ROAD = new Set(["road", "pass", "bridge", "townground"]);

export function regionOpen(region: string | null, flags: Record<string, unknown>): boolean {
  return !region || G.open.includes(region) || !!flags[`open.${region}`];
}

export function closedWhy(region: string): string { return G.why[region] ?? "There's no way through here yet."; }

const corridors = new WeakMap<WorldMap, Set<number>>();
/** Road tiles on the shortest road path between each pair of route places. */
export function corridor(map: WorldMap): Set<number> {
  let c = corridors.get(map);
  if (c) return c;
  c = new Set();
  const at = (id: string) => map.file.places?.find((p) => p.id === id);
  for (const [a, b] of G.routes) {
    const s = at(a), g = at(b); if (!s || !g) continue;
    const key = (x: number, y: number) => y * map.width + x;
    const prev = new Map<number, number>([[key(s.x, s.y), -1]]), q = [[s.x, s.y]];
    while (q.length) {
      const [x, y] = q.shift()!;
      if (x === g.x && y === g.y) break;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const k = map.kindAt(nx, ny);
        if (k && ROAD.has(k) && !prev.has(key(nx, ny))) { prev.set(key(nx, ny), key(x, y)); q.push([nx, ny]); }
      }
    }
    for (let k = key(g.x, g.y); k !== -1 && prev.has(k); k = prev.get(k)!) c.add(k);
  }
  corridors.set(map, c);
  return c;
}

/** True where Rhea can't go yet: a closed region, off the story's roads. */
export function closedAt(map: WorldMap, tx: number, ty: number, flags: Record<string, unknown>): boolean {
  if (!map.file.world) return false;
  const r = map.regionAt(tx, ty);
  return !regionOpen(r, flags) && !corridor(map).has(ty * map.width + tx);
}
