// Saves made before Ostrel became ten lands stood on the old single world map, "ostrel". Such a save is moved to
// the same place on the new lands: the old place nearest to where it stood, one step south of that place.
import type { MapFile } from "./map";

const OLD: [string, number, number][] = [["larkfold", 22, 20], ["ferrow", 31, 31], ["camp", 59, 26], ["millbridge", 36, 36], ["bend", 44, 37], ["sallow", 50, 41], ["vantry", 53, 50], ["holm", 52, 4], ["kestrel-fort", 80, 19], ["corvane", 62, 37], ["hollin", 21, 37], ["college", 27, 46], ["kingsmere", 38, 54], ["ashby", 12, 58], ["tarsis", 74, 40], ["ember", 72, 55], ["umes", 14, 24], ["thornwick", 27, 25], ["coldhatch", 55, 58], ["queensford", 46, 59], ["cinderwick", 43, 46], ["lockside", 48, 33], ["weirbank", 41, 31], ["highmoss", 17, 8], ["tallyhill", 56, 34], ["applegarth", 12, 37], ["lanthorn", 32, 45], ["grazehold", 91, 4], ["duskwell", 65, 49], ["dry-hollow", 76, 33], ["gullstair", 20, 60], ["frostmere", 61, 4], ["highspire", 7, 13], ["ropeway", 12, 16], ["candle-galleries", 40, 42], ["lockkeepers-deep", 45, 41], ["cinder-landing", 2, 47], ["pumice", 2, 44], ["salt-house", 29, 59], ["brinepans", 26, 59], ["summer-fold", 88, 32], ["stone-rings", 87, 41], ["dripstone", 36, 21], ["mistfold", 32, 16], ["cairn-hostel", 53, 18], ["snowgate", 36, 10], ["kerrow", 47, 24], ["ropebridge", 51, 22], ["peatmoor", 15, 48], ["reedhythe", 19, 53], ["last-well", 86, 59], ["glassdune", 91, 50], ["stormwatch", 77, 8], ["roost-foot", 79, 11], ["drovers-halt", 60, 19], ["longbarrow", 67, 28]];

export interface Spot { map: string; x: number; y: number; facing: "up" | "down" | "left" | "right"; }

/** Where a save on the old world map stands now, in pixels as saves keep them (tile * 16 + 2, tile * 16 - 2). */
export function fromOldWorld(px: number, py: number, maps: Record<string, MapFile>): Spot | null {
  const tx = Math.floor((px + 8) / 16), ty = Math.floor((py + 14) / 16);
  const near = [...OLD].sort((a, b) => Math.hypot(a[1] - tx, a[2] - ty) - Math.hypot(b[1] - tx, b[2] - ty));
  for (const [id] of near) for (const m of Object.values(maps)) {
    const p = m.world ? m.places?.find((q) => q.id === id) : undefined;
    if (p) return { map: m.id, x: p.x * 16 + 2, y: (p.y + 1) * 16 - 2, facing: "down" };
  }
  return null;
}
