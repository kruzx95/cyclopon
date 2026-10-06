# 🚴 Laporan Progres Pengembangan CycloPon Live Tracker

**Tanggal Laporan:** 6 Oktober 2026  
**Status Keseluruhan:** ✅ **Fase Utama (Phase 1 – 22) Selesai 100% (Production-Ready, High-Concurrency Tuned & Athletic Minimalist Pro UI)**  
**Total Pengujian Unit:** 88 / 88 Lulus (13 Test Suites)

---

## 📋 Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Pilar Fitur Utama (Phase 1 – 6)](#2-pilar-fitur-utama-phase-1--6)
   - [Phase 1: Fitur Keselamatan & Race Control](#phase-1-fitur-keselamatan--race-control-safety-engine)
   - [Phase 2: Manajemen Checkpoint & Cut-Off Time (Audax COT)](#phase-2-manajemen-checkpoint--cut-off-time-audax-cot)
   - [Phase 3: Spectator Experience & Time Machine Replay](#phase-3-spectator-experience--time-machine-replay)
   - [Phase 4: Rider Live Cockpit HUD](#phase-4-rider-live-cockpit-hud-ridercockpit)
   - [Phase 5: Rekapitulasi Hasil Resmi & Brevet Digital](#phase-5-rekapitulasi-hasil-resmi--brevet-digital-eventsidresults)
   - [Phase 6: Notifikasi Eksternal Panitia (Telegram Bot & Webhook)](#phase-6-notifikasi-eksternal-panitia-telegram-bot--webhook)
3. [Perbaikan Bug & Optimalisasi Arsitektur](#3-perbaikan-bug--optimalisasi-arsitektur)
   - [Pembersihan Database & Teardown Otomatis](#31-pembersihan-database--teardown-otomatis)
   - [Perbaikan Tata Letak Admin Edit Event](#32-perbaikan-tata-letak-admin-edit-event)
   - [Penyempurnaan Alur Sesi & Autentikasi Rider & Admin](#33-penyempurnaan-alur-sesi--autentikasi-rider--admin)
4. [Tabel Matriks Fitur & Rute](#4-tabel-matriks-fitur--rute)
5. [Hasil Pengujian & Verifikasi Kualitas](#5-hasil-pengujian--verifikasi-kualitas)
6. [Phase 7: Desain Sistem & Tema Visual (Warm Alabaster & Sage Light Theme)](#6-phase-7-desain-sistem--tema-visual-warm-alabaster--sage-light-theme)
7. [Phase 8: Fitur Berbagi Medsos (PNG Certificate) & Distribusi GPX](#7-phase-8-fitur-berbagi-medsos-png-certificate--distribusi-rute-gpx)
8. [Phase 9: Pencarian & Filter Rider Serta Deep Linking (?bib=...)](#8-phase-9-pencarian--filter-rider-serta-tautan-pelacakan-personal-bib)
9. [Phase 10: Checkpoint Audio Chime & AMOLED Night Mode](#9-phase-10-checkpoint-audio-proximity-chime--amoled-pitch-black-night-mode)
10. [Phase 11: Background GPS Keep-Alive & Mode Kantong Jersey](#10-phase-11-pwa-background-gps-keep-alive--mode-pelacak-saku-jersey-pocket-tracker)
11. [Phase 12: ClimbPro & Analitik Elevasi Real-Time (Grade %)](#11-phase-12-climbpro--analitik-elevasi-real-time-grade--)
12. [Penyempurnaan Tampilan Rider Cockpit HUD](#12-penyempurnaan-tampilan-rider-cockpit-hud-amoled-night-mode--layout)
13. [Phase 13: Containerization & Stack Deployment VPS (Docker & Caddy SSL)](#13-phase-13-containerization--stack-deployment-vps-docker--caddy-ssl)
14. [Phase 14: Real-Time Visitor Traffic & Live Spectator Analytics](#14-phase-14-real-time-visitor-traffic--live-spectator-analytics-di-admin-panel)
15. [Phase 15: Onboarding Peserta & Registrasi Manual Panitia/Sweeper (Zero-Confusion)](#15-phase-15-onboarding-peserta--registrasi-manual-panitiasweeper-zero-confusion)
16. [Phase 16: Penyeragaman & Modernisasi UI Menyeluruh (2026 Athletic / Sports-Grade Design)](#16-phase-16-penyeragaman--modernisasi-ui-menyeluruh-2026-athletic--sports-grade-design)
17. [Phase 17: Race Control In-App SOS Monitor & Notifikasi](#17-phase-17-race-control-in-app-sos-monitor-audio-sirene--perbaikan-pengujian-notifikasi)
18. [Phase 18: Pemisahan Live Map (Spectator vs Admin) & Mobile Responsive](#18-phase-18-pemisahan-tampilan-live-map-mode-penonton-vs-panitia-race-control-penamaan-lapisan-peta-standar--optimalisasi-mobile-responsive)
19. [Phase 19: Tipografi Murni Brand "CycloPon" (Peniadaan Ikon Emoji Sepeda)](#19-phase-19-tipografi-murni-brand-cyclopon-peniadaan-ikon-emoji-sepeda-di-mode-desktop--mobile)
20. [Phase 20: Audit Responsif Mobile Menyeluruh & Pemulihan Header Live Map Ultra-Bersih](#20-phase-20-audit-responsif-mobile-menyeluruh--pemulihan-header-live-map-ultra-bersih)
21. [Phase 21: Optimasi Arsitektur Performa Skala Tinggi & Stress Benchmark Otomatis](#21-phase-21-optimasi-arsitektur-performa-skala-tinggi--stress-benchmark-otomatis)
22. [Phase 22: Redesain Menyeluruh "Athletic Minimalist Pro" (Rapha / Pas Normal Studios Aesthetic) & Standarisasi Desain](#22-phase-22-redesain-menyeluruh-athletic-minimalist-pro-rapha--pas-normal-studios-aesthetic--standarisasi-desain)
23. [Rekomendasi Langkah Berikutnya](#23-rekomendasi-langkah-berikutnya)

---

## 1. Ringkasan Eksekutif

CycloPon telah berhasil ditransformasikan dari prototipe pelacak GPS sederhana menjadi **platform pemantauan langsung (_live tracking_) kelas event resmi** (Audax, Brevet, Gran Fondo, dan Ultra-cycling).

Seluruh sistem dirancang tetap ringan (_zero heavy framework_) dengan **Node.js Express + SQLite (WAL mode)** di sisi backend, serta **Vanilla JavaScript ES6+ dan Leaflet.js** di sisi frontend PWA, menjamin kecepatan respon tinggi dan efisiensi baterai maksimal baik untuk smartphone rider maupun penonton.

---

## 2. Pilar Fitur Utama (Phase 1 – 5)

### Phase 1: Fitur Keselamatan & Race Control (Safety Engine)

- **Sinyal SOS Darurat Real-Time:** Kategori Medis, Tabrakan, Kerusakan Sepeda, dan Evakuasi DNF. Disertai koordinat GPS instan dari browser navigator.
- **Deteksi Deviasi Rute (_Off-Route_):** Algoritma perhitungan jarak tegak lurus (_perpendicular distance_) terhadap segmen rute GPX. Menandai rider yang menyimpang > 100 meter dengan badge merah berkedip.
- **Telemetri Baterai:** Parsing persentase daya baterai smartphone dari payload Traccar OsmAnd protocol, lengkap dengan peringatan daya rendah (< 20%).
- **Banner Darurat Spectator:** Notifikasi melayang dengan audio chime dan tombol _"Fokus Lokasi"_ di Live Map.

### Phase 2: Manajemen Checkpoint & Cut-Off Time (Audax COT)

- **Skema Pos & Split Time:** Pencatatan otomatis waktu kedatangan rider di setiap pos pemeriksaan (`checkpoints` & `rider_splits`).
- **Admin Checkpoint Editor:** Antarmuka input target kilometer pos dengan kalkulasi koordinat otomatis dari rute GPX yang diunggah.
- **Verifikasi Status COT:** Membandingkan jam tiba rider terhadap batas waktu tutup resmi (`IN_TIME` vs `OVER_COT`).
- **Visualisasi Peta & Elevasi:** Marker pos cyan biru interaktif di peta utama dan grafik profil ketinggian Komoot.

### Phase 3: Spectator Experience & Time Machine Replay

- **Logger Histori Telemetri:** Tabel `position_history` yang mencatat snapshot koordinat, kecepatan, dan jarak per interval waktu.
- **Time Machine Playback Drawer:** Kontrol putar ulang perlombaan dengan timeline scrubber interaktif, tombol Play/Pause, jam simulasi lomba, dan pilihan kecepatan putar (1x, 5x, 15x, 60x).
- **Head-to-Head (H2H) Comparison:** Panel komparasi dua rider secara berdampingan: selisih jarak (km), gap waktu tempuh, kecepatan rata-rata bergerak, dan sisa jarak ke finish.

### Phase 4: Rider Live Cockpit HUD (`/rider/cockpit`)

- **Desain Layar Handlebar (HUD Mobile):** Kontras tinggi gelap dengan speedometer digital berukuran besar (km/jam), moving average, dan rekor kecepatan puncak.
- **Screen Wake Lock API:** Fitur toggle `navigator.wakeLock` agar layar smartphone tetap menyala tanpa mati otomatis selama bersepeda.
- **Target Checkpoint Widget:** Countdown jarak tersisa menuju pos berikutnya dan estimasi waktu tiba (ETA).
- **Mini Breadcrumb Map:** Peta Leaflet mini yang otomatis berpusat pada posisi rider di rute.
- **Simulator Gowes Terintegrasi:** Tombol `🎮 Sim` untuk menguji coba pergerakan speedometer dan simulasi rute tanpa koneksi GPS fisik lapangan.

### Phase 5: Rekapitulasi Hasil Resmi & Brevet Digital (`/events/:id/results`)

- **Peringkat Otomatis:** Menghitung waktu tempuh bersih, jarak total, kecepatan rata-rata, dan status kelulusan (**FINISHER**, **OVER COT**, **DNF**).
- **Unduh Spreadsheet CSV:** Endpoint `GET /api/events/:id/export/csv` untuk rekapitulasi data panitia.
- **Pencarian & Filter Interaktif:** Filter status kelulusan dan input pencarian BIB / nama peserta secara instan.
- **Sertifikat Brevet Digital Finisher:** Kartu kelulusan resmi berbingkai emas dengan stempel verifikasi pos, identitas peserta, dan dukungan cetak PDF bersih (`window.print()`).

### Phase 6: Notifikasi Eksternal Panitia (Telegram Bot & Webhook)

- **Engine Notifikasi Terintegrasi ([`lib/notifications.js`](file:///home/kruza/Documents/cyclopon/lib/notifications.js)):** Modul fleksibel yang mendukung pengiriman pesan HTML ke Telegram Bot API dan payload JSON terstruktur ke Webhook kustom (Discord, Slack, REST API).
- **Pengiriman Asinkron Non-Blocking (`setImmediate`):** Proses pengiriman sinyal darurat tidak pernah memperlambat respon HTTP API maupun koneksi WebSocket rider di lapangan.
- **Dispatch Sinyal SOS Darurat Otomatis:** Saat rider memicu tombol SOS, panitia langsung menerima pesan berisi nama rider, nomor BIB, jenis darurat (Kecelakaan, Medis, DNF, Kerusakan Sepeda), catatan pesan, koordinat GPS, serta tautan langsung ke Google Maps.
- **Peringatan Otomatis Over Cut-Off Time (COT):** Notifikasi instan saat rider terdeteksi melewati batas waktu pos checkpoint, mencakup rincian nama pos, kilometer target, batas waktu resmi, dan waktu kedatangan aktual.
- **Panel Pengaturan & Live Tester ([`/admin/notifications`](file:///home/kruza/Documents/cyclopon/public/js/pages/admin-notifications.js)):**
  - Antarmuka konfigurasi Bot Token, Chat ID, dan Webhook URL yang tersimpan aman di tabel SQLite `settings` (dengan fallback otomatis ke `.env`).
  - Fitur pengamanan masking token (`••••••••`).
  - Sakelar toggle terpisah untuk notifikasi SOS dan notifikasi COT.
  - Tombol **⚡ Kirim Pesan Uji Coba (Test)** dengan indikator status hasil live untuk memverifikasi token dan koneksi Telegram/Webhook tanpa menunggu event berjalan.

---

## 3. Perbaikan Bug & Optimalisasi Arsitektur

### 3.1 Pembersihan Database & Teardown Otomatis

- **Akar Masalah:** Test suite sebelumnya tidak memiliki perintah `DELETE` pada blok teardown, menyebabkan 34 event test sampah menumpuk di database produksi.
- **Solusi:** Database dibersihkan menyisakan hanya event resmi asli. Seluruh file unit test (`alerts`, `checkpoints`, `history`, `results`, `notifications`) diperbarui dengan pembersihan data otomatis setelah test selesai.

### 3.2 Perbaikan Tata Letak Admin Edit Event

- **Akar Masalah:** Adanya tag `<div>` yang tidak tertutup rapi pada header [`admin-event.js`](file:///home/kruza/Documents/cyclopon/public/js/pages/admin-event.js), menyebabkan seluruh card (Detail Event, Rute GPX, Checkpoints, Daftar Rider) menjadi anak flex horizontal yang berjejer ke samping dan merusak tampilan.
- **Solusi:** Menutup struktur HTML header secara benar, serta menambahkan `grid-template-columns: 240px minmax(0, 1fr)` dan `min-width: 0` pada CSS admin layout untuk mencegah terjadinya luapan lebar (_track blowout_).

### 3.3 Penyempurnaan Alur Sesi & Autentikasi Rider & Admin

- **Isolasi BIB per Event:** Backend query kini menggunakan `getRiderByEventBibPin` (`WHERE event_id = ? AND bib = ? AND pin = ?`), sehingga nomor BIB yang sama di dua event berbeda tidak tertukar.
- **Halaman Login Rider (`/rider`):** Dilengkapi selektor event aktif dan fitur deteksi sesi login yang sudah ada.
- **Rider Hub (`/rider/setup`):** Berfungsi sebagai dashboard sentral rider dengan 3 kartu aksi utama (Cockpit HUD, Setup Traccar, Live Map) dan tombol Logout.
- **Proteksi Rute Admin (Route Guard):** Akses `/admin/dashboard`, `/admin/notifications`, atau `/admin/events/:id` tanpa sesi login secara otomatis dialihkan ke `/admin`. Ditambahkan menu _📢 Notifikasi Panitia_ dan tombol _Keluar (Logout)_ di sidebar admin.

---

## 4. Tabel Matriks Fitur & Rute

| Rute URL               | Pengguna           | Fungsi Utama                                                     |  Status  |
| ---------------------- | ------------------ | ---------------------------------------------------------------- | :------: |
| `/`                    | Publik             | Halaman landing beranda & pemantauan event aktif                 | ✅ Aktif |
| `/rider`               | Rider              | Login nomor BIB & PIN dengan seleksi event resmi                 | ✅ Aktif |
| `/rider/setup`         | Rider              | **Rider Hub:** Profil, panduan Traccar, navigasi menu, logout    | ✅ Aktif |
| `/rider/cockpit`       | Rider              | **Cockpit HUD:** Speedometer besar, wake-lock, COT timer         | ✅ Aktif |
| `/watch/:id`           | Publik / Spectator | **Live Map:** Peta Leaflet, Time Machine Replay, SOS alert       | ✅ Aktif |
| `/events/:id/results`  | Publik / Rider     | **Hasil Resmi:** Leaderboard, unduh CSV, Sertifikat Brevet       | ✅ Aktif |
| `/admin`               | Panitia            | Halaman login admin (kredensial Traccar / dev)                   | ✅ Aktif |
| `/admin/dashboard`     | Panitia            | Dashboard daftar seluruh event & pembuatan event baru            | ✅ Aktif |
| `/admin/notifications` | Panitia            | **Notifikasi Panitia:** Setup Telegram Bot, Webhook, & Test Ping | ✅ Aktif |
| `/admin/events/:id`    | Panitia            | Edit detail event, upload GPX, manajemen CP & rider              | ✅ Aktif |

---

## 5. Hasil Pengujian & Verifikasi Kualitas

Rangkaian unit test dijalankan dengan Node test runner bawaan (`node --test`) dan **seluruh 54 pengujian lulus 100% (8 Test Suites)**:

```text
▶ Alerts API & Database - 5 tests passed
▶ Auth API & Flow Validation - 6 tests passed
▶ Checkpoints & Split Times API & Database - 7 tests passed
▶ GPX Climb Detection & Grade Engine - 5 tests passed (Cat 4–HC, Grade %, Climb status)
▶ GPX Off-Route Detection Math - 4 tests passed
▶ Telemetry History Logger & API - 6 tests passed (termasuk PWA offline batch flush)
▶ Notifications Engine & API - 10 tests passed
▶ Official Results & CSV Export API - 11 tests passed (termasuk GPX download)
▶ Traffic & Visitor Analytics Engine - 7 tests passed (WebSocket live & peak counters, IP hash privacy, middleware, API)

ℹ tests 61
ℹ suites 0
ℹ pass 61
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

### Verifikasi Visual Browser & Fungsional

Pengujian telah memvalidasi fungsionalitas UI:

- **Menu Notifikasi di Sidebar Admin:** Tautan `📢 Notifikasi Panitia` muncul di sidebar admin dan menandai status aktif.
- **Konfigurasi Telegram & Webhook:** Token dimask secara aman (`••••••••`), ID grup/chat tersimpan persisten di SQLite, dan toggle pemicu SOS/COT berfungsi responsif.
- **Uji Coba Live (Test Ping):** Tombol _⚡ Kirim Pesan Uji Coba_ mengevaluasi format token dan URL secara interaktif dengan indikator visual status.
- **Tata Letak & Route Guard:** Proteksi halaman menghalangi akses tamu tanpa sesi login admin.

---

## 6. Phase 7: Desain Sistem & Tema Visual (Warm Alabaster & Sage Light Theme)

Berdasarkan referensi palet [Color Hunt #748873](https://colorhunt.co/palette/748873d1a980e5e0d8f8f8f8), CycloPon mengadopsi tema **"Warm Alabaster & Sage"** (Light Theme) yang cerah, bersih, lapang, dan estetik ala majalah bersepeda modern (_editorial gravel aesthetic_):

| Elemen / Token                     | Nilai Hex | Peran Visual                                                                        |
| :--------------------------------- | :-------- | :---------------------------------------------------------------------------------- |
| `--bg-primary`                     | `#F8F8F8` | Kanvas latar belakang utama (Clean Crisp Alabaster)                                 |
| `--bg-surface`                     | `#FFFFFF` | Header, Sidebar Navigasi Admin, Kotak Input                                         |
| `--bg-card`                        | `#FFFFFF` | Kartu telemetri, panel analitik, speedo card, modal dialog                          |
| `--bg-card-hover`                  | `#F2EFE9` | Efek hover lembut bernuansa Warm Linen                                              |
| `--border`                         | `#D0C9BF` | Garis batas netral tegas & rapi (Crisp Warm Stone Border)                           |
| `--border-subtle`                  | `#E2DDD5` | Garis pemisah baris tabel dan sub-elemen                                            |
| `--color-primary` / `--color-sage` | `#2B4E30` | Deep Sage Forest - Tombol utama CTA, aksen teks tegas, kontur elevasi GPX           |
| `--color-sage-soft`                | `#748873` | Soft Sage Green - Aksen pelengkap palet Color Hunt                                  |
| `--color-sand`                     | `#966025` | Rich Amber Sand - Highlight medali Rank 1, status COT, tombol sekunder              |
| `--text-primary`                   | `#111815` | Pitch Dark Obsidian Charcoal - Sangat tegas, tajam (kontras ~16.7:1, WCAG AAA)      |
| `--text-secondary`                 | `#334338` | Crisp Dark Slate - Keterangan, deskripsi & label jelas terbaca tanpa buram (~8.8:1) |

### Cakupan Implementasi Desain & Tipografi Tegas:

1. **Tipografi & Kontras Tinggi (High Definition):** Menghilangkan semua teks pudar atau sisa warna putih `#FFF` di atas kartu terang. Teks judul menggunakan `#111815` (900 weight), teks sekunder `#334338` (500-600 weight), dan aksen hijau Deep Sage `#2B4E30` yang sangat tegas di atas latar `#F8F8F8`.
2. **Hero Tag & Landing Card:** Badge `LIVE GPS CYCLING TRACKER` diperjelas dengan latar `#EAE5DC`, border `#D5CEBF`, dan teks hijau tua tebal `#233D26`. Judul event aktif pada featured card tampil tegas dengan `color: var(--text-primary)` (16px, 900 weight).
3. **Dashboard & Notifikasi Admin:** Sidebar navigasi putih bersih beraksen Sage aktif, panduan Telegram dengan teks tegas, tabel rider dengan baris kontras nyaman.
4. **Setup & Autentikasi Rider:** Keypad PIN dengan bayangan taktil, welcome banner linen lembut, kotak konfigurasi aplikasi Traccar, modal SOS darurat.
5. **Rider Cockpit HUD (`/rider/cockpit`):** Speedometer radial cerah dengan angka arang gelap `#111815` yang sangat kontras di bawah terik matahari, mini map berpadu serasi.
6. **Live Map & Analitik Spectator:** Peta Leaflet standar jernih, marker cluster berbingkai Sage Green, marker START & FINISH terpadu bergaya tombol (_unified button badge_) dengan chip ikon putih dan latar gradien Deep Sage/Amber, dukungan otomatis rute sirkuit (_loop route badge_), elevasi Komoot profil berkontur Sage, Time Machine replay control bar, modal H2H comparison.
7. **Brevet Results & Sertifikat Digital:** Tampilan piagam resmi di atas kanvas kertas hangat `#FAF7F2`, stempel segel brevet emas/sand, pita ranking 1-3.
8. **PWA & Ikon:** Manifest theme color `#FFFFFF` dan background `#F8F8F8`, SVG icons diperbarui ke kanvas terang.

---

## 7. Phase 8: Fitur Berbagi Medsos (PNG Certificate) & Distribusi Rute GPX

Berdasarkan kebutuhan riil pesepeda dan komunitas, ditambahkan kapabilitas ekspor grafis dan distribusi rute:

1. **Ekspor Gambar Sertifikat Finisher Retina (PNG) & Web Share API:**
   - Menggunakan library `html2canvas` lokal (`/js/libs/html2canvas.min.js`), tersimpan offline melalui Service Worker (`cyclopon-v12`).
   - Tombol **"📸 Simpan Gambar (PNG)"** merender piagam digital dengan skala 2x (retina resolution) dan mengunduh berkas `.png` berkualitas tinggi langsung ke galeri/unduhan perangkat.
   - Tombol **"📲 Bagikan (Medsos)"** memanfaatkan native Web Share API (`navigator.share`) pada smartphone Android dan iOS untuk langsung membagikan file gambar sertifikat ke Instagram Stories, WhatsApp Status, Strava, atau Twitter lengkap dengan teks ucapan kelulusan resmi.
   - Fallback otomatis bagi browser desktop tanpa Web Share: mengunduh file gambar dan menyalin teks caption ke clipboard.

2. **Distribusi Berkas Rute GPX Resmi (`/api/events/:id/gpx/download`):**
   - Endpoint backend baru dengan MIME type `application/gpx+xml` dan penamaan berkas terstandarisasi (`EventName_Route.gpx`).
   - Tombol unduh rute GPX disematkan secara strategis di 4 titik kontak utama pengguna:
     - **Halaman Hasil & Brevet (`/events/:id/results`):** Tombol *📍 Unduh GPX* di bilah aksi atas.
     - **Live Map Spectator (`/watch/:id`):** Tombol *📍 Unduh GPX* di bilah header utama.
     - **Kartu Event Beranda (`/`):** Tombol pintas *📍 GPX* di kartu featured event.
     - **Halaman Setup Rider (`/rider/setup`):** Kartu aksi cepat ke-4 untuk mempermudah rider menyinkronkan rute ke bike computer (Garmin Connect, Wahoo ELEMNT, Hammerhead Dashboard) sebelum balapan dimulai.

---

## 8. Phase 9: Pencarian & Filter Rider Serta Tautan Pelacakan Personal (`?bib=...`)

Untuk memudahkan keluarga, penonton, maupun panitia race control memantau pesepeda tertentu di tengah puluhan rider, telah diimplementasikan fitur pelacakan personal dan pencarian cerdas:

1. **Pencarian Cepat & Filter Status di Sidebar Leaderboard:**
   - Input pencarian instan nama rider dan nomor BIB dengan tombol reset (*clear button*).
   - 5 Filter Status Kapsul (*Filter Pills*): **Semua**, **⚡ Gowes** (> 2 km/h), **⏸️ Diam** (berhenti), **⚠️ Nyasar** (*off-route*), dan **🏁 Finish**.
   - Sinkronisasi DOM kartu secara efisien tanpa *layout shift* atau *re-render* berkedip.
   - Badge penghitung dinamis real-time (contoh: `[3 / 12 Rider]`).

2. **Tautan Pelacakan Langsung Personal (*Deep Linking*):**
   - Format URL langsung: `/watch/:eventId?bib=001`.
   - *Floating Focus Banner* melayang di atas peta yang menampilkan nama rider, nomor BIB, dan kecepatan bergerak secara real-time.
   - Peta otomatis berpusat (*auto-center*) dan membuka *popup* informasi rider yang dituju.
   - Fitur *auto-following* kamera peta saat telemetri GPS baru tiba, dengan proteksi otomatis lepas sementara saat penonton menggeser peta (*drag/pan*).

3. **Kemudahan Berbagi (*One-Click Share*):**
   - **Di Live Map Popup:** Tombol *🔗 Bagikan Link* pada setiap kartu popup rider untuk menyalin tautan spesifik peserta tersebut.
   - **Di Rider Cockpit HUD (`/rider/cockpit`):** Tombol *📲 Bagikan* di bilah header atas agar pesepeda di garis start dapat langsung membagikan link pelacakan langsung ke grup WhatsApp keluarga atau media sosial.
   - **Di Rider Setup Hub (`/rider/setup`):** Tombol *📲 Bagikan Link Tracking* di kartu Live Map.
   - Terintegrasi penuh dengan Web Share API perangkat smartphone.

---

## 9. Phase 10: Checkpoint Audio Proximity Chime & AMOLED Pitch-Black Night Mode

Untuk menyempurnakan kenyamanan dan efisiensi pesepeda pada event ultra-endurance (seperti Audax 200/300/400/600/1200 km atau balapan malam), Rider Cockpit HUD (`/rider/cockpit`) ditingkatkan dengan dua fitur esensial:

1. **Audio Chime Alert & Visual Banner (< 200m dari Checkpoint):**
   - **Zero-Dependency Web Audio API:** Menghasilkan nada lonceng harmonis dua nada (*harmonic two-tone chord*: D5 587.33 Hz → A5 880.00 Hz) menggunakan oscillator sintetis bawaan browser. Beroperasi 100% offline tanpa membutuhkan unduhan file suara MP3/WAV eksternal.
   - **De-Duplikasi Cerdas:** Menggunakan `notifiedCpSet` berbasis ID dan kilometer pos kontrol. Chime hanya berbunyi tepat satu kali ketika rider memasuki radius < 200m, mencegah kebisingan berulang saat rider berhenti istirahat di sekitar pos.
   - **Spanduk Peringatan Visual (`#cockpitCpProximityAlert`):** Banner hijau zamrud berpendar (*emerald glow*) yang menginformasikan sisa jarak dalam meter (`Jarak tersisa: 150m (KM 80) • Siapkan kartu brevet / stampel kontrol`) dengan tombol konfirmasi penutupan (*dismiss*).
   - **Haptic Vibration:** Memicu getaran pola `[150ms, 100ms, 250ms]` pada perangkat smartphone yang mendukung navigator vibration API.
   - **Saklar Suara Interaktif (`#btnToggleAudio`):** Tombol *🔔 Suara* / *🔕 Mute* di bilah atas untuk mengaktifkan atau membisukan audio kapan saja, dengan preferensi tersimpan di `localStorage`.

2. **Mode Malam AMOLED Hitam Pekat (`#000000` AMOLED Pitch-Black Night Mode):**
   - **Hemat Daya Baterai Ekstrem:** Memanfaatkan karakteristik panel layar OLED/AMOLED di mana piksel hitam `#000000` padam total tanpa konsumsi daya, sangat krusial memperpanjang usia baterai smartphone pada gowes jarak jauh malam hari (Brevet / Night Ride).
   - **Anti-Silau di Rute Gelap:** Mengurangi kelelahan mata (*eye fatigue*) pesepeda di jalanan pedesaan atau pegunungan tanpa lampu penerangan jalan.
   - **Saklar Cepat (`#btnToggleNight`):** Tombol *🌙 Malam* / *☀️ Siang* di topbar untuk beralih mode secara instan.
   - **Deteksi Otomatis & Persistensi:** Memilih mode malam secara otomatis bila jam lokal gowes antara pukul 18:00 hingga 06:00, atau mengikuti pilihan manual yang disimpan di `localStorage ('cyclopon_cockpit_night')`.

---

## 10. Phase 11: PWA Background GPS Keep-Alive & Mode Pelacak Saku (Jersey Pocket Tracker)

Tantangan terbesar pelacakan GPS berbasis web browser pada smartphone (iOS Safari & Android Chrome) adalah **pembekuan eksekusi JavaScript (tab throttle / freeze)** saat layar dimatikan atau dikunci dan HP dimasukkan ke dalam saku belakang jersey bersepeda. Hal ini menyebabkan pelacakan terhenti dan posisi rider di live map membeku.

Untuk mengatasi ini secara tuntas tanpa memaksa rider memasang aplikasi pihak ketiga, dibuat modul [`public/js/lib/gps-keeper.js`](file:///home/kruza/Documents/cyclopon/public/js/lib/gps-keeper.js) (*GpsKeeper*):

1. **Teknologi Silent Audio Loop (Audio Keep-Alive):**
   - Menghasilkan audio WAV sunyi 1-detik (*pure programmatic PCM silence*) yang berputar terus-menerus (`loop = true`).
   - Sistem Operasi smartphone (Android & iOS) mengkategorikan tab CycloPon sebagai **pemutar media aktif (Active Media Playback)**, sehingga thread JavaScript dan antena GPS diizinkan tetap berjalan 100% di latar belakang meski layar ponsel dikunci di saku.

2. **Integrasi Lockscreen MediaSession API:**
   - Menampilkan kartu notifikasi langsung di layar kunci ponsel:
     `🚴 CycloPon GPS (28.4 km/h • KM 42.1) — BIB #101 Budi Santoso • Akurasi ±4m`.
   - Rider dapat melirik status kecepatan, jarak, dan akurasi GPS tanpa perlu membuka kunci ponsel (*unlock pattern/fingerprint*) saat sedang melaju kencang.

3. **Pelaporan Telemetri Otomatis & Antrean Offline Tangguh (*Offline Resilience*):**
   - Mengirim titik GPS akurasi tinggi ke backend (`POST /api/events/:id/history`) setiap interval waktu tertentu (~5 detik).
   - **Tahan Zona Blank Spot:** Jika rider melintasi daerah pegunungan tanpa sinyal 4G/seluler, titik koordinat secara otomatis ditampung ke dalam antrean lokal (`localStorage`). Begitu koneksi internet pulih, seluruh titik yang tertunda langsung dikirim secara borongan (*batch flush*) ke server.

4. **Tombol "Mode Kantong" di Rider Cockpit & Rider Hub:**
   - **Di Rider Cockpit HUD (`/rider/cockpit`):** Tombol *🎒 Kantong* di bilah header atas beserta banner status aktif hijau zamrud yang menampilkan status GPS, jumlah titik terkirim, dan antrean offline.
   - **Di Rider Hub (`/rider/setup`):** Kartu aksi *🎒 Lacak di Kantong* agar peserta yang tidak memasang HP di handlebar dapat langsung menekan tombol pelacakan dan mengantongi HP tanpa perlu menyetel aplikasi Traccar eksternal.
   - Terdaftar di Service Worker cache shell (`cyclopon-v13`) untuk keandalan offline penuh.

---

## 11. Phase 12: ClimbPro & Analitik Elevasi Real-Time (Grade %)

Untuk memberikan pengalaman bersepeda dan pemantauan perlombaan ultra-cycling kelas dunia layaknya *Garmin ClimbPro* atau *Wahoo Summit*, telah diimplementasikan mesin analitik tanjakan dan kemiringan jalan cerdas dengan arsitektur murni client-side, hemat daya, dan bebas library eksternal berat (*zero-bloat*):

1. **Mesin Deteksi Tanjakan GPX Standar UCI / Strava (`gpx-utils.js`):**
   - **Pembersihan Jitter Barometer/GPS:** Filter *moving average* 5-titik untuk menstabilkan elevasi GPX mentah tanpa distorsi rute.
   - **Kriteria Validasi Segmen Tanjakan:** Panjang $\ge 500\text{ meter}$, total kenaikan elevasi (*gain*) $\ge 30\text{ meter}$, dan rata-rata kemiringan $\ge 3.0\%$.
   - **Kategorisasi Resmi:** Menghitung skor $\text{Score} = \text{Panjang (m)} \times \text{Avg Grade (\%)}$, dikelompokkan ke dalam **Cat 4** (*Hijau Zamrud*), **Cat 3** (*Kuning Amber*), **Cat 2** (*Oranye Koral*), **Cat 1** (*Merah Terang*), hingga **HC / Hors Catégorie** (*Ungu*).
   - **Kalkulasi Kemiringan Instan (`getLiveGrade`):** Menghitung gradien $\Delta\text{Ele} / \Delta\text{Dist} \times 100\%$ secara presisi pada setiap posisi kilometer rider.

2. **Rider Cockpit HUD: Metrik Kemiringan & Dynamic ClimbPro Card (`/rider/cockpit`):**
   - **Gauge Kemiringan Dinamis:** Kotak stat kemiringan real-time dengan kode warna dinamis (Biru untuk turunan, Hijau untuk datar $<3\%$, Kuning $4-6\%$, Oranye $7-9\%$, Merah $10-14\%$, Ungu ekstrem $\ge 15\%$). Dilengkapi angka ketinggian (*mdpl*) dan total *elevation gain* akumulatif.
   - **Dynamic ClimbPro Card (`#cockpitClimbCard`):** Muncul otomatis saat rider mendekati tanjakan ($\le 300\text{m}$) atau sedang aktif mendaki.
   - **Mini Slope Profile Canvas:** Visualisasi lereng tanjakan dengan arsiran warna gradien kategori, puncak bendera finish, serta titik bercahaya posisi real-time pesepeda di lereng tanjakan.
   - **Metrik Pendakian Real-time:** Sisa jarak ke puncak (km), sisa elevasi naik menuju puncak (+m), dan live kemiringan di titik tanjakan saat ini. Menghilang secara halus kembali ke mode ringkas begitu rider melewati puncak tanjakan.
   - Mendukung penuh AMOLED Pitch-Black Night Mode (`#000000`).

3. **Spectator Live Map: Arsiran Tanjakan & Laci Daftar Tanjakan (`/watch/:id`):**
   - **Highlight Warna Kategori pada Elevasi Komoot:** Segmen tanjakan diarsir warna kategori masing-masing dengan garis kontur tebal dan pin puncak bendera (`⛰️ C1`, `⛰️ C2`).
   - **Laci "⛰️ Daftar Tanjakan" (`#btnToggleClimbsDrawer`):** Menampilkan rincian seluruh tanjakan rute (Kategori, KM rentang, panjang, total gain, rata-rata dan maksimal kemiringan).
   - **Live Climbing Riders:** Menampilkan daftar nomor BIB dan nama rider yang saat ini sedang aktif berada di lereng tanjakan tersebut secara real-time.
   - **Pusatkan Kamera Interaktif:** Mengklik kartu tanjakan langsung mengarahkan peta ke koordinat awal tanjakan.

---

## 12. Penyempurnaan Tampilan Rider Cockpit HUD (AMOLED Night Mode & Layout)

Berdasarkan umpan balik dan pengujian visual langsung di kokpit pesepeda (`/rider/cockpit`), telah dilakukan serangkaian perbaikan estetika dan kegunaan pada antarmuka:

1. **Penataan Ulang Top Bar 2-Baris Responsif Bebas Tumpang Tindih:**
   - Memisahkan bilah atas menjadi 2 baris terstruktur:
     - **Baris 1 (Identitas Rider):** Tautan `🏠 Hub`, lencana `BIB #...`, dan nama pesepeda di sisi kiri, serta tombol cepat `⛶ Fullscreen` dan `🚪 Keluar` di sisi kanan.
     - **Baris 2 (Bilah Aksi & Toggle):** Tombol aksi cepat (`Bagikan`, `Kantong`, `Siang/Malam`, `Suara`, `Layar`, `Sim`) diletakkan dalam nampan geser horizontal fleksibel (`overflow-x: auto` tanpa scrollbar).
   - Menghilangkan sepenuhnya masalah tumpang tindih (*overlap*) tombol "Bagikan" di atas lencana nomor BIB pada layar smartphone pesepeda.

2. **Perbaikan Kontras Kotak Rincian Checkpoint pada Mode Malam (AMOLED):**
   - Mengganti latar putih keras `#F8F8F8` pada `.cockpit-cp-detail-box` dengan warna gelap pekat `#0D1210` dan garis batas `#1C2420` saat mode malam aktif.
   - Teks label (`#8E9E95`) dan nilai numerik (`#F3F7F5`) kini terbaca kontras, tajam, dan tidak menyilaukan mata pengendara di malam hari.

3. **Sinkronisasi Bilah Darurat Bawah (*Sticky Bottom Bar*):**
   - Menyelaraskan selektor CSS `body.night-mode .cockpit-bottom-bar` dan `body.night-mode .cockpit-nav-btn`.
   - Latar bilah bawah kini menyatu sempurna dalam warna pitch black AMOLED (`rgba(8, 10, 9, 0.96)`) dengan tombol merah SOS bercahaya dan tombol navigasi Live Map gelap elegan.

4. **Pembersihan Watermark Peta Mini (Transisi ke OpenStreetMap Asli + Filter Dark Mode):**
   - Mengganti sumber peta mini dari CartoDB (yang memunculkan cap air *"API KEY REQUIRED"*) ke **OpenStreetMap resmi** tanpa memerlukan API key eksternal.
   - Menerapkan filter CSS inversi malam pintar (`filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%)`), menghasilkan peta gelap kontras tinggi yang jernih dan bebas watermark.

5. **Penanganan Elegan Status Tanpa Checkpoint (*Graceful Empty State*):**
   - Bila rute event tidak memiliki checkpoint transit, widget checkpoint secara cerdas menyembunyikan 3 kotak kosong (`-- km`, `--:--`) dan menampilkan status bersahabat: *"🏁 Rute Bebas (Tanpa Transit)"* dengan lencana *"NAVIGASI GPX"* serta panduan *"ℹ️ Ikuti garis rute GPX pada peta hingga garis finish"*.

---

## 13. Phase 13: Containerization & Stack Deployment VPS (Docker & Caddy SSL)

Telah disiapkan bundel deployment lengkap berbasis container Docker untuk mempermudah pemasangan di server VPS mandiri (DigitalOcean, Hetzner, AWS, Contabo, IDCloudHost) tanpa perlu konfigurasi manual yang rumit:

1. **Multi-Stage `Dockerfile` (< 150 MB):**
   - Menggunakan image dasar `node:22-alpine` yang ultra-ramping dan hemat memori.
   - Stage builder mengompilasi dependensi native SQLite (`better-sqlite3`) secara bersih, sementara stage runner hanya menyalin runtime produksi dan utilitas pemeriksaan kesehatan (`wget`).
   - Dilengkapi perintah bawaan `HEALTHCHECK` yang memantau endpoint `/api/health`.

2. **Konfigurasi Traccar Teroptimasi (`docker/traccar/traccar.xml`):**
   - Pra-konfigurasi ringan yang mengaktifkan port 5055 (OsmAnd GPS protocol) dan port 8082 (Web dashboard).
   - Menonaktifkan geocoding eksternal untuk menghemat bandwidth, CPU, dan kuota API publik.
   - Menggunakan basis data bawaan H2 yang efisien dan tanpa konfigurasi tambahan.

3. **Orkestrasi 1-Perintah (`docker-compose.yml`):**
   - Menghubungkan CycloPon dan Traccar Server dalam bridge network terisolasi (`cyclopon-net`).
   - Menyimpan database SQLite (`cyclopon_data`) dan berkas rute GPX yang diunggah (`cyclopon_gpx`) dalam Docker Named Volumes yang aman dari restart atau pembaruan image.
   - Dapat dijalankan hanya dengan: `docker compose up -d`.

4. **Stack Produksi dengan SSL Otomatis (`docker-compose.prod.yml` & Caddy):**
   - Menyertakan **Caddy Server 2** sebagai reverse proxy otomatis di port 80 dan 443 (HTTP/3 QUIC).
   - Menerbitkan dan memperbarui sertifikat HTTPS Let's Encrypt secara otomatis tanpa perlu cron job certbot manual.

5. **Skrip Otomasi Operasional & Panduan Deployment:**
   - `scripts/backup.sh`: Skrip pencadangan database SQLite yang konsisten (WAL safe) dan pengarsipan rute GPX ke berkas berstempel waktu `.tar.gz`, dilengkapi rotasi otomatis 14 backup terakhir.
   - `scripts/restore.sh`: Skrip pemulihan database dari berkas arsip dengan prompt konfirmasi keselamatan.
   - `DEPLOYMENT.md`: Panduan deployment produksi komprehensif dari pemilihan spek VPS, firewall UFW, domain DNS, konfigurasi smartphone peserta, hingga strategi troubleshooting.

---

## 14. Phase 14: Real-Time Visitor Traffic & Live Spectator Analytics di Admin Panel

Untuk mengantisipasi lonjakan penonton saat event balapan berlangsung, CycloPon dilengkapi modul analitik mandiri (*zero-bloat*, tanpa Google Analytics atau pelacak eksternal berat):

1. **Pemantauan Penonton Live Real-Time (`/traccar-ws`):**
   - Mengukur jumlah koneksi WebSocket aktif secara langsung melalui `ws.Server.clients.size` dengan kompleksitas waktu $O(1)$ dan overhead CPU nol.
   - Melacak **Puncak Serentak (Peak Concurrent Viewers)** yang mencatat rekor tertinggi penonton yang menyaksikan balapan secara bersamaan.

2. **Mesin Pelacak Kunjungan Halaman Mandiri (SQLite WAL):**
   - Tabel `page_views` di SQLite mencatat setiap navigasi halaman web (`/`, `/events/:id`, `/rider/cockpit`, dll).
   - Mengabaikan aset statis (`.js`, `.css`, `.png`, dll) dan panggilan API internal sehingga data mencerminkan interaksi pengguna nyata.
   - **Privasi Terjaga:** Alamat IP pengunjung dienkripsi menjadi hash SHA-256 (16 karakter awal) sehingga identitas pengguna tidak disimpan secara telanjang, sekaligus memungkinkan penghitungan *Pengunjung Unik Hari Ini* (`COUNT(DISTINCT ip_hash)`).

3. **REST API Terproteksi Sesi Admin:**
   - Endpoint `GET /api/admin/metrics/traffic` hanya dapat diakses oleh sesi admin yang terautentikasi.
   - Mengembalikan data: `liveViewers`, `peakViewers`, `todayUniqueVisitors`, `todayViews`, `allTimeViews`, `weeklyTrend` (7 hari terakhir), dan `topPages` terpopuler.

4. **Widget Analitik Dinamis di Admin Dashboard (`/admin/dashboard`):**
   - Menampilkan 4 kartu ringkasan metrik:
     - **Penonton Live Sekarang** (disertai lencana berkedip hijau *live-pulse-dot*).
     - **Puncak Serentak (Peak Viewers)**.
     - **Pengunjung Unik Hari Ini**.
     - **Total Tayangan Halaman**.
   - Sub-bar interaktif menampilkan halaman paling populer hari ini beserta jumlah tayangannya.
   - Auto-refresh setiap 5 detik saat halaman aktif, dan otomatis dibersihkan saat navigasi berpindah (*clean interval teardown*).

---

## 15. Phase 15: Onboarding Peserta & Registrasi Manual Panitia/Sweeper (Zero-Confusion)

Untuk memfasilitasi kebutuhan operasional lapangan di mana peserta, panitia sweeper (penyapu belakang), marshall rute, dan tim medis evakuasi dapat bergabung dengan mudah tanpa kebingungan teknis mengenai nomor BIB dan PIN:

1. **Registrasi Manual Fleksibel oleh Admin ([`/admin/events/:id`](file:///home/kruza/Documents/cyclopon/public/js/pages/admin-event.js)):**
   - Panel formulir manual yang mendukung input kustom untuk nomor BIB alfanumerik (`001`, `SWEEP-01`, `RC-1`, `MED-01`).
   - Pilihan Peran (*Role Selector*):
     - 🚴 **Peserta (Rider)**
     - 🧹 **Sweeper (Penyapu Belakang)** — otomatis mendapatkan palet oranye dinamis (`#F97316`)
     - 🏍️ **Marshall / Road Captain** — otomatis mendapatkan palet biru navigasi (`#3B82F6`)
     - 🚑 **Tim Medis / Evakuasi** — otomatis mendapatkan palet merah darurat (`#EF4444`)
   - Input nomor WhatsApp opsional dengan resolusi PIN cerdas: jika PIN tidak diisi manual, sistem otomatis menetapkan **4 digit terakhir nomor WhatsApp** (atau fallback `1234`).
   - Token Magic Link 12-karakter unik auto-generated untuk setiap peserta.

2. **Akses Cepat Kredensial & WhatsApp Dispatch:**
   - **Tombol "📋 Salin Link":** Menyalin tautan Magic Link (`/r/:token`) langsung ke clipboard admin untuk dibagikan ke grup WhatsApp atau Telegram.
   - **Tombol "💬 WA":** Tombol 1-klik yang langsung membuka WhatsApp Web / Aplikasi dengan template pesan resmi terisi otomatis:
     ```text
     Halo Kak [Nama]! 👋
     Berikut akses pelacak Cyclopon Anda untuk event [Nama Event]:
     • Nomor BIB: #[BIB]
     • PIN Akses: [PIN]

     Atau langsung login 1-klik tanpa ketik BIB & PIN:
     👉 https://.../r/[token]
     ```

3. **Impor Massal Spreadsheet CSV ([`POST /api/admin/riders/events/:id/import`](file:///home/kruza/Documents/cyclopon/routes/riders.js)):**
   - Mendukung unggah berkas `.csv` atau tempel teks langsung di dashboard admin.
   - Format kolom: `bib,nama,no_hp,peran,pin`.
   - Mengabaikan duplikasi nomor BIB dan menghasilkan ringkasan jumlah peserta yang berhasil diimpor.
   - Tombol **"📥 Template CSV"** (`GET /api/admin/riders/events/:id/template`) untuk mengunduh contoh struktur CSV resmi dalam format Excel/Spreadsheet.

4. **Pendaftaran Mandiri di Lapangan / On-The-Spot ([`/rider`](file:///home/kruza/Documents/cyclopon/public/js/pages/rider-login.js)):**
   - Modal self-service *"➕ Daftar Mandiri di Lapangan (Rider / Sweeper)"* khusus untuk peserta susulan atau panitia lapangan.
   - Peserta langsung memilih peran, menginput nomor BIB, nama, nomor WhatsApp, dan PIN.
   - Akun langsung terverifikasi seketika dan langsung dialihkan ke layar panduan pelacak (*Rider Setup*).

5. **Magic Link Tanpa Ketik ([`/r/:token`](file:///home/kruza/Documents/cyclopon/routes/auth.js)):**
   - Tautan unik yang langsung memverifikasi kredensial peserta melalui `GET /api/auth/token/:token`, menyimpan sesi di `sessionStorage` & `localStorage`, dan mengarahkan rider langsung ke kokpit tanpa perlu memasukkan BIB maupun PIN.

6. **Identitas Peran Visual di Live Map ([`/watch/:id`](file:///home/kruza/Documents/cyclopon/public/js/pages/live-map.js)):**
   - Lencana visual `🧹 SWEEPER`, `🏍️ MARSHALL`, dan `🚑 MEDIS` tampil langsung di baris Leaderboard dan popup marker Leaflet.
   - Memudahkan penonton dan panitia mengidentifikasi posisi sweeper yang mengawal rombongan paling belakang secara real-time.

---

## 16. Phase 16: Penyeragaman & Modernisasi UI Menyeluruh (2026 Athletic / Sports-Grade Design)

Menjawab kebutuhan estetika modern kelas industri olahraga internasional (seperti Strava, Wahoo, Zwift), seluruh antarmuka utama telah diseragamkan dengan bahasa desain yang konsisten:

1. **Desain Sistem & Nuansa Visual Terpadu:**
   - **Kanvas Latar Belakang:** Ambient radial glow yang halus (`radial-gradient(circle at 50% 12%, rgba(43, 78, 48, 0.08) 0%, rgba(209, 169, 128, 0.06) 40%, #F8F8F8 85%)`).
   - **Kartu & Wadah:** Border radius modern `20px - 28px`, bingkai berpresisi `1px solid rgba(208, 201, 191, 0.7)`, dan elevasi bayangan halus `0 20px 50px -12px rgba(28, 40, 38, 0.08)`.
   - **Squircle Badges:** Ikon wadah squircle `border-radius: 14px - 18px` dengan aksen palet lembut terkurasi (Emerald, Sand/Terracotta, Sage Forest, Sky Blue, Earth Amber) menggantikan emoji mentah biasa.
   - **Tombol Aksi Utama (CTA):** Gradien tajam `linear-gradient(135deg, #2B4E30 0%, #3D6F46 100%)` berbayangan `0 6px 20px rgba(43, 78, 48, 0.32)`.

2. **Halaman Beranda / Landing ([`/`](file:///home/kruza/Documents/cyclopon/public/js/pages/landing.js) & [`public/css/global.css`](file:///home/kruza/Documents/cyclopon/public/css/global.css)):**
   - **Top Nav Sticky:** Navigasi berlatar blur kaca (`backdrop-filter: blur(12px)`), logo lambang pesepeda SVG dalam badge squircle, dan tombol akses *"Admin Panel"* berikon perisai.
   - **Hero Section:** Pill badge *"🏆 LIVE GPS CYCLING TRACKER"* berbayangan halus, tipografi berbobot atletik, serta tombol CTA berikon SVG pesepeda & peta.
   - **Kartu Event Aktif:** Kartu dengan aksen bar gradien vertikal, indikator status *"• LIVE"* hijau berdenyut, chip tanggal event, tombol unduh rute GPX, dan tombol akses peta *"Buka Peta →"*.
   - **3 Kartu Keunggulan (Feature Grid):** Wadah squircle SVG untuk Interval Baterai (Emerald), Lacak di Kantong / Screen Off (Sand), dan Rute GPX / Leaderboard (Sage).

3. **Login Peserta / Rider Login ([`/rider`](file:///home/kruza/Documents/cyclopon/public/js/pages/rider-login.js) & [`public/css/rider.css`](file:///home/kruza/Documents/cyclopon/public/css/rider.css)):**
   - Top nav pill dengan tombol `← Beranda` dan `• CYCLOPON LIVE` pulse indicator.
   - Lambang pesepeda SVG modern dalam cincin avatar berlatar sage halus.
   - Dropdown event dengan bendera balap `🏁` dan panah chevron kustom.
   - Kolom BIB berawalan lencana hashtag `#`.
   - 6 slot PIN squircle interaktif dengan kursor berkedip dan titik hijau gradien bercahaya saat terisi.
   - Keypad angka taktil bergaya dialer telepon dengan sub-huruf (`ABC`, `DEF`, dsb.), tombol hapus SVG, dan tombol `OK ✓` yang menyala otomatis saat PIN valid.

4. **Login Admin / Race Control ([`/admin`](file:///home/kruza/Documents/cyclopon/public/js/pages/admin-dashboard.js) & [`public/css/admin.css`](file:///home/kruza/Documents/cyclopon/public/css/admin.css)):**
   - Diselaraskan 100% dengan tata letak kartu Rider Login: top nav pill dengan `← Beranda` dan badge `🛡️ RACE CONTROL`.
   - Cincin lambang kunci/perisai bergradien sage lembut.
   - Kolom input berawalan ikon lencana (👤 username/email, 🔒 password).
   - Kotak informasi kredensial Dev Mode yang rapi.
   - Tombol utama gradien berbayangan tegap *"Masuk ke Admin Panel →"*.

5. **Rider Hub & Panduan Pelacak ([`/rider/setup`](file:///home/kruza/Documents/cyclopon/public/js/pages/rider-setup.js) & [`public/css/rider.css`](file:///home/kruza/Documents/cyclopon/public/css/rider.css)):**
   - **Header Hub:** Navigasi `← Beranda`, lencana lambang Rider Hub, lencana peran (`🧹 SWEEPER` / `🏍️ MARSHALL`), lencana nomor BIB, dan tombol merah `Keluar`.
   - **Kartu Sambutan:** Aksen warna personal rider dalam cincin halo avatar, nama rider, tag event `🏁`, dan pill `DEVICE ID`.
   - **5 Kartu Menu Rider (Hub Actions):**
     1. *Cockpit HUD* (Layar Handlebar, COT timer, speedo) berbadge Emerald.
     2. *Lacak di Kantong* (Web Background GPS keep-alive) berbadge Sand.
     3. *Setup Traccar* (Panduan Traccar Client resmi) berbadge Sage.
     4. *Live Map Event* (Peta penonton & tombol bagikan tautan) berbadge Sky Blue.
     5. *File GPX Rute* (Unduh file GPX rute untuk bike computer Garmin/Wahoo) berbadge Earth Amber.
   - **Parameter Traccar Client:** Chip nilai parameter bergaya monospace rapi dengan tombol salin instan per baris dan tombol *"📋 Salin Semua"*.
   - **Panduan 4 Langkah:** Nomor langkah squircle bernuansa hijau dengan penanda selesai (*Done*) pada langkah ke-4.
   - **Kartu Bantuan SOS Darurat:** Desain hazard peringatan merah dengan denyut animasi untuk kesiapan respon darurat di jalan.

---

## 17. Phase 17: Race Control In-App SOS Monitor, Audio Sirene & Perbaikan Pengujian Notifikasi

### Akar Masalah & Temuan:
1. **Ketiadaan Notifikasi SOS di Admin Panel:**
   - Endpoint SOS sebelumnya hanya mengirimkan event ke saluran eksternal (Telegram/Webhook). Jika admin belum mengonfigurasi Telegram bot atau Webhook, tidak ada notifikasi yang terkirim sama sekali.
   - Pada web app CycloPon, hanya halaman `live-map.js` yang memiliki polling alert aktif; seluruh halaman Admin (`/admin/dashboard`, `/admin/notifications`, `/admin/events/:id`) tidak memiliki sistem pemantau alert, audio alarm, maupun banner peringatan darurat.
   - Payload SOS dari `rider-cockpit.js` mengirimkan properti `lat` dan `lng`, sedangkan backend mencari `latitude` dan `longitude`, sehingga koordinat GPS rider di database tersimpan `null`.
2. **Error Pesan Uji Coba di Halaman Notifikasi Panitia:**
   - Fitur uji coba sebelumnya mengeksekusi kedua saluran (Telegram dan Webhook) secara sekaligus tanpa opsi pengujian terpisah. Jika admin hanya mengisi Telegram dan membiarkan Webhook kosong, respon sistem menganggap pengujian gagal total karena Webhook URL kosong.
   - Terjadi `ReferenceError: escapeHtml is not defined` di browser saat menampilkan pesan kegagalan dari server karena fungsi `escapeHtml` hanya didefinisikan di sisi server.

### Solusi & Implementasi:
1. **Race Control Global SOS Monitor (`AdminSosMonitor` di [`public/js/pages/admin-dashboard.js`](file:///home/kruza/Documents/cyclopon/public/js/pages/admin-dashboard.js)):**
   - **Polling Real-Time:** Endpoint baru `GET /api/admin/alerts/active` dipantau setiap 3,5 detik di semua halaman admin.
   - **Sirene Audio Darurat (Web Audio API):** Osilator dual-tone bergaya sirene ambulans darurat (960 Hz / 770 Hz) yang berbunyi otomatis saat ada panggilan darurat baru.
   - **Banner Bahaya Melayang (`#adminGlobalSosBar`):** Banner merah berkedip di bagian paling atas layar Admin yang memuat info rider, nama event, tombol kontak instan WhatsApp (`wa.me/62...`), tautan Live Map terfokus (`/watch/:id?bib=...`), tombol heningkan sirene, dan tombol penyelesaian alert instan.
   - **Kartu Insiden Aktif di Dashboard:** Kartu merah darurat di atas analitik trafik dashboard yang merinci seluruh insiden SOS yang belum terselesaikan beserta waktu dan koordinat.
   - **Badge Sidebar Berkedip:** Lencana merah berdenyut (`🚨 X SOS`) di menu navigasi sidebar admin.
   - **Web Desktop Notifications:** Menampilkan popup notifikasi desktop native OS jika izin notifikasi diberikan.
2. **Dukungan Alias Koordinat GPS ([`routes/alerts.js`](file:///home/kruza/Documents/cyclopon/routes/alerts.js)):**
   - Menerima baik `latitude`/`longitude` maupun `lat`/`lng` sehingga sinyal darurat dari Cockpit maupun Setup tersimpan dengan koordinat presisi.
3. **Penyempurnaan Pengujian Notifikasi Panitia ([`public/js/pages/admin-notifications.js`](file:///home/kruza/Documents/cyclopon/public/js/pages/admin-notifications.js)):**
   - Tombol uji coba dipisahkan secara independen: **⚡ Tes Telegram**, **⚡ Tes Webhook**, dan **🔊 Tes Sirene SOS Panitia**.
   - Sanitasi otomatis token Telegram (menghapus duplikasi prefix `bot`, memotong spasi liar) dan sanitasi Chat ID.
   - Pesan panduan & error dalam bahasa Indonesia yang ramah (misalnya menjelaskan syarat wajib Telegram: pengguna harus menekan `/start` pada bot sebelum bot dapat mengirim pesan).
   - Menambahkan `escapeHtml` di [`public/js/lib/utils.js`](file:///home/kruza/Documents/cyclopon/public/js/lib/utils.js) untuk pencegahan error client-side dan XSS.

---

## 18. Phase 18: Pemisahan Tampilan Live Map, Arsitektur Floating Controls (Google Maps / Strava Style) & Optimalisasi Mobile Responsive

### Latar Belakang & Masukan:
Pada tampilan Live Map sebelumnya di smartphone/mobile:
1. Seluruh kontrol teknis (*Layer OSM*, *CyclOSM*, *Esri Satelit*, *Fit Rute*, *Elevasi*, *Leaderboard*, *Hasil*, dan *Simulasi*) ditempatkan di satu baris header atas.
2. Ketika label teks disembunyikan di layar kecil, header berubah menjadi deretan kotak emoji kerdil yang berhimpitan (`[🚴 🛰️] [🎯] [⛰️] [📊 2] [🏆]`), sebagian terpotong scroll horizontal, dan nama event menjadi sangat sempit (terpotong di 95px).

### Solusi & Implementasi:
1. **Arsitektur Floating Action Controls (Gaya Google Maps / Strava):**
   - **Header Bersih & Ultra-Minimalis:** 
     - Sisi kiri: Logo 🚴 + Nama Event (misal *"Gravel to Gang"*) ditampilkan utuh, tebal, dan proporsional tanpa terpotong kaku.
     - Sisi kanan: **Hanya 1 tombol utama untuk Penonton**: **📊 Leaderboard [2]**! 
     - Tombol **🏆 Hasil & Brevet** dialihkan khusus untuk Panitia/Admin (tersedia di kartu event Admin Dashboard `/admin/dashboard`, panel edit event `/admin/events/:id`, dan hanya muncul di Live Map jika masuk sebagai admin).
     - Seluruh tombol layer, fit rute, dan elevasi **dikeluarkan dari header** menjadi floating controls di peta!
   - **Floating Action Stack (`.map-floating-stack`) di Sisi Kanan Peta (Ikon Vektor Standar Legal):**
     - **Layer Picker FAB (Stacked Layers):** Menggantikan emoji pancake dengan ikon vektor SVG *Rhombus Bertingkat* (standar Google Maps / GIS), membuka pop-over kartu elegan untuk memilih *OSM (Jalan)*, *CyclOSM Sepeda*, dan *Esri Satelit* yang masing-masing dilengkapi ikon SVG vektor presisi (*Folded Map*, *Bicycle*, dan *Globe*).
     - **Fit Route FAB (GPS Crosshairs Target):** Menggantikan emoji dart dengan ikon vektor SVG *Crosshair Reticle GPS* (standar navigasi Google Maps / Strava) untuk re-center rute secara instan.
     - **Elevation Profile FAB (Terrain Peaks):** Menggantikan emoji dengan ikon vektor SVG *Kontur Gunung / Terrain Silhouette* untuk buka/tutup grafik elevasi Komoot.
     - **Ikon Navigasi Seragam:** Tombol Leaderboard dan alat kontrol panitia kini menggunakan ikon SVG monokromatik (`currentColor`) yang menyatu harmonis dengan palet tema tanpa ketergantungan emoji sistem operasi.
     - **Peniadaan Tombol Zoom `+ / -`:** Tombol zoom statis Leaflet dihilangkan sepenuhnya dari layar. Pengguna dapat memperbesar/memperkecil peta secara natural menggunakan gesture *pinch-to-zoom* (layar sentuh/smartphone) atau *scroll wheel / trackpad* (desktop), menjadikan area pandang peta 100% lapang dan bebas tombol yang tidak perlu.

2. **Pemisahan Mode Penonton (Spectator) vs Panitia (Race Control):**
   - **Mode Penonton:** Tampilan 100% bebas dari kontrol teknis & administratif (tanpa tombol Hasil & Brevet, Simulasi, Replay, atau Unduh GPX). Di header kanan hanya tersisa 1 tombol tunggal `📊 Leaderboard` yang sangat bersih. Popup darurat SOS bersifat informatif tanpa tombol intervensi kasus.
   - **Mode Panitia:** Aktif otomatis jika login admin atau via parameter `?admin=1`, menyediakan badge `🛡️ PANITIA`, tombol cepat `← Dashboard`, tombol `🏆 Hasil & Brevet`, `🎮 Simulasi GPS`, `⏮️ Replay Time Machine`, dan `📍 Unduh GPX`.
   - **Admin Dashboard Integration:** Tombol `🏆 Hasil & Brevet` ditambahkan langsung di setiap kartu event pada Dashboard Utama (`/admin/dashboard`) agar panitia dapat langsung melihat & mencetak rekap hasil resmi tanpa harus masuk ke peta live tracking.

3. **Pembaruan Service Worker:**
   - Cache shell dinaikkan ke `cyclopon-v22` di [`public/sw.js`](file:///home/kruza/Documents/cyclopon/public/sw.js) agar pembaruan styling CSS dan ikon vektor SVG baru instan terpasang di browser tanpa cache usang.

---

## 19. Phase 19: Tipografi Murni Brand "CycloPon" (Peniadaan Ikon Emoji Sepeda di Mode Desktop & Mobile)

### Latar Belakang & Masukan:
Pada header aplikasi (khususnya tampilan Live Map dan admin), sebelumnya terdapat ikon emoji sepeda (`🚴`) di samping teks nama brand. Pada tampilan mobile smartphone, styling lama bahkan sempat menyembunyikan tulisan nama brand dan hanya menyisakan emoji sepeda, yang mengurangi kesan profesional dan formal aplikasi.

### Solusi & Implementasi:
1. **Penghapusan Ikon Emoji Sepeda (`🚴`):**
   - Menghapus elemen `<span class="logo-icon">🚴</span>` dari markup header di [`public/js/pages/live-map.js`](file:///home/kruza/Documents/cyclopon/public/js/pages/live-map.js).
   - Menghilangkan emoji `🚴` pada brand sidebar di [`public/js/pages/admin-dashboard.js`](file:///home/kruza/Documents/cyclopon/public/js/pages/admin-dashboard.js).
2. **Penyempurnaan Tampilan Tipografi Murni "CycloPon":**
   - Menata ulang CSS `.header-logo` dan `.header-logo .logo-text` di [`public/css/map.css`](file:///home/kruza/Documents/cyclopon/public/css/map.css):
     - **Desktop:** Menampilkan tipografi teks `CycloPon` dengan warna Sage (`var(--color-sage)`), bobot `font-weight: 900`, `letter-spacing: -0.03em`, dan efek transisi hover ke warna kuning aksen.
     - **Mobile (Smartphones):** Memastikan teks `CycloPon` tampil utuh (`display: inline-block !important; font-size: 14px;`) tanpa emoji dan tanpa terpotong, memberikan identitas brand yang tegas, minimalis, dan bersih.
3. **Peningkatan Versi Service Worker:**
   - Menaikkan cache shell ke `cyclopon-v23` di [`public/sw.js`](file:///home/kruza/Documents/cyclopon/public/sw.js) untuk menjamin pembaruan instan bagi pengguna tanpa tersimpan cache lama.
4. **Verifikasi Pengujian:**
   - 73/73 pengujian unit Node.js lulus 100% tanpa regresi.

---

## 20. Phase 20: Audit Responsif Mobile Menyeluruh & Pemulihan Header Live Map Ultra-Bersih

### Latar Belakang & Masukan:
1. **Layout Admin Terhimpit di Layar Mobile:** Halaman Pengaturan Notifikasi sebelumnya memiliki kolom panduan fixed 340px yang menyebabkan overflow horizontal dan menekan formulir utama menjadi kolom vertikal sempit.
2. **Kekacauan Header Live Map di Mobile:** Header Live Map sempat memaksakan label teks panjang (`.action-btn-label`) dan tombol ekstra panitia (`🏆 Hasil & Brevet`, `⭳ Unduh GPX`) di layar smartphone 390px, sehingga menumpuk lebih dari 550px lebar konten. Akibatnya, logo `CycloPon` terpotong menjadi satu huruf `C` dan tombol-tombol berantakan saling tumpang tindih.

### Solusi & Implementasi:
1. **Perbaikan Grid Admin & Proteksi Global ([`public/css/admin.css`](file:///home/kruza/Documents/cyclopon/public/css/admin.css), [`public/css/global.css`](file:///home/kruza/Documents/cyclopon/public/css/global.css), [`public/js/pages/admin-notifications.js`](file:///home/kruza/Documents/cyclopon/public/js/pages/admin-notifications.js)):**
   - Mengubah `.admin-layout` di mobile ($\le$ 768px) menjadi `flex-direction: column` dengan `overflow-x: hidden`.
   - Mengganti grid inline fixed 340px dengan class responsif `.admin-grid-sidebar` (1 kolom penuh di mobile, 2 kolom di desktop).
   - Menambahkan tombol aksi responsif `.admin-action-btn-row` dan touch-scrolling `.table-responsive-wrapper`.
2. **Pemulihan Header Live Map yang Bersih & Rapi ([`public/js/pages/live-map.js`](file:///home/kruza/Documents/cyclopon/public/js/pages/live-map.js), [`public/css/map.css`](file:///home/kruza/Documents/cyclopon/public/css/map.css)):**
   - Menghapus tombol *Hasil & Brevet* dan *Unduh GPX* dari header Live Map sesuai instruksi user sebelumnya (fitur tersebut sudah tersedia secara khusus di dashboard admin).
   - Menyembunyikan label teks tombol di layar mobile (`.action-btn-label { display: none !important; }`), mengubah tombol panitia (`▷ Simulasi`, `↺ Replay`) menjadi tombol ikon modern 34x34px yang hemat ruang.
   - Mengunci `header-logo` dengan `flex-shrink: 0`, sehingga teks brand **CycloPon** tidak akan pernah terpotong atau tertekan.
   - Memastikan nama event ditampilkan proporsional dengan elipsis rapi (`text-overflow: ellipsis`).
3. **Peningkatan Versi Service Worker:**
   - Cache shell dinaikkan ke `cyclopon-v24` di [`public/sw.js`](file:///home/kruza/Documents/cyclopon/public/sw.js).

---

## 21. Phase 21: Optimasi Arsitektur Performa Skala Tinggi & Stress Benchmark Otomatis

### Latar Belakang & Analisis Bottleneck:
1. **WebSocket Proxy 1-to-1 Bottleneck:** Sebelumnya setiap klien penonton yang membuka Live Map membuka koneksi keluar baru ke Traccar (`1 client = 1 upstream connection`). Dengan 500–1.000 penonton simultan, CycloPon akan membuka ratusan koneksi WebSocket terduplikasi ke Traccar Java runtime yang berisiko memicu crash socket exhaustion.
2. **Synchronous Disk I/O Blocking pada Traffic Tracking:** Setiap HTTP GET request halaman penonton langsung mengeksekusi `db.recordPageView.run(...)` secara sinkron di main thread event loop Node.js.
3. **Ketiadaan Kompresi HTTP (Gzip) di Level Node.js:** File GPX rute (2–10 MB XML) dan bundle statis ditransfer mentah tanpa kompresi jika dijalankan tanpa Caddy proxy.
4. **Ketiadaan Automated Stress & Benchmark Suite:** Tidak ada alat pengukur performa throughput, latensi P95, dan reliabilitas WebSocket saat simulasi lonjakan penonton.

### Solusi & Implementasi:
1. **Singleton Upstream Connection Pool & Fan-Out Broadcast ([`lib/traccar-ws-proxy.js`](file:///c:/Users/Mallik/Documents/cyclopon/lib/traccar-ws-proxy.js)):**
   - Menjaga hanya **1 koneksi tunggal** persisten antara CycloPon dan Traccar `/api/socket`.
   - Menggunakan mekanisme **Fan-Out Broadcast** langsung ke seluruh socket penonton yang aktif dengan latensi rata-rata hanya **3.62 ms** (P95: 6.18 ms).
   - Pengurangan beban koneksi ke Traccar mencapai **99.8%**.
   - Menyimpan *cached latest telemetry state* untuk langsung dikirimkan ke penonton baru tanpa menunggu tick GPS berikutnya.
   - Dilengkapi proteksi *on-demand reconnect* dan timer `unref()` agar tidak menggantung runtime atau pengujian otomatis.
2. **In-Memory Asynchronous Batch Queue ([`lib/traffic-queue.js`](file:///c:/Users/Mallik/Documents/cyclopon/lib/traffic-queue.js)):**
   - Menggantikan disk I/O per-request dengan antrean in-memory berkapasitas buffer threshold 50 entri atau timer flush 2 detik.
   - Menjalankan penulisan batch dalam 1 transaksi SQLite atomic (`db.transaction`), mengeliminasi blocking pada event loop utama.
   - Panggilan otomatis `flushQueue()` saat endpoint metrik admin dibaca untuk menjamin akurasi data analitik real-time.
3. **HTTP Response Compression Gzip ([`server.js`](file:///c:/Users/Mallik/Documents/cyclopon/server.js)):**
   - Memasang middleware `compression({ threshold: 1024 })` untuk mereduksi ukuran transfer file GPX rute dan data JSON hingga 70–85%.
4. **Automated Concurrency & Stress Benchmark Suite ([`scripts/benchmark.js`](file:///c:/Users/Mallik/Documents/cyclopon/scripts/benchmark.js) / `npm run benchmark`):**
   - Mensimulasikan **100 concurrent WebSocket viewers** dan burst **200 HTTP telemetry uploads/page views**.
   - **Hasil Uji Benchmark:**
     - Concurrent Viewers: 100 klien terhubung dalam **100.8 ms**.
     - Paket Terkirim: **2.000 / 2.000 (0.00% packet loss)**.
     - Latensi Fan-Out: **Rata-rata 3.62 ms (P95: 6.18 ms)**.
     - HTTP Throughput: **839.3 requests / detik**.
     - HTTP Latency: **P50: 17.87 ms (Max: 108.58 ms)**.
     - HTTP Error Rate: **0.00%**.
     - Memory RSS Delta: **25.15 MB** (sangat stabil dan hemat memori).
5. **Verifikasi Kualitas:**
   - Total unit tests meningkat dari 73 menjadi **88 / 88 Lulus 100% (13 Test Suites)**.

---

## 22. Phase 22: Redesain Menyeluruh "Athletic Minimalist Pro" (Rapha / Pas Normal Studios Aesthetic) & Standarisasi Desain

### Latar Belakang & Masukan:
1. **Peningkatan Kualitas Visual ke Tingkat Dunia:** Pengguna menginginkan antarmuka yang tidak hanya fungsional tetapi juga memiliki impresi visual berkelas tinggi (*wow factor*) layaknya merek apparel dan media balap sepeda premium dunia (**Rapha**, **Pas Normal Studios**, **Strava PRO**).
2. **Kerapian Layar Mobile:** Pada tampilan HP sebelumnya di halaman Rider Setup, section panduan 4 langkah Traccar dan tombol SOS darurat terlihat terpisah-pisah dan kurang padu dibandingkan kotak konfigurasi di atasnya. Pengguna meminta: *"section ini akan terlihat rapih jika di kemas dalam kotak seperti section yang di atasnya"*.
3. **Standarisasi Menyeluruh:** Keberhasilan redesain Landing Page yang sangat disukai pengguna memicu kesepakatan untuk menyeragamkan seluruh modul aplikasi ke bahasa desain yang sama.

### Solusi & Implementasi:

1. **Redesain Total Landing Page ([`public/js/pages/landing.js`](file:///c:/Users/Mallik/Documents/cyclopon/public/js/pages/landing.js), [`public/css/global.css`](file:///c:/Users/Mallik/Documents/cyclopon/public/css/global.css)):**
   - **Tipografi Atletik Presisi:** Headings tegas dengan letter-spacing rapat (`-0.03em`), sans-serif modern, dipadukan dengan micro-tags monospace huruf kapital (`// ULTRA-DISTANCE LIVE TELEMETRY MATRIX · V3.0`).
   - **Palet Warna "Chalk & Jet Black":** Latar belakang putih kapur bersih (`#FFFFFF` & `#F8F9FA`), garis pembatas hitam atletik tajam `1.5px solid #0D1117`, aksen hairline abu-abu `1px solid #E5E7EB`, serta aksen hijau emerald (`#047857`) untuk status aktif.
   - **Kartu Event Balapan Disiplin:** Kartu modern dengan status badge `● AKTIF` atau `SELESAI`, tanggal pelaksanaan, info ketersediaan rute GPX, dan tombol navigasi aksi cepat.
   - **Kartu Sesi Cepat:** Widget sesi rider aktif atau admin aktif di halaman muka untuk navigasi 1-klik langsung ke Cockpit HUD atau Race Control.

2. **Modul 1: Alur Rider Hub & Setup ([`public/js/pages/rider-login.js`](file:///c:/Users/Mallik/Documents/cyclopon/public/js/pages/rider-login.js), [`public/js/pages/rider-setup.js`](file:///c:/Users/Mallik/Documents/cyclopon/public/js/pages/rider-setup.js), [`public/css/rider.css`](file:///c:/Users/Mallik/Documents/cyclopon/public/css/rider.css)):**
   - **Rider Login (Accreditation Pass):** Diubah dari form konvensional menjadi pas akreditasi peserta balap dengan slot PIN monospace 4-digit dan keypad taktis modern.
   - **Enkapsulasi Panduan 4 Langkah Traccar (`.setup-steps-container-card`):**
     - Membungkus keempat langkah panduan ke dalam kartu kontainer seragam bergaris hitam `1.5px solid #0D1117` dan radius `10px`.
     - Dilengkapi header teknis `// PANDUAN AKTIVASI SAKU JERSEY`, judul `4 Langkah Pengaturan GPS`, dan badge protokol `OSMAND 5055`.
     - Baris tiap langkah menggunakan badge nomor squircle monospace (`01`, `02`, `03`, `04`), hairline divider putus-putus, dan chip download store Traccar (`.btn-store-chip`).
     - Langkah 04 disorot dengan warna hijau emerald (`#047857`) sebagai tanda siap gowes.
   - **Enkapsulasi Pusat Bantuan Darurat SOS (`.rider-sos-container-card`):**
     - Kartu khusus keselamatan dengan border merah sinyal `1.5px solid #DC2626` dan badge `PRIORITY LEVEL 1`.
     - Tombol pemicu high-visibility `[ 🚨 KIRIM SINYAL DARURAT (SOS) → ]` dengan indikator dot berkedip (*pulsing dot*).
     - ID elemen dan logika modal pop-up SOS darurat tetap terhubung utuh.

3. **Modul 2: Admin Dashboard & Race Control ([`public/js/pages/admin-dashboard.js`](file:///c:/Users/Mallik/Documents/cyclopon/public/js/pages/admin-dashboard.js), [`public/js/pages/admin-event.js`](file:///c:/Users/Mallik/Documents/cyclopon/public/js/pages/admin-event.js), [`public/js/pages/admin-notifications.js`](file:///c:/Users/Mallik/Documents/cyclopon/public/js/pages/admin-notifications.js), [`public/css/admin.css`](file:///c:/Users/Mallik/Documents/cyclopon/public/css/admin.css)):**
   - **Admin Login (Commissaire Pass):** Kartu login administrator berbingkai hitam tegas `1.5px solid #0D1117`, badge `🛡️ RACE CONTROL HQ`, dan mode dev box.
   - **Sidebar Desktop & Mobile Drawer:** Header panel berlabel `// CYCLOPON RACE CONTROL`, badge akreditasi direktur/komisioner, active state hitam pekat (`background: #0D1117; color: #FFFFFF`), serta badge notifikasi darurat SOS merah yang berkedip jika ada insiden.
   - **Dashboard Event:**
     - Widget Analitik Trafik & Penonton Real-Time dengan border hitam teknis, indikator denyut hijau (*live pulse dot*), dan angka penonton monospace besar.
     - Kartu Insiden Darurat SOS bergaris merah dengan aksi cepat WhatsApp Rider, Live Map, dan Resolve Alert.
     - Grid kartu event balapan berpenampilan tajam dengan status dan tombol aksi cepat.
   - **Event Race Control & Data Table (`/admin/event/:id`):**
     - Header halaman teknis `// RACE CONTROL · EVENT CONFIGURATION`.
     - Form detail event & zona upload GPX bergaya dropzone drop teknis.
     - Matriks split pos checkpoints & batas COT (Cut-Off Time) Audax/Brevet.
     - Tabel roster rider & panitia lapangan dengan nomor BIB monospace (`#001`), chip peran (*🚴 RIDER*, *🧹 SWEEPER*, *🏍️ MARSHALL*, *🚑 MEDIS*), kode PIN akses, dan tombol salin Magic Link 1-klik / kirim WhatsApp.
   - **Notifikasi Panitia (`/admin/notifications`):** Header diselaraskan dengan tag `// DISPATCH PROTOCOLS & EMERGENCY ESCALATION`.

4. **Peningkatan Versi Service Worker (PWA Cache Bumping):**
   - Cache shell dinaikkan bertahap dari `cyclopon-v30` (Landing Page) $\to$ `cyclopon-v31` (Rider Login) $\to$ `cyclopon-v32` (Rider Setup Cards) $\to$ `cyclopon-v33` (Admin Suite) di [`public/sw.js`](file:///c:/Users/Mallik/Documents/cyclopon/public/sw.js) agar perubahan CSS & JS langsung terdistribusi ke seluruh klien.

5. **Hasil Verifikasi Kualitas:**
   - Seluruh **88 / 88 Unit Tests Lulus 100% (13 Test Suites)** tanpa regresi logika atau API.
   - Seluruh perubahan di-commit bersih di git repository (`72e59fb`, `2e969de`, `5bcb67a`).

---

## 23. Phase 23: Standarisasi Modul 3 — Live Map Spectator & Rider Cockpit HUD (Athletic Minimalist Pro)

Melanjutkan program standarisasi visual menyeluruh ke estetika **Athletic Minimalist Pro (Rapha / Pas Normal Studios / Strava PRO)**, Modul 3 yang mencakup **Live Map Penonton (`/watch/:id`)** dan **Cockpit HUD Stang Sepeda (`/cockpit` / `/rider/cockpit`)** telah diperbarui secara menyeluruh:

### 1. Live Map Penonton & Race Director (`public/css/map.css`, `public/js/pages/live-map.js`)
- **Header Navigasi Presisi:** Latar putih bersih (`#FFFFFF`) dengan border bawah hitam tegas `1.5px solid #0D1117`, micro-tag teknis `// LIVE MATRIX`, status badge monospace `● LIVE STREAM` dengan emerald pulsing indicator, dan tombol aksi terstruktur bergaris hitam.
- **Kartu Leaderboard Peserta Berbingkai (`.leaderboard-item`):**
  - Mengubah tampilan baris flat menjadi kartu individual berbingkai `1.5px solid #E2E8F0` dengan border-radius `8px`.
  - Hover dan focused state reaktif dengan outline `1.5px solid #0D1117` dan aksen bayangan halus.
  - Badge peringkat podium (`🥇`, `🥈`, `🥉`) dan angka monospace (`#4`), avatar nomor BIB berbingkai hitam, dan tag `#BIB` kontras tinggi.
  - Telemetri berbalut pill monospace rapi: Kecepatan (`⚡ 28.4 km/h`), Estimasi Tiba (`🏁 ETA`), status penyimpangan rute (`⚠️ NYASAR`), dan indikator baterai perangkat.
  - Progress bar rute presisi tinggi dengan angka persentase monospace.
- **Bilah Kontrol Terapung & Pemilih Lapisan Peta (FABs):**
  - Tombol Floating Action Button (Lapisan Peta, Fit Rute, Toggle Elevasi) bergaya squircle putih bersih dengan border hitam `1.5px solid #0D1117` dan efek hover invert hitam-putih.
  - Popover pemilihan peta (OSM, CyclOSM, Esri Satelit) yang tajam dan mudah dioperasikan.
- **Laci Profil Elevasi & ClimbPro (`.elevation-drawer`):**
  - Kontainer elevasi bergaris pembatas `1.5px solid #0D1117` dengan radius `10px`.
  - Metrik jarak, elevasi naik/turun, dan kesulitan Komoot dengan font monospace tajam.
  - Kartu tanjakan resmi ClimbPro (`.climb-summary-card`) berbingkai rapi dengan daftar rider yang sedang mendaki.
  - Scrubbing tooltip elevasi berlatar hitam pekat (`#0D1117`) dengan koordinat kilometer dan gradien jalan.
- **Bilah Darurat SOS & Panel Head-to-Head (H2H):**
  - Bilah peringatan darurat SOS merah terang dengan tombol *Fokus Lokasi* instan.
  - Modal komparasi Head-to-Head 2 rider dengan layout split battle strip berbingkai hitam `2px solid #0D1117` dan baris perbandingan metrik terstruktur.

### 2. Cockpit HUD Stang Sepeda (`public/css/cockpit.css`, `public/js/pages/rider-cockpit.js`)
- **Mode Siang Kontras Maksimal (Daylight Legibility):**
  - Dirancang khusus agar sangat mudah dibaca di bawah terik sinar matahari saat berkendara kencang.
  - Latar kapur `#F8F9FA` dengan kartu putih `#FFFFFF` bergaris hitam `1.5px solid #0D1117`.
  - Speedometer digital raksasa dengan tipografi `80px` ultra-bold monospace tabular-nums `#0D1117` dan garis atas hitam.
  - Grid 4-kotak metrik primer (Jarak tempuh, sisa jarak, waktu gowes, status sinyal GPS, gradien kemiringan %, dan total elevasi).
- **Mode Malam AMOLED Hitam Pekat (Pitch-Black `#000000`):**
  - Dirancang khusus untuk efisiensi baterai layar OLED pada perjalanan malam/audax panjang.
  - Latar hitam pekat murni `#000000`, kartu `#0A0D0B` dengan border halus `#1E293B`, teks putih cerah `#FFFFFF`, dan aksen hijau emerald `#10B981`.
- **Kartu Pos Checkpoint & Batas COT:**
  - Menampilkan pos target berikutnya, progress bar terisi, jarak tersisa, batas COT, dan estimasi tiba secara presisi.
- **Bilah Aksi Darurat Menempel (Sticky SOS Bar):**
  - Tombol besar `🚨 KIRIM SOS DARURAT` merah menyala dengan modal pelaporan darurat instan dan tombol akses cepat kembali ke Live Map.

### 3. Peningkatan Versi Service Worker & Verifikasi Pengujian
- Versi Service Worker dinaikkan ke `cyclopon-v35` di [`public/sw.js`](file:///c:/Users/Mallik/Documents/cyclopon/public/sw.js) agar berkas `map.css`, `cockpit.css`, `live-map.js`, `router.js`, dan `rider-cockpit.js` langsung diperbarui di cache browser pengguna.
- Seluruh **88 / 88 Unit Tests Lulus 100% (13 Test Suites)** tanpa error atau regresi.

---

## 24. Perbaikan Navigasi Keluar Cockpit HUD: Teardown Otomatis & Pemulihan Light Mode

Menjawab laporan kendala di mana halaman Rider Hub (`/rider/setup`) tetap berwarna hitam pekat (*dark mode bleed*) setelah keluar dari Cockpit HUD (`/rider/cockpit`):

1. **Penyebab Masalah (Root Cause):**
   - Mode malam AMOLED pada Cockpit HUD otomatis aktif pada jam malam/dini hari (< 06:00 atau >= 18:00), menyematkan class `night-mode` pada `document.body`.
   - Pembersihan class sebelumnya hanya dikaitkan pada event `popstate` browser back button, sedangkan navigasi tautan internal SPA (tombol `🏠 Hub`, `Keluar`, dsb.) menggunakan `Router.navigate()` (`history.pushState`) yang tidak memicu event `popstate`.
   - Selektor CSS di `cockpit.css` memiliki aturan `body.night-mode { background-color: #000000 !important; }` yang terlalu luas tanpa isolasi scope halaman, sehingga jika class tertinggal, seluruh halaman lain tertimpa latar hitam pekat.

2. **Langkah Perbaikan Komprehensif:**
   - **Siklus Hidup Unmount Router (`public/js/router.js`):** Menambahkan metode `Router.onUnmount()` dan eksekusi `Router.teardown()` pada setiap transisi rute. Ketika berpindah keluar dari kokpit (`cleanPath !== '/rider/cockpit'`), router secara otomatis mengeksekusi `window.teardownRiderCockpit()` dan membersihkan class `cockpit-active` serta `night-mode` dari `document.body`.
   - **Fungsi Teardown Terbuka (`public/js/pages/rider-cockpit.js`):** Mengekspos `window.teardownRiderCockpit` yang menghentikan interval jam bergerak, melepaskan Wake Lock layar, memutuskan koneksi WebSocket, mematikan pemantauan GPS, dan menghapus class mode malam pada body.
   - **Penanganan Tombol Logout Kokpit:** Mengaitkan tombol `🚪` di topbar kokpit dengan konfirmasi dialog dan teardown bersih sebelum navigasi ke `/rider`.
   - **Isolasi Selektor CSS Ketat (`public/css/cockpit.css`):** Menghapus seluruh selektor global `body.night-mode` dan mewajibkan spesifisitas `body.cockpit-active.night-mode` atau `.cockpit-container.night-mode`. Gaya latar hitam `#000000` dipastikan tidak dapat lagi bocor ke halaman manapun di luar Cockpit HUD.
   - **Pencegahan Konflik Variabel & Alias Rute:** Menghapus duplikasi deklarasi variabel `btnCockpitLogout` di `rider-cockpit.js` dan mendaftarkan alias `/cockpit` -> `/rider/cockpit` di `app.js`.
   - **Pembaruan Service Worker:** Cache dinaikkan secara bertahap hingga `cyclopon-v40` di `public/sw.js`.

---

## 25. Penyempurnaan Mobile Safe-Area & Bilah Aksi Bawah Kokpit (Compact & Centered)

Menjawab umpan balik visual saat mengakses Cockpit HUD di smartphone (khususnya perangkat berponi / navigasi gestur seperti iPhone & Android modern):

1. **Dukungan Safe-Area Penuh (`public/index.html`):**
   - Menambahkan atribut `viewport-fit=cover` pada meta tag viewport sehingga browser (terutama iOS Safari / WebViews) mengenali batas layar dan area home indicator bar (`env(safe-area-inset-bottom)`).
2. **Bantalan Ruang Bebas Dinamis (`public/css/cockpit.css`):**
   - Menerapkan padding bawah dinamis `padding-bottom: max(16px, calc(8px + env(safe-area-inset-bottom, 0px)))` pada `.cockpit-bottom-bar` dan `max(95px, ...)` pada kontainer scroll kokpit, menjamin tombol tidak menempel atau terpotong oleh sudut layar melengkung maupun bilah home indicator.
3. **Format Tombol Ramping & Terpusat (*Centered & Compact Profile*):**
   - Mengganti layout `flex: 2` & `flex: 1` yang sebelumnya memaksa tombol melebar 100% selebar layar menjadi `flex: 0 0 auto; justify-content: center;`.
   - Mengubah teks tombol SOS menjadi `🚨 SOS Darurat` (lebar proporsional ~135px) dan `🗺️ Live Map` (~105px) dengan tinggi ramping `36px` (font `12px`), menghasilkan tampilan kendali yang kompak, elegan, dan proporsional di tengah layar tanpa memenuhi bidang horizontal.
   - Menyelaraskan mode malam AMOLED `.cockpit-bottom-bar.night-mode` dengan latar pitch-black `#0A0D0B` dan garis batas `#1E293B`.
4. **Pembaruan Service Worker:**
   - Cache dinaikkan ke **`cyclopon-v40`** di [`public/sw.js`](file:///c:/Users/Mallik/Documents/cyclopon/public/sw.js).
   - Seluruh **88 / 88 Unit Tests Lulus 100% (13 Test Suites)**.

---

## 26. Rencana Kerja Selanjutnya (Lanjutan di Kantor)

1. **Modul 4: Official Results & Brevet Digital (`/events/:id/results`):**
   - Menerapkan standarisasi estetika Athletic Minimalist Pro pada tabel hasil resmi, klasifikasi finisher, pencarian BIB/nama, rincian split checkpoint, dan ekspor CSV.
   - Menyeragamkan palet warna, tipografi Inter + JetBrains Mono, lencana status brevet, dan sertifikat finisher digital.
2. **Data Demo & Seed Rute GPX Nyata:**
   - Script seeder otomatis (`npm run seed:demo`) yang menyertakan rute GPX resmi, pos kontrol riil, dan simulasi pergerakan rider aktif untuk demonstrasi kepada panitia atau sponsor.




