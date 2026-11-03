import { describe, expect, it } from "vitest";
import { RECRUITS, recruitsByRole } from "../../src/cast/recruits";
import portraits from "../../public/portraits/index.json";

const jpgs = new Set(Object.keys(import.meta.glob("../../public/portraits/*.jpg")).map((p) => p.split("/").pop()));
const idx = portraits as Record<string, string[]>;

describe("recruitable cast", () => {
  it("has unique ids and a role, a way to join and a look for everyone", () => {
    expect(new Set(RECRUITS.map((r) => r.id)).size).toBe(RECRUITS.length);
    for (const r of RECRUITS) {
      expect(["party", "command", "base"], r.id).toContain(r.role);
      expect(r.how.length, r.id).toBeGreaterThan(10);
      expect(r.look.length, r.id).toBeGreaterThan(3);
      if (r.look !== "done") expect(r.bg, r.id).toBeTruthy();
    }
    expect(recruitsByRole("party").length + recruitsByRole("command").length + recruitsByRole("base").length).toBe(RECRUITS.length);
  });

  it("every recruit has a painted portrait listed and present (paint one with tools/portraits if this fails)", () => {
    for (const r of RECRUITS) {
      expect(idx[r.id], r.id).toBeDefined();
      for (const f of idx[r.id]) expect(jpgs.has(f), f).toBe(true);
    }
  });
});
