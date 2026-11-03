import { describe, expect, it } from "vitest";
import { MemoryKV, SaveStore, SAVE_VERSION, migrate } from "../../src/core/save";

const place = { map: "larkfold-square", x: 10, y: 20, facing: "down" as const };

describe("saves", () => {
  it("round-trips a save in a slot", () => {
    const s = new SaveStore(new MemoryKV());
    s.write("1", { playSeconds: 42, place, flags: { met_maren: true }, party: { rhea: { level: 4, xp: 12 } }, gear: { rhea: { tier: 1, charm: "charm-ring" } }, coin: 30 }, new Date("2026-11-02T10:00:00Z"));
    const d = s.read("1")!;
    expect(d.version).toBe(SAVE_VERSION); expect(d.place).toEqual(place); expect(d.flags.met_maren).toBe(true); expect(d.party.rhea).toEqual({ level: 4, xp: 12 });
    expect(s.list()).toEqual([{ slot: "1", savedAt: "2026-11-02T10:00:00.000Z", playSeconds: 42, map: "larkfold-square" }]);
  });
  it("ignores a corrupt save instead of crashing", () => {
    const kv = new MemoryKV(); kv.setItem("lull.save.2", "{not json"); expect(new SaveStore(kv).read("2")).toBeNull();
  });
  it("upgrades a version-0 save", () => { const d = migrate({ place }); expect(d.version).toBe(SAVE_VERSION); expect(d.flags).toEqual({}); expect(d.playSeconds).toBe(0); });
  it("upgrades a version-1 save with no levels yet", () => { const d = migrate({ version: 1, place, flags: { a: 1 }, playSeconds: 5 }); expect(d.version).toBe(SAVE_VERSION); expect(d.party).toEqual({}); expect(d.gear).toEqual({}); expect(d.coin).toBe(0); expect(d.flags).toEqual({ a: 1 }); });
  it("refuses a save from a newer version", () => { expect(() => migrate({ version: 99 })).toThrow(); });
});
