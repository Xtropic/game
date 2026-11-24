// Thornwick: the section's post, and the game's base. Everything here is pure rules over the story flags, so it
// saves with them and can be tested on its own. The panel (ui/basePanel.ts) only reads and calls these.
//
//   Buildings   each has levels; raising one costs coin and supplies and then days of building work
//   Jobs        recruits who stay at Thornwick are set to a job at a building; their attributes (cast/attributes
//               jobSkill) decide how much a day of it is worth, and cooks lift everyone
//   A day       passes whenever the story moves on while Thornwick is held, and when Rhea rests there. Each day the
//               workers trade, haul, build, craft, heal, drill and scout, and kith in the pens are raised
//   Forge       reforging uses gear/weapons canReforge with the forge's level and the best smith's attributes
//   Pens        kith left at Thornwick are fed, penned and worked by the plan set for each (kith/upbringing)
//
// Flags used: base.lv.<building>, base.build (what is being built), base.work (work done on it), base.job.<id>,
// base.make.<building> (recipe), base.made.<building> (work on it), base.day, supplies, pen.<kith id> "feed|pen|work".
import data from "../../data/base/buildings.json";
import { ITEMS } from "../gear/items";
import { jobSkill, type Attrs, type Job } from "../cast/attributes";
import { raiseDay } from "../kith/upbringing";
import { addKithXp, type Kith } from "../kith/kith";
import type { Flags } from "../story/story";

export interface Level { name: string; coin: number; supplies: number; work: number; gives: string; }
export interface Building { name: string; note: string; jobs: Job[]; levels: Level[]; }
export interface Recipe { level: number; work: number; supplies: number; in: string; }

export const BUILDINGS = data.buildings as unknown as Record<string, Building>;
export const BUILDING_IDS = Object.keys(BUILDINGS);
export const RECIPES = data.recipes as Record<string, Recipe>;
export const PENS = data.pens as { slots: number[]; breedAt: number; ringAt: number; feeds: string[][]; pens: string[][]; work: string[][] };

const num = (f: Flags, k: string): number => { const v = f[k]; return typeof v === "number" ? v : 0; };

/** Thornwick is held: the story has reached the post taken from the Old Mother. */
export const baseOpen = (f: Flags): boolean => !!f["base.open"];
export const levelOf = (f: Flags, b: string): number => num(f, `base.lv.${b}`);
export const supplies = (f: Flags): number => num(f, "supplies");
export const day = (f: Flags): number => num(f, "base.day");
export const jobOf = (f: Flags, id: string): Job | undefined => { const j = f[`base.job.${id}`]; return typeof j === "string" && j ? (j as Job) : undefined; };
/** The building a job is done at. */
export const buildingFor = (job: Job): string | undefined => BUILDING_IDS.find((b) => BUILDINGS[b].jobs.includes(job));
/** Every job someone can be set to: building work, plus building itself. */
export const ALL_JOBS: Job[] = ["build", ...BUILDING_IDS.flatMap((b) => BUILDINGS[b].jobs)];
export const JOB_NAMES: Record<string, string> = {
  build: "Building", haul: "Hauling", trade: "Trading", forge: "Smithing", craft: "Crafting", heal: "Healing", kith: "Kith keeping",
  cook: "Cooking", teach: "Teaching", records: "Keeping records", guard: "Guarding", scout: "Scouting",
};

// ---- building ---------------------------------------------------------------------------------------------

export interface RaiseCheck { ok: boolean; why?: string; level?: Level; }
/** Can building b be raised a level now? Only one thing is built at a time. */
export function canRaise(f: Flags, coin: number, b: string): RaiseCheck {
  const B = BUILDINGS[b], lv = levelOf(f, b), next = B?.levels[lv + 1];
  if (!B) return { ok: false, why: "No such building." };
  if (!next) return { ok: false, why: `The ${B.name.toLowerCase()} is as good as it gets.` };
  const building = f["base.build"];
  if (building) return { ok: false, why: `The builders are busy on the ${BUILDINGS[String(building)].name.toLowerCase()}.`, level: next };
  if (coin < next.coin) return { ok: false, why: `Needs ${next.coin} coin; you have ${coin}.`, level: next };
  if (supplies(f) < next.supplies) return { ok: false, why: `Needs ${next.supplies} supplies; the stores hold ${supplies(f)}.`, level: next };
  return { ok: true, level: next };
}
/** Pays for the next level of b and sets the builders on it. Returns the coin left. */
export function startRaise(f: Flags, coin: number, b: string): number {
  const c = canRaise(f, coin, b); if (!c.ok || !c.level) return coin;
  f.supplies = supplies(f) - c.level.supplies; f["base.build"] = b; f["base.work"] = 0;
  return coin - c.level.coin;
}

// ---- a day at Thornwick -------------------------------------------------------------------------------------

