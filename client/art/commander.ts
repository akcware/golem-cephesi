// Komutan ekleri (yakın dövüş golem gövdesinin üstüne): sırttaki pelerin ve başındaki taç. Ayrıca Eter Kaynağı.
// Kap koordinatı: x ileri, y yukarı negatif, zemin y=0 (bkz. layout.ts). Her doku kendi tuvaline çizilir;
// CAPE_BOX / CROWN_BOX, sahnede doğru yere oturtmak için tuvalin kap koordinatındaki yerini verir.
import * as B from '../../shared/balance';
import { type Ctx, OUTC, circ, css, darken, ell, fill, glow, lighten, line, makeCanvas, path, poly, rr, shade, sparkle, stroke, tone } from './canvas';
import { ART_SCALE, TEAM, type Team } from './layout';
import { crystalFacets, mat, teamTone } from './material';
import { leaf } from './units';

const PAL = (t: number) => B.TIERS[t].palette;

/** Tuvalin kap koordinatındaki sol-üst köşesi ve boyutu: [x, y, w, h]. */
export const CAPE_BOX = [-26, -50, 36, 40] as const;
export const CROWN_BOX = [-10, -74, 26, 22] as const;

function canvasAt(box: readonly [number, number, number, number], draw: (ctx: Ctx) => void): HTMLCanvasElement {
  const [x, y, w, h] = box;
  const { c, ctx } = makeCanvas(w, h, ART_SCALE);
  ctx.translate(-x, -y);
  draw(ctx);
  return c;
}

/** Sırttan arkaya dalgalanan takım renkli pelerin (kademe rengiyle işlenmiş kenar). */
export function drawCape(t: number, team: Team): HTMLCanvasElement {
  return canvasAt(CAPE_BOX, (ctx) => {
    const tn = teamTone(team);
    const cape = path((c) => {
      c.moveTo(-6, -45);
      c.quadraticCurveTo(-14, -42, -19, -30);
      c.quadraticCurveTo(-23, -21, -24, -13);
      c.quadraticCurveTo(-19, -16, -16, -13);
      c.quadraticCurveTo(-13, -17, -9, -14);
      c.quadraticCurveTo(-6, -18, -2, -16);
      c.quadraticCurveTo(-3, -30, 3, -44);
      c.closePath();
    });
    shade(ctx, cape, tn, { sh: 2.6, hl: 1, lw: 1.6 });
    // kıvrımlar
    line(ctx, [-9, -40, -15, -18], 0.7, css(tn.dark, 0.8));
    line(ctx, [-4, -40, -8, -17], 0.7, css(tn.dark, 0.8));
    // kademe renginde işlemeli kenar
    const trim = mat(t).trim;
    stroke(ctx, (c) => {
      c.moveTo(-24, -13);
      c.quadraticCurveTo(-19, -16, -16, -13);
      c.quadraticCurveTo(-13, -17, -9, -14);
      c.quadraticCurveTo(-6, -18, -2, -16);
    }, 1.6, css(trim.base));
    // omuz tokası
    fill(ctx, circ(-3, -43, 2.6), css(trim.base));
    stroke(ctx, circ(-3, -43, 2.6), 1);
    fill(ctx, circ(-3.6, -43.6, 1), css(lighten(trim.light, 0.3)));
  });
}

