/**
 * Reusable Checkpoint QR Scanner Modal for Rider Hub & Cockpit HUD.
 * Supports native BarcodeDetector (Chrome/Android) with jsQR fallback (iOS Safari/Firefox),
 * plus manual checkpoint code entry and live CP progress checklist.
 */

(function () {
  function formatWibClock(isoOrStr) {
    if (!isoOrStr) return '-';
    const raw = String(isoOrStr).trim();
    if (/^\d{1,2}:\d{2}/.test(raw) && !raw.includes('T') && !raw.includes('-')) {
      return raw.slice(0, 5) + ' WIB';
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    try {
      return d.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }) + ' WIB';
    } catch {
      return raw;
    }
  }

  async function getQuickGpsCoords(timeoutMs = 4500) {
    if (window.GpsKeeper && typeof window.GpsKeeper.getLastCoord === 'function') {
      const c = window.GpsKeeper.getLastCoord();
      if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
        return { lat: c.lat, lng: c.lng };
      }
    }
    if (!('geolocation' in navigator)) return { lat: null, lng: null };
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ lat: null, lng: null });
        }
      }, timeoutMs);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({ lat: null, lng: null });
        },
        { enableHighAccuracy: true, timeout: Math.max(1500, timeoutMs - 200), maximumAge: 20000 }
      );
    });
  }

  function openCpQrScanner(options) {
    const {
      riderConfig,
      checkpoints = [],
      existingSplits = [],
      onCheckInSuccess
    } = options || {};

    if (!riderConfig || !riderConfig.rider || !riderConfig.event) {
      if (window.showToast) showToast('Sesi rider tidak aktif. Silakan login kembali.', 'error');
      return;
    }

    const oldModal = document.getElementById('cpQrScannerModal');
    if (oldModal) oldModal.remove();

    const { rider, event } = riderConfig;
    const splitsByCpId = new Map();
    (existingSplits || []).forEach(sp => {
      if (sp && sp.checkpoint_id) splitsByCpId.set(Number(sp.checkpoint_id), sp);
    });

    const sortedCps = [...checkpoints].sort((a, b) => Number(a.km_distance) - Number(b.km_distance));

    const modal = document.createElement('div');
    modal.id = 'cpQrScannerModal';
    modal.className = 'cp-scanner-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'cpScannerTitle');

    modal.innerHTML = `
      <div class="cp-scanner-dialog">
        <div class="cp-scanner-header">
          <div>
            <div class="cp-scanner-eyebrow">SELF CHECK-IN CHECKPOINT</div>
            <h2 class="cp-scanner-title" id="cpScannerTitle">Scan QR Pos Kontrol</h2>
          </div>
          <button type="button" class="cp-scanner-close" id="btnCloseCpScanner" aria-label="Tutup pemindai QR">✕</button>
        </div>

        <div class="cp-scanner-body">
          <div id="cpScannerFeedback" class="cp-scanner-feedback" style="display:none" role="status" aria-live="polite"></div>

          <div id="cpScanReceiptPanel" class="cp-scan-receipt" style="display:none" role="status" aria-live="polite"></div>

          <div class="cp-camera-stage" id="cpCameraStage">
            <video id="cpScannerVideo" class="cp-scanner-video" playsinline muted autoplay></video>
            <div class="cp-viewfinder-frame" aria-hidden="true">
              <span class="cp-vf-corner tl"></span>
              <span class="cp-vf-corner tr"></span>
              <span class="cp-vf-corner bl"></span>
              <span class="cp-vf-corner br"></span>
            </div>
            <div class="cp-camera-state" id="cpCameraState">
              <span class="cp-camera-state-text">Menyiapkan kamera perangkat...</span>
            </div>
          </div>

          <div class="cp-camera-controls" id="cpCameraControls">
            <button type="button" class="cp-ctrl-btn" id="btnRetryCamera" style="display:none">
              Coba Buka Kamera Lagi
            </button>
            <button type="button" class="cp-ctrl-btn" id="btnToggleTorch" style="display:none">
              Senter: OFF
            </button>
          </div>

          <form id="cpManualForm" class="cp-manual-form">
            <label for="cpManualCodeInput" class="cp-manual-label">Atau masukkan Kode Pos di bawah QR:</label>
            <div class="cp-manual-row">
              <input
                type="text"
                id="cpManualCodeInput"
                class="cp-manual-input"
                placeholder="Contoh: a1b2c3d4e5f6"
                autocomplete="off"
                autocapitalize="none"
                spellcheck="false"
              >
              <button type="submit" class="cp-manual-submit" id="btnCpManualSubmit">Check-In</button>
            </div>
          </form>

          <div class="cp-progress-section">
            <div class="cp-progress-head">
              <span>Daftar Pos (${splitsByCpId.size}/${sortedCps.length})</span>
              <span class="cp-progress-bib">BIB #${escapeHtml(rider.bib)}</span>
            </div>
            <div id="cpChecklistContainer" class="cp-checklist"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const videoEl = modal.querySelector('#cpScannerVideo');
    const cameraStageEl = modal.querySelector('#cpCameraStage');
    const cameraControlsEl = modal.querySelector('#cpCameraControls');
    const manualFormEl = modal.querySelector('#cpManualForm');
    const receiptPanelEl = modal.querySelector('#cpScanReceiptPanel');
    const stateEl = modal.querySelector('#cpCameraState');
    const feedbackEl = modal.querySelector('#cpScannerFeedback');
    const retryBtn = modal.querySelector('#btnRetryCamera');
    const torchBtn = modal.querySelector('#btnToggleTorch');
    const manualInput = modal.querySelector('#cpManualCodeInput');
    const manualSubmitBtn = modal.querySelector('#btnCpManualSubmit');
    const checklistEl = modal.querySelector('#cpChecklistContainer');
    const progressHeadCount = modal.querySelector('.cp-progress-head span:first-child');

    let stream = null;
    let scanTimer = null;
    let isSubmitting = false;
    let isClosed = false;
    let torchOn = false;
    let lastRejectedCode = '';
    let lastRejectedAt = 0;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const hasNativeDetector = typeof window.BarcodeDetector === 'function';
    let barcodeDetector = null;
    if (hasNativeDetector) {
      try {
        barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        barcodeDetector = null;
      }
    }

    function renderChecklist() {
      if (progressHeadCount) {
        progressHeadCount.textContent = `Daftar Pos (${splitsByCpId.size}/${sortedCps.length})`;
      }
      if (!sortedCps.length) {
        checklistEl.innerHTML = '<div class="cp-checklist-empty">Event ini belum memiliki daftar checkpoint.</div>';
        return;
      }
      checklistEl.innerHTML = sortedCps.map((cp, idx) => {
        const sp = splitsByCpId.get(Number(cp.id));
        const cpNum = `CP ${String(idx + 1).padStart(2, '0')}`;
        if (sp) {
          const isPendingVerify = sp.verification_status === 'PENDING_VERIFY';
          const isOver = sp.status === 'OVER_COT';
          const pillCls = isPendingVerify || isOver ? 'over' : 'ok';
          const pillText = isPendingVerify ? 'VERIFIKASI' : (isOver ? 'OVER COT' : 'LOLOS COT');
          return `
            <div class="cp-check-item ${isPendingVerify || isOver ? 'is-over' : 'is-done'}">
              <div class="cp-check-main">
                <span class="cp-check-code">${cpNum}</span>
                <div>
                  <div class="cp-check-name">${escapeHtml(cp.name)}</div>
                  <div class="cp-check-meta">${cp.km_distance} km · Tiba ${escapeHtml(formatWibClock(sp.arrival_time))}${isPendingVerify ? ' · Menunggu panitia' : ''}</div>
                </div>
              </div>
              <span class="cp-check-pill ${pillCls}">${pillText}</span>
            </div>
          `;
        }
        return `
          <div class="cp-check-item">
            <div class="cp-check-main">
              <span class="cp-check-code">${cpNum}</span>
              <div>
                <div class="cp-check-name">${escapeHtml(cp.name)}</div>
                <div class="cp-check-meta">${cp.km_distance} km · COT: ${escapeHtml(cp.close_time ? cp.close_time + ' WIB' : 'Tidak dibatasi')}</div>
              </div>
            </div>
            <span class="cp-check-pill pending">BELUM</span>
          </div>
        `;
      }).join('');
    }

    renderChecklist();

    function showFeedback(type, title, detail) {
      feedbackEl.style.display = 'block';
      feedbackEl.className = `cp-scanner-feedback ${type}`;
      feedbackEl.innerHTML = `
        <div class="cp-fb-title">${escapeHtml(title)}</div>
        ${detail ? `<div class="cp-fb-detail">${escapeHtml(detail)}</div>` : ''}
      `;
    }

    function stopCamera() {
      if (scanTimer) {
        clearTimeout(scanTimer);
        scanTimer = null;
      }
      if (stream) {
        stream.getTracks().forEach(t => {
          try { t.stop(); } catch {}
        });
        stream = null;
      }
      videoEl.srcObject = null;
      torchBtn.style.display = 'none';
      torchOn = false;
    }

    function closeScanner() {
      if (isClosed) return;
      isClosed = true;
      stopCamera();
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('popstate', closeScanner);
      modal.remove();
    }

    const onEsc = (e) => {
      if (e.key === 'Escape') closeScanner();
    };
    document.addEventListener('keydown', onEsc);
    window.addEventListener('popstate', closeScanner);

    modal.querySelector('#btnCloseCpScanner').addEventListener('click', closeScanner);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeScanner();
    });

    async function submitCheckin(rawCode, allowFlagged = false) {
      if (isSubmitting || isClosed) return;
      const trimmed = String(rawCode || '').trim();
      if (!trimmed) return;

      isSubmitting = true;
      manualSubmitBtn.disabled = true;
      manualSubmitBtn.textContent = 'Mengirim...';
      showFeedback(
        'loading',
        allowFlagged ? 'Mengajukan check-in darurat...' : 'Mengunci lokasi GPS & memverifikasi...',
        allowFlagged ? 'Mencatat waktu tiba untuk diverifikasi panitia.' : 'Pastikan izin lokasi aktif bila pos memakai kunci radius.'
      );

      try {
        const coords = await getQuickGpsCoords(allowFlagged ? 2000 : 4500);
        const eventPin = sessionStorage.getItem('event_pin_' + event.id) || '';
        const res = await fetch('/api/checkpoints/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(rider.token ? { 'x-rider-token': rider.token } : {}),
            ...(eventPin ? { 'x-event-pin': eventPin } : {})
          },
          body: JSON.stringify({
            qr_token: trimmed,
            rider_token: rider.token || undefined,
            bib: !rider.token ? rider.bib : undefined,
            lat: coords.lat,
            lng: coords.lng,
            allow_flagged: allowFlagged
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          lastRejectedCode = trimmed;
          lastRejectedAt = Date.now();
          const err = new Error(data.error || 'Gagal mencatat check-in.');
          err.code = data.code || '';
          err.canSubmitFlagged = Boolean(data.can_submit_flagged);
          throw err;
        }

        if (data.split && data.checkpoint) {
          splitsByCpId.set(Number(data.checkpoint.id), data.split);
          renderChecklist();
          if (typeof onCheckInSuccess === 'function') {
            onCheckInSuccess(data);
          }
        }

        const timeLabel = formatWibClock(data.split?.arrival_time);
        const isPendingVerify = data.split?.verification_status === 'PENDING_VERIFY';
        const isOver = data.split?.status === 'OVER_COT';
        const cotLabel = isPendingVerify
          ? 'MENUNGGU VERIFIKASI PANITIA'
          : (isOver ? 'MELEBIHI BATAS COT' : 'LOLOS BATAS COT');
        const cpIdx = sortedCps.findIndex(c => Number(c.id) === Number(data.checkpoint?.id));
        const cpCode = cpIdx >= 0 ? `CP ${String(cpIdx + 1).padStart(2, '0')}` : 'CP';
        const allDone = sortedCps.length > 0 && splitsByCpId.size >= sortedCps.length;
        const heading = data.already_checked_in
          ? 'Pos Sudah Tercatat Sebelumnya'
          : (isPendingVerify ? 'Check-In Diajukan (Verifikasi Panitia)' : 'Check-In Berhasil Tercatat');

        stopCamera();
        feedbackEl.style.display = 'none';
        cameraStageEl.style.display = 'none';
        cameraControlsEl.style.display = 'none';
        manualFormEl.style.display = 'none';
        manualInput.value = '';

        receiptPanelEl.style.display = 'block';
        receiptPanelEl.className = `cp-scan-receipt ${isPendingVerify || isOver ? 'is-over' : 'is-ok'}`;
        receiptPanelEl.innerHTML = `
          <div class="cp-receipt-top-badges">
            <span class="cp-receipt-badge">${cotLabel}</span>
            <span class="cp-receipt-cp-tag">${cpCode}</span>
          </div>
          <h3 class="cp-receipt-heading">${escapeHtml(heading)}</h3>
          <p class="cp-receipt-cp-name">${escapeHtml(data.checkpoint?.name || 'Checkpoint')}${data.checkpoint?.km_distance != null ? ` (${data.checkpoint.km_distance} km)` : ''}</p>
          <div class="cp-receipt-grid">
            <div>
              <span class="cp-receipt-lbl">PESERTA</span>
              <strong class="cp-receipt-val">#${escapeHtml(rider.bib)} ${escapeHtml(rider.name)}</strong>
            </div>
            <div>
              <span class="cp-receipt-lbl">WAKTU TIBA</span>
              <strong class="cp-receipt-val">${escapeHtml(timeLabel)}</strong>
            </div>
          </div>
          ${isPendingVerify ? '<p class="cp-receipt-note">Waktu tiba Anda sudah aman tercatat. Panitia akan memeriksa posisi GPS Anda di monitor admin.</p>' : ''}
          ${data.already_checked_in ? '<p class="cp-receipt-note">Waktu kedatangan awal Anda tetap dipertahankan.</p>' : ''}
          ${allDone ? `<p class="cp-receipt-note">Seluruh pos kontrol (${splitsByCpId.size}/${sortedCps.length}) sudah tercatat.</p>` : ''}
          <div class="cp-receipt-actions">
            ${allDone ? `
              <button type="button" class="cp-btn-primary" id="btnDoneCpScan">Selesai &amp; Tutup</button>
              <button type="button" class="cp-btn-secondary" id="btnScanNextCp">Scan Ulang</button>
            ` : `
              <button type="button" class="cp-btn-primary" id="btnScanNextCp">Scan Pos Berikutnya</button>
              <button type="button" class="cp-btn-secondary" id="btnDoneCpScan">Tutup</button>
            `}
          </div>
        `;

        receiptPanelEl.querySelector('#btnDoneCpScan')?.addEventListener('click', closeScanner);
        receiptPanelEl.querySelector('#btnScanNextCp')?.addEventListener('click', () => {
          receiptPanelEl.style.display = 'none';
          cameraStageEl.style.display = 'block';
          cameraControlsEl.style.display = 'flex';
          manualFormEl.style.display = 'flex';
          startCamera();
        });

        if ('vibrate' in navigator) {
          try { navigator.vibrate([120, 60, 180]); } catch {}
        }
        if (window.showToast) {
          showToast(`${heading}: ${data.checkpoint?.name || 'Checkpoint'}`, isPendingVerify || isOver ? 'info' : 'success');
        }
      } catch (err) {
        showFeedback('error', 'Check-in gagal', err.message || 'Periksa koneksi internet atau kode QR pos.');
        if (err && (err.code === 'GPS_REQUIRED' || err.code === 'OUT_OF_RADIUS')) {
          const btnStack = document.createElement('div');
          btnStack.style.display = 'flex';
          btnStack.style.flexDirection = 'column';
          btnStack.style.gap = '8px';
          btnStack.style.marginTop = '10px';

          const retryGpsBtn = document.createElement('button');
          retryGpsBtn.type = 'button';
          retryGpsBtn.className = 'cp-ctrl-btn';
          retryGpsBtn.style.width = '100%';
          retryGpsBtn.textContent = 'Coba Kunci GPS & Kirim Ulang';
          retryGpsBtn.addEventListener('click', () => {
            lastRejectedAt = 0;
            submitCheckin(trimmed, false);
          });
          btnStack.appendChild(retryGpsBtn);

          if (err.canSubmitFlagged) {
            const flagBtn = document.createElement('button');
            flagBtn.type = 'button';
            flagBtn.className = 'cp-manual-submit';
            flagBtn.style.width = '100%';
            flagBtn.style.background = '#966025';
            flagBtn.textContent = 'Ajukan Check-In (Verifikasi Panitia)';
            flagBtn.addEventListener('click', () => {
              lastRejectedAt = 0;
              submitCheckin(trimmed, true);
            });
            btnStack.appendChild(flagBtn);
          }

          feedbackEl.appendChild(btnStack);
        }
        if (window.showToast) {
          showToast(err.message || 'Check-in gagal', 'error');
        }
      } finally {
        isSubmitting = false;
        manualSubmitBtn.disabled = false;
        manualSubmitBtn.textContent = 'Check-In';
      }
    }

    async function scanFrameLoop() {
      if (isClosed || !stream) return;

      if (!isSubmitting && videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        try {
          let decodedText = '';
          if (barcodeDetector) {
            const barcodes = await barcodeDetector.detect(videoEl);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              decodedText = barcodes[0].rawValue;
            }
          } else if (typeof window.jsQR === 'function') {
            const maxDim = 640;
            const scale = Math.min(1, maxDim / Math.max(videoEl.videoWidth, videoEl.videoHeight));
            const w = Math.max(1, Math.floor(videoEl.videoWidth * scale));
            const h = Math.max(1, Math.floor(videoEl.videoHeight * scale));
            if (canvas.width !== w || canvas.height !== h) {
              canvas.width = w;
              canvas.height = h;
            }
            ctx.drawImage(videoEl, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);
            const code = window.jsQR(imgData.data, w, h, { inversionAttempts: 'dontInvert' });
            if (code && code.data) {
              decodedText = code.data;
            }
          }

          if (decodedText) {
            const recentlyRejected = decodedText === lastRejectedCode && (Date.now() - lastRejectedAt < 3500);
            if (!recentlyRejected) {
              await submitCheckin(decodedText);
            }
          }
        } catch {
          // Ignore transient frame decode errors
        }
      }

      if (!isClosed && stream) {
        scanTimer = setTimeout(scanFrameLoop, 180);
      }
    }

    async function startCamera() {
      stopCamera();
      retryBtn.style.display = 'none';
      stateEl.style.display = 'flex';
      stateEl.innerHTML = '<span class="cp-camera-state-text">Menyiapkan kamera perangkat...</span>';

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        stateEl.innerHTML = '<span class="cp-camera-state-text">Browser ini tidak mendukung akses kamera langsung. Gunakan kolom Kode Pos di bawah, atau scan menggunakan aplikasi kamera bawaan HP.</span>';
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        if (isClosed) {
          stopCamera();
          return;
        }
        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
        stateEl.style.display = 'none';

        // Enable torch toggle if hardware supports it
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const caps = track.getCapabilities();
          if (caps && caps.torch) {
            torchBtn.style.display = 'inline-flex';
            torchBtn.textContent = 'Senter: OFF';
            torchBtn.onclick = async () => {
              torchOn = !torchOn;
              try {
                await track.applyConstraints({ advanced: [{ torch: torchOn }] });
                torchBtn.textContent = torchOn ? 'Senter: ON' : 'Senter: OFF';
              } catch {
                torchOn = false;
                torchBtn.style.display = 'none';
              }
            };
          }
        }

        scanFrameLoop();
      } catch (err) {
        const denied = err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
        stateEl.innerHTML = denied
          ? '<span class="cp-camera-state-text">Izin kamera ditolak. Aktifkan izin kamera di browser atau masukkan Kode Pos secara manual di bawah.</span>'
          : '<span class="cp-camera-state-text">Kamera tidak dapat diakses pada perangkat ini. Masukkan Kode Pos secara manual di bawah.</span>';
        retryBtn.style.display = 'inline-flex';
      }
    }

    retryBtn.addEventListener('click', startCamera);
    modal.querySelector('#cpManualForm').addEventListener('submit', (e) => {
      e.preventDefault();
      submitCheckin(manualInput.value);
    });

    startCamera();
  }

  window.openCpQrScanner = openCpQrScanner;
  window.formatWibClock = formatWibClock;
})();
