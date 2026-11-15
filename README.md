# 🚴 CycloPon Live Tracker

**CycloPon** adalah platform *live GPS tracking* berbasis web untuk kegiatan bersepeda jarak jauh (Gran Fondo, Audax, Tour, Ultra-cycling). Aplikasi ini dirancang untuk mengatasi masalah umum pelacakan sepeda: **baterai boros**, **aplikasi mati saat layar HP dikunci**, **penumpukan marker rider di peta**, serta manajemen rute GPX, leaderboard, dan cut-off time (COT) secara *real-time*.

---

## 🌟 Fitur Utama

- **🔋 Hemat Baterai & Layar Mati Tetap Jalan**:
  - **Traccar Client (Android/iOS)**: Berjalan sebagai *background service* resmi OS. Layar HP rider dapat dimatikan sepenuhnya dan posisi GPS tetap terkirim secara berkala.
  - **In-Browser Pocket Tracker (Lacak di Kantong)**: Pelacakan langsung dari web browser PWA tanpa wajib memasang aplikasi tambahan (menggunakan loop audio sunyi *keep-alive* untuk mencegah browser ditidurkan oleh OS).
- **🚴 Cockpit HUD & AMOLED Dark Pocket Mode**: Layar speedometer digital untuk *handlebar* sepeda yang dilengkapi kalkulasi elevasi/grade tanjakan GPX, penghitung mundur batas waktu *Cut-Off Time* (COT), peringatan suara jika keluar rute (*off-route*), dan mode hemat baterai layar hitam AMOLED.
- **🗺️ Rute GPX & Peta Interaktif**: Admin dapat mengunggah file rute `.gpx`. Peta menampilkan rute lengkap, titik start (hijau), titik finish (oranye), pos checkpoint kontrol, elevasi, serta posisi langsung para rider dalam dark theme modern.
- **🛡️ Mitigasi Marker Bertumpuk (Clustering)**: Menggunakan algoritma *Marker Clustering* yang otomatis menggabungkan marker rider yang berdekatan menjadi satu badge counter bercahaya saat di-zoom out, dan memecahnya saat di-zoom in.
- **📊 Real-time Leaderboard & Checkpoint Splits**: Menggunakan algoritma *nearest-point* pada koordinat rute GPX untuk menghitung jarak tempuh (km), persentase progress rute (%), kecepatan rata-rata, dan status split time di tiap checkpoint secara live.
- **🎬 Race Replay & Story Video Export**: Fitur pemutaran ulang rekam jejak GPS (*breadcrumb replay*) dan generator perekaman canvas interaktif untuk mengekspor video story vertikal (9:16) ke media sosial.
- **👥 3 Mode Akses**:
  - **Rider**: Login simpel menggunakan **Nomor BIB** dan **PIN** via on-screen keypad. Akses ke Rider Hub, Cockpit HUD, dan panduan setup Traccar Client otomatis.
  - **Admin**: Login terintegrasi via Traccar Server session / kredensial aman. Manajemen event, upload file GPX, manajemen checkpoint, serta penambahan/penghapusan rider.
  - **Penonton / Publik**: Akses bebas tanpa login ke URL `/watch/:eventId` untuk memantau jalannya event.
- **⚡ Native OsmAnd Endpoint**: Endpoint `/api/osmand` langsung menerima koordinat dari aplikasi Traccar Client lewat port 443 HTTPS standar tanpa memerlukan port non-standar terbuka ke publik.
- **📱 PWA (Progressive Web App)**: Dapat di-*install* langsung ke layar utama Android/iOS/Desktop seperti aplikasi native dan mendukung caching offline.

---

## 🏗️ Arsitektur Sistem

