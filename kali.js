(() => {
  'use strict';

  const LIMIT_MS = 5 * 60 * 1000;
  const KEY = 'sp-kali-session';
  const HOME = '/home/kali';
  const FLAG = 'FLAG{mittapalli_pradeep}';
  const FLAG_RE = /FLAG\{[^}\n]+\}/g;

  /* ---------- Virtual machine files ---------- */
  const files = {};
  files[HOME + '/notes.txt'] = 'Nothing useful in the home folder. The hints are in the hints folder.';
  files[HOME + '/hints/01-start.txt'] =
    'Target: the owner of this portfolio. One of his details is hidden inside a flag.\n' +
    'A flag looks like FLAG{...}. You have 5 minutes.';
  files[HOME + '/hints/02-hidden.txt'] =
    'Plain ls skips files that start with a dot.\n' +
    'Try ls -a to see everything in a folder.';
  files[HOME + '/hints/03-decode.txt'] =
    'Loot is often encoded, not locked.\n' +
    'base64 -d FILE turns encoded text back into plain text.';
  files[HOME + '/hints/04-submit.txt'] =
    'The flag is a detail about the owner.\n' +
    'Copy the flag once you capture it, then paste it on the portfolio.';
  files[HOME + '/.loot/campus.enc'] = btoa(FLAG);

  /* ---------- Elements ---------- */
  const out = document.getElementById('out');
  const input = document.getElementById('cmd');
  const topPrompt = document.getElementById('prompt-top');
  const timerEl = document.getElementById('timer');
  const barEl = document.getElementById('timer-bar');
  const resultEl = document.getElementById('result');
  const resultKicker = document.getElementById('result-kicker');
  const resultTitle = document.getElementById('result-title');
  const resultText = document.getElementById('result-text');
  const flagCode = document.getElementById('flag-code');
  const copyBtn = document.getElementById('kali-copy');
  const retryBtn = document.getElementById('kali-retry');

  /* ---------- Session (per tab, so reloading does not give a new 5 minutes) ---------- */
  const readSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY)) || null;
    } catch (err) {
      return null;
    }
  };

  const writeSession = (data) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(data));
    } catch (err) {
      /* storage blocked: the timer then lasts only for this page */
    }
  };

  const newSession = () => {
    const data = { status: 'playing', deadline: Date.now() + LIMIT_MS };
    writeSession(data);
    return data;
  };

  let session = readSession();
  if (!session || typeof session.deadline !== 'number') session = newSession();
  if (session.status === 'playing' && Date.now() >= session.deadline) {
    session = { status: 'lost', deadline: session.deadline };
    writeSession(session);
  }
  let status = session.status;

  const state = { cwd: HOME, history: [], hIdx: 0 };

  /* ---------- File helpers ---------- */
  const normalise = (path) => {
    const parts = [];
    path.split('/').forEach((part) => {
      if (!part || part === '.') return;
      if (part === '..') parts.pop();
      else parts.push(part);
    });
    return '/' + parts.join('/');
  };

  const resolvePath = (name) => {
    if (!name || name === '~') return HOME;
    if (name.startsWith('~/')) return normalise(HOME + name.slice(1));
    if (name.startsWith('/')) return normalise(name);
    return normalise(state.cwd + '/' + name);
  };

  const isDir = (dir) => {
    if (dir === '/') return true;
    const prefix = dir + '/';
    return Object.keys(files).some((path) => path.startsWith(prefix));
  };

  const listDir = (dir, showAll) => {
    const prefix = dir === '/' ? '/' : dir + '/';
    const names = new Set();
    Object.keys(files).forEach((path) => {
      if (!path.startsWith(prefix)) return;
      const rest = path.slice(prefix.length).split('/');
      names.add(rest.length > 1 ? rest[0] + '/' : rest[0]);
    });
    const list = [...names].filter((n) => showAll || !n.startsWith('.')).sort();
    return showAll ? ['.', '..', ...list] : list;
  };

  /* ---------- Commands ---------- */
  const commands = {
    help: () => [
      'Commands:',
      '  help             show this list',
      '  ls [-a] [DIR]    list files, -a also shows hidden ones',
      '  cat FILE         print a file',
      '  base64 -d FILE   decode a file',
      '  cd DIR           change folder',
      '  pwd, whoami      where am I, who am I',
      '  uname -a         system info',
      '  echo TEXT        print text',
      '  hint             where to find the hints',
      '  clear            clear the screen',
      '  exit             leave the machine',
    ],
    hint: () => ['The hints are in ~/hints. Run: ls hints, then cat hints/01-start.txt'],
    whoami: () => ['kali'],
    pwd: () => [state.cwd],
    uname: () => ['Linux portfolio 6.8.0-kali x86_64 GNU/Linux'],
    echo: (args) => [args.join(' ')],
    sudo: () => ['kali is not in the sudoers file. This incident will be reported.'],
    cd: (args) => {
      const target = args[0] ? resolvePath(args[0]) : HOME;
      if (!isDir(target)) return ['cd: no such directory: ' + (args[0] || '~')];
      state.cwd = target;
      return [];
    },
    ls: (args) => {
      const showAll = args.some((a) => a.startsWith('-') && a.includes('a'));
      const dirArg = args.find((a) => !a.startsWith('-'));
      const target = dirArg ? resolvePath(dirArg) : state.cwd;
      if (!isDir(target)) return ["ls: cannot access '" + dirArg + "': No such file or directory"];
      return [listDir(target, showAll).join('  ') || '(empty)'];
    },
    cat: (args) => {
      if (!args.length) return ['cat: missing file operand'];
      const content = files[resolvePath(args[0])];
      if (content === undefined) return ['cat: ' + args[0] + ': No such file or directory'];
      return content.split('\n');
    },
    base64: (args) => {
      if (args[0] !== '-d' && args[0] !== '--decode') return ['usage: base64 -d FILE'];
      if (!args[1]) return ['base64: missing file operand'];
      const content = files[resolvePath(args[1])];
      if (content === undefined) return ['base64: ' + args[1] + ': No such file or directory'];
      try {
        const bytes = Uint8Array.from(atob(content.trim()), (c) => c.charCodeAt(0));
        return new TextDecoder().decode(bytes).split('\n');
      } catch (err) {
        return ['base64: invalid input'];
      }
    },
  };

  const runLine = (line) => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0];
    if (!cmd) return [];
    if (!Object.prototype.hasOwnProperty.call(commands, cmd)) {
      return ['bash: ' + cmd + ': command not found'];
    }
    return commands[cmd](parts.slice(1));
  };

  /* ---------- Output ---------- */
  const promptTop = () => {
    const shown = state.cwd === HOME ? '~' : state.cwd.replace(HOME, '~');
    return '┌──(kali㉿portfolio)-[' + shown + ']';
  };

  const addLine = (text, cls) => {
    const el = document.createElement('div');
    el.className = 'term-line' + (cls ? ' ' + cls : '');
    el.textContent = text === '' ? ' ' : text;
    out.appendChild(el);
    out.scrollTop = out.scrollHeight;
  };

  const intro = () => {
    addLine('Kali machine  //  target: this portfolio');
    addLine('Find the flag hidden in this machine. Format: FLAG{...}');
    addLine('You have 5 minutes. The hints are in the hints folder. Type help.');
    addLine('');
  };

  /* ---------- Timer ---------- */
  const fmt = (ms) => {
    const total = Math.ceil(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return m + ':' + s;
  };

  const renderTimer = () => {
    if (status !== 'playing') return;
    const left = Math.max(0, session.deadline - Date.now());
    timerEl.textContent = fmt(left);
    barEl.style.width = ((left / LIMIT_MS) * 100).toFixed(2) + '%';
    if (left === 0) finish('lost');
  };

  /* ---------- Result panel ---------- */
  const showResult = (kind) => {
    const won = kind === 'won';
    resultKicker.textContent = won ? 'Winner' : 'Loser';
    resultTitle.textContent = won ? 'Oh not! You have caught me' : "Time's up";
    resultText.textContent = won
      ? 'You captured the flag. Copy it, then paste it on the portfolio to reveal the phone number.'
      : 'You did not capture the flag within 5 minutes.';
    flagCode.textContent = FLAG;
    flagCode.hidden = !won;
    copyBtn.hidden = !won;
    retryBtn.hidden = won;
    resultEl.hidden = false;
  };

  const finish = (kind) => {
    if (status !== 'playing') return;
    status = kind;
    session = { status: kind, deadline: session.deadline };
    writeSession(session);
    input.disabled = true;
    if (kind === 'won') {
      addLine('[+] flag captured. You are the winner.', 'ok');
    } else {
      timerEl.textContent = '00:00';
      barEl.style.width = '0%';
      addLine('[-] time is up. You lost.', 'bad');
    }
    showResult(kind);
  };

  /* ---------- Flag detection: checked against the hash in challenge.js ---------- */
  const scanForFlag = (lines) => {
    if (status !== 'playing') return;
    const matches = lines.join('\n').match(FLAG_RE) || [];
    matches.forEach(async (candidate) => {
      if (status !== 'playing' || !window.Challenge) return;
      if (await window.Challenge.verify(candidate)) finish('won');
    });
  };

  /* ---------- Input ---------- */
  const onKey = (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const last = state.history.length;
      if (event.key === 'ArrowUp' && state.hIdx > 0) state.hIdx--;
      if (event.key === 'ArrowDown') state.hIdx = Math.min(last, state.hIdx + 1);
      input.value = state.hIdx < last ? state.history[state.hIdx] : '';
      return;
    }
    if (event.key !== 'Enter') return;

    const value = input.value;
    input.value = '';
    const command = value.trim();
    addLine(promptTop(), 'term-top');
    addLine('└─$ ' + value, 'term-echo');

    if (command) state.history.push(command);
    state.hIdx = state.history.length;

    const name = command.split(/\s+/)[0];
    if (name === 'clear') {
      out.textContent = '';
    } else if (name === 'exit') {
      window.location.href = 'index.html#contact';
      return;
    } else {
      const lines = runLine(command);
      lines.forEach((line) => addLine(line));
      scanForFlag(lines);
    }
    topPrompt.textContent = promptTop();
  };

  input.addEventListener('keydown', onKey);

  /* ---------- Copy the flag ---------- */
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

  const copyText = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    return fallbackCopy(text);
  };

  const copyLabel = copyBtn.textContent;
  let copyTimer = null;
  copyBtn.addEventListener('click', () => {
    copyText(FLAG).then(
      () => flashCopy('Copied', true),
      () => flashCopy('Copy failed', false)
    );
  });

  const flashCopy = (label, ok) => {
    copyBtn.textContent = label;
    copyBtn.classList.toggle('is-copied', ok);
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyBtn.textContent = copyLabel;
      copyBtn.classList.remove('is-copied');
    }, 1800);
  };

  /* ---------- Try again (after a loss) ---------- */
  retryBtn.addEventListener('click', () => {
    session = newSession();
    status = 'playing';
    state.cwd = HOME;
    state.history = [];
    state.hIdx = 0;
    out.textContent = '';
    topPrompt.textContent = promptTop();
    resultEl.hidden = true;
    input.disabled = false;
    intro();
    renderTimer();
    input.focus();
  });

  /* ---------- Start ---------- */
  topPrompt.textContent = promptTop();
  intro();
  setInterval(renderTimer, 250);
  renderTimer();
  if (status === 'playing') {
    input.focus();
  } else {
    input.disabled = true;
    timerEl.textContent = status === 'won' ? 'captured' : '00:00';
    if (status === 'lost') barEl.style.width = '0%';
    showResult(status);
  }
})();
