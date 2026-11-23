// A test of the explorable world in 3D: Larkfold's tile grid raised into terraces, houses, trees and a cloud sea,
// with the painted figures standing in it, real sun and lamp light, soft shadows and a tilt-shift camera.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { HorizontalTiltShiftShader } from "three/examples/jsm/shaders/HorizontalTiltShiftShader.js";
import { VerticalTiltShiftShader } from "three/examples/jsm/shaders/VerticalTiltShiftShader.js";
import larkfold from "../../data/maps/larkfold.json";
import { WorldMap, TILE, type MapFile, type TileKind } from "../world/map";
import { bakeMap } from "../art/tiles";
import { hash2 } from "../art/pixel";

const LH = 0.7; // height of one terrace step, in tiles
const CLIFF_BASE = -4;

const file = larkfold as unknown as MapFile;
const map = new WorldMap(file);
const W = map.width, H = map.height;
const kind = (x: number, y: number): TileKind | null => map.kindAt(x, y);

// ---------- heights: each row of terrace walls lifts everything behind it by one step ----------
const terraceRow = (y: number) => [...file.rows[y]].filter((ch) => ["terrace", "steps", "gate"].includes(file.legend[ch])).length >= 4;
const rowLevel: number[] = [];
for (let y = 0; y < H; y++) { let n = 0; for (let r = y + 1; r < H; r++) if (terraceRow(r)) n++; rowLevel[y] = n; }
const isRamp = (k: TileKind | null) => k === "steps" || k === "gate";
const raised = (x: number, y: number) => kind(x, y) === "terrace";
/** Height of a tile's top at its north (fz=0) and south (fz=1) edges; null where there is no ground (the cloud sea). */
function topAt(x: number, y: number, fz: number): number | null {
  const k = kind(x, y);
  if (k === null || k === "cloud") return null;
  const L = rowLevel[y] * LH;
  if (raised(x, y)) return L + LH;
  if (isRamp(k)) return L + LH * (1 - fz);
  if (k === "water") return L - 0.35;
  return L;
}
function groundY(px: number, pz: number): number {
  const x = Math.floor(px), y = Math.floor(pz);
  return topAt(x, y, pz - y) ?? 0;
}

// ---------- textures ----------
function tex(c: HTMLCanvasElement, repeat = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function tileTex(k: TileKind, w = 4, h = 4): THREE.CanvasTexture {
  const rows = Array.from({ length: h }, () => "a".repeat(w));
  const c = bakeMap(new WorldMap({ id: "t", name: "t", legend: { a: k }, rows, entities: [] }));
  const t = tex(c, true); t.repeat.set(1 / w, 1 / h); return t;
}
// The ground: the same pixel tiles as the 2D game, with what now stands up in 3D (trees, houses) painted out.
const GROUND_SUB: Partial<Record<TileKind, TileKind>> = { tree: "grass", roof: "grass", wall: "path", door: "path", drying: "grass", ladder: "grass", cave: "moss", cloud: "cliff", gate: "steps" };
const groundFile: MapFile = { ...file, legend: Object.fromEntries(Object.entries(file.legend).map(([ch, k]) => [ch, GROUND_SUB[k] ?? k])) };
const groundTex = tex(bakeMap(new WorldMap(groundFile)));

// ---------- geometry helper ----------
class Quads {
  pos: number[] = []; uv: number[] = []; idx: number[] = [];
  quad(p: number[][], uv: number[][]): void {
    const b = this.pos.length / 3;
    p.forEach((v) => this.pos.push(...v)); uv.forEach((u) => this.uv.push(...u));
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx); g.computeVertexNormals();
    return g;
  }
}

const scene = new THREE.Scene();
const world = new THREE.Group(); scene.add(world);

