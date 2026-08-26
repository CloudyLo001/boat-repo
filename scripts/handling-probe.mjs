// Deterministic handling report for the whole fleet: steady-state top speed,
// boost gain, and the worst slip angle through a hard turn (the drift).
// Uses fixed-timestep physics stepping, so results do not depend on frame rate.
import { chromium } from '@playwright/test';

const levels = process.argv[2] ? process.argv[2].split(',').map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });

const MS_TO_KN = 1.9438;

for (const lvl of levels) {
  await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(`level:${n}`), lvl);
  await page.waitForTimeout(400);

  const result = await page.evaluate(() => {
    const hooks = window.__THREE_GAME_TEST_HOOKS__;
    const step = (o) => hooks.stepPhysics(o);

    // Steady-state cruise, then steady-state with boost held.
    hooks.setState('active-play');
    const cruise = step({ seconds: 120, throttle: 1 }).speed;
    hooks.setState('active-play');
    const boosted = step({ seconds: 120, throttle: 1, boost: true }).speed;

    // Wind up to cruise, then put the rudder hard over and watch how far the
    // hull's course lags the bow.
    hooks.setState('active-play');
    step({ seconds: 120, throttle: 1 });
    let worstSlip = 0;
    for (let i = 0; i < 60; i += 1) {
      const s = step({ seconds: 0.25, throttle: 1, rudder: 1 });
      if (s.slipAngleDeg > worstSlip) worstSlip = s.slipAngleDeg;
    }
    return { cruise, boosted, worstSlip };
  });

  console.log(
    lvl,
    JSON.stringify({
      cruiseKn: +(result.cruise * MS_TO_KN).toFixed(1),
      boostKn: +(result.boosted * MS_TO_KN).toFixed(1),
      gain: +(result.boosted / Math.max(result.cruise, 1e-3)).toFixed(2),
      worstSlipDeg: +result.worstSlip.toFixed(1),
    }),
  );
}
await browser.close();
