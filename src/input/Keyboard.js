// Sleduje stiskávané klávesy + dispatchuje jednorázové akce.
export class Keyboard {
  constructor() {
    this.down = new Set();
    this.pressedHandlers = new Map();
    window.addEventListener('keydown', (e) => {
      const key = this._normalize(e);
      if (!this.down.has(key)) {
        this.down.add(key);
        const handler = this.pressedHandlers.get(key);
        if (handler) {
          handler();
          e.preventDefault();
        }
      }
      // Stop scroll on game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(this._normalize(e));
    });
    window.addEventListener('blur', () => this.down.clear());
  }
  _normalize(e) {
    // 'a' -> 'a', 'A' -> 'a'; Arrow* zachová; Shift+F -> 'shift+f'
    let key = e.key;
    if (key.length === 1) key = key.toLowerCase();
    if (e.shiftKey && key !== 'Shift') key = 'shift+' + key;
    return key;
  }
  isDown(key) { return this.down.has(key); }
  onPress(key, fn) { this.pressedHandlers.set(key, fn); }
}
