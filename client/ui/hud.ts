// Oyun içi arayüz (HTML katmanı): kaynaklar, birim butonları, kuleler, özel güç, mini harita, ekranlar.
import type { Room } from '@colyseus/sdk';
import * as B from '../../shared/balance';
import type { Arch } from '../../shared/balance';
import type { FxEvent, IBattleState, IPlayer } from '../../shared/protocol';
import type { GameScene } from '../scenes/GameScene';
import { WORLD_MAX, WORLD_MIN } from '../scenes/GameScene';
import type { IconSet } from '../textures';
import { sfx } from '../sfx';
import { music, musicButton } from '../music';
import { TENSION_HP } from '../tracks';
import { fmtNum, fmtTime, h, setClass, setText, toast } from './dom';
import { TUTORIAL, TUT_REVEAL, tipDef, tutIndex, type TutTarget } from '../../shared/tutorial';
import { markTip, pendingTip, setTutorialDone } from './onboarding';

const KEYS: Record<Arch, string> = { melee: '1', ranged: '2', heavy: '3' };

interface SideCard {
  el: HTMLElement;
  name: HTMLElement;
  tier: HTMLElement;
  fill: HTMLElement;
  hpText: HTMLElement;
  chips: HTMLElement;
  chipKey: string;
}

/** Çağ kartı seçim tuşları. */
const CARD_KEYS = ['z', 'x', 'c'];

/** Oyuncunun seçtiği kartların simgeleri (bitiş ekranı). */
function cardIcons(p: IPlayer): string {
  const out: string[] = [];
  p.cards?.forEach((id) => out.push(B.cardDef(id)?.icon ?? ''));
  return out.join(' ') || '—';
}

export class Hud {
  readonly el: HTMLElement;
  private room?: Room;
  private side = 0;
  private interval = 0;
  private raf = 0;
  private lastTier = -1;
  private lastPhase = '';
  private lastCount = -1;
  private lastOverlayKey = '';

  private me!: SideCard;
  private foe!: SideCard;
  private timerEl!: HTMLElement;
  private minimap!: HTMLCanvasElement;
  private goldEl!: HTMLElement;
  private incomeEl!: HTMLElement;
  private countEl!: HTMLElement;
  private unitBtns = {} as Record<Arch, { btn: HTMLButtonElement; img: HTMLImageElement; name: HTMLElement; cost: HTMLElement; tip: HTMLElement }>;
  private queueEls: { el: HTMLElement; img: HTMLImageElement; prog: HTMLElement }[] = [];
  private slotEls: { el: HTMLElement; main: HTMLButtonElement; img: HTMLImageElement; label: HTMLElement; cost: HTMLElement; sell: HTMLButtonElement }[] = [];
  private stanceBtn!: HTMLButtonElement;
  private stanceIcon!: HTMLElement;
  private stanceLabel!: HTMLElement;
  private stanceHint!: HTMLElement;
  private specialBtn!: HTMLButtonElement;
  private specialImg!: HTMLImageElement;
  private specialCd!: HTMLElement;
  private specialName!: HTMLElement;
  private evolveBtn!: HTMLButtonElement;
  private evolveFill!: HTMLElement;
  private evolveLabel!: HTMLElement;
  private evolveXp!: HTMLElement;
  private opEls: { btn: HTMLButtonElement; label: HTMLElement }[] = [];
  private srcEl!: HTMLElement;
  private furyEl!: HTMLElement;
  private cmdBtn!: HTMLButtonElement;
  private cmdImg!: HTMLImageElement;
  private cmdFill!: HTMLElement;
  private cmdLabel!: HTMLElement;
  private cmdCdEl!: HTMLElement;
  private offerEl!: HTMLElement;
  private offerKey = '';
  private lastSiege = false;
  private overlay!: HTMLElement;
  private banner!: HTMLElement;
  private muteBtn!: HTMLButtonElement;
  private musicBtn!: HTMLButtonElement;
  // yeni oyuncu rehberi
  private unitsGroup!: HTMLElement;
  private queueGroup!: HTMLElement;
  private slotsGroup!: HTMLElement;
  private opsRow!: HTMLElement;
  private coach!: { el: HTMLElement; step: HTMLElement; title: HTMLElement; text: HTMLElement; next: HTMLButtonElement; skip: HTMLButtonElement };
  private coachKey = '';
  private tipBox!: { el: HTMLElement; text: HTMLElement };
  private tipId = '';
  private tipUntil = 0;
  private tipGap = 0;
  private hl: HTMLElement[] = [];
  // altın sayacı sayarak artar; öldürülen düşmandan sayaca altın uçar
  private goldShown = -1;
  private goldTarget = 0;
  private flying = 0;

  constructor(
    root: HTMLElement,
    private scene: GameScene,
    private icons: IconSet,
    private onLeave: () => void,
    /** Eğitimin sonunda "Bota Karşı Oyna" */
    private onPlayBot: () => void = () => {},
  ) {
    this.el = h('div', { class: 'hud hidden' });
    this.build();
    root.append(this.el);
    window.addEventListener('keydown', (e) => this.onKey(e));
    scene.events.on('coin', (x: number, y: number, n: number) => this.flyCoins(x, y, n));
  }

  // ── kurulum ──────────────────────────────────────────────
  private sideCard(cls: string): SideCard {
    const name = h('span', { class: 'pname' });
    const tier = h('span', { class: 'tier' });
    const fill = h('div', { class: 'fill' });
    const hpText = h('span', { class: 'hptext' });
    const chips = h('div', { class: 'chips' });
    const el = h('div', { class: `card side ${cls}` }, h('div', { class: 'row' }, name, tier), h('div', { class: 'hpbar' }, fill, hpText), chips);
    return { el, name, tier, fill, hpText, chips, chipKey: '' };
  }

