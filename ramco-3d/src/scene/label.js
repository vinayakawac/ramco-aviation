/**
 * label.js — text in the 3D scene, drawn to a canvas and used as a texture.
 *
 * Keeps the same three faces as the rest of the page (Archivo / Inter / IBM Plex Mono).
 * Only used for text that has to live in world space — node boxes, signage, runway
 * designators. Everything a reader actually needs to read stays in the DOM panels.
 */

import * as THREE from 'three';

const DPR = 2;
const cache = new Map();

/**
 * @param {string} text
 * @param {object} [opts]
 * @param {number} [opts.width]      canvas width in CSS px
 * @param {number} [opts.height]
 * @param {string} [opts.font]
 * @param {string} [opts.color]
 * @param {string} [opts.bg]         omit for transparent
 * @param {string} [opts.align]
 * @returns {THREE.CanvasTexture}
 */
export function textTexture(text, opts = {}) {
  const {
    width = 512,
    height = 128,
    font = '600 44px Archivo, sans-serif',
    color = '#0e1a1f',
    bg = null,
    align = 'center',
    letterSpacing = '0px',
  } = opts;

  const key = `${text}|${width}|${height}|${font}|${color}|${bg}|${align}|${letterSpacing}`;
  if (cache.has(key)) return cache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = width * DPR;
  canvas.height = height * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = letterSpacing;

  // Wrap to the canvas width so long labels don't run off the edge.
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > width - 28 && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineHeight = parseInt(font.match(/(\d+)px/)?.[1] ?? 44, 10) * 1.22;
  const x = align === 'center' ? width / 2 : align === 'right' ? width - 14 : 14;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/**
 * A flat, unlit label plane sized in world units.
 * @returns {THREE.Mesh}
 */
export function createLabel(text, { worldWidth = 4, aspect = 4, ...opts } = {}) {
  const tex = textTexture(text, opts);
  const geo = new THREE.PlaneGeometry(worldWidth, worldWidth / aspect);
  const material = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = `label:${String(text).slice(0, 24)}`;
  return mesh;
}

export function disposeLabels() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}
