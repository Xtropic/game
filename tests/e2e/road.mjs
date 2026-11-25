// Plays the Long Road in a real browser: each scene runs as if its trigger fired, and is read, chosen and fought with key presses.
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
const fail = async (m) => { console.error("FAIL:", m); process.exitCode = 1; await page.screenshot({ path: "test-results/road-FAIL.png" }).catch(() => {}); process.exit(1); };

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
    if (b.mode === "over") { await page.screenshot({ path: `test-results/road-${name}.png` }); await tap("Enter"); return; }
    if (b.mode === "menu") { await tap("Enter", 10); await tap("Enter", 10); }
    await page.waitForTimeout(100);
  }
  fail(`${name}: the battle did not end`);
}


/** Runs a story script as if its trigger fired, then reads it through: picks choices in order, fights any battle. */
async function play(name, picks = []) {
  for (let i = 0; i < 5 && await page.evaluate(() => window.__lull.scene().menu.open); i++) await tap("Tab", 250);
  await scene("s.runner.run([{ run: a }])", name); await page.waitForTimeout(80);
  for (let i = 0; i < 20; i++) { const s = await ex(); if (s.busy || s.dialog || s.fading || s.choosing) break; await page.waitForTimeout(75); }
  for (let i = 0; i < 40; i++) {
    const s = await read(400);
    if (await page.evaluate(() => window.__lull.battle()?.debug().mode)) { await fight(name); continue; }
    if (await page.evaluate(() => window.__lull.armyState() || window.__lull.duelState())) { await decide(); continue; }
    // the party picker (the Road opens it when Rhea picks her company): close it
    if (await page.evaluate(() => window.__lull.scene().menu.open)) { await tap("Tab", 250); continue; }
    if (s.choosing) { const k = picks.shift() ?? 0; for (let j = 0; j < k; j++) await tap("ArrowDown"); await tap("Enter", 80); continue; }
    return s;
  }
  return ex();
}

/** Army battles and duels are tested on their own (tests/unit/army, duel); here they are decided at once, so the story runs on. */
async function decide(won = true) {
  for (let i = 0; i < 200; i++) {
    const a = await page.evaluate(() => window.__lull.armyState()), d = await page.evaluate(() => window.__lull.duelState());
    if (!a && !d) return;
    if (a && a.phase === "field" && !a.over) await page.evaluate((w) => { window.__lull.game.scenes.top.s.over = w ? "won" : "lost"; }, won);
    else if (d && !d.over && d.phase !== "intro") await page.evaluate((w) => { window.__lull.game.scenes.top.s.over = w ? "won" : "lost"; }, won);
    await tap("Enter", 120);
  }
  fail("an army battle or duel did not end");
}
const shot = async (n) => { await page.waitForTimeout(600); await page.screenshot({ path: `test-results/road-${n}.png` }); };
const f = () => flags();
const at = async (what, ok) => expect(what, ok);

// ---- after Lockside: the council sends Rhea west ----
await page.evaluate(() => Object.assign(window.__lull.game.flags, { stage: "ad20", hero: "rhea", rank: "Captain", act2: true, act3: true, corranFate: "thornwick",
  party: "tamsin,ash,brannoc", "party.brannoc": true, ash: true, "recruited.haldane": true, collegeProof: true, tobinNight: true, noWild: true }));
