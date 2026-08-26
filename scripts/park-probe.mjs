// Place the hull correctly in its berth at rest and let the real game loop run:
// it should detect the berth, moor itself, and report a docked banner.
import { chromium } from '@playwright/test';

const levels = process.argv[2] ? process.argv[2].split(',').map(Number) : [0, 2, 5, 8];
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });

for (const lvl of levels) {
  await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(`level:${n}`), lvl);
  await page.waitForTimeout(2500);
  // Drop it on the berth's own mooring pose, at rest.
  await page.evaluate(() => {
    const hooks = window.__THREE_GAME_TEST_HOOKS__;
    const berth = window.__THREE_GAME_DIAGNOSTICS__.berth;
    hooks.placeBoat({ x: berth.centerX, z: berth.centerZ, heading: berth.targetHeading });
  });
  await page.waitForTimeout(7000);
  const status = await page.evaluate(() => ({
    banner: document.querySelector('#banner').hidden ? null : document.querySelector('#banner-title').textContent,
    status: document.querySelector('#status-line').textContent,
  }));
  console.log(lvl, JSON.stringify(status));
}
console.log('errors', JSON.stringify(errors));
await browser.close();
