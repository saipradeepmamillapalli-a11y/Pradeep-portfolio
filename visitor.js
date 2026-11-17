(() => {
  'use strict';

  const root = document.documentElement;

  /* ---------- Calm mode: no motion, no cursor, no glitch (remembered per visitor) ---------- */
  const CALM_KEY = 'sp-calm';
  const calmBtn = document.getElementById('calm-toggle');

  const setCalm = (on) => {
    root.classList.toggle('calm', on);
    if (calmBtn) calmBtn.setAttribute('aria-pressed', String(on));
    try {
      localStorage.setItem(CALM_KEY, on ? '1' : '0');
    } catch (err) {
      /* storage blocked: calm mode lasts for this visit */
    }
  };

  let saved = null;
  try {
    saved = localStorage.getItem(CALM_KEY);
  } catch (err) {
    saved = null;
  }
  setCalm(saved === '1');

  if (calmBtn) {
    calmBtn.addEventListener('click', () => setCalm(!root.classList.contains('calm')));
  }

  /* ---------- Copy a short summary for recruiters (no hidden details) ---------- */
  const summaryBtn = document.querySelector('.summary-btn');
  if (!summaryBtn) return;

  const fallbackCopy = (text) => {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    field.remove();
    return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  };

  const copy = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    return fallbackCopy(text);
  };

  const label = summaryBtn.textContent;
  let timer = null;
  const flash = (text) => {
    summaryBtn.textContent = text;
    clearTimeout(timer);
    timer = setTimeout(() => {
      summaryBtn.textContent = label;
    }, 1800);
  };

  const summary = () => {
    const resume = new URL('resume.pdf', window.location.href).href;
    return [
      'Mamillapalli Sai Pradeep',
      'B.Tech Computer Science and Engineering, Sri Mittapalli College of Engineering, Guntur (expected 2027)',
      'Focus: Python development, full-stack web development and databases',
      'Experience: 2 internships at SL Tech Solutions (full-stack Python and full-stack development)',
      'Certifications: HackerRank Python (Basic), HackerRank SQL (Basic), AIMERS AI and ML workshop',
      'Email: saipradeepmamillapalli@gmail.com',
      'Location: Guntur, Andhra Pradesh, India',
      'Resume: ' + resume,
    ].join('\n');
  };

  summaryBtn.addEventListener('click', () => {
    copy(summary()).then(
      () => flash('Summary copied'),
      () => flash('Copy failed')
    );
  });
})();
