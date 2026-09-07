// FUSELAGE for AIRCRAFT-001: radome, nose, centre and aft sections as four lathes that
// share ONE radius/centre-line profile, plus cockpit glazing, cabin windows, the navy
// cheatline, doors (with hinge pivots), belly fairing, APU exhaust, lights and antennas.
// Spec frame: +X forward, +Y starboard, +Z up. Scene units via ctx.m().
import * as THREE from 'three';
import { DOORS, FUSELAGE, GEAR, meta } from '../AircraftSpec';
import { DEG, finishMesh, latheAroundX, mirrorGeometryY, pivotGroup, surfacePatch, countTriangles } from '../../core/geometry';
import { seg } from '../../core/quality';
import { setHinge, type PartBuilder, type PartContext } from './PartContext';

const R = FUSELAGE.radius;

/** Fuselage outer radius (meters) at spec X. One function feeds every fuselage feature. */
export function fuselageRadiusAt(x: number): number {
  if (x > FUSELAGE.cylinderStartX) {
    // nose: pointed ogive from the tip to the constant section
    const t = THREE.MathUtils.clamp(-x / -FUSELAGE.cylinderStartX, 0, 1);
    return R * Math.pow(Math.sin((t * Math.PI) / 2), 0.85);
  }
  if (x >= FUSELAGE.cylinderEndX) return R;
  // tail cone: shrinks to the APU exhaust radius with a flat-ish top line
  const s = THREE.MathUtils.clamp((FUSELAGE.cylinderEndX - x) / (FUSELAGE.cylinderEndX - FUSELAGE.tailX), 0, 1);
  return FUSELAGE.tailTipRadius + (R - FUSELAGE.tailTipRadius) * Math.pow(1 - Math.pow(s, 1.5), 1.2);
}

/** Centre-line Z offset (meters) at spec X: nose droop forward, upsweep aft. */
export function fuselageCentreZAt(x: number): number {
  if (x > FUSELAGE.cylinderStartX) {
    const t = THREE.MathUtils.clamp(-x / -FUSELAGE.cylinderStartX, 0, 1);
    return -0.55 * Math.pow(1 - t, 2);
  }
  if (x >= FUSELAGE.cylinderEndX) return 0;
  const s = THREE.MathUtils.clamp((FUSELAGE.cylinderEndX - x) / (FUSELAGE.cylinderEndX - FUSELAGE.tailX), 0, 1);
  return FUSELAGE.tailTipZ * Math.pow(s, 2.5);
}

/** Sample a (x, r) profile between two stations, in SCENE units. */
function profile(ctx: PartContext, xFrom: number, xTo: number, steps: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const x = xFrom + (xTo - xFrom) * (i / steps);
    out.push([ctx.m(x), ctx.m(fuselageRadiusAt(x))]);
  }
  return out;
}

function section(ctx: PartContext, name: string, xFrom: number, xTo: number, steps: number, mat: THREE.Material, label: string): THREE.Mesh {
  const radial = seg(72, ctx.quality, 24);
  const zOff = (xScene: number) => ctx.m(fuselageCentreZAt(xScene / ctx.m(1)));
  const geo = latheAroundX(profile(ctx, xFrom, xTo, steps), radial, zOff);
  return finishMesh(new THREE.Mesh(geo, mat), name, { ...meta(name, 'AIRFRAME', label) });
}

/** A curved patch on the STARBOARD (−Y) side between two Z heights, translated so `pivot` is its origin. */
function stbdPatch(ctx: PartContext, xFrom: number, xTo: number, zTop: number, zBot: number, offset: number, pivot?: THREE.Vector3): THREE.BufferGeometry {
  const rAt = (xs: number) => ctx.m(fuselageRadiusAt(xs / ctx.m(1)));
  const zAt = (xs: number) => ctx.m(fuselageCentreZAt(xs / ctx.m(1)));
  const g = surfacePatch(rAt, zAt, ctx.m(xFrom), ctx.m(xTo), ctx.m(zTop), ctx.m(zBot), -1, ctx.m(offset), 6, 8);
  if (pivot) g.translate(-pivot.x, -pivot.y, -pivot.z);
  return g;
}

