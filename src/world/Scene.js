import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfd9ff, 600, 4000);

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff2d4, 1.0);
  sun.position.set(200, 400, 100);
  scene.add(sun);

  return { scene, sun };
}
