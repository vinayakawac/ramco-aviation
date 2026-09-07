// Geometry helpers shared by all AIRCRAFT-001 part builders.
// Everything here works in the spec frame: +X forward, +Y starboard, +Z up.
import * as THREE from 'three';

export const DEG = Math.PI / 180;

/**
 * Mirror a geometry across the XZ plane (Y → −Y) and flip triangle winding so the
 * normals still point outward. This is how every left/right pair is produced from
 * ONE source geometry (product.md Rule 2).
 */
export function mirrorGeometryY(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = src.clone();
  g.applyMatrix4(new THREE.Matrix4().makeScale(1, -1, 1));
  if (g.index) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
    g.index.needsUpdate = true;
  } else {
    // non-indexed: swap vertices 1 and 2 of every triangle
    const pos = g.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 9) {
      for (let k = 0; k < 3; k++) {
        const t = arr[i + 3 + k];
        arr[i + 3 + k] = arr[i + 6 + k];
        arr[i + 6 + k] = t;
      }
    }
    pos.needsUpdate = true;
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Deep-mirror an Object3D subtree across Y (starboard → port). Meshes get mirrored geometry (shared
 * materials kept), positions negate Y, Euler rotations become (−x, y, −z), and node
 * names ending in `_R` (starboard, authored at −Y) become `_L` (port, +Y). userData.component
 * and labels are renamed the same way.
 */
export function mirrorObjectY(src: THREE.Object3D): THREE.Object3D {
  const visit = (o: THREE.Object3D): THREE.Object3D => {
    let out: THREE.Object3D;
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      out = new THREE.Mesh(mirrorGeometryY(mesh.geometry), mesh.material);
      (out as THREE.Mesh).castShadow = mesh.castShadow;
      (out as THREE.Mesh).receiveShadow = mesh.receiveShadow;
    } else {
      out = new THREE.Group();
    }
    out.name = o.name.endsWith('_R') ? o.name.slice(0, -2) + '_L' : o.name;
    out.position.set(o.position.x, -o.position.y, o.position.z);
    out.rotation.set(-o.rotation.x, o.rotation.y, -o.rotation.z, o.rotation.order);
    out.scale.copy(o.scale);
    out.visible = o.visible;
    out.userData = JSON.parse(JSON.stringify(o.userData));
    // Hinge/spin metadata: reflecting a rotation across Y maps (axis, θ) → (axis with −y, −θ)
    if (out.userData.hinge) {
      const h = out.userData.hinge;
      h.axis = [h.axis[0], -h.axis[1], h.axis[2]];
      h.deg = -h.deg;
      if (h.translate) h.translate = [h.translate[0], -h.translate[1], h.translate[2]];
    }
    if (out.userData.spin) {
      const sp = out.userData.spin;
      sp.axis = [-sp.axis[0], sp.axis[1], -sp.axis[2]]; // keep spin sense visually identical
    }
    if (out.userData.rest) {
      out.userData.rest = { q: out.quaternion.toArray(), p: out.position.toArray() };
    }
    if (typeof out.userData.component === 'string' && out.userData.component.endsWith('_R')) {
      out.userData.component = out.userData.component.slice(0, -2) + '_L';
      if (typeof out.userData.label === 'string') out.userData.label = out.userData.label.replace(/Right/g, 'Left');
    }
    for (const c of o.children) out.add(visit(c));
    return out;
  };
  return visit(src);
}

/**
 * Build a solid of revolution around the X axis from a profile of (x, radius) pairs.
 * The profile runs from the forward point to the aft point.
 */
export function latheAroundX(profile: Array<[number, number]>, radialSegments: number, zOffset: (x: number) => number = () => 0): THREE.BufferGeometry {
  // LatheGeometry revolves (x=radius, y=height) around +Y. We map height→X afterwards.
  const pts = profile.map(([x, r]) => new THREE.Vector2(Math.max(r, 1e-4), x));
  const g = new THREE.LatheGeometry(pts, radialSegments, 0, Math.PI * 2);
  // Rotate so the Y axis of the lathe becomes +X (forward)
  g.rotateZ(-Math.PI / 2);
  // Apply optional vertical offset per station (tail-cone upsweep, belly fairing)
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) + zOffset(x));
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/**
 * NACA-4-series-like airfoil section as a closed 2D loop in a local frame where
 * u runs chordwise (0 = leading edge, 1 = trailing edge) and v is thickness.
 * `from`/`to` select a chordwise slice so the SAME section can produce the wing box
 * (0 → 1−flapChord), the flap (1−flapChord → 1) and the slat (0 → slatChord).
 * The loop always has 2·(points+1) vertices so slices can be lofted together.
 */
