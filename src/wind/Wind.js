import * as THREE from 'three';
import { Gust } from './Gust.js';

// Pseudo-noise (smooth) – deterministická, jednoduchá náhrada Perlinu.
function smoothNoise(t, seed) {
  // suma tří sinusů s vzájemně nesoudělnými frekvencemi
  return (
    Math.sin(t * 1.0 + seed) * 0.5 +
    Math.sin(t * 2.37 + seed * 1.3) * 0.3 +
    Math.sin(t * 4.13 + seed * 2.7) * 0.2
  );
}

export class Wind {
  constructor(preset, bus) {
    this.bus = bus;
    this.applyPreset(preset);
    this.gusts = [];
    this.nextGustCheck = 0;
    // Aktuální stav (vektor "kam vítr fouká")
    this.vector = new THREE.Vector3();
    this.speed = 0;
    this.dir = 0; // rad, 0 = +Z (k severu)
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
    // Pomalá změna směru a síly
    const dir = this.baseDir + this.dirNoiseAmp * smoothNoise(t * this.dirFreq, 1.7);
    let speed = this.baseSpeed + this.speedNoiseAmp * smoothNoise(t * this.speedFreq, 5.1);

    // Gust scheduler: každých dt s pravděpodobností gustRate*dt přidej gust
    if (Math.random() < this.gustRate * dt) {
      const peak = this.gustPeakMin + Math.random() * (this.gustPeakMax - this.gustPeakMin);
      const rampUp = 1 + Math.random();
      const hold = 1 + Math.random() * 2;
      const rampDown = 2 + Math.random() * 2;
      const g = new Gust(t, rampUp, hold, rampDown, peak);
      this.gusts.push(g);
      this.bus.emit('gust', { peak });
    }

    // Sečti přínosy gustů, odstraň hotové
    for (let i = this.gusts.length - 1; i >= 0; i--) {
      const g = this.gusts[i];
      if (g.done(t)) { this.gusts.splice(i, 1); continue; }
      speed += g.contribution(t);
    }
    if (speed < 0) speed = 0;

    this.speed = speed;
    this.dir = dir;
    // Vektor "kam vítr fouká": pokud baseDir = "odkud", musíme otočit.
    // Konvence v config: baseDirDeg = "odkud vítr přichází" (270° = ze západu).
    // Vektor "kam" = opačný směr.
    // Pro směr "odkud" 270° (západ), vektor "kam" ukazuje na východ (+X).
    // Sever = +Z. Východ = +X. Tedy: x = sin(dir+π), z = cos(dir+π) = -sin(dir), -cos(dir)
    // Zjednodušeně: vector = -unit(dir).
    const dirVec = new THREE.Vector3(Math.sin(dir), 0, Math.cos(dir));
    this.vector.copy(dirVec).multiplyScalar(-speed);
  }
}
