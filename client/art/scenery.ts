// Arka plan sahnesinin saf çizim kodu (Phaser'sız): gökyüzü, güneş, bulutlar, dağlar, tepeler, zemin.
// Web (background.ts, Phaser'a yerleştirir) ve mobil PNG dökme betiği (tools/bake-mobile.ts) bunu paylaşır.
import * as B from '../../shared/balance';
import { type Ctx, OUTC, css, darken, lighten, lin, makeCanvas, rng } from './canvas';

type R = ReturnType<typeof rng>;

/** Gökyüzü degradesi (yukarıdan aşağı). */
export const SKY_STOPS: [number, string][] = [
  [0, '#2f6fcb'],
  [0.28, '#5596e0'],
  [0.55, '#9ccaf2'],
  [0.7, '#d6ebf8'],
  [0.8, '#f6eed8'],
  [1, '#f9e7c4'],
];

/** Sahnenin yatay sınırları (geniş ekranlar için pay bırakıldı). */
export const SKY_X0 = -2200;
export const SKY_X1 = B.WORLD_W + 2200;
/** Pişmiş zeminin sınırları; bunun altı ve iki yanı düz toprakla doldurulur. */
export const GROUND_X0 = -900;
export const GROUND_X1 = B.WORLD_W + 900;
export const SOIL = 0x4a3726;
/** Güneşin yeri ve kaydırma oranı. */
export const SUN = { x: 980, y: 150, scroll: 0.05 };

export function drawSky(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(4, 720, 1);
  ctx.fillStyle = lin(ctx, 0, 0, 0, 720, SKY_STOPS);
  ctx.fillRect(0, 0, 4, 720);
  return c;
}

