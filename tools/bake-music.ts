// Web'deki müzik listesini (client/tracks.ts) mobil sürüme taşır: OGG dosyalarını public/music/'ten
// mobile/assets/music/'e kopyalar, ses bileşenlerini ve Lua verisini yazar.
//
//   npx tsx tools/bake-music.ts
//
// Çıktı: mobile/assets/music/*.ogg (depoya girmez, public/music/ ile aynı), mobile/main/music.go,
// mobile/shared/music_data.lua. build-web.sh ve build-android.sh derlemeden önce bunu çalıştırır.
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DUCK, FADE_S, MUSIC_GAIN, TENSION_HP, TRACKS, type TrackId } from '../client/tracks';
import { toLua } from './lua';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(REPO, 'public', 'music');
const ROOT = join(REPO, 'mobile');
const OUT = join(ROOT, 'assets', 'music');
/** Telefon hoparlörleri kısık; efekt sesleri gibi (bake-sounds.ts) müzik de güçlendirilir. Defold'da grup kazancı en çok 1 olur. */
const MOBILE_BOOST = 2.5;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const comps: string[] = [];
const data: Record<string, { loop: boolean; vol: number }> = {};
let bytes = 0;
for (const [id, t] of Object.entries(TRACKS) as [TrackId, NonNullable<(typeof TRACKS)[TrackId]>][]) {
  // Defold OGG Vorbis ve WAV çalar; mp3 çalamaz
  if (!t.formats.includes('ogg')) throw new Error(`${id}: mobil için ${t.file}.ogg gerekli`);
  const from = join(SRC, `${t.file}.ogg`);
  if (!existsSync(from)) throw new Error(`${id}: ${from} yok`);
  copyFileSync(from, join(OUT, `${t.file}.ogg`));
  bytes += statSync(from).size;
  data[id] = { loop: t.loop, vol: t.vol };
  const desc = `sound: "/assets/music/${t.file}.ogg"\nlooping: ${t.loop ? 1 : 0}\ngroup: "music"\ngain: 1.0\n`;
  comps.push(`embedded_components {\n  id: ${JSON.stringify(id)}\n  type: "sound"\n  data: ${JSON.stringify(desc)}\n}\n`);
}

writeFileSync(join(ROOT, 'main', 'music.go'), comps.join(''));
writeFileSync(
  join(ROOT, 'shared', 'music_data.lua'),
  `-- Bu dosya tools/bake-music.ts tarafından client/tracks.ts'den üretilir, elle değiştirme.\nreturn ${toLua({ TRACKS: data, MUSIC_GAIN: Math.min(1, MUSIC_GAIN * MOBILE_BOOST), FADE_S, DUCK, TENSION_HP })}\n`,
);
console.log(`${comps.length} parça (${(bytes / 1024 / 1024).toFixed(1)} MB), music.go ve music_data.lua yazıldı.`);
