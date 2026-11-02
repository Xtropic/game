import type { Container } from "pixi.js";
import type { Game } from "./game";

export interface Scene {
  readonly id: string;
  /** Root display object; the scene manager adds it to the stage. */
  readonly view: Container;
  enter(game: Game): void;
  exit(): void;
  /** Fixed-step logic, dt in seconds. */
  update(dt: number): void;
  /** Called every rendered frame; alpha is the fraction into the next fixed step. */
  render?(alpha: number): void;
  /** Called when the window size changes. */
  resize?(width: number, height: number): void;
  /** State to keep in a save file, if this scene has any. */
  snapshot?(): unknown;
}

/** A stack of scenes: the top one updates; all are drawn bottom to top (menus over the world). */
export class SceneStack {
  private stack: Scene[] = [];
  constructor(private game: Game) {}

  get top(): Scene | undefined { return this.stack[this.stack.length - 1]; }
  get all(): readonly Scene[] { return this.stack; }

  push(s: Scene): void { this.stack.push(s); this.game.stage.addChild(s.view); s.enter(this.game); s.resize?.(this.game.width, this.game.height); }
  pop(): Scene | undefined { const s = this.stack.pop(); if (s) { s.exit(); s.view.destroy({ children: true }); } return s; }
  replace(s: Scene): void { while (this.stack.length) this.pop(); this.push(s); }
  update(dt: number): void { this.top?.update(dt); }
  render(alpha: number): void { for (const s of this.stack) s.render?.(alpha); }
  resize(w: number, h: number): void { for (const s of this.stack) s.resize?.(w, h); }
}
