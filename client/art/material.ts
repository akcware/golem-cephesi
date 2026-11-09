// Kademe malzemeleri: her kademenin üç tonu ve yüzey dokusu (ahşap damarı, metal parlaması, kristal yüzeyleri, eter ışıması).
import {
  type Build,
  type Ctx,
  type Tone,
  clipTo,
  css,
  darken,
  fill,
  lighten,
  line,
  poly,
  rng,
  shade,
  sparkle,
  tone,
} from './canvas';
import { TEAM, type Team } from './layout';

export type Which = 'main' | 'alt' | 'trim';
export interface Mat {
  main: Tone;
  alt: Tone;
  trim: Tone;
}

const MATS: Mat[] = [
  // Ahşap: meşe gövde, koyu kabuk, yosun
  { main: tone(0x9a6a40, 0x5e3c20, 0xc4965f), alt: tone(0x6e4a2e, 0x452c18, 0x94683e), trim: tone(0x6db04a, 0x3d7a31, 0xaee072) },
  // Bronz: sıcak parlak bronz, koyu bronz, altın
  { main: tone(0xdf8f34, 0x8c4610, 0xffd88a), alt: tone(0x9a5016, 0x5c2a08, 0xd27e30), trim: tone(0xf6cc50, 0xa86e14, 0xfff4c0) },
  // Demir: çelik, koyu demir, deri/pirinç
  { main: tone(0x9ba4ae, 0x5c636d, 0xe0e6ec), alt: tone(0x59606a, 0x363b42, 0x87909a), trim: tone(0xb98546, 0x6e4a24, 0xe6bc80) },
  // Kristal: camgöbeği kristal, arduvaz taş, buz beyazı
  { main: tone(0x5ccfe6, 0x2380a2, 0xd4f8ff), alt: tone(0x4a5a72, 0x2c374a, 0x7889a4), trim: tone(0xbaf3ff, 0x5ab8d8, 0xffffff) },
  // Eter: mor öz, soluk mermer, altın
  { main: tone(0xa07aff, 0x5a36c0, 0xe8dcff), alt: tone(0xeae2ff, 0xa898e0, 0xffffff), trim: tone(0xf6c84c, 0xb0761c, 0xfff4b4) },
];

export const mat = (t: number): Mat => MATS[t];

export const teamTone = (team: Team): Tone => {
  const T = TEAM[team];
  return tone(T, darken(T, 0.42), lighten(T, 0.4));
};

export type Box = [number, number, number, number];

const dimTone = (tn: Tone, d: number): Tone => ({ base: darken(tn.base, d), dark: darken(tn.dark, d), light: darken(tn.light, d) });

export interface PartOpts {
  sh?: number;
  hl?: number;
  lw?: number;
  /** koyulaştırma (arka uzuvlar için) */
  dim?: number;
  /** yüzey dokusu yerine / ek olarak iç detay */
  inner?: () => void;
  /** yüzey dokusunu atla */
  plain?: boolean;
  /** damar yönü: 'v' dikey, 'h' yatay */
  grain?: 'v' | 'h';
  seed?: number;
}

/** Kademe malzemesiyle boyanmış, gölgeli, dış çizgili parça. */
export function part(ctx: Ctx, t: number, b: Build, box: Box, which: Which = 'main', o: PartOpts = {}) {
  let tn = MATS[t][which];
  if (o.dim) tn = dimTone(tn, o.dim);
  const m = Math.min(box[2], box[3]);
  shade(ctx, b, tn, {
    sh: o.sh ?? Math.max(1, Math.min(3.2, m * 0.2)),
    hl: o.hl ?? (m < 6 ? 0.6 : 0.9),
    lw: o.lw ?? 1.5,
    inner: () => {
      if (!o.plain) surface(ctx, t, which, box, o);
      o.inner?.();
    },
  });
}

/** Düz bir tonla gölgeli parça (takım kumaşı vb.). */
export function tonePart(ctx: Ctx, tn: Tone, b: Build, box: Box, o: { sh?: number; hl?: number; lw?: number; inner?: () => void } = {}) {
  const m = Math.min(box[2], box[3]);
  shade(ctx, b, tn, { sh: o.sh ?? Math.max(1, Math.min(3, m * 0.22)), hl: o.hl ?? 0.8, lw: o.lw ?? 1.5, inner: o.inner });
}

