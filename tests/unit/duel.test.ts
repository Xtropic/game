import { describe, expect, it } from "vitest";
import { COUNTER, DUELS, MOVES, createDuel, exchange, nextMove, pauseNow, readTime, speak, wordsLeft } from "../../src/battle/duel";
import { attrsAt, PEOPLE } from "../../src/cast/attributes";
import { seeded } from "../../src/battle/rules";

const rhea = (lv = 10) => ({ name: "Rhea", look: "rhea", attrs: attrsAt("rhea", lv) });

describe("duels", () => {
  it("every duel's foe has attributes, moves and lines", () => {
    for (const [id, d] of Object.entries(DUELS)) {
      expect(PEOPLE[d.foe.cast], id).toBeDefined();
      expect(MOVES.some((m) => d.foe.moves[m] > 0)).toBe(true);
      expect(d.foe.lines.hit.length && d.foe.lines.hurt.length).toBeTruthy();
    }
  });
  it("reading him right wins; never answering loses", () => {
    const rng = seeded(3);
    const s = createDuel(DUELS["ring-tam"], rhea());
    for (let i = 0; i < 40 && !s.over; i++) { const m = nextMove(s, rng); exchange(s, m.move, COUNTER[m.move], rng); }
    expect(["won", "yielded"]).toContain(s.over);
    expect(s.hero.guard).toBe(s.hero.max);
    const t = createDuel(DUELS["ring-tam"], rhea());
    for (let i = 0; i < 40 && !t.over; i++) exchange(t, nextMove(t, rng).move, null, rng);
    expect(t.over).toBe("lost");
  });
  it("tiring shortens the read; a pause to speak is a breath, and each word is said once", () => {
    const rng = seeded(5), s = createDuel(DUELS["lockside-rider"], rhea());
    const fresh = readTime(s); s.hero.stamina = 0; expect(readTime(s)).toBeLessThan(fresh);
    for (let i = 0; i < 3; i++) exchange(s, "high", "high", rng);
    expect(pauseNow(s)).toBe(true);
    const n = wordsLeft(s).length; speak(s, "plea", rng);
    expect(s.hero.stamina).toBeGreaterThan(0); expect(wordsLeft(s).length).toBe(n - 1);
    expect(speak(s, "plea", rng).ok).toBe(false);
  });
  it("calmed, a mounted foe can't come at you low", () => {
    const rng = seeded(9), s = createDuel(DUELS["lockside-rider"], rhea()); s.calmed = true;
    for (let i = 0; i < 60; i++) expect(nextMove(s, rng).move).not.toBe("low");
  });
});
