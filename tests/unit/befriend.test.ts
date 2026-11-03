import { describe, expect, it } from "vitest";
import { FOOD, OFFERS, foodFor, lingerLine, songReach, trustChance } from "../../src/kith/befriend";
import { SPECIES } from "../../src/kith/kith";

describe("winning kith over", () => {
  it("every family has a food, and the foods Rhea carries cover the kith met so far", () => {
    const families = new Set(Object.values(SPECIES).map((s) => s.family).filter(Boolean));
    for (const f of families) expect(FOOD[f!], f).toBeDefined();
    expect(OFFERS).toContain(foodFor("reedcat")); expect(OFFERS).toContain(foodFor("terrace-doe"));
  });
  it("the right food matters most, and temperament decides the rest", () => {
    expect(trustChance("reedcat", "gentle", "dried fish", 10, 0)).toBeGreaterThan(0.8);
    expect(trustChance("reedcat", "gentle", "salt lick", 10, 0)).toBeLessThan(0.4);
    expect(trustChance("reedcat", "stubborn", "dried fish", 10, 0)).toBeLessThan(trustChance("reedcat", "curious", "dried fish", 10, 0));
  });
  it("a proud kith won't hear the song until it's been beaten down; a skittish one needs more of it", () => {
    expect(songReach("proud", 0.9)).toBe(0); expect(songReach("proud", 0.4)).toBeGreaterThan(1);
    expect(songReach("skittish", 1)).toBeLessThan(songReach("gentle", 1));
  });
  it("hints at what it wants without naming it", () => {
    const l = lingerLine("reedcat"); expect(l).toContain("wind comes off the water"); expect(l).not.toContain("fish");
  });
});

import wild from "../../data/story/wild.json";
import { MAPS } from "../../src/world/content";
describe("shy kith", () => {
  it("each stands in the open on its land, and the food that brings it is the one its kind wants", () => {
    for (const a of wild.actors) {
      const m = MAPS[a.map]; expect(m, a.map).toBeDefined();
      expect(["meadow", "plains", "hills"], `${a.id} on ${m.legend[m.rows[a.y][a.x]]}`).toContain(m.legend[m.rows[a.y][a.x]]);
      const script = Object.values(wild.scripts).find((s) => JSON.stringify(s).includes(`"id":"${a.id}"`))!;
      const gift = JSON.stringify(script).match(/"label":"Leave out ([a-z ]+)","do":\[[^\]]*"kith"/);
      const sp = JSON.stringify(script).match(/"species":"([a-z-]+)"/)![1];
      expect(gift?.[1] ?? JSON.stringify(script).match(/Leave out ([a-z ]+)","do":\[\{"say":"","text":"You set the \1 on a flat stone/)?.[1]).toBe(foodFor(sp));
    }
  });
});
