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
    for (const s of STORY.steps) { const m = MAPS[s.map], ch = m.rows[s.at[1]]?.[s.at[0]]; expect(ch, `${s.map} ${s.at}`).toBeDefined(); expect(m.world ? ["townground"] : ["door", "ladder", "cave", "gate", "exit"], `${s.map} ${s.at} is ${m.legend[ch!]}`).toContain(m.legend[ch!]); }
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
    const f = fresh(), { h, log, map } = host(f, [0, 0, 0, 1, 3]);
    const r = new StoryRunner(STORY, h);
    expect(f.stage).toBe("d0");
    r.run([{ run: "pilgrimFit" }]); expect(f.stage).toBe("d1");
    r.run([{ run: "finchTerrace" }]);
    expect(f.stage).toBe("d1b");
    expect(log).toContain("rhea: \"I'll sing for him.\""); // a quoted choice is said aloud
    r.run([{ run: "smokeComes" }]);
    expect(f.stage).toBe("d2"); expect(log).toContain("follow smoke");
    r.run([{ run: "finchCaves" }]); // leave him to it
    expect(f.finchTrust).toBe(55); expect(f.stage).toBe("d2b"); expect(f.light).toBe("dusk");
    r.run([{ run: "panniers" }]); // the cairns, the cloud path and the three blinks, set up before they matter
    expect(f.stage).toBe("d3");
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
    expect(f.refusal).toBe("cold"); expect(f.stage).toBe("n2b"); expect(map()).toBe("home");
    r.run([{ run: "gateLie" }]); // press him about the Warden token
    expect(f.gatePressed).toBe(true); expect(f.stage).toBe("n2c");
    r.run([{ run: "sleep" }]); expect(f.stage).toBe("n2d");
    r.run([{ run: "swappedRun" }]); expect(f.stage).toBe("n2e");
    r.run([{ run: "sleep" }]); expect(f.gateOpen).toBe(true); expect(f.stage).toBe("n3");
    r.run([{ run: "tamsinGate" }]); expect(f.stage).toBe("n3b");
    r.run([{ run: "trailFight" }]); expect(f["won.trail-wardens"]).toBe(true); expect(f.stage).toBe("n4");
    r.run([{ run: "burned" }]); expect(f.ash).toBe(true); expect(f.stage).toBe("n5");
    r.run([{ run: "rookDying" }]); expect(f.stage).toBe("n5b");
    r.run([{ run: "ringNote" }]); expect(f.ring).toBe(true); expect(f.stage).toBe("n5c");
    f.stage = "n6"; r.run([{ run: "ashTerrace" }]); // sing; then the night before, played as Corran
    expect(f.hero).toBe("corran"); expect(f.stage).toBe("c1"); expect(map()).toBe("cloudpath");
    r.run([{ run: "giveSignal" }]); expect(f.stage).toBe("c2");
    r.run([{ run: "cloudGate" }]);
    expect(log).toContain("fade Four days later. Vantry, the Guild's city."); expect(f.stage).toBe("i1"); expect(map()).toBe("yard");
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
    expect(log).not.toContain("end prologue"); expect(f.hero).toBe("rhea"); expect(f.stage).toBe("a1"); // no end card: straight on with Rhea
  });

  it("finds every spoken line, including choices said aloud, once each", () => {
    const lines = storyLines(STORY);
    expect(lines.some((l) => l.who === "rhea" && l.text.includes("Three hundred people"))).toBe(true);
    expect(lines.some((l) => l.who === "narrator" && l.text === "The terrace is silent.")).toBe(true);
    expect(new Set(lines.map((l) => `${l.who}|${l.text}`)).size).toBe(lines.length);
  });

  it("Act I: the empty cart, Brannoc, enlisting, the camp, training, the night watch, the cart warden and Sela", () => {
    const f: Flags = { ...fresh(), stage: "i4", hero: "corran", sela: true, ash: true }, { h, log, map } = host(f, [0, 1, 0, 0, 0, 0]);
    const r = new StoryRunner(STORY, h);
    r.run([{ run: "act1Start" }]);
    expect(f.hero).toBe("rhea"); expect(f.chapter).toBeUndefined(); expect(f.party).toBe("tamsin,ash"); expect(map()).toBe("land-cloudline"); expect(f.stage).toBe("a1");
    r.run([{ run: "emptyCart" }]); expect(f.stage).toBe("a1b");
    r.run([{ run: "meetBrannoc" }]); // "I'm not joining anybody's army." She comes to read the book
    expect(f.party).toBe("tamsin,ash,brannoc"); expect(f["party.brannoc"]).toBe(true); expect(f.stage).toBe("a2");
    r.run([{ run: "kane" }]); // "I want every hatchery in Ostrel burned."
    expect(f.why).toBe("burn"); expect(f.rank).toBeFalsy(); expect(f.stage).toBe("a2b"); // not enlisted yet: Finch is not in the book
    r.run([{ run: "kane" }]); expect(log.at(-1)).toContain("nurses' tent"); // see the camp first
    r.run([{ run: "tourNurse" }, { run: "tourYard" }, { run: "tourKith" }]); expect(f.nurseFriend).toBe(true);
    r.run([{ run: "kane" }]); expect(f.rank).toBe("Recruit"); expect(f.stage).toBe("a2e"); expect(log).not.toContain("battle spar-brannoc"); // a day ends in her tent, not on the spot
    r.run([{ run: "tent" }]); expect(f.stage).toBe("a2f"); expect(f.light).toBe("day");
    r.run([{ run: "sparDawn" }]); expect(log).toContain("battle spar-brannoc"); expect(f.stage).toBe("a2g");
    r.run([{ run: "tent" }]); expect(f.stage).toBe("a2c"); expect(f.light).toBe("night");
    r.run([{ run: "nightWatch" }]); expect(f.ferrisWhy).toBe(true); expect(f.stage).toBe("a2h");
    r.run([{ run: "tent" }]); expect(f.stage).toBe("a2d");
    r.run([{ run: "kane" }]); expect(f.stage).toBe("a3"); expect(f.rank).toBe("Recruit");
    r.run([{ run: "cartFight" }]); expect(f["won.cart-warden"]).toBe(true); expect(f.stage).toBe("a3b");
    r.run([{ run: "openCart" }]); expect(f.stage).toBe("a3c"); // Sela is in this cart: talk to her first
    r.run([{ run: "selaFree" }]); expect(f["recruited.sela"]).toBe(true); expect(f.rank).toBe("Recruit"); expect(f.stage).toBe("a4"); // no promotion for one job
    expect(log).toContain("battle cart-warden");
  });

  it("Act I without Sela: the cart's children, back to camp, still a recruit", () => {
    const f: Flags = { ...fresh(), stage: "a3b", sela: false, rank: "Recruit" }, { h } = host(f);
    new StoryRunner(STORY, h).run([{ run: "openCart" }]);
    expect(f.rank).toBe("Recruit"); expect(f.stage).toBe("a4"); expect(f["recruited.sela"]).toBeUndefined();
  });

  it("Millbridge: the truth wins Oren, the elders' story wins the town at once", () => {
    const truth: Flags = { ...fresh(), stage: "a5" }, t = host(truth, [0]);
    new StoryRunner(STORY, t.h).run([{ run: "reeve" }]);
    expect(truth.millbridge).toBe("truth"); expect(truth["recruited.oren"]).toBe(true); expect(truth.stage).toBe("a4b"); // walk back to camp first
    new StoryRunner(STORY, t.h).run([{ run: "tent" }]); expect(truth.stage).toBe("a5b");
    expect(t.log.some((l) => l.startsWith("varro:"))).toBe(true);
    // the quiet month: Kane has nothing until Rhea has spent time with Tamsin
    const r2 = new StoryRunner(STORY, t.h); r2.run([{ run: "kane" }]); expect(truth.stage).toBe("a5b");
    r2.run([{ run: "quietTamsin" }, { run: "kane" }]); expect(truth.stage).toBe("a6");
    const lie: Flags = { ...fresh(), stage: "a5" }, l = host(lie, [1]);
    new StoryRunner(STORY, l.h).run([{ run: "reeve" }]);
    expect(lie.millbridge).toBe("elders"); expect(lie["recruited.oren"]).toBeUndefined();
  });

  it("the Sallow hatchery: Ketti joins, Brannoc is hurt, the section votes Rhea Sergeant, then the harvest alone", () => {
    const f: Flags = { ...fresh(), stage: "a6", party: "tamsin,ash,brannoc", rank: "Recruit", millbridge: "truth" }, { h, log, map } = host(f, [0, 0]);
    const r = new StoryRunner(STORY, h);
    r.run([{ run: "sallowGate" }]); expect(f.stage).toBe("a6b"); expect(f.sallowBurning).toBe(true);
    r.run([{ run: "ketti" }]);
    expect(f["recruited.ketti"]).toBe(true); expect(f.party).toBe("tamsin,ash,ketti"); expect(f.rank).toBe("Recruit"); expect(f.stage).toBe("a6c"); expect(map()).not.toBe("camp"); // she walks back herself
    r.run([{ run: "brannocDown" }]); expect(f.stage).toBe("a6d");
    r.run([{ run: "sectionVote" }]); expect(f.rank).toBe("Sergeant"); expect(log).toContain("kane: \"That's the section's answer, then. Sergeant Caddow.\"");
    expect(f.stage).toBe("a6e");
    r.run([{ run: "tent" }]); expect(f.stage).toBe("a7"); expect(log).toContain("follow "); // she climbs alone
    r.run([{ run: "harvest" }]); expect(map()).toBe("larkfold"); expect(f.stage).toBe("a7b");
    r.run([{ run: "harvestSong" }]); expect(f.stage).toBe("a7c");
    r.run([{ run: "oda" }]); expect(f["recruited.oda"]).toBe(true);
    r.run([{ run: "leaveLarkfold" }]); expect(f.party).toBe("tamsin,ash,ketti,brannoc");
    expect(log).not.toContain("end act1"); expect(f.act2).toBe(true); expect(map()).toBe("camp"); expect(f.stage).toBe("ab1"); // straight on into the autumn, no end card
  });

  it("handing Ketti's children to the nurses: she leaves", () => {
    const f: Flags = { ...fresh(), stage: "a6b", party: "tamsin,ash" }, { h } = host(f, [1]);
    new StoryRunner(STORY, h).run([{ run: "ketti" }]);
    expect(f.kettiLeft).toBe(true); expect(f["recruited.ketti"]).toBeUndefined(); expect(f.party).toBe("tamsin,ash");
  });

  it("later acts' doors are checked first: the Larkfold caves open at the harvest", () => {
    const st = STORY.steps.find((s) => s.map === "larkfold" && s.at[0] === 27 && s.at[1] === 16 && holds(s.when, { flags: { stage: "a7b" }, map: "larkfold" }));
    expect(st?.do).toEqual([{ goto: { map: "caves", x: 7, y: 7, facing: "up" } }]);
  });
});

