import * as THREE from 'three';
import { Gust } from './Gust.js';

// Pseudo-noise: suma sinusů s nesoudělnými frekvencemi. Deterministická a tileable
// v čase, pro náš účel (mírná modulace) bohatě stačí místo plné Perlin implementace.
function smoothNoise(t, seed) {
  return (
    Math.sin(t * 1.0 + seed) * 0.5 +
    Math.sin(t * 2.37 + seed * 1.3) * 0.3 +
    Math.sin(t * 4.13 + seed * 2.7) * 0.2
  );
}

// Wind state:
//   `dir`    = úhel ODKUD vítr fouká (rad, 0 = ze severu, π/2 = z východu)
//   `speed`  = velikost (m/s)
//   `vector` = KAM vítr fouká (3D, vektor v m/s ve světových osách XZ)
// Vektor a úhel jsou doplňky: `vector = -speed · (sin(dir), 0, cos(dir))`.
export class Wind {
  constructor(preset, bus) {
    this.bus = bus;
    this.applyPreset(preset);
    this.gusts = [];
    this.vector = new THREE.Vector3();
    this.speed = 0;
    this.dir = 0;
  }

  applyPreset(preset) {
    this.preset = preset;
    this.baseSpeed = preset.baseSpeed;
    this.baseDir = (preset.baseDirDeg * Math.PI) / 180;
    this.dirNoiseAmp = (preset.dirNoiseDeg * Math.PI) / 180;
    this.dirFreq = preset.dirFreqHz;
    this.speedNoiseAmp = preset.speedNoise;
    this.speedFreq = preset.speedFreqHz;
    this.gustRate = preset.gustRate;
    this.gustPeakMin = preset.gustPeakMin;
    this.gustPeakMax = preset.gustPeakMax;
  }

  update(dt, t) {
    const dir = this.baseDir + this.dirNoiseAmp * smoothNoise(t * this.dirFreq, 1.7);
    let speed = this.baseSpeed + this.speedNoiseAmp * smoothNoise(t * this.speedFreq, 5.1);

    // Gust scheduler: Poissonovsky.
    if (Math.random() < this.gustRate * dt) {
      const peak = this.gustPeakMin + Math.random() * (this.gustPeakMax - this.gustPeakMin);
      const rampUp = 1 + Math.random();
      const hold = 1 + Math.random() * 2;
      const rampDown = 2 + Math.random() * 2;
      this.gusts.push(new Gust(t, rampUp, hold, rampDown, peak));
      this.bus.emit('gust', { peak });
    }
    for (let i = this.gusts.length - 1; i >= 0; i--) {
      const g = this.gusts[i];
      if (g.done(t)) { this.gusts.splice(i, 1); continue; }
      speed += g.contribution(t);
    }
    if (speed < 0) speed = 0;

    this.speed = speed;
    this.dir = dir;
    // Příklad: baseDir = 270° (ze západu) → unit(dir) = (-1, 0, 0) → vector = (+speed, 0, 0) (vítr na východ).
    this.vector.set(-Math.sin(dir) * speed, 0, -Math.cos(dir) * speed);
  }
}
