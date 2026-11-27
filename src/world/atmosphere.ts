// The air over the explorable maps: real light and the things that drift in it.
// - Light: at dusk, at night, by firelight and underground, darkness is drawn into a texture and every lamp, fire,
//   boiler and lit window cuts a soft hole in it, with a warm additive glow on top. Rhea carries a little light of her own.
// - Ambience: embers off fires, steam off warm water, fireflies on summer nights, snow, ash, dust in sunlight, and
//   glints on water. Cheap: a few hundred pixels redrawn each frame, only around the camera.
// - A vignette over the screen, stronger in the dark.
import { Container, Graphics, RenderTexture, Sprite, Texture, type Renderer } from "pixi.js";
import { TILE, type TileKind, type WorldMap } from "./map";

/** The colour and depth of the dark for each kind of light the story sets. Day and snow have none. */
const DARK: Record<string, { color: number; alpha: number }> = {
  dusk: { color: 0x4a2040, alpha: 0.42 },
  night: { color: 0x060920, alpha: 0.8 },
  fire: { color: 0x2a0802, alpha: 0.42 },
  evening: { color: 0x140a06, alpha: 0.5 },
  steam: { color: 0x0e0806, alpha: 0.34 },
  under: { color: 0x04050a, alpha: 0.66 },
};
/** A tint laid over the whole map (no lamps): the light of day, of snow, of ash. */
const TINT: Record<string, { color: number; alpha: number }> = {
  ash: { color: 0x2a2624, alpha: 0.14 },
  snow: { color: 0xe8f0fa, alpha: 0.2 },
};
/** Maps that are dark whatever the hour: caves, tunnels, the undercroft. */
const UNDER = new Set(["caves", "culvert", "undercroft"]);
/** Maps with their own indoor light; they only darken for the evening, the steam of a brood room or a fire. */
const INDOORS = new Set(["home", "caves", "surgery", "rooms", "hatchery", "mire", "culvert", "undercroft", "backroom"]);
/** Places with hot springs or brood-room boilers: their water steams. */
const WARM = new Set(["larkfold", "thornwick", "undercroft", "hatchery", "mire", "lockhatch", "culvert", "umes"]);

interface Lamp { x: number; y: number; r: number; color: number; flicker: number; glow: number; seed: number }
const LAMPS: Partial<Record<TileKind, Omit<Lamp, "x" | "y" | "seed">>> = {
  campfire: { r: 58, color: 0xffa040, flicker: 0.18, glow: 0.32 },
  fire: { r: 66, color: 0xff7a24, flicker: 0.25, glow: 0.38 },
  boiler: { r: 46, color: 0xff8a3a, flicker: 0.08, glow: 0.45 },
  door: { r: 24, color: 0xffc274, flicker: 0.05, glow: 0.22 },
  townground: { r: 30, color: 0xffc274, flicker: 0.06, glow: 0.35 },
  cave: { r: 18, color: 0xb8c8ff, flicker: 0.02, glow: 0.12 },
};
const WATER = new Set<TileKind>(["water", "canal", "river", "sea"]);
const GRASSY = new Set<TileKind>(["grass", "flowers", "meadow", "moss", "terrace", "terraces", "orchard", "reeds", "marsh", "plains"]);

/** A soft white disc, transparent at the rim: the shape of every light. */
function discTexture(): Texture {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!, grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.35, "rgba(255,255,255,0.85)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return Texture.from(c);
}
/** Clear in the middle, dark at the edges. */
function vignetteTexture(): Texture {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!, grad = g.createRadialGradient(128, 128, 70, 128, 128, 182);
  grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  return Texture.from(c);
}
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

interface Mote { x: number; y: number; vx: number; vy: number; life: number; max: number; kind: "ember" | "steam" | "fly" | "snow" | "ash" | "dust" }

