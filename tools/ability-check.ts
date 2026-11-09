// Birim yeteneklerini küçük, kontrollü çatışmalarla sınar ve sonuçları raporlar.
// Kullanım: npx tsx tools/ability-check.ts
import * as B from '../shared/balance';
import type { Arch } from '../shared/balance';
import type { FxEvent } from '../shared/protocol';
import { BattleState, Unit } from '../server/state';
import { Simulation } from '../server/sim';

const DT = B.TICK_MS / 1000;

interface Spec {
  side: number;
  tier: number;
  arch: Arch;
  x: number;
  hpMul?: number;
  hpFrac?: number; // başlangıç canı (azami canın oranı)
  stand?: boolean; // yürümesin
}

function scenario(name: string, specs: Spec[], seconds: number, check: (r: { fx: FxEvent[]; units: Unit[]; state: BattleState; log: number[][] }) => string) {
  const state = new BattleState();
  const fx: FxEvent[] = [];
  const sim = new Simulation(state, (e) => fx.push(e));
  sim.addPlayer('a', 'A', true);
  sim.addPlayer('b', 'B', true);
  sim.startMatch();
  state.phase = 'playing';
  const units = specs.map((s, i) => {
    const u = new Unit();
    u.id = `u${i}`;
    u.side = s.side;
    u.tier = s.tier;
    u.arch = s.arch;
    const def = B.unitDef(s.tier, s.arch);
    u.def = s.stand ? { ...def, speed: 0 } : def;
    u.maxHp = def.hp * (s.hpMul ?? 1);
    u.hp = u.maxHp * (s.hpFrac ?? 1);
    u.x = s.x;
    state.units.set(u.id, u);
    return u;
  });
  const log: number[][] = [];
  for (let t = 0; t < seconds; t += DT) {
    sim.tick(DT);
    log.push(units.map((u) => Math.round(u.hp)));
  }
  console.log(`${name.padEnd(34)} ${check({ fx, units, state, log })}`);
}

const count = (fx: FxEvent[], pred: (e: FxEvent) => boolean) => fx.filter(pred).length;

// 1) Bronz Muhafız kalkanı: menzillilerin saldırılarının bir kısmını bloklar
scenario('Kalkan (Bronz Muhafız)', [
  { side: 1, tier: 1, arch: 'melee', x: 900, hpMul: 50, stand: true },
  { side: 0, tier: 0, arch: 'ranged', x: 750, stand: true },
  { side: 0, tier: 0, arch: 'ranged', x: 720, stand: true },
], 20, ({ fx, log }) => {
  const blocks = count(fx, (e) => e.t === 'ufx' && e.k === 'block');
  let hits = 0;
  for (let i = 1; i < log.length; i++) if (log[i][0] < log[i - 1][0]) hits++;
  return `blok=${blocks}, isabet=${hits} → blok oranı %${Math.round((100 * blocks) / (blocks + hits))} (beklenen: ~%35)`;
});

// 2) Zırh Delici kalkanı yok sayar
scenario('Zırh Delici kalkanı aşar', [
  { side: 1, tier: 1, arch: 'melee', x: 900, hpMul: 50, stand: true },
  { side: 0, tier: 1, arch: 'ranged', x: 750, stand: true },
], 20, ({ fx }) => `blok=${count(fx, (e) => e.t === 'ufx' && e.k === 'block')} (beklenen: 0)`);

// 3) Eter Bekçisi dirilir
scenario('Ruh Bedeni (Eter Bekçisi)', [
  { side: 1, tier: 4, arch: 'melee', x: 900, stand: true },
  { side: 0, tier: 4, arch: 'heavy', x: 860, hpMul: 50, stand: true },
  { side: 0, tier: 4, arch: 'heavy', x: 810, hpMul: 50, stand: true },
], 20, ({ fx }) => `dirilme=${count(fx, (e) => e.t === 'ufx' && e.k === 'revive')} (beklenen: 1)`);

// 4) Meşe Golem ölünce çevresini iyileştirir
scenario('Fidan (Meşe Golem)', [
  { side: 1, tier: 0, arch: 'heavy', x: 900, hpMul: 0.2, stand: true },
  { side: 1, tier: 0, arch: 'melee', x: 960, hpFrac: 0.3, stand: true },
  { side: 0, tier: 2, arch: 'heavy', x: 850, hpMul: 50, stand: true },
], 6, ({ fx, units }) => {
  const heal = count(fx, (e) => e.t === 'heal');
  return `iyileştirme olayı=${heal} (beklenen: 1), müttefik can=${Math.round(units[1].hp)}/${units[1].maxHp}`;
});

