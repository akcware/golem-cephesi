import Phaser from 'phaser';
import { buildIcons, generateTextures } from '../textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    generateTextures(this);
    this.registry.set('icons', buildIcons(this));
    this.scene.start('game');
  }
}
