// Side stories in a real browser: the hidden nations, the breeder's road and the novelty quests, walked up to and played.
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
    if (b.mode === "over") { await page.screenshot({ path: `test-results/side-${name}.png` }); await tap("Enter"); return; }
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
const shot = async (n) => { await page.waitForTimeout(600); await page.screenshot({ path: `test-results/side-${n}.png` }); };
const setFlags = (o) => page.evaluate((o) => Object.assign(window.__lull.game.flags, o), o);
const music = () => page.evaluate(() => window.__lull.battle()?.music ?? null);
const check = async (what, ok) => { const f = await flags(); if (!ok(f)) fail(`${what}`); else console.log("ok:", what, ((Date.now() - t0) / 1000).toFixed(0) + "s"); };

// the opening scene of a new game, read through first
for (let i = 0; i < 30; i++) { await page.waitForTimeout(300); const s = await ex(); if (s.busy || s.dialog || s.fading) await answer(); else if (i > 5) break; }

console.log("opening done", JSON.stringify(await ex()));
// ---- novelty quests in the Cloudline and the vale, from Act I
await setFlags({ stage: "a6", hero: "rhea", act1: true });
await travel("town-highmoss", 8, 6, "up"); await meet("side-cheese-top"); await answer([1, 1]);
await check("the cheese went to the girl", (f) => f["nov.cheese"] === "gave");
await travel("town-mistfold", 12, 12, "up"); await meet("side-swear-lane"); await answer();
await meet("side-swear-widow"); await answer();
await meet("side-swear-lane"); await answer();
await check("the loftbuck moved", (f) => f["nov.swear"] === true);
await travel("millbridge--wharf", 8, 9, "up"); await meet("side-post-wharf"); await answer();
await travel("town-dripstone", 10, 9, "up"); await meet("side-post-dripstone"); await answer();
await meet("side-stars-terrace"); await answer([0]); await meet("side-stars-terrace"); await answer([0]);
await travel("town-highmoss", 16, 10, "up"); await meet("side-post-highmoss"); await answer();
await travel("millbridge--wharf", 8, 9, "up"); await meet("side-post-wharf"); await answer([1]);
await check("the moon letter answered and the stars charted", (f) => f["nov.post.moon"] === "answered" && f["nov.stars"] === true);
await travel("town-kerrow", 13, 9, "up"); await meet("side-riddler-bridge"); const r1 = await answer([0]);
await check("the riddler isn't stumped before Vael", (f) => !f["nov.riddle"]);
await shot("riddler");

// ---- the hidden nations, from Act III
await setFlags({ stage: "ad9", dellanDone: "truth", "recruited.dellan": true, iselMet: true, galleriesDone: true, cassDone: "kept", recruited: true });
await travel("thornwick", 20, 8, "up"); await meet("side-dellan-pens"); await answer([1]);
await check("Dellan spends her summers on the ridge", (f) => f.vaelHome === "summers");
await shot("dellan-home");
await meet("side-ghost-stair"); await answer();
await check("Bell the ghost joined", (f) => f["kith.nov-bell"]);
await travel("town-candle-galleries", 14, 8, "up"); await meet("side-abbess-chair"); await answer([0]);
await meet("side-sister-curtain"); await answer();
await check("the Abbess and Brannoc's night", (f) => f.lowWater === "greenlings" && f.brannocNight);
await travel("town-kerrow", 13, 9, "up"); await meet("side-riddler-bridge"); await answer([2]);
await check("the riddler is stumped", (f) => f["nov.riddle"] === true);
await setFlags({ stage: "ad5" });
await travel("town-lockkeepers-deep", 6, 10, "up"); await meet("side-ledger-reeds"); await answer();
await travel("town-weirbank", 16, 9, "up"); await meet("side-gaunt-weir"); await answer([0]);
await check("Gaunt's favour", (f) => f.canalFavour);
await travel("town-cinderwick--market", 12, 9, "up"); await meet("side-beauty-ring"); await answer([1]);
await check("Bell won Best Cat", (f) => f["nov.beauty"] === "bell");

