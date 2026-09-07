// Explicit, serialisable AIRCRAFT-001 state (product.md §49). Every UI action mutates
// this object through `setState`, and every module reacts through `onChange`.
import type { CanonicalView, SystemId } from '../aircraft/AircraftSpec';
import { createLogger } from '../core/logger';

export type RenderMode = 'REALISTIC' | 'BLUEPRINT';
export type LightingPreset = 'STUDIO' | 'DAYLIGHT' | 'DUSK' | 'NIGHT' | 'AIRPORT';
export type GearState = 'EXTENDED' | 'RETRACTED';
export type SurfaceState = 'RETRACTED' | 'EXTENDED';
export type EngineState = 'OFF' | 'RUNNING';
export type VisibilityState = 'EXTERIOR_ONLY' | 'INTERIOR' | 'CUTAWAY' | 'FULL';

export interface AircraftState {
  view: CanonicalView | 'FREE';
  renderMode: RenderMode;
  lighting: LightingPreset;
  system: SystemId | null;
  selectedComponent: string | null;
  visibility: VisibilityState;
  cutawayEnabled: boolean;
  /** Cutaway plane position along the fuselage, 0 = nose … 1 = tail. */
  cutawayPosition: number;
  exploded: boolean;
  landingGear: GearState;
  flaps: SurfaceState;
  slats: SurfaceState;
  spoilers: SurfaceState;
  doors: 'CLOSED' | 'OPEN';
  cargoDoors: 'CLOSED' | 'OPEN';
  engineState: EngineState;
  autoRotate: boolean;
  showDimensions: boolean;
}

export const INITIAL_STATE: AircraftState = {
  view: 'FRONT_LEFT_3Q',
  renderMode: 'REALISTIC',
  lighting: 'STUDIO',
  system: null,
  selectedComponent: null,
  visibility: 'EXTERIOR_ONLY',
  cutawayEnabled: false,
  cutawayPosition: 0.5,
  exploded: false,
  landingGear: 'EXTENDED',
  flaps: 'RETRACTED',
  slats: 'RETRACTED',
  spoilers: 'RETRACTED',
  doors: 'CLOSED',
  cargoDoors: 'CLOSED',
  engineState: 'OFF',
  autoRotate: false,
  showDimensions: false,
};

type Listener = (next: AircraftState, prev: AircraftState, changed: Set<keyof AircraftState>) => void;

export class StateStore {
  private state: AircraftState = { ...INITIAL_STATE };
  private listeners = new Set<Listener>();
  private log = createLogger('State');

  get(): Readonly<AircraftState> { return this.state; }

  set(patch: Partial<AircraftState>): void {
    const prev = this.state;
    const changed = new Set<keyof AircraftState>();
    for (const k of Object.keys(patch) as Array<keyof AircraftState>) {
      if (patch[k] !== prev[k]) changed.add(k);
    }
    if (changed.size === 0) return;
    this.state = { ...prev, ...patch };
    this.log.info('state', Object.fromEntries([...changed].map((k) => [k, this.state[k]])));
    for (const l of this.listeners) l(this.state, prev, changed);
  }

  onChange(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}
