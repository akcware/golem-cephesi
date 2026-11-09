// Ana menü (HTML). Oyun alanı arka planda yavaşça kayar.
import type { BotLevel } from '../../shared/protocol';
import { h } from './dom';

export interface MenuHandlers {
  bot(level: BotLevel): void;
  quick(): void;
  create(): void;
  join(code: string): void;
}

function load(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* yoksay */
  }
}

export class Menu {
  readonly el: HTMLElement;
  private nameInput: HTMLInputElement;
  private codeInput: HTMLInputElement;
  private levelSelect: HTMLSelectElement;
  private buttons: HTMLButtonElement[] = [];

  constructor(root: HTMLElement, handlers: MenuHandlers) {
    this.nameInput = h('input', {
      id: 'name',
      maxlength: 16,
      value: load('gc_name', `Simyacı${Math.floor(100 + Math.random() * 900)}`),
      autocomplete: 'off',
    });
    this.nameInput.addEventListener('change', () => save('gc_name', this.name));

    this.levelSelect = h(
      'select',
      { 'aria-label': 'Bot zorluğu' },
      h('option', { value: 'easy', text: 'Kolay' }),
      h('option', { value: 'normal', text: 'Normal' }),
      h('option', { value: 'hard', text: 'Zor' }),
    );
    this.levelSelect.value = load('gc_level', 'normal');
    this.levelSelect.addEventListener('change', () => save('gc_level', this.levelSelect.value));

    this.codeInput = h('input', { class: 'code', maxlength: 4, placeholder: 'KOD', autocomplete: 'off', spellcheck: 'false' });
    this.codeInput.addEventListener('input', () => {
      this.codeInput.value = this.codeInput.value.toUpperCase().replace(/[^A-Z]/g, '');
    });
    const doJoin = () => {
      const code = this.codeInput.value.trim();
      if (code.length === 4) handlers.join(code);
      else this.codeInput.focus();
    };
    this.codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doJoin();
    });

    const btn = (label: string, cls: string, fn: () => void) => {
      const b = h('button', { class: cls, text: label, onclick: () => fn() });
      this.buttons.push(b);
      return b;
    };

    this.el = h(
      'div',
      { class: 'menu' },
      h(
        'div',
        { class: 'menu-card' },
        h('div', { class: 'logo' }, h('span', { class: 'logo-top', text: 'GOLEM' }), h('span', { class: 'logo-bottom', text: 'CEPHESİ' })),
        h('p', { class: 'tag', text: 'Dökümhaneni yükselt, golem ordunu sür, rakip kaleyi yık.' }),
        h('label', { class: 'field' }, h('span', { text: 'Adın' }), this.nameInput),
        h(
          'div',
          { class: 'row' },
          btn('Bota Karşı Oyna', 'btn primary grow', () => handlers.bot(this.levelSelect.value as BotLevel)),
          this.levelSelect,
        ),
        btn('Hızlı Eşleşme', 'btn', () => handlers.quick()),
        h('div', { class: 'divider', text: 'arkadaşınla' }),
        h(
          'div',
          { class: 'row' },
          btn('Oda Kur', 'btn grow', () => handlers.create()),
          this.codeInput,
          btn('Katıl', 'btn', doJoin),
        ),
        h(
          'details',
          { class: 'howto' },
          h('summary', { text: 'Nasıl oynanır?' }),
          h(
            'ul',
            {},
            h('li', { html: 'Altınla golem üret (<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>). Golemler kendiliğinden ilerleyip savaşır.' }),
            h('li', { html: '<b>Güç üçgeni:</b> Yakın dövüş › Menzilli › Ağır › Yakın dövüş. Doğru karşılıkla 1.5× hasar.' }),
            h('li', { html: 'Düşman öldürmek altın ve XP verir. XP dolunca dökümhaneyi yükselt (<kbd>E</kbd>): Ahşap → Bronz → Demir → Kristal → Eter.' }),
            h('li', { html: '<b>Savun / Hücum</b> (<kbd>S</kbd>): Savunda ordu kale önünde toplanır; yeterince büyüyünce hücuma geç. Tek tek giden golemler eriyip gider, toplu dalga kazanır.' }),
            h('li', { html: '<b>Yetenekler:</b> Her çağın birimleri farklıdır: kök salan ahşap muhafız, kalkanlı bronz, zırhlı demir şövalye, hasar yansıtan kristal, dirilen eter bekçisi… (butonların üstüne gel).' }),
            h('li', { html: '<b>Karakollar:</b> Koridordaki 3 noktayı birimlerinle tutarak ele geçir (+%25 gelir). Karakol kurarsan (<kbd>K</kbd>) birimlerin oradan doğar ve düşman yıkmadan geçemez. Karakol silahsız kurulur; üstüne kule ekleyebilirsin.' }),
            h('li', { html: '<b>Kuleler:</b> Her çağda Hafif / Orta / Ağır üç kule var ve her biri farklı saldırır: ok, bomba, delici balista, ateş, buz, lazer, zincir şimşek. Yuvaya tıklayıp seç (<kbd>T</kbd>: parana yeten en iyisini kurar).' }),
            h('li', { html: 'Ağır golemler kaleye ekstra hasar verir. Özel güç (<kbd>Q</kbd>) düşmanın ön saflarını vurur.' }),
            h('li', { html: 'Haritayı sürükle, fare tekerleği ya da <kbd>A</kbd>/<kbd>D</kbd> ile kaydır.' }),
          ),
        ),
      ),
      h('div', { class: 'menu-foot', text: 'Prototip v0.1' }),
    );
    root.append(this.el);
  }

  get name(): string {
    const n = this.nameInput.value.trim().slice(0, 16) || 'Simyacı';
    save('gc_name', n);
    return n;
  }

  setCode(code: string) {
    this.codeInput.value = code.toUpperCase().slice(0, 4);
  }

  setBusy(busy: boolean) {
    for (const b of this.buttons) b.disabled = busy;
    this.el.classList.toggle('busy', busy);
  }

  show() {
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }
}
