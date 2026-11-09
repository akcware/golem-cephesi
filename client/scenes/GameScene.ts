// Savaş alanını çizen sahne. Sunucudan gelen state'i okur, akıcı görünsün diye
// konumları yumuşatır (interpolasyon) ve animasyon / efekt oynatır. Oyun mantığı burada YOK.
import Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';
import * as B from '../../shared/balance';
import type { Arch } from '../../shared/balance';
import { STATUS_AURA, STATUS_BURN, STATUS_SLOW, type FxEvent, type IBattleState, type IUnit } from '../../shared/protocol';
import {
  ART_SCALE,
  CASTLE_H,
  CASTLE_W,
  GROUND_Y,
  LAYOUT,
  MOUNTS,
  TEAM,
  TURRET_H,
  TURRET_MUZZLE,
  TURRET_PIVOT,
  VIEW_H,
  buildBackground,
  keys,
  type Team,
} from '../textures';
import { sfx } from '../sfx';

export const WORLD_MIN = -170;
export const WORLD_MAX = B.WORLD_W + 170;
const CASTLE_CX = B.BASE_FRONT + 14 - CASTLE_W / 2;
const CASTLE_BOTTOM = GROUND_Y + 10;

interface UnitView {
  c: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  legB: Phaser.GameObjects.Image;
  legF: Phaser.GameObjects.Image;
  weapon: Phaser.GameObjects.Image;
  hp: Phaser.GameObjects.Graphics;
  aura: Phaser.GameObjects.Ellipse;
  arch: Arch;
  tier: number;
  ally: boolean;
  dir: 1 | -1;
  bodyY: number;
  height: number;
  lastAtk: number;
  lastHp: number;
  walkT: number;
  phase: number;
  swing: number;
  swingDur: number;
  flashing: boolean;
  status: number;
}

interface Proj {
  img: Phaser.GameObjects.Image;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  arc: number;
  rotate: boolean;
  spin: number;
  onHit?: () => void;
}

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

/** Koridordaki bir noktanın görünümü: sancak, ele geçirme çubuğu, (kurulduysa) mini kale + kule. */
interface OutpostView {
  pole: Phaser.GameObjects.Rectangle;
  banner: Phaser.GameObjects.Image;
  bars: Phaser.GameObjects.Graphics;
  fort: Phaser.GameObjects.Image;
  turret: Phaser.GameObjects.Image;
  lastShots: number;
  lastDraw: string;
}

/** Karakol mini kalesinin ölçeği (kale dokusuna göre). */
const FORT_SCALE = 0.4;

export class GameScene extends Phaser.Scene {
  private room?: Room;
  private mySide = 0;
  private views = new Map<string, UnitView>();
  private seen = new Set<string>();
  private projs: Proj[] = [];

  private castles: Phaser.GameObjects.Image[] = [];
  private nameTexts: Phaser.GameObjects.Text[] = [];
  private slotImgs: Phaser.GameObjects.Image[][] = [[], []];
  private turretImgs: Phaser.GameObjects.Image[][] = [[], []];
  private castleTier = [-1, -1];
  private lastBaseHp = [-1, -1];
  private lastBaseFx = [0, 0];
  private lastShots = [
    [-1, -1, -1],
    [-1, -1, -1],
  ];

  private rally!: Phaser.GameObjects.Container;
  private ops: OutpostView[] = [];
  private chunks: Emitter[] = [];
  private glows: Emitter[] = [];
  private spark!: Emitter;
  private smoke!: Emitter;
  private flame!: Emitter;
  private healFx!: Emitter;
  private burnEvents: Phaser.Time.TimerEvent[] = [];
  private clouds: { img: Phaser.GameObjects.Image; speed: number }[] = [];

