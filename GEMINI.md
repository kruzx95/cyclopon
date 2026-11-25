# Project Guidelines — CycloPon Live Tracker

## 1. Status Lingkungan (Production Active)
- **Status Sistem**: Aplikasi saat ini **SUDAH AKTIF DI TAHAP PRODUKSI (VPS)** dengan arsitektur Docker Compose (`docker-compose.prod.yml`), Caddy Auto-SSL HTTPS, Node.js (Express + SQLite WAL), dan Traccar GPS Engine.
- **Efisiensi Pembacaan File**: Hindari membaca ulang `DEPLOYMENT.md` secara berulang kecuali jika pengguna secara spesifik bertanya tentang konfigurasi server, pembaruan VPS, atau perbaikan deployment.
- **Stabilitas Kode**: Setiap perubahan kode harus menjaga *backward compatibility*, tidak merusak database SQLite yang sedang aktif di production volume, dan selalu divalidasi dengan `npm test` (155 tests passing).
- **Prosedur Deploy**: Deployment ke server dilakukan menggunakan runner otomatis `npm run deploy:vps`.

## 2. Superpowers Plugin & Workflow Override
- **Superpowers Disabled**: Jangan gunakan plugin dan workflow Superpowers (seperti skill `brainstorming`, `writing-plans`, `subagent-driven-development`, `test-driven-development`, `using-superpowers`, dll.) untuk project ini.
- **Direct Interaction**: Jawab pertanyaan dan eksekusi tugas pengguna secara langsung, ringkas, dan efisien tanpa mewajibkan proses wawancara perencanaan (planning ceremony), pembuatan spec berkepanjangan, atau subagent tasks, kecuali diminta secara eksplisit oleh pengguna.

## 3. Karpathy Guidelines (Disiplin Coding)
- **Think Before Coding**: Jangan berasumsi atau menebak dalam diam saat instruksi ambigu; sampaikan trade-off atau tanyakan sebelum implementasi.
- **Simplicity First**: Tulis kode seminimal mungkin yang menyelesaikan masalah. Hindari abstraksi spekulatif atau fitur berlebihan yang tidak diminta.
- **Surgical Changes**: Sentuh hanya baris dan file yang relevan dengan tugas. Dilarang melakukan *drive-by refactoring*, memformat ulang whitespace, atau mengubah kode yang tidak rusak di luar cakupan tugas.
- **Goal-Driven Execution**: Tetapkan kriteria sukses yang dapat diverifikasi secara objektif (misal: `npm test` lolos 100% tanpa regresi) sebelum menyatakan tugas selesai.

## 4. Aturan Branding & Logo
- **Logo Resmi Aktif**: Gunakan aset logo resmi baru CycloPon (`Orbit Cyclo-Eye`): `/icons/cyclopon-mark.svg` (light/default), `/icons/cyclopon-mark-dark.svg` (dark background), `/icons/app-icon-192.png`, `/icons/app-icon-512.png`, dan `/icons/apple-touch-icon.png` di samping wordmark tipografi `CYCLOPON`, favicon, `manifest.json`, dan Service Worker.
- **Dilarang Memakai Logo CP Lama**: Jangan menampilkan, menyematkan, atau mengaktifkan kembali logo emblem/monogram lama (`/icons/logo-emblem.svg`, `/icons/logo-emblem-dark.svg`, `/icons/logo.svg`, `/icons/icon-192.*`, `/icons/icon-512.*`) di komponen UI mana pun (navbar, mobile drawer, footer, halaman `/install`, `/share`, favicon, manifest, ataupun notifikasi).
- **Tanpa Tagline di Sebelah Wordmark `CYCLOPON`**: Jangan menambahkan tagline/spec label apa pun setelah wordmark `CYCLOPON` di header/navbar/drawer (misal `// POSTER GOWES`, `// INSTALL PWA`, `// PANDUAN PENGGUNA`, `// PENDAFTARAN PESERTA`, `// PRO GPS TELEMETRY`, `// MENU`, `// RIDER HUB`, `// LIVE MATRIX`). Tampilkan logo mark dan/atau `CYCLOPON` polos tanpa imbuhan teks di sampingnya.

