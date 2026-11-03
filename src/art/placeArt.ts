// Every town, village, fort and ruin on the world maps has its own picture, 32 x 32, so a place reads as itself
// from far off: Millbridge's bridge and mill wheel, the Sallow hatchery's chimneys, Ashby's lighthouse, the burned
// terraces of Larkfold. Each picture is a few strokes from a small kit (houses, towers, chimneys, water, banners),
// arranged per place. The picture stands on the place's tile: its bottom row is the tile's bottom edge.
import { px } from "./pixel";

export type Pen = CanvasRenderingContext2D;
const INK = "#1d1814", PLASTER = "#ddcfae", STONE = "#a5a7a9", STONE_D = "#7a7c80", WOOD = "#8e6a4b", WOOD_D = "#5e4029";
const TILE_RED = "#8c412c", SLATE = "#4f5a6a", THATCH = "#b0904e", WATER = "#3d7cab", WATER_L = "#7fb3dc", SMOKE = "#9a9a9a";
const FIRE = "#e8823a", GLOW = "#f0d080", SNOW = "#eef2f6", ASH = "#3a3430", MOSS = "#8d6aa0", LEAF = "#3f7438", LEAF_L = "#558f48";

/** The kit: every stroke takes the picture's top-left so a place's recipe reads in local 32 x 32 coordinates. */
export function kit(g: Pen, ox: number, oy: number) {
  const p = (x: number, y: number, c: string, w = 1, h = 1) => px(g, ox + x, oy + y, c, w, h);
  const k = {
    p,
    /** A house: walls w x h with a door, and a roof of the given kind. */
    house(x: number, y: number, w: number, h: number, roof: string, kind: "gable" | "flat" | "thatch" | "dome" | "snow" = "gable", wall = PLASTER) {
      p(x, y, INK, w, h); p(x + 1, y + 1, wall, w - 2, h - 2); p(x + Math.floor(w / 2), y + h - 3, WOOD_D, 1, 2);
      if (w > 6) p(x + 2, y + 2, GLOW, 1, 1);
      if (kind === "flat") { p(x - 1, y - 1, INK, w + 2, 2); p(x, y - 1, roof, w, 1); }
      else if (kind === "dome") { const r = Math.floor(w / 2); for (let i = 0; i < r; i++) { const hw = Math.round(Math.sqrt(r * r - i * i)); p(x + r - hw, y - 1 - i, i === r - 1 ? INK : roof, hw * 2, 1); } }
      else { const n = Math.ceil((w + 2) / 2); for (let i = 0; i < n; i++) p(x - 1 + i, y - 1 - i, i === n - 1 ? INK : kind === "thatch" ? THATCH : kind === "snow" ? SNOW : roof, w + 2 - i * 2, 1); }
    },
    /** A tower w x h, capped. */
    tower(x: number, y: number, w: number, h: number, cap: "crenel" | "cone" | "dome" | "spire" | "flat" = "crenel", wall = STONE, capCol = SLATE) {
      p(x, y, INK, w, h); p(x + 1, y + 1, wall, w - 2, h - 1); p(x + 1, y + 1, STONE_D, 1, h - 1);
      if (cap === "crenel") for (let i = 0; i < w; i += 2) p(x + i, y - 2, INK, 1, 2);
      if (cap === "cone" || cap === "spire") { const tall = cap === "spire" ? w + 3 : Math.ceil(w / 2) + 1; for (let i = 0; i < tall; i++) { const hw = Math.max(0, Math.round((w / 2) * (1 - i / tall))); p(x + Math.floor(w / 2) - hw, y - 1 - i, i === tall - 1 ? INK : capCol, hw * 2 || 1, 1); } }
      if (cap === "dome") k.dome(x + w / 2, y, w / 2, capCol);
      p(x + Math.floor(w / 2), y + 3, GLOW, 1, 1);
    },
    dome(cx: number, base: number, r: number, col: string) { for (let i = 0; i <= r; i++) { const hw = Math.round(Math.sqrt(r * r - i * i)); p(cx - hw, base - i, i === r ? INK : col, hw * 2, 1); } p(cx - 1, base - r - 2, INK, 1, 2); },
    chimney(x: number, y: number, h: number, smoke = true, col = "#6e342a") { p(x, y, INK, 3, h); p(x + 1, y, col, 1, h); if (smoke) for (let i = 0; i < 4; i++) p(x + i - 1 + (i & 1), y - 2 - i * 2, SMOKE, 2, 1); },
    water(x: number, y: number, w: number, h: number) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p(x + i, y + j, (i + j * 3) % 7 === 0 ? WATER_L : WATER); },
    bridge(x: number, y: number, w: number) { p(x, y, INK, w, 3); p(x + 1, y + 1, STONE, w - 2, 1); for (let i = 2; i < w - 2; i += 4) p(x + i, y + 3, INK, 2, 2); },
    wheel(x: number, y: number) { for (let a = 0; a < 8; a++) p(x + Math.round(Math.cos((a * Math.PI) / 4) * 3), y + Math.round(Math.sin((a * Math.PI) / 4) * 3), WOOD); p(x, y, INK); },
    windmill(x: number, y: number) { k.tower(x, y, 5, 9, "cone", PLASTER, TILE_RED); for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) for (let i = 1; i <= 3; i++) p(x + 2 + Math.sign(dx) * i, y + 1 + Math.sign(dy) * i, INK); },
    tent(x: number, y: number, col: string, w = 7) { const n = Math.ceil(w / 2); for (let i = 0; i < n; i++) p(x + n - 1 - i, y + i, i === n - 1 ? INK : col, i * 2 + 1, 1); p(x + n - 1, y + n - 2, INK, 1, 1); },
    flag(x: number, y: number, col: string, h = 7) { p(x, y, INK, 1, h); p(x + 1, y, col, 3, 2); },
    tree(x: number, y: number, col = LEAF) { p(x, y + 3, WOOD_D, 1, 3); p(x - 2, y - 1, INK, 5, 5); p(x - 1, y, col, 3, 3); p(x - 1, y, LEAF_L, 1, 1); },
    wall(x: number, y: number, w: number, h = 4, col = STONE) { p(x, y, INK, w, h); p(x, y + 1, col, w, h - 2); for (let i = 0; i < w; i += 3) p(x + i, y - 1, INK, 2, 1); },
    palisade(x: number, y: number, w: number) { for (let i = 0; i < w; i += 2) { p(x + i, y, INK, 1, 5); p(x + i + 1, y + 1, WOOD, 1, 4); } },
    fence(x: number, y: number, w: number) { p(x, y, WOOD_D, w, 1); p(x, y + 2, WOOD_D, w, 1); for (let i = 0; i < w; i += 3) p(x + i, y - 1, WOOD_D, 1, 4); },
    well(x: number, y: number) { p(x, y, INK, 5, 3); p(x + 1, y + 1, STONE, 3, 1); p(x, y - 4, WOOD_D, 1, 4); p(x + 4, y - 4, WOOD_D, 1, 4); p(x, y - 5, TILE_RED, 5, 1); },
    sign(x: number, y: number) { p(x + 3, y, INK, 1, 9); p(x, y + 1, INK, 8, 3); p(x + 1, y + 2, "#c4ab7e", 6, 1); p(x + 4, y + 5, INK, 5, 2); p(x + 5, y + 5, "#c4ab7e", 3, 1); },
    boat(x: number, y: number, sail = "#e8e0d0") { p(x, y + 5, INK, 9, 2); p(x + 1, y + 5, WOOD, 7, 1); p(x + 4, y - 2, INK, 1, 7); p(x + 5, y - 1, sail, 3, 5); },
    stones(x: number, y: number, n: number, r: number) { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const sx = x + Math.round(Math.cos(a) * r), sy = y + Math.round(Math.sin(a) * r * 0.5); p(sx, sy - 3, INK, 2, 4); p(sx, sy - 3, STONE, 1, 3); } },
    terraces(x: number, y: number, w: number, rows: number, crop = MOSS, burnt = false) { for (let r = 0; r < rows; r++) { p(x + r, y + r * 3, burnt ? ASH : "#76a050", w - r * 2, 2); p(x + r, y + r * 3 + 2, "#9a9384", w - r * 2, 1); if (!burnt) for (let i = 1; i < w - r * 2; i += 3) p(x + r + i, y + r * 3, crop); } },
    ruin(x: number, y: number, h: number) { p(x, y - h, INK, 3, h); p(x + 1, y - h + 1, "#5a5450", 1, h - 1); },
    smoke(x: number, y: number, n = 4, col = SMOKE) { for (let i = 0; i < n; i++) p(x + (i & 1) - (i >> 1), y - i * 2, col, 2, 1); },
    fire(x: number, y: number) { p(x, y, FIRE, 2, 2); p(x, y - 1, GLOW); },
    heap(x: number, y: number, w: number, col: string) { const n = Math.ceil(w / 2); for (let i = 0; i < n; i++) p(x + i, y - i, i === n - 1 ? INK : col, w - i * 2, 1); },
    stilts(x: number, y: number, w: number, roof: string) { k.house(x, y, w, 4, roof, "thatch", "#c8b48a"); for (let i = 1; i < w; i += 3) p(x + i, y + 4, WOOD_D, 1, 3); },
    lamp(x: number, y: number) { p(x, y, INK, 1, 6); p(x - 1, y - 1, GLOW, 3, 2); },
    cave(x: number, y: number, w: number) { p(x, y, "#46433f", w, 6); p(x + 1, y + 2, "#14100c", w - 2, 4); p(x + 1, y + 1, "#46433f", w - 2, 1); },
    rope(x1: number, y1: number, x2: number, y2: number) { const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)); for (let i = 0; i <= n; i++) { const t = i / n; p(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 2), WOOD_D); } },
    snowcap(x: number, y: number, w: number) { p(x, y, SNOW, w, 1); },
    glass(x: number, y: number) { p(x, y, "#bfe6ee", 2, 4); p(x + 1, y - 1, "#e8faff"); },
  };
  return k;
}

