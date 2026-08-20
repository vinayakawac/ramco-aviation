/**
 * ramco.js — every piece of content from `ramco-aviation_1.html`, lifted verbatim.
 *
 * This module is the single source of truth for the 3D experience. Strings are copied
 * exactly as authored in the source page: inline `<b>`, `<em>` and `&amp;` are preserved
 * because the panel renderer writes them as HTML (all content here is static and authored,
 * never user-supplied).
 *
 * Source line references in comments point at ramco-aviation_1.html.
 * Everything Ramco publishes without methodology keeps its caveat attached — see CAVEATS.
 */

export const META = {
  title: 'Ramco Aviation | MRO, M&E and Flight Operations software on one platform',
  description:
    'Aviation enterprise software powering 4,000+ aircraft and 24,000+ users. Line, component, engine, hangar and heavy maintenance, flight operations, fleet records and defense sustainment on a single platform.',
  brand: { name: 'Ramco', unit: 'Aviation' },
  demoUrl: 'https://www.ramco.com/product-enquiry/',
  storiesUrl: 'https://www.ramco.com/resources/category/customer-stories',
  root: 'https://www.ramco.com',
};

/* ---------- HERO (source L371–383) ---------- */
export const HERO = {
  pill: 'Aviation, Aerospace & Defense',
  h1: 'Get your aircraft back in the air. Get paid for every hour it took.',
  sub: 'Ramco Aviation runs line, component, engine, hangar and heavy maintenance, flight operations, fleet records and supply chain on one platform — so scoping, execution and billing stop being three separate arguments.',
  ctas: [
    { label: 'Book a demo', href: 'https://www.ramco.com/product-enquiry/', primary: true },
    { label: 'Explore the platform', href: '#station-02', primary: false },
  ],
  stats: [
    { value: '4,000+', count: 4000, suffix: '+', label: 'Aircraft powered' },
    { value: '24,000+', count: 24000, suffix: '+', label: 'Users globally' },
    { value: '7 of top 10', label: 'Helicopter operators' },
    { value: 'Leader', label: 'G2 Aviation Grid, Fall 2024' },
  ],
};

/* ---------- TRUST STRIP (source L389–393) ---------- */
export const TRUST = {
  eyebrow: 'Trusted across airlines, engine shops, rotary fleets and defense',
  names: [
    'Korean Air',
    'Etihad Airways Engineering',
    'AirAsia',
    'Babcock',
    'Leidos',
    'General Atomics',
    'Columbia Helicopters',
    'Transport Canada',
    'Aero Norway',
  ],
};

/* ---------- THE PROBLEM (source L400–427) ---------- */
export const PROBLEM = {
  eyebrow: 'The problem',
  h2: 'Your aircraft got smarter. Your systems didn’t.',
  standfirst:
    'Maintenance is in one system. Engineering is in another. Supply chain, contracts and finance are each in a third. Every handover between them is where a day gets lost, a part gets ordered twice, or a job gets done and never invoiced.',
  cards: [
    {
      title: 'Estimates that miss',
      body: 'Fixed-price work quoted before the panels come off. Non-routine findings arrive after the number is agreed.',
    },
    {
      title: 'No resource visibility',
      body: 'Manual work scheduling against a workforce and a parts position nobody can see in real time.',
    },
    {
      title: 'Inventory leakage',
      body: 'Capital parked in bins nobody can account for, while the same part gets bought again.',
    },
    {
      title: 'Revenue that leaks',
      body: 'Scrap limits exceeded without approval. Upgrade differentials never charged. Caps breached unnoticed.',
    },
  ],
};

/* ---------- OPERATING MODEL DIAGRAM (source L919, L441, L444, L962–963) ---------- */
export const NODES = [
  'Maintenance',
  'Engineering',
  'Supply chain',
  'Contracts',
  'Finance',
  'Flight ops',
  'Records',
  'Warranty',
];

/** The six explicitly-drawn breakpoints between node pairs (source L930). */
export const NODE_BREAKS = [
  [0, 1],
  [2, 4],
  [3, 5],
  [5, 7],
  [1, 6],
  [0, 6],
];

export const NET = {
  label: 'Operating model',
  views: { disconnected: 'Disconnected systems', unified: 'One Ramco platform' },
  captions: {
    disconnected: '8 functions · 28 point-to-point interfaces to build, test and maintain',
    unified: '8 functions · 1 platform · one record every team reads',
  },
  core: { title: 'Ramco Aviation', sub: 'one record · one configuration' },
  footnote:
    'Eight functions connected point to point need twenty-eight interfaces, and every one is a place data drifts or a charge goes missing. One platform needs none of them. <em>(The arithmetic is ours; the operating-model argument is Ramco’s.)</em>',
};