// ---- the Road year: Vael's trappers (a battle), the breeder's road, the Salt House, Osk, the Herd, Lantern Cards
await setFlags({ stage: "ah5", vaelAsked: "told", "recruited.hesk": true, "open.cloudline-vael": true, rank: "Captain", act2: true, act3: true,
  party: "tamsin,ash,brannoc", "party.brannoc": true, ash: true, "recruited.tamsin": true, "recruited.brannoc": true, noWild: true });
await scene("s.checkJoins(true); s.follow([\"tamsin\", \"ash\", \"brannoc\"]); s.drill(16)");
await travel("town-highspire", 11, 12, "up"); await meet("side-isel-bridge");
for (let i = 0; i < 80 && !(await page.evaluate(() => window.__lull.battle())); i++) { const s = await ex(); if (s.dialog) await tap("Enter", 80); else await page.waitForTimeout(150); }
await page.waitForFunction(() => window.__lull.battle()?.debug().mode === "menu", null, { timeout: 15000 }).catch(() => {});
const m1 = await music(); if (m1 !== "battle") fail(`trappers' battle music: ${m1}`); else console.log("ok: battle music", m1);
await shot("trappers");
await answer();
await check("the Spire verses", (f) => f.spireSongs);
await travel("thornwick", 22, 13, "up"); await meet("side-foaling-pen"); await answer([0]);
await check("Thimble was born", (f) => f["br.foal"] && f["kith.br-thimble"]);
await shot("thimble");
await travel("hollin-fair", 14, 9, "up"); await meet("side-judging-ring"); await answer([0]);
await travel("thornwick", 22, 13, "up"); await meet("side-foaling-pen"); await answer();
await check("Hesk asked for rare strains", (f) => f["br.strainsAsked"]);
await setFlags({ stage: "ah10", saltDone: true, saltRecords: "kept" });
await travel("town-salt-house", 14, 11, "up"); await meet("side-salt-dyke"); await answer([0]);
await travel("town-highspire", 16, 9, "up"); await meet("side-spire-ledge"); await answer();
await meet("side-isel-bridge").catch(() => {});
await travel("town-salt-house", 10, 10, "up"); await meet("side-panner-dyke"); await answer();
await meet("side-panner-dyke"); await answer([0]);
await check("the Salt House: records kept, the story told true", (f) => f.saltBurn === "kept" && f.saltStory === "true");
await travel("thornwick", 22, 13, "up"); await meet("side-foaling-pen"); await answer();
await check("Hesk is pairing the new bloods", (f) => f["br.strainsDone"] && f["wait.br"] === 6);
for (const st of ["ah11", "ah12", "ah13", "ah14", "ah15", "ah16", "ah17"]) { await setFlags({ stage: st }); await scene("s.changed()"); await page.waitForTimeout(250); }
await check("a season passed at Thornwick", (f) => !f["wait.br"]);
await meet("side-foaling-pen"); await answer([0]);
await check("Patience was raised", (f) => f["br.flawed"] === "raised" && f["kith.br-patience"]);
await setFlags({ stage: "ah25", oskDone: "upper", "road.lorne": "won", herdDone: "stopped" });
await travel("town-cinder-landing", 12, 13, "up"); await meet("side-harl-harbour"); await answer([1]);
await check("Osk hidden after the beach fight", (f) => f.oskFate === "hidden");
await travel("town-summer-fold", 11, 9, "up"); await meet("side-rider-fold"); await answer([0]);
await meet("side-rider-fold"); await answer();
await check("the Matriarch came", (f) => f["kith.matriarch"]);
await shot("matriarch");
await travel("ashby-tavern", 12, 8, "up"); await meet("side-cards-lantern"); await answer([1]);
await check("Mother Gorse beaten", (f) => f["nov.cards.ashby"]);

if (errors.length) fail(errors.join("\n"));
console.log(process.exitCode ? "side: FAILED" : `side: ok (${joins} join cards, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
await browser.close(); server.close();
