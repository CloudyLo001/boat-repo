// Park the camera next to the whale and sample the cycle over real time,
// capturing a frame in each phase so the animation can actually be seen.
import { chromium } from '@playwright/test';

const boat = process.argv[2] ?? 'trawler';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });
await page.evaluate((b) => window.__THREE_GAME_TEST_HOOKS__.setState(`boat:${b}`), boat);
await page.waitForTimeout(6000);

const seen = new Set();
const samples = [];
for (let i = 0; i < 26; i += 1) {
  // Re-anchor the boat beside the whale each sample so the chase camera holds it.
  await page.evaluate(() => {
    const w = window.__THREE_GAME_TEST_HOOKS__.wildlife().whale;
    if (!w) return;
    window.__THREE_GAME_TEST_HOOKS__.placeBoat({ x: w.x, z: w.z + 40, heading: Math.PI });
  });
  await page.waitForTimeout(1400);
  const snap = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.wildlife());
  samples.push({ phase: snap.whale?.phase, y: +(snap.whale?.y ?? 0).toFixed(2), visible: snap.whale?.visible });
  if (snap.whale && !seen.has(snap.whale.phase)) {
    seen.add(snap.whale.phase);
    await page.screenshot({ path: `artifacts/whale-${snap.whale.phase}.png` });
  }
}

const dolphins = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.wildlife().dolphins);
console.log(JSON.stringify({
  phasesSeen: [...seen],
  whaleYRange: [Math.min(...samples.map((s) => s.y)), Math.max(...samples.map((s) => s.y))],
  dolphinBehaviours: dolphins.map((d) => `${d.behaviour}:${d.y.toFixed(1)}`),
  errors,
}, null, 2));
await browser.close();