export function airfoil(points: number, tc: number, camber = 0.02, from = 0, to = 1): THREE.Vector2[] {
  const upper: THREE.Vector2[] = [];
  const lower: THREE.Vector2[] = [];
  for (let i = 0; i <= points; i++) {
    const u = i / points;
    // cosine spacing crowds points at the leading edge, remapped into [from, to]
    const x = from + (to - from) * (0.5 - 0.5 * Math.cos(Math.PI * u));
    const yt = 5 * tc * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const yc = camber * (4 * x * (1 - x)); // parabolic camber line
    upper.push(new THREE.Vector2(x, yc + yt));
    lower.push(new THREE.Vector2(x, yc - yt));
  }
  // closed loop: front-upper → rear-upper → rear-lower → front-lower
  return [...upper, ...lower.reverse()];
}

/**
 * Loft an airfoil slice between spanwise stations. Each station is
 * {y (span), x (leading edge of the FULL chord), z, chord, tc, twistDeg, from, to}.
 * `from`/`to` are the chord slice (default full section). Both ends are capped.
 */
export interface LoftStation {
  y: number; x: number; z: number; chord: number; tc: number; twistDeg?: number; from?: number; to?: number;
}
export function loftAirfoil(stations: LoftStation[], profilePoints: number, camber = 0.02): THREE.BufferGeometry {
  const sections = stations.map((s) => {
    const af = airfoil(profilePoints, s.tc, camber, s.from ?? 0, s.to ?? 1);
    const tw = (s.twistDeg ?? 0) * DEG;
    return af.map((p) => {
      // local chord frame: u aft along −X, thickness along +Z, twist about the LE
      const lx = -p.x * s.chord;
      const lz = p.y * s.chord;
      const rx = lx * Math.cos(tw) - lz * Math.sin(tw);
      const rz = lx * Math.sin(tw) + lz * Math.cos(tw);
      return new THREE.Vector3(s.x + rx, s.y, s.z + rz);
    });
  });
  const n = sections[0].length;
  const positions: number[] = [];
  const indices: number[] = [];
  for (const sec of sections) for (const v of sec) positions.push(v.x, v.y, v.z);
  for (let s = 0; s < sections.length - 1; s++) {
    const a = s * n;
    const b = (s + 1) * n;
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      indices.push(a + i, b + i, a + i2, a + i2, b + i, b + i2);
    }
  }
  // end caps (triangle fan from vertex 0 of the ring)
  const cap = (base: number, reverse: boolean) => {
    for (let i = 1; i < n - 1; i++) {
      if (reverse) indices.push(base, base + i + 1, base + i);
      else indices.push(base, base + i, base + i + 1);
    }
  };
  cap(0, true);
  cap((sections.length - 1) * n, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/**
 * A thin patch that hugs a body of revolution around X (the fuselage) between two X
 * stations and two Z heights (measured on the centre-line plane). Used for the navy
 * cheatline, doors and cockpit glazing so they follow the real surface curvature.
 * `side` = −1 port, +1 starboard. Build the port patch and mirror it for starboard.
 * The patch is pushed `offset` outward along the surface normal.
 */
export function surfacePatch(
  radiusAt: (x: number) => number,
  zOffsetAt: (x: number) => number,
  xFrom: number, xTo: number, zTop: number, zBottom: number,
  side: -1 | 1, offset: number, xSteps: number, angSteps: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const cols = angSteps + 1;
  for (let i = 0; i <= xSteps; i++) {
    const x = xFrom + (xTo - xFrom) * (i / xSteps);
    const r = radiusAt(x) + offset;
    const zc = zOffsetAt(x);
    // angles measured from +Z (top) toward the requested side
    const aTop = Math.acos(THREE.MathUtils.clamp((zTop - zc) / r, -1, 1));
    const aBot = Math.acos(THREE.MathUtils.clamp((zBottom - zc) / r, -1, 1));
    for (let j = 0; j <= angSteps; j++) {
      const t = j / angSteps;
      // sweep from the top angle to the bottom angle on the requested side
      const a = side * (aTop + t * (aBot - aTop));
      positions.push(x, r * Math.sin(a), zc + r * Math.cos(a));
    }
  }
  for (let i = 0; i < xSteps; i++) {
    for (let j = 0; j < angSteps; j++) {
      const a = i * cols + j;
      const b = a + cols;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Create a Group placed at a physical pivot; children are authored relative to it. */
export function pivotGroup(name: string, x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  return g;
}

/** Mark a mesh for shadows and attach metadata in one call. */
export function finishMesh(mesh: THREE.Mesh, name: string, userData?: Record<string, unknown>): THREE.Mesh {
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (userData) mesh.userData = userData;
  return mesh;
}

/** Count triangles in a subtree (for performance gates). */
export function countTriangles(root: THREE.Object3D): number {
  let tris = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry;
    const per = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    const inst = (mesh as unknown as THREE.InstancedMesh).isInstancedMesh ? (mesh as unknown as THREE.InstancedMesh).count : 1;
    tris += per * inst;
  });
  return Math.round(tris);
}
