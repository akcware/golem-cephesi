// Her kule türünü (5 kademe × 3 derece) sabit duran bir düşman kümesine ateşletip etkisini raporlar.
// Kullanım: npx tsx tools/turret-check.ts
import * as B from '../shared/balance';
import { BattleState, Unit } from '../server/state';
import { Simulation } from '../server/sim';

const DT = B.TICK_MS / 1000;
// Kaleden 120..250 birim uzakta, 40 aralıkla 5 düşman (hepsi menzil içinde)
const OFFSETS = [120, 150, 180, 215, 250];

function run(tier: number, grade: number) {
  const state = new BattleState();
  const sim = new Simulation(state);
  const me = sim.addPlayer('me', 'Ben', true);
  sim.addPlayer('foe', 'Rakip', true);
  sim.startMatch();
  state.phase = 'playing';
  // komutanlar ve Eter Kaynağı ölçümü bozmasın
  state.players.forEach((p) => (p.cmdRespawn = 1e9));
  state.src.next = 1e9;
  const t = me.turrets.at(0)!;
  t.tier = tier;
  t.grade = grade;
  t.cd = 0;
  const units: Unit[] = [];
  OFFSETS.forEach((off, i) => {
    const u = new Unit();
    u.id = `e${i}`;
    u.side = 1;
    u.arch = 'melee';
    u.tier = 0;
    // yeteneksiz, hareketsiz, çok dayanıklı hedef (Kök Salma gibi yetenekler ölçümü bozmasın)
    u.def = { ...B.unitDef(0, 'melee'), speed: 0, range: 0, hp: 1e9, ability: { name: '', desc: '', p: {} } };
    u.hp = u.maxHp = 1e9;
    u.x = B.baseFrontX(0) + off + u.def.radius;
    state.units.set(u.id, u);
    units.push(u);
  });
  const def = B.turretDef(tier, grade);
  // tek atış + bombanın düşmesi + (varsa) yanma süresinin bir kısmı
  const span = def.cd * 0.5 + B.LOB_TIME + 0.2 + Math.min(1, def.burnDur);
  let maxStatus = 0;
  for (let s = 0; s < span; s += DT) {
    sim.tick(DT);
    for (const u of units) maxStatus |= u.status;
    if (t.shots >= 1 && def.kind !== 'lob' && def.kind !== 'fire' && def.burnDur === 0 && s > 0.1) break;
  }
  const dmgs = units.map((u) => Math.round(1e9 - u.hp));
  const slowed = units.filter((u) => u.slowT > 0).length;
  const hit = dmgs.filter((d) => d > 0).length;
  const flags = [maxStatus & 1 ? 'yavaş' : '', maxStatus & 2 ? 'yanma' : ''].filter(Boolean).join(',');
  console.log(
    `${B.TIERS[tier].name.padEnd(7)} ${def.label.padEnd(5)} ${def.name.padEnd(18)} ${def.kind.padEnd(6)} atış=${t.shots} vurulan=${hit} hasarlar=[${dmgs.join(', ')}] yavaşlayan=${slowed} ${flags}`,
  );
}

for (let tier = 0; tier <= B.MAX_TIER; tier++) for (let g = 0; g < B.TURRET_GRADE_COUNT; g++) run(tier, g);
