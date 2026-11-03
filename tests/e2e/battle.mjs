// Plays the trail battle in a real browser: talks to the warden, fights with real key presses, checks a timed
// press is graded, wins (with auto timing to keep it fast), and checks the warden is gone and the win is saved.
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
const bt = () => page.evaluate(() => window.__lull.battle()?.debug() ?? null);

// walk up to the warden on the trail and talk
await page.evaluate(() => { const s = window.__lull.game.scenes.top; s.player.x = 10 * 16 + 2; s.player.y = 11 * 16 - 2 - 6; s.player.facing = "down"; });
await page.keyboard.press("Enter"); await page.waitForTimeout(100);
const talk = await page.evaluate(() => window.__lull.explore());
if (!talk.dialog?.includes("Trail")) fail(`warden did not speak: ${talk.dialog}`);
await page.keyboard.press("Enter"); await page.waitForTimeout(50); await page.keyboard.press("Enter"); // finish typing, then close
await page.waitForFunction(() => window.__lull.battle()?.debug().mode === "menu", null, { timeout: 5000 });
let d = await bt();
if (d.acting !== "rhea" || d.skills[0] !== "strike") fail(`unexpected first turn ${JSON.stringify(d)}`);
await page.waitForTimeout(400);
await page.screenshot({ path: "test-results/battle-menu.png" });

// a real timed strike: choose Strike, the first target, then press Space when the ring closes
await page.keyboard.press("Enter"); await page.waitForTimeout(80);
if ((await bt()).mode !== "target") fail("no target selection");
if (shots) await page.screenshot({ path: "test-results/battle-target.png" });
await page.keyboard.press("Enter");
await page.waitForFunction(() => window.__lull.battle()?.debug().qte, null, { timeout: 3000 });
const qAt = Date.now();
if (shots) await page.screenshot({ path: "test-results/battle-qte.png" });
await page.waitForTimeout(Math.max(0, 430 - (Date.now() - qAt)));
await page.keyboard.press("Space");
await page.waitForFunction(() => window.__lull.battle()?.debug().acting === "tam", null, { timeout: 5000 });
d = await bt();
const w1 = d.units.find((u) => u.id === "w1");
if (!(w1.hp < 26)) fail(`strike did no damage: ${JSON.stringify(d.units)}`);
if (shots) { await page.waitForTimeout(100); await page.screenshot({ path: "test-results/battle-after-hit.png" }); }

// the rest of the fight with auto timing, choosing the first move and first target every turn
await page.keyboard.press("KeyT");
const t0 = Date.now(); let shotFoe = false;
while (Date.now() - t0 < 90000) {
  d = await bt();
  if (!d) break;
  if (d.mode === "over") { await page.screenshot({ path: "test-results/battle-over.png" }); await page.keyboard.press("Enter"); break; }
  if (shots && !shotFoe && d.qte?.mode === "brace") { shotFoe = true; await page.screenshot({ path: "test-results/battle-brace.png" }); }
  if (d.mode === "menu") { await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); }
  await page.waitForTimeout(120);
}
const ex = await page.evaluate(() => ({ battle: window.__lull.battle()?.debug() ?? null, explore: window.__lull.explore(), flags: window.__lull.game.flags }));
if (ex.battle) fail(`battle did not end: ${JSON.stringify(ex.battle)}`);
if (!ex.flags["won.trail-wardens"]) fail(`win not recorded: ${JSON.stringify(ex.flags)}`);
if (!ex.explore.dialog?.includes("trail down the mountain is open")) fail(`no after line: ${ex.explore.dialog}`);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("lull.save.auto")).flags);
if (!saved["won.trail-wardens"]) fail("win not in the autosave");
// experience: the win levels Rhea and Tamsin up, says so, and the levels are saved
const party = await page.evaluate(() => JSON.parse(localStorage.getItem("lull.save.auto")).party);
if (!(party.rhea?.level > 3) || !(party.tamsin?.level > 3)) fail(`no level-up saved: ${JSON.stringify(party)}`);
const ash = await page.evaluate(() => JSON.parse(localStorage.getItem("lull.save.auto")).kith?.ash);
if (!ash || !ash.habits?.some((h) => h > 0)) fail(`Ash did not learn from the fight: ${JSON.stringify(ash)}`);
await page.keyboard.press("Enter"); await page.waitForTimeout(50); await page.keyboard.press("Enter"); await page.waitForTimeout(100);
const lvl = await page.evaluate(() => window.__lull.explore().dialog);
if (!/reaches level 4/.test(lvl ?? "")) fail(`no level-up line: ${lvl}`);
await page.screenshot({ path: "test-results/battle-after.png" });

if (errors.length) fail("page errors: " + errors.join(" | "));
console.log(process.exitCode ? "battle e2e FAILED" : "battle e2e passed", `in ${((Date.now() - t0) / 1000).toFixed(1)}s of auto play`);
await browser.close(); server.close();
