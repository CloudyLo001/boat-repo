import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('level:5'));
await page.waitForTimeout(4000);
const out = await page.evaluate(() => {
  const hooks = window.__THREE_GAME_TEST_HOOKS__;
  hooks.placeBoat({ x: 0, z: 60, heading: Math.PI });
  const rows = [];
  const d = () => window.__THREE_GAME_DIAGNOSTICS__;
  rows.push({ t: 0, z: +d().player.position.z.toFixed(2), hdg: +d().player.headingDeg.toFixed(1), dmg: d().damage });
  for (let i = 1; i <= 10; i += 1) {
    const s = hooks.stepPhysics({ seconds: 1, throttle: 1 });
    rows.push({ t: i, z: +d().player.position.z.toFixed(2), hdg: +d().player.headingDeg.toFixed(1), spd: +s.speed.toFixed(2), dmg: d().damage });
  }
  return rows;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
