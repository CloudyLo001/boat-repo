// Confirm the marina is solid: aim the hull straight at a finger pier and check
// it is stopped short with hull damage, rather than passing through.
// Compare against the clean run straight down the open slip.
import { chromium } from '@playwright/test';

const level = process.argv[2] ?? '5';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });

const run = (lvl, offsetX) =>
  page.evaluate(
    ({ lvl, offsetX }) => {
      const hooks = window.__THREE_GAME_TEST_HOOKS__;
      hooks.setState(`level:${lvl}`);
      const start = 60;
      hooks.placeBoat({ x: offsetX, z: start, heading: Math.PI });
      let last;
      for (let i = 0; i < 600; i += 1) last = hooks.stepPhysics({ seconds: 0.05, throttle: 1 });
      return {
        startZ: start,
        endZ: +last.z.toFixed(2),
        endX: +last.x.toFixed(2),
        damage: +last.damage.toFixed(0),
        obstacles: window.__THREE_GAME_DIAGNOSTICS__.obstacleCount,
      };
    },
    { lvl, offsetX },
  );

await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(`level:${n}`), level);
await page.waitForTimeout(4000);

// Straight down the middle of the player's own slip.
console.log('open slip   ', JSON.stringify(await run(level, 0)));
// Offset onto the finger pier beside it.
const beam = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.measureBoat().x);
console.log('into finger ', JSON.stringify(await run(level, beam * 1.4)));

await browser.close();
