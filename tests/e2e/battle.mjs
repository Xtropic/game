// Plays the trail battle in a real browser: takes the night run down the trail, walks into the patrol, fights with
// real key presses, checks a timed press is graded, wins (with auto timing to keep it fast), and checks the story
// carries on, the patrol is gone and the win is saved.
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
const shots = process.argv.includes("--shots");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url); await page.waitForFunction(() => window.__lull?.explore);
// a new game opens with a few lines about Larkfold: read them through
for (let i = 0; i < 60; i++) { await page.waitForTimeout(80); const d = await page.evaluate(() => window.__lull.explore()); if (!d.dialog && !d.busy && i > 3) break; if (d.dialog) await page.keyboard.press("Enter"); }
const bt = () => page.evaluate(() => window.__lull.battle()?.debug() ?? null);

// the night of the greenling run: Tamsin and Ash follow Rhea down the trail, and she walks into the patrol
await page.evaluate(() => { const g = window.__lull.game, s = g.scenes.top; Object.assign(g.flags, { stage: "n3b", light: "night", gateOpen: true }); s.follow(["tamsin", "ash"]); s.goto("trail", 9, 8, "down", () => {}); });
await page.waitForTimeout(300); // arriving waits for keys to be let go, so a held key cannot walk straight back out
await page.keyboard.down("ArrowDown");
await page.waitForFunction(() => window.__lull.explore().dialog, null, { timeout: 8000 });
await page.keyboard.up("ArrowDown");
const talk = await page.evaluate(() => window.__lull.explore());
if (!talk.dialog?.includes("Grey coats")) fail(`walking into the patrol said: ${talk.dialog}`);
await page.keyboard.press("Enter"); await page.waitForTimeout(50); await page.keyboard.press("Enter"); // finish typing, then close
await page.waitForFunction(() => window.__lull.battle()?.debug().mode === "menu", null, { timeout: 5000 });
let d = await bt();
// Tamsin's finesse gives her the higher initiative, so she opens
if (d.acting !== "tam" || d.skills[0] !== "sling") fail(`unexpected first turn ${JSON.stringify(d)}`);
await page.waitForTimeout(400);
await page.screenshot({ path: "test-results/battle-menu.png" });

// a real timed shot: choose Sling, the first target, then press Space when the ring closes
await page.keyboard.press("Enter"); await page.waitForTimeout(80);
if ((await bt()).mode !== "target") fail("no target selection");
if (shots) await page.screenshot({ path: "test-results/battle-target.png" });
await page.keyboard.press("Enter");
await page.waitForFunction(() => window.__lull.battle()?.debug().qte, null, { timeout: 3000 });
const qAt = Date.now();
if (shots) await page.screenshot({ path: "test-results/battle-qte.png" });
await page.waitForTimeout(Math.max(0, 430 - (Date.now() - qAt)));
await page.keyboard.press("Space");
await page.waitForFunction(() => window.__lull.battle()?.debug().acting === "rhea", null, { timeout: 5000 });
d = await bt();
const hurt = d.units.filter((u) => ["w1", "rc", "w2", "wa"].includes(u.id) && u.hp < { w1: 26, rc: 20, w2: 26, wa: 20 }[u.id]);
if (!hurt.length && !d.log.some((l) => l.includes("slips"))) fail(`shot neither hit nor was dodged: ${JSON.stringify(d)}`);
if (shots) { await page.waitForTimeout(100); await page.screenshot({ path: "test-results/battle-after-hit.png" }); }

// the rest of the fight with auto timing, choosing the first move and first target every turn
await page.keyboard.press("KeyT");
const t0 = Date.now(); let shotFoe = false; const fellAt = {}; let vanished = 0;
while (Date.now() - t0 < 90000) {
  d = await bt();
  if (!d) break;
  // a beaten foe falls, fades and leaves the field within a couple of seconds
  const gone = await page.evaluate(() => { const b = window.__lull.game.scenes.top; return b.vis ? b.s.units.filter((u) => u.side === "foe" && u.hp <= 0).map((u) => [u.id, b.vis.get(u.id).out || b.vis.get(u.id).flee]) : []; });
  for (const [id, out] of gone) { fellAt[id] ??= Date.now(); if (out) vanished++; else if (Date.now() - fellAt[id] > 3000) { fail(`${id} is still on the field 3s after falling`); fellAt[id] = Infinity; } }
  if (d.mode === "over") { await page.screenshot({ path: "test-results/battle-over.png" }); await page.keyboard.press("Enter"); break; }
  if (shots && !shotFoe && d.qte?.mode === "brace") { shotFoe = true; await page.screenshot({ path: "test-results/battle-brace.png" }); }
  if (d.mode === "menu") { await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); }
  await page.waitForTimeout(120);
}
if (!vanished) fail("no fallen foe was seen leaving the field");
const ex = await page.evaluate(() => ({ battle: window.__lull.battle()?.debug() ?? null, explore: window.__lull.explore(), flags: window.__lull.game.flags }));
if (ex.battle) fail(`battle did not end: ${JSON.stringify(ex.battle)}`);
if (!ex.flags["won.trail-wardens"]) fail(`win not recorded: ${JSON.stringify(ex.flags)}`);
if (!ex.explore.dialog?.includes("Below you the trail is empty")) fail(`no after line: ${ex.explore.dialog}`);
if (ex.explore.stage !== "n4") fail(`story did not move on: ${ex.explore.stage}`);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("lull.save.auto")).flags);
if (!saved["won.trail-wardens"]) fail("win not in the autosave");
// experience: the win levels Rhea and Tamsin up, says so, and the levels are saved
const party = await page.evaluate(() => JSON.parse(localStorage.getItem("lull.save.auto")).party);
if (!(party.rhea?.level > 3) || !(party.tamsin?.level > 3)) fail(`no level-up saved: ${JSON.stringify(party)}`);
const ash = await page.evaluate(() => JSON.parse(localStorage.getItem("lull.save.auto")).kith?.ash);
if (!ash || !ash.habits?.some((h) => h > 0)) fail(`Ash did not learn from the fight: ${JSON.stringify(ash)}`);
// Tamsin's line, the climb, then the level-ups
let lvl = null;
for (let i = 0; i < 6 && !/reaches level 4/.test(lvl ?? ""); i++) { await page.keyboard.press("Enter"); await page.waitForTimeout(50); await page.keyboard.press("Enter"); await page.waitForTimeout(100); lvl = await page.evaluate(() => window.__lull.explore().dialog); }
if (!/reaches level 4/.test(lvl ?? "")) fail(`no level-up line: ${lvl}`);
await page.screenshot({ path: "test-results/battle-after.png" });

if (errors.length) fail("page errors: " + errors.join(" | "));
console.log(process.exitCode ? "battle e2e FAILED" : "battle e2e passed", `in ${((Date.now() - t0) / 1000).toFixed(1)}s of auto play`);
await browser.close(); server.close();
