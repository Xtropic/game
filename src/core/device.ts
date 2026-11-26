// What the player is holding: a phone or tablet (touch) or a keyboard and mouse. Screens use this to name taps
// instead of keys, to make rows big enough for a thumb, and to keep text large enough to read at arm's length.
// The last thing pressed wins, so a tablet with a keyboard plugged in reads as a keyboard once a key is pressed.
import { padState, touchState } from "./input";

const coarse = (): boolean => {
  if (typeof window === "undefined") return false;
  try { return (navigator.maxTouchPoints ?? 0) > 0 && (matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window); } catch { return false; }
};

class Device {
  /** The last press was a finger on the screen. */
  touch = coarse() || this.forced;
  /** ?touch in the address: behave as a touch screen whatever is pressed (for testing on a desktop). */
  private get forced(): boolean { return typeof location !== "undefined" && location.search.includes("touch"); }
  private listeners: (() => void)[] = [];
  constructor() { touchState.taps = this.touch; }

  attach(target: Window): void {
    target.addEventListener("pointerdown", (e) => this.set(e.pointerType === "touch" || e.pointerType === "pen"), true);
    target.addEventListener("keydown", (e) => { if (!["Shift", "Control", "Alt", "Meta"].includes(e.key)) this.set(false); }, true);
  }
  private set(t: boolean): void { if (this.forced) t = true; if (t === this.touch) return; this.touch = t; if (t) padState.used = false; touchState.taps = t; for (const l of this.listeners) l(); }
  onChange(fn: () => void): void { this.listeners.push(fn); }

  /** Touch, and no pad in use: on-screen words should name taps, not keys. */
  get taps(): boolean { return this.touch && !padState.used; }
  /** The smallest a tappable row or button should be, in CSS pixels. */
  get row(): number { return this.touch ? 44 : 30; }
  /** A font size grown for touch screens, where the screen is small and held further away. */
  fs(size: number): number { return this.touch ? Math.max(13, Math.round(size * 1.08)) : size; }
  /** Smallest text (key hints, notes): never below 12px on a phone. */
  small(size: number): number { return this.touch ? Math.max(12, size) : size; }
}

export const device = new Device();

/** The words for a control: keys on a keyboard or pad, taps on a touch screen. */
export const say = (keys: string, taps: string): string => (device.taps ? taps : keys);
