// Music and sound effects, all synthesised live with Web Audio: no files to load. Every track borrows from the
// foal song, the tune Rhea sings to the kith. Browsers only allow sound after the player presses something, so
// the engine starts on the first key press, click or touch. N turns all sound (music, effects and voices) on and off.

type Out = AudioNode;
type Kind = "pluck" | "bell" | "flute" | "pad" | "bass" | "drum" | "tick" | "step" | "metal" | "hiss" | "wind" | "crackle" | "whoosh";
interface Track { bpm: number; vol: number; play(n: number, t: number, o: Out, e: number): void; }

const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
const rand = Math.random;

class Engine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private verb!: ConvolverNode;
  sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private bus: GainNode | null = null;
  cur: string | null = null;
  private step = 0;
  private next = 0;
  on = true;
  private listeners: ((on: boolean) => void)[] = [];

  constructor() { try { this.on = localStorage.getItem("lull-sound") !== "off"; } catch { /* storage may be blocked */ } }

  /** Starts the engine (call from a key press, click or touch). Safe to call again. */
  start(): void {
    if (this.ctx) { if (this.ctx.state === "suspended") void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      const a = this.ctx = new AC();
      this.master = a.createGain(); this.master.gain.value = this.on ? 0.75 : 0;
      const comp = a.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
      this.master.connect(comp); comp.connect(a.destination);
      const len = Math.floor(a.sampleRate * 3.4), ir = a.createBuffer(2, len, a.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      this.verb = a.createConvolver(); this.verb.buffer = ir; const vg = a.createGain(); vg.gain.value = 0.5; this.verb.connect(vg); vg.connect(this.master);
      this.sfxBus = a.createGain(); this.sfxBus.gain.value = 0.8; this.sfxBus.connect(this.master); const ss = a.createGain(); ss.gain.value = 0.25; this.sfxBus.connect(ss); ss.connect(this.verb);
      const nb = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = rand() * 2 - 1; this.noise = nb;
      setInterval(() => this.schedule(), 35);
      const want = this.cur; this.cur = null; this.track(want);
    } catch { this.ctx = null; }
  }

  setOn(on: boolean): void {
    this.on = on;
    try { localStorage.setItem("lull-sound", on ? "on" : "off"); } catch { /* fine */ }
    if (this.ctx) this.master.gain.setTargetAtTime(on ? 0.75 : 0, this.ctx.currentTime, 0.1);
    for (const l of this.listeners) l(on);
  }
  onChange(fn: (on: boolean) => void): void { this.listeners.push(fn); }

  /** Crossfades to a track by name (null for silence). Remembered until the engine starts. */
  track(name: string | null): void {
    if (name && !TRACKS[name]) name = "lull";
    if (this.cur === name) return;
    this.cur = name;
    const a = this.ctx; if (!a) return;
    const now = a.currentTime;
    if (this.bus) { const old = this.bus; old.gain.cancelScheduledValues(now); old.gain.setTargetAtTime(0, now, 0.6); setTimeout(() => old.disconnect(), 4000); }
    if (!name) { this.bus = null; return; }
    const bus = a.createGain(); bus.gain.value = 0; bus.gain.setTargetAtTime(TRACKS[name].vol, now + 0.1, 0.8);
    bus.connect(this.master); const send = a.createGain(); send.gain.value = 0.45; bus.connect(send); send.connect(this.verb);
    this.bus = bus; this.step = 0; this.next = now + 0.12;
  }

  private schedule(): void {
    const a = this.ctx; if (!a) return;
    if (!this.cur || !this.on || !this.bus) { this.next = a.currentTime + 0.1; return; }
    const tr = TRACKS[this.cur], e = 60 / tr.bpm / 2;
    if (this.next < a.currentTime) this.next = a.currentTime + 0.05;
    while (this.next < a.currentTime + 0.25) { try { tr.play(this.step, this.next, this.bus, e); } catch { /* one bad note never stops the music */ } this.step++; this.next += e; }
  }

  /** One note of an instrument. */
  voice(kind: Kind, m: number, t: number, dur: number, vel: number, out: Out | null): void {
    const a = this.ctx; if (!a || !out) return;
    const f = mtof(m), g = a.createGain(); g.gain.value = 0; g.connect(out);
    const end = t + dur;
    const osc = (type: OscillatorType, freq: number, det = 0, start = t, stop = end + 2): OscillatorNode => { const o = a.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det; o.start(start); o.stop(stop); return o; };
    const noise = (start: number, stop: number): AudioBufferSourceNode => { const n = a.createBufferSource(); n.buffer = this.noise; n.loop = true; n.start(start, rand()); n.stop(stop); return n; };
    const filt = (type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode => { const b = a.createBiquadFilter(); b.type = type; b.frequency.value = freq; b.Q.value = q; return b; };
    const gain = (v: number): GainNode => { const x = a.createGain(); x.gain.value = v; return x; };
    switch (kind) {
      case "pluck": {
        const lp = filt("lowpass", f * 9); lp.frequency.setValueAtTime(f * 9, t); lp.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.7); lp.connect(g);
        osc("triangle", f).connect(lp); const h = gain(0.25); osc("sawtooth", f, 4).connect(h); h.connect(lp);
        g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0005, t + Math.max(1.2, dur * 2)); break;
      }
      case "bell": {
        const car = osc("sine", f, 0, t, t + 4), mod = osc("sine", f * 3.01, 0, t, t + 4), mg = a.createGain();
        mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.6); mod.connect(mg); mg.connect(car.frequency); car.connect(g);
        g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 3.5); break;
      }
      case "flute": {
        const o = osc("sine", f), o2 = osc("triangle", f * 2, 3), lfo = osc("sine", 5.2, 0, t), lg = a.createGain();
        lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + 0.35); lfo.connect(lg); lg.connect(o.frequency);
        const h = gain(0.12); o2.connect(h); h.connect(g); o.connect(g);
        const n = noise(t, end + 0.3), bp = filt("bandpass", f * 2, 2), ng = gain(0.05); n.connect(bp); bp.connect(ng); ng.connect(g);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.08); g.gain.setTargetAtTime(vel * 0.8, t + 0.1, 0.3); g.gain.setTargetAtTime(0, end, 0.12); break;
      }
      case "pad": {
        const lp = filt("lowpass", 700 + vel * 600, 0.5); lp.connect(g);
        for (const d of [-9, 0, 8]) osc("sawtooth", f, d, t, end + 2.5).connect(lp);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.3, t + Math.min(1.5, dur * 0.5)); g.gain.setTargetAtTime(0, end, 0.6); break;
      }
      case "bass": {
        const lp = filt("lowpass", 380); lp.connect(g);
        osc("sine", f).connect(lp); osc("triangle", f * 2).connect(lp);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.02); g.gain.setTargetAtTime(vel * 0.5, t + 0.05, 0.3); g.gain.setTargetAtTime(0, end, 0.1); break;
      }
      case "drum": {
        const o = osc("sine", 110, 0, t, t + 0.6); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25); o.connect(g);
        const n = noise(t, t + 0.2), lp = filt("lowpass", 900), ng = gain(0.5); n.connect(lp); lp.connect(ng); ng.connect(g);
        g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.45); break;
      }
      case "tick": case "step": {
        const n = noise(t, t + 0.12), bp = filt(kind === "tick" ? "highpass" : "bandpass", kind === "tick" ? 6000 : m); n.connect(bp); bp.connect(g);
        g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0005, t + (kind === "tick" ? 0.05 : 0.09)); break;
      }
      case "metal": {
        const car = osc("square", f, 0, t, t + 1.5), mod = osc("sine", f * 2.71, 0, t, t + 1.5), mg = a.createGain(); mg.gain.setValueAtTime(f * 4, t); mg.gain.exponentialRampToValueAtTime(10, t + 0.6); mod.connect(mg); mg.connect(car.frequency);
        const bp = filt("bandpass", 1400, 3); car.connect(bp); bp.connect(g);
        g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 1.1); break;
      }
      case "hiss": case "wind": case "crackle": {
        const n = noise(t, end + 1), f2 = filt(kind === "wind" ? "bandpass" : "highpass", kind === "hiss" ? 2500 : kind === "wind" ? 500 : 3000, kind === "wind" ? 0.6 : 0.7); n.connect(f2); f2.connect(g);
        if (kind === "crackle") { g.gain.setValueAtTime(0, t); for (let i = 0; i < 10; i++) { const tt = t + rand() * dur; g.gain.setValueAtTime(vel * rand(), tt); g.gain.setTargetAtTime(0, tt + 0.01, 0.01); } }
        else { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.4); g.gain.linearRampToValueAtTime(0, end + 0.8); }
        break;
      }
      case "whoosh": {
        const n = noise(t, t + dur + 0.2), lp = filt("lowpass", 200); lp.frequency.setValueAtTime(200, t); lp.frequency.exponentialRampToValueAtTime(1800, t + dur * 0.5); lp.frequency.exponentialRampToValueAtTime(200, t + dur); n.connect(lp); lp.connect(g);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.5); g.gain.linearRampToValueAtTime(0, t + dur); break;
      }
    }
  }
}

