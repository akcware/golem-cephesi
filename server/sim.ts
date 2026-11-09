// Oyunun asıl kuralları. Sunucu-otoriter: tüm hesaplar burada yapılır, istemci sadece gösterir.
// Colyseus Room'dan bağımsızdır; balans simülasyonu (tools/balance-sim.ts) da bunu kullanır.
import * as B from '../shared/balance';
import type { Arch } from '../shared/balance';
import { STATUS_AURA, STATUS_BURN, STATUS_SLOW, type EndReason, type FxEvent } from '../shared/protocol';
import { BattleState, Outpost, Player, TurretSlot, Unit } from './state';

type Emit = (fx: FxEvent) => void;
/** Hasarın kaynağı: yetenekler buna göre davranır (kalkan menzilliyi, zırh yakın dövüşü keser). */
type DmgSrc = 'melee' | 'ranged' | 'blast' | 'burn' | 'reflect';

export class Simulation {
  private nextId = 1;
  private tickNo = 0;
  private pending: { t: number; fn: () => void }[] = [];
  /** Yanan alanlar: side = alanı yaratan taraf (karşı tarafın birimlerini yakar). */
  private zones: { side: number; x: number; r: number; dps: number; t: number }[] = [];
  /** Bu adımda ölen birimler; adım sonunda state'ten silinir (aynı birim iki kez ölmesin). */
  private dying = new Set<Unit>();

  constructor(
    public state: BattleState,
    private emit: Emit = () => {},
  ) {}

  // ── yardımcılar ──────────────────────────────────────────
  player(side: number): Player | undefined {
    let found: Player | undefined;
    this.state.players.forEach((p) => {
      if (p.side === side) found = p;
    });
    return found;
  }

  playing(): boolean {
    return this.state.phase === 'playing' && !this.state.paused;
  }

  freeSide(): number {
    const taken = new Set<number>();
    this.state.players.forEach((p) => taken.add(p.side));
    return taken.has(0) ? 1 : 0;
  }

  addPlayer(id: string, name: string, isBot: boolean): Player {
    const p = new Player();
    p.id = id;
    p.name = name;
    p.isBot = isBot;
    p.side = this.freeSide();
    this.resetPlayer(p);
    this.state.players.set(id, p);
    return p;
  }

  private spend(p: Player, n: number) {
    p.goldF -= n;
    p.gold = Math.max(0, Math.floor(p.goldF));
  }

  private earn(p: Player, n: number, counts = true) {
    p.goldF += n;
    p.gold = Math.floor(p.goldF);
    if (counts) {
      p.earnedF += n;
      p.goldEarned = Math.floor(p.earnedF);
    }
  }

  private addXp(p: Player, n: number) {
    p.xpF += n;
    p.xp = Math.floor(p.xpF);
  }

  resetPlayer(p: Player) {
    p.goldF = B.START_GOLD;
    p.gold = B.START_GOLD;
    p.xpF = 0;
    p.xp = 0;
    p.tier = 0;
    p.baseMaxHp = B.TIERS[0].baseHp;
    p.baseHp = p.baseMaxHp;
    p.queue.clear();
    p.trainProgress = 0;
    p.specialCd = B.SPECIAL_START_CD;
    p.turrets.clear();
    p.turrets.push(new TurretSlot());
    p.stance = 'attack';
    p.wantsRematch = false;
    p.kills = 0;
    p.lost = 0;
    p.trained = 0;
    p.goldEarned = 0;
    p.earnedF = 0;
  }

  /** Maçı (yeniden) başlatır: geri sayım. */
  startMatch() {
    this.state.units.clear();
    this.pending = [];
    this.zones = [];
    this.dying.clear();
    this.state.outposts.clear();
    for (const x of B.OUTPOST_XS) {
      const o = new Outpost();
      o.x = x;
      this.state.outposts.push(o);
    }
    this.state.players.forEach((p) => this.resetPlayer(p));
    this.state.winner = -1;
    this.state.reason = '';
    this.state.time = 0;
    this.state.paused = false;
    this.state.countdown = B.COUNTDOWN_S;
    this.state.phase = 'countdown';
  }

  endGame(winner: number, reason: EndReason) {
    if (this.state.phase === 'ended') return;
    this.state.phase = 'ended';
    this.state.winner = winner;
    this.state.reason = reason;
    this.pending = [];
    this.zones = [];
    this.flushDead();
    this.emit({ t: 'end', winner, reason });
  }

