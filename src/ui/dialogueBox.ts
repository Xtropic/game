// The dialogue box: HD over the pixel world, with the speaker's talking portrait, their name, and the line
// typed out. Plays the line's recording; the portrait's mouth follows the recording's loudness.
import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { drawPortrait, hasPortrait } from "../art/portraits";
import { EVEN, type Build } from "../art/build";
import type { Voices } from "../audio/voice";
import { sfx } from "../audio/music";
import { settings } from "../core/settings";
import { device } from "../core/device";
import type { Line } from "../world/lines";

const CPS = 48; // characters per second when typing out a line with no recording

export class DialogueBox {
  readonly view = new Container();
  private box = new Graphics();
  private frame = new Graphics();
  private name = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 16, fill: "#e0c070", fontWeight: "bold" } });
  private body = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 18, fill: "#efe6d2", wordWrap: true, wordWrapWidth: 600, lineHeight: 26 } });
  private cv = document.createElement("canvas");
  private g = this.cv.getContext("2d")!;
  private tex: Texture | null = null;
  private face = new Sprite();
  private line: Line | null = null;
  private shown = 0; // characters revealed
  private time = 0;
  private voiced = false;
  private size = 132; // portrait size in CSS pixels
  /** A choice the player is making: the options, and which one is highlighted. */
  private options: { label: string; hint?: string }[] | null = null;
  cursor = 0;
  private optTexts: Text[] = [];
  private optBox = new Graphics();
  /** A short note under a line, explaining a word the player meets for the first time. */
  private noteBox = new Graphics();
  private noteText = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 15, fill: "#e8dcc0", wordWrap: true, wordWrapWidth: 600, lineHeight: 20 } });
  private note: { name: string; note: string } | null = null;
  /** A screen-sized catch for taps while a line shows, and the little arrow saying there's more. */
  private catcher = new Graphics();
  private more = new Text({ text: "\u25BC", style: { fontFamily: "Georgia, serif", fontSize: 14, fill: "#e0c070" } });

  constructor(private voices: Voices, private buildFor: (id: string) => Build = () => EVEN) {
    this.view.addChild(this.catcher, this.noteBox, this.noteText, this.box, this.face, this.frame, this.name, this.body, this.optBox, this.more);
    this.view.visible = false;
  }

  get open(): boolean { return !!this.line; }
  get text(): string | null { return this.line?.text ?? null; }
  get speaking(): boolean { return this.voiced && this.voices.playing; }

  get choosing(): boolean { return !!this.options; }

  /** Shows a prompt with options to pick from. The prompt is narrated; the options sit under it. */
  choose(prompt: Line, options: { label: string; hint?: string }[]): void {
    this.options = options; this.cursor = 0;
    for (const t of this.optTexts) t.destroy();
    this.optTexts = options.map((o) => { const t = new Text({ text: "", style: { fontFamily: "Georgia, serif", fontSize: 17, fill: "#efe6d2", wordWrap: true, wordWrapWidth: 600, lineHeight: 22 } }); t.text = o.label + (o.hint ? `\n${o.hint}` : ""); this.view.addChild(t); return t; });
    this.show(prompt);
    this.shown = prompt.text.length;
  }

  /** Moves the highlight. */
  move(d: number): void { if (this.options) this.cursor = (this.cursor + d + this.options.length) % this.options.length; }

  /** Picks the highlighted option, or the one under a tap at (x, y). Returns its index, or -1. */
  pick(x?: number, y?: number): number {
    if (!this.options) return -1;
    let i = this.cursor;
    if (x !== undefined && y !== undefined) { { const pad = device.touch ? 10 : 4; i = this.optTexts.findIndex((t) => y >= t.y - pad && y <= t.y + Math.max(t.height, 26) + pad && x >= t.x - 18); } if (i < 0) return -1; }
    this.options = null; for (const t of this.optTexts) t.destroy(); this.optTexts = []; this.optBox.clear();
    this.close(); sfx.choose();
    return i;
  }

  show(line: Line, note?: { name: string; note: string }): void {
    this.line = line; this.shown = 0; this.time = 0; this.note = note ?? null;
    this.voiced = this.voices.play(line.who, line.text);
    this.name.text = line.name;
    this.view.visible = true;
    this.layout();
  }

  /** Confirm pressed: finish typing first, then close. Returns true if the box closed. */
  advance(): boolean {
    if (!this.line) return true;
    if (this.shown < this.line.text.length) { this.shown = this.line.text.length; return false; }
    this.close(); sfx.next(); return true;
  }

  close(): void { this.line = null; this.note = null; this.view.visible = false; this.voices.stop(); }
  /** The note showing, if any (for tests). */
  get noteShown(): string | null { return this.note ? this.note.name : null; }

  private screen = { w: 800, h: 600 };
  resize(w: number, h: number): void { this.screen = { w, h }; this.layout(); }

  private layout(): void {
    const { w, h } = this.screen, port = !!this.line && hasPortrait(this.line.who);
    const narrow = w < 560, touch = device.touch;
    // phones held upright: a small face beside the name, and the words below it across the whole box
    const stack = narrow && h > w;
    this.size = stack ? 60 : narrow ? 92 : 132;
    const bw = Math.min(w - 24, 820), x = (w - bw) / 2;
    const tx = port && !stack ? x + this.size + 30 : x + 20;
    const textW = x + bw - tx - 20;
    const fs = narrow ? (touch ? 17 : 16) : 18, lh = Math.round(fs * 1.38);
    this.body.style.fontSize = fs; this.body.style.lineHeight = lh; this.body.style.wordWrapWidth = textW;
    // measure the whole line, so the box is tall enough for all of it before it types out
    const full = this.line?.text ?? ""; this.body.text = full; const textH = Math.max(lh, this.body.height); this.body.text = full.slice(0, Math.floor(this.shown));
    const nameH = this.line?.name ? 26 : 4;
    const head = stack && port ? this.size + 8 : 0;
    const optFs = narrow ? (touch ? 16 : 15) : 17, optGap = touch ? 12 : 8;
    let optH = 0;
    this.optTexts.forEach((t) => { t.style.fontSize = optFs; t.style.lineHeight = Math.round(optFs * 1.3); t.style.wordWrapWidth = x + bw - tx - 40; optH += Math.max(t.height, touch ? 30 : 0) + optGap; });
    if (optH) optH += 10;
    const textBlock = (stack ? head + 12 + textH : 12 + nameH + textH) + 16;
    const bh = Math.min(h - 24, Math.max(stack ? 0 : this.size + 24, 110, textBlock) + optH), y = h - bh - 12;
    this.box.clear().roundRect(x, y, bw, bh, 10).fill({ color: 0x14100c, alpha: 0.94 }).stroke({ color: 0x6b5236, width: 2 });
    // taps anywhere advance the line (a phone has no Enter key); choices still need a tap on an option
    this.catcher.clear().rect(0, 0, w, h).fill({ color: 0, alpha: 0.001 }); this.catcher.visible = !this.options;
    this.face.visible = this.frame.visible = port;
    if (port) {
      const res = Math.min(2, window.devicePixelRatio || 1), px = Math.round(this.size * res);
      if (this.cv.width !== px) { this.cv.width = this.cv.height = px; this.tex?.destroy(true); this.tex = Texture.from(this.cv); this.face.texture = this.tex; }
      this.face.x = x + 12; this.face.y = y + 12; this.face.width = this.face.height = this.size;
      this.frame.clear().roundRect(x + 12, y + 12, this.size, this.size, 6).stroke({ color: 0x8a6a44, width: 2 });
    }
    if (stack && port) { this.name.x = x + this.size + 26; this.name.y = y + 12 + this.size / 2 - 10; this.body.x = x + 20; this.body.y = y + 12 + head; }
    else { this.name.x = tx; this.name.y = y + 14; this.body.x = tx; this.body.y = y + (this.line?.name ? 40 : 18); }
    this.name.style.fontSize = narrow && touch ? 17 : 16;
    this.more.x = x + bw - 22; this.more.y = y + bh - 22;
    this.noteText.visible = this.noteBox.visible = !!this.note;
    this.noteBox.clear();
    if (this.note) {
      this.noteText.style.wordWrapWidth = bw - 40; this.noteText.style.fontSize = narrow ? 14 : 15;
      this.noteText.text = `${this.note.name}: ${this.note.note}${device.taps ? "" : "  (J: all notes)"}`;
      const nh = this.noteText.height + 16, ny = y - nh - 6;
      this.noteBox.roundRect(x + 10, ny, bw - 20, nh, 8).fill({ color: 0x2a2416, alpha: 0.95 }).stroke({ color: 0xb89a5a, width: 1.5 });
      this.noteText.x = x + 22; this.noteText.y = ny + 8;
    }
    let oy = y + bh - optH;
    this.optTexts.forEach((t) => { t.x = tx + 18; t.y = oy + (touch ? Math.max(0, (30 - t.height) / 2) : 0); oy += Math.max(t.height, touch ? 30 : 0) + optGap; });
  }

  update(dt: number): void {
    if (!this.line) return;
    this.time += dt;
    this.shown = Math.min(this.line.text.length, this.shown + dt * CPS * settings.get("textSpeed"));
  }

  render(): void {
    if (!this.line) return;
    if (this.options) {
      this.optBox.clear();
      this.optTexts.forEach((t, i) => {
        const on = i === this.cursor;
        t.style.fill = on ? "#ffe39a" : "#cfc4ac";
        if (on) this.optBox.roundRect(t.x - 14, t.y - 4, t.style.wordWrapWidth + 24, t.height + 8, 6).fill({ color: 0x3a2c1c, alpha: 0.9 });
      });
      this.view.setChildIndex(this.optBox, this.view.children.length - 1 - this.optTexts.length);
    }
    this.body.text = this.line.text.slice(0, Math.floor(this.shown));
    this.more.visible = !this.options && this.shown >= this.line.text.length && Math.floor(this.time * 2.5) % 2 === 0;
    if (!this.face.visible || !this.tex) return;
    const typing = this.shown < this.line.text.length;
    // mouth: the recording's loudness, or a simple flap while typing a line with no recording
    const talk = this.voiced ? this.voices.level() : typing ? 0.25 + 0.5 * Math.abs(Math.sin(this.time * 14)) : 0;
    drawPortrait(this.g, this.line.who, this.cv.width, this.time + 0.5, talk, this.buildFor(this.line.who));
    this.tex.source.update();
  }
}
