# Boat Park — Build Prompt

Use mint-threejs-skills and Mint MCP to build this Three.js game.

## Game idea
A boat parking game set on open seawater beside a harbor dock. The player
pilots boats of wildly different sizes — from a tiny wooden dinghy up to an
aircraft carrier — and must cruise in and park each one cleanly inside its
marked berth along the dock.

## Core verb and objective
- Verb: steer and throttle a boat across water using **WASD** (W throttle
  forward, S reverse/brake, A/D rudder steering), with **Shift to boost**
  (1.5× top speed, 2× thrust) — fast enough to overshoot the berth.
- Handling must have real **drift**: thrust acts along the bow, but the hull
  keeps its old course until sideways slip bleeds off. Turning the wheel turns
  the bow, not the boat. Heavy ships hold the slide for hundreds of meters.
  Mooring requires the total course speed — slip included — to be below the
  docking threshold, so a broadside skid does not count as an arrival.
- Objective: bring the boat to rest inside the highlighted berth zone, aligned
  with the dock, below a docking speed threshold.
- Progression: levels advance through the fleet by size — dinghy, speedboat,
  sailboat, fishing trawler, tugboat, yacht, cruise ship, container ship,
  aircraft carrier. Bigger boats turn slower, drift longer, and need far more
  anticipation.

## Pressure, reward, fail/retry
- Pressure: momentum and inertia scale with boat size; collisions with the dock
  or buoys damage the hull; a damage meter fails the run at zero.
- Reward: par-time and clean-docking star rating per boat; next boat unlocks.
- Fail/retry: instant retry of the current boat from the approach point.

## Docking feel (required)
When the boat enters its berth and drops below docking speed, play a **soft
"floaty" settle effect**: the boat gently bobs, eases into position with a
damped spring (slight overshoot then settle), water ripples spread from the
hull, and mooring is confirmed. No hard snap.

## Course and hazards
The run in is a gated slalom roughly 3x the straight-line distance: five
numbered gates zigzag from open water to the harbour mouth, scaled to the hull
so every vessel runs the same shape. Missing a gate costs 15s against par and
the third star, but never blocks the run. Between the gates: sandbars that kill
speed, floating driftwood and crab-pot fields, and working boats crossing on
their own courses.

## Sea life
A whale cycles surfaced cruise, spout, arching dive with the fluke, then
resurfaces elsewhere. It stays a solid hazard even while submerged, with a
warning ring on the water marking where it is. A few dolphins with mixed
behaviour: fins cutting the surface, high leaps, porpoising arcs, and a pod
crossing the channel. Fish stay below the surface as dark gliding silhouettes.
Damage scales with size: whale heavy, dolphins moderate, fish a light graze.
Animation is motion paths plus a vertex-shader body flex travelling head to
tail; Mint's rigged animation sets are humanoid-only.

## Water and world
- Open seawater with animated waves (vertex displacement), subtle foam at
  hulls, and buoyancy bobbing on all boats.
- A harbor dock/pier with marked berths sized per boat class, plus channel
  buoys marking the approach lane.

## Visual direction (required)
- **No glow**: no emissive materials, no bloom post-processing.
- Colors relatively **opaque and matte** — solid painted-hull look, restrained
  saturation, physically plausible roughness. No transparency gimmicks.
- Assets generated through Mint MCP as one coherent asset pack:
  **2D preview images must be produced first and approved by the user before
  any 3D model generation starts** (review-mode asset pack).

## Menu / landing page (required)
Build the menu page with the Mint landing-page skill: a landing page whose only
job is to make the player press Play. Include:
- Hero with the game title and Play button over the real game render.
- **How to Play** section (dock the boat, avoid collisions, beat par time).
- **Controls** section (WASD keyboard chips, plus camera/restart keys).
- **Settings** (audio volume, camera mode, wave intensity/quality toggle),
  persisted in localStorage and read by the game.
- Fleet/level select showing the boat lineup from dinghy to aircraft carrier.

## Target devices
Desktop browser first (keyboard WASD). Page must remain sane at mobile widths.

## Performance constraints
60 fps on a mid-range laptop; single shared water material; Draco-capable
shared GLB loader for all Mint models.

## Required outcome
- Playable loop with meaningful decisions and feedback (approach, line up,
  shed speed, settle into berth).
- Mint MCP for production assets; integrate files locally via
  `mint-assets.json`; 2D previews approved before 3D finalization.
- Authored graphics and game UI appropriate to the quality bar — matte,
  opaque, glow-free.
- Build, browser, interaction, and canvas verification.
- Report controls, changed files, evidence, and remaining risks.
