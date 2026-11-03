import { describe, expect, it } from "vitest";
import { attrsAt } from "../../src/cast/attributes";
import { RECRUITS } from "../../src/cast/recruits";
import { BATTLES, SKILLS } from "../../src/battle/data";
import { createBattle, seeded, timingOf, unit } from "../../src/battle/rules";
import { FITTINGS, KEEPSAKES, MASTERWORK, NAMED, TIERS, TYPES, canReforge, fits, reforge, techniques, weaponName, withGear } from "../../src/gear/weapons";

describe("keepsake weapons", () => {
  it("every party recruit has a keepsake with two branches and a technique per tier", () => {
    for (const r of RECRUITS.filter((x) => x.role === "party")) {
      const k = KEEPSAKES[r.id]; expect(k, r.id).toBeDefined();
      expect(TYPES[k.type], `${r.id} type`).toBeDefined(); expect(k.branches.length).toBe(2); expect(k.techniques.length).toBe(TIERS.length - 1);
    }
  });

  it("reforges up the tiers: forge level, a branch at Masterwork, a story moment for Named", () => {
    let l = { tier: 0 };
    expect(canReforge(l, { forgeLevel: 0, coin: 999 }).ok).toBe(false);
    l = reforge(l, { forgeLevel: 1, coin: 999 }).loadout; expect(l.tier).toBe(1);
    l = reforge(l, { forgeLevel: 2, coin: 999 }).loadout;
    expect(canReforge(l, { forgeLevel: 3, coin: 999 }).why).toMatch(/Choose/);
    l = reforge(l, { forgeLevel: 3, coin: 999, branch: "shepherd" }).loadout; expect(l.tier).toBe(MASTERWORK);
    expect(weaponName("rhea", l)).toBe("Masterwork Shepherd's Hook");
    expect(canReforge(l, { forgeLevel: 3, coin: 9999 }).why).toMatch(/story/);
    l = reforge(l, { forgeLevel: 3, coin: 9999, named: true }).loadout; expect(l.tier).toBe(NAMED);
    expect(techniques("rhea", l).length).toBe(4);
    expect(canReforge(l, { forgeLevel: 3, coin: 9999, named: true }).ok).toBe(false);
  });

  it("a skilled smith makes reforging cheaper", () => {
    const plain = canReforge({ tier: 1 }, { forgeLevel: 3, coin: 999 }).cost;
    const smith = canReforge({ tier: 1 }, { forgeLevel: 3, coin: 999, smith: attrsAt("oren", 30) }).cost;
    expect(smith).toBeLessThan(plain);
  });

  it("fittings go in their own slot and tune attributes", () => {
    expect(fits("charm-ring", "charm")).toBe(true); expect(fits("charm-ring", "work")).toBe(false);
    for (const [id, f] of Object.entries(FITTINGS)) expect(["work", "charm"], id).toContain(f.slot);
    const a = attrsAt("rhea", 3), g = withGear(a, { tier: 0, work: "edge-warden-steel", charm: "charm-ring" });
    expect(g.might).toBe(a.might + 3); expect(g.nerve).toBe(a.nerve + 2);
  });

  it("feeds party battles: a higher tier hits harder and fittings widen timing", () => {
    const def = BATTLES["trail-wardens"];
    const plain = createBattle(def, SKILLS, seeded(1)), kitted = createBattle(def, SKILLS, seeded(1), {}, { rhea: { tier: 3, branch: "reaper", work: "grip-wrapped" } });
    expect(unit(kitted, "rhea").weapon).toBeGreaterThan(unit(plain, "rhea").weapon);
    expect(timingOf(unit(kitted, "rhea"))).toBeGreaterThan(timingOf(unit(plain, "rhea")));
  });
});
