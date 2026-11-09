// Kaleler: 5 kademe × 2 takım. Kapı sağda (savaş alanına bakar); düşman kalesi sahnede aynalanır.
// Üç kademeli siluet: arkada yüksek ana burç (yuva 2), ortada kule (yuva 1), önde kapı kulesi (yuva 0).
import * as B from '../../shared/balance';
import {
  type Build,
  type Ctx,
  type Tone,
  OUTC,
  circ,
  clipTo,
  css,
  darken,
  ell,
  fill,
  glow,
  lighten,
  lin,
  line,
  makeCanvas,
  path,
  poly,
  rivet,
  rng,
  rr,
  shade,
  softShadow,
  sparkle,
  stroke,
  tone,
} from './canvas';
import { ART_SCALE, CASTLE_H, CASTLE_W, MOUNTS, TEAM, type Team } from './layout';
import { crystalFacets, mat, teamTone } from './material';
import { leaf } from './units';

const PAL = (t: number) => B.TIERS[t].palette;
const GY = CASTLE_H - 10; // zemin çizgisi (kale tabanı zeminin 10 px altında)

interface Tower {
  x0: number;
  x1: number;
  top: number;
}
const KEEP: Tower = { x0: MOUNTS[2].x - 38, x1: MOUNTS[2].x + 38, top: MOUNTS[2].y };
const MID: Tower = { x0: MOUNTS[1].x - 19, x1: MOUNTS[1].x + 20, top: MOUNTS[1].y };
const GATE: Tower = { x0: MOUNTS[0].x - 36, x1: 237, top: MOUNTS[0].y };
const WALL_TOP = 186;
const ARCH = { x0: MOUNTS[0].x - 20, x1: MOUNTS[0].x + 22, spring: 230 };

/** Kademe taş tonu (ahşapta kütük). */
const STONE: Tone[] = [
  tone(0x9a6a40, 0x5e3c20, 0xc4965f), // kütük
  tone(0xd9b98a, 0xa27e52, 0xf3dfb8), // kum taşı
  tone(0x7c838c, 0x4e545c, 0xa9b0b8), // granit
  tone(0xbfd2ea, 0x7f97b8, 0xeaf5ff), // buz mermer
  tone(0xddd0f8, 0x9a86d2, 0xf8f2ff), // eter mermeri
];

/**
 * Bir kademenin iki takım kalesini çizer. Takımdan bağımsız taş yapı bir kez çizilip kopyalanır.
 * Büyük tuval: GPU hızlandırmalı (cpu=false) daha hızlı ölçüldü.
 */
export function drawCastle(t: number, cpu = false): Record<Team, HTMLCanvasElement> {
  const base = makeCanvas(CASTLE_W, CASTLE_H, ART_SCALE, cpu);
  const R = rng(1000 + t * 17);
  {
    const ctx = base.ctx;
    softShadow(ctx, 124, GY + 4, 126, 14, 0.4);
    if (t === 4) glow(ctx, 70, 120, 120, PAL(4).glow, 0.18);
    if (t === 3) glow(ctx, 70, 140, 120, PAL(3).glow, 0.2);
    // arka sur, kuleler (arkadan öne), temel
    wall(ctx, t, R);
    tower(ctx, t, KEEP, R, 'keep');
    tower(ctx, t, MID, R, 'mid');
    tower(ctx, t, GATE, R, 'gate');
    foundation(ctx, t, R);
  }
  const out = {} as Record<Team, HTMLCanvasElement>;
  for (const team of ['a', 'e'] as Team[]) {
    const { c, ctx } = makeCanvas(CASTLE_W, CASTLE_H, ART_SCALE, cpu);
    ctx.drawImage(base.c, 0, 0, CASTLE_W, CASTLE_H);
    const R2 = rng(2000 + t * 31);
    flag(ctx, t, team);
    gate(ctx, t, team);
    // pencereler, sancaklar, amblem
    windows(ctx, t, team);
    banner(ctx, t, team, KEEP.x0 + 2, KEEP.top + 13, 13, 54);
    banner(ctx, t, team, KEEP.x1 - 15, KEEP.top + 13, 13, 54);
    emblem(ctx, t, team, (ARCH.x0 + ARCH.x1) / 2, 180);
    // kademe süsleri
    extras(ctx, t, team, R2);
    // yuvalar (kule satın alınmamışken görünen boş oturak)
    for (const m of MOUNTS) seat(ctx, t, m.x, m.y);
    out[team] = c;
  }
  return out;
}

// ── yapı taşları ─────────────────────────────────────────
function faceShade(ctx: Ctx, b: Build, x0: number, x1: number, y0: number, y1: number) {
  clipTo(ctx, b, () => {
    ctx.fillStyle = lin(ctx, x0, 0, x1, 0, [
      [0, 'rgba(255,250,235,0.16)'],
      [0.45, 'rgba(255,250,235,0)'],
      [1, 'rgba(10,10,30,0.22)'],
    ]);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = lin(ctx, 0, y1 - 40, 0, y1, [
      [0, 'rgba(10,10,30,0)'],
      [1, 'rgba(10,10,30,0.25)'],
    ]);
    ctx.fillRect(x0, y1 - 40, x1 - x0, 40);
  });
}

