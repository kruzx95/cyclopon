/**
 * /share — Activity Share Studio.
 *
 * Upload a GPX/TCX file, pick one of three themes and three canvas sizes,
 * then download a PNG or send it through the Web Share sheet.
 * The file is parsed entirely in the browser: nothing is uploaded.
 */

function renderSharePage() {
  const app = document.getElementById('app');
  if (!app) return;
  if (!window.CardModel || !window.CardRenderer || !window.CardTemplates) {
    app.innerHTML = '<div class="share-page"><p class="share-status">Modul kartu gagal dimuat. Muat ulang halaman.</p></div>';
    return;
  }

  const templates = window.CardTemplates;
  const cardModel = window.CardModel;
  const renderer = window.CardRenderer;

  app.innerHTML = `
    <div class="share-page">
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <img src="/icons/logo-emblem.svg" alt="CycloPon Logo" class="brand-logo-emblem" width="32" height="32">
          <div class="brand-name-group">
            <span class="brand-name">CYCLOPON</span>
            <span class="brand-spec-label">// ACTIVITY STUDIO</span>
          </div>
        </a>

        <div class="nav-actions-group">
          <a href="/share" data-link class="btn-guide-nav active" title="Buat kartu aktivitas untuk media sosial" aria-label="Buat kartu aktivitas">
            <span class="nav-label-full">KARTU AKTIVITAS</span>
            <span class="nav-label-short">KARTU</span>
          </a>

          <a href="/guide" data-link class="btn-guide-nav" title="Panduan Lengkap Pengguna &amp; Pesepeda" aria-label="Panduan pengguna">
            <span class="nav-label-full">PANDUAN</span>
            <span class="nav-label-short">PANDUAN</span>
          </a>

          <a href="/install" data-link class="btn-guide-nav" title="Tutorial Install Aplikasi PWA di HP" aria-label="Install aplikasi">
            <span class="nav-label-full">INSTALL</span>
            <span class="nav-label-short">INSTALL</span>
          </a>

          <a href="/register" data-link class="btn-register-nav" title="Daftar Menjadi Peserta Event" aria-label="Daftar event">
            <span class="nav-label-full">DAFTAR EVENT</span>
            <span class="nav-label-short">DAFTAR</span>
          </a>

          <a href="/admin" data-link class="btn-admin-nav" title="Panel Khusus Panitia Event" aria-label="Panel panitia">
            <span class="nav-label-full">PANEL PANITIA</span>
            <span class="nav-label-short">PANITIA</span>
          </a>
        </div>

        <button type="button" class="mobile-menu-btn" aria-label="Buka menu navigasi" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </nav>

      <header class="share-hero">
        <span class="share-eyebrow">ACTIVITY SHARE STUDIO</span>
        <h1 class="share-title">Jejak gowes jadi <span class="share-title-accent">kartu siap posting.</span></h1>
        <p class="share-lede">
          Unggah file GPX atau TCX. Rute, jarak, elevasi, dan waktu dihitung langsung di browser —
          file Anda tidak pernah dikirim ke server CycloPon.
        </p>
        <div class="share-privacy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>File diproses di perangkat Anda · tanpa login</span>
        </div>
      </header>

      <div class="share-workspace">
        <section class="share-controls">
          <div class="share-dropzone" id="shareDropzone" role="button" tabindex="0" aria-label="Unggah file GPX atau TCX">
            <input type="file" id="shareFileInput" accept=".gpx,.tcx,application/gpx+xml,application/vnd.garmin.tcx+xml" hidden>
            <span class="share-dropzone-icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 18v2h16v-2"/></svg>
            </span>
            <p class="share-dropzone-title">Tarik file ke sini atau <span>pilih file</span></p>
            <p class="share-dropzone-hint" id="shareFileHint">.GPX / .TCX · maks 25 MB · ekspor dari Strava, Garmin, Wahoo, atau HP</p>
          </div>

          <div class="share-field">
            <label for="shareTitleInput">Judul aktivitas</label>
            <input id="shareTitleInput" type="text" maxlength="60" placeholder="Morning Ride" autocomplete="off">
          </div>
          <div class="share-field">
            <label for="shareRiderInput">Nama rider <span>opsional</span></label>
            <input id="shareRiderInput" type="text" maxlength="40" placeholder="Nama atau bib" autocomplete="off">
          </div>

          <div class="share-block">
            <span class="share-block-label">Tema</span>
            <div class="share-chips" id="shareThemeChips" role="group" aria-label="Pilih tema kartu"></div>
          </div>

          <div class="share-block">
            <span class="share-block-label">Ukuran</span>
            <div class="share-chips share-chips-sizes" id="shareSizeChips" role="group" aria-label="Pilih ukuran kartu"></div>
          </div>

          <div class="share-actions">
            <button type="button" id="shareDownloadBtn" class="share-btn share-btn-primary" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><path d="m6 11 6 6 6-6"/><path d="M4 21h16"/></svg>
              <span>Unduh PNG</span>
            </button>
            <button type="button" id="shareShareBtn" class="share-btn share-btn-secondary" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M12 3v13"/><path d="m7 8 5-5 5 5"/></svg>
              <span>Bagikan</span>
            </button>
          </div>

          <p class="share-status" id="shareStatus" role="status">Belum ada file diunggah.</p>
          <p class="share-tip">
            Tema <strong>Brutalist Mono</strong> tetap utuh tanpa internet. Tema berpeta mengambil ubin
            OpenStreetMap langsung ke perangkat Anda (maks 24 ubin per kartu).
          </p>
        </section>

        <section class="share-stage">
          <div class="share-stage-bar">
            <span>PRATINJAU</span>
            <span class="share-stage-dim" id="shareStageDim">1080 × 1920</span>
          </div>
          <div class="share-canvas-frame" id="shareCanvasFrame" aria-busy="false">
            <canvas id="shareCanvas" width="1080" height="1920" aria-label="Pratinjau kartu aktivitas"></canvas>
            <div class="share-canvas-placeholder" id="shareCanvasPlaceholder">
              <span class="share-canvas-placeholder-icon" aria-hidden="true">🚴</span>
              <span>Unggah file GPX/TCX untuk melihat kartu</span>
            </div>
          </div>
          <p class="share-attribution" id="shareAttribution">Peta © OpenStreetMap contributors</p>
        </section>
      </div>

      <!-- ── Pro Editorial Footer ── -->
      <footer class="landing-footer">
        <div class="footer-inner">
          <div class="footer-left">
            <a href="/" data-link class="footer-brand-lockup">
              <img src="/icons/logo-emblem.svg" alt="CycloPon" class="footer-logo" width="28" height="28">
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
const byId = (id) => document.getElementById(id);
  const dropzone = byId('shareDropzone');
  const fileInput = byId('shareFileInput');
  const fileHint = byId('shareFileHint');
  const titleInput = byId('shareTitleInput');
  const riderInput = byId('shareRiderInput');
  const themeChips = byId('shareThemeChips');
  const sizeChips = byId('shareSizeChips');
  const downloadBtn = byId('shareDownloadBtn');
  const shareBtn = byId('shareShareBtn');
  const statusEl = byId('shareStatus');
  const stageDim = byId('shareStageDim');
  const frame = byId('shareCanvasFrame');
  const placeholder = byId('shareCanvasPlaceholder');
  const canvas = byId('shareCanvas');
  const attributionEl = byId('shareAttribution');

  const state = {
    model: null,
    fallbackTitle: '',
    templateId: templates.CARD_TEMPLATES[0].id,
    sizeId: 'story',
    renderSeq: 0,
    controller: null,
    debounce: null,
    busy: false,
    lastBlob: null,
    lastBlobKey: '',
    unmounted: false,
    fileName: ''
  };

  function renderChips() {
    themeChips.innerHTML = templates.CARD_TEMPLATES.map(template => `
      <button type="button" class="share-chip" data-template="${template.id}"
        aria-pressed="${template.id === state.templateId}">
        <span class="share-chip-swatch" aria-hidden="true">
          <i style="background:${template.swatch[0]}"></i>
          <i style="background:${template.swatch[1]}"></i>
          <i style="background:${template.swatch[2]}"></i>
        </span>
        <span class="share-chip-text">
          <strong>${escapeHtml(template.label)}</strong>
          <em>${escapeHtml(template.tagline)}</em>
        </span>
      </button>
    `).join('');

    sizeChips.innerHTML = templates.CARD_SIZE_ORDER.map(sizeId => {
      const size = templates.getCardSize(sizeId);
      return `
        <button type="button" class="share-chip share-chip-compact" data-size="${size.id}"
          aria-pressed="${size.id === state.sizeId}">
          <span class="share-chip-text">
            <strong>${escapeHtml(size.label)}</strong>
            <em>${size.width} × ${size.height}</em>
          </span>
        </button>
      `;
    }).join('');
  }

  function updateStageMeta() {
    const size = templates.getCardSize(state.sizeId);
    stageDim.textContent = `${size.width} × ${size.height}`;
    canvas.style.aspectRatio = size.ratio;
  }

  function setBusy(busy) {
    state.busy = busy;
    frame.setAttribute('aria-busy', busy ? 'true' : 'false');
    frame.classList.toggle('is-busy', busy);
    const hasModel = !!state.model;
    downloadBtn.disabled = !hasModel || busy;
    shareBtn.disabled = !hasModel || busy;
    if (busy) {
      statusEl.textContent = 'Menyiapkan peta dan menggambar kartu…';
      return;
    }
    if (!state.model) {
      statusEl.textContent = 'Belum ada file diunggah.';
      return;
    }
    const stats = state.model.stats;
    const parts = [`${cardModel.formatDistance(stats.distanceKm)} km`];
    const duration = cardModel.formatDuration(stats.movingSec || stats.elapsedSec);
    if (duration) parts.push(duration);
    if (stats.elevGainM > 0) parts.push(`${stats.elevGainM} m gain`);
    statusEl.textContent = `Siap dibagikan · ${parts.join(' · ')}`;
  }
async function drawPreview() {
    if (!state.model) return;

    if (state.controller) state.controller.abort();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    state.controller = controller;
    const seq = ++state.renderSeq;

    updateStageMeta();
    setBusy(true);

    try {
      const result = await renderer.renderActivityCard({
        canvas,
        model: state.model,
        templateId: state.templateId,
        sizeId: state.sizeId,
        options: {
          maxTiles: 24,
          timeoutMs: 6000,
          signal: controller ? controller.signal : null
        }
      });
      if (seq !== state.renderSeq || state.unmounted) return;

      state.lastBlob = null;
      state.lastBlobKey = '';
      placeholder.classList.add('is-hidden');

      if (result.usedFallbackMap) {
        attributionEl.textContent = 'Basemap tidak tersedia — kartu memakai route art lokal.';
      } else if (result.attribution) {
        attributionEl.textContent = `Peta ${result.attribution}`;
      } else {
        attributionEl.textContent = 'Tema tanpa basemap · route art digambar dari file Anda.';
      }
    } catch (err) {
      if (seq !== state.renderSeq || state.unmounted) return;
      if (err && err.name === 'AbortError') return;
      showToast(err && err.message ? err.message : 'Gagal menggambar kartu.', 'error');
    } finally {
      if (seq === state.renderSeq) setBusy(false);
    }
  }

  function scheduleDraw() {
    if (!state.model) return;
    if (state.debounce) clearTimeout(state.debounce);
    state.debounce = setTimeout(() => {
      state.debounce = null;
      drawPreview();
    }, 220);
  }

  function applyTextInputs() {
    if (!state.model) return;
    state.model.title = titleInput.value.trim() || state.fallbackTitle;
    state.model.riderName = riderInput.value.trim();
    state.lastBlob = null;
    scheduleDraw();
  }

  function loadFile(file) {
    if (!file || state.unmounted) return;
    if (!/\.(gpx|tcx)$/i.test(file.name || '')) {
      showToast('Format harus .gpx atau .tcx', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('File terlalu besar (maksimal 25 MB).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => showToast('File tidak bisa dibaca. Coba file lain.', 'error');
    reader.onload = () => {
      if (state.unmounted) return;
      try {
        const text = String(reader.result || '');
        const parsed = cardModel.buildCardModel({
          fileName: file.name,
          text,
          riderName: riderInput.value.trim()
        });
        const typedTitle = titleInput.value.trim();
        state.fallbackTitle = parsed.title;
        if (typedTitle) parsed.title = typedTitle;
        else titleInput.value = parsed.title;

        state.model = parsed;
        state.fileName = file.name;
        state.lastBlob = null;
        state.lastBlobKey = '';

        dropzone.classList.add('has-file');
        fileHint.innerHTML = `<strong>${escapeHtml(file.name)}</strong> · ${parsed.points.length.toLocaleString('id-ID')} titik · ${cardModel.formatDistance(parsed.stats.distanceKm)} km`;
        drawPreview();
      } catch (err) {
        state.model = null;
        dropzone.classList.remove('has-file');
        setBusy(false);
        showToast(err && err.message ? err.message : 'File tidak bisa dibaca.', 'error');
      }
    };
    reader.readAsText(file);
  }
function fileNameForExport() {
    const slug = String(state.model && state.model.title ? state.model.title : 'aktivitas')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'aktivitas';
    const size = templates.getCardSize(state.sizeId);
    return `CycloPon_${slug}_${size.width}x${size.height}.png`;
  }

  async function getPngBlob() {
    if (!state.model) throw new Error('Unggah file terlebih dahulu.');
    const key = [state.templateId, state.sizeId, state.model.title, state.model.riderName, state.fileName].join('|');
    if (state.lastBlob && state.lastBlobKey === key) return state.lastBlob;
    const blob = await renderer.canvasToPngBlob(canvas);
    state.lastBlob = blob;
    state.lastBlobKey = key;
    return blob;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function handleDownload() {
    if (!state.model) return;
    const label = downloadBtn.querySelector('span');
    const previousLabel = label.textContent;
    downloadBtn.disabled = true;
    label.textContent = 'Menyiapkan…';
    try {
      const blob = await getPngBlob();
      downloadBlob(blob, fileNameForExport());
      showToast('PNG siap diposting 🚴', 'success');
    } catch (err) {
      showToast(err && err.message ? err.message : 'Gagal mengunduh PNG.', 'error');
    } finally {
      label.textContent = previousLabel;
      downloadBtn.disabled = !state.model || state.busy;
    }
  }

  async function handleShare() {
    if (!state.model) return;
    const caption = cardModel.formatCaption(state.model);

    let blob = null;
    try {
      blob = await getPngBlob();
    } catch (err) {
      showToast(err && err.message ? err.message : 'Gagal membuat PNG.', 'error');
      return;
    }

    const filename = fileNameForExport();
    const file = typeof File !== 'undefined' ? new File([blob], filename, { type: 'image/png' }) : null;

    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: state.model.title, text: caption });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: state.model.title, text: caption, url: `${window.location.origin}/share` });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    downloadBlob(blob, filename);
    try {
      await navigator.clipboard.writeText(caption);
      showToast('PNG diunduh & caption disalin ke clipboard.', 'success');
    } catch (err) {
      showToast('PNG diunduh. Salin caption secara manual.', 'success');
    }
  }

  /* ───────────────────────────── wiring ───────────────────────────── */

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    loadFile(file);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  });
  ['dragleave', 'dragend'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('is-dragging'));
  });
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
    const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    loadFile(file);
  });

  titleInput.addEventListener('input', applyTextInputs);
  riderInput.addEventListener('input', applyTextInputs);

  themeChips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-template]');
    if (!button) return;
    state.templateId = button.dataset.template;
    themeChips.querySelectorAll('[data-template]').forEach(chip => {
      chip.setAttribute('aria-pressed', chip === button ? 'true' : 'false');
    });
    state.lastBlob = null;
    drawPreview();
  });

  sizeChips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-size]');
    if (!button) return;
    state.sizeId = button.dataset.size;
    sizeChips.querySelectorAll('[data-size]').forEach(chip => {
      chip.setAttribute('aria-pressed', chip === button ? 'true' : 'false');
    });
    state.lastBlob = null;
    drawPreview();
  });

  downloadBtn.addEventListener('click', handleDownload);
  shareBtn.addEventListener('click', handleShare);

  renderChips();
  updateStageMeta();
  setBusy(false);

  if (typeof Router !== 'undefined' && typeof Router.onUnmount === 'function') {
    Router.onUnmount(() => {
      state.unmounted = true;
      if (state.controller) state.controller.abort();
      if (state.debounce) clearTimeout(state.debounce);
      state.lastBlob = null;
    });
  }
}