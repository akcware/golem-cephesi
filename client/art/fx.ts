// Mermiler (birim + kule), gökten düşen özel güç parçaları, kule yuvası ve beyaz parçacık dokuları.
// Mermiler sağa bakar (uçuş yönünde döndürülür). Özel güç parçaları AŞAĞI bakar (düşüş yönü dokunun +y'si).
// Kademe 3-4 mermileri sahnede ADD karışımıyla çizilir: koyu dış çizgi yok, parlak çekirdek var.
import * as B from '../../shared/balance';
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
  lin,
  line,
  makeCanvas,
  poly,
  rivet,
  rng,
  rr,
  shade,
  sparkle,
  stroke,
  tone,
} from './canvas';
import { ART_SCALE } from './layout';
import { mat } from './material';
import { boulder, fireTongue, pinecone, star } from './turrets';

const PAL = (t: number) => B.TIERS[t].palette;
type Draw = (ctx: Ctx) => void;

function canvasOf(w: number, h: number, draw: Draw, scale = ART_SCALE): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(w, h, scale);
  draw(ctx);
  return c;
}

// ── ortak parçalar ───────────────────────────────────────
function arrow(ctx: Ctx, len: number, y: number, head: number, fletch: number, shaft = 0xd8b880) {
  line(ctx, [1, y, len - 4, y], 2.6, OUTC);
  line(ctx, [1, y, len - 4, y], 1.2, css(shaft));
  const hb = poly(len - 6, y - 2.6, len, y, len - 6, y + 2.6, len - 4.6, y);
  fill(ctx, hb, css(head));
  stroke(ctx, hb, 1);
  for (const s of [-1, 1]) {
    const f = poly(0.5, y, 4, y + s * 0.4, 6, y + s * 2.8, 2, y + s * 2.6);
    fill(ctx, f, css(fletch));
    stroke(ctx, f, 0.8);
  }
}

function speedLines(ctx: Ctx, x0: number, x1: number, y: number, n: number, color = 'rgba(255,255,255,0.55)') {
  for (let i = 0; i < n; i++) {
    const yy = y + (i - (n - 1) / 2) * 2.2;
    line(ctx, [x0 + i * 1.5, yy, x1 - i * 2, yy], 0.8, color);
  }
}

/** Parlak (ADD karışımlı) enerji parçası: dış hale + renkli gövde + beyaz çekirdek. */
function energyShard(ctx: Ctx, w: number, h: number, color: number, light: number) {
  const cy = h / 2;
  glow(ctx, w * 0.62, cy, h * 0.9, color, 0.55);
  const b = poly(1, cy, w * 0.5, cy - h * 0.32, w - 1, cy, w * 0.5, cy + h * 0.32);
  ctx.fillStyle = lin(ctx, 0, 0, w, 0, [
    [0, css(color, 0)],
    [0.45, css(color, 0.9)],
    [1, css(light)],
  ]);
  ctx.beginPath();
  b(ctx);
  ctx.fill();
  fill(ctx, poly(w * 0.35, cy, w * 0.65, cy - h * 0.13, w - 2, cy, w * 0.65, cy + h * 0.13), '#ffffff');
}

function burst(ctx: Ctx, cx: number, cy: number, r: number, color: number, rays: number, rot = 0) {
  glow(ctx, cx, cy, r, color, 0.7);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const len = r * (i % 2 ? 0.62 : 0.95);
    const w = r * 0.12;
    ctx.fillStyle = css(lighten(color, 0.5), 0.95);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.lineTo(Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w);
    ctx.lineTo(Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  glow(ctx, cx, cy, r * 0.45, 0xffffff, 1);
}

function lightning(ctx: Ctx, cx: number, cy: number, r: number, n: number, color: number, seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  glow(ctx, cx, cy, r, color, 0.6);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.6;
    const pts = [cx, cy];
    let x = cx;
    let y = cy;
    for (let k = 1; k <= 3; k++) {
      const d = (r * 0.9 * k) / 3;
      x = cx + Math.cos(a) * d + (rnd() - 0.5) * r * 0.3;
      y = cy + Math.sin(a) * d + (rnd() - 0.5) * r * 0.3;
      pts.push(x, y);
    }
    line(ctx, pts, 2.6, css(color, 0.55));
    line(ctx, pts, 1, '#ffffff');
  }
  glow(ctx, cx, cy, r * 0.42, 0xffffff, 1);
}