/** Taş örgü: sıralı tuğlalar, harç çizgileri, rastgele ton farkı. */
function masonry(ctx: Ctx, t: number, x0: number, y0: number, x1: number, y1: number, R: ReturnType<typeof rng>, bw = 16, bh = 9) {
  const S = STONE[t];
  ctx.fillStyle = css(S.base);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let row = 0, y = y0; y < y1; y += bh, row++) {
    const off = (row % 2) * (bw / 2) - bw / 2;
    for (let x = x0 + off; x < x1; x += bw) {
      const v = R.next();
      const col = v < 0.25 ? lighten(S.base, 0.12) : v < 0.5 ? darken(S.base, 0.08) : v < 0.6 ? lighten(S.light, 0.1) : S.base;
      ctx.fillStyle = css(col);
      ctx.fillRect(x + 0.6, y + 0.6, bw - 1.2, bh - 1.2);
      // tuğla üst kenar ışığı
      ctx.fillStyle = css(S.light, 0.55);
      ctx.fillRect(x + 0.8, y + 0.7, bw - 1.6, 0.9);
      if (t === 0) continue;
      if (R.next() < 0.12) {
        // çatlak
        line(ctx, [x + bw * 0.3, y + 1, x + bw * 0.45, y + bh * 0.5, x + bw * 0.4, y + bh - 1], 0.5, css(S.dark, 0.7));
      }
    }
    ctx.fillStyle = css(S.dark, 0.85);
    ctx.fillRect(x0, y - 0.5, x1 - x0, 1);
    for (let x = x0 + off; x < x1; x += bw) ctx.fillRect(x - 0.5, y, 1, bh);
  }
}

/** Yatay kütük duvar (ahşap kademe). */
function logWall(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, R: ReturnType<typeof rng>) {
  const W = mat(0);
  const lh = 8;
  for (let y = y0; y < y1; y += lh) {
    const tn = R.next() < 0.5 ? W.main : tone(darken(W.main.base, 0.06), W.main.dark, W.main.light);
    const b = rr(x0 - 2, y, x1 - x0 + 4, lh + 0.6, lh / 2);
    shade(ctx, b, tn, {
      sh: 2,
      hl: 0.9,
      lw: 1.2,
      inner: () => {
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = css(W.main.dark, 0.5);
        ctx.beginPath();
        for (let i = 0; i < 2; i++) {
          const gy = y + 2.5 + i * 3;
          ctx.moveTo(x0, gy);
          ctx.bezierCurveTo(x0 + (x1 - x0) * 0.3, gy + R.range(-1, 1), x0 + (x1 - x0) * 0.7, gy + R.range(-1, 1), x1, gy);
        }
        ctx.stroke();
        if (R.next() < 0.5) {
          const kx = R.range(x0 + 6, x1 - 6);
          stroke(ctx, ell(kx, y + lh / 2, 2, 1.3), 0.6, css(W.main.dark, 0.8));
        }
      },
    });
    // kütük uçları (halkalar)
    for (const ex of [x0 - 1, x1 + 1]) {
      fill(ctx, ell(ex, y + lh / 2, 2.6, lh / 2 - 0.3), css(W.main.light));
      stroke(ctx, ell(ex, y + lh / 2, 1.2, 1.6), 0.5, css(W.main.dark, 0.8));
      stroke(ctx, ell(ex, y + lh / 2, 2.6, lh / 2 - 0.3), 1);
    }
  }
}

/** Sivri uçlu kazık çit. */
function palisade(ctx: Ctx, x0: number, x1: number, top: number, bottom: number, R: ReturnType<typeof rng>) {
  const W = mat(0);
  const lw = 9;
  for (let x = x0; x < x1; x += lw) {
    const tp = top + R.range(-3, 3);
    const b: Build = (c) => {
      c.moveTo(x, bottom);
      c.lineTo(x, tp + 6);
      c.lineTo(x + lw / 2, tp);
      c.lineTo(x + lw, tp + 6);
      c.lineTo(x + lw, bottom);
      c.closePath();
    };
    const tn = R.next() < 0.5 ? W.main : W.alt;
    shade(ctx, b, tn, {
      sh: 2.2,
      hl: 0.9,
      lw: 1.2,
      inner: () => {
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = css(tn.dark, 0.55);
        ctx.beginPath();
        ctx.moveTo(x + 3, tp + 8);
        ctx.lineTo(x + 3.4, bottom);
        ctx.moveTo(x + 6, tp + 10);
        ctx.lineTo(x + 5.6, bottom);
        ctx.stroke();
        fill(ctx, poly(x + lw / 2, tp, x + lw, tp + 6, x + lw / 2, tp + 5), css(W.main.light, 0.8));
      },
    });
  }
  // iple bağlanmış kuşak
  for (const y of [top + 18, bottom - 14]) {
    line(ctx, [x0, y, x1, y + 1], 2.4, OUTC);
    line(ctx, [x0, y, x1, y + 1], 1.2, '#c9a76a');
  }
}

