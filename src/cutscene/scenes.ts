// The story's cut scenes. Each is a few shots painted in code from the same people, kith and places the player
// already knows. They are wordless: the lines that follow carry the words. A scene only ever shows the moment it
// is hooked to (src/cutscene/hooks.ts), so nothing here gives away what comes later.
import { sfx } from "../audio/music";
import type { CutDef, Layer, Shot } from "./cutsceneScene";
import {
  VH, VW, cloudSea, haze, hillY, rays, embers, face, figure, fire, flakes, focusLines, fog, glow, houses, orb, ridge, rnd, shade, sky, smoke, smooth, stars, terraces,
  clamp01, type G, type House,
} from "./kit";

const L = (pf: number, draw: Layer["draw"]): Layer => ({ pf, draw });
const C = (x: number, y: number, z = 1, r = 0) => ({ x, y, z, r });

// ------------------------------------------------------------------ shared places
const HILL_BASE = 150, PEAK: [number, number] = [262, 66];
const LARK_HOUSES = [128, 150, 171, 190, 207, 224, 240];
/** Larkfold's hill: the slope, its terraces and houses, the drying house at the top. */
function larkHill(g: G, t: number, opts: { burnt?: boolean; lit?: number } = {}): void {
  const burnt = !!opts.burnt;
  const gr = g.createLinearGradient(0, PEAK[1], 0, HILL_BASE + 30); gr.addColorStop(0, burnt ? "#2a2422" : "#5e7a40"); gr.addColorStop(1, burnt ? "#0e0b0a" : "#26341e");
  g.fillStyle = gr; g.beginPath(); g.moveTo(-60, 200); for (let x = -60; x <= 380; x += 3) g.lineTo(x, hillY(x, HILL_BASE, PEAK)); g.lineTo(380, 200); g.fill();
  g.strokeStyle = burnt ? "rgba(255,140,80,.3)" : "rgba(255,226,170,.55)"; g.lineWidth = 0.6; g.beginPath(); for (let x = -60; x <= 380; x += 3) (x === -60 ? g.moveTo(x, hillY(x, HILL_BASE, PEAK)) : g.lineTo(x, hillY(x, HILL_BASE, PEAK))); g.stroke();
  terraces(g, HILL_BASE, PEAK, 11, 90, 300, "#6a8e4a", burnt ? "#1a1412" : "#7a6e5a", burnt);
  const list: House[] = LARK_HOUSES.map((x, i) => ({ x, y: hillY(x + 6, HILL_BASE, PEAK) + 4, w: 11 + (i % 3) * 2, h: 7 + (i % 2) }));
  houses(g, list, t, burnt ? "#000" : "#c0a488", burnt ? "#000" : "#7a4a32", opts.lit ?? 0, burnt);
  const dx = 252, dy = hillY(dx + 18, HILL_BASE, PEAK) + 3; // the long drying house
  if (burnt) houses(g, [{ x: dx, y: dy, w: 36, h: 10, roof: 8 }], t, "#000", "#000", 0, true);
  else { g.fillStyle = "#a88a6c"; g.fillRect(dx, dy - 10, 36, 10); g.fillStyle = "#d2aa62"; g.beginPath(); g.moveTo(dx - 3, dy - 10); g.lineTo(dx + 18, dy - 20); g.lineTo(dx + 39, dy - 10); g.fill(); }
}
const chimneys = (): [number, number][] => LARK_HOUSES.filter((_, i) => i % 2 === 0).map((x) => [x + 3, hillY(x + 6, HILL_BASE, PEAK) - 6]);

