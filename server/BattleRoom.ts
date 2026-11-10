// Bir maç = bir oda. Oyuncu bağlantıları, komut mesajları ve simülasyon döngüsü burada.
import { Room, generateId, type Client } from '@colyseus/core';
import * as B from '../shared/balance';
import type { BotLevel, GameMode, JoinOptions } from '../shared/protocol';
import { BattleState, Player } from './state';
import { Simulation } from './sim';
import { botName, isLang, type Lang } from '../shared/i18n';
import { Bot } from './bot';
import { Tutorial } from './tutorial';
import { acquirePersona, releasePersona, type Persona } from './personas';

type Delayed = ReturnType<Room['clock']['setTimeout']>;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // karışan I ve O yok
const usedCodes = new Set<string>();

function generateCode(): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!usedCodes.has(code)) {
      usedCodes.add(code);
      return code;
    }
  }
}

// Hızlı eşleşme: ilk oyuncu girdikten sonra bu kadar saniye (rastgele) gerçek bir rakip beklenir; gelmezse
// gerçek oyuncu gibi görünen bir yapay zeka rakip girer. BOT_FILL=off ile kapatılır,
// BOT_FILL_WAIT=5-18 ile bekleme aralığı (sn) değiştirilir.
const [FILL_MIN_S, FILL_MAX_S] = (() => {
  const [a, b] = (process.env.BOT_FILL_WAIT ?? '').split('-').map(Number);
  return a >= 0 && b >= a ? [a, b] : [5, 18];
})();
const FILL_ON = process.env.BOT_FILL !== 'off';
/** Oyuncu gücü bilinmiyorsa seçilecek rakip gücü (0 acemi … 1 usta). */
const FILL_DEFAULT_SKILL = 0.35;

function cleanName(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16) : '';
  return s || 'Alchemist';
}

export class BattleRoom extends Room<{ state: BattleState }> {
  maxClients = 2;
  state = new BattleState();

  private sim!: Simulation;
  private bot?: Bot;
  private tutorial?: Tutorial;
  private code?: string;
  private fillTimer?: Delayed;
  private fillSince = 0;
  private fillSkill = FILL_DEFAULT_SKILL;
  private fillLang?: Lang;
  private persona?: Persona;

  onCreate(options: JoinOptions) {
    const mode: GameMode = options?.mode === 'private' || options?.mode === 'bot' || options?.mode === 'tutorial' ? options.mode : 'quick';
    this.state.mode = mode;
    this.sim = new Simulation(this.state, (fx) => {
      this.tutorial?.onFx(fx);
      this.broadcast('fx', fx);
    });

    if (mode === 'private') {
      this.code = generateCode();
      this.roomId = this.code;
      this.state.code = this.code;
      this.setPrivate(true);
    }

    if (mode === 'bot') {
      this.maxClients = 1;
      const level: BotLevel = options?.level === 'easy' || options?.level === 'hard' ? options.level : 'normal';
      // name İngilizce yedek ad; istemciler bot adını botKind'dan kendi dillerinde yazar
      const botPlayer = this.sim.addPlayer('bot', botName(level), true, level);
      this.bot = new Bot(this.sim, botPlayer, level);
    }

    if (mode === 'tutorial') {
      // Eğitim: rakip tarafı senaryolu eğitmen oynar. Adım ilerlemesi sunucu günlüğüne yazılır
      // (oyuncuların nerede bıraktığını görmek için).
      this.maxClients = 1;
      const tutor = this.sim.addPlayer('bot', botName('tutor'), true, 'tutor');
      this.tutorial = new Tutorial(this.sim, tutor, (m) => console.log(`[eğitim ${this.roomId}] ${m}`));
    }

    this.registerMessages();
    this.setPatchRate(B.TICK_MS);
    this.setSimulationInterval((dtMs) => this.update(dtMs / 1000), B.TICK_MS);
  }

  private me(client: Client): Player | undefined {
    return this.state.players.get(client.sessionId);
  }

  private registerMessages() {
    const on = (type: string, fn: (p: Player, msg: any) => void) =>
      this.onMessage(type, (client, msg) => {
        const p = this.me(client);
        if (p) fn(p, msg ?? {});
      });

    on('train', (p, m) => this.sim.train(p, m.arch));
    on('cancel', (p, m) => this.sim.cancel(p, Number(m.index)));
    on('evolve', (p) => this.sim.evolve(p));
    on('stance', (p, m) => this.sim.setStance(p, m.stance));
    on('special', (p) => this.sim.special(p));
    on('slot_buy', (p) => this.sim.slotBuy(p));
    on('outpost_build', (p, m) => this.sim.outpostBuild(p, Number(m.index)));
    on('turret_buy', (p, m) => this.sim.turretBuy(p, Number(m.slot), Number(m.grade)));
    on('turret_sell', (p, m) => this.sim.turretSell(p, Number(m.slot)));
    on('turret_upgrade', (p, m) => this.sim.turretUpgrade(p, Number(m.slot), Number(m.grade)));
    on('card_pick', (p, m) => this.sim.cardPick(p, m.id));
    on('cmd_skill', (p) => this.sim.cmdSkill(p));
    on('tut_next', () => this.tutorial?.next());
    // Test kolaylığı: sadece "npm run dev" ile başlatılan sunucuda (--dev) açık
    if (process.argv.includes('--dev')) {
      on('dev', (p, m) => this.sim.devGrant(p, Number(m.gold), Number(m.xp)));
    }
    on('rematch', (p) => {
      if (this.state.phase !== 'ended') return;
      p.wantsRematch = true;
      this.tryRematch();
    });
  }

