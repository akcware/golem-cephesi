// ─────────────────────────────────────────────────────────────
//  GOLEM CEPHESİ — tüm denge değerleri tek yerde.
//  Sunucu (simülasyon), bot ve istemci (arayüz) bu dosyayı paylaşır.
//  Oyunu dengelemek için genelde sadece burayı değiştirmek yeterli.
// ─────────────────────────────────────────────────────────────

/** Koridorun uzunluğu (dünya birimi = piksel). */
export const WORLD_W = 2000;
/** Kale önünün kenardan uzaklığı. Birimler burada doğar, düşman burada kaleye vurur. */
export const BASE_FRONT = 150;
/** Sunucu simülasyon adımı (ms). 20 Hz. */
export const TICK_MS = 50;

export const MAX_UNITS_PER_SIDE = 28;
export const MAX_QUEUE = 5;
export const START_GOLD = 175;
export const COUNTDOWN_S = 3;
export const UNIT_SPACING = 6;
export const RECONNECT_S = 20;

/** Ön safta aynı anda göğüs göğüse savaşabilecek yakın dövüşçü/ağır sayısı (kalabalık ordu avantajı). */
export const MAX_BRAWL = 3;

/** "Savun" duruşunda ordunun toplandığı çizginin kale önüne uzaklığı (kule menzili içinde). */
export const HOLD_DIST = 280; // kendi yakın noktamızın ele geçirme alanının içinde
/** Savunmadaki birim, düşman bu kadar yaklaşınca dizilimi bozup çatışmaya katılır. */
export const HOLD_AGGRO = 140;
export type Stance = 'attack' | 'hold';

// Özel güç
export const SPECIAL_CD = 45;
export const SPECIAL_START_CD = 20;
export const SPECIAL_DELAY = 0.75;
export const SPECIAL_WIDTH = 520;

// Kuleler
export const MAX_SLOTS = 3;
export const SLOT_COSTS = [0, 350, 1100];
export const TURRET_REFUND = 0.5;

/** Her kademede 3 kule derecesi: Hafif (ucuz, seri, kısa menzil), Orta (dengeli), Ağır (pahalı, güçlü, uzun menzil). */
export const TURRET_GRADES = [
  { label: 'Hafif', costMult: 0.55, dmgMult: 0.4, cd: 0.55, range: 300 },
  { label: 'Orta', costMult: 1, dmgMult: 1, cd: 1.1, range: 360 },
  { label: 'Ağır', costMult: 2, dmgMult: 2, cd: 1.7, range: 440 },
] as const;
export const TURRET_GRADE_COUNT = TURRET_GRADES.length;

/**
 * Kulelerin saldırı türü:
 *  shot   – tek hedefe mermi
 *  lob    – yay çizen bomba, düştüğü yerde alan hasarı
 *  pierce – delici ok, hattaki ilk N düşmanı geçer
 *  beam   – lazer, anında vurur ve hattaki ilk N düşmanı deler
 *  chain  – zincir şimşek, yakındaki düşmanlara sıçrar
 *  fire   – ateş topu, düştüğü yeri bir süre yakar
 *  frost  – buz, hedefi yavaşlatır
 */
export type TurretKind = 'shot' | 'lob' | 'pierce' | 'beam' | 'chain' | 'fire' | 'frost';

/** Bombanın uçuş süresi (sn): hasar bu kadar sonra, düştüğü yerde uygulanır. */
export const LOB_TIME = 0.55;
/** Zincir şimşeğin bir hedeften diğerine sıçrayabileceği en uzak mesafe. */
export const CHAIN_RANGE = 110;
/** Zincirdeki her sıçramada hasar bu oranla azalır. */
export const CHAIN_FALLOFF = 0.75;
/** Yavaşlatılan birimin hız çarpanı. */
export const SLOW_FACTOR = 0.5;

interface TurretSpec {
  name: string;
  kind: TurretKind;
  dmgK?: number; // türün etkisine göre hasar düzeltmesi
  splash?: number;
  pierce?: number;
  chain?: number;
  slow?: number; // sn
  burn?: { dps: number; dur: number }; // dps: kule hasarının saniyelik oranı
}

