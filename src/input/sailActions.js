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

const MAIN_TENSION_ORDER = ['normal', 'tight', 'loose'];

export function cycleMainTension(sails) {
  const current = MAIN_TENSION_ORDER.indexOf(sails.main.tension);
  sails.main.tension = MAIN_TENSION_ORDER[(current + 1) % MAIN_TENSION_ORDER.length];
}

export function toggleHoist(sails, which, bus) {
  const sail = sails[which];
  sail.hoisted = !sail.hoisted;
}