function crenels(ctx: Ctx, t: number, x0: number, x1: number, y: number, skip?: [number, number]) {
  const S = STONE[t];
  const mw = t === 0 ? 7 : 11;
  const gap = t === 0 ? 3 : 7;
  const h = t === 0 ? 10 : 11;
  for (let x = x0; x + mw <= x1 + 0.5; x += mw + gap) {
    if (skip && x + mw > skip[0] && x < skip[1]) continue;
    if (t === 0) {
      const b = poly(x, y, x, y - h + 3, x + mw / 2, y - h, x + mw, y - h + 3, x + mw, y);
      shade(ctx, b, mat(0).main, { sh: 1.6, hl: 0.8, lw: 1.2 });
      continue;
    }
    const b = t === 3 ? poly(x, y, x, y - h + 3, x + mw / 2, y - h - 3, x + mw, y - h + 3, x + mw, y) : rr(x, y - h, mw, h + 1, t === 4 ? 3 : 1.2);
    shade(ctx, b, S, {
      sh: 2,
      hl: 1,
      lw: 1.5,
      inner: () => {
        if (t === 1 || t === 4) {
          const T = mat(t).trim;
          fill(ctx, rr(x - 1, y - h - 1, mw + 2, 3, 1.4), css(T.base));
          fill(ctx, rr(x, y - h - 0.6, mw * 0.5, 1, 0.5), css(T.light));
        }
        if (t === 2) {
          fill(ctx, rr(x, y - h, mw, 3.5, 0.5), css(mat(2).main.base));
          fill(ctx, rr(x, y - h, mw, 1, 0.5), css(mat(2).main.light));
        }
      },
    });
    if (t === 2) {
      // demir diken
      const sp = poly(x + mw / 2 - 1.6, y - h, x + mw / 2, y - h - 5, x + mw / 2 + 1.6, y - h);
      shade(ctx, sp, mat(2).alt, { sh: 0.6, hl: 0.4, lw: 1 });
    }
  }
}

function wall(ctx: Ctx, t: number, R: ReturnType<typeof rng>) {
  const x0 = 6;
  const x1 = 236;
  if (t === 0) {
    palisade(ctx, x0, x1, WALL_TOP - 14, GY - 6, R);
    return;
  }
  const b = rr(x0, WALL_TOP, x1 - x0, GY - WALL_TOP, 1);
  clipTo(ctx, b, () => masonry(ctx, t, x0, WALL_TOP, x1, GY, R, 18, 10));
  faceShade(ctx, b, x0, x1, WALL_TOP, GY);
  stroke(ctx, b, 2);
  crenels(ctx, t, x0, x1, WALL_TOP);
}

function tower(ctx: Ctx, t: number, tw: Tower, R: ReturnType<typeof rng>, kind: 'keep' | 'mid' | 'gate') {
  const { x0, x1, top } = tw;
  const bottom = GY - 4;
  const bodyTop = top + 12;
  const body = rr(x0, bodyTop, x1 - x0, bottom - bodyTop, 1);
  if (t === 0) {
    // ahşap kule: köşe direkleri + yatay kütük duvar
    clipTo(ctx, body, () => logWall(ctx, x0, bodyTop, x1, bottom, R));
    faceShade(ctx, body, x0, x1, bodyTop, bottom);
    stroke(ctx, body, 2);
    for (const px of [x0 - 3, x1 - 3]) {
      shade(ctx, rr(px, bodyTop - 2, 6, bottom - bodyTop + 2, 2.5), mat(0).alt, { sh: 2, hl: 0.8, lw: 1.4 });
    }
    // çapraz destek
    line(ctx, [x0 + 4, bottom - 6, x1 - 4, bottom - 40], 4.4, OUTC);
    line(ctx, [x0 + 4, bottom - 6, x1 - 4, bottom - 40], 2.4, css(mat(0).alt.base));
  } else {
    clipTo(ctx, body, () => masonry(ctx, t, x0, bodyTop, x1, bottom, R, kind === 'mid' ? 12 : 16, 9));
    faceShade(ctx, body, x0, x1, bodyTop, bottom);
    if (kind === 'mid') {
      // yuvarlak kule hissi
      clipTo(ctx, body, () => {
        ctx.fillStyle = lin(ctx, x0, 0, x1, 0, [
          [0, 'rgba(0,0,20,0.18)'],
          [0.3, 'rgba(255,255,240,0.12)'],
          [1, 'rgba(0,0,20,0.32)'],
        ]);
        ctx.fillRect(x0, bodyTop, x1 - x0, bottom - bodyTop);
      });
    }
    stroke(ctx, body, 2);
    if (t === 1 || t === 4) {
      // metal kuşak
      const T = mat(t).trim;
      for (const y of [bodyTop + 40, bottom - 30]) {
        if (y > bottom - 10) continue;
        shade(ctx, rr(x0 - 1.5, y, x1 - x0 + 3, 4, 1.5), T, { sh: 1.2, hl: 0.6, lw: 1.2 });
      }
    }
    if (t === 2) {
      // perçinli demir köşe levhaları
      for (const px of [x0 - 1, x1 - 7]) {
        shade(ctx, rr(px, bodyTop, 8, bottom - bodyTop, 1.5), mat(2).alt, { sh: 1.6, hl: 0.6, lw: 1.4 });
        for (let y = bodyTop + 6; y < bottom - 4; y += 14) rivet(ctx, px + 4, y, 1, mat(2).main);
      }
    }
  }
  // korkuluk bandı (konsollu)
  parapet(ctx, t, x0 - 5, x1 + 5, top);
  const mx = (x0 + x1) / 2;
  crenels(ctx, t, x0 - 5, x1 + 5, top, [mx - 16, mx + 16]);
}

