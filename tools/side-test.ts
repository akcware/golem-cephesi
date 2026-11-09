// Taraf (sol/sağ) dengesini ölçer: aynı seviyedeki iki botu çok sayıda oynatır.
// Kullanım: npx tsx tools/side-test.ts [maç] [noOutposts]
import * as B from '../shared/balance';
import { BattleState } from '../server/state';
import { Simulation } from '../server/sim';
import { Bot } from '../server/bot';

const games = Number(process.argv[2] ?? 60);
if (process.argv.includes('noOutposts')) (B.OUTPOST_XS as number[]).length = 0;
const DT = B.TICK_MS / 1000;

const wins = [0, 0];
let firstCap = [0, 0];
for (let g = 0; g < games; g++) {
  const state = new BattleState();
  let capturedFirst = -1;
  const sim = new Simulation(state, (fx) => {
    if (fx.t === 'outpost' && fx.k === 'captured' && capturedFirst < 0 && fx.i === 1) capturedFirst = fx.side;
  });
  const a = sim.addPlayer('a', 'A', true);
  const b = sim.addPlayer('b', 'B', true);
  const bots = [new Bot(sim, a, 'normal'), new Bot(sim, b, 'normal')];
  sim.startMatch();
  while (state.phase !== 'ended' && state.time < 40 * 60) {
    for (const bot of bots) bot.update(DT);
    sim.tick(DT);
  }
  if (state.phase === 'ended') wins[state.winner]++;
  if (capturedFirst >= 0) firstCap[capturedFirst]++;
}
console.log(`${games} maç (${process.argv.includes('noOutposts') ? 'karakolsuz' : 'karakollu'}): sol(0) ${wins[0]} – sağ(1) ${wins[1]} | orta noktayı ilk alan: sol ${firstCap[0]} sağ ${firstCap[1]}`);
