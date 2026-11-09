// Sunucu tarafında oynayan yapay zeka. Hile yapmaz: insan oyuncuyla aynı komutları ve aynı ekonomiyi kullanır.
// Her "düşünme" adımında sırayla: çağ atla → duruş (topla / hücum / çekil) → özel güç → acil kule →
// karakol (kur → yükselt → kule ekle) → kale kuleleri (plan, yenileme) → birim üretimi (dengeli ordu).
// Gücünü ölçmek için: tools/new-vs-old.ts (önceki bot) ve tools/bot-vs-rusher.ts (oyuncu taklitleri).
import * as B from '../shared/balance';
import type { Arch } from '../shared/balance';
import type { BotLevel } from '../shared/protocol';
import type { Simulation } from './sim';
import type { Player, Unit } from './state';

interface BotConfig {
  think: number; // karar aralığı (sn)
  counter: number; // birim seçerken rakibin bileşimine karşılık verme ağırlığı (0-1)
  queue: number; // üretim sırasında tutulacak birim
  attackRatio: number; // hücum için gereken güç oranı (0 = hiç toplanmaz)
  defenseWeight: number; // rakibin kule/karakollarını hücum kararında ne kadar saydığı
  maxTurrets: number; // kalesine kuracağı en fazla kule
  maxGrade: number; // kurabileceği en iyi kule derecesi
  armOutposts: boolean; // karakollarına kule ekler mi
  heavyShare: number; // ordudaki ağır golem payı (kuşatmada artar)
  retreatRatio: number; // ordu gücü rakibin bu oranının altına düşünce Savun'a çekilir
  opening: number; // açılışta orta noktayı kapmak için bu kadar saniye hücum
  opFirst: boolean; // karakol işleri (kur → yükselt → kule ekle) birimlerden önce gelir
  opReserve: number; // karakol harcamasından sonra elde kalacak para (yakın dövüşçü sayısı)
  saveStop: boolean; // karakol için biriktirirken üretimi tamamen durdurur (ordu küçük değilse)
  specialNeed: number; // özel güç için alandaki en az düşman
  cmdNeed: number; // komutan darbesi için önündeki en az düşman
  openSpecial: boolean; // hücuma geçerken özel güçle açar
}

const CFG: Record<BotLevel, BotConfig> = {
  easy: { think: 1.2, counter: 0.2, queue: 1, attackRatio: 0, defenseWeight: 0, maxTurrets: 1, maxGrade: 1, armOutposts: false, heavyShare: 0.1, retreatRatio: 0, opening: 0, opFirst: false, opReserve: 4, saveStop: false, specialNeed: 6, cmdNeed: 4, openSpecial: false },
  normal: { think: 0.9, counter: 0.45, queue: 2, attackRatio: 1.3, defenseWeight: 0.3, maxTurrets: 2, maxGrade: 2, armOutposts: false, heavyShare: 0.25, retreatRatio: 0.7, opening: 40, opFirst: true, opReserve: 1, saveStop: true, specialNeed: 5, cmdNeed: 3, openSpecial: false },
  hard: { think: 0.6, counter: 0.65, queue: 2, attackRatio: 1.3, defenseWeight: 0.3, maxTurrets: 2, maxGrade: 2, armOutposts: true, heavyShare: 0.25, retreatRatio: 0.7, opening: 40, opFirst: true, opReserve: 1, saveStop: true, specialNeed: 5, cmdNeed: 3, openSpecial: false },
};

/** Normal/zor botun çağ kartı tercih sırası (baştaki daha çok tercih edilir). */
const CARD_PREF = ['warcry', 'vital', 'loot', 'vein', 'foundry', 'alloy', 'banner', 'marksman', 'wisdom', 'distill', 'echo', 'lens', 'ricochet', 'masonry', 'rampart'];

/** Ordunun kabaca gücü: kalan cana göre ağırlıklı maliyet. */
function armyValue(units: Unit[]): number {
  let v = 0;
  for (const u of units) v += u.def.cost * (0.4 + 0.6 * (u.hp / u.maxHp));
  return v;
}

export const BOT_NAMES: Record<BotLevel, string> = {
  easy: 'Çırak Simyacı',
  normal: 'Usta Simyacı',
  hard: 'Büyük Simyacı',
};

