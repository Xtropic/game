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
import { familyOf } from "../kith/befriend";

export interface Joiner { id: string; name: string; what: string; kith?: boolean; species?: string; }

// Only what is true now: never what a recruit will go on to do later in the story.
const ROLE: Record<string, string> = {
  party: "Travels and fights beside Rhea.",
  command: "Stands with the Commons.",
  base: "Has joined the Commons.",
};

/** What a newly joined person or kith does, in a line. */
export function joinerFor(id: string, kith: Record<string, Kith>, names: Record<string, string>): Joiner {
  const k = kith[id];
  if (k) return { id, name: k.name, kith: true, species: k.species, what: `Kith: ${SPECIES[k.species]?.name ?? k.species}, level ${k.level}. ${id.startsWith("wild-") || id.startsWith("shy-") ? "Won over in the wild. Travels with your company." : "Fights in the party."}` };
  const r = recruit(id);
  return { id, name: names[id] ?? r?.name ?? id, what: r ? ROLE[r.role] ?? "" : "Travels with Rhea." };
}

/** A portrait as a sprite: painted art, or the drawn bust; a kith with no painted portrait yet shows its map figure. */
export function portrait(j: Joiner, size: number): Container {
  const c = new Container();
  // a kith shows its own painted portrait, else its species', else its family's base kind
  const key = !j.kith || hasPainted(j.id) ? j.id : [`kith-${j.species}`, `kith-${j.species ? familyOf(j.species) : ""}`].find(hasPainted);
  if (j.kith && key && key !== j.id) { const s = new Sprite(portraitTexture(key, size * 2)); s.width = s.height = size; c.addChild(s); return c; }
  if (j.kith && !hasPainted(j.id)) {
    c.addChild(new Graphics().rect(0, 0, size, size).fill(0x3a3428));
    const fam = j.species ? familyOf(j.species) : "loftbuck", look = ["loftbuck", "reedcat"].includes(fam) ? fam : "loftbuck";
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

/** The recruit moment: the world dims, light breaks behind the portrait, sparks rise, and a fanfare on the foal
 *  song plays while the music steps back. It holds until the player presses on, so nobody misses who joined. */
export class JoinCards {
  readonly view = new Container();
  private queue: Joiner[] = [];
  private card: { root: Container; rays: Graphics; sparks: Graphics; pic: Container; parts: { x: number; y: number; vy: number; s: number; life: number }[] } | null = null;
  private t = 0;
  private w = 800;
  private h = 600;

  constructor() { this.view.eventMode = "none"; }

  push(j: Joiner): void { this.queue.push(j); }
  get showing(): boolean { return !!this.card || this.queue.length > 0; }
  /** The card can be dismissed once it has fully arrived. */
  get canClose(): boolean { return !!this.card && this.t > 1.4; }

  resize(w: number, h = this.h): void { this.w = w; this.h = h; }

  close(): void {
    if (!this.card) return;
    this.card.root.destroy({ children: true }); this.card = null;
  }

  update(dt: number): void {
    if (!this.card && this.queue.length) this.open(this.queue.shift()!);
    const c = this.card; if (!c) return;
    this.t += dt;
    const a = Math.min(1, this.t / 0.4), pop = this.t < 0.9 ? Math.min(1, Math.max(0, (this.t - 0.25) / 0.45)) : 1;
    c.root.alpha = a;
    const ease = 1 - Math.pow(1 - pop, 3), over = pop < 1 ? 1 + 0.12 * Math.sin(pop * Math.PI) : 1;
    c.pic.scale.set(ease * over);
    // light: slow turning rays behind the portrait
    const cx = this.w / 2, cy = this.h * 0.4;
    c.rays.clear();
    for (let i = 0; i < 16; i++) {
      const ang = this.t * 0.25 + (i * Math.PI * 2) / 16, sp = 0.09, r = Math.max(this.w, this.h);
      c.rays.moveTo(cx, cy).lineTo(cx + Math.cos(ang - sp) * r, cy + Math.sin(ang - sp) * r).lineTo(cx + Math.cos(ang + sp) * r, cy + Math.sin(ang + sp) * r).closePath()
        .fill({ color: 0xffd98a, alpha: 0.07 * a });
    }
    c.rays.circle(cx, cy, 170).fill({ color: 0xffe2a0, alpha: 0.10 * a }).circle(cx, cy, 120).fill({ color: 0xfff0c8, alpha: 0.10 * a });
    // sparks rising from the portrait
    if (this.t < 3 && Math.random() < 0.6) c.parts.push({ x: cx + (Math.random() - 0.5) * 260, y: cy + 90, vy: 30 + Math.random() * 60, s: 1 + Math.random() * 2.5, life: 1 });
    c.sparks.clear();
    for (const p of c.parts) { p.y -= p.vy * dt; p.life -= dt * 0.45; if (p.life > 0) c.sparks.circle(p.x + Math.sin(p.y * 0.05) * 6, p.y, p.s).fill({ color: 0xfff0b0, alpha: p.life * a }); }
    c.parts = c.parts.filter((p) => p.life > 0);
    const hint = c.root.getChildByLabel("hint") as Text | null; if (hint) hint.alpha = this.canClose ? 0.6 + 0.4 * Math.sin(this.t * 4) : 0;
  }

  private open(j: Joiner): void {
    this.t = 0;
    const root = new Container(), w = this.w, h = this.h, cx = w / 2, cy = h * 0.4;
    root.addChild(new Graphics().rect(0, 0, w, h).fill({ color: 0x080604, alpha: 0.78 }));
    const rays = new Graphics(); root.addChild(rays);
    const size = Math.min(220, h * 0.36);
    const pic = new Container();
    const art = portrait(j, size); art.x = -size / 2; art.y = -size / 2;
    pic.addChild(new Graphics().roundRect(-size / 2 - 6, -size / 2 - 6, size + 12, size + 12, 8).fill(0x2a2010).roundRect(-size / 2 - 6, -size / 2 - 6, size + 12, size + 12, 8).stroke({ color: 0xe0c070, width: 3 }), art);
    pic.x = cx; pic.y = cy; pic.scale.set(0); root.addChild(pic);
    const sparks = new Graphics(); root.addChild(sparks);
    const tag = new Text({ text: j.kith ? "A KITH JOINS YOU" : "RECRUITED", style: { ...serif(18, "#e0c070", true), letterSpacing: 6 } });
    tag.anchor.set(0.5, 0); tag.x = cx; tag.y = cy + size / 2 + 22;
    const name = new Text({ text: j.name, style: { ...serif(42, "#fff4dc", true), dropShadow: { color: "#000000", alpha: 0.8, blur: 6, distance: 2, angle: Math.PI / 2 } } });
    name.anchor.set(0.5, 0); name.x = cx; name.y = tag.y + 26;
    const what = new Text({ text: j.what, style: { ...serif(17, "#e8dcc4"), align: "center", wordWrap: true, wordWrapWidth: Math.min(560, w - 40) } });
    what.anchor.set(0.5, 0); what.x = cx; what.y = name.y + 54;
    const hint = new Text({ text: "Press Enter to go on   ·   R shows your company", style: serif(14, "#c8b890") });
    hint.label = "hint"; hint.anchor.set(0.5, 0); hint.x = cx; hint.y = Math.min(h - 30, what.y + what.height + 22); hint.alpha = 0;
    root.addChild(tag, name, what, hint);
    root.alpha = 0;
    this.view.addChild(root);
    this.card = { root, rays, sparks, pic, parts: [] };
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
