import { Game } from './game.js';
const $ = id => document.getElementById(id);
const images = ['loadscreen.jpg', 'loadscreen1.jpg', 'loadscreen2.jpg', 'loadscreen3.jpg', 'loadscreen4.jpg'];
const titles = ['PARTNERS IN CRIME', 'THE LONG WAY HOME', 'SUNSHINE STATE OF MIND', 'AFTER HOURS', 'WELCOME TO PARADISE'];
const gallery = $('gallery-grid');
images.forEach((src, i) => {
  const b = document.createElement('button');
  b.className = 'reveal';
  b.setAttribute('aria-label', 'View ' + titles[i]);
  b.innerHTML = `<img src="${src}" alt="${titles[i]}" loading="lazy"><span>0${i + 1} / ${titles[i]} ↗</span>`;
  b.onclick = () => {
    $('lightbox-image').src = src;
    $('lightbox').showModal();
  };
  gallery.append(b);
});
$('close-lightbox').onclick = () => $('lightbox').close();
$('lightbox').onclick = e => {
  if (e.target === $('lightbox')) $('lightbox').close();
};
const observer = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) {
    e.target.classList.add('visible');
    observer.unobserve(e.target);
  }
}), {
  threshold: .08
});
document.querySelectorAll('.reveal').forEach(e => observer.observe(e));
window.addEventListener('scroll', () => $('nav').classList.toggle('scrolled', scrollY > 40), {
  passive: true
});
let loading = false,
  token = 0,
  loadFrame = 0;
const game = new Game(exit);
function exit() {
  token++;
  cancelAnimationFrame(loadFrame);
  loading = false;
  $('loading').hidden = true;
  $('game').hidden = true;
  $('website').inert = false;
  document.body.classList.remove('in-game');
  window.scrollTo({
    top: 0,
    behavior: 'instant'
  });
  document.querySelector('[data-play]').focus();
}
function preload(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error(`Timed out: ${src}`)), 15000);
    img.onload = () => {
      clearTimeout(timer);
      if (img.decode) img.decode().then(resolve, reject);else resolve();
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Missing image: ${src}`));
    };
    img.src = src;
  });
}
const states = ['INITIALIZING GAME ENGINE...', 'LOADING LEONIDA...', 'GENERATING CITY...', 'SPAWNING VEHICLES...', 'LOADING CHARACTERS...', 'PREPARING GAME WORLD...', 'WELCOME TO VICE CITY'];
const tips = ['WASD to move. Hold SHIFT to run.', 'Approach a car and press E. W accelerates, S brakes or reverses.', 'Mouse to aim. Left click to fire. R to reload. 1 / 2 switches weapons.', 'Break line of sight and keep your distance to lose the police.', 'Follow the pink marker. The green clinic restores health and ammunition.'];
async function launch() {
  if (loading || game.running) return;
  loading = true;
  const myToken = ++token;
  document.body.classList.add('in-game');
  $('website').inert = true;
  $('loading').style.opacity = '1';
  $('loading').hidden = false;
  $('load-error').hidden = true;
  $('load-percent').textContent = '0%';
  $('progress').value = 0;
  $('load-status').textContent = states[0];
  $('loading-art').replaceChildren(...images.map((src, i) => {
    const img = new Image();
    img.src = src;
    img.alt = '';
    img.className = i === 0 ? 'active' : '';
    return img;
  }));
  $('cancel-loading').focus();
  let ready = false,
    failed = false;
  const start = performance.now();
  Promise.all([...images, 'label.png', 'logo.png', 'rockstar_logo1.png'].map(preload)).then(() => myToken === token ? game.prepare() : undefined).then(() => {
    ready = true;
  }).catch(err => {
    if (myToken !== token) return;
    failed = true;
    $('load-error').hidden = false;
    $('load-error').textContent = `Unable to load the game. ${err.message}. Check the files, return to the website and try again.`;
    $('load-status').textContent = 'RESOURCE ERROR';
  });
  function tick(now) {
    if (myToken !== token || failed) return;
    const elapsed = now - start;
    const slide = Math.min(4, Math.floor(elapsed / 2200) % 5);
    [...$('loading-art').children].forEach((img, i) => img.classList.toggle('active', i === slide));
    $('load-tip').textContent = tips[slide];
    const points = [[0, 0], [1200, 24], [2700, 42], [3300, 42], [5200, 65], [6500, 73], [7100, 73], [9000, 91], [11000, 100]];
    let percent = 100;
    for (let i = 1; i < points.length; i++) if (elapsed < points[i][0]) {
      const [t0, p0] = points[i - 1],
        [t1, p1] = points[i];
      percent = p0 + (p1 - p0) * (elapsed - t0) / (t1 - t0);
      break;
    }
    percent = Math.min(ready ? 100 : 96, Math.floor(percent));
    $('progress').value = percent;
    $('load-percent').textContent = percent + '%';
    $('load-status').textContent = states[Math.min(6, Math.floor(percent / 16))];
    if (percent === 100 && elapsed > 11600) {
      $('game').hidden = false;
      game.start();
      $('loading').style.opacity = '0';
      setTimeout(() => {
        if (myToken === token) {
          $('loading').hidden = true;
          loading = false;
        }
      }, 650);
      return;
    }
    loadFrame = requestAnimationFrame(tick);
  }
  loadFrame = requestAnimationFrame(tick);
}
document.querySelectorAll('[data-play]').forEach(b => b.onclick = launch);
$('cancel-loading').onclick = exit;
