/**
 * Membaca lama durasi dari metadata movie header MP4 (moov > mvhd).
 * Ini hanya parser metadata, bukan transcoder atau decoder video.
 * Pemanggil dapat memberikan beberapa potongan byte dari file.
 */
export function durationFromMovieBox(bytes: Buffer): number | null {
  // Cari box moov berukuran normal. Moov biasanya ada di awal atau akhir MP4.
  // Offset awal buffer boleh terpotong karena ini juga dipakai untuk Range akhir file.
  for (let i = 4; i + 12 <= bytes.length; i++) {
    if (bytes.toString("ascii", i, i + 4) !== "moov") continue;
    const boxStart = i - 4;
    const boxSize = bytes.readUInt32BE(boxStart);
    if (boxSize < 16 || boxSize === 1 || boxStart + boxSize > bytes.length) continue;
    const end = boxStart + boxSize;
    let pos = boxStart + 8;
    while (pos + 8 <= end) {
      const size = bytes.readUInt32BE(pos);
      if (size < 8 || pos + size > end) break;
      if (bytes.toString("ascii", pos + 4, pos + 8) === "mvhd") {
        const payload = pos + 8;
        const version = bytes[payload];
        if (version === 0 && size >= 28) {
          const timescale = bytes.readUInt32BE(payload + 12);
          const duration = bytes.readUInt32BE(payload + 16);
          return timescale ? duration / timescale : null;
        }
        if (version === 1 && size >= 40) {
          const timescale = bytes.readUInt32BE(payload + 20);
          const duration = bytes.readBigUInt64BE(payload + 24);
          return timescale ? Number(duration) / timescale : null;
        }
        return null;
      }
      pos += size;
    }
  }
  return null;
}