describe("music tells the player how to feel", () => {
  // everyday scenes where the place's own music is the right feeling
  const PLACE_MUSIC = new Set(["finchTerrace", "finchCaves", "evening", "afterNews", "kane", "reeve", "kane2", "roomsTable"]);
  it("every scene with lines has a mood, unless the place's music is the point", () => {
    const moods = STORY.moods!;
    for (const [id, steps] of Object.entries(STORY.scripts)) {
      const lines = JSON.stringify(steps).split('"say"').length - 1;
      if (lines && !PLACE_MUSIC.has(id)) expect(moods.scenes[id], `scene ${id} has no mood`).toBeTruthy();
    }
  });
  it("every mood is a real track", async () => {
    const { TRACK_NAMES } = await import("../../src/audio/music");
    const names = new Set(TRACK_NAMES());
    for (const m of [...Object.values(STORY.moods!.scenes), ...Object.values(STORY.moods!.stages)]) expect(names.has(m), m).toBe(true);
  });
  it("a scene's mood plays while it runs and gives way to the stage's mood after", () => {
    const flags: Flags = { stage: "a2" };
    const log: string[] = [];
    let next: (() => void) | null = null;
    const host = { where: () => ({ flags, map: "camp" }), line: (_w: string, _n: string, _t: string, done: () => void) => { log.push(String(flags.scene)); next = done; }, choose: (_p: string, _o: unknown[], done: (i: number) => void) => done(0), fade: (_c: string, d: () => void) => d(), goto: (_m: string, _x: number, _y: number, _f: unknown, d: () => void) => d(), battle: (_i: string, d: () => void) => d(), follow: () => {}, toast: () => {}, changed: () => {}, end: () => {} } as unknown as StoryHost;
    const r = new StoryRunner(STORY, host);
    r.run([{ run: "emptyCart" }]);
    expect(log[0]).toBe("grief");
    for (let i = 0; i < 50 && next; i++) { const n: () => void = next; next = null; n(); }
    expect(flags.scene).toBe("");
  });
});