// ── birim mermileri ──────────────────────────────────────
export function drawProj(t: number): HTMLCanvasElement {
  switch (t) {
    case 0:
      return canvasOf(20, 6, (ctx) => arrow(ctx, 20, 3, 0xb0b6bc, 0x8fd16a));
    case 1:
      return canvasOf(18, 6, (ctx) => {
        line(ctx, [1, 3, 13, 3], 3, OUTC);
        line(ctx, [1, 3, 13, 3], 1.6, '#8a6a44');
        const h = poly(11, 0.4, 17.6, 3, 11, 5.6);
        shade(ctx, h, mat(1).main, { sh: 0.8, hl: 0.4, lw: 1 });
        fill(ctx, poly(1, 3, 4, 0.8, 6, 0.8, 4, 3), css(mat(1).trim.base));
        fill(ctx, poly(1, 3, 4, 5.2, 6, 5.2, 4, 3), css(mat(1).trim.dark));
      });
    case 2:
      return canvasOf(10, 10, (ctx) => {
        glow(ctx, 5, 5, 5, PAL(2).glow, 0.4);
        shade(ctx, circ(5, 5, 3.4), tone(0x3a3e46, 0x1a1c22, 0x8c949e), { sh: 1.1, hl: 0.6, lw: 1.1 });
        fill(ctx, circ(3.9, 3.9, 0.9), '#e8eef4');
      });
    case 3:
      return canvasOf(20, 10, (ctx) => energyShard(ctx, 20, 10, PAL(3).main, PAL(3).light));
    default:
      return canvasOf(16, 16, (ctx) => {
        glow(ctx, 8, 8, 8, PAL(4).main, 0.75);
        glow(ctx, 8, 8, 5.5, PAL(4).glow, 0.8);
        glow(ctx, 8, 8, 3, 0xffffff, 1);
        sparkle(ctx, 8, 8, 6, '#ffffff', 0.8);
      });
  }
}

