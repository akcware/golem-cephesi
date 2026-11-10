// Hızlı eşleşmede boşluğu dolduran rakipler için oyuncu adına benzeyen takma adlar, bölgeye göre
// (oyunun dilleri: en, tr, de, es, fr, pt). Her bölgenin kendi adları, kelimeleri, sayı alışkanlıkları
// (plaka kodu, departman, alan kodu, doğum yılı) ve etiketleri var; bir kısmı da her yerde görülen
// İngilizce oyuncu adları. Tohumlu üretilir: aynı tohum hep aynı adı verir.
import type { Lang } from '../shared/i18n';

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

interface Region {
  /** Büyük/küçük harf kuralı (Türkçede i → İ) */
  locale: string;
  first: readonly string[];
  adj: readonly string[];
  noun: readonly string[];
  /** Sıfat isimden sonra mı gelir (LoboOscuro, loup_noir)? */
  nounFirst: boolean;
  /** Bölgeye özgü sayılar (plaka kodu, departman, alan kodu, kulüp yılı…) */
  local: readonly string[];
  prefix: readonly string[];
  suffix: readonly string[];
}

const EN_ADJ = ['dark', 'night', 'shadow', 'iron', 'silent', 'crazy', 'lone', 'ice', 'fire', 'golden', 'toxic', 'epic', 'mad', 'pro', 'lil', 'big', 'sneaky', 'lucky', 'frozen', 'red'];
const EN_NOUN = ['wolf', 'fox', 'hunter', 'king', 'gamer', 'legend', 'storm', 'knight', 'ghost', 'ninja', 'golem', 'titan', 'sniper', 'beast', 'rider', 'player', 'bear', 'hawk', 'viper', 'panda'];

