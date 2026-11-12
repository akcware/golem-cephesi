// Sunucu giriş noktası. Geliştirmede sadece oyun sunucusu (port 2567) olarak çalışır,
// üretimde (npm run build sonrası) derlenmiş istemciyi de aynı porttan sunar.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { defineServer, defineRoom } from '@colyseus/core';
import { BattleRoom } from './BattleRoom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
// Geliştirmede port komut satırından gelir (--port=2567); PORT ortam değişkeni Vite'a ait olabilir.
// Üretimde (npm start) barındırma servisinin verdiği PORT kullanılır.
const argPort = process.argv.find((a) => a.startsWith('--port='))?.split('=')[1];
const port = Number(argPort) || Number(process.env.PORT) || 2567;

const server = defineServer({
  rooms: {
    battle: defineRoom(BattleRoom).filterBy(['mode']),
  },
  express: (app) => {
    app.get('/health', (_req, res) => {
      res.json({ ok: true });
    });
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
    }
  },
});

server.listen(port).then(() => {
  console.log(`⚔  Golem Forge sunucusu hazır: http://localhost:${port}`);
  if (fs.existsSync(distDir)) console.log('   (derlenmiş istemci de bu adresten sunuluyor)');
  keepAwake();
});

// Render'ın ücretsiz planı 15 dakika gelen istek olmazsa servisi uyutur; uyanması 30-60 sn sürer ve
// mobil istemcinin eşleştirme isteği 10 sn'de zaman aşımına düşer. Sunucu kendi herkese açık adresine
// (Render'ın vekil sunucusu üzerinden) 10 dakikada bir istek atarak uyanık kalır. GitHub Actions'taki
// zamanlanmış iş bunun için güvenilir değil: az etkinlikli depolarda saatlerce gecikiyor.
// Not: ücretsiz plan çalışma alanı başına ayda 750 saat; bu servis tek başına ~744 saat kullanır.
function keepAwake() {
  const base = process.env.RENDER_EXTERNAL_URL;
  if (!base) return;
  const ping = async () => {
    try {
      await fetch(`${base}/health`, { signal: AbortSignal.timeout(30_000) });
    } catch (e) {
      console.warn('Uyanık tutma isteği başarısız:', (e as Error).message);
    }
  };
  setTimeout(ping, 5_000);
  setInterval(ping, 10 * 60_000);
}
