# Rencana Implementasi: MagangHub IT & Informatika Tracker (Khusus Jurusan Informatika)

Membangun aplikasi web 1-halaman (*Single Page Application*) yang **dikhususkan 100% untuk mahasiswa & lulusan jurusan Teknik Informatika / Informatika** (dan bidang komputasi serumpun seperti *Ilmu Komputer, Sistem Informasi, Rekayasa Perangkat Lunak, dan Teknologi Informasi*).

Semua lowongan dari jurusan di luar rumpun IT akan disaring (*filter out*) secara otomatis, sehingga Anda hanya melihat lowongan yang benar-benar relevan dan menerima jurusan Anda.

---

## User Review Required

> [!IMPORTANT]
> - **Fokus Eksklusif Jurusan IT**: Sistem backend akan menerapkan *strict major filtering*. Lowongan hanya akan lolos dan ditampilkan jika syarat jurusannya mencakup kata kunci: `Teknik Informatika`, `Informatika`, `Ilmu Komputer`, `Sistem Informasi`, `Teknologi Informasi`, `Rekayasa Perangkat Lunak`, atau kata kunci posisi teknis IT (`Programmer`, `Software Engineer`, `Developer`, `Network`, `Data`).
> - **Lokasi Folder Proyek**: `c:\Users\user\Downloads\maganghub-tracker`
> - **Gratis 100% (Vercel Serverless)**: Backend serverless function berjalan di Vercel Hobby Tier tanpa biaya, tanpa kartu kredit.

---

## Arsitektur & Logika Penyaringan IT

```
[ Portal MagangHub Kemnaker ]
       │
       ▼ (Ditarik oleh Vercel Serverless API)
[ api/jobs.js ]
       │
       ├─► (1) Fetch lowongan menggunakan keyword komputasi (informatika, IT, programmer, software)
       ├─► (2) STRICT FILTER: Validasi daftar jurusan di setiap lowongan.
       │       - Ada "Teknik Informatika / Informatika / Sistem Informasi / Ilkom"? -> LOLOS (SIMPAN)
       │       - Jurusan kesehatan/hukum/akuntansi/lainnya? -> BUANG OTOMATIS
       ├─► (3) Auto-Tagging Sub-Kategori IT (Software Dev, Data & AI, Jaringan/Cyber, IT Support, UI/UX)
       │
       ▼
[ Output JSON Khusus Informatika ]
       │
       ▼
[ Frontend Web 1-Halaman (Tech Theme) ]
       ├─ Filter Cepat: Sub-bidang IT (Programmer vs Network vs Data vs Support)
       ├─ Filter Jenjang: S1, D4, D3
       ├─ Filter Peluang: Peluang Sangat Besar / Kuota Masih Longgar
       └─ Simpan / Bookmark lowongan impian Anda
```

---

## Proposed Changes

Proyek akan dibuat di folder: `c:\Users\user\Downloads\maganghub-tracker/`

### 1. Backend Serverless Khusus IT (`api/`)

#### [NEW] [jobs.js](file:///c:/Users/user/Downloads/maganghub-tracker/api/jobs.js)
* **Pencarian Agregasi IT**: Secara otomatis memindai lowongan terkait Informatika dari portal Kemnaker.
* **Filter Ketat Jurusan (Strict IT Major Validator)**:
  * Memeriksa teks kolom `Jurusan` pada setiap kartu.
  * Hanya meloloskan lowongan yang relevan dengan:
    - *Teknik Informatika / Informatika*
    - *Ilmu Komputer*
    - *Sistem Informasi / Manajemen Informatika*
    - *Rekayasa Perangkat Lunak / Software Engineering*
    - *Teknologi Informasi*
* **Kategorisasi Otomatis Role IT**:
  * Menambahkan tag kategori pada setiap lowongan:
    - 💻 `Software & Web Dev` (Programmer, Fullstack, Frontend, Backend, Mobile)
    - 📊 `Data & AI` (Data Analyst, Database, BI, Machine Learning)
    - 🛡️ `Jaringan & Infra` (Network Engineer, Cloud, SysAdmin, Cyber Security)
    - 🛠️ `IT Support & Hardware` (Helpdesk, Teknisi Komputer, IT Staff)
    - 🎨 `UI/UX & Produk` (UI/UX Designer, Product, Tech Writer)
