// Golem birimleri: gövde (baş dahil), bacak ve silah/kol parçaları. Sağa bakar.
// Çizimler "kap koordinatında" yapılır: x ileri, y yukarı negatif, zemin y=0 (bkz. layout.ts LAYOUT).
import * as B from '../../shared/balance';
import type { Arch } from '../../shared/balance';
import {
  type Build,
  type Ctx,
  OUTC,
  capsule,
  circ,
  css,
  darken,
  ell,
  eye,
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
import { ART_SCALE, LAYOUT, TEAM, type Team } from './layout';
import { type Box, cloth, crystalFacets, inside, mat, part, teamTone, tonePart } from './material';

const PAL = (t: number) => B.TIERS[t].palette;

// ── küçük yardımcılar ────────────────────────────────────
/** Sivri yaprak. */
export function leaf(ctx: Ctx, x: number, y: number, len: number, wid: number, rot: number, light = 0xaee072, base = 0x5fa840) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const b: Build = (c) => {
    c.moveTo(0, 0);
    c.quadraticCurveTo(len * 0.45, -wid, len, 0);
    c.quadraticCurveTo(len * 0.45, wid, 0, 0);
    c.closePath();
  };
  shade(ctx, b, tone(base, darken(base, 0.35), light), { sh: Math.max(0.6, wid * 0.4), hl: 0.5, lw: 1 });
  line(ctx, [len * 0.1, 0, len * 0.8, 0], 0.45, css(darken(base, 0.4), 0.8));
  ctx.restore();
}

