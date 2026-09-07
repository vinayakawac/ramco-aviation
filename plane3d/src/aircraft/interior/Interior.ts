// Cabin interior for AIRCRAFT-001 (product.md §10-12). Authored directly in the spec
// frame: THREE.Vector3(x,y,z) on every mesh IS (specX forward, specY starboard, specZ
// up) — no axis remapping here, AIRCRAFT_ROOT applies the single -90deg-about-X spin
// into Three's Y-up world later (matches Engine.ts / LandingGear.ts convention).
// BoxGeometry(dx,dy,dz) likewise gives extents directly along (specX, specY, specZ).
//
// Everything stays inside a constant-radius cylinder of FUSELAGE.radius around the X
// axis, spanning CABIN.endX .. CABIN.cockpit.startX (the task's simplified containment
// volume — the real fuselage tapers near the nose, but the interior module treats the
// bound as a constant cylinder per spec instructions). Passenger seats are instanced
// (3 InstancedMesh: cushion, back, leg-frame) to keep the 180-seat cabin cheap;
// everything else is a handful of low-poly static meshes.
import * as THREE from 'three';
import { CABIN, DOORS, FUSELAGE, MASTER, NODE, meta, type ComponentMeta } from '../AircraftSpec';
import { finishMesh, pivotGroup, countTriangles, DEG } from '../../core/geometry';
import { seg } from '../../core/quality';
import { setHinge, type PartContext, type PartBuilder } from '../parts/PartContext';

const R = FUSELAGE.radius;

/** Cast a ComponentMeta into the loose bag finishMesh/userData expects (matches the
 * pattern already used by LandingGear.ts / Engine.ts for the same structural gap). */
const um = (cm: ComponentMeta): Record<string, unknown> => ({ ...cm });

/** Half-width of the fuselage chord at a given Z (meters), shrunk by a safety margin
 * so panels that hug the skin never poke through the FUSELAGE.radius test bound. */
function chordHalfWidth(z: number, margin = 0.96): number {
  const r2 = R * R - z * z;
  return r2 > 0 ? Math.sqrt(r2) * margin : 0;
}

/** Attach a mesh with metadata, shadow policy (no cast, receive only — interior
 * self-shadowing is too costly per the task brief) and the stable node name. */
function mk(mesh: THREE.Mesh, name: string, cm: ComponentMeta): THREE.Mesh {
  finishMesh(mesh, name, um(cm));
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function group(name: string, cm: ComponentMeta): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.userData = um(cm);
  return g;
}

/** A box mesh sized (dxM, dyM, dzM) spec-meters, placed at spec-meter (x,y,z). */
function box(ctx: PartContext, dxM: number, dyM: number, dzM: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const { m } = ctx;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(m(dxM), m(dyM), m(dzM)), mat);
  mesh.position.set(m(x), m(y), m(z));
  return mesh;
}

/** A curved shell strip around the X axis, built as a partial cylinder then remapped
 * so its axis is +X and its circular cross-section lies in the Y-Z plane (matching the
 * fuselage cross-section: y = r*cos(theta), z = r*sin(theta), verified empirically). */
