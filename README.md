# Golem Cephesi (prototip v0.1)

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
| `K` | En öndeki noktana karakol kur / eski karakolu yükselt |
| `E` | Dökümhaneyi bir sonraki kademeye yükselt (XP dolunca) |
| `Q` | Özel güç: düşmanın ön saflarını vurur |
| `T` | Parana yeten en iyi kuleyi kur / eski kuleyi yükselt / yeni yuva aç (yuvaya tıklayınca seçim menüsü açılır) |
| Sürükle, tekerlek, `A`/`D` | Haritayı kaydır (mini haritaya tıklamak da olur) |

- **Güç üçgeni:** Yakın dövüş › Menzilli › Ağır › Yakın dövüş (1.5× hasar).
- **Göğüs göğüse çatışma:** Ön safta her taraftan en fazla 3 yakın dövüşçü aynı anda savaşır, menzilliler arkadan ateş eder. Kalabalık, toplu ordu tek tek gelenleri ezer.
- **Kuşatma:** Ağır golemler kaleye 1.5×, menzilliler 0.6× hasar verir.
- **İleri karakollar:** Koridorda 3 nokta var (her tarafın yakın noktası + ortadaki çekişmeli nokta). Bir noktada 3 sn sadece senin birimlerin durursa nokta senin olur: her nokta +%25 pasif gelir. Noktaya karakol kurarsan: yeni birimlerin oradan doğar, "Savun" orada toplanır, kendi Hafif kulesiyle ateş eder ve düşman onu yıkmadan geçemez. Yıkan taraf karakol maliyetinin yarısını kazanır.
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
- Düşman öldürmek altın + XP verir. Kendi birimin ölünce de biraz XP gelir (geride kalan toparlayabilsin).
- Bağlantısı kopan oyuncu 20 sn içinde geri gelebilir; bu sürede oyun donar.

## Modlar

- **Bota karşı:** Kolay / Normal / Zor. Bot hile yapmaz, insanla aynı komutları kullanır.
- **Hızlı eşleşme:** Bekleyen başka bir oyuncuyla eşleşir.
- **Oda kur:** 4 harfli kod ve davet linki (`?oda=ABCD`) üretir.

## Yapı

```
shared/balance.ts   Tüm denge değerleri (birimler, kademeler, ekonomi) — dengelemek için burayı değiştir
shared/protocol.ts  İstemci ↔ sunucu mesajları
server/sim.ts       Oyun kuralları (sunucu-otoriter simülasyon, 20 Hz)
server/bot.ts       Yapay zeka
server/BattleRoom.ts Colyseus odası: bağlantılar, komutlar, rövanş, yeniden bağlanma
client/textures.ts  Tüm grafikler kodla çiziliyor (görsel dosyası yok)
client/scenes/      Phaser sahnesi: çizim, animasyon, efektler
client/ui/          Menü ve oyun içi arayüz (HTML)
tools/balance-sim.ts Bot'a karşı bot maçlarıyla denge raporu
```

## Denge testi

```bash
npm run balance
```

```bash
npx tsx tools/balance-sim.ts 40 normal hard
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
