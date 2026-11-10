// Uygulama ikonu: oyunun kendi golem çizimini (client/art/units.ts) çok yüksek çözünürlükte çizip
// mavi-kırmızı cephe hattının önüne yerleştirir. Mobil (iOS, Android) ve web ikonlarını yazar.
//
//   npx tsx tools/bake-icon.ts                 → tüm boyutlar + Assets.car (Xcode varsa)
//   npx tsx tools/bake-icon.ts --preview <dir> → aday tasarımları <dir>/candidates.png olarak yazar
//
// Çıktı: mobile/icons/ios/*.png, mobile/icons/android/*.png, mobile/icons/ios/Assets.car,
//        public/icon-512.png, public/apple-touch-icon.png, public/favicon.png
import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

(globalThis as unknown as { document: unknown }).document = {
  createElement: (tag: string) => {
    if (tag !== 'canvas') throw new Error(`desteklenmeyen öğe: ${tag}`);
    return createCanvas(1, 1);
  },
};
// Dokular oyunda 2× çizilir; ikon için golem ~700 px olacağından 12× çizilir (çizgiler keskin kalsın).
(globalThis as { GOLEM_ART_SCALE?: number }).GOLEM_ART_SCALE = 12;

const L = await import('../client/art/layout');
const { drawBody, drawLeg, drawWeapon } = await import('../client/art/units');
const C = await import('../client/art/canvas');

type Ctx = CanvasRenderingContext2D;
type Arch = 'melee' | 'ranged' | 'heavy';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Ana tasarım boyutu: tüm koordinatlar bu 1024 birimlik kareye göre. */
const M = 1024;

// ── golem ────────────────────────────────────────────────
/** Birimi oyundaki gibi parçalarından birleştirir (bake-mobile.ts'teki unitIcon'un büyük hali). */
function golem(t: number, arch: Arch, team: 'a' | 'e'): Canvas {
  const lay = L.LAYOUT[arch];
  const K = L.ART_SCALE;
  const c = createCanvas(150 * K, 130 * K);
  const ctx = c.getContext('2d');
  ctx.translate(75 * K, 115 * K);
  ctx.scale(K, K);
  const draw = (img: Canvas, x: number, y: number) => ctx.drawImage(img, x, y, img.width / K, img.height / K);
  const leg = drawLeg(t, arch) as unknown as Canvas;
  // arka bacak biraz koyu (oyundaki gibi)
  const dark = createCanvas(leg.width, leg.height);
  const dctx = dark.getContext('2d');
  dctx.drawImage(leg, 0, 0);
  dctx.globalCompositeOperation = 'source-atop';
  dctx.fillStyle = 'rgba(0,0,0,0.27)';
  dctx.fillRect(0, 0, dark.width, dark.height);
  draw(dark, -lay.legGap / 2 - lay.legW / 2, lay.hipY);
  draw(leg, lay.legGap / 2 - lay.legW / 2, lay.hipY);
  draw(drawBody(t, arch, team) as unknown as Canvas, -lay.bodyW / 2, lay.hipY + 3 - lay.bodyH);
  const W = lay.weapon;
  ctx.save();
  ctx.translate(W.x, W.y);
  ctx.rotate(W.rot);
  draw(drawWeapon(t, arch) as unknown as Canvas, -W.w * W.ox, -W.h * W.oy);
  ctx.restore();
  return c;
}

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
  return [x0, y0, x1 - x0 + 2, y1 - y0 + 2];
}

// ── arka planlar ─────────────────────────────────────────
const BLUE = L.TEAM.a;
const RED = L.TEAM.e;

/**
 * Cephe hattı: üstten alta kırık çizgi (sol mavi, sağ kırmızı). Uçları karenin dışına taşar:
 * Android adaptive icon katmanı tasarımdan büyüktür, arka plan oraya da uzanmalı.
 */
const SEAM = [640, -360, 596, -10, 566, 150, 618, 250, 548, 400, 600, 500, 520, 660, 566, 760, 486, 900, 520, 1034, 470, 1380];
/** Arka planın tasarım karesinin dışına taştığı pay (adaptive icon katmanı için). */
const BLEED = M / 2;