export function drawSun(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(260, 260, 1);
  const g = ctx.createRadialGradient(130, 130, 0, 130, 130, 130);
  g.addColorStop(0, 'rgba(255,252,236,1)');
  g.addColorStop(0.25, 'rgba(255,246,206,0.95)');
  g.addColorStop(0.32, 'rgba(255,236,170,0.45)');
  g.addColorStop(0.6, 'rgba(255,236,180,0.14)');
  g.addColorStop(1, 'rgba(255,236,180,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 260, 260);
  ctx.fillStyle = 'rgba(255,255,248,1)';
  ctx.beginPath();
  ctx.arc(130, 130, 30, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/** Üç bulut dokusu (aynı tohumla, hep aynı şekiller). */
export function drawClouds(): HTMLCanvasElement[] {
  const rc = rng(7);
  return [0, 1, 2].map((i) => cloudCanvas(i, rc));
}

export interface CloudPlace {
  kind: number;
  x: number;
  y: number;
  scale: number;
  flip: boolean;
  alpha: number;
  speed: number;
  scroll: number;
}

/** 10 bulutun yeri, boyu ve hızı. */
export function cloudPlaces(): CloudPlace[] {
  const rnd = rng(42);
  const out: CloudPlace[] = [];
  for (let i = 0; i < 10; i++) {
    const scale = rnd.range(0.55, 1.15);
    const x = rnd.range(-700, B.WORLD_W + 700);
    const y = rnd.range(70, 270);
    const flip = !(rnd.next() < 0.5);
    const alpha = rnd.range(0.8, 1);
    out.push({ kind: i % 3, x, y, scale, flip, alpha, speed: rnd.range(4, 12), scroll: 0.15 });
  }
  return out;
}

/** Dokuya pişirilen bir arka plan katmanı (dünya koordinatında). */
export interface SceneryLayer {
  key: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  depth: number;
  scroll: number;
  draw: (ctx: Ctx, a: number, b: number) => void;
}

/** Uzak dağlar → yakın tepeler → zemin, arkadan öne. */
export function sceneryLayers(): SceneryLayer[] {
  // en uzak dağlar (soluk, karlı)
  const farthest = ridgePeaks(rng(11), -1400, B.WORLD_W + 2000, 150, 260, 390, 470);
  // uzak dağlar
  const far = ridgePeaks(rng(23), -1200, B.WORLD_W + 1800, 120, 220, 410, 500);
  // tepeler ve ağaçlar
  const hills = hillData(rng(5), -1000, B.WORLD_W + 1600);
  // zemin (kamera en fazla dünya kenarlarının biraz dışını gösterir)
  const ground = groundData(rng(99), GROUND_X0, GROUND_X1);
  return [
    { key: 'bg_far2', x0: -1400, x1: B.WORLD_W + 2000, y0: 260, y1: 560, depth: -92, scroll: 0.18, draw: (ctx, a, b) => mountains(ctx, farthest, a, b, 0x9fb6d8, 0xc4d3ea, 560, 0.75) },
    { key: 'bg_far', x0: -1200, x1: B.WORLD_W + 1800, y0: 300, y1: 600, depth: -90, scroll: 0.28, draw: (ctx, a, b) => mountains(ctx, far, a, b, 0x7d97bd, 0xa9bcd8, 600, 0.55) },
    { key: 'bg_mid', x0: -1000, x1: B.WORLD_W + 1600, y0: 400, y1: 600, depth: -85, scroll: 0.5, draw: (ctx, a, b) => drawHills(ctx, hills, a, b) },
    { key: 'bg_ground', x0: GROUND_X0, x1: GROUND_X1, y0: 508, y1: 790, depth: -80, scroll: 1, draw: (ctx, a, b) => drawGround(ctx, ground, a, b, GROUND_X0, GROUND_X1) },
  ];
}

// ── bulut ────────────────────────────────────────────────
function cloudCanvas(i: number, R: R): HTMLCanvasElement {
  const W = [260, 200, 320][i];
  const H = [110, 90, 120][i];
  const { c, ctx } = makeCanvas(W, H, 1);
  const base = H - 18;
  const puffs: [number, number, number][] = [];
  const n = 5 + i;
  for (let k = 0; k < n; k++) {
    const f = (k + 0.5) / n;
    const r = (H * 0.28 + Math.sin(f * Math.PI) * H * 0.2) * R.range(0.85, 1.1);
    puffs.push([20 + f * (W - 40), base - r * R.range(0.35, 0.65), r]);
  }
  const shape = (cx: Ctx) => {
    cx.beginPath();
    for (const [x, y, r] of puffs) {
      cx.moveTo(x + r, y);
      cx.arc(x, y, r, 0, Math.PI * 2);
    }
    cx.rect(22, base - 16, W - 44, 16);
  };
  // yumuşak dış kenar (önce çizilir; dolgu iç çizgileri örter, yalnız dış siluet kalır)
  shape(ctx);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(130,155,200,0.5)';
  ctx.stroke();
  // gölgeli alt
  ctx.save();
  shape(ctx);
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, 10, 0, base, [
    [0, '#ffffff'],
    [0.55, '#f4f8fd'],
    [1, '#c6d5ea'],
  ]);
  ctx.fillRect(0, 0, W, H);
  // üst ışık kabarcıkları
  for (const [x, y, r] of puffs) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, 0, x - r * 0.35, y - r * 0.45, r * 0.9);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 1.4, y - r * 1.5, r * 2.4, r * 2.4);
  }
  ctx.fillStyle = 'rgba(150,170,205,0.35)';
  ctx.fillRect(0, base - 6, W, 8);
  ctx.restore();
  return c;
}

// ── dağlar ───────────────────────────────────────────────
interface Peak {
  x: number;
  y: number;
  w: number;
  jag: number[];
}

function ridgePeaks(R: R, x0: number, x1: number, minW: number, maxW: number, minY: number, maxY: number): Peak[] {
  const peaks: Peak[] = [];
  for (let x = x0; x < x1; x += R.range(minW * 0.55, maxW * 0.7)) {
    const jag: number[] = [];
    for (let i = 0; i < 8; i++) jag.push(R.range(-1, 1));
    peaks.push({ x, y: R.range(minY - 120, maxY - 120) + (R.next() < 0.3 ? 60 : 0), w: R.range(minW, maxW), jag });
  }
  // önce yüksek olanlar (arkada), sonra alçaklar
  return peaks.sort((a, b) => a.y - b.y);
}

