# CivicSense — Video IDCloudHost Object Storage (S3)

## Tujuan

- Database pengguna, laporan, dan pesan tetap di Neon. Tidak menghapus data lama.
- Cloudinary tetap dipakai untuk **foto dan avatar saja**.
- Video laporan diunggah melalui **presigned PUT** langsung dari browser ke IDCloudHost S3, **tidak** melalui body Vercel.
- File video dalam bucket **private**. Pemutaran menggunakan redirect ke presigned GET berlaku pendek.
- Maksimal **1 video MP4 per laporan**, **60 detik**, dan **50 MiB**. Format H.264/AAC dianjurkan untuk kompatibilitas browser. File MOV/WebM perlu dikonversi dulu ke MP4.
- Metadata durasi diperiksa lagi di server dari atom `moov/mvhd` MP4; tipe konten dan ukuran diperiksa dengan `HeadObject`.

## 1. Siapkan bucket di IDCloudHost

1. Masuk ke IDCloudHost → **Object Storage** → buat bucket video baru, misalnya `civicsense-video-unik` (nama harus tersedia secara global sesuai ketentuan vendor).
2. **Pertahankan bucket PRIVATE**. Jangan memberi akses baca/tulis publik. Akun service key butuh izin `PutObject`, `GetObject`/`HeadObject`, dan `DeleteObject` pada bucket ini.
3. Di dashboard, salin **S3 endpoint** (lengkap dengan `https://` dan port jika memang dicantumkan), **bucket name**, **Access Key ID**, **Secret Access Key**, dan **region/signing region**. Jangan menebak endpoint hanya dari artikel lama; gunakan yang diberikan layanan Anda.
4. Aktifkan CORS bucket. Contoh JSON ada di `config/s3-video-cors.json` (untuk format AWS/S3 API). IDCloudHost juga mendokumentasikan pengaturan CORS via S3 Browser. Hanya izinkan domain aplikasi dan localhost untuk development.
5. Pastikan akun memiliki saldo/layanan aktif; lihat ketentuan pemakaian transfer/egress video.

## 2. Konfigurasi Vercel

Buka **Vercel → CivicSense → Settings → Environment Variables**. Tambahkan 5 variabel di bawah (Production dan lingkungan Preview yang diperlukan):

| Nama | Isi |
|---|---|
| `S3_VIDEO_ENDPOINT` | HTTPS S3 endpoint dari dashboard IDCloudHost, **bukan halaman Console** |
| `S3_VIDEO_REGION` | signing region sesuai provider; coba `us-east-1` **hanya jika provider menyatakannya / tidak menyediakan region khusus** |
| `S3_VIDEO_BUCKET` | Nama bucket yang dibuat |
| `S3_VIDEO_ACCESS_KEY_ID` | Access Key ID Object Storage |
| `S3_VIDEO_SECRET_ACCESS_KEY` | Secret Access Key Object Storage |

**Jangan masukkan secret key ke GitHub, percakapan, atau kode frontend.** Jangan mengubah `DATABASE_URL`, `DIRECT_URL`, dan kredensial Cloudinary lama.

Untuk lokal, simpan 5 variabel tersebut pada file `.env` yang tidak di-commit.

## 3. Pasang kode dan deploy

- **Patch:** salin isi ZIP PATCH ke root repository CivicSense dan timpa file yang memiliki nama sama.
- **Full:** alternatif source lengkap berdasarkan `CivicSense_BUILD_FIX_TypeScript_Vercel.zip` (versi yang kita perbaiki sebelumnya).
- `package.json` mendapatkan dependencies `@aws-sdk/client-s3` dan `@aws-sdk/s3-request-presigner`. Jalankan `npm install` agar dependencies terunduh.
- **Tidak ada migrasi database baru** untuk penggantian layanan video ini, karena tabel `ReportVideo` dari rilis video sebelumnya tetap digunakan.
- Jika rilis video sebelumnya belum pernah diterapkan ke Neon Production, cek `npx prisma migrate status` lebih dulu, backup database, dan baru jalankan `npx prisma migrate deploy` jika riwayat migrasinya konsisten. Jangan gunakan `prisma migrate reset`.
- Jalankan `npm run typecheck` lalu `npm run build` dan push ke branch GitHub yang terhubung Vercel.
- Setelah env vars disimpan, redeploy sehingga semua Functions mendapat environment terbaru.