// Ground tops, and the faces between heights: stone for terrace walls, rock for the island's cliffs.
const tops = new Quads(), stone = new Quads(), cliff = new Quads();
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const n = topAt(x, y, 0), s = topAt(x, y, 1);
  if (n === null || s === null) continue;
  const u0 = x / W, u1 = (x + 1) / W, v0 = 1 - y / H, v1 = 1 - (y + 1) / H;
  tops.quad([[x, n, y], [x, s, y + 1], [x + 1, s, y + 1], [x + 1, n, y]], [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]);
  // sides: compare with each neighbour's edge height
  const edges: [number, number, number[], number[], number, number][] = [
    // dx, dy, corner a, corner b (x,z), height here at a, at b
    [0, 1, [x, y + 1], [x + 1, y + 1], s, s],
    [0, -1, [x + 1, y], [x, y], n, n],
    [1, 0, [x + 1, y + 1], [x + 1, y], s, n],
    [-1, 0, [x, y], [x, y + 1], n, s],
  ];
  for (const [dx, dy, a, b, ha, hb] of edges) {
    const nx = x + dx, ny = y + dy;
    const there = (fz: number) => topAt(nx, ny, fz);
    const fa = dy === 1 ? 0 : dy === -1 ? 1 : dx !== 0 ? (a[1] - y) : 0, fb = dy === 1 ? 0 : dy === -1 ? 1 : dx !== 0 ? (b[1] - y) : 0;
    const la = there(fa), lb = there(fb);
    const open = la === null || lb === null;
    const lowA = open ? CLIFF_BASE : la!, lowB = open ? CLIFF_BASE : lb!;
    if (ha - lowA < 0.01 && hb - lowB < 0.01) continue;
    const q = open ? cliff : stone, len = 1;
    q.quad([[a[0], ha, a[1]], [a[0], lowA, a[1]], [b[0], lowB, b[1]], [b[0], hb, b[1]]],
      [[0, ha], [0, lowA], [len, lowB], [len, hb]]);
  }
}
const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, side: THREE.DoubleSide });
const stoneTex = tileTex("terrace", 1, 1); stoneTex.repeat.set(1, 1 / LH * 0.7);
const cliffTex = tileTex("cliff", 1, 1);
const addMesh = (g: THREE.BufferGeometry, m: THREE.Material, cast = false) => { const o = new THREE.Mesh(g, m); o.receiveShadow = true; o.castShadow = cast; world.add(o); return o; };
addMesh(tops.build(), groundMat);
addMesh(stone.build(), new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 1, side: THREE.DoubleSide }), true);
addMesh(cliff.build(), new THREE.MeshStandardMaterial({ map: cliffTex, roughness: 1, side: THREE.DoubleSide, color: 0xb8c0d0 }), true);

// Water in the spring pool
const waterMat = new THREE.MeshStandardMaterial({ color: 0x4f86b4, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82 });
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (kind(x, y) === "water") {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), waterMat); m.rotation.x = -Math.PI / 2; m.position.set(x + 0.5, rowLevel[y] * LH - 0.1, y + 0.5); m.receiveShadow = true; world.add(m);
}

// ---------- buildings ----------
const roofTex = tileTex("roof", 2, 2); roofTex.repeat.set(0.5, 0.5);
const dryTex = tileTex("drying", 2, 2); dryTex.repeat.set(0.5, 0.5);
const doorTex = tileTex("door", 1, 1); doorTex.repeat.set(1, 1);
const plasterMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 });
const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.8, side: THREE.DoubleSide });
const dryMat = new THREE.MeshStandardMaterial({ map: dryTex, roughness: 0.9, side: THREE.DoubleSide });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x5e4029, roughness: 0.9 });
const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.9 });
const windowMat = new THREE.MeshStandardMaterial({ color: 0x1d2a3a, emissive: 0xffb45a, emissiveIntensity: 0, roughness: 0.2 });
const lamps: THREE.PointLight[] = [];

function components(set: Set<TileKind>): { x: number; y: number }[][] {
  const seen = new Set<number>(), out: { x: number; y: number }[][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (seen.has(y * W + x) || !set.has(kind(x, y)!)) continue;
    const comp: { x: number; y: number }[] = [], st = [[x, y]]; seen.add(y * W + x);
    while (st.length) {
      const [cx, cy] = st.pop()!; comp.push({ x: cx, y: cy });
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (!seen.has(ny * W + nx) && set.has(kind(nx, ny)!)) { seen.add(ny * W + nx); st.push([nx, ny]); } }
    }
    out.push(comp);
  }
  return out;
}

