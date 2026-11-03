// Plays Act I in a real browser with key presses, from the prologue's ending to the first harvest: the world map,
// Ferrow Cross, the camp, the cart warden, Millbridge, the Sallow hatchery and Larkfold. Journeys across the world
// map start a few steps from each place (walking the whole road is slow and proves nothing more); stepping into
// places, talking, choosing, singing and fighting are real input. Also walks into a hidden land to find it.
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
const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url); await page.waitForFunction(() => window.__lull?.explore);
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__lull?.explore);
const t0 = Date.now();

const ex = () => page.evaluate(() => window.__lull.explore());
const flags = () => page.evaluate(() => window.__lull.game.flags);
const scene = (fn, arg) => page.evaluate(([f, a]) => new Function("s", "g", "a", f)(window.__lull.game.scenes.top, window.__lull.game, a), [fn, arg]);
const put = (x, y, facing) => page.evaluate(([x, y, f]) => { const p = window.__lull.game.scenes.top.player; p.x = x * 16 + 2; p.y = y * 16 - 2; p.facing = f; }, [x, y, facing]);
/** Goes to a map without the story (a journey across the world map, shortened). */
const travel = async (map, x, y, facing) => { await scene("s.goto(a[0], a[1], a[2], a[3], () => {})", [map, x, y, facing]); await page.waitForTimeout(80); };
const tap = async (key, ms = 40) => { await page.keyboard.press(key); await page.waitForTimeout(ms); };
const walk = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(60); };
async function read(max = 60) {
  for (let i = 0; i < max; i++) {
    const s = await ex();
    if (s.choosing || s.ended) return s;
    if (s.fading) { await page.waitForTimeout(300); continue; }
    if (s.dialog) { await tap("Enter"); await tap("Enter", 60); continue; }
    if (!s.busy && !(await page.evaluate(() => window.__lull.battle()))) return s;
    await page.waitForTimeout(100);
  }
  return ex();
}
async function choose(i) { const s = await read(); if (!s.choosing) { fail(`expected a choice, at ${s.stage}: ${s.dialog}`); return; } for (let k = 0; k < i; k++) await tap("ArrowDown"); await tap("Enter", 80); return read(); }
const expect = async (what, ok) => { const s = await ex(); if (!ok(s)) fail(`${what}: ${JSON.stringify({ map: s.map, stage: s.stage, dialog: s.dialog, followers: s.followers, region: s.region })}`); return s; };
/** Fights the battle that's up, with auto timing, first move and first target each turn. */
async function fight(name) {
  await page.waitForFunction(() => window.__lull.battle()?.debug().mode === "menu", null, { timeout: 10000 }).catch(() => fail(`${name}: no battle`));
  await tap("KeyT");
  for (let i = 0; i < 1200; i++) {
    const b = await page.evaluate(() => window.__lull.battle()?.debug() ?? null);
    if (!b) return;
    if (b.mode === "over") { await page.screenshot({ path: `test-results/act1-${name}.png` }); await tap("Enter"); return; }
    if (b.mode === "menu") { await tap("Enter", 10); await tap("Enter", 10); }
    await page.waitForTimeout(100);
  }
  fail(`${name}: the battle did not end`);
}

// ---- the prologue ends; a year later ----
await scene("s.end('prologue')"); await page.waitForTimeout(100);
await tap("Enter", 200); await read();
await expect("Act I starts below Larkfold", (s) => s.map === "ostrel" && s.stage === "a1" && s.region === "cloudline" && s.followers.join() === "tamsin,ash");
await page.evaluate(() => { window.__lull.game.flags.noWild = true; });
await page.screenshot({ path: "test-results/act1-world.png" });

// a hidden land: walk the ridge west out of the Cloudline into the mist, and Vael is found
await travel("ostrel", 11, 16, "left"); await walk("ArrowLeft", 1100); await walk("ArrowUp", 500); await walk("ArrowLeft", 500);
if (!(await flags())["found.vael"]) fail(`walking into Vael did not find it: ${JSON.stringify(await ex())}`);

// ---- Ferrow Cross ----
await travel("ostrel", 30, 31, "right"); await walk("ArrowRight", 400);
await expect("into Ferrow Cross", (s) => s.map === "ferrow");
await put(8, 8, "left"); await tap("Enter"); await read();
await expect("the cart is empty", (s) => s.stage === "a1b");
await put(19, 8, "right"); await tap("Enter"); await choose(0);
await expect("Brannoc walks with them", (s) => s.stage === "a2" && s.followers.join() === "tamsin,ash,brannoc");
await put(11, 12, "down"); await walk("ArrowDown", 400);
await expect("back out on the world map", (s) => s.map === "ostrel");