function stroked(ctx: Ctx, draw: (c: Ctx) => void, lw: number, color: string, outW = 1.4) {
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

function halo(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: number) {
  glow(ctx, x, y, rx + 3, color, 0.35);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = css(darken(color, 0.55));
  ctx.stroke();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = css(lighten(color, 0.35));
  ctx.stroke();
}

/** Kademe yumruğu (silah dokusunun dönme noktasında). */
function fist(ctx: Ctx, t: number, x: number, y: number, r: number) {
  const m = mat(t);
  switch (t) {
    case 0:
      part(ctx, 0, rpoly(r * 0.5, x - r, y - r * 0.8, x + r, y - r, x + r * 1.05, y + r * 0.9, x - r * 0.9, y + r), [x - r, y - r, r * 2, r * 2], 'main', { grain: 'h' });
      line(ctx, [x + r * 0.2, y - r * 0.6, x + r * 0.25, y + r * 0.6], 0.6, css(m.main.dark));
      break;
    case 1:
      part(ctx, 1, rr(x - r, y - r, r * 2, r * 2, r * 0.7), [x - r, y - r, r * 2, r * 2], 'main');
      rivet(ctx, x + r * 0.35, y - r * 0.3, 0.7, m.trim);
      break;
    case 2:
      part(ctx, 2, rr(x - r, y - r, r * 2, r * 2, r * 0.5), [x - r, y - r, r * 2, r * 2], 'main');
      line(ctx, [x - r * 0.8, y, x + r * 0.8, y], 0.6, css(m.main.dark));
      line(ctx, [x + r * 0.3, y - r * 0.8, x + r * 0.3, y + r * 0.8], 0.6, css(m.main.dark));
      break;
    case 3:
      part(ctx, 3, rpoly(0.6, x - r, y - r * 0.4, x - r * 0.2, y - r * 1.1, x + r, y - r * 0.6, x + r * 0.9, y + r * 0.8, x - r * 0.5, y + r), [x - r, y - r, r * 2, r * 2], 'main');
      break;
    default:
      glow(ctx, x, y, r * 2, PAL(4).glow, 0.4);
      part(ctx, 4, circ(x, y, r), [x - r, y - r, r * 2, r * 2], 'main');
      stroke(ctx, (c) => c.arc(x, y, r * 0.95, Math.PI * 0.6, Math.PI * 1.4), 1.1, css(m.trim.base));
  }
}

// ── bacaklar ─────────────────────────────────────────────
export function drawLeg(t: number, arch: Arch): HTMLCanvasElement {
  const L = LAYOUT[arch];
  const { c, ctx } = makeCanvas(L.legW, L.legH, ART_SCALE);
  ctx.translate(L.legW / 2, 0);
  if (arch === 'heavy') heavyLeg(ctx, t);
  else smallLeg(ctx, t);
  return c;
}

function footPath(x0: number, y0: number, x1: number, y1: number, toe: number): Build {
  return (c) => {
    c.moveTo(x0 + 1, y0);
    c.lineTo(x1 - toe - 1, y0);
    c.quadraticCurveTo(x1, y0 + 0.5, x1, y1 - 1);
    c.quadraticCurveTo(x1, y1, x1 - 1.5, y1);
    c.lineTo(x0 + 1, y1);
    c.quadraticCurveTo(x0, y1, x0, y1 - 1.5);
    c.lineTo(x0, y0 + 1);
    c.quadraticCurveTo(x0, y0, x0 + 1, y0);
    c.closePath();
  };
}

function smallLeg(ctx: Ctx, t: number) {
  const m = mat(t);
  switch (t) {
    case 0:
      part(ctx, 0, rr(-3.8, -1, 7.6, 13.5, 2.5), [-3.8, -1, 7.6, 13.5], 'main');
      part(ctx, 0, footPath(-4.6, 11, 6.8, 16.6, 3), [-4.6, 11, 11.4, 5.6], 'alt', { grain: 'h' });
      line(ctx, [2.5, 13.5, 5.5, 14.2], 0.6, css(m.alt.dark));
      part(ctx, 0, ell(-0.8, 4.6, 3.2, 1.7), [-4, 3, 6.4, 3.4], 'trim', { lw: 1 });
      break;
    case 1:
      part(ctx, 1, rr(-3.5, -1, 7, 13, 2.5), [-3.5, -1, 7, 13], 'alt');
      part(ctx, 1, rr(-4.2, 3.2, 8.4, 8, 2.8), [-4.2, 3.2, 8.4, 8], 'main');
      rivet(ctx, 1.6, 5.4, 0.75, m.trim);
      part(ctx, 1, footPath(-4.6, 11, 7, 16.6, 3), [-4.6, 11, 11.6, 5.6], 'main');
      line(ctx, [2.8, 11.6, 2.8, 16], 0.6, css(m.main.dark));
      break;
    case 2:
      part(ctx, 2, rr(-3.5, -1, 7, 13, 2), [-3.5, -1, 7, 13], 'alt');
      part(ctx, 2, rr(-4, 0.5, 8, 5, 1.5), [-4, 0.5, 8, 5], 'main');
      part(ctx, 2, rr(-3.8, 8, 7.6, 4.2, 1.2), [-3.8, 8, 7.6, 4.2], 'main');
      part(ctx, 2, circ(0.8, 6.6, 2.5), [-1.7, 4.1, 5, 5], 'main');
      part(ctx, 2, footPath(-4.6, 11.2, 7, 16.6, 2.5), [-4.6, 11.2, 11.6, 5.4], 'main');
      line(ctx, [1.6, 11.6, 1.6, 16], 0.55, css(m.main.dark));
      line(ctx, [4.2, 12, 4.2, 16], 0.55, css(m.main.dark));
      break;
    case 3:
      part(ctx, 3, rpoly(0.8, -3.6, -1, 3.6, -1, 4.2, 6, 3, 12, -3, 12, -4.2, 6), [-4.2, -1, 8.4, 13], 'main');
      part(ctx, 3, rpoly(0.8, -4.6, 11, 3, 10.4, 7, 14, 6.6, 16.7, -4.6, 16.7), [-4.6, 10.4, 11.6, 6.3], 'alt');
      part(ctx, 3, poly(3.5, 11, 7.5, 13.6, 4.6, 14.6), [3.5, 11, 4, 3.6], 'trim', { lw: 0.9 });
      break;
    default: {
      const G = PAL(4).glow;
      glow(ctx, 0, 6.8, 4.5, G, 0.7);
      glow(ctx, 1, 11.5, 4, 0x9a6cff, 0.6);
      part(ctx, 4, rr(-3.4, -1, 6.8, 7, 3), [-3.4, -1, 6.8, 7], 'main');
      part(ctx, 4, rr(-3.2, 7.4, 6.4, 3, 1.4), [-3.2, 7.4, 6.4, 3], 'trim', { lw: 1.2 });
      part(ctx, 4, footPath(-4.4, 11.4, 6.8, 16.6, 3), [-4.4, 11.4, 11.2, 5.2], 'alt');
      line(ctx, [-3.6, 13.2, 5.6, 13.2], 0.7, css(m.trim.base));
    }
  }
}

function heavyLeg(ctx: Ctx, t: number) {
  const m = mat(t);
  const col: Box = [-6.5, -1, 13, 17];
  const foot = footPath(-8.6, 14.5, 10.6, 22.8, 4);
  const footBox: Box = [-8.6, 14.5, 19.2, 8.3];
  switch (t) {
    case 0:
      part(ctx, 0, rr(col[0], col[1], col[2], col[3], 4.5), col, 'main');
      part(ctx, 0, foot, footBox, 'alt', { grain: 'h' });
      // kök parmaklar
      part(ctx, 0, capsule(6, 20.8, 10.4, 21.6, 1.6, 1.1), [4.4, 19, 7.6, 4], 'alt', { lw: 1.1 });
      part(ctx, 0, ell(-1.5, 3, 5.6, 2.6), [-7, 0.4, 11, 5.2], 'trim', { lw: 1.1 });
      leaf(ctx, 3.5, 2.5, 5, 2.2, -0.9);
      break;
    case 1:
      part(ctx, 1, rr(col[0], col[1], col[2], col[3], 4.5), col, 'alt');
      part(ctx, 1, rr(-7.4, 5, 14.8, 10, 4), [-7.4, 5, 14.8, 10], 'main');
      rivet(ctx, -4.2, 8, 1, m.trim);
      rivet(ctx, 4, 8, 1, m.trim);
      part(ctx, 1, foot, footBox, 'main');
      part(ctx, 1, rr(4.2, 15.4, 6, 7, 2.5), [4.2, 15.4, 6, 7], 'trim', { lw: 1.1 });
      break;
    case 2:
      part(ctx, 2, rr(col[0], col[1], col[2], col[3], 4), col, 'alt');
      part(ctx, 2, rr(-7, 0, 14, 6.5, 2), [-7, 0, 14, 6.5], 'main');
      part(ctx, 2, rr(-6.6, 9.5, 13.2, 6, 2), [-6.6, 9.5, 13.2, 6], 'main');
      part(ctx, 2, circ(1.5, 8.2, 3.6), [-2.1, 4.6, 7.2, 7.2], 'main');
      rivet(ctx, -4.4, 3.2, 0.9, m.main);
      rivet(ctx, 4.4, 3.2, 0.9, m.main);
      part(ctx, 2, foot, footBox, 'main');
      for (const x of [1.5, 5, 8]) line(ctx, [x, 15.4, x, 22], 0.6, css(m.main.dark));
      break;
    case 3:
      part(ctx, 3, rpoly(1.2, -6.5, -1, 6.5, -1, 7.5, 8, 5.5, 16, -5.5, 16, -7.5, 8), col, 'main');
      part(ctx, 3, rpoly(1.2, -8.6, 14.5, 5, 14, 10.6, 18, 10.2, 22.8, -8.6, 22.8), footBox, 'alt');
      part(ctx, 3, poly(5, 15, 11.5, 17.6, 7, 19.4), [5, 15, 6.5, 4.4], 'trim', { lw: 1 });
      part(ctx, 3, poly(-6, 15, -3.5, 10.5, -1.5, 15), [-6, 10.5, 4.5, 4.5], 'trim', { lw: 1 });
      break;
    default: {
      const G = PAL(4).glow;
      glow(ctx, 0, 9, 7, G, 0.7);
      glow(ctx, 1, 15, 6, 0x9a6cff, 0.6);
      part(ctx, 4, rr(-6, -1, 12, 9.5, 4.5), [-6, -1, 12, 9.5], 'main');
      part(ctx, 4, rr(-5.6, 9.6, 11.2, 4, 1.8), [-5.6, 9.6, 11.2, 4], 'trim', { lw: 1.3 });
      part(ctx, 4, foot, footBox, 'alt');
      line(ctx, [-7.4, 17.5, 9.4, 17.5], 0.9, css(m.trim.base));
      sparkle(ctx, -2.5, 3, 1.4, '#fff6d0');
    }
  }
}

// ── küçük gövde (yakın dövüş & menzilli) ──────────────────
const TORSO: Build = (c) => {
  c.moveTo(-8, -17);
  c.lineTo(7, -17);
  c.quadraticCurveTo(12.5, -27, 12, -36);
  c.quadraticCurveTo(11.5, -43.5, 4, -43.5);
  c.lineTo(-6, -43.5);
  c.quadraticCurveTo(-13, -43.5, -12.5, -35);
  c.quadraticCurveTo(-12, -25, -8, -17);
  c.closePath();
};
const TORSO_CRY: Build = rpoly(1.2, -8, -17, 7, -17, 12, -29, 10.5, -42, 3, -44.5, -7, -43.5, -12.5, -34);
const TORSO_BOX: Box = [-12.5, -44, 25, 27];

export function drawBody(t: number, arch: Arch, team: Team): HTMLCanvasElement {
  const L = LAYOUT[arch];
  const { c, ctx } = makeCanvas(L.bodyW, L.bodyH, ART_SCALE);
  ctx.translate(L.bodyW / 2, L.bodyH - L.hipY - 3);
  if (arch === 'heavy') heavyBody(ctx, t, team);
  else smallBody(ctx, t, arch === 'ranged', team);
  return c;
}

function smallBody(ctx: Ctx, t: number, ranged: boolean, team: Team) {
  const m = mat(t);
  const torso = t === 3 ? TORSO_CRY : TORSO;
  // eter: tüm bedeni saran yumuşak hale
  if (t === 4) glow(ctx, 0, -38, 21, 0x9a6cff, 0.28);

  // 1) arka kol
  if (ranged) {
    part(ctx, t, capsule(-7, -38, -3, -31, 3, 2.8), [-10, -41, 10, 13], 'main', { dim: 0.3 });
  } else {
    part(ctx, t, capsule(-8.5, -37, -11, -29.5, 3.1, 2.9), [-14, -40, 6, 13], 'main', { dim: 0.3 });
    part(ctx, t, capsule(-11, -29.5, -10, -22.5, 2.9, 3.2), [-14, -33, 7, 13], 'main', { dim: 0.3 });
    fistBack(ctx, t, -10, -21.5, 3.4);
  }

  // 2) sırttaki eşya / pelerin
  if (ranged) rangedBack(ctx, t, team);
  else if (t === 4) {
    // eter bekçisi: arkada süzülen altın halka parçaları
    glow(ctx, -10, -36, 8, PAL(4).glow, 0.35);
  }

  // 3) gövde
  part(ctx, t, torso, TORSO_BOX, 'main', { sh: 3, grain: 'v' });
  torsoDetail(ctx, t, ranged, torso);

  // 4) kemer, takım önlüğü
  part(ctx, t, rr(-8.8, -19.5, 17, 7.5, 3), [-8.8, -19.5, 17, 7.5], 'alt');
  cloth(ctx, team, path((c) => {
    c.moveTo(0.5, -18.5);
    c.lineTo(8.6, -18.5);
    c.lineTo(8.2, -9);
    c.quadraticCurveTo(4.6, -6.4, 1, -8.8);
    c.closePath();
  }), [0.5, -18.5, 8, 12]);
  part(ctx, t, rr(-9.6, -22, 19.4, 4.4, 1.6), [-9.6, -22, 19.4, 4.4], 'alt', { lw: 1.3 });
  part(ctx, t, rr(2.4, -22.6, 4.4, 5.6, 1.2), [2.4, -22.6, 4.4, 5.6], 'trim', { lw: 1.1 });

  // 5) yakın dövüş: çapraz takım kuşağı
  if (!ranged) {
    inside(ctx, torso, () => {
      cloth(ctx, team, poly(3.5, -45, 10.5, -42, -5, -15, -12.5, -19), [-12.5, -45, 23, 30], { stripe: false, lw: 1.2 });
    });
    stroke(ctx, torso, 1.5);
  }

  // 6) baş
  if (ranged) rangedHead(ctx, t, team);
  else meleeHead(ctx, t, team);

  // 7) menzilli: atkı + çeken el
  if (ranged) {
    cloth(ctx, team, path((c) => {
      c.moveTo(-5, -44.5);
      c.quadraticCurveTo(-10, -43, -15.5, -38.5);
      c.lineTo(-13.5, -36.5);
      c.quadraticCurveTo(-9, -40, -4, -41);
      c.closePath();
    }), [-15.5, -44.5, 11.5, 8]);
    cloth(ctx, team, rr(-6.5, -45.5, 16.5, 4.6, 2.2), [-6.5, -45.5, 16.5, 4.6]);
    part(ctx, t, capsule(-3, -31, 5, -28.6, 2.7, 2.6), [-6, -34, 14, 8], 'main', { dim: 0.15 });
    fistBack(ctx, t, 6, -28.2, 2.9, 0.1);
  }

  // 8) ön kol (yumruk silah dokusunda)
  const fx = ranged ? 14 : 15;
  const fy = ranged ? -28 : -25.5;
  const ex = ranged ? 11.5 : 11.5;
  const ey = ranged ? -32 : -30.5;
  part(ctx, t, capsule(9, -37.5, ex, ey, 3.2, 3), [6, -41, 9, 13], 'main');
  part(ctx, t, capsule(ex, ey, fx, fy, 3.1, 3.3), [ex - 3, ey - 3, fx - ex + 6, fy - ey + 6], 'main');
  pauldron(ctx, t, 8.4, -39.4, ranged ? 0.85 : 1);
  void m;
}

function fistBack(ctx: Ctx, t: number, x: number, y: number, r: number, dim = 0.3) {
  part(ctx, t, t === 3 ? rpoly(0.6, x - r, y - r * 0.5, x, y - r, x + r, y - r * 0.3, x + r * 0.8, y + r, x - r * 0.6, y + r) : circ(x, y, r), [x - r, y - r, r * 2, r * 2], 'main', { dim });
}

function pauldron(ctx: Ctx, t: number, x: number, y: number, s: number) {
  const m = mat(t);
  switch (t) {
    case 0:
      part(ctx, 0, ell(x, y, 5.4 * s, 4.4 * s), [x - 5.4 * s, y - 4.4 * s, 10.8 * s, 8.8 * s], 'alt', { grain: 'h' });
      part(ctx, 0, ell(x - 0.8, y - 2.6 * s, 4.2 * s, 2 * s), [x - 5, y - 4.6 * s, 8.4 * s, 4 * s], 'trim', { lw: 1 });
      break;
    case 1:
      part(ctx, 1, path((c) => {
        c.moveTo(x - 5.5 * s, y + 3 * s);
        c.quadraticCurveTo(x - 6 * s, y - 5 * s, x + 0.5, y - 5 * s);
        c.quadraticCurveTo(x + 6.5 * s, y - 4.5 * s, x + 6 * s, y + 3.5 * s);
        c.quadraticCurveTo(x, y + 1.5 * s, x - 5.5 * s, y + 3 * s);
        c.closePath();
      }), [x - 6 * s, y - 5 * s, 12.5 * s, 8.5 * s], 'main');
      rivet(ctx, x + 2.5 * s, y - 1 * s, 0.8, m.trim);
      rivet(ctx, x - 2.5 * s, y - 1.4 * s, 0.8, m.trim);
      break;
    case 2:
      part(ctx, 2, rr(x - 5.5 * s, y - 4.5 * s, 11.5 * s, 6 * s, 2.5), [x - 5.5 * s, y - 4.5 * s, 11.5 * s, 6 * s], 'main');
      part(ctx, 2, rr(x - 4.5 * s, y + 0.2 * s, 10 * s, 4.4 * s, 2), [x - 4.5 * s, y, 10 * s, 4.4 * s], 'main');
      rivet(ctx, x + 3.2 * s, y - 2 * s, 0.75, m.main);
      break;
    case 3:
      part(ctx, 3, rpoly(0.8, x - 5 * s, y + 3 * s, x - 3.5 * s, y - 3 * s, x + 1, y - 5 * s, x + 6 * s, y - 1 * s, x + 5 * s, y + 3.5 * s), [x - 5 * s, y - 5 * s, 11 * s, 8.5 * s], 'main');
      part(ctx, 3, poly(x - 2 * s, y - 3.5 * s, x - 3 * s, y - 9 * s, x + 1.5 * s, y - 4 * s), [x - 3 * s, y - 9 * s, 4.5 * s, 5.5 * s], 'trim', { lw: 1 });
      break;
    default:
      glow(ctx, x, y, 7 * s, PAL(4).glow, 0.4);
      part(ctx, 4, ell(x, y, 5.2 * s, 4.4 * s), [x - 5.2 * s, y - 4.4 * s, 10.4 * s, 8.8 * s], 'main');
      stroke(ctx, (c) => c.ellipse(x, y + 0.5, 5 * s, 3.6 * s, 0, 0.1, Math.PI - 0.1), 1.2, css(m.trim.base));
  }
}

function torsoDetail(ctx: Ctx, t: number, ranged: boolean, torso: Build) {
  const m = mat(t);
  switch (t) {
    case 0:
      inside(ctx, torso, () => {
        // kabuk yamaları ve omuz yosunu
        part(ctx, 0, path((c) => {
          c.moveTo(-13, -36);
          c.quadraticCurveTo(-9, -33, -10, -24);
          c.quadraticCurveTo(-11, -20, -13, -19);
          c.closePath();
        }), [-13, -36, 4, 17], 'alt', { lw: 1 });
        part(ctx, 0, path((c) => {
          c.moveTo(-14, -40);
          c.quadraticCurveTo(-8, -46.5, 4, -44.5);
          c.quadraticCurveTo(2, -41.5, -2, -41.5);
          c.quadraticCurveTo(-5, -38.5, -8, -40);
          c.quadraticCurveTo(-11, -37, -14, -37);
          c.closePath();
        }), [-14, -46, 18, 9], 'trim', { lw: 1 });
      });
      stroke(ctx, torso, 1.5);
      leaf(ctx, -9, -43, 5, 2, -2.3);
      leaf(ctx, -7, -44, 4.2, 1.8, -1.4);
      break;
    case 1:
      // göğüs plakası çizgileri, perçinler
      stroke(ctx, (c) => {
        c.moveTo(-10, -34);
        c.quadraticCurveTo(-1, -29, 11, -33);
      }, 0.8, css(m.main.dark));
      stroke(ctx, (c) => {
        c.moveTo(-9, -27);
        c.quadraticCurveTo(0, -24, 10, -27);
      }, 0.7, css(m.main.dark, 0.8));
      for (const [x, y] of [[-8, -40], [-2, -41], [4, -41], [-6, -31.5], [6, -31]]) rivet(ctx, x, y, 0.8, m.trim);
      break;
    case 2:
      // plakalar, boyunluk, perçinler
      line(ctx, [-11.5, -28, 11.5, -28], 0.8, css(m.main.dark));
      line(ctx, [-10, -22.5, 9.5, -22.5], 0.8, css(m.main.dark));
      line(ctx, [5, -42, 6.5, -29], 0.9, css(m.main.light, 0.8));
      for (const [x, y] of [[-9, -30], [-9, -24.5], [8.5, -30], [8.5, -24.5]]) rivet(ctx, x, y, 0.75, m.main);
      part(ctx, 2, rr(-6, -46, 12.5, 4, 1.6), [-6, -46, 12.5, 4], 'alt', { lw: 1.2 });
      if (!ranged) {
        glow(ctx, -1, -35, 3, PAL(2).glow, 0.5);
      }
      break;
    case 3:
      // içten ışıyan çekirdek ve arduvaz omuz kemeri
      glow(ctx, 0, -32, 9, PAL(3).glow, 0.45);
      part(ctx, 3, poly(-13, -38, -8, -36, -9.5, -30, -13, -31), [-13, -38, 5, 8], 'trim', { lw: 1 });
      break;
    default:
      // altın yaka ve rün
      inside(ctx, torso, () => {
        part(ctx, 4, path((c) => {
          c.moveTo(-14, -44);
          c.lineTo(13, -44);
          c.lineTo(12, -40);
          c.quadraticCurveTo(0, -37, -13, -40);
          c.closePath();
        }), [-14, -44, 27, 7], 'trim', { lw: 1.1 });
      });
      stroke(ctx, torso, 1.5);
      glow(ctx, 0, -30, 6, PAL(4).glow, 0.55);
      ctx.save();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = css(lighten(PAL(4).glow, 0.4));
      ctx.beginPath();
      ctx.arc(0, -30, 2.8, 0, Math.PI * 2);
      ctx.moveTo(0, -34);
      ctx.lineTo(0, -26);
      ctx.moveTo(-3.6, -30);
      ctx.lineTo(3.6, -30);
      ctx.stroke();
      ctx.restore();
  }
}

function meleeHead(ctx: Ctx, t: number, team: Team) {
  const m = mat(t);
  const T = TEAM[team];
  switch (t) {
    case 0: {
      // kütük kafa, bandana, filiz
      line(ctx, [1, -56, 0, -59.5, -1.5, -61.5], 1.1, css(m.alt.base));
      leaf(ctx, -1.4, -61.2, 4.2, 1.8, -2.6);
      leaf(ctx, -1, -60.2, 4, 1.7, -0.4);
      part(ctx, 0, rr(-6, -56.5, 16, 15, 4.5), [-6, -56.5, 16, 15], 'main');
      fill(ctx, ell(2, -56, 7.4, 1.8), css(m.main.light));
      stroke(ctx, ell(2, -56, 4.4, 1), 0.5, css(m.main.dark, 0.7));
      stroke(ctx, ell(2, -56, 7.4, 1.8), 1.2);
      cloth(ctx, team, path((c) => {
        c.moveTo(-6, -53);
        c.quadraticCurveTo(-10, -53.5, -13.5, -50.5);
        c.lineTo(-12, -48.6);
        c.quadraticCurveTo(-9, -50.5, -6, -50.2);
        c.closePath();
      }), [-13.5, -53.5, 7.5, 5]);
      cloth(ctx, team, rr(-6.6, -53.6, 17.2, 3.8, 1.2), [-6.6, -53.6, 17.2, 3.8], { stripe: false });
      fill(ctx, rr(3.4, -50.2, 3.4, 2.6, 1), '#1d120a');
      fill(ctx, rr(7.2, -50.2, 3.2, 2.6, 1), '#1d120a');
      eye(ctx, 5.1, -48.9, 2.3, 1.7, T, 3.6);
      eye(ctx, 8.8, -48.9, 2.1, 1.7, T, 3.6);
      line(ctx, [4.5, -45, 6.5, -44.4, 9, -45.2], 0.7, css(m.main.dark));
      break;
    }
    case 1: {
      cloth(ctx, team, path((c) => {
        c.moveTo(6.5, -55.5);
        c.quadraticCurveTo(4, -62.6, -4, -62.2);
        c.quadraticCurveTo(-12, -61.2, -15, -51.5);
        c.quadraticCurveTo(-11, -55, -7, -56.4);
        c.quadraticCurveTo(-1, -58.4, 3.5, -56.6);
        c.closePath();
      }), [-15, -62.6, 21.5, 11]);
      const helm: Build = (c) => {
        c.moveTo(-6.5, -44);
        c.lineTo(-6.5, -50);
        c.quadraticCurveTo(-6, -57.5, 2, -57.5);
        c.quadraticCurveTo(10, -57.5, 10.6, -50);
        c.lineTo(10.6, -44);
        c.quadraticCurveTo(2, -42, -6.5, -44);
        c.closePath();
      };
      part(ctx, 1, helm, [-6.5, -57.5, 17, 15.5], 'main', { sh: 2.6 });
      fill(ctx, poly(2.6, -52.2, 10.8, -52.2, 10.8, -49.6, 8.6, -49.6, 8.6, -44.4, 6.2, -44.4, 6.2, -49.6, 2.6, -49.6), '#1a1008');
      eye(ctx, 4.6, -50.9, 2, 1.4, T, 3.4);
      eye(ctx, 9.4, -50.9, 1.6, 1.4, T, 3.4);
      line(ctx, [-6.4, -50, 2.4, -51.5], 0.9, css(m.main.dark));
      part(ctx, 1, rr(-3, -58.6, 8, 2.4, 1), [-3, -58.6, 8, 2.4], 'trim', { lw: 1 });
      rivet(ctx, -3.6, -47.5, 0.8, m.trim);
      break;
    }
    case 2: {
      cloth(ctx, team, path((c) => {
        c.moveTo(-1, -56.8);
        c.quadraticCurveTo(-7, -61, -14, -56);
        c.quadraticCurveTo(-12.5, -53, -14.5, -50);
        c.quadraticCurveTo(-10, -55, -5, -54.5);
        c.closePath();
      }), [-14.5, -60, 14, 10]);
      part(ctx, 2, rr(-6.5, -57.4, 17, 15.6, 3.5), [-6.5, -57.4, 17, 15.6], 'main', { sh: 2.6 });
      line(ctx, [9.6, -56.5, 9.6, -43], 0.9, css(m.main.light, 0.9));
      fill(ctx, rr(1.6, -52.4, 9.4, 3, 1.2), '#0e0f14');
      glow(ctx, 6.6, -50.9, 6, T, 0.8);
      fill(ctx, rr(2.4, -51.7, 8, 1.6, 0.8), css(lighten(T, 0.55)));
      fill(ctx, rr(3, -51.5, 2.4, 0.9, 0.45), '#ffffff');
      for (const [x, y] of [[6.6, -46.8], [8.4, -46.8], [7.5, -45]]) fill(ctx, circ(x, y, 0.55), '#16181d');
      rivet(ctx, -4, -54.5, 0.75, m.main);
      rivet(ctx, -4, -45.5, 0.75, m.main);
      break;
    }
    case 3: {
      part(ctx, 3, poly(-4, -54, -8, -61, -0.5, -55.5), [-8, -61, 7.5, 7], 'trim', { lw: 1 });
      part(ctx, 3, poly(0.5, -56, 2, -61.4, 4.2, -56.4), [0.5, -61.4, 3.7, 5.4], 'trim', { lw: 1 });
      part(ctx, 3, rpoly(1, -5.5, -43.5, -6.5, -51.5, -1.5, -57, 7, -57, 10.6, -51, 9.6, -43.5), [-6.5, -57, 17, 13.5], 'main', { sh: 2.4 });
      eye(ctx, 4.8, -50, 2.1, 1.6, T, 3.6);
      eye(ctx, 8.5, -50, 1.8, 1.6, T, 3.6);
      glow(ctx, 2.8, -54, 3.2, T, 0.8);
      fill(ctx, poly(2.8, -55.6, 4.2, -54, 2.8, -52.4, 1.4, -54), css(lighten(T, 0.5)));
      stroke(ctx, poly(2.8, -55.6, 4.2, -54, 2.8, -52.4, 1.4, -54), 0.7);
      break;
    }
    default: {
      glow(ctx, 2, -43.5, 5, PAL(4).glow, 0.8);
      const head = circ(2, -50, 7);
      part(ctx, 4, head, [-5, -57, 14, 14], 'main');
      inside(ctx, head, () => part(ctx, 4, rr(-1, -52.8, 13, 4.4, 2), [-1, -52.8, 13, 4.4], 'trim', { lw: 1 }));
      stroke(ctx, head, 1.5);
      eye(ctx, 5.2, -50.6, 2.2, 1.6, T, 3.8);
      eye(ctx, 8.9, -50.6, 1.8, 1.6, T, 3.8);
      halo(ctx, 0.5, -58.6, 6.4, 1.7, PAL(4).glow);
    }
  }
}

function rangedHead(ctx: Ctx, t: number, team: Team) {
  const m = mat(t);
  const T = TEAM[team];
  switch (t) {
    case 0: {
      // söğüt okçu: ahşap baş, takım başlığı, sarkan söğüt yaprakları
      part(ctx, 0, circ(2.6, -49.6, 6.8), [-4.2, -56.4, 13.6, 13.6], 'main');
      cloth(ctx, team, path((c) => {
        c.moveTo(9.8, -53);
        c.quadraticCurveTo(7.5, -59, 0, -58.4);
        c.quadraticCurveTo(-7, -57.6, -8, -49);
        c.quadraticCurveTo(-9, -44.5, -12.5, -42);
        c.lineTo(-4, -42.6);
        c.quadraticCurveTo(-1.4, -47, 0, -51.5);
        c.quadraticCurveTo(4, -54, 9.8, -53);
        c.closePath();
      }), [-12.5, -59, 22.3, 17]);
      leaf(ctx, -1, -57.6, 5, 1.7, 2.2);
      leaf(ctx, -4.5, -55.5, 5.4, 1.7, 2.0);
      leaf(ctx, 3, -58, 4.4, 1.5, 2.6);
      eye(ctx, 5.4, -49.4, 2.2, 1.7, T, 3.6);
      eye(ctx, 8.8, -49.4, 1.9, 1.7, T, 3.6);
      break;
    }
    case 1: {
      // arbaletçi: kenarlı miğfer, takım bandı
      part(ctx, 1, rr(-4.6, -53.6, 14, 11.6, 4), [-4.6, -53.6, 14, 11.6], 'alt');
      eye(ctx, 5.2, -48.8, 2.1, 1.6, T, 3.4);
      eye(ctx, 8.6, -48.8, 1.8, 1.6, T, 3.4);
      part(ctx, 1, path((c) => {
        c.moveTo(-4.8, -52.5);
        c.quadraticCurveTo(-4.5, -59.2, 2.4, -59.2);
        c.quadraticCurveTo(9.3, -59.2, 9.6, -52.5);
        c.closePath();
      }), [-4.8, -59.2, 14.4, 6.7], 'main');
      cloth(ctx, team, rr(-4.6, -55, 14, 2.6, 0.8), [-4.6, -55, 14, 2.6], { stripe: false, lw: 1.1 });
      part(ctx, 1, ell(2.4, -52.4, 10.4, 2), [-8, -54.4, 20.8, 4], 'main', { lw: 1.4 });
      break;
    }
    case 2: {
      // topçu: kasket, gözlük
      part(ctx, 2, rr(-5.4, -55, 15.4, 13.4, 4), [-5.4, -55, 15.4, 13.4], 'main');
      part(ctx, 2, path((c) => {
        c.moveTo(-6, -53);
        c.quadraticCurveTo(-6, -59.6, 2, -59.6);
        c.quadraticCurveTo(9.5, -59.6, 10, -53);
        c.lineTo(13.5, -52.6);
        c.lineTo(13, -51.4);
        c.lineTo(-6, -51.4);
        c.closePath();
      }), [-6, -59.6, 19.5, 8.2], 'alt');
      cloth(ctx, team, rr(-6, -55.2, 16, 2.6, 0.8), [-6, -55.2, 16, 2.6], { stripe: false, lw: 1.1 });
      for (const [x, r] of [[5.4, 2.3], [9.2, 2]] as const) {
        part(ctx, 2, circ(x, -48.6, r + 0.8), [x - r - 0.8, -49.4 - r, r * 2 + 1.6, r * 2 + 1.6], 'trim', { lw: 1.1 });
        eye(ctx, x, -48.6, r * 1.3, r * 1.3, T, 3.4);
      }
      line(ctx, [-5, -48.6, 3, -48.6], 1, css(m.trim.dark));
      for (const x of [5, 6.8, 8.6]) line(ctx, [x, -45.4, x, -43.6], 0.6, css(m.main.dark));
      break;
    }
    case 3: {
      // prizma büyücü: sivri başlık, karanlık yüz, kristal taç
      part(ctx, 3, poly(-2, -56, -1, -61.4, 2, -56.6), [-2, -61.4, 4, 5.4], 'trim', { lw: 1 });
      part(ctx, 3, poly(2, -56.6, 4.2, -60.6, 5.4, -55.6), [2, -60.6, 3.4, 5], 'trim', { lw: 1 });
      cloth(ctx, team, path((c) => {
        c.moveTo(10.4, -45.5);
        c.quadraticCurveTo(10, -55, 2.4, -57.8);
        c.quadraticCurveTo(-4.5, -60, -10.5, -56.5);
        c.quadraticCurveTo(-7.5, -51, -9.5, -43);
        c.lineTo(0, -43);
        c.closePath();
      }), [-10.5, -60, 21, 17]);
      fill(ctx, ell(5.8, -49.2, 4.2, 4.8), '#0b1630');
      eye(ctx, 4.8, -49.8, 2, 1.6, T, 3.4);
      eye(ctx, 7.9, -49.8, 1.7, 1.6, T, 3.4);
      break;
    }
    default: {
      // eter gözü: başın kendisi dev bir göz
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.5;
        part(ctx, 4, poly(2.5 + Math.cos(a - 0.12) * 7, -50 + Math.sin(a - 0.12) * 7, 2.5 + Math.cos(a) * 11, -50 + Math.sin(a) * 11, 2.5 + Math.cos(a + 0.12) * 7, -50 + Math.sin(a + 0.12) * 7), [-9, -61, 23, 12], 'trim', { lw: 0.9 });
      }
      glow(ctx, 2.5, -50, 11, PAL(4).glow, 0.35);
      const orb = circ(2.5, -50, 7.6);
      part(ctx, 4, orb, [-5.1, -57.6, 15.2, 15.2], 'alt');
      inside(ctx, orb, () => {
        glow(ctx, 5.2, -50, 6, T, 0.9);
        fill(ctx, circ(5.2, -50, 3.8), css(T));
        fill(ctx, circ(5.2, -50, 3.8), css(lighten(T, 0.3), 0.5));
        fill(ctx, circ(6, -50, 1.6), '#120a24');
        fill(ctx, circ(4.2, -51.3, 0.9), '#ffffff');
        part(ctx, 4, path((c) => {
          c.moveTo(-6, -58);
          c.lineTo(12, -58);
          c.lineTo(12, -54);
          c.quadraticCurveTo(4, -51.5, -6, -54.6);
          c.closePath();
        }), [-6, -58, 18, 6], 'trim', { lw: 1.1 });
      });
      stroke(ctx, orb, 1.5);
    }
  }
}

