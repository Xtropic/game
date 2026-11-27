// Painted party members walking in the world, as cut-out puppets. The paintings stand in a wide fighting stance,
// which no amount of bending the picture turns into a walk: the legs have to come apart from the body. So each
// painting is cut, once, from its own outline: the body (everything above the crotch, arms and weapons too), and
// each leg below it, split again at the knee into thigh and shin. In the world the legs hang straight down from
// their hips, under the body, and walk: each thigh swings from the hip, the knee bends as that leg comes through,
// and the foot plants. The body rides up over each step and settles. Drawn back leg, front leg, then the body.
//
// How the cut is found: going up from the feet, the figure's outline is two spans (the legs) until the row where
// they join (the crotch). The two biggest pieces below that row that reach the ground are the legs; anything else
// below it (a hanging sling, a spear point) stays with the body.

interface Leg {
  /** Thigh and shin pictures, each in its own canvas, with the joint they hang from. */
  thigh: HTMLCanvasElement; shin: HTMLCanvasElement;
  /** In image pixels: the hip, the knee and the foot (bottom middle of the boot) as painted. */
  hip: [number, number]; knee: [number, number]; foot: [number, number];
  /** Where each piece's canvas sits in the image. */
  thighAt: [number, number]; shinAt: [number, number];
}
export interface Puppet { body: HTMLCanvasElement; legs: [Leg, Leg]; crotch: number; w: number; h: number; }

const cache = new Map<HTMLImageElement | HTMLCanvasElement, Puppet | null>();

/** Cuts a painting into body and legs; null when its outline doesn't show two legs (it stays a warped picture). */
export function puppetOf(img: HTMLImageElement | HTMLCanvasElement): Puppet | null {
  if (cache.has(img)) return cache.get(img)!;
  let out: Puppet | null = null;
  try { out = cut(img); } catch { out = null; }
  cache.set(img, out);
  return out;
}

