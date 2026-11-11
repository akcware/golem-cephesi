// App Store Connect kaydını doldurur: metinler (6 dil), kategori, yaş derecelendirmesi, ücretsiz fiyat ve
// tüm ülkeler, inceleme iletişim bilgisi, derleme ve ekran görüntüleri. İncelemeye GÖNDERMEZ.
// Tekrar çalıştırılabilir: var olanı günceller, ekran görüntüsü setlerini baştan yükler.
//
//   ASC_KEY_ID=… ASC_ISSUER_ID=… node store-assets/asc/publish.mjs [meta] [rating] [price] [review] [build] [shots] [status]
//   (adım verilmezse hepsi; "shots" en uzunu)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, post, patch, del } from './client.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const STEPS = process.argv.slice(2);
const want = (s) => STEPS.length === 0 || STEPS.includes(s);

const BUNDLE_ID = 'com.akcware.golemforge';
const VERSION = process.env.VERSION || '1.0.0';
const BUILD = process.env.BUILD || '';   // boşsa en son işlenmiş derleme
const SITE = 'https://golem-cephesi.onrender.com';
// App Review iletişim bilgisi (yalnızca Apple görür) depo herkese açık olduğu için git'e girmeyen dosyada:
// store-assets/asc/contact.local.json → {"contactFirstName","contactLastName","contactPhone","contactEmail"}
const CONTACT_FILE = path.join(here, 'contact.local.json');
const CONTACT = fs.existsSync(CONTACT_FILE) ? JSON.parse(fs.readFileSync(CONTACT_FILE, 'utf8')) : null;
const REVIEW_NOTES = `Golem Forge is a real-time strategy game. No account or login is needed.

Quick check: open the app → "Play vs Bot" (Easy is preselected for new players) → a full match against the computer, about 5–10 minutes. "Start with the Tutorial" is a guided 3–4 minute match.
"Create Room" shows a 4-letter code to play a friend on another device, or in a browser at ${SITE}.

All modes need an internet connection (game server hosted on Render). The UI language follows the device language (English, Turkish, German, Spanish, French, Portuguese) and can be changed with the button in the top-left corner of the main menu.

Quick Match: we first look for another player. If nobody is found within about 5–18 seconds, an AI opponent joins so nobody waits forever; the App Store description states this. To test real player-vs-player, use "Create Room" on one device and enter the 4-letter code with "Join" on a second device (or in a browser at ${SITE}).`;

// aso dosyası → App Store dilleri (en ve es tek metin, ikişer mağaza dili; farkları aso/locale-overrides.json'da)
const OVERRIDES = JSON.parse(fs.readFileSync(path.join(root, 'aso', 'locale-overrides.json'), 'utf8'));
const LOCALES = { en: ['en-US', 'en-GB'], tr: ['tr'], de: ['de-DE'], es: ['es-ES', 'es-MX'], fr: ['fr-FR'], pt: ['pt-BR'] };
const SHOT_SETS = [
  { type: 'APP_IPHONE_67', dir: 'ios/iphone-6.9in_2868x1320' },
  { type: 'APP_IPAD_PRO_3GEN_129', dir: 'ios/ipad-13in_2752x2064' },
];

const log = (...a) => console.log(...a);

// ── metadata-<dil>.md içinden App Store alanları ──
function readMeta(lang) {
  const md = fs.readFileSync(path.join(root, 'aso', `metadata-${lang}.md`), 'utf8');
  const sec = md.slice(md.indexOf('## App Store'), md.indexOf('## Google Play'));
  const inline = (label) => sec.match(new RegExp(`\\*\\*${label}[^*]*\\*\\*\\s*\`([^\`]+)\``))?.[1];
  const block = (label) => sec.match(new RegExp(`\\*\\*${label}[^*]*\\*\\*[^\\n]*\\n\`\`\`text\\n([\\s\\S]*?)\\n\`\`\``))?.[1];
  const m = {
    name: inline('App name'), subtitle: inline('Subtitle'),
    keywords: block('Keywords'), promotionalText: block('Promotional text'), description: block('Description'),
  };
  for (const [k, v] of Object.entries(m)) if (!v) throw new Error(`metadata-${lang}.md: ${k} bulunamadı`);
  return m;
}