/** Malzemenin yüzey dokusu (parçanın kırpma alanı içinde çağrılır). */
export function surface(ctx: Ctx, t: number, which: Which, box: Box, o: PartOpts = {}) {
  const [x, y, w, h] = box;
  const tn = MATS[t][which];
  const R = rng(o.seed ?? Math.round(x * 31 + y * 17 + w * 7 + h * 3 + t * 101));
  switch (t) {
    case 0: {
      if (which === 'trim') {
        // yosun: açık benekler
        for (let i = 0; i < Math.max(2, (w * h) / 18); i++) {
          fill(ctx, (c) => c.arc(x + R.next() * w, y + R.next() * h, 0.5 + R.next() * 0.8, 0, Math.PI * 2), css(tn.light, 0.7));
        }
        return;
      }
      // ahşap damarı
      const vert = (o.grain ?? (h >= w ? 'v' : 'h')) === 'v';
      const n = Math.max(2, Math.round((vert ? w : h) / 3.2));
      ctx.lineWidth = 0.55;
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5 + (R.next() - 0.5) * 0.6) / n;
        ctx.strokeStyle = css(tn.dark, 0.45 + R.next() * 0.25);
        ctx.beginPath();
        if (vert) {
          const gx = x + f * w;
          ctx.moveTo(gx, y - 1);
          ctx.bezierCurveTo(gx + (R.next() - 0.5) * 2.2, y + h * 0.33, gx + (R.next() - 0.5) * 2.2, y + h * 0.66, gx + (R.next() - 0.5) * 1.5, y + h + 1);
        } else {
          const gy = y + f * h;
          ctx.moveTo(x - 1, gy);
          ctx.bezierCurveTo(x + w * 0.33, gy + (R.next() - 0.5) * 2.2, x + w * 0.66, gy + (R.next() - 0.5) * 2.2, x + w + 1, gy + (R.next() - 0.5) * 1.5);
        }
        ctx.stroke();
      }
      if (w * h > 60 && R.next() < 0.8) {
        // budak
        const kx = x + w * (0.3 + R.next() * 0.4);
        const ky = y + h * (0.3 + R.next() * 0.4);
        ctx.strokeStyle = css(tn.dark, 0.7);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.ellipse(kx, ky, 1.6, 1, 0, 0, Math.PI * 2);
        ctx.stroke();
        fill(ctx, (c) => c.ellipse(kx, ky, 0.7, 0.45, 0, 0, Math.PI * 2), css(tn.dark, 0.8));
      }
      return;
    }
    case 1: {
      // bronz: ayna gibi parlak metal — sıcak ışık lekesi, keskin beyaz şerit, altta koyu yansıma
      const g = ctx.createRadialGradient(x + w * 0.3, y + h * 0.22, 0, x + w * 0.3, y + h * 0.22, Math.max(w, h) * 0.6);
      g.addColorStop(0, 'rgba(255,246,214,0.55)');
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      const sx = x + w * 0.24;
      const bw = Math.max(0.9, w * 0.12);
      fill(ctx, poly(sx, y - 1, sx + bw, y - 1, sx + bw - w * 0.1, y + h + 1, sx - w * 0.1, y + h + 1), css(0xffffff, which === 'alt' ? 0.22 : 0.5));
      fill(ctx, poly(sx + bw * 1.7, y - 1, sx + bw * 2.1, y - 1, sx + bw * 2.1 - w * 0.1, y + h + 1, sx + bw * 1.7 - w * 0.1, y + h + 1), css(0xffffff, 0.25));
      const d = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
      d.addColorStop(0, 'rgba(70,25,0,0)');
      d.addColorStop(1, 'rgba(70,25,0,0.28)');
      ctx.fillStyle = d;
      ctx.fillRect(x - 1, y, w + 2, h + 1);
      return;
    }
    case 2: {
      // demir: üstte soğuk parlama, ince fırça izleri
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, 'rgba(235,245,255,0.32)');
      g.addColorStop(0.35, 'rgba(235,245,255,0)');
      g.addColorStop(1, 'rgba(0,0,10,0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      if (which !== 'trim' && w > 6) {
        ctx.lineWidth = 0.35;
        ctx.strokeStyle = css(0xffffff, 0.12);
        for (let i = 1; i < 4; i++) line(ctx, [x + w * 0.15, y + (h * i) / 4, x + w * 0.55, y + (h * i) / 4], 0.35, css(0xffffff, 0.12));
      }
      return;
    }
    case 3: {
      if (which === 'alt') {
        // taş: benekler
        for (let i = 0; i < (w * h) / 14; i++) fill(ctx, (c) => c.arc(x + R.next() * w, y + R.next() * h, 0.35 + R.next() * 0.5, 0, Math.PI * 2), css(tn.light, 0.35));
        return;
      }
      crystalFacets(ctx, box, R.next());
      return;
    }
    default: {
      if (which === 'trim') {
        const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
        g.addColorStop(0, 'rgba(255,255,230,0.45)');
        g.addColorStop(0.5, 'rgba(255,255,230,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        return;
      }
      // eter: içten ışıma + yıldız tozu
      const r = Math.max(w, h) * 0.7;
      const g = ctx.createRadialGradient(x + w * 0.35, y + h * 0.3, 0, x + w * 0.35, y + h * 0.3, r);
      g.addColorStop(0, 'rgba(255,255,255,0.5)');
      g.addColorStop(0.5, 'rgba(255,240,255,0.08)');
      g.addColorStop(1, 'rgba(80,40,200,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      if (which === 'main') {
        for (let i = 0; i < Math.max(1, (w * h) / 70); i++) sparkle(ctx, x + R.next() * w, y + R.next() * h, 0.7 + R.next() * 0.9, '#fff6d0', 0.8);
      }
    }
  }
}

