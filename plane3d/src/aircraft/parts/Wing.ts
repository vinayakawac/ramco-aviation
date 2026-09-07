// STARBOARD (RIGHT) WING for AIRCRAFT-001 (product.md §6, §18, §37): wing box lofted from ONE
// airfoil, with slats, flaps, spoilers, aileron and winglet as separate hinged parts
// cut from the SAME section. The assembler mirrors this group to make WING_L.
// Frame: +X forward, +Y port, +Z up — so the starboard wing lives at negative Y.
import * as THREE from 'three';
import { FUSELAGE, WING, meta } from '../AircraftSpec';
import { DEG, countTriangles, finishMesh, loftAirfoil, pivotGroup, type LoftStation } from '../../core/geometry';
import { seg } from '../../core/quality';
import { setHinge, type PartBuilder, type PartContext } from './PartContext';

const Y_ROOT = FUSELAGE.radius;          // wing emerges from the fuselage side
const Y_INNER = 0.9;                      // hidden root inside the fuselage
const ETA_KINK = 0.37;                    // trailing-edge kink (inboard TE is unswept)
const TAN_SWEEP = Math.tan(WING.sweepDeg * DEG);
const TAN_DIHEDRAL = Math.tan(WING.dihedralDeg * DEG);
const CAMBER = 0.025;

/** Spanwise fraction 0 (fuselage side) → 1 (winglet base). */
const yOf = (eta: number) => -(Y_ROOT + eta * (WING.halfSpan - Y_ROOT));
const spanOf = (y: number) => Math.max(0, -y - Y_ROOT);

/** Leading-edge X at |y| (meters). */
export function wingLeadingX(y: number): number {
  return WING.rootLeadingX - TAN_SWEEP * spanOf(y);
}
/** Trailing-edge X: constant inboard of the kink, then straight to the tip. */
export function wingTrailingX(y: number): number {
  const rootTE = WING.rootLeadingX - WING.rootChord;
  const eta = spanOf(y) / (WING.halfSpan - Y_ROOT);
  if (eta <= ETA_KINK) return rootTE;
  const tipTE = wingLeadingX(yOf(1)) - WING.tipChord;
  const t = (eta - ETA_KINK) / (1 - ETA_KINK);
  return rootTE + (tipTE - rootTE) * t;
}
export const wingChord = (y: number) => wingLeadingX(y) - wingTrailingX(y);
export const wingZ = (y: number) => WING.rootZ + TAN_DIHEDRAL * spanOf(y);
const wingTc = (y: number) => { const eta = spanOf(y) / (WING.halfSpan - Y_ROOT); return WING.tcRoot + (WING.tcTip - WING.tcRoot) * eta; };
const wingTwist = (y: number) => -2.5 * (spanOf(y) / (WING.halfSpan - Y_ROOT));

function station(ctx: PartContext, y: number, from = 0, to = 1): LoftStation {
  const yy = Math.max(-WING.halfSpan, y);
  return {
    y: ctx.m(yy), x: ctx.m(wingLeadingX(yy)), z: ctx.m(wingZ(yy)), chord: ctx.m(wingChord(yy)),
    tc: wingTc(yy), twistDeg: wingTwist(yy), from, to,
  };
}

/** Trailing-edge devices (flaps, aileron) occupy [spanFrom, spanTo] and cut `chord` off the TE. */
const TE_DEVICES = [
  ...WING.flaps.map((f, i) => ({ ...f, name: i === 0 ? 'FLAP_INNER_R' : 'FLAP_OUTER_R', channel: 'flaps' as const, deg: 38, centred: false })),
  { ...WING.aileron, name: 'AILERON_R', channel: 'aileron' as const, deg: 50, centred: true },
];

/** Wing-box stations: the TE is cut wherever a device sits so the surfaces are flush. */
function wingBoxStations(ctx: PartContext): LoftStation[] {
  // breakpoints where the TE cut changes
  const cutAt = (eta: number) => {
    const d = TE_DEVICES.find((dv) => eta >= dv.spanFrom - 1e-9 && eta < dv.spanTo - 1e-9);
    return d ? 1 - d.chord : 1;
  };
  const etas = new Set<number>([0, ETA_KINK, 1]);
  for (const d of TE_DEVICES) { etas.add(d.spanFrom); etas.add(d.spanTo); }
  const sorted = [...etas].sort((a, b) => a - b);
  const out: LoftStation[] = [station(ctx, -Y_INNER, 0, 1)];
  for (let i = 0; i < sorted.length; i++) {
    const eta = sorted[i];
    const before = i === 0 ? 1 : cutAt(sorted[i - 1]);
    const after = i === sorted.length - 1 ? 1 : cutAt(eta);
    // duplicate station at a cut change → a vertical step wall closes the box
    if (i === 0) out.push(station(ctx, yOf(eta), 0, after));
    else if (Math.abs(before - after) > 1e-9) { out.push(station(ctx, yOf(eta), 0, before)); out.push(station(ctx, yOf(eta), 0, after)); }
    else out.push(station(ctx, yOf(eta), 0, after));
  }
  return out;
}