// ── kule mermileri ───────────────────────────────────────
export function drawTurretProj(t: number, g: number): HTMLCanvasElement {
  const P = PAL(t);
  switch (t * 3 + g) {
    case 0: // Ok Kulesi: seri oklar
      return canvasOf(20, 6, (ctx) => arrow(ctx, 20, 3, 0xc0c6cc, 0xe8e0c8));
    case 1: // Kozalak bombası
      return canvasOf(13, 14, (ctx) => {
        pinecone(ctx, 6.5, 7.4, 4.6, Math.PI / 2);
        line(ctx, [11, 3, 12, 1.5], 1, '#6a4a24');
        glow(ctx, 12, 1.5, 2, 0xffc040, 0.9, 0xffffff);
      });
    case 2: // Kütük/kaya bombası
      return canvasOf(18, 17, (ctx) => {
        boulder(ctx, 9, 9, 7);
      });
    case 3: // Bronz cıvata (seri)
      return canvasOf(16, 6, (ctx) => {
        speedLines(ctx, 0, 6, 3, 2, 'rgba(255,230,180,0.6)');
        line(ctx, [3, 3, 11, 3], 3, OUTC);
        line(ctx, [3, 3, 11, 3], 1.5, '#8a6a44');
        shade(ctx, poly(9.5, 0.6, 15.6, 3, 9.5, 5.4), mat(1).main, { sh: 0.8, hl: 0.4, lw: 1 });
      });
    case 4: // Balista: dev delici ok
      return canvasOf(38, 10, (ctx) => {
        speedLines(ctx, 0, 10, 5, 3, 'rgba(255,240,200,0.6)');
        line(ctx, [4, 5, 30, 5], 4, OUTC);
        line(ctx, [4, 5, 30, 5], 2.2, '#9a7650');
        line(ctx, [6, 4.3, 28, 4.3], 0.6, '#c8a070');
        const h = poly(27, 0.6, 37.5, 5, 27, 9.4, 29.4, 5);
        shade(ctx, h, mat(1).main, { sh: 1.2, hl: 0.6, lw: 1.2 });
        for (const s of [-1, 1]) {
          const f = poly(3, 5, 8, 5 + s * 0.6, 11, 5 + s * 4.2, 5, 5 + s * 4);
          fill(ctx, f, css(mat(1).trim.base));
          stroke(ctx, f, 0.9);
        }
        rivet(ctx, 26, 5, 0.9, mat(1).trim);
      });
    case 5: // Alevli çömlek
      return canvasOf(16, 17, (ctx) => {
        glow(ctx, 8, 9, 9, 0xff8a20, 0.6);
        fireTongue(ctx, 7.5, 4.4, 6, -Math.PI / 2 - 0.2);
        const pot: Build = (c) => {
          c.moveTo(4.5, 6.5);
          c.quadraticCurveTo(1.5, 10, 4, 14);
          c.quadraticCurveTo(8, 16.6, 12, 14);
          c.quadraticCurveTo(14.5, 10, 11.5, 6.5);
          c.closePath();
        };
        shade(ctx, pot, tone(0xc0683a, 0x7a3418, 0xe8a070), { sh: 1.6, hl: 0.6, lw: 1.2 });
        line(ctx, [3, 10.5, 13, 10.5], 0.8, '#5a2208');
        fill(ctx, ell(8, 6.6, 3.8, 1.3), '#3a1404');
        stroke(ctx, ell(8, 6.6, 3.8, 1.3), 1);
        glow(ctx, 8, 6, 3, 0xffd060, 0.9, 0xffffff);
      });
    case 6: // Mermi (seri, iz ışıklı)
      return canvasOf(18, 5, (ctx) => {
        ctx.fillStyle = lin(ctx, 0, 0, 13, 0, [
          [0, 'rgba(255,200,90,0)'],
          [1, 'rgba(255,210,110,0.85)'],
        ]);
        ctx.fillRect(0, 1.6, 13, 1.8);
        shade(ctx, rr(11, 1, 6.4, 3, 1.5), tone(0xc89a50, 0x7a5a28, 0xffe0a0), { sh: 0.6, hl: 0.3, lw: 0.9 });
      });
    case 7: // Gülle
      return canvasOf(12, 12, (ctx) => {
        shade(ctx, circ(6, 6, 4.6), tone(0x3a3e46, 0x1a1c22, 0x8c949e), { sh: 1.4, hl: 0.7, lw: 1.2 });
        fill(ctx, circ(4.4, 4.4, 1.2), '#eef3f8');
      });
    case 8: // Havan mermisi
      return canvasOf(18, 12, (ctx) => {
        const shell: Build = (c) => {
          c.moveTo(4, 2);
          c.lineTo(11, 2);
          c.quadraticCurveTo(17.5, 2.6, 17.5, 6);
          c.quadraticCurveTo(17.5, 9.4, 11, 10);
          c.lineTo(4, 10);
          c.closePath();
        };
        for (const s of [-1, 1]) {
          const f = poly(4.6, 6 + s * 2.4, 1, 6 + s * 5, 0.6, 6 + s * 2.2);
          shade(ctx, f, mat(2).alt, { sh: 0.6, hl: 0.3, lw: 0.9 });
        }
        shade(ctx, shell, tone(0x4a5058, 0x26292e, 0x9aa2ac), { sh: 1.6, hl: 0.7, lw: 1.2 });
        fill(ctx, rr(9, 2.2, 1.8, 7.6, 0.6), css(mat(2).trim.base));
        glow(ctx, 17, 6, 3, PAL(2).glow, 0.7);
      });
    case 9: // Buz kıymığı (yavaşlatır)
      return canvasOf(18, 9, (ctx) => {
        energyShard(ctx, 18, 9, 0x9ef0ff, 0xffffff);
        sparkle(ctx, 5, 2.5, 1.6, '#e8fbff', 0.9);
        sparkle(ctx, 3, 6.6, 1.2, '#e8fbff', 0.8);
      });
    case 10: // Prizma lazeri: vuruş parlaması
      return canvasOf(22, 22, (ctx) => burst(ctx, 11, 11, 10.5, P.glow, 8, 0.2));
    case 11: // Işın merceği: iri vuruş parlaması
      return canvasOf(30, 30, (ctx) => {
        burst(ctx, 15, 15, 14.5, P.glow, 12, 0);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(15, 15, 9, 0, Math.PI * 2);
        ctx.stroke();
      });
    case 12: // Eter kıvılcımı: zincir şimşek parlaması
      return canvasOf(20, 20, (ctx) => lightning(ctx, 10, 10, 9.5, 5, P.glow, 7));
    case 13: // Eter kristali: daha iri şimşek parlaması
      return canvasOf(26, 26, (ctx) => {
        lightning(ctx, 13, 13, 12.5, 7, P.glow, 21);
        glow(ctx, 13, 13, 7, 0x9a6cff, 0.6);
        glow(ctx, 13, 13, 4, 0xffffff, 1);
      });
    default: // Yıldız bombası
      return canvasOf(20, 20, (ctx) => {
        glow(ctx, 10, 10, 10, 0x9a6cff, 0.7);
        glow(ctx, 10, 10, 8, P.glow, 0.7);
        star(ctx, 10, 10, 7, 3.4, 0xfff1a8);
        glow(ctx, 10, 10, 3.6, 0xffffff, 1);
      });
  }
}

