// Çeviri denetimi: her dilde, oyunun id'lerinden kurulan tüm anahtarlar var mı; yer tutucular
// ({n}, {tier} …) ve HTML etiketleri İngilizce kaynakla aynı mı?
//
//   npm run i18n:check
//
// (Statik anahtarların eksiksizliğini tip denetimi zaten yakalar; bu araç id'lerden kurulan
// dinamik anahtarlara ve metnin içeriğine bakar.)
import * as B from '../shared/balance';
import { BOT_KINDS, DICTS, LANGS, type MsgKey } from '../shared/i18n';
import { en } from '../shared/i18n/en';
import { TIPS, TUTORIAL } from '../shared/tutorial';

const dynamic: string[] = [];
for (const tier of B.TIERS) {
  dynamic.push(`tier.${tier.key}`, `special.${tier.key}`, `cmd.${tier.key}`);
  for (const arch of B.ARCHES) dynamic.push(`unit.${tier.key}.${arch}`, `ability.${tier.key}.${arch}`, `ability.${tier.key}.${arch}.desc`);
  for (let g = 0; g < B.TURRET_GRADE_COUNT; g++) dynamic.push(`turret.${tier.key}.${g}`);
}
for (const arch of B.ARCHES) dynamic.push(`arch.${arch}`);
for (let g = 0; g < B.TURRET_GRADE_COUNT; g++) dynamic.push(`grade.${g}`);
for (const kind of new Set(B.TIERS.flatMap((t) => t.turrets.map((d) => d.kind)))) dynamic.push(`turretDesc.${kind}`);
for (const c of B.CARDS) dynamic.push(`card.${c.id}`, `card.${c.id}.desc`, `cardCat.${c.cat}`);
for (const k of B.SOURCE_KIND_LIST) dynamic.push(`source.${k}`, `source.${k}.desc`);
for (const s of TUTORIAL) {
  dynamic.push(`tut.${s.id}.title`, `tut.${s.id}.text`);
  if (s.button) dynamic.push(`tut.${s.id}.button`);
}
for (const tip of TIPS) dynamic.push(`tip.${tip.id}`);
for (const k of BOT_KINDS) dynamic.push(`bot.${k}`);

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const tags = (s: string) => [...s.matchAll(/<\/?(\w+)/g)].map((m) => m[0]).sort().join(',');

let errors = 0;
const fail = (msg: string) => {
  errors++;
  console.log(`  ✗ ${msg}`);
};

for (const key of dynamic) if (!(key in en)) fail(`en: "${key}" anahtarı yok (oyun verisinde kullanılıyor)`);

for (const lang of LANGS) {
  const dict = DICTS[lang];
  for (const key of Object.keys(en) as MsgKey[]) {
    const v = dict[key];
    if (typeof v !== 'string' || !v.trim()) {
      fail(`${lang}: "${key}" boş ya da yok`);
      continue;
    }
    if (placeholders(v) !== placeholders(en[key])) fail(`${lang}: "${key}" yer tutucuları farklı: {${placeholders(v)}} ≠ {${placeholders(en[key])}}`);
    if (tags(v) !== tags(en[key])) fail(`${lang}: "${key}" HTML etiketleri farklı`);
  }
}

console.log(errors ? `\n${errors} sorun bulundu.` : `Tamam: ${LANGS.length} dil, ${Object.keys(en).length} anahtar (${dynamic.length} tanesi oyun verisinden).`);
process.exit(errors ? 1 : 0);
