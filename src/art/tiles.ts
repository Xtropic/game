// The Larkfold tile set, painted in code at 16 x 16 per tile with a fixed afternoon palette.
import { TILE, type TileKind, type WorldMap } from "../world/map";
import { dither, hash2, makeCanvas, px } from "./pixel";

const P = {
  grass: ["#5e8846", "#6f9a52", "#86b064"], grassDark: "#4c7038",
  path: ["#b5a27c", "#c7b590", "#d6c7a2"], pathEdge: "#9c8a68",
  flag: ["#8d8b80", "#a9a698"], flagLine: "#6c6a62",
  wall: ["#c3b391", "#ddcfae"], wallShade: "#a8987a", wood: "#5e4029", woodLight: "#7a5638",
  roof: ["#8c412c", "#b0553a", "#c96a48"], roofEdge: "#6d3020",
  water: ["#3d6e9a", "#4f86b4", "#79a9cf"], cliff: ["#5f7088", "#7f8fa8", "#9aa9be"], cliffEdge: "#4a5870",
  tree: ["#2f5a2c", "#3f7438", "#558f48"], trunk: "#5e4029", ink: "#2a1f19",
  flowers: ["#f0d264", "#ece6da", "#d48cb8"],
  cloud: ["#9fb4cc", "#c3d2e2", "#e4ecf3"], moss: ["#4a3a52", "#6c4f7c", "#8d6aa0"], earth: ["#4a3a2c", "#5c4836"],
  stone: ["#7d776c", "#99927f", "#b3ac98"], stoneLine: "#5a554c", dryRoof: ["#4f4232", "#66553f", "#7a6a50"],
  rock: ["#2a2622", "#3a342e", "#4a4239"], cave: ["#3d362f", "#4b4239", "#574d42"], plank: ["#6e5038", "#7f5d41", "#8e6a4b"],
  plaster: ["#cbbd9f", "#ddd0b4"], blanket: ["#8a3a2e", "#a84a3a"], linen: "#e6dcc6",
  trail: ["#7a6a52", "#8c7b60", "#9d8c6f"], cobble: ["#6f6d68", "#878580", "#9c9a94"], ashlar: ["#77787a", "#8e9092", "#a5a7a9"],
  brick: ["#5a2a22", "#6e342a", "#82402f"], wet: ["#2f3438", "#3c4247", "#4b5258"], iron: ["#3a3c40", "#55585e", "#6e7278"], glow: "#e8823a",
  larva: "#b9b2a4",
};

