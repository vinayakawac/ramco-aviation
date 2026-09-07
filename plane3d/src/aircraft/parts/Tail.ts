// EMPENNAGE for AIRCRAFT-001: navy vertical stabilizer with hinged rudder and the STARBOARD
// horizontal stabilizer with hinged elevator (assembler mirrors it). Same airfoil
// slicing approach as the wing so the control surfaces sit flush when neutral.
import * as THREE from 'three';
import { TAIL, meta } from '../AircraftSpec';
import { DEG, countTriangles, finishMesh, loftAirfoil, pivotGroup, type LoftStation } from '../../core/geometry';
import { seg } from '../../core/quality';
import { fuselageCentreZAt, fuselageRadiusAt } from './Fuselage';
import { setHinge, type PartBuilder } from './PartContext';

export const buildTailVertical: PartBuilder = (ctx) => {
  const v = TAIL.vertical;
  const pts = seg(20, ctx.quality, 10);
  const group = new THREE.Group();
  group.name = 'TAIL_VERTICAL';
  group.userData = { ...meta('TAIL_VERTICAL', 'TAIL', 'Vertical Stabilizer') };

  // root sits inside the aft fuselage top so the join is hidden
  const zRoot = fuselageCentreZAt(v.rootLeadingX) + fuselageRadiusAt(v.rootLeadingX) - 0.45;
  const tanSweep = Math.tan(v.sweepDeg * DEG);
  const cut = 1 - v.rudderChord;
  const stationAt = (z: number, from: number, to: number): LoftStation => {
    const h = (z - zRoot) / (v.topZ - zRoot);
    const chord = v.rootChord + (v.tipChord - v.rootChord) * h;
    // author along +Y as "span", rotate to +Z afterwards
    return { y: ctx.m(z - zRoot), x: ctx.m(v.rootLeadingX - tanSweep * (z - zRoot)), z: 0, chord: ctx.m(chord), tc: 0.10 - 0.02 * h, from, to };
  };
  const fin = loftAirfoil([stationAt(zRoot, 0, cut), stationAt(v.topZ, 0, cut)], pts, 0);
  fin.rotateX(90 * DEG); // +Y → +Z
  fin.translate(0, 0, ctx.m(zRoot));
  group.add(finishMesh(new THREE.Mesh(fin, ctx.mat.paintNavy), 'FIN', { ...meta('TAIL_VERTICAL', 'TAIL', 'Vertical Stabilizer') }));

  // rudder: rear slice hinged on the (swept) cut line
  const hingeX = (z: number) => v.rootLeadingX - tanSweep * (z - zRoot) - cut * (v.rootChord + (v.tipChord - v.rootChord) * ((z - zRoot) / (v.topZ - zRoot)));
  const zA = zRoot + 0.3, zB = v.topZ - 0.15;
  const pa = new THREE.Vector3(ctx.m(hingeX(zA)), 0, ctx.m(zA));
  const pb = new THREE.Vector3(ctx.m(hingeX(zB)), 0, ctx.m(zB));
  const rudder = pivotGroup('RUDDER', pa.x, 0, pa.z);
  const rg = loftAirfoil([stationAt(zA, cut, 1), stationAt(zB, cut, 1)], pts, 0);
  rg.rotateX(90 * DEG);
  rg.translate(-pa.x, 0, ctx.m(zRoot) - pa.z);
  rudder.add(finishMesh(new THREE.Mesh(rg, ctx.mat.paintNavy), 'RUDDER_MESH', { ...meta('RUDDER', 'TAIL', 'Rudder') }));
  rudder.userData = { ...meta('RUDDER', 'TAIL', 'Rudder') };
  const axis = pb.clone().sub(pa).normalize();
  setHinge(rudder, { channel: 'rudder', axis: [axis.x, axis.y, axis.z], deg: 50, centred: true });
  group.add(rudder);

  ctx.log.info('vertical tail built', { triangles: countTriangles(group) });
  return group;
};

export const buildTailHorizontalRight: PartBuilder = (ctx) => {
  const h = TAIL.horizontal;
  const pts = seg(18, ctx.quality, 10);
  const group = new THREE.Group();
  group.name = 'TAIL_HORIZONTAL_R';
  group.userData = { ...meta('TAIL_HORIZONTAL_R', 'TAIL', 'Horizontal Stabilizer Right') };

  const tanSweep = Math.tan(h.sweepDeg * DEG);
  const tanDih = Math.tan(h.dihedralDeg * DEG);
  const cut = 1 - h.elevatorChord;
  const yInner = -0.3; // hidden inside the tail cone
  const stationAt = (y: number, from: number, to: number): LoftStation => {
    const s = Math.max(0, -y) / h.halfSpan;
    const chord = h.rootChord + (h.tipChord - h.rootChord) * s;
    return { y: ctx.m(y), x: ctx.m(h.rootLeadingX - tanSweep * Math.max(0, -y)), z: ctx.m(h.rootZ + tanDih * Math.max(0, -y)), chord: ctx.m(chord), tc: 0.09, from, to };
  };
  const plane = loftAirfoil([stationAt(yInner, 0, cut), stationAt(-h.halfSpan, 0, cut)], pts, 0);
  group.add(finishMesh(new THREE.Mesh(plane, ctx.mat.paintWhite), 'STABILIZER_R', { ...meta('TAIL_HORIZONTAL_R', 'TAIL', 'Horizontal Stabilizer Right') }));

  const yA = -0.6, yB = -h.halfSpan + 0.15;
  const hx = (y: number) => h.rootLeadingX - tanSweep * -y - cut * (h.rootChord + (h.tipChord - h.rootChord) * (-y / h.halfSpan));
  const pa = new THREE.Vector3(ctx.m(hx(yA)), ctx.m(yA), ctx.m(h.rootZ + tanDih * -yA));
  const pb = new THREE.Vector3(ctx.m(hx(yB)), ctx.m(yB), ctx.m(h.rootZ + tanDih * -yB));
  const elevator = pivotGroup('ELEVATOR_R', pa.x, pa.y, pa.z);
  const eg = loftAirfoil([stationAt(yA, cut, 1), stationAt(yB, cut, 1)], pts, 0);
  eg.translate(-pa.x, -pa.y, -pa.z);
  elevator.add(finishMesh(new THREE.Mesh(eg, ctx.mat.paintWhite), 'ELEVATOR_R_MESH', { ...meta('ELEVATOR_R', 'TAIL', 'Elevator Right') }));
  elevator.userData = { ...meta('ELEVATOR_R', 'TAIL', 'Elevator Right') };
  const axis = pb.clone().sub(pa).normalize();
  setHinge(elevator, { channel: 'elevator', axis: [axis.x, axis.y, axis.z], deg: 40, centred: true });
  group.add(elevator);

  ctx.log.info('horizontal tail built', { triangles: countTriangles(group) });
  return group;
};