function gable(x0: number, x1: number, z0: number, z1: number, base: number, rise: number, mat: THREE.Material): void {
  // ridge runs east-west, so the slopes face the camera and the sky
  const o = 0.18, zm = (z0 + z1) / 2, X0 = x0 - o, X1 = x1 + o, Z0 = z0 - o, Z1 = z1 + o, top = base + rise;
  const q = new Quads(), w = (X1 - X0), d = (zm - Z0);
  q.quad([[X0, base, Z1], [X1, base, Z1], [X1, top, zm], [X0, top, zm]], [[0, 0], [w, 0], [w, d * 1.3], [0, d * 1.3]]);
  q.quad([[X1, base, Z0], [X0, base, Z0], [X0, top, zm], [X1, top, zm]], [[0, 0], [w, 0], [w, d * 1.3], [0, d * 1.3]]);
  const r = new THREE.Mesh(q.build(), mat); r.castShadow = r.receiveShadow = true; world.add(r);
  // gable ends
  const tri = new THREE.BufferGeometry();
  tri.setAttribute("position", new THREE.Float32BufferAttribute([x0, base, z1, x0, base, z0, x0, top - 0.05, zm, x1, base, z0, x1, base, z1, x1, top - 0.05, zm], 3));
  tri.computeVertexNormals();
  const t = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color: 0xd6c8a8, roughness: 0.9, side: THREE.DoubleSide })); t.castShadow = t.receiveShadow = true; world.add(t);
}

// Houses: roof tiles and the wall row in front of them
for (const comp of components(new Set<TileKind>(["roof", "wall", "door"]))) {
  const xs = comp.map((c) => c.x), ys = comp.map((c) => c.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...ys), z1 = Math.max(...ys) + 1;
  const base = rowLevel[z1 - 1] * LH, wallH = 1.35;
  const box = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, wallH, z1 - z0), plasterMat);
  box.position.set((x0 + x1) / 2, base + wallH / 2, (z0 + z1) / 2); box.castShadow = box.receiveShadow = true; world.add(box);
  // timber frame along the base and corners
  for (const cx of [x0, x1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, wallH, 0.12), woodMat); p.position.set(cx, base + wallH / 2, z1); p.castShadow = true; world.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.1, 0.1, 0.1), woodMat); beam.position.set((x0 + x1) / 2, base + wallH, z1); world.add(beam);
  gable(x0, x1, z0, z1, base + wallH, 1.0, roofMat);
  for (const c of comp) {
    if (kind(c.x, c.y) === "door") {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.0), doorMat); d.position.set(c.x + 0.5, base + 0.5, z1 + 0.012); world.add(d);
      const lamp = new THREE.PointLight(0xffa850, 0, 6, 1.6); lamp.position.set(c.x + 0.5, base + 1.15, z1 + 0.45); world.add(lamp); lamps.push(lamp);
    } else if (kind(c.x, c.y) === "wall" && c.y === z1 - 1) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.38), windowMat); win.position.set(c.x + 0.5, base + 0.82, z1 + 0.012); world.add(win);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.08), woodMat); sill.position.set(c.x + 0.5, base + 0.6, z1 + 0.03); world.add(sill);
    }
  }
  // side windows
  for (const sx of [x0 - 0.012, x1 + 0.012]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.36), windowMat); win.position.set(sx, base + 0.82, (z0 + z1) / 2); win.rotation.y = Math.PI / 2; world.add(win); }
}

// The drying house: an open shed on posts, racks of duskwort under a dark roof
for (const comp of components(new Set<TileKind>(["drying", "ladder"]))) {
  const xs = comp.map((c) => c.x), ys = comp.map((c) => c.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...ys), z1 = Math.max(...ys) + 1;
  const base = rowLevel[z1 - 1] * LH, postH = 1.5;
  for (let px = x0; px <= x1; px += (x1 - x0) / 2) for (const pz of [z0, z1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, postH, 0.14), woodMat); p.position.set(px, base + postH / 2, pz); p.castShadow = true; world.add(p);
  }
  for (let r = 0; r < 3; r++) for (let z = z0 + 0.6; z < z1 - 0.3; z += 0.8) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 0.4, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: [0x6c4f7c, 0x8d6aa0, 0x5a4468][r], roughness: 1 }));
    rack.position.set((x0 + x1) / 2, base + 0.35 + r * 0.38, z); rack.castShadow = rack.receiveShadow = true; world.add(rack);
  }
  gable(x0, x1, z0, z1, base + postH, 0.8, dryMat);
  for (const c of comp) if (kind(c.x, c.y) === "ladder") {
    const lad = new THREE.Group();
    for (const sx of [-0.2, 0.2]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 0.06), woodMat); rail.position.set(sx, 1, 0); lad.add(rail); }
    for (let i = 0; i < 6; i++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), woodMat); rung.position.set(0, 0.2 + i * 0.32, 0); lad.add(rung); }
    lad.position.set(c.x + 0.5, base, z1 + 0.2); lad.rotation.x = -0.25; lad.traverse((o) => { o.castShadow = true; }); world.add(lad);
  }
}

