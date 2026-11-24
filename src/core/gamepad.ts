// Game controllers (an Xbox pad over Bluetooth, or any pad the browser maps to the standard layout).
// Buttons feed the same actions as the keyboard, so every scene and panel already understands them:
//   Left stick / D-pad  move, menus          A  talk, choose, timed hits     B  back
//   X  sing                                  Y  company                      LB notes      RB  ledger
//   LT auto-timing                           RT hold to run                  Left stick click  run on/off
//   View  auto battle                        Menu  the menu
// The right stick moves an on-screen pointer for anything you would otherwise click or tap (army orders,
// on-screen buttons); while the pointer shows, A clicks where it points. It hides again after a few seconds.
import { padState, type Action, type Input } from "./input";

const BUTTONS: Partial<Record<number, Action>> = { 0: "confirm", 1: "cancel", 2: "sing", 3: "company", 4: "notes", 5: "ledger", 6: "timing", 7: "run", 8: "auto", 9: "menu", 12: "up", 13: "down", 14: "left", 15: "right" };
const DIRS: Action[] = ["up", "down", "left", "right"];
const DEAD = 0.25;
const REPEAT_AFTER = 0.38, REPEAT_EVERY = 0.11;
const POINTER_SHOWS = 3.5;

export class Gamepads {
  private down = new Map<string, boolean>(); // "b<n>" buttons, "s<dir>" stick directions
  private heldFor = new Map<Action, number>();
  private pointer?: HTMLDivElement;
  private px = 0; private py = 0;
  private pointerSeen = -1e9;
  private clock = 0;
  private hint?: HTMLDivElement;
  /** True once any pad has pressed something: lets the game show pad prompts. */
  used = false;

  constructor(private input: Input, private target: () => HTMLCanvasElement | undefined) {
    if (typeof window === "undefined") return;
    window.addEventListener("gamepadconnected", (e) => this.say(`Controller connected: ${(e as GamepadEvent).gamepad.id.split("(")[0].trim() || "game pad"}. Right stick moves a pointer; A clicks with it.`));
    window.addEventListener("gamepaddisconnected", () => { this.say("Controller disconnected."); this.releaseAll(); });
  }

