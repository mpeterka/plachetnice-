import * as THREE from 'three';
import { createFleetState } from './FleetState.js';
import { createHullNamePlateConfigs, labelFontSize } from './FleetLabels.js';
import { BoatMesh } from '../render/BoatMesh.js';
import { SailMesh } from '../render/SailMesh.js';
import { Sails } from '../physics/Sails.js';

const FLEET_NAMES = ['Paja', 'Eva', 'Vojta', 'Karolína', 'Milda', 'Martin'];

function makeNameTexture(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255, 248, 230, 0.82)';
  ctx.fillRect(20, 22, canvas.width - 40, canvas.height - 44);
  ctx.fillStyle = '#1f2933';
  const fontSize = labelFontSize(ctx, name, 430, 72, 36);
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createBoatVisual(name) {
  const boatMesh = new BoatMesh();
  const sails = new Sails();
  const sailMesh = new SailMesh(boatMesh, sails);
  const nameTexture = makeNameTexture(name);
  const namePlateGeo = new THREE.PlaneGeometry(1.55, 0.38);
  const namePlateMat = new THREE.MeshBasicMaterial({
    map: nameTexture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });

  for (const config of createHullNamePlateConfigs()) {
    const namePlate = new THREE.Mesh(namePlateGeo, namePlateMat);
    namePlate.name = `fleet-name-${config.side}-${name}`;
    namePlate.rotation.y = config.rotationY;
    namePlate.position.set(config.position.x, config.position.y, config.position.z);
    sailMesh.anchors.heelPivot.add(namePlate);
  }

  return {
    root: boatMesh.root,
    boatMesh,
    sailMesh,
    sails,
    visualState: {
      position: new THREE.Vector3(),
      heading: 0,
      heel: 0,
      rudderAngle: 0,
    },
    sailInfo: {
      mainAngle: 0.34,
      jibAngle: 0.24,
      mainInfo: { CL: 0.45, CD: 0.12, luffing: false },
      jibInfo: { CL: 0.4, CD: 0.1, luffing: false },
    },
  };
}

export class Fleet {
  constructor(scene) {
    this.boats = createFleetState(FLEET_NAMES);
    this.visuals = this.boats.map((boat) => {
      const visual = createBoatVisual(boat.name);
      scene.add(visual.root);
      return visual;
    });
  }

  update(dt) {
    for (let i = 0; i < this.boats.length; i++) {
      const boat = this.boats[i];
      const visual = this.visuals[i];
      boat.update(dt);
      visual.visualState.position.set(boat.x, 0, boat.z);
      visual.visualState.heading = boat.heading;
      visual.visualState.heel = Math.sin(boat.targetAge * 0.7 + i) * 0.04;
      visual.boatMesh.sync(visual.visualState);
      const sailSide = Math.sign(Math.sin(boat.heading + 0.8)) || 1;
      visual.sailInfo.mainAngle = sailSide * 0.34;
      visual.sailInfo.jibAngle = sailSide * 0.24;
      visual.sailMesh.sync(visual.sails, visual.sailInfo, dt);
    }
  }
}