  private tryRematch() {
    if (this.state.players.size < 2) return;
    let all = true;
    this.state.players.forEach((pl) => {
      if (pl.left || !pl.connected || !pl.wantsRematch) all = false;
    });
    if (all) this.sim.startMatch();
  }

  private update(dt: number) {
    // Bir insan oyuncunun bağlantısı koptuysa oyunu dondur (yeniden bağlanabilsin)
    let someoneAway = false;
    this.state.players.forEach((p) => {
      if (!p.ai && !p.connected && !p.left) someoneAway = true;
    });
    const active = this.state.phase === 'playing' || this.state.phase === 'countdown';
    this.state.paused = active && someoneAway;

    this.bot?.update(dt);
    this.tutorial?.update(dt);
    this.sim.tick(dt);
    if (this.state.phase === 'ended' && (this.bot || this.tutorial)) this.tryRematch();
  }

  onJoin(client: Client, options: JoinOptions) {
    this.sim.addPlayer(client.sessionId, cleanName(options?.name), false);
    if (this.state.players.size === 2) {
      this.cancelFill();
      this.lock();
      this.sim.startMatch();
    } else if (this.state.mode === 'quick' && FILL_ON) {
      const sk = Number(options?.skill);
      this.fillSkill = options?.skill !== undefined && Number.isFinite(sk) ? Math.max(0, Math.min(1, sk)) : FILL_DEFAULT_SKILL;
      this.fillLang = isLang(options?.lang) ? options.lang : undefined;
      this.scheduleFill(FILL_MIN_S + (FILL_MAX_S - FILL_MIN_S) * Math.random() ** 1.5);
    }
  }

  // ── hızlı eşleşmede boşluğu doldurma ─────────────────────
  private scheduleFill(seconds: number) {
    this.cancelFill();
    if (!this.fillSince) this.fillSince = Date.now();
    this.fillTimer = this.clock.setTimeout(() => this.fillWithBot(), seconds * 1000);
  }

  private cancelFill() {
    this.fillTimer?.clear();
    this.fillTimer = undefined;
  }

  /** Bekleme süresi doldu ve hâlâ rakip yok: gerçek oyuncu gibi görünen yapay zeka rakip girer. */
  private fillWithBot() {
    this.fillTimer = undefined;
    if (this.state.phase !== 'waiting' || this.state.players.size !== 1 || this.bot) return;
    // Tam şu an bağlanan gerçek bir oyuncu varsa (koltuğu ayrılmış) onu bekle: gerçek rakip her zaman önce gelir
    if (this.hasReachedMaxClients()) {
      this.scheduleFill(2);
      return;
    }
    let human: Player | undefined;
    this.state.players.forEach((p) => (human = p));
    const persona = acquirePersona(this.fillSkill, human?.name, this.fillLang);
    this.persona = persona;
    // id gerçek bir oturum kimliği gibi; isBot istemciye false gider
    const botPlayer = this.sim.addPlayer(generateId(), persona.name, true, '', false);
    const bot = new Bot(this.sim, botPlayer, persona);
    this.bot = bot;
    this.lock(); // bot bir istemci değil: Colyseus odayı kendiliğinden kilitlemez
    this.sim.startMatch();
    const waited = Math.round((Date.now() - this.fillSince) / 1000);
    console.log(
      `[eşleşme ${this.roomId}] ${waited} sn sonra yapay zeka rakip: ${persona.name} (#${persona.id}, ${persona.region}) — oyuncu ${this.fillLang ?? '?'}, gücü ${this.fillSkill.toFixed(2)}, rakip ${bot.skill.toFixed(2)}`,
    );
  }

  // Beklenmedik kopma. Maç sürüyorsa yeniden bağlanma izni ver; süre dolarsa Colyseus onLeave'i çağırır.
  // Maç dışında izin vermiyoruz: onDrop dönünce doğrudan onLeave çalışır.
  onDrop(client: Client) {
    const p = this.me(client);
    if (!p) return;
    p.connected = false;
    if (this.state.phase === 'playing' || this.state.phase === 'countdown') {
      this.allowReconnection(client, B.RECONNECT_S);
    }
  }

  onReconnect(client: Client) {
    const p = this.me(client);
    if (p) p.connected = true;
  }

  onLeave(client: Client) {
    const p = this.me(client);
    if (!p) return;
    const phase = this.state.phase;
    if (phase === 'waiting') {
      this.state.players.delete(client.sessionId);
      this.cancelFill();
      this.fillSince = 0;
      this.unlock();
      return;
    }
    p.connected = false;
    p.left = true;
    if (this.tutorial && phase === 'playing') console.log(`[eğitim ${this.roomId}] bıraktı (adım ${this.state.tut + 1})`);
    if (phase === 'playing' || phase === 'countdown') this.sim.endGame(1 - p.side, 'forfeit');
  }

  onDispose() {
    if (this.code) usedCodes.delete(this.code);
    releasePersona(this.persona);
  }
}
