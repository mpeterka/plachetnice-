import * as THREE from 'three';
import { LAKE, lakeRadiusAtAngle } from './LakeBounds.js';

const SEGMENTS = 192;

function makeRingGeometry(innerOffset, outerOffset, innerY, outerY) {
  const positions = [];
  const indices = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const a = (i / SEGMENTS) * Math.PI * 2;
    const shore = lakeRadiusAtAngle(a);
    const inner = shore + innerOffset;
    const outer = shore + outerOffset;
    positions.push(Math.cos(a) * inner, innerY, Math.sin(a) * inner);
    positions.push(Math.cos(a) * outer, outerY, Math.sin(a) * outer);
  }

  for (let i = 0; i < SEGMENTS; i++) {
    const p = i * 2;
    indices.push(p, p + 2, p + 1);
    indices.push(p + 1, p + 2, p + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeTreeLine() {
  const root = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3b24, roughness: 0.95 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2f5a36, roughness: 1.0, flatShading: true });
  const trunkGeo = new THREE.CylinderGeometry(0.45, 0.6, 6, 6);
  const crownGeo = new THREE.ConeGeometry(4.2, 10, 7);

  for (let i = 0; i < 110; i++) {
    const a = (i / 110) * Math.PI * 2 + Math.sin(i * 12.989) * 0.035;
    const shore = lakeRadiusAtAngle(a);
    const r = shore + 85 + ((Math.sin(i * 78.233) + 1) * 0.5) * 120;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 3.0, z);
    trunk.scale.setScalar(0.7 + ((Math.sin(i * 41.77) + 1) * 0.5) * 0.45);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    root.add(trunk);

    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(x, 11, z);
    crown.scale.setScalar(0.8 + ((Math.sin(i * 19.19) + 1) * 0.5) * 0.5);
    crown.castShadow = true;
    crown.receiveShadow = true;
    root.add(crown);
  }
  return root;
}

export function createLakeShore(scene) {
  const root = new THREE.Group();

  const beach = new THREE.Mesh(
    makeRingGeometry(-18, 34, 0.045, 0.09),
    new THREE.MeshStandardMaterial({ color: 0xd8c28a, roughness: 1.0, side: THREE.DoubleSide }),
  );
  beach.receiveShadow = true;
  root.add(beach);

  const land = new THREE.Mesh(
    makeRingGeometry(22, LAKE.baseRadius * 5, 0.1, 3.0),
    new THREE.MeshStandardMaterial({ color: 0x49643a, roughness: 0.98, flatShading: true }),
  );
  land.receiveShadow = true;
  root.add(land);

  root.add(makeTreeLine());
  scene.add(root);
  return root;
}
