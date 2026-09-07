// GLB export/import for AIRCRAFT-001 (product.md §47). The procedural build is the
// master; the GLB is a derived deployment artifact. Node names, material names and
// userData (metadata, hinge specs, exploded offsets) all survive the round trip.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createLogger } from '../core/logger';

const log = createLogger('Loader');

export async function exportGLB(root: THREE.Object3D): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  const t0 = performance.now();
  const result = await exporter.parseAsync(root, { binary: true, onlyVisible: false, includeCustomExtensions: true });
  const buf = result as ArrayBuffer;
  log.info('glb exported', { bytes: buf.byteLength, ms: Math.round(performance.now() - t0) });
  return buf;
}

/** Trigger a browser download of the exported GLB. */
export async function downloadGLB(root: THREE.Object3D, filename = 'aircraft-001.glb'): Promise<void> {
  const buf = await exportGLB(root);
  const url = URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function loadGLB(url: string): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  log.info('glb loaded', { url, children: gltf.scene.children.length });
  return gltf.scene;
}
