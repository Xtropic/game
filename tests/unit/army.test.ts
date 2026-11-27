import { describe, expect, it } from "vitest";
import { ARMY_BATTLES, createArmy, give, live, orderDelay, suggestOfficers, terrainAt, tick } from "../../src/army/army";
import { attrsAt } from "../../src/cast/attributes";
import { seeded } from "../../src/battle/rules";

const def = ARMY_BATTLES["thornwick-raid"];
const officers = (lv: number) => Object.fromEntries(def.ours.map((c) => [c.id, { attrs: attrsAt("rhea", lv) }]));
const run = (s: ReturnType<typeof createArmy>, secs: number) => { const r = seeded(4); for (let t = 0; t < secs && !s.over; t += 0.1) tick(s, 0.1, r); };

describe("army battles", () => {
  it("the field and every company make sense", () => {
    expect(terrainAt(createArmy(def, {}), 19.5, 5.5)).toBe("gate");
    for (const st of def.stratagems) expect(st.name).toBeTruthy();
    for (const p of def.plan) for (const o of p.orders) expect(def.theirs.some((c) => c.id === o.company)).toBe(true);
  });
  it("the enemy plan runs: the column crosses the ford and reaches the gate", () => {
    const s = createArmy(def, officers(12)); run(s, 30);
    const f = s.cos.find((c) => c.id === "w-foot1")!;
    expect(f.y).toBeLessThan(14); expect(s.planDone).toContain(0); expect(s.planDone).toContain(1);
  });
  it("a strong garrison that sits tight holds; a weak one breaks", () => {
    const strong = createArmy(def, officers(30), "stakes"); run(strong, 200); expect(strong.over).toBe("won");
    const weak = createArmy(def, officers(1)); for (const c of weak.cos) if (c.side === "ours") { c.men = Math.round(c.men / 4); c.max = c.men; } run(weak, 200);
    expect(weak.over).toBe("lost");
  });
  it("orders take longer to reach companies far from your own; hidden riders strike hard", () => {
    const s = createArmy(def, officers(10), "ambush");
    expect(orderDelay(s, s.cos.find((c) => c.id === "riders")!)).toBeGreaterThan(orderDelay(s, s.cos.find((c) => c.id === "gate")!));
    expect(s.cos.find((c) => c.id === "riders")!.hidden).toBe(true);
    expect(give(s, "riders", { kind: "attack", target: "w-horse" })).toBeGreaterThan(0);
    expect(live(s, "theirs").length).toBe(7);
  });
  it("officers are matched to companies by what they're good at", () => {
    const pool = ["tamsin", "brannoc", "ferris", "ketti", "oakes"].map((id) => ({ id, attrs: attrsAt(id, 12) }));
    const pick = suggestOfficers(def, pool, "rhea");
    expect(pick.hq).toBe("rhea"); expect(new Set(Object.values(pick)).size).toBe(Object.values(pick).length);
  });
});
