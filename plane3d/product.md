# ASTRA AIRCRAFT ATLAS --- AIRCRAFT-001

## Production Specification for a Consistent Three.js Aircraft Model

**Document purpose:** This specification defines the rules, geometry
requirements, visual identity, asset pipeline, validation loop, and
Three.js implementation requirements for building one production-quality
aircraft model from the supplied reference images.

------------------------------------------------------------------------

## 1. Core Goal

Build **one aircraft only**.

The aircraft must remain visually identical across:

-   Every exterior angle
-   Every orthographic view
-   Every interior view
-   Every system view
-   Every component close-up
-   Every animation state
-   Every Three.js camera position
-   Every generated texture and material
-   Every future reference image

The reference images are **different observations of the same physical
aircraft**, not separate aircraft designs.

The final result should feel like a single coherent manufactured
aircraft that could be photographed from any direction.

### Primary objective

Create a realistic, optimized, interactive 3D aircraft for the ASTRA
Aircraft Atlas in Three.js, with:

1.  Accurate exterior proportions
2.  Consistent geometry across all views
3.  Realistic materials
4.  Realistic cockpit and cabin
5.  Correct component hierarchy
6.  Interactive aircraft systems
7.  Clean scene structure
8.  Web-ready performance
9.  Stable camera/viewpoint behavior
10. A deterministic asset pipeline

------------------------------------------------------------------------

# 2. Canonical Aircraft Identity

Use this identifier everywhere:

``` text
AIRCRAFT-001
```

Never create another model variant unless explicitly requested.

## Locked reference specification

  Property                         Canonical value
  ---------------------- -------------------------
  Overall length                            39.5 m
  Overall height                            12.5 m
  Wingspan                                  35.8 m
  Wheelbase                                 13.0 m
  Nose-to-main-gear                         12.6 m
  Engine configuration               Twin turbofan
  Aircraft class           Single-aisle narrowbody
  Typical seating                            \~180
  Livery                              White + navy
  Tail                                        Navy
  Winglets                                    Navy
  Main fuselage accent                        Navy
  Landing gear                            Tricycle

These values are the **master dimensional constraints**.

If a later generated image conflicts with these values, do not alter the
3D model to match the conflicting image. Treat the image as an imperfect
reference and preserve the canonical specification.

------------------------------------------------------------------------

# 3. Non-Negotiable Consistency Rules

## Rule 1 --- One geometry source of truth

The 3D model is the authority.

Do not model each camera angle separately.

``` text
                    ONE AIRCRAFT MODEL
                           |
       ┌───────────────────┼───────────────────┐
       |                   |                   |
   Front camera       Side camera         Rear camera
       |                   |                   |
       └───────────────────┼───────────────────┘
                           |
                     Same geometry
```

A front view, rear view, side view, top view, and 3/4 view must all
render from the exact same mesh hierarchy.

------------------------------------------------------------------------

## Rule 2 --- Never mirror visual mistakes

The aircraft is symmetrical where physically appropriate.

Do not manually create unrelated left and right versions of:

-   Engines
-   Wings
-   Winglets
-   Landing gear
-   Doors
-   Cabin seats
-   Windows
-   Lighting
-   Exterior panels

Use controlled mirroring or shared source geometry where appropriate.

Asymmetrical details such as markings, antennas, service panels, or
specific access points must be intentionally documented.

------------------------------------------------------------------------

## Rule 3 --- Livery is locked

The following must never change between images:

-   White fuselage
-   Navy vertical stabilizer
-   Navy winglets
-   Navy fuselage stripe/accent
-   Window appearance
-   Door appearance
-   Engine appearance
-   Landing-gear appearance
-   Exterior panel finish

Do not allow a generated reference to introduce:

-   A different airline
-   A different tail color
-   A different stripe
-   Different winglets
-   Different window spacing
-   Different engine nacelles
-   Different nose geometry

------------------------------------------------------------------------

## Rule 4 --- No model drift

Model drift occurs when later assets gradually change the aircraft.

Example:

``` text
Reference 01
     ↓
Model A
     ↓
Reference 02
     ↓
Model B
     ↓
Reference 03
     ↓
Model C
```

This is prohibited.

Instead:

``` text
CANONICAL AIRCRAFT SPEC
          ↓
     MASTER MODEL
          ↓
 ┌────────┼────────┐
 ↓        ↓        ↓
View A   View B   View C
```

