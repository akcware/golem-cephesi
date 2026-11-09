// Sanat galerisi (art.html): tüm prosedürel dokuları oyundaki gibi birleştirip gösterir.
// Bölümler: ?s=units | unit&t=N | castles | castle&t=N | turrets | fx | bg | icons
import Phaser from 'phaser';
import * as B from '../shared/balance';
import type { Arch } from '../shared/balance';
import {
  ART_SCALE,
  CASTLE_H,
  CASTLE_W,
  GROUND_Y,
  LAYOUT,
  MOUNTS,
  TURRET_H,
  TURRET_PIVOT,
  type Team,
  buildBackground,
  buildIcons,
  generateTextures,
  keys,
} from './textures';
import { artStats } from './art/index';

const params = new URLSearchParams(location.search);
const section = params.get('s') ?? 'units';
const tierParam = Number(params.get('t') ?? 0);
const W = 1280;
const H = 690;

const nav = document.getElementById('nav')!;
for (const [s, label] of [
  ['units', 'Birimler'],
  ['unit&t=0', 'Ahşap'],
  ['unit&t=1', 'Bronz'],
  ['unit&t=2', 'Demir'],
  ['unit&t=3', 'Kristal'],
  ['unit&t=4', 'Eter'],
  ['castles', 'Kaleler'],
  ['castle&t=0', 'K0'],
  ['castle&t=2', 'K2'],
  ['castle&t=4', 'K4'],
  ['turrets', 'Kuleler'],
  ['fx', 'Mermi/Özel'],
  ['bg', 'Arka plan'],
  ['icons', 'İkonlar'],
]) {
  const a = document.createElement('a');
  a.href = `?s=${s}`;
  a.textContent = label;
  nav.appendChild(a);
}
const info = document.createElement('span');
nav.appendChild(info);

function swingPose(arch: Arch, rest: number, p: number): number {
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

interface UnitOpts {
  swing?: number;
  walk?: number;
}
function unit(scene: Phaser.Scene, t: number, arch: Arch, team: Team, x: number, y: number, s: number, o: UnitOpts = {}) {
  const L = LAYOUT[arch];
  const k = 1 / ART_SCALE;
  const c = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 1, L.bodyW * 0.9, 8, 0x000000, 0.22);
  const legB = scene.add.image(-L.legGap / 2, L.hipY, keys.leg(t, arch)).setOrigin(0.5, 0).setScale(k).setTint(0xbbbbbb);
  const legF = scene.add.image(L.legGap / 2, L.hipY, keys.leg(t, arch)).setOrigin(0.5, 0).setScale(k);
  const body = scene.add.image(0, L.hipY + 3, keys.body(t, arch, team)).setOrigin(0.5, 1).setScale(k);
  const Wp = L.weapon;
  const weapon = scene.add.image(Wp.x, Wp.y, keys.weapon(t, arch)).setOrigin(Wp.ox, Wp.oy).setRotation(Wp.rot).setScale(k);
  if (o.walk !== undefined) {
    const sn = Math.sin(o.walk);
    legB.rotation = sn * 0.55;
    legF.rotation = -sn * 0.55;
    const bob = -Math.abs(Math.cos(o.walk)) * 2;
    body.y += bob;
    weapon.y += bob;
  }
  if (o.swing !== undefined) {
    weapon.rotation = swingPose(arch, Wp.rot, o.swing);
    if (arch === 'ranged') weapon.x = Wp.x - Math.sin(o.swing * Math.PI) * 4;
  }
  c.add([shadow, legB, legF, body, weapon]);
  c.setScale((team === 'a' ? 1 : -1) * s, s);
  return c;
}

function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 13) {
  return scene.add.text(x, y, text, { fontFamily: 'system-ui', fontSize: `${size}px`, color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0);
}

function backdrop(scene: Phaser.Scene, y0: number, y1: number, ground: number) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x6fa8e8, 0x6fa8e8, 0xcfe4f7, 0xcfe4f7, 1);
  g.fillRect(0, y0, W, ground - y0);
  g.fillStyle(0x8f6e48);
  g.fillRect(0, ground, W, y1 - ground);
  g.fillStyle(0x4f8a3c);
  g.fillRect(0, ground - 4, W, 5);
}

function castleWithTurrets(scene: Phaser.Scene, t: number, team: Team, cx: number, bottom: number, s: number, rot = 0) {
  const dir = team === 'a' ? 1 : -1;
  scene.add.image(cx, bottom, keys.castle(t, team)).setOrigin(0.5, 1).setScale((dir * s) / ART_SCALE, s / ART_SCALE);
  MOUNTS.forEach((m, slot) => {
    const mx = team === 'a' ? cx + (m.x - CASTLE_W / 2) * s : cx - (m.x - CASTLE_W / 2) * s;
    const my = bottom + (m.y - CASTLE_H) * s;
    scene.add.image(mx, my - 3 * s, 'slot').setOrigin(0.5, 0).setScale(s / ART_SCALE);
    const grade = [0, 1, 2][slot];
    scene.add
      .image(mx, my - (1 + TURRET_H * (1 - TURRET_PIVOT.y)) * s, keys.turret(t, grade))
      .setOrigin(TURRET_PIVOT.x, TURRET_PIVOT.y)
      .setScale((dir * s) / ART_SCALE, s / ART_SCALE)
      .setRotation(rot * dir);
  });
}

