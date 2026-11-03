import { describe, expect, it } from "vitest";
import { MAPS, REGIONS } from "../../src/world/content";
import { TILE_DEFS, WILD, WorldMap } from "../../src/world/map";
import { DANGER, encounter, partyUnits, sceneryFor, wildKinds } from "../../src/battle/encounters";
import { seeded } from "../../src/battle/rules";

const world = new WorldMap(MAPS.ostrel);

/** Every tile a walker can reach from (x, y), without crossing anything solid. */
function reach(m: WorldMap, x: number, y: number): Set<string> {
  const seen = new Set([`${x},${y}`]), q = [[x, y]];
  while (q.length) {
    const [cx, cy] = q.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, k = `${nx},${ny}`;
      if (!seen.has(k) && !m.solidAt(nx, ny)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen;
}

describe("the world map of Ostrel", () => {
  it("is a world map, with every tile in one of the 25 regions", () => {
    expect(MAPS.ostrel.world).toBe(true);
    expect(world.width).toBe(96); expect(world.height).toBe(64);
    const seen = new Set<string>();
    for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) { const r = world.regionAt(x, y); expect(r, `${x},${y}`).not.toBeNull(); seen.add(r!); }
    expect([...seen].sort()).toEqual(Object.keys(REGIONS).sort());
  });

  it("every place, and every region's land, can be walked to from Larkfold", () => {
    const ok = reach(world, 22, 21);
    for (const p of MAPS.ostrel.places!) {
      expect(ok.has(`${p.x},${p.y}`), `${p.name}`).toBe(true);
      expect(world.solidAt(p.x, p.y + 1), `the way out of ${p.name}`).toBe(false); // leaving a place puts you a tile south
    }
    const walkable = new Set<string>();
    for (const k of ok) { const [x, y] = k.split(",").map(Number); walkable.add(world.regionAt(x, y)!); }
    expect([...walkable].sort()).toEqual(Object.keys(REGIONS).sort());
  });

  it("every region has at least two villages, towns or cities", () => {
    const settled = new Set(["village", "town", "city", "port", "castle", "palace", "fort", "college"]);
    const count = new Map<string, number>();
    for (const p of MAPS.ostrel.places!) if (settled.has(p.icon)) { const r = world.regionAt(p.x, p.y)!; count.set(r, (count.get(r) ?? 0) + 1); }
    for (const r of Object.keys(REGIONS)) expect(count.get(r) ?? 0, r).toBeGreaterThanOrEqual(2);
  });

  it("each place stands in the region it belongs to", () => {
    const at = (id: string) => { const p = MAPS.ostrel.places!.find((x) => x.id === id)!; return world.regionAt(p.x, p.y); };
    expect(at("larkfold")).toBe("cloudline");
    expect(at("millbridge")).toBe("millbridge");
    expect(at("vantry")).toBe("guild");
    expect(at("camp")).toBe("old-drove-road");
    expect(at("ashby")).toBe("ashby");
  });

  it("only uses tile kinds the game knows, and wild ground is walkable", () => {
    for (const k of Object.values(MAPS.ostrel.legend)) expect(TILE_DEFS[k], k).toBeDefined();
    for (const k of WILD) expect(TILE_DEFS[k].solid, k).toBe(false);
  });
});

describe("chance meetings", () => {
  const party = [{ id: "tamsin", name: "Tamsin" }, { id: "ash", name: "Ash" }, { id: "brannoc", name: "Brannoc" }];

  it("every region has wild kith of its own, or common ones, and a danger level", () => {
    for (const r of Object.keys(REGIONS)) { expect(wildKinds(r).length, r).toBeGreaterThan(0); expect(DANGER[r], r).toBeDefined(); }
    expect(wildKinds("cloud-forest").map((s) => s.id)).toContain("fog-reedcat");
  });

  it("wild kith come out of the ground you're on, in the region's colours, at the region's level", () => {
    const def = encounter("cloud-forest", "cloudwood", "rhea", party, seeded(3));
    const foes = def.units.filter((u) => u.side === "foe");
    expect(foes.length).toBeGreaterThan(0);
    for (const f of foes) { expect(f.kith).toBe(true); expect(f.level).toBeGreaterThanOrEqual(2); expect(f.level).toBeLessThanOrEqual(4); expect(f.look).toMatch(/^(reedcat|loftbuck):#/); }
    expect(def.backdrop).toBe("forest");
  });

  it("Guild country has patrols on its roads", () => {
    const def = encounter("guild", "road", "rhea", party, seeded(1));
    expect(def.units.filter((u) => u.side === "foe").every((u) => u.cast === "warden" || u.cast === "archer")).toBe(true);
    expect(def.backdrop).toBe("road");
  });

  it("the party fights in its rows: Rhea and Brannoc in front, Tamsin behind, Ash bonded to Rhea", () => {
    const us = partyUnits("rhea", party);
    expect(us.map((u) => `${u.id}:${u.row}`)).toEqual(["rhea:front", "tam:back", "ash:front", "brannoc:front"]);
    expect(us.find((u) => u.id === "ash")!.bonded).toBe("rhea");
    expect(new Set(us.map((u) => u.at.join(","))).size).toBe(us.length);
  });

  it("scenery follows the ground", () => {
    expect(sceneryFor("snow")).toBe("snow"); expect(sceneryFor("reeds")).toBe("marsh"); expect(sceneryFor("plains")).toBe("meadow");
  });
});
