// Drives the declarative hinge/spin channels (PartContext.applyChannel) from the state.
// Each channel eases toward its target; the fan spins continuously while the engine runs.
// Product.md §47 animation names map onto these channels.
import * as THREE from 'three';
import { applyChannel, type AnimChannel } from '../aircraft/parts/PartContext';
import type { AircraftState } from './AircraftState';
import { createLogger } from '../core/logger';

interface Channel { value: number; target: number; speed: number /* per second */ }

const DURATIONS: Partial<Record<AnimChannel, number>> = {
  gear: 6, flaps: 4, slats: 4, spoilers: 1.5, doors: 3, cargoDoors: 3, reverser: 1.5, aileron: 0.8, elevator: 0.8, rudder: 0.8, cockpitDoor: 1.5, lavDoors: 1.5,
};

export class AircraftAnimations {
  private channels = new Map<AnimChannel, Channel>();
  private fanAngle = 0;
  private fanSpeed = 0; // revolutions per second
  private fanTarget = 0;
  private log = createLogger('Animations');
  /** Control-surface demo: gently cycles aileron/elevator/rudder while engines run. */
  private demoTime = 0;

  constructor(private aircraft: THREE.Object3D) {
    for (const ch of Object.keys(DURATIONS) as AnimChannel[]) {
      this.channels.set(ch, { value: ch === 'aileron' || ch === 'elevator' || ch === 'rudder' ? 0.5 : 0, target: ch === 'aileron' || ch === 'elevator' || ch === 'rudder' ? 0.5 : 0, speed: 1 / DURATIONS[ch]! });
    }
    // apply rest pose once so every hinge sits at its documented neutral
    for (const [ch, c] of this.channels) applyChannel(aircraft, ch, c.value);
  }

  /** Map high-level state to channel targets. */
  applyState(s: AircraftState): void {
    this.setTarget('gear', s.landingGear === 'RETRACTED' ? 1 : 0);
    this.setTarget('flaps', s.flaps === 'EXTENDED' ? 1 : 0);
    this.setTarget('slats', s.slats === 'EXTENDED' ? 1 : 0);
    this.setTarget('spoilers', s.spoilers === 'EXTENDED' ? 1 : 0);
    this.setTarget('doors', s.doors === 'OPEN' ? 1 : 0);
    this.setTarget('cargoDoors', s.cargoDoors === 'OPEN' ? 1 : 0);
    this.setTarget('cockpitDoor', s.visibility === 'INTERIOR' || s.visibility === 'FULL' ? 1 : 0);
    this.fanTarget = s.engineState === 'RUNNING' ? 2.2 : 0;
    this.setTarget('reverser', s.engineState === 'RUNNING' && s.spoilers === 'EXTENDED' ? 1 : 0);
  }

  setTarget(ch: AnimChannel, target: number): void {
    const c = this.channels.get(ch);
    if (!c) return;
    if (c.target !== target) this.log.debug('target', { channel: ch, target });
    c.target = target;
  }

  /** Advance all channels by dt seconds. Returns true if anything moved. */
  update(dt: number): boolean {
    let moved = false;
    for (const [ch, c] of this.channels) {
      if (Math.abs(c.target - c.value) < 1e-4) continue;
      const step = c.speed * dt;
      c.value = c.value < c.target ? Math.min(c.target, c.value + step) : Math.max(c.target, c.value - step);
      applyChannel(this.aircraft, ch, easeInOut(c.value));
      moved = true;
    }
    // fan: spin up / down smoothly, then keep turning
    this.fanSpeed += (this.fanTarget - this.fanSpeed) * Math.min(1, dt * 0.8);
    if (this.fanSpeed > 0.01) {
      this.fanAngle = (this.fanAngle + this.fanSpeed * dt) % 1;
      applyChannel(this.aircraft, 'engine', this.fanAngle);
      moved = true;
      // subtle live control-surface motion while running (keeps hinges visibly real)
      this.demoTime += dt;
      const a = 0.5 + 0.25 * Math.sin(this.demoTime * 0.9);
      const e = 0.5 + 0.2 * Math.sin(this.demoTime * 0.7 + 1);
      const r = 0.5 + 0.2 * Math.sin(this.demoTime * 0.5 + 2);
      applyChannel(this.aircraft, 'aileron', a);
      applyChannel(this.aircraft, 'elevator', e);
      applyChannel(this.aircraft, 'rudder', r);
    } else if (this.demoTime > 0) {
      // return control surfaces to neutral once the engines stop
      this.demoTime = 0;
      applyChannel(this.aircraft, 'aileron', 0.5);
      applyChannel(this.aircraft, 'elevator', 0.5);
      applyChannel(this.aircraft, 'rudder', 0.5);
      moved = true;
    }
    return moved;
  }

  /** Snap every channel to its target (used for deterministic render captures). */
  settle(): void {
    for (const [ch, c] of this.channels) { c.value = c.target; applyChannel(this.aircraft, ch, easeInOut(c.value)); }
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
