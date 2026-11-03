// Plays the whole prologue in a real browser with key presses: day one in Larkfold, the night, the trail fight,
// the burning, and Corran's interlude to its ending. People are reached by placing Rhea (or Corran) beside them;
// everything else (talking, choosing, singing, walking through doors) is real input.
import { createRequire } from "node:module";
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
let joins = 0;
const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url); await page.waitForFunction(() => window.__lull?.explore);
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__lull?.explore);
const t0 = Date.now();

const ex = () => page.evaluate(() => window.__lull.explore());
const put = (x, y, facing) => page.evaluate(([x, y, f]) => { const p = window.__lull.game.scenes.top.player; p.x = x * 16 + 2; p.y = y * 16 - 2; p.facing = f; }, [x, y, facing]);
const tap = async (key, ms = 40) => { await page.keyboard.press(key); await page.waitForTimeout(ms); };
const walk = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(60); };
/** Reads lines until a choice comes up or everything is done (fades included). Returns the state. */
async function read(max = 40) {
  for (let i = 0; i < max; i++) {
    const s = await ex();
    if (s.choosing || s.ended) return s;
    if (s.fading) { await page.waitForTimeout(300); continue; }
    if (s.joining) { joins++; await page.waitForTimeout(1500); await tap("Enter", 200); continue; }
    if (s.dialog) { await tap("Enter"); await tap("Enter", 60); continue; }
    if (!s.busy) return s;
    await page.waitForTimeout(100);
  }
  return ex();
}
async function choose(i) { const s = await read(); if (!s.choosing) { fail(`expected a choice, at ${s.stage}: ${s.dialog}`); return; } for (let k = 0; k < i; k++) await tap("ArrowDown"); await tap("Enter", 80); return read(); }
const expect = async (what, ok) => { const s = await ex(); if (!ok(s)) fail(`${what}: ${JSON.stringify({ map: s.map, stage: s.stage, dialog: s.dialog, followers: s.followers })}`); return s; };

// ---- day one ----
await expect("starts on day one in Larkfold", (s) => s.map === "larkfold" && s.stage === "d1");
await put(13, 2, "right"); await tap("Enter"); await choose(0);
await expect("asked to sing", (s) => s.stage === "d1b");
await put(20, 1, "right"); await tap("KeyQ"); await read();
await expect("Smoke comes to the song", (s) => s.stage === "d2" && s.followers.includes("smoke"));
await put(27, 15, "down"); await walk("ArrowDown", 250);
await expect("into the brood caves", (s) => s.map === "caves");
await put(13, 1, "right"); await tap("Enter"); await read();
if (await page.evaluate(() => window.__lull.game.flags.notes) !== 1) fail("the note in the caves was not picked up");
await put(5, 3, "right"); await tap("Enter"); await choose(1);
await expect("evening falls", (s) => s.stage === "d3" && s.followers.length === 0);
await put(7, 7, "down"); await walk("ArrowDown", 300);
await put(9, 12, "left"); await walk("ArrowLeft", 250);
await expect("up the ladder to the roof", (s) => s.map === "roof");
await put(6, 2, "right"); await tap("Enter"); await choose(0); await choose(2);
await expect("goodnight to Corran", (s) => s.stage === "d4");
if (await page.evaluate(() => window.__lull.game.flags.hold) !== 55) fail("hearing about Hask did not steady Corran's hold");
await put(2, 4, "left"); await walk("ArrowLeft", 250);
await put(6, 9, "up"); await walk("ArrowUp", 250);
await expect("home", (s) => s.map === "home");
await put(1, 2, "up"); await tap("Enter"); await read();
await expect("nine days later", (s) => s.stage === "n1" && s.map === "larkfold");
await page.screenshot({ path: "test-results/prologue-day.png" });

// ---- the night ----
await put(15, 7, "right"); await tap("Enter"); await choose(1);
await expect("the news", (s) => s.stage === "n2");
await put(6, 9, "up"); await walk("ArrowUp", 250);
await put(4, 3, "right"); await tap("Enter"); await choose(2);
await expect("three nights later", (s) => s.stage === "n3" && s.map === "larkfold");
await put(14, 18, "right"); await tap("Enter"); await read();
await expect("Tamsin and Ash join", (s) => s.stage === "n3b" && s.followers.join() === "tamsin,ash");
await put(16, 18, "down"); await walk("ArrowDown", 300);
await expect("down the trail", (s) => s.map === "trail");
await put(9, 8, "down"); await page.keyboard.down("ArrowDown");
await page.waitForFunction(() => window.__lull.explore().dialog, null, { timeout: 8000 }); await page.keyboard.up("ArrowDown");
await tap("Enter"); await tap("Enter");
await page.waitForFunction(() => window.__lull.battle()?.debug().mode === "menu", null, { timeout: 8000 });
await page.keyboard.press("KeyT");
for (let i = 0; i < 900; i++) {
  const b = await page.evaluate(() => window.__lull.battle()?.debug() ?? null);
  if (!b) break;
  if (b.mode === "over") { await tap("Enter"); break; }
  if (b.mode === "menu") { await tap("Enter", 10); await tap("Enter", 10); }
  await page.waitForTimeout(100);
}
await read();
await expect("the sky goes orange", (s) => s.stage === "n4");
await put(8, 1, "up"); await walk("ArrowUp", 300); await read();
await expect("Larkfold has burned", (s) => s.stage === "n5" && s.map === "larkfold");
await page.screenshot({ path: "test-results/prologue-burnt.png" });
await put(19, 5, "up"); await walk("ArrowUp", 900); await choose(0);

// ---- Corran's interlude ----
await expect("Corran in the Vantry yard", (s) => s.map === "yard" && s.stage === "i1");
await put(11, 6, "right"); await tap("Enter"); await choose(1);
await expect("Sela bought out", (s) => s.stage === "i1b");
await put(5, 7, "down"); await walk("ArrowDown", 250); await read();
await expect("the hatchery", (s) => s.map === "hatchery" && s.stage === "i2");
await put(16, 5, "right"); await tap("Enter"); await read();
await expect("Finch carried", (s) => s.stage === "i2b" && s.followers.includes("finch"));
await put(9, 8, "down"); await walk("ArrowDown", 250); await read();
await expect("the surgery", (s) => s.map === "surgery" && s.stage === "i3");
await put(4, 3, "left"); await tap("Enter"); await choose(1);
await expect("a month later", (s) => s.map === "rooms" && s.stage === "i4");
await put(10, 1, "right"); await tap("Enter"); await read();
// no act card, no end screen: the story carries straight on, the next summer, with Rhea
const end = await expect("straight on to the next summer", (s) => !s.ended && s.stage === "a1");
const f = await page.evaluate(() => window.__lull.game.flags);
if (f.evening !== "door" || f.line !== "field" || !f.sela || f.refusal !== "stay") fail(`choices not kept: ${JSON.stringify(f)}`);
await expect("on the world map below Larkfold", (s) => s.map === "land-cloudline" && s.followers.join() === "tamsin,ash");
const hud = await page.evaluate(() => window.__lull.game.scenes.top.chapter.text);
if (/Act|Prologue|Interlude/.test(hud)) fail(`a chapter card on screen: ${hud}`);

if (errors.length) fail("page errors: " + errors.join(" | "));
console.log(process.exitCode ? "prologue e2e FAILED" : "prologue e2e passed", `in ${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify({ hold: f.hold, rings: f["rings.corran"], notes: f.notes, ended: end.ended }));
await browser.close(); server.close();
