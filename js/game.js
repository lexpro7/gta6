import { WORLD, createWorld, clamp, distance, blocked, moveBody, lineClear } from './world.js';
import { render } from './render.js';
import { AudioEngine } from './audio.js';
const $ = id => document.getElementById(id);
const objectives = [{
  x: 2680,
  y: 1180
}, {
  x: 2250,
  y: 1255
}, {
  x: 680,
  y: 2180
}, {
  x: 2520,
  y: 2250
}];
export class Game {
  constructor(onExit) {
    this.onExit = onExit;
    this.canvas = $('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.mapCtx = $('minimap').getContext('2d');
    this.audio = new AudioEngine();
    this.keys = new Set();
    this.mouse = {
      x: 0,
      y: 0,
      down: false,
      active: false
    };
    this.running = false;
    this.paused = false;
    this.frame = 0;
    this.abort = new AbortController();
    this.bind();
  }
  async prepare() {
    this.world = createWorld();
    this.reset();
  }
  reset() {
    this.player = {
      x: 2670,
      y: 1910,
      a: -Math.PI / 2,
      health: 100,
      money: 250,
      car: null,
      moving: false,
      color: '#f0a2bc'
    };
    this.camera = {
      x: 2670,
      y: 1910
    };
    this.time = 0;
    this.heat = 0;
    this.lastCrime = -100;
    this.hiddenTime = 0;
    this.stage = 0;
    this.weapon = 0;
    this.magazines = [12, 30];
    this.reserve = [120, 180];
    this.reload = 0;
    this.cooldown = 0;
    this.shake = 0;
    this.flash = 0;
    this.clinicCooldown = 0;
    this.bullets = [];
    this.particles = [];
    this.trails = [];
    this.toastTime = 0;
    this.keys.clear();
    this.mouse.down = false;
    this.mouse.active = false;
    this.cars = [];
    this.npcs = [];
    const palette = ['#e985ac', '#79c8c5', '#e2bb79', '#859bcd', '#dfdfd1', '#9b84b3'];
    const car = (x, y, type, color, a = 0, ai = false) => ({
      x,
      y,
      type,
      color,
      a,
      ai,
      speed: 0,
      hp: 100,
      turn: 0,
      stuck: 0
    });
    this.cars.push(car(2708, 1900, 'sport', '#ed85b2', 0), car(2648, 2010, 'suv', '#7ecac2', Math.PI));
    for (let i = 0; i < 22; i++) {
      const vertical = i % 2 === 0,
        road = i % 6;
      this.cars.push(car(vertical ? WORLD.roadsX[road] + 27 : 300 + i * 173 % 2250, vertical ? 300 + i * 231 % 2300 : WORLD.roadsY[road] + 27, ['sedan', 'suv', 'sport'][i % 3], palette[i % 6], vertical ? 0 : Math.PI / 2, true));
    }
    for (let i = 0; i < 20; i++) this.cars.push(car(330 + i * 110, 2830, ['sedan', 'suv', 'sport'][i % 3], palette[i % 6]));
    for (let i = 0; i < 7; i++) this.cars.push(car(WORLD.roadsX[i % 6] - 28, 350 + i * 330, 'police', '#eee', Math.PI, true));
    for (let i = 0; i < 100; i++) {
      const road = i % 6;
      this.npcs.push({
        x: WORLD.roadsX[road] + (i % 2 ? 69 : -69),
        y: 80 + i * 113 % 2800,
        a: i % 2 ? Math.PI / 2 : -Math.PI / 2,
        color: palette[i % 6],
        skin: ['#dbb293', '#a8755e', '#edc7a1'][i % 3],
        moving: true,
        wait: 0,
        decision: 2 + i % 7,
        panic: 0,
        down: 0
      });
    }
    $('resume').disabled = false;
    $('toast').textContent = '';
    $('pause-title').innerHTML = 'TAKE A<br><em>BREATHER.</em>';
    this.resize();
    this.hud();
  }
  bind() {
    const opt = {
      signal: this.abort.signal
    };
    window.addEventListener('resize', () => this.resize(), opt);
    window.addEventListener('keydown', e => {
      if (!this.running) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Escape'].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape') {
        if (!e.repeat) this.pause(!this.paused);
        return;
      }
      if (this.paused) return;
      this.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'KeyE') this.interact();
      if (e.code === 'KeyR') this.startReload();
      if (e.code === 'Digit1' || e.code === 'Digit2') {
        this.weapon = e.code === 'Digit1' ? 0 : 1;
        this.reload = 0;
      }
    }, opt);
    window.addEventListener('keyup', e => this.keys.delete(e.code), opt);
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
      if (this.running) this.pause(true);
    }, opt);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.running) this.pause(true);
    }, opt);
    this.canvas.addEventListener('pointermove', e => {
      const b = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - b.left;
      this.mouse.y = e.clientY - b.top;
      this.mouse.active = true;
    }, opt);
    this.canvas.addEventListener('pointerdown', e => {
      if (e.button === 0 && this.running && !this.paused) {
        this.mouse.down = true;
        const bounds = this.canvas.getBoundingClientRect();
        this.player.a = Math.atan2(e.clientY - bounds.top - this.height / 2 + this.camera.y - this.player.y, e.clientX - bounds.left - this.width / 2 + this.camera.x - this.player.x);
        this.shoot();
      }
    }, opt);
    window.addEventListener('pointerup', () => this.mouse.down = false, opt);
    this.canvas.addEventListener('contextmenu', e => e.preventDefault(), opt);
    $('pause-button').onclick = () => this.pause(true);
    $('resume').onclick = () => this.pause(false);
    $('restart').onclick = () => {
      this.reset();
      this.pause(false);
    };
    $('exit').onclick = () => this.stop();
    $('sound').onclick = () => {
      $('sound').textContent = this.audio.toggle() ? 'SOUND ON' : 'SOUND OFF';
    };
    $('controls-toggle').onclick = () => {
      const show = $('controls').hidden;
      $('controls').hidden = !show;
      $('controls-toggle').setAttribute('aria-expanded', String(show));
    };
  }
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
  }
  start() {
    cancelAnimationFrame(this.frame);
    this.running = true;
    this.paused = false;
    $('pause').hidden = true;
    this.resize();
    this.last = performance.now();
    this.frame = requestAnimationFrame(t => this.loop(t));
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.keys.clear();
    this.mouse.down = false;
    this.audio.stop();
    this.onExit();
  }
  pause(value) {
    if (!this.running) return;
    if (!value && this.player.health <= 0) return;
    this.paused = value;
    $('pause').hidden = !value;
    this.keys.clear();
    this.mouse.down = false;
    this.audio.update(0, false, true);
  }
  loop(t) {
    if (!this.running) return;
    const dt = Math.min((t - this.last) / 1000, .035);
    this.last = t;
    if (!this.paused) this.update(dt);
    render(this);
    this.frame = requestAnimationFrame(n => this.loop(n));
  }
  target() {
    return this.stage < 4 ? objectives[this.stage] : null;
  }
  closestCar() {
    return this.cars.filter(c => distance(c, this.player) < 62 && Math.abs(c.speed) < 100).sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
  }
  interact() {
    const p = this.player;
    if (p.car) {
      const v = p.car;
      if (Math.abs(v.speed) > 90) {
        this.toast('SLOW DOWN TO EXIT', 2);
        return;
      }
      let spot = null;
      for (let i = 0; i < 8; i++) {
        const a = v.a + i * Math.PI / 4;
        const test = {
          x: v.x + Math.cos(a) * 42,
          y: v.y + Math.sin(a) * 42
        };
        if (!blocked(this.world, test.x, test.y, 10) && !this.cars.some(c => c !== v && distance(c, test) < 30)) {
          spot = test;
          break;
        }
      }
      if (!spot) {
        this.toast('NO ROOM TO EXIT', 2);
        return;
      }
      p.x = spot.x;
      p.y = spot.y;
      v.speed = 0;
      p.car = null;
    } else {
      const v = this.closestCar();
      if (v) {
        v.ai = false;
        p.car = v;
        p.x = v.x;
        p.y = v.y;
        if (v.type === 'police') this.crime(1.3);else if (this.cars.indexOf(v) > 1) this.crime(.5);
      }
    }
  }
  crime(amount) {
    this.heat = clamp(this.heat + amount, 0, 5);
    this.lastCrime = this.time;
    this.hiddenTime = 0;
    for (const n of this.npcs) if (distance(n, this.player) < 350) n.panic = 5;
  }
  startReload() {
    const cap = this.weapon ? 30 : 12;
    if (this.magazines[this.weapon] < cap && this.reserve[this.weapon] > 0 && !this.reload) this.reload = this.weapon ? 1.7 : 1.15;
  }
  shoot() {
    if (this.cooldown > 0 || this.reload || this.player.car) return;
    const w = this.weapon;
    if (this.magazines[w] <= 0) {
      this.startReload();
      return;
    }
    this.magazines[w]--;
    this.cooldown = w ? .105 : .3;
    this.flash = .06;
    const p = this.player,
      a = p.a + (Math.random() - .5) * (w ? .08 : .025);
    this.bullets.push({
      x: p.x + Math.cos(a) * 23,
      y: p.y + Math.sin(a) * 23,
      vx: Math.cos(a) * 850,
      vy: Math.sin(a) * 850,
      life: .85
    });
    this.audio.tone(w ? 100 : 145, .09, 'sawtooth', .045);
    this.crime(w ? .055 : .15);
  }
  particlesAt(x, y, color = '#ffe9a3') {
    for (let i = 0; i < 8; i++) this.particles.push({
      x,
      y,
      vx: (Math.random() - .5) * 100,
      vy: (Math.random() - .5) * 100,
      life: .3 + Math.random() * .2,
      color
    });
    if (this.particles.length > 240) this.particles.splice(0, this.particles.length - 240);
  }
  toast(text, duration = 3) {
    $('toast').textContent = text;
    this.toastTime = duration;
  }
  pass(amount) {
    this.player.money += amount;
    this.toast(`MISSION PASSED · +$${amount}`, 4);
    this.audio.tone(700, .5, 'sine', .07);
  }
  update(dt) {
    this.time += dt;
    const p = this.player,
      k = this.keys;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.shake = Math.max(0, this.shake - dt * 15);
    this.clinicCooldown = Math.max(0, this.clinicCooldown - dt);
    if (this.toastTime > 0) {
      this.toastTime -= dt;
      if (this.toastTime <= 0) $('toast').textContent = '';
    }
    if (this.reload > 0) {
      this.reload -= dt;
      if (this.reload <= 0) {
        const w = this.weapon,
          n = Math.min((w ? 30 : 12) - this.magazines[w], this.reserve[w]);
        this.magazines[w] += n;
        this.reserve[w] -= n;
        this.reload = 0;
      }
    }
    const forward = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0),
      side = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (p.car) {
      const v = p.car;
      v.speed += forward * (v.type === 'sport' ? 330 : 260) * dt;
      v.speed *= Math.exp(-dt * (k.has('Space') ? 4 : forward ? .35 : 1.05));
      v.speed = clamp(v.speed, -145, v.type === 'sport' ? 460 : 340);
      v.a += side * Math.min(Math.abs(v.speed) / 100, 1) * 2.1 * dt * Math.sign(v.speed);
      const old = {
        x: v.x,
        y: v.y
      };
      if (moveBody(this.world, v, Math.sin(v.a) * v.speed * dt, -Math.cos(v.a) * v.speed * dt, 24)) {
        if (Math.abs(v.speed) > 70) {
          p.health -= Math.abs(v.speed) * .018;
          this.shake = 7;
          this.particlesAt(v.x, v.y);
          this.audio.tone(65, .2);
        }
        v.speed *= -.3;
      }
      if ((side || k.has('Space')) && Math.abs(v.speed) > 150) {
        for (const off of [-8, 8]) this.trails.push({
          x: old.x + off,
          y: old.y + 15,
          x2: v.x + off,
          y2: v.y + 15,
          life: 10
        });
      }
      p.x = v.x;
      p.y = v.y;
      p.a = v.a - Math.PI / 2;
    } else {
      let dx = side,
        dy = -forward,
        len = Math.hypot(dx, dy);
      p.moving = len > 0;
      if (len) {
        const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? 205 : 125;
        moveBody(this.world, p, dx / len * speed * dt, dy / len * speed * dt, 10);
        if (!this.mouse.active) p.a = Math.atan2(dy, dx);
      }
      if (this.mouse.active) p.a = Math.atan2(this.mouse.y - this.height / 2 + this.camera.y - p.y, this.mouse.x - this.width / 2 + this.camera.x - p.x);
      if (this.mouse.down) this.shoot();
    }
    let seen = false;
    for (const v of this.cars) {
      if (v === p.car) continue;
      if (v.ai) {
        const pursuit = v.type === 'police' && this.heat > 0;
        const d = distance(v, p);
        if (pursuit && d < 520 && lineClear(this.world, v, p)) seen = true;
        if (pursuit) {
          let tx = p.x,
            ty = p.y;
          if (!lineClear(this.world, v, p)) {
            const rx = WORLD.roadsX.reduce((a, b) => Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a),
              ry = WORLD.roadsY.reduce((a, b) => Math.abs(b - p.y) < Math.abs(a - p.y) ? b : a);
            const vx = WORLD.roadsX.reduce((a, b) => Math.abs(b - v.x) < Math.abs(a - v.x) ? b : a),
              vy = WORLD.roadsY.reduce((a, b) => Math.abs(b - v.y) < Math.abs(a - v.y) ? b : a);
            if (Math.abs(v.x - vx) < 70) {
              tx = vx;
              ty = ry;
              if (Math.abs(v.y - ry) < 40) tx = rx;
            } else {
              tx = rx;
              ty = vy;
              if (Math.abs(v.x - rx) < 40) ty = ry;
            }
          }
          const desired = Math.atan2(tx - v.x, -(ty - v.y));
          let turn = Math.atan2(Math.sin(desired - v.a), Math.cos(desired - v.a));
          v.a += clamp(turn, -dt * 2.6, dt * 2.6);
          v.speed = 125 + this.heat * 18;
        } else {
          v.speed = 85 + this.cars.indexOf(v) % 5 * 8;
        }
        // Traffic yields to the player and to vehicles directly ahead.
        const ahead = {
          x: v.x + Math.sin(v.a) * 55,
          y: v.y - Math.cos(v.a) * 55
        };
        if (!pursuit && (distance(ahead, p) < 35 || this.cars.some(other => other !== v && distance(ahead, other) < 30))) v.speed = 0;
        const hit = moveBody(this.world, v, Math.sin(v.a) * v.speed * dt, -Math.cos(v.a) * v.speed * dt, 23);
        if (hit) {
          v.stuck += dt;
          if (v.stuck > .3) {
            v.a += Math.PI / 2;
            v.stuck = 0;
          }
        } else v.stuck = 0;
        if (!pursuit) {
          if (v.y < 40) {
            v.y = 2950;
          }
          if (v.y > 2960) {
            v.y = 45;
          }
          if (v.x < 40) {
            v.x = 2750;
          }
          if (v.x > 2770) {
            v.x = 45;
          }
        }
      }
      const d = distance(v, p);
      if (d < (p.car ? 43 : 26)) {
        if (v.type === 'police' && this.heat > 0) {
          p.health -= dt * (p.car ? 5 : 12);
          this.shake = 2;
        }
        if (p.car && Math.abs(p.car.speed) > 60) {
          this.particlesAt(p.x, p.y);
          p.health -= Math.abs(p.car.speed) * .015;
          p.car.speed *= -.35;
          v.speed *= .5;
          this.shake = 5;
          this.crime(.15);
          moveBody(this.world, p.car, (p.x - v.x) / Math.max(d, 1) * 10, (p.y - v.y) / Math.max(d, 1) * 10, 24);
        } else if (!p.car && Math.abs(v.speed) > 30) {
          p.health -= dt * 20;
          moveBody(this.world, p, (p.x - v.x) / Math.max(d, 1) * 90 * dt, (p.y - v.y) / Math.max(d, 1) * 90 * dt, 10);
        }
      }
    }
    for (const n of this.npcs) {
      if (n.down > 0) {
        n.down -= dt;
        continue;
      }
      n.panic = Math.max(0, n.panic - dt);
      n.decision -= dt;
      if (n.decision <= 0) {
        n.wait = Math.random() < .35 ? 1 + Math.random() * 2 : 0;
        n.a = Math.random() < .5 ? Math.PI / 2 : -Math.PI / 2;
        n.decision = 3 + Math.random() * 5;
      }
      const danger = this.cars.find(v => Math.abs(v.speed) > 80 && distance(v, n) < 90);
      if (danger) {
        n.panic = 2;
        n.a = Math.atan2(n.y - danger.y, n.x - danger.x);
      }
      if (n.panic > 0 && !danger) n.a = Math.atan2(n.y - p.y, n.x - p.x);
      if (n.wait > 0 && n.panic <= 0) {
        n.wait -= dt;
        n.moving = false;
      } else {
        n.moving = true;
        const speed = n.panic > 0 ? 135 : 28;
        if (moveBody(this.world, n, Math.cos(n.a) * speed * dt, Math.sin(n.a) * speed * dt, 8)) n.a += Math.PI / 2;
      }
      if (p.car && Math.abs(p.car.speed) > 70 && distance(p, n) < 28) {
        n.down = 10;
        this.crime(.4);
        this.particlesAt(n.x, n.y, '#bcdef1');
      }
    }
    for (const b of this.bullets) {
      b.life -= dt;
      const steps = 4;
      for (let j = 0; j < steps && b.life > 0; j++) {
        b.x += b.vx * dt / steps;
        b.y += b.vy * dt / steps;
        if (blocked(this.world, b.x, b.y, 2)) {
          b.life = 0;
          this.particlesAt(b.x, b.y);
        }
        const npc = this.npcs.find(n => n.down <= 0 && distance(n, b) < 11);
        if (npc) {
          npc.down = 12;
          b.life = 0;
          this.particlesAt(b.x, b.y, '#d5e8ff');
          this.crime(.25);
        }
        const car = this.cars.find(v => distance(v, b) < 23);
        if (car) {
          b.life = 0;
          car.hp -= 12;
          this.particlesAt(b.x, b.y);
          if (car.hp <= 0) {
            car.ai = false;
            car.speed = 0;
            car.color = '#64727c';
          }
          if (car.type === 'police') this.crime(.4);
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.life > 0);
    for (const q of this.particles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    this.particles = this.particles.filter(q => q.life > 0);
    for (const t of this.trails) t.life -= dt;
    this.trails = this.trails.filter(t => t.life > 0).slice(-500);
    if (this.heat > 0) {
      if (!seen && this.time - this.lastCrime > 5) {
        this.hiddenTime += dt;
        if (this.hiddenTime > 5) this.heat = Math.max(0, this.heat - dt * .22);
      } else this.hiddenTime = 0;
    }
    if (this.stage === 0 && p.car && distance(p, objectives[0]) < 65) {
      this.pass(500);
      this.stage = 1;
    } else if (this.stage === 1 && distance(p, objectives[1]) < 48) {
      this.stage = 2;
      this.toast('PACKAGE COLLECTED', 2);
    } else if (this.stage === 2 && distance(p, objectives[2]) < 65) {
      this.pass(1000);
      this.stage = 3;
      this.crime(2);
      const cop = this.cars.find(v => v.type === 'police' && v !== p.car);
      if (cop) {
        cop.x = 680;
        cop.y = 1880;
        cop.ai = true;
      }
    } else if (this.stage === 3 && distance(p, objectives[3]) < 70 && this.heat === 0) {
      this.pass(1500);
      this.stage = 4;
    }
    if (distance(p, {
      x: 2605,
      y: 2605
    }) < 65 && !this.clinicCooldown) {
      p.health = 100;
      this.reserve = [120, 180];
      this.clinicCooldown = 15;
      this.toast('RESTORED · HEALTH + AMMO', 2);
    }
    if (p.health <= 0) {
      p.health = 0;
      this.toast('WASTED', 99);
      $('resume').disabled = true;
      $('pause-title').innerHTML = 'END OF<br><em>THE ROAD.</em>';
      this.pause(true);
    }
    const ease = 1 - Math.exp(-dt * 5);
    this.camera.x += (p.x - this.camera.x) * ease;
    this.camera.y += (p.y - this.camera.y) * ease;
    this.camera.x = clamp(this.camera.x, this.width / 2, WORLD.width - this.width / 2);
    this.camera.y = clamp(this.camera.y, this.height / 2, WORLD.height - this.height / 2);
    this.audio.update(p.car?.speed || 0, !!p.car, false);
    this.hud();
  }
  hud() {
    const p = this.player;
    $('district').textContent = p.x > 2600 ? 'Ocean Beach' : p.x > 1700 ? 'Downtown Vice' : p.x > 1000 ? 'Starfish Park' : 'Little Havana';
    const minutes = 18 * 60 + Math.floor(this.time * 2);
    $('game-clock').textContent = `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} · ${p.car ? p.car.type.toUpperCase() + ' / ' + Math.round(Math.abs(p.car.speed) * .35) + ' KM/H' : 'ON FOOT'}`;
    $('money').textContent = '$' + String(p.money).padStart(6, '0');
    const stars = Math.ceil(this.heat);
    $('wanted').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    $('wanted').setAttribute('aria-label', `Wanted level ${stars} of 5`);
    $('ammo').textContent = `${this.weapon ? 'RIFLE' : 'PISTOL'} · ${this.reload > 0 ? 'RELOADING' : this.magazines[this.weapon] + ' / ' + this.reserve[this.weapon]}`;
    $('health-bar').style.width = p.health + '%';
    $('mission-name').textContent = ['01 / FIRST RIDE', '02 / DELIVERY — PICKUP', '02 / DELIVERY — DROP-OFF', '03 / ESCAPE', 'LEONIDA / FREE ROAM'][this.stage];
    $('mission-text').textContent = ['Find a car. Drive to the Ocean Drive marker.', 'Collect the package by the hotel.', 'Deliver the package to Little Havana.', 'Lose the police, then reach the safe zone.', 'All missions complete. The city is yours.'][this.stage];
    const target = this.target();
    $('mission-distance').textContent = target ? `${Math.round(distance(p, target))} m to destination${this.heat > 0 ? ' · ' + (this.hiddenTime > 0 ? 'HIDING' : 'WANTED') : ''}` : 'Visit the green clinic marker for health and ammo.';
    $('interaction').textContent = p.car ? 'E · EXIT VEHICLE  /  SPACE · HANDBRAKE' : this.closestCar() ? 'PRESS E TO ENTER VEHICLE' : '';
  }
}
