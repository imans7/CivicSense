# CivicSense — aplikasi laporan lingkungan

Versi pengembangan lanjutan dari proyek `PROGRAM.zip` (Next.js 15, Prisma 6, Neon PostgreSQL, Cloudinary).

## Fitur yang sudah diimplementasikan
- Daftar, masuk, keluar; sesi acak disimpan sebagai hash di Neon dan cookie HttpOnly.
- Peran PUBLIC / OFFICER / ADMIN dengan pembatasan endpoint dan halaman.
- Laporan baru (kategori, foto Cloudinary, GPS, alamat, indikator skor prioritas otomatis).
- Nomor laporan otomatis per tahun menggunakan transaksi database.
- Laporan publik, pencarian/filter, detail, riwayat status, laporan saya.
- Dashboard admin: verifikasi, penolakan, penugasan dan pemantauan.
- Dashboard petugas: mulai penanganan dan selesaikan dengan foto bukti.
- Peta interaktif sederhana berbasis OpenStreetMap (pilih laporan untuk menampilkan titik).

## Cara menjalankan
1. Pasang **Node.js 20 atau 22**. Jalankan `npm install`.
2. Salin `.env.example` ke `.env`. Isi koneksi **Neon** (DATABASE_URL pooled, DIRECT_URL direct), dan tiga variabel **Cloudinary**. Jangan bagikan nilai rahasia.
3. `npx prisma generate`
4. `npx prisma migrate deploy` untuk database baru; migration awal sudah ada.
5. Jika ingin akun admin dan petugas awal, isi SEED_* pada `.env` (kata sandi masing-masing minimal 12 karakter), lalu `npm run db:seed`.
6. `npm run dev` dan akses `http://localhost:3000`.
7. Jalankan `npx tsc --noEmit`, `npm run lint`, dan `npm run build` untuk memeriksa lingkungan Anda.

## Alur
- Warga mendaftar → mengunggah foto → membuat laporan → memantau status.
- Admin memverifikasi laporan → menugaskan petugas.
- Petugas memulai pekerjaan → mengunggah hasil dan menutup laporan.

## Catatan keamanan dan operasional
- **Jangan commit `.env`**. Jangan menggunakan password admin/petugas contoh.
- Batasi ukuran foto dan cek magic bytes pada server. Folder unggahan Cloudinary dipisah per akun.
- Sebaiknya tempatkan di belakang reverse proxy / WAF, gunakan HTTPS dan rate limiting eksternal (rate limiter saat ini hanya memori proses).
- Foto yang terunggah tetapi tidak dikirim sebagai laporan masih bisa menjadi orphan; jadwalkan cleanup pending setelah aman memeriksa kepemilikan.
- Cloudinary foto resolusi tersimpan publik melalui URL; hindari memasukkan data pribadi di foto.
- Audit dan uji integrasi ke layanan nyata diperlukan sebelum produksi; file ini belum diverifikasi secara live terhadap akun Neon dan Cloudinary Anda.

## Fitur lanjutan yang disarankan
1. Peta yang lebih canggih (Leaflet / MapLibre) dengan banyak marker, cluster dan filter.
2. Notifikasi email/WhatsApp tiap status; persetujuan privasi dan penghapusan akun.
3. Deteksi laporan duplikat berdasarkan kategori/radius dan pemberian dukungan warga.
4. SLA, eskalasi keterlambatan, ekspor PDF/Excel, dan analitik waktu penyelesaian.
5. Penyimpanan file sementara (pending upload) di database untuk perlindungan replay lebih baik, antrean cleanup, dan audit log admin.
6. Ubah kata sandi, pemulihan akun via email, CSRF/origin policy, CAPTCHA, serta rate limiter Redis produksi.


## Forum komunitas — tampilan seperti feed X (2026-11-13)

Beranda `/` sekarang berupa feed posting laporan; `/reports` adalah pencarian dan filter,
`/reports/[id]` menampilkan diskusi/komentar, dan `/saved` berisi laporan yang ditandai.
Di desktop tampil tiga kolom (navigasi, feed, info komunitas), pada ponsel tersedia
navigasi bawah. Fitur like, bookmark, dan komentar tersimpan ke Neon melalui Prisma.

**Migrasi wajib untuk versi forum:** setelah konfigurasi `.env`, jalankan
`npm install`, `npx prisma generate`, `npx prisma migrate deploy`, dan `npm run dev`.
Cloudinary tetap digunakan untuk unggahan foto pada form `/reports/new`.

**Keamanan:** aksi forum memerlukan sesi login dan Origin yang sesuai, serta dibatasi
rate limit sederhana. Untuk deployment multi-instance, ganti rate limit in-memory
dengan Redis/Upstash, tambahkan moderasi komentar, audit logging, dan uji end-to-end.
Tombol komentar mengarah ke halaman detail, dan dukungan/simpan diproses server.
Status laporan dan prioritas tetap ditentukan oleh logika CivicSense sebelumnya.

**Catatan:** halaman `/my-reports`, `/admin`, `/officer`, dan form pembuatan laporan
masih menggunakan gaya dashboard yang ada. Perubahan visual difokuskan pada
pengalaman forum publik (beranda, jelajahi, simpan, detail), tanpa mengganti alur kerja petugas.