// ------------------------------------------------------------------ the prologue
const larkfoldDawn: CutDef = {
  id: "larkfold-dawn", music: "larkfold",
  shots: [
    { dur: 5.2, from: C(160, 84, 1), to: C(178, 88, 1.14), layers: [
      L(0, (g, f) => { sky(g, [[0, "#1c2a4e"], [0.35, "#5a5a86"], [0.62, "#e8a084"], [0.8, "#ffd59a"], [1, "#ffe9c2"]]); stars(g, 70, f.T, 1 - smooth(0, 4, f.T)); }),
      L(0.1, (g, f) => { orb(g, 236, 104 - f.T * 2.2, 9, "#fff6dc", "rgba(255,214,150,.55)", 70); rays(g, 236, 104 - f.T * 2.2, f.T, "rgba(255,226,180,.5)", 11, 300); }),
      L(0.2, (g) => { ridge(g, 5.3, 94, 18, "#8a7aa0", "#6a6088", "rgba(255,220,190,.4)"); haze(g, 98, 10, "rgba(255,200,170,.35)"); }),
      L(0.3, (g) => { ridge(g, 1.1, 104, 22, "#5a5a86", "#3e3e66", "rgba(255,210,170,.5)"); haze(g, 108, 8, "rgba(255,190,160,.3)"); }),
      L(0.45, (g, f) => cloudSea(g, 112, f.T, "#ffd8c0", "#c890a0", 4, 2.2)),
      L(0.8, (g, f) => { larkHill(g, f.T, { lit: 0.6 }); smoke(g, chimneys(), f.T, [235, 225, 220], 0.16, 50); }),
    ] },
    { dur: 5, from: C(196, 96, 1.7), to: C(214, 90, 1.95), into: "dissolve", layers: [
      L(0, (g) => sky(g, [[0, "#7a86b8"], [0.5, "#f0b494"], [1, "#ffe0b0"]])),
      L(0.4, (g, f) => cloudSea(g, 116, f.T, "#ffe2cc", "#d8a0a8", 3, 2)),
      L(1, (g, f) => {
        larkHill(g, f.T, { lit: 0.35 });
        smoke(g, chimneys(), f.T, [240, 232, 226], 0.18, 44);
        figure(g, "loftbuck:#c8b090", 182, hillY(182, HILL_BASE, PEAK) + 3, 0.3, { t: f.T });
        figure(g, "loftbuck:#9a8a70", 230, hillY(230, HILL_BASE, PEAK) + 3, 0.27, { t: f.T + 1, flip: true });
        for (let i = 0; i < 4; i++) { const x = (f.T * 9 + i * 30) % 140 + 160, y = 60 + Math.sin(f.T * 3 + i) * 2 - i * 3; g.strokeStyle = "rgba(40,30,40,.7)"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x - 2, y - 1 + Math.sin(f.T * 12 + i)); g.lineTo(x, y); g.lineTo(x + 2, y - 1 + Math.sin(f.T * 12 + i)); g.stroke(); }
      }),
    ] },
    { dur: 4.4, from: C(150, 96, 1.3), to: C(156, 92, 1.5), into: "dissolve", layers: [
      L(0, (g) => sky(g, [[0, "#9aa8d0"], [0.55, "#ffd0a8"], [1, "#fff0d0"]])),
      L(0.3, (g, f) => { orb(g, 250, 70, 10, "#fff8e8", "rgba(255,226,170,.6)", 90); cloudSea(g, 104, f.T, "#fff0e0", "#e0b0b0", 4, 2.6); }),
      L(1, (g, f) => {
        const tg = g.createLinearGradient(0, 118, 0, 180); tg.addColorStop(0, "#6a8a46"); tg.addColorStop(1, "#24301c");
        g.fillStyle = tg; g.beginPath(); g.moveTo(-60, 200); g.lineTo(-60, 122); for (let x = -60; x <= 214; x += 4) g.lineTo(x, 122 + Math.sin(x * 0.05) * 1.5 + (x > 190 ? (x - 190) * 0.4 : 0)); g.lineTo(226, 200); g.fill();
        rock(g, [[200, 128], [214, 124], [230, 150], [236, 200], [204, 200]], "#7a7062", "#3a362e");
        for (let i = 0; i < 70; i++) { const x = -50 + rnd(i, 1) * 250, y = 124 + rnd(i, 2) * 50; g.fillStyle = shade("#6a8a46", 0.1 + rnd(i, 3) * 0.3); g.fillRect(x, y, 1.4, 0.9); }
        g.strokeStyle = "rgba(255,236,190,.6)"; g.lineWidth = 0.5; g.beginPath(); for (let x = -60; x <= 190; x += 4) (x === -60 ? g.moveTo(x, 122 + Math.sin(x * 0.05) * 1.5) : g.lineTo(x, 122 + Math.sin(x * 0.05) * 1.5)); g.stroke();
        // the warm spring steaming at the terrace edge
        g.fillStyle = "#6a8aa0"; g.beginPath(); g.ellipse(100, 128, 16, 3.5, 0, 0, 7); g.fill();
        g.fillStyle = "rgba(200,230,240,.6)"; g.beginPath(); g.ellipse(98, 127.4, 10, 1.4, 0, 0, 7); g.fill();
        for (let i = 0; i < 9; i++) { const a = (f.T * 0.35 + i / 9) % 1; glow(g, 92 + i * 2 + Math.sin(f.T + i) * 3, 126 - a * 34, 6 + a * 8, `rgba(255,250,245,${0.28 * Math.sin(a * Math.PI)})`); }
        figure(g, "rhea", 128, 124, 0.9, { t: f.T });
      }),
      L(1.3, (g, f) => { for (let i = 0; i < 40; i++) { const x = (rnd(i, 1) * 360 + f.T * 3) % 360 - 20, y = 40 + rnd(i, 2) * 110 + Math.sin(f.T + i) * 2; g.fillStyle = `rgba(255,240,200,${0.25 + 0.25 * Math.sin(f.T * 2 + i)})`; g.fillRect(x, y, 0.6, 0.6); } }),
    ] },
  ],
};

const lampSignal: CutDef = {
  id: "lamp-signal",
  shots: [
    { dur: 3.6, from: C(150, 96, 1), to: C(170, 90, 1.12), layers: [
      L(0, (g, f) => { sky(g, [[0, "#05070f"], [0.6, "#0f1630"], [1, "#1a2240"]]); stars(g, 160, f.T); }),
      L(0.3, (g) => { ridge(g, 2.4, 62, 30, "#121828", "#0a0e18", "rgba(120,140,190,.25)"); g.fillStyle = "#0c111e"; g.beginPath(); g.moveTo(230, 180); g.lineTo(238, 54); g.lineTo(262, 44); g.lineTo(300, 58); g.lineTo(330, 180); g.fill(); }),
      L(0.45, (g, f) => cloudSea(g, 120, f.T, "#2a3450", "#121a2c", 3, 1)),
      L(1, (g, f) => {
        g.fillStyle = "#06080e"; g.beginPath(); g.moveTo(-20, 180); g.lineTo(-20, 150); g.quadraticCurveTo(80, 140, 150, 160); g.lineTo(150, 180); g.fill();
        figure(g, "tamsin", 72, 152, 0.75, { t: f.T }, { tint: "#06080e" });
        figure(g, "rhea", 98, 154, 0.78, { t: f.T + 0.5 }, { tint: "#06080e" });
      }),
    ] },
    { dur: 4.4, from: C(262, 52, 3.2), to: C(262, 50, 3.6), into: "cut", vignette: 0.75, layers: [
      L(0, (g, f) => { sky(g, [[0, "#05070f"], [1, "#121a30"]]); stars(g, 120, f.T, 0.8); }),
      L(1, (g, f) => {
        g.fillStyle = "#0c111e"; g.beginPath(); g.moveTo(230, 180); g.lineTo(238, 54); g.lineTo(262, 44); g.lineTo(300, 58); g.lineTo(330, 180); g.fill();
        // once, twice, three times; then it goes out
        const t = f.t, on = [0.6, 1.4, 2.2].some((a) => t > a && t < a + 0.45);
        if (on) { glow(g, 262, 50, 12, "rgba(255,190,100,.6)"); glow(g, 262, 50, 2.6, "rgba(255,244,210,1)"); }
        fog(g, f.T, 56, 72, "rgba(70,84,120,1)", 0.35, 2);
      }),
    ] },
  ],
};