  private build() {
    this.me = this.sideCard('me');
    this.foe = this.sideCard('foe');
    this.timerEl = h('div', { class: 'timer', text: '0:00' });
    this.minimap = h('canvas', { class: 'minimap', width: 520, height: 56 });
    const mmMove = (e: PointerEvent) => {
      const r = this.minimap.getBoundingClientRect();
      const k = (e.clientX - r.left) / r.width;
      this.scene.centerOn(WORLD_MIN + k * (WORLD_MAX - WORLD_MIN));
    };
    this.minimap.addEventListener('pointerdown', (e) => {
      mmMove(e);
      this.minimap.setPointerCapture(e.pointerId);
    });
    this.minimap.addEventListener('pointermove', (e) => {
      if (e.buttons) mmMove(e);
    });

    this.muteBtn = h('button', { class: 'icon-btn', title: 'Efekt sesleri', onclick: () => this.toggleMute() });
    this.renderMute();
    this.musicBtn = musicButton();
    const leaveBtn = h('button', { class: 'icon-btn', title: 'Maçtan çık', text: '✕', onclick: () => this.confirmLeave() });

    // ileri karakol noktaları (ekranda soldan sağa: benim kalemden rakibe)
    const opsRow = h('div', {
      class: 'ops',
      title: 'Noktayı ele geçirmek için birimlerin orada tek başına 3 sn kalmalı. Her nokta +%25 gelir. Karakol kurarsan birimlerin oradan doğar ve düşman yıkmadan geçemez. Karakol silahsız kurulur; üstüne ayrıca kule ekleyebilirsin (K).',
    });
    for (let s = 0; s < B.OUTPOST_XS.length; s++) {
      const label = h('span', { class: 'oplabel' });
      const btn = h('button', { class: 'opb', onclick: () => this.opAction(s) }, h('span', { class: 'opflag', text: '⚑' }), label);
      this.opEls.push({ btn, label });
      opsRow.append(btn);
    }

    this.srcEl = h('div', {
      class: 'srcinfo',
      title: `Eter Kaynağı: ortanın bir yanında belirir. Alanında ${B.SOURCE_TIME} sn sadece senin birimlerin durursa ödül senin.`,
    });
    const top = h(
      'div',
      { class: 'top' },
      this.me.el,
      h('div', { class: 'center card' }, this.timerEl, this.minimap, opsRow, this.srcEl),
      this.foe.el,
      h('div', { class: 'corner' }, this.musicBtn, this.muteBtn, leaveBtn),
    );

    this.goldEl = h('b', { text: '0' });
    this.incomeEl = h('small');
    this.countEl = h('span', { class: 'count' });
    this.furyEl = h('span', { class: 'fury hidden', title: B.SOURCE_KINDS.fury.desc });
    const res = h('div', { class: 'res card' }, h('span', { class: 'coin' }), this.goldEl, this.incomeEl, this.countEl, this.furyEl);

    // birim butonları
    const units = h('div', { class: 'group units' });
    for (const arch of B.ARCHES) {
      const img = h('img', { alt: '' });
      const name = h('b', { class: 'uname' });
      const cost = h('span', { class: 'ucost' });
      const tip = h('div', { class: 'tip' });
      const btn = h(
        'button',
        { class: `ubtn ${arch}`, onclick: () => this.send('train', { arch }) },
        img,
        h('div', { class: 'ulabel' }, name, cost),
        h('kbd', { text: KEYS[arch] }),
        tip,
      );
      this.unitBtns[arch] = { btn, img, name, cost, tip };
      units.append(btn);
    }

    // üretim kuyruğu
    const queue = h('div', { class: 'group queue', title: 'Üretim sırası (tıkla: iptal et, altın iade)' });
    for (let i = 0; i < B.MAX_QUEUE; i++) {
      const img = h('img', { alt: '' });
      const prog = h('div', { class: 'prog' });
      const el = h('div', { class: 'q', onclick: () => this.send('cancel', { index: i }) }, img, prog);
      this.queueEls.push({ el, img, prog });
      queue.append(el);
    }

    // kule yuvaları
    const slots = h('div', { class: 'group slots' });
    for (let i = 0; i < B.MAX_SLOTS; i++) {
      const img = h('img', { alt: '' });
      const label = h('span', { class: 'slabel' });
      const cost = h('span', { class: 'scost' });
      const main = h('button', { class: 'smain', onclick: () => this.slotAction(i) }, img, label, cost);
      const sell = h('button', { class: 'sell', title: 'Kuleyi sat', text: 'Sat', onclick: () => this.send('turret_sell', { slot: i }) });
      const el = h('div', { class: 'slot' }, main, sell);
      this.slotEls.push({ el, main, img, label, cost, sell });
      slots.append(el);
    }
    this.buildPicker(slots);

    // duruş (savun / hücum)
    this.stanceIcon = h('span', { class: 'sticon' });
    this.stanceLabel = h('b', { class: 'stlabel' });
    this.stanceHint = h('span', { class: 'sthint' });
    this.stanceBtn = h(
      'button',
      { class: 'stance', onclick: () => this.toggleStance() },
      this.stanceIcon,
      this.stanceLabel,
      this.stanceHint,
      h('kbd', { text: 'S' }),
    );

    // komutan (Sarsıcı Darbe)
    this.cmdImg = h('img', { alt: '' });
    this.cmdFill = h('div', { class: 'cfill' });
    this.cmdLabel = h('span', { class: 'clabel' });
    this.cmdCdEl = h('div', { class: 'cd' });
    this.cmdBtn = h(
      'button',
      {
        class: 'cmdbtn',
        title: `${B.CMD_SKILL_NAME}: komutan öndeki düşmanların üstüne atılır, çevresine büyük hasar verip onları sersemletir (R). Komutan öldürdükçe seviye atlar; ölürse ${B.CMD_RESPAWN} sn sonra döner.`,
        onclick: () => this.send('cmd_skill'),
      },
      this.cmdImg,
      this.cmdCdEl,
      h('div', { class: 'chp' }, this.cmdFill),
      this.cmdLabel,
      h('kbd', { text: 'R' }),
    );

    // özel güç
    this.specialImg = h('img', { alt: '' });
    this.specialCd = h('div', { class: 'cd' });
    this.specialName = h('span', { class: 'sname' });
    this.specialBtn = h(
      'button',
      { class: 'special', onclick: () => this.send('special') },
      this.specialImg,
      this.specialCd,
      this.specialName,
      h('kbd', { text: 'Q' }),
    );

    // kademe yükseltme
    this.evolveFill = h('div', { class: 'efill' });
    this.evolveLabel = h('b', { class: 'elabel' });
    this.evolveXp = h('span', { class: 'exp' });
    this.evolveBtn = h(
      'button',
      { class: 'evolve', onclick: () => this.send('evolve') },
      this.evolveFill,
      this.evolveLabel,
      this.evolveXp,
      h('kbd', { text: 'E' }),
    );

    const bottom = h(
      'div',
      { class: 'bottom' },
      units,
      queue,
      slots,
      h('div', { class: 'group actions' }, this.stanceBtn, this.cmdBtn, this.specialBtn, this.evolveBtn),
    );

    // çağ kartı seçimi (kademe atlayınca belirir)
    this.offerEl = h('div', { class: 'offer hidden' });

    // rehber: eğitim adımı paneli ve gerçek maçlarda bir kerelik ipuçları
    this.unitsGroup = units;
    this.queueGroup = queue;
    this.slotsGroup = slots;
    this.opsRow = opsRow;
    const cStep = h('span', { class: 'cstep' });
    const cTitle = h('b', { class: 'ctitle' });
    const cText = h('p', { class: 'ctext' });
    const cNext = h('button', { class: 'btn primary', text: 'Devam', onclick: () => this.send('tut_next') });
    const cSkip = h('button', { class: 'btn small', text: 'Eğitimi geç', onclick: () => this.skipTutorial() });
    this.coach = {
      el: h('div', { class: 'coach hidden' }, h('div', { class: 'chead' }, cTitle, cStep), cText, h('div', { class: 'crow' }, cSkip, cNext)),
      step: cStep,
      title: cTitle,
      text: cText,
      next: cNext,
      skip: cSkip,
    };
    const tipText = h('span', { class: 'ttext' });
    this.tipBox = {
      el: h('div', { class: 'tipbox hidden' }, h('span', { class: 'ticon', text: '💡' }), tipText, h('button', { class: 'btn small', text: 'Tamam', onclick: () => this.hideTip() })),
      text: tipText,
    };

    this.overlay = h('div', { class: 'overlay hidden' });
    this.banner = h('div', { class: 'banner' });
    this.el.append(top, res, bottom, this.offerEl, this.coach.el, this.tipBox.el, this.overlay, this.banner);
  }

