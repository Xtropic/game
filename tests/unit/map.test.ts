import { describe, expect, it } from "vitest";
import { TILE, WorldMap, validateMap, type MapFile } from "../../src/world/map";
import larkfold from "../../data/maps/larkfold-square.json";

const tiny: MapFile = { id: "t", name: "t", legend: { ".": "grass", "#": "wall" }, rows: ["#####", "#...#", "#...#", "#####"], entities: [{ id: "s", kind: "spawn", x: 1, y: 1 }] };

describe("map", () => {
  it("the shipped Larkfold map is valid", () => { expect(validateMap(larkfold as MapFile)).toEqual([]); });
  it("reports ragged rows and unknown legend characters", () => {
    const errs = validateMap({ ...tiny, rows: ["####", "#.x#", "###"] });
    expect(errs.some((e) => e.includes("row 1 uses 'x'"))).toBe(true);
    expect(errs.some((e) => e.includes("row 2 is 3 wide"))).toBe(true);
  });
  it("treats off-map as solid", () => { const m = new WorldMap(tiny); expect(m.solidAt(-1, 0)).toBe(true); expect(m.solidAt(1, 1)).toBe(false); });
  it("stops a box flush against a wall and slides along it", () => {
    const m = new WorldMap(tiny);
    const r = m.move(TILE + 2, TILE + 2, 10, 6, 100, 0);
    expect(r.x).toBe(4 * TILE - 10);
    const s = m.move(TILE + 2, TILE + 2, 10, 6, -100, 5);
    expect(s.x).toBe(TILE); expect(s.y).toBeCloseTo(TILE + 7, 6);
  });
});
