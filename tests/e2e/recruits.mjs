// Recruits in a real browser: walking up to people and talking to them, fighting for them, paying for them, and the join card.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("../../dist/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".map": "application/json" };
const server = createServer(async (req, res) => {
  try { const p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html")); const body = await readFile(p); res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
let joins = 0;
const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("response", (r) => r.status() === 404 && console.log("404", r.url())); page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
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
    if (b.mode === "over") { await page.screenshot({ path: `test-results/recruits-${name}.png` }); await tap("Enter"); return; }
    if (b.mode === "menu") { await tap("Enter", 10); await tap("Enter", 10); }
    await page.waitForTimeout(100);
  }
  fail(`${name}: the battle did not end`);
}


/** Stands Rhea next to an actor, facing them, and talks. */
async function meet(id) {
  const a = await page.evaluate((id) => window.__lull.game.scenes.top.story.actors.find((x) => x.id === id), id);
  const m = await page.evaluate(() => window.__lull.game.scenes.top.map.file);
  const free = (x, y) => m.rows[y]?.[x] && !["wall", "roof", "water", "tree", "fence", "cliff", "cloud", "rock", "terrace", "tray", "iwall", "bed", "shelf", "table", "cart", "stonewall", "brick", "tent", "stall", "crate", "hay", "well", "fire", "campfire", "canal", "boiler", "drying", "gate", "innerdoor"].includes(m.legend[m.rows[y][x]]);
  for (const [dx, dy, face] of [[0, 1, "up"], [0, -1, "down"], [1, 0, "left"], [-1, 0, "right"]]) {
    if (free(a.x + dx, a.y + dy)) { await put(a.x + dx, a.y + dy, face); break; }
  }
  await page.waitForTimeout(100); await talk();
}
async function answer(picks = []) {
  for (let i = 0; i < 40; i++) {
    const s = await read(400);
    if (await page.evaluate(() => window.__lull.battle()?.debug().mode)) { await fight("recruit"); continue; }
    if (s.choosing) { const k = picks.shift() ?? 0; for (let j = 0; j < k; j++) await tap("ArrowDown"); await tap("Enter", 80); continue; }
    return s;
  }
  return ex();
}
const shot = async (n) => { await page.waitForTimeout(600); await page.screenshot({ path: `test-results/recruits-${n}.png` }); };
const setFlags = (o) => page.evaluate((o) => Object.assign(window.__lull.game.flags, o), o);
const company = () => page.evaluate(() => String(window.__lull.game.flags.company ?? "").split(","));

// the opening scene of a new game, read through first
for (let i = 0; i < 30; i++) { await page.waitForTimeout(300); const s = await ex(); if (s.busy || s.dialog || s.fading) await answer(); else if (i > 5) break; }
console.log("start", JSON.stringify(await ex()));

// Act I: Wick's brother's debt, paid at the wharf
await setFlags({ stage: "a6", hero: "rhea", act1: true });
await page.evaluate(() => { window.__lull.game.coin = 30; });
await travel("millbridge--wharf", 2, 5, "right");
await meet("wick-punt");
await answer([0]);
if (!(await flags())["recruited.wick"]) fail("Wick didn't join after the debt was paid");
if ((await page.evaluate(() => window.__lull.game.coin)) !== 5) fail("paying Wick's debt didn't cost 25 coin");

// Act I: the stampede at Highmoss, a party battle
await travel("town-highmoss", 18, 12, "up");
await meet("edda-terrace");
await answer([0]);
if (!(await flags()).eddaHelped) fail("the stampede wasn't held");

// Act III: Isel at Mistfold opens the ridge; the elders at Highspire; Dellan on the quay
await setFlags({ stage: "ad7" });
await travel("town-lockside--quay", 12, 9, "up");
await meet("dellan-quay"); await answer();
await travel("town-mistfold", 18, 12, "up");
await meet("isel-cliff");
await answer();
if (!(await flags())["open.cloudline-vael"]) fail("Isel didn't open the way to Vael");
await travel("land-vael", 12, 10, "up"); await page.waitForTimeout(200);
await travel("town-highspire", 11, 11, "up");
await meet("elders-fire"); await answer([0]);
await shot("elders");
if (!(await flags())["recruited.isel"]) fail("Isel didn't join at the elders' fire");
await travel("town-lockside--quay", 12, 9, "up");
await meet("dellan-quay"); await answer([0]);
if (!(await flags())["recruited.dellan"]) fail("Dellan didn't join for the truth");

// Kane leaves the company when he's arrested
await setFlags({ "recruited.kane": true });
await scene("s.checkJoins(true)");
if (!(await company()).includes("kane")) fail("Kane isn't in the company");
await setFlags({ kaneArrested: true });
await scene("s.checkJoins(true)");
if ((await company()).includes("kane")) fail("Kane is still in the company after his arrest");

const c = await company();
for (const id of ["wick", "isel", "dellan"]) if (!c.includes(id)) fail(`${id} isn't in the company`);
if (joins < 3) fail(`expected join cards, saw ${joins}`);
if (errors.length) fail(errors.join("\n"));
console.log(process.exitCode ? "recruits: FAILED" : `recruits: ok (${joins} join cards, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
await browser.close(); server.close();
