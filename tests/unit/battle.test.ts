import { describe, expect, it } from "vitest";
import { act, acting, createBattle, endRound, foeAct, foeMove, foeQueue, gradePress, seeded, skillsFor, targetsFor, unit, type BattleDef, type BattleState, type SkillBook } from "../../src/battle/rules";
import { BATTLES, SKILLS } from "../../src/battle/data";

const book: SkillBook = SKILLS;
const def: BattleDef = BATTLES["trail-wardens"];
const fresh = (seed = 1): BattleState => createBattle(def, book, seeded(seed));
const ids = (us: { id: string }[]) => us.map((u) => u.id);

describe("battle rules", () => {
  it("grades presses by distance from impact", () => {
    expect(gradePress(0.02)).toBe("perfect");
    expect(gradePress(-0.1)).toBe("good");
    expect(gradePress(-0.3)).toBe("early");
    expect(gradePress(0.3)).toBe("late");
  });

  it("starts on Rhea's turn with every foe showing an intent", () => {
    const s = fresh();
    expect(acting(s)?.id).toBe("rhea");
    for (const f of foeQueue(s)) expect(f.intent).not.toBeNull();
    // the reedcat always pounces at the back row
    expect(unit(s, "rc").intent?.target).toBe("tam");
  });

  it("melee only reaches the front row while it stands; ranged reaches anyone", () => {
    const s = fresh(), rhea = unit(s, "rhea");
    expect(ids(targetsFor(s, book, rhea, "strike"))).toEqual(["w1", "rc", "w2"]);
    expect(ids(targetsFor(s, book, unit(s, "tam"), "sling"))).toContain("wa");
    for (const id of ["w1", "rc", "w2"]) unit(s, id).hp = 0;
    expect(ids(targetsFor(s, book, rhea, "strike"))).toEqual(["wa"]);
  });

  it("a good strike deals more, brings Ash in for a follow-up, and fills the bond", () => {
    const a = fresh(7), b = fresh(7);
    const evA = act(a, book, "rhea", "strike", "w1", ["none"], seeded(3));
    const evB = act(b, book, "rhea", "strike", "w1", ["perfect"], seeded(3));
    const dealt = (ev: typeof evA) => ev.filter((e) => e.t === "hit").reduce((n, e) => n + (e.t === "hit" ? e.amt : 0), 0);
    expect(dealt(evB)).toBeGreaterThan(dealt(evA));
    expect(evA.some((e) => e.t === "follow")).toBe(false);
    expect(evB.some((e) => e.t === "follow" && e.by === "ash")).toBe(true);
    expect(b.bond).toBe(25);
    expect(acting(b)?.id).toBe("tam");
  });

  it("Ash covers Rhea once a round, then the second blow lands on her", () => {
    const s = fresh(); s.phase = "foe";
    unit(s, "w1").intent = { skill: "wstrike", target: "rhea" }; unit(s, "w2").intent = { skill: "wstrike", target: "rhea" };
    const e1 = foeAct(s, book, "w1", "none", seeded(1)).find((e) => e.t === "hit");
    const e2 = foeAct(s, book, "w2", "none", seeded(1)).find((e) => e.t === "hit");
    expect(e1).toMatchObject({ target: "ash", redirected: "cover", was: "rhea" });
    expect(e2).toMatchObject({ target: "rhea" });
  });

  it("a perfect brace takes far less damage", () => {
    const hitFor = (g: "none" | "perfect") => { const s = fresh(); s.phase = "foe"; unit(s, "ash").covered = true; unit(s, "w1").intent = { skill: "wstrike", target: "rhea" }; foeAct(s, book, "w1", g, seeded(5)); return 42 - unit(s, "rhea").hp; };
    expect(hitFor("perfect")).toBeLessThan(hitFor("none"));
  });

  it("smoke makes a foe lose its move, and hits on it count as an ambush", () => {
    const s = fresh();
    act(s, book, "rhea", "rally", "rhea", [], seeded(1));
    act(s, book, "tam", "smoke", "w2", [], seeded(1));
    expect(s.phase).toBe("foe");
    expect(foeMove(s, book, "w2", seeded(1))).toBe("stunned");
    expect(foeAct(s, book, "w2", "none", seeded(1))).toEqual([{ t: "stumble", id: "w2" }]);
    // a fresh smoke, then an ambush strike
    const s2 = fresh(); unit(s2, "w1").stunned = true;
    const ev = act(s2, book, "rhea", "strike", "w1", ["none"], seeded(1));
    expect(ev.find((e) => e.t === "hit")).toMatchObject({ tags: ["Ambush"] });
  });

  it("the foal song calms the reedcat away over a couple of turns, and wears their nerve", () => {
    const s = fresh(), rng = seeded(2);
    act(s, book, "rhea", "sing", "rc", ["perfect", "perfect", "perfect"], rng);
    expect(unit(s, "rc").calm).toBeGreaterThan(50);
    expect(unit(s, "rc").gone).toBe(false);
    s.turn = 0; s.phase = "ally";
    const ev = act(s, book, "rhea", "sing", "rc", ["good", "good", "good"], rng);
    expect(ev.find((e) => e.t === "calm")).toMatchObject({ left: true });
    expect(unit(s, "rc").gone).toBe(true);
    expect(s.resolve).toBe(85);
  });

  it("singing to Ash steadies him, and the steadied hit is stronger", () => {
    const s = fresh();
    act(s, book, "rhea", "sing", "ash", ["good", "good", "good"], seeded(1));
    expect(unit(s, "ash").steady).toBe(true);
  });

  it("a full bond unlocks the Call, which hits the whole front line and empties the meter", () => {
    const s = fresh(); s.bond = 100;
    expect(skillsFor(s, unit(s, "rhea"))[0]).toBe("call");
    const ev = act(s, book, "rhea", "call", "w1", ["good"], seeded(4));
    const hitIds = ev.filter((e) => e.t === "hit").map((e) => (e.t === "hit" ? e.target : ""));
    expect(hitIds).toEqual(["w1", "rc", "w2"]);
    expect(s.bond).toBe(0);
  });

  it("breaking their nerve wins with foes still standing (a rout)", () => {
    const s = fresh(); s.resolve = 5;
    const ev = act(s, book, "rhea", "strike", "w1", ["none"], seeded(1));
    expect(s.phase).toBe("won"); expect(s.routed).toBe(true);
    expect(ev.at(-1)).toEqual({ t: "end", result: "won" });
    expect(ev.find((e) => e.t === "rout")).toBeTruthy();
  });

  it("losing every fighter loses; Ash bolts rather than dying", () => {
    const s = fresh(); s.phase = "foe";
    unit(s, "ash").hp = 1; unit(s, "w1").intent = { skill: "wstrike", target: "rhea" };
    const ev = foeAct(s, book, "w1", "none", seeded(1));
    expect(ev.find((e) => e.t === "bolt")).toEqual({ t: "bolt", id: "ash" });
    unit(s, "tam").hp = 0; unit(s, "rhea").hp = 1; unit(s, "w2").intent = { skill: "wstrike", target: "rhea" };
    const ev2 = foeAct(s, book, "w2", "none", seeded(1));
    expect(s.phase).toBe("lost"); expect(ev2.at(-1)).toEqual({ t: "end", result: "lost" });
  });

  it("refuses moves out of turn or at the wrong target", () => {
    const s = fresh();
    expect(() => act(s, book, "tam", "sling", "wa", ["none"], seeded(1))).toThrow();
    expect(() => act(s, book, "rhea", "strike", "wa", ["none"], seeded(1))).toThrow();
  });

  it("a whole fight played with good timing ends in a win", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = fresh(seed), rng = seeded(seed * 31);
      let guard = 0;
      while (s.phase !== "won" && s.phase !== "lost" && guard++ < 200) {
        if (s.phase === "ally") {
          const u = acting(s)!, k = skillsFor(s, u).find((x) => book[x].dmg) ?? skillsFor(s, u)[0];
          const t = targetsFor(s, book, u, k)[0];
          act(s, book, u.id, k, t.id, ["good"], rng);
        } else {
          for (const f of foeQueue(s)) { if (s.phase !== "foe") break; foeAct(s, book, f.id, "good", rng); }
          endRound(s, book, rng);
        }
      }
      expect(s.phase, `seed ${seed}`).toBe("won");
    }
  });
});