All future work must reference the master model.

------------------------------------------------------------------------

# 4. Coordinate System

Use a fixed aircraft coordinate system.

``` text
             +Y
              ↑
              |
              |
              |
              ●────────────→ +X
             /
            /
          +Z
```

Recommended interpretation:

``` text
+X = aircraft forward / nose
-X = aircraft rear / tail
+Y = aircraft right / starboard
-Y = aircraft left / port
+Z = upward
-Z = downward
```

The aircraft origin should be placed at a stable structural reference
point, preferably the fuselage centerline near the aircraft reference
datum.

Do not move the aircraft origin between versions.

------------------------------------------------------------------------

# 5. Master Dimensions

Normalize the model to real-world meters.

Target bounding dimensions:

``` text
X ≈ 39.5 m
Y ≈ 35.8 m
Z ≈ 12.5 m
```

The final bounding box should be validated programmatically.

Example:

``` js
const box = new THREE.Box3().setFromObject(aircraft);
const size = box.getSize(new THREE.Vector3());

console.log({
  length: size.x,
  width: size.y,
  height: size.z
});
```

Allow small geometric tolerances for:

-   antennas
-   lights
-   pitot probes
-   sensors
-   decorative details

Do not allow large dimensional deviations.

------------------------------------------------------------------------

# 6. Exterior Geometry Hierarchy

Use a semantic scene graph.

Recommended hierarchy:

``` text
AIRCRAFT-001
│
├── Fuselage
│   ├── Nose
│   ├── Radome
│   ├── ForwardFuselage
│   ├── CenterFuselage
│   └── AftFuselage
│
├── Cockpit
│   ├── Windshield
│   ├── NoseSensors
│   └── FlightDeck
│
├── Wings
│   ├── LeftWing
│   │   ├── Slats
│   │   ├── Flaps
│   │   ├── Spoilers
│   │   ├── Aileron
│   │   └── Winglet
│   │
│   └── RightWing
│       ├── Slats
│       ├── Flaps
│       ├── Spoilers
│       ├── Aileron
│       └── Winglet
│
├── Engines
│   ├── EngineLeft
│   │   ├── Nacelle
│   │   ├── Fan
│   │   ├── Spinner
│   │   ├── Pylon
│   │   ├── Reverser
│   │   └── Exhaust
│   │
│   └── EngineRight
│       └── ...
│
├── Tail
│   ├── VerticalStabilizer
│   ├── Rudder
│   ├── HorizontalStabilizerLeft
│   ├── HorizontalStabilizerRight
│   └── Elevators
│
├── LandingGear
│   ├── NoseGear
│   ├── MainGearLeft
│   └── MainGearRight
│
├── Doors
│   ├── ForwardLeft
│   ├── ForwardRight
│   ├── AftLeft
│   └── AftRight
│
├── Lights
│
├── Antennas
│
└── Interior
    ├── FlightDeck
    ├── Cabin
    ├── Galley
    ├── Lavatories
    └── Cargo
```

Use names that remain stable. These names will later become selectors
for the Aircraft Atlas UI.

------------------------------------------------------------------------

# 7. Exterior Modeling Order

Do not start with tiny details.

Build in this order:

## Phase A --- Primary volumes

1.  Fuselage
2.  Nose
3.  Tail cone
4.  Vertical stabilizer
5.  Horizontal stabilizers
6.  Main wings
7.  Winglets
8.  Engine nacelles
9.  Landing gear positions

At this stage the aircraft must already be recognizable from:

-   front
-   rear
-   left
-   right
-   top
-   bottom
-   3/4 front
-   3/4 rear

------------------------------------------------------------------------

## Phase B --- Secondary geometry

Add:

-   doors
-   windows
-   engine pylons
-   fairings
-   gear doors
-   control surfaces
-   antenna housings
-   lights
-   service panels
-   exhaust
-   nacelle details

------------------------------------------------------------------------

## Phase C --- Tertiary detail

Add:

-   panel seams
-   fasteners
-   hinges
-   access panels
-   sensor details
-   wheel details
-   fan blades
-   cabin details
-   cockpit controls

Do not add tertiary detail until the primary geometry passes all
orthographic checks.

------------------------------------------------------------------------

# 8. Reference Image Rules

