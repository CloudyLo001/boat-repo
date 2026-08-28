// The compass must point at the next gate, flip to the berth once the gates are
// done, and read 0 degrees when the target is dead ahead.
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('boat:dinghy'));
await page.waitForTimeout(5000);

const read = () => page.evaluate(() => {
  const dial = document.querySelector('#compass-dial');
  const m = /rotate\(([-0-9.]+)deg\)/.exec(dial.style.transform || '');
  return {
    deg: m ? Number(m[1]) : null,
    label: document.querySelector('#compass-label').textContent,
    dist: document.querySelector('#compass-distance').textContent,
    visible: document.querySelector('#compass').classList.contains('is-visible'),
    berth: document.querySelector('#compass').classList.contains('is-berth'),
  };
});

// Aim the bow straight at gate 1 — the arrow should read about zero.
await page.evaluate(() => {
  const g = window.__THREE_GAME_DIAGNOSTICS__.course.gates[0];
  window.__THREE_GAME_TEST_HOOKS__.placeBoat({ x: g.x, z: g.z + 120, heading: Math.PI });
});
await page.waitForTimeout(500);
const ahead = await read();

// Swing the bow 90 degrees to port; the gate should now sit to starboard.
await page.evaluate(() => {
  const g = window.__THREE_GAME_DIAGNOSTICS__.course.gates[0];
  window.__THREE_GAME_TEST_HOOKS__.placeBoat({ x: g.x, z: g.z + 120, heading: Math.PI + Math.PI / 2 });
});
await page.waitForTimeout(500);
const turned = await read();

// Put every gate behind the boat; the compass should switch to the berth.
await page.evaluate(() => {
  const hooks = window.__THREE_GAME_TEST_HOOKS__;
  const b = window.__THREE_GAME_DIAGNOSTICS__.berth;
  hooks.placeBoat({ x: b.centerX, z: b.entranceZ + 60, heading: Math.PI });
  hooks.stepPhysics({ seconds: 0.1, throttle: 0 });
});
await page.waitForTimeout(500);
const atBerth = await read();

console.log(JSON.stringify({ ahead, turned, atBerth, errors }, null, 2));
await browser.close();
