// Botun gücünü ölçmek için oyuncu taklitleri (tools/bot-vs-rusher.ts kullanır):
// Strategist (planlı), Turtle (kaplumbağa), Rusher (saldırgan), Expert (usta: rakibe göre karşı birim, erken orta karakol).
import * as B from '../shared/balance';
import type { Arch } from '../shared/balance';
import type { Simulation } from '../server/sim';
import type { Player, Unit } from '../server/state';

function armyValue(units: Unit[]): number {
  let v = 0;
  for (const u of units) v += u.def.cost * (0.4 + 0.6 * (u.hp / u.maxHp));
  return v;
}

/**
 * Planlı oyuncu: orduyu toplar (Savun), üstün olunca topluca hücum eder, orta karakolu hemen kurup
 * silahlandırır, kalesine erken kule kurar, sırayı hep dolu tutar, özel gücü hücumla birlikte kullanır.
 */
export class Strategist {
  private timer = 0.5;
  private n = 0;

  constructor(
    private sim: Simulation,
    private p: Player,
  ) {}

  update(dt: number) {
    if (this.sim.state.phase === 'ended') {
      this.p.wantsRematch = true;
      return;
    }
    if (!this.sim.playing()) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.35;
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
    enemies.sort((a, b) => (a.x - b.x) * dir);
    const myVal = armyValue(own);
    const enVal = armyValue(enemies);

    // toplan → üstün olunca hücum → eriyince çekil
    if (p.stance === 'hold') {
      if (own.length >= 6 && myVal >= enVal * 1.3) {
        sim.setStance(p, 'attack');
        if (p.specialCd <= 0 && enemies.length >= 3) sim.special(p);
      }
    } else if (myVal < enVal * 0.7) sim.setStance(p, 'hold');
    // savunmada özel güç
    if (p.specialCd <= 0 && enemies.filter((u) => (u.x - myBase) * dir < 600).length >= 4) sim.special(p);

    // karakol: en öndeki noktaya kur + silahlandır
    let best = -1;
    let bestF = -Infinity;
    sim.state.outposts.forEach((o, i) => {
      if (o.owner !== p.side) return;
      const f = (o.x - myBase) * dir;
      if (f > bestF && (!o.built || o.tier < p.tier || !o.armed)) {
        bestF = f;
        best = i;
      }
    });
    if (best >= 0) sim.outpostBuild(p, best);

    // kale kuleleri: erkenden en iyisi, sonra ikinci yuva, çağ atlayınca yenile
    for (let i = 0; i < p.turrets.length; i++) {
      const t = p.turrets.at(i)!;
      for (let g = 2; g >= 0; g--) {
        if (t.tier < 0 && p.gold > B.turretDef(p.tier, g).cost + 40) {
          sim.turretBuy(p, i, g);
          break;
        }
        if (t.tier >= 0 && t.tier < p.tier && sim.turretUpgrade(p, i, g)) break;
      }
    }
    if (p.tier >= 1 && p.turrets.length < 2) sim.slotBuy(p);

    // birimler: sıra hep dolu, karşı birim + her 3 birimde bir ağır
    let guard = 0;
    while (p.queue.length < B.MAX_QUEUE && guard++ < 5) {
      let arch: Arch;
      const front = enemies[0];
      if (front && Math.random() < 0.6) arch = B.COUNTERED_BY[front.arch as Arch];
      else arch = this.n % 3 === 2 ? 'heavy' : this.n % 2 ? 'ranged' : 'melee';
      if (p.gold < B.unitDef(p.tier, arch).cost) arch = 'melee';
      if (!sim.train(p, arch)) break;
      this.n++;
    }
  }
}

/**
 * Kaplumbağa oyuncu: kalesine erken ve hep en iyi kuleleri dizer, yakın noktaya silahlı karakol kurar,
 * Savun'da bekler; ancak ordusu rakibin iki katına çıkınca hücuma geçer.
 */
export class Turtle {
  private timer = 0.5;
  private n = 0;

  constructor(
    private sim: Simulation,
    private p: Player,
  ) {}