await travel("thornwick", 14, 6, "up");
await play("lastNight", [0, 0, 0, 0]); await at("the road starts", (s) => s.stage === "ah1");
// 1. the West
await travel("hollin-fair", 13, 12, "up"); await play("fairArrive"); await shot("fair");
await play("kit", [0]); await at("into Hollin", (s) => s.stage === "ah3");
await play("speaker"); await travel("town-peatmoor", 8, 10, "up"); await play("ansel"); await play("reedHide", [1]);
await travel("hollin-tannery", 5, 5, "up"); await play("orla"); await play("cellar"); await shot("tannery");
await travel("hollin-quay", 6, 8, "up"); await play("bryn"); await play("barge"); await at("the wards", (s) => s.stage === "ah5");
await travel("town-college", 13, 12, "up"); await shot("college"); await play("haldaneGate"); await play("libraryDoor");
await at("the archive", (s) => s.map === "college-archive"); await shot("archive");
await play("archiveGuards"); await play("provostPress"); await play("hearing"); await travel("town-hollin", 14, 14, "up"); await shot("hollin");
await play("speaker", [0]); await at("the West done", (s) => s.stage === "ah8");
// 2. the Coast
await play("saul", [1]); await travel("town-ashby", 22, 15, "up"); await play("ashbyArrive"); await shot("ashby");
await play("harbourOffice"); await travel("ashby-tavern", 11, 9, "up"); await shot("tavern");
await play("pike", [0, 0, 0]); await play("meg", [0, 0, 0]); await play("annet", [0, 0, 0]);
await play("harbourOffice"); await play("moleEnd", [0, 0, 0]); await at("the Coast done", (s) => s.stage === "ah14");
// 3 and 4. the North
await travel("town-drovers-halt", 16, 10, "up"); await play("abel", [0]);
await travel("town-grazehold", 12, 10, "up"); await shot("grazehold"); await play("riders");
await travel("town-kestrel-fort", 14, 8, "up"); await shot("kestrel"); await play("gerdHall"); await play("arvoStable", [1]);
await at("the clans", (s) => s.stage === "ah18");
await travel("town-snowgate", 13, 10, "up"); await shot("snowgate"); await play("snowgate", [0]);
await travel("town-holm", 21, 15, "up"); await play("holmGate"); await shot("holm");
await play("kingsDinner", [1]); await travel("town-frostmere", 12, 11, "up"); await shot("frostmere"); await play("frostmere");
await travel("town-holm", 14, 12, "up"); await play("sigrun", [0]); await play("aurelCase", [0, 0]);
await at("Lorne done", (s) => s.stage === "ah23"); if ((await f())["road.lorne"] !== "won") fail("the trial was not won");
// 5. the East
await travel("town-tallyhill", 12, 11, "up"); await shot("tallyhill"); await play("tollHouse");
await travel("town-corvane", 20, 15, "up"); await shot("corvane"); await play("ottilie", [0]); await play("ilseHouse"); await play("vaultIn");
await at("the vault", (s) => s.map === "corvane-vault"); await shot("vault"); await play("vaultGuards"); await play("ledgers"); await play("settling", [1]);
await travel("town-tarsis", 20, 14, "up"); await shot("tarsis"); await play("tarsisGate"); await play("vela"); await play("infirmary"); await play("vela", [1]);
await at("the East done", (s) => s.stage === "ah31");
// 6. Ember
await play("imari", [0]); await at("Ember", (s) => s.map === "town-ember"); await shot("ember");
await play("palaceIn"); await travel("ember-garden", 9, 8, "up"); await shot("garden"); await play("rashidGarden"); await play("nadraFather");
await play("palaceIn"); await at("the palace", (s) => s.map === "ember-palace"); await shot("palace"); await play("palaceGuards"); await play("sanctuary");
await play("twoPrinces", [1, 0]); await at("the Crown next", (s) => s.stage === "ah37");
// 7. the Crown
await travel("town-kingsmere", 20, 14, "up"); await shot("kingsmere"); await play("kingsmereArrive");
await travel("royal-parks", 14, 11, "up"); await shot("parks"); await play("aldousLodge"); await play("odileHerd");
await play("queenDinner"); await at("the palace at night", (s) => s.map === "kingsmere-palace"); await shot("night-palace");
await play("galleryGuards"); await play("theAnswer", [0, 0]);
await at("home for the autumn", (s) => s.stage === "af1" && s.map === "thornwick"); await shot("home");
const fl = await f();
for (const k of ["road.college", "road.ashby", "road.drevka", "road.lorne", "road.league", "road.tarsis", "road.ember", "road.crown"]) if (!fl[k]) fail(`no ${k}`);
if (errors.length) fail(errors.slice(0, 5).join(" | "));
console.log(`road: ${((Date.now() - t0) / 1000).toFixed(0)}s, ${joins} joins, flags`, JSON.stringify(Object.fromEntries(Object.entries(fl).filter(([k]) => k.startsWith("road.")))));
await browser.close(); server.close();
