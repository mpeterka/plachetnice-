import * as THREE from 'three';
import { PHYSICS, SAILS } from '../config.js';

// Normalizace úhlu na (-π, π].
export function wrapAngle(a) {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x <= -Math.PI) x += 2 * Math.PI;
  return x;
}

// Apparent wind: vektor "kam fouká" (svět) + AWA (úhel ODKUD fouká vůči přídi).
// AWA ∈ (-π, π]; záporné = z levoboku, kladné = z pravoboku.
export function computeApparent(boat, trueWind) {
  const apparent = new THREE.Vector3().copy(trueWind).sub(boat.velocity);
  const aws = apparent.length();
  // Vektor "odkud" = -apparent → atan2(-x, -z) je úhel přicházejícího větru ve světě.
  const fromAngle = Math.atan2(-apparent.x, -apparent.z);
  const awa = wrapAngle(fromAngle - boat.heading);
  return { apparent, aws, awa };
}

// CL / CD jako funkce |α|. Křivka:
//   < 10° → luffing, CL=0, CD≈0 (plachta plápolá)
//   10°–20° → lineární náběh do CL=1.2
//   20°–90° → sin(2α) klesá, drag roste
//   ≥ 90° → čistě drag-driven (downwind „spinakr efekt")
export function liftDragCoeffs(alphaAbs, luffFactor = 1) {
  const alphaLuff = SAILS.alphaLuff * luffFactor;
  if (alphaAbs < alphaLuff) return { CL: 0, CD: 0.01 };
  if (alphaAbs < SAILS.alphaPeak) {
    const t = (alphaAbs - alphaLuff) / (SAILS.alphaPeak - alphaLuff);
    return { CL: 1.2 * t, CD: 0.05 + 0.05 * t * t };
  }
  if (alphaAbs < Math.PI / 2) {
    const s = Math.sin(alphaAbs);
    return { CL: Math.max(0, 1.2 * Math.sin(2 * alphaAbs)), CD: 0.1 + 0.4 * s * s };
  }
  const s = Math.sin(alphaAbs);
  return { CL: 0, CD: 1.2 * s * s };
}

export function mainTensionFactors(tension) {
  if (tension === 'loose') {
    return { lift: 0.72, drag: 1.08, force: 0.8, luff: 1.35 };
  }
  if (tension === 'tight') {
    return { lift: 1.08, drag: 0.96, force: 1.08, luff: 0.8 };
  }
  return { lift: 1, drag: 1, force: 1, luff: 1 };
}

// Síla jedné plachty (ve světových osách). Vrátí i pomocné info pro HUD.
function forceForSail(area, sailLocalAngle, boatHeading, apparent, aws, heelCos, factors = mainTensionFactors('normal')) {
  if (area <= 0 || aws < 0.01) {
    return { force: new THREE.Vector3(), CL: 0, CD: 0, alpha: 0, luffing: false };
  }
  // Chord plachty je čára (ne šipka), takže porovnáváme úhly mod π.
  const chordAngleWorld = boatHeading + sailLocalAngle;
  const windFromAngleWorld = Math.atan2(-apparent.x, -apparent.z);
  let alpha = wrapAngle(windFromAngleWorld - chordAngleWorld);
  if (alpha > Math.PI / 2) alpha -= Math.PI;
  else if (alpha < -Math.PI / 2) alpha += Math.PI;
  const alphaAbs = Math.abs(alpha);

  const raw = liftDragCoeffs(alphaAbs, factors.luff);
  const CL = raw.CL * factors.lift;
  const CD = raw.CD * factors.drag;
  // Spill při velkém heelu — projekce plachty do směru větru klesá s cos(heel).
  const A = area * Math.max(0.2, heelCos);
  const q = 0.5 * PHYSICS.RHO_AIR * aws * aws;

  // Drag direction = apparent.normalized() — bez re-normalize, dělíme jednou aws.
  const invAws = 1 / aws;
  const dx = apparent.x * invAws;
  const dz = apparent.z * invAws;
  // Lift kolmo na drag (90° rotace v rovině XZ), znaménko podle strany plachty.
  const liftSign = Math.sign(sailLocalAngle) || 1;
  const lx = -dz * liftSign;
  const lz = dx * liftSign;

  const scaleD = q * A * CD;
  const scaleL = q * A * CL;
  const force = new THREE.Vector3(scaleD * dx + scaleL * lx, 0, scaleD * dz + scaleL * lz).multiplyScalar(factors.force);

  return { force, CL, CD, alpha, luffing: alphaAbs < SAILS.alphaLuff * factors.luff && CL === 0 };
}

// Hlavní vstup do plachetní fyziky.
export function computeSailForces(boat, sails, trueWind) {
  const { apparent, aws, awa } = computeApparent(boat, trueWind);
  const heelCos = Math.cos(boat.heel);
  const heading = boat.heading;

  // AWA znaménko určuje, na kterou stranu plachta padne. V no-go (AWA ≈ 0)
  // sailAngle vrací 0 → α ≈ 0 → luff.
  const mainAngle = sails.sailAngle(sails.main, awa);
  const jibAngle = sails.sailAngle(sails.jib, awa, sails.jib.flipped);

  const mainArea = sails.effectiveArea(sails.main);
  // Aerodynamický stín: pokud jsou main a jib na STEJNÉ straně AND je deep run (|AWA|>130°),
  // hlavní stíní kosatku. Vyklopení kosatky („motýlek") ji ze stínu vytáhne.
  const sameSide = Math.sign(mainAngle) !== 0 && Math.sign(mainAngle) === Math.sign(jibAngle);
  const downwind = Math.abs(awa) > (130 * Math.PI) / 180;
  const jibArea = sails.effectiveArea(sails.jib) * (sameSide && downwind ? 0.2 : 1.0);

  const mainInfo = forceForSail(mainArea, mainAngle, heading, apparent, aws, heelCos, mainTensionFactors(sails.main.tension));
  const jibInfo = forceForSail(jibArea, jibAngle, heading, apparent, aws, heelCos);

  const F = new THREE.Vector3().add(mainInfo.force).add(jibInfo.force);

  const fwd = boat.forward();
  const side = boat.side();
  const F_forward = F.dot(fwd);
  const F_side = F.dot(side);
  const heelSign = -Math.sign(awa);
  const F_heel = heelSign === 0 ? 0 : Math.abs(F_side) * heelSign;

  return { F, F_forward, F_side, F_heel, mainInfo, jibInfo, apparent, awa, aws, mainAngle, jibAngle };
}
