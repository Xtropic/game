import { describe, expect, it } from "vitest";
import { TOURNEYS, cannotEnter, champions, entrants, kithRank, roundBattle, tourney } from "../../src/kith/tourney";
import { EXPEDITIONS, away, cannotSend, expedition, expeditionDay, odds, send } from "../../src/kith/expedition";
import { SPECIES, wildKith, type Kith } from "../../src/kith/kith";
import { FITTINGS } from "../../src/gear/weapons";
import { createBattle } from "../../src/battle/rules";
import { SKILLS } from "../../src/battle/data";
import { seeded } from "../../src/battle/rules";

type F = Record<string, boolean | number | string>;
const pup = (id: string, level = 8): Kith => wildKith("reedcat", level, seeded(3), id);

describe("kith tournaments", () => {
  it("events climb one rank at a time, Yearling to Crown, and every foe and prize exists", () => {
    TOURNEYS.forEach((t) => { expect(t.gives).toBe(t.needs + 1); for (const r of t.rounds) for (const fo of r.foes) expect(SPECIES[fo.species]).toBeTruthy(); if (t.prize.fitting) expect(FITTINGS[t.prize.fitting]).toBeTruthy(); });
    expect(new Set(TOURNEYS.map((t) => t.gives))).toEqual(new Set([1, 2, 3, 4, 5]));
  });
  it("only kith of the rank below may enter, within the team size and the fee", () => {
    const t = tourney("drove-fair")!, f: F = {}, a = pup("a"), b = pup("b"), c = pup("c");
    expect(entrants(f, { a, b }, t).length).toBe(2);
    expect(cannotEnter(f, 100, t, [a, b, c])).toMatch(/at most/);
    expect(cannotEnter(f, 2, t, [a])).toMatch(/fee/);
    expect(cannotEnter(f, 100, t, [a])).toBeNull();
    f["krank.a"] = 1;
    expect(cannotEnter(f, 100, t, [a])).toMatch(/too high/);
    expect(cannotEnter(f, 100, tourney("canal-cup")!, [a])).toMatch(/Terrace/);
  });
  it("a round is a real battle: your kith against theirs, nobody else", () => {
    const t = tourney("drove-fair")!, team = [pup("a"), pup("b")];
    const def = roundBattle(t, 2, team, seeded(1));
    expect(def.units.filter((u) => u.side === "ally").map((u) => u.id)).toEqual(["a", "b"]);
    const s = createBattle(def, SKILLS, seeded(1), {}, {}, { a: team[0], b: team[1] });
    expect(s.units.filter((u) => u.side === "foe").length).toBe(2);
  });
  it("winning the final ranks the team, pays the purse and the prize once", () => {
    const t = tourney("drove-fair")!, f: F = {}, a = pup("a");
    const first = champions(f, t, [a]);
    expect(kithRank(f, "a")).toBe(1); expect(first.coin).toBe(40); expect(f["have.charm-ribbon"]).toBe(1);
    const again = champions(f, t, [pup("z")]);
    expect(again.coin).toBe(13); expect(f["have.charm-ribbon"]).toBe(1);
  });
});

describe("kith expeditions", () => {
  it("each has one goal that exists", () => {
    for (const e of EXPEDITIONS) expect(!!e.goal.trait !== !!e.goal.fitting).toBe(true);
  });
  it("a kith goes, is away for its days, and comes back better at the tested attribute", () => {
    const f: F = {}, k = pup("a", 10), e = expedition("cloud-forest-night")!, kith = { a: k };
    expect(cannotSend(f, k, e, false)).toMatch(/isn't open/);
    expect(cannotSend(f, k, e, true)).toBeNull();
    send(f, k, e);
    expect(away(f, "a")?.left).toBe(1);
    const before = k.trained[4], lv = k.level;
    const lines = expeditionDay(f, kith, () => 0);
    expect(lines[0]).toMatch(/learned/); expect(k.traits).toContain("night-eyed");
    expect(k.trained[4]).toBe(before + 1); expect(k.level).toBeGreaterThanOrEqual(lv);
    expect(away(f, "a")).toBeUndefined();
  });
  it("a fitting goal lands in the pack; harder roads have worse odds for a weak kith", () => {
    const f: F = {}, k = pup("a", 6), e = expedition("drove-bells")!;
    send(f, k, e); expeditionDay(f, { a: k }, () => 0); expect(away(f, "a")?.left).toBe(1);
    expeditionDay(f, { a: k }, () => 0); expect(f["have.charm-bell"]).toBe(1);
    expect(odds(k, expedition("storm-feathers")!)).toBeLessThan(odds(k, expedition("cloud-forest-night")!));
  });
});