export interface Worker { id: string; name: string; attrs: Attrs; }
export interface DayInput { flags: Flags; coin: number; workers: Worker[]; kith: Kith[]; rng: () => number; }
export interface DayOutput { coin: number; lines: string[]; /** Experience for those drilled at Thornwick, by id. */ drill: Record<string, number>; }

/** How hard a job's worth of skill counts at a building of this level: the building's level lifts its own work. */
const levelBoost = (lv: number): number => 1 + 0.5 * lv;

/** One day of work at Thornwick. Changes flags (supplies, building, crafts, items) and the kith; returns coin and a report. */
export function baseDay(inp: DayInput): DayOutput {
  const f = inp.flags, lines: string[] = [], drill: Record<string, number> = {};
  let coin = inp.coin;
  f["base.day"] = day(f) + 1;
  const by = (job: Job) => inp.workers.filter((w) => jobOf(f, w.id) === job);
  const skill = (job: Job) => by(job).reduce((s, w) => s + jobSkill(w.attrs, job), 0);
  // cooks lift every other job: up to +40% at the long hall
  const fed = 1 + Math.min(0.4, skill("cook") * 0.08 * (1 + levelOf(f, "kitchen")));
  const work = (job: Job, b: string) => skill(job) * levelBoost(levelOf(f, b)) * fed;

  const trade = Math.round(work("trade", "stores") * 9);
  const haul = Math.round(work("haul", "stores") * 4);
  if (trade) { coin += trade; lines.push(`Trade brought in ${trade} coin.`); }
  if (haul) { f.supplies = supplies(f) + haul; lines.push(`Haulers brought in ${haul} supplies.`); }

  // building: one project at a time; everyone on "build" adds to it
  const b = f["base.build"];
  if (typeof b === "string" && b) {
    const need = BUILDINGS[b].levels[levelOf(f, b) + 1]?.work ?? 0, done = num(f, "base.work") + (skill("build") + (f.brannocBuilder ? 2 : 0)) * fed; // Brannoc, off the fighting line after Sallow, runs the works
    if (done >= need) { f[`base.lv.${b}`] = levelOf(f, b) + 1; f["base.build"] = ""; f["base.work"] = 0; lines.push(`The ${BUILDINGS[b].levels[levelOf(f, b)].name.toLowerCase()} is finished.`); }
    else { f["base.work"] = Math.round(done * 10) / 10; if (skill("build") === 0) lines.push(`Nobody is building: the ${BUILDINGS[b].name.toLowerCase()} waits.`); }
  }

  // crafting at the workshop and the infirmary: each works on its chosen recipe until it is made
  for (const [where, job] of [["workshop", "craft"], ["infirmary", "heal"]] as const) {
    const r = f[`base.make.${where}`], lv = levelOf(f, where);
    if (typeof r !== "string" || !r || !RECIPES[r] || lv < RECIPES[r].level) continue;
    const rec = RECIPES[r];
    let made = num(f, `base.made.${where}`) + work(job, where), n = 0;
    while (made >= rec.work && supplies(f) >= rec.supplies) { made -= rec.work; f.supplies = supplies(f) - rec.supplies; n++; }
    f[`base.made.${where}`] = Math.round(made * 10) / 10;
    if (n) { f[`have.${r}`] = num(f, `have.${r}`) + n; lines.push(`${n} × ${ITEMS[r].name.toLowerCase()} made at the ${BUILDINGS[where].name.toLowerCase()}.`); }
  }

  // teachers drill those who stayed
  const teach = work("teach", "school") * (levelOf(f, "school") ? 1 : 0);
  if (teach > 0) for (const w of inp.workers) drill[w.id] = Math.round(6 * teach);

  // scouts bring back finds now and then; a better watch ranges further
  const scout = work("scout", "watch");
  if (scout > 0 && inp.rng() < Math.min(0.8, 0.25 * scout)) {
    const find = inp.rng() < 0.5 ? ["supplies", 6 + Math.round(scout * 4)] as const : ["coin", 10 + Math.round(scout * 8)] as const;
    if (find[0] === "coin") coin += find[1]; else f.supplies = supplies(f) + find[1];
    lines.push(`Scouts came back with ${find[1]} ${find[0]}.`);
  }

  // the pens: every kith at Thornwick is raised by its plan, tended by the best kith keeper
  const keeper = by("kith").sort((a, b2) => jobSkill(b2.attrs, "kith") - jobSkill(a.attrs, "kith"))[0];
  for (const k of inp.kith) {
    const plan = penPlan(f, k.id, levelOf(f, "pens"));
    raiseDay(k, { ...plan, handler: keeper?.attrs });
    if (keeper && levelOf(f, "pens") >= PENS.ringAt) addKithXp(k, Math.round(4 * jobSkill(keeper.attrs, "kith")));
  }
  if (inp.kith.length && !keeper) lines.push("Nobody keeps the pens: the kith are fed, but not handled.");
  return { coin, lines, drill };
}

