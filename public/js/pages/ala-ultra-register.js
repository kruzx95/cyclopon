/**
 * ALA-ALA ULTRA 2027 Dedicated Participant Registration Page (/ala-ala-ultra)
 * Preserves the exact registration brief text from SUDDENLY.CC while enforcing
 * anti-slop typography, accessibility, mobile reflow, and Race Control live config.
 */

function renderAlaUltraRegisterPage() {
  const app = document.getElementById('app');
  if (!app) return;

  document.title = 'ALA-ALA ULTRA 2027 - Formulir Pendaftaran Peserta | CycloPon';

  const escapeHtml = window.escapeHtml || function (str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  function formatRupiahOrRaw(val) {
    if (!val) return '[DIISI PANITIA]';
    const raw = String(val).trim();
    if (/^\d+$/.test(raw)) {
      return `Rp ${Number(raw).toLocaleString('id-ID')}`;
    }
    return raw;
  }

  function safeHttpUrl(str) {
    if (!str) return null;
    try {
      const parsed = new URL(String(str).trim());
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname ? parsed.href : null;
    } catch {
      return null;
    }
  }

  function formatDateDisplay(ymd, fallback) {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return fallback || 'TBA';
    try {
      const [y, m, d] = ymd.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      return dt.toLocaleDateString('id-ID', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return ymd;
    }
  }

  const SECTIONS = [
    { num: 1, shortName: 'Data Diri', title: 'SECTION 1 - DATA DIRI PESERTA' },
    { num: 2, shortName: 'Darurat', title: 'SECTION 2 - KONTAK DARURAT' },
    { num: 3, shortName: 'Strava', title: 'SECTION 3 - PROFIL DAN PENGALAMAN BERSEPEDA' },
    { num: 4, shortName: 'Keselamatan', title: 'SECTION 4 - KESELAMATAN DAN PERLENGKAPAN' },
    { num: 5, shortName: 'Persetujuan', title: 'SECTION 5 - PERSETUJUAN PESERTA' },
    { num: 6, shortName: 'Pembayaran', title: 'SECTION 6 - DATA PEMBAYARAN' }
  ];

  const DRAFT_STORAGE_KEY = 'cyclopon_ala_ultra_2027_draft_v1';

  const state = {
    loading: true,
    loadError: null,
    config: null,
    step: 1,
    maxReached: 1,
    restoredDraft: false,
    hasSavedDraft: false,
    blockedReason: null, // 'safety' | 'terms' | null
    submittedReg: null,
    submittedWaGroupLink: null,
    submitting: false,
    errorMsg: '',
    fieldErrors: {},
    proofFile: null,
    proofPreviewUrl: '',
    form: {
      full_name: '',
      birth_date: '',
      gender: '',
      whatsapp: '',
      email: '',
      city: '',
      instagram: '',
      community: '',
      emergency_name: '',
      emergency_relation: '',
      emergency_whatsapp: '',
      bike_type: '',
      strava_profile_url: '',
      strava_activity_url: '',
      longest_distance_km: '',
      has_ultra_experience: '',
      past_events: '',
      bike_roadworthy: '',
      has_helmet_gear: '',
      medical_conditions: '',
      terms_agreed: '',
      media_consent: '',
      payer_account_name: '',
      payment_amount: '',
      payment_date: ''
    }
  };

  function hasAnyDraftValue() {
    if (state.step > 1 || state.maxReached > 1) return true;
    return Object.values(state.form).some(v => String(v || '').trim() !== '');
  }

  function saveDraft() {
    try {
      if (!hasAnyDraftValue()) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        state.hasSavedDraft = false;
        return;
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        step: state.step,
        maxReached: state.maxReached,
        form: state.form
      }));
      state.hasSavedDraft = true;
    } catch {}
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    state.restoredDraft = false;
    state.hasSavedDraft = false;
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const formObj = parsed.form && typeof parsed.form === 'object' ? parsed.form : {};
      let restoredAny = false;
      Object.keys(state.form).forEach(k => {
        if (typeof formObj[k] === 'string' && formObj[k] !== '') {
          state.form[k] = formObj[k];
          restoredAny = true;
        }
      });
      const stepNum = Number(parsed.step);
      const maxNum = Number(parsed.maxReached);
      if (Number.isInteger(stepNum) && stepNum >= 1 && stepNum <= 6) {
        state.step = stepNum;
        if (stepNum > 1) restoredAny = true;
      }
      if (Number.isInteger(maxNum) && maxNum >= state.step && maxNum <= 6) {
        state.maxReached = maxNum;
      } else {
        state.maxReached = state.step;
      }
      if (restoredAny) {
        state.restoredDraft = true;
        state.hasSavedDraft = true;
      }
    } catch {}
  }

  loadDraft();

  app.innerHTML = `
    <div class="aau-page">
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <img src="/icons/cyclopon-mark.svg" alt="" width="28" height="28" class="brand-logo-mark">
          <div class="brand-name-group">
            <span class="brand-name">CYCLOPON</span>
          </div>
        </a>

        <div class="nav-actions-group">
          <a href="/" data-link class="btn-guide-nav" title="Kembali ke Beranda" aria-label="Beranda">
            <span class="nav-label-full">BERANDA</span>
            <span class="nav-label-short">BERANDA</span>
          </a>

          <a href="/ala-ala-ultra" data-link class="btn-guide-nav active" title="Pendaftaran Peserta ALA-ALA ULTRA 2027" aria-label="ALA-ALA ULTRA">
            <span class="nav-label-full">ALA-ALA ULTRA</span>
            <span class="nav-label-short">ALA-ALA ULTRA</span>
          </a>

          <a href="/share" data-link class="btn-guide-nav" title="Buat Ride Card peserta event untuk media sosial" aria-label="Buat Ride Card">
            <span class="nav-label-full">RIDE CARD</span>
            <span class="nav-label-short">RIDE CARD</span>
          </a>

          <a href="/install" data-link class="btn-guide-nav" title="Tutorial Install Aplikasi PWA di HP" aria-label="Install aplikasi">
            <span class="nav-label-full">INSTALL</span>
            <span class="nav-label-short">INSTALL</span>
          </a>

          <a href="/register" data-link class="btn-register-nav" title="Daftar Menjadi Peserta Event" aria-label="Daftar">
            <span class="nav-label-full">DAFTAR</span>
            <span class="nav-label-short">DAFTAR</span>
          </a>
        </div>

        <button type="button" class="mobile-menu-btn" aria-label="Buka menu navigasi" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </nav>

      <main class="aau-main" id="aauRoot"></main>

      <footer class="landing-footer">
        <div class="footer-inner">
          <div class="footer-left">
            <a href="/" data-link class="footer-brand-lockup">
              <img src="/icons/cyclopon-mark.svg" alt="" width="28" height="28" class="brand-logo-mark">
              <div class="footer-brand-info">
                <span class="footer-brand-title">CYCLOPON</span>
                <span class="footer-brand-tagline">PRECISION LIVE TELEMETRY FOR CYCLING EVENTS</span>
              </div>
            </a>
          </div>

          <div class="footer-right">
            <div class="footer-meta-row">
              <span class="footer-chip">POWERED BY TRACCAR ENGINE</span>
              <span class="footer-sep">·</span>
              <span class="footer-author">CREATED BY <a href="https://www.instagram.com/kruzamidiwinata/" target="_blank" rel="noopener noreferrer" class="footer-author-link" title="Instagram @kruzamidiwinata">@KRUZAMIDIWINATA</a></span>
            </div>
            <div class="footer-copy">© 2026 CYCLOPON TELEMETRY · ALL RIGHTS RESERVED</div>
          </div>
        </div>
      </footer>
    </div>
  `;

  const rootEl = document.getElementById('aauRoot');

  function renderBanner(cfg) {
    const isOpen = cfg ? cfg.can_register : true;
    const statusLabel = !cfg
      ? 'MEMERIKSA STATUS'
      : cfg.effective_status === 'open'
        ? 'PENDAFTARAN DIBUKA'
        : cfg.effective_status === 'quota_full'
          ? 'KUOTA PENUH'
          : cfg.effective_status === 'expired'
            ? 'PENDAFTARAN BERAKHIR'
            : 'PENDAFTARAN DITUTUP';

    const openDateDisplay = cfg?.open_date === '2026-11-30'
      ? '30 November 2026'
      : formatDateDisplay(cfg?.open_date, '30 November 2026');

    const closeDateRow = cfg?.close_date
      ? `<div class="aau-spec-row"><dt>Pendaftaran Ditutup</dt><dd>${escapeHtml(formatDateDisplay(cfg.close_date, cfg.close_date))}</dd></div>`
      : '';

    const quotaRow = cfg?.max_quota
      ? `<div class="aau-spec-row"><dt>Kuota Peserta</dt><dd class="mono">${Number(cfg.registered_count || 0)} / ${Number(cfg.max_quota)}</dd></div>`
      : '';

    const minKmRow = cfg?.min_strava_km
      ? `<div class="aau-spec-row"><dt>Syarat Minimal Strava</dt><dd class="mono">${Number(cfg.min_strava_km)} KM</dd></div>`
      : '';

    return `
      <section class="aau-dossier-banner" aria-labelledby="aauFormTitle">
        <div class="aau-dossier-intro">
          <div class="aau-org-line">
            <span class="aau-org-tag">SUDDENLY.CC</span>
            <span class="aau-status-badge ${isOpen ? 'is-open' : 'is-closed'}">
              <span class="aau-status-dot" aria-hidden="true"></span>
              <span>${escapeHtml(statusLabel)}</span>
            </span>
          </div>

          <h1 class="aau-hero-title" id="aauFormTitle">ALA-ALA ULTRA 2027 - FORMULIR PENDAFTARAN PESERTA</h1>

          <div class="aau-intro-copy">
            <p>Selamat datang di ALA-ALA ULTRA 2027!</p>
            <p>ALA-ALA ULTRA merupakan kegiatan bersepeda jarak jauh yang akan diselenggarakan di Tasikmalaya.</p>
            <p>Bagi teman-teman yang ingin menguji kemampuan, ketahanan fisik, dan pengalaman bersepeda, inilah kesempatan untuk menjadi bagian dari ALA-ALA ULTRA.</p>
          </div>
        </div>

        <aside class="aau-dossier-specs" aria-label="Informasi Event">
          <h2 class="aau-specs-heading">INFORMASI EVENT</h2>
          <dl class="aau-specs-list">
            <div class="aau-spec-row">
              <dt>Hari/Tanggal</dt>
              <dd>Minggu, 17 Januari 2027</dd>
            </div>
            <div class="aau-spec-row">
              <dt>Jarak</dt>
              <dd class="mono">130 KM</dd>
            </div>
            <div class="aau-spec-row">
              <dt>Total Elevasi</dt>
              <dd class="mono">2.200 Meter</dd>
            </div>
            <div class="aau-spec-row">
              <dt>Lokasi</dt>
              <dd>Tasikmalaya</dd>
            </div>
            <div class="aau-spec-row">
              <dt>Pendaftaran Dibuka</dt>
              <dd>${escapeHtml(openDateDisplay)}</dd>
            </div>
            ${closeDateRow}
            ${quotaRow}
            ${minKmRow}
          </dl>
        </aside>
      </section>

      <div class="aau-notice-box">
        <p>Silakan isi formulir dengan data yang benar dan lengkap.</p>
        <p>Pendaftaran akan diproses setelah panitia melakukan verifikasi data peserta, aktivitas Strava, dan pembayaran.</p>
        <p>Peserta yang telah dinyatakan terverifikasi akan mendapatkan undangan untuk bergabung ke grup WhatsApp resmi peserta ALA-ALA ULTRA 2027.</p>
      </div>
    `;
  }

  function renderSectionBody() {
    const f = state.form;
    const cfg = state.config || {};

    if (state.step === 1) {
      return `
        <div class="aau-section-head">
          <h2 class="aau-section-title">SECTION 1 - DATA DIRI PESERTA</h2>
          <p class="aau-section-desc">Silakan lengkapi data diri berikut untuk keperluan administrasi pendaftaran.</p>
        </div>

        <div class="aau-fields-stack">
          <div class="aau-field">
            <label class="aau-label" for="aauFullName">1. Nama lengkap sesuai KTP <span class="aau-req">*</span></label>
            <input class="aau-input" id="aauFullName" name="full_name" type="text" required maxlength="120" value="${escapeHtml(f.full_name)}" placeholder="Nama lengkap sesuai KTP">
          </div>

          <div class="aau-fields-grid-2">
            <div class="aau-field">
              <label class="aau-label" for="aauBirthDate">2. Tanggal lahir <span class="aau-req">*</span></label>
              <input class="aau-input" id="aauBirthDate" name="birth_date" type="date" required value="${escapeHtml(f.birth_date)}">
            </div>

            <fieldset class="aau-radio-group">
              <legend>3. Jenis kelamin <span class="aau-req">*</span></legend>
              <div class="aau-radio-grid">
                ${['Laki-laki', 'Perempuan'].map(opt => `
                  <label class="aau-radio-option">
                    <input type="radio" name="gender" value="${opt}" ${f.gender === opt ? 'checked' : ''} required>
                    <span>${opt}</span>
                  </label>
                `).join('')}
              </div>
            </fieldset>
          </div>

          <div class="aau-fields-grid-2">
            <div class="aau-field">
              <label class="aau-label" for="aauWhatsapp">4. Nomor WhatsApp aktif <span class="aau-req">*</span></label>
              <input class="aau-input" id="aauWhatsapp" name="whatsapp" type="tel" required maxlength="30" value="${escapeHtml(f.whatsapp)}" placeholder="08xxxxxxxxxx">
            </div>

            <div class="aau-field">
              <label class="aau-label" for="aauEmail">5. Alamat email <span class="aau-req">*</span></label>
              <input class="aau-input" id="aauEmail" name="email" type="email" required maxlength="120" value="${escapeHtml(f.email)}" placeholder="nama@email.com">
            </div>
          </div>

          <div class="aau-field">
            <label class="aau-label" for="aauCity">6. Kota/kabupaten domisili <span class="aau-req">*</span></label>
            <input class="aau-input" id="aauCity" name="city" type="text" required maxlength="100" value="${escapeHtml(f.city)}" placeholder="Kota atau kabupaten domisili">
          </div>

          <div class="aau-fields-grid-2">
            <div class="aau-field">
              <label class="aau-label" for="aauInstagram">7. Akun Instagram</label>
              <input class="aau-input" id="aauInstagram" name="instagram" type="text" maxlength="80" value="${escapeHtml(f.instagram)}" placeholder="@username (opsional)">
            </div>

            <div class="aau-field">
              <label class="aau-label" for="aauCommunity">8. Nama komunitas sepeda (jika ada)</label>
              <input class="aau-input" id="aauCommunity" name="community" type="text" maxlength="100" value="${escapeHtml(f.community)}" placeholder="Nama komunitas atau klub (opsional)">
            </div>
          </div>
        </div>
      `;
    }

    if (state.step === 2) {
      return `
        <div class="aau-section-head">
          <h2 class="aau-section-title">SECTION 2 - KONTAK DARURAT</h2>
          <p class="aau-section-desc">Informasi ini digunakan panitia apabila terjadi kondisi darurat selama kegiatan berlangsung.</p>
        </div>

        <div class="aau-fields-stack">
          <div class="aau-field">
            <label class="aau-label" for="aauEmergencyName">1. Nama kontak darurat <span class="aau-req">*</span></label>
            <input class="aau-input" id="aauEmergencyName" name="emergency_name" type="text" required maxlength="120" value="${escapeHtml(f.emergency_name)}" placeholder="Nama keluarga atau kerabat terdekat">
          </div>

          <div class="aau-fields-grid-2">
            <div class="aau-field">
              <label class="aau-label" for="aauEmergencyRelation">2. Hubungan dengan peserta <span class="aau-req">*</span></label>
              <input class="aau-input" id="aauEmergencyRelation" name="emergency_relation" type="text" required maxlength="60" value="${escapeHtml(f.emergency_relation)}" placeholder="Orang tua / Pasangan / Saudara">
            </div>

            <div class="aau-field">
              <label class="aau-label" for="aauEmergencyWhatsapp">3. Nomor WhatsApp kontak darurat <span class="aau-req">*</span></label>
              <input class="aau-input" id="aauEmergencyWhatsapp" name="emergency_whatsapp" type="tel" required maxlength="30" value="${escapeHtml(f.emergency_whatsapp)}" placeholder="08xxxxxxxxxx">
            </div>
          </div>
        </div>
      `;
    }

    if (state.step === 3) {
      return `
        <div class="aau-section-head">
          <h2 class="aau-section-title">SECTION 3 - PROFIL DAN PENGALAMAN BERSEPEDA</h2>
          <p class="aau-section-desc">Kami ingin mengetahui pengalaman dan kesiapan peserta dalam mengikuti kegiatan bersepeda jarak jauh.</p>
        </div>

        <div class="aau-fields-stack">
          <fieldset class="aau-radio-group">
            <legend>1. Jenis sepeda yang akan digunakan <span class="aau-req">*</span></legend>
            <div class="aau-radio-grid">
              ${['Road Bike', 'Gravel Bike', 'Mountain Bike', 'Lainnya'].map(opt => `
                <label class="aau-radio-option">
                  <input type="radio" name="bike_type" value="${opt}" ${f.bike_type === opt ? 'checked' : ''} required>
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
          </fieldset>

          <div class="aau-field">
            <label class="aau-label" for="aauStravaProfile">2. Tautan profil Strava <span class="aau-req">*</span></label>
            <input class="aau-input ${state.fieldErrors.strava_profile_url ? 'is-invalid' : ''}" id="aauStravaProfile" name="strava_profile_url" type="url" required maxlength="300" value="${escapeHtml(f.strava_profile_url)}" placeholder="https://www.strava.com/athletes/..." aria-invalid="${state.fieldErrors.strava_profile_url ? 'true' : 'false'}" aria-describedby="aauStravaProfileErr">
            <p class="aau-field-error" id="aauStravaProfileErr" role="alert" ${state.fieldErrors.strava_profile_url ? '' : 'hidden'}>${escapeHtml(state.fieldErrors.strava_profile_url || '')}</p>
          </div>

          <div class="aau-field">
            <label class="aau-label" for="aauStravaActivity">3. Tautan aktivitas Strava dengan jarak terjauh yang pernah ditempuh dalam satu kali perjalanan <span class="aau-req">*</span></label>
            <p class="aau-hint">Silakan salin tautan aktivitas (activity link) dari aplikasi Strava, kemudian tempelkan pada kolom jawaban. Pastikan tautan aktivitas dapat diakses oleh panitia untuk keperluan verifikasi.</p>
            <p class="aau-hint">Tidak perlu mengunggah screenshot aktivitas Strava.</p>
            <input class="aau-input ${state.fieldErrors.strava_activity_url ? 'is-invalid' : ''}" id="aauStravaActivity" name="strava_activity_url" type="url" required maxlength="300" value="${escapeHtml(f.strava_activity_url)}" placeholder="https://www.strava.com/activities/..." aria-invalid="${state.fieldErrors.strava_activity_url ? 'true' : 'false'}" aria-describedby="aauStravaActivityErr">
            <p class="aau-field-error" id="aauStravaActivityErr" role="alert" ${state.fieldErrors.strava_activity_url ? '' : 'hidden'}>${escapeHtml(state.fieldErrors.strava_activity_url || '')}</p>
          </div>

          <div class="aau-field">
            <label class="aau-label" for="aauLongestKm">4. Berapa kilometer jarak terjauh yang pernah ditempuh dalam satu kali perjalanan? <span class="aau-req">*</span></label>
            <p class="aau-hint">Isi dengan angka kilometer saja, misalnya: 130</p>
            <input class="aau-input" id="aauLongestKm" name="longest_distance_km" type="number" step="0.1" min="1" required value="${escapeHtml(f.longest_distance_km)}" placeholder="Angka dalam km">
          </div>

          <fieldset class="aau-radio-group">
            <legend>5. Apakah pernah mengikuti event bersepeda jarak jauh sebelumnya? <span class="aau-req">*</span></legend>
            <div class="aau-radio-grid">
              ${['Pernah', 'Belum pernah'].map(opt => `
                <label class="aau-radio-option">
                  <input type="radio" name="has_ultra_experience" value="${opt}" ${f.has_ultra_experience === opt ? 'checked' : ''} required>
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
          </fieldset>

          <div class="aau-field">
            <label class="aau-label" for="aauPastEvents">6. Jika pernah, sebutkan nama event yang pernah diikuti</label>
            <textarea class="aau-textarea" id="aauPastEvents" name="past_events" maxlength="1000" placeholder="Sebutkan nama event yang pernah diikuti (opsional)">${escapeHtml(f.past_events)}</textarea>
          </div>
        </div>
      `;
    }

    if (state.step === 4) {
      return `
        <div class="aau-section-head">
          <h2 class="aau-section-title">SECTION 4 - KESELAMATAN DAN PERLENGKAPAN</h2>
          <p class="aau-section-desc">Keselamatan peserta menjadi salah satu prioritas dalam pelaksanaan ALA-ALA ULTRA 2027.</p>
        </div>

        <div class="aau-fields-stack">
          <fieldset class="aau-radio-group">
            <legend>1. Apakah sepeda yang akan digunakan dalam kondisi layak jalan? <span class="aau-req">*</span></legend>
            <div class="aau-radio-grid">
              ${['Ya', 'Tidak'].map(opt => `
                <label class="aau-radio-option">
                  <input type="radio" name="bike_roadworthy" value="${opt}" ${f.bike_roadworthy === opt ? 'checked' : ''} required>
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
          </fieldset>

          <fieldset class="aau-radio-group">
            <legend>2. Apakah memiliki helm dan perlengkapan keselamatan bersepeda? <span class="aau-req">*</span></legend>
            <div class="aau-radio-grid">
              ${['Ya', 'Tidak'].map(opt => `
                <label class="aau-radio-option">
                  <input type="radio" name="has_helmet_gear" value="${opt}" ${f.has_helmet_gear === opt ? 'checked' : ''} required>
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
          </fieldset>

          <div class="aau-field">
            <label class="aau-label" for="aauMedical">3. Apakah ada kondisi kesehatan atau riwayat cedera yang perlu diketahui panitia demi keselamatan selama kegiatan?</label>
            <textarea class="aau-textarea" id="aauMedical" name="medical_conditions" maxlength="1000" placeholder="Tulis kondisi kesehatan, alergi, atau riwayat cedera jika ada (opsional)">${escapeHtml(f.medical_conditions)}</textarea>
          </div>

          ${cfg.insurance_note ? `
            <div class="aau-alert-warn">
              <strong>Catatan Asuransi Panitia:</strong> ${escapeHtml(cfg.insurance_note)}
            </div>
          ` : ''}
        </div>
      `;
    }

    if (state.step === 5) {
      return `
        <div class="aau-section-head">
          <h2 class="aau-section-title">SECTION 5 - PERSETUJUAN PESERTA</h2>
        </div>

        <div class="aau-waiver-box">
          <p class="aau-waiver-lead">Dengan mendaftar sebagai peserta ALA-ALA ULTRA 2027, saya menyatakan bahwa:</p>
          <ol class="aau-waiver-list">
            <li>Saya memberikan data pendaftaran yang benar dan dapat dipertanggungjawabkan.</li>
            <li>Saya memahami bahwa ALA-ALA ULTRA merupakan kegiatan bersepeda jarak jauh yang memiliki risiko fisik dan keselamatan.</li>
            <li>Saya memastikan kondisi fisik dan kesehatan saya cukup untuk mengikuti kegiatan.</li>
            <li>Saya bertanggung jawab atas kondisi dan kelayakan sepeda serta perlengkapan yang digunakan.</li>
            <li>Saya bersedia mengikuti seluruh peraturan dan arahan panitia.</li>
            <li>Saya bersedia mengikuti pengarahan teknis dan pemeriksaan perlengkapan apabila dijadwalkan panitia.</li>
            <li>Saya memahami bahwa panitia berhak mengambil keputusan demi keselamatan peserta selama kegiatan berlangsung.</li>
          </ol>
        </div>

        <div class="aau-fields-stack">
          <fieldset class="aau-radio-group">
            <legend>Apakah Anda menyetujui seluruh ketentuan di atas? <span class="aau-req">*</span></legend>
            <div class="aau-radio-stack">
              ${['Saya menyatakan setuju.', 'Saya tidak setuju.'].map(opt => `
                <label class="aau-radio-option">
                  <input type="radio" name="terms_agreed" value="${opt}" ${f.terms_agreed === opt ? 'checked' : ''} required>
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
          </fieldset>

          <fieldset class="aau-radio-group">
            <legend><strong>Persetujuan Dokumentasi</strong><br>Apakah Anda bersedia apabila foto dan video yang menampilkan diri Anda selama kegiatan digunakan untuk dokumentasi dan publikasi ALA-ALA ULTRA 2027? <span class="aau-req">*</span></legend>
            <div class="aau-radio-grid">
              ${['Bersedia', 'Tidak bersedia'].map(opt => `
                <label class="aau-radio-option">
                  <input type="radio" name="media_consent" value="${opt}" ${f.media_consent === opt ? 'checked' : ''} required>
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
          </fieldset>
        </div>
      `;
    }

    // Section 6
    const feeDisplay = formatRupiahOrRaw(cfg.fee_amount);
    const bankDisplay = cfg.bank_name || '[DIISI PANITIA]';
    const holderDisplay = cfg.account_holder || '[DIISI PANITIA]';
    const accNumDisplay = cfg.account_number || '[DIISI PANITIA]';

    return `
      <div class="aau-section-head">
        <h2 class="aau-section-title">SECTION 6 - DATA PEMBAYARAN</h2>
        <p class="aau-section-desc">Silakan lakukan pembayaran biaya pendaftaran ke rekening panitia. Setelah melakukan pembayaran, unggah bukti transfer melalui formulir ini.</p>
      </div>

      <div class="aau-payment-info-box">
        <h3 class="aau-payment-heading">INFORMASI PEMBAYARAN</h3>
        <div class="aau-payment-grid">
          <div class="aau-payment-cell">
            <span class="aau-payment-lbl">Biaya Pendaftaran</span>
            <span class="aau-payment-val mono">${escapeHtml(feeDisplay)}</span>
          </div>
          <div class="aau-payment-cell">
            <span class="aau-payment-lbl">Bank/Metode Pembayaran</span>
            <span class="aau-payment-val">${escapeHtml(bankDisplay)}</span>
          </div>
          <div class="aau-payment-cell">
            <span class="aau-payment-lbl">Atas Nama</span>
            <span class="aau-payment-val">${escapeHtml(holderDisplay)}</span>
          </div>
          <div class="aau-payment-cell">
            <span class="aau-payment-lbl">Nomor Rekening</span>
            <div class="aau-payment-val-row">
              <span class="aau-payment-val mono" id="aauAccNumberText">${escapeHtml(accNumDisplay)}</span>
              ${cfg.account_number ? `<button type="button" class="aau-btn-copy" id="btnCopyAauAccount">Salin</button>` : ''}
            </div>
          </div>
        </div>
      </div>

      ${(cfg.min_strava_km || cfg.refund_policy) ? `
        <div class="aau-alert-warn" style="margin-bottom:18px">
          ${cfg.min_strava_km ? `<p style="margin:0 0 4px"><strong>Syarat Verifikasi Strava:</strong> Minimal aktivitas terjauh ${Number(cfg.min_strava_km)} KM dengan tautan publik.</p>` : ''}
          ${cfg.refund_policy ? `<p style="margin:0"><strong>Ketentuan Pembatalan &amp; Verifikasi:</strong> ${escapeHtml(cfg.refund_policy)}</p>` : ''}
        </div>
      ` : ''}

      <div class="aau-fields-stack">
        <div class="aau-field">
          <label class="aau-label" for="aauPayerName">1. Nama pemilik rekening pengirim <span class="aau-req">*</span></label>
          <input class="aau-input" id="aauPayerName" name="payer_account_name" type="text" required maxlength="120" value="${escapeHtml(f.payer_account_name)}" placeholder="Nama sesuai rekening pengirim">
        </div>

        <div class="aau-fields-grid-2">
          <div class="aau-field">
            <label class="aau-label" for="aauPayAmount">2. Nominal pembayaran <span class="aau-req">*</span></label>
            <input class="aau-input" id="aauPayAmount" name="payment_amount" type="number" min="1" step="1" required value="${escapeHtml(f.payment_amount)}" placeholder="Nominal angka" aria-describedby="aauPayAmountHint">
            <p class="aau-hint" id="aauPayAmountHint">Tulis angka saja tanpa titik atau Rp, contoh: 250000</p>
          </div>

          <div class="aau-field">
            <label class="aau-label" for="aauPayDate">3. Tanggal pembayaran <span class="aau-req">*</span></label>
            <input class="aau-input" id="aauPayDate" name="payment_date" type="date" required value="${escapeHtml(f.payment_date)}">
          </div>
        </div>

        <div class="aau-field">
          <label class="aau-label" for="aauProofFile">4. Unggah bukti transfer pembayaran <span class="aau-req">*</span></label>
          <p class="aau-hint">Pastikan bukti transfer memperlihatkan informasi nominal dan tanggal transaksi dengan jelas.</p>
          <p class="aau-hint">Peserta tidak perlu mengirim ulang bukti transfer melalui WhatsApp.</p>
          <div class="aau-file-box">
            <input class="aau-file-input-hidden" id="aauProofFile" name="payment_proof" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf">
            <label class="aau-file-trigger" for="aauProofFile">
              ${state.proofFile ? 'Ganti Berkas Bukti Transfer' : 'Pilih Berkas (JPG, PNG, atau PDF)'}
            </label>
            <div class="aau-file-meta" id="aauFileMeta">
              ${state.proofFile
                ? `${escapeHtml(state.proofFile.name)} (${Math.max(1, Math.round(state.proofFile.size / 1024))} KB)`
                : 'Maksimal 1 file, ukuran maksimal 10 MB.'}
            </div>
            ${state.proofPreviewUrl ? `<img src="${state.proofPreviewUrl}" alt="Pratinjau bukti transfer" class="aau-file-preview">` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function syncInputsFromDom() {
    if (!rootEl) return;
    const textInputs = rootEl.querySelectorAll('input[name], textarea[name], select[name]');
    textInputs.forEach(el => {
      if (el.type === 'file') return;
      if (el.type === 'radio') {
        if (el.checked) state.form[el.name] = el.value;
      } else {
        state.form[el.name] = el.value;
      }
    });
  }

  function checkStravaField(value, kind) {
    if (typeof window.validateStravaUrl === 'function') {
      return window.validateStravaUrl(value, kind);
    }
    try {
      const u = new URL(String(value || '').trim());
      if (u.protocol !== 'https:') return { valid: false, error: 'Tautan Strava wajib diawali https://' };
      return { valid: true, error: '' };
    } catch {
      return { valid: false, error: 'Format tautan Strava tidak valid.' };
    }
  }

  function validateCurrentSection() {
    syncInputsFromDom();
    const f = state.form;
    state.errorMsg = '';
    state.fieldErrors = {};

    if (state.step === 1) {
      if (!f.full_name.trim()) return 'Nama lengkap sesuai KTP wajib diisi.';
      if (!f.birth_date) return 'Tanggal lahir wajib diisi.';
      if (!f.gender) return 'Jenis kelamin wajib dipilih.';
      const waDigits = f.whatsapp.replace(/\D/g, '');
      if (waDigits.length < 9 || waDigits.length > 16) return 'Nomor WhatsApp aktif tidak valid (minimal 9 digit angka).';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return 'Alamat email tidak valid.';
      if (!f.city.trim()) return 'Kota/kabupaten domisili wajib diisi.';
    } else if (state.step === 2) {
      if (!f.emergency_name.trim()) return 'Nama kontak darurat wajib diisi.';
      if (!f.emergency_relation.trim()) return 'Hubungan dengan peserta wajib diisi.';
      const emgDigits = f.emergency_whatsapp.replace(/\D/g, '');
      if (emgDigits.length < 9 || emgDigits.length > 16) return 'Nomor WhatsApp kontak darurat tidak valid (minimal 9 digit angka).';
    } else if (state.step === 3) {
      if (!f.bike_type) return 'Jenis sepeda wajib dipilih.';
      const profRes = checkStravaField(f.strava_profile_url, 'profile');
      const actRes = checkStravaField(f.strava_activity_url, 'activity');
      if (!profRes.valid) state.fieldErrors.strava_profile_url = profRes.error;
      if (!actRes.valid) state.fieldErrors.strava_activity_url = actRes.error;
      if (!profRes.valid) return profRes.error;
      if (!actRes.valid) return actRes.error;
      const km = Number(f.longest_distance_km);
      if (!Number.isFinite(km) || km <= 0) return 'Jarak terjauh harus diisi dengan angka lebih dari 0.';
      if (!f.has_ultra_experience) return 'Pilih apakah pernah mengikuti event bersepeda jarak jauh sebelumnya.';
    } else if (state.step === 4) {
      if (!f.bike_roadworthy) return 'Pilih apakah sepeda dalam kondisi layak jalan.';
      if (!f.has_helmet_gear) return 'Pilih apakah memiliki helm dan perlengkapan keselamatan bersepeda.';
      if (f.bike_roadworthy === 'Tidak' || f.has_helmet_gear === 'Tidak') {
        state.blockedReason = 'safety';
        return null;
      }
    } else if (state.step === 5) {
      if (!f.terms_agreed) return 'Pilih persetujuan ketentuan terlebih dahulu.';
      if (f.terms_agreed === 'Saya tidak setuju.') {
        state.blockedReason = 'terms';
        return null;
      }
      if (!f.media_consent) return 'Pilih persetujuan dokumentasi terlebih dahulu.';
    } else if (state.step === 6) {
      if (!f.payer_account_name.trim()) return 'Nama pemilik rekening pengirim wajib diisi.';
      const amt = Number(f.payment_amount);
      if (!Number.isFinite(amt) || amt <= 0) return 'Nominal pembayaran harus diisi angka lebih dari 0.';
      if (!f.payment_date) return 'Tanggal pembayaran wajib diisi.';
      if (!state.proofFile) return 'Unggah bukti transfer pembayaran terlebih dahulu (JPG, PNG, atau PDF).';
    }
    return '';
  }

  async function handleSubmitForm() {
    const err = validateCurrentSection();
    if (err) {
      state.errorMsg = err;
      render();
      return;
    }
    if (state.blockedReason) {
      render();
      return;
    }

    state.submitting = true;
    state.errorMsg = '';
    render();

    try {
      const fd = new FormData();
      Object.entries(state.form).forEach(([k, v]) => {
        if (v != null) fd.append(k, String(v).trim());
      });
      fd.append('payment_proof', state.proofFile);

      const res = await fetch('/api/ala-ultra/register', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pendaftaran gagal dikirim. Periksa kembali data Anda.');
      }

      state.submittedReg = data.registration;
      state.submittedWaGroupLink = data.wa_group_link || null;
      clearDraft();
      if (state.proofPreviewUrl) {
        URL.revokeObjectURL(state.proofPreviewUrl);
        state.proofPreviewUrl = '';
      }
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof showToast === 'function') {
        showToast(`Pendaftaran berhasil diterima (${data.registration.reg_code})`, 'success');
      }
    } catch (e) {
      state.errorMsg = e.message || 'Gagal mengirim pendaftaran.';
    } finally {
      state.submitting = false;
      render();
    }
  }

  function render() {
    if (!rootEl) return;

    // 1. Loading State (R-27)
    if (state.loading) {
      rootEl.innerHTML = `
        <div class="aau-state-card" role="status" aria-live="polite">
          <h2>Memuat Formulir Pendaftaran</h2>
          <p>Mengambil informasi jadwal, kuota, dan detail pembayaran terbaru untuk ALA-ALA ULTRA 2027...</p>
        </div>
      `;
      return;
    }

    // 2. Error State (R-27)
    if (state.loadError) {
      rootEl.innerHTML = `
        <div class="aau-state-card" role="alert">
          <h2>Gagal Memuat Formulir</h2>
          <p>${escapeHtml(state.loadError)}</p>
          <button type="button" class="aau-btn-primary" id="btnRetryAauLoad">Muat Ulang Halaman</button>
        </div>
      `;
      document.getElementById('btnRetryAauLoad')?.addEventListener('click', loadConfig);
      return;
    }

    const cfg = state.config || {};
    const bannerHtml = renderBanner(cfg);

    // 3. Confirmation Screen (Bagian C exact wording)
    if (state.submittedReg) {
      const safeGroupUrl = safeHttpUrl(state.submittedWaGroupLink);
      const joinGroupBoxHtml = safeGroupUrl
        ? `
          <div class="aau-group-join-box" id="aauGroupJoinBox">
            <div class="aau-group-join-info">
              <div class="aau-group-join-title">Grup WhatsApp Resmi Peserta</div>
              <p class="aau-group-join-desc">Klik tombol berikut untuk bergabung ke grup peserta ALA-ALA ULTRA 2027.</p>
            </div>
            <a href="${escapeHtml(safeGroupUrl)}" target="_blank" rel="noopener noreferrer" class="aau-btn-primary aau-btn-join-group" id="btnAauJoinGroup">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Gabung Grup WhatsApp Peserta</span>
            </a>
          </div>
        `
        : `
          <div class="aau-group-join-box is-pending" id="aauGroupJoinBox">
            <div class="aau-group-join-info">
              <div class="aau-group-join-title">Grup WhatsApp Resmi Peserta</div>
              <p class="aau-group-join-desc">Tautan grup WhatsApp belum tersedia saat ini. Panitia akan mengirimkan undangan ke nomor WhatsApp yang Anda daftarkan.</p>
            </div>
          </div>
        `;

      rootEl.innerHTML = `
        ${bannerHtml}
        <section class="aau-state-card" aria-live="polite">
          <div class="aau-success-code-box">
            <div>
              <div class="aau-success-code-lbl">Nomor Registrasi Anda</div>
              <div class="aau-success-code-val">${escapeHtml(state.submittedReg.reg_code)}</div>
            </div>
            <div>
              <div class="aau-success-code-lbl">Nama Peserta</div>
              <div style="font-size:15px;font-weight:800;color:#0D1117">${escapeHtml(state.submittedReg.full_name)}</div>
            </div>
          </div>

          <div class="aau-confirm-message">
            <p><strong>TERIMA KASIH TELAH MENDAFTAR ALA-ALA ULTRA 2027!</strong></p>
            <p>Data pendaftaran Anda telah berhasil kami terima.</p>
            <p>Panitia akan melakukan verifikasi terhadap:</p>
            <ol>
              <li>Kelengkapan data peserta.</li>
              <li>Tautan profil dan aktivitas Strava.</li>
              <li>Bukti pembayaran.</li>
            </ol>
            <p>Apabila seluruh persyaratan telah terpenuhi, panitia akan mengirimkan undangan untuk bergabung ke grup WhatsApp resmi peserta melalui nomor WhatsApp yang telah didaftarkan.</p>
            <p>Pastikan nomor WhatsApp Anda aktif dan dapat dihubungi.</p>
            <p>Mohon menunggu proses verifikasi dari panitia.</p>
            <p>Sampai bertemu di ALA-ALA ULTRA 2027!</p>
            <p><strong>SUDDENLY.CC</strong></p>
          </div>

          ${joinGroupBoxHtml}

          <div class="aau-form-actions" style="border-top:none;padding-top:0;margin-top:0">
            <a href="/" data-link class="aau-btn-secondary">Kembali ke Beranda</a>
            <button type="button" class="${safeGroupUrl ? 'aau-btn-secondary' : 'aau-btn-primary'}" id="btnAauResetForm">Daftarkan Peserta Lain</button>
          </div>
        </section>
      `;

      document.getElementById('btnAauResetForm')?.addEventListener('click', () => {
        clearDraft();
        state.submittedReg = null;
        state.submittedWaGroupLink = null;
        state.step = 1;
        state.maxReached = 1;
        state.blockedReason = null;
        state.proofFile = null;
        state.errorMsg = '';
        state.fieldErrors = {};
        Object.keys(state.form).forEach(k => { state.form[k] = ''; });
        loadConfig();
      });
      return;
    }

    // 4. Empty / Closed / Quota Full State (R-27)
    if (!cfg.can_register) {
      const closedTitle = cfg.effective_status === 'quota_full'
        ? 'Kuota Peserta ALA-ALA ULTRA 2027 Sudah Penuh'
        : cfg.effective_status === 'expired'
          ? 'Pendaftaran ALA-ALA ULTRA 2027 Telah Ditutup'
          : 'Pendaftaran ALA-ALA ULTRA 2027 Belum Dibuka / Sedang Ditutup';

      const closedDesc = cfg.effective_status === 'quota_full'
        ? `Jumlah pendaftar telah mencapai batas kuota panitia (${cfg.registered_count} / ${cfg.max_quota} peserta).`
        : 'Formulir pendaftaran saat ini tidak menerima kiriman baru. Silakan pantau pengumuman resmi dari panitia SUDDENLY.CC.';

      const waLink = cfg.admin_whatsapp
        ? `https://wa.me/${cfg.admin_whatsapp.replace(/\D/g, '').replace(/^0/, '62')}`
        : null;

      rootEl.innerHTML = `
        ${bannerHtml}
        <section class="aau-state-card">
          <h2>${escapeHtml(closedTitle)}</h2>
          <p>${escapeHtml(closedDesc)}</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px">
            <a href="/" data-link class="aau-btn-secondary">Kembali ke Beranda</a>
            ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener noreferrer" class="aau-btn-primary">Hubungi Panitia via WhatsApp</a>` : ''}
          </div>
        </section>
      `;
      return;
    }

    // 5. Blocked Branching Screen (Section 4 Safety "Tidak" or Section 5 "Saya tidak setuju.")
    if (state.blockedReason) {
      const isTerms = state.blockedReason === 'terms';
      const title = isTerms
        ? 'Pendaftaran Tidak Dapat Dilanjutkan'
        : 'Persyaratan Keselamatan Belum Terpenuhi';
      const msg = isTerms
        ? 'Persetujuan seluruh ketentuan merupakan syarat pendaftaran ALA-ALA ULTRA 2027.'
        : 'Demi keselamatan di rute 130 KM dengan total elevasi 2.200 meter, sepeda harus dalam kondisi layak jalan dan peserta wajib memiliki helm serta perlengkapan keselamatan sebelum melanjutkan pendaftaran dan pembayaran.';

      rootEl.innerHTML = `
        ${bannerHtml}
        <section class="aau-state-card" role="alert">
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(msg)}</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px">
            <button type="button" class="aau-btn-primary" id="btnBackFromBlock">Periksa Kembali Jawaban</button>
            <a href="/" data-link class="aau-btn-secondary">Kembali ke Beranda</a>
          </div>
        </section>
      `;
      document.getElementById('btnBackFromBlock')?.addEventListener('click', () => {
        state.blockedReason = null;
        render();
      });
      return;
    }

    // 6. Active Multi-Section Registration Form
    const pct = Math.round((state.step / 6) * 100);
    const activeMeta = SECTIONS[state.step - 1];

    rootEl.innerHTML = `
      ${bannerHtml}

      <div class="aau-progress-wrap" aria-label="Progres pengisian formulir">
        <div class="aau-progress-meta">
          <span class="aau-progress-label">Bagian ${state.step} dari 6 (${pct}%)</span>
          <span class="aau-progress-title">${escapeHtml(activeMeta.title)}</span>
        </div>
        <div class="aau-progress-track" role="progressbar" aria-valuenow="${state.step}" aria-valuemin="1" aria-valuemax="6">
          <div class="aau-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="aau-steps-pills">
          ${SECTIONS.map(sec => {
            const isActive = sec.num === state.step;
            const isDone = sec.num < state.step;
            const canClick = sec.num <= state.maxReached && !state.submitting;
            return `
              <button type="button"
                      class="aau-step-pill ${isActive ? 'is-active' : (isDone ? 'is-done' : '')}"
                      data-jump-step="${sec.num}"
                      ${canClick ? '' : 'disabled'}
                      aria-current="${isActive ? 'step' : 'false'}">
                <span class="aau-step-num">0${sec.num}</span>
                <span class="aau-step-name">${escapeHtml(sec.shortName)}</span>
              </button>
            `;
          }).join('')}
        </div>
        ${state.hasSavedDraft ? `
          <div class="aau-draft-bar">
            <span class="aau-draft-status">
              ${state.restoredDraft && state.step === 6 && !state.proofFile
                ? 'Isian sebelumnya dipulihkan. Mohon pilih ulang berkas bukti transfer.'
                : (state.restoredDraft
                  ? 'Isian formulir sebelumnya dipulihkan otomatis.'
                  : 'Draf isian tersimpan otomatis di perangkat Anda.')}
            </span>
            <button type="button" class="aau-btn-reset-draft" id="btnAauResetDraft">Reset Formulir</button>
          </div>
        ` : ''}
      </div>

      <form class="aau-form-card" id="aauRegForm" novalidate>
        ${renderSectionBody()}

        ${state.errorMsg ? `<div class="aau-alert-error" role="alert">${escapeHtml(state.errorMsg)}</div>` : ''}

        <div class="aau-form-actions">
          ${state.step > 1
            ? `<button type="button" class="aau-btn-secondary" id="btnAauPrev" ${state.submitting ? 'disabled' : ''}>Sebelumnya</button>`
            : `<span></span>`}

          ${state.step < 6
            ? `<button type="button" class="aau-btn-primary" id="btnAauNext">Lanjut ke Bagian ${state.step + 1}</button>`
            : `<button type="submit" class="aau-btn-primary" id="btnAauSubmit" ${state.submitting ? 'disabled' : ''}>${state.submitting ? 'Mengirim Pendaftaran...' : 'Kirim Pendaftaran'}</button>`}
        </div>
      </form>
    `;

    // Wire events for active step
    const formEl = document.getElementById('aauRegForm');

    formEl?.addEventListener('input', () => {
      syncInputsFromDom();
      saveDraft();
    });
    formEl?.addEventListener('change', () => {
      syncInputsFromDom();
      saveDraft();
    });

    document.getElementById('btnAauResetDraft')?.addEventListener('click', () => {
      if (!confirm('Kosongkan seluruh isian formulir dan mulai ulang dari Section 1?')) return;
      clearDraft();
      state.step = 1;
      state.maxReached = 1;
      state.blockedReason = null;
      state.proofFile = null;
      if (state.proofPreviewUrl) {
        URL.revokeObjectURL(state.proofPreviewUrl);
        state.proofPreviewUrl = '';
      }
      state.errorMsg = '';
      state.fieldErrors = {};
      Object.keys(state.form).forEach(k => { state.form[k] = ''; });
      render();
    });

    const wireStravaLiveCheck = (inputId, errId, fieldName, kind) => {
      const inputEl = document.getElementById(inputId);
      const errEl = document.getElementById(errId);
      if (!inputEl || !errEl) return;

      const applyInlineError = (msg) => {
        if (msg) state.fieldErrors[fieldName] = msg;
        else delete state.fieldErrors[fieldName];
        inputEl.classList.toggle('is-invalid', Boolean(msg));
        inputEl.setAttribute('aria-invalid', msg ? 'true' : 'false');
        errEl.textContent = msg;
        errEl.hidden = !msg;
      };

      inputEl.addEventListener('blur', () => {
        const raw = inputEl.value.trim();
        if (!raw && !state.fieldErrors[fieldName]) return;
        const res = checkStravaField(raw, kind);
        applyInlineError(res.valid ? '' : res.error);
      });

      inputEl.addEventListener('input', () => {
        if (!state.fieldErrors[fieldName]) return;
        const raw = inputEl.value.trim();
        if (!raw) {
          applyInlineError('');
          return;
        }
        const res = checkStravaField(raw, kind);
        applyInlineError(res.valid ? '' : res.error);
      });
    };

    wireStravaLiveCheck('aauStravaProfile', 'aauStravaProfileErr', 'strava_profile_url', 'profile');
    wireStravaLiveCheck('aauStravaActivity', 'aauStravaActivityErr', 'strava_activity_url', 'activity');

    rootEl.querySelectorAll('[data-jump-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = Number(btn.dataset.jumpStep);
        if (!target || target > state.maxReached) return;
        syncInputsFromDom();
        state.errorMsg = '';
        state.fieldErrors = {};
        state.step = target;
        saveDraft();
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    document.getElementById('btnAauPrev')?.addEventListener('click', () => {
      syncInputsFromDom();
      state.errorMsg = '';
      state.fieldErrors = {};
      state.step = Math.max(1, state.step - 1);
      saveDraft();
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btnAauNext')?.addEventListener('click', () => {
      const err = validateCurrentSection();
      if (state.blockedReason) {
        render();
        return;
      }
      if (err) {
        state.errorMsg = err;
        render();
        const firstInvalid = rootEl.querySelector('.aau-input.is-invalid, .aau-textarea.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      state.step = Math.min(6, state.step + 1);
      state.maxReached = Math.max(state.maxReached, state.step);
      saveDraft();
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btnCopyAauAccount')?.addEventListener('click', async () => {
      const acc = document.getElementById('aauAccNumberText')?.textContent?.trim();
      if (!acc) return;
      let copied = false;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(acc);
          copied = true;
        } catch {}
      }
      if (!copied) {
        try {
          const ta = document.createElement('textarea');
          ta.value = acc;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          copied = document.execCommand('copy');
          document.body.removeChild(ta);
        } catch {}
      }
      if (typeof showToast === 'function') {
        showToast(copied ? 'Nomor rekening disalin.' : 'Silakan salin nomor rekening secara manual.', copied ? 'success' : 'info');
      }
    });

    document.getElementById('aauProofFile')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(ext)) {
        state.errorMsg = 'Format file bukti transfer harus JPG, PNG, atau PDF.';
        e.target.value = '';
        render();
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        state.errorMsg = 'Ukuran file maksimal 10 MB.';
        e.target.value = '';
        render();
        return;
      }
      state.errorMsg = '';
      state.proofFile = file;
      if (state.proofPreviewUrl) {
        URL.revokeObjectURL(state.proofPreviewUrl);
        state.proofPreviewUrl = '';
      }
      if (file.type.startsWith('image/')) {
        state.proofPreviewUrl = URL.createObjectURL(file);
      }
      render();
    });

    formEl?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSubmitForm();
    });
  }

  async function loadConfig() {
    state.loading = true;
    state.loadError = null;
    render();
    try {
      const res = await fetch('/api/ala-ultra/info');
      if (!res.ok) throw new Error('Server gagal merespons data event.');
      state.config = await res.json();
    } catch (e) {
      state.loadError = e.message || 'Gagal memuat informasi pendaftaran.';
    } finally {
      state.loading = false;
      render();
    }
  }

  async function refreshConfigQuietly() {
    if (state.loading || state.submitting || state.submittedReg) return;
    try {
      const res = await fetch('/api/ala-ultra/info', { cache: 'no-store' });
      if (!res.ok) return;
      const fresh = await res.json();
      if (JSON.stringify(fresh) !== JSON.stringify(state.config)) {
        syncInputsFromDom();
        state.config = fresh;
        render();
      }
    } catch {}
  }

  const onVisibilityOrFocus = () => {
    if (document.visibilityState === 'visible') {
      refreshConfigQuietly();
    }
  };
  window.addEventListener('focus', refreshConfigQuietly);
  document.addEventListener('visibilitychange', onVisibilityOrFocus);
  if (typeof Router !== 'undefined' && typeof Router.onUnmount === 'function') {
    Router.onUnmount(() => {
      window.removeEventListener('focus', refreshConfigQuietly);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    });
  }

  loadConfig();
}

window.renderAlaUltraRegisterPage = renderAlaUltraRegisterPage;
