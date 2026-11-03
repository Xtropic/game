import { describe, expect, it } from "vitest";
import { seeded } from "../../src/battle/rules";
import { COLOURS, PATTERNS, REGIONS, SPECIES, TRAITS, breed, breedLitter, canBreed, coatOf, formsIn, movesAt, nativesOf, shownCoat, unseenFor, wildIn, wildKith, type Kith } from "../../src/kith/kith";

const make = (species: string, over: Partial<Kith> = {}): Kith => ({
  id: `${species}-${Math.random()}`, name: species, species, level: 25, xp: 0, potential: [3, 3, 3, 3, 3, 3, 3], trained: [0, 0, 0, 0, 0, 0, 0],
  traits: [], moves: movesAt(species, 25).slice(-4), temperament: "gentle", strain: "grey", bond: 50, generation: 1, ...over,
});
/** Breeds a pair many times and counts what comes out. */
function tally(a: Kith, b: Kith, place: string | undefined, n = 400, extra = {}) {
  const rng = seeded(7), out: Record<string, number> = {};
  for (let i = 0; i < n; i++) { const f = breed(a, b, { rng, place, ...extra })!; out[f.species] = (out[f.species] ?? 0) + 1; }
  return out;
}

describe("regions", () => {
  it("every one of the 25 regions has at least 3 native kith and only real roaming kinds", () => {
    expect(Object.keys(REGIONS).length).toBe(25);
    for (const r of Object.keys(REGIONS)) {
      expect(nativesOf(r).length, r).toBeGreaterThanOrEqual(3);
      for (const x of REGIONS[r].roaming) expect(SPECIES[x], `${r} roams ${x}`).toBeDefined();
      if (REGIONS[r].breed.trait) expect(TRAITS[REGIONS[r].breed.trait!], r).toBeDefined();
      for (const c of REGIONS[r].colours) expect(COLOURS).toContain(c);
    }
    expect(wildIn("drevka")).toEqual(expect.arrayContaining(["ironback", "cliff-bellower", "plateau-ironback"]));
  });

  it("each regional form lives in a real region, and the new species describe their looks", () => {
    for (const s of Object.values(SPECIES)) if (s.kind === "regional") expect(REGIONS[s.region!], s.id).toBeDefined();
    expect(Object.values(SPECIES).filter((s) => s.look).length).toBe(108); // every species added this round, and every hybrid, describes its look
  });
});

describe("breeding variations", () => {
  it("breeding a family in a region can give its local form; two of the form breed true", () => {
    const home = tally(make("ironback"), make("ironback"), "corvane"), away = tally(make("ironback"), make("ironback"), "thornwick");
    expect(home["vault-ironback"]).toBeGreaterThan(80); expect(away["vault-ironback"]).toBeUndefined();
    expect(tally(make("vault-ironback"), make("vault-ironback"), "corvane")["vault-ironback"]).toBe(400);
    expect(formsIn("ironback", "corvane")).toEqual(["vault-ironback"]);
  });

  it("regions favour an attribute or a trait", () => {
    const rng = seeded(3); let drevka = 0, plain = 0, hot = 0;
    for (let i = 0; i < 400; i++) {
      drevka += breed(make("ironback"), make("ironback"), { rng, place: "drevka" })!.potential[0];
      plain += breed(make("ironback"), make("ironback"), { rng, place: "thornwick" })!.potential[0];
      if (breed(make("ember-strider"), make("ember-strider"), { rng, place: "ember" })!.traits.includes("heat-proof")) hot++;
    }
    expect(drevka).toBeGreaterThan(plain + 60); expect(hot).toBeGreaterThan(120);
  });

  it("the College never passes on the bone sickness", () => {
    const rng = seeded(5), sick = make("loftbuck", { traits: ["bone-sickness"] }), sick2 = make("loftbuck", { carrier: true });
    for (let i = 0; i < 200; i++) { const f = breed(sick, sick2, { rng, place: "college" })!; expect(f.traits).not.toContain("bone-sickness"); expect(f.carrier).toBe(false); }
  });

  it("coats: hidden genes surface, the dominant one shows, and wild kith carry local colours", () => {
    const a = make("loftbuck", { coat: { colour: ["grey", "cream"], pattern: ["plain", "starred"] } }), b = make("loftbuck", { coat: { colour: ["grey", "cream"], pattern: ["plain", "starred"] } });
    expect(shownCoat(coatOf(a))).toEqual({ colour: "grey", pattern: "plain" });
    const rng = seeded(11); let cream = 0, starred = 0;
    for (let i = 0; i < 400; i++) { const c = shownCoat(breed(a, b, { rng })!.coat); if (c.colour === "cream") cream++; if (c.pattern === "starred") starred++; }
    expect(cream).toBeGreaterThan(60); expect(cream).toBeLessThan(150); expect(starred).toBeGreaterThan(60);
    const caught = Array.from({ length: 100 }, (_, i) => wildKith("spirecrest", 10, seeded(i), "w", "vael"));
    expect(caught.filter((k) => k.coat!.colour.includes("silver")).length).toBeGreaterThan(40);
    expect(PATTERNS[0]).toBe("plain");
  });

  it("throwbacks return to a grandparent's species", () => {
    const glide = make("glidebuck", { lineage: ["loftbuck", "mistwing"] }), glide2 = make("glidebuck", { lineage: ["loftbuck", "mistwing"] });
    const out = tally(glide, glide2, "thornwick", 1500);
    expect((out.loftbuck ?? 0) + (out.mistwing ?? 0)).toBeGreaterThan(20);
    expect(out.glidebuck).toBeGreaterThan(1300);
  });

  it("twins come more often from deeply bonded pairs", () => {
    const rng = seeded(9); let low = 0, high = 0;
    for (let i = 0; i < 3000; i++) { if (breedLitter(make("loftbuck", { bond: 20 }), make("loftbuck", { bond: 20 }), { rng }).length === 2) low++; if (breedLitter(make("loftbuck", { bond: 90 }), make("loftbuck", { bond: 90 }), { rng }).length === 2) high++; }
    expect(low).toBeGreaterThan(40); expect(high).toBeGreaterThan(low * 1.6);
  });

  it("a pure line breeds true after three generations, sooner at the Salt House", () => {
    const rng = seeded(4), pure = (line: number) => make("brineback", { line });
    expect(breed(pure(3), pure(3), { rng, place: "thornwick" })!.trueBred).toBe(true);
    expect(breed(pure(2), pure(2), { rng, place: "thornwick" })!.trueBred).toBe(false);
    expect(breed(pure(2), pure(2), { rng, place: "salt-house" })!.trueBred).toBe(true);
    expect(breed(pure(3), make("loftbuck"), { rng }) ).toBeNull();
  });

  it("new regional unseen kith need their region", () => {
    const a = make("treeloper"), b = make("treeloper"), night = { rng: seeded(1), moonlit: true };
    expect(unseenFor(a, b, { ...night, place: "cloud-forest" }).map((s) => s.id)).toContain("ghost-loper");
    expect(unseenFor(a, b, { ...night, place: "thornwick" }).map((s) => s.id)).not.toContain("ghost-loper");
    expect(unseenFor(make("bellower"), make("bellower"), { rng: seeded(1), place: "vael" }).map((s) => s.id)).toContain("anthem-bellower");
    expect(canBreed(make("bellower"), make("canal-gloamer")).ok).toBe(true);
  });
});
