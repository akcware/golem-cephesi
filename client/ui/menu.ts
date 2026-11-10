// Ana menü (HTML). Oyun alanı arka planda yavaşça kayar.
import type { BotLevel } from '../../shared/protocol';
import { getLang, isLang, LANG_NAMES, LANGS, t, type MsgKey } from '../../shared/i18n';
import { switchLang } from '../lang';
import { musicButton } from '../music';
import { TRACKS } from '../tracks';
import { h } from './dom';
import { tutorialDone } from './onboarding';

/** "Nasıl oynanır?" maddeleri (sırayla). */
const HOWTO: MsgKey[] = Array.from({ length: 13 }, (_, i) => `menu.howto.${i + 1}` as MsgKey);

/** Dil seçimi (menünün sol üstü). Diller kendi adlarıyla listelenir. */
function langSelect(): HTMLElement {
  const sel = h(
    'select',
    { 'aria-label': t('menu.language') },
    ...LANGS.map((l) => h('option', { value: l, lang: l, text: LANG_NAMES[l] })),
  );
  sel.value = getLang();
  sel.addEventListener('change', () => {
    if (isLang(sel.value) && sel.value !== getLang()) switchLang(sel.value);
  });
  return h('label', { class: 'menu-lang', title: t('menu.language') }, h('span', { class: 'globe', text: '🌐', 'aria-hidden': 'true' }), sel);
}

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
      value: load('gf_name', `${t('player.default')}${Math.floor(100 + Math.random() * 900)}`),
      autocomplete: 'off',
    });
    this.nameInput.addEventListener('change', () => save('gf_name', this.name));

    this.levelSelect = h(
      'select',
      { 'aria-label': t('menu.botLevel') },
      h('option', { value: 'easy', text: t('menu.level.easy') }),
      h('option', { value: 'normal', text: t('menu.level.normal') }),
      h('option', { value: 'hard', text: t('menu.level.hard') }),
    );
    // ilk maçlar için kolay bot önerilir
    this.levelSelect.value = load('gf_level', tutorialDone() ? 'normal' : 'easy');
    this.levelSelect.addEventListener('change', () => save('gf_level', this.levelSelect.value));

    this.codeInput = h('input', { class: 'code', maxlength: 4, placeholder: t('menu.code'), autocomplete: 'off', spellcheck: 'false' });
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
        h('div', { class: 'logo' }, h('span', { class: 'logo-top', text: 'GOLEM' }), h('span', { class: 'logo-bottom', text: 'FORGE' })),
        h('p', { class: 'tag', text: t('menu.tagline') }),
        h('label', { class: 'field' }, h('span', { text: t('menu.name') }), this.nameInput),
        (this.tutBtn = btn(t('menu.tutorial'), 'btn tutorial', () => handlers.tutorial())),
        (this.tutHint = h('p', { class: 'tuthint', text: t('menu.tutorialHint') })),
        h(
          'div',
          { class: 'row' },
          (this.botBtn = btn(t('menu.bot'), 'btn primary grow', () => handlers.bot(this.levelSelect.value as BotLevel))),
          this.levelSelect,
        ),
        btn(t('menu.quick'), 'btn', () => handlers.quick()),
        h('div', { class: 'divider', text: t('menu.withFriend') }),
        h(
          'div',
          { class: 'row' },
          btn(t('menu.create'), 'btn grow', () => handlers.create()),
          this.codeInput,
          btn(t('menu.join'), 'btn', doJoin),
        ),
        h(
          'details',
          { class: 'howto' },
          h('summary', { text: t('menu.howto') }),
          h('ul', {}, ...HOWTO.map((k) => h('li', { html: t(k) }))),
        ),
      ),
      h(
        'details',
        { class: 'menu-foot' },
        h('summary', { text: t('menu.footer') }),
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
          h('li', { class: 'note', text: t('menu.creditsNote') }),
        ),
      ),
      musicButton('menu-music'),
      langSelect(),
    );
    root.append(this.el);
    this.refresh();
  }

  /** Eğitim bitmediyse "Eğitimle Başla" öne çıkar; bittiyse küçük bir bağlantıya döner. */
  refresh() {
    const done = tutorialDone();
    this.tutBtn.className = done ? 'btn tutorial small' : 'btn tutorial primary';
    this.tutBtn.textContent = done ? t('menu.tutorialAgain') : t('menu.tutorial');
    this.tutHint.classList.toggle('hidden', done);
    this.botBtn.classList.toggle('primary', done);
  }

  get name(): string {
    const n = this.nameInput.value.trim().slice(0, 16) || t('player.default');
    save('gf_name', n);
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
