import { describe, expect, it } from "vitest";
import { ATTRS } from "../../src/cast/attributes";
import { seeded } from "../../src/battle/rules";
import { FAMILIES, SPECIES, TRAITS, addKithXp, breed, canBreed, familiesOf, foalToKith, hybridFor, kithAttrs, movesAt, stageOf, unseenFor, wildKith, type Kith } from "../../src/kith/kith";

const make = (species: string, level = 25, over: Partial<Kith> = {}): Kith => ({
  id: `${species}-${level}`, name: species, species, level, xp: 0, potential: [3, 3, 3, 3, 3, 3, 3], trained: [0, 0, 0, 0, 0, 0, 0],
  traits: [], moves: movesAt(species, level).slice(-4), temperament: "gentle", strain: "grey", bond: 50, generation: 1, ...over,
});

describe("kith species", () => {
  it("has 24 base species in 8 families, 16 hybrids, 12 unseen and 4 legends, all well formed", () => {
    const all = Object.values(SPECIES), count = (k: string) => all.filter((s) => s.kind === k).length;
    expect([count("base"), count("hybrid"), count("unseen"), count("legend")]).toEqual([24, 16, 12, 4]);
    for (const f of Object.keys(FAMILIES)) expect(all.filter((s) => s.kind === "base" && s.family === f).length, f).toBe(3);
    for (const s of all) {
      expect(s.moves.length, s.id).toBe(6);
      for (const f of familiesOf(s.id)) expect(FAMILIES[f], `${s.id} family ${f}`).toBeDefined();
      if (s.recipe) for (const p of s.recipe.parents) expect(SPECIES[p] ?? FAMILIES[p], `${s.id} parent ${p}`).toBeDefined();
    }
    expect(Object.keys(TRAITS).length).toBe(40);
  });

  it("makes each of the 16 hybrids from exactly one pair of families", () => {
    const pairs = new Set(Object.values(SPECIES).filter((s) => s.kind === "hybrid").map((s) => [...s.parents!].sort().join("+")));
    expect(pairs.size).toBe(16);
    expect(hybridFor("mistwing", "loftbuck")).toBe("glidebuck");
    expect(hybridFor("loftbuck", "wadeskin")).toBeUndefined();
  });
});

describe("kith growth", () => {
  it("grows with level and potential, and ages into an elder", () => {
    const lo = make("loftbuck", 10), hi = make("loftbuck", 30), star = make("loftbuck", 30, { potential: [5, 5, 5, 5, 5, 5, 5] });
    for (const a of ATTRS) { expect(kithAttrs(hi)[a]).toBeGreaterThanOrEqual(kithAttrs(lo)[a]); expect(kithAttrs(star)[a]).toBeGreaterThanOrEqual(kithAttrs(hi)[a]); }
    expect(kithAttrs(make("ironback", 30)).grit).toBeGreaterThan(kithAttrs(make("mistwing", 30)).grit);
    expect(kithAttrs(make("mistwing", 30)).finesse).toBeGreaterThan(kithAttrs(make("ironback", 30)).finesse);
    expect([stageOf(1), stageOf(12), stageOf(25), stageOf(45)]).toEqual(["foal", "yearling", "adult", "elder"]);
    const old = make("loftbuck", 50), prime = make("loftbuck", 39);
    expect(kithAttrs(old).heart).toBeGreaterThan(kithAttrs(prime).heart);
  });

  it("a wild lull makes a kith calmer but duller", () => {
    const k = make("reedcat", 20), worn = { ...k, lull: true };
    expect(kithAttrs(worn).nerve).toBeGreaterThan(kithAttrs(k).nerve); expect(kithAttrs(worn).might).toBeLessThan(kithAttrs(k).might);
  });

  it("levels up and learns moves", () => {
    const k = make("loftbuck", 1); expect(addKithXp(k, 1000).length).toBeGreaterThan(3);
    expect(movesAt("loftbuck", 1)).toEqual(["Butt"]); expect(movesAt("loftbuck", 31).length).toBe(6);
  });
});

