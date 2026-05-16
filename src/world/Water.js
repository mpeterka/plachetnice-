import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

// Procedurální normal mapa hladiny: FBM (4 oktávy value noise) → výškové pole →
// gradient = normála. THREE.Water shader pak texturu sample při 4 různých
// měřítkách (interně), takže výsledek je vrstvený jako reálná mořská hladina.
function makeNormalTexture(size = 512) {
  // Deterministický hash → tileable value noise (modulo se opakuje).
  function hash(x, y) {
    let n = (x * 374761393 + y * 668265263) >>> 0;
    n = ((n ^ (n >>> 13)) * 1274126177) >>> 0;
    return ((n ^ (n >>> 16)) & 0xffffffff) / 0xffffffff;
  }

  // Smoothstep value noise (tileable přes modulo size*freq).
  function valueNoise(x, y, freq) {
    const period = freq;                  // pro tileability
    const xi = Math.floor(x * freq);
    const yi = Math.floor(y * freq);
    const xf = x * freq - xi;
    const yf = y * freq - yi;
    const sx = xf * xf * (3 - 2 * xf);
    const sy = yf * yf * (3 - 2 * yf);
    const v00 = hash(xi % period, yi % period);
    const v10 = hash((xi + 1) % period, yi % period);
    const v01 = hash(xi % period, (yi + 1) % period);
    const v11 = hash((xi + 1) % period, (yi + 1) % period);
    const v0 = v00 + sx * (v10 - v00);
    const v1 = v01 + sx * (v11 - v01);
    return v0 + sy * (v1 - v0);
  }

  // FBM: 4 oktávy s klesající amplitudou. Vyšší freq = jemnější detaily.
  function fbm(x, y) {
    let sum = 0, amp = 0.5, freq = 4;
    for (let o = 0; o < 4; o++) {
      sum += amp * valueNoise(x, y, freq);
      freq *= 2;
      amp *= 0.55;     // mírně menší decay než klasická 0.5 → drsnější
    }
    return sum;
  }

  // Výškové pole.
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      h[y * size + x] = fbm(x / size, y / size);
    }
  }

  // Normála z gradientu výškového pole. STRENGTH řídí výraznost (vyšší = ostřejší vlnky).
  const STRENGTH = 6.0;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;
      const dhdx = (h[y * size + xR] - h[y * size + xL]) * STRENGTH;
      const dhdy = (h[yD * size + x] - h[yU * size + x]) * STRENGTH;
      const nx = -dhdx, ny = -dhdy, nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const i = (y * size + x) * 4;
      data[i + 0] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
      data[i + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
      data[i + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
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
    waterNormals: makeNormalTexture(512),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffeac1,         // teple zlaté slunce → realistický glint
    waterColor: 0x0e3a5a,       // hluboce modrá s nádechem zeleně
    distortionScale: 4.0,       // víc rozkmitaný odraz oblohy/lodi
    fog: true,
    alpha: 1.0,
    size: 60.0,                 // tiling normály — vlnky o periodě ~1-2 m blízko lodi
  });
  water.rotation.x = -Math.PI / 2;
  if (sun) water.material.uniforms['sunDirection'].value.copy(sun.position).normalize();
  return water;
}
