// Kuleler: 5 kademe × 3 derece (Hafif / Orta / Ağır). Sağa bakar; TURRET_PIVOT'taki döner tabla etrafında döner.
// Dönme noktası her kulede yuvarlak bir döner tablanın merkezidir; tablanın altı dokunun alt kenarına (yuvaya) oturur.
import * as B from '../../shared/balance';
import {
  type Build,
  type Ctx,
  OUTC,
  capsule,
  circ,
  css,
  darken,
  ell,
  fill,
  glow,
  lighten,
  line,
  makeCanvas,
  path,
  poly,
  rivet,
  rpoly,
  rr,
  shade,
  sparkle,
  stroke,
  tone,
} from './canvas';
import { ART_SCALE, TURRET_H, TURRET_PIVOT, TURRET_W } from './layout';
import { type Box, crystalFacets, inside, mat, part, tonePart } from './material';
import { leaf } from './units';

const PAL = (t: number) => B.TIERS[t].palette;
/** Dönme noktasından dokunun alt kenarına uzaklık (tabla yarıçapı üst sınırı). */
const BOT = TURRET_H * (1 - TURRET_PIVOT.y);

export function drawTurret(t: number, g: number): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(TURRET_W, TURRET_H, ART_SCALE);
  ctx.translate(TURRET_W * TURRET_PIVOT.x, TURRET_H * TURRET_PIVOT.y);
  DRAW[t][g](ctx);
  return c;
}

function stroked(ctx: Ctx, draw: (c: Ctx) => void, lw: number, color: string, outW = 1.3) {
  ctx.beginPath();
  draw(ctx);
  ctx.lineWidth = lw + outW * 2;
  ctx.strokeStyle = OUTC;
  ctx.stroke();
  ctx.beginPath();
  draw(ctx);
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/** Döner tabla: alt kenarı yuvaya değer (r ≤ BOT). */
function hub(ctx: Ctx, t: number, r: number, cy = BOT - r) {
  const M = mat(t);
  const box: Box = [-r, cy - r, r * 2, r * 2];
  switch (t) {
    case 0:
      part(ctx, 0, circ(0, cy, r), box, 'alt', { sh: 2 });
      stroke(ctx, circ(0, cy, r * 0.62), 0.6, css(M.alt.dark, 0.8));
      stroke(ctx, circ(0, cy, r * 0.3), 0.6, css(M.alt.dark, 0.8));
      break;
    case 1:
      part(ctx, 1, circ(0, cy, r), box, 'alt', { sh: 2 });
      for (let i = 0; i < 6; i++) rivet(ctx, Math.cos(i * 1.047 + 0.3) * r * 0.7, cy + Math.sin(i * 1.047 + 0.3) * r * 0.7, 0.9, M.trim);
      break;
    case 2:
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        fill(ctx, circ(Math.cos(a) * r, cy + Math.sin(a) * r, 1.8), OUTC);
      }
      part(ctx, 2, circ(0, cy, r), box, 'alt', { sh: 2 });
      for (let i = 0; i < 6; i++) rivet(ctx, Math.cos(i * 1.047) * r * 0.68, cy + Math.sin(i * 1.047) * r * 0.68, 0.85, M.main);
      break;
    case 3:
      part(ctx, 3, circ(0, cy, r), box, 'alt', { sh: 2 });
      glow(ctx, 0, cy, r * 0.8, PAL(3).glow, 0.6);
      part(ctx, 3, poly(0, cy - r * 0.45, r * 0.4, cy, 0, cy + r * 0.45, -r * 0.4, cy), [-r * 0.4, cy - r * 0.45, r * 0.8, r * 0.9], 'trim', { lw: 0.9 });
      break;
    default:
      glow(ctx, 0, cy, r * 1.5, PAL(4).glow, 0.4);
      part(ctx, 4, circ(0, cy, r), box, 'trim', { sh: 2 });
      part(ctx, 4, circ(0, cy, r * 0.62), [-r * 0.62, cy - r * 0.62, r * 1.24, r * 1.24], 'main', { lw: 1.1 });
      glow(ctx, 0, cy, r * 0.5, 0xffffff, 0.6);
  }
}

