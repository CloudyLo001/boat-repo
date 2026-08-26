// The framing a player actually sees on approach: marina ahead, arrow leading in.
import { chromium } from '@playwright/test';
const [level = '5', out = 'artifacts/approach.png', dist = '2.2'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });
await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(`level:${n}`), level);
await page.waitForTimeout(4500);
await page.evaluate((d) => {
  const b = window.__THREE_GAME_DIAGNOSTICS__.berth;
  window.__THREE_GAME_TEST_HOOKS__.placeBoat({
    x: b.centerX,
    z: b.entranceZ * Number(d) + 40,
    heading: Math.PI,
  });
}, dist);
await page.waitForTimeout(4000);
await page.screenshot({ path: out });
console.log(JSON.stringify({ level, out }));
await browser.close();
