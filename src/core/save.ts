// Saves: versioned JSON in slots. Storage is injected so tests can run without a browser.
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; }

export const SAVE_VERSION = 1;
export const SLOTS = ["auto", "1", "2", "3"] as const;
export type Slot = (typeof SLOTS)[number];

export interface SaveData {
  version: number;
  savedAt: string;
  playSeconds: number;
  place: { map: string; x: number; y: number; facing: "up" | "down" | "left" | "right" };
  flags: Record<string, boolean | number | string>;
}

export interface SaveSummary { slot: Slot; savedAt: string; playSeconds: number; map: string; }

/** Upgrades older save files step by step. Add a case for every SAVE_VERSION bump. */
export function migrate(raw: { version?: number } & Record<string, unknown>): SaveData {
  const d = { ...raw } as Record<string, unknown>;
  const v = typeof d.version === "number" ? d.version : 0;
  if (v > SAVE_VERSION) throw new Error(`Save is from a newer version (${v})`);
  if (v < 1) { d.flags = d.flags ?? {}; d.playSeconds = d.playSeconds ?? 0; d.version = 1; }
  return d as unknown as SaveData;
}

export class SaveStore {
  constructor(private kv: KV, private prefix = "lull.save.") {}

  write(slot: Slot, data: Omit<SaveData, "version" | "savedAt">, now = new Date()): SaveData {
    const full: SaveData = { ...data, version: SAVE_VERSION, savedAt: now.toISOString() };
    this.kv.setItem(this.prefix + slot, JSON.stringify(full));
    return full;
  }

  read(slot: Slot): SaveData | null {
    const s = this.kv.getItem(this.prefix + slot);
    if (!s) return null;
    try { return migrate(JSON.parse(s)); } catch { return null; }
  }

  list(): SaveSummary[] {
    const out: SaveSummary[] = [];
    for (const slot of SLOTS) { const d = this.read(slot); if (d) out.push({ slot, savedAt: d.savedAt, playSeconds: d.playSeconds, map: d.place.map }); }
    return out;
  }

  remove(slot: Slot): void { this.kv.removeItem(this.prefix + slot); }
}

/** In-memory storage, for tests and for browsers that block localStorage. */
export class MemoryKV implements KV {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

export function browserKV(): KV {
  try { const t = "__lull_test"; localStorage.setItem(t, t); localStorage.removeItem(t); return localStorage; } catch { return new MemoryKV(); }
}
