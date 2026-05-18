// Globální konstanty + presety obtížnosti
export const PHYSICS = {
  DT: 1 / 60,
  RHO_AIR: 1.225,
  GRAVITY: 9.81,
};

export const BOAT = {
  mass: 2000,            // kg
  I_yaw: 4000,           // moment setrvačnosti pro yaw
  I_heel: 3000,          // moment setrvačnosti pro heel
  GM: 1.2,               // metacentrická výška (m) — stabilita
  heelDamping: 1500,     // tlumení náklonu (N·m·s/rad)
  hCE_main: 5.0,         // výška středu plachty hlavní (m)
  hCE_jib: 3.5,          // výška středu plachty kosatky (m)
  k_drag: 25,            // koeficient hull dragu (kvadratický)
  k_lat: 1800,           // boční rezistence (kýl)
  k_rudder: 10,          // účinnost kormidla
  rudderArm: 4,          // vzdálenost kormidla od těžiště (m)
  yawDamping: 1.5,       // útlum rotace
  maxRudderAngle: Math.PI / 4, // ±45°
};

export const SAILS = {
  mainAreaFull: 25,      // m²
  jibAreaFull: 12,       // m²
  alphaLuff: 10 * Math.PI / 180,  // úhel, do kterého plachta luffuje
  alphaPeak: 20 * Math.PI / 180,  // úhel maximálního CL
  maxSheetAngle: 80 * Math.PI / 180, // max úhel plachty od centerline při sheet=100% out
  minSheetAngle: 5 * Math.PI / 180,  // při plně dotažené otěži
};

export const DIFFICULTY = {
  klid: {
    name: 'Klid',
    baseSpeed: 3,
    baseDirDeg: 270,        // vítr ze západu
    dirNoiseDeg: 5,
    dirFreqHz: 0.02,
    speedNoise: 0.4,
    speedFreqHz: 0.05,
    gustRate: 1 / 120,
    gustPeakMin: 1,
    gustPeakMax: 2,
  },
  mirny: {
    name: 'Mírný vítr',
    baseSpeed: 6,
    baseDirDeg: 270,
    dirNoiseDeg: 10,
    dirFreqHz: 0.05,
    speedNoise: 0.8,
    speedFreqHz: 0.08,
    gustRate: 1 / 60,
    gustPeakMin: 2,
    gustPeakMax: 4,
  },
  cerstvy: {
    name: 'Čerstvý vítr',
    baseSpeed: 10,
    baseDirDeg: 270,
    dirNoiseDeg: 15,
    dirFreqHz: 0.1,
    speedNoise: 1.2,
    speedFreqHz: 0.12,
    gustRate: 1 / 30,
    gustPeakMin: 3,
    gustPeakMax: 6,
  },
  boure: {
    name: 'Bouře',
    baseSpeed: 16,
    baseDirDeg: 270,
    dirNoiseDeg: 25,
    dirFreqHz: 0.2,
    speedNoise: 2.0,
    speedFreqHz: 0.18,
    gustRate: 1 / 15,
    gustPeakMin: 5,
    gustPeakMax: 10,
  },
};

export const DIFFICULTY_ORDER = ['klid', 'mirny', 'cerstvy', 'boure'];

// Převody jednotek
export const MS_TO_KN = 1.94384;
export const KN_TO_MS = 1 / MS_TO_KN;

// Body kursu (pojmenování zón)
export function pointOfSail(absAwaDeg) {
  if (absAwaDeg < 40) return 'NO-GO!';
  if (absAwaDeg < 60) return 'Close-hauled';
  if (absAwaDeg < 110) return 'Beam reach';
  if (absAwaDeg < 150) return 'Broad reach';
  return 'Running';
}

// Světové strany (text z direction angle, kde 0 = sever, 90 = východ)
const COMPASS = ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'];
export function compassName(headingRad) {
  const deg = ((headingRad * 180 / Math.PI) % 360 + 360) % 360;
  const idx = Math.round(deg / 45) % 8;
  return COMPASS[idx];
}