```
+-------------------------------------------------------------+
|                     RIDER SMARTPHONE                        |
|  [Traccar Client App] ATAU [In-Browser Pocket Tracker]       |
|  - Interval: 10 - 30 detik                                  |
|  - Layar HP mati: TETAP BERJALAN di background              |
+------------------------------+------------------------------+
                               |
                               | HTTPS /api/osmand ATAU Port 5055
                               v
+-------------------------------------------------------------+
|             REVERSE PROXY CADDY (Auto-SSL HTTPS)            |
|  - Port 80 & 443 (HTTP/3 QUIC)                              |
+------------------------------+------------------------------+
                               |
                               | Proxy Internal ke Container
                               v
+-------------------------------------------------------------+
|                 CYCLOPON BACKEND (Node.js)                  |
|  - Express HTTP API (Port 3000)                             |
|  - SQLite WAL (data/cyclopon.db) - Event, Rider, Splits     |
|  - Traccar WS Proxy Singleton Upstream (/traccar-ws)        |
|  - Native OsmAnd GPS Ingestion Engine (/api/osmand)         |
+------------------------------+------------------------------+
                               |
                               | WebSocket & HTTP JSON
                               v
+-------------------------------------------------------------+
|                  CYCLOPON FRONTEND (PWA)                    |
|  - Dark Theme UI (#0D1117, Cyan #00E5FF, Orange #FF6B35)   |
|  - Leaflet.js + Marker Clustering                           |
|  - Cockpit HUD, Replay Engine & Live Leaderboard            |
+-------------------------------------------------------------+
```

---

## 📂 Struktur Proyek

```
cyclopon/
├── data/                    # Database SQLite (cyclopon.db di-mount via volume)
├── db/
│   └── database.js          # SQLite connection & queries (better-sqlite3, WAL mode)
├── lib/
│   ├── gpx-parser.js        # Parser GPX, elevasi & deteksi tanjakan
│   ├── traffic-queue.js     # Batch in-memory traffic analytics queue
│   └── traccar-ws-proxy.js  # WebSocket proxy (Express ↔ Traccar)
├── public/                  # Frontend SPA & PWA assets
│   ├── css/                 # Stylesheets (admin, cockpit, map, rider, global)
│   ├── gpx/                 # Folder penyimpanan file GPX rute event
│   ├── icons/               # Icon PWA SVG & PNG
│   ├── js/
│   │   ├── lib/             # GPX utils, math helpers, visual rendering
│   │   ├── pages/           # Landing, Live Map, Cockpit, Replay, Admin, Hub
│   │   ├── app.js           # Inisialisasi rute SPA
│   │   └── router.js        # Client-side router minimal
│   ├── index.html           # SPA HTML Shell
│   ├── manifest.json        # PWA Web App Manifest
│   └── sw.js                # Service Worker (offline cache & network-first)
├── routes/
│   ├── auth.js              # Auth rider (BIB+PIN) & login admin
│   ├── events.js            # API event & upload GPX
│   ├── riders.js            # API manajemen rider & magic link
│   ├── checkpoints.js       # Pos kontrol & split times
│   ├── alerts.js            # Notifikasi darurat SOS & COT
│   ├── history.js           # Telemetri jejak GPS & breadcrumb replay
│   ├── results.js           # Hasil akhir resmi balapan
│   ├── osmand.js            # Native OsmAnd GPS ingestion endpoint
│   ├── admin-metrics.js     # Analitik pengunjung & metrik sistem VPS
│   └── admin-reports.js     # Laporan diagnostik kesiapan sistem
├── scripts/
│   ├── deploy-runner.js     # Runner otomatis deploy ke VPS via SSH
│   ├── backup.sh            # Skrip backup database
│   └── restore.sh           # Skrip pemulihan database
├── docker-compose.yml       # Stack standalone (IP Publik / Uji Coba)
├── docker-compose.prod.yml  # Stack produksi resmi (Caddy Auto-SSL HTTPS)
├── .env.example             # Contoh konfigurasi environment
├── package.json             # Dependensi & skrip npm
├── DEPLOYMENT.md            # Panduan operasional & deployment VPS
└── server.js                # Entry point server Express
```

---

## 🚀 Panduan Memulai Cepat (Local Development)

### 1. Prasyarat
- **Node.js**: Versi 18 atau lebih baru (direkomendasikan v20+)
- **Git**

### 2. Instalasi Dependensi
```bash
git clone https://github.com/kruzx95/cyclopon.git
cd cyclopon
npm install
```

### 3. Konfigurasi Environment
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan isi file `.env`:
```ini
PORT=3000
TRACCAR_HOST=http://localhost:8082
TRACCAR_USER=admin
TRACCAR_PASS=admin
SESSION_SECRET=cyclopon_super_secret_key_2026
```

### 4. Menjalankan Server & Pengujian Performa
```bash
# Mode development (auto-reload dengan nodemon)
npm run dev

# Menjalankan unit test suite otomatis (155 tests)
npm test

# Menjalankan stress & load benchmark (100 concurrent WS viewers & 200 HTTP burst)
npm run benchmark

# Mode production lokal
npm start
```
Buka browser di: **`http://localhost:3000`**

---

