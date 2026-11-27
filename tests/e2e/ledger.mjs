// The Thornwick ledger in a real browser: L opens it on the Party page, Enter takes someone along. Screens to test-results/ledger-*.png.
// The menu in a real browser: opens on M, shows every page, changes a fitting, uses an item, changes a setting,
// and closes again. Screenshots of each page go to test-results/menu-*.png.
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
  const l = window.__lull, g = l.game, s = g.scenes.top;
  Object.assign(g.flags, { stage: "ab5", "base.open": true, "recruited.brannoc": true, company: "ash,tamsin,brannoc,ferris,ketti", party: "ash,tamsin" });
  s.follow(["tamsin", "ash"]); s.changed();
});
await page.waitForTimeout(300);
for (let i = 0; i < 80; i++) { const d = await page.evaluate(() => window.__lull.explore()); if (!d.dialog && !d.joining && !d.busy && i > 3) break; await page.waitForTimeout(120); await page.keyboard.press("Enter"); }
await page.screenshot({ path: `test-results/ledger-button${tag}.png` });
await page.keyboard.press("KeyL"); await page.waitForTimeout(200);
await page.screenshot({ path: `test-results/ledger-party${tag}.png` });
await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await page.waitForTimeout(80);
await page.keyboard.press("Enter"); await page.waitForTimeout(200);
if (!String(await page.evaluate(() => window.__lull.game.flags.party)).includes("brannoc")) fail("ledger Party page did not add Brannoc");
await page.screenshot({ path: `test-results/ledger-party2${tag}.png` });
await page.keyboard.press("ArrowRight"); await page.waitForTimeout(100);
await page.screenshot({ path: `test-results/ledger-works${tag}.png` });
if (errors.length) fail(errors.join("\n"));
await browser.close(); server.close();