Every generated or supplied image must be treated as **reference
evidence**, not absolute geometry.

Reference priority:

``` text
1. Canonical dimensions
2. Orthographic references
3. Multiple independent angles
4. Component references
5. Photorealistic renders
6. Decorative/generated details
```

If two references disagree:

``` text
Canonical specification wins.
Orthographic geometry wins over perspective imagery.
Multiple consistent references win over one inconsistent image.
```

Never distort the model to match a perspective image if doing so breaks
the orthographic proportions.

------------------------------------------------------------------------

# 9. Required Exterior Reference Set

The production reference library should contain:

### Orthographic

-   Left
-   Right
-   Front
-   Rear
-   Top
-   Bottom

### 3/4

-   Front-left
-   Front-right
-   Rear-left
-   Rear-right

### Underside

-   Bottom-front-left
-   Bottom-front-right
-   Bottom-rear-left
-   Bottom-rear-right

### Detail

-   Nose
-   Cockpit
-   Wing root
-   Wing tip
-   Winglet
-   Engine intake
-   Engine side
-   Engine exhaust
-   Pylon
-   Tail
-   Landing gear
-   Doors
-   Lights
-   Antennas

------------------------------------------------------------------------

# 10. Interior Modeling Rules

The interior must belong to the same physical aircraft.

Do not build an unrelated generic cabin.

The interior dimensions must remain compatible with:

``` text
Fuselage diameter
Cabin width
Cabin height
Door locations
Window locations
Wing position
Landing gear position
Cargo deck
Cockpit position
```

## Interior hierarchy

``` text
Interior
├── FlightDeck
├── ForwardGalley
├── ForwardCabin
├── MainCabin
├── ExitRows
├── AftCabin
├── AftGalley
├── Lavatories
├── Doors
├── OverheadBins
├── PassengerSeats
├── CabinWalls
├── CabinCeiling
├── CabinFloor
└── CargoHold
```

------------------------------------------------------------------------

# 11. Cockpit Rules

The cockpit must preserve the same aircraft identity.

Model:

-   instrument panel
-   primary flight displays
-   navigation displays
-   center display
-   glare shield
-   flight-control unit
-   overhead panel
-   center pedestal
-   thrust levers
-   speed-brake control
-   flap control
-   radio panels
-   side consoles
-   control sticks
-   rudder pedals
-   pilot seats
-   cockpit windows
-   cockpit door

Do not attempt manufacturing-level replication unless specifically
required.

The goal is **high visual fidelity with reasonable web geometry**.

------------------------------------------------------------------------

# 12. Passenger Cabin Rules

Maintain a coherent cabin system.

Model:

-   seats
-   seat backs
-   cushions
-   armrests
-   tray tables
-   seat pockets
-   seatbelts
-   IFE screens
-   windows
-   window frames
-   overhead bins
-   PSU panels
-   lights
-   air vents
-   call buttons
-   cabin signs
-   carpet
-   sidewalls
-   ceiling

Use instancing for repeated objects.

For example:

``` js
const seatMesh = ...;

for (let i = 0; i < seatCount; i++) {
  // Reuse geometry/material rather than cloning heavy geometry.
}
```

------------------------------------------------------------------------

# 13. Materials

Use physically plausible materials.

Recommended material categories:

``` text
AircraftPaint
Metal
BrushedMetal
Composite
Rubber
Glass
CockpitGlass
SeatFabric
Leather
CabinPlastic
Carpet
DisplayGlass
InteriorMetal
StructuralMetal
```

Do not create hundreds of nearly identical materials.

Reuse materials wherever possible.

------------------------------------------------------------------------

# 14. Exterior Paint

The fuselage should read as painted aircraft skin rather than flat white
plastic.

Use:

-   subtle roughness variation
-   very low-frequency surface variation
-   realistic specular response
-   controlled clearcoat where appropriate
-   subtle panel variation

Avoid:

-   excessive dirt
-   exaggerated scratches
-   unrealistic reflections
-   mirror-like white paint
-   plastic-looking surfaces

------------------------------------------------------------------------

# 15. Windows

Windows should be dark but physically integrated into the fuselage.

Avoid treating them as black stickers.

Use:

-   dark glass material
-   subtle reflection
-   slight transparency where useful
-   correct recess/profile
-   consistent spacing