// ── özel güç parçaları (aşağı doğru düşer) ───────────────
export function drawSpecial(t: number): HTMLCanvasElement {
  const P = PAL(t);
  switch (t) {
    case 0: // kozalak yağmuru
      return canvasOf(14, 22, (ctx) => {
        for (const x of [3, 7, 11]) line(ctx, [x, 0, x, 6], 0.8, 'rgba(255,255,255,0.5)');
        pinecone(ctx, 7, 13.5, 5.6, 0);
        leaf(ctx, 7, 5.5);
      });
    case 1: // erimiş bronz damlası
      return canvasOf(16, 26, (ctx) => {
        glow(ctx, 8, 18, 10, 0xff8a20, 0.6);
        const drop: Build = (c) => {
          c.moveTo(8, 1);
          c.quadraticCurveTo(10, 10, 13.6, 16);
          c.quadraticCurveTo(15.6, 23.6, 8, 24.4);
          c.quadraticCurveTo(0.4, 23.6, 2.4, 16);
          c.quadraticCurveTo(6, 10, 8, 1);
          c.closePath();
        };
        ctx.fillStyle = lin(ctx, 0, 0, 0, 25, [
          [0, '#ffe680'],
          [0.5, '#ffa030'],
          [1, '#d05a10'],
        ]);
        ctx.beginPath();
        drop(ctx);
        ctx.fill();
        stroke(ctx, drop, 1.2, '#5a1e04');
        fill(ctx, ell(6, 18, 2, 3.4), 'rgba(255,255,220,0.85)');
        fill(ctx, circ(10.5, 20.5, 1), 'rgba(255,255,220,0.7)');
      });
    case 2: // gülle + duman izi
      return canvasOf(16, 30, (ctx) => {
        for (const [y, r, a] of [[3, 3.4, 0.25], [8, 4.2, 0.35], [13.5, 5, 0.45]] as const) {
          fill(ctx, circ(8 + (y % 2), y, r), `rgba(200,200,205,${a})`);
        }
        glow(ctx, 8, 21, 8, P.glow, 0.5);
        shade(ctx, circ(8, 21.5, 6.2), tone(0x3a3e46, 0x1a1c22, 0x8c949e), { sh: 1.8, hl: 0.8, lw: 1.3 });
        fill(ctx, circ(6, 19.4, 1.6), '#eef3f8');
        line(ctx, [8, 15.3, 9.5, 12.5], 1, '#6a5a40');
        glow(ctx, 9.6, 12.4, 2.4, 0xffd060, 1, 0xffffff);
      });
    case 3: // kristal sağanağı (ADD)
      return canvasOf(12, 30, (ctx) => {
        ctx.fillStyle = lin(ctx, 0, 0, 0, 20, [
          [0, css(P.glow, 0)],
          [1, css(P.glow, 0.6)],
        ]);
        ctx.fillRect(4.5, 0, 3, 20);
        glow(ctx, 6, 22, 7, P.main, 0.7);
        const b = poly(6, 29.5, 1.4, 19, 3.6, 9, 6, 6, 8.4, 9, 10.6, 19);
        fill(ctx, b, css(P.main, 0.95));
        fill(ctx, poly(6, 29.5, 6, 6, 8.4, 9, 10.6, 19), css(P.light, 0.95));
        fill(ctx, poly(6, 27, 4.6, 18, 6, 10, 7.2, 18), '#ffffff');
      });
    default: // eter kuyrukluyıldızı (ADD)
      return canvasOf(16, 34, (ctx) => {
        ctx.fillStyle = lin(ctx, 0, 0, 0, 26, [
          [0, css(P.main, 0)],
          [1, css(P.main, 0.75)],
        ]);
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(13, 26);
        ctx.lineTo(3, 26);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = lin(ctx, 0, 6, 0, 26, [
          [0, css(P.glow, 0)],
          [1, css(P.glow, 0.85)],
        ]);
        ctx.beginPath();
        ctx.moveTo(8, 6);
        ctx.lineTo(10.6, 26);
        ctx.lineTo(5.4, 26);
        ctx.closePath();
        ctx.fill();
        glow(ctx, 8, 26, 8, P.glow, 0.8);
        glow(ctx, 8, 26, 4, 0xffffff, 1);
        sparkle(ctx, 8, 26, 7, '#ffffff', 0.9);
      });
  }
}