describe("Act II: the field", () => {
  it("autumn to summer: Thornwick, Ume and Tobin, the crates, the prisoners, the bridge, Lieutenant, and Corran's four nights", () => {
    const f: Flags = { ...fresh(), stage: "a7c", hero: "rhea", party: "tamsin,ash,brannoc", "party.brannoc": true, ash: true, sela: true, "recruited.oda": true }, { h, log, map } = host(f, []);
    const r = new StoryRunner(STORY, h);
    const pick = (...ns: number[]) => { picks.push(...ns); };
    const picks: number[] = [];
    h.choose = (prompt, options, done) => { log.push(`? ${prompt} [${options.map((o) => o.label).join(" | ")}]`); done(picks.shift() ?? 0); };
    r.run([{ run: "leaveLarkfold" }]); expect(f.stage).toBe("ab1"); expect(map()).toBe("camp");
    r.run([{ run: "kane" }]); expect(f.thornwick).toBe(true); expect(f.stage).toBe("ab2"); // Kane hands Act II its own talk
    r.run([{ run: "thornArrive" }]); expect(map()).toBe("thornwick"); expect(f.stage).toBe("ab3");
    r.run([{ run: "bathSong" }]); expect(f.bathhouse).toBe("sung"); expect(f["kith.thornwick-yearling"]).toBe(true); expect(f.stage).toBe("ab4");
    pick(1); r.run([{ run: "workChoice" }]); expect(f.firstJob).toBe("store"); expect(f.lostTray).toBe(true); expect(f.stage).toBe("ab5");
    r.run([{ run: "dorrit" }]); expect(f["recruited.dorrit"]).toBe(true); expect(f.stage).toBe("ab6");
    r.run([{ run: "heskComes" }]); expect(f["recruited.hesk"]).toBe(true); expect(f.stage).toBe("ab7");
    // night one: Corran's evenings
    r.run([{ run: "thornBed" }]); expect(f.hero).toBe("corran"); expect(map()).toBe("yard"); expect(f.stage).toBe("ac1");
    r.run([{ run: "halloranPromote" }]); expect(f["rank.corran"]).toBe("Lieutenant"); expect(map()).toBe("surgery");
    r.run([{ run: "lisleEvenings" }]); expect(f.evenings).toBe("lull"); expect(map()).toBe("rooms"); expect(f.stage).toBe("ac3");
    r.run([{ run: "roomsTable" }]); expect(f.hero).toBe("rhea"); expect(f.stage).toBe("ab8"); expect(map()).toBe("thornwick"); expect(f.light).toBe("snow");
    r.run([{ run: "mossOut" }]); expect(f.stage).toBe("ab9");
    r.run([{ run: "umesArrive" }, { run: "factor" }, { run: "umeMeet" }]); expect(f.umeMet).toBe(true); expect(f.stage).toBe("ab10");
    r.run([{ run: "tobinHome" }]); expect(f.stage).toBe("ab11");
    r.run([{ run: "mossOut" }]); expect(f.tobinWean).toBe(1); expect(f.stage).toBe("ab12");
    // night two: Finch's birthday, kept
    r.run([{ run: "thornBed" }]); expect(f.hero).toBe("corran"); expect(f.stage).toBe("ac5");
    r.run([{ run: "finchBirthday" }]); expect(f.birthday).toBe("kept"); expect(map()).toBe("highpass");
    r.run([{ run: "finchPass" }]); expect(f.finchHome).toBe(true); expect(f.hero).toBe("rhea"); expect(f.stage).toBe("ab13");
    r.run([{ run: "carter" }]); expect(f.sawCrates).toBe(true); expect(f.stage).toBe("ab14");
    r.run([{ run: "kane" }]); expect(f.kaneTold).toBe(true); expect(f.stage).toBe("ab15");
    r.run([{ run: "raidHome" }]); expect(f["won.thornwick-gate"]).toBe(true); expect(f.stage).toBe("ab16");
    r.run([{ run: "oakesTalk" }, { run: "lyleTalk" }]); expect(f.stage).toBe("ab17");
    r.run([{ run: "verdict" }]); expect(f.wardens).toBe("spared"); expect(f.stage).toBe("ab18");
    r.run([{ run: "thornBed" }]); expect(f.stage).toBe("ab19"); expect(f["party.brannoc"]).toBe(false); // spring: Brannoc goes to his company
    r.run([{ run: "rider" }]); expect(map()).toBe("kellsbridge"); expect(f.stage).toBe("ab20");
    r.run([{ run: "bridge" }]); expect(f.parley).toBe("answered"); expect(f["party.oakes"]).toBe(true); expect(f.stage).toBe("ab21");
    r.run([{ run: "bridgeHome" }]); expect(map()).toBe("thornwick");
    // night three: the hiding
    r.run([{ run: "thornBed" }]); expect(f.hero).toBe("corran"); expect(f.stage).toBe("ac7");
    r.run([{ run: "lisleHiding" }]); expect(map()).toBe("backroom");
    pick(1); r.run([{ run: "smuggler" }]); expect(f.bought).toBe(false); expect(f.stage).toBe("ac9");
    r.run([{ run: "finchLie" }]); expect(f.hero).toBe("rhea"); expect(f.stage).toBe("ab22");
    r.run([{ run: "tobinClean" }]); expect(f.tobinClean).toBe(true); expect(f.stage).toBe("ab23");
    r.run([{ run: "thornBed" }]); expect(f.stage).toBe("ab24");
    r.run([{ run: "promotion" }]); expect(f.rank).toBe("Lieutenant"); expect(f.trade).toBe("shut"); expect(f.stage).toBe("ab25");
    // night four: the pressure bell, sat clean
    r.run([{ run: "thornBed" }]); expect(f.hero).toBe("corran"); expect(f.stage).toBe("ac10");
    pick(1); r.run([{ run: "roomsTable" }]); expect(f.bellNight).toBe("clean"); expect(f.stage).toBe("ac11");
    r.run([{ run: "bellDoor" }]); expect(log.at(-1)).toContain("still children"); // nobody left behind
    r.run([{ run: "bellChild1" }, { run: "bellChild2" }, { run: "bellChild3" }, { run: "bellDoor" }]); expect(f.bellDead).toBe(2); expect(f.stage).toBe("ac12");
    r.run([{ run: "posyMorning" }]); expect(f.stage).toBe("ac13");
    r.run([{ run: "halloranBell" }]); expect(f.hero).toBe("rhea"); expect(f.stage).toBe("ab26");
    r.run([{ run: "childGate" }]); expect(log.at(-1)).toBe("end act2");
    expect(r.busy).toBe(false);
  });

  it("the darker ways: hanged Wardens cost Finch's trust, a lull on the watch costs six", () => {
    const f: Flags = { ...fresh(), stage: "ab17", hero: "rhea", finchTrust: 50 }, { h } = host(f, [1]);
    const r = new StoryRunner(STORY, h);
    r.run([{ run: "verdict" }]); expect(f.wardens).toBe("hanged"); expect(f.finchTrust).toBe(35);
    f.stage = "ac10"; f.hero = "corran";
    const h2 = host(f, [0]); const r2 = new StoryRunner(STORY, h2.h);
    r2.run([{ run: "bellTin" }]); expect(f.bellNight).toBe("lull"); expect(f.bellDead).toBe(6); expect(f.stage).toBe("ac12");
  });
});
