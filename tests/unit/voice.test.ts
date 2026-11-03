import { describe, expect, it } from "vitest";
import { lineHash } from "../../src/audio/voice";
import { mapLines } from "../../src/world/lines";
import type { MapFile } from "../../src/world/map";
import { storyLines } from "../../src/story/story";
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

  it("every spoken line in the maps has a recording and a lip-sync envelope (run tools/voice if this fails)", () => {
    expect(Object.keys(maps).length).toBeGreaterThan(0);
    for (const [f, m] of Object.entries(maps)) {
      for (const l of mapLines(m)) {
        const h = lineHash(l.who, l.text);
        expect(idx[h], `${f}: ${l.who}: ${l.text}`).toMatch(/^[0-9]+$/);
        expect(mp3s.has(`${h}.mp3`), `${h}.mp3`).toBe(true);
      }
    }
  });

  it("every line in the story, and every choice a character says aloud, is recorded too", () => {
    const lines = storyLines(STORY);
    expect(lines.length).toBeGreaterThan(80);
    for (const l of lines) {
      const h = lineHash(l.who, l.text);
      expect(idx[h], `${l.who}: ${l.text}`).toMatch(/^[0-9]+$/);
      expect(mp3s.has(`${h}.mp3`), `${h}.mp3 for ${l.text}`).toBe(true);
    }
  });
});