function leaf(ctx: Ctx, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  const b: Build = (c) => {
    c.moveTo(0, 0);
    c.quadraticCurveTo(2.6, -1.6, 4.6, -3.6);
    c.quadraticCurveTo(1, -3.6, 0, 0);
    c.closePath();
  };
  fill(ctx, b, '#6db04a');
  stroke(ctx, b, 0.8);
  ctx.restore();
}

// ── kule yuvası ──────────────────────────────────────────
/** Yuva plakası: üstten görünen döner yatak + ön yüz; tüm kademelerde nötr demir/pirinç. */
export function drawSlot(): HTMLCanvasElement {
  return canvasOf(36, 10, (ctx) => {
    const face = rr(1, 3, 34, 6.2, 2.4);
    shade(ctx, face, tone(0x4a4440, 0x2a2624, 0x7a706a), { sh: 1.4, hl: 0.6, lw: 1.3 });
    for (const x of [5, 12, 18, 24, 31]) rivet(ctx, x, 6.2, 0.8, tone(0xc89a50, 0x7a5a28, 0xffe0a0));
    shade(ctx, ell(18, 3.2, 15, 2.6), tone(0x5a524c, 0x2e2a28, 0x8a807a), { sh: 0.8, hl: 0.4, lw: 1.1 });
    fill(ctx, ell(18, 3, 9.5, 1.4), 'rgba(20,16,14,0.6)');
  });
}

