/**
 * network.js — the operating-model diagram, floating in the hangar bay.
 *
 * Eight functions, twenty-eight point-to-point links (8 choose 2), six of them visibly
 * broken — exactly the figure the source page computes and captions. Scrolling collapses
 * the mesh into a single core, which is the argument the whole page is built on.
 *
 * Rendered in 3D as a ring of labelled node boxes rather than the source's flat ellipse.
 */

import * as THREE from 'three';
import { mat, PALETTE } from './materials.js';
import { createLabel } from './label.js';
import { NODES, NODE_BREAKS, NET } from '../data/ramco.js';

const RADIUS_X = 15;
const RADIUS_Y = 6.5;

/** Where the diagram hangs in the hangar bay. */
export const NETWORK_CENTRE = new THREE.Vector3(0, 14, -4);

/**
 * Node positions, in the group's own local frame so the whole diagram can be
 * billboarded toward the camera without the ring coming apart.
 */
function nodePositions() {
  return NODES.map((_, i) => {
    const a = (Math.PI * 2 * i) / NODES.length - Math.PI / 2;
    return new THREE.Vector3(RADIUS_X * Math.cos(a), RADIUS_Y * Math.sin(a), 0);
  });
}

function nodeBox(text, pos) {
  const g = new THREE.Group();

  const plate = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.7, 0.16), mat.annotationFill(PALETTE.white, 0.92));
  g.add(plate);

  const label = createLabel(text, {
    worldWidth: 5.3,
    aspect: 3.4,
    width: 512,
    height: 150,
    font: '500 46px Inter, sans-serif',
    color: '#0e1a1f',
  });
  label.position.z = 0.11;
  g.add(label);

  g.position.copy(pos);
  return g;
}

export function createNetwork() {
  const g = new THREE.Group();
  g.name = 'network';
  g.visible = false;

  const pts = nodePositions();

  /* --- the 28 point-to-point links --- */
  const chaos = new THREE.Group();
  chaos.name = 'chaos';
  const linkPts = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      linkPts.push(pts[i], pts[j]);
    }
  }
  const linkGeo = new THREE.BufferGeometry().setFromPoints(linkPts);
  const links = new THREE.LineSegments(
    linkGeo,
    new THREE.LineDashedMaterial({
      color: PALETTE.flag,
      dashSize: 0.8,
      gapSize: 0.6,
      transparent: true,
      opacity: 0.45,
    })
  );
  links.computeLineDistances();
  chaos.add(links);

  // The six explicit breakpoints — an X at the midpoint of each failing interface.
  NODE_BREAKS.forEach(([a, b]) => {
    const mid = pts[a].clone().add(pts[b]).multiplyScalar(0.5);
    const cross = new THREE.Group();
    for (const rot of [Math.PI / 4, -Math.PI / 4]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.16), mat.glow(PALETTE.flag, 1));
      bar.rotation.z = rot;
      cross.add(bar);
    }
    cross.position.copy(mid);
    chaos.add(cross);
  });

  g.add(chaos);

  /* --- the unified hub --- */
  const hub = new THREE.Group();
  hub.name = 'hub';
  hub.visible = false;

  const spokePts = [];
  pts.forEach((p) => spokePts.push(new THREE.Vector3(), p.clone()));
  const spokes = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(spokePts),
    new THREE.LineBasicMaterial({ color: PALETTE.signal2, transparent: true, opacity: 0.55 })
  );
  hub.add(spokes);

  const core = new THREE.Group();
  const coreBox = new THREE.Mesh(new THREE.BoxGeometry(10, 2.9, 0.28), mat.glow(PALETTE.signal, 1));
  core.add(coreBox);

  const coreTitle = createLabel(NET.core.title, {
    worldWidth: 10,
    aspect: 7.5,
    width: 600,
    height: 80,
    font: '600 44px Archivo, sans-serif',
    color: '#ffffff',
  });
  coreTitle.position.set(0, 0.5, 0.18);
  core.add(coreTitle);

  const coreSub = createLabel(NET.core.sub, {
    worldWidth: 10,
    aspect: 12,
    width: 600,
    height: 50,
    font: '400 28px IBM Plex Mono, monospace',
    color: '#a9c2c9',
  });
  coreSub.position.set(0, -0.55, 0.18);
  core.add(coreSub);

  hub.add(core);
  g.add(hub);

  /* --- node boxes sit above both layers --- */
  const boxes = new THREE.Group();
  boxes.name = 'nodes';
  NODES.forEach((n, i) => boxes.add(nodeBox(n, pts[i])));
  g.add(boxes);

  g.position.copy(NETWORK_CENTRE);
  g.userData = { chaos, hub, boxes };
  return g;
}

/**
 * Turn the diagram to face the camera, yaw only, so it stays a readable ring from
 * every hangar keyframe instead of foreshortening into a line.
 */
export function faceNetwork(network, camera) {
  if (!network.visible) return;
  const dx = camera.position.x - network.position.x;
  const dz = camera.position.z - network.position.z;
  network.rotation.y = Math.atan2(dx, dz);
}

/**
 * @param {'broken'|'unified'|null} mode
 */
export function setNetworkMode(network, mode) {
  network.visible = mode === 'broken' || mode === 'unified';
  network.userData.chaos.visible = mode === 'broken';
  network.userData.hub.visible = mode === 'unified';
}