/** Paint one tile at (ox, oy). tx, ty seed the variation so neighbouring tiles differ. */
function paintTile(g: CanvasRenderingContext2D, kind: TileKind, ox: number, oy: number, tx: number, ty: number, n: (dx: number, dy: number) => TileKind | null): void {
  const r = (i: number) => hash2(tx * 31 + i, ty * 17 + i * 7);
  const grass = () => {
    dither(g, ox, oy, TILE, TILE, P.grass, (x, y) => 0.45 + 0.35 * Math.sin((x + tx * 3) * 0.7) * Math.cos((y + ty * 5) * 0.6) + (hash2(x, y) - 0.5) * 0.3);
    for (let i = 0; i < 3; i++) { const x = ox + Math.floor(r(i) * 14) + 1, y = oy + Math.floor(r(i + 9) * 13) + 2; px(g, x, y, P.grassDark); px(g, x + 1, y - 1, P.grassDark); }
  };
  switch (kind) {
    case "grass": grass(); break;
    case "flowers": grass(); for (let i = 0; i < 5; i++) { const x = ox + Math.floor(r(i) * 13) + 1, y = oy + Math.floor(r(i + 4) * 13) + 1; px(g, x, y, P.flowers[i % 3]); px(g, x, y + 1, P.grassDark); } break;
    case "path": {
      dither(g, ox, oy, TILE, TILE, P.path, (x, y) => 0.5 + (hash2(x, y) - 0.5) * 0.5);
      for (let i = 0; i < 2; i++) px(g, ox + Math.floor(r(i) * 14) + 1, oy + Math.floor(r(i + 3) * 14) + 1, P.pathEdge);
      const edge = (k: TileKind | null) => k !== "path" && k !== "flag" && k !== "door";
      if (edge(n(-1, 0))) for (let y = 0; y < TILE; y++) if (hash2(tx, y + ty * 16) > 0.35) px(g, ox, oy + y, P.grass[0]);
      if (edge(n(1, 0))) for (let y = 0; y < TILE; y++) if (hash2(tx + 1, y + ty * 16) > 0.35) px(g, ox + TILE - 1, oy + y, P.grass[0]);
      break;
    }
    case "flag": {
      dither(g, ox, oy, TILE, TILE, P.flag, (x, y) => 0.5 + (hash2(x * 3, y * 5) - 0.5) * 0.6);
      for (let i = 0; i < TILE; i++) { px(g, ox + i, oy + ((ty & 1) ? 7 : 15), P.flagLine); }
      px(g, ox + ((tx * 5 + ty * 3) % 12) + 2, oy, P.flagLine, 1, 7); px(g, ox + ((tx * 7 + ty) % 12) + 2, oy + 8, P.flagLine, 1, 7);
      break;
    }
    case "wall": {
      dither(g, ox, oy, TILE, TILE, P.wall, (x, y) => 0.6 + (hash2(x, y) - 0.5) * 0.4 - (y - oy) / 40);
      px(g, ox, oy + TILE - 2, P.wallShade, TILE, 2);
      if ((tx + ty) % 3 === 0) { px(g, ox + 4, oy + 4, P.ink, 7, 6); px(g, ox + 5, oy + 5, "#6d9cc4", 5, 4); px(g, ox + 7, oy + 4, P.ink, 1, 6); }
      break;
    }
    case "door": {
      dither(g, ox, oy, TILE, TILE, P.wall, () => 0.5);
      px(g, ox + 3, oy + 2, P.ink, 10, 14); px(g, ox + 4, oy + 3, P.wood, 8, 13);
      for (let i = 0; i < 3; i++) px(g, ox + 5 + i * 2, oy + 4, P.woodLight, 1, 11);
      px(g, ox + 10, oy + 10, "#c9a86a");
      break;
    }
    case "roof": {
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const row = Math.floor((y + ty * TILE) / 4), shingle = (x + (row & 1) * 3) % 6 === 0; px(g, ox + x, oy + y, shingle ? P.roofEdge : P.roof[(y + ty * TILE) % 4 < 1 ? 2 : (y % 4 === 3 ? 0 : 1)]); }
      if (n(0, 1) !== "roof") px(g, ox, oy + TILE - 2, P.roofEdge, TILE, 2);
      if (n(0, -1) !== "roof") px(g, ox, oy, P.ink, TILE, 1);
      break;
    }
    case "water": {
      dither(g, ox, oy, TILE, TILE, P.water, (x, y) => 0.3 + 0.4 * Math.sin((x + y * 0.5) * 0.5) * 0.5 + 0.2);
      for (let i = 0; i < 2; i++) px(g, ox + Math.floor(r(i) * 10) + 2, oy + Math.floor(r(i + 2) * 12) + 2, P.water[2], 3, 1);
      break;
    }
    case "cliff": {
      dither(g, ox, oy, TILE, TILE, P.cliff, (x, y) => 0.4 + 0.3 * Math.sin(x * 0.9 + y * 0.3) + (hash2(x, y) - 0.5) * 0.3);
      for (let i = 0; i < 3; i++) px(g, ox + Math.floor(r(i) * 12) + 2, oy + Math.floor(r(i + 5) * 12) + 2, P.cliffEdge, 2, 1);
      break;
    }
    case "tree": {
      grass();
      for (let y = 0; y < 13; y++) for (let x = 0; x < 14; x++) { const d = Math.hypot(x - 6.5, y - 6) / 7; if (d < 1) px(g, ox + 1 + x, oy + y, d > 0.85 ? P.ink : P.tree[d < 0.4 && x < 7 && y < 6 ? 2 : d < 0.7 ? 1 : 0]); }
      px(g, ox + 7, oy + 12, P.trunk, 2, 4);
      break;
    }
    case "fence": {
      grass();
      px(g, ox, oy + 5, P.wood, TILE, 2); px(g, ox, oy + 10, P.wood, TILE, 2);
      px(g, ox + 2, oy + 3, P.ink, 2, 11); px(g, ox + 12, oy + 3, P.ink, 2, 11);
      px(g, ox + 2, oy + 3, P.woodLight, 1, 10); px(g, ox + 12, oy + 3, P.woodLight, 1, 10);
      break;
    }
    case "cloud": {
      dither(g, ox, oy, TILE, TILE, P.cloud, (x, y) => 0.55 + 0.35 * Math.sin((x + ty * 7) * 0.22 + Math.sin((y + tx * 3) * 0.3) * 1.6) * Math.cos((y + tx * 5) * 0.18) + (hash2(x, y) - 0.5) * 0.15);
      break;
    }
    case "moss": {
      dither(g, ox, oy, TILE, TILE, P.earth, (x, y) => 0.5 + (hash2(x, y) - 0.5) * 0.6);
      for (let i = 0; i < 9; i++) { const x = ox + Math.floor(r(i) * 14) + 1, y = oy + Math.floor(r(i + 11) * 13) + 2; px(g, x, y, P.moss[i % 3]); px(g, x + 1, y, P.moss[(i + 1) % 3]); px(g, x, y - 1, P.moss[2]); }
      break;
    }
    case "terrace": {
      dither(g, ox, oy, TILE, TILE, P.stone, (x, y) => 0.55 + (hash2(x * 2, y * 3) - 0.5) * 0.5);
      for (let y = 4; y < TILE; y += 5) px(g, ox, oy + y, P.stoneLine, TILE, 1);
      for (let row = 0; row < 3; row++) { const off = (row & 1) * 4 + (tx & 1) * 2; for (let x = off; x < TILE; x += 8) px(g, ox + x, oy + 5 + row * 5, P.stoneLine, 1, 4); }
      px(g, ox, oy, P.grass[1], TILE, 2); px(g, ox, oy + TILE - 1, P.ink, TILE, 1);
      break;
    }
    case "steps": {
      for (let i = 0; i < 4; i++) { px(g, ox, oy + i * 4, P.stone[2], TILE, 3); px(g, ox, oy + i * 4 + 3, P.stoneLine, TILE, 1); }
      px(g, ox, oy, P.stoneLine, 1, TILE); px(g, ox + TILE - 1, oy, P.stoneLine, 1, TILE);
      break;
    }
    case "drying": {
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const plank = (x + (tx & 1) * 5) % 5 === 0; px(g, ox + x, oy + y, plank ? P.ink : P.dryRoof[(y + ty * 3) % 6 < 1 ? 2 : (hash2(x + tx * 16, ty) > 0.5 ? 1 : 0)]); }
      if (n(0, 1) !== "drying" && n(0, 1) !== "ladder") { px(g, ox, oy + TILE - 4, P.wood, TILE, 4); px(g, ox, oy + TILE - 4, P.ink, TILE, 1); }
      break;
    }
    case "ladder": {
      grass();
      px(g, ox + 4, oy, P.ink, 2, TILE); px(g, ox + 10, oy, P.ink, 2, TILE); px(g, ox + 4, oy, P.woodLight, 1, TILE); px(g, ox + 10, oy, P.woodLight, 1, TILE);
      for (let y = 2; y < TILE; y += 4) px(g, ox + 5, oy + y, P.wood, 6, 1);
      break;
    }
    case "cave": {
      dither(g, ox, oy, TILE, TILE, P.rock, (x, y) => 0.6 + (hash2(x, y) - 0.5) * 0.4);
      for (let y = 3; y < TILE; y++) for (let x = 2; x < 14; x++) { const d = Math.hypot((x - 7.5) / 6, (y - 16) / 13); if (d < 1) px(g, ox + x, oy + y, d > 0.85 ? P.ink : "#120e0b"); }
      break;
    }
    case "gate": {
      dither(g, ox, oy, TILE, TILE, P.path, (x, y) => 0.5 + (hash2(x, y) - 0.5) * 0.5);
      for (let x = 1; x < TILE; x += 4) { px(g, ox + x, oy + 1, P.ink, 3, 14); px(g, ox + x + 1, oy + 2, P.wood, 1, 12); }
      px(g, ox, oy + 4, P.woodLight, TILE, 2); px(g, ox, oy + 11, P.woodLight, TILE, 2);
      break;
    }
    case "rock": {
      dither(g, ox, oy, TILE, TILE, P.rock, (x, y) => 0.45 + 0.3 * Math.sin(x * 0.8 + y * 0.5 + tx) + (hash2(x, y) - 0.5) * 0.3);
      if (n(0, 1) && n(0, 1) !== "rock") px(g, ox, oy + TILE - 2, P.ink, TILE, 2);
      break;
    }
    case "cavefloor": dither(g, ox, oy, TILE, TILE, P.cave, (x, y) => 0.5 + (hash2(x * 3, y) - 0.5) * 0.5); break;
    case "tray": {
      const base = n(0, -1) === "wetfloor" || n(0, 1) === "wetfloor" ? P.wet : P.cave;
      dither(g, ox, oy, TILE, TILE, base, (x, y) => 0.5 + (hash2(x * 3, y) - 0.5) * 0.4);
      px(g, ox + 1, oy + 3, P.ink, 14, 10); px(g, ox + 2, oy + 4, P.wood, 12, 8); px(g, ox + 3, oy + 5, P.moss[0], 10, 6);
      for (let i = 0; i < 6; i++) px(g, ox + 3 + Math.floor(r(i) * 9), oy + 5 + Math.floor(r(i + 6) * 5), P.larva, 2, 1);
      break;
    }
    case "exit": {
      const floor = n(0, -1) === "wetfloor" ? P.wet : n(0, -1) === "cavefloor" ? P.cave : P.plank;
      dither(g, ox, oy, TILE, TILE, floor, () => 0.5);
      for (let y = 0; y < TILE; y++) px(g, ox + 2, oy + y, "#0e0b09", 12, 1);
      px(g, ox + 1, oy, P.ink, 1, TILE); px(g, ox + 14, oy, P.ink, 1, TILE);
      break;
    }
    case "plank": {
      for (let y = 0; y < TILE; y++) { const b = Math.floor((y + ty * TILE) / 4); for (let x = 0; x < TILE; x++) px(g, ox + x, oy + y, (y + ty * TILE) % 4 === 3 ? P.ink : P.plank[(b + Math.floor((x + b * 7 + tx * 16) / 11)) % 3]); }
      break;
    }
    case "iwall": {
      dither(g, ox, oy, TILE, TILE, P.plaster, (x, y) => 0.6 + (hash2(x, y) - 0.5) * 0.3);
      if (n(0, 1) && n(0, 1) !== "iwall" && n(0, 1) !== "innerdoor") { px(g, ox, oy + 9, P.wood, TILE, 7); px(g, ox, oy + 9, P.woodLight, TILE, 1); px(g, ox, oy + TILE - 1, P.ink, TILE, 1); }
      break;
    }
    case "bed": {
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(g, ox + x, oy + y, P.plank[(y >> 2) % 3]);
      px(g, ox + 1, oy + 1, P.ink, 14, 15); px(g, ox + 2, oy + 2, P.linen, 12, 4); px(g, ox + 2, oy + 6, P.blanket[1], 12, 9); px(g, ox + 2, oy + 6, P.blanket[0], 12, 1);
      break;
    }
    case "shelf": {
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(g, ox + x, oy + y, P.plank[(y >> 2) % 3]);
      px(g, ox + 1, oy + 2, P.ink, 14, 12); px(g, ox + 2, oy + 3, P.wood, 12, 10); px(g, ox + 2, oy + 7, P.ink, 12, 1);
      for (let i = 0; i < 3; i++) { px(g, ox + 3 + i * 4, oy + 4, ["#b8a070", "#7a8a6a", "#c9c0aa"][i], 2, 3); px(g, ox + 3 + i * 4, oy + 9, ["#8a6a4a", "#d8ccb0", "#6a7a8a"][i], 3, 3); }
      break;
    }
    case "table": {
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(g, ox + x, oy + y, P.plank[(y >> 2) % 3]);
      px(g, ox, oy + 3, P.ink, TILE, 9); px(g, ox, oy + 4, P.woodLight, TILE, 6);
      if (tx % 2 === 0) { px(g, ox + 5, oy + 5, "#8f8a80", 6, 3); px(g, ox + 5, oy + 5, "#b8b3a8", 6, 1); }
      break;
    }
    case "innerdoor": {
      dither(g, ox, oy, TILE, TILE, P.plaster, () => 0.5);
      px(g, ox + 3, oy + 1, P.ink, 10, 15); px(g, ox + 4, oy + 2, P.wood, 8, 14); px(g, ox + 10, oy + 9, "#c9a86a");
      break;
    }
    case "roofwalk": {
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const row = Math.floor((y + ty * TILE) / 4), shingle = (x + (row & 1) * 3) % 6 === 0; px(g, ox + x, oy + y, shingle ? P.roofEdge : P.dryRoof[(y + ty * TILE) % 4 < 1 ? 2 : 1]); }
      break;
    }
    case "trail": {
      dither(g, ox, oy, TILE, TILE, P.trail, (x, y) => 0.5 + (hash2(x, y) - 0.5) * 0.6);
      for (let i = 0; i < 3; i++) px(g, ox + Math.floor(r(i) * 13) + 1, oy + Math.floor(r(i + 3) * 13) + 1, P.stone[1], 2, 1);
      break;
    }
    case "cobble": {
      dither(g, ox, oy, TILE, TILE, P.cobble, (x, y) => 0.5 + (hash2(x, y) - 0.5) * 0.4);
      for (let y = 0; y < TILE; y += 4) { px(g, ox, oy + y, P.stoneLine, TILE, 1); for (let x = ((y >> 2) & 1) * 3; x < TILE; x += 6) px(g, ox + x, oy + y, P.stoneLine, 1, 4); }
      break;
    }
    case "cart": {
      dither(g, ox, oy, TILE, TILE, P.cobble, () => 0.5);
      px(g, ox, oy + 1, P.ink, TILE, 13); px(g, ox + 1, oy + 2, P.wood, 14, 11);
      for (let x = 2; x < TILE; x += 3) px(g, ox + x, oy + 2, P.ink, 1, 9);
      px(g, ox + 3, oy + 12, P.ink, 4, 4); px(g, ox + 4, oy + 13, P.woodLight, 2, 2);
      break;
    }
    case "stonewall": {
      dither(g, ox, oy, TILE, TILE, P.ashlar, (x, y) => 0.5 + (hash2(x, y) - 0.5) * 0.4 - (y - oy) / 50);
      for (let y = 5; y < TILE; y += 5) px(g, ox, oy + y, P.stoneLine, TILE, 1);
      for (let row = 0; row < 3; row++) for (let x = (row & 1) * 5; x < TILE; x += 10) px(g, ox + x, oy + row * 5, P.stoneLine, 1, 5);
      break;
    }
    case "brick": {
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const row = (y >> 2), mortar = y % 4 === 3 || (x + (row & 1) * 4) % 8 === 0; px(g, ox + x, oy + y, mortar ? "#2a1712" : P.brick[Math.floor(hash2(x >> 3, row + ty * 4) * 3)]); }
      break;
    }
    case "wetfloor": {
      dither(g, ox, oy, TILE, TILE, P.wet, (x, y) => 0.45 + (hash2(x, y) - 0.5) * 0.4);
      px(g, ox, oy, "#262a2e", TILE, 1); px(g, ox, oy, "#262a2e", 1, TILE);
      if (r(1) > 0.5) px(g, ox + 3 + Math.floor(r(2) * 8), oy + 4 + Math.floor(r(3) * 8), "#6e7a84", 3, 1);
      break;
    }
    case "boiler": {
      dither(g, ox, oy, TILE, TILE, P.wet, () => 0.5);
      for (let y = 1; y < 15; y++) for (let x = 2; x < 14; x++) { const d = Math.abs(x - 7.5) / 6; px(g, ox + x, oy + y, d > 0.9 ? P.ink : P.iron[d < 0.3 ? 2 : d < 0.65 ? 1 : 0]); }
      px(g, ox + 5, oy + 10, P.ink, 6, 4); px(g, ox + 6, oy + 11, P.glow, 4, 2); px(g, ox + 7, oy, P.ink, 2, 2);
      break;
    }
  }
}

