/**
 * engine_model.js - High-Bypass Turbofan Engine 3D Cutaway Generator (Three.js)
 *
 * Replicates the turbofan jet engine cutaway with:
 * - Fan Module: Parabolic spinner cone, 20 wide-chord curved titanium aerofoil blades, fan containment case.
 * - Low-Pressure Compressor (Booster): 3 bladed rotor disks on N1 shaft.
 * - High-Pressure Compressor (HPC): 9 progressive stepped bladed stages on N2 drum spool.
 * - Combustor Section: Annular liner with swirlers, air dilution holes, fuel injectors & glowing flame tube.
 * - High-Pressure Turbine (HPT): 2 high-temp single-crystal alloy turbine stages driving N2.
 * - Low-Pressure Turbine (LPT): 5 flared multi-stage turbine disks driving the N1 fan shaft.
 * - Exhaust & Mixer: Serrated chevron mixer petals, inner core nozzle, burnished copper/bronze tail cone.
 * - Nacelle & Bypass Duct: Quarter/half cutaway casing, acoustic liner, structural outlet guide vanes, hydraulic conduits.
 * - Animation & Physics: Dual-spool independent rotation (N1 low-speed, N2 high-speed), exploded view translation,
 *   and thermodynamic airflow particle streamlines.
 */

import * as THREE from 'three';