function cut(img: HTMLImageElement | HTMLCanvasElement): Puppet | null {
  const w = img.width, h = img.height;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d", { willReadFrequently: true })!; g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, w, h).data;
  const solid = (x: number, y: number): boolean => data[(y * w + x) * 4 + 3] > 40;

  // label the connected pieces of the outline below each candidate crotch row; find the crotch going up
  const spans = (y: number): [number, number][] => {
    const out: [number, number][] = []; let s = -1;
    for (let x = 0; x <= w; x++) { const on = x < w && solid(x, y); if (on && s < 0) s = x; else if (!on && s >= 0) { if (x - s > 3) out.push([s, x]); s = -1; } }
    return out;
  };
  // start a little above the soles (boots splay) with the two widest spans, follow each leg up, and stop where
  // one span holds both (a hand or a weapon beside the legs doesn't count)
  let crotch = -1;
  const y0 = Math.floor(h * 0.9);
  let legSp = spans(y0).filter((s) => s[1] - s[0] > w * 0.04).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0])).slice(0, 2);
  if (legSp.length < 2) return null;
  for (let y = y0 - 1; y > h * 0.35; y--) {
    const sp = spans(y);
    const near = legSp.map((l) => { const c = (l[0] + l[1]) / 2; let bi = -1, bd = 1e9; sp.forEach((s, i) => { const d = c < s[0] ? s[0] - c : c > s[1] ? c - s[1] : 0; if (d < bd) { bd = d; bi = i; } }); return bd < w * 0.08 ? bi : -1; });
    if (near[0] < 0 || near[1] < 0) return null;
    if (near[0] === near[1]) { crotch = y + 1; break; }
    legSp = [sp[near[0]], sp[near[1]]];
  }
  if (crotch < 0 || crotch > h * 0.8) return null;

  // flood the region below the crotch into pieces
  const lab = new Int32Array(w * h).fill(-1), sizes: number[] = [], bottoms: number[] = [];
  let n = 0;
  for (let y = crotch; y < h; y++) for (let x = 0; x < w; x++) {
    if (lab[y * w + x] >= 0 || !solid(x, y)) continue;
    const stack = [y * w + x]; lab[y * w + x] = n; let size = 0, bottom = 0;
    while (stack.length) {
      const p = stack.pop()!, px = p % w, py = (p - px) / w; size++; bottom = Math.max(bottom, py);
      for (const [qx, qy] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]]) {
        if (qx < 0 || qx >= w || qy < crotch || qy >= h) continue;
        const q = qy * w + qx; if (lab[q] >= 0 || !solid(qx, qy)) continue;
        lab[q] = n; stack.push(q);
      }
    }
    sizes.push(size); bottoms.push(bottom); n++;
  }
  const legIds = sizes.map((_, i) => i).filter((i) => bottoms[i] > h * 0.9).sort((a, b) => sizes[b] - sizes[a]).slice(0, 2);
  if (legIds.length < 2 || sizes[legIds[1]] < sizes[legIds[0]] * 0.3) return null;

  // each leg: its pixels, where it meets the crotch row (the hip) and its sole (the foot)
  const legInfo = legIds.map((id) => {
    let x0 = w, x1 = 0, topXs: number[] = [], footXs: number[] = [], bottom = 0;
    for (let y = crotch; y < h; y++) for (let x = 0; x < w; x++) if (lab[y * w + x] === id) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); bottom = Math.max(bottom, y); }
    for (let y = crotch; y < crotch + 6; y++) for (let x = x0; x <= x1; x++) if (lab[y * w + x] === id) topXs.push(x);
    for (let y = bottom - 30; y <= bottom; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && lab[y * w + x] === id) footXs.push(x);
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
    return { id, x0, x1, hip: [mean(topXs), crotch] as [number, number], foot: [mean(footXs), bottom] as [number, number] };
  }).sort((a, b) => a.hip[0] - b.hip[0]); // back leg (left in the picture) first

  // keep only the leg itself: follow it down from the hip, row by row, taking the run of the piece that carries
  // on from the row above, no wider than a leg. Whatever else touched it (a shield rim, the end of a bow, a coat
  // tail) is not the leg: if it hangs from the body above the crotch it stays with the body, else it's left out.
  const hipRun = new Map<number, [number, number]>();
  for (const l of legInfo) {
    // how wide this leg is: the run on the hip-to-foot line through the shin, middle value
    const widths: number[] = [];
    for (let y = Math.round(crotch + (l.foot[1] - crotch) * 0.4); y < crotch + (l.foot[1] - crotch) * 0.8; y++) {
      const cx = Math.round(l.hip[0] + (l.foot[0] - l.hip[0]) * (y - crotch) / Math.max(1, l.foot[1] - crotch));
      if (lab[y * w + cx] !== l.id) continue;
      let a = cx, b = cx; while (a > 0 && lab[y * w + a - 1] === l.id) a--; while (b < w - 1 && lab[y * w + b + 1] === l.id) b++;
      widths.push(b - a + 1);
    }
    widths.sort((a, b) => a - b);
    const legW = widths.length ? widths[widths.length >> 1] : w * 0.15;
    const base = Math.max(w * 0.06, Math.min(w * 0.14, legW * 0.6));
    let cx = l.hip[0];
    for (let y = crotch; y <= l.foot[1]; y++) {
      const f = (y - crotch) / Math.max(1, l.foot[1] - crotch), half = base * (f > 0.85 ? 1.4 : f < 0.35 ? 1.2 : 1);
      const runs: [number, number][] = []; let s0 = -1;
      for (let x = l.x0; x <= l.x1 + 1; x++) { const on = x <= l.x1 && lab[y * w + x] === l.id; if (on && s0 < 0) s0 = x; else if (!on && s0 >= 0) { runs.push([s0, x - 1]); s0 = -1; } }
      let best: [number, number] | null = null, bestD = 1e9;
      for (const r of runs) { const d = cx < r[0] ? r[0] - cx : cx > r[1] ? cx - r[1] : 0; if (d < bestD) { bestD = d; best = r; } }
      let a = 0, b = -1;
      if (best && bestD < half) { a = Math.max(best[0], Math.round(cx - half)); b = Math.min(best[1], Math.round(cx + half)); cx = cx * 0.5 + ((a + b) / 2) * 0.5; }
      for (const r of runs) for (let x = r[0]; x <= r[1]; x++) if (x < a || x > b) lab[y * w + x] = -2;
      if (y === crotch && b >= a) hipRun.set(l.id, [a, b]);
    }
    for (let y = l.foot[1] + 1; y < h; y++) for (let x = l.x0; x <= l.x1; x++) if (lab[y * w + x] === l.id) lab[y * w + x] = -2;
  }
  // the cut-off bits: those that reach up to the crotch row belong to the body; loose bits of leg are dropped
  const seen = new Uint8Array(w * h);
  for (let y = crotch; y < h; y++) for (let x = 0; x < w; x++) {
    const p0 = y * w + x; if (lab[p0] !== -2 || seen[p0]) continue;
    const pix = [p0], stack = [p0]; seen[p0] = 1; let top = y;
    while (stack.length) {
      const p = stack.pop()!, px = p % w, py = (p - px) / w; top = Math.min(top, py);
      for (const q of [p + 1, p - 1, p + w, p - w]) { if (q < 0 || q >= w * h || seen[q] || lab[q] !== -2) continue; if ((q === p + 1 && px === w - 1) || (q === p - 1 && px === 0)) continue; seen[q] = 1; stack.push(q); pix.push(q); }
    }
    // a bit hanging from the body stays with it only when it's broad (a shield, a bag); a thin strip down the
    // outside of a trouser leg is the leg's own edge and goes
    let bottom = top; for (const p of pix) bottom = Math.max(bottom, Math.floor(p / w));
    const broad = pix.length / Math.max(1, bottom - top + 1) >= w * 0.04 || bottom - top < h * 0.04;
    if (top > crotch + 1 || !broad) for (const p of pix) lab[p] = -3;
  }

  // the body: everything that isn't a leg
  const body = document.createElement("canvas"); body.width = w; body.height = h;
  const bg = body.getContext("2d")!; const bodyData = bg.createImageData(w, h);
  const legSet = new Set(legInfo.map((l) => l.id));
  for (let p = 0; p < w * h; p++) {
    if ((lab[p] >= 0 && legSet.has(lab[p])) || lab[p] === -3) continue;
    for (let k = 0; k < 4; k++) bodyData.data[p * 4 + k] = data[p * 4 + k];
  }
  bg.putImageData(bodyData, 0, 0);

  // a leg piece: the leg's own pixels between two rows, plus a few rows of trouser above the crotch so the hip
  // joint never shows a gap when the thigh swings (the body is drawn over it)
  const piece = (id: number, ya: number, yb: number, x0: number, x1: number, overlapAbove: number): { c: HTMLCanvasElement; at: [number, number] } => {
    const top = Math.max(0, ya - overlapAbove), cw = x1 - x0 + 1, chh = yb - top + 1;
    const c = document.createElement("canvas"); c.width = cw; c.height = chh;
    const cg = c.getContext("2d")!; const d = cg.createImageData(cw, chh);
    for (let y = top; y <= yb; y++) for (let x = x0; x <= x1; x++) {
      const hr = hipRun.get(id), p = y * w + x;
      const mine = y >= crotch ? lab[p] === id : solid(x, y) && (!hr || (x >= hr[0] - 2 && x <= hr[1] + 2));
      if (!mine) continue;
      const q = ((y - top) * cw + (x - x0)) * 4; for (let k = 0; k < 4; k++) d.data[q + k] = data[p * 4 + k];
      if (y < crotch) d.data[q + 3] = Math.round(d.data[q + 3] * Math.min(1, (y - top) / Math.max(1, overlapAbove)));
    }
    cg.putImageData(d, 0, 0);
    return { c, at: [x0, top] };
  };
  const legs = legInfo.map((l) => {
    const knee: [number, number] = [(l.hip[0] + l.foot[0]) / 2, Math.round((l.hip[1] + l.foot[1]) / 2)];
    const over = Math.round(h * 0.05);
    // the knee row is shared a little by both pieces, so the bend has no gap
    const th = piece(l.id, crotch, knee[1] + 4, l.x0, l.x1, over), sh = piece(l.id, knee[1] - 2, l.foot[1], l.x0, l.x1, 0);
    return { thigh: th.c, shin: sh.c, thighAt: th.at, shinAt: sh.at, hip: l.hip, knee, foot: l.foot } as Leg;
  });
  return { body, legs: [legs[0], legs[1]], crotch, w, h };
}

