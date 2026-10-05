# 🚴 Laporan Progres Pengembangan CycloPon Live Tracker

**Tanggal Laporan:** 5 Oktober 2026  
**Status Keseluruhan:** ✅ **Fase Utama (Phase 1 – 9) & Desain Sistem Selesai 100%**  
**Total Pengujian Unit:** 48 / 48 Lulus (7 Test Suites)

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
7. [Rekomendasi Langkah Berikutnya](#7-rekomendasi-langkah-berikutnya)

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

Rangkaian unit test dijalankan dengan Node test runner bawaan (`node --test`) dan **seluruh 49 pengujian lulus 100% (7 Test Suites)**:

```text
▶ Alerts API & Database (156.5ms) - 5 tests passed
▶ Auth API & Flow Validation (136.4ms) - 6 tests passed
▶ Checkpoints & Split Times API & Database (111.9ms) - 7 tests passed
▶ GPX Off-Route Detection Math (5.0ms) - 4 tests passed
▶ Telemetry History Logger & API (154.2ms) - 6 tests passed (termasuk PWA offline batch flush)
▶ Notifications Engine & API (1720.9ms) - 10 tests passed
▶ Official Results & CSV Export API (111.2ms) - 11 tests passed (termasuk GPX download)

ℹ tests 49
ℹ suites 0
ℹ pass 49
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

## 11. Rekomendasi Langkah Berikutnya

Untuk pengembangan selanjutnya atau persiapan rilis produksi, opsi berikut dapat dipertimbangkan:

1. **Containerization (Docker Compose):** Menyiapkan `Dockerfile` dan `docker-compose.yml` yang membundel aplikasi CycloPon bersama Traccar Server (port 5055, 8082, 3000) dalam satu stack deployment siap pakai di VPS.
2. **Data Demo & Seed Rute GPX Nyata:** Menambahkan script migrasi / seeder interaktif (`npm run seed:demo`) yang menyertakan rute GPX resmi, daftar pos checkpoint riil, dan simulasi 10+ rider aktif untuk keperluan pameran atau demo sponsor.
3. **Analitik Profil Tanjakan / Elevasi (ClimbPro & Grade %):** Tampilan visual segment tanjakan dan gradien % di Live Map & Rider Cockpit.


