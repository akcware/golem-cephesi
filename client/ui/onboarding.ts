// Yeni oyuncu rehberinin cihazda saklanan durumu: eğitim bitti mi, hangi ipuçları görüldü.
// İpucu koşulları da burada (hud.ts her güncellemede sorar).
import * as B from '../../shared/balance';
import type { IBattleState, IPlayer } from '../../shared/protocol';

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* yoksay */
  }
}

export function tutorialDone(): boolean {
  return load('gf_tut_done') === '1';
}
export function setTutorialDone() {
  save('gf_tut_done', '1');
}

let seen: Set<string> | undefined;
function seenTips(): Set<string> {
  if (!seen) {
    try {
      seen = new Set(JSON.parse(load('gf_tips') ?? '[]') as string[]);
    } catch {
      seen = new Set();
    }
  }
  return seen;
}
export function tipSeen(id: string): boolean {
  return seenTips().has(id);
}
export function markTip(id: string) {
  const s = seenTips();
  s.add(id);
  save('gf_tips', JSON.stringify([...s]));
}

/** Şu an koşulu tutan (ve daha önce görülmemiş) ilk ipucu. Sıra önem sırasıdır. */
export function pendingTip(st: IBattleState, me: IPlayer, side: number): string | undefined {
  let mine = 0;
  let enemies = 0;
  const foe = { melee: 0, ranged: 0, heavy: 0 };
  st.units.forEach((u) => {
    if (u.side === side) {
      if (!u.cmd) mine++;
    } else {
      enemies++;
      if (!u.cmd) foe[u.arch]++;
    }
  });
  const mods = B.cardMods(me.cards);
  const checks: [string, () => boolean][] = [
    ['low_castle', () => me.baseHp < me.baseMaxHp * 0.3],
    ['outnumbered', () => enemies >= mine + 5 && me.stance === 'attack'],
    ['enemy_heavy', () => foe.heavy >= 1],
    ['enemy_ranged', () => foe.ranged >= 2],
    ['enemy_melee', () => foe.melee >= 5],
    ['evolve_ready', () => me.tier < B.MAX_TIER && me.xp >= B.TIERS[me.tier + 1].xpToReach],
    ['source', () => !!st.src?.active],
    ['point_owned', () => {
      for (let i = 0; i < (st.outposts?.length ?? 0); i++) {
        const o = st.outposts.at(i);
        if (o && o.owner === side && !o.built && me.gold >= B.TIERS[me.tier].outpost.cost) return true;
      }
      return false;
    }],
    ['turret_gold', () => {
      let built = false;
      for (let i = 0; i < me.turrets.length; i++) if (me.turrets.at(i)!.tier >= 0) built = true;
      return !built && st.time > 45 && me.gold >= B.turretDef(me.tier, 0).cost;
    }],
    ['cmd_ready', () => !!me.cmdId && me.cmdCd <= 0 && enemies >= 2],
    ['special_ready', () => me.specialCd <= 0 && enemies >= 4 && mods.specialCd > 0],
    ['siege_soon', () => st.time > B.SIEGE_TIME - 45 && st.time < B.SIEGE_TIME],
  ];
  for (const [id, cond] of checks) if (!tipSeen(id) && cond()) return id;
  return undefined;
}
