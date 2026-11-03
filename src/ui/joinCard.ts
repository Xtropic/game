// Who has joined. When a character or a kith is recruited, a card drops in at the top of the screen with their
// portrait, their name and what they'll do, with a short fanfare on the foal song. R opens the company: everyone
// who has joined so far, people and kith, with their portraits and where they serve.
import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { drawPortrait, hasPainted } from "../art/portraits";
import { beastSheet } from "../art/people";
import { recruit } from "../cast/recruits";
import { SPECIES } from "../kith/kith";
import type { Kith } from "../kith/kith";
import { sfx } from "../audio/music";

export interface Joiner { id: string; name: string; what: string; kith?: boolean; species?: string; }

const ROLE: Record<string, string> = {
  party: "Travels and fights beside Rhea.",
  command: "Will lead a company in the Commons army.",
  base: "Joins the Commons. Will have work at the base.",
};

/** What a newly joined person or kith does, in a line. */
export function joinerFor(id: string, kith: Record<string, Kith>, names: Record<string, string>): Joiner {
  const k = kith[id];
  if (k) return { id, name: k.name, kith: true, species: k.species, what: `Kith: ${SPECIES[k.species]?.name ?? k.species}, level ${k.level}. Fights in the party.` };
  const r = recruit(id);
  return { id, name: names[id] ?? r?.name ?? id, what: r ? ROLE[r.role] ?? "" : "Travels with Rhea." };
}

/** A portrait as a sprite: painted art, or the drawn bust; a kith with no painted portrait yet shows its map figure. */
function portrait(j: Joiner, size: number): Container {
  const c = new Container();
  if (j.kith && !hasPainted(j.id)) {
    c.addChild(new Graphics().rect(0, 0, size, size).fill(0x3a3428));
    const look = j.species && ["loftbuck", "reedcat"].includes(j.species) ? j.species : "loftbuck";
    const s = new Sprite(beastSheet(look).right[0]); s.texture.source.scaleMode = "nearest";
    const k = Math.floor(size / 18); s.scale.set(k); s.x = (size - 16 * k) / 2; s.y = (size - 12 * k) / 2 + k;
    c.addChild(s);
  } else { const s = new Sprite(portraitTexture(j.id, size * 2)); s.width = s.height = size; c.addChild(s); }
  return c;
}

function portraitTexture(id: string, size: number): Texture {
  const c = document.createElement("canvas"); c.width = c.height = size;
  drawPortrait(c.getContext("2d")!, id, size, 0.5, 0);
  return Texture.from(c);
}

const serif = (size: number, fill: string, bold = false) => ({ fontFamily: "Georgia, serif", fontSize: size, fill, fontWeight: bold ? ("bold" as const) : ("normal" as const) });

export class JoinCards {
  readonly view = new Container();
  private queue: Joiner[] = [];
  private card: Container | null = null;
  private t = 0;
  private w = 800;

  constructor() { this.view.eventMode = "none"; }

  push(j: Joiner): void { this.queue.push(j); }
  get showing(): boolean { return !!this.card || this.queue.length > 0; }

  resize(w: number): void { this.w = w; if (this.card) this.card.x = (w - 420) / 2; }

  update(dt: number): void {
    if (!this.card && this.queue.length) this.open(this.queue.shift()!);
    if (!this.card) return;
    this.t += dt;
    const inT = Math.min(1, this.t / 0.35), outT = Math.max(0, (this.t - 3.6) / 0.4);
    this.card.alpha = Math.min(inT, 1 - outT);
    this.card.y = 70 - 30 * (1 - inT) * (1 - inT);
    if (this.t > 4) { this.card.destroy({ children: true }); this.card = null; }
  }

  private open(j: Joiner): void {
    this.t = 0;
    const c = new Container(), W = 420, H = 112;
    const bg = new Graphics().roundRect(0, 0, W, H, 10).fill({ color: 0x14100c, alpha: 0.94 }).roundRect(0, 0, W, H, 10).stroke({ color: 0xe0c070, width: 2 });
    const pic = portrait(j, 92); pic.x = pic.y = 10;
    const frame = new Graphics().rect(10, 10, 92, 92).stroke({ color: 0xe0c070, width: 1 });
    const tag = new Text({ text: j.kith ? "KITH JOINED" : "RECRUITED", style: { ...serif(13, "#e0c070", true), letterSpacing: 3 } }); tag.x = 116; tag.y = 14;
    const name = new Text({ text: j.kith ? `${j.name} joins you` : `${j.name} joins you`, style: serif(24, "#fff4dc", true) }); name.x = 116; name.y = 34;
    const what = new Text({ text: j.what + "\nPress R to see your company.", style: { ...serif(14, "#d8ccb4"), wordWrap: true, wordWrapWidth: W - 130, lineHeight: 19 } }); what.x = 116; what.y = 66;
    c.addChild(bg, pic, frame, tag, name, what);
    c.x = (this.w - W) / 2; c.y = 40; c.alpha = 0;
    this.view.addChild(c); this.card = c;
    sfx.join();
  }
}

/** The company panel: everyone who has joined, people first, then kith. */
export class CompanyPanel {
  readonly view = new Container();
  open = false;
  constructor() { this.view.visible = false; }

  toggle(members: Joiner[], w: number, h: number): void {
    this.open = !this.open; this.view.visible = this.open;
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    if (!this.open) return;
    const W = Math.min(720, w - 32), rowH = 64, cols = W > 560 ? 2 : 1, colW = W / cols;
    const rows = Math.ceil(members.length / cols), H = Math.min(h - 40, 70 + rows * rowH + 30);
    const x0 = (w - W) / 2, y0 = Math.max(20, (h - H) / 2);
    this.view.addChild(new Graphics().rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.55 }));
    this.view.addChild(new Graphics().roundRect(x0, y0, W, H, 10).fill({ color: 0x14100c, alpha: 0.96 }).roundRect(x0, y0, W, H, 10).stroke({ color: 0xe0c070, width: 2 }));
    const title = new Text({ text: "Your company", style: serif(24, "#fff4dc", true) }); title.x = x0 + 20; title.y = y0 + 14; this.view.addChild(title);
    const hint = new Text({ text: members.length ? "R or Esc to close" : "Nobody has joined yet. R or Esc to close", style: serif(13, "#a89a80") }); hint.x = x0 + W - hint.width - 20; hint.y = y0 + 22; this.view.addChild(hint);
    members.forEach((m, i) => {
      const cx = x0 + 16 + (i % cols) * colW, cy = y0 + 60 + Math.floor(i / cols) * rowH;
      if (cy + rowH > y0 + H) return;
      const pic = portrait(m, 54); pic.x = cx; pic.y = cy;
      const name = new Text({ text: m.name + (m.kith ? "  (kith)" : ""), style: serif(17, "#fff4dc", true) }); name.x = cx + 64; name.y = cy + 4;
      const what = new Text({ text: m.what, style: { ...serif(13, "#d8ccb4"), wordWrap: true, wordWrapWidth: colW - 90 } }); what.x = cx + 64; what.y = cy + 27;
      this.view.addChild(pic, new Graphics().rect(cx, cy, 54, 54).stroke({ color: 0xe0c070, width: 1 }), name, what);
    });
  }
}
