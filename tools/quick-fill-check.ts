// Hızlı eşleşmede boşluk doldurmayı gerçek sunucu ve istemciyle dener:
// tek oyuncuya bekleme sonunda rakip gelir (istemciye bot görünmez), iki oyuncu birbiriyle eşleşir,
// açık bot modu hâlâ bot olarak görünür; maç sonu rövanş kararları insan gibi zamanlanır.
// Kullanım: npx tsx tools/quick-fill-check.ts
process.env.BOT_FILL_WAIT = '0.6-1.2';
import * as B from '../shared/balance';

const { defineServer, defineRoom } = await import('@colyseus/core');
const { Client } = await import('@colyseus/sdk');
const { BattleRoom } = await import('../server/BattleRoom');
const { BattleState } = await import('../server/state');
const { Simulation } = await import('../server/sim');
const { Bot } = await import('../server/bot');
const { PERSONAS, acquirePersona, releasePersona } = await import('../server/personas');

// sunucu günlüğündeki eşleşme satırlarını yakala (oyuncu gücünün sunucuya ulaştığını görmek için)
const logs: string[] = [];
const origLog = console.log;
console.log = (...a: unknown[]) => {
  const line = a.map(String).join(' ');
  if (line.startsWith('[eşleşme')) logs.push(line);
  origLog(...a);
};

let fails = 0;
function check(name: string, ok: boolean, info = '') {
  console.log(`${ok ? 'TAMAM' : 'HATA '}  ${name}${info ? '  — ' + info : ''}`);
  if (!ok) fails++;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean, ms = 4000) {
  const t0 = Date.now();
  while (!fn() && Date.now() - t0 < ms) await sleep(30);
  return fn();
}
type P = { id: string; name: string; isBot: boolean; botKind: string };
const players = (room: any): P[] => {
  const out: P[] = [];
  room.state.players?.forEach((p: P) => out.push(p));
  return out;
};

const PORT = 2599;
const server = defineServer({ rooms: { battle: defineRoom(BattleRoom).filterBy(['mode']) } });
await server.listen(PORT);
const client = () => new Client(`http://localhost:${PORT}`);

// 1) tek oyuncu: bekleme bitince rakip gelir, istemciye gerçek oyuncu gibi görünür
{
  const room = await client().joinOrCreate('battle', { mode: 'quick', name: 'Deneme' });
  const waitingFirst = await until(() => room.state.phase === 'waiting', 1000);
  check('ilk anda rakip aranıyor', waitingFirst);
  const filled = await until(() => room.state.phase === 'countdown');
  const foe = players(room).find((p) => p.id !== room.sessionId);
  check('bekleme sonunda maç başlar', filled, `faz=${room.state.phase}`);
  check('rakip istemciye bot görünmez', !!foe && foe.isBot === false && foe.botKind === '');
  check('rakip kimliği oturum kimliği gibi', !!foe && foe.id.length === room.sessionId.length && foe.id !== 'bot', foe?.id);
  check('rakibin adı oyuncu adı gibi', !!foe && foe.name.length >= 3 && foe.name.length <= 16 && !/Simyacı|Alchemist/.test(foe.name), foe?.name);
  // oda kilitli: yeni gelen bu odaya düşmez
  const other = await client().joinOrCreate('battle', { mode: 'quick', name: 'Üçüncü' });
  check('dolu odaya üçüncü kişi girmez', other.roomId !== room.roomId);
  await other.leave();
  await room.leave();
}

// 2) iki gerçek oyuncu bekleme içinde gelirse birbiriyle eşleşir
{
  const a = await client().joinOrCreate('battle', { mode: 'quick', name: 'Ali' });
  const b = await client().joinOrCreate('battle', { mode: 'quick', name: 'Veli' });
  await until(() => a.state.phase === 'countdown');
  const ids = players(a).map((p) => p.id).sort();
  check('iki oyuncu birbiriyle eşleşir', a.roomId === b.roomId && ids.join() === [a.sessionId, b.sessionId].sort().join(), ids.join());
  await a.leave();
  await b.leave();
}

// 3) oyuncunun cihazdaki güç tahmini sunucuya ulaşır; bozuk değer varsayılana düşer
for (const [skill, want] of [[0.95, '0.95'], ['abc', '0.35']] as const) {
  logs.length = 0;
  const room = await client().joinOrCreate('battle', { mode: 'quick', name: 'Deneme', skill });
  await until(() => room.state.phase === 'countdown');
  check(`güç tahmini ${JSON.stringify(skill)} → ${want}`, logs.some((l) => l.includes(`oyuncu gücü ${want}`)), logs[0]);
  await room.leave();
}

// 4) açık bot modu değişmedi
{
  const room = await client().create('battle', { mode: 'bot', name: 'Deneme', level: 'normal' });
  await until(() => players(room).length === 2);
  const foe = players(room).find((p) => p.id !== room.sessionId);
  check('bot modunda rakip bot olarak görünür', !!foe && foe.isBot && foe.botKind === 'normal', `${foe?.name} (${foe?.botKind})`);
  await room.leave();
}

await server.gracefullyShutdown(false);

// 5) kişilik seçimi hedef güce yakın
{
  let worst = 0;
  for (const t of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
    for (let i = 0; i < 20; i++) {
      const p = acquirePersona(t);
      worst = Math.max(worst, Math.abs(p.skill - t));
      releasePersona(p);
    }
  }
  check('kişilik hedef güce yakın seçilir', worst < 0.16, `en uzak ${worst.toFixed(2)}`);
  const held = Array.from({ length: 30 }, () => acquirePersona(0.5));
  check('aynı kişilik aynı anda iki maçta olmaz', new Set(held.map((p) => p.id)).size === held.length);
  held.forEach(releasePersona);
}

// 6) maç sonu: rövanş kararı birkaç saniye sürer; kimi kabul eder, kimi ayrılır
{
  const DT = B.TICK_MS / 1000;
  let accept = 0;
  let leave = 0;
  let early = 0;
  const N = 200;
  for (let i = 0; i < N; i++) {
    const state = new BattleState();
    const sim = new Simulation(state);
    sim.addPlayer('h', 'İnsan', false);
    const bp = sim.addPlayer('x', 'Rakip', true, '', false);
    const bot = new Bot(sim, bp, PERSONAS[i % PERSONAS.length]);
    sim.startMatch();
    for (let t = 0; t < 5; t += DT) {
      bot.update(DT);
      sim.tick(DT);
    }
    sim.endGame(i % 2, 'base');
    let t = 0;
    for (; t < 12 && !bp.wantsRematch && !bp.left; t += DT) bot.update(DT);
    if (t < 1.9) early++;
    if (bp.wantsRematch) accept++;
    else if (bp.left) leave++;
  }
  check('rövanş kararı hemen verilmez', early === 0, `${early} erken`);
  check('kimi rövanşı kabul eder, kimi ayrılır', accept > N * 0.2 && leave > N * 0.1, `kabul ${accept} / ayrıldı ${leave} / ${N}`);
}

console.log(fails ? `\n${fails} hata` : '\nHepsi tamam');
process.exit(fails ? 1 : 0);
