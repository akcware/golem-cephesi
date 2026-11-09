// Arka plan müziği: menü, savaş ve gerilim parçaları arasında yumuşak geçiş, maç sonu motifi,
// büyük patlamalarda kısa kısılma. Parçalar public/music/ altında, liste tracks.ts'te.
// Uzun parçalar <audio> ile akarak çalar (tamamı belleğe açılmaz), ses seviyesi WebAudio'dan
// yönetilir (iOS'ta <audio>.volume değiştirilemiyor).
import { audioContext } from './sfx';
import { DUCK, FADE_S, MUSIC_GAIN, TRACKS, type Track, type TrackId } from './tracks';

type Mode = 'menu' | 'battle' | 'ended';

interface Voice {
  el: HTMLAudioElement;
  gain: GainNode;
  /** hedef seviyesi sıfırdan büyük mü */
  on: boolean;
  timer: number;
}

const KEY = 'gc_music_off';
let off = false;
try {
  off = localStorage.getItem(KEY) === '1';
} catch {
  /* depolama yoksa sorun değil */
}

let out: GainNode | null = null; // genel müzik seviyesi (kapalıyken 0)
let duckG: GainNode | null = null; // patlamalarda kısılma
const voices: Partial<Record<TrackId, Voice>> = {};
let mode: Mode = 'menu';
let tense = false;
let stinger: TrackId | null = null;
/** Tarayıcılar ilk dokunuştan önce ses çalmaya izin vermez; o ana kadar hiçbir şey kurulmaz. */
let started = false;

function urlOf(t: Track): string | null {
  const probe = document.createElement('audio');
  for (const f of t.formats) {
    if (probe.canPlayType(f === 'ogg' ? 'audio/ogg; codecs="vorbis"' : 'audio/mpeg')) return `music/${t.file}.${f}`;
  }
  return null;
}

function graph() {
  const a = audioContext();
  if (!a) return null;
  if (!out || !duckG) {
    out = a.createGain();
    out.gain.value = off ? 0 : MUSIC_GAIN;
    duckG = a.createGain();
    out.connect(duckG).connect(a.destination);
  }
  return { a, out };
}

function voice(id: TrackId): Voice | null {
  const have = voices[id];
  if (have) return have;
  const t = TRACKS[id];
  const g = t && graph();
  const src = t && urlOf(t);
  if (!t || !g || !src) return null;
  const el = new Audio();
  el.src = src;
  el.loop = t.loop;
  el.preload = 'auto';
  const gain = g.a.createGain();
  gain.gain.value = 0;
  g.a.createMediaElementSource(el).connect(gain).connect(g.out);
  const v: Voice = { el, gain, on: false, timer: 0 };
  voices[id] = v;
  return v;
}

function ramp(p: AudioParam, to: number, sec: number) {
  const a = audioContext();
  if (!a) return;
  const t = a.currentTime;
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
  p.linearRampToValueAtTime(to, t + Math.max(0.01, sec));
}

function play(v: Voice) {
  // izin yoksa (dokunuş öncesi) sessizce bekler; sonraki dokunuşta apply() tekrar dener
  v.el.play().catch(() => undefined);
}

/** Şu an duyulması gereken döngü parçası. */
function wanted(): TrackId | null {
  if (off || !started || stinger) return null;
  if (mode === 'battle') return tense && TRACKS.tension ? 'tension' : 'battle';
  return 'menu';
}

/** Döngü parçalarını isteğe göre açar/söndürür; sönen parça sessizleşince durdurulur (yeri korunur). */
function apply(sec = FADE_S) {
  const want = wanted();
  for (const id of Object.keys(TRACKS) as TrackId[]) {
    if (!TRACKS[id]?.loop) continue;
    const on = id === want;
    const v = on ? voice(id) : voices[id];
    if (!v) continue;
    if (on === v.on && (!on || !v.el.paused)) continue;
    v.on = on;
    clearTimeout(v.timer);
    if (on) {
      if (v.el.paused) play(v);
      ramp(v.gain.gain, TRACKS[id]!.vol, sec);
    } else {
      ramp(v.gain.gain, 0, sec);
      v.timer = window.setTimeout(() => {
        if (!v.on) v.el.pause();
      }, sec * 1000 + 60);
    }
  }
}

function endStinger() {
  const id = stinger;
  if (!id) return;
  stinger = null;
  const v = voices[id];
  if (v) {
    v.on = false;
    clearTimeout(v.timer);
    v.el.pause();
  }
}

