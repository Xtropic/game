import { describe, expect, it } from "vitest";
import { BUILDINGS, RECIPES, raidCheck, raidDue, raidOver, baseDay, bestJob, canRaise, coinForFoe, levelOf, penChoices, penPlan, setPenPlan, startRaise, supplies } from "../../src/base/base";
import { attrsAt } from "../../src/cast/attributes";
import { ITEMS } from "../../src/gear/items";
import { SOURCES, starterAsh } from "../../src/kith/upbringing";
import { seeded } from "../../src/battle/rules";
import type { Flags } from "../../src/story/story";

const worker = (id: string) => ({ id, name: id, attrs: attrsAt(id, 12) });

describe("Thornwick", () => {
  it("every building's jobs, recipes and pen choices point at real things", () => {
    for (const b of Object.values(BUILDINGS)) { expect(b.levels.length).toBeGreaterThan(1); expect(b.levels[0].coin).toBe(0); }
    for (const [id, r] of Object.entries(RECIPES)) { expect(ITEMS[id], id).toBeDefined(); expect(BUILDINGS[r.in], r.in).toBeDefined(); }
    for (let lv = 0; lv < 3; lv++) for (const list of Object.values(penChoices(lv))) for (const s of list) expect(SOURCES[s], s).toBeDefined();
  });

  it("raising a building costs coin and supplies, then takes builders' days", () => {
    const f: Flags = { supplies: 40 };
    expect(canRaise(f, 10, "forge").ok).toBe(false);
    const left = startRaise(f, 100, "forge");
    expect(left).toBe(40); expect(supplies(f)).toBe(15); expect(f["base.build"]).toBe("forge");
    expect(canRaise(f, 999, "pens").ok).toBe(false); // one project at a time
    f["base.job.oren"] = "build";
    let days = 0;
    while (levelOf(f, "forge") === 0 && days < 30) { baseDay({ flags: f, coin: 0, workers: [worker("oren")], kith: [], rng: seeded(1) }); days++; }
    expect(levelOf(f, "forge")).toBe(1); expect(days).toBeGreaterThan(1); expect(days).toBeLessThan(10);
  });

  it("traders earn coin, haulers bring supplies, crafters make items from supplies", () => {
    const f: Flags = { supplies: 20, "base.lv.workshop": 1, "base.make.workshop": "firepot", "base.job.dorrit": "trade", "base.job.oren": "haul", "base.job.oda": "craft" };
    let coin = 0;
    for (let d = 0; d < 5; d++) coin = baseDay({ flags: f, coin, workers: ["dorrit", "oren", "oda"].map(worker), kith: [], rng: seeded(d) }).coin;
    expect(coin).toBeGreaterThan(0);
    expect(Number(f["have.firepot"] ?? 0)).toBeGreaterThan(0);
  });

  it("kith in the pens are raised by their plan", () => {
    const f: Flags = { "base.lv.pens": 2, "base.job.hesk": "kith" }, ash = starterAsh();
    setPenPlan(f, ash.id, "feed", "feed:marrow-broth");
    expect(penPlan(f, ash.id, 2).feed).toBe("feed:marrow-broth");
    expect(penPlan(f, ash.id, 0).feed).toBe(penChoices(0).feed[0]); // not open at a rope corral
    const before = JSON.stringify(ash.habits ?? []);
    baseDay({ flags: f, coin: 0, workers: [worker("hesk")], kith: [ash], rng: seeded(2) });
    expect(JSON.stringify(ash.habits)).not.toBe(before);
  });

  it("people foes carry coin, kith don't; everyone has a best job", () => {
    expect(coinForFoe(4)).toBeGreaterThan(coinForFoe(1)); expect(coinForFoe(4, true)).toBe(0);
    expect(bestJob(attrsAt("hesk", 10))).toBeTruthy();
  });

  it("Warden columns come now and then in quiet times, with warning, and a lost raid costs stores and coin", () => {
    const f: Flags = { "base.open": true, "base.day": 20, supplies: 40 };
    expect(raidCheck(f, "ad5", () => 0)).toBeUndefined(); // the night at Lockside: not now
    expect(raidCheck(f, "ad11", () => 0)).toContain("2 days out");
    expect(raidDue(f)).toBe(false); f["base.day"] = 22; expect(raidDue(f)).toBe(true);
    const r = raidOver(f, 100, false); expect(r.coin).toBe(75); expect(f.supplies).toBe(20); expect(raidDue(f)).toBe(false);
    expect(raidCheck(f, "ad11", () => 0)).toBeUndefined(); // not again so soon
  });
});
