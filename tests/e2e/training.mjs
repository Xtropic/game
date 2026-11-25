// Kith training in a real browser: the Thornwick ledger's Training page, every drill attended as its mini game
// (played with keys for a few seconds, then stopped early with Esc), the result card, a daily drill and time spent.
// Screens to test-results/training-*.png.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("../../dist/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = createServer(async (req, res) => {
  try { const p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html")); res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }); res.end(await readFile(p)); }
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
for (let i = 0; i < 5; i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(60); }
await page.screenshot({ path: `test-results/training-page${tag}.png` });
await page.keyboard.press("Enter"); await page.waitForTimeout(100); // into Tess's rows: time together first
await page.keyboard.press("Enter"); await page.waitForTimeout(100);
if (await page.evaluate(() => window.__lull.game.flags["time.tess"]) !== 4) fail("spending time didn't count");
const keys = { heave: ["Space"], carry: ["Space"], ledges: ["ArrowUp", "ArrowDown", "Space"], drums: ["ArrowLeft", "ArrowRight"], cups: ["ArrowLeft", "Space"], call: ["ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown"], show: ["ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown"] };
const games = Object.keys(keys);
for (let n = 0; n < games.length; n++) {
  await page.evaluate(() => { const k = window.__lull.game.kith.tess; k.energy = 100; delete window.__lull.game.flags["drilled.tess"]; });
  await page.keyboard.press("ArrowDown"); await page.waitForTimeout(80);
  await page.keyboard.press("Enter"); await page.waitForTimeout(250);
  if (await top() !== "training") { fail(`drill ${games[n]} didn't open`); await page.screenshot({ path: `test-results/training-fail-${games[n]}${tag}.png` }); continue; }
  await page.screenshot({ path: `test-results/training-${games[n]}-intro${tag}.png` });
  await page.keyboard.press("Enter"); await page.waitForTimeout(2600);
  for (let i = 0; i < 24; i++) { const k = keys[games[n]][i % keys[games[n]].length]; if (games[n] === "carry") { await page.keyboard.down("Space"); await page.waitForTimeout(220); await page.keyboard.up("Space"); } else await page.keyboard.press(k); await page.waitForTimeout(140); }
  await page.screenshot({ path: `test-results/training-${games[n]}-play${tag}.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(1500);
  await page.screenshot({ path: `test-results/training-${games[n]}-result${tag}.png` });
  await page.keyboard.press("Enter"); await page.waitForTimeout(300);
  if (await top() === "training") fail(`drill ${games[n]} didn't close`);
}
const after = await page.evaluate(() => ({ xp: window.__lull.game.kith.tess.xp, lv: window.__lull.game.kith.tess.level, bond: window.__lull.game.kith.tess.bond }));
if (!(after.lv > 8 || after.xp > 0)) fail("no experience from drills " + JSON.stringify(after));
await page.keyboard.press("ArrowRight"); await page.waitForTimeout(100); // the show ring: set it as Tess's daily drill
if (await page.evaluate(() => window.__lull.game.flags["drill.tess"]) !== "show") fail("daily drill not set");
await page.screenshot({ path: `test-results/training-daily${tag}.png` });
await page.keyboard.press("Escape"); await page.keyboard.press("ArrowDown"); await page.waitForTimeout(100); // Moss: a carrier
await page.screenshot({ path: `test-results/training-moss${tag}.png` });
if (errors.length) fail(errors.join("\n"));
await browser.close(); server.close();
