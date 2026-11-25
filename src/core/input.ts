// Input: maps keys and touch buttons to game actions, so scenes never read raw keys.
export type Action = "up" | "down" | "left" | "right" | "confirm" | "cancel" | "run" | "menu" | "timing" | "auto" | "sing" | "company" | "notes" | "ledger" | "guide";

export const DEFAULT_KEYS: Record<string, Action> = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  Enter: "confirm", Space: "confirm", KeyE: "confirm",
  Escape: "cancel", Backspace: "cancel",
  ShiftLeft: "run", ShiftRight: "run",
  Tab: "menu", KeyM: "menu",
  KeyT: "timing",
  KeyB: "auto",
  KeyQ: "sing",
  KeyR: "company",
  KeyJ: "notes",
  KeyL: "ledger",
  KeyG: "guide", F1: "guide",
};

/** Set once a game pad has been used, so on-screen prompts name pad buttons instead of keys. */
export const padState = { used: false };
const NAMES: Record<string, [string, string]> = {
  confirm: ["Enter", "A"], space: ["Space", "A"], cancel: ["Esc", "B"], timing: ["T", "LT"], auto: ["B", "View"], company: ["R", "Y"],
  notes: ["J", "LB"], ledger: ["L", "RB"], menu: ["Tab", "Menu"], sing: ["Q", "X"], hold: ["H", "Y"], run: ["Shift", "RT"], guide: ["G", "Menu > Guide"],
};
/** The key or pad button to name in a prompt for an action. */
export const keyFor = (a: keyof typeof NAMES | string): string => (NAMES[a] ?? [a, a])[padState.used ? 1 : 0];

export class Input {
  private held = new Set<Action>();
  private pressedThisFrame = new Set<Action>();
  private queued = new Set<Action>();
  runToggle = false;

  constructor(private keys: Record<string, Action> = DEFAULT_KEYS) {}

  /** Wire to the window. Returns a function that removes the listeners. */
  attach(target: Window): () => void {
    const down = (e: KeyboardEvent) => {
      const a = this.keys[e.code];
      if (!a) return;
      e.preventDefault();
      if (!e.repeat) this.press(a);
    };
    const up = (e: KeyboardEvent) => { const a = this.keys[e.code]; if (a) this.release(a); };
    const blur = () => this.held.clear();
    target.addEventListener("keydown", down);
    target.addEventListener("keyup", up);
    target.addEventListener("blur", blur);
    return () => { target.removeEventListener("keydown", down); target.removeEventListener("keyup", up); target.removeEventListener("blur", blur); };
  }

  press(a: Action): void { if (!this.held.has(a)) this.queued.add(a); this.held.add(a); }
  release(a: Action): void { this.held.delete(a); }
  /** A held button repeating (a pad's direction held down in a list): counts as a fresh press, stays held. */
  repeat(a: Action): void { this.queued.add(a); this.held.add(a); }

  /** Call once at the start of each fixed update. */
  beginFrame(): void { this.pressedThisFrame = this.queued; this.queued = new Set(); }

  isHeld(a: Action): boolean { return this.held.has(a) || (a === "run" && this.runToggle); }
  wasPressed(a: Action): boolean { return this.pressedThisFrame.has(a); }

  /** Movement direction from held keys, each axis -1..1. */
  axis(): { x: number; y: number } {
    return {
      x: (this.held.has("right") ? 1 : 0) - (this.held.has("left") ? 1 : 0),
      y: (this.held.has("down") ? 1 : 0) - (this.held.has("up") ? 1 : 0),
    };
  }
}
