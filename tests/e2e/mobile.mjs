// A phone, by touch alone (no keys): Android-sized screen upright and on its side. Taps go through the opening
// (anywhere on screen), the sound starts from a tap, the Menu button opens the menu, its tabs and Close are tapped,
// a long page scrolls with a drag, the Guide scrolls with a drag, a battle is fought by tapping its command buttons,
// and the join card goes away with a tap. Screens to test-results/mobile-play-*.png.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("../../dist/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = createServer(async (req, res) => {
  try { const p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html")); const body = await readFile(p); res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };
const browser = await chromium.launch();

for (const [width, height] of [[412, 915], [915, 412]]) {
  const tag = `${width}x${height}`;
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url); await page.waitForFunction(() => window.__lull?.explore);
  await page.evaluate(() => window.__lull.settings.set("tilt", false));
  const tap = async (x, y) => { await page.touchscreen.tap(x, y); await page.waitForTimeout(120); };
  const cdp = await page.context().newCDPSession(page);
  const drag = async (x, y0, y1) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0, id: 1 }] });
    for (let k = 1; k <= 8; k++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + ((y1 - y0) * k) / 8, id: 1 }] }); await page.waitForTimeout(30); }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await page.waitForTimeout(150);
  };
  /** The middle of the first visible Pixi text that matches. */
  const find = (re) => page.evaluate((src) => {
    const r = new RegExp(src), out = [];
    const walk = (o) => { if (!o.visible || o.worldAlpha === 0) return; if (o.text !== undefined && typeof o.text === "string" && r.test(o.text)) { const b = o.getBounds(); out.push([b.x + b.width / 2, b.y + b.height / 2]); } for (const c of o.children ?? []) walk(c); };
    walk(window.__lull.game.app.stage); return out[0] ?? null;
  }, re.source);
  const tapText = async (re) => { const at = await find(re); if (!at) { fail(`${tag}: no "${re.source}" on screen`); return false; } await tap(at[0], at[1]); return true; };
  const explore = () => page.evaluate(() => window.__lull.explore());

  // the opening: tap anywhere (high on the screen, away from the box) moves each line on
  for (let i = 0; i < 60; i++) { const d = await explore(); if (!d.dialog && !d.busy && !d.fading && i > 2) break; await tap(width / 2, 80); }
  if ((await explore()).dialog) fail(`${tag}: taps above the dialogue box did not move it on`);
  const sound = await page.evaluate(() => window.__lull.sound.ctx?.state ?? "none");
  if (sound !== "running") fail(`${tag}: sound did not start from taps (${sound})`);
  await page.screenshot({ path: `test-results/mobile-play-walk-${tag}.png` });

  // the menu: the Menu button, a tab, a drag down a long page, Close
  await tapText(/Menu$/); await page.waitForTimeout(200);
  if (!(await page.evaluate(() => window.__lull.scene().menu.open))) fail(`${tag}: Menu button did not open the menu`);
  await tapText(/^Settings$/); await page.waitForTimeout(150);
  if (await page.evaluate(() => window.__lull.scene().menu.lastPage) !== "Settings") fail(`${tag}: tapping the Settings tab did not open it`);
  const sc = () => page.evaluate(() => window.__lull.scene().menu.scroller);
  const before = await sc();
  if (before.max > 0) {
    await drag(width / 2, height * 0.7, height * 0.35);
    const after = await sc(); if (!(after.scroll > 0)) fail(`${tag}: dragging the settings page did not scroll it (max ${before.max})`);
  }
  await page.screenshot({ path: `test-results/mobile-play-settings-${tag}.png` });
  await tapText(/^Close/); await page.waitForTimeout(150);
  if (await page.evaluate(() => window.__lull.scene().menu.open)) fail(`${tag}: Close did not close the menu`);

  // the Guide: open from its button, drag the page
  await tapText(/Guide/); await page.waitForTimeout(250);
  if (await page.evaluate(() => window.__lull.game.scenes.top.id) !== "guide") fail(`${tag}: Guide button did not open the Guide`);
  else {
    const g = () => page.evaluate(() => window.__lull.game.scenes.top.textScroll);
    const g0 = await g();
    if (g0.max > 0) { await drag(width * 0.75, height * 0.8, height * 0.45); if (!((await g()).scroll > 0)) fail(`${tag}: dragging the Guide page did not scroll it`); }
    await page.screenshot({ path: `test-results/mobile-play-guide-${tag}.png` });
    await tapText(/^Close/); await page.waitForTimeout(200);
    if (await page.evaluate(() => window.__lull.game.scenes.top.id) === "guide") fail(`${tag}: Close did not close the Guide`);
  }

  // a battle by taps: a command button, then a foe on the stage, until it's over (auto battle after a few turns)
  await page.evaluate(() => window.__lull.startBattle("trail-wardens"));
  await page.waitForTimeout(400);
  let tapped = 0;
  for (let i = 0; i < 400; i++) {
    const b = await page.evaluate(() => { const x = window.__lull.battle(); return x && { mode: x.mode, phase: x.debug().phase, qte: !!x.qte, skills: x.debug().skills }; });
    if (!b) break;
    if (b.mode === "over") { await page.screenshot({ path: `test-results/mobile-play-battle-over-${tag}.png` }); await tap(width / 2, height * 0.3); continue; }
    if (b.qte) { await tap(width / 2, height * 0.25); continue; }
    if (b.mode === "menu" && tapped < 3) {
      const before = await page.evaluate(() => window.__lull.battle().mode);
      const names = await page.evaluate(() => { const x = window.__lull.battle(); return x.cmdItems.filter((t) => t.visible).map((t) => t.text); });
      if (!names.length) { await page.waitForTimeout(100); continue; }
      const at = await find(new RegExp(`^${names[0].replace(/[.*+?^${}()|[\]\\×]/g, ".")}$`));
      if (!at) { fail(`${tag}: no command button for ${names[0]}`); break; }
      await tap(at[0], at[1]); tapped++;
      if (tapped === 1) await page.screenshot({ path: `test-results/mobile-play-battle-${tag}.png` });
      const m = await page.evaluate(() => window.__lull.battle()?.mode);
      if (m === "target") { // tap the Back pill, then the command again, then a foe
        await tapText(/Back/); if (await page.evaluate(() => window.__lull.battle()?.mode) !== "menu") fail(`${tag}: Back did not go back to the commands`);
        await tap(at[0], at[1]);
        const foe = await page.evaluate(() => { const x = window.__lull.battle(); const f = x.s.units.find((u) => u.side !== "ally" && u.hp > 0 && !u.gone); if (!f) return null; const [px, py] = x.pos(f); return [x.sx + (px / 256) * x.sw, x.sy + ((py - 18) / 144) * x.sh]; });
        if (foe) await tap(foe[0], foe[1]);
      } else if (m === before && b.skills.length && !(await page.evaluate(() => window.__lull.battle()?.mode !== "menu"))) fail(`${tag}: tapping a command did nothing`);
      continue;
    }
    if (tapped >= 3 && !(await page.evaluate(() => window.__lull.battle()?.debug().auto))) await tapText(/Auto battle off/);
    await page.waitForTimeout(150);
  }
  if (await page.evaluate(() => !!window.__lull.battle())) fail(`${tag}: the battle did not finish by taps`);
  if (tapped < 1) fail(`${tag}: never tapped a command`);

  // a join card goes away with a tap
  await page.evaluate(() => { const s = window.__lull.scene(); s.joins.push({ id: "tamsin", name: "Tamsin", what: "Travels and fights beside Rhea." }); });
  await page.waitForTimeout(2000); await page.screenshot({ path: `test-results/mobile-play-join-${tag}.png` });
  await tap(width / 2, height / 2); await page.waitForTimeout(300);
  if ((await explore()).joining) fail(`${tag}: tapping the join card did not close it`);
  if (errors.length) fail(`${tag}: ${errors.join("\n")}`);
  await page.close();
}
console.log(process.exitCode ? "mobile: FAILED" : "mobile: ok");
await browser.close(); server.close();
