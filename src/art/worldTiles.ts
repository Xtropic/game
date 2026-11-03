// The world map of Ostrel, painted in code. One tile is a stretch of country, so the painters draw land from
// far off: hills as little humps, forest as crowded crowns, mountains as peaks with snow. Each kind is painted
// once in four variants and stamped across the map, so baking a 96 x 64 map stays quick. Coasts, riverbanks and
// region borders are drawn on top, then the places: towns, camps, ruins, the Guild's hatcheries.
import { TILE, type Place, type TileKind, type WorldMap } from "../world/map";
import { dither, hash2, makeCanvas, px } from "./pixel";

const C = {
  sea: ["#1f3f66", "#26507c", "#2f5f8e"], shoal: ["#3f7a9a", "#5a95ae", "#7fb3c4"], foam: "#cfe4ea",
  cloud: ["#a9bccf", "#c6d4e2", "#e6edf4"],
  plains: ["#7fa452", "#8db05c", "#9cbc68"], meadow: ["#76a050", "#84ac5a", "#93b866"], dark: "#4a6a34",
  hills: ["#7a8f4e", "#8d9f5a", "#a3b26c"], hillShade: "#566a36",
  rock: ["#6d6a66", "#8a8680", "#aaa59c"], rockDark: "#46433f", snow: ["#d8e0e8", "#e8eef4", "#ffffff"], snowShade: "#a9b7c6",
  pine: ["#203f30", "#2c5440", "#3a6a50"], tree: ["#2f5a2c", "#3f7438", "#558f48"], cloudwood: ["#4f6e66", "#62837a", "#7b9b90"],
  terrace: ["#6c4f7c", "#8d6aa0"], terraceWall: "#9a9384",
  marsh: ["#4c5a3a", "#5a6a44", "#6a7a50"], water: "#3f6a7a", reed: ["#a69a5a", "#c2b46e"],
  steppe: ["#b3a36a", "#c2b278", "#cfc088"], sand: ["#d8bf84", "#e3cc92", "#ecd8a2"], salt: ["#d6d4cc", "#e6e4dc", "#f2f0ea"],
  river: ["#2f6a96", "#3d7cab", "#5a98c4"], road: ["#b39a6e", "#c4ab7e"], roadEdge: "#8a7652",
  ash: ["#2a2624", "#3a3430", "#4a423c"], ember: "#d0602a", spire: ["#5a5866", "#76748a", "#9694a8"],
  orchard: ["#d88a8a", "#f0c8a0"], ink: "#1d1814",
};

const cache = new Map<string, HTMLCanvasElement>();

