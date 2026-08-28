import * as THREE from 'three';
import { BOOST_ACCEL, BOOST_SPEED, type BoatSpec } from '../game/fleet';
import type { Water } from '../world/Water';
import { disposeObject3D } from '../utils/dispose';
import { seatHullOnWater } from '../world/modelSeating';

/**
 * Player vessel. Momentum is a world-space velocity vector, not a scalar along
 * the bow: thrust pushes along the heading, but the hull keeps its old course
 * until sideways slip bleeds off at `lateralGrip`. That gap is the drift.
 * Visuals start as a blockout hull and are replaced by the Mint-generated GLB.
 */
export class Boat {
  readonly group = new THREE.Group();
  /** World-space velocity on the water plane (x, z as Vector2 x, y). */
  readonly velocity = new THREE.Vector2();
  heading = Math.PI;
  /** Signed component of velocity along the bow, for HUD and rudder authority. */
  speed = 0;
  private visual: THREE.Object3D;
  private bobTime = 0;
  /** Smoothed hull attitude. The wave samples are the target, not the pose. */
  private heave = 0;
  private pitch = 0;
  private roll = 0;
  /** Along-bow acceleration and yaw rate from the last physics step, for trim. */
  private surge = 0;
  private yawRate = 0;

  constructor(readonly spec: BoatSpec) {
    this.visual = this.createBlockoutHull();
    this.group.add(this.visual);
  }

  /** Swap the blockout for a generated model, scaled to the spec length. */
  setModel(model: THREE.Object3D): void {
    seatHullOnWater(model, this.spec);
    this.group.remove(this.visual);
    disposeObject3D(this.visual);
    this.visual = model;
    this.group.add(model);
  }

  /** False while the blockout stand-in is still showing. */
  get hasGeneratedModel(): boolean {
    return !this.visual.name.startsWith('blockout-');
  }

