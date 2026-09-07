// Nose and main landing gear for AIRCRAFT-001 (product.md §17-19 pivots, §32 systems).
// Tricycle layout: twin-wheel nose gear that retracts FORWARD, twin-wheel main gear
// that retracts INBOARD/up into the belly. Each returned Group IS the physical
// retraction hinge (product.md §17: pivots live at the real hinge, never at a
// geometric center) — its `position` is the hinge point and every child hangs
// below it in local space. Rotating the group itself therefore rotates the whole
// gear leg rigidly about the correct hinge, with no extra indirection needed.
import * as THREE from 'three';
import { GEAR, GROUND_Z, FUSELAGE, NODE, meta, type ComponentMeta } from '../AircraftSpec';
import { pivotGroup, finishMesh, countTriangles, DEG } from '../../core/geometry';
import { seg } from '../../core/quality';
import { setHinge, setSpin, type AnimChannel, type PartBuilder, type PartContext } from './PartContext';

// Retraction targets (product.md §17: rotate about the real hinge only).
// Nose: -90 deg about local Y swings the strut to point forward (+X) and up into
// the bay as the 'gear' channel goes 0 (extended) -> 1 (retracted).
const NOSE_RETRACT_DEG = -90;
// Main: +90 deg about local X swings the wheels toward the centreline (+Y, inboard
// for the left leg, since the pivot itself sits at negative Y) and up toward the
// pivot's own Z, tucking the bogie into the wing/belly fairing.
const MAIN_RETRACT_DEG = 90;
// Gear bay doors: 'gearDoors' channel follows the same 0=closed/1=open convention
// as every other *Doors channel (product.md §47/§49); the geometry is authored in
// the closed/flush pose so the hinge's rest transform IS "closed".
const DOOR_OPEN_DEG = -80;

// NOTE (mid-task contract change): PartContext.ts was rewritten by another part
// builder's author while this file was in progress, replacing the closure-based
// registerAnim()/AnimatedPart API with a declarative hinge/spin system driven by
// AnimChannel values (see setHinge/setSpin/applyChannel above). This file now
// targets that API. Wheel rolling has no dedicated channel yet (only 'engine' is
// documented as a continuous spin, and that is the turbofan fan, not a wheel) —
// 'wheelSpin' is used here as a forward-compatible channel name; AnimChannel's
// union should gain it when AircraftAnimations wires up ground roll.
const WHEEL_SPIN_CHANNEL = 'wheelSpin' as unknown as AnimChannel;

/** Cast a ComponentMeta into the loose bag finishMesh/userData expects. */
const asUserData = (cm: ComponentMeta): Record<string, unknown> => ({ ...cm });

/**
 * One wheel: tyre + hub, axle along local +Y (the spec's lateral axis) so no extra
 * rotation is needed — a CylinderGeometry's own axis already is +Y.
 */
function buildWheel(ctx: PartContext, name: string, radiusM: number, widthM: number, cm: ComponentMeta): THREE.Group {
  const wheel = new THREE.Group();
  wheel.name = name;

  const tyreSeg = seg(24, ctx.quality);
  const tyreGeo = new THREE.CylinderGeometry(ctx.m(radiusM), ctx.m(radiusM), ctx.m(widthM), tyreSeg);
  wheel.add(finishMesh(new THREE.Mesh(tyreGeo, ctx.mat.rubber), `${name}_TYRE`, asUserData(cm)));

  const hubSeg = seg(16, ctx.quality);
  const hubGeo = new THREE.CylinderGeometry(ctx.m(radiusM * 0.55), ctx.m(radiusM * 0.55), ctx.m(widthM * 1.05), hubSeg);
  wheel.add(finishMesh(new THREE.Mesh(hubGeo, ctx.mat.brushedMetal), `${name}_HUB`, asUserData(cm)));

  return wheel;
}

/** A cylinder whose own axis (Y) is rotated onto local +Z, hanging `lengthM` below local z=`topZM` (both relative to the pivot). */
function buildVerticalCylinder(
  ctx: PartContext, name: string, radiusM: number, lengthM: number, topZM: number, radialSeg: number, mat: THREE.Material, cm: ComponentMeta,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(ctx.m(radiusM), ctx.m(radiusM), ctx.m(lengthM), radialSeg);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2; // cylinder's Y axis -> local +Z (down-the-strut axis)
  mesh.position.z = ctx.m(topZM) - ctx.m(lengthM) / 2;
  return finishMesh(mesh, name, asUserData(cm));
}

interface GearConfig {
  nodeName: string;
  label: string;
  pivotX: number; // spec meters
  pivotY: number;
  pivotZ: number;
  wheelRadius: number;
  wheelSpacing: number; // centre-to-centre, meters
  retractAxis: 'x' | 'y';
  retractDeg: number;
  hasBrakes: boolean;
  hasLights: boolean;
}

