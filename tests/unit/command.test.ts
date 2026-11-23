import { describe, expect, it } from "vitest";
import { RANKS, atLeast, rankOf, rankTick } from "../../src/command/ranks";
import { NATIONS, allies, canMarch, demand, knownNations, marched, nation, owed, priceAt, reachable, sealPact, sendEnvoy, sendGift, standing, tribute } from "../../src/command/diplomacy";
import { ARMY_BATTLES, createArmy, tick } from "../../src/army/army";
import { attrsAt } from "../../src/cast/attributes";
import { seeded } from "../../src/battle/rules";

type F = Record<string, boolean | number | string>;
const envoy = { id: "tam", name: "Tamsin", attrs: attrsAt("rhea", 18) };

describe("ranks", () => {
  it("each rank opens more than the last, and the ladder starts at Recruit", () => {
    expect(rankOf({}).id).toBe("Recruit");
    for (let i = 1; i < RANKS.length; i++) { expect(RANKS[i].pay).toBeGreaterThan(RANKS[i - 1].pay); expect(RANKS[i].party).toBeGreaterThanOrEqual(RANKS[i - 1].party); expect(RANKS[i].opens.length).toBeGreaterThan(0); }
    expect(atLeast({ rank: "Captain" }, "Lieutenant")).toBe(true);
    expect(atLeast({ rank: "Sergeant" }, "Lieutenant")).toBe(false);
  });
  it("pays once per new stage and announces a promotion once", () => {
    const f: F = { rank: "Recruit", stage: "a1" };
    expect(rankTick(f, "a1")).toMatchObject({ moved: false, pay: 0 });
    expect(rankTick(f, "a1").promoted).toBeUndefined();
    expect(rankTick(f, "a2")).toMatchObject({ moved: true, pay: 2 });
    expect(rankTick(f, "a2").pay).toBe(0);
    f.rank = "Sergeant";
    expect(rankTick(f, "a2").promoted?.id).toBe("Sergeant");
    expect(rankTick(f, "a2").promoted).toBeUndefined();
  });
});

describe("diplomacy", () => {
  it("every nation's march is a real army battle, and an attacking one", () => {
    for (const n of NATIONS) if (n.march) { expect(ARMY_BATTLES[n.march]?.attack).toBe(true); expect(ARMY_BATTLES[n.march].plan.length).toBeGreaterThan(0); }
    expect(new Set(NATIONS.map((n) => n.id)).size).toBe(NATIONS.length);
  });
  it("nations show from their stage, and far lands stay out of reach", () => {
    expect(knownNations({ stage: "a1" }).map((n) => n.id)).toEqual(["cloudline", "millbridge", "guild"]);
    expect(knownNations({ stage: "ad20" }).length).toBe(NATIONS.length);
    expect(reachable({}, "cloudline")).toBe(true);
    expect(reachable({ stage: "a1" }, "vale")).toBe(true);
    expect(reachable({ stage: "ad20" }, "ember")).toBe(false);
  });
  it("envoys and gifts need an officer, and only once a stage", () => {
    const n = nation("cloudline")!, f: F = { stage: "ad5", rank: "Sergeant" };
    expect(sendEnvoy(f, 100, n, envoy, () => 0.5).ok).toBe(false);
    f.rank = "Lieutenant";
    const r = sendEnvoy(f, 100, n, envoy, () => 0.5);
    expect(r.ok).toBe(true); expect(r.coin).toBe(90); expect(standing(f, n)).toBeGreaterThan(n.start);
    expect(sendEnvoy(f, 100, n, envoy, () => 0.5).ok).toBe(false);
    f.supplies = 30;
    expect(sendGift(f, 100, n).ok).toBe(true); expect(f.supplies).toBe(15);
    expect(sendGift(f, 100, n).ok).toBe(false);
  });
  it("Millbridge's standing follows the town's trust in the story", () => {
    const n = nation("millbridge")!;
    expect(standing({ millbridgeTrust: 20 }, n)).toBe(n.start + 20);
  });
  it("a pact needs the whole price, then pays: tribute, discount, an allied company", () => {
    const n = nation("cloudline")!, f: F = { stage: "ad20", rank: "Captain", supplies: 10, "standing.cloudline": 55 };
    expect(owed(f, 50, n).length).toBe(2);
    expect(sealPact(f, 50, n).ok).toBe(false);
    f.supplies = 30;
    const r = sealPact(f, 200, n);
    expect(r.ok).toBe(true); expect(r.coin).toBe(80); expect(f.supplies).toBe(10); expect(f["nation.cloudline"]).toBe("pact");
    expect(tribute(f).supplies).toBe(5);
    expect(allies(f)[0].name).toBe("Clan slingers");
    const m = nation("millbridge")!, g: F = { corranFate: "millbridge", rank: "Captain", stage: "ad20" };
    expect(sealPact(g, 0, m).ok).toBe(true);
    expect(priceAt(g, "millbridge", 20)).toBe(17); expect(priceAt(g, "cinderwick", 20)).toBe(20);
  });
  it("a far nation's pact waits on its own storyline", () => {
    const n = nation("hollin")!, f: F = { stage: "ad20", rank: "Captain", "standing.hollin": 90, supplies: 100 };
    expect(owed(f, 999, n).length).toBeGreaterThan(0);
  });
  it("demands turn a nation hostile; only then can the Commons march, and a win holds them", () => {
    const n = nation("millcities")!, f: F = { stage: "ad20", rank: "Captain", "open.vale-millcities": true };
    expect(canMarch(f, n)).toMatch(/hostility/);
    demand(f, 0, n, attrsAt("rhea", 18), () => 0.99);
    expect(standing(f, n)).toBe(-40);
    expect(canMarch(f, n)).toBeNull();
    marched(f, 100, n, true);
    expect(f["nation.millcities"]).toBe("held");
    expect(tribute(f).coin).toBe(3 + 5);
    expect(allies(f).length).toBe(0);
  });
  it("an attacking army that sits still loses when daylight runs out", () => {
    const def = ARMY_BATTLES["march-millbridge"], s = createArmy(def, {}), r = seeded(2);
    for (let t = 0; t < 500 && !s.over; t += 0.1) tick(s, 0.1, r);
    expect(s.over).toBe("lost");
  });
});