function shellAroundX(radius: number, length: number, thetaStart: number, thetaLength: number, radialSeg: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(radius, radius, length, radialSeg, 1, true, thetaStart, thetaLength);
  g.rotateZ(Math.PI / 2); // default cylinder axis Y -> +X; circle (x,z) -> (y,z)
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// FLIGHT_DECK
// ---------------------------------------------------------------------------
function buildFlightDeck(ctx: PartContext): THREE.Group {
  const { m, mat } = ctx;
  const sys = 'AVIONICS' as const;
  const fd = group('FLIGHT_DECK', meta('FLIGHT_DECK', sys, 'Flight Deck'));

  const startX = CABIN.cockpit.startX; // -1.9 (forward, toward the nose)
  const endX = CABIN.cockpit.endX; // -5.0 (aft, toward the cabin bulkhead)
  const panelX = startX - 0.4; // ~-2.3, forward instrument console
  const seatX = endX + 1.4; // ~-3.6, where the pilots sit

  // FLOOR
  const floorHalf = chordHalfWidth(CABIN.floorZ);
  const floorLen = Math.abs(endX - startX);
  const floor = box(ctx, floorLen, floorHalf * 2, 0.05, mat.cabinPlastic, (startX + endX) / 2, 0, CABIN.floorZ);
  fd.add(mk(floor, 'FLOOR', meta('FLOOR', sys, 'Flight Deck Floor')));

  // INSTRUMENT_PANEL (angled box facing the pilots aft of it)
  const panelH = 0.55;
  const panelZ = CABIN.floorZ + 1.05;
  const panel = box(ctx, 0.14, 1.7, panelH, mat.leather, panelX, 0, panelZ);
  panel.rotation.y = -18 * DEG; // top leans aft toward the pilots (about spec Y, lateral axis)
  fd.add(mk(panel, 'INSTRUMENT_PANEL', meta('INSTRUMENT_PANEL', sys, 'Instrument Panel')));

  // GLARESHIELD — trim bar along the top edge of the panel
  const glareshield = box(ctx, 0.18, 1.75, 0.08, mat.cabinPlastic, panelX - 0.06, 0, panelZ + panelH / 2 + 0.04);
  fd.add(mk(glareshield, 'GLARESHIELD', meta('GLARESHIELD', sys, 'Glareshield')));

  // 5 DISPLAYS on the aft (pilot-facing) face of the panel: PFD, ND, ECAM, ND, PFD
  const labels = ['PFD_L', 'ND_L', 'ECAM', 'ND_R', 'PFD_R'];
  const ys = [-0.62, -0.31, 0, 0.31, 0.62];
  labels.forEach((label, i) => {
    const disp = box(ctx, 0.02, 0.26, 0.24, mat.displayGlass, panelX - 0.075, ys[i], panelZ + 0.02);
    fd.add(mk(disp, `DISPLAY_${label}`, meta(`DISPLAY_${label}`, sys, `${label} Display`)));
  });

  // OVERHEAD_PANEL near the cockpit ceiling
  const overhead = box(ctx, 0.5, 1.2, 0.08, mat.cabinPlastic, panelX - 0.15, 0, 1.15);
  fd.add(mk(overhead, 'OVERHEAD_PANEL', meta('OVERHEAD_PANEL', sys, 'Overhead Panel')));

  // CENTER_PEDESTAL with two THRUST_LEVER cylinders
  const pedestalX0 = panelX - 0.35;
  const pedestalX1 = seatX + 0.1;
  const pedestal = box(ctx, Math.abs(pedestalX1 - pedestalX0), 0.34, 0.55, mat.cabinPlastic, (pedestalX0 + pedestalX1) / 2, 0, CABIN.floorZ + 0.55);
  fd.add(mk(pedestal, 'CENTER_PEDESTAL', meta('CENTER_PEDESTAL', sys, 'Center Pedestal')));

  [-0.08, 0.08].forEach((y, i) => {
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(m(0.02), m(0.02), m(0.18), seg(6, ctx.quality)), mat.darkMetal);
    // Cylinder's own axis is spec Y (lateral); rotate ~90deg about X so it stands mostly
    // upright (spec Z), then bias by -25deg for a forward-raked lever look.
    lever.rotation.x = 65 * DEG;
    lever.position.set(m(pedestalX0 + 0.15), m(y), m(CABIN.floorZ + 0.55 + 0.28));
    fd.add(mk(lever, `THRUST_LEVER_${i + 1}`, meta(`THRUST_LEVER_${i + 1}`, sys, `Thrust Lever ${i + 1}`)));
  });

  // PILOT_SEAT_L / _R at y = +/-0.55
  for (const side of [-1, 1] as const) {
    const seatName = side > 0 ? 'PILOT_SEAT_L' : 'PILOT_SEAT_R';
    const seatGrp = group(seatName, meta(seatName, sys, side > 0 ? 'Captain Seat' : 'First Officer Seat'));
    seatGrp.position.set(m(seatX), m(side * 0.55), 0);

    const base = new THREE.Mesh(new THREE.BoxGeometry(m(0.46), m(0.46), m(0.12)), mat.leather);
    base.position.set(0, 0, m(CABIN.floorZ + 0.28));
    seatGrp.add(mk(base, `${seatName}_BASE`, meta(`${seatName}_BASE`, sys, 'Seat Base')));

    const back = new THREE.Mesh(new THREE.BoxGeometry(m(0.08), m(0.44), m(0.55)), mat.leather);
    back.position.set(m(-0.19), 0, m(CABIN.floorZ + 0.62));
    seatGrp.add(mk(back, `${seatName}_BACK`, meta(`${seatName}_BACK`, sys, 'Seat Back')));

    const headrest = new THREE.Mesh(new THREE.BoxGeometry(m(0.1), m(0.32), m(0.2)), mat.leather);
    headrest.position.set(m(-0.2), 0, m(CABIN.floorZ + 0.95));
    seatGrp.add(mk(headrest, `${seatName}_HEADREST`, meta(`${seatName}_HEADREST`, sys, 'Headrest')));

    fd.add(seatGrp);

    // SIDE_STICK on the outboard console
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(m(0.018), m(0.018), m(0.16), seg(6, ctx.quality)), mat.darkMetal);
    stick.rotation.x = 75 * DEG; // stand mostly upright with a slight outboard lean
    stick.position.set(m(seatX + 0.1), m(side * 0.9), m(CABIN.floorZ + 0.55));
    const stickName = side > 0 ? 'SIDE_STICK_L' : 'SIDE_STICK_R';
    fd.add(mk(stick, stickName, meta(stickName, sys, 'Side Stick')));
  }

  // RUDDER_PEDALS forward, under the panel
  const pedals = box(ctx, 0.3, 0.7, 0.1, mat.darkMetal, panelX + 0.25, 0, CABIN.floorZ + 0.1);
  fd.add(mk(pedals, 'RUDDER_PEDALS', meta('RUDDER_PEDALS', sys, 'Rudder Pedals')));

  // COCKPIT_DOOR — pivot at CABIN.cockpit.endX, hinged on one edge, swings in yaw (Z).
  // Sized off DOORS (the passenger-door spec) scaled down, rather than an invented figure.
  const doorW = DOORS.width * 0.72;
  const doorH = DOORS.height * 0.82;
  const hingeY = -doorW / 2;
  const pivot = pivotGroup('COCKPIT_DOOR', m(endX), m(hingeY), m(CABIN.floorZ + doorH / 2));
  pivot.userData = um(meta('COCKPIT_DOOR', sys, 'Cockpit Door'));
  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(m(0.05), m(doorW), m(doorH)), mat.cabinPlastic);
  doorMesh.position.set(0, m(doorW / 2), 0);
  pivot.add(mk(doorMesh, 'COCKPIT_DOOR_LEAF', meta('COCKPIT_DOOR', sys, 'Cockpit Door')));
  fd.add(pivot);
  // cockpitDoor channel: 0 = closed, 1 = open (swept about the vertical hinge, +Z).
  setHinge(pivot, { channel: 'cockpitDoor', axis: [0, 0, 1], deg: 100 });

  return fd;
}