function paint(kind: TileKind, v: number): HTMLCanvasElement {
  const key = `${kind}:${v}`;
  const hit = cache.get(key); if (hit) return hit;
  const [c, g] = makeCanvas(TILE, TILE);
  const r = (i: number) => hash2(v * 13 + i, i * 7 + v);
  const ground = (ramp: string[], amt = 0.5) => dither(g, 0, 0, TILE, TILE, ramp, (x, y) => 0.5 + (hash2(x + v * 16, y + v * 5) - 0.5) * amt);
  const tuft = (col: string, n: number) => { for (let i = 0; i < n; i++) { const x = Math.floor(r(i) * 14) + 1, y = Math.floor(r(i + 7) * 13) + 2; px(g, x, y, col); px(g, x + 1, y - 1, col); } };
  const crown = (cx: number, cy: number, rad: number, ramp: string[]) => {
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) { const d = Math.hypot(x, y * 1.1) / rad; if (d <= 1) px(g, cx + x, cy + y, d > 0.82 ? C.ink : ramp[x < 0 && y < 0 ? 2 : d < 0.5 ? 1 : 0]); }
  };
  switch (kind) {
    case "sea": dither(g, 0, 0, TILE, TILE, C.sea, (x, y) => 0.4 + 0.25 * Math.sin((x + v * 4) * 0.6 + y * 0.3)); if (v & 1) px(g, 3 + v, 6, C.sea[2], 4, 1); break;
    case "shoal": dither(g, 0, 0, TILE, TILE, C.shoal, (x, y) => 0.5 + 0.3 * Math.sin((x + y) * 0.5 + v)); px(g, 2 + v * 2, 4 + v, C.foam, 3, 1); break;
    case "cloud": dither(g, 0, 0, TILE, TILE, C.cloud, (x, y) => 0.55 + 0.35 * Math.sin((x + v * 5) * 0.3) * Math.cos((y + v * 3) * 0.25)); break;
    case "plains": ground(C.plains); tuft(C.dark, 2); break;
    case "meadow": ground(C.meadow); tuft(C.dark, 3); if (v === 2) { px(g, 5, 6, "#e8d070"); px(g, 11, 10, "#e8e0d0"); } break;
    case "townground": ground(C.plains, 0.3); break;
    case "hills": {
      ground(C.meadow, 0.3);
      for (const [hx, hy, w] of [[5, 9, 6], [11, 12, 5]] as const) for (let x = -w; x <= w; x++) { const h = Math.round(Math.sqrt(1 - (x / w) ** 2) * (w * 0.7)); for (let y = 0; y < h; y++) px(g, hx + x, hy - y, y === h - 1 ? C.hills[2] : x < 0 ? C.hills[1] : C.hills[0]); px(g, hx + x, hy, C.hillShade); }
      break;
    }
    case "mount": {
      ground(C.rock, 0.3);
      const peak = (cx: number, base: number, h: number) => { for (let y = 0; y < h; y++) { const w = Math.round(((h - y) / h) * (h * 0.75)); for (let x = -w; x <= w; x++) px(g, cx + x, base - y, y > h - 4 ? C.snow[x < 0 ? 2 : 1] : x < 0 ? C.rock[2] : C.rock[0]); } px(g, cx - Math.round(h * 0.75), base, C.rockDark, Math.round(h * 1.5) + 1, 1); };
      peak(6 + (v & 1), 14, 11); peak(12, 15, 7);
      break;
    }
    case "snow": dither(g, 0, 0, TILE, TILE, C.snow, (x, y) => 0.55 + (hash2(x + v * 9, y) - 0.5) * 0.4); px(g, 3 + v * 2, 9, C.snowShade, 4, 1); break;
    case "pines": {
      dither(g, 0, 0, TILE, TILE, C.snow, (x, y) => 0.4 + (hash2(x, y + v) - 0.5) * 0.3);
      for (const [tx, ty] of [[4, 11], [11, 8], [8, 15]] as const) for (let y = 0; y < 8; y++) { const w = Math.floor(y / 2); px(g, tx - w, ty - 8 + y, y === 7 ? C.ink : C.pine[y < 3 ? 2 : 1], w * 2 + 1, 1); }
      break;
    }
    case "forest": ground(C.meadow, 0.3); crown(4, 5, 4, C.tree); crown(11, 7, 4, C.tree); crown(6, 12, 4, C.tree); break;
    case "cloudwood": { // dripping forest inside the cloud: dark green crowns with mist drifting through them
      ground(C.meadow, 0.3);
      crown(4, 5, 4, C.cloudwood); crown(11, 7, 4, C.cloudwood); crown(6, 12, 4, C.cloudwood);
      for (let x = 0; x < TILE; x++) { if (hash2(x, v) > 0.45) px(g, x, 9 + (x & 1), C.cloud[2]); if (hash2(x, v + 9) > 0.6) px(g, x, 2, C.cloud[1]); }
      break;
    }
    case "terraces": { // stepped fields of green with a stone lip on each step, and purple duskwort here and there
      ground(C.meadow, 0.3);
      for (let row = 0; row < 3; row++) { const y = 4 + row * 5; px(g, 0, y, C.terraceWall, TILE, 1); px(g, 0, y + 1, C.hillShade, TILE, 1); for (let i = 0; i < 3; i++) { const x = Math.floor(r(i + row * 5) * 14); px(g, x, y - 2, C.terrace[i & 1], 2, 1); } }
      break;
    }
    case "marsh": ground(C.marsh); for (let i = 0; i < 3; i++) px(g, Math.floor(r(i) * 11) + 1, Math.floor(r(i + 3) * 12) + 2, C.water, 4, 1); break;
    case "reeds": ground(C.marsh, 0.3); for (let i = 0; i < 7; i++) { const x = Math.floor(r(i) * 15), y = Math.floor(r(i + 9) * 9) + 5; px(g, x, y, C.reed[i & 1], 1, 4); px(g, x, y - 1, "#6a5a3a"); } break;
    case "steppe": ground(C.steppe); tuft("#8a7a4a", 3); break;
    case "sand": dither(g, 0, 0, TILE, TILE, C.sand, (x, y) => 0.5 + 0.3 * Math.sin((x * 0.4 + y) * 0.8 + v)); break;
    case "saltpan": ground(C.salt, 0.3); for (let i = 0; i < 3; i++) px(g, Math.floor(r(i) * 12), Math.floor(r(i + 4) * 14), "#c4c0b4", 4, 1); break;
    case "river": dither(g, 0, 0, TILE, TILE, C.river, (x, y) => 0.4 + 0.3 * Math.sin((x + y + v * 3) * 0.7)); break;
    case "canal": dither(g, 0, 0, TILE, TILE, C.river, () => 0.3); px(g, 0, 0, "#6f6d68", TILE, 2); px(g, 0, TILE - 2, "#6f6d68", TILE, 2); break;
    case "bridge": dither(g, 0, 0, TILE, TILE, C.river, () => 0.4); px(g, 2, 0, C.ink, 12, TILE); px(g, 3, 0, "#8e6a4b", 10, TILE); for (let y = 2; y < TILE; y += 4) px(g, 3, y, "#5e4029", 10, 1); break;
    case "road": ground(C.meadow, 0.3); break;
    case "pass": ground(C.rock, 0.3); break;
    case "spire": {
      dither(g, 0, 0, TILE, TILE, C.cloud, () => 0.6);
      for (let y = 0; y < 15; y++) { const w = 2 + Math.floor(y / 5); px(g, 8 - w, y, y < 2 ? C.spire[2] : C.spire[1], w, 1); px(g, 8, y, C.spire[0], w, 1); }
      break;
    }
    case "ashrock": ground(C.ash, 0.5); if (v < 2) px(g, 4 + v * 5, 7 + v, C.ember, 2, 1); break;
    case "orchard": ground(C.meadow, 0.3); for (const [ox, oy] of [[4, 5], [11, 5], [4, 12], [11, 12]] as const) { crown(ox, oy, 3, C.tree); px(g, ox - 1, oy - 1, C.orchard[v & 1]); } break;
    default: ground(C.plains);
  }
  cache.set(key, c);
  return c;
}