export class Bot {
  private timer = 1;
  private cfg: BotConfig;

  constructor(
    private sim: Simulation,
    private p: Player,
    private level: BotLevel = 'normal',
  ) {
    this.cfg = CFG[level];
  }

  update(dt: number) {
    const phase = this.sim.state.phase;
    if (phase === 'ended') {
      this.p.wantsRematch = true;
      return;
    }
    if (!this.sim.playing()) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.cfg.think * (0.7 + Math.random() * 0.6);
    this.think();
  }

  private think() {
    const { sim, p, cfg } = this;
    const dir = B.dirOf(p.side);
    const myBase = B.baseFrontX(p.side);
    const distToBase = (u: Unit) => (u.x - myBase) * dir;

    sim.evolve(p);
    if (p.picks > 0) this.pickCard();

    const own: Unit[] = [];
    const enemies: Unit[] = [];
    sim.state.units.forEach((u) => (u.side === p.side ? own : enemies).push(u));
    enemies.sort((a, b) => distToBase(a) - distToBase(b)); // kaleme en yakın düşman başta
    const mine = own.length;
    const mods = sim.modsOf(p.side);
    const unitCost = B.unitDef(p.tier, 'melee').cost;
    const heavyCost = B.unitCost(p.tier, 'heavy', mods);
    const near = enemies.filter((u) => distToBase(u) < 650).length;
    const pressure = enemies.length > 0 && distToBase(enemies[0]) < 500;

    // Rakibin sabit savunması: kale kuleleri + kurulu karakollar (silahlıysa daha değerli)
    const foe = sim.player(1 - p.side);
    let enemyDefense = 0;
    let enemyForts = 0;
    if (foe) {
      for (let i = 0; i < foe.turrets.length; i++) {
        const t = foe.turrets.at(i)!;
        if (t.tier >= 0) enemyDefense += B.turretDef(t.tier, t.grade).cost;
      }
    }
    sim.state.outposts.forEach((o) => {
      if (o.owner !== 1 - p.side || !o.built) return;
      enemyForts++;
      enemyDefense += B.TIERS[o.tier].outpost.cost * 0.5 + (o.armed ? B.TIERS[o.tier].outpost.armCost : 0);
    });

    // 1) Duruş: ordu üstünse dalga halinde saldır, ezilmeye başlarsa kulelerin dibine çekil
    const myVal = armyValue(own);
    const enVal = armyValue(enemies);
    if (cfg.attackRatio === 0 || sim.state.time < cfg.opening) {
      sim.setStance(p, 'attack');
    } else {
      // Eter Kaynağı belirdiyse: ordumuz yeterince güçlüyse kaynağı almaya çık (bizim yarımızdaysa daha istekli)
      const src = sim.state.src;
      const srcNear = src.active && Math.abs(src.x - myBase) < B.WORLD_W / 2;
      const forSource = src.active && mine >= 4 && myVal >= enVal * (srcNear ? 0.8 : 1);
      if (p.stance === 'hold') {
        const strong = mine >= 4 && myVal >= cfg.attackRatio * (enVal + cfg.defenseWeight * enemyDefense);
        const capped = mine >= B.MAX_UNITS_PER_SIDE - 2 || p.gold > heavyCost * 3;
        if (strong || capped || forSource) {
          sim.setStance(p, 'attack');
          // hücumu özel güçle aç: önündeki düşmanları erit
          if (cfg.openSpecial && p.specialCd <= 0 && enemies.length >= 3) sim.special(p);
        }
      } else if (myVal < enVal * cfg.retreatRatio && !(forSource && srcNear)) {
        sim.setStance(p, 'hold');
      }
    }

    // Komutan: önündeki kalabalığın üstüne Sarsıcı Darbe
    const cmd = p.cmdId ? sim.state.units.get(p.cmdId) : undefined;
    if (cmd && p.cmdCd <= 0) {
      const ahead = enemies.filter((e) => {
        const d = (e.x - cmd.x) * dir;
        return d > -20 && d < B.CMD_LEAP + B.CMD_SLAM_R;
      });
      const need = cfg.cmdNeed;
      const worth = ahead.length >= need || (this.level !== 'easy' && ahead.some((e) => e.cmd));
      if (worth) sim.cmdSkill(p);
    }

    // 2) Özel güç: kaleye yaklaşan kalabalık, ya da en öndeki düşmanın arkasında yeterince birim varsa
    if (p.specialCd <= 0 && enemies.length) {
      const front = enemies[0];
      const inZone = enemies.filter((u) => {
        const d = (u.x - front.x) * dir;
        return d >= -60 && d <= B.SPECIAL_WIDTH;
      }).length;
      const need = cfg.specialNeed;
      if (near >= 4 || inZone >= need || (p.stance === 'attack' && mine >= 6 && inZone >= 3)) sim.special(p);
    }

    // Kale kulesi bilgisi
    let empty = -1;
    let outdated = -1;
    let weakest = -1;
    let built = 0;
    for (let i = 0; i < p.turrets.length; i++) {
      const t = p.turrets.at(i)!;
      if (t.tier < 0 && empty < 0) empty = i;
      if (t.tier >= 0) built++;
      if (t.tier >= 0 && t.tier < p.tier && outdated < 0) outdated = i;
      if (t.tier === p.tier && t.grade < cfg.maxGrade && weakest < 0) weakest = i;
    }
    const bestGrade = (budget: number): number => {
      for (let g = cfg.maxGrade; g >= 0; g--) if (budget > B.turretDef(p.tier, g).cost) return g;
      return -1;
    };

    // 3) Acil savunma: kaleye kalabalık geliyorsa biriktirdiği parayı kuleye yatırır (boş yuvaya kur, eskiyse yenile)
    // parası taşıyorsa (üretim hızı sınırına dayandıysa) bütün yuvalara kule
    const rich = p.gold > heavyCost * 8;
    const want = rich ? B.MAX_SLOTS : Math.min(cfg.maxTurrets, p.tier === 0 ? 1 : p.tier < 3 ? 2 : 3);
    if (near >= 3) {
      if (empty >= 0 && built < want) {
        const g = bestGrade(p.gold);
        if (g >= 0 && sim.turretBuy(p, empty, g)) {
          built++;
          empty = -1;
        }
      } else if (outdated >= 0) {
        const t = p.turrets.at(outdated)!;
        const g = bestGrade(p.gold + B.turretDef(t.tier, t.grade).cost * B.TURRET_REFUND);
        if (g >= 0 && sim.turretUpgrade(p, outdated, g)) outdated = -1;
      }
    }

    // 4) Karakollar: en öndeki noktada sıradaki iş (kur → kademesini yükselt → üstüne kule ekle)
    const opReserve = unitCost * cfg.opReserve;
    let opAt = -1;
    let opCost = 0;
    let bestFwd = -Infinity;
    sim.state.outposts.forEach((o, i) => {
      if (o.owner !== p.side) return;
      const fwd = (o.x - myBase) * dir;
      let cost = -1;
      if (!o.built) cost = B.TIERS[p.tier].outpost.cost;
      else if (o.tier < p.tier) cost = B.outpostUpgradeCost(o.tier, p.tier);
      else if (cfg.armOutposts && !o.armed) cost = B.TIERS[o.tier].outpost.armCost;
      if (cost >= 0 && fwd > bestFwd) {
        bestFwd = fwd;
        opAt = i;
        opCost = cost;
      }
    });
    // Normal/zor bot karakol için para biriktirir (kule ve fazladan birim almaz)
    let saving = false;
    if (opAt >= 0) {
      if (p.gold >= opCost + opReserve) sim.outpostBuild(p, opAt);
      else saving = cfg.opFirst && !pressure;
    }

    // 5) Kale kuleleri: çağ ilerledikçe daha çok kule; eskiyenleri yenile, para artarsa dereceyi yükselt.
    const turretReserve = this.level === 'easy' ? unitCost * 3 : unitCost;
    if (!saving) {
      if (empty >= 0 && built < want && mine >= 3) {
        const g = bestGrade(p.gold - turretReserve);
        if (g >= 0) sim.turretBuy(p, empty, g);
      } else if (outdated >= 0) {
        const t = p.turrets.at(outdated)!;
        const refund = B.turretDef(t.tier, t.grade).cost * B.TURRET_REFUND;
        const g = bestGrade(p.gold + refund - unitCost * 2);
        if (g >= 0) sim.turretUpgrade(p, outdated, g);
      } else if (empty < 0 && built < want && p.turrets.length < B.MAX_SLOTS) {
        if (p.gold > B.SLOT_COSTS[p.turrets.length] + B.turretDef(p.tier, 1).cost + unitCost * 4) sim.slotBuy(p);
      } else if (weakest >= 0 && p.gold > heavyCost * 4) {
        const t = p.turrets.at(weakest)!;
        const refund = B.turretDef(t.tier, t.grade).cost * B.TURRET_REFUND;
        const g = bestGrade(p.gold + refund - heavyCost * 2);
        if (g > t.grade) sim.turretUpgrade(p, weakest, g);
      }
    }

    // 6) Birimler
    const siege = enemyForts > 0;
    let guard = 0;
    const queueTarget = saving ? (cfg.saveStop && mine >= 4 ? 0 : 1) : cfg.queue;
    while (p.queue.length < queueTarget && guard++ < 5) {
      const arch = this.pickArch(enemies, own, pressure, siege);
      if (!arch || !sim.train(p, arch)) break;
    }
  }

