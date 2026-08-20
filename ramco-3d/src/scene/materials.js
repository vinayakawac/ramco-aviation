/**
 * materials.js — the shared palette, lifted from the source page's `:root` block.
 *
 * The source draws everything as line art in signal blue with `--flag` orange reserved
 * for risk. The 3D scene keeps that discipline: blue means "Ramco covers this",
 * orange means "this is where the money leaks".
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
  skin: 0xdee6e8,
  skin2: 0xcbd6da,
  panelLine: 0x33454b,
  hair: 0xa3b0b5,
  tarmac: 0x3f4a51,
  concrete: 0x6a747a,
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
        roughness: 0.42,
        metalness: 0.32,
        envMapIntensity: 0.9,
      })
    ),

  /** Secondary skin — wings, tail, control surfaces. */
  skin2: () =>
    make('skin2', () =>
      new THREE.MeshStandardMaterial({ color: PALETTE.skin2, roughness: 0.48, metalness: 0.3 })
    ),

  /** Dark structural detail: panel lines, radome, gear, engine cores. */
  dark: () =>
    make('dark', () =>
      new THREE.MeshStandardMaterial({ color: PALETTE.panelLine, roughness: 0.62, metalness: 0.45 })
    ),

  rubber: () =>
    make('rubber', () => new THREE.MeshStandardMaterial({ color: 0x1c2226, roughness: 0.95 })),

  metal: () =>
    make('metal', () =>
      new THREE.MeshStandardMaterial({ color: 0x9aa8ad, roughness: 0.35, metalness: 0.8 })
    ),

  glass: () =>
    make('glass', () =>
      new THREE.MeshStandardMaterial({
        color: 0x0b2a33,
        roughness: 0.08,
        metalness: 0.2,
        transparent: true,
        opacity: 0.82,
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