  /** Read every connected pad. Call once per rendered frame with the seconds since the last call. */
  poll(dt: number): void {
    this.clock += dt;
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? [...navigator.getGamepads()].filter((p): p is Gamepad => !!p && p.connected) : [];
    if (!pads.length) { if (this.down.size) this.releaseAll(); return; }
    const want = new Map<string, boolean>();
    let rx = 0, ry = 0, rsClick = false;
    for (const p of pads) {
      p.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.5) want.set(`b${i}`, true); });
      const [lx = 0, ly = 0, ax = 0, ay = 0] = p.axes;
      if (ly < -0.5) want.set("sup", true); if (ly > 0.5) want.set("sdown", true);
      if (lx < -0.5) want.set("sleft", true); if (lx > 0.5) want.set("sright", true);
      if (Math.hypot(ax, ay) > DEAD) { rx += ax; ry += ay; }
      if (p.buttons[11]?.pressed) rsClick = true;
    }
    // right stick: the pointer
    if (rx || ry) {
      const c = this.target(); const w = c?.clientWidth ?? innerWidth, h = c?.clientHeight ?? innerHeight;
      if (this.clock - this.pointerSeen > POINTER_SHOWS) { this.px = w / 2; this.py = h / 2; }
      const m = Math.hypot(rx, ry), sp = 1100 * Math.pow(Math.min(1, (m - DEAD) / (1 - DEAD)), 2) * dt / m;
      this.px = Math.max(0, Math.min(w - 1, this.px + rx * sp)); this.py = Math.max(0, Math.min(h - 1, this.py + ry * sp));
      this.pointerSeen = this.clock; this.drawPointer(); this.send("pointermove");
    }
    const pointing = this.clock - this.pointerSeen < POINTER_SHOWS;
    if (this.pointer) this.pointer.style.opacity = pointing ? "1" : "0";
    // A (or a right stick click) clicks while the pointer shows
    const click = (want.get("b0") && pointing) || rsClick;
    if (click) padState.used = true;
    if (click && !this.down.get("click")) { this.send("pointerdown"); this.pointerSeen = this.clock; }
    if (!click && this.down.get("click")) this.send("pointerup");
    if (click) want.set("click", true);
    if (pointing || this.down.get("click")) { want.delete("b0"); if (this.down.get("b0")) { this.input.release("confirm"); this.down.delete("b0"); } }
    // left stick click toggles running
    if (want.get("b10") && !this.down.get("b10")) this.input.runToggle = !this.input.runToggle;
    // buttons and stick to actions
    const actions = new Set<Action>();
    for (const k of want.keys()) { const a = k[0] === "b" ? BUTTONS[Number(k.slice(1))] : k[0] === "s" ? (k.slice(1) as Action) : undefined; if (a) actions.add(a); }
    const before = new Set<Action>();
    for (const k of this.down.keys()) { const a = k[0] === "b" ? BUTTONS[Number(k.slice(1))] : k[0] === "s" ? (k.slice(1) as Action) : undefined; if (a) before.add(a); }
    for (const a of actions) {
      if (!before.has(a)) { this.input.press(a); this.heldFor.set(a, 0); this.used = true; padState.used = true; continue; }
      if (!DIRS.includes(a)) continue;
      // held direction repeats, so menus and battle lists can be scrolled
      const t = (this.heldFor.get(a) ?? 0) + dt; this.heldFor.set(a, t);
      if (t > REPEAT_AFTER && Math.floor((t - REPEAT_AFTER) / REPEAT_EVERY) !== Math.floor((t - dt - REPEAT_AFTER) / REPEAT_EVERY)) this.input.repeat(a);
    }
    for (const a of before) if (!actions.has(a)) { this.input.release(a); this.heldFor.delete(a); }
    this.down = want;
  }

  private releaseAll(): void {
    for (const k of this.down.keys()) { const a = k[0] === "b" ? BUTTONS[Number(k.slice(1))] : k[0] === "s" ? (k.slice(1) as Action) : undefined; if (a) this.input.release(a); }
    if (this.down.get("click")) this.send("pointerup");
    this.down.clear(); this.heldFor.clear();
  }

  private send(type: "pointermove" | "pointerdown" | "pointerup"): void {
    const c = this.target(); if (!c) return;
    const r = c.getBoundingClientRect(), x = r.left + this.px, y = r.top + this.py;
    const ev = new PointerEvent(type, { clientX: x, clientY: y, screenX: x, screenY: y, pointerId: 9, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, bubbles: true, cancelable: true, composed: true });
    c.dispatchEvent(ev); // bubbles to the document and window, where Pixi listens for moves and releases
  }

  private drawPointer(): void {
    if (!this.pointer) {
      const d = document.createElement("div");
      d.setAttribute("aria-hidden", "true");
      Object.assign(d.style, { position: "fixed", left: "0", top: "0", width: "26px", height: "26px", marginLeft: "-13px", marginTop: "-13px", borderRadius: "50%", border: "3px solid #ffe39a", boxShadow: "0 0 0 2px #2a1a08, 0 0 12px #ffe39a", background: "rgba(255,227,154,0.25)", pointerEvents: "none", zIndex: "50", transition: "opacity .3s" });
      const dot = document.createElement("div"); Object.assign(dot.style, { position: "absolute", left: "9px", top: "9px", width: "4px", height: "4px", borderRadius: "2px", background: "#ffe39a" });
      d.appendChild(dot); document.body.appendChild(d); this.pointer = d;
    }
    const r = this.target()?.getBoundingClientRect();
    this.pointer.style.transform = `translate(${(r?.left ?? 0) + this.px}px, ${(r?.top ?? 0) + this.py}px)`;
  }

  /** A short note at the top of the screen. */
  private say(t: string): void {
    if (typeof document === "undefined") return;
    if (!this.hint) {
      const d = document.createElement("div");
      Object.assign(d.style, { position: "fixed", left: "50%", top: "14px", transform: "translateX(-50%)", maxWidth: "min(92vw, 620px)", padding: "10px 16px", borderRadius: "10px", background: "rgba(20,16,12,0.94)", border: "2px solid #e0c070", color: "#fff4dc", font: "15px Georgia, serif", textAlign: "center", zIndex: "60", pointerEvents: "none", transition: "opacity .4s" });
      document.body.appendChild(d); this.hint = d;
    }
    this.hint.textContent = t; this.hint.style.opacity = "1";
    const h = this.hint; clearTimeout((h as unknown as { _t?: number })._t);
    (h as unknown as { _t?: number })._t = window.setTimeout(() => { h.style.opacity = "0"; }, 5000);
  }
}
