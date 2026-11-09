// Ana menü (HTML). Oyun alanı arka planda yavaşça kayar.
import type { BotLevel } from '../../shared/protocol';
import { musicButton } from '../music';
import { TRACKS } from '../tracks';
import { h } from './dom';
import { tutorialDone } from './onboarding';

export interface MenuHandlers {
  bot(level: BotLevel): void;
  tutorial(): void;
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
  private tutBtn!: HTMLButtonElement;
  private botBtn!: HTMLButtonElement;
  private tutHint!: HTMLElement;

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
    // ilk maçlar için kolay bot önerilir
    this.levelSelect.value = load('gc_level', tutorialDone() ? 'normal' : 'easy');
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
        (this.tutBtn = btn('Eğitimle Başla', 'btn tutorial', () => handlers.tutorial())),
        (this.tutHint = h('p', { class: 'tuthint', text: 'İlk kez mi oynuyorsun? 3-4 dakikalık rehberli maç her şeyi gösterir.' })),
        h(
          'div',
          { class: 'row' },
          (this.botBtn = btn('Bota Karşı Oyna', 'btn primary grow', () => handlers.bot(this.levelSelect.value as BotLevel))),
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
            h('li', { html: '<b>Çağ kartları:</b> Her kademe atlayışında 3 karttan birini seç (<kbd>Z</kbd> <kbd>X</kbd> <kbd>C</kbd>): ucuz ağır golemler, seken kule atışları, çifte özel güç… Her maç farklı bir yapıya döner.' }),
            h('li', { html: '<b>Komutan:</b> Maç başında bedava gelir, öldürdükçe seviye atlar, ölürse 30 sn sonra döner. <kbd>R</kbd>: Sarsıcı Darbe, öndeki düşmanların üstüne atılıp onları sersemletir.' }),
            h('li', { html: '<b>Eter Kaynağı:</b> 2. dakikadan itibaren ortanın bir yanında belirir. Alanında 6 sn sadece senin birimlerin durursa ödül (altın, öfke ya da şifa) senin.' }),
            h('li', { html: '<b>Yıkım Saati:</b> 15. dakikadan sonra kaleler ve karakollar yavaşça çöker; maç kilitlenmez.' }),
            h('li', { html: 'Ağır golemler kaleye ekstra hasar verir. Özel güç (<kbd>Q</kbd>) düşmanın ön saflarını vurur.' }),
            h('li', { html: 'Haritayı sürükle, fare tekerleği ya da <kbd>A</kbd>/<kbd>D</kbd> ile kaydır.' }),
          ),
        ),
      ),
      h(
        'details',
        { class: 'menu-foot' },
        h('summary', { text: 'Prototip v0.2 · Müzik künyesi' }),
        h(
          'ul',
          { class: 'credits' },
          ...Object.values(TRACKS).map((t) =>
            h(
              'li',
              {},
              h('a', { href: t.url, target: '_blank', rel: 'noopener', text: t.title }),
              ` · ${t.author} · ${t.license}`,
            ),
          ),
          h('li', { class: 'note', text: 'Parçaların baş/son sessizlikleri kırpıldı ve sıkıştırıldı.' }),
        ),
      ),
      musicButton('menu-music'),
    );
    root.append(this.el);
    this.refresh();
  }

  /** Eğitim bitmediyse "Eğitimle Başla" öne çıkar; bittiyse küçük bir bağlantıya döner. */
  refresh() {
    const done = tutorialDone();
    this.tutBtn.className = done ? 'btn tutorial small' : 'btn tutorial primary';
    this.tutBtn.textContent = done ? 'Eğitimi tekrar oyna' : 'Eğitimle Başla';
    this.tutHint.classList.toggle('hidden', done);
    this.botBtn.classList.toggle('primary', done);
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