Window positions must be locked to the canonical fuselage.

------------------------------------------------------------------------

# 16. Engines

The engine is a separate reusable asset.

Required hierarchy:

``` text
Engine
├── IntakeLip
├── Fan
├── Spinner
├── FanCase
├── Nacelle
├── Pylon
├── BypassDuct
├── Reverser
├── Core
└── ExhaustNozzle
```

The left and right engines must have identical dimensions.

Their position must be mirrored around the aircraft centerline unless an
intentional asymmetry is documented.

The fan must rotate independently if engine animation is implemented.

------------------------------------------------------------------------

# 17. Landing Gear

Landing gear must be modeled as articulated systems.

Hierarchy:

``` text
MainGear
├── Strut
├── Bogie
├── Wheels
├── Brakes
├── GearDoors
├── Actuator
└── HydraulicLines
```

Required states:

``` text
RETRACTED
EXTENDING
EXTENDED
```

Do not fake gear animation by scaling the entire gear assembly.

Use real pivot points.

------------------------------------------------------------------------

# 18. Flight Controls

Separate all major control surfaces:

``` text
Slat
Flap
Spoiler
Aileron
Elevator
Rudder
```

Each should have an independent transform.

Example:

``` js
aircraft.controls.leftAileron.rotation.z = value;
aircraft.controls.rudder.rotation.y = value;
```

The actual rotation axis must be positioned at the physical hinge.

------------------------------------------------------------------------

# 19. Doors

Doors should be independent objects.

States:

``` text
CLOSED
OPEN
```

The pivot must be placed at the actual hinge location.

Do not rotate a door around its geometric center.

The same rule applies to:

-   cargo doors
-   gear doors
-   service doors
-   cockpit door
-   lavatory doors
-   tray tables
-   overhead bins

------------------------------------------------------------------------

# 20. Interior Lighting

The cabin should support at least:

``` text
DAY
BOARDING
CRUISE
NIGHT
EMERGENCY
```

Use lighting states rather than rebuilding the interior.

------------------------------------------------------------------------

# 21. Camera System

The Aircraft Atlas should have canonical cameras.

``` text
LEFT
RIGHT
FRONT
REAR
TOP
BOTTOM

FRONT_LEFT_3Q
FRONT_RIGHT_3Q
REAR_LEFT_3Q
REAR_RIGHT_3Q

BOTTOM_FRONT_LEFT
BOTTOM_FRONT_RIGHT
BOTTOM_REAR_LEFT
BOTTOM_REAR_RIGHT
```

Each camera should be derived from the aircraft's fixed coordinate
system.

Never manually reposition cameras until they visually correspond to the
canonical view definitions.

------------------------------------------------------------------------

# 22. Camera Validation

For each canonical view:

1.  Center aircraft.
2.  Match framing.
3.  Match camera elevation.
4.  Match azimuth.
5.  Match focal length.
6.  Compare silhouette.
7.  Compare wing span.
8.  Compare tail position.
9.  Compare engine positions.
10. Compare landing gear.
11. Compare windows and doors.

The silhouette is more important than tiny surface details.

------------------------------------------------------------------------

# 23. Blueprint Mode

The website should support a technical blueprint mode.

Blueprint rendering should expose:

-   aircraft outline
-   structural boundaries
-   selected component
-   dimensions
-   labels
-   system groups
-   reference axes
-   measurement guides

Suggested visual treatment:

``` text
Background: dark engineering blue
Geometry: thin light technical lines
Selected component: high-contrast highlight
Dimensions: thin measurement lines
Labels: clean sans-serif
```

The blueprint is a visualization layer over the same 3D model.

It should not be a separate aircraft model.

------------------------------------------------------------------------

# 24. Realistic Render Mode

The realistic mode should use the same model and materials.

It should support:

-   studio lighting
-   airport lighting
-   daylight
-   dusk
-   night
-   interior lighting

The model must not change between blueprint and realistic modes.

Only the rendering configuration changes.

------------------------------------------------------------------------

# 25. System Visualization

Aircraft systems should be selectable.

Recommended system groups:

``` text
FLIGHT DECK & AVIONICS
AIRFRAME & STRUCTURE
WINGS & FLIGHT CONTROLS
PROPULSION & APU
LANDING GEAR
CABIN
DOORS & SLIDES
FUEL
HYDRAULIC
ELECTRICAL
ENVIRONMENTAL
CARGO
```