* Mengembalikan data JSON bersih bebas lowongan non-IT.

---

### 2. Frontend 1-Halaman Bertema Teknologi (`public/`)

#### [NEW] [index.html](file:///c:/Users/user/Downloads/maganghub-tracker/public/index.html)
* Antarmuka bersih, fokus, dan modern khusus mahasiswa Informatika.
* Fitur Utama:
  * **Header Khusus Informatika**: Judul *“MagangHub Informatika Tracker”* dengan ringkasan status (contoh: *Menemukan 80+ lowongan aktif khusus jurusan Informatika*).
  * **Role Selector Bar**: Tombol filter cepat kategori IT (Semua IT, Web/Software Dev, Data, Jaringan & Infra, IT Support).
  * **Sub-Filter Bar**:
    - Filter Jenjang: Sarjana (S1), Diploma (D3/D4).
    - Filter Status: Peluang Sangat Besar (Persaingan rendah / kuota belum penuh).
    - Lokasi: Input filter kota/provinsi tertentu.
  * **Kartu Lowongan Modern**: Menampilkan logo/inisial instansi, posisi, tag jurusan yang cocok di-highlight, kuota vs pelamar, dan tombol link langsung daftar.
  * **Fitur Bookmark**: Simpan lowongan IT yang ingin dilamar ke daftar favorit (LocalStorage).

#### [NEW] [style.css](file:///c:/Users/user/Downloads/maganghub-tracker/public/style.css)
* Desain bertema *Developer / Modern Tech Aesthetic*:
  * Dark Mode elegan (dengan aksen warna Indigo / Cyan khas tech dashboard).
  * Tipografi modern *Plus Jakarta Sans* / *JetBrains Mono* untuk detail teknis.
  * Animasi mikro halus, efek hover modern, dan badge status persaingan (Hijau untuk Peluang Besar, Oranye untuk Sedang).
  * Desain 100% responsif (nyaman dibuka di HP Android/iPhone maupun laptop).

#### [NEW] [app.js](file:///c:/Users/user/Downloads/maganghub-tracker/public/app.js)
* Mengatur pemanggilan data ke `/api/jobs` secara asinkronus.
* Logika penyaringan instan di browser saat user mengklik sub-kategori role IT (Dev, Network, Data, dll).
* Pengelolaan daftar Bookmark (Tambah, Hapus, dan Tampilkan Bookmark).

---

### 3. Konfigurasi Lingkungan & Server Lokal

#### [NEW] [server.js](file:///c:/Users/user/Downloads/maganghub-tracker/server.js)
* Server lokal mandiri (berbasis modul Node.js standar) untuk menjalankan aplikasi secara instan di komputer lokal (`http://localhost:3000`).

#### [NEW] [vercel.json](file:///c:/Users/user/Downloads/maganghub-tracker/vercel.json) & [package.json](file:///c:/Users/user/Downloads/maganghub-tracker/package.json)
* Konfigurasi deployment siap pakai untuk Vercel.

#### [NEW] [README.md](file:///c:/Users/user/Downloads/maganghub-tracker/README.md)
* Panduan singkat cara menjalankan di laptop dan cara *deploy* ke Vercel dalam 2 menit.

---

## Verification Plan

### 1. Pengujian Penyaringan Jurusan (Strict IT Filtering)
* Menjalankan server lokal:
  ```powershell
  node c:\Users\user\Downloads\maganghub-tracker\server.js
  ```
* Memeriksa endpoint API:
  ```powershell
  curl -s "http://localhost:3000/api/jobs"
  ```
* **Kriteria Keberhasilan**: 
  - 100% data yang keluar WAJIB memiliki jurusan yang cocok dengan rumpun Informatika/Ilmu Komputer/Sistem Informasi.
  - TIDAK BOLEH ada jurusan di luar IT (seperti Dokter, Kebidanan, Akuntansi murni, dll.) yang lolos ke layar.

### 2. Pengujian Tampilan & Interaktivitas Web
* Membuka `http://localhost:3000` di peramban.
* Memastikan lowongan yang muncul terisi dengan posisi seperti IT Programmer, Software Dev, Technical Writer IT, IT Staff, Network, dsb.
* Menguji tombol kategori (Software Dev, Network, Data, IT Support).
* Menguji fitur bookmark dan tautan pendaftaran menuju lowongan resmi di Kemnaker. 
