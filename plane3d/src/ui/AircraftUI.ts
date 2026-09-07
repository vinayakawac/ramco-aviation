// DOM control panel for AIRCRAFT-001. Reads/writes the StateStore only; it never touches
// meshes directly. Shows the selected component's §39 metadata and the quality tier.
import { CANONICAL_VIEWS, MASTER, SYSTEMS, type CanonicalView, type SystemId } from '../aircraft/AircraftSpec';
import type { StateStore, AircraftState, LightingPreset } from '../modes/AircraftState';
import type { SelectionInfo } from '../modes/AircraftSelection';
import type { QualityProfile } from '../core/quality';

export interface UIHooks {
  exportGLB: () => void;
  captureRenders: () => void;
}

const VIEW_LABELS: Record<CanonicalView, string> = {
  LEFT: 'Left', RIGHT: 'Right', FRONT: 'Front', REAR: 'Rear', TOP: 'Top', BOTTOM: 'Bottom',
  FRONT_LEFT_3Q: 'Front-L ¾', FRONT_RIGHT_3Q: 'Front-R ¾', REAR_LEFT_3Q: 'Rear-L ¾', REAR_RIGHT_3Q: 'Rear-R ¾',
  BOTTOM_FRONT_LEFT: 'Under F-L', BOTTOM_FRONT_RIGHT: 'Under F-R', BOTTOM_REAR_LEFT: 'Under R-L', BOTTOM_REAR_RIGHT: 'Under R-R',
};

export class AircraftUI {
  private el: HTMLElement;
  private info: HTMLElement;
  private stats: HTMLElement;

  constructor(store: StateStore, quality: QualityProfile, triangles: number, hooks: UIHooks) {
    this.el = document.getElementById('ui')!;
    this.el.innerHTML = this.template();
    this.info = this.el.querySelector('#info')!;
    this.stats = this.el.querySelector('#stats')!;
    this.stats.textContent = `${quality.tier.replace('T', '')}p tier · ${triangles.toLocaleString()} tris · 1 m = ${(1 / 4).toFixed(2)} u`;

    // views
    const views = this.el.querySelector('#views')!;
    for (const v of Object.keys(CANONICAL_VIEWS) as CanonicalView[]) {
      const b = document.createElement('button');
      b.textContent = VIEW_LABELS[v];
      b.dataset.view = v;
      b.onclick = () => store.set({ view: v });
      views.appendChild(b);
    }
    // systems
    const systems = this.el.querySelector('#systems')!;
    for (const s of Object.keys(SYSTEMS) as SystemId[]) {
      const b = document.createElement('button');
      b.textContent = SYSTEMS[s].label;
      b.dataset.system = s;
      b.onclick = () => store.set({ system: store.get().system === s ? null : s });
      systems.appendChild(b);
    }
    // toggles
    const bind = (id: string, fn: (s: AircraftState) => Partial<AircraftState>) => {
      this.el.querySelector<HTMLButtonElement>(`#${id}`)!.onclick = () => store.set(fn(store.get()));
    };
    bind('mode', (s) => ({ renderMode: s.renderMode === 'REALISTIC' ? 'BLUEPRINT' : 'REALISTIC' }));
    bind('gear', (s) => ({ landingGear: s.landingGear === 'EXTENDED' ? 'RETRACTED' : 'EXTENDED' }));
    bind('flaps', (s) => ({ flaps: s.flaps === 'EXTENDED' ? 'RETRACTED' : 'EXTENDED', slats: s.flaps === 'EXTENDED' ? 'RETRACTED' : 'EXTENDED' }));
    bind('spoilers', (s) => ({ spoilers: s.spoilers === 'EXTENDED' ? 'RETRACTED' : 'EXTENDED' }));
    bind('doors', (s) => ({ doors: s.doors === 'OPEN' ? 'CLOSED' : 'OPEN' }));
    bind('cargo', (s) => ({ cargoDoors: s.cargoDoors === 'OPEN' ? 'CLOSED' : 'OPEN' }));
    bind('engines', (s) => ({ engineState: s.engineState === 'OFF' ? 'RUNNING' : 'OFF' }));
    bind('exploded', (s) => ({ exploded: !s.exploded }));
    bind('cutaway', (s) => ({ cutawayEnabled: !s.cutawayEnabled, visibility: !s.cutawayEnabled ? 'CUTAWAY' : 'EXTERIOR_ONLY' }));
    bind('interior', (s) => ({ visibility: s.visibility === 'INTERIOR' ? 'EXTERIOR_ONLY' : 'INTERIOR', cutawayEnabled: false }));
    bind('rotate', (s) => ({ autoRotate: !s.autoRotate }));
    this.el.querySelector<HTMLSelectElement>('#lighting')!.onchange = (e) => store.set({ lighting: (e.target as HTMLSelectElement).value as LightingPreset });
    this.el.querySelector<HTMLInputElement>('#cutDepth')!.oninput = (e) => store.set({ cutawayPosition: Number((e.target as HTMLInputElement).value) });
    this.el.querySelector<HTMLButtonElement>('#export')!.onclick = hooks.exportGLB;
    this.el.querySelector<HTMLButtonElement>('#renders')!.onclick = hooks.captureRenders;
    this.el.querySelector<HTMLButtonElement>('#collapse')!.onclick = () => this.el.classList.toggle('collapsed');

    store.onChange((s) => this.sync(s));
    this.sync(store.get());
  }

