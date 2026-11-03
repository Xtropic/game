// Story scripts: what happens when the player talks to someone, steps somewhere, sings or looks at something.
// Written as data (data/story/*.json) so the writing stays readable and every spoken line can be found and
// recorded. A script is a list of steps; the runner plays them in order, pausing on lines, choices, fades,
// map changes and battles until the scene says they're done.

export type Value = boolean | number | string;
export type Flags = Record<string, Value>;

/** All conditions given must hold. */
export interface Cond {
  stage?: string | string[];
  stagePrefix?: string;
  flag?: string | string[];
  not?: string | string[];
  eq?: Record<string, Value>;
  hero?: string;
  map?: string | string[];
}

export interface Option { label: string; hint?: string; by?: string; when?: Cond; do: Step[]; }

export type Step =
  | { say: string; text: string }
  | { choose: string; options: Option[] }
  | { if: Cond; then: Step[]; else?: Step[] }
  | { set?: Flags; add?: Record<string, number> }
  | { stage: string }
  | { follow: string[] }
  | { toast: string }
  | { fade: string }
  | { goto: { map: string; x: number; y: number; facing?: "up" | "down" | "left" | "right" } }
  | { battle: string; win?: Step[] }
  | { run: string }
  | { hero: string }
  | { chapter: string }
  | { end: string };

export interface Actor { id: string; map: string; x: number; y: number; look: string; name?: string; when?: Cond; talk?: Step[]; touch?: Step[]; pickup?: boolean; }
export interface StepTrigger { map: string; at: [number, number]; when?: Cond; do: Step[]; }
export interface Zone { map: string; area: [number, number, number, number]; when?: Cond; do: Step[]; }
export interface Look { map?: string; tile: string; when?: Cond; do: Step[]; }
export interface Song { when?: Cond; near?: string; range?: number; do: Step[]; }
export interface Hazard { map: string; when?: Cond; kind: "steam"; sources: [number, number][]; spreadEvery: number; spreadBy: number; max: number; on: string; burn: number; fail: Step[]; }

export interface Story {
  id: string;
  title: string;
  start: { map: string; x: number; y: number; facing: "up" | "down" | "left" | "right"; stage: string; hero: string; set?: Flags };
  cast: Record<string, string>;
  objectives: Record<string, string>;
  actors: Actor[];
  steps: StepTrigger[];
  zones: Zone[];
  looks: Look[];
  songs: Song[];
  hazards: Hazard[];
  scripts: Record<string, Step[]>;
}

/** Numbers named here are kept within 0..100 when added to. */
export const BOUNDED = new Set(["hold", "finchTrust"]);

const list = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export interface Where { flags: Flags; map: string; }

export function holds(c: Cond | undefined, w: Where): boolean {
  if (!c) return true;
  const stage = String(w.flags.stage ?? "");
  if (c.stage !== undefined && !list(c.stage).includes(stage)) return false;
  if (c.stagePrefix !== undefined && !stage.startsWith(c.stagePrefix)) return false;
  if (list(c.flag).some((f) => !w.flags[f])) return false;
  if (list(c.not).some((f) => !!w.flags[f])) return false;
  if (c.eq && Object.entries(c.eq).some(([k, v]) => w.flags[k] !== v)) return false;
  if (c.hero !== undefined && (w.flags.hero ?? "rhea") !== c.hero) return false;
  if (c.map !== undefined && !list(c.map).includes(w.map)) return false;
  return true;
}

/** What the runner asks the scene to do. Each blocking call gets `done` to resume the script. */
export interface StoryHost {
  where(): Where;
  line(who: string, name: string, text: string, done: () => void): void;
  choose(prompt: string, options: { label: string; hint?: string }[], done: (i: number) => void): void;
  fade(caption: string, done: () => void): void;
  goto(map: string, x: number, y: number, facing: "up" | "down" | "left" | "right" | undefined, done: () => void): void;
  battle(id: string, done: () => void): void;
  follow(ids: string[]): void;
  toast(text: string): void;
  changed(): void;
  end(id: string): void;
}

export class StoryRunner {
  private queue: Step[] = [];
  private waiting = false;
  constructor(readonly story: Story, private host: StoryHost) {}

  get busy(): boolean { return this.waiting || this.queue.length > 0; }

  /** Starts a script; if one is already running, its steps run after the current ones. */
  run(steps: Step[]): void { this.queue.push(...steps); this.pump(); }

  private flags(): Flags { return this.host.where().flags; }

  private pump(): void {
    while (!this.waiting && this.queue.length) {
      const st = this.queue.shift()!;
      this.exec(st);
    }
  }

  private resume = (): void => { this.waiting = false; this.pump(); };
  private block(): void { this.waiting = true; }
  private front(steps: Step[]): void { this.queue.unshift(...steps); }