function parapet(ctx: Ctx, t: number, x0: number, x1: number, top: number) {
  const S = STONE[t];
  const b = rr(x0, top, x1 - x0, 12, 1.5);
  if (t === 0) {
    // tahta platform: kalaslar
    shade(ctx, b, mat(0).alt, {
      sh: 2.4,
      hl: 1,
      lw: 1.6,
      inner: () => {
        for (let x = x0 + 7; x < x1; x += 7) line(ctx, [x, top, x, top + 12], 0.6, css(mat(0).alt.dark, 0.8));
      },
    });
    // dirsekler
    for (let x = x0 + 6; x < x1 - 4; x += 16) shade(ctx, poly(x, top + 12, x + 5, top + 12, x + 2.5, top + 18), mat(0).alt, { sh: 1, hl: 0.5, lw: 1.1 });
    return;
  }
  shade(ctx, b, S, {
    sh: 3,
    hl: 1.1,
    lw: 1.8,
    inner: () => {
      fill(ctx, rr(x0, top, x1 - x0, 2, 0), css(S.light, 0.8));
      for (let x = x0 + 4; x < x1; x += 12) line(ctx, [x, top + 2, x, top + 12], 0.7, css(S.dark, 0.7));
      if (t === 1 || t === 4) fill(ctx, rr(x0, top + 8.5, x1 - x0, 3.5, 0), css(mat(t).trim.base));
      if (t === 2) for (let x = x0 + 4; x < x1; x += 12) rivet(ctx, x + 6, top + 6, 0.9, mat(2).main);
    },
  });
  // konsollar
  for (let x = x0 + 5; x < x1 - 5; x += 12) shade(ctx, rr(x, top + 12, 5, 6, 1.5), S, { sh: 1.2, hl: 0.5, lw: 1.2 });
}

function foundation(ctx: Ctx, t: number, R: ReturnType<typeof rng>) {
  const S = t === 0 ? tone(0x8f8a7e, 0x5c584f, 0xbdb7a8) : STONE[t];
  // kaba taş kaide
  const y0 = GY - 18;
  for (let x = 2; x < 240; ) {
    const w = R.range(14, 24);
    const h = R.range(12, 18);
    const b = rr(x, GY + 2 - h, w, h + 8, 4);
    shade(ctx, b, R.next() < 0.5 ? S : tone(darken(S.base, 0.08), S.dark, S.light), { sh: 2.6, hl: 1, lw: 1.6 });
    x += w - 1;
  }
  void y0;
  // ot ve kayalar
  for (let i = 0; i < 26; i++) {
    const x = R.range(0, 240);
    const y = GY + R.range(4, 9);
    grassTuft(ctx, x, y, R.range(4, 8), R);
  }
  if (t === 0) {
    for (let i = 0; i < 6; i++) leaf(ctx, R.range(10, 230), GY - R.range(4, 14), 5, 2, R.range(-3, 0));
  }
}

export function grassTuft(ctx: Ctx, x: number, y: number, h: number, R: ReturnType<typeof rng>) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const bx = x + (i - 2) * 1.4;
    ctx.moveTo(bx - 1, y);
    ctx.quadraticCurveTo(bx + R.range(-2, 2), y - h * 0.6, bx + R.range(-3, 3), y - h * R.range(0.7, 1.1));
    ctx.lineTo(bx + 1, y);
  }
  ctx.closePath();
  ctx.fillStyle = css(R.next() < 0.5 ? 0x5a9a3c : 0x4a8a34);
  ctx.fill();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = css(0x2a4a20, 0.8);
  ctx.stroke();
}