const larkfoldAsh: CutDef = {
  id: "larkfold-ash", music: "ash",
  shots: [
    { dur: 5.4, from: C(176, 92, 1.25), to: C(166, 92, 1), ease: "out", layers: [
      L(0, (g) => sky(g, [[0, "#3a3436"], [0.5, "#7a5a4a"], [0.85, "#c88a5a"], [1, "#e0a870"]])),
      L(0.15, (g) => orb(g, 70, 96, 8, "rgba(255,220,170,.8)", "rgba(240,160,100,.35)", 50)),
      L(0.3, (g) => ridge(g, 1.1, 100, 26, "#5a4e52", "#3a3236")),
      L(0.45, (g, f) => cloudSea(g, 114, f.T, "#b89488", "#6a5258", 3, 1.2)),
      L(0.8, (g, f) => { larkHill(g, f.T, { burnt: true }); smoke(g, [...chimneys(), [270, 72]], f.T, [60, 54, 52], 0.5, 140); }),
      L(1.2, (g, f) => flakes(g, 90, f.T, "#c8c0b8", 7, 0.7, 3)),
    ] },
    { dur: 4.2, from: C(160, 110, 1.6), to: C(160, 106, 1.75), into: "fade", layers: [
      L(0, (g) => sky(g, [[0, "#4a4244"], [1, "#b08066"]])),
      L(0.5, (g, f) => smoke(g, [[100, 140], [240, 130]], f.T, [50, 46, 46], 0.5, 120)),
      L(1, (g, f) => {
        g.fillStyle = "#1a1514"; g.fillRect(0, 130, VW, 60);
        houses(g, [{ x: 96, y: 132, w: 22, h: 14 }, { x: 196, y: 132, w: 26, h: 16 }, { x: 236, y: 132, w: 18, h: 12 }], f.T, "#000", "#000", 0, true);
        figure(g, "rhea", 160, 134, 0.75, { t: f.T }, { tint: "#6a6260", tintAmt: 0.35 });
      }),
      L(1.4, (g, f) => flakes(g, 70, f.T, "#d8d0c8", 6, 1, 2)),
    ] },
  ],
};

const rookGone: CutDef = {
  id: "rook-gone", music: "grief",
  shots: [
    { dur: 6.5, from: C(160, 120, 1.3), to: C(160, 64, 1.1), layers: [
      L(0, (g) => sky(g, [[0, "#5a5a62"], [0.6, "#8a7a74"], [1, "#b09080"]])),
      L(0.4, (g, f) => smoke(g, [[60, 150], [260, 150]], f.T, [70, 66, 66], 0.35, 160)),
      L(1, (g, f) => {
        g.fillStyle = "#1e1a18"; g.fillRect(-40, 150, VW + 80, 60);
        g.fillStyle = "#2a2420"; g.fillRect(159, 30, 2.4, 122);
        // the torn flag, moving in what little wind there is
        g.fillStyle = "#8a2a24"; g.beginPath(); g.moveTo(161.4, 34);
        for (let i = 0; i <= 10; i++) { const x = 161.4 + i * 2.6, w = Math.sin(f.T * 2 + i * 0.6) * (i * 0.25); g.lineTo(x, 34 + w); }
        for (let i = 10; i >= 0; i--) { const x = 161.4 + i * 2.6, w = Math.sin(f.T * 2 + i * 0.6) * (i * 0.25); g.lineTo(x, 46 + w - (i > 7 ? (i - 7) * 2 : 0)); }
        g.fill();
        // one bird, going
        const bx = 120 + f.T * 14, by = 40 - f.T * 2; g.strokeStyle = "rgba(30,26,28,.8)"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(bx - 3, by - 1 + Math.sin(f.T * 9)); g.lineTo(bx, by); g.lineTo(bx + 3, by - 1 + Math.sin(f.T * 9)); g.stroke();
      }),
      L(1.3, (g, f) => flakes(g, 60, f.T, "#cfc8c0", 4, 0.8, 1)),
    ] },
  ],
};

const cloudColumn: CutDef = {
  id: "cloud-column",
  shots: [
    { dur: 5.6, from: C(92, 122, 2.1), to: C(146, 114, 2.25), ease: "linear", layers: [
      L(0, (g, f) => { sky(g, [[0, "#04060c"], [1, "#1a2236"]]); stars(g, 80, f.T, 0.5); }),
      L(0.4, (g, f) => fog(g, f.T, 60, 140, "rgba(80,94,124,1)", 0.5, 3)),
      L(1, (g, f) => {
        g.fillStyle = "#0e121c"; g.beginPath(); g.moveTo(-60, 180); g.lineTo(-60, 150); g.lineTo(360, 104); g.lineTo(380, 180); g.fill();
        for (let i = 0; i < 6; i++) { const x = -10 + i * 66, y = 150 - (x + 60) * 0.109; for (let k = 0; k < 4; k++) { g.fillStyle = "#1a1f2c"; g.beginPath(); g.ellipse(x, y - 2 - k * 2.6, 3.4 - k * 0.6, 1.5, 0, 0, 7); g.fill(); } }
        // the column: Corran first, with the lamp, Wardens behind
        const lead = 70 + f.t * 14;
        const at = (x: number) => 150 - (x + 60) * 0.109 + 1;
        for (let i = 4; i >= 1; i--) { const x = lead - i * 17; figure(g, "warden", x, at(x), 0.55, { t: f.T + i, run: f.T * 6 + i, stride: 0.35 }, { tint: "#0a0d16", tintAmt: 0.8 }); }
        figure(g, "corran", lead, at(lead), 0.58, { t: f.T, run: f.T * 6, stride: 0.35 }, { tint: "#14100e", tintAmt: 0.55 });
        glow(g, lead + 6, at(lead) - 16, 18, "rgba(255,180,90,.35)"); glow(g, lead + 6, at(lead) - 16, 3, "rgba(255,236,190,.95)");
      }),
      L(1.3, (g, f) => fog(g, f.T * 1.5, 120, 180, "rgba(90,104,136,1)", 0.55, 5)),
    ] },
    { dur: 4, from: C(160, 92, 1), to: C(160, 90, 1.12), into: "dissolve", vignette: 0.8, layers: [
      L(0, (g) => sky(g, [[0, "#06080e"], [1, "#141a28"]])),
      L(0.6, (g, f) => fog(g, f.T, 40, 150, "rgba(70,84,110,1)", 0.45, 3)),
      L(1, (g, f) => { glow(g, 214, 128, 60, "rgba(255,170,80,.35)"); face(g, "corran", 160, 84, 150, { dark: 0.62, light: "rgba(255,170,90,1)", lightAmt: 0.45 }); glow(g, 214, 128, 4 + Math.sin(f.T * 9) * 0.4, "rgba(255,240,200,.9)"); }),
      L(1.3, (g, f) => fog(g, f.T * 1.4, 120, 180, "rgba(80,94,124,1)", 0.4, 6)),
    ] },
  ],
};

