// Hızlı eşleşmede kimse bulunamayınca maça giren rakiplerin kişilik havuzu.
// Her kişiliğin sabit bir adı, gücü ve oyun tarzı var; havuz tohumlu üretildiği için sunucu yeniden
// başlasa da aynı kalır (aynı "oyuncuyla" ileride yine karşılaşılabilir).
import { gamertag, mulberry32, type Rng } from './names';

export interface Persona {
  id: number;
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

const POOL_SIZE = 360;
const POOL_SEED = 0x601e3;

function build(): Persona[] {
  const r: Rng = mulberry32(POOL_SEED);
  const out: Persona[] = [];
  const names = new Set<string>();
  for (let i = 0; out.length < POOL_SIZE; i++) {
    const name = gamertag(r);
    const key = name.toLocaleLowerCase('tr');
    if (names.has(key)) continue;
    names.add(key);
    out.push({
      id: out.length,
      name,
      // biraz ortaya yığılmış dağılım; uçlarda da yeterince kişi kalır
      skill: 0.65 * r() + 0.35 * r(),
      aggro: r(),
      builder: r(),
      heavy: r(),
      pace: r(),
      tilt: r() < 0.3 ? 0.4 + 0.6 * r() : 0.15 * r(),
      social: r(),
    });
  }
  return out;
}

export const PERSONAS: readonly Persona[] = build();

/** Şu an bir maçta olan kişilikler (aynı kişi aynı anda iki odada görünmesin). */
const inUse = new Set<number>();

/**
 * Hedef güce yakın, şu an boşta olan bir kişilik seçer. avoid: oyuncunun kendi adı (aynı ad çıkmasın).
 * İşi bitince release() ile geri verilmeli.
 */
export function acquirePersona(target: number, avoid = ''): Persona {
  const t = Math.max(0, Math.min(1, target));
  const bad = avoid.toLocaleLowerCase('tr');
  for (let w = 0.06; ; w *= 1.6) {
    const c = PERSONAS.filter((p) => !inUse.has(p.id) && Math.abs(p.skill - t) <= w && p.name.toLocaleLowerCase('tr') !== bad);
    if (c.length || w > 2) {
      const p = c.length ? c[Math.floor(Math.random() * c.length)] : PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
      inUse.add(p.id);
      return p;
    }
  }
}

export function releasePersona(p: Persona | undefined) {
  if (p) inUse.delete(p.id);
}
