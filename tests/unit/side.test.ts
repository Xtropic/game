import { describe, expect, it } from "vitest";
import { StoryRunner, holds, type Flags, type StoryHost } from "../../src/story/story";
import { STORY } from "../../src/world/content";

/** A host that answers instantly. Choices come from `picks` in order; battles are won. */
function play(script: string, flags: Flags, picks: number[] = []) {
  const log: string[] = [];
  let map = "thornwick";
  const h: StoryHost = {
    where: () => ({ flags, map }),
    line: (who, _n, text, done) => { log.push(`${who}: ${text}`); done(); },
    choose: (prompt, options, done) => { log.push(`? ${prompt} [${options.map((o) => o.label).join(" | ")}]`); done(picks.shift() ?? 0); },
    fade: (_c, done) => done(),
    goto: (m, _x, _y, _f, done) => { map = m; done(); },
    battle: (id, done) => { flags[`won.${id}`] = true; log.push(`battle ${id}`); done(); },
    follow: () => {}, toast: (t) => log.push(`toast ${t}`), changed: () => {}, end: () => {},
    addKith: (k) => log.push(`kith ${k.species}`),
  };
  new StoryRunner(STORY, h).run([{ run: script }]);
  return log;
}
const actor = (id: string) => STORY.actors.find((a) => a.id === id)!;
const shows = (id: string, flags: Flags, map?: string) => holds(actor(id).when, { flags, map: map ?? actor(id).map });

describe("the hidden nations' storylines", () => {
  it("Vael: Dellan goes home; she stays or comes back, and the trappers' fight teaches the Spire verses", () => {
    const f: Flags = { stage: "ad9", hero: "rhea", dellanDone: "truth", "recruited.dellan": true };
    expect(shows("side-dellan-pens", f)).toBe(true);
    play("side.dellanHome", f, [0]);
    expect(f.vaelHome).toBe("stayed"); expect(f["recruited.dellan"]).toBe(false);
    const g: Flags = { stage: "ah5", hero: "rhea", vaelAsked: "told" };
    expect(shows("side-isel-bridge", g)).toBe(true);
    expect(play("side.vaelTrappers", g)).toContain("battle side-vael-trappers");
    expect(g.spireSongs).toBe(true);
    expect(shows("side-isel-bridge", g)).toBe(false);
  });

  it("Low Water: only while the galleries are open; the Abbess's choice, then Brannoc's night", () => {
    const f: Flags = { stage: "ad6", hero: "rhea", galleriesDone: true, cassDone: "told" };
    expect(shows("side-abbess-chair", f)).toBe(false);
    f.cassDone = "kept"; expect(shows("side-abbess-chair", f)).toBe(true);
    play("side.abbess", f, [0]); expect(f.lowWater).toBe("greenlings");
    expect(shows("side-sister-curtain", f)).toBe(true);
    play("side.brannocNight", f); expect(f.brannocNight).toBe(true);
    expect(shows("side-sister-curtain", { ...f, brannocNight: false, brannocHanged: true })).toBe(false);
  });

  it("Osk: show the admiral, or hide the island and fight", () => {
    const a: Flags = { stage: "ah25", hero: "rhea", oskDone: "lower", "road.lorne": "pact" };
    expect(shows("side-harl-harbour", a)).toBe(true);
    play("side.oskSails", a, [0]); expect(a.oskFate).toBe("shown");
    const b: Flags = { stage: "ah25", hero: "rhea", oskDone: "upper" };
    expect(play("side.oskSails", b, [1])).toContain("battle side-osk-marines"); expect(b.oskFate).toBe("hidden");
    expect(shows("side-harl-harbour", { ...a, stage: "ah12", oskFate: false })).toBe(false); // only after Lorne
  });

  it("the Salt House: the burners come either way, and the children get their story", () => {
    const f: Flags = { stage: "ah12", hero: "rhea", saltDone: true, saltRecords: "published" };
    expect(play("side.saltBurners", f)).toContain("battle side-salt-burners");
    expect(f.saltBurn).toBe("repeal");
    play("side.saltBurners", f, [0]); expect(f.saltStory).toBe("true");
    const g: Flags = { stage: "ah12", hero: "rhea", saltDone: true, saltRecords: "kept" };
    play("side.saltBurners", g); expect(g.saltBurn).toBe("kept");
  });

  it("the Wandering Herd: free the calves and the Matriarch comes; buy them and the Herd goes", () => {
    const f: Flags = { stage: "ah26", hero: "rhea", herdDone: "stopped" };
    expect(shows("side-rider-fold", f)).toBe(true);
    play("side.herdPoachers", f, [0]); expect(f.herdPoach).toBe("freed");
    expect(play("side.herdPoachers", f)).toContain("kith matriarch");
    const g: Flags = { stage: "ah26", hero: "rhea", herdDone: "stopped" };
    play("side.herdPoachers", g, [1]); expect(g.herdCavalry).toBe(true);
    expect(play("side.herdPoachers", g).some((l) => l.startsWith("kith"))).toBe(false);
  });
});
