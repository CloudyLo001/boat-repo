// A retry should resume at the last gate reached, keeping gate progress and
// elapsed time, rather than dumping the player back out at sea.
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('boat:dinghy'));
await page.waitForTimeout(5000);

const spawnZ = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.player.position.z);
// Run far enough to bank a couple of gates.
await page.evaluate(() => {
  const g = window.__THREE_GAME_DIAGNOSTICS__.course.gates;
  const hooks = window.__THREE_GAME_TEST_HOOKS__;
  hooks.placeBoat({ x: g[1].x, z: g[1].z + 8, heading: Math.PI });
  for (let i = 0; i < 80; i += 1) hooks.stepPhysics({ seconds: 0.05, throttle: 1 });
});
const banked = await page.evaluate(() => ({
  z: window.__THREE_GAME_DIAGNOSTICS__.player.position.z,
  cleared: window.__THREE_GAME_DIAGNOSTICS__.course.cleared,
  missed: window.__THREE_GAME_DIAGNOSTICS__.course.missed,
}));

await page.keyboard.press('r');
await page.waitForTimeout(600);
const afterRetry = await page.evaluate(() => ({
  z: window.__THREE_GAME_DIAGNOSTICS__.player.position.z,
  cleared: window.__THREE_GAME_DIAGNOSTICS__.course.cleared,
  missed: window.__THREE_GAME_DIAGNOSTICS__.course.missed,
  status: document.querySelector('#status-line').textContent,
}));

console.log(JSON.stringify({
  spawnZ: +spawnZ.toFixed(0),
  bankedZ: +banked.z.toFixed(0),
  bankedGates: banked.cleared + banked.missed,
  retryZ: +afterRetry.z.toFixed(0),
  retryGates: afterRetry.cleared + afterRetry.missed,
  resumedMidCourse: afterRetry.z < spawnZ - 20,
  keptGateProgress: afterRetry.cleared + afterRetry.missed === banked.cleared + banked.missed,
  status: afterRetry.status,
  errors,
}, null, 2));
await browser.close();
