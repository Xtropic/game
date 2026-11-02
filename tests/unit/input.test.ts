import { describe, expect, it } from "vitest";
import { Input } from "../../src/core/input";

describe("input", () => {
  it("reports a press for exactly one frame and keeps it held", () => {
    const i = new Input(); i.press("confirm"); i.beginFrame();
    expect(i.wasPressed("confirm")).toBe(true); expect(i.isHeld("confirm")).toBe(true);
    i.beginFrame(); expect(i.wasPressed("confirm")).toBe(false); expect(i.isHeld("confirm")).toBe(true);
  });
  it("still registers a tap pressed and released between frames", () => {
    const i = new Input(); i.press("confirm"); i.release("confirm"); i.beginFrame(); expect(i.wasPressed("confirm")).toBe(true);
  });
  it("turns held directions into an axis", () => { const i = new Input(); i.press("left"); i.press("down"); expect(i.axis()).toEqual({ x: -1, y: 1 }); });
});
