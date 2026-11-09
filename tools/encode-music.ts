// İndirilen ham müzik dosyalarını (WAV/OGG) oyuna uygun hâle getirir: baştaki/sondaki sessizliği
// kırpar, ses yüksekliğini ölçer, OGG (mobil + çoğu tarayıcı) ve
// MP3 (Safari yedeği) olarak public/music/ altına yazar.
//
//   npx tsx tools/encode-music.ts <ham dosyaların klasörü> [--analyze]
//
// Klasörde client/tracks.ts'deki her parça için <id>.wav ya da <id>.ogg beklenir (ör. battle.wav).
// Çıktının sonunda her parça için önerilen "vol" değeri yazılır (parçalar eşit yükseklikte duyulsun).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMp3Encoder, createOggEncoder } from 'wasm-media-encoders';
import { OggVorbisDecoder } from '@wasm-audio-decoders/ogg-vorbis';
import { TRACKS, type TrackId } from '../client/tracks';

interface Pcm {
  rate: number;
  ch: Float32Array[];
}

/** Döngülerin yükseklik hedefi (yaklaşık LUFS); motifler biraz daha öne çıkar. */
const TARGET_DB = -20;
const STINGER_BOOST_DB = 2;
const OGG_QUALITY = 2; // libvorbis q2 ≈ 96 kbps
const MP3_VBR = 6; // LAME V6 ≈ 115 kbps

function readWav(buf: Buffer): Pcm {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('WAV değil');
  let fmt = 0;
  let channels = 0;
  let rate = 0;
  let bits = 0;
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    const body = off + 8;
    if (id === 'fmt ') {
      fmt = buf.readUInt16LE(body);
      channels = buf.readUInt16LE(body + 2);
      rate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
      if (fmt === 0xfffe) fmt = buf.readUInt16LE(body + 24); // WAVE_FORMAT_EXTENSIBLE → alt biçim
    } else if (id === 'data') {
      const bytes = bits / 8;
      const end = Math.min(buf.length, body + size);
      const n = Math.floor((end - body) / (bytes * channels));
      const ch = Array.from({ length: channels }, () => new Float32Array(n));
      for (let i = 0; i < n; i++) {
        for (let c = 0; c < channels; c++) {
          const p = body + (i * channels + c) * bytes;
          let v: number;
          if (fmt === 3) v = bits === 64 ? buf.readDoubleLE(p) : buf.readFloatLE(p);
          else if (bits === 16) v = buf.readInt16LE(p) / 32768;
          else if (bits === 24) v = buf.readIntLE(p, 3) / 8388608;
          else if (bits === 32) v = buf.readInt32LE(p) / 2147483648;
          else if (bits === 8) v = (buf[p] - 128) / 128;
          else throw new Error(`${bits} bit desteklenmiyor`);
          ch[c][i] = v;
        }
      }
      return { rate, ch };
    }
    off = body + size + (size & 1);
  }
  throw new Error('WAV veri bölümü yok');
}

async function readOgg(buf: Buffer): Promise<Pcm> {
  const dec = new OggVorbisDecoder();
  await dec.ready;
  const r = await dec.decodeFile(new Uint8Array(buf));
  dec.free();
  return { rate: r.sampleRate, ch: r.channelData.map((c) => c.slice(0, r.samplesDecoded)) };
}

const db = (x: number) => 20 * Math.log10(Math.max(1e-9, x));

/** Kabaca LUFS: 400 ms blokların RMS'i, sessiz bloklar elenerek (EBU R128 kapılamasına benzer, K süzgeci yok). */
function loudness(p: Pcm): number {
  const block = Math.round(p.rate * 0.4);
  const ms: number[] = [];
  const n = p.ch[0].length;
  for (let s = 0; s + block <= n; s += block / 4) {
    let sum = 0;
    for (const c of p.ch) for (let i = s; i < s + block; i++) sum += c[i] * c[i];
    ms.push(sum / (block * p.ch.length));
  }
  const abs = ms.filter((m) => db(Math.sqrt(m)) > -70);
  if (!abs.length) return -99;
  const mean = abs.reduce((a, b) => a + b, 0) / abs.length;
  const rel = abs.filter((m) => m > mean / 10);
  return db(Math.sqrt(rel.reduce((a, b) => a + b, 0) / rel.length));
}

function peak(p: Pcm): number {
  let m = 0;
  for (const c of p.ch) for (let i = 0; i < c.length; i++) m = Math.max(m, Math.abs(c[i]));
  return m;
}

/** Baştaki ve sondaki neredeyse sessiz bölümü bulur (-60 dBFS altı). */
function silentEdges(p: Pcm): [number, number] {
  const th = 0.001;
  const n = p.ch[0].length;
  const loud = (i: number) => p.ch.some((c) => Math.abs(c[i]) > th);
  let a = 0;
  while (a < n && !loud(a)) a++;
  let b = n - 1;
  while (b > a && !loud(b)) b--;
  return [a, b + 1];
}