/* ---------- PLATFORM EXPLORER HEADER (source L451–454) ---------- */
export const PLATFORM = {
  eyebrow: 'Explore the platform',
  h2: 'Everything that happens while your aircraft is on the ground',
  standfirst:
    'Ramco is organised by the kind of maintenance event — a line turn, a hangar check, an engine visit, a component in a shop.',
};

/* ---------- ZONES — the 7 coverage callouts (source L971–1052) ---------- */
export const ZONES = {
  deck: {
    n: '1',
    zone: 'Flight deck',
    title: 'Flight Operations',
    scope: 'Pilots · schedulers · dispatchers',
    pain: 'Crew hours, duty limits and flight logs sit in a separate system from maintenance — so a defect noted airborne becomes a phone call, and a flight sheet becomes a billing argument.',
    why: 'Flight Operations is natively connected to the maintenance and accounting modules. What the crew records becomes a maintenance trigger and a billable line without anyone re-keying it.',
    items: [
      '<b>Fly Anywhere (EFB)</b> — pre-flight, in-flight and post-flight fully offline, syncing back on reconnection',
      '<b>Crew Anywhere</b> for crew activity on mobile',
      'Crew scheduling with configurable flight and duty time limitation rules, and exceedance alerts',
      'Risk assessment with online approval; duty reporting that validates crew currency instantly',
      'Centralised dispatch, flight planning, crew assignment and passenger manifest',
      'Flight contract and billing with automated flight sheet and invoice generation',
    ],
    src: '/products/aviation-software/flight-operations/',
  },

  line: {
    n: '2',
    zone: 'On stand — line station',
    title: 'Line MRO',
    scope: 'AMO &amp; line station operations',
    pain: 'A line turn is measured in minutes, often at an outstation with no reliable network. Paper defect reports get transcribed hours later, and flight service work goes unbilled.',
    why: 'Ramco treats offline as a normal operating condition, not a degraded one — the offline system gives full support for line maintenance — then bills the turn like any other job.',
    items: [
      'AMO and line station maintenance operations',
      'Work scoping and defect reporting at the stand',
      'Flight service billing',
      'Offline field maintenance system with full line maintenance support',
      'Workflow optimisation so remote field mechanics can multitask',
      'Electronic job card attachments and digital signatures with log tracking',
    ],
    src: '/products/aviation-software/mro-industry/',
    lit: ['gse'],
    overlay: 'stand',
  },

  component: {
    n: '3',
    zone: 'Removable components (LRUs)',
    title: 'Component MRO',
    scope: 'Receipt to ARC release',
    pain: 'A component comes off, goes to a shop and disappears from view. The customer calls for a status you don’t have, and the quote goes out days after the work finished.',
    why: 'Ramco runs the component as a closed loop — arrives, worked, released, quoted, invoiced — with the customer watching through a portal instead of phoning for updates.',
    items: [
      'Component receipt through to ARC release',
      'Quote management and invoicing',
      'Customer portal for interactions, approvals and collaborative requests',
      'Inventory control focused on line-replaceable units and optimal stock',
      'Real-time inventory status and part readiness for the maintenance team',
    ],
    src: '/products/aviation-software/mro-industry/',
    note: 'Callouts mark representative removable positions — equipment bay, landing gear and APU. Ramco does not publish a list of specific component types.',
  },

  engine: {
    n: '4',
    zone: 'Powerplant',
    title: 'Engine MRO',
    scope: 'Purpose-built, not configured',
    pain: 'Slots are full, the workscope changes after induction, an LLP disposition moves the build cost by six figures, and the contract cap is breached before anyone runs the numbers.',
    why: 'Ramco’s most specialised area. The stated objectives are exactly what an engine shop is judged on: reduce turnaround times, manage capacity constraints, simplify billing.',
    items: [
      'Engine slot management and work scope evaluation',
      'Pre-induction hub covering missing or unknown components before work starts',
      'LLP dispositions recommended against target build value',
      'Module-level maintenance identification with tasks and parts integrated',
      'Marshalling and kitting hub for monitoring target configurations',
      'Digital task cards with in-context technical data via Mechanic Anywhere',
      'Fixed price, full fixed price and NTE with scrap limits, caps and upgrade differentials',
    ],
    src: '/products/aviation-software/engine-mro-software',
    more: true,
  },

  hangar: {
    n: '5',
    zone: 'In the hangar — whole airframe',
    title: 'Hangar MRO &amp; heavy',
    scope: 'Induction to billing',
    pain: 'You priced the check before you opened the panels. Non-routine findings arrive after the number was agreed, the work package sprawls, and the margin is gone by day four.',
    why: 'A base check is a whole-aircraft event, so Ramco makes the work package the unit of control from induction through to the invoice — including the findings nobody could have quoted for.',
    items: [
      'End-to-end cycle from aircraft induction to billing',
      'Work scope management and streamlined work package creation',
      'Task card digitisation, including work scoping from a PDF work package',
      'Connected inventory planning against the work package',
      'Automated routine <em>and</em> non-routine estimations',
      'Precise bidding and adherence to turnaround time commitments',
      'Operational oversight to identify and prevent quality issues',
    ],
    src: '/products/aviation-software/mro-industry/',
    lit: ['airframe'],
    overlay: 'hangarShell',
  },

  records: {
    n: '6',
    zone: 'The aircraft as a record',
    title: 'Fleet Technical Management',
    scope: 'CAMO · Part M · airworthiness',
    pain: 'The record is the asset. An incomplete or contested technical record grounds aircraft, fails audits and knocks real money off the value at lease return or sale.',
    why: 'Ramco treats records as an operating system rather than an archive — inducted in bulk, tracked globally, with guided actions, exceptions and alerts instead of a team reconciling spreadsheets.',
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
    src: '/products/aviation-software/fleet-technical-management/',
    overlay: 'envelope',
  },

  supply: {
    n: '7',
    zone: 'Stores &amp; supply chain',
    title: 'Integrated Supply Chain',
    scope: 'Demand to procurement',
    pain: 'Most maintenance delay isn’t maintenance — it’s waiting. Meanwhile capital sits in bins nobody can see, and the same part gets bought twice.',
    why: 'Ramco drives procurement directly off the maintenance plan rather than a purchasing team’s interpretation of it, which is why this sits inside the platform instead of beside it.',
    items: [
      'One-touch demand-to-procurement',
      'Real-time inventory status and part readiness for the maintenance team',
      'Advanced inventory optimisation and planning to lower inventory cost',
      'Delay tracking with timely mitigation and collaborative approvals',
      'Established APIs with Aeroxchange, FedEx, SAP and other third-party systems',
      'Spec 2000 e-business for procurement and repair',
    ],
    src: '/products/aviation-software/maintenance-repair-and-overhaul/',
    lit: ['store'],
  },
};

