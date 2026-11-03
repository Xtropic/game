// Map data: authored as rows of characters with a legend, so maps are readable and diffable as text.
export const TILE = 16; // pixels per tile in the 320 x 180 world

export type TileKind =
  | "grass" | "path" | "flag" | "wall" | "roof" | "water" | "tree" | "fence" | "door" | "flowers" | "cliff"
  // Larkfold: the cloud sea below the village, duskwort terraces and their walls, steps, the drying house
  | "cloud" | "moss" | "terrace" | "steps" | "drying" | "ladder" | "cave" | "gate"
  // the brood caves, houses and rooms
  | "rock" | "cavefloor" | "tray" | "exit" | "plank" | "iwall" | "bed" | "shelf" | "table" | "innerdoor" | "roofwalk"
  // the trail, Vantry's yard and the hatchery
  | "trail" | "cobble" | "cart" | "stonewall" | "brick" | "wetfloor" | "boiler"
  // Act I: the Commons camp, Millbridge, the Sallow hatchery and the waystation
  | "tent" | "campfire" | "stall" | "canal" | "bridge" | "well" | "hay" | "fire" | "crate"
  // the world map of Ostrel: one tile is a stretch of country
  | "sea" | "shoal" | "plains" | "meadow" | "hills" | "mount" | "snow" | "pines" | "forest" | "cloudwood" | "terraces" | "marsh"
  | "reeds" | "steppe" | "sand" | "saltpan" | "river" | "road" | "pass" | "spire" | "ashrock" | "orchard" | "townground";

export interface TileDef { kind: TileKind; solid: boolean; }

export interface MapEntity { id: string; kind: "spawn" | "npc" | "sign" | "exit"; x: number; y: number; props?: Record<string, string | number | boolean>; }

/** A place on the world map: a town, camp or ruin the player walks into. What happens there is up to the story. */
export interface Place { id: string; name: string; x: number; y: number; icon: string; }

/** Where a road leaves a land at its edge and comes into the next one (the land "land-<to>", at its end of the same way). */
export interface Way { id: string; x: number; y: number; side: "north" | "south" | "west" | "east"; to: string; }

export interface MapFile {
  id: string;
  name: string;
  music?: string;
  legend: Record<string, TileKind>;
  rows: string[];
  entities: MapEntity[];
  /** The world map: walked at a faster pace, with regions, places and wild encounters. */
  world?: boolean;
  /** Which region each tile belongs to, as a second layer of rows with its own legend. */
  regions?: { legend: Record<string, string>; rows: string[] };
  places?: Place[];
  ways?: Way[];
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
  cloud: { kind: "cloud", solid: true },
  moss: { kind: "moss", solid: false },
  terrace: { kind: "terrace", solid: true },
  steps: { kind: "steps", solid: false },
  drying: { kind: "drying", solid: true },
  ladder: { kind: "ladder", solid: false },
  cave: { kind: "cave", solid: false },
  gate: { kind: "gate", solid: true },
  rock: { kind: "rock", solid: true },
  cavefloor: { kind: "cavefloor", solid: false },
  tray: { kind: "tray", solid: true },
  exit: { kind: "exit", solid: false },
  plank: { kind: "plank", solid: false },
  iwall: { kind: "iwall", solid: true },
  bed: { kind: "bed", solid: true },
  shelf: { kind: "shelf", solid: true },
  table: { kind: "table", solid: true },
  innerdoor: { kind: "innerdoor", solid: true },
  roofwalk: { kind: "roofwalk", solid: false },
  trail: { kind: "trail", solid: false },
  cobble: { kind: "cobble", solid: false },
  cart: { kind: "cart", solid: true },
  stonewall: { kind: "stonewall", solid: true },
  brick: { kind: "brick", solid: true },
  wetfloor: { kind: "wetfloor", solid: false },
  boiler: { kind: "boiler", solid: true },
  tent: { kind: "tent", solid: true },
  campfire: { kind: "campfire", solid: true },
  stall: { kind: "stall", solid: true },
  canal: { kind: "canal", solid: true },
  bridge: { kind: "bridge", solid: false },
  well: { kind: "well", solid: true },
  hay: { kind: "hay", solid: true },
  fire: { kind: "fire", solid: true },
  crate: { kind: "crate", solid: true },
  sea: { kind: "sea", solid: true },
  shoal: { kind: "shoal", solid: false },
  plains: { kind: "plains", solid: false },
  meadow: { kind: "meadow", solid: false },
  hills: { kind: "hills", solid: false },
  mount: { kind: "mount", solid: true },
  snow: { kind: "snow", solid: false },
  pines: { kind: "pines", solid: false },
  forest: { kind: "forest", solid: false },
  cloudwood: { kind: "cloudwood", solid: false },
  terraces: { kind: "terraces", solid: false },
  marsh: { kind: "marsh", solid: false },
  reeds: { kind: "reeds", solid: false },
  steppe: { kind: "steppe", solid: false },
  sand: { kind: "sand", solid: false },
  saltpan: { kind: "saltpan", solid: false },
  river: { kind: "river", solid: true },
  road: { kind: "road", solid: false },
  pass: { kind: "pass", solid: false },
  spire: { kind: "spire", solid: true },
  ashrock: { kind: "ashrock", solid: false },
  orchard: { kind: "orchard", solid: false },
  townground: { kind: "townground", solid: false },
};

