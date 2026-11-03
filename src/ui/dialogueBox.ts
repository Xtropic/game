// The dialogue box: HD over the pixel world, with the speaker's talking portrait, their name, and the line
// typed out. Plays the line's recording; the portrait's mouth follows the recording's loudness.
import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { drawPortrait, hasPortrait } from "../art/portraits";
import { EVEN, type Build } from "../art/build";
import type { Voices } from "../audio/voice";
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

  constructor(private voices: Voices, private buildFor: (id: string) => Build = () => EVEN) {
    this.view.addChild(this.box, this.face, this.frame, this.name, this.body);
    this.view.visible = false;
  }

  get open(): boolean { return !!this.line; }
  get text(): string | null { return this.line?.text ?? null; }
  get speaking(): boolean { return this.voiced && this.voices.playing; }

  show(line: Line): void {
    this.line = line; this.shown = 0; this.time = 0;
    this.voiced = this.voices.play(line.who, line.text);
    this.name.text = line.name;
    this.view.visible = true;
    this.layout();
  }

  /** Confirm pressed: finish typing first, then close. Returns true if the box closed. */
  advance(): boolean {
    if (!this.line) return true;
    if (this.shown < this.line.text.length) { this.shown = this.line.text.length; return false; }
    this.close(); return true;
  }

  close(): void { this.line = null; this.view.visible = false; this.voices.stop(); }

  private screen = { w: 800, h: 600 };
  resize(w: number, h: number): void { this.screen = { w, h }; this.layout(); }

  private layout(): void {
    const { w, h } = this.screen, port = !!this.line && hasPortrait(this.line.who);
    const narrow = w < 560;
    this.size = narrow ? 92 : 132;
    const bw = Math.min(w - 24, 820), bh = Math.max(this.size + 24, 130), x = (w - bw) / 2, y = h - bh - 12;
    this.box.clear().roundRect(x, y, bw, bh, 10).fill({ color: 0x14100c, alpha: 0.94 }).stroke({ color: 0x6b5236, width: 2 });
    const tx = port ? x + this.size + 30 : x + 20;
    this.face.visible = this.frame.visible = port;
    if (port) {
      const res = Math.min(2, window.devicePixelRatio || 1), px = Math.round(this.size * res);
      if (this.cv.width !== px) { this.cv.width = this.cv.height = px; this.tex?.destroy(true); this.tex = Texture.from(this.cv); this.face.texture = this.tex; }
      this.face.x = x + 12; this.face.y = y + 12; this.face.width = this.face.height = this.size;
      this.frame.clear().roundRect(x + 12, y + 12, this.size, this.size, 6).stroke({ color: 0x8a6a44, width: 2 });
    }
    this.name.x = tx; this.name.y = y + 14;
    this.body.x = tx; this.body.y = y + (this.line?.name ? 40 : 18); this.body.style.wordWrapWidth = x + bw - tx - 20;
    this.body.style.fontSize = narrow ? 16 : 18; this.body.style.lineHeight = narrow ? 22 : 26;
  }

  update(dt: number): void {
    if (!this.line) return;
    this.time += dt;
    this.shown = Math.min(this.line.text.length, this.shown + dt * CPS);
  }

  render(): void {
    if (!this.line) return;
    this.body.text = this.line.text.slice(0, Math.floor(this.shown));
    if (!this.face.visible || !this.tex) return;
    const typing = this.shown < this.line.text.length;
    // mouth: the recording's loudness, or a simple flap while typing a line with no recording
    const talk = this.voiced ? this.voices.level() : typing ? 0.25 + 0.5 * Math.abs(Math.sin(this.time * 14)) : 0;
    drawPortrait(this.g, this.line.who, this.cv.width, this.time + 0.5, talk, this.buildFor(this.line.who));
    this.tex.source.update();
  }
}
