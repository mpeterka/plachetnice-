import * as THREE from 'three';

export function createShadowCatcher(scene) {
  const geometry = new THREE.PlaneGeometry(240, 240);
  const material = new THREE.ShadowMaterial({
    color: 0x07131c,
    opacity: 0.38,
    transparent: true,
    depthWrite: false,
  });

  const catcher = new THREE.Mesh(geometry, material);
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.025;
  catcher.receiveShadow = true;
  catcher.renderOrder = 1;
  scene.add(catcher);
  return catcher;
}

export function updateShadowCatcher(catcher, targetPosition) {
  if (!catcher) return;
  catcher.position.x = targetPosition.x;
  catcher.position.z = targetPosition.z;
}
