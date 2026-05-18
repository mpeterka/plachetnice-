import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfd9ff, 600, 4000);

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff2d4, 1.0);
  sun.position.set(200, 400, 100);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -1200;
  sun.shadow.camera.right = 1200;
  sun.shadow.camera.top = 1200;
  sun.shadow.camera.bottom = -1200;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 1400;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  return { scene, sun };
}

export function updateSunTarget(sun, targetPosition) {
  if (!sun) return;
  const offset = sun.userData.followOffset;
  if (offset) {
    sun.position.copy(targetPosition).add(offset);
  }
  sun.target.position.copy(targetPosition);
  sun.target.updateMatrixWorld();
}
