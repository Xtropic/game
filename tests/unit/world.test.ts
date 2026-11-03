import { describe, expect, it } from "vitest";
import { MAPS, REGIONS, STORY } from "../../src/world/content";
import { TILE_DEFS, WILD, WorldMap } from "../../src/world/map";
import { GATES, arrival, closedAt, findsNow, wayAt, wayOpen, wayWhy } from "../../src/world/gates";
import { FITTINGS } from "../../src/gear/weapons";
import type { Flags } from "../../src/story/story";
import { DANGER, encounter, partyUnits, sceneryFor, wildKinds } from "../../src/battle/encounters";
import { seeded } from "../../src/battle/rules";

const LANDS = Object.values(MAPS).filter((m) => m.world);
const land = (id: string) => new WorldMap(MAPS[`land-${id}`]);
const placeOf = (id: string) => { for (const m of LANDS) { const p = m.places!.find((x) => x.id === id); if (p) return { map: m.id, ...p }; } throw new Error(id); };

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

/** The lands Rhea can walk to from the Cloudline with these flags, crossing only open ways. */
function landsReached(flags: Flags): Set<string> {
  const seen = new Set(["land-cloudline"]), q = ["land-cloudline"];
  while (q.length) for (const w of MAPS[q.shift()!].ways ?? []) {
    const to = `land-${w.to}`;
    if (wayOpen(w.id, flags) && !seen.has(to)) { seen.add(to); q.push(to); }
  }
  return seen;
}