const UNBURNT = new Set<TileKind>(["cloud", "water", "cliff"]);

/** Bakes the whole map's ground into one canvas. Maps are small, so one texture per map is cheap.
 *  `burnt` paints the village after the fire: everything but the sky, spring and rock goes to ash and char. */
export function bakeMap(map: WorldMap, opts: { burnt?: boolean } = {}): HTMLCanvasElement {
  const [c, g] = makeCanvas(map.width * TILE, map.height * TILE);
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    const k = map.kindAt(tx, ty)!;
    paintTile(g, k, tx * TILE, ty * TILE, tx, ty, (dx, dy) => map.kindAt(tx + dx, ty + dy));
    if (opts.burnt && !UNBURNT.has(k)) burn(g, tx * TILE, ty * TILE, tx, ty);
  }
  return c;
}

/** Ash and char: keeps each pixel's lightness, drains its colour, darkens it, with embers here and there. */
function burn(g: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number): void {
  const img = g.getImageData(ox, oy, TILE, TILE), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255, v = Math.round(18 + l * 70), x = (i / 4) % TILE, y = Math.floor(i / 4 / TILE);
    const ember = hash2(tx * 16 + x, ty * 16 + y) > 0.992;
    d[i] = ember ? 220 : v + 6; d[i + 1] = ember ? 110 : v + 2; d[i + 2] = ember ? 40 : v;
  }
  g.putImageData(img, ox, oy);
}
