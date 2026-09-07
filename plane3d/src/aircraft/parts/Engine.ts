// AIRCRAFT-001 engine builder (product.md §16). Builds the LEFT (−Y) underwing
// turbofan only; the assembler mirrors this with mirrorObjectY() to produce ENGINE_R
// (product.md Rule 2 — never hand-author both sides).
//
// Local frame: the returned group is positioned at the nacelle's intake-lip station
// (x = ENGINE.intakeX, y = -ENGINE.y, z = ENGINE.z) in scene units. Every child is
// authored relative to that origin: local +X is forward (toward the lip, x≈0),
// local -X runs aft along the nacelle/core/exhaust. All numbers below are converted
// from spec meters to scene units through ctx.m() (aliased M) before use.
import * as THREE from 'three';
import { ENGINE, WING, meta } from '../AircraftSpec';
import { latheAroundX, pivotGroup, finishMesh, countTriangles } from '../../core/geometry';
import { seg } from '../../core/quality';
import { setHinge, setSpin } from './PartContext';
import type { PartContext, PartBuilder } from './PartContext';

export const buildEngineRight: PartBuilder = (ctx: PartContext): THREE.Object3D => {
  const M = ctx.m;
  const mat = ctx.mat;

  // Spec-meter dimensions pulled straight from ENGINE — never invented.
  const L = ENGINE.nacelleLength;
  const R = ENGINE.nacelleRadius;
  const fanR = ENGINE.fanRadius;
  const coreR = ENGINE.coreRadius;
  const coreL = ENGINE.coreLength;

  // Shared metadata: every mesh reports component ENGINE_L so picking/selection
  // resolves to the engine as a whole (per task spec); each mesh gets its own copy
  // so nothing shares a mutable userData object.
  // Cast to Record<string, unknown> to satisfy finishMesh's userData param — the
  // ComponentMeta shape itself is unchanged, only its structural type here.
  const engineMeta = (): Record<string, unknown> =>
    meta('ENGINE_R', 'PROPULSION', 'Engine Right') as unknown as Record<string, unknown>;

  const group = new THREE.Group();
  group.name = 'ENGINE_R';
  group.userData = engineMeta();
  // Place the group at the intake-lip station: forward-most point of the nacelle.
  group.position.set(M(ENGINE.intakeX), M(-ENGINE.y), M(ENGINE.z));

  // ---- INTAKE_LIP -----------------------------------------------------------
  // A torus ring at the forward face (local x=0) standing slightly proud of the
  // nacelle skin, per the "intake lip radius slightly > nacelleRadius" rule.
  const lipRadius = R * 1.02;
  const lipTube = R * 0.07;
  const lipGeo = new THREE.TorusGeometry(M(lipRadius), M(lipTube), seg(16, ctx.quality, 6), seg(32, ctx.quality));
  // TorusGeometry's default axis is +Z; rotate it onto the nacelle's +X axis.
  lipGeo.rotateY(Math.PI / 2);
  const intakeLip = finishMesh(new THREE.Mesh(lipGeo, mat.brushedMetal), 'INTAKE_LIP', engineMeta());
  group.add(intakeLip);

  // ---- NACELLE ---------------------------------------------------------------
  // Lathe body around local X. Profile starts just aft of the lip (flush with it),
  // bulges to the full nacelleRadius at ~35% length, then tapers to ~0.75R aft.
  const nacelleProfile: Array<[number, number]> = [
    [M(-0.02 * L), M(R * 1.0)],
    [M(-0.1 * L), M(R * 1.0)],
    [M(-0.35 * L), M(R)],
    [M(-0.7 * L), M(R * 0.92)],
    [M(-L), M(R * 0.75)],
  ];
  const nacelleGeo = latheAroundX(nacelleProfile, seg(48, ctx.quality));
  const nacelle = finishMesh(new THREE.Mesh(nacelleGeo, mat.paintWhite), 'NACELLE', engineMeta());
  group.add(nacelle);

  // ---- FAN (pivot group: spinner + blades) -----------------------------------
  // Sits just inside the intake lip. Rotating this pivot about local X animates
  // the fan spinning.
  const fanX = -0.08 * L;
  const fan = pivotGroup('FAN', M(fanX), 0, 0);
  fan.userData = engineMeta();

  // Spinner: small cone, apex forward (+X), nested at the fan disc centre.
  const spinnerR = fanR * 0.22;
  const spinnerLen = fanR * 0.4;
  const spinnerGeo = new THREE.ConeGeometry(M(spinnerR), M(spinnerLen), seg(24, ctx.quality));
  // ConeGeometry apex is at local +Y; rotate -90° about Z so the apex points +X (forward).
  spinnerGeo.rotateZ(-Math.PI / 2);
  spinnerGeo.translate(M(spinnerLen * 0.3), 0, 0);
  const spinner = finishMesh(new THREE.Mesh(spinnerGeo, mat.darkMetal), 'SPINNER', engineMeta());
  fan.add(spinner);

  // Blades: ~24 thin radial fins built as ONE InstancedMesh (cheap, single draw call).
  // A base blade box is authored radially from the spinner surface to the fan tip,
  // then each instance is just a rotation about local X at an even angular step.
  const bladeCount = 24;
  const bladeGeo = new THREE.BoxGeometry(M(0.05 * fanR), M(0.12 * fanR), M(fanR - spinnerR));
  // Push the box out along local Z so it spans [spinnerR, fanR] radially before rotation.
  bladeGeo.translate(0, 0, M((spinnerR + fanR) / 2));
  const blades = new THREE.InstancedMesh(bladeGeo, mat.metal, bladeCount);
  const bladeMatrix = new THREE.Matrix4();
  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2;
    bladeMatrix.makeRotationX(angle);
    blades.setMatrixAt(i, bladeMatrix);
  }
  blades.instanceMatrix.needsUpdate = true;
  blades.name = 'FAN_BLADES';
  blades.castShadow = true;
  blades.receiveShadow = true;
  blades.userData = engineMeta();
  fan.add(blades);
  group.add(fan);

  // ---- FAN_CASE ---------------------------------------------------------------
  // Thin open-ended ring around the fan plane (the visible metal band inside the lip).
  const fanCaseGeo = new THREE.CylinderGeometry(M(fanR * 1.03), M(fanR * 1.03), M(0.1 * L), seg(32, ctx.quality), 1, true);
  // CylinderGeometry's height axis is +Y; rotate +90° about Z to align it to local +X.
  fanCaseGeo.rotateZ(Math.PI / 2);
  fanCaseGeo.translate(M(fanX), 0, 0);
  const fanCase = finishMesh(new THREE.Mesh(fanCaseGeo, mat.metal), 'FAN_CASE', engineMeta());
  group.add(fanCase);

  // ---- PYLON -------------------------------------------------------------------
  // Swept box from the nacelle top up to the wing underside (WING.rootZ - 0.2),
  // per the task's attachment rule. Local z is relative to ENGINE.z, so subtract it
  // from the global wing target to get the local top-of-pylon height.
  const nacelleTopLocalZ = R; // top of nacelle skin near the pylon's chordwise station
  const pylonTopLocalZ = WING.rootZ - 0.2 - ENGINE.z;
  const pylonHeight = pylonTopLocalZ - nacelleTopLocalZ;
  const pylonX = -0.45 * L; // centred over the nacelle, biased slightly aft
  const pylonGeo = new THREE.BoxGeometry(M(ENGINE.pylon.length), M(ENGINE.pylon.thickness), M(pylonHeight));
  pylonGeo.translate(M(pylonX), 0, M(nacelleTopLocalZ + pylonHeight / 2));
  const pylon = finishMesh(new THREE.Mesh(pylonGeo, mat.paintWhite), 'PYLON', engineMeta());
  group.add(pylon);

  // ---- BYPASS_DUCT ---------------------------------------------------------------
  // Inner annulus wall visible looking into the aft of the nacelle (open-ended tube).
  const ductGeo = new THREE.CylinderGeometry(M(R * 0.75 * 0.85), M(R * 0.75 * 0.85), M(0.05 * L), seg(32, ctx.quality), 1, true);
  ductGeo.rotateZ(Math.PI / 2);
  ductGeo.translate(M(-L), 0, 0);
  const bypassDuct = finishMesh(new THREE.Mesh(ductGeo, mat.metal), 'BYPASS_DUCT', engineMeta());
  group.add(bypassDuct);

  // ---- REVERSER ------------------------------------------------------------------
  // Short ring aft of the main cowl; the reverser animation translates it further aft.
  const reverserBaseX = -L - 0.05 * L;
  const reverserGeo = new THREE.CylinderGeometry(M(R * 0.78), M(R * 0.78), M(0.08 * L), seg(32, ctx.quality), 1, true);
  reverserGeo.rotateZ(Math.PI / 2);
  const reverser = finishMesh(new THREE.Mesh(reverserGeo, mat.darkMetal), 'REVERSER', engineMeta());
  reverser.position.set(M(reverserBaseX), 0, 0);
  group.add(reverser);

  // ---- CORE ------------------------------------------------------------------
  // Protrudes aft from the bypass duct, tapering slightly toward the exhaust nozzle.
  const coreProfile: Array<[number, number]> = [
    [M(-L), M(coreR * 1.05)],
    [M(-(L + coreL * 0.5)), M(coreR)],
    [M(-(L + coreL)), M(coreR * 0.85)],
  ];
  const coreGeo = latheAroundX(coreProfile, seg(32, ctx.quality));
  const core = finishMesh(new THREE.Mesh(coreGeo, mat.darkMetal), 'CORE', engineMeta());
  group.add(core);

  // ---- EXHAUST_NOZZLE --------------------------------------------------------
  // Cone tapering to a point aft of the core, hot-section finish.
  const nozzleLen = coreL * 0.4;
  const nozzleGeo = new THREE.ConeGeometry(M(coreR * 0.85), M(nozzleLen), seg(32, ctx.quality));
  // Apex at local +Y by default; rotate +90° about Z so the apex points -X (aft).
  nozzleGeo.rotateZ(Math.PI / 2);
  nozzleGeo.translate(M(-(L + coreL) - nozzleLen / 2), 0, 0);
  const exhaustNozzle = finishMesh(new THREE.Mesh(nozzleGeo, mat.exhaustHot), 'EXHAUST_NOZZLE', engineMeta());
  group.add(exhaustNozzle);

  // ---- Animation metadata (declarative; survives mirroring and GLB export) -------
  // engine channel: value 0..1 = one full revolution of the fan pivot about local X.
  setSpin(fan, { channel: 'engine', axis: [1, 0, 0] });
  // reverser channel: 0..1 slides the reverser ring aft by up to 0.35 m (spec meters).
  setHinge(reverser, { channel: 'reverser', axis: [1, 0, 0], deg: 0, translate: [-M(0.35), 0, 0] });

  const triangles = countTriangles(group);
  ctx.log.info('engine built', { triangles });

  return group;
};
