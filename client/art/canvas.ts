// Canvas 2D çizim yardımcıları: renk işlemleri, şekil yolları, hücre gölgelemesi (cel shading), parıltı.
// Tüm çizimler "ekran birimi" ile yapılır; tuval ART_SCALE katı büyük açılır ve ctx önceden ölçeklenir.

export type Ctx = CanvasRenderingContext2D;
export type Build = (ctx: Ctx) => void;

export const OUT = 0x1a1a24;
export const OUTC = '#1a1a24';

/** Şu an çizilen tuvalin çözünürlük çarpanı (shadowBlur gibi dönüşümden etkilenmeyen değerler için). */
let curScale = 1;
export const scaleNow = () => curScale;

export function makeCanvas(w: number, h: number, scale = 1, cpu = true): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * scale));
  c.height = Math.max(1, Math.ceil(h * scale));
  // willReadFrequently: tuvali CPU'da (yazılımla) tutar. Küçük dokular için daha hızlı; GPU'ya yükleme
  // ve ikon için drawImage/toDataURL sırasında GPU'dan geri okuma beklemesi olmaz.
  const ctx = c.getContext('2d', { willReadFrequently: cpu })!;
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  curScale = scale;
  return { c, ctx };
}

// ── renk ─────────────────────────────────────────────────
export function css(n: number, a = 1): string {
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
export const lighten = (n: number, t: number) => mix(n, 0xffffff, t);
export const darken = (n: number, t: number) => mix(n, 0x000000, t);

/** Üç tonlu malzeme rengi. */
export interface Tone {
  base: number;
  dark: number;
  light: number;
}
export const tone = (base: number, dark?: number, light?: number): Tone => ({
  base,
  dark: dark ?? darken(base, 0.35),
  light: light ?? lighten(base, 0.35),
});

// ── yol kurucular ────────────────────────────────────────
export function rr(x: number, y: number, w: number, h: number, r: number): Build {
  return (ctx) => {
    const rad = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  };
}
export function poly(...xy: number[]): Build {
  return (ctx) => {
    ctx.moveTo(xy[0], xy[1]);
    for (let i = 2; i < xy.length; i += 2) ctx.lineTo(xy[i], xy[i + 1]);
    ctx.closePath();
  };
}
/** Köşeleri yuvarlatılmış çokgen. */
export function rpoly(r: number, ...xy: number[]): Build {
  return (ctx) => {
    const n = xy.length / 2;
    const px = (i: number) => xy[((i + n) % n) * 2];
    const py = (i: number) => xy[((i + n) % n) * 2 + 1];
    ctx.moveTo((px(-1) + px(0)) / 2, (py(-1) + py(0)) / 2);
    for (let i = 0; i < n; i++) ctx.arcTo(px(i), py(i), (px(i) + px(i + 1)) / 2, (py(i) + py(i + 1)) / 2, r);
    ctx.closePath();
  };
}
export function ell(cx: number, cy: number, rx: number, ry: number, rot = 0): Build {
  return (ctx) => {
    ctx.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot));
    ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
    ctx.closePath();
  };
}
export const circ = (cx: number, cy: number, r: number): Build => ell(cx, cy, r, r);
/** Kalın bir uzuv: iki uç arasında yuvarlak uçlu kapsül. */
export function capsule(x0: number, y0: number, x1: number, y1: number, r0: number, r1 = r0): Build {
  return (ctx) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    const n = a + Math.PI / 2;
    ctx.moveTo(x0 + Math.cos(n) * r0, y0 + Math.sin(n) * r0);
    ctx.arc(x0, y0, r0, n, n + Math.PI);
    ctx.lineTo(x1 + Math.cos(n + Math.PI) * r1, y1 + Math.sin(n + Math.PI) * r1);
    ctx.arc(x1, y1, r1, n + Math.PI, n + Math.PI * 2);
    ctx.closePath();
  };
}
/** Serbest yol (bezier vs.). */
export const path = (fn: Build): Build => fn;

// ── boyama ───────────────────────────────────────────────
export function fill(ctx: Ctx, b: Build, color: string | CanvasGradient | CanvasPattern) {
  ctx.beginPath();
  b(ctx);
  ctx.fillStyle = color;
  ctx.fill();
}
export function stroke(ctx: Ctx, b: Build, lw = 1.6, color: string = OUTC) {
  ctx.beginPath();
  b(ctx);
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.stroke();
}
export function line(ctx: Ctx, pts: number[], lw: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.stroke();
}
export function clipTo(ctx: Ctx, b: Build, inner: () => void) {
  ctx.save();
  ctx.beginPath();
  b(ctx);
  ctx.clip();
  inner();
  ctx.restore();
}