// İleri karakollar: koridordaki ele geçirilebilir noktalar
/** Noktaların dünya x'leri: her tarafın yakın noktası, ortadaki çekişmeli nokta. */
export const OUTPOST_XS = [500, 1000, 1500];
/** Ele geçirme alanının yarıçapı ve süresi (sadece bir tarafın birimi varken). */
export const CAPTURE_RADIUS = 100;
export const CAPTURE_TIME = 3;
/** Karakol kulesinin menzili. */
export const OUTPOST_RANGE = 260;
/** Karakolun gövde yarı genişliği (birimler önünde durur). */
export const OUTPOST_HALF = 22;
/** Sahip olunan her nokta için ek gelir = kademe geliri × bu oran. */
export const OUTPOST_INCOME = 0.25;
/** Karakolu yıkan tarafa, karakolun maliyetinin bu oranı kadar altın. */
export const OUTPOST_BOUNTY = 0.5;

// Ekonomi
export const BOUNTY_RATE = 0.75; // öldürülen birimin maliyetinin bu oranı kadar altın
export const XP_KILL_RATE = 1.0; // öldürünce maliyet × bu oran kadar XP
export const XP_LOSS_RATE = 0.25; // kendi birimin ölünce de biraz XP (geride kalanı toparlar)
export const PASSIVE_XP_RATE = 0.8; // pasif XP = pasif altın geliri × bu oran

const POWER_GROWTH = 2.2; // her kademede can/hasar çarpanı
const COST_GROWTH = 2.4; // her kademede maliyet çarpanı

export type Arch = 'melee' | 'ranged' | 'heavy';
export const ARCHES: Arch[] = ['melee', 'ranged', 'heavy'];

export const ARCH_LABEL: Record<Arch, string> = {
  melee: 'Yakın dövüş',
  ranged: 'Menzilli',
  heavy: 'Ağır',
};

/** Hasar çarpanı: COUNTER[saldıran][savunan]. Taş-kağıt-makas. */
export const COUNTER: Record<Arch, Record<Arch, number>> = {
  melee: { melee: 1, ranged: 1.5, heavy: 0.75 },
  ranged: { melee: 0.75, ranged: 1, heavy: 1.5 },
  heavy: { melee: 1.5, ranged: 0.75, heavy: 1 },
};
/** Kaleye verilen hasar çarpanı: ağır golemler kuşatma uzmanı, menzilliler surlara zayıf. */
export const BASE_DMG_MULT: Record<Arch, number> = { melee: 1, ranged: 0.6, heavy: 1.5 };

export const STRONG_AGAINST: Record<Arch, Arch> = { melee: 'ranged', ranged: 'heavy', heavy: 'melee' };
export const COUNTERED_BY: Record<Arch, Arch> = { melee: 'heavy', ranged: 'melee', heavy: 'ranged' };

interface ArchBase {
  cost: number;
  hp: number;
  dmg: number;
  atkCd: number; // saniye
  range: number; // temas mesafesinin ötesindeki menzil
  speed: number; // birim/sn
  train: number; // üretim süresi (sn)
  radius: number; // gövde yarıçapı (çarpışma)
}

const ARCH_BASE: Record<Arch, ArchBase> = {
  melee: { cost: 20, hp: 60, dmg: 14, atkCd: 1.0, range: 6, speed: 50, train: 0.9, radius: 13 },
  ranged: { cost: 30, hp: 40, dmg: 10, atkCd: 1.25, range: 190, speed: 46, train: 1.1, radius: 12 },
  heavy: { cost: 80, hp: 360, dmg: 32, atkCd: 1.5, range: 8, speed: 34, train: 2.0, radius: 24 },
};

export interface Palette {
  main: number;
  dark: number;
  light: number;
  glow: number;
}

/**
 * Birim yetenekleri (hepsi otomatik çalışır). Bir yetenek bu parametrelerin bir alt kümesini kullanır.
 */
export interface AbilityParams {
  regen?: number; // savaşmıyorken saniyede azami canın bu oranı kadar iyileşir
  rapid?: number; // ilk N saldırı çok hızlı
  deathHeal?: { r: number; pct: number }; // ölünce çevredeki dostları iyileştirir
  block?: number; // menzilli saldırıları bloklama olasılığı
  pierceArmor?: boolean; // kalkan ve zırhı yok sayar
  heavyBonus?: number; // ağır birimlere ek hasar oranı
  charge?: { mult: number; knock: number }; // çatışmaya girişte güçlü vuruş + geri itme
  armor?: number; // yakın dövüş hasarını azaltma oranı
  splash?: { r: number; pct: number }; // hedefin çevresine alan hasarı
  siege?: number; // kale/karakol hasar çarpanı (varsayılanın yerine)
  reflect?: number; // aldığı yakın dövüş hasarının bu oranını saldırana yansıtır
  pierce?: number; // hattaki N düşmanı birden vurur
  slowOnHit?: number; // vurduğunu bu kadar saniye yavaşlatır
  revive?: number; // ilk ölümde bu oranda canla döner
  chain?: { pct: number }; // saldırı yakındaki bir düşmana daha sıçrar
  aura?: { r: number; bonus: number }; // çevresindeki dostlara hasar bonusu
}

