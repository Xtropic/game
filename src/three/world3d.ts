// The explorable world in 3D. Every map is raised from the same tile grid the 2D game uses: walls, rocks and
// furniture stand up as blocks wearing their own pixel art, houses get walls and gabled roofs, trees and tents and
// fires are modelled, water sits low, the cloud sea lies far below, and the world map becomes a landscape with
// real hills and mountains. People are the painted figures where a painting exists, and the pixel sprites
// otherwise, standing upright in the scene. Light follows the story's hour; a tilt-shift lens and bloom finish it.
//
// The explore scene still owns everything that happens (positions, collisions, story); this only draws it.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { HorizontalTiltShiftShader } from "three/examples/jsm/shaders/HorizontalTiltShiftShader.js";
import { VerticalTiltShiftShader } from "three/examples/jsm/shaders/VerticalTiltShiftShader.js";
import { TILE, TILE_DEFS, WorldMap, type MapFile, type TileKind } from "../world/map";
import { bakeMap } from "../art/tiles";
import { hash2 } from "../art/pixel";
import { drawLook, getScale, setScale } from "../battle/art";
import { hasPaintedFig } from "../battle/painted";
import type { Build } from "../art/build";

export type Facing = "down" | "up" | "left" | "right";

/** One thing to stand in the world this frame: a person, a kith, a note on the ground, a barrier. */
const smoothstep = (a: number, b: number, x: number): number => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Where a local map stands on its land's world map, so its surroundings can be raised from the land around it. */
export interface Around { land: MapFile; x: number; y: number }

export interface Fig {
  key: string;
  /** The look id, so a painted figure can be used when there is one. */
  look?: string;
  facing?: Facing;
  /** The pixel sprite's current frame: its canvas and where the frame sits in it. */
  canvas?: CanvasImageSource & { width: number; height: number };
  frame?: { x: number; y: number; w: number; h: number };
  /** Feet, in map pixels. */
  x: number; y: number;
  visible: boolean;
}

// ---------------------------------------------------------------- tables
const LH = 0.7; // one terrace step
/** Things that stand up as blocks, and how tall (in tiles). */
const BLOCK: Partial<Record<TileKind, number>> = {
  wall: 1.5, iwall: 1.7, brick: 1.6, stonewall: 0.9, rock: 1.5, cliff: 1.4, fence: 0.45, hay: 0.6, crate: 0.55, cart: 0.6,
  stall: 0.85, boiler: 1.0, tray: 0.4, bed: 0.32, shelf: 1.25, table: 0.5, well: 0.55, ashrock: 0.6,
};
/** Tall wall-like blocks are cut low where they would hide the floor behind them from the camera. */
const CUTAWAY = new Set<TileKind>(["wall", "iwall", "brick", "stonewall", "rock", "cliff"]);
/** Kinds drawn as models, with plain ground under them. */
const GROUND_SUB: Partial<Record<TileKind, TileKind>> = {
  tree: "grass", drying: "grass", tent: "grass", cloud: "cliff", gate: "path",
  pines: "snow", forest: "plains", cloudwood: "meadow", orchard: "meadow", spire: "meadow", mount: "hills",
};
const WATERY = new Set<TileKind>(["water", "canal"]);
const WORLD_H: Partial<Record<TileKind, number>> = { mount: 2.4, hills: 0.7, snow: 1.0, pines: 0.8, spire: 0.6, pass: 1.2, ashrock: 0.4, terraces: 0.4, cloudwood: 0.3, sea: -0.5, shoal: -0.25, river: -0.3, canal: -0.25, marsh: -0.05, reeds: -0.05, saltpan: -0.02 };

/** Maps that are dark whatever the hour, and maps with a roof over them. */
const UNDER = new Set(["caves", "culvert", "undercroft"]);
const INDOORS = new Set(["home", "surgery", "rooms", "hatchery", "mire", "backroom", "caves", "culvert", "undercroft"]);

interface Mood { sky: [string, string, string] | null; fog: number; sun: number; sunI: number; dir: [number, number, number]; hemiSky: number; hemiGround: number; hemiI: number; windows: number; lamps: number; lantern: number; cloud: number; exposure: number; bloom: number; selfLit: number }
const MOODS: Record<string, Mood> = {
  day: { sky: ["#6f9fd8", "#a9c6e6", "#dfe8f0"], fog: 0xc9d6e4, sun: 0xfff0d8, sunI: 2.6, dir: [-0.6, 1, 0.55], hemiSky: 0xbcd4ff, hemiGround: 0x6a5a40, hemiI: 1.1, windows: 0, lamps: 0.6, lantern: 0, cloud: 0xffffff, exposure: 1, bloom: 0.12, selfLit: 0.22 },
  snow: { sky: ["#9fb4d0", "#d0dcea", "#eef2f6"], fog: 0xe0e8f0, sun: 0xf4f8ff, sunI: 2.2, dir: [-0.4, 1, 0.6], hemiSky: 0xdce8ff, hemiGround: 0x8a8a90, hemiI: 1.3, windows: 0.6, lamps: 0.8, lantern: 0, cloud: 0xffffff, exposure: 1, bloom: 0.15, selfLit: 0.22 },
  ash: { sky: ["#6a6460", "#9a928a", "#bab2a8"], fog: 0x9a928a, sun: 0xe8d8c0, sunI: 1.6, dir: [-0.6, 1, 0.5], hemiSky: 0xa09890, hemiGround: 0x3a3430, hemiI: 0.9, windows: 0, lamps: 1, lantern: 0, cloud: 0xb0aaa4, exposure: 1, bloom: 0.2, selfLit: 0.25 },
  dusk: { sky: ["#34386a", "#c07a80", "#f4b070"], fog: 0xd8a080, sun: 0xffa060, sunI: 2.3, dir: [-1, 0.38, 0.45], hemiSky: 0x9a8ac0, hemiGround: 0x4a3430, hemiI: 1.0, windows: 2.2, lamps: 2.5, lantern: 0, cloud: 0xf4c4b0, exposure: 1.05, bloom: 0.4, selfLit: 0.3 },
  evening: { sky: ["#141020", "#3a2a3a", "#6a4a40"], fog: 0x3a2a30, sun: 0xff9a5a, sunI: 0.7, dir: [-1, 0.5, 0.3], hemiSky: 0x5a4a70, hemiGround: 0x1a1210, hemiI: 0.6, windows: 2.6, lamps: 3.5, lantern: 1.2, cloud: 0x8a7080, exposure: 1.1, bloom: 0.45, selfLit: 0.2 },
  night: { sky: ["#03050f", "#0c1430", "#1a2850"], fog: 0x101a34, sun: 0x8aa4ff, sunI: 0.45, dir: [0.5, 1, -0.3], hemiSky: 0x3a4a90, hemiGround: 0x141020, hemiI: 0.7, windows: 3.2, lamps: 4.5, lantern: 2.2, cloud: 0x52608a, exposure: 1.15, bloom: 0.5, selfLit: 0.12 },
  fire: { sky: ["#1a0604", "#5a1408", "#b04010"], fog: 0x4a1408, sun: 0xff6a20, sunI: 1.2, dir: [0.3, 0.6, 0.8], hemiSky: 0x8a3010, hemiGround: 0x1a0804, hemiI: 0.7, windows: 1.5, lamps: 5, lantern: 0.6, cloud: 0x9a5040, exposure: 1.1, bloom: 0.6, selfLit: 0.2 },
  steam: { sky: null, fog: 0x2a2420, sun: 0xffc090, sunI: 0.5, dir: [0.2, 1, 0.4], hemiSky: 0x8a7a6a, hemiGround: 0x1a1410, hemiI: 0.7, windows: 2, lamps: 4.5, lantern: 0.8, cloud: 0x8a8a8a, exposure: 1.1, bloom: 0.5, selfLit: 0.22 },
  indoor: { sky: null, fog: 0x100c0a, sun: 0xffd8a8, sunI: 0.9, dir: [-0.3, 1, 0.5], hemiSky: 0xffe0c0, hemiGround: 0x3a2a20, hemiI: 1.0, windows: 1.5, lamps: 3.5, lantern: 0, cloud: 0x888888, exposure: 1.05, bloom: 0.3, selfLit: 0.26 },
  under: { sky: null, fog: 0x04050a, sun: 0x9ab0e0, sunI: 0.7, dir: [0.2, 1, 0.3], hemiSky: 0x6a7aa0, hemiGround: 0x2a2018, hemiI: 1.5, windows: 1, lamps: 4.5, lantern: 3, cloud: 0x333333, exposure: 1.35, bloom: 0.45, selfLit: 0.1 },
};

// ---------------------------------------------------------------- helpers
class Quads {
  pos: number[] = []; uv: number[] = []; idx: number[] = [];
  quad(p: number[][], uv: number[][]): void {
    const b = this.pos.length / 3;
    p.forEach((v) => this.pos.push(...v)); uv.forEach((u) => this.uv.push(...u));
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  get empty(): boolean { return !this.idx.length; }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx); g.computeVertexNormals();
    return g;
  }
}
function pixelTex(c: HTMLCanvasElement, repeat = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function single(k: TileKind, w = 1, h = 1, burnt = false): HTMLCanvasElement {
  const rows = Array.from({ length: h }, () => "a".repeat(w));
  return bakeMap(new WorldMap({ id: "t", name: "t", legend: { a: k }, rows, entities: [] }), { burnt });
}
function skyTex(c3: [string, string, string]): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 4; c.height = 256; const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, c3[0]); gr.addColorStop(0.6, c3[1]); gr.addColorStop(1, c3[2]);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function cloudCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d")!;
  g.fillStyle = "#c3d2e2"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = hash2(i, 1) * 256, y = hash2(i, 2) * 256, r = 18 + hash2(i, 3) * 40;
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, hash2(i, 4) > 0.5 ? "rgba(244,248,252,0.9)" : "rgba(159,180,204,0.6)"); gr.addColorStop(1, "rgba(195,210,226,0)");
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  return c;
}
function averageColour(c: HTMLCanvasElement): THREE.Color {
  const s = document.createElement("canvas"); s.width = s.height = 1; const g = s.getContext("2d")!;
  g.drawImage(c, 0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(d[0] / 255, d[1] / 255, d[2] / 255, THREE.SRGBColorSpace);
}
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), e3 = new THREE.Euler();

