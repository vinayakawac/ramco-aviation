/**
 * materials.js — a warm studio palette.
 *
 * This build shoots the aircraft as a product, not as a machine in a place: one warm
 * neutral skin across the whole airframe, so the lighting does the modelling and the
 * object reads as a single form rather than a two-tone toy. Nothing is pure black —
 * the darkest value stays warm, or it punches a hole in the void.
 */

import * as THREE from 'three';

export const PALETTE = {
  white: 0xffffff,
  tint: 0xf3f7f8,
  tint2: 0xe6eef0,
  ink: 0x0e1a1f,
  line: 0xdce4e6,
  signal: 0x0f5468,
  signal2: 0x1a7d97,
  deep: 0x082c37,
  deep2: 0x0c3f4e,
  flag: 0xb3502a,
  skin: 0xdcd2c4,
  skin2: 0xd2c7b8,
  panelLine: 0x4c4238,
  hair: 0xa3988a,
  tarmac: 0x3f3429,
  concrete: 0x6a6154,
  grass: 0x4a5a49,
};

const cache = new Map();

/** Memoised material factory — keeps the draw-call budget honest. */
function make(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

export const mat = {
  /** Painted aircraft skin. */
  skin: () =>
    make('skin', () =>
      new THREE.MeshStandardMaterial({
        color: PALETTE.skin,
        roughness: 0.36,
        metalness: 0.18,
      })
    ),

  /** Secondary skin — wings, tail, control surfaces. */
  skin2: () =>
    make('skin2', () =>
      new THREE.MeshStandardMaterial({ color: PALETTE.skin2, roughness: 0.4, metalness: 0.16 })
    ),

  /** Dark structural detail: panel lines, radome, gear, engine cores. */
  dark: () =>
    make('dark', () =>
      new THREE.MeshStandardMaterial({ color: PALETTE.panelLine, roughness: 0.55, metalness: 0.3 })
    ),

  rubber: () =>
    make('rubber', () => new THREE.MeshStandardMaterial({ color: 0x2a231d, roughness: 0.9 })),

  metal: () =>
    make('metal', () =>
      new THREE.MeshStandardMaterial({ color: 0xa2968a, roughness: 0.3, metalness: 0.7 })
    ),

  glass: () =>
    make('glass', () =>
      new THREE.MeshStandardMaterial({
        color: 0x2e2620,
        roughness: 0.12,
        metalness: 0.3,
        transparent: true,
        opacity: 0.9,
      })
    ),

  concrete: () =>
    make('concrete', () =>
      new THREE.MeshStandardMaterial({ color: PALETTE.concrete, roughness: 0.96 })
    ),

  tarmac: () =>
    make('tarmac', () => new THREE.MeshStandardMaterial({ color: PALETTE.tarmac, roughness: 0.98 })),

  /** Hangar structure. */
  structure: () =>
    make('structure', () =>
      new THREE.MeshStandardMaterial({ color: 0x21313a, roughness: 0.8, metalness: 0.25 })
    ),

  crate: () =>
    make('crate', () => new THREE.MeshStandardMaterial({ color: 0xbcc8cc, roughness: 0.75 })),

  /** Emissive annotation line, signal blue — the 3D equivalent of the source's dashed SVG. */
  annotation: (color = PALETTE.signal2, opacity = 0.9) =>
    make(`ann-${color}-${opacity}`, () =>
      new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    ),

  /** Translucent annotation fill. */
  annotationFill: (color = PALETTE.signal2, opacity = 0.12) =>
    make(`annf-${color}-${opacity}`, () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    ),

  /** Self-lit marker — runway lights, node boxes, EFB screen. */
  glow: (color = PALETTE.signal2, intensity = 1) =>
    make(`glow-${color}-${intensity}`, () =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: intensity })
    ),

  paint: (color = 0xe8eef0) =>
    make(`paint-${color}`, () =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
    ),
};

/** Dispose everything the factory handed out (called on teardown). */
export function disposeMaterials() {
  cache.forEach((m) => m.dispose());
  cache.clear();
}
