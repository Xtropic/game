// Where the cut scenes play. The story files stay as the writers left them: at load, each hook below finds its
// script (and, if given, the spoken or narrated line inside it) and slips a { cut } step in beside it. A cut
// scene shows only what is happening at that moment, never what comes later.
// tests/unit/cutscene.test.ts fails if a hook's script or line goes missing, so a rewrite can't drop one silently.
import type { Step, Story } from "../story/story";

export interface Hook {
  scene: string;
  script: string;
  /** Text that the line must contain. Left out: the scene plays as the script starts. */
  line?: string;
  /** Before or after that line (default before). */
  when?: "before" | "after";
}

export const HOOKS: Hook[] = [
  // the prologue: a morning in Larkfold, the lamp on the cliff, the morning after, Rook
  { scene: "larkfold-dawn", script: "opening" },
  { scene: "lamp-signal", script: "signal", line: "a lamp blinks in the dark" },
  { scene: "larkfold-ash", script: "burned", line: "By dawn there is nothing to climb to" },
  { scene: "rook-gone", script: "rookDying", line: "Then he's gone, and the square is very quiet", when: "after" },
  // Corran's night: the column in the cloud, and the word
  { scene: "cloud-column", script: "cloudPath", line: "You know every cairn on the cloud path" },
  { scene: "torches", script: "cloudGate", line: "\"Torches.\"", when: "after" },
  // the Commons: the vote at the fire
  { scene: "hands-up", script: "sectionVote", line: "The hands go up round the fire" },
  // Thornwick: the Old Mother rises, the spring runs again
  { scene: "old-mother", script: "cisternBoss", line: "On the dry shelf at the back" },
  { scene: "spring-runs", script: "cisternDone", line: "Up in the yard, the spring is filling", when: "after" },
  // Kell's Bridge at dusk
  { scene: "bridge-hood", script: "exchange", line: "The sack slips off his head", when: "after" },
  // the night before Vantry, Halloran, the halls
  { scene: "tin-in-hand", script: "relapse", line: "A fresh lull, warm in the tin" },
  { scene: "halloran-falls", script: "halloranDown", line: "He goes down by the fire" },
  { scene: "halls-burn", script: "burning", line: "The brood halls are already burning", when: "after" },
];

const has = (st: Step, text: string): boolean => "say" in st && st.text.includes(text);

/** Finds the list holding the line (searching inside ifs, choices and fights) and where in it. */
function findLine(steps: Step[], text: string): { list: Step[]; i: number } | null {
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    if (has(st, text)) return { list: steps, i };
    const kids: Step[][] = [];
    if ("if" in st || "pay" in st) { kids.push(st.then); if (st.else) kids.push(st.else); }
    if ("choose" in st) for (const o of st.options) kids.push(o.do);
    if ("battle" in st && st.win) kids.push(st.win);
    if ("duel" in st || "army" in st) { if (st.win) kids.push(st.win); if (st.lose) kids.push(st.lose); }
    for (const k of kids) { const f = findLine(k, text); if (f) return f; }
  }
  return null;
}

/** Weaves the cut scenes into the story's scripts (once). Returns the hooks it couldn't place. */
export function weaveCutscenes(story: Story, hooks: Hook[] = HOOKS): Hook[] {
  const missed: Hook[] = [];
  for (const h of hooks) {
    const sc = story.scripts[h.script];
    if (!sc) { missed.push(h); continue; }
    const cut: Step = { cut: h.scene };
    const already = (list: Step[]) => list.some((s) => "cut" in s && s.cut === h.scene);
    if (!h.line) { if (!already(sc)) sc.unshift(cut); continue; }
    const f = findLine(sc, h.line);
    if (!f) { missed.push(h); continue; }
    if (already(f.list)) continue;
    f.list.splice(h.when === "after" ? f.i + 1 : f.i, 0, cut);
  }
  return missed;
}
