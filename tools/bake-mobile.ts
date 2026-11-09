// Mobil (Defold) sürüm için tüm çizimleri PNG'ye döker ve atlas dosyalarını yazar.
// Web'deki çizim kodunun aynısını tarayıcısız çalıştırır (@napi-rs/canvas), yani görseller birebir aynıdır.
//
//   npx tsx tools/bake-mobile.ts
//
// Çıktı: mobile/assets/images/<atlas>/*.png, mobile/assets/<atlas>.atlas, mobile/shared/art_data.lua
// Dönen parçaların (bacak, silah, kule) dönme noktası resmin ortasına gelecek şekilde boşluk eklenir;
// Defold'da sprite'lar ortalarından döndüğü için ek hesap gerekmez.
import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toLua } from './lua';

// Çizim kodu document.createElement('canvas') kullanır: Node'da @napi-rs/canvas ile karşıla.
(globalThis as unknown as { document: unknown }).document = {
  createElement: (tag: string) => {
    if (tag !== 'canvas') throw new Error(`desteklenmeyen öğe: ${tag}`);
    return createCanvas(1, 1);
  },
};

const B = await import('../shared/balance');
const { drawBody, drawLeg, drawWeapon } = await import('../client/art/units');
const { drawCastle } = await import('../client/art/castles');
const { drawTurret } = await import('../client/art/turrets');
const { drawProj, drawTurretProj, drawSpecial, drawSlot, drawParticle, drawCracks } = await import('../client/art/fx');
const { drawCape, drawCrown, drawSource, CAPE_BOX, CROWN_BOX, SOURCE_W, SOURCE_H } = await import('../client/art/commander');
const L = await import('../client/art/layout');
const S = await import('../client/art/scenery');
const I = await import('../client/art/icons');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'mobile');
const IMG = join(ROOT, 'assets', 'images');
type Team = 'a' | 'e';
const TEAMS: Team[] = ['a', 'e'];

/** atlas → [ad, tuval] */
const atlases: Record<string, [string, Canvas][]> = { units: [], castles: [], fx: [], bg: [], ui: [] };
/** Lua'ya yazılacak boyutlar (ekran birimi) ve pivot bilgisi */
const sizes: Record<string, { w: number; h: number; pw: number; ph: number }> = {};

/** unitScale: dokunun ekran birimine oranı (w/h = piksel / unitScale; pw/ph = piksel). */
function add(atlas: string, name: string, c: Canvas, unitScale: number = L.ART_SCALE) {
  atlases[atlas].push([name, c]);
  sizes[name] = { w: c.width / unitScale, h: c.height / unitScale, pw: c.width, ph: c.height };
}

/** Pivot noktası (0..1) resmin ortasına gelsin diye saydam boşluk ekler. */
function centerPivot(c: Canvas, ox: number, oy: number): Canvas {
  const w = Math.ceil(2 * Math.max(ox, 1 - ox) * c.width);
  const h = Math.ceil(2 * Math.max(oy, 1 - oy) * c.height);
  const out = createCanvas(w, h);
  out.getContext('2d').drawImage(c, Math.round(w / 2 - ox * c.width), Math.round(h / 2 - oy * c.height));
  return out;
}

function canvas2d(w: number, h: number): { c: Canvas; ctx: SKRSContext2D } {
  const c = createCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  return { c, ctx: c.getContext('2d') };
}

