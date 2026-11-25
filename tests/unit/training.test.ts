import { describe, expect, it } from "vitest";
import { DRILLS, GRADES, autoScore, cannotTrain, careNight, drillOf, gradeOf, setDrill, spendTime, train, trainingDay, energyOf, aptitude } from "../../src/kith/training";
import { SPECIES, TRAITS } from "../../src/kith/kith";
import { ATTRS } from "../../src/cast/attributes";
import { starterAsh } from "../../src/kith/upbringing";
import { baseDay } from "../../src/base/base";
import { seeded } from "../../src/battle/rules";
import type { Flags } from "../../src/story/story";

const d = (id: string) => DRILLS.find((x) => x.id === id)!;

describe("kith training", () => {
  it("has one drill per attribute, each teaching a real technique", () => {
    expect(new Set(DRILLS.map((x) => x.attr))).toEqual(new Set(ATTRS));
    expect(new Set(DRILLS.map((x) => x.game)).size).toBe(DRILLS.length);
    for (const x of DRILLS) { expect(TRAITS[x.trait], x.trait).toBeDefined(); expect(ATTRS).toContain(x.side); }
    expect(SPECIES.loftbuck).toBeDefined();
    expect(GRADES.map((g) => g.min)).toEqual([...GRADES.map((g) => g.min)].sort((a, b) => a - b));
  });

  it("grades a score, and an unattended session never beats Good", () => {
    expect(gradeOf(0.1).id).toBe("poor"); expect(gradeOf(0.6).id).toBe("good"); expect(gradeOf(0.97).id).toBe("perfect");
    const ash = starterAsh();
    for (let r = 0; r < 1; r += 0.1) expect(autoScore(ash, d("sledge"), 3, r)).toBeLessThanOrEqual(0.62);
    const f: Flags = {}; const o = train(f, ash, d("sledge"), 1, false, seeded(1));
    expect(o.grade.id).toBe("good");
    expect(aptitude(ash, d("sledge"))).toBeGreaterThanOrEqual(0);
  });

  it("an attended Perfect drills the attribute and its partner, and teaches the technique once", () => {
    const f: Flags = { "base.day": 3 }, ash = starterAsh(), mi = ATTRS.indexOf("might"), gi = ATTRS.indexOf("grit");
    const o = train(f, ash, d("sledge"), 0.99, true, seeded(2));
    expect(o.grade.id).toBe("perfect"); expect(ash.trained[mi]).toBe(2); expect(ash.trained[gi]).toBe(1);
    expect(o.trait).toBe("iron-hoof"); expect(ash.traits).toContain("iron-hoof"); expect(o.bond).toBeGreaterThan(0);
    expect(energyOf(ash)).toBe(70);
    expect(cannotTrain(f, ash, d("cups"), 2)).toMatch(/trained today/);
    f["base.day"] = 4; ash.energy = 100;
    const again = train(f, ash, d("sledge"), 0.99, true, seeded(3));
    expect(again.trait).toBeUndefined();
  });

  it("drills stop at the training cap", () => {
    const f: Flags = {}, ash = starterAsh(), mi = ATTRS.indexOf("might");
    for (let day = 0; day < 20; day++) { f["base.day"] = day; ash.energy = 100; train(f, ash, d("sledge"), 0.9, true, seeded(day)); }
    expect(ash.trained[mi]).toBe(2 + ash.potential[mi] * 2);
  });

  it("tired kith can't train; rest brings energy back; spirits drift to content", () => {
    const f: Flags = { "base.day": 1 }, ash = starterAsh();
    ash.energy = 10; expect(cannotTrain(f, ash, d("sledge"), 2)).toMatch(/too tired/);
    careNight(f, ash, "work:rest"); expect(energyOf(ash)).toBeGreaterThan(50);
    ash.spirits = 10; for (let i = 0; i < 30; i++) careNight(f, ash, "work:haul"); expect(ash.spirits).toBeGreaterThan(45);
    expect(cannotTrain(f, ash, d("show"), 1)).toMatch(/pens need/);
  });

  it("spending time is once a day and lifts bond and spirits", () => {
    const f: Flags = { "base.day": 2 }, ash = starterAsh(), b = ash.bond;
    expect(spendTime(f, ash).ok).toBe(true); expect(ash.bond).toBeGreaterThan(b);
    expect(spendTime(f, ash).ok).toBe(false);
    f["base.day"] = 3; expect(spendTime(f, ash).ok).toBe(true);
  });

  it("a daily drill runs at the end of each day at Thornwick, and a tired carrier may wake the bone sickness", () => {
    const f: Flags = { "base.lv.pens": 1 }, ash = starterAsh();
    setDrill(f, ash.id, "cups"); expect(drillOf(f, ash.id)?.id).toBe("cups");
    baseDay({ flags: f, coin: 0, workers: [], kith: [ash], rng: seeded(5) });
    expect(f["drilled.ash"]).toBe(0); expect(f["base.day"]).toBe(1); expect(ash.xp + ash.level).toBeGreaterThan(5);
    let woke = false;
    for (let i = 0; i < 40 && !woke; i++) { const k = { ...starterAsh(), carrier: true, energy: 40, traits: [] as string[] }; woke = !!train({ "base.day": i }, k, d("carry"), 0.5, true, seeded(i)).sick; }
    expect(woke).toBe(true);
    const sick = { ...starterAsh(), traits: ["bone-sickness"] };
    expect(cannotTrain({}, sick, d("sledge"), 2)).toMatch(/Gentle/); expect(cannotTrain({}, sick, d("call"), 2)).toBeNull();
    expect(trainingDay({}, [], () => "work:rest", 0, 0, seeded(1))).toEqual([]);
  });
});
