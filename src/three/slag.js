import * as THREE from 'three';

export function buildSlag(p, cut) {
  const th0 = cut ? Math.PI * 0.25 : 0; const thL = cut ? Math.PI * 1.5 : Math.PI * 2;
  const geo = new THREE.CylinderGeometry(p.rIn * 1.0, p.rIn * 0.995, 1, 72, 1, false, th0 + Math.PI / 2, thL);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x6b4520, emissive: 0x3a1400, emissiveIntensity: 0.7, roughness: 0.85, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
  const mesh = new THREE.Mesh(geo, mat);
  return {
    mesh,
    update(baseY, thick, cr2o3, Tc) {
      mesh.position.y = baseY; mesh.scale.y = Math.max(0.03, thick);
      // Cr2O3-rich slag is darker / greenish; Ca-silicate reduction slag is lighter
      const k = Math.min(1, cr2o3 / 30);
      const c = new THREE.Color(0x8a5a26).lerp(new THREE.Color(0x3c4a24), k);
      mat.color.copy(c);
      mat.emissive.setHSL(0.05, 1, 0.08 + 0.12 * Math.min(1, Math.max(0, (Tc - 1500) / 250)));
    },
  };
}
