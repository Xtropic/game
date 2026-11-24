// A game pad in a real browser (navigator.getGamepads faked): A works dialogue, the stick walks, Menu opens the menu,
// RB the ledger, and the right-stick pointer plus A clicks an on-screen button.
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
  try { const p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html")); res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }); res.end(await readFile(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };
const width = Number(process.env.W ?? 1280), height = Number(process.env.H ?? 720), tag = process.env.TAG ?? "";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.addInitScript(() => {
  const pad = { id: "Xbox Wireless Controller (STANDARD GAMEPAD)", index: 0, connected: true, mapping: "standard", timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null];
});
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url); await page.waitForFunction(() => window.__lull?.explore);
const btn = async (i, ms = 120) => { await page.evaluate((i) => { const b = window.__pad.buttons[i]; b.pressed = true; b.value = 1; }, i); await page.waitForTimeout(ms); await page.evaluate((i) => { const b = window.__pad.buttons[i]; b.pressed = false; b.value = 0; }, i); await page.waitForTimeout(ms); };
const axes = (a) => page.evaluate((a) => { window.__pad.axes = a; }, a);
// A through the opening
for (let i = 0; i < 80; i++) { const d = await page.evaluate(() => window.__lull.explore()); if (!d.dialog && !d.busy && i > 3) break; await btn(0); }
if (await page.evaluate(() => window.__lull.explore().dialog)) fail("A did not move dialogue on");
// left stick walks
const p0 = await page.evaluate(() => { const s = window.__lull.game.scenes.top; return [s.player.x, s.player.y]; });
await axes([1, 0, 0, 0]); await page.waitForTimeout(700); await axes([0, 0, 0, 0]);
const p1 = await page.evaluate(() => { const s = window.__lull.game.scenes.top; return [s.player.x, s.player.y]; });
if (p1[0] <= p0[0]) fail(`left stick did not walk right: ${p0} -> ${p1}`);
// Menu button opens the menu, RB pages, B closes
await btn(9);
if (!(await page.evaluate(() => window.__lull.game.scenes.top.menu.open))) fail("Menu button did not open the menu");
await btn(5); const tab = await page.evaluate(() => window.__lull.game.scenes.top.menu.tab); if (tab !== 1) fail(`RB did not page the menu (tab ${tab})`);
await page.screenshot({ path: `test-results/pad-menu${tag}.png` });
await btn(9);
if (await page.evaluate(() => window.__lull.game.scenes.top.menu.open)) fail("Menu button did not close the menu");
// RB opens the ledger at Thornwick
await page.evaluate(() => { const g = window.__lull.game, s = g.scenes.top; Object.assign(g.flags, { stage: "ab5", "base.open": true, company: "ash,tamsin,brannoc", party: "ash,tamsin" }); s.follow(["tamsin", "ash"]); s.changed(); });
for (let i = 0; i < 80; i++) { const d = await page.evaluate(() => window.__lull.explore()); if (!d.dialog && !d.joining && !d.busy && i > 3) break; await btn(0); }
await btn(5);
if (!(await page.evaluate(() => window.__lull.game.scenes.top.base.open))) fail("RB did not open the ledger");
// D-pad down twice, A: Brannoc joins
await btn(13); await btn(13); await btn(0);
if (!String(await page.evaluate(() => window.__lull.game.flags.party)).includes("brannoc")) fail("A on the ledger Party page did not take Brannoc along");
// right stick pointer to the Close button, then A clicks it
const W = width, H = height, PW = Math.min(940, W - 16), x0 = Math.round((W - PW) / 2), y0 = Math.round((H - Math.min(620, H - 16)) / 2);
const small = PW < 620, target = [x0 + PW - (small ? 70 : 96) + 30, y0 + 8 + 14];
await axes([0, 0, 0.6, 0]); await page.waitForTimeout(60); await axes([0, 0, 0, 0]);
for (let k = 0; k < 120; k++) {
  const at = await page.evaluate(() => { const m = document.querySelector("div[aria-hidden=true]").style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/); return [Number(m[1]), Number(m[2])]; });
  const dx = target[0] - at[0], dy = target[1] - at[1]; if (Math.hypot(dx, dy) < 6) break;
  const m = Math.hypot(dx, dy), s = Math.min(1, 0.4 + m / 400); await axes([0, 0, (dx / m) * s, (dy / m) * s]); await page.waitForTimeout(30); await axes([0, 0, 0, 0]); await page.waitForTimeout(20);
}
await page.screenshot({ path: `test-results/pad-pointer${tag}.png` });
await btn(0);
if (await page.evaluate(() => window.__lull.game.scenes.top.base.open)) fail("pointer + A did not click the ledger's Close button");
if (errors.length) fail(errors.join("\n"));
console.log(process.exitCode ? "gamepad: FAILED" : "gamepad: ok");
await browser.close(); server.close();
