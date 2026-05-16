import { BOAT } from '../config.js';

// Plynulé interpolace mezi raw input a herním stavem.
// - Kormidlo: A/D drží = vychýleno, pustí = spring-back na 0.
// - Otěže: W/S, ↑/↓ plynule mění hodnotu, drží se na poslední pozici.
// - Ref/Furl/Topenant/Fal: jednorázové stisky (registrované v Keyboard.onPress).
export class Controls {
  constructor(keyboard, sails, boat, bus) {
    this.kb = keyboard;
    this.sails = sails;
    this.boat = boat;
    this.bus = bus;

    // Jednorázové akce
    keyboard.onPress('r', () => this._cycleReef());
    keyboard.onPress('t', () => this._toggleTopping());
    keyboard.onPress('h', () => this._toggleHoist('main'));
    keyboard.onPress('j', () => this._toggleHoist('jib'));
  }

  update(dt) {
    // --- Kormidlo (A/D), spring-back ---
    const rudderRate = 1.5;  // rad/s
    const returnRate = 2.0;
    let r = this.boat.rudderAngle;
    if (this.kb.isDown('a')) r += rudderRate * dt;
    else if (this.kb.isDown('d')) r -= rudderRate * dt;
    else {
      // spring back
      if (r > 0) r = Math.max(0, r - returnRate * dt);
      else if (r < 0) r = Math.min(0, r + returnRate * dt);
    }
    r = Math.max(-BOAT.maxRudderAngle, Math.min(BOAT.maxRudderAngle, r));
    this.boat.rudderAngle = r;

    // --- Otěže ---
    const sheetRate = 0.6; // 0..1 za sekundu
    if (this.kb.isDown('w')) this.sails.main.sheetIn = Math.min(1, this.sails.main.sheetIn + sheetRate * dt);
    if (this.kb.isDown('s')) this.sails.main.sheetIn = Math.max(0, this.sails.main.sheetIn - sheetRate * dt);
    if (this.kb.isDown('ArrowUp')) this.sails.jib.sheetIn = Math.min(1, this.sails.jib.sheetIn + sheetRate * dt);
    if (this.kb.isDown('ArrowDown')) this.sails.jib.sheetIn = Math.max(0, this.sails.jib.sheetIn - sheetRate * dt);

    // --- Furl kosatky: F = furl (>0), Shift+F = unfurl ---
    const furlRate = 0.5;
    if (this.kb.isDown('shift+f')) this.sails.jib.reefFraction = Math.max(0, this.sails.jib.reefFraction - furlRate * dt);
    else if (this.kb.isDown('f')) this.sails.jib.reefFraction = Math.min(1, this.sails.jib.reefFraction + furlRate * dt);
  }

  _cycleReef() {
    const cur = this.sails.main.reefStep;
    this.sails.main.reefStep = (cur + 1) % 4; // 0,1,2,3
    this.sails.main.reefFraction = this.sails.main.reefStep / 3;
    this.bus.emit('reefChanged', { sail: 'main', step: this.sails.main.reefStep });
  }

  _toggleTopping() {
    this.sails.toppingLift = !this.sails.toppingLift;
    // Pokud chceš nahoditi hlavní, musí být topenant uvolněný.
    if (!this.sails.toppingLift && !this.sails.main.hoisted) {
      // nic — uživatel pak stiskne H
    }
  }

  _toggleHoist(which) {
    const sail = this.sails[which];
    if (which === 'main' && this.sails.toppingLift && !sail.hoisted) {
      // nelze nahodit — topenant blokuje
      this.bus.emit('warning', { code: 'topping-blocks-main', msg: 'Uvolni topenant (T) před nahozením hlavní.' });
      return;
    }
    sail.hoisted = !sail.hoisted;
  }
}
