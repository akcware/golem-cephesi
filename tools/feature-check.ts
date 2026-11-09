// Çağ kartları, komutan ve Eter Kaynağı kurallarını tek tek dener. Kullanım: npx tsx tools/feature-check.ts
import * as B from '../shared/balance';
import { BattleState, type Player, type Unit } from '../server/state';
import { Simulation } from '../server/sim';

const DT = B.TICK_MS / 1000;
let fails = 0;
function check(name: string, ok: boolean, info = '') {
  console.log(`${ok ? 'TAMAM' : 'HATA '}  ${name}${info ? '  — ' + info : ''}`);
  if (!ok) fails++;
}

function setup() {
  const state = new BattleState();
  const fx: any[] = [];
  const sim = new Simulation(state, (f) => fx.push(f));
  const a = sim.addPlayer('a', 'A', true);
  const b = sim.addPlayer('b', 'B', true);
  sim.startMatch();
  for (let i = 0; i < 70; i++) sim.tick(DT); // geri sayım bitsin
  return { state, sim, a, b, fx };
}
const run = (sim: Simulation, s: number) => {
  for (let t = 0; t < s; t += DT) sim.tick(DT);
};
const spawn = (sim: Simulation, p: Player, arch: B.Arch, x: number): Unit => (sim as any).spawn(p, B.unitDef(p.tier, arch), x);
const cmdOf = (st: BattleState, p: Player) => (p.cmdId ? st.units.get(p.cmdId) : undefined);

// ── kartlar ──
{
  const { sim, a, state } = setup();
  sim.devGrant(a, 5000, B.TIERS[1].xpToReach);
  sim.evolve(a);
  check('çağ atlayınca 3 kart sunulur', a.picks === 1 && a.offer.length === 3, `picks=${a.picks} offer=${a.offer.length}`);
  const pickId = a.offer.at(0)!;
  check('sunulmayan kart seçilemez', !sim.cardPick(a, B.CARDS.find((c) => !a.offer.includes(c.id))!.id));
  check('sunulan kart seçilir', sim.cardPick(a, pickId) && a.cards.length === 1 && a.picks === 0 && a.offer.length === 0);
  // Döküm Ustalığı: ağır golem ucuz, iade aynı
  a.cards.clear();
  a.cards.push('foundry');
  (sim as any).mods[a.side] = B.cardMods(a.cards);
  const before = a.goldF;
  sim.train(a, 'heavy');
  const paid = before - a.goldF;
  check('Döküm Ustalığı ağırı %25 ucuzlatır', paid === B.unitCost(1, 'heavy', B.cardMods(['foundry'])) && paid < B.unitDef(1, 'heavy').cost, `ödenen ${paid} / normal ${B.unitDef(1, 'heavy').cost}`);
  sim.cancel(a, 0);
  check('iptal ödenen kadar iade eder', Math.abs(a.goldF - before) < 1e-6);
  // Sur Tahkimi: kale canı +%30 (hemen)
  sim.devGrant(a, 0, B.TIERS[2].xpToReach);
  sim.evolve(a);
  const maxBefore = a.baseMaxHp;
  if (!a.offer.includes('rampart')) {
    a.offer.clear();
    a.offer.push('rampart');
  }
  sim.cardPick(a, 'rampart');
  check('Sur Tahkimi kale canını artırır', Math.abs(a.baseMaxHp - maxBefore * 1.3) < 1, `${maxBefore} → ${a.baseMaxHp}`);
  void state;
}