  /** Sunulan kartları çizer (sadece sunum değişince). */
  private renderOffer(me: IPlayer, playing: boolean) {
    const ids: string[] = [];
    if (me.picks > 0) me.offer?.forEach((id) => ids.push(id));
    const key = playing ? ids.join(',') : '';
    if (key === this.offerKey) return;
    this.offerKey = key;
    this.offerEl.innerHTML = '';
    setClass(this.offerEl, 'hidden', !key);
    if (!key) return;
    this.offerEl.append(h('div', { class: 'otitle', text: `Çağ kartı seç${me.picks > 1 ? ` (${me.picks} hak)` : ''}` }));
    const row = h('div', { class: 'orow' });
    ids.forEach((id, i) => {
      const c = B.cardDef(id);
      if (!c) return;
      row.append(
        h(
          'button',
          { class: `cardopt cat-${c.cat === 'güç' ? 'guc' : c.cat}`, onclick: () => this.pickCard(id) },
          h('span', { class: 'cicon', text: c.icon }),
          h('b', { class: 'cname', text: c.name }),
          h('span', { class: 'cdesc', text: c.desc }),
          h('span', { class: 'ccat', text: c.cat }),
          h('kbd', { text: CARD_KEYS[i].toUpperCase() }),
        ),
      );
    });
    this.offerEl.append(row);
    sfx.evolve();
  }

  private pickCard(id: string) {
    this.send('card_pick', { id });
  }

  /** Oyuncunun seçtiği kartlar: küçük rozetler (üzerine gelince açıklama). */
  private renderChips(card: SideCard, p: IPlayer) {
    const ids: string[] = [];
    p.cards?.forEach((id) => ids.push(id));
    const key = ids.join(',');
    if (key === card.chipKey) return;
    card.chipKey = key;
    card.chips.innerHTML = '';
    for (const id of ids) {
      const c = B.cardDef(id);
      if (c) card.chips.append(h('span', { class: 'chip', text: c.icon, title: `${c.name}: ${c.desc}` }));
    }
  }

