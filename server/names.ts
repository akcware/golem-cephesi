// Hızlı eşleşmede boşluğu dolduran rakipler için oyuncu adına benzeyen takma adlar.
// Tohumlu üretilir: aynı tohum hep aynı adı verir (kişilik havuzu sunucu yeniden başlasa da aynı kalır).

export type Rng = () => number;

/** Küçük, hızlı, tohumlu rastgele sayı üreteci (0 ≤ x < 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: Rng, a: readonly T[]): T => a[Math.floor(r() * a.length)];

/** Adların en fazla uzunluğu (BattleRoom.cleanName ile aynı). */
export const NAME_MAX = 16;

const FIRST = [
  'efe', 'mert', 'emre', 'burak', 'can', 'kerem', 'arda', 'berk', 'kaan', 'deniz', 'elif', 'zeynep', 'ecem',
  'irem', 'selin', 'ali', 'ahmet', 'yusuf', 'onur', 'baris', 'barış', 'tuna', 'bora', 'kayra', 'alp', 'umut',
  'cem', 'ege', 'doruk', 'eren', 'oguz', 'oğuz', 'melis', 'ceren', 'yigit', 'yiğit', 'batu', 'emir', 'hakan',
  'serkan', 'furkan', 'enes', 'omer', 'ömer', 'sena', 'buse', 'ilayda', 'nehir', 'defne', 'asli', 'tolga',
  'volkan', 'sinan', 'koray', 'berkay', 'alperen', 'taha', 'yasin', 'hamza', 'ozan', 'cagan', 'metehan', 'kuzey',
  'aras', 'poyraz', 'mira', 'eylul', 'duru', 'atlas', 'demir', 'egehan', 'harun', 'ismail', 'murat', 'serhat',
];
const TR_ADJ = ['kara', 'kizil', 'demir', 'sessiz', 'deli', 'cilgin', 'yalniz', 'gece', 'buz', 'ates', 'altin', 'kor', 'koca', 'minik', 'gizli', 'son', 'kurnaz', 'yasli'];
const TR_NOUN = [
  'kurt', 'kartal', 'aslan', 'kaya', 'yildiz', 'golge', 'firtina', 'ejder', 'kral', 'reis', 'usta', 'efsane',
  'golem', 'simyaci', 'kale', 'tilki', 'sahin', 'bozkurt', 'yumruk', 'kilic', 'kalkan', 'topcu', 'okcu', 'dev',
  'titan', 'cadi', 'pasa', 'han', 'sovalye', 'balta', 'yuzbasi', 'komutan',
];
const EN_ADJ = ['dark', 'night', 'shadow', 'iron', 'silent', 'crazy', 'lone', 'ice', 'fire', 'golden', 'toxic', 'epic', 'mad', 'pro', 'lil', 'big', 'sneaky', 'lucky', 'frozen', 'red'];
const EN_NOUN = ['wolf', 'fox', 'hunter', 'king', 'gamer', 'legend', 'storm', 'knight', 'ghost', 'ninja', 'golem', 'titan', 'sniper', 'beast', 'rider', 'player', 'bear', 'hawk', 'viper', 'panda'];
// plaka kodları, doğum yılları, kulüp kuruluş yılları: Türk oyuncu adlarında en sık görülen sayılar
const PLATES = ['01', '06', '07', '16', '26', '27', '33', '34', '35', '38', '41', '42', '55', '61', '63'];

function num(r: Rng): string {
  const k = r();
  if (k < 0.35) return pick(r, PLATES);
  if (k < 0.6) return String(1996 + Math.floor(r() * 16)); // 1996–2011
  if (k < 0.72) return pick(r, ['1903', '1905', '1907', '1967']);
  if (k < 0.85) return String(Math.floor(r() * 90) + 10);
  return String(Math.floor(r() * 900) + 100);
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
const sep = (r: Rng) => pick(r, ['', '', '', '_', '.', '_']);

/** Yazım tarzı: çoğu küçük harf, bir kısmı baş harfi büyük, azı tamamen büyük. */
function style(r: Rng, s: string): string {
  const k = r();
  if (k < 0.5) return s.toLocaleLowerCase('tr');
  if (k < 0.92) return cap(s);
  return s.toLocaleUpperCase('tr');
}

/** İki parçayı birleştir: KaraKurt / karakurt / kara_kurt */
function join2(r: Rng, a: string, b: string): string {
  const k = r();
  if (k < 0.45) return cap(a) + cap(b);
  if (k < 0.65) return a + cap(b);
  if (k < 0.85) return a + b;
  return a + '_' + b;
}

function once(r: Rng): string {
  const k = r();
  if (k < 0.24) return style(r, pick(r, FIRST)) + sep(r) + num(r); // efe34, Mert_2008
  if (k < 0.38) return join2(r, pick(r, TR_ADJ), pick(r, TR_NOUN)); // KaraKurt
  if (k < 0.46) {
    // ElifK, ardaa
    const f = pick(r, FIRST);
    return r() < 0.5 ? cap(f) + pick(r, 'ABCDEGKMSTY'.split('')) : f + f.slice(-1);
  }
  if (k < 0.6) {
    const s = join2(r, pick(r, EN_ADJ), pick(r, EN_NOUN)); // DarkWolf61
    return r() < 0.45 ? s + num(r) : s;
  }
  if (k < 0.67) return join2(r, pick(r, TR_NOUN), pick(r, FIRST)); // ReisBurak
  if (k < 0.73) {
    const f = style(r, pick(r, FIRST));
    return r() < 0.6 ? f + 'TR' : 'TR_' + cap(f); // kaanTR
  }
  if (k < 0.79) return style(r, pick(r, FIRST)); // Zeynep, BATU
  if (k < 0.82) return 'xX' + cap(pick(r, FIRST)) + num(r) + 'Xx';
  if (k < 0.9) return style(r, pick(r, TR_NOUN)) + sep(r) + num(r); // kartal1907
  return pick(r, FIRST) + pick(r, ['', '.', '_']) + pick(r, TR_NOUN); // efe.golem
}

/** Tek bir takma ad üretir (her zaman ≤ NAME_MAX karakter). */
export function gamertag(r: Rng): string {
  for (;;) {
    const s = once(r);
    if (s.length >= 3 && s.length <= NAME_MAX) return s;
  }
}
