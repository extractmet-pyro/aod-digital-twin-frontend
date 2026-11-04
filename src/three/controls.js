import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function makeControls(camera, dom, target) {
  const c = new OrbitControls(camera, dom);
  c.enableDamping = true; c.dampingFactor = 0.08; c.target.copy(target); c.minDistance = 3; c.maxDistance = 40; c.maxPolarAngle = Math.PI * 0.52;
  c.screenSpacePanning = true;
  return c;
}
