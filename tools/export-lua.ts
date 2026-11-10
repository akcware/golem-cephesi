// Denge değerlerini (shared/balance.ts), eğitim adımlarını (shared/tutorial.ts) ve çevirileri
// (shared/i18n) mobil sürüm için Lua'ya aktarır. Hepsi tek yerden yönetilir: bunlardan birini
// değiştirdikten sonra bunu çalıştır.
//
//   npx tsx tools/export-lua.ts
//
// Çıktı: mobile/shared/balance_data.lua, tutorial_data.lua, i18n_data.lua
// (yardımcı fonksiyonlar mobile/shared/balance.lua ve i18n.lua'da).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from '../shared/balance';
import * as P from '../shared/protocol';
import { TIPS, TUTORIAL, TUT_REVEAL } from '../shared/tutorial';
import { DECIMAL_COMMA, DICTS, LANG_NAMES, LANGS } from '../shared/i18n';
import { toLua } from './lua';

const HEADER = (src: string) => `-- Bu dosya tools/export-lua.ts tarafından ${src}'den üretilir, elle değiştirme.\n`;
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'mobile', 'shared');

// denge değerleri (modül dışa aktarımları alfabetik sıralı gelir)
const data: Record<string, unknown> = {};
for (const [k, v] of Object.entries(B)) if (typeof v !== 'function') data[k] = v;
// protokoldeki durum bitleri
for (const [k, v] of Object.entries(P)) if (typeof v === 'number') data[k] = v;
writeFileSync(
  join(dir, 'balance_data.lua'),
  `${HEADER('shared/balance.ts')}-- Diziler 1'den başlar (TIERS[1] = Ahşap).\nreturn ${toLua(data)}\n`,
);
console.log(`balance_data.lua yazıldı (${Object.keys(data).length} değer).`);

// yeni oyuncu rehberi
writeFileSync(
  join(dir, 'tutorial_data.lua'),
  `${HEADER('shared/tutorial.ts')}-- TUTORIAL[1] = sunucudaki 0. adım (state.tut + 1). Metinler i18n_data.lua'da (tut.<id>.title …).\nreturn ${toLua({ TUTORIAL, TUT_REVEAL, TIPS })}\n`,
);
console.log(`tutorial_data.lua yazıldı (${TUTORIAL.length} adım, ${TIPS.length} ipucu).`);

// çeviriler: her dil düz bir tablo (anahtar → metin)
const i18n = { LANGS, NAMES: LANG_NAMES, DECIMAL_COMMA: [...DECIMAL_COMMA], ...DICTS };
writeFileSync(join(dir, 'i18n_data.lua'), `${HEADER('shared/i18n')}return ${toLua(i18n)}\n`);
console.log(`i18n_data.lua yazıldı (${LANGS.length} dil, ${Object.keys(DICTS.en).length} anahtar).`);
