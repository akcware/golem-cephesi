import './lang'; // önce: arayüz kurulmadan dil seçilsin
import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { App } from './app';
import type { IconSet } from './textures';

function start(parent: HTMLElement) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#4f93dd',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth,
      height: parent.clientHeight,
      min: { width: 320, height: 240 },
    },
    render: { antialias: true },
    scene: [BootScene, GameScene],
  });

  game.events.once('scene-ready', (scene: GameScene) => {
    new App(scene, game.registry.get('icons') as IconSet);
  });

  // Phaser 3.90'da ekran yönü değişince (telefonu çevirmek) oyun alanı eski boyutta takılı kalabiliyor:
  // yön olayı eski kap boyutuyla yeniler, sonraki kontrol de "değişiklik yok" sanır. Kabı kendimiz izleyip
  // her boyut değişiminde doğru boyutla yeniliyoruz.
  new ResizeObserver(() => {
    if (!game.isBooted) return;
    game.scale.getParentBounds();
    if (game.scale.width !== Math.floor(game.scale.parentSize.width) || game.scale.height !== Math.floor(game.scale.parentSize.height)) {
      game.scale.refresh();
    }
  }).observe(parent);

  // Geliştirme sırasında konsoldan inceleme kolaylığı
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

// WebGL sıfır boyutlu bir tuvalle başlatılamaz (gizli sekme / panel). Kap gerçek bir boyut alana kadar bekle.
const parent = document.getElementById('game')!;
const hasSize = () => parent.clientWidth > 0 && parent.clientHeight > 0;
if (hasSize()) {
  start(parent);
} else {
  const ro = new ResizeObserver(() => {
    if (!hasSize()) return;
    ro.disconnect();
    start(parent);
  });
  ro.observe(parent);
}
