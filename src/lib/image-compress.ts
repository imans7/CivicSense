// Dijalankan di browser. Mengecilkan foto dan menggambar ulang lewat canvas,
// sehingga metadata EXIF (termasuk koordinat GPS asli kamera) ikut terbuang.
// Jika gagal (format tidak bisa didekode), file asli dikembalikan dan
// validasi tetap dilakukan di server.
export async function compressImage(
  file: File,
  maxDimension = 1920,
  quality = 0.82
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.fillStyle = "#ffffff"; // latar putih untuk PNG transparan
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