/** Kademeye göre taç: ahşapta yaprak çelenk, bronzda sivri taç, demirde dikenli taç, kristalde taç-kristaller, eterde ışık halkası. */
export function drawCrown(t: number): HTMLCanvasElement {
  return canvasAt(CROWN_BOX, (ctx) => {
    const m = mat(t);
    const cx = 2;
    const base = -57;
    switch (t) {
      case 0: {
        // yaprak çelengi + ortada kırmızı yemiş
        for (let i = 0; i < 7; i++) {
          const a = Math.PI + (i / 6) * Math.PI;
          leaf(ctx, cx + Math.cos(a) * 8, base + 1 + Math.sin(a) * 2.2, 5.2, 2.2, a + Math.PI / 2 + (i < 3 ? -0.6 : 0.6));
        }
        fill(ctx, circ(cx, base - 3.5, 2), '#e0483a');
        stroke(ctx, circ(cx, base - 3.5, 2), 0.9);
        fill(ctx, circ(cx - 0.6, base - 4.1, 0.6), '#ffd0c8');
        break;
      }
      case 1:
      case 2: {
        // metal taç: bant + sivri uçlar (demirde daha çok, keskin)
        const n = t === 1 ? 3 : 5;
        const pts: number[] = [cx - 8, base + 1];
        for (let i = 0; i < n; i++) {
          const x0 = cx - 8 + (16 / n) * i;
          const x1 = x0 + 16 / n;
          pts.push(x0 + (x1 - x0) / 2, base - (t === 1 ? 9 : 8) + (i % 2 === 0 && t === 2 ? -1.5 : 0), x1, base - 3);
        }
        pts.push(cx + 8, base + 1);
        shade(ctx, poly(...pts), t === 1 ? m.trim : m.main, { sh: 1.4, hl: 0.6, lw: 1.3 });
        shade(ctx, rr(cx - 8.6, base - 3.4, 17.2, 4.6, 1.4), t === 1 ? m.main : m.trim, { sh: 1, hl: 0.5, lw: 1.2 });
        // taşlar
        const gem = t === 1 ? 0xe0483a : 0x3d8bff;
        for (const dx of [-4.5, 0, 4.5]) {
          fill(ctx, ell(cx + dx, base - 1.1, 1.3, 1.1), css(gem));
          fill(ctx, circ(cx + dx - 0.4, base - 1.5, 0.45), '#ffffff');
        }
        break;
      }
      case 3: {
        // kristal taç: yükselen kristal sivriler
        const C = mat(3);
        glow(ctx, cx, base - 6, 11, PAL(3).glow, 0.4);
        const shards: [number, number, number][] = [
          [-6, 7, -0.35],
          [-3, 10, -0.15],
          [0.5, 13, 0],
          [4, 10, 0.15],
          [7, 7, 0.35],
        ];
        for (const [dx, hgt, a] of shards) {
          ctx.save();
          ctx.translate(cx + dx, base);
          ctx.rotate(a);
          const w = 1.9;
          const b = poly(-w, 0, -w, -hgt * 0.7, 0, -hgt, w, -hgt * 0.7, w, 0);
          shade(ctx, b, hgt > 11 ? C.trim : C.main, { sh: 1, hl: 0.5, lw: 1, inner: () => crystalFacets(ctx, [-w, -hgt, w * 2, hgt], 0.4) });
          ctx.restore();
        }
        shade(ctx, rr(cx - 8.5, base - 1.6, 17, 3.2, 1.2), C.alt, { sh: 0.8, hl: 0.4, lw: 1.1 });
        sparkle(ctx, cx + 0.5, base - 14, 2.4, '#ffffff');
        break;
      }
      default: {
        // eter: başın üstünde süzülen altın ışık tacı
        const gold = mat(4).trim;
        glow(ctx, cx, base - 6, 13, PAL(4).glow, 0.5);
        ctx.save();
        ctx.translate(cx, base - 6);
        for (let i = 0; i < 6; i++) {
          ctx.save();
          ctx.rotate((i / 6) * Math.PI * 2);
          fill(ctx, poly(0, -9.5, 1.6, -6, -1.6, -6), css(gold.light));
          stroke(ctx, poly(0, -9.5, 1.6, -6, -1.6, -6), 0.7, css(darken(gold.dark, 0.2)));
          ctx.restore();
        }
        ctx.restore();
        stroke(ctx, ell(cx, base - 6, 7.5, 2.4), 2.6, css(darken(gold.dark, 0.3)));
        stroke(ctx, ell(cx, base - 6, 7.5, 2.4), 1.4, css(lighten(gold.light, 0.2)));
        sparkle(ctx, cx + 6, base - 11, 2.2, '#fff4c8');
      }
    }
  });
}

/** Eter Kaynağı: taş kaide üstünde süzülen, parlayan büyük kristal. Beyaz-mor çizilir; sahnede türüne göre renklenir. */
export const SOURCE_W = 76;
export const SOURCE_H = 110;
export function drawSource(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(SOURCE_W, SOURCE_H, ART_SCALE);
  const cx = SOURCE_W / 2;
  const gy = SOURCE_H - 6;
  // kaide
  const stone = tone(0x8a8f9c, 0x545866, 0xc0c4ce);
  shade(ctx, poly(cx - 26, gy, cx - 20, gy - 12, cx + 20, gy - 12, cx + 26, gy), stone, { sh: 2, hl: 0.8, lw: 1.6 });
  shade(ctx, rr(cx - 17, gy - 19, 34, 8, 2.5), stone, { sh: 1.6, hl: 0.7, lw: 1.5 });
  for (const dx of [-11, 0, 11]) fill(ctx, rr(cx + dx - 2.5, gy - 17, 5, 4, 1), css(0xe6dcff, 0.9));
  // süzülen kristal
  glow(ctx, cx, gy - 55, 34, 0xd8c8ff, 0.55, 0xffffff);
  const cr = poly(cx, gy - 92, cx + 13, gy - 62, cx + 7, gy - 34, cx - 7, gy - 34, cx - 13, gy - 62);
  shade(ctx, cr, tone(0xe8e0ff, 0xa898e0, 0xffffff), {
    sh: 3,
    hl: 1.2,
    lw: 1.8,
    inner: () => crystalFacets(ctx, [cx - 13, gy - 92, 26, 58], 0.5),
  });
  line(ctx, [cx, gy - 90, cx, gy - 36], 0.8, css(0xffffff, 0.8));
  // küçük yörünge kristalleri
  for (const [dx, dy, s] of [
    [-20, -70, 1],
    [19, -52, 0.8],
  ] as const) {
    const b = poly(cx + dx, gy + dy - 7 * s, cx + dx + 4 * s, gy + dy, cx + dx, gy + dy + 7 * s, cx + dx - 4 * s, gy + dy);
    shade(ctx, b, tone(0xe8e0ff, 0xa898e0, 0xffffff), { sh: 1, hl: 0.5, lw: 1.1 });
  }
  sparkle(ctx, cx + 6, gy - 80, 3.2, '#ffffff');
  sparkle(ctx, cx - 9, gy - 48, 2.2, '#ffffff', 0.8);
  void OUTC;
  void TEAM;
  return c;
}
