/**
 * stations/index.js — the 25 beats of the journey, in scroll order.
 *
 * Each station declares:
 *   id       stable slug, also the DOM anchor (#station-<id>)
 *   num      the index badge shown on the panel
 *   name     short label for the progress rail
 *   vh       scroll length in viewport heights (its share of the timeline)
 *   u        aircraft position along the flight path, in curve parameter space [0,1]
 *   cam      camera keyframe: absolute {pos,look}, or {rel:[x,y,z],look:[x,y,z]} in the
 *            aircraft's local frame once it is moving
 *   state    scene flags the world applies while this station is active
 *   panel    () => HTML string, built from data/ramco.js
 *   wide     panel uses the wide layout (tables, persona grids)
 *
 * The camera and aircraft are interpolated between consecutive stations, so two stations
 * sharing a `u` hold the aircraft still while the camera moves around it — which is what
 * the whole hangar sequence needs.
 */

import * as P from '../ui/panel.js';
import * as D from '../data/ramco.js';

/** Aircraft flight path control points, hangar floor → climb-out (metres). */
export const PATH_POINTS = [
  [0, 0, -6],
  [0, 0, 10],
  [0, 0, 34],
  [0, 0, 64],
  [14, 0, 104],
  [32, 0, 150],
  [34, 0, 206],
  [30, 0, 250],
  [12, 0, 282],
  [0, 0, 308],
  [0, 0, 470],
  [0, 10, 600],
  [0, 120, 830],
  [0, 300, 1150],
];

/** Convert a waypoint index (fractional allowed) to curve parameter space. */
const at = (i) => i / (PATH_POINTS.length - 1);

/** Aircraft is parked in the hangar for the whole maintenance sequence. */
const PARKED = at(0.6);

