# Golem Forge — mobil istemci (Defold)

Telefon ve tablet için yerel (WebView'sız) istemci. [Defold](https://defold.com) ile yazıldı: oyun doğrudan
OpenGL / Vulkan / Metal ile çizilir, Android paketi birkaç MB tutar.

Sunucu, oyun kuralları ve bot web sürümüyle **aynıdır**: mobil istemci aynı Colyseus sunucusuna bağlanır,
telefondaki oyuncu tarayıcıdaki oyuncuyla aynı maçta oynayabilir.

## Ne paylaşılıyor, ne ayrı

| Parça | Nerede | Not |
|---|---|---|
| Oyun kuralları, bot, eşleşme | `server/`, `shared/` | Değişmedi, iki istemci de aynı sunucuya bağlanır |
| Çizimler | `client/art/` (web) → `mobile/assets/images/` | Aynı çizim kodu PNG'ye dökülür (`tools/bake-mobile.ts`) |
| Kart ve kaynak simgeleri | `client/art/icons.ts` → `mobile/assets/images/ui/` | Web'de emoji olan yerler; mobilde koddan çizilen simgeler |
| Sesler | `client/sounds.ts` → `mobile/assets/sounds/*.wav` | Web aynı tarifleri canlı sentezler; `tools/bake-sounds.ts` WAV'a döker (telefon hoparlörü için 2,5× güçlendirilmiş) |
| Müzik | `public/music/*.ogg` → `mobile/assets/music/` | Aynı OGG dosyaları; `tools/bake-music.ts` kopyalar ve ses bileşenlerini üretir (depoya bir kez girer, derleme betikleri kopyalar) |
| Denge değerleri | `shared/balance.ts` → `mobile/shared/balance_data.lua` | `tools/export-lua.ts` ile Lua'ya aktarılır |
| Metinler (6 dil) | `shared/i18n/` → `mobile/shared/i18n_data.lua` | `tools/export-lua.ts` aktarır; `mobile/shared/i18n.lua` web'deki `t()`'nin karşılığı |
| Uygulama ikonu | `client/art/` → `mobile/icons/`, `mobile/res/android/`, `public/` | Taş golem, mavi-kırmızı cephe hattı önünde; `npm run icon` (`tools/bake-icon.ts`) yeniden üretir. iOS için `Assets.car` Xcode'un `actool`'u ile derlenir; Android 8+ için adaptive icon (ve Android 13+ tema ikonu) `bundle_resources` ile pakete girer |
| Sahne, animasyon, efektler | `mobile/main/*.lua` | Web'deki `GameScene`'in Lua karşılığı |
| Arayüz | `mobile/main/ui.gui_script` | Dokunmatik için baştan tasarlandı |

`shared/balance.ts`, `shared/i18n/` ya da `client/art/` değişince üretilen dosyaları yenile:

```bash
npm run mobile:assets
```

## Kurulum

1. [Defold editörünü](https://defold.com/download/) indir (Java içinde gelir).
2. Editörde **Open From Disk** → `mobile/game.project`.
3. **Project → Fetch Libraries** (Colyseus ve WebSocket kütüphanelerini indirir).
4. **Project → Build** (Ctrl+B): oyun bilgisayarda açılır.

Yerel sunucuya bağlanmak için kökte `npm run dev:server` çalışsın. Bilgisayarda ve tarayıcıda localhost'tan açılan
sürüm yerel sunucuya (`ws://localhost:2567`), telefondaki sürüm yayındaki sunucuya bağlanır. Adresler
`game.project` içindeki `[golem]` bölümünde.

## Komut satırından derleme

Defold'un komut satırı derleyicisi `bob.jar` ile (editörün içindeki Java yeterli):

```bash
./build-web.sh
```

Web (HTML5) çıktısı `mobile/bundle/web/` altına yazılır. Android paketi:

```bash
./build-android.sh
```

APK `mobile/bundle/android/` altına yazılır; USB ile telefona kurulabilir (geliştirici modunda "Bilinmeyen kaynaklar").
Google Play için `./build-android.sh release`: yükleme anahtarıyla (`~/.golemforge/upload-keystore.jks`, şifresi macOS
Anahtar Zinciri'nde) imzalı AAB üretir; sürüm kodu git commit sayısıdır. Mağaza girişi ve yükleme:
`store-assets/play/publish.mjs` (bkz. `store-assets/README.md`).
WebSocket eklentisi yerel kod içerdiği için derleme Defold'un bulut derleme sunucusunu (build.defold.com) kullanır.

iOS (App Store / TestFlight) paketi:

```bash
./build-ios.sh          # App Store imzalı IPA: bundle/ios/export/
./build-ios.sh upload   # App Store Connect'e yükler (TestFlight'ta işlenir)
```

Xcode'da ekibin Apple hesabı (Ayarlar → Hesaplar) ya da `ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_KEY_PATH` ile bir
App Store Connect API anahtarı gerekir; dağıtım sertifikası ve profili Xcode otomatik yönetir. Derleme numarası git commit
sayısıdır, bu yüzden her yeni yükleme öncesinde en az bir commit olmalı.

## Yeni oyuncu rehberi

Web sürümüyle aynı: ilk açılışta menüde **Eğitimle Başla** öne çıkar (15 adımlı rehberli maç; adımlar
`shared/tutorial.ts`'ten `mobile/shared/tutorial_data.lua`'ya aktarılır). Eğitimde düğmeler tanıtıldıkça açılır,
hedef düğme altın çerçeveyle parlar. Gerçek maçlarda yeni bir durum ilk kez yaşanınca bir kez ipucu balonu çıkar;
görülen ipuçları ve eğitimin bittiği cihazda saklanır.

## Dokunmatik kontroller

- **Ekranı sürükle:** haritada gez. Mini haritaya dokunmak/sürüklemek de kamerayı taşır.
- **Alt sol:** yakın dövüş / menzilli / ağır golem üret. Üstteki kareler üretim sırası (dokun: iptal, altın iade).
- **HÜCUM / SAVUN:** ordu topluca saldırır ya da kale önünde toplanır.
- **Kule yuvaları:** boş yuvaya dokun → kule seç; kurulu kuleye dokun → değiştir ya da sat. "Yuva aç" yeni yuva açar.
- **Üst ortadaki üç düğme:** karakol noktaları (kur → yükselt → kule ekle).
- **Alt sağ:** komutanın Sarsıcı Darbesi, özel güç, kademe yükseltme.
- **Ses / Sessiz:** sağ üstte (menüde sol altta); seçim cihazda saklanır.
- Kademe atlayınca ekrana gelen üç çağ kartından birine dokun.
- Android'de geri tuşu: menüyü kapatır / maçtan çıkmayı sorar.

## Ekran çentiği ve klavye

- **Güvenli alan:** [extension-safearea](https://github.com/defold/extension-safearea) ile çentik, yuvarlak köşe ve ana ekran çubuğunun
  yeri okunur; arayüz bu alanın içine kurulur, savaş alanı yine tüm ekranı kaplar (Android 9+ ve iOS).
- **Klavye:** Ad ve oda kodu alanına dokununca telefon klavyesi açılır. Klavyenin henüz onaylanmamış (oluşturulan) metni de
  alanda görünür; Enter ya da alanın dışına dokunmak yazmayı bitirir.

## Bilinen eksikler (prototip)

- Gerçek telefonda henüz denenmedi (tarayıcıda Defold'un web çıktısıyla denendi).
- iOS paketi Mac ve Apple geliştirici hesabı ister (bkz. `build-ios.sh`).