// ── birimler ──────────────────────────────────────────────
const raw: Record<string, Canvas> = {}; // ikonlar için pivotsuz asıllar
for (let t = 0; t <= B.MAX_TIER; t++) {
  for (const arch of B.ARCHES) {
    const lay = L.LAYOUT[arch];
    for (const team of TEAMS) {
      const c = drawBody(t, arch, team) as unknown as Canvas;
      raw[`ub_${t}_${arch}_${team}`] = c;
      add('units', `ub_${t}_${arch}_${team}`, c);
    }
    const leg = drawLeg(t, arch) as unknown as Canvas;
    raw[`ul_${t}_${arch}`] = leg;
    add('units', `ul_${t}_${arch}`, centerPivot(leg, 0.5, 0));
    const wpn = drawWeapon(t, arch) as unknown as Canvas;
    raw[`uw_${t}_${arch}`] = wpn;
    add('units', `uw_${t}_${arch}`, centerPivot(wpn, lay.weapon.ox, lay.weapon.oy));
  }
  for (const team of TEAMS) {
    const c = drawCape(t, team) as unknown as Canvas;
    raw[`cape_${t}_${team}`] = c;
    add('units', `cape_${t}_${team}`, c);
  }
  const crown = drawCrown(t) as unknown as Canvas;
  raw[`crown_${t}`] = crown;
  add('units', `crown_${t}`, crown);

  // ── kaleler ──
  const castles = drawCastle(t) as unknown as Record<Team, Canvas>;
  for (const team of TEAMS) add('castles', `castle_${t}_${team}`, castles[team]);

  // ── kuleler, mermiler, özel güç ──
  for (let g = 0; g < 3; g++) {
    const tur = drawTurret(t, g) as unknown as Canvas;
    raw[`turret_${t}_${g}`] = tur;
    add('fx', `turret_${t}_${g}`, centerPivot(tur, L.TURRET_PIVOT.x, L.TURRET_PIVOT.y));
    add('fx', `tproj_${t}_${g}`, drawTurretProj(t, g) as unknown as Canvas);
  }
  add('fx', `proj_${t}`, drawProj(t) as unknown as Canvas);
  const spec = drawSpecial(t) as unknown as Canvas;
  raw[`spec_${t}`] = spec;
  add('fx', `spec_${t}`, spec);
}
add('fx', 'slot', drawSlot() as unknown as Canvas);
add('fx', 'ether_src', drawSource() as unknown as Canvas);
for (const k of ['px', 'dot', 'soft', 'ring'] as const) add('fx', k, drawParticle(k) as unknown as Canvas);
for (let v = 0; v < 2; v++) add('fx', `crack_${v}`, drawCracks(v) as unknown as Canvas);

// düz beyaz (çubuklar, dörtgenler; boyanarak kullanılır)
{
  const { c, ctx } = canvas2d(8, 8);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 8, 8);
  add('fx', 'white', c, 1);
}
// yumuşak gölge elipsi (birim ayağı)
{
  const { c, ctx } = canvas2d(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  add('fx', 'blob', c, 1);
}
// karakol flaması (beyaz, sahibinin rengine boyanır)
{
  const { c, ctx } = canvas2d(64, 44);
  ctx.scale(2, 2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(30, 4);
  ctx.lineTo(22, 11);
  ctx.lineTo(30, 18);
  ctx.lineTo(0, 20);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1, 1);
  ctx.lineTo(30, 4);
  ctx.lineTo(22, 11);
  ctx.lineTo(30, 18);
  ctx.lineTo(1, 19);
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(26,26,36,0.9)';
  ctx.stroke();
  add('fx', 'op_banner', c);
}
// "Savun" toplanma sancağı
{
  const { c, ctx } = canvas2d(80, 164);
  ctx.scale(2, 2);
  ctx.translate(4, 80);
  ctx.fillStyle = '#3b3024';
  ctx.fillRect(-2, -78, 4, 78);
  ctx.beginPath();
  ctx.moveTo(2, -76);
  ctx.lineTo(34, -66);
  ctx.lineTo(2, -54);
  ctx.closePath();
  ctx.fillStyle = '#3d8bff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(26,26,36,0.9)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(13, -66, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  add('fx', 'rally', c);
}

// ── arka plan ─────────────────────────────────────────────
const bgInfo: { key: string; parts: { name: string; x: number; w: number }[]; y0: number; y1: number; scroll: number; depth: number; scale: number }[] = [];
add('bg', 'bg_sky', S.drawSky() as unknown as Canvas, 1);
add('bg', 'bg_sun', S.drawSun() as unknown as Canvas, 1);
S.drawClouds().forEach((c, i) => add('bg', `bg_cloud_${i}`, c as unknown as Canvas, 1));
{
  const CHUNK = 2048;
  for (const layer of S.sceneryLayers()) {
    // uzak katmanlar yarım çözünürlükte (bulanıklık fark edilmez, bellek dörtte bir)
    const scale = layer.scroll < 0.3 ? 0.5 : 1;
    const h = Math.ceil(layer.y1 - layer.y0);
    const parts: { name: string; x: number; w: number }[] = [];
    const step = CHUNK / scale;
    for (let cx = layer.x0, i = 0; cx < layer.x1; cx += step, i++) {
      const w = Math.min(step, Math.ceil(layer.x1 - cx));
      const { c, ctx } = canvas2d(w * scale, h * scale);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -layer.y0);
      layer.draw(ctx as unknown as CanvasRenderingContext2D, cx - 60, cx + w + 60);
      const name = `${layer.key}_${i}`;
      add('bg', name, c, scale);
      parts.push({ name, x: cx, w });
    }
    bgInfo.push({ key: layer.key, parts, y0: layer.y0, y1: layer.y1, scroll: layer.scroll, depth: layer.depth, scale });
  }
}

