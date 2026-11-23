import { describe, expect, it } from "vitest";
import { SHOPS, buy, wareInfo } from "../../src/ui/shopPanel";
import story from "../../data/story/towns.json";

const maps = import.meta.glob<{ id: string; rows: string[] }>("../../data/maps/*.json", { eager: true, import: "default" });
const map = (id: string) => Object.values(maps).find((m) => m.id === id);

describe("larger towns", () => {
  it("every district gate leads to a real map and lands on open ground, and every district has a way back", () => {
    const gotos = story.steps.flatMap((s) => s.do.map((d) => ({ from: s.map, to: (d as { goto: { map: string; x: number; y: number } }).goto })));
    const districts = Object.values(maps).filter((m) => m.id.includes("--"));
    expect(districts.length).toBeGreaterThanOrEqual(7);
    for (const d of districts) {
      expect(gotos.some((g) => g.from === d.id), `${d.id} has no way out`).toBe(true);
      expect(gotos.some((g) => g.to.map === d.id), `${d.id} has no way in`).toBe(true);
    }
    for (const g of gotos.filter((x) => !x.to.map.startsWith("land-"))) { const m = map(g.to.map); expect(m, g.to.map).toBeDefined(); expect(",.:p").toContain(m!.rows[g.to.y][g.to.x]); }
  });

  it("every stall sells real things, and buying costs coin", () => {
    for (const s of Object.values(SHOPS)) for (const [id, price] of s.wares) { expect(wareInfo(id).text, id).not.toBe(""); expect(price).toBeGreaterThan(0); }
    const g = { coin: 20, flags: {} as Record<string, number> };
    expect(buy(g, "bandage", 8)).toBe(true); expect(g.coin).toBe(12); expect(g.flags["have.bandage"]).toBe(1);
    expect(buy(g, "cord-silk", 70)).toBe(false); expect(g.coin).toBe(12);
    const keepers = story.actors.filter((a) => a.talk.some((t) => "shop" in t));
    expect(keepers.map((a) => (a.talk.find((t) => "shop" in t) as { shop: string }).shop).sort()).toEqual(Object.keys(SHOPS).sort());
  });
});
