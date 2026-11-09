// Ses efektleri WebAudio ile anında sentezleniyor (ses dosyası yok).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
try {
  muted = localStorage.getItem('gc_muted') === '1';
} catch {
  /* depolama yoksa sorun değil */
}
const last: Record<string, number> = {};

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.32;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function throttle(name: string, ms: number): boolean {
  const now = performance.now();
  if (last[name] && now - last[name] < ms) return false;
  last[name] = now;
  return true;
}

interface ToneOpts {
  f: number;
  f2?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  delay?: number;
}

function tone({ f, f2, dur, type = 'square', vol = 0.3, delay = 0 }: ToneOpts) {
  const a = ac();
  if (!a || !master || muted) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

let noiseBuf: AudioBuffer | null = null;
function noise(dur: number, vol = 0.3, freq = 1200, delay = 0) {
  const a = ac();
  if (!a || !master || muted) return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = a.currentTime + delay;
  const s = a.createBufferSource();
  s.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t0);
  s.stop(t0 + dur + 0.02);
}

export const sfx = {
  isMuted: () => muted,
  toggleMute(): boolean {
    muted = !muted;
    try {
      localStorage.setItem('gc_muted', muted ? '1' : '0');
    } catch {
      /* yoksay */
    }
    ac();
    if (master) master.gain.value = muted ? 0 : 0.32;
    return muted;
  },
  unlock() {
    ac();
  },
  click() {
    tone({ f: 660, f2: 880, dur: 0.06, type: 'triangle', vol: 0.15 });
  },
  deny() {
    tone({ f: 200, f2: 140, dur: 0.12, type: 'square', vol: 0.1 });
  },
  hit(heavy = false) {
    if (!throttle('hit', 45)) return;
    noise(heavy ? 0.14 : 0.07, heavy ? 0.28 : 0.16, heavy ? 600 : 1800);
    if (heavy) tone({ f: 120, f2: 60, dur: 0.12, type: 'sine', vol: 0.25 });
  },
  shoot(tier: number) {
    if (!throttle('shoot', 60)) return;
    if (tier === 2) noise(0.18, 0.2, 700);
    else if (tier >= 3) tone({ f: 900, f2: 400, dur: 0.12, type: 'sawtooth', vol: 0.07 });
    else tone({ f: 500, f2: 250, dur: 0.07, type: 'triangle', vol: 0.1 });
  },
  death() {
    if (!throttle('death', 70)) return;
    noise(0.22, 0.2, 900);
    tone({ f: 220, f2: 70, dur: 0.22, type: 'triangle', vol: 0.12 });
  },
  spawn() {
    if (!throttle('spawn', 120)) return;
    tone({ f: 330, f2: 520, dur: 0.08, type: 'triangle', vol: 0.08 });
  },
  coin() {
    if (!throttle('coin', 90)) return;
    tone({ f: 1320, dur: 0.05, type: 'square', vol: 0.05 });
    tone({ f: 1760, dur: 0.07, type: 'square', vol: 0.05, delay: 0.05 });
  },
  base() {
    if (!throttle('base', 160)) return;
    noise(0.2, 0.22, 400);
  },
  boom() {
    if (!throttle('boom', 50)) return;
    noise(0.4, 0.35, 500);
    tone({ f: 90, f2: 40, dur: 0.35, type: 'sine', vol: 0.35 });
  },
  special() {
    tone({ f: 300, f2: 1200, dur: 0.5, type: 'sawtooth', vol: 0.08 });
  },
  evolve() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.22, type: 'triangle', vol: 0.18, delay: i * 0.09 }));
  },
  countdown(final = false) {
    tone({ f: final ? 1046 : 523, dur: final ? 0.35 : 0.15, type: 'triangle', vol: 0.2 });
  },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.3, type: 'triangle', vol: 0.2, delay: i * 0.12 }));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone({ f, dur: 0.35, type: 'triangle', vol: 0.18, delay: i * 0.16 }));
  },
};