/** Roads are drawn as a track joining their neighbours, so they read as lines across the country. */
function drawRoad(g: CanvasRenderingContext2D, ox: number, oy: number, n: (dx: number, dy: number) => TileKind | null, rocky: boolean): void {
  const joins = (k: TileKind | null) => k === "road" || k === "pass" || k === "bridge" || k === "townground";
  const col = rocky ? C.rock[2] : C.road[1], edge = rocky ? C.rockDark : C.roadEdge;
  px(g, ox + 6, oy + 6, edge, 4, 4); px(g, ox + 7, oy + 7, col, 2, 2);
  if (joins(n(0, -1))) { px(g, ox + 6, oy, edge, 4, 8); px(g, ox + 7, oy, col, 2, 8); }
  if (joins(n(0, 1))) { px(g, ox + 6, oy + 8, edge, 4, 8); px(g, ox + 7, oy + 8, col, 2, 8); }
  if (joins(n(-1, 0))) { px(g, ox, oy + 6, edge, 8, 4); px(g, ox, oy + 7, col, 8, 2); }
  if (joins(n(1, 0))) { px(g, ox + 8, oy + 6, edge, 8, 4); px(g, ox + 8, oy + 7, col, 8, 2); }
}

const WATERY = new Set<TileKind>(["sea", "shoal", "river", "canal", "bridge", "cloud"]);

