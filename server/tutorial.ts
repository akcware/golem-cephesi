// Eğitim maçının yönetmeni: botun yerine rakip tarafı oynar, adım adım yeni oyuncuya oyunu tanıtır.
// Her adımda gerekli durumu hazırlar (rakip birimi yollar, eksik altını tamamlar, XP verir) ve oyuncunun
// beklenen hamleyi yapmasını bekler. Oyuncunun kalesi düşmez, rakip kale son adıma kadar yıkılmaz.
// Adım metinleri shared/tutorial.ts'te; istemci state.tut'a bakarak gösterir.
import * as B from '../shared/balance';
import type { Arch } from '../shared/balance';
import type { FxEvent } from '../shared/protocol';
import { TUTORIAL, tutIndex } from '../shared/tutorial';
import type { Simulation } from './sim';
import type { Player } from './state';

/** Rakip tarafın adı. */

/** Oyuncunun kalesi bu oranın altına inmez; rakip kale son adıma kadar bu oranın altına inmez. */
const MY_FLOOR = 0.5;
const FOE_FLOOR = 0.6;
/** Bir adımın hedefi tutunca sonrakine geçmeden önce kısa bekleme (oyuncu ne olduğunu görsün). */
const NEXT_DELAY = 1.2;
/** Her adım en az bu kadar ekranda kalır (hedefi önceden tutmuş olsa da okunabilsin). */
const MIN_SHOW = 4;
const FAR = 9999;

const step = (id: string) => tutIndex(id);

export class Tutorial {
  private step = -1;
  private wait = 0;
  private shown = 0;
  private killsAt = 0;
  private nextAsked = false;
  private cmdUsed = false;
  private specialUsed = false;
  private finishSet = false;

  constructor(
    private sim: Simulation,
    private foe: Player,
    private log: (msg: string) => void = () => {},
  ) {}

  private me(): Player | undefined {
    let me: Player | undefined;
    this.sim.state.players.forEach((p) => {
      if (!p.isBot) me = p;
    });
    return me;
  }

  private units(side: number, arch?: Arch, cmd = false): number {
    let n = 0;
    this.sim.state.units.forEach((u) => {
      if (u.side === side && u.cmd === cmd && (!arch || u.arch === arch)) n++;
    });
    return n;
  }

  /** Eksik altını tamamlar (oyuncu adımda takılmasın). */
  private ensureGold(p: Player, n: number) {
    if (p.gold < n) this.sim.devGrant(p, n - p.gold, 0);
  }

  private spawnFoe(arch: Arch, n: number, hpFrac: number) {
    for (let i = 0; i < n; i++) this.sim.tutorSpawn(this.foe, arch, hpFrac);
  }

  /** x'ten ileri (dir yönünde) range içinde düşman var mı? */
  private enemyAhead(x: number, dir: number, range: number): boolean {
    let near = false;
    this.sim.state.units.forEach((u) => {
      const d = (u.x - x) * dir;
      if (u.side === this.foe.side && d >= -20 && d <= range) near = true;
    });
    return near;
  }

  /** Düşmanları doğrudan x'e çıkarır (rakip kalenin önünü geçmeden). Kalabalık bir ordu kapıyı tutsa da
   *  komutan ve özel güç adımlarında oyuncunun önüne hedef gelsin diye. */
  private spawnAt(x: number, dir: number, archs: Arch[], hpFrac: number) {
    const wall = B.baseFrontX(this.foe.side) - dir * 30;
    archs.forEach((arch, i) => {
      let at = x + dir * i * 26;
      if ((at - wall) * dir > 0) at = wall - dir * i * 26;
      this.sim.tutorSpawn(this.foe, arch, hpFrac, at);
    });
  }

  /** Oyuncunun en öndeki biriminin x'i (yoksa kale önü). */
  private frontX(me: Player): number {
    const dir = B.dirOf(me.side);
    let best = B.baseFrontX(me.side);
    this.sim.state.units.forEach((u) => {
      if (u.side === me.side && (u.x - best) * dir > 0) best = u.x;
    });
    return best;
  }

  /** İstemciden "Devam" (düğmeli adımlar). */
  next() {
    const s = TUTORIAL[this.step];
    if (s?.button) this.nextAsked = true;
  }

  /** Simülasyonun görsel olaylarından komutan ve özel güç kullanımını yakalar. */
  onFx(fx: FxEvent) {
    const me = this.me();
    if (!me) return;
    if (fx.t === 'cmd' && fx.k === 'leap' && fx.side === me.side) this.cmdUsed = true;
    if (fx.t === 'special' && fx.side === me.side && !fx.echo) this.specialUsed = true;
  }

  /** Maç yeniden başlarken (rövanş) baştan al. */
  reset() {
    this.step = -1;
    this.sim.state.tut = -1;
    this.finishSet = false;
  }

