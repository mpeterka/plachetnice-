import { SAILS } from '../config.js';

// Stav plachet. Hlavní (main) a kosatka (jib) jsou modelované samostatně.
export class Sails {
  constructor() {
    this.main = {
      sheetIn: 0.5,        // 0 = otěž úplně povolena (plachta volně), 1 = úplně dotaženo (chord ~ podél centerline)
      reefFraction: 0,     // 0..1 (0/0.33/0.66 podle reefStep)
      reefStep: 0,         // 0..3
      hoisted: true,       // plachta nahoře?
      tension: 'normal',   // obecné napnutí: loose | normal | tight
      areaFull: SAILS.mainAreaFull,
    };
    this.jib = {
      sheetIn: 0.5,
      reefFraction: 0,     // plynulý furler
      hoisted: true,
      areaFull: SAILS.jibAreaFull,
      flipped: false,      // true = kosatka na opačné straně (motýlek / wing-on-wing)
    };
  }

  // Vrací efektivní úhel plachty od osy lodi (na opačnou stranu od větru).
  // sheetIn=0 → plachta vyjetá max, sheetIn=1 → blízko centerline.
  // Plachta nemůže být dál od centerline než dovoluje AWA: pokud vítr fouká od přídě,
  // plachta visí v centerline a luffuje (= žádný lift).
  sailAngle(sail, awa, flipped = false) {
    const t = 1 - sail.sheetIn;
    const wantedMag = SAILS.minSheetAngle + t * (SAILS.maxSheetAngle - SAILS.minSheetAngle);
    const awaSign = Math.sign(awa);
    if (awaSign === 0) return 0;
    // Cap: plachta může jít max do AWA (jinak je vítr na špatné straně plachty → luffing).
    const cappedMag = Math.min(wantedMag, Math.abs(awa));
    // flipped = obrátit stranu (kosatka na motýlka).
    return (flipped ? awaSign : -awaSign) * cappedMag;
  }

  effectiveArea(sail) {
    if (!sail.hoisted) return 0;
    return sail.areaFull * (1 - sail.reefFraction);
  }
}