// 5) Boğa Hücumu: ilk vuruş 2 kat + geri itme
scenario('Boğa Hücumu (Bronz Boğa)', [
  { side: 0, tier: 1, arch: 'heavy', x: 700 },
  { side: 1, tier: 1, arch: 'melee', x: 900, hpMul: 20, stand: true },
], 8, ({ fx, units, log }) => {
  const charges = count(fx, (e) => e.t === 'ufx' && e.k === 'charge');
  const hits = log.map((r) => r[1]).filter((v, i, a) => i > 0 && v < a[i - 1]);
  return `hücum=${charges} (beklenen: 1), hedef x=${Math.round(units[1].x)} (900'den geri itilmiş olmalı)`;
});

// 6) Demir Topçu alan hasarı
scenario('Top Güllesi (Demir Topçu)', [
  { side: 0, tier: 2, arch: 'ranged', x: 700, stand: true },
  { side: 1, tier: 2, arch: 'melee', x: 860, hpMul: 50, stand: true },
  { side: 1, tier: 2, arch: 'melee', x: 895, hpMul: 50, stand: true },
  { side: 1, tier: 2, arch: 'melee', x: 1100, hpMul: 50, stand: true },
], 5, ({ units }) => {
  const d = units.slice(1).map((u) => Math.round(u.maxHp - u.hp));
  return `hasarlar=[${d.join(', ')}] (ilk ikisi vurulmalı, uzaktaki 0)`;
});

// 7) Prizma Büyücü delici ışın + Eter Gözü zincir
scenario('Delici Işın (Prizma Büyücü)', [
  { side: 0, tier: 3, arch: 'ranged', x: 700, stand: true },
  { side: 1, tier: 3, arch: 'melee', x: 860, hpMul: 50, stand: true },
  { side: 1, tier: 3, arch: 'melee', x: 940, hpMul: 50, stand: true },
  { side: 1, tier: 3, arch: 'melee', x: 1020, hpMul: 50, stand: true },
], 5, ({ units }) => `hasarlar=[${units.slice(1).map((u) => Math.round(u.maxHp - u.hp)).join(', ')}] (ilk iki eşit, üçüncü 0)`);

scenario('Zincir Şimşek (Eter Gözü)', [
  { side: 0, tier: 4, arch: 'ranged', x: 700, stand: true },
  { side: 1, tier: 4, arch: 'melee', x: 860, hpMul: 50, stand: true },
  { side: 1, tier: 4, arch: 'melee', x: 930, hpMul: 50, stand: true },
], 5, ({ units }) => `hasarlar=[${units.slice(1).map((u) => Math.round(u.maxHp - u.hp)).join(', ')}] (ikincisi ~%60)`);

// 8) Aura ve Kök Salma
scenario('Komutan Aurası (Eter Titanı)', [
  { side: 0, tier: 4, arch: 'heavy', x: 600, stand: true },
  { side: 0, tier: 4, arch: 'melee', x: 680, stand: true },
  { side: 0, tier: 4, arch: 'melee', x: 900, stand: true },
], 1, ({ units }) => `yakın dost aura=${(units[1].status & 4) !== 0}, uzak dost aura=${(units[2].status & 4) !== 0} (true, false)`);

scenario('Kök Salma (Kütük Muhafız)', [{ side: 0, tier: 0, arch: 'melee', x: 600, stand: true, hpFrac: 0.5 }], 5, ({ units, log }) => {
  return `can ${log[0][0]} → 5 sn sonra ${Math.round(units[0].hp)} / ${units[0].maxHp} (sn'de %4 → +12)`;
});

// 9) Kuşatma Ustası: kaleye verdiği hasar
for (const [tier, label] of [[2, 'Demir Dev (2.5x)'], [1, 'Bronz Boğa (1.5x)']] as const) {
  scenario(`Kuşatma: ${label}`, [{ side: 0, tier, arch: 'heavy', x: B.WORLD_W - B.BASE_FRONT - 40 }], 6, ({ state }) => {
    let hp = 0;
    state.players.forEach((p) => {
      if (p.side === 1) hp = p.baseMaxHp - p.baseHp;
    });
    const def = B.unitDef(tier, 'heavy');
    return `6 sn'de kaleye hasar=${Math.round(hp)} (vuruş başı ${Math.round(def.dmg * (def.ability.p.siege ?? B.BASE_DMG_MULT.heavy))})`;
  });
}