// ── komutan ──
{
  const { sim, a, b, state, fx } = setup();
  check('maç başında komutan yok', !a.cmdId);
  run(sim, B.CMD_SPAWN_DELAY + 0.2);
  const c = cmdOf(state, a);
  check('komutan doğar', !!c && c.cmd && c.lvl === 1, c ? `can ${c.maxHp} hasar ${c.def.dmg}` : '');
  // yetenek: önünde düşman yoksa kullanılamaz
  a.cmdCd = 0;
  check('düşman yokken yetenek kullanılamaz', !sim.cmdSkill(a));
  // önüne 3 düşman koy
  const cb = cmdOf(state, b);
  if (cb) state.units.delete(cb.id); // rakip komutanı karıştırmasın
  b.cmdRespawn = 999;
  const foes = [0, 1, 2].map((i) => spawn(sim, b, 'melee', c!.x + 120 + i * 20));
  const x0 = c!.x;
  const lvlBefore = a.cmdLvl;
  check('yetenek kullanılır', sim.cmdSkill(a) && a.cmdCd > 0);
  check('komutan ileri atılır', c!.x > x0 + 50, `${Math.round(x0)} → ${Math.round(c!.x)}`);
  run(sim, B.CMD_LAND + 0.05);
  const stunned = foes.filter((f) => state.units.has(f.id) && f.stunT > 0).length;
  const dead = foes.filter((f) => !state.units.has(f.id)).length;
  check('darbe düşmanları sersemletir ya da öldürür', stunned + dead === 3, `sersem ${stunned}, ölü ${dead}`);
  // seviye: öldürmeler
  for (let i = 0; i < 6; i++) spawn(sim, b, 'ranged', c!.x + 30 + i * 4);
  run(sim, 8);
  check('komutan öldürdükçe seviye atlar', a.cmdLvl > lvlBefore, `kills ${a.cmdKills}, Sv${a.cmdLvl}`);
  // ölüm ve geri dönüş
  (sim as any).damage(c!, 1e9, 1, 'melee');
  (sim as any).flushDead();
  check('komutan ölünce geri sayım başlar', !a.cmdId && a.cmdRespawn === B.CMD_RESPAWN);
  run(sim, B.CMD_RESPAWN + 0.5);
  check('komutan geri döner (seviyesi korunur)', !!cmdOf(state, a) && cmdOf(state, a)!.lvl === a.cmdLvl);
  check('komutan olayları gönderilir', ['spawn', 'leap', 'slam', 'level', 'die'].every((k) => fx.some((f) => f.t === 'cmd' && f.k === k)));
}

// ── Eter Kaynağı ──
{
  const { sim, a, b, state, fx } = setup();
  // komutanları sahneden çıkar
  a.cmdRespawn = b.cmdRespawn = 1e9;
  run(sim, B.SOURCE_FIRST - 1);
  check('kaynak 2. dakikadan önce yok', !state.src.active);
  run(sim, 1.2);
  check('kaynak belirir', state.src.active && B.SOURCE_XS.includes(state.src.x), `x=${state.src.x} tür=${state.src.kind}`);
  state.src.kind = 'gold';
  const g0 = a.goldF;
  const u = spawn(sim, a, 'melee', state.src.x);
  a.stance = 'hold'; // yerinden oynamasın diye dizilim noktası uzakta; birimi her adım geri koyarız
  for (let t = 0; t < B.SOURCE_TIME + 0.5; t += DT) {
    u.x = state.src.x;
    sim.tick(DT);
  }
  check('tek başına tutan taraf alır', !state.src.active && fx.some((f) => f.t === 'src' && f.k === 'taken' && f.side === a.side));
  const gain = a.goldF - g0;
  check('Altın Pınarı altın verir', gain >= B.TIERS[0].income * B.SOURCE_GOLD_S, `+${Math.round(gain)}`);
  check('sıradaki kaynak 150 sn sonra', Math.abs(state.src.next - B.SOURCE_EVERY) < 1);
  // öfke
  state.src.next = 0;
  run(sim, DT * 2);
  state.src.kind = 'fury';
  const v = spawn(sim, b, 'melee', state.src.x);
  for (let t = 0; t < B.SOURCE_TIME + 0.5; t += DT) {
    v.x = state.src.x;
    u.x = 0;
    sim.tick(DT);
  }
  check('Eter Öfkesi alan tarafa süre verir', b.furyT > 0, `furyT=${b.furyT.toFixed(1)}`);
}

console.log(fails ? `\n${fails} kontrol başarısız` : '\nHepsi tamam');
process.exit(fails ? 1 : 0);
