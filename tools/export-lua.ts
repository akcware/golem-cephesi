// Denge değerlerini (shared/balance.ts) mobil sürüm için Lua'ya aktarır.
// Denge tek yerden yönetilir: balance.ts'yi değiştirdikten sonra bunu çalıştır.
//
//   npx tsx tools/export-lua.ts
//
// Çıktı: mobile/shared/balance_data.lua (yardımcı fonksiyonlar mobile/shared/balance.lua'da).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from '../shared/balance';
import * as P from '../shared/protocol';
import { TIPS, TUTORIAL, TUT_REVEAL } from '../shared/tutorial';
import { toLua } from './lua';

const data: Record<string, unknown> = {};
for (const [k, v] of Object.entries(B)) if (typeof v !== 'function') data[k] = v;
// protokoldeki durum bitleri
for (const [k, v] of Object.entries(P)) if (typeof v === 'number') data[k] = v;

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'mobile', 'shared');
const out = join(dir, 'balance_data.lua');
writeFileSync(
  out,
  `-- Bu dosya tools/export-lua.ts tarafından shared/balance.ts'den üretilir, elle değiştirme.\n-- Diziler 1'den başlar (TIERS[1] = Ahşap).\nreturn ${toLua(data)}\n`,
);
console.log(`balance_data.lua yazıldı (${Object.keys(data).length} değer).`);

// yeni oyuncu rehberi (shared/tutorial.ts)
writeFileSync(
  join(dir, 'tutorial_data.lua'),
  `-- Bu dosya tools/export-lua.ts tarafından shared/tutorial.ts'den üretilir, elle değiştirme.
-- TUTORIAL[1] = sunucudaki 0. adım (state.tut + 1).
return ${toLua({ TUTORIAL, TUT_REVEAL, TIPS })}
`,
);
console.log(`tutorial_data.lua yazıldı (${TUTORIAL.length} adım, ${TIPS.length} ipucu).`);
