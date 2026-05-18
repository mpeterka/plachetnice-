import { BOAT } from '../config.js';
import { cycleMainReef, cycleMainTension, flipJib, toggleHoist } from './sailActions.js';

// Mapování klávesnice → herní stav. Kontinuální vstup (otěže, kormidlo) v update(),
// diskrétní (ref, fal, napnutí hlavní, motýlek) jako onPress.
export class Controls {
  constructor(keyboard, sails, boat, bus) {
    this.kb = keyboard;
    this.sails = sails;
    this.boat = boat;

    keyboard.onPress('r', () => cycleMainReef(sails, bus));
    keyboard.onPress('t', () => cycleMainTension(sails));
    keyboard.onPress('h', () => toggleHoist(sails, 'main', bus));
    keyboard.onPress('j', () => toggleHoist(sails, 'jib', bus));
    keyboard.onPress('g', () => flipJib(sails, bus));
  }

  update(dt) {
    const rudderRate = 1.5;
    const returnRate = 2.0;
    let r = this.boat.rudderAngle;
    if (this.kb.isDown('a')) r += rudderRate * dt;
    else if (this.kb.isDown('d')) r -= rudderRate * dt;
    else if (!this.boat._rudderTouched) {
      // spring-back — jen pokud kormidlo neovládá touch (jinak by se bilo s prstem na sliderem)
      if (r > 0) r = Math.max(0, r - returnRate * dt);
      else if (r < 0) r = Math.min(0, r + returnRate * dt);
    }
    r = Math.max(-BOAT.maxRudderAngle, Math.min(BOAT.maxRudderAngle, r));
    this.boat.rudderAngle = r;

    const sheetRate = 0.6;
    if (this.kb.isDown('w')) this.sails.main.sheetIn = Math.min(1, this.sails.main.sheetIn + sheetRate * dt);
    if (this.kb.isDown('s')) this.sails.main.sheetIn = Math.max(0, this.sails.main.sheetIn - sheetRate * dt);
    if (this.kb.isDown('ArrowUp')) this.sails.jib.sheetIn = Math.min(1, this.sails.jib.sheetIn + sheetRate * dt);
    if (this.kb.isDown('ArrowDown')) this.sails.jib.sheetIn = Math.max(0, this.sails.jib.sheetIn - sheetRate * dt);

    // Furl kosatky: F = svinout (zvyšuje reefFraction), Shift+F = rozvinout
    const furlRate = 0.5;
    if (this.kb.isDown('shift+f')) this.sails.jib.reefFraction = Math.max(0, this.sails.jib.reefFraction - furlRate * dt);
    else if (this.kb.isDown('f')) this.sails.jib.reefFraction = Math.min(1, this.sails.jib.reefFraction + furlRate * dt);
  }
}
