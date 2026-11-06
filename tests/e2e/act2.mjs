// Plays Act II in a real browser: each scene runs as if its trigger fired, and is read, chosen and fought with key presses.
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
    if (b.mode === "over") { await page.screenshot({ path: `test-results/act2-${name}.png` }); await tap("Enter"); return; }
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
const shot = async (n) => { await page.waitForTimeout(600); await page.screenshot({ path: `test-results/act2-${n}.png` }); };
const f = () => flags();

// ---- Act I's last harvest: leaving Larkfold with the section ----
await page.evaluate(() => Object.assign(window.__lull.game.flags, { stage: "a7c", hero: "rhea", party: "tamsin,ash,brannoc", "party.brannoc": true, ash: true, sela: true, "recruited.oda": true, noWild: true, rank: "Sergeant" }));
await travel("larkfold", 16, 16, "down");
await play("leaveLarkfold");
await expect("autumn at camp", (s) => s.stage === "ab1" && s.map === "camp");
await play("kane"); await expect("Kane sends the section to Thornwick", (s) => s.stage === "ab2");
await play("thornArrive"); await expect("Thornwick", (s) => s.map === "thornwick" && s.stage === "ab3"); await shot("thornwick");
await play("bucks", [0]); await expect("the bathhouse fight is won", (s) => s.stage === "ab3c");
// claiming Thornwick: under the chapel, the kits, the sluices in the carved order, the Old Mother
await play("underDown"); await expect("under Thornwick", (s) => s.map === "undercroft"); await shot("undercroft");
await play("kits", [0]); if ((await f()).kits !== true) fail("the kits are still in the gap");
await play("valveHigh", [0]); await play("valveLow", [0]); await play("valveSing", [0]); await expect("the sluices are open", (s) => s.stage === "ab3e");
await play("cisternBoss"); await expect("Thornwick is claimed", (s) => s.map === "thornwick" && s.stage === "ab4");
if ((await f()).bathhouse !== "driven") fail("bathhouse not driven");
await play("workChoice", [1]); await expect("the storeroom first", (s) => s.stage === "ab5");
await play("dorrit"); await play("heskComes"); await expect("winter coming", (s) => s.stage === "ab7");
await play("thornBed"); await expect("Corran's evenings", (s) => s.stage === "ac1" && s.map === "yard"); await shot("corran-yard");
await play("halloranPromote"); await play("lisleEvenings"); await expect("the back rooms", (s) => s.map === "rooms" && s.stage === "ac3");
await play("roomsTable"); await expect("snow at Thornwick", (s) => s.map === "thornwick" && s.stage === "ab8"); await shot("snow");
await play("mossOut"); await play("umesArrive"); await expect("Ume's terraces", (s) => s.map === "umes"); await shot("umes");
await play("factor"); await play("umeMeet"); await play("tobinHome"); await play("mossOut");
await expect("Tobin weaning", (s) => s.stage === "ab12");
await play("thornBed"); await expect("Finch's birthday", (s) => s.stage === "ac5");
await play("finchBirthday"); await expect("the high pass", (s) => s.map === "highpass"); await shot("highpass");
await play("finchPass"); await expect("back to Rhea", (s) => s.stage === "ab13");
await play("carter"); await play("kane"); await expect("Kane told", (s) => s.stage === "ab15");
await play("raidHome"); await expect("the raid beaten off", (s) => s.stage === "ab16");
await play("oakesTalk"); await play("lyleTalk"); await play("verdict", [0]); await expect("the verdict", (s) => s.stage === "ab18");
await play("thornBed"); await play("rider"); await expect("Kell's Bridge", (s) => s.map === "kellsbridge" && s.stage === "ab20"); await shot("bridge");
await play("bridge"); await expect("the parley", (s) => s.stage === "ab21");
await play("bridgeHome"); await play("thornBed"); await expect("the hiding", (s) => s.stage === "ac7");
await play("lisleHiding"); await expect("the back room", (s) => s.map === "backroom"); await shot("backroom");
await play("smuggler", [1]); await play("finchLie"); await expect("spring", (s) => s.stage === "ab22");
await play("tobinClean"); await play("thornBed"); await play("promotion"); await expect("Lieutenant", (s) => s.stage === "ab25");
if ((await f()).rank !== "Lieutenant") fail("no promotion");
await play("thornBed"); await expect("the pressure bell", (s) => s.stage === "ac10");
await play("roomsTable", [1]); await play("bellChild1"); await play("bellChild2"); await play("bellChild3"); await play("bellDoor");
await expect("the bell night ends", (s) => s.stage === "ac12");
await play("posyMorning"); await play("halloranBell"); await expect("back at Thornwick", (s) => s.stage === "ab26");
const end = await play("childGate"); await shot("end");
if (!end.ended) fail(`the end of what's written: ${JSON.stringify(end)}`);

if (errors.length) fail("page errors: " + errors.join(" | "));
console.log(process.exitCode ? "act2 e2e FAILED" : "act2 e2e passed", `in ${((Date.now() - t0) / 1000).toFixed(1)}s`, `joins ${joins}`);
await browser.close(); server.close();