/** Source L1053 — the order the source page lists the zones in. */
export const ORDER = ['deck', 'line', 'component', 'engine', 'hangar', 'records', 'supply'];

/* ---------- ENGINE MRO SECTION HEADER (source L587–590) ---------- */
export const ENGINE_INTRO = {
  eyebrow: 'Engine MRO',
  h2: 'The engine shop is where a good year is won or lost',
  standfirst:
    'Slots are full, the workscope changes after induction, an LLP disposition moves the build cost by six figures, and the contract cap gets breached before anyone runs the numbers. Ramco is purpose-built for this — not configured for it.',
  depthLabel: 'Configuration depth',
  depthHint: 'How far down the record goes',
  gatesHeading: 'The engine visit, gate by gate',
};

/* ---------- LADDER — configuration depth, 4 levels (source L1084–1097) ---------- */
export const LADDER = [
  {
    lv: 'Level 1',
    t: 'Engine',
    d: 'The unit that arrives and leaves',
    ov: 'lvl1',
    body: 'Every visit is planned and tracked from one hub. Before work starts, Ramco registers previous engineering compliances and uploads the incoming configuration, then handles the exceptions — missing components, unknown components, discrepancies — that usually surface halfway through a strip.',
    pts: [
      'Centralised planning and tracking hub per engine visit',
      'Previous engineering compliance registered on induction',
      'Incoming configuration uploaded, not reconstructed',
      'Exceptions managed explicitly: missing, unknown, discrepant',
    ],
  },
  {
    lv: 'Level 2',
    t: 'Modules',
    d: 'Where the work is scoped',
    ov: 'lvl2',
    body: 'Ramco identifies maintenance needs at module level and integrates the corresponding tasks and parts, aligning repair schemes automatically against the engine maintenance manuals. Ramco publishes no list of named modules, so none is shown.',
    pts: [
      'Module-level maintenance need identification',
      'Tasks and parts integrated to the identified level',
      'Automated task alignment against engine maintenance manuals',
      'Work scope baselines managed for approval and execution',
    ],
  },
  {
    lv: 'Level 3',
    t: 'Sub-assemblies &amp; components',
    d: 'What gets removed, inspected, refitted',
    ov: 'lvl3',
    body: 'Configuration is maintained through multi-level sub-assemblies, tracked as As-Built, Allowable and Actual. During execution, mechanics preview the engine configuration, replace components visually, remove parts in bulk and request configuration changes with visual attachments.',
    pts: [
      'Multi-level sub-assembly configuration',
      'As-Built, Allowable and Actual tracked separately',
      'Visual component replacement and configuration preview',
      'Bulk part removal; change requests with visual attachments',
      'Engineering conformity enforced during part inspection',
    ],
  },
  {
    lv: 'Level 4',
    t: 'Life-limited parts',
    d: 'Where the money and the risk sit',
    ov: 'lvl4',
    body: 'LLPs come off because their life is spent, not because they failed — and they are the single largest swing factor in what an engine visit costs. Ramco records LLPs and recommends dispositions against the target build value, so the build is decided against what the customer is actually paying for.',
    pts: [
      'LLP dispositions recorded and recommended',
      'Recommendations made against target build value',
      'Hard time, soft time and on-condition items tracked alongside',
      'Life status carried into the technical record, not held separately',
    ],
  },
];