Selecting a system should highlight its corresponding scene nodes.

------------------------------------------------------------------------

# 26. Exploded View

The aircraft should support an optional exploded presentation.

Possible groups:

``` text
Fuselage
Wings
Engines
Tail
Landing Gear
Cabin
Cargo
Systems
```

Exploded movement should be deterministic.

Do not randomly scatter components.

Use predefined transforms:

``` js
component.userData.explodedPosition = new THREE.Vector3(...);
```

------------------------------------------------------------------------

# 27. Performance Rules

The model is intended for a web application.

Do not optimize by destroying visual quality.

Instead:

## Use

-   instancing
-   shared geometry
-   shared materials
-   texture atlases
-   compressed textures
-   LOD
-   frustum culling
-   lazy-loaded interiors
-   lazy-loaded system detail
-   separate high-detail components

## Avoid

-   thousands of duplicated meshes
-   unique material per object
-   unnecessarily dense hidden geometry
-   8K textures everywhere
-   full interior loading when exterior-only mode is active

------------------------------------------------------------------------

# 28. Level of Detail

Use at least three conceptual levels:

``` text
LOD0 — HERO
Maximum detail
Close inspection

LOD1 — NORMAL
Normal Aircraft Atlas viewing

LOD2 — DISTANT
Simplified exterior silhouette
```

Interior detail can be loaded separately.

------------------------------------------------------------------------

# 29. Texture Rules

Every texture should have a clear purpose.

Recommended categories:

``` text
Fuselage_BaseColor
Fuselage_Roughness
Fuselage_Normal

Wing_BaseColor
Wing_Roughness
Wing_Normal

Engine_BaseColor
Engine_Metalness
Engine_Roughness

Interior_BaseColor
Interior_Normal
Interior_Roughness
```

Do not bake photographic references directly into the aircraft surface.

The images are references for creating the actual material.

------------------------------------------------------------------------

# 30. Asset Naming Convention

Use deterministic names.

Example:

``` text
aircraft-001/
├── exterior/
│   ├── fuselage
│   ├── wings
│   ├── tail
│   ├── engines
│   └── landing-gear
│
├── interior/
│   ├── cockpit
│   ├── cabin
│   ├── galley
│   ├── lavatory
│   └── cargo
│
├── materials/
├── textures/
├── animations/
├── cameras/
└── references/
```

Three.js node names:

``` text
AIRCRAFT-001
FUSELAGE
WING_L
WING_R
WINGLET_L
WINGLET_R
ENGINE_L
ENGINE_R
TAIL_VERTICAL
TAIL_HORIZONTAL_L
TAIL_HORIZONTAL_R
GEAR_NOSE
GEAR_MAIN_L
GEAR_MAIN_R
```

------------------------------------------------------------------------

# 31. Reference Asset Manifest

Maintain a manifest rather than relying on filenames alone.

Example:

``` json
{
  "aircraft": "AIRCRAFT-001",
  "references": {
    "exterior": {
      "left": "exterior-left",
      "right": "exterior-right",
      "front": "exterior-front",
      "rear": "exterior-rear",
      "top": "exterior-top",
      "bottom": "exterior-bottom"
    },
    "threeQuarter": {
      "frontLeft": "front-left-3q",
      "frontRight": "front-right-3q",
      "rearLeft": "rear-left-3q",
      "rearRight": "rear-right-3q"
    },
    "interior": {
      "cockpit": "cockpit-reference",
      "cabin": "cabin-reference",
      "galley": "galley-reference",
      "lavatory": "lavatory-reference",
      "cargo": "cargo-reference"
    }
  }
}
```

------------------------------------------------------------------------

# 32. The Generation Loop

When generating additional reference images, always use this loop:

``` text
GENERATE
   ↓
COMPARE AGAINST CANONICAL AIRCRAFT
   ↓
IDENTIFY DIFFERENCES
   ↓
LOCK CORRECT FEATURES
   ↓
UPDATE MASTER MODEL
   ↓
RENDER ALL CANONICAL VIEWS
   ↓
COMPARE AGAIN
   ↓
ONLY THEN GENERATE MORE DETAIL
```

Never generate a new angle and immediately treat it as truth.

------------------------------------------------------------------------