// ── AHŞAP ────────────────────────────────────────────────
function woodArrow(ctx: Ctx) {
  // Ok Kulesi: küçük, çevik çift yay
  hub(ctx, 0, 8);
  part(ctx, 0, rr(-8, -5, 22, 5, 2), [-8, -5, 22, 5], 'main', { grain: 'h' });
  line(ctx, [10.5, -14, 4, -2.6, 10.5, 9], 0.7, '#f2e6c8');
  stroked(ctx, (c) => {
    c.moveTo(10.5, -14);
    c.quadraticCurveTo(17.5, -8, 13.6, -2.4);
    c.quadraticCurveTo(17.5, 3, 10.5, 9);
  }, 2.2, css(mat(0).main.base));
  stroked(ctx, (c) => {
    c.moveTo(3, -2.6);
    c.lineTo(22, -2.6);
  }, 1.1, css(mat(0).main.light), 1);
  fill(ctx, poly(21.5, -5, 27, -2.6, 21.5, -0.2), '#b4bac0');
  stroke(ctx, poly(21.5, -5, 27, -2.6, 21.5, -0.2), 1);
  fill(ctx, poly(3, -2.6, 6, -5, 8, -5, 6, -2.6), '#e8e0c8');
  // yan sadak
  part(ctx, 0, rr(-11, -12, 6, 10, 1.8), [-11, -12, 6, 10], 'alt');
  for (const x of [-10, -8, -6.4]) line(ctx, [x, -12, x - 0.6, -16], 1, '#e8d9b0');
  leaf(ctx, -4, -6, 5, 2, -2.4);
}

function woodPinecone(ctx: Ctx) {
  // Kozalak Mancınığı: A-çatı, geri çekili kol, kovada kozalak
  hub(ctx, 0, 9);
  part(ctx, 0, rr(-15, -4, 34, 5.5, 2.2), [-15, -4, 34, 5.5], 'main', { grain: 'h' });
  part(ctx, 0, poly(-2, -3, 3, -22, 7, -22, 9, -3), [-2, -22, 11, 19], 'alt');
  part(ctx, 0, rr(13, -12, 4, 10, 1.4), [13, -12, 4, 10], 'alt', { lw: 1.2 });
  // kol
  part(ctx, 0, capsule(5, -19, -10, -10, 2, 1.8), [-12, -21, 19, 13], 'main', { grain: 'h' });
  // kova + kozalak
  part(ctx, 0, path((c) => {
    c.moveTo(-18, -13);
    c.quadraticCurveTo(-17, -5, -10, -6);
    c.lineTo(-8, -12);
    c.closePath();
  }), [-18, -13, 10, 7], 'alt', { lw: 1.2 });
  pinecone(ctx, -13, -15, 4.6, -0.6);
  // burulmuş halat
  shade(ctx, circ(5, -19, 3.4), tone(0xd8c08a, 0x9a8250, 0xf2e2b4), { sh: 1, hl: 0.5, lw: 1.2 });
  line(ctx, [3, -21, 7, -17], 0.6, '#8a7040');
  leaf(ctx, 8, -22, 5, 2, -1);
}

function woodCatapult(ctx: Ctx) {
  // Kütük Katapultu: büyük çatı, kalın kol, kayadan bomba, karşı ağırlık
  hub(ctx, 0, 10);
  part(ctx, 0, rr(-19, -4.5, 46, 7, 2.6), [-19, -4.5, 46, 7], 'main', { grain: 'h' });
  for (const x of [-14, 20]) part(ctx, 0, circ(x, 1, 4.2), [x - 4.2, -3.2, 8.4, 8.4], 'alt', { lw: 1.2 });
  part(ctx, 0, poly(-6, -3, 1, -29, 7, -29, 13, -3), [-6, -29, 19, 26], 'alt');
  part(ctx, 0, rr(22, -16, 5, 13, 1.6), [22, -16, 5, 13], 'alt', { lw: 1.3 });
  part(ctx, 0, rr(19, -18, 11, 4, 1.4), [19, -18, 11, 4], 'main', { lw: 1.2 });
  // kol (geriye kalkık)
  part(ctx, 0, capsule(4, -26, -11, -33, 2.8, 2.4), [-14, -36, 21, 13], 'main', { grain: 'h' });
  // sapan kepçesi + yosunlu kaya bombası
  part(ctx, 0, path((c) => {
    c.moveTo(-20, -37);
    c.quadraticCurveTo(-20, -27, -11, -28);
    c.lineTo(-9, -35);
    c.closePath();
  }), [-20, -37, 11, 10], 'alt', { lw: 1.3 });
  boulder(ctx, -14.5, -33.5, 5.6);
  // karşı ağırlık sandığı
  part(ctx, 0, rr(6, -24, 9, 9, 2), [6, -24, 9, 9], 'alt', { lw: 1.3 });
  line(ctx, [6, -20, 15, -20], 0.7, css(mat(0).alt.dark));
  shade(ctx, circ(4, -26, 3.6), tone(0xd8c08a, 0x9a8250, 0xf2e2b4), { sh: 1, hl: 0.5, lw: 1.2 });
  part(ctx, 0, ell(-8, -3.6, 7, 2.2), [-15, -6, 14, 4.4], 'trim', { lw: 1 });
  leaf(ctx, 10, -29, 6, 2.2, -0.9);
  leaf(ctx, -2, -3, 5, 2, -2.4);
}