// ── arayüz ikonları ───────────────────────────────────────
/** Görselin dolu (alfa > 0) bölgesi. */
function contentBox(c: Canvas): [number, number, number, number] {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
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

/** İçeriği kare ikona sığdırır; koyu düğmelerde okunsun diye hafif açık hale ekler. */
function fitIcon(src: Canvas, size: number, pad: number): Canvas {
  const [bx, by, bw, bh] = contentBox(src);
  const s = Math.min((size - pad * 2) / bw, (size - pad * 2) / bh);
  const w = bw * s;
  const h = bh * s;
  const { c, ctx } = canvas2d(size, size);
  ctx.shadowColor = 'rgba(255,255,255,0.35)';
  ctx.shadowBlur = size * 0.06;
  ctx.drawImage(src, bx, by, bw, bh, (size - w) / 2, (size - h) / 2, w, h);
  return c;
}

/** Birimi oyundaki gibi parçalarından birleştirip ikona sığdırır (web'deki unitIcon'un aynısı). */
function unitIcon(t: number, arch: 'melee' | 'ranged' | 'heavy', commander: boolean, size: number): Canvas {
  const lay = L.LAYOUT[arch];
  const SC = 2;
  const { c, ctx } = canvas2d(120 * SC, 120 * SC);
  ctx.translate(60 * SC, 100 * SC);
  ctx.scale(SC, SC);
  const k = 1 / L.ART_SCALE;
  const draw = (key: string, x: number, y: number) => {
    const img = raw[key];
    ctx.drawImage(img, x, y, img.width * k, img.height * k);
  };
  if (commander) draw(`cape_${t}_a`, CAPE_BOX[0], CAPE_BOX[1]);
  const leg = raw[`ul_${t}_${arch}`];
  const dark = createCanvas(leg.width, leg.height);
  const dctx = dark.getContext('2d');
  dctx.drawImage(leg, 0, 0);
  dctx.globalCompositeOperation = 'source-atop';
  dctx.fillStyle = 'rgba(0,0,0,0.27)';
  dctx.fillRect(0, 0, dark.width, dark.height);
  ctx.drawImage(dark, -lay.legGap / 2 - lay.legW / 2, lay.hipY, lay.legW, lay.legH);
  draw(`ul_${t}_${arch}`, lay.legGap / 2 - lay.legW / 2, lay.hipY);
  draw(`ub_${t}_${arch}_a`, -lay.bodyW / 2, lay.hipY + 3 - lay.bodyH);
  if (commander) draw(`crown_${t}`, CROWN_BOX[0], CROWN_BOX[1]);
  const W = lay.weapon;
  ctx.save();
  ctx.translate(W.x, W.y);
  ctx.rotate(W.rot);
  draw(`uw_${t}_${arch}`, -W.w * W.ox, -W.h * W.oy);
  ctx.restore();
  return fitIcon(c, size, size * 0.05);
}

for (let t = 0; t <= B.MAX_TIER; t++) {
  for (const arch of B.ARCHES) add('ui', `icon_u_${t}_${arch}`, unitIcon(t, arch, false, 112), 1);
  add('ui', `icon_cmd_${t}`, unitIcon(t, 'melee', true, 112), 1);
  for (let g = 0; g < 3; g++) add('ui', `icon_tur_${t}_${g}`, fitIcon(raw[`turret_${t}_${g}`], 96, 6), 1);
  add('ui', `icon_spec_${t}`, fitIcon(raw[`spec_${t}`], 96, 12), 1);
}

// Çağ kartı ve Eter Kaynağı simgeleri (web'de emoji; mobilde bunlar)
for (const id of I.CARD_ICON_IDS) add('ui', `icon_card_${id}`, I.drawCardIcon(id) as unknown as Canvas, 1);
for (const kind of I.SOURCE_ICON_IDS) {
  add('ui', `icon_src_${kind}`, I.drawSourceIcon(kind) as unknown as Canvas, 1);
  add('fx', `src_${kind}`, I.drawSourceIcon(kind) as unknown as Canvas);
}

// Arayüz şekilleri (beyaz; düğümün rengiyle boyanır). "round" 9 dilimli kullanılır.
function shape(name: string, w: number, h: number, draw: (ctx: SKRSContext2D) => void) {
  const { c, ctx } = canvas2d(w, h);
  draw(ctx);
  add('ui', name, c, 1);
}
function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
shape('ui_round', 64, 64, (ctx) => {
  roundRect(ctx, 1, 1, 62, 62, 18);
  ctx.fillStyle = '#fff';
  ctx.fill();
});
shape('ui_frame', 64, 64, (ctx) => {
  roundRect(ctx, 2, 2, 60, 60, 17);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
});
shape('ui_circle', 96, 96, (ctx) => {
  ctx.beginPath();
  ctx.arc(48, 48, 46, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
});
shape('ui_white', 8, 8, (ctx) => {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 8, 8);
});
shape('ui_flag', 40, 48, (ctx) => {
  ctx.fillStyle = '#fff';
  ctx.fillRect(4, 2, 4, 44);
  ctx.beginPath();
  ctx.moveTo(8, 4);
  ctx.lineTo(36, 12);
  ctx.lineTo(8, 22);
  ctx.closePath();
  ctx.fill();
});
shape('ui_diamond', 32, 32, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(16, 1);
  ctx.lineTo(31, 16);
  ctx.lineTo(16, 31);
  ctx.lineTo(1, 16);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
});
shape('ui_coin', 48, 48, (ctx) => {
  const g = ctx.createRadialGradient(18, 16, 2, 24, 24, 23);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(0.5, '#ffd34d');
  g.addColorStop(1, '#c98a12');
  ctx.beginPath();
  ctx.arc(24, 24, 22, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#7a4a00';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(24, 24, 13, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(122,74,0,0.55)';
  ctx.stroke();
});

// ── dosyaları yaz ─────────────────────────────────────────
rmSync(IMG, { recursive: true, force: true });
let files = 0;
let bytes = 0;
for (const [atlas, list] of Object.entries(atlases)) {
  const dir = join(IMG, atlas);
  mkdirSync(dir, { recursive: true });
  const images: string[] = [];
  for (const [name, c] of list) {
    const png = c.toBuffer('image/png');
    writeFileSync(join(dir, `${name}.png`), png);
    images.push(`images {\n  image: "/assets/images/${atlas}/${name}.png"\n}\n`);
    files++;
    bytes += png.length;
  }
  writeFileSync(join(ROOT, 'assets', `${atlas}.atlas`), `${images.join('')}margin: 2\nextrude_borders: 2\ninner_padding: 0\n`);
}

// ── Lua: boyutlar ve yerleşim ─────────────────────────────
const art = {
  ART_SCALE: L.ART_SCALE,
  VIEW_H: L.VIEW_H,
  GROUND_Y: L.GROUND_Y,
  TEAM: L.TEAM,
  LAYOUT: L.LAYOUT,
  CASTLE_W: L.CASTLE_W,
  CASTLE_H: L.CASTLE_H,
  MOUNTS: L.MOUNTS,
  TURRET_W: L.TURRET_W,
  TURRET_H: L.TURRET_H,
  TURRET_PIVOT: L.TURRET_PIVOT,
  TURRET_MUZZLE: L.TURRET_MUZZLE,
  CAPE_BOX: [...CAPE_BOX],
  CROWN_BOX: [...CROWN_BOX],
  SOURCE_W,
  SOURCE_H,
  SKY_X0: S.SKY_X0,
  SKY_X1: S.SKY_X1,
  GROUND_X0: S.GROUND_X0,
  GROUND_X1: S.GROUND_X1,
  SOIL: S.SOIL,
  SUN: S.SUN,
  CLOUDS: S.cloudPlaces(),
  BG: bgInfo,
  SIZES: sizes,
};
writeFileSync(
  join(ROOT, 'shared', 'art_data.lua'),
  `-- Bu dosya tools/bake-mobile.ts tarafından üretilir, elle değiştirme.\n-- Boyutlar ekran birimindedir (doku pikseli / ART_SCALE).\nreturn ${toLua(art)}\n`,
);
console.log(`${files} PNG (${(bytes / 1024 / 1024).toFixed(1)} MB), ${Object.keys(atlases).length} atlas, art_data.lua yazıldı.`);