  // ── oyuncu komutları ─────────────────────────────────────
  train(p: Player, arch: Arch): boolean {
    if (!this.playing() || !B.isArch(arch)) return false;
    if (p.queue.length >= B.MAX_QUEUE) return false;
    const def = B.unitDef(p.tier, arch);
    if (p.goldF < def.cost) return false;
    this.spend(p, def.cost);
    p.queue.push(`${p.tier}:${arch}`);
    return true;
  }

  cancel(p: Player, index: number): boolean {
    if (!this.playing()) return false;
    if (!Number.isInteger(index) || index < 0 || index >= p.queue.length) return false;
    const entry = p.queue.at(index)!;
    const [t, arch] = entry.split(':');
    const def = B.unitDef(Number(t), arch as Arch);
    p.queue.splice(index, 1);
    if (index === 0) p.trainProgress = 0;
    this.earn(p, def.cost, false);
    return true;
  }

  /** Sadece geliştirme sunucusunda (--dev) açık test komutu: altın / XP ver. */
  devGrant(p: Player, gold: number, xp: number) {
    if (Number.isFinite(gold) && gold > 0) this.earn(p, Math.min(gold, 1e7), false);
    if (Number.isFinite(xp) && xp > 0) this.addXp(p, Math.min(xp, 1e7));
  }

  setStance(p: Player, stance: unknown): boolean {
    if (stance !== 'attack' && stance !== 'hold') return false;
    if (this.state.phase !== 'playing' && this.state.phase !== 'countdown') return false;
    p.stance = stance;
    return true;
  }

  evolve(p: Player): boolean {
    if (!this.playing() || p.tier >= B.MAX_TIER) return false;
    const next = B.TIERS[p.tier + 1];
    if (p.xpF < next.xpToReach) return false;
    p.tier += 1;
    const delta = next.baseHp - p.baseMaxHp;
    p.baseMaxHp = next.baseHp;
    p.baseHp = Math.min(p.baseMaxHp, p.baseHp + delta);
    this.emit({ t: 'evolve', side: p.side, tier: p.tier });
    return true;
  }

  slotBuy(p: Player): boolean {
    if (!this.playing() || p.turrets.length >= B.MAX_SLOTS) return false;
    const cost = B.SLOT_COSTS[p.turrets.length];
    if (p.goldF < cost) return false;
    this.spend(p, cost);
    p.turrets.push(new TurretSlot());
    return true;
  }

  turretBuy(p: Player, slot: number, grade: number): boolean {
    if (!this.playing() || !B.isGrade(grade)) return false;
    const t = p.turrets.at(slot);
    if (!t || t.tier >= 0) return false;
    const cost = B.turretDef(p.tier, grade).cost;
    if (p.goldF < cost) return false;
    this.spend(p, cost);
    t.tier = p.tier;
    t.grade = grade;
    t.cd = 0.5;
    return true;
  }

  turretSell(p: Player, slot: number): boolean {
    if (!this.playing()) return false;
    const t = p.turrets.at(slot);
    if (!t || t.tier < 0) return false;
    this.earn(p, B.turretDef(t.tier, t.grade).cost * B.TURRET_REFUND, false);
    t.tier = -1;
    t.tgt = '';
    return true;
  }

  /** Yuvadaki kuleyi satıp mevcut kademeden seçilen dereceyi kurar (tek tık; fark kadar altın). */
  turretUpgrade(p: Player, slot: number, grade: number): boolean {
    if (!this.playing() || !B.isGrade(grade)) return false;
    const t = p.turrets.at(slot);
    if (!t || t.tier < 0) return false;
    if (t.tier === p.tier && t.grade === grade) return false; // zaten aynısı
    const refund = B.turretDef(t.tier, t.grade).cost * B.TURRET_REFUND;
    const cost = B.turretDef(p.tier, grade).cost;
    if (p.goldF + refund < cost) return false;
    this.earn(p, refund, false);
    this.spend(p, cost);
    t.tier = p.tier;
    t.grade = grade;
    t.cd = 0.5;
    return true;
  }