/** Hinged trailing-edge device lofted from the rear slice of the wing section. */
function teDevice(ctx: PartContext, d: typeof TE_DEVICES[number], profilePts: number): THREE.Group {
  const ya = yOf(d.spanFrom) + 0.02, yb = yOf(d.spanTo) - 0.02; // small gaps at the ends
  const from = 1 - d.chord;
  // hinge line runs along the cut line, slightly below the chord plane
  const hx = (y: number) => wingLeadingX(y) - from * wingChord(y);
  const pa = new THREE.Vector3(ctx.m(hx(ya)), ctx.m(ya), ctx.m(wingZ(ya) - 0.015 * wingChord(ya)));
  const pb = new THREE.Vector3(ctx.m(hx(yb)), ctx.m(yb), ctx.m(wingZ(yb) - 0.015 * wingChord(yb)));
  const pivot = pivotGroup(d.name, pa.x, pa.y, pa.z);
  const axis = pb.clone().sub(pa).normalize(); // outboard along the hinge
  const geo = loftAirfoil([station(ctx, ya, from, 1), station(ctx, yb, from, 1)], profilePts, CAMBER);
  geo.translate(-pa.x, -pa.y, -pa.z);
  const label = d.name.replace('_R', '').replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) + ' Right';
  pivot.add(finishMesh(new THREE.Mesh(geo, ctx.mat.paintWhite), `${d.name}_MESH`, { ...meta(d.name, 'WINGS', label) }));
  pivot.userData = { ...meta(d.name, 'WINGS', label) };
  // positive angle about the outboard-pointing hinge axis drops the trailing edge
  setHinge(pivot, { channel: d.channel, axis: [axis.x, axis.y, axis.z], deg: d.deg, centred: d.centred });
  return pivot;
}

/** Slat: front slice of the section, scaled up a little so it sits on the leading edge. */
function slat(ctx: PartContext, s: typeof WING.slats[number], idx: number, profilePts: number): THREE.Group {
  const ya = yOf(s.spanFrom) + 0.02, yb = yOf(s.spanTo) - 0.02;
  const st = (y: number): LoftStation => {
    const base = station(ctx, y, 0, s.chord);
    // grow the slice 6 % around the LE so it wraps the wing nose without z-fighting
    return { ...base, x: base.x + base.chord * 0.03, z: base.z + 0.002, chord: base.chord * 1.06 };
  };
  const pa = new THREE.Vector3(ctx.m(wingLeadingX(ya)), ctx.m(ya), ctx.m(wingZ(ya)));
  const pb = new THREE.Vector3(ctx.m(wingLeadingX(yb)), ctx.m(yb), ctx.m(wingZ(yb)));
  const name = `SLAT_${idx + 1}_R`;
  const pivot = pivotGroup(name, pa.x, pa.y, pa.z);
  const geo = loftAirfoil([st(ya), st(yb)], profilePts, CAMBER);
  geo.translate(-pa.x, -pa.y, -pa.z);
  pivot.add(finishMesh(new THREE.Mesh(geo, ctx.mat.brushedMetal), `${name}_MESH`, { ...meta(name, 'WINGS', `Slat ${idx + 1} Right`) }));
  pivot.userData = { ...meta(name, 'WINGS', `Slat ${idx + 1} Right`) };
  // slats translate forward/down along the local chord and droop a few degrees
  const dir = pb.clone().sub(pa).normalize();
  const fwd = new THREE.Vector3(1, 0, 0).sub(dir.clone().multiplyScalar(dir.x)).normalize(); // forward, perpendicular to hinge
  const travel = ctx.m(0.3 * wingChord(ya) * s.chord);
  setHinge(pivot, { channel: 'slats', axis: [dir.x, dir.y, dir.z], deg: -12, translate: [fwd.x * travel, fwd.y * travel, fwd.z * travel - ctx.m(0.12)] });
  return pivot;
}

