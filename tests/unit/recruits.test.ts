import { describe, expect, it } from "vitest";
import { StoryRunner, holds, type Actor, type Flags, type Step, type StoryHost } from "../../src/story/story";
import { MAPS, STORY } from "../../src/world/content";
import { RECRUITS } from "../../src/cast/recruits";
import { LOOKS } from "../../src/art/people";

/** A host that answers instantly. Choices are picked from `picks` in order; coin is a purse that can run out. */
function host(flags: Flags, picks: number[] = [], coin = 1000) {
  const log: string[] = [];
  let map = "thornwick";
  const h: StoryHost = {
    where: () => ({ flags, map }),
    line: (who, _n, text, done) => { log.push(`${who}: ${text}`); done(); },
    choose: (prompt, options, done) => { log.push(`? ${prompt} [${options.map((o) => o.label).join(" | ")}]`); done(picks.shift() ?? 0); },
    fade: (c, done) => { log.push(`fade ${c}`); done(); },
    goto: (m, _x, _y, _f, done) => { map = m; done(); },
    battle: (id, done) => { log.push(`battle ${id}`); done(); },
    follow: () => {},
    toast: (t) => log.push(`toast ${t}`),
    changed: () => {},
    end: (id) => log.push(`end ${id}`),
    pay: (n) => { if (coin < n) return false; coin -= n; return true; },
  };
  return { h, log, purse: () => coin };
}

/** Every flag a list of steps could set, down every branch. */
function setsAnywhere(steps: Step[] | undefined, out = new Set<string>()): Set<string> {
  for (const st of steps ?? []) {
    if ("set" in st) for (const [k, v] of Object.entries(st.set ?? {})) if (v === true) out.add(k);
    if ("join" in st) out.add(`recruited.${st.join}`);
    if ("choose" in st) for (const o of st.options) setsAnywhere(o.do, out);
    if ("if" in st || "pay" in st) { setsAnywhere(st.then, out); setsAnywhere(st.else, out); }
    if ("battle" in st) setsAnywhere(st.win, out);
    if ("duel" in st || "army" in st) { setsAnywhere(st.win, out); setsAnywhere(st.lose, out); }
    if ("run" in st) { const s = STORY.scripts[st.run]; if (s && !seen.has(st.run)) { seen.add(st.run); setsAnywhere(s, out); } }
  }
  return out;
}
const seen = new Set<string>();

const actor = (id: string): Actor => { const a = STORY.actors.find((x) => x.id === id); if (!a) throw new Error(`no actor ${id}`); return a; };
const talk = (id: string, flags: Flags, picks: number[] = [], coin?: number) => {
  const t = host(flags, picks, coin), r = new StoryRunner(STORY, t.h);
  r.run(actor(id).talk!); return t;
};

