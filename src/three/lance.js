import * as THREE from 'three';

export function buildLance(p) {
  const grp = new THREE.Group();
  const len = 6;
  const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, len, 16), new THREE.MeshStandardMaterial({ color: 0xc9d3dd, metalness: 0.9, roughness: 0.25 }));
  lance.position.y = len / 2; grp.add(lance);
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x56B4E9, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  jet.position.y = -0.8; jet.rotation.x = Math.PI; grp.add(jet);
  return { group: grp, jet, update(bathTopY, heightAbove, o2top) { grp.position.y = bathTopY + heightAbove; jet.visible = o2top > 0.1; jet.scale.set(1, 0.6 + Math.min(1.2, o2top / 40), 1); } };
}

export function buildHood(p) {
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x37414d, metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide });
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(p.rMouth * 1.25, p.rMouth * 2.2, 1.4, 40, 1, true), mat);
  hood.position.y = p.bottom + p.H + 1.5; grp.add(hood);
  const duct = new THREE.Mesh(new THREE.CylinderGeometry(p.rMouth * 0.9, p.rMouth * 0.9, 5.5, 28, 1, true), mat);
  duct.rotation.z = Math.PI / 2.6; duct.position.set(2.4, p.bottom + p.H + 3.4, 0); grp.add(duct);
  const an = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x0072B2, emissive: 0x002a44 }));
  an.position.set(3.6, p.bottom + p.H + 4.6, 0.9); grp.add(an);
  // additions chute
  const chute = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.2, 14), mat);
  chute.rotation.z = -Math.PI / 5; chute.position.set(-1.6, p.bottom + p.H + 2.6, 0.4); grp.add(chute);
  return { group: grp, analyzer: an, chuteTip: new THREE.Vector3(-0.7, p.bottom + p.H + 1.4, 0.4) };
}