function rangedBack(ctx: Ctx, t: number, team: Team) {
  const m = mat(t);
  const T = TEAM[team];
  switch (t) {
    case 0: {
      for (const [x0, x1] of [[-12.5, -15.5], [-10.4, -11.6]]) {
        line(ctx, [x0, -42, x1, -50.5], 2.2, OUTC);
        line(ctx, [x0, -42, x1, -50.5], 1, css(m.main.light));
        cloth(ctx, team, poly(x1, -50.5, x1 - 2.2, -48.4, x1 - 1.4, -45.4, x1 + 0.4, -47.6), [x1 - 2.2, -50.5, 2.6, 5], { stripe: false, lw: 0.9 });
      }
      part(ctx, 0, poly(-15, -42.5, -9.5, -44.5, -6.5, -27, -11.5, -25.5), [-15, -44.5, 8.5, 19], 'alt');
      part(ctx, 0, rr(-14.6, -38, 7.4, 2.6, 1), [-14.6, -38, 7.4, 2.6], 'trim', { lw: 1 });
      break;
    }
    case 1: {
      for (const x of [-13, -10.5]) {
        line(ctx, [x, -42, x - 1, -49], 2, OUTC);
        line(ctx, [x, -42, x - 1, -49], 0.9, css(m.alt.light));
        fill(ctx, poly(x - 2.2, -48.6, x - 1, -51.6, x + 0.2, -48.6), css(m.main.light));
        stroke(ctx, poly(x - 2.2, -48.6, x - 1, -51.6, x + 0.2, -48.6), 0.8);
      }
      part(ctx, 1, rr(-15, -44, 8, 18, 2.5), [-15, -44, 8, 18], 'alt');
      part(ctx, 1, rr(-15.6, -40, 9.2, 2.6, 1), [-15.6, -40, 9.2, 2.6], 'main', { lw: 1 });
      part(ctx, 1, rr(-15.6, -31, 9.2, 2.6, 1), [-15.6, -31, 9.2, 2.6], 'main', { lw: 1 });
      break;
    }
    case 2: {
      // barut fıçısı + gülleler
      part(ctx, 2, circ(-13, -46.4, 2.6), [-15.6, -49, 5.2, 5.2], 'alt', { lw: 1.1 });
      part(ctx, 2, circ(-9, -46.8, 2.4), [-11.4, -49.2, 4.8, 4.8], 'alt', { lw: 1.1 });
      part(ctx, 0, rr(-16, -44.5, 10, 17, 3.5), [-16, -44.5, 10, 17], 'main');
      part(ctx, 2, rr(-16.6, -41, 11.2, 2.4, 1), [-16.6, -41, 11.2, 2.4], 'alt', { lw: 1 });
      part(ctx, 2, rr(-16.6, -32, 11.2, 2.4, 1), [-16.6, -32, 11.2, 2.4], 'alt', { lw: 1 });
      break;
    }
    case 3: {
      // takım pelerini + sırt kristalleri
      cloth(ctx, team, path((c) => {
        c.moveTo(-4, -44);
        c.quadraticCurveTo(-12, -42, -15.5, -30);
        c.quadraticCurveTo(-17, -22, -14, -15);
        c.lineTo(-6, -17);
        c.closePath();
      }), [-17, -44, 13, 29]);
      part(ctx, 3, poly(-12, -40, -17, -51, -8.5, -42), [-17, -51, 8.5, 11], 'main', { lw: 1.1 });
      part(ctx, 3, poly(-9, -42, -9.5, -54.4, -5, -43.5), [-9.5, -54.4, 4.5, 12], 'trim', { lw: 1.1 });
      break;
    }
    default: {
      // eter: arkada süzülen altın rün halkası
      glow(ctx, -9, -36, 12, PAL(4).glow, 0.3);
      ctx.save();
      ctx.beginPath();
      ctx.arc(-9, -36, 9, 0, Math.PI * 2);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = OUTC;
      ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = css(m.trim.base);
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        const a = i * (Math.PI / 2) + 0.4;
        sparkle(ctx, -9 + Math.cos(a) * 9, -36 + Math.sin(a) * 9, 1.8, '#fff3c0');
      }
      glow(ctx, -9, -36, 3, T, 0.8);
    }
  }
}