export function pinecone(ctx: Ctx, x: number, y: number, r: number, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const b = ell(0, 0, r * 0.82, r * 1.12);
  shade(ctx, b, tone(0x8a5a2e, 0x5a361a, 0xc08a50), {
    sh: r * 0.3,
    hl: 0.6,
    lw: 1.2,
    inner: () => {
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = 'rgba(40,20,5,0.85)';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-r, i * r * 0.42 - r * 0.3);
        ctx.quadraticCurveTo(0, i * r * 0.42 + r * 0.25, r, i * r * 0.42 - r * 0.3);
        ctx.stroke();
      }
      for (let i = -2; i <= 2; i++) line(ctx, [i * r * 0.32, -r * 1.1, i * r * 0.36, r * 1.1], 0.5, 'rgba(40,20,5,0.6)');
      for (let i = -1; i <= 1; i++) fill(ctx, ell(i * r * 0.35, -r * 0.2, r * 0.12, r * 0.08), 'rgba(255,220,160,0.6)');
    },
  });
  ctx.restore();
}

export function boulder(ctx: Ctx, x: number, y: number, r: number) {
  const b = rpoly(r * 0.35, x - r, y - r * 0.2, x - r * 0.5, y - r, x + r * 0.6, y - r * 0.9, x + r, y + r * 0.1, x + r * 0.5, y + r, x - r * 0.6, y + r * 0.85);
  shade(ctx, b, tone(0x8f8a7e, 0x5c584f, 0xc4beb0), {
    sh: r * 0.35,
    hl: 0.8,
    lw: 1.3,
    inner: () => {
      fill(ctx, ell(x - r * 0.2, y - r * 0.75, r * 0.7, r * 0.35), css(0x6db04a));
      fill(ctx, ell(x - r * 0.35, y - r * 0.85, r * 0.35, r * 0.15), css(0xaee072));
      line(ctx, [x + r * 0.1, y - r * 0.1, x + r * 0.5, y + r * 0.4], 0.7, 'rgba(40,36,30,0.7)');
    },
  });
  // halat sargısı
  line(ctx, [x - r * 0.9, y + r * 0.3, x + r * 0.9, y - r * 0.1], 2.4, OUTC);
  line(ctx, [x - r * 0.9, y + r * 0.3, x + r * 0.9, y - r * 0.1], 1.1, '#d8c08a');
}

// ── BRONZ ────────────────────────────────────────────────
function bronzeBow(ctx: Ctx) {
  // Bronz Yay: kompakt, seri atan yay
  hub(ctx, 1, 8);
  part(ctx, 1, rr(-9, -5.4, 26, 5.4, 2), [-9, -5.4, 26, 5.4], 'alt');
  line(ctx, [12, -15.5, 5, -2.7, 12, 10], 0.7, '#f2e6c8');
  stroked(ctx, (c) => {
    c.moveTo(12, -15.5);
    c.quadraticCurveTo(15, -12, 14, -8);
    c.quadraticCurveTo(19.5, -5, 15.5, -2.7);
    c.quadraticCurveTo(19.5, -0.5, 14, 3);
    c.quadraticCurveTo(15, 7, 12, 10);
  }, 2.2, css(mat(1).main.base));
  stroked(ctx, (c) => {
    c.moveTo(4, -2.7);
    c.lineTo(23, -2.7);
  }, 1.1, css(0x8a6a44), 1);
  fill(ctx, poly(22.4, -5.2, 28.4, -2.7, 22.4, -0.2), css(mat(1).main.light));
  stroke(ctx, poly(22.4, -5.2, 28.4, -2.7, 22.4, -0.2), 1);
  part(ctx, 1, rr(-4, -9, 9, 4.6, 1.6), [-4, -9, 9, 4.6], 'main', { lw: 1.2 });
  rivet(ctx, -6, -2.7, 0.8, mat(1).trim);
  rivet(ctx, 8, -2.7, 0.8, mat(1).trim);
}

