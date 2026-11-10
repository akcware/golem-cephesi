// Yeni oyuncu rehberi: eğitim maçının adımları ve gerçek maçlarda bir kez çıkan ipuçları.
// Sunucu (server/tutorial.ts) adımları yönetir; istemciler metinleri shared/i18n'den id ile alır
// (tut.<id>.title / .text / .button, tip.<id>). Mobil için tools/export-lua.ts bu dosyayı da Lua'ya aktarır.

/** Rehberin işaret ettiği arayüz öğesi. */
export type TutTarget = 'none' | 'melee' | 'ranged' | 'heavy' | 'units' | 'stance' | 'outpost' | 'slot' | 'evolve' | 'card' | 'cmd' | 'special';

export interface TutStep {
  id: string;
  target: TutTarget;
  /** Adım düğmeyle geçilir (tut.<id>.button); yoksa sunucu oyuncunun hamlesini bekler. */
  button?: true;
}

/** Eğitim maçının adımları (sırayla). Sunucu state.tut ile hangi adımda olunduğunu bildirir. */
export const TUTORIAL: TutStep[] = [
  { id: 'intro', target: 'none', button: true },
  { id: 'train', target: 'melee' },
  { id: 'fight', target: 'none' },
  { id: 'counter', target: 'melee' },
  { id: 'heavy', target: 'ranged' },
  { id: 'hold', target: 'stance' },
  { id: 'gather', target: 'units' },
  { id: 'capture', target: 'none' },
  { id: 'outpost', target: 'outpost' },
  { id: 'turret', target: 'slot' },
  { id: 'evolve', target: 'evolve' },
  { id: 'card', target: 'card' },
  { id: 'cmd', target: 'cmd' },
  { id: 'special', target: 'special' },
  { id: 'finish', target: 'none' },
];

export function tutIndex(id: string): number {
  return TUTORIAL.findIndex((s) => s.id === id);
}

/**
 * Kademeli açılım: eğitimde bir arayüz öğesi, tanıtıldığı adıma gelinene kadar gizli kalır.
 * (Eğitim dışındaki maçlarda her şey görünür.)
 */
export const TUT_REVEAL: Record<string, string> = {
  units: 'train',
  stance: 'hold',
  outposts: 'capture',
  slots: 'turret',
  evolve: 'evolve',
  cmd: 'cmd',
  special: 'special',
};

export interface TipDef {
  id: string;
  target: TutTarget;
}

/**
 * Gerçek maçlarda, bir durum ilk kez yaşanınca bir kez çıkan ipuçları.
 * Koşulları istemciler kendisi denetler; görülenler cihazda saklanır.
 */
export const TIPS: TipDef[] = [
  { id: 'enemy_ranged', target: 'melee' },
  { id: 'enemy_heavy', target: 'ranged' },
  { id: 'enemy_melee', target: 'heavy' },
  { id: 'point_owned', target: 'outpost' },
  { id: 'turret_gold', target: 'slot' },
  { id: 'evolve_ready', target: 'evolve' },
  { id: 'cmd_ready', target: 'cmd' },
  { id: 'special_ready', target: 'special' },
  { id: 'source', target: 'none' },
  { id: 'outnumbered', target: 'stance' },
  { id: 'low_castle', target: 'stance' },
  { id: 'siege_soon', target: 'none' },
];

export function tipDef(id: string): TipDef | undefined {
  return TIPS.find((t) => t.id === id);
}