  private camX = 0;
  private idleT = 0;
  private dragging = false;
  private dragStartX = 0;
  private dragCamX = 0;
  private kb!: Record<'left' | 'right' | 'a' | 'd', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('game');
  }

  create() {
    this.clouds = buildBackground(this);
    this.buildCastles();
    this.buildOutposts();
    this.resetOutposts();
    this.buildRally();
    this.buildEmitters();
    this.setupInput();
    this.scale.on('resize', this.onResize, this);
    this.onResize();
    this.game.events.emit('scene-ready', this);
  }

  // ── dışarıya açık yardımcılar (HUD kullanır) ─────────────
  /** Dünya x'ini ekrana çevirir: her oyuncu kendi kalesini solda görür. */
  sx(x: number): number {
    return this.mySide === 0 ? x : B.WORLD_W - x;
  }

  get viewRange() {
    const wv = this.cameras.main.worldView;
    return { x0: wv.x, x1: wv.right };
  }

  centerOn(x: number) {
    this.camX = x;
  }

  bindRoom(room: Room, side: number) {
    this.clearViews();
    this.room = room;
    this.mySide = side;
    this.castleTier = [-1, -1];
    this.lastBaseHp = [-1, -1];
    this.lastShots = [
      [-1, -1, -1],
      [-1, -1, -1],
    ];
    this.camX = WORLD_MIN;
    this.resetOutposts();
  }

  unbind() {
    this.room = undefined;
    this.clearViews();
    this.rally.setVisible(false);
    this.resetOutposts();
    for (let ci = 0; ci < 2; ci++) {
      this.castles[ci].setTexture(keys.castle(0, ci === 0 ? 'a' : 'e'));
      this.nameTexts[ci].setText('');
      for (let s = 0; s < B.MAX_SLOTS; s++) {
        this.slotImgs[ci][s].setVisible(false);
        this.turretImgs[ci][s].setVisible(false);
      }
    }
  }

  onFx(fx: FxEvent) {
    if (fx.t === 'special') this.specialFx(fx.tier, fx.x0, fx.x1);
    else if (fx.t === 'outpost') {
      const x = this.opX(fx.i);
      const mine = fx.side === this.mySide;
      if (fx.k === 'destroyed') {
        this.explosion(x, GROUND_Y - 20, 2, 70);
        this.chunks[0].explode(16, x, GROUND_Y - 40);
        this.floatText(x, GROUND_Y - 130, mine ? 'Karakol yıkıldı!' : 'Karakol yıkıldı', mine ? '#ff9a9a' : '#ffd34d');
      } else if (fx.k === 'built') {
        this.smoke.explode(6, x, GROUND_Y - 10);
        this.spark.explode(10, x, GROUND_Y - 60);
      } else if (fx.k === 'captured') {
        this.spark.explode(8, x - 20, GROUND_Y - 80);
        this.floatText(x, GROUND_Y - 120, mine ? 'Nokta alındı!' : 'Nokta kaybedildi', mine ? '#9fd0ff' : '#ff9a9a');
      }
    } else if (fx.t === 'heal') {
      // Fidan: ölen Meşe Golem çevresini iyileştirir
      const x = this.sx(fx.x);
      for (let i = 0; i < 14; i++) this.healFx.explode(1, x + (Math.random() * 2 - 1) * fx.r, GROUND_Y - 10 - Math.random() * 30);
      this.floatText(x, GROUND_Y - 70, 'İyileştirme', '#8dff9a');
    } else if (fx.t === 'ufx') {
      const v = this.views.get(fx.id);
      if (!v) return;
      const x = v.c.x;
      const y = v.c.y - v.height * 0.6;
      if (fx.k === 'block') {
        this.spark.explode(4, x + v.dir * 14, y);
        if (Math.random() < 0.5) this.floatText(x, v.c.y - v.height - 16, 'Blok!', '#a8d8ff');
      } else if (fx.k === 'revive') {
        this.glows[4].explode(24, x, y);
        const ring = this.add.image(x, y, 'ring').setTint(0xc9a8ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(970).setScale(0.2);
        this.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        this.floatText(x, v.c.y - v.height - 16, 'Diriliş!', '#d9c2ff');
        if (this.onScreen(x)) sfx.evolve();
      } else if (fx.k === 'charge') {
        this.smoke.explode(4, x, v.c.y - 6);
        this.chunks[v.tier].explode(6, x + v.dir * 30, y);
        if (this.onScreen(x)) {
          sfx.hit(true);
          this.cameras.main.shake(80, 0.002);
        }
      }
    }
  }

  // ── kurulum ──────────────────────────────────────────────
  private buildCastles() {
    for (let ci = 0; ci < 2; ci++) {
      const team: Team = ci === 0 ? 'a' : 'e';
      const cx = ci === 0 ? CASTLE_CX : B.WORLD_W - CASTLE_CX;
      this.castles.push(
        this.add
          .image(cx, CASTLE_BOTTOM, keys.castle(0, team))
          .setOrigin(0.5, 1)
          .setScale((ci === 0 ? 1 : -1) / ART_SCALE, 1 / ART_SCALE)
          .setDepth(5),
      );
      this.nameTexts.push(
        this.add
          .text(cx, CASTLE_BOTTOM - CASTLE_H - 22, '', {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '20px',
            fontStyle: '600',
            color: '#ffffff',
            stroke: '#1a1a24',
            strokeThickness: 5,
          })
          .setOrigin(0.5, 1)
          .setDepth(8),
      );
      for (let s = 0; s < B.MAX_SLOTS; s++) {
        const m = this.mountPos(ci, s);
        this.slotImgs[ci].push(
          this.add
            .image(m.x, m.y - 3, 'slot')
            .setOrigin(0.5, 0)
            .setScale(1 / ART_SCALE)
            .setDepth(6)
            .setVisible(false),
        );
        // Kulenin alt kenarı yuvaya otursun: dönme noktası alt kenardan TURRET_H*(1-pivot.y) yukarıda
        this.turretImgs[ci].push(
          this.add
            .image(m.x, m.y - 1 - TURRET_H * (1 - TURRET_PIVOT.y), keys.turret(0, 1))
            .setOrigin(TURRET_PIVOT.x, TURRET_PIVOT.y)
            .setScale((ci === 0 ? 1 : -1) / ART_SCALE, 1 / ART_SCALE)
            .setDepth(7)
            .setVisible(false),
        );
      }
    }
  }

  private buildOutposts() {
    // beyaz flama dokusu (sahibinin rengine boyanır)
    if (!this.textures.exists('op_banner')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0xffffff);
      g.fillPoints(
        [
          { x: 0, y: 0 },
          { x: 30, y: 4 },
          { x: 22, y: 11 },
          { x: 30, y: 18 },
          { x: 0, y: 20 },
        ],
        true,
      );
      g.lineStyle(2, 0x1a1a24, 0.9);
      g.strokePoints(
        [
          { x: 1, y: 1 },
          { x: 30, y: 4 },
          { x: 22, y: 11 },
          { x: 30, y: 18 },
          { x: 1, y: 19 },
        ],
        true,
      );
      g.generateTexture('op_banner', 32, 22);
      g.destroy();
    }
    for (let i = 0; i < B.OUTPOST_XS.length; i++) {
      const pole = this.add.rectangle(0, GROUND_Y + 6, 4, 92, 0x3b3024).setOrigin(0.5, 1).setDepth(GROUND_Y - 22);
      const banner = this.add.image(0, GROUND_Y - 80, 'op_banner').setOrigin(0, 0).setDepth(GROUND_Y - 22);
      this.tweens.add({ targets: banner, scaleY: { from: 1, to: 0.9 }, duration: 500 + i * 70, yoyo: true, repeat: -1 });
      const bars = this.add.graphics().setDepth(1001);
      const fort = this.add
        .image(0, GROUND_Y + 8, keys.castle(0, 'a'))
        .setOrigin(0.5, 1)
        .setDepth(GROUND_Y - 25)
        .setVisible(false);
      const turret = this.add
        .image(0, GROUND_Y + 8 - CASTLE_H * FORT_SCALE * 0.78, keys.turret(0, 0))
        .setOrigin(TURRET_PIVOT.x, TURRET_PIVOT.y)
        .setDepth(GROUND_Y - 24)
        .setVisible(false);
      this.ops.push({ pole, banner, bars, fort, turret, lastShots: -1, lastDraw: '' });
    }
  }

  /** Noktaların ekrandaki x'i (oyuncu kendi kalesini solda görür). */
  private opX(i: number): number {
    return this.sx(B.OUTPOST_XS[i]);
  }

  private syncOutposts(st: IBattleState) {
    const list = st.outposts;
    for (let i = 0; i < this.ops.length; i++) {
      const v = this.ops[i];
      const o = list?.at(i);
      const x = this.opX(i);
      const owner = o ? o.owner : -1;
      const mine = owner === this.mySide;
      const color = owner < 0 ? 0xe6e6e6 : mine ? TEAM.a : TEAM.e;
      v.pole.x = x - 30;
      v.banner.x = x - 28;
      v.banner.setTint(color);
      // mini kale (kuruluysa)
      const built = !!o?.built;
      const armed = built && !!o?.armed; // karakol silahsız kurulur, kule ayrıca eklenir
      v.fort.setVisible(built);
      v.turret.setVisible(armed);
      if (built && o) {
        const team: Team = mine ? 'a' : 'e';
        const fk = keys.castle(o.tier, team);
        if (v.fort.texture.key !== fk) v.fort.setTexture(fk);
        const tk = keys.turret(o.tier, 0);
        if (v.turret.texture.key !== tk) v.turret.setTexture(tk);
        const f = mine ? 1 : -1;
        v.fort.setPosition(x, GROUND_Y + 8).setScale((f * FORT_SCALE) / ART_SCALE, FORT_SCALE / ART_SCALE);
        v.turret.setPosition(x, v.turret.y).setScale((f * 0.85) / ART_SCALE, 0.85 / ART_SCALE);
        if (armed && v.lastShots >= 0 && o.shots !== v.lastShots && o.tgt) {
          this.turretFire(v.turret, mine, x, o.tier, 0, o.tgt, B.OUTPOST_RANGE);
        }
      }
      v.lastShots = o && built ? o.shots : -1;
      // çubuklar: ele geçirme ilerlemesi ya da karakol canı
      const capKey = o ? `${o.capSide}:${o.cap.toFixed(2)}:${owner}` : '';
      const hpKey = built && o ? `${Math.round((o.hp / o.maxHp) * 50)}` : '';
      const key = `${x}|${capKey}|${hpKey}|${this.mySide}`;
      if (key !== v.lastDraw) {
        v.lastDraw = key;
        const g = v.bars;
        g.clear();
        if (o && !built && o.cap > 0 && (o.cap < 1 || owner < 0)) {
          const w = 46;
          const y = GROUND_Y - 104;
          const c = o.capSide === this.mySide ? TEAM.a : TEAM.e;
          g.fillStyle(0x000000, 0.55);
          g.fillRoundedRect(x - w / 2 - 2, y - 2, w + 4, 9, 4);
          g.fillStyle(c, 1);
          g.fillRoundedRect(x - w / 2, y, w * o.cap, 5, 2);
        }
        if (o && built && o.hp < o.maxHp) {
          const w = 56;
          const y = GROUND_Y + 8 - CASTLE_H * FORT_SCALE - 14;
          g.fillStyle(0x000000, 0.55);
          g.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
          g.fillStyle(mine ? 0x5be37a : 0xff5a5a);
          g.fillRect(x - w / 2, y, w * Math.max(0, o.hp / o.maxHp), 4);
        }
      }
    }
  }

  private resetOutposts() {
    for (const v of this.ops) {
      v.fort.setVisible(false);
      v.turret.setVisible(false);
      v.bars.clear();
      v.lastDraw = '';
      v.lastShots = -1;
      v.banner.setTint(0xe6e6e6);
    }
    // noktalar simetrik: ayna görüntüde de aynı yerler
    this.ops.forEach((v, i) => {
      v.pole.x = B.OUTPOST_XS[i] - 30;
      v.banner.x = B.OUTPOST_XS[i] - 28;
    });
  }

  /** "Savun" duruşunda ordunun toplandığı yeri gösteren sancak (sadece kendi tarafım). */
  private buildRally() {
    const g = this.add.graphics();
    g.fillStyle(0x3b3024);
    g.fillRect(-2, -78, 4, 78);
    g.fillStyle(0x3d8bff);
    g.fillTriangle(2, -76, 34, -66, 2, -54);
    g.lineStyle(2, 0x1a1a24, 0.9);
    g.strokeTriangle(2, -76, 34, -66, 2, -54);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(13, -66, 4);
    const shadow = this.add.ellipse(0, 0, 26, 6, 0x000000, 0.25);
    this.rally = this.add.container(B.BASE_FRONT + B.HOLD_DIST, GROUND_Y - 4, [shadow, g]).setDepth(GROUND_Y - 20).setVisible(false);
    this.tweens.add({ targets: g, scaleY: { from: 1, to: 0.97 }, duration: 600, yoyo: true, repeat: -1 });
  }

  private mountPos(ci: number, slot: number) {
    const m = MOUNTS[slot];
    const cx = ci === 0 ? CASTLE_CX : B.WORLD_W - CASTLE_CX;
    const x = ci === 0 ? cx - CASTLE_W / 2 + m.x : cx + CASTLE_W / 2 - m.x;
    return { x, y: CASTLE_BOTTOM - CASTLE_H + m.y };
  }

  private buildEmitters() {
    for (const tier of B.TIERS) {
      const P = tier.palette;
      this.chunks.push(
        this.add
          .particles(0, 0, 'px', {
            lifespan: { min: 500, max: 900 },
            speed: { min: 60, max: 230 },
            angle: { min: 200, max: 340 },
            gravityY: 700,
            scale: { start: 1.4, end: 0.5 },
            alpha: { start: 1, end: 0 },
            rotate: { min: 0, max: 360 },
            tint: [P.main, P.dark, P.light],
            emitting: false,
          })
          .setDepth(900),
      );
      this.glows.push(
        this.add
          .particles(0, 0, 'dot', {
            lifespan: 900,
            speed: { min: 80, max: 280 },
            scale: { start: 1, end: 0 },
            tint: [P.glow, P.light],
            blendMode: 'ADD',
            emitting: false,
          })
          .setDepth(960),
      );
    }
    this.spark = this.add
      .particles(0, 0, 'dot', {
        lifespan: 260,
        speed: { min: 60, max: 190 },
        scale: { start: 0.7, end: 0 },
        tint: [0xffffff, 0xfff1a8],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(950);
    this.smoke = this.add
      .particles(0, 0, 'soft', {
        lifespan: 700,
        speed: { min: 10, max: 40 },
        angle: { min: 240, max: 300 },
        scale: { start: 0.8, end: 2 },
        alpha: { start: 0.45, end: 0 },
        tint: 0xd8cfc0,
        emitting: false,
      })
      .setDepth(890);
    this.healFx = this.add
      .particles(0, 0, 'dot', {
        lifespan: 700,
        speedY: { min: -60, max: -25 },
        speedX: { min: -10, max: 10 },
        scale: { start: 0.9, end: 0 },
        tint: [0x8dff9a, 0x5be37a, 0xd8ffd0],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(955);
    this.flame = this.add
      .particles(0, 0, 'soft', {
        lifespan: { min: 350, max: 650 },
        speedY: { min: -90, max: -40 },
        speedX: { min: -12, max: 12 },
        scale: { start: 0.55, end: 0.1 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xffd27a, 0xff9a3c, 0xff5a1f],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(880);
  }

  private setupInput() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.dragStartX = p.x;
      this.dragCamX = this.camX;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.dragging && p.isDown) this.camX = this.dragCamX - (p.x - this.dragStartX) / this.cameras.main.zoom;
    });
    const stop = () => (this.dragging = false);
    this.input.on('pointerup', stop);
    this.input.on('pointerupoutside', stop);
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => {
      this.camX += (dy + dx) * 0.9 / this.cameras.main.zoom;
    });
    this.kb = this.input.keyboard!.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D' }, false) as typeof this.kb;
  }

  private onResize() {
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height);
    cam.setZoom(this.scale.height / VIEW_H);
  }

  // ── ana döngü ────────────────────────────────────────────
  update(time: number, delta: number) {
    const dt = Math.min(0.05, delta / 1000);
    this.updateCamera(dt);
    for (const c of this.clouds) {
      c.img.x += c.speed * dt;
      if (c.img.x > B.WORLD_W + 900) c.img.x = -900;
    }
    this.updateProjectiles(dt);

    const st = this.room?.state as IBattleState | undefined;
    if (!st || !st.players || !st.units) return;
    this.syncPlayers(st);
    this.syncOutposts(st);
    this.syncUnits(st, dt, time);
  }

  private updateCamera(dt: number) {
    const cam = this.cameras.main;
    const halfW = cam.width / cam.zoom / 2;
    if (this.room) {
      const typing = document.activeElement instanceof HTMLInputElement;
      if (!typing && (this.kb.left.isDown || this.kb.a.isDown)) this.camX -= 900 * dt;
      if (!typing && (this.kb.right.isDown || this.kb.d.isDown)) this.camX += 900 * dt;
    } else {
      this.idleT += dt;
      this.camX = B.WORLD_W / 2 + Math.sin(this.idleT * 0.1) * (B.WORLD_W / 2);
    }
    const min = WORLD_MIN + halfW;
    const max = WORLD_MAX - halfW;
    this.camX = min > max ? B.WORLD_W / 2 : Phaser.Math.Clamp(this.camX, min, max);
    cam.centerOn(this.camX, VIEW_H / 2);
  }

  private onScreen(x: number): boolean {
    const wv = this.cameras.main.worldView;
    return x > wv.x - 60 && x < wv.right + 60;
  }

  private syncPlayers(st: IBattleState) {
    st.players.forEach((p) => {
      const ci = p.side === this.mySide ? 0 : 1;
      const team: Team = ci === 0 ? 'a' : 'e';
      if (this.castleTier[ci] !== p.tier) {
        const prev = this.castleTier[ci];
        this.castles[ci].setTexture(keys.castle(p.tier, team));
        if (prev >= 0 && p.tier > prev) this.evolveFx(ci, p.tier);
        this.castleTier[ci] = p.tier;
      }
      if (this.lastBaseHp[ci] >= 0 && p.baseHp < this.lastBaseHp[ci] - 0.01) this.baseHitFx(ci, p.tier);
      this.lastBaseHp[ci] = p.baseHp;
      if (this.nameTexts[ci].text !== p.name) this.nameTexts[ci].setText(p.name);
      if (ci === 0) this.rally.setVisible(p.stance === 'hold' && st.phase !== 'ended');

      for (let s = 0; s < B.MAX_SLOTS; s++) {
        const t = p.turrets.at(s);
        this.slotImgs[ci][s].setVisible(!!t);
        const img = this.turretImgs[ci][s];
        if (t && t.tier >= 0) {
          const key = keys.turret(t.tier, t.grade);
          if (img.texture.key !== key) {
            img.setTexture(key);
            img.setRotation(0);
          }
          img.setVisible(true);
        } else {
          img.setVisible(false);
        }
        const shots = t && t.tier >= 0 ? t.shots : -1;
        if (shots >= 0 && this.lastShots[ci][s] >= 0 && shots !== this.lastShots[ci][s]) {
          this.turretFire(
            this.turretImgs[ci][s],
            ci === 0,
            ci === 0 ? B.BASE_FRONT : B.WORLD_W - B.BASE_FRONT,
            t!.tier,
            t!.grade,
            t!.tgt,
          );
        }
        this.lastShots[ci][s] = shots;
      }
    });
  }

  private syncUnits(st: IBattleState, dt: number, time: number) {
    this.seen.clear();
    st.units.forEach((u, id) => {
      this.seen.add(id);
      let v = this.views.get(id);
      if (!v) {
        v = this.createView(u);
        this.views.set(id, v);
      }
      this.syncView(v, u, dt, time);
    });
    for (const [id, v] of this.views) {
      if (!this.seen.has(id)) {
        this.views.delete(id);
        this.killView(v, st.phase === 'playing');
      }
    }
  }

  // ── birim görünümleri ────────────────────────────────────
  private createView(u: IUnit): UnitView {
    const arch = u.arch as Arch;
    const L = LAYOUT[arch];
    const ally = u.side === this.mySide;
    const team: Team = ally ? 'a' : 'e';
    const dir: 1 | -1 = ally ? 1 : -1;
    const idn = Number(u.id) || 0;
    const y = GROUND_Y + (((idn * 37) % 5) - 2) * 2.5;

    const c = this.add.container(this.sx(u.x), y);
    // Komutan Aurası etkisindeyken ayak altında altın parıltı
    const aura = this.add
      .ellipse(0, 1, L.bodyW * 1.5, 14, 0xffd76a, 0.45)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    const shadow = this.add.ellipse(0, 1, L.bodyW * 0.9, 8, 0x000000, 0.22);
    const s = 1 / ART_SCALE;
    const legB = this.add.image(-L.legGap / 2, L.hipY, keys.leg(u.tier, arch)).setOrigin(0.5, 0).setScale(s).setTint(0xbbbbbb);
    const legF = this.add.image(L.legGap / 2, L.hipY, keys.leg(u.tier, arch)).setOrigin(0.5, 0).setScale(s);
    const bodyY = L.hipY + 3;
    const body = this.add.image(0, bodyY, keys.body(u.tier, arch, team)).setOrigin(0.5, 1).setScale(s);
    const W = L.weapon;
    const weapon = this.add
      .image(W.x, W.y, keys.weapon(u.tier, arch))
      .setOrigin(W.ox, W.oy)
      .setRotation(W.rot)
      .setScale(s);
    const hp = this.add.graphics();
    c.add([aura, shadow, legB, legF, body, weapon, hp]);
    c.setScale(dir, 1);
    c.setDepth(y + (arch === 'heavy' ? 0 : 0.5));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 250 });
    if (ally) sfx.spawn();

    const v: UnitView = {
      c,
      body,
      legB,
      legF,
      weapon,
      hp,
      aura,
      arch,
      tier: u.tier,
      ally,
      dir,
      bodyY,
      height: L.bodyH - bodyY,
      lastAtk: u.atk,
      lastHp: u.hp,
      walkT: Math.random() * 6,
      phase: Math.random() * 6,
      swing: 0,
      swingDur: 0.3,
      flashing: false,
      status: 0,
    };
    this.drawHp(v, u);
    return v;
  }

  private syncView(v: UnitView, u: IUnit, dt: number, time: number) {
    const tx = this.sx(u.x);
    const diff = tx - v.c.x;
    v.c.x = Math.abs(diff) > 120 ? tx : v.c.x + diff * Math.min(1, dt * 12);

    // geri çekilirken arkasını dönüp yürür
    const face = u.state === 3 ? -v.dir : v.dir;
    if (v.c.scaleX !== face) v.c.scaleX = face;
    const moving = u.state === 0 || u.state === 3;
    if (moving) v.walkT += dt * (v.arch === 'heavy' ? 7 : 11);
    const s = Math.sin(v.walkT);
    const amp = moving ? 0.55 : 0;
    v.legB.rotation = s * amp;
    v.legF.rotation = -s * amp;
    const bob = moving ? -Math.abs(Math.cos(v.walkT)) * 2 : Math.sin(time * 0.004 + v.phase) * 0.7;
    v.body.y = v.bodyY + bob;

    const W = LAYOUT[v.arch].weapon;
    v.weapon.x = W.x;
    v.weapon.y = W.y + bob;
    if (u.atk !== v.lastAtk) {
      v.lastAtk = u.atk;
      this.onAttack(v, u);
    }
    if (v.swing > 0) {
      v.swing = Math.max(0, v.swing - dt / v.swingDur);
      const p = 1 - v.swing;
      v.weapon.rotation = this.swingPose(v.arch, W.rot, p);
      if (v.arch === 'ranged') v.weapon.x = W.x - Math.sin(p * Math.PI) * 4;
    } else {
      v.weapon.rotation = W.rot + (moving ? s * 0.12 : Math.sin(time * 0.003 + v.phase) * 0.05);
    }

    if (u.hp !== v.lastHp) {
      // yanma hasarı her karede azar azar düşer; her seferinde beyaz parlamasın
      if (u.hp < v.lastHp - 0.02 * u.maxHp || (u.hp < v.lastHp && !(u.status & STATUS_BURN))) this.flashView(v);
      // can artıyorsa (Kök Salma / Fidan) ara ara yeşil parıltı
      else if (u.hp > v.lastHp && Math.random() < 0.15) this.healFx.explode(1, v.c.x + (Math.random() - 0.5) * 16, v.c.y - v.height * 0.5);
      v.lastHp = u.hp;
      this.drawHp(v, u);
    }

    const status = u.status ?? 0;
    if (status !== v.status) {
      v.status = status;
      if (!v.flashing) this.applyTint(v);
      v.aura.setVisible((status & STATUS_AURA) !== 0);
    }
    if (status & STATUS_AURA) v.aura.setAlpha(0.3 + Math.sin(time * 0.006 + v.phase) * 0.15);
    if (status & STATUS_BURN && Math.random() < dt * 8) this.flame.explode(1, v.c.x, v.c.y - v.height * 0.4);
  }

  private swingPose(arch: Arch, rest: number, p: number): number {
    if (arch === 'melee') {
      if (p < 0.35) return rest - 1.1 * (p / 0.35);
      if (p < 0.6) return rest - 1.1 + 2.6 * ((p - 0.35) / 0.25);
      return rest + 1.5 - 1.5 * ((p - 0.6) / 0.4);
    }
    if (arch === 'heavy') {
      if (p < 0.45) return rest + (-2.9 - rest) * Phaser.Math.Easing.Quadratic.Out(p / 0.45);
      if (p < 0.6) return -2.9 + 2.2 * ((p - 0.45) / 0.15);
      return -0.7 + (rest + 0.7) * ((p - 0.6) / 0.4);
    }
    return rest - Math.sin(p * Math.PI) * 0.25;
  }

  private targetPoint(v: UnitView, u: IUnit) {
    if (u.tgt.startsWith('op')) {
      // karakola saldırı
      const x = this.opX(Number(u.tgt.slice(2)));
      return { x: x - v.dir * 14 + (Math.random() - 0.5) * 10, y: GROUND_Y - 14 - Math.random() * (v.arch === 'ranged' ? 70 : 25) };
    }
    if (u.tgt === 'base') {
      const enemyCastleRight = v.ally;
      const fx = enemyCastleRight ? B.WORLD_W - B.BASE_FRONT + 8 + Math.random() * 20 : B.BASE_FRONT - 8 - Math.random() * 20;
      const high = v.arch === 'ranged' ? 100 : 30;
      return { x: fx, y: GROUND_Y - 18 - Math.random() * high };
    }
    const tv = this.views.get(u.tgt);
    if (tv) return { x: tv.c.x - tv.dir * 4, y: tv.c.y - tv.height * 0.45 };
    return { x: v.c.x + v.dir * 30, y: v.c.y - 20 };
  }

  private onAttack(v: UnitView, u: IUnit) {
    v.swing = 1;
    v.swingDur = v.arch === 'heavy' ? 0.55 : v.arch === 'melee' ? 0.32 : 0.25;
    const target = this.targetPoint(v, u);
    if (v.arch === 'ranged') {
      const tipX = v.c.x + v.dir * 26;
      const tipY = v.c.y - 26;
      const ab = B.unitDef(v.tier, 'ranged').ability.p;
      const glow = B.TIERS[v.tier].palette.glow;
      if (ab.pierce && u.tgt !== 'base') {
        // Prizma Büyücü: hattı delen ışın
        this.beamFx(tipX, tipY, target.x + v.dir * 90, target.y, glow, 3);
        this.glows[v.tier].explode(4, target.x, target.y);
      } else {
        this.fireProjectile(v.tier, tipX, tipY, target.x, target.y, {
          onHit: () => {
            if (ab.splash && u.tgt !== 'base') {
              // Demir Topçu: küçük patlama
              this.chunks[v.tier].explode(4, target.x, target.y);
              this.smoke.explode(2, target.x, target.y);
              this.glows[v.tier].explode(5, target.x, target.y);
              if (this.onScreen(target.x)) sfx.hit(true);
            } else if (ab.chain && u.tgt !== 'base') {
              // Eter Gözü: yakındaki bir düşmana sıçrayan şimşek
              this.hitFx(target.x, target.y, false);
              const tv = this.views.get(u.tgt);
              let next: UnitView | undefined;
              let best: number = B.UNIT_CHAIN_RANGE;
              for (const o of this.views.values()) {
                if (o === tv || o.ally === v.ally) continue;
                const d = Math.abs(o.c.x - target.x);
                if (d <= best) {
                  best = d;
                  next = o;
                }
              }
              if (next) this.lightningFx([target, { x: next.c.x, y: next.c.y - next.height * 0.5 }], glow);
            } else {
              this.hitFx(target.x, target.y, false);
            }
          },
        });
      }
      if (this.onScreen(v.c.x)) sfx.shoot(v.tier);
    } else {
      const heavy = v.arch === 'heavy';
      this.time.delayedCall(v.swingDur * (heavy ? 0.55 : 0.45) * 1000, () => this.hitFx(target.x, target.y, heavy));
    }
  }

  private hitFx(x: number, y: number, heavy: boolean) {
    this.spark.explode(heavy ? 10 : 5, x, y);
    if (this.onScreen(x)) sfx.hit(heavy);
  }

  private flashView(v: UnitView) {
    if (v.flashing) return;
    v.flashing = true;
    for (const img of [v.body, v.weapon, v.legB, v.legF]) img.setTintFill(0xffffff);
    this.time.delayedCall(70, () => {
      v.flashing = false;
      if (!v.c.active) return;
      this.applyTint(v);
    });
  }

  /** Durum rengi: buzla yavaşlayan birim mavimsi, yanan birim turuncumsu görünür. */
  private applyTint(v: UnitView) {
    const tint = v.status & STATUS_SLOW ? 0x9fd8ff : v.status & STATUS_BURN ? 0xffa36b : -1;
    for (const img of [v.body, v.weapon, v.legF]) {
      if (tint < 0) img.clearTint();
      else img.setTint(tint);
    }
    v.legB.setTint(tint < 0 ? 0xbbbbbb : Phaser.Display.Color.ValueToColor(tint).darken(25).color);
  }

  private drawHp(v: UnitView, u: IUnit) {
    const g = v.hp;
    g.clear();
    if (u.hp >= u.maxHp - 0.01) return;
    const w = v.arch === 'heavy' ? 42 : 26;
    const y = -v.height - 9;
    const f = Phaser.Math.Clamp(u.hp / u.maxHp, 0, 1);
    g.fillStyle(0x000000, 0.55);
    g.fillRect(-w / 2 - 1, y - 1, w + 2, 5);
    g.fillStyle(v.ally ? 0x5be37a : 0xff5a5a);
    g.fillRect(-w / 2, y, w * f, 3);
  }

  private killView(v: UnitView, animate: boolean) {
    if (!animate) {
      v.c.destroy();
      return;
    }
    const x = v.c.x;
    const y = v.c.y - v.height * 0.4;
    this.chunks[v.tier].explode(v.arch === 'heavy' ? 18 : 10, x, y);
    this.smoke.explode(3, x, v.c.y - 10);
    const visible = this.onScreen(x);
    if (visible) sfx.death();
    if (!v.ally) {
      this.floatText(x, v.c.y - v.height - 14, `+${B.unitDef(v.tier, v.arch).bounty}`, '#ffd34d');
      if (visible) sfx.coin();
    }
    v.hp.clear();
    this.tweens.add({
      targets: v.c,
      alpha: 0,
      angle: -70,
      y: v.c.y + 6,
      duration: 320,
      onComplete: () => v.c.destroy(),
    });
  }

  private clearViews() {
    for (const v of this.views.values()) v.c.destroy();
    this.views.clear();
    for (const p of this.projs) p.img.destroy();
    this.projs = [];
    for (const e of this.burnEvents) e.remove(false);
    this.burnEvents = [];
  }

  // ── mermiler ve efektler ─────────────────────────────────
  private fireProjectile(
    tier: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    opts: {
      key?: string;
      speed?: number;
      dur?: number;
      scale?: number;
      arc?: number;
      add?: boolean;
      spin?: boolean;
      onHit?: () => void;
    } = {},
  ) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const speed = opts.speed ?? (tier === 2 ? 650 : 800);
    const arc = opts.arc ?? (tier === 0 || tier === 2 ? Math.min(80, dist * 0.18) : tier === 1 ? dist * 0.06 : 0);
    const img = this.add
      .image(x0, y0, opts.key ?? keys.proj(tier))
      .setDepth(800)
      .setScale((opts.scale ?? 1) / ART_SCALE);
    if (opts.add ?? tier >= 3) img.setBlendMode(Phaser.BlendModes.ADD);
    this.projs.push({
      img,
      x0,
      y0,
      x1,
      y1,
      t: 0,
      dur: opts.dur ?? Math.max(0.1, dist / speed),
      arc,
      rotate: !opts.spin && (opts.key !== undefined || (tier !== 2 && tier !== 4)),
      spin: opts.spin ? (x1 >= x0 ? 9 : -9) : 0,
      onHit: opts.onHit,
    });
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      const x = p.x0 + (p.x1 - p.x0) * k;
      const y = p.y0 + (p.y1 - p.y0) * k - Math.sin(k * Math.PI) * p.arc;
      p.img.setPosition(x, y);
      if (p.spin) p.img.rotation += p.spin * dt;
      else if (p.rotate) p.img.rotation = Math.atan2(p.y1 - p.y0 - Math.cos(k * Math.PI) * Math.PI * p.arc, p.x1 - p.x0);
      if (k >= 1) {
        p.img.destroy();
        this.projs.splice(i, 1);
        p.onHit?.();
      }
    }
  }

  /** Kule atışı: saldırı türüne göre mermi, bomba, lazer ya da şimşek çizer (hasar sunucuda). */
  /**
   * img: ateş eden kule resmi; mine: kule benim mi (benimkiler sağa, düşmana doğru bakar);
   * originX: menzilin ölçüldüğü nokta (kale önü ya da karakol). range: varsa kulenin menzili yerine.
   */
  private turretFire(
    img: Phaser.GameObjects.Image,
    mine: boolean,
    originX: number,
    tier: number,
    grade: number,
    tgt: string,
    range?: number,
  ) {
    const def = { ...B.turretDef(tier, grade), ...(range ? { range } : {}) };
    const tv = this.views.get(tgt);
    if (!tv) return;
    const tx = tv.c.x;
    const ty = tv.c.y - tv.height * 0.5;
    const ang = Math.atan2(ty - img.y, tx - img.x);
    img.rotation = mine ? ang : Math.atan2(-(ty - img.y), -(tx - img.x));
    const reach = (TURRET_MUZZLE[grade] ?? 38) * Math.abs(img.scaleX) * ART_SCALE;
    const mx = img.x + Math.cos(ang) * reach;
    const my = img.y + Math.sin(ang) * reach;
    const out: 1 | -1 = mine ? 1 : -1; // kuleden dışarı (düşmana doğru) yön
    const ci = mine ? 0 : 1;
    // Kuleye özel mermi dokusu (lazer/şimşekte namlu parlaması olarak kullanılır)
    const pkey = keys.tproj(tier, grade);
    const glow = B.TIERS[tier].palette.glow;
    const scale = 0.9 + grade * 0.25;
    // geri tepme
    this.tweens.add({ targets: img, x: img.x - Math.cos(ang) * 3 * (1 + grade), duration: 60, yoyo: true });
    const visible = this.onScreen(img.x) || this.onScreen(tx);
    if (visible) sfx.shoot(tier);

    switch (def.kind) {
      case 'shot':
        this.fireProjectile(tier, mx, my, tx, ty, { key: pkey, speed: 1150, scale, arc: 0, onHit: () => this.hitFx(tx, ty, false) });
        break;
      case 'frost':
        this.fireProjectile(tier, mx, my, tx, ty, {
          key: pkey,
          speed: 950,
          scale,
          arc: 0,
          add: true,
          onHit: () => {
            this.glows[3].explode(10, tx, ty);
            if (this.onScreen(tx)) sfx.hit(false);
          },
        });
        break;
      case 'pierce': {
        // hattaki düşmanları delip geçen ok
        const line = this.enemyLine(originX, mine, def.range).slice(0, def.pierce);
        const last = line[line.length - 1] ?? tv;
        const ex = last.c.x + out * 80;
        const ey = last.c.y - last.height * 0.5;
        const speed = 1300;
        this.fireProjectile(tier, mx, my, ex, ey, { key: pkey, speed, scale: scale * 1.2, arc: 0 });
        for (const v of line) {
          const d = Math.abs(v.c.x - mx) / speed;
          this.time.delayedCall(d * 1000, () => this.hitFx(v.c.x, v.c.y - v.height * 0.5, true));
        }
        break;
      }
      case 'beam': {
        const line = this.enemyLine(originX, mine, def.range).slice(0, def.pierce);
        const last = line[line.length - 1] ?? tv;
        const ex = last.c.x + out * 30;
        const ey = last.c.y - last.height * 0.5;
        this.beamFx(mx, my, ex, ey, glow, 4 + grade * 4);
        for (const v of line) this.glows[tier].explode(5, v.c.x, v.c.y - v.height * 0.5);
        this.flashAt(pkey, mx, my, 0.8 + grade * 0.2);
        break;
      }
      case 'chain': {
        // şimşek: hedeften en yakın düşmanlara sıçrar (görsel olarak sunucudakine yakın)
        const pts = [{ x: mx, y: my }, { x: tx, y: ty }];
        const struck = new Set<UnitView>([tv]);
        let cur = tv;
        for (let j = 0; j < def.chain; j++) {
          let next: UnitView | undefined;
          let best: number = B.CHAIN_RANGE;
          for (const v of this.views.values()) {
            if (struck.has(v) || v.ally === (ci === 0)) continue;
            const d = Math.abs(v.c.x - cur.c.x);
            if (d <= best) {
              best = d;
              next = v;
            }
          }
          if (!next) break;
          struck.add(next);
          pts.push({ x: next.c.x, y: next.c.y - next.height * 0.5 });
          cur = next;
        }
        this.lightningFx(pts, glow);
        for (let j = 1; j < pts.length; j++) this.glows[tier].explode(6, pts[j].x, pts[j].y);
        break;
      }
      case 'lob':
      case 'fire': {
        const gx = tx;
        const gy = tv.c.y - 4;
        const dist = Math.abs(gx - mx);
        this.fireProjectile(tier, mx, my, gx, gy, {
          key: pkey,
          scale: scale * 1.1,
          dur: B.LOB_TIME,
          arc: 90 + dist * 0.3,
          spin: true,
          onHit: () => {
            this.explosion(gx, gy, tier, def.splash);
            if (def.kind === 'fire') this.burnFx(gx, gy, def.splash, def.burnDur);
            if (def.slow) this.glows[3].explode(14, gx, gy - 10);
          },
        });
        break;
      }
    }
  }

  /** originX'ten dışarı doğru sıralı, menzil içindeki düşman birim görünümleri. */
  private enemyLine(originX: number, mine: boolean, range: number): UnitView[] {
    const out = mine ? 1 : -1;
    const list: { v: UnitView; d: number }[] = [];
    for (const v of this.views.values()) {
      if (v.ally === mine) continue;
      const d = (v.c.x - originX) * out;
      if (d >= -30 && d <= range + 30) list.push({ v, d });
    }
    return list.sort((a, b) => a.d - b.d).map((e) => e.v);
  }

  private beamFx(x0: number, y0: number, x1: number, y1: number, color: number, width: number) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const mk = (w: number, tint: number, alpha: number) =>
      this.add
        .image(x0, y0, 'px')
        .setOrigin(0, 0.5)
        .setRotation(ang)
        .setDisplaySize(len, w)
        .setTint(tint)
        .setAlpha(alpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(850);
    const outer = mk(width * 2.2, color, 0.55);
    const core = mk(Math.max(2, width * 0.6), 0xffffff, 1);
    this.tweens.add({
      targets: [outer, core],
      alpha: 0,
      scaleY: 0.2,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => {
        outer.destroy();
        core.destroy();
      },
    });
  }

  private lightningFx(pts: { x: number; y: number }[], color: number) {
    const g = this.add.graphics().setDepth(850).setBlendMode(Phaser.BlendModes.ADD);
    // Kırılma noktalarını bir kez üret; dış parıltı ve beyaz çekirdek aynı yolu izlesin
    const path: { x: number; y: number }[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const steps = Math.max(4, Math.round(Math.hypot(p1.x - p0.x, p1.y - p0.y) / 22));
      for (let s = 1; s < steps; s++) {
        const k = s / steps;
        path.push({ x: p0.x + (p1.x - p0.x) * k + (Math.random() - 0.5) * 10, y: p0.y + (p1.y - p0.y) * k + (Math.random() - 0.5) * 26 });
      }
      path.push(p1);
    }
    const zig = (w: number, c: number, a: number) => {
      g.lineStyle(w, c, a);
      g.strokePoints(path, false, false);
    };
    zig(7, color, 0.45);
    zig(2.5, 0xffffff, 1);
    this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
  }

  /** Namlu ucunda kısa parlama. */
  private flashAt(key: string, x: number, y: number, scale: number) {
    const f = this.add
      .image(x, y, key)
      .setScale(scale / ART_SCALE)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(860);
    this.tweens.add({ targets: f, alpha: 0, scale: (scale * 1.6) / ART_SCALE, duration: 160, onComplete: () => f.destroy() });
  }

  /** Ateş kulesinin bıraktığı yanan zemin (süre boyunca alev parçacıkları). */
  private burnFx(x: number, y: number, r: number, dur: number) {
    const ev = this.time.addEvent({
      delay: 90,
      repeat: Math.round((dur * 1000) / 90),
      callback: () => this.flame.explode(2, x + (Math.random() * 2 - 1) * r, y - Math.random() * 6),
    });
    this.burnEvents.push(ev);
  }

  private baseHitFx(ci: number, tier: number) {
    const now = this.time.now;
    if (now - this.lastBaseFx[ci] < 140) return;
    this.lastBaseFx[ci] = now;
    const castle = this.castles[ci];
    castle.setTint(0xff9a9a);
    this.time.delayedCall(90, () => castle.clearTint());
    const fx = ci === 0 ? B.BASE_FRONT - 6 : B.WORLD_W - B.BASE_FRONT + 6;
    this.chunks[tier].explode(3, fx, GROUND_Y - 30 - Math.random() * 90);
    if (this.onScreen(fx)) sfx.base();
  }

  private evolveFx(ci: number, tier: number) {
    const c = this.castles[ci];
    const y = CASTLE_BOTTOM - CASTLE_H / 2;
    const ring = this.add
      .image(c.x, y, 'ring')
      .setDepth(970)
      .setTint(B.TIERS[tier].palette.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.5);
    this.tweens.add({ targets: ring, scale: 7, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    this.glows[tier].explode(50, c.x, y);
    sfx.evolve();
  }

  private specialFx(tier: number, wx0: number, wx1: number) {
    const a = this.sx(wx0);
    const b = this.sx(wx1);
    const x0 = Math.min(a, b);
    const x1 = Math.max(a, b);
    sfx.special();
    const fallMs = 400;
    for (let i = 0; i < 16; i++) {
      const delay = Math.random() * (B.SPECIAL_DELAY * 1000 - fallMs);
      const tx = x0 + Math.random() * (x1 - x0);
      const ty = GROUND_Y - 4 - Math.random() * 10;
      this.time.delayedCall(delay, () => {
        const img = this.add
          .image(tx - 90, -60, keys.spec(tier))
          .setDepth(820)
          .setScale(1.4 / ART_SCALE);
        img.rotation = Math.atan2(ty + 60, 90) - Math.PI / 2;
        if (tier >= 3) img.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: img,
          x: tx,
          y: ty,
          duration: fallMs,
          ease: 'Quad.easeIn',
          onComplete: () => {
            img.destroy();
            this.explosion(tx, ty, tier);
          },
        });
      });
    }
  }

  private explosion(x: number, y: number, tier: number, radius = 0) {
    const big = radius > 0 ? radius / 40 : 1;
    this.glows[tier].explode(Math.round(8 * big), x, y - 6);
    this.chunks[tier].explode(Math.round(5 * big), x, y);
    this.smoke.explode(Math.max(2, Math.round(2 * big)), x, y - 8);
    if (radius > 0) {
      // patlama dalgası: alan hasarının yarıçapını gösterir
      const ring = this.add
        .image(x, y - 6, 'ring')
        .setDepth(855)
        .setTint(B.TIERS[tier].palette.glow)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.2, 0.08);
      this.tweens.add({
        targets: ring,
        scaleX: radius / 28,
        scaleY: radius / 70,
        alpha: 0,
        duration: 320,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
    if (this.onScreen(x)) {
      sfx.boom();
      this.cameras.main.shake(90, 0.0015 * Math.min(2, big));
    }
  }

  /** "+altın" yazıları: her öldürmede yeni nesne yaratmak yerine havuzdan tekrar kullanılır. */
  private floatPool: Phaser.GameObjects.Text[] = [];
  private floatText(x: number, y: number, str: string, color: string) {
    const t =
      this.floatPool.pop() ??
      this.add
        .text(0, 0, '', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '18px',
          fontStyle: '700',
          color,
          stroke: '#2a1a00',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(1000);
    if (t.text !== str) t.setText(str);
    t.setColor(color).setPosition(x, y).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        t.setVisible(false);
        this.floatPool.push(t);
      },
    });
  }
}
