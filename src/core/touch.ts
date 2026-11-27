// Phones and tablets. Walking: tilt the screen, like rolling a marble (lean the top away to walk up, the right edge
// down to walk right; lean further to run). Where tilt can't be read, or is switched off in Settings, a stick
// appears instead: drag anywhere on the left half of the screen. Buttons on the right: A (talk, choose, timed hits),
// B (back), Sing, Run, and a small "level" button that takes how the phone is held now as standing still.
// Everything else (menus, the ledger, battles) is tapped as before. Shown only on touch screens.
import type { Action, Input } from "./input";
import { settings } from "./settings";

const DEAD = 6, RUN = 18; // degrees of tilt from level: start walking, start running
const DIRS: Action[] = ["up", "down", "left", "right"];

type OrientationCtor = { requestPermission?: () => Promise<"granted" | "denied"> };

export class TouchControls {
  private root?: HTMLDivElement;
  private held = new Set<Action>(); // what this module is holding down on the Input
  private base: [number, number] | null = null;
  private tiltNow: [number, number] | null = null;
  private tiltSeen = 0;
  private tiltAsked = false;
  private tiltFailed = false;
  private stick?: { id: number; x: number; y: number; dx: number; dy: number };
  private stickEl?: HTMLDivElement; private knobEl?: HTMLDivElement;
  private tiltBtn?: HTMLButtonElement; private levelBtn?: HTMLButtonElement; private runBtn?: HTMLButtonElement;
  private dot?: HTMLDivElement;
  private pad?: HTMLDivElement; private top?: HTMLDivElement;
  private shown = true;
  private note?: HTMLDivElement;
  private noteTimer = 0;

  /** walking(): true while the player is free to walk around (no dialogue, menu or battle on top). */
  constructor(private input: Input, private walking: () => boolean) {}

  static wanted(): boolean {
    if (typeof window === "undefined") return false;
    return (navigator.maxTouchPoints ?? 0) > 0 || matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window;
  }