function bronzeBallista(ctx: Ctx) {
  // Bronz Balista: uzun kızak, iri yay kolları, kocaman delici ok
  hub(ctx, 1, 9);
  part(ctx, 1, rr(-16, -9, 50, 7, 2.4), [-16, -9, 50, 7], 'alt');
  part(ctx, 1, rr(-4, -4, 14, 8, 2), [-4, -4, 14, 8], 'alt', { lw: 1.3 });
  // burulma yayları
  for (const y of [-14, -1]) shade(ctx, rr(14, y, 7, 6, 2), tone(0xd8c08a, 0x9a8250, 0xf2e2b4), { sh: 1, hl: 0.5, lw: 1.2 });
  // yay kolları
  stroked(ctx, (c) => {
    c.moveTo(17.5, -14);
    c.quadraticCurveTo(13, -24, 6, -27);
  }, 3, css(mat(1).main.base));
  stroked(ctx, (c) => {
    c.moveTo(17.5, 4);
    c.quadraticCurveTo(13, 8, 8, 8.6);
  }, 3, css(mat(1).main.base));
  line(ctx, [6, -27, -6, -5.5, 8, 8.6], 0.8, '#f2e6c8');
  // dev ok
  stroked(ctx, (c) => {
    c.moveTo(-6, -5.5);
    c.lineTo(38, -5.5);
  }, 2, css(0x9a7650), 1.1);
  part(ctx, 1, poly(36, -9.5, 46.5, -5.5, 36, -1.5, 38, -5.5), [36, -9.5, 10.5, 8], 'main', { lw: 1.2 });
  fill(ctx, poly(-6, -5.5, -1, -9.6, 3, -9.6, -1, -5.5), css(0xe8e0c8));
  stroke(ctx, poly(-6, -5.5, -1, -9.6, 3, -9.6, -1, -5.5), 0.9);
  for (const x of [-11, 26]) rivet(ctx, x, -5.5, 1, mat(1).trim);
  part(ctx, 1, rr(28, -10.4, 4, 9.8, 1.2), [28, -10.4, 4, 9.8], 'trim', { lw: 1.1 });
}

function bronzeCauldron(ctx: Ctx) {
  // Ateş Kazanı: boğa başlı dev bronz kazan, ağzından alevler
  hub(ctx, 1, 10);
  part(ctx, 1, rr(-14, -6, 28, 7, 2.4), [-14, -6, 28, 7], 'alt');
  // çatal ayaklar
  for (const [x0, x1] of [[-10, -4], [10, 4]]) {
    line(ctx, [x0, -4, x1, -12], 4.4, OUTC);
    line(ctx, [x0, -4, x1, -12], 2.4, css(mat(1).alt.base));
  }
  ctx.save();
  ctx.translate(2, -18);
  ctx.rotate(-0.45);
  // kazan gövdesi (ağzı ileri-yukarı)
  glow(ctx, 22, 0, 18, 0xff8a20, 0.55);
  const body: Build = (c) => {
    c.moveTo(-14, -6);
    c.quadraticCurveTo(-18, 0, -14, 7);
    c.quadraticCurveTo(-4, 15, 12, 10);
    c.lineTo(18, 9);
    c.lineTo(18, -9);
    c.lineTo(12, -10);
    c.quadraticCurveTo(-4, -15, -14, -6);
    c.closePath();
  };
  part(ctx, 1, body, [-18, -14, 36, 28], 'main', { sh: 3.4 });
  part(ctx, 1, rr(16, -12, 6, 24, 2.4), [16, -12, 6, 24], 'trim', { lw: 1.5 });
  fill(ctx, ell(21.6, 0, 1.8, 9.5), '#3a1404');
  // alevler
  fireTongue(ctx, 24, -2, 9, -0.3);
  fireTongue(ctx, 23, 4, 7, 0.4);
  // kuşaklar, boğa amblemi
  for (const x of [-6, 5]) line(ctx, [x, -13, x, 13], 1, css(mat(1).main.dark));
  part(ctx, 1, circ(-1, 0, 5), [-6, -5, 10, 10], 'trim', { lw: 1.2 });
  for (const s of [-1, 1]) {
    stroked(ctx, (c) => {
      c.moveTo(-1 + s * 3, -3 * s);
      c.quadraticCurveTo(-1 + s * 6, -8 * s, -1 + s * 2, -10 * s);
    }, 1.4, css(mat(1).trim.light), 0.9);
  }
  fill(ctx, circ(-1, 0, 1.6), '#ff7a20');
  ctx.restore();
  // kulplar
  for (const [x, y] of [[-12, -18], [6, -31]]) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTC;
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = css(mat(1).trim.base);
    ctx.stroke();
  }
}

