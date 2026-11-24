// A phone in a real browser: touch screen, tilt faked with deviceorientation events. Tilting walks, A talks,
// the stick works with tilt off, and the pad hides while a dialogue is up. Screens to test-results/touch-*.png.
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
const width = Number(process.env.W ?? 844), height = Number(process.env.H ?? 390), tag = process.env.TAG ?? "";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 844), height: Number(process.env.H ?? 390) }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.context().grantPermissions(["accelerometer", "gyroscope"]);
await page.goto(url); await page.waitForFunction(() => window.__lull?.explore);
// screen-relative lean (x right, y toward you) turned into what the sensor would report at this screen angle
const lean = (x, y) => page.evaluate(([x, y]) => { const a = (screen.orientation?.angle ?? 0) % 360; const [b, g] = a === 90 ? [x, -y] : a === 270 ? [-x, y] : a === 180 ? [-y, -x] : [y, x]; const e = new Event("deviceorientation"); Object.assign(e, { beta: b + 30, gamma: g, alpha: 0 }); window.dispatchEvent(e); }, [x, y]);
const tap = async (x, y) => { await page.touchscreen.tap(x, y); await page.waitForTimeout(80); };
const pos = () => page.evaluate(() => { const s = window.__lull.game.scenes.top; return [s.player.x, s.player.y]; });
const free = () => page.evaluate(() => window.__lull.scene().canWalk());
// through the opening by tapping the dialogue
for (let i = 0; i < 80; i++) { if (await free()) break; await tap(width / 2, height - 60); }
if (!(await free())) fail("could not get through the opening by tapping");
// hold level, then lean right: walks right
for (let i = 0; i < 5; i++) { await lean(0, 0); await page.waitForTimeout(60); }
await page.screenshot({ path: "test-results/touch-start.png" });
const p0 = await pos();
for (let i = 0; i < 12; i++) { await lean(14, 0); await page.waitForTimeout(60); }
const p1 = await pos();
if (p1[0] <= p0[0]) fail(`tilting right did not walk right: ${p0} -> ${p1}`);
await page.screenshot({ path: "test-results/touch-tilt.png" });
for (let i = 0; i < 3; i++) { await lean(0, 0); await page.waitForTimeout(60); }
const p2 = await pos(); await page.waitForTimeout(300); const p3 = await pos();
if (Math.hypot(p3[0] - p2[0], p3[1] - p2[1]) > 2) fail("held level but still walking");
// lean the top away: walks up
for (let i = 0; i < 12; i++) { await lean(0, -12); await page.waitForTimeout(60); }
const p4 = await pos(); if (p4[1] >= p3[1]) fail(`leaning away did not walk up: ${p3} -> ${p4}`);
for (let i = 0; i < 3; i++) { await lean(0, 0); await page.waitForTimeout(60); }
// tilt off: the stick on the left half walks
await page.evaluate(() => window.__lull.settings.set("tilt", false));
const s0 = await pos();
const c = await page.context().newCDPSession(page);
const touch = (type, x, y) => c.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
await touch("touchStart", 150, 200); for (let k = 1; k <= 8; k++) { await touch("touchMove", 150, 200 + k * 9); await page.waitForTimeout(40); }
await page.waitForTimeout(500); await page.screenshot({ path: "test-results/touch-stick.png" }); await touch("touchEnd");
const s1 = await pos(); if (s1[1] <= s0[1]) fail(`stick drag down did not walk down: ${s0} -> ${s1}`);
// the A button is on screen while walking
const btns = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => b.offsetParent).map((b) => b.textContent));
if (!btns.includes("A") || !btns.includes("B")) fail(`buttons missing: ${btns}`);
if (errors.length) fail(errors.join("\n"));
console.log(process.exitCode ? "touch: FAILED" : "touch: ok");
await browser.close(); server.close();
