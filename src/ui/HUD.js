import { Compass } from './Compass.js';
import { MS_TO_KN, pointOfSail, compassName } from '../config.js';

// Všechny DOM uzly se cachují v konstruktoru — querySelector v 60Hz loopu je drahý
// na mobilech. update() pak jen mutuje vlastnosti.
export class HUD {
  constructor(bus) {
    this.bus = bus;
    this.compass = new Compass(document.getElementById('compass'));
    this.warnings = document.getElementById('warnings');
    this.debugEl = document.getElementById('debug-hud');
    this.activeWarnings = new Map();
    this.debugVisible = false;

    // Cache všech DOM elementů.
    this.el = {
      speedValue: document.getElementById('speed-value'),
      speedBar: document.querySelector('#speed-bar > div'),
      windSpeed: document.getElementById('wind-speed'),
      windDir: document.getElementById('wind-dir'),
      difficulty: document.getElementById('difficulty-label'),
      course: document.getElementById('course-label'),
      mainSheetFill: document.getElementById('main-sheet-fill'),
      mainSheetValue: document.getElementById('main-sheet-value'),
      mainReef: document.getElementById('main-reef-value'),
      mainHoist: document.getElementById('main-hoist-value'),
      jibSheetFill: document.getElementById('jib-sheet-fill'),
      jibSheetValue: document.getElementById('jib-sheet-value'),
      jibFurl: document.getElementById('jib-furl-value'),
      jibHoist: document.getElementById('jib-hoist-value'),
      topping: document.getElementById('topping-lift-value'),
      rudderNeedle: document.getElementById('rudder-needle'),
      heelValue: document.getElementById('heel-value'),
      heelFill: document.getElementById('heel-fill'),
    };

    bus.on('warning', (w) => this.showWarning(w.code, w.msg, 3));
    bus.on('gust', (g) => this.showWarning('gust', `⚠ Náraz větru +${g.peak.toFixed(1)} m/s!`, 2));
  }

  toggleDebug() {
    this.debugVisible = !this.debugVisible;
    this.debugEl.classList.toggle('hidden', !this.debugVisible);
  }

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
    const el = this.el;
    const speedKn = boat.velocity.length() * MS_TO_KN;
    el.speedValue.textContent = speedKn.toFixed(1);
    el.speedBar.style.width = Math.min(100, speedKn * 8) + '%';

    el.windSpeed.textContent = (wind.speed * MS_TO_KN).toFixed(0);
    // wind.dir = úhel ODKUD vítr fouká; compassName interpretuje argument jako úhel
    // toho směru (heading 0 = S). „z X" tedy bere wind.dir přímo, bez offsetu.
    el.windDir.textContent = compassName(wind.dir);
    el.difficulty.textContent = difficultyName;

    const apparentFrom = Math.atan2(-sailInfo.apparent.x, -sailInfo.apparent.z);
    this.compass.update(boat.heading, wind.dir, apparentFrom);

    const absAwaDeg = Math.abs(sailInfo.awa) * 180 / Math.PI;
    const course = pointOfSail(absAwaDeg);
    el.course.textContent = course;
    el.course.classList.toggle('no-go', course === 'NO-GO!');

    el.mainSheetFill.style.width = Math.round(sails.main.sheetIn * 100) + '%';
    el.mainSheetValue.textContent = Math.round(sails.main.sheetIn * 100);
    el.mainReef.textContent = sails.main.reefStep;
    el.mainHoist.textContent = sails.main.hoisted ? '▲ nahoře' : '▽ dole';

    el.jibSheetFill.style.width = Math.round(sails.jib.sheetIn * 100) + '%';
    el.jibSheetValue.textContent = Math.round(sails.jib.sheetIn * 100);
    el.jibFurl.textContent = Math.round(sails.jib.reefFraction * 100);
    el.jibHoist.textContent = sails.jib.hoisted ? '▲ nahoře' : '▽ dole';

    el.topping.textContent = sails.toppingLift ? 'napnut' : 'uvolněn';

    const rNorm = boat.rudderAngle / (Math.PI / 4);
    el.rudderNeedle.style.left = (50 + rNorm * 50) + '%';

    const heelDeg = boat.heel * 180 / Math.PI;
    el.heelValue.textContent = heelDeg.toFixed(0);
    const magPct = Math.min(50, Math.abs(heelDeg));
    if (heelDeg >= 0) {
      el.heelFill.style.bottom = '50%';
      el.heelFill.style.top = 'auto';
    } else {
      el.heelFill.style.top = '50%';
      el.heelFill.style.bottom = 'auto';
    }
    el.heelFill.style.height = magPct + '%';

    // Varování: obě plachty luffují mimo no-go zónu (= špatný trim, ne irons)
    if (sailInfo.mainInfo.luffing && sailInfo.jibInfo.luffing
        && (sails.main.hoisted || sails.jib.hoisted)
        && course !== 'NO-GO!') {
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
        `F_fwd: ${sailInfo.F_forward.toFixed(0)} N`,
        `F_side:${sailInfo.F_side.toFixed(0)} N`,
        `F_heel:${sailInfo.F_heel.toFixed(0)} N`,
        `heel:  ${heelDeg.toFixed(1)}°`,
        `main α:${(sailInfo.mainInfo.alpha * 180 / Math.PI).toFixed(1)}° CL:${sailInfo.mainInfo.CL.toFixed(2)} CD:${sailInfo.mainInfo.CD.toFixed(2)}`,
        `jib  α:${(sailInfo.jibInfo.alpha * 180 / Math.PI).toFixed(1)}° CL:${sailInfo.jibInfo.CL.toFixed(2)} CD:${sailInfo.jibInfo.CD.toFixed(2)}`,
      ].join('\n');
    }
  }
}