function gate(ctx: Ctx, t: number, team: Team) {
  const { x0, x1, spring } = ARCH;
  const r = (x1 - x0) / 2;
  const cx = (x0 + x1) / 2;
  const bottom = GY + 2;
  const opening: Build = (c) => {
    c.moveTo(x0, bottom);
    c.lineTo(x0, spring);
    c.arc(cx, spring, r, Math.PI, 0);
    c.lineTo(x1, bottom);
    c.closePath();
  };
  // kemer taşları
  const S = t === 0 ? mat(0).alt : STONE[t];
  for (let i = 0; i <= 8; i++) {
    const a0 = Math.PI + (i / 9) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 9) * Math.PI;
    const ro = r + 7;
    const b = poly(cx + Math.cos(a0) * r, spring + Math.sin(a0) * r, cx + Math.cos(a0) * ro, spring + Math.sin(a0) * ro, cx + Math.cos(a1) * ro, spring + Math.sin(a1) * ro, cx + Math.cos(a1) * r, spring + Math.sin(a1) * r);
    shade(ctx, b, i === 4 && t >= 1 ? mat(t).trim : S, { sh: 1.4, hl: 0.7, lw: 1.3 });
  }
  for (const sx of [x0 - 7, x1]) shade(ctx, rr(sx, spring, 7, bottom - spring, 1), S, { sh: 1.6, hl: 0.7, lw: 1.3 });
  // iç karanlık
  fill(ctx, opening, lin(ctx, 0, spring - r, 0, bottom, [
    [0, '#0d0a10'],
    [1, '#241a1a'],
  ]));
  clipTo(ctx, opening, () => {
    const T = TEAM[team];
    if (t === 4) {
      // eter kapısı: parlayan geçit
      const g = ctx.createRadialGradient(cx, bottom - 26, 2, cx, bottom - 26, 46);
      g.addColorStop(0, css(0xffffff, 0.95));
      g.addColorStop(0.25, css(lighten(T, 0.4), 0.85));
      g.addColorStop(0.6, css(0x7a4cff, 0.75));
      g.addColorStop(1, css(0x2a1260, 0.9));
      ctx.fillStyle = g;
      ctx.fillRect(x0, spring - r, x1 - x0, bottom - spring + r);
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = css(0xffffff, 0.35 - i * 0.07);
        ctx.beginPath();
        ctx.ellipse(cx, bottom - 26, 8 + i * 7, 12 + i * 9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }
    if (t === 2) {
      // demir parmaklık
      ctx.fillStyle = 'rgba(255,140,40,0.12)';
      ctx.fillRect(x0, spring - r, x1 - x0, bottom);
      for (let x = x0 + 4; x < x1; x += 7) {
        line(ctx, [x, spring - r, x, bottom - 4], 3.4, OUTC);
        line(ctx, [x, spring - r, x, bottom - 4], 1.8, css(mat(2).main.base));
        fill(ctx, poly(x - 2, bottom - 4, x + 2, bottom - 4, x, bottom + 1), css(mat(2).main.light));
      }
      for (let y = spring - 14; y < bottom - 6; y += 12) {
        line(ctx, [x0, y, x1, y], 3.2, OUTC);
        line(ctx, [x0, y, x1, y], 1.6, css(mat(2).main.base));
      }
      return;
    }
    if (t === 3) {
      // kristal kapı: buzlu cam paneller
      const C = mat(3).main;
      shade(ctx, rr(x0 + 2, spring - r + 2, x1 - x0 - 4, bottom - spring + r, 2), tone(darken(C.base, 0.25), darken(C.dark, 0.2), C.light), {
        sh: 3,
        hl: 1,
        lw: 0,
        inner: () => crystalFacets(ctx, [x0, spring - r, x1 - x0, bottom - spring + r], 0.3),
      });
      line(ctx, [cx, spring - r, cx, bottom], 1.6, OUTC);
      glow(ctx, cx, spring + 6, 14, T, 0.5);
      return;
    }
    // ahşap kapı kanatları
    const D = t === 1 ? tone(0x7a4a26, 0x4a2a12, 0xa86e3e) : mat(0).alt;
    for (let x = x0; x < x1; x += 7.6) {
      shade(ctx, rr(x, spring - r - 2, 7.6, bottom - spring + r + 4, 0.8), D, {
        sh: 1.6,
        hl: 0.6,
        lw: 1,
        inner: () => line(ctx, [x + 3, spring - r, x + 3.4, bottom], 0.5, css(D.dark, 0.6)),
      });
    }
    line(ctx, [cx, spring - r, cx, bottom], 1.8, OUTC);
    const band = t === 1 ? mat(1).main : tone(0x5a5a60, 0x34343a, 0x8a8a94);
    for (const y of [spring + 6, bottom - 16]) {
      shade(ctx, rr(x0, y, x1 - x0, 4, 1), band, { sh: 1, hl: 0.5, lw: 1.1 });
      for (let x = x0 + 4; x < x1; x += 8) rivet(ctx, x, y + 2, 0.8, band);
    }
    // halka tokmaklar
    for (const hx of [cx - 5, cx + 5]) {
      ctx.beginPath();
      ctx.arc(hx, spring + 22, 2.6, 0, Math.PI * 2);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = OUTC;
      ctx.stroke();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = css(t === 1 ? mat(1).trim.base : 0x9a9aa4);
      ctx.stroke();
    }
  });
  stroke(ctx, opening, 2);
}