  get forward(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  /** Hull footprint corners on the water plane, for collision tests. */
  hullCorners(target: THREE.Vector3[]): THREE.Vector3[] {
    const halfL = this.spec.length / 2;
    const halfB = this.spec.beam / 2;
    const sin = Math.sin(this.heading);
    const cos = Math.cos(this.heading);
    const locals = [
      [0, halfL],
      [halfB, halfL * 0.55],
      [-halfB, halfL * 0.55],
      [halfB, -halfL],
      [-halfB, -halfL],
      [0, -halfL],
    ];
    for (let i = 0; i < locals.length; i += 1) {
      const [lx, lz] = locals[i];
      target[i].set(
        this.group.position.x + lx * cos + lz * sin,
        0,
        this.group.position.z - lx * sin + lz * cos,
      );
    }
    return target;
  }

  /** Magnitude of travel over the water, including sideways slip. */
  get velocityMagnitude(): number {
    return this.velocity.length();
  }

  /** How far the hull's actual course differs from where the bow points (m/s). */
  get lateralSlip(): number {
    const sin = Math.sin(this.heading);
    const cos = Math.cos(this.heading);
    return Math.abs(this.velocity.x * cos - this.velocity.y * sin);
  }

  stop(): void {
    this.velocity.set(0, 0);
    this.speed = 0;
    this.resetAttitude();
  }

  /** Scale all momentum, e.g. when scraping a buoy. */
  dampen(factor: number): void {
    this.velocity.multiplyScalar(factor);
    this.speed *= factor;
  }

  /** Bounce off the dock face: reverse and shed the component across it. */
  bounceOffDock(restitution: number): void {
    this.velocity.y *= -restitution;
    this.velocity.x *= restitution;
    this.syncSpeedFromVelocity();
  }

  /** Bounce off a surface whose outward normal is (nx, nz). */
  reflect(nx: number, nz: number, restitution: number): void {
    const into = this.velocity.x * nx + this.velocity.y * nz;
    if (into >= 0) return;
    this.velocity.x -= into * (1 + restitution) * nx;
    this.velocity.y -= into * (1 + restitution) * nz;
    this.syncSpeedFromVelocity();
  }

  setVelocity(x: number, z: number): void {
    this.velocity.set(x, z);
    this.syncSpeedFromVelocity();
  }

  updatePhysics(delta: number, throttle: number, rudder: number, boost = false): void {
    const spec = this.spec;
    const sin = Math.sin(this.heading);
    const cos = Math.cos(this.heading);

    // Thrust acts along the bow only.
    const accel = (throttle >= 0 ? spec.accel : spec.reverseAccel) * (boost ? BOOST_ACCEL : 1);
    this.velocity.x += sin * throttle * accel * delta;
    this.velocity.y += cos * throttle * accel * delta;

    // Split the course into along-bow and across-bow components. Water resists
    // the two very differently, and the across-bow one is what makes a heavy
    // hull wash sideways through a turn.
    let along = this.velocity.x * sin + this.velocity.y * cos;
    let across = this.velocity.x * cos - this.velocity.y * sin;
    along *= Math.exp(-spec.drag * delta);
    across *= Math.exp(-spec.lateralGrip * delta);

    const topSpeed = spec.maxSpeed * (boost ? BOOST_SPEED : 1);
    along = THREE.MathUtils.clamp(along, -topSpeed * 0.45, topSpeed);

    this.velocity.set(along * sin + across * cos, along * cos - across * sin);
    this.surge = delta > 0 ? (along - this.speed) / delta : 0;
    this.speed = along;

    // Rudder only bites with way on; reverses with sternway like a real hull.
    const way = THREE.MathUtils.clamp(along / (spec.maxSpeed * 0.35), -1, 1);
    this.yawRate = -rudder * spec.turnRate * way;
    this.heading += this.yawRate * delta;

    this.group.position.x += this.velocity.x * delta;
    this.group.position.z += this.velocity.y * delta;
  }

  private syncSpeedFromVelocity(): void {
    this.speed = this.velocity.x * Math.sin(this.heading) + this.velocity.y * Math.cos(this.heading);
  }

  /** Ride the rendered water surface: height plus wave-driven pitch and roll. */
  updateBuoyancy(delta: number, time: number, water: Water, settleFactor = 1): void {
    this.bobTime += delta;
    const spec = this.spec;
    const { x, z } = this.group.position;
    const sin = Math.sin(this.heading);
    const cos = Math.cos(this.heading);
    const halfL = spec.length * 0.38;
    const halfB = spec.beam * 0.45;

    const bow = water.heightAt(x + sin * halfL, z + cos * halfL, time);
    const stern = water.heightAt(x - sin * halfL, z - cos * halfL, time);
    const port = water.heightAt(x - cos * halfB, z + sin * halfB, time);
    const starboard = water.heightAt(x + cos * halfB, z - sin * halfB, time);

    // Big hulls average the swell out; small boats feel every ripple. Planing
    // hulls skim the tops rather than tracing them, so the faster the boat
    // runs the less of the swell it takes on.
    const pace = THREE.MathUtils.clamp(Math.abs(this.speed) / spec.maxSpeed, 0, 1);
    const response =
      THREE.MathUtils.clamp(9 / spec.length, 0.08, 1) * settleFactor * (1 - 0.5 * pace);
    const center = (bow + stern + port + starboard) / 4;

    // Throttle lifts the bow and turns lay the hull over. Both are what a boat
    // under way actually does, and both smooth the moment thrust or rudder
    // changes instead of letting it read as a step.
    const trim = -THREE.MathUtils.clamp(this.surge / spec.accel, -1, 1) * 0.05;
    const bank = -THREE.MathUtils.clamp(this.yawRate * this.speed * 0.02, -1, 1) * 0.16;

    // Chase the wave-following pose rather than snapping to it: sampling a
    // moving hull against a moving surface is noisy, and the noise is what
    // reads as judder at speed.
    const follow = 1 - Math.exp(-delta * 7);
    const attitude = 1 - Math.exp(-delta * 5);
    this.heave += (center * response - this.heave) * follow;
    this.pitch += (Math.atan2(stern - bow, halfL * 2) * response + trim - this.pitch) * attitude;
    this.roll += (Math.atan2(starboard - port, halfB * 2) * response + bank - this.roll) * attitude;

    this.group.position.y = this.heave;
    this.group.rotation.y = this.heading;
    this.group.rotation.x = this.pitch;
    this.group.rotation.z = this.roll;
  }

  /** Drop the smoothed attitude so a respawned hull does not ease in from the last pose. */
  resetAttitude(): void {
    this.heave = 0;
    this.pitch = 0;
    this.roll = 0;
    this.surge = 0;
    this.yawRate = 0;
  }

  dispose(): void {
    disposeObject3D(this.group);
  }

  private createBlockoutHull(): THREE.Object3D {
    const spec = this.spec;
    const hull = new THREE.Group();
    hull.name = `blockout-${spec.id}`;

    const hullMaterial = new THREE.MeshStandardMaterial({
      color: spec.hullColor,
      roughness: 0.72,
      metalness: 0.08,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: spec.accentColor,
      roughness: 0.66,
      metalness: 0.06,
    });

    const hullHeight = Math.max(0.5, spec.length * 0.07);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(spec.beam, hullHeight, spec.length * 0.82),
      hullMaterial,
    );
    body.position.y = hullHeight * 0.35;
    hull.add(body);

    // Tapered bow wedge so the heading reads at a glance.
    const bow = new THREE.Mesh(new THREE.CylinderGeometry(0, spec.beam * 0.52, spec.length * 0.2, 4), hullMaterial);
    bow.rotation.x = -Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, hullHeight * 0.35, spec.length * 0.5);
    hull.add(bow);

    const cabinHeight = Math.max(0.4, spec.length * 0.06);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(spec.beam * 0.6, cabinHeight, spec.length * 0.3),
      accentMaterial,
    );
    cabin.position.set(0, hullHeight * 0.7 + cabinHeight / 2, -spec.length * 0.12);
    hull.add(cabin);

    hull.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return hull;
  }
}
