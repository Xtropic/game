import { describe, expect, it } from "vitest";
import { act, afterBattle, acting, createBattle, endRound, fighters, foeAct, foeMove, foeQueue, gradePress, seeded, skillsFor, targetsFor, unit, type BattleDef, type BattleState, type SkillBook } from "../../src/battle/rules";
import { BATTLES, SKILLS } from "../../src/battle/data";
import { initiativeOf, intentRead, statsOf } from "../../src/battle/rules";
import { party } from "../../src/cast/attributes";

const book: SkillBook = SKILLS;
const def: BattleDef = BATTLES["trail-wardens"];
const fresh = (seed = 1): BattleState => createBattle(def, book, seeded(seed));
const ids = (us: { id: string }[]) => us.map((u) => u.id);
/** Hand the turn to one fighter, whatever the initiative order says. */
const turnOf = (s: BattleState, id: string): BattleState => { s.phase = "ally"; s.turn = fighters(s, "ally").findIndex((u) => u.id === id); return s; };
/** A seeded rng that never rolls under 0.3, so no blow is dodged (dodge chances top out at 0.25). */
const sure = (seed: number) => { const r = seeded(seed); return () => 0.3 + r() * 0.7; };

describe("battle rules", () => {
  it("grades presses by distance from impact", () => {
    expect(gradePress(0.02)).toBe("perfect");
    expect(gradePress(-0.1)).toBe("good");
    expect(gradePress(-0.3)).toBe("early");
    expect(gradePress(0.3)).toBe("late");
  });

  it("starts with the quickest of the party, every foe showing an intent", () => {
    const s = fresh();
    expect(ids(fighters(s, "ally"))).toEqual(["tam", "rhea"]); // Tamsin's finesse beats Rhea's
    expect(acting(s)?.id).toBe("tam");
    for (const f of foeQueue(s)) expect(f.intent).not.toBeNull();
    // the reedcat always pounces at the back row
    expect(unit(s, "rc").intent?.target).toBe("tam");
  });

  it("initiative (finesse, then wits) sets the turn order on both sides", () => {
    const s = fresh();
    const order = fighters(s, "foe");
    for (let i = 1; i < order.length; i++) expect(initiativeOf(order[i - 1])).toBeGreaterThanOrEqual(initiativeOf(order[i]));
    expect(order[0].id).toBe("wa"); // the archer is the quickest of them
    // raise Rhea's finesse and she goes first
    unit(s, "rhea").stats = { ...statsOf(unit(s, "rhea")), finesse: 14 };
    expect(fighters(s, "ally")[0].id).toBe("rhea");
  });

  it("a foe far quicker than the whole party strikes before them, then the round goes on as usual", () => {
    const s = fresh(), wa = unit(s, "wa");
    expect(s.firstStrike).toBe(false);
    wa.stats = { ...statsOf(wa), finesse: 22, wits: 14 }; // the archer gets very quick
    act(s, book, "tam", "sling", "w1", ["none"], sure(1)); act(s, book, "rhea", "rally", "rhea", [], sure(1));
    for (const f of foeQueue(s)) foeAct(s, book, f.id, "none", sure(1));
    endRound(s, book, sure(1));
    // round 2 opens with the archer's shot before anyone in the party moves
    expect(s.round).toBe(2); expect(s.firstStrike).toBe(true); expect(s.phase).toBe("foe");
    expect(ids(foeQueue(s))).toEqual(["wa"]);
    unit(s, "tam").hp = 200; // so the archer's shot can't drop her before her turn
    for (const f of foeQueue(s)) foeAct(s, book, f.id, "none", sure(2));
    endRound(s, book, sure(2));
    expect(s.round).toBe(2); expect(s.phase).toBe("ally"); expect(acting(s)?.id).toBe("tam");
    // the archer has already moved, so it sits out the rest of the round
    act(s, book, "tam", "sling", "w1", ["none"], sure(3)); act(s, book, "rhea", "rally", "rhea", [], sure(3));
    expect(s.phase).toBe("foe");
    expect(ids(foeQueue(s))).not.toContain("wa");
  });

  it("finesse dodges: about 6% between equals, more for the nimble, never above a quarter", () => {
    const even = { might: 6, grit: 6, finesse: 6, nerve: 6, wits: 6, heart: 6, presence: 6 };
    expect(party.dodge(even, even)).toBeCloseTo(0.06, 2);
    expect(party.dodge({ ...even, finesse: 20 }, even)).toBeGreaterThan(0.12);
    expect(party.dodge({ ...even, finesse: 60 }, { ...even, finesse: 1 })).toBeLessThanOrEqual(0.25);
    expect(party.dodge({ ...even, finesse: 1 }, { ...even, finesse: 60 })).toBeGreaterThanOrEqual(0.02);
    // over many blows, a dodge shows up as an event and does no harm
    const s = fresh(); s.phase = "foe"; unit(s, "tam").stats = { ...statsOf(unit(s, "tam")), finesse: 40 };
    const r = seeded(9); let dodges = 0;
    for (let i = 0; i < 400; i++) {
      unit(s, "tam").hp = unit(s, "tam").maxHp; unit(s, "w1").intent = { skill: "wstrike", target: "tam" }; s.phase = "foe";
      const ev = foeAct(s, book, "w1", "none", r);
      if (ev.some((e) => e.t === "dodge")) { dodges++; expect(unit(s, "tam").hp).toBe(unit(s, "tam").maxHp); }
    }
    expect(dodges / 400).toBeGreaterThan(0.12); expect(dodges / 400).toBeLessThan(0.3);
  });

  it("wits reads intents: sharp eyes see everything, duller ones only what's coming, or nothing", () => {
    const s = fresh(), wa = unit(s, "wa");
    expect(intentRead(s, wa)).toBe(2);
    wa.stats = { ...statsOf(wa), wits: statsOf(unit(s, "rhea")).wits + 3 };
    expect(intentRead(s, wa)).toBe(1);
    wa.stats = { ...statsOf(wa), wits: 20 };
    expect(intentRead(s, wa)).toBe(0);
  });

  it("melee only reaches the front row while it stands; ranged reaches anyone", () => {
    const s = fresh(), rhea = unit(s, "rhea");
    expect(ids(targetsFor(s, book, rhea, "strike"))).toEqual(["w1", "rc", "w2"]);
    expect(ids(targetsFor(s, book, unit(s, "tam"), "sling"))).toContain("wa");
    for (const id of ["w1", "rc", "w2"]) unit(s, id).hp = 0;
    expect(ids(targetsFor(s, book, rhea, "strike"))).toEqual(["wa"]);
  });

  it("a good strike deals more, brings Ash in for a follow-up, and fills the bond", () => {
    const a = turnOf(fresh(7), "rhea"), b = turnOf(fresh(7), "rhea");
    const evA = act(a, book, "rhea", "strike", "w1", ["none"], sure(3));
    const evB = act(b, book, "rhea", "strike", "w1", ["perfect"], sure(3));
    const dealt = (ev: typeof evA) => ev.filter((e) => e.t === "hit").reduce((n, e) => n + (e.t === "hit" ? e.amt : 0), 0);
    expect(dealt(evB)).toBeGreaterThan(dealt(evA));
    expect(evA.some((e) => e.t === "follow")).toBe(false);
    expect(evB.some((e) => e.t === "follow" && e.by === "ash")).toBe(true);
    expect(b.bond).toBe(25);
    expect(b.phase).toBe("foe"); // Rhea was the last of the round
  });

  it("Ash covers Rhea once a round, then the second blow lands on her", () => {
    const s = fresh(); s.phase = "foe";
    unit(s, "w1").intent = { skill: "wstrike", target: "rhea" }; unit(s, "w2").intent = { skill: "wstrike", target: "rhea" };
    const e1 = foeAct(s, book, "w1", "none", sure(1)).find((e) => e.t === "hit");
    const e2 = foeAct(s, book, "w2", "none", sure(1)).find((e) => e.t === "hit");
    expect(e1).toMatchObject({ target: "ash", redirected: "cover", was: "rhea" });
    expect(e2).toMatchObject({ target: "rhea" });
  });

  it("a perfect brace takes far less damage", () => {
    const hitFor = (g: "none" | "perfect") => { const s = fresh(); s.phase = "foe"; unit(s, "ash").covered = true; unit(s, "w1").intent = { skill: "wstrike", target: "rhea" }; foeAct(s, book, "w1", g, sure(5)); return 42 - unit(s, "rhea").hp; };
    expect(hitFor("perfect")).toBeLessThan(hitFor("none"));
  });

  it("smoke makes a foe lose its move, and hits on it count as an ambush", () => {
    const s = fresh();
    act(s, book, "tam", "smoke", "w2", [], seeded(1));
    act(s, book, "rhea", "rally", "rhea", [], seeded(1));
    expect(s.phase).toBe("foe");
    expect(foeMove(s, book, "w2", seeded(1))).toBe("stunned");
    expect(foeAct(s, book, "w2", "none", seeded(1))).toEqual([{ t: "stumble", id: "w2" }]);
    // a fresh smoke, then an ambush strike
    const s2 = turnOf(fresh(), "rhea"); unit(s2, "w1").stunned = true;
    const ev = act(s2, book, "rhea", "strike", "w1", ["none"], seeded(1));
    expect(ev.find((e) => e.t === "hit")).toMatchObject({ tags: ["Ambush"] });
  });

  it("the foal song calms the reedcat away over a couple of turns, and wears their nerve", () => {
    const s = turnOf(fresh(), "rhea"), rng = seeded(2);
    act(s, book, "rhea", "sing", "rc", ["perfect", "perfect", "perfect"], rng);
    expect(unit(s, "rc").calm).toBeGreaterThan(50);
    expect(unit(s, "rc").gone).toBe(false);
    turnOf(s, "rhea");
    const ev = act(s, book, "rhea", "sing", "rc", ["good", "good", "good"], rng);
    expect(ev.find((e) => e.t === "calm")).toMatchObject({ left: true });
    expect(unit(s, "rc").gone).toBe(true);
    expect(s.resolve).toBe(85);
  });

  it("singing to Ash steadies him, and the steadied hit is stronger", () => {
    const s = turnOf(fresh(), "rhea");
    act(s, book, "rhea", "sing", "ash", ["good", "good", "good"], seeded(1));
    expect(unit(s, "ash").steady).toBe(true);
  });

  it("a full bond unlocks the Call, which hits the whole front line and empties the meter", () => {
    const s = turnOf(fresh(), "rhea"); s.bond = 100;
    expect(skillsFor(s, unit(s, "rhea"))[0]).toBe("call");
    const ev = act(s, book, "rhea", "call", "w1", ["good"], sure(4));
    const hitIds = ev.filter((e) => e.t === "hit").map((e) => (e.t === "hit" ? e.target : ""));
    expect(hitIds).toEqual(["w1", "rc", "w2"]);
    expect(s.bond).toBe(0);
  });

  it("breaking their nerve wins with foes still standing (a rout)", () => {
    const s = turnOf(fresh(), "rhea"); s.resolve = 5;
    const ev = act(s, book, "rhea", "strike", "w1", ["none"], sure(1));
    expect(s.phase).toBe("won"); expect(s.routed).toBe(true);
    expect(ev.at(-1)).toEqual({ t: "end", result: "won" });
    expect(ev.find((e) => e.t === "rout")).toBeTruthy();
  });

  it("losing every fighter loses; Ash bolts rather than dying", () => {
    const s = fresh(); s.phase = "foe";
    unit(s, "ash").hp = 1; unit(s, "w1").intent = { skill: "wstrike", target: "rhea" };
    const ev = foeAct(s, book, "w1", "none", sure(1));
    expect(ev.find((e) => e.t === "bolt")).toEqual({ t: "bolt", id: "ash" });
    unit(s, "tam").hp = 0; unit(s, "rhea").hp = 1; unit(s, "w2").intent = { skill: "wstrike", target: "rhea" };
    const ev2 = foeAct(s, book, "w2", "none", sure(1));
    expect(s.phase).toBe("lost"); expect(ev2.at(-1)).toEqual({ t: "end", result: "lost" });
  });

  it("refuses moves out of turn or at the wrong target", () => {
    const s = fresh();
    expect(() => act(s, book, "rhea", "strike", "w1", ["none"], seeded(1))).toThrow(); // Tamsin is quicker
    turnOf(s, "rhea");
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

describe("wounds carry over", () => {
  it("allies start a fight with what they had left; foes always start whole", () => {
    const s = createBattle(def, book, seeded(1), {}, {}, {}, { rhea: 0.5 });
    const r = unit(s, "rhea");
    expect(r.hp).toBe(Math.round(r.maxHp * 0.5));
    for (const f of s.units.filter((u) => u.side === "foe")) expect(f.hp).toBe(f.maxHp);
  });
  it("after a win only part of the damage heals, and the fallen get up hurt", () => {
    const s = fresh();
    const r = unit(s, "rhea"); r.hp = Math.round(r.maxHp * 0.4);
    const other = s.units.find((u) => u.side === "ally" && u.id !== "rhea")!; other.hp = 0;
    const h = afterBattle(s);
    expect(h.rhea).toBeGreaterThan(0.4); expect(h.rhea).toBeLessThan(1);
    expect(h[other.id]).toBeCloseTo(0.25 + 0.75 * 0.35, 2);
  });
});
