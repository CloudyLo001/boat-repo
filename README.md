# Boat Park

Park nine boats — from a three-metre dinghy to a three-hundred-metre aircraft
carrier — in a working marina, after running a gated slalom past whales,
sandbars and crossing traffic.

Built with Three.js, TypeScript and Vite. Models and sound are generated
through Mint.

## Play

- **W / S** — throttle and reverse
- **A / D** — rudder
- **Shift** — accelerate (1.5× top speed)
- **B** — change boat
- **M** — mute
- **R** — retry from the last gate
- **N** — next vessel after mooring
- **Esc** — menu

Follow the compass at the top of the screen: it points at the next gate, then
at your berth. Turning the wheel turns the bow, not the boat — heavy hulls keep
sliding along their old course, so start every turn early.

## Develop

```bash
npm install
npm run dev      # http://127.0.0.1:5188
npm run build
```

Note: Vite 8 needs Node 20.19+ or 22.12+.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. The workflow sets `VITE_BASE` from the
repository name, because Pages serves the site from `/<repo>/` rather than the
domain root.

## Layout

| Path | What's in it |
| --- | --- |
| `src/game/` | Game loop, fleet definitions, settings |
| `src/entities/` | The player's boat: drift physics and buoyancy |
| `src/world/` | Marina, slalom course, wildlife, hazards, water |
| `src/systems/` | HUD and audio mixer |
| `src/ui/` | Menu, fleet order, boat picker |
| `scripts/` | Headless QA probes (need `npm run dev` running) |
| `mint-assets.json` | Registry of every generated model and sound |