  // ── bağlama ──────────────────────────────────────────────
  bind(room: Room, side: number) {
    this.room = room;
    this.side = side;
    this.lastTier = -1;
    this.lastPhase = '';
    this.lastCount = -1;
    this.lastOverlayKey = '';
    this.offerKey = '';
    this.lastSiege = false;
    this.me.chipKey = '';
    this.foe.chipKey = '';
    this.coachKey = '';
    this.hideTip();
    this.tipGap = performance.now() + 15000; // maçın ilk saniyelerinde ipucu yağmasın
    this.el.classList.remove('hidden');
    this.update();
    this.interval = window.setInterval(() => this.update(), 100);
    this.goldShown = -1;
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      this.tickGold((now - last) / 1000);
      last = now;
      this.drawMinimap();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  unbind() {
    this.closePicker();
    clearInterval(this.interval);
    cancelAnimationFrame(this.raf);
    this.room = undefined;
    this.el.classList.add('hidden');
    this.overlay.classList.add('hidden');
    this.offerEl.classList.add('hidden');
    this.offerKey = '';
  }

  onFx(fx: FxEvent) {
    if (fx.t === 'evolve') {
      const name = B.TIERS[fx.tier].name;
      this.showBanner(fx.side === this.side ? `${name} kademesine yükseldin!` : `Rakip ${name} kademesine yükseldi!`, fx.side === this.side ? 'good' : 'warn');
    } else if (fx.t === 'special' && fx.side !== this.side) {
      this.showBanner(`Rakip: ${B.TIERS[fx.tier].special.name}!`, 'warn');
    } else if (fx.t === 'outpost') {
      const mine = fx.side === this.side;
      if (fx.k === 'captured') this.showBanner(mine ? 'Nokta ele geçirildi! (+%25 gelir)' : 'Rakip bir nokta aldı', mine ? 'good' : 'warn');
      else if (fx.k === 'lost' && mine) this.showBanner('Bir noktayı kaybettin', 'warn');
      else if (fx.k === 'destroyed') this.showBanner(mine ? 'Karakolun yıkıldı!' : 'Rakip karakolunu yıktın!', mine ? 'warn' : 'good');
      else if (fx.k === 'built' && mine) sfx.evolve();
    } else if (fx.t === 'src') {
      const info = B.SOURCE_KINDS[fx.kind as B.SourceKind];
      if (!info) return;
      if (fx.k === 'spawn') this.showBanner(`Eter Kaynağı belirdi: ${info.icon} ${info.name}`, 'good');
      else if (fx.side === this.side) this.showBanner(`Kaynak senin! ${info.icon} ${info.name}`, 'good');
      else this.showBanner(`Rakip kaynağı aldı: ${info.icon} ${info.name}`, 'warn');
    } else if (fx.t === 'card' && fx.side !== this.side) {
      const c = B.cardDef(fx.id);
      if (c) this.showBanner(`Rakip kart seçti: ${c.icon} ${c.name}`, 'warn');
    } else if (fx.t === 'cmd') {
      const mine = fx.side === this.side;
      if (fx.k === 'die') this.showBanner(mine ? `Komutanın düştü! ${B.CMD_RESPAWN} sn sonra döner` : 'Rakip komutanı düşürdün!', mine ? 'warn' : 'good');
      else if (fx.k === 'level' && mine) this.showBanner(`Komutan seviye ${fx.lvl}!`, 'good');
    }
  }

  private send(type: string, payload: object = {}) {
    if (!this.room) return;
    sfx.unlock();
    this.room.send(type, payload);
    sfx.click();
  }

  private state(): { st: IBattleState; me?: IPlayer; foe?: IPlayer } | null {
    const st = this.room?.state as IBattleState | undefined;
    if (!st || !st.players) return null;
    let me: IPlayer | undefined;
    let foe: IPlayer | undefined;
    st.players.forEach((p) => {
      if (p.side === this.side) me = p;
      else foe = p;
    });
    return { st, me, foe };
  }

  // ── girdiler ─────────────────────────────────────────────
  private onKey(e: KeyboardEvent) {
    if (!this.room || e.repeat || e.target instanceof HTMLInputElement || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') return this.closePicker();
    if (k === '1') this.send('train', { arch: 'melee' });
    else if (k === '2') this.send('train', { arch: 'ranged' });
    else if (k === '3') this.send('train', { arch: 'heavy' });
    else if (k === 'q') this.send('special');
    else if (k === 'e') this.send('evolve');
    else if (k === 't') this.quickTurret();
    else if (k === 's') this.toggleStance();
    else if (k === 'k') this.quickOutpost();
    else if (k === 'r') this.send('cmd_skill');
    else if (CARD_KEYS.includes(k)) {
      const me = this.state()?.me;
      const id = me && me.picks > 0 ? me.offer?.at(CARD_KEYS.indexOf(k)) : undefined;
      if (id) this.pickCard(id);
    }
  }

  /** Ekrandaki sıra (0 = bana en yakın) → dünyadaki nokta indeksi. */
  private opIndex(s: number): number {
    return this.side === 0 ? s : B.OUTPOST_XS.length - 1 - s;
  }

  private opAction(s: number) {
    this.send('outpost_build', { index: this.opIndex(s) });
  }

  /** K tuşu: en öndeki kurulabilir/yükseltilebilir karakola işlem yap. */
  private quickOutpost() {
    const st = this.state();
    if (!st?.me) return;
    const me = st.me;
    for (let s = B.OUTPOST_XS.length - 1; s >= 0; s--) {
      const i = this.opIndex(s);
      const o = st.st.outposts?.at(i);
      if (!o || o.owner !== this.side) continue;
      // sıradaki adım: kur → kademe yükselt → üstüne kule ekle
      const cost = !o.built
        ? B.TIERS[me.tier].outpost.cost
        : o.tier < me.tier
          ? B.outpostUpgradeCost(o.tier, me.tier)
          : !o.armed
            ? B.TIERS[o.tier].outpost.armCost
            : -1;
      if (cost >= 0 && me.gold >= cost) return this.send('outpost_build', { index: i });
    }
    sfx.deny();
  }

  private toggleStance() {
    const me = this.state()?.me;
    if (!me) return;
    this.send('stance', { stance: me.stance === 'hold' ? 'attack' : 'hold' });
  }

  /** T tuşu: boş yuvaya parasının yettiği en iyi kuleyi kurar, yoksa eski kuleyi yükseltir, yoksa yuva açar. */
  private quickTurret() {
    const s = this.state();
    if (!s?.me) return;
    const me = s.me;
    const best = (budget: number) => {
      for (let g = B.TURRET_GRADE_COUNT - 1; g >= 0; g--) if (budget >= B.turretDef(me.tier, g).cost) return g;
      return -1;
    };
    for (let i = 0; i < me.turrets.length; i++) {
      const t = me.turrets.at(i)!;
      if (t.tier < 0) {
        const g = best(me.gold);
        if (g >= 0) this.send('turret_buy', { slot: i, grade: g });
        else sfx.deny();
        return;
      }
    }
    for (let i = 0; i < me.turrets.length; i++) {
      const t = me.turrets.at(i)!;
      if (t.tier < me.tier) {
        const g = best(me.gold + B.turretDef(t.tier, t.grade).cost * B.TURRET_REFUND);
        if (g >= 0) this.send('turret_upgrade', { slot: i, grade: Math.max(g, 0) });
        else sfx.deny();
        return;
      }
    }
    if (me.turrets.length < B.MAX_SLOTS) this.send('slot_buy');
  }

  private slotAction(i: number) {
    const s = this.state();
    if (!s?.me) return;
    const me = s.me;
    if (i >= me.turrets.length) {
      if (i === me.turrets.length) this.send('slot_buy');
      return;
    }
    // Kule kurma / değiştirme menüsünü aç-kapat
    if (this.pickerSlot === i) this.closePicker();
    else this.openPicker(i);
  }

  // ── kule seçim menüsü ────────────────────────────────────
  private picker!: HTMLElement;
  private pickerTitle!: HTMLElement;
  private pickerOpts: { btn: HTMLButtonElement; img: HTMLImageElement; name: HTMLElement; grade: HTMLElement; desc: HTMLElement; stats: HTMLElement; cost: HTMLElement }[] = [];
  private pickerSlot = -1;

  private buildPicker(host: HTMLElement) {
    this.pickerTitle = h('div', { class: 'ptitle' });
    this.picker = h('div', { class: 'picker hidden' }, this.pickerTitle);
    for (let g = 0; g < B.TURRET_GRADE_COUNT; g++) {
      const img = h('img', { alt: '' });
      const name = h('b', { class: 'pname2' });
      const grade = h('span', { class: `pgrade g${g}` });
      const desc = h('span', { class: 'pdesc' });
      const stats = h('span', { class: 'pstats' });
      const cost = h('span', { class: 'pcost' });
      const btn = h(
        'button',
        { class: 'popt', onclick: () => this.pick(g) },
        img,
        h('div', { class: 'ptext' }, h('div', { class: 'prow' }, name, grade), desc, stats),
        cost,
      );
      this.pickerOpts.push({ btn, img, name, grade, desc, stats, cost });
      this.picker.append(btn);
    }
    host.append(this.picker);
    // dışarı tıklayınca kapan
    document.addEventListener('pointerdown', (e) => {
      if (this.pickerSlot < 0) return;
      const t = e.target as Node;
      if (this.picker.contains(t) || this.slotEls.some((s) => s.main.contains(t))) return;
      this.closePicker();
    });
  }

  private openPicker(slot: number) {
    this.pickerSlot = slot;
    this.picker.classList.remove('hidden');
    this.picker.style.setProperty('--slot', String(slot));
    const s = this.state();
    if (s?.me) this.updatePicker(s.me, s.st.phase === 'playing' && !s.st.paused);
  }

  private closePicker() {
    this.pickerSlot = -1;
    this.picker.classList.add('hidden');
  }

  private pick(grade: number) {
    const s = this.state();
    if (!s?.me || this.pickerSlot < 0) return;
    const t = s.me.turrets.at(this.pickerSlot);
    if (!t) return;
    if (t.tier < 0) this.send('turret_buy', { slot: this.pickerSlot, grade });
    else this.send('turret_upgrade', { slot: this.pickerSlot, grade });
    this.closePicker();
  }

  private updatePicker(me: IPlayer, playing: boolean) {
    const t = me.turrets.at(this.pickerSlot);
    if (!t || !playing) return this.closePicker();
    const refund = t.tier >= 0 ? B.turretDef(t.tier, t.grade).cost * B.TURRET_REFUND : 0;
    setText(this.pickerTitle, t.tier < 0 ? `Kule kur · ${B.TIERS[me.tier].name}` : `Kuleyi değiştir · ${B.TIERS[me.tier].name}`);
    for (let g = 0; g < B.TURRET_GRADE_COUNT; g++) {
      const o = this.pickerOpts[g];
      const def = B.turretDef(me.tier, g);
      const src = this.icons.turrets[me.tier][g];
      if (o.img.getAttribute('src') !== src) o.img.src = src;
      setText(o.name, def.name);
      setText(o.grade, def.label);
      setText(o.desc, def.desc);
      setText(o.stats, `Hasar ${def.dmg} · Menzil ${def.range} · ${(1 / def.cd).toFixed(1)} atış/sn`);
      const same = t.tier === me.tier && t.grade === g;
      const price = Math.max(0, Math.ceil(def.cost - refund));
      setText(o.cost, same ? 'Kurulu' : t.tier >= 0 ? `${price}` : `${def.cost}`);
      o.btn.disabled = same || me.gold < price;
      setClass(o.btn, 'current', same);
    }
  }

  private toggleMute() {
    sfx.toggleMute();
    this.renderMute();
  }

  private renderMute() {
    this.muteBtn.textContent = sfx.isMuted() ? '🔇' : '🔊';
  }

  private confirmLeave() {
    const s = this.state();
    if (s?.st.mode === 'tutorial') return this.skipTutorial();
    const active = s && (s.st.phase === 'playing' || s.st.phase === 'countdown');
    if (active && !window.confirm('Maçtan çıkarsan yenilmiş sayılırsın. Emin misin?')) return;
    this.onLeave();
  }

  // ── güncelleme (10 Hz) ───────────────────────────────────
  private update() {
    const s = this.state();
    if (!s || !s.me) return;
    const { st, me, foe } = s;
    const playing = st.phase === 'playing' && !st.paused;

    this.updatePhase(st, me, foe);
    if (me.tier !== this.lastTier) {
      this.lastTier = me.tier;
      this.refreshTier(me.tier);
    }

    // üst kartlar
    this.fillCard(this.me, me);
    this.renderChips(this.me, me);
    if (foe) {
      this.fillCard(this.foe, foe);
      this.renderChips(this.foe, foe);
    } else {
      // rakip henüz yok (bekleme): önceki maçtan kalanları temizle
      setText(this.foe.name, '—');
      setText(this.foe.tier, '');
      setText(this.foe.hpText, '');
      this.foe.fill.style.width = '0%';
      this.foe.chips.innerHTML = '';
      this.foe.chipKey = '';
    }
    const mods = B.cardMods(me.cards);
    // süre + Yıkım Saati
    const siege = st.time > B.SIEGE_TIME;
    if (siege) {
      setText(this.timerEl, `${fmtTime(st.time)} · ⚠ Yıkım ×${B.siegeMult(st.time).toFixed(1)}`);
      this.timerEl.title = 'Yıkım Saati: kaleler ve karakollar her saniye canlarının bir kısmını kaybeder, yapılara verilen hasar her dakika artar.';
    } else {
      const left = B.SIEGE_TIME - st.time;
      setText(this.timerEl, left < 60 && st.phase === 'playing' ? `${fmtTime(st.time)} · Yıkım ${Math.ceil(left)} sn` : fmtTime(st.time));
      this.timerEl.title = `${fmtTime(B.SIEGE_TIME)} sonra Yıkım Saati başlar: maç uzarsa kaleler çökmeye başlar.`;
    }
    setClass(this.timerEl, 'siege', siege || B.SIEGE_TIME - st.time < 60);
    if (siege && !this.lastSiege && st.phase === 'playing') this.showBanner('⚠ Yıkım Saati başladı: kaleler çöküyor!', 'warn');
    this.lastSiege = siege;
    // gerilim müziği: kalelerden biri düşmek üzereyken ya da Yıkım Saati'nde
    const hpFrac = (p?: IPlayer) => (p && p.baseMaxHp > 0 ? p.baseHp / p.baseMaxHp : 1);
    music.tension(st.phase === 'playing' && (siege || hpFrac(me) < TENSION_HP || hpFrac(foe) < TENSION_HP));
    // Eter Kaynağı
    const src = st.src;
    if (src && st.phase === 'playing' && st.mode !== 'tutorial') {
      if (src.active) {
        const info = B.SOURCE_KINDS[src.kind as B.SourceKind];
        const who = src.cap > 0 ? (src.capSide === this.side ? ` · senin %${Math.round(src.cap * 100)}` : ` · rakip %${Math.round(src.cap * 100)}`) : '';
        setText(this.srcEl, `${info?.icon ?? ''} ${info?.name ?? ''}${who}`);
        this.srcEl.dataset.state = src.cap > 0 ? (src.capSide === this.side ? 'mine' : 'foe') : 'open';
        this.srcEl.title = `${info?.name}: ${info?.desc}. Alanında ${B.SOURCE_TIME} sn sadece senin birimlerin durursa ödül senin.`;
      } else {
        setText(this.srcEl, `Eter Kaynağı ${fmtTime(src.next)}`);
        this.srcEl.dataset.state = 'wait';
      }
    } else setText(this.srcEl, '');
    setClass(this.furyEl, 'hidden', !(me.furyT > 0));
    if (me.furyT > 0) setText(this.furyEl, `🔥 Öfke ${Math.ceil(me.furyT)}`);
    this.renderOffer(me, playing);

    // kaynaklar
    const gold = me.gold;
    let ownedOps = 0;
    for (let i = 0; i < (st.outposts?.length ?? 0); i++) if (st.outposts.at(i)!.owner === this.side) ownedOps++;
    const income = B.TIERS[me.tier].income * (1 + ownedOps * B.OUTPOST_INCOME) * mods.income;
    this.goldTarget = gold;
    if (this.goldShown < 0 || gold < this.goldShown) this.goldShown = gold; // harcama anında düşer
    setText(this.incomeEl, `+${Math.round(income * 10) / 10}/sn`);

    // karakol noktaları
    for (let s = 0; s < this.opEls.length; s++) {
      const el = this.opEls[s];
      const o = st.outposts?.at(this.opIndex(s));
      if (!o) {
        // maç başlamadı: noktalar henüz yok (önceki maçın etiketleri kalmasın)
        setText(el.label, '');
        if (el.btn.dataset.state !== 'neutral') el.btn.dataset.state = 'neutral';
        setClass(el.btn, 'built', false);
        el.btn.disabled = true;
        continue;
      }
      let cls = 'neutral';
      let text = 'Tarafsız';
      let enabled = false;
      if (o.owner < 0) {
        if (o.cap > 0) {
          cls = o.capSide === this.side ? 'capmine' : 'capfoe';
          text = `%${Math.round(o.cap * 100)}`;
        }
      } else if (o.owner === this.side) {
        cls = 'mine';
        if (!o.built) {
          const c = B.TIERS[me.tier].outpost.cost;
          text = `Kur ${fmtNum(c)}`;
          enabled = playing && gold >= c;
        } else if (o.tier < me.tier) {
          const c = B.outpostUpgradeCost(o.tier, me.tier);
          text = `Yükselt ${fmtNum(c)}`;
          enabled = playing && gold >= c;
        } else if (!o.armed) {
          // karakol silahsız kurulur; üstüne kule ayrıca eklenir
          const c = B.TIERS[o.tier].outpost.armCost;
          text = `Kule ekle ${fmtNum(c)}`;
          enabled = playing && gold >= c;
        } else {
          text = `▲ %${Math.round((o.hp / o.maxHp) * 100)}`;
        }
      } else {
        cls = 'foe';
        text = o.built ? `▲ %${Math.round((o.hp / o.maxHp) * 100)}` : 'Düşman';
      }
      setText(el.label, text);
      if (el.btn.dataset.state !== cls) el.btn.dataset.state = cls;
      setClass(el.btn, 'built', o.built);
      el.btn.disabled = !enabled;
    }
    let mine = 0;
    let enemies = 0;
    st.units.forEach((u) => (u.side === this.side ? mine++ : enemies++));
    if (mine !== this.lastCount) {
      this.lastCount = mine;
      setText(this.countEl, `Ordu ${mine}/${B.MAX_UNITS_PER_SIDE}`);
    }

    // birim butonları
    const queueFull = me.queue.length >= B.MAX_QUEUE;
    for (const arch of B.ARCHES) {
      const cost = B.unitCost(me.tier, arch, mods);
      const ub = this.unitBtns[arch];
      setText(ub.cost, String(cost));
      ub.btn.disabled = !playing || gold < cost || queueFull;
    }

    // komutan
    const cmdAlive = !!me.cmdId && st.units.get(me.cmdId);
    const cmdSrc = this.icons.commanders[me.tier];
    if (this.cmdImg.getAttribute('src') !== cmdSrc) this.cmdImg.src = cmdSrc;
    if (cmdAlive) {
      const u = cmdAlive;
      this.cmdFill.style.width = `${Math.max(0, Math.min(1, u.hp / u.maxHp)) * 100}%`;
      setText(this.cmdLabel, `Komutan Sv${me.cmdLvl}`);
    } else {
      this.cmdFill.style.width = '0%';
      setText(this.cmdLabel, st.phase === 'playing' ? `Döner: ${Math.ceil(me.cmdRespawn)}` : 'Komutan');
    }
    const ccd = me.cmdCd;
    const cmax = B.CMD_SKILL_CD * mods.cmdCd;
    this.cmdCdEl.style.background = ccd > 0 ? `conic-gradient(rgba(10,14,28,.78) ${Math.min(1, ccd / cmax) * 360}deg, transparent 0deg)` : 'transparent';
    setText(this.cmdCdEl, ccd > 0 && cmdAlive ? String(Math.ceil(ccd)) : '');
    const cmdReady = playing && !!cmdAlive && ccd <= 0;
    this.cmdBtn.disabled = !cmdReady;
    setClass(this.cmdBtn, 'ready', cmdReady && enemies > 0);
    setClass(this.cmdBtn, 'dead', !cmdAlive);

    // kuyruk
    for (let i = 0; i < B.MAX_QUEUE; i++) {
      const q = this.queueEls[i];
      const entry = me.queue.at(i);
      if (entry) {
        const [t, arch] = entry.split(':');
        const src = this.icons.units[Number(t)][arch as Arch];
        if (q.img.getAttribute('src') !== src) q.img.src = src;
        setClass(q.el, 'filled', true);
        q.prog.style.width = i === 0 ? `${Math.round(me.trainProgress * 100)}%` : '0%';
      } else {
        setClass(q.el, 'filled', false);
        q.prog.style.width = '0%';
      }
    }

    // kuleler
    const cheapest = B.turretDef(me.tier, 0).cost;
    for (let i = 0; i < B.MAX_SLOTS; i++) {
      const se = this.slotEls[i];
      const t = me.turrets.at(i);
      let state = 'hidden';
      if (!t) {
        if (i === me.turrets.length) {
          state = 'locked';
          const cost = B.SLOT_COSTS[i];
          setText(se.label, 'Yuva aç');
          setText(se.cost, `${cost}`);
          se.main.disabled = !playing || gold < cost;
          se.img.removeAttribute('src');
        }
      } else if (t.tier < 0) {
        state = 'empty';
        setText(se.label, 'Kule kur');
        setText(se.cost, `${cheapest}+`);
        se.main.disabled = !playing || gold < cheapest;
        const src = this.icons.turrets[me.tier][1];
        if (se.img.getAttribute('src') !== src) se.img.src = src;
      } else {
        const def = B.turretDef(t.tier, t.grade);
        const outdated = t.tier < me.tier;
        state = outdated ? 'outdated' : 'built';
        const src = this.icons.turrets[t.tier][t.grade];
        if (se.img.getAttribute('src') !== src) se.img.src = src;
        setText(se.label, outdated ? 'Yükselt' : def.name);
        setText(se.cost, outdated ? '↑' : def.label);
        se.main.disabled = !playing;
        se.main.title = `${def.name} (${def.label}): ${def.desc}`;
        setText(se.sell, `Sat +${Math.floor(def.cost * B.TURRET_REFUND)}`);
        se.sell.disabled = !playing;
      }
      if (se.el.dataset.state !== state) se.el.dataset.state = state;
    }
    if (this.pickerSlot >= 0) this.updatePicker(me, playing);

    // duruş
    const hold = me.stance === 'hold';
    setText(this.stanceIcon, hold ? '🛡' : '⚔');
    setText(this.stanceLabel, hold ? 'Savun' : 'Hücum');
    setText(this.stanceHint, hold ? 'Kale önünde toplan' : 'İleri, saldır!');
    setClass(this.stanceBtn, 'hold', hold);
    this.stanceBtn.disabled = !(st.phase === 'playing' || st.phase === 'countdown');
    this.stanceBtn.title = hold
      ? 'Ordu kale önünde, kulelerin menzilinde toplanıyor. Hücuma geçmek için tıkla (S).'
      : 'Ordu ilerleyip saldırıyor. Geri çekilip toplanmak için tıkla (S).';

    // özel güç
    const cd = me.specialCd;
    const frac = cd > 0 ? Math.min(1, cd / (B.SPECIAL_CD * mods.specialCd)) : 0;
    this.specialCd.style.background =
      cd > 0 ? `conic-gradient(rgba(10,14,28,.78) ${frac * 360}deg, transparent 0deg)` : 'transparent';
    setText(this.specialCd, cd > 0 ? String(Math.ceil(cd)) : '');
    this.specialBtn.disabled = !playing || cd > 0 || enemies === 0;
    setClass(this.specialBtn, 'ready', playing && cd <= 0 && enemies > 0);

    // kademe
    if (me.tier >= B.MAX_TIER) {
      setText(this.evolveLabel, 'Son kademe');
      setText(this.evolveXp, `${fmtNum(me.xp)} XP`);
      this.evolveFill.style.width = '100%';
      this.evolveBtn.disabled = true;
      setClass(this.evolveBtn, 'ready', false);
    } else {
      const next = B.TIERS[me.tier + 1];
      const prev = B.TIERS[me.tier].xpToReach;
      const k = Math.min(1, (me.xp - prev) / (next.xpToReach - prev));
      setText(this.evolveLabel, `${next.name} kademesi`);
      setText(this.evolveXp, `${fmtNum(me.xp)} / ${fmtNum(next.xpToReach)} XP`);
      this.evolveFill.style.width = `${Math.max(0, k) * 100}%`;
      const ready = me.xp >= next.xpToReach;
      this.evolveBtn.disabled = !playing || !ready;
      setClass(this.evolveBtn, 'ready', playing && ready);
    }

    this.updateOnboarding(st, me, playing);
  }

  /** Altın sayacı hedefe doğru sayar (kazanınca), harcayınca anında düşer. */
  private tickGold(dt: number) {
    if (this.goldShown < 0) return;
    const d = this.goldTarget - this.goldShown;
    this.goldShown = Math.abs(d) < 0.5 ? this.goldTarget : this.goldShown + d * Math.min(1, dt * 9);
    setText(this.goldEl, fmtNum(Math.round(this.goldShown)));
  }

  /** Öldürülen düşmanın yerinden altın sayacına uçan sikkeler. */
  private flyCoins(x: number, y: number, n: number) {
    if (!this.room || this.el.classList.contains('hidden')) return;
    const target = this.goldEl.getBoundingClientRect();
    const tx = target.left + 8;
    const ty = target.top + target.height / 2;
    for (let i = 0; i < n && this.flying < 14; i++) {
      this.flying++;
      const c = h('div', { class: 'flycoin' });
      const sx = x + (Math.random() * 2 - 1) * 10;
      const sy = y + (Math.random() * 2 - 1) * 8;
      c.style.left = `${sx}px`;
      c.style.top = `${sy}px`;
      document.body.append(c);
      // önce hafifçe havaya fırlar, sonra sayaca süzülür
      const pop = -30 - Math.random() * 25;
      const a = c.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
          { transform: `translate(calc(-50% + ${(Math.random() * 2 - 1) * 18}px), calc(-50% + ${pop}px)) scale(1)`, opacity: 1, offset: 0.25 },
          { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(0.55)`, opacity: 0.9 },
        ],
        { duration: 620 + i * 70, delay: i * 50, easing: 'cubic-bezier(.45,0,.75,1)', fill: 'forwards' },
      );
      a.onfinish = () => {
        c.remove();
        this.flying--;
        this.goldEl.classList.remove('bump');
        void this.goldEl.offsetWidth;
        this.goldEl.classList.add('bump');
      };
    }
  }

  // ── yeni oyuncu rehberi ──────────────────────────────────
  private skipTutorial() {
    setTutorialDone();
    this.onLeave();
  }

  private targetEls(target: TutTarget | undefined): HTMLElement[] {
    switch (target) {
      case 'melee':
      case 'ranged':
      case 'heavy':
        return [this.unitBtns[target].btn];
      case 'units':
        return [this.unitsGroup];
      case 'stance':
        return [this.stanceBtn];
      case 'outpost':
        return [this.opsRow];
      case 'slot':
        return [this.slotsGroup];
      case 'evolve':
        return [this.evolveBtn];
      case 'card':
        return [this.offerEl];
      case 'cmd':
        return [this.cmdBtn];
      case 'special':
        return [this.specialBtn];
      default:
        return [];
    }
  }

  /** Hedef öğeleri parlatır (önceki parlamaları söner). */
  private highlight(els: HTMLElement[]) {
    if (els.length === this.hl.length && els.every((e, i) => e === this.hl[i])) return;
    for (const e of this.hl) e.classList.remove('tut-hl');
    for (const e of els) e.classList.add('tut-hl');
    this.hl = els;
  }

  private hideTip() {
    this.tipId = '';
    this.tipBox.el.classList.add('hidden');
  }

  private updateOnboarding(st: IBattleState, me: IPlayer, playing: boolean) {
    const tut = st.mode === 'tutorial';
    // kademeli açılım: eğitimde öğeler tanıtıldıkları adıma kadar gizli
    const reveal: Record<string, HTMLElement[]> = {
      units: [this.unitsGroup, this.queueGroup],
      stance: [this.stanceBtn],
      outposts: [this.opsRow],
      slots: [this.slotsGroup],
      evolve: [this.evolveBtn],
      cmd: [this.cmdBtn],
      special: [this.specialBtn],
    };
    for (const [key, els] of Object.entries(reveal)) {
      const hide = tut && st.tut < tutIndex(TUT_REVEAL[key]);
      for (const e of els) setClass(e, 'tut-hide', hide);
    }

    // eğitim adımı paneli
    const step = tut && st.phase === 'playing' && st.tut >= 0 ? TUTORIAL[st.tut] : undefined;
    setClass(this.coach.el, 'hidden', !step);
    if (step) {
      const key = String(st.tut);
      if (key !== this.coachKey) {
        this.coachKey = key;
        setText(this.coach.step, `${st.tut + 1}/${TUTORIAL.length}`);
        setText(this.coach.title, step.title);
        setText(this.coach.text, step.text);
        setClass(this.coach.next, 'hidden', !step.button);
        if (step.button) setText(this.coach.next, step.button);
        this.coach.el.classList.remove('pop');
        void this.coach.el.offsetWidth; // animasyonu yeniden başlat
        this.coach.el.classList.add('pop');
        sfx.click();
      }
    }

    // gerçek maçlarda bir kerelik ipuçları
    const now = performance.now();
    if (this.tipId && now > this.tipUntil) this.hideTip();
    if (!tut && playing && !this.tipId && now > this.tipGap) {
      const id = pendingTip(st, me, this.side);
      const tip = id ? tipDef(id) : undefined;
      if (id && tip) {
        markTip(id);
        this.tipId = id;
        this.tipUntil = now + 8000;
        this.tipGap = now + 25000;
        setText(this.tipBox.text, tip.text);
        this.tipBox.el.classList.remove('hidden');
      }
    }
    if (!playing && this.tipId) this.hideTip();

    const target = step ? step.target : this.tipId ? tipDef(this.tipId)?.target : undefined;
    this.highlight(this.targetEls(target));
  }

  private fillCard(card: SideCard, p: IPlayer) {
    setText(card.name, p.name + (p.isBot ? ' 🤖' : '') + (!p.connected && !p.isBot ? ' (bağlantı yok)' : ''));
    setText(card.tier, B.TIERS[p.tier].name);
    card.tier.dataset.tier = String(p.tier);
    const k = p.baseMaxHp > 0 ? Math.max(0, p.baseHp / p.baseMaxHp) : 0;
    card.fill.style.width = `${k * 100}%`;
    setClass(card.fill, 'low', k < 0.3);
    setText(card.hpText, `${Math.ceil(p.baseHp)} / ${Math.round(p.baseMaxHp)}`);
  }

  private refreshTier(tier: number) {
    for (const arch of B.ARCHES) {
      const def = B.unitDef(tier, arch);
      const ub = this.unitBtns[arch];
      ub.img.src = this.icons.units[tier][arch];
      setText(ub.name, def.name);
      setText(ub.cost, String(def.cost));
      const strong = B.ARCH_LABEL[B.STRONG_AGAINST[arch]];
      const weak = B.ARCH_LABEL[B.COUNTERED_BY[arch]];
      ub.tip.innerHTML =
        `<b>${def.name}</b> <i>${B.ARCH_LABEL[arch]}</i><br>` +
        `Can ${def.hp} · Hasar ${def.dmg} · ${arch === 'ranged' ? 'Menzil ' + def.range : 'Yakın'}<br>` +
        `Hız ${def.speed} · Üretim ${def.train} sn<br>` +
        `<span class="ab">✦ ${def.ability.name}:</span> ${def.ability.desc}<br>` +
        `<span class="good">Güçlü: ${strong}</span> · <span class="bad">Zayıf: ${weak}</span>`;
    }
    this.specialImg.src = this.icons.specials[tier];
    setText(this.specialName, B.TIERS[tier].special.name);
    this.specialBtn.title = `${B.TIERS[tier].special.name}: düşmanın ön saflarına ${B.TIERS[tier].special.damage} hasar`;
  }

  // ── ekranlar (bekleme / geri sayım / bitiş) ──────────────
  private updatePhase(st: IBattleState, me: IPlayer, foe?: IPlayer) {
    const phase = st.phase;
    if (phase !== this.lastPhase) {
      if (phase === 'ended' && this.lastPhase) {
        // müzik açıksa zafer/yenilgi motifi çalar, değilse kısa efekt sesi
        const win = st.winner === this.side;
        if (!music.ended(win)) {
          if (win) sfx.win();
          else sfx.lose();
        }
      }
      if (phase === 'waiting') music.menu();
      else if (phase === 'countdown' || (phase === 'playing' && this.lastPhase !== 'countdown')) music.battle(true);
      if (phase === 'playing' && this.lastPhase === 'countdown') {
        sfx.countdown(true);
        this.showBanner('Savaş başladı!', 'good');
      }
      this.lastPhase = phase;
    }

    let key = phase;
    if (phase === 'countdown') key += Math.ceil(st.countdown);
    if (phase === 'playing') key += st.paused ? 'p' : '';
    if (phase === 'ended') key += `${me.wantsRematch}${foe?.wantsRematch}${foe?.left}`;
    if (key === this.lastOverlayKey) return;
    const prevKey = this.lastOverlayKey;
    this.lastOverlayKey = key;

    const o = this.overlay;
    o.innerHTML = '';
    o.classList.remove('hidden', 'count');

    if (phase === 'waiting') {
      if (st.mode === 'private') {
        const link = `${location.origin}${location.pathname}?oda=${st.code}`;
        o.append(
          h(
            'div',
            { class: 'panel' },
            h('h2', { text: 'Rakip bekleniyor' }),
            h('p', { text: 'Arkadaşın bu kodla katılabilir:' }),
            h('div', { class: 'bigcode', text: st.code }),
            h(
              'div',
              { class: 'row' },
              h('button', {
                class: 'btn primary',
                text: 'Davet linkini kopyala',
                onclick: () => {
                  void navigator.clipboard?.writeText(link).then(
                    () => toast('Link kopyalandı', 'good'),
                    () => toast(link),
                  );
                },
              }),
              h('button', { class: 'btn', text: 'Vazgeç', onclick: () => this.onLeave() }),
            ),
            h('p', { class: 'hint', text: 'Aynı Wi-Fi ağındaysanız, arkadaşın bu bilgisayarın yerel IP adresiyle oyunu açmalı.' }),
          ),
        );
      } else {
        o.append(
          h(
            'div',
            { class: 'panel' },
            h('div', { class: 'spinner' }),
            h('h2', { text: 'Rakip aranıyor…' }),
            h('p', { text: 'Başka bir oyuncu Hızlı Eşleşme\'ye girince maç başlar.' }),
            h('button', { class: 'btn', text: 'Vazgeç', onclick: () => this.onLeave() }),
          ),
        );
      }
    } else if (phase === 'countdown') {
      const n = Math.ceil(st.countdown);
      o.classList.add('count');
      o.append(h('div', { class: 'countnum', text: n > 0 ? String(n) : '!' }));
      if (n > 0 && prevKey !== key) sfx.countdown();
    } else if (phase === 'playing') {
      if (st.paused) {
        o.append(h('div', { class: 'panel small' }, h('div', { class: 'spinner' }), h('h3', { text: 'Rakibin bağlantısı koptu' }), h('p', { text: `En fazla ${B.RECONNECT_S} sn bekleniyor…` })));
      } else {
        o.classList.add('hidden');
      }
    } else if (phase === 'ended' && st.mode === 'tutorial') {
      const won = st.winner === this.side;
      if (won) setTutorialDone();
      o.append(
        h(
          'div',
          { class: `panel result ${won ? 'won' : 'lost'}` },
          h('h1', { text: won ? 'EĞİTİM TAMAM!' : 'Eğitim bitti' }),
          h('p', {
            text: won
              ? 'Artık hazırsın! Şimdi kolay bota karşı gerçek bir maç dene. Maç sırasında yeni bir durumla karşılaşınca kısa ipuçları çıkacak.'
              : 'İstersen eğitimi ana menüden tekrar oynayabilirsin.',
          }),
          h(
            'div',
            { class: 'row' },
            h('button', { class: 'btn primary', text: 'Bota Karşı Oyna', onclick: () => this.onPlayBot() }),
            h('button', { class: 'btn', text: 'Ana menü', onclick: () => this.onLeave() }),
          ),
        ),
      );
    } else if (phase === 'ended') {
      const won = st.winner === this.side;
      const reason = st.reason === 'forfeit' ? (won ? 'Rakip oyunu terk etti.' : 'Oyunu terk ettin.') : won ? 'Rakip kaleyi yıktın!' : 'Kalen yıkıldı.';
      const row = (label: string, a: string | number, b: string | number) =>
        h('tr', {}, h('td', { text: String(a) }), h('th', { text: label }), h('td', { text: String(b) }));
      const rematchBtn = h('button', {
        class: 'btn primary',
        text: me.wantsRematch ? 'Rakip bekleniyor…' : 'Rövanş',
        onclick: () => this.send('rematch'),
      });
      rematchBtn.disabled = me.wantsRematch || !foe || foe.left;
      if (foe?.left) rematchBtn.textContent = 'Rakip ayrıldı';
      o.append(
        h(
          'div',
          { class: `panel result ${won ? 'won' : 'lost'}` },
          h('h1', { text: won ? 'ZAFER!' : 'YENİLGİ' }),
          h('p', { text: reason }),
          h(
            'table',
            { class: 'stats' },
            h('tr', {}, h('td', { class: 'me', text: me.name }), h('th', { text: '' }), h('td', { class: 'foe', text: foe?.name ?? '—' })),
            row('Kademe', B.TIERS[me.tier].name, foe ? B.TIERS[foe.tier].name : '—'),
            row('Öldürülen', me.kills, foe?.kills ?? 0),
            row('Komutan', `Sv${me.cmdLvl}`, foe ? `Sv${foe.cmdLvl}` : '—'),
            row('Kartlar', cardIcons(me), foe ? cardIcons(foe) : '—'),
            row('Üretilen', me.trained, foe?.trained ?? 0),
            row('Kazanılan altın', me.goldEarned, foe?.goldEarned ?? 0),
            row('Süre', fmtTime(st.time), ''),
          ),
          foe?.wantsRematch && !me.wantsRematch ? h('p', { class: 'hint good', text: 'Rakip rövanş istiyor!' }) : null,
          h('div', { class: 'row' }, rematchBtn, h('button', { class: 'btn', text: 'Ana menü', onclick: () => this.onLeave() })),
        ),
      );
    }
  }

  private bannerTimer = 0;
  private showBanner(text: string, kind: 'good' | 'warn' = 'good') {
    this.banner.textContent = text;
    this.banner.className = `banner show ${kind}`;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => (this.banner.className = 'banner'), 2200);
  }

  // ── mini harita ──────────────────────────────────────────
  private drawMinimap() {
    const st = this.room?.state as IBattleState | undefined;
    const c = this.minimap;
    const ctx = c.getContext('2d');
    if (!ctx || !st?.units) return;
    const W = c.width;
    const H = c.height;
    const span = WORLD_MAX - WORLD_MIN;
    const X = (sxWorld: number) => ((sxWorld - WORLD_MIN) / span) * W;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, H - 14, W, 3);
    // kaleler
    ctx.fillStyle = '#3d8bff';
    ctx.fillRect(X(-40), H - 34, X(B.BASE_FRONT) - X(-40), 22);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(X(B.WORLD_W - B.BASE_FRONT), H - 34, X(B.WORLD_W + 40) - X(B.WORLD_W - B.BASE_FRONT), 22);
    // karakol noktaları
    for (let i = 0; i < (st.outposts?.length ?? 0); i++) {
      const o = st.outposts.at(i)!;
      const x = X(this.scene.sx(o.x));
      ctx.fillStyle = o.owner < 0 ? '#d8d8d8' : o.owner === this.side ? '#3d8bff' : '#ff4d4d';
      if (o.built) ctx.fillRect(x - 5, H - 30, 10, 14);
      ctx.beginPath();
      ctx.moveTo(x - 1, H - 44);
      ctx.lineTo(x + 9, H - 40);
      ctx.lineTo(x - 1, H - 36);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - 2, H - 44, 2, 28);
    }
    // Eter Kaynağı
    if (st.src?.active) {
      const x = X(this.scene.sx(st.src.x));
      ctx.fillStyle = st.src.kind === 'fury' ? '#ff8a5a' : st.src.kind === 'heal' ? '#8dff9a' : '#ffd34d';
      ctx.beginPath();
      ctx.moveTo(x, H - 50);
      ctx.lineTo(x + 6, H - 40);
      ctx.lineTo(x, H - 30);
      ctx.lineTo(x - 6, H - 40);
      ctx.closePath();
      ctx.fill();
    }
    // birimler (komutan altın çerçeveli)
    st.units.forEach((u) => {
      const ally = u.side === this.side;
      const x = X(this.scene.sx(u.x));
      const r = u.cmd ? 6 : u.arch === 'heavy' ? 5 : 3.5;
      ctx.fillStyle = ally ? '#7fb6ff' : '#ff8a8a';
      ctx.beginPath();
      ctx.arc(x, H - 18, r, 0, Math.PI * 2);
      ctx.fill();
      if (u.cmd) {
        ctx.strokeStyle = '#ffd34d';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    // kamera
    const vr = this.scene.viewRange;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(X(vr.x0) + 1, 3, X(vr.x1) - X(vr.x0) - 2, H - 6);
  }
}