# 33. Image-to-Model Feedback Loop

For every major modeling change:

### Step 1

Render:

``` text
front
rear
left
right
top
bottom
front-left
front-right
rear-left
rear-right
```

### Step 2

Create a comparison sheet.

### Step 3

Look for:

-   silhouette mismatch
-   wing mismatch
-   engine mismatch
-   tail mismatch
-   landing gear mismatch
-   window mismatch
-   door mismatch
-   livery mismatch
-   scale mismatch

### Step 4

Fix the geometry.

### Step 5

Repeat.

Do not proceed to detailed systems while primary geometry is still
inconsistent.

------------------------------------------------------------------------

# 34. Visual Identity Checklist

Every image must pass:

``` text
[ ] Same nose
[ ] Same cockpit windshield
[ ] Same fuselage length
[ ] Same fuselage diameter
[ ] Same window count/spacing
[ ] Same door positions
[ ] Same wing sweep
[ ] Same wing span
[ ] Same winglets
[ ] Same engine size
[ ] Same engine position
[ ] Same tail
[ ] Same stabilizers
[ ] Same landing gear
[ ] Same livery
[ ] Same colors
[ ] Same markings
```

------------------------------------------------------------------------

# 35. Interior Identity Checklist

``` text
[ ] Cockpit belongs to same aircraft
[ ] Cabin width matches fuselage
[ ] Windows align with exterior windows
[ ] Doors align with exterior doors
[ ] Exit rows align with exterior exits
[ ] Galley positions are physically plausible
[ ] Lavatories align with cabin plan
[ ] Cargo hold occupies correct lower volume
[ ] Overhead bins follow fuselage curvature
[ ] Cabin floor follows aircraft structure
```

------------------------------------------------------------------------

# 36. Geometry Validation

Before accepting a model version:

### Dimensional

``` text
Length ≈ 39.5 m
Span ≈ 35.8 m
Height ≈ 12.5 m
Wheelbase ≈ 13.0 m
```

### Symmetry

Check:

``` text
Left wing ↔ Right wing
Left engine ↔ Right engine
Left landing gear ↔ Right landing gear
Left stabilizer ↔ Right stabilizer
```

### Alignment

Check:

``` text
Windows ↔ cabin seats
Doors ↔ cabin doors
Engines ↔ pylons
Gear ↔ gear bays
Wings ↔ fuselage
Tail ↔ fuselage centerline
```

------------------------------------------------------------------------

# 37. Don't Build Fake Geometry Where It Matters

Avoid the following shortcuts:

``` text
Bad:
One flat wing mesh

Good:
Wing
+ slats
+ flaps
+ spoilers
+ aileron
+ winglet
```

``` text
Bad:
One engine cylinder

Good:
Nacelle
+ intake lip
+ fan
+ spinner
+ pylon
+ reverser
+ exhaust
```

``` text
Bad:
Black cockpit rectangle

Good:
Windshield geometry
+ cockpit interior
+ seats
+ instrument panel
+ reflections
```

------------------------------------------------------------------------

# 38. Hidden Geometry

Interior geometry may be hidden when the camera cannot see it.

However, do not delete geometry merely because it is not visible in one
reference.

Use visibility states:

``` text
EXTERIOR_ONLY
INTERIOR
SYSTEMS
CUTAWAY
FULL
```

This allows the same model to serve multiple atlas modes.

------------------------------------------------------------------------

# 39. Interactive Component Selection

Every major component should expose metadata.

Example:

``` js
mesh.userData = {
  aircraft: "AIRCRAFT-001",
  component: "ENGINE_L",
  system: "PROPULSION",
  ata: "71-80",
  label: "Engine Left",
  selectable: true
};
```

This allows the UI to display:

``` text
ENGINE LEFT
Propulsion
ATA 71–80
```

without hard-coding every object separately.

------------------------------------------------------------------------

# 40. Selection Behavior

When the user clicks a component:

1.  Identify the scene node.
2.  Read metadata.
3.  Highlight the component.
4.  Display its information.
5.  Optionally isolate it.
6.  Keep the rest of the aircraft visible unless isolation is requested.

Do not replace the component with a different model.

------------------------------------------------------------------------

# 41. Cutaway Mode

Cutaway mode should expose internal structure while maintaining spatial
continuity.

Possible techniques:

