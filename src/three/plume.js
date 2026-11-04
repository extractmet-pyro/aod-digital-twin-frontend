import * as THREE from 'three';

/** Schematic gas plume / bubble and off-gas particles (NOT a CFD result). Simulation time is
 * independent from frame rate: particles advance with wall-clock delta only for visual effect. */
export function buildPlume(maxN = 900) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(maxN * 3); const col = new Float32Array(maxN * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat);
  const P = Array.from({ length: maxN }, () => ({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, c: new THREE.Color() }));
  let spawnAcc = 0;
  return {
    points: pts,
    step(dt, { tips, rate, color, surfaceY, rIn, offgasColor, mouthY, smoke }) {
      spawnAcc += rate * dt;
      for (const q of P) {
        if (spawnAcc < 1) break;
        if (!q.alive) {
          const tip = tips[Math.floor(Math.random() * tips.length)];
          if (!tip) break;
          q.alive = true; q.life = 0; q.p.copy(tip.pos); q.v.copy(tip.dir).multiplyScalar(1.6 + Math.random()); q.c.copy(color); spawnAcc -= 1;
        }
      }
      for (let i = 0; i < P.length; i++) {
        const q = P[i];
        if (q.alive) {
          q.life += dt;
          if (q.p.y < surfaceY) { q.v.x *= 0.96; q.v.z *= 0.96; q.v.y += 2.6 * dt; q.c.lerp(new THREE.Color(0xffe2b0), 0.02); }
          else if (smoke) { q.v.x *= 0.98; q.v.z *= 0.98; q.v.y = 1.1; q.c.lerp(offgasColor, 0.06); const rr = Math.hypot(q.p.x, q.p.z); if (rr > 0.6 * rIn) { q.p.x *= 0.97; q.p.z *= 0.97; } }
          else q.alive = false;
          q.p.addScaledVector(q.v, dt);
          if (q.p.y > mouthY + 3.0 || q.life > 7) q.alive = false;
          const r = Math.hypot(q.p.x, q.p.z); if (q.p.y < surfaceY && r > rIn * 0.95) { q.p.x *= 0.95; q.p.z *= 0.95; }
        }
        pos[i * 3] = q.alive ? q.p.x : 0; pos[i * 3 + 1] = q.alive ? q.p.y : -99; pos[i * 3 + 2] = q.alive ? q.p.z : 0;
        col[i * 3] = q.c.r; col[i * 3 + 1] = q.c.g; col[i * 3 + 2] = q.c.b;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    },
  };
}

export function buildChunks() {
  const grp = new THREE.Group(); const items = [];
  const geo = new THREE.BoxGeometry(0.16, 0.12, 0.14);
  return {
    group: grp,
    drop(origin, kind, n = 26) {
      const color = { flux: 0xf2efe6, alloy: 0x9aa6b2, reductant: 0xd7dde3, coolant: 0x6e7781 }[kind] || 0xcccccc;
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
        m.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.8, (Math.random() - 0.5) * 0.3));
        grp.add(m); items.push({ m, v: new THREE.Vector3(0.55 + Math.random() * 0.2, 0, 0), t: 0 });
      }
    },
    step(dt, surfaceY) {
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]; it.t += dt; it.v.y -= 9.8 * dt * 0.5; it.m.position.addScaledVector(it.v, dt); it.m.rotation.x += dt * 3;
        if (it.m.position.y < surfaceY || it.t > 4) { grp.remove(it.m); it.m.geometry = null; items.splice(i, 1); }
      }
    },
  };
}
