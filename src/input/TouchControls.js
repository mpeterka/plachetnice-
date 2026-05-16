import { BOAT } from '../config.js';
import { cycleMainReef, flipJib } from './sailActions.js';

// Mobilní overlay: vertikální slidery pro otěže, horizontální kormidlo se spring-backem,
// tlačítka pro ref/furl/flip/difficulty. Funguje paralelně s klávesnicí.
export class TouchControls {
  constructor(rootEl, sails, boat, bus) {
    this.root = rootEl;
    this.sails = sails;
    this.boat = boat;
    this.bus = bus;
    this.rudderDragging = false;

    this._wireSheet(rootEl.querySelector('#touch-main'), sails.main);
    this._wireSheet(rootEl.querySelector('#touch-jib'), sails.jib);
    this._wireRudder(rootEl.querySelector('#touch-rudder'));

    this._wireTap(rootEl.querySelector('#btn-ref'), () => {
      cycleMainReef(sails, bus);
      this._refreshRefLabel();
    });
    this._wireHold(rootEl.querySelector('#btn-furl-in'), (dt) => {
      sails.jib.reefFraction = Math.min(1, sails.jib.reefFraction + 0.5 * dt);
    });
    this._wireHold(rootEl.querySelector('#btn-furl-out'), (dt) => {
      sails.jib.reefFraction = Math.max(0, sails.jib.reefFraction - 0.5 * dt);
    });
    this._wireTap(rootEl.querySelector('#btn-jib-flip'), () => {
      flipJib(sails, bus);
      this._refreshFlipBtn();
    });

    // Sync stavu motýlek tlačítka při flipnutí klávesou G
    bus.on('jibFlipped', () => this._refreshFlipBtn());
    bus.on('reefChanged', () => this._refreshRefLabel());
  }

  _refreshFlipBtn() {
    const btn = this.root.querySelector('#btn-jib-flip');
    if (btn) btn.classList.toggle('active', this.sails.jib.flipped);
  }
  _refreshRefLabel() {
    const btn = this.root.querySelector('#btn-ref');
    if (btn) btn.textContent = `Ref ${this.sails.main.reefStep}/3`;
  }

  _wireSheet(padEl, sail) {
    const track = padEl.querySelector('.touch-track-v');
    const thumb = padEl.querySelector('.touch-thumb-v');
    let dragging = false;
    const apply = (e) => {
      const rect = track.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ratio = 1 - Math.max(0, Math.min(1, y / rect.height));
      sail.sheetIn = ratio;
      thumb.style.bottom = (ratio * 100) + '%';
    };
    track.addEventListener('pointerdown', (e) => {
      dragging = true; track.setPointerCapture(e.pointerId); apply(e); e.preventDefault();
    });
    track.addEventListener('pointermove', (e) => { if (dragging) apply(e); });
    const stop = (e) => {
      dragging = false;
      try { track.releasePointerCapture(e.pointerId); } catch {}
    };
    track.addEventListener('pointerup', stop);
    track.addEventListener('pointercancel', stop);
    thumb.style.bottom = (sail.sheetIn * 100) + '%';
  }

  _wireRudder(rudderEl) {
    const track = rudderEl.querySelector('.touch-track-h');
    const thumb = rudderEl.querySelector('.touch-thumb-h');
    const apply = (e) => {
      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(-1, Math.min(1, (x / rect.width) * 2 - 1));
      // Drag vlevo = kormidlo doleva = +rudderAngle (stejně jako klávesa A).
      this.boat.rudderAngle = -ratio * BOAT.maxRudderAngle;
      thumb.style.left = ((ratio + 1) * 50) + '%';
    };
    track.addEventListener('pointerdown', (e) => {
      this.rudderDragging = true;
      this.boat._rudderTouched = true;
      track.setPointerCapture(e.pointerId);
      apply(e); e.preventDefault();
    });
    track.addEventListener('pointermove', (e) => { if (this.rudderDragging) apply(e); });
    const stop = (e) => {
      this.rudderDragging = false;
      this.boat._rudderTouched = false;
      try { track.releasePointerCapture(e.pointerId); } catch {}
    };
    track.addEventListener('pointerup', stop);
    track.addEventListener('pointercancel', stop);
  }

  _wireTap(btn, fn) {
    btn.addEventListener('pointerdown', (e) => { fn(); e.preventDefault(); });
  }

  _wireHold(btn, fn) {
    let active = false;
    let lastT = 0;
    btn.addEventListener('pointerdown', (e) => {
      active = true; lastT = performance.now() / 1000;
      btn.setPointerCapture(e.pointerId);
      e.preventDefault();
      const tick = () => {
        if (!active) return;
        const now = performance.now() / 1000;
        const dt = now - lastT;
        lastT = now;
        fn(dt);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const stop = (e) => {
      active = false;
      try { btn.releasePointerCapture(e.pointerId); } catch {}
    };
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointercancel', stop);
  }

  // Sync rudder thumb pozice když ji ovládá klávesnice (nebo spring-back z Controls).
  update() {
    if (!this.rudderDragging) {
      const ratio = -this.boat.rudderAngle / BOAT.maxRudderAngle;
      const thumb = this.root.querySelector('#touch-rudder .touch-thumb-h');
      if (thumb) thumb.style.left = ((ratio + 1) * 50) + '%';
    }
  }
}