export interface AbilityDef {
  name: string;
  desc: string;
  p: AbilityParams;
}

/** Hücum yeteneği bu kadar süre yürüdükten sonra yeniden dolar (sn). */
export const CHARGE_REARM = 1.5;
/** Birim zincir şimşeğinin sıçrama mesafesi. */
export const UNIT_CHAIN_RANGE = 90;

interface TierInfo {
  key: string;
  name: string;
  xpToReach: number;
  units: Record<Arch, string>;
  abilities: Record<Arch, AbilityDef>;
  special: string;
  /** [Hafif, Orta, Ağır] */
  turrets: [TurretSpec, TurretSpec, TurretSpec];
  palette: Palette;
}

const TIER_INFO: TierInfo[] = [
  {
    key: 'wood',
    name: 'Ahşap',
    xpToReach: 0,
    units: { melee: 'Kütük Muhafız', ranged: 'Söğüt Okçu', heavy: 'Meşe Golem' },
    abilities: {
      melee: { name: 'Kök Salma', desc: 'Savaşmıyorken saniyede canının %4\'ünü yeniler', p: { regen: 0.04 } },
      ranged: { name: 'Seri Atış', desc: 'İlk 3 okunu çok hızlı atar', p: { rapid: 3 } },
      heavy: { name: 'Fidan', desc: 'Ölünce yakındaki dostlarını canlarının %35\'i kadar iyileştirir', p: { deathHeal: { r: 130, pct: 0.35 } } },
    },
    special: 'Kozalak Yağmuru',
    turrets: [
      { name: 'Ok Kulesi', kind: 'shot' },
      { name: 'Kozalak Mancınığı', kind: 'lob', splash: 40, dmgK: 0.85 },
      { name: 'Kütük Katapultu', kind: 'lob', splash: 65, dmgK: 0.9 },
    ],
    palette: { main: 0xa0703c, dark: 0x5e3a1c, light: 0xd2a066, glow: 0x8fd16a },
  },
  {
    key: 'bronze',
    name: 'Bronz',
    xpToReach: 900,
    units: { melee: 'Bronz Muhafız', ranged: 'Bronz Arbaletçi', heavy: 'Bronz Boğa' },
    abilities: {
      melee: { name: 'Kalkan', desc: 'Menzilli saldırıların %35\'ini bloklar', p: { block: 0.35 } },
      ranged: { name: 'Zırh Delici', desc: 'Kalkan ve zırhı yok sayar, ağırlara +%25 hasar', p: { pierceArmor: true, heavyBonus: 0.25 } },
      heavy: { name: 'Boğa Hücumu', desc: 'Çatışmaya girerken 2 kat vurur ve hedefi geri iter', p: { charge: { mult: 2, knock: 40 } } },
    },
    special: 'Erimiş Bronz',
    turrets: [
      { name: 'Bronz Yay', kind: 'shot' },
      { name: 'Bronz Balista', kind: 'pierce', pierce: 3, dmgK: 0.8 },
      { name: 'Ateş Kazanı', kind: 'fire', splash: 60, dmgK: 0.5, burn: { dps: 0.6, dur: 3 } },
    ],
    palette: { main: 0xc8782e, dark: 0x7a4515, light: 0xf0b060, glow: 0xffc65a },
  },
  {
    key: 'iron',
    name: 'Demir',
    xpToReach: 3200,
    units: { melee: 'Demir Şövalye', ranged: 'Demir Topçu', heavy: 'Demir Dev' },
    abilities: {
      melee: { name: 'Ağır Zırh', desc: 'Yakın dövüş saldırılarından %25 az hasar alır', p: { armor: 0.25 } },
      ranged: { name: 'Top Güllesi', desc: 'Hedefin çevresindekilere %50 alan hasarı verir', p: { splash: { r: 45, pct: 0.5 } } },
      heavy: { name: 'Kuşatma Ustası', desc: 'Kalelere ve karakollara 2.5 kat hasar verir', p: { siege: 2.5 } },
    },
    special: 'Gülle Yağmuru',
    turrets: [
      { name: 'Tüfek Mazgalı', kind: 'shot' },
      { name: 'Demir Top', kind: 'lob', splash: 40, dmgK: 0.85 },
      { name: 'Havan Topu', kind: 'lob', splash: 75, dmgK: 0.9 },
    ],
    palette: { main: 0x8c949e, dark: 0x4a5058, light: 0xd0d6dc, glow: 0xffb347 },
  },
  {
    key: 'crystal',
    name: 'Kristal',
    xpToReach: 10000,
    units: { melee: 'Kristal Kılıççı', ranged: 'Prizma Büyücü', heavy: 'Kuvars Golem' },
    abilities: {
      melee: { name: 'Yansıtma', desc: 'Aldığı yakın dövüş hasarının %25\'ini saldırana geri vurur', p: { reflect: 0.25 } },
      ranged: { name: 'Delici Işın', desc: 'Işını hattaki 2 düşmanı birden vurur', p: { pierce: 2 } },
      heavy: { name: 'Buz Yumruğu', desc: 'Vurduğu düşmanı 1.5 sn yavaşlatır', p: { slowOnHit: 1.5 } },
    },
    special: 'Kristal Sağanağı',
    turrets: [
      { name: 'Kristal Diken', kind: 'frost', slow: 1.5, dmgK: 0.8 },
      { name: 'Prizma Kulesi', kind: 'beam', pierce: 3, dmgK: 0.8 },
      { name: 'Işın Merceği', kind: 'beam', pierce: 8, dmgK: 0.75 },
    ],
    palette: { main: 0x4fc8e0, dark: 0x1f7088, light: 0xc4f6ff, glow: 0x9ef0ff },
  },
  {
    key: 'aether',
    name: 'Eter',
    xpToReach: 30000,
    units: { melee: 'Eter Bekçisi', ranged: 'Eter Gözü', heavy: 'Eter Titanı' },
    abilities: {
      melee: { name: 'Ruh Bedeni', desc: 'İlk ölümünde %40 canla geri döner', p: { revive: 0.4 } },
      ranged: { name: 'Zincir Şimşek', desc: 'Saldırısı yakındaki bir düşmana daha sıçrar (%60)', p: { chain: { pct: 0.6 } } },
      heavy: { name: 'Komutan Aurası', desc: 'Yakınındaki dostlar %20 fazla hasar verir', p: { aura: { r: 140, bonus: 0.2 } } },
    },
    special: 'Eter Fırtınası',
    turrets: [
      { name: 'Eter Kıvılcımı', kind: 'chain', chain: 2, dmgK: 0.85 },
      { name: 'Eter Kristali', kind: 'chain', chain: 3, dmgK: 0.85 },
      { name: 'Yıldız Çekirdeği', kind: 'lob', splash: 85, slow: 1.2, dmgK: 0.85 },
    ],
    palette: { main: 0x9a6cff, dark: 0x4b2a9e, light: 0xe6d8ff, glow: 0xffe07a },
  },
];