## 4. Cara upload bekerja

1. Browser cek MP4, ukuran, dan durasi lokal.
2. `POST /api/upload/video-presign` (user wajib login) memberi URL PUT 3 menit + key milik user.
3. Browser mengirim video dengan `PUT` langsung ke Object Storage, header `Content-Type: video/mp4`.
4. `POST /api/upload/video-confirm` melakukan `HeadObject` dan membaca MP4 `moov/mvhd` lewat Range GET, menolak file >60 detik atau >50MiB.
5. Setelah warga menekan **Kirim laporan**, backend melakukan verifikasi ulang lalu menyimpan metadata `ReportVideo` pada Neon.
6. Saat pengguna memutar video di feed/detail, `/api/videos/{id}/stream` mengecek akses lalu mengalihkan ke presigned GET 10 menit. Data video langsung dikirim S3 ke browser.
7. Video Cloudinary lama (jika ada) **tidak dihapus** dan tetap bisa ditampilkan melalui URL lama.

## 5. Uji fungsional setelah deployment

- Akses `https://civicsense-pink.vercel.app`, login sebagai warga.
- Buat laporan, pilih MP4 berdurasi 5–10 detik (di bawah 50MB), lihat progress upload hingga 100%, tunggu pesan berhasil diverifikasi.
- Kirim laporan dan putar video di feed maupun detail; buka di HP.
- Uji unggah MP4 >60 detik, ukuran >50MB, dan file salah format: harus ditolak.
- Buka **Vercel Runtime Logs** untuk melihat `s3-video-presign`, `s3-video-confirm`, `s3-video-stream` bila gagal.

## 6. Jika error

| Gejala | Kemungkinan | Langkah |
|---|---|---|
| HTTP 503 saat presign | Variabel S3 belum disimpan | Cek Environment Variables dan redeploy |
| HTTP 403 pada PUT | Signature, Content-Type, ukuran, secret, endpoint, region, atau izin | Cek nilai S3 (jangan bagikan secret). Pastikan PUT memakai `video/mp4`, ukuran sama dengan yang ditandatangani |
| Browser menyebut CORS / network | CORS bucket tidak mengizinkan domain Vercel atau PUT | Terapkan `config/s3-video-cors.json`; periksa preflight OPTIONS |
| Video diunggah tetapi ditolak konfirmasi | `Content-Type`, ukuran, MP4 invalid, durasi >60 detik, atau atom `moov` tidak terbaca | Ekspor ulang MP4 H.264/AAC dengan *fast start*; coba video lebih kecil |
| Video terdaftar tetapi tidak bisa diputar | `GetObject`/`HeadObject` ditolak, signed URL salah, codec tidak didukung | Cek izin baca, endpoint, codec MP4; lihat Network/Runtime Logs |
| Upload 100%, laporan gagal disimpan | Migrasi `ReportVideo` lama belum diterapkan atau error transaksi | Cek log Prisma, status migrasi, koneksi Neon; **jangan reset database** |

## Batasan yang perlu diketahui

- Rilis ini **MP4 saja** agar pemutaran browser dapat diprediksi. MOV dan WebM membutuhkan proses konversi tambahan bila ingin didukung.
- Presigned PUT digunakan untuk file sampai 50MiB; pada koneksi sangat tidak stabil, fitur multipart/resumable upload adalah pengembangan selanjutnya.
- Penyimpanan S3 **tidak mentranskode codec video** seperti layanan streaming khusus. H.264/AAC disarankan.
- File yang berhasil diunggah tetapi laporannya ditinggalkan bisa menjadi *orphan*. Belum ada pembersihan terjadwal, sehingga penggunaan storage perlu dipantau. **Jangan membuat lifecycle rule yang menghapus semua video `reports/`**, karena dapat menghapus video laporan aktif.
- Keberhasilan end-to-end harus diuji dengan kredensial dan bucket IDCloudHost nyata milik Anda. Kredensial belum diberikan sehingga pengujian live belum dilakukan.

## Referensi resmi

- IDCloudHost Object Storage: https://idcloudhost.com/object-storage/
- IDCloudHost CORS: https://idcloudhost.com/panduan/cara-konfigurasi-cors-pada-layanan-is3-idcloudhost-dengan-s3-browser/
- AWS SDK S3 presigner: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/
- Vercel payload limit: https://vercel.com/docs/functions/limitations