const rot = (p: [number, number], o: [number, number], a: number): [number, number] => {
  const c = Math.cos(a), s = Math.sin(a), dx = p[0] - o[0], dy = p[1] - o[1];
  return [o[0] + dx * c - dy * s, o[1] + dx * s + dy * c];
};

/**
 * Draws the puppet into g with the image's own pixel units, its feet's ground at the image bottom and centred
 * on x = w/2 (the caller scales and places it). `phase` is the walk cycle (2 pi per two steps) or undefined when
 * standing; `stride` 0..1 how long the steps are; `t` the clock for breathing. `drawBody` draws the body picture
 * (so the caller can still warp it for breath and sway).
 */
export function drawPuppet(g: CanvasRenderingContext2D, pp: Puppet, phase: number | undefined, stride: number, t: number, drawBody: (dy: number, hipX: number) => void): void {
  const walking = phase !== undefined, st = walking ? Math.max(0.35, stride) : 0;
  const midHip = (pp.legs[0].hip[0] + pp.legs[1].hip[0]) / 2;
  // hips sit a little apart; each leg hangs straight under its own hip
  const hipGap = Math.min(Math.abs(pp.legs[1].hip[0] - pp.legs[0].hip[0]), pp.w * 0.16) * 0.55;
  type Placed = { hip: [number, number]; thighA: number; shinA: number; leg: Leg; foot: [number, number] };
  const placed: Placed[] = pp.legs.map((leg, i) => {
    const hip: [number, number] = [midHip + (i === 0 ? -hipGap / 2 : hipGap / 2), leg.hip[1]];
    // the angle that turns the painted leg (hip to foot) straight down
    const a0 = Math.atan2(leg.foot[0] - leg.hip[0], leg.foot[1] - leg.hip[1]);
    let thighA = a0, shinA = 0; // canvas rotation: positive turns the lower end towards -x (backwards, figure faces +x); a0 brings the leg straight down
    if (walking) {
      const ph = phase! + (i === 0 ? Math.PI : 0), s = Math.sin(ph), c = Math.cos(ph);
      thighA += -s * 0.42 * st; // forward of the hip on the way through, behind it on the push-off
      shinA = Math.max(0, c) * 0.85 * st; // the knee folds as the leg swings through, so the foot clears the ground
    } else thighA += i === 0 ? 0.05 : -0.05; // standing: feet a touch apart
    // where the foot ends up: shin hangs from the knee
    const kneeP = rot(leg.knee, leg.hip, thighA), dKnee: [number, number] = [kneeP[0] - leg.hip[0] + hip[0], kneeP[1] - leg.hip[1] + hip[1]];
    const footRel = rot(leg.foot, leg.knee, thighA + shinA);
    const foot: [number, number] = [footRel[0] - leg.knee[0] + dKnee[0], footRel[1] - leg.knee[1] + dKnee[1]];
    return { hip, thighA, shinA, leg, foot };
  });
  // the lowest foot stands on the ground; the body rides with it
  const ground = Math.max(pp.legs[0].foot[1], pp.legs[1].foot[1]);
  const low = Math.max(placed[0].foot[1], placed[1].foot[1]);
  const lift = ground - low; // positive: everything moves down to put the planted foot on the ground
  const breathe = Math.sin(t * 2.2) * pp.h * 0.003;
  g.save();
  g.translate(pp.w / 2 - midHip, lift);
  for (const p of placed) {
    const L = p.leg;
    // thigh: rotate about the hip; shin: about the knee, which rides on the thigh
    g.save();
    g.translate(p.hip[0], p.hip[1]); g.rotate(p.thighA);
    g.drawImage(L.thigh, L.thighAt[0] - L.hip[0], L.thighAt[1] - L.hip[1]);
    g.translate(L.knee[0] - L.hip[0], L.knee[1] - L.hip[1]); g.rotate(p.shinA);
    g.drawImage(L.shin, L.shinAt[0] - L.knee[0], L.shinAt[1] - L.knee[1]);
    g.restore();
  }
  drawBody(breathe, midHip);
  g.restore();
}