// ---- the pens ---------------------------------------------------------------------------------------------

/** Feeds, pens and kinds of work open at a pens level (each level adds to the last). */
export function penChoices(lv: number): { feed: string[]; pen: string[]; work: string[] } {
  const upTo = (rows: string[][]) => rows.slice(0, lv + 1).flat();
  return { feed: upTo(PENS.feeds), pen: upTo(PENS.pens), work: upTo(PENS.work) };
}
export const penSlots = (f: Flags): number => PENS.slots[Math.min(PENS.slots.length - 1, levelOf(f, "pens"))];
/** The plan for a kith in the pens; anything not chosen, or not open at this level, falls back to the first choice. */
export function penPlan(f: Flags, id: string, lv: number): { feed: string; pen: string; work: string } {
  const c = penChoices(lv), raw = String(f[`pen.${id}`] ?? "").split("|");
  const pick = (v: string | undefined, list: string[]) => (v && list.includes(v) ? v : list[0]);
  return { feed: pick(raw[0], c.feed), pen: pick(raw[1], c.pen), work: pick(raw[2], c.work) };
}
export function setPenPlan(f: Flags, id: string, part: "feed" | "pen" | "work", value: string): void {
  const p = penPlan(f, id, levelOf(f, "pens")); p[part] = value; f[`pen.${id}`] = `${p.feed}|${p.pen}|${p.work}`;
}

// ---- crafting ---------------------------------------------------------------------------------------------

export const recipesAt = (f: Flags, where: string): string[] => Object.keys(RECIPES).filter((r) => RECIPES[r].in === where && levelOf(f, where) >= RECIPES[r].level);

// ---- the forge --------------------------------------------------------------------------------------------

/** The forge level as weapons.ts counts it (0 = none). */
export const forgeLevel = (f: Flags): number => levelOf(f, "forge");

// ---- coin from fights -------------------------------------------------------------------------------------

/** Coin left by beaten foes: people carry purses, kith don't. */
export const coinForFoe = (level = 2, kith = false): number => (kith ? 0 : 3 + level * 2);

/** The best job for someone, by their attributes: where they would do the most good. */
export function bestJob(a: Attrs): Job {
  return [...ALL_JOBS].sort((x, y) => jobSkill(a, y) - jobSkill(a, x))[0];
}

// ---- raids ------------------------------------------------------------------------------------------------

/** Stages when a Warden column might come for Thornwick: Thornwick is held and nothing in the story is on a knife-edge. */
const QUIET = (st: string): boolean => {
  const m = /^ab(\d+)/.exec(st); if (m) return Number(m[1]) >= 6;
  return ["ad1", "ad2", "ad3", "ad10", "ad11", "ad12", "ad17", "ad18", "ad19", "ad20"].includes(st);
};
/**
 * After a day at Thornwick: now and then the scouts see a Warden column coming. It arrives a few days later (more
 * warning with a better watch) and attacks when Rhea is next at Thornwick. Returns a line for the report, if any.
 */
export function raidCheck(f: Flags, stage: string, rng: () => number): string | undefined {
  if (!baseOpen(f) || !QUIET(stage)) return undefined;
  const d = day(f), due = num(f, "base.raid");
  if (due) return d >= due ? "The Warden column is at Thornwick's gate." : undefined;
  // once the Wardens know the road (the children came by Kerrow ferry), they come oftener
  const known = !!f.roadKnown;
  if (d - num(f, "base.lastRaid") < (known ? 5 : 8) || rng() > (known ? 0.32 : 0.18)) return undefined;
  const warn = 2 + levelOf(f, "watch");
  f["base.raid"] = d + warn;
  return `Scouts: a Warden column on the road, ${warn} days out. They'll come for Thornwick.`;
}
export const raidDue = (f: Flags): boolean => { const due = num(f, "base.raid"); return !!due && day(f) >= due; };
/** The raid is over: beaten off, or Thornwick sacked (stores burned, the builders' work lost, coin taken). */
export function raidOver(f: Flags, coin: number, won: boolean): { coin: number; line: string } {
  f["base.raid"] = 0; f["base.lastRaid"] = day(f);
  if (won) { f.supplies = supplies(f) + 12; return { coin: coin + 45, line: "The Wardens leave their dead, their purses and two carts of stores on the road. Thornwick takes all of it: 45 coin and 12 supplies." }; }
  const lost = Math.round(coin * 0.25); f.supplies = Math.floor(supplies(f) / 2); f["base.work"] = 0;
  return { coin: coin - lost, line: `The Wardens burn half the stores, take ${lost} coin from the strongroom, and pull down whatever the builders had up. They're gone by morning.` };
}
