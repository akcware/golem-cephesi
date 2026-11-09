// Ses efektleri WebAudio ile anında sentezleniyor (ses dosyası yok). Tarifler sounds.ts'te;
// mobil sürüm aynı tariflerden üretilmiş WAV dosyalarını çalar.
import { MASTER_GAIN, SOUNDS, THROTTLE_GROUP, THROTTLE_MS, type NoiseVoice, type ToneVoice, shootSound } from './sounds';

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
      master.gain.value = muted ? 0 : MASTER_GAIN;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone({ f, f2, dur, type, vol, delay = 0 }: ToneVoice) {
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
function noise({ dur, vol, freq, delay = 0 }: NoiseVoice) {
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
  const fl = a.createBiquadFilter();
  fl.type = 'lowpass';
  fl.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(fl).connect(g).connect(master);
  s.start(t0);
  s.stop(t0 + dur + 0.02);
}

/** Tarifi çalar (kısıtlama grubundaki son çalmadan yeterince zaman geçtiyse). */
function play(name: string) {
  const group = THROTTLE_GROUP[name];
  if (group) {
    const now = performance.now();
    if (last[group] && now - last[group] < THROTTLE_MS[group]) return;
    last[group] = now;
  }
  for (const v of SOUNDS[name] ?? []) {
    if (v.kind === 'tone') tone(v);
    else noise(v);
  }
}

/** Müzik de aynı ses bağlamını kullanır (tarayıcılar ilk dokunuşa kadar sesi askıda tutar). */
export const audioContext = ac;

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
    if (master) master.gain.value = muted ? 0 : MASTER_GAIN;
    return muted;
  },
  unlock() {
    ac();
  },
  click: () => play('click'),
  deny: () => play('deny'),
  hit: (heavy = false) => play(heavy ? 'hit_heavy' : 'hit'),
  shoot: (tier: number) => play(shootSound(tier)),
  death: () => play('death'),
  spawn: () => play('spawn'),
  coin: () => play('coin'),
  base: () => play('base'),
  boom: () => play('boom'),
  special: () => play('special'),
  evolve: () => play('evolve'),
  countdown: (final = false) => play(final ? 'countdown_final' : 'countdown'),
  win: () => play('win'),
  lose: () => play('lose'),
};
