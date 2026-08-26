// Overhead screenshot of a level (camera mode "high") for bow-direction QA.
// Usage: node scripts/overhead-capture.mjs <levelIndex> <outPath>
import { chromium } from '@playwright/test';

const [level = '1', out = 'artifacts/overhead.png'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => {
  localStorage.setItem(
    'boatpark-settings',
    JSON.stringify({ volume: 0.8, waveIntensity: 1, quality: 'high', cameraMode: 'high' }),
  );
});
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });
await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(`level:${n}`), level);
await page.waitForTimeout(4200);
await page.screenshot({ path: out });
console.log(JSON.stringify({ level, out }));
await browser.close();