function bgFront(ctx: Ctx) {
  ctx.fillStyle = C.lin(ctx, 0, 0, M, M, [
    [0, C.css(C.lighten(BLUE, 0.1))],
    [1, C.css(C.darken(BLUE, 0.55))],
  ]);
  ctx.fillRect(-BLEED, -BLEED, M + BLEED * 2, M + BLEED * 2);
  const seam = () => {
    ctx.moveTo(SEAM[0], SEAM[1]);
    for (let i = 2; i < SEAM.length; i += 2) ctx.lineTo(SEAM[i], SEAM[i + 1]);
  };
  ctx.beginPath();
  seam();
  ctx.lineTo(M + BLEED, M + BLEED);
  ctx.lineTo(M + BLEED, -BLEED);
  ctx.closePath();
  ctx.fillStyle = C.lin(ctx, M, 0, 0, M, [
    [0, C.css(C.lighten(RED, 0.08))],
    [1, C.css(C.darken(RED, 0.5))],
  ]);
  ctx.fill();
  // ışın demetleri (merkezden dışa)
  ctx.save();
  ctx.translate(M / 2, M * 0.55);
  for (let i = 0; i < 16; i++) {
    ctx.rotate((Math.PI * 2) / 16);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-150, -1500);
    ctx.lineTo(150, -1500);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
  }
  ctx.restore();
  // hat boyunca altın kıvılcım
  ctx.save();
  ctx.beginPath();
  seam();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,214,102,0.35)';
  ctx.lineWidth = 46;
  ctx.stroke();
  ctx.strokeStyle = '#ffd666';
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = '#fffbe8';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

function bgSky(ctx: Ctx) {
  ctx.fillStyle = C.lin(ctx, 0, 0, 0, M, [
    [0, '#2f6fcb'],
    [0.45, '#5596e0'],
    [0.75, '#9ccaf2'],
    [1, '#d6ebf8'],
  ]);
  ctx.fillRect(0, 0, M, M);
  C.glow(ctx as never, 790, 230, 330, 0xfff3c4, 0.85, 0xffffff);
}

function bgDark(ctx: Ctx) {
  ctx.fillStyle = '#141a33';
  ctx.fillRect(0, 0, M, M);
  C.glow(ctx as never, 260, 380, 560, BLUE, 0.55);
  C.glow(ctx as never, 800, 700, 560, RED, 0.45);
}