// ── kale çatlakları ──────────────────────────────────────
/**
 * Hasar alan kalenin duvarına konan çatlak (yanık izi + kırık çizgileri). variant: 0 hafif, 1 derin.
 * Ortası kalenin duvarına oturur; her kademenin malzemesinin üstünde okunsun diye koyu ve nötr.
 */
export function drawCracks(variant: number): HTMLCanvasElement {
  const W = 56;
  const H = 72;
  return canvasOf(W, H, (ctx) => {
    const R = rng(31 + variant * 17);
    // is / yanık lekesi
    const g = ctx.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, W * 0.48);
    g.addColorStop(0, `rgba(20,14,10,${variant ? 0.3 : 0.16})`);
    g.addColorStop(1, 'rgba(20,14,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // ana yarık: yukarıdan aşağı zikzak; birkaç kısa dal. Önce açık kenar (ışık), üstüne koyu yarık.
    const cracks: number[][] = [];
    const main = (x0: number, len: number) => {
      const pts = [x0, H * 0.14];
      let x = x0;
      let y = H * 0.14;
      const steps = 9;
      for (let i = 0; i < steps; i++) {
        // düzenli zikzak: her adımda yön değişir, küçük sapma
        x += (i % 2 ? 1 : -1) * R.range(1.5, 4) + R.range(-1, 1);
        y += len / steps;
        pts.push(x, y);
        if (i > 1 && i < steps - 2 && R.next() < 0.35) {
          const dir = i % 2 ? 1 : -1;
          cracks.push([x, y, x + dir * R.range(3, 6), y + R.range(1, 4), x + dir * R.range(6, 10), y + R.range(2, 7)]);
        }
      }
      cracks.push(pts);
    };
    main(W / 2 + R.range(-6, 6), H * (variant ? 0.72 : 0.55));
    if (variant) main(W / 2 + R.range(-16, -8), H * 0.45);
    const lw = variant ? 1.8 : 1.3;
    for (const p of cracks) line(ctx, p.map((v, i) => v + (i % 2 ? 0.8 : 0.6)), lw + 0.4, 'rgba(255,240,220,0.3)');
    for (const p of cracks) line(ctx, p, lw, 'rgba(22,14,10,0.9)');
    // derin hasarda kopmuş taş parçaları
    if (variant) {
      for (let i = 0; i < 3; i++) {
        const x = W / 2 + R.range(-12, 12);
        const y = H * R.range(0.35, 0.8);
        fill(ctx, poly(x, y, x + R.range(3, 6), y + R.range(-1, 2), x + R.range(1, 4), y + R.range(3, 6)), 'rgba(22,14,10,0.8)');
      }
    }
  });
}

// ── beyaz parçacık dokuları (çalışma anında renklendirilir; 1x) ─
export function drawParticle(key: 'px' | 'dot' | 'soft' | 'ring'): HTMLCanvasElement {
  switch (key) {
    case 'px':
      // düz beyaz kare (lazer ışını gibi esnetilerek de kullanılıyor; köşeler dolu kalmalı)
      return canvasOf(4, 4, (ctx) => {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 4, 4);
      }, 1);
    case 'dot':
      return canvasOf(8, 8, (ctx) => {
        const g = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.7, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 8, 8);
      }, 1);
    case 'soft':
      return canvasOf(32, 32, (ctx) => {
        const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, 'rgba(255,255,255,0.75)');
        g.addColorStop(0.4, 'rgba(255,255,255,0.4)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 32, 32);
      }, 1);
    default:
      return canvasOf(64, 64, (ctx) => {
        const g = ctx.createRadialGradient(32, 32, 22, 32, 32, 31);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.45, 'rgba(255,255,255,1)');
        g.addColorStop(0.6, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
      }, 1);
  }
}

void darken;