function windows(ctx: Ctx, t: number, team: Team) {
  const T = TEAM[team];
  const list: [number, number, number, number][] = [
    [46, 96, 9, 16],
    [74, 96, 9, 16],
    [60, 150, 10, 18],
    [129, 146, 8, 15],
    [129, 196, 8, 15],
    [60, 210, 9, 15],
  ];
  for (const [x, y, w, h] of list) {
    const b: Build = (c) => {
      c.moveTo(x - w / 2, y + h);
      c.lineTo(x - w / 2, y + w / 2);
      c.arc(x, y + w / 2, w / 2, Math.PI, 0);
      c.lineTo(x + w / 2, y + h);
      c.closePath();
    };
    // çerçeve
    const fr: Build = (c) => {
      c.moveTo(x - w / 2 - 2.4, y + h + 2);
      c.lineTo(x - w / 2 - 2.4, y + w / 2);
      c.arc(x, y + w / 2, w / 2 + 2.4, Math.PI, 0);
      c.lineTo(x + w / 2 + 2.4, y + h + 2);
      c.closePath();
    };
    shade(ctx, fr, t === 0 ? mat(0).alt : t === 1 || t === 4 ? mat(t).trim : STONE[t], { sh: 1.2, hl: 0.6, lw: 1.3 });
    glow(ctx, x, y + h / 2, w * 1.6, T, 0.45);
    fill(ctx, b, lin(ctx, 0, y, 0, y + h, [
      [0, css(lighten(T, 0.65))],
      [0.5, css(lighten(T, 0.25))],
      [1, css(T)],
    ]));
    line(ctx, [x, y + 1, x, y + h], 0.9, css(darken(T, 0.5), 0.8));
    line(ctx, [x - w / 2, y + h * 0.55, x + w / 2, y + h * 0.55], 0.9, css(darken(T, 0.5), 0.8));
    stroke(ctx, b, 1.4);
    fill(ctx, rr(x - w / 2 - 3, y + h + 1, w + 6, 2.6, 1), css(t === 0 ? mat(0).alt.base : STONE[t].light));
    stroke(ctx, rr(x - w / 2 - 3, y + h + 1, w + 6, 2.6, 1), 1);
  }
}

function banner(ctx: Ctx, t: number, team: Team, x: number, y: number, w: number, h: number) {
  const tn = teamTone(team);
  const b: Build = (c) => {
    c.moveTo(x, y);
    c.lineTo(x + w, y);
    c.lineTo(x + w, y + h);
    c.lineTo(x + w / 2, y + h - 6);
    c.lineTo(x, y + h);
    c.closePath();
  };
  shade(ctx, b, tn, {
    sh: 2.4,
    hl: 0.8,
    lw: 1.4,
    inner: () => {
      // kenar şeridi ve kıvrımlar
      const edge = t === 0 ? 0xe8d8b0 : t === 2 ? 0xc8ccd2 : t === 3 ? 0xd8f6ff : 0xf6cc50;
      line(ctx, [x + 1.5, y, x + 1.5, y + h - 1], 1.2, css(edge, 0.9));
      line(ctx, [x + w - 1.5, y, x + w - 1.5, y + h - 1], 1.2, css(edge, 0.9));
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x + w * 0.62, y, 1.4, h);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + w * 0.3, y, 1.2, h);
      golemSigil(ctx, x + w / 2, y + h * 0.42, w * 0.36, edge);
    },
  });
  // asma çubuğu
  const rod = t === 0 ? mat(0).alt : t === 2 ? mat(2).alt : mat(t === 3 ? 3 : t).trim;
  shade(ctx, rr(x - 2, y - 2, w + 4, 3.4, 1.6), rod, { sh: 0.8, hl: 0.5, lw: 1.1 });
}

/** Takım amblemi: üçgen göz – "golem yüzü" işareti. */
function golemSigil(ctx: Ctx, x: number, y: number, s: number, color: number) {
  ctx.save();
  ctx.fillStyle = css(color);
  ctx.strokeStyle = css(color);
  ctx.lineWidth = s * 0.22;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.9, y - s * 0.3);
  ctx.lineTo(x + s * 0.7, y + s);
  ctx.lineTo(x - s * 0.7, y + s);
  ctx.lineTo(x - s * 0.9, y - s * 0.3);
  ctx.closePath();
  ctx.stroke();
  ctx.fillRect(x - s * 0.5, y - s * 0.1, s * 0.32, s * 0.28);
  ctx.fillRect(x + s * 0.18, y - s * 0.1, s * 0.32, s * 0.28);
  ctx.restore();
}

function emblem(ctx: Ctx, t: number, team: Team, x: number, y: number) {
  const tn = teamTone(team);
  const S = t === 0 ? mat(0).alt : t === 2 ? mat(2).alt : mat(t).trim;
  const shield: Build = (c) => {
    c.moveTo(x - 11, y - 11);
    c.lineTo(x + 11, y - 11);
    c.lineTo(x + 11, y + 1);
    c.quadraticCurveTo(x + 10, y + 10, x, y + 14);
    c.quadraticCurveTo(x - 10, y + 10, x - 11, y + 1);
    c.closePath();
  };
  shade(ctx, shield, S, { sh: 2, hl: 0.8, lw: 1.6 });
  const inner: Build = (c) => {
    c.moveTo(x - 8, y - 8);
    c.lineTo(x + 8, y - 8);
    c.lineTo(x + 8, y + 1);
    c.quadraticCurveTo(x + 7, y + 7.5, x, y + 10.6);
    c.quadraticCurveTo(x - 7, y + 7.5, x - 8, y + 1);
    c.closePath();
  };
  shade(ctx, inner, tn, { sh: 1.6, hl: 0.6, lw: 1.1, inner: () => golemSigil(ctx, x, y, 4.6, 0xffffff) });
  if (t === 2 || t === 1) for (const [rx, ry] of [[-8.5, -8.5], [8.5, -8.5]]) rivet(ctx, x + rx, y + ry, 0.9, S);
}

