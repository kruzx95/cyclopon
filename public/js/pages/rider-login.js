function renderRiderLogin() {
  loadCss('/css/rider.css');

  // Check if rider is already logged in
  const savedConfigStr = sessionStorage.getItem('riderConfig') || localStorage.getItem('riderConfig');
  if (savedConfigStr) {
    try {
      const savedConfig = JSON.parse(savedConfigStr);
      if (savedConfig && savedConfig.rider && savedConfig.event) {
        renderExistingSession(savedConfig);
        return;
      }
    } catch {
      sessionStorage.removeItem('riderConfig');
      localStorage.removeItem('riderConfig');
    }
  }

  renderLoginForm();
}

function renderExistingSession(config) {
  const { rider, event } = config;
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="rider-login-wrapper">
      <div class="card fade-in" style="width:100%;max-width:400px;text-align:center">
        <a href="/" data-link style="color:var(--text-secondary);font-size:13px;text-decoration:none;display:inline-block;margin-bottom:16px">← Kembali ke Beranda</a>
        
        <div style="font-size:44px;margin-bottom:8px">🚴‍♂️</div>
        <h1 style="font-size:20px;font-weight:700">Sesi Aktif Ditemukan</h1>
        <p style="color:var(--text-secondary);font-size:13px;margin-top:4px;margin-bottom:20px">Anda sedang login pada perangkat ini</p>

        <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;text-align:left;margin-bottom:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;color:var(--text-secondary)">Event</span>
            <span class="badge badge-cyan">${event.name}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;color:var(--text-secondary)">Nama Rider</span>
            <strong style="font-size:14px;color:var(--text-primary)">${rider.name}</strong>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12px;color:var(--text-secondary)">Nomor BIB</span>
            <strong style="font-size:16px;color:var(--color-yellow)">#${rider.bib}</strong>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px">
          <button id="btnContinueHub" class="btn btn-primary" style="padding:14px;font-size:14px">
            🚴 Lanjutkan ke Rider Hub
          </button>
          <button id="btnSwitchAccount" class="btn btn-outline" style="padding:12px;font-size:13px;color:var(--color-red);border-color:rgba(239,68,68,0.3)">
            🚪 Ganti Akun / Logout
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnContinueHub').addEventListener('click', () => {
    Router.navigate('/rider/setup');
  });

  document.getElementById('btnSwitchAccount').addEventListener('click', () => {
    sessionStorage.removeItem('riderConfig');
    localStorage.removeItem('riderConfig');
    renderLoginForm();
  });
}

async function renderLoginForm() {
  const app = document.getElementById('app');
  let pin = '';
  const MAX_PIN = 6;
  let events = [];

  try {
    const res = await fetch('/api/events');
    events = res.ok ? await res.json() : [];
  } catch {
    events = [];
  }

  const activeEvents = events.filter(e => e.active);
  const displayEvents = activeEvents.length ? activeEvents : events;

  app.innerHTML = `
    <div class="rider-login-wrapper">
      <div class="card fade-in" style="width:100%;max-width:380px">

        <div style="text-align:center;margin-bottom:24px">
          <a href="/" data-link style="color:var(--text-secondary);font-size:13px;text-decoration:none;display:block;margin-bottom:14px">← Kembali ke Beranda</a>
          <div style="font-size:44px">🚴‍♂️</div>
          <h1 style="font-size:20px;font-weight:700;margin-top:8px">Login Rider</h1>
          <p style="color:var(--text-secondary);font-size:13px;margin-top:4px">Pilih event dan masukkan nomor BIB & PIN</p>
        </div>

        <form id="riderLoginForm" onsubmit="return false;">
          <!-- Event Selector -->
          <div class="form-group">
            <label for="eventSelect">Pilih Event</label>
            <select class="input" id="eventSelect" style="font-size:13px;cursor:pointer">
              ${displayEvents.length
                ? displayEvents.map((ev, idx) => `
                    <option value="${ev.id}" ${idx === 0 ? 'selected' : ''}>
                      ${ev.name} (${ev.date}) ${ev.active ? '🟢' : '⚪'}
                    </option>
                  `).join('')
                : '<option value="">Belum ada event aktif</option>'
              }
            </select>
          </div>

          <!-- BIB Input -->
          <div class="form-group">
            <label for="bibInput">Nomor BIB</label>
            <input class="input" id="bibInput" type="tel" inputmode="numeric" pattern="[0-9]*"
                   placeholder="Contoh: 001" autocomplete="off"
                   style="text-align:center;font-size:26px;font-weight:700;letter-spacing:0.05em">
          </div>

          <!-- PIN Display -->
          <div style="text-align:center;margin-bottom:8px">
            <label>PIN (4 - 6 digit)</label>
            <div class="pin-display" id="pinDisplay">
              ${Array(MAX_PIN).fill('<div class="pin-dot"></div>').join('')}
            </div>
          </div>

          <!-- Numpad Keypad -->
          <div class="pin-keypad" id="pinKeypad">
            ${[1,2,3,4,5,6,7,8,9].map(n =>
              `<button type="button" class="pin-key" data-digit="${n}">${n}</button>`
            ).join('')}
            <button type="button" class="pin-key key-delete" id="keyDelete">⌫</button>
            <button type="button" class="pin-key" data-digit="0">0</button>
            <button type="button" class="pin-key key-ok" id="keyOk">OK ✓</button>
          </div>

          <p id="loginError" style="color:var(--color-red);font-size:13px;text-align:center;margin-top:12px;min-height:18px"></p>
        </form>
      </div>
    </div>
  `;

  function updateDots() {
    document.querySelectorAll('.pin-dot').forEach((d, i) => {
      d.classList.toggle('filled', i < pin.length);
    });
  }

  async function submitLogin() {
    const eventSelect = document.getElementById('eventSelect');
    const eventId = eventSelect ? eventSelect.value : null;
    const bib = document.getElementById('bibInput').value.trim();
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';

    if (!eventId) {
      errEl.textContent = 'Pilih event terlebih dahulu.';
      return;
    }
    if (!bib) {
      errEl.textContent = 'Masukkan nomor BIB terlebih dahulu.';
      document.getElementById('bibInput').focus();
      return;
    }
    if (pin.length < 4) {
      errEl.textContent = 'PIN minimal 4 digit.';
      return;
    }

    const okBtn = document.getElementById('keyOk');
    okBtn.textContent = '...';
    okBtn.disabled = true;

    try {
      const res = await fetch('/api/auth/rider', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ event_id: Number(eventId), bib, pin })
      });
      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem('riderConfig', JSON.stringify(data));
        localStorage.setItem('riderConfig', JSON.stringify(data));
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

  // Allow physical keyboard for BIB
  document.getElementById('bibInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('bibInput').blur();
    }
  });
}
