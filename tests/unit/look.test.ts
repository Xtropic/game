import { describe, expect, it } from "vitest";
import thornwick from "../../data/maps/thornwick.json";
import { WORKS, withWorks } from "../../src/base/look";
import { WorldMap, type MapFile } from "../../src/world/map";
import { STORY } from "../../src/world/content";
import { foeChoice, createBattle, seeded, type SkillBook, type BattleDef } from "../../src/battle/rules";
import skills from "../../data/battle/skills.json";

const all = Object.fromEntries(Object.entries(WORKS).map(([b, lv]) => [`base.lv.${b}`, lv.length - 1]));

describe("Thornwick's works", () => {
  it("draws every building at every level into a valid map", () => {
    for (let n = 0; n <= 3; n++) {
      const f = Object.fromEntries(Object.keys(WORKS).map((b) => [`base.lv.${b}`, n]));
      expect(() => new WorldMap(withWorks(thornwick as unknown as MapFile, f))).not.toThrow();
    }
  });
  it("keeps the ledger crate first, and never builds on anyone the story stands at Thornwick", () => {
    const m = new WorldMap(withWorks(thornwick as unknown as MapFile, all));
    let first: [number, number] | null = null;
    for (let y = 0; y < m.height && !first; y++) for (let x = 0; x < m.width; x++) if (m.kindAt(x, y) === "crate") { first = [x, y]; break; }
    expect(first).toEqual([16, 13]);
    const base = new WorldMap(thornwick as unknown as MapFile);
    for (const a of STORY.actors.filter((a) => a.map === "thornwick")) {
      if (base.kindAt(a.x, a.y) !== m.kindAt(a.x, a.y)) throw new Error(`${a.id} at ${a.x},${a.y} is built over`);
    }
  });
});

describe("foes", () => {
  const book = ((skills as { skills?: SkillBook }).skills ?? skills) as SkillBook;
  const def: BattleDef = { id: "t", name: "t", backdrop: "road", intro: [], units: [
    { id: "rhea", name: "Rhea", look: "rhea", side: "ally", row: "front", cast: "rhea", skills: ["strike"], at: [60, 100] },
    { id: "w1", name: "Sergeant", look: "warden", side: "foe", row: "front", cast: "warden", level: 14, skills: ["wstrike"], at: [168, 92] },
    { id: "w2", name: "Warden", look: "warden", side: "foe", row: "front", cast: "warden", level: 12, skills: ["wstrike"], at: [160, 126] },
  ] };
  it("seasoned foes learn more than one move, and the leader rallies", () => {
    const s = createBattle(def, book, seeded(1), { rhea: 14 });
    expect(s.units.find((u) => u.id === "w1")!.skills).toEqual(["wstrike", "guard", "smoke", "rally"]);
    expect(s.units.find((u) => u.id === "w2")!.skills).toEqual(["wstrike", "guard", "smoke"]);
  });
  it("a foe rallies or guards a badly hurt friend some of the time", () => {
    const s = createBattle(def, book, seeded(2), { rhea: 14 });
    const w1 = s.units.find((u) => u.id === "w1")!, w2 = s.units.find((u) => u.id === "w2")!;
    w2.hp = 2;
    const rng = seeded(3), picks = new Set<string>();
    for (let i = 0; i < 60; i++) picks.add(foeChoice(s, book, w1, rng)!.skill);
    expect(picks.has("rally") || picks.has("guard")).toBe(true);
    expect(picks.has("wstrike")).toBe(true);
  });
});
