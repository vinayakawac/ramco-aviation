// Canonical AIRCRAFT-001 specification (product.md §2, §5) plus the derived station
// positions every part builder reads from. All values are METERS in the spec frame:
//   +X forward (nose), -X aft;  +Y PORT (left);  +Z up.
// NOTE: product.md §4 says +Y = starboard, but X-forward/Y-starboard/Z-up is a LEFT-handed
// frame and cannot exist in Three.js. Keeping X and Z as specified forces +Y = port.
// Adjudicated in CLAUDE.md §3. Starboard parts live at −Y.
// Origin: fuselage centerline at the nose tip. Nose at X=0, tail cone ends at X=-39.5.
// Z=0 is the fuselage centerline; the ground is at Z = GROUND_Z.
//
// UNIT_SCALE converts spec meters to scene units. The user asked for a smaller model
// than 39.5 units; proportions are preserved exactly because every builder goes
// through m(). Tests validate both the ratios and the scaled bounding box.

export const AIRCRAFT_ID = 'AIRCRAFT-001';

/** Scene units per meter. 0.25 → the aircraft is ~9.9 units long. */
export const UNIT_SCALE = 0.25;

/** Convert spec meters to scene units. */
export const m = (meters: number): number => meters * UNIT_SCALE;

/** Locked master dimensions (meters). Never change these to match an image. */
export const MASTER = {
  length: 39.5,
  height: 12.5,
  wingspan: 35.8,
  wheelbase: 13.0,
  fuselageDiameter: 3.95,
  seating: 180,
} as const;

export const FUSELAGE = {
  radius: MASTER.fuselageDiameter / 2, // 1.975
  /** Nose tip X (datum). */
  noseX: 0,
  /** Where the constant-section cylinder begins/ends. */
  cylinderStartX: -5.4,
  cylinderEndX: -26.5,
  /** Tail cone end (overall length). */
  tailX: -MASTER.length,
  /** Tail cone tip Z (upsweep) and radius. */
  tailTipZ: 1.35,
  tailTipRadius: 0.22,
  /** Cockpit windshield band. */
  windshieldX: [-2.6, -4.1] as const,
  /** Cabin window row: constant pitch along the cylinder, slightly above centerline. */
  window: { firstX: -6.4, lastX: -30.4, pitch: 0.53, z: 0.28, width: 0.26, height: 0.36 },
  /** Navy cheatline (fuselage accent) below the windows. */
  cheatline: { zTop: -0.05, zBottom: -0.5, startX: -3.0, endX: -34.5 },
} as const;

/** Ground plane Z in the spec frame (gear compressed, static). */
export const GROUND_Z = -(MASTER.height - 8.4); // -4.1; tail top sits at +8.4 → total 12.5

/** Winglet: height along its own span, canted outboard from vertical. */
const WINGLET = { height: 2.4, cantDeg: 20, rootChord: 1.45, tipChord: 0.55, sweepDeg: 40 } as const;

export const WING = {
  /** Root leading-edge X at the fuselage side (Y = FUSELAGE.radius). */
  rootLeadingX: -14.2,
  rootChord: 6.4,
  tipChord: 1.55,
  /** Half-span to the winglet base; the canted winglet supplies the rest of the 35.8 m span. */
  halfSpan: MASTER.wingspan / 2 - WINGLET.height * Math.sin((WINGLET.cantDeg * Math.PI) / 180),
  /** Leading-edge sweep (deg). Quarter-chord is ~25°; LE is a little more. */
  sweepDeg: 25,
  dihedralDeg: 5,
  /** Root Z at the fuselage (low wing). */
  rootZ: -1.05,
  /** Thickness / chord ratio at root and tip. */
  tcRoot: 0.13,
  tcTip: 0.10,
  winglet: WINGLET,
  /** Control surfaces as fractions of half-span (start, end) and of local chord. */
  slats: [
    { spanFrom: 0.07, spanTo: 0.34, chord: 0.14 },
    { spanFrom: 0.36, spanTo: 0.65, chord: 0.14 },
    { spanFrom: 0.67, spanTo: 0.95, chord: 0.14 },
  ],
  flaps: [
    { spanFrom: 0.05, spanTo: 0.36, chord: 0.28 }, // inner
    { spanFrom: 0.38, spanTo: 0.70, chord: 0.24 }, // outer
  ],
  spoilers: [
    { spanFrom: 0.20, spanTo: 0.32, chord: 0.12 },
    { spanFrom: 0.40, spanTo: 0.52, chord: 0.12 },
    { spanFrom: 0.54, spanTo: 0.66, chord: 0.12 },
  ],
  aileron: { spanFrom: 0.73, spanTo: 0.96, chord: 0.24 },
} as const;

