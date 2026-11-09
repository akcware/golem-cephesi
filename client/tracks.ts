// Müzik parçaları ve künyeleri. Web public/music/ altından çalar; mobil sürüm için
// tools/bake-music.ts aynı listeden mobile/assets/music/ ve ses bileşenlerini üretir.

/** menu: ana menü ve bekleme · battle: savaş · tension: kale düşerken ya da Yıkım Saati'nde · victory/defeat: maç sonu motifi */
export type TrackId = 'menu' | 'battle' | 'tension' | 'victory' | 'defeat';

export interface Track {
  /** public/music/ altındaki dosyanın uzantısız adı */
  file: string;
  /** elde olan biçimler; web tarayıcının çalabildiği ilkini seçer, mobil ogg kullanır */
  formats: ('ogg' | 'mp3')[];
  loop: boolean;
  /** parçalar arası denge (0..1); tools/encode-music.ts ölçüp önerir */
  vol: number;
  // künye (lisans gereği oyunda ve README'de gösterilir)
  title: string;
  author: string;
  license: string;
  url: string;
}

export const TRACKS: Partial<Record<TrackId, Track>> = {
  menu: {
    file: 'menu-nox-arcana',
    formats: ['ogg', 'mp3'],
    loop: true,
    vol: 1,
    title: 'Nox Arcana - RPG Title Screen',
    author: 'HitCtrl',
    license: 'CC-BY 3.0',
    url: 'https://opengameart.org/content/nox-arcana-rpg-title-screen',
  },
  battle: {
    file: 'battle-qazijamjam',
    formats: ['ogg', 'mp3'],
    loop: true,
    vol: 0.62,
    title: 'QaziJamJam',
    author: 'Emma_MA',
    license: 'CC0',
    url: 'https://opengameart.org/content/qazijamjam-orchestral-battle-theme',
  },
  tension: {
    file: 'tension-determined-pursuit',
    formats: ['ogg', 'mp3'],
    loop: true,
    vol: 0.57,
    title: 'Determined Pursuit',
    author: 'Emma_MA',
    license: 'CC0',
    url: 'https://opengameart.org/content/determined-pursuit-epic-orchestra-loop',
  },
  victory: {
    file: 'victory-fanfare',
    formats: ['ogg', 'mp3'],
    loop: false,
    vol: 0.61,
    title: 'Victory Fanfare Short',
    author: 'cynicmusic',
    license: 'CC0',
    url: 'https://opengameart.org/content/victory-fanfare-short',
  },
  defeat: {
    file: 'defeat-lose-game',
    formats: ['ogg', 'mp3'],
    loop: false,
    vol: 1,
    title: 'Lose Game Short Music Clip',
    author: 'Robin Lamb',
    license: 'CC0',
    url: 'https://opengameart.org/content/lose-game-short-music-clip',
  },
};

/** Efektlere göre müziğin genel seviyesi. */
export const MUSIC_GAIN = 0.5;
/** Parçalar arası geçiş süresi (sn). */
export const FADE_S = 1.6;
/** Büyük patlamalarda müzik bu orana kısılır, sonra yavaşça geri gelir. */
export const DUCK = { gain: 0.45, hold: 0.12, release: 0.7 };
/** Gerilim müziği: kalelerden biri bu oranın altına inerse ya da Yıkım Saati başlarsa. */
export const TENSION_HP = 0.3;
