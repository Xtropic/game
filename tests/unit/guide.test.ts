import { describe, expect, it } from "vitest";
import { GROUPS, TOPICS, topic } from "../../src/guide/topics";
import { keys, unreadCount } from "../../src/guide/guideScene";
import { DEFAULT_KEYS } from "../../src/core/input";
import explore from "../../src/world/exploreScene.ts?raw";
import battle from "../../src/battle/battleScene.ts?raw";
import duel from "../../src/battle/duelScene.ts?raw";
import army from "../../src/army/armyScene.ts?raw";
import ledger from "../../src/ui/basePanel.ts?raw";
import menu from "../../src/ui/gameMenu.ts?raw";

describe("the Guide", () => {
  it("has unique topics, each in a known group, with pages", () => {
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
    for (const t of TOPICS) { expect(GROUPS).toContain(t.group); expect(t.pages.length).toBeGreaterThan(0); for (const p of t.pages) { expect(p.head).toBeTruthy(); expect(p.text.length).toBeGreaterThan(40); } }
  });
  it("only names keys the game knows", () => {
    for (const t of TOPICS) for (const p of t.pages) expect(keys(p.text)).not.toMatch(/\{\w+\}/);
    expect(keys("{guide}")).toBe("G");
    expect(Object.entries(DEFAULT_KEYS).some(([k, a]) => k === "KeyG" && a === "guide")).toBe(true);
  });
  it("every topic the game teaches exists", () => {
    const src = [explore, battle, duel, army, ledger, menu].join("\n");
    const taught = new Set<string>();
    for (const m of src.matchAll(/teach\(this\.(?:host\.)?game, ([^)]*)\)/g)) for (const q of m[1].matchAll(/"([a-z]+)"/g)) taught.add(q[1]);
    for (const m of src.matchAll(/ids(?:\.push\(| = \[)([^)\]]*)[)\]]/g)) for (const q of m[1].matchAll(/"([a-z]+)"/g)) taught.add(q[1]);
    for (const m of src.matchAll(/(?:Forge|Pens|Train|Roads): "([a-z]+)"/g)) taught.add(m[1]);
    for (const id of taught) expect(topic(id), id).toBeTruthy();
    for (const t of TOPICS) expect(taught.has(t.id), `${t.id} is never taught`).toBe(true);
  });
  it("counts pages met but not read", () => {
    expect(unreadCount({ "guide.basics": 1, "guide.battles": 1, "guide.read.basics": 1 })).toBe(1);
  });
});
