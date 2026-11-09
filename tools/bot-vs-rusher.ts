// Botları "insan gibi saldırgan" test rakibine karşı ölçer (taraflar her maçta değişir).
// Kullanım: npx tsx tools/bot-vs-rusher.ts [maç sayısı] [seviye...] [--strategist|--turtle|--expert] [--old]
import * as B from '../shared/balance';
import type { BotLevel } from '../shared/protocol';
import { BattleState } from '../server/state';
import { Simulation } from '../server/sim';
import { Bot } from '../server/bot';
import { Expert, Rusher, Strategist, Turtle } from './rusher';
import { OldBot } from './old-bot';

const games = Number(process.argv[2] ?? 30);
const levels = (process.argv.slice(3).filter((a) => !a.startsWith('--')).length ? process.argv.slice(3).filter((a) => !a.startsWith('--')) : ['easy', 'normal', 'hard']) as BotLevel[];
const flag = (n: string) => process.argv.includes(n);
const Opp = flag('--expert') ? Expert : flag('--strategist') ? Strategist : flag('--turtle') ? Turtle : Rusher;
const oppName = flag('--expert') ? 'usta oyuncu' : flag('--strategist') ? 'planlı oyuncu' : flag('--turtle') ? 'kaplumbağa oyuncu' : 'saldırgan oyuncu';
const useOld = flag('--old'); // botun eski sürümünü ölç
const DT = B.TICK_MS / 1000;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

for (const level of levels) {
  let botWins = 0;
  let rushWins = 0;
  let draws = 0;
  let totalT = 0;
  const botTurrets: number[] = [];
  const botArmed: number[] = [];
  for (let g = 0; g < games; g++) {
    const state = new BattleState();
    const sim = new Simulation(state);
    // tarafları dönüşümlü ver (sol/sağ avantajı karışmasın)
    const botFirst = g % 2 === 0;
    const a = sim.addPlayer('a', 'A', true);
    const b = sim.addPlayer('b', 'B', true);
    const botP = botFirst ? a : b;
    const rushP = botFirst ? b : a;
    const bot = useOld ? new OldBot(sim, botP, level) : new Bot(sim, botP, level);
    const rush = new Opp(sim, rushP);
    sim.startMatch();
    let maxTurrets = 0;
    let maxArmed = 0;
    while (state.phase !== 'ended' && state.time < 30 * 60) {
      bot.update(DT);
      rush.update(DT);
      sim.tick(DT);
      let n = 0;
      for (let i = 0; i < botP.turrets.length; i++) if (botP.turrets.at(i)!.tier >= 0) n++;
      maxTurrets = Math.max(maxTurrets, n);
      let m = 0;
      state.outposts.forEach((o) => {
        if (o.owner === botP.side && o.armed) m++;
      });
      maxArmed = Math.max(maxArmed, m);
    }
    botTurrets.push(maxTurrets);
    botArmed.push(maxArmed);
    totalT += state.time;
    if (state.phase !== 'ended') draws++;
    else if (state.winner === botP.side) botWins++;
    else rushWins++;
  }
  const avgTur = botTurrets.reduce((s, x) => s + x, 0) / botTurrets.length;
  const avgArmed = botArmed.reduce((s, x) => s + x, 0) / botArmed.length;
  console.log(
    `${useOld ? "eski " : ""}${level.padEnd(6)} vs ${oppName}: bot ${botWins} – oyuncu ${rushWins} – berabere ${draws} | ort. süre ${fmt(totalT / games)} | kale kulesi (ort. en fazla) ${avgTur.toFixed(1)} | silahlı karakol ${avgArmed.toFixed(1)}`,
  );
}
