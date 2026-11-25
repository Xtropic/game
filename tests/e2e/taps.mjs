// Taps reach the buttons they land on: every label drawn over a button in the Thornwick ledger and the game menu
// passes a click to that button (a static parent once made the words themselves swallow the tap), and clicking
// another Daily button on the Training page changes the daily drill. Screens to test-results/taps-*.png.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("../../dist/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = createServer(async (req, res) => {
  try { const p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html")); const body = await readFile(p); res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };
const width = Number(process.env.W ?? 1280), height = Number(process.env.H ?? 720), tag = process.env.TAG ?? "";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url); await page.waitForFunction(() => window.__lull?.explore);
await page.evaluate(() => {
  const l = window.__lull, g = l.game, s = g.scenes.top, z = [0, 0, 0, 0, 0, 0, 0];
  g.kith.tess = { id: "tess", name: "Tess", species: "reedcat", level: 8, xp: 0, potential: [3, 3, 3, 3, 3, 3, 3], trained: [...z], traits: [], moves: [], temperament: "curious", strain: "grey", bond: 40, generation: 0 };
  g.kith.moss = { id: "moss", name: "Moss", species: "mistwing", level: 6, xp: 0, potential: [3, 3, 3, 3, 3, 3, 3], trained: [...z], traits: [], moves: [], temperament: "gentle", strain: "grey", bond: 30, generation: 0, carrier: true };
  Object.assign(g.flags, { stage: "ab5", "base.open": true, "base.lv.pens": 2, company: "ash,tamsin,tess,moss", party: "ash,tamsin", "base.day": 4 });
  s.follow(["tamsin", "ash"]); s.changed();
});
await page.waitForTimeout(300);
for (let i = 0; i < 80; i++) { const d = await page.evaluate(() => window.__lull.explore()); if (!d.dialog && !d.joining && !d.busy && i > 3) break; await page.waitForTimeout(120); await page.keyboard.press("Enter"); }
const top = () => page.evaluate(() => window.__lull.game.scenes.top.id);
await page.keyboard.press("KeyL"); await page.waitForTimeout(200);
const toTraining = async () => { for (let i = 0; i < 5; i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(60); } };
const blocked = () => page.evaluate(() => {
  const app = window.__lull.game.app, root = app.renderer.events.rootBoundary, all = [], bad = [];
  const walk = (o) => { if (!o.visible) return; all.push(o); for (const c of o.children ?? []) walk(c); }; walk(app.stage);
  const taps = (o) => o.listenerCount("pointertap") + o.listenerCount("pointerdown") > 0;
  const buttons = all.filter((o) => (o.eventMode === "static" || o.eventMode === "dynamic") && taps(o));
  for (const t of all) {
    if (t.text === undefined || !String(t.text).trim()) continue;
    const b = t.getBounds(), x = b.x + b.width / 2, y = b.y + b.height / 2;
    if (!buttons.some((o) => o !== t && o.getBounds().containsPoint(x, y))) continue;
    const hit = root.hitTest(x, y); let ok = false;
    for (let h = hit; h; h = h.parent) if (taps(h)) { ok = true; break; }
    let swallowed = false; for (let p = t.parent; p; p = p.parent) if (p === hit) swallowed = true; // a modal backdrop over it is fine
    if (!ok && swallowed) bad.push(String(t.text).slice(0, 30));
  }
  return bad;
});
const check = async (where) => { const bad = await blocked(); if (bad.length) fail(`${where}: clicks on ${bad.length} labels do nothing: ${bad.slice(0, 6).join(" | ")}`); };
for (let i = 0; i < 8; i++) { await check(`ledger page ${i}`); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(80); }
// Training page: click the word "Daily" on one drill, then on another; the daily drill must follow
const dailies = () => page.evaluate(() => { const out = []; const walk = (o) => { if (!o.visible) return; if (typeof o.text === "string" && /^Daily/.test(o.text)) { const b = o.getBounds(); out.push({ x: b.x + b.width / 2, y: b.y + b.height / 2 }); } for (const c of o.children ?? []) walk(c); }; walk(window.__lull.game.app.stage); return out; });
await toTraining(); // the ledger opens on Party; Training is five pages on
const drill = () => page.evaluate(() => window.__lull.game.flags["drill.tess"]);
let d = await dailies(); if (d.length < 3) fail(`expected Daily buttons on the Training page, found ${d.length}`);
else {
  await page.mouse.click(d[0].x, d[0].y); await page.waitForTimeout(120); const first = await drill();
  d = await dailies(); await page.mouse.click(d[2].x, d[2].y); await page.waitForTimeout(120); const second = await drill();
  if (!first || !second || first === second) fail(`clicking Daily didn't set or change the daily drill (${first} then ${second})`);
  d = await dailies(); await page.mouse.click(d[2].x, d[2].y); await page.waitForTimeout(120);
  if (await drill()) fail("clicking the lit Daily button again didn't clear it");
  await page.screenshot({ path: `test-results/taps-training${tag}.png` });
}
await page.keyboard.press("Escape"); await page.waitForTimeout(120); await page.keyboard.press("Escape"); await page.waitForTimeout(150); await page.keyboard.press("Tab"); await page.waitForTimeout(250);
if (!(await page.evaluate(() => window.__lull.scene().menu.open))) fail("the game menu didn't open");
for (let i = 0; i < 8; i++) { await check(`menu page ${i}`); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(80); }
await page.screenshot({ path: `test-results/taps-menu${tag}.png` });
if (errors.filter((e) => !/404/.test(e)).length) fail(errors.join("\n"));
await browser.close(); server.close();
