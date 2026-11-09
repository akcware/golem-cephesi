// Eğitim maçını, talimatları izleyen sanal oyuncularla baştan sona oynatır.
// Her adıma ulaşıldığını, oyuncu kalesinin düşmediğini ve maçın oyuncunun zaferiyle bittiğini denetler.
// İki oyuncu: durmadan golem basan ("seri") ve ordusunu küçük tutan ("ölçülü").
// Kullanım: npx tsx tools/tutorial-check.ts
import * as B from '../shared/balance';
import type { FxEvent } from '../shared/protocol';
import { TUTORIAL } from '../shared/tutorial';
import { BattleState } from '../server/state';
import { Simulation } from '../server/sim';
import { Tutorial, TUTOR_NAME } from '../server/tutorial';

const DT = B.TICK_MS / 1000;
let fails = 0;
function check(name: string, ok: boolean, info = '') {
  console.log(`${ok ? 'TAMAM' : 'HATA '}  ${name}${info ? '  — ' + info : ''}`);
  if (!ok) fails++;
}

function play(label: string, maxUnits: number, delay: number) {
  console.log(`\n── ${label} oyuncu (en fazla ${maxUnits} golem, ${delay} sn'de bir hamle) ──`);
  const state = new BattleState();
  state.mode = 'tutorial';
  let tut: Tutorial | undefined;
  const sim = new Simulation(state, (fx: FxEvent) => tut?.onFx(fx));
  const tutor = sim.addPlayer('bot', TUTOR_NAME, true);
  const me = sim.addPlayer('me', 'Çaylak', false);
  const log: string[] = [];
  tut = new Tutorial(sim, tutor, (m) => log.push(m));
  sim.startMatch();

  const mine = () => {
    let n = 0;
    state.units.forEach((u) => {
      if (u.side === me.side && !u.cmd) n++;
    });
    return n;
  };
  const train = (arch: B.Arch) => {
    if (mine() + me.queue.length < maxUnits) sim.train(me, arch);
  };

  const reached = new Map<number, number>();
  let minHp = 1;
  let t = 0;
  let lastAct = 0;
  while (t < 15 * 60 && state.phase !== 'ended') {
    tut.update(DT);
    sim.tick(DT);
    t += DT;
    if (state.tut >= 0 && !reached.has(state.tut)) reached.set(state.tut, state.time);
    minHp = Math.min(minHp, me.baseHp / me.baseMaxHp);
    // sanal oyuncu: ekranda yazanı yapar
    if (t - lastAct < delay || state.phase !== 'playing') continue;
    lastAct = t;
    switch (TUTORIAL[state.tut]?.id) {
      case 'intro':
        tut.next();
        break;
      case 'train':
      case 'fight':
      case 'counter':
      case 'capture':
        train('melee');
        break;
      case 'heavy':
        train('ranged');
        break;
      case 'hold':
        sim.setStance(me, 'hold');
        break;
      case 'gather':
        train('melee');
        if (mine() >= 4) sim.setStance(me, 'attack');
        break;
      case 'outpost':
        state.outposts.forEach((o, i) => {
          if (o.owner === me.side && !o.built) sim.outpostBuild(me, i);
        });
        break;
      case 'turret':
        sim.turretBuy(me, 0, 0);
        break;
      case 'evolve':
        sim.evolve(me);
        break;
      case 'card':
        if (me.offer.length) sim.cardPick(me, me.offer.at(0)!);
        break;
      case 'cmd':
        sim.cmdSkill(me);
        break;
      case 'special':
        sim.special(me);
        break;
      case 'finish':
        sim.setStance(me, 'attack');
        train('melee');
        break;
    }
  }

  const missing = TUTORIAL.map((s, i) => (reached.has(i) ? '' : s.id)).filter(Boolean);
  check('tüm adımlara ulaşılır', missing.length === 0, missing.length ? `eksik: ${missing.join(', ')}` : TUTORIAL.map((s, i) => `${s.id} ${Math.round(reached.get(i)!)}`).join(' · '));
  check('maç oyuncunun zaferiyle biter', state.phase === 'ended' && state.winner === me.side, `süre ${Math.round(state.time)} sn`);
  check('oyuncu kalesi korunur', minHp >= 0.49, `en düşük %${Math.round(minHp * 100)}`);
  check('eğitim 8 dakikadan kısa', state.time < 8 * 60, `${Math.round(state.time)} sn`);
  check('sunucu günlüğüne adımlar yazılır', log.length >= TUTORIAL.length, `${log.length} satır`);
  return { sim, tut, state };
}

play('seri', B.MAX_UNITS_PER_SIDE, 0.5);
const { sim, tut, state } = play('ölçülü', 6, 2);

// rövanş: baştan başlar
sim.startMatch();
for (let i = 0; i < 80; i++) {
  tut!.update(DT);
  sim.tick(DT);
}
check('rövanşta eğitim baştan başlar', state.tut === 0, `tut=${state.tut}`);

console.log(fails ? `\n${fails} hata` : '\nHepsi tamam');
process.exit(fails ? 1 : 0);
