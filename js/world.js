export const WORLD = {
  width: 3600,
  height: 3000,
  coast: 2920,
  roadsX: [180, 680, 1180, 1680, 2180, 2680],
  roadsY: [180, 680, 1180, 1680, 2180, 2680]
};
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function createWorld() {
  const buildings = [],
    parks = [],
    palms = [],
    lamps = [];
  let seed = 61;
  const rand = () => {
    seed = seed * 1664525 + 1013904223 >>> 0;
    return seed / 4294967296;
  };
  const colors = ['#b98aab', '#8f9bb3', '#bbad9c', '#80acb1', '#a193bd', '#c99e9d'];
  for (let ix = 0; ix < 5; ix++) for (let iy = 0; iy < 5; iy++) {
    const x = WORLD.roadsX[ix] + 95,
      y = WORLD.roadsY[iy] + 95;
    if (ix === 2 && iy === 2 || ix === 4 && iy === 3) {
      parks.push({
        x,
        y,
        w: 310,
        h: 310
      });
      continue;
    }
    for (let n = 0; n < 4; n++) {
      const bx = x + n % 2 * 162,
        by = y + Math.floor(n / 2) * 162;
      buildings.push({
        x: bx,
        y: by,
        w: 120 + rand() * 18,
        h: 112 + rand() * 22,
        color: colors[Math.floor(rand() * colors.length)],
        floors: 2 + Math.floor(rand() * 7),
        sign: ['MOTEL', 'VICE', 'PALMS', '24 / 7', 'OCEAN', 'CLUB', 'SUNSET', 'HOTEL'][Math.floor(rand() * 8)]
      });
    }
  }
  for (const x of WORLD.roadsX) for (let y = 280; y < 2800; y += 165) {
    palms.push({
      x: x + 76,
      y
    });
    lamps.push({
      x: x - 73,
      y: y + 65
    });
  }
  for (let y = 120; y < 2900; y += 120) palms.push({
    x: 2865,
    y
  });
  const map = document.createElement('canvas');
  map.width = WORLD.width;
  map.height = WORLD.height;
  const c = map.getContext('2d');
  const rect = (x, y, w, h, color) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };
  rect(0, 0, 3600, 3000, '#7eaaa1');
  rect(2800, 0, 240, 3000, '#dfc6a0');
  const sea = c.createLinearGradient(2990, 0, 3600, 0);
  sea.addColorStop(0, '#60c8bf');
  sea.addColorStop(.3, '#319ca6');
  sea.addColorStop(1, '#24677f');
  rect(2990, 0, 610, 3000, sea);
  for (let y = 0; y < 3000; y += 35) {
    c.strokeStyle = '#d1fff02b';
    c.beginPath();
    c.moveTo(3000, y);
    c.bezierCurveTo(3060, y + 35, 3100, y - 20, 3190, y + 10);
    c.stroke();
  }
  for (let i = 0; i < 18000; i++) {
    const x = rand() * 3600,
      y = rand() * 3000;
    rect(x, y, 1 + rand() * 2, 1, '#ffffff0b');
  }
  for (const x of WORLD.roadsX) {
    rect(x - 77, 0, 154, 3000, '#b1b7b5');
    rect(x - 58, 0, 116, 3000, '#354451');
    rect(x - 61, 0, 3, 3000, '#e4d2b9');
    rect(x + 58, 0, 3, 3000, '#e4d2b9');
  }
  for (const y of WORLD.roadsY) {
    rect(0, y - 77, 2800, 154, '#b1b7b5');
    rect(0, y - 58, 2800, 116, '#354451');
    rect(0, y - 61, 2800, 3, '#e4d2b9');
    rect(0, y + 58, 2800, 3, '#e4d2b9');
  }
  c.strokeStyle = '#dac595';
  c.lineWidth = 2;
  c.setLineDash([22, 20]);
  for (const x of WORLD.roadsX) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 3000);
    c.stroke();
  }
  for (const y of WORLD.roadsY) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(2800, y);
    c.stroke();
  }
  c.setLineDash([]);
  for (const x of WORLD.roadsX) for (const y of WORLD.roadsY) {
    rect(x - 58, y - 58, 116, 116, '#354451');
    for (let i = -44; i < 50; i += 13) {
      rect(x + i, y - 72, 7, 22, '#d9d8cc');
      rect(x + i, y + 50, 7, 22, '#d9d8cc');
      rect(x - 72, y + i, 22, 7, '#d9d8cc');
      rect(x + 50, y + i, 22, 7, '#d9d8cc');
    }
  }
  for (const p of parks) {
    rect(p.x, p.y, p.w, p.h, '#518d76');
    rect(p.x + 145, p.y, 20, p.h, '#d6c3a2');
    rect(p.x, p.y + 145, p.w, 20, '#d6c3a2');
    for (let i = 0; i < 16; i++) palms.push({
      x: p.x + 25 + rand() * 260,
      y: p.y + 25 + rand() * 260
    });
    c.fillStyle = '#adc9be';
    c.beginPath();
    c.arc(p.x + 155, p.y + 155, 42, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#65bfc6';
    c.beginPath();
    c.arc(p.x + 155, p.y + 155, 33, 0, Math.PI * 2);
    c.fill();
  }
  for (const b of buildings) {
    rect(b.x + 13, b.y + 18, b.w + 7, b.h + 7, '#172e3d44');
    rect(b.x - 4, b.y - 4, b.w + 8, b.h + 8, '#e0cdbd');
    rect(b.x, b.y, b.w, b.h, b.color);
    rect(b.x + 8, b.y + 8, b.w - 16, b.h - 16, '#ffffff14');
    rect(b.x, b.y + b.h - 8, b.w, 8, '#00000028');
    for (let x = b.x + 12; x < b.x + b.w - 10; x += 20) {
      rect(x, b.y + 3, 11, 5, '#d9efdf');
      rect(x, b.y + b.h - 6, 11, 4, '#405364');
    }
    for (let i = 0; i < 3; i++) {
      rect(b.x + 20 + i * 25, b.y + 32, 18, 25, '#6d7e88');
      rect(b.x + 22 + i * 25, b.y + 34, 14, 3, '#bac5c0');
    }
    rect(b.x + b.w - 34, b.y + 70, 22, 30, '#6a7685');
    c.strokeStyle = '#ffffff40';
    c.strokeRect(b.x + 12, b.y + 15, b.w - 24, b.h - 30);
    if (b.floors > 5) {
      rect(b.x + 38, b.y + 65, 45, 35, '#687b91');
      rect(b.x + 42, b.y + 69, 37, 27, '#80b2bb');
    }
    c.font = 'bold 10px Arial';
    c.textAlign = 'center';
    c.fillStyle = '#292c46';
    c.fillRect(b.x + 12, b.y + b.h - 20, b.w - 24, 16);
    c.fillStyle = b.floors % 2 ? '#ff9ac7' : '#9ef4e7';
    c.fillText(b.sign, b.x + b.w / 2, b.y + b.h - 8);
  }
  // Beach umbrellas, towels and boardwalk give the coastline a distinct silhouette.
  rect(2790, 0, 22, 3000, '#b9957d');
  for (let y = 0; y < 3000; y += 10) rect(2790, y, 22, 1, '#846f6255');
  for (let y = 320; y < 2850; y += 190) {
    for (let i = 0; i < 2; i++) {
      let x = 2890 + i * 67;
      c.fillStyle = i ? '#ee88af' : '#6fc5c0';
      c.beginPath();
      c.arc(x, y, 22, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#f4e7d0';
      for (let a = 0; a < 6; a++) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(a * Math.PI / 3) * 22, y + Math.sin(a * Math.PI / 3) * 22);
        c.stroke();
      }
      rect(x - 10, y + 31, 20, 36, '#f3dfc6');
    }
  }
  // Parking bays on the north and south edges.
  for (let x = 300; x < 2600; x += 95) {
    rect(x, 2785, 65, 100, '#667078');
    c.strokeStyle = '#e3d9b0';
    c.strokeRect(x + 5, 2790, 55, 88);
  }
  for (const p of palms) drawPalm(c, p.x, p.y);
  for (const l of lamps) {
    rect(l.x, l.y, 3, 23, '#5b6267');
    rect(l.x - 6, l.y, 13, 5, '#f9e6b8');
  }
  c.save();
  c.globalAlpha = .3;
  c.fillStyle = '#edf0df';
  c.font = 'bold 17px Arial';
  c.textAlign = 'center';
  for (let i = 0; i < 5; i++) c.fillText(['WASHINGTON AVE', 'LITTLE HAVANA', 'DOWNTOWN', 'STARFISH AVE', 'OCEAN DRIVE'][i], 1400, WORLD.roadsY[i] + 8);
  c.restore();
  return {
    map,
    buildings,
    parks,
    palms,
    lamps
  };
}
export function drawPalm(c, x, y) {
  c.save();
  c.translate(x, y);
  c.fillStyle = '#163d3830';
  c.beginPath();
  c.ellipse(12, 16, 28, 16, .5, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#83644c';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(5, 10);
  c.lineTo(0, 0);
  c.stroke();
  for (let a = 0; a < 7; a++) {
    c.rotate(Math.PI * 2 / 7);
    c.fillStyle = a % 2 ? '#286b58' : '#3f8768';
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(13, -17, 33, -4);
    c.quadraticCurveTo(15, -4, 0, 0);
    c.fill();
  }
  c.restore();
}
export function blocked(world, x, y, r = 10) {
  if (x < r || y < r || x > WORLD.coast - r || y > WORLD.height - r) return true;
  return world.buildings.some(b => x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h);
}
export function moveBody(world, body, dx, dy, r) {
  let hit = false;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
  for (let i = 0; i < steps; i++) {
    if (!blocked(world, body.x + dx / steps, body.y, r)) body.x += dx / steps;else hit = true;
    if (!blocked(world, body.x, body.y + dy / steps, r)) body.y += dy / steps;else hit = true;
  }
  return hit;
}
export function lineClear(world, a, b) {
  const d = distance(a, b);
  for (let t = 0; t < d; t += 25) {
    if (blocked(world, a.x + (b.x - a.x) * t / d, a.y + (b.y - a.y) * t / d, 1)) return false;
  }
  return true;
}