  /** Sahip olunan noktaya karakol kurar; kuruluysa ve eski kademedeyse yükseltir. */
  outpostBuild(p: Player, index: number): boolean {
    if (!this.playing() || !Number.isInteger(index)) return false;
    const o = this.state.outposts.at(index);
    if (!o || o.owner !== p.side) return false;
    if (!o.built) {
      const def = B.TIERS[p.tier].outpost;
      if (p.goldF < def.cost) return false;
      this.spend(p, def.cost);
      o.built = true;
      o.tier = p.tier;
      o.maxHp = def.hp;
      o.hp = def.hp;
      o.cd = 0.5;
      this.emit({ t: 'outpost', i: index, k: 'built', side: p.side });
      return true;
    }
    if (o.tier >= p.tier) return false;
    const cost = B.outpostUpgradeCost(o.tier, p.tier);
    if (p.goldF < cost) return false;
    this.spend(p, cost);
    const frac = o.hp / o.maxHp;
    o.tier = p.tier;
    o.maxHp = B.TIERS[p.tier].outpost.hp;
    o.hp = Math.max(frac, 0.5) * o.maxHp;
    this.emit({ t: 'outpost', i: index, k: 'built', side: p.side });
    return true;
  }

  /** Tarafın en öndeki kurulu karakolu (yoksa undefined). */
  frontOutpost(side: number): Outpost | undefined {
    const dir = B.dirOf(side);
    let best: Outpost | undefined;
    this.state.outposts.forEach((o) => {
      if (o.owner === side && o.built && (!best || (o.x - best.x) * dir > 0)) best = o;
    });
    return best;
  }

  /** Yeni birimin doğduğu yer: en öndeki karakolun hemen arkası, yoksa kale kapısı. */
  private spawnPoint(side: number): number {
    const o = this.frontOutpost(side);
    return o ? o.x - B.dirOf(side) * (B.OUTPOST_HALF + 6) : B.spawnX(side);
  }

  special(p: Player): boolean {
    if (!this.playing() || p.specialCd > 0) return false;
    const dir = B.dirOf(p.side);
    // Bana en yakın (en önde) düşman birimi bul
    let front: Unit | undefined;
    this.state.units.forEach((u) => {
      if (u.side === p.side) return;
      if (!front || (u.x - front.x) * dir < 0) front = u;
    });
    if (!front) return false;
    const a = front.x - dir * 60;
    const b = front.x + dir * B.SPECIAL_WIDTH;
    const x0 = Math.min(a, b);
    const x1 = Math.max(a, b);
    const tier = p.tier;
    const dmg = B.TIERS[tier].special.damage;
    const side = p.side;
    p.specialCd = B.SPECIAL_CD;
    this.emit({ t: 'special', side, tier, x0, x1 });
    this.pending.push({
      t: B.SPECIAL_DELAY,
      fn: () => {
        const hits: Unit[] = [];
        this.state.units.forEach((u) => {
          if (u.side !== side && u.x >= x0 && u.x <= x1) hits.push(u);
        });
        for (const u of hits) this.damage(u, dmg, side, 'blast');
      },
    });
    return true;
  }

  // ── simülasyon adımı ─────────────────────────────────────
  tick(dt: number) {
    const s = this.state;
    if (s.phase === 'countdown') {
      s.countdown = Math.max(0, s.countdown - dt);
      if (s.countdown <= 0) s.phase = 'playing';
      return;
    }
    if (!this.playing()) return;
    this.tickNo++;
    s.time += dt;

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const e = this.pending[i];
      e.t -= dt;
      if (e.t <= 0) {
        this.pending.splice(i, 1);
        e.fn();
      }
    }

