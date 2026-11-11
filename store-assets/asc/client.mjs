// App Store Connect API için küçük istemci (bağımlılık yok). Anahtar: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH
// (varsayılan ~/.appstoreconnect/private_keys/AuthKey_<id>.p8).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const KEY_ID = process.env.ASC_KEY_ID;
const ISSUER = process.env.ASC_ISSUER_ID;
if (!KEY_ID || !ISSUER) throw new Error('ASC_KEY_ID ve ASC_ISSUER_ID gerekli');
const KEY_PATH = process.env.ASC_KEY_PATH || path.join(os.homedir(), '.appstoreconnect/private_keys', `AuthKey_${KEY_ID}.p8`);
const KEY = fs.readFileSync(KEY_PATH, 'utf8');

let cached = { token: '', exp: 0 };
function token() {
  const now = Math.floor(Date.now() / 1000);
  if (cached.token && cached.exp - 60 > now) return cached.token;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' });
  const body = b64({ iss: ISSUER, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: KEY, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  cached = { token: `${head}.${body}.${sig}`, exp: now + 1200 };
  return cached.token;
}

export async function api(method, url, body) {
  const full = url.startsWith('http') ? url : `https://api.appstoreconnect.apple.com${url}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(full, {
      method,
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt < 5) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const err = new Error(`${method} ${url} → ${res.status}: ${(json.errors || []).map((e) => `${e.code} ${e.detail || e.title}`).join(' | ')}`);
      err.status = res.status; err.json = json; throw err;
    }
    return json;
  }
}
export const get = (u) => api('GET', u);
export const post = (u, b) => api('POST', u, b);
export const patch = (u, b) => api('PATCH', u, b);
export const del = (u) => api('DELETE', u);
