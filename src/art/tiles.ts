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
  }
}

/** Bakes the whole map's ground into one canvas. Maps are small, so one texture per map is cheap. */
export function bakeMap(map: WorldMap): HTMLCanvasElement {
  const [c, g] = makeCanvas(map.width * TILE, map.height * TILE);
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    const k = map.kindAt(tx, ty)!;
    paintTile(g, k, tx * TILE, ty * TILE, tx, ty, (dx, dy) => map.kindAt(tx + dx, ty + dy));
  }
  return c;
}
