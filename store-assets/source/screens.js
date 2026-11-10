// Golem Forge — mağaza görselleri. data.js (CAPTIONS) ile birlikte çalışır.
// URL: screens.html?dev=iphone|ipad|aphone|atab|fg&slide=hero|army|eras|cards|defense|powers|online|closer|fg&lang=tr|en
(function () {
  const q = new URLSearchParams(location.search);
  const DEV = q.get('dev') || 'iphone';
  const LANG = q.get('lang') || 'tr';
  const SLIDE = q.get('slide') || 'hero';

  const SIZES = { iphone: [2868, 1320], ipad: [2752, 2064], aphone: [2560, 1440], atab: [2560, 1600], fg: [1024, 500] };
  const [W, H] = SIZES[DEV];
  const TALL = DEV === 'ipad' || DEV === 'atab';
  const APPLE = DEV === 'iphone' || DEV === 'ipad';
  const stage = document.getElementById('stage');
  stage.style.width = W + 'px';
  stage.style.height = H + 'px';
  document.documentElement.lang = LANG;

  const A = (p) => 'assets/' + p;
  const ART = (n) => A('art/' + n + '.png');
  // Arka plan katmanları ve font oyunun kendi dosyalarından okunur (mobile/assets).
  const BG = (p) => '../../mobile/assets/images/bg/' + p;
  // Ekran görüntüsü kümesi: telefonlar iPhone yakalamalarını, tabletler iPad yakalamalarını kullanır (dil başına).
  const CAP = (n) => A('captures/' + (TALL ? 'ipad' : 'iphone') + '/' + LANG + '/' + n + '.png');

  const C = CAPTIONS[LANG] || CAPTIONS.en;
  const cap = C.slides.reduce((m, s) => ((m[s.slot] = s), m), {});
  const L = { eras: C.eras, fgTag: C.fgTag };
  const LOCALE = LANG === 'tr' ? 'tr-TR' : LANG;

  // ---------- yardımcılar ----------
  function el(tag, cls, css, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) Object.assign(e.style, css);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function add(e, parent) { (parent || stage).appendChild(e); return e; }
  const px = (v) => Math.round(v) + 'px';

  function headlineHTML(s, oneLine) {
    const text = oneLine ? s.headline.replace(/\n/g, ' ') : s.headline;
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    let h = esc(text);
    if (s.emphasis) {
      const i = h.indexOf(esc(s.emphasis));
      if (i >= 0) h = h.slice(0, i) + '<span class="em">' + esc(s.emphasis) + '</span>' + h.slice(i + esc(s.emphasis).length);
    }
    return h.replace(/\n/g, '<br>');
  }

  // Başlık bloğu: eyebrow + headline; genişliğe sığana kadar küçülür.
  function copyBlock(s, o) {
    const box = add(el('div', 'copy' + (o.align === 'left' ? ' left' : ''), {
      left: px(o.x), top: px(o.y), width: px(o.w),
    }));
    if (s.eyebrow && o.eyebrow !== false) {
      const eb = add(el('div', 'eyebrow', { fontSize: px(o.eyebrowPx), marginBottom: px(o.eyebrowPx * 0.55) }, s.eyebrow.toLocaleUpperCase(LOCALE)), box);
      if (o.eyebrowColor) eb.style.color = o.eyebrowColor;
    }
    const hl = add(el('div', 'headline', { fontSize: px(o.size) }, headlineHTML(s, o.oneLine)), box);
    box._fit = () => {
      let size = o.size;
      while (hl.scrollWidth > o.w && size > o.size * 0.55) {
        size -= 2;
        hl.style.fontSize = px(size);
      }
    };
    return box;
  }

  // ---------- aygıt çerçeveleri ----------
  // kind: iphone | aphone | ipad | atab. screenH verilir, gerisi oranlardan çıkar.
  function deviceGeom(kind, screenH) {
    const g = { kind, screenH };
    if (kind === 'iphone') { g.aspect = 2868 / 1320; g.bezel = screenH * 0.034; g.sr = screenH * 0.125; }
    if (kind === 'aphone') { g.aspect = 2708 / 1320; g.bezel = screenH * 0.026; g.sr = screenH * 0.075; }
    if (kind === 'ipad') { g.aspect = 2752 / 2064; g.bezel = screenH * 0.042; g.sr = screenH * 0.03; }
    if (kind === 'atab') { g.aspect = 2752 / 2064; g.bezel = screenH * 0.036; g.sr = screenH * 0.022; }
    g.screenW = screenH * g.aspect;
    g.w = g.screenW + 2 * g.bezel;
    g.h = screenH + 2 * g.bezel;
    g.r = g.sr + g.bezel;
    return g;
  }
  function deviceKind() { return { iphone: 'iphone', aphone: 'aphone', ipad: 'ipad', atab: 'atab' }[DEV]; }

  // x,y: sol üst köşe. rot: derece.
  function device(img, x, y, screenH, o = {}) {
    const g = deviceGeom(o.kind || deviceKind(), screenH);
    const d = add(el('div', 'device', {
      left: px(x), top: px(y), width: px(g.w), height: px(g.h),
      transform: o.rot ? `rotate(${o.rot}deg)` : '',
      filter: `drop-shadow(0 ${px(g.h * 0.035)} ${px(g.h * 0.05)} rgba(0,0,0,.45))`,
      zIndex: o.z || 20,
    }));
    const titanium = g.kind === 'iphone' || g.kind === 'ipad';
    add(el('div', 'shell', {
      borderRadius: px(g.r),
      background: titanium
        ? 'linear-gradient(135deg,#5b606b 0%,#2b2e35 18%,#8d929c 50%,#2b2e35 82%,#5b606b 100%)'
        : 'linear-gradient(135deg,#3a3f4a,#16181d 40%,#3a3f4a)',
    }), d);
    const ring = g.bezel * (titanium ? 0.28 : 0.2);
    add(el('div', 'shell', { inset: px(ring), borderRadius: px(g.r - ring), background: '#050608' }), d);
    const sc = add(el('div', 'screen', {
      left: px(g.bezel), top: px(g.bezel), width: px(g.screenW), height: px(g.screenH), borderRadius: px(g.sr),
    }), d);
    const im = add(el('img'), sc);
    im.src = img;
    // Android çerçevesinde iPhone yakalamasının sol şeridi (Dynamic Island bölgesi) kırpılır.
    if (g.kind === 'aphone') im.style.objectPosition = '100% 50%';
    if (o.imgPos) im.style.objectPosition = o.imgPos;
    if (g.kind === 'iphone') {
      // Dynamic Island: yakalamadaki konumla birebir (yatayda sol kenar ortası)
      add(el('div', 'island', {
        left: px(g.screenW * 0.0155), top: px(g.screenH * 0.392),
        width: px(g.screenW * 0.0375), height: px(g.screenH * 0.214),
      }), sc);
    }
    if (g.kind === 'aphone') {
      const r = g.screenH * 0.04;
      add(el('div', 'island', { left: px(g.screenW * 0.018), top: px(g.screenH / 2 - r / 2), width: px(r), height: px(r) }), sc);
    }
    if (g.kind === 'ipad' || g.kind === 'atab') {
      const r = g.bezel * 0.26;
      add(el('div', 'island', { left: px(g.w / 2 - r / 2), top: px(g.bezel / 2 - r / 2), width: px(r), height: px(r), background: '#1b2130' }), d);
    }
    add(el('div', 'glare', { borderRadius: px(g.sr) }), sc);
    d._g = g;
    return d;
  }

  // ---------- arka planlar ----------
  const THEMES = {
    dusk: { sky: 'linear-gradient(180deg,#0a1030 0%,#18265e 38%,#5b3a87 64%,#d0607a 82%,#ffb257 100%)', rays: 'rgba(255,190,110,.10)', mtn: 'brightness(.42) saturate(.8) hue-rotate(-12deg)', ground: 'brightness(.62) saturate(.9)', sun: true },
    day: { sky: 'linear-gradient(180deg,#2f6fd0 0%,#4f8fe0 40%,#93c8f4 78%,#d9efff 100%)', rays: 'rgba(255,255,255,.10)', mtn: 'none', ground: 'none', clouds: true },
    arcane: { sky: 'radial-gradient(120% 90% at 50% 38%,#4b2a8c 0%,#2a1960 45%,#120c33 100%)', rays: 'rgba(255,214,102,.08)', mtn: 'brightness(.35) saturate(.6) hue-rotate(40deg)', ground: 'brightness(.5) saturate(.7)', sparkles: true },
    siege: { sky: 'linear-gradient(180deg,#081028 0%,#14234d 40%,#2e4a7d 70%,#7d6aa8 100%)', rays: 'rgba(120,230,255,.08)', mtn: 'brightness(.45) saturate(.7)', ground: 'brightness(.55) saturate(.8)' },
    versus: { sky: 'linear-gradient(105deg,#0d2a7a 0%,#1f4fd0 36%,#3b2a6e 50%,#c22d3a 64%,#6e0f1c 100%)', rays: 'rgba(255,255,255,.07)', mtn: 'brightness(.35) saturate(.5)', ground: 'brightness(.5) saturate(.8)' },
    gold: { sky: 'radial-gradient(110% 100% at 30% 30%,#ffe27a 0%,#ffbf2e 35%,#f08a12 70%,#a8430a 100%)', rays: 'rgba(255,255,255,.16)', mtn: 'brightness(.55) saturate(.6) sepia(.5)', ground: 'brightness(.7) saturate(.9)' },
    eras: { sky: 'linear-gradient(90deg,#8a5a2b 0%,#c8902e 22%,#5d6b7d 45%,#3fb6d8 70%,#8b5cf6 100%)', rays: 'rgba(255,255,255,.10)', mtn: 'brightness(.6) saturate(.5)', ground: 'none', shade: true },
  };

  function background(themeName, o = {}) {
    const t = THEMES[themeName];
    const bg = add(el('div', 'layer', { background: t.sky }));
    const groundH = o.groundH ?? H * (TALL ? 0.11 : 0.15);
    if (t.shade) add(el('div', 'layer', { background: 'linear-gradient(180deg,rgba(8,10,30,.55) 0%,rgba(8,10,30,.05) 45%,rgba(8,10,30,.25) 100%)' }));
    // ışın patlaması
    const rx = o.raysX ?? 50, ry = o.raysY ?? 60;
    add(el('div', 'layer', {
      background: `repeating-conic-gradient(from 0deg at ${rx}% ${ry}%, ${t.rays} 0deg 5deg, transparent 5deg 12deg)`,
      maskImage: `radial-gradient(70% 80% at ${rx}% ${ry}%, #000 0%, transparent 75%)`,
      WebkitMaskImage: `radial-gradient(70% 80% at ${rx}% ${ry}%, #000 0%, transparent 75%)`,
    }));
    if (t.sun) add(el('div', 'abs', { left: px(W * 0.5 - H * 0.35), top: px(H * 0.42), width: px(H * 0.7), height: px(H * 0.7), borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,214,140,.55) 0%, rgba(255,160,90,.18) 40%, transparent 70%)' }));
    if (t.sparkles) {
      for (let i = 0; i < 70; i++) {
        const s = (Math.sin(i * 91.7) * 0.5 + 0.5), u = (Math.sin(i * 37.3 + 1) * 0.5 + 0.5);
        const r = H * (0.002 + 0.004 * ((i * 7) % 5) / 5);
        add(el('div', 'abs', { left: px(W * s), top: px(H * 0.75 * u), width: px(r * 2), height: px(r * 2), borderRadius: '50%', background: i % 3 ? 'rgba(255,230,150,.75)' : 'rgba(190,170,255,.8)', boxShadow: `0 0 ${px(r * 4)} rgba(255,220,140,.8)` }));
      }
    }
    if (t.clouds) {
      [[0.04, 0.12, 0.30, 0], [0.80, 0.08, 0.26, 1], [0.62, 0.30, 0.18, 2], [0.18, 0.40, 0.16, 1]].forEach(([x, y, s, k]) => {
        add(el('img', 'abs', { left: px(W * x), top: px(H * y), height: px(H * s), opacity: .95 })).src = BG('bg_cloud_' + k + '.png');
      });
    }
    // dağlar ve tepeler (oyunun kendi katmanları)
    const gTop = H - groundH;
    const mtn = (file, h, off, opacity) => add(el('div', 'abs', {
      left: 0, width: px(W), top: px(gTop - h + off), height: px(h),
      backgroundImage: `url(${BG('' + file)})`, backgroundRepeat: 'repeat-x', backgroundSize: `auto ${px(h)}`,
      backgroundPosition: `${px(-W * 0.13)} 0`, filter: t.mtn, opacity,
    }));
    if (o.mountains !== false) {
      mtn('bg_far2_0.png', H * (TALL ? 0.14 : 0.19), H * 0.0, 0.9);
      mtn('bg_far_0.png', H * (TALL ? 0.12 : 0.165), H * 0.005, 1);
      mtn('bg_mid_0.png', H * (TALL ? 0.11 : 0.15), H * 0.012, 1);
    }
    add(el('div', 'abs', {
      left: 0, width: px(W), top: px(gTop), height: px(groundH),
      backgroundImage: `url(${BG('bg_ground_0.png')})`, backgroundRepeat: 'repeat-x', backgroundSize: `auto ${px(groundH * 1.25)}`,
      backgroundPosition: '0 0', filter: t.ground,
    }));
    return { groundTop: gTop };
  }

  // Kesim görseli: x,y = alt orta nokta (ayak hizası), h = yükseklik.
  function cutout(name, cx, bottom, h, o = {}) {
    const im = add(el('img', 'cut', {
      height: px(h), left: px(cx), top: px(bottom - h),
      transform: `translateX(-50%) ${o.flip ? 'scaleX(-1)' : ''} ${o.rot ? `rotate(${o.rot}deg)` : ''}`,
      zIndex: o.z || 30,
    }));
    if (o.glow) im.style.filter = `drop-shadow(0 0 ${px(h * 0.08)} ${o.glow}) drop-shadow(0 ${px(h * 0.03)} ${px(h * 0.04)} rgba(0,0,0,.35))`;
    im.src = typeof name === 'string' && name.includes('/') ? name : ART(name);
    return im;
  }

  // ---------- düzen yardımcıları ----------
  // Üstte başlık, altta ortalanmış aygıt. Döner: {d, g, copy}
  function topCopyAndDevice(slot, img, o = {}) {
    const s = cap[slot];
    const sideM = W * (TALL ? 0.06 : 0.05);
    const ebPx = TALL ? H * 0.032 : H * 0.042;
    const hPx = TALL ? H * 0.072 : H * 0.104;
    const top = H * (TALL ? 0.045 : 0.045);
    const copy = copyBlock(s, { x: sideM, y: top, w: W - 2 * sideM, size: hPx, eyebrowPx: ebPx, oneLine: !TALL });
    const copyH = ebPx * 1.55 + ebPx * 0.55 + hPx * 1.05 * (TALL ? 2 : 1);
    const devTop = top + copyH + H * (TALL ? 0.045 : 0.035);
    const bottomM = H * (o.bottomM ?? (TALL ? 0.05 : 0.035));
    const kind = deviceKind();
    const probe = deviceGeom(kind, 100);
    let screenH = (H - devTop - bottomM) / (probe.h / 100);
    const maxW = W * (o.maxW ?? (TALL ? 0.80 : 0.72));
    if (screenH * probe.w / 100 > maxW) screenH = maxW / (probe.w / 100);
    screenH *= o.scale ?? 1;
    const g = deviceGeom(kind, screenH);
    const cx = W * (o.cx ?? 0.5);
    const d = device(img, cx - g.w / 2, o.alignBottom ? H - bottomM - g.h : devTop + (H - devTop - bottomM - g.h) / 2, screenH, { rot: o.rot });
    return { d, g, copy, left: cx - g.w / 2, right: cx + g.w / 2, top: parseFloat(d.style.top), bottom: parseFloat(d.style.top) + g.h };
  }

  // ---------- slaytlar ----------
  const SLIDES = {
    hero() {
      background('dusk', { raysY: 64 });
      const r = topCopyAndDevice('hero', CAP('hero'));
      const foot = H - H * 0.008;
      const gh = TALL ? H * 0.27 : DEV === 'aphone' ? H * 0.36 : H * 0.44;
      // iki ordu cihazın iki yanından çatışmaya giriyor
      cutout('golem_melee_t3_blue', r.left - gh * 0.80, foot - H * 0.03, gh * 0.74, { z: 29 });
      cutout('golem_heavy_t4_blue', r.left - gh * 0.30, foot, gh, { z: 31 });
      cutout('golem_melee_t4_red', r.right + gh * 0.80, foot - H * 0.03, gh * 0.74, { z: 29 });
      cutout('golem_heavy_t4_red', r.right + gh * 0.30, foot, gh, { z: 31 });
    },

    army() {
      background('day', { raysX: 30 });
      const r = topCopyAndDevice('army', CAP('army'), { cx: TALL ? 0.5 : 0.6, maxW: TALL ? 0.8 : 0.66 });
      const foot = H - H * 0.012;
      const gh = TALL ? H * 0.27 : DEV === 'aphone' ? H * 0.36 : H * 0.42;
      // üretim hattı: üç golem tipi cihaza doğru yürüyor
      const x0 = TALL ? W * 0.10 : W * 0.06;
      cutout('golem_ranged_t0_blue', x0, foot - H * 0.02, gh * 0.80, { z: 31 });
      cutout('golem_melee_t0_blue', x0 + gh * 0.50, foot - H * 0.005, gh * 0.88, { z: 32 });
      cutout('golem_heavy_t0_blue', r.left - gh * 0.36, foot, gh, { z: 33 });
      if (TALL) cutout('golem_heavy_t0_red', r.right - gh * 0.02, foot, gh * 0.9, { z: 31 });
    },

    eras() {
      background('eras', { raysX: 50, raysY: 95 });
      const s = cap.eras;
      const sideM = W * 0.05;
      const ebPx = TALL ? H * 0.032 : H * 0.042;
      const hPx = TALL ? H * 0.072 : H * 0.104;
      copyBlock(s, { x: sideM, y: H * 0.045, w: W - 2 * sideM, size: hPx, eyebrowPx: ebPx, oneLine: !TALL });
      const ground = H - H * (TALL ? 0.11 : 0.15);
      const n = 5;
      const slotW = (W - 2 * sideM) / n;
      for (let t = 0; t < n; t++) {
        const cx = sideM + slotW * (t + 0.5);
        const ch = (TALL ? H * 0.39 : H * 0.48) * (0.80 + t * 0.07);
        cutout('castle_t' + t + '_blue', cx - slotW * 0.08, ground + H * 0.012, ch, { z: 20 + t });
        const gh = ch * 0.62;
        cutout('golem_heavy_t' + t + '_blue', cx + slotW * 0.22, ground + H * (TALL ? 0.06 : 0.09), gh, { z: 40 + t });
        // çağ etiketi
        const chip = add(el('div', 'chip', { fontSize: px(TALL ? H * 0.03 : H * 0.042), zIndex: 60 }, L.eras[t]));
        chip.style.left = px(cx);
        chip.style.top = px(ground - ch - H * (TALL ? 0.05 : 0.065));
        chip.style.transform = 'translateX(-50%)';
        chip.style.borderColor = ['#c98b4a', '#f2b33d', '#9aa6b8', '#5fd4f4', '#b18cff'][t];
        chip.style.color = ['#ffd9a8', '#ffe08a', '#e3e8ef', '#b8f1ff', '#e2d4ff'][t];
        if (t < n - 1) {
          // iki etiket arasında, merdiven eğiminde ok
          const chipPx = TALL ? H * 0.03 : H * 0.042;
          const ch2 = (TALL ? H * 0.39 : H * 0.48) * (0.80 + (t + 1) * 0.07);
          const y1 = ground - ch - H * (TALL ? 0.05 : 0.065), y2 = ground - ch2 - H * (TALL ? 0.05 : 0.065);
          const ar = add(el('div', 'abs', { zIndex: 61, fontSize: px(chipPx * 1.3), lineHeight: 1, color: 'rgba(255,255,255,.9)', fontWeight: 800, textShadow: '0 3px 0 rgba(16,22,46,.55)' }, '›'));
          ar.style.left = px(cx + slotW / 2 - chipPx * 0.25);
          ar.style.top = px((y1 + y2) / 2 + chipPx * 0.05);
        }
      }
    },

    cards() {
      background('arcane', { raysY: 55 });
      const r = topCopyAndDevice('cards', CAP('cards'), { maxW: TALL ? 0.78 : 0.68 });
      const ih = TALL ? H * 0.16 : H * 0.24;
      const glow = 'rgba(255,214,102,.75)';
      cutout('card_vein', r.left - ih * 0.15, r.top + (r.bottom - r.top) * 0.55, ih, { rot: -12, glow, z: 41 });
      cutout('card_vital', r.left + ih * 0.15, r.bottom + ih * 0.1, ih * 0.82, { rot: 8, glow: 'rgba(120,255,170,.7)', z: 42 });
      cutout('card_rampart', r.right + ih * 0.1, r.top + (r.bottom - r.top) * 0.62, ih * 1.05, { rot: 10, glow: 'rgba(140,200,255,.75)', z: 41 });
    },

    defense() {
      background('siege', { raysX: 30, raysY: 70 });
      const r = topCopyAndDevice('defense', CAP('defense'), { cx: TALL ? 0.5 : 0.57, maxW: TALL ? 0.8 : 0.70 });
      const foot = H - H * 0.008;
      const ch = TALL ? H * 0.42 : H * 0.70;
      cutout('castle_t4_blue_armed', r.left + ch * 0.02, foot, ch, { z: 31, glow: 'rgba(160,140,255,.45)' });
      const gh = TALL ? H * 0.26 : H * 0.42;
      cutout('golem_heavy_t4_red', r.right + gh * 0.05, foot, gh, { z: 32 });
      if (!TALL) cutout('golem_ranged_t4_red', r.right + gh * 0.55, foot - H * 0.03, gh * 0.75, { z: 31 });
    },

    powers() {
      background('day', { raysX: 70, raysY: 30 });
      const r = topCopyAndDevice('powers', CAP('powers'));
      // gökten düşen kozalaklar (oyundaki kozalak çizimi)
      const ph = TALL ? H * 0.085 : H * 0.12;
      const drops = TALL
        ? [[0.07, 0.36, 1.1, -20], [0.13, 0.62, 0.8, -15], [0.91, 0.40, 1.2, -25], [0.86, 0.66, 0.9, -18], [0.95, 0.80, 0.7, -12]]
        : [[0.045, 0.28, 1.1, -20], [0.11, 0.52, 0.85, -15], [0.06, 0.76, 0.7, -10], [0.93, 0.30, 1.25, -25], [0.88, 0.58, 0.9, -18], [0.965, 0.72, 0.75, -12]];
      drops.forEach(([x, y, s, rot], i) => {
        const h = ph * s;
        const cx = W * x, top = H * y;
        // hız çizgileri
        add(el('div', 'abs', { left: px(cx - h * 0.12), top: px(top - h * 1.6), width: px(h * 0.24), height: px(h * 1.7), zIndex: 29, borderRadius: px(h), background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,.55))', transform: `rotate(${rot * 0.6}deg)` }));
        cutout('spec_t0', cx, top + h, h, { rot, z: 30 });
      });
    },

    online() {
      background('versus', { raysX: 50, raysY: 62 });
      const r = topCopyAndDevice('online', CAP('online'), { maxW: TALL ? 0.76 : 0.66 });
      const foot = H - H * 0.008;
      const gh = TALL ? H * 0.32 : H * 0.54;
      cutout('golem_commander_t4_blue', r.left - gh * 0.08, foot, gh, { z: 31, glow: 'rgba(90,150,255,.55)' });
      cutout('golem_commander_t4_red', r.right + gh * 0.08, foot, gh, { z: 31, glow: 'rgba(255,90,100,.55)' });
    },

    closer() {
      background('gold', { raysX: 28, raysY: 35, mountains: true });
      const s = cap.closer;
      const m = W * 0.05;
      // sol kolon: ikon + başlık + özellik hapları
      const colW = TALL ? W - 2 * m : W * 0.46;
      const icon = add(el('img', 'abs', {
        left: px(m), top: px(H * (TALL ? 0.05 : 0.07)), height: px(TALL ? H * 0.12 : H * 0.20),
        borderRadius: '22%', boxShadow: '0 18px 40px rgba(80,30,0,.45)', zIndex: 40,
      }));
      icon.src = ART('icon_1024');
      const iconH = TALL ? H * 0.12 : H * 0.20;
      const hPx = TALL ? H * 0.068 : H * 0.098;
      const copy = copyBlock(s, {
        x: m + iconH + W * 0.02, y: H * (TALL ? 0.05 : 0.07) + iconH * 0.02, w: colW - iconH - W * 0.02,
        size: hPx, eyebrowPx: TALL ? H * 0.026 : H * 0.036, oneLine: false, align: 'left',
      });
      const pills = add(el('div', 'abs', {
        left: px(m), top: px(H * (TALL ? 0.285 : 0.40)), width: px(colW), zIndex: 45,
        display: 'flex', flexWrap: 'wrap', gap: px(H * (TALL ? 0.014 : 0.02)),
      }));
      s.pills.forEach((p) => add(el('span', 'pill', { fontSize: px(TALL ? H * 0.03 : H * 0.045) }, p), pills));
      // sağ: üç ekranlık mozaik
      const kind = deviceKind();
      if (TALL) {
        const sh = H * 0.265;
        device(CAP('hero'), W * 0.04, H * 0.43, sh, { rot: -4, z: 21 });
        device(CAP('cards'), W * 0.53, H * 0.45, sh, { rot: 3, z: 22 });
        device(CAP('victory'), W * 0.27, H * 0.655, sh, { rot: -1, z: 23 });
      } else {
        const sh = H * 0.30;
        device(CAP('hero'), W * 0.50, H * 0.06, sh, { rot: -5, z: 21 });
        device(CAP('cards'), W * 0.56, H * 0.38, sh, { rot: 4, z: 22 });
        device(CAP('victory'), W * 0.47, H * 0.66, sh, { rot: -2, z: 23 });
      }
      cutout('hero_golem', TALL ? W * 0.9 : W * 0.93, H - H * 0.005, TALL ? H * 0.30 : H * 0.62, { z: 35 });
    },

    // Google Play öne çıkan görsel (1024x500)
    fg() {
      background('dusk', { raysX: 62, raysY: 70, groundH: H * 0.16 });
      const wm = add(el('div', 'abs', { left: px(W * 0.06), top: px(H * 0.17), zIndex: 50, lineHeight: 0.92 }));
      const word = (t, size, color) => add(el('div', 'headline', { fontSize: px(size), color, letterSpacing: '.01em' }, t), wm);
      word('GOLEM', H * 0.25, '#ffd23f');
      word('FORGE', H * 0.19, '#ffe9a8');
      const tag = add(el('div', 'sub', { fontSize: px(H * 0.06), marginTop: px(H * 0.035), maxWidth: px(W * 0.44), textWrap: 'balance' }, L.fgTag), wm);
      void tag;
      const foot = H - H * 0.02;
      cutout('golem_heavy_t4_red', W * 0.88, foot - H * 0.03, H * 0.58, { z: 30 });
      cutout('hero_golem', W * 0.70, foot + H * 0.02, H * 0.86, { z: 31 });
    },
  };

  (SLIDES[SLIDE] || SLIDES.hero)();

  // yazı tipi yüklenince başlıkları sığdır, sonra hazır işareti koy
  document.fonts.ready.then(() => {
    document.querySelectorAll('.copy').forEach((c) => c._fit && c._fit());
    const imgs = [...document.images];
    return Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  }).then(() => { document.body.dataset.ready = '1'; });
})();