// The cave mouth down to the brood caves, and the gate at the foot of the village
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const k = kind(x, y), L = rowLevel[y] * LH;
  if (k === "cave") {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), new THREE.MeshStandardMaterial({ color: 0x4a4239, roughness: 1, flatShading: true }));
    rock.scale.set(1.1, 0.9, 0.8); rock.position.set(x + 0.5, L + 0.35, y + 0.25); rock.castShadow = rock.receiveShadow = true; world.add(rock);
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x0b0806 }));
    mouth.position.set(x + 0.5, L + 0.02, y + 0.9); world.add(mouth);
  }
  if (k === "gate") {
    const g = new THREE.Group();
    for (const sx of [-0.5, 0.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 0.16), woodMat); p.position.set(sx, 0.85, 0); g.add(p); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.18), woodMat); top.position.y = 1.7; g.add(top);
    for (let i = 0; i < 5; i++) { const slat = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 0.05), woodMat); slat.position.set(-0.4 + i * 0.2, 0.6, 0); g.add(slat); }
    g.position.set(x + 0.5, L, y + 0.7); g.traverse((o) => { o.castShadow = true; }); world.add(g);
  }
}

// ---------- trees ----------
const treeTiles: { x: number; y: number }[] = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (kind(x, y) === "tree") treeTiles.push({ x, y });
const BLOBS = 3;
const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 1, 6); trunkGeo.translate(0, 0.5, 0);
const trunks = new THREE.InstancedMesh(trunkGeo, woodMat, treeTiles.length);
const leafGeo = new THREE.IcosahedronGeometry(0.5, 1);
const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), treeTiles.length * BLOBS);
trunks.castShadow = leaves.castShadow = true; trunks.receiveShadow = leaves.receiveShadow = true;
const LEAF = [0x2f5a2c, 0x3f7438, 0x558f48, 0x4c6e3a];
const leafBase: { x: number; y: number; z: number; s: number; ph: number }[] = [];
const m4 = new THREE.Matrix4();
treeTiles.forEach((t, i) => {
  const r = (k: number) => hash2(t.x * 13 + k, t.y * 7 + k * 3);
  const gx = t.x + 0.5 + (r(1) - 0.5) * 0.3, gz = t.y + 0.5 + (r(2) - 0.5) * 0.3, gy = rowLevel[t.y] * LH, h = 0.8 + r(3) * 0.5;
  m4.compose(new THREE.Vector3(gx, gy, gz), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)); trunks.setMatrixAt(i, m4);
  for (let b = 0; b < BLOBS; b++) {
    const s = (b === 0 ? 0.95 : 0.7) * (0.85 + r(4 + b) * 0.35);
    const p = { x: gx + (b === 0 ? 0 : (r(7 + b) - 0.5) * 0.7), y: gy + h + (b === 0 ? 0.35 : 0.05 + r(9 + b) * 0.4), z: gz + (b === 0 ? 0 : (r(11 + b) - 0.5) * 0.6), s, ph: r(15 + b) * 6.28 };
    leafBase.push(p);
    leaves.setColorAt(i * BLOBS + b, new THREE.Color(LEAF[Math.floor(r(20 + b) * LEAF.length)]));
  }
});
world.add(trunks, leaves);
function swayTrees(t: number): void {
  leafBase.forEach((p, i) => {
    const w = Math.sin(t * 1.3 + p.ph) * 0.04;
    m4.compose(new THREE.Vector3(p.x + w, p.y, p.z + w * 0.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(w, p.ph, w)), new THREE.Vector3(p.s, p.s * 0.9, p.s));
    leaves.setMatrixAt(i, m4);
  });
  leaves.instanceMatrix.needsUpdate = true;
}

// Moss tufts on the duskwort terraces, so the beds have some height
const tuftGeo = new THREE.IcosahedronGeometry(0.11, 0); tuftGeo.translate(0, 0.05, 0);
const mossTiles: { x: number; y: number }[] = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (kind(x, y) === "moss") mossTiles.push({ x, y });
const TUFTS = 9;
const tufts = new THREE.InstancedMesh(tuftGeo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), mossTiles.length * TUFTS);
const MOSS = [0x6c4f7c, 0x8d6aa0, 0x5a4468, 0x9a7ab0];
mossTiles.forEach((t, i) => { for (let j = 0; j < TUFTS; j++) {
  const r = (k: number) => hash2(t.x * 31 + j * 5 + k, t.y * 17 + k);
  m4.compose(new THREE.Vector3(t.x + 0.1 + r(1) * 0.8, rowLevel[t.y] * LH, t.y + 0.1 + r(2) * 0.8), new THREE.Quaternion().setFromEuler(new THREE.Euler((r(3) - 0.5) * 0.4, r(4) * 6, (r(5) - 0.5) * 0.4)), new THREE.Vector3(0.8 + r(8) * 0.6, 0.45 + r(6) * 0.5, 0.8 + r(9) * 0.6));
  tufts.setMatrixAt(i * TUFTS + j, m4); tufts.setColorAt(i * TUFTS + j, new THREE.Color(MOSS[Math.floor(r(7) * MOSS.length)]));
} });
tufts.receiveShadow = true; world.add(tufts);


