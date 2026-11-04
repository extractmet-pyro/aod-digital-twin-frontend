import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { buildBath } from './bath.js';
import { makeControls } from './controls.js';
import { buildHood, buildLance } from './lance.js';
import { buildChunks, buildPlume } from './plume.js';
import { buildSlag } from './slag.js';
import { buildTuyeres, gasMixColor } from './tuyeres.js';
import { buildStands, buildVessel } from './vesselGeometry.js';

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}

function label(text, cls = '') { const d = document.createElement('div'); d.className = `vessel-label ${cls}`; d.textContent = text; return new CSS2DObject(d); }

/** Creates the interactive AOD vessel. All process quantities come from backend series (run.series);
 * geometry from run.summary.geometry. Frame rate never drives simulation time. */
export function createVesselScene(container, run, opts = {}) {
  const g = run.summary.geometry;
  const S = run.series;
  const W = container.clientWidth || 800; const H = container.clientHeight || 520;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W, H);
  renderer.shadowMap.enabled = true; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  const lr = new CSS2DRenderer(); lr.setSize(W, H); lr.domElement.style.position = 'absolute'; lr.domElement.style.top = '0'; lr.domElement.style.pointerEvents = 'none';
  container.appendChild(lr.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07090c, 18, 40);
  const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0x9fb4c8, 0x101418, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(6, 12, 8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
  const rim = new THREE.DirectionalLight(0x5aa0ff, 0.5); rim.position.set(-8, 5, -6); scene.add(rim);

  let cut = opts.cutaway !== false;
  const root = new THREE.Group(); scene.add(root);
  const tilt = new THREE.Group(); root.add(tilt);
  let vessel; let bath; let slag; let tuy; let lance; let p;
  const hoodGrp = new THREE.Group(); scene.add(hoodGrp);
  const plume = buildPlume(opts.mini ? 450 : 1000); const chunks = buildChunks();
  const labels = {};

  function build() {
    tilt.clear();
    vessel = buildVessel(g, { cut }); p = vessel.p;
    tilt.position.y = vessel.trunnionY; vessel.group.position.y = -vessel.trunnionY; tilt.add(vessel.group);
    bath = buildBath(p, cut); vessel.group.add(bath.mesh);
    slag = buildSlag(p, cut); vessel.group.add(slag.mesh);
    tuy = buildTuyeres(p, g); vessel.group.add(tuy.group);
    lance = buildLance(p); lance.group.visible = !!g.top_lance_installed; scene.add(lance.group);
    vessel.group.add(plume.points); vessel.group.add(chunks.group);
    labels.shell = label('Steel shell'); labels.work = label('Working lining'); labels.safety = label('Safety lining');
    labels.bath = label('Metal bath', 'hot'); labels.slag = label('Slag'); labels.tuy = label('Side tuyeres'); labels.trun = label('Trunnion ring');
    labels.shell.position.set(p.rOut + 0.05, p.bottom + p.yCone * 0.85, 0.5); labels.work.position.set(-p.rIn - 0.1, p.bottom + p.yCone * 0.75, p.rIn * 0.4);
    labels.safety.position.set(-p.rIn - p.lin * 0.7, p.bottom + p.yCone * 0.3, p.rIn * 0.6);
    labels.tuy.position.set(-p.rOut - 1.6, tuy.y - 0.3, 0.6); labels.trun.position.set(p.rOut + 0.9, vessel.trunnionY + 0.9, -0.6);
    Object.values(labels).forEach((l) => vessel.group.add(l));
  }
  build();
  hoodGrp.add(buildStands(p, vessel.trunnionY));
  const hood = buildHood(p); hoodGrp.add(hood.group);
  labels.hood = label('Hood · off-gas duct'); labels.hood.position.set(0, p.bottom + p.H + 2.4, 0); hoodGrp.add(labels.hood);
  labels.an = label('Gas analyzer'); labels.an.position.copy(hood.analyzer.position).add(new THREE.Vector3(0.4, 0.5, 0)); hoodGrp.add(labels.an);
  labels.lance = label('Top O₂ lance'); lance.group.add(labels.lance); labels.lance.position.set(0.4, 0.6, 0);

  const target = new THREE.Vector3(0, p.bottom + p.H * 0.55, 0);
  const home = new THREE.Vector3(p.rOut * 2.2 + 5.5, p.bottom + p.H * 0.75 + 1.5, p.rOut * 3.2 + 8);
  cam.position.copy(home);
  const ctl = makeControls(cam, renderer.domElement, target);

  let frame = opts.frame ?? S.t_s.length - 1; let paused = !!opts.reducedMotion; let showLabels = true; let xray = false;
  let tiltAngle = 0; let lastT = S.t_s[frame];
  const addEvents = (run.summary.events || []).filter((e) => e.kind === 'addition');
  const mats = { flux: ['lime', 'dolime', 'fluorspar'], reductant: ['FeSi75', 'Al'], coolant: ['SS_scrap', 'Fe_scrap'] };
  const kindOf = (m) => Object.keys(mats).find((k) => mats[k].includes(m)) || 'alloy';

  function applyFrame(i) {
    frame = Math.max(0, Math.min(S.t_s.length - 1, i));
    const depth = S.bath_depth_m[frame]; const Tm = S.T_metal_C[frame];
    bath.update(depth, Tm);
    const slagTh = S.slag_kg[frame] / 2900 / (Math.PI * p.rIn * p.rIn);
    slag.update(p.bottom + depth, Math.max(0.05, slagTh), S.s_Cr2O3[frame], S.T_slag_C[frame]);
    lance.update(p.bottom + depth + vessel.trunnionY * 0, g.lance_height_above_bath_m || 2, S.O2_top_Nm3_min[frame]);
    const kind = S.stage_kind[frame];
    tiltAngle = kind === 'turndown' ? 0.85 : (kind === 'tap' ? 1.3 : 0);
    labels.bath.element.textContent = `Metal ${(S.metal_kg[frame] / 1000).toFixed(1)} t · ${Tm.toFixed(0)} °C · C ${S.m_C[frame].toFixed(3)} % · Cr ${S.m_Cr[frame].toFixed(2)} %`;
    labels.bath.position.set(p.rOut + 1.4, p.bottom + depth * 0.4, p.rIn * 0.5);
    labels.slag.element.textContent = `Slag ${(S.slag_kg[frame] / 1000).toFixed(2)} t · Cr₂O₃ ${S.s_Cr2O3[frame].toFixed(1)} % · B₂ ${S.B2[frame].toFixed(2)}`;
    labels.slag.position.set(p.rOut + 1.4, p.bottom + depth + slagTh + 0.7, p.rIn * 0.5);
    labels.tuy.element.textContent = `Tuyeres ×${g.n_tuyeres}: O₂ ${S.O2_side_Nm3_min[frame].toFixed(0)} · Ar ${S.Ar_Nm3_min[frame].toFixed(0)} · N₂ ${S.N2_Nm3_min[frame].toFixed(0)} Nm³/min`;
    labels.hood.element.textContent = `Off-gas ${S.offgas_vessel_Nm3_min[frame].toFixed(0)} Nm³/min · CO ${S.vg_CO[frame].toFixed(0)} % · ${S.T_offgas_C[frame].toFixed(0)} °C`;
    labels.work.element.textContent = `Working lining · hot face ${S.T_hotface_C[frame].toFixed(0)} °C`;
    labels.shell.element.textContent = `Shell ${S.T_shell_C[frame].toFixed(0)} °C`;
    const t = S.t_s[frame];
    if (t > lastT) for (const e of addEvents) if (e.t_s > lastT && e.t_s <= t && !opts.reducedMotion) chunks.drop(new THREE.Vector3(-0.6, p.bottom + p.H + 0.6, 0.2), kindOf(e.material));
    lastT = t;
    opts.onFrame?.(frame);
  }
  applyFrame(frame);

  const clock = new THREE.Clock(); let raf = 0; let playing = false; let playAcc = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    if (playing) { playAcc += dt * (opts.playSpeed || 12); while (playAcc >= 1) { playAcc -= 1; if (frame < S.t_s.length - 1) applyFrame(frame + 1); else playing = false; } }
    tilt.rotation.x += (tiltAngle - tilt.rotation.x) * Math.min(1, dt * 2.5);
    if (!paused) {
      const fl = S.O2_side_Nm3_min[frame] + S.Ar_Nm3_min[frame] + S.N2_Nm3_min[frame];
      const color = gasMixColor(S.O2_side_Nm3_min[frame], S.Ar_Nm3_min[frame], S.N2_Nm3_min[frame]);
      const co = S.vg_CO[frame] / 100;
      plume.step(dt, { tips: tuy.tips, rate: 4 * fl, color, surfaceY: p.bottom + S.bath_depth_m[frame], rIn: p.rIn, mouthY: p.bottom + p.H,
        offgasColor: new THREE.Color().setHSL(0.07, 0.9, 0.35 + 0.3 * co), smoke: fl > 1 });
      chunks.step(dt, p.bottom + S.bath_depth_m[frame]);
      bath.mesh.rotation.y += dt * 0.15 * Math.min(1, fl / 60);
    }
    ctl.update();
    renderer.render(scene, cam);
    if (showLabels) lr.render(scene, cam);
  }
  loop();

  const ro = new ResizeObserver(() => { const w = container.clientWidth; const h = container.clientHeight; if (!w || !h) return; renderer.setSize(w, h); lr.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); });
  ro.observe(container);

  return {
    setFrame: applyFrame,
    get frame() { return frame; },
    play(v = !playing) { playing = v; if (playing && frame >= S.t_s.length - 1) applyFrame(0); return playing; },
    pause(v = !paused) { paused = v; return paused; },
    reset() { cam.position.copy(home); ctl.target.copy(target); ctl.update(); },
    cutaway(v = !cut) { cut = v; const f = frame; build(); applyFrame(f); return cut; },
    xray(v = !xray) { xray = v; vessel.layers.forEach((m) => { m.material.transparent = v; m.material.opacity = v ? 0.22 : 1; m.material.depthWrite = !v; }); return xray; },
    labels(v = !showLabels) { showLabels = v; lr.domElement.style.display = v ? '' : 'none'; return showLabels; },
    snapshot() { return renderer.domElement.toDataURL('image/png'); },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); renderer.dispose(); scene.traverse((o) => { o.geometry?.dispose?.(); }); container.innerHTML = ''; },
  };
}
