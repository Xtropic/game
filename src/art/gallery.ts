// A sheet of the same figures raised different ways, for checking looks against attributes by eye.
// Reached from the debug hook: __lull.looks() returns a PNG data URL.
import { attrsAt } from "../cast/attributes";
import { drawAsh, drawFig, setScale } from "../battle/art";
import { addKithXp, kithAttrs, kithBaseline, kithXpToNext, type Kith } from "../kith/kith";
import { raiseDay, readKith, starterAsh, type Day } from "../kith/upbringing";
import { buildOf, type Build } from "./build";

function raised(day: Day, to: number, over: Partial<Kith> = {}): Kith {
  const k = { ...starterAsh(), temperament: "gentle" as const, potential: [4, 4, 4, 4, 4, 4, 4], ...over };
  while (k.level < to) { for (let i = 0; i < 6; i++) raiseDay(k, day); addKithXp(k, kithXpToNext(k.level)); }
  return k;
}

export function looksSheet(): string {
  const W = 1500, H = 760, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!; g.fillStyle = "#1b1d22"; g.fillRect(0, 0, W, H);
  const label = (s: string, x: number, y: number, size = 15, col = "#e8e2d4") => { g.font = `${size}px Georgia, serif`; g.fillStyle = col; g.textAlign = "center"; g.fillText(s, x, y); };
  const K = 5; setScale(K);
  const kith: [string, Kith][] = [
    ["Unsteered", raised({}, 30)],
    ["Grain, hauling, cold yard", raised({ feed: "feed:grain-mash", work: "work:haul", pen: "pen:cold-yard" }, 30)],
    ["Fish, scouting, high loft", raised({ feed: "feed:river-fish", work: "work:scout", pen: "pen:high-loft" }, 30)],
    ["Honeycake, tending, warm byre", raised({ feed: "feed:honeycake", work: "work:tend", pen: "pen:warm-byre" }, 30)],
    ["Glowmoss, leading the herd", raised({ feed: "feed:glowmoss", work: "work:herd" }, 30)],
    ["A wild lull", raised({ feed: "feed:lean-rations", work: "work:guard" }, 30, { lull: true })],
  ];
  label("Ash at level 30, raised six ways", W / 2, 34, 20);
  kith.forEach(([name, k], i) => {
    const x = 125 + i * 250, b = buildOf(kithAttrs(k), { level: k.level, rings: k.lull ? 1 : 0, baseline: kithBaseline(k) });
    drawAsh(g, (x - 15) / K, 300 / K, { t: 0.4 }, b);
    label(name, x, 330); label(readKith(k)[0].replace(/^Ash /, ""), x, 352, 12, "#a9a395");
  });
  const people: [string, string, Build][] = [
    ["Rhea, level 3", "rhea", buildOf(attrsAt("rhea", 3), { ...{ level: 3 }, baseline: attrsAt("rhea", 3) })],
    ["Rhea, level 55", "rhea", buildOf(attrsAt("rhea", 55), { ...{ level: 55 }, baseline: attrsAt("rhea", 3) })],
    ["Rhea on the lull, 4 rings", "rhea", buildOf(attrsAt("rhea", 20, ["lull"]), { level: 20, mods: ["lull"], rings: 4, baseline: attrsAt("rhea", 3) })],
    ["Rhea in the raw, 4 rings", "rhea", buildOf(attrsAt("rhea", 20, ["raw"]), { level: 20, mods: ["raw"], rings: 4, baseline: attrsAt("rhea", 3) })],
    ["Tamsin, level 40", "tamsin", buildOf(attrsAt("tamsin", 40), { level: 40, baseline: attrsAt("tamsin", 4) })],
    ["Warden", "warden", buildOf(attrsAt("warden", 20), { level: 20, baseline: attrsAt("warden", 2) })],
  ];
  label("People: the same art, shaped by their attributes and mods", W / 2, 410, 20);
  people.forEach(([name, id, b], i) => { const x = 125 + i * 250; drawFig(g, id, x / K, 700 / K, { t: 0.4 }, b); label(name, x, 735); });
  return c.toDataURL("image/png");
}

/** The battle cast side by side, to check them against their portraits. Debug hook: __lull.cast(). */
export function castSheet(): string {
  const ids = ["rhea", "tamsin", "maren", "brannoc", "ketti", "ferris"];
  const W = 1500, H = 420, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!; g.fillStyle = "#1b1d22"; g.fillRect(0, 0, W, H);
  const K = 5; setScale(K);
  ids.forEach((id, i) => { const x = 125 + i * 250; drawFig(g, id, x / K, 380 / K, { t: 0.4 }); g.font = "15px Georgia, serif"; g.fillStyle = "#e8e2d4"; g.textAlign = "center"; g.fillText(id, x, 408); });
  return c.toDataURL("image/png");
}