/** Small pictures for the places, 16 x 16, standing on their tile. */
function drawPlace(g: CanvasRenderingContext2D, p: Place): void {
  const ox = p.x * TILE, oy = p.y * TILE;
  const house = (x: number, y: number, roof: string, w = 6) => { px(g, ox + x, oy + y, C.ink, w, 5); px(g, ox + x + 1, oy + y + 1, "#ddcfae", w - 2, 3); for (let i = 0; i < 3; i++) px(g, ox + x - 1 + i, oy + y - 1 - i, roof, w + 2 - i * 2, 1); px(g, ox + x + 2, oy + y + 2, "#5e4029", 1, 2); };
  switch (p.icon) {
    case "ruins": for (const [x, h] of [[2, 6], [6, 9], [10, 5]] as const) { px(g, ox + x, oy + 14 - h, C.ink, 3, h); px(g, ox + x, oy + 15 - h, "#5a5450", 2, h - 1); } px(g, ox + 1, oy + 14, "#3a3430", 14, 2); px(g, ox + 8, oy + 4, "#8a8680", 1, 1); break;
    case "inn": house(4, 8, "#8c412c", 8); px(g, ox + 13, oy + 5, C.ink, 1, 6); px(g, ox + 13, oy + 5, "#c9a86a", 2, 2); break;
    case "camp": for (const [x, y] of [[3, 7], [9, 9]] as const) for (let i = 0; i < 5; i++) px(g, ox + x + 2 - i, oy + y + i, i === 4 ? C.ink : "#8a7a5a", i * 2 + 1, 1); px(g, ox + 7, oy + 12, "#e8823a", 2, 2); px(g, ox + 12, oy + 2, C.ink, 1, 7); px(g, ox + 13, oy + 2, "#7a2a2a", 3, 2); break;
    case "town": house(1, 9, "#8c412c"); house(9, 10, "#b0553a"); house(5, 4, "#8c412c"); break;
    case "sign": px(g, ox + 7, oy + 4, C.ink, 2, 11); px(g, ox + 3, oy + 4, C.ink, 10, 4); px(g, ox + 4, oy + 5, "#c4ab7e", 8, 2); break;
    case "hatchery": px(g, ox + 2, oy + 7, C.ink, 12, 8); px(g, ox + 3, oy + 8, "#6e342a", 10, 6); px(g, ox + 10, oy + 1, C.ink, 3, 7); px(g, ox + 11, oy + 1, "#55585e", 1, 6); for (let i = 0; i < 3; i++) px(g, ox + 9 + i, oy - 1 - i, "#9a9a9a", 2, 1); px(g, ox + 5, oy + 10, "#e8823a", 2, 2); break;
    case "city": for (const [x, y, h] of [[1, 6, 9], [5, 3, 12], [10, 5, 10]] as const) { px(g, ox + x, oy + y, C.ink, 5, h); px(g, ox + x + 1, oy + y + 1, "#6e342a", 3, h - 1); } px(g, ox + 7, oy, "#9a9a9a", 1, 3); break;
    case "castle": px(g, ox + 2, oy + 6, C.ink, 12, 9); px(g, ox + 3, oy + 7, "#a5a7a9", 10, 7); for (let x = 2; x < 14; x += 3) px(g, ox + x, oy + 4, C.ink, 2, 2); px(g, ox + 7, oy + 10, C.ink, 2, 4); px(g, ox + 8, oy, C.ink, 1, 4); px(g, ox + 9, oy, "#c8402c", 3, 2); break;
    case "fort": px(g, ox + 3, oy + 5, C.ink, 10, 10); px(g, ox + 4, oy + 6, "#8e9092", 8, 8); for (let x = 3; x < 13; x += 3) px(g, ox + x, oy + 3, C.ink, 2, 2); px(g, ox + 7, oy + 10, C.ink, 2, 4); break;
    case "college": house(3, 7, "#4f6a8a", 10); px(g, ox + 7, oy + 1, C.ink, 2, 5); px(g, ox + 7, oy + 2, "#e8e0c8", 2, 2); break;
    case "port": house(2, 6, "#8c412c"); px(g, ox + 9, oy + 10, C.ink, 6, 3); px(g, ox + 10, oy + 10, "#8e6a4b", 4, 2); px(g, ox + 12, oy + 3, C.ink, 1, 7); px(g, ox + 13, oy + 4, "#e8e0d0", 2, 4); break;
    case "palace": px(g, ox + 2, oy + 8, C.ink, 12, 7); px(g, ox + 3, oy + 9, "#e3cc92", 10, 5); for (const x of [3, 8]) { px(g, ox + x, oy + 3, C.ink, 5, 6); px(g, ox + x + 1, oy + 4, "#d0602a", 3, 4); } break;
    case "village": house(2, 9, "#66553f"); house(9, 7, "#66553f"); break;
    default: px(g, ox + 5, oy + 5, C.ink, 6, 6);
  }
}

