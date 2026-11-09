-- Bu dosya tools/export-lua.ts tarafından shared/tutorial.ts'den üretilir, elle değiştirme.
-- TUTORIAL[1] = sunucudaki 0. adım (state.tut + 1).
return {
  TUTORIAL = {
    {
      id = "intro",
      title = "Hoş geldin, Simyacı!",
      text = "Kalende golem döküp koridora yollarsın. Amaç rakip kaleyi yıkmak. Birkaç dakikada her şeyi göstereceğim.",
      target = "none",
      button = "Başlayalım",
    },
    {
      id = "train",
      title = "İlk golemin",
      text = "Bir yakın dövüş golemi üret. Altının yettikçe istediğin kadar üretebilirsin.",
      target = "melee",
    },
    {
      id = "fight",
      title = "Golemler kendi savaşır",
      text = "Golemin yürür ve karşısına çıkan düşmana saldırır. Düşman golemini yen!",
      target = "none",
    },
    {
      id = "counter",
      title = "Güç üçgeni",
      text = "Yakın dövüş › Menzilli › Ağır › Yakın dövüş: doğru karşılık 1,5 kat hasar verir. Rakip okçu yolluyor; yakın dövüşçülerle karşıla.",
      target = "melee",
    },
    {
      id = "heavy",
      title = "Ağır golem geliyor",
      text = "Ağır golemlere karşı menzilliler güçlüdür. Birkaç menzilli golem üret.",
      target = "ranged",
    },
    {
      id = "hold",
      title = "Savun",
      text = "Savun'a basınca ordun kale önünde, kulelerin menzilinde toplanır.",
      target = "stance",
    },
    {
      id = "gather",
      title = "Toplu saldırı",
      text = "Tek tek giden golemler erir, toplu dalga kazanır. 4 golem biriktir, sonra Hücum'a bas.",
      target = "units",
    },
    {
      id = "capture",
      title = "Noktalar",
      text = "Koridordaki bir noktada yalnızca senin golemlerin durursa nokta senin olur. Her nokta +%25 gelir verir.",
      target = "none",
    },
    {
      id = "outpost",
      title = "Karakol",
      text = "Aldığın noktaya karakol kur: golemlerin oradan doğar ve düşman onu yıkmadan geçemez.",
      target = "outpost",
    },
    {
      id = "turret",
      title = "Kule",
      text = "Kalene bir kule kur: yaklaşan düşmanları vurur. Yuvaya dokunup kuleyi seç.",
      target = "slot",
    },
    {
      id = "evolve",
      title = "Kademe atla",
      text = "Düşman öldürdükçe XP kazanırsın. XP doldu: dökümhaneni Bronz'a yükselt, golemlerin güçlensin.",
      target = "evolve",
    },
    {
      id = "card",
      title = "Çağ kartı",
      text = "Her kademe atlayışında 3 karttan birini seçersin. Etkisi maç boyunca sürer.",
      target = "card",
    },
    {
      id = "cmd",
      title = "Komutan",
      text = "Komutanın sahada! Öldürdükçe seviye atlar. Düşmanlar yaklaşınca Sarsıcı Darbe'yi kullan.",
      target = "cmd",
    },
    {
      id = "special",
      title = "Özel güç",
      text = "Özel güç düşmanın ön saflarına yağar. Düşmanlar toplanınca kullan.",
      target = "special",
    },
    {
      id = "finish",
      title = "Son adım",
      text = "Rakip kale zayıfladı. Hücum et ve kaleyi yık!",
      target = "none",
    },
  },
  TUT_REVEAL = {
    units = "train",
    stance = "hold",
    outposts = "capture",
    slots = "turret",
    evolve = "evolve",
    cmd = "cmd",
    special = "special",
  },
  TIPS = {
    {
      id = "enemy_ranged",
      text = "Rakip okçu yolluyor: yakın dövüş golemleri menzillilere karşı 1,5 kat güçlü.",
      target = "melee",
    },
    {
      id = "enemy_heavy",
      text = "Rakip ağır golem yolladı: menzilliler ağırlara karşı 1,5 kat güçlü.",
      target = "ranged",
    },
    {
      id = "enemy_melee",
      text = "Rakip yakın dövüşçüleri kalabalık: ağır golemler yakın dövüşe karşı 1,5 kat güçlü.",
      target = "heavy",
    },
    {
      id = "point_owned",
      text = "Bir noktayı aldın! Karakol kurarsan golemlerin oradan doğar.",
      target = "outpost",
    },
    {
      id = "turret_gold",
      text = "Kalene kule kurabilirsin: yaklaşan düşmanları vurur.",
      target = "slot",
    },
    {
      id = "evolve_ready",
      text = "XP doldu! Dökümhaneni yükselt: golemlerin güçlenir ve bir çağ kartı seçersin.",
      target = "evolve",
    },
    {
      id = "cmd_ready",
      text = "Komutanın Sarsıcı Darbe'si hazır: öndeki düşmanların üstüne atılıp onları sersemletir.",
      target = "cmd",
    },
    {
      id = "special_ready",
      text = "Özel güç hazır: düşmanın ön saflarını vurur. Kalabalık düşmana karşı kullan.",
      target = "special",
    },
    {
      id = "source",
      text = "Eter Kaynağı belirdi! Alanında 6 sn yalnızca senin golemlerin durursa ödül senin.",
      target = "none",
    },
    {
      id = "outnumbered",
      text = "Rakip ordusu kalabalık: Savun'a geçip kulelerinin yanında karşıla.",
      target = "stance",
    },
    {
      id = "low_castle",
      text = "Kalen zor durumda! Savun'a geç, kulelerini yükselt.",
      target = "stance",
    },
    {
      id = "siege_soon",
      text = "Yıkım Saati yaklaşıyor: 15. dakikadan sonra kaleler yavaş yavaş çöker.",
      target = "none",
    },
  },
}
