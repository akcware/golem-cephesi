// Mağaza görsellerini Chrome headless ile PNG'ye döker, sonra RGB'ye (alfa kanalsız) çevirir.
// Kullanım: node store-assets/source/render.mjs [dev=iphone,ipad,aphone,atab,fg] [lang=tr,en] [slide=hero,...]
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const arg = (k, def) => (process.argv.find((a) => a.startsWith(k + '='))?.split('=')[1] ?? def).split(',');
const DEVS = arg('dev', 'iphone,ipad,aphone,atab,fg');
const LANGS = arg('lang', 'en,tr,de,es,fr,pt');
const ONLY = arg('slide', '');

const SLIDES = ['hero', 'army', 'eras', 'cards', 'defense', 'powers', 'online', 'closer'];
const SIZES = { iphone: [2868, 1320], ipad: [2752, 2064], aphone: [2560, 1440], atab: [2560, 1600], fg: [1024, 500] };
const OUT = {
  iphone: 'ios/iphone-6.9in_2868x1320',
  ipad: 'ios/ipad-13in_2752x2064',
  aphone: 'android/phone_2560x1440',
  atab: 'android/tablet-10in_2560x1600',
  fg: 'android/feature-graphic_1024x500',
};

const captions = JSON.parse(fs.readFileSync(path.join(root, 'aso/captions.json'), 'utf8'));
fs.writeFileSync(path.join(here, 'data.js'),
  '// render.mjs üretir (aso/captions.json)\nwindow.CAPTIONS = ' + JSON.stringify(captions) + ';\n');

const jobs = [];
for (const dev of DEVS) {
  for (const lang of LANGS) {
    const list = dev === 'fg' ? ['fg'] : SLIDES;
    list.forEach((slide, i) => {
      if (ONLY[0] && !ONLY.includes(slide)) return;
      const dir = path.join(root, 'screenshots', OUT[dev], dev === 'fg' ? '' : lang);
      const file = dev === 'fg' ? path.join(dir, `${lang}.png`) : path.join(dir, `${String(i + 1).padStart(2, '0')}-${slide}.png`);
      jobs.push({ dev, lang, slide, file });
    });
  }
}

async function render(j) {
  const [w, h] = SIZES[j.dev];
  fs.mkdirSync(path.dirname(j.file), { recursive: true });
  const url = 'file://' + path.join(here, 'screens.html') + `?dev=${j.dev}&slide=${j.slide}&lang=${j.lang}`;
  const tmp = j.file + '.tmp.png';
  await run(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--allow-file-access-from-files', '--virtual-time-budget=10000', '--run-all-compositor-stages-before-draw',
    `--window-size=${w},${h}`, `--screenshot=${tmp}`, url,
  ], { timeout: 120000 });
  // alfa kanalını at, boyutu doğrula
  await run('python3', ['-c', `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
assert im.size == (${w}, ${h}), im.size
im.save(sys.argv[2], optimize=True)
`, tmp, j.file]);
  fs.unlinkSync(tmp);
  console.log('✓', path.relative(root, j.file));
}

const N = Number(process.env.JOBS || 4);
let k = 0;
await Promise.all(Array.from({ length: N }, async () => {
  while (k < jobs.length) await render(jobs[k++]);
}));
console.log(jobs.length, 'görsel');