// ---------------------------------------------------------------------------
// PASSENGER_SEATS (instanced)
// ---------------------------------------------------------------------------
function buildPassengerSeats(ctx: PartContext): THREE.Group {
  const { m, mat, log } = ctx;
  const sys = 'CABIN' as const;
  const grp = group('PASSENGER_SEATS', meta('PASSENGER_SEATS', sys, 'Passenger Seats'));

  let seatWidth: number = CABIN.seatWidth;
  const outerY = CABIN.aisleWidth / 2 + seatWidth / 2 + 2 * seatWidth; // +/-1.40 nominal
  const maxHalf = chordHalfWidth(CABIN.floorZ);
  if (outerY + seatWidth / 2 > maxHalf) {
    // Defensive: shrink seat width if the outer seat would poke through the sidewall.
    const shrunk = (maxHalf - CABIN.aisleWidth / 2) / 2.5;
    log.warn('Outer passenger seat exceeds cabin chord; shrinking seat width', { outerY, maxHalf, from: seatWidth, to: shrunk });
    seatWidth = shrunk;
  }

  const rowStartX = CABIN.startX - 1.6; // aft of the forward galley
  const rows = CABIN.rows; // 30
  // Canonical 6-abreast Y offsets: 3 seats port (A/B/C), 3 seats starboard (D/E/F).
  const ys: number[] = [];
  for (let k = 0; k < 3; k++) ys.push(-(CABIN.aisleWidth / 2 + seatWidth / 2 + k * seatWidth));
  for (let k = 0; k < 3; k++) ys.push(CABIN.aisleWidth / 2 + seatWidth / 2 + k * seatWidth);

  const totalSeats = rows * ys.length;
  if (totalSeats !== MASTER.seating) {
    log.error('Passenger seat count does not match MASTER.seating', { totalSeats, expected: MASTER.seating });
  }

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const cushion = new THREE.InstancedMesh(unitBox, mat.seatFabric, totalSeats);
  const back = new THREE.InstancedMesh(unitBox, mat.seatFabric, totalSeats);
  const legs = new THREE.InstancedMesh(unitBox, mat.interiorMetal, totalSeats);
  cushion.name = 'SEAT_CUSHION';
  back.name = 'SEAT_BACK';
  legs.name = 'SEAT_LEG_FRAME';
  cushion.userData = um(meta('SEAT_CUSHION', sys, 'Seat Cushions'));
  back.userData = um(meta('SEAT_BACK', sys, 'Seat Backs'));
  legs.userData = um(meta('SEAT_LEG_FRAME', sys, 'Seat Leg Frames'));
  cushion.castShadow = false; cushion.receiveShadow = true;
  back.castShadow = false; back.receiveShadow = true;
  legs.castShadow = false; legs.receiveShadow = true;

  // Extents are (X fore-aft, Y lateral, Z vertical).
  const cushionSize = { x: 0.5, y: seatWidth * 0.94, z: 0.12 };
  const backSize = { x: 0.08, y: seatWidth * 0.9, z: 0.55 };
  const legSize = { x: 0.4, y: seatWidth * 0.8, z: 0.24 };

  const mCushion = new THREE.Matrix4();
  const mBack = new THREE.Matrix4();
  const mLeg = new THREE.Matrix4();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const x = rowStartX - r * CABIN.seatPitch;
    for (const y of ys) {
      mCushion.compose(
        new THREE.Vector3(m(x), m(y), m(CABIN.floorZ + 0.28)),
        new THREE.Quaternion(),
        new THREE.Vector3(m(cushionSize.x), m(cushionSize.y), m(cushionSize.z)),
      );
      cushion.setMatrixAt(i, mCushion);
      mBack.compose(
        new THREE.Vector3(m(x - 0.17), m(y), m(CABIN.floorZ + 0.62)),
        new THREE.Quaternion(),
        new THREE.Vector3(m(backSize.x), m(backSize.y), m(backSize.z)),
      );
      back.setMatrixAt(i, mBack);
      mLeg.compose(
        new THREE.Vector3(m(x), m(y), m(CABIN.floorZ + 0.12)),
        new THREE.Quaternion(),
        new THREE.Vector3(m(legSize.x), m(legSize.y), m(legSize.z)),
      );
      legs.setMatrixAt(i, mLeg);
      i++;
    }
  }
  cushion.instanceMatrix.needsUpdate = true;
  back.instanceMatrix.needsUpdate = true;
  legs.instanceMatrix.needsUpdate = true;

  grp.add(cushion, back, legs);
  return grp;
}

