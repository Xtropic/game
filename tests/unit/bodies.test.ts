import { describe, expect, it } from "vitest";
import FRAMES from "../../src/art/peopleFrames.json";
import { LOOKS, saturate, toneOf } from "../../src/art/people";
import { BODIES, BODY_SHAPE, bodyOf } from "../../src/art/bodies";
import { RECRUITS } from "../../src/cast/recruits";

describe("bodies", () => {
  it("every look has a map sprite for its body, hair and beard", () => {
    const sets = FRAMES.sets as Record<string, unknown>;
    for (const [id, l] of Object.entries(LOOKS)) {
      const body = bodyOf(id), key = `${body}|${l.style ?? "short"}|${body === "small" ? "none" : l.beardStyle ?? "none"}`;
      expect(sets[key], `${id}: ${key}`).toBeDefined();
    }
  });
  it("the main cast are not all built alike, and battle figures use the same body as the map", () => {
    const main = ["rhea", "corran", "tamsin", "finch", "maren", "rook", "brannoc", "kane", "ferris", "oren", "halloran"];
    expect(new Set(main.map(bodyOf)).size).toBeGreaterThanOrEqual(6);
    for (const id of Object.keys(BODIES)) expect(BODY_SHAPE[BODIES[id]], id).toBeDefined();
    const h = (id: string) => BODY_SHAPE[bodyOf(id)].h, w = (id: string) => BODY_SHAPE[bodyOf(id)].w;
    expect(h("brannoc")).toBeGreaterThan(h("rhea")); expect(w("brannoc")).toBeGreaterThan(w("rhea"));
    expect(h("ketti")).toBeLessThan(h("rhea")); expect(w("rook")).toBeGreaterThan(w("corran"));
  });
  it("people who can join you are drawn bright; everyone else muted", () => {
    const r = new Set(RECRUITS.map((x) => x.id));
    expect(toneOf("tamsin", r)).toBe("vivid"); expect(toneOf("rhea", r)).toBe("vivid");
    expect(toneOf("vil2", r)).toBe("muted"); expect(toneOf("warden", r)).toBe("muted");
    expect(saturate("#808080", 1)).toBe("#979797"); // grey stays grey, just lifted
  });
});
