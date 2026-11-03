import { describe, expect, it } from "vitest";
import { ATTRS, attrsAt } from "../../src/cast/attributes";
import { addKithXp, kithAttrs, kithXpToNext, movesAt, shapeCap, SHAPE_FLOOR, type Kith } from "../../src/kith/kith";
import { SOURCES, handlerPull, learnFromBattle, nurture, raiseDay, readKith, sourcesOf, starterAsh, type Day } from "../../src/kith/upbringing";
import { EVEN, buildOf, pickPortrait, portraitKeys } from "../../src/art/build";

const foal = (over: Partial<Kith> = {}): Kith => ({
  id: "k", name: "Bram", species: "loftbuck", level: 1, xp: 0, potential: [3, 3, 3, 3, 3, 3, 3], trained: [0, 0, 0, 0, 0, 0, 0],
  traits: [], moves: movesAt("loftbuck", 1), temperament: "gentle", strain: "grey", bond: 20, generation: 1, ...over,
});

/** Raises a kith the same way every day until it reaches a level, about 6 days a level. */
function raise(k: Kith, day: Day, to: number): Kith {
  while (k.level < to) { for (let i = 0; i < 6; i++) raiseDay(k, day); addKithXp(k, kithXpToNext(k.level)); }
  return k;
}
const A = (k: Kith) => kithAttrs(k);

describe("steering a kith by how it is raised", () => {
  it("every source pulls on all seven attributes, and each kind has choices", () => {
    for (const [id, s] of Object.entries(SOURCES)) expect(s.pull.length, id).toBe(7);
    for (const kind of ["feed", "work", "pen", "battle"] as const) expect(sourcesOf(kind).length, kind).toBeGreaterThanOrEqual(4);
  });

  it("a heavy upbringing builds might and grit and costs finesse; a scout's builds finesse and wits", () => {
    const heavy = raise(foal(), { feed: "feed:grain-mash", work: "work:haul", pen: "pen:cold-yard" }, 30);
    const scout = raise(foal(), { feed: "feed:river-fish", work: "work:scout", pen: "pen:high-loft" }, 30);
    const plain = raise(foal(), {}, 30);
    expect(A(heavy).might).toBeGreaterThan(A(plain).might); expect(A(heavy).grit).toBeGreaterThan(A(plain).grit);
    expect(A(heavy).finesse).toBeLessThan(A(plain).finesse);
    expect(A(scout).finesse).toBeGreaterThan(A(heavy).finesse + 4); expect(A(scout).wits).toBeGreaterThan(A(plain).wits);
    // the gap is real but bounded: never more than the potential cap above, or the floor below, the plain kith
    for (const a of ATTRS) { expect(A(heavy)[a] - A(plain)[a]).toBeLessThanOrEqual(shapeCap(3)); expect(A(heavy)[a] - A(plain)[a]).toBeGreaterThanOrEqual(SHAPE_FLOOR); }
  });

  it("more potential leaves more room to steer", () => {
    const day = { feed: "feed:grain-mash", work: "work:haul" };
    const lo = raise(foal({ potential: [1, 3, 3, 3, 3, 3, 3] }), day, 50), hi = raise(foal({ potential: [5, 3, 3, 3, 3, 3, 3] }), day, 50);
    expect(lo.shaped![0]).toBeCloseTo(shapeCap(1)); expect(hi.shaped![0]).toBeGreaterThan(shapeCap(1));
  });

  it("a stubborn kith is slower to steer and a curious one quicker", () => {
    const day = { work: "work:scout" };
    const st = raise(foal({ temperament: "stubborn" }), day, 12), cu = raise(foal({ temperament: "curious" }), day, 12);
    expect(cu.habits![2]).toBeGreaterThan(st.habits![2]);
  });

  it("habits fade, so changing its life changes its direction", () => {
    const k = raise(foal(), { feed: "feed:grain-mash", work: "work:haul" }, 15);
    const mid = A(k).finesse;
    raise(k, { feed: "feed:river-fish", work: "work:run" }, 30);
    expect(k.habits![2]).toBeGreaterThan(k.habits![0]);
    expect(A(k).finesse - mid).toBeGreaterThan(A(raise(foal(), { feed: "feed:grain-mash", work: "work:haul" }, 30)).finesse - mid);
  });

  it("a handler rubs off: their strongest attributes pull, and their heart builds bond", () => {
    const tamsin = attrsAt("tamsin", 10), p = handlerPull(tamsin);
    expect(p.filter((x) => x > 0).length).toBe(2);
    const k = foal(); raiseDay(k, { handler: tamsin }); expect(k.bond).toBeGreaterThan(20);
  });

  it("battles teach what the kith did: covering builds grit and nerve", () => {
    const k = foal(); learnFromBattle(k, { cover: 3, struck: 3 });
    expect(k.habits![1]).toBeGreaterThan(k.habits![0]); expect(k.habits![3]).toBeGreaterThan(0);
  });

  it("says in words where it is heading, never in numbers", () => {
    const k = foal(); nurture(k, "work:scout", 4);
    const said = readKith(k).join(" ");
    expect(said).toMatch(/lighter on its feet|watches everything/); expect(said).not.toMatch(/\d/);
    expect(readKith(foal())[0]).toMatch(/growing the way its kind does/);
  });

  it("an unsteered gentle kith grows exactly as before", () => {
    const k = raise(foal(), {}, 20), plain = foal({ level: 20 });
    expect(A(k)).toEqual(A(plain));
  });
});

describe("looks follow attributes", () => {
  it("a heavy-raised kith is bulky, a scout-raised one is long and lean", () => {
    const heavy = raise(foal(), { feed: "feed:grain-mash", work: "work:haul", pen: "pen:cold-yard" }, 30);
    const scout = raise(foal(), { feed: "feed:river-fish", work: "work:scout", pen: "pen:high-loft" }, 30);
    const bh = buildOf(A(heavy), { level: 30 }), bs = buildOf(A(scout), { level: 30 });
    expect(bh.bulk).toBeGreaterThan(0.2); expect(bs.reach).toBeGreaterThan(0.2); expect(bs.bulk).toBeLessThan(bh.bulk);
  });

  it("an even spread of attributes is an even build", () => {
    const b = buildOf({ might: 9, grit: 9, finesse: 9, nerve: 9, wits: 9, heart: 9, presence: 9 });
    expect({ ...b, worn: 0 }).toEqual({ ...EVEN, worn: 0 });
  });

  it("the lull and the raw show: rings on the neck, pallor, and their own portraits when painted", () => {
    const lull = buildOf(attrsAt("corran", 8, ["lull"]), { level: 8, mods: ["lull"], rings: 4 });
    const raw = buildOf(attrsAt("corran", 8, ["raw"]), { level: 8, mods: ["raw"], rings: 4 });
    expect(lull.rings).toBe(4); expect(lull.raw).toBe(false); expect(raw.raw).toBe(true);
    const keys = portraitKeys("corran", raw); expect(keys.slice(0, 2)).toEqual(["corran@raw", "corran@ringed"]); expect(keys.at(-1)).toBe("corran");
    expect(pickPortrait(portraitKeys("corran", raw), (k) => k === "corran")).toBe("corran");
    expect(pickPortrait(portraitKeys("corran", raw), (k) => k === "corran" || k === "corran@ringed")).toBe("corran@ringed");
  });

  it("Ash starts as a real kith with a build", () => {
    const a = starterAsh(); expect(a.level).toBe(5); expect(a.moves.length).toBeGreaterThan(0);
    expect(Object.keys(buildOf(kithAttrs(a), { level: 5 }))).toEqual(Object.keys(EVEN));
  });
});
