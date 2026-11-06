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
let joins = 0;
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
/** Presses Enter at whoever Rhea faces; presses again if nothing opened (a press can land on a closing frame). */
const talk = async () => { for (let i = 0; i < 3; i++) { await tap("Enter", 150); const s = await ex(); if (s.dialog || s.busy || s.fading) return; } };
const tap = async (key, ms = 40) => { await page.keyboard.press(key); await page.waitForTimeout(ms); };
const walk = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(60); };
async function read(max = 60) {
  for (let i = 0; i < max; i++) {
    const s = await ex();
    if (s.choosing || s.ended) return s;
    if (s.fading) { await page.waitForTimeout(300); continue; }
    if (s.joining) { joins++; await page.waitForTimeout(1500); await tap("Enter", 200); continue; }
    // one press finishes typing, the next closes; never press into a choice that has just come up
    if (s.dialog) { await tap("Enter"); const t = await ex(); if (t.dialog === s.dialog && !t.choosing) await tap("Enter", 60); continue; }
    if (!s.busy && !(await page.evaluate(() => window.__lull.battle()))) { await page.waitForTimeout(120); if (!(await ex()).joining) return s; continue; }
    await page.waitForTimeout(100);
  }
  return ex();
}
async function choose(i) { const s = await read(); if (!s.choosing) { fail(`expected a choice, at ${s.stage}: ${s.dialog} (${new Error().stack.split("\n")[2].trim()})`); return; } for (let k = 0; k < i; k++) await tap("ArrowDown"); await tap("Enter", 80); return read(); }
const expect = async (what, ok) => { const s = await ex(); if (!ok(s)) fail(`${what}: ${JSON.stringify({ map: s.map, stage: s.stage, dialog: s.dialog, followers: s.followers, region: s.region })}`); return s; };
/** Fights the battle that's up, with auto timing, first move and first target each turn. */
/** Walks into Rhea's tent in the top-left corner of the camp, and sleeps. */
async function sleepInTent() { await put(3, 5, "up"); await walk("ArrowUp", 250); await read(); }
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
await scene("s.runner.run([{ run: 'act1Start' }])"); await page.waitForTimeout(100); await read();
await expect("Act I starts below Larkfold", (s) => s.map === "land-cloudline" && s.stage === "a1" && s.region === "cloudline" && s.followers.join() === "tamsin,ash");
await page.evaluate(() => { window.__lull.game.flags.noWild = true; });
await page.screenshot({ path: "test-results/act1-world.png" });

// the mountain road leaves the Cloudline at its south edge and comes into the vale
await travel("land-cloudline", 38, 37, "down"); await walk("ArrowDown", 700);
await expect("down the mountain road into the vale", (s) => s.map === "land-vale");
// the road south to the Millcities is shut, with a Guild checkpoint across it
await travel("land-vale", 46, 45, "down"); await walk("ArrowDown", 600);
{ const s = await ex(); if (s.map !== "land-vale") fail(`walked through a shut way into ${s.map}`); }
if (!/checkpoint/.test(await page.evaluate(() => window.__lull.game.scenes.top.toastLabel.text))) fail("no reason given at the shut way");

// ---- Ferrow Cross ----
await travel("land-vale", 14, 14, "right"); await walk("ArrowRight", 400);
await expect("into Ferrow Cross", (s) => s.map === "ferrow");
await put(8, 8, "left"); await tap("Enter"); await read();
await expect("the cart is empty", (s) => s.stage === "a1b");
await put(19, 8, "right"); await tap("Enter"); await choose(0);
await expect("Brannoc walks with them", (s) => s.stage === "a2" && s.followers.join() === "tamsin,ash,brannoc");
await put(11, 12, "down"); await walk("ArrowDown", 400);
await expect("back out on the world map", (s) => s.map === "land-vale");

// ---- the Commons camp ----
await travel("land-vale", 59, 17, "right"); await walk("ArrowRight", 400);
await expect("into the camp", (s) => s.map === "camp");
await put(15, 5, "up"); await tap("Enter"); await choose(0);
await expect("enlisted as a Recruit; look round the camp", (s) => s.stage === "a2b");
if ((await flags()).rank !== "Recruit") fail("not a Recruit");
await put(19, 12, "right"); await talk(); await choose(0);
await put(8, 8, "left"); await talk(); await read();
await put(24, 8, "right"); await talk(); await read();
const tour = await flags(); if (!tour["tour.nurse"] || !tour["tour.yard"] || !tour["tour.kith"]) fail(`the camp tour is unfinished: ${JSON.stringify(tour)}`);
await put(23, 8, "right"); await tap("KeyQ"); await read();
if (!(await flags())["recruited.ferris"]) fail("singing did not calm Ferris's reedcat");
await page.screenshot({ path: "test-results/act1-camp.png" });
await put(15, 5, "up"); await talk(); await choose(0);
await expect("sent to bed, not straight into the next day", (s) => s.stage === "a2e");
await sleepInTent(); await expect("dawn: Brannoc in the drill yard", (s) => s.stage === "a2f" && s.followers.includes("brannoc") && !s.seen.includes("brannoc")); // one Brannoc: the one waiting
await put(7, 9, "right"); await talk(); await read();
await fight("spar"); await read();
await expect("three weeks of drill ahead", (s) => s.stage === "a2g");
await sleepInTent(); await expect("a few weeks of training; night watch", (s) => s.stage === "a2c");
await put(24, 4, "right"); await talk(); await choose(0);
await expect("watch over, back to the tent", (s) => s.stage === "a2h");
await sleepInTent(); await expect("a week later, Kane sends for the section", (s) => s.stage === "a2d");
await put(15, 5, "up"); await talk(); await read();
await expect("the cart job", (s) => s.stage === "a3");

