// Plays the built game in a real browser: walks, runs, talks to Maren, saves, reloads and checks the save restores.
import { createRequire } from "node:module";
// Uses the project's playwright if installed, else a global one (NODE_PATH).
const { chromium } = createRequire(import.meta.url)("playwright");
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("../../dist/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".map": "application/json" };
const server = createServer(async (req, res) => {
  try { const p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html")); res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }); res.end(await readFile(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url); await page.waitForFunction(() => window.__lull?.explore);
// a new game opens with a few lines about Larkfold: read them through
for (let i = 0; i < 60; i++) { await page.waitForTimeout(80); const d = await page.evaluate(() => window.__lull.explore()); if (!d.dialog && !d.busy && i > 3) break; if (d.dialog) await page.keyboard.press("Enter"); }
const at = () => page.evaluate(() => window.__lull.explore());
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };

const start = await at();
if (start.zoom !== 4) fail(`zoom ${start.zoom}, expected 4 at 1280x720`);
await hold("ArrowRight", 500);
const walked = await at();
if (!(walked.x > start.x + 20)) fail(`walking right moved ${walked.x - start.x}px`);
await page.keyboard.down("Shift"); await hold("ArrowLeft", 500); await page.keyboard.up("Shift");
const ran = await at();
if (!(walked.x - ran.x > (walked.x - start.x) * 1.3)) fail(`running was not faster (${walked.x - ran.x} vs ${walked.x - start.x})`);
// walk up the steps onto the top terrace and into the cloud edge: must stop, not pass through
await page.evaluate(() => { const s = window.__lull.game.scenes.top; s.player.x = 9 * 16 + 2; s.player.y = 6 * 16 - 2; });
await hold("ArrowUp", 3000);
const top = await at(); if (top.y < 0 || top.y > 2 * 16) fail(`did not stop at the cloud edge: y=${top.y}`);
await page.screenshot({ path: "test-results/explore.png" });

// talk to Maren: put Rhea right beside her, facing her (after the morning's pilgrim)
await page.evaluate(() => { window.__lull.game.flags.stage = "d1"; window.__lull.game.scenes.top.changed?.(); });
await page.waitForTimeout(200);
await page.evaluate(() => { const s = window.__lull.game.scenes.top; s.player.x = 15 * 16 + 2; s.player.y = 7 * 16 - 2; s.player.facing = "right"; });
await page.keyboard.press("Enter"); await page.waitForTimeout(100);
const talk = await at(); if (!talk.dialog || !talk.dialog.includes("Three hundred")) fail(`no dialogue from Maren: ${talk.dialog}`);
await page.screenshot({ path: "test-results/dialogue.png" });
// first press finishes typing the line out, the second closes it
await page.keyboard.press("Enter"); await page.waitForTimeout(100);
if (!(await at()).dialog) fail("dialogue closed before the line was shown in full");
await page.keyboard.press("Enter"); await page.waitForTimeout(100);
if ((await at()).dialog) fail("dialogue did not close");

// save to slot 1, then reload from the autosave path by copying slot 1 over auto
await page.keyboard.press("KeyM"); await page.waitForTimeout(100);
const saved = await page.evaluate(() => window.__lull.saves());
const s1 = saved.find((s) => s.slot === "1"); if (!s1) fail("no slot 1 save");
const before = await at();
await page.evaluate(() => localStorage.setItem("lull.save.auto", localStorage.getItem("lull.save.1")));
await page.reload(); await page.waitForFunction(() => window.__lull?.explore);
const after = await at();
if (Math.abs(after.x - before.x) > 0.01 || Math.abs(after.y - before.y) > 0.01) fail(`reload put Rhea at ${after.x},${after.y}, saved ${before.x},${before.y}`);

if (errors.length) fail("page errors: " + errors.join(" | "));
console.log(process.exitCode ? "e2e FAILED" : "e2e passed", JSON.stringify({ start, walked, ran, top, after }));
await browser.close(); server.close();
