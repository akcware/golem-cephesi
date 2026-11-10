// Hızlı eşleşmede kimse bulunamayınca maça giren rakiplerin kişilik havuzu.
// Her kişiliğin bir bölgesi (oyunun dillerinden biri), sabit bir adı, gücü ve oyun tarzı var; havuz tohumlu
// üretildiği için sunucu yeniden başlasa da aynı kalır (aynı "oyuncuyla" ileride yine karşılaşılabilir).
import { LANGS, type Lang } from '../shared/i18n';
import { gamertag, mulberry32, type Rng } from './names';

export interface Persona {
  id: number;
  /** Hangi dilden/ülkeden bir oyuncu gibi (adı buna göre) */
  region: Lang;
  name: string;
  /** Ortalama güç: 0 acemi … 1 usta. Maçtan maça biraz oynar (iyi/kötü gün). */
  skill: number;
  /** 0 temkinli (toplanıp bekler) … 1 saldırgan (erken ve sık hücum). */
  aggro: number;
  /** 0 ordu odaklı … 1 kule ve karakol sever. */
  builder: number;
  /** Ağır golem düşkünlüğü 0..1 */
  heavy: number;
  /** El hızı: 0 yavaş ve dalgın … 1 hızlı ve dikkatli. */
  pace: number;
  /** Ezilince oyunu bırakma eğilimi 0..1 */
  tilt: number;
  /** Rövanş kabul etme eğilimi 0..1 */
  social: number;
}

/** Her bölgeden bu kadar kişilik */
const PER_REGION = 120;
const POOL_SEED = 0x601e3;
/** Oyuncunun dilinden rakip gelme olasılığı; kalanı her bölgeden (karışık, uluslararası bir lobi gibi). */
const LOCAL_SHARE = 0.7;

function build(): Persona[] {
  const r: Rng = mulberry32(POOL_SEED);
  const out: Persona[] = [];
  const names = new Set<string>();
  for (const region of LANGS) {
    let made = 0;
    while (made < PER_REGION) {
      const name = gamertag(r, region);
      const key = name.toLowerCase();
      if (names.has(key)) continue;
      names.add(key);
      made++;
      out.push({
        id: out.length,
        region,
        name,
        skill: r(), // her güç düzeyinde yeterince kişi olsun (rakip güce göre seçilir)
        aggro: r(),
        builder: r(),
        heavy: r(),
        pace: r(),
        tilt: r() < 0.3 ? 0.4 + 0.6 * r() : 0.15 * r(),
        social: r(),
      });
    }
  }
  return out;
}

export const PERSONAS: readonly Persona[] = build();

/** Şu an bir maçta olan kişilikler (aynı kişi aynı anda iki odada görünmesin). */
const inUse = new Set<number>();

/**
 * Hedef güce yakın, şu an boşta olan bir kişilik seçer. avoid: oyuncunun kendi adı (aynı ad çıkmasın).
 * lang: oyuncunun dili; rakip çoğunlukla aynı dilden gelir. İşi bitince releasePersona() ile geri verilmeli.
 */
export function acquirePersona(target: number, avoid = '', lang?: Lang): Persona {
  const t = Math.max(0, Math.min(1, target));
  const bad = avoid.toLowerCase();
  const region = lang && Math.random() < LOCAL_SHARE ? lang : undefined;
  for (let w = 0.06; ; w *= 1.6) {
    const c = PERSONAS.filter(
      (p) => !inUse.has(p.id) && (!region || p.region === region) && Math.abs(p.skill - t) <= w && p.name.toLowerCase() !== bad,
    );
    if (c.length || w > 2) {
      const free = PERSONAS.filter((p) => !inUse.has(p.id));
      const p = c.length ? c[Math.floor(Math.random() * c.length)] : free[Math.floor(Math.random() * free.length)] ?? PERSONAS[0];
      inUse.add(p.id);
      return p;
    }
  }
}

export function releasePersona(p: Persona | undefined) {
  if (p) inUse.delete(p.id);
}