  private go(i: number) {
    this.step = i;
    this.sim.state.tut = i;
    this.wait = 0;
    this.shown = 0;
    this.nextAsked = false;
    this.cmdUsed = false;
    this.specialUsed = false;
    const me = this.me();
    if (!me) return;
    this.killsAt = me.kills;
    const id = TUTORIAL[i]?.id;
    this.log(`adım ${i + 1}/${TUTORIAL.length}: ${id} (${Math.round(this.sim.state.time)} sn)`);
    // adıma girerken hazırlık
    switch (id) {
      case 'train':
        this.ensureGold(me, B.unitCost(me.tier, 'melee') * 2);
        break;
      case 'fight':
        this.spawnFoe('melee', 1, 0.6);
        break;
      case 'counter':
        this.ensureGold(me, B.unitCost(me.tier, 'melee') * 3);
        this.spawnFoe('ranged', 2, 0.7);
        break;
      case 'heavy':
        this.ensureGold(me, B.unitCost(me.tier, 'ranged') * 3);
        this.spawnFoe('heavy', 1, 0.6);
        break;
      case 'gather':
        this.ensureGold(me, B.unitCost(me.tier, 'melee') * 4);
        break;
      case 'outpost':
        this.ensureGold(me, B.TIERS[me.tier].outpost.cost);
        break;
      case 'turret':
        this.ensureGold(me, B.turretDef(me.tier, 0).cost);
        break;
      case 'evolve': {
        const need = B.TIERS[Math.min(B.MAX_TIER, me.tier + 1)].xpToReach;
        if (me.xp < need) this.sim.devGrant(me, 0, need - me.xp);
        break;
      }
      case 'cmd':
        me.cmdRespawn = 0; // komutan hemen gelsin (düşmanlar update içinde önüne çıkar)
        me.cmdCd = 0;
        break;
      case 'special':
        me.specialCd = 0;
        break;
      case 'finish':
        this.ensureGold(me, B.unitCost(me.tier, 'melee') * 4);
        break;
    }
  }

  /** Adımın hedefi tuttu mu? */
  private done(me: Player): boolean {
    const id = TUTORIAL[this.step]?.id;
    const foeUnits = this.units(this.foe.side) + this.units(this.foe.side, undefined, true);
    switch (id) {
      case 'intro':
        return this.nextAsked;
      case 'train':
        return me.trained >= 1;
      case 'fight':
        return me.kills > this.killsAt;
      case 'counter':
      case 'heavy':
        return me.kills > this.killsAt && foeUnits === 0;
      case 'hold':
        return me.stance === 'hold';
      case 'gather':
        return this.units(me.side) >= 4 && me.stance === 'attack';
      case 'capture':
        return this.sim.state.outposts.some((o) => o.owner === me.side);
      case 'outpost':
        return this.sim.state.outposts.some((o) => o.owner === me.side && o.built);
      case 'turret':
        return me.turrets.some((t) => t.tier >= 0);
      case 'evolve':
        return me.tier >= 1;
      case 'card':
        return me.cards.length >= 1;
      case 'cmd':
        return this.cmdUsed;
      case 'special':
        return this.specialUsed;
      default:
        return false; // finish: kale yıkılınca maç biter
    }
  }

  update(dt: number) {
    const st = this.sim.state;
    if (st.phase === 'countdown' && this.step >= 0) this.reset(); // rövanş: baştan
    if (st.phase === 'ended' && this.step >= 0 && !this.foe.wantsRematch) {
      this.log(st.winner === this.me()?.side ? 'tamamlandı' : 'kaybetti');
      this.foe.wantsRematch = true;
    }
    if (st.phase !== 'playing' || st.paused) return;
    const me = this.me();
    if (!me) return;
    if (this.step < 0) this.go(0);

    // eğitim boyunca sabit kurallar
    st.src.next = FAR; // Eter Kaynağı yok
    this.foe.cmdRespawn = FAR; // rakip komutan yok
    this.foe.specialCd = FAR;
    this.foe.queue.clear();
    if (this.step < step('cmd') && !me.cmdId) me.cmdRespawn = FAR; // komutan kendi adımında gelir
    if (this.step < step('special')) me.specialCd = Math.max(me.specialCd, FAR);
    if (this.step === step('cmd') && !this.cmdUsed) me.cmdCd = 0;
    if (me.baseHp < me.baseMaxHp * MY_FLOOR) me.baseHp = me.baseMaxHp * MY_FLOOR;
    if (this.step < step('finish')) {
      if (this.foe.baseHp < this.foe.baseMaxHp * FOE_FLOOR) this.foe.baseHp = this.foe.baseMaxHp * FOE_FLOOR;
    } else if (!this.finishSet) {
      this.finishSet = true;
      this.foe.baseHp = this.foe.baseMaxHp * 0.25;
    }
    // komutan ve özel güç adımlarında oyuncunun önüne hedef çıkar (yeteneği deneyebilsin)
    const dir = B.dirOf(me.side);
    if (this.step === step('cmd') && !this.cmdUsed) {
      const c = me.cmdId ? st.units.get(me.cmdId) : undefined;
      if (c && !this.enemyAhead(c.x, dir, 320)) this.spawnAt(c.x + dir * 230, dir, ['melee', 'melee', 'melee'], 0.8);
    }
    if (this.step === step('special') && !this.specialUsed) {
      const fx = this.frontX(me);
      if (!this.enemyAhead(fx, dir, 420)) this.spawnAt(fx + dir * 260, dir, ['melee', 'melee', 'ranged', 'ranged'], 1);
    }

    this.shown += dt;
    if (this.done(me)) {
      this.wait += dt;
      const button = !!TUTORIAL[this.step]?.button;
      const ready = button || (this.wait >= NEXT_DELAY && this.shown >= MIN_SHOW);
      if (ready && this.step < TUTORIAL.length - 1) this.go(this.step + 1);
    }
  }
}