function mountains(ctx: Ctx, peaks: Peak[], a: number, b: number, base: number, haze: number, bottom: number, snowAmt: number) {
  for (const p of peaks) {
    if (p.x + p.w < a || p.x - p.w > b) continue;
    const L = p.x - p.w;
    const Rr = p.x + p.w;
    const h = bottom - p.y;
    // sırt noktaları: sol etek → zirve → sağ etek, hafif pürüzlü
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let i = 0; i <= 4; i++) {
      const f = i / 4;
      left.push([L + (p.x - L) * f + p.jag[i] * 6, bottom - h * Math.pow(f, 1.25) + (i > 0 && i < 4 ? p.jag[i + 3] * 8 : 0)]);
      right.push([p.x + (Rr - p.x) * f + p.jag[i + 1] * 6, p.y + h * Math.pow(f, 0.8) + (i > 0 && i < 4 ? p.jag[i + 2] * 8 : 0)]);
    }
    const all = [...left, ...right.slice(1)];
    // aydınlık yüz
    ctx.beginPath();
    ctx.moveTo(all[0][0], all[0][1]);
    for (const [x, y] of all) ctx.lineTo(x, y);
    ctx.lineTo(Rr, bottom + 2);
    ctx.lineTo(L, bottom + 2);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, p.y, 0, bottom, [
      [0, css(lighten(base, 0.12))],
      [1, css(haze)],
    ]);
    ctx.fill();
    // gölge yüzü (sağ)
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    for (const [x, y] of right) ctx.lineTo(x, y);
    ctx.lineTo(Rr, bottom + 2);
    ctx.lineTo(p.x + p.w * 0.15, bottom + 2);
    ctx.quadraticCurveTo(p.x + p.w * 0.05, p.y + h * 0.5, p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, p.y, 0, bottom, [
      [0, css(darken(base, 0.18), 0.85)],
      [1, css(darken(haze, 0.05), 0.3)],
    ]);
    ctx.fill();
    // kar başlığı
    const capH = h * 0.32 * snowAmt;
    if (h > 150) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      const lx = p.x - (p.x - L) * (capH / h) * 1.15;
      const rx = p.x + (Rr - p.x) * (capH / h) * 0.95;
      ctx.lineTo(lx, p.y + capH);
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        ctx.lineTo(lx + (rx - lx) * f - 3, p.y + capH * (i % 2 ? 0.62 : 1) + p.jag[i] * 3);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(250,252,255,0.95)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(rx, p.y + capH * 0.9);
      ctx.lineTo(p.x + 4, p.y + capH * 0.75);
      ctx.closePath();
      ctx.fillStyle = 'rgba(190,206,232,0.9)';
      ctx.fill();
    }
  }
  // dip pusu
  ctx.fillStyle = lin(ctx, 0, bottom - 90, 0, bottom, [
    [0, css(haze, 0)],
    [1, css(haze, 0.85)],
  ]);
  ctx.fillRect(a, bottom - 90, b - a, 92);
}

// ── tepeler ──────────────────────────────────────────────
interface HillData {
  hills: { x: number; w: number; h: number; c: number }[];
  trees: { x: number; y: number; s: number; kind: number; c: number }[];
}

function hillData(R: R, x0: number, x1: number): HillData {
  const hills: HillData['hills'] = [];
  for (let x = x0; x < x1; x += R.range(200, 340)) hills.push({ x, w: R.range(340, 560), h: R.range(70, 130), c: R.int(0, 2) });
  const trees: HillData['trees'] = [];
  for (let x = x0; x < x1; x += R.range(18, 70)) {
    // tepe yüzeyindeki y
    let top = 560;
    for (const h of hills) {
      const dx = (x - h.x) / (h.w / 2);
      if (Math.abs(dx) < 1) top = Math.min(top, 545 - h.h * Math.sqrt(1 - dx * dx));
    }
    const n = R.next() < 0.35 ? R.int(2, 4) : 1;
    for (let k = 0; k < n; k++) trees.push({ x: x + k * R.range(10, 18), y: top + R.range(4, 22), s: R.range(0.75, 1.25), kind: R.next() < 0.55 ? 0 : 1, c: R.int(0, 2) });
  }
  trees.sort((a, b) => a.y - b.y);
  return { hills, trees };
}

const HILL_COLS = [0x6a9e58, 0x5f9450, 0x76a862];

