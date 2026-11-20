/**
 * CycloPon Fast-Track Public Rider Registration & Traccar Auto-Setup Page (/register)
 * Zero-friction onboarding: Name + WhatsApp -> Auto BIB -> Traccar 1-Click / QR Auto-Config.
 */

async function renderRegisterPage(params) {
  const app = document.getElementById('app');
  document.title = 'Daftar Event — CycloPon Live Tracker';

  app.innerHTML = `
    <div class="register-page">
      <!-- Navbar -->
      <header class="register-navbar">
        <a href="/" data-link class="register-brand">
          <img src="/icons/logo-emblem.svg" alt="CycloPon" width="28" height="28">
          <span class="register-brand-title">CYCLOPON</span>
          <span class="register-brand-tag">// DAFTAR</span>
        </a>
        <div class="register-nav-actions">
          <a href="/guide" data-link class="btn-guide-nav" title="Panduan Pengguna">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span class="nav-label-full">PANDUAN</span>
          </a>
          <a href="/login" data-link class="btn-guide-nav" style="border-color:#0D1117;color:#0D1117" title="Login Peserta">
            <span>LOGIN RIDER</span>
          </a>
        </div>
      </header>

      <div class="register-container">
        <!-- Hero Section -->
        <div class="register-hero">
          <div class="register-hero-tag">⚡ PENDAFTARAN PESERTA INSTAN</div>
          <h1 class="register-hero-title">Gabung &amp; Pantau <span>Live di Peta</span></h1>
          <p class="register-hero-lead register-hero-desc">
            Cukup masukkan nama &amp; nomor WhatsApp. Nomor BIB diterbitkan otomatis, dan aplikasi Traccar Client ponsel Anda langsung siap disetting dalam 1 klik.
          </p>
        </div>

        <!-- Success Result Card (Hidden by default) -->
        <div id="regSuccessCard" class="reg-success-card" style="display:none">
          <div class="success-header-badge">✓ PENDAFTARAN RESMI BERHASIL</div>
          
          <div class="ticket-grid">
            <div>
              <div class="ticket-bib-big" id="resBibBig">#---</div>
              <div class="ticket-name-big" id="resNameBig">Nama Rider</div>
              <div class="ticket-event-label" id="resEventLabel">Nama Event</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;font-weight:700;color:#64748B">PIN AKSES COCKPIT</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:900;color:#0D1117" id="resPinBig">----</div>
              <div style="font-size:10px;color:#64748B;margin-top:2px">4 digit terakhir no. WA</div>
            </div>
          </div>

          <!-- Traccar Auto-Setup Hub -->
          <div class="traccar-setup-box">
            <div class="traccar-setup-title">
              <span>📱</span> Hubungkan GPS Traccar Client Ponsel
            </div>
            <div class="traccar-setup-desc">
              Pilih salah satu metode cepat di bawah ini untuk mengisi pengaturan Traccar tanpa mengetik manual:
            </div>

            <!-- Interval Selector -->
            <div class="interval-select-group">
              <span class="interval-label">Interval GPS:</span>
              <button type="button" class="interval-pill-btn active" data-interval="10">⚡ 10s (Balap / Standar)</button>
              <button type="button" class="interval-pill-btn" data-interval="15">🚴 15s (Touring)</button>
              <button type="button" class="interval-pill-btn" data-interval="30">🔋 30s (Ultra / Hemat Baterai)</button>
            </div>

            <!-- Option 1: 1-Click Launch Traccar -->
            <a id="btnTraccarDeepLink" href="#" class="btn-launch-traccar" target="_blank" rel="noopener noreferrer">
              <span>⚡</span> Buka &amp; Setting Otomatis di Traccar Client
            </a>

            <!-- Option 2: Scan QR Barcode -->
            <div class="qr-scan-box">
              <div class="qr-code-graphic" id="traccarQrGraphic">
                <!-- SVG QR will be rendered here -->
              </div>
              <div class="qr-instructions">
                <strong>Opsi Scan Kamera Traccar:</strong><br>
                Buka aplikasi <strong>Traccar Client</strong> di ponsel Anda → Ketuk menu <strong>Settings</strong> → Ketuk <strong>ikon Barcode/QR</strong> di pojok kanan atas → Arahkan kamera ke kode di samping.
              </div>
            </div>

            <!-- Option 3: Manual Copy Fallback -->
            <div class="manual-param-list">
              <div class="param-copy-chip">
                <div>
                  <div class="param-label">Server URL</div>
                  <div class="param-value" id="valServerUrl">https://...</div>
                </div>
                <button type="button" class="btn-copy-chip" id="btnCopyServerUrl">Salin</button>
              </div>
              <div class="param-copy-chip">
                <div>
                  <div class="param-label">Device Identifier</div>
                  <div class="param-value" id="valDeviceIdentifier">---</div>
                </div>
                <button type="button" class="btn-copy-chip" id="btnCopyDeviceId">Salin</button>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <a id="btnGoLiveMap" href="#" data-link class="btn-submit-reg" style="flex:1;background:#0D1117;text-decoration:none">
              🗺️ Buka Peta Live Event
            </a>
            <button type="button" id="btnRegisterAnother" class="btn-submit-reg" style="flex:1;background:#FFFFFF;color:#0D1117;border-color:#0D1117;box-shadow:none">
              + Daftarkan Rider Lain
            </button>
          </div>
        </div>

        <!-- Registration Form Card -->
        <div id="regFormCard" class="register-card">
          <div class="form-section-title">
            <span>📝</span> Formulir Pendaftaran Rider
          </div>

          <form id="riderRegForm" autocomplete="off">
            <!-- Event Selection -->
            <div class="form-group-reg">
              <label class="form-label-reg" for="regEventSelect">
                Pilih Event <span class="req">*</span>
              </label>
              <div class="reg-field-wrap">
                <span class="reg-field-icon">🏁</span>
                <select id="regEventSelect" class="form-select-reg" required>
                  <option value="">Memuat daftar event...</option>
                </select>
                <span class="reg-select-chevron">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </div>
            </div>

            <!-- Rider Name -->
            <div class="form-group-reg">
              <label class="form-label-reg" for="regName">
                Nama Lengkap Peserta <span class="req">*</span>
                <span class="hint">(Sesuai KTP / Nama Panggilan Komunitas)</span>
              </label>
              <div class="reg-field-wrap">
                <span class="reg-field-icon">👤</span>
                <input type="text" id="regName" class="form-input-reg" placeholder="Contoh: Budi Santoso" required maxlength="60">
              </div>
            </div>

            <!-- WhatsApp Phone -->
            <div class="form-group-reg">
              <label class="form-label-reg" for="regPhone">
                Nomor WhatsApp / HP <span class="req">*</span>
                <span class="hint">(Untuk konfirmasi panitia &amp; 4-digit PIN)</span>
              </label>
              <div class="reg-field-wrap">
                <span class="reg-field-icon">📱</span>
                <input type="tel" id="regPhone" class="form-input-reg" placeholder="Contoh: 081234567890" required pattern="[0-9+ -]{9,16}">
              </div>
            </div>

            <!-- Optional Role Selection -->
            <div class="form-group-reg" style="margin-bottom:20px">
              <label class="form-label-reg" for="regRole">
                Kategori Keikutsertaan
              </label>
              <div class="reg-field-wrap">
                <span class="reg-field-icon">🚴</span>
                <select id="regRole" class="form-select-reg">
                  <option value="rider" selected>Peserta Balap / Touring (Rider)</option>
                  <option value="sweeper">🧹 Official Sweeper (Penyapu Belakang)</option>
                  <option value="marshall">🛡️ Race Marshall (Petugas Lintasan)</option>
                  <option value="medic">🚑 Tim Medis / Evakuasi</option>
                </select>
                <span class="reg-select-chevron">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </div>
            </div>

            <!-- Privacy Guarantee Banner -->
            <div class="privacy-notice">
              <span style="font-size:16px">🔒</span>
              <span><strong>Jaminan Privasi:</strong> Nomor WhatsApp Anda dirahasiakan dan <strong>tidak akan ditampilkan di daftar publik</strong>. Hanya digunakan panitia untuk keperluan briefing atau darurat event.</span>
            </div>

            <!-- Error Banner -->
            <div id="regErrMsg" style="display:none;background:#FEE2E2;border:1.5px solid #F87171;color:#991B1B;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:700;margin-bottom:18px"></div>

            <!-- Submit Button -->
            <button type="submit" id="btnSubmitReg" class="btn-submit-reg">
              <span>⚡</span> DAFTAR EVENT SEKARANG →
            </button>
          </form>
        </div>

        <!-- Public Roster Section -->
        <div class="roster-section">
          <div class="roster-header-row">
            <h2 class="roster-title">
              <span>📋</span> Daftar Peserta Terdaftar
              <span class="roster-count-badge" id="rosterCountBadge">0 Rider</span>
            </h2>
            <div class="roster-search-box">
              <span class="roster-search-icon">🔍</span>
              <input type="text" id="rosterSearchInput" class="roster-search-input" placeholder="Cari nama atau nomor BIB...">
            </div>
          </div>

          <div class="roster-table-wrap">
            <table class="roster-table">
              <thead>
                <tr>
                  <th style="width:75px">No. BIB</th>
                  <th>Nama Peserta</th>
                  <th style="width:110px">Kategori</th>
                  <th style="width:95px;text-align:center">Status</th>
                </tr>
              </thead>
              <tbody id="rosterTableBody">
                <tr>
                  <td colspan="4" style="text-align:center;padding:24px;color:#64748B">
                    Memuat daftar peserta...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Safe HTML Escape Helper ──
  const escapeHtml = window.escapeHtml || function(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // ── State Variables ──
  let allEvents = [];
  let currentEventId = null;
  let currentRiders = [];
  let registeredRiderData = null;
  let currentInterval = 10;

  // ── Elements ──
  const eventSelect = document.getElementById('regEventSelect');
  const regForm = document.getElementById('riderRegForm');
  const btnSubmit = document.getElementById('btnSubmitReg');
  const errMsg = document.getElementById('regErrMsg');
  const successCard = document.getElementById('regSuccessCard');
  const formCard = document.getElementById('regFormCard');
  const rosterBody = document.getElementById('rosterTableBody');
  const rosterCountBadge = document.getElementById('rosterCountBadge');
  const rosterSearchInput = document.getElementById('rosterSearchInput');

  // ── QR Code SVG Helper ──
  function generateQrSvg(text) {
    if (typeof qrcode !== 'function') {
      return '<div style="padding:10px;font-size:11px;color:#6B7280">QR generator belum siap</div>';
    }
    try {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      return qr.createSvgTag({ cellSize: 3, margin: 2, scalable: true });
    } catch {
      return '<div style="padding:10px;font-size:11px;color:#DC2626">Gagal membuat QR</div>';
    }
  }

  // ── Update Traccar Auto-Config (QR & Deep Link) ──
  function updateTraccarConfig(intervalSec) {
    if (!registeredRiderData) return;
    currentInterval = intervalSec;

    const { rider, traccar } = registeredRiderData;
    const osmandUrl = traccar?.osmandUrl || `${window.location.origin}/api/osmand`;
    const bib = rider.bib;

    // Traccar Configuration Strings
    const qrText = `url=${osmandUrl}&id=${bib}&interval=${currentInterval}&accuracy=highest`;
    const intentUrl = `intent://config?url=${encodeURIComponent(osmandUrl)}&id=${bib}&interval=${currentInterval}&accuracy=highest#Intent;scheme=org.traccar.client;package=org.traccar.client;end`;
    const iosUrl = `org.traccar.client://config?url=${encodeURIComponent(osmandUrl)}&id=${bib}&interval=${currentInterval}&accuracy=highest`;

    // Detect iOS vs Android
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const deepLinkUrl = isIos ? iosUrl : intentUrl;

    // Update Deep Link Button
    const btnDeepLink = document.getElementById('btnTraccarDeepLink');
    if (btnDeepLink) {
      btnDeepLink.href = deepLinkUrl;
    }

    // Update QR Code SVG
    const qrContainer = document.getElementById('traccarQrGraphic');
    if (qrContainer) {
      qrContainer.innerHTML = generateQrSvg(qrText);
    }

    // Update Manual Chips
    const elUrl = document.getElementById('valServerUrl');
    const elId = document.getElementById('valDeviceIdentifier');
    if (elUrl) elUrl.textContent = osmandUrl;
    if (elId) elId.textContent = bib;
  }

  // ── Fetch Events ──
  async function loadEvents() {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Gagal memuat event');
      allEvents = await res.json();

      if (!allEvents.length) {
        eventSelect.innerHTML = '<option value="">Belum ada event dibuka</option>';
        return;
      }

      // Check query param for pre-selected event
      const urlParams = new URLSearchParams(window.location.search);
      const paramEventId = Number(urlParams.get('event') || params?.eventId);

      eventSelect.innerHTML = allEvents.map(ev => {
        const isSelected = paramEventId ? ev.id === paramEventId : (ev.active ? true : false);
        return `<option value="${ev.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(ev.name)} (${escapeHtml(ev.date || 'TBA')})</option>`;
      }).join('');

      currentEventId = Number(eventSelect.value) || allEvents[0].id;
      loadRoster(currentEventId);
    } catch (err) {
      eventSelect.innerHTML = `<option value="">${err.message}</option>`;
    }
  }

  // ── Fetch Roster of Event ──
  async function loadRoster(eventId) {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/riders`);
      if (!res.ok) {
        rosterBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#DC2626">Akses roster dibatasi panitia.</td></tr>`;
        rosterCountBadge.textContent = '0 Rider';
        return;
      }
      currentRiders = await res.json();
      renderRosterTable(currentRiders);
    } catch {
      rosterBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#DC2626">Gagal memuat peserta.</td></tr>`;
    }
  }

  // ── Render Roster Table ──
  function renderRosterTable(list) {
    const q = (rosterSearchInput?.value || '').trim().toLowerCase();
    const filtered = q
      ? list.filter(r => (r.name || '').toLowerCase().includes(q) || String(r.bib).toLowerCase().includes(q))
      : list;

    rosterCountBadge.textContent = `${list.length} Rider`;

    if (!filtered.length) {
      rosterBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:#64748B">${q ? 'Tidak ada peserta yang cocok dengan pencarian.' : 'Belum ada peserta terdaftar di event ini.'}</td></tr>`;
      return;
    }

    rosterBody.innerHTML = filtered.map(r => {
      const role = r.role || 'rider';
      const roleClass = role === 'sweeper' ? 'sweeper' : (role === 'marshall' ? 'marshall' : (role === 'medic' ? 'medic' : 'rider'));
      const roleLabel = role === 'sweeper' ? 'SWEEPER' : (role === 'marshall' ? 'MARSHALL' : (role === 'medic' ? 'MEDIS' : 'RIDER'));

      return `
        <tr>
          <td>
            <span class="roster-bib-pill" style="background:${r.color || '#FFE600'}22;border-color:${r.color || '#0D1117'}">
              #${escapeHtml(r.bib)}
            </span>
          </td>
          <td>
            <div class="roster-name-cell">${escapeHtml(r.name)}</div>
          </td>
          <td>
            <span class="role-badge-pill ${roleClass}">${roleLabel}</span>
          </td>
          <td style="text-align:center">
            <span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:800;color:#16A34A">
              ✓ Terdaftar
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ── Event Selection Changed ──
  eventSelect.addEventListener('change', () => {
    currentEventId = Number(eventSelect.value);
    loadRoster(currentEventId);
  });

  // ── Search Roster ──
  rosterSearchInput?.addEventListener('input', () => {
    renderRosterTable(currentRiders);
  });

  // ── Form Submission ──
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errMsg.style.display = 'none';
    errMsg.textContent = '';

    const eventId = Number(eventSelect.value);
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const role = document.getElementById('regRole').value;

    if (!eventId) {
      errMsg.textContent = 'Pilih event terlebih dahulu.';
      errMsg.style.display = 'block';
      return;
    }
    if (!name) {
      errMsg.textContent = 'Nama lengkap peserta wajib diisi.';
      errMsg.style.display = 'block';
      return;
    }
    if (!phone || phone.length < 8) {
      errMsg.textContent = 'Nomor WhatsApp / HP tidak valid.';
      errMsg.style.display = 'block';
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span>⏳</span> Mendaftarkan...`;

    try {
      const res = await fetch('/api/auth/rider/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          name,
          phone,
          role
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pendaftaran gagal. Silakan coba lagi.');
      }

      registeredRiderData = data;

      // Populate Success Card
      document.getElementById('resBibBig').textContent = `#${data.rider.bib}`;
      document.getElementById('resNameBig').textContent = data.rider.name;
      document.getElementById('resEventLabel').textContent = data.event?.name || 'Event CycloPon';
      document.getElementById('resPinBig').textContent = data.rider.pin || '1234';

      const btnGoMap = document.getElementById('btnGoLiveMap');
      if (btnGoMap) {
        btnGoMap.href = `/watch/${eventId}`;
      }

      // Initialize Traccar Auto-Config
      updateTraccarConfig(10);

      // Transition views: hide form, show success
      formCard.style.display = 'none';
      successCard.style.display = 'block';
      window.scrollTo({ top: successCard.offsetTop - 40, behavior: 'smooth' });

      // Add to current roster list and re-render
      currentRiders.unshift({
        id: data.rider.id,
        bib: data.rider.bib,
        name: data.rider.name,
        role: data.rider.role,
        color: data.rider.color
      });
      renderRosterTable(currentRiders);

      showToast(`Pendaftaran berhasil! Nomor BIB Anda: #${data.rider.bib}`, 'success');
    } catch (err) {
      errMsg.textContent = err.message;
      errMsg.style.display = 'block';
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>⚡</span> DAFTAR EVENT SEKARANG →`;
    }
  });

  // ── Interval Selector Buttons ──
  document.querySelectorAll('.interval-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.interval-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const intervalSec = Number(btn.dataset.interval) || 10;
      updateTraccarConfig(intervalSec);
    });
  });

  // ── Copy Buttons ──
  document.getElementById('btnCopyServerUrl')?.addEventListener('click', () => {
    const val = document.getElementById('valServerUrl')?.textContent || '';
    navigator.clipboard?.writeText(val);
    showToast('Server URL disalin!', 'success');
  });

  document.getElementById('btnCopyDeviceId')?.addEventListener('click', () => {
    const val = document.getElementById('valDeviceIdentifier')?.textContent || '';
    navigator.clipboard?.writeText(val);
    showToast('Device Identifier disalin!', 'success');
  });

  // ── Register Another Rider ──
  document.getElementById('btnRegisterAnother')?.addEventListener('click', () => {
    document.getElementById('regName').value = '';
    document.getElementById('regPhone').value = '';
    successCard.style.display = 'none';
    formCard.style.display = 'block';
    window.scrollTo({ top: formCard.offsetTop - 40, behavior: 'smooth' });
  });

  // Initial load
  loadEvents();
}

window.renderRegisterPage = renderRegisterPage;