/** The drying house at the top of Larkfold, big, at night. */
function dryingHouse(g: G, x: number, y: number, w: number): void {
  g.fillStyle = "#1a1612"; g.fillRect(x, y - 16, w, 16);
  g.fillStyle = "#2a2018"; g.beginPath(); g.moveTo(x - 6, y - 16); g.lineTo(x + w / 2, y - 40); g.lineTo(x + w + 6, y - 16); g.fill();
  g.strokeStyle = "#3a2c20"; g.lineWidth = 0.4; for (let i = 0; i < 18; i++) { const xx = x - 4 + i * (w + 8) / 18; g.beginPath(); g.moveTo(xx, y - 16); g.lineTo(x + w / 2 + (xx - x - w / 2) * 0.1, y - 40); g.stroke(); }
}
const torches: CutDef = {
  id: "torches", music: "fire",
  shots: [
    { dur: 3.4, from: C(160, 100, 1.1), to: C(160, 96, 1.2), cues: [[0.4, () => sfx.door()], [1.1, () => sfx.door()], [1.8, () => sfx.door()]], layers: [
      L(0, (g, f) => { sky(g, [[0, "#05060c"], [1, "#161a28"]]); stars(g, 90, f.T, 0.7); }),
      L(1, (g, f) => {
        houses(g, [{ x: 40, y: 140, w: 30, h: 20 }, { x: 90, y: 136, w: 26, h: 18 }, { x: 200, y: 136, w: 28, h: 18 }, { x: 250, y: 140, w: 34, h: 22 }], f.T, "#10121a", "#0a0b10", 0.5);
        g.fillStyle = "#0a0b10"; g.fillRect(-40, 140, VW + 80, 60);
        // torches catching, one after another, down the lane
        for (let i = 0; i < 9; i++) {
          const at = 0.3 + i * 0.28; if (f.t < at) continue;
          const x = 60 + i * 24 + rnd(i, 1) * 8, y = 128 + rnd(i, 2) * 10, k = clamp01((f.t - at) / 0.3);
          fire(g, x - 1.5, x + 1.5, y, 7 * k, f.T + i, 1);
          g.fillStyle = "#2a1a10"; g.fillRect(x - 0.4, y, 0.8, 10);
        }
      }),
    ] },
    { dur: 5, from: C(160, 104, 1.05), to: C(160, 98, 1.3), into: "cut", shake: (p) => p * 1.2, cues: [[0.2, () => sfx.door()], [1.4, () => sfx.hit()]], layers: [
      L(0, (g, f) => sky(g, [[0, "#0a0608"], [0.6, shade("#2a1010", Math.min(0.6, f.p * 0.5))], [1, shade("#6a2410", f.p * 0.4)]])),
      L(0.5, (g, f) => smoke(g, [[130, 110], [190, 100]], f.T, [30, 20, 18], 0.7, 120)),
      L(1, (g, f) => {
        dryingHouse(g, 100, 150, 120);
        g.fillStyle = "#08070a"; g.fillRect(-40, 150, VW + 80, 60);
        const reach = 100 + 130 * smooth(0, 0.85, f.p);
        fire(g, 98, reach, 136, 30 + f.p * 30, f.T, 1);
        fire(g, 100, Math.min(220, reach), 150, 14, f.T + 3, 0.9);
        embers(g, 80, f.T, 100, reach, 120, 110, 12);
      }),
    ] },
  ],
};

// ------------------------------------------------------------------ the Commons
const handsUp: CutDef = {
  id: "hands-up", music: "tender",
  shots: [
    { dur: 6.4, from: C(160, 112, 1.15), to: C(160, 108, 1.35), layers: [
      L(0, (g, f) => { sky(g, [[0, "#04050a"], [1, "#141420"]]); stars(g, 60, f.T, 0.6); }),
      L(1, (g, f) => {
        glow(g, 160, 136, 110, "rgba(255,140,60,.28)");
        g.fillStyle = "#0e0a0a"; g.fillRect(-40, 140, VW + 80, 60);
        // people round the fire, lit from it; one hand goes up, then another, then enough
        const seats: [string, number, number, number][] = [["soldier", 70, 150, 0.95], ["ferris", 98, 148, 0.92], ["soldier", 124, 140, 0.75], ["tamsin", 202, 140, 0.75], ["ketti", 226, 148, 0.8], ["soldier", 252, 150, 0.95], ["oda", 112, 136, 0.62], ["soldier", 210, 136, 0.62]];
        const order = [...seats.keys()].sort((a, b) => seats[a][2] - seats[b][2]);
        for (const i of order) {
          const [look, x, y, s] = seats[i], side = x < 160 ? 1 : -1, up = [0.5, 1.2, 2.0, 2.5, 3.1, 3.7, -1, 4.2][i];
          figure(g, look, x, y, s, { t: f.T + i, flip: side < 0 }, { tint: "#0d0909", tintAmt: 0.9 });
          if (up < 0) continue;
          const k = smooth(up, up + 0.45, f.t), sx = x + side * 3.5 * s, sy = y - 37 * s, hx = sx + side * (2 + 3 * k) * s, hy = sy + (10 - 30 * k) * s;
          g.strokeStyle = "#0d0909"; g.lineWidth = 3.2 * s; g.lineCap = "round"; g.beginPath(); g.moveTo(sx, sy); g.lineTo(hx, hy); g.stroke();
          g.fillStyle = "#0d0909"; g.beginPath(); g.arc(hx, hy - 1.2 * s, 2.2 * s, 0, 7); g.fill(); // the hand
          g.strokeStyle = `rgba(255,170,90,${0.3 * k})`; g.lineWidth = 0.5 * s; g.beginPath(); g.moveTo(sx + side * 1.4 * s, sy); g.lineTo(hx + side * 1.4 * s, hy); g.stroke();
          
        }
        fire(g, 150, 170, 142, 22, f.T, 1);
        embers(g, 50, f.T, 145, 175, 136, 80, 6);
      }),
    ] },
  ],
};

