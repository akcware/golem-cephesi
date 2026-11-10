// Küçük DOM yardımcıları.
import { t } from '../../shared/i18n';
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c != null) el.append(c);
  return el;
}

/** Değer değişmediyse DOM'a dokunmaz (gereksiz yeniden çizimi önler). */
export function setText(el: HTMLElement, text: string) {
  if (el.textContent !== text) el.textContent = text;
}

/**
 * Tek satırlık metin maxWidth'e sığmazsa yazı boyutunu küçültür (minPx'e kadar).
 * Uzun dillerde birim/kule adları düğmeden taşmasın diye. Görünmeyen öğeye dokunmaz.
 */
export function fitText(el: HTMLElement, maxWidth: number, minPx = 9) {
  el.style.fontSize = '';
  if (!el.offsetParent || maxWidth <= 0) return;
  const w = Math.max(el.scrollWidth, el.getBoundingClientRect().width);
  if (w <= maxWidth) return;
  const size = parseFloat(getComputedStyle(el).fontSize);
  el.style.fontSize = `${Math.max(minPx, Math.floor(((size * maxWidth) / w) * 2) / 2)}px`;
}

export function setClass(el: HTMLElement, cls: string, on: boolean) {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

let toastBox: HTMLElement | null = null;
export function toast(msg: string, kind: 'info' | 'error' | 'good' = 'info', ms = 3200) {
  if (!toastBox) {
    toastBox = h('div', { class: 'toasts' });
    document.body.append(toastBox);
  }
  const t = h('div', { class: `toast ${kind}`, text: msg });
  toastBox.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function fmtNum(n: number): string {
  return n >= 10000 ? t('num.thousand', { n: Math.floor(n / 100) / 10 }) : String(Math.floor(n));
}
