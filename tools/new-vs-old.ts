// Yeni botu, güçlendirilmeden önceki botla (OldBot) karşılaştırır. Taraflar her maçta değişir.
// Kullanım: npx tsx tools/new-vs-old.ts [maç] [yeni seviye] [eski seviye]
import * as B from '../shared/balance';
import type { BotLevel } from '../shared/protocol';
import { BattleState } from '../server/state';
import { Simulation } from '../server/sim';
import { Bot } from '../server/bot';
import { OldBot } from './old-bot';

const games = Number(process.argv[2] ?? 30);
const newLevel = (process.argv[3] ?? 'normal') as BotLevel;
const oldLevel = (process.argv[4] ?? newLevel) as BotLevel;
const DT = B.TICK_MS / 1000;
let nw = 0;
let ow = 0;
let dr = 0;
let t = 0;
for (let g = 0; g < games; g++) {
  const state = new BattleState();
  const sim = new Simulation(state);
  const a = sim.addPlayer('a', 'A', true);
  const b = sim.addPlayer('b', 'B', true);
  const newP = g % 2 === 0 ? a : b;
  const oldP = g % 2 === 0 ? b : a;
  const nb = new Bot(sim, newP, newLevel);
  const ob = new OldBot(sim, oldP, oldLevel);
  sim.startMatch();
  while (state.phase !== 'ended' && state.time < 30 * 60) {
    nb.update(DT);
    ob.update(DT);
    sim.tick(DT);
  }
  t += state.time;
  if (state.phase !== 'ended') dr++;
  else if (state.winner === newP.side) nw++;
  else ow++;
}
console.log(`yeni ${newLevel} vs eski ${oldLevel}: yeni ${nw} – eski ${ow} – berabere ${dr} | ort. süre ${(t / games / 60).toFixed(1)} dk`);
