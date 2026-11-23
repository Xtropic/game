// Duels: one against one, read and answer. Pure rules; the scene (duelScene.ts) only animates and asks for answers.
//
//   An exchange   the foe shows how he's about to come at you (high, low, or a straight thrust) for a moment, then
//                 commits. Answer high or low with a parry, step aside from a thrust, or strike into him.
//                 The right answer turns his blow and you land one back. Striking trades blows (yours hits harder).
//                 A wrong answer, or none, and he lands his.
//   Reading       how long his stance shows is your wits (duel.read), less his finesse. Tired, you read less.
//   Feints        some foes show one stance and switch to another. Sharp wits against his may catch the shift early.
//   Stamina       every exchange costs; a strike costs more. Out of breath, your read is short. Speaking is a breath.
//   Words         every few exchanges there's a pause to speak: presence against his nerve to shake him, heart to
//                 calm his kith. Each word once. His resolve falls with his guard and with words; at nothing, he yields.
import data from "../../data/battle/duels.json";
import { attrsAt, duel as DUEL, type Attr, type Attrs } from "../cast/attributes";

export type Move = "high" | "low" | "thrust";
export type Answer = "high" | "low" | "side" | "strike";
export const COUNTER: Record<Move, Answer> = { high: "high", low: "low", thrust: "side" };
export const MOVES: Move[] = ["high", "low", "thrust"];

export interface Word { id: string; label: string; attr: Attr; vs: Attr; effect: "resolve" | "calm"; amount?: number; line: string; land: string; miss: string; }
export interface DuelFoe { name: string; look: string; cast: string; level: number; moves: Record<Move, number>; feint: number; /** Mounted: "low" is his kith's hooves; calmed, he fights on foot and can't come at you low. */ mount?: string; lines: { hit: string[]; hurt: string[]; yield: string; down: string }; }
export interface DuelDef { id: string; name: string; backdrop: string; intro: string[]; foe: DuelFoe; words: Word[]; /** The story needs it won: lost, it starts again. */ mustWin?: boolean; prize?: number; won: string; lost: string; }
export const DUELS = data.duels as unknown as Record<string, DuelDef>;

export interface Duellist { name: string; look: string; attrs: Attrs; guard: number; max: number; stamina: number; maxSta: number; resolve: number; }
export interface DuelState { def: DuelDef; hero: Duellist; foe: Duellist; round: number; /** The exchange after which the last pause came. */ pausedAt: number; calmed: boolean; said: string[]; over: null | "won" | "yielded" | "lost"; }
export type Rng = () => number;

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const guardOf = (a: Attrs): number => Math.round(30 + a.grit * 1.5);

export function createDuel(def: DuelDef, hero: { name: string; look: string; attrs: Attrs }): DuelState {
  const fa = attrsAt(def.foe.cast, def.foe.level);
  const side = (name: string, look: string, a: Attrs): Duellist => ({ name, look, attrs: a, guard: guardOf(a), max: guardOf(a), stamina: DUEL.stamina(a), maxSta: DUEL.stamina(a), resolve: 100 });
  return { def, hero: side(hero.name, hero.look, hero.attrs), foe: side(def.foe.name, def.foe.look, fa), round: 0, pausedAt: 0, calmed: false, said: [], over: null };
}

/** What the foe does next: the move he means, and (a feint) the one he shows first. Tired, he can't feint. */
export function nextMove(s: DuelState, rng: Rng): { move: Move; shown: Move } {
  const w = { ...s.def.foe.moves }; if (s.def.foe.mount && s.calmed) w.low = 0;
  const total = MOVES.reduce((n, m) => n + w[m], 0);
  let r = rng() * total, move: Move = "high";
  for (const m of MOVES) { if (r < w[m]) { move = m; break; } r -= w[m]; }
  if (s.foe.stamina > 0 && rng() < s.def.foe.feint) { const others = MOVES.filter((m) => m !== move && w[m] > 0); if (others.length) return { move, shown: others[Math.floor(rng() * others.length)] }; }
  return { move, shown: move };
}

