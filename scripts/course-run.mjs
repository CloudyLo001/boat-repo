// Autopilot the slalom: steer for each gate in turn and report what the course
// records. Proves gates register, penalties accrue, and the run terminates.
import { chromium } from '@playwright/test';

const level = process.argv[2] ?? '0';
const steer = process.argv[3] !== 'straight';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });
await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(/^[0-9]+$/.test(String(n)) ? `level:${n}` : `boat:${n}`), level);
await page.waitForTimeout(6000);

const result = await page.evaluate(({ steer }) => {
  const hooks = window.__THREE_GAME_TEST_HOOKS__;
  const d = () => window.__THREE_GAME_DIAGNOSTICS__;
  const startZ = d().player.position.z;
  const gates = d().course.gates.map((g) => ({ ...g }));

  let last = null;
  for (let i = 0; i < 2400; i += 1) {
    let rudder = 0;
    if (steer) {
      const state = d().course;
      const next = gates[state.cleared + state.missed];
      if (next) {
        const pos = d().player.position;
        const heading = (d().player.headingDeg * Math.PI) / 180;
        // forward = (sin h, cos h), so the bearing to a target is atan2(dx, dz).
        const want = Math.atan2(next.x - pos.x, next.z - pos.z);
        let diff = want - heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        // Positive rudder decreases heading, hence the sign flip.
        rudder = Math.max(-1, Math.min(1, -diff * 1.5));

        // Sheer away from anything painful sitting in the path ahead.
        // A few seconds of travel, not a third of the course.
        const look = Math.max(30, d().player.speed * 3);
        for (const h of d().hazards) {
          if (h.damage <= 0 && h.kind !== 'sandbar') continue;
          const hx = h.x - pos.x;
          const hz = h.z - pos.z;
          const range = Math.hypot(hx, hz);
          if (range > look + h.radius || range < 0.001) continue;
          const bearing = Math.atan2(hx, hz);
          let off = bearing - heading;
          off = Math.atan2(Math.sin(off), Math.cos(off));
          const ahead = Math.cos(off) > 0.55;
          if (!ahead) continue;
          const urgency = 1 - range / (look + h.radius);
          rudder += Math.sign(off || 1) * urgency * 0.9;
        }
        rudder = Math.max(-1, Math.min(1, rudder));
      }
    }
    // Brake for the harbour like a player would, instead of arriving at 30 m/s.
    const berth = d().berth;
    const toBerth = d().player.position.z - berth.entranceZ;
    const speed = d().player.speed;
    let throttle = 0.85;
    if (toBerth < 220) throttle = speed > 4 ? -1 : 0.15;
    if (toBerth < 60) throttle = speed > 1.5 ? -1 : 0;
    last = hooks.stepPhysics({ seconds: 0.05, throttle, rudder });
  }

  const c = d().course;
  return {
    startZ: +startZ.toFixed(0),
    endZ: +last.z.toFixed(0),
    cleared: c.cleared,
    missed: c.missed,
    total: c.total,
    penaltySeconds: c.penaltySeconds,
    damage: +d().damage.toFixed(0),
    gateResults: d().course.gates.map((g) => g.cleared),
  };
}, { steer });
console.log(JSON.stringify({ level, steer, ...result, errors }, null, 2));
await browser.close();