// ---- the Commons camp ----
await travel("ostrel", 58, 26, "right"); await walk("ArrowRight", 400);
await expect("into the camp", (s) => s.map === "camp");
await put(15, 5, "up"); await tap("Enter"); await choose(0);
await expect("enlisted as a Recruit", (s) => s.stage === "a3");
if ((await flags()).rank !== "Recruit") fail("not a Recruit");
await put(23, 8, "right"); await tap("KeyQ"); await read();
if (!(await flags())["recruited.ferris"]) fail("singing did not calm Ferris's reedcat");
await page.screenshot({ path: "test-results/act1-camp.png" });

// ---- Hob's Bend at dusk: the cart warden ----
await travel("ostrel", 44, 36, "down"); await walk("ArrowDown", 400);
await expect("Hob's Bend", (s) => s.map === "bend");
await put(13, 6, "down"); await page.keyboard.down("ArrowDown");
await page.waitForFunction(() => window.__lull.explore().dialog, null, { timeout: 8000 }); await page.keyboard.up("ArrowDown");
await read(); await fight("cart-warden"); await read();
await expect("the warden beaten", (s) => s.stage === "a3b");
await put(12, 8, "down"); await tap("Enter"); await read();
await expect("the children freed; Sergeant", (s) => s.stage === "a4");
if ((await flags()).rank !== "Sergeant") fail("not a Sergeant");

// ---- Kane, then Millbridge ----
await travel("camp", 15, 5, "up"); await tap("Enter"); await read();
await expect("sent to Millbridge", (s) => s.stage === "a5");
await travel("ostrel", 36, 35, "down"); await walk("ArrowDown", 400);
await expect("Millbridge", (s) => s.map === "millbridge");
await put(13, 7, "up"); await tap("Enter"); await choose(0);
await expect("Millbridge hears the truth", (s) => s.stage === "a6");
const m = await flags(); if (m.millbridge !== "truth" || !m["recruited.oren"]) fail(`Millbridge choice not kept: ${m.millbridge}`);

// ---- the Sallow hatchery ----
await travel("ostrel", 50, 40, "down"); await walk("ArrowDown", 400);
await expect("the Sallow hatchery at night", (s) => s.map === "sallow");
await page.keyboard.down("ArrowUp");
await page.waitForFunction(() => window.__lull.explore().dialog, null, { timeout: 8000 }); await page.keyboard.up("ArrowUp");
await read(); await fight("sallow-gate"); await read();
await expect("the gate is open, the brood house burning", (s) => s.stage === "a6b");
await page.waitForTimeout(1500); await page.screenshot({ path: "test-results/act1-fire.png" });
await put(12, 4, "up"); await walk("ArrowUp", 500); await choose(0);
await expect("Ketti joins; harvest", (s) => s.stage === "a7" && s.map === "ostrel" && s.followers.length === 0);
const k = await flags(); if (!k["recruited.ketti"] || k.rank !== "Lieutenant") fail(`Ketti or the promotion missing: ${k.rank}`);

// ---- Larkfold, the first harvest ----
await travel("ostrel", 22, 21, "up"); await walk("ArrowUp", 400); await read();
await expect("home to Larkfold", (s) => s.map === "larkfold" && s.stage === "a7b");
await tap("KeyQ"); await read();
await expect("nothing comes", (s) => s.stage === "a7c");
await put(27, 15, "down"); await walk("ArrowDown", 300);
await expect("the spring caves", (s) => s.map === "caves");
await put(9, 3, "right"); await tap("Enter"); await read();
if (!(await flags())["recruited.oda"]) fail("Oda not found in the caves");
await put(7, 7, "down"); await walk("ArrowDown", 300);
await put(16, 17, "down"); await walk("ArrowDown", 600); await read();
const end = await expect("the end of Act I", (s) => s.ended);
await page.screenshot({ path: "test-results/act1-end.png" });
const ledger = await page.evaluate(() => window.__lull.game.scenes.top.ended?.text ?? "");
if (!/Lieutenant/.test(ledger) || !/Oren Tull/.test(ledger) || !/Ketti/.test(ledger)) fail(`ledger: ${ledger}`);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("lull.save.auto")).flags);
if (saved.ended !== "act1") fail(`the end is not saved: ${saved.ended}`);

if (errors.length) fail("page errors: " + errors.join(" | "));
console.log(process.exitCode ? "act1 e2e FAILED" : "act1 e2e passed", `in ${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify({ ended: end.ended }));
await browser.close(); server.close();