-   clipping planes
-   stencil masking
-   transparent materials
-   predefined hide/show groups
-   section planes

Do not create a completely separate aircraft solely for cutaway mode.

------------------------------------------------------------------------

# 42. Blueprint Overlay

The blueprint overlay should be derived from the model where possible.

Useful information:

``` text
overall length
wingspan
height
wheelbase
component boundaries
system boundaries
reference axes
```

This creates consistency between the actual 3D model and the technical
presentation.

------------------------------------------------------------------------

# 43. Realism Rules

Photorealism should come from:

-   correct proportions
-   realistic lighting
-   physically plausible materials
-   proper reflections
-   correct scale
-   subtle imperfections
-   accurate component relationships

Do not rely on:

-   excessive texture noise
-   fake dirt
-   excessive scratches
-   exaggerated bloom
-   artificial lens effects
-   unrealistic reflections

Geometry accuracy is more important than cinematic effects.

------------------------------------------------------------------------

# 44. Reference Image Generation Rules

When requesting new reference images, always specify:

``` text
AIRCRAFT-001
same aircraft
same dimensions
same fuselage
same wings
same engines
same tail
same winglets
same landing gear
same windows
same doors
same white/navy livery
same component positions
```

For technical views also specify:

``` text
orthographic
no perspective distortion
centered aircraft
neutral lighting
full aircraft visible
no people
no alternate aircraft
no design changes
```

For photorealistic views:

``` text
same geometry
same livery
same proportions
realistic materials
realistic lighting
realistic shadows
```

------------------------------------------------------------------------

# 45. Never Use Text as a Geometry Authority

Generated image labels can be wrong.

For example:

``` text
"39.5 m"
```

printed on an image does not guarantee that the depicted aircraft is
actually 39.5 m long.

Use the canonical specification and actual model measurements as the
authority.

------------------------------------------------------------------------

# 46. Production Pipeline

Recommended pipeline:

``` text
REFERENCE IMAGES
       ↓
REFERENCE MANIFEST
       ↓
CANONICAL DIMENSIONS
       ↓
PRIMARY BLOCKOUT
       ↓
ORTHOGRAPHIC VALIDATION
       ↓
SECONDARY GEOMETRY
       ↓
MATERIALS
       ↓
INTERIOR
       ↓
SYSTEMS
       ↓
ANIMATION
       ↓
OPTIMIZATION
       ↓
GLTF/GLB EXPORT
       ↓
THREE.JS IMPORT
       ↓
CAMERA VALIDATION
       ↓
INTERACTION
       ↓
FINAL AIRCRAFT ATLAS
```

------------------------------------------------------------------------

# 47. GLB / glTF Requirements

Prefer `.glb` for deployment.

Keep:

-   semantic node names
-   material names
-   animation names
-   metadata
-   transforms
-   hierarchy

Recommended animation names:

``` text
LandingGear_Extend
LandingGear_Retract
Flaps_Extend
Flaps_Retract
Slats_Extend
Slats_Retract
Spoilers_Deploy
Spoilers_Retract
Doors_Open
Doors_Close
CargoDoor_Open
CargoDoor_Close
Rudder_Move
Elevator_Move
Aileron_Left
Aileron_Right
Engine_Start
Engine_Stop
```

------------------------------------------------------------------------

# 48. Three.js Architecture

Separate responsibilities.

``` text
AircraftLoader
AircraftScene
AircraftMaterials
AircraftAnimations
AircraftSystems
AircraftSelection
AircraftCameras
AircraftBlueprint
AircraftCutaway
AircraftExplodedView
AircraftLighting
AircraftUI
```

Do not place the entire aircraft implementation inside one giant
component.

------------------------------------------------------------------------

# 49. State Model

Use explicit aircraft state.

Example:

``` js
const aircraftState = {
  view: "FRONT_LEFT_3Q",
  renderMode: "REALISTIC",
  system: null,
  selectedComponent: null,
  interiorVisible: false,
  cutawayEnabled: false,
  exploded: false,
  landingGear: "EXTENDED",
  flaps: "RETRACTED",
  spoilers: "RETRACTED",
  engineState: "OFF"
};
```

This makes the interface deterministic.

------------------------------------------------------------------------

# 50. Quality Gates

The project should not advance until these gates pass.

## Gate 1 --- Silhouette

All major views match.

