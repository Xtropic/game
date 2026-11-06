// Player settings: sound levels, voices, text and battle speed, auto timing, always run. Kept in the browser
// (not in save files), so they carry across every save slot. The in-game menu changes them; whoever cares about
// a setting listens for changes.

export interface Settings {
  /** 0..1 */
  music: number;
  /** 0..1 */
  effects: number;
  /** 0..1 */
  voices: number;
  /** Multiplier on how fast lines without a recording type out. */
  textSpeed: number;
  /** Multiplier on battle animations (not on timing rings, which keep their real speed). */
  battleSpeed: number;
  /** Hits and braces land as "good" without pressing. */
  autoTiming: boolean;
  /** Battles choose each ally's move for them. */
  autoBattle: boolean;
  /** Run without holding Shift. */
  alwaysRun: boolean;
}

export const DEFAULTS: Settings = { music: 0.8, effects: 0.8, voices: 1, textSpeed: 1, battleSpeed: 1, autoTiming: false, autoBattle: false, alwaysRun: false };
export const TEXT_SPEEDS = [0.6, 1, 1.6, 3];
export const BATTLE_SPEEDS = [1, 1.5, 2];

const KEY = "lull.settings", OLD_AUTO = "lull.autoTiming";

interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void; }
const store = (): Store | null => { try { return localStorage; } catch { return null; } };

const clamp01 = (x: unknown, d: number): number => (typeof x === "number" && isFinite(x) ? Math.max(0, Math.min(1, x)) : d);
const oneOf = (x: unknown, list: number[], d: number): number => (typeof x === "number" && list.includes(x) ? x : d);

/** Reads settings, filling anything missing or broken with the defaults. */
export function parseSettings(raw: string | null, oldAuto: string | null = null): Settings {
  let o: Record<string, unknown> = {};
  try { o = raw ? JSON.parse(raw) : {}; } catch { o = {}; }
  if (typeof o !== "object" || !o) o = {};
  return {
    music: clamp01(o.music, DEFAULTS.music), effects: clamp01(o.effects, DEFAULTS.effects), voices: clamp01(o.voices, DEFAULTS.voices),
    textSpeed: oneOf(o.textSpeed, TEXT_SPEEDS, DEFAULTS.textSpeed), battleSpeed: oneOf(o.battleSpeed, BATTLE_SPEEDS, DEFAULTS.battleSpeed),
    autoTiming: typeof o.autoTiming === "boolean" ? o.autoTiming : oldAuto === "1",
    autoBattle: typeof o.autoBattle === "boolean" ? o.autoBattle : DEFAULTS.autoBattle,
    alwaysRun: typeof o.alwaysRun === "boolean" ? o.alwaysRun : DEFAULTS.alwaysRun,
  };
}

class SettingsStore {
  value: Settings;
  private listeners: ((s: Settings) => void)[] = [];
  constructor() { const s = store(); this.value = parseSettings(s?.getItem(KEY) ?? null, s?.getItem(OLD_AUTO) ?? null); }
  get<K extends keyof Settings>(k: K): Settings[K] { return this.value[k]; }
  set<K extends keyof Settings>(k: K, v: Settings[K]): void {
    this.value = { ...this.value, [k]: v };
    const s = store();
    try { s?.setItem(KEY, JSON.stringify(this.value)); if (k === "autoTiming") s?.setItem(OLD_AUTO, v ? "1" : "0"); } catch { /* storage may be blocked */ }
    for (const l of this.listeners) l(this.value);
  }
  onChange(fn: (s: Settings) => void): void { this.listeners.push(fn); }
}

export const settings = new SettingsStore();