export class Atmosphere {
  /** Over the people, under the darkness: steam, snow, dust, ash and water glints. */
  readonly air = new Graphics();
  /** The darkness with its holes. */
  readonly dark = new Sprite();
  /** Warm light added on top of the dark, and the things that glow in it (embers, fireflies). */
  readonly glow = new Container();
  /** Over the whole screen. */
  readonly vignette = new Sprite();

  private disc = discTexture();
  private rt: RenderTexture | null = null;
  private cutter = new Container();
  private shade = new Graphics();
  private lamps: Lamp[] = [];
  private cuts: Sprite[] = [];
  private glows: Sprite[] = [];
  private sparks = new Graphics();
  private motes: Mote[] = [];
  private fires: [number, number][] = [];
  private warmWater: [number, number][] = [];
  private water: [number, number][] = [];
  private grass: [number, number][] = [];
  private map: WorldMap | null = null;
  private mode = { dark: null as { color: number; alpha: number } | null, tint: null as { color: number; alpha: number } | null, light: "day", outdoor: true };
  private spawn = 0;

  constructor() {
    this.vignette.texture = vignetteTexture();
    this.vignette.eventMode = "none";
    // A full-screen blend is free on a graphics card but slow in the software renderer that browser tests use,
    // and the tests walk by the clock; it's only shading, so they go without it.
    this.vignette.visible = !(typeof navigator !== "undefined" && navigator.webdriver);
    this.cutter.addChild(this.shade);
    this.glow.addChild(this.sparks);
  }

