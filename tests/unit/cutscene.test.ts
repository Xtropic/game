import { describe, expect, it } from "vitest";
import { STORY } from "../../src/world/content";
import { HOOKS, weaveCutscenes } from "../../src/cutscene/hooks";
import type { Step } from "../../src/story/story";

// the scenes' paint box pulls in battle art, which makes canvases as it loads: give it a stand-in
const g = globalThis as unknown as { document?: unknown };
g.document ??= { createElement: () => ({ getContext: () => ({ imageSmoothingEnabled: false }), width: 0, height: 0 }) };
const { CUTSCENES } = await import("../../src/cutscene/scenes");

/** Every { cut } step anywhere in the story. */
function cuts(): string[] {
  const out: string[] = [];
  const walk = (steps: Step[] | undefined): void => {
    for (const st of steps ?? []) {
      if ("cut" in st) out.push(st.cut);
      if ("if" in st || "pay" in st) { walk(st.then); walk(st.else); }
      if ("choose" in st) for (const o of st.options) walk(o.do);
      if ("battle" in st) walk(st.win);
      if ("duel" in st || "army" in st) { walk(st.win); walk(st.lose); }
    }
  };
  for (const sc of Object.values(STORY.scripts)) walk(sc);
  return out;
}

describe("cut scenes", () => {
  it("every hook finds its script and line (a rewrite that drops one fails here)", () => {
    expect(weaveCutscenes(STORY)).toEqual([]);
  });
  it("each hooked scene exists, and plays at exactly one place", () => {
    for (const h of HOOKS) expect(CUTSCENES[h.scene], h.scene).toBeDefined();
    const all = cuts();
    for (const h of HOOKS) expect(all.filter((c) => c === h.scene).length, h.scene).toBe(1);
    for (const c of all) expect(CUTSCENES[c], c).toBeDefined();
  });
  it("weaving twice adds nothing", () => {
    const before = cuts().length;
    weaveCutscenes(STORY);
    expect(cuts().length).toBe(before);
  });
  it("scenes are short: each under 16 seconds, every shot at least a second", () => {
    for (const d of Object.values(CUTSCENES)) {
      const total = d.shots.reduce((a, s) => a + s.dur, 0);
      expect(total, d.id).toBeLessThan(16);
      for (const s of d.shots) expect(s.dur, d.id).toBeGreaterThanOrEqual(1);
    }
  });
});