/** Starboard passenger/exit door group hinged on its forward edge (mirrored to port by the assembler). */
function passengerDoor(ctx: PartContext, name: string, label: string, xFwd: number, width: number, zTop: number, zBot: number): THREE.Group {
  const zMid = (zTop + zBot) / 2;
  const yHinge = -(fuselageRadiusAt(xFwd) * Math.sin(Math.acos(THREE.MathUtils.clamp((zMid - fuselageCentreZAt(xFwd)) / fuselageRadiusAt(xFwd), -1, 1))));
  const pivot = pivotGroup(name, ctx.m(xFwd), ctx.m(yHinge), ctx.m(zMid));
  const pv = pivot.position.clone();
  const panel = finishMesh(new THREE.Mesh(stbdPatch(ctx, xFwd, xFwd - width, zTop, zBot, 0.03, pv), ctx.mat.paintWhite), `${name}_PANEL`, { ...meta(name, 'DOORS', label) });
  const frame = finishMesh(new THREE.Mesh(stbdPatch(ctx, xFwd + 0.04, xFwd - width - 0.04, zTop + 0.04, zBot - 0.04, 0.012, pv), ctx.mat.paintGrey), `${name}_FRAME`, { ...meta(name, 'DOORS', label) });
  frame.castShadow = false;
  pivot.add(frame, panel);
  pivot.userData = { ...meta(name, 'DOORS', label) };
  // opens outward and forward about the vertical hinge (product.md §19)
  setHinge(pivot, { channel: name.startsWith('EXIT') ? 'doors' : 'doors', axis: [0, 0, 1], deg: 150 });
  return pivot;
}

/** Starboard cargo door hinged on its top edge, opening upward. Starboard only (as on the real aircraft). */
function cargoDoor(ctx: PartContext, name: string, xCentre: number): THREE.Group {
  const { width, height, z } = DOORS.cargo;
  const zTop = z + height / 2;
  const zBot = z - height / 2;
  const r = fuselageRadiusAt(xCentre);
  const yHinge = -r * Math.sin(Math.acos(THREE.MathUtils.clamp((zTop - fuselageCentreZAt(xCentre)) / r, -1, 1)));
  const pivot = pivotGroup(name, ctx.m(xCentre), ctx.m(yHinge), ctx.m(zTop));
  const pv = pivot.position.clone();
  const panel = finishMesh(new THREE.Mesh(stbdPatch(ctx, xCentre + width / 2, xCentre - width / 2, zTop, zBot, 0.03, pv), ctx.mat.paintWhite), `${name}_PANEL`, { ...meta(name, 'CARGO', 'Cargo Door') });
  const frame = finishMesh(new THREE.Mesh(stbdPatch(ctx, xCentre + width / 2 + 0.04, xCentre - width / 2 - 0.04, zTop + 0.04, zBot - 0.04, 0.012, pv), ctx.mat.paintGrey), `${name}_FRAME`, { ...meta(name, 'CARGO', 'Cargo Door') });
  frame.castShadow = false;
  pivot.add(frame, panel);
  pivot.userData = { ...meta(name, 'CARGO', 'Cargo Door') };
  // hinge on the top edge; for a starboard (−Y) door a negative angle about +X swings it out and up
  setHinge(pivot, { channel: 'cargoDoors', axis: [1, 0, 0], deg: -95 });
  return pivot;
}

