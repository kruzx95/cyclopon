# Spesifikasi Desain: Field Test Diagnostic & Logging Subsystem (CycloPon)

**Tanggal:** 8 Oktober 2026  
**Status:** Validated Design Spec  
**Target Rilis:** Phase 39 / v1.0 Field Audit  

---

## 1. Ringkasan Eksekutif (Executive Summary)

Sebelum melakukan deployment produksi dan mengarungi rute gowes jalanan sebenarnya, penguji memerlukan mekanisme logging diagnostik yang mencatat kondisi fisik perangkat dan jaringan selama uji coba lapangan (*field testing*). Ketika timbul kendala (seperti titik GPS membeku, aplikasi tertidur di saku jersey, atau sinyal 4G hilang di area terpencil), sistem harus secara otomatis merekonstruksi kronologi masalah (*post-mortem report*) agar penyebabnya dapat dipelajari dan diperbaiki secara presisi.

Dokumen ini mendefinisikan arsitektur, struktur data, algoritma deteksi insiden, antarmuka visual, dan API untuk **Field Test Diagnostic & Logging Subsystem**.

---

## 2. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│  SMARTPHONE PENGUJI (Client-Side)                           │
│                                                             │
│  [GpsKeeper / Rider Cockpit HUD / Setup Hub]                │
│          │                                                  │
│          ▼ (setiap tick telemetri & event)                  │
│  [field-logger.js] ──> In-Memory Buffer + LocalStorage      │
│   • GPS Accuracy & Jitter Watcher                           │
│   • Background Sleep / Heartbeat Delta Monitor              │
│   • Network & Offline Queue Tracker                         │
│   • Battery & Audio Keep-Alive Sentinel                     │
│          │                                                  │
│   (Saat Tes Selesai / Tombol "Selesai Uji Lapangan")        │
│          ▼                                                  │
│  [Post-Mortem Analyzer]                                     │
│   • Kalkulasi Skor Stabilitas (0-100%)                      │
│   • Deteksi Otomatis Insiden & Blank Spot                   │
│          │                                                  │
│          ├─► [Modal Laporan di Layar HP] (Unduh JSON / Teks)│
│          │                                                  │
│          └─► POST /api/field-tests/reports (Simpan ke Server│
└───────────────────────────┬─────────────────────────────────┘
                            │ (via HTTP / tersimpan di antrean)
┌───────────────────────────▼─────────────────────────────────┐
│  CYCLOPON SERVER & ADMIN PANEL                              │
│                                                             │
│  [routes/field-tests.js] ──> Simpan ke data/field-tests/    │
│                               dan sqlite DB audit log       │
│                                                             │
│  [Admin Dashboard: Tab 🛠️ Uji Lapangan]                    │
│   • Ringkasan Sesi Tes Penguji (Nama, BIB, Skor, Durasi)    │
│   • Drill-down detail insiden, grafik sinyal & baterai      │
│   • Tombol Unduh / Ekspor Laporan JSON untuk analisis tim   │
└─────────────────────────────────────────────────────────────┘
```

### Prinsip Utama:
1. **Zero-Overhead:** Operasi pencatatan tidak membebani komputasi atau memori ponsel saat bersepeda kencang.
2. **Offline-First:** Evaluasi dan pembuatan laporan dilakukan 100% di browser tester. Tidak ada ketergantungan pada koneksi internet saat tes berakhir.
3. **Actionable Insights:** Laporan menyajikan diagnosa insiden yang mudah dimengerti, bukan sekadar dump string log mentah.

---

## 3. Komponen Sistem & Tanggung Jawab

### 3.1 Client Sentinel: `public/js/lib/field-logger.js`
* Diaktifkan bersamaan saat penelusuran GPS dimulai (di `gps-keeper.js` atau `rider-cockpit.js`).
* **Heartbeat Sentinel:** Memeriksa interval waktu setiap detik. Bila ada jeda > 15 detik (misal akibat OS membekukan tab browser saat HP dikunci di saku), insiden `OS_BACKGROUND_LAG` atau `OS_THREAD_FREEZE` dicatat.
* **Network & Queue Tracker:** Mendengarkan event `online`/`offline` browser serta mengawasi status antrean titik offline (`offlineQueue`).
* **GPS Accuracy Sentinel:** Mengukur akurasi meter (`coords.accuracy`). Jika akurasi drop melampaui ambang batas (> 25m), dicatat sebagai insiden degradasi sinyal.
* **Battery Sentinel:** Membaca status baterai awal dan akhir melalui `navigator.getBattery()` (jika didukung perangkat).

### 3.2 Post-Mortem Analyzer (di dalam `field-logger.js`)
Ketika penguji menekan tombol *"Selesai Uji Lapangan"*, modul ini langsung mengeksekusi:
1. **Kalkulasi Skor Stabilitas (0–100%):**
   * Poin awal: 100 poin.
   * Pengurangan:
     - Setiap titik yang hilang tanpa ter-flush: -10 poin.
     - Setiap insiden freeze latar belakang (>30s): -15 poin.
     - Setiap blank spot offline > 2 menit: -5 poin.
     - Rata-rata akurasi GPS buruk (> 20m): -10 poin.
2. **Pengelompokan Tingkat Kesehatan:**
   * `90 - 100%`: **EXCELLENT** (Siap Produksi).
   * `75 - 89%`: **GOOD** (Stabil dengan insiden minor).
   * `50 - 74%`: **WARNING** (Perlu optimasi izin daya/lokasi).
   * `< 50%`: **CRITICAL** (Terdapat masalah fatal, OS membekukan tracking).

### 3.3 Backend Storage & API: `routes/field-tests.js`
* Mengelola penyimpanan laporan audit di direktori `data/field-tests/` dan metadata ringkasan di tabel SQLite `field_test_reports`.
* **Endpoints:**
  * `POST /api/field-tests/reports`: Menerima laporan dari tester. Dibatasi ukuran maks 1 MB per payload.
  * `GET /api/field-tests/reports`: Menampilkan daftar sesi audit (hanya untuk Admin terotentikasi).
  * `GET /api/field-tests/reports/:id`: Mengambil payload lengkap sesi tertentu.

---

## 4. Struktur Data Laporan (`field-test-report.json`)

```json
{
  "test_id": "FT-20261008-BIB101-7A3F",
  "client_info": {
    "user_agent": "Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36...",
    "device_platform": "Android",
    "screen_status": "locked_background",
    "wake_lock_supported": true
  },
  "rider": {
    "id": 1,
    "bib": "101",
    "name": "Budi Santoso"
  },
  "event": {
    "id": 21,
    "name": "Gravel to Gang // Pro Telemetry 2026"
  },
  "timing": {
    "started_at": "2026-10-08T07:00:00.000Z",
    "ended_at": "2026-10-08T08:15:30.000Z",
    "duration_seconds": 4530,
    "distance_km": 31.4
  },
  "scorecard": {
    "stability_score": 94,
    "grade": "EXCELLENT",
    "total_points_recorded": 906,
    "points_sent_live": 862,
    "points_queued_offline": 44,
    "points_flushed_success": 44,
    "points_lost": 0
  },
  "metrics": {
    "gps_accuracy": {
      "min_meters": 3.1,
      "avg_meters": 5.4,
      "max_meters": 28.0
    },
    "network": {
      "online_time_pct": 96.2,
      "offline_events_count": 2,
      "max_offline_duration_sec": 140
    },
    "battery": {
      "start_pct": 85,
      "end_pct": 74,
      "drain_per_hour_pct": 8.7
    },
    "background_health": {
      "heartbeat_intervals_missed": 1,
      "max_thread_lag_sec": 12
    }
  },
  "incidents": [
    {
      "id": "inc-1",
      "timestamp": "2026-10-08T07:22:15.000Z",
      "severity": "WARNING",
      "type": "OFFLINE_BLANK_SPOT",
      "message": "Koneksi internet terputus (blank spot) di KM 8.4 selama 140 detik. 28 titik ditampung ke antrean lokal.",
      "resolved_at": "2026-10-08T07:24:35.000Z",
      "resolution": "Sinyal pulih di KM 9.2, seluruh 28 titik berhasil di-flush ke server."
    },
    {
      "id": "inc-2",
      "timestamp": "2026-10-08T07:45:10.000Z",
      "severity": "INFO",
      "type": "GPS_ACCURACY_DROP",
      "message": "Akurasi GPS turun sementara ke 28m di KM 18.2 (area pepohonan rimbun)."
    }
  ]
}
```

---

## 5. Antarmuka Visual & Interaksi Pengguna

### 5.1 Modal Laporan di Smartphone Tester (`#modalFieldTestReport`)
* **Lencana & Nilai:**
  * Skor Stabilitas Besar: `🟢 94% EXCELLENT`.
  * Micro-tag: `// FIELD TEST AUDIT RESULT` berlatar gelap `#0D1117`.
* **Grid Metrik 4-Sel Atletik:**
  1. *Durasi & Jarak:* `01:15:30 • 31.4 KM`.
  2. *Titik Terkirim:* `906 / 906 (100% Lolos, 0 Hilang)`.
  3. *Stabilitas Jaringan:* `96.2% Online • 2x Blank Spot (Maks 140s)`.
  4. *Akurasi & Daya:* `Rata-rata ±5.4m • Konsumsi Baterai 8.7%/jam`.
* **Daftar Log Insiden:**
  * Kartu insiden bergaris tepi warna tingkat keparahan (*Severity border*).
  * Pesan insiden dan waktu kejadian serta resolusi pulihnya.
* **Bilah Aksi:**
  * Tombol Primer: `[ 📥 Unduh File Laporan (.json) ]` (memicu download file client-side via Blob).
  * Tombol Sekunder: `[ 📋 Salin Ringkasan ]` (menaruh ringkasan teks ke clipboard).
  * Tombol Tutup: `[ Selesai ]`.

### 5.2 Menu di Admin Dashboard (`/admin` → Tab: "🛠️ Uji Lapangan")
* **Tabel Audit Pengujian:**
  * Kolom: ID Sesi, Tanggal, Penguji / BIB, Perangkat, Durasi, Skor Stabilitas, Status Insiden, Aksi.
* **Laci Detail Audit (*Audit Drawer*):**
  * Membuka rincian insiden per sesi secara terperinci.
  * Menampilkan tombol unduh file JSON untuk dianalisis oleh developer atau AI.

---

## 6. Penanganan Error & Ketahanan Sinyal

1. **Ketika Koneksi Terputus Saat Klik Selesai:**
   * Browser tetap memproses analisis secara lokal.
   * File `.json` tetap dapat diunduh langsung ke HP tester.
   * Laporan diantrekan ke `localStorage ('cyclopon_field_reports_pending')` dan otomatis dikirim saat koneksi pulih.
2. **Proteksi Backend:**
   * Middleware `requireAdminAuth` melindungi pembacaan audit log.
   * Sanitasi `escapeHtml` pada semua rendering web.
   * Validasi skema JSON pada endpoint `POST`.

---

## 7. Rencana Pengujian Otomatis (*Testing Strategy*)

Pengujian otomatis akan ditempatkan di `tests/field-tests.test.js`:
1. **Uji Algoritma Deteksi Insiden:**
   - Memastikan jeda detak > 30s memicu insiden `OS_THREAD_FREEZE`.
   - Memastikan request gagal memicu insiden `OFFLINE_BLANK_SPOT` dan menghitung durasi saat pulih.
2. **Uji Perhitungan Skor Stabilitas:**
   - Sesi sempurna tanpa titik hilang = skor $\ge 90$ (`EXCELLENT`).
   - Sesi dengan titik hilang atau freeze berulang = penurunan skor ke `WARNING` atau `CRITICAL`.
3. **Uji Endpoint API Backend:**
   - POST `/api/field-tests/reports` berhasil menyimpan berkas dan merespons HTTP 201.
   - GET `/api/field-tests/reports` menolak request tanpa otentikasi admin (HTTP 401).
   - GET `/api/field-tests/reports` mengembalikan daftar laporan bagi admin sah.
4. **Verifikasi Bebas Regresi:**
   - Memastikan seluruh 101 unit tests yang ada sebelumnya tetap lulus 100%.

---

## 8. Batasan & Batas Lingkup (Non-Goals)

* **Bukan Pelacak Real-Time Pihak Ketiga:** Fitur ini khusus mengaudit sesi pelacakan CycloPon (GpsKeeper / Rider Cockpit PWA) dan telemetri koneksi, bukan menggantikan aplikasi Traccar Client pihak ketiga secara menyeluruh.
* **Privasi Data:** Log hanya berisi telemetri teknis sesi pengujian, tidak mengumpulkan data pribadi di luar nama dan nomor BIB rider yang sedang diuji.
