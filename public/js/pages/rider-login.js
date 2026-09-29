function renderRiderLogin() {
  loadCss('/css/rider.css');

  let pin = '';
  const MAX_PIN = 6;

  document.getElementById('app').innerHTML = `
    <div class="rider-login-wrapper">
      <div class="card fade-in" style="width:100%;max-width:360px">

        <div style="text-align:center;margin-bottom:28px">
          <a href="/" data-link style="color:var(--text-secondary);font-size:13px;text-decoration:none;display:block;margin-bottom:16px">← Kembali</a>
          <div style="font-size:44px">🚴‍♂️</div>
          <h1 style="font-size:20px;font-weight:700;margin-top:10px">Login Rider</h1>
          <p style="color:var(--text-secondary);font-size:13px;margin-top:4px">Masukkan BIB Number dan PIN Anda</p>
        </div>

        <div class="form-group">
          <label for="bibInput">Nomor BIB</label>
          <input class="input" id="bibInput" type="tel" inputmode="numeric" pattern="[0-9]*"
                 placeholder="Contoh: 184" autocomplete="off"
                 style="text-align:center;font-size:28px;font-weight:700;letter-spacing:0.05em">
        </div>

        <div style="text-align:center">
          <label>PIN</label>
          <div class="pin-display" id="pinDisplay">
            ${Array(MAX_PIN).fill('<div class="pin-dot"></div>').join('')}
          </div>
        </div>

        <div class="pin-keypad" id="pinKeypad">
          ${[1,2,3,4,5,6,7,8,9].map(n =>
            `<button class="pin-key" data-digit="${n}">${n}</button>`
          ).join('')}
          <button class="pin-key key-delete" id="keyDelete">⌫</button>
          <button class="pin-key" data-digit="0">0</button>
          <button class="pin-key key-ok" id="keyOk">OK ✓</button>
        </div>

        <p id="loginError" style="color:var(--color-red);font-size:13px;text-align:center;margin-top:14px;min-height:18px"></p>
      </div>
    </div>
  `;

  function updateDots() {
    document.querySelectorAll('.pin-dot').forEach((d, i) => {
      d.classList.toggle('filled', i < pin.length);
    });
  }

  async function submitLogin() {
    const bib = document.getElementById('bibInput').value.trim();
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';

    if (!bib) { errEl.textContent = 'Masukkan nomor BIB terlebih dahulu.'; return; }
    if (pin.length < 4) { errEl.textContent = 'PIN minimal 4 digit.'; return; }

    const okBtn = document.getElementById('keyOk');
    okBtn.textContent = '...';
    okBtn.disabled = true;

    try {
      const res  = await fetch('/api/auth/rider', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bib, pin })
      });
      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem('riderConfig', JSON.stringify(data));
        Router.navigate('/rider/setup');
      } else {
        errEl.textContent = data.error || 'Login gagal.';
        pin = '';
        updateDots();
        okBtn.textContent = 'OK ✓';
        okBtn.disabled = false;
      }
    } catch {
      errEl.textContent = 'Tidak dapat terhubung ke server.';
      okBtn.textContent = 'OK ✓';
      okBtn.disabled = false;
    }
  }

  // Keypad events
  document.querySelectorAll('.pin-key[data-digit]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (pin.length < MAX_PIN) {
        pin += btn.dataset.digit;
        updateDots();
        if (pin.length === MAX_PIN) submitLogin();
      }
    });
  });
  document.getElementById('keyDelete').addEventListener('click', () => {
    pin = pin.slice(0, -1);
    updateDots();
    document.getElementById('loginError').textContent = '';
  });
  document.getElementById('keyOk').addEventListener('click', submitLogin);

  // Allow physical keyboard too
  document.getElementById('bibInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('bibInput').blur();
  });
}
