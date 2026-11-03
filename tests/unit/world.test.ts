import { describe, expect, it } from "vitest";
import { MAPS, REGIONS } from "../../src/world/content";
import { TILE_DEFS, WILD, WorldMap } from "../../src/world/map";
import { GATES, closedAt, closedWhy, findsNow } from "../../src/world/gates";
import { FITTINGS } from "../../src/gear/weapons";
import type { Flags } from "../../src/story/story";
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

  it("opens only the places that matter at each stage of the story", () => {
    const gated = new WorldMap(MAPS.ostrel);
    const flags: Flags = { stage: "d1" };
    gated.closed = (tx, ty) => closedAt(gated, tx, ty, flags);
    const reachable = () => {
      const ok = reach(gated, 22, 21);
      return new Set(MAPS.ostrel.places!.filter((p) => ok.has(`${p.x},${p.y}`)).map((p) => p.id));
    };
    // the prologue: only home
    expect([...reachable()]).toEqual(["larkfold"]);
    // Act I opens its places one stage at a time
    flags.stage = "a1"; expect([...reachable()].sort()).toEqual(["ferrow", "larkfold", "thornwick"]);
    flags.stage = "a3"; const a3 = reachable();
    for (const id of ["camp", "millbridge", "bend"]) expect(a3.has(id), id).toBe(true);
    expect(a3.has("sallow")).toBe(false);
    flags.stage = "a6"; expect(reachable().has("sallow")).toBe(true);
    // the villages and towns that aren't in the story yet stay shut, even beside the open roads
    for (const id of ["umes", "vantry", "weirbank", "lockside", "dripstone", "kerrow", "corvane", "hollin", "college", "salt-house"]) expect(reachable().has(id), id).toBe(false);
    // every open place, recruit and find in the gates file is somewhere on the map
    for (const id of Object.keys(GATES.places)) expect(MAPS.ostrel.places!.some((p) => p.id === id), id).toBe(true);
    // the story can still open a whole region with a flag
    flags["open.corvane"] = true; expect(reachable().has("corvane")).toBe(true);
    expect(closedWhy("guild")).toMatch(/checkpoint/);
  });

  it("puts each rare find where Rhea can reach it, and only from its stage until she picks it up", () => {
    const gated = new WorldMap(MAPS.ostrel);
    const flags: Flags = { stage: "a7" };
    gated.closed = (tx, ty) => closedAt(gated, tx, ty, flags);
    const ok = reach(gated, 22, 21);
    for (const f of GATES.finds) {
      expect(FITTINGS[f.fitting], f.fitting).toBeDefined();
      expect(gated.solidAt(f.x, f.y), f.id).toBe(false);
      expect(ok.has(`${f.x},${f.y}`), f.id).toBe(true);
    }
    expect(findsNow({ stage: "a1" }).map((f) => f.id)).toEqual(["duskwort"]);
    expect(findsNow({ stage: "a3c" }).map((f) => f.id)).toContain("indenture");
    expect(findsNow({ stage: "a3" }).map((f) => f.id)).not.toContain("indenture");
    expect(findsNow({ stage: "a7", "found.trayiron": true }).map((f) => f.id)).not.toContain("trayiron");
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
