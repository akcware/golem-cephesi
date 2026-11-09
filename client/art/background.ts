// Arka plan: gökyüzü, güneş, bulutlar, iki sıra uzak dağ, ağaçlı tepeler, çimenli kenar + toprak yol.
// Ağır katmanlar açılışta bir kez Canvas'a çizilip doku parçalarına "pişirilir" (canlı Graphics yok).
// Çizim kodu scenery.ts'te; mobil sürüm aynı katmanları PNG'ye döker (tools/bake-mobile.ts).
import Phaser from 'phaser';
import { makeCanvas } from './canvas';
import { put } from './index';
import { GROUND_X0, GROUND_X1, SKY_X0, SKY_X1, SOIL, SUN, type SceneryLayer, cloudPlaces, drawClouds, drawSky, drawSun, sceneryLayers } from './scenery';

export interface Cloud {
  img: Phaser.GameObjects.Image;
  speed: number;
}

const CHUNK = 2048;
/** Bir katmanı dünya koordinatında parçalar halinde dokuya pişirip sahneye koyar. */
function bake(scene: Phaser.Scene, L: SceneryLayer) {
  const h = Math.ceil(L.y1 - L.y0);
  for (let cx = L.x0, i = 0; cx < L.x1; cx += CHUNK, i++) {
    const w = Math.min(CHUNK, Math.ceil(L.x1 - cx));
    // büyük katman: GPU hızlandırmalı tuval (ölçüldü: CPU tuvaline göre ~4-8x hızlı, yükleme GPU içinde kalıyor)
    const { c, ctx } = makeCanvas(w, h, 1, false);
    ctx.translate(-cx, -L.y0);
    L.draw(ctx, cx - 60, cx + w + 60);
    const k = `${L.key}_${i}`;
    put(scene, k, c);
    scene.add.image(cx, L.y0, k).setOrigin(0, 0).setDepth(L.depth).setScrollFactor(L.scroll, 1);
  }
}

export function buildBackground(scene: Phaser.Scene): Cloud[] {
  // gökyüzü: dikey degrade, tek dörtgen
  if (!scene.textures.exists('bg_sky')) put(scene, 'bg_sky', drawSky());
  scene.add.image(SKY_X0, 0, 'bg_sky').setOrigin(0, 0).setDisplaySize(SKY_X1 - SKY_X0, 720).setDepth(-100);

  // güneş
  if (!scene.textures.exists('bg_sun')) put(scene, 'bg_sun', drawSun());
  scene.add.image(SUN.x, SUN.y, 'bg_sun').setDepth(-96).setScrollFactor(SUN.scroll, 1);

  // bulutlar
  if (!scene.textures.exists('bg_cloud_0')) drawClouds().forEach((c, i) => put(scene, `bg_cloud_${i}`, c));
  const clouds: Cloud[] = cloudPlaces().map((p) => ({
    img: scene.add
      .image(p.x, p.y, `bg_cloud_${p.kind}`)
      .setScale(p.scale * (p.flip ? -1 : 1), p.scale)
      .setAlpha(p.alpha)
      .setScrollFactor(p.scroll, 1)
      .setDepth(-94),
    speed: p.speed,
  }));

  // uzak dağlar, tepeler, zemin
  for (const L of sceneryLayers()) bake(scene, L);
  // pişmiş zeminin altı ve iki yanı için düz toprak (çok geniş ekranlarda boşluk kalmasın)
  scene.add.rectangle(SKY_X0, 780, SKY_X1 - SKY_X0, 400, SOIL).setOrigin(0, 0).setDepth(-81);
  scene.add.rectangle(SKY_X0, 532, GROUND_X0 - SKY_X0, 260, SOIL).setOrigin(0, 0).setDepth(-81);
  scene.add.rectangle(GROUND_X1, 532, SKY_X1 - GROUND_X1, 260, SOIL).setOrigin(0, 0).setDepth(-81);
  return clouds;
}
