import { describe, expect, it } from "vitest";
import { MemoryKV, SaveStore, SAVE_VERSION, migrate } from "../../src/core/save";

const place = { map: "larkfold-square", x: 10, y: 20, facing: "down" as const };

describe("saves", () => {
  it("round-trips a save in a slot", () => {
    const s = new SaveStore(new MemoryKV());
    s.write("1", { playSeconds: 42, place, flags: { met_maren: true } }, new Date("2026-11-02T10:00:00Z"));
    const d = s.read("1")!;
    expect(d.version).toBe(SAVE_VERSION); expect(d.place).toEqual(place); expect(d.flags.met_maren).toBe(true);
    expect(s.list()).toEqual([{ slot: "1", savedAt: "2026-11-02T10:00:00.000Z", playSeconds: 42, map: "larkfold-square" }]);
  });
  it("ignores a corrupt save instead of crashing", () => {
    const kv = new MemoryKV(); kv.setItem("lull.save.2", "{not json"); expect(new SaveStore(kv).read("2")).toBeNull();
  });
  it("upgrades a version-0 save", () => { const d = migrate({ place }); expect(d.version).toBe(1); expect(d.flags).toEqual({}); expect(d.playSeconds).toBe(0); });
  it("refuses a save from a newer version", () => { expect(() => migrate({ version: 99 })).toThrow(); });
});
