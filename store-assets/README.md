# Golem Forge — mağaza görselleri ve metinleri

App Store ve Google Play için ekran görüntüleri, öne çıkan görsel ve mağaza metinleri. 6 dil: **en, tr, de, es, fr, pt** (App Store'da 8 mağaza dili: en-US, en-GB, tr, de-DE, es-ES, es-MX, fr-FR, pt-BR).

## İçerik

```
store-assets/
├── aso/
│   ├── metadata-{en,tr,de,es,fr,pt}.md   # ad, alt başlık, anahtar kelimeler, tanıtım, açıklamalar (karakter sayılarıyla)
│   └── captions.json                     # görsellerdeki başlıklar (dil başına 8 slayt + çağ adları + öne çıkan görsel sloganı)
├── screenshots/
│   ├── ios/iphone-6.9in_2868x1320/<dil>/01-hero.png … 08-closer.png
│   ├── ios/ipad-13in_2752x2064/<dil>/…
│   ├── android/phone_2560x1440/<dil>/…
│   ├── android/tablet-10in_2560x1600/<dil>/…
│   └── android/feature-graphic_1024x500/<dil>.png
├── preview/                              # dil başına önizleme paftaları (yüklenmez, göz atmak için)
└── source/                               # şablon (screens.html/js) ve render.mjs
```

**Git'te olmayanlar** (`.gitignore`, toplam ~700 MB): `screenshots/` (render çıktısı), `source/assets/captures/`
(simülatörden ham oyun yakalamaları, dil başına) ve `source/assets/art/` (oyunun çizim kodundan üretilmiş büyük
kesimler). Bunlar yalnızca bu Mac'te duruyor; başka bir makinede yeniden render için önce bu iki klasörün kopyalanması
ya da yeniden üretilmesi gerekir. Font ve arka plan katmanları doğrudan `mobile/assets/`'ten okunur.

Tüm PNG'ler RGB (alfa kanalı yok); App Store Connect alfa kanallı görseli reddeder.

## Slayt sırası (her dilde aynı)

1. **hero** — iki ordunun çatışması (arama sonuçlarında çoğu kişinin göreceği tek kare)
2. **army** — golem üretimi
3. **eras** — 5 çağ: kaleler ve golemler (oyunun kendi çizimlerinden)
4. **cards** — çağ atlayınca 3 kart seçimi
5. **defense** — kuleli kale savunması
6. **powers** — gökten kozalak yağmuru
7. **online** — oda koduyla arkadaşınla oyna (telefon + tarayıcı)
8. **closer** — ikon, özellik hapları ve ekran mozaiği

## Yükleme

- **App Store Connect:** her dilin yerelleştirmesine o dilin `iphone-6.9in` ve `ipad-13in` klasörünü yükle. 6.9" iPhone seti diğer iPhone boyutlarına otomatik ölçeklenir. Oyun yalnızca yatay olduğu için görseller yatay.
- **Google Play Console:** her dilin "Mağaza girişi" çevirisine `phone_2560x1440` (telefon), `tablet-10in_2560x1600` (7" ve 10" tablet) ve `feature-graphic_1024x500/<dil>.png` (öne çıkan görsel). 16:9 yatay telefon görselleri oyunlarda öne çıkarılma koşulunu karşılar.
- Bir dil için görsel yüklemezsen iki mağaza da ana dilin setini gösterir.

## Ekran görüntüleri nasıl çekildi

- Oyun, iOS 27.2 simülatörlerinde (iPhone 18 Pro Max, iPad Pro 13" M5) her dilde gerçekten oynandı; oyun içi arayüz o dilde. Simülatör durum çubuğu 9:41'e sabitlendi, ama oyun durum çubuğunu gizlediği (`UIStatusBarHidden`) için karelerde saat görünmüyor.
- Görüntüler gerçek oyun ekranıdır. Kalabalık savaşlar ve ileri çağlar hızlı görünsün diye maçlar yerel bir "vitrin" sunucusuyla oynandı: aynı oyun kuralları, sadece iki tarafa ek altın/XP ve sahne zamanlaması (çağ atlama, özel güç) sunucudan verildi. Bu sunucu depoya girmedi.
- Rakip bot olduğu için HUD'da "(bot)" yazar; çevrimiçi slaytı oda kodu ekranını gösterir.

## App Store Connect'e yükleme (API)

`asc/publish.mjs` mağaza kaydını App Store Connect API ile doldurur: 8 mağaza dilinde metinler (`aso/metadata-*.md`,
en-GB ve es-MX'e özel anahtar kelimeler `aso/locale-overrides.json`), kategori, yaş derecelendirmesi, ücretsiz fiyat
ve tüm ülkeler, inceleme iletişim bilgisi ve notları, derleme, ekran görüntüleri. **İncelemeye göndermez.**

```bash
export ASC_KEY_ID=… ASC_ISSUER_ID=…     # anahtar: ~/.appstoreconnect/private_keys/AuthKey_<id>.p8
node store-assets/asc/publish.mjs        # hepsi; ya da adım adım: meta rating price review build shots status
```

İnceleme iletişim bilgisi (telefon vb.) depo herkese açık olduğu için git'e girmeyen `asc/contact.local.json`
dosyasında durur. Gizlilik etiketi ("Data Not Collected") API'de olmadığı için App Store Connect web'den girildi.
Bağımsız ASO incelemesi ve gerekçeler: `aso/review.md`.

## Yeniden üretme

Başlıkları değiştirmek için `aso/captions.json`'ı düzenle, sonra:

```bash
node store-assets/source/render.mjs
```

Seçenekler: `dev=iphone,ipad,aphone,atab,fg`, `lang=tr,en`, `slide=hero,cards`. Chrome gerekir (`/Applications/Google Chrome.app`, ya da `CHROME` ortam değişkeni). Şablon `source/screens.html` + `source/screens.js`; tek bir görseli tarayıcıda açmak için:
`source/screens.html?dev=iphone&slide=hero&lang=de`.

Yazı tipi oyunun kendi fontu Baloo 2 (SIL OFL, `mobile/assets/fonts/OFL.txt`).
