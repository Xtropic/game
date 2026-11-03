import { describe, expect, it } from "vitest";
import { StoryRunner, checkStory, holds, storyLines, type Flags, type StoryHost } from "../../src/story/story";
import { MAPS, STORY } from "../../src/world/content";
import { BATTLES } from "../../src/battle/data";

/** A host that answers instantly and records what happened. Choices are picked from `picks` in order. */
function host(flags: Flags, picks: number[] = []) {
  const log: string[] = [];
  let map = "larkfold";
  const h: StoryHost = {
    where: () => ({ flags, map }),
    line: (who, _n, text, done) => { log.push(`${who}: ${text}`); done(); },
    choose: (prompt, options, done) => { log.push(`? ${prompt} [${options.map((o) => o.label).join(" | ")}]`); done(picks.shift() ?? 0); },
    fade: (c, done) => { log.push(`fade ${c}`); done(); },
    goto: (m, x, y, _f, done) => { map = m; log.push(`goto ${m} ${x},${y}`); done(); },
    battle: (id, done) => { flags[`won.${id}`] = true; log.push(`battle ${id}`); done(); },
    follow: (ids) => log.push(`follow ${ids.join(",")}`),
    toast: (t) => log.push(`toast ${t}`),
    changed: () => {},
    end: (id) => log.push(`end ${id}`),
  };
  return { h, log, map: () => map };
}

const fresh = (): Flags => ({ ...STORY.start.set, stage: STORY.start.stage, hero: STORY.start.hero });

