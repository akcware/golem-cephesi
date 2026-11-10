// Boyut / yerleşim sabitleri (EKRAN birimi). textures.ts bunları dışa aktarır; GameScene okur.
import type { Arch } from '../../shared/balance';

export const TEAM = { a: 0x3d8bff, e: 0xff4d4d } as const;
export type Team = keyof typeof TEAM;

export const VIEW_H = 720;
export const GROUND_Y = 570;

/**
 * Doku çözünürlük çarpanı. Dokular bu kat büyük çizilir, sahnede 1/ART_SCALE ölçekle gösterilir
 * (büyük ekranlarda kamera yakınlaştığında bulanıklaşmasın diye). Aşağıdaki tüm boyut / konum
 * sabitleri (LAYOUT, CASTLE_W/H, MOUNTS, TURRET_*) EKRAN birimindedir, çarpandan bağımsızdır.
 */
export const ART_SCALE: number = (globalThis as { GOLEM_ART_SCALE?: number }).GOLEM_ART_SCALE ?? 2;
// GOLEM_ART_SCALE: yalnızca tools/bake-icon.ts kullanır (uygulama ikonu için golemi çok büyük çizer).

/** Kule dokusunun ekran boyutu ve dönme/oturma noktası (0..1, dokuya göre). Dönme noktası kulenin döner tablasının merkezidir. */
export const TURRET_W = 68;
export const TURRET_H = 50;
export const TURRET_PIVOT = { x: 0.3, y: 0.8 };
/** Dönme noktasından namlu ucuna mesafe (ekran birimi), dereceye göre: [Hafif, Orta, Ağır]. Mermiler buradan çıkar. */
export const TURRET_MUZZLE = [28, 38, 47];

export interface WeaponLayout {
  w: number;
  h: number;
  ox: number;
  oy: number;
  x: number;
  y: number;
  rot: number;
}
export interface PartLayout {
  bodyW: number;
  bodyH: number;
  legW: number;
  legH: number;
  legGap: number;
  hipY: number;
  weapon: WeaponLayout;
}

/*
 * Birim parçaları (kap koordinatı: x ileri/sağ, y yukarı negatif, zemin y=0):
 *  - bacak: üst-orta noktası (±legGap/2, hipY) etrafında döner
 *  - gövde: alt-orta noktası (0, hipY+3)
 *  - silah: (ox,oy) dönme noktası (x,y)'de. Yakın dövüş ve menzillide dönme noktası yumruktur
 *    (kol gövdeye çizilir), ağırda omuzdur (kolun tamamı silah dokusundadır).
 */
export const LAYOUT: Record<Arch, PartLayout> = {
  melee: { bodyW: 42, bodyH: 51, legW: 14, legH: 17, legGap: 8, hipY: -15, weapon: { w: 20, h: 48, ox: 0.5, oy: 40 / 48, x: 15, y: -25, rot: 0.3 } },
  ranged: { bodyW: 42, bodyH: 51, legW: 14, legH: 17, legGap: 8, hipY: -15, weapon: { w: 42, h: 36, ox: 10 / 42, oy: 0.5, x: 14, y: -28, rot: -0.05 } },
  heavy: { bodyW: 72, bodyH: 70, legW: 22, legH: 23, legGap: 18, hipY: -20, weapon: { w: 30, h: 62, ox: 0.5, oy: 12 / 62, x: 6, y: -57, rot: 0.15 } },
};

export const CASTLE_W = 240;
export const CASTLE_H = 300;
/** Kule yuvalarının kale dokusu içindeki konumları (kulenin oturduğu nokta). 0: kapı kulesi, 1: orta kule, 2: ana burç. */
export const MOUNTS = [
  { x: 198, y: 152 },
  { x: 128, y: 106 },
  { x: 60, y: 54 },
];
