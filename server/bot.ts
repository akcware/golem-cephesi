// Sunucu tarafında oynayan basit yapay zeka. Hile yapmaz: insan oyuncuyla aynı komutları kullanır.
import * as B from '../shared/balance';
import type { Arch } from '../shared/balance';
import type { BotLevel } from '../shared/protocol';
import type { Simulation } from './sim';
import type { Player, Unit } from './state';

const THINK: Record<BotLevel, number> = { easy: 1.2, normal: 0.9, hard: 0.45 };
const COUNTER_PROB: Record<BotLevel, number> = { easy: 0.2, normal: 0.5, hard: 0.7 };
const QUEUE_TARGET: Record<BotLevel, number> = { easy: 1, normal: 2, hard: 3 };
/** Hücum için ordu gücümüzün rakibe oranı (0 = hiç toplanmaz, tek tek yollar). */
const ATTACK_RATIO: Record<BotLevel, number> = { easy: 0, normal: 1.4, hard: 1.0 };

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

  constructor(
    private sim: Simulation,
    private p: Player,
    private level: BotLevel = 'normal',
  ) {}

  update(dt: number) {
    const phase = this.sim.state.phase;
    if (phase === 'ended') {
      this.p.wantsRematch = true;
      return;
    }
    if (!this.sim.playing()) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = THINK[this.level] * (0.7 + Math.random() * 0.6);
    this.think();
  }

  private think() {
    const { sim, p } = this;
    const dir = B.dirOf(p.side);
    const myBase = B.baseFrontX(p.side);

    sim.evolve(p);

    const enemies: Unit[] = [];
    const own: Unit[] = [];
    sim.state.units.forEach((u) => (u.side === p.side ? own : enemies).push(u));
    const mine = own.length;
    // bana en yakın düşman başta
    enemies.sort((a, b) => (a.x - b.x) * dir);
    const distToBase = (u: Unit) => (u.x - myBase) * dir;

    // Duruş: ordu üstünse dalga halinde saldır, ezilmeye başlarsa kulelerin dibine çekil
    const ratio = ATTACK_RATIO[this.level];
    if (ratio === 0) {
      sim.setStance(p, 'attack');
    } else {
      const myVal = armyValue(own);
      const enVal = armyValue(enemies);
      const heavyCost = B.unitDef(p.tier, 'heavy').cost;
      if (p.stance === 'hold') {
        const strong = mine >= 4 && myVal >= enVal * ratio;
        const capped = mine >= B.MAX_UNITS_PER_SIDE - 2 || p.gold > heavyCost * 3;
        if (strong || capped) sim.setStance(p, 'attack');
      } else if (myVal < enVal * 0.7) {
        sim.setStance(p, 'hold');
      }
    }

    // Özel güç: kaleye yaklaşan kalabalık varsa ya da kendi hücumumuzu desteklemek için
    if (p.specialCd <= 0 && enemies.length) {
      const near = enemies.filter((u) => distToBase(u) < 650).length;
      if (near >= 4 || enemies.length >= 8 || (p.stance === 'attack' && mine >= 6 && enemies.length >= 4)) sim.special(p);
    }

    const unitCost = B.unitDef(p.tier, 'melee').cost;

    // İleri karakollar: sahip olunan en öndeki boş noktaya kur, eski kademedekini yükselt
    const opReserve = unitCost * (this.level === 'easy' ? 4 : 2);
    let buildAt = -1;
    let bestFwd = -Infinity;
    let upgradeAt = -1;
    sim.state.outposts.forEach((o, i) => {
      if (o.owner !== p.side) return;
      const fwd = (o.x - myBase) * dir;
      if (!o.built && fwd > bestFwd) {
        bestFwd = fwd;
        buildAt = i;
      }
      if (o.built && o.tier < p.tier && upgradeAt < 0) upgradeAt = i;
    });
    // Normal/zor bot kurulmamış bir noktası varsa karakol için para biriktirir (kule ve fazladan birim almaz)
    let saving = false;
    if (buildAt >= 0) {
      if (p.gold > B.TIERS[p.tier].outpost.cost + opReserve) sim.outpostBuild(p, buildAt);
      else saving = this.level !== 'easy';
    } else if (upgradeAt >= 0) {
      const o = sim.state.outposts.at(upgradeAt)!;
      if (p.gold > B.outpostUpgradeCost(o.tier, p.tier) + opReserve * 1.5) sim.outpostBuild(p, upgradeAt);
    }

    // Kuleler
    const turretCost = B.turretDef(p.tier, 1).cost;
    let empty = -1;
    let outdated = -1;
    for (let i = 0; i < p.turrets.length; i++) {
      const t = p.turrets.at(i)!;
      if (t.tier < 0 && empty < 0) empty = i;
      if (t.tier >= 0 && t.tier < p.tier && outdated < 0) outdated = i;
    }
    const turretReserve = this.level === 'easy' ? unitCost * 3 : unitCost;
    // Parası yettiği en iyi dereceyi seç (kolay bot ağır kuleye hiç girmez)
    const maxGrade = this.level === 'easy' ? 1 : 2;
    const bestGrade = (budget: number): number => {
      for (let g = maxGrade; g >= 0; g--) if (budget > B.turretDef(p.tier, g).cost) return g;
      return -1;
    };
    if (saving) {
      // karakol için biriktiriyoruz
    } else if (empty >= 0 && mine >= 3) {
      const g = bestGrade(p.gold - turretReserve);
      if (g >= 0) sim.turretBuy(p, empty, g);
    } else if (
      empty < 0 &&
      p.turrets.length < B.MAX_SLOTS &&
      p.gold > B.SLOT_COSTS[p.turrets.length] + turretCost + unitCost * 4
    ) {
      sim.slotBuy(p);
    } else if (outdated >= 0) {
      const t = p.turrets.at(outdated)!;
      const refund = B.turretDef(t.tier, t.grade).cost * B.TURRET_REFUND;
      const g = bestGrade(p.gold + refund - unitCost * 2);
      if (g >= 0) sim.turretUpgrade(p, outdated, g);
    }

    // Birimler
    const pressure = enemies.length > 0 && distToBase(enemies[0]) < 500;
    let guard = 0;
    const queueTarget = saving && !pressure ? 1 : QUEUE_TARGET[this.level];
    while (p.queue.length < queueTarget && guard++ < 5) {
      const arch = this.pickArch(enemies, own, pressure);
      if (!arch || !sim.train(p, arch)) break;
    }
  }

  /** Üretilecek birim. null = şimdilik bekle (ağır golem için para biriktir). */
  private pickArch(enemies: Unit[], own: Unit[], pressure: boolean): Arch | null {
    const p = this.p;
    const cost = (a: Arch) => B.unitDef(p.tier, a).cost;

    if (this.level === 'easy') {
      if (Math.random() < 0.1 && p.gold >= cost('heavy')) return 'heavy';
      return Math.random() < 0.6 ? 'melee' : 'ranged';
    }

    // Ordu dengesi: her ~4 birime bir ağır golem (ön safı tutar, kaleye ekstra vurur)
    let heavies = 0;
    for (const u of own) if (u.arch === 'heavy') heavies++;
    for (let i = 0; i < p.queue.length; i++) if (p.queue.at(i)!.endsWith('heavy')) heavies++;
    const wantHeavy = heavies * 4 < own.length + p.queue.length + 1;

    let pick: Arch;
    if (enemies.length && Math.random() < COUNTER_PROB[this.level]) {
      const tally: Record<Arch, number> = { melee: 0, ranged: 0, heavy: 0 };
      for (const u of enemies.slice(0, 4)) tally[u.arch as Arch]++;
      let best: Arch = 'melee';
      for (const a of B.ARCHES) if (tally[a] > tally[best]) best = a;
      pick = B.COUNTERED_BY[best];
    } else {
      pick = wantHeavy ? 'heavy' : Math.random() < 0.55 ? 'melee' : 'ranged';
    }

    if (p.gold >= cost(pick)) return pick;
    // Ağır golem için para yetmiyorsa: baskı altındaysak ucuz birim, değilsek biriktir
    if (pick === 'heavy') return pressure ? 'melee' : null;
    return null;
  }
}