function flag(ctx: Ctx, t: number, team: Team) {
  const px = 12;
  const tn = teamTone(team);
  line(ctx, [px, KEEP.top - 6, px, 3], 3.6, OUTC);
  line(ctx, [px, KEEP.top - 6, px, 3], 1.8, css(t === 0 ? 0x6e4a2e : t === 1 ? 0xd08236 : t === 2 ? 0x5a616b : t === 3 ? 0xbaf3ff : 0xf6c84c));
  const top = t >= 3 ? poly(px - 3.2, 4, px, -0.5 + 0.5, px + 3.2, 4, px, 6) : circ(px, 3, 2.4);
  shade(ctx, top, mat(t).trim, { sh: 0.8, hl: 0.4, lw: 1.1 });
  const b: Build = (c) => {
    c.moveTo(px + 1, 6);
    c.bezierCurveTo(px + 10, 3, px + 18, 9, px + 30, 6);
    c.lineTo(px + 24, 14);
    c.lineTo(px + 31, 22);
    c.bezierCurveTo(px + 19, 25, px + 11, 19, px + 1, 22);
    c.closePath();
  };
  shade(ctx, b, tn, {
    sh: 2.2,
    hl: 0.8,
    lw: 1.4,
    inner: () => {
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.beginPath();
      ctx.ellipse(px + 16, 14, 3, 10, 0.1, 0, Math.PI * 2);
      ctx.fill();
      golemSigil(ctx, px + 9, 14, 3.6, 0xffffff);
    },
  });
}

function seat(ctx: Ctx, t: number, x: number, y: number) {
  const S = t === 0 ? mat(0).alt : STONE[t];
  shade(ctx, ell(x, y + 1, 15, 4.2), S, { sh: 1.6, hl: 0.6, lw: 1.4 });
  fill(ctx, ell(x, y, 10, 2.4), css(darken(S.dark, 0.25), 0.7));
}

function extras(ctx: Ctx, t: number, team: Team, R: ReturnType<typeof rng>) {
  const P = PAL(t);
  switch (t) {
    case 0: {
      // sarmaşıklar ve yosun
      for (const [x, y0, len] of [[22, 70, 70], [98, 120, 60], [150, 150, 50], [236, 190, 60]] as const) {
        ctx.beginPath();
        ctx.moveTo(x, y0);
        for (let i = 1; i <= 6; i++) ctx.quadraticCurveTo(x + (i % 2 ? 4 : -4), y0 + (len * (i - 0.5)) / 6, x, y0 + (len * i) / 6);
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = OUTC;
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#4f8a34';
        ctx.stroke();
        for (let i = 0; i < 6; i++) leaf(ctx, x + (i % 2 ? 1 : -1), y0 + (len * i) / 6 + 4, 4.4, 1.8, i % 2 ? -0.4 : -2.7);
      }
      // meşaleler
      for (const x of [GATE.x0 + 6, GATE.x1 - 6]) torch(ctx, x, GATE.top + 34, 0xffb040);
      break;
    }
    case 1: {
      // bronz mangallar (ateş)
      for (const x of [GATE.x0 + 6, GATE.x1 - 6]) brazier(ctx, x, GATE.top + 34);
      for (const x of [KEEP.x0 + 10, KEEP.x1 - 10]) brazier(ctx, x, KEEP.top + 40);
      break;
    }
    case 2: {
      // baca ve duman, ocak ışığı
      shade(ctx, rr(30, KEEP.top - 34, 10, 30, 1.5), mat(2).alt, { sh: 2, hl: 0.8, lw: 1.6 });
      shade(ctx, rr(28, KEEP.top - 36, 14, 5, 1.5), mat(2).main, { sh: 1, hl: 0.6, lw: 1.4 });
      glow(ctx, 35, KEEP.top - 36, 7, P.glow, 0.6);
      for (const [x, y, r] of [[38, KEEP.top - 44, 5], [33, KEEP.top - 52, 6.5], [40, KEEP.top - 60, 5]] as const) {
        fill(ctx, circ(x, y, r), 'rgba(90,92,100,0.55)');
        fill(ctx, circ(x - 1.4, y - 1.4, r * 0.6), 'rgba(160,162,170,0.4)');
      }
      for (const x of [GATE.x0 + 6, GATE.x1 - 6]) torch(ctx, x, GATE.top + 34, P.glow);
      break;
    }
    case 3: {
      // kristal kümeleri ve kuleler
      crystalCluster(ctx, KEEP.x0 - 4, KEEP.top - 2, 1.2, R);
      crystalCluster(ctx, KEEP.x1 + 2, KEEP.top + 2, 0.9, R);
      crystalCluster(ctx, MID.x1 + 3, MID.top + 2, 0.8, R);
      crystalCluster(ctx, GATE.x1 - 2, GATE.top + 2, 0.9, R);
      crystalCluster(ctx, 20, GY - 4, 1.3, R);
      crystalCluster(ctx, 150, GY - 2, 1, R);
      for (const x of [GATE.x0 + 6, GATE.x1 - 6]) torch(ctx, x, GATE.top + 34, P.glow);
      break;
    }
    default: {
      // süzülen taşlar, altın rünler
      for (const [x, y, s] of [[6, 120, 1], [112, 70, 0.8], [234, 120, 0.9], [150, 236, 0.7]] as const) floatingRock(ctx, x, y, s);
      ctx.save();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = css(P.glow, 0.9);
      for (const [x, y] of [[60, 128], [129, 230], [36, 240]] as const) {
        glow(ctx, x, y, 8, P.glow, 0.5);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x, y + 6);
        ctx.moveTo(x - 5, y + 2);
        ctx.lineTo(x + 5, y - 2);
        ctx.stroke();
      }
      ctx.restore();
      for (let i = 0; i < 10; i++) sparkle(ctx, R.range(10, 230), R.range(40, 260), R.range(1.2, 2.6), '#fff4c8', 0.9);
      for (const x of [GATE.x0 + 6, GATE.x1 - 6]) torch(ctx, x, GATE.top + 34, 0xb88cff);
    }
  }
  void team;
}

