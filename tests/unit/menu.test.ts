import { describe, expect, it } from "vitest";
import { ITEMS, applyItem, itemsOwned, useItem } from "../../src/gear/items";
import { equip, fittingSummary, fittingsFor, FITTINGS, spare } from "../../src/gear/weapons";
import { parseSettings, DEFAULTS } from "../../src/core/settings";

describe("items", () => {
  it("heals one person, capped at full, and drops them from the wounded when whole", () => {
    expect(applyItem({ rhea: 0.5 }, ITEMS.bandage, "rhea", ["rhea"])).toEqual({ rhea: 0.8 });
    expect(applyItem({ rhea: 0.9, tam: 0.4 }, ITEMS.salve, "rhea", ["rhea", "tam"])).toEqual({ tam: 0.4 });
  });
  it("whole-party items reach everyone travelling, and nothing is wasted on the unhurt", () => {
    expect(applyItem({ rhea: 0.5, tam: 0.3, brannoc: 0.2 }, ITEMS.willowbark, "", ["rhea", "tam"])).toEqual({ rhea: 0.7, tam: 0.5, brannoc: 0.2 });
    expect(applyItem({}, ITEMS.willowbark, "", ["rhea"])).toBeNull();
    expect(applyItem({ tam: 0.5 }, ITEMS.bandage, "rhea", ["rhea", "tam"])).toBeNull();
  });
  it("using an item takes one from the pack, and keeps it if it would do nothing", () => {
    const flags: Record<string, number> = { "have.bandage": 2 };
    expect(itemsOwned(flags)).toEqual(["bandage"]);
    expect(useItem(flags, "bandage", {}, "rhea", ["rhea"])).toBeNull();
    expect(flags["have.bandage"]).toBe(2);
    expect(useItem(flags, "bandage", { rhea: 0.2 }, "rhea", ["rhea"])).toEqual({ rhea: 0.5 });
    expect(flags["have.bandage"]).toBe(1);
    expect(useItem(flags, "salve", { rhea: 0.2 }, "rhea", ["rhea"])).toBeNull();
  });
});

describe("changing fittings", () => {
  it("only offers spare fittings that fit the slot, and swaps the old one back to the spares", () => {
    const flags = { "have.charm-moss": 1, "have.charm-bell": 1, "have.head-hatchery": 1 };
    let gear = {};
    expect(fittingsFor(flags, gear, "rhea", "charm").sort()).toEqual(["charm-bell", "charm-moss"]);
    expect(fittingsFor(flags, gear, "rhea", "work")).toEqual(["head-hatchery"]);
    gear = equip(flags, gear, "rhea", "charm", "charm-moss");
    expect(spare(flags, gear, "charm-moss")).toBe(0);
    expect(fittingsFor(flags, gear, "tamsin", "charm")).toEqual(["charm-bell"]);
    expect(() => equip(flags, gear, "tamsin", "charm", "charm-moss")).toThrow();
    gear = equip(flags, gear, "rhea", "charm", "charm-bell");
    expect(spare(flags, gear, "charm-moss")).toBe(1);
    gear = equip(flags, gear, "rhea", "charm", undefined);
    expect(gear).toEqual({ rhea: { tier: 0 } });
  });
  it("keeps a personal keepsake to its owner", () => {
    const flags = { "have.charm-ring": 1 };
    expect(fittingsFor(flags, {}, "tamsin", "charm")).toEqual([]);
    expect(fittingsFor(flags, {}, "rhea", "charm")).toEqual(["charm-ring"]);
  });
  it("describes what a fitting does", () => {
    expect(fittingSummary(FITTINGS["cord-silk"])).toBe("Finesse +2, timing window +8%");
    expect(fittingSummary(FITTINGS["charm-number"])).toBe("Nerve +3, Heart -1");
  });
});

describe("settings", () => {
  it("fills in defaults, keeps the old auto timing choice, and rejects bad values", () => {
    expect(parseSettings(null)).toEqual(DEFAULTS);
    expect(parseSettings(null, "1").autoTiming).toBe(true);
    expect(parseSettings("{nonsense")).toEqual(DEFAULTS);
    const s = parseSettings(JSON.stringify({ music: 3, effects: 0.2, battleSpeed: 7, textSpeed: 1.6, alwaysRun: true }));
    expect(s).toMatchObject({ music: 1, effects: 0.2, battleSpeed: 1, textSpeed: 1.6, alwaysRun: true });
  });
});
