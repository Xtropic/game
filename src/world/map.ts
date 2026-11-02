// Map data: authored as rows of characters with a legend, so maps are readable and diffable as text.
export const TILE = 16; // pixels per tile in the 320 x 180 world

export type TileKind = "grass" | "path" | "flag" | "wall" | "roof" | "water" | "tree" | "fence" | "door" | "flowers" | "cliff";

export interface TileDef { kind: TileKind; solid: boolean; }

export interface MapEntity { id: string; kind: "spawn" | "npc" | "sign" | "exit"; x: number; y: number; props?: Record<string, string | number | boolean>; }

export interface MapFile {
  id: string;
  name: string;
  music?: string;
  legend: Record<string, TileKind>;
  rows: string[];
  entities: MapEntity[];
}

export const TILE_DEFS: Record<TileKind, TileDef> = {
  grass: { kind: "grass", solid: false },
  path: { kind: "path", solid: false },
  flag: { kind: "flag", solid: false },
  flowers: { kind: "flowers", solid: false },
  door: { kind: "door", solid: false },
  wall: { kind: "wall", solid: true },
  roof: { kind: "roof", solid: true },
  water: { kind: "water", solid: true },
  tree: { kind: "tree", solid: true },
  fence: { kind: "fence", solid: true },
  cliff: { kind: "cliff", solid: true },
};

export class WorldMap {
  readonly width: number;
  readonly height: number;
  private kinds: TileKind[];

  constructor(readonly file: MapFile) {
    const errs = validateMap(file);
    if (errs.length) throw new Error(`Map ${file.id}: ${errs.join("; ")}`);
    this.height = file.rows.length;
    this.width = file.rows[0].length;
    this.kinds = file.rows.flatMap((r) => [...r].map((ch) => file.legend[ch]));
  }

  kindAt(tx: number, ty: number): TileKind | null {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return null;
    return this.kinds[ty * this.width + tx];
  }

  /** Off-map counts as solid so nothing can walk out of the world. */
  solidAt(tx: number, ty: number): boolean { const k = this.kindAt(tx, ty); return k === null || TILE_DEFS[k].solid; }

  /** True if a box (pixels, top-left x,y) overlaps any solid tile. */
  boxBlocked(x: number, y: number, w: number, h: number): boolean {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solidAt(tx, ty)) return true;
    return false;
  }

  /** Moves a box by dx, dy, sliding along walls one axis at a time. Long moves are split into
   *  sub-steps under half a tile so nothing tunnels through a wall. Returns the new position. */
  move(x: number, y: number, w: number, h: number, dx: number, dy: number): { x: number; y: number } {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (TILE / 2)));
    let px = x, py = y;
    for (let i = 0; i < n; i++) { const r = this.step(px, py, w, h, dx / n, dy / n); px = r.x; py = r.y; }
    return { x: px, y: py };
  }

  private step(x: number, y: number, w: number, h: number, dx: number, dy: number): { x: number; y: number } {
    let nx = x + dx;
    if (dx !== 0 && this.boxBlocked(nx, y, w, h)) nx = dx > 0 ? Math.floor((x + w + dx) / TILE) * TILE - w : Math.floor((x + dx) / TILE + 1) * TILE;
    if (this.boxBlocked(nx, y, w, h)) nx = x;
    let ny = y + dy;
    if (dy !== 0 && this.boxBlocked(nx, ny, w, h)) ny = dy > 0 ? Math.floor((y + h + dy) / TILE) * TILE - h : Math.floor((y + dy) / TILE + 1) * TILE;
    if (this.boxBlocked(nx, ny, w, h)) ny = y;
    return { x: nx, y: ny };
  }

  spawn(): MapEntity { return this.file.entities.find((e) => e.kind === "spawn") ?? { id: "spawn", kind: "spawn", x: 1, y: 1 }; }
}

export function validateMap(f: MapFile): string[] {
  const errs: string[] = [];
  if (!f.rows.length) return ["no rows"];
  const w = f.rows[0].length;
  f.rows.forEach((r, i) => {
    if (r.length !== w) errs.push(`row ${i} is ${r.length} wide, expected ${w}`);
    for (const ch of r) if (!(ch in f.legend)) errs.push(`row ${i} uses '${ch}' which is not in the legend`);
  });
  for (const [ch, k] of Object.entries(f.legend)) if (!(k in TILE_DEFS)) errs.push(`legend '${ch}' -> unknown tile ${k}`);
  for (const e of f.entities) if (e.x < 0 || e.y < 0 || e.x >= w || e.y >= f.rows.length) errs.push(`entity ${e.id} is off the map`);
  return [...new Set(errs)].slice(0, 10);
}