    s.players.forEach((p) => this.tickPlayer(p, dt));
    this.tickStatus(dt);
    this.tickCapture(dt);
    this.flushDead();
    this.tickUnits(dt);
    this.flushDead();
    if (s.phase !== 'playing') return;
    s.players.forEach((p) => this.tickTurrets(p, dt));
    this.tickOutpostTurrets(dt);
    this.flushDead();
  }

  /** Noktaları ele geçirme: alanda sadece bir tarafın birimi varsa çubuk o taraf lehine dolar. */
  private tickCapture(dt: number) {
    const rate = dt / B.CAPTURE_TIME;
    this.state.outposts.forEach((o, i) => {
      if (o.built) return; // kurulu karakol önce yıkılmalı
      const n = [0, 0];
      this.state.units.forEach((u) => {
        if (this.alive(u) && Math.abs(u.x - o.x) <= B.CAPTURE_RADIUS) n[u.side]++;
      });
      const only = n[0] > 0 && n[1] === 0 ? 0 : n[1] > 0 && n[0] === 0 ? 1 : -1;
      if (only < 0) return; // boş ya da çekişmeli: değişmez
      if (o.owner === only) {
        if (o.cap < 1) o.cap = Math.min(1, o.cap + rate);
        o.capSide = only;
        return;
      }
      if (o.owner >= 0) {
        // düşmanın noktası: önce tarafsızlaştır
        o.cap = Math.max(0, o.cap - rate);
        if (o.cap <= 0) {
          const lost = o.owner;
          o.owner = -1;
          o.capSide = -1;
          this.emit({ t: 'outpost', i, k: 'lost', side: lost });
        }
        return;
      }
      // tarafsız nokta
      if (o.capSide !== only && o.cap > 0) {
        o.cap = Math.max(0, o.cap - rate);
        if (o.cap <= 0) o.capSide = -1;
        return;
      }
      o.capSide = only;
      o.cap = Math.min(1, o.cap + rate);
      if (o.cap >= 1) {
        o.owner = only;
        this.emit({ t: 'outpost', i, k: 'captured', side: only });
      }
    });
  }

  /** Kurulu karakolların kuleleri: kendi kademesinin Hafif kulesi gibi ateş eder. */
  private tickOutpostTurrets(dt: number) {
    this.state.outposts.forEach((o) => {
      if (!o.built || o.owner < 0) return;
      o.cd = Math.max(0, o.cd - dt);
      if (o.cd > 0) return;
      const side = o.owner;
      const dir = B.dirOf(side);
      const list: { u: Unit; d: number }[] = [];
      this.state.units.forEach((u) => {
        if (u.side === side || !this.alive(u)) return;
        const d = (u.x - o.x) * dir - u.def.radius;
        if (d >= -B.OUTPOST_HALF && d <= B.OUTPOST_RANGE) list.push({ u, d });
      });
      if (!list.length) return;
      list.sort((a, b) => a.d - b.d);
      const def = { ...B.turretDef(o.tier, 0), range: B.OUTPOST_RANGE };
      o.cd = def.cd;
      o.shots = (o.shots + 1) % 60000;
      o.tgt = list[0].u.id;
      this.fireTurret(side, def, list[0].u, list);
    });
  }

  /** Karakola hasar; yıkılırsa nokta tarafsız kalır ve yıkan taraf ödül alır. */
  private damageOutpost(index: number, dmg: number, attackerSide: number) {
    const o = this.state.outposts.at(index);
    if (!o || !o.built || o.owner === attackerSide) return;
    o.hp = Math.max(0, o.hp - dmg);
    if (o.hp > 0) return;
    const lost = o.owner;
    const killer = this.player(attackerSide);
    if (killer) this.earn(killer, B.TIERS[o.tier].outpost.cost * B.OUTPOST_BOUNTY);
    o.built = false;
    o.owner = -1;
    o.capSide = -1;
    o.cap = 0;
    o.tgt = '';
    this.emit({ t: 'outpost', i: index, k: 'destroyed', side: lost });
  }

  private alive(u: Unit | undefined): u is Unit {
    return !!u && !this.dying.has(u) && this.state.units.has(u.id);
  }

  private flushDead() {
    for (const u of this.dying) this.state.units.delete(u.id);
    this.dying.clear();
  }

  /**
   * Bütün birim hasarı buradan geçer. Kalkan, zırh, yansıtma, dirilme ve ölünce iyileştirme
   * yetenekleri burada uygulanır. Birim öldüyse true döner.
   */
  private damage(target: Unit, dmg: number, killerSide: number, src: DmgSrc, attacker?: Unit): boolean {
    if (!this.alive(target) || !(dmg > 0)) return false;
    const tp = target.def.ability.p;
    const ignoreArmor = !!attacker?.def.ability.p.pierceArmor;
    if (src === 'ranged' && tp.block && !ignoreArmor && Math.random() < tp.block) {
      this.emit({ t: 'ufx', id: target.id, k: 'block' });
      return false;
    }
    if (src === 'melee' && tp.armor && !ignoreArmor) dmg *= 1 - tp.armor;
    target.hp -= dmg;
    if (src === 'melee' && tp.reflect && this.alive(attacker)) {
      this.damage(attacker, dmg * tp.reflect, target.side, 'reflect');
    }
    if (target.hp > 0) return false;
    if (tp.revive && !target.revived) {
      target.revived = true;
      target.hp = target.maxHp * tp.revive;
      this.emit({ t: 'ufx', id: target.id, k: 'revive' });
      return false;
    }
    this.dying.add(target);
    this.onKill(target, killerSide);
    if (tp.deathHeal) {
      const { r, pct } = tp.deathHeal;
      this.state.units.forEach((u) => {
        if (u.side === target.side && u !== target && this.alive(u) && Math.abs(u.x - target.x) <= r) {
          u.hp = Math.min(u.maxHp, u.hp + u.maxHp * pct);
        }
      });
      this.emit({ t: 'heal', side: target.side, x: target.x, r });
    }
    return true;
  }

  /** Yanan alanlar, yavaşlatma, kendini yenileme ve aura; istemciye durum bitleri olarak gider. */
  private tickStatus(dt: number) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      this.zones[i].t -= dt;
      if (this.zones[i].t <= 0) this.zones.splice(i, 1);
    }
    // aura kaynakları (Eter Titanı)
    const auras: Unit[] = [];
    this.state.units.forEach((u) => {
      if (u.def.ability.p.aura) auras.push(u);
    });
    this.state.units.forEach((u) => {
      if (!this.alive(u)) return;
      const p = u.def.ability.p;
      if (u.slowT > 0) u.slowT = Math.max(0, u.slowT - dt);
      // Kök Salma: savaşmıyorken iyileşir
      if (p.regen && u.state !== 2 && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * p.regen * dt);
      // Aura: yakınında dost Titan varsa hasar bonusu
      u.auraMul = 1;
      for (const a of auras) {
        const ap = a.def.ability.p.aura!;
        if (a !== u && a.side === u.side && Math.abs(a.x - u.x) <= ap.r) {
          u.auraMul = 1 + ap.bonus;
          break;
        }
      }
      let burning = false;
      for (const z of this.zones) {
        if (z.side === u.side || Math.abs(u.x - z.x) > z.r + u.def.radius) continue;
        burning = true;
        if (this.damage(u, z.dps * dt, z.side, 'burn')) break;
      }
      const status =
        (u.slowT > 0 ? STATUS_SLOW : 0) | (burning ? STATUS_BURN : 0) | (u.auraMul > 1 ? STATUS_AURA : 0);
      if (u.status !== status) u.status = status;
    });
  }

  /** Bir birimin başka bir birime saldırısı: karşılık çarpanı + saldıranın yetenekleri. */
  private unitAttack(u: Unit, target: Unit, side: number, enemies: Unit[]) {
    const def = u.def;
    const p = def.ability.p;
    let dmg = def.dmg * B.COUNTER[def.arch][target.arch as Arch] * u.auraMul;
    if (p.heavyBonus && target.arch === 'heavy') dmg *= 1 + p.heavyBonus;
    if (p.charge && u.chargeReady) {
      // Boğa Hücumu: güçlü ilk vuruş + geri itme (hedef kendi kalesinin gerisine itilemez)
      dmg *= p.charge.mult;
      u.chargeReady = false;
      u.walkT = 0;
      const tdir = B.dirOf(target.side);
      const minPos = B.spawnX(target.side);
      target.x -= tdir * p.charge.knock;
      if ((target.x - minPos) * tdir < 0) target.x = minPos;
      this.emit({ t: 'ufx', id: u.id, k: 'charge' });
    }
    const src: DmgSrc = def.arch === 'ranged' ? 'ranged' : 'melee';
    const x0 = target.x;
    this.damage(target, dmg, side, src, u);
    if (p.slowOnHit) target.slowT = Math.max(target.slowT, p.slowOnHit);
    if (p.splash) {
      for (const e of enemies) {
        if (e !== target && this.alive(e) && Math.abs(e.x - x0) <= p.splash.r + e.def.radius) {
          this.damage(e, dmg * p.splash.pct, side, 'blast', u);
        }
      }
    }
    if (p.pierce) {
      // hedefin arkasındaki düşmanlar (enemies öndeki başta sıralı)
      let left = p.pierce - 1;
      const i0 = enemies.indexOf(target);
      for (let i = i0 + 1; i < enemies.length && left > 0; i++) {
        if (!this.alive(enemies[i])) continue;
        this.damage(enemies[i], dmg, side, 'ranged', u);
        left--;
      }
    }
    if (p.chain) {
      let next: Unit | undefined;
      let best = B.UNIT_CHAIN_RANGE;
      for (const e of enemies) {
        if (e === target || !this.alive(e)) continue;
        const d = Math.abs(e.x - x0);
        if (d <= best) {
          best = d;
          next = e;
        }
      }
      if (next) this.damage(next, dmg * p.chain.pct, side, 'blast', u);
    }
  }

  private countUnits(side: number): number {
    let n = 0;
    this.state.units.forEach((u) => {
      if (u.side === side) n++;
    });
    return n;
  }

  /** Doğum noktası boş mu? (kendi birimlerimle üst üste doğmasın) */
  private spawnClear(side: number, radius: number): boolean {
    const x = this.spawnPoint(side);
    let clear = true;
    this.state.units.forEach((u) => {
      if (u.side === side && Math.abs(u.x - x) < radius + u.def.radius + B.UNIT_SPACING) clear = false;
    });
    return clear;
  }

  private tickPlayer(p: Player, dt: number) {
    let owned = 0;
    this.state.outposts.forEach((o) => {
      if (o.owner === p.side) owned++;
    });
    const income = B.TIERS[p.tier].income * (1 + owned * B.OUTPOST_INCOME);
    this.earn(p, income * dt, false);
    this.addXp(p, income * B.PASSIVE_XP_RATE * dt);

    if (p.queue.length > 0) {
      const [t, arch] = p.queue.at(0)!.split(':');
      const def = B.unitDef(Number(t), arch as Arch);
      if (p.trainProgress < 1) p.trainProgress = Math.min(1, p.trainProgress + dt / def.train);
      if (
        p.trainProgress >= 1 &&
        this.countUnits(p.side) < B.MAX_UNITS_PER_SIDE &&
        this.spawnClear(p.side, def.radius)
      ) {
        this.spawn(p, def);
        p.queue.shift();
        p.trainProgress = 0;
        p.trained += 1;
      }
    }
    if (p.specialCd > 0) p.specialCd = Math.max(0, p.specialCd - dt);
  }

  private spawn(p: Player, def: B.UnitDef) {
    const u = new Unit();
    u.id = String(this.nextId++);
    u.side = p.side;
    u.tier = def.tier;
    u.arch = def.arch;
    u.def = def;
    u.x = this.spawnPoint(p.side);
    u.hp = def.hp;
    u.maxHp = def.hp;
    u.cd = def.atkCd * 0.4;
    u.state = 0;
    this.state.units.set(u.id, u);
  }

  private tickUnits(dt: number) {
    const sides: Unit[][] = [[], []];
    this.state.units.forEach((u) => sides[u.side].push(u));
    // en öndeki birim başta
    sides[0].sort((a, b) => b.x - a.x);
    sides[1].sort((a, b) => a.x - b.x);

    const frontIdx = [0, 0];
    const front = (side: number): Unit | undefined => {
      const arr = sides[side];
      while (frontIdx[side] < arr.length && !this.alive(arr[frontIdx[side]])) frontIdx[side]++;
      return arr[frontIdx[side]];
    };

    // Her adımda sıra değişir ki bir taraf hep ilk vuran olmasın
    const order = this.tickNo % 2 === 0 ? [0, 1] : [1, 0];
    // Ön safta göğüs göğüse savaşan yakın dövüşçü sayısı (tarafa göre)
    const brawl = [0, 0];
    for (const side of order) {
      const dir = B.dirOf(side);
      const enemyBaseX = B.baseFrontX(1 - side);
      const hold = this.player(side)?.stance === 'hold';
      // "Savun" duruşunda her birimin dizildiği yer (öndeki birimin ön kenarı bu çizgide):
      // en öndeki karakol daha ilerideyse onun önü, değilse kale önü
      const own = B.baseFrontX(side);
      const rally = this.frontOutpost(side);
      let slotX =
        rally && (rally.x - own) * dir > B.HOLD_DIST ? rally.x + dir * (B.OUTPOST_HALF + 8) : own + dir * B.HOLD_DIST;
      // düşmanın kurulu karakolları (geçmek için yıkılmaları gerekir)
      const foeOps: { i: number; x: number }[] = [];
      this.state.outposts.forEach((o, i) => {
        if (o.built && o.owner === 1 - side) foeOps.push({ i, x: o.x });
      });
      let ahead: Unit | undefined;
      for (const u of sides[side]) {
        if (!this.alive(u)) continue;
        const def = u.def;
        const speed = def.speed * (u.slowT > 0 ? B.SLOW_FACTOR : 1);
        const enemy = front(1 - side);
        const gapEnemy = enemy ? (enemy.x - u.x) * dir - def.radius - enemy.def.radius : Infinity;
        // önümdeki en yakın düşman yapısı: karakol ya da kale
        let gapStruct = (enemyBaseX - u.x) * dir - def.radius;
        let structIdx = -1;
        for (const s of foeOps) {
          const g = (s.x - u.x) * dir - def.radius - B.OUTPOST_HALF;
          if (g > -def.radius - B.OUTPOST_HALF && g < gapStruct) {
            gapStruct = g;
            structIdx = s.i;
          }
        }
        u.cd = Math.max(0, u.cd - dt);

        let target: Unit | 'base' | number | null = null; // number = karakol indeksi
        if (enemy && gapEnemy <= def.range && gapEnemy <= gapStruct + 0.5) target = enemy;
        else if (gapStruct <= def.range) target = structIdx >= 0 ? structIdx : 'base';

        if (target !== null) {
          u.state = 2;
          u.tgt = target === 'base' ? 'base' : typeof target === 'number' ? `op${target}` : target.id;
          if (def.arch !== 'ranged') brawl[side]++;
          if (u.cd <= 0) {
            const ab = def.ability.p;
            // Seri Atış: ilk birkaç saldırı çok hızlı
            u.cd = def.atkCd * (ab.rapid && u.shotsFired < ab.rapid ? 0.3 : 1);
            u.shotsFired++;
            u.atk = (u.atk + 1) % 60000;
            if (target === 'base' || typeof target === 'number') {
              const siege = ab.siege ?? B.BASE_DMG_MULT[def.arch];
              const dmg = def.dmg * siege * u.auraMul;
              if (target === 'base') {
                this.damageBase(1 - side, dmg, side);
                if (this.state.phase !== 'playing') return;
              } else {
                this.damageOutpost(target, dmg, side);
              }
            } else {
              this.unitAttack(u, target, side, sides[1 - side]);
            }
          }
        } else {
          u.tgt = '';
          // Öndeki dost savaşıyorsa ve ön safta yer varsa, yakın dövüşçü araya sıkışıp o da saldırabilir
          const squeeze =
            def.arch !== 'ranged' && ahead !== undefined && ahead.state === 2 && brawl[side] < B.MAX_BRAWL && enemy !== undefined;
          const allyRoom =
            ahead && !squeeze ? (ahead.x - u.x) * dir - def.radius - ahead.def.radius - B.UNIT_SPACING : Infinity;
          // Savunmada bile: düşman dibimizdeyse ya da öndeki dost göğüs göğüse savaşıyorsa çatışmaya katıl
          const engage = squeeze || gapEnemy < B.HOLD_AGGRO;
          if (hold && !engage) {
            // dizilim noktasına git (ileri ya da geri)
            const want = slotX - dir * def.radius;
            const delta = (want - u.x) * dir;
            let move = Math.sign(delta) * Math.min(Math.abs(delta), speed * dt);
            if (move > 0) move = Math.min(move, allyRoom, gapEnemy, gapStruct);
            if (Math.abs(move) > 0.01) {
              u.x += move * dir;
              u.state = move > 0 ? 0 : 3;
            } else {
              u.state = 1;
            }
          } else {
            const move = Math.min(speed * dt, allyRoom, gapEnemy, gapStruct);
            if (move > 0.01) {
              u.x += move * dir;
              u.state = 0;
            } else {
              u.state = 1;
            }
          }
          // Boğa Hücumu bir süre yürüyünce yeniden dolar
          if (u.state === 0 && !u.chargeReady) {
            u.walkT += dt;
            if (u.walkT >= B.CHARGE_REARM) u.chargeReady = true;
          }
        }
        if (hold) {
          // Sıradaki birimin ön kenarı: bu birimin dizilim yerinin (ya da gerçek konumunun) arkası.
          // Savaşan birim yer tutmaz; arkadakiler onun arkasına dizilir.
          const slotFront = (slotX - own) * dir;
          const backEdge = (u.x - own) * dir - def.radius;
          const next = Math.min(target !== null ? slotFront : slotFront - 2 * def.radius, backEdge) - B.UNIT_SPACING;
          slotX = own + dir * next;
        }
        ahead = u;
      }
    }
  }

  /** Düşman birimleri, kale önüne uzaklığa göre sıralı (en yakın başta). */
  private enemiesByDistance(p: Player): { u: Unit; d: number }[] {
    const baseX = B.baseFrontX(p.side);
    const dir = B.dirOf(p.side);
    const list: { u: Unit; d: number }[] = [];
    this.state.units.forEach((u) => {
      if (u.side !== p.side && this.alive(u)) list.push({ u, d: (u.x - baseX) * dir - u.def.radius });
    });
    return list.sort((a, b) => a.d - b.d);
  }

  private tickTurrets(p: Player, dt: number) {
    let enemies: { u: Unit; d: number }[] | null = null;
    for (let i = 0; i < p.turrets.length; i++) {
      const t = p.turrets.at(i)!;
      if (t.tier < 0) continue;
      t.cd = Math.max(0, t.cd - dt);
      if (t.cd > 0) continue;
      const def = B.turretDef(t.tier, t.grade);
      enemies ??= this.enemiesByDistance(p);
      const first = enemies[0];
      if (!first || first.d > def.range) continue;
      t.cd = def.cd;
      t.shots = (t.shots + 1) % 60000;
      t.tgt = first.u.id;
      this.fireTurret(p.side, def, first.u, enemies);
      enemies = null; // birimler ölmüş olabilir; sıradaki kule için yeniden hesapla
    }
  }

  /** Kulenin saldırı türüne göre hasar uygular. inLine: kaleden dışarı doğru sıralı düşmanlar. */
  private fireTurret(side: number, def: B.TurretDef, target: Unit, inLine: { u: Unit; d: number }[]) {
    switch (def.kind) {
      case 'shot':
        this.damage(target, def.dmg, side, 'ranged');
        break;
      case 'frost':
        target.slowT = Math.max(target.slowT, def.slow);
        this.damage(target, def.dmg, side, 'ranged');
        break;
      case 'pierce':
      case 'beam': {
        // hattaki ilk N düşman (menzil içinde)
        const victims = inLine.filter((e) => e.d <= def.range).slice(0, def.pierce);
        for (const e of victims) this.damage(e.u, def.dmg, side, def.kind === 'beam' ? 'blast' : 'ranged');
        break;
      }
      case 'chain': {
        const struck = new Set<Unit>();
        let cur: Unit | undefined = target;
        let dmg = def.dmg;
        for (let j = 0; j <= def.chain && cur; j++) {
          struck.add(cur);
          const fromX = cur.x;
          this.damage(cur, dmg, side, 'blast');
          dmg *= B.CHAIN_FALLOFF;
          let next: Unit | undefined;
          let best: number = B.CHAIN_RANGE;
          this.state.units.forEach((u) => {
            if (u.side === side || struck.has(u) || !this.alive(u)) return;
            const d = Math.abs(u.x - fromX);
            if (d <= best) {
              best = d;
              next = u;
            }
          });
          cur = next;
        }
        break;
      }
      case 'lob':
      case 'fire': {
        // bomba uçarken hedef ilerleyebilir: hasar, ateş anındaki hedef noktasına LOB_TIME sonra düşer
        const x = target.x;
        this.pending.push({
          t: B.LOB_TIME,
          fn: () => {
            const hits: Unit[] = [];
            this.state.units.forEach((u) => {
              if (u.side !== side && this.alive(u) && Math.abs(u.x - x) <= def.splash + u.def.radius) hits.push(u);
            });
            for (const u of hits) {
              if (def.slow) u.slowT = Math.max(u.slowT, def.slow);
              this.damage(u, def.dmg, side, 'blast');
            }
            if (def.kind === 'fire') this.zones.push({ side, x, r: def.splash, dps: def.burnDps, t: def.burnDur });
          },
        });
        break;
      }
    }
  }

  private onKill(u: Unit, killerSide: number) {
    const killer = this.player(killerSide);
    const owner = this.player(u.side);
    if (killer) {
      this.earn(killer, u.def.bounty);
      this.addXp(killer, u.def.xp);
      killer.kills += 1;
    }
    if (owner) {
      this.addXp(owner, u.def.xp * B.XP_LOSS_RATE);
      owner.lost += 1;
    }
  }

  private damageBase(side: number, dmg: number, attackerSide: number) {
    const p = this.player(side);
    if (!p || this.state.phase !== 'playing') return;
    p.baseHp = Math.max(0, p.baseHp - dmg);
    if (p.baseHp <= 0) this.endGame(attackerSide, 'base');
  }
}
