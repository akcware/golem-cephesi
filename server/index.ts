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
  console.log(`⚔  Golem Cephesi sunucusu hazır: http://localhost:${port}`);
  if (fs.existsSync(distDir)) console.log('   (derlenmiş istemci de bu adresten sunuluyor)');
});
