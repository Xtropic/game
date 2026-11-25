import { describe, expect, it } from "vitest";
import { StoryRunner, type Flags, type StoryHost } from "../../src/story/story";
import { STORY } from "../../src/world/content";
import { wayOpen } from "../../src/world/gates";

/** A host that answers instantly and records what happened. Choices are picked from `picks` in order. */
function host(flags: Flags, picks: number[] = []) {
  const log: string[] = [];
  let map = "thornwick";
  const h: StoryHost = {
    where: () => ({ flags, map }),
    line: (who, _n, text, done) => { log.push(`${who}: ${text}`); done(); },
    choose: (prompt, options, done) => { log.push(`? ${prompt} [${options.map((o) => o.label).join(" | ")}]`); done(picks.shift() ?? 0); },
    fade: (c, done) => { log.push(`fade ${c}`); done(); },
    goto: (m, x, y, _f, done) => { map = m; log.push(`goto ${m} ${x},${y}`); done(); },
    battle: (id, done) => { flags[`won.${id}`] = true; log.push(`battle ${id}`); done(); },
    duel: (id: string, done: (won: boolean) => void) => { flags[`won.duel.${id}`] = true; log.push(`duel ${id}`); done(true); },
    army: (id: string, done: (won: boolean) => void) => { flags[`won.army.${id}`] = true; log.push(`army ${id}`); done(true); },
    follow: (ids) => log.push(`follow ${ids.join(",")}`),
    toast: (t) => log.push(`toast ${t}`),
    changed: () => {},
    end: (id) => log.push(`end ${id}`),
  };
  return { h, log, map: () => map };
}

describe("the Long Road: the West", () => {
  const start = (extra: Flags, picks: number[]) => {
    const f: Flags = { stage: "ad20", hero: "rhea", rank: "Captain", act2: true, act3: true, corranFate: "thornwick", "recruited.haldane": true, collegeProof: true, tobinNight: true, ...extra };
    const t = host(f, picks);
    return { f, ...t, r: new StoryRunner(STORY, t.h) };
  };
  /** Plays Hollin and the College; picks: Kit (0 duel, 1 debt), Gil (0 stocks, 1 work), the vote (0 use Anselm, 1 honest). */
  const play = (extra: Flags, picks: number[]) => {
    const t = start(extra, picks), { f, r } = t;
    r.run([{ run: "lastNight" }]);
    expect(f.stage).toBe("ah1"); expect(f.road).toBe(true); expect(wayOpen("vale-west", f)).toBe(true);
    r.run([{ run: "fairArrive" }]); expect(f.stage).toBe("ah2");
    r.run([{ run: "kit" }]); expect(f.hollinIn).toBe(true); expect(f.stage).toBe("ah3");
    r.run([{ run: "speaker" }]); expect(f.stage).toBe("ah4");
    r.run([{ run: "ansel" }, { run: "reedHide" }]); expect(f["ward.fens"]).toBe(true); expect(f.stage).toBe("ah4");
    r.run([{ run: "orla" }, { run: "cellar" }]); expect(f["ward.tanners"]).toBe(true);
    r.run([{ run: "bryn" }, { run: "barge" }]); expect(f["ward.fishers"]).toBe(true); expect(f.stage).toBe("ah5");
    r.run([{ run: "haldaneGate" }, { run: "libraryDoor" }]); expect(t.map()).toBe("college-archive");
    r.run([{ run: "archiveGuards" }, { run: "provostPress" }]); expect(f.provostLetters).toBe(true); expect(f.stage).toBe("ah6");
    r.run([{ run: "hearing" }]); expect(f["road.college"]).toBe("refused"); expect(f.stage).toBe("ah7");
    r.run([{ run: "speaker" }]); expect(f.stage).toBe("ah8");
    expect(r.busy).toBe(false);
    return t;
  };

  it("Kit beaten, Gil given work, the vote won with Perrine's brother", () => {
    const { f, log } = play({}, [0, 1, 0]);
    expect(f["recruited.kit"]).toBe(true); expect(f["recruited.gil"]).toBe(true);
    expect(f["road.hollin"]).toBe("won"); expect(f["nation.hollin"]).toBe("pact"); expect(f["recruited.perrine"]).toBeUndefined();
    expect(log).toContain("duel road-kit"); expect(log).toContain("battle road-archive");
    expect(log.some((l) => l.includes("Port Ashby"))).toBe(true);
  });

  it("Kit's debt paid, Gil to the stocks, the vote lost honestly: Perrine comes to the clinics", () => {
    const { f, log } = play({ tobinNight: false, collegeProof: false }, [1, 0, 1]);
    expect(f["recruited.kit"]).toBeUndefined(); expect(f.gilFate).toBe("stocks");
    expect(f["road.hollin"]).toBe("lost"); expect(f["nation.hollin"]).toBeUndefined(); expect(f["recruited.perrine"]).toBe(true);
    expect(f["road.college"]).toBe("refused"); // the Provost's letters carry the hearing either way
    expect(log.some((l) => l.startsWith("weaver:"))).toBe(true); // Weirbank's dead are answered for in the hall
  });

  it("the Coast: Saul's road, Lantern Cards, the brig, and the harbour's price, then Corran's autumn", () => {
    const t = start({ stage: "ah8", "party.kit": true }, [1, 0, 0, 0, 0, 0, 0, 0, 0]);
    const { f, r, log } = t;
    r.run([{ run: "saul" }]); expect(f["open.west-coast"]).toBe(true); expect(f.saulPromise).toBe(true); expect(f.stage).toBe("ah9");
    expect(wayOpen("west-coast", f)).toBe(true);
    r.run([{ run: "ashbyArrive" }, { run: "harbourOffice" }]); expect(f.stage).toBe("ah10");
    r.run([{ run: "pike" }, { run: "meg" }, { run: "annet" }]); expect(f["cards.annet"]).toBe(true); expect(f["recruited.annet"]).toBe(true); expect(f.stage).toBe("ah11");
    r.run([{ run: "harbourOffice" }]); expect(f.stage).toBe("ah12a");
    r.run([{ run: "moleEnd" }]); expect(log).toContain("battle road-brig"); expect(f.lorneOffer).toBe(true);
    expect(f["road.ashby"]).toBe("promise"); expect(f["recruited.gully"]).toBe(true);
    expect(f.hero).toBe("rhea"); expect(f.pedlarTin).toBe("drowned"); expect(f.stage).toBe("ah14");
    expect(r.busy).toBe(false);
  });

  it("the Coast, the hard way: blockade, and Corran in Millbridge's gaol", () => {
    const t = start({ stage: "ah11", corranFate: "millbridge" }, [1, 1]);
    const { f, r, log } = t;
    r.run([{ run: "harbourOffice" }, { run: "moleEnd" }]);
    expect(f["road.ashby"]).toBe("blockade"); expect(log).toContain("army ashby-mole"); expect(f.ashbyBlockaded).toBe(true);
    expect(f.orenTalk).toBe("told"); expect(f.stage).toBe("ah14");
  });
});
