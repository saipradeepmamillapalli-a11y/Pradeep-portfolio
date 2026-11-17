(() => {
  'use strict';

  /* SHA-256 of the normalised flag. The flag text itself is not stored here. */
  const FLAG_HASH = 'e7f554cff359a8e4e3cbee85e7ec882eecb87c6495e03cdd0cd1f69c2cca33d8';

  /* Phone number, base64 encoded so it does not show up in plain text in the source */
  const PHONE_B64 = 'KzkxIDYzMDU1NDEyMDM=';

  const normalise = (text) => text.trim().toLowerCase();

  const sha256Hex = async (text) => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
  };

  const verify = async (text) => {
    if (!window.crypto || !crypto.subtle) return false;
    return (await sha256Hex(normalise(text))) === FLAG_HASH;
  };

  window.Challenge = { verify, normalise };

  /* ---------- Contact section: reveal the phone number after the right flag ---------- */
  const form = document.getElementById('flag-form');
  if (!form) return;

  const input = document.getElementById('flag-input');
  const msg = document.getElementById('flag-msg');
  const reveal = document.getElementById('phone-reveal');
  const link = document.getElementById('phone-link');
  const copy = document.getElementById('phone-copy');

  const setMsg = (text, kind) => {
    msg.textContent = text;
    msg.className = 'flag-msg' + (kind ? ' is-' + kind : '');
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!input.value.trim()) {
      setMsg('Enter the flag first.', 'error');
      return;
    }
    if (!window.crypto || !crypto.subtle) {
      setMsg('The flag check needs a secure (https) connection. Open the live site.', 'error');
      return;
    }

    setMsg('Checking...', '');
    let ok = false;
    try {
      ok = await verify(input.value);
    } catch (err) {
      ok = false;
    }

    if (!ok) {
      setMsg('Not the flag. Keep hunting on the Kali machine.', 'error');
      return;
    }

    const number = atob(PHONE_B64);
    link.textContent = number;
    link.href = 'tel:' + number.replace(/[^\d+]/g, '');
    copy.dataset.copy = number;
    reveal.hidden = false;
    form.hidden = true;
    setMsg('Flag accepted. Here is my number.', 'ok');
  });
})();
