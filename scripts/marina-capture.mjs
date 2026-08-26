// Overhead view of the harbour with the player's boat moored in its berth.
// Usage: node scripts/marina-capture.mjs <levelIndex> <outPath> [camera]
import { chromium } from '@playwright/test';

const [level = '0', out = 'artifacts/marina.png', camera = 'high'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript((cam) => {
  localStorage.setItem(
    'boatpark-settings',
    JSON.stringify({ volume: 0.8, waveIntensity: 1, quality: 'high', cameraMode: cam }),
  );
}, camera);
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });
await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(`level:${n}`), level);
await page.waitForTimeout(3500);
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('complete'));
await page.waitForTimeout(5000);
// Hide the result banner so it does not cover the harbour.
await page.evaluate(() => {
  const banner = document.querySelector('#banner');
  if (banner) banner.hidden = true;
});
await page.screenshot({ path: out });
console.log(JSON.stringify({ level, out, camera }));
await browser.close();