// ------------------------------------------------------------------ Thornwick
const oldMother: CutDef = {
  id: "old-mother", music: "boss",
  shots: [
    { dur: 3, from: C(160, 100, 1), to: C(160, 96, 1.1), layers: [
      L(0, (g) => sky(g, [[0, "#06070a"], [1, "#1a1e24"]])),
      L(0.6, (g, f) => {
        g.fillStyle = "#14171c"; for (let i = 0; i < 6; i++) { const x = 20 + i * 56; g.fillRect(x, 20, 10, 140); g.beginPath(); g.arc(x + 33, 40, 28, Math.PI, 0); g.lineTo(x + 61, 20); g.lineTo(x + 5, 20); g.fill(); }
        glow(g, 60, 70, 40, "rgba(255,170,90,.25)"); glow(g, 270, 66, 34, "rgba(255,170,90,.2)");
        g.fillStyle = "#1c2026"; g.fillRect(90, 104, 150, 10);
        g.fillStyle = "#0a0c10"; g.beginPath(); g.ellipse(170, 104, 26, 7, 0, Math.PI, 0); g.fill();
        fog(g, f.T, 90, 140, "rgba(220,226,232,1)", 0.25, 4);
      }),
      L(1, (g, f) => {
        const lvl = 140 - f.p * 4;
        g.fillStyle = "#1e3440"; g.fillRect(-40, lvl, VW + 80, 80);
        for (let i = 0; i < 30; i++) { const x = rnd(i, 1) * VW, y = lvl + 2 + rnd(i, 2) * 30; g.fillStyle = `rgba(200,230,240,${0.15 + 0.15 * Math.sin(f.T * 3 + i)})`; g.fillRect(x + Math.sin(f.T + i) * 3, y, 6 + rnd(i, 3) * 8, 0.5); }
      }),
    ] },
    { dur: 3.6, from: C(170, 100, 1.4), to: C(170, 84, 1.75), into: "cut", shake: (p) => (p > 0.62 && p < 0.8 ? 3 : 0), cues: [[2.2, () => sfx.hit()], [2.25, () => sfx.miss()]], layers: [
      L(0, (g) => sky(g, [[0, "#06070a"], [1, "#161a20"]])),
      L(1, (g, f) => {
        g.fillStyle = "#1c2026"; g.fillRect(40, 112, 260, 12);
        glow(g, 150, 70, 80, "rgba(255,170,90,.18)");
        const rise = smooth(0.1, 0.7, f.p);
        figure(g, "reedcat:#8e8a82", 170, 114 + (1 - rise) * 10, 2.6, { t: f.T, brace: rise < 0.6 });
        figure(g, "reedcat:#b8b0a4", 132, 113, 0.9, { t: f.T + 2 });
        fog(g, f.T, 80, 130, "rgba(220,226,232,1)", 0.35, 6);
      }),
    ] },
    { dur: 1.7, from: C(186, 72, 2.4), to: C(186, 70, 2.7), into: "white", over: (g, f) => focusLines(g, VW / 2, VH / 2, f.T, "rgba(255,250,240,1)", 70, 50), layers: [
      L(0, (g) => sky(g, [[0, "#0a0b0e"], [1, "#22262c"]])),
      L(1, (g, f) => figure(g, "reedcat:#8e8a82", 170, 114, 2.6, { t: f.T })),
    ] },
  ],
};

