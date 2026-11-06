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
  /** Notes that failed to play (a bad note never stops the music; tests check this stays 0). */
  errors = 0;
  lastError = "";
  private listeners: ((on: boolean) => void)[] = [];
  /** Music and effects levels from the settings, 0..1. */
  musicLevel = 0.8;
  effectsLevel = 0.8;

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
      this.sfxBus = a.createGain(); this.sfxBus.gain.value = 0.8 * this.effectsLevel; this.sfxBus.connect(this.master); const ss = a.createGain(); ss.gain.value = 0.25; this.sfxBus.connect(ss); ss.connect(this.verb);
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

  /** Sets the music and effects levels (0..1) from the settings. */
  setLevels(music: number, effects: number): void {
    this.musicLevel = music; this.effectsLevel = effects;
    const a = this.ctx; if (!a) return;
    this.sfxBus.gain.setTargetAtTime(0.8 * effects, a.currentTime, 0.05);
    if (this.bus && this.cur) { this.bus.gain.cancelScheduledValues(a.currentTime); this.bus.gain.setTargetAtTime((TRACKS[this.cur]?.vol ?? 0.5) * music, a.currentTime, 0.1); }
  }

  /** Pulls the music back for a few seconds (a fanfare, a big moment), then lets it return. */
  duck(seconds: number): void {
    const a = this.ctx; if (!a || !this.bus) return;
    const g = this.bus.gain, now = a.currentTime, full = (this.cur ? TRACKS[this.cur]?.vol ?? 0.5 : 0.5) * this.musicLevel;
    g.cancelScheduledValues(now); g.setTargetAtTime(full * 0.15, now, 0.15); g.setTargetAtTime(full, now + seconds, 0.8);
  }

  /** Crossfades to a track by name (null for silence). Remembered until the engine starts. */
  track(name: string | null): void {
    if (name && !TRACKS[name]) name = "lull";
    if (this.cur === name) return;
    this.cur = name;
    const a = this.ctx; if (!a) return;
    const now = a.currentTime;
    if (this.bus) { const old = this.bus; old.gain.cancelScheduledValues(now); old.gain.setTargetAtTime(0, now, 0.6); setTimeout(() => old.disconnect(), 4000); }
    if (!name) { this.bus = null; return; }
    const bus = a.createGain(); bus.gain.value = 0; bus.gain.setTargetAtTime(TRACKS[name].vol * this.musicLevel, now + 0.1, 0.8);
    bus.connect(this.master); const send = a.createGain(); send.gain.value = 0.45; bus.connect(send); send.connect(this.verb);
    this.bus = bus; this.step = 0; this.next = now + 0.12;
  }

  private schedule(): void {
    const a = this.ctx; if (!a) return;
    if (!this.cur || !this.on || !this.bus) { this.next = a.currentTime + 0.1; return; }
    const tr = TRACKS[this.cur], e = 60 / tr.bpm / 2;
    if (this.next < a.currentTime) this.next = a.currentTime + 0.05;
    while (this.next < a.currentTime + 0.25) { try { tr.play(this.step, this.next, this.bus, e); } catch (err) { this.errors++; this.lastError = String(err); } this.step++; this.next += e; }
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
  // ---- moods: what a scene should make the player feel, whatever the place ----
  // tender: close, warm, quiet. The foal song an octave up on soft bells over a held major chord.
  tender: { bpm: 58, vol: 0.7, play(n, t, o, e) { const b = bar(n, 8), i = n % 8, c = [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]][b % 4];
    if (i === 0) { v("pad", c[0] + 12, t, e * 8, 0.28, o); v("pad", c[3], t, e * 8, 0.2, o); v("bass", c[0] - 12, t, e * 6, 0.12, o); }
    if (i === 2 || i === 6) v("pluck", c[2] + 12, t, e, 0.05, o);
    const nt = FOAL_AT[b * 8 + i]; if (nt) v("bell", nt[0] + 12, t, e, 0.06, o); } },
  // dread: something terrible is coming. A low drone a semitone apart, a slow heartbeat, a high thin bell.
  dread: { bpm: 60, vol: 0.6, play(n, t, o, e) { const i = n % 8;
    if (n % 32 === 0) { v("pad", 38, t, e * 32, 0.6, o); v("pad", 39, t, e * 32, 0.3, o); v("wind", 0, t, e * 24, 0.05, o); }
    if (i === 0) v("drum", 0, t, e, 0.32, o); if (i === 1) v("drum", 0, t, e, 0.16, o);
    if (n % 64 === 44) v("bell", 87, t, e, 0.03, o);
    if (n % 32 === 20) v("bass", 25, t, e * 8, 0.18, o); } },
  // tension: something has to be done now. A driving pulse, ticking, a phrase that never resolves.
  tension: { bpm: 112, vol: 0.5, play(n, t, o, e) { const i = n % 8, b = bar(n, 4), r = [38, 38, 39, 36][b];
    v("bass", r + (i % 2 ? 12 : 0), t, e * 0.7, i % 2 ? 0.12 : 0.24, o);
    v("tick", 0, t, e, i % 2 ? 0.025 : 0.045, o);
    if (i === 0) v("drum", 0, t, e, 0.35, o); if (i === 6) v("drum", 0, t, e, 0.2, o);
    if (i === 0 && b % 2 === 0) v("pad", r + 24, t, e * 16, 0.3, o);
    if (b === 3 && (i === 0 || i === 2 || i === 4)) v("pluck", [74, 69, 75][i / 2], t, e * 2, 0.08, o); } },
  // grief: loss. A slow minor chord walk and the foal song alone, an octave down, with gaps where notes should be.
  grief: { bpm: 46, vol: 0.65, play(n, t, o, e) { const b = bar(n, 8), i = n % 8, c = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 58], [45, 52, 57, 61], [50, 57, 62, 65]][b];
    if (i === 0) { v("pad", c[0], t, e * 8, 0.4, o); v("pad", c[2], t, e * 8, 0.28, o); v("bass", c[0] - 12, t, e * 8, 0.18, o); }
    const nt = FOAL_AT[b * 8 + i]; if (nt && (b % 4 !== 3 || i < 3)) v("flute", nt[0] - 12, t, nt[1] * e * 0.9, 0.12, o); } },
  // hope: the way forward. The foal song whole, bright and rising, over moving arpeggios.
  hope: { bpm: 80, vol: 0.55, play(n, t, o, e) { const b = bar(n, 16), i = n % 8, c = [[50, 57, 62, 66], [55, 59, 62, 67], [57, 61, 64, 69], [50, 57, 62, 66], [47, 54, 59, 62], [55, 59, 62, 67], [57, 61, 64, 69], [50, 57, 62, 66]][b % 8];
    v("pluck", c[[0, 1, 2, 3, 2, 3, 1, 2][i]] + 12, t, e, 0.08, o);
    if (i === 0) { v("bass", c[0] - 12, t, e * 4, 0.24, o); v("pad", c[1] + 12, t, e * 8, 0.22, o); } if (i === 4) v("bass", c[1] - 12, t, e * 3, 0.16, o);
    if (b >= 8) { const nt = FOAL_AT[(b - 8) * 8 + i]; if (nt) v("flute", nt[0] + (nt[0] % 12 === 5 ? 1 : 0), t, nt[1] * e * 0.95, 0.15, o); } } },
  // fire: the burning. Crackle, war drums, a held dissonance, the foal song fighting through it.
  fire: { bpm: 120, vol: 0.55, play(n, t, o, e) { const i = n % 8, b = bar(n, 8);
    if (n % 32 === 0) { v("pad", 38, t, e * 32, 0.5, o); v("pad", 44, t, e * 32, 0.3, o); }
    if (i % 4 === 0) v("crackle", 0, t, e * 4, 0.08, o);
    if (i === 0 || i === 3 || i === 6) v("drum", 0, t, e, i === 0 ? 0.5 : 0.3, o);
    v("bass", [38, 38, 44, 43][Math.floor(n / 16) % 4] - (i % 2 ? 0 : 12), t, e * 0.8, 0.2, o);
    const nt = FOAL_AT[b * 8 + i]; if (nt && n % 128 >= 64) v("flute", nt[0], t, nt[1] * e * 0.9, 0.12, o); } },
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
  /** The recruit fanfare: the music steps back, a drum roll, a rising bell run, then the foal song's opening
   *  in a bright major key over a full chord. About four seconds. */
  join(): void {
    const a = audio.ctx; if (!a) return; const t = a.currentTime, out = audio.sfxBus;
    audio.duck(5);
    for (let k = 0; k < 10; k++) audio.voice("drum", 0, t + k * 0.05, 0.1, 0.12 + k * 0.03, out);
    [62, 66, 69, 74, 78, 81].forEach((m, i) => audio.voice("bell", m, t + 0.5 + i * 0.07, 0.4, 0.07, out));
    audio.voice("drum", 0, t + 0.95, 0.3, 0.6, out);
    for (const m of [50, 57, 62, 66]) audio.voice("pad", m, t + 0.95, 3.2, 0.5, out);
    audio.voice("bass", 38, t + 0.95, 3, 0.35, out);
    const e = 60 / 96 / 2; let tt = t + 0.95;
    for (const [m, d] of [[74, 2], [69, 2], [78, 4], [76, 2], [74, 2], [81, 6]] as const) { audio.voice("flute", m, tt, d * e * 0.95, 0.2, out); audio.voice("bell", m + 12, tt, d * e, 0.04, out); tt += d * e; }
    audio.voice("drum", 0, tt - 6 * e, 0.3, 0.45, out);
    [74, 78, 81, 86].forEach((m, i) => audio.voice("bell", m, tt + i * 0.06, 0.6, 0.06, out));
  },
  bump(): void { const a = audio.ctx; if (a) audio.voice("step", 300, a.currentTime, 0.05, 0.08, audio.sfxBus); },
};

export const TRACK_NAMES = (): string[] => Object.keys(TRACKS);

/** Which track plays: the scene's mood first (set by the story while a scene plays), then the mood of the story
 *  at this stage, then the place's own music. The music always says how the moment should feel. */
export function trackFor(map: string, music: string | undefined, sceneMood?: string, stageMood?: string): string {
  if (sceneMood && TRACKS[sceneMood]) return sceneMood;
  if (stageMood && TRACKS[stageMood]) return stageMood;
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