class Gallery extends Phaser.Scene {
  constructor() {
    super('gallery');
  }
  create() {
    const t0 = performance.now();
    generateTextures(this);
    const t1 = performance.now();
    const icons = buildIcons(this);
    const t2 = performance.now();
    const st = Object.entries(artStats)
      .map(([k, v]) => `${k} ${v.toFixed(0)}`)
      .join(' · ');
    info.textContent = `generateTextures ${(t1 - t0).toFixed(0)} ms (${st}) · buildIcons ${(t2 - t1).toFixed(0)} ms`;
    (window as unknown as { __artTiming: unknown }).__artTiming = { gen: t1 - t0, icons: t2 - t1 };
    (window as unknown as { __scene: unknown }).__scene = this;

    if (section === 'units') this.units();
    else if (section === 'unit') this.unitDetail(tierParam);
    else if (section === 'castles') this.castles();
    else if (section === 'castle') this.castleDetail(tierParam);
    else if (section === 'turrets') this.turrets();
    else if (section === 'fx') this.fx();
    else if (section === 'bg') this.bg();
    else if (section === 'icons') showIcons(icons);
  }

  units() {
    const rowH = 132;
    for (let t = 0; t <= B.MAX_TIER; t++) {
      const gy = 26 + rowH * (t + 1) - 14;
      backdrop(this, gy - rowH + 6, gy + 8, gy);
      label(this, 44, gy - 70, B.TIERS[t].name, 14);
      let x = 120;
      const s = 1.5;
      for (const arch of B.ARCHES) {
        unit(this, t, arch, 'a', x, gy, s);
        x += arch === 'heavy' ? 120 : 82;
      }
      unit(this, t, 'melee', 'a', x, gy, s, { swing: 0.6 });
      x += 82;
      unit(this, t, 'heavy', 'a', x, gy, s, { swing: 0.45 });
      x += 120;
      unit(this, t, 'ranged', 'a', x, gy, s, { walk: 1.2 });
      x += 100;
      for (const arch of B.ARCHES) {
        unit(this, t, arch, 'e', x, gy, s);
        x += arch === 'heavy' ? 120 : 82;
      }
      // oyun boyutu (1x)
      unit(this, t, 'melee', 'a', x + 10, gy, 1);
      unit(this, t, 'heavy', 'e', x + 70, gy, 1);
    }
  }

  unitDetail(t: number) {
    backdrop(this, 30, H, 330);
    backdrop(this, 340, H, 640);
    const s = 3.6;
    let x = 110;
    for (const arch of B.ARCHES) {
      unit(this, t, arch, 'a', x, 322, s);
      x += arch === 'heavy' ? 330 : 220;
    }
    unit(this, t, 'melee', 'e', x - 40, 322, s);
    x = 110;
    unit(this, t, 'melee', 'a', x, 632, s, { swing: 0.6 });
    unit(this, t, 'melee', 'a', x + 200, 632, s, { swing: 0.3 });
    unit(this, t, 'heavy', 'a', x + 420, 632, s, { swing: 0.45 });
    unit(this, t, 'ranged', 'e', x + 640, 632, s, { walk: 1.3 });
    unit(this, t, 'heavy', 'e', x + 900, 632, s, { walk: 0.3 });
    label(this, 640, 34, `${B.TIERS[t].name}: ${Object.values(B.TIERS[t].units).map((u) => u.name).join(' · ')}`, 15);
  }

  castles() {
    backdrop(this, 30, H, 360);
    backdrop(this, 370, H, 680);
    for (let t = 0; t <= B.MAX_TIER; t++) {
      castleWithTurrets(this, t, 'a', 130 + t * 252, 370, 0.84);
      label(this, 130 + t * 252, 34, B.TIERS[t].name);
    }
    for (let t = 0; t <= B.MAX_TIER; t++) castleWithTurrets(this, t, 'e', 130 + t * 252, 680, 0.84, 0.5);
  }

  castleDetail(t: number) {
    backdrop(this, 30, H, 640);
    castleWithTurrets(this, t, 'a', 300, 660, 2);
    castleWithTurrets(this, Math.min(B.MAX_TIER, t + 1), 'e', 960, 660, 2, 0.45);
    unit(this, t, 'melee', 'a', 560, 640, 2);
    unit(this, t, 'heavy', 'e', 690, 640, 2);
  }