/* ---------- GATES — the engine visit, gate by gate (source L1117–1148) ---------- */
export const GATES = [
  {
    n: 'Gate 01',
    t: 'Pre-Induction',
    s: 'Know what actually arrived',
    why: 'The most expensive mistakes in an engine visit are made before the engine is opened. This gate removes the guesswork about the incoming asset.',
    pts: [
      '<b>Centralised visit hub</b> for planning and tracking during each engine visit',
      '<b>Compliance history</b> — previous engineering compliances registered, configuration uploaded',
      '<b>Exception handling</b> for missing or unknown components and discrepancies',
      '<b>LLP disposition</b> recorded and recommended against target build value',
    ],
  },
  {
    n: 'Gate 02',
    t: 'Core Work Scoping',
    s: 'Decide what will be done',
    why: 'Scoping is where your quoted price meets physical reality. Ramco automates the alignment between what the manual requires and what this engine needs, then holds the baseline under change control.',
    pts: [
      '<b>Automated task alignment</b> — repair schemes aligned with engine maintenance manuals',
      '<b>Integrated maintenance levels</b> — module-level needs identified, tasks and parts integrated',
      '<b>Approval management</b> — work scope baselines managed for smoother approval',
      '<b>Proactive change management</b> — impacts assessed and approvals secured mid-job',
    ],
  },
  {
    n: 'Gate 03',
    t: 'Kitting &amp; Sourcing',
    s: 'Get the parts to the bench',
    why: 'An engine waiting on a part is capacity burning. This gate makes the gap between target configuration and available parts visible while there is still time to act.',
    pts: [
      '<b>Marshalling and kitting hub</b> — visually rich monitoring of target configurations',
      '<b>Delay tracking and mitigation</b> with collaborative approvals',
      '<b>Engineering conformity</b> ensured during part inspections',
      '<b>Assembly planning</b> — efficient planning and clearing of assemblies',
    ],
  },
  {
    n: 'Gate 04',
    t: 'Work Execution',
    s: 'Do it without paper',
    why: 'The mechanic is where all of the above either works or doesn’t. Ramco pushes instructions, configuration and technical data to the bench instead of expecting the bench to go looking.',
    pts: [
      '<b>Digital work instructions</b> via the Mechanic Anywhere app',
      '<b>Component management</b> — configuration preview and visual component replacement',
      '<b>Bulk transactions</b> — bulk part removal and change requests with visual attachments',
      '<b>In-context technical data</b> at task level via digital task cards',
    ],
  },
  {
    n: 'Gate 05',
    t: 'Pricing &amp; Billing',
    s: 'Get paid correctly',
    why: 'Because price has been accruing throughout execution rather than being reconstructed afterwards, the invoice is close to a by-product. This is the gate that turns operational discipline into margin.',
    pts: [
      '<b>Configurable pricing models</b> — fixed price, full fixed price, not-to-exceed',
      '<b>Commercial controls</b> — scrap limits, NTE limits, caps, upgrade differentials',
      '<b>Progressive pricing</b> accruing through automation during execution',
      '<b>Near-automated billing</b> once the engine visit closes',
    ],
  },
];

export const ENGINE_SRC = '/products/aviation-software/engine-mro-software';

/* ---------- SOLUTIONS HEADER (source L644–653) ---------- */
export const SOLUTIONS = {
  eyebrow: 'Solutions by operation',
  h2: 'Tell us what you run, and we’ll tell you what changes',
  standfirst: 'The same platform, pointed at a different set of problems. Pick the one closest to you.',
  matrixHeading: 'One platform. Every fleet you operate.',
  matrixStandfirst:
    'A tick means the capability is documented for that operation type on Ramco’s own pages.',
};