/** Kristal yüzeyleri: bir iç noktadan köşelere açılan, açık/koyu yüzler. */
export function crystalFacets(ctx: Ctx, box: Box, jitter = 0.5) {
  const [x, y, w, h] = box;
  const px = x + w * (0.36 + jitter * 0.12);
  const py = y + h * (0.34 + jitter * 0.1);
  fill(ctx, poly(x - 1, y - 1, x + w + 1, y - 1, px, py), 'rgba(255,255,255,0.42)');
  fill(ctx, poly(x - 1, y - 1, x - 1, y + h + 1, px, py), 'rgba(255,255,255,0.18)');
  fill(ctx, poly(x + w + 1, y - 1, x + w + 1, y + h + 1, px, py), 'rgba(0,30,60,0.16)');
  fill(ctx, poly(x - 1, y + h + 1, x + w + 1, y + h + 1, px, py), 'rgba(0,30,60,0.3)');
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(x, y);
  ctx.moveTo(px, py);
  ctx.lineTo(x + w, y);
  ctx.moveTo(px, py);
  ctx.lineTo(x + w * 0.2, y + h);
  ctx.stroke();
  sparkle(ctx, x + w * 0.28, y + h * 0.2, Math.max(1, Math.min(w, h) * 0.18), '#ffffff', 0.95);
}

/** Bir şeklin içine kırpılmış takım rengi kumaş (kuşak, önlük). */
export function cloth(ctx: Ctx, team: Team, b: Build, box: Box, o: { lw?: number; stripe?: boolean } = {}) {
  const tn = teamTone(team);
  shade(ctx, b, tn, {
    sh: Math.max(1, Math.min(2.4, Math.min(box[2], box[3]) * 0.25)),
    hl: 0.7,
    lw: o.lw ?? 1.4,
    inner: () => {
      if (o.stripe !== false) {
        // kumaş kıvrımları
        const [x, y, w, h] = box;
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = css(tn.dark, 0.55);
        ctx.beginPath();
        for (let i = 1; i < 3; i++) {
          ctx.moveTo(x + (w * i) / 3, y);
          ctx.lineTo(x + (w * i) / 3 - w * 0.08, y + h);
        }
        ctx.stroke();
      }
    },
  });
}

/** Kırpılmış alan içine ek boyama. */
export function inside(ctx: Ctx, b: Build, fn: () => void) {
  clipTo(ctx, b, fn);
}