function torch(ctx: Ctx, x: number, y: number, color: number) {
  glow(ctx, x, y - 6, 14, color, 0.45);
  shade(ctx, rr(x - 1.6, y - 4, 3.2, 12, 1), mat(0).alt, { sh: 0.6, hl: 0.4, lw: 1 });
  flame(ctx, x, y - 4, 4, color);
}

function flame(ctx: Ctx, x: number, y: number, s: number, color: number) {
  const f: Build = (c) => {
    c.moveTo(x - s, y);
    c.quadraticCurveTo(x - s * 1.1, y - s * 1.4, x, y - s * 2.6);
    c.quadraticCurveTo(x + s * 1.2, y - s * 1.3, x + s, y);
    c.quadraticCurveTo(x, y + s * 0.5, x - s, y);
    c.closePath();
  };
  fill(ctx, f, css(color));
  stroke(ctx, f, 1, css(darken(color, 0.55)));
  fill(ctx, ell(x, y - s * 0.6, s * 0.5, s * 0.9), '#fff6c8');
}

function brazier(ctx: Ctx, x: number, y: number) {
  glow(ctx, x, y - 8, 16, 0xffa030, 0.5);
  flame(ctx, x, y - 4, 4.6, 0xffa030);
  const bowl: Build = (c) => {
    c.moveTo(x - 7, y - 4);
    c.lineTo(x + 7, y - 4);
    c.quadraticCurveTo(x + 6, y + 3, x, y + 3);
    c.quadraticCurveTo(x - 6, y + 3, x - 7, y - 4);
    c.closePath();
  };
  shade(ctx, bowl, mat(1).main, { sh: 1.6, hl: 0.6, lw: 1.3 });
  shade(ctx, rr(x - 1.4, y + 2, 2.8, 8, 1), mat(1).alt, { sh: 0.6, hl: 0.4, lw: 1 });
}

function crystalCluster(ctx: Ctx, x: number, y: number, s: number, R: ReturnType<typeof rng>) {
  const C = mat(3);
  glow(ctx, x, y - 8 * s, 16 * s, PAL(3).glow, 0.35);
  const shards: [number, number, number][] = [
    [-6, 10, -0.5],
    [6, 9, 0.45],
    [0, 16, 0.05],
    [-3, 7, -0.9],
    [4, 6, 0.9],
  ];
  for (const [dx, h, a] of shards) {
    const hh = h * s * R.range(0.85, 1.15);
    const w = 3.4 * s;
    ctx.save();
    ctx.translate(x + dx * s, y);
    ctx.rotate(a);
    const b = poly(-w, 0, -w, -hh * 0.7, 0, -hh, w, -hh * 0.7, w, 0);
    shade(ctx, b, h > 12 ? C.trim : C.main, { sh: 1.4, hl: 0.7, lw: 1.2, inner: () => crystalFacets(ctx, [-w, -hh, w * 2, hh], 0.4) });
    ctx.restore();
  }
}

function floatingRock(ctx: Ctx, x: number, y: number, s: number) {
  const M = mat(4);
  glow(ctx, x, y + 8 * s, 10 * s, PAL(4).glow, 0.4);
  const b = poly(x - 7 * s, y - 2 * s, x - 3 * s, y - 6 * s, x + 6 * s, y - 4 * s, x + 7 * s, y + 1 * s, x + 1 * s, y + 9 * s, x - 4 * s, y + 5 * s);
  shade(ctx, b, M.alt, { sh: 2, hl: 0.8, lw: 1.3 });
  fill(ctx, rr(x - 6 * s, y - 1.5 * s, 12 * s, 1.6 * s, 0.8), css(M.trim.base));
  sparkle(ctx, x + 8 * s, y - 6 * s, 2 * s, '#fff4c8');
}