export function fireTongue(ctx: Ctx, x: number, y: number, s: number, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const f: Build = (c) => {
    c.moveTo(0, -s * 0.5);
    c.quadraticCurveTo(s * 0.9, -s * 0.8, s * 1.4, -s * 0.1);
    c.quadraticCurveTo(s * 0.9, -s * 0.2, s * 1.1, s * 0.3);
    c.quadraticCurveTo(s * 0.6, s * 0.25, 0, s * 0.5);
    c.closePath();
  };
  fill(ctx, f, '#ff7a1a');
  stroke(ctx, f, 1, '#7a2a04');
  fill(ctx, ell(s * 0.45, 0, s * 0.45, s * 0.22), '#ffd85a');
  fill(ctx, ell(s * 0.3, 0, s * 0.22, s * 0.12), '#fff8d0');
  ctx.restore();
}

// ── DEMİR ────────────────────────────────────────────────
function ironRifle(ctx: Ctx) {
  // Tüfek Mazgalı: zırhlı kalkan kutusu, ince çift namlu
  hub(ctx, 2, 8);
  stroked(ctx, (c) => {
    c.moveTo(4, -6.5);
    c.lineTo(27, -6.5);
  }, 2, css(mat(2).alt.base), 1.1);
  stroked(ctx, (c) => {
    c.moveTo(4, -2.5);
    c.lineTo(25, -2.5);
  }, 2, css(mat(2).alt.base), 1.1);
  part(ctx, 2, rr(25.5, -8.4, 3.2, 3.8, 0.8), [25.5, -8.4, 3.2, 3.8], 'main', { lw: 1 });
  part(ctx, 2, rr(23.5, -4.4, 3.2, 3.8, 0.8), [23.5, -4.4, 3.2, 3.8], 'main', { lw: 1 });
  const box: Build = rpoly(1.6, -9, -15, 10, -12, 12, -1, 10, 3, -9, 3);
  part(ctx, 2, box, [-9, -15, 21, 18], 'main', { sh: 2.4 });
  fill(ctx, rr(1, -9.6, 10, 2.4, 1), '#0d0e12');
  glow(ctx, 6, -8.4, 4, PAL(2).glow, 0.7);
  for (const [x, y] of [[-6.5, -12], [-6.5, 0], [7.5, -10.4], [7.5, 0.4]]) rivet(ctx, x, y, 0.85, mat(2).main);
  line(ctx, [-8.4, -4.5, 11, -4.5], 0.8, css(mat(2).main.dark));
}

function ironCannon(ctx: Ctx) {
  // Demir Top: klasik dökme top, kundak, kuşaklar
  hub(ctx, 2, 9);
  part(ctx, 0, poly(-12, 0, -9, -10, 10, -10, 13, 0), [-12, -10, 25, 10], 'alt', { grain: 'h' });
  part(ctx, 2, circ(-1, -5, 3.6), [-4.6, -8.6, 7.2, 7.2], 'main', { lw: 1.2 });
  const barrel: Build = (c) => {
    c.moveTo(-12, -16);
    c.quadraticCurveTo(-16, -11, -12, -6);
    c.lineTo(28, -8);
    c.lineTo(28, -15);
    c.closePath();
  };
  part(ctx, 2, barrel, [-16, -16, 44, 10], 'alt', { sh: 2.6 });
  part(ctx, 2, rr(27, -17.4, 7, 12, 2.6), [27, -17.4, 7, 12], 'alt', { lw: 1.5 });
  fill(ctx, ell(33.4, -11.4, 1.3, 4), '#0b0c10');
  for (const x of [-6, 6, 18]) part(ctx, 2, rr(x, -16.8, 3, 11.4, 1.2), [x, -16.8, 3, 11.4], 'trim', { lw: 1.1 });
  part(ctx, 2, circ(-16, -11, 2.6), [-18.6, -13.6, 5.2, 5.2], 'trim', { lw: 1.1 });
}

