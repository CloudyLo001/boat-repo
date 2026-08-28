// Report hull draft and pier deck height against the tallest wave crest.
// Everything is measured relative to the still waterline at y = 0.
import { chromium } from '@playwright/test';

const levels = process.argv[2] ? process.argv[2].split(',').map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8];
const waves = process.argv[3] ?? '1.5';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript((w) => {
  localStorage.setItem(
    'boatpark-settings',
    JSON.stringify({ volume: 0.8, waveIntensity: Number(w), quality: 'high', cameraMode: 'chase' }),
  );
}, waves);
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });

for (const lvl of levels) {
  await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(`level:${n}`), lvl);
  await page.waitForTimeout(6000);
  const m = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.measureWaterline());
  console.log(
    lvl,
    JSON.stringify({
      model: m.usingModel,
      draft: +(m.boatY - m.boatKeel).toFixed(2),
      freeboard: +(m.boatTop - m.boatY).toFixed(2),
      deck: +m.dockTop.toFixed(2),
      deckClearsCrest: m.dockTop > m.maxWave,
      maxWave: +m.maxWave.toFixed(2),
    }),
  );
}
await browser.close();