  private exec(st: Step): void {
    const f = this.flags();
    if ("say" in st) { this.block(); this.host.line(st.say || "narrator", st.say ? (this.story.cast[st.say] ?? st.say) : "", st.text, this.resume); return; }
    if ("choose" in st) {
      const shown = st.options.filter((o) => holds(o.when, this.host.where()));
      this.block();
      this.host.choose(st.choose, shown.map((o) => ({ label: o.label, hint: o.hint })), (i) => {
        const o = shown[i];
        const then = [...o.do];
        if (o.by) then.unshift({ say: o.by, text: o.label });
        this.front(then); this.resume();
      });
      return;
    }
    if ("if" in st) { this.front(holds(st.if, this.host.where()) ? st.then : st.else ?? []); return; }
    if ("stage" in st) { f.stage = st.stage; this.host.changed(); return; }
    if ("follow" in st) { this.host.follow(st.follow); return; }
    if ("toast" in st) { this.host.toast(st.toast); return; }
    if ("fade" in st) { this.block(); this.host.fade(st.fade, this.resume); return; }
    if ("goto" in st) { this.block(); const g = st.goto; this.host.goto(g.map, g.x, g.y, g.facing, this.resume); return; }
    if ("battle" in st) { const win = st.win ?? []; this.block(); this.host.battle(st.battle, () => { this.front(win); this.resume(); }); return; }
    if ("run" in st) { const s = this.story.scripts[st.run]; if (!s) throw new Error(`no script ${st.run}`); this.front(s); return; }
    if ("hero" in st) { f.hero = st.hero; this.host.changed(); return; }
    if ("chapter" in st) { f.chapter = st.chapter; this.host.changed(); return; }
    if ("end" in st) { this.queue = []; this.host.end(st.end); return; }
    if ("set" in st || "add" in st) {
      for (const [k, v] of Object.entries(st.set ?? {})) f[k] = v;
      for (const [k, v] of Object.entries(st.add ?? {})) { const n = (typeof f[k] === "number" ? (f[k] as number) : 0) + v; f[k] = BOUNDED.has(k) ? Math.max(0, Math.min(100, n)) : n; }
      this.host.changed(); return;
    }
    throw new Error(`unknown story step ${JSON.stringify(st)}`);
  }
}

/** Every spoken line in a story, with who says it: lines, and choices a character says aloud. For voice recording. */
export function storyLines(s: Story): { who: string; text: string }[] {
  const out: { who: string; text: string }[] = [];
  const walk = (steps: Step[] | undefined): void => {
    for (const st of steps ?? []) {
      if ("say" in st) out.push({ who: st.say || "narrator", text: st.text });
      if ("choose" in st) { out.push({ who: "narrator", text: st.choose }); for (const o of st.options) { if (o.by) out.push({ who: o.by, text: o.label }); walk(o.do); } }
      if ("if" in st) { walk(st.then); walk(st.else); }
      if ("battle" in st) walk(st.win);
    }
  };
  for (const a of s.actors) { walk(a.talk); walk(a.touch); }
  for (const g of [...s.steps, ...s.zones, ...s.looks, ...s.songs]) walk(g.do);
  for (const h of s.hazards) walk(h.fail);
  for (const sc of Object.values(s.scripts)) walk(sc);
  const seen = new Set<string>();
  return out.filter((l) => { const k = `${l.who}|${l.text}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Problems with a story's data: unknown scripts, maps, battles or speakers. */
export function checkStory(s: Story, maps: Set<string>, battles: Set<string>): string[] {
  const errs: string[] = [];
  const walk = (steps: Step[] | undefined, where: string): void => {
    for (const st of steps ?? []) {
      if ("run" in st && !s.scripts[st.run]) errs.push(`${where}: no script ${st.run}`);
      if ("goto" in st && !maps.has(st.goto.map)) errs.push(`${where}: no map ${st.goto.map}`);
      if ("battle" in st && !battles.has(st.battle)) errs.push(`${where}: no battle ${st.battle}`);
      if ("say" in st && st.say && !s.cast[st.say]) errs.push(`${where}: ${st.say} is not in the cast`);
      if ("stage" in st && !s.objectives[st.stage]) errs.push(`${where}: stage ${st.stage} has no objective`);
      if ("choose" in st) for (const o of st.options) walk(o.do, where);
      if ("if" in st) { walk(st.then, where); walk(st.else, where); }
      if ("battle" in st) walk(st.win, where);
    }
  };
  for (const a of s.actors) { if (!maps.has(a.map)) errs.push(`actor ${a.id}: no map ${a.map}`); walk(a.talk, `actor ${a.id}`); walk(a.touch, `actor ${a.id}`); }
  s.steps.forEach((g, i) => { if (!maps.has(g.map)) errs.push(`step ${i}: no map ${g.map}`); walk(g.do, `step ${i} on ${g.map}`); });
  s.zones.forEach((g, i) => walk(g.do, `zone ${i}`));
  s.looks.forEach((g, i) => walk(g.do, `look ${i}`));
  s.songs.forEach((g, i) => walk(g.do, `song ${i}`));
  s.hazards.forEach((h, i) => walk(h.fail, `hazard ${i}`));
  for (const [k, sc] of Object.entries(s.scripts)) walk(sc, `script ${k}`);
  if (!maps.has(s.start.map)) errs.push(`start: no map ${s.start.map}`);
  return errs;
}
