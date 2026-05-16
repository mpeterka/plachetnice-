// SVG kompas — vykreslí růžici (statickou) + tři otáčející se elementy:
// heading (bílá šipka), true wind (červená), apparent wind (zelená).
const SVG_NS = 'http://www.w3.org/2000/svg';

export class Compass {
  constructor(svgEl) {
    this.svg = svgEl;
    this._buildStatic();
    // Apex (špička) musí být u TOP (záporná SVG y), aby rotate(0°) ukazovalo na sever.
    this.headingNeedle = this._needle('#ffffff', 80, -85, 8);   // širší = jasně „loď"
    this.trueWindNeedle = this._needle('#ff5050', 80, -78, 5);
    this.apparentNeedle = this._needle('#46c46e', 80, -78, 5);
    this.headingGroup = this._wrap(this.headingNeedle);
    this.trueGroup = this._wrap(this.trueWindNeedle);
    this.apparentGroup = this._wrap(this.apparentNeedle);
    this.svg.append(this.headingGroup, this.trueGroup, this.apparentGroup);
  }
  _buildStatic() {
    // Vnější kruh
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('r', 95);
    ring.setAttribute('fill', 'rgba(255,255,255,0.05)');
    ring.setAttribute('stroke', 'rgba(255,255,255,0.4)');
    ring.setAttribute('stroke-width', '1.2');
    this.svg.append(ring);

    // Tick marks + světové strany
    const cardinals = [['S', 0], ['V', 90], ['J', 180], ['Z', 270]];
    cardinals.forEach(([t, deg]) => {
      // Offset -90° posouvá výchozí směr SVG (+X) tak, že deg=0 ukazuje nahoru = N.
      const rad = (deg - 90) * Math.PI / 180;
      const cx = Math.cos(rad);
      const cy = Math.sin(rad);
      const tx = cx * 80;
      const ty = cy * 80;
      const tn = document.createElementNS(SVG_NS, 'text');
      tn.setAttribute('x', tx);
      tn.setAttribute('y', ty + 5);
      tn.setAttribute('fill', '#fff');
      tn.setAttribute('font-size', '14');
      tn.setAttribute('font-weight', '600');
      tn.setAttribute('text-anchor', 'middle');
      tn.textContent = t;
      this.svg.append(tn);
    });
    for (let d = 0; d < 360; d += 15) {
      const tick = document.createElementNS(SVG_NS, 'line');
      const cx = Math.cos((d - 90) * Math.PI / 180);
      const cy = Math.sin((d - 90) * Math.PI / 180);
      const len = (d % 90 === 0) ? 10 : (d % 45 === 0) ? 7 : 4;
      tick.setAttribute('x1', cx * 95);
      tick.setAttribute('y1', cy * 95);
      tick.setAttribute('x2', cx * (95 - len));
      tick.setAttribute('y2', cy * (95 - len));
      tick.setAttribute('stroke', 'rgba(255,255,255,0.5)');
      tick.setAttribute('stroke-width', '1');
      this.svg.append(tick);
    }
  }
  _needle(color, tail, head, width) {
    const p = document.createElementNS(SVG_NS, 'polygon');
    p.setAttribute('points', `${-width/2},${tail} ${width/2},${tail} 0,${head}`);
    p.setAttribute('fill', color);
    p.setAttribute('stroke', 'rgba(0,0,0,0.4)');
    p.setAttribute('stroke-width', '0.5');
    return p;
  }
  _wrap(el) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.append(el);
    return g;
  }
  // Vstup rad. headingRad: kam ukazuje příď. trueWindFromRad: odkud fouká vítr.
  update(headingRad, trueWindFromRad, apparentFromRad) {
    // SVG rotace: positive = po hodinových (clockwise). Naše heading=0 → S, roste po směru hodin (E…).
    // Šipka heading: ukazuje na heading.
    const toDeg = (r) => (r * 180 / Math.PI);
    this.headingGroup.setAttribute('transform', `rotate(${toDeg(headingRad)})`);
    this.trueGroup.setAttribute('transform', `rotate(${toDeg(trueWindFromRad)})`);
    this.apparentGroup.setAttribute('transform', `rotate(${toDeg(apparentFromRad)})`);
  }
}