/* ---------- PERSONAS — 6 operation types (source L1183–1254) ---------- */
export const PERSONAS = [
  {
    k: 'Airline',
    who: 'Full-service or low-cost operator',
    pain: [
      'Fleet maintenance data split across systems that must be reconciled before anyone can plan',
      'Regulatory report submissions assembled by hand for each authority',
      'Component life tracked with precision only where someone has time to track it',
    ],
    gain: [
      'Completely integrated M&amp;E covering planning through line, hangar, shop and engine maintenance, reliability, engineering and technical records',
      'Pre-built regulatory reporting for EASA, DGAC, CAA, FAA and JAR',
      'Spec 2000 e-business with suppliers for procurement and repair',
      'Power-by-hour and materials contract management',
      'On-premises or cloud, with LEAN-model accelerated implementation',
    ],
    proof: 'Korean Air, Etihad Airways Engineering and AirAsia appear across Ramco’s aviation pages.',
    src: '/products/aviation-software/airlines-industry/',
  },
  {
    k: 'Engine MRO',
    who: 'Engine shop or OEM aftermarket',
    pain: [
      'Slots committed before the true workscope is known',
      'LLP dispositions decided late, moving build cost after the price is agreed',
      'Billing reconstructed from records days after the engine ships',
    ],
    gain: [
      'Purpose-built engine module: slot management, workscope evaluation, visit, estimation, build-up, kitting',
      'Pre-induction hub handling missing and unknown components before work starts',
      'LLP dispositions recommended against target build value',
      'Marshalling and kitting hub monitoring target configuration',
      'Fixed price, full fixed price and NTE with scrap limits, caps and upgrade differentials',
      'Near-automated billing once the visit closes',
    ],
    proof: 'Ramco publishes a case study on how Asia’s largest engine MRO transformed its operations.',
    src: '/products/aviation-software/engine-mro-software',
  },
  {
    k: 'Component &amp; line MRO',
    who: 'Repair station, AMO, line network',
    pain: [
      'Customers phoning for status you can’t give them',
      'Quotes going out after the work is already finished',
      'Line stations working on paper because there’s no signal',
    ],
    gain: [
      'Component receipt through to ARC release, with quote management and invoicing',
      'Customer portal carrying interactions, approvals and collaborative requests',
      'AMO and line station operations with work scoping, defect reporting and flight service billing',
      'Offline field maintenance with full line maintenance support',
      'Electronic job cards and digital signatures with log tracking',
      'Part 145 and Part M repair station processes',
    ],
    proof: 'Ramco cites customer portals producing service level enhancements of up to 30%.',
    src: '/products/aviation-software/mro-industry/',
  },
  {
    k: 'Helicopter operator',
    who: 'Civil, offshore, EMS or military rotary',
    pain: [
      'Working where there is no connectivity, then catching up on paperwork later',
      'Journey logs that never quite reconcile with the customer invoice',
      'Time-based depreciation that misprices hard-flown assets',
    ],
    gain: [
      'Full spectrum of rotary maintenance: planning, line, hangar, shop and engine, reliability, engineering, technical records',
      'Offline field maintenance system for remote operations',
      'EFB with performance calculation, navigation and fuel planning',
      'Parameter value tracking and position-based schedule tracking',
      'Flight contracting and invoicing from journey log to customer invoice',
      'Usage-based depreciation replacing time-based',
      'Power-by-hour contracts',
    ],
    proof:
      'Ramco states it is trusted by 7 of the top 10 heli operators. Columbia Helicopters and PHI are published customers.',
    src: '/products/aviation-software/heli-operators-industry/',
  },
  {
    k: 'UAS &amp; eVTOL',
    who: 'Operator, OEM, or both at once',
    pain: [
      'You build the aircraft and operate it, but your ERP only understands one of those',
      'LRU stock levels guessed rather than optimised',
      'Programme accounting disconnected from the fleet that generates it',
    ],
    gain: [
      'End-to-end manufacturing: engineering setup, BOM, production planning and execution',
      'UAS-specific inventory control focused on line-replaceable units',
      'EFB integrating directly with the platform to capture performance data that drives maintenance',
      'Configuration management with multi-level sub-assemblies',
      'Tools and support equipment management, defect tracking',
      'Project accounting with contract framework and earned value',
    ],
    proof: 'General Atomics Aeronautical appears on Ramco’s aviation customer strip.',
    src: '/products/aviation-software/uas-drones/',
  },
  {
    k: 'Defense',
    who: 'Air arm, sustainment prime, government',
    pain: [
      'Green screens still running critical operations',
      'A different system for every fleet platform',
      'Readiness reported on a lag, when it needs to be current',
    ],
    gain: [
      'FMC / PMC / NMC readiness tracking in real time',
      'Configuration switching at speed based on mission requirements',
      'Offline mobile with electronic sign-off and dual authentication',
      'Government property control across CONUS and OCONUS, split by owned, GFE and CAP',
      'ITAR-compliant trade export control',
      'DCAA-compliant contracts and project accounting; DCMA, FAR/DFAR',
      'Fleet agnostic — aircraft, ships or tanks',
    ],
    proof: 'Babcock, Leidos and Transport Canada appear across Ramco’s aviation pages.',
    src: '/products/aviation-software/defense-asset-management/',
  },
];

