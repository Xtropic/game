// Plays Act III in a real browser: each scene runs as if its trigger fired, and is read, chosen and fought with key presses.
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
    if (b.mode === "over") { await page.screenshot({ path: `test-results/act3-${name}.png` }); await tap("Enter"); return; }
    if (b.mode === "menu") { await tap("Enter", 10); await tap("Enter", 10); }
    await page.waitForTimeout(100);
  }
  fail(`${name}: the battle did not end`);
}


/** Runs a story script as if its trigger fired, then reads it through: picks choices in order, fights any battle. */
async function play(name, picks = []) {
  await scene("s.runner.run([{ run: a }])", name); await page.waitForTimeout(80);
  for (let i = 0; i < 40; i++) {
    const s = await read(400);
    if (await page.evaluate(() => window.__lull.battle()?.debug().mode)) { await fight(name); continue; }
    if (s.choosing) { const k = picks.shift() ?? 0; for (let j = 0; j < k; j++) await tap("ArrowDown"); await tap("Enter", 80); continue; }
    return s;
  }
  return ex();
}
const shot = async (n) => { await page.waitForTimeout(600); await page.screenshot({ path: `test-results/act3-${n}.png` }); };
const f = () => flags();

// ---- the end of Act II: the girl at the gate ----
await page.evaluate(() => Object.assign(window.__lull.game.flags, { stage: "ab26", act2: true, hero: "rhea", party: "tamsin,ash,oakes", "party.tamsin": true, "party.oakes": true, ash: true, "recruited.oda": true, "recruited.oakes": true, noWild: true, rank: "Lieutenant", kaneTrust: 10, trade: "shut", bellNight: "clean", birthday: "kept", hold: 50, thornwick: true }));
await travel("thornwick", 13, 12, "down");
await play("childGate"); await expect("the morning after", (s) => s.stage === "ad1" && s.map === "thornwick");
await play("wrenSlate", [0]); await expect("to the camp", (s) => s.stage === "ad2");
await travel("camp", 15, 5, "up"); await play("kane"); await expect("the council", (s) => s.stage === "ad3");
await travel("land-vale", 52, 40, "down"); await play("checkpoint", [0]); await expect("the Millcities open", (s) => s.stage === "ad4");
if (!(await f())["open.vale-millcities"]) fail("the way south is still shut");
await travel("land-millcities", 38, 10, "up"); await shot("millcities");
await play("lockside"); await expect("Lockside at night", (s) => s.map === "lockhatch" && s.stage === "ad5"); await shot("lockside");
await play("lockKid1"); await play("lockKid2"); await play("lockKid3"); await expect("the rider at the gate", (s) => s.stage === "ad6");
await play("lockRider", [0]); await expect("out with the children", (s) => s.stage === "ad6b");
await play("northRoad"); await expect("home with ninety-one", (s) => s.map === "thornwick" && s.stage === "ad7");
await play("exchangeRider"); await expect("Kell's Bridge at dusk", (s) => s.map === "kellsbridge" && s.stage === "ad8"); await shot("bridge-dusk");
await play("exchange", [0]); await expect("Finch", (s) => s.stage === "ad9");
await play("toKane"); await play("kane", [0]); await expect("Kane knew", (s) => s.stage === "ad10");
await travel("thornwick", 4, 13, "down"); await play("thornBed3"); await expect("Lockside, the night of the raid", (s) => s.map === "lockhatch" && s.stage === "ae1");
await play("raidTin", [1]); await play("halloranStrip"); await expect("the brood rooms", (s) => s.map === "mire" && s.stage === "ae3"); await shot("brood-rooms");
await play("posyRaw"); await play("guardOffer", [1]); await expect("spring at Thornwick", (s) => s.map === "thornwick" && s.stage === "ad11");
await play("haldane", [1]); await travel("camp", 15, 5, "up"); await play("kane"); await expect("Mire", (s) => s.stage === "ad13");
await travel("land-millcities", 20, 13, "up"); await play("drainIn"); await expect("the drain", (s) => s.map === "culvert"); await shot("drain");
await play("drainKith"); await play("mireIn"); await expect("House Mire", (s) => s.map === "mire" && s.stage === "ad15"); await shot("mire");
await play("fennick", [0]); await play("mireGuards"); await play("mireCorran", [0]); await expect("home with Corran", (s) => s.map === "thornwick" && s.stage === "ad16");
await play("corranBath", [1, 0]); await expect("the truth", (s) => s.stage === "ad17");
await play("thornBed3"); await play("summerTrial"); await play("captain", [1]); await expect("Captain", (s) => s.stage === "ad20");
if ((await f()).rank !== "Captain") fail("no promotion");
const end = await play("thornBed3"); await shot("end");
if (!end.ended) fail(`the end of what's written: ${JSON.stringify(end)}`);

if (errors.length) fail("page errors: " + errors.join(" | "));
console.log(process.exitCode ? "act3 e2e FAILED" : "act3 e2e passed", `in ${((Date.now() - t0) / 1000).toFixed(1)}s`, `joins ${joins}`);
await browser.close(); server.close();
