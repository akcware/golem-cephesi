// Doku sözleşmesi: GameScene / HUD bu API'yi client/textures.ts üzerinden kullanır.
import Phaser from 'phaser';
import * as B from '../../shared/balance';
import type { Arch } from '../../shared/balance';
import { generateArt, artKeys } from './index';
import { CAPE_BOX, CROWN_BOX } from './commander';
import { ART_SCALE, LAYOUT, type Team } from './layout';

export * from './layout';

export const keys = {
  body: artKeys.body,
  leg: artKeys.leg,
  weapon: artKeys.weapon,
  castle: artKeys.castle,
  /** g: kule derecesi 0 = Hafif, 1 = Orta, 2 = Ağır */
  turret: artKeys.turret,
  proj: artKeys.proj,
  /** kuleye özel mermi / vuruş parlaması (g: kule derecesi) */
  tproj: artKeys.tproj,
  spec: artKeys.spec,
  /** komutan ekleri: sırttaki pelerin ve taç */
  cape: artKeys.cape,
  crown: artKeys.crown,
  /** Eter Kaynağı */
  source: artKeys.source,
};
export { CAPE_BOX, CROWN_BOX, SOURCE_W, SOURCE_H } from './commander';

/** Tüm dokuları üretir. BootScene.create içinde bir kez çağrılır. */
export function generateTextures(scene: Phaser.Scene) {
  generateArt(scene);
}

// ── arayüz ikonları (DOM için data URL) ───────────────────
function src(scene: Phaser.Scene, key: string): CanvasImageSource & { width: number; height: number } {
  return scene.textures.get(key).getSourceImage() as HTMLCanvasElement;
}

function canvas2d(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return { c, ctx: c.getContext('2d', { willReadFrequently: true })! };
}

/** Görselin dolu (alfa > 0) bölgesini bulur. */
function contentBox(c: HTMLCanvasElement): [number, number, number, number] {
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width;
  let y0 = c.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      if (d[(y * c.width + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return [0, 0, c.width, c.height];
  x0 = Math.max(0, x0 - 1);
  y0 = Math.max(0, y0 - 1);
  return [x0, y0, Math.min(c.width, x1 + 2) - x0, Math.min(c.height, y1 + 2) - y0];
}

/** İçeriği kare ikona sığdırır; koyu arayüz düğmelerinde okunsun diye hafif açık hale ekler. */
function fitIcon(srcC: HTMLCanvasElement, size: number, pad: number, maxScale = 99): string {
  const [bx, by, bw, bh] = contentBox(srcC);
  const s = Math.min((size - pad * 2) / bw, (size - pad * 2) / bh, maxScale);
  const w = bw * s;
  const h = bh * s;
  const { c, ctx } = canvas2d(size, size);
  ctx.shadowColor = 'rgba(255,255,255,0.35)';
  ctx.shadowBlur = size * 0.06;
  ctx.drawImage(srcC, bx, by, bw, bh, (size - w) / 2, (size - h) / 2, w, h);
  return c.toDataURL();
}

export function unitIcon(scene: Phaser.Scene, t: number, arch: Arch, team: Team = 'a', size = 112, commander = false): string {
  const L = LAYOUT[arch];
  // önce birimi oyundaki gibi geniş bir tuvale 2x birleştir, sonra içeriği ikona sığdır
  const S = 2;
  const { c, ctx } = canvas2d(120 * S, 120 * S);
  ctx.translate(60 * S, 100 * S);
  ctx.scale(S, S);
  const k = 1 / ART_SCALE;
  const draw = (key: string, x: number, y: number) => {
    const img = src(scene, key);
    ctx.drawImage(img, x, y, img.width * k, img.height * k);
  };
  if (commander) draw(keys.cape(t, team), CAPE_BOX[0], CAPE_BOX[1]);
  // arka bacak: oyundaki 0xbbbbbb tonlamasının karşılığı (koyu kopya)
  const leg = src(scene, keys.leg(t, arch));
  const dark = document.createElement('canvas');
  dark.width = leg.width;
  dark.height = leg.height;
  const dctx = dark.getContext('2d', { willReadFrequently: true })!;
  dctx.drawImage(leg, 0, 0);
  dctx.globalCompositeOperation = 'source-atop';
  dctx.fillStyle = 'rgba(0,0,0,0.27)';
  dctx.fillRect(0, 0, dark.width, dark.height);
  ctx.drawImage(dark, -L.legGap / 2 - L.legW / 2, L.hipY, L.legW, L.legH);
  draw(keys.leg(t, arch), L.legGap / 2 - L.legW / 2, L.hipY);
  draw(keys.body(t, arch, team), -L.bodyW / 2, L.hipY + 3 - L.bodyH);
  if (commander) draw(keys.crown(t), CROWN_BOX[0], CROWN_BOX[1]);
  const W = L.weapon;
  ctx.save();
  ctx.translate(W.x, W.y);
  ctx.rotate(W.rot);
  draw(keys.weapon(t, arch), -W.w * W.ox, -W.h * W.oy);
  ctx.restore();
  return fitIcon(c, size, size * 0.05);
}

export function textureIcon(scene: Phaser.Scene, key: string, size = 96, pad = 6): string {
  return fitIcon(src(scene, key) as HTMLCanvasElement, size, pad);
}

export interface IconSet {
  units: Record<Arch, string>[]; // [tier][arch]
  turrets: string[][]; // [tier][grade]
  specials: string[];
  commanders: string[]; // [tier]
}

export function buildIcons(scene: Phaser.Scene): IconSet {
  const units: Record<Arch, string>[] = [];
  const turrets: string[][] = [];
  const specials: string[] = [];
  const commanders: string[] = [];
  for (let t = 0; t <= B.MAX_TIER; t++) {
    units.push({
      melee: unitIcon(scene, t, 'melee'),
      ranged: unitIcon(scene, t, 'ranged'),
      heavy: unitIcon(scene, t, 'heavy'),
    });
    commanders.push(unitIcon(scene, t, 'melee', 'a', 112, true));
    turrets.push([0, 1, 2].map((grade) => (scene.textures.exists(keys.turret(t, grade)) ? textureIcon(scene, keys.turret(t, grade)) : '')));
    specials.push(scene.textures.exists(keys.spec(t)) ? textureIcon(scene, keys.spec(t), 96, 12) : '');
  }
  return { units, turrets, specials, commanders };
}

// ── arka plan ────────────────────────────────────────────
export { buildBackground, type Cloud } from './background';