/* ---------- CAPABILITY MATRIX (source L657–667, L1277–1284) ---------- */
export const MATRIX_COLUMNS = [
  'Maintenance & Engineering',
  'MRO execution',
  'Engine MRO',
  'Flight Operations',
  'Fleet technical records',
  'Supply chain',
  'Manufacturing',
  'Contracts & billing',
];

export const MROWS = [
  { k: 'Airline', v: [1, 1, 1, 1, 1, 1, 0, 1] },
  { k: 'Engine MRO', v: [0, 1, 1, 0, 0, 1, 0, 1] },
  { k: 'Component &amp; line MRO', v: [0, 1, 0, 0, 0, 1, 0, 1] },
  { k: 'Helicopter operator', v: [1, 1, 1, 1, 1, 1, 0, 1] },
  { k: 'UAS &amp; eVTOL', v: [1, 1, 0, 1, 1, 1, 1, 1] },
  { k: 'Defense', v: [1, 1, 0, 1, 1, 1, 0, 1] },
];

export const MATRIX_LEGEND = [
  'documented on Ramco’s page',
  'not stated on the site (not a claim of absence)',
];

/* ---------- RESULTS (source L674–687, L1167–1173) ---------- */
export const RESULTS = {
  eyebrow: 'Results',
  h2: 'Five leaks, closed',
  standfirst:
    'The outcomes Ramco publishes as benefits realised by its customers — each with the mechanism behind it, which is the part worth testing in a demo.',
  caveat:
    'Figures as published by Ramco. Ramco does not publish the sample, baseline or measurement window alongside them.',
};

export const BIGSTAT = {
  value: '$6M',
  title: 'Saved on warranty claims',
  body: 'Warranty entitlement sits in the same record as the part, its configuration position and its removal history — so a claimable removal shows up as claimable, instead of expiring quietly in a spreadsheet.',
};

export const METERS = [
  {
    v: 80,
    l: 'Automation of non-critical activity',
    s: 'Routine and non-routine estimation, task alignment against the manuals and compliance updates run automatically.',
  },
  {
    v: 40,
    l: 'Reduction in data corruption',
    s: 'Configuration, maintenance and supply chain share one record instead of being reconciled between three systems.',
  },
  {
    v: 30,
    l: 'Service level enhancement',
    s: 'Customer portals carry interactions, approvals and collaborative requests, so status is visible rather than requested.',
  },
  {
    v: 10,
    l: 'Reduction in revenue leakage',
    s: 'PBH, fixed price and blended contracts are enforced at the point of execution.',
  },
  {
    v: 6,
    l: 'Reduction in carrying cost',
    s: 'Demand-to-procurement runs one-touch off the maintenance plan, against real-time part readiness.',
  },
];

/* ---------- COMMERCIAL CONTROL (source L694–718) ---------- */
export const COMMERCIAL = {
  eyebrow: 'Commercial control',
  h2: 'Maintenance software that can’t price the work is only half a system',
  standfirst:
    'You can hit every turnaround target and still lose money. Ramco puts the commercial controls inside execution, not in a report afterwards.',
  cards: [
    {
      title: 'Every contract model',
      body: 'Power-by-hour, fixed price, full fixed price, not-to-exceed or blended — with complex customer SLAs managed against the work as it happens.',
    },
    {
      title: 'Limits enforced, not reported',
      body: 'Scrap limits, NTE limits, caps and upgrade differentials are controls in the workflow, so a breach needs an approval rather than an explanation.',
    },
    {
      title: 'Billing as a by-product',
      body: 'Price accrues progressively as work is recorded, so the invoice after an engine visit is close to automatic instead of reconstructed.',
    },
  ],
  cta: { label: 'Talk to us about your contract model', href: 'https://www.ramco.com/product-enquiry/' },
};

/* ---------- COMPLIANCE (source L725–747) ---------- */
export const COMPLIANCE = {
  eyebrow: 'Compliance',
  h2: 'Compliance isn’t a feature. It’s your permission to operate.',
  standfirst:
    'Ramco makes compliance a property of the transaction rather than a report produced later, by integrating configuration, maintenance and supply chain activity in real time.',
  groups: [
    { title: 'Airworthiness', body: 'Part 145 · Part M · CAMO · MSG-3 · ARC release · AMM · IPC · EMM' },
    { title: 'Civil authorities', body: 'Pre-built reporting for EASA · FAA · CAA · DGAC · JAR' },
    { title: 'Defense &amp; trade', body: 'ITAR · DCAA · DCMA · FAR/DFAR · GFE · CAP · CONUS/OCONUS' },
    { title: 'Integration', body: 'Spec 2000 · Aeroxchange · FedEx · SAP · third-party APIs' },
  ],
};

