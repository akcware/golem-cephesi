// Ses efektlerinin tarifleri (dosya yok, sentezlenir). Web bunları WebAudio ile anında çalar (sfx.ts);
// mobil sürüm için tools/bake-sounds.ts aynı tariflerden WAV dosyası üretir — iki sürüm aynı duyulur.

export type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth';

/** Frekansı f'ten f2'ye kayan, kısa bir ton (sesi 10 ms'de açılır, süre sonunda söner). */
export interface ToneVoice {
  kind: 'tone';
  f: number;
  f2?: number;
  dur: number;
  type: Wave;
  vol: number;
  delay?: number;
}

/** Alçak geçiren süzgeçten geçmiş beyaz gürültü (vuruş, patlama). */
export interface NoiseVoice {
  kind: 'noise';
  dur: number;
  vol: number;
  freq: number;
  delay?: number;
}

export type Voice = ToneVoice | NoiseVoice;

const tone = (f: number, f2: number | undefined, dur: number, type: Wave, vol: number, delay = 0): ToneVoice => ({ kind: 'tone', f, f2, dur, type, vol, delay });
const noise = (dur: number, vol: number, freq: number, delay = 0): NoiseVoice => ({ kind: 'noise', dur, vol, freq, delay });

/** Ana ses düzeyi (tüm seslerin çarpanı). */
export const MASTER_GAIN = 0.32;

export const SOUNDS: Record<string, Voice[]> = {
  click: [tone(660, 880, 0.06, 'triangle', 0.15)],
  deny: [tone(200, 140, 0.12, 'square', 0.1)],
  hit: [noise(0.07, 0.16, 1800)],
  hit_heavy: [noise(0.14, 0.28, 600), tone(120, 60, 0.12, 'sine', 0.25)],
  /** Ahşap / bronz / eter dışı menzilli atış */
  shoot_a: [tone(500, 250, 0.07, 'triangle', 0.1)],
  /** Demir çağı: top atışı */
  shoot_b: [noise(0.18, 0.2, 700)],
  /** Kristal ve eter: büyü atışı */
  shoot_c: [tone(900, 400, 0.12, 'sawtooth', 0.07)],
  death: [noise(0.22, 0.2, 900), tone(220, 70, 0.22, 'triangle', 0.12)],
  spawn: [tone(330, 520, 0.08, 'triangle', 0.08)],
  coin: [tone(1320, undefined, 0.05, 'square', 0.05), tone(1760, undefined, 0.07, 'square', 0.05, 0.05)],
  base: [noise(0.2, 0.22, 400)],
  boom: [noise(0.4, 0.35, 500), tone(90, 40, 0.35, 'sine', 0.35)],
  special: [tone(300, 1200, 0.5, 'sawtooth', 0.08)],
  evolve: [523, 659, 784, 1047].map((f, i) => tone(f, undefined, 0.22, 'triangle', 0.18, i * 0.09)),
  countdown: [tone(523, undefined, 0.15, 'triangle', 0.2)],
  countdown_final: [tone(1046, undefined, 0.35, 'triangle', 0.2)],
  win: [523, 659, 784, 1047, 1319].map((f, i) => tone(f, undefined, 0.3, 'triangle', 0.2, i * 0.12)),
  lose: [392, 330, 262, 196].map((f, i) => tone(f, undefined, 0.35, 'triangle', 0.18, i * 0.16)),
};

/** Aynı gruptaki bir ses bu kadar ms içinde tekrar çalmaz (kalabalık savaşta kulak yorulmasın). */
export const THROTTLE_MS: Record<string, number> = {
  hit: 45,
  shoot: 60,
  death: 70,
  spawn: 120,
  coin: 90,
  base: 160,
  boom: 50,
};
/** Sesin kısıtlama grubu (vuruşlar ve atışlar kendi aralarında tek grup). */
export const THROTTLE_GROUP: Record<string, string> = {
  hit: 'hit',
  hit_heavy: 'hit',
  shoot_a: 'shoot',
  shoot_b: 'shoot',
  shoot_c: 'shoot',
  death: 'death',
  spawn: 'spawn',
  coin: 'coin',
  base: 'base',
  boom: 'boom',
};

/** Kademeye göre atış sesi. */
export function shootSound(tier: number): string {
  return tier === 2 ? 'shoot_b' : tier >= 3 ? 'shoot_c' : 'shoot_a';
}
