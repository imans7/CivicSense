# CivicSense — Video, Dark Mode, Read Receipts, dan Optimasi Navigasi

## Fitur baru

### 1. Video laporan
- Warga dapat menambahkan maksimal satu video per laporan.
- Durasi maksimal 60 detik.
- Format MP4, WebM, MOV.
- Ukuran maksimal 50 MB.
- Video diunggah langsung dari browser ke Cloudinary memakai signature dari server.
- Server memeriksa kembali pemilik public ID, format, ukuran, dan durasi melalui metadata Cloudinary sebelum menyimpan laporan.
- Video ditampilkan pada feed, detail laporan, laporan saya, tersimpan, dan profil karena semuanya memakai feed query bersama.

### 2. Dark mode
- Tombol bulan/matahari tersedia di seluruh halaman.
- Pilihan disimpan pada localStorage dengan key `civicsense-theme`.
- Jika belum ada pilihan tersimpan, tema mengikuti preferensi sistem perangkat.
- Script inisialisasi berjalan sebelum interaksi halaman untuk mengurangi kilatan tema terang.

### 3. Centang pesan
- Pesan terkirim menampilkan satu centang abu-abu.
- Setelah penerima membuka percakapan, `readAt` diperbarui dan pengirim melihat dua centang biru.
- Endpoint pesan mengembalikan read receipts agar status baca pesan lama ikut tersinkron.
- Polling chat menjadi 6 detik dan berhenti saat tab browser tersembunyi.

### 4. Optimasi
- Query kategori dan sesi pada ForumShell berjalan paralel.
- Penghitungan unread inbox dikurangi menjadi dua query paralel.
- Query ringkasan inbox dijalankan paralel.
- Menghapus refresh server yang tidak diperlukan setelah like/bookmark dan mengirim pesan.
- Polling badge inbox menjadi 20 detik; refresh halaman inbox menjadi 30 detik; keduanya berhenti saat tab tersembunyi.
- Menambahkan loading skeleton untuk route group public dan dashboard agar perpindahan halaman terasa lebih responsif.
- Video di feed memakai `preload="none"` supaya tidak mengunduh video sebelum diputar.

## Migrasi database

Perubahan database hanya menambah tabel `ReportVideo`; tabel dan data lama tidak diubah.

Sebelum deploy:
1. Buat backup/branch database Neon Production.
2. Pastikan `.env` lokal menunjuk ke database Production yang benar.
3. Jalankan:

```bash
npx prisma migrate deploy
npx prisma generate
npm run typecheck
npm run build
```

4. Push kode ke GitHub dan tunggu Vercel selesai deploy.

**Jangan jalankan `prisma migrate reset` di database Production.**

Tidak ada environment variable baru. Kredensial Cloudinary yang sudah ada tetap digunakan.
