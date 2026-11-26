// Panels taller than the screen: the body of a menu page scrolls with a drag (a finger or the mouse) or the wheel.
// A panel draws its page as usual, then hands the pieces it drew to wrap(): they move into one layer, clipped to the
// body, and a drag up or down slides that layer. A drag that moved is not a tap, so lifting the finger after
// scrolling never presses the row underneath.
import { Container, Graphics } from "pixi.js";

export interface Rect { x: number; y: number; w: number; h: number; }

export class DragScroll {
  scroll = 0;
  max = 0;
  /** True from the moment a press turns into a drag until just after it ends. Taps check this. */
  dragged = false;
  private area: Rect | null = null;
  private layer: Container | null = null;
  private top = 0;
  private press: { id: number; y: number; s: number } | null = null;

  private handlers: [string, (e: never) => void, AddEventListenerOptions | boolean][] = [];

  constructor() {
    if (typeof window === "undefined") return;
    const inside = (e: PointerEvent | WheelEvent) => { const a = this.area; return !!a && this.max > 0 && e.clientX >= a.x && e.clientX <= a.x + a.w && e.clientY >= a.y && e.clientY <= a.y + a.h; };
    const down = (e: PointerEvent) => { if (inside(e)) this.press = { id: e.pointerId, y: e.clientY, s: this.scroll }; };
    const move = (e: PointerEvent) => {
      const p = this.press; if (!p || p.id !== e.pointerId) return;
      const dy = e.clientY - p.y;
      if (!this.dragged && Math.abs(dy) < 8) return;
      this.dragged = true; this.to(p.s - dy);
    };
    const up = (e: PointerEvent) => { if (this.press?.id !== e.pointerId) return; this.press = null; if (this.dragged) setTimeout(() => { this.dragged = false; }, 0); };
    const wheel = (e: WheelEvent) => { if (inside(e)) this.to(this.scroll + (e.deltaY > 0 ? 60 : -60)); };
    this.handlers = [["pointerdown", down, true], ["pointermove", move, true], ["pointerup", up, true], ["pointercancel", up, true], ["wheel", wheel, { passive: true }]];
    for (const [ev, fn, o] of this.handlers) addEventListener(ev, fn as EventListener, o);
  }
  /** Stops listening for good (the screen that owns it is gone). */
  destroy(): void { for (const [ev, fn, o] of this.handlers) removeEventListener(ev, fn as EventListener, o); this.handlers = []; this.off(); }

  /** Back to the top (a new page). */
  reset(): void { this.scroll = 0; }
  /** Stops listening (the panel closed). */
  off(): void { this.area = null; this.layer = null; this.max = 0; this.press = null; }

  /** Moves view's children from index `from` on into a layer clipped to `area`, and lets it scroll. */
  wrap(view: Container, from: number, area: Rect): Container {
    const kids = view.children.slice(from), layer = new Container();
    for (const k of kids) layer.addChild(k);
    view.addChildAt(layer, from);
    const mask = new Graphics().rect(area.x, area.y, area.w, area.h).fill(0xffffff);
    view.addChild(mask); layer.mask = mask;
    const b = layer.getLocalBounds();
    this.top = 0; this.max = Math.max(0, Math.ceil(b.y + b.height - (area.y + area.h) + 8));
    this.area = area; this.layer = layer;
    this.to(this.scroll);
    // a scroll bar when there is more below
    if (this.max > 0) {
      const track = area.h - 8, knob = Math.max(24, (track * area.h) / (area.h + this.max)), at = area.y + 4 + ((track - knob) * this.scroll) / this.max;
      const bar = new Graphics().roundRect(area.x + area.w - 4, area.y + 4, 3, track, 1.5).fill({ color: 0xe0c070, alpha: 0.15 }).roundRect(area.x + area.w - 4, at, 3, knob, 1.5).fill({ color: 0xe0c070, alpha: 0.6 });
      bar.label = "scrollbar"; view.addChild(bar);
    }
    return layer;
  }

  /** Scrolls so that a span (in content coordinates) is in view; for keys and pads moving a highlight. */
  show(y: number, h: number): void {
    const a = this.area; if (!a) return;
    if (y - this.scroll < a.y) this.to(y - a.y - 4);
    else if (y + h - this.scroll > a.y + a.h) this.to(y + h - a.y - a.h + 4);
  }

  /** Scrolls to a position (clamped). */
  to(s: number): void {
    this.scroll = Math.max(0, Math.min(this.max, s));
    if (this.layer) this.layer.y = this.top - this.scroll;
    const bar = this.layer?.parent?.getChildByLabel("scrollbar") as Graphics | null, a = this.area;
    if (bar && a && this.max > 0) {
      const track = a.h - 8, knob = Math.max(24, (track * a.h) / (a.h + this.max)), at = a.y + 4 + ((track - knob) * this.scroll) / this.max;
      bar.clear().roundRect(a.x + a.w - 4, a.y + 4, 3, track, 1.5).fill({ color: 0xe0c070, alpha: 0.15 }).roundRect(a.x + a.w - 4, at, 3, knob, 1.5).fill({ color: 0xe0c070, alpha: 0.6 });
    }
  }
}