function slice(p: Pcm, a: number, b: number): Pcm {
  return { rate: p.rate, ch: p.ch.map((c) => c.slice(a, b)) };
}

function envelope(p: Pcm, step = 0.5): string {
  const w = Math.round(p.rate * step);
  const out: string[] = [];
  for (let s = 0; s < p.ch[0].length; s += w) {
    let sum = 0;
    let k = 0;
    for (const c of p.ch) for (let i = s; i < Math.min(c.length, s + w); i++, k++) sum += c[i] * c[i];
    out.push(db(Math.sqrt(sum / Math.max(1, k))).toFixed(0));
  }
  return out.join(' ');
}

/** Döngü dikişi: son 50 ms ile ilk 50 ms'nin yükseklik farkı ve sınırdaki örnek sıçraması. */
function seam(p: Pcm) {
  const w = Math.round(p.rate * 0.05);
  const n = p.ch[0].length;
  const rms = (a: number, b: number) => {
    let s = 0;
    for (const c of p.ch) for (let i = a; i < b; i++) s += c[i] * c[i];
    return Math.sqrt(s / ((b - a) * p.ch.length));
  };
  const jump = Math.max(...p.ch.map((c) => Math.abs(c[n - 1] - c[0])));
  return { endDb: db(rms(n - w, n)), startDb: db(rms(0, w)), jump };
}

async function encode(p: Pcm, kind: 'ogg' | 'mp3'): Promise<Uint8Array> {
  const channels = Math.min(2, p.ch.length) as 1 | 2;
  const enc = kind === 'ogg' ? await createOggEncoder() : await createMp3Encoder();
  if (kind === 'ogg') (enc as Awaited<ReturnType<typeof createOggEncoder>>).configure({ channels, sampleRate: p.rate, vbrQuality: OGG_QUALITY });
  else (enc as Awaited<ReturnType<typeof createMp3Encoder>>).configure({ channels, sampleRate: p.rate, vbrQuality: MP3_VBR });
  const parts: Uint8Array[] = [];
  const CH = 1 << 16;
  const src = p.ch.slice(0, channels);
  for (let s = 0; s < src[0].length; s += CH) parts.push(enc.encode(src.map((c) => c.subarray(s, s + CH))).slice());
  parts.push(enc.finalize().slice());
  const total = parts.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const b of parts) {
    out.set(b, o);
    o += b.length;
  }
  return out;
}

const srcDir = process.argv[2];
const analyzeOnly = process.argv.includes('--analyze');
if (!srcDir) throw new Error('kullanım: npx tsx tools/encode-music.ts <klasör> [--analyze]');
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'music');
mkdirSync(OUT, { recursive: true });

for (const [id, t] of Object.entries(TRACKS) as [TrackId, NonNullable<(typeof TRACKS)[TrackId]>][]) {
  const wav = join(srcDir, `${id}.wav`);
  const ogg = join(srcDir, `${id}.ogg`);
  let p: Pcm;
  if (existsSync(wav)) p = readWav(readFileSync(wav));
  else if (existsSync(ogg)) p = await readOgg(readFileSync(ogg));
  else throw new Error(`${id}: ${srcDir} içinde ${id}.wav ya da ${id}.ogg yok`);
  const dur0 = p.ch[0].length / p.rate;
  // döngülerde sondaki sessizlik boşluk yaratır; baştaki sessizlik geç başlama
  const [a, b] = silentEdges(p);
  p = slice(p, a, b);
  const L = loudness(p);
  const pk = peak(p);
  const target = TARGET_DB + (t.loop ? 0 : STINGER_BOOST_DB);
  const vol = Math.min(1, 10 ** ((target - L) / 20));
  const sm = seam(p);
  console.log(
    `${id}: ${p.ch.length} kanal ${p.rate} Hz, ${dur0.toFixed(1)} sn → ${(p.ch[0].length / p.rate).toFixed(1)} sn ` +
      `(kırpılan baş ${(a / p.rate).toFixed(2)} sn, son ${(dur0 - b / p.rate).toFixed(2)} sn), ` +
      `yükseklik ${L.toFixed(1)} dB, tepe ${db(pk).toFixed(1)} dB, önerilen vol ${vol.toFixed(2)}`,
  );
  if (t.loop) console.log(`   dikiş: son ${sm.endDb.toFixed(1)} dB, baş ${sm.startDb.toFixed(1)} dB, sıçrama ${sm.jump.toFixed(3)}`);
  else console.log(`   zarf (0.5 sn): ${envelope(p)}`);
  if (analyzeOnly) continue;
  for (const kind of t.formats) {
    const data = await encode(p, kind);
    writeFileSync(join(OUT, `${t.file}.${kind}`), data);
    console.log(`   ${t.file}.${kind}: ${(data.length / 1024).toFixed(0)} KB`);
  }
}
