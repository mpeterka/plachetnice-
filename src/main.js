import * as THREE from 'three';
import { GameLoop } from './core/GameLoop.js';
import { EventBus } from './core/EventBus.js';
import { Keyboard } from './input/Keyboard.js';
import { Controls } from './input/Controls.js';
import { TouchControls } from './input/TouchControls.js';
import { Boat } from './physics/Boat.js';
import { Sails } from './physics/Sails.js';
import { computeSailForces } from './physics/SailForces.js';
import { computeHullDrag } from './physics/HullDrag.js';
import { stepHeel } from './physics/Heel.js';
import { stepLinear, stepYaw } from './physics/Integrator.js';
import { Wind } from './wind/Wind.js';
import { createScene } from './world/Scene.js';
import { createSky } from './world/Sky.js';
import { createWater } from './world/Water.js';
import { createRenderer, setupResize } from './render/Renderer.js';
import { ChaseCamera } from './render/Camera.js';
import { BoatMesh } from './render/BoatMesh.js';
import { SailMesh } from './render/SailMesh.js';
import { HUD } from './ui/HUD.js';
import { BOAT, DIFFICULTY, DIFFICULTY_ORDER, PHYSICS } from './config.js';

const canvas = document.getElementById('app');
const renderer = createRenderer(canvas);
const { scene, sun } = createScene();
const { sky, sunPosition } = createSky(scene, renderer, sun);
const water = createWater(sun);
scene.add(water);

const bus = new EventBus();
const boat = new Boat();
boat.position.set(0, 0, 0);
boat.heading = 0; // míří k severu (+Z); vítr fouká ze západu → beam reach
const sails = new Sails();

let currentDifficultyKey = 'mirny';
const wind = new Wind(DIFFICULTY[currentDifficultyKey], bus);

const keyboard = new Keyboard();
const controls = new Controls(keyboard, sails, boat, bus);

// Detekce dotykového zařízení → aktivuje touch overlay
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let touchControls = null;
if (isTouch) {
  document.body.classList.add('touch');
  touchControls = new TouchControls(document.getElementById('touch-controls'), sails, boat, bus);
  // Tlačítko obtížnosti cyklí mezi 4 presety
  const diffBtn = document.getElementById('btn-diff');
  diffBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const idx = DIFFICULTY_ORDER.indexOf(currentDifficultyKey);
    const nextKey = DIFFICULTY_ORDER[(idx + 1) % DIFFICULTY_ORDER.length];
    switchDifficulty(nextKey);
    diffBtn.textContent = DIFFICULTY[nextKey].name;
  });
}

const boatMesh = new BoatMesh();
scene.add(boatMesh.root);
const sailMesh = new SailMesh(boatMesh, sails);
const chase = new ChaseCamera(boat);
setupResize(renderer, chase.camera);

const hud = new HUD(bus);

// Klávesy: obtížnost, pauza, debug
keyboard.onPress('1', () => switchDifficulty('klid'));
keyboard.onPress('2', () => switchDifficulty('mirny'));
keyboard.onPress('3', () => switchDifficulty('cerstvy'));
keyboard.onPress('4', () => switchDifficulty('boure'));
keyboard.onPress('p', () => loop.togglePause());
keyboard.onPress('`', () => hud.toggleDebug());

function switchDifficulty(key) {
  if (!DIFFICULTY[key]) return;
  currentDifficultyKey = key;
  wind.applyPreset(DIFFICULTY[key]);
  bus.emit('warning', { code: 'difficulty', msg: `Obtížnost: ${DIFFICULTY[key].name}` });
}

// Pomocné: spočítat výšku CE jako vážený průměr (hlavní vs kosatka)
function effectiveCE() {
  const aM = sails.effectiveArea(sails.main);
  const aJ = sails.effectiveArea(sails.jib);
  const total = aM + aJ;
  if (total < 0.01) return 1;
  // při refu klesá také CE proporcionálně
  const hM = BOAT.hCE_main * (1 - sails.main.reefFraction * 0.5);
  const hJ = BOAT.hCE_jib * (1 - sails.jib.reefFraction * 0.3);
  return (aM * hM + aJ * hJ) / total;
}

// Sdílíme si poslední sailForceInfo mezi physics a render krokem
let lastSailInfo = null;

const loop = new GameLoop({
  dt: PHYSICS.DT,
  fixedUpdate(dt, t) {
    controls.update(dt);
    wind.update(dt, t);
    const sailInfo = computeSailForces(boat, sails, wind.vector);
    const hull = computeHullDrag(boat);
    const F = new THREE.Vector3().add(sailInfo.F).add(hull);
    stepLinear(boat, F, dt);
    stepYaw(boat, dt);
    stepHeel(boat, sailInfo.F_side, effectiveCE(), dt);
    boat.lastForward = sailInfo.F_forward;
    boat.lastSide = sailInfo.F_side;
    lastSailInfo = sailInfo;
  },
  render(frameDelta, alpha) {
    // Voda – animace času
    if (water.material.uniforms['time']) {
      water.material.uniforms['time'].value += frameDelta;
    }
    boatMesh.sync(boat);
    if (lastSailInfo) sailMesh.sync(sails, lastSailInfo, frameDelta);
    chase.update(frameDelta);
    if (touchControls) touchControls.update(frameDelta);
    if (lastSailInfo) hud.update(boat, wind, sails, lastSailInfo, DIFFICULTY[currentDifficultyKey].name);
    renderer.render(scene, chase.camera);
  },
});

loop.start();
