(() => {
  'use strict';

  const root = document.documentElement;
  const el = document.getElementById('preloader');
  if (!el) return;

  /* If motion is off, the intro is skipped and the page opens at once */
  if (!root.classList.contains('is-preloading')) {
    el.remove();
    window.dispatchEvent(new Event('site:ready'));
    return;
  }

  const tilesWrap = el.querySelector('.pl-tiles');
  const deadWrap = el.querySelector('.pl-dead');
  const hexWrap = el.querySelector('.pl-hex');
  const cracksSvg = el.querySelector('.pl-cracks');
  const logEl = el.querySelector('.pl-log');
  const barFill = el.querySelector('.pl-bar span');
  const skipBtn = el.querySelector('.pl-skip');

  const COLS = 12;
  const ROWS = 7;
  const NS = 'http://www.w3.org/2000/svg';

  let done = false;
  let hexTimer = null;
  const pending = new Set();

  const rand = (min, max) => min + Math.random() * (max - min);

  /* Pause that ends early once the intro is finished */
  const wait = (ms) =>
    new Promise((resolve) => {
      if (done) {
        resolve();
        return;
      }
      const entry = { timer: null, resolve };
      entry.timer = setTimeout(() => {
        pending.delete(entry);
        resolve();
      }, ms);
      pending.add(entry);
    });

  /* ---------- Damaged screen: tiles of static ---------- */
  const tiles = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const tile = document.createElement('i');
    tile.className = 'pl-tile';
    tilesWrap.appendChild(tile);
    tiles.push(tile);
  }

  /* ---------- Dead pixels ---------- */
  const dotColours = ['#ff5c5c', '#5cff9d', '#5cc8ff', '#ffffff'];
  for (let i = 0; i < 70; i++) {
    const dot = document.createElement('span');
    dot.style.left = (Math.random() * 100).toFixed(2) + '%';
    dot.style.top = (Math.random() * 100).toFixed(2) + '%';
    dot.style.setProperty('--c', dotColours[i % dotColours.length]);
    dot.style.animationDelay = (-Math.random() * 2.4).toFixed(2) + 's';
    deadWrap.appendChild(dot);
  }

  /* ---------- Cracks: rays, branches and rings from one impact point ---------- */
  const toPath = (points) =>
    points.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

  const addCrack = (d, delay, width) => {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('pathLength', '1');
    path.setAttribute('class', 'crack');
    path.setAttribute('stroke-width', width.toFixed(2));
    path.style.setProperty('--d', delay.toFixed(2) + 's');
    cracksSvg.appendChild(path);
  };

  const IX = 380;
  const IY = 260;
  const RAYS = 16;

  for (let i = 0; i < RAYS; i++) {
    const base = (i / RAYS) * Math.PI * 2 + rand(-0.12, 0.12);
    const length = rand(260, 640);
    const steps = 7;
    const points = [[IX, IY]];
    for (let s = 1; s <= steps; s++) {
      const r = (length * s) / steps;
      const a = base + rand(-0.09, 0.09);
      points.push([IX + Math.cos(a) * r, IY + Math.sin(a) * r]);
    }
    addCrack(toPath(points), i * 0.04, rand(1.2, 2.2));

    if (Math.random() < 0.6) {
      const [bx, by] = points[3];
      const ba = base + (Math.random() < 0.5 ? -0.5 : 0.5) + rand(-0.1, 0.1);
      const blen = length * rand(0.2, 0.35);
      const branch = [
        [bx, by],
        [bx + Math.cos(ba) * blen * 0.5, by + Math.sin(ba) * blen * 0.5],
        [bx + Math.cos(ba) * blen, by + Math.sin(ba) * blen],
      ];
      addCrack(toPath(branch), 0.3 + i * 0.04, rand(0.8, 1.4));
    }
  }

  [70, 140, 230].forEach((radius, idx) => {
    const start = rand(0, Math.PI * 2);
    const span = rand(2.2, 3.8);
    const pts = [];
    for (let k = 0; k <= 18; k++) {
      const a = start + (span * k) / 18;
      const r = radius + rand(-6, 6);
      pts.push([IX + Math.cos(a) * r, IY + Math.sin(a) * r]);
    }
    addCrack(toPath(pts), 0.3 + idx * 0.25, 1);
  });

  addCrack(`M${IX - 14} ${IY} L${IX + 14} ${IY} M${IX} ${IY - 14} L${IX} ${IY + 14}`, 0, 2);

  /* ---------- Hex readout during the repair ---------- */
  const hexLine = () => {
    let s = '';
    for (let i = 0; i < 36; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s.replace(/(.{4})/g, '$1 ');
  };

  const startHex = () => {
    hexTimer = setInterval(() => {
      hexWrap.textContent = Array.from({ length: 12 }, () => hexLine()).join('\n');
    }, 90);
  };

  const stopHex = () => {
    clearInterval(hexTimer);
    hexWrap.textContent = '';
  };

  /* ---------- Terminal log ---------- */
  const typeLine = async (tag, text) => {
    const p = document.createElement('p');
    const tagEl = document.createElement('span');
    tagEl.className = 'tag';
    tagEl.textContent = tag + ' ';
    const msg = document.createElement('span');
    p.append(tagEl, msg);
    logEl.appendChild(p);

    for (let i = 1; i <= text.length; i++) {
      msg.textContent = text.slice(0, i);
      if (done) break;
      await wait(14);
    }
    msg.textContent = text;
  };

  /* ---------- Repair: tiles are fixed in random order, two at a time ---------- */
  const repairTiles = async () => {
    const order = tiles.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    const batch = 2;
    for (let n = 0; n < order.length; n += batch) {
      const end = Math.min(n + batch, order.length);
      for (let k = n; k < end; k++) {
        const tile = tiles[order[k]];
        tile.classList.add('is-flash');
        setTimeout(() => {
          tile.classList.remove('is-flash');
          tile.classList.add('is-fixed');
        }, 60);
      }
      barFill.style.width = ((end / order.length) * 100).toFixed(1) + '%';
      await wait(46);
    }
  };

  /* ---------- Sequence ---------- */
  const run = async () => {
    await wait(140);
    el.classList.add('is-boot');

    await wait(1000);
    el.classList.add('is-crack');

    await typeLine('[sys]', 'display panel detected');
    await typeLine('[fault]', '412 dead pixel clusters, glass fracture at impact point');
    await typeLine('[scan]', 'reading frame buffer');

    el.classList.add('is-repair');
    startHex();
    await typeLine('[sys]', 'bypassing panel lock');
    await repairTiles();
    stopHex();
    el.classList.remove('is-repair');
    el.classList.add('is-healed');

    await typeLine('[ok]', `display restored, ${tiles.length} of ${tiles.length} tiles`);
    await typeLine('[ok]', 'welcome, Pradeep');
    await wait(450);
    finish();
  };

  /* ---------- Finish: 3D exit, then the site opens ---------- */
  const finish = () => {
    if (done) return;
    done = true;

    pending.forEach((entry) => {
      clearTimeout(entry.timer);
      entry.resolve();
    });
    pending.clear();

    stopHex();
    tiles.forEach((tile) => {
      tile.classList.remove('is-flash');
      tile.classList.add('is-fixed');
    });
    barFill.style.width = '100%';
    el.classList.remove('is-repair');
    el.classList.add('is-healed', 'is-exit');

    el.style.transition = 'opacity 0.5s ease 0.45s';
    el.style.opacity = '0';

    setTimeout(() => {
      root.classList.remove('is-preloading');
      el.remove();
      window.dispatchEvent(new Event('site:ready'));
    }, 950);
  };

  skipBtn.addEventListener('click', finish);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') finish();
  });

  run();
})();
