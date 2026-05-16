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
import { createIslands } from './world/Islands.js';
import { Rain } from './world/Rain.js';
import { Wake } from './world/Wake.js';
import { createRenderer, setupResize } from './render/Renderer.js';
import { ChaseCamera } from './render/Camera.js';
import { BoatMesh } from './render/BoatMesh.js';
import { SailMesh } from './render/SailMesh.js';
import { HUD } from './ui/HUD.js';
import { BOAT, DIFFICULTY, DIFFICULTY_ORDER, PHYSICS } from './config.js';

// === Scene & world ===
const canvas = document.getElementById('app');
const renderer = createRenderer(canvas);
const { scene, sun } = createScene();
try {
  createSky(scene, renderer, sun);
} catch (err) {
  console.warn('Sky init failed, using scene background only.', err);
}

let water = null;
try {
  water = createWater(sun);
  scene.add(water);
} catch (err) {
  console.warn('Water init failed, continuing without water mesh.', err);

try {
  createIslands(scene, { count: 28, innerR: 200, outerR: 2800 });
} catch (err) {
  console.warn('Islands init failed, continuing without islands.', err);
}

// === State ===
const bus = new EventBus();
const boat = new Boat();
const sails = new Sails();
let currentDifficultyKey = 'mirny';
const wind = new Wind(DIFFICULTY[currentDifficultyKey], bus);

// === Input ===
const keyboard = new Keyboard();
const controls = new Controls(keyboard, sails, boat, bus);

const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let touchControls = null;
if (isTouch) {
  document.body.classList.add('touch');
  touchControls = new TouchControls(document.getElementById('touch-controls'), sails, boat, bus);
  const diffBtn = document.getElementById('btn-diff');
  diffBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const idx = DIFFICULTY_ORDER.indexOf(currentDifficultyKey);
    const nextKey = DIFFICULTY_ORDER[(idx + 1) % DIFFICULTY_ORDER.length];
    switchDifficulty(nextKey);
    diffBtn.textContent = DIFFICULTY[nextKey].name;
  });
}

// === Render objekty ===
let boatMesh = null;
try {
  boatMesh = new BoatMesh();
  scene.add(boatMesh.root);
} catch (err) {
  console.warn('Boat mesh init failed, continuing without boat visuals.', err);
}
let sailMesh = null;
try {
  if (boatMesh) sailMesh = new SailMesh(boatMesh, sails);
} catch (err) {
  console.warn('Sail mesh init failed, continuing without sail visuals.', err);
}
const chase = new ChaseCamera(boat, canvas);
setupResize(renderer, chase.camera);
let rain = null;
try {
  rain = new Rain(scene, chase.camera);
} catch (err) {
  console.warn('Rain init failed, continuing without rain effect.', err);
}
let wake = null;
try {
  wake = new Wake(scene);
} catch (err) {
  console.warn('Wake init failed, continuing without wake effect.', err);
}
const hud = new HUD(bus);

// === Klávesy ===
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

// === Fullscreen (Android funkční, iOS Safari → PWA režim přes Add to Home Screen) ===
document.getElementById('btn-fullscreen').addEventListener('click', () => {
  const el = document.documentElement;
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else if (el.requestFullscreen) {
    el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  }
});

// === Reakce na gust: vibrace (Android) + camera shake (cross-platform) ===
bus.on('gust', ({ peak }) => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    const dur = Math.min(220, 60 + peak * 18);
    try { navigator.vibrate([Math.round(dur), 40, Math.round(dur * 0.5)]); } catch { /* no-op on iOS */ }
  }
  chase.shake(Math.min(0.6, 0.06 * peak));
});

// === Pomocné fyziky ===
// Vážená výška středu plachet (CE) — ovlivňuje heeling moment.
function effectiveCE() {
  const aM = sails.effectiveArea(sails.main);
  const aJ = sails.effectiveArea(sails.jib);
  const total = aM + aJ;
  if (total < 0.01) return 1;
  const hM = BOAT.hCE_main * (1 - sails.main.reefFraction * 0.5);
  const hJ = BOAT.hCE_jib * (1 - sails.jib.reefFraction * 0.3);
  return (aM * hM + aJ * hJ) / total;
}

// === Game loop ===
let lastSailInfo = null;
const totalForce = new THREE.Vector3(); // pre-alloc — sčítáme každý step

const loop = new GameLoop({
  dt: PHYSICS.DT,
  fixedUpdate(dt, t) {
    controls.update(dt);
    wind.update(dt, t);
    const sailInfo = computeSailForces(boat, sails, wind.vector);
    const hull = computeHullDrag(boat);
    totalForce.copy(sailInfo.F).add(hull);
    stepLinear(boat, totalForce, dt);
    stepYaw(boat, dt);
    stepHeel(boat, sailInfo.F_side, effectiveCE(), dt);
    lastSailInfo = sailInfo;
  },
  render(frameDelta) {
    if (water?.material?.uniforms?.time) {
      water.material.uniforms['time'].value += frameDelta;
    }
    boatMesh?.sync(boat);
    if (lastSailInfo) sailMesh?.sync(sails, lastSailInfo, frameDelta);
    chase.update(frameDelta);
    rain?.update(frameDelta, wind);
    wake?.update(frameDelta, boat);
    if (touchControls) touchControls.update();
    if (lastSailInfo) hud.update(boat, wind, sails, lastSailInfo, DIFFICULTY[currentDifficultyKey].name);
    renderer.render(scene, chase.camera);
  },
});

loop.start();
