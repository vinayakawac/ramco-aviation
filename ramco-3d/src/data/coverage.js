/**
 * coverage.js — derives the flat list of every leaf string in ramco.js.
 *
 * The verification test renders the page at full scroll and asserts each of these
 * appears in the DOM. That is what proves the 3D rebuild carries 100% of the source
 * page's content rather than quietly dropping the parts that were awkward to place.
 *
 * Derived by walking the data, not hand-maintained — so adding content to ramco.js
 * automatically extends the coverage requirement.
 */

import * as DATA from './ramco.js';

/** Keys whose values are structural/technical, not reader-facing copy. */
const SKIP_KEYS = new Set([
  'src', 'href', 'ov', 'overlay', 'lit', 'more', 'count', 'suffix', 'primary',
  'root', 'demoUrl', 'storiesUrl', 'v', 'stars', 'n',
]);

/** Strings that are pure markup fragments or too short to assert usefully. */
function isAssertable(s) {
  const text = stripTags(s).trim();
  return text.length >= 4;
}

/** Remove inline HTML tags so assertions compare rendered text. */
export function stripTags(s) {
  return String(s).replace(/<[^>]*>/g, '');
}

/** Decode the handful of named entities used in the source copy. */
export function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Normalise for comparison: strip tags, decode entities, collapse whitespace. */
export function normalise(s) {
  return decodeEntities(stripTags(s)).replace(/\s+/g, ' ').trim();
}

function walk(value, key, out) {
  if (typeof value === 'string') {
    if (!SKIP_KEYS.has(key) && isAssertable(value)) out.add(normalise(value));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v) => walk(v, key, out));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (SKIP_KEYS.has(k)) continue;
      walk(v, k, out);
    }
  }
}

/** @returns {string[]} every reader-facing string the rebuild must render. */
export function collectStrings() {
  const out = new Set();
  for (const [key, value] of Object.entries(DATA)) {
    if (typeof value === 'function') continue;
    walk(value, key, out);
  }
  return [...out];
}

export const COVERAGE = collectStrings();
