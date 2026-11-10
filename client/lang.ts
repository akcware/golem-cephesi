// Web istemcisinin dili: kayıtlı seçim, yoksa tarayıcı dili (Türkçe değilse İngilizce).
// main.ts bu modülü ilk sırada içe aktarır; arayüz kurulmadan dil belli olur.
import { isLang, setLang, type Lang } from '../shared/i18n';

const KEY = 'gf_lang';

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

function detect(): Lang {
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const p of prefs) {
    const base = p?.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

/** Dili değiştirir. Arayüz metinleri kurulurken yazıldığı için sayfa yeniden yüklenir. */
export function switchLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* yoksay */
  }
  location.reload();
}

const lang = stored() ?? detect();
setLang(lang);
document.documentElement.lang = lang;
