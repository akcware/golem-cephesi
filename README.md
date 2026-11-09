# Golem Cephesi (prototip v0.2)

Tarayıcıda oynanan, online multiplayer bir koridor savaşı oyunu. İki simyacı, kalelerinden golem ordusu döküp karşı kaleye yollar.

## Çalıştırma

Gereken: Node.js 20 veya üstü.

```bash
npm install
npm run dev
```

- Oyun: http://localhost:5173
- Oyun sunucusu: http://localhost:2567

İki tarayıcı sekmesi açıp birinde **Oda Kur**, diğerinde kodu girip **Katıl** diyerek kendine karşı oynayabilirsin. Aynı Wi-Fi'daki bir arkadaşın `http://<bu-bilgisayarın-IP'si>:5173` adresinden katılabilir.

## Oynanış

| Tuş | İş |
|---|---|
| `1` `2` `3` | Yakın dövüş / menzilli / ağır golem üret |
| `S` | Savun / Hücum: ordu kale önünde (ya da en öndeki karakolda) toplanır ya da topluca saldırır |
| `K` | En öndeki noktanda sıradaki adım: karakol kur → kademesini yükselt → üstüne kule ekle |
| `E` | Dökümhaneyi bir sonraki kademeye yükselt (XP dolunca) |
| `Q` | Özel güç: düşmanın ön saflarını vurur |
| `R` | Komutanın Sarsıcı Darbesi: öndeki düşmanların üstüne atılır, alan hasarı verip sersemletir |
| `Z` `X` `C` | Kademe atlayınca sunulan 3 çağ kartından birini seç |
| `T` | Parana yeten en iyi kuleyi kur / eski kuleyi yükselt / yeni yuva aç (yuvaya tıklayınca seçim menüsü açılır) |
| Sürükle, tekerlek, `A`/`D` | Haritayı kaydır (mini haritaya tıklamak da olur) |

- **Güç üçgeni:** Yakın dövüş › Menzilli › Ağır › Yakın dövüş (1.5× hasar).
- **Göğüs göğüse çatışma:** Ön safta her taraftan en fazla 3 yakın dövüşçü aynı anda savaşır, menzilliler arkadan ateş eder. Kalabalık, toplu ordu tek tek gelenleri ezer.
- **Kuşatma:** Ağır golemler kaleye 1.5×, menzilliler 0.6× hasar verir.
- **İleri karakollar:** Koridorda 3 nokta var (her tarafın yakın noktası + ortadaki çekişmeli nokta). Bir noktada 3 sn sadece senin birimlerin durursa nokta senin olur: her nokta +%25 pasif gelir. Noktaya karakol kurarsan: yeni birimlerin oradan doğar, "Savun" orada toplanır ve düşman onu yıkmadan geçemez. Karakol silahsız kurulur; ayrıca para vererek üstüne kademenin Hafif kulesini ekleyebilirsin. Yıkan taraf karakol maliyetinin yarısını kazanır.
- **Birim yetenekleri (otomatik):**

| Çağ | Yakın dövüş | Menzilli | Ağır |
|---|---|---|---|
| Ahşap | Kök Salma: savaşmıyorken can yeniler | Seri Atış: ilk 3 ok çok hızlı | Fidan: ölünce çevresini iyileştirir |
| Bronz | Kalkan: menzillilerin %35'ini bloklar | Zırh Delici: kalkan/zırhı yok sayar, ağıra +%25 | Boğa Hücumu: ilk vuruş 2× + geri itme |
| Demir | Ağır Zırh: yakın dövüşten %25 az hasar | Top Güllesi: %50 alan hasarı | Kuşatma Ustası: kale/karakola 2.5× |
| Kristal | Yansıtma: yakın dövüş hasarının %25'i geri | Delici Işın: hattaki 2 düşman | Buz Yumruğu: vurduğunu yavaşlatır |
| Eter | Ruh Bedeni: bir kez %40 canla dirilir | Zincir Şimşek: 2. hedefe %60 | Komutan Aurası: yakın dostlara +%20 hasar |

- **Kuleler:** Her çağda 3 kule (Hafif: ucuz ve seri, Orta: dengeli, Ağır: pahalı, uzun menzilli) ve her birinin kendi saldırı türü:

| Çağ | Hafif | Orta | Ağır |
|---|---|---|---|
| Ahşap | Ok Kulesi (ok) | Kozalak Mancınığı (bomba) | Kütük Katapultu (büyük bomba) |
| Bronz | Bronz Yay (ok) | Bronz Balista (3 düşmanı deler) | Ateş Kazanı (zemini yakar) |
| Demir | Tüfek Mazgalı (mermi) | Demir Top (bomba) | Havan Topu (büyük bomba) |
| Kristal | Kristal Diken (buz, yavaşlatır) | Prizma Kulesi (lazer, 3 deler) | Işın Merceği (lazer, hattı deler) |
| Eter | Eter Kıvılcımı (zincir şimşek) | Eter Kristali (zincir şimşek) | Yıldız Çekirdeği (dev bomba + yavaşlatma) |
- **Kademeler:** Ahşap → Bronz → Demir → Kristal → Eter. Her kademede birimler ~2.2 kat güçlenir.
- **Çağ kartları:** Her kademe atlayışında 15 kartlık havuzdan 3 kart sunulur, biri seçilir; etkisi maç boyunca sürer. Ordu (Döküm Ustalığı, Hafif Alaşım, Diri Çekirdek, Savaş Narası, Keskin Nişan), ekonomi (Ganimet Simyası, Altın Damarı, Bilgelik Taşı), savunma (Seken Atış, Gözcü Merceği, Taş Örgü, Sur Tahkimi) ve güç (Çifte Yağmur, Hızlı Damıtma, Sancaktar). Rakibin seçtiği kartlar adının altında görünür.
- **Komutan:** Her oyuncunun tek, bedava komutanı vardır: kademenin ağır golemi kadar dayanıklı, yakın dövüş sayılır (ağırlar ona karşı güçlü). Öldürdükçe seviye atlar (Sv1–Sv5, her seviye +%12), kademe atlayınca güçlenir, ölürse 30 sn sonra döner. `R`: Sarsıcı Darbe (28 sn'de bir).
- **Eter Kaynağı:** 2. dakikada ortanın bir yanında belirir (sonrakiler 2,5 dk arayla diğer yanda). Alanında 6 sn sadece bir tarafın birimleri durursa o taraf ödülü alır: Altın Pınarı (45 sn'lik gelir), Eter Öfkesi (25 sn +%30 hasar, +%20 hız) ya da Yaşam Pınarı (tüm birimler tam can, kale ve karakollar onarılır).
- **Yıkım Saati:** 15. dakikadan sonra kaleler ve karakollar her saniye azami canlarının %0,2'sini kaybeder, birimlerin yapılara verdiği hasar her dakika %30 artar. Savunmalar tam oturunca maç kilitlenmez.
- Düşman öldürmek altın + XP verir. Kendi birimin ölünce de biraz XP gelir (geride kalan toparlayabilsin).
- Bağlantısı kopan oyuncu 20 sn içinde geri gelebilir; bu sürede oyun donar.

## Yeni oyuncu rehberi

- **Eğitim maçı:** Adımlar `shared/tutorial.ts`'te; sunucuda `server/tutorial.ts` her adımı hazırlar (rakip birimi yollar, eksik altını tamamlar, XP verir) ve oyuncunun hamlesini bekler. İstemci `state.tut`'a bakıp adım panelini gösterir, ilgili düğmeyi parlatır.
- **Kademeli açılım:** Eğitimde arayüz öğeleri tanıtıldıkları adıma kadar gizlidir (önce yalnızca birim düğmeleri, sonra Savun/Hücum, karakol, kule, kademe, komutan, özel güç).
- **İpuçları:** Gerçek maçlarda bir durum ilk kez yaşanınca bir kez çıkan kısa ipucu (rakip ağır golem yolladı, Eter Kaynağı belirdi, kale zor durumda...). Görülenler cihazda saklanır.
- **İlk maç:** Ad girmek zorunlu değil; eğitimi bitirmemiş oyuncuya kolay bot önerilir.
- **Ölçüm:** Sunucu günlüğüne her eğitim adımı, tamamlanma ve bırakma yazılır (`[eğitim ODA] adım 5/15: heavy (34 sn)`); Render günlüklerinden oyuncuların nerede bıraktığı görülür.

```bash
npx tsx tools/tutorial-check.ts
```

## Mobil sürüm

`mobile/` klasöründe Defold ile yazılmış yerel (WebView'sız) telefon istemcisi var. Aynı sunucuya bağlanır;
çizimler ve denge değerleri bu depodaki kaynaklardan üretilir. Ayrıntılar: [mobile/README.md](mobile/README.md).

```bash
npm run mobile:assets
```

## Modlar

- **Eğitim:** Yeni oyuncu için 15 adımlı rehberli maç (3-4 dk): golem üretme, güç üçgeni, savun/hücum, noktalar, karakol, kule, kademe, çağ kartı, komutan, özel güç ve son saldırı. Rakip tarafı senaryolu bir eğitmen oynar; oyuncunun kalesi düşmez. İlk açılışta menüde öne çıkar, bitince "Eğitimi tekrar oyna" olarak kalır.
- **Bota karşı:** Kolay / Normal / Zor. Bot hile yapmaz, insanla aynı komutları kullanır.
- **Hızlı eşleşme:** Bekleyen başka bir oyuncuyla eşleşir.
- **Oda kur:** 4 harfli kod ve davet linki (`?oda=ABCD`) üretir.

## Yapı

```
shared/balance.ts   Tüm denge değerleri (birimler, kademeler, ekonomi) — dengelemek için burayı değiştir
shared/protocol.ts  İstemci ↔ sunucu mesajları
shared/tutorial.ts  Eğitim adımları ve ipuçları (web ve mobil ortak)
server/sim.ts       Oyun kuralları (sunucu-otoriter simülasyon, 20 Hz)
server/bot.ts       Yapay zeka
server/tutorial.ts  Eğitim maçının yönetmeni (rakip tarafı senaryoyla oynar)
server/BattleRoom.ts Colyseus odası: bağlantılar, komutlar, rövanş, yeniden bağlanma
client/textures.ts  Tüm grafikler kodla çiziliyor (görsel dosyası yok)
client/scenes/      Phaser sahnesi: çizim, animasyon, efektler
client/ui/          Menü ve oyun içi arayüz (HTML)
tools/balance-sim.ts Bot'a karşı bot maçlarıyla denge raporu
tools/rusher.ts     Botu sınamak için oyuncu taklitleri (saldırgan, planlı, kaplumbağa, usta)
tools/old-bot.ts    Botun güçlendirilmeden önceki sürümü (karşılaştırma için)
tools/feature-check.ts Çağ kartı, komutan ve Eter Kaynağı kurallarının testleri
tools/tutorial-check.ts Eğitim maçını sanal oyuncularla baştan sona oynatan test
tools/bake-mobile.ts Çizimleri mobil sürüm için PNG'ye döker (aynı çizim kodu)
tools/bake-sounds.ts Ses tariflerini (client/sounds.ts) mobil sürüm için WAV'a döker
client/tracks.ts    Müzik parçaları, seviyeleri ve künyeleri (dosyalar public/music/)
client/music.ts     Müzik: menü/savaş/gerilim geçişleri, maç sonu motifi, patlamada kısılma
tools/encode-music.ts Ham müzik dosyalarını kırpar, seviyesini ölçer, OGG + MP3 olarak sıkıştırır
tools/bake-music.ts  Müzik listesini ve OGG dosyalarını mobil sürüme taşır
tools/export-lua.ts  Denge değerlerini mobil sürüm için Lua'ya aktarır
mobile/             Defold ile yazılmış telefon istemcisi
```

## Müzik

Tüm parçalar [OpenGameArt](https://opengameart.org)'tan, açık lisanslı. Baştaki ve sondaki sessizlikler kırpıldı, dosyalar OGG ve MP3 olarak yeniden sıkıştırıldı.

| Nerede | Parça | Besteci | Lisans |
|---|---|---|---|
| Menü | [Nox Arcana - RPG Title Screen](https://opengameart.org/content/nox-arcana-rpg-title-screen) | HitCtrl | [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/) |
| Savaş | [QaziJamJam](https://opengameart.org/content/qazijamjam-orchestral-battle-theme) | Emma_MA | CC0 |
| Gerilim (kale düşerken, Yıkım Saati) | [Determined Pursuit](https://opengameart.org/content/determined-pursuit-epic-orchestra-loop) | Emma_MA | CC0 |
| Zafer | [Victory Fanfare Short](https://opengameart.org/content/victory-fanfare-short) | cynicmusic | CC0 |
| Yenilgi | [Lose Game Short Music Clip](https://opengameart.org/content/lose-game-short-music-clip) | Robin Lamb | CC0 |

Parça değiştirmek için: ham dosyaları bir klasöre `menu.wav`, `battle.wav` … adlarıyla koy, `client/tracks.ts`'i güncelle ve şunu çalıştır (çıktıdaki önerilen `vol` değerlerini `tracks.ts`'e yaz):

```bash
npx tsx tools/encode-music.ts <klasör>
```

## Denge testi

```bash
npm run balance
```

```bash
npx tsx tools/balance-sim.ts 40 normal hard
```

Botun gücü (oyuncu taklitlerine ve eski bota karşı):

```bash
npx tsx tools/bot-vs-rusher.ts 20 normal hard --expert
```

```bash
npx tsx tools/new-vs-old.ts 30 normal
```

## Yayına alma

`npm start` hem oyun sunucusunu (Colyseus, WebSocket) hem derlenmiş sayfayı aynı porttan (`PORT`, varsayılan 2567) sunar; tek bir Node servisi yeter.

```bash
npm run build
```

```bash
npm start
```

### Render (ücretsiz)

Depoda bir [Render Blueprint](render.yaml) var: Render panelinde **New → Blueprint** ile bu depoyu seçmek yeterli. Elle kurmak istersen **New → Web Service** ile:

| Ayar | Değer |
|---|---|
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Ortam değişkeni | `NODE_VERSION=24` |

Ücretsiz plan 15 dk trafik olmazsa uyur; ilk giriş ~1 dk sürer. Oynanan bir maç (WebSocket mesajları) sunucuyu uyanık tutar.

> Not: Statik barındırma (GitHub Pages, Vercel) yetmez; çok oyunculu kısım ve bot maçları sürekli çalışan bir sunucuda işler.
