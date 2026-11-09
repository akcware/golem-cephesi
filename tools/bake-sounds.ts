// Web'deki ses tariflerini (client/sounds.ts) mobil sürüm için WAV dosyalarına çevirir.
// WebAudio'daki osilatör, üstel zarf ve alçak geçiren süzgeç aynı formüllerle hesaplanır.
//
//   npx tsx tools/bake-sounds.ts
//
// Çıktı: mobile/assets/sounds/*.wav, mobile/main/sfx.go (ses bileşenleri), mobile/shared/sound_data.lua
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASTER_GAIN, SOUNDS, THROTTLE_GROUP, THROTTLE_MS, type NoiseVoice, type ToneVoice } from '../client/sounds';
import { toLua } from './lua';

const RATE = 44100;
/** Telefon hoparlörleri bilgisayardan kısık; mobil dosyalar bu kadar güçlendirilir (tepe ~0.3, kırpılmaz). */
const MOBILE_BOOST = 2.5;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'mobile');
const OUT = join(ROOT, 'assets', 'sounds');

/** WebAudio exponentialRampToValueAtTime ile aynı eğri. */
const expRamp = (v0: number, v1: number, k: number) => v0 * Math.pow(v1 / v0, Math.min(1, Math.max(0, k)));

function renderTone(buf: Float32Array, v: ToneVoice) {
  const start = Math.round((v.delay ?? 0) * RATE);
  const n = Math.round((v.dur + 0.02) * RATE);
  let phase = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE;
    const f = v.f2 ? expRamp(v.f, Math.max(20, v.f2), t / v.dur) : v.f;
    phase = (phase + f / RATE) % 1;
    let s: number;
    switch (v.type) {
      case 'sine':
        s = Math.sin(phase * Math.PI * 2);
        break;
      case 'square':
        s = phase < 0.5 ? 1 : -1;
        break;
      case 'triangle':
        s = 1 - 4 * Math.abs(phase - 0.5);
        break;
      default:
        s = 2 * phase - 1;
    }
    const g = t < 0.01 ? expRamp(0.0001, v.vol, t / 0.01) : t < v.dur ? expRamp(v.vol, 0.0001, (t - 0.01) / (v.dur - 0.01)) : 0.0001;
    buf[start + i] += s * g;
  }
}

/** Basit tohumlu rastgele (her üretimde aynı ses). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderNoise(buf: Float32Array, v: NoiseVoice, seed: number) {
  const start = Math.round((v.delay ?? 0) * RATE);
  const n = Math.round((v.dur + 0.02) * RATE);
  // RBJ alçak geçiren biquad (Q ≈ 0.707)
  const w0 = (2 * Math.PI * v.freq) / RATE;
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const cos = Math.cos(w0);
  const a0 = 1 + alpha;
  const b0 = (1 - cos) / 2 / a0;
  const b1 = (1 - cos) / a0;
  const b2 = b0;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  const rand = rng(seed);
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE;
    const x = rand() * 2 - 1;
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    const g = t < v.dur ? expRamp(v.vol, 0.0001, t / v.dur) : 0.0001;
    buf[start + i] += y * g;
  }
}

function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const names = Object.keys(SOUNDS);
const comps: string[] = [];
let bytes = 0;
names.forEach((name, idx) => {
  const voices = SOUNDS[name];
  const len = Math.max(...voices.map((v) => (v.delay ?? 0) + v.dur + 0.02));
  const buf = new Float32Array(Math.ceil(len * RATE));
  voices.forEach((v, j) => (v.kind === 'tone' ? renderTone(buf, v) : renderNoise(buf, v, idx * 97 + j)));
  for (let i = 0; i < buf.length; i++) buf[i] *= MASTER_GAIN * MOBILE_BOOST;
  const file = wav(buf);
  bytes += file.length;
  writeFileSync(join(OUT, `${name}.wav`), file);
  const data = `sound: "/assets/sounds/${name}.wav"\nlooping: 0\ngroup: "sfx"\ngain: 1.0\n`;
  comps.push(`embedded_components {\n  id: ${JSON.stringify(name)}\n  type: "sound"\n  data: ${JSON.stringify(data)}\n}\n`);
});

writeFileSync(join(ROOT, 'main', 'sfx.go'), comps.join(''));
writeFileSync(
  join(ROOT, 'shared', 'sound_data.lua'),
  `-- Bu dosya tools/bake-sounds.ts tarafından client/sounds.ts'den üretilir, elle değiştirme.\nreturn ${toLua({ NAMES: names, THROTTLE_MS, THROTTLE_GROUP })}\n`,
);
console.log(`${names.length} ses (${(bytes / 1024).toFixed(0)} KB), sfx.go ve sound_data.lua yazıldı.`);
