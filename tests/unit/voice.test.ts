import { describe, expect, it } from "vitest";
import { lineHash } from "../../src/audio/voice";
import { mapLines } from "../../src/world/lines";
import type { MapFile } from "../../src/world/map";
import { voicedLines } from "../../src/story/story";
import { STORY } from "../../src/world/content";

import index from "../../public/vo/index.json";

const maps = import.meta.glob<MapFile>("../../data/maps/*.json", { eager: true, import: "default" });
const mp3s = new Set(Object.keys(import.meta.glob("../../public/vo/*.mp3")).map((p) => p.split("/").pop()));
const idx = index as Record<string, string>;

describe("voice lines", () => {
  it("hashes like the recording tool (FNV-1a over UTF-16, quotes and spacing ignored)", () => {
    expect(lineHash("rhea", "Hello")).toBe(lineHash("rhea", "  “Hello”  "));
    expect(lineHash("rhea", "Hello")).not.toBe(lineHash("finch", "Hello"));
    expect(lineHash("rhea", "Hello")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("only plot-point lines are voiced, and every one of them is recorded (run tools/voice if this fails)", () => {
    const lines = voicedLines(STORY);
    expect(lines.length).toBeGreaterThan(40);
    expect(lines.every((l) => l.who !== "narrator")).toBe(true);
    for (const l of lines) {
      const h = lineHash(l.who, l.text);
      expect(idx[h], `${l.who}: ${l.text}`).toMatch(/^[0-9]+$/);
      expect(mp3s.has(`${h}.mp3`), `${h}.mp3 for ${l.text}`).toBe(true);
    }
    // everyday talk stays unvoiced: no recordings beyond the plot lines
    expect(Object.keys(idx).length).toBe(lines.length);
  });

  it("everyday lines on the maps are read, not heard", () => {
    expect(Object.keys(maps).length).toBeGreaterThan(0);
    const spoken = mapLines(Object.values(maps)[0]);
    for (const l of spoken) expect(idx[lineHash(l.who, l.text)]).toBeUndefined();
  });
});
