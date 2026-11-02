export class AudioEngine {
  constructor() {
    this.enabled = false;
    this.ctx = null;
  }
  toggle() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.engine = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();
      this.engine.type = 'sawtooth';
      this.gain.gain.value = 0;
      this.engine.connect(this.gain).connect(this.ctx.destination);
      this.engine.start();
    }
    this.enabled = !this.enabled;
    if (this.enabled) this.ctx.resume();else this.gain.gain.value = 0;
    return this.enabled;
  }
  tone(freq = 180, duration = .1, type = 'square', volume = .035) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(25, freq * .3), t + duration);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(.001, t + duration);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + duration);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  update(speed, driving, paused) {
    if (!this.ctx) return;
    this.engine.frequency.setTargetAtTime(35 + Math.abs(speed) * .22, this.ctx.currentTime, .12);
    this.gain.gain.setTargetAtTime(this.enabled && driving && !paused ? .018 : 0, this.ctx.currentTime, .1);
  }
  stop() {
    if (this.gain) this.gain.gain.value = 0;
  }
}