function playStinger(win: boolean): boolean {
  const id: TrackId = win ? 'victory' : 'defeat';
  if (off || !started || !TRACKS[id]) return false;
  const v = voice(id);
  if (!v) return false;
  endStinger();
  stinger = id;
  apply(0.5); // döngüler hızla söner
  v.on = true;
  v.el.currentTime = 0;
  ramp(v.gain.gain, TRACKS[id]!.vol, 0.02);
  const done = () => {
    if (stinger !== id) return;
    endStinger();
    apply(3); // motiften sonra menü müziği yavaşça geri gelir
  };
  v.el.onended = done;
  v.el.onerror = done;
  // dosya bozuksa ya da çalmazsa takılı kalmasın
  clearTimeout(v.timer);
  v.timer = window.setTimeout(done, 20000);
  play(v);
  return true;
}

function unlock() {
  if (!started) {
    started = true;
    apply(2.5);
    return;
  }
  // dokunuş öncesi reddedilen bir çalma varsa (ya da ses bağlamı askıya alındıysa) yeniden dene
  if (out) audioContext();
  for (const v of Object.values(voices)) if (v?.on && v.el.paused && !document.hidden) play(v);
}
window.addEventListener('pointerdown', unlock, true);
window.addEventListener('keydown', unlock, true);

// sekme arka plandayken müzik durur, dönünce kaldığı yerden sürer
document.addEventListener('visibilitychange', () => {
  for (const v of Object.values(voices)) {
    if (!v) continue;
    if (document.hidden) v.el.pause();
    else if (v.on) play(v);
  }
});

/** Menüdeki ve oyun içindeki müzik düğmeleri (hepsi birlikte güncellenir). */
const buttons = new Set<HTMLButtonElement>();
function renderButtons() {
  for (const b of buttons) {
    b.classList.toggle('off', off);
    b.title = off ? 'Müzik kapalı (açmak için tıkla)' : 'Müzik açık (kapatmak için tıkla)';
  }
}

export function musicButton(extraClass = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = `icon-btn music-btn ${extraClass}`.trim();
  b.textContent = '🎵';
  b.setAttribute('aria-label', 'Müzik');
  b.addEventListener('click', () => music.toggle());
  buttons.add(b);
  renderButtons();
  return b;
}

export const music = {
  isOff: () => off,
  toggle(): boolean {
    off = !off;
    try {
      localStorage.setItem(KEY, off ? '1' : '0');
    } catch {
      /* yoksay */
    }
    renderButtons();
    if (off) endStinger();
    if (out) ramp(out.gain, off ? 0 : MUSIC_GAIN, 0.3);
    apply(off ? 0.3 : 1.2);
    return off;
  },
  /** Ana menü, bekleme odası. */
  menu() {
    mode = 'menu';
    tense = false;
    apply();
  },
  /** Maç başlıyor (fresh: savaş müziği baştan). */
  battle(fresh: boolean) {
    if (fresh) {
      endStinger();
      for (const id of ['battle', 'tension'] as const) {
        const v = voices[id];
        if (v && !v.on) v.el.currentTime = 0;
      }
      tense = false;
    }
    mode = 'battle';
    apply();
    // gerilim parçası ve motifler önceden yüklensin (geçiş anında beklemesin)
    if (started && !off) for (const id of ['tension', 'victory', 'defeat'] as const) voice(id);
  },
  /** Maç bitti: zafer/yenilgi motifi çalar. Motif yoksa ya da müzik kapalıysa false döner (efekt sesi çalınsın). */
  ended(win: boolean): boolean {
    mode = 'ended';
    tense = false;
    const ok = playStinger(win);
    if (!ok) apply();
    return ok;
  },
  /** Kale düşerken ya da Yıkım Saati'nde gerilim parçasına geçer. */
  tension(on: boolean) {
    if (on === tense) return;
    tense = on;
    if (mode === 'battle') apply(on ? 1.2 : 2.5);
  },
  /** Büyük patlama: müzik bir an kısılıp geri gelir. */
  duck() {
    if (!duckG || off) return;
    const a = audioContext();
    if (!a) return;
    const p = duckG.gain;
    const t = a.currentTime;
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(DUCK.gain, t + 0.04);
    p.setValueAtTime(DUCK.gain, t + 0.04 + DUCK.hold);
    p.linearRampToValueAtTime(1, t + 0.04 + DUCK.hold + DUCK.release);
  },
};
