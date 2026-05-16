import * as THREE from 'three';
import { PHYSICS, SAILS } from '../config.js';

// Pomocný: normalizace úhlu na (-PI, PI]
export function wrapAngle(a) {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x <= -Math.PI) x += 2 * Math.PI;
  return x;
}

// Apparent wind v souřadnicích lodi (forward = +z lokálně, side = +x lokálně).
// Vrací { apparent: THREE.Vector3 (svět), awa: úhel vůči přídi v rad, aws: |apparent| }
export function computeApparent(boat, trueWind) {
  const apparent = new THREE.Vector3().copy(trueWind).sub(boat.velocity);
  const aws = apparent.length();
  // Úhel apparent windu ve světě (atan2(x, z) protože forward = +z)
  const windWorldAngle = Math.atan2(apparent.x, apparent.z);
  // AWA: kde je vítr relativně k přídi.
  // Pokud vítr fouká od přídě, AWA = 0. apparent ukazuje KAM vítr fouká?
  // Konvence: trueWind je vektor "kam vítr fouká". Pro plachetní účely chceme úhel
  // odkud vítr přichází relativně k přídi. Vektor "odkud" = -apparent.
  const fromAngle = Math.atan2(-apparent.x, -apparent.z);
  const awa = wrapAngle(fromAngle - boat.heading);
  return { apparent, aws, awa };
}

// CL/CD křivky podle |α|, α v rad.
export function liftDragCoeffs(alphaAbs) {
  const aLuff = SAILS.alphaLuff;
  const aPeak = SAILS.alphaPeak;
  let CL, CD;
  if (alphaAbs < aLuff) {
    CL = 0;
    CD = 0.05;
  } else if (alphaAbs < aPeak) {
    // lineární náběh
    const t = (alphaAbs - aLuff) / (aPeak - aLuff);
    CL = 1.2 * t;
    CD = 0.05 + 0.05 * t * t;
  } else if (alphaAbs < Math.PI / 2) {
    // sin(2α) klesající
    CL = 1.2 * Math.sin(2 * alphaAbs);
    if (CL < 0) CL = 0;
    const s = Math.sin(alphaAbs);
    CD = 0.1 + 0.4 * s * s;
  } else {
    // downwind / spinakr
    CL = 0;
    const s = Math.sin(alphaAbs);
    CD = 1.2 * s * s;
  }
  return { CL, CD };
}

// Spočítá agregovanou sílu na jednu plachtu.
// `sailWorldChordAngle` = úhel chordy plachty ve světě (rad, 0 = +Z).
// Vrátí síly ve světových souřadnicích + pomocné info (luffing, CL, alpha).
function forceForSail({ area, sailLocalAngle, boatHeading }, apparent, aws, heelCos) {
  if (area <= 0 || aws < 0.01) {
    return { force: new THREE.Vector3(), CL: 0, CD: 0, alpha: 0, luffing: false };
  }
  // Apparent ve světě: směr "kam fouká"; chceme dirIn = -apparent.normalized() (odkud fouká)
  const dirInWorld = new THREE.Vector3(-apparent.x, 0, -apparent.z).normalize();
  // Úhel přicházejícího větru ve světě, jak ho vidí loď
  const windFromAngleWorld = Math.atan2(dirInWorld.x, dirInWorld.z);

  // Chorda plachty ve světě:
  const chordAngleWorld = boatHeading + sailLocalAngle;
  // chord vektor:
  const chord = new THREE.Vector3(Math.sin(chordAngleWorld), 0, Math.cos(chordAngleWorld));

  // Úhel mezi přicházejícím větrem a chordou (angle of attack)
  // Bereme nejmenší úhel ke chord lineu (chord je symetrická → mod π).
  let alpha = wrapAngle(windFromAngleWorld - chordAngleWorld);
  // Symetrie: chorda je čára, ne šipka; |α| > π/2 zrcadlit
  if (alpha > Math.PI / 2) alpha -= Math.PI;
  else if (alpha < -Math.PI / 2) alpha += Math.PI;
  const alphaAbs = Math.abs(alpha);

  const { CL, CD } = liftDragCoeffs(alphaAbs);
  // Spill při velkém heelu: efektivní plocha klesá s cos(heel)
  const A = area * Math.max(0.2, heelCos);
  const q = 0.5 * PHYSICS.RHO_AIR * aws * aws;

  // Drag směrem apparentu (kam fouká):
  const dragDir = new THREE.Vector3(apparent.x, 0, apparent.z).normalize();
  // Lift kolmo na apparent; znaménko podle alpha
  const liftSign = Math.sign(alpha) || 1;
  const liftDir = new THREE.Vector3(-dragDir.z, 0, dragDir.x).multiplyScalar(liftSign);

  const force = new THREE.Vector3()
    .addScaledVector(dragDir, q * A * CD)
    .addScaledVector(liftDir, q * A * CL);

  const luffing = alphaAbs < SAILS.alphaLuff && CL === 0;
  return { force, CL, CD, alpha, luffing };
}

// Vrátí agregát: { F (svět), F_forward, F_side, mainInfo, jibInfo, apparent, awa, aws }
export function computeSailForces(boat, sails, trueWind) {
  const { apparent, aws, awa } = computeApparent(boat, trueWind);
  const heelCos = Math.cos(boat.heel);

  // AWA znamenko určuje, na kterou stranu padne plachta. V no-go (AWA ~ 0)
  // sailAngle vrací 0 → luffing.
  const mainAngle = sails.sailAngle(sails.main, awa);
  const jibAngle = sails.sailAngle(sails.jib, awa);

  const mainArea = sails.effectiveArea(sails.main);
  const jibArea = sails.effectiveArea(sails.jib);

  const mainInfo = forceForSail({
    area: mainArea, sailLocalAngle: mainAngle, boatHeading: boat.heading,
  }, apparent, aws, heelCos);
  const jibInfo = forceForSail({
    area: jibArea, sailLocalAngle: jibAngle, boatHeading: boat.heading,
  }, apparent, aws, heelCos);

  const F = new THREE.Vector3().add(mainInfo.force).add(jibInfo.force);

  // Rozklad na forward a side (lokální osy lodi v rovině)
  const fwd = boat.forward();
  const side = boat.side();
  const F_forward = F.dot(fwd);
  const F_side = F.dot(side);

  return { F, F_forward, F_side, mainInfo, jibInfo, apparent, awa, aws, mainAngle, jibAngle };
}