function ironMortar(ctx: Ctx) {
  // Havan Topu: dik, iri ağızlı havan; ağır perçinli beşik
  hub(ctx, 2, 10);
  part(ctx, 2, rpoly(2, -18, 0, -14, -12, 14, -12, 18, 0), [-18, -12, 36, 12], 'alt', { sh: 2.4 });
  for (const x of [-12, 0, 12]) rivet(ctx, x, -5, 1, mat(2).main);
  ctx.save();
  ctx.translate(-1, -15);
  ctx.rotate(-0.85);
  const barrel: Build = (c) => {
    c.moveTo(-10, -11);
    c.quadraticCurveTo(-17, 0, -10, 11);
    c.lineTo(16, 10);
    c.lineTo(16, -10);
    c.closePath();
  };
  part(ctx, 2, barrel, [-17, -11, 33, 22], 'alt', { sh: 3.4 });
  part(ctx, 2, rr(14, -13, 8, 26, 3), [14, -13, 8, 26], 'alt', { lw: 1.6 });
  fill(ctx, ell(21, 0, 2, 9.4), '#0a0b0e');
  glow(ctx, 21, 0, 6, PAL(2).glow, 0.4);
  for (const x of [-4, 6]) part(ctx, 2, rr(x, -11.6, 3.4, 23.2, 1.2), [x, -11.6, 3.4, 23.2], 'trim', { lw: 1.2 });
  ctx.restore();
  // muylu
  part(ctx, 2, circ(-1, -14, 4.4), [-5.4, -18.4, 8.8, 8.8], 'main', { lw: 1.3 });
  rivet(ctx, -1, -14, 1.2, mat(2).trim);
  // fitil kıvılcımı
  glow(ctx, -13, -21, 4, PAL(2).glow, 0.9, 0xffffff);
  sparkle(ctx, -13, -21, 2.4, '#fff2c0');
}

// ── KRİSTAL ──────────────────────────────────────────────
function crystalSpike(ctx: Ctx) {
  // Kristal Diken: buz kristali demeti, ileri bakan sivri uçlar
  hub(ctx, 3, 8);
  glow(ctx, 10, -8, 13, PAL(3).glow, 0.5);
  part(ctx, 3, rpoly(1, -8, 0, -7, -9, 6, -10, 8, 0), [-8, -10, 16, 10], 'alt');
  const shard = (x: number, y: number, len: number, w: number, rot: number, which: 'main' | 'trim') => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    part(ctx, 3, poly(0, -w, len * 0.75, -w * 0.7, len, 0, len * 0.75, w * 0.7, 0, w), [0, -w, len, w * 2], which, { lw: 1.2 });
    ctx.restore();
  };
  shard(-3, -12, 15, 2.6, -0.35, 'main');
  shard(-2, -7, 25, 3.6, 0, 'trim');
  shard(-3, -3, 14, 2.4, 0.3, 'main');
  sparkle(ctx, 15, -9, 2.2);
  sparkle(ctx, 4, -15, 1.6, '#e8fbff');
}

function crystalPrism(ctx: Ctx) {
  // Prizma Kulesi: arduvaz çatalda büyük prizma + yayıcı mercek
  hub(ctx, 3, 9);
  part(ctx, 3, rpoly(1.6, -12, 0, -8, -8, 10, -8, 14, 0), [-12, -8, 26, 8], 'alt');
  for (const x of [-6, 8]) part(ctx, 3, poly(x - 2, -6, x, -24, x + 2, -6), [x - 2, -24, 4, 18], 'alt', { lw: 1.1 });
  glow(ctx, 2, -17, 16, PAL(3).glow, 0.55);
  part(ctx, 3, rpoly(0.8, -9, -9, 3, -30, 15, -9), [-9, -30, 24, 21], 'main', { sh: 3 });
  // yayıcı
  part(ctx, 3, rr(14, -16, 12, 7, 2), [14, -16, 12, 7], 'alt', { lw: 1.3 });
  part(ctx, 3, ell(27, -12.5, 2.6, 5), [24.4, -17.5, 5.2, 10], 'trim', { lw: 1.2 });
  glow(ctx, 28, -12.5, 7, PAL(3).glow, 0.9, 0xffffff);
  ctx.save();
  ctx.globalAlpha = 0.8;
  for (const [i, col] of ['#ff8a8a', '#ffe48a', '#8affb0', '#8ad8ff'].entries()) line(ctx, [7, -19 + i * 1.2, 15, -14 + i * 0.6], 0.8, col);
  ctx.restore();
  sparkle(ctx, 0, -22, 2.6);
}