// ── ağır gövde ───────────────────────────────────────────
const HTORSO: Build = (c) => {
  c.moveTo(-15, -18);
  c.lineTo(13, -18);
  c.quadraticCurveTo(23, -29, 23, -45);
  c.quadraticCurveTo(23, -61, 13, -68);
  c.quadraticCurveTo(-1, -79, -17, -73);
  c.quadraticCurveTo(-30, -66, -28, -46);
  c.quadraticCurveTo(-26, -28, -15, -18);
  c.closePath();
};
const HTORSO_CRY: Build = rpoly(2, -15, -18, 13, -18, 23, -36, 21, -60, 10, -70, -6, -78, -20, -72, -29, -55, -26, -32);
const HBOX: Box = [-29, -78, 52, 60];

function heavyBody(ctx: Ctx, t: number, team: Team) {
  const m = mat(t);
  const T = TEAM[team];
  const torso = t === 3 ? HTORSO_CRY : HTORSO;

  // sırt süsleri (gövdenin arkasında)
  switch (t) {
    case 0:
      line(ctx, [-12, -72, -16, -80, -20, -82], 1.8, css(m.alt.base));
      leaf(ctx, -20, -81.5, 6, 2.4, -2.6);
      leaf(ctx, -16.5, -79.5, 5.5, 2.2, -0.7);
      leaf(ctx, -14.5, -76, 5, 2, 0.2);
      break;
    case 2:
      // baca
      part(ctx, 2, rr(-22, -82, 6, 14, 1.5), [-22, -82, 6, 14], 'alt');
      part(ctx, 2, rr(-23, -83, 8, 3, 1), [-23, -83, 8, 3], 'main', { lw: 1.1 });
      glow(ctx, -19, -82, 4, PAL(2).glow, 0.6);
      break;
    case 3:
      part(ctx, 3, poly(-24, -62, -33, -82, -16, -68), [-33, -82, 17, 20], 'main');
      part(ctx, 3, poly(-14, -72, -14, -83, -5, -74), [-14, -83, 9, 11], 'trim');
      part(ctx, 3, poly(-28, -48, -35, -60, -25, -56), [-35, -60, 10, 12], 'trim', { lw: 1.2 });
      break;
    case 4:
      glow(ctx, -2, -50, 35, 0x9a6cff, 0.25);
      halo(ctx, 22, -81.5, 11, 2.8, PAL(4).glow);
      break;
  }

  // arka kol
  part(ctx, t, circ(-19, -61, 9), [-28, -70, 18, 18], 'main', { dim: 0.3 });
  part(ctx, t, capsule(-20, -58, -24, -43, 6.5, 6), [-30, -64, 13, 27], 'main', { dim: 0.3 });
  part(ctx, t, capsule(-24, -43, -26, -32, 7, 8), [-33, -50, 15, 26], 'main', { dim: 0.3 });
  part(ctx, t, t === 3 ? rpoly(1.4, -34, -33, -26, -36, -18, -32, -19, -22, -33, -22) : rr(-34, -35, 16, 14, 5), [-34, -36, 16, 14], 'main', { dim: 0.3 });

  // gövde
  part(ctx, t, torso, HBOX, 'main', { sh: 4.5, hl: 1.2, lw: 1.8 });
  heavyDetail(ctx, t, torso);

  // leğen, takım peştamalı
  part(ctx, t, rr(-17, -27, 32, 11, 4), [-17, -27, 32, 11], 'alt', { lw: 1.6 });
  cloth(ctx, team, path((c) => {
    c.moveTo(-2, -21);
    c.lineTo(12, -21);
    c.lineTo(11, -6);
    c.quadraticCurveTo(5, -3, -1, -6);
    c.closePath();
  }), [-2, -21, 14, 17]);
  part(ctx, t, rr(-18, -29, 34, 5, 2), [-18, -29, 34, 5], t === 0 ? 'alt' : 'trim', { lw: 1.4 });

  // sırttaki takım örtüsü (önden kol kapatsa da her zaman görünür)
  cloth(ctx, team, path((c) => {
    c.moveTo(-2, -75.5);
    c.quadraticCurveTo(-20, -77.5, -27.5, -64);
    c.lineTo(-30.5, -50);
    c.lineTo(-27.4, -53.2);
    c.lineTo(-25, -49.4);
    c.lineTo(-22.2, -54);
    c.lineTo(-19.6, -51.2);
    c.lineTo(-17, -57);
    c.quadraticCurveTo(-12, -65, -1, -69.5);
    c.closePath();
  }), [-30.5, -77.5, 30, 28]);
  part(ctx, t, path((c) => {
    c.moveTo(-1, -76.6);
    c.quadraticCurveTo(-12, -78, -18.5, -73);
    c.lineTo(-16.5, -70.6);
    c.quadraticCurveTo(-10, -74.4, -0.5, -73);
    c.closePath();
  }), [-18.5, -78, 18, 7.4], t === 0 ? 'alt' : 'trim', { lw: 1.1 });

  // takım çekirdeği (iki kol arasında, görünür bölgede)
  const cx = -8;
  const cy = -44;
  glow(ctx, cx, cy, 13, T, 0.75);
  part(ctx, t, circ(cx, cy, 7), [cx - 7, cy - 7, 14, 14], 'alt', { lw: 1.5 });
  fill(ctx, circ(cx, cy, 4.9), css(darken(T, 0.35)));
  fill(ctx, circ(cx, cy, 4.1), css(T));
  glow(ctx, cx - 0.6, cy - 0.6, 4, lighten(T, 0.7), 0.9, 0xffffff);
  sparkle(ctx, cx - 1.6, cy - 1.8, 1.8, '#ffffff');

  // boyun yuvası (baş gövdeye gömülü dursun)
  part(ctx, t, ell(17, -62, 9, 6), [8, -68, 18, 12], 'alt', { dim: 0.25, lw: 1.4 });
  // baş (öne ve yukarı: omuzluk başı örtmesin)
  ctx.save();
  ctx.translate(2, -4);
  heavyHead(ctx, t, team);
  ctx.restore();
}

