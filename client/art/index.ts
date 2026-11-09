// Tüm oyun dokularını Canvas 2D ile üretir ve Phaser doku yöneticisine ekler.
import Phaser from 'phaser';
import * as B from '../../shared/balance';
import { drawCastle } from './castles';
import { drawParticle, drawProj, drawSlot, drawSpecial, drawTurretProj } from './fx';
import { type Team } from './layout';
import { drawTurret } from './turrets';
import { drawBody, drawLeg, drawWeapon } from './units';

export const artKeys = {
  body: (t: number, a: B.Arch, team: Team) => `ub_${t}_${a}_${team}`,
  leg: (t: number, a: B.Arch) => `ul_${t}_${a}`,
  weapon: (t: number, a: B.Arch) => `uw_${t}_${a}`,
  castle: (t: number, team: Team) => `castle_${t}_${team}`,
  turret: (t: number, g: number) => `turret_${t}_${g}`,
  proj: (t: number) => `proj_${t}`,
  tproj: (t: number, g: number) => `tproj_${t}_${g}`,
  spec: (t: number) => `spec_${t}`,
};

/**
 * Tuvali doku olarak ekler. addCanvas yerine addImage: CanvasTexture kurucusu tüm pikselleri
 * getImageData ile geri okur (doku başına onlarca ms). addImage tuvali doğrudan kaynak olarak
 * kullanır (TextureSource tuvali tanır); getSourceImage() yine tuvali döndürür.
 */
export function put(scene: Phaser.Scene, key: string, c: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addImage(key, c as unknown as HTMLImageElement);
}

/** Son üretimin süre dökümü (ms) — galeri sayfası gösterir. */
export const artStats: Record<string, number> = {};

export function generateArt(scene: Phaser.Scene) {
  const K = artKeys;
  let t0 = performance.now();
  const lap = (name: string) => {
    const now = performance.now();
    artStats[name] = (artStats[name] ?? 0) + now - t0;
    t0 = now;
  };
  for (const k in artStats) delete artStats[k];
  for (let t = 0; t <= B.MAX_TIER; t++) {
    for (const arch of B.ARCHES) {
      for (const team of ['a', 'e'] as Team[]) put(scene, K.body(t, arch, team), drawBody(t, arch, team));
      put(scene, K.leg(t, arch), drawLeg(t, arch));
      put(scene, K.weapon(t, arch), drawWeapon(t, arch));
    }
    lap('units');
    const castles = drawCastle(t);
    put(scene, K.castle(t, 'a'), castles.a);
    put(scene, K.castle(t, 'e'), castles.e);
    lap('castles');
    for (let g = 0; g < 3; g++) {
      put(scene, K.turret(t, g), drawTurret(t, g));
      put(scene, K.tproj(t, g), drawTurretProj(t, g));
    }
    lap('turrets');
    put(scene, K.proj(t), drawProj(t));
    put(scene, K.spec(t), drawSpecial(t));
    lap('fx');
  }
  put(scene, 'slot', drawSlot());
  for (const k of ['px', 'dot', 'soft', 'ring'] as const) put(scene, k, drawParticle(k));
  lap('fx');
}
