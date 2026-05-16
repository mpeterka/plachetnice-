import { BOAT } from '../config.js';

// Mobilní ovládání: vertikální slidery (otěže), horizontální kormidlo se spring-backem,
// tlačítka pro ref a furl. Funguje paralelně s klávesnicí.
export class TouchControls {
  constructor(rootEl, sails, boat, bus) {
    this.root = rootEl;
    this.sails = sails;
    this.boat = boat;
    this.bus = bus;
    this.rudderDragging = false;

    this._wireSheet(rootEl.querySelector('#touch-main'), () => sails.main, (v) => { sails.main.sheetIn = v; });
    this._wireSheet(rootEl.querySelector('#touch-jib'), () => sails.jib, (v) => { sails.jib.sheetIn = v; });
    this._wireRudder(rootEl.querySelector('#touch-rudder'));
    this._wireButton(rootEl.querySelector('#btn-ref'), () => this._cycleReef());
    this._wireHoldButton(rootEl.querySelector('#btn-furl-in'), (dt) => {
      sails.jib.reefFraction = Math.min(1, sails.jib.reefFraction + 0.5 * dt);
    });
    this._wireHoldButton(rootEl.querySelector('#btn-furl-out'), (dt) => {
      sails.jib.reefFraction = Math.max(0, sails.jib.reefFraction - 0.5 * dt);
    });
    this._wireButton(rootEl.querySelector('#btn-jib-flip'), () => this._flipJib());

    // Sync stavu tlačítka motýlka, pokud flip vyvolá Controls (G klávesa)
    bus.on('jibFlipped', ({ flipped }) => {
      const btn = this.root.querySelector('#btn-jib-flip');
      if (btn) btn.classList.toggle('active', flipped);
    });
  }

  _flipJib() {
    this.sails.jib.flipped = !this.sails.jib.flipped;
    const btn = this.root.querySelector('#btn-jib-flip');
    if (btn) btn.classList.toggle('active', this.sails.jib.flipped);
    this.bus.emit('jibFlipped', { flipped: this.sails.jib.flipped });
  }

  _wireSheet(padEl, getSail, setVal) {
    const track = padEl.querySelector('.touch-track-v');
    const thumb = padEl.querySelector('.touch-thumb-v');
    let dragging = false;
    const updateFromPointer = (e) => {
      const rect = track.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ratio = 1 - Math.max(0, Math.min(1, y / rect.height));
      setVal(ratio);
      thumb.style.bottom = (ratio * 100) + '%';
    };
    track.addEventListener('pointerdown', (e) => {
      dragging = true;
      track.setPointerCapture(e.pointerId);
      updateFromPointer(e);
      e.preventDefault();
    });
    track.addEventListener('pointermove', (e) => {
      if (dragging) updateFromPointer(e);
    });
    const stop = (e) => {
      dragging = false;
      try { track.releasePointerCapture(e.pointerId); } catch {}
    };
    track.addEventListener('pointerup', stop);
    track.addEventListener('pointercancel', stop);
    // initial position
    thumb.style.bottom = (getSail().sheetIn * 100) + '%';
  }

  _wireRudder(rudderEl) {
    const track = rudderEl.querySelector('.touch-track-h');
    const thumb = rudderEl.querySelector('.touch-thumb-h');
    const updateFromPointer = (e) => {
      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = (x / rect.width) * 2 - 1; // -1..1
      const clamped = Math.max(-1, Math.min(1, ratio));
      // Konvence kláves: A (vlevo) = +rudderAngle; pro touch zachováme stejnou logiku
      // (drag vlevo = rudder doleva = pozitivní). Inverze x:
      this.boat.rudderAngle = -clamped * BOAT.maxRudderAngle;
      thumb.style.left = ((clamped + 1) * 50) + '%';
    };
    track.addEventListener('pointerdown', (e) => {
      this.rudderDragging = true;
      this.boat._rudderTouched = true;
      track.setPointerCapture(e.pointerId);
      updateFromPointer(e);
      e.preventDefault();
    });
    track.addEventListener('pointermove', (e) => {
      if (this.rudderDragging) updateFromPointer(e);
    });
    const stop = (e) => {
      this.rudderDragging = false;
      this.boat._rudderTouched = false;
      try { track.releasePointerCapture(e.pointerId); } catch {}
    };
    track.addEventListener('pointerup', stop);
    track.addEventListener('pointercancel', stop);
  }

  _wireButton(btn, fn) {
    btn.addEventListener('pointerdown', (e) => { fn(); e.preventDefault(); });
  }

  _wireHoldButton(btn, fn) {
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

  _cycleReef() {
    const cur = this.sails.main.reefStep;
    this.sails.main.reefStep = (cur + 1) % 4;
    this.sails.main.reefFraction = this.sails.main.reefStep / 3;
    const btn = this.root.querySelector('#btn-ref');
    if (btn) btn.textContent = `Ref ${this.sails.main.reefStep}/3`;
    this.bus.emit('reefChanged', { sail: 'main', step: this.sails.main.reefStep });
  }

  // Pokud kormidlo není ovládáno, spring-back. (Controls.js skipuje spring-back když _rudderTouched.)
  // Tady řešíme jen sync thumb position s rudderAngle (po spring-backu z Controls).
  update(_dt) {
    if (!this.rudderDragging) {
      const ratio = -this.boat.rudderAngle / BOAT.maxRudderAngle;
      const thumb = this.root.querySelector('#touch-rudder .touch-thumb-h');
      if (thumb) thumb.style.left = ((ratio + 1) * 50) + '%';
    }
  }
}