  update(dt: number) {
    if (this.sim.state.phase === 'ended') {
      this.p.wantsRematch = true;
      return;
    }
    if (!this.sim.playing()) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.35;
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
    enemies.sort((a, b) => (a.x - b.x) * dir);
    const myVal = armyValue(own);
    const enVal = armyValue(enemies);
    if (p.stance === 'hold') {
      if (own.length >= 10 && myVal >= enVal * 2) sim.setStance(p, 'attack');
    } else if (myVal < enVal * 1.2) sim.setStance(p, 'hold');
    if (p.specialCd <= 0 && enemies.filter((u) => (u.x - myBase) * dir < 650).length >= 3) sim.special(p);

    // önce kuleler (yuvalar + en iyi derece), sonra yakın karakol
    for (let i = 0; i < p.turrets.length; i++) {
      const t = p.turrets.at(i)!;
      for (let g = 2; g >= 0; g--) {
        if (t.tier < 0 && sim.turretBuy(p, i, g)) break;
        if (t.tier >= 0 && (t.tier < p.tier || t.grade < g) && sim.turretUpgrade(p, i, g)) break;
      }
    }
    if (p.turrets.length < B.MAX_SLOTS && p.gold > B.SLOT_COSTS[p.turrets.length] + 100) sim.slotBuy(p);
    sim.state.outposts.forEach((o, i) => {
      if (o.owner === p.side && (o.x - myBase) * dir < 600) sim.outpostBuild(p, i);
    });

    let guard = 0;
    while (p.queue.length < 3 && guard++ < 5) {
      let arch: Arch;
      const front = enemies[0];
      if (front && Math.random() < 0.6) arch = B.COUNTERED_BY[front.arch as Arch];
      else arch = this.n % 3 === 2 ? 'heavy' : this.n % 2 ? 'ranged' : 'melee';
      if (p.gold < B.unitDef(p.tier, arch).cost) break;
      if (!sim.train(p, arch)) break;
      this.n++;
    }
  }
}

export class Rusher {
  private timer = 0.5;
  private n = 0;

  constructor(
    private sim: Simulation,
    private p: Player,
  ) {}

  update(dt: number) {
    if (this.sim.state.phase === 'ended') {
      this.p.wantsRematch = true;
      return;
    }
    if (!this.sim.playing()) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.35;
    this.think();
  }

  private think() {
    const { sim, p } = this;
    const dir = B.dirOf(p.side);
    const myBase = B.baseFrontX(p.side);
    sim.evolve(p);
    sim.setStance(p, 'attack');

    const enemies: Unit[] = [];
    let myFront = -Infinity;
    sim.state.units.forEach((u) => {
      if (u.side !== p.side) enemies.push(u);
      else myFront = Math.max(myFront, (u.x - myBase) * dir);
    });
    enemies.sort((a, b) => (a.x - b.x) * dir);

    // özel güç: kalabalık bir düşman grubuna
    if (p.specialCd <= 0 && enemies.length >= 4) sim.special(p);

    // karakol: en öndeki noktaya hemen kur, sonra kule ekle
    let best = -1;
    let bestF = -Infinity;
    sim.state.outposts.forEach((o, i) => {
      if (o.owner !== p.side) return;
      const f = (o.x - myBase) * dir;
      if (f > bestF && (!o.built || o.tier < p.tier || !o.armed)) {
        bestF = f;
        best = i;
      }
    });
    if (best >= 0) sim.outpostBuild(p, best);

    // kale kulesi: 45. saniyeden sonra bir Orta kule, çağ atlayınca yenile
    const t0 = p.turrets.at(0)!;
    if (sim.state.time > 45) {
      if (t0.tier < 0) sim.turretBuy(p, 0, 1);
      else if (t0.tier < p.tier) sim.turretUpgrade(p, 0, 1);
    }

    // birimler: sıra hep dolu; öndeki düşmana karşı, her 4 birimde bir ağır
    let guard = 0;
    while (p.queue.length < B.MAX_QUEUE && guard++ < 5) {
      let arch: Arch;
      const front = enemies[0];
      if (front && Math.random() < 0.7) arch = B.COUNTERED_BY[front.arch as Arch];
      else arch = this.n % 4 === 3 ? 'heavy' : this.n % 3 === 0 ? 'ranged' : 'melee';
      if (p.gold < B.unitDef(p.tier, arch).cost) arch = 'melee';
      if (!sim.train(p, arch)) break;
      this.n++;
    }
  }
}

