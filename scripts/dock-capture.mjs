// Close-up of the dock with the boat moored alongside, at a chosen wave
// intensity, to check the deck clears the crests.
// Usage: node scripts/dock-capture.mjs <levelIndex> <outPath> [waveIntensity]
import { chromium } from '@playwright/test';

const [level = '0', out = 'artifacts/dock.png', waves = '1.5'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript((w) => {
  localStorage.setItem(
    'boatpark-settings',
    JSON.stringify({ volume: 0.8, waveIntensity: Number(w), quality: 'high', cameraMode: 'chase' }),
  );
}, waves);
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(`level:${n}`), level);
await page.waitForTimeout(3500);
// Drop the boat into its berth so the chase camera frames the dock.
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('complete'));
await page.waitForTimeout(4000);
await page.screenshot({ path: out });
console.log(JSON.stringify({ level, out, waves }));
await browser.close();