// ---- Hob's Bend at dusk: the cart warden ----
await travel("land-vale", 43, 32, "down"); await walk("ArrowDown", 400);
await expect("Hob's Bend", (s) => s.map === "bend");
await put(13, 6, "down"); await page.keyboard.down("ArrowDown");
await page.waitForFunction(() => window.__lull.explore().dialog, null, { timeout: 8000 }); await page.keyboard.up("ArrowDown");
await read(); await fight("cart-warden"); await read();
await expect("the warden beaten", (s) => s.stage === "a3b");
await put(12, 8, "down"); await tap("Enter"); await read();
await expect("the children freed", (s) => s.stage === "a4");
if ((await flags()).rank !== "Recruit") fail("promoted for one job");

// ---- Kane, then Millbridge ----
await travel("camp", 15, 5, "up"); await tap("Enter"); await read();
await expect("sent to Millbridge", (s) => s.stage === "a5");
await travel("land-vale", 27, 28, "down"); await walk("ArrowDown", 400);
await expect("Millbridge", (s) => s.map === "millbridge");
await put(13, 7, "up"); await tap("Enter"); await choose(0);
await expect("Millbridge hears the truth; walk back to camp", (s) => s.stage === "a4b" && s.map === "millbridge");
await travel("camp", 3, 5, "up"); await sleepInTent();
await expect("a quiet month at camp", (s) => s.stage === "a5b" && s.map === "camp");
const m = await flags(); if (m.millbridge !== "truth" || !m["recruited.oren"]) fail(`Millbridge choice not kept: ${m.millbridge}`);
await put(12, 10, "right"); await talk(); await choose(0);
await put(15, 5, "up"); await talk(); await read();
await expect("Kane sends them to Sallow", (s) => s.stage === "a6");

// ---- the Sallow hatchery ----
await travel("land-vale", 52, 40, "down"); await walk("ArrowDown", 400);
await expect("the Sallow hatchery at night", (s) => s.map === "sallow");
await page.keyboard.down("ArrowUp");
await page.waitForFunction(() => window.__lull.explore().dialog, null, { timeout: 8000 }); await page.keyboard.up("ArrowUp");
await read(); await fight("sallow-gate"); await read();
await expect("the gate is open, the brood house burning", (s) => s.stage === "a6b");
await page.waitForTimeout(1500); await page.screenshot({ path: "test-results/act1-fire.png" });
await put(12, 4, "up"); await walk("ArrowUp", 500); await choose(0);
await expect("Ketti joins; Brannoc is hurt", (s) => s.stage === "a6c" && s.map === "sallow");
await travel("camp", 19, 11, "right");
await put(19, 11, "right"); await talk(); await choose(0);
await expect("the section will vote", (s) => s.stage === "a6d");
await put(21, 5, "right"); await talk(); await read();
await expect("Sergeant by the section's vote; bed", (s) => s.stage === "a6e");
await sleepInTent(); await expect("harvest: she goes alone", (s) => s.stage === "a7" && s.map === "camp" && s.followers.length === 0);
const k = await flags(); if (!k["recruited.ketti"] || k.rank !== "Sergeant") fail(`Ketti or the promotion missing: ${k.rank}`);

// ---- Larkfold, the first harvest ----
await travel("land-cloudline", 22, 23, "up"); await walk("ArrowUp", 400); await read();
await expect("home to Larkfold", (s) => s.map === "larkfold" && s.stage === "a7b");
await tap("KeyQ"); await read();
await expect("nothing comes", (s) => s.stage === "a7c");
await put(27, 15, "down"); await walk("ArrowDown", 300);
await expect("the spring caves", (s) => s.map === "caves");
await put(9, 3, "right"); await tap("Enter"); await read();
if (!(await flags())["recruited.oda"]) fail("Oda not found in the caves");
await put(7, 7, "down"); await walk("ArrowDown", 300);
await put(16, 17, "down"); await walk("ArrowDown", 600); await read(400); await choose(0);
// no end card: the story walks on into the autumn, back at camp
const end = await expect("autumn at camp, no end card", (s) => !s.ended && s.map === "camp" && s.stage === "ab1");
await page.screenshot({ path: "test-results/act1-end.png" });
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("lull.save.auto") ?? "{}").flags ?? {});
if (saved.ended) fail(`an ending was saved: ${saved.ended}`);

if (errors.length) fail("page errors: " + errors.join(" | "));
console.log(process.exitCode ? "act1 e2e FAILED" : "act1 e2e passed", `in ${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify({ stage: end.stage }));
await browser.close(); server.close();
