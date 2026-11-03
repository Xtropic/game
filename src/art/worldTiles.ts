// The world map of Ostrel, painted in code. One tile is a stretch of country, so the painters draw land from
// far off: hills as little humps, forest as crowded crowns, mountains as peaks with snow. Each kind is painted
// once in four variants and stamped across the map, so baking a 96 x 64 map stays quick. Coasts, riverbanks and
// region borders are drawn on top, then the places: towns, camps, ruins, the Guild's hatcheries.
import type { Texture } from "pixi.js";
import { TILE, type TileKind, type WorldMap } from "../world/map";
import { dither, hash2, makeCanvas, pixelTexture, px } from "./pixel";
import { drawPlaceArt, kit } from "./placeArt";

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

/** What stands across a shut way, 32 x 32: snow, mist, riders, a shut gate, a toll house, a Guild checkpoint... */
const blockers = new Map<string, Texture>();
export function blockerTexture(kind: string, side: string): Texture {
  const key = `${kind}:${side}`; const hit = blockers.get(key); if (hit) return hit;
  const [c, g] = makeCanvas(32, 32);
  const k = kit(g, 0, 0), p = k.p;
  const across = side === "north" || side === "south";
  switch (kind) {
    case "snow": k.heap(0, 30, 32, "#e8eef4"); k.heap(4, 22, 22, "#d8e0e8"); for (let i = 0; i < 9; i++) p(Math.floor(hash2(i, 3) * 30), Math.floor(hash2(i, 9) * 18), "#ffffff"); break;
    case "mist": for (let i = 0; i < 6; i++) p(2 + (i % 2) * 3, 4 + i * 4, i % 2 ? "#e6edf4" : "#c6d4e2", 26, 4); break;
    case "riders": for (const x of [4, 18]) { p(x, 18, "#55585e", 9, 6); p(x + 7, 14, "#55585e", 3, 5); p(x + 1, 24, "#2a2624", 1, 5); p(x + 7, 24, "#2a2624", 1, 5); p(x + 3, 10, "#a03a2a", 3, 8); p(x + 4, 8, "#e8c39c", 2, 2); p(x + 8, 2, "#1d1814", 1, 14); } break;
    case "gate": k.tower(0, 6, 7, 24, "crenel", "#c8b48a"); k.tower(25, 6, 7, 24, "crenel", "#c8b48a"); p(7, 10, "#1d1814", 18, 20); p(8, 11, "#8e6a4b", 16, 19); for (let x = 10; x < 24; x += 4) p(x, 11, "#5e4029", 1, 19); p(8, 18, "#5e4029", 16, 1); break;
    case "toll": k.house(1, 12, 11, 12, "#4f5a6a", "gable", "#ddcfae"); p(12, 20, "#1d1814", 19, 3); for (let x = 13; x < 31; x += 4) p(x, 21, "#e8e0d0", 2, 1); p(12, 20, "#1d1814", 2, 10); break;
    case "checkpoint": p(0, 18, "#1d1814", 32, 4); for (let x = 1; x < 31; x += 6) { p(x, 19, "#c8402c", 3, 2); p(x + 3, 19, "#e8e0d0", 3, 2); } p(2, 18, "#1d1814", 2, 12); p(28, 18, "#1d1814", 2, 12); k.flag(24, 4, "#a03a2a", 14); p(8, 8, "#55585e", 4, 10); p(9, 5, "#e8c39c", 2, 3); p(13, 2, "#1d1814", 1, 16); break;
    case "smugglers": for (const [x, y] of [[2, 20], [9, 22], [4, 14]]) { p(x, y, "#1d1814", 8, 8); p(x + 1, y + 1, "#8e6a4b", 6, 6); } p(20, 12, "#2a2624", 5, 14); p(21, 9, "#e8c39c", 3, 3); k.lamp(27, 14); break;
    case "desert": k.heap(0, 31, 32, "#e3cc92"); k.heap(8, 24, 18, "#ecd8a2"); p(6, 26, "#f2f0ea", 6, 1); p(7, 25, "#f2f0ea", 1, 3); p(10, 25, "#f2f0ea", 1, 3); break;
    case "walls": p(0, 4, "#1d1814", 32, 28); p(1, 5, "#7a7c80", 30, 26); for (let y = 8; y < 30; y += 4) p(1, y, "#5a5c60", 30, 1); for (let x = 0; x < 32; x += 4) p(x, 2, "#1d1814", 2, 2); p(11, 16, "#1d1814", 10, 16); p(12, 17, "#5e4029", 8, 15); break;
    default: p(0, 18, "#1d1814", 32, 4);
  }
  void across;
  const t = pixelTexture(c); blockers.set(key, t); return t;
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
  for (const p of [...(map.file.places ?? [])].sort((a, b) => a.y - b.y)) drawPlaceArt(g, p.id, p.icon, p.x, p.y, TILE);
  return c;
}
