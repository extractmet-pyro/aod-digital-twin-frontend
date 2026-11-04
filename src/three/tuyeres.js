import * as THREE from 'three';

export const GAS_COL = { O2: new THREE.Color(0x56B4E9), Ar: new THREE.Color(0xCC79A7), N2: new THREE.Color(0x009E73) };

export function gasMixColor(o2, ar, n2) {
  const t = o2 + ar + n2 || 1;
  return new THREE.Color(0, 0, 0).add(GAS_COL.O2.clone().multiplyScalar(o2 / t)).add(GAS_COL.Ar.clone().multiplyScalar(ar / t)).add(GAS_COL.N2.clone().multiplyScalar(n2 / t));
}

export function buildTuyeres(p, g) {
  const n = g.n_tuyeres || 5;
  const arc = (g.tuyere_arc_deg || 75) * Math.PI / 180;
  const y = p.bottom + Math.min(0.6, 0.3);
  const grp = new THREE.Group();
  const tips = [];
  const mat = new THREE.MeshStandardMaterial({ color: 0xb7c3d0, metalness: 0.9, roughness: 0.3, emissive: 0x111111 });
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (n === 1 ? 0 : -arc / 2 + arc * i / (n - 1)); // back side of the vessel (away from cutaway)
    const r0 = p.rOut + 0.35; const r1 = p.rIn - 0.02;
    const len = r0 - r1;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 12), mat);
    t.rotation.z = Math.PI / 2;
    const holder = new THREE.Group(); holder.add(t); t.position.x = r1 + len / 2;
    holder.rotation.y = -a; holder.position.y = y; grp.add(holder);
    tips.push({ pos: new THREE.Vector3(Math.cos(a) * r1, y, Math.sin(a) * r1), dir: new THREE.Vector3(-Math.cos(a), 0.15, -Math.sin(a)).normalize() });
  }
  // gas manifold ring
  const man = new THREE.Mesh(new THREE.TorusGeometry(p.rOut + 0.4, 0.07, 8, 64, arc + 0.4), new THREE.MeshStandardMaterial({ color: 0x5c6f84, metalness: 0.8, roughness: 0.35 }));
  man.rotation.x = Math.PI / 2; man.rotation.z = Math.PI / 2 + Math.PI / 2 - arc / 2 - 0.2 + Math.PI / 2; man.position.y = y; grp.add(man);
  return { group: grp, tips, y };
}
