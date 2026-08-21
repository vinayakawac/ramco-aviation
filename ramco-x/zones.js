/**
 * zones.js - The seven authentic Ramco Aviation platform zones.
 *
 * Ground truth product data sourced directly from Ramco Aviation:
 * https://www.ramco.com/products/aviation-software/
 *
 * Camera framings and anchors are authored in aircraft space.
 */

export const ZONES = [
  {
    n: '1',
    key: 'deck',
    zone: 'Flight deck',
    title: 'Flight Operations',
    scope: 'Pilots · schedulers · dispatchers',
    sourceUrl: 'https://www.ramco.com/products/aviation-software/flight-operations/',
    pain:
      'Crew hours, duty limits and flight logs sit in a separate system from maintenance — ' +
      'so a defect noted airborne becomes a phone call, and a flight sheet becomes a billing argument.',
    why:
      'Flight Operations is natively connected to the maintenance and accounting modules. ' +
      'What the crew records becomes a maintenance trigger and a billable line without anyone re-keying it.',
    items: [
      'Fly Anywhere (EFB) — pre-flight, in-flight and post-flight fully offline, syncing back on reconnection',
      'Crew Anywhere for crew activity on mobile',
      'Crew scheduling with configurable flight and duty time limitation rules, and exceedance alerts',
      'Risk assessment with online approval; duty reporting that validates crew currency instantly',
      'Centralised dispatch, flight planning, crew assignment and passenger manifest',
      'Flight contract and billing with automated flight sheet and invoice generation',
    ],
    subject: 'airframe',
    cam: { theta: -0.75, phi: 1.36, dist: 1.15, target: [0.62, -0.18, 0.12] },
    anchor: { x: 0.90, y: -0.42, z: 0 },
  },
  {
    n: '2',
    key: 'line',
    zone: 'On stand · line station',
    title: 'Line MRO',
    scope: 'AMO & line station operations',
    sourceUrl: 'https://www.ramco.com/products/aviation-software/mro-industry/',
    pain:
      'A line turn is measured in minutes, often at an outstation with no reliable network. ' +
      'Paper defect reports get transcribed hours later, and flight service work goes unbilled.',
    why:
      'Ramco treats offline as a normal operating condition, not a degraded one — ' +
      'the offline system gives full support for line maintenance — then bills the turn like any other job.',
    items: [
      'AMO and line station maintenance operations',
      'Work scoping and defect reporting at the stand',
      'Flight service billing',
      'Offline field maintenance system with full line maintenance support',
      'Workflow optimisation so remote field mechanics can multitask',
      'Electronic job card attachments and digital signatures with log tracking',
    ],
    subject: 'airframe',
    cam: { theta: -0.42, phi: 1.40, dist: 1.05, target: [0.50, -0.62, 0.30] },
    anchor: { x: 0.73, y: -0.55, z: -0.20 },
  },
  {
    n: '3',
    key: 'component',
    zone: 'Removable components (LRUs)',
    title: 'Component MRO',
    scope: 'Receipt to ARC release',
    sourceUrl: 'https://www.ramco.com/products/aviation-software/mro-industry/',
    pain:
      'A component comes off, goes to a shop and disappears from view. ' +
      'The customer calls for a status you don’t have, and the quote goes out days after the work finished.',
    why:
      'Ramco runs the component as a closed loop — arrives, worked, released, quoted, invoiced — ' +
      'with the customer watching through a portal instead of phoning for updates.',
    items: [
      'Component receipt through to ARC release',
      'Quote management and invoicing',
      'Customer portal for interactions, approvals and collaborative requests',
      'Inventory control focused on line-replaceable units and optimal stock',
      'Real-time inventory status and part readiness for the maintenance team',
    ],
    note:
      'Callouts mark representative removable positions — equipment bay, landing gear and APU. ' +
      'Ramco does not publish a list of specific component types.',
    subject: 'airframe',
    cam: { theta: -0.55, phi: 1.46, dist: 1.15, target: [0.55, -0.34, 0.08] },
    anchor: { x: 0.50, y: -0.78, z: 0.06 },
  },
  {
    n: '4',
    key: 'engine',
    zone: 'Powerplant',
    title: 'Engine MRO',
    scope: 'Purpose-built, not configured',
    sourceUrl: 'https://www.ramco.com/products/aviation-software/engine-mro-software',
    pain:
      'Slots are full, the workscope changes after induction, an LLP disposition moves the build ' +
      'cost by six figures, and the contract cap is breached before anyone runs the numbers.',
    why:
      'Ramco’s most specialised area. The stated objectives are exactly what an engine shop is judged ' +
      'on: reduce turnaround times, manage capacity constraints, simplify billing.',
    items: [
      'Engine slot management and work scope evaluation',
      'Pre-induction hub covering missing or unknown components before work starts',
      'LLP dispositions recommended against target build value',
      'Module-level maintenance identification with tasks and parts integrated',
      'Marshalling and kitting hub for monitoring target configurations',
      'Digital task cards with in-context technical data via Mechanic Anywhere',
      'Fixed price, full fixed price and NTE with scrap limits, caps and upgrade differentials',
    ],
    subject: 'engine',
    cam: { theta: -0.85, phi: 1.36, dist: 2.30, target: [0, 0.02, 0] },
    anchor: { x: 0.0, y: 0.85, z: 0.0 },
    subjectAnchor: { x: 0.0, y: 0.85, z: 0.0 },
  },
  {
    n: '5',
    key: 'hangar',
    zone: 'In the hangar · whole airframe',
    title: 'Hangar MRO & heavy',
    scope: 'Induction to billing',
    sourceUrl: 'https://www.ramco.com/products/aviation-software/mro-industry/',
    pain:
      'You priced the check before you opened the panels. Non-routine findings arrive after the ' +
      'number was agreed, the work package sprawls, and the margin is gone by day four.',
    why:
      'A base check is a whole-aircraft event, so Ramco makes the work package the unit of control ' +
      'from induction through to the invoice — including the findings nobody could have quoted for.',
    items: [
      'End-to-end cycle from aircraft induction to billing',
      'Work scope management and streamlined work package creation',
      'Task card digitisation, including work scoping from a PDF work package',
      'Connected inventory planning against the work package',
      'Automated routine and non-routine estimations',
      'Precise bidding and adherence to turnaround time commitments',
      'Operational oversight to identify and prevent quality issues',
    ],
    subject: 'airframe',
    cam: { theta: -0.82, phi: 1.20, dist: 3.75, target: [0, 0.25, 0] },
    anchor: { x: -0.10, y: 0.15, z: 0.0 },
  },
  {
    n: '6',
    key: 'records',
    zone: 'The aircraft as a record',
    title: 'Fleet Technical Management',
    scope: 'CAMO · Part M · airworthiness',
    sourceUrl: 'https://www.ramco.com/products/aviation-software/fleet-technical-management/',
    pain:
      'The record is the asset. An incomplete or contested technical record grounds aircraft, ' +
      'fails audits and knocks real money off the value at lease return or sale.',
    why:
      'Ramco treats records as an operating system rather than an archive — inducted in bulk, ' +
      'tracked globally, with guided actions, exceptions and alerts instead of a team reconciling spreadsheets.',
    items: [
      'Technical records induction, bulk processing and compliance updates',
      'Global fleet visibility with guided actions, exceptions and alerts',
      'As-Built, Allowable and Actual configuration tracked separately',
      'Life-limited parts, hard time, soft time and on-condition tracking',
      'Task library, WBS, BOM and maintenance programs to MSG-3',
      'OEM document management for AMM, IPC and EMM; task card authoring',
      'Modification evaluation, planning, compliance and tracking',
      'Fleet reliability, benchmark alert rates and dispatch reliability reporting',
    ],
    subject: 'airframe',
    envelope: true,
    cam: { theta: 0.95, phi: 1.16, dist: 2.60, target: [0, -0.06, 0] },
    anchor: { x: -0.69, y: 0.36, z: 0 },
  },
  {
    n: '7',
    key: 'supply',
    zone: 'Stores & supply chain',
    title: 'Integrated Supply Chain',
    scope: 'Demand to procurement',
    sourceUrl: 'https://www.ramco.com/products/aviation-software/maintenance-repair-and-overhaul/',
    pain:
      'Most maintenance delay isn’t maintenance — it’s waiting. ' +
      'Meanwhile capital sits in bins nobody can see, and the same part gets bought twice.',
    why:
      'Ramco drives procurement directly off the maintenance plan rather than a purchasing team’s ' +
      'interpretation of it, which is why this sits inside the platform instead of beside it.',
    items: [
      'One-touch demand-to-procurement',
      'Real-time inventory status and part readiness for the maintenance team',
      'Advanced inventory optimisation and planning to lower inventory cost',
      'Delay tracking with timely mitigation and collaborative approvals',
      'Established APIs with Aeroxchange, FedEx, SAP and other third-party systems',
      'Spec 2000 e-business for procurement and repair',
    ],
    subject: 'stores',
    cam: { theta: -2.46, phi: 1.22, dist: 2.40, target: [0, 0.20, 0] },
    anchor: { x: 0.0, y: 1.15, z: 0.0 },
    subjectAnchor: { x: 0.0, y: 1.15, z: 0.0 },
  },
];
