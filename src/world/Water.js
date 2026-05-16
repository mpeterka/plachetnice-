import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

// Procedurální normal map (data texture), aby nebylo třeba externí asset.
function makeNormalTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Pseudo-vlnky: kombinace sinusů
      const nx = Math.sin(x * 0.08) + Math.sin(y * 0.05 + x * 0.03);
      const ny = Math.cos(y * 0.07) + Math.sin(x * 0.04 + y * 0.06);
      data[i + 0] = Math.floor(((nx + 2) / 4) * 255);
      data[i + 1] = Math.floor(((ny + 2) / 4) * 255);
      data[i + 2] = 230;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createWater(sun) {
  const geometry = new THREE.PlaneGeometry(10000, 10000);
  const water = new Water(geometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: makeNormalTexture(),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x0a3a64,
    distortionScale: 3.0,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  if (sun) water.material.uniforms['sunDirection'].value.copy(sun.position).normalize();
  return water;
}