function heavyDetail(ctx: Ctx, t: number, torso: Build) {
  const m = mat(t);
  switch (t) {
    case 0:
      inside(ctx, torso, () => {
        part(ctx, 0, path((c) => {
          c.moveTo(-30, -60);
          c.quadraticCurveTo(-20, -55, -22, -38);
          c.quadraticCurveTo(-22, -26, -30, -20);
          c.closePath();
        }), [-30, -60, 9, 40], 'alt', { lw: 1.2 });
        part(ctx, 0, path((c) => {
          c.moveTo(-30, -66);
          c.quadraticCurveTo(-14, -84, 12, -70);
          c.quadraticCurveTo(10, -64, 2, -66);
          c.quadraticCurveTo(-4, -60, -12, -64);
          c.quadraticCurveTo(-20, -58, -30, -60);
          c.closePath();
        }), [-30, -80, 42, 22], 'trim', { lw: 1.2 });
        part(ctx, 0, ell(16, -28, 5, 3), [11, -31, 10, 6], 'trim', { lw: 1 });
      });
      stroke(ctx, torso, 1.8);
      // mantar
      part(ctx, 0, rr(-27.5, -42, 2.4, 4, 1), [-27.5, -42, 2.4, 4], 'alt', { lw: 0.9, plain: true });
      tonePart(ctx, tone(0xe0553a, 0x9a2c1c, 0xff9a7a), ell(-27, -42.5, 3.6, 2), [-30.6, -44.5, 7.2, 4], { lw: 1 });
      fill(ctx, circ(-28, -43, 0.6), '#fff');
      break;
    case 1:
      stroke(ctx, (c) => {
        c.moveTo(-26, -40);
        c.quadraticCurveTo(-4, -33, 22, -40);
      }, 0.9, css(m.main.dark));
      stroke(ctx, (c) => {
        c.moveTo(-24, -31);
        c.quadraticCurveTo(-4, -26, 19, -31);
      }, 0.9, css(m.main.dark));
      for (const [x, y] of [[-20, -63], [-9, -69], [3, -68], [-23, -48], [-20, -36], [17, -38], [19, -52]]) rivet(ctx, x, y, 1.1, m.trim);
      // yeşil pas lekeleri
      inside(ctx, torso, () => {
        fill(ctx, ell(-24, -54, 2.4, 1.6), 'rgba(80,180,150,0.55)');
        fill(ctx, ell(-21, -27, 2, 1.2), 'rgba(80,180,150,0.5)');
      });
      break;
    case 2:
      line(ctx, [-27, -52, 22.5, -52], 1, css(m.main.dark));
      line(ctx, [-26, -36, 22, -36], 1, css(m.main.dark));
      line(ctx, [-12, -76, -14, -52], 1, css(m.main.dark));
      for (const [x, y] of [[-23, -56], [-23, -40], [-8, -56], [17, -56], [19, -40], [-18, -66], [-6, -71]]) rivet(ctx, x, y, 1, m.main);
      // ocak ızgarası
      part(ctx, 2, rr(-22, -33, 14, 9, 2), [-22, -33, 14, 9], 'alt', { lw: 1.2 });
      glow(ctx, -15, -28.5, 8, PAL(2).glow, 0.7);
      for (const x of [-19, -15, -11]) line(ctx, [x, -32, x, -25], 1.2, '#2a1a10');
      break;
    case 3:
      glow(ctx, 0, -45, 20, PAL(3).glow, 0.35);
      part(ctx, 3, poly(-26, -40, -18, -36, -21, -26, -27, -30), [-27, -40, 9, 14], 'alt', { lw: 1.2 });
      part(ctx, 3, poly(-6, -76, 6, -71, -2, -66), [-6, -76, 12, 10], 'trim', { lw: 1.2 });
      break;
    default:
      inside(ctx, torso, () => {
        part(ctx, 4, path((c) => {
          c.moveTo(-32, -58);
          c.quadraticCurveTo(-6, -84, 26, -60);
          c.lineTo(26, -54);
          c.quadraticCurveTo(-6, -76, -32, -52);
          c.closePath();
        }), [-32, -78, 58, 26], 'trim', { lw: 1.2 });
        part(ctx, 4, path((c) => {
          c.moveTo(-32, -32);
          c.quadraticCurveTo(-4, -26, 26, -32);
          c.lineTo(26, -28);
          c.quadraticCurveTo(-4, -22, -32, -28);
          c.closePath();
        }), [-32, -32, 58, 8], 'trim', { lw: 1.1 });
      });
      stroke(ctx, torso, 1.8);
      for (const [x, y, r] of [[-18, -48, 1.6], [14, -30, 1.3], [-8, -62, 1.4]]) sparkle(ctx, x, y, r * 1.6, '#fff4c0');
  }
}