// Grass blades and a few flowers on the open grass, so the ground isn't flat paint
const bladeGeo = new THREE.ConeGeometry(0.035, 0.2, 3); bladeGeo.translate(0, 0.1, 0);
const grassTiles: { x: number; y: number }[] = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (kind(x, y) === "grass" || kind(x, y) === "tree") grassTiles.push({ x, y });
const BLADES = 14;
const blades = new THREE.InstancedMesh(bladeGeo, new THREE.MeshStandardMaterial({ roughness: 1 }), grassTiles.length * BLADES);
const GREENS = [0x5e8846, 0x6f9a52, 0x86b064, 0x4c7038], PETALS = [0xf0d264, 0xece6da, 0xd48cb8];
grassTiles.forEach((t, i) => { for (let j = 0; j < BLADES; j++) {
  const r = (k: number) => hash2(t.x * 41 + j * 7 + k, t.y * 23 + k * 5);
  const flower = r(9) > 0.93;
  m4.compose(new THREE.Vector3(t.x + r(1), rowLevel[t.y] * LH, t.y + r(2)), new THREE.Quaternion().setFromEuler(new THREE.Euler((r(3) - 0.5) * 0.5, r(4) * 6, (r(5) - 0.5) * 0.5)), new THREE.Vector3(flower ? 1.6 : 1, flower ? 0.9 : 0.6 + r(6) * 0.9, flower ? 1.6 : 1));
  blades.setMatrixAt(i * BLADES + j, m4); blades.setColorAt(i * BLADES + j, new THREE.Color(flower ? PETALS[Math.floor(r(7) * 3)] : GREENS[Math.floor(r(8) * 4)]));
} });
blades.receiveShadow = true; world.add(blades);

// ---------- the cloud sea ----------
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
const cloudTex = new THREE.CanvasTexture(cloudCanvas()); cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping; cloudTex.repeat.set(10, 10); cloudTex.colorSpace = THREE.SRGBColorSpace;
const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshLambertMaterial({ map: cloudTex }));
sea.rotation.x = -Math.PI / 2; sea.position.set(W / 2, CLIFF_BASE + 0.6, H / 2); sea.receiveShadow = true; scene.add(sea);
const puffMat = new THREE.MeshLambertMaterial({ color: 0xf2f5fa, transparent: true, opacity: 0.92 });
const puffs: { g: THREE.Group; v: number }[] = [];
for (let i = 0; i < 26; i++) {
  const g = new THREE.Group(), n = 3 + Math.floor(hash2(i, 9) * 4);
  for (let j = 0; j < n; j++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + hash2(i, j) * 0.9, 2), puffMat); s.position.set(j * 0.8 - n * 0.4, hash2(j, i) * 0.4, (hash2(i + 3, j) - 0.5) * 0.8); s.scale.y = 0.55; g.add(s); }
  let px = 0, pz = 0, tries = 0;
  do { tries++; px = -14 + hash2(i, 31 + tries) * (W + 28); pz = -10 + hash2(i, 37 + tries * 7) * (H + 20); } while (tries < 50 && px > 1 && px < W - 1 && pz > 0 && pz < H);
  g.position.set(px, CLIFF_BASE + 1 + hash2(i, 41) * 2.6, pz); scene.add(g); puffs.push({ g, v: 0.15 + hash2(i, 43) * 0.25 });
}

