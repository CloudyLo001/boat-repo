import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('boat:dinghy'));
await page.waitForTimeout(6000);
const seen = new Set();
for (let i = 0; i < 30; i += 1) {
  await page.evaluate(() => {
    const w = window.__THREE_GAME_TEST_HOOKS__.wildlife().whale;
    if (w) window.__THREE_GAME_TEST_HOOKS__.placeBoat({ x: w.x + 4, z: w.z + 18, heading: Math.PI });
  });
  await page.waitForTimeout(1100);
  const w = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.wildlife().whale);
  if (w && !seen.has(w.phase)) {
    seen.add(w.phase);
    await page.screenshot({ path: `artifacts/close-whale-${w.phase}.png` });
  }
}
console.log(JSON.stringify({ phases: [...seen] }));
await browser.close();
