/**
 * fallback.js — tier 3: no WebGL, or a device that can't carry the scene.
 *
 * The panels are already real DOM in normal flow, so the fallback doesn't rebuild
 * anything: it drops the canvas and the HUD, unpins the panels and lets the page read
 * as an ordinary document. Every one of the 400-odd strings from the source page is
 * still present and still reachable by keyboard, screen reader and Ctrl-F.
 */

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGL2RenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Decide which tier to run.
 * @returns {'full'|'reduced'|'document'}
 */
export function detectTier() {
  if (!isWebGLAvailable()) return 'document';
  if (prefersReducedMotion()) return 'reduced';
  // Very small viewports get the document too — a pinned canvas plus a full-width panel
  // leaves nothing of the scene visible, so the 3D would be cost without benefit.
  if (window.innerWidth < 420) return 'document';
  return 'full';
}

/** Switch the page into plain-document mode. */
export function enableDocumentMode(reason = '') {
  document.body.classList.add('fallback');

  // Stations no longer need their scroll weight; collapse to content height.
  document.querySelectorAll('.station').forEach((s) => {
    s.style.height = 'auto';
    s.classList.add('is-active');
  });

  // Reveal every meter and count-up immediately — there is no scroll choreography left.
  document.querySelectorAll('.fill').forEach((f) => (f.style.width = `${f.dataset.w}%`));
  document.querySelectorAll('[data-meter]').forEach((v) => (v.textContent = `${v.dataset.meter}%`));
  document.querySelectorAll('[data-count]').forEach((el) => {
    const prefix = el.dataset.prefix ?? '';
    const suffix = el.dataset.suffix ?? '';
    el.textContent = prefix + (+el.dataset.count).toLocaleString('en-US') + suffix;
  });

  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('done');

  if (reason) console.info(`[ramco-3d] document mode: ${reason}`);
}