  /** Çağ kartı seçimi: kolay bot rastgele, diğerleri tercih sırasına göre. */
  private pickCard() {
    const { p, sim } = this;
    const offer: string[] = [];
    p.offer.forEach((id) => offer.push(id));
    if (!offer.length) return;
    let id = offer[Math.floor(Math.random() * offer.length)];
    if (this.level !== 'easy') {
      let best = Infinity;
      for (const o of offer) {
        const r = CARD_PREF.indexOf(o);
        const rank = r < 0 ? 99 : r;
        if (rank < best) {
          best = rank;
          id = o;
        }
      }
    }
    sim.cardPick(p, id);
  }

  /** Üretilecek birim. null = şimdilik bekle (ağır golem için para biriktir). */
  private pickArch(enemies: Unit[], own: Unit[], pressure: boolean, siege: boolean): Arch | null {
    const p = this.p;
    const mods = this.sim.modsOf(p.side);
    const cost = (a: Arch) => B.unitCost(p.tier, a, mods);

    // Kendi ordumuzun (sıradakiler dahil) bileşimi; komutan sayılmaz
    const n: Record<Arch, number> = { melee: 0, ranged: 0, heavy: 0 };
    for (const u of own) if (!u.cmd) n[u.arch as Arch]++;
    for (let i = 0; i < p.queue.length; i++) n[p.queue.at(i)!.split(':')[1] as Arch]++;
    const total = n.melee + n.ranged + n.heavy;

    // Hedef oran: dengeli temel karışım + rakibin bileşimine karşı birimler. Ordu tek tipe kaymaz;
    // böylece rakip tek bir karşı birimle orduyu eritemez (eski botun en büyük zaafı buydu).
    const hs = this.cfg.heavyShare + (siege ? 0.1 : 0);
    const target: Record<Arch, number> = { melee: (1 - hs) * 0.55, ranged: (1 - hs) * 0.45, heavy: hs };
    if (enemies.length) {
      const e: Record<Arch, number> = { melee: 0, ranged: 0, heavy: 0 };
      enemies.forEach((u, i) => (e[u.arch as Arch] += i < 6 ? 2 : 1)); // kaleye yakın olanlar daha önemli
      const sum = e.melee + e.ranged + e.heavy;
      const c = this.cfg.counter * 0.6;
      for (const a of B.ARCHES) target[a] *= 1 - c;
      for (const a of B.ARCHES) target[B.COUNTERED_BY[a]] += (c * e[a]) / sum;
    }
    // En çok eksiği olan birim tipi
    let pick: Arch = 'melee';
    let most = -Infinity;
    for (const a of B.ARCHES) {
      const lack = target[a] * (total + 1) - n[a];
      if (lack > most) {
        most = lack;
        pick = a;
      }
    }

    if (p.gold >= cost(pick)) return pick;
    // Pahalı birime para yetmiyorsa: baskı altındaysak ucuz birim, değilsek biriktir
    if (pick !== 'melee') return pressure ? 'melee' : null;
    return null;
  }
}
