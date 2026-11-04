import * as THREE from 'three';

/** Builds lathe profiles from the backend geometry summary (metres). */
export function profile(g) {
  const rIn = g.inner_diameter_m / 2;
  const lin = g.lining_total_m;
  const H = g.vessel_inner_height_m;
  const rMouth = g.mouth_diameter_m / 2;
  const yCone = H * 0.62;           // barrel height fraction (cone above)
  return { rIn, lin, H, rMouth, yCone, rOut: rIn + lin, bottom: lin };
}

function lathe(points, cut) {
  const phiStart = cut ? Math.PI * 0.25 : 0;
  const phiLen = cut ? Math.PI * 1.5 : Math.PI * 2;
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), 72, phiStart, phiLen);
}

/** Closed annular profile between inner radius function ri(y) and outer ro(y). */
function shellPoints(p, inset0, inset1) {
  const { rIn, H, rMouth, yCone, bottom } = p;
  const L = p.lin;
  const ri = (y) => (y <= yCone ? rIn : rIn + (rMouth - rIn) * (y - yCone) / (H - yCone));
  const pts = [];
  const a = L * inset0; const b = L * inset1; // radial offset from hot face (0) toward shell (1)
  const yb0 = bottom - a; const yb1 = bottom - b;
  pts.push([0, yb1], [ri(0) + b * 0.92, yb1], [ri(0) + b, yb1 + 0.25 * b + 0.05]);
  for (let y = 0.1; y <= H + 1e-6; y += H / 18) pts.push([ri(y) + b, bottom + y]);
  pts.push([rMouth + b, bottom + H + 0.02], [rMouth + a, bottom + H + 0.02]);
  for (let y = H; y >= 0.1 - 1e-6; y -= H / 18) pts.push([ri(y) + a, bottom + y]);
  pts.push([ri(0) + a, yb0 + 0.25 * a + 0.05], [ri(0) + a * 0.92, yb0], [0, yb0]);
  return pts;
}

export function buildVessel(g, { cut = true } = {}) {
  const p = profile(g);
  const grp = new THREE.Group();
  const layers = g.lining || [];
  const total = layers.reduce((s, l) => s + l.thickness_m, 0) || p.lin;
  const mats = [
    new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.9, metalness: 0.0, emissive: 0x3a0f00, emissiveIntensity: 0.6, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: 0x9c8f7a, roughness: 0.95, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: 0x3d4652, roughness: 0.55, metalness: 0.75, side: THREE.DoubleSide }),
  ];
  let acc = 0; const meshes = [];
  layers.forEach((l, i) => {
    const f0 = acc / total; acc += l.thickness_m; const f1 = acc / total;
    const m = new THREE.Mesh(lathe(shellPoints(p, f0, f1), cut), mats[Math.min(i, 2)].clone());
    m.castShadow = true; m.receiveShadow = true; m.userData.layer = l.label || l.material;
    grp.add(m); meshes.push(m);
  });
  // trunnion ring + pins + stands
  const yT = p.bottom + p.yCone * 0.55;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(p.rOut + 0.18, 0.12, 12, 72), new THREE.MeshStandardMaterial({ color: 0x4b5867, metalness: 0.8, roughness: 0.4 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = yT; grp.add(ring);
  const pinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.9, 20);
  [-1, 1].forEach((s) => { const pin = new THREE.Mesh(pinGeo, ring.material); pin.rotation.z = Math.PI / 2; pin.position.set(s * (p.rOut + 0.6), yT, 0); grp.add(pin); });
  return { group: grp, layers: meshes, p, trunnionY: yT };
}

export function buildStands(p, yT) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2b333d, metalness: 0.6, roughness: 0.6 });
  [-1, 1].forEach((s) => {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, yT + 0.6, 1.2), mat);
    st.position.set(s * (p.rOut + 1.05), (yT + 0.6) / 2 - 0.6, 0); st.castShadow = true; g.add(st);
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshStandardMaterial({ color: 0x0e1318, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.6; floor.receiveShadow = true; g.add(floor);
  return g;
}
