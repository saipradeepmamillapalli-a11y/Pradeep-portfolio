(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Colour themes (remembered per visitor) ---------- */
  const THEME_KEY = 'sp-accent';
  const themes = ['blue', 'green', 'amber'];

  const setTheme = (name) => {
    if (!themes.includes(name)) name = 'blue';
    root.setAttribute('data-accent', name);
    document.querySelectorAll('.theme-dot').forEach((dot) => {
      dot.setAttribute('aria-pressed', String(dot.dataset.accent === name));
    });
    try {
      localStorage.setItem(THEME_KEY, name);
    } catch (err) {
      /* storage blocked: the choice lasts for this visit only */
    }
  };

  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (err) {
    saved = null;
  }
  setTheme(saved || 'blue');

  document.querySelectorAll('.theme-dot').forEach((dot) => {
    dot.addEventListener('click', () => setTheme(dot.dataset.accent));
  });

  /* ---------- Scan line when the visible section changes ---------- */
  const sweep = document.querySelector('.scan-sweep');
  const sideNav = document.querySelector('.side-nav');

  if (sweep && sideNav && !reduceMotion) {
    let current = null;

    const play = () => {
      sweep.classList.remove('is-sweeping');
      void sweep.offsetWidth; // restart the animation
      sweep.classList.add('is-sweeping');
    };

    const observer = new MutationObserver(() => {
      const active = sideNav.querySelector('a.active');
      const id = active ? active.dataset.nav : null;
      if (id && id !== current) {
        if (current !== null) play();
        current = id;
      }
    });
    observer.observe(sideNav, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- Command palette: press / or Ctrl+K ---------- */
  const sections = [
    ['Home', 'home'],
    ['About', 'about'],
    ['Experience', 'experience'],
    ['Projects', 'projects'],
    ['Highlights', 'highlights'],
    ['Certificates', 'certificates'],
    ['Skills', 'skills'],
    ['Contact', 'contact'],
    ['Challenge', 'challenge'],
  ].map(([label, id]) => ({
    label,
    hint: 'section',
    run: () => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    },
  }));

  const actions = [
    {
      label: 'Copy email',
      hint: 'action',
      run: () => {
        const button = document.querySelector('.copy-btn[data-copy*="@"]');
        if (button) button.click();
      },
    },
    {
      label: 'Download resume',
      hint: 'action',
      run: () => {
        const link = document.querySelector('a[download][href="resume.pdf"]');
        if (link) link.click();
      },
    },
    {
      label: 'Open the Kali machine',
      hint: 'challenge',
      run: () => {
        window.location.href = 'kali.html';
      },
    },
    {
      label: 'Back to top',
      hint: 'action',
      run: () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }),
    },
    ...themes.map((t) => ({
      label: 'Colour: ' + t,
      hint: 'theme',
      run: () => setTheme(t),
    })),
  ];

  const items = [...sections, ...actions];

  const pal = document.createElement('div');
  pal.className = 'pal';
  pal.hidden = true;
  pal.innerHTML =
    '<div class="pal-box" role="dialog" aria-modal="true" aria-label="Search the site">' +
      '<input class="pal-input" type="text" placeholder="Type a section or action" aria-label="Search the site" autocomplete="off" spellcheck="false" />' +
      '<ul class="pal-list" role="listbox"></ul>' +
      '<p class="pal-foot">Arrow keys to move, Enter to run, Esc to close</p>' +
    '</div>';
  document.body.appendChild(pal);

  const input = pal.querySelector('.pal-input');
  const list = pal.querySelector('.pal-list');
  let shown = [];
  let index = 0;
  let lastFocus = null;

  const render = () => {
    const q = input.value.trim().toLowerCase();
    shown = items.filter((item) => item.label.toLowerCase().includes(q));
    index = 0;
    list.textContent = '';

    if (!shown.length) {
      const empty = document.createElement('li');
      empty.className = 'pal-empty';
      empty.textContent = 'Nothing matches that';
      list.appendChild(empty);
      return;
    }

    shown.forEach((item, i) => {
      const row = document.createElement('li');
      row.className = 'pal-item' + (i === 0 ? ' is-active' : '');
      row.setAttribute('role', 'option');

      const label = document.createElement('span');
      label.textContent = item.label;
      const hint = document.createElement('span');
      hint.className = 'pal-hint';
      hint.textContent = item.hint;

      row.append(label, hint);
      row.addEventListener('click', () => runItem(i));
      list.appendChild(row);
    });
  };

  const setIndex = (next) => {
    const rows = list.querySelectorAll('.pal-item');
    if (!rows.length) return;
    index = (next + rows.length) % rows.length;
    rows.forEach((row, n) => row.classList.toggle('is-active', n === index));
    rows[index].scrollIntoView({ block: 'nearest' });
  };

  const openPal = () => {
    lastFocus = document.activeElement;
    pal.hidden = false;
    input.value = '';
    render();
    input.focus();
  };

  const closePal = () => {
    pal.hidden = true;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  };

  const runItem = (i) => {
    const item = shown[i];
    if (!item) return;
    closePal();
    item.run();
  };

  input.addEventListener('input', render);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIndex(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIndex(index - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runItem(index);
    }
  });

  pal.addEventListener('click', (event) => {
    if (event.target === pal) closePal();
  });

  document.addEventListener('keydown', (event) => {
    if (!pal.hidden) {
      if (event.key === 'Escape') closePal();
      return;
    }
    if (root.classList.contains('is-preloading')) return;

    const target = event.target;
    const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    const ctrlK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    const slash = !typing && event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey;

    if (ctrlK || slash) {
      event.preventDefault();
      openPal();
    }
  });
})();
