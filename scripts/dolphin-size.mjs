import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('boat:dinghy'));
await page.waitForTimeout(7000);
const out = await page.evaluate(() => {
  const w = window.__THREE_GAME_TEST_HOOKS__.wildlife();
  return {
    dolphins: w.dolphins.map((d) => ({
      b: d.behaviour,
      size: [+d.size.x.toFixed(2), +d.size.y.toFixed(2), +d.size.z.toFixed(2)],
      pos: [+d.x.toFixed(0), +d.y.toFixed(1), +d.z.toFixed(0)],
    })),
    whale: w.whale,
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