  /** A new map: find its lamps, fires and water once. */
  setMap(map: WorldMap): void {
    this.map = map; this.motes = [];
    this.lamps = []; this.fires = []; this.warmWater = []; this.water = []; this.grass = [];
    const warm = WARM.has(map.file.id);
    for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
      const k = map.kindAt(tx, ty); if (!k) continue;
      const l = LAMPS[k];
      if (l && !(k === "townground" && !map.file.world) && !(k === "cave" && !UNDER.has(map.file.id))) {
        // a lit window sits just above its door; everything else glows from its middle
        this.lamps.push({ ...l, x: tx * TILE + 8, y: ty * TILE + (k === "door" ? 2 : 8), seed: hash(tx, ty) * 100 });
      }
      if (k === "campfire" || k === "fire") this.fires.push([tx, ty]);
      if (WATER.has(k)) { this.water.push([tx, ty]); if (warm) this.warmWater.push([tx, ty]); }
      if (k === "wetfloor" && warm && hash(tx, ty) > 0.85) this.warmWater.push([tx, ty]);
      if (GRASSY.has(k)) this.grass.push([tx, ty]);
    }
    for (const s of [...this.cuts, ...this.glows]) s.destroy();
    this.cuts = []; this.glows = [];
    for (const l of [...this.lamps, null]) { // null: Rhea's own light
      const cut = new Sprite(this.disc); cut.anchor.set(0.5); cut.blendMode = "erase"; this.cutter.addChild(cut); this.cuts.push(cut);
      const g = new Sprite(this.disc); g.anchor.set(0.5); g.blendMode = "add"; g.tint = l?.color ?? 0xfff0d8; this.glow.addChildAt(g, 0); this.glows.push(g);
    }
    this.rt?.destroy(true); this.rt = null;
  }

  /** The story's light for this map, re-read on every refresh. */
  setLight(light: string): void {
    const id = this.map?.file.id ?? "";
    const indoor = INDOORS.has(id) && light !== "evening" && light !== "steam" && light !== "fire";
    const dark = UNDER.has(id) ? DARK.under : indoor ? null : DARK[light] ?? null;
    this.mode = { dark, tint: indoor ? null : TINT[light] ?? null, light, outdoor: !INDOORS.has(id) };
    this.dark.visible = this.glow.visible = !!dark;
  }

  /** The vignette fills the screen. */
  resize(w: number, h: number): void { this.vignette.width = w; this.vignette.height = h; }

  /** Each frame: the lamps flicker, the air moves, the darkness is redrawn around the camera. */
  update(dt: number, t: number, renderer: Renderer, hero: { x: number; y: number }, view: { x: number; y: number; w: number; h: number }): void {
    const map = this.map; if (!map) return;
    const W = map.width * TILE, H = map.height * TILE, d = this.mode.dark;
    this.vignette.alpha = d ? 0.35 + d.alpha * 0.45 : this.mode.outdoor ? 0.22 : 0.4;
    // ---- the dark, with a hole for every lamp ----
    if (d) {
      if (!this.rt || this.rt.width !== W || this.rt.height !== H) { this.rt?.destroy(true); this.rt = RenderTexture.create({ width: W, height: H, resolution: 0.5 }); this.dark.texture = this.rt; }
      this.shade.clear().rect(0, 0, W, H).fill({ color: d.color, alpha: d.alpha });
      const all: (Lamp | null)[] = [...this.lamps, null];
      all.forEach((l, i) => {
        const cut = this.cuts[i], g = this.glows[i];
        const x = l ? l.x : hero.x + 8, y = l ? l.y : hero.y + 14;
        const near = x > view.x - 120 && x < view.x + view.w + 120 && y > view.y - 120 && y < view.y + view.h + 120;
        cut.visible = g.visible = near && (!!l || d.alpha >= 0.5); if (!cut.visible) return;
        const f = l ? 1 + l.flicker * (Math.sin(t * 7.3 + l.seed) * 0.6 + Math.sin(t * 13.1 + l.seed * 2) * 0.4) : 1;
        const r = (l ? l.r : 44 + d.alpha * 18) * f;
        cut.x = x; cut.y = y; cut.width = cut.height = r * 2; cut.alpha = l ? 0.95 : 0.55;
        g.x = x; g.y = y; g.width = g.height = r * (l ? 1.15 : 1.0); g.alpha = (l ? l.glow : 0.06) * Math.min(1, d.alpha * 1.6) * f;
      });
      renderer.render({ container: this.cutter, target: this.rt, clear: true });
    }
    // ---- the air ----
    this.moveMotes(dt, t, view);
    this.drawAir(t, view);
  }

  private add(m: Omit<Mote, "life">): void { if (this.motes.length < 420) this.motes.push({ ...m, life: 0 }); }

  private moveMotes(dt: number, t: number, view: { x: number; y: number; w: number; h: number }): void {
    const inView = ([tx, ty]: [number, number], pad = 2) => tx * TILE > view.x - pad * TILE && tx * TILE < view.x + view.w + pad * TILE && ty * TILE > view.y - pad * TILE && ty * TILE < view.y + view.h + pad * TILE;
    this.spawn += dt;
    const light = this.mode.light, outdoor = this.mode.outdoor && !this.map!.file.world;
    while (this.spawn > 0.05) {
      this.spawn -= 0.05;
      for (const p of this.fires) if (inView(p) && Math.random() < 0.5)
        this.add({ kind: "ember", x: p[0] * TILE + 4 + Math.random() * 8, y: p[1] * TILE + 6, vx: (Math.random() - 0.5) * 6, vy: -14 - Math.random() * 14, max: 1.2 + Math.random() * 1.4 });
      const warm = this.warmWater.filter((p) => inView(p, 0));
      for (let i = 0; i < Math.min(3, warm.length); i++) if (Math.random() < 0.35) {
        const p = warm[Math.floor(Math.random() * warm.length)];
        this.add({ kind: "steam", x: p[0] * TILE + Math.random() * 16, y: p[1] * TILE + Math.random() * 12, vx: 2 + Math.random() * 3, vy: -5 - Math.random() * 4, max: 2.4 + Math.random() * 1.6 });
      }
      const rx = () => view.x + Math.random() * view.w, ry = () => view.y + Math.random() * view.h;
      if (light === "snow") for (let i = 0; i < 3; i++) this.add({ kind: "snow", x: rx(), y: view.y - 4, vx: -4 + Math.random() * 3, vy: 14 + Math.random() * 10, max: view.h / 14 + 2 });
      if (light === "ash" && Math.random() < 0.6) this.add({ kind: "ash", x: rx(), y: view.y - 4, vx: 3 + Math.random() * 4, vy: 6 + Math.random() * 5, max: 8 });
      if (outdoor && (light === "night" || light === "dusk") && this.grass.length && Math.random() < 0.18) {
        const p = this.grass[Math.floor(Math.random() * this.grass.length)];
        if (inView(p, 0)) this.add({ kind: "fly", x: p[0] * TILE + Math.random() * 16, y: p[1] * TILE + Math.random() * 16, vx: 0, vy: 0, max: 3 + Math.random() * 3 });
      }
      if (outdoor && (light === "day" || !light) && Math.random() < 0.12) this.add({ kind: "dust", x: rx(), y: ry(), vx: 3 + Math.random() * 3, vy: -1 + Math.random() * 2, max: 4 + Math.random() * 3 });
    }
    for (const m of this.motes) {
      m.life += dt;
      if (m.kind === "fly") { m.vx += (Math.random() - 0.5) * 40 * dt; m.vy += (Math.random() - 0.5) * 40 * dt; m.vx *= 0.97; m.vy *= 0.97; }
      if (m.kind === "snow" || m.kind === "ash") m.x += Math.sin(t * 1.3 + m.max * 5) * 6 * dt;
      m.x += m.vx * dt; m.y += m.vy * dt;
    }
    this.motes = this.motes.filter((m) => m.life < m.max);
  }

  private drawAir(t: number, view: { x: number; y: number; w: number; h: number }): void {
    const a = this.air.clear(), s = this.sparks.clear();
    // the tint of day, snow or ash
    const tint = this.mode.tint;
    if (tint && this.map) a.rect(0, 0, this.map.width * TILE, this.map.height * TILE).fill({ color: tint.color, alpha: tint.alpha });
    // glints on open water, where the camera is
    const night = !!this.mode.dark && this.mode.dark.alpha > 0.5;
    for (const [tx, ty] of this.water) {
      const x = tx * TILE, y = ty * TILE;
      if (x < view.x - 16 || x > view.x + view.w || y < view.y - 16 || y > view.y + view.h) continue;
      const h = hash(tx, ty), on = Math.sin(t * (1.4 + h) + h * 40);
      if (on > 0.82) a.rect(x + Math.floor(h * 12), y + Math.floor(hash(ty, tx) * 12), 2 + Math.floor(h * 3), 1).fill({ color: night ? 0x9ab0e0 : 0xffffff, alpha: (on - 0.82) * 3.5 });
    }
    for (const m of this.motes) {
      const k = m.life / m.max, fade = Math.min(1, m.life * 4) * (1 - k);
      if (m.kind === "ember") s.rect(m.x, m.y, 1, 1).fill({ color: k < 0.4 ? 0xffe08a : 0xff7a30, alpha: fade });
      else if (m.kind === "fly") s.rect(m.x, m.y, 1, 1).fill({ color: 0xd8ff8a, alpha: fade * (0.5 + 0.5 * Math.sin(t * 6 + m.max * 9)) });
      else if (m.kind === "steam") a.circle(m.x, m.y, 2 + k * 5).fill({ color: 0xf2f4f6, alpha: 0.16 * fade });
      else if (m.kind === "snow") a.rect(m.x, m.y, 1, 1).fill({ color: 0xffffff, alpha: 0.85 });
      else if (m.kind === "ash") a.rect(m.x, m.y, 1, 1).fill({ color: 0x9a948e, alpha: 0.7 * fade });
      else a.rect(m.x, m.y, 1, 1).fill({ color: 0xfff6d8, alpha: 0.35 * fade });
    }
  }
}
