// Contract every AIRCRAFT-001 part builder implements.
// A part builder receives the shared context and returns ONE Object3D authored in the
// spec frame (+X forward, +Y starboard, +Z up) in SCENE UNITS (use ctx.m() to convert
// spec meters). Left/right pairs: build the LEFT (−Y) side and let the assembler
// mirror it with mirrorObjectY(); never author both sides by hand.
import * as THREE from 'three';
import type { MaterialSet } from '../AircraftMaterials';
import type { QualityProfile } from '../../core/quality';
import type { Logger } from '../../core/logger';

export interface PartContext {
  /** Shared material palette — never create new materials inside a part. */
  mat: MaterialSet;
  /** Quality tier; use seg(base, ctx.quality) for segment counts. */
  quality: QualityProfile;
  /** Convert spec meters → scene units. */
  m: (meters: number) => number;
  /** Scoped structured logger. */
  log: Logger;
}

export type PartBuilder = (ctx: PartContext) => THREE.Object3D;

// ---------------------------------------------------------------------------
// Declarative animation metadata. Animations are DATA on the pivot node, not
// closures, so they survive mirrorObjectY(), Object3D.clone() and GLB export.
// AircraftAnimations traverses the tree and applies channel values (0..1).
// ---------------------------------------------------------------------------

/** Animation channels (product.md §47/§49). Value 0 = stowed/closed/off, 1 = deployed/open. */
export type AnimChannel =
  | 'gear'        // 0 extended → 1 retracted (doors close in the last part)
  | 'flaps' | 'slats' | 'spoilers'
  | 'aileron' | 'elevator' | 'rudder'   // 0..1 maps to −max..+max via deg sign; 0.5 = neutral
  | 'doors' | 'cargoDoors' | 'cockpitDoor' | 'lavDoors' | 'gearDoors'
  | 'reverser'
  | 'engine'      // continuous: fan spin, 1 = one revolution
  | 'wheelSpin';  // continuous: wheel roll, 1 = one revolution

export interface HingeSpec {
  channel: AnimChannel;
  /** Rotation axis in the pivot's LOCAL frame (unit vector, spec-frame handedness). */
  axis: [number, number, number];
  /** Total rotation in degrees when the channel window goes 0 → 1 (sign = direction). */
  deg: number;
  /** Optional window of the channel value this hinge responds to (default 0..1). */
  from?: number;
  to?: number;
  /** Optional linear translation applied over the same window (scene units). */
  translate?: [number, number, number];
  /** If true the hinge is centred: channel 0.5 = rest, 0 = −deg/2, 1 = +deg/2. */
  centred?: boolean;
}

export interface SpinSpec {
  channel: AnimChannel;
  axis: [number, number, number];
}

/** Attach a hinge spec to a pivot node and record its rest transform. */
export function setHinge(pivot: THREE.Object3D, spec: HingeSpec): void {
  pivot.userData.hinge = spec;
  pivot.userData.rest = { q: pivot.quaternion.toArray(), p: pivot.position.toArray() };
}

/** Attach a continuous spin (e.g. fan) to a node. Angle = channelValue · 2π about axis. */
export function setSpin(node: THREE.Object3D, spec: SpinSpec): void {
  node.userData.spin = spec;
  node.userData.rest = { q: node.quaternion.toArray(), p: node.position.toArray() };
}

/**
 * Apply a channel value to every hinge/spin under `root`. Pure function of the
 * metadata, so it works on mirrored copies and on GLB-reloaded scenes.
 */
export function applyChannel(root: THREE.Object3D, channel: AnimChannel, value: number): void {
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  root.traverse((o) => {
    const h = o.userData.hinge as HingeSpec | undefined;
    const rest = o.userData.rest as { q: number[]; p: number[] } | undefined;
    if (h && rest && h.channel === channel) {
      const from = h.from ?? 0;
      const to = h.to ?? 1;
      const t = THREE.MathUtils.clamp((value - from) / (to - from), 0, 1);
      const ang = h.centred ? (t - 0.5) * h.deg : t * h.deg;
      axis.set(h.axis[0], h.axis[1], h.axis[2]).normalize();
      q.setFromAxisAngle(axis, ang * Math.PI / 180);
      o.quaternion.fromArray(rest.q).multiply(q);
      o.position.fromArray(rest.p);
      if (h.translate) o.position.add(new THREE.Vector3(...h.translate).multiplyScalar(t));
    }
    const s = o.userData.spin as SpinSpec | undefined;
    if (s && rest && s.channel === channel) {
      axis.set(s.axis[0], s.axis[1], s.axis[2]).normalize();
      q.setFromAxisAngle(axis, (value % 1) * Math.PI * 2);
      o.quaternion.fromArray(rest.q).multiply(q);
    }
  });
}
