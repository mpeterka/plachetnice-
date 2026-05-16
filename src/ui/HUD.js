import { Compass } from './Compass.js';
import { MS_TO_KN, pointOfSail, compassName } from '../config.js';

export class HUD {
  constructor(bus) {
    this.bus = bus;
    this.compass = new Compass(document.getElementById('compass'));
    this.warnings = document.getElementById('warnings');
    this.activeWarnings = new Map(); // code -> {el, expiresAt}
    this.debugEl = document.getElementById('debug-hud');
    this.debugVisible = false;

    // bus warning handler
    bus.on('warning', (w) => this.showWarning(w.code, w.msg, 3));
    bus.on('gust', (g) => this.showWarning('gust', `⚠ Náraz větru +${g.peak.toFixed(1)} m/s!`, 2));
  }

  toggleDebug() { this.debugVisible = !this.debugVisible; this.debugEl.classList.toggle('hidden', !this.debugVisible); }

  showWarning(code, msg, durationSec) {
    let entry = this.activeWarnings.get(code);
    if (!entry) {
      const el = document.createElement('div');
      el.className = 'warning' + (code === 'gust' ? ' info' : '');
      this.warnings.append(el);
      entry = { el, expiresAt: 0 };
      this.activeWarnings.set(code, entry);
    }
    entry.el.textContent = msg;
    entry.expiresAt = performance.now() / 1000 + durationSec;
  }

  _pruneWarnings() {
    const now = performance.now() / 1000;
    for (const [code, entry] of this.activeWarnings) {
      if (now > entry.expiresAt) {
        entry.el.remove();
        this.activeWarnings.delete(code);
      }
    }
  }

  update(boat, wind, sails, sailInfo, difficultyName) {
    const speedKn = boat.velocity.length() * MS_TO_KN;
    document.getElementById('speed-value').textContent = speedKn.toFixed(1);
    const bar = document.querySelector('#speed-bar > div');
    if (bar) bar.style.width = Math.min(100, speedKn * 8) + '%';

    // Vítr
    document.getElementById('wind-speed').textContent = (wind.speed * MS_TO_KN).toFixed(0);
    document.getElementById('wind-dir').textContent = compassName(wind.dir + Math.PI); // dir = "kam" → "odkud" = dir+π
    document.getElementById('difficulty-label').textContent = difficultyName;

    // Kompas – wind.dir = úhel "odkud vítr fouká"? V Wind.js to byl úhel z presetu (270° = ze západu).
    // apparent vector "kam fouká"; odkud = -apparent
    const apparentFrom = Math.atan2(-sailInfo.apparent.x, -sailInfo.apparent.z);
    this.compass.update(boat.heading, wind.dir, apparentFrom);

    // Bod kursu
    const absAwaDeg = Math.abs(sailInfo.awa) * 180 / Math.PI;
    const course = pointOfSail(absAwaDeg);
    const courseEl = document.getElementById('course-label');
    courseEl.textContent = course;
    courseEl.classList.toggle('no-go', course === 'NO-GO!');

    // Plachty – slidery
    document.getElementById('main-sheet-fill').style.width = Math.round(sails.main.sheetIn * 100) + '%';
    document.getElementById('main-sheet-value').textContent = Math.round(sails.main.sheetIn * 100);
    document.getElementById('main-reef-value').textContent = sails.main.reefStep;
    document.getElementById('main-hoist-value').textContent = sails.main.hoisted ? '▲ nahoře' : '▽ dole';

    document.getElementById('jib-sheet-fill').style.width = Math.round(sails.jib.sheetIn * 100) + '%';
    document.getElementById('jib-sheet-value').textContent = Math.round(sails.jib.sheetIn * 100);
    document.getElementById('jib-furl-value').textContent = Math.round(sails.jib.reefFraction * 100);
    document.getElementById('jib-hoist-value').textContent = sails.jib.hoisted ? '▲ nahoře' : '▽ dole';

    document.getElementById('topping-lift-value').textContent = sails.toppingLift ? 'napnut' : 'uvolněn';

    // Kormidlo (rudderAngle ∈ ±π/4) → slider -100..+100 %
    const rNorm = (boat.rudderAngle / (Math.PI / 4));
    const needle = document.getElementById('rudder-needle');
    needle.style.left = (50 + rNorm * 50) + '%';

    // Heel
    const heelDeg = boat.heel * 180 / Math.PI;
    document.getElementById('heel-value').textContent = heelDeg.toFixed(0);
    const fill = document.getElementById('heel-fill');
    const magPct = Math.min(50, Math.abs(heelDeg)); // ±50° = full
    if (heelDeg >= 0) {
      fill.style.bottom = '50%';
      fill.style.top = 'auto';
      fill.style.height = (magPct) + '%';
    } else {
      fill.style.top = '50%';
      fill.style.bottom = 'auto';
      fill.style.height = (magPct) + '%';
    }

    // Varování: luffing pokud obě plachty luffují (a jsou nahoře) — ale jen mimo no-go
    const bothLuffing = sailInfo.mainInfo.luffing && sailInfo.jibInfo.luffing
      && (sails.main.hoisted || sails.jib.hoisted);
    if (bothLuffing && course !== 'NO-GO!') {
      this.showWarning('luff', '⚠ Plachta luffuje — uprav otěž', 1.5);
    }
    if (Math.abs(heelDeg) > 45) {
      this.showWarning('broach', '⚠ Hrozí převrhnutí — refuj!', 1.5);
    }

    this._pruneWarnings();

    if (this.debugVisible) {
      this.debugEl.textContent = [
        `AWA:  ${(sailInfo.awa * 180 / Math.PI).toFixed(1)}°`,
        `AWS:  ${sailInfo.aws.toFixed(2)} m/s`,
        `|v|:  ${boat.velocity.length().toFixed(2)} m/s`,
        `F_fwd:${sailInfo.F_forward.toFixed(0)} N`,
        `F_side:${sailInfo.F_side.toFixed(0)} N`,
        `heel: ${heelDeg.toFixed(1)}°`,
        `main α:${(sailInfo.mainInfo.alpha * 180 / Math.PI).toFixed(1)}° CL:${sailInfo.mainInfo.CL.toFixed(2)} CD:${sailInfo.mainInfo.CD.toFixed(2)}`,
        `jib  α:${(sailInfo.jibInfo.alpha * 180 / Math.PI).toFixed(1)}° CL:${sailInfo.jibInfo.CL.toFixed(2)} CD:${sailInfo.jibInfo.CD.toFixed(2)}`,
      ].join('\n');
    }
  }
}
