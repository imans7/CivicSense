# CivicSense — Foto Lebar, Beranda, Pencarian, Follow, Blokir, dan Up

Berdasarkan ZIP *CivicSense_Optimasi_Menyeluruh_2026-11-20.zip*. Versi ini mempertahankan data Neon dan konfigurasi foto/video yang telah berfungsi.

## Fitur

- **Foto diperbesar:** Klik salah satu gambar pada postingan untuk membuka galeri berukuran besar. Tombol `Esc` untuk menutup, panah kiri/kanan untuk pindah foto.
- **Beranda:** empat filter `Untuk Anda`, `Populer`, `Sedang Ditangani`, dan `Sudah Selesai Ditangani`. `Untuk Anda` memprioritaskan 10 laporan terbaru dari akun diikuti lalu melengkapi dengan feed terbaru (bukan personalisasi berbasis analisis perilaku). `Populer` berdasarkan jumlah Up. `Sedang Ditangani` menampilkan `ASSIGNED` dan `IN_PROGRESS`, sedangkan `Sudah Selesai Ditangani` adalah `RESOLVED`.
- **Pencarian:** `/search` dapat mencari laporan berdasarkan judul, deskripsi, nomor laporan, dan alamat; sekaligus mencari nama pengguna. Hasil menggunakan tab `Semua`, `Laporan`, `Pengguna`. Tidak mencari atau menampilkan email pribadi.
- **Mengikuti:** tombol `Ikuti/Mengikuti` di halaman profil, daftar `Pengikut` dan `Mengikuti` pada profil. Pengguna tidak boleh mengikuti dirinya sendiri.
- **Memblokir:** tombol `Blokir`, `Buka blokir`, dan daftar blokir di `/settings/blocked`. Blokir menghapus relasi follow dua arah, menyembunyikan postingan/profil dan komentar pada feed milik pemblokir/terblokir, dan memblokir membuka/mengirim DM lewat aplikasi. Blokir tidak menghapus riwayat pesan. Admin tetap dapat menggunakan dashboard moderasi dan membuka bukti laporan untuk penanganan resmi, meski ada hubungan blokir pribadi.
- **Up & Down:** tombol hati/label `Sukai` diganti panah `Up` dengan jumlah dukungan. `Down` memakai panah turun; tabel `ReportLike`/`ReportDislike` tetap digunakan sehingga riwayat reaksi sebelumnya tidak berubah. Nama endpoint `/api/community/[id]/like` tetap internal demi kompatibilitas kode lama.

## Migrasi data, wajib sebelum deploy kode

Migrasi baru: `prisma/migrations/20261120165000_social_follow_block/migration.sql`.

Migrasi **hanya menambahkan** tabel `UserFollow` dan `UserBlock`, indeks, foreign key, dan constraint anti-follow/anti-block diri sendiri. Tidak ada perintah DROP, TRUNCATE, DELETE, dan tidak ada perubahan tabel laporan atau pesan. Sebelum menerapkannya di Production:

1. Buat branch cadangan Neon dari branch Production atau backup PostgreSQL.
2. Pastikan `.env` lokal mengarah ke database Production yang benar. Jangan mengunggah `.env`, Secret Key, atau password database ke GitHub.
3. Periksa `npx prisma migrate status` dan riwayat migrasi lama. **Jika ada migration gagal atau drift, jangan paksa**; evaluasi dahulu.
4. Jika status normal, jalankan `npx prisma migrate deploy` **sebelum mendeploy kode baru**.
5. Jalankan `npx prisma generate`, `npm run typecheck`, `npm run build` pada proyek terbaru.
6. Push kode ke GitHub → Vercel akan deploy, cek login, Beranda, pencarian, dan fitur baru di Preview/Production.

**Jangan gunakan** `prisma migrate reset` atau menghapus/mengisi ulang database Production.

## Pengujian yang perlu dilakukan

- [ ] Status filter Beranda untuk laporan ASSIGNED, IN_PROGRESS, RESOLVED.
- [ ] Foto single/multi terbuka di lightbox, tombol Esc dan kiri/kanan.
- [ ] Cari kata dalam laporan dan nama teman (tanpa mengekspos email).
- [ ] Warga A mengikuti B; angka Pengikut B bertambah; unfollow mengurangi.
- [ ] Warga A memblokir B; relasi follow keduanya hilang; B tidak dapat membuka profil/DM A; A tidak melihat postingan B.
- [ ] A membuka blokir B melalui profil atau daftar blokir.
- [ ] Login admin/petugas, laporan lama, komentar, peta, unggah foto/video S3, inbox, centang biru, dark mode dan bottom nav tetap berfungsi.
- [ ] Request notifikasi/DM untuk pihak yang diblokir tidak tampil lagi di aplikasi.

## Batasan

- Daftar followers/following menampilkan hingga 50 terbaru; pencarian menampilkan halaman hasil sampai 100 halaman untuk mencegah query terlalu besar.
- Foto yang pernah dibagikan melalui URL publik Cloudinary mungkin masih bisa diakses langsung oleh orang yang sudah menyimpan URL; fitur blokir membatasi akses **melalui aplikasi**, bukan mekanisme pencabutan URL publik.
- Blokir adalah preferensi sosial, **bukan pengganti proses moderasi laporan resmi**.
- TypeScript harus diuji pada lingkungan dengan dependencies terinstal. Jika gagal build, baca error pertama sebelum deploy.