// ---------- figures ----------
const loader = new THREE.TextureLoader();
interface Figure { obj: THREE.Group; body: THREE.Mesh; x: number; z: number; face: 1 | -1; phase: number; moving: boolean; height: number; name?: string; baseFace: 1 | -1 }
const figures: Figure[] = [];
const figMats: THREE.MeshStandardMaterial[] = [];
function figure(file: string, height: number, x: number, z: number, baseFace: 1 | -1 = 1, name?: string): Figure {
  const obj = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, emissive: 0xffffff, emissiveIntensity: 0.3 }); figMats.push(mat);
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
  const body = new THREE.Mesh(geo, mat); body.castShadow = true; obj.add(body);
  loader.load(file, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; mat.map = t; mat.emissiveMap = t; mat.needsUpdate = true; body.scale.set(height * t.image.width / t.image.height, height, 1); });
  body.scale.set(0.001, 0.001, 1);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; blob.scale.set(height / 1.5, height / 2.4, 1); obj.add(blob);
  world.add(obj);
  const f: Figure = { obj, body, x, z, face: baseFace, phase: 0, moving: false, height, name, baseFace };
  figures.push(f); return f;
}
const spawn = map.spawn();
const rhea = figure("./battle/rhea.webp", 1.55, spawn.x + 0.5, spawn.y + 0.6, 1, "Rhea");
const ash = figure("./battle/ash.webp", 1.0, spawn.x - 0.6, spawn.y + 0.9, 1);
const tamsin = figure("./battle/tamsin.webp", 1.55, 16.6, 9.6, -1, "Tamsin");
const buck = figure("./battle/loftbuck.webp", 1.25, 9.5, 16.2, 1);
const doe = figure("./battle/terrace-doe.webp", 0.95, 20.5, 15.4, -1);
const lantern = new THREE.PointLight(0xffc070, 0, 6, 2); world.add(lantern);

// ---------- light, sky and the times of day ----------
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
sun.target.position.set(W / 2, 0, H / 2); scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x6a5a40, 1); scene.add(hemi);

function skyCanvas(top: string, mid: string, bottom: string): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 4; c.height = 256; const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(0.6, mid); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
interface Mood { name: string; sky: THREE.Texture; fog: number; sun: number; sunI: number; sunDir: [number, number, number]; hemiSky: number; hemiGround: number; hemiI: number; windows: number; lamps: number; lantern: number; cloud: number; exposure: number; bloom: number; selfLit: number }
const MOODS: Mood[] = [
  { name: "Afternoon", sky: skyCanvas("#6f9fd8", "#a9c6e6", "#dfe8f0"), fog: 0xc9d6e4, sun: 0xfff0d8, sunI: 2.6, sunDir: [-0.6, 1, 0.55], hemiSky: 0xbcd4ff, hemiGround: 0x6a5a40, hemiI: 1.1, windows: 0, lamps: 0, lantern: 0, cloud: 0xffffff, exposure: 1.0, bloom: 0.15, selfLit: 0.22 },
  { name: "Dusk", sky: skyCanvas("#34386a", "#c07a80", "#f4b070"), fog: 0xd8a080, sun: 0xffa060, sunI: 2.4, sunDir: [-1, 0.38, 0.45], hemiSky: 0x9a8ac0, hemiGround: 0x4a3430, hemiI: 1.0, windows: 2.2, lamps: 3, lantern: 0, cloud: 0xf4c4b0, exposure: 1.05, bloom: 0.4, selfLit: 0.3 },
  { name: "Night", sky: skyCanvas("#03050f", "#0c1430", "#1a2850"), fog: 0x101a34, sun: 0x8aa4ff, sunI: 0.45, sunDir: [0.5, 1, -0.3], hemiSky: 0x3a4a90, hemiGround: 0x141020, hemiI: 0.7, windows: 3.2, lamps: 5, lantern: 2.2, cloud: 0x52608a, exposure: 1.15, bloom: 0.5, selfLit: 0.12 },
];
let mood = 0;
scene.fog = new THREE.Fog(0xc9d6e4, 24, 70);
function applyMood(): void {
  const m = MOODS[mood];
  scene.background = m.sky; (scene.fog as THREE.Fog).color.setHex(m.fog);
  sun.color.setHex(m.sun); sun.intensity = m.sunI; sun.position.set(W / 2 + m.sunDir[0] * 30, m.sunDir[1] * 30, H / 2 + m.sunDir[2] * 30);
  hemi.color.setHex(m.hemiSky); hemi.groundColor.setHex(m.hemiGround); hemi.intensity = m.hemiI;
  windowMat.emissiveIntensity = m.windows; lamps.forEach((l) => { l.intensity = m.lamps; }); lantern.intensity = m.lantern;
  (sea.material as THREE.MeshLambertMaterial).color.setHex(m.cloud); puffMat.color.setHex(m.cloud);
  renderer.toneMappingExposure = m.exposure; bloom.strength = m.bloom; figMats.forEach((f) => { f.emissiveIntensity = m.selfLit; });
}

