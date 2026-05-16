// Fixed-step physics, variable rate render.
export class GameLoop {
  constructor({ dt = 1 / 60, fixedUpdate, render }) {
    this.dt = dt;
    this.fixedUpdate = fixedUpdate;
    this.render = render;
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this.paused = false;
    this.time = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now() / 1000;
    requestAnimationFrame(this._tick);
  }

  togglePause() { this.paused = !this.paused; }

  _tick(now) {
    if (!this.running) return;
    const tSec = now / 1000;
    let frameDelta = tSec - this.lastTime;
    this.lastTime = tSec;
    if (frameDelta > 0.25) frameDelta = 0.25;     // clamp spike

    if (!this.paused) {
      this.accumulator += frameDelta;
      while (this.accumulator >= this.dt) {
        this.fixedUpdate(this.dt, this.time);
        this.time += this.dt;
        this.accumulator -= this.dt;
      }
    }
    const alpha = this.accumulator / this.dt;
    this.render(frameDelta, alpha);
    requestAnimationFrame(this._tick);
  }
}