function heavyHead(ctx: Ctx, t: number, team: Team) {
  const m = mat(t);
  const T = TEAM[team];
  const box: Box = [11, -73, 19, 17];
  switch (t) {
    case 0:
      part(ctx, 0, rr(11, -73, 19, 17, 5), box, 'main', { grain: 'h' });
      part(ctx, 0, rr(12, -74.5, 18.5, 5, 2.4), [12, -74.5, 18.5, 5], 'alt', { lw: 1.3 });
      part(ctx, 0, ell(16, -75, 6, 2.2), [10, -77.2, 12, 4.4], 'trim', { lw: 1.1 });
      leaf(ctx, 20, -76, 5.5, 2, -0.6);
      break;
    case 1: {
      // boğa boynuzları
      for (const [bx, s] of [[14, -1], [27, 1]] as const) {
        part(ctx, 1, path((c) => {
          c.moveTo(bx - 2.5, -70);
          c.quadraticCurveTo(bx + s * 9, -71, bx + s * 8, -82);
          c.quadraticCurveTo(bx + s * 4, -75, bx + 2.5, -66.5);
          c.closePath();
        }), [Math.min(bx - 3, bx + s * 9), -82, 12, 16], 'trim', { lw: 1.3 });
      }
      part(ctx, 1, rr(11, -73, 19, 17, 6), box, 'main');
      part(ctx, 1, rr(22.5, -63, 9, 7.6, 3), [22.5, -63, 9, 7.6], 'alt', { lw: 1.3 });
      fill(ctx, circ(26, -59.5, 0.9), '#2a1606');
      fill(ctx, circ(29, -59.5, 0.9), '#2a1606');
      ctx.beginPath();
      ctx.arc(27.5, -56.5, 2.2, 0.1, Math.PI - 0.1);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = OUTC;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = css(m.trim.light);
      ctx.stroke();
      break;
    }
    case 2:
      part(ctx, 2, rr(11, -73, 19, 17, 3.5), box, 'main');
      part(ctx, 2, rr(10, -75, 21, 5, 2), [10, -75, 21, 5], 'alt', { lw: 1.3 });
      for (const x of [14, 18, 22, 26]) rivet(ctx, x, -72.5, 0.8, m.alt);
      break;
    case 3:
      part(ctx, 3, rpoly(1.2, 11, -60, 12, -71, 20, -75, 29, -70, 31, -60, 25, -56), [11, -75, 20, 19], 'main');
      part(ctx, 3, poly(16, -73, 15, -80, 20, -74.5), [15, -80, 5, 7], 'trim', { lw: 1 });
      part(ctx, 3, poly(22, -74, 25, -81, 26.5, -72), [22, -81, 4.5, 9], 'trim', { lw: 1 });
      break;
    default:
      glow(ctx, 20, -64, 12, PAL(4).glow, 0.4);
      part(ctx, 4, rr(11.5, -73, 18, 16, 7), box, 'main');
      part(ctx, 4, path((c) => {
        c.moveTo(11, -70);
        c.quadraticCurveTo(20, -77, 30, -69);
        c.lineTo(30, -66);
        c.quadraticCurveTo(20, -71, 11, -66);
        c.closePath();
      }), [11, -77, 19, 11], 'trim', { lw: 1.2 });
  }
  // gözler (her kademede aynı yerde, takım rengi)
  if (t === 2) {
    fill(ctx, rr(17, -67, 12.5, 3.6, 1.4), '#0e0f14');
    glow(ctx, 23, -65.2, 8, T, 0.85);
    fill(ctx, rr(17.8, -66.2, 11, 2, 1), css(lighten(T, 0.55)));
  } else {
    if (t === 0) {
      fill(ctx, rr(18.5, -67.2, 4.4, 3.6, 1.4), '#1d120a');
      fill(ctx, rr(24.4, -67.2, 4, 3.6, 1.4), '#1d120a');
    }
    eye(ctx, 20.8, -65.4, 3, 2.2, T, 5);
    eye(ctx, 26.4, -65.4, 2.6, 2.2, T, 5);
  }
  if (t === 1) line(ctx, [17, -69.2, 23, -68], 1, css(m.main.dark));
}

// ── silahlar ─────────────────────────────────────────────
export function drawWeapon(t: number, arch: Arch): HTMLCanvasElement {
  const W = LAYOUT[arch].weapon;
  const { c, ctx } = makeCanvas(W.w, W.h, ART_SCALE);
  ctx.translate(W.w * W.ox, W.h * W.oy);
  if (arch === 'melee') meleeWeapon(ctx, t);
  else if (arch === 'ranged') rangedWeapon(ctx, t);
  else heavyArm(ctx, t);
  return c;
}

