// Report each boat's world bounding box; long axis should be z at heading π.
import { chromium } from '@playwright/test';

const levels = process.argv[2] ? process.argv[2].split(',').map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
for (const lvl of levels) {
  await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(`level:${n}`), lvl);
  await page.waitForTimeout(3200);
  const m = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.measureBoat());
  console.log(lvl, JSON.stringify({ x: +m.x.toFixed(1), z: +m.z.toFixed(1), axisOk: m.z > m.x }));
}
await browser.close();
