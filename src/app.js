import { destroyAll } from './components/charts.js';
import { renderHeader } from './components/header.js';
import { renderNav } from './components/nav.js';
import { state, set, subscribe } from './state/store.js';
import * as overview from './views/overview.js';
import * as vessel from './views/vessel.js';
import * as schematic from './views/schematicView.js';
import * as design from './views/design.js';
import * as recipe from './views/recipe.js';
import * as trends from './views/trends.js';
import * as balance from './views/balance.js';
import * as heat from './views/heat.js';
import * as slag from './views/slag.js';
import * as offgas from './views/offgas.js';
import * as thermo from './views/thermo.js';
import * as ml from './views/ml.js';
import * as mpc from './views/mpc.js';
import * as scenarios from './views/scenarios.js';
import * as economics from './views/economics.js';
import * as reports from './views/reports.js';
import * as settings from './views/settings.js';

const VIEWS = { overview, vessel, schematic, design, recipe, trends, balance, heat, slag, offgas, thermo, ml, mpc, scenarios, economics, reports, settings };
let current = null;

export function renderView() {
  const main = document.getElementById('main');
  current?.dispose?.(); destroyAll();
  const mod = VIEWS[state.view] || overview; current = mod;
  try {
    const v = mod.render();
    main.innerHTML = v.html;
    v.mount?.(main);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="banner red">View error: ${String(e.message || e)}</div>`;
  }
}

export function go(view) {
  if (location.hash !== `#/${view}`) history.replaceState(null, '', `#/${view}`);
  set({ view });
}

export function start() {
  const hdr = document.getElementById('header'); const nav = document.getElementById('nav');
  const fromHash = () => { const v = location.hash.replace('#/', ''); if (VIEWS[v]) state.view = v; };
  fromHash(); window.addEventListener('hashchange', () => { fromHash(); set({ view: state.view }); });
  let lastView = null; let lastRun = null;
  subscribe((s, patch) => {
    renderHeader(hdr);
    if ('view' in patch || lastView !== s.view) { renderNav(nav, go); }
    const structural = ['view', 'run', 'rec', 'recon', 'ml', 'mlCard', 'compare', 'design', 'thermo', 'audit', 'grades', 'demoHeats', 'scenarios', 'busy', 'draft', 'settings', 'meta'];
    const keys = Object.keys(patch);
    if (keys.some((k) => structural.includes(k))) {
      // avoid re-rendering heavy 3D/inputs on pure draft edits unless the view displays the draft
      if (keys.length === 1 && keys[0] === 'draft' && !['recipe', 'design'].includes(s.view)) return;
      if (keys.length === 1 && keys[0] === 'draft' && s.view === 'recipe' && document.activeElement?.tagName === 'INPUT') { lastView = s.view; return; }
      renderView();
    }
    lastView = s.view; lastRun = s.run;
  });
  renderHeader(hdr); renderNav(nav, go); renderView();
  void lastRun;
}
