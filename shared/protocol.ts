// İstemci ↔ sunucu mesaj sözleşmesi ve state şekli (istemci tarafı tipleri için).
import type { Arch } from './balance';

export type GameMode = 'quick' | 'private' | 'bot' | 'tutorial';
export type BotLevel = 'easy' | 'normal' | 'hard';
export type Phase = 'waiting' | 'countdown' | 'playing' | 'ended';
export type EndReason = 'base' | 'forfeit' | '';

/** İstemci → sunucu mesajları */
export interface ClientMessages {
  train: { arch: Arch };
  cancel: { index: number };
  evolve: Record<string, never>;
  stance: { stance: 'attack' | 'hold' };
  special: Record<string, never>;
  turret_buy: { slot: number; grade: number };
  turret_sell: { slot: number };
  /** Kuleyi aynı yuvada başka bir kuleyle değiştirir (yeni kademe ya da başka derece). */
  turret_upgrade: { slot: number; grade: number };
  slot_buy: Record<string, never>;
  /** Sahip olunan noktaya (silahsız) karakol kurar; kuruluysa kademesini yükseltir, sonra üstüne kule ekler. */
  outpost_build: { index: number };
  /** Sunulan çağ kartlarından birini seçer. */
  card_pick: { id: string };
  /** Komutanın yeteneği (Sarsıcı Darbe). */
  cmd_skill: Record<string, never>;
  /** Eğitimde düğmeyle geçilen adımı geçer. */
  tut_next: Record<string, never>;
  rematch: Record<string, never>;
}

export interface JoinOptions {
  mode: GameMode;
  name?: string;
  level?: BotLevel;
  /** Hızlı eşleşme: oyuncunun cihazında tutulan güç tahmini (0 acemi … 1 usta). Kimse bulunamazsa rakip buna göre seçilir. */
  skill?: number;
  /** Hızlı eşleşme: oyuncunun arayüz dili (en, tr, de, es, fr, pt). Kimse bulunamazsa rakip çoğunlukla bu dilden bir oyuncu gibi gelir. */
  lang?: string;
}

/** Sunucu → istemci görsel efekt olayları ('fx' mesajı) */
export type FxEvent =
  /** echo: Çifte Yağmur kartının ikinci vuruşu */
  | { t: 'special'; side: number; tier: number; x0: number; x1: number; echo?: boolean }
  /** komutan: doğdu / atıldı (Sarsıcı Darbe) / yere indi / seviye atladı / öldü */
  | { t: 'cmd'; side: number; k: 'spawn' | 'leap' | 'slam' | 'level' | 'die'; id: string; x: number; lvl?: number }
  /** Eter Kaynağı: belirdi / alındı */
  | { t: 'src'; k: 'spawn' | 'taken'; kind: string; x: number; side: number }
  /** çağ kartı seçildi */
  | { t: 'card'; side: number; id: string }
  /** Seken Atış: kule atışı başka bir düşmana sekti */
  | { t: 'bounce'; from: string; to: string; tier: number }
  | { t: 'evolve'; side: number; tier: number }
  | { t: 'end'; winner: number; reason: EndReason }
  /** birim yeteneği anı: kalkan blokladı / ruh dirildi / boğa hücumu */
  | { t: 'ufx'; id: string; k: 'block' | 'revive' | 'charge' }
  /** Meşe Golem öldü, çevresini iyileştirdi */
  | { t: 'heal'; side: number; x: number; r: number }
  /** karakol olayları: nokta ele geçirildi / kaybedildi, karakol kuruldu / yıkıldı */
  | { t: 'outpost'; i: number; k: 'captured' | 'lost' | 'built' | 'destroyed'; side: number };

// ── İstemcinin okuduğu state şekli (sunucudaki schema ile aynı alanlar) ──
export interface ITurretSlot {
  tier: number;
  grade: number;
  shots: number;
  tgt: string;
}

export const STATUS_SLOW = 1;
export const STATUS_BURN = 2;
/** Eter Titanı aurasının etkisinde */
export const STATUS_AURA = 4;
/** Komutanın darbesiyle sersemledi */
export const STATUS_STUN = 8;
/** Eter Öfkesi etkisinde */
export const STATUS_FURY = 16;

export interface StrList {
  length: number;
  at(i: number): string | undefined;
  forEach(cb: (v: string, i: number) => void): void;
}

export interface IPlayer {
  id: string;
  name: string;
  side: number;
  isBot: boolean;
  /** Bot türü ('easy' | 'normal' | 'hard' | 'tutor'), insan oyuncuda ''. Ad istemcide çevrilir. */
  botKind: string;
  connected: boolean;
  left: boolean;
  gold: number;
  xp: number;
  tier: number;
  baseHp: number;
  baseMaxHp: number;
  queue: StrList;
  trainProgress: number;
  specialCd: number;
  turrets: { length: number; at(i: number): ITurretSlot | undefined };
  stance: 'attack' | 'hold';
  wantsRematch: boolean;
  kills: number;
  lost: number;
  trained: number;
  goldEarned: number;
  cards: StrList;
  offer: StrList;
  picks: number;
  furyT: number;
  cmdId: string;
  cmdRespawn: number;
  cmdCd: number;
  cmdLvl: number;
  cmdKills: number;
}

export interface ISource {
  active: boolean;
  x: number;
  kind: string;
  cap: number;
  capSide: number;
  next: number;
}

export interface IUnit {
  id: string;
  side: number;
  tier: number;
  arch: Arch;
  x: number;
  hp: number;
  maxHp: number;
  state: number; // 0 yürüyor, 1 bekliyor, 2 saldırıyor, 3 geri çekiliyor
  atk: number;
  tgt: string;
  status: number; // STATUS_* bitleri
  cmd: boolean; // komutan mı
  lvl: number; // komutan seviyesi
}

export interface IOutpost {
  x: number;
  owner: number;
  capSide: number;
  cap: number;
  built: boolean;
  armed: boolean;
  tier: number;
  hp: number;
  maxHp: number;
  shots: number;
  tgt: string;
}

export interface MapLike<T> {
  size: number;
  get(key: string): T | undefined;
  forEach(cb: (value: T, key: string) => void): void;
}

export interface IBattleState {
  phase: Phase;
  countdown: number;
  winner: number;
  reason: EndReason;
  code: string;
  mode: GameMode;
  time: number;
  paused: boolean;
  players: MapLike<IPlayer>;
  units: MapLike<IUnit>;
  outposts: { length: number; at(i: number): IOutpost | undefined };
  src: ISource;
  /** Eğitim maçında şu anki adım (shared/tutorial.ts TUTORIAL indeksi), değilse -1. */
  tut: number;
}