## 🚴 Panduan Untuk Rider (Pesepeda)

1. Buka aplikasi web CycloPon di smartphone Anda lalu masuk ke menu **Rider**.
2. Masukkan **Nomor BIB** dan ketik **PIN** Anda pada keypad layar.
3. Di halaman **Rider Hub**, Anda memiliki dua opsi pelacakan:
   - **Opsi A (Lacak di Kantong)**: Klik *"Lacak di Kantong"* langsung dari browser tanpa perlu menginstal aplikasi apapun.
   - **Opsi B (Aplikasi Traccar Client)**: Salin **Server URL** dan **Device Identifier** yang tertera, lalu pasang di aplikasi Traccar Client resmi dari [Google Play Store](https://play.google.com/store/apps/details?id=org.traccar.client) atau [Apple App Store](https://apps.apple.com/app/traccar-client/id843156976).
4. Aktifkan saklar tracking dan pastikan izin lokasi Android disetel ke **`Allow all the time` (Izinkan sepanjang waktu)**.
5. Layar HP dapat dimatikan sepenuhnya dan disimpan aman di saku jersey!

---

## 🛠️ Panduan Untuk Admin Event

1. Akses **`/admin`** dan login dengan kredensial Admin Anda.
2. Pada Dashboard, klik **+ Buat Event Baru**.
3. Isi nama event, tanggal kegiatan, dan batas waktu cut-off time (COT).
4. Unggah file rute **`.gpx`** dan daftarkan pos **Checkpoint** kontrol rute.
5. Tambahkan rider ke dalam event (Nomor BIB, Nama Rider, PIN, dan warna marker).
6. Bagikan link **`/watch/:eventId`** kepada penonton atau keluarga untuk memantau live tracking secara interaktif.

---

## 🌐 Panduan Deployment di VPS (Produksi)

CycloPon mendukung containerization penuh dengan Docker & Docker Compose:

```bash
# Menjalankan stack produksi resmi (dengan Caddy Auto-SSL HTTPS)
docker compose -f docker-compose.prod.yml up -d --build

# Atau menggunakan skrip deployment otomatis dari laptop:
npm run deploy:vps
```

> 📖 **Panduan Operasional Lengkap:** Silakan baca panduan komprehensif di [DEPLOYMENT.md](./DEPLOYMENT.md) untuk detail konfigurasi firewall, domain DNS, skrip backup otomatis, konfigurasi Traccar Client di HP rider, dan pemeliharaan produksi.

---

## 📑 Spesifikasi API

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/health` | Health check server status |
| `GET` | `/api/events` | Mendapatkan daftar semua event aktif |
| `GET` | `/api/events/:id` | Detail event tertentu |
| `GET` | `/api/events/:id/riders` | Daftar publik rider dalam event (tanpa PIN) |
| `POST` | `/api/auth/rider` | Autentikasi rider dengan BIB & PIN |
| `POST` | `/api/auth/admin/login` | Login admin dengan kredensial aman |
| `POST` | `/api/events/admin` | Membuat event baru |
| `PUT` | `/api/events/admin/:id` | Memperbarui nama/status/tanggal event |
| `POST` | `/api/events/admin/:id/gpx` | Mengunggah file `.gpx` rute event |
| `POST` | `/api/admin/riders` | Menambahkan rider baru ke event |
| `DELETE` | `/api/admin/riders/:id` | Menghapus rider dari event |
| `GET` | `/api/events/:id/checkpoints` | Daftar pos kontrol checkpoint event |
| `POST` | `/api/events/:id/splits` | Mencatat waktu split checkpoint rider & status COT |
| `POST` | `/api/events/:id/alerts` | Mengirim notifikasi sinyal darurat SOS rider |
| `GET` | `/api/events/:id/history` | Mengambil rekaman jejak GPS untuk pemutaran ulang (*replay*) |
| `GET` | `/api/events/:id/results` | Leaderboard dan klasemen hasil akhir balap |
| `GET`/`POST` | `/api/osmand` | Native OsmAnd GPS endpoint (terima koordinat Traccar Client) |
| `GET` | `/api/admin/metrics/traffic` | Metrik analitik pengunjung & live viewers |
| `GET` | `/api/admin/reports/latest` | Laporan diagnostik performa & kesiapan VPS |
| `WS` | `/traccar-ws` | WebSocket proxy real-time stream data posisi GPS |

---

## 📄 Lisensi
MIT License © 2026 CycloPon.
