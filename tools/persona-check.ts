// Hızlı eşleşme rakibinin (kişilikli, insan gibi kusurlu bot) gücünü ölçer: her güç düzeyinde rastgele
// kişiliklerle, açık bot seviyelerine ve oyuncu taklitlerine karşı maç oynatır. Taraflar her maçta değişir.
// Kullanım: npx tsx tools/persona-check.ts [maç sayısı] [rakip...]
//   rakip: easy normal hard rusher strategist expert (varsayılan: hepsi)
import * as B from '../shared/balance';
import type { BotLevel } from '../shared/protocol';
import { BattleState, type Player } from '../server/state';
import { Simulation } from '../server/sim';
import { Bot } from '../server/bot';
import { PERSONAS } from '../server/personas';
import { Expert, Rusher, Strategist } from './rusher';

const games = Number(process.argv[2] ?? 20);
const ALL = ['easy', 'normal', 'hard', 'rusher', 'strategist', 'expert'];
const opps = process.argv.slice(3).length ? process.argv.slice(3) : ALL;
const SKILLS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9];
const DT = B.TICK_MS / 1000;

function opponent(kind: string, sim: Simulation, p: Player): { update(dt: number): void } {
  if (kind === 'rusher') return new Rusher(sim, p);
  if (kind === 'strategist') return new Strategist(sim, p);
  if (kind === 'expert') return new Expert(sim, p);
  return new Bot(sim, p, kind as BotLevel);
}

console.log(`güç  | ${opps.map((o) => o.padStart(10)).join(' ')}   (kişiliğin kazanma oranı, ${games} maç)`);
let quits = 0;
let total = 0;
for (const skill of SKILLS) {
  const row: string[] = [];
  for (const kind of opps) {
    let w = 0;
    for (let g = 0; g < games; g++) {
      const state = new BattleState();
      const sim = new Simulation(state);
      const a = sim.addPlayer('a', 'A', true);
      const b = sim.addPlayer('b', 'B', true);
      const meP = g % 2 === 0 ? a : b;
      const opP = g % 2 === 0 ? b : a;
      const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
      const me = new Bot(sim, meP, persona, skill);
      const op = opponent(kind, sim, opP);
      sim.startMatch();
      while (state.phase !== 'ended' && state.time < 30 * 60) {
        me.update(DT);
        op.update(DT);
        sim.tick(DT);
      }
      total++;
      if (state.reason === 'forfeit') quits++;
      if (state.phase === 'ended' && state.winner === meP.side) w++;
    }
    row.push(`${Math.round((100 * w) / games)}%`.padStart(10));
  }
  console.log(`${skill.toFixed(1)}  | ${row.join(' ')}`);
}
console.log(`oyunu bırakma: ${quits}/${total} maç`);
