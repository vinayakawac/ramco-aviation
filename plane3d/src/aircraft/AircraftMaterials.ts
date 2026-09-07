// Shared material palette for AIRCRAFT-001 (product.md §13–15). One instance per
// category; every part builder reuses these. Blueprint mode swaps materials on the
// same meshes, so never bake mode-specific state into these.
import * as THREE from 'three';

export const LIVERY = {
  white: 0xf4f6f8,
  navy: 0x14306a,
  grey: 0xb9bec6,
} as const;

export interface MaterialSet {
  paintWhite: THREE.MeshPhysicalMaterial;
  /** Same look as paintWhite, separate instance so cutaway can clip only the fuselage skin. */
  paintSkin: THREE.MeshPhysicalMaterial;
  paintNavy: THREE.MeshPhysicalMaterial;
  paintGrey: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  brushedMetal: THREE.MeshStandardMaterial;
  darkMetal: THREE.MeshStandardMaterial;
  composite: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  cockpitGlass: THREE.MeshPhysicalMaterial;
  windowGlass: THREE.MeshPhysicalMaterial;
  seatFabric: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  cabinPlastic: THREE.MeshStandardMaterial;
  carpet: THREE.MeshStandardMaterial;
  displayGlass: THREE.MeshStandardMaterial;
  interiorMetal: THREE.MeshStandardMaterial;
  structuralMetal: THREE.MeshStandardMaterial;
  lightLens: THREE.MeshStandardMaterial;
  exhaustHot: THREE.MeshStandardMaterial;
  all(): THREE.Material[];
}

export function createMaterials(): MaterialSet {
  const paintWhite = new THREE.MeshPhysicalMaterial({
    color: LIVERY.white, roughness: 0.38, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.25, name: 'AircraftPaint_White',
  });
  const paintSkin = paintWhite.clone();
  paintSkin.name = 'AircraftPaint_Skin';
  const paintNavy = new THREE.MeshPhysicalMaterial({
    color: LIVERY.navy, roughness: 0.36, metalness: 0.08, clearcoat: 0.7, clearcoatRoughness: 0.2, name: 'AircraftPaint_Navy',
  });
  const paintGrey = new THREE.MeshStandardMaterial({ color: LIVERY.grey, roughness: 0.45, metalness: 0.25, name: 'AircraftPaint_Grey' });
  const metal = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.3, metalness: 0.9, name: 'Metal' });
  const brushedMetal = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.5, metalness: 0.85, name: 'BrushedMetal' });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.45, metalness: 0.8, name: 'DarkMetal' });
  const composite = new THREE.MeshStandardMaterial({ color: 0x8e9299, roughness: 0.6, metalness: 0.15, name: 'Composite' });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.95, metalness: 0.0, name: 'Rubber' });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0c1a2c, roughness: 0.08, metalness: 0.0, transmission: 0.15, transparent: true, opacity: 0.92, ior: 1.5, name: 'Glass',
  });
  const cockpitGlass = new THREE.MeshPhysicalMaterial({
    color: 0x10233a, roughness: 0.05, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.9, name: 'CockpitGlass',
  });
  const windowGlass = new THREE.MeshPhysicalMaterial({
    color: 0x0a1626, roughness: 0.1, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.1, name: 'WindowGlass',
  });
  const seatFabric = new THREE.MeshStandardMaterial({ color: 0x1f3a6e, roughness: 0.9, metalness: 0, name: 'SeatFabric' });
  const leather = new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.6, metalness: 0.05, name: 'Leather' });
  const cabinPlastic = new THREE.MeshStandardMaterial({ color: 0xe6e8ea, roughness: 0.7, metalness: 0.0, name: 'CabinPlastic' });
  const carpet = new THREE.MeshStandardMaterial({ color: 0x33415c, roughness: 1.0, metalness: 0, name: 'Carpet' });
  const displayGlass = new THREE.MeshStandardMaterial({
    color: 0x061018, emissive: 0x1c8cff, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.1, name: 'DisplayGlass',
  });
  const interiorMetal = new THREE.MeshStandardMaterial({ color: 0x9a9ea5, roughness: 0.4, metalness: 0.7, name: 'InteriorMetal' });
  const structuralMetal = new THREE.MeshStandardMaterial({ color: 0x6f7378, roughness: 0.55, metalness: 0.75, name: 'StructuralMetal' });
  const lightLens = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xfff2cc, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.0, name: 'LightLens',
  });
  const exhaustHot = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.6, metalness: 0.7, name: 'ExhaustMetal' });

  const set: MaterialSet = {
    paintWhite, paintSkin, paintNavy, paintGrey, metal, brushedMetal, darkMetal, composite, rubber, glass, cockpitGlass, windowGlass,
    seatFabric, leather, cabinPlastic, carpet, displayGlass, interiorMetal, structuralMetal, lightLens, exhaustHot,
    all() {
      return Object.values(set).filter((v): v is THREE.Material => v instanceof THREE.Material);
    },
  };
  return set;
}