describe("kith breeding", () => {
  it("only breeds grown, compatible pairs", () => {
    expect(canBreed(make("loftbuck"), make("loftbuck", 5)).ok).toBe(false);
    expect(canBreed(make("loftbuck"), make("canal-wadeskin")).ok).toBe(false);
    expect(canBreed(make("loftbuck"), make("terrace-doe")).ok).toBe(true);
    expect(canBreed(make("loftbuck"), make("mistwing")).ok).toBe(true);
    expect(canBreed(make("matriarch"), make("ironback")).ok).toBe(false);
  });

  it("crosses two families into their hybrid, and keeps a species within a family", () => {
    expect(breed(make("loftbuck"), make("mistwing"), { rng: seeded(3) })!.species).toBe("glidebuck");
    const f = breed(make("loftbuck"), make("terrace-doe"), { rng: seeded(4) })!;
    expect(["loftbuck", "terrace-doe"]).toContain(f.species);
  });

  it("finds unseen kith only when their recipe is met", () => {
    const a = make("loftbuck"), b = make("loftbuck", 26);
    expect(unseenFor(a, b, { rng: seeded(1) }).map((s) => s.id)).not.toContain("night-grazer");
    expect(unseenFor(a, b, { rng: seeded(1), moonlit: true }).map((s) => s.id)).toContain("night-grazer");
    expect(breed(a, b, { rng: seeded(1), moonlit: true })!.species).toBe("night-grazer");
    const s = breed(make("spring-hearthling"), make("cinder-hearthling"), { rng: seeded(2), place: "greenling-caves" })!;
    expect(s.species).toBe("greenling-hearthling"); expect(s.unseen).toBe(true);
  });

  it("passes potential down, so good lines improve over generations", () => {
    const rng = seeded(11);
    let a = make("ironback", 25, { potential: [2, 2, 2, 2, 2, 2, 2] }), b = make("ironback", 26, { potential: [3, 3, 3, 3, 3, 3, 3] });
    const start = a.potential.reduce((n, x) => n + x, 0);
    for (let gen = 0; gen < 6; gen++) {
      const f = breed(a, b, { rng, wing: 3 })!; const k = foalToKith(f, `g${gen}`, "foal"); k.level = 25;
      if (k.potential.reduce((n, x) => n + x, 0) >= a.potential.reduce((n, x) => n + x, 0)) a = k; else b = k;
    }
    expect(Math.max(a.potential.reduce((n, x) => n + x, 0), b.potential.reduce((n, x) => n + x, 0))).toBeGreaterThan(start + 4);
    for (const p of [...a.potential, ...b.potential]) { expect(p).toBeGreaterThanOrEqual(1); expect(p).toBeLessThanOrEqual(5); }
  });

  it("hides the bone sickness in carriers and shows it only when both parents carry it", () => {
    const rng = seeded(5); let shown = 0, carriers = 0;
    for (let i = 0; i < 200; i++) {
      const f = breed(make("ironback", 25, { carrier: true }), make("ironback", 26, { traits: ["bone-sickness"] }), { rng })!;
      if (f.traits.includes("bone-sickness")) shown++; else if (f.carrier) carriers++;
    }
    expect(shown).toBeGreaterThan(50); expect(carriers).toBeGreaterThan(50);
    for (let i = 0; i < 50; i++) expect(breed(make("ironback"), make("ironback", 26), { rng })!.traits).not.toContain("bone-sickness");
  });

  it("passes on inherited moves and a temperament, and catches wild kith", () => {
    const a = make("reedcat", 30, { moves: ["Pounce", "Ledge Kick"] }), f = breed(a, make("salt-reedcat", 30), { rng: seeded(8) })!;
    expect(f.moves.length).toBeGreaterThanOrEqual(1); expect(f.generation).toBe(2);
    const w = wildKith("loftbuck", 8, seeded(9)); expect(w.moves.length).toBeGreaterThan(0); expect(w.potential.every((p) => p >= 1 && p <= 5)).toBe(true);
  });
});