describe("the lands of Ostrel", () => {
  it("are ten maps between them covering all 25 regions", () => {
    expect(LANDS.length).toBe(10);
    const seen = new Set<string>();
    for (const m of LANDS) { const w = new WorldMap(m); for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) seen.add(w.regionAt(x, y)!); }
    expect([...seen].sort()).toEqual(Object.keys(REGIONS).sort());
  });

  it("every place and every way in a land can be walked to, and leaving a place puts you on open ground", () => {
    for (const m of LANDS) {
      const w = new WorldMap(m), s = w.spawn(), ok = reach(w, s.x, s.y);
      for (const way of m.ways!) expect(ok.has(`${way.x},${way.y}`), `${m.id} ${way.id}`).toBe(true);
      for (const p of m.places!) {
        if (REGIONS[w.regionAt(p.x, p.y)!]?.kind === "hidden" && !ok.has(`${p.x},${p.y}`)) continue; // a hidden land may be off the roads
        expect(ok.has(`${p.x},${p.y}`), `${p.name}`).toBe(true);
        expect(w.solidAt(p.x, p.y + 1), `the way out of ${p.name}`).toBe(false);
      }
    }
  });

  it("joins its lands in pairs: every way comes out at the other land's end of the same road", () => {
    for (const m of LANDS) for (const w of m.ways!) {
      const to = arrival(MAPS, w); expect(to, `${m.id} ${w.id}`).not.toBeNull();
      expect(new WorldMap(MAPS[to!.map]).solidAt(to!.x, to!.y), `${w.id} into ${to!.map}`).toBe(false);
    }
  });

  it("keeps the lands the story reaches late far from Larkfold", () => {
    // fewest ways from the Cloudline to each land, with every way open
    const hops: Record<string, number> = { "land-cloudline": 0 }, q = ["land-cloudline"];
    while (q.length) { const id = q.shift()!; for (const w of MAPS[id].ways!) { const to = `land-${w.to}`; if (hops[to] === undefined) { hops[to] = hops[id] + 1; q.push(to); } } }
    expect(hops["land-vale"]).toBe(1);
    expect(hops["land-millcities"]).toBeGreaterThanOrEqual(2);
    expect(hops["land-heartland"]).toBeGreaterThanOrEqual(3); // Vantry
    expect(hops["land-ember"]).toBeGreaterThanOrEqual(3);
  });

  it("opens only the Cloudline and the vale in Act I, and shuts every other road with a reason", () => {
    expect([...landsReached({ stage: "a1" })].sort()).toEqual(["land-cloudline", "land-vale"]);
    expect([...landsReached({ stage: "a7c" })].sort()).toEqual(["land-cloudline", "land-vale"]);
    const vale = land("vale");
    for (const w of MAPS["land-vale"].ways!) {
      expect(closedAt(vale, w.x, w.y, { stage: "a3" }), w.id).toBe(w.id !== "cloudline-vale");
      expect(wayWhy(w.id).length).toBeGreaterThan(10);
    }
    expect(wayAt(vale, MAPS["land-vale"].ways![0].x, MAPS["land-vale"].ways![0].y)).toBeDefined();
    // the story opens a road with a flag
    expect(landsReached({ stage: "a7c", "open.vale-east": true }).has("land-east")).toBe(true);
    expect(wayWhy("vale-millcities")).toMatch(/checkpoint/);
  });

  it("puts Act I's places in the first two lands, and Vantry in the last", () => {
    for (const id of ["larkfold", "thornwick", "umes"]) expect(placeOf(id).map, id).toBe("land-cloudline");
    for (const id of ["ferrow", "camp", "millbridge", "bend", "sallow"]) expect(placeOf(id).map, id).toBe("land-vale");
    expect(placeOf("vantry").map).toBe("land-heartland");
  });

  it("puts each rare find where Rhea can reach it, and only from its stage until she picks it up", () => {
    for (const f of GATES.finds) {
      const w = new WorldMap(MAPS[f.map]), s = w.spawn();
      expect(FITTINGS[f.fitting], f.fitting).toBeDefined();
      expect(w.solidAt(f.x, f.y), f.id).toBe(false);
      expect(reach(w, s.x, s.y).has(`${f.x},${f.y}`), f.id).toBe(true);
    }
    expect(findsNow({ stage: "a1" }).map((f) => f.id)).toEqual(["duskwort"]);
    expect(findsNow({ stage: "a3c" }, "land-vale").map((f) => f.id)).toContain("indenture");
    expect(findsNow({ stage: "a3" }).map((f) => f.id)).not.toContain("indenture");
    expect(findsNow({ stage: "a7", "found.trayiron": true }).map((f) => f.id)).not.toContain("trayiron");
  });

  it("every region has at least two villages, towns or cities", () => {
    const settled = new Set(["village", "town", "city", "port", "castle", "palace", "fort", "college"]);
    const count = new Map<string, number>();
    for (const m of LANDS) { const w = new WorldMap(m); for (const p of m.places!) if (settled.has(p.icon)) { const r = w.regionAt(p.x, p.y)!; count.set(r, (count.get(r) ?? 0) + 1); } }
    for (const r of Object.keys(REGIONS)) expect(count.get(r) ?? 0, r).toBeGreaterThanOrEqual(2);
  });

  it("each place stands in the region it belongs to", () => {
    const at = (id: string) => { const p = placeOf(id); return new WorldMap(MAPS[p.map]).regionAt(p.x, p.y); };
    expect(at("larkfold")).toBe("cloudline");
    expect(at("millbridge")).toBe("millbridge");
    expect(at("vantry")).toBe("guild");
    expect(at("camp")).toBe("old-drove-road");
    expect(at("ashby")).toBe("ashby");
  });

  it("only uses tile kinds the game knows, and wild ground is walkable", () => {
    for (const m of LANDS) for (const k of Object.values(m.legend)) expect(TILE_DEFS[k], k).toBeDefined();
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

describe("saves from before the lands", () => {
  it("move a save on the old world map to the same place on the new lands", async () => {
    const { fromOldWorld } = await import("../../src/world/oldWorld");
    // standing just south of the old Hob's Bend (44, 37)
    expect(fromOldWorld(44 * 16 + 2, 38 * 16 - 2, MAPS)).toEqual({ map: "land-vale", x: 43 * 16 + 2, y: 34 * 16 - 2, facing: "down" });
    expect(fromOldWorld(22 * 16 + 2, 21 * 16 - 2, MAPS)!.map).toBe("land-cloudline");
  });
});

describe("the towns of the open lands", () => {
  const open = ["land-cloudline", "land-vale"];
  const stepsAt = (map: string, x: number, y: number) => STORY.steps.filter((s) => s.map === map && s.at[0] === x && s.at[1] === y);
  it("every town in a land Rhea can reach can be walked into, or the story says why not", () => {
    for (const id of open) for (const p of MAPS[id].places ?? []) {
      const here = stepsAt(id, p.x, p.y);
      const enters = here.some((s) => s.do.some((d) => "goto" in d || "run" in d));
      const why = here.some((s) => s.do.some((d) => "toast" in d));
      expect(enters || why, `${p.name} has nothing`).toBe(true);
    }
  });
  it("the new towns have people, a way in and a way back out onto open ground", () => {
    const towns = Object.keys(MAPS).filter((k) => k.startsWith("town-"));
    expect(towns.length).toBe(8);
    for (const t of towns) {
      expect(STORY.actors.filter((a) => a.map === t).length, t).toBeGreaterThanOrEqual(3);
      const out = STORY.steps.filter((s) => s.map === t).flatMap((s) => s.do).find((d) => "goto" in d) as { goto: { map: string; x: number; y: number } };
      const land = new WorldMap(MAPS[out.goto.map]);
      expect(TILE_DEFS[land.kindAt(out.goto.x, out.goto.y)!].solid, `${t} exit`).toBe(false);
      const inn = STORY.steps.find((s) => s.do.some((d) => "goto" in d && d.goto.map === t))!;
      const g = (inn.do.find((d) => "goto" in d) as { goto: { x: number; y: number } }).goto, m = new WorldMap(MAPS[t]);
      expect(TILE_DEFS[m.kindAt(g.x, g.y)!].solid, `${t} entry`).toBe(false);
    }
  });
});
