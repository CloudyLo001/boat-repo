// Steady-state top speed per hull, with collisions off so the measurement is
// about the drivetrain and not about hitting the dock.
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const MS_TO_KN = 1.9438;
const rows = [];
for (const id of ['dinghy', 'speedboat', 'sailboat', 'trawler', 'tugboat', 'yacht', 'cruise', 'container', 'carrier']) {
  const r = await page.evaluate((boat) => {
    const hooks = window.__THREE_GAME_TEST_HOOKS__;
    hooks.setState(`boat:${boat}`);
    const cruise = hooks.stepPhysics({ seconds: 120, throttle: 1, collide: false }).speed;
    hooks.setState(`boat:${boat}`);
    const boosted = hooks.stepPhysics({ seconds: 120, throttle: 1, boost: true, collide: false }).speed;
    hooks.setState(`boat:${boat}`);
    // Time to reach 90% of top speed.
    let t = 0;
    while (t < 60) {
      const s = hooks.stepPhysics({ seconds: 0.1, throttle: 1, collide: false });
      t += 0.1;
      if (s.speed >= cruise * 0.9) break;
    }
    return { cruise, boosted, t };
  }, id);
  rows.push({ id, kn: +(r.cruise * MS_TO_KN).toFixed(1), boostKn: +(r.boosted * MS_TO_KN).toFixed(1), to90pct: +r.t.toFixed(1) });
}
console.table(rows);
await browser.close();