function crystalLens(ctx: Ctx) {
  // Işın Merceği: dürbün gövde, dev mercek, kristal kanatçıklar
  hub(ctx, 3, 10);
  part(ctx, 3, rpoly(2, -16, 0, -12, -10, 14, -10, 18, 0), [-16, -10, 34, 10], 'alt');
  ctx.save();
  ctx.translate(2, -18);
  ctx.rotate(-0.12);
  for (const [x, y, h] of [[-10, -9, 10], [-2, -10, 12], [-10, 9, -9], [-2, 10, -10]] as const) {
    const b = poly(x, y, x + 4, y - h, x + 8, y);
    part(ctx, 3, b, [x, Math.min(y, y - h), 8, Math.abs(h)], 'main', { lw: 1.1 });
  }
  const tube: Build = (c) => {
    c.moveTo(-18, -7);
    c.lineTo(24, -11);
    c.lineTo(24, 11);
    c.lineTo(-18, 7);
    c.quadraticCurveTo(-21, 0, -18, -7);
    c.closePath();
  };
  part(ctx, 3, tube, [-21, -11, 45, 22], 'alt', { sh: 3 });
  for (const x of [-8, 6]) part(ctx, 4, rr(x, -10.5, 3.6, 21, 1.2), [x, -10.5, 3.6, 21], 'trim', { lw: 1.2 });
  // mercek
  glow(ctx, 27, 0, 20, PAL(3).glow, 0.6);
  part(ctx, 3, ell(25, 0, 5, 14), [20, -14, 10, 28], 'alt', { lw: 1.6 });
  const lens = ell(27.5, 0, 4.4, 11.8);
  shade(ctx, lens, tone(0xa8f0ff, 0x4fb8e0, 0xffffff), {
    sh: 1.6,
    hl: 1,
    lw: 1.4,
    inner: () => {
      glow(ctx, 27, -3, 9, 0xffffff, 0.95);
      line(ctx, [26, -8, 27.4, -5], 1, 'rgba(255,255,255,0.9)');
    },
  });
  ctx.restore();
  sparkle(ctx, 30, -26, 3);
}

// ── ETER ─────────────────────────────────────────────────
function etherSpark(ctx: Ctx) {
  // Eter Kıvılcımı: iki altın çatal arasında süzülen kıvılcım küresi
  hub(ctx, 4, 8);
  for (const y of [-14, 0]) {
    part(ctx, 4, path((c) => {
      c.moveTo(-4, y - 1.5);
      c.quadraticCurveTo(10, y - 3, 20, y === 0 ? y - 4 : y + 4);
      c.lineTo(19, y === 0 ? y - 1.4 : y + 1.4);
      c.quadraticCurveTo(8, y + 1.5, -4, y + 1.5);
      c.closePath();
    }), [-4, y - 3, 24, 6], 'trim', { lw: 1.2 });
  }
  part(ctx, 4, rr(-8, -16, 6, 18, 2.4), [-8, -16, 6, 18], 'trim', { lw: 1.3 });
  const ox = 14;
  const oy = -7;
  glow(ctx, ox, oy, 13, PAL(4).glow, 0.55);
  glow(ctx, ox, oy, 8, 0x9a6cff, 0.8);
  bolt(ctx, [2, -13, 7, -9, 6, -6, 11, -7]);
  bolt(ctx, [2, -1, 7, -4, 6, -6, 11, -6]);
  tonePart(ctx, tone(0xc0a0ff, 0x7048e0, 0xffffff), circ(ox, oy, 4.6), [ox - 4.6, oy - 4.6, 9.2, 9.2], { lw: 1.2 });
  glow(ctx, ox - 1, oy - 1, 3.4, 0xffffff, 1);
  sparkle(ctx, ox + 7, oy - 6, 2, '#fff3c0');
}

function bolt(ctx: Ctx, pts: number[], color = 0xfff3a0) {
  line(ctx, pts, 2.6, css(0x9a6cff, 0.5));
  line(ctx, pts, 1.1, css(color));
}

