import * as THREE from 'three';

export function tempColor(Tc) {
  const t = Math.min(1, Math.max(0, (Tc - 1450) / 320));
  const c = new THREE.Color();
  c.setHSL(0.02 + 0.10 * t, 1.0, 0.38 + 0.30 * t);
  return c;
}

export function buildBath(p, cut) {
  const th0 = cut ? Math.PI * 0.25 : 0; const thL = cut ? Math.PI * 1.5 : Math.PI * 2;
  const geo = new THREE.CylinderGeometry(p.rIn * 0.995, p.rIn * 0.93, 1, 72, 1, false, th0 + Math.PI / 2, thL);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff7a18, emissive: 0xff5a00, emissiveIntensity: 1.2, roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = p.bottom;
  const light = new THREE.PointLight(0xff8a2a, 30, 12, 1.6);
  mesh.add(light); light.position.set(0, 1.2, 0);
  return {
    mesh, light,
    update(depth, Tc) {
      mesh.scale.y = Math.max(0.05, depth);
      const c = tempColor(Tc); mat.color.copy(c); mat.emissive.copy(c); mat.emissiveIntensity = 0.9 + 0.8 * Math.min(1, Math.max(0, (Tc - 1500) / 250));
      light.color.copy(c); light.position.y = 1 / Math.max(0.05, depth) * depth + 0.4;
    },
  };
}
