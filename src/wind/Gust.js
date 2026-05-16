// Náraz větru s rampou nahoru/dolů.
export class Gust {
  constructor(startT, rampUp, hold, rampDown, peakAdd) {
    this.startT = startT;
    this.peakStartT = startT + rampUp;
    this.peakEndT = this.peakStartT + hold;
    this.endT = this.peakEndT + rampDown;
    this.peakAdd = peakAdd;
  }
  contribution(t) {
    if (t < this.startT || t > this.endT) return 0;
    if (t < this.peakStartT) {
      const u = (t - this.startT) / (this.peakStartT - this.startT);
      return u * this.peakAdd;
    }
    if (t < this.peakEndT) return this.peakAdd;
    const u = (t - this.peakEndT) / (this.endT - this.peakEndT);
    return (1 - u) * this.peakAdd;
  }
  done(t) { return t > this.endT; }
}