export function createTurbofanEngine(options = {}) {
  const {
    scale = 1.0,
    showAirflow = false,
  } = options;

  const engineGroup = new THREE.Group();
  engineGroup.name = 'TurbofanEngineCutaway';

  // Master module containers for exploded view translation
  const modules = {
    intakeCowl: new THREE.Group(),
    fanModule: new THREE.Group(),
    lpcModule: new THREE.Group(),
    hpcModule: new THREE.Group(),
    combustorModule: new THREE.Group(),
    hptModule: new THREE.Group(),
    lptModule: new THREE.Group(),
    exhaustModule: new THREE.Group(),
    nacelleModule: new THREE.Group(),
    airflowModule: new THREE.Group(),
  };

  // Rotating spools
  const n1Spool = new THREE.Group(); // Low-pressure: Fan + Booster (LPC) + N1 shaft + LPT
  const n2Spool = new THREE.Group(); // High-pressure: HPC + N2 drum + HPT

  n1Spool.name = 'N1_LowPressureSpool';
  n2Spool.name = 'N2_HighPressureSpool';

  // Base dimensions (X = axial length from intake to exhaust, Y = vertical, Z = depth towards viewer)
  const L = {
    intakeLip: -3.6,
    fan: -2.8,
    lpcStart: -2.3,
    lpcEnd: -1.3,
    hpcStart: -1.2,
    hpcEnd: 0.8,
    combustorStart: 0.9,
    combustorEnd: 1.8,
    hptStart: 1.9,
    hptEnd: 2.3,
    lptStart: 2.4,
    lptEnd: 3.9,
    exhaustEnd: 4.9,
    tailConeTip: 6.0,
  };

  const R = {
    fanCasing: 1.78,
    fanRotor: 1.58,
    fanHub: 0.52,
    coreCowlFront: 0.96,
    coreCowlRear: 0.82,
    hpcFront: 0.78,
    hpcRear: 0.46,
    combustorOuter: 0.64,
    combustorInner: 0.34,
    turbineFront: 0.52,
    turbineRear: 0.88,
    exhaustNozzle: 0.92,
    tailConeBase: 0.55,
    n1Shaft: 0.085,
    n2Shaft: 0.165,
  };

  // Cutaway angle configuration:
  // With lathe geometry rotated -90 deg around Z:
  // phi = -PI/3 (5*PI/3) to PI + PI/3 spans the bottom and back (240 deg), leaving top-front 120 deg open.
  const CUT_START = -Math.PI * 0.35;
  const CUT_LEN = Math.PI * 1.35; // 243 degrees of casing solid, ~117 degrees open at top-front

  /* ============================================================
     1. PBR MATERIALS
     ============================================================ */
  const materials = {
    nacelleWhite: new THREE.MeshStandardMaterial({
      color: 0xf4f6f9,
      roughness: 0.18,
      metalness: 0.12,
      side: THREE.DoubleSide,
    }),
    nacelleInnerAcoustic: new THREE.MeshStandardMaterial({
      color: 0x363a42,
      roughness: 0.85,
      metalness: 0.35,
      side: THREE.DoubleSide,
    }),
    cutawayRim: new THREE.MeshStandardMaterial({
      color: 0x8a929e,
      roughness: 0.32,
      metalness: 0.85,
      side: THREE.DoubleSide,
    }),
    fanBladeTitanium: new THREE.MeshStandardMaterial({
      color: 0x1e2126,
      roughness: 0.22,
      metalness: 0.88,
    }),
    titaniumAlloy: new THREE.MeshStandardMaterial({
      color: 0xb2b8c4,
      roughness: 0.24,
      metalness: 0.86,
    }),
    polishedSteel: new THREE.MeshStandardMaterial({
      color: 0xecf0f8,
      roughness: 0.14,
      metalness: 0.96,
    }),
    nickelSuperalloy: new THREE.MeshStandardMaterial({
      color: 0xc4cad6,
      roughness: 0.28,
      metalness: 0.90,
    }),
    combustorLiner: new THREE.MeshStandardMaterial({
      color: 0x282a30,
      roughness: 0.65,
      metalness: 0.65,
      side: THREE.DoubleSide,
    }),
    flameGlow: new THREE.MeshStandardMaterial({
      color: 0xff7700,
      emissive: 0xff5500,
      emissiveIntensity: 4.2,
      roughness: 0.4,
      transparent: true,
      opacity: 0.9,
    }),
    exhaustBronze: new THREE.MeshStandardMaterial({
      color: 0x9e5f3d,
      roughness: 0.32,
      metalness: 0.82,
    }),
    chevronMixer: new THREE.MeshStandardMaterial({
      color: 0x625b54,
      roughness: 0.38,
      metalness: 0.85,
      side: THREE.DoubleSide,
    }),
    conduitCopper: new THREE.MeshStandardMaterial({
      color: 0xbf7838,
      roughness: 0.26,
      metalness: 0.88,
    }),
    conduitSteel: new THREE.MeshStandardMaterial({
      color: 0x949da8,
      roughness: 0.32,
      metalness: 0.88,
    }),
    spinnerSpiral: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.1,
    }),
  };

  /* ============================================================
     2. HELPER PROCEDURAL GEOMETRIES
     ============================================================ */

  // Curved aerofoil blade generator
  function createAirfoilBlade(length, rootChord, tipChord, twistDeg, camber = 0.08) {
    const pts = [
      [0, 0],
      [0.25, 0.05 + camber],
      [0.6, 0.04 + camber * 0.7],
      [1.0, 0],
      [0.6, -0.02],
      [0.25, -0.03],
      [0, 0],
    ];

    const geom = new THREE.BufferGeometry();
    const segsY = 12;
    const segsProfile = pts.length;
    const positions = [];
    const indices = [];
    const uvs = [];

    const twistRad = (twistDeg * Math.PI) / 180;

    for (let j = 0; j <= segsY; j++) {
      const v = j / segsY;
      const y = v * length;
      const chord = THREE.MathUtils.lerp(rootChord, tipChord, v);
      const angle = v * twistRad;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      for (let i = 0; i < segsProfile; i++) {
        const px = (pts[i][0] - 0.3) * chord;
        const pz = pts[i][1] * chord;

        const rx = px * cosA - pz * sinA;
        const rz = px * sinA + pz * cosA;

        positions.push(rx, y, rz);
        uvs.push(i / segsProfile, v);
      }
    }

    for (let j = 0; j < segsY; j++) {
      for (let i = 0; i < segsProfile - 1; i++) {
        const a = j * segsProfile + i;
        const b = (j + 1) * segsProfile + i;
        const c = (j + 1) * segsProfile + i + 1;
        const d = j * segsProfile + i + 1;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  // Bladed Disk Stage Generator
  function createBladedDisk({
    count = 24,
    hubRadius = 0.5,
    tipRadius = 0.9,
    hubWidth = 0.12,
    bladeChord = 0.08,
    twist = 20,
    material = materials.titaniumAlloy,
    bladeMaterial = materials.polishedSteel,
    reverseAngle = false,
  }) {
    const stageGroup = new THREE.Group();

    // Central hub drum
    const hubGeom = new THREE.CylinderGeometry(hubRadius, hubRadius, hubWidth, 32);
    hubGeom.rotateZ(Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeom, material);
    stageGroup.add(hubMesh);

    // Beveled rim on hub
    const rimGeom = new THREE.TorusGeometry(hubRadius, 0.015, 8, 32);
    rimGeom.rotateY(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeom, materials.cutawayRim);
    stageGroup.add(rimMesh);

    // Individual aerofoil blades arranged radially around the hub
    const bladeLen = tipRadius - hubRadius;
    const bladeGeom = createAirfoilBlade(bladeLen, bladeChord, bladeChord * 0.72, twist);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const bladeMesh = new THREE.Mesh(bladeGeom, bladeMaterial);

      bladeMesh.position.set(0, Math.cos(angle) * hubRadius, Math.sin(angle) * hubRadius);
      bladeMesh.rotation.x = -angle + Math.PI / 2;
      if (reverseAngle) {
        bladeMesh.rotation.y = Math.PI;
      }
      stageGroup.add(bladeMesh);
    }

    return stageGroup;
  }

  // Sliced Cutaway Shell Generator (Lathe along X-axis with cutaway sector)
  function createCutawayShell(points, startAngle = CUT_START, lengthAngle = CUT_LEN, material = materials.nacelleWhite) {
    const geom = new THREE.LatheGeometry(points, 48, startAngle, lengthAngle);
    geom.rotateZ(-Math.PI / 2);
    return new THREE.Mesh(geom, material);
  }

  /* ============================================================
     3. BUILD N1 SPOOL (Fan + Booster LPC + Central Shaft + LPT)
     ============================================================ */

  // 3.1 Fan Spinner Cone & 20 Wide-Chord Swept Blades
  const fanGroup = new THREE.Group();
  fanGroup.position.x = L.fan;

  // Spinner cone (parabolic nosecone)
  const spinnerPts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const x = (1 - t) * 1.05;
    const r = Math.pow(t, 0.65) * R.fanHub;
    spinnerPts.push(new THREE.Vector2(r, -x));
  }
  const spinnerGeom = new THREE.LatheGeometry(spinnerPts, 32);
  spinnerGeom.rotateZ(-Math.PI / 2);
  const spinner = new THREE.Mesh(spinnerGeom, materials.fanBladeTitanium);
  fanGroup.add(spinner);

  // Spinner white painted swirl marking
  const spiralCurvePts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = -(1 - t) * 1.02;
    const r = Math.pow(t, 0.65) * (R.fanHub + 0.005);
    const theta = t * Math.PI * 3.5;
    spiralCurvePts.push(new THREE.Vector3(x, Math.cos(theta) * r, Math.sin(theta) * r));
  }
  const spiralGeom = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(spiralCurvePts),
    48,
    0.015,
    6,
    false
  );
  const spiral = new THREE.Mesh(spiralGeom, materials.spinnerSpiral);
  fanGroup.add(spiral);

  // 20 Titanium wide-chord swept fan blades
  const FAN_BLADES = 20;
  const fanBladeLen = R.fanRotor - R.fanHub;
  const fanBladeGeom = createAirfoilBlade(fanBladeLen, 0.44, 0.30, 42, 0.14);

  for (let i = 0; i < FAN_BLADES; i++) {
    const angle = (i / FAN_BLADES) * Math.PI * 2;
    const blade = new THREE.Mesh(fanBladeGeom, materials.fanBladeTitanium);
    blade.position.set(0, Math.cos(angle) * R.fanHub, Math.sin(angle) * R.fanHub);
    blade.rotation.x = -angle + Math.PI / 2;
    blade.rotation.z = -0.15; // aerodynamic sweep
    fanGroup.add(blade);
  }
  modules.fanModule.add(fanGroup);
  n1Spool.add(modules.fanModule);

  // 3.2 Low-Pressure Compressor (Booster) - 3 Stages
  const lpcGroup = new THREE.Group();
  const lpcStages = 3;
  for (let s = 0; s < lpcStages; s++) {
    const t = s / (lpcStages - 1);
    const xPos = THREE.MathUtils.lerp(L.lpcStart, L.lpcEnd, t);
    const stageR = THREE.MathUtils.lerp(0.86, 0.77, t);
    const disk = createBladedDisk({
      count: 28 + s * 4,
      hubRadius: R.fanHub * 0.88,
      tipRadius: stageR,
      hubWidth: 0.15,
      bladeChord: 0.105,
      twist: 26 - s * 2,
      material: materials.titaniumAlloy,
      bladeMaterial: materials.polishedSteel,
    });
    disk.position.x = xPos;
    lpcGroup.add(disk);
  }
  modules.lpcModule.add(lpcGroup);
  n1Spool.add(modules.lpcModule);

  // 3.3 Central N1 Low-Speed Drive Shaft
  const n1ShaftGeom = new THREE.CylinderGeometry(
    R.n1Shaft,
    R.n1Shaft,
    L.tailConeTip - L.fan,
    32
  );
  n1ShaftGeom.rotateZ(Math.PI / 2);
  const n1ShaftMesh = new THREE.Mesh(n1ShaftGeom, materials.polishedSteel);
  n1ShaftMesh.position.x = (L.fan + L.tailConeTip) / 2;
  n1Spool.add(n1ShaftMesh);

  // 3.4 Low-Pressure Turbine (LPT) - 5 Flared Stages
  const lptGroup = new THREE.Group();
  const lptStages = 5;
  for (let s = 0; s < lptStages; s++) {
    const t = s / (lptStages - 1);
    const xPos = THREE.MathUtils.lerp(L.lptStart, L.lptEnd, t);
    const tipR = THREE.MathUtils.lerp(0.64, R.turbineRear, t);
    const hubR = THREE.MathUtils.lerp(0.38, 0.48, t);
    const disk = createBladedDisk({
      count: 42 + s * 6,
      hubRadius: hubR,
      tipRadius: tipR,
      hubWidth: 0.17,
      bladeChord: 0.088,
      twist: -32,
      material: materials.nickelSuperalloy,
      bladeMaterial: materials.polishedSteel,
      reverseAngle: true,
    });
    disk.position.x = xPos;
    lptGroup.add(disk);
  }
  modules.lptModule.add(lptGroup);
  n1Spool.add(modules.lptModule);

  /* ============================================================
     4. BUILD N2 SPOOL (High-Pressure Compressor + Drum + HPT)
     ============================================================ */

  // 4.1 High-Pressure Compressor (HPC) - 9 Stepped Stages
  const hpcGroup = new THREE.Group();
  const hpcStages = 9;

  // Hollow N2 outer drum spool
  const n2DrumPts = [];
  for (let s = 0; s < hpcStages; s++) {
    const t = s / (hpcStages - 1);
    const xPos = THREE.MathUtils.lerp(L.hpcStart, L.hpcEnd, t);
    const hubR = THREE.MathUtils.lerp(0.48, 0.36, t);
    n2DrumPts.push(new THREE.Vector2(hubR, xPos));
  }
  const n2DrumGeom = new THREE.LatheGeometry(n2DrumPts, 32);
  n2DrumGeom.rotateZ(-Math.PI / 2);
  const n2Drum = new THREE.Mesh(n2DrumGeom, materials.titaniumAlloy);
  hpcGroup.add(n2Drum);

  for (let s = 0; s < hpcStages; s++) {
    const t = s / (hpcStages - 1);
    const xPos = THREE.MathUtils.lerp(L.hpcStart, L.hpcEnd, t);
    const tipR = THREE.MathUtils.lerp(R.hpcFront, R.hpcRear, t);
    const hubR = THREE.MathUtils.lerp(0.48, 0.36, t);

    const disk = createBladedDisk({
      count: 36 + s * 4,
      hubRadius: hubR,
      tipRadius: tipR,
      hubWidth: 0.095,
      bladeChord: 0.068 - s * 0.003,
      twist: 28 - s * 1.5,
      material: materials.titaniumAlloy,
      bladeMaterial: materials.polishedSteel,
    });
    disk.position.x = xPos;
    hpcGroup.add(disk);

    // Stator interlocking rings
    if (s < hpcStages - 1) {
      const statorR = tipR + 0.015;
      const statorRing = new THREE.Mesh(
        new THREE.RingGeometry(statorR - 0.012, statorR, 32),
        materials.cutawayRim
      );
      statorRing.rotation.y = Math.PI / 2;
      statorRing.position.x = xPos + 0.08;
      hpcGroup.add(statorRing);
    }
  }
  modules.hpcModule.add(hpcGroup);
  n2Spool.add(modules.hpcModule);

  // 4.2 High-Pressure Turbine (HPT) - 2 Single-Crystal Stages
  const hptGroup = new THREE.Group();
  const hptStages = 2;
  for (let s = 0; s < hptStages; s++) {
    const t = s / (hptStages - 1);
    const xPos = THREE.MathUtils.lerp(L.hptStart, L.hptEnd, t);
    const disk = createBladedDisk({
      count: 48,
      hubRadius: 0.32,
      tipRadius: R.turbineFront + s * 0.045,
      hubWidth: 0.14,
      bladeChord: 0.078,
      twist: -36,
      material: materials.nickelSuperalloy,
      bladeMaterial: materials.polishedSteel,
      reverseAngle: true,
    });
    disk.position.x = xPos;
    hptGroup.add(disk);
  }
  modules.hptModule.add(hptGroup);
  n2Spool.add(modules.hptModule);

  /* ============================================================
     5. COMBUSTION CHAMBER (Annular Combustor & Flame Core)
     ============================================================ */
  const combustorGroup = new THREE.Group();

  const combustorOuterPts = [
    new THREE.Vector2(R.combustorOuter * 0.88, L.combustorStart),
    new THREE.Vector2(R.combustorOuter, L.combustorStart + 0.3),
    new THREE.Vector2(R.combustorOuter * 0.95, L.combustorEnd - 0.2),
    new THREE.Vector2(R.combustorOuter * 0.82, L.combustorEnd),
  ];
  const combustorInnerPts = [
    new THREE.Vector2(R.combustorInner * 1.15, L.combustorStart),
    new THREE.Vector2(R.combustorInner, L.combustorStart + 0.3),
    new THREE.Vector2(R.combustorInner * 1.05, L.combustorEnd - 0.2),
    new THREE.Vector2(R.combustorInner * 1.2, L.combustorEnd),
  ];

  const outerCombustorShell = createCutawayShell(combustorOuterPts, CUT_START, CUT_LEN, materials.combustorLiner);
  const innerCombustorShell = createCutawayShell(combustorInnerPts, CUT_START, CUT_LEN, materials.combustorLiner);

  combustorGroup.add(outerCombustorShell);
  combustorGroup.add(innerCombustorShell);

  // Dilution hole patterns & swirlers
  const NOZZLES = 16;
  const nozzleRadius = (R.combustorOuter + R.combustorInner) * 0.5;
  for (let i = 0; i < NOZZLES; i++) {
    const angle = (i / NOZZLES) * Math.PI * 2;
    const nozzleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.038, 0.12, 12),
      materials.conduitCopper
    );
    nozzleMesh.rotateZ(Math.PI / 2);
    nozzleMesh.position.set(
      L.combustorStart + 0.12,
      Math.cos(angle) * nozzleRadius,
      Math.sin(angle) * nozzleRadius
    );
    combustorGroup.add(nozzleMesh);

    // Fuel feed tube
    const feedTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8),
      materials.conduitSteel
    );
    feedTube.position.set(
      L.combustorStart + 0.06,
      Math.cos(angle) * (nozzleRadius + 0.14),
      Math.sin(angle) * (nozzleRadius + 0.14)
    );
    feedTube.rotation.x = -angle;
    combustorGroup.add(feedTube);
  }

  // Glowing Flame Core Tube inside the combustor
  const flamePts = [
    new THREE.Vector2(nozzleRadius * 0.92, L.combustorStart + 0.2),
    new THREE.Vector2(nozzleRadius * 1.05, (L.combustorStart + L.combustorEnd) * 0.5),
    new THREE.Vector2(nozzleRadius * 0.95, L.combustorEnd - 0.1),
  ];
  const flameMesh = createCutawayShell(flamePts, CUT_START + 0.08, CUT_LEN - 0.16, materials.flameGlow);
  combustorGroup.add(flameMesh);

  modules.combustorModule.add(combustorGroup);

  /* ============================================================
     6. EXHAUST & CHEVRON NOZZLE MODULE
     ============================================================ */
  const exhaustGroup = new THREE.Group();

  // Central conical tail cone
  const tailConePts = [
    new THREE.Vector2(R.tailConeBase, L.lptEnd + 0.1),
    new THREE.Vector2(R.tailConeBase * 0.78, L.exhaustEnd),
    new THREE.Vector2(0.01, L.tailConeTip),
  ];
  const tailConeGeom = new THREE.LatheGeometry(tailConePts, 32);
  tailConeGeom.rotateZ(-Math.PI / 2);
  const tailCone = new THREE.Mesh(tailConeGeom, materials.exhaustBronze);
  exhaustGroup.add(tailCone);

  // Core exhaust nozzle ring with serrated chevron petals
  const CHEVRONS = 16;
  const chevronRingR = R.exhaustNozzle;
  const chevronL = 0.55;

  const chevronShellPts = [
    new THREE.Vector2(chevronRingR * 1.02, L.lptEnd),
    new THREE.Vector2(chevronRingR, L.exhaustEnd - chevronL),
  ];
  const chevronBase = createCutawayShell(chevronShellPts, CUT_START, CUT_LEN, materials.chevronMixer);
  exhaustGroup.add(chevronBase);

  // Chevron serration petals
  for (let i = 0; i < CHEVRONS; i++) {
    const angle = (i / CHEVRONS) * Math.PI * 2;
    // Only place petals on the solid portion
    const petalGeom = new THREE.BufferGeometry();
    const w = ((Math.PI * 2) / CHEVRONS) * chevronRingR * 0.92;
    const verts = new Float32Array([
      -w / 2, 0, 0,
       w / 2, 0, 0,
       0, -chevronL, 0.04,
    ]);
    petalGeom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    petalGeom.computeVertexNormals();
    const petal = new THREE.Mesh(petalGeom, materials.chevronMixer);

    petal.position.set(
      L.exhaustEnd - chevronL,
      Math.cos(angle) * chevronRingR,
      Math.sin(angle) * chevronRingR
    );
    petal.rotation.y = -Math.PI / 2;
    petal.rotation.x = -angle;
    exhaustGroup.add(petal);
  }

  modules.exhaustModule.add(exhaustGroup);

  /* ============================================================
     7. NACELLE CASING & BYPASS DUCT (Cutaway Outer Structure)
     ============================================================ */
  const nacelleGroup = new THREE.Group();

  // Outer nacelle skin profile with cutaway
  const nacelleOuterPts = [
    new THREE.Vector2(R.fanCasing * 0.94, L.intakeLip),
    new THREE.Vector2(R.fanCasing * 1.06, L.intakeLip + 0.4),
    new THREE.Vector2(R.fanCasing * 1.08, L.fan + 0.2),
    new THREE.Vector2(R.fanCasing * 1.02, L.hpcStart),
    new THREE.Vector2(R.fanCasing * 0.96, L.combustorStart),
    new THREE.Vector2(R.fanCasing * 0.88, L.lptStart),
    new THREE.Vector2(R.exhaustNozzle * 1.08, L.lptEnd + 0.4),
  ];
  const nacelleOuter = createCutawayShell(nacelleOuterPts, CUT_START, CUT_LEN, materials.nacelleWhite);
  nacelleGroup.add(nacelleOuter);

  // Inner acoustic dampening liner
  const nacelleInnerPts = [
    new THREE.Vector2(R.fanCasing * 0.92, L.intakeLip),
    new THREE.Vector2(R.fanCasing * 0.98, L.intakeLip + 0.4),
    new THREE.Vector2(R.fanCasing * 0.99, L.fan + 0.2),
    new THREE.Vector2(R.fanCasing * 0.94, L.hpcStart),
    new THREE.Vector2(R.fanCasing * 0.88, L.combustorStart),
    new THREE.Vector2(R.fanCasing * 0.80, L.lptStart),
    new THREE.Vector2(R.exhaustNozzle * 1.02, L.lptEnd + 0.4),
  ];
  const nacelleInner = createCutawayShell(nacelleInnerPts, CUT_START, CUT_LEN, materials.nacelleInnerAcoustic);
  nacelleGroup.add(nacelleInner);

  // Structural internal bulkheads & ring ribs
  const ribPositions = [
    L.fan - 0.2,
    L.lpcEnd,
    L.hpcStart + 0.4,
    L.combustorStart,
    L.lptStart,
  ];

  ribPositions.forEach((xRib) => {
    const rIn = R.coreCowlFront + 0.06;
    const rOut = R.fanCasing * 0.96;
    const ribMesh = new THREE.Mesh(
      new THREE.RingGeometry(rIn, rOut, 32, 1, CUT_START, CUT_LEN),
      materials.cutawayRim
    );
    ribMesh.rotation.y = Math.PI / 2;
    ribMesh.position.x = xRib;
    nacelleGroup.add(ribMesh);
  });

  // Structural Outlet Guide Vanes (OGVs) in the bypass duct
  const OGVS = 18;
  for (let i = 0; i < OGVS; i++) {
    const angle = (i / OGVS) * Math.PI * 2;
    const strutGeom = new THREE.BoxGeometry(0.18, R.fanCasing * 0.95 - R.coreCowlFront, 0.035);
    const strut = new THREE.Mesh(strutGeom, materials.titaniumAlloy);
    const midR = (R.fanCasing * 0.95 + R.coreCowlFront) * 0.5;
    strut.position.set(
      L.lpcEnd + 0.1,
      Math.cos(angle) * midR,
      Math.sin(angle) * midR
    );
    strut.rotation.x = -angle + Math.PI / 2;
    nacelleGroup.add(strut);
  }

  // External Hydraulic and Fuel Plumbing Conduit Lines
  const conduitPaths = [
    [
      new THREE.Vector3(L.fan + 0.4, 0.35, R.coreCowlFront + 0.08),
      new THREE.Vector3(L.hpcStart, 0.42, R.coreCowlFront + 0.06),
      new THREE.Vector3(L.combustorStart, 0.38, R.combustorOuter + 0.08),
      new THREE.Vector3(L.lptStart, 0.32, R.combustorOuter + 0.05),
    ],
    [
      new THREE.Vector3(L.fan + 0.6, -0.45, R.coreCowlFront + 0.08),
      new THREE.Vector3(L.hpcStart + 0.3, -0.42, R.coreCowlFront + 0.06),
      new THREE.Vector3(L.combustorEnd, -0.38, R.combustorOuter + 0.08),
    ],
  ];

  conduitPaths.forEach((pts, idx) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const pipeGeom = new THREE.TubeGeometry(curve, 32, 0.022, 8, false);
    const pipe = new THREE.Mesh(
      pipeGeom,
      idx === 0 ? materials.conduitSteel : materials.conduitCopper
    );
    nacelleGroup.add(pipe);
  });

  modules.nacelleModule.add(nacelleGroup);

  /* ============================================================
     8. THERMODYNAMIC AIRFLOW PARTICLE SIMULATION
     ============================================================ */
  const PARTICLE_COUNT = 380;
  const particleGeo = new THREE.BufferGeometry();
  const particlePos = new Float32Array(PARTICLE_COUNT * 3);
  const particleColors = new Float32Array(PARTICLE_COUNT * 3);
  const particleSpeeds = new Float32Array(PARTICLE_COUNT);
  const particleTypes = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const isBypass = Math.random() > 0.4;
    particleTypes[i] = isBypass ? 0 : 1;
    particleSpeeds[i] = 1.8 + Math.random() * 2.2;

    const x = THREE.MathUtils.lerp(L.intakeLip, L.tailConeTip, Math.random());
    const angle = CUT_START + Math.random() * CUT_LEN;
    let r = 0.5;

    if (isBypass) {
      r = THREE.MathUtils.lerp(R.coreCowlFront + 0.15, R.fanCasing * 0.88, Math.random());
      particleColors[i * 3 + 0] = 0.2;
      particleColors[i * 3 + 1] = 0.65;
      particleColors[i * 3 + 2] = 1.0;
    } else {
      r = THREE.MathUtils.lerp(R.n2Shaft + 0.05, R.hpcFront * 0.7, Math.random());
      particleColors[i * 3 + 0] = 1.0;
      particleColors[i * 3 + 1] = 0.4;
      particleColors[i * 3 + 2] = 0.1;
    }

    particlePos[i * 3 + 0] = x;
    particlePos[i * 3 + 1] = Math.cos(angle) * r;
    particlePos[i * 3 + 2] = Math.sin(angle) * r;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  particleSystem.visible = showAirflow;
  modules.airflowModule.add(particleSystem);

  /* ============================================================
     9. ASSEMBLE ENGINE & RETURN CONTROLLER
     ============================================================ */

  engineGroup.add(n1Spool);
  engineGroup.add(n2Spool);
  engineGroup.add(modules.combustorModule);
  engineGroup.add(modules.exhaustModule);
  engineGroup.add(modules.nacelleModule);
  engineGroup.add(modules.airflowModule);

  engineGroup.scale.setScalar(scale);

  // Exploded displacements along X-axis
  const explodeOffsets = {
    nacelleModule: -1.2,
    fanModule: -2.2,
    lpcModule: -1.4,
    hpcModule: -0.6,
    combustorModule: 0.2,
    hptModule: 1.0,
    lptModule: 1.8,
    exhaustModule: 2.8,
  };

  let currentExplode = 0;
  let n1Angle = 0;
  let n2Angle = 0;

  return {
    group: engineGroup,
    modules,
    spools: {
      n1: n1Spool,
      n2: n2Spool,
    },
    materials,

    // Module inspection metadata mapped to Ramco Aviation Engine MRO Capabilities
    mroHotspots: [
      {
        id: 'slot',
        name: 'Slot Management & Workscope Evaluation',
        stage: 'Zone 4.1 · Induction',
        anchor: new THREE.Vector3(L.fan, 0.45, 0.45),
        scope: 'Engine slot reservation, pre-induction inspection & dynamic workscope evaluation.',
        capability: 'Pre-induction hub covering missing or unknown components before work starts.',
        llp: 'Turnaround Time (TAT) Commitment: 42 Days',
      },
      {
        id: 'booster',
        name: 'Pre-Induction & Missing Parts Hub',
        stage: 'Zone 4.2 · Disassembly',
        anchor: new THREE.Vector3((L.lpcStart + L.lpcEnd) / 2, 0.42, 0.35),
        scope: 'Early detection of missing rotable parts and sub-assembly condition assessment.',
        capability: 'Automated receipt-to-induction pipeline with complete traceability.',
        llp: 'LPC Module Disposition: Inspect & Re-blade',
      },
      {
        id: 'hpc',
        name: 'Module-Level Maintenance & Digital Cards',
        stage: 'Zone 4.3 · Core Overhaul',
        anchor: new THREE.Vector3((L.hpcStart + L.hpcEnd) / 2, 0.38, 0.30),
        scope: 'Digital task cards with in-context AMM/EMM data via Mechanic Anywhere on mobile.',
        capability: 'Module-level maintenance identification with tasks and parts seamlessly integrated.',
        llp: 'HPC Drum 9-Stage Spool · Borescope Pass',
      },
      {
        id: 'combustor',
        name: 'Marshalling & Kitting Hub',
        stage: 'Zone 4.4 · Kitting',
        anchor: new THREE.Vector3((L.combustorStart + L.combustorEnd) / 2, 0.32, 0.28),
        scope: 'Marshalling and kitting hub for monitoring target configurations and parts readiness.',
        capability: 'Real-time rotable and consumable kitting before build bay assignment.',
        llp: '16 Fuel Nozzles & Liner · Kitted & Ready',
      },
      {
        id: 'hpt',
        name: 'LLP Dispositions & Target Build Value',
        stage: 'Zone 4.5 · Critical LLPs',
        anchor: new THREE.Vector3((L.hptStart + L.hptEnd) / 2, 0.30, 0.25),
        scope: 'LLP dispositions calculated against customer target build value and stub-life thresholds.',
        capability: 'Optimize life-limited parts replacement to avoid six-figure cost overruns.',
        llp: 'HPT Discs: 14,200 Cycles Remaining (Cap: $180k)',
      },
      {
        id: 'lpt',
        name: 'Fixed Price, Full Fixed & NTE Billing',
        stage: 'Zone 4.6 · Commercial Caps',
        anchor: new THREE.Vector3((L.lptStart + L.lptEnd) / 2, 0.38, 0.32),
        scope: 'Fixed price, full fixed price and NTE with scrap limits, caps and upgrade differentials.',
        capability: 'Real-time burn rate vs contract cap to prevent unbilled overruns.',
        llp: 'Contract Model: NTE with 15% Scrap Cap',
      },
      {
        id: 'exhaust',
        name: 'ARC Release & Final Engine Testing',
        stage: 'Zone 4.7 · Release',
        anchor: new THREE.Vector3(L.exhaustEnd, 0.45, 0.35),
        scope: 'Test cell run-up, EGT margin certification, and automated ARC release documentation.',
        capability: 'Seamless handover from engine test cell to customer billing & logistics.',
        llp: 'EASA Form 1 / FAA 8130-3 Ready',
      },
    ],

    update(dt = 0.016, rpmFactor = 1.0) {
      const baseSpeed = 2.4 * rpmFactor;
      n1Angle += baseSpeed * dt;
      n2Angle += baseSpeed * 2.35 * dt;

      n1Spool.rotation.x = n1Angle;
      n2Spool.rotation.x = n2Angle;

      if (particleSystem.visible) {
        const pos = particleGeo.attributes.position.array;
        const col = particleGeo.attributes.color.array;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const speed = particleSpeeds[i] * baseSpeed * dt;
          pos[i * 3 + 0] += speed;

          if (pos[i * 3 + 0] > L.tailConeTip + 0.5) {
            pos[i * 3 + 0] = L.intakeLip - Math.random() * 0.4;
          }

          if (particleTypes[i] === 1) {
            const x = pos[i * 3 + 0];
            if (x < L.hpcStart) {
              col[i * 3 + 0] = 0.3; col[i * 3 + 1] = 0.7; col[i * 3 + 2] = 1.0;
            } else if (x < L.combustorStart) {
              col[i * 3 + 0] = 1.0; col[i * 3 + 1] = 0.8; col[i * 3 + 2] = 0.2;
            } else if (x < L.hptEnd) {
              col[i * 3 + 0] = 1.0; col[i * 3 + 1] = 0.25; col[i * 3 + 2] = 0.05;
            } else {
              col[i * 3 + 0] = 0.9; col[i * 3 + 1] = 0.5; col[i * 3 + 2] = 0.15;
            }
          }
        }
        particleGeo.attributes.position.needsUpdate = true;
        particleGeo.attributes.color.needsUpdate = true;
      }
    },

    setExplode(factor = 0) {
      currentExplode = THREE.MathUtils.clamp(factor, 0, 1);
      for (const [modName, offset] of Object.entries(explodeOffsets)) {
        if (modules[modName]) {
          modules[modName].position.x = offset * currentExplode;
        }
      }
    },

    setAirflow(visible) {
      particleSystem.visible = !!visible;
    },
  };
}