/* ---------- CUSTOMERS (source L754–783) ---------- */
export const CUSTOMERS_INTRO = {
  eyebrow: 'Customers',
  h2: 'Airlines, engine shops, rotary fleets, defense primes, a national regulator',
  standfirst:
    'These operators have almost nothing in common except the problem — which is the strongest argument there is for a single platform.',
};

export const QUOTES = [
  {
    stars: 5,
    body: 'Praises having every area integrated into a single system, alongside an implementation and day-to-day experience that stayed easy for users.',
    by: 'Brenda Sugey L.',
    meta: 'Review published on G2, May 2024',
  },
  {
    stars: 5,
    body: 'Describes it as an ERP covering MRO for both aircraft and helicopters, where getting the catalogues and configuration right up front makes every later task easy to manage, follow up and report on.',
    by: 'Juan Carlos G.',
    meta: 'Review published on G2, April 2024',
  },
  {
    stars: 5,
    body: 'Calls it friendly and intuitive, with all areas integrated so processes are carried out correctly — used daily, which builds real fluency with the tool.',
    by: 'Antonio Z.',
    meta: 'Review published on G2, April 2024',
  },
];

export const CUSTOMERS = [
  { title: 'Airbus New Zealand', body: 'Published customer story on Ramco’s aviation resources hub.' },
  { title: 'Columbia Helicopters', body: 'Published customer story covering rotary operations.' },
  { title: 'PHI', body: 'Reaffirmed a decade-long relationship with Ramco.' },
];

/* ---------- FAQ (source L790–809) ---------- */
export const FAQ_INTRO = { eyebrow: 'FAQ', h2: 'Questions buyers ask us' };

export const FAQ = [
  {
    q: 'What does Ramco Aviation actually cover?',
    a: 'End-to-end maintenance, repair and overhaul for every MRO type — line, component, engine, hangar, heavy maintenance and OEM aftermarket services — plus maintenance and engineering, flight operations, fleet technical management and defense asset management. Supply chain, warranty, financials, purchasing, inventory and third-party maintenance sit in the same suite.',
  },
  {
    q: 'Can we run it in the cloud, or does it have to be on-premises?',
    a: 'Both. Ramco offers the suite on-premises to optimise your existing infrastructure, or on cloud within a secure delivery framework that avoids significant upfront infrastructure investment. Helicopter operators can take it on a subscription model.',
  },
  {
    q: 'Will it work where we have no connectivity?',
    a: 'Yes. Ramco’s offline field maintenance system provides full support for line maintenance operations, and the Fly Anywhere EFB runs fully offline then syncs back to the maintenance solution once connected. In defense, maintenance personnel can report work and complete electronic sign-offs offline with dual authentication.',
  },
  {
    q: 'Which regulators can it report to?',
    a: 'Pre-built regulatory report formats cover EASA, DGAC, CAA, FAA and JAR among others, with Part 145 and Part M repair station processes, CAMO and MSG-3 maintenance programs supported. Defense adds ITAR, DCAA, DCMA and FAR/DFAR compliance.',
  },
  {
    q: 'Do you handle engine MRO specifically, or is it generic?',
    a: 'Purpose-built. The engine module covers pre-induction, core work scoping, kitting and sourcing, work execution and pricing and billing as a single flow, with life-limited part dispositions recommended against target build value and a marshalling and kitting hub for monitoring target configurations.',
  },
  {
    q: 'What fleet types are supported?',
    a: 'Fixed wing and rotor wing on one platform, plus unmanned aircraft systems, drones and eVTOL — where Ramco also covers manufacturing for OEMs. In the defense build the same configuration engine is applied to aircraft, ships and tanks.',
  },
  {
    q: 'How quickly do we see a return?',
    a: 'Ramco cites customer-realised benefits of up to $6 million saved on warranty claims, a 40% reduction in data corruption, 6% off inventory carrying cost, 10% less revenue leakage and 80% automation of non-critical activity, with a LEAN implementation model to shorten time to benefit. Ramco does not publish the sample or baseline behind those figures — worth asking for in a reference call.',
  },
];

/* ---------- CTA (source L817–822) ---------- */
export const CTA = {
  h2: 'Bring us your hardest turnaround',
  body: 'The fastest way to judge this is against a job you already know the true cost of. Show us one engine visit or one base check, and we’ll walk it end to end — scoping, kitting, execution, invoice.',
  buttons: [
    { label: 'Book a demo', href: 'https://www.ramco.com/product-enquiry/', primary: true },
    { label: 'Read customer stories', href: 'https://www.ramco.com/resources/category/customer-stories', primary: false },
  ],
};

