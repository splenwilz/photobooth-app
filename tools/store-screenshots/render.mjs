/**
 * Renders the App Store screenshot set defined in shots.mjs.
 *
 * Usage: node tools/store-screenshots/render.mjs [shot-id ...]
 * Output: tools/store-screenshots/out/<VERSION>/<id>.jpg (1284×2778 JPEG, no
 * alpha). VERSION comes from shots.mjs so each design iteration lands in its
 * own folder (out/v1, out/v2, ...) instead of overwriting the previous one.
 *
 * Uses playwright-core with the locally installed Chrome (channel: 'chrome'),
 * so no browser download is needed.
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

import { CANVAS, CAPTURE, SHOTS, VERSION } from './shots.mjs';
import { renderHtml } from './template.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const rawDir = join(repo, 'appstore-screenshots', 'raw');
const fontDir = join(repo, 'assets', 'fonts');
const outDir = join(here, 'out', VERSION);

const dataUri = (path, mime) =>
  `data:${mime};base64,${readFileSync(path).toString('base64')}`;

const fonts = {
  regular: dataUri(join(fontDir, 'Geist-Regular.ttf'), 'font/ttf'),
  medium: dataUri(join(fontDir, 'Geist-Medium.ttf'), 'font/ttf'),
  semibold: dataUri(join(fontDir, 'Geist-SemiBold.ttf'), 'font/ttf'),
};
const frame = dataUri(join(here, 'assets', 'apple-iphone.svg'), 'image/svg+xml');
// App-icon glyph silhouette (white on transparency) — the ghosted background
// mark, tinted per frame background in the template.
const mark = dataUri(
  join(repo, 'assets', 'images', 'android-icon-monochrome.png'),
  'image/png',
);

const only = process.argv.slice(2);
const shots = only.length ? SHOTS.filter((s) => only.includes(s.id)) : SHOTS;
if (!shots.length) {
  console.error(`No shots matched ${only}. Known: ${SHOTS.map((s) => s.id).join(', ')}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: CANVAS.width, height: CANVAS.height },
  deviceScaleFactor: 1,
});

for (const shot of shots) {
  const assets = {
    fonts,
    frame,
    mark,
    capture: dataUri(join(rawDir, shot.capture), 'image/png'),
    ...(shot.capture2 && { capture2: dataUri(join(rawDir, shot.capture2), 'image/png') }),
  };
  await page.setContent(renderHtml(shot, assets));
  // All assets are data URIs (no network), but font decode is async — wait
  // for it or captions can screenshot in the fallback sans-serif.
  await page.evaluate(() => document.fonts.ready);
  const file = join(outDir, `${shot.id}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
  console.log(`rendered ${file}`);
}

await browser.close();