## Tambahan: Dashboard Admin/Petugas + Profil Publik (versi forum 2)

Seluruh rute dashboard kini memakai kerangka forum yang sama dengan beranda komunitas; sidebar dan menu bawah menampilkan fitur sesuai peran. Administrator bisa mengelola antrean verifikasi, penugasan, ekspor CSV dan direktori akun. Petugas bisa melihat tugas aktif, mengirim status/bukti foto penyelesaian, dan memeriksa riwayat pekerjaan.

**Halaman baru:**
- `/admin` — pusat kendali, KPI, filter status, verifikasi, penugasan.
- `/admin/users` — pencarian akun, filter peran, ubah peran dan status akun. Perubahan peran/logout memutus sesi lama.
- `/officer` — KPI petugas, tugas aktif, penanganan dan bukti penyelesaian.
- `/officer/history` — tugas yang berhasil diselesaikan (maksimal 50 terbaru).
- `/users/[id]` — profil publik semua peran, bio/lokasi, avatar, kiriman, ringkasan like/dislike, total laporan dan akurasi verifikasi.
- `/settings/profile` — edit profil diri dan unggah avatar melalui Cloudinary.

**Definisi statistik profil:**
- Like/dislike **diterima** dihitung dari reaksi terhadap laporan yang dibuat pengguna (bukan reaksi yang pengguna berikan ke orang lain).
- Total laporan yang diunggah = semua laporan yang pengguna buat, termasuk status pending/ditolak; item ditolak tidak dipublikasikan kepada pengunjung biasa.
- *Akurasi verifikasi* = (laporan yang berstatus VERIFIED, ASSIGNED, IN_PROGRESS, atau RESOLVED) / (laporan dalam status-status tersebut + REJECTED) × 100%. Pending tidak masuk penyebut. Jika belum ada keputusan, tampil `—`.
- **Penting:** akurasi merupakan estimasi berdasarkan keputusan administratif (laporan ditolak bisa saja karena bukti kurang atau di luar cakupan), BUKAN bukti ilmiah bahwa laporan tersebut benar/salah. Jangan digunakan untuk menghukum/menstigma pelapor.
- Untuk profil petugas juga ada jumlah penugasan yang RESOLVED. Seluruh profil dapat diakses orang lain, kecuali email dan kata sandi.

### Migrasi yang harus dijalankan di Neon

1. Backup database Neon atau buat branch Neon sebelum menjalankan migrasi pada database yang sudah berisi data.
2. Siapkan `.env` dari `.env.example`, isi DATABASE_URL pooled Neon, DIRECT_URL direct Neon, dan kredensial Cloudinary. Jangan mengirimkan nilai tersebut ke orang lain atau memasukkan `.env` ke ZIP/Git.
3. Jalankan `npm install`, `npx prisma generate`, dan `npx prisma migrate deploy`.
4. Jalankan `npm run dev` dan masuk memakai akun warga, petugas, dan admin yang sudah ada (atau buat akun seed sesuai petunjuk awal).
5. Perhatikan migrasi baru `prisma/migrations/20261113170000_staff_profiles_reactions/migration.sql`: menambah atribut profil dan tabel dislike. Tidak menghapus data existing like/komentar/laporan.

### Skenario uji manual

1. Warga membuat laporan dengan bukti foto Cloudinary -> laporannya masuk antrean admin.
2. Warga memberi like, mengganti ke dislike, lalu membatalkan dislike -> tombol dan jumlah diperbarui; tidak ada like/dislike bersamaan.
3. Buka profil penulis dari feed atau komentar -> tampil foto profil, bio, 4 metrik dan feed laporan.
4. Semua peran mengedit nama, bio, lokasi, foto profil sendiri -> profil lain dapat membacanya; email/password tidak ditampilkan.
5. Admin memverifikasi/menolak (dengan catatan), kemudian menugaskan ke petugas -> petugas melihatnya di `/officer`.
6. Petugas memulai penanganan, menambah bukti foto Cloudinary, menyelesaikan -> tugas pindah ke `/officer/history`.
7. Admin mencoba mengubah peran petugas yang masih punya tugas aktif -> permintaan ditolak; admin tidak dapat mengubah peran/status akun sendiri.
8. Akun non-admin memanggil API pengelolaan akun -> HTTP 403; pengguna anonim mengedit profil -> HTTP 401.
9. Periksa responsif desktop dan mobile pada `/admin`, `/officer`, `/users/[id]`, `/settings/profile`.

### Batas pengujian saat paket ini dibuat

Pemeriksaan **sintaks** TypeScript/TSX telah dijalankan; instalasi dependensi tidak berhasil diselesaikan dalam lingkungan pembuatan ini, sehingga `tsc --noEmit`, build Next.js, migrasi Neon yang nyata, dan Cloudinary yang nyata belum tervalidasi. Uji di atas wajib sebelum deployment. Rate limiter masih in-memory dan perlu Redis/WAF di produksi. Perlu audit ulang untuk proteksi race condition penugasan, kebijakan konten dan privasi publik, serta pembatasan penyalahgunaan pada API.
