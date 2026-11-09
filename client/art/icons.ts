// Çağ kartı ve Eter Kaynağı simgeleri (oyunun hücre gölgeli üslubunda, koddan çizilir).
// Web'de bu yerlerde emoji kullanılıyor; mobil sürüm emoji gösteremediği için bu simgeleri kullanır
// (tools/bake-mobile.ts PNG'ye döker). Tuval 64×64 birim, ART_SCALE katı çözünürlükte.
import {
  type Build,
  type Ctx,
  OUTC,
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
  rr,
  shade,
  sparkle,
  stroke,
  tone,
} from './canvas';
import { ART_SCALE } from './layout';
import { star } from './turrets';

const S = 64;
const GOLD = tone(0xf2b632, 0xa8700e, 0xffe58a);
const STEEL = tone(0x9aa3ad, 0x5a616b, 0xe2e8ee);
const WOOD = tone(0x9a6a40, 0x5e3c20, 0xc4965f);

function heart(cx: number, cy: number, s: number): Build {
  return path((c) => {
    c.moveTo(cx, cy + s * 0.9);
    c.bezierCurveTo(cx - s * 1.25, cy + s * 0.05, cx - s * 0.95, cy - s * 0.95, cx, cy - s * 0.35);
    c.bezierCurveTo(cx + s * 0.95, cy - s * 0.95, cx + s * 1.25, cy + s * 0.05, cx, cy + s * 0.9);
    c.closePath();
  });
}

function coin(ctx: Ctx, x: number, y: number, r: number) {
  shade(ctx, circ(x, y, r), GOLD, { sh: r * 0.25, hl: r * 0.15, lw: 1.6 });
  stroke(ctx, circ(x, y, r * 0.6), 1.2, css(GOLD.dark, 0.8));
}