describe("every recruit can join", () => {
  it("every recruit in the cast list has a way into the company somewhere in the story", () => {
    const all = new Set<string>();
    for (const a of STORY.actors) { setsAnywhere(a.talk, all); setsAnywhere(a.touch, all); }
    for (const g of [...STORY.steps, ...STORY.zones, ...STORY.looks, ...STORY.songs]) setsAnywhere(g.do, all);
    for (const s of Object.values(STORY.scripts)) setsAnywhere(s, all);
    const missing = RECRUITS.filter((r) => !all.has(`recruited.${r.id}`)).map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it("every recruit has a map figure of their own", () => {
    for (const r of RECRUITS) expect(LOOKS[r.id], r.id).toBeDefined();
  });

  it("the new places have a way in from their land and a way back out", () => {
    for (const id of ["town-highspire", "town-salt-house", "town-cinder-landing", "town-summer-fold", "town-roost-foot"]) {
      expect(MAPS[id], id).toBeDefined();
      expect(STORY.steps.some((s) => s.map.startsWith("land-") && s.do.some((d) => "goto" in d && d.goto.map === id)), `${id} in`).toBe(true);
      expect(STORY.steps.some((s) => s.map === id && s.do.some((d) => "goto" in d && d.goto.map.startsWith("land-"))), `${id} out`).toBe(true);
    }
  });

  it("people only stand where they should: their window of the story, and only for Rhea", () => {
    const at = (id: string, flags: Flags) => holds(actor(id).when, { flags: { hero: "rhea", ...flags }, map: actor(id).map });
    expect(at("lanto-picket", { stage: "a2h" })).toBe(true);
    expect(at("lanto-picket", { stage: "a2c" })).toBe(false);
    expect(at("lanto-picket", { stage: "a2h", hero: "corran" })).toBe(false);
    expect(at("rafe-fence", { stage: "a5b" })).toBe(true);
    expect(at("rafe-back", { stage: "a6c" })).toBe(false);
    expect(at("rafe-back", { stage: "a6c", rafeLet: true })).toBe(true);
    expect(at("teodric-stage", { stage: "ah7" })).toBe(false);
    expect(at("teodric-stage", { stage: "ah8" })).toBe(true);
    expect(at("teodric-stage", { stage: "af2" })).toBe(true);
    expect(at("hallet-stockade", { stage: "af7", kaneArrested: true, "road.tarsis": "lulls" })).toBe(false);
    expect(at("hallet-stockade", { stage: "af7", kaneArrested: true, "road.tarsis": "greenlings" })).toBe(true);
    expect(at("corran-gate4", { stage: "af9", corranFate: "thornwick", corranWearing: true })).toBe(false);
    expect(at("finch-yard", { stage: "af10", finchInBroodhouse: true, yardFought: true, finchTrust: 59 })).toBe(false);
    expect(at("finch-yard", { stage: "af10", finchInBroodhouse: true, yardFought: true, finchTrust: 60 })).toBe(true);
  });

  it("Lanto: covering for him wins him; reporting him doesn't", () => {
    const f: Flags = { stage: "a2h" }; talk("lanto-picket", f, [0]);
    expect(f["recruited.lanto"]).toBe(true); expect(f["party.lanto"]).toBe(true);
    const g: Flags = { stage: "a2h" }; talk("lanto-picket", g, [2]);
    expect(g["recruited.lanto"]).toBeUndefined();
  });

  it("Wick: paying his brother's debt costs 25 coin, and can't be done without it", () => {
    const f: Flags = { stage: "a6" }; const t = talk("wick-punt", f, [0], 30);
    expect(f["recruited.wick"]).toBe(true); expect(t.purse()).toBe(5);
    const g: Flags = { stage: "a6" }; talk("wick-punt", g, [0], 10);
    expect(g["recruited.wick"]).toBeUndefined(); expect(g.wickDone).toBeUndefined();
  });

  it("Grue: only a riddle he hasn't heard", () => {
    const f: Flags = { stage: "a2" }; talk("grue-toll", f, [0]);
    expect(f["recruited.grue"]).toBeUndefined();
    talk("grue-toll", f, [2]);
    expect(f["recruited.grue"]).toBe(true);
  });

  it("Edda: helps hold the terrace in Act I, joins once the clans' debts are burned", () => {
    const f: Flags = { stage: "a5b" }; const t = talk("edda-terrace", f, [0]);
    expect(t.log).toContain("battle recruit-stampede"); expect(f.eddaHelped).toBe(true); expect(f["recruited.edda"]).toBeUndefined();
    Object.assign(f, { stage: "ab22", umeMet: true });
    talk("ume-debts", f, [0]);
    expect(f.clanDebtsBroken).toBe("burned"); expect(f["recruited.ume"]).toBe(true); expect(f["recruited.edda"]).toBe(true);
  });

  it("the Spire Folk: Isel opens the ridge and joins at the elders' fire; Dellan only for the truth", () => {
    const f: Flags = { stage: "ad7" };
    talk("dellan-quay", f); expect(f.dellanMet).toBe(true);
    talk("isel-cliff", f); expect(f["open.cloudline-vael"]).toBe(true);
    talk("elders-fire", f, [0]); expect(f.vaelAsked).toBe("told"); expect(f["recruited.isel"]).toBe(true);
    const g: Flags = { ...f }; talk("dellan-quay", g, [1]); expect(g["recruited.dellan"]).toBeUndefined();
    talk("dellan-quay", f, [0]); expect(f["recruited.dellan"]).toBe(true);
  });

  it("the Coldharrow strike: down the Deep for Dunstan; hold out for Tess; Joss either way", () => {
    const f: Flags = { stage: "ad7" };
    talk("joss-barrel", f); expect(f.strikeMet).toBe(true);
    talk("deep-head", f, [0]); expect(f["recruited.dunstan"]).toBe(true);
    talk("joss-barrel", f, [0]); expect(f["recruited.tess"]).toBe(true); expect(f["recruited.joss"]).toBe(true);
    const g: Flags = { stage: "ad7", strikeMet: true, deepDone: "sent" };
    talk("joss-barrel", g, [1]); expect(g["recruited.tess"]).toBeUndefined(); expect(g["recruited.joss"]).toBe(true);
  });

  it("Kane leaves the company when he's arrested", () => {
    expect(RECRUITS.find((r) => r.id === "kane")?.leaves).toEqual(["kaneArrested", "kaneTaken"]);
  });

  it("every recruit scene plays to its end down its first choices without breaking", () => {
    const mine = STORY.actors.filter((a) => a.talk?.length === 1 && "run" in a.talk[0] && STORY.moods!.scenes[(a.talk[0] as { run: string }).run] && /^[a-z]+-[a-z0-9]+$/.test(a.id));
    expect(mine.length).toBeGreaterThan(40);
    for (const a of mine) {
      const f: Flags = { stage: "ad7", hero: "rhea" };
      expect(() => new StoryRunner(STORY, host(f).h).run(a.talk!), a.id).not.toThrow();
    }
  });
});
