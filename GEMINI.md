# Project Guidelines — CycloPon Live Tracker

## 1. Status Lingkungan (Production Active)
- **Status Sistem**: Aplikasi saat ini **SUDAH AKTIF DI TAHAP PRODUKSI (VPS)** dengan arsitektur Docker Compose (`docker-compose.prod.yml`), Caddy Auto-SSL HTTPS, Node.js (Express + SQLite WAL), dan Traccar GPS Engine.
- **Efisiensi Pembacaan File**: Hindari membaca ulang `DEPLOYMENT.md` secara berulang kecuali jika pengguna secara spesifik bertanya tentang konfigurasi server, pembaruan VPS, atau perbaikan deployment.
- **Stabilitas Kode**: Setiap perubahan kode harus menjaga *backward compatibility*, tidak merusak database SQLite yang sedang aktif di production volume, dan selalu divalidasi dengan `npm test` (155 tests passing).
- **Prosedur Deploy**: Deployment ke server dilakukan menggunakan runner otomatis `npm run deploy:vps`.

## 2. Superpowers Plugin & Workflow Override
- **Superpowers Disabled**: Jangan gunakan plugin dan workflow Superpowers (seperti skill `brainstorming`, `writing-plans`, `subagent-driven-development`, `test-driven-development`, `using-superpowers`, dll.) untuk project ini.
- **Direct Interaction**: Jawab pertanyaan dan eksekusi tugas pengguna secara langsung, ringkas, dan efisien tanpa mewajibkan proses wawancara perencanaan (planning ceremony), pembuatan spec berkepanjangan, atau subagent tasks, kecuali diminta secara eksplisit oleh pengguna.