/** Köşeleri koyulaştıran hafif kenar gölgesi. */
function vignette(ctx: Ctx, a: number) {
  const g = ctx.createRadialGradient(M / 2, M / 2, M * 0.3, M / 2, M / 2, M * 0.75);
  g.addColorStop(0, 'rgba(10,12,30,0)');
  g.addColorStop(1, `rgba(10,12,30,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(-BLEED, -BLEED, M + BLEED * 2, M + BLEED * 2);
}

/** Golemin bastığı kayalık zemin. */
function ledge(ctx: Ctx, y: number) {
  const stone = C.tone(0x8a8577);
  const grass = C.tone(0x5fb54a);
  C.softShadow(ctx as never, M / 2, y + 30, 340, 70, 0.45);
  C.shade(ctx as never, C.rpoly(30, 170, y - 10, 854, y - 10, 790, y + 110, 234, y + 110), stone, { sh: 22, hl: 8, lw: 12 });
  C.shade(ctx as never, C.rr(150, y - 40, 724, 64, 32), grass, { sh: 16, hl: 7, lw: 12 });
}

// ── ikon ─────────────────────────────────────────────────
interface Opts {
  bg: 'front' | 'sky' | 'dark';
  tier: number;
  arch: Arch;
  /** golemin kaplayacağı en fazla yükseklik/genişlik (ana tasarım biriminde) */
  box: number;
  ground: boolean;
}

const golemCache = new Map<string, Canvas>();

/**
 * full: tek parça ikon. Android adaptive icon katmanları: bg (arka plan), fg (saydam, golem),
 * mono (Android 13+ tema ikonu: yalnızca alfa kullanılır, sistem kendi rengine boyar).
 */
type Layer = 'full' | 'bg' | 'fg' | 'mono';

/** zoom < 1: tasarım ortada küçülür, arka plan kenarlara taşar (adaptive icon katmanı). */
function drawIcon(o: Opts, size = M, layer: Layer = 'full', zoom = 1): Canvas {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d') as unknown as Ctx;
  ctx.scale(size / M, size / M);
  ctx.translate(M / 2, M / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-M / 2, -M / 2);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (layer === 'full' || layer === 'bg') {
    if (o.bg === 'front') bgFront(ctx);
    else if (o.bg === 'sky') bgSky(ctx);
    else bgDark(ctx);
    vignette(ctx, o.bg === 'sky' ? 0.25 : 0.5);
  }
  if (layer === 'bg') return c;

  const key = `${o.tier}_${o.arch}`;
  if (!golemCache.has(key)) golemCache.set(key, golem(o.tier, o.arch, 'a'));
  const g = golemCache.get(key)!;
  const [bx, by, bw, bh] = contentBox(g);
  const s = Math.min(o.box / bw, o.box / bh);
  const w = bw * s;
  const h = bh * s;
  const feet = o.ground ? 800 : M / 2 + h / 2 + 10;
  const ictx = ctx as unknown as SKRSContext2D;
  if (layer === 'mono') {
    ictx.drawImage(g, bx, by, bw, bh, M / 2 - w / 2, feet - h, w, h);
    return monochrome(c);
  }
  if (o.ground) ledge(ctx, feet);
  else C.softShadow(ctx as never, M / 2, feet - 6, w * 0.42, 34, 0.5);
  // arkasında yumuşak ışık: gövde zemin renginden ayrışsın
  C.glow(ctx as never, M / 2, feet - h * 0.5, h * 0.62, 0xffffff, 0.33);
  // ince parlak hale + çizim (shadowBlur dönüşümden etkilenmez, elle ölçeklenir)
  ictx.save();
  ictx.shadowColor = 'rgba(255,255,255,0.55)';
  ictx.shadowBlur = 28 * (size / M) * zoom;
  ictx.drawImage(g, bx, by, bw, bh, M / 2 - w / 2, feet - h, w, h);
  ictx.restore();
  return c;
}

/**
 * Tema ikonu: beyaz golem silueti. Koyu dış çizgiler saydam bırakılır, böylece siluet düz bir leke
 * olmaz, gövde / kol / kafa ayrımı çizgi olarak görünür.
 */
function monochrome(c: Canvas): Canvas {
  const ctx = c.getContext('2d');
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    const k = Math.min(1, Math.max(0, (lum - 0.14) / 0.12));
    d[i + 3] = Math.round(d[i + 3] * k);
    d[i] = d[i + 1] = d[i + 2] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ── boyutlar ─────────────────────────────────────────────
/** Ana tasarımı yüksek kaliteyle küçültür (yarıya yarıya iner, çizgiler kırılmasın). */
function downscale(src: Canvas, size: number): Canvas {
  let cur = src;
  while (cur.width / 2 >= size * 1.5) {
    const half = createCanvas(Math.round(cur.width / 2), Math.round(cur.height / 2));
    const hctx = half.getContext('2d');
    hctx.imageSmoothingEnabled = true;
    hctx.imageSmoothingQuality = 'high';
    hctx.drawImage(cur, 0, 0, half.width, half.height);
    cur = half;
  }
  const out = createCanvas(size, size);
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(cur, 0, 0, size, size);
  return out;
}

/**
 * Saydamlık kanalı olmayan (RGB) PNG. iOS ikonlarında alfa olmamalı: App Store 1024'lük ikonu reddeder,
 * saydam pikseller cihazda siyah görünür. @napi-rs/canvas hep RGBA yazdığı için PNG elle kurulur (Paeth süzgeci).
 */
function pngRGB(c: Canvas): Buffer {
  const { width: w, height: h } = c;
  const d = c.getContext('2d').getImageData(0, 0, w, h).data;
  const stride = w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  const px = (x: number, y: number, ch: number) => (x < 0 || y < 0 ? 0 : d[(y * w + x) * 4 + ch]);
  for (let y = 0; y < h; y++) {
    const row = y * (stride + 1);
    raw[row] = 4; // Paeth
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] !== 255) throw new Error(`ikon saydam olmamalı (${x},${y})`);
      for (let ch = 0; ch < 3; ch++) {
        const a = px(x - 1, y, ch);
        const b = px(x, y - 1, ch);
        const cc = px(x - 1, y - 1, ch);
        const p = a + b - cc;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - cc);
        const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : cc;
        raw[row + 1 + x * 3 + ch] = (px(x, y, ch) - pred) & 255;
      }
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit derinliği
  ihdr[9] = 2; // RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const write = (file: string, c: Canvas) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, pngRGB(c));
};
/** Saydamlığı olan katmanlar (adaptive icon ön planı, tema ikonu). */
const writeAlpha = (file: string, c: Canvas) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, c.toBuffer('image/png'));
};

/** Android 8+ (API 26) bu dosyayı drawable-*dpi/icon.png yerine kullanır; Defold'un manifesti @drawable/icon'a bakar. */
const ADAPTIVE_XML = `<?xml version="1.0" encoding="utf-8"?>
<!-- tools/bake-icon.ts yazar. Android 8+ adaptive icon; <monochrome> Android 13+ tema ikonu. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/icon_bg" />
    <foreground android:drawable="@drawable/icon_fg" />
    <monochrome android:drawable="@drawable/icon_mono" />
</adaptive-icon>
`;

/**
 * iOS 11+ ikonu Info.plist'teki CFBundleIconName = AppIcon üzerinden derlenmiş varlık kataloğundan (Assets.car) okur.
 * Xcode'un actool aracıyla tek boyutlu (1024) AppIcon kümesi derlenir; Xcode yoksa adım atlanır.
 */
function buildAssetsCar(master: Canvas, outFile: string) {
  try {
    execFileSync('xcrun', ['--find', 'actool'], { stdio: 'ignore' });
  } catch {
    console.warn('Xcode (actool) bulunamadı: Assets.car yazılmadı, mevcut dosya korunuyor.');
    return;
  }
  const tmp = mkdtempSync(join(tmpdir(), 'golem-icon-'));
  try {
    const cat = join(tmp, 'Assets.xcassets');
    const set = join(cat, 'AppIcon.appiconset');
    mkdirSync(set, { recursive: true });
    const info = { author: 'xcode', version: 1 };
    writeFileSync(join(cat, 'Contents.json'), JSON.stringify({ info }));
    writeFileSync(join(set, 'icon_1024.png'), pngRGB(master));
    writeFileSync(
      join(set, 'Contents.json'),
      JSON.stringify({ images: [{ filename: 'icon_1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }], info }),
    );
    const out = join(tmp, 'out');
    mkdirSync(out);
    execFileSync(
      'xcrun',
      [
        'actool', cat,
        '--compile', out,
        '--platform', 'iphoneos',
        '--minimum-deployment-target', '12.0',
        '--app-icon', 'AppIcon',
        '--target-device', 'iphone',
        '--target-device', 'ipad',
        '--output-partial-info-plist', join(tmp, 'partial.plist'),
        '--output-format', 'human-readable-text',
        '--errors', '--warnings',
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    );
    mkdirSync(dirname(outFile), { recursive: true });
    copyFileSync(join(out, 'Assets.car'), outFile);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const FINAL: Opts = { bg: 'front', tier: 2, arch: 'heavy', box: 720, ground: false };

const args = process.argv.slice(2);
if (args[0] === '--preview') {
  const out = args[1] ?? '.';
  const cands: Opts[] = [
    FINAL,
    { bg: 'front', tier: 3, arch: 'heavy', box: 640, ground: false },
    { bg: 'sky', tier: 2, arch: 'heavy', box: 600, ground: true },
    { bg: 'dark', tier: 4, arch: 'heavy', box: 640, ground: false },
  ];
  const T = 300;
  const sheet = createCanvas(cands.length * (T + 20) + 20, T + 40);
  const sctx = sheet.getContext('2d');
  sctx.fillStyle = '#e8e8ee';
  sctx.fillRect(0, 0, sheet.width, sheet.height);
  cands.forEach((o, i) => {
    const big = drawIcon(o);
    write(join(out, `cand_${i}.png`), big);
    sctx.drawImage(downscale(big, T), 20 + i * (T + 20), 20);
  });
  write(join(out, 'candidates.png'), sheet);
  console.log(`adaylar: ${join(out, 'candidates.png')}`);
} else {
  const master = drawIcon(FINAL);
  const IOS = [76, 120, 152, 167, 180];
  const ANDROID = [36, 48, 72, 96, 144, 192];
  for (const s of IOS) write(join(ROOT, 'mobile/icons/ios', `icon_${s}.png`), downscale(master, s));
  for (const s of ANDROID) write(join(ROOT, 'mobile/icons/android', `icon_${s}.png`), downscale(master, s));
  write(join(ROOT, 'mobile/icons/icon_1024.png'), master);
  write(join(ROOT, 'public/icon-512.png'), downscale(master, 512));
  write(join(ROOT, 'public/apple-touch-icon.png'), downscale(master, 180));
  write(join(ROOT, 'public/favicon.png'), downscale(master, 64));
  buildAssetsCar(master, join(ROOT, 'mobile/icons/ios/Assets.car'));

  // Android adaptive icon: katmanlar 108dp, launcher ortadaki 72dp'yi kendi şekliyle (daire, yuvarlak kare…)
  // keser; tasarım bu 72dp'ye oturur. Golem 66dp'lik güvenli dairenin içinde kalır.
  // game.project → bundle_resources = /res; Defold res/android/res/ altını Android kaynağı olarak ekler.
  const ZOOM = 72 / 108;
  const RES = join(ROOT, 'mobile/res/android/res');
  const bg = drawIcon(FINAL, M, 'bg', ZOOM);
  const fg = drawIcon(FINAL, M, 'fg', ZOOM);
  const mono = drawIcon(FINAL, M, 'mono', ZOOM);
  const DPI: [string, number][] = [['mdpi', 108], ['hdpi', 162], ['xhdpi', 216], ['xxhdpi', 324], ['xxxhdpi', 432]];
  for (const [dpi, px] of DPI) {
    write(join(RES, `drawable-${dpi}`, 'icon_bg.png'), downscale(bg, px));
    writeAlpha(join(RES, `drawable-${dpi}`, 'icon_fg.png'), downscale(fg, px));
    writeAlpha(join(RES, `drawable-${dpi}`, 'icon_mono.png'), downscale(mono, px));
  }
  mkdirSync(join(RES, 'drawable-anydpi-v26'), { recursive: true });
  writeFileSync(join(RES, 'drawable-anydpi-v26', 'icon.xml'), ADAPTIVE_XML);
  console.log('ikonlar yazıldı: mobile/icons/, mobile/res/android/, public/');
}
