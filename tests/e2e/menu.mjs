// The menu in a real browser: opens on M, shows every page, changes a fitting, uses an item, changes a setting,
// and closes again. Screenshots of each page go to test-results/menu-*.png.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("../../dist/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = createServer(async (req, res) => {
  try { const p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html")); res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }); res.end(await readFile(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };
const width = Number(process.env.W ?? 1280), height = Number(process.env.H ?? 720), tag = process.env.TAG ?? "";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url); await page.waitForFunction(() => window.__lull?.explore);
for (let i = 0; i < 60; i++) { await page.waitForTimeout(80); const d = await page.evaluate(() => window.__lull.explore()); if (!d.dialog && !d.busy && i > 3) break; if (d.dialog) await page.keyboard.press("Enter"); }
// a company on the road below Larkfold, a little hurt, with things in the pack
await page.evaluate(() => {
  const l = window.__lull, g = l.game, s = g.scenes.top;
  Object.assign(g.flags, { stage: "a2", "recruited.brannoc": true, "have.bandage": 2, "have.willowbark": 1, "have.charm-moss": 1, "have.head-hatchery": 1, "health.rhea": 0.4, "health.tam": 0.55, "health.ash": 0.7 });
  g.party.rhea = { level: 4, xp: 37 };
  s.follow(["tamsin", "ash", "brannoc"]); s.changed();
});
await page.waitForTimeout(300);
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(60); } };
const menu = () => page.evaluate(() => { const m = window.__lull.game.scenes.top.menu; return { open: m.open, tab: m.tab, focus: m.focus, i: m.i, msg: m.msg }; });
const shot = (n) => page.screenshot({ path: `test-results/menu-${n}${tag}.png` });

// Brannoc's join card comes up first: let it arrive, then go on
for (let i = 0; i < 40 && (await page.evaluate(() => window.__lull.explore().joining)); i++) { await page.waitForTimeout(150); await page.keyboard.press("Enter"); }
await key("KeyM");
if (!(await menu()).open) fail("M did not open the menu");
await shot("party");
await key("ArrowDown"); await shot("party-tamsin");
await key("ArrowDown"); await shot("party-ash"); await key("ArrowUp", 2);
// Gear: fit the duskwort sprig to Rhea's charm slot
await key("ArrowRight"); if ((await menu()).tab !== 1) fail("Right did not go to Gear");
await key("ArrowUp", 3); await key("ArrowDown"); // back to the first in the list
await key("Enter"); await key("ArrowDown"); await key("Enter"); // slots -> charm -> pick
await shot("gear-pick");
await key("Enter");
const charm = await page.evaluate(() => window.__lull.game.gear.rhea?.charm);
if (charm !== "charm-moss") fail(`charm not fitted: ${charm}`);
await key("Escape");
// Items: bandages on Rhea
await key("ArrowRight"); if ((await menu()).tab !== 2) fail("Right did not go to Items");
await shot("items");
await key("Enter"); await key("Enter");
const after = await page.evaluate(() => ({ h: window.__lull.game.flags["health.rhea"], n: window.__lull.game.flags["have.bandage"] }));
if (after.h !== 0.7 || after.n !== 1) fail(`bandage not used on Rhea: ${JSON.stringify(after)}`);
await shot("items-used");
// Settings: battle speed up one step
await key("ArrowRight"); if ((await menu()).tab !== 3) fail("Right did not go to Settings");
await key("ArrowDown", 5); await key("ArrowRight");
const speed = await page.evaluate(() => window.__lull.settings.get("battleSpeed"));
if (speed !== 1.5) fail(`battle speed ${speed}`);
await shot("settings");
await key("ArrowLeft"); // back to x1
// Save page
await key("ArrowUp", 8); await key("ArrowRight"); await key("ArrowDown");
await shot("save");
await key("KeyM");
if ((await menu()).open) fail("M did not close the menu");
// the hurt line in the corner follows the item
const wounds = await page.evaluate(() => window.__lull.game.scenes.top.wounds.text);
if (!wounds.includes("Rhea 70%")) fail(`wounds line: ${wounds}`);
if (errors.length) fail("page errors: " + errors.join(" | "));
console.log(process.exitCode ? "menu e2e FAILED" : "menu e2e passed");
await browser.close(); server.close();
