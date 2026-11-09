// Ekranlar arası akış: menü → oda → oyun → menü.
import type { Room } from '@colyseus/sdk';
import type { FxEvent } from '../shared/protocol';
import type { GameScene } from './scenes/GameScene';
import type { IconSet } from './textures';
import { net } from './net';
import { sfx } from './sfx';
import { Menu } from './ui/menu';
import { Hud } from './ui/hud';
import { toast } from './ui/dom';

const CONSENTED = 4000;

function errorText(e: unknown): string {
  const msg = String((e as { message?: string })?.message ?? e ?? '');
  const code = (e as { code?: number })?.code;
  if (/not found|locked|full|invalid/i.test(msg) || code === 4212 || code === 520 || code === 4211) {
    return 'Oda bulunamadı ya da dolu. Kodu kontrol et.';
  }
  if (/fetch|network|ECONNREFUSED|Failed/i.test(msg)) return 'Sunucuya bağlanılamadı. Sunucu çalışıyor mu?';
  return msg ? `Bağlanılamadı: ${msg}` : 'Bağlanılamadı.';
}

export class App {
  private room?: Room;
  private menu: Menu;
  private hud: Hud;

  constructor(
    private scene: GameScene,
    icons: IconSet,
  ) {
    const ui = document.getElementById('ui')!;
    this.menu = new Menu(ui, {
      bot: (level) => this.join(() => net.bot(this.menu.name, level)),
      quick: () => this.join(() => net.quick(this.menu.name)),
      create: () => this.join(() => net.create(this.menu.name)),
      join: (code) => this.join(() => net.joinCode(code, this.menu.name)),
    });
    this.hud = new Hud(ui, scene, icons, () => this.leave());

    // Davet linki: ?oda=ABCD
    const params = new URLSearchParams(location.search);
    const code = params.get('oda');
    if (code) {
      history.replaceState(null, '', location.pathname);
      this.menu.setCode(code);
      void this.join(() => net.joinCode(code, this.menu.name));
    }
  }

  private async join(fn: () => Promise<Room>) {
    if (this.room) return;
    sfx.unlock();
    this.menu.setBusy(true);
    try {
      this.enter(await fn());
    } catch (e) {
      console.warn(e);
      toast(errorText(e), 'error');
    } finally {
      this.menu.setBusy(false);
    }
  }

  private enter(room: Room) {
    this.room = room;
    this.menu.hide();
    room.onMessage('fx', (fx: FxEvent) => {
      this.scene.onFx(fx);
      this.hud.onFx(fx);
    });
    room.onLeave((code: number) => {
      if (this.room === room) this.exit(code);
    });
    room.onError((code: number, message?: string) => console.warn('oda hatası', code, message));

    const waitForSide = () => {
      if (this.room !== room) return;
      const me = (room.state as any)?.players?.get?.(room.sessionId);
      if (me) {
        this.scene.bindRoom(room, me.side);
        this.hud.bind(room, me.side);
      } else {
        setTimeout(waitForSide, 30);
      }
    };
    waitForSide();
  }

  private leave() {
    const room = this.room;
    if (!room) return;
    this.exit(CONSENTED);
    void room.leave();
  }

  private exit(code?: number) {
    this.room = undefined;
    this.scene.unbind();
    this.hud.unbind();
    this.menu.show();
    if (code !== undefined && code !== CONSENTED && code !== 1000) toast('Sunucu bağlantısı koptu.', 'error');
  }
}