const DRAW: Record<string, (ctx: Ctx) => void> = {
  // Döküm Ustalığı: örs ve çekiç
  foundry(ctx) {
    shade(ctx, poly(8, 30, 50, 30, 46, 38, 38, 38, 38, 46, 46, 54, 18, 54, 26, 46, 26, 38, 14, 38, 4, 32), STEEL, { sh: 3, hl: 1.2 });
    shade(ctx, poly(30, 6, 42, 18, 37, 23, 25, 11), STEEL, { sh: 2 });
    shade(ctx, poly(36, 17, 40, 21, 26, 35, 22, 31), WOOD, { sh: 1.5, hl: 0.6 });
    sparkle(ctx, 50, 22, 5, '#ffd27a');
    sparkle(ctx, 56, 30, 3, '#fff1a8');
  },
  // Hafif Alaşım: tüy
  alloy(ctx) {
    const t = tone(0x8fd0f2, 0x3f86b8, 0xe6f7ff);
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(-0.75);
    shade(ctx, ell(0, -2, 10, 26), t, { sh: 3, hl: 1.2 });
    line(ctx, [0, 26, 0, -24], 2, css(t.dark));
    for (let i = -16; i <= 14; i += 7) {
      line(ctx, [0, i, -8, i - 6], 1.2, css(t.dark, 0.7));
      line(ctx, [0, i, 8, i - 6], 1.2, css(t.dark, 0.7));
    }
    ctx.restore();
  },
  // Diri Çekirdek: yeşil kalp
  vital(ctx) {
    glow(ctx, 32, 32, 26, 0x8dff9a, 0.35);
    shade(ctx, heart(32, 32, 20), tone(0x4fcf62, 0x23843a, 0xb6ffbe), { sh: 3.5, hl: 1.4 });
    sparkle(ctx, 24, 24, 4, '#ffffff', 0.9);
  },
  // Savaş Narası: boru
  warcry(ctx) {
    const b = path((c) => {
      c.moveTo(8, 38);
      c.quadraticCurveTo(20, 30, 40, 18);
      c.lineTo(56, 8);
      c.lineTo(58, 34);
      c.lineTo(42, 30);
      c.quadraticCurveTo(22, 40, 10, 44);
      c.closePath();
    });
    shade(ctx, b, GOLD, { sh: 2.5, hl: 1 });
    shade(ctx, ell(57, 21, 4, 13.5, -0.25), tone(0xb87a16, 0x6e4408, 0xf2c060), { sh: 1, hl: 0.6 });
    shade(ctx, rr(5, 36, 7, 10, 2), WOOD, { sh: 1, hl: 0.5 });
    for (const [x, y, r] of [[18, 54, 3], [30, 52, 2.5], [44, 50, 2]] as const) stroke(ctx, circ(x, y, r), 1.4, css(0xffffff, 0.8));
  },
  // Keskin Nişan: hedef tahtası ve ok
  marksman(ctx) {
    const red = tone(0xe04848, 0x922020, 0xff9a9a);
    shade(ctx, circ(30, 34, 24), red, { sh: 3, hl: 1 });
    fill(ctx, circ(30, 34, 17), '#f6f1e4');
    fill(ctx, circ(30, 34, 11), css(red.base));
    fill(ctx, circ(30, 34, 5), '#f6f1e4');
    stroke(ctx, circ(30, 34, 24), 1.6);
    line(ctx, [31, 33, 58, 6], 3, css(WOOD.dark));
    line(ctx, [31, 33, 58, 6], 1.6, css(WOOD.light));
    fill(ctx, poly(54, 4, 62, 2, 60, 10), css(0xffffff));
    stroke(ctx, poly(54, 4, 62, 2, 60, 10), 1.2);
  },
  // Ganimet Simyası: altın kesesi
  loot(ctx) {
    const sack = tone(0xb08452, 0x6e4c28, 0xe0bc8a);
    const b = path((c) => {
      c.moveTo(24, 22);
      c.bezierCurveTo(4, 30, 6, 58, 32, 58);
      c.bezierCurveTo(58, 58, 60, 30, 40, 22);
      c.closePath();
    });
    shade(ctx, b, sack, { sh: 3.5, hl: 1.2 });
    shade(ctx, poly(22, 10, 42, 10, 38, 22, 26, 22), sack, { sh: 1.5 });
    line(ctx, [22, 22, 42, 22], 3, css(0x8a2f2f));
    coin(ctx, 32, 42, 9);
    coin(ctx, 46, 52, 6);
  },
  // Altın Damarı: kazma ve külçe
  vein(ctx) {
    line(ctx, [14, 56, 44, 16], 6, OUTC);
    line(ctx, [14, 56, 44, 16], 3.6, css(WOOD.base));
    const head = path((c) => {
      c.moveTo(22, 10);
      c.quadraticCurveTo(44, 4, 58, 26);
      c.lineTo(54, 28);
      c.quadraticCurveTo(44, 14, 24, 15);
      c.closePath();
    });
    shade(ctx, head, STEEL, { sh: 1.8, hl: 0.8 });
    shade(ctx, poly(36, 44, 50, 38, 60, 46, 56, 58, 40, 58), GOLD, { sh: 2.5, hl: 1 });
    sparkle(ctx, 48, 44, 4, '#ffffff');
  },
  // Bilgelik Taşı: parşömen
  wisdom(ctx) {
    const paper = tone(0xf0dfb4, 0xb89a62, 0xfff6dc);
    shade(ctx, rr(12, 14, 40, 38, 3), paper, { sh: 2.5, hl: 1 });
    shade(ctx, rr(8, 8, 48, 9, 4.5), tone(0xd8c08a, 0x9a7a42, 0xf4e2b8), { sh: 1.5, hl: 0.6 });
    shade(ctx, rr(8, 48, 48, 9, 4.5), tone(0xd8c08a, 0x9a7a42, 0xf4e2b8), { sh: 1.5, hl: 0.6 });
    for (let y = 24; y <= 42; y += 6) line(ctx, [18, y, 46 - (y % 12), y], 1.6, css(0x6e5430, 0.8));
    glow(ctx, 46, 40, 8, 0x9ef0ff, 0.7);
    star(ctx, 46, 40, 5, 2.2, 0xc4f6ff);
  },
  // Seken Atış: seken ok
  ricochet(ctx) {
    line(ctx, [6, 48, 28, 14, 56, 40], 6, OUTC);
    line(ctx, [6, 48, 28, 14, 56, 40], 3.4, css(0xffd27a));
    fill(ctx, poly(50, 30, 62, 46, 46, 46), css(0xffd27a));
    stroke(ctx, poly(50, 30, 62, 46, 46, 46), 1.4);
    star(ctx, 28, 13, 9, 3.5, 0xfff1a8, 6);
    fill(ctx, circ(8, 50, 4), css(darken(0xffd27a, 0.3)));
  },
  // Gözcü Merceği: büyüteç
  lens(ctx) {
    line(ctx, [38, 38, 58, 58], 9, OUTC);
    line(ctx, [38, 38, 58, 58], 6, css(WOOD.base));
    shade(ctx, circ(26, 26, 18), GOLD, { sh: 2, hl: 1 });
    fill(ctx, circ(26, 26, 13), css(0x9ad8f0));
    fill(ctx, ell(21, 21, 5, 3, -0.6), 'rgba(255,255,255,0.75)');
    stroke(ctx, circ(26, 26, 13), 1.2, css(GOLD.dark));
  },
  // Taş Örgü: tuğla duvar (sıralar kaydırmalı)
  masonry(ctx) {
    const brick = tone(0xc0684a, 0x7a3a26, 0xe89a78);
    for (let r = 0; r < 4; r++) {
      const y = 12 + r * 11;
      for (let x = r % 2 ? -3 : 6; x < 58; x += 17) {
        const x0 = Math.max(6, x);
        const x1 = Math.min(58, x + 15);
        if (x1 - x0 > 4) shade(ctx, rr(x0, y, x1 - x0, 9, 1.5), brick, { sh: 1.4, hl: 0.6, lw: 1.2 });
      }
    }
  },
  // Sur Tahkimi: kule
  rampart(ctx) {
    const stone = tone(0xb4ad9e, 0x6f695c, 0xe2dccd);
    shade(ctx, poly(14, 20, 50, 20, 50, 58, 14, 58), stone, { sh: 3, hl: 1.2 });
    for (let x = 14; x < 50; x += 10) shade(ctx, rr(x, 10, 7, 11, 1), stone, { sh: 1.2, hl: 0.5 });
    shade(ctx, path((c) => {
      c.moveTo(26, 58);
      c.lineTo(26, 46);
      c.arc(32, 46, 6, Math.PI, 0);
      c.lineTo(38, 58);
      c.closePath();
    }), WOOD, { sh: 1.2, hl: 0.5 });
    fill(ctx, rr(29, 28, 6, 9, 3), css(0x2a2a3a));
    line(ctx, [32, 10, 32, 0], 2, OUTC);
    fill(ctx, poly(33, 1, 46, 4, 33, 8), css(0x3d8bff));
  },
  // Çifte Yağmur: iki kuyruklu yıldız
  echo(ctx) {
    for (const [x, y, s] of [[42, 18, 1], [26, 42, 0.8]] as const) {
      const g = ctx.createLinearGradient(x - 26 * s, y - 20 * s, x, y);
      g.addColorStop(0, 'rgba(255,170,60,0)');
      g.addColorStop(1, 'rgba(255,210,120,0.95)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 30 * s, y - 24 * s);
      ctx.lineTo(x + 3 * s, y - 6 * s);
      ctx.lineTo(x - 6 * s, y + 4 * s);
      ctx.closePath();
      ctx.fill();
      glow(ctx, x, y, 14 * s, 0xffb347, 0.7);
      shade(ctx, circ(x, y, 7 * s), tone(0xff8a3c, 0xb04a10, 0xffe0a0), { sh: 1.6, hl: 0.8 });
    }
  },
  // Hızlı Damıtma: şişe
  distill(ctx) {
    const glass = path((c) => {
      c.moveTo(26, 8);
      c.lineTo(38, 8);
      c.lineTo(38, 26);
      c.bezierCurveTo(56, 32, 56, 58, 32, 58);
      c.bezierCurveTo(8, 58, 8, 32, 26, 26);
      c.closePath();
    });
    fill(ctx, glass, 'rgba(210,235,255,0.55)');
    ctx.save();
    ctx.beginPath();
    glass(ctx);
    ctx.clip();
    fill(ctx, rr(0, 36, 64, 30, 0), css(0x9a6cff));
    fill(ctx, ell(32, 36, 22, 3), css(0xc8b0ff));
    ctx.restore();
    for (const [x, y, r] of [[26, 46, 2.5], [36, 50, 2], [32, 42, 1.6]] as const) fill(ctx, circ(x, y, r), 'rgba(255,255,255,0.8)');
    stroke(ctx, glass, 2);
    shade(ctx, rr(24, 4, 16, 6, 2), WOOD, { sh: 1, hl: 0.4 });
    fill(ctx, ell(24, 32, 3, 7, 0.4), 'rgba(255,255,255,0.6)');
  },
  // Sancaktar: sancak
  banner(ctx) {
    line(ctx, [16, 60, 16, 4], 5, OUTC);
    line(ctx, [16, 60, 16, 4], 3, css(WOOD.base));
    fill(ctx, circ(16, 4, 3.5), css(GOLD.base));
    stroke(ctx, circ(16, 4, 3.5), 1.2);
    const flag = path((c) => {
      c.moveTo(18, 8);
      c.quadraticCurveTo(36, 2, 58, 12);
      c.lineTo(50, 22);
      c.lineTo(58, 32);
      c.quadraticCurveTo(36, 24, 18, 32);
      c.closePath();
    });
    shade(ctx, flag, tone(0xe04848, 0x922020, 0xff9a9a), { sh: 2.5, hl: 1 });
    star(ctx, 32, 19, 5, 2.2, 0xffe58a);
  },
};

/** Eter Kaynağı ödül türü simgeleri. */
const SOURCE_DRAW: Record<string, (ctx: Ctx) => void> = {
  gold(ctx) {
    coin(ctx, 22, 44, 12);
    coin(ctx, 42, 46, 11);
    coin(ctx, 32, 26, 13);
    sparkle(ctx, 50, 18, 5, '#ffffff');
  },
  fury(ctx) {
    glow(ctx, 32, 40, 26, 0xff6a3d, 0.5);
    const flame = (s: number, col: number, dy: number) =>
      shade(ctx, path((c) => {
        c.moveTo(32, 6 + dy);
        c.bezierCurveTo(46 * s + 32 * (1 - s), 22, 54 * s + 32 * (1 - s), 40, 32, 58);
        c.bezierCurveTo(10 * s + 32 * (1 - s), 40, 18 * s + 32 * (1 - s), 26, 26, 30);
        c.quadraticCurveTo(28, 18, 32, 6 + dy);
        c.closePath();
      }), tone(col, darken(col, 0.35), lighten(col, 0.4)), { sh: 2, hl: 0.8, lw: s === 1 ? 1.6 : 0 });
    flame(1, 0xff6a3d, 0);
    flame(0.55, 0xffd27a, 18);
  },
  heal(ctx) {
    glow(ctx, 32, 32, 26, 0x7dff9a, 0.4);
    shade(ctx, heart(32, 32, 20), tone(0x4fcf62, 0x23843a, 0xb6ffbe), { sh: 3, hl: 1.2 });
    fill(ctx, rr(28.5, 22, 7, 22, 2), '#ffffff');
    fill(ctx, rr(21, 29.5, 22, 7, 2), '#ffffff');
  },
};

function render(fn: (ctx: Ctx) => void): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(S, S, ART_SCALE);
  fn(ctx);
  return c;
}

export const CARD_ICON_IDS = Object.keys(DRAW);
export const SOURCE_ICON_IDS = Object.keys(SOURCE_DRAW);

export function drawCardIcon(id: string): HTMLCanvasElement {
  return render(DRAW[id] ?? (() => {}));
}

export function drawSourceIcon(kind: string): HTMLCanvasElement {
  return render(SOURCE_DRAW[kind] ?? (() => {}));
}