// ---------------------------------------------------------------------------
// CABIN (floor, ceiling, sidewalls, bins, carpet, galleys, lavatories)
// ---------------------------------------------------------------------------
function buildCabin(ctx: PartContext): THREE.Group {
  const { m, mat } = ctx;
  const sys = 'CABIN' as const;
  const cab = group('CABIN', meta('CABIN', sys, 'Passenger Cabin'));

  const cabinLen = Math.abs(CABIN.endX - CABIN.startX);
  const cabinMidX = (CABIN.startX + CABIN.endX) / 2;
  const radialSeg = seg(14, ctx.quality);

  // CABIN_FLOOR
  const floorHalf = chordHalfWidth(CABIN.floorZ);
  const floor = box(ctx, cabinLen, floorHalf * 2, 0.05, mat.cabinPlastic, cabinMidX, 0, CABIN.floorZ);
  cab.add(mk(floor, 'CABIN_FLOOR', meta('CABIN_FLOOR', sys, 'Cabin Floor')));

  // CABIN_CEILING — crown shell, radius inset for panel thickness
  const ceilGeo = shellAroundX(m(R - 0.12), m(cabinLen), 0.2 * Math.PI, 0.6 * Math.PI, radialSeg);
  const ceiling = new THREE.Mesh(ceilGeo, mat.cabinPlastic);
  ceiling.position.set(m(cabinMidX), 0, 0);
  cab.add(mk(ceiling, 'CABIN_CEILING', meta('CABIN_CEILING', sys, 'Cabin Ceiling')));

  // SIDEWALLS — two lower/mid panels below the bins, radius inset for margin
  const wallGeoL = shellAroundX(m(R - 0.05), m(cabinLen), 0.6 * Math.PI, 0.35 * Math.PI, radialSeg);
  const wallL = new THREE.Mesh(wallGeoL, mat.cabinPlastic);
  wallL.position.set(m(cabinMidX), 0, 0);
  cab.add(mk(wallL, 'SIDEWALL_R', meta('SIDEWALL_R', sys, 'Sidewall Right')));

  const wallGeoR = shellAroundX(m(R - 0.05), m(cabinLen), 0.05 * Math.PI, 0.35 * Math.PI, radialSeg);
  const wallR = new THREE.Mesh(wallGeoR, mat.cabinPlastic);
  wallR.position.set(m(cabinMidX), 0, 0);
  cab.add(mk(wallR, 'SIDEWALL_L', meta('SIDEWALL_L', sys, 'Sidewall Left')));

  // OVERHEAD_BINS_L / _R
  for (const side of [-1, 1] as const) {
    const name = side > 0 ? 'OVERHEAD_BINS_L' : 'OVERHEAD_BINS_R';
    const bin = box(ctx, cabinLen * 0.92, 0.3, 0.3, mat.cabinPlastic, cabinMidX, side * 1.2, 1.1);
    bin.rotation.x = side * -8 * DEG; // angled face toward the aisle (about spec X, fore-aft)
    cab.add(mk(bin, name, meta(name, sys, side > 0 ? 'Overhead Bins Left' : 'Overhead Bins Right')));
  }

  // CARPET — aisle strip only
  const carpet = box(ctx, cabinLen, CABIN.aisleWidth, 0.01, mat.carpet, cabinMidX, 0, CABIN.floorZ + 0.005);
  cab.add(mk(carpet, 'CARPET', meta('CARPET', sys, 'Aisle Carpet')));

  cab.add(buildPassengerSeats(ctx));

  // FORWARD_GALLEY — port side carts + counter, aft of the cockpit door
  const fwdGalleyX0 = CABIN.startX; // -6.0
  const fwdGalleyX1 = CABIN.startX - 1.4; // -7.4
  const fwdMidX = (fwdGalleyX0 + fwdGalleyX1) / 2;
  const fGalley = group('FORWARD_GALLEY', meta('FORWARD_GALLEY', sys, 'Forward Galley'));
  [-1.4, -0.7].forEach((yc, i) => {
    const cart = box(ctx, 1.2, 0.6, 1.0, mat.interiorMetal, fwdMidX, yc, CABIN.floorZ + 0.5);
    fGalley.add(mk(cart, `FORWARD_GALLEY_CART_${i + 1}`, meta(`FORWARD_GALLEY_CART_${i + 1}`, sys, 'Galley Cart')));
  });
  const fCounter = box(ctx, 1.3, 1.2, 0.06, mat.cabinPlastic, fwdMidX, -1.0, CABIN.floorZ + 1.02);
  fGalley.add(mk(fCounter, 'FORWARD_GALLEY_COUNTER', meta('FORWARD_GALLEY_COUNTER', sys, 'Galley Counter')));
  cab.add(fGalley);

  // LAVATORY_FWD — starboard (y>0) side, same X band as the forward galley
  const lavFwd = group('LAVATORY_FWD', meta('LAVATORY_FWD', sys, 'Forward Lavatory'));
  const lavFwdBox = box(ctx, 1.3, 1.0, 1.7, mat.cabinPlastic, fwdMidX, 0.7, CABIN.floorZ + 1.0);
  lavFwd.add(mk(lavFwdBox, 'LAVATORY_FWD_MODULE', meta('LAVATORY_FWD_MODULE', sys, 'Forward Lavatory Module')));
  const lavFwdDoorW = DOORS.width * 0.62;
  const lavFwdDoorH = DOORS.height * 0.72;
  const lavFwdPivot = pivotGroup('LAV_DOOR_FWD', m(fwdGalleyX0), m(0.2), m(CABIN.floorZ + lavFwdDoorH / 2));
  lavFwdPivot.userData = um(meta('LAV_DOOR_FWD', sys, 'Forward Lavatory Door'));
  const lavFwdLeaf = new THREE.Mesh(new THREE.BoxGeometry(m(0.04), m(lavFwdDoorW), m(lavFwdDoorH)), mat.cabinPlastic);
  lavFwdLeaf.position.set(0, m(lavFwdDoorW / 2), 0);
  lavFwdPivot.add(mk(lavFwdLeaf, 'LAV_DOOR_FWD_LEAF', meta('LAV_DOOR_FWD', sys, 'Forward Lavatory Door')));
  lavFwd.add(lavFwdPivot);
  cab.add(lavFwd);
  setHinge(lavFwdPivot, { channel: 'lavDoors', axis: [0, 0, 1], deg: 95 });

  // AFT_GALLEY + two aft lavatories near CABIN.endX
  const aftX0 = CABIN.endX + 1.4; // -29.6
  const aftMidX = (aftX0 + CABIN.endX) / 2;
  const aGalley = group('AFT_GALLEY', meta('AFT_GALLEY', sys, 'Aft Galley'));
  const aCart = box(ctx, 1.2, 0.65, 1.0, mat.interiorMetal, aftMidX, 0, CABIN.floorZ + 0.5);
  aGalley.add(mk(aCart, 'AFT_GALLEY_CART', meta('AFT_GALLEY_CART', sys, 'Aft Galley Cart')));
  cab.add(aGalley);

  for (const side of [-1, 1] as const) {
    const name = side > 0 ? 'LAVATORY_AFT_L' : 'LAVATORY_AFT_R';
    const label = side > 0 ? 'Aft Lavatory Left' : 'Aft Lavatory Right';
    const lavGrp = group(name, meta(name, sys, label));
    const lavBox = box(ctx, 1.2, 0.8, 1.7, mat.cabinPlastic, aftMidX, side * 0.65, CABIN.floorZ + 1.0);
    lavGrp.add(mk(lavBox, `${name}_MODULE`, meta(`${name}_MODULE`, sys, 'Lavatory Module')));
    const doorW = DOORS.width * 0.62;
    const doorH = DOORS.height * 0.72;
    const doorName = `LAV_DOOR_AFT_${side > 0 ? 'L' : 'R'}`;
    const pivot = pivotGroup(doorName, m(aftX0), m(side * (0.65 - doorW / 2)), m(CABIN.floorZ + doorH / 2));
    pivot.userData = um(meta(doorName, sys, 'Aft Lavatory Door'));
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(m(0.04), m(doorW), m(doorH)), mat.cabinPlastic);
    leaf.position.set(0, m((side * doorW) / 2), 0);
    pivot.add(mk(leaf, `${doorName}_LEAF`, meta(doorName, sys, 'Aft Lavatory Door')));
    lavGrp.add(pivot);
    cab.add(lavGrp);
    setHinge(pivot, { channel: 'lavDoors', axis: [0, 0, 1], deg: side * 95 });
  }

  return cab;
}