// ---------- renderer and the camera's lens ----------
const view = document.getElementById("view")!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
view.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.6, 0.82); composer.addPass(bloom);
const tiltH = new ShaderPass(HorizontalTiltShiftShader), tiltV = new ShaderPass(VerticalTiltShiftShader);
tiltH.uniforms.r.value = tiltV.uniforms.r.value = 0.55;
composer.addPass(tiltH); composer.addPass(tiltV); composer.addPass(new OutputPass());
function resize(): void {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  tiltH.uniforms.h.value = 2.2 / w; tiltV.uniforms.v.value = 2.2 / h;
}
addEventListener("resize", resize); resize(); applyMood();

// ---------- input ----------
const keys = new Set<string>();
addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if (e.key.toLowerCase() === "t") { mood = (mood + 1) % MOODS.length; applyMood(); }
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
let yaw = 0, yawTarget = 0, dist = 28, distTarget = 28;
addEventListener("wheel", (e) => { distTarget = Math.max(10, Math.min(44, distTarget + Math.sign(e.deltaY) * 1.5)); }, { passive: true });
document.getElementById("turnL")!.onclick = () => { yawTarget -= Math.PI / 4; };
document.getElementById("turnR")!.onclick = () => { yawTarget += Math.PI / 4; };
document.getElementById("time")!.onclick = () => { mood = (mood + 1) % MOODS.length; applyMood(); };
let drag: { x: number; y: number; dx: number; dy: number } | null = null;
renderer.domElement.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; });
addEventListener("pointermove", (e) => { if (drag) { drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y; } });
addEventListener("pointerup", () => { drag = null; });

// ---------- movement ----------
const solid = (px: number, pz: number) => map.solidAt(Math.floor(px), Math.floor(pz));
const R = 0.22;
const blocked = (px: number, pz: number) => solid(px - R, pz - R) || solid(px + R, pz - R) || solid(px - R, pz + R) || solid(px + R, pz + R);
function moveFig(f: Figure, dx: number, dz: number): void {
  if (!blocked(f.x + dx, f.z)) f.x += dx;
  if (!blocked(f.x, f.z + dz)) f.z += dz;
}
const trail: { x: number; z: number }[] = [];
function wander(f: Figure, dt: number, home: { x: number; z: number }, state: { tx: number; tz: number; wait: number }): void {
  state.wait -= dt;
  if (state.wait > 0) { f.moving = false; return; }
  const dx = state.tx - f.x, dz = state.tz - f.z, d = Math.hypot(dx, dz);
  if (d < 0.1) { state.wait = 2 + Math.random() * 4; state.tx = home.x + (Math.random() - 0.5) * 4; state.tz = home.z + (Math.random() - 0.5) * 1.6; return; }
  const sp = 0.7 * dt; const bx = f.x, bz = f.z; moveFig(f, (dx / d) * sp, (dz / d) * sp);
  if (Math.hypot(f.x - bx, f.z - bz) < sp * 0.3) { state.wait = 1; state.tx = f.x; state.tz = f.z; }
  f.moving = true; setFace(f, dx, dz);
}
const camRight = new THREE.Vector3();
function setFace(f: Figure, dx: number, dz: number): void {
  const s = dx * camRight.x + dz * camRight.z;
  if (Math.abs(s) > 0.02) f.face = (s > 0 ? 1 : -1) as 1 | -1;
}
const buckState = { tx: 9.5, tz: 16.2, wait: 1 }, doeState = { tx: 20.5, tz: 15.4, wait: 3 };