/* ---------- FOOTER (source L831–901) ---------- */
export const FOOTER = {
  about:
    'Aviation enterprise software for maintenance, engineering, flight operations and defense sustainment — powering 4,000+ aircraft and 24,000+ users globally.',
  columns: [
    {
      heading: 'Platform',
      links: [
        { label: 'Maintenance, Repair &amp; Overhaul', href: 'https://www.ramco.com/products/aviation-software/maintenance-repair-and-overhaul/' },
        { label: 'Engine MRO', href: 'https://www.ramco.com/products/aviation-software/engine-mro-software' },
        { label: 'Maintenance &amp; Engineering', href: 'https://www.ramco.com/products/aviation-software/maintenance-and-engineering/' },
        { label: 'Flight Operations', href: 'https://www.ramco.com/products/aviation-software/flight-operations/' },
        { label: 'Fleet Technical Management', href: 'https://www.ramco.com/products/aviation-software/fleet-technical-management/' },
        { label: 'Defense Asset Management', href: 'https://www.ramco.com/products/aviation-software/defense-asset-management/' },
      ],
    },
    {
      heading: 'Industries',
      links: [
        { label: 'Airlines', href: 'https://www.ramco.com/products/aviation-software/airlines-industry/' },
        { label: 'MRO providers', href: 'https://www.ramco.com/products/aviation-software/mro-industry/' },
        { label: 'Helicopter operators', href: 'https://www.ramco.com/products/aviation-software/heli-operators-industry/' },
        { label: 'UAS, drones &amp; eVTOL', href: 'https://www.ramco.com/products/aviation-software/uas-drones/' },
        { label: 'Defense', href: 'https://www.ramco.com/products/aviation-software/defense-industry/' },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: 'Customer stories', href: 'https://www.ramco.com/resources/category/customer-stories' },
        { label: 'Brochures', href: 'https://www.ramco.com/resources/category/brochures' },
        { label: 'Whitepapers', href: 'https://www.ramco.com/resources/category/whitepapers' },
        { label: 'Webinars', href: 'https://www.ramco.com/resources/category/webinars' },
        { label: 'Aviation blog', href: 'https://www.ramco.com/blog/topic/aviation' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About Ramco', href: 'https://www.ramco.com/about' },
        { label: 'Leadership', href: 'https://www.ramco.com/leadership/' },
        { label: 'Global offices', href: 'https://www.ramco.com/office-locations/' },
        { label: 'Partners', href: 'https://www.ramco.com/partners' },
        { label: 'Contact us', href: 'https://www.ramco.com/product-enquiry/' },
      ],
    },
  ],
  bottom: [
    '© 2026 Ramco Systems. All rights reserved.',
    'Demonstration page compiled from published Ramco material.',
  ],
};

export const SOURCE_NOTE = {
  body: 'Every claim on this page is drawn from Ramco’s published aviation pages, read in full on 12 August 2026. No engine modules are named because Ramco does not publish them; no competitor comparison is drawn because none is published.',
  link: { label: 'See the source pages', href: 'https://www.ramco.com/products/aviation-software/' },
};

/* ---------- INTERNAL NOTES (source L886–894) ---------- */
export const INTERNAL_NOTES = {
  summary: 'Internal note — delete this block before publishing',
  items: [
    {
      title: 'Domain experience stated two ways.',
      body: 'MRO industry page says 20+ years; Fleet Technical Management and Defense Asset Management say 25+ years.',
    },
    {
      title: 'Two product generations live at once.',
      body: 'Overview promotes Aviation 6.0; Airlines and Heli still describe the Series 5 Suite.',
    },
    {
      title: 'Heli EFB copy has aged.',
      body: 'Describes a Class 1 device on Windows Surface Tablets while other pages describe native apps and iPad.',
    },
    {
      title: 'Impact figures carry no methodology.',
      body: '$6M, 40%, 6%, 10%, 80% and the 30% service-level figure lack sample, baseline or window.',
    },
    {
      title: '"7 of the top 10 heli operators" cites no ranking',
      body: ', so a buyer cannot verify it.',
    },
    { title: 'G2 badge is dated Fall 2024', body: ' — roughly two years stale.' },
    {
      title: 'Testimonials are paraphrased',
      body: 'from G2 reviews shown on ramco.com. Swap in verbatim quotes once cleared with legal/marketing.',
    },
  ],
};

/** Build an absolute Ramco source URL from a stored path fragment (source L1069). */
export function srcUrl(path) {
  return META.root + path;
}
