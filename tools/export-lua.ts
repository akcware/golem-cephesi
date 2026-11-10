// Denge değerlerini (shared/balance.ts) mobil sürüm için Lua'ya aktarır.
// Denge tek yerden yönetilir: balance.ts'yi değiştirdikten sonra bunu çalıştır.
//
//   npx tsx tools/export-lua.ts
//
// Çıktı: mobile/shared/balance_data.lua (yardımcı fonksiyonlar mobile/shared/balance.lua'da).
//
// Görünen metinler artık shared/i18n'de. Mobil istemci henüz çok dilli değil ve adları veri
// tablolarında (TIERS[i].name, CARDS[i].desc, TUTORIAL[i].title …) bekliyor; bu yüzden metinler
// Türkçe olarak eski yerlerine, eski sırayla geri konur. Mobil i18n'e geçince bu katman kalkar.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from '../shared/balance';
import * as P from '../shared/protocol';
import { TIPS, TUTORIAL, TUT_REVEAL } from '../shared/tutorial';
import * as I from '../shared/i18n';
import { toLua } from './lua';

const L: I.Lang = 'tr';
/** Mobil arayüzdeki renk/etiket tabloları kart kategorilerini Türkçe anahtarla arar. */
const LEGACY_CAT: Record<B.CardCat, string> = { army: 'ordu', economy: 'ekonomi', defense: 'savunma', power: 'güç' };

/** obj'nin anahtar sırasını koruyarak `after` anahtarından sonra (after yoksa başa) yeni alanlar ekler. */
function insert<T extends object>(obj: T, after: string | null, fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = after === null ? { ...fields } : {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v;
    if (k === after) Object.assign(out, fields);
  }
  return out;
}

function legacyTier(tier: B.TierDef) {
  const t = tier.index;
  const units: Record<string, unknown> = {};
  for (const arch of B.ARCHES) {
    const u = tier.units[arch];
    units[arch] = insert({ ...u, ability: { name: I.abilityName(t, arch, L), desc: I.abilityDesc(t, arch, L), p: u.ability.p } }, 'radius', {
      name: I.unitName(t, arch, L),
    });
  }
  return insert(
    {
      ...tier,
      units,
      special: { name: I.specialName(t, L), ...tier.special },
      turrets: tier.turrets.map((d) => ({
        name: I.turretName(t, d.grade, L),
        ...insert(insert(d, 'grade', { label: I.gradeName(d.grade, L) }), 'kind', { desc: I.turretDesc(d, L) }),
      })),
    },
    'key',
    { name: I.tierName(t, L) },
  );
}

const balance: Record<string, unknown> = {};
for (const [k, v] of Object.entries(B)) if (typeof v !== 'function') balance[k] = v;
balance.TIERS = B.TIERS.map(legacyTier);
balance.TURRET_GRADES = B.TURRET_GRADES.map((g, i) => ({ label: I.gradeName(i, L), ...g }));
balance.ARCH_LABEL = Object.fromEntries(B.ARCHES.map((a) => [a, I.archName(a, L)]));
balance.CARDS = B.CARDS.map((c) => insert(insert({ ...c, cat: LEGACY_CAT[c.cat] }, 'id', { name: I.cardName(c.id, L) }), 'cat', { desc: I.cardDesc(c.id, L) }));
balance.SOURCE_KINDS = Object.fromEntries(
  B.SOURCE_KIND_LIST.map((k) => [k, { name: I.sourceName(k, L), icon: B.SOURCE_KINDS[k].icon, desc: I.sourceDesc(k, L) }]),
);
balance.CMD_SKILL_NAME = I.t('cmd.skill', undefined, L);
balance.CMD_NAMES = B.TIERS.map((_, i) => I.cmdName(i, L));

// modül dışa aktarımları alfabetik sıralıdır; eklenen alanlar da aynı sıraya girsin
const data: Record<string, unknown> = {};
for (const k of Object.keys(balance).sort()) data[k] = balance[k];
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
const tutorial = TUTORIAL.map((s) => ({
  id: s.id,
  title: I.tutTitle(s.id, L),
  text: I.tutText(s.id, L),
  target: s.target,
  ...(s.button ? { button: I.tutButton(s.id, L) } : {}),
}));
const tips = TIPS.map((s) => ({ id: s.id, text: I.tipText(s.id, L), target: s.target }));
writeFileSync(
  join(dir, 'tutorial_data.lua'),
  `-- Bu dosya tools/export-lua.ts tarafından shared/tutorial.ts'den üretilir, elle değiştirme.
-- TUTORIAL[1] = sunucudaki 0. adım (state.tut + 1).
return ${toLua({ TUTORIAL: tutorial, TUT_REVEAL, TIPS: tips })}
`,
);
console.log(`tutorial_data.lua yazıldı (${TUTORIAL.length} adım, ${TIPS.length} ipucu).`);
