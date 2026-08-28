// Audio must load, unlock on a gesture, start the beds, and obey mute.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// Every sound file should fetch and decode.
const loaded = await page.evaluate(async () => {
  const keys = ['sfx-engine','sfx-water','sfx-ambience','sfx-gate-clear','sfx-gate-miss','sfx-impact','sfx-moored','sfx-fail','sfx-whale','sfx-boost'];
  const reg = await (await fetch('/mint-assets.json')).json().catch(() => null);
  const results = {};
  for (const k of keys) {
    const p = reg?.assets?.[k]?.artifacts?.audio_file?.localPath;
    if (!p) { results[k] = 'missing-in-registry'; continue; }
    const url = '/' + p.replace(/^public\//, '');
    const r = await fetch(url);
    results[k] = r.ok ? `ok ${Math.round(Number(r.headers.get('content-length') || 0) / 1024)}kb` : `http ${r.status}`;
  }
  return results;
});

await page.click('#play-button');
await page.waitForTimeout(3000);

const state = await page.evaluate(() => ({
  muted: document.querySelector('#mute-button').classList.contains('is-muted'),
  pressed: document.querySelector('#mute-button').getAttribute('aria-pressed'),
  visible: !!document.querySelector('#mute-button').offsetParent,
}));

await page.click('#mute-button');
await page.waitForTimeout(300);
const afterClick = await page.evaluate(() => ({
  muted: document.querySelector('#mute-button').classList.contains('is-muted'),
  stored: JSON.parse(localStorage.getItem('boatpark-settings') || '{}').muted,
}));

await page.keyboard.press('m');
await page.waitForTimeout(300);
const afterKey = await page.evaluate(() => ({
  muted: document.querySelector('#mute-button').classList.contains('is-muted'),
  stored: JSON.parse(localStorage.getItem('boatpark-settings') || '{}').muted,
}));

console.log(JSON.stringify({ loaded, state, afterClick, afterKey, errors }, null, 2));
await browser.close();
