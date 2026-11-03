import { describe, expect, it } from "vitest";
import { TERMS, newTerm } from "../../src/story/terms";
import { storyLines } from "../../src/story/story";
import { STORY } from "../../src/world/content";

describe("notes on new words", () => {
  it("every word with a note is actually used in the story", () => {
    const all = storyLines(STORY).map((l) => l.text).join("\n");
    for (const t of TERMS) expect(t.match.test(all), t.id).toBe(true);
  });
  it("explains the first new word in a line, once", () => {
    const seen = new Set<string>();
    const t1 = newTerm("Eight months on Guild lulls. When one dies, the raw comes in a day.", (id) => seen.has(id));
    expect(t1?.id).toBe("guild"); seen.add("guild");
    expect(newTerm("Eight months on Guild lulls.", (id) => seen.has(id))?.id).toBe("lull");
    expect(newTerm("Reeve Aske rings the market bell", () => false)?.id).toBe("reeve"); // a bell ringing is not a lull ring
  });
  it("notes are short and plain", () => { for (const t of TERMS) expect(t.note.length, t.id).toBeLessThan(200); });
});

describe("backstory comes through the story", () => {
  const scripts = STORY.scripts as Record<string, { say?: string; text?: string }[]>;
  it("a new game opens with a person speaking, not a narrator explaining", () => {
    const lines = scripts.opening.filter((s) => s.text);
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l.say, l.text).not.toBe("");
  });
  // the scene where each word first turns up has a character saying it, so the player hears it in context
  const firstScene: Record<string, string> = { lull: "pilgrimFit", raw: "pilgrimFit", rings: "pilgrimFit", guild: "pilgrimFit", greenling: "pilgrimFit", warden: "pilgrimFit", larkfold: "pilgrimFit", cloudpath: "pilgrimFit", kith: "smokeComes", lorne: "beg", commons: "meetBrannoc", reeve: "townMeeting", sorting: "afterCarts" };
  for (const [id, scene] of Object.entries(firstScene)) it(`${id} is spoken in ${scene}`, () => {
    const term = TERMS.find((t) => t.id === id)!;
    const said = storyLines({ ...STORY, actors: [], steps: [], zones: [], looks: [], songs: [], hazards: [], scripts: { [scene]: STORY.scripts[scene] } } as typeof STORY).filter((l) => l.who !== "" && l.who !== "narrator" && term.match.test(l.text));
    expect(said.length, `${id} in ${scene}`).toBeGreaterThan(0);
  });
});
