import { Application, Container } from "pixi.js";
import { Input } from "./input";
import { SceneStack } from "./scene";
import { SaveStore, browserKV } from "./save";
import { Voices } from "../audio/voice";

export const STEP = 1 / 60; // fixed logic step in seconds

export class Game {
  readonly app = new Application();
  readonly input = new Input();
  readonly saves = new SaveStore(browserKV());
  readonly scenes = new SceneStack(this);
  readonly stage = new Container();
  readonly voices = new Voices();
  playSeconds = 0;
  /** Story and world state that goes into save files. */
  flags: Record<string, boolean | number | string> = {};
  private acc = 0;

  get width(): number { return this.app.screen.width; }
  get height(): number { return this.app.screen.height; }

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({ resizeTo: host, background: "#0c0f12", antialias: true, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.stage);
    this.input.attach(window);
    this.app.renderer.on("resize", (w: number, h: number) => this.scenes.resize(w, h));
    this.app.ticker.add((t) => this.frame(t.deltaMS / 1000));
  }

  /** Advance by real elapsed seconds: fixed-step updates, then one render pass. */
  frame(elapsed: number): void {
    this.acc += Math.min(elapsed, 0.25);
    while (this.acc >= STEP) {
      this.input.beginFrame();
      this.scenes.update(STEP);
      this.playSeconds += STEP;
      this.acc -= STEP;
    }
    this.scenes.render(this.acc / STEP);
  }
}
