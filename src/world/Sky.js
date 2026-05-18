import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export function createSky(scene, renderer, sun) {
  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 8;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  const sunPos = new THREE.Vector3();
  // Sun position: elevation ~ 25°, azimuth ~ 180°
  const phi = THREE.MathUtils.degToRad(90 - 25);
  const theta = THREE.MathUtils.degToRad(180);
  sunPos.setFromSphericalCoords(1, phi, theta);
  skyUniforms['sunPosition'].value.copy(sunPos);

  if (sun) {
    sun.userData.followOffset = sunPos.clone().multiplyScalar(400);
    sun.position.copy(sun.userData.followOffset);
  }

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(80, 24, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff2b8, fog: false }),
  );
  sunDisc.position.copy(sunPos).multiplyScalar(4200);
  scene.add(sunDisc);

  // PMREM env map z oblohy → realistické odrazy na vodě i lodi.
  // Dispose generator po vygenerování (texturu si Three.js drží sám).
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(sky).texture;
  pmrem.dispose();
}
