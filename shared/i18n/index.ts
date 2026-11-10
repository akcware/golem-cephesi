// Localization: t() and helpers that turn game ids (shared/balance.ts) into display text.
// English is the source language and the default; the server never sets a language, so anything
// it builds from these helpers (bot names) is English. Clients call setLang() once at startup.
import type { Arch, CardCat, SourceKind, TurretDef } from '../balance';
import { TIERS } from '../balance';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { pt } from './pt';
import { tr } from './tr';

export type MsgKey = keyof typeof en;
export type Lang = 'en' | 'tr' | 'de' | 'es' | 'fr' | 'pt';

export const LANGS: Lang[] = ['en', 'tr', 'de', 'es', 'fr', 'pt'];
/** Language names in their own language (for the language switch). */
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
};
export const DICTS: Record<Lang, Record<MsgKey, string>> = { en, tr, de, es, fr, pt };

let current: Lang = 'en';

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as string[]).includes(v);
}
export function setLang(lang: Lang) {
  current = lang;
}
export function getLang(): Lang {
  return current;
}

/** Languages that write decimals with a comma (1,5). */
export const DECIMAL_COMMA = new Set<string>(['tr', 'de', 'fr', 'es', 'pt']);

/** Decimal number in the language's format (1.5 / 1,5). digits: fixed decimals (toFixed). */
export function fmtDec(n: number, digits?: number, lang: Lang = current): string {
  const s = digits === undefined ? String(n) : n.toFixed(digits);
  return DECIMAL_COMMA.has(lang) ? s.replace('.', ',') : s;
}

export type Params = Record<string, string | number>;

/** Text for key with {placeholders} filled in. Numbers are formatted for the language. */
export function t(key: MsgKey, params?: Params, lang: Lang = current): string {
  const s = DICTS[lang][key] ?? en[key] ?? key;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = params[k];
    if (v === undefined) return m;
    return typeof v === 'number' ? fmtDec(v, undefined, lang) : v;
  });
}

/** Percentage (25 → "25%" / "%25"). */
export function fmtPct(n: number, lang: Lang = current): string {
  return t('num.pct', { n: Math.round(n) }, lang);
}

// ── game text ──────────────────────────────────────────────
// Keys are built from ids; tools/i18n-check.ts verifies every one of them exists.
const dyn = (key: string, params?: Params, lang?: Lang) => t(key as MsgKey, params, lang);
const tierKey = (tier: number) => TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))].key;

export const tierName = (tier: number, lang?: Lang) => dyn(`tier.${tierKey(tier)}`, undefined, lang);
export const archName = (arch: Arch, lang?: Lang) => dyn(`arch.${arch}`, undefined, lang);
export const unitName = (tier: number, arch: Arch, lang?: Lang) => dyn(`unit.${tierKey(tier)}.${arch}`, undefined, lang);
export const abilityName = (tier: number, arch: Arch, lang?: Lang) => dyn(`ability.${tierKey(tier)}.${arch}`, undefined, lang);
export const abilityDesc = (tier: number, arch: Arch, lang?: Lang) => dyn(`ability.${tierKey(tier)}.${arch}.desc`, undefined, lang);
export const specialName = (tier: number, lang?: Lang) => dyn(`special.${tierKey(tier)}`, undefined, lang);
export const cmdName = (tier: number, lang?: Lang) => dyn(`cmd.${tierKey(tier)}`, undefined, lang);
export const gradeName = (grade: number, lang?: Lang) => dyn(`grade.${grade}`, undefined, lang);
export const turretName = (tier: number, grade: number, lang?: Lang) => dyn(`turret.${tierKey(tier)}.${grade}`, undefined, lang);
export const cardName = (id: string, lang?: Lang) => dyn(`card.${id}`, undefined, lang);
export const cardDesc = (id: string, lang?: Lang) => dyn(`card.${id}.desc`, undefined, lang);
export const cardCatName = (cat: CardCat, lang?: Lang) => dyn(`cardCat.${cat}`, undefined, lang);
export const sourceName = (kind: SourceKind | string, lang?: Lang) => dyn(`source.${kind}`, undefined, lang);
export const sourceDesc = (kind: SourceKind | string, lang?: Lang) => dyn(`source.${kind}.desc`, undefined, lang);
export const tutTitle = (id: string, lang?: Lang) => dyn(`tut.${id}.title`, undefined, lang);
export const tutText = (id: string, lang?: Lang) => dyn(`tut.${id}.text`, undefined, lang);
export const tutButton = (id: string, lang?: Lang) => dyn(`tut.${id}.button`, undefined, lang);
export const tipText = (id: string, lang?: Lang) => dyn(`tip.${id}`, undefined, lang);

/** Bot kinds the server puts in Player.botKind. */
export type BotKind = 'easy' | 'normal' | 'hard' | 'tutor';
export const BOT_KINDS: BotKind[] = ['easy', 'normal', 'hard', 'tutor'];
export const botName = (kind: BotKind | string, lang?: Lang) => dyn(`bot.${kind}`, undefined, lang);

/** Name to show for a player: bots are named in the viewer's language. */
export function playerName(p: { name: string; botKind?: string }, lang?: Lang): string {
  return p.botKind ? botName(p.botKind, lang) : p.name;
}

/** Short description of how a turret attacks. */
export function turretDesc(d: Pick<TurretDef, 'kind' | 'slow' | 'pierce' | 'chain' | 'burnDur'>, lang?: Lang): string {
  switch (d.kind) {
    case 'shot':
      return t('turretDesc.shot', undefined, lang);
    case 'lob':
      return t(d.slow ? 'turretDesc.lobSlow' : 'turretDesc.lob', undefined, lang);
    case 'pierce':
      return t('turretDesc.pierce', { n: d.pierce }, lang);
    case 'beam':
      return t('turretDesc.beam', { n: d.pierce }, lang);
    case 'chain':
      return t('turretDesc.chain', { n: d.chain + 1 }, lang);
    case 'fire':
      return t('turretDesc.fire', { n: d.burnDur }, lang);
    case 'frost':
      return t('turretDesc.frost', { n: d.slow }, lang);
  }
}