export const TAIL = {
  vertical: {
    rootLeadingX: -30.2,
    rootChord: 7.6,
    tipChord: 2.6,
    /** Top of fin above centerline. Fin top = overall height above ground. */
    topZ: 8.4,
    sweepDeg: 38,
    rudderChord: 0.30,
  },
  horizontal: {
    rootLeadingX: -33.6,
    rootChord: 3.9,
    tipChord: 1.35,
    halfSpan: 6.2,
    sweepDeg: 30,
    dihedralDeg: 6,
    rootZ: 0.95,
    elevatorChord: 0.30,
  },
} as const;

export const ENGINE = {
  /** Nacelle centreline position (mirrored about Y=0). */
  y: 5.75,
  z: -2.75,
  /** Intake lip X (forward-most point of the nacelle). */
  intakeX: -11.4,
  nacelleLength: 4.3,
  nacelleRadius: 1.075, // 2.15 m diameter
  fanRadius: 0.99, // 1.98 m fan
  coreLength: 1.4,
  coreRadius: 0.55,
  pylon: { length: 2.9, thickness: 0.45 },
} as const;

export const GEAR = {
  /** Nose gear at a realistic station behind the radome; main gear = nose + wheelbase. */
  noseX: -4.7,
  mainX: -4.7 - MASTER.wheelbase, // -17.7
  mainY: 3.8,
  noseWheelRadius: 0.36,
  mainWheelRadius: 0.62,
  wheelWidth: 0.40,
  /** Strut attach Z (inside the belly / wing root). */
  noseAttachZ: -1.6,
  mainAttachZ: -1.3,
} as const;

export const DOORS = {
  /** Passenger doors 0.9 × 2.0 m, hinged on the forward edge (product.md §19). */
  width: 0.9,
  height: 2.0,
  forwardX: -5.1,
  aftX: -30.9,
  /** Two over-wing exits per side 0.7 × 1.3 m. */
  overwing: { width: 0.7, height: 1.3, xs: [-17.0, -18.35] as const },
  /** Cargo doors 3.0 × 2.4 (spec sheet) — scaled to belly curvature. */
  cargo: { width: 2.6, height: 1.2, forwardX: -8.2, aftX: -25.4, z: -1.15 },
} as const;

export const CABIN = {
  floorZ: -0.55,
  ceilingZ: 1.55,
  /** Cabin extents (aft of cockpit bulkhead to aft pressure bulkhead). */
  startX: -6.0,
  endX: -31.0,
  seatPitch: 0.76,
  seatWidth: 0.46,
  aisleWidth: 0.5,
  /** 3-3 layout → 6 abreast; rows computed in the builder to hit ~180. */
  rows: 30,
  cockpit: { startX: -1.9, endX: -5.0 },
} as const;