export interface UnitDef extends ArchBase {
  name: string;
  arch: Arch;
  tier: number;
  bounty: number;
  xp: number;
  ability: AbilityDef;
}

export interface TierDef {
  index: number;
  key: string;
  name: string;
  xpToReach: number;
  baseHp: number;
  income: number; // pasif altın/sn
  palette: Palette;
  units: Record<Arch, UnitDef>;
  special: { name: string; damage: number };
  /** [Hafif, Orta, Ağır] */
  turrets: TurretDef[];
  /** İleri karakol (bu kademede kurulursa) */
  outpost: { cost: number; hp: number };
}

export interface TurretDef {
  name: string;
  tier: number;
  grade: number;
  label: string; // Hafif / Orta / Ağır
  kind: TurretKind;
  desc: string; // oyuncuya gösterilen kısa açıklama
  cost: number;
  dmg: number;
  range: number;
  cd: number;
  splash: number; // alan hasarı yarıçapı (0 = yok)
  pierce: number; // aynı hatta vurduğu en fazla düşman (1 = tek)
  chain: number; // zincir şimşeğin ek sıçrama sayısı
  slow: number; // yavaşlatma süresi (sn)
  burnDps: number; // yanan alanın saniyelik hasarı
  burnDur: number; // yanan alanın süresi (sn)
}