describe("story", () => {
  it("the prologue's data is consistent: scripts, maps, battles, speakers and stages all exist", () => {
    expect(checkStory(STORY, new Set(Object.keys(MAPS)), new Set(Object.keys(BATTLES)))).toEqual([]);
  });

  it("every actor, door and trigger stands on its map, and doors are walkable", () => {
    for (const a of STORY.actors) { const m = MAPS[a.map]; expect(m.rows[a.y]?.[a.x], `${a.id} on ${a.map}`).toBeDefined(); }
    for (const s of STORY.steps) { const m = MAPS[s.map], ch = m.rows[s.at[1]]?.[s.at[0]]; expect(ch, `${s.map} ${s.at}`).toBeDefined(); expect(["door", "ladder", "cave", "gate", "exit"], `${s.map} ${s.at} is ${m.legend[ch!]}`).toContain(m.legend[ch!]); }
  });

  it("conditions: stage, prefix, flags, not, eq, hero and map", () => {
    const w = { flags: { stage: "n3", hero: "rhea", a: true, line: "house" } as Flags, map: "larkfold" };
    expect(holds({ stage: ["n3", "n4"] }, w)).toBe(true);
    expect(holds({ stagePrefix: "d" }, w)).toBe(false);
    expect(holds({ flag: "a", not: ["b"] }, w)).toBe(true);
    expect(holds({ not: "a" }, w)).toBe(false);
    expect(holds({ eq: { line: "house" }, hero: "rhea", map: ["larkfold"] }, w)).toBe(true);
    expect(holds({ hero: "corran" }, w)).toBe(false);
  });

  it("plays day one: Finch, the song, the caves, the roof, then nine days pass", () => {
    const f = fresh(), { h, log, map } = host(f, [0, 1, 3]);
    const r = new StoryRunner(STORY, h);
    r.run([{ run: "finchTerrace" }]);
    expect(f.stage).toBe("d1b");
    expect(log).toContain("rhea: \"I'll sing for him.\""); // a quoted choice is said aloud
    r.run([{ run: "smokeComes" }]);
    expect(f.stage).toBe("d2"); expect(log).toContain("follow smoke");
    r.run([{ run: "finchCaves" }]); // leave him to it
    expect(f.finchTrust).toBe(55); expect(f.stage).toBe("d3"); expect(f.light).toBe("dusk");
    r.run([{ run: "roofTalk" }]); // say goodnight straight away (the fourth option)
    expect(f.stage).toBe("d4"); expect(f.hold).toBe(50);
    r.run([{ run: "sleep" }]);
    expect(f.stage).toBe("n1"); expect(map()).toBe("larkfold"); expect(log).toContain("fade Nine days later.");
    expect(r.busy).toBe(false);
  });

  it("the roof talk loops until goodnight, hides what's been asked, and hearing about Hask steadies him", () => {
    const f: Flags = { ...fresh(), stage: "d3" }, { h, log } = host(f, [0, 0, 0, 0]);
    new StoryRunner(STORY, h).run([{ run: "roofTalk" }]);
    const asks = log.filter((l) => l.startsWith("? Say something"));
    expect(asks.length).toBe(4);
    expect(asks[3]).toBe("? Say something to Corran. [Say goodnight]");
    expect(f.heardHask).toBe(true); expect(f.hold).toBe(55); expect(f.stage).toBe("d4");
  });

  it("numbers like hold stay within 0..100", () => {
    const f: Flags = { ...fresh(), hold: 3 }, { h } = host(f);
    new StoryRunner(STORY, h).run([{ add: { hold: -8 } }, { add: { "rings.corran": 2 } }]);
    expect(f.hold).toBe(0); expect(f["rings.corran"]).toBe(2);
  });

  it("plays the night through the trail fight, the burning and into Corran's interlude", () => {
    const f: Flags = { ...fresh(), stage: "n1" }, { h, log, map } = host(f, [1, 1, 0]);
    const r = new StoryRunner(STORY, h);
    r.run([{ run: "news" }]); expect(f.doubted).toBe(true); expect(f.stage).toBe("n2");
    r.run([{ run: "beg" }]);
    expect(log.some((l) => l.startsWith("corran: \"I read the brood book"))).toBe(true);
    expect(f.refusal).toBe("cold"); expect(f.hold).toBe(42); expect(f.gateOpen).toBe(true); expect(f.stage).toBe("n3");
    r.run([{ run: "tamsinGate" }]); expect(f.stage).toBe("n3b");
    r.run([{ run: "trailFight" }]); expect(f["won.trail-wardens"]).toBe(true); expect(f.stage).toBe("n4");
    r.run([{ run: "burned" }]); expect(f.ash).toBe(true); expect(f.stage).toBe("n5");
    r.run([{ run: "ashTerrace" }]); // sing
    expect(f.hero).toBe("corran"); expect(f.stage).toBe("i1"); expect(map()).toBe("yard");
  });

  it("plays the interlude to an ending; each choice moves Corran's hold and his rings", () => {
    const f: Flags = { ...fresh(), stage: "i1", hero: "corran" }, { h, log } = host(f, [1, 0, 0]);
    const r = new StoryRunner(STORY, h);
    r.run([{ run: "halloran" }]); expect(f.sela).toBe(true); expect(f.hold).toBe(45); expect(f.stage).toBe("i1b");
    r.run([{ run: "enterHatchery" }]); expect(f.stage).toBe("i2");
    r.run([{ follow: ["finch"] }, { stage: "i2b" }]);
    r.run([{ run: "lisle" }]); // before the surgery scene Lisle only says "Rest."
    expect(f.line).toBeUndefined();
    f.stage = "i3";
    r.run([{ run: "lisle" }]); expect(f.line).toBe("house"); expect(f.hold).toBe(33); expect(f["rings.corran"]).toBe(1); expect(f.stage).toBe("i4");
    r.run([{ run: "tin" }]); // put it on
    expect(f.evening).toBe("on"); expect(f["rings.corran"]).toBe(2); expect(f.hold).toBe(23);
    expect(log.at(-1)).toBe("end prologue");
  });

  it("finds every spoken line, including choices said aloud, once each", () => {
    const lines = storyLines(STORY);
    expect(lines.some((l) => l.who === "rhea" && l.text.includes("Three hundred people"))).toBe(true);
    expect(lines.some((l) => l.who === "narrator" && l.text === "The terrace is silent.")).toBe(true);
    expect(new Set(lines.map((l) => `${l.who}|${l.text}`)).size).toBe(lines.length);
  });
});