function etherCrystal(ctx: Ctx) {
  // Eter Kristali: altın halkalı, süzülen mor kristal
  hub(ctx, 4, 9);
  part(ctx, 4, path((c) => {
    c.moveTo(-6, -1);
    c.quadraticCurveTo(0, -9, 6, -1);
    c.lineTo(3, 0);
    c.quadraticCurveTo(0, -4, -3, 0);
    c.closePath();
  }), [-6, -9, 12, 9], 'trim', { lw: 1.1 });
  const cx = 6;
  const cy = -20;
  glow(ctx, cx, cy, 20, PAL(4).glow, 0.4);
  glow(ctx, cx, cy, 12, 0x9a6cff, 0.7);
  ring(ctx, cx, cy, 16, 5, -0.25, false);
  const gem = rpoly(0.8, cx - 9, cy, cx, cy - 13, cx + 13, cy, cx, cy + 12);
  part(ctx, 4, gem, [cx - 9, cy - 13, 22, 25], 'main', { sh: 3, inner: () => crystalFacets(ctx, [cx - 9, cy - 13, 22, 25], 0.5) });
  ring(ctx, cx, cy, 16, 5, -0.25, true);
  bolt(ctx, [cx + 13, cy, cx + 18, cy - 3, cx + 17, cy + 1, cx + 23, cy - 1]);
  sparkle(ctx, cx - 3, cy - 6, 2.6);
  sparkle(ctx, cx - 14, cy - 8, 1.8, '#fff3c0');
}

function ring(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number, front: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  if (front) ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
  else ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = OUTC;
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = css(front ? mat(4).trim.light : mat(4).trim.base);
  ctx.stroke();
  ctx.restore();
}

function etherStar(ctx: Ctx) {
  // Yıldız Çekirdeği: altın kafeste yıldız çekirdeği, geniş fırlatma ağzı
  hub(ctx, 4, 10);
  part(ctx, 4, rpoly(2, -16, 0, -12, -9, 12, -9, 16, 0), [-16, -9, 32, 9], 'alt');
  ctx.save();
  ctx.translate(0, -20);
  ctx.rotate(-0.3);
  // fırlatma ağzı
  const mouth: Build = (c) => {
    c.moveTo(4, -9);
    c.lineTo(26, -13);
    c.lineTo(26, 13);
    c.lineTo(4, 9);
    c.closePath();
  };
  part(ctx, 4, mouth, [4, -13, 22, 26], 'alt', { sh: 3 });
  part(ctx, 4, rr(24, -15, 6, 30, 2.4), [24, -15, 6, 30], 'trim', { lw: 1.5 });
  fill(ctx, ell(29, 0, 1.8, 11.5), '#2a1260');
  glow(ctx, 29, 0, 10, PAL(4).glow, 0.6);
  for (const x of [12, 19]) line(ctx, [x, -11, x, 11], 1.1, css(mat(4).trim.dark));
  ctx.restore();
  // yıldız çekirdeği
  const cx = -4;
  const cy = -22;
  glow(ctx, cx, cy, 22, PAL(4).glow, 0.55);
  ring(ctx, cx, cy, 14, 14, 0, false);
  ring(ctx, cx, cy, 14, 5, 0.5, false);
  star(ctx, cx, cy, 9.5, 4.6, 0xfff1a8);
  glow(ctx, cx, cy, 6, 0xffffff, 1);
  ring(ctx, cx, cy, 14, 5, 0.5, true);
  ring(ctx, cx, cy, 14, 14, 0, true);
  for (const [x, y] of [[cx - 15, cy - 13], [cx + 14, cy - 14], [cx - 17, cy + 8]]) sparkle(ctx, x, y, 2.2, '#fff3c0');
}

export function star(ctx: Ctx, x: number, y: number, ro: number, ri: number, color: number, pts = 5) {
  const b: Build = (c) => {
    for (let i = 0; i < pts * 2; i++) {
      const r = i % 2 ? ri : ro;
      const a = -Math.PI / 2 + (i * Math.PI) / pts;
      if (i === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  };
  shade(ctx, b, tone(color, darken(color, 0.3), lighten(color, 0.6)), { sh: ro * 0.2, hl: 0.8, lw: 1.3 });
}

const DRAW: ((ctx: Ctx) => void)[][] = [
  [woodArrow, woodPinecone, woodCatapult],
  [bronzeBow, bronzeBallista, bronzeCauldron],
  [ironRifle, ironCannon, ironMortar],
  [crystalSpike, crystalPrism, crystalLens],
  [etherSpark, etherCrystal, etherStar],
];

void inside;
void sparkle;
void ell;