// ---------------------------------------------------------------------------
// CARGO_HOLD
// ---------------------------------------------------------------------------
function buildCargoHold(ctx: PartContext): THREE.Group {
  const { mat } = ctx;
  const sys = 'CARGO' as const;
  const hold = group('CARGO_HOLD', meta('CARGO_HOLD', sys, 'Cargo Hold'));

  const floorZ = -1.55;
  const half = chordHalfWidth(floorZ);
  const slabs: Array<[number, number]> = [
    [-7, -15.5],
    [-20.5, -25.5],
  ];
  slabs.forEach(([x0, x1], i) => {
    const len = Math.abs(x1 - x0);
    const mid = (x0 + x1) / 2;
    const slab = box(ctx, len, half * 2, 0.05, mat.structuralMetal, mid, 0, floorZ);
    hold.add(mk(slab, `CARGO_FLOOR_${i + 1}`, meta('CARGO_FLOOR', sys, 'Cargo Floor')));
  });

  // 6 ULD-like containers resting on the floor slabs, well inside the chord width.
  const containerHalfW = Math.min(0.5, half - 0.15); // half-width per container side, meters
  const positions: Array<[number, number]> = [
    [-9, -0.6], [-9, 0.6], [-13, -0.6], [-13, 0.6], [-22, -0.6], [-22, 0.6],
  ];
  positions.forEach(([x, y], i) => {
    const c = box(ctx, 1.5, containerHalfW * 2, 0.9, mat.interiorMetal, x, y, floorZ + 0.45);
    hold.add(mk(c, `CARGO_CONTAINER_${i + 1}`, meta(`CARGO_CONTAINER_${i + 1}`, sys, 'Cargo Container')));
  });

  return hold;
}

// ---------------------------------------------------------------------------
export const buildInterior: PartBuilder = (ctx: PartContext) => {
  const root = group(NODE.INTERIOR, meta('INTERIOR', 'CABIN', 'Interior'));

  root.add(buildFlightDeck(ctx));
  root.add(buildCabin(ctx));
  root.add(buildCargoHold(ctx));

  const tris = countTriangles(root);
  ctx.log.info('Interior built', { triangles: tris, budget: 40_000 });
  if (tris >= 40_000) {
    ctx.log.error('Interior triangle budget exceeded', { triangles: tris });
  }

  return root;
};
