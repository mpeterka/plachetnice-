// Sdílené diskrétní akce mezi Controls (keyboard) a TouchControls (touch).
// Mají identický efekt — odlišuje je jen vstup. Drží to logiku na jednom místě.

export function cycleMainReef(sails, bus) {
  sails.main.reefStep = (sails.main.reefStep + 1) % 4; // 0,1,2,3
  sails.main.reefFraction = sails.main.reefStep / 3;
  bus.emit('reefChanged', { sail: 'main', step: sails.main.reefStep });
}

export function flipJib(sails, bus) {
  sails.jib.flipped = !sails.jib.flipped;
  bus.emit('jibFlipped', { flipped: sails.jib.flipped });
}

export function toggleToppingLift(sails) {
  sails.toppingLift = !sails.toppingLift;
}

export function toggleHoist(sails, which, bus) {
  const sail = sails[which];
  if (which === 'main' && sails.toppingLift && !sail.hoisted) {
    bus.emit('warning', { code: 'topping-blocks-main', msg: 'Uvolni topenant (T) před nahozením hlavní.' });
    return;
  }
  sail.hoisted = !sail.hoisted;
}