function meleeWeapon(ctx: Ctx, t: number) {
  const m = mat(t);
  const P = PAL(t);
  switch (t) {
    case 0: {
      // kütük topuz
      part(ctx, 0, rr(-1.8, -14, 3.6, 21, 1.6), [-1.8, -14, 3.6, 21], 'alt');
      const head: Build = (c) => {
        c.moveTo(-2.6, -12);
        c.quadraticCurveTo(-7, -24, -5.8, -33.5);
        c.quadraticCurveTo(-4.4, -39.6, 1, -39.6);
        c.quadraticCurveTo(6.4, -39.2, 6.6, -33);
        c.quadraticCurveTo(7, -22, 2.6, -12);
        c.closePath();
      };
      part(ctx, 0, capsule(5, -27, 8.4, -29.4, 1.6, 1.2), [3.4, -31, 6.6, 4], 'alt', { lw: 1.1 });
      part(ctx, 0, head, [-7, -39.6, 13.6, 27.6], 'main', { sh: 2.6 });
      part(ctx, 0, path((c) => {
        c.moveTo(-6.4, -32);
        c.quadraticCurveTo(-1, -35, 6.8, -31);
        c.lineTo(6.6, -35.5);
        c.quadraticCurveTo(4, -40.5, 0, -40);
        c.quadraticCurveTo(-5, -40, -6.4, -35);
        c.closePath();
      }), [-6.4, -40.5, 13.2, 9.5], 'trim', { lw: 1.1 });
      fill(ctx, ell(-3, -22, 1.2, 1.8), '#3a2412');
      fill(ctx, ell(3, -17, 1, 1.5), '#3a2412');
      leaf(ctx, 1, -39.5, 5, 2, -1.2);
      break;
    }
    case 1: {
      part(ctx, 1, rr(-1.5, -5, 3, 10, 1), [-1.5, -5, 3, 10], 'alt', { lw: 1.2 });
      const blade: Build = (c) => {
        c.moveTo(-1.8, -6);
        c.quadraticCurveTo(-3.8, -24, -3, -31);
        c.lineTo(0, -39.6);
        c.lineTo(3, -31);
        c.quadraticCurveTo(3.8, -24, 1.8, -6);
        c.closePath();
      };
      part(ctx, 1, blade, [-3.8, -39.6, 7.6, 33.6], 'main', { sh: 1.6 });
      line(ctx, [0, -8, 0, -37], 0.6, css(m.main.light));
      line(ctx, [0.6, -8, 0.6, -36], 0.5, css(m.main.dark, 0.7));
      part(ctx, 1, rr(-6.2, -7.6, 12.4, 3, 1.4), [-6.2, -7.6, 12.4, 3], 'trim', { lw: 1.3 });
      part(ctx, 1, circ(0, 6.4, 2.1), [-2.1, 4.3, 4.2, 4.2], 'trim', { lw: 1.2 });
      break;
    }
    case 2: {
      part(ctx, 2, rr(-1.5, -5, 3, 10, 1), [-1.5, -5, 3, 10], 'alt', { lw: 1.2 });
      part(ctx, 2, poly(-2.6, -6, -2.6, -34, 0, -39.8, 2.6, -34, 2.6, -6), [-2.6, -39.8, 5.2, 33.8], 'main', { sh: 1.4 });
      line(ctx, [0, -9, 0, -33], 0.9, css(m.main.dark, 0.8));
      line(ctx, [-1.7, -8, -1.7, -33.5], 0.5, css(0xffffff, 0.8));
      part(ctx, 2, path((c) => {
        c.moveTo(-8.4, -9.4);
        c.quadraticCurveTo(-6, -6.6, 0, -6.8);
        c.quadraticCurveTo(6, -6.6, 8.4, -9.4);
        c.lineTo(8.6, -6.6);
        c.quadraticCurveTo(6, -4, 0, -4.2);
        c.quadraticCurveTo(-6, -4, -8.6, -6.6);
        c.closePath();
      }), [-8.6, -9.4, 17.2, 5.2], 'alt', { lw: 1.3 });
      part(ctx, 2, circ(0, 6.6, 2.3), [-2.3, 4.3, 4.6, 4.6], 'alt', { lw: 1.2 });
      break;
    }
    case 3: {
      glow(ctx, 0, -24, 13, P.glow, 0.4);
      part(ctx, 3, rr(-1.5, -5, 3, 10, 1), [-1.5, -5, 3, 10], 'alt', { lw: 1.2 });
      part(ctx, 3, rpoly(0.5, -2.8, -6, -4, -22, -1.4, -38, 0.6, -40, 3.4, -30, 3.2, -6), [-4, -40, 7.4, 34], 'main', { sh: 1.6 });
      line(ctx, [0.2, -8, -0.4, -37], 0.6, css(0xffffff, 0.7));
      part(ctx, 3, rpoly(0.6, -7.4, -9, -2, -5, 2, -5, 7.4, -9, 4, -4, -4, -4), [-7.4, -9, 14.8, 5], 'alt', { lw: 1.2 });
      fill(ctx, circ(0, -5.4, 1.3), css(P.glow));
      part(ctx, 3, poly(0, 3.6, 2, 6.4, 0, 9, -2, 6.4), [-2, 3.6, 4, 5.4], 'trim', { lw: 1 });
      sparkle(ctx, -2, -30, 2.2);
      break;
    }
    default: {
      glow(ctx, 0, -24, 15, P.glow, 0.35);
      glow(ctx, 0, -24, 9, 0x9a6cff, 0.4);
      part(ctx, 4, rr(-1.5, -5, 3, 10, 1), [-1.5, -5, 3, 10], 'alt', { lw: 1.2 });
      const blade: Build = (c) => {
        c.moveTo(-2.4, -6);
        c.quadraticCurveTo(-6, -24, -1, -40);
        c.quadraticCurveTo(5, -30, 3, -6);
        c.closePath();
      };
      tonePart(ctx, tone(0xc9b2ff, 0x7c54e8, 0xffffff), blade, [-6, -40, 11, 34], { sh: 1.6, lw: 1.3 });
      inside(ctx, blade, () => {
        line(ctx, [0, -8, -1.4, -34], 1.4, 'rgba(255,255,255,0.85)');
      });
      part(ctx, 4, path((c) => {
        c.moveTo(-8, -10);
        c.quadraticCurveTo(-4, -5.5, 0, -6);
        c.quadraticCurveTo(4, -5.5, 8, -10);
        c.quadraticCurveTo(6, -3.4, 0, -3.6);
        c.quadraticCurveTo(-6, -3.4, -8, -10);
        c.closePath();
      }), [-8, -10, 16, 6.5], 'trim', { lw: 1.2 });
      part(ctx, 4, circ(0, 6.6, 2.1), [-2.1, 4.5, 4.2, 4.2], 'trim', { lw: 1.1 });
      sparkle(ctx, 4, -33, 2.2, '#fff6d0');
      sparkle(ctx, -5, -18, 1.6, '#fff6d0');
    }
  }
  fist(ctx, t, 0, 0, 4.2);
  void m;
}

function rangedWeapon(ctx: Ctx, t: number) {
  const m = mat(t);
  const P = PAL(t);
  switch (t) {
    case 0: {
      // söğüt yayı + ok
      line(ctx, [-1.6, -14.4, -8.4, 0, -1.6, 14.4], 0.8, '#f2e6c8');
      stroked(ctx, (c) => {
        c.moveTo(-8.4, 0);
        c.lineTo(16.5, 0);
      }, 1.3, css(m.main.light), 1.1);
      fill(ctx, poly(16, -2.6, 22.8, 0, 16, 2.6, 17.4, 0), '#a9b0b6');
      stroke(ctx, poly(16, -2.6, 22.8, 0, 16, 2.6, 17.4, 0), 1);
      stroked(ctx, (c) => {
        c.moveTo(-1.6, -14.4);
        c.quadraticCurveTo(7, -9, 1.4, 0);
        c.quadraticCurveTo(7, 9, -1.6, 14.4);
      }, 2.4, css(m.main.base), 1.3);
      stroke(ctx, (c) => {
        c.moveTo(-0.8, -13.4);
        c.quadraticCurveTo(5.6, -9, 1.6, -2);
      }, 0.6, css(m.main.light));
      leaf(ctx, -1.6, -14.4, 4, 1.6, -2.2);
      leaf(ctx, -1.6, 14.4, 4, 1.6, 2.2);
      break;
    }
    case 1: {
      // bronz arbalet
      line(ctx, [11, -11.6, 4.5, -1, 11, 11.6], 0.8, '#f2e6c8');
      part(ctx, 0, path((c) => {
        c.moveTo(-10, 0.4);
        c.lineTo(18, -1);
        c.lineTo(18, 2.8);
        c.lineTo(3, 3.4);
        c.lineTo(-10, 4.4);
        c.closePath();
      }), [-10, -1, 28, 5.4], 'alt', { grain: 'h' });
      stroked(ctx, (c) => {
        c.moveTo(11, -12);
        c.quadraticCurveTo(18.5, -6, 15.2, 0.8);
        c.quadraticCurveTo(18.5, 6, 11, 12);
      }, 2.6, css(m.main.base), 1.3);
      stroke(ctx, (c) => {
        c.moveTo(11.6, -11);
        c.quadraticCurveTo(17, -6, 15.4, -1);
      }, 0.6, css(m.main.light));
      stroked(ctx, (c) => {
        c.moveTo(4, -2.4);
        c.lineTo(20.5, -2.4);
      }, 1.2, css(0x8a6a44), 1);
      fill(ctx, poly(20, -4.6, 25.4, -2.4, 20, -0.2), css(m.main.light));
      stroke(ctx, poly(20, -4.6, 25.4, -2.4, 20, -0.2), 1);
      part(ctx, 1, rr(13.6, -2, 4, 5.4, 1.2), [13.6, -2, 4, 5.4], 'main', { lw: 1.1 });
      rivet(ctx, -6, 2.2, 0.75, m.trim);
      break;
    }
    case 2: {
      // el topu: kararmış demir namlu, pirinç kuşaklar, ahşap kundak, yanan fitil
      part(ctx, 0, path((c) => {
        c.moveTo(-10, -1.6);
        c.lineTo(3, -2.6);
        c.lineTo(3, 4);
        c.lineTo(-5, 6);
        c.quadraticCurveTo(-10, 6, -10, -1.6);
        c.closePath();
      }), [-10, -2.6, 13, 8.6], 'alt', { grain: 'h' });
      part(ctx, 2, path((c) => {
        c.moveTo(-4, -6.4);
        c.lineTo(24, -5.4);
        c.lineTo(24, 4.2);
        c.lineTo(-4, 5.2);
        c.quadraticCurveTo(-7.4, -0.6, -4, -6.4);
        c.closePath();
      }), [-7.4, -6.4, 31.4, 11.6], 'alt', { sh: 2.6 });
      part(ctx, 2, rr(23, -8.2, 7, 14.6, 2.4), [23, -8.2, 7, 14.6], 'alt', { lw: 1.5 });
      fill(ctx, ell(29.2, -0.9, 1.3, 4.6), '#0c0d11');
      part(ctx, 2, rr(4, -7.4, 3.2, 13.8, 1.2), [4, -7.4, 3.2, 13.8], 'trim', { lw: 1.2 });
      part(ctx, 2, rr(14, -7, 3.2, 13, 1.2), [14, -7, 3.2, 13], 'trim', { lw: 1.2 });
      part(ctx, 2, rr(-6, -7.6, 3.2, 14, 1.2), [-6, -7.6, 3.2, 14], 'trim', { lw: 1.2 });
      line(ctx, [-1, -6.2, -2.6, -10, -1.2, -12], 0.9, '#d8c8a0');
      glow(ctx, -1.2, -12.2, 4, P.glow, 0.95, 0xffffff);
      sparkle(ctx, -1.2, -12.2, 2.2, '#fff6c0');
      break;
    }
    case 3: {
      // prizma asası
      glow(ctx, 21, -6, 15, P.glow, 0.55);
      part(ctx, 3, capsule(-9.6, 3.6, 15, -5.6, 1.6), [-11, -7, 27, 12], 'alt');
      part(ctx, 3, poly(11, -2.2, 13.5, -13, 16.5, -3.6), [11, -13, 5.5, 10.8], 'alt', { lw: 1 });
      part(ctx, 3, poly(13, -2, 14, 6, 17, -2.6), [13, -2.6, 4, 8.6], 'alt', { lw: 1 });
      part(ctx, 3, rpoly(0.7, 14.5, -15, 30.5, -6.4, 15.5, 4.4), [14.5, -15, 16, 19.4], 'main', { sh: 2.4 });
      sparkle(ctx, 18.5, -9, 3);
      // gökkuşağı pırıltısı
      ctx.save();
      ctx.globalAlpha = 0.9;
      for (const [i, col] of ['#ff7a7a', '#ffe27a', '#7affa8', '#7ad8ff'].entries()) line(ctx, [30, -6.4, 31.4, -10 + i * 2.4], 0.8, col);
      ctx.restore();
      break;
    }
    default: {
      // süzülen eter küresi (açık avuç)
      const ox = 18;
      const oy = -1;
      glow(ctx, ox, oy, 17, P.glow, 0.5);
      glow(ctx, ox, oy, 10, 0x9a6cff, 0.7);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 3.6, 0, Math.PI, Math.PI * 2);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = OUTC;
      ctx.stroke();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = css(m.trim.base);
      ctx.stroke();
      ctx.restore();
      const orb = circ(ox, oy, 7.4);
      tonePart(ctx, tone(0xb894ff, 0x6a40d8, 0xffffff), orb, [ox - 7.4, oy - 7.4, 14.8, 14.8], { lw: 1.4 });
      inside(ctx, orb, () => {
        glow(ctx, ox - 2, oy - 2.4, 6, 0xffffff, 0.95);
        sparkle(ctx, ox + 2, oy + 2, 2, '#fff3c0');
      });
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 3.6, 0, 0, Math.PI);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = OUTC;
      ctx.stroke();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = css(m.trim.light);
      ctx.stroke();
      ctx.restore();
      sparkle(ctx, 8, -11, 2, '#fff3c0');
      sparkle(ctx, 28, 7, 1.7, '#fff3c0');
      // açık avuç
      part(ctx, 4, path((c) => {
        c.moveTo(-3.6, 3.6);
        c.quadraticCurveTo(-4.4, -3, 0, -4.6);
        c.lineTo(4.6, -5.6);
        c.lineTo(4.6, -3.6);
        c.lineTo(2.6, -2.4);
        c.lineTo(5, -1.2);
        c.lineTo(4.8, 1);
        c.lineTo(2.4, 1);
        c.quadraticCurveTo(2.4, 4.4, -3.6, 3.6);
        c.closePath();
      }), [-4.4, -5.6, 9.4, 10], 'main', { lw: 1.2 });
      stroke(ctx, (c) => c.arc(-0.6, 0.4, 3.4, Math.PI * 0.55, Math.PI * 1.25), 1.1, css(m.trim.base));
      return;
    }
  }
  fist(ctx, t, 0, 0, 3.8);
}

