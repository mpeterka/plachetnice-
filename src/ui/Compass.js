// Boat-up wind rose: loď je vždy nahoře (špička trojúhelníku), kardinální body se
// otáčí s headingem. No-go sektor (±40° od přídě) je trvale na vrcholu jako varování.
// Šipky větru mají tail na okraji a hrot směrem ke středu — vítr "vstupuje" z té
// strany, odkud fouká, intuitivně.
const SVG_NS = 'http://www.w3.org/2000/svg';
const toDeg = (r) => (r * 180) / Math.PI;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export class Compass {
  constructor(svgEl0) {
    this.svg = svgEl0;
    this._buildBackground();
    this._buildNoGoSector();
    this._buildBeamReachHints();
    this._buildBoatIcon();
    this._buildCardinalRing();
    this._buildWindNeedles();
  }

  _buildBackground() {
    this.svg.append(svgEl('circle', {
      r: 92,
      fill: 'rgba(255,255,255,0.04)',
      stroke: 'rgba(255,255,255,0.3)',
      'stroke-width': '1',
    }));
  }

  _buildNoGoSector() {
    // Pie slice ±40° od přídě (top). Vítr odsud znamená no-go.
    const r = 88;
    const a = (40 * Math.PI) / 180;
    const x1 = -Math.sin(a) * r;
    const y1 = -Math.cos(a) * r;
    const x2 = Math.sin(a) * r;
    const y2 = -Math.cos(a) * r;
    this.svg.append(svgEl('path', {
      d: `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
      fill: 'rgba(255,80,80,0.16)',
      stroke: 'rgba(255,80,80,0.4)',
      'stroke-width': '0.5',
    }));
    // Štítek „NO-GO" malými písmeny v sektoru
    const noGoLabel = svgEl('text', {
      x: 0, y: -70,
      fill: 'rgba(255,180,180,0.7)',
      'font-size': '8',
      'font-weight': '600',
      'text-anchor': 'middle',
      'letter-spacing': '1',
    });
    noGoLabel.textContent = 'NO-GO';
    this.svg.append(noGoLabel);
  }

  _buildBeamReachHints() {
    // Drobné značky na ±90° (beam reach — optimální pro mnoho lodí).
    for (const sign of [-1, 1]) {
      this.svg.append(svgEl('line', {
        x1: sign * 88, y1: 0,
        x2: sign * 78, y2: 0,
        stroke: 'rgba(70,196,110,0.5)',
        'stroke-width': '2',
      }));
    }
  }

  _buildBoatIcon() {
    // Bílá silueta lodi: pointed bow nahoře, mírně rozšířená v centru, plochá záď.
    this.svg.append(svgEl('path', {
      d: 'M 0 -14 L 6 -2 L 5 11 L -5 11 L -6 -2 Z',
      fill: '#fff',
      stroke: 'rgba(0,0,0,0.4)',
      'stroke-width': '0.6',
    }));
    // Centrální tečka
    this.svg.append(svgEl('circle', {
      r: 1.5, fill: 'rgba(0,0,0,0.5)',
    }));
  }

  _buildCardinalRing() {
    // Skupina s tickami a kardinály — rotuje s -heading (heading-up displej).
    const g = svgEl('g');
    const cardinals = [['S', 0], ['V', 90], ['J', 180], ['Z', 270]];
    for (const [label, deg] of cardinals) {
      const rad = (deg * Math.PI) / 180;
      const cx = Math.sin(rad);
      const cy = -Math.cos(rad);
      const text = svgEl('text', {
        x: (cx * 102).toFixed(1),
        y: (cy * 102 + 4).toFixed(1),
        fill: 'rgba(255,255,255,0.85)',
        'font-size': '12',
        'font-weight': '700',
        'text-anchor': 'middle',
      });
      text.textContent = label;
      g.append(text);
    }
    // Ticks
    for (let d = 0; d < 360; d += 15) {
      const rad = (d * Math.PI) / 180;
      const cx = Math.sin(rad);
      const cy = -Math.cos(rad);
      const len = d % 90 === 0 ? 8 : d % 45 === 0 ? 5 : 2.5;
      g.append(svgEl('line', {
        x1: (cx * 92).toFixed(1), y1: (cy * 92).toFixed(1),
        x2: (cx * (92 - len)).toFixed(1), y2: (cy * (92 - len)).toFixed(1),
        stroke: 'rgba(255,255,255,0.4)',
        'stroke-width': d % 90 === 0 ? '1.5' : '0.8',
      }));
    }
    this.cardinalRing = g;
    this.svg.append(g);
  }

  _buildWindNeedles() {
    // True wind: tlustá červená, dál od středu — pro tactical / navigaci.
    this.trueWindGroup = this._makeWindArrow('#ff5050', 3.5, 84, 22);
    // Apparent wind: zelená, tenčí, kratší — to, co cítí plachta.
    this.apparentWindGroup = this._makeWindArrow('#46c46e', 2.5, 70, 18);
    this.svg.append(this.trueWindGroup, this.apparentWindGroup);
  }

  // Šipka pro vítr: tail v outerR, hrot v innerR (oba na ose -Y při rotaci 0 = top).
  // Tail = odkud vítr přichází; hrot směřuje ke středu (k lodi).
  _makeWindArrow(color, lineWidth, outerR, innerR) {
    const g = svgEl('g');
    g.append(svgEl('line', {
      x1: 0, y1: -outerR,
      x2: 0, y2: -innerR - 4,
      stroke: color,
      'stroke-width': lineWidth,
      'stroke-linecap': 'round',
    }));
    const hw = lineWidth * 1.8;
    g.append(svgEl('path', {
      d: `M 0 ${-innerR} L ${-hw.toFixed(1)} ${(-innerR - 7).toFixed(1)} L ${hw.toFixed(1)} ${(-innerR - 7).toFixed(1)} Z`,
      fill: color,
      stroke: 'rgba(0,0,0,0.35)',
      'stroke-width': '0.5',
    }));
    // Malá tečka u tailu = ukazatel "wind from here"
    g.append(svgEl('circle', {
      cx: 0, cy: -outerR + 1,
      r: lineWidth * 0.7,
      fill: color,
    }));
    return g;
  }

  // headingRad: kam míří loď (0 = sever).
  // trueWindFromRad: úhel ODKUD fouká pravý vítr (svět).
  // apparentFromRad: úhel ODKUD fouká apparent (svět).
  update(headingRad, trueWindFromRad, apparentFromRad) {
    // Cardinaly rotují obráceně k headingu — kardinál se přemístí na top podle headingu.
    this.cardinalRing.setAttribute('transform', `rotate(${(-toDeg(headingRad)).toFixed(1)})`);
    // Šipky větru: boat-relative úhel = (windFrom - heading). Pozitivní = pravobok.
    const trueRel = toDeg(trueWindFromRad - headingRad);
    const apparentRel = toDeg(apparentFromRad - headingRad);
    this.trueWindGroup.setAttribute('transform', `rotate(${trueRel.toFixed(1)})`);
    this.apparentWindGroup.setAttribute('transform', `rotate(${apparentRel.toFixed(1)})`);
  }
}
