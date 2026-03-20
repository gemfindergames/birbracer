// ─────────────────────────────────────────────
// BirbRacer — Sound System v4 (with Horns)
// ─────────────────────────────────────────────

export type SoundName =
  | "countdown" | "race-start" | "finish" | "emoji-pop"
  | "car-select" | "click" | "engine" | "horn"
  | "horn-car-01" | "horn-car-02" | "horn-car-03" | "horn-car-04"
  | "horn-car-05" | "horn-car-06" | "horn-car-07" | "horn-car-08"
  | "confetti";

class SoundPlayer {
  private ctx: AudioContext | null = null;
  private _muted: boolean = false;
  private activeSounds: Map<string, { stop: () => void }> = new Map();
  private lastPlayTime: Map<string, number> = new Map();
  private masterGain: GainNode | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this._muted = localStorage.getItem("birbracer_sound") === "off";
    }
  }

  private getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx || this.ctx.state === "closed") {
      try {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.7;
        this.masterGain.connect(this.ctx.destination);
      } catch { return null; }
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private getMaster(): GainNode | null { this.getCtx(); return this.masterGain; }

  get muted(): boolean { return this._muted; }
  set muted(v: boolean) {
    this._muted = v;
    if (typeof window !== "undefined") localStorage.setItem("birbracer_sound", v ? "off" : "on");
    if (v) this.stopAll();
  }
  toggle(): boolean { this.muted = !this.muted; return this.muted; }
  preloadAll(): void {}

  play(name: SoundName): void {
    if (this._muted || typeof window === "undefined") return;
    const now = Date.now();
    const minGap = name === "countdown" ? 500 : name.startsWith("horn") ? 2500 : name === "emoji-pop" ? 100 : 60;
    if (now - (this.lastPlayTime.get(name) || 0) < minGap) return;
    this.lastPlayTime.set(name, now);

    const existing = this.activeSounds.get(name);
    if (existing) { try { existing.stop(); } catch {} this.activeSounds.delete(name); }

    const ctx = this.getCtx();
    const master = this.getMaster();
    if (!ctx || !master) return;

    try {
      const sound = this.gen(ctx, master, name);
      if (sound) this.activeSounds.set(name, sound);
    } catch {}
  }

  stop(name: SoundName): void {
    const s = this.activeSounds.get(name);
    if (s) { try { s.stop(); } catch {} this.activeSounds.delete(name); }
  }

  stopAll(): void {
    for (const [, s] of this.activeSounds) { try { s.stop(); } catch {} }
    this.activeSounds.clear();
  }

  private gen(ctx: AudioContext, master: GainNode, name: SoundName): { stop: () => void } | null {
    const t = ctx.currentTime;
    const nodes: AudioScheduledSourceNode[] = [];

    const osc = (type: OscillatorType, freq: number, start: number, dur: number, vol: number, freqEnd?: number): OscillatorNode => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t + start);
      if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + start + dur);
      const fadeIn = Math.min(0.02, dur * 0.1);
      const fadeOut = Math.min(dur * 0.3, 0.15);
      g.gain.setValueAtTime(0, t + start);
      g.gain.linearRampToValueAtTime(vol, t + start + fadeIn);
      g.gain.setValueAtTime(vol, t + start + dur - fadeOut);
      g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
      o.connect(g).connect(master);
      o.start(t + start);
      o.stop(t + start + dur + 0.01);
      nodes.push(o);
      return o;
    };

    // Horn frequencies unique per car
    const hornFreqs: Record<string, [number, number]> = {
      "horn-car-01": [280, 350],   // deep classic
      "horn-car-02": [400, 500],   // mid bright
      "horn-car-03": [220, 280],   // low rumble
      "horn-car-04": [500, 630],   // high sporty
      "horn-car-05": [330, 415],   // warm mid
      "horn-car-06": [260, 330],   // deep warm
      "horn-car-07": [450, 560],   // sharp
      "horn-car-08": [300, 380],   // classic 2
      "horn": [350, 440],          // default
    };

    // Check if horn
    if (name.startsWith("horn")) {
      const [f1, f2] = hornFreqs[name] || hornFreqs["horn"];
      // Two-tone horn like real car horns
      osc("sawtooth", f1, 0, 0.4, 0.12);
      osc("sawtooth", f2, 0, 0.4, 0.1);
      osc("sine", f1 * 2, 0, 0.3, 0.04); // overtone
      // Second honk
      osc("sawtooth", f1, 0.45, 0.25, 0.1);
      osc("sawtooth", f2, 0.45, 0.25, 0.08);
      return { stop: () => nodes.forEach((n) => { try { n.stop(); } catch {} }) };
    }

    switch (name) {
      case "countdown": {
        osc("sine", 880, 0, 0.15, 0.25);
        osc("sine", 1320, 0, 0.12, 0.08);
        osc("sine", 440, 0, 0.08, 0.06);
        break;
      }
      case "race-start": {
        osc("sawtooth", 220, 0, 0.5, 0.08, 330);
        osc("sawtooth", 440, 0.01, 0.5, 0.1, 554);
        osc("sine", 660, 0.02, 0.45, 0.12, 880);
        osc("sine", 880, 0.03, 0.4, 0.1, 1100);
        osc("sine", 120, 0, 0.2, 0.35, 30);
        osc("sine", 1760, 0.1, 0.3, 0.06, 2200);
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.2, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        noise.connect(ng).connect(master);
        noise.start(t);
        noise.stop(t + 0.1);
        nodes.push(noise);
        break;
      }
      case "finish": {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
          osc("sine", freq, i * 0.12, 0.5 - i * 0.05, 0.18);
          osc("sine", freq * 2, i * 0.12 + 0.02, 0.3, 0.04);
        });
        osc("sine", 1568, 0.45, 0.8, 0.06, 2000);
        osc("sine", 2093, 0.5, 0.7, 0.04, 2600);
        break;
      }
      case "confetti": {
        // Sparkly ascending arpeggio
        [1047, 1319, 1568, 2093].forEach((freq, i) => {
          osc("sine", freq, i * 0.06, 0.25, 0.08);
        });
        // Shimmer
        osc("sine", 3000, 0.2, 0.4, 0.03, 4000);
        break;
      }
      case "emoji-pop": {
        osc("sine", 900, 0, 0.1, 0.15, 1500);
        osc("sine", 600, 0.03, 0.08, 0.08);
        break;
      }
      case "car-select": {
        osc("sine", 880, 0, 0.2, 0.15);
        osc("sine", 1320, 0.04, 0.18, 0.1);
        osc("sine", 1760, 0.06, 0.15, 0.05);
        break;
      }
      case "click": {
        osc("sine", 1200, 0, 0.04, 0.1);
        break;
      }
      case "engine": {
        osc("sawtooth", 55, 0, 0.6, 0.04);
        osc("sawtooth", 82, 0.05, 0.5, 0.03);
        break;
      }
      default: return null;
    }

    return { stop: () => nodes.forEach((n) => { try { n.stop(); } catch {} }) };
  }
}

let inst: SoundPlayer | null = null;
export function getSoundPlayer(): SoundPlayer {
  if (!inst) inst = new SoundPlayer();
  return inst;
}
