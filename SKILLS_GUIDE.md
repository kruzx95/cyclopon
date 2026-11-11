# Panduan Penggunaan Skill - Cyclopon

Dokumen ini berisi panduan lengkap mengenai daftar skill yang terpasang, cara memicu/menggunakannya, serta contoh skenario praktis pada proyek **Cyclopon** (Node.js, Express, SQLite, WebSocket, HTML/JS Frontend).

---

## 1. Konsep & Filosofi Workflow di Project Ini

Konfigurasi skill pada proyek ini diatur melalui [.agents/skills.json](file:///home/kruza/Documents/cyclopon/.agents/skills.json) dan aturan di [GEMINI.md](file:///home/kruza/Documents/cyclopon/GEMINI.md):
- **Inherit Global Toolkit**: Menggunakan modul esensial dari *Everything Claude Code* (ECC) dan *Antislop Suite*.
- **Pragmatis & Direct Interaction**: Alur kaku *Superpowers* (planning ceremony berkepanjangan, spec approval berlapis, subagent berlebih) dinonaktifkan agar AI langsung mengeksekusi tugas secara cepat, bersih, dan efisien.

---

## 2. Cara Kerja Pemanggilan Skill

Skill dapat dipicu melalui 2 cara:

1. **Otomatis (*Context & Intent Matching*)**:
   Asisten secara otomatis memuat instruksi skill saat mendeteksi kata kunci atau tugas yang relevan (misalnya saat Anda meminta membuat endpoint baru, merapikan UI, atau menulis test).
2. **Eksplisit (*Direct Prompting*)**:
   Anda dapat menyebutkan nama skill secara langsung pada prompt untuk memastikan standar ketat skill tersebut diterapkan 100%.  
   *Contoh:* `"Gunakan skill security-review untuk cek file routes/api.js"`.

---

## 3. Katalog Skill Aktif & Panduan Penggunaan

### A. Backend & Arsitektur Kode

#### 1. `backend-patterns`
* **Fungsi**: Pola arsitektur backend, pemisahan layer (Controller - Service - Repository), penanganan error terstruktur, dan optimasi query database.
* **Kapan Digunakan**:
  - Menambah route/endpoint API baru di Express.
  - Mengoptimalkan kueri database SQLite/ClickHouse.
  - Mencegah error unhandled promise rejection dan memory leak.
* **Contoh Prompt**:
  > *"Gunakan `backend-patterns` untuk refactor endpoint di `routes/race.js` agar query SQLite menggunakan prepared statement dan service layer terpisah."*

#### 2. `coding-standards`
* **Fungsi**: Standar universal penulisan kode JavaScript/TypeScript, konvensi penamaan, modularitas, dan keterbacaan kode tanpa boilerplate berlebih.
* **Kapan Digunakan**:
  - Refactoring kode lama atau file yang sudah terlalu panjang.
  - Memastikan konsistensi gaya kode antar modul.
* **Contoh Prompt**:
  > *"Terapkan `coding-standards` untuk merapikan helper function di `lib/utils.js`."*

#### 3. `clickhouse-io`
* **Fungsi**: Pola ingest data analitik performa tinggi, agregasi data besar, dan optimasi query ClickHouse.
* **Kapan Digunakan**:
  - Mengelola analitik data balapan/telemetri skala besar.
* **Contoh Prompt**:
  > *"Gunakan panduan `clickhouse-io` untuk merancang schema tabel ingest data telemetri."*

---

### B. Testing, Verifikasi & Kualitas

#### 4. `tdd-workflow`
* **Fungsi**: Alur Test-Driven Development (siklus Red-Green-Refactor). Memastikan test ditulis terlebih dahulu, diverifikasi gagal, lalu dibuatkan implementasi minimal hingga lulus.
* **Kapan Digunakan**:
  - Membangun logic bisnis baru (misal kalkulasi poin atau simulasi race).
  - Memperbaiki bug agar tidak terjadi regresi di masa depan.
* **Contoh Prompt**:
  > *"Gunakan `tdd-workflow` untuk membuat fungsi kalkulasi waktu putaran balap di `lib/calculator.js`. Tulis test-nya dulu di `tests/`."*

#### 5. `verification-loop`
* **Fungsi**: Protokol verifikasi menyeluruh sebelum kode dianggap selesai (menjalankan build, linting, type-check, dan test suite).
* **Kapan Digunakan**:
  - Sebelum melakukan commit atau menyelesaikan fitur kompleks.
  - Memastikan perubahan tidak merusak fungsionalitas lain.
* **Contoh Prompt**:
  > *"Jalankan `verification-loop` untuk memastikan seluruh unit test lulus dan server berjalan normal."*

#### 6. `eval-harness`
* **Fungsi**: Framework evaluasi berkelanjutan untuk mengukur akurasi dan stabilitas logic sistem terhadap skenario regresi.
* **Kapan Digunakan**:
  - Menguji benchmark simulasi balapan atau performa server.
* **Contoh Prompt**:
  > *"Siapkan evaluasi menggunakan `eval-harness` untuk skenario benchmark di `scripts/benchmark.js`."*

---

### C. Keamanan & Audit

#### 7. `security-review`
* **Fungsi**: Checklist keamanan mencakup sanitasi input, SQL Injection, proteksi XSS, validasi file upload (multer), proteksi WebSocket, dan penyimpanan secret/cookie.
* **Kapan Digunakan**:
  - Membuat endpoint publik baru atau form upload.
  - Meninjau penanganan koneksi WebSocket di `server.js`.
* **Contoh Prompt**:
  > *"Lakukan `security-review` pada penanganan input form dan koneksi WebSocket di `server.js`."*

---

### D. Antislop Suite (Pembersihan Slop AI & UI/UX)

Keluarga skill ini bertugas menghilangkan kecenderungan AI menghasilkan kode bertele-tele, komentar tidak berguna, atau desain antarmuka generik.

| Skill | Fokus Utama | Contoh Prompt |
|---|---|---|
| **`antislop`** | Filter inti anti-slop kode dan teks AI | *"Refactor kode ini dengan standar `antislop` agar padat dan to-the-point."* |
| **`antislop-code`** | Menghapus komentar basa-basi AI (*e.g. "// increment counter"*), hanya menyisakan komentar penting | *"Terapkan `antislop-code` untuk membersihkan komentar generik di `server.js`."* |
| **`antislop-ui`** | Desain UI modern, kontras tajam, layout rapi, menghindari desain generik AI (seperti ungu gradient klise) | *"Gunakan `antislop-ui` untuk memoles layout scoreboard di frontend `public/`."* |
| **`antislop-human`** | Aksesibilitas (a11y), kontras warna WCAG, keyboard navigation, dan respons interaktif nyata | *"Audit elemen interaktif tombol dan input menggunakan `antislop-human`."* |
| **`antislop-layoutmobile`** | Desain responsif HP/tablet/desktop, fleksibilitas flex/grid, dan tap target ramah sentuhan | *"Optimalkan tampilan tabel balapan untuk mobile view via `antislop-layoutmobile`."* |
| **`antislop-copywriting`** | Penulisan label, notifikasi error, dan pesan UI agar natural, padat, dan tidak kaku | *"Tulis pesan error modal login menggunakan panduan `antislop-copywriting`."* |

---

### E. Manajemen Sesi & Pembelajaran

#### 8. `strategic-compact`
* **Fungsi**: Mengatur peringkasan context percakapan secara cerdas agar tidak kehilangan informasi penting saat sesi koding sudah sangat panjang.
* **Kapan Digunakan**: Sesi percakapan sudah mencapai puluhan turn atau token mulai membengkak.
* **Contoh Prompt**:
  > *"Gunakan panduan `strategic-compact` untuk merangkum status pengerjaan saat ini sebelum kita lanjut ke modul berikutnya."*

#### 9. `continuous-learning`
* **Fungsi**: Menyimpan pola perbaikan bug yang rumit atau konfigurasi unik agar AI mengingatnya pada sesi berikutnya.
* **Kapan Digunakan**: Setelah berhasil menyelesaikan bug spesifik yang sulit.
* **Contoh Prompt**:
  > *"Ekstrak solusi penanganan memory leak WebSocket tadi ke dalam `continuous-learning`."*

---

## 4. Cheat Sheet Prompt Cepat

Simpan dan gunakan frasa prompt berikut saat berinteraksi:

```markdown
1. Bikin Fitur Baru (TDD):
   "Gunakan tdd-workflow: buatkan test untuk endpoint POST /api/race, lalu implementasikan kodenya."

2. Cek Keamanan:
   "Jalankan security-review untuk semua route di routes/ dan cek sanitasi parameternya."

3. Poles UI & Bersihkan Komentar:
   "Poles halaman dashboard dengan antislop-ui dan bersihkan komentar dengan antislop-code."

4. Verifikasi Akhir:
   "Jalankan verification-loop sebelum kita commit perubahan ini."
```

---

## 5. Catatan Mengenai Skill Superpowers

Skill workflow bawaan Superpowers (`brainstorming`, `writing-plans`, `subagent-driven-development`, dll.) **dinonaktifkan** pada project ini untuk menghindari proses birokrasi perencanaan yang kaku.

Jika Anda membutuhkan perencanaan terstruktur untuk fitur yang sangat besar, Anda cukup mengetikkan:
- `/plan Buatkan rancangan arsitektur untuk sistem autentikasi WebSocket.`
- Atau secara sederhana minta: *"Buatkan implementation plan singkat sebelum eksekusi."*

