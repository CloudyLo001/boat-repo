import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('boat:trawler'));
await page.waitForTimeout(6000);
// Sit off to one side of gate 1 so the arrow is visibly angled.
await page.evaluate(() => {
  const g = window.__THREE_GAME_DIAGNOSTICS__.course.gates[0];
  window.__THREE_GAME_TEST_HOOKS__.placeBoat({ x: g.x - 90, z: g.z + 150, heading: Math.PI });
});
await page.waitForTimeout(2500);
await page.screenshot({ path: 'artifacts/compass-gate.png' });
console.log('ok');
await browser.close();
