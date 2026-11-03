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