export const STATIONS = [
  {
    id: 'hero',
    num: '00',
    name: 'Cold open',
    vh: 130,
    u: PARKED,
    side: 'centre',
    cam: { pos: [-21, 8.5, 34], look: [0, 3.8, -4] },
    state: { interior: true, workLights: 0.15, doors: 0 },
    panel: () => P.heroPanel(),
  },
  {
    id: 'problem',
    num: '01',
    name: 'The problem',
    vh: 150,
    u: PARKED,
    cam: { pos: [-17, 15, 42], look: [0, 14, -4] },
    state: { interior: true, workLights: 0.55, doors: 0, network: 'broken' },
    panel: () => P.problemPanel(),
    wide: true,
  },
  {
    id: 'unified',
    num: '02',
    name: 'One platform',
    vh: 100,
    u: PARKED,
    cam: { pos: [0, 15, 44], look: [0, 14, -4] },
    state: { interior: true, workLights: 0.7, doors: 0, network: 'unified' },
    panel: () =>
      [
        `<span class="zone-tag"><i>◆</i>${D.NET.label}</span>`,
        P.heading(2, D.NET.core.title),
        `<span class="scope">${D.NET.core.sub}</span>`,
        `<p class="why">${D.NET.captions.unified}</p>`,
        `<p class="footnote">${D.NET.footnote}</p>`,
      ].join(''),
  },
  {
    id: 'hangar',
    num: '03',
    name: 'Hangar bay',
    vh: 130,
    u: PARKED,
    cam: { pos: [-27, 15, 33], look: [0, 4, -3] },
    state: { interior: true, workLights: 1, doors: 0, overlay: 'hangarShell', lit: ['airframe'] },
    panel: () => P.zonePanel('hangar'),
  },
  {
    id: 'engine',
    num: '04',
    name: 'Engine MRO',
    vh: 130,
    u: PARKED,
    cam: { pos: [-16, 6, 4], look: [-26, 3.4, -8] },
    state: { interior: true, workLights: 1, doors: 0, engineBay: true, lit: ['engine'] },
    panel: () => P.engineIntro() + P.zonePanel('engine'),
  },

  // Configuration depth — four nested cutaway levels on the detached engine.
  ...D.LADDER.map((r, i) => ({
    id: `ladder-${i + 1}`,
    num: `04.${i + 1}`,
    name: r.lv,
    vh: 90,
    u: PARKED,
    // Each level tightens the framing a little without ever entering the engine —
    // depth is carried by the nested level box, not by flying inside the cowl.
    cam: {
      pos: [
        -26 + Math.sin(-1.05 + i * 0.17) * (16.5 - i * 1.4),
        6.6 - i * 0.55,
        -8 + Math.cos(-1.05 + i * 0.17) * (16.5 - i * 1.4),
      ],
      look: [-26, 3.3, -8],
    },
    state: { interior: true, workLights: 1, doors: 0, engineBay: true, ladder: i },
    panel: () => P.ladderPanel(i),
  })),

  // The engine visit, gate by gate — five bench positions down the shop.
  ...D.GATES.map((g, i) => ({
    id: `gate-${i + 1}`,
    num: `05.${i + 1}`,
    name: g.t.replace(/&amp;/g, '&'),
    vh: 95,
    u: PARKED,
    // Five distinct angles on the same asset — the gate walk circles the engine
    // rather than tracking past five separate props Ramco does not publish.
    cam: {
      pos: [
        -26 + Math.sin(-2.5 + i * 0.5) * 15,
        5.4 + i * 0.5,
        -8 + Math.cos(-2.5 + i * 0.5) * 15,
      ],
      look: [-26, 3.2, -8],
    },
    state: { interior: true, workLights: 1, doors: 0, engineBay: true, gate: i },
    panel: () => P.gatePanel(i),
  })),

  {
    id: 'component',
    num: '06',
    name: 'Component MRO',
    vh: 120,
    u: PARKED,
    cam: { pos: [16, 6, 24], look: [2, 2.4, 3] },
    state: { interior: true, workLights: 1, doors: 0, lru: true },
    panel: () => P.zonePanel('component'),
  },
  {
    id: 'supply',
    num: '07',
    name: 'Supply chain',
    vh: 120,
    u: PARKED,
    cam: { pos: [17, 5.5, 14], look: [29, 3, 2] },
    state: { interior: true, workLights: 1, doors: 0, lit: ['store'], demandPulse: true },
    panel: () => P.zonePanel('supply'),
  },
  {
    id: 'doors',
    num: '08',
    name: 'Doors open',
    vh: 110,
    u: at(1.4),
    cam: { pos: [0, 9, 92], look: [0, 6, 30] },
    state: { interior: true, workLights: 0.8, doors: 1, tug: true },
    panel: () =>
      [
        `<span class="zone-tag"><i>◆</i>Pushback</span>`,
        P.heading(2, D.NET.views.unified),
        `<p class="why">${D.NET.captions.unified}</p>`,
        P.shead(D.PLATFORM),
      ].join(''),
  },
  {
    id: 'line',
    num: '09',
    name: 'Line MRO',
    vh: 130,
    u: at(3),
    cam: { rel: [-38, 12, 10], look: [0, 2, -4] },
    state: { doors: 1, tug: true, overlay: 'stand', lit: ['gse'], offline: true },
    panel: () => P.zonePanel('line'),
  },
  {
    id: 'records',
    num: '10',
    name: 'Fleet records',
    vh: 140,
    u: at(5.5),
    cam: { rel: [-52, 17, -6], look: [0, 2, 0] },
    state: { overlay: 'envelope', ghosts: true, taxi: true },
    panel: () => P.zonePanel('records'),
  },
  {
    id: 'compliance',
    num: '11',
    name: 'Compliance',
    vh: 120,
    u: at(7),
    cam: { rel: [-30, 9, -44], look: [2, 3, 10] },
    state: { taxi: true, signage: true },
    panel: () => P.compliancePanel(),
    wide: true,
  },
  {
    id: 'deck',
    num: '12',
    name: 'Flight deck',
    vh: 130,
    u: at(8),
    cam: { rel: [0.3, 2.92, 16.1], look: [0.1, 2.5, 36] },
    state: { taxi: true, cockpit: true, efb: true },
    panel: () => P.zonePanel('deck'),
  },
  {
    id: 'commercial',
    num: '13',
    name: 'Commercial control',
    vh: 130,
    u: at(9),
    cam: { rel: [-13, 7, -44], look: [0, 3, 40] },
    state: { lineUp: true, centreline: true },
    panel: () => P.commercialPanel(),
    wide: true,
  },
  {
    id: 'results',
    num: '14',
    name: 'Takeoff roll',
    vh: 190,
    u: at(10.6),
    cam: { rel: [-26, 6, -40], look: [0, 2.5, 16] },
    state: { roll: true, meters: true, speedTape: true },
    panel: () => P.metersPanel(),
    wide: true,
  },
  {
    id: 'personas',
    num: '15',
    name: 'Solutions',
    vh: 260,
    u: at(12),
    cam: { rel: [-34, 12, -30], look: [0, 2, 10] },
    state: { climb: true, gearUp: true },
    panel: () =>
      [
        P.shead(D.SOLUTIONS),
        `<div class="personas">${D.PERSONAS.map((_, i) => `<article class="persona">${P.personaPanel(i)}</article>`).join('')}</div>`,
      ].join(''),
    wide: true,
  },
  {
    id: 'matrix',
    num: '16',
    name: 'Capability matrix',
    vh: 150,
    u: at(12.6),
    cam: { rel: [-44, 20, -50], look: [0, 0, 0] },
    state: { climb: true, gearUp: true },
    panel: () =>
      [
        P.heading(2, D.SOLUTIONS.matrixHeading),
        `<p class="standfirst">${D.SOLUTIONS.matrixStandfirst}</p>`,
        P.matrixTable(),
      ].join(''),
    wide: true,
  },
  {
    id: 'epilogue',
    num: '17',
    name: 'Cruise',
    vh: 300,
    u: at(13),
    cam: { rel: [-70, 26, -90], look: [0, 0, 0] },
    state: { climb: true, gearUp: true, cruise: true },
    panel: () =>
      [
        P.customersPanel(),
        P.faqPanel(),
        P.ctaPanel(),
        `<footer class="site-footer">${P.footerPanel()}</footer>`,
      ].join(''),
    wide: true,
  },
];

/**
 * Which side of the viewport each station's panel sits on.
 * Exported so the camera rig can bias its framing the other way and the aircraft never
 * ends up hidden behind the text.
 */
export function sideFor(station, index) {
  if (station.side) return station.side;
  if (station.wide) return index % 2 ? 'right' : 'left';
  return index % 2 ? 'right' : 'left';
}

/** Total scroll length in viewport heights. */
export const TOTAL_VH = STATIONS.reduce((n, s) => n + s.vh, 0);

/**
 * Normalised [start, end] scroll window for each station, plus its midpoint.
 * @returns {Array<{station:object,start:number,end:number,mid:number}>}
 */
export function buildWindows() {
  let acc = 0;
  return STATIONS.map((station) => {
    const start = acc / TOTAL_VH;
    acc += station.vh;
    const end = acc / TOTAL_VH;
    station.side = station.side ?? sideFor(station, STATIONS.indexOf(station));
    return { station, start, end, mid: (start + end) / 2 };
  });
}

export const WINDOWS = buildWindows();