/** A rock face: jagged edges, lit on one side. */
function rock(g: G, pts: [number, number][], lit: string, dark: string): void {
  const xs = pts.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, lit); gr.addColorStop(0.45, dark); gr.addColorStop(1, shade(dark.startsWith("#") ? dark : "#333333", -0.3));
  g.fillStyle = gr; g.beginPath();
  pts.forEach(([x, y], i) => { if (!i) g.moveTo(x, y); else { const [px, py] = pts[i - 1]; for (let k = 1; k <= 6; k++) { const t = k / 6; g.lineTo(px + (x - px) * t + (rnd(i * 7 + k, 3) - 0.5) * 3, py + (y - py) * t + (rnd(k, i * 5) - 0.5) * 3); } } });
  g.closePath(); g.fill();
  g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 0.5;
  for (let i = 0; i < 14; i++) { const x = x0 + rnd(i, 1) * (x1 - x0), y = Math.min(...pts.map((p) => p[1])) + 6 + rnd(i, 2) * 90; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd(i, 3) - 0.5) * 6, y + 6 + rnd(i, 4) * 10); g.stroke(); }
}
const springRuns: CutDef = {
  id: "spring-runs", music: "hope",
  shots: [
    { dur: 5.2, from: C(100, 106, 1.7), to: C(196, 104, 1.6), ease: "inout", layers: [
      L(0, (g) => sky(g, [[0, "#6a8cc4"], [0.6, "#e8d4b8"], [1, "#fff0d8"]])),
      L(0.2, (g, f) => { orb(g, 250, 60, 8, "#fffaf0", "rgba(255,236,190,.55)", 70); rays(g, 250, 60, f.T, "rgba(255,240,200,.35)", 9, 260); }),
      L(0.35, (g, f) => cloudSea(g, 120, f.T, "#fff6ea", "#c8bcc4", 3, 2)),
      L(0.7, (g) => { // the old house's walls and arches behind the yard
        g.fillStyle = "#8a7e6c"; g.fillRect(-60, 70, 290, 44);
        g.fillStyle = "#6a604f"; for (let i = 0; i < 9; i++) { const x = -40 + i * 30; g.beginPath(); g.moveTo(x, 112); g.lineTo(x, 88); g.arc(x + 9, 88, 9, Math.PI, 0); g.lineTo(x + 18, 112); g.fill(); }
        g.fillStyle = "#a09480"; g.fillRect(-60, 68, 290, 3);
      }),
      L(1, (g, f) => {
        g.fillStyle = "#9a9282"; g.fillRect(-60, 112, 300, 80); // the yard's flags
        g.strokeStyle = "rgba(60,54,44,.35)"; g.lineWidth = 0.4; for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo(-60 + i * 18, 112); g.lineTo(-80 + i * 22, 180); g.stroke(); } for (let r = 0; r < 5; r++) { g.beginPath(); g.moveTo(-60, 118 + r * r * 3); g.lineTo(240, 118 + r * r * 3); g.stroke(); }
        rock(g, [[236, 108], [250, 104], [262, 120], [262, 190], [236, 190]], "#7a7468", "#4a463e");
        // the basin brimming over, the channel running to the edge
        g.fillStyle = "#b4ac9a"; g.beginPath(); g.ellipse(80, 124, 26, 7, 0, 0, 7); g.fill();
        const wgr = g.createLinearGradient(56, 0, 104, 0); wgr.addColorStop(0, "#5a90b0"); wgr.addColorStop(0.5, "#b8e4f0"); wgr.addColorStop(1, "#5a90b0");
        g.fillStyle = wgr; g.beginPath(); g.ellipse(80, 123, 22.5, 5.2, 0, 0, 7); g.fill();
        for (let i = 0; i < 6; i++) { g.strokeStyle = `rgba(255,255,255,${0.5 - i * 0.07})`; g.lineWidth = 0.4; g.beginPath(); g.ellipse(80, 123, 4 + ((f.T * 6 + i * 3.5) % 20), 1 + ((f.T * 6 + i * 3.5) % 20) * 0.22, 0, 0, 7); g.stroke(); }
        g.fillStyle = "#4e7a96"; g.fillRect(102, 123, 136, 3.4);
        for (let i = 0; i < 34; i++) { const x = 102 + ((i * 5 + f.T * 44) % 136); g.fillStyle = "rgba(235,250,255,.85)"; g.fillRect(x, 123.4 + (i % 3) * 0.9, 3.5, 0.5); }
        for (let i = 0; i < 12; i++) { const a = (f.T * 0.25 + i / 12) % 1; glow(g, 64 + i * 3 + Math.sin(f.T + i) * 3, 120 - a * 40, 7 + a * 12, `rgba(255,255,255,${0.32 * Math.sin(a * Math.PI)})`); }
        figure(g, "tamsin", 150, 132, 0.62, { t: f.T, flip: true });
        figure(g, "rhea", 168, 134, 0.64, { t: f.T + 1, flip: true });
      }),
    ] },
    { dur: 4.8, from: C(176, 92, 1.1), to: C(176, 88, 1.18), into: "dissolve", layers: [
      L(0, (g) => sky(g, [[0, "#6a8ac0"], [0.6, "#f0d8b8"], [1, "#fff4dc"]])),
      L(0.15, (g, f) => { orb(g, 70, 50, 9, "#fffaf0", "rgba(255,236,190,.6)", 80); rays(g, 70, 50, f.T, "rgba(255,240,200,.3)", 8, 300); }),
      L(0.25, (g) => ridge(g, 2.2, 112, 16, "#a8a4b8", "#8a88a0", "rgba(255,240,220,.5)")),
      L(0.4, (g, f) => cloudSea(g, 128, f.T, "#fff8f0", "#cfc2c8", 4, 2)),
      L(1, (g, f) => {
        rock(g, [[146, 200], [150, 120], [156, 80], [180, 64], [252, 62], [272, 76], [286, 120], [292, 200]], "#9a9488", "#5a5650");
        g.fillStyle = "#8a8070"; g.fillRect(186, 46, 54, 18); g.fillStyle = "#6a5a4a"; g.beginPath(); g.moveTo(182, 46); g.lineTo(213, 31); g.lineTo(244, 46); g.fill(); // Thornwick on its hill
        g.fillStyle = "#5a4e40"; g.fillRect(226, 30, 6, 16); g.fillStyle = "#3a3028"; for (let i = 0; i < 4; i++) g.fillRect(192 + i * 12, 52, 3, 5);
        smoke(g, [[229, 30]], f.T, [240, 236, 230], 0.25, 40);
        // the water going over the edge, falling into the cloud
        for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(225,242,250,${0.45 + 0.1 * i})`; g.fillRect(155 + i * 0.5, 80, 0.8, 64); }
        for (let i = 0; i < 26; i++) { const y = 80 + ((i * 5 + f.T * 50) % 62); g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(154.8 + rnd(i, 1) * 2.8, y, 0.6, 2.4); }
        glow(g, 157, 138, 18, "rgba(255,255,255,.55)");
        for (let i = 0; i < 3; i++) { const x = (f.T * 10 + i * 40) % 160 + 60, y = 40 + i * 6; g.strokeStyle = "rgba(60,50,60,.7)"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x - 2, y - 1 + Math.sin(f.T * 11 + i)); g.lineTo(x, y); g.lineTo(x + 2, y - 1 + Math.sin(f.T * 11 + i)); g.stroke(); }
      }),
    ] },
  ],
};

// ------------------------------------------------------------------ Kell's Bridge
function bridge(g: G, y: number): void {
  g.fillStyle = "#1a120e";
  g.beginPath(); g.moveTo(-40, y); g.lineTo(360, y); g.lineTo(360, y + 8); for (let i = 5; i >= 0; i--) { const x0 = -20 + i * 64; g.lineTo(x0 + 60, y + 8); g.quadraticCurveTo(x0 + 32, y - 2 + 14, x0 + 4, y + 8); g.lineTo(x0, y + 30); g.lineTo(x0 - 4, y + 8); } g.lineTo(-40, y + 8); g.fill();
  for (let i = 0; i < 6; i++) g.fillRect(-24 + i * 64, y + 8, 8, 30);
}
const bridgeHood: CutDef = {
  id: "bridge-hood",
  shots: [
    { dur: 4.2, from: C(160, 96, 1.15), to: C(176, 92, 1.4), layers: [
      L(0, (g) => sky(g, [[0, "#3a2a40"], [0.45, "#a0504a"], [0.75, "#e88a4a"], [1, "#ffc070"]])),
      L(0.1, (g) => orb(g, 200, 104, 10, "#fff0c8", "rgba(255,170,90,.6)", 90)),
      L(0.3, (g) => ridge(g, 4.1, 104, 18, "#3a2430", "#24161e")),
      L(0.7, (g, f) => {
        const gr = g.createLinearGradient(0, 108, 0, 180); gr.addColorStop(0, "#e08a4a"); gr.addColorStop(1, "#5a2a24"); g.fillStyle = gr; g.fillRect(-60, 108, VW + 120, 80);
        for (let i = 0; i < 40; i++) { const x = 200 + (rnd(i, 1) - 0.5) * 60, y = 112 + rnd(i, 2) * 60; g.fillStyle = `rgba(255,220,150,${0.3 + 0.3 * Math.sin(f.T * 2 + i)})`; g.fillRect(x + Math.sin(f.T + i) * 2, y, 4 + rnd(i, 3) * 10, 0.5); }
      }),
      L(1, (g, f) => {
        bridge(g, 108);
        // the grey stops, turns, and comes back toward her, dragging him
        const turn = f.p > 0.35, back = smooth(0.4, 1, f.p) * 18;
        figure(g, "loftbuck:#a8acb0", 196 - back, 108, 0.62, { t: f.T, flip: !turn, run: turn ? f.T * 7 : 0, stride: 0.4 }, { tint: "#1a120e", tintAmt: 0.85 });
        figure(g, "finch", 210 - back * 0.8, 108, 0.6, { t: f.T, lunge: turn }, { tint: "#1a120e", tintAmt: 0.92 });
        g.fillStyle = "#1a120e"; g.beginPath(); g.ellipse(210 - back * 0.8 + 1, 108 - 30.5, 3.2, 3.6, 0, 0, 7); g.fill(); // the sack over his head
      }),
    ] },
    { dur: 2.6, from: C(160, 90, 1), to: C(160, 88, 1.06), into: "cut", vignette: 0.75, cues: [[0.6, () => sfx.door()]], layers: [
      L(0, (g) => sky(g, [[0, "#6a3030"], [1, "#e08a4a"]])),
      L(1, (g, f) => {
        face(g, "finch", 160, 76, 150, { dark: 0.45, light: "rgba(255,160,80,1)", lightAmt: 0.55 });
        // the sack slides off and away
        const k = smooth(0.2, 0.85, f.p), sy = 70 + k * 120, sx = 160 + k * 30;
        g.save(); g.translate(sx, sy); g.rotate(k * 0.5);
        const sg = g.createLinearGradient(-50, -50, 50, 60); sg.addColorStop(0, "#5a4430"); sg.addColorStop(1, "#1e140c");
        g.fillStyle = sg; g.beginPath(); g.moveTo(-50, 64);
        for (let i = 0; i <= 20; i++) { const a = Math.PI + (i / 20) * Math.PI, rr = 52 + (rnd(i, 4) - 0.5) * 5; g.lineTo(Math.cos(a) * rr, -4 + Math.sin(a) * rr * 1.05); }
        g.lineTo(50, 64); for (let i = 0; i <= 10; i++) g.lineTo(50 - i * 10, 64 + (i % 2) * 4); g.closePath(); g.fill();
        g.strokeStyle = "rgba(30,20,12,.55)"; g.lineWidth = 0.7; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 9, -44 + Math.abs(i) * 2); g.quadraticCurveTo(i * 13 + 4, 10, i * 11, 62); g.stroke(); }
        g.strokeStyle = "rgba(255,170,100,.5)"; g.lineWidth = 1; g.beginPath(); for (let i = 0; i <= 10; i++) { const a = Math.PI * 1.1 + (i / 10) * Math.PI * 0.5; if (!i) g.moveTo(Math.cos(a) * 52, -4 + Math.sin(a) * 54); else g.lineTo(Math.cos(a) * 52, -4 + Math.sin(a) * 54); } g.stroke();
        g.restore();
      }),
    ] },
    { dur: 2.8, from: C(160, 76, 3.1), to: C(160, 76, 3.35), into: "white", bars: 0.36, layers: [
      L(0, (g) => sky(g, [[0, "#3a2020"], [1, "#8a4a30"]])),
      L(1, (g) => face(g, "finch", 160, 76, 150, { dark: 0.3, light: "rgba(255,170,90,1)", lightAmt: 0.5 })),
    ] },
  ],
};

// ------------------------------------------------------------------ the end of it
/** A lull in a tin, turning slowly toward warmth: drawn close, wet and dark. */
function lullInTin(g: G, x: number, y: number, t: number): void {
  g.fillStyle = "#6a5a48"; g.beginPath(); g.ellipse(x, y + 3, 44, 17, 0, 0, 7); g.fill(); // the tin's side
  g.fillStyle = "#8a7a64"; g.beginPath(); g.ellipse(x, y, 44, 16, 0, 0, 7); g.fill();
  g.fillStyle = "#1e1612"; g.beginPath(); g.ellipse(x, y, 40, 13.5, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(255,214,160,.7)"; g.lineWidth = 0.8; g.beginPath(); g.ellipse(x, y, 44, 16, 0, Math.PI * 1.02, Math.PI * 1.75); g.stroke();
  const moss = g.createRadialGradient(x, y, 2, x, y, 36); moss.addColorStop(0, "#4a3a24"); moss.addColorStop(1, "#1e160e"); g.fillStyle = moss; g.beginPath(); g.ellipse(x, y, 36, 11.5, 0, 0, 7); g.fill();
  for (let i = 0; i < 40; i++) { const a = rnd(i, 1) * 7, r = rnd(i, 2) * 30; g.fillStyle = `rgba(120,100,60,${0.3 + rnd(i, 3) * 0.3})`; g.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.32, 1, 0.6); }
  const a = Math.sin(t * 0.5) * 0.35 + t * 0.12; // it turns, slowly, toward the warmth of the hand
  for (let i = 0; i < 22; i++) {
    const k = i / 21, ang = a + k * 3.9, r = 17 - k * 12, sx = x + Math.cos(ang) * r, sy = y - 2 + Math.sin(ang) * r * 0.42 - Math.sin(k * Math.PI) * 3, sz = 5.4 - Math.abs(k - 0.35) * 4.6 + Math.sin(t * 2 + k * 9) * 0.15;
    g.fillStyle = shade("#2e1418", 0.04 + 0.22 * Math.sin(k * Math.PI)); g.beginPath(); g.ellipse(sx, sy, sz * 1.15, sz * 0.7, ang + 1.4, 0, 7); g.fill();
    g.strokeStyle = "rgba(10,4,6,.5)"; g.lineWidth = 0.3; g.beginPath(); g.ellipse(sx, sy, sz * 1.15, sz * 0.7, ang + 1.4, 0.3, 2.6); g.stroke();
    g.fillStyle = `rgba(255,226,200,${0.45 * (1 - k * 0.6)})`; g.beginPath(); g.ellipse(sx - 0.8, sy - sz * 0.38, sz * 0.38, sz * 0.14, ang + 1.4, 0, 7); g.fill();
  }
}
const tinInHand: CutDef = {
  id: "tin-in-hand", music: "lull",
  shots: [
    { dur: 5.6, from: C(160, 100, 1.05), to: C(160, 102, 1.45), vignette: 0.9, cues: [[0.4, () => sfx.beat(false)], [1.4, () => sfx.beat(false)], [2.4, () => sfx.beat(false)], [3.3, () => sfx.beat(true)], [4.2, () => sfx.beat(true)]], layers: [
      L(0, (g) => sky(g, [[0, "#040304"], [1, "#100a08"]])),
      L(0.4, (g, f) => { for (let i = 0; i < 6; i++) glow(g, 40 + i * 50 + Math.sin(f.T * 0.3 + i) * 4, 40 + rnd(i, 2) * 30, 8 + rnd(i, 3) * 8, `rgba(255,170,90,${0.08 + rnd(i, 4) * 0.08})`); }),
      L(1, (g, f) => {
        glow(g, 110, 70, 120, "rgba(255,150,70,.2)");
        // the palm and fingers under the tin, in shadow, lamplight on their edges
        g.fillStyle = "#3a2a20"; g.beginPath(); g.moveTo(96, 200); g.bezierCurveTo(104, 150, 120, 128, 160, 124); g.bezierCurveTo(206, 122, 232, 132, 240, 150); g.lineTo(230, 200); g.fill();
        for (let i = 0; i < 4; i++) { const fx = 196 + i * 9, fy = 122 + i * 3; g.fillStyle = "#33241c"; g.beginPath(); g.ellipse(fx, fy, 5, 9, -0.5 + i * 0.12, 0, 7); g.fill(); g.strokeStyle = "rgba(255,190,130,.45)"; g.lineWidth = 0.7; g.beginPath(); g.ellipse(fx, fy, 5, 9, -0.5 + i * 0.12, 3.6, 5.2); g.stroke(); }
        g.strokeStyle = "rgba(255,190,130,.5)"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(100, 180); g.bezierCurveTo(108, 148, 122, 130, 158, 126); g.stroke();
        lullInTin(g, 160, 112, f.T);
      }),
    ] },
  ],
};

const halloranFalls: CutDef = {
  id: "halloran-falls", music: "sombre",
  shots: [
    { dur: 3.4, from: C(150, 112, 1.5), to: C(156, 116, 1.65), ease: "out", layers: [
      L(0, (g) => sky(g, [[0, "#2a2226"], [0.6, "#6a4a3c"], [1, "#a8683c"]])),
      L(0.4, (g, f) => smoke(g, [[60, 150], [250, 150]], f.T, [40, 34, 32], 0.5, 130)),
      L(1, (g, f) => {
        g.fillStyle = "#1a1412"; g.fillRect(-40, 140, VW + 80, 60);
        glow(g, 90, 132, 50, "rgba(255,140,60,.35)"); fire(g, 80, 100, 140, 14, f.T, 0.9);
        figure(g, "halloran", 160, 140, 0.95, { t: f.T * 0.3, fall: smooth(0.1, 0.9, f.p) }, { tint: "#24140e", tintAmt: 0.55 });
      }),
      L(1.3, (g, f) => embers(g, 30, f.T, 60, 140, 140, 90, 10)),
    ] },
    { dur: 3.8, from: C(160, 120, 1), to: C(160, 70, 1), into: "dissolve", layers: [
      L(0, (g) => sky(g, [[0, "#3a3640"], [0.5, "#7a5a54"], [1, "#c07848"]], -100, 200)),
      L(0.5, (g, f) => smoke(g, [[80, 170], [200, 170], [280, 170]], f.T, [50, 44, 44], 0.45, 200)),
      L(1, (g) => { g.fillStyle = "#16100e"; g.fillRect(40, 150, 240, 50); g.fillRect(60, 130, 50, 20); g.fillRect(150, 124, 90, 26); g.fillRect(200, 112, 10, 14); }),
      L(1.2, (g, f) => embers(g, 40, f.T, 40, 280, 160, 160, 8)),
    ] },
  ],
};

/** The Broodhouse's long halls in silhouette, burning from end to end. */
function burningHalls(g: G, t: number): void {
  glow(g, 160, 100, 200, "rgba(255,110,40,.35)");
  const halls: [number, number, number][] = [[-30, 70, 98], [44, 78, 92], [126, 90, 100], [220, 70, 94], [292, 60, 100]];
  for (const [x, w, top] of halls) fire(g, x - 4, x + w + 4, top - 8, 46, t + x, 1);
  for (const [x, w, top] of halls) {
    g.fillStyle = "#0c0606"; g.fillRect(x, top, w, 150 - top);
    g.beginPath(); g.moveTo(x - 4, top); g.lineTo(x + w * 0.5, top - 14); g.lineTo(x + w + 4, top); g.fill();
    for (let i = 0; i < Math.floor(w / 12); i++) { const wx = x + 6 + i * 12, wy = top + 14, fl = 0.75 + 0.25 * Math.sin(t * 9 + wx); g.fillStyle = `rgba(255,${120 + (i % 3) * 30},40,${fl})`; g.fillRect(wx, wy, 4, 7); glow(g, wx + 2, wy + 3, 7, `rgba(255,140,50,${0.4 * fl})`); }
  }
  for (const [x, w, top] of halls) fire(g, x + w * 0.2, x + w * 0.8, top - 10, 22, t * 1.2 + x * 0.3, 0.8);
  g.fillStyle = "#050303"; g.fillRect(-60, 148, VW + 120, 60);
}
const hallsBurn: CutDef = {
  id: "halls-burn", music: "fire",
  shots: [
    { dur: 5.4, from: C(160, 100, 1.3), to: C(160, 98, 1), ease: "out", shake: () => 0.5, layers: [
      L(0, (g) => sky(g, [[0, "#1a0a08"], [0.6, "#5a1a0c"], [1, "#a8401a"]])),
      L(0.35, (g, f) => smoke(g, [[40, 100], [110, 96], [180, 96], [250, 100]], f.T, [26, 14, 12], 0.85, 150)),
      L(1, (g, f) => burningHalls(g, f.T)),
      L(1.25, (g, f) => embers(g, 140, f.T, -20, 340, 160, 160, 14)),
    ] },
    { dur: 3.4, from: C(150, 104, 2.1), to: C(150, 104, 2.35), into: "dissolve", layers: [
      L(0, (g) => sky(g, [[0, "#2a0c06"], [1, "#8a3010"]])),
      L(0.5, (g, f) => smoke(g, [[150, 74]], f.T, [20, 12, 10], 0.9, 90)),
      L(1, (g, f) => {
        g.fillStyle = "#0a0505"; g.fillRect(90, 50, 120, 110);
        for (let r = 0; r < 12; r++) for (let c = 0; c < 6; c++) { g.fillStyle = `rgba(40,20,16,${0.4 + rnd(r, c) * 0.4})`; g.fillRect(90 + c * 20 + (r % 2) * 10, 50 + r * 9, 19, 8); }
        g.fillStyle = "#1a0806"; g.fillRect(132, 82, 36, 66);
        glow(g, 150, 120, 40, "rgba(255,120,40,.5)");
        fire(g, 132, 168, 148, 58, f.T, 1.2);
        fire(g, 136, 164, 86, 18, f.T + 2, 0.7);
      }),
      L(1.2, (g, f) => embers(g, 60, f.T, 120, 190, 150, 120, 6)),
    ] },
  ],
};

export const CUTSCENES: Record<string, CutDef> = Object.fromEntries([
  larkfoldDawn, lampSignal, larkfoldAsh, rookGone, cloudColumn, torches, handsUp, oldMother, springRuns, bridgeHood, tinInHand, halloranFalls, hallsBurn,
].map((d) => [d.id, d]));

export type { Shot };
