import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BoatMesh } from '../src/render/BoatMesh.js';
import { SailMesh } from '../src/render/SailMesh.js';
import { Sails } from '../src/physics/Sails.js';

function makeForceInfo(jibAngle) {
  return {
    mainAngle: 0,
    jibAngle,
    mainInfo: { CL: 0.4, CD: 0.1, luffing: false },
    jibInfo: { CL: 0.4, CD: 0.1, luffing: false },
  };
}

test('jib luff stays attached to the forestay when sheeted out', () => {
  const boatMesh = new BoatMesh();
  const sails = new Sails();
  const sailMesh = new SailMesh(boatMesh, sails);

  sailMesh.sync(sails, makeForceInfo(Math.PI / 4), 1 / 60);
  sailMesh.jibPivot.updateWorldMatrix(true, true);

  const positions = sailMesh.jibGeo.attributes.position.array;
  const uvs = sailMesh.jibGeo.attributes.uv.array;
  const point = new THREE.Vector3();

  for (let i = 0; i < uvs.length; i += 2) {
    if (uvs[i] !== 0) continue;

    point.fromArray(positions, (i / 2) * 3);
    sailMesh.jibPivot.localToWorld(point);

    assert.ok(
      Math.abs(point.x) < 1e-6,
      `luff vertex at y=${point.y.toFixed(3)} drifted sideways to x=${point.x.toFixed(3)}`,
    );
  }
});