// ---------- the loop ----------
const label = document.getElementById("label")!;
const place = document.getElementById("place")!;
setTimeout(() => { place.style.opacity = "1"; }, 400); setTimeout(() => { place.style.opacity = "0"; }, 3400);
const clock = new THREE.Clock();
const camTarget = new THREE.Vector3(rhea.x, 0, rhea.z);
function frame(): void {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  yaw += (yawTarget - yaw) * Math.min(1, dt * 6); dist += (distTarget - dist) * Math.min(1, dt * 6);
  camRight.set(Math.cos(yaw), 0, -Math.sin(yaw));
  const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  if (keys.has("q")) { yawTarget -= dt * 1.8; } if (keys.has("e")) { yawTarget += dt * 1.8; }

  // Rhea
  let ix = 0, iz = 0;
  if (keys.has("arrowleft") || keys.has("a")) ix -= 1; if (keys.has("arrowright") || keys.has("d")) ix += 1;
  if (keys.has("arrowup") || keys.has("w")) iz += 1; if (keys.has("arrowdown") || keys.has("s")) iz -= 1;
  if (drag && Math.hypot(drag.dx, drag.dy) > 12) { const l = Math.hypot(drag.dx, drag.dy); ix = drag.dx / l; iz = -drag.dy / l; }
  if (ix || iz) {
    const l = Math.hypot(ix, iz), run = keys.has("shift") || (drag && Math.hypot(drag.dx, drag.dy) > 90) ? 5.2 : 3.0;
    const mx = (camRight.x * ix + fwd.x * iz) / l * run * dt, mz = (camRight.z * ix + fwd.z * iz) / l * run * dt;
    moveFig(rhea, mx, mz); rhea.moving = true; setFace(rhea, mx, mz);
    rhea.phase += dt * run * 3.2;
  } else rhea.moving = false;
  trail.push({ x: rhea.x, z: rhea.z }); if (trail.length > 40) trail.shift();
  // Ash keeps a step behind
  const back = trail[0], adx = back.x - ash.x, adz = back.z - ash.z, ad = Math.hypot(adx, adz);
  if (Math.hypot(rhea.x - ash.x, rhea.z - ash.z) > 1.2 && ad > 0.05) { const sp = Math.min(ad, 5.5 * dt); moveFig(ash, adx / ad * sp, adz / ad * sp); ash.moving = true; setFace(ash, adx, adz); }
  else ash.moving = false;
  wander(buck, dt, { x: 9.5, z: 16.2 }, buckState); wander(doe, dt, { x: 20.5, z: 15.5 }, doeState);
  // Tamsin turns to look at Rhea when she comes close
  if (Math.hypot(rhea.x - tamsin.x, rhea.z - tamsin.z) < 3) setFace(tamsin, rhea.x - tamsin.x, rhea.z - tamsin.z);

  for (const f of figures) {
    if (f.moving) f.phase += dt * 9;
    const bob = f.moving ? Math.abs(Math.sin(f.phase)) * 0.06 : Math.sin(t * 2 + f.x) * 0.006;
    f.obj.position.set(f.x, groundY(f.x, f.z), f.z);
    f.obj.rotation.y = yaw + (f.face === 1 ? 0 : Math.PI);
    f.body.position.y = bob;
    f.body.rotation.z = f.moving ? -Math.sin(f.phase) * 0.035 : 0;
  }
  lantern.position.set(rhea.x + camRight.x * 0.45 * rhea.face, groundY(rhea.x, rhea.z) + 0.75, rhea.z + camRight.z * 0.45 * rhea.face + 0.3);

  // camera
  camTarget.lerp(new THREE.Vector3(rhea.x, groundY(rhea.x, rhea.z), rhea.z), Math.min(1, dt * 4));
  const pitch = 0.86;
  camera.position.set(camTarget.x + Math.sin(yaw) * Math.cos(pitch) * dist, camTarget.y + Math.sin(pitch) * dist, camTarget.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(camTarget.x, camTarget.y + 0.6, camTarget.z);

  { const f = scene.fog as THREE.Fog; f.near = dist + 6; f.far = dist + 60; }
  // the air
  swayTrees(t);
  cloudTex.offset.x = t * 0.004; cloudTex.offset.y = t * 0.0015;
  for (const p of puffs) { p.g.position.x += p.v * dt; if (p.g.position.x > W + 16) p.g.position.x = -16; }
  if (mood > 0) lamps.forEach((l, i) => { l.intensity = MOODS[mood].lamps * (0.9 + Math.sin(t * 9 + i * 2) * 0.05 + Math.sin(t * 23 + i) * 0.04); });

  // name over Tamsin when Rhea is near
  if (Math.hypot(rhea.x - tamsin.x, rhea.z - tamsin.z) < 2.2) {
    const p = new THREE.Vector3(tamsin.x, groundY(tamsin.x, tamsin.z) + tamsin.height + 0.15, tamsin.z).project(camera);
    label.style.left = `${(p.x + 1) / 2 * innerWidth}px`; label.style.top = `${(1 - p.y) / 2 * innerHeight}px`; label.textContent = "Tamsin";
  } else label.textContent = "";

  composer.render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
void TILE;
// for screenshots and tests
(window as unknown as Record<string, unknown>).__lark3d = { setMood: (i: number) => { mood = i; applyMood(); }, rhea, setYaw: (y: number) => { yaw = yawTarget = y; }, setDist: (d: number) => { dist = distTarget = d; } };
