// The picker must open from its button and from B, list every boat, switch the
// vessel on click, and close cleanly without leaking Escape to the menu.
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Every fleet card should be selectable from the menu now.
const disabledCards = await page.$$eval('#fleet-grid .fleet-card', (els) => els.filter((e) => e.disabled).length);

await page.click('#play-button');
await page.waitForTimeout(2500);
const buttonVisible = await page.isVisible('#boat-picker-button');

await page.click('#boat-picker-button');
await page.waitForTimeout(400);
const names = await page.$$eval('#boat-picker-grid .picker-name', (els) => els.map((e) => e.textContent));

// Escape should close the picker, not bounce to the menu.
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const closedByEsc = await page.evaluate(() => document.querySelector('#boat-picker').hidden);
const stillPlaying = await page.evaluate(() => document.querySelector('#menu').hidden);

// B reopens it; picking a boat switches vessel.
await page.keyboard.press('b');
await page.waitForTimeout(400);
const openedByKey = await page.evaluate(() => !document.querySelector('#boat-picker').hidden);
await page.click('#boat-picker-grid .picker-card:nth-child(9)');
await page.waitForTimeout(2500);
const hudLevel = await page.textContent('#hud-level');
const pickerClosed = await page.evaluate(() => document.querySelector('#boat-picker').hidden);
const speedCap = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.stepPhysics({ seconds: 90, throttle: 1 }).speed);

console.log(JSON.stringify({
  disabledFleetCards: disabledCards,
  buttonVisible,
  boatsListed: names.length,
  names,
  closedByEsc,
  stayedInGame: stillPlaying,
  openedByKey,
  pickerClosed,
  hudLevel,
  topSpeedMs: +speedCap.toFixed(1),
  errors,
}, null, 2));
await browser.close();
