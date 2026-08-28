import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('boat:dinghy'));
await page.waitForTimeout(6000);
// Follow the leaping dolphin and grab it at its highest point.
let best = -99;
const heights = [];
for (let i = 0; i < 40; i += 1) {
  await page.evaluate(() => {
    const d = window.__THREE_GAME_TEST_HOOKS__.wildlife().dolphins.find((x) => x.behaviour === 'leap');
    if (d) window.__THREE_GAME_TEST_HOOKS__.placeBoat({ x: d.x + 1, z: d.z + 7, heading: Math.PI });
  });
  await page.waitForTimeout(400);
  const d = await page.evaluate(() =>
    window.__THREE_GAME_TEST_HOOKS__.wildlife().dolphins.find((x) => x.behaviour === 'leap'));
  if (!d) continue;
  heights.push(+d.y.toFixed(2));
  if (d.y > best) {
    best = d.y;
    await page.screenshot({ path: 'artifacts/dolphin-leap.png' });
  }
}
const info = await page.evaluate(() => {
  const hooks = window.__THREE_GAME_TEST_HOOKS__;
  const d = hooks.wildlife().dolphins.find((x) => x.behaviour === 'leap');
  return { y: d?.y, visible: d?.visible };
});
console.log(JSON.stringify({ peakY: best, range: [Math.min(...heights), Math.max(...heights)], info }));
await browser.close();
