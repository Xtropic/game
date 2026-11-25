// How Thornwick looks: as its buildings are raised (base.lv.<building>), the map grows the things they add.
// The ledger crate (16,13) and the places people stand in the story stay clear.
import type { MapFile, TileKind } from "../world/map";
import type { Flags } from "../story/story";
import { levelOf } from "./base";

/** Extra legend for what the works add. */
const LEGEND: Record<string, TileKind> = { T: "table", C: "cart", S: "stall", G: "flag", B: "fire", A: "tent", r: "roof", h: "wall", F: "campfire", H: "hay" };
type Mark = [number, number, string];
const house = (x0: number, x1: number, y0: number): Mark[] => {
  const out: Mark[] = [];
  for (let x = x0; x <= x1; x++) { out.push([x, y0, "r"], [x, y0 + 1, "r"], [x, y0 + 2, "h"]); }
  return out;
};

/** For each building, what each level adds (each level keeps the ones below unless it rebuilds the spot). */
export const WORKS: Record<string, Mark[][]> = {
  forge: [[], [[23, 4, "F"]], house(22, 24, 3), [...house(22, 24, 3), [25, 5, "B"]]],
  infirmary: [[], [[18, 4, "A"], [19, 4, "A"], [18, 5, "A"], [19, 5, "A"]], house(18, 20, 3)],
  workshop: [[], [[19, 6, "T"]], [[19, 6, "T"], [20, 6, "C"], [21, 6, "T"]]],
  kitchen: [[], [[12, 12, "T"]], [[12, 12, "T"], [10, 12, "T"], [9, 13, "H"]]],
  stores: [[[17, 13, "C"]], [[17, 13, "C"], [16, 12, "S"]], [[17, 13, "C"], [16, 12, "S"], [17, 12, "S"]]],
  pens: [[], [], [[20, 10, "H"], [21, 10, "H"]]],
  school: [[], [[3, 7, "H"]], [[3, 7, "H"], [2, 7, "G"]]],
  watch: [[], [[11, 13, "G"], [17, 14, "G"]], [[11, 13, "G"], [17, 14, "G"], [10, 14, "B"]]],
};

/** Thornwick's map with the works built so far drawn in. Other maps come back unchanged. */
export function withWorks(file: MapFile, f: Flags): MapFile {
  if (file.id !== "thornwick") return file;
  const rows = file.rows.map((r) => [...r]), legend = { ...file.legend };
  for (const [ch, kind] of Object.entries(LEGEND)) if (!legend[ch]) legend[ch] = kind;
  for (const [b, levels] of Object.entries(WORKS)) {
    const marks = levels[Math.min(levelOf(f, b), levels.length - 1)] ?? [];
    for (const [x, y, ch] of marks) if (rows[y]?.[x] !== undefined) rows[y][x] = ch;
  }
  return { ...file, rows: rows.map((r) => r.join("")), legend };
}

/** A short key for what's been built, so the map is only rebuilt when something changes. */
export const worksKey = (f: Flags): string => Object.keys(WORKS).map((b) => levelOf(f, b)).join("");