interface Lamp { x: number; y: number; z: number; color: number; kind: "fire" | "window" | "glow" }
interface Shown3 { obj: THREE.Group; body: THREE.Mesh; mat: THREE.MeshStandardMaterial; source: unknown; rig: { cv: HTMLCanvasElement; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; look: string; due: number; seed: number; painted: boolean } | null; face: 1 | -1; lastX: number; lastY: number; phase: number; moving: number; spd: number; seen: boolean; w: number; h: number }
/** People and kith in the world are drawn with the same rig as in battle, into a canvas of this many stage units. */
const RIG = { w: 96, h: 66, footX: 48, footY: 63, K: 4, perTile: 33.5 };
/** Things on the map that aren't people or kith: they stay as their pixel sprites. */
const PROPS = new Set(["note", "glint"]);
/** Foes keep the drawn figure in the world like every other NPC; the party keep their own paintings. */
const NPC_PAINTED = new Set(["warden", "archer", "cartwarden"]);

// ---------------------------------------------------------------- the renderer
export class World3D {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 0.1, 400);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private tiltH: ShaderPass; private tiltV: ShaderPass;
  private sun = new THREE.DirectionalLight(0xffffff, 2);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  private lantern = new THREE.PointLight(0xffc070, 0, 6, 2);
  private pool: THREE.PointLight[] = [];
  private level = new THREE.Group();
  private figs = new THREE.Group();
  private map!: WorldMap;
  private world = false;
  private heights: Float32Array = new Float32Array(0); // world map: vertex heights (w+1) x (h+1)
  private rowLevel: number[] = [];
  private lamps: Lamp[] = [];
  private windowMat = new THREE.MeshStandardMaterial({ color: 0x1d2a3a, emissive: 0xffb45a, emissiveIntensity: 0, roughness: 0.3 });
  private flameMat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  private flames: THREE.Mesh[] = [];
  private houses: { group: THREE.Group; mats: THREE.Material[]; x0: number; x1: number; z0: number; z1: number }[] = [];
  private leaves: { mesh: THREE.InstancedMesh; base: { x: number; y: number; z: number; s: number; ph: number }[] } | null = null;
  private cloudTex: THREE.CanvasTexture | null = null;
  private puffs: { g: THREE.Group; v: number }[] = [];
  private puffMat = new THREE.MeshLambertMaterial({ color: 0xf2f5fa, transparent: true, opacity: 0.92 });
  private sea: THREE.Mesh | null = null;
  private fogMesh: THREE.Mesh | null = null;
  private hazard: THREE.InstancedMesh | null = null;
  private hazardKey = "";
  private hazardMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
  private shown = new Map<string, Shown3>();
  private texCache = new WeakMap<object, THREE.Texture>();
  private moodName = "day";
  private mood: Mood = MOODS.day;
  private skyCache: Record<string, THREE.Texture> = {};
  private focus = new THREE.Vector3();
  private focusSet = false;
  private lampCheck = 0;
  private hero = { x: 0, y: 0, face: 1 as 1 | -1 };
  private zoomMul = 1;
  private lastFrame = 0;
  private width = 1; private height = 1;

  get moodNow(): string { return this.moodName; }

  static available(): boolean {
    // automated tests drive the flat view (software WebGL is too slow); ?3d forces it on
    if (typeof navigator !== "undefined" && navigator.webdriver && !location.search.includes("3d")) return false;
    try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
  }

  constructor(host: HTMLElement) {
    // phones and tablets start a step lower (sharp enough on a small screen, and kinder to the battery)
    this.quality = quality();
    this.renderer = new THREE.WebGLRenderer({ antialias: this.quality === 2, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = this.quality === 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.canvas = this.renderer.domElement;
    Object.assign(this.canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
    host.insertBefore(this.canvas, host.firstChild);
    this.scene.add(this.level, this.figs);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(this.quality === 2 ? 2048 : 1024, this.quality === 2 ? 2048 : 1024); this.sun.shadow.bias = -0.0008; this.sun.shadow.normalBias = 0.02;
    Object.assign(this.sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 90 });
    this.scene.add(this.sun, this.sun.target, this.hemi, this.lantern);
    for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xffa850, 0, 6, 1.6); this.pool.push(l); this.scene.add(l); }
    this.scene.fog = new THREE.Fog(0xc9d6e4, 30, 90);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.6, 0.82); this.composer.addPass(this.bloom);
    this.tiltH = new ShaderPass(HorizontalTiltShiftShader); this.tiltV = new ShaderPass(VerticalTiltShiftShader);
    this.tiltH.uniforms.r.value = this.tiltV.uniforms.r.value = 0.55;
    this.composer.addPass(this.tiltH); this.composer.addPass(this.tiltV); this.composer.addPass(new OutputPass());
    addEventListener("wheel", (e) => { this.zoomMul = Math.max(0.55, Math.min(1.8, this.zoomMul * (e.deltaY > 0 ? 1.08 : 1 / 1.08))); }, { passive: true });
    // two fingers pinch to zoom on a touch screen
    const fingers = new Map<number, [number, number]>(); let pinch = 0, pinchZoom = 1;
    const spread = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    addEventListener("pointerdown", (e) => { if (e.pointerType !== "touch") return; fingers.set(e.pointerId, [e.clientX, e.clientY]); if (fingers.size === 2) { pinch = spread(); pinchZoom = this.zoomMul; } }, { capture: true, passive: true });
    addEventListener("pointermove", (e) => { if (!fingers.has(e.pointerId)) return; fingers.set(e.pointerId, [e.clientX, e.clientY]); if (fingers.size === 2 && pinch > 20 && this.canvas.style.visibility !== "hidden") this.zoomMul = Math.max(0.55, Math.min(1.8, pinchZoom * (pinch / Math.max(20, spread())))); }, { capture: true, passive: true });
    const lift = (e: PointerEvent) => { fingers.delete(e.pointerId); if (fingers.size < 2) pinch = 0; };
    addEventListener("pointerup", lift, { capture: true, passive: true }); addEventListener("pointercancel", lift, { capture: true, passive: true });
    this.applyQuality();
    // hide when no one draws (a battle or another screen is on top)
    const watch = () => { this.canvas.style.visibility = performance.now() - this.lastFrame < 250 ? "visible" : "hidden"; requestAnimationFrame(watch); };
    requestAnimationFrame(watch);
  }

  /** 2 full (bloom, soft shadows, tilt-shift, sharp), 1 phone (lighter shadows, lower resolution), 0 lowest
   *  (no glow or tilt-shift, plain shadows, lowest resolution). A slow device steps itself down. */
  private quality: 0 | 1 | 2 = 2;
  private slow = 0; private frames = 0;
  private applyQuality(): void {
    const q = this.quality, dpr = devicePixelRatio || 1;
    this.renderer.setPixelRatio(Math.min(dpr, q === 2 ? 1.75 : q === 1 ? 1.25 : 1));
    this.bloom.enabled = q >= 1; this.tiltH.enabled = this.tiltV.enabled = q >= 1;
    this.renderer.shadowMap.enabled = q >= 1; this.sun.castShadow = q >= 1;
    if (this.width) this.resize(this.width, this.height);
  }
  /** Watches how long frames take; a device that can't keep up gets a lighter look (once per step, never back up). */
  private pace(dt: number): void {
    if (this.quality === 0 || dt <= 0 || dt > 0.5) return;
    this.frames++;
    this.slow = this.slow * 0.97 + (dt > 1 / 32 ? 1 : 0) * 0.03;
    if (this.frames > 180 && this.slow > 0.6) { this.quality = (this.quality - 1) as 0 | 1; this.frames = 0; this.slow = 0; this.applyQuality(); try { localStorage.setItem("lull.q3d", String(this.quality)); } catch { /* fine */ } }
  }

  resize(w: number, h: number): void {
    this.width = w; this.height = h;
    this.renderer.setSize(w, h, false); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.tiltH.uniforms.h.value = 2 / w; this.tiltV.uniforms.v.value = 2 / h;
  }

  // ------------------------------------------------------------ building a map
  setMap(map: WorldMap, opts: { burnt?: boolean; around?: Around } = {}): void {
    this.clear();
    this.map = map; this.world = !!map.file.world;
    this.focusSet = false; this.around = opts.around ?? null;
    if (this.world) this.buildWorld(); else this.buildLocal(!!opts.burnt);
    this.applyMood();
  }

  private clear(): void {
    const dispose = (o: THREE.Object3D) => o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mt of mats) { if (mt === this.windowMat || mt === this.flameMat || mt === this.puffMat || mt === this.hazardMat) continue; (mt as THREE.MeshStandardMaterial).map?.dispose(); mt.dispose(); }
    });
    for (const c of [...this.level.children]) { dispose(c); this.level.remove(c); }
    for (const [k, s] of [...this.shown]) this.drop(k, s);
    this.lamps = []; this.flames = []; this.houses = []; this.leaves = null; this.cloudTex = null; this.puffs = []; this.sea = null; this.fogMesh = null; this.hazard = null; this.hazardKey = "";
  }

  private kind(x: number, y: number): TileKind | null { return this.map.kindAt(x, y); }
  private walkable(x: number, y: number): boolean { const k = this.kind(x, y); return k !== null && !TILE_DEFS[k].solid && k !== "cloud"; }

  /** Height of the walkable ground at a tile's north (fz=0) and south (fz=1) edge, before blocks. Null over the void. */
  private groundAt(x: number, y: number, fz: number): number | null {
    const k = this.kind(x, y);
    if (k === null || k === "cloud") return null;
    const L = (this.rowLevel[y] ?? 0) * LH;
    if (k === "terrace") return L + LH;
    if ((k === "steps" || k === "gate") && this.rowIsTerrace(y)) return L + LH * (1 - fz);
    if (WATERY.has(k)) return L - 0.35;
    return L;
  }
  private terraceRows = new Set<number>();
  private rowIsTerrace(y: number): boolean { return this.terraceRows.has(y); }
  private blockH(x: number, y: number): number {
    const k = this.kind(x, y); if (!k) return 0;
    const h = BLOCK[k]; if (h === undefined) return 0;
    if (CUTAWAY.has(k) && this.walkable(x, y - 1)) return Math.min(h, k === "cliff" || k === "rock" ? 0.45 : 0.3);
    return h;
  }

  /** Feet height at a point in tiles. */
  groundY(u: number, v: number): number {
    if (this.world) {
      const W = this.map.width + 1, x = Math.max(0, Math.min(this.map.width - 0.001, u)), y = Math.max(0, Math.min(this.map.height - 0.001, v));
      const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, H = this.heights;
      const a = H[iy * W + ix], b = H[iy * W + ix + 1], c = H[(iy + 1) * W + ix], d = H[(iy + 1) * W + ix + 1];
      return Math.max(0, (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy);
    }
    const x = Math.floor(u), y = Math.floor(v);
    return this.groundAt(x, y, v - y) ?? 0;
  }

  private buildLocal(burnt: boolean): void {
    const map = this.map, W = map.width, H = map.height, f = map.file;
    // terrace rows lift everything behind them
    this.terraceRows.clear();
    for (let y = 0; y < H; y++) if ([...f.rows[y]].filter((ch) => ["terrace", "steps", "gate"].includes(f.legend[ch])).length >= 4 && [...f.rows[y]].some((ch) => f.legend[ch] === "terrace")) this.terraceRows.add(y);
    this.rowLevel = [];
    for (let y = 0; y < H; y++) { let n = 0; for (let r = y + 1; r < H; r++) if (this.terraceRows.has(r)) n++; this.rowLevel[y] = n; }
    const under = UNDER.has(f.id), indoors = INDOORS.has(f.id), hasCloudMap = Object.values(f.legend).includes("cloud");

    // ground texture: the 2D tiles with what now stands up painted out
    const groundFile: MapFile = { ...f, legend: Object.fromEntries(Object.entries(f.legend).map(([ch, k]) => [ch, GROUND_SUB[k] ?? k])) };
    const groundCanvas = bakeMap(new WorldMap(groundFile), { burnt });
    const groundTex = pixelTex(groundCanvas);
    // houses: roof tiles with the wall and door row in front
    const houseTiles = new Set<number>();
    const houses = this.components(new Set<TileKind>(["roof"]));
    for (const comp of houses) for (const c of [...comp]) {
      let y = c.y + 1; while (["wall", "door"].includes(this.kind(c.x, y) ?? "") && y <= c.y + 2) { if (!comp.some((d) => d.x === c.x && d.y === y)) comp.push({ x: c.x, y }); y++; }
    }
    for (const comp of houses) for (const c of comp) houseTiles.add(c.y * W + c.x);

    // side atlas: one cell per kind, for the faces of blocks and banks
    const kinds = [...new Set<TileKind>([...Object.values(f.legend), "cliff", "terrace", "rock", "stonewall"] as TileKind[])];
    const atlas = document.createElement("canvas"); atlas.width = kinds.length * TILE; atlas.height = TILE;
    const ag = atlas.getContext("2d")!; ag.imageSmoothingEnabled = false;
    kinds.forEach((k, i) => ag.drawImage(single(k, 1, 1, burnt && !["cloud", "water", "cliff"].includes(k)), i * TILE, 0));
    const cell = (k: TileKind) => { const i = Math.max(0, kinds.indexOf(k)); return [(i + 0.02) / kinds.length, (i + 0.98) / kinds.length]; };
    const sideKind = (k: TileKind | null, blocky: boolean): TileKind => (blocky && k ? k : k === "terrace" ? "terrace" : under || hasCloudMap ? "rock" : k === "cobble" || k === "wetfloor" || k === "plank" || k === "cavefloor" ? "stonewall" : "cliff");

    const tops = new Quads(), sides = new Quads();
    const topH = (x: number, y: number, fz: number): number | null => {
      const g = this.groundAt(x, y, fz); if (g === null) return null;
      if (houseTiles.has(y * W + x)) return g;
      return g + this.blockH(x, y);
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = topH(x, y, 0), s = topH(x, y, 1);
      if (n === null || s === null) continue;
      const u0 = x / W, u1 = (x + 1) / W, v0 = 1 - y / H, v1 = 1 - (y + 1) / H;
      tops.quad([[x, n, y], [x, s, y + 1], [x + 1, s, y + 1], [x + 1, n, y]], [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]);
      const k = this.kind(x, y), blocky = this.blockH(x, y) > 0 && !houseTiles.has(y * W + x);
      const edges: [number, number, number[], number[], number, number, number, number][] = [
        [0, 1, [x, y + 1], [x + 1, y + 1], s, s, 0, 0],
        [0, -1, [x + 1, y], [x, y], n, n, 1, 1],
        [1, 0, [x + 1, y + 1], [x + 1, y], s, n, 1, 0],
        [-1, 0, [x, y], [x, y + 1], n, s, 0, 1],
      ];
      for (const [dx, dy, a, b, ha, hb, fa, fb] of edges) {
        const nx = x + dx, ny = y + dy;
        const la0 = topH(nx, ny, fa), lb0 = topH(nx, ny, fb);
        const open = la0 === null || lb0 === null;
        const base = under || indoors ? -0.2 : -4;
        const la = open ? base : la0!, lb = open ? base : lb0!;
        if (ha - la < 0.01 && hb - lb < 0.01) continue;
        const [c0, c1] = cell(sideKind(k, blocky));
        const span = Math.max(ha - la, hb - lb), vTop = 0.98, vBot = Math.max(0.02, 0.98 - Math.min(1, span) * 0.96);
        sides.quad([[a[0], ha, a[1]], [a[0], la, a[1]], [b[0], lb, b[1]], [b[0], hb, b[1]]], [[c0, vTop], [c0, vBot], [c1, vBot], [c1, vTop]]);
      }
    }
    this.add(new THREE.Mesh(tops.build(), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, side: THREE.DoubleSide })), false, true);
    if (!sides.empty) this.add(new THREE.Mesh(sides.build(), new THREE.MeshStandardMaterial({ map: pixelTex(atlas), roughness: 1, side: THREE.DoubleSide })), true, true);

    // what lies around the map: the cloud sea, or more of the same ground fading into the haze
    const hasCloud = Object.values(f.legend).includes("cloud");
    if (this.around && !under && !INDOORS.has(f.id)) this.surround(this.around, W, H, burnt);
    else if (hasCloud) this.cloudSea(W, H);
    else if (!under && !INDOORS.has(f.id)) {
      const ring = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: averageColour(groundCanvas).multiplyScalar(0.8), roughness: 1 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(W / 2, -0.04, H / 2); ring.receiveShadow = true; this.level.add(ring);
    }

    // water
    const waterMat = new THREE.MeshStandardMaterial({ color: under ? 0x2a5a80 : 0x3a7ab8, emissive: under ? 0x0e2a44 : 0x1e5a8a, emissiveIntensity: 0.7, roughness: 0.7, metalness: 0, transparent: true, opacity: 0.86 });
    const wq = new Quads();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (WATERY.has(this.kind(x, y)!)) { const h = (this.rowLevel[y] ?? 0) * LH - 0.1; wq.quad([[x, h, y], [x, h, y + 1], [x + 1, h, y + 1], [x + 1, h, y]], [[0, 0], [0, 1], [1, 1], [1, 0]]); }
    if (!wq.empty) { const w = new THREE.Mesh(wq.build(), waterMat); w.receiveShadow = true; this.level.add(w); }

    this.buildHouses(houses, burnt);
    this.buildModels(burnt, under);
  }

  private add(m: THREE.Mesh, cast: boolean, receive: boolean): THREE.Mesh { m.castShadow = cast; m.receiveShadow = receive; this.level.add(m); return m; }

  private components(set: Set<TileKind>): { x: number; y: number }[][] {
    const W = this.map.width, H = this.map.height, seen = new Set<number>(), out: { x: number; y: number }[][] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (seen.has(y * W + x) || !set.has(this.kind(x, y)!)) continue;
      const comp: { x: number; y: number }[] = [], st = [[x, y]]; seen.add(y * W + x);
      while (st.length) {
        const [cx, cy] = st.pop()!; comp.push({ x: cx, y: cy });
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && !seen.has(ny * W + nx) && set.has(this.kind(nx, ny)!)) { seen.add(ny * W + nx); st.push([nx, ny]); } }
      }
      out.push(comp);
    }
    return out;
  }

  private gable(into: THREE.Group, x0: number, x1: number, z0: number, z1: number, base: number, rise: number, mat: THREE.Material, endMat: THREE.Material): void {
    const o = 0.18, zm = (z0 + z1) / 2, X0 = x0 - o, X1 = x1 + o, Z0 = z0 - o, Z1 = z1 + o, top = base + rise;
    const q = new Quads(), w = X1 - X0, d = (zm - Z0) * 1.3;
    q.quad([[X0, base, Z1], [X1, base, Z1], [X1, top, zm], [X0, top, zm]], [[0, 0], [w, 0], [w, d], [0, d]]);
    q.quad([[X1, base, Z0], [X0, base, Z0], [X0, top, zm], [X1, top, zm]], [[0, 0], [w, 0], [w, d], [0, d]]);
    const r = new THREE.Mesh(q.build(), mat); r.castShadow = r.receiveShadow = true; into.add(r);
    const tri = new THREE.BufferGeometry();
    tri.setAttribute("position", new THREE.Float32BufferAttribute([x0, base, z1, x0, base, z0, x0, top - 0.05, zm, x1, base, z0, x1, base, z1, x1, top - 0.05, zm], 3));
    tri.computeVertexNormals();
    const t = new THREE.Mesh(tri, endMat); t.castShadow = t.receiveShadow = true; into.add(t);
  }

  private buildHouses(houses: { x: number; y: number }[][], burnt: boolean): void {
    const roofT = pixelTex(single("roof", 2, 2, burnt), true); roofT.repeat.set(0.5, 0.5);
    const doorT = pixelTex(single("door", 1, 1, burnt));
    for (const comp of houses) {
      const xs = comp.map((c) => c.x), ys = comp.map((c) => c.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...ys), z1 = Math.max(...ys) + 1;
      const base = (this.rowLevel[z1 - 1] ?? 0) * LH, wallH = 1.35;
      const g = new THREE.Group();
      const plaster = new THREE.MeshStandardMaterial({ color: burnt ? 0x3a3430 : 0xe8dcc0, roughness: 0.9 });
      const wood = new THREE.MeshStandardMaterial({ color: burnt ? 0x1a1410 : 0x5e4029, roughness: 0.9 });
      const roof = new THREE.MeshStandardMaterial({ map: roofT, roughness: 0.8, side: THREE.DoubleSide });
      const ends = new THREE.MeshStandardMaterial({ color: burnt ? 0x2a2420 : 0xd6c8a8, roughness: 0.9, side: THREE.DoubleSide });
      const door = new THREE.MeshStandardMaterial({ map: doorT, roughness: 0.9 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, wallH, z1 - z0), plaster);
      box.position.set((x0 + x1) / 2, base + wallH / 2, (z0 + z1) / 2); box.castShadow = box.receiveShadow = true; g.add(box);
      for (const cx of [x0, x1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, wallH, 0.12), wood); p.position.set(cx, base + wallH / 2, z1); p.castShadow = true; g.add(p); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.1, 0.1, 0.1), wood); beam.position.set((x0 + x1) / 2, base + wallH, z1); g.add(beam);
      this.gable(g, x0, x1, z0, z1, base + wallH, Math.min(1.3, 0.45 + (z1 - z0) * 0.25), roof, ends);
      for (let x = x0; x < x1; x++) {
        if (this.kind(x, z1 - 1) === "door") {
          const d = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.0), door); d.position.set(x + 0.5, base + 0.5, z1 + 0.012); g.add(d);
          this.lamps.push({ x: x + 0.5, y: base + 1.15, z: z1 + 0.45, color: 0xffa850, kind: "window" });
        } else if ((x * 7 + z1) % 2 === 0 || x1 - x0 <= 3) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.38), this.windowMat); win.position.set(x + 0.5, base + 0.82, z1 + 0.012); g.add(win);
        }
      }
      for (const sx of [x0 - 0.012, x1 + 0.012]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.36), this.windowMat); win.position.set(sx, base + 0.82, (z0 + z1) / 2); win.rotation.y = Math.PI / 2; g.add(win); }
      this.level.add(g);
      this.houses.push({ group: g, mats: [plaster, wood, roof, ends, door], x0, x1, z0, z1 });
    }
  }

  private buildModels(burnt: boolean, under: boolean): void {
    const W = this.map.width, H = this.map.height, L = (y: number) => (this.rowLevel[y] ?? 0) * LH;
    const wood = new THREE.MeshStandardMaterial({ color: burnt ? 0x1a1410 : 0x5e4029, roughness: 0.9 });
    const trees: { x: number; y: number; z: number; s: number }[] = [];
    // drying sheds and tents
    for (const comp of this.components(new Set<TileKind>(["drying", "ladder"]))) {
      if (!comp.some((c) => this.kind(c.x, c.y) === "drying")) continue;
      const xs = comp.map((c) => c.x), ys = comp.map((c) => c.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...ys), z1 = Math.max(...ys) + 1, base = L(z1 - 1), postH = 1.5;
      const g = new THREE.Group();
      for (let px = x0; px <= x1 + 0.01; px += (x1 - x0) / 2) for (const pz of [z0, z1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, postH, 0.14), wood); p.position.set(px, base + postH / 2, pz); p.castShadow = true; g.add(p); }
      for (let r = 0; r < 3; r++) for (let z = z0 + 0.6; z < z1 - 0.3; z += 0.8) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 0.4, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: burnt ? 0x222020 : [0x6c4f7c, 0x8d6aa0, 0x5a4468][r], roughness: 1 }));
        rack.position.set((x0 + x1) / 2, base + 0.35 + r * 0.38, z); rack.castShadow = rack.receiveShadow = true; g.add(rack);
      }
      const dryT = pixelTex(single("drying", 2, 2, burnt), true); dryT.repeat.set(0.5, 0.5);
      this.gable(g, x0, x1, z0, z1, base + postH, 0.8, new THREE.MeshStandardMaterial({ map: dryT, roughness: 0.9, side: THREE.DoubleSide }), wood);
      this.level.add(g);
    }
    for (const comp of this.components(new Set<TileKind>(["tent"]))) {
      const xs = comp.map((c) => c.x), ys = comp.map((c) => c.y);
      const x0 = Math.min(...xs) + 0.08, x1 = Math.max(...xs) + 0.92, z0 = Math.min(...ys) + 0.08, z1 = Math.max(...ys) + 0.92, base = L(Math.max(...ys));
      const g = new THREE.Group(), cloth = new THREE.MeshStandardMaterial({ color: burnt ? 0x2a2622 : [0xcfc0a0, 0xb8a888, 0xa8b090][(x0 * 3 + z0) % 3 | 0], roughness: 1, side: THREE.DoubleSide });
      this.gable(g, x0 + 0.18, x1 - 0.18, z0 + 0.18, z1 - 0.18, base, 1.15, cloth, new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 1, side: THREE.DoubleSide }));
      this.level.add(g);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = this.kind(x, y), b = L(y);
      if (k === "tree") { const r = (i: number) => hash2(x * 13 + i, y * 7 + i * 3); trees.push({ x: x + 0.5 + (r(1) - 0.5) * 0.3, y: b, z: y + 0.5 + (r(2) - 0.5) * 0.3, s: 0.85 + r(3) * 0.35 }); }
      else if (k === "campfire" || k === "fire") {
        const big = k === "fire";
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 5, 10), new THREE.MeshStandardMaterial({ color: 0x5a5450, roughness: 1, flatShading: true }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(x + 0.5, b + 0.04, y + 0.5); this.add(ring, true, true);
        for (let i = 0; i < (big ? 3 : 2); i++) {
          const fl = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.24 : 0.16, big ? 0.9 : 0.55, 6), this.flameMat);
          fl.position.set(x + 0.5 + (i - 0.5) * 0.12, b + (big ? 0.45 : 0.28), y + 0.5 + (i % 2) * 0.08); this.level.add(fl); this.flames.push(fl);
        }
        this.lamps.push({ x: x + 0.5, y: b + 0.7, z: y + 0.5, color: big ? 0xff7a24 : 0xffa040, kind: "fire" });
      } else if (k === "boiler") {
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ color: 0xff8a3a }));
        glow.position.set(x + 0.5, b + 0.35, y + 1.01); this.level.add(glow);
        this.lamps.push({ x: x + 0.5, y: b + 0.8, z: y + 1.3, color: 0xff8a3a, kind: "fire" });
      } else if (k === "cave" && !under) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), new THREE.MeshStandardMaterial({ color: 0x4a4239, roughness: 1, flatShading: true }));
        rock.scale.set(1.1, 0.9, 0.8); rock.position.set(x + 0.5, b + 0.35, y + 0.25); this.add(rock, true, true);
        const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x0b0806 }));
        mouth.position.set(x + 0.5, b + 0.02, y + 0.9); this.level.add(mouth);
      } else if (k === "cave" && under) {
        this.lamps.push({ x: x + 0.5, y: b + 0.6, z: y + 0.5, color: 0xb8c8ff, kind: "glow" });
      } else if (k === "gate") {
        const g = new THREE.Group(), open = this.map.open.has("gate");
        for (const sx of [-0.5, 0.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 0.16), wood); p.position.set(sx, 0.85, 0); g.add(p); }
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.18), wood); top.position.y = 1.7; g.add(top);
        if (!open) for (let i = 0; i < 5; i++) { const slat = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 0.05), wood); slat.position.set(-0.4 + i * 0.2, 0.6, 0); g.add(slat); }
        g.position.set(x + 0.5, b, y + 0.7); g.traverse((o) => { o.castShadow = true; }); this.level.add(g);
      } else if (k === "door" || k === "innerdoor") {
        // a lintel over a doorway in a wall, so the wall runs on above the opening
        const hl = Math.max(this.blockH(x - 1, y), this.blockH(x + 1, y));
        if (hl > 1) { const lin = new THREE.Mesh(new THREE.BoxGeometry(1, hl - 1.1, 1), new THREE.MeshStandardMaterial({ color: 0x6e342a, roughness: 1 })); lin.position.set(x + 0.5, b + 1.1 + (hl - 1.1) / 2, y + 0.5); this.add(lin, true, true); }
        if (!this.isHouseDoor(x, y)) this.lamps.push({ x: x + 0.5, y: b + 1.0, z: y + 0.9, color: 0xffb060, kind: "window" });
      }
    }
    trees.push(...this.aroundTrees); this.aroundTrees = [];
    if (trees.length) this.plantTrees(trees, burnt);
    // the duskwort beds: low round clumps
    const moss: { x: number; y: number }[] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.kind(x, y) === "moss") moss.push({ x, y });
    if (moss.length && !burnt) this.scatter(moss, 9, new THREE.IcosahedronGeometry(0.11, 0), [0x6c4f7c, 0x8d6aa0, 0x5a4468, 0x9a7ab0], [0.45, 0.5], true);
    const grass: { x: number; y: number }[] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = this.kind(x, y); if (k === "grass" || k === "tree" || k === "flowers") grass.push({ x, y }); }
    if (grass.length && !burnt) { const bl = new THREE.ConeGeometry(0.035, 0.2, 3); bl.translate(0, 0.1, 0); this.scatter(grass, 10, bl, [0x5e8846, 0x6f9a52, 0x86b064, 0x4c7038], [0.6, 0.9], false, [0xf0d264, 0xece6da, 0xd48cb8]); }
  }

  private isHouseDoor(x: number, y: number): boolean { return this.houses.some((h) => x >= h.x0 && x < h.x1 && y >= h.z0 && y < h.z1); }

  private scatter(tiles: { x: number; y: number }[], per: number, geo: THREE.BufferGeometry, colours: number[], hs: [number, number], flat: boolean, flowers?: number[]): void {
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: flat }), tiles.length * per);
    tiles.forEach((t, i) => { for (let j = 0; j < per; j++) {
      const r = (k: number) => hash2(t.x * 41 + j * 7 + k, t.y * 23 + k * 5);
      const fl = !!flowers && r(9) > 0.93, base = this.groundAt(t.x, t.y, 0.5) ?? 0;
      q4.setFromEuler(e3.set((r(3) - 0.5) * 0.5, r(4) * 6, (r(5) - 0.5) * 0.5));
      m4.compose(v3.set(t.x + r(1), base, t.y + r(2)), q4, new THREE.Vector3(fl ? 1.6 : flat ? 0.8 + r(8) * 0.6 : 1, (fl ? 0.9 : hs[0] + r(6) * hs[1]), fl ? 1.6 : flat ? 0.8 + r(7) * 0.6 : 1));
      mesh.setMatrixAt(i * per + j, m4); mesh.setColorAt(i * per + j, new THREE.Color(fl ? flowers![Math.floor(r(7) * flowers!.length)] : colours[Math.floor(r(8) * colours.length)]));
    } });
    mesh.receiveShadow = true; this.level.add(mesh);
  }

  private plantTrees(trees: { x: number; y: number; z: number; s: number; kind?: "pine" | "round" | "orchard" | "cloud" }[], burnt: boolean): void {
    const BLOBS = 3;
    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 1, 6); trunkGeo.translate(0, 0.5, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: burnt ? 0x141010 : 0x5e4029, roughness: 0.9 }), trees.length);
    const leafGeo = new THREE.IcosahedronGeometry(0.5, 1);
    const pines = trees.filter((t) => t.kind === "pine"), rounds = trees.filter((t) => t.kind !== "pine");
    const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), Math.max(1, rounds.length * BLOBS));
    const LEAF = burnt ? [0x1a1614, 0x24201c] : [0x2f5a2c, 0x3f7438, 0x558f48, 0x4c6e3a];
    const base: { x: number; y: number; z: number; s: number; ph: number }[] = [];
    trees.forEach((t, i) => { m4.compose(v3.set(t.x, t.y, t.z), q4.identity(), new THREE.Vector3(t.s, 0.8 * t.s + (t.kind === "pine" ? 0.2 : 0), t.s)); trunks.setMatrixAt(i, m4); });
    rounds.forEach((t, i) => {
      const r = (k: number) => hash2(Math.floor(t.x * 13) + k, Math.floor(t.z * 7) + k * 3), h = 0.8 * t.s;
      const pal = t.kind === "orchard" ? [0x6a9a40, 0x7aaa48, 0xc84a3a] : t.kind === "cloud" ? [0x9ab8a8, 0xb8d0c4, 0x8aa898] : LEAF;
      for (let b = 0; b < BLOBS; b++) {
        const s = (b === 0 ? 0.95 : 0.7) * (0.85 + r(4 + b) * 0.35) * t.s;
        base.push({ x: t.x + (b === 0 ? 0 : (r(7 + b) - 0.5) * 0.7 * t.s), y: t.y + h + (b === 0 ? 0.35 : 0.05 + r(9 + b) * 0.4) * t.s, z: t.z + (b === 0 ? 0 : (r(11 + b) - 0.5) * 0.6 * t.s), s, ph: r(15 + b) * 6.28 });
        leaves.setColorAt(i * BLOBS + b, new THREE.Color(pal[Math.floor(r(20 + b) * pal.length)]));
      }
    });
    trunks.castShadow = leaves.castShadow = true; trunks.receiveShadow = leaves.receiveShadow = true;
    this.level.add(trunks);
    if (rounds.length) { this.level.add(leaves); this.leaves = { mesh: leaves, base }; }
    if (pines.length) {
      const cone = new THREE.ConeGeometry(0.42, 1.2, 7); cone.translate(0, 0.6, 0);
      const pm = new THREE.InstancedMesh(cone, new THREE.MeshStandardMaterial({ color: burnt ? 0x1a1614 : 0x2a4a34, roughness: 0.9, flatShading: true }), pines.length * 2);
      pines.forEach((t, i) => { for (let j = 0; j < 2; j++) { m4.compose(v3.set(t.x, t.y + 0.35 * t.s + j * 0.45 * t.s, t.z), q4.identity(), new THREE.Vector3(t.s * (1 - j * 0.3), t.s * (1 - j * 0.25), t.s * (1 - j * 0.3))); pm.setMatrixAt(i * 2 + j, m4); } });
      pm.castShadow = pm.receiveShadow = true; this.level.add(pm);
    }
  }

  /**
   * The country around a town: the cells of the world map around its place, each blown up to S local tiles, raised by
   * the same heights the world map uses (higher here, since a local tile is far smaller), with woods, water and the
   * nearby towns on it. It eases down to just under the town's own ground so the town sits in it, not on a plinth.
   */
  private surround(a: Around, W: number, H: number, burnt: boolean): void {
    const S = 6, R = 11, N = R * 2 + 1, rows = a.land.rows, legend = a.land.legend;
    const kindAt = (wx: number, wy: number): TileKind => {
      const y = Math.max(0, Math.min(rows.length - 1, wy)), r = rows[y], x = Math.max(0, Math.min(r.length - 1, wx));
      const k = legend[r[x]] ?? "plains"; return k === "cloud" ? "meadow" : k;
    };
    // the ground's picture: each world cell painted as S x S local tiles in the town's own tile art, so the
    // country around reads at the same scale as the town (roads run as paths between neighbouring road cells)
    const ROADY = new Set<TileKind>(["road", "pass", "bridge", "townground"]);
    const localKind = (wx: number, wy: number, sx: number, sy: number): TileKind => {
      const k = kindAt(wx, wy), r = hash2(wx * S + sx, wy * S + sy);
      if (k === "road" || k === "pass" || k === "bridge") {
        const mid = sx >= S / 2 - 1 && sx <= S / 2, midY = sy >= S / 2 - 1 && sy <= S / 2;
        const toward = (dx: number, dy: number) => ROADY.has(kindAt(wx + dx, wy + dy));
        if ((mid && midY) || (mid && sy < S / 2 && toward(0, -1)) || (mid && sy > S / 2 - 1 && toward(0, 1)) || (midY && sx < S / 2 && toward(-1, 0)) || (midY && sx > S / 2 - 1 && toward(1, 0))) return k === "bridge" ? "plank" : "path";
        return "grass";
      }
      switch (k) {
        case "sea": case "shoal": case "river": case "canal": return "water";
        case "marsh": case "reeds": return r < 0.3 ? "water" : "grass";
        case "meadow": return r < 0.12 ? "flowers" : "grass";
        case "terraces": return sy % 3 === 0 ? "terrace" : "moss";
        case "mount": case "ashrock": case "spire": return "rock";
        case "snow": return r < 0.5 ? "flag" : "rock";
        case "sand": case "saltpan": case "steppe": return r < 0.5 ? "path" : "grass";
        case "townground": return "cobble";
        default: return "grass";
      }
    };
    const LT = N * S, chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", lg: Record<string, TileKind> = {}, chOf = new Map<TileKind, string>();
    const lrows: string[] = [];
    for (let ty = 0; ty < LT; ty++) {
      let line = "";
      for (let tx = 0; tx < LT; tx++) {
        const k = localKind(a.x - R + Math.floor(tx / S), a.y - R + Math.floor(ty / S), tx % S, ty % S);
        let ch = chOf.get(k); if (!ch) { ch = chars[chOf.size]; chOf.set(k, ch); lg[ch] = k; }
        line += ch;
      }
      lrows.push(line);
    }
    const cropFile: MapFile = { id: a.land.id + ":around", name: "", legend: lg, rows: lrows, entities: [] };
    const baked = bakeMap(new WorldMap(cropFile), { burnt });
    const tex = pixelTex(baked);
    // local position of world cell corner (wx, wy): the place's cell centre sits on the town's centre
    const lx = (wx: number) => W / 2 + (wx - a.x - 0.5) * S, lz = (wy: number) => H / 2 + (wy - a.y - 0.5) * S;
    const SUB = 3, V = N * SUB + 1;
    const geo = new THREE.PlaneGeometry(N * S, N * S, N * SUB, N * SUB); geo.rotateX(-Math.PI / 2);
    geo.translate(lx(a.x - R) + (N * S) / 2, 0, lz(a.y - R) + (N * S) / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const hAt = (wx: number, wy: number): number => { const k = kindAt(wx, wy); return (WORLD_H[k] ?? 0) * 3.2 + (k === "mount" ? hash2(wx, wy) * 4 : k === "hills" ? hash2(wx, wy) * 1 : 0); };
    // smooth heights: average the cells touching each vertex
    const height = (u: number, v: number): number => {
      const fx = a.x - R + u / S, fy = a.y - R + v / S; // in world cells
      const x0 = Math.floor(fx - 0.5), y0 = Math.floor(fy - 0.5), tx = fx - 0.5 - x0, ty = fy - 0.5 - y0;
      const h = (hAt(x0, y0) * (1 - tx) + hAt(x0 + 1, y0) * tx) * (1 - ty) + (hAt(x0, y0 + 1) * (1 - tx) + hAt(x0 + 1, y0 + 1) * tx) * ty;
      // ease to just below the town near it: distance (local tiles) outside the town's rectangle
      const X = lx(a.x - R) + u, Z = lz(a.y - R) + v, dx = Math.max(0, -X, X - W), dz = Math.max(0, -Z, Z - H), d = Math.hypot(dx, dz);
      const k = smoothstep(2, 16, d);
      // under the town itself it drops away, so the town's own canals and ponds (sunk below its ground) show
      const di = Math.min(X, W - X, Z, H - Z);
      if (di > 0) return -0.08 - 0.9 * smoothstep(0, 1.5, di);
      return -0.08 + h * k;
    };
    for (let i = 0; i < pos.count; i++) { const ix = i % V, iz = Math.floor(i / V); pos.setY(i, height(ix * S / SUB, iz * S / SUB)); }
    geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    land.receiveShadow = true; this.level.add(land);
    const ground = (X: number, Z: number) => height(X - lx(a.x - R), Z - lz(a.y - R));
    // water, woods and the neighbouring towns
    const wq = new Quads();
    const trees: { x: number; y: number; z: number; s: number; kind?: "pine" | "round" | "orchard" | "cloud" }[] = [];
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }), roofMat = new THREE.MeshStandardMaterial({ color: 0xb0553a, roughness: 0.8, flatShading: true });
    const inside = (X: number, Z: number, m = 1.5) => X > -m && X < W + m && Z > -m && Z < H + m;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const wx = a.x - R + i, wy = a.y - R + j, k = kindAt(wx, wy), x0 = lx(wx), z0 = lz(wy), r = (n: number) => hash2(wx * 31 + n, wy * 17 + n * 5);
      if (["sea", "shoal", "river", "canal"].includes(k)) { const y = -0.42; wq.quad([[x0, y, z0], [x0, y, z0 + S], [x0 + S, y, z0 + S], [x0 + S, y, z0]], [[0, 0], [0, 1], [1, 1], [1, 0]]); continue; }
      if (k === "forest" || k === "pines" || k === "cloudwood" || k === "orchard") {
        const n = k === "orchard" ? 6 : 9;
        for (let t = 0; t < n; t++) { const X = x0 + r(t) * S, Z = z0 + r(t + 20) * S; if (inside(X, Z)) continue; trees.push({ x: X, y: ground(X, Z) - 0.05, z: Z, s: 1.1 + r(t + 40) * 0.7, kind: k === "pines" ? "pine" : k === "orchard" ? "orchard" : k === "cloudwood" ? "cloud" : "round" }); }
      } else if (k === "plains" || k === "meadow" || k === "hills") {
        if (r(3) > 0.6) { const X = x0 + r(4) * S, Z = z0 + r(5) * S; if (!inside(X, Z)) trees.push({ x: X, y: ground(X, Z) - 0.05, z: Z, s: 1 + r(6) * 0.5, kind: "round" }); }
      } else if (k === "townground" && !inside(x0 + S / 2, z0 + S / 2, 3)) {
        for (let t = 0; t < 7; t++) {
          const X = x0 + 0.8 + r(t) * (S - 1.6), Z = z0 + 0.8 + r(t + 9) * (S - 1.6), gy = ground(X, Z), w = 1.4 + r(t + 3), d = 1.2 + r(t + 5) * 0.6;
          const hb = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), houseMat); hb.position.set(X, gy + 0.55, Z); hb.castShadow = hb.receiveShadow = true; this.level.add(hb);
          const rf = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 0.9, 4), roofMat); rf.rotation.y = Math.PI / 4; rf.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); rf.position.set(X, gy + 1.55, Z); rf.castShadow = true; this.level.add(rf);
          if (t === 0) this.lamps.push({ x: X, y: gy + 0.8, z: Z + d / 2 + 0.1, color: 0xffc274, kind: "window" });
        }
      }
    }
    if (!wq.empty) this.level.add(new THREE.Mesh(wq.build(), new THREE.MeshStandardMaterial({ color: 0x3a7ab8, emissive: 0x1e5a8a, emissiveIntensity: 0.6, roughness: 0.7, transparent: true, opacity: 0.85 })));
    this.aroundTrees = trees; // planted with the town's own trees, so they share one wind
    // far beyond: the same country's colour fading into the haze
    const far = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: averageColour(baked).multiplyScalar(0.85), roughness: 1 }));
    far.rotation.x = -Math.PI / 2; far.position.set(W / 2, -0.6, H / 2); this.level.add(far);
  }

  private cloudSea(W: number, H: number): void {
    this.cloudTex = new THREE.CanvasTexture(cloudCanvas()); this.cloudTex.wrapS = this.cloudTex.wrapT = THREE.RepeatWrapping; this.cloudTex.repeat.set(10, 10); this.cloudTex.colorSpace = THREE.SRGBColorSpace;
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshLambertMaterial({ map: this.cloudTex }));
    this.sea.rotation.x = -Math.PI / 2; this.sea.position.set(W / 2, -3.4, H / 2); this.sea.receiveShadow = true; this.level.add(this.sea);
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Group(), n = 3 + Math.floor(hash2(i, 9) * 4);
      for (let j = 0; j < n; j++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + hash2(i, j) * 0.9, 2), this.puffMat); s.position.set(j * 0.8 - n * 0.4, hash2(j, i) * 0.4, (hash2(i + 3, j) - 0.5) * 0.8); s.scale.y = 0.55; g.add(s); }
      let px = 0, pz = 0, tries = 0;
      do { tries++; px = -14 + hash2(i, 31 + tries) * (W + 28); pz = -10 + hash2(i, 37 + tries * 7) * (H + 20); } while (tries < 50 && this.groundAt(Math.floor(px), Math.floor(pz), 0.5) !== null && px > -1 && px < W + 1 && pz > -1 && pz < H + 1);
      g.position.set(px, -3 + hash2(i, 41) * 2.4, pz); this.level.add(g); this.puffs.push({ g, v: 0.15 + hash2(i, 43) * 0.25 });
    }
  }

  // ------------------------------------------------------------ the world map
  private buildWorld(): void {
    const map = this.map, W = map.width, H = map.height, VW = W + 1;
    this.rowLevel = []; this.terraceRows.clear();
    const hOf = (x: number, y: number): number | null => { const k = this.kind(x, y); if (k === null) return 0; if (k === "cloud") return null; return WORLD_H[k] ?? 0; };
    const hs = new Float32Array(VW * (H + 1));
    for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
      let s = 0, n = 0, voidN = 0;
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const h = hOf(x + dx, y + dy); if (h === null) voidN++; else { s += h; n++; } }
      const k = this.kind(Math.min(W - 1, x), Math.min(H - 1, y));
      const bump = k === "mount" ? hash2(x, y) * 1.2 : k === "hills" ? hash2(x, y) * 0.3 : 0;
      hs[y * VW + x] = voidN === 4 ? -3 : voidN ? -1.5 : s / Math.max(1, n) + bump;
    }
    this.heights = hs;
    const groundFile: MapFile = { ...map.file, legend: Object.fromEntries(Object.entries(map.file.legend).map(([ch, k]) => [ch, GROUND_SUB[k] ?? k])) };
    const groundCanvas = bakeMap(new WorldMap(groundFile));
    const geo = new THREE.PlaneGeometry(W, H, W, H); geo.rotateX(-Math.PI / 2); geo.translate(W / 2, 0, H / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) { const x = Math.round(pos.getX(i)), z = Math.round(pos.getZ(i)); pos.setY(i, hs[z * VW + x]); }
    geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: pixelTex(groundCanvas), roughness: 0.95 }));
    land.receiveShadow = true; land.castShadow = true; this.level.add(land);
    // water
    const wq = new Quads();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (["sea", "shoal", "river", "canal"].includes(this.kind(x, y)!)) wq.quad([[x, -0.12, y], [x, -0.12, y + 1], [x + 1, -0.12, y + 1], [x + 1, -0.12, y]], [[0, 0], [0, 1], [1, 1], [1, 0]]);
    if (!wq.empty) this.level.add(new THREE.Mesh(wq.build(), new THREE.MeshStandardMaterial({ color: 0x3a7ab8, emissive: 0x1e5a8a, emissiveIntensity: 0.6, roughness: 0.7, transparent: true, opacity: 0.85 })));
    if (Object.values(map.file.legend).includes("cloud")) this.cloudSea(W, H);
    else { const ring = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: averageColour(groundCanvas).multiplyScalar(0.85), roughness: 1 })); ring.rotation.x = -Math.PI / 2; ring.position.set(W / 2, -0.2, H / 2); this.level.add(ring); }
    // woods, spires and towns
    const trees: { x: number; y: number; z: number; s: number; kind?: "pine" | "round" | "orchard" | "cloud" }[] = [];
    const towns = new THREE.Group();
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }), roofMat = new THREE.MeshStandardMaterial({ color: 0xb0553a, roughness: 0.8, flatShading: true });
    const spireMat = new THREE.MeshStandardMaterial({ color: 0xc8c0d8, roughness: 0.8, flatShading: true });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = this.kind(x, y), r = (i: number) => hash2(x * 17 + i, y * 29 + i * 3);
      const at = (fx: number, fz: number) => this.groundY(x + fx, y + fz);
      if (k === "forest" || k === "pines" || k === "cloudwood" || k === "orchard") {
        const n = k === "orchard" ? 2 : 3;
        for (let i = 0; i < n; i++) { const fx = 0.2 + r(i) * 0.6, fz = 0.2 + r(i + 5) * 0.6; trees.push({ x: x + fx, y: at(fx, fz), z: y + fz, s: 0.45 + r(i + 9) * 0.2, kind: k === "pines" ? "pine" : k === "orchard" ? "orchard" : k === "cloudwood" ? "cloud" : "round" }); }
      } else if (k === "spire") {
        if (r(1) > 0.45) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.18 + r(2) * 0.15, 1.6 + r(3) * 1.6, 5), spireMat); c.position.set(x + 0.5, at(0.5, 0.5) + 0.8, y + 0.5); c.castShadow = c.receiveShadow = true; this.level.add(c); }
      } else if (k === "townground") {
        for (let i = 0; i < 4; i++) {
          const fx = 0.2 + (i % 2) * 0.55 + r(i) * 0.1, fz = 0.25 + Math.floor(i / 2) * 0.5, gy = at(fx, fz);
          const hb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.26), houseMat); hb.position.set(x + fx, gy + 0.13, y + fz); hb.castShadow = hb.receiveShadow = true; towns.add(hb);
          const rf = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.22, 4), roofMat); rf.rotation.y = Math.PI / 4; rf.position.set(x + fx, gy + 0.37, y + fz); rf.castShadow = true; towns.add(rf);
          if (i === 0) this.lamps.push({ x: x + 0.5, y: gy + 0.5, z: y + 0.6, color: 0xffc274, kind: "window" });
        }
      }
    }
    this.level.add(towns);
    if (trees.length) this.plantTrees(trees, false);
  }

  // ------------------------------------------------------------ live state
  setLight(light: string): void {
    const id = this.map?.file.id ?? "";
    let m = MOODS[light] ? light : "day";
    if (UNDER.has(id)) m = "under";
    else if (INDOORS.has(id)) m = ["evening", "steam", "fire", "night"].includes(light) ? (light === "night" ? "evening" : light) : "indoor";
    this.moodName = m; this.mood = MOODS[m];
    this.applyMood();
  }

  private applyMood(): void {
    const m = this.mood;
    if (m.sky) { const key = m.sky.join(); this.scene.background = this.skyCache[key] ??= skyTex(m.sky); } else this.scene.background = new THREE.Color(m.fog);
    (this.scene.fog as THREE.Fog).color.setHex(m.fog);
    this.sun.color.setHex(m.sun); this.sun.intensity = m.sunI;
    this.hemi.color.setHex(m.hemiSky); this.hemi.groundColor.setHex(m.hemiGround); this.hemi.intensity = m.hemiI;
    this.windowMat.emissiveIntensity = m.windows; this.lantern.intensity = m.lantern;
    if (this.sea) (this.sea.material as THREE.MeshLambertMaterial).color.setHex(m.cloud);
    this.puffMat.color.setHex(m.cloud);
    this.renderer.toneMappingExposure = m.exposure; this.bloom.strength = m.bloom;
    for (const s of this.shown.values()) s.mat.emissiveIntensity = m.selfLit;
    this.lampCheck = 0;
  }

  /** Hidden lands under mist, as tile cells. */
  setFog(cells: [number, number][]): void {
    if (this.fogMesh) { this.level.remove(this.fogMesh); this.fogMesh.geometry.dispose(); this.fogMesh = null; }
    if (!cells.length) return;
    const box = new THREE.BoxGeometry(1, 1.6, 1);
    const m = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.88, depthWrite: false }), cells.length);
    cells.forEach(([x, y], i) => { m4.compose(v3.set(x + 0.5, this.groundY(x + 0.5, y + 0.5) + 0.6, y + 0.5), q4.identity(), new THREE.Vector3(1.02, 1, 1.02)); m.setMatrixAt(i, m4); });
    this.fogMesh = m; this.level.add(m);
  }

  /** Steam or fire spreading over tiles (the brood room's burst pipes, the burning village). */
  setHazard(cells: Set<string>, fire: boolean): void {
    const key = (fire ? "f" : "s") + [...cells].join(";");
    if (key === this.hazardKey) return;
    this.hazardKey = key;
    if (this.hazard) { this.level.remove(this.hazard); this.hazard.geometry.dispose(); this.hazard = null; }
    if (!cells.size) return;
    this.hazardMat.color.setHex(fire ? 0xff7a24 : 0xeef2f4); this.hazardMat.blending = fire ? THREE.AdditiveBlending : THREE.NormalBlending;
    const g = new THREE.IcosahedronGeometry(0.5, 1);
    const m = new THREE.InstancedMesh(g, this.hazardMat, cells.size * 2);
    let i = 0;
    for (const c of cells) { const [x, y] = c.split(",").map(Number); for (let j = 0; j < 2; j++) { m4.compose(v3.set(x + 0.3 + j * 0.4, this.groundY(x + 0.5, y + 0.5) + 0.3 + j * 0.25, y + 0.5), q4.identity(), new THREE.Vector3(0.8, 0.6 + j * 0.3, 0.8)); m.setMatrixAt(i++, m4); } }
    this.hazard = m; this.level.add(m);
  }

  private texFor(src: object, make: () => THREE.Texture): THREE.Texture {
    let t = this.texCache.get(src);
    if (!t) { t = make(); this.texCache.set(src, t); }
    return t;
  }

  /** How someone looks now (their build, from their attributes and the story); set by the explore scene. */
  buildFor: ((id: string) => Build) | null = null;
  private builds = new Map<string, { b: Build; at: number }>();
  private build(id: string, now: number): Build | undefined {
    if (!this.buildFor) return undefined;
    const c = this.builds.get(id);
    if (c && now - c.at < 3) return c.b;
    const b = this.buildFor(id.split(":")[0]); this.builds.set(id, { b, at: now }); return b;
  }
  private clock = 0;
  private around: Around | null = null;
  private aroundTrees: { x: number; y: number; z: number; s: number; kind?: "pine" | "round" | "orchard" | "cloud" }[] = [];
  private figT = 0;

  /** Stand everyone where they are this frame. */
  figures(list: Fig[], heroKey: string): void {
    for (const s of this.shown.values()) s.seen = false;
    const now = this.clock, step = Math.min(0.1, Math.max(1 / 240, now - this.figT)); this.figT = now;
    for (const f of list) {
      if (!f.visible) continue;
      const rigged = !!f.look && !PROPS.has(f.look);
      const source: unknown = rigged ? `rig:${f.look}` : f.canvas;
      if (!source) continue;
      let s = this.shown.get(f.key);
      if (!s || s.source !== source) {
        if (s) this.drop(f.key, s);
        let tex: THREE.Texture, rig: Shown3["rig"] = null, w = 1, h = 1.5;
        if (rigged) {
          const cv = document.createElement("canvas"); cv.width = RIG.w * RIG.K; cv.height = RIG.h * RIG.K;
          const ct = new THREE.CanvasTexture(cv); ct.colorSpace = THREE.SRGBColorSpace; ct.anisotropy = 4; ct.generateMipmaps = false; ct.minFilter = THREE.LinearFilter;
          tex = ct; rig = { cv, g: cv.getContext("2d")!, tex: ct, look: f.look!, due: 0, painted: hasPaintedFig(f.look!.split(":")[0]) && !NPC_PAINTED.has(f.look!.split(":")[0]), seed: hash2(f.key.length, f.key.charCodeAt(f.key.length - 1)) * 10 };
          w = RIG.w / RIG.perTile; h = RIG.h / RIG.perTile;
        } else {
          const base = this.texFor(source as object, () => { const t = new THREE.CanvasTexture(f.canvas as HTMLCanvasElement); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; });
          tex = base.clone(); tex.needsUpdate = true;
        }
        const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: this.mood.selfLit, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
        const geo = new THREE.PlaneGeometry(1, 1);
        // the plane's origin is the figure's feet
        if (rigged) geo.translate(0.5 - RIG.footX / RIG.w, RIG.footY / RIG.h - 0.5, 0); else geo.translate(0, 0.5, 0);
        const body = new THREE.Mesh(geo, mat); body.castShadow = true;
        const obj = new THREE.Group(); obj.add(body);
        if (!rigged) { const blob = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; obj.add(blob); }
        this.figs.add(obj);
        s = { obj, body, mat, source, rig, face: 1, lastX: f.x, lastY: f.y, phase: 0, moving: 0, spd: 0, seen: true, w, h };
        this.shown.set(f.key, s);
      }
      s.seen = true;
      if (!s.rig && f.frame && f.canvas) {
        const t = s.mat.map!, cw = f.canvas.width, ch = f.canvas.height;
        t.repeat.set(f.frame.w / cw, f.frame.h / ch); t.offset.set(f.frame.x / cw, 1 - (f.frame.y + f.frame.h) / ch);
        s.w = f.frame.w / TILE; s.h = f.frame.h / TILE;
      }
      // walking: the stride follows the ground actually covered, so feet don't slide
      const dx = f.x - s.lastX, dy = f.y - s.lastY, d = Math.hypot(dx, dy) / TILE;
      // a stride cycle covers more ground the faster they go (an easy walk ~1.5 tiles, a run ~2.3), as real gaits do
      if (d > 0.002 && d < 2) { s.spd += (d / step - s.spd) * Math.min(1, step * 10); s.moving = 0.12; s.phase += d * Math.PI * 2 / (1.1 + 0.18 * Math.min(7, s.spd)); }
      else { s.moving = Math.max(0, s.moving - step); if (s.moving <= 0) s.spd = 0; }
      if (f.facing === "left") s.face = -1; else if (f.facing === "right") s.face = 1; else if (Math.abs(dx) > 0.05) s.face = dx < 0 ? -1 : 1;
      s.lastX = f.x; s.lastY = f.y;
      const u = f.x / TILE, v = f.y / TILE;
      s.obj.position.set(u, this.groundY(u, v - 0.05), v);
      s.body.scale.set(s.w, s.h, 1);
      if (s.rig) this.drawRig(s, now, Math.hypot(u - this.focus.x, v - this.focus.z));
      if (f.key === heroKey) this.hero = { x: u, y: v, face: s.face };
    }
    for (const [k, s] of this.shown) if (!s.seen) this.drop(k, s);
  }

  private drop(key: string, s: Shown3): void {
    if (!s.rig) s.mat.map?.dispose(); else s.rig.tex.dispose();
    s.mat.dispose(); s.body.geometry.dispose(); this.figs.remove(s.obj); this.shown.delete(key);
  }

  /** Redraws a figure with the battle rig: the painting (or the drawn figure) cut into cells that breathe, sway and stride. */
  private drawRig(s: Shown3, now: number, far: number): void {
    const r = s.rig!, walking = s.moving > 0;
    if (now < r.due) return;
    r.due = now + (walking ? 1 / 30 : far > 16 ? 0.25 : 1 / 12);
    const g = r.g, old = getScale();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, r.cv.width, r.cv.height);
    setScale(RIG.K);
    try { drawLook(g, r.look, RIG.footX, RIG.footY, { t: now + r.seed, run: walking ? s.phase : undefined, stride: Math.min(1, 0.3 + 0.09 * s.spd), flip: s.face === -1 }, this.build(r.look, now), r.painted); }
    finally { setScale(old); }
    r.tex.needsUpdate = true;
  }

  /** Screen position (CSS pixels) of a point given in map pixels, lifted `lift` tiles off the ground. */
  project(px: number, py: number, lift = 0): { x: number; y: number } {
    const u = px / TILE, v = py / TILE;
    const p = new THREE.Vector3(u, this.groundY(u, v) + lift, v).project(this.camera);
    return { x: (p.x + 1) / 2 * this.width, y: (1 - p.y) / 2 * this.height };
  }

  frame(t: number, dt: number, focusPx: { x: number; y: number }): void {
    this.lastFrame = performance.now();
    this.clock = t;
    this.canvas.style.visibility = "visible";
    const u = focusPx.x / TILE, v = focusPx.y / TILE, gy = this.groundY(u, v);
    const target = new THREE.Vector3(u, gy, v);
    if (!this.focusSet) { this.focus.copy(target); this.focusSet = true; } else this.focus.lerp(target, Math.min(1, dt * 5));
    const id = this.map.file.id, small = INDOORS.has(id) && !UNDER.has(id);
    // an upright phone sees a narrow strip: stand back a little so the sides of the scene still show
    const upright = this.height > this.width ? Math.min(1.3, Math.sqrt(this.height / this.width)) : 1;
    const dist = (this.world ? 42 : small ? 21 : 31) * this.zoomMul * upright, pitch = this.world ? 0.95 : 0.86;
    this.camera.position.set(this.focus.x, this.focus.y + Math.sin(pitch) * dist, this.focus.z + Math.cos(pitch) * dist);
    this.camera.lookAt(this.focus.x, this.focus.y + 0.5, this.focus.z);
    const fog = this.scene.fog as THREE.Fog; fog.near = dist + (this.mood.sky ? 8 : 5); fog.far = dist + (this.mood.sky ? 70 : 40);
    // sun follows the view so shadows stay sharp near the player
    const d = this.mood.dir;
    this.sun.target.position.copy(this.focus); this.sun.position.set(this.focus.x + d[0] * 30, this.focus.y + d[1] * 30, this.focus.z + d[2] * 30);
    this.lantern.position.set(this.hero.x + 0.45 * this.hero.face, this.groundY(this.hero.x, this.hero.y) + 0.8, this.hero.y + 0.3);
    // lamps: the nearest few get real lights, all of them flicker
    this.lampCheck -= dt;
    if (this.lampCheck <= 0) {
      this.lampCheck = 0.4;
      const near = this.lamps.map((l) => ({ l, d: Math.hypot(l.x - this.focus.x, l.z - this.focus.z) })).sort((a, b) => a.d - b.d).slice(0, this.pool.length);
      this.pool.forEach((p, i) => { const n = near[i]; if (!n) { p.intensity = 0; p.userData.base = 0; return; } p.position.set(n.l.x, n.l.y, n.l.z); p.color.setHex(n.l.color); p.distance = n.l.kind === "fire" ? 7 : 5; p.userData.base = n.l.kind === "fire" ? this.mood.lamps * 1.3 : n.l.kind === "glow" ? this.mood.lamps * 0.5 : this.mood.windows > 0 ? this.mood.lamps * 0.7 : 0; });
    }
    this.pool.forEach((p, i) => { p.intensity = (p.userData.base ?? 0) * (0.9 + Math.sin(t * 9 + i * 2) * 0.06 + Math.sin(t * 23 + i) * 0.04); });
    this.flames.forEach((f, i) => { const s = 0.85 + Math.sin(t * 11 + i * 1.7) * 0.12 + Math.sin(t * 27 + i) * 0.06; f.scale.set(1, s, 1); });
    if (this.hazard) this.hazardMat.opacity = 0.45 + Math.sin(t * 6) * 0.1;
    // trees sway
    if (this.leaves) {
      const { mesh, base } = this.leaves;
      base.forEach((p, i) => { const w = Math.sin(t * 1.3 + p.ph) * 0.04; q4.setFromEuler(e3.set(w, p.ph, w)); m4.compose(v3.set(p.x + w, p.y, p.z + w * 0.5), q4, new THREE.Vector3(p.s, p.s * 0.9, p.s)); mesh.setMatrixAt(i, m4); });
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.cloudTex) { this.cloudTex.offset.x = t * 0.004; this.cloudTex.offset.y = t * 0.0015; }
    for (const p of this.puffs) { p.g.position.x += p.v * dt; if (p.g.position.x > this.map.width + 16) p.g.position.x = -16; }
    // a house between the camera and the player turns see-through
    for (const h of this.houses) {
      const behind = this.hero.x > h.x0 - 0.3 && this.hero.x < h.x1 + 0.3 && this.hero.y < h.z1 && this.hero.y > h.z0 - 3;
      for (const m of h.mats) { const want = behind ? 0.3 : 1; if (m.opacity !== want) { m.transparent = behind; m.opacity = want; m.depthWrite = !behind; m.needsUpdate = true; } }
    }
    this.composer.render(dt);
    this.pace(dt);
  }
}

/** The 3D look to start with: what this device settled on last time, else a step down on phones and tablets. */
function quality(): 0 | 1 | 2 {
  try { const q = Number(localStorage.getItem("lull.q3d")); if (q === 0 || q === 1) return q; } catch { /* fine */ }
  const touch = (navigator.maxTouchPoints ?? 0) > 0 && matchMedia?.("(pointer: coarse)").matches;
  return touch ? 1 : 2;
}