const REGIONS: Record<Lang, Region> = {
  en: {
    locale: 'en',
    first: ['jake', 'ryan', 'tyler', 'emma', 'chloe', 'mike', 'alex', 'sam', 'josh', 'liam', 'noah', 'ethan', 'olivia', 'ava', 'mia', 'logan', 'mason', 'dylan', 'kyle', 'brandon', 'zach', 'matt', 'nick', 'chris', 'ben', 'luke', 'jack', 'will', 'harry', 'charlie', 'ollie', 'finn', 'ellie', 'lily', 'grace', 'connor', 'aiden', 'cody', 'jordan', 'megan', 'katie', 'jamie', 'danny', 'tom'],
    adj: EN_ADJ,
    noun: EN_NOUN,
    nounFirst: false,
    local: ['99', '123', '007', '777', '360'],
    prefix: ['TheReal', 'its', 'Mr'],
    suffix: ['YT', 'TV', '_GG'],
  },
  tr: {
    locale: 'tr',
    first: ['efe', 'mert', 'emre', 'burak', 'can', 'kerem', 'arda', 'berk', 'kaan', 'deniz', 'elif', 'zeynep', 'ecem', 'irem', 'selin', 'ali', 'ahmet', 'yusuf', 'onur', 'baris', 'barış', 'tuna', 'bora', 'kayra', 'alp', 'umut', 'cem', 'ege', 'doruk', 'eren', 'oguz', 'oğuz', 'melis', 'ceren', 'yigit', 'yiğit', 'batu', 'emir', 'hakan', 'serkan', 'furkan', 'enes', 'omer', 'ömer', 'sena', 'buse', 'ilayda', 'nehir', 'defne', 'asli', 'tolga', 'volkan', 'sinan', 'koray', 'berkay', 'alperen', 'taha', 'yasin', 'hamza', 'ozan', 'cagan', 'metehan', 'kuzey', 'aras', 'poyraz', 'mira', 'eylul', 'duru', 'atlas', 'demir', 'egehan', 'harun', 'ismail', 'murat', 'serhat'],
    adj: ['kara', 'kizil', 'demir', 'sessiz', 'deli', 'cilgin', 'yalniz', 'gece', 'buz', 'ates', 'altin', 'kor', 'koca', 'minik', 'gizli', 'son', 'kurnaz', 'yasli'],
    noun: ['kurt', 'kartal', 'aslan', 'kaya', 'yildiz', 'golge', 'firtina', 'ejder', 'kral', 'reis', 'usta', 'efsane', 'golem', 'simyaci', 'kale', 'tilki', 'sahin', 'bozkurt', 'yumruk', 'kilic', 'kalkan', 'topcu', 'okcu', 'dev', 'titan', 'cadi', 'pasa', 'han', 'sovalye', 'balta', 'yuzbasi', 'komutan'],
    nounFirst: false,
    // plaka kodları ve kulüp kuruluş yılları: Türk oyuncu adlarında en sık görülen sayılar
    local: ['01', '06', '07', '16', '26', '27', '33', '34', '35', '38', '41', '42', '55', '61', '63', '1903', '1905', '1907', '1967'],
    prefix: ['TR_'],
    suffix: ['TR'],
  },
  de: {
    locale: 'de',
    first: ['lukas', 'leon', 'finn', 'jonas', 'paul', 'felix', 'max', 'niklas', 'tim', 'jan', 'lena', 'lea', 'anna', 'laura', 'julia', 'sophie', 'marie', 'hannah', 'tobias', 'moritz', 'kevin', 'dennis', 'marcel', 'sven', 'luca', 'ben', 'elias', 'noah', 'mia', 'emily', 'jannik', 'lars'],
    adj: ['dunkel', 'schwarz', 'eisern', 'wild', 'stark', 'schnell', 'leise', 'kalt', 'rot', 'grau', 'mega', 'krass', 'flink', 'irre'],
    noun: ['wolf', 'adler', 'drache', 'krieger', 'schatten', 'sturm', 'eisen', 'koenig', 'ritter', 'jaeger', 'baer', 'fuchs', 'golem', 'zocker', 'held', 'hammer', 'faust', 'titan'],
    nounFirst: false,
    local: ['04', '09', '1860', '1909', '030', '089', '040'],
    prefix: ['Der', 'xX'],
    suffix: ['HD', '_DE', 'LP'],
  },
  es: {
    locale: 'es',
    first: ['alejandro', 'pablo', 'javier', 'diego', 'sergio', 'carlos', 'dani', 'alvaro', 'adrian', 'hugo', 'lucia', 'maria', 'paula', 'sofia', 'laura', 'marta', 'carla', 'juan', 'miguel', 'mateo', 'santi', 'lucas', 'nico', 'raul', 'ivan', 'jorge', 'andres', 'marcos', 'irene', 'alba'],
    adj: ['oscuro', 'negro', 'loco', 'rapido', 'salvaje', 'rojo', 'letal', 'feroz', 'supremo', 'sombrio'],
    noun: ['lobo', 'dragon', 'guerrero', 'rey', 'caballero', 'cazador', 'oso', 'zorro', 'golem', 'fuego', 'titan', 'toro', 'trueno', 'demonio'],
    nounFirst: true,
    local: ['10', '23', '28', '777', '99'],
    prefix: ['El', 'Don', 'xX'],
    suffix: ['_YT', 'ES', '_xd'],
  },
  fr: {
    locale: 'fr',
    first: ['lucas', 'hugo', 'louis', 'nathan', 'theo', 'enzo', 'mathis', 'tom', 'leo', 'jules', 'arthur', 'emma', 'lea', 'chloe', 'manon', 'camille', 'ines', 'sarah', 'maxime', 'antoine', 'kevin', 'quentin', 'alexis', 'clement', 'baptiste', 'romain', 'julien', 'lola', 'jade', 'noah'],
    adj: ['noir', 'sombre', 'fou', 'rapide', 'sauvage', 'rouge', 'fatal', 'furtif', 'mortel', 'supreme'],
    noun: ['loup', 'dragon', 'guerrier', 'roi', 'chevalier', 'chasseur', 'ours', 'renard', 'golem', 'titan', 'corbeau', 'lion', 'tonnerre', 'demon'],
    nounFirst: true,
    // départements
    local: ['13', '31', '33', '44', '59', '62', '67', '69', '75', '76', '93', '974'],
    prefix: ['Le', 'Mr'],
    suffix: ['_FR', 'YT', 'off'],
  },
  pt: {
    locale: 'pt',
    first: ['lucas', 'gabriel', 'pedro', 'matheus', 'guilherme', 'rafael', 'felipe', 'joao', 'gustavo', 'bruno', 'vitor', 'ana', 'julia', 'beatriz', 'larissa', 'camila', 'leticia', 'mariana', 'thiago', 'caio', 'davi', 'enzo', 'arthur', 'kaua', 'luiz', 'diego', 'igor', 'pedrinho', 'joaozinho'],
    adj: ['sombrio', 'negro', 'louco', 'rapido', 'selvagem', 'brabo', 'monstro', 'supremo', 'letal', 'sinistro'],
    noun: ['lobo', 'dragao', 'guerreiro', 'rei', 'cavaleiro', 'cacador', 'urso', 'golem', 'titan', 'trovao', 'demonio', 'leao', 'tubarao', 'mito'],
    nounFirst: true,
    // alan kodları (DDD)
    local: ['11', '21', '31', '41', '51', '61', '71', '81', '85'],
    prefix: ['BR_', 'xX'],
    suffix: ['BR', '_br', 'zika', 'YT'],
  },
};