/** Spoiler panel lying on the upper surface ahead of the flaps, hinged on its forward edge. */
function spoiler(ctx: PartContext, s: typeof WING.spoilers[number], idx: number): THREE.Group {
  const ya = yOf(s.spanFrom), yb = yOf(s.spanTo);
  const ym = (ya + yb) / 2;
  const chord = wingChord(ym);
  const xFwd = wingLeadingX(ym) - (1 - WING.flaps[0].chord - s.chord) * chord; // just ahead of the flap cut
  // upper surface height at ~65 % chord ≈ 0.55 · t_max above the chord line
  const zTop = wingZ(ym) + 0.55 * wingTc(ym) * chord + 0.01;
  const name = `SPOILER_${idx + 1}_R`;
  const pivot = pivotGroup(name, ctx.m(xFwd), ctx.m(ym), ctx.m(zTop));
  const panel = new THREE.BoxGeometry(ctx.m(s.chord * chord), ctx.m(Math.abs(yb - ya) - 0.05), ctx.m(0.03));
  panel.translate(-ctx.m(s.chord * chord) / 2, 0, 0);
  pivot.add(finishMesh(new THREE.Mesh(panel, ctx.mat.paintWhite), `${name}_MESH`, { ...meta(name, 'WINGS', `Spoiler ${idx + 1} Right`) }));
  pivot.userData = { ...meta(name, 'WINGS', `Spoiler ${idx + 1} Right`) };
  // rotate about the (swept) forward edge; negative about the outboard axis lifts the TE
  const dir = new THREE.Vector3(-TAN_SWEEP * 0.4, -1, 0).normalize();
  setHinge(pivot, { channel: 'spoilers', axis: [dir.x, dir.y, dir.z], deg: -45 });
  return pivot;
}

/** Winglet: swept blade canted outward, lofted from the same airfoil, navy livery. */
function winglet(ctx: PartContext, profilePts: number): THREE.Group {
  const w = WING.winglet;
  const yTip = yOf(1);
  const base = new THREE.Vector3(ctx.m(wingLeadingX(yTip)), ctx.m(yTip), ctx.m(wingZ(yTip)));
  const group = pivotGroup('WINGLET_R', base.x, base.y, base.z);
  // author along +Y (span) then rotate about X so span points up and 20° outboard (−Y)
  const st: LoftStation[] = [
    { y: 0, x: 0, z: 0, chord: ctx.m(w.rootChord), tc: 0.09, from: 0, to: 1 },
    { y: ctx.m(w.height * 0.45), x: -ctx.m(Math.tan(w.sweepDeg * DEG) * w.height * 0.45), z: 0, chord: ctx.m((w.rootChord + w.tipChord) / 2), tc: 0.08 },
    { y: ctx.m(w.height), x: -ctx.m(Math.tan(w.sweepDeg * DEG) * w.height), z: 0, chord: ctx.m(w.tipChord), tc: 0.07 },
  ];
  const geo = loftAirfoil(st, profilePts, 0);
  geo.rotateX((90 + w.cantDeg) * DEG); // +Y → (0, −sin cant, cos cant)
  group.add(finishMesh(new THREE.Mesh(geo, ctx.mat.paintNavy), 'WINGLET_R_MESH', { ...meta('WINGLET_R', 'WINGS', 'Winglet Right') }));
  group.userData = { ...meta('WINGLET_R', 'WINGS', 'Winglet Right') };
  // navigation light lens (green starboard / red port is a lighting concern, geometry is shared)
  const nav = finishMesh(new THREE.Mesh(new THREE.SphereGeometry(ctx.m(0.08), 8, 6), ctx.mat.lightLens), 'NAV_LIGHT_R', { ...meta('LIGHTS', 'LIGHTS', 'Navigation Light Right') });
  nav.position.set(-ctx.m(0.2), 0, ctx.m(0.1));
  group.add(nav);
  return group;
}

export const buildWingRight: PartBuilder = (ctx) => {
  const profilePts = seg(24, ctx.quality, 10);
  const group = new THREE.Group();
  group.name = 'WING_R';
  group.userData = { ...meta('WING_R', 'WINGS', 'Wing Right') };

  // main wing box
  const box = loftAirfoil(wingBoxStations(ctx), profilePts, CAMBER);
  group.add(finishMesh(new THREE.Mesh(box, ctx.mat.paintWhite), 'WING_BOX_R', { ...meta('WING_R', 'WINGS', 'Wing Right') }));

  // control surfaces
  for (const d of TE_DEVICES) group.add(teDevice(ctx, d, profilePts));
  WING.slats.forEach((s, i) => group.add(slat(ctx, s, i, Math.max(8, profilePts >> 1))));
  WING.spoilers.forEach((s, i) => group.add(spoiler(ctx, s, i)));

  // flap-track fairings under the flaps (two per wing, as on the reference sheets)
  for (const eta of [0.22, 0.52]) {
    const y = yOf(eta);
    const chord = wingChord(y);
    const ff = new THREE.CapsuleGeometry(ctx.m(0.17), ctx.m(chord * 0.45), 4, seg(12, ctx.quality, 6));
    ff.rotateZ(Math.PI / 2);
    ff.translate(ctx.m(wingLeadingX(y) - 0.78 * chord), ctx.m(y), ctx.m(wingZ(y) - 0.45 * wingTc(y) * chord - 0.1));
    group.add(finishMesh(new THREE.Mesh(ff, ctx.mat.paintWhite), 'FLAP_TRACK_FAIRING_R', { ...meta('WING_R', 'WINGS', 'Flap Track Fairing') }));
  }

  group.add(winglet(ctx, Math.max(8, profilePts >> 1)));

  ctx.log.info('wing built', { triangles: countTriangles(group) });
  return group;
};