## Gate 2 --- Proportions

Dimensions match canonical values.

## Gate 3 --- Component placement

Engines, wings, tail, doors and gear align.

## Gate 4 --- Livery

Colors and markings remain consistent.

## Gate 5 --- Interior

Interior physically matches exterior.

## Gate 6 --- Systems

Interactive systems correspond to actual model components.

## Gate 7 --- Performance

The aircraft remains usable in a browser.

## Gate 8 --- Final consistency

Every camera produces the same aircraft.

------------------------------------------------------------------------

# 51. Definition of Done

AIRCRAFT-001 is considered complete when:

``` text
[ ] One canonical master model exists
[ ] All dimensions are validated
[ ] All exterior views are consistent
[ ] Top and bottom geometry are correct
[ ] Both sides are consistent
[ ] Engines are modeled
[ ] Wings/control surfaces are separated
[ ] Landing gear is articulated
[ ] Doors are articulated
[ ] Cockpit is modeled
[ ] Cabin is modeled
[ ] Galley is modeled
[ ] Lavatories are modeled
[ ] Cargo hold is modeled
[ ] Materials are consistent
[ ] Livery is locked
[ ] Systems are selectable
[ ] Blueprint mode works
[ ] Realistic mode works
[ ] Cutaway mode works
[ ] Exploded mode works
[ ] Canonical cameras work
[ ] Animations work
[ ] GLB export works
[ ] Three.js loading works
[ ] Performance is acceptable
[ ] No camera reveals an inconsistent aircraft
```

------------------------------------------------------------------------

# 52. Absolute Rules

These rules override convenience.

### NEVER

-   create a different aircraft for another angle
-   change the aircraft proportions to match one bad reference
-   change the livery between views
-   invent a different engine
-   move windows to make an image look better
-   alter wing geometry between left and right
-   use different tail geometry in different renders
-   build a separate fake aircraft for blueprint mode
-   use a photograph as a texture when actual geometry is required
-   sacrifice primary geometry for tiny detail
-   add arbitrary components because they look realistic
-   treat generated text labels as engineering truth
-   accept one reference image without cross-checking it

### ALWAYS

-   preserve AIRCRAFT-001
-   preserve the canonical dimensions
-   use the master model
-   validate multiple views
-   keep geometry semantically organized
-   keep materials reusable
-   keep animations physically plausible
-   maintain a deterministic scene graph
-   validate before adding detail
-   preserve visual identity across every asset

------------------------------------------------------------------------

# 53. Final Mental Model

The project is not:

``` text
A collection of aircraft pictures.
```

It is:

``` text
ONE DIGITAL AIRCRAFT
        │
        ├── Exterior geometry
        ├── Interior geometry
        ├── Materials
        ├── Systems
        ├── Animations
        ├── Cameras
        ├── Blueprint representation
        └── Interactive metadata
```

The images exist to **measure, inspect, and validate that one
aircraft**.

The Three.js model is the final source of truth.

Every future reference image, render, animation, system visualization,
and UI interaction must remain subordinate to the canonical AIRCRAFT-001
model.

------------------------------------------------------------------------

## 54. Recommended Development Sequence

``` text
STEP 01
Lock AIRCRAFT-001 dimensions

STEP 02
Create fuselage blockout

STEP 03
Create wings and tail

STEP 04
Place engines

STEP 05
Place landing gear

STEP 06
Validate front/rear/top/bottom/side silhouettes

STEP 07
Add windows and doors

STEP 08
Add wing control surfaces

STEP 09
Detail engines

STEP 10
Detail landing gear

STEP 11
Apply exterior materials and livery

STEP 12
Build cockpit

STEP 13
Build passenger cabin

STEP 14
Build galley/lavatory/cargo

STEP 15
Create system groups

STEP 16
Create animations

STEP 17
Create canonical cameras

STEP 18
Create blueprint mode

STEP 19
Create cutaway mode

STEP 20
Create exploded mode

STEP 21
Optimize

STEP 22
Export GLB

STEP 23
Integrate into Three.js

STEP 24
Run all view consistency checks

STEP 25
Freeze AIRCRAFT-001 as the production master
```

------------------------------------------------------------------------

# 55. Final Principle

**Do not model an image. Model the aircraft that could have produced all
of the images.**

That distinction is the central rule of the entire project.
