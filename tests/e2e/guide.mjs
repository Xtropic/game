// The Guide: a new game shows the "How it works" card for the basics once the opening lines are read; G opens the
// Guide from exploring and from a battle; the first battle shows its own card before the first blow.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("../../dist/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = createServer(async (req, res) => {
  try { const p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html")); const body = await readFile(p); res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/?guide`;
const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };
await mkdir("test-results", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && !m.text().includes("404") && errors.push(m.text()));
await page.goto(url); await page.waitForFunction(() => window.__lull?.explore);
const top = () => page.evaluate(() => { const t = window.__lull.game.scenes.top; return { id: t.id, mode: t.mode?.kind, queue: t.queue, page: t.page }; });
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(120); } };
// read the opening lines; the basics card follows
for (let i = 0; i < 80; i++) { await page.waitForTimeout(100); const t = await top(); if (t.id === "guide") break; const d = await page.evaluate(() => window.__lull.explore()); if (d.dialog) await page.keyboard.press("Enter"); }
let t = await top();
if (t.id !== "guide" || t.queue?.[0] !== "basics") fail(`no basics card after the opening: ${JSON.stringify(t)}`);
await page.waitForTimeout(400); await page.screenshot({ path: "test-results/guide-card.png" });
await key("Enter"); t = await top(); if (t.page !== 1) fail(`Enter did not turn the page: ${JSON.stringify(t)}`);
await page.screenshot({ path: "test-results/guide-card-keys.png" });
await key("Enter", 3); t = await top(); if (t.id === "guide") fail("card did not close after its last page");
const f = await page.evaluate(() => window.__lull.game.flags);
if (!f["guide.basics"] || !f["guide.read.basics"]) fail("basics not marked met and read");
// G opens the Guide to browse
await key("KeyG"); t = await top(); if (t.id !== "guide" || t.mode !== "browse") fail(`G did not open the Guide: ${JSON.stringify(t)}`);
await page.waitForTimeout(200); await page.screenshot({ path: "test-results/guide-browse.png" });
await key("Escape"); t = await top(); if (t.id === "guide") fail("Esc did not close the Guide");
// the first battle: its card comes before the first blow, and G works mid-fight
await page.evaluate(() => window.__lull.startBattle("trail-wardens"));
for (let i = 0; i < 30; i++) { await page.waitForTimeout(100); t = await top(); if (t.id === "guide") break; }
if (t.id !== "guide" || t.queue?.[0] !== "battles") fail(`no battle card: ${JSON.stringify(t)}`);
await key("Enter"); await page.screenshot({ path: "test-results/guide-battle-card.png" });
await key("Escape"); t = await top(); if (t.id !== "battle") fail(`Esc did not go back to the battle: ${JSON.stringify(t)}`);
await page.waitForTimeout(1500); await key("KeyG"); t = await top();
if (t.id !== "guide") fail("G did not open the Guide in battle");
await page.waitForTimeout(200); await page.screenshot({ path: "test-results/guide-in-battle.png" });
await key("Escape");
// a page met later shows up in the Guide; the menu has a Guide tab
await page.evaluate(() => { const g = window.__lull.game; g.scenes.pop(); g.flags["base.open"] = true; g.flags.rank = "Lieutenant"; });
for (let i = 0; i < 30; i++) { await page.waitForTimeout(100); t = await top(); if (t.id === "guide") break; }
if (t.id !== "guide" || !(t.queue ?? []).includes("thornwick")) fail(`no Thornwick card: ${JSON.stringify(t)}`);
await page.screenshot({ path: "test-results/guide-queue.png" });
for (let i = 0; i < 40 && (await top()).id === "guide"; i++) await key("Escape");
await page.screenshot({ path: "test-results/guide-hud.png" });
if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
await browser.close(); server.close();
if (!process.exitCode) console.log("guide ok");