async function all(url) {
  let out = [], next = url;
  while (next) { const r = await get(next); out = out.concat(r.data); next = r.links?.next; }
  return out;
}

const app = (await get(`/v1/apps?filter[bundleId]=${BUNDLE_ID}`)).data[0];
if (!app) throw new Error('Uygulama kaydı yok');
const appInfo = (await get(`/v1/apps/${app.id}/appInfos`)).data.find((i) => i.attributes.state !== 'READY_FOR_DISTRIBUTION') ;
const version = (await get(`/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&filter[appStoreState]=PREPARE_FOR_SUBMISSION,DEVELOPER_REJECTED,REJECTED,METADATA_REJECTED`)).data[0];
if (!version) throw new Error('Düzenlenebilir bir iOS sürümü yok');
log(`Uygulama ${app.attributes.name} (${app.id}) · sürüm kaydı ${version.attributes.versionString} · appInfo ${appInfo.id}`);

// ── metinler, kategori, telif ──
if (want('meta')) {
  await patch(`/v1/apps/${app.id}`, { data: { type: 'apps', id: app.id, attributes: { contentRightsDeclaration: 'USES_THIRD_PARTY_CONTENT' } } });
  await patch(`/v1/appStoreVersions/${version.id}`, { data: { type: 'appStoreVersions', id: version.id, attributes: {
    versionString: VERSION, copyright: `2026 Askin Kadir Cekim`, releaseType: 'AFTER_APPROVAL',
  } } });
  await patch(`/v1/appInfos/${appInfo.id}`, { data: { type: 'appInfos', id: appInfo.id, relationships: {
    primaryCategory: { data: { type: 'appCategories', id: 'GAMES' } },
    primarySubcategoryOne: { data: { type: 'appCategories', id: 'GAMES_STRATEGY' } },
    primarySubcategoryTwo: { data: { type: 'appCategories', id: 'GAMES_ACTION' } },
  } } });
  log('✓ sürüm 1.0.0, telif, onaydan sonra otomatik yayın, kategori Oyunlar › Strateji + Aksiyon, üçüncü taraf içerik beyanı');

  const infoLocs = await all(`/v1/appInfos/${appInfo.id}/appInfoLocalizations`);
  const verLocs = await all(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
  for (const [lang, locales] of Object.entries(LOCALES)) {
    const base = readMeta(lang);
    for (const locale of locales) {
      const m = { ...base, ...(OVERRIDES[locale] || {}) };
      const infoAttrs = { name: m.name, subtitle: m.subtitle, privacyPolicyUrl: `${SITE}/privacy.html` };
      const il = infoLocs.find((x) => x.attributes.locale === locale);
      try {
        if (il) await patch(`/v1/appInfoLocalizations/${il.id}`, { data: { type: 'appInfoLocalizations', id: il.id, attributes: infoAttrs } });
        else await post('/v1/appInfoLocalizations', { data: { type: 'appInfoLocalizations', attributes: { locale, ...infoAttrs },
          relationships: { appInfo: { data: { type: 'appInfos', id: appInfo.id } } } } });
      } catch (e) { log(`  ! ${locale} ad/alt başlık: ${e.message}`); }
      const verAttrs = { description: m.description, keywords: m.keywords, promotionalText: m.promotionalText,
        supportUrl: `${SITE}/support.html`, marketingUrl: SITE };
      // ad kaydı oluşturulunca Apple sürüm metni kaydını da açar: listeyi tazele
      const vl = (await all(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).find((x) => x.attributes.locale === locale);
      if (vl) await patch(`/v1/appStoreVersionLocalizations/${vl.id}`, { data: { type: 'appStoreVersionLocalizations', id: vl.id, attributes: verAttrs } });
      else await post('/v1/appStoreVersionLocalizations', { data: { type: 'appStoreVersionLocalizations', attributes: { locale, ...verAttrs },
        relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } } });
      log(`✓ ${locale}: ${m.name} — ${m.subtitle}`);
    }
  }
}

// ── yaş derecelendirmesi (çizgi film tarzı fantastik şiddet, başka hiçbir şey) ──
if (want('rating')) {
  const decl = (await get(`/v1/appInfos/${appInfo.id}/ageRatingDeclaration`)).data;
  const NONE = 'NONE';
  await patch(`/v1/ageRatingDeclarations/${decl.id}`, { data: { type: 'ageRatingDeclarations', id: decl.id, attributes: {
    violenceCartoonOrFantasy: 'FREQUENT_OR_INTENSE', gunsOrOtherWeapons: 'INFREQUENT_OR_MILD',
    violenceRealistic: NONE, violenceRealisticProlongedGraphicOrSadistic: NONE,
    alcoholTobaccoOrDrugUseOrReferences: NONE, contests: NONE, gamblingSimulated: NONE, horrorOrFearThemes: NONE,
    matureOrSuggestiveThemes: NONE, medicalOrTreatmentInformation: NONE, profanityOrCrudeHumor: NONE,
    sexualContentGraphicAndNudity: NONE, sexualContentOrNudity: NONE,
    gambling: false, lootBox: false, advertising: false, messagingAndChat: false, parentalControls: false,
    ageAssurance: false, healthOrWellnessTopics: false, unrestrictedWebAccess: false, userGeneratedContent: false,
    socialMedia: false, socialMediaAgeRestricted: false,
  } } });
  const r = (await get(`/v1/apps/${app.id}/appInfos`)).data.find((i) => i.id === appInfo.id);
  log(`✓ yaş derecelendirmesi kaydedildi → ${r.attributes.appStoreAgeRating ?? '(hesaplanıyor)'}`);
}

// ── ücretsiz, tüm ülkeler ──
if (want('price')) {
  const points = await all(`/v1/apps/${app.id}/appPricePoints?filter[territory]=USA&limit=200`);
  const free = points.find((p) => Number(p.attributes.customerPrice) === 0);
  await post('/v1/appPriceSchedules', {
    data: { type: 'appPriceSchedules', relationships: {
      app: { data: { type: 'apps', id: app.id } },
      baseTerritory: { data: { type: 'territories', id: 'USA' } },
      manualPrices: { data: [{ type: 'appPrices', id: '${p0}' }] },
    } },
    included: [{ type: 'appPrices', id: '${p0}', attributes: { startDate: null },
      relationships: { appPricePoint: { data: { type: 'appPricePoints', id: free.id } } } }],
  });
  log('✓ fiyat: ücretsiz');
  const territories = await all('/v1/territories?limit=200');
  try {
    await post('/v2/appAvailabilities', {
      data: { type: 'appAvailabilities', attributes: { availableInNewTerritories: true }, relationships: {
        app: { data: { type: 'apps', id: app.id } },
        territoryAvailabilities: { data: territories.map((_, i) => ({ type: 'territoryAvailabilities', id: `\${t${i}}` })) },
      } },
      included: territories.map((t, i) => ({ type: 'territoryAvailabilities', id: `\${t${i}}`,
        attributes: { available: true, releaseDate: null, preOrderEnabled: false },
        relationships: { territory: { data: { type: 'territories', id: t.id } } } })),
    });
    log(`✓ ${territories.length} ülkede satışta`);
  } catch (e) {
    if (e.status === 409) log('  (ülke listesi zaten ayarlı)'); else throw e;
  }
}

// ── inceleme ekibi için iletişim ve notlar ──
if (want('review')) {
  if (!CONTACT) throw new Error(`İnceleme iletişim bilgisi yok: ${CONTACT_FILE}`);
  const attrs = { ...CONTACT, demoAccountRequired: false, notes: REVIEW_NOTES };
  let detail;
  try { detail = (await get(`/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)).data; } catch { detail = null; }
  if (detail) await patch(`/v1/appStoreReviewDetails/${detail.id}`, { data: { type: 'appStoreReviewDetails', id: detail.id, attributes: attrs } });
  else await post('/v1/appStoreReviewDetails', { data: { type: 'appStoreReviewDetails', attributes: attrs,
    relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } } });
  log('✓ inceleme iletişim bilgisi ve notlar');
}

// ── derleme ──
if (want('build')) {
  const builds = await all(`/v1/builds?filter[app]=${app.id}&sort=-uploadedDate&limit=50`);
  const b = builds.find((x) => x.attributes.processingState === 'VALID' && (!BUILD || x.attributes.version === BUILD));
  if (!b) throw new Error('İşlenmiş derleme yok');
  await patch(`/v1/appStoreVersions/${version.id}/relationships/build`, { data: { type: 'builds', id: b.id } });
  log(`✓ derleme bağlandı: ${b.attributes.version}`);
}

// ── ekran görüntüleri ──
if (want('shots')) {
  const verLocs = await all(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
  for (const [lang, locales] of Object.entries(LOCALES)) {
    for (const locale of locales) {
      const vl = verLocs.find((x) => x.attributes.locale === locale);
      if (!vl) { log(`  ! ${locale}: sürüm metni yok, önce "meta"`); continue; }
      const sets = await all(`/v1/appStoreVersionLocalizations/${vl.id}/appScreenshotSets`);
      for (const S of SHOT_SETS) {
        const dir = path.join(root, 'screenshots', S.dir, lang);
        const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
        let set = sets.find((s) => s.attributes.screenshotDisplayType === S.type);
        if (set) {
          const old = await all(`/v1/appScreenshotSets/${set.id}/appScreenshots`);
          for (const o of old) await del(`/v1/appScreenshots/${o.id}`);
        } else {
          set = (await post('/v1/appScreenshotSets', { data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: S.type },
            relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: vl.id } } } } })).data;
        }
        for (const f of files) {
          const buf = fs.readFileSync(path.join(dir, f));
          const shot = (await post('/v1/appScreenshots', { data: { type: 'appScreenshots',
            attributes: { fileName: f, fileSize: buf.length },
            relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } } } })).data;
          for (const op of shot.attributes.uploadOperations) {
            const part = buf.subarray(op.offset, op.offset + op.length);
            const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
            const r = await fetch(op.url, { method: op.method, headers, body: part });
            if (!r.ok) throw new Error(`yükleme parçası ${f}: ${r.status}`);
          }
          await patch(`/v1/appScreenshots/${shot.id}`, { data: { type: 'appScreenshots', id: shot.id,
            attributes: { uploaded: true, sourceFileChecksum: crypto.createHash('md5').update(buf).digest('hex') } } });
        }
        log(`✓ ${locale} ${S.type}: ${files.length} görsel`);
      }
    }
  }
}

// ── durum: Apple'ın görselleri işleyip işlemediği ──
if (want('status')) {
  const verLocs = await all(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
  for (const vl of verLocs) {
    const sets = await all(`/v1/appStoreVersionLocalizations/${vl.id}/appScreenshotSets`);
    for (const s of sets) {
      const shots = await all(`/v1/appScreenshotSets/${s.id}/appScreenshots`);
      const states = shots.map((x) => x.attributes.assetDeliveryState?.state);
      const bad = shots.filter((x) => x.attributes.assetDeliveryState?.state === 'FAILED');
      log(`${vl.attributes.locale} ${s.attributes.screenshotDisplayType}: ${shots.length} görsel, ${[...new Set(states)].join('/')}`
        + (bad.length ? ` — HATA: ${bad.map((b) => JSON.stringify(b.attributes.assetDeliveryState.errors)).join(' ')}` : ''));
    }
  }
}