/** Canonical views (product.md §21). Azimuth/elevation in degrees, spec frame. */
export const CANONICAL_VIEWS = {
  // azimuth is measured from the nose toward +Y (port); +90 looks at the port side
  LEFT: { az: 90, el: 0, ortho: true },
  RIGHT: { az: -90, el: 0, ortho: true },
  FRONT: { az: 0, el: 0, ortho: true },
  REAR: { az: 180, el: 0, ortho: true },
  TOP: { az: 0, el: 89.9, ortho: true },
  BOTTOM: { az: 0, el: -89.9, ortho: true },
  FRONT_LEFT_3Q: { az: 45, el: 18, ortho: false },
  FRONT_RIGHT_3Q: { az: -45, el: 18, ortho: false },
  REAR_LEFT_3Q: { az: 135, el: 18, ortho: false },
  REAR_RIGHT_3Q: { az: -135, el: 18, ortho: false },
  BOTTOM_FRONT_LEFT: { az: 45, el: -30, ortho: false },
  BOTTOM_FRONT_RIGHT: { az: -45, el: -30, ortho: false },
  BOTTOM_REAR_LEFT: { az: 135, el: -30, ortho: false },
  BOTTOM_REAR_RIGHT: { az: -135, el: -30, ortho: false },
} as const;
export type CanonicalView = keyof typeof CANONICAL_VIEWS;

/** Stable node names (product.md §30). */
export const NODE = {
  ROOT: 'AIRCRAFT_ROOT',
  AIRCRAFT: AIRCRAFT_ID,
  FUSELAGE: 'FUSELAGE',
  COCKPIT: 'COCKPIT',
  WING_L: 'WING_L',
  WING_R: 'WING_R',
  WINGLET_L: 'WINGLET_L',
  WINGLET_R: 'WINGLET_R',
  ENGINE_L: 'ENGINE_L',
  ENGINE_R: 'ENGINE_R',
  TAIL_VERTICAL: 'TAIL_VERTICAL',
  TAIL_HORIZONTAL_L: 'TAIL_HORIZONTAL_L',
  TAIL_HORIZONTAL_R: 'TAIL_HORIZONTAL_R',
  GEAR_NOSE: 'GEAR_NOSE',
  GEAR_MAIN_L: 'GEAR_MAIN_L',
  GEAR_MAIN_R: 'GEAR_MAIN_R',
  DOORS: 'DOORS',
  LIGHTS: 'LIGHTS',
  ANTENNAS: 'ANTENNAS',
  INTERIOR: 'INTERIOR',
} as const;

/** System groups (product.md §25) with representative ATA chapter ranges. */
export const SYSTEMS = {
  AVIONICS: { label: 'Flight Deck & Avionics', ata: '22-34' },
  AIRFRAME: { label: 'Airframe & Structure', ata: '51-53' },
  WINGS: { label: 'Wings & Flight Controls', ata: '27, 57' },
  PROPULSION: { label: 'Propulsion & APU', ata: '71-80' },
  LANDING_GEAR: { label: 'Landing Gear', ata: '32' },
  CABIN: { label: 'Cabin', ata: '25' },
  DOORS: { label: 'Doors & Slides', ata: '52' },
  FUEL: { label: 'Fuel', ata: '28' },
  HYDRAULIC: { label: 'Hydraulic', ata: '29' },
  ELECTRICAL: { label: 'Electrical', ata: '24' },
  ENVIRONMENTAL: { label: 'Environmental', ata: '21' },
  CARGO: { label: 'Cargo', ata: '50' },
  LIGHTS: { label: 'Lights', ata: '33' },
  TAIL: { label: 'Empennage', ata: '55' },
} as const;
export type SystemId = keyof typeof SYSTEMS;

/** Metadata carried by every selectable mesh (product.md §39). */
export interface ComponentMeta {
  aircraft: typeof AIRCRAFT_ID;
  component: string;
  system: SystemId;
  ata: string;
  label: string;
  selectable: boolean;
}

export function meta(component: string, system: SystemId, label: string, selectable = true): ComponentMeta {
  return { aircraft: AIRCRAFT_ID, component, system, ata: SYSTEMS[system].ata, label, selectable };
}
