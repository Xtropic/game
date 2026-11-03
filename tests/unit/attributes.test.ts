import { describe, expect, it } from "vitest";
import { ATTRS, MAX_LEVEL, PEOPLE, addXp, attrsAt, checkChance, command, duel, gains, jobSkill, party, xpToNext } from "../../src/cast/attributes";
import { RECRUITS } from "../../src/cast/recruits";
import { BATTLES, SKILLS } from "../../src/battle/data";
import { createBattle, seeded, unit } from "../../src/battle/rules";

describe("attributes", () => {
  it("every recruit, and every cast member in a battle, has a growth profile", () => {
    for (const r of RECRUITS) expect(PEOPLE[r.id], r.id).toBeDefined();
    for (const b of Object.values(BATTLES)) for (const u of b.units) if (u.cast) expect(PEOPLE[u.cast], u.cast).toBeDefined();
  });

  it("never go down with a level, and stay in a sane range at the cap", () => {
    for (const id of Object.keys(PEOPLE)) {
      let prev = attrsAt(id, 1);
      for (let L = 2; L <= MAX_LEVEL; L++) { const a = attrsAt(id, L); for (const k of ATTRS) expect(a[k], `${id} ${k} L${L}`).toBeGreaterThanOrEqual(prev[k]); prev = a; }
      for (const k of ATTRS) { expect(prev[k], `${id} ${k}`).toBeGreaterThanOrEqual(3); expect(prev[k], `${id} ${k}`).toBeLessThanOrEqual(75); }
    }
  });

  it("lean a character toward their strengths", () => {
    const b = attrsAt("brannoc", 30), f = attrsAt("fennick", 30);
    expect(b.grit).toBeGreaterThan(f.grit); expect(f.wits).toBeGreaterThan(b.wits);
    expect(jobSkill(b, "build")).toBeGreaterThan(jobSkill(f, "build"));
    expect(jobSkill(f, "records")).toBeGreaterThan(jobSkill(b, "records"));
  });

  it("apply modifiers: a fresh lull steadies nerve and dulls heart", () => {
    const clean = attrsAt("corran", 12), worn = attrsAt("corran", 12, ["lull"]);
    expect(worn.nerve).toBe(clean.nerve + 3); expect(worn.heart).toBeLessThan(clean.heart); expect(worn.wits).toBe(clean.wits - 2);
  });

  it("level up through experience, reporting each level reached", () => {
    const { progress, levels } = addXp({ level: 3, xp: 0 }, xpToNext(3) + xpToNext(4) + 5);
    expect(progress).toEqual({ level: 5, xp: 5 }); expect(levels).toEqual([4, 5]);
    expect(addXp({ level: MAX_LEVEL, xp: 0 }, 9999).progress.level).toBe(MAX_LEVEL);
    const g = gains("rhea", 1, 20); expect(Object.keys(g).length).toBeGreaterThan(3);
  });

  it("feed every system with bounded numbers", () => {
    const strong = attrsAt("halloran", 28), weak = attrsAt("bee", 1);
    expect(party.power(strong, weak, "melee")).toBeGreaterThan(1); expect(party.power(weak, strong, "melee")).toBeLessThan(1);
    expect(party.power(strong, weak, "melee")).toBeLessThanOrEqual(2.2);
    expect(command.unitSize(attrsAt("kane", 15))).toBeGreaterThan(command.unitSize(attrsAt("fennick", 7)));
    expect(command.morale(strong)).toBeLessThanOrEqual(100);
    expect(duel.read(attrsAt("finch", 18))).toBeGreaterThan(duel.read(attrsAt("gerd", 12)));
    expect(checkChance(attrsAt("ilse", 9), "presence", 8)).toBeGreaterThan(checkChance(attrsAt("ilse", 9), "might", 8));
    for (const x of [checkChance(strong, "might", 1), checkChance(weak, "might", 60)]) { expect(x).toBeGreaterThanOrEqual(0.05); expect(x).toBeLessThanOrEqual(0.95); }
  });

  it("set party-battle health from grit and level, and higher levels hit harder", () => {
    const lo = createBattle(BATTLES["trail-wardens"], SKILLS, seeded(1));
    const hi = createBattle(BATTLES["trail-wardens"], SKILLS, seeded(1), { rhea: 20 });
    expect(unit(lo, "rhea").maxHp).toBe(party.maxHp(attrsAt("rhea", 3), 3));
    expect(unit(hi, "rhea").maxHp).toBeGreaterThan(unit(lo, "rhea").maxHp);
    expect(unit(hi, "rhea").level).toBe(20);
    expect(unit(lo, "w1").maxHp).toBe(26); // foes with a set health keep it
  });
});