function drawHills(ctx: Ctx, d: HillData, a: number, b: number) {
  // arka tepe bandı
  ctx.fillStyle = lin(ctx, 0, 470, 0, 600, [
    [0, '#7fae6c'],
    [1, '#5e8c4e'],
  ]);
  ctx.fillRect(a, 520, b - a, 80);
  for (const h of d.hills) {
    if (h.x + h.w / 2 < a || h.x - h.w / 2 > b) continue;
    const col = HILL_COLS[h.c];
    ctx.beginPath();
    ctx.ellipse(h.x, 545, h.w / 2, h.h, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(h.x + h.w / 2, 600);
    ctx.lineTo(h.x - h.w / 2, 600);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, 545 - h.h, 0, 590, [
      [0, css(lighten(col, 0.12))],
      [1, css(darken(col, 0.12))],
    ]);
    ctx.fill();
    // sol üst kenar ışığı
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(h.x + 10, 552, h.w / 2, h.h, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(h.x + h.w, 700);
    ctx.lineTo(h.x - h.w, 700);
    ctx.closePath();
    ctx.fillStyle = css(darken(col, 0.06), 0.6);
    ctx.fill();
    ctx.restore();
  }
  for (const t of d.trees) {
    if (t.x < a - 30 || t.x > b + 30) continue;
    if (t.kind === 0) pine(ctx, t.x, t.y, t.s, t.c);
    else roundTree(ctx, t.x, t.y, t.s, t.c);
  }
  // alt pus (zemin bandına geçiş)
  ctx.fillStyle = lin(ctx, 0, 540, 0, 600, [
    [0, 'rgba(120,160,110,0)'],
    [1, 'rgba(90,130,80,0.5)'],
  ]);
  ctx.fillRect(a, 540, b - a, 60);
}

const PINE = [0x3f6e44, 0x36603c, 0x4a7a4a];
function pine(ctx: Ctx, x: number, y: number, s: number, c: number) {
  const col = PINE[c];
  ctx.fillStyle = '#4a3a2a';
  ctx.fillRect(x - 1.5 * s, y - 6 * s, 3 * s, 7 * s);
  for (let i = 0; i < 3; i++) {
    const ty = y - 6 * s - i * 9 * s;
    const w = (11 - i * 2.6) * s;
    ctx.beginPath();
    ctx.moveTo(x - w, ty);
    ctx.lineTo(x, ty - 15 * s);
    ctx.lineTo(x + w, ty);
    ctx.closePath();
    ctx.fillStyle = css(col);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, ty - 15 * s);
    ctx.lineTo(x + w, ty);
    ctx.lineTo(x + w * 0.1, ty);
    ctx.closePath();
    ctx.fillStyle = css(darken(col, 0.22));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - w, ty);
    ctx.lineTo(x, ty - 15 * s);
    ctx.lineTo(x - w * 0.55, ty - 2 * s);
    ctx.closePath();
    ctx.fillStyle = css(lighten(col, 0.15), 0.8);
    ctx.fill();
  }
}

