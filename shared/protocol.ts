// İstemci ↔ sunucu mesaj sözleşmesi ve state şekli (istemci tarafı tipleri için).
import type { Arch } from './balance';

export type GameMode = 'quick' | 'private' | 'bot';
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
  /** Sahip olunan noktaya karakol kurar ya da eski kademe karakolu yükseltir. */
  outpost_build: { index: number };
  rematch: Record<string, never>;
}

export interface JoinOptions {
  mode: GameMode;
  name?: string;
  level?: BotLevel;
}

/** Sunucu → istemci görsel efekt olayları ('fx' mesajı) */
export type FxEvent =
  | { t: 'special'; side: number; tier: number; x0: number; x1: number }
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

export interface IPlayer {
  id: string;
  name: string;
  side: number;
  isBot: boolean;
  connected: boolean;
  left: boolean;
  gold: number;
  xp: number;
  tier: number;
  baseHp: number;
  baseMaxHp: number;
  queue: { length: number; at(i: number): string | undefined; forEach(cb: (v: string, i: number) => void): void };
  trainProgress: number;
  specialCd: number;
  turrets: { length: number; at(i: number): ITurretSlot | undefined };
  stance: 'attack' | 'hold';
  wantsRematch: boolean;
  kills: number;
  lost: number;
  trained: number;
  goldEarned: number;
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
  status: number; // STATUS_SLOW | STATUS_BURN bitleri
}

export interface IOutpost {
  x: number;
  owner: number;
  capSide: number;
  cap: number;
  built: boolean;
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
}