/** The whole world map as one canvas: ground, coasts, roads, region borders and places. */
export function bakeWorld(map: WorldMap): HTMLCanvasElement {
  const [c, g] = makeCanvas(map.width * TILE, map.height * TILE);
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    const k = map.kindAt(tx, ty)!, ox = tx * TILE, oy = ty * TILE, n = (dx: number, dy: number) => map.kindAt(tx + dx, ty + dy);
    g.drawImage(paint(k === "road" ? "plains" : k === "pass" ? "ashrock" : k, Math.floor(hash2(tx, ty) * 4) | (k === "pass" ? 2 : 0)), ox, oy);
    if (k === "pass") { g.globalAlpha = 0.55; g.fillStyle = C.rock[1]; g.fillRect(ox, oy, TILE, TILE); g.globalAlpha = 1; }
    if (k === "road" || k === "pass") drawRoad(g, ox, oy, n, k === "pass");
    // foam where land meets the sea, banks along rivers, mist where land meets the cloud sea
    if (!WATERY.has(k)) for (const [dx, dy, x, y, w, h] of [[0, -1, 0, 0, 16, 1], [0, 1, 0, 15, 16, 1], [-1, 0, 0, 0, 1, 16], [1, 0, 15, 0, 1, 16]] as const) {
      const nk = n(dx, dy); if (!nk) continue;
      if (nk === "sea" || nk === "shoal") px(g, ox + x, oy + y, C.foam, w, h);
      else if (nk === "river" || nk === "canal") px(g, ox + x, oy + y, "#4a5a3a", w, h);
      else if (nk === "cloud") px(g, ox + x, oy + y, C.cloud[2], w, h);
    }
  }
  // region borders: a dotted line wherever two regions meet on land
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    const r = map.regionAt(tx, ty), k = map.kindAt(tx, ty)!;
    if (!r || WATERY.has(k)) continue;
    const right = map.regionAt(tx + 1, ty), down = map.regionAt(tx, ty + 1);
    if (right && right !== r && !WATERY.has(map.kindAt(tx + 1, ty)!)) for (let y = 0; y < TILE; y += 3) px(g, tx * TILE + 15, ty * TILE + y, "rgba(40,20,20,.55)", 1, 2);
    if (down && down !== r && !WATERY.has(map.kindAt(tx, ty + 1)!)) for (let x = 0; x < TILE; x += 3) px(g, tx * TILE + x, ty * TILE + 15, "rgba(40,20,20,.55)", 2, 1);
  }
  for (const p of map.file.places ?? []) drawPlace(g, p);
  return c;
}