  turrets() {
    backdrop(this, 30, H, H - 10);
    const s = 2.4;
    for (let t = 0; t <= B.MAX_TIER; t++) {
      for (let g = 0; g < 3; g++) {
        const x = 70 + t * 248;
        const y = 150 + g * 205;
        this.add.image(x + 30, y, 'slot').setOrigin(0.5, 0).setScale(s / ART_SCALE);
        this.add
          .image(x + 30, y + 3 * s - (1 + TURRET_H * (1 - TURRET_PIVOT.y)) * s, keys.turret(t, g))
          .setOrigin(TURRET_PIVOT.x, TURRET_PIVOT.y)
          .setScale(s / ART_SCALE);
        // aşağı nişan almış hali (küçük)
        this.add
          .image(x + 175, y + 40, keys.turret(t, g))
          .setOrigin(TURRET_PIVOT.x, TURRET_PIVOT.y)
          .setScale(1 / ART_SCALE)
          .setRotation(0.6);
        if (this.textures.exists(keys.tproj(t, g))) this.add.image(x + 200, y - 60, keys.tproj(t, g)).setScale(2 / ART_SCALE);
        label(this, x + 60, y + 30, B.TIERS[t].turrets[g].name, 12);
      }
    }
  }

  fx() {
    this.cameras.main.setBackgroundColor('#4a5a72');
    const s = 3;
    for (let t = 0; t <= B.MAX_TIER; t++) {
      const x = 90 + t * 240;
      label(this, x + 40, 40, B.TIERS[t].name);
      const p = this.add.image(x, 110, keys.proj(t)).setScale(s / ART_SCALE);
      if (t >= 3) p.setBlendMode(Phaser.BlendModes.ADD);
      const sp = this.add.image(x + 100, 140, keys.spec(t)).setScale((s * 1.4) / ART_SCALE / 1.5);
      if (t >= 3) sp.setBlendMode(Phaser.BlendModes.ADD);
      for (let g = 0; g < 3; g++) {
        const tp = this.add.image(x + 40, 280 + g * 110, keys.tproj(t, g)).setScale(s / ART_SCALE);
        if (t >= 3) tp.setBlendMode(Phaser.BlendModes.ADD);
        label(this, x + 40, 320 + g * 110, B.TIERS[t].turrets[g].name, 11);
      }
    }
    let x = 80;
    for (const k of ['px', 'dot', 'soft', 'ring', 'slot']) {
      this.add.image(x, 640, k).setScale(k === 'slot' ? 2 / ART_SCALE : 1);
      label(this, x, 670, k, 11);
      x += 90;
    }
  }

  bg() {
    const tb = performance.now();
    const clouds = buildBackground(this);
    info.textContent += ` · buildBackground ${(performance.now() - tb).toFixed(0)} ms`;
    const cam = this.cameras.main;
    const camX = Number(params.get('x') ?? 400);
    cam.centerOn(camX, 345);
    this.events.on('update', (_t: number, d: number) => {
      for (const c of clouds) {
        c.img.x += (c.speed * d) / 1000;
        if (c.img.x > B.WORLD_W + 900) c.img.x = -900;
      }
    });
    const cx = B.BASE_FRONT + 14 - CASTLE_W / 2;
    castleWithTurrets(this, tierParam, 'a', cx, GROUND_Y + 10, 1);
    castleWithTurrets(this, tierParam, 'e', B.WORLD_W - cx, GROUND_Y + 10, 1);
    let x = 260;
    for (const arch of ['melee', 'melee', 'ranged', 'heavy', 'ranged'] as Arch[]) {
      unit(this, tierParam, arch, 'a', x, GROUND_Y + ((x * 7) % 5) - 2, 1, { walk: x });
      x += arch === 'heavy' ? 46 : 34;
    }
    x += 60;
    for (const arch of ['heavy', 'melee', 'melee', 'ranged'] as Arch[]) {
      unit(this, Math.min(4, tierParam + 1), arch, 'e', x, GROUND_Y + ((x * 7) % 5) - 2, 1, { walk: x });
      x += arch === 'heavy' ? 46 : 34;
    }
    // HUD bölgeleri
    const g = this.add.graphics().setScrollFactor(0).setDepth(9999);
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, 0, W, 80 - (720 - H) / 2);
    g.fillRect(0, H - 110 + (720 - H) / 2, W, 110);
  }
}

function showIcons(icons: ReturnType<typeof buildIcons>) {
  document.getElementById('game')!.style.display = 'none';
  const root = document.getElementById('icons')!;
  root.style.display = 'block';
  for (let t = 0; t <= B.MAX_TIER; t++) {
    const row = document.createElement('div');
    row.className = 'row';
    const l = document.createElement('div');
    l.className = 'lbl';
    l.textContent = B.TIERS[t].name;
    row.appendChild(l);
    const add = (src: string, small = false) => {
      const cell = document.createElement('div');
      cell.className = 'cell' + (small ? ' small' : '');
      const img = document.createElement('img');
      img.src = src;
      cell.appendChild(img);
      row.appendChild(cell);
    };
    for (const a of B.ARCHES) add(icons.units[t][a]);
    for (const a of B.ARCHES) add(icons.units[t][a], true);
    for (const s of icons.turrets[t]) add(s);
    add(icons.specials[t]);
    root.appendChild(row);
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#2a3040',
  scene: [Gallery],
  render: { antialias: true },
});