export const audio = new Engine();
const v = (kind: Kind, m: number, t: number, dur: number, vel: number, out: Out): void => audio.voice(kind, m, t, dur, vel, out);

// ---- The foal song: 8 bars of eighth notes in D dorian ----
const FOAL: [number, number][] = [[74, 2], [69, 2], [77, 4], [76, 2], [74, 2], [72, 2], [74, 2], [69, 3], [67, 1], [65, 2], [67, 2], [69, 8],
  [74, 2], [69, 2], [77, 4], [79, 2], [77, 2], [76, 2], [74, 2], [72, 3], [74, 1], [76, 2], [72, 2], [74, 8]];
const FOAL_AT: Record<number, [number, number]> = (() => { const m: Record<number, [number, number]> = {}; let p = 0; for (const [n, d] of FOAL) { m[p] = [n, d]; p += d; } return m; })();
const CH = [[50, 57, 62, 65], [48, 55, 60, 64], [53, 57, 60, 65], [45, 52, 57, 60], [50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [50, 57, 62, 65]];
const SOMBRE = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]];
const bar = (n: number, len: number): number => Math.floor(n / 8) % len;

/** Each track plays one eighth-note step: n is the step count, t its time, o the output, e an eighth's length. */
const TRACKS: Record<string, Track> = {
  larkfold: { bpm: 84, vol: 0.5, play(n, t, o, e) { const b = bar(n, 16), i = n % 8, c = CH[b % 8];
    const arp = [0, 1, 2, 3, 2, 1, 2, 3][i]; v("pluck", c[arp] + (arp >= 2 ? 12 : 0), t, e, 0.13, o);
    if (i === 0) v("bass", c[0] - 12, t, e * 4, 0.28, o); if (i === 4) v("bass", c[1] - 12, t, e * 3, 0.18, o);
    if (i % 2 === 1) v("tick", 0, t, e, 0.025, o);
    if (b >= 8) { const nt = FOAL_AT[(b - 8) * 8 + i]; if (nt) v("flute", nt[0], t, nt[1] * e * 0.95, 0.16, o); } } },
  dusk: { bpm: 64, vol: 0.5, play(n, t, o, e) { const b = bar(n, 8), i = n % 8, c = CH[b];
    if (i === 0) { v("pad", c[0], t, e * 8, 0.5, o); v("pad", c[3], t, e * 8, 0.35, o); v("bass", c[0] - 12, t, e * 7, 0.2, o); }
    const nt = FOAL_AT[b * 8 + i]; if (nt && n % 128 < 64) v("bell", nt[0], t, e, 0.09, o);
    if (n % 128 >= 64 && (i === 0 || i === 3 || i === 6)) v("pluck", c[i / 3 + 1] + 12, t, e, 0.08, o); } },
  home: { bpm: 60, vol: 0.8, play(n, t, o, e) { const b = bar(n, 8), i = n % 8, c = CH[b];
    const nt = FOAL_AT[b * 8 + i]; if (nt) v("bell", nt[0] + 12, t, e, 0.07, o);
    if (i === 0) v("pad", c[0] + 12, t, e * 8, 0.3, o); } },
  caves: { bpm: 52, vol: 0.5, play(n, t, o, e) { const i = n % 8;
    if (n % 32 === 0) { v("pad", 38, t, e * 32, 0.6, o); v("pad", 45, t, e * 32, 0.4, o); }
    if (i === 0) v("bass", 38, t, e * 2, 0.16, o);
    if (rand() < 0.14) v("bell", [74, 76, 81, 84, 86][Math.floor(rand() * 5)], t, e, 0.05, o); } },
  sombre: { bpm: 56, vol: 0.5, play(n, t, o, e) { const b = bar(n, 4), i = n % 8, c = SOMBRE[b];
    if (i === 0) { v("pad", c[0], t, e * 8, 0.45, o); v("pad", c[2], t, e * 8, 0.3, o); v("pad", c[3], t, e * 8, 0.25, o); v("bass", c[0] - 12, t, e * 8, 0.22, o); }
    if (i === 2 || i === 5) v("pluck", c[3] + (i === 5 ? 12 : 0), t, e, 0.06, o); } },
  night: { bpm: 66, vol: 0.55, play(n, t, o, e) { const i = n % 8, b = bar(n, 8);
    if (n % 64 === 0) { v("pad", 38, t, e * 64, 0.55, o); v("wind", 0, t, e * 32, 0.05, o); }
    if (i === 0) v("drum", 0, t, e, 0.35, o); if (i === 1) v("drum", 0, t, e, 0.2, o);
    if (n % 64 === 32) v("pad", 39, t, e * 16, 0.25, o);
    if (b === 3) { const nt = FOAL_AT[i]; if (nt) v("flute", nt[0] - 12, t, nt[1] * e * 0.9, 0.1, o); }
    if (b === 7 && i === 4) v("bell", 81, t, e, 0.03, o); } },
  battle: { bpm: 138, vol: 0.55, play(n, t, o, e) { const i = n % 8, b = bar(n, 4), roots = [38, 38, 34, 36];
    if (i === 0 || i === 3 || i === 6) v("drum", 0, t, e, i === 0 ? 0.55 : 0.35, o);
    if (i === 4) v("drum", 0, t, e, 0.25, o);
    v("tick", 0, t, e, i % 2 ? 0.03 : 0.05, o);
    v("bass", roots[b] + [0, 0, 12, 0, 3, 0, 7, 5][i], t, e * 0.9, 0.28, o);
    if (i === 0 || i === 3 || i === 6) { const c = [CH[0], CH[0], CH[5], CH[6]][b]; v("pluck", c[2] + 12, t, e, 0.1, o); v("pluck", c[3] + 12, t, e, 0.08, o); }
    if (b === 3 && i === 0) v("flute", 74, t, e * 2, 0.1, o); if (b === 3 && i === 2) v("flute", 69, t, e * 2, 0.1, o); if (b === 3 && i === 4) v("flute", 77, t, e * 4, 0.1, o); } },
  ash: { bpm: 50, vol: 0.55, play(n, t, o, e) { const b = bar(n, 8), i = n % 8;
    if (n % 64 === 0) { v("pad", 38, t, e * 64, 0.55, o); v("pad", 45, t, e * 64, 0.35, o); }
    if (i === 0) v("crackle", 0, t, e * 8, 0.06, o);
    const nt = FOAL_AT[b * 8 + i]; if (nt && (b % 2 === 0 || i < 4)) v("flute", nt[0] - 12, t, nt[1] * e, 0.14, o); } },
  vantry: { bpm: 72, vol: 0.5, play(n, t, o, e) { const i = n % 8;
    if (n % 32 === 0) { v("pad", 38, t, e * 32, 0.5, o); v("pad", 39, t, e * 32, 0.2, o); }
    if (i === 0) v("metal", 62, t, e, 0.08, o); if (i === 5) v("metal", 57, t, e, 0.05, o);
    if (i % 2 === 0) v("bass", 26, t, e, 0.18, o);
    if (n % 64 === 40) v("bell", 63, t, e, 0.04, o); } },
  hatchery: { bpm: 126, vol: 0.55, play(n, t, o, e) { const i = n % 8;
    if (n % 16 === 0) v("hiss", 0, t, e * 16, 0.08, o);
    if (i % 2 === 0) v("bell", n % 4 === 0 ? 88 : 87, t, e, 0.05, o);
    if (i === 0 || i === 4) v("drum", 0, t, e, 0.4, o);
    v("bass", [38, 38, 39, 38][bar(n, 4)], t, e * 0.8, 0.2, o); } },
  lull: { bpm: 48, vol: 0.7, play(n, t, o, e) { const b = bar(n, 8), i = n % 8, c = CH[b];
    if (i === 0) { v("pad", c[0], t, e * 8, 0.35, o); v("pad", c[2] - 0.4, t, e * 8, 0.25, o); }
    const nt = FOAL_AT[b * 8 + i]; if (nt && rand() < 0.8) v("bell", nt[0] + (rand() - 0.5) * 0.5, t, e, 0.05, o); } },
  // ---- new for the open world ----
  world: { bpm: 92, vol: 0.5, play(n, t, o, e) { const b = bar(n, 16), i = n % 8, c = CH[b % 8];
    if (i === 0) { v("pad", c[0] + 12, t, e * 8, 0.25, o); v("bass", c[0] - 12, t, e * 3, 0.25, o); }
    if (i === 3 || i === 6) v("bass", c[1] - 12, t, e * 2, 0.15, o);
    if (i % 2 === 0) v("pluck", c[(i / 2) % 4] + 12, t, e, 0.07, o);
    if (i === 4) v("drum", 0, t, e, 0.12, o);
    if (b >= 8 && b % 2 === 0) { const nt = FOAL_AT[((b - 8) / 2) * 8 + i]; if (nt) v("flute", nt[0] - 12, t, nt[1] * e * 0.95, 0.12, o); } } },
  road: { bpm: 78, vol: 0.5, play(n, t, o, e) { const b = bar(n, 8), i = n % 8, c = CH[(b + 2) % 8];
    v("pluck", c[[0, 2, 1, 3, 2, 1, 3, 2][i]] + 12, t, e, 0.09, o);
    if (i === 0) v("bass", c[0] - 12, t, e * 6, 0.24, o);
    if (n % 64 === 0) v("wind", 0, t, e * 32, 0.04, o);
    if (b >= 4) { const nt = FOAL_AT[(b - 4) * 8 + i]; if (nt && rand() < 0.7) v("bell", nt[0], t, e, 0.05, o); } } },
  camp: { bpm: 96, vol: 0.5, play(n, t, o, e) { const b = bar(n, 8), i = n % 8, c = CH[b];
    if (i === 0 || i === 5) v("drum", 0, t, e, i === 0 ? 0.3 : 0.18, o);
    if (i % 2 === 1) v("tick", 0, t, e, 0.03, o);
    v("bass", c[0] - 12 + (i === 6 ? 7 : 0), t, e * 0.8, i % 2 ? 0.1 : 0.2, o);
    if (i === 0) v("pad", c[1], t, e * 8, 0.3, o);
    const nt = FOAL_AT[b * 8 + i]; if (nt && n % 128 >= 64) v("flute", nt[0] - 12, t, nt[1] * e * 0.9, 0.11, o); } },
  town: { bpm: 100, vol: 0.5, play(n, t, o, e) { const b = bar(n, 8), i = n % 8, c = CH[b];
    v("pluck", c[[0, 2, 3, 2, 1, 2, 3, 2][i]] + (i % 4 === 2 ? 24 : 12), t, e, 0.09, o);
    if (i === 0 || i === 4) v("bass", c[0] - 12, t, e * 2, 0.22, o);
    if (i === 2 || i === 6) v("tick", 0, t, e, 0.04, o);
    if (n % 128 >= 64) { const nt = FOAL_AT[b * 8 + i]; if (nt) v("bell", nt[0] + 12, t, e, 0.05, o); } } },
};