export const buildFuselage: PartBuilder = (ctx) => {
  const { mat } = ctx;
  const group = new THREE.Group();
  group.name = 'FUSELAGE';
  group.userData = { ...meta('FUSELAGE', 'AIRFRAME', 'Fuselage') };

  // ---- Four shell sections sharing one profile (product.md §6) ----------------------
  const nSteps = seg(28, ctx.quality, 12);
  // skin sections use the dedicated skin material so cutaway/ghost modes can target them alone
  group.add(section(ctx, 'RADOME', FUSELAGE.noseX, -1.6, Math.max(8, nSteps >> 1), mat.paintSkin, 'Radome'));
  group.add(section(ctx, 'FORWARD_FUSELAGE', -1.6, FUSELAGE.cylinderStartX, nSteps, mat.paintSkin, 'Forward Fuselage'));
  group.add(section(ctx, 'CENTER_FUSELAGE', FUSELAGE.cylinderStartX, FUSELAGE.cylinderEndX, 4, mat.paintSkin, 'Centre Fuselage'));
  group.add(section(ctx, 'AFT_FUSELAGE', FUSELAGE.cylinderEndX, FUSELAGE.tailX, seg(32, ctx.quality, 14), mat.paintSkin, 'Aft Fuselage'));

  // ---- Belly fairing (wing-body fairing) --------------------------------------------
  const fairing = new THREE.SphereGeometry(1, seg(40, ctx.quality, 16), seg(20, ctx.quality, 8));
  fairing.scale(ctx.m(6.4), ctx.m(2.45), ctx.m(1.05));
  fairing.translate(ctx.m(-17.6), 0, ctx.m(-1.3));
  group.add(finishMesh(new THREE.Mesh(fairing, mat.paintSkin), 'BELLY_FAIRING', { ...meta('BELLY_FAIRING', 'AIRFRAME', 'Belly Fairing') }));

  // ---- Cockpit glazing: one wrap-around band per side plus frame posts ------------
  const cockpit = new THREE.Group();
  cockpit.name = 'COCKPIT';
  cockpit.userData = { ...meta('COCKPIT', 'AVIONICS', 'Cockpit') };
  const [wsFwd, wsAft] = FUSELAGE.windshieldX;
  const glassL = stbdPatch(ctx, wsFwd, wsAft, 1.32, 0.82, 0.015);
  cockpit.add(finishMesh(new THREE.Mesh(glassL, mat.cockpitGlass), 'WINDSHIELD_R', { ...meta('COCKPIT', 'AVIONICS', 'Windshield') }));
  cockpit.add(finishMesh(new THREE.Mesh(mirrorGeometryY(glassL), mat.cockpitGlass), 'WINDSHIELD_L', { ...meta('COCKPIT', 'AVIONICS', 'Windshield') }));
  for (const xp of [-3.15, -3.65]) {
    const postS = stbdPatch(ctx, xp + 0.035, xp - 0.035, 1.36, 0.78, 0.02);
    const post = finishMesh(new THREE.Mesh(postS, mat.paintWhite), 'WINDSHIELD_POST_R', { ...meta('COCKPIT', 'AVIONICS', 'Windshield Post') });
    const postP = finishMesh(new THREE.Mesh(mirrorGeometryY(postS), mat.paintWhite), 'WINDSHIELD_POST_L', { ...meta('COCKPIT', 'AVIONICS', 'Windshield Post') });
    post.castShadow = postP.castShadow = false;
    cockpit.add(post, postP);
  }
  group.add(cockpit);

  // ---- Cabin windows: one instanced plane, both sides ---------------------------------
  const w = FUSELAGE.window;
  const xs: number[] = [];
  for (let x = w.firstX; x >= w.lastX - 1e-6; x -= w.pitch) {
    // leave the over-wing exits their own (taller) windows
    if (DOORS.overwing.xs.some((ex) => Math.abs(ex - x) < 0.42)) continue;
    xs.push(x);
  }
  const winGeo = new THREE.PlaneGeometry(ctx.m(w.width), ctx.m(w.height));
  const windows = new THREE.InstancedMesh(winGeo, mat.windowGlass, xs.length * 2 + 4);
  windows.name = 'CABIN_WINDOWS';
  windows.userData = { ...meta('CABIN_WINDOWS', 'AIRFRAME', 'Cabin Windows'), count: xs.length * 2 };
  const dummy = new THREE.Object3D();
  let k = 0;
  const placeWindow = (x: number, side: -1 | 1, z: number, scaleZ = 1) => {
    const r = fuselageRadiusAt(x) + 0.012;
    const a = Math.acos(THREE.MathUtils.clamp((z - fuselageCentreZAt(x)) / r, -1, 1));
    dummy.position.set(ctx.m(x), ctx.m(side * r * Math.sin(a)), ctx.m(fuselageCentreZAt(x) + r * Math.cos(a)));
    // plane normal (+Z) → outward surface normal (0, side·sin a, cos a): rotate about X by −side·a
    dummy.rotation.set(-side * a, 0, 0);
    dummy.scale.set(1, scaleZ, 1);
    dummy.updateMatrix();
    windows.setMatrixAt(k++, dummy.matrix);
  };
  for (const x of xs) { placeWindow(x, -1, w.z); placeWindow(x, 1, w.z); }
  for (const ex of DOORS.overwing.xs) { placeWindow(ex, -1, 0.5, 1.15); placeWindow(ex, 1, 0.5, 1.15); }
  windows.count = k;
  windows.castShadow = false;
  windows.receiveShadow = true;
  group.add(windows);

  // ---- Navy cheatline below the window row (locked livery, product.md Rule 3) ------
  const c = FUSELAGE.cheatline;
  const cheatL = stbdPatch(ctx, c.startX, c.endX, c.zTop, c.zBottom, 0.006);
  const cheatMeshL = finishMesh(new THREE.Mesh(cheatL, mat.paintNavy), 'CHEATLINE_R', { ...meta('FUSELAGE', 'AIRFRAME', 'Livery Cheatline'), selectable: false });
  const cheatMeshR = finishMesh(new THREE.Mesh(mirrorGeometryY(cheatL), mat.paintNavy), 'CHEATLINE_L', { ...meta('FUSELAGE', 'AIRFRAME', 'Livery Cheatline'), selectable: false });
  cheatMeshL.castShadow = cheatMeshR.castShadow = false;
  group.add(cheatMeshL, cheatMeshR);

  // ---- Doors (starboard side authored; assembler mirrors the passenger doors to port) ---
  const doors = new THREE.Group();
  doors.name = 'DOORS';
  doors.userData = { ...meta('DOORS', 'DOORS', 'Doors & Exits') };
  const sill = -0.5; // door bottom (just above the cabin floor)
  doors.add(passengerDoor(ctx, 'DOOR_FWD_R', 'Forward Passenger Door Right', DOORS.forwardX + DOORS.width / 2, DOORS.width, sill + DOORS.height, sill));
  doors.add(passengerDoor(ctx, 'DOOR_AFT_R', 'Aft Passenger Door Right', DOORS.aftX + DOORS.width / 2, DOORS.width, sill + DOORS.height, sill));
  DOORS.overwing.xs.forEach((ex, i) => {
    doors.add(passengerDoor(ctx, `EXIT_OVERWING_${i + 1}_R`, `Over-wing Exit ${i + 1} Right`, ex + DOORS.overwing.width / 2, DOORS.overwing.width, -0.15 + DOORS.overwing.height, -0.15));
  });
  // cargo doors are starboard (−Y) only: intentional asymmetry, documented per Rule 2
  doors.add(cargoDoor(ctx, 'CARGO_DOOR_FWD', DOORS.cargo.forwardX));
  doors.add(cargoDoor(ctx, 'CARGO_DOOR_AFT', DOORS.cargo.aftX));
  group.add(doors);

  // ---- APU exhaust at the tail tip ---------------------------------------------------
  const apu = new THREE.CylinderGeometry(ctx.m(FUSELAGE.tailTipRadius * 0.9), ctx.m(FUSELAGE.tailTipRadius * 0.7), ctx.m(0.6), seg(20, ctx.quality, 8), 1, true);
  apu.rotateZ(Math.PI / 2);
  apu.translate(ctx.m(FUSELAGE.tailX + 0.3), 0, ctx.m(FUSELAGE.tailTipZ)); // ends flush with the 39.5 m datum
  group.add(finishMesh(new THREE.Mesh(apu, mat.exhaustHot), 'APU_EXHAUST', { ...meta('APU_EXHAUST', 'PROPULSION', 'APU Exhaust') }));

  // ---- Nose gear bay door (starboard; mirrored to port by the assembler) --------------
  const bayDoorL = stbdPatch(ctx, GEAR.noseX + 0.9, GEAR.noseX - 0.9, -1.55, -1.95, 0.02, new THREE.Vector3(ctx.m(GEAR.noseX), ctx.m(-0.5), ctx.m(-1.9)));
  const bayPivot = pivotGroup('NOSE_BAY_DOOR_R', ctx.m(GEAR.noseX), ctx.m(-0.5), ctx.m(-1.9));
  bayPivot.add(finishMesh(new THREE.Mesh(bayDoorL, mat.paintWhite), 'NOSE_BAY_DOOR_R_PANEL', { ...meta('GEAR_NOSE', 'LANDING_GEAR', 'Nose Gear Bay Door') }));
  bayPivot.userData = { ...meta('GEAR_NOSE', 'LANDING_GEAR', 'Nose Gear Bay Door') };
  // gear channel 0 (extended) = door open (hangs down 80°); closes in the last 30 % of retraction
  setHinge(bayPivot, { channel: 'gear', axis: [1, 0, 0], deg: 80, from: 0.7, to: 1 });
  bayPivot.rotation.x = -80 * DEG; // rest = open; hinge rotates it closed
  bayPivot.userData.rest = { q: bayPivot.quaternion.toArray(), p: bayPivot.position.toArray() };
  group.add(bayPivot);

  // ---- Lights and antennas -----------------------------------------------------------
  const lights = new THREE.Group();
  lights.name = 'LIGHTS';
  lights.userData = { ...meta('LIGHTS', 'LIGHTS', 'Exterior Lights') };
  const beaconGeo = new THREE.SphereGeometry(ctx.m(0.09), 10, 8);
  for (const [z, name] of [[R + 0.02, 'BEACON_TOP'], [-R - 0.02, 'BEACON_BOTTOM']] as const) {
    const b = finishMesh(new THREE.Mesh(beaconGeo, mat.lightLens), name, { ...meta('LIGHTS', 'LIGHTS', 'Anti-collision Beacon') });
    b.position.set(ctx.m(-16.0), 0, ctx.m(z));
    b.castShadow = false;
    lights.add(b);
  }
  group.add(lights);

  const antennas = new THREE.Group();
  antennas.name = 'ANTENNAS';
  antennas.userData = { ...meta('ANTENNAS', 'AVIONICS', 'Antennas') };
  const bladeGeo = new THREE.BoxGeometry(ctx.m(0.35), ctx.m(0.03), ctx.m(0.22));
  for (const [x, top] of [[-9.5, true], [-12.5, true], [-24.0, true], [-8.0, false], [-22.5, false]] as const) {
    const a = finishMesh(new THREE.Mesh(bladeGeo, mat.paintWhite), `ANTENNA_${top ? 'TOP' : 'BOTTOM'}`, { ...meta('ANTENNAS', 'AVIONICS', 'Blade Antenna') });
    a.position.set(ctx.m(x), 0, ctx.m(top ? R + 0.1 : -R - 0.1));
    antennas.add(a);
  }
  // pitot probes on the nose
  const pitotGeo = new THREE.CylinderGeometry(ctx.m(0.02), ctx.m(0.02), ctx.m(0.3), 8);
  pitotGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    const p = finishMesh(new THREE.Mesh(pitotGeo, mat.metal), 'PITOT', { ...meta('ANTENNAS', 'AVIONICS', 'Pitot Probe') });
    p.position.set(ctx.m(-2.2), ctx.m(side * 0.9), ctx.m(-0.35));
    antennas.add(p);
  }
  group.add(antennas);

  ctx.log.info('fuselage built', { triangles: countTriangles(group), windows: k });
  return group;
};
