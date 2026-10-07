function renderRiderLogin() {
  loadCss('/css/rider.css');

  // 1. Check if accessed via Magic Link query param (?token=...)
  const urlParams = new URLSearchParams(window.location.search);
  const queryToken = urlParams.get('token');
  if (queryToken) {
    Router.navigate(`/r/${queryToken}`);
    return;
  }

  // 2. Check if rider is already logged in
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

  const roleBadge = rider.role === 'sweeper' 
    ? '<span class="badge" style="background:rgba(249,115,22,0.18);color:#C2410C;border:1px solid #F97316">🧹 Sweeper</span>'
    : (rider.role === 'marshall'
      ? '<span class="badge" style="background:rgba(59,130,246,0.18);color:#1D4ED8;border:1px solid #3B82F6">🏍️ Marshall</span>'
      : (rider.role === 'medic'
        ? '<span class="badge" style="background:rgba(239,68,68,0.18);color:#B91C1C;border:1px solid #EF4444">🚑 Medis</span>'
        : ''));

  app.innerHTML = `
    <div class="rider-login-wrapper">
      <div class="rider-login-card fade-in" style="text-align:center">
        <div class="login-nav-bar" style="margin-bottom:14px">
          <a href="/" data-link class="login-back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Beranda</span>
          </a>
          <span class="login-live-pill"><span class="pulse-dot"></span> SESI AKTIF</span>
        </div>
        
        <div style="margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:10px">
          <img src="/icons/logo-emblem.svg" alt="CYCLOPON" width="36" height="36" style="border-radius:8px;box-shadow:0 3px 8px rgba(13,17,23,0.15)">
          <span style="font-family:'Inter',system-ui,sans-serif;font-size:24px;font-weight:900;letter-spacing:-0.03em;color:#0D1117">CYCLOPON</span>
        </div>
        <h1 class="login-title">Sesi Aktif Ditemukan</h1>
        <p class="login-subtitle" style="margin-bottom:20px">Anda sudah login pada perangkat ini</p>

        <div style="background:#FFFFFF;border:1.5px solid #0D1117;border-radius:10px;padding:16px 18px;text-align:left;margin-bottom:20px;box-shadow:0 8px 20px rgba(13,17,23,0.06)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:0.06em">// EVENT RESMI</span>
            <span class="badge" style="background:#EEF4EE;border:1px solid #C8DEC9;color:#1C3E24;font-weight:800;font-family:ui-monospace,monospace">${event.name}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:0.06em">// NAMA PESERTA</span>
            <strong style="font-size:14px;color:#0D1117;font-weight:800">${rider.name} ${roleBadge}</strong>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px dashed #E5E7EB">
            <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:0.06em">// NOMOR BIB / PLAT</span>
            <strong style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;color:#0D1117;font-weight:900">#${rider.bib}</strong>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px">
          <button id="btnContinueHub" class="btn" style="padding:12px;font-size:13px;border-radius:8px;background:#0D1117;color:#FFF;font-weight:800;letter-spacing:0.04em">
            LANJUTKAN KE RIDER HUB →
          </button>
          <button id="btnSwitchAccount" class="btn" style="padding:10px;font-size:12px;border-radius:8px;background:#FFF;border:1.5px solid #E5E7EB;color:#B91C1C;font-weight:800">
            🚪 GANTI AKUN / LOGOUT
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
      <div class="rider-login-card fade-in">
        <!-- Top Nav -->
        <div class="login-nav-bar">
          <a href="/" data-link class="login-back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Beranda</span>
          </a>
          <div class="login-live-pill">
            <span class="pulse-dot"></span>
            <span>CYCLOPON LIVE</span>
          </div>
        </div>

        <!-- Header Center -->
        <div class="login-header-center">
          <div style="margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:10px">
            <img src="/icons/logo-emblem.svg" alt="CYCLOPON" width="36" height="36" style="border-radius:8px;box-shadow:0 3px 8px rgba(13,17,23,0.15)">
            <span style="font-family:'Inter',system-ui,sans-serif;font-size:26px;font-weight:900;letter-spacing:-0.03em;color:#0D1117">CYCLOPON</span>
          </div>
          <h1 class="login-title">Akses Peserta & Panitia</h1>
          <p class="login-subtitle">Pilih event resmi dan masukkan nomor BIB & PIN Anda</p>
        </div>

        <form id="riderLoginForm" onsubmit="return false;">
          <!-- Event Selector -->
          <div class="form-group-modern">
            <div class="field-label-row">
              <label for="eventSelect" class="modern-field-label">PILIH EVENT</label>
              <span class="label-status-tag">Wajib</span>
            </div>
            <div class="modern-select-box">
              <span class="select-prefix-icon">🏁</span>
              <select class="modern-select" id="eventSelect">
                ${displayEvents.length
                  ? displayEvents.map((ev, idx) => `
                      <option value="${ev.id}" ${idx === 0 ? 'selected' : ''}>
                        ${ev.name} (${ev.date}) ${ev.active ? '🟢' : '⚪'}
                      </option>
                    `).join('')
                  : '<option value="">Belum ada event aktif</option>'
                }
              </select>
              <span class="select-chevron-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </div>
          </div>

          <!-- BIB Input -->
          <div class="form-group-modern">
            <div class="field-label-row">
              <label for="bibInput" class="modern-field-label">NOMOR BIB / PLAT SEPEDA</label>
              <span class="field-helper-tag">001, SWEEP-01</span>
            </div>
            <div class="modern-bib-box">
              <span class="bib-hash-badge">BIB #</span>
              <input class="modern-bib-input" id="bibInput" type="text"
                     placeholder="001 atau SWEEP-01" autocomplete="off" spellcheck="false"
                     maxlength="12">
            </div>
          </div>

          <!-- PIN Display Slots -->
          <div class="pin-display-section">
            <div class="pin-label-row">
              <label class="modern-field-label">PIN AKSES (4 - 6 DIGIT)</label>
              <span class="pin-counter-badge" id="pinCounter">0 / 6 digit</span>
            </div>
            <div class="pin-slots-grid" id="pinDisplay">
              ${Array(MAX_PIN).fill(0).map((_, i) => `
                <div class="pin-slot ${i === 0 ? 'active' : ''}" data-index="${i}">
                  <div class="pin-pip"></div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Tactical Modern Keypad -->
          <div class="modern-keypad" id="pinKeypad">
            ${[
              { num: '1', sub: ' ' },
              { num: '2', sub: 'ABC' },
              { num: '3', sub: 'DEF' },
              { num: '4', sub: 'GHI' },
              { num: '5', sub: 'JKL' },
              { num: '6', sub: 'MNO' },
              { num: '7', sub: 'PQRS' },
              { num: '8', sub: 'TUV' },
              { num: '9', sub: 'WXYZ' },
            ].map(k => `
              <button type="button" class="pin-key modern-key" data-digit="${k.num}">
                <span class="key-digit">${k.num}</span>
                <span class="key-letters">${k.sub}</span>
              </button>
            `).join('')}
            <button type="button" class="pin-key modern-key key-delete" id="keyDelete" title="Hapus Digit">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                <line x1="18" y1="9" x2="12" y2="15"/>
                <line x1="12" y1="9" x2="18" y2="15"/>
              </svg>
            </button>
            <button type="button" class="pin-key modern-key" data-digit="0">
              <span class="key-digit">0</span>
              <span class="key-letters">+</span>
            </button>
            <button type="button" class="pin-key modern-key key-ok" id="keyOk" title="Masuk">
              <span class="key-ok-text">OK</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>

          <!-- Modern PIN Hint -->
          <div class="modern-pin-hint">
            <div class="hint-icon-wrap">💡</div>
            <div class="hint-content">
              <strong>Tips PIN:</strong> Gunakan <strong>4 digit terakhir no. WhatsApp</strong> pendaftaran Anda (atau PIN dari panitia).
            </div>
          </div>

          <p id="loginError" class="modern-login-error"></p>

          <!-- Self-Registration Footer Section -->
          <div class="login-footer-section">
            <div class="modern-divider">
              <span>PANITIA / WALK-IN LAPANGAN</span>
            </div>
            <button id="btnOpenSelfReg" type="button" class="btn-self-register">
              <span class="reg-plus-circle">＋</span>
              <span>Daftar Mandiri Lapangan (Rider / Sweeper)</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal On-The-Spot Self-Registration -->
    <div id="selfRegModal" class="sos-modal-overlay" style="display:none">
      <div class="sos-modal-content" style="border-color:var(--color-sage);max-width:440px;border-radius:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h3 style="font-size:17px;font-weight:900;color:var(--text-primary);margin:0;display:flex;align-items:center;gap:8px">
            <span>➕</span> Registrasi di Lapangan
          </h3>
          <button id="btnCloseSelfReg" style="background:#F4F5F4;border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;color:var(--text-secondary);transition:var(--transition)">✕</button>
        </div>

        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.45">
          Khusus untuk peserta susulan, sweeper, marshall, atau panitia lapangan. Akun langsung aktif seketika.
        </p>

        <form id="selfRegForm">
          <div class="form-group" style="margin-bottom:12px">
            <label style="font-size:11px;font-weight:800;color:var(--text-secondary);letter-spacing:0.04em;text-transform:uppercase">Pilih Event</label>
            <select class="input" id="regEventSelect" required style="font-size:13px;border-radius:12px">
              ${displayEvents.map(e => `<option value="${e.id}">${e.name} (${e.date})</option>`).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label style="font-size:11px;font-weight:800;color:var(--text-secondary);letter-spacing:0.04em;text-transform:uppercase">Peran / Role</label>
            <select class="input" id="regRoleSelect" required style="font-size:13px;border-radius:12px">
              <option value="rider">🚴 Peserta (Rider Biasa)</option>
              <option value="sweeper">🧹 Sweeper (Penyapu Belakang)</option>
              <option value="marshall">🏍️ Marshall / Road Captain</option>
              <option value="medic">🚑 Tim Medis / Evakuasi</option>
            </select>
          </div>

          <div class="form-row" style="margin-bottom:12px">
            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:11px;font-weight:800;color:var(--text-secondary);letter-spacing:0.04em;text-transform:uppercase">Nomor BIB / Plat</label>
              <input class="input" id="regBibInput" placeholder="Contoh: SWEEP-01 atau 999" required style="font-size:13px;text-transform:uppercase;border-radius:12px">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:11px;font-weight:800;color:var(--text-secondary);letter-spacing:0.04em;text-transform:uppercase">Nama Lengkap</label>
              <input class="input" id="regNameInput" placeholder="Nama Anda" required style="font-size:13px;border-radius:12px">
            </div>
          </div>

          <div class="form-row" style="margin-bottom:14px">
            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:11px;font-weight:800;color:var(--text-secondary);letter-spacing:0.04em;text-transform:uppercase">Nomor WhatsApp / HP</label>
              <input class="input" id="regPhoneInput" placeholder="081234567890" style="font-size:13px;border-radius:12px">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:11px;font-weight:800;color:var(--text-secondary);letter-spacing:0.04em;text-transform:uppercase">PIN (4 Digit)</label>
              <input class="input" id="regPinInput" placeholder="Otomatis 4 digit akhir HP" style="font-size:13px;border-radius:12px" maxlength="6">
            </div>
          </div>

          <p id="regError" style="color:var(--color-red);font-size:12px;margin-bottom:12px;min-height:16px;font-weight:600"></p>

          <div style="display:flex;gap:10px">
            <button type="submit" id="btnSubmitSelfReg" class="btn btn-primary" style="flex:1;padding:12px;font-size:13px;font-weight:800;border-radius:14px">
              Daftar & Langsung Masuk →
            </button>
            <button type="button" id="btnCancelSelfReg" class="btn btn-outline" style="padding:12px 18px;font-size:13px;border-radius:14px">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  function updateDots() {
    const slots = document.querySelectorAll('.pin-slot');
    const counterEl = document.getElementById('pinCounter');
    const okBtn = document.getElementById('keyOk');

    slots.forEach((slot, i) => {
      slot.classList.toggle('filled', i < pin.length);
      slot.classList.toggle('active', i === pin.length);
    });

    if (counterEl) {
      counterEl.textContent = `${pin.length} / ${MAX_PIN} digit${pin.length >= 4 ? ' (Siap)' : ''}`;
      if (pin.length >= 4) {
        counterEl.style.color = '#047857';
        counterEl.style.fontWeight = '800';
      } else {
        counterEl.style.color = 'var(--text-secondary)';
        counterEl.style.fontWeight = '700';
      }
    }

    if (okBtn) {
      if (pin.length >= 4) {
        okBtn.classList.add('ready');
      } else {
        okBtn.classList.remove('ready');
      }
    }
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
    const origHtml = okBtn.innerHTML;
    okBtn.innerHTML = '<span>...</span>';
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
        showToast(`Selamat datang, ${data.rider.name}!`, 'success');
        Router.navigate('/rider/setup');
      } else {
        errEl.textContent = data.error || 'Login gagal. Periksa nomor BIB dan PIN.';
        pin = '';
        updateDots();
        okBtn.innerHTML = origHtml;
        okBtn.disabled = false;
      }
    } catch {
      errEl.textContent = 'Tidak dapat terhubung ke server.';
      okBtn.innerHTML = origHtml;
      okBtn.disabled = false;
    }
  }

  // Keypad clicks
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

  // Keyboard navigation & numpad input
  const bibInput = document.getElementById('bibInput');
  bibInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      bibInput.blur();
    }
  });

  function handleKeyDown(e) {
    if (e.target && (e.target.id === 'bibInput' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
      return;
    }
    if (e.key >= '0' && e.key <= '9') {
      if (pin.length < MAX_PIN) {
        pin += e.key;
        updateDots();
        if (pin.length === MAX_PIN) submitLogin();
      }
    } else if (e.key === 'Backspace') {
      pin = pin.slice(0, -1);
      updateDots();
      document.getElementById('loginError').textContent = '';
    } else if (e.key === 'Enter') {
      submitLogin();
    }
  }
  window.addEventListener('keydown', handleKeyDown);

  // Modal Handlers for On-The-Spot Registration
  const modal = document.getElementById('selfRegModal');
  const btnOpenModal = document.getElementById('btnOpenSelfReg');
  const btnCloseModal = document.getElementById('btnCloseSelfReg');
  const btnCancelModal = document.getElementById('btnCancelSelfReg');
  const selfRegForm = document.getElementById('selfRegForm');
  const regErrEl = document.getElementById('regError');
  const btnSubmitReg = document.getElementById('btnSubmitSelfReg');

  function openRegModal() {
    modal.style.display = 'flex';
    regErrEl.textContent = '';
  }

  function closeRegModal() {
    modal.style.display = 'none';
  }

  btnOpenModal?.addEventListener('click', openRegModal);
  btnCloseModal?.addEventListener('click', closeRegModal);
  btnCancelModal?.addEventListener('click', closeRegModal);

  selfRegForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    regErrEl.textContent = '';
    btnSubmitReg.disabled = true;
    btnSubmitReg.textContent = 'Mendaftarkan...';

    const event_id = document.getElementById('regEventSelect').value;
    const role     = document.getElementById('regRoleSelect').value;
    const bib      = document.getElementById('regBibInput').value.trim();
    const name     = document.getElementById('regNameInput').value.trim();
    const phone    = document.getElementById('regPhoneInput').value.trim();
    const regPin   = document.getElementById('regPinInput').value.trim();

    try {
      const res = await fetch('/api/auth/rider/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id, role, bib, name, phone, pin: regPin })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem('riderConfig', JSON.stringify(data));
        localStorage.setItem('riderConfig', JSON.stringify(data));
        showToast(`Pendaftaran berhasil! Selamat datang, ${data.rider.name}.`, 'success');
        closeRegModal();
        Router.navigate('/rider/setup');
      } else {
        regErrEl.textContent = data.error || 'Gagal mendaftar.';
        btnSubmitReg.disabled = false;
        btnSubmitReg.textContent = 'Daftar & Langsung Masuk →';
      }
    } catch {
      regErrEl.textContent = 'Gagal terhubung ke server.';
      btnSubmitReg.disabled = false;
      btnSubmitReg.textContent = 'Daftar & Langsung Masuk →';
    }
  });
}
