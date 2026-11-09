// Tüm grafikler kodla (procedural) çiziliyor: dış görsel dosyası yok.
// Çizim kodu client/art/ altında (Canvas 2D):
//   layout.ts     – boyut/yerleşim sabitleri (LAYOUT, MOUNTS, TURRET_*, ART_SCALE ...)
//   canvas.ts     – renk, yol, hücre gölgeleme yardımcıları
//   material.ts   – kademe malzemeleri (ahşap damarı, bronz parlaması, kristal yüzeyleri ...)
//   units.ts      – golem gövdesi / bacak / silah parçaları
//   castles.ts    – kaleler      turrets.ts – kuleler      fx.ts – mermi, özel güç, parçacık
//   background.ts – gökyüzü, dağlar, tepeler, yol (dokuya pişirilir)
//   api.ts        – bu dosyanın dışa aktardığı sözleşme (keys, generateTextures, ikonlar ...)
// Her golem parçalardan oluşur (gövde, iki bacak, silah) ki GameScene animasyon yapabilsin.
export * from './art/api';
