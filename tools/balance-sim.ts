// Bot'a karşı bot maçlarını ekran olmadan hızlıca oynatıp denge raporu çıkarır.
// Kullanım: npm run balance  (veya: npx tsx tools/balance-sim.ts 40 normal hard)
import * as B from '../shared/balance';
import { tierName } from '../shared/i18n';
import type { BotLevel } from '../shared/protocol';
import { BattleState } from '../server/state';
import { Simulation } from '../server/sim';
import { Bot } from '../server/bot';

const games = Number(process.argv[2] ?? 30);
const levelA = (process.argv[3] ?? 'normal') as BotLevel;
const levelB = (process.argv[4] ?? 'normal') as BotLevel;
const TRACE = process.argv.includes('--trace'); // ilk maçın dakika dakika dökümü
const TRACE_EVERY = Number(process.argv.find((a) => a.startsWith('--every='))?.split('=')[1] ?? 60);
const DT = B.TICK_MS / 1000;
const MAX_TIME = 40 * 60;

interface Result {
  winner: number;
  duration: number;
  tierTimes: number[][];
  finalTiers: number[];
  kills: number[];
}

function snapshot(state: BattleState) {
  const parts: string[] = [];
  state.players.forEach((p) => {
    let n = 0;
    let front = p.side === 0 ? -Infinity : Infinity;
    const mix = { melee: 0, ranged: 0, heavy: 0 };
    state.units.forEach((u) => {
      if (u.side !== p.side) return;
      n++;
      mix[u.arch as keyof typeof mix]++;
      front = p.side === 0 ? Math.max(front, u.x) : Math.min(front, u.x);
    });
    const turrets: number[] = [];
    for (let i = 0; i < p.turrets.length; i++) turrets.push(p.turrets.at(i)!.tier);
    parts.push(
      `${p.name}${p.stance === 'hold' ? '🛡' : '⚔'}: T${p.tier} altın ${p.gold} xp ${p.xp} kale ${Math.round(p.baseHp)}/${Math.round(p.baseMaxHp)} ` +
        `birim ${n} (${mix.melee}/${mix.ranged}/${mix.heavy}) ön ${Number.isFinite(front) ? Math.round(front) : '-'} kule [${turrets.join(',')}] öld ${p.kills}`,
    );
  });
  const ops: string[] = [];
  state.outposts.forEach((o) => ops.push(o.owner < 0 ? '·' : `${o.owner === 0 ? 'A' : 'B'}${o.built ? '▲' : ''}`));
  console.log(`${fmt(state.time).padStart(5)} | nokta [${ops.join(' ')}] | ${parts.join(' | ')}`);
}

function playOne(trace = false): Result {
  const state = new BattleState();
  const tierTimes: number[][] = [[], []];
  const sim = new Simulation(state, (fx) => {
    if (fx.t === 'evolve') tierTimes[fx.side][fx.tier] = state.time;
  });
  const a = sim.addPlayer('a', 'A', true);
  const b = sim.addPlayer('b', 'B', true);
  const bots = [new Bot(sim, a, levelA), new Bot(sim, b, levelB)];
  sim.startMatch();
  let nextTrace = 0;
  while (state.phase !== 'ended' && state.time < MAX_TIME) {
    for (const bot of bots) bot.update(DT);
    sim.tick(DT);
    if (trace && state.time >= nextTrace) {
      snapshot(state);
      nextTrace += TRACE_EVERY;
    }
  }
  if (trace) snapshot(state);
  return {
    winner: state.phase === 'ended' ? state.winner : -1,
    duration: state.time,
    tierTimes,
    finalTiers: [a.tier, b.tier],
    kills: [a.kills, b.kills],
  };
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);

const results: Result[] = [];
for (let i = 0; i < games; i++) results.push(playOne(TRACE && i === 0));

const wins = [0, 0];
let draws = 0;
for (const r of results) (r.winner >= 0 ? wins[r.winner]++ : draws++);

console.log(`\n=== ${games} maç: A(${levelA}) vs B(${levelB}) ===`);
console.log(`Kazanan  A: ${wins[0]}  B: ${wins[1]}  süre aşımı: ${draws}`);
console.log(`Ortalama süre: ${fmt(avg(results.map((r) => r.duration)))}  (min ${fmt(Math.min(...results.map((r) => r.duration)))}, max ${fmt(Math.max(...results.map((r) => r.duration)))})`);
for (let t = 1; t <= B.MAX_TIER; t++) {
  const times = results.flatMap((r) => [r.tierTimes[0][t], r.tierTimes[1][t]]).filter((x) => x !== undefined);
  const reached = times.length / (games * 2);
  console.log(`${tierName(t).padEnd(8)} ulaşılma: %${Math.round(reached * 100).toString().padStart(3)}  ortalama zaman: ${times.length ? fmt(avg(times)) : '-'}`);
}
console.log(`Ortalama öldürme: ${Math.round(avg(results.flatMap((r) => r.kills)))}`);