function turretDesc(s: TurretSpec): string {
  switch (s.kind) {
    case 'shot':
      return 'Seri atış, tek hedef';
    case 'lob':
      return `Bomba: alan hasarı${s.slow ? ', yavaşlatır' : ''}`;
    case 'pierce':
      return `Delici ok: hattaki ${s.pierce} düşmanı geçer`;
    case 'beam':
      return `Lazer: anında, hattaki ${s.pierce} düşmanı deler`;
    case 'chain':
      return `Zincir şimşek: ${(s.chain ?? 0) + 1} hedefe sıçrar`;
    case 'fire':
      return `Ateş: düştüğü yeri ${s.burn?.dur} sn yakar`;
    case 'frost':
      return `Buz: hedefi ${s.slow} sn yavaşlatır`;
  }
}

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export const TIERS: TierDef[] = TIER_INFO.map((info, t) => {
  const pow = Math.pow(POWER_GROWTH, t);
  const cst = Math.pow(COST_GROWTH, t);
  const units = {} as Record<Arch, UnitDef>;
  for (const arch of ARCHES) {
    const b = ARCH_BASE[arch];
    const cost = round5(b.cost * cst);
    units[arch] = {
      ...b,
      name: info.units[arch],
      arch,
      tier: t,
      cost,
      hp: Math.round(b.hp * pow),
      dmg: Math.round(b.dmg * pow * 10) / 10,
      speed: b.speed + t * 2,
      train: Math.round((b.train + t * 0.1) * 100) / 100,
      bounty: Math.round(cost * BOUNTY_RATE),
      xp: Math.round(cost * XP_KILL_RATE),
      ability: info.abilities[arch],
    };
  }
  return {
    index: t,
    key: info.key,
    name: info.name,
    xpToReach: info.xpToReach,
    baseHp: Math.round(1500 * Math.pow(2.0, t)),
    income: Math.round(2.5 * cst * 10) / 10,
    palette: info.palette,
    units,
    special: { name: info.special, damage: Math.round(70 * pow) },
    turrets: TURRET_GRADES.map((g, grade) => {
      const s = info.turrets[grade];
      const base = 12 * pow * g.dmgMult;
      return {
        name: s.name,
        tier: t,
        grade,
        label: g.label,
        kind: s.kind,
        desc: turretDesc(s),
        cost: round5(140 * cst * g.costMult),
        dmg: Math.round(base * (s.dmgK ?? 1) * 10) / 10,
        range: g.range,
        cd: g.cd,
        splash: s.splash ?? 0,
        pierce: s.pierce ?? 1,
        chain: s.chain ?? 0,
        slow: s.slow ?? 0,
        burnDps: Math.round(base * (s.burn?.dps ?? 0) * 10) / 10,
        burnDur: s.burn?.dur ?? 0,
      };
    }),
    outpost: { cost: round5(150 * Math.pow(2.0, t)), hp: Math.round(800 * Math.pow(2.0, t)) },
  };
});

/** Karakolu bu kademeye yükseltmenin bedeli (eski karakolun yarı değeri düşülür). */
export function outpostUpgradeCost(fromTier: number, toTier: number): number {
  return Math.max(0, Math.round(TIERS[toTier].outpost.cost - TIERS[fromTier].outpost.cost * 0.5));
}

export const MAX_TIER = TIERS.length - 1;

export function turretDef(tier: number, grade: number): TurretDef {
  const t = TIERS[Math.max(0, Math.min(MAX_TIER, tier))];
  return t.turrets[Math.max(0, Math.min(TURRET_GRADE_COUNT - 1, grade))];
}

export function isGrade(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) < TURRET_GRADE_COUNT;
}

export function unitDef(tier: number, arch: Arch): UnitDef {
  return TIERS[Math.max(0, Math.min(MAX_TIER, tier))].units[arch];
}

export function isArch(v: unknown): v is Arch {
  return v === 'melee' || v === 'ranged' || v === 'heavy';
}

/** Kale ön çizgisinin dünya x'i (side 0 solda, side 1 sağda). */
export function baseFrontX(side: number): number {
  return side === 0 ? BASE_FRONT : WORLD_W - BASE_FRONT;
}

/** Birimlerin doğduğu x (kale kapısının biraz içi). */
export function spawnX(side: number): number {
  return side === 0 ? BASE_FRONT - 10 : WORLD_W - BASE_FRONT + 10;
}

/** İleri yönü: side 0 sağa (+1), side 1 sola (-1). */
export function dirOf(side: number): 1 | -1 {
  return side === 0 ? 1 : -1;
}
