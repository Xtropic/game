// Phone screens: every main screen at portrait and landscape phone sizes, touch only. Screens to test-results/mobile-*.png.
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
const out = process.env.OUT ?? "test-results";
const sizes = (process.env.SIZES ?? "412x915,915x412").split(",").map((s) => s.split("x").map(Number));
const browser = await chromium.launch();
for (const [width, height] of sizes) {
  const tag = `${width}x${height}`;
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url + (process.env.Q ?? "?touch")); await page.waitForFunction(() => window.__lull?.explore);
  const shot = (n) => page.screenshot({ path: `${out}/mobile-${n}-${tag}.png` });
  await page.waitForTimeout(800); await shot("opening");
  await page.evaluate(() => {
    const l = window.__lull, g = l.game, s = g.scenes.top, z = [0, 0, 0, 0, 0, 0, 0];
    g.kith.tess = { id: "tess", name: "Tess", species: "reedcat", level: 8, xp: 0, potential: [3, 3, 3, 3, 3, 3, 3], trained: [...z], traits: [], moves: [], temperament: "curious", strain: "grey", bond: 40, generation: 0 };
    Object.assign(g.flags, { stage: "ab5", "base.open": true, "base.lv.pens": 2, company: "ash,tamsin,tess", party: "ash,tamsin", "base.day": 4 });
    s.follow(["tamsin", "ash"]); s.changed();
  });
  for (let i = 0; i < 80; i++) { const d = await page.evaluate(() => window.__lull.explore()); if (!d.dialog && !d.joining && !d.busy && i > 3) break; await page.waitForTimeout(100); await page.keyboard.press("Enter"); }
  await page.waitForTimeout(300); await shot("explore");
  await page.evaluate(() => window.__lull.scene().runner.run([{ say: "tamsin", text: "This is a fairly long line of dialogue to see how the box wraps on a narrow phone screen, and whether it can be read at arm's length." }]));
  await page.waitForTimeout(1500); await shot("dialogue");
  for (let i = 0; i < 6; i++) { await page.keyboard.press("Enter"); await page.waitForTimeout(100); }
  await page.evaluate(() => window.__lull.menu()); await page.waitForTimeout(300); await shot("menu");
  for (let i = 1; i < 6; i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(120); await shot(`menu${i}`); }
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  await page.keyboard.press("KeyL"); await page.waitForTimeout(300); await shot("ledger");
  for (let i = 1; i < 6; i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(120); await shot(`ledger${i}`); }
  await page.keyboard.press("Enter"); await page.waitForTimeout(100); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await page.waitForTimeout(400); await shot("drill-intro");
  await page.keyboard.press("Enter"); await page.waitForTimeout(2800); await shot("drill-play");
  await page.keyboard.press("Escape"); await page.waitForTimeout(1500); await page.keyboard.press("Enter"); await page.waitForTimeout(200);
  await page.keyboard.press("Escape"); await page.waitForTimeout(200); await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  await page.keyboard.press("KeyG"); await page.waitForTimeout(300); await shot("guide");
  await page.keyboard.press("Enter"); await page.waitForTimeout(300); await shot("guide-page");
  await page.keyboard.press("Escape"); await page.waitForTimeout(100); await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  await page.evaluate(() => window.__lull.startBattle("thornwick-road")); await page.waitForTimeout(2500); await shot("battle");
  await page.waitForTimeout(3000); await shot("battle2");
  await page.evaluate(() => { const g = window.__lull.game; while (g.scenes.top.id !== "explore" && g.scenes.all.length > 1) g.scenes.pop(); });
  await page.evaluate(() => window.__lull.duel("lockside-rider")); await page.waitForTimeout(2000); await shot("duel");
  await page.evaluate(() => { const g = window.__lull.game; while (g.scenes.all.length > 1) g.scenes.pop(); });
  await page.evaluate(() => window.__lull.scene().army("thornwick-raid", () => {})); await page.waitForTimeout(2000); await shot("army");
  console.log(tag, errors.length ? errors : "no errors");
  await page.close();
}
await browser.close(); server.close();