/** Seconds his stance shows before he commits. */
export function readTime(s: DuelState): number {
  const tired = s.hero.stamina <= 0 ? 0.6 : 1, slow = s.foe.stamina <= 0 ? 1.4 : 1;
  return DUEL.read(s.hero.attrs) * clamp(1.25 - s.foe.attrs.finesse / 80, 0.6, 1.2) * tired * slow;
}
/** Chance to see a feint for what it is before it turns. */
export const seeFeint = (s: DuelState): number => clamp(s.hero.attrs.wits / (s.hero.attrs.wits + s.foe.attrs.wits), 0.15, 0.85);

const dmg = (att: Attrs, def: Attrs, rng: Rng, k = 1): number => Math.max(1, Math.round(8 * DUEL.blow(att) * (12 / (12 + def.grit / 3)) * (0.9 + rng() * 0.2) * k));

export interface Exchange { kind: "turned" | "trade" | "hit"; toFoe: number; toHero: number; line: string; }
/** One exchange: his move against your answer (null if you didn't answer in time). */
export function exchange(s: DuelState, move: Move, answer: Answer | null, rng: Rng): Exchange {
  const h = s.hero, f = s.foe, D = s.def.foe; s.round++;
  let out: Exchange;
  const mounted = !!D.mount && !s.calmed, kk = mounted ? 1.15 : 1;
  if (answer === COUNTER[move]) out = { kind: "turned", toFoe: dmg(h.attrs, f.attrs, rng), toHero: 0, line: move === "thrust" ? "You step aside and catch him going past." : `You turn the ${move} blow and answer it.` };
  else if (answer === "strike") out = { kind: "trade", toFoe: dmg(h.attrs, f.attrs, rng, 1.3), toHero: dmg(f.attrs, h.attrs, rng, kk), line: "You go in under it. You both land." };
  else out = { kind: "hit", toFoe: 0, toHero: dmg(f.attrs, h.attrs, rng, kk), line: answer ? `Wrong way: he was coming ${move === "thrust" ? "straight in" : move}.` : "Too slow." };
  h.guard = Math.max(0, h.guard - out.toHero); f.guard = Math.max(0, f.guard - out.toFoe);
  h.stamina = Math.max(0, h.stamina - (answer === "strike" ? 2 : 1)); f.stamina = Math.max(0, f.stamina - 1);
  if (out.toFoe) f.resolve = Math.max(0, f.resolve - Math.round(out.toFoe * 0.8));
  settle(s);
  return out;
}

/** The pause between exchanges: say something (each word once). A breath either way. */
export function speak(s: DuelState, id: string, rng: Rng): { ok: boolean; line: string } {
  const w = s.def.words.find((x) => x.id === id); if (!w || s.said.includes(id)) return { ok: false, line: "" };
  s.said.push(id); s.hero.stamina = Math.min(s.hero.maxSta, s.hero.stamina + 2);
  const ok = rng() < DUEL.sway({ ...s.hero.attrs, presence: s.hero.attrs[w.attr] }, { ...s.foe.attrs, nerve: s.foe.attrs[w.vs] });
  if (ok) { if (w.effect === "calm") s.calmed = true; else s.foe.resolve = Math.max(0, s.foe.resolve - (w.amount ?? 30)); }
  else s.foe.resolve = Math.min(100, s.foe.resolve + 10);
  settle(s);
  return { ok, line: ok ? w.land : w.miss };
}
/** Words still to say, offered every third exchange. */
export const wordsLeft = (s: DuelState): Word[] => s.def.words.filter((w) => !s.said.includes(w.id) && !(w.effect === "calm" && s.calmed));
export const pauseNow = (s: DuelState): boolean => s.round > 0 && s.round % 3 === 0 && s.pausedAt !== s.round && wordsLeft(s).length > 0;

function settle(s: DuelState): void {
  if (s.hero.guard <= 0) s.over = "lost";
  else if (s.foe.guard <= 0) s.over = "won";
  else if (s.foe.resolve <= 0 || (s.foe.guard < s.foe.max * 0.25 && s.foe.resolve < 40)) s.over = "yielded";
}