/** World-map ground where wild kith roam: walking it can start an encounter. */
export const WILD = new Set<TileKind>(["hills", "snow", "pines", "forest", "cloudwood", "marsh", "reeds", "steppe", "sand", "saltpan", "meadow", "terraces", "ashrock"]);

export class WorldMap {
  readonly width: number;
  readonly height: number;
  private kinds: TileKind[];
  /** Solid kinds the story has opened (the lower gate, once the night run starts). */
  readonly open = new Set<TileKind>();
  /** Extra solid tiles decided by the story (shut ways on the world map). */
  closed: ((tx: number, ty: number) => boolean) | null = null;
  private regionIds: (string | null)[] = [];

  constructor(readonly file: MapFile) {
    const errs = validateMap(file);
    if (errs.length) throw new Error(`Map ${file.id}: ${errs.join("; ")}`);
    this.height = file.rows.length;
    this.width = file.rows[0].length;
    this.kinds = file.rows.flatMap((r) => [...r].map((ch) => file.legend[ch]));
    if (file.regions) this.regionIds = file.regions.rows.flatMap((r) => [...r].map((ch) => file.regions!.legend[ch] ?? null));
  }

  /** The region a world-map tile lies in, or null off the map and on maps without regions. */
  regionAt(tx: number, ty: number): string | null {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return null;
    return this.regionIds[ty * this.width + tx] ?? null;
  }

  placeAt(tx: number, ty: number): Place | undefined { return this.file.places?.find((p) => p.x === tx && p.y === ty); }

  kindAt(tx: number, ty: number): TileKind | null {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return null;
    return this.kinds[ty * this.width + tx];
  }

  /** Off-map counts as solid so nothing can walk out of the world. */
  solidAt(tx: number, ty: number): boolean { const k = this.kindAt(tx, ty); return k === null || (TILE_DEFS[k].solid && !this.open.has(k)) || !!this.closed?.(tx, ty); }

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
  if (f.regions) {
    if (f.regions.rows.length !== f.rows.length || f.regions.rows.some((r) => r.length !== w)) errs.push("region rows don't match the map");
    for (const r of f.regions.rows) for (const ch of r) if (!(ch in f.regions.legend)) errs.push(`region layer uses '${ch}' which is not in its legend`);
  }
  for (const p of f.places ?? []) if (p.x < 0 || p.y < 0 || p.x >= w || p.y >= f.rows.length) errs.push(`place ${p.id} is off the map`);
  for (const e of f.entities) if (e.x < 0 || e.y < 0 || e.x >= w || e.y >= f.rows.length) errs.push(`entity ${e.id} is off the map`);
  return [...new Set(errs)].slice(0, 10);
}