  private template(): string {
    return `
      <header>
        <div><h1>AIRCRAFT-001</h1><p class="sub">Single-aisle twin turbofan · ${MASTER.length} m · ${MASTER.wingspan} m span</p></div>
        <button id="collapse" title="Collapse panel">☰</button>
      </header>
      <section><h2>Canonical views</h2><div id="views" class="grid"></div></section>
      <section><h2>Render</h2>
        <div class="row">
          <button id="mode">Blueprint</button>
          <select id="lighting">
            <option value="STUDIO">Studio</option><option value="DAYLIGHT">Daylight</option><option value="DUSK">Dusk</option><option value="NIGHT">Night</option><option value="AIRPORT">Airport</option>
          </select>
          <button id="rotate">Auto-rotate</button>
        </div>
      </section>
      <section><h2>Aircraft state</h2>
        <div class="grid">
          <button id="gear">Gear</button><button id="flaps">Flaps + slats</button><button id="spoilers">Spoilers</button>
          <button id="doors">Doors</button><button id="cargo">Cargo doors</button><button id="engines">Engines</button>
        </div>
      </section>
      <section><h2>Modes</h2>
        <div class="grid">
          <button id="interior">Interior</button><button id="cutaway">Cutaway</button><button id="exploded">Exploded</button>
        </div>
        <label class="slider">Cut depth <input id="cutDepth" type="range" min="0" max="1" step="0.01" value="0.5"></label>
      </section>
      <section><h2>Systems</h2><div id="systems" class="list"></div></section>
      <section id="info" class="info"><p class="hint">Click any component to inspect it.</p></section>
      <footer>
        <div class="row"><button id="export">Export GLB</button><button id="renders">Capture canonical renders</button></div>
        <p id="stats" class="stats"></p>
      </footer>`;
  }

  private sync(s: AircraftState): void {
    const on = (sel: string, v: boolean) => this.el.querySelector(sel)?.classList.toggle('on', v);
    this.el.querySelectorAll<HTMLButtonElement>('#views button').forEach((b) => b.classList.toggle('on', b.dataset.view === s.view));
    this.el.querySelectorAll<HTMLButtonElement>('#systems button').forEach((b) => b.classList.toggle('on', b.dataset.system === s.system));
    on('#mode', s.renderMode === 'BLUEPRINT');
    on('#gear', s.landingGear === 'RETRACTED');
    on('#flaps', s.flaps === 'EXTENDED');
    on('#spoilers', s.spoilers === 'EXTENDED');
    on('#doors', s.doors === 'OPEN');
    on('#cargo', s.cargoDoors === 'OPEN');
    on('#engines', s.engineState === 'RUNNING');
    on('#exploded', s.exploded);
    on('#cutaway', s.cutawayEnabled);
    on('#interior', s.visibility === 'INTERIOR');
    on('#rotate', s.autoRotate);
    this.el.querySelector<HTMLButtonElement>('#gear')!.textContent = s.landingGear === 'EXTENDED' ? 'Gear: down' : 'Gear: up';
    this.el.querySelector<HTMLSelectElement>('#lighting')!.value = s.lighting;
    this.el.classList.toggle('blueprint', s.renderMode === 'BLUEPRINT');
  }

  showSelection(info: SelectionInfo | null): void {
    if (!info) { this.info.innerHTML = '<p class="hint">Click any component to inspect it.</p>'; return; }
    this.info.innerHTML = `
      <h3>${info.label.toUpperCase()}</h3>
      <p>${SYSTEMS[info.system].label}</p>
      <p class="ata">ATA ${info.ata}</p>
      <p class="node">node <code>${info.node.name}</code> · component <code>${info.component}</code></p>`;
  }

  showDimensions(readout?: Record<string, string>): void {
    const el = this.el.querySelector('#dims');
    if (el) el.remove();
    if (!readout) return;
    const d = document.createElement('section');
    d.id = 'dims';
    d.innerHTML = `<h2>Measured</h2><p>Length ${readout.length}</p><p>Span ${readout.span}</p><p>Height ${readout.height}</p>`;
    this.el.querySelector('footer')!.before(d);
  }
}