/** Shared builder for both gear legs; nose/main differ only in the config above. */
function buildGear(ctx: PartContext, cfg: GearConfig): THREE.Group {
  const cm = meta(cfg.nodeName, 'LANDING_GEAR', cfg.label);
  const group = pivotGroup(cfg.nodeName, ctx.m(cfg.pivotX), ctx.m(cfg.pivotY), ctx.m(cfg.pivotZ));
  group.userData = asUserData(cm);

  const strutLength = cfg.pivotZ - (GROUND_Z + cfg.wheelRadius); // meters, top (pivot) to axle
  const axleZLocal = -strutLength; // local z of the axle, relative to the pivot
  const strutSeg = seg(16, ctx.quality);

  // STRUT: main oleo (upper cylinder) + a slightly slimmer lower slider that
  // telescopes inside it — a common two-piece oleo read at a glance.
  // NOTE: all child z offsets below are LOCAL (relative to this pivot group, which
  // already carries pivotZ in its own position) — 0 means "at the hinge".
  const oleo = buildVerticalCylinder(ctx, 'STRUT_OLEO', cfg.wheelRadius * 0.22, strutLength * 0.62, 0, strutSeg, ctx.mat.metal, cm);
  group.add(oleo);
  const slider = buildVerticalCylinder(
    ctx, 'STRUT_SLIDER', cfg.wheelRadius * 0.16, strutLength * 0.5, -strutLength * 0.5, strutSeg, ctx.mat.brushedMetal, cm,
  );
  group.add(slider);

  // TORQUE_LINKS: two small angled boxes (scissor link) below the oleo/slider joint.
  const torqueLinks = new THREE.Group();
  torqueLinks.name = 'TORQUE_LINKS';
  const linkGeo = new THREE.BoxGeometry(ctx.m(cfg.wheelRadius * 0.08), ctx.m(cfg.wheelRadius * 0.08), ctx.m(strutLength * 0.28));
  for (const sign of [1, -1] as const) {
    const link = new THREE.Mesh(linkGeo, ctx.mat.darkMetal);
    link.position.set(0, ctx.m(cfg.wheelRadius * 0.1 * sign), ctx.m(-strutLength * 0.62));
    link.rotation.x = sign * 12 * DEG; // scissor angle
    torqueLinks.add(finishMesh(link, `TORQUE_LINK_${sign > 0 ? 1 : 2}`, asUserData(cm)));
  }
  group.add(torqueLinks);

  // AXLE: horizontal bar along local Y connecting the two wheels.
  const axleGeo = new THREE.CylinderGeometry(ctx.m(cfg.wheelRadius * 0.12), ctx.m(cfg.wheelRadius * 0.12), ctx.m(cfg.wheelSpacing + 0.2), strutSeg);
  const axle = new THREE.Mesh(axleGeo, ctx.mat.darkMetal); // cylinder axis is already local Y — no rotation needed
  axle.position.z = ctx.m(axleZLocal);
  group.add(finishMesh(axle, 'AXLE', asUserData(cm)));

  // WHEELS: two, spaced `wheelSpacing` apart, centred on the strut. Each gets its
  // own continuous roll spin (axle is local +Y, so the spin axis is [0,1,0]).
  const halfSpacing = ctx.m(cfg.wheelSpacing / 2);
  const wheels: THREE.Group[] = [];
  [1, -1].forEach((sign, i) => {
    const wheel = buildWheel(ctx, `WHEEL_${i + 1}`, cfg.wheelRadius, GEAR.wheelWidth, cm);
    wheel.position.set(0, sign * halfSpacing, ctx.m(axleZLocal));
    setSpin(wheel, { channel: WHEEL_SPIN_CHANNEL, axis: [0, 1, 0] });
    group.add(wheel);
    wheels.push(wheel);
  });

  // BRAKES: thin discs inboard of each wheel hub, mains only.
  if (cfg.hasBrakes) {
    wheels.forEach((wheel, i) => {
      const brakeGeo = new THREE.CylinderGeometry(ctx.m(cfg.wheelRadius * 0.5), ctx.m(cfg.wheelRadius * 0.5), ctx.m(0.04), seg(16, ctx.quality));
      const brake = new THREE.Mesh(brakeGeo, ctx.mat.darkMetal);
      brake.position.copy(wheel.position);
      brake.position.y -= Math.sign(wheel.position.y || 1) * ctx.m(GEAR.wheelWidth * 0.55);
      group.add(finishMesh(brake, `BRAKE_${i + 1}`, asUserData(cm)));
    });
  }

  // ACTUATOR: thin angled cylinder from the strut up toward the fuselage/wing rib.
  const actGeo = new THREE.CylinderGeometry(ctx.m(cfg.wheelRadius * 0.09), ctx.m(cfg.wheelRadius * 0.09), ctx.m(strutLength * 0.55), seg(16, ctx.quality));
  const actuator = new THREE.Mesh(actGeo, ctx.mat.metal);
  actuator.position.set(ctx.m(strutLength * 0.12), ctx.m(cfg.wheelRadius * 0.35), ctx.m(-strutLength * 0.35));
  actuator.rotation.x = 28 * DEG;
  group.add(finishMesh(actuator, 'ACTUATOR', asUserData(cm)));

  // LANDING_LIGHT: nose gear only, two lens discs on the strut facing forward (+X).
  if (cfg.hasLights) {
    [1, -1].forEach((sign) => {
      const lensGeo = new THREE.CylinderGeometry(ctx.m(0.08), ctx.m(0.08), ctx.m(0.03), seg(16, ctx.quality));
      const lens = new THREE.Mesh(lensGeo, ctx.mat.lightLens);
      lens.rotation.z = -Math.PI / 2; // cylinder axis Y -> local +X (forward-facing lens)
      lens.position.set(ctx.m(0.05), sign * ctx.m(0.12), ctx.m(-strutLength * 0.32));
      group.add(finishMesh(lens, 'LANDING_LIGHT', asUserData(cm)));
    });
  }

  // GEAR_DOORS: one panel, hinged on a DOOR_PIVOT at the bay's edge. Both nose and
  // main doors rotate about local X: closed (flush, panel spans +Y from the hinge)
  // to open (hanging down beside the bay).
  const doorOffsetY = Math.min(cfg.wheelSpacing / 2 + cfg.wheelRadius + 0.2, FUSELAGE.radius * 1.4);
  const doorPivot = pivotGroup('DOOR_PIVOT', 0, ctx.m(doorOffsetY) * Math.sign(cfg.pivotY || 1), 0);
  const panelLength = cfg.wheelSpacing + cfg.wheelRadius * 2;
  const panelGeo = new THREE.BoxGeometry(ctx.m(cfg.wheelRadius * 3), ctx.m(panelLength), ctx.m(0.05));
  const panel = new THREE.Mesh(panelGeo, ctx.mat.paintWhite);
  panel.position.y = (ctx.m(panelLength) / 2) * -Math.sign(cfg.pivotY || 1); // hang toward the centreline side of the hinge
  doorPivot.add(finishMesh(panel, 'GEAR_DOOR_PANEL', asUserData(cm)));
  group.add(doorPivot);

  // ANIM: the whole group IS the retraction hinge (product.md §17), so the 'gear'
  // channel hinges the group itself about the real pivot. The bay door is a
  // separate hinge on its own 'gearDoors' channel (0 closed/flush -> 1 open),
  // matching every other *Doors channel's convention; AircraftAnimations is
  // responsible for sequencing 'gear' and 'gearDoors' together over time.
  setHinge(group, { channel: 'gear', axis: cfg.retractAxis === 'y' ? [0, 1, 0] : [1, 0, 0], deg: cfg.retractDeg });
  setHinge(doorPivot, { channel: 'gearDoors', axis: [1, 0, 0], deg: DOOR_OPEN_DEG });

  const tris = countTriangles(group);
  ctx.log.info('landing gear built', { node: cfg.nodeName, triangles: tris });

  return group;
}

export const buildNoseGear: PartBuilder = (ctx: PartContext) =>
  buildGear(ctx, {
    nodeName: NODE.GEAR_NOSE,
    label: 'Nose Gear',
    pivotX: GEAR.noseX,
    pivotY: 0,
    pivotZ: GEAR.noseAttachZ,
    wheelRadius: GEAR.noseWheelRadius,
    wheelSpacing: 0.45,
    retractAxis: 'y',
    retractDeg: NOSE_RETRACT_DEG,
    hasBrakes: false,
    hasLights: true,
  });

export const buildMainGearRight: PartBuilder = (ctx: PartContext) =>
  buildGear(ctx, {
    nodeName: NODE.GEAR_MAIN_R,
    label: 'Main Gear Right',
    pivotX: GEAR.mainX,
    pivotY: -GEAR.mainY,
    pivotZ: GEAR.mainAttachZ,
    wheelRadius: GEAR.mainWheelRadius,
    wheelSpacing: 0.55,
    retractAxis: 'x',
    retractDeg: MAIN_RETRACT_DEG,
    hasBrakes: true,
    hasLights: false,
  });