/**
 * Usta oyuncu: iyi bir insanın yaptıklarını taklit eder. Orta noktayı erken alıp karakol kurar ve silahlandırır,
 * rakibin tüm ordusuna karşı birim seçer, kalesine erkenden Orta kule koyar, rakip saldırıp savunmasına
 * çarpınca karşı hücuma geçer, özel gücü en kalabalık kümeye vurur.
 */
export class Expert {
  private timer = 0.5;

  constructor(
    private sim: Simulation,
    private p: Player,
  ) {}

  update(dt: number) {
    if (this.sim.state.phase === 'ended') {
      this.p.wantsRematch = true;
      return;
    }
    if (!this.sim.playing()) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.25;
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
    enemies.sort((a, b) => (a.x - b.x) * dir);
    const myVal = armyValue(own);
    const enVal = armyValue(enemies);
    const unitCost = B.unitDef(p.tier, 'melee').cost;

    // Erken: orta noktayı almak için hücum; sonra üstünlükte hücum, değilse savun
    if (sim.state.time < 40) sim.setStance(p, 'attack');
    else if (p.stance === 'hold') {
      if ((own.length >= 5 && myVal >= enVal * 1.15) || own.length >= B.MAX_UNITS_PER_SIDE - 3) sim.setStance(p, 'attack');
    } else if (myVal < enVal * 0.85) sim.setStance(p, 'hold');

    // Özel güç: öndeki düşmandan itibaren alanda en az 4 düşman
    if (p.specialCd <= 0 && enemies.length) {
      const f = enemies[0];
      const n = enemies.filter((u) => {
        const d = (u.x - f.x) * dir;
        return d >= -60 && d <= B.SPECIAL_WIDTH;
      }).length;
      if (n >= 4) sim.special(p);
    }

    // Karakol: en öndekini kur → yükselt → silahlandır
    let best = -1;
    let bestF = -Infinity;
    sim.state.outposts.forEach((o, i) => {
      if (o.owner !== p.side) return;
      const f = (o.x - myBase) * dir;
      if (f > bestF && (!o.built || o.tier < p.tier || !o.armed)) {
        bestF = f;
        best = i;
      }
    });
    if (best >= 0 && p.gold > unitCost) sim.outpostBuild(p, best);

    // Kale: bir Orta kule (30. sn), çağ atlayınca yenile; 2. çağda ikinci yuva
    for (let i = 0; i < p.turrets.length; i++) {
      const t = p.turrets.at(i)!;
      if (t.tier < 0 && sim.state.time > 30 && p.gold > B.turretDef(p.tier, 1).cost + unitCost) sim.turretBuy(p, i, 1);
      else if (t.tier >= 0 && t.tier < p.tier) sim.turretUpgrade(p, i, 1);
    }
    if (p.tier >= 2 && p.turrets.length < 2 && p.gold > B.SLOT_COSTS[1] + unitCost * 3) sim.slotBuy(p);

    // Birimler: rakibin tüm ordusuna (maliyet ağırlıklı) karşı; ön safı tutmak için ~%30 ağır
    const w: Record<Arch, number> = { melee: 0, ranged: 0, heavy: 0 };
    for (const u of enemies) w[u.arch as Arch] += u.def.cost;
    let dom: Arch | null = null;
    for (const a of B.ARCHES) if (w[a] > 0 && (!dom || w[a] > w[dom])) dom = a;
    let heavies = 0;
    for (const u of own) if (u.arch === 'heavy') heavies++;
    let guard = 0;
    while (p.queue.length < 3 && guard++ < 5) {
      let arch: Arch = dom ? B.COUNTERED_BY[dom] : 'melee';
      if (heavies < 0.3 * (own.length + 1) && arch !== 'ranged') arch = 'heavy';
      if (p.gold < B.unitDef(p.tier, arch).cost) {
        if (enemies.length && (enemies[0].x - myBase) * dir < 500 && p.gold >= unitCost) arch = 'melee';
        else break;
      }
      if (!sim.train(p, arch)) break;
      if (arch === 'heavy') heavies++;
    }
  }
}