function num(r: Rng, g: Region): string {
  const k = r();
  if (k < 0.3) return pick(r, g.local);
  if (k < 0.6) return String(1996 + Math.floor(r() * 16)); // 1996–2011
  if (k < 0.8) return String(Math.floor(r() * 90) + 10);
  return String(Math.floor(r() * 900) + 100);
}

const cap = (s: string, loc: string) => s.charAt(0).toLocaleUpperCase(loc) + s.slice(1);
const sep = (r: Rng) => pick(r, ['', '', '', '_', '.', '_']);

/** Yazım tarzı: çoğu küçük harf, bir kısmı baş harfi büyük, azı tamamen büyük. */
function style(r: Rng, s: string, loc: string): string {
  const k = r();
  if (k < 0.5) return s.toLocaleLowerCase(loc);
  if (k < 0.92) return cap(s, loc);
  return s.toLocaleUpperCase(loc);
}

/** İki parçayı birleştir: KaraKurt / karakurt / kara_kurt */
function join2(r: Rng, a: string, b: string, loc: string): string {
  const k = r();
  if (k < 0.45) return cap(a, loc) + cap(b, loc);
  if (k < 0.65) return a + cap(b, loc);
  if (k < 0.85) return a + b;
  return a + '_' + b;
}

function once(r: Rng, g: Region): string {
  const L = g.locale;
  const k = r();
  if (k < 0.22) return style(r, pick(r, g.first), L) + sep(r) + num(r, g); // efe34, Lukas_2008
  if (k < 0.34) {
    // KaraKurt, DunkelWolf / LoboOscuro, loup_noir
    const a = pick(r, g.adj);
    const n = pick(r, g.noun);
    return g.nounFirst ? join2(r, n, a, L) : join2(r, a, n, L);
  }
  if (k < 0.41) {
    // ElifK, ardaa
    const f = pick(r, g.first);
    return r() < 0.5 ? cap(f, L) + pick(r, 'ABCDEGKLMNPRSTY'.split('')) : f + f.slice(-1);
  }
  if (k < 0.55) {
    // her ülkede görülen İngilizce oyuncu adları: DarkWolf61
    const s = join2(r, pick(r, EN_ADJ), pick(r, EN_NOUN), 'en');
    return r() < 0.45 ? s + num(r, g) : s;
  }
  if (k < 0.61) return join2(r, pick(r, g.noun), pick(r, g.first), L); // ReisBurak
  if (k < 0.69) {
    const f = style(r, pick(r, g.first), L);
    return r() < 0.55 ? f + pick(r, g.suffix) : pick(r, g.prefix) + cap(f, L); // kaanTR, TheRealJake
  }
  if (k < 0.75) return style(r, pick(r, g.first), L); // Zeynep, BATU
  if (k < 0.78) return 'xX' + cap(pick(r, g.first), L) + num(r, g) + 'Xx';
  if (k < 0.87) return style(r, pick(r, g.noun), L) + sep(r) + num(r, g); // kartal1907
  if (k < 0.93) return pick(r, g.first) + pick(r, ['', '.', '_']) + pick(r, g.noun); // efe.golem
  return pick(r, g.prefix) + cap(pick(r, g.noun), L); // ElLobo, LeLoup, DerAdler
}

/** Bölgeye uygun tek bir takma ad üretir (her zaman 3..NAME_MAX karakter). */
export function gamertag(r: Rng, region: Lang): string {
  const g = REGIONS[region];
  for (;;) {
    const s = once(r, g);
    if (s.length >= 3 && s.length <= NAME_MAX) return s;
  }
}
