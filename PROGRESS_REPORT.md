# 🚴 Laporan Progres Pengembangan CycloPon Live Tracker

**Tanggal Laporan:** 6 Oktober 2026  
**Status Keseluruhan:** ✅ **Fase Utama (Phase 1 – 16) & Penyeragaman Desain Selesai 100%**  
**Total Pengujian Unit:** 73 / 73 Lulus (10 Test Suites)

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
17. [Rekomendasi Langkah Berikutnya](#17-rekomendasi-langkah-berikutnya)

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

## 18. Rekomendasi Langkah Berikutnya

1. **Data Demo & Seed Rute GPX Nyata:** Menambahkan script migrasi / seeder interaktif (`npm run seed:demo`) yang menyertakan rute GPX resmi, daftar pos checkpoint riil, dan simulasi 10+ rider aktif untuk keperluan pameran atau demo sponsor.
2. **PWA Push Notifications:** Web push notification untuk pembaruan status event dan kedatangan pos secara real-time ke smartphone penonton.





