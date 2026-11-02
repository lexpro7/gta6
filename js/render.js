import { WORLD, clamp } from './world.js';
export function drawCar(c, v, time) {
  c.save();
  c.translate(v.x, v.y);
  c.rotate(v.a);
  const w = v.type === 'suv' ? 25 : 22,
    h = v.type === 'sport' ? 46 : 43;
  c.fillStyle = '#091a3355';
  c.fillRect(-w / 2 + 5, -h / 2 + 6, w + 3, h + 4);
  c.fillStyle = '#16212e';
  for (const x of [-w / 2 - 3, w / 2 - 1]) for (const y of [-h / 2 + 6, h / 2 - 13]) c.fillRect(x, y, 4, 9);
  c.fillStyle = v.type === 'police' ? '#e7e6d6' : v.color;
  c.beginPath();
  c.roundRect(-w / 2, -h / 2, w, h, 5);
  c.fill();
  c.fillStyle = '#22374c';
  c.fillRect(-w / 2 + 3, -h / 2 + 10, w - 6, 8);
  c.fillRect(-w / 2 + 3, h / 2 - 12, w - 6, 6);
  c.fillStyle = '#ffffff35';
  c.fillRect(-w / 2 + 3, -h / 2 + 3, 3, h - 6);
  c.fillStyle = v.type === 'police' ? '#26354a' : v.color;
  c.fillRect(-w / 2 + 3, -4, w - 6, 11);
  c.fillStyle = '#fff4bd';
  c.fillRect(-w / 2 + 2, -h / 2, 5, 3);
  c.fillRect(w / 2 - 7, -h / 2, 5, 3);
  c.fillStyle = '#ff636f';
  c.fillRect(-w / 2 + 2, h / 2 - 2, 4, 2);
  c.fillRect(w / 2 - 6, h / 2 - 2, 4, 2);
  if (v.type === 'sport') {
    c.fillStyle = '#272e46';
    c.fillRect(-w / 2 - 2, h / 2 - 4, w + 4, 3);
  }
  if (v.type === 'police') {
    c.fillStyle = Math.sin(time * 14) > 0 ? '#ff527a' : '#65bcff';
    c.shadowColor = c.fillStyle;
    c.shadowBlur = 15;
    c.fillRect(-8, -1, 16, 4);
  }
  c.restore();
}
export function drawPerson(c, p, time, player = false) {
  if (p.down > 0) return;
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.a + Math.PI / 2);
  c.fillStyle = '#15273855';
  c.beginPath();
  c.ellipse(3, 4, 9, 12, 0, 0, Math.PI * 2);
  c.fill();
  const walk = Math.sin(time * 12 + p.x * .03) * (p.moving ? 3 : 0);
  c.fillStyle = '#283245';
  c.fillRect(-5, 3 + walk, 4, 8);
  c.fillRect(1, 3 - walk, 4, 8);
  c.fillStyle = p.color || '#f29cba';
  c.beginPath();
  c.roundRect(-8, -5, 16, 13, 4);
  c.fill();
  c.fillStyle = p.skin || '#dba77f';
  c.beginPath();
  c.arc(0, -5, 5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#3a2d39';
  c.beginPath();
  c.arc(0, -7, 4, Math.PI, Math.PI * 2);
  c.fill();
  if (player) {
    c.fillStyle = '#deb28f';
    c.fillRect(6, -10, 4, 10);
    c.fillStyle = '#283644';
    c.fillRect(7, -18, 4, 12);
  }
  c.restore();
}
export function render(g) {
  const c = g.ctx,
    w = g.width,
    h = g.height,
    p = g.player;
  c.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  c.save();
  const shake = g.shake * Math.sin(g.time * 91);
  c.translate(w / 2 - g.camera.x + shake, h / 2 - g.camera.y + shake * .5);
  c.drawImage(g.world.map, 0, 0);
  for (const t of g.trails) {
    c.strokeStyle = `rgba(25,34,45,${t.life / 20})`;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(t.x, t.y);
    c.lineTo(t.x2, t.y2);
    c.stroke();
  }
  const target = g.target();
  if (target) {
    c.strokeStyle = '#ff8fcb';
    c.fillStyle = '#ff9ac32a';
    c.lineWidth = 3;
    const r = 28 + Math.sin(g.time * 3) * 4;
    c.beginPath();
    c.arc(target.x, target.y, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#ffd0e6';
    c.font = 'bold 22px Arial';
    c.textAlign = 'center';
    c.fillText(g.stage === 2 ? '▣' : '↓', target.x, target.y + 7);
  }
  // Clinic is always available, even after the story ends.
  c.fillStyle = '#14293b';
  c.fillRect(2570, 2570, 70, 38);
  c.fillStyle = '#95f1cb';
  c.font = 'bold 12px Arial';
  c.textAlign = 'center';
  c.fillText('+ CLINIC', 2605, 2594);
  const visible = o => Math.abs(o.x - g.camera.x) < w / 2 + 80 && Math.abs(o.y - g.camera.y) < h / 2 + 80;
  for (const v of g.cars) if (visible(v)) drawCar(c, v, g.time);
  for (const n of g.npcs) if (visible(n)) drawPerson(c, n, g.time);
  if (!p.car) drawPerson(c, p, g.time, true);
  for (const b of g.bullets) {
    c.strokeStyle = '#ffefad';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(b.x, b.y);
    c.lineTo(b.x - b.vx * .014, b.y - b.vy * .014);
    c.stroke();
  }
  for (const q of g.particles) {
    c.globalAlpha = clamp(q.life * 3, 0, 1);
    c.fillStyle = q.color;
    c.fillRect(q.x, q.y, 3, 3);
  }
  c.globalAlpha = 1;
  if (g.flash > 0 && !p.car) {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.a);
    c.fillStyle = '#fff1ab';
    c.beginPath();
    c.moveTo(18, -4);
    c.lineTo(36, 0);
    c.lineTo(18, 5);
    c.fill();
    c.restore();
  }
  const night = .04 + Math.max(0, Math.sin(g.time / 110)) * .18;
  c.fillStyle = `rgba(28,24,70,${night})`;
  c.fillRect(g.camera.x - w / 2, g.camera.y - h / 2, w, h);
  for (const l of g.world.lamps) if (visible(l)) {
    const glow = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, 45);
    glow.addColorStop(0, '#ffe3ae24');
    glow.addColorStop(1, '#ffe3ae00');
    c.fillStyle = glow;
    c.fillRect(l.x - 45, l.y - 45, 90, 90);
  }
  c.restore();
  // Screen-edge mission pointer remains useful when the target is offscreen.
  if (target) {
    let dx = target.x - g.camera.x,
      dy = target.y - g.camera.y;
    if (Math.abs(dx) > w / 2 - 65 || Math.abs(dy) > h / 2 - 100) {
      const scale = Math.min((w / 2 - 55) / Math.abs(dx), (h / 2 - 95) / Math.abs(dy));
      c.save();
      c.translate(w / 2 + dx * scale, h / 2 + dy * scale);
      c.rotate(Math.atan2(dy, dx));
      c.fillStyle = '#ff92c1';
      c.beginPath();
      c.moveTo(13, 0);
      c.lineTo(-9, -9);
      c.lineTo(-9, 9);
      c.closePath();
      c.fill();
      c.restore();
    }
  }
  const m = g.mapCtx,
    s = 180;
  m.clearRect(0, 0, s, s);
  m.fillStyle = '#1c4c5b';
  m.fillRect(0, 0, s, s);
  m.drawImage(g.world.map, 0, 0, WORLD.width, WORLD.height, 0, 15, 180, 150);
  const dot = (o, color, r) => {
    m.fillStyle = color;
    m.beginPath();
    m.arc(o.x / WORLD.width * s, 15 + o.y / WORLD.height * 150, r, 0, Math.PI * 2);
    m.fill();
  };
  if (target) dot(target, '#ff7fbd', 4);
  dot({
    x: 2605,
    y: 2605
  }, '#8df3bc', 3);
  for (const v of g.cars) if (v.type === 'police' && g.heat > 0) dot(v, '#ff5b76', 2);
  dot(p, '#fff9df', 4);
}
