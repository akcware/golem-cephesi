// Google Play mağaza girişini ve sürümü Google Play Developer API (androidpublisher v3) ile yükler:
// 6 dilde metinler (aso/metadata-*.md → "Google Play" bölümü), ikon, öne çıkan görsel, telefon ve tablet
// ekran görüntüleri, iletişim bilgisi ve AAB → seçilen kanal (varsayılan: internal, taslak).
// Yayına (incelemeye) GÖNDERMEZ; taslak sürüm Play Console'dan yayınlanır.
//
//   PLAY_SA_JSON=~/.golemforge/play-service-account.json node store-assets/play/publish.mjs [listing] [images] [bundle]
//   TRACK=production|internal|alpha|beta  STATUS=draft|completed  AAB=mobile/bundle/android/GolemForge/GolemForge.aab
//   (adım verilmezse hepsi)
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const repo = path.resolve(root, '..');
const STEPS = process.argv.slice(2);
const want = (s) => STEPS.length === 0 || STEPS.includes(s);

const PKG = 'com.akcware.golemforge';
const SA_PATH = process.env.PLAY_SA_JSON || path.join(os.homedir(), '.golemforge/play-service-account.json');
const TRACK = process.env.TRACK || 'internal';
const STATUS = process.env.STATUS || 'draft';
const AAB = process.env.AAB || path.join(repo, 'mobile/bundle/android/GolemForge/GolemForge.aab');
const SITE = 'https://golem-cephesi.onrender.com';
const CONTACT_EMAIL = 'kadircekim.07+golemforge@gmail.com';

// aso dosyası → Play dilleri
const LANGS = { en: ['en-US'], tr: ['tr-TR'], de: ['de-DE'], es: ['es-ES', 'es-419'], fr: ['fr-FR'], pt: ['pt-BR'] };
const SHOTS = {
  phoneScreenshots: 'android/phone_2560x1440',
  sevenInchScreenshots: 'android/tablet-10in_2560x1600',
  tenInchScreenshots: 'android/tablet-10in_2560x1600',
};
const NOTES = {
  'en-US': 'First release of Golem Forge.', 'tr-TR': "Golem Forge'un ilk sürümü.", 'de-DE': 'Erste Version von Golem Forge.',
  'es-ES': 'Primera versión de Golem Forge.', 'es-419': 'Primera versión de Golem Forge.',
  'fr-FR': 'Première version de Golem Forge.', 'pt-BR': 'Primeira versão do Golem Forge.',
};
const log = (...a) => console.log(...a);

// ── kimlik doğrulama: servis hesabı JWT → erişim jetonu ──
async function accessToken() {
  const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Jeton alınamadı: ${JSON.stringify(j)}`);
  return j.access_token;
}
const TOKEN = await accessToken();
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
const UPLOAD = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}`;
async function call(method, url, body, type = 'application/json') {
  const r = await fetch(url, {
    method, headers: { Authorization: `Bearer ${TOKEN}`, ...(body !== undefined ? { 'Content-Type': type } : {}) },
    body: body === undefined ? undefined : type === 'application/json' ? JSON.stringify(body) : body,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${url.replace(/^https:\/\/[^/]+/, '')} → ${r.status}: ${t.slice(0, 600)}`);
  return t ? JSON.parse(t) : {};
}

function readPlay(lang) {
  const md = fs.readFileSync(path.join(root, 'aso', `metadata-${lang}.md`), 'utf8');
  const g = md.indexOf('## Google Play');
  const sec = md.slice(g, md.indexOf('\n## ', g + 5));
  const inline = (l) => sec.match(new RegExp(`\\*\\*${l}[^*]*\\*\\*\\s*\`([^\`]+)\``))?.[1];
  const block = (l) => sec.match(new RegExp(`\\*\\*${l}[^*]*\\*\\*[^\\n]*\\n\`\`\`text\\n([\\s\\S]*?)\\n\`\`\``))?.[1];
  const m = { title: inline('Title'), shortDescription: block('Short description'), fullDescription: block('Full description') };
  for (const [k, v] of Object.entries(m)) if (!v) throw new Error(`metadata-${lang}.md: Google Play ${k} yok`);
  if ([...m.title].length > 30 || [...m.shortDescription].length > 80 || [...m.fullDescription].length > 4000) throw new Error(`${lang}: sınır aşıldı`);
  return m;
}

const edit = await call('POST', `${API}/edits`, {});
const E = `${API}/edits/${edit.id}`;
log(`Düzenleme ${edit.id}`);
try {
  if (want('listing')) {
    await call('PUT', `${E}/details`, { defaultLanguage: 'en-US', contactEmail: CONTACT_EMAIL, contactWebsite: SITE });
    for (const [lang, codes] of Object.entries(LANGS)) {
      const m = readPlay(lang);
      for (const code of codes) {
        await call('PUT', `${E}/listings/${code}`, { language: code, ...m });
        log(`✓ ${code}: ${m.title}`);
      }
    }
  }
  if (want('images')) {
    const png = (p) => fs.readFileSync(p);
    for (const [lang, codes] of Object.entries(LANGS)) {
      for (const code of codes) {
        const put = async (type, files) => {
          await call('DELETE', `${E}/listings/${code}/${type}`);
          for (const f of files) await call('POST', `${UPLOAD}/edits/${edit.id}/listings/${code}/${type}?uploadType=media`, png(f), 'image/png');
        };
        await put('icon', [path.join(repo, 'public/icon-512.png')]);
        await put('featureGraphic', [path.join(root, 'screenshots/android/feature-graphic_1024x500', `${lang}.png`)]);
        for (const [type, dir] of Object.entries(SHOTS)) {
          const d = path.join(root, 'screenshots', dir, lang);
          await put(type, fs.readdirSync(d).filter((f) => f.endsWith('.png')).sort().map((f) => path.join(d, f)));
        }
        log(`✓ ${code}: ikon, öne çıkan görsel, telefon ve tablet görselleri`);
      }
    }
  }
  if (want('bundle')) {
    const b = await call('POST', `${UPLOAD}/edits/${edit.id}/bundles?uploadType=media`, fs.readFileSync(AAB), 'application/octet-stream');
    log(`✓ AAB yüklendi: sürüm kodu ${b.versionCode}`);
    await call('PUT', `${E}/tracks/${TRACK}`, { track: TRACK, releases: [{
      name: '1.0.0', versionCodes: [String(b.versionCode)], status: STATUS,
      releaseNotes: Object.entries(NOTES).map(([language, text]) => ({ language, text })),
    }] });
    log(`✓ ${TRACK} kanalında sürüm (${STATUS})`);
  }
  await call('POST', `${E}:commit`);
  log('✓ Kaydedildi');
} catch (e) {
  await call('DELETE', E).catch(() => {});
  throw e;
}
