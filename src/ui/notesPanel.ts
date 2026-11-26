// Notes: every word the story has explained so far, so a player who skipped past a note can look it up (J).
import { keyFor } from "../core/input";
import { device } from "../core/device";
import { Container, Graphics, Text } from "pixi.js";
import { TERMS } from "../story/terms";

export class NotesPanel {
  readonly view = new Container();
  open = false;
  /** Called when the panel is tapped (to close it). */
  onTap?: () => void;
  constructor() { this.view.visible = false; }

  toggle(learned: (id: string) => boolean, w: number, h: number): void {
    this.open = !this.open; this.view.visible = this.open;
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    if (!this.open) return;
    const known = TERMS.filter((t) => learned(t.id));
    const W = Math.min(760, w - 32), x0 = (w - W) / 2, y0 = 20, H = h - 40;
    const dim = new Graphics().rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.55 }); dim.eventMode = "static"; dim.on("pointertap", () => this.onTap?.());
    this.view.addChild(dim);
    this.view.addChild(new Graphics().roundRect(x0, y0, W, H, 10).fill({ color: 0x14100c, alpha: 0.96 }).roundRect(x0, y0, W, H, 10).stroke({ color: 0xe0c070, width: 2 }));
    const title = new Text({ text: "Notes", style: { fontFamily: "Georgia, serif", fontSize: 24, fill: "#fff4dc", fontWeight: "bold" } }); title.x = x0 + 20; title.y = y0 + 14;
    const hint = new Text({ text: device.taps ? (known.length ? "Tap to close" : "Nothing yet. Tap to close") : known.length ? `${keyFor("notes")} or ${keyFor("cancel")} to close` : `Nothing yet. ${keyFor("notes")} or ${keyFor("cancel")} to close`, style: { fontFamily: "Georgia, serif", fontSize: 13, fill: "#a89a80" } }); hint.x = x0 + W - hint.width - 20; hint.y = y0 + 22;
    this.view.addChild(title, hint);
    let y = y0 + 60;
    for (const t of known) {
      const line = new Text({ text: `${t.name}: ${t.note}`, style: { fontFamily: "Georgia, serif", fontSize: 15, fill: "#e8dcc0", wordWrap: true, wordWrapWidth: W - 40, lineHeight: 20 } });
      if (y + line.height > y0 + H - 10) { line.destroy(); break; }
      line.x = x0 + 20; line.y = y; this.view.addChild(line); y += line.height + 10;
    }
  }
}