export interface ShadeOpts {
  /** gölge hilalinin genişliği (sağ-alt) */
  sh?: number;
  /** ışık hilalinin genişliği (sol-üst) */
  hl?: number;
  /** dış çizgi kalınlığı (0 = yok) */
  lw?: number;
  /** çizgi rengi */
  oc?: string;
  /** çizgiden önce gölgeleme dışında iç detay çizmek için */
  inner?: () => void;
}

/**
 * Hücre gölgeli şekil: koyu taban, sol-üste kaydırılmış ana ton (sağ-altta gölge hilali kalır),
 * sol-üst kenarda ince açık hilal, isteğe bağlı yumuşak parlaklık ve kalın dış çizgi.
 */
export function shade(ctx: Ctx, b: Build, t: Tone, o: ShadeOpts = {}) {
  const sh = o.sh ?? 2.2;
  const hl = o.hl ?? 1;
  const lw = o.lw ?? 1.6;
  ctx.save();
  ctx.beginPath();
  b(ctx);
  ctx.clip();
  ctx.fillStyle = css(t.dark);
  ctx.fillRect(-4000, -4000, 8000, 8000);
  if (sh > 0) {
    ctx.save();
    ctx.translate(-sh * 0.55, -sh);
    ctx.beginPath();
    b(ctx);
    ctx.fillStyle = css(t.base);
    ctx.fill();
    ctx.restore();
  }
  if (hl > 0) {
    ctx.beginPath();
    b(ctx);
    ctx.translate(hl * 0.8, hl);
    b(ctx);
    ctx.translate(-hl * 0.8, -hl);
    ctx.fillStyle = css(t.light);
    ctx.fill('evenodd');
  }
  if (o.inner) o.inner();
  ctx.restore();
  if (lw > 0) stroke(ctx, b, lw, o.oc ?? OUTC);
}

/** Şeklin içine kırpılmış yumuşak beyaz parlama (metal/kristal parlaklığı). */
export function gloss(ctx: Ctx, b: Build, x: number, y: number, r: number, a = 0.6, color = 0xffffff) {
  clipTo(ctx, b, () => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, css(color, a));
    g.addColorStop(1, css(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  });
}

/** Radyal parıltı (ışık lekesi). */
export function glow(ctx: Ctx, x: number, y: number, r: number, color: number, a = 1, core?: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, css(core ?? color, a));
  g.addColorStop(0.35, css(color, a * 0.6));
  g.addColorStop(1, css(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Parlayan göz / çekirdek: dış hale + parlak çekirdek. */
export function eye(ctx: Ctx, x: number, y: number, w: number, h: number, color: number, haloR = 4) {
  glow(ctx, x, y, haloR, color, 0.75);
  fill(ctx, ell(x, y, w / 2 + 0.5, h / 2 + 0.5), css(darken(color, 0.3)));
  fill(ctx, ell(x, y, w / 2, h / 2), css(lighten(color, 0.55)));
  fill(ctx, ell(x - w * 0.12, y - h * 0.12, w * 0.22, h * 0.22), '#ffffff');
}

/** Yıldız / parıltı işareti. */
export function sparkle(ctx: Ctx, x: number, y: number, r: number, color = '#ffffff', a = 1) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

/** Perçin. */
export function rivet(ctx: Ctx, x: number, y: number, r: number, t: Tone) {
  fill(ctx, circ(x + r * 0.25, y + r * 0.3, r), css(darken(t.dark, 0.3), 0.8));
  fill(ctx, circ(x, y, r), css(t.base));
  fill(ctx, circ(x - r * 0.3, y - r * 0.3, r * 0.45), css(lighten(t.light, 0.4)));
}

/** Basit, tohumlanmış rastgele sayı üreteci (mulberry32). */
export function rng(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a: number, b: number) => a + (b - a) * next(),
    int: (a: number, b: number) => Math.floor(a + (b - a + 1) * next()),
    pick: <T>(arr: T[]) => arr[Math.floor(next() * arr.length)],
  };
}

/** Yumuşak düşen gölge (zemin elipsi vb.). */
export function softShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.3) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Bir doğrusal degrade. */
export function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