  attach(): void {
    if (this.root || typeof document === "undefined") return;
    const r = document.createElement("div");
    Object.assign(r.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "40", userSelect: "none", webkitUserSelect: "none", touchAction: "none", fontFamily: "Georgia, serif" });
    document.body.appendChild(r); this.root = r;
    // the stick (drag on the left half)
    const zone = document.createElement("div");
    Object.assign(zone.style, { position: "absolute", left: "0", top: "0", bottom: "0", width: "50%", pointerEvents: "none", touchAction: "none" });
    r.appendChild(zone);
    this.stickEl = this.disc(120, "rgba(20,16,12,0.35)", "2px solid rgba(224,192,112,0.6)");
    this.knobEl = this.disc(54, "rgba(240,192,96,0.85)", "2px solid #6a4410");
    this.stickEl.appendChild(this.knobEl); r.appendChild(this.stickEl); this.stickEl.style.display = "none";
    const onDown = (e: PointerEvent) => {
      if (!this.walking() || this.stick || this.tiltOn() || e.clientX > innerWidth / 2 || (e.target as HTMLElement)?.tagName === "BUTTON") return;
      this.stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
      Object.assign(this.stickEl!.style, { display: "block", left: `${e.clientX - 60}px`, top: `${e.clientY - 60}px` });
      this.placeKnob();
    };
    const onMove = (e: PointerEvent) => { if (this.stick?.id !== e.pointerId) return; this.stick.dx = e.clientX - this.stick.x; this.stick.dy = e.clientY - this.stick.y; this.placeKnob(); };
    const onUp = (e: PointerEvent) => { if (this.stick?.id !== e.pointerId) return; this.stick = undefined; this.stickEl!.style.display = "none"; };
    addEventListener("pointerdown", onDown, true); addEventListener("pointermove", onMove, true);
    addEventListener("pointerup", onUp, true); addEventListener("pointercancel", onUp, true);
    // buttons
    const pad = document.createElement("div");
    Object.assign(pad.style, { position: "absolute", right: "max(14px, env(safe-area-inset-right))", bottom: "max(118px, calc(env(safe-area-inset-bottom) + 110px))", width: "176px", height: "150px", pointerEvents: "none" });
    r.appendChild(pad); this.pad = pad;
    this.button(pad, "A", "confirm", { right: "0", bottom: "40px", size: 72, color: "#4e8a3a" });
    this.button(pad, "B", "cancel", { right: "84px", bottom: "0", size: 56, color: "#9a3a2a" });
    this.button(pad, "Sing", "sing", { right: "92px", bottom: "78px", size: 50, color: "#3a5a8a", small: true });
    this.runBtn = this.button(pad, "Run", null, { right: "6px", bottom: "122px", size: 46, color: "#5a4a2a", small: true }, () => { this.input.runToggle = !this.input.runToggle; this.paint(); });
    // tilt toggle and level, top left under the goal text
    const top = document.createElement("div");
    Object.assign(top.style, { position: "absolute", left: "max(10px, env(safe-area-inset-left))", bottom: "max(14px, env(safe-area-inset-bottom))", display: "flex", flexWrap: "wrap", gap: "8px", pointerEvents: "none", maxWidth: "60vw" });
    // a narrow screen: up off the bottom row, which holds the Guide and Menu buttons
    const place = () => { top.style.bottom = innerWidth < 600 ? "max(62px, calc(env(safe-area-inset-bottom) + 52px))" : "max(14px, env(safe-area-inset-bottom))"; };
    place(); addEventListener("resize", place);
    r.appendChild(top); this.top = top;
    this.tiltBtn = this.pill(top, "", () => {
      if (settings.get("tilt") && !this.tiltSeen && !this.tiltFailed) { this.startTilt(); return; } // "tap to start" (iOS asks here)
      settings.set("tilt", !settings.get("tilt")); if (settings.get("tilt")) this.startTilt(); this.paint();
    });
    // full screen, where the browser allows it (not inside some embedded pages): hides the address bar
    const d = document as Document & { webkitFullscreenEnabled?: boolean };
    if (d.fullscreenEnabled || d.webkitFullscreenEnabled) {
      const fs = this.pill(top, "Full screen", () => {
        const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
        if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
        else if (el.requestFullscreen) void el.requestFullscreen({ navigationUI: "hide" }).catch(() => this.say("This page can't go full screen here."));
        else el.webkitRequestFullscreen?.();
      });
      document.addEventListener("fullscreenchange", () => { fs.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen"; });
    }
    this.levelBtn = this.pill(top, "Level", () => { this.base = this.tiltNow ? [...this.tiltNow] : null; this.say("Level set: hold the phone like this to stand still."); });
    this.dot = document.createElement("div");
    Object.assign(this.dot.style, { position: "absolute", width: "14px", height: "14px", marginLeft: "-7px", marginTop: "-7px", borderRadius: "7px", background: "#f0c060", border: "2px solid #2a1a08", display: "none" });
    r.appendChild(this.dot);
    addEventListener("deviceorientation", (e) => this.onTilt(e));
    addEventListener("orientationchange", () => { this.base = null; });
    settings.onChange(() => this.paint());
    // iOS asks for motion access only from a tap; everywhere else this just starts listening
    const ctor = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
    if (settings.get("tilt")) {
      if (typeof ctor?.requestPermission === "function") { const first = () => { this.startTilt(); removeEventListener("pointerup", first, true); }; addEventListener("pointerup", first, true); }
      else this.startTilt();
    }
    this.paint();
  }

  private tiltOn(): boolean { return settings.get("tilt") && !this.tiltFailed && this.clockNow() - this.tiltSeen < 1000; }
  private clockNow(): number { return performance.now(); }

  private startTilt(): void {
    if (this.tiltAsked) return;
    this.tiltAsked = true; this.tiltFailed = false;
    const ctor = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
    const listen = () => setTimeout(() => { if (!this.tiltSeen) { this.tiltFailed = true; this.tiltAsked = false; this.say("This screen isn't sending tilt (some browsers and embedded views block it). Drag on the left half to walk instead."); this.paint(); } }, 2000);
    if (!ctor) { this.tiltFailed = true; this.tiltAsked = false; this.paint(); return; }
    if (typeof ctor.requestPermission === "function") {
      ctor.requestPermission().then((s) => { if (s === "granted") listen(); else { this.tiltFailed = true; this.tiltAsked = false; this.say("Motion access was refused. Drag on the left half to walk instead."); this.paint(); } })
        .catch(() => { this.tiltFailed = true; this.tiltAsked = false; this.paint(); });
    } else listen();
  }

  private onTilt(e: DeviceOrientationEvent): void {
    if (e.beta == null || e.gamma == null) return;
    const angle = (screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) % 360;
    const b = e.beta, g = e.gamma;
    // screen-relative: x leans right, y leans toward the player
    const v: [number, number] = angle === 90 ? [b, -g] : angle === 270 || angle === -90 ? [-b, g] : angle === 180 ? [-g, -b] : [g, b];
    const first = !this.tiltSeen;
    this.tiltNow = v; this.tiltSeen = this.clockNow(); this.tiltFailed = false;
    if (!this.base) this.base = [...v];
    if (first) { this.say("Tilt to walk: lean the top away to go up, an edge down to go that way, further to run. Tap Level to reset how you hold it."); this.paint(); }
  }

  /** Called every frame: turns tilt or the stick into held directions. */
  poll(): void {
    if (!this.root) return;
    let x = 0, y = 0, run = false;
    const walk = this.walking();
    // the pad shows only while walking: dialogue, menus and battles are tapped directly
    if (walk !== this.shown) { this.shown = walk; this.pad!.style.display = walk ? "block" : "none"; this.top!.style.display = walk ? "flex" : "none"; if (!walk && this.note) this.note.style.opacity = "0"; }
    if (walk && this.tiltOn() && this.tiltNow && this.base) {
      const dx = this.tiltNow[0] - this.base[0], dy = this.tiltNow[1] - this.base[1];
      x = Math.abs(dx) > DEAD ? Math.sign(dx) : 0; y = Math.abs(dy) > DEAD ? Math.sign(dy) : 0;
      // only the stronger lean when one is much weaker, so a small wobble doesn't make the walk zig-zag
      if (x && y && Math.min(Math.abs(dx), Math.abs(dy)) < Math.max(Math.abs(dx), Math.abs(dy)) * 0.4) { if (Math.abs(dx) > Math.abs(dy)) y = 0; else x = 0; }
      run = Math.max(Math.abs(dx), Math.abs(dy)) > RUN;
      Object.assign(this.dot!.style, { display: "block", left: `${innerWidth / 2 + Math.max(-1, Math.min(1, dx / 30)) * 40}px`, top: `${innerHeight - 40 + Math.max(-1, Math.min(1, dy / 30)) * 24}px` });
    } else if (this.dot) this.dot.style.display = "none";
    if (walk && this.stick) {
      const { dx, dy } = this.stick, m = Math.hypot(dx, dy);
      if (m > 14) { x = Math.abs(dx) > m * 0.38 ? Math.sign(dx) : 0; y = Math.abs(dy) > m * 0.38 ? Math.sign(dy) : 0; run = m > 52; }
    }
    if (!walk && this.stick) { this.stick = undefined; this.stickEl!.style.display = "none"; }
    const want = new Set<Action>();
    if (x > 0) want.add("right"); if (x < 0) want.add("left"); if (y > 0) want.add("down"); if (y < 0) want.add("up");
    if (run) want.add("run");
    for (const a of [...DIRS, "run" as Action]) {
      if (want.has(a) && !this.held.has(a)) { this.input.press(a); this.held.add(a); }
      if (!want.has(a) && this.held.has(a)) { this.input.release(a); this.held.delete(a); }
    }
    if (this.noteTimer && this.clockNow() > this.noteTimer) { this.note!.style.opacity = "0"; this.noteTimer = 0; }
  }

  private placeKnob(): void {
    const s = this.stick!, m = Math.hypot(s.dx, s.dy), k = m > 50 ? 50 / m : 1;
    Object.assign(this.knobEl!.style, { left: `${33 + s.dx * k}px`, top: `${33 + s.dy * k}px` });
  }

  private paint(): void {
    if (!this.tiltBtn) return;
    const on = settings.get("tilt");
    this.tiltBtn.textContent = !on ? "Tilt: off" : this.tiltFailed ? "Tilt: not available" : this.tiltSeen ? "Tilt: on" : "Tilt: tap to start";
    this.levelBtn!.style.display = on && this.tiltSeen && !this.tiltFailed ? "block" : "none";
    this.runBtn!.style.outline = this.input.runToggle ? "3px solid #f0c060" : "none";
  }

  private disc(size: number, bg: string, border: string): HTMLDivElement {
    const d = document.createElement("div");
    Object.assign(d.style, { position: "absolute", width: `${size}px`, height: `${size}px`, borderRadius: `${size / 2}px`, background: bg, border, boxSizing: "border-box" });
    return d;
  }

  private button(parent: HTMLElement, label: string, action: Action | null, o: { right: string; bottom: string; size: number; color: string; small?: boolean }, tap?: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.textContent = label; b.setAttribute("aria-label", label);
    Object.assign(b.style, {
      position: "absolute", right: o.right, bottom: o.bottom, width: `${o.size}px`, height: `${o.size}px`, borderRadius: `${o.size / 2}px`,
      background: o.color, color: "#fff4dc", border: "2px solid #e0c070", boxShadow: "0 2px 6px rgba(0,0,0,0.5)", font: `bold ${o.small ? 13 : 22}px Georgia, serif`,
      opacity: "0.82", pointerEvents: "auto", touchAction: "none", padding: "0", WebkitTapHighlightColor: "transparent",
    });
    const down = (e: Event) => { e.preventDefault(); e.stopPropagation(); b.style.opacity = "1"; if (action) this.input.press(action); else tap?.(); };
    const up = (e: Event) => { e.preventDefault(); e.stopPropagation(); b.style.opacity = "0.82"; if (action) this.input.release(action); };
    b.addEventListener("pointerdown", down); b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("pointerleave", up);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
    parent.appendChild(b); return b;
  }

  private pill(parent: HTMLElement, label: string, tap: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.textContent = label;
    Object.assign(b.style, { pointerEvents: "auto", touchAction: "none", padding: "9px 14px", minHeight: "36px", borderRadius: "18px", background: "rgba(20,16,12,0.85)", color: "#f0c060", border: "1px solid #e0c070", font: "bold 13px Georgia, serif" });
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); });
    b.addEventListener("pointerup", (e) => { e.preventDefault(); e.stopPropagation(); tap(); this.paint(); });
    parent.appendChild(b); return b;
  }

  private say(t: string): void {
    if (!this.note) {
      const d = document.createElement("div");
      Object.assign(d.style, { position: "absolute", left: "50%", top: "max(12px, env(safe-area-inset-top))", transform: "translateX(-50%)", width: "min(92vw, 560px)", padding: "10px 14px", borderRadius: "10px", background: "rgba(20,16,12,0.94)", border: "2px solid #e0c070", color: "#fff4dc", font: "14px Georgia, serif", textAlign: "center", transition: "opacity .4s", pointerEvents: "none" });
      this.root!.appendChild(d); this.note = d;
    }
    this.note.textContent = t; this.note.style.opacity = "1"; this.noteTimer = this.clockNow() + 6000;
  }
}