function heavyArm(ctx: Ctx, t: number) {
  const m = mat(t);
  const P = PAL(t);
  const upper = capsule(0, 3, 1, 18, 6.5, 6);
  const fore = capsule(1, 18, 2, 32, 7.5, 9);
  const fistB = t === 3 ? rpoly(1.4, -9, 34, -3, 30.5, 10, 31, 13.5, 41, 10, 49, -8, 48.5) : rr(-9, 31, 22, 18, 6);
  const fistBox: Box = [-9, 30.5, 22.5, 18.5];
  switch (t) {
    case 0:
      part(ctx, 0, upper, [-6.5, -3.5, 14, 28], 'main');
      part(ctx, 0, fore, [-7.5, 10, 18.5, 31], 'main');
      part(ctx, 0, ell(-1, 24, 6, 3), [-7, 21, 12, 6], 'trim', { lw: 1.1 });
      part(ctx, 0, fistB, fistBox, 'alt', { grain: 'h' });
      // kök parmak boğumları
      for (const y of [35, 40, 45]) line(ctx, [8, y, 12.6, y + 0.5], 0.8, css(m.alt.dark));
      part(ctx, 0, ell(0, -1, 11.5, 10), [-11.5, -11, 23, 20], 'alt', { sh: 3 });
      part(ctx, 0, path((c) => {
        c.moveTo(-11.5, -2);
        c.quadraticCurveTo(-8, -12.5, 4, -11);
        c.quadraticCurveTo(11, -9, 11.5, -3);
        c.quadraticCurveTo(4, -6, -2, -4);
        c.quadraticCurveTo(-7, 0, -11.5, -2);
        c.closePath();
      }), [-11.5, -12.5, 23, 12], 'trim', { lw: 1.2 });
      leaf(ctx, 4, -10, 6, 2.4, -0.9);
      leaf(ctx, 2, -9.5, 5, 2, -2.2);
      break;
    case 1:
      part(ctx, 1, upper, [-6.5, -3.5, 14, 28], 'alt');
      part(ctx, 1, fore, [-7.5, 10, 18.5, 31], 'main');
      part(ctx, 1, rr(-6.5, 22, 16, 4, 1.5), [-6.5, 22, 16, 4], 'trim', { lw: 1.2 });
      part(ctx, 1, fistB, fistBox, 'main');
      for (const [x, y] of [[-5, 35], [1, 35], [7, 35]]) rivet(ctx, x, y, 1.1, m.trim);
      line(ctx, [-8, 41, 12.5, 41], 0.9, css(m.main.dark));
      part(ctx, 1, path((c) => {
        c.moveTo(-12, 5);
        c.quadraticCurveTo(-13, -11, 0, -11.5);
        c.quadraticCurveTo(13, -11, 12, 5);
        c.quadraticCurveTo(0, 1, -12, 5);
        c.closePath();
      }), [-13, -11.5, 26, 16.5], 'main', { sh: 3 });
      for (const x of [-7, 0, 7]) rivet(ctx, x, -4, 1.2, m.trim);
      break;
    case 2:
      part(ctx, 2, upper, [-6.5, -3.5, 14, 28], 'alt');
      part(ctx, 2, fore, [-7.5, 10, 18.5, 31], 'main');
      line(ctx, [-6.5, 24, 9.5, 24.6], 0.9, css(m.main.dark));
      rivet(ctx, -3, 20, 1, m.main);
      rivet(ctx, 6, 20, 1, m.main);
      part(ctx, 2, fistB, fistBox, 'main');
      // dikenli boğumlar
      for (const y of [33.5, 39.5, 45.5]) part(ctx, 2, poly(13, y - 2.2, 17.4, y, 13, y + 2.2), [13, y - 2.2, 4.4, 4.4], 'alt', { lw: 1 });
      line(ctx, [-8, 40, 12.5, 40], 0.9, css(m.main.dark));
      part(ctx, 2, rr(-12.5, -10.5, 25, 10, 3), [-12.5, -10.5, 25, 10], 'main', { sh: 2.4 });
      part(ctx, 2, rr(-11, -1.5, 22, 7.5, 2.5), [-11, -1.5, 22, 7.5], 'main');
      for (const x of [-8, 0, 8]) rivet(ctx, x, -6, 1, m.main);
      break;
    case 3:
      glow(ctx, 2, 36, 14, P.glow, 0.45);
      part(ctx, 3, upper, [-6.5, -3.5, 14, 28], 'alt');
      part(ctx, 3, fore, [-7.5, 10, 18.5, 31], 'alt');
      part(ctx, 3, poly(-5, 25, -12, 14, -2, 19), [-12, 14, 10, 11], 'main', { lw: 1.2 });
      part(ctx, 3, poly(-6, 30, -14.5, 26, -5, 24), [-14.5, 24, 9.5, 6], 'trim', { lw: 1.1 });
      part(ctx, 3, fistB, fistBox, 'main', { sh: 3 });
      part(ctx, 3, rpoly(1.4, -11, 4, -10, -8, -2, -12, 9, -9, 12, 2, 2, 6), [-11, -12, 23, 18], 'main', { sh: 3 });
      part(ctx, 3, poly(-5, -9, -9, -17, -0.5, -11), [-9, -17, 8.5, 8], 'trim', { lw: 1.1 });
      break;
    default:
      glow(ctx, 1, 16, 12, P.glow, 0.5);
      glow(ctx, 2, 38, 16, 0x9a6cff, 0.45);
      part(ctx, 4, capsule(0, 5, 1, 14, 5.4, 5), [-5.4, 0, 11.5, 19], 'main');
      part(ctx, 4, capsule(1.4, 21, 2, 29, 6.8, 8), [-5.4, 14, 15.5, 23], 'main');
      part(ctx, 4, rr(-6.4, 22.5, 16.4, 3.6, 1.6), [-6.4, 22.5, 16.4, 3.6], 'trim', { lw: 1.2 });
      part(ctx, 4, fistB, fistBox, 'alt', { sh: 3 });
      part(ctx, 4, rr(-9, 37.5, 22, 3.6, 1.6), [-9, 37.5, 22, 3.6], 'trim', { lw: 1.1 });
      glow(ctx, 2, 44, 5, P.glow, 0.7);
      part(ctx, 4, ell(0, -1, 11, 9.5), [-11, -10.5, 22, 19], 'alt', { sh: 3 });
      part(ctx, 4, path((c) => {
        c.moveTo(-11, 1);
        c.quadraticCurveTo(0, 6, 11, 1);
        c.lineTo(11, -2.5);
        c.quadraticCurveTo(0, 2, -11, -2.5);
        c.closePath();
      }), [-11, -2.5, 22, 8.5], 'trim', { lw: 1.1 });
      sparkle(ctx, -4, -5, 2.4, '#ffffff');
  }
}