const LEAF = [0x5a9a4a, 0x4e8c42, 0x6aa852];
function roundTree(ctx: Ctx, x: number, y: number, s: number, c: number) {
  const col = LEAF[c];
  ctx.fillStyle = '#5a4430';
  ctx.fillRect(x - 2 * s, y - 12 * s, 4 * s, 13 * s);
  const blobs: [number, number, number][] = [
    [-6, -18, 8],
    [6, -18, 8],
    [0, -26, 9],
    [0, -16, 9],
  ];
  for (const [dx, dy, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fillStyle = css(darken(col, 0.15));
    ctx.fill();
  }
  for (const [dx, dy, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x + (dx - 1.5) * s, y + (dy - 1.5) * s, r * 0.8 * s, 0, Math.PI * 2);
    ctx.fillStyle = css(col);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x - 3 * s, y - 28 * s, 3.4 * s, 0, Math.PI * 2);
  ctx.fillStyle = css(lighten(col, 0.25), 0.8);
  ctx.fill();
}

// ── zemin ────────────────────────────────────────────────
interface GroundData {
  blades: { x: number; h: number; c: number; lean: number }[];
  front: { x: number; h: number; c: number; lean: number }[];
  flowers: { x: number; y: number; c: number }[];
  pebbles: { x: number; y: number; w: number; h: number; c: number }[];
  stones: { x: number; y: number; r: number }[];
  ruts: { x: number; y: number; w: number }[];
  bushes: { x: number; y: number; s: number }[];
  clods: { x: number; y: number; w: number; h: number }[];
}

function groundData(R: R, x0: number, x1: number): GroundData {
  const d: GroundData = { blades: [], front: [], flowers: [], pebbles: [], stones: [], ruts: [], bushes: [], clods: [] };
  for (let x = x0; x < x1; x += R.range(2.5, 5)) d.blades.push({ x, h: R.range(6, 13), c: R.int(0, 3), lean: R.range(-2.5, 2.5) });
  for (let x = x0; x < x1; x += R.range(3, 6)) d.front.push({ x, h: R.range(5, 11), c: R.int(0, 2), lean: R.range(-2, 2) });
  for (let x = x0; x < x1; x += R.range(20, 70)) d.flowers.push({ x, y: R.range(532, 548), c: R.int(0, 3) });
  for (let i = 0; i < (x1 - x0) / 9; i++) d.pebbles.push({ x: R.range(x0, x1), y: R.range(556, 598), w: R.range(1.5, 4), h: R.range(1, 2.4), c: R.int(0, 2) });
  for (let x = x0; x < x1; x += R.range(90, 260)) d.stones.push({ x, y: R.range(558, 594), r: R.range(3, 6) });
  for (let i = 0; i < (x1 - x0) / 26; i++) d.ruts.push({ x: R.range(x0, x1), y: R.range(560, 594), w: R.range(20, 70) });
  for (let x = x0; x < x1; x += R.range(160, 420)) d.bushes.push({ x, y: R.range(536, 544), s: R.range(0.7, 1.2) });
  for (let i = 0; i < (x1 - x0) / 14; i++) d.clods.push({ x: R.range(x0, x1), y: R.range(624, 780), w: R.range(6, 18), h: R.range(3, 7) });
  return d;
}

const GRASS = [0x5fa046, 0x4f8e3c, 0x6cb052, 0x467f36];
const FLOWER = ['#fff6e0', '#ffd84a', '#ff9ac0', '#b8d8ff'];

function drawGround(ctx: Ctx, d: GroundData, a: number, b: number, gx0: number, gx1: number) {
  const A = Math.max(a, gx0);
  const Bx = Math.min(b, gx1);
  // arka çimen bandı
  ctx.fillStyle = lin(ctx, 0, 526, 0, 556, [
    [0, '#5c9c44'],
    [1, '#4a8638'],
  ]);
  ctx.fillRect(A, 526, Bx - A, 32);
  // çalılar
  for (const u of d.bushes) {
    if (u.x < a - 30 || u.x > b + 30) continue;
    for (const [dx, dy, r] of [[-9, 0, 8], [0, -5, 10], [10, 0, 8]] as const) {
      ctx.beginPath();
      ctx.arc(u.x + dx * u.s, u.y + dy * u.s, r * u.s, 0, Math.PI * 2);
      ctx.fillStyle = '#3e7a34';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(u.x + (dx - 2) * u.s, u.y + (dy - 2) * u.s, r * 0.7 * u.s, 0, Math.PI * 2);
      ctx.fillStyle = '#5a9a46';
      ctx.fill();
    }
  }
  // ot uçları (üst kenar)
  for (const g of d.blades) {
    if (g.x < a || g.x > b) continue;
    ctx.beginPath();
    ctx.moveTo(g.x - 2, 530);
    ctx.quadraticCurveTo(g.x + g.lean * 0.3, 530 - g.h * 0.6, g.x + g.lean, 530 - g.h);
    ctx.quadraticCurveTo(g.x + 0.6, 530 - g.h * 0.4, g.x + 2, 530);
    ctx.closePath();
    ctx.fillStyle = css(GRASS[g.c]);
    ctx.fill();
  }
  // çiçekler
  for (const f of d.flowers) {
    if (f.x < a || f.x > b) continue;
    ctx.fillStyle = '#3a6a2c';
    ctx.fillRect(f.x - 0.5, f.y - 4, 1, 5);
    ctx.fillStyle = FLOWER[f.c];
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(k * 1.57) * 1.6, f.y - 5 + Math.sin(k * 1.57) * 1.6, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffcc33';
    ctx.beginPath();
    ctx.arc(f.x, f.y - 5, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // yol
  ctx.fillStyle = lin(ctx, 0, 548, 0, 604, [
    [0, '#8a6c48'],
    [0.12, '#ccb084'],
    [0.6, '#bc9e72'],
    [1, '#a2845c'],
  ]);
  ctx.beginPath();
  ctx.moveTo(A, 552);
  for (let x = A; x <= Bx + 20; x += 20) ctx.lineTo(x, 550 + Math.sin(x * 0.05) * 1.6 + Math.sin(x * 0.013) * 1.4);
  ctx.lineTo(Bx, 606);
  ctx.lineTo(A, 606);
  ctx.closePath();
  ctx.fill();
  // tekerlek izleri
  for (const r of d.ruts) {
    if (r.x + r.w < a || r.x > b) continue;
    ctx.fillStyle = 'rgba(90,64,38,0.35)';
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.w / 2, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(214,180,130,0.3)';
    ctx.beginPath();
    ctx.ellipse(r.x - 2, r.y - 1.6, r.w / 2.4, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // çakıllar
  for (const p of d.pebbles) {
    if (p.x < a || p.x > b) continue;
    ctx.fillStyle = p.c === 0 ? '#7a5e40' : p.c === 1 ? '#c4a27a' : '#8f8a7e';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.w, p.h, 0, 0, Math.PI * 2);
    ctx.fill();
    if (p.c === 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x - p.w * 0.3, p.y - p.h * 0.4, p.w * 0.4, p.h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // iri taşlar
  for (const s of d.stones) {
    if (s.x < a - 10 || s.x > b + 10) continue;
    ctx.fillStyle = 'rgba(60,40,20,0.3)';
    ctx.beginPath();
    ctx.ellipse(s.x + 1, s.y + s.r * 0.5, s.r * 1.3, s.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r * 1.2, s.r * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#8c877b';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(40,32,24,0.8)';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(s.x - s.r * 0.35, s.y - s.r * 0.3, s.r * 0.6, s.r * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#b8b2a4';
    ctx.fill();
  }
  // yolun üst kenarındaki gölge
  ctx.fillStyle = lin(ctx, 0, 549, 0, 557, [
    [0, 'rgba(50,34,18,0.35)'],
    [1, 'rgba(50,34,18,0)'],
  ]);
  ctx.fillRect(A, 549, Bx - A, 8);
  // ön çimen dudağı
  ctx.fillStyle = '#3f7a33';
  ctx.beginPath();
  ctx.moveTo(A, 604);
  for (let x = A; x <= Bx + 16; x += 16) ctx.lineTo(x, 600 + Math.sin(x * 0.07) * 1.5);
  ctx.lineTo(Bx, 618);
  ctx.lineTo(A, 618);
  ctx.closePath();
  ctx.fill();
  for (const g of d.front) {
    if (g.x < a || g.x > b) continue;
    ctx.beginPath();
    ctx.moveTo(g.x - 1.8, 604);
    ctx.quadraticCurveTo(g.x + g.lean * 0.3, 604 - g.h * 0.6, g.x + g.lean, 604 - g.h);
    ctx.quadraticCurveTo(g.x + 0.6, 604 - g.h * 0.4, g.x + 1.8, 604);
    ctx.closePath();
    ctx.fillStyle = g.c === 0 ? '#4a8a3a' : '#3a7230';
    ctx.fill();
  }
  // toprak
  ctx.fillStyle = lin(ctx, 0, 614, 0, 790, [
    [0, '#5c4630'],
    [1, '#3e2e1e'],
  ]);
  ctx.fillRect(A, 614, Bx - A, 176);
  ctx.fillStyle = '#2e5a28';
  ctx.fillRect(A, 614, Bx - A, 3);
  for (const c of d.clods) {
    if (c.x < a || c.x > b) continue;
    ctx.fillStyle = 'rgba(40,28,16,0.55)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(140,110,80,0.25)';
    ctx.beginPath();
    ctx.ellipse(c.x - 1, c.y - 1, c.w / 3, c.h / 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

void OUTC;