type K = ReturnType<typeof kit>;
const shade = (k: K, x: number, w: number) => k.p(x, 30, "rgba(20,16,12,.35)", w, 2);

/** Each place's picture. Places not listed fall back to a picture for their kind. */
export const PLACE_ART: Record<string, (k: K) => void> = {
  // ---- the Cloudline ----
  larkfold: (k) => { k.terraces(2, 18, 28, 4, MOSS, true); k.ruin(8, 18, 6); k.ruin(20, 18, 8); k.p(6, 11, INK, 18, 1); k.p(7, 12, WOOD_D, 16, 1); k.ruin(6, 18, 7); k.ruin(22, 18, 7); k.smoke(14, 10, 4, "#6a6460"); },
  thornwick: (k) => { k.wall(2, 18, 28, 8, "#9a9384"); for (const x of [6, 12, 18]) { k.p(x, 21, INK, 3, 5); k.p(x + 1, 22, "#14100c", 1, 4); } k.tower(22, 6, 6, 13, "flat", "#9a9384"); k.p(22, 4, INK, 2, 2); k.p(26, 3, INK, 2, 3); k.water(4, 27, 10, 3); k.smoke(8, 25, 3, "#e8eef4"); },
  umes: (k) => { k.terraces(0, 16, 32, 4); k.house(5, 9, 7, 5, THATCH, "thatch"); k.house(19, 6, 7, 5, THATCH, "thatch"); k.fence(14, 27, 12); },
  highmoss: (k) => { k.house(3, 14, 8, 7, SLATE, "snow", STONE); k.house(17, 17, 8, 6, SLATE, "snow", STONE); for (const x of [6, 10, 14]) { k.p(x, 24, WOOD_D, 1, 6); } k.p(5, 24, WOOD_D, 11, 1); k.p(6, 25, MOSS, 9, 2); k.heap(20, 29, 7, MOSS); },
  dripstone: (k) => { k.tree(5, 8, "#4f6e66"); k.tree(27, 10, "#4f6e66"); k.house(9, 15, 8, 6, THATCH, "thatch"); k.house(18, 20, 7, 5, THATCH, "thatch"); for (let i = 0; i < 6; i++) k.p(4 + i * 5, 6 + (i % 3) * 2, WATER_L, 1, 2); k.p(0, 28, "#e6edf4", 32, 1); },
  mistfold: (k) => { k.stilts(3, 13, 8, THATCH); k.stilts(18, 16, 8, THATCH); k.p(0, 22, "#e6edf4", 32, 2); k.p(4, 25, "#c6d4e2", 24, 1); k.rope(10, 15, 18, 18); },
  // ---- the Kerrow Vale ----
  ferrow: (k) => { k.house(4, 12, 14, 12, TILE_RED, "gable"); k.p(6, 17, GLOW, 2, 2); k.p(12, 17, GLOW, 2, 2); k.p(20, 9, INK, 1, 9); k.p(21, 9, "#c9a86a", 4, 3); k.house(21, 19, 9, 6, THATCH, "thatch", WOOD); k.well(24, 28); },
  kerrow: (k) => { k.p(6, 6, INK, 1, 14); k.p(14, 6, INK, 1, 14); k.p(6, 6, INK, 9, 1); k.wheel(10, 8); k.heap(16, 26, 12, "#46433f"); k.house(2, 22, 7, 6, SLATE, "gable", STONE); k.house(22, 14, 7, 6, SLATE, "gable", STONE); },
  ropebridge: (k) => { k.p(12, 0, "#2a2624", 8, 32); k.p(13, 0, "#46433f", 6, 32); k.p(4, 13, WOOD_D, 24, 1); k.rope(4, 11, 28, 11); k.house(0, 18, 9, 7, THATCH, "thatch", WOOD); k.house(22, 20, 9, 6, THATCH, "thatch", WOOD); },
  millbridge: (k) => { k.water(0, 22, 32, 6); k.bridge(4, 21, 24); k.house(2, 8, 9, 9, TILE_RED); k.house(20, 10, 10, 9, TILE_RED); k.wheel(28, 22); k.p(12, 12, "#c8402c", 6, 2); k.p(12, 14, INK, 1, 4); k.p(17, 14, INK, 1, 4); k.p(13, 15, "#e8c860", 4, 1); },
  weirbank: (k) => { k.water(0, 16, 32, 10); for (let i = 0; i < 32; i += 2) k.p(i, 20, "#e8eef4"); k.p(0, 21, STONE_D, 32, 1); k.house(4, 7, 8, 6, THATCH, "thatch"); k.house(19, 8, 8, 6, THATCH, "thatch"); k.boat(14, 22); },
  bend: (k) => { k.tree(23, 12); k.tree(27, 17); k.sign(8, 18); k.p(0, 29, "#c4ab7e", 32, 2); },
  sallow: (k) => { k.wall(0, 24, 32, 6, "#6e342a"); k.house(4, 12, 22, 12, "#55585e", "flat", "#8a4a3a"); for (const x of [6, 13, 20]) k.chimney(x, 3, 9); k.p(9, 18, FIRE, 2, 2); k.p(18, 18, FIRE, 2, 2); },
  camp: (k) => { k.tent(1, 16, "#8a7a5a", 9); k.tent(13, 12, "#8a7a5a", 9); k.tent(20, 20, "#7a8a5a", 9); k.fire(15, 26); k.flag(26, 5, "#3f7a4a", 10); k.flag(5, 7, "#3f7a4a", 8); },
  "drovers-halt": (k) => { k.house(4, 9, 14, 10, WOOD_D, "gable", WOOD); k.fence(2, 23, 28); k.fence(20, 15, 10); k.p(24, 18, "#b0a090", 3, 2); k.p(26, 20, "#b0a090", 3, 2); },
  longbarrow: (k) => { k.heap(2, 18, 20, "#76a050"); k.stones(12, 22, 5, 4); k.house(20, 20, 8, 6, THATCH, "thatch"); k.house(24, 11, 6, 5, THATCH, "thatch"); },
  // ---- the High North ----
  "cairn-hostel": (k) => { k.house(8, 12, 16, 11, SLATE, "snow", STONE); k.heap(1, 29, 6, STONE_D); k.heap(25, 29, 6, STONE_D); k.smoke(20, 7); },
  snowgate: (k) => { k.tower(1, 8, 8, 20, "crenel"); k.tower(23, 8, 8, 20, "crenel"); k.wall(9, 12, 14, 8); k.p(13, 20, INK, 6, 10); k.p(14, 21, WOOD, 4, 9); k.snowcap(1, 7, 30); k.flag(15, 3, "#4f6a8a"); },
  holm: (k) => { k.tower(2, 10, 7, 19, "cone", STONE, "#4f6a8a"); k.tower(23, 10, 7, 19, "cone", STONE, "#4f6a8a"); k.house(9, 14, 14, 15, "#4f6a8a", "snow", STONE); k.flag(15, 3, "#4f6a8a", 8); },
  frostmere: (k) => { k.p(0, 22, "#bfd8e6", 32, 8); for (let i = 0; i < 32; i += 5) k.p(i, 24 + (i % 3), "#e8f4fa", 3, 1); k.house(3, 8, 9, 8, SLATE, "snow", STONE); k.house(17, 6, 10, 9, SLATE, "snow", STONE); },
  "kestrel-fort": (k) => { k.heap(0, 31, 32, "#8d9f5a"); k.palisade(5, 14, 22); k.tower(13, 4, 7, 11, "crenel", WOOD); k.flag(16, -2, "#a03a2a"); k.p(4, 26, "#55585e", 4, 3); },
  grazehold: (k) => { for (const [x, y] of [[3, 14], [16, 10], [11, 21]]) { k.dome(x + 5, y + 6, 5, "#c8b48a"); k.p(x + 4, y + 4, WOOD_D, 2, 2); } k.p(24, 24, "#b0a090", 3, 2); k.p(27, 27, "#b0a090", 3, 2); },
  stormwatch: (k) => { k.tower(11, 6, 10, 24, "crenel", STONE_D); k.p(16, 0, INK, 1, 6); k.p(13, 2, "#f0f070", 1, 1); k.p(18, 1, "#f0f070", 1, 1); k.p(12, 3, "#f0f070", 1, 1); },
  "roost-foot": (k) => { k.p(18, 0, "#6d6a66", 14, 32); k.p(19, 1, "#8a8680", 2, 30); for (const y of [5, 12]) k.p(23, y, WOOD_D, 5, 2); k.house(2, 18, 8, 6, SLATE, "snow", STONE); k.house(8, 24, 8, 6, SLATE, "snow", STONE); },
  // ---- Vael ----
  highspire: (k) => { k.p(10, 14, "#5a5866", 12, 18); k.p(11, 14, "#76748a", 4, 18); k.house(9, 8, 7, 5, MOSS, "dome", "#c8c4d8"); k.house(16, 6, 7, 6, MOSS, "dome", "#c8c4d8"); },
  ropeway: (k) => { k.p(1, 10, "#5a5866", 7, 22); k.p(24, 14, "#5a5866", 7, 18); k.rope(4, 8, 27, 12); k.rope(4, 10, 27, 14); k.p(13, 10, WOOD, 4, 3); k.house(1, 4, 7, 5, MOSS, "dome", "#c8c4d8"); },
  // ---- the Free Towns and the Fens ----
  hollin: (k) => { k.house(8, 12, 16, 14, TILE_RED); k.tower(13, 2, 6, 10, "cone", PLASTER, TILE_RED); k.p(15, 6, "#c9a86a", 2, 2); k.tree(3, 22, LEAF); k.tree(29, 22, LEAF); k.p(10, 28, "#c4ab7e", 12, 2); },
  applegarth: (k) => { for (const [x, y] of [[4, 6], [12, 4], [20, 6], [28, 8], [6, 14]]) { k.tree(x, y, LEAF); k.p(x, y + 1, "#d84040"); } k.house(14, 18, 12, 9, THATCH, "thatch"); k.p(4, 25, WOOD_D, 6, 4); },
  college: (k) => { k.house(2, 16, 28, 13, SLATE, "flat", "#e8e0c8"); for (let x = 4; x < 30; x += 4) k.p(x, 18, INK, 1, 10); k.dome(16, 15, 7, "#6a8aa8"); k.p(15, 4, INK, 3, 2); },
  lanthorn: (k) => { k.house(1, 10, 10, 10, TILE_RED); k.house(21, 12, 10, 9, TILE_RED); for (const x of [12, 16, 20]) k.lamp(x, 18); k.p(11, 27, "#c4ab7e", 12, 3); },
  peatmoor: (k) => { k.house(4, 12, 9, 6, "#6a5a3a", "thatch", "#5a4a32"); k.house(19, 16, 9, 6, "#6a5a3a", "thatch", "#5a4a32"); for (let i = 0; i < 4; i++) k.p(4 + i * 3, 26 - i, "#3a2e24", 3, 2 + i); k.water(20, 26, 10, 3); },
  reedhythe: (k) => { k.water(0, 20, 32, 12); k.stilts(2, 9, 9, THATCH); k.stilts(18, 12, 9, THATCH); k.boat(10, 22, "#c2b46e"); for (let i = 0; i < 32; i += 3) k.p(i, 19, "#a69a5a", 1, 3); },
  // ---- the Hill Towns and the Steppe ----
  corvane: (k) => { k.house(4, 10, 24, 16, SLATE, "flat", "#e8e0c8"); for (let x = 6; x < 28; x += 4) { k.p(x, 12, INK, 2, 13); k.p(x, 12, PLASTER, 1, 13); } k.p(3, 8, INK, 26, 2); k.p(13, 3, INK, 6, 5); k.p(14, 4, "#c9a86a", 4, 3); },
  tallyhill: (k) => { k.heap(0, 31, 32, "#8d9f5a"); k.tower(12, 4, 8, 22, "spire", "#c8b48a", SLATE); k.p(14, 9, "#e8e0c8", 4, 4); k.p(16, 10, INK, 1, 2); k.house(1, 18, 9, 7, TILE_RED); k.house(22, 18, 9, 7, TILE_RED); },
  tarsis: (k) => { k.wall(0, 12, 32, 16, "#b3a36a"); k.tower(0, 6, 7, 22, "crenel", "#b3a36a"); k.tower(25, 6, 7, 22, "crenel", "#b3a36a"); for (const x of [10, 16, 22]) k.flag(x, 3, "#2a2a2a", 9); k.p(13, 22, INK, 6, 8); },
  "dry-hollow": (k) => { k.house(3, 14, 10, 8, "#c2a070", "flat", "#d8b880"); k.house(17, 18, 10, 8, "#c2a070", "flat", "#d8b880"); k.well(13, 28); },
  "summer-fold": (k) => { k.tent(2, 12, "#c87a4a", 11); k.tent(16, 16, "#c8b48a", 11); k.p(4, 26, "#b0a090", 3, 2); k.p(12, 28, "#b0a090", 3, 2); k.p(22, 27, "#b0a090", 3, 2); },
  "stone-rings": (k) => { k.stones(16, 20, 8, 11); k.p(15, 18, STONE, 2, 2); },
  // ---- the Salt Coast ----
  ashby: (k) => { k.water(0, 22, 32, 10); k.p(0, 21, WOOD_D, 20, 2); k.boat(3, 20); k.boat(14, 22, "#c8402c"); k.house(2, 8, 9, 9, TILE_RED); k.tower(24, 4, 5, 18, "cone", "#e8e0c8", TILE_RED); k.p(25, 1, GLOW, 3, 2); },
  gullstair: (k) => { k.p(0, 18, "#8a8680", 32, 14); for (let i = 0; i < 5; i++) k.p(4 + i * 4, 28 - i * 3, PLASTER, 4, 1); k.house(2, 8, 9, 7, TILE_RED); k.house(18, 6, 9, 7, TILE_RED); },
  "salt-house": (k) => { k.house(2, 10, 28, 16, SLATE, "gable", "#e6e4dc"); k.p(12, 16, INK, 8, 10); k.p(13, 17, WOOD, 6, 9); k.heap(0, 30, 8, "#f2f0ea"); },
  brinepans: (k) => { for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) { k.p(i * 8, 8 + j * 8, STONE_D, 7, 7); k.p(i * 8 + 1, 9 + j * 8, (i + j) & 1 ? "#f2f0ea" : "#bfd8e6", 5, 5); } },
  "cinder-landing": (k) => { k.p(0, 18, "#2a2624", 32, 14); k.p(8, 22, WOOD_D, 20, 2); for (let x = 9; x < 28; x += 4) k.p(x, 24, WOOD_D, 1, 6); k.house(2, 9, 9, 7, "#46433f", "flat", "#6d6a66"); k.fire(24, 12); },
  pumice: (k) => { k.house(4, 14, 8, 7, "#46433f", "dome", "#8a8680"); k.house(18, 12, 9, 8, "#46433f", "dome", "#8a8680"); k.smoke(26, 8, 5, "#c8c4c0"); k.p(25, 10, "#d0602a", 2, 1); },
  // ---- the Millcities ----
  cinderwick: (k) => { k.house(0, 12, 14, 17, "#55585e", "flat", "#8a4a3a"); k.house(16, 8, 16, 21, "#55585e", "flat", "#8a4a3a"); for (const x of [3, 9, 20, 26]) k.chimney(x, 1, 11, true, "#55585e"); for (let y = 14; y < 28; y += 4) for (let x = 2; x < 30; x += 4) if (x !== 14) k.p(x, y, GLOW); },
  lockside: (k) => { k.water(0, 20, 32, 6); k.p(10, 18, WOOD_D, 2, 10); k.p(20, 18, WOOD_D, 2, 10); k.p(10, 18, WOOD_D, 12, 2); k.house(2, 6, 9, 9, TILE_RED, "gable", "#c8a888"); k.house(20, 4, 10, 10, TILE_RED, "gable", "#c8a888"); },
  "candle-galleries": (k) => { k.cave(6, 18, 20); for (const x of [9, 14, 19, 23]) { k.p(x, 22, "#e8e0c8", 1, 2); k.p(x, 21, GLOW); } k.p(4, 16, "#6d6a66", 24, 2); },
  "lockkeepers-deep": (k) => { k.water(8, 4, 16, 24); for (let i = 0; i < 4; i++) k.p(8, 8 + i * 6, WOOD_D, 16, 2); k.house(0, 14, 7, 7, SLATE, "gable", STONE); k.lamp(27, 16); },
  // ---- the Ember Courts ----
  ember: (k) => { k.house(2, 16, 28, 13, "#d0602a", "flat", "#e3cc92"); k.dome(16, 15, 8, "#d0602a"); k.tower(2, 6, 5, 10, "dome", "#e3cc92", "#e8c860"); k.tower(25, 6, 5, 10, "dome", "#e3cc92", "#e8c860"); k.p(13, 22, INK, 6, 7); },
  duskwell: (k) => { k.well(13, 26); for (const [x, y] of [[4, 10], [26, 12]]) { k.p(x, y, WOOD_D, 1, 10); k.p(x - 3, y - 1, LEAF, 7, 2); } k.house(6, 16, 8, 7, "#c2a070", "dome", "#d8b880"); k.house(19, 17, 8, 7, "#c2a070", "dome", "#d8b880"); },
  "last-well": (k) => { k.well(13, 22); k.tent(2, 18, "#c87a4a", 9); k.tent(21, 20, "#c8b48a", 9); },
  glassdune: (k) => { k.heap(0, 31, 32, "#e3cc92"); for (const [x, y] of [[6, 20], [12, 16], [19, 18], [25, 22]]) k.glass(x, y); k.house(9, 24, 9, 6, "#c2a070", "flat", "#d8b880"); },
  // ---- Vantry and the Crown ----
  vantry: (k) => { k.wall(0, 22, 32, 8, STONE_D); k.house(6, 10, 20, 12, "#55585e", "flat", "#8a4a3a"); k.dome(16, 9, 6, "#6e342a"); for (const x of [3, 26]) k.chimney(x, 6, 16, true, "#55585e"); k.tower(0, 14, 5, 15, "crenel", STONE_D); k.tower(27, 14, 5, 15, "crenel", STONE_D); k.flag(15, 0, "#a03a2a"); },
  coldhatch: (k) => { k.house(2, 14, 12, 10, "#55585e", "flat", "#8a4a3a"); k.chimney(9, 6, 8); k.house(18, 18, 9, 7, THATCH, "thatch"); k.fence(0, 28, 32); },
  kingsmere: (k) => { k.water(0, 24, 32, 7); k.tower(4, 6, 7, 18, "cone", STONE, "#c8402c"); k.tower(21, 6, 7, 18, "cone", STONE, "#c8402c"); k.house(11, 10, 10, 14, "#c8402c", "gable", STONE); k.flag(15, 0, "#e8c860"); },
  queensford: (k) => { k.water(0, 20, 32, 5); for (let i = 2; i < 30; i += 4) k.p(i, 22, "#9a9384", 2, 1); k.house(2, 8, 9, 9, TILE_RED); k.house(19, 6, 10, 10, TILE_RED); k.boat(12, 15, "#e8c860"); },
};

/** A picture for a place with no recipe of its own, by kind. */
export function fallbackArt(icon: string): (k: K) => void {
  return (k) => {
    if (icon === "village") { k.house(4, 14, 9, 7, THATCH, "thatch"); k.house(18, 16, 9, 7, THATCH, "thatch"); }
    else if (icon === "fort") { k.wall(2, 12, 28, 16); k.tower(12, 4, 8, 12); }
    else { k.house(3, 12, 11, 10, TILE_RED); k.house(18, 14, 11, 9, TILE_RED); }
  };
}

/** Draws a place's picture onto the world canvas, standing on its tile. */
export function drawPlaceArt(g: Pen, id: string, icon: string, tx: number, ty: number, tile: number): void {
  const ox = tx * tile - 8, oy = ty * tile + tile - 32;
  const k = kit(g, ox, oy);
  shade(k, 4, 24);
  (PLACE_ART[id] ?? fallbackArt(icon))(k);
}