/** Short effects for what happens on screen. */
export const sfx = {
  choose(): void { const a = audio.ctx; if (a) audio.voice("bell", 81, a.currentTime, 0.3, 0.06, audio.sfxBus); },
  next(): void { const a = audio.ctx; if (a) audio.voice("pluck", [74, 77, 79, 81][Math.floor(rand() * 4)], a.currentTime, 0.1, 0.035, audio.sfxBus); },
  door(): void { const a = audio.ctx; if (a) audio.voice("whoosh", 0, a.currentTime, 0.5, 0.12, audio.sfxBus); },
  pickup(): void { const a = audio.ctx; if (!a) return; const t = a.currentTime; [74, 81, 86].forEach((m, i) => audio.voice("bell", m, t + i * 0.09, 0.3, 0.08, audio.sfxBus)); },
  sing(): void { const a = audio.ctx; if (!a) return; const e = 60 / 84 / 2; ([[74, 2], [69, 2], [77, 4]] as const).reduce((tt, [m, d]) => { audio.voice("flute", m, tt, d * e * 0.95, 0.2, audio.sfxBus); return tt + d * e; }, a.currentTime); },
  hit(): void { const a = audio.ctx; if (!a) return; audio.voice("drum", 0, a.currentTime, 0.2, 0.5, audio.sfxBus); audio.voice("tick", 0, a.currentTime, 0.1, 0.15, audio.sfxBus); },
  heal(): void { const a = audio.ctx; if (!a) return; const t = a.currentTime; [69, 74, 78].forEach((m, i) => audio.voice("bell", m, t + i * 0.07, 0.3, 0.06, audio.sfxBus)); },
  swing(): void { const a = audio.ctx; if (a) audio.voice("whoosh", 0, a.currentTime, 0.25, 0.07, audio.sfxBus); },
  note(m: number): void { const a = audio.ctx; if (a) audio.voice("flute", m, a.currentTime, 0.32, 0.2, audio.sfxBus); },
  join(): void { const a = audio.ctx; if (!a) return; const t = a.currentTime; [62, 69, 74, 77, 81].forEach((m, i) => audio.voice("bell", m, t + i * 0.08, 0.4, 0.07, audio.sfxBus)); audio.voice("flute", 74, t + 0.45, 0.5, 0.14, audio.sfxBus); audio.voice("flute", 81, t + 0.9, 0.9, 0.14, audio.sfxBus); },
  bump(): void { const a = audio.ctx; if (a) audio.voice("step", 300, a.currentTime, 0.05, 0.08, audio.sfxBus); },
};

/** Which track fits a place at a point in the story. */
export function trackFor(map: string, music: string | undefined, stage: string): string {
  if (map === "larkfold") {
    if (stage.startsWith("a")) return "ash";
    if (stage === "n4" || stage === "n5") return "ash";
    if (stage === "n3" || stage === "n3b") return "night";
    if (stage === "n1" || stage === "n2") return "sombre";
    if (stage === "d3" || stage === "d4") return "dusk";
    return "larkfold";
  }
  if (map === "trail" && (stage === "n4" || stage === "n5")) return "ash";
  if (map === "home" && stage === "n2") return "sombre";
  if (map === "hatchery" && stage !== "i2" && stage !== "i2b") return "vantry";
  if (map.startsWith("town-")) return "town";
  return music && TRACKS[music] ? music : "lull";
}

/** Starts sound on the first press, and lets N switch it on and off. */
export function attachSound(target: Window): void {
  const wake = (): void => audio.start();
  target.addEventListener("keydown", (e) => { wake(); if (e.code === "KeyN" && !e.repeat) audio.setOn(!audio.on); });
  target.addEventListener("pointerdown", wake);
  target.addEventListener("touchstart", wake, { passive: true });
}
