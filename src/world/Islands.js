import * as THREE from 'three';

// Generuje malý kopec — hemisféru s vertex displacementem pro organický tvar.
function makeIsland(x, z, radius, heightScale, seed) {
  // 0.55 PI = mírně víc než hemisféra → vrchol se zaobluje
  const geo = new THREE.SphereGeometry(radius, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const r = Math.sqrt(vx * vx + vz * vz);
    if (r > 0.001) {
      // Nepravidelnost okraje (azimutální noise)
      const ang = Math.atan2(vz, vx);
      const n = Math.sin(ang * 3 + seed) * 0.15
              + Math.sin(ang * 5 + seed * 1.3) * 0.08
              + Math.sin(ang * 7 + seed * 2.1) * 0.04;
      pos.setX(i, vx * (1 + n));
      pos.setZ(i, vz * (1 + n));
    }
    // Vertikální deformace + výškový scale
    pos.setY(i, vy * heightScale + Math.sin(vx * 0.3 + vz * 0.4 + seed) * 0.5);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  // Barva: zelenohnědá s variabilním odstínem (hsl 0.2-0.32 = olivová → trávně-zelená)
  const hue = 0.22 + Math.random() * 0.10;
  const sat = 0.25 + Math.random() * 0.20;
  const lig = 0.30 + Math.random() * 0.12;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, sat, lig),
    roughness: 0.95,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  // Základna mírně pod hladinu, ať voda obtéká
  mesh.position.set(x, -2, z);
  return mesh;
}

// Pískový plážový prstenec kolem ostrova.
function makeBeach(x, z, radius) {
  const r = radius * 1.15;
  const geo = new THREE.RingGeometry(radius * 0.92, r, 28);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xd9c896,
    roughness: 1.0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.05, z);
  return mesh;
}

export function createIslands(scene, opts = {}) {
  const count = opts.count ?? 28;
  const innerR = opts.innerR ?? 180;
  const outerR = opts.outerR ?? 3000;
  const root = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    // Sqrt → rovnoměrné rozložení v kruhu (víc ostrovů dál od centra je hezčí)
    const dist = innerR + Math.sqrt(Math.random()) * (outerR - innerR);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const radius = 12 + Math.random() * 55;
    const heightScale = 0.35 + Math.random() * 0.75;
    const seed = Math.random() * 100;
    root.add(makeIsland(x, z, radius, heightScale, seed));
    root.add(makeBeach(x, z, radius));
  }
  scene.add(root);
  return root;
}
